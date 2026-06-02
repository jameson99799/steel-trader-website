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
    const baseUrl = (process.env.SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '')

    // Get active languages for multi-language sitemap
    let activeLangs = []
    try {
        activeLangs = getAll(`SELECT code FROM languages WHERE status = 1 ORDER BY code`)
    } catch {
        activeLangs = [{ code: 'en' }]
    }
    if (!activeLangs.length) activeLangs = [{ code: 'en' }]

    // Force canonical base URL to always be https://www (no redirects)
    const BASE_URL = 'https://www.sunseasteel.com'

    const staticPages = [
        { loc: '/', priority: '1.0', changefreq: 'daily' },
        { loc: '/products', priority: '0.9', changefreq: 'daily' },
        { loc: '/news', priority: '0.8', changefreq: 'daily' },
        { loc: '/about', priority: '0.7', changefreq: 'monthly' },
        { loc: '/contact', priority: '0.7', changefreq: 'monthly' },
    ]

    const products = getAll(`SELECT id, slug, name_en, created_at FROM products WHERE status = 1 ORDER BY id DESC`)
    const news = getAll(`SELECT slug, id, title_en, updated_at FROM news WHERE status = 1 ORDER BY id DESC`)
    const categories = getAll(`SELECT id, slug, name_en FROM categories ORDER BY sort_order, id`)

    const now = new Date().toISOString().split('T')[0]

    // Build hreflang links for a path
    function hreflangLinks(path) {
        return activeLangs.map(l => {
            const langPath = `/${l.code}${path === '/' ? '' : path}`
            return `    <xhtml:link rel="alternate" hreflang="${escapeXml(l.code)}" href="${escapeXml(BASE_URL + langPath)}" />`
        }).concat([
            `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(BASE_URL + '/en' + (path === '/' ? '' : path))}" />`
        ]).join('\n')
    }

    const urls = []

    // Static pages — one entry per language
    for (const p of staticPages) {
        for (const l of activeLangs) {
            const langPath = `/${l.code}${p.loc === '/' ? '' : p.loc}`
            urls.push(`  <url>
    <loc>${escapeXml(BASE_URL + langPath)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
${hreflangLinks(p.loc)}
  </url>`)
        }
    }

    // Category pages — one entry per language
    for (const c of categories) {
        const catSlug = c.slug || c.id
        const catPath = `/products?category=${catSlug}`
        for (const l of activeLangs) {
            urls.push(`  <url>
    <loc>${escapeXml(BASE_URL + '/' + l.code + catPath)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
${hreflangLinks(catPath)}
  </url>`)
        }
    }

    // Products — one entry per language
    for (const p of products) {
        const prodSlug = p.slug || p.id
        const prodPath = `/products/${prodSlug}`
        const lastmod = p.created_at ? p.created_at.split(' ')[0] : now
        for (const l of activeLangs) {
            urls.push(`  <url>
    <loc>${escapeXml(BASE_URL + '/' + l.code + prodPath)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
${hreflangLinks(prodPath)}
  </url>`)
        }
    }

    // News — one entry per language
    for (const n of news) {
        const slug = n.slug || n.id
        const newsPath = `/news/${slug}`
        const lastmod = n.updated_at ? n.updated_at.split(' ')[0] : now
        for (const l of activeLangs) {
            urls.push(`  <url>
    <loc>${escapeXml(BASE_URL + '/' + l.code + newsPath)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
${hreflangLinks(newsPath)}
  </url>`)
        }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`

    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.send(xml)
})

export default router
