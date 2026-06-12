import { Router } from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

// ── Import core translation engine functions from translation.js ──
import { PAGES, translateBatch, enhanceWithDefaultChannel } from './translation.js'

const router = Router()

// ── In-memory abort flags: jobId -> true means abort requested ──
const abortFlags = new Map()

// ── Log auto-cleanup: called on startup + daily ──
function cleanupOldLogs() {
    try {
        // Delete logs for jobs older than 3 days
        const deleted = run(
            `DELETE FROM translation_job_logs WHERE job_id IN (
               SELECT id FROM translation_jobs WHERE created_at < datetime('now', '-3 days')
             )`
        )
        // Delete old completed/aborted job records (keep 3 days for history)
        run(`DELETE FROM translation_jobs WHERE created_at < datetime('now', '-3 days') AND status IN ('done','aborted','error')`)
        if (deleted?.changes > 0) {
            console.log(`[translation-jobs] Cleaned up ${deleted.changes} old log entries`)
        }
    } catch (e) {
        console.warn('[translation-jobs] Cleanup error:', e.message)
    }
}

// Run cleanup on module load (server start)
setTimeout(cleanupOldLogs, 5000)
// Run daily at ~02:00
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000)

// Ensure prompt_id column exists
try { run('ALTER TABLE translation_jobs ADD COLUMN prompt_id INTEGER') } catch (e) {}

// ── Reset any jobs stuck in 'running' state at startup (crashed jobs) ──
export function resetStaleJobs() {
    try {
        const stale = run(
            `UPDATE translation_jobs SET status='aborted', finished_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
             WHERE status='running'`
        )
        if (stale?.changes > 0) {
            console.log(`[translation-jobs] Reset ${stale.changes} stale running jobs to 'aborted'`)
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
    // Mark as running
    updateJobProgress(jobId, { status: 'running' })
    jobLog(jobId, 'info', '🚀 后台翻译任务正在运行中...')

    const job = getOne('SELECT * FROM translation_jobs WHERE id=?', [jobId])
    if (!job) return

    const targetLang = job.target_lang
    const pages = JSON.parse(job.pages || '[]')
    const explicitItems = JSON.parse(job.explicit_items || '[]')
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
        pendingItems = JSON.parse(job.pending_items)
        jobLog(jobId, 'info', `▶️ 任务已恢复，继续翻译剩余 ${pendingItems.length} 个项目...`)
    } else {
        let allItems = [] // { type, id, itemName, targetLang }
        if (explicitItems && explicitItems.length > 0) {
            // Explicit mode (either retry or user selected granular items)
            const TYPE_TO_PAGE_MAP = {
                product: 'products', news: 'news', company: 'company',
                page_text: 'page_texts', category: 'categories', news_category: 'news_categories',
                hero: 'hero', ui_text: 'ui_texts_static', ral_color: 'ral_colors',
                roofing_profile: 'roofing_profiles', roofing_category: 'roofing_categories',
                factory_group: 'factory', factory_media: 'factory', futures: 'futures', futures_watchlist: 'futures',
                chat_welcome_preset: 'chat', chat_auto_reply: 'chat', chat_ui_text: 'chat'
            }
            
            for (const ei of explicitItems) {
                // Determine item name if missing
                if (!ei.itemName || ei.itemName === `${ei.type}_${ei.id}`) {
                    const pageKey = TYPE_TO_PAGE_MAP[ei.type] || ei.type
                    if (PAGES[pageKey]) {
                        const pageItems = PAGES[pageKey]()
                        const match = pageItems.find(x => String(x.id) === String(ei.id))
                        if (match && match.itemName) {
                            ei.itemName = match.itemName
                        }
                    }
                }

                // If it's a retry item it might already have targetLang set, otherwise we generate for all langs
                if (ei.targetLang) {
                    allItems.push(ei)
                } else {
                    for (const lc of langCodes) {
                        allItems.push({ ...ei, itemName: ei.itemName || `${ei.type}_${ei.id}`, targetLang: lc })
                    }
                }
            }
            jobLog(jobId, 'info', `🎯 精确指定模式: ${explicitItems.length} 个项目, 共计 ${allItems.length} 个翻译项`)
            // Deduplicate
            const seen = new Set()
            allItems = allItems.filter(item => {
                const k = `${item.targetLang}_${item.type}_${item.id}`
                if (seen.has(k)) return false
                seen.add(k)
                return true
            })
        } else {
            // Normal mode: collect from pages
            jobLog(jobId, 'info', `📋 正在收集翻译内容 (${pages.join(', ')})...`)
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
                    jobLog(jobId, 'warn', `⚠️ 获取页面 ${page} 内容失败: ${e.message}`)
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
            jobLog(jobId, 'ok', `📋 共 ${allItems.length} 个待翻译项目`)
        }
        pendingItems = allItems
        updateJobProgress(jobId, { total_items: pendingItems.length, done_items: 0, ok_items: 0, error_items: 0 })
    }

    if (pendingItems.length === 0) {
        jobLog(jobId, 'ok', '✔ 无需翻译（内容已全部翻译）')
        updateJobProgress(jobId, { status: 'done', finished_at: new Date().toISOString() })
        return
    }

    const concurrencyLevel = job.concurrency || 1
    const processingItems = new Set()
    
    let okTotal = job.ok_items || 0
    let errTotal = job.error_items || 0
    let doneTotal = job.done_items || 0
    const newFailed = JSON.parse(job.failed_items || '[]')

    const TYPE_TO_PAGE = {
        product: 'products', news: 'news', company: 'company',
        page_text: 'page_texts', category: 'categories', news_category: 'news_categories',
        hero: 'hero', ui_text: 'ui_texts_static', ral_color: 'ral_colors',
        roofing_profile: 'roofing_profiles', roofing_category: 'roofing_categories',
        factory_group: 'factory', factory_media: 'factory', futures: 'futures', futures_watchlist: 'futures',
        chat_welcome_preset: 'chat', chat_auto_reply: 'chat', chat_ui_text: 'chat'
    }

    // ── Process items with concurrency ──
    async function worker() {
        while (pendingItems.length > 0) {
            if (abortFlags.get(jobId)) break
            
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
            const items = pageItems.filter(pi => String(pi.id) === String(item.id))

            if (items.length === 0) {
                processingItems.delete(item)
                doneTotal++
                updateJobProgress(jobId, { done_items: doneTotal, ok_items: okTotal, error_items: errTotal })
                continue
            }

            const manualOverrides = getAll(
                'SELECT original_text, translated_text FROM translations WHERE language_code=? AND is_manual=1',
                [item.targetLang]
            )
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

            jobLog(jobId, 'info', `正在翻译${item.itemName}至${langRow.name}语言`)

            try {
                const { results, errors } = await translateBatch(enhanced, items, item.targetLang, langRow.name, overrideNote, 3, customRules)
                const ok = results.length
                const errs = errors.length

                okTotal += ok
                if (errs > 0 && ok === 0) {
                    errTotal += errs
                    const errMsg = errors[0]?.error || '未知错误'
                    throw new Error(errMsg)
                } else if (errs > 0) {
                    errTotal += errs
                    const errMsg = `部分成功: ${ok}成功, ${errs}错误`
                    throw new Error(errMsg)
                } else if (ok > 0) {
                    jobLog(jobId, 'ok', `${item.itemName}翻译${langRow.name}语言成功`)
                    run('UPDATE languages SET ai_translated=1 WHERE code=?', [item.targetLang])
                } else {
                    throw new Error('AI 无返回结果 (可能为空或格式错误)')
                }
            } catch (e) {
                // Auto-retry once inside the worker
                if (!isRetry && (item._retryCount || 0) < 1) {
                    item._retryCount = (item._retryCount || 0) + 1
                    pendingItems.push(item) // put it back to queue
                    updateJobProgress(jobId, { auto_retried: 1 })
                    jobLog(jobId, 'warn', `${item.itemName} 翻译失败（${(e.message || '').slice(0, 80)}），已加入重试队列`)
                    continue
                }

                errTotal++
                const errMsg = e.message || '未知错误'
                newFailed.push({ ...item, error: errMsg })
                jobLog(jobId, 'error', `${item.itemName}翻译${langRow.name}语言最终失败（${errMsg.slice(0, 150)}）`)
            }

            processingItems.delete(item)
            doneTotal++
            updateJobProgress(jobId, { done_items: doneTotal, ok_items: okTotal, error_items: errTotal, failed_items: JSON.stringify(newFailed) })
        }
    }

    const workers = Array.from({ length: Math.min(concurrencyLevel, pendingItems.length) }, () => worker())
    await Promise.all(workers)

    const abortReason = abortFlags.get(jobId)
    abortFlags.delete(jobId)

    if (abortReason === 'pause') {
        const remaining = [...processingItems, ...pendingItems]
        updateJobProgress(jobId, { status: 'paused', pending_items: JSON.stringify(remaining) })
        jobLog(jobId, 'warn', `⏸ 任务已暂停，剩余 ${remaining.length} 项等待翻译`)
        return
    }

    if (abortReason === 'abort') {
        // Status is immediately set to 'aborted' by the API route already.
        // We just skip overwriting it to 'done'.
        return
    }

    updateJobProgress(jobId, { failed_items: JSON.stringify(newFailed) })
    if (newFailed.length > 0) {
        const firstErr = newFailed[0]?.error || '未知错误'
        jobLog(jobId, 'warn', `${okTotal}个产品或者文章翻译成功，${newFailed.length}个产品翻译失败，请手动重试，失败原因：${firstErr.slice(0, 80)}`)
    } else {
        jobLog(jobId, 'ok', `${okTotal}个项目翻译成功，现在已经全部完整的翻译完成`)
    }

    updateJobProgress(jobId, {
        status: 'done',
        finished_at: new Date().toISOString()
    })
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
        const job = getOne('SELECT * FROM translation_jobs WHERE id=?', [req.params.id])
        if (!job) return res.status(404).json({ error: 'Job not found' })

        // Get last 1000 log lines for this job
        const logs = getAll(
            'SELECT id, level, message, created_at FROM translation_job_logs WHERE job_id=? ORDER BY id ASC LIMIT 1000',
            [job.id]
        )

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
        const { id, logId } = req.params
        const logs = getAll(
            'SELECT id, level, message, created_at FROM translation_job_logs WHERE job_id=? AND id>? ORDER BY id ASC LIMIT 200',
            [id, logId]
        )
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
        const { lang, pages, concurrency, explicitItems, promptId } = req.body
        if (!lang) return res.status(400).json({ error: 'lang is required' })
        if ((!pages || !pages.length) && (!explicitItems || !explicitItems.length)) return res.status(400).json({ error: 'pages or explicitItems is required' })

        // Only allow one running job at a time
        const running = getOne("SELECT id FROM translation_jobs WHERE status IN ('running', 'pausing')")
        if (running) {
            return res.status(409).json({
                error: `当前已有正在运行的翻译任务（ID: ${running.id}），请等待完成或中止后再创建新任务`,
                activeJobId: running.id
            })
        }

        const result = run(
            `INSERT INTO translation_jobs (status, target_lang, pages, explicit_items, concurrency, prompt_id) VALUES ('pending', ?, ?, ?, ?, ?)`,
            [lang, JSON.stringify(pages || []), JSON.stringify(explicitItems || []), concurrency || 1, promptId || null]
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
        if (job.status !== 'paused') return res.status(400).json({ error: '任务不是暂停状态' })

        const running = getOne("SELECT id FROM translation_jobs WHERE status IN ('running', 'pausing')")
        if (running) {
            return res.status(409).json({
                error: `当前已有正在运行的翻译任务（ID: ${running.id}），请等待完成后再恢复`,
                activeJobId: running.id
            })
        }

        updateJobProgress(id, { status: 'pending' })
        abortFlags.delete(id)
        
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
        const running = getOne("SELECT id FROM translation_jobs WHERE status = 'running'")
        if (running) {
            return res.status(409).json({
                error: `当前已有正在运行的翻译任务（ID: ${running.id}），请等待完成后再重试`,
                activeJobId: running.id
            })
        }

        const result = run(
            `INSERT INTO translation_jobs (status, target_lang, pages, explicit_items, is_retry)
             VALUES ('pending', ?, '[]', ?, 1)`,
            [parentJob.target_lang, JSON.stringify(failedItems)]
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
