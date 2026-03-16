import express from 'express'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()

// POST /api/indexing/submit — ping search engines with sitemap URL
router.post('/submit', authMiddleware, async (req, res) => {
    const { sitemapUrl } = req.body
    if (!sitemapUrl) return res.status(400).json({ error: '请提供 sitemapUrl' })

    const encodedUrl = encodeURIComponent(sitemapUrl)
    const results = []

    // Google sitemap ping (legacy endpoint - may return 404 as Google deprecated it)
    try {
        const googleRes = await fetch(`https://www.google.com/ping?sitemap=${encodedUrl}`, {
            method: 'GET',
            signal: AbortSignal.timeout(15000),
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SitemapPinger/1.0)' }
        })
        results.push({
            engine: 'Google',
            status: googleRes.status,
            success: googleRes.ok,
            message: googleRes.ok
                ? '✅ Google 已收到 Sitemap 通知'
                : `⚠️ Google 返回 ${googleRes.status}（Google 已弃用 ping 接口，建议通过 Google Search Console 手动提交 Sitemap）`
        })
    } catch (e) {
        results.push({ engine: 'Google', success: false, message: `⚠️ Google ping 接口已弃用，请通过 Google Search Console 手动提交。(${e.message})` })
    }

    // Bing - use IndexNow protocol
    try {
        const bingRes = await fetch(`https://www.bing.com/indexnow?url=${encodedUrl}&key=sunseasteel`, {
            method: 'GET',
            signal: AbortSignal.timeout(15000),
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SitemapPinger/1.0)' }
        })
        results.push({
            engine: 'Bing (IndexNow)',
            status: bingRes.status,
            success: bingRes.ok || bingRes.status === 202,
            message: (bingRes.ok || bingRes.status === 202)
                ? '✅ Bing IndexNow 已收到通知'
                : `⚠️ Bing 返回 ${bingRes.status}（建议通过 Bing Webmaster Tools 提交 Sitemap）`
        })
    } catch (e) {
        results.push({ engine: 'Bing', success: false, message: `⚠️ Bing 提交失败，建议通过 Bing Webmaster Tools 添加 Sitemap。(${e.message})` })
    }

    // Yandex sitemap ping
    try {
        const yandexRes = await fetch(`https://webmaster.yandex.com/ping?sitemap=${encodedUrl}`, {
            method: 'GET',
            signal: AbortSignal.timeout(10000),
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SitemapPinger/1.0)' }
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
