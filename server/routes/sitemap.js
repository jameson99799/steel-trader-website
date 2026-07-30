import { Router } from 'express'
import { getAll, getOne } from '../db.js'
import { getVisibleCategoryIds, visibleProductWhere } from '../services/catalogVisibility.js'

const router = Router()

const BASE_URL = 'https://www.sunseasteel.com'

function visibleCategories() {
    const categories = getAll('SELECT id, parent_id, is_enabled FROM categories')
    return getVisibleCategoryIds(categories)
}

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

function getSeoSettings() {
    try { return getOne('SELECT * FROM seo_settings WHERE id = 1') || {} } catch(e){return {}}
}

function hreflangLinks(path, activeLangs, seoSettings = {}) {
    const enPath = `/en${path === '/' ? '' : path}`
    return activeLangs.map(l => {
        const code = (l.code || '').trim()
        let actualHreflang = code
        if (code === 'en' && seoSettings.hreflang_en) actualHreflang = seoSettings.hreflang_en
        if (code === 'zh' && seoSettings.hreflang_zh) actualHreflang = seoSettings.hreflang_zh
        const langPath = `/${code}${path === '/' ? '' : path}`
        return `    <xhtml:link rel="alternate" hreflang="${escapeXml(actualHreflang)}" href="${escapeXml(BASE_URL + langPath)}" />`
    }).concat([
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(BASE_URL + enPath)}" />`
    ]).join('\n')
}

function buildUrlset(urls) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>`
}

function emptyUrlset() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
</urlset>`
}

function urlEntry({ loc, lastmod, changefreq, priority, hreflang, imagesHTML = '' }) {
    return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${hreflang}
${imagesHTML}
  </url>`
}

// Parse date from either "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:..." ISO format
function toDateStr(val, fallback) {
    if (!val) return fallback
    return String(val).split(/[T ]/)[0] || fallback
}

// ── Sitemap Index (/sitemap.xml) ─────────────────────────────
router.get('/', (req, res) => {
    let lastProdDate = '2024-03-01'
    let lastNewsDate = '2024-03-01'
    try {
        const lp = getOne('SELECT COALESCE(updated_at, created_at) as d FROM products WHERE status=1 ORDER BY d DESC LIMIT 1')
        if (lp && lp.d) lastProdDate = toDateStr(lp.d, '2024-03-01')
        
        const ln = getOne('SELECT COALESCE(updated_at, created_at) as d FROM news WHERE status=1 ORDER BY d DESC LIMIT 1')
        if (ln && ln.d) lastNewsDate = toDateStr(ln.d, '2024-03-01')
        
        const lc = getOne('SELECT COALESCE(updated_at, created_at) as d FROM categories ORDER BY d DESC LIMIT 1')
        const lastCatDate = lc && lc.d ? toDateStr(lc.d, '2024-03-01') : '2024-03-01'
        const lastStaticDate = new Date().toISOString().split('T')[0] // Static always has futures changing today
    } catch(e) {}
    
    // Explicitly fallback if not set to prevent syntax issues
    const catDate = typeof lastCatDate !== 'undefined' ? lastCatDate : '2024-03-01'
    const statDate = typeof lastStaticDate !== 'undefined' ? lastStaticDate : '2024-03-01'
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap-static.xml</loc>
    <lastmod>${statDate}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-products.xml</loc>
    <lastmod>${lastProdDate}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-categories.xml</loc>
    <lastmod>${catDate}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-news.xml</loc>
    <lastmod>${lastNewsDate}</lastmod>
  </sitemap>
</sitemapindex>`
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.send(xml)
})

// ── Static pages sitemap ─────────────────────────────────────
router.get('/static', (req, res) => {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    try {
        const activeLangs = getActiveLangs()

        const staticPages = [
            { loc: '/', priority: '1.0', changefreq: 'weekly', lastmod: '2024-04-15' },
            { loc: '/products', priority: '0.9', changefreq: 'weekly', lastmod: '2024-04-10' },
            { loc: '/news', priority: '0.8', changefreq: 'weekly', lastmod: '2024-04-10' },
            { loc: '/factory', priority: '0.8', changefreq: 'weekly', lastmod: '2024-03-25' },
            { loc: '/about', priority: '0.7', changefreq: 'monthly', lastmod: '2024-03-01' },
            { loc: '/contact', priority: '0.7', changefreq: 'monthly', lastmod: '2024-03-01' },
            { loc: '/news/ral-colors', priority: '0.5', changefreq: 'yearly', lastmod: '2024-03-01' },
            { loc: '/news/roofing-profiles', priority: '0.7', changefreq: 'weekly', lastmod: '2024-04-01' },
            { loc: '/news/futures-price', priority: '0.8', changefreq: 'daily', lastmod: new Date().toISOString().split('T')[0] }, // Only futures price changes daily truly
        ]

        const seoSettings = getSeoSettings()
        const urls = []
        for (const p of staticPages) {
            for (const l of activeLangs) {
                const langPath = `/${l.code}${p.loc === '/' ? '' : p.loc}`
                urls.push(urlEntry({
                    loc: BASE_URL + langPath,
                    lastmod: p.lastmod,
                    changefreq: p.changefreq,
                    priority: p.priority,
                    hreflang: hreflangLinks(p.loc, activeLangs, seoSettings)
                }))
            }
        }

        res.send(buildUrlset(urls))
    } catch (e) {
        console.error('Static sitemap error:', e)
        res.status(500).send('Internal Server Error')
    }
})

// ── Categories sitemap ─────────────────────────────────────────
router.get('/categories', (req, res) => {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    try {
        const fallbackDate = '2024-03-01'
        const activeLangs = getActiveLangs()
        const seoSettings = getSeoSettings()
        const urls = []

        // Product categories
        const ids = visibleCategories()
        const categories = getAll(`SELECT id, slug, name_en, COALESCE(updated_at, created_at) as lastmod_date FROM categories ORDER BY sort_order, id`)
            .filter(category => ids.has(category.id))
        for (const c of categories) {
            const catSlug = c.slug || c.name_en?.toLowerCase().replace(/\\s+/g, '-') || c.id
            const locPath = `/products/category/${catSlug}`
            const lastmod = toDateStr(c.lastmod_date, fallbackDate)
            for (const l of activeLangs) {
                urls.push(urlEntry({
                    loc: BASE_URL + '/' + l.code + locPath,
                    lastmod,
                    changefreq: 'weekly',
                    priority: '0.9',
                    hreflang: hreflangLinks(locPath, activeLangs, seoSettings)
                }))
            }
        }

        // News categories
        const newsCategories = getAll(`SELECT id, slug, name_en, COALESCE(updated_at, created_at) as lastmod_date FROM news_categories ORDER BY sort_order, id`)
        for (const nc of newsCategories) {
            if (!nc.slug) continue
            const locPath = `/news/category/${nc.slug}`
            const lastmod = toDateStr(nc.lastmod_date, fallbackDate)
            for (const l of activeLangs) {
                urls.push(urlEntry({
                    loc: BASE_URL + '/' + l.code + locPath,
                    lastmod,
                    changefreq: 'weekly',
                    priority: '0.8',
                    hreflang: hreflangLinks(locPath, activeLangs, seoSettings)
                }))
            }
        }

        res.send(buildUrlset(urls))
    } catch (e) {
        console.error('Categories sitemap error:', e)
        res.status(500).send('Internal Server Error')
    }
})

// ── Products sitemap ─────────────────────────────────────────
router.get('/products', (req, res) => {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    try {
        const fallbackDate = '2024-03-01'
        const activeLangs = getActiveLangs()

        const visibility = visibleProductWhere('p', visibleCategories())
        // Primary: status=1 (active). Fallback: all products (handles non-standard status values)
        let products = getAll(`SELECT p.id, p.slug, p.name_en, p.name, p.images, COALESCE(p.updated_at, p.created_at) as lastmod_date FROM products p WHERE p.status = 1${visibility.clause} ORDER BY p.id DESC`, visibility.params)
        if (!products || products.length === 0) {
            products = getAll(`SELECT p.id, p.slug, p.name_en, p.name, p.images, COALESCE(p.updated_at, p.created_at) as lastmod_date FROM products p WHERE 1=1${visibility.clause} ORDER BY p.id DESC`, visibility.params)
            if (products && products.length > 0) {
                console.log(`[sitemap] WARN: No products with status=1 found; using all ${products.length} products as fallback`)
            }
        } else {
            console.log(`[sitemap] Products sitemap: ${products.length} products found`)
        }

        const urls = []
        const seoSettings = getSeoSettings()
        for (const p of products || []) {
            const prodSlug = p.slug || p.id
            const prodPath = `/products/${prodSlug}`
            const lastmod = toDateStr(p.lastmod_date, fallbackDate)
            
            for (const l of activeLangs) {
                let imagesHTML = ''
                if (p.images) {
                    const titleStr = p[`name_${l.code}`] || p.name_en || p.name || 'product'
                    const imgList = String(p.images).split(',').filter(Boolean).slice(0, 5) // Map up to 5 images per product
                    imagesHTML = imgList.map(img => {
                        const imgUrl = img.startsWith('http') ? img : BASE_URL + img
                        return `    <image:image>\n      <image:loc>${escapeXml(imgUrl)}</image:loc>\n      <image:title>${escapeXml(titleStr)}</image:title>\n    </image:image>`
                    }).join('\n')
                }
                
                urls.push(urlEntry({
                    loc: BASE_URL + '/' + l.code + prodPath,
                    lastmod,
                    changefreq: 'weekly',
                    priority: '0.8',
                    hreflang: hreflangLinks(prodPath, activeLangs, seoSettings),
                    imagesHTML
                }))
            }
        }

        res.send(buildUrlset(urls))
    } catch (e) {
        console.error('Products sitemap error:', e.message, e.stack)
        res.status(500).send('Internal Server Error')
    }
})

// ── News sitemap ─────────────────────────────────────────────
router.get('/news', (req, res) => {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    try {
        const fallbackDate = '2024-03-01'
        const activeLangs = getActiveLangs()
        const news = getAll(`SELECT slug, id, title_en, title, cover_image, COALESCE(updated_at, created_at) as lastmod_date FROM news WHERE status = 1 ORDER BY id DESC`)

        const seoSettings = getSeoSettings()
        const urls = []
        for (const n of news) {
            const slug = n.slug || n.id
            const newsPath = `/news/${slug}`
            const lastmod = toDateStr(n.lastmod_date, fallbackDate)
            
            for (const l of activeLangs) {
                let imagesHTML = ''
                if (n.cover_image) {
                    const titleStr = n[`title_${l.code}`] || n.title_en || n.title || 'news article'
                    const imgUrl = String(n.cover_image).startsWith('http') ? n.cover_image : BASE_URL + n.cover_image
                    imagesHTML = `    <image:image>\n      <image:loc>${escapeXml(imgUrl)}</image:loc>\n      <image:title>${escapeXml(titleStr)}</image:title>\n    </image:image>\n`
                }
                
                urls.push(urlEntry({
                    loc: BASE_URL + '/' + l.code + newsPath,
                    lastmod,
                    changefreq: 'monthly',
                    priority: '0.6',
                    hreflang: hreflangLinks(newsPath, activeLangs, seoSettings),
                    imagesHTML
                }))
            }
        }

        res.send(buildUrlset(urls))
    } catch (e) {
        console.error('News sitemap error:', e)
        res.status(500).send('Internal Server Error')
    }
})

export default router
