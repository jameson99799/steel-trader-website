import { Router } from 'express'
import { getAll, getOne } from '../db.js'

const router = Router()

function escapeXml(str) {
    if (!str) return ''
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

router.get('/', (req, res) => {
    const baseUrl = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`

    const staticPages = [
        { loc: '/', priority: '1.0', changefreq: 'daily' },
        { loc: '/products', priority: '0.9', changefreq: 'daily' },
        { loc: '/news', priority: '0.8', changefreq: 'daily' },
        { loc: '/about', priority: '0.7', changefreq: 'monthly' },
        { loc: '/contact', priority: '0.7', changefreq: 'monthly' },
    ]

    const products = getAll(`SELECT id, name_en, updated_at FROM products WHERE status = 1 ORDER BY id DESC`)
    const news = getAll(`SELECT slug, id, title_en, updated_at FROM news WHERE status = 1 ORDER BY id DESC`)

    const now = new Date().toISOString().split('T')[0]

    const urls = []

    // Static pages
    for (const p of staticPages) {
        urls.push(`  <url>
    <loc>${escapeXml(baseUrl + p.loc)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`)
    }

    // Products
    for (const p of products) {
        const lastmod = p.updated_at ? p.updated_at.split(' ')[0] : now
        urls.push(`  <url>
    <loc>${escapeXml(baseUrl + '/products/' + p.id)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`)
    }

    // News
    for (const n of news) {
        const slug = n.slug || n.id
        const lastmod = n.updated_at ? n.updated_at.split(' ')[0] : now
        urls.push(`  <url>
    <loc>${escapeXml(baseUrl + '/news/' + slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`)
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`

    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.send(xml)
})

export default router
