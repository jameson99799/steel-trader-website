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

const BASE_URL = 'https://www.sunseasteel.com'

function getActiveLangs() {
    try {
        const langs = getAll(`SELECT code FROM languages WHERE status = 1 ORDER BY code`)
        return langs.length ? langs : [{ code: 'en' }]
    } catch {
        return [{ code: 'en' }]
    }
}

function hreflangLinks(activeLangs, path) {
    const normalPath = path === '/' ? '' : path
    return activeLangs.map(l => {
        const code = (l.code || '').trim()
        return `    <xhtml:link rel="alternate" hreflang="${escapeXml(code)}" href="${escapeXml(BASE_URL + '/' + code + normalPath)}" />`
    }).concat([
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(BASE_URL + '/en' + normalPath)}" />`
    ]).join('\n')
}

function urlEntry(loc, { lastmod, changefreq, priority, hreflang = '' }) {
    return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${hreflang}
  </url>`
}

function wrapUrlset(urls) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`
}

// ── Sitemap Index (/sitemap.xml) ──────────────────────────────────────────────
router.get('/', (req, res) => {
    const now = new Date().toISOString().split('T')[0]
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap-static.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-products.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-news.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.send(xml)
})

// ── Static pages sitemap (/sitemap-static.xml) ───────────────────────────────
router.get('/static', (req, res) => {
    const activeLangs = getActiveLangs()
    const now = new Date().toISOString().split('T')[0]
    const staticPages = [
        { loc: '/',        priority: '1.0', changefreq: 'daily' },
        { loc: '/products', priority: '0.9', changefreq: 'daily' },
        { loc: '/news',     priority: '0.8', changefreq: 'daily' },
        { loc: '/about',    priority: '0.7', changefreq: 'monthly' },
        { loc: '/contact',  priority: '0.7', changefreq: 'monthly' },
    ]

    // Category pages — clean path URLs (not query params)
    const categories = getAll(`SELECT id, slug, name_en FROM categories ORDER BY sort_order, id`)

    const urls = []
    for (const p of staticPages) {
        for (const l of activeLangs) {
            const normalPath = p.loc === '/' ? '' : p.loc
            const loc = `${BASE_URL}/${l.code}${normalPath}`
            urls.push(urlEntry(loc, { lastmod: now, changefreq: p.changefreq, priority: p.priority, hreflang: hreflangLinks(activeLangs, p.loc) }))
        }
    }

    for (const c of categories) {
        const catSlug = c.slug || `category-${c.id}`
        const catPath = `/products/category/${catSlug}`
        for (const l of activeLangs) {
            const loc = `${BASE_URL}/${l.code}${catPath}`
            urls.push(urlEntry(loc, { lastmod: now, changefreq: 'weekly', priority: '0.7', hreflang: hreflangLinks(activeLangs, catPath) }))
        }
    }

    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.send(wrapUrlset(urls))
})

// ── Products sitemap (/sitemap-products.xml) ──────────────────────────────────
router.get('/products', (req, res) => {
    const activeLangs = getActiveLangs()
    const now = new Date().toISOString().split('T')[0]
    const products = getAll(`SELECT id, slug, name_en, updated_at, created_at FROM products WHERE status = 1 ORDER BY id DESC`)

    const urls = []
    for (const p of products) {
        const prodSlug = p.slug || p.id
        const prodPath = `/products/${prodSlug}`
        const lastmod = (p.updated_at || p.created_at || '').split(' ')[0] || now
        for (const l of activeLangs) {
            const loc = `${BASE_URL}/${l.code}${prodPath}`
            urls.push(urlEntry(loc, { lastmod, changefreq: 'weekly', priority: '0.8', hreflang: hreflangLinks(activeLangs, prodPath) }))
        }
    }

    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.send(wrapUrlset(urls))
})

// ── News sitemap (/sitemap-news.xml) ─────────────────────────────────────────
router.get('/news', (req, res) => {
    const activeLangs = getActiveLangs()
    const now = new Date().toISOString().split('T')[0]
    const newsArticles = getAll(`SELECT slug, id, title_en, updated_at FROM news WHERE status = 1 ORDER BY id DESC`)
    const newsCategories = getAll(`SELECT slug, name_en FROM news_categories ORDER BY sort_order, id`)

    const urls = []
    for (const nc of newsCategories) {
        const ncPath = `/news/category/${nc.slug}`
        for (const l of activeLangs) {
            const loc = `${BASE_URL}/${l.code}${ncPath}`
            urls.push(urlEntry(loc, { lastmod: now, changefreq: 'weekly', priority: '0.7', hreflang: hreflangLinks(activeLangs, ncPath) }))
        }
    }
    for (const n of newsArticles) {
        const slug = n.slug || n.id
        const newsPath = `/news/${slug}`
        const lastmod = (n.updated_at || '').split(' ')[0] || now
        for (const l of activeLangs) {
            const loc = `${BASE_URL}/${l.code}${newsPath}`
            urls.push(urlEntry(loc, { lastmod, changefreq: 'monthly', priority: '0.6', hreflang: hreflangLinks(activeLangs, newsPath) }))
        }
    }

    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.send(wrapUrlset(urls))
})

export default router
