import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { getOne } from '../db.js'

const router = express.Router()

// POST /api/indexing/submit — ping Google + Bing with sitemap URL
router.post('/submit', authMiddleware, async (req, res) => {
    const { sitemapUrl } = req.body
    if (!sitemapUrl) return res.status(400).json({ error: '请提供 sitemapUrl' })

    const encodedUrl = encodeURIComponent(sitemapUrl)
    const results = []

    // Google sitemap ping
    try {
        const googleRes = await fetch(`https://www.google.com/ping?sitemap=${encodedUrl}`, {
            method: 'GET', signal: AbortSignal.timeout(10000)
        })
        results.push({
            engine: 'Google',
            status: googleRes.status,
            success: googleRes.status === 200,
            message: googleRes.status === 200 ? '✅ Google 已收到 Sitemap 通知' : `⚠️ Google 返回 ${googleRes.status}`
        })
    } catch (e) {
        results.push({ engine: 'Google', success: false, message: `❌ ${e.message}` })
    }

    // Bing sitemap ping
    try {
        const bingRes = await fetch(`https://www.bing.com/ping?sitemap=${encodedUrl}`, {
            method: 'GET', signal: AbortSignal.timeout(10000)
        })
        results.push({
            engine: 'Bing',
            status: bingRes.status,
            success: bingRes.status === 200,
            message: bingRes.status === 200 ? '✅ Bing 已收到 Sitemap 通知' : `⚠️ Bing 返回 ${bingRes.status}`
        })
    } catch (e) {
        results.push({ engine: 'Bing', success: false, message: `❌ ${e.message}` })
    }

    res.json({ results, submitted_at: new Date().toISOString() })
})

export default router
