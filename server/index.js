import express from 'express'
import cors from 'cors'
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
import seoRoutes from './routes/seo.js'
import sitemapRoutes from './routes/sitemap.js'
import languagesRoutes from './routes/languages.js'
import translationRoutes from './routes/translation.js'
import sslRoutes from './routes/ssl.js'
import emailRoutes from './routes/email.js'
import indexingRoutes from './routes/indexing.js'
import aiRoutes from './routes/ai.js'
import mailerRoutes from './routes/mailer.js'
import externalApiRoutes from './routes/external-api.js'
import mediaRoutes from './routes/media.js'
import crmAuthRoutes from './routes/crm-auth.js'
import crmUsersRoutes from './routes/crm-users.js'
import crmCustomersRoutes from './routes/crm-customers.js'
import crmMailerRoutes from './routes/crm-mailer.js'

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

    // CORS 配置
    const corsOptions = {
      origin: NODE_ENV === 'production'
        ? process.env.ALLOWED_ORIGINS?.split(',') || '*'
        : '*',
      credentials: true
    }
    app.use(cors(corsOptions))

    // 请求体解析
    app.use(express.json({ limit: '10mb' }))
    app.use(express.urlencoded({ extended: true, limit: '10mb' }))
    // Allow large raw body for ZIP imports
    app.use('/api/crm/customers/import/zip', express.raw({ type: 'application/octet-stream', limit: '200mb' }))

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
    app.use('/api/news', newsRoutes)
    app.use('/api/seo', seoRoutes)
    // Sitemap (accessible as /sitemap.xml)
    app.use('/sitemap.xml', sitemapRoutes)
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
              pageTitle = product.seo_title || product.name_en || product.name || pageTitle
              pageDesc = product.seo_description || product.description_en || product.description || pageDesc
              pageKeywords = product.seo_keywords || pageKeywords
              ogType = 'product'
              const images = (product.images || '').split(',').filter(Boolean)
              if (images.length) pageImage = images[0].startsWith('http') ? images[0] : `${siteUrl}${images[0]}`

              const productSchema = {
                '@context': 'https://schema.org', '@type': 'Product',
                name: product.name_en || product.name,
                description: (product.seo_description || product.description_en || '').substring(0, 500),
                url: pageCanonical,
                brand: { '@type': 'Brand', name: companyName },
                manufacturer: { '@type': 'Organization', name: companyName }
              }
              if (images.length) productSchema.image = images.map(i => i.startsWith('http') ? i : `${siteUrl}${i}`)
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
            } else {
              // Product not found — return 404 status to prevent soft 404
              isNotFound = true
              pageTitle = 'Product Not Found | ' + companyName
              pageDesc = 'The requested product could not be found.'
            }
          }

          // ── News detail page ──
          const newsMatch = subPath.match(/^\/news\/(.+)$/)
          if (newsMatch) {
            const slug = newsMatch[1]
            let article = getOne('SELECT * FROM news WHERE slug=?', [slug])
            if (!article) {
              const idMatch = slug.match(/-(\d+)$/)
              if (idMatch) article = getOne('SELECT * FROM news WHERE id=?', [idMatch[1]])
            }
            if (article) {
              pageTitle = article.seo_title || article.title_en || article.title || pageTitle
              pageDesc = article.seo_description || article.summary_en || article.summary || pageDesc
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
            } else {
              // News article not found — return 404 status
              isNotFound = true
              pageTitle = 'Article Not Found | ' + companyName
              pageDesc = 'The requested article could not be found.'
            }
          }

          // ── Static pages ──
          if (subPath === '/products' || subPath === '/products/') {
            pageTitle = `Products | ${companyName}`
            pageDesc = `Browse our full range of steel products: Galvanized Steel Coil (GI), Galvalume (GL), PPGI, PPGL, CRC, and Corrugated Roofing Sheets. Factory direct pricing.`
          } else if (subPath === '/news' || subPath === '/news/') {
            pageTitle = `News & Industry Insights | ${companyName}`
            pageDesc = `Latest steel industry news, technical guides, and market analysis from ${companyName}.`
          } else if (subPath === '/about' || subPath === '/about/') {
            pageTitle = `About Us | ${companyName}`
            pageDesc = company.description_en || `Learn about ${companyName} — a professional steel coil manufacturer and exporter based in Shandong, China.`
          } else if (subPath === '/contact' || subPath === '/contact/') {
            pageTitle = `Contact Us | ${companyName}`
            pageDesc = `Get in touch with ${companyName}. Request a quote, ask product questions, or schedule a factory visit.`
          }

        // ── Global Organization schema (on every page) ──
        const orgSchema = {
          '@context': 'https://schema.org', '@type': 'Organization',
          name: companyName,
          url: siteUrl,
          logo: `${siteUrl}/uploads/logo.png`,
          description: (company.description_en || '').substring(0, 300),
          address: company.address_en || company.address || '',
          contactPoint: []
        }
        if (company.email) orgSchema.contactPoint.push({ '@type': 'ContactPoint', email: company.email, contactType: 'sales' })
        if (company.phone) orgSchema.contactPoint.push({ '@type': 'ContactPoint', telephone: company.phone, contactType: 'customer service' })
        if (company.facebook) orgSchema.sameAs = [company.facebook, company.linkedin, company.instagram, company.tiktok, company.twitter].filter(Boolean)
        extraSchemas += jsonLd(orgSchema)

        // ── Build hreflang tags ──
        let hreflangTags = ''
        try {
          const languages = getAll('SELECT code FROM languages WHERE is_active=1') || []
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
        const safeDesc = (pageDesc || '').substring(0, 200)
        const extraMeta = `
  <meta property="og:type" content="${esc(ogType)}" />
  <meta property="og:title" content="${esc(pageTitle)}" />
  <meta property="og:description" content="${esc(safeDesc)}" />
  <meta property="og:url" content="${esc(pageCanonical)}" />
  <meta property="og:site_name" content="${esc(companyName)}" />
  ${pageImage ? `<meta property="og:image" content="${esc(pageImage)}" />` : ''}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(pageTitle)}" />
  <meta name="twitter:description" content="${esc(safeDesc)}" />
  ${pageImage ? `<meta name="twitter:image" content="${esc(pageImage)}" />` : ''}
  ${hreflangTags}`

        // ── Replace meta tags in HTML ──
        html = html.replace(/<html\s+lang="[^"]*"/, `<html lang="${esc(lang)}"`)
        html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(pageTitle)}</title>`)
        html = html.replace(/<meta\s+name="description"\s+content="[^"]*"/, `<meta name="description" content="${esc(pageDesc)}"`)
        html = html.replace(/<meta\s+name="keywords"\s+content="[^"]*"/, `<meta name="keywords" content="${esc(pageKeywords)}"`)
        // Remove existing canonical if present, then add correct one via </head> injection
        html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/, '')
        const canonicalTag = `<link rel="canonical" href="${esc(pageCanonical)}">`
        html = html.replace('</head>', `${canonicalTag}\n  ${extraMeta}\n  ${extraSchemas}\n</head>`)

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
