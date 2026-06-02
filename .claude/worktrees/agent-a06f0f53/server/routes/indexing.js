import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { getAll, getOne, run } from '../db.js'
import { createPrivateKey, createSign } from 'crypto'

const router = express.Router()
const BASE_URL = 'https://www.sunseasteel.com'
const DAILY_QUOTA = 200         // Google Indexing API free quota per day
const BATCH_DELAY_MS = 300      // delay between API calls to avoid rate limiting
const SCHEDULER_INTERVAL = 60 * 60 * 1000  // check every hour

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function today() {
    return new Date().toISOString().split('T')[0]  // "YYYY-MM-DD"
}

function getServiceAccount() {
    const row = getOne('SELECT service_account_json FROM seo_settings WHERE id = 1')
    if (!row?.service_account_json) return null
    try { return JSON.parse(row.service_account_json) } catch { return null }
}

async function getAccessToken(sa) {
    const now = Math.floor(Date.now() / 1000)
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/indexing',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600
    })).toString('base64url')
    const signing = `${header}.${payload}`
    const privateKey = createPrivateKey(sa.private_key)
    const sign = createSign('RSA-SHA256')
    sign.update(signing)
    const sig = sign.sign(privateKey, 'base64url')
    const jwt = `${signing}.${sig}`

    const r = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
        signal: AbortSignal.timeout(15000)
    })
    const d = await r.json()
    if (!d.access_token) throw new Error(d.error_description || 'Failed to get access token')
    return d.access_token
}

// Generate all site URLs from DB
function getAllSiteUrls() {
    let langs = []
    try { langs = getAll('SELECT code FROM languages WHERE status = 1') } catch {}
    if (!langs.length) langs = [{ code: 'en' }]

    const products = getAll('SELECT slug, id FROM products WHERE status = 1')
    const news = getAll('SELECT slug, id FROM news WHERE status = 1')
    const categories = getAll('SELECT id, slug FROM categories')

    const urls = []
    const staticPaths = ['', '/products', '/news', '/about', '/contact']

    for (const l of langs) {
        for (const p of staticPaths) urls.push(`${BASE_URL}/${l.code}${p}`)
        for (const p of products) urls.push(`${BASE_URL}/${l.code}/products/${p.slug || p.id}`)
        for (const n of news) urls.push(`${BASE_URL}/${l.code}/news/${n.slug || n.id}`)
        for (const c of categories) urls.push(`${BASE_URL}/${l.code}/products?category=${c.slug || c.id}`)
    }
    return urls
}

// Get or create today's quota row
function getTodayQuota() {
    const d = today()
    let q = getOne('SELECT * FROM indexing_daily_quota WHERE date = ?', [d])
    if (!q) {
        run('INSERT OR IGNORE INTO indexing_daily_quota (date, submitted_count, quota_limit, auto_paused) VALUES (?,0,?,0)', [d, DAILY_QUOTA])
        q = getOne('SELECT * FROM indexing_daily_quota WHERE date = ?', [d])
    }
    return q
}

function getTodayRemaining() {
    const q = getTodayQuota()
    return Math.max(0, q.quota_limit - q.submitted_count)
}

function incrementDailyCount(n = 1) {
    const d = today()
    run('INSERT INTO indexing_daily_quota (date, submitted_count, quota_limit) VALUES (?,?,?) ON CONFLICT(date) DO UPDATE SET submitted_count=submitted_count+?',
        [d, n, DAILY_QUOTA, n])
}

// Submit ONE url to Google Indexing API
// Returns { success, httpCode, response, error }
async function submitOneUrl(url, token) {
    try {
        const r = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, type: 'URL_UPDATED' }),
            signal: AbortSignal.timeout(15000)
        })
        const data = await r.json()
        /*
         * SUCCESS/FAILURE判断依据（官方）:
         * ✅ 200 OK  — Google收到通知，urlNotificationMetadata.url = 提交的URL
         * ❌ 400     — 请求格式错误或URL不合法
         * ❌ 401/403 — Service Account未授权 或 未在GSC添加为所有者
         * ❌ 404     — URL不存在
         * ❌ 429     — 超出每日配额（200/天）
         * ❌ 5xx     — Google服务器错误，可重试
         */
        const success = r.status === 200
        return {
            success,
            httpCode: r.status,
            response: JSON.stringify(data).substring(0, 500),
            error: success ? null : (data.error?.message || `HTTP ${r.status}`)
        }
    } catch (e) {
        return { success: false, httpCode: 0, response: '', error: e.message }
    }
}

// ════════════════════════════════════════════════════════════════════════════
// SCHEDULER — runs in background, survives pm2 restarts
// ════════════════════════════════════════════════════════════════════════════

let schedulerRunning = false
let schedulerTimer = null

export async function runIndexingScheduler() {
    if (schedulerRunning) return
    schedulerRunning = true
    console.log('[Indexing] Scheduler tick:', new Date().toISOString())

    try {
        const sa = getServiceAccount()
        if (!sa) { schedulerRunning = false; return }

        const remaining = getTodayRemaining()
        if (remaining <= 0) {
            console.log('[Indexing] Daily quota exhausted, will retry tomorrow')
            run('UPDATE indexing_daily_quota SET auto_paused=1 WHERE date=?', [today()])
            schedulerRunning = false
            return
        }

        // Get pending/failed URLs that are due for (re)submission
        const toSubmit = getAll(
            `SELECT url FROM indexing_queue
             WHERE status IN ('pending', 'failed')
               AND (next_retry_at IS NULL OR next_retry_at <= datetime('now'))
             ORDER BY status ASC, retry_count ASC
             LIMIT ?`,
            [remaining]
        )

        if (!toSubmit.length) {
            console.log('[Indexing] No pending URLs in queue')
            schedulerRunning = false
            return
        }

        console.log(`[Indexing] Submitting ${toSubmit.length} URLs (${remaining} quota remaining)`)
        const token = await getAccessToken(sa)
        let submitted = 0

        for (const row of toSubmit) {
            const result = await submitOneUrl(row.url, token)
            const now = new Date().toISOString()

            if (result.success) {
                run(`UPDATE indexing_queue SET status='submitted', http_code=?, api_response=?,
                     error_message=NULL, submitted_at=?, updated_at=? WHERE url=?`,
                    [result.httpCode, result.response, now, now, row.url])
            } else if (result.httpCode === 429) {
                // Quota exceeded mid-batch — stop immediately
                run(`UPDATE indexing_queue SET status='pending', http_code=?, error_message=?, updated_at=? WHERE url=?`,
                    [result.httpCode, result.error, now, row.url])
                run('UPDATE indexing_daily_quota SET auto_paused=1 WHERE date=?', [today()])
                console.log('[Indexing] 429 quota exceeded, pausing')
                break
            } else {
                // Calculate backoff: 1h, 4h, 24h, 48h based on retry count
                const retryCount = (getOne('SELECT retry_count FROM indexing_queue WHERE url=?', [row.url])?.retry_count || 0) + 1
                const backoffHours = [1, 4, 24, 48][Math.min(retryCount - 1, 3)]
                const nextRetry = new Date(Date.now() + backoffHours * 3600000).toISOString()
                run(`UPDATE indexing_queue SET status='failed', http_code=?, error_message=?,
                     retry_count=retry_count+1, next_retry_at=?, updated_at=? WHERE url=?`,
                    [result.httpCode, result.error, nextRetry, now, row.url])
            }

            incrementDailyCount(1)
            submitted++

            // Small delay between requests
            await new Promise(r => setTimeout(r, BATCH_DELAY_MS))
        }

        console.log(`[Indexing] Done: ${submitted} submitted`)
    } catch (e) {
        console.error('[Indexing] Scheduler error:', e.message)
    }

    schedulerRunning = false
}

// Start the background scheduler (called from server/index.js)
export function startIndexingScheduler() {
    // Run immediately on startup
    setTimeout(runIndexingScheduler, 5000)

    // Then check every hour
    schedulerTimer = setInterval(runIndexingScheduler, SCHEDULER_INTERVAL)
    console.log('✓ Google Indexing Scheduler started (every 1h)')
}

// ════════════════════════════════════════════════════════════════════════════
// REST API ROUTES
// ════════════════════════════════════════════════════════════════════════════

// GET /api/indexing/status — queue stats + quota info
router.get('/status', authMiddleware, (req, res) => {
    const q = getTodayQuota()
    const counts = getAll(`
        SELECT status, COUNT(*) as count
        FROM indexing_queue GROUP BY status
    `)
    const statusMap = {}
    counts.forEach(r => { statusMap[r.status] = r.count })

    const recent = getAll(`
        SELECT url, status, http_code, error_message, submitted_at, retry_count
        FROM indexing_queue
        ORDER BY updated_at DESC LIMIT 50
    `)

    res.json({
        quota: { date: q.date, used: q.submitted_count, limit: q.quota_limit, remaining: Math.max(0, q.quota_limit - q.submitted_count), auto_paused: !!q.auto_paused },
        queue: { pending: statusMap.pending || 0, submitted: statusMap.submitted || 0, failed: statusMap.failed || 0, total: Object.values(statusMap).reduce((a, b) => a + b, 0) },
        recent,
        scheduler_running: schedulerRunning
    })
})

// GET /api/indexing/credentials-status
router.get('/credentials-status', authMiddleware, (req, res) => {
    const sa = getServiceAccount()
    res.json({ configured: !!sa, email: sa?.client_email || null })
})

// POST /api/indexing/save-credentials
router.post('/save-credentials', authMiddleware, (req, res) => {
    const { service_account_json } = req.body
    if (!service_account_json) return res.status(400).json({ error: '请提供 service_account_json' })
    try {
        const parsed = JSON.parse(service_account_json)
        if (!parsed.client_email || !parsed.private_key) return res.status(400).json({ error: '缺少 client_email 或 private_key' })
        const existing = getOne('SELECT id FROM seo_settings WHERE id = 1')
        if (existing) run('UPDATE seo_settings SET service_account_json=? WHERE id=1', [service_account_json])
        else run('INSERT INTO seo_settings (id, service_account_json) VALUES (1, ?)', [service_account_json])
        res.json({ message: '保存成功', email: parsed.client_email })
    } catch (e) {
        res.status(400).json({ error: '无效 JSON: ' + e.message })
    }
})

// POST /api/indexing/enqueue — sync all site URLs into queue (skip already submitted)
router.post('/enqueue', authMiddleware, (req, res) => {
    const { force = false } = req.body
    const siteUrls = getAllSiteUrls()
    let added = 0, skipped = 0

    for (const url of siteUrls) {
        const existing = getOne('SELECT status FROM indexing_queue WHERE url=?', [url])
        if (existing && existing.status === 'submitted' && !force) {
            skipped++
            continue
        }
        if (!existing) {
            run('INSERT INTO indexing_queue (url, status) VALUES (?,?)', [url, 'pending'])
            added++
        } else if (force || existing.status === 'failed') {
            run(`UPDATE indexing_queue SET status='pending', next_retry_at=NULL, retry_count=0, updated_at=datetime('now') WHERE url=?`, [url])
            added++
        }
    }

    res.json({ total: siteUrls.length, added, skipped, message: `已加入队列 ${added} 个 URL，跳过已成功 ${skipped} 个` })
})

// POST /api/indexing/run-now — manually trigger scheduler
router.post('/run-now', authMiddleware, async (req, res) => {
    if (schedulerRunning) return res.json({ message: '调度器正在运行中，请稍后' })
    res.json({ message: '已触发，后台开始提交...' })
    // Run async after response
    setTimeout(runIndexingScheduler, 100)
})

// POST /api/indexing/reset-url — reset a specific URL back to pending
router.post('/reset-url', authMiddleware, (req, res) => {
    const { url } = req.body
    if (!url) return res.status(400).json({ error: '请提供 url' })
    run(`UPDATE indexing_queue SET status='pending', retry_count=0, next_retry_at=NULL, error_message=NULL, updated_at=datetime('now') WHERE url=?`, [url])
    res.json({ message: '已重置为待提交' })
})

// DELETE /api/indexing/clear-submitted — remove submitted records (allow re-notify)
router.delete('/clear-submitted', authMiddleware, (req, res) => {
    const result = run("UPDATE indexing_queue SET status='pending', submitted_at=NULL, retry_count=0 WHERE status='submitted'")
    res.json({ message: `已将所有已提交记录重置为待提交` })
})

// GET /api/indexing/url-list — raw URL list (for manual submission UI)
router.get('/url-list', authMiddleware, (req, res) => {
    const urls = getAllSiteUrls()
    res.json({ urls, total: urls.length })
})

// POST /api/indexing/submit — legacy sitemap ping for Bing/Yandex
router.post('/submit', authMiddleware, async (req, res) => {
    const { sitemapUrl } = req.body
    if (!sitemapUrl) return res.status(400).json({ error: '请提供 sitemapUrl' })
    const encodedUrl = encodeURIComponent(sitemapUrl)
    const results = []
    try {
        const bingRes = await fetch(`https://www.bing.com/indexnow?url=${encodedUrl}&key=sunseasteel`, {
            method: 'GET', signal: AbortSignal.timeout(15000)
        })
        results.push({ engine: 'Bing (IndexNow)', status: bingRes.status, success: bingRes.ok || bingRes.status === 202, message: (bingRes.ok || bingRes.status === 202) ? '✅ Bing IndexNow 已收到通知' : `⚠️ Bing 返回 ${bingRes.status}` })
    } catch (e) { results.push({ engine: 'Bing', success: false, message: `⚠️ ${e.message}` }) }
    try {
        const yRes = await fetch(`https://webmaster.yandex.com/ping?sitemap=${encodedUrl}`, { method: 'GET', signal: AbortSignal.timeout(10000) })
        results.push({ engine: 'Yandex', status: yRes.status, success: yRes.ok, message: yRes.ok ? '✅ Yandex 已收到通知' : `⚠️ Yandex ${yRes.status}` })
    } catch (e) { results.push({ engine: 'Yandex', success: false, message: `❌ ${e.message}` }) }
    res.json({ results, submitted_at: new Date().toISOString() })
})

export default router
