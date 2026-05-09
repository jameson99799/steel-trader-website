import { Router } from 'express'
import { getAll } from '../db.js'

const router = Router()

const BASE_URL = 'https://www.sunseasteel.com'

function escapeXml(str) {
    if (!str) return ''
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

function getActiveLangs() {
    try {
        const langs = getAll(`SELECT code FROM languages WHERE status = 1 ORDER BY code`)
        if (langs && langs.length) return langs
    } catch {}
    return [{ code: 'en' }]
}

function hreflangLinks(path, activeLangs) {
    const enPath = `/en${path === '/' ? '' : path}`
    return activeLangs.map(l => {
        const code = (l.code || '').trim()
        const langPath = `/${code}${path === '/' ? '' : path}`
        return `    <xhtml:link rel="alternate" hreflang="${escapeXml(code)}" href="${escapeXml(BASE_URL + langPath)}" />`
    }).concat([
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(BASE_URL + enPath)}" />`
    ]).join('\n')
}

function buildUrlset(urls) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`
}

function emptyUrlset() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
</urlset>`
}

function urlEntry({ loc, lastmod, changefreq, priority, hreflang }) {
    return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${hreflang}
  </url>`
}

// Parse date from either "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:..." ISO format
function toDateStr(val, fallback) {
    if (!val) return fallback
    return String(val).split(/[T ]/)[0] || fallback
}

// ── Sitemap Index (/sitemap.xml) ─────────────────────────────
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

// ── Static pages sitemap ─────────────────────────────────────
router.get('/static', (req, res) => {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    try {
        const now = new Date().toISOString().split('T')[0]
        const activeLangs = getActiveLangs()

        const staticPages = [
            { loc: '/', priority: '1.0', changefreq: 'daily' },
            { loc: '/products', priority: '0.9', changefreq: 'daily' },
            { loc: '/news', priority: '0.8', changefreq: 'daily' },
            { loc: '/about', priority: '0.7', changefreq: 'monthly' },
            { loc: '/contact', priority: '0.7', changefreq: 'monthly' },
            { loc: '/ral-colors', priority: '0.5', changefreq: 'yearly' },
        ]

        // Category pages — path-based, no query params
        const categories = getAll(`SELECT id, slug, name_en FROM categories ORDER BY sort_order, id`)
        for (const c of categories) {
            const catSlug = c.slug || c.name_en?.toLowerCase().replace(/\s+/g, '-') || c.id
            staticPages.push({ loc: `/products/category/${catSlug}`, priority: '0.7', changefreq: 'weekly' })
        }

        const newsCategories = getAll(`SELECT slug, name_en FROM news_categories ORDER BY sort_order, id`)
        for (const nc of newsCategories) {
            if (nc.slug) staticPages.push({ loc: `/news/category/${nc.slug}`, priority: '0.7', changefreq: 'weekly' })
        }

        const urls = []
        for (const p of staticPages) {
            for (const l of activeLangs) {
                const langPath = `/${l.code}${p.loc === '/' ? '' : p.loc}`
                urls.push(urlEntry({
                    loc: BASE_URL + langPath,
                    lastmod: now,
                    changefreq: p.changefreq,
                    priority: p.priority,
                    hreflang: hreflangLinks(p.loc, activeLangs)
                }))
            }
        }

        res.send(buildUrlset(urls))
    } catch (e) {
        console.error('Static sitemap error:', e)
        res.send(emptyUrlset())
    }
})

// ── Products sitemap ─────────────────────────────────────────
router.get('/products', (req, res) => {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    try {
        const now = new Date().toISOString().split('T')[0]
        const activeLangs = getActiveLangs()

        // Primary: status=1 (active). Fallback: all products (handles non-standard status values)
        let products = getAll(`SELECT id, slug, name_en, created_at FROM products WHERE status = 1 ORDER BY id DESC`)
        if (!products || products.length === 0) {
            products = getAll(`SELECT id, slug, name_en, created_at FROM products ORDER BY id DESC`)
            if (products && products.length > 0) {
                console.log(`[sitemap] WARN: No products with status=1 found; using all ${products.length} products as fallback`)
            }
        } else {
            console.log(`[sitemap] Products sitemap: ${products.length} products found`)
        }

        const urls = []
        for (const p of products || []) {
            const prodSlug = p.slug || p.id
            const prodPath = `/products/${prodSlug}`
            const lastmod = toDateStr(p.created_at, now)
            for (const l of activeLangs) {
                urls.push(urlEntry({
                    loc: BASE_URL + '/' + l.code + prodPath,
                    lastmod,
                    changefreq: 'weekly',
                    priority: '0.8',
                    hreflang: hreflangLinks(prodPath, activeLangs)
                }))
            }
        }

        res.send(buildUrlset(urls))
    } catch (e) {
        console.error('Products sitemap error:', e.message, e.stack)
        res.send(emptyUrlset())
    }
})

// ── News sitemap ─────────────────────────────────────────────
router.get('/news', (req, res) => {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    try {
        const now = new Date().toISOString().split('T')[0]
        const activeLangs = getActiveLangs()
        const news = getAll(`SELECT slug, id, title_en, created_at FROM news WHERE status = 1 ORDER BY id DESC`)

        const urls = []
        for (const n of news) {
            const slug = n.slug || n.id
            const newsPath = `/news/${slug}`
            const lastmod = toDateStr(n.created_at, now)
            for (const l of activeLangs) {
                urls.push(urlEntry({
                    loc: BASE_URL + '/' + l.code + newsPath,
                    lastmod,
                    changefreq: 'monthly',
                    priority: '0.6',
                    hreflang: hreflangLinks(newsPath, activeLangs)
                }))
            }
        }

        res.send(buildUrlset(urls))
    } catch (e) {
        console.error('News sitemap error:', e)
        res.send(emptyUrlset())
    }
})

export default router
