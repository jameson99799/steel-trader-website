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
        // Delete old completed/aborted job records (keep 7 days for history)
        run(`DELETE FROM translation_jobs WHERE created_at < datetime('now', '-7 days') AND status IN ('done','aborted','error')`)
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
    updateJobProgress(jobId, { status: 'running', done_items: 0, ok_items: 0, error_items: 0 })
    jobLog(jobId, 'info', '🚀 后台翻译任务已启动，即使关闭浏览器也会继续运行...')

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
    let allItems = [] // { type, id, itemName, targetLang }

    if (isRetry && explicitItems.length > 0) {
        // Retry mode: use explicit items list from parent job
        for (const ei of explicitItems) {
            allItems.push(ei)
        }
        jobLog(jobId, 'info', `🔄 重试模式: ${allItems.length} 个指定失败项目`)
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

    if (allItems.length === 0) {
        jobLog(jobId, 'ok', '✔ 无需翻译（内容已全部翻译）')
        updateJobProgress(jobId, { status: 'done', finished_at: new Date().toISOString() })
        return
    }

    updateJobProgress(jobId, { total_items: allItems.length })

    const newFailed = []
    let okTotal = 0
    let errTotal = 0

    const TYPE_TO_PAGE = {
        product: 'products', news: 'news', company: 'company',
        page_text: 'page_texts', category: 'categories', news_category: 'news_categories',
        hero: 'hero', ui_text: 'ui_texts_static', ral_color: 'ral_colors'
    }

    // ── Process items one by one (sequential to avoid hammering AI API) ──
    for (let i = 0; i < allItems.length; i++) {
        if (abortFlags.get(jobId)) {
            jobLog(jobId, 'warn', `🛑 用户已中止任务，已处理 ${i}/${allItems.length}`)
            break
        }

        const item = allItems[i]
        const langRow = getOne('SELECT name FROM languages WHERE code=?', [item.targetLang])
        if (!langRow) continue

        const pageKey = TYPE_TO_PAGE[item.type] || item.type
        if (!PAGES[pageKey]) {
            jobLog(jobId, 'warn', `⚠️ 未知内容类型: ${item.type}，跳过`)
            updateJobProgress(jobId, { done_items: i + 1, ok_items: okTotal, error_items: errTotal })
            continue
        }

        const pageItems = PAGES[pageKey]()
        const items = pageItems.filter(pi => String(pi.id) === String(item.id))

        if (items.length === 0) {
            updateJobProgress(jobId, { done_items: i + 1, ok_items: okTotal, error_items: errTotal })
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

        try {
            const { results, errors } = await translateBatch(enhanced, items, item.targetLang, langRow.name, overrideNote)
            const ok = results.length
            const errs = errors.length

            okTotal += ok
            if (errs > 0 && ok === 0) {
                errTotal += errs
                newFailed.push(item)
                const errMsg = errors[0]?.error || 'unknown error'
                jobLog(jobId, 'error', `   ❌ [${item.targetLang}]「${item.itemName}」失败: ${errMsg.slice(0, 150)}`)
            } else if (errs > 0) {
                errTotal += errs
                newFailed.push(item)
                jobLog(jobId, 'warn', `   ⚠️ [${item.targetLang}]「${item.itemName}」部分成功: ${ok} 成功, ${errs} 错误`)
            } else if (ok > 0) {
                jobLog(jobId, 'ok', `   ✅ [${item.targetLang}]「${item.itemName}」翻译成功: ${ok} 个字段`)
                run('UPDATE languages SET ai_translated=1 WHERE code=?', [item.targetLang])
            } else {
                jobLog(jobId, 'ok', `   ✔ [${item.targetLang}]「${item.itemName}」无需翻译`)
            }
        } catch (e) {
            errTotal++
            newFailed.push(item)
            jobLog(jobId, 'error', `   ❌ [${item.targetLang}]「${item.itemName}」异常: ${e.message.slice(0, 150)}`)
        }

        updateJobProgress(jobId, { done_items: i + 1, ok_items: okTotal, error_items: errTotal })
    }

    const wasAborted = abortFlags.get(jobId)
    abortFlags.delete(jobId)

    // ── Auto-retry failed items once (only for non-retry jobs) ──
    if (!isRetry && newFailed.length > 0 && !wasAborted) {
        jobLog(jobId, 'info', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
        jobLog(jobId, 'info', `🔄 自动重试 ${newFailed.length} 个失败项目（最后一次自动重试）...`)
        // Mark this job as having done auto-retry
        updateJobProgress(jobId, { auto_retried: 1 })

        const stillFailed = []
        for (const item of newFailed) {
            if (abortFlags.get(jobId)) break
            const langRow = getOne('SELECT name FROM languages WHERE code=?', [item.targetLang])
            if (!langRow) continue
            const pageKey = TYPE_TO_PAGE[item.type] || item.type
            if (!PAGES[pageKey]) continue
            const pageItems = PAGES[pageKey]()
            const items = pageItems.filter(pi => String(pi.id) === String(item.id))
            if (!items.length) continue

            try {
                const { results, errors } = await translateBatch(enhanced, items, item.targetLang, langRow.name, '')
                if (results.length > 0) {
                    jobLog(jobId, 'ok', `   ✅ 重试成功 [${item.targetLang}]「${item.itemName}」`)
                    okTotal++
                    errTotal = Math.max(0, errTotal - errors.length)
                    run('UPDATE languages SET ai_translated=1 WHERE code=?', [item.targetLang])
                } else {
                    jobLog(jobId, 'error', `   ❌ 重试仍失败 [${item.targetLang}]「${item.itemName}」(需手动重试)`)
                    stillFailed.push(item)
                }
            } catch (e) {
                jobLog(jobId, 'error', `   ❌ 重试异常 [${item.targetLang}]「${item.itemName}」: ${e.message.slice(0, 100)}`)
                stillFailed.push(item)
            }
        }

        // Update final failed_items
        updateJobProgress(jobId, {
            failed_items: JSON.stringify(stillFailed),
            ok_items: okTotal,
            error_items: stillFailed.length
        })

        if (stillFailed.length > 0) {
            jobLog(jobId, 'warn', `⚠️ ${stillFailed.length} 个项目自动重试后仍失败，请手动点击重试`)
        } else {
            jobLog(jobId, 'ok', '✅ 所有失败项目重试成功！')
        }
    } else {
        updateJobProgress(jobId, { failed_items: JSON.stringify(newFailed) })
    }

    jobLog(jobId, 'info', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    const failedCount = JSON.parse(getOne('SELECT failed_items FROM translation_jobs WHERE id=?', [jobId])?.failed_items || '[]').length
    jobLog(jobId, failedCount > 0 ? 'warn' : 'ok',
        `🏁 翻译完成: 成功 ${okTotal} 项, 错误 ${errTotal} 项` +
        (failedCount > 0 ? ` | ${failedCount} 个项目需要手动重试` : ' | 全部成功！')
    )

    updateJobProgress(jobId, {
        status: wasAborted ? 'aborted' : 'done',
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
             FROM translation_jobs WHERE status = 'running' ORDER BY id DESC LIMIT 1`
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
        const { lang, pages, concurrency } = req.body
        if (!lang) return res.status(400).json({ error: 'lang is required' })
        if (!pages || !pages.length) return res.status(400).json({ error: 'pages is required' })

        // Only allow one running job at a time
        const running = getOne("SELECT id FROM translation_jobs WHERE status = 'running'")
        if (running) {
            return res.status(409).json({
                error: `当前已有正在运行的翻译任务（ID: ${running.id}），请等待完成或中止后再创建新任务`,
                activeJobId: running.id
            })
        }

        const result = run(
            `INSERT INTO translation_jobs (status, target_lang, pages, explicit_items) VALUES ('pending', ?, ?, '[]')`,
            [lang, JSON.stringify(pages)]
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
        abortFlags.set(id, true)
        updateJobProgress(id, { status: 'aborted', finished_at: new Date().toISOString() })
        jobLog(id, 'warn', '🛑 用户手动中止了翻译任务')
        res.json({ success: true })
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

// DELETE /translation-jobs/logs — manually clear all logs (keeps job records)
router.delete('/logs', authMiddleware, (req, res) => {
    try {
        const result = run('DELETE FROM translation_job_logs')
        res.json({ success: true, deleted: result.changes })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

export default router
