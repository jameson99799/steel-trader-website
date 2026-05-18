import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { getAll, getOne, run } from '../db.js'

const router = express.Router()
const BASE_URL = 'https://www.sunseasteel.com'
const DAILY_QUOTA = 200         // Google Indexing API free quota per day
const BATCH_DELAY_MS = 500      // delay between API calls to avoid rate limiting
const SCHEDULER_INTERVAL = 60 * 60 * 1000  // check every hour

// ════════════════════════════════════════════════════════════════════════════
// OAUTH & TOKEN MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

function getOAuthConfig() {
    return getOne('SELECT oauth_client_id, oauth_client_secret, oauth_refresh_token FROM seo_settings WHERE id = 1')
}

let cachedAccessToken = null
let tokenExpiry = 0

async function getAccessToken() {
    if (cachedAccessToken && Date.now() < tokenExpiry) {
        return cachedAccessToken
    }
    const config = getOAuthConfig()
    if (!config?.oauth_client_id || !config?.oauth_client_secret || !config?.oauth_refresh_token) {
        throw new Error('OAuth 未配置或未登录')
    }

    const r = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: config.oauth_client_id,
            client_secret: config.oauth_client_secret,
            refresh_token: config.oauth_refresh_token,
            grant_type: 'refresh_token'
        })
    })
    const d = await r.json()
    if (!d.access_token) throw new Error(d.error_description || 'Failed to refresh token')
    
    cachedAccessToken = d.access_token
    tokenExpiry = Date.now() + (d.expires_in - 60) * 1000 // Buffer of 60s
    return cachedAccessToken
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function today() {
    return new Date().toISOString().split('T')[0]
}

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

// 1. GSC URL Inspection
async function inspectUrlInGSC(url, token) {
    try {
        const r = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ inspectionUrl: url, siteUrl: BASE_URL + '/', languageCode: 'en-US' }),
            signal: AbortSignal.timeout(20000)
        })
        const data = await r.json()
        if (!r.ok) return { success: false, error: data.error?.message || `HTTP ${r.status}` }
        const res = data.inspectionResult?.indexStatusResult || {}
        return {
            success: true,
            verdict: res.verdict || '',
            coverageState: res.coverageState || '',
            lastCrawlTime: res.lastCrawlTime || null
        }
    } catch (e) {
        return { success: false, error: e.message }
    }
}

// 2. Google Indexing Push API
async function submitOneUrl(url, token) {
    try {
        const r = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, type: 'URL_UPDATED' }),
            signal: AbortSignal.timeout(15000)
        })
        const data = await r.json()
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
// SCHEDULER
// ════════════════════════════════════════════════════════════════════════════

let schedulerRunning = false
let schedulerTimer = null

export async function runIndexingScheduler() {
    if (schedulerRunning) return
    schedulerRunning = true
    console.log('[Indexing] Scheduler tick:', new Date().toISOString())

    try {
        let token
        try {
            token = await getAccessToken()
        } catch (e) {
            console.log('[Indexing] Scheduler aborted: No valid OAuth token -', e.message)
            schedulerRunning = false
            return
        }

        const remaining = getTodayRemaining()
        if (remaining <= 0) {
            console.log('[Indexing] Daily quota exhausted, will retry tomorrow')
            run('UPDATE indexing_daily_quota SET auto_paused=1 WHERE date=?', [today()])
            schedulerRunning = false
            return
        }

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

        console.log(`[Indexing] Processing ${toSubmit.length} URLs`)
        let submitted = 0

        for (const row of toSubmit) {
            const now = new Date().toISOString()
            
            // 1. Inspect in GSC first
            const gsc = await inspectUrlInGSC(row.url, token)
            await new Promise(r => setTimeout(r, 500)) // Rate limit delay

            if (gsc.success) {
                // Save GSC feedback
                run(`UPDATE indexing_queue SET gsc_verdict=?, gsc_coverage_state=?, gsc_last_crawl_time=?, gsc_inspection_date=? WHERE url=?`,
                    [gsc.verdict, gsc.coverageState, gsc.lastCrawlTime, now, row.url])
                
                // If already indexed, mark successful and skip indexing push!
                if (gsc.coverageState && gsc.coverageState.includes('Indexed')) {
                    run(`UPDATE indexing_queue SET status='submitted', error_message=NULL, submitted_at=?, updated_at=? WHERE url=?`,
                        [now, now, row.url])
                    continue
                }
            }

            // 2. Not indexed? Push to Indexing API
            const result = await submitOneUrl(row.url, token)
            await new Promise(r => setTimeout(r, 500))

            if (result.success) {
                run(`UPDATE indexing_queue SET status='submitted', http_code=?, api_response=?,
                     error_message=NULL, submitted_at=?, updated_at=? WHERE url=?`,
                    [result.httpCode, result.response, now, now, row.url])
            } else if (result.httpCode === 429) {
                run(`UPDATE indexing_queue SET status='pending', http_code=?, error_message=?, updated_at=? WHERE url=?`,
                    [result.httpCode, result.error, now, row.url])
                run('UPDATE indexing_daily_quota SET auto_paused=1 WHERE date=?', [today()])
                console.log('[Indexing] 429 quota exceeded, pausing')
                break
            } else {
                const retryCount = (getOne('SELECT retry_count FROM indexing_queue WHERE url=?', [row.url])?.retry_count || 0) + 1
                const backoffHours = [1, 4, 24, 48][Math.min(retryCount - 1, 3)]
                const nextRetry = new Date(Date.now() + backoffHours * 3600000).toISOString()
                run(`UPDATE indexing_queue SET status='failed', http_code=?, error_message=?,
                     retry_count=retry_count+1, next_retry_at=?, updated_at=? WHERE url=?`,
                    [result.httpCode, result.error, nextRetry, now, row.url])
            }

            incrementDailyCount(1)
            submitted++
        }

        console.log(`[Indexing] Done: ${submitted} submitted`)
    } catch (e) {
        console.error('[Indexing] Scheduler error:', e.message)
    }

    schedulerRunning = false
}

export function startIndexingScheduler() {
    setTimeout(runIndexingScheduler, 5000)
    schedulerTimer = setInterval(runIndexingScheduler, SCHEDULER_INTERVAL)
    console.log('✓ Google Indexing Scheduler started (every 1h)')
}

// ════════════════════════════════════════════════════════════════════════════
// REST API ROUTES
// ════════════════════════════════════════════════════════════════════════════

router.get('/status', authMiddleware, (req, res) => {
    const q = getTodayQuota()
    const counts = getAll(`SELECT status, COUNT(*) as count FROM indexing_queue GROUP BY status`)
    const statusMap = {}
    counts.forEach(r => { statusMap[r.status] = r.count })

    const recent = getAll(`
        SELECT url, status, http_code, error_message, submitted_at, retry_count,
               gsc_verdict, gsc_coverage_state, gsc_last_crawl_time, gsc_inspection_date
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

// OAUTH ROUTES
router.get('/oauth/status', authMiddleware, (req, res) => {
    const conf = getOAuthConfig()
    res.json({ 
        has_client: !!(conf?.oauth_client_id && conf?.oauth_client_secret),
        client_id: conf?.oauth_client_id || '',
        authorized: !!conf?.oauth_refresh_token
    })
})

router.post('/oauth/save-client', authMiddleware, (req, res) => {
    const { client_id, client_secret } = req.body
    if (!client_id || !client_secret) return res.status(400).json({ error: 'Missing client id or secret' })
    const existing = getOne('SELECT id FROM seo_settings WHERE id = 1')
    if (existing) run('UPDATE seo_settings SET oauth_client_id=?, oauth_client_secret=? WHERE id=1', [client_id, client_secret])
    else run('INSERT INTO seo_settings (id, oauth_client_id, oauth_client_secret) VALUES (1, ?, ?)', [client_id, client_secret])
    res.json({ message: 'Client ID & Secret Saved' })
})

router.get('/oauth/auth-url', authMiddleware, (req, res) => {
    const conf = getOAuthConfig()
    if (!conf?.oauth_client_id) return res.status(400).json({ error: 'Client ID missing' })
    const redirectUri = `${BASE_URL}/api/indexing/oauth/callback`
    const scopes = encodeURIComponent('https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/indexing')
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${conf.oauth_client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scopes}&access_type=offline&prompt=consent`
    res.json({ url })
})

// IMPORTANT: Callback doesn't have authMiddleware because it's called by Google!
router.get('/oauth/callback', async (req, res) => {
    const code = req.query.code
    if (!code) return res.status(400).send('No code provided by Google.')
    
    const conf = getOAuthConfig()
    const redirectUri = `${BASE_URL}/api/indexing/oauth/callback`
    
    try {
        const r = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: conf.oauth_client_id,
                client_secret: conf.oauth_client_secret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            })
        })
        const d = await r.json()
        if (d.error) throw new Error(d.error_description || d.error)
        if (d.refresh_token) {
            run('UPDATE seo_settings SET oauth_refresh_token=? WHERE id=1', [d.refresh_token])
            cachedAccessToken = d.access_token
            tokenExpiry = Date.now() + (d.expires_in - 60) * 1000
            res.send(`<h1>Google Authorization Successful!</h1><p>You can close this window and refresh the dashboard.</p><script>setTimeout(() => window.close(), 3000)</script>`)
        } else {
            res.send(`<h1>Authorization Failed</h1><p>No refresh token returned. You might need to revoke access in your Google Account and try again to force consent.</p>`)
        }
    } catch (e) {
        res.status(500).send(`<h1>Error</h1><p>${e.message}</p>`)
    }
})

router.post('/oauth/revoke', authMiddleware, (req, res) => {
    run('UPDATE seo_settings SET oauth_refresh_token=NULL WHERE id=1')
    cachedAccessToken = null
    res.json({ message: 'Authorization revoked' })
})

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

router.post('/run-now', authMiddleware, async (req, res) => {
    if (schedulerRunning) return res.json({ message: '调度器正在运行中，请稍后' })
    res.json({ message: '已触发，后台开始处理（检查GSC并提交）...' })
    setTimeout(runIndexingScheduler, 100)
})

router.post('/reset-url', authMiddleware, (req, res) => {
    const { url } = req.body
    if (!url) return res.status(400).json({ error: '请提供 url' })
    run(`UPDATE indexing_queue SET status='pending', retry_count=0, next_retry_at=NULL, error_message=NULL, updated_at=datetime('now') WHERE url=?`, [url])
    res.json({ message: '已重置为待提交' })
})

router.delete('/clear-submitted', authMiddleware, (req, res) => {
    run("UPDATE indexing_queue SET status='pending', submitted_at=NULL, retry_count=0 WHERE status='submitted'")
    res.json({ message: `已将所有已提交记录重置为待处理` })
})

router.get('/url-list', authMiddleware, (req, res) => {
    const urls = getAllSiteUrls()
    res.json({ urls, total: urls.length })
})

router.post('/submit', authMiddleware, async (req, res) => {
    const urls = getAllSiteUrls()
    const results = []

    try {
        const yRes = await fetch(`https://webmaster.yandex.com/ping?sitemap=${BASE_URL}/sitemap.xml`, { method: 'GET', signal: AbortSignal.timeout(10000) })
        results.push({ engine: 'Yandex (Sitemap)', status: yRes.status, success: yRes.ok, message: yRes.ok ? '✅ Yandex Sitemap 已收到通知' : `⚠️ Yandex ${yRes.status}` })
    } catch (e) { results.push({ engine: 'Yandex (Sitemap)', success: false, message: `❌ ${e.message}` }) }

    try {
        const indexNowBody = {
            host: BASE_URL.replace('https://', ''),
            key: 'sunseasteel',
            keyLocation: `${BASE_URL}/sunseasteel.txt`,
            urlList: urls
        }
        
        const inRes = await fetch(`https://api.indexnow.org/indexnow`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify(indexNowBody),
            signal: AbortSignal.timeout(15000)
        })
        const ok = inRes.ok || inRes.status === 200 || inRes.status === 202
        results.push({ engine: 'IndexNow (Bing/Yandex)', status: inRes.status, success: ok, message: ok ? `✅ 成功推送 ${urls.length} 个 URL` : `⚠️ 失败 HTTP ${inRes.status}` })
    } catch (e) { results.push({ engine: 'IndexNow', success: false, message: `⚠️ ${e.message}` }) }

    res.json({ results, submitted_at: new Date().toISOString() })
})

export default router
