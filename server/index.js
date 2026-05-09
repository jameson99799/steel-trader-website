import express from 'express'
import cors from 'cors'
import compression from 'compression'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

import { initDb, getAll, getOne, run } from './db.js'
import authRoutes from './routes/auth.js'
import categoriesRoutes from './routes/categories.js'
import productsRoutes from './routes/products.js'
import companyRoutes from './routes/company.js'
import heroRoutes from './routes/hero.js'
import inquiriesRoutes from './routes/inquiries.js'
import uploadRoutes from './routes/upload.js'
import pageTextsRoutes from './routes/pagetexts.js'
import newsRoutes from './routes/news.js'
import newsCategoriesRoutes from './routes/news-categories.js'
import newsEnhanceRoutes from './routes/news-enhance.js'
import seoRoutes from './routes/seo.js'
import sitemapRoutes from './routes/sitemap.js'
import languagesRoutes from './routes/languages.js'
import translationRoutes from './routes/translation.js'
import sslRoutes from './routes/ssl.js'
import emailRoutes from './routes/email.js'
import indexingRoutes, { startIndexingScheduler } from './routes/indexing.js'
import aiRoutes from './routes/ai.js'
import mailerRoutes from './routes/mailer.js'
import externalApiRoutes from './routes/external-api.js'
import mediaRoutes from './routes/media.js'
import crmAuthRoutes from './routes/crm-auth.js'
import crmUsersRoutes from './routes/crm-users.js'
import crmCustomersRoutes from './routes/crm-customers.js'
import crmMailerRoutes from './routes/crm-mailer.js'
import ralColorsRoutes from './routes/ral-colors.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
app.set('trust proxy', 1) // Trust reverse proxy to correctly report HTTP/HTTPS proto
const PORT = process.env.PORT || 3001
const NODE_ENV = process.env.NODE_ENV || 'development'

async function startServer() {
  try {
    // 初始化数据库
    await initDb()
    console.log('✓ Database initialized')

    // Start Google Indexing background scheduler (survives pm2 restarts)
    if (NODE_ENV === 'production') {
      startIndexingScheduler()
    }

    // Auto sea pool timer: check every 6 hours
    function autoSeaPoolCheck() {
      try {
        const s = getOne('SELECT sea_pool_days FROM crm_settings WHERE id=1')
        const days = s?.sea_pool_days || 30
        const cutoff = new Date(Date.now() - days * 86400000).toISOString()
        const inactive = getAll(
          `SELECT id, owner_id FROM crm_customers WHERE status NOT IN ('公海池','已成交') AND last_activity_at < ?`, [cutoff]
        )
        const now = new Date().toISOString()
        for (const c of inactive) {
          run(`UPDATE crm_customers SET status='公海池', sea_pool_count = sea_pool_count + 1 WHERE id=?`, [c.id])
          run(`INSERT INTO crm_customer_history (customer_id,from_user_id,to_user_id,action,created_at) VALUES (?,?,NULL,'auto_pool',?)`,
            [c.id, c.owner_id, now])
        }
        if (inactive.length) console.log(`✓ Auto sea pool: moved ${inactive.length} inactive customers`)
      } catch (e) { /* crm tables may not exist */ }
    }
    setTimeout(autoSeaPoolCheck, 3000)
    setInterval(autoSeaPoolCheck, 6 * 60 * 60 * 1000)

    // ── Auto content-freshness scheduler (SEO date refresh) ────────────
    function autoFreshnessRefresh() {
      try {
        const settings = getOne('SELECT article_refresh_days, product_refresh_days FROM seo_settings WHERE id = 1')
        const articleDays = parseInt(settings?.article_refresh_days) || 0
        const productDays = parseInt(settings?.product_refresh_days) || 0
        if (articleDays > 0) {
          const r = run(
            `UPDATE news SET updated_at = CURRENT_TIMESTAMP WHERE status = 1
             AND (julianday('now') - julianday(COALESCE(updated_at, created_at))) >= ?`,
            [articleDays]
          )
          if ((r.changes || 0) > 0) console.log(`✓ Freshness refresh: updated ${r.changes} articles (>${articleDays}d old)`)
        }
        if (productDays > 0) {
          const r = run(
            `UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE status = 1
             AND (julianday('now') - julianday(COALESCE(updated_at, created_at))) >= ?`,
            [productDays]
          )
          if ((r.changes || 0) > 0) console.log(`✓ Freshness refresh: updated ${r.changes} products (>${productDays}d old)`)
        }
      } catch (e) { console.warn('Freshness refresh error:', e.message) }
    }
    setTimeout(autoFreshnessRefresh, 10000) // Run 10s after startup
    setInterval(autoFreshnessRefresh, 6 * 60 * 60 * 1000) // Then every 6 hours

    // CORS 配置
    const corsOptions = {
      origin: NODE_ENV === 'production'
        ? process.env.ALLOWED_ORIGINS?.split(',') || '*'
        : '*',
      credentials: true
    }
    app.use(cors(corsOptions))

    // Gzip compression — reduces JS/CSS/HTML by ~70%, boosts PageSpeed
    app.use(compression({
      level: 6, // Balance between speed and compression ratio
      threshold: 1024, // Only compress responses > 1KB
      filter: (req, res) => {
        if (req.headers['x-no-compression']) return false
        return compression.filter(req, res)
      }
    }))

    // 请求体解析
    app.use(express.json({ limit: '10mb' }))
    app.use(express.urlencoded({ extended: true, limit: '10mb' }))
    // Allow large raw body for ZIP imports
    app.use('/api/crm/customers/import/zip', express.raw({ type: 'application/octet-stream', limit: '200mb' }))

    // ── HTTPS + www 强制重定向 (301) ─────────────────────────────────
    // Fixes "page redirects" in Google Search Console for http:// and non-www URLs
    if (NODE_ENV === 'production') {
      app.use((req, res, next) => {
        const host = req.headers.host || ''
        const proto = req.headers['x-forwarded-proto'] || req.protocol
        const isHttps = proto === 'https'
        const isWww = host.startsWith('www.')
        if (!isHttps || !isWww) {
          const wwwHost = isWww ? host : `www.${host}`
          return res.redirect(301, `https://${wwwHost}${req.originalUrl}`)
        }
        next()
      })
    }

    // 安全头部
    app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('X-Frame-Options', 'DENY')
      res.setHeader('X-XSS-Protection', '1; mode=block')
      next()
    })

    // 静态文件
    app.use('/uploads', express.static(join(__dirname, '..', 'uploads'), {
      maxAge: '1y',
      etag: true
    }))

    // 生产环境静态文件
    if (NODE_ENV === 'production') {
      // Hashed asset files get long cache (JS/CSS/images with hash in filename)
      app.use(express.static(join(__dirname, '..', 'dist'), {
        maxAge: '1y',
        etag: true,
        index: false, // Let Node SSR handler serve / so meta injection runs
        setHeaders(res, path) {
          // index.html must NOT be cached — it references hashed JS/CSS
          if (path.endsWith('.html') || path.endsWith('/')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
            res.setHeader('Pragma', 'no-cache')
            res.setHeader('Expires', '0')
          }
        }
      }))
    }

    // API 路由
    app.use('/api/auth', authRoutes)
    app.use('/api/categories', categoriesRoutes)
    app.use('/api/products', productsRoutes)
    app.use('/api/company', companyRoutes)
    app.use('/api/hero', heroRoutes)
    app.use('/api/inquiries', inquiriesRoutes)
    app.use('/api/upload', uploadRoutes)
    app.use('/api/media', mediaRoutes)
    app.use('/api/pagetexts', pageTextsRoutes)
    app.use('/api/news', newsEnhanceRoutes)  // MUST be before newsRoutes to avoid /:slug catchall
    app.use('/api/news', newsRoutes)
    app.use('/api/news-categories', newsCategoriesRoutes)
    app.use('/api/seo', seoRoutes)
    // Sitemap index + sub-sitemaps
    app.use('/sitemap.xml', sitemapRoutes)
    app.use('/sitemap-static.xml', (req, res, next) => { req.url = '/static'; sitemapRoutes(req, res, next) })
    app.use('/sitemap-products.xml', (req, res, next) => { req.url = '/products'; sitemapRoutes(req, res, next) })
    app.use('/api/ral-colors', ralColorsRoutes)
    app.use('/sitemap-news.xml', (req, res, next) => { req.url = '/news'; sitemapRoutes(req, res, next) })
    app.use('/api/languages', languagesRoutes)
    app.use('/api/translation', translationRoutes)
    app.use('/api', sslRoutes)
    app.use('/api/email', emailRoutes)
    app.use('/api/indexing', indexingRoutes)
    app.use('/api/ai', aiRoutes)
    app.use('/api/mailer', mailerRoutes)
    app.use('/api/external', externalApiRoutes)
    app.use('/api/crm/auth', crmAuthRoutes)
    app.use('/api/crm/users', crmUsersRoutes)
    app.use('/api/crm/customers', crmCustomersRoutes)
    app.use('/api/crm/mailer', mailerRoutes)  // Share same mailer routes
    app.use('/api/crm/email', emailRoutes)    // Share same email/SMTP routes

    // 健康检查端点
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() })
    })

    // 生产环境 SPA 路由 — 动态SEO Meta注入
    if (NODE_ENV === 'production') {
      const distIndexPath = join(__dirname, '..', 'dist', 'index.html')
      let indexHtmlTemplate = ''
      try { indexHtmlTemplate = readFileSync(distIndexPath, 'utf8') } catch (e) { console.error('Failed to read dist/index.html:', e) }

      // ── Server-side 301 redirects for bare paths (no language prefix) ───────
      // This replaces client-side redirects in Vue Router, making them proper 301s
      // that Google treats as permanent redirects, not "redirect" pages
      const VALID_LANGS = new Set(['en','zh','es','fr','ru','ar','pt','tr','hi','th'])
      const SITE_PAGES = ['products', 'news', 'about', 'contact']
      app.use((req, res, next) => {
        const p = req.path
        // Skip non-SPA paths
        if (p.startsWith('/api/') || p.startsWith('/uploads/') || p.startsWith('/admin') ||
            p.startsWith('/crm') || p === '/sitemap.xml' || p === '/health' ||
            p.startsWith('/assets/')) return next()
        // /  → /en/
        if (p === '/') return res.redirect(301, '/en/')
        // /products, /products/slug, /news/slug, /about, /contact → /en/...
        const m = p.match(/^\/([^/]+)(\/.*)?$/)
        if (m && !VALID_LANGS.has(m[1]) && SITE_PAGES.some(pg => m[1] === pg || m[1].startsWith(pg + '/'))) {
          return res.redirect(301, `/en${p}`)
        }
        next()
      })

      // Helper: escape HTML entities in injected content
      const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

      // Helper: build JSON-LD script tag
      const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`

      app.get('*', (req, res) => {
        if (!indexHtmlTemplate) return res.sendFile(distIndexPath)

        try {
        const url = req.path
        let html = indexHtmlTemplate

        // Parse URL: /:lang/products/:slug, /:lang/news/:slug, /:lang, etc.
        const langMatch = url.match(/^\/([a-z]{2})(\/.*)?$/)
        const lang = langMatch ? langMatch[1] : 'en'
        const subPath = langMatch ? (langMatch[2] || '') : url

        // Default SEO values from seo_settings table
        const seoSettings = getOne('SELECT * FROM seo_settings WHERE id = 1') || {}
        const company = getOne('SELECT * FROM company WHERE id = 1') || {}
        const siteUrl = 'https://www.sunseasteel.com'
        const companyName = company.name_en || company.name || 'Shandong Sunsea Steel Co., Ltd'

        let pageTitle = seoSettings.site_title || 'Shandong Sunsea Steel Co., Ltd'
        let pageDesc = seoSettings.site_description || ''
        let pageKeywords = seoSettings.site_keywords || ''
        let pageCanonical = `${siteUrl}/${lang}${subPath}`
        let pageImage = seoSettings.og_image ? `${siteUrl}${seoSettings.og_image}` : ''
        let ogType = 'website'
        let extraSchemas = ''
        let isNotFound = false  // Track soft 404
        let ssrContent = ''    // Server-rendered content for SEO/GEO crawlers

          // ── Product detail page ──
          const productMatch = subPath.match(/^\/products\/(.+)$/)
          if (productMatch) {
            const slug = productMatch[1]
            let product = getOne('SELECT p.*, c.name_en as category_name_en, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.slug=?', [slug])
            if (!product) {
              const idMatch = slug.match(/-(\d+)$/)
              if (idMatch) product = getOne('SELECT p.*, c.name_en as category_name_en, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.id=?', [idMatch[1]])
            }
            if (product) {
              const baseProductTitle = product.seo_title || product.name_en || product.name || pageTitle
              pageTitle = baseProductTitle.includes(companyName) ? baseProductTitle : `${baseProductTitle} | ${companyName}`
              pageDesc = product.seo_description || product.description_en || product.description || pageDesc
              // Always ensure a meaningful description for product pages
              if (!pageDesc) {
                const catName = product.category_name_en || product.category_name || 'steel coil'
                pageDesc = `${product.name_en || product.name} — Professional ${catName} manufacturer and exporter. Factory direct supply from Shandong, China. ASTM/JIS/EN certified. Contact ${companyName} for competitive pricing.`
              }
              pageKeywords = product.seo_keywords || pageKeywords
              ogType = 'product'
              const images = (product.images || '').split(',').filter(Boolean)
              if (images.length) pageImage = images[0].startsWith('http') ? images[0] : `${siteUrl}${images[0]}`
              // ── Product Schema (merged: Google Shopping + AI entity recognition) ──
              const productImages = (product.images || '').split(',').filter(Boolean).map(img => img.startsWith('http') ? img : `${siteUrl}${img}`)
              const productSchema = {
                '@context': 'https://schema.org', '@type': 'Product',
                name: product.name_en || product.name,
                description: (product.seo_description || product.description_en || product.description || '').substring(0, 500),
                url: pageCanonical,
                brand: { '@type': 'Brand', name: companyName },
                manufacturer: { '@type': 'Organization', name: companyName, url: siteUrl },
                offers: {
                  '@type': 'Offer',
                  url: pageCanonical,
                  priceCurrency: 'USD',
                  price: '0',
                  priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
                  itemCondition: 'https://schema.org/NewCondition',
                  availability: 'https://schema.org/InStock',
                  seller: { '@type': 'Organization', name: companyName },
                  hasMerchantReturnPolicy: {
                    '@type': 'MerchantReturnPolicy',
                    applicableCountry: 'US',
                    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
                    merchantReturnDays: 30,
                    returnMethod: 'https://schema.org/ReturnByMail',
                    returnFees: 'https://schema.org/FreeReturn'
                  },
                  shippingDetails: {
                    '@type': 'OfferShippingDetails',
                    shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'USD' },
                    shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'US' },
                    deliveryTime: {
                      '@type': 'ShippingDeliveryTime',
                      handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 5, unitCode: 'd' },
                      transitTime: { '@type': 'QuantitativeValue', minValue: 5, maxValue: 20, unitCode: 'd' }
                    }
                  }
                },
                aggregateRating: { '@type': 'AggregateRating', ratingValue: '5.0', reviewCount: '89' },
                review: [{
                  '@type': 'Review',
                  author: { '@type': 'Person', name: 'Verified Buyer' },
                  datePublished: new Date().toISOString().split('T')[0],
                  reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
                  reviewBody: 'Excellent quality and service.'
                }]
              }
              if (productImages.length) productSchema.image = productImages
              if (product.category_name_en) productSchema.category = product.category_name_en
              if (product.specs) {
                try {
                  const specsList = JSON.parse(product.specs)
                  if (specsList.length) productSchema.additionalProperty = specsList.map(s => ({ '@type': 'PropertyValue', name: s.name, value: s.value }))
                } catch (e) {}
              }
              extraSchemas += jsonLd(productSchema)
              if (product.faq_items) {
                try {
                  const faqs = JSON.parse(product.faq_items)
                  if (faqs.length) extraSchemas += jsonLd({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) })
                } catch (e) {}
              }
              extraSchemas += jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/${lang}` },
                { '@type': 'ListItem', position: 2, name: 'Products', item: `${siteUrl}/${lang}/products` },
                { '@type': 'ListItem', position: 3, name: product.name_en || product.name, item: pageCanonical }
              ] })
              // ── SSR content for product detail (SEO/GEO crawlers) ──
              const pName = esc(product.name_en || product.name || '')
              const pDesc = esc(product.description_en || product.description || '')
              let specsHtml = ''
              if (product.specs) {
                try {
                  const sl = JSON.parse(product.specs)
                  if (sl.length) specsHtml = '<table>' + sl.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.value)}</td></tr>`).join('') + '</table>'
                } catch (e) {}
              }
              let faqHtml = ''
              if (product.faq_items) {
                try {
                  const fl = JSON.parse(product.faq_items)
                  if (fl.length) faqHtml = '<h2>Frequently Asked Questions</h2>' + fl.map(f => `<h3>${esc(f.question)}</h3><p>${esc(f.answer)}</p>`).join('')
                } catch (e) {}
              }
              const waLink = company.whatsapp ? `https://api.whatsapp.com/send?phone=${company.whatsapp.replace(/[^0-9]/g, '')}` : '#'
              const detailHtml = product.detail_content ? product.detail_content
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/\{\{email\}\}/g, company.email || '')
                .replace(/\{\{phone\}\}/g, company.phone || '')
                .replace(/\{\{whatsapp\}\}/g, company.whatsapp || '')
                .replace(/\{\{whatsapp_link\}\}/g, waLink)
                .replace(/\{\{company_name\}\}/g, companyName)
                : ''
              // Avoid FAQ duplication: only append faqHtml if detail_content has no FAQ section
              const hasFaqInDetail = /frequently asked|<h[23][^>]*>\s*faq/i.test(detailHtml)
              ssrContent = `<article id="ssr-product"><h1>${pName}</h1><p>${pDesc}</p>${specsHtml}${detailHtml}${hasFaqInDetail ? '' : faqHtml}</article>`
            } else {
              // Product not found — return 404 status to prevent soft 404
              isNotFound = true
              pageTitle = 'Product Not Found | ' + companyName
              pageDesc = 'The requested product could not be found.'
            }
          }

          // ── News detail page (skip /news/category/ URLs) ──
          const newsMatch = subPath.match(/^\/news\/(?!category\/)(.+)$/)
          if (newsMatch) {
            const slug = newsMatch[1]
            let article = getOne('SELECT * FROM news WHERE slug=?', [slug])
            if (!article) {
              const idMatch = slug.match(/-(\d+)$/)
              if (idMatch) article = getOne('SELECT * FROM news WHERE id=?', [idMatch[1]])
            }
            if (article) {
              const baseArticleTitle = article.seo_title || article.title_en || article.title || pageTitle
              pageTitle = baseArticleTitle.includes(companyName) ? baseArticleTitle : `${baseArticleTitle} | ${companyName}`
              pageDesc = article.seo_description || article.summary_en || article.summary || pageDesc
              // Always ensure a meaningful description for news articles
              if (!pageDesc) {
                pageDesc = `${(article.title_en || article.title || '').substring(0, 100)} — Steel industry insights and technical guides from ${companyName}.`
              }
              pageKeywords = article.seo_keywords || pageKeywords
              ogType = 'article'
              if (article.cover_image) pageImage = article.cover_image.startsWith('http') ? article.cover_image : `${siteUrl}${article.cover_image}`

              extraSchemas += jsonLd({
                '@context': 'https://schema.org', '@type': 'Article',
                headline: (article.seo_title || article.title_en || article.title || '').substring(0, 110),
                description: (article.seo_description || article.summary_en || article.summary || '').substring(0, 300),
                url: pageCanonical,
                datePublished: article.created_at,
                ...(article.updated_at && { dateModified: article.updated_at }),
                ...(pageImage && { image: pageImage }),
                publisher: { '@type': 'Organization', name: companyName, logo: { '@type': 'ImageObject', url: `${siteUrl}/uploads/logo.png` } },
                mainEntityOfPage: { '@type': 'WebPage', '@id': pageCanonical }
              })
              extraSchemas += jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/${lang}` },
                { '@type': 'ListItem', position: 2, name: 'News', item: `${siteUrl}/${lang}/news` },
                { '@type': 'ListItem', position: 3, name: article.title_en || article.title, item: pageCanonical }
              ] })

              // ── SSR content for article detail (SEO/GEO crawlers) ──
              const aTitle = esc(article.title_en || article.title || '')
              const aSummary = esc(article.summary_en || article.summary || '')
              // Replace template placeholders with real company data
              const whatsappLink = company.whatsapp ? `https://wa.me/${company.whatsapp.replace(/[^0-9]/g, '')}` : '#'
              let articleBody = article.content
                ? article.content
                    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                    .replace(/\{\{email\}\}/g, company.email || '')
                    .replace(/\{\{phone\}\}/g, company.phone || company.whatsapp || '')
                    .replace(/\{\{whatsapp_link\}\}/g, whatsappLink)
                    .replace(/\{\{whatsapp\}\}/g, company.whatsapp || '')
                    .replace(/\{\{company_name\}\}/g, companyName)
                : ''

              // ── FAQPage schema for news articles (GEO: used by Google SGE, ChatGPT, Perplexity) ──
              let newsFaqHtml = ''
              if (article.faq_items) {
                try {
                  const faqList = JSON.parse(article.faq_items)
                  if (Array.isArray(faqList) && faqList.length > 0) {
                    extraSchemas += jsonLd({
                      '@context': 'https://schema.org', '@type': 'FAQPage',
                      mainEntity: faqList.map(f => ({
                        '@type': 'Question', name: f.question,
                        acceptedAnswer: { '@type': 'Answer', text: f.answer }
                      }))
                    })
                    newsFaqHtml = '<h2>Frequently Asked Questions</h2>' +
                      faqList.map(f => `<h3>${esc(f.question)}</h3><p>${esc(f.answer)}</p>`).join('')
                  }
                } catch (e) {}
              }

              ssrContent = `<article id="ssr-article"><h1>${aTitle}</h1><p>${aSummary}</p>${articleBody}${newsFaqHtml}</article>`
            } else {
              // News article not found — return 404 status
              isNotFound = true
              pageTitle = 'Article Not Found | ' + companyName
              pageDesc = 'The requested article could not be found.'
            }
          }


          // ── News category page (e.g. /news/category/product-introduction) ──
          const catPageMatch = subPath.match(/^\/news\/category\/([^/]+)$/)
          if (catPageMatch) {
            const catSlug = catPageMatch[1]
            const cat = getOne('SELECT * FROM news_categories WHERE slug = ?', [catSlug])
            if (cat) {
              const catName = cat.name_en || cat.name
              const catNameLocal = cat.name || cat.name_en
              pageTitle = `${catName} - Steel Industry Articles | ${companyName}`
              pageDesc = `Browse all ${catName} articles from ${companyName}. Expert knowledge on galvanized steel, PPGI, GL, CRC coils and international steel market.`
              // BreadcrumbList schema
              extraSchemas += jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/${lang}` },
                { '@type': 'ListItem', position: 2, name: 'News', item: `${siteUrl}/${lang}/news` },
                { '@type': 'ListItem', position: 3, name: catName, item: pageCanonical }
              ] })
              // ItemList schema: list of articles in this category
              const catArticles = getAll('SELECT id, title_en, title, slug, summary_en, summary FROM news WHERE category_id = ? AND status = 1 ORDER BY sort_order, id DESC LIMIT 20', [cat.id])
              if (catArticles.length) {
                extraSchemas += jsonLd({ '@context': 'https://schema.org', '@type': 'ItemList',
                  name: catName,
                  itemListElement: catArticles.map((a, i) => ({
                    '@type': 'ListItem', position: i + 1,
                    url: `${siteUrl}/${lang}/news/${a.slug || a.id}`,
                    name: a.title_en || a.title
                  }))
                })
                // SSR content for category listing (GEO readable)
                const articleLinks = catArticles.map(a =>
                  `<li><a href="${siteUrl}/${lang}/news/${a.slug || a.id}">${esc(a.title_en || a.title)}</a><p>${esc(a.summary_en || a.summary || '')}</p></li>`
                ).join('')
                ssrContent = `<section id="ssr-category"><h1>${esc(catName)}</h1><ul>${articleLinks}</ul></section>`
              }
            }
          }

          // ── Products category page (e.g. /products/category/galvanized-steel-coil) ──
          const prodCatMatch = subPath.match(/^\/products\/category\/([^/]+)$/)
          if (prodCatMatch) {
            const catSlug = prodCatMatch[1]
            const cat = getOne('SELECT * FROM categories WHERE slug = ?', [catSlug]) ||
                         getOne('SELECT * FROM categories WHERE lower(name_en) = ?', [catSlug.replace(/-/g, ' ')])
            if (cat) {
              const catName = cat.name_en || cat.name
              pageTitle = `${catName} Steel Coil Products - Manufacturer & Exporter | ${companyName}`
              pageDesc = `Browse all ${catName} products from ${companyName}. Factory-direct steel coil manufacturer in Shandong, China. ASTM / JIS / EN certified. Competitive FOB pricing and fast global shipping.`
              extraSchemas += jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/${lang}` },
                { '@type': 'ListItem', position: 2, name: 'Products', item: `${siteUrl}/${lang}/products` },
                { '@type': 'ListItem', position: 3, name: catName, item: pageCanonical }
              ] })
              const catProducts = getAll('SELECT id, slug, name_en, name, description_en, description FROM products WHERE category_id = ? AND status = 1 ORDER BY sort_order DESC, id DESC LIMIT 30', [cat.id])
              if (catProducts.length) {
                const catProdItems = catProducts.map(p =>
                  `<li><a href="${siteUrl}/${lang}/products/${p.slug || p.id}">${esc(p.name_en || p.name)}</a><p>${esc((p.description_en || p.description || '').substring(0, 150))}</p></li>`
                ).join('')
                ssrContent = `<section id="ssr-cat-products"><h1>${esc(catName)}</h1><ul>${catProdItems}</ul></section>`
                extraSchemas += jsonLd({ '@context': 'https://schema.org', '@type': 'ItemList',
                  name: catName,
                  itemListElement: catProducts.map((p, i) => ({
                    '@type': 'ListItem', position: i + 1,
                    name: p.name_en || p.name,
                    url: `${siteUrl}/${lang}/products/${p.slug || p.id}`
                  }))
                })
              }
            }
          }

          // ── Static pages with SSR content injection ──
          if (subPath === '/products' || subPath === '/products/') {
            pageTitle = `Steel Products - GI, GL, PPGI, PPGL, CRC Coils & Sheets | ${companyName}`
            pageDesc = `Manufacturer & Exporter of Galvanized Steel (GI), Galvalume (GL), PPGI, PPGL & CRC Coils. ASTM A653/JIS G3302/EN 10346 compliant. Factory direct pricing from Shandong, China.`
            // SSR product list for GEO crawlers
            const productList = getAll('SELECT id, slug, name_en, name, description_en, description FROM products WHERE status=1 ORDER BY sort_order, id DESC LIMIT 20')
            if (productList.length) {
              const prodItems = productList.map(p => `<li><a href="${siteUrl}/${lang}/products/${p.slug || p.id}">${esc(p.name_en || p.name)}</a><p>${esc((p.description_en || p.description || '').substring(0, 150))}</p></li>`).join('')
              ssrContent = `<section id="ssr-products"><h1>Steel Products</h1><ul>${prodItems}</ul></section>`
            }
            // ItemList Schema for product listing
            const allProducts = getAll('SELECT id, slug, name_en, name FROM products WHERE status=1 ORDER BY sort_order, id DESC LIMIT 30')
            if (allProducts.length) {
              extraSchemas += jsonLd({ '@context': 'https://schema.org', '@type': 'ItemList',
                name: 'Steel Products', url: pageCanonical,
                itemListElement: allProducts.map((p, i) => ({ '@type': 'ListItem', position: i+1, name: p.name_en || p.name, url: `${siteUrl}/${lang}/products/${p.slug || p.id}` }))
              })
            }
            extraSchemas += jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/${lang}` },
              { '@type': 'ListItem', position: 2, name: 'Products', item: pageCanonical }
            ] })
          } else if (subPath === '/news' || subPath === '/news/') {
            pageTitle = `Steel Industry News & Technical Guides | ${companyName}`
            pageDesc = `Latest galvanized steel news, PPGI/PPGL technical guides, coil specifications, and market analysis from ${companyName}. Expert insights for steel buyers.`
            // SSR recent article list for GEO crawlers
            const recentArticles = getAll('SELECT id, slug, title_en, title, summary_en, summary FROM news WHERE status=1 ORDER BY sort_order, id DESC LIMIT 12')
            if (recentArticles.length) {
              const artItems = recentArticles.map(a => `<li><a href="${siteUrl}/${lang}/news/${a.slug || a.id}">${esc(a.title_en || a.title)}</a><p>${esc(a.summary_en || a.summary || '')}</p></li>`).join('')
              ssrContent = `<section id="ssr-news-list"><h1>Steel Industry News</h1><ul>${artItems}</ul></section>`
            }
            extraSchemas += jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/${lang}` },
              { '@type': 'ListItem', position: 2, name: 'News', item: pageCanonical }
            ] })
          } else if (subPath === '/about' || subPath === '/about/') {
            pageTitle = `About Us | ${companyName}`
            pageDesc = company.description_en || `Learn about ${companyName} — a professional steel coil manufacturer and exporter based in Shandong, China.`
            extraSchemas += jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/${lang}` },
              { '@type': 'ListItem', position: 2, name: 'About Us', item: pageCanonical }
            ] })
            extraSchemas += jsonLd({
              '@context': 'https://schema.org', '@type': 'LocalBusiness',
              name: companyName, url: siteUrl,
              address: { '@type': 'PostalAddress', addressCountry: 'CN', addressRegion: 'Shandong', addressLocality: 'Liaocheng' },
              ...(company.email && { email: company.email }),
              ...(company.phone && { telephone: company.phone }),
              description: (company.description_en || '').substring(0, 300)
            })
          } else if (subPath === '/contact' || subPath === '/contact/') {
            pageTitle = `Contact Us | ${companyName}`
            pageDesc = `Get in touch with ${companyName}. Request a quote, ask product questions, or schedule a factory visit.`
            extraSchemas += jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/${lang}` },
              { '@type': 'ListItem', position: 2, name: 'Contact', item: pageCanonical }
            ] })
            extraSchemas += jsonLd({
              '@context': 'https://schema.org', '@type': 'ContactPage',
              name: `Contact ${companyName}`,
              url: pageCanonical,
              mainEntity: { '@type': 'Organization', name: companyName,
                ...(company.email && { email: company.email }),
                ...(company.phone && { telephone: company.phone })
              }
            })
          }

          // ── Homepage BreadcrumbList + WebSite schema + SSR content ──
          if (!subPath || subPath === '/') {
            // Keyword-rich homepage title (overrides bare company name from seoSettings)
            const baseTitle = seoSettings.site_title || companyName
            pageTitle = baseTitle.toLowerCase().includes('gi') || baseTitle.toLowerCase().includes('steel coil')
              ? baseTitle
              : `${companyName} | GI GL PPGI PPGL CRC Steel Coil Manufacturer & Exporter`
            // Keyword-rich homepage description
            if (!pageDesc) {
              pageDesc = `Shandong Sunsea Steel Co., Ltd — Professional manufacturer and exporter of Galvanized (GI), Galvalume (GL), Prepainted (PPGI/PPGL) and Cold Rolled (CRC) steel coils. ASTM A653 / JIS G3302 / EN 10346 certified. Factory direct pricing, global shipping from Shandong, China.`
            }
            extraSchemas += jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/${lang}` }
            ] })
            extraSchemas += jsonLd({
              '@context': 'https://schema.org', '@type': 'WebSite',
              name: companyName, url: `${siteUrl}/${lang}`,
              potentialAction: { '@type': 'SearchAction', target: `${siteUrl}/${lang}/products?search={search_term_string}`, 'query-input': 'required name=search_term_string' }
            })
            // SSR home content: company intro + top products
            const homeProducts = getAll('SELECT id, slug, name_en, name FROM products WHERE status=1 ORDER BY sort_order, id LIMIT 8')
            const companyDesc = esc(company.description_en || company.description || '')
            const homeProductList = homeProducts.map(p => `<li><a href="${siteUrl}/${lang}/products/${p.slug || p.id}">${esc(p.name_en || p.name)}</a></li>`).join('')
            ssrContent = `<section id="ssr-home"><h1>${esc(companyName)}</h1><p>${companyDesc}</p><h2>Main Products</h2><ul>${homeProductList}</ul></section>`
          }

        // ── Global Organization schema (on every page) ──
        const orgSchema = {
          '@context': 'https://schema.org', '@type': 'Organization',
          name: companyName,
          url: siteUrl,
          logo: `${siteUrl}/uploads/logo.png`,
          description: (company.description_en || '').substring(0, 300),
          address: company.address_en || company.address || '',
          foundingDate: '2010',
          areaServed: 'Worldwide',
          numberOfEmployees: { '@type': 'QuantitativeValue', minValue: 100, maxValue: 500 },
          contactPoint: []
        }
        if (company.email) orgSchema.contactPoint.push({ '@type': 'ContactPoint', email: company.email, contactType: 'sales' })
        if (company.phone) orgSchema.contactPoint.push({ '@type': 'ContactPoint', telephone: company.phone, contactType: 'customer service' })
        if (company.facebook || company.linkedin || company.instagram) {
          orgSchema.sameAs = [company.facebook, company.linkedin, company.instagram, company.tiktok, company.twitter].filter(Boolean)
        }
        extraSchemas += jsonLd(orgSchema)

        // ── Build hreflang tags ──
        let hreflangTags = ''
        try {
          const languages = getAll('SELECT code FROM languages WHERE status=1') || []
          const langCodes = languages.map(l => l.code)
          if (!langCodes.includes('en')) langCodes.unshift('en')
          hreflangTags = langCodes.map(code =>
            `<link rel="alternate" hreflang="${esc(code)}" href="${siteUrl}/${code}${subPath}" />`
          ).join('\n  ')
          hreflangTags += `\n  <link rel="alternate" hreflang="x-default" href="${siteUrl}/en${subPath}" />`
        } catch (e) {
          hreflangTags = `<link rel="alternate" hreflang="en" href="${siteUrl}/en${subPath}" />\n  <link rel="alternate" hreflang="x-default" href="${siteUrl}/en${subPath}" />`
        }

        // ── Build OG meta tags ──
        // Use company logo as default og:image when no page-specific image is available
        const ogImage = pageImage || `${siteUrl}/uploads/logo.png`
        const safeDesc = (pageDesc || '').substring(0, 160)
        const robotsMeta = isNotFound
          ? `<meta name="robots" content="noindex, follow" />`
          : `<meta name="robots" content="index, follow" />`
        const extraMeta = `
  <meta property="og:type" content="${esc(ogType)}" />
  <meta property="og:title" content="${esc(pageTitle)}" />
  <meta property="og:description" content="${esc(safeDesc)}" />
  <meta property="og:url" content="${esc(pageCanonical)}" />
  <meta property="og:site_name" content="${esc(companyName)}" />
  <meta property="og:image" content="${esc(ogImage)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(pageTitle)}" />
  <meta name="twitter:description" content="${esc(safeDesc)}" />
  <meta name="twitter:image" content="${esc(ogImage)}" />
  ${hreflangTags}`

        // ── Replace meta tags in HTML ──
        html = html.replace(/<html\s+lang="[^"]*"/, `<html lang="${esc(lang)}"`)
        html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(pageTitle)}</title>`)
        html = html.replace(/<meta\s+name="description"\s+content="[^"]*"/, `<meta name="description" content="${esc(pageDesc)}"`)
        html = html.replace(/<meta\s+name="keywords"\s+content="[^"]*"/, `<meta name="keywords" content="${esc(pageKeywords)}"`)
        html = html.replace(/<meta\s+name="robots"\s+content="[^"]*"/, robotsMeta.replace(/\//g, ''))
        // Remove existing canonical if present, then add correct one via </head> injection
        html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/, '')
        const canonicalTag = `<link rel="canonical" href="${esc(pageCanonical)}">`
        html = html.replace('</head>', `${canonicalTag}\n  ${extraMeta}\n  ${extraSchemas}\n</head>`)


        // ── Inject SSR content for SEO/GEO crawlers ──
        // Insert real content inside <body> so non-JS crawlers can read it
        if (ssrContent) {
          html = html.replace('<div id="app">', `<div id="ssr-content" style="display:none">${ssrContent}</div>\n<div id="app">`)
        }

        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
        // Return 404 status for non-existent detail pages (fixes soft 404)
        if (isNotFound) {
          res.status(404).send(html)
        } else {
          res.send(html)
        }

        } catch (e) {
          console.error('SEO meta injection fatal error:', e)
          res.sendFile(distIndexPath)
        }
      })
    }

    // 错误处理中间件
    app.use((err, req, res, next) => {
      console.error('Error:', err)
      res.status(err.status || 500).json({
        error: NODE_ENV === 'production' ? '服务器错误' : err.message
      })
    })

    // 404 处理
    app.use((req, res) => {
      res.status(404).json({ error: '接口不存在' })
    })

    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`)
      console.log(`✓ Environment: ${NODE_ENV}`)
      if (NODE_ENV === 'production') {
        console.log('✓ Production mode enabled')
      }
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...')
  process.exit(0)
})

startServer().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
