import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { getAll, getOne, run } from '../db.js'
import { createPrivateKey, createSign } from 'crypto'

const router = express.Router()

const BASE_URL = 'https://www.sunseasteel.com'

// ── Helper: get Service Account credentials from DB ──────────────────────────
function getServiceAccount() {
    const row = getOne('SELECT service_account_json FROM seo_settings WHERE id = 1')
    if (!row?.service_account_json) return null
    try { return JSON.parse(row.service_account_json) } catch { return null }
}

// ── Helper: generate Google OAuth JWT for Service Account ────────────────────
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
    const signature = sign.sign(privateKey, 'base64url')
    const jwt = `${signing}.${signature}`

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
        signal: AbortSignal.timeout(15000)
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) throw new Error(tokenData.error_description || 'Failed to get access token')
    return tokenData.access_token
}

// ── Helper: generate all site URLs from DB ──────────────────────────────────
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
        for (const p of staticPaths) {
            urls.push(`${BASE_URL}/${l.code}${p}`)
        }
        for (const p of products) {
            urls.push(`${BASE_URL}/${l.code}/products/${p.slug || p.id}`)
        }
        for (const n of news) {
            urls.push(`${BASE_URL}/${l.code}/news/${n.slug || n.id}`)
        }
        for (const c of categories) {
            urls.push(`${BASE_URL}/${l.code}/products?category=${c.slug || c.id}`)
        }
    }
    return urls
}

// ── POST /api/indexing/save-credentials — save service account JSON ──────────
router.post('/save-credentials', authMiddleware, (req, res) => {
    const { service_account_json } = req.body
    if (!service_account_json) return res.status(400).json({ error: '请提供 service_account_json' })
    try {
        const parsed = JSON.parse(service_account_json)
        if (!parsed.client_email || !parsed.private_key) {
            return res.status(400).json({ error: 'JSON 格式不正确，缺少 client_email 或 private_key' })
        }
        const existing = getOne('SELECT id FROM seo_settings WHERE id = 1')
        if (existing) {
            run('UPDATE seo_settings SET service_account_json=? WHERE id=1', [service_account_json])
        } else {
            run('INSERT INTO seo_settings (id, service_account_json) VALUES (1, ?)', [service_account_json])
        }
        res.json({ message: '凭据保存成功', email: parsed.client_email })
    } catch (e) {
        res.status(400).json({ error: '无效的 JSON 格式: ' + e.message })
    }
})

// ── GET /api/indexing/credentials-status — check if credentials configured ──
router.get('/credentials-status', authMiddleware, (req, res) => {
    const sa = getServiceAccount()
    res.json({
        configured: !!sa,
        email: sa?.client_email || null
    })
})

// ── GET /api/indexing/url-list — get all URLs that would be submitted ────────
router.get('/url-list', authMiddleware, (req, res) => {
    const urls = getAllSiteUrls()
    res.json({ urls, total: urls.length })
})

// ── POST /api/indexing/submit-url — submit a single URL ─────────────────────
router.post('/submit-url', authMiddleware, async (req, res) => {
    const { url, type = 'URL_UPDATED' } = req.body
    if (!url) return res.status(400).json({ error: '请提供 url' })
    const sa = getServiceAccount()
    if (!sa) return res.status(400).json({ error: '未配置 Google Service Account，请先在设置中上传凭据' })

    try {
        const token = await getAccessToken(sa)
        const r = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, type }),
            signal: AbortSignal.timeout(15000)
        })
        const data = await r.json()
        if (r.ok) {
            res.json({ success: true, url, result: data })
        } else {
            res.json({ success: false, url, error: data.error?.message || JSON.stringify(data) })
        }
    } catch (e) {
        res.json({ success: false, url, error: e.message })
    }
})

// ── POST /api/indexing/submit-batch — submit multiple URLs (batch) ───────────
router.post('/submit-batch', authMiddleware, async (req, res) => {
    const { urls, type = 'URL_UPDATED' } = req.body
    if (!urls || !urls.length) return res.status(400).json({ error: '请提供 urls 数组' })
    const sa = getServiceAccount()
    if (!sa) return res.status(400).json({ error: '未配置 Google Service Account，请先在设置中上传凭据' })

    // Google Indexing API rate limit: 200 req/day, max 100 per batch
    const BATCH_SIZE = 10
    const results = []
    let successCount = 0
    let failCount = 0

    try {
        const token = await getAccessToken(sa)
        // Process in chunks with small delay to avoid rate limiting
        for (let i = 0; i < urls.length; i += BATCH_SIZE) {
            const chunk = urls.slice(i, i + BATCH_SIZE)
            const chunkResults = await Promise.allSettled(
                chunk.map(async (url) => {
                    const r = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url, type }),
                        signal: AbortSignal.timeout(15000)
                    })
                    const data = await r.json()
                    return { url, success: r.ok, error: r.ok ? null : (data.error?.message || JSON.stringify(data)) }
                })
            )
            for (const r of chunkResults) {
                if (r.status === 'fulfilled') {
                    results.push(r.value)
                    if (r.value.success) successCount++; else failCount++
                } else {
                    results.push({ url: 'unknown', success: false, error: r.reason?.message })
                    failCount++
                }
            }
            // Small delay between chunks
            if (i + BATCH_SIZE < urls.length) await new Promise(r => setTimeout(r, 500))
        }
        res.json({ success: true, total: urls.length, successCount, failCount, results })
    } catch (e) {
        res.status(500).json({ error: e.message, results })
    }
})

// ── POST /api/indexing/submit — legacy sitemap ping (kept for Bing/Yandex) ──
router.post('/submit', authMiddleware, async (req, res) => {
    const { sitemapUrl } = req.body
    if (!sitemapUrl) return res.status(400).json({ error: '请提供 sitemapUrl' })
    const encodedUrl = encodeURIComponent(sitemapUrl)
    const results = []

    // Bing - IndexNow protocol
    try {
        const bingRes = await fetch(`https://www.bing.com/indexnow?url=${encodedUrl}&key=sunseasteel`, {
            method: 'GET', signal: AbortSignal.timeout(15000),
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SitemapPinger/1.0)' }
        })
        results.push({
            engine: 'Bing (IndexNow)',
            status: bingRes.status,
            success: bingRes.ok || bingRes.status === 202,
            message: (bingRes.ok || bingRes.status === 202) ? '✅ Bing IndexNow 已收到通知' : `⚠️ Bing 返回 ${bingRes.status}`
        })
    } catch (e) {
        results.push({ engine: 'Bing', success: false, message: `⚠️ ${e.message}` })
    }

    // Yandex
    try {
        const yandexRes = await fetch(`https://webmaster.yandex.com/ping?sitemap=${encodedUrl}`, {
            method: 'GET', signal: AbortSignal.timeout(10000)
        })
        results.push({
            engine: 'Yandex',
            status: yandexRes.status,
            success: yandexRes.ok,
            message: yandexRes.ok ? '✅ Yandex 已收到 Sitemap 通知' : `⚠️ Yandex 返回 ${yandexRes.status}`
        })
    } catch (e) {
        results.push({ engine: 'Yandex', success: false, message: `❌ ${e.message}` })
    }

    res.json({ results, submitted_at: new Date().toISOString() })
})

export default router
