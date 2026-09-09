import { Router } from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

// ── Import core translation engine functions from translation.js ──
import { PAGES, translateBatch, enhanceWithDefaultChannel } from './translation.js'
import { getAiPeak, resetAiPeak } from '../services/aiRateLimit.js'

const router = Router()

// ── In-memory abort flags: jobId -> true means abort requested ──
const abortFlags = new Map()

export function normalizeTranslationConcurrency(value) {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isFinite(parsed) || parsed <= 0) return 1
    // Cap raised to 10 to match the UI dial (user-set 10 must start 10 workers).
    return Math.min(10, Math.max(1, parsed))
}

// Resolve the effective concurrency for a job: an explicit valid request value
// wins; otherwise fall back to the saved admin setting; otherwise 3. Treats
// null/''/NaN/<=0 as "not provided" — never silently single-threaded.
function resolveJobConcurrency(requested) {
    const parsed = Number.parseInt(requested, 10)
    if (Number.isFinite(parsed) && parsed > 0) return normalizeTranslationConcurrency(parsed)
    const saved = getOne('SELECT concurrency FROM translation_settings WHERE id=1')
    const savedParsed = Number.parseInt(saved?.concurrency, 10)
    if (Number.isFinite(savedParsed) && savedParsed > 0) return normalizeTranslationConcurrency(savedParsed)
    return 3
}

// ── type → DB page-name map (shared by collection, the worker and resume ──)
const TYPE_TO_PAGE = {
    product: 'products', product_review: 'reviews', news: 'news', company: 'company',
    page_text: 'page_texts', category: 'categories', news_category: 'news_categories',
    hero: 'hero', ui_text: 'ui_texts_static', ral_color: 'ral_colors',
    roofing_profile: 'roofing_profiles', roofing_category: 'roofing_categories',
    factory_group: 'factory', factory_media: 'factory', futures: 'futures', futures_watchlist: 'futures',
    chat_welcome_preset: 'chat', chat_auto_reply: 'chat', chat_ui_text: 'chat', home_seo: 'home_seo', home_faq: 'home_faq'
}

// Tracks jobs that were resumed from a PAUSED state (set by POST /:id/resume).
// runJobInBackground uses it to rebuild the queue from ground truth so the
// breakpoint is exact. Crash auto-resumes (resetStaleJobs) never set it.
const resumeFromPauseFlags = new Map()

// ─── Field-level "already translated" filter ─────────────────────────────────
// Used BOTH as the skip-translated engine in the worker AND as the definition
// of "this item is finished" when a paused job is resumed. Keeping the two in
// sync is what makes the resume breakpoint exact: whatever the worker counts
// as "fully translated" is exactly what the resume excludes.
export function filterPageItemsByExisting(pageItems, translatedFieldsSet) {
    return pageItems.map(pi => {
        if (pi.combined) {
            try {
                const subObj = JSON.parse(pi.text)
                const remainingSubObj = {}
                let hasRemaining = false
                for (const [subField, val] of Object.entries(subObj)) {
                    if (!translatedFieldsSet.has(subField)) {
                        remainingSubObj[subField] = val
                        hasRemaining = true
                    }
                }
                if (!hasRemaining) return null
                return { ...pi, text: JSON.stringify(remainingSubObj) }
            } catch (e) {}
        } else {
            const realField = pi.field.startsWith('name_NC_') || pi.field.startsWith('name_RC_') ? 'name' : pi.field
            if (translatedFieldsSet.has(realField)) return null
        }
        return pi
    }).filter(Boolean)
}

// ─── Build the authoritative item queue for a job (same code as save-time) ──
// Order matches the original run: an article's items appear in the same
// position, so a resume never "jumps" past or re-does items.
// `log` (optional (level, message)) is passed only on first runs to surface
// the collection progress; the resume path rebuilds quietly.
function collectTranslationItems(job, langCodes, log = null) {
    const pages = JSON.parse(job.pages || '[]')
    const explicitItems = JSON.parse(job.explicit_items || '[]')
    let allItems = []
    if (explicitItems && explicitItems.length > 0) {
        for (const ei of explicitItems) {
            if (!ei.itemName || ei.itemName === `${ei.type}_${ei.id}`) {
                const pageKey = TYPE_TO_PAGE[ei.type] || ei.type
                if (PAGES[pageKey]) {
                    const pageItems = PAGES[pageKey]()
                    const match = pageItems.find(x => String(x.id) === String(ei.id))
                    if (match && match.itemName) ei.itemName = match.itemName
                }
            }
            if (ei.targetLang) {
                allItems.push(ei)
            } else {
                for (const lc of langCodes) {
                    allItems.push({ ...ei, itemName: ei.itemName || `${ei.type}_${ei.id}`, targetLang: lc })
                }
            }
        }
        if (log) log('info', `🎯 精确指定模式: ${explicitItems.length} 个项目`)
    } else {
        if (log) log('info', `📋 正在收集翻译内容 (${pages.join(', ')})...`)
        for (const page of pages) {
            if (!PAGES[page]) continue
            try {
                const pageItems = PAGES[page]()
                for (const item of pageItems) {
                    for (const lc of langCodes) {
                        allItems.push({ type: item.type, id: item.id, itemName: item.itemName || `${item.type}_${item.id}`, targetLang: lc })
                    }
                }
            } catch (e) {
                if (log) log('warn', `⚠️ 获取页面 ${page} 内容失败: ${e.message}`)
            }
        }
    }
    // Deduplicate by type+id+lang
    const seen = new Set()
    allItems = allItems.filter(item => {
        const k = `${item.targetLang}_${item.type}_${item.id}`
        if (seen.has(k)) return false
        seen.add(k)
        return true
    })
    return allItems
}

// ─── Ground-truth "what is still missing" filter (resume) ───────────────────
// Ignores whatever the persisted queue snapshot claims and derives the REAL
// remaining work from the translations table. Items whose every field already
// has a saved translation are dropped (they are "done"), everything else is
// kept in its original order. This makes pause→resume immune to snapshot
// drift, counting races, and in-flight drain — the breakpoint is exact by
// construction. Deps are injectable so the logic is unit-testable without a DB.
export function filterToUntranslated(items, opts = {}) {
    const getPageItems = opts.getPageItems
        || ((key) => (PAGES[key] ? PAGES[key]() : null))
    const getTranslatedByItem = opts.getTranslatedByItem
        || ((lang, type) => {
            const rows = getAll(
                'SELECT content_id, content_field FROM translations WHERE language_code=? AND content_type=?',
                [lang, type]
            )
            const map = new Map()
            for (const r of rows) {
                const idKey = String(r.content_id)
                if (!map.has(idKey)) map.set(idKey, new Set())
                map.get(idKey).add(r.content_field)
            }
            return map
        })

    const pageCache = new Map()
    const translatedCache = new Map()
    const remaining = []
    for (const item of items) {
        const pageKey = TYPE_TO_PAGE[item.type] || item.type
        let pageItems = pageCache.get(pageKey)
        if (pageItems === undefined) {
            pageItems = getPageItems(pageKey)
            pageCache.set(pageKey, pageItems)
        }
        if (!pageItems) continue // worker skips unknown types too
        const itemPageItems = pageItems.filter(pi => String(pi.id) === String(item.id))
        if (itemPageItems.length === 0) continue // deleted/missing rows are skipped by the worker too

        let translatedByItem = translatedCache.get(`${item.targetLang}|${item.type}`)
        if (!translatedByItem) {
            translatedByItem = getTranslatedByItem(item.targetLang, item.type)
            translatedCache.set(`${item.targetLang}|${item.type}`, translatedByItem)
        }
        const fieldsDone = translatedByItem.get(String(item.id)) || new Set()
        if (filterPageItemsByExisting(itemPageItems, fieldsDone).length > 0) {
            remaining.push(item)
        }
    }
    return remaining
}

// ── Log auto-cleanup: called on startup + daily ──
function cleanupOldLogs() {
    try {
        // One shared cutoff+status filter: purge the logs of old finished jobs
        // and the job records themselves in a single cleanup pass (identical
        // criteria, so no job record is ever deleted while orphaning logs).
        const oldFinishedFilter = `created_at < datetime('now', '-3 days') AND status IN ('done','aborted','error')`
        const deleted = run(
            `DELETE FROM translation_job_logs WHERE job_id IN (
               SELECT id FROM translation_jobs WHERE ${oldFinishedFilter}
             )`
        )
        run(`DELETE FROM translation_jobs WHERE ${oldFinishedFilter}`)
        if (deleted?.changes > 0) {
            console.log(`[translation-jobs] Cleaned up ${deleted.changes} old log entries`)
        }
    } catch (e) {
        console.warn('[translation-jobs] Cleanup error:', e.message)
    }
}

// Run cleanup on module load (server start) — unref'ed so a test importing
// this module (or a graceful shutdown) is never held open by these timers.
setTimeout(cleanupOldLogs, 5000).unref()
// Run daily at ~02:00
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000).unref()

// ── Reset/restore jobs interrupted by a crash or restart ──
// Intent: a job that was actively running (or created but not yet started) when
// the server went down must AUTO-RESUME after restart. A job the user manually
// paused or is pausing stays paused; a manually aborted job stays aborted.
export function resetStaleJobs() {
    try {
        // Interrupted fresh/pending jobs: keep as-is, resume them below.
        const interruptedIds = getAll("SELECT id FROM translation_jobs WHERE status IN ('pending', 'running')").map(r => r.id)
        // A pause that was requested but not yet flushed must land as paused.
        run(`UPDATE translation_jobs SET status='paused', finished_at=NULL WHERE status='pausing'`)
        // An abort that was in-flight when we died is treated as aborted.
        run(`UPDATE translation_jobs SET status='aborted', finished_at=NULL WHERE status='aborting'`)

        if (interruptedIds.length > 0) {
            console.log(`[translation-jobs] Auto-resuming ${interruptedIds.length} interrupted translation job(s)`)
            for (const id of interruptedIds) {
                setImmediate(() => runJobInBackground(id).catch(e => {
                    console.error(`[translation-jobs] Auto-resume of job ${id} failed:`, e)
                    try {
                        updateJobProgress(id, { status: 'error', finished_at: new Date().toISOString() })
                        jobLog(id, 'error', `💥 恢复任务异常终止: ${e.message}`)
                    } catch (err2) { /* non-fatal */ }
                }))
            }
        }
    } catch (e) { /* table may not exist on first run */ }
}

// ─── Helper: write a log line for a job ───────────────────────────────────────
function jobLog(jobId, level, message) {
    try {
        run(
            `INSERT INTO translation_job_logs (job_id, level, message) VALUES (?, ?, ?)`,
            [jobId, level, String(message).slice(0, 2000)]
        )
    } catch (e) { /* non-fatal */ }
}

// ─── Helper: update job progress fields ──────────────────────────────────────
function updateJobProgress(jobId, fields) {
    const sets = Object.keys(fields).map(k => `${k}=?`).join(', ')
    const vals = [...Object.values(fields), jobId]
    try {
        run(`UPDATE translation_jobs SET ${sets}, updated_at=CURRENT_TIMESTAMP WHERE id=?`, vals)
    } catch (e) { /* non-fatal */ }
}

// ─── Core background executor ─────────────────────────────────────────────────
async function runJobInBackground(jobId) {
    // An abort may have been recorded between the job being created/resumed and
    // this start (the API route marks the row 'aborted' immediately). Check the
    // flag BEFORE the 'running' write below — otherwise the first write would
    // silently overwrite the user's abort and a restart would re-run the job.
    if (abortFlags.get(jobId) === 'abort') {
        abortFlags.delete(jobId)
        updateJobProgress(jobId, { status: 'aborted', finished_at: new Date().toISOString(), pending_items: null })
        jobLog(jobId, 'warn', '🛑 任务已在中止后停止，未再次启动')
        return
    }
    // Capture the PRIOR status BEFORE flipping to 'running': the pause/resume
    // contract needs to know whether this execution is (a) an explicit resume
    // of a paused job → rebuild the queue from ground truth for an EXACT
    // breakpoint; (b) a crash auto-resume of a running job → also filter the
    // persisted queue by ground truth (drops items that actually completed);
    // or (c) a first run / never-started job → use the full saved queue.
    const preStatus = getOne('SELECT status FROM translation_jobs WHERE id=?', [jobId])?.status
    const resumeFromPause = resumeFromPauseFlags.get(jobId)
    if (resumeFromPause) resumeFromPauseFlags.delete(jobId)

    // Mark as running
    updateJobProgress(jobId, { status: 'running' })
    jobLog(jobId, 'info', '🚀 后台翻译任务正在运行中...')

    const job = getOne('SELECT * FROM translation_jobs WHERE id=?', [jobId])
    if (!job) return

    const targetLang = job.target_lang
    const isRetry = !!job.is_retry

    // Gather target languages
    let langCodes = []
    if (targetLang === 'all') {
        const langs = getAll("SELECT code FROM languages WHERE code != 'en' AND status = 1")
        langCodes = langs.map(l => l.code)
    } else {
        langCodes = [targetLang]
    }

    const s = getOne('SELECT * FROM translation_settings WHERE id=1')
    if (!s?.api_key && !getOne('SELECT api_key FROM ai_channels WHERE is_default = 1')?.api_key) {
        jobLog(jobId, 'error', '❌ 未配置 AI API 密钥，任务终止')
        updateJobProgress(jobId, { status: 'error', finished_at: new Date().toISOString() })
        return
    }
    const enhanced = enhanceWithDefaultChannel(s)

    // ── Collect items ──
    let pendingItems = []

    if (job.pending_items) {
        if (resumeFromPause || preStatus === 'running') {
            // Rebuild the REAL remaining queue from ground truth instead of
            // trusting the persisted snapshot array. The translations table is
            // the single source of truth for "what is actually still missing",
            // so the resume continues EXACTLY where the work stops: no
            // double-translating already-finished items and no skipping ahead,
            // regardless of snapshot drift or whatever drained in-flight while
            // the pause was taking effect.
            const rebuilt = collectTranslationItems(job, langCodes)
            pendingItems = filterToUntranslated(rebuilt)
            const doneTrue = rebuilt.length - pendingItems.length
            updateJobProgress(jobId, {
                total_items: rebuilt.length,
                done_items: doneTrue,
                ok_items: job.ok_items || 0,
                error_items: job.error_items || 0
            })
            jobLog(jobId, 'info', `▶️ 任务已恢复: 已完成 ${doneTrue}/${rebuilt.length}, 继续翻译剩余 ${pendingItems.length} 项`)
        } else {
            pendingItems = JSON.parse(job.pending_items)
            jobLog(jobId, 'info', `▶️ 任务已恢复，继续翻译剩余 ${pendingItems.length} 个项目...`)
        }
    } else {
        pendingItems = collectTranslationItems(job, langCodes, (level, msg) => jobLog(jobId, level, msg))
        jobLog(jobId, 'ok', `📋 共 ${pendingItems.length} 个待翻译项目`)
        updateJobProgress(jobId, { total_items: pendingItems.length, done_items: 0, ok_items: 0, error_items: 0, pending_items: JSON.stringify(pendingItems) })
    }

    if (pendingItems.length === 0) {
        jobLog(jobId, 'ok', '✔ 无需翻译（内容已全部翻译）')
        updateJobProgress(jobId, { status: 'done', finished_at: new Date().toISOString() })
        return
    }

    const concurrencyLevel = normalizeTranslationConcurrency(job.concurrency)
    // The process-wide AI-request cap (the semaphore inside callAI) must match
    // THIS job's concurrency — override whatever stale value the settings row
    // holds so the global limit equals what the user chose for this job.
    enhanced.concurrency = concurrencyLevel
    // Block-level concurrency inside one long-HTML item: fixed at 1 so the
    // TOTAL concurrent AI HTTP requests = outerConcurrency (not outer × blocks).
    // With concurrency=10 and innerAiConcurrency=4, the old code sent up to
    // 40 simultaneous requests — far exceeding the user's setting and causing
    // the "keeps sending without waiting" behavior.
    const innerAiConcurrency = 1
    const processingItems = new Set()
    // Set when any worker throws unexpectedly. Every worker checks it in its
    // loop (like the abort flag) so one crash stops the whole job cleanly
    // instead of leaving the others translating a job that will never finish.
    let workerFailure = null

    // Preload manual-translation overrides once per job: the per-item query
    // only varied by target_lang, so group them by language up front — one
    // query for the whole job instead of one per item. Cosmetic prompt hint
    // only, so a failure here must never kill the job.
    const manualOverridesByLang = new Map()
    try {
        for (const o of getAll('SELECT language_code, original_text, translated_text FROM translations WHERE is_manual=1')) {
            let list = manualOverridesByLang.get(o.language_code)
            if (!list) { list = []; manualOverridesByLang.set(o.language_code, list) }
            list.push(o)
        }
    } catch (e) { /* non-fatal: fall back to empty override lists */ }
    
    let okTotal = job.ok_items || 0
    let errTotal = job.error_items || 0
    let doneTotal = job.done_items || 0
    const newFailed = JSON.parse(job.failed_items || '[]')

    // Throttle costly state persistence. Writing the FULL remaining-items array
    // (JSON.stringify of every pending item) on EACH processed item is O(n) work
    // per item — on jobs with thousands of items this serializes & rewrites the
    // whole queue hundreds of thousands of times, silently slowing the job down.
    // The snapshot only needs to be fresh enough for pause/resume recovery, so
    // persist it every SNAPSHOT_EVERY items (plus on pause/abort/exit).
    let snapCount = 0
    const SNAPSHOT_EVERY = 25
    const totalGoal = job.total_items || 0
    function persistPendingState() {
        updateJobProgress(jobId, { pending_items: JSON.stringify([...processingItems, ...pendingItems]) })
    }
    function progressHeartbeat() {
        if (snapCount % SNAPSHOT_EVERY !== 0) return
        jobLog(jobId, 'info', `⏳ 进度 ${doneTotal}/${totalGoal || (doneTotal + pendingItems.length)} | 成功 ${okTotal} | 失败 ${errTotal}`)
    }

    // ── Process items with concurrency ──
    async function worker() {
        while (pendingItems.length > 0) {
            if (abortFlags.get(jobId) || workerFailure) break
            
            const item = pendingItems.shift()
            processingItems.add(item)

            const langRow = getOne('SELECT name FROM languages WHERE code=?', [item.targetLang])
            if (!langRow) {
                processingItems.delete(item)
                doneTotal++
                continue
            }

            const pageKey = TYPE_TO_PAGE[item.type] || item.type
            if (!PAGES[pageKey]) {
                jobLog(jobId, 'warn', `⚠️ 未知内容类型: ${item.type}，跳过`)
                processingItems.delete(item)
                doneTotal++
                updateJobProgress(jobId, { done_items: doneTotal, ok_items: okTotal, error_items: errTotal })
                continue
            }

            const pageItems = PAGES[pageKey]()
            const itemsRaw = pageItems.filter(pi => String(pi.id) === String(item.id))

            if (itemsRaw.length === 0) {
                processingItems.delete(item)
                doneTotal++
                updateJobProgress(jobId, { done_items: doneTotal, ok_items: okTotal, error_items: errTotal })
                continue
            }

            // Determine if we should skip already translated fields.
            // As per user request: "Fresh translation commands should always re-translate everything.
            // ONLY skip already translated strings if this is an automatic or manual retry."
            const isRetry = job.is_retry || item._retryCount > 0
            // Skip already-translated fields when retrying OR when the user asked
            // to only fill what's missing (speed). Fresh full runs re-translate all.
            const filteredByExisting = isRetry || !!job.skip_translated
            
            let items = itemsRaw
            
            if (filteredByExisting) {
                const alreadyTranslated = getAll(
                    'SELECT content_field FROM translations WHERE language_code=? AND content_type=? AND content_id=?',
                    [item.targetLang, item.type, item.id]
                )
                const translatedFieldsSet = new Set(alreadyTranslated.map(r => r.content_field))

                items = filterPageItemsByExisting(itemsRaw, translatedFieldsSet)
            }

            if (items.length === 0) {
                // Already fully translated!
                okTotal++
                processingItems.delete(item)
                doneTotal++
                updateJobProgress(jobId, { done_items: doneTotal, ok_items: okTotal, error_items: errTotal })
                run('UPDATE languages SET ai_translated=1 WHERE code=?', [item.targetLang])
                continue
            }

            const manualOverrides = manualOverridesByLang.get(item.targetLang) || []
            const overrideNote = manualOverrides.length > 0
                ? '\n\nUse these approved translations as reference:\n' +
                manualOverrides.slice(0, 8).map(o => `"${o.original_text}" → "${o.translated_text}"`).join('\n')
                : ''

            // Fetch custom rules
            let customRules = null;
            if (job.prompt_id) {
                const promptRow = getOne('SELECT content FROM translation_prompts WHERE id=?', [job.prompt_id])
                if (promptRow && promptRow.content) {
                    customRules = `\n\n[Translation Rules]:\n${promptRow.content}`
                }
            }

            jobLog(jobId, 'info', `🔄 正在翻译「${item.itemName}」${langRow.name}...`)

            try {
                const { results, errors } = await translateBatch(enhanced, items, item.targetLang, langRow.name, overrideNote, innerAiConcurrency, customRules)
                const ok = results.length
                const errs = errors.length

                if (errs > 0 && ok === 0) {
                    const errMsg = errors[0]?.error || '未知错误'
                    throw new Error(errMsg)
                } else if (errs > 0) {
                    const errMsg = `部分成功: ${ok}成功, ${errs}错误`
                    throw new Error(errMsg)
                } else if (ok > 0) {
                    okTotal++
                    run('UPDATE languages SET ai_translated=1 WHERE code=?', [item.targetLang])
                    jobLog(jobId, 'ok', `✅ 「${item.itemName}」${langRow.name} 翻译成功`)
                } else {
                    throw new Error('AI 无返回结果 (可能为空或格式错误)')
                }
            } catch (e) {
                // Auto-retry once inside the worker. The retry IS logged so the
                // user can SEE that this request returned (and failed) before a
                // new one is sent — silence here made jobs look like they fired
                // requests "without ever getting a response".
                if (!isRetry && (item._retryCount || 0) < 1) {
                    item._retryCount = (item._retryCount || 0) + 1
                    processingItems.delete(item) // it goes back to the queue, it is not in-flight
                    jobLog(jobId, 'warn', `⚠️ 「${item.itemName}」${langRow.name} 首次失败，立即自动重试: ${(e.message || '').slice(0, 150)}`)
                    // Re-queue at the FRONT so THIS worker re-picks it immediately.
                    // Pushing to the queue end on a long job meant retried items
                    // only got their second attempt after the whole queue cycled —
                    // a long stretch with zero visible success/failure logs.
                    pendingItems.unshift(item)
                    updateJobProgress(jobId, { auto_retried: 1 })
                    continue
                }

                errTotal++
                const errMsg = e.message || '未知错误'
                newFailed.push({ ...item, error: errMsg })
                jobLog(jobId, 'error', `${item.itemName}翻译${langRow.name}语言最终失败（${errMsg.slice(0, 150)}）`)
            }

            processingItems.delete(item)
            doneTotal++
            snapCount++
            updateJobProgress(jobId, { done_items: doneTotal, ok_items: okTotal, error_items: errTotal, failed_items: JSON.stringify(newFailed) })
            if (snapCount % SNAPSHOT_EVERY === 0) persistPendingState()
            progressHeartbeat()
        }
    }

    const workers = Array.from({ length: Math.min(concurrencyLevel, pendingItems.length) }, () =>
        // A worker that throws must not take the job down as an unhandled
        // rejection: record the failure so every worker's loop stops, and the
        // terminal-state block below writes a clean status='error' exit.
        worker().catch(e => { workerFailure = workerFailure || e })
    )
    await Promise.allSettled(workers)

    try {
        const abortReason = abortFlags.get(jobId)
        abortFlags.delete(jobId)

        if (abortReason === 'pause') {
            const remaining = [...processingItems, ...pendingItems]
            updateJobProgress(jobId, { status: 'paused', pending_items: JSON.stringify(remaining) })
            jobLog(jobId, 'warn', `⏸ 任务已暂停: 已完成 ${doneTotal}/${totalGoal || doneTotal + remaining.length}, 剩余 ${remaining.length} 项待翻译`)
            return
        }

        if (abortReason === 'abort') {
            // ALWAYS persist the terminal state here (idempotent): never rely on
            // the abort API route having written it — its write can be lost in a
            // race, and a leftover 'running' row would be auto-resumed on restart,
            // silently reversing the user's abort into a full re-run.
            updateJobProgress(jobId, { status: 'aborted', finished_at: new Date().toISOString(), pending_items: null })
            jobLog(jobId, 'warn', '🛑 任务已中止')
            return
        }

        if (workerFailure) {
            // A worker crashed unexpectedly: fold the in-flight + queued items
            // back into pending_items so nothing is lost, then fail the job.
            const remaining = [...processingItems, ...pendingItems]
            jobLog(jobId, 'error', `💥 任务内部异常终止: ${workerFailure.message || String(workerFailure)}`)
            updateJobProgress(jobId, {
                status: 'error',
                finished_at: new Date().toISOString(),
                failed_items: JSON.stringify(newFailed),
                pending_items: JSON.stringify(remaining)
            })
            return
        }

        updateJobProgress(jobId, { failed_items: JSON.stringify(newFailed) })
        // Diagnostic: report how many AI requests were ACTUALLY in flight at
        // the busiest moment. The global semaphore caps this at concurrency,
        // so this value is the proof the limit was honored.
        jobLog(jobId, 'info', `📊 任务期间 AI 峰值并发请求: ${getAiPeak() || 0} (并发上限 ${concurrencyLevel})`)
        resetAiPeak()
        if (newFailed.length > 0) {
            const firstErr = newFailed[0]?.error || '未知错误'
            jobLog(jobId, 'warn', `${okTotal}个产品或者文章翻译成功，${newFailed.length}个产品翻译失败，请手动重试，失败原因：${firstErr.slice(0, 80)}`)
        } else {
            jobLog(jobId, 'ok', `${okTotal}个项目翻译成功，现在已经全部完整的翻译完成`)
        }

        updateJobProgress(jobId, {
            status: newFailed.length > 0 ? 'partial' : 'done',
            pending_items: null,
            finished_at: new Date().toISOString()
        })
    } finally {
        // Last-resort guard covering ALL exits (pause/abort/error/normal): if
        // anything above ever failed midway, never leave the row in a live or
        // transitional state with no worker left to flush it.
        const row = getOne('SELECT status FROM translation_jobs WHERE id=?', [jobId])
        if (row && ['running', 'pausing', 'aborting'].includes(row.status)) {
            updateJobProgress(jobId, { status: 'error', finished_at: new Date().toISOString() })
            jobLog(jobId, 'error', '💥 任务异常退出，已强制结束')
        }
    }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /translation-jobs — list recent jobs (max 20)
router.get('/', authMiddleware, (req, res) => {
    try {
        const jobs = getAll(
            `SELECT id, status, target_lang, pages, total_items, done_items, ok_items, error_items,
                    failed_items, is_retry, auto_retried, created_at, updated_at, finished_at
             FROM translation_jobs ORDER BY id DESC LIMIT 20`
        )
        res.json(jobs.map(j => ({
            ...j,
            failed_items: JSON.parse(j.failed_items || '[]'),
            pages: JSON.parse(j.pages || '[]')
        })))
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// GET /translation-jobs/active — get currently running job (if any)
router.get('/active', authMiddleware, (req, res) => {
    try {
        const job = getOne(
            `SELECT id, status, target_lang, pages, total_items, done_items, ok_items, error_items,
                    failed_items, is_retry, auto_retried, created_at, updated_at
             FROM translation_jobs WHERE status IN ('running', 'pausing', 'aborting') ORDER BY id DESC LIMIT 1`
        )
        res.json(job ? {
            ...job,
            failed_items: JSON.parse(job.failed_items || '[]'),
            pages: JSON.parse(job.pages || '[]')
        } : null)
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// GET /translation-jobs/:id — get job detail + logs
router.get('/:id', authMiddleware, (req, res) => {
    try {
        const jobId = parseInt(req.params.id)
        const job = getOne('SELECT * FROM translation_jobs WHERE id=?', [jobId])
        if (!job) return res.status(404).json({ error: 'Job not found' })

        // Limit to 1500 logs. If it's too small, users won't see early warnings/timeouts in the history view
        const logs = getAll(
            'SELECT id, level, message, created_at FROM translation_job_logs WHERE job_id=? ORDER BY id DESC LIMIT 1500',
            [job.id]
        )
        logs.reverse()

        res.json({
            ...job,
            failed_items: JSON.parse(job.failed_items || '[]'),
            explicit_items: JSON.parse(job.explicit_items || '[]'),
            pages: JSON.parse(job.pages || '[]'),
            logs
        })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// GET /translation-jobs/:id/logs-since/:logId — poll for new logs since last seen log id
router.get('/:id/logs-since/:logId', authMiddleware, (req, res) => {
    try {
        const id = parseInt(req.params.id)
        const logId = parseInt(req.params.logId)
        // First open (logId<=0) should show the MOST RECENT 200 lines. Fetching
        // the earliest 200 and then polling forward made the live view lag far
        // behind on large jobs (thousands of logs).
        const logs = Number.isFinite(logId) && logId > 0
            ? getAll(
                'SELECT id, level, message, created_at FROM translation_job_logs WHERE job_id=? AND id>? ORDER BY id ASC LIMIT 200',
                [id, logId]
              )
            : getAll(
                'SELECT id, level, message, created_at FROM translation_job_logs WHERE job_id=? ORDER BY id DESC LIMIT 200',
                [id]
              ).reverse()
        const job = getOne('SELECT status, done_items, ok_items, error_items, total_items, failed_items, auto_retried, finished_at FROM translation_jobs WHERE id=?', [id])
        res.json({
            logs,
            job: job ? { ...job, failed_items: JSON.parse(job.failed_items || '[]') } : null
        })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// POST /translation-jobs — create & start a new background job
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { lang, pages, concurrency, explicitItems, promptId, skipTranslated } = req.body
        if (!lang) return res.status(400).json({ error: 'lang is required' })
        if ((!pages || !pages.length) && (!explicitItems || !explicitItems.length)) return res.status(400).json({ error: 'pages or explicitItems is required' })

        // Only allow one running job at a time
        const running = getOne("SELECT id FROM translation_jobs WHERE status IN ('pending', 'running', 'pausing', 'aborting')")
        if (running) {
            return res.status(409).json({
                error: `当前已有正在运行的翻译任务（ID: ${running.id}），请等待完成或中止后再创建新任务`,
                activeJobId: running.id
            })
        }

        // Resolve effective concurrency: an explicit valid value wins; null/''/NaN/<=0
        // falls back to the saved admin setting — never silently single-threaded.
        const level = resolveJobConcurrency(concurrency)

        const result = run(
            `INSERT INTO translation_jobs (status, target_lang, pages, explicit_items, concurrency, prompt_id, skip_translated) VALUES ('pending', ?, ?, ?, ?, ?, ?)`,
            [lang, JSON.stringify(pages || []), JSON.stringify(explicitItems || []), level, promptId || null, skipTranslated ? 1 : 0]
        )
        const jobId = result.lastInsertRowid

        // Fire-and-forget
        setImmediate(() => runJobInBackground(jobId).catch(e => {
            console.error(`[translation-jobs] Job ${jobId} fatal error:`, e)
            try {
                updateJobProgress(jobId, { status: 'error', finished_at: new Date().toISOString() })
                jobLog(jobId, 'error', `💥 任务异常终止: ${e.message}`)
            } catch (err2) { /* non-fatal */ }
        }))

        res.json({ jobId, message: '后台翻译任务已启动' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// POST /translation-jobs/:id/abort — abort a running job
router.post('/:id/abort', authMiddleware, (req, res) => {
    try {
        const id = parseInt(req.params.id)
        const job = getOne('SELECT status FROM translation_jobs WHERE id=?', [id])
        if (!job) return res.status(404).json({ error: 'Job not found' })
        if (!['pending', 'running', 'pausing', 'aborting'].includes(job.status)) {
            return res.status(409).json({ error: `任务当前状态为 ${job.status}，无法中止`, status: job.status })
        }
        abortFlags.set(id, 'abort')
        updateJobProgress(id, { status: 'aborted', finished_at: new Date().toISOString() })
        jobLog(id, 'warn', '🛑 用户已中止任务，当前正在进行的请求完成前不再发送新请求，已放弃当前任务...')
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// POST /translation-jobs/:id/pause — pause a running job
router.post('/:id/pause', authMiddleware, (req, res) => {
    try {
        const id = parseInt(req.params.id)
        const job = getOne('SELECT status FROM translation_jobs WHERE id=?', [id])
        if (!job) return res.status(404).json({ error: 'Job not found' })
        if (job.status === 'pausing') return res.json({ success: true, message: '任务正在暂停中' })
        if (job.status !== 'running') {
            return res.status(409).json({ error: `任务当前状态为 ${job.status}，无法暂停`, status: job.status })
        }
        abortFlags.set(id, 'pause')
        updateJobProgress(id, { status: 'pausing' })
        jobLog(id, 'warn', '⏸ 正在暂停，等待当前项目完成翻译即可安全暂停...')
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// POST /translation-jobs/:id/resume — resume a paused job
router.post('/:id/resume', authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        const job = getOne('SELECT * FROM translation_jobs WHERE id=?', [id])
        if (!job) return res.status(404).json({ error: 'Job not found' })
        if (job.status === 'pausing') {
            return res.status(409).json({ error: '任务正在暂停中，请稍候再恢复', status: job.status })
        }
        if (job.status !== 'paused') return res.status(400).json({ error: '任务不是暂停状态' })

        const running = getOne("SELECT id FROM translation_jobs WHERE status IN ('pending', 'running', 'pausing', 'aborting')")
        if (running) {
            return res.status(409).json({
                error: `当前已有正在运行的翻译任务（ID: ${running.id}），请等待完成后再恢复`,
                activeJobId: running.id
            })
        }

        updateJobProgress(id, { status: 'pending' })
        abortFlags.delete(id)
        // Mark this as an explicit pause→resume so runJobInBackground rebuilds
        // the queue from ground truth (exact breakpoint, no drift).
        resumeFromPauseFlags.set(id, true)

        setImmediate(() => runJobInBackground(id).catch(e => {
            console.error(`[translation-jobs] Resume job ${id} fatal error:`, e)
            try {
                updateJobProgress(id, { status: 'error', finished_at: new Date().toISOString() })
                jobLog(id, 'error', `💥 恢复任务异常终止: ${e.message}`)
            } catch (err2) { /* non-fatal */ }
        }))

        res.json({ success: true, message: '任务已恢复' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// POST /translation-jobs/:id/retry-failed — create a new retry job for failed items
router.post('/:id/retry-failed', authMiddleware, async (req, res) => {
    try {
        const parentJob = getOne('SELECT * FROM translation_jobs WHERE id=?', [req.params.id])
        if (!parentJob) return res.status(404).json({ error: 'Job not found' })

        const failedItems = JSON.parse(parentJob.failed_items || '[]')
        if (!failedItems.length) return res.status(400).json({ error: '没有失败项目需要重试' })

        // Only allow one running job at a time
        const running = getOne("SELECT id FROM translation_jobs WHERE status IN ('pending', 'running', 'pausing', 'aborting')")
        if (running) {
            return res.status(409).json({
                error: `当前已有正在运行的翻译任务（ID: ${running.id}），请等待完成后再重试`,
                activeJobId: running.id
            })
        }

        const result = run(
            `INSERT INTO translation_jobs (status, target_lang, pages, explicit_items, is_retry, concurrency, prompt_id)
             VALUES ('pending', ?, '[]', ?, 1, ?, ?)`,
            [parentJob.target_lang, JSON.stringify(failedItems), resolveJobConcurrency(parentJob.concurrency), parentJob.prompt_id || null]
        )
        const jobId = result.lastInsertRowid

        // Fire-and-forget
        setImmediate(() => runJobInBackground(jobId).catch(e => {
            console.error(`[translation-jobs] Retry job ${jobId} fatal error:`, e)
            try {
                updateJobProgress(jobId, { status: 'error', finished_at: new Date().toISOString() })
                jobLog(jobId, 'error', `💥 重试任务异常终止: ${e.message}`)
            } catch (err2) { /* non-fatal */ }
        }))

        res.json({ jobId, message: `已创建重试任务（${failedItems.length} 个失败项目）` })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// DELETE /translation-jobs/logs — manually clear all logs and job records
router.delete('/logs', authMiddleware, (req, res) => {
    try {
        const resultLogs = run('DELETE FROM translation_job_logs')
        const resultJobs = run(`DELETE FROM translation_jobs WHERE status NOT IN ('running', 'pausing')`)
        res.json({ success: true, deletedLogs: resultLogs.changes, deletedJobs: resultJobs.changes })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

export default router
