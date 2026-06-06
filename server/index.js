import express from 'express'
import 'express-async-errors'
import cors from 'cors'
import compression from 'compression'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, existsSync, unlinkSync, readdirSync } from 'fs'
import sharp from 'sharp'

import { initDb, getAll, getOne, run } from './db.js'
import { loadTranslationsForLang, translateProduct, translateNews, translateCompany } from './helpers/translate.js'
import authRoutes from './routes/auth.js'
import securityRoutes from './routes/security.js'
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
import translationRoutes, { processTranslationQueue } from './routes/translation.js'
import translationJobsRoutes, { resetStaleJobs } from './routes/translation-jobs.js'
import sslRoutes from './routes/ssl.js'
import emailRoutes from './routes/email.js'
import { checkAndSendSslWarning } from './emailService.js'
import indexingRoutes, { startIndexingScheduler } from './routes/indexing.js'
import aiRoutes from './routes/ai.js'
import aiAutoPostRoutes from './routes/ai-auto-post.js'
import mailerRoutes from './routes/mailer.js'
import externalApiRoutes from './routes/external-api.js'
import backupRoutes from './routes/backup.js'
import mediaRoutes from './routes/media.js'
import crmAuthRoutes from './routes/crm-auth.js'
import crmUsersRoutes from './routes/crm-users.js'
import crmCustomersRoutes from './routes/crm-customers.js'
import crmMailerRoutes from './routes/crm-mailer.js'
import ralColorsRoutes from './routes/ral-colors.js'
import roofingProfilesRoutes from './routes/roofing-profiles.js'
import factoryRoutes from './routes/factory.js'
import futuresRoutes from './routes/futures.js'
import chatRoutes from './routes/chat.js'

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
    resetStaleJobs() // Reset any translation jobs stuck in 'running' from previous crash
    try {
      processTranslationQueue()
      console.log('✓ Background translation queue worker started')
    } catch (e) {
      console.error('Failed to start translation worker:', e)
    }

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

    // ── SSL Expiry Email Warning Scheduler ──────────────────────────
    function autoSslWarningCheck() {
      checkAndSendSslWarning().catch(e => console.warn('SSL warning check error:', e.message))
    }
    setTimeout(autoSslWarningCheck, 15000) // Run 15s after startup
    setInterval(autoSslWarningCheck, 12 * 60 * 60 * 1000) // Then check every 12 hours

    // ── One-time cleanup of corrupt files on server start ──────────────
    try {
      const corruptFiles = ['1772267763272-657208953.jpg', '1774495865285-160388171.jpg']
      for (const file of corruptFiles) {
        const filePath = join(__dirname, '..', 'uploads', file)
        if (existsSync(filePath)) {
          unlinkSync(filePath)
          console.log(`[Cleanup] Deleted corrupted image file: ${file}`)
        }
      }
    } catch (e) {
      console.warn('Cleanup error:', e.message)
    }

    // ── One-time cleanup of replacing placeholder image texts ────────────
    try {
      const allProducts = getAll('SELECT id, detail_content FROM products')
      for (const p of allProducts) {
        let changed = false
        const updates = {}
        for (const k of ['detail_content']) {
          if (p[k] && p[k].includes('替换图')) {
            updates[k] = p[k].replace(/<span[^>]*class=["\']?(hero-tip|replace-tip)["\']?[^>]*>.*?替换图提示.*?<\/span>/ig, '')
                             .replace(/👉 替换图提示：.*?(<\/p>|<br>|\n|$)/ig, '$1')
            changed = true
          }
        }
        if (changed) {
          const upCols = Object.keys(updates)
          run(`UPDATE products SET ${upCols.map(c => `${c}=?`).join(', ')} WHERE id=?`, [...upCols.map(c => updates[c]), p.id])
          console.log(`[Cleanup] Fixed placeholder texts for product ID ${p.id}`)
        }
      }
    } catch (e) {
      console.warn('Placeholder cleanup error:', e.message)
    }

    // CORS 配置
    const corsOptions = {
      origin: NODE_ENV === 'production'
        ? process.env.ALLOWED_ORIGINS?.split(',') || '*'
        : '*',
      credentials: true
    }
    app.use(cors(corsOptions))

    // HTTPS redirect removed to prevent proxy loops

    // ── Security Firewalls ──────────────────────────────────────────────────
    app.use(helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    }))

    app.use((req, res, next) => {
      const blocked = getOne("SELECT * FROM blocked_ips WHERE ip = ? AND blocked_until > datetime('now')", [req.ip])
      if (blocked) return res.status(403).json({ error: 'Your IP has been blocked.', reason: blocked.reason, blocked_until: blocked.blocked_until })
      next()
    })

    const loginLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: (req, res) => {
        const settings = getOne('SELECT login_max_attempts FROM security_settings WHERE id = 1')
        return settings ? settings.login_max_attempts : 5
      },
      handler: (req, res) => {
        const settings = getOne('SELECT login_block_minutes FROM security_settings WHERE id = 1') || { login_block_minutes: 15 }
        run("INSERT OR REPLACE INTO blocked_ips (ip, reason, blocked_until) VALUES (?, ?, datetime('now', '+' || ? || ' minutes'))", [req.ip, 'Too many failed login attempts', settings.login_block_minutes])
        res.status(429).json({ error: 'Too many login attempts. Your IP has been temporarily blocked.' })
      }
    })
    
    app.use('/api/admin/login', loginLimiter)
    app.use('/api/crm/auth/login', loginLimiter)

    const inquiryLimiter = rateLimit({
      windowMs: 60 * 60 * 1000,
      max: (req, res) => {
        const settings = getOne('SELECT inquiry_max_per_hour FROM security_settings WHERE id = 1')
        return settings ? settings.inquiry_max_per_hour : 10
      },
      handler: (req, res) => res.status(429).json({ error: 'Too many inquiries per hour.' })
    })

    app.use('/api/inquiries', (req, res, next) => {
      if (req.method === 'POST') {
        return inquiryLimiter(req, res, next)
      }
      next()
    })
    // ────────────────────────────────────────────────────────────────────────


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
        
        // Skip redirects for API requests, health checks, IP address hosts, and localhost
        const isApiOrHealth = req.path.startsWith('/api/') || req.path === '/health'
        const isIpOrLocal = /^(localhost|127\.0\.0\.1|::1|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/i.test(host)
        
        if (isApiOrHealth || isIpOrLocal) {
          return next()
        }

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

    // Dynamic favicon serving to auto-generate and serve favicon files from company database settings
    const FAVICON_SIZES = {
      'favicon.ico': 32,
      'favicon-32.png': 32,
      'favicon-16.png': 16,
      'favicon-192.png': 192,
      'apple-touch-icon.png': 180
    }
    app.get('/:file(favicon\\.ico|favicon-32\\.png|favicon-16\\.png|favicon-192\\.png|apple-touch-icon\\.png)', async (req, res) => {
      const filename = req.params.file
      const size = FAVICON_SIZES[filename]
      
      try {
        const company = getOne('SELECT favicon, logo FROM company WHERE id = 1')
        let sourcePath = ''
        if (company) {
          const faviconPath = company.favicon || company.logo
          if (faviconPath) {
            const cleanPath = join(__dirname, '..', faviconPath.replace(/^\//, ''))
            if (existsSync(cleanPath)) {
              sourcePath = cleanPath
            }
          }
        }
        
        // Fallback: search uploads/ for any image
        if (!sourcePath) {
          const uploadsDir = join(__dirname, '..', 'uploads')
          if (existsSync(uploadsDir)) {
            const files = readdirSync(uploadsDir).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
            if (files.length) {
              sourcePath = join(uploadsDir, files[0])
            }
          }
        }
        
        if (!sourcePath) {
          return res.status(404).send('Not Found')
        }
        
        res.setHeader('Content-Type', filename.endsWith('.ico') ? 'image/x-icon' : 'image/png')
        res.setHeader('Cache-Control', 'public, max-age=86400') // Cache for 1 day
        
        const buffer = await sharp(sourcePath)
          .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
          .png()
          .toBuffer()
        return res.send(buffer)
      } catch (e) {
        console.error('Favicon serving error:', e)
        return res.status(404).send('Not Found')
      }
    })

    // 静态文件
    app.use('/uploads', express.static(join(__dirname, '..', 'uploads'), {
      maxAge: '1y',
      etag: true,
      setHeaders: (res, path) => {
        // Security: Prevent Stored XSS by forcing non-image files to download instead of executing in-browser
        if (!/\\.(jpg|jpeg|png|webp|gif|svg|ico)$/i.test(path)) {
          res.setHeader('Content-Disposition', 'attachment')
        }
      }
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
    app.use('/api/admin/security', securityRoutes)
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
    app.use('/sitemap-categories.xml', (req, res, next) => { req.url = '/categories'; sitemapRoutes(req, res, next) })
    app.use('/api/ral-colors', ralColorsRoutes)
    app.use('/api/roofing-profiles', roofingProfilesRoutes)
    app.use('/api/factory', factoryRoutes)
    app.use('/api/futures', futuresRoutes)
    app.use('/sitemap-news.xml', (req, res, next) => { req.url = '/news'; sitemapRoutes(req, res, next) })
    app.use('/api/languages', languagesRoutes)
    app.use('/api/translation', translationRoutes)
    app.use('/api/translation-jobs', translationJobsRoutes)
    app.use('/api', sslRoutes)
    app.use('/api/email', emailRoutes)
    app.use('/api/indexing', indexingRoutes)
    app.use('/api/ai', aiRoutes)
    app.use('/api/ai-auto-post', aiAutoPostRoutes)
    app.use('/api/mailer', mailerRoutes)
    app.use('/api/external', externalApiRoutes)
    app.use('/api/backup', backupRoutes)
    app.use('/api/crm/auth', crmAuthRoutes)
    app.use('/api/crm/users', crmUsersRoutes)
    app.use('/api/crm/customers', crmCustomersRoutes)
    app.use('/api/crm/mailer', mailerRoutes)  // Share same mailer routes
    app.use('/api/crm/email', emailRoutes)    // Share same email/SMTP routes
    app.use('/api/chat', chatRoutes)

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
      const SITE_PAGES = ['products', 'news', 'about', 'contact', 'factory', 'ral-colors', 'roofing-profiles']
      app.use((req, res, next) => {
        const p = req.path
        // Skip non-SPA paths
        if (p.startsWith('/api/') || p.startsWith('/uploads/') || p.startsWith('/admin') ||
            p.startsWith('/crm') || p.endsWith('.xml') || p === '/health' ||
            p.startsWith('/assets/')) return next()

        // ── Strict Trailing Slash Normalization ──
        // Permanent 301 redirect to version without trailing slash
        // Fixes Google Search Console "Duplicate without user-selected canonical"
        if (p.length > 1 && p.endsWith('/')) {
          const qs = req.url.slice(req.path.length)
          return res.redirect(301, p.slice(0, -1) + qs)
        }

        // /  → /en
        if (p === '/') return res.redirect(301, '/en')
        // /products, /products/slug, /news/slug, /about, /contact → /en/...
        const m = p.match(/^\/([^/]+)(\/.*)?$/)
        if (m && !VALID_LANGS.has(m[1]) && SITE_PAGES.some(pg => m[1] === pg || m[1].startsWith(pg + '/'))) {
          const qs = req.url.slice(req.path.length)
          return res.redirect(301, `/en${p}${qs}`)
        }
        next()
      })

      // Helper: escape HTML entities in injected content
      const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

      // Helper: build JSON-LD script tag
      const jsonLd = (obj, idStr = '') => `<script type="application/ld+json"${idStr ? ` id="${idStr}"` : ''}>${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`

      // Ensure robots.txt always serves text/plain, even if dist/robots.txt is missing
      app.get('/robots.txt', (req, res) => {
        try {
          const seo = getOne('SELECT robots_txt FROM seo_settings WHERE id = 1')
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          let robotsTxt = (seo && seo.robots_txt) ? seo.robots_txt : 'User-agent: *\nAllow: /\n'
          if (!robotsTxt.toLowerCase().includes('sitemap:')) {
            robotsTxt += '\nSitemap: https://www.sunseasteel.com/sitemap.xml\n'
          }
          return res.send(robotsTxt.trim() + '\n')
        } catch (e) {}
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.send('User-agent: *\nAllow: /\nSitemap: https://www.sunseasteel.com/sitemap.xml\n')
      })

      app.get('*', (req, res) => {
        // Fast-fail for missing static assets to prevent heavy SSR fallback
        if (req.path.match(/\.(js|css|ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|mp4|webm|pdf)$/)) {
          return res.status(404).send('Not Found')
        }
        
        if (!indexHtmlTemplate) return res.sendFile(distIndexPath)

        try {
        const url = req.path
        let html = indexHtmlTemplate

        // Parse URL: /:lang/products/:slug, /:lang/news/:slug, /:lang, etc.
        const langMatch = url.match(/^\/([a-z]{2})(\/.*)?$/)
        const lang = langMatch ? langMatch[1] : 'en'
        const subPath = langMatch ? (langMatch[2] || '') : url

        // 301 Redirect old standalone paths to tabbed /news/ paths
        if (subPath === '/ral-colors' || subPath === '/ral-colors/') {
          return res.redirect(301, `/${lang}/news/ral-colors`)
        }
        if (subPath === '/roofing-profiles' || subPath === '/roofing-profiles/') {
          return res.redirect(301, `/${lang}/news/roofing-profiles`)
        }

        // Default SEO values from seo_settings table
        const seoSettings = getOne('SELECT * FROM seo_settings WHERE id = 1') || {}
        const company = getOne('SELECT * FROM company WHERE id = 1') || {}
        const siteUrl = 'https://www.sunseasteel.com'
        const companyName = company.name_en || company.name || 'Shandong Sunsea Steel Co., Ltd'
        
        // Translation helpers for SSR GEO SEO
        const tMap = lang !== 'en' ? loadTranslationsForLang(lang) : null
        if (company && tMap) {
          translateCompany(company, tMap, lang)
        }
        
        function formatSsrMailtoLinks(html, defaultEmail) {
          if (!html) return html
          return html.replace(/href=(['"])([^'"]+)\1/gi, (match, quote, href) => {
            let email = ''
            if (href.startsWith('mailto:')) {
              return match
            } else if (href.includes('@') && !href.includes('/') && !href.toLowerCase().startsWith('http')) {
              email = href.trim()
            } else {
              return match
            }
            return `href=${quote}mailto:${email}${quote}`
          })
        }
        
        function getSeoTrans(type, id, lang) {
          if (lang === 'en') return {}
          try {
            const rowTitle = getOne('SELECT translated_text FROM translations WHERE content_type=? AND content_id=? AND content_field=? AND language_code=?', [type, id, 'seo_title', lang])
            const rowDesc = getOne('SELECT translated_text FROM translations WHERE content_type=? AND content_id=? AND content_field=? AND language_code=?', [type, id, 'seo_description', lang])
            const rowKeywords = getOne('SELECT translated_text FROM translations WHERE content_type=? AND content_id=? AND content_field=? AND language_code=?', [type, id, 'seo_keywords', lang])
            return {
              seo_title: rowTitle ? rowTitle.translated_text : null,
              seo_description: rowDesc ? rowDesc.translated_text : null,
              seo_keywords: rowKeywords ? rowKeywords.translated_text : null
            }
          } catch(e) {}
          return {}
        }
        const companyNameTranslated = company.name || companyName
        const companyDescTranslated = company[`description_${lang}`] || company.description_en || company.description || ''

        let pageTitle = seoSettings.site_title || 'Shandong Sunsea Steel Co., Ltd'
        let pageDesc = seoSettings.site_description || ''
        let pageKeywords = seoSettings.site_keywords || ''
        let pageCanonical = `${siteUrl}/${lang}${subPath}`
        let pageImage = seoSettings.og_image ? `${siteUrl}${seoSettings.og_image}` : ''
        let ogType = 'website'
        let extraSchemas = ''
        let isNotFound = false  // Track soft 404
        
        const orgType = seoSettings.local_business_type || 'Organization'
        let matchedRoute = false
        let ssrContent = ''    // Server-rendered content for SEO/GEO crawlers

          // ── Product detail page ──
          const productMatch = subPath.match(/^\/products\/(?!category\/)(.+)$/)
          if (productMatch) {
            matchedRoute = true
            const slug = productMatch[1]
            let product = getOne('SELECT p.*, c.name_en as category_name_en, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.slug=? AND p.status=1', [slug])
            if (!product) {
              const idMatch = slug.match(/-(\d+)$/)
              if (idMatch) product = getOne('SELECT p.*, c.name_en as category_name_en, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.id=? AND p.status=1', [idMatch[1]])
            }
            if (product) {
              // Redirect mismatched slugs (Soft 404 / duplicate fix)
              if (product.slug !== slug) {
                const correctPath = lang === 'en' ? `/products/${product.slug}` : `/${lang}/products/${product.slug}`
                return res.redirect(301, correctPath)
              }

              if (tMap) {
                translateProduct(product, tMap, lang)
              }
              const seoT = getSeoTrans('product', product.id, lang)
              const pName = product[`name_${lang}`] || product.name_en || product.name || ''
              const pDesc = product[`description_${lang}`] || product.description_en || product.description || ''

              const baseProductTitle = seoT.seo_title || product.seo_title || pName || pageTitle
              pageTitle = baseProductTitle.includes(companyNameTranslated) ? baseProductTitle : `${baseProductTitle} | ${companyNameTranslated}`
              pageDesc = seoT.seo_description || product.seo_description || pDesc || pageDesc
              // Always ensure a meaningful description for product pages
              if (!pageDesc) {
                const catName = product[`category_name_${lang}`] || product.category_name_en || product.category_name || 'steel coil'
                pageDesc = `${pName} — Professional ${catName} manufacturer and exporter. Factory direct supply from Shandong, China. ASTM/JIS/EN certified. Contact ${companyNameTranslated} for competitive pricing.`
              }
              pageKeywords = seoT.seo_keywords || product.seo_keywords || pageKeywords
              ogType = 'product'
              const images = (product.images || '').split(',').filter(Boolean)
              if (images.length) pageImage = images[0].startsWith('http') ? images[0] : `${siteUrl}${images[0]}`
              // ── Product Schema (merged: Google Shopping + AI entity recognition) ──
              const productImages = (product.images || '').split(',').filter(Boolean).map(img => img.startsWith('http') ? img : `${siteUrl}${img}`)
              const productSchema = {
                '@context': 'https://schema.org', '@type': 'Product',
                name: pName,
                description: (pageDesc).substring(0, 500),
                url: pageCanonical,
                brand: { '@type': 'Brand', name: companyNameTranslated },
                manufacturer: { '@type': orgType, name: companyNameTranslated, url: siteUrl },
                offers: {
                  '@type': 'Offer',
                  url: pageCanonical,
                  priceCurrency: 'USD',
                  price: '0',
                  priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
                  itemCondition: 'https://schema.org/NewCondition',
                  availability: 'https://schema.org/InStock',
                  seller: { '@type': orgType, name: companyName },
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
              if (product.category_name_en) productSchema.category = product[`category_name_${lang}`] || product.category_name_en
              const specsJson = product[`specs_${lang}`] || product.specs
              if (specsJson) {
                try {
                  const specsList = JSON.parse(specsJson)
                  if (specsList.length) productSchema.additionalProperty = specsList.map(s => ({ '@type': 'PropertyValue', name: s.name, value: s.value }))
                } catch (e) {}
              }
              extraSchemas += jsonLd(productSchema, 'product-jsonld')
              const faqJson = product[`faq_items_${lang}`] || product.faq_items
              if (faqJson) {
                try {
                  const faqs = JSON.parse(faqJson)
                  if (faqs.length) extraSchemas += jsonLd({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) }, 'faq-jsonld')
                } catch (e) {}
              }
              extraSchemas += jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/${lang}` },
                { '@type': 'ListItem', position: 2, name: 'Products', item: `${siteUrl}/${lang}/products` },
                { '@type': 'ListItem', position: 3, name: pName, item: pageCanonical }
              ] })
              // ── SSR content for product detail (SEO/GEO crawlers) ──
              const escPName = esc(pName)
              const escPDesc = esc(pDesc)
              let specsHtml = ''
              if (specsJson) {
                try {
                  const sl = JSON.parse(specsJson)
                  if (sl.length) specsHtml = '<table>' + sl.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.value)}</td></tr>`).join('') + '</table>'
                } catch (e) {}
              }
              let faqHtml = ''
              if (faqJson) {
                try {
                  const fl = JSON.parse(faqJson)
                  if (fl.length) faqHtml = '<h2>Frequently Asked Questions</h2>' + fl.map(f => `<h3>${esc(f.question)}</h3><p>${esc(f.answer)}</p>`).join('')
                } catch (e) {}
              }
              const waLink = company.whatsapp ? `https://api.whatsapp.com/send?phone=${company.whatsapp.replace(/[^0-9]/g, '')}` : '#'
              const rawDetail = product[`detail_content_${lang}`] || product.detail_content || ''
              let detailHtml = rawDetail
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/\{\{email\}\}/g, company.email || '')
                .replace(/\{\{phone\}\}/g, company.phone || '')
                .replace(/\{\{whatsapp\}\}/g, company.whatsapp || '')
                .replace(/\{\{whatsapp_link\}\}/g, waLink)
                .replace(/\{\{company_name\}\}/g, companyNameTranslated)
              detailHtml = formatSsrMailtoLinks(detailHtml, company.email || '')
              // Avoid FAQ duplication: only append faqHtml if detail_content has no FAQ section
              const hasFaqInDetail = /frequently asked|<h[23][^>]*>\\s*faq/i.test(detailHtml)
              const ssrFeaturedImage = productImages.length ? `<img src="${esc(productImages[0])}" alt="${escPName}" style="display:none;" />` : ''
              
              // Internal linking for GEO crawler topic clusters
              let relatedHtml = ''
              const relatedProducts = getAll('SELECT id, slug, name_en, name FROM products WHERE category_id=? AND id!=? AND status=1 LIMIT 5', [product.category_id, product.id])
              if (relatedProducts.length) {
                relatedHtml = '<h2>Related Products</h2><ul>' + relatedProducts.map(rp => {
                  if (tMap) translateProduct(rp, tMap, lang)
                  const rpName = rp[`name_${lang}`] || rp.name_en || rp.name
                  return `<li><a href="${siteUrl}/${lang}/products/${rp.slug || rp.id}">${esc(rpName)}</a></li>`
                }).join('') + '</ul>'
              }
              
              ssrContent = `<article id="ssr-product">${ssrFeaturedImage}<h1>${escPName}</h1><p>${escPDesc}</p>${specsHtml}${detailHtml}${hasFaqInDetail ? '' : faqHtml}${relatedHtml}</article>`
              
              // Expose ssrData for client-side Vue hydration
              req.ssrProduct = product
            } else {
              // Product not found — return 404 status to prevent soft 404
              isNotFound = true
              pageTitle = 'Product Not Found | ' + companyName
              pageDesc = 'The requested product could not be found.'
            }
          }

          // ── News detail page (skip /news/category/ and static /news/ URLs) ──
          const newsMatch = subPath.match(/^\/news\/(?!category\/|ral-colors\/?$|roofing-profiles\/?$|futures-price\/?$)(.+)$/)
          if (newsMatch) {
            matchedRoute = true
            const slug = newsMatch[1]
            let article = getOne('SELECT * FROM news WHERE slug=? AND status=1', [slug])
            if (!article) {
              const idMatch = slug.match(/-(\d+)$/)
              if (idMatch) article = getOne('SELECT * FROM news WHERE id=? AND status=1', [idMatch[1]])
            }
            if (article) {
              // Redirect mismatched slugs (Soft 404 / duplicate fix)
              if (article.slug !== slug) {
                const correctPath = lang === 'en' ? `/news/${article.slug}` : `/${lang}/news/${article.slug}`
                return res.redirect(301, correctPath)
              }

              if (tMap) {
                translateNews(article, tMap, lang)
              }
              const seoT = getSeoTrans('news', article.id, lang)
              const aTitle = article[`title_${lang}`] || article.title_en || article.title || ''
              const aSummary = article[`summary_${lang}`] || article.summary_en || article.summary || ''

              const baseArticleTitle = seoT.seo_title || article.seo_title || aTitle || pageTitle
              pageTitle = baseArticleTitle.includes(companyNameTranslated) ? baseArticleTitle : `${baseArticleTitle} | ${companyNameTranslated}`
              pageDesc = seoT.seo_description || article.seo_description || aSummary || pageDesc
              // Always ensure a meaningful description for news articles
              if (!pageDesc) {
                pageDesc = `${(aTitle).substring(0, 100)} — Steel industry insights and technical guides from ${companyNameTranslated}.`
              }
              pageKeywords = seoT.seo_keywords || article.seo_keywords || pageKeywords
              ogType = 'article'
              if (article.cover_image) pageImage = article.cover_image.startsWith('http') ? article.cover_image : `${siteUrl}${article.cover_image}`

              extraSchemas += jsonLd({
                '@context': 'https://schema.org', '@type': 'Article',
                headline: (baseArticleTitle).substring(0, 110),
                description: (pageDesc).substring(0, 300),
                url: pageCanonical,
                datePublished: article.created_at,
                ...(article.updated_at && { dateModified: article.updated_at }),
                ...(pageImage && { image: pageImage }),
                ...(seoSettings.default_news_author && { author: { '@type': 'Person', name: seoSettings.default_news_author } }),
                publisher: { '@type': orgType, name: companyNameTranslated, logo: { '@type': 'ImageObject', url: `${siteUrl}/uploads/logo.png` } },
                mainEntityOfPage: { '@type': 'WebPage', '@id': pageCanonical }
              }, 'article-jsonld')
              extraSchemas += jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/${lang}` },
                { '@type': 'ListItem', position: 2, name: 'News', item: `${siteUrl}/${lang}/news` },
                { '@type': 'ListItem', position: 3, name: aTitle, item: pageCanonical }
              ] })

              // ── SSR content for article detail (SEO/GEO crawlers) ──
              const escATitle = esc(aTitle)
              const escASummary = esc(aSummary)
              // Replace template placeholders with real company data
              const whatsappLink = company.whatsapp ? `https://wa.me/${company.whatsapp.replace(/[^0-9]/g, '')}` : '#'
              const rawContent = article[`content_${lang}`] || article.content || ''
              let articleBody = rawContent
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/\{\{email\}\}/g, company.email || '')
                .replace(/\{\{phone\}\}/g, company.phone || company.whatsapp || '')
                .replace(/\{\{whatsapp_link\}\}/g, whatsappLink)
                .replace(/\{\{whatsapp\}\}/g, company.whatsapp || '')
                .replace(/\{\{company_name\}\}/g, companyNameTranslated)
              
              articleBody = formatSsrMailtoLinks(articleBody, company.email || '')

              // ── FAQPage schema for news articles (GEO: used by Google SGE, ChatGPT, Perplexity) ──
              let newsFaqHtml = ''
              const faqJson = article[`faq_items_${lang}`] || article.faq_items
              if (faqJson) {
                try {
                  const faqList = JSON.parse(faqJson)
                  if (Array.isArray(faqList) && faqList.length > 0) {
                    extraSchemas += jsonLd({
                      '@context': 'https://schema.org', '@type': 'FAQPage',
                      mainEntity: faqList.map(f => ({
                        '@type': 'Question', name: f.question,
                        acceptedAnswer: { '@type': 'Answer', text: f.answer }
                      }))
                    }, 'faq-jsonld')
                    newsFaqHtml = '<h2>Frequently Asked Questions</h2>' +
                      faqList.map(f => `<h3>${esc(f.question)}</h3><p>${esc(f.answer)}</p>`).join('')
                  }
                } catch (e) {}
              }
              const ssrFeaturedImgNews = pageImage ? `<img src="${esc(pageImage)}" alt="${escATitle}" style="display:none;" />` : ''
              ssrContent = `<article id="ssr-article">${ssrFeaturedImgNews}<h1>${escATitle}</h1><p class="summary">${escASummary}</p><div class="content">${articleBody}</div>${newsFaqHtml}</article>`
              
              // Expose ssrData for client-side Vue hydration
              req.ssrArticle = article
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
            matchedRoute = true
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
            } else {
              isNotFound = true
              pageTitle = 'Category Not Found | ' + companyName
              pageDesc = 'The requested category could not be found.'
            }
          }

          // ── Products category page (e.g. /products/category/galvanized-steel-coil) ──
          const prodCatMatch = subPath.match(/^\/products\/category\/([^/]+)$/)
          if (prodCatMatch) {
            matchedRoute = true
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
                  `<li><a href="${siteUrl}/${lang}/products/${p.slug || p.id}">${esc(p.name_en || p.name)}</a><p>${esc((p.description_en || p.description || '').substring(0, 150).replace(/\\s+\\S*$/, '...'))}</p></li>`
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
            } else {
              isNotFound = true
              pageTitle = 'Category Not Found | ' + companyName
              pageDesc = 'The requested category could not be found.'
            }
          }

          // ── Static pages with SSR content injection ──
          if (subPath === '/products' || subPath === '/products/') {
            matchedRoute = true
            pageTitle = `Steel Products - GI, GL, PPGI, PPGL, CRC Coils & Sheets | ${companyName}`
            pageDesc = `Manufacturer & Exporter of Galvanized Steel (GI), Galvalume (GL), PPGI, PPGL & CRC Coils. ASTM A653/JIS G3302/EN 10346 compliant. Factory direct pricing from Shandong, China.`
            // SSR product list for GEO crawlers
            const productList = getAll('SELECT id, slug, name_en, name, description_en, description FROM products WHERE status=1 ORDER BY sort_order, id DESC LIMIT 20')
            if (productList.length) {
              const prodItems = productList.map(p => `<li><a href="${siteUrl}/${lang}/products/${p.slug || p.id}">${esc(p.name_en || p.name)}</a><p>${esc((p.description_en || p.description || '').substring(0, 150).replace(/\\s+\\S*$/, '...'))}</p></li>`).join('')
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
            matchedRoute = true
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
            matchedRoute = true
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
            // Fully render About page content for GEO AI crawlers
            ssrContent = `<article id="ssr-about"><h1>About ${esc(companyNameTranslated)}</h1><p>${esc(company.description_en || company.description || '')}</p><h2>Company Information</h2><ul><li><strong>Company Name:</strong> ${esc(company.name_en || company.name)}</li><li><strong>Headquarters:</strong> ${esc(company.address_en || company.address)}</li><li><strong>Email:</strong> ${esc(company.email)}</li><li><strong>Phone:</strong> ${esc(company.phone)}</li></ul><h2>Global Export Manufacturer</h2><p>As a leading supplier in China, we specialize in manufacturing galvanized (GI), galvalume (GL), prepainted galvanized (PPGI), prepainted galvalume (PPGL), and cold rolled (CRC) steel coils. Our advanced production lines ensure strict quality control and international certifications.</p></article>`
          } else if (subPath === '/contact' || subPath === '/contact/') {
            matchedRoute = true
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
              mainEntity: { '@type': orgType, name: companyName,
                ...(company.email && { email: company.email }),
                ...(company.phone && { telephone: company.phone })
              }
            })
            // Add dense Contact info into SSR Dom
            ssrContent = `<article id="ssr-contact"><h1>Contact Us</h1><p>Contact ${esc(companyNameTranslated)} for custom steel coil requirements, competitive FOB pricing, and rapid export shipping quotes.</p><h2>Contact Details</h2><ul><li><strong>Email:</strong> <a href="mailto:${esc(company.email)}">${esc(company.email)}</a></li><li><strong>Telephone:</strong> <a href="tel:${esc(company.phone)}">${esc(company.phone)}</a></li><li><strong>WhatsApp:</strong> <a href="https://wa.me/${(company.whatsapp || '').replace(/[^0-9]/g, '')}">${esc(company.whatsapp)}</a></li><li><strong>Factory Address:</strong> ${esc(company.address_en || company.address)}</li></ul><h2>Online Inquiry Form</h2><p>Please send us your specific specifications including coating mass, thickness, width, color code, and target quantity for an accurate quote.</p></article>`
          } else if (subPath === '/factory' || subPath === '/factory/') {
            matchedRoute = true
            pageTitle = `Factory Tour & Production Lines | ${companyName}`
            pageDesc = `Take a virtual tour of ${companyName}'s manufacturing facility. See our advanced production lines, quality control processes, and extensive inventory of steel coils.`
            extraSchemas += jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/${lang}` },
              { '@type': 'ListItem', position: 2, name: 'Factory', item: pageCanonical }
            ] })
            ssrContent = `<article id="ssr-factory"><h1>Factory & Production Facility</h1><p>Our expansive factory encompasses multiple advanced production lines dedicated to the comprehensive processing of steel coils. From precision cold rolling to continuous galvanizing and extensive color coating operations, we maintain stringent internal quality control metrics across all stations. Our facility boasts high-capacity inventory management to ensure rapid global deployment and fulfillment of bulk steel requirements.</p></article>`
          } else if (subPath === '/news/ral-colors' || subPath === '/news/ral-colors/') {
            matchedRoute = true
            isNotFound = false
            pageTitle = `RAL Color Chart for PPGI & PPGL | ${companyNameTranslated}`
            pageDesc = `Explore the full RAL color chart for our prepainted galvanized (PPGI) and galvalume (PPGL) steel coils. Custom colors available upon request.`
            extraSchemas += jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/${lang}` },
              { '@type': 'ListItem', position: 2, name: 'News', item: `${siteUrl}/${lang}/news` },
              { '@type': 'ListItem', position: 3, name: 'RAL Colors', item: pageCanonical }
            ] })
          } else if (subPath === '/news/roofing-profiles' || subPath === '/news/roofing-profiles/') {
            matchedRoute = true
            isNotFound = false
            pageTitle = `Roofing Sheet Profiles & Corrugated Steel | ${companyNameTranslated}`
            pageDesc = `View our catalog of steel roofing sheet profiles. We manufacture corrugated, trapezoidal, and glazed tile roofing sheets in various dimensions and colors.`
            extraSchemas += jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/${lang}` },
              { '@type': 'ListItem', position: 2, name: 'News', item: `${siteUrl}/${lang}/news` },
              { '@type': 'ListItem', position: 3, name: 'Roofing Profiles', item: pageCanonical }
            ] })
          } else if (subPath === '/news/futures-price' || subPath === '/news/futures-price/') {
            matchedRoute = true
            isNotFound = false
            pageTitle = `Real-time Steel Futures Prices | ${companyNameTranslated}`
            pageDesc = `Track real-time and historical futures prices for Hot Rolled Coil, Iron Ore, Rebar, and more. Essential market data for steel buyers and traders from ${companyNameTranslated}.`
            extraSchemas += jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/${lang}` },
              { '@type': 'ListItem', position: 2, name: 'News', item: `${siteUrl}/${lang}/news` },
              { '@type': 'ListItem', position: 3, name: 'Futures Price', item: pageCanonical }
            ] })
            
            // Render basic table for GEO crawlers
            const watchlist = getAll('SELECT symbol, name, name_en FROM futures_watchlist ORDER BY sort_order ASC')
            if (watchlist && watchlist.length) {
              const tableRows = watchlist.map(w => {
                let name = w.name_en || w.name
                if (lang !== 'en') {
                  const tRow = getOne('SELECT translated_text FROM translations WHERE content_type="futures_watchlist" AND content_id=? AND language_code=? AND content_field="name"', [w.id, lang])
                  if (tRow) name = tRow.translated_text
                }
                return `<tr><td>${esc(name)}</td><td>${esc(w.symbol)}</td></tr>`
              }).join('')
              ssrContent = `<section id="ssr-futures"><h1>Real-time Steel Futures Prices</h1><table><thead><tr><th>Product Name</th><th>Symbol</th></tr></thead><tbody>${tableRows}</tbody></table></section>`
            }
          }

          // ── Homepage BreadcrumbList + WebSite schema + SSR content ──
          if (!subPath || subPath === '/') {
            matchedRoute = true
            // Keyword-rich homepage title (overrides bare company name from seoSettings)
            const baseTitle = seoSettings.site_title || companyNameTranslated
            
            if (lang === 'zh') {
              pageTitle = `镀锌钢卷、镀铝锌钢卷、彩涂钢卷与冷轧钢卷源头工厂供应商 | ${companyNameTranslated}`
            } else {
              pageTitle = baseTitle.toLowerCase().includes('gi') || baseTitle.toLowerCase().includes('steel coil')
                ? baseTitle
                : `${companyNameTranslated} | GI GL PPGI PPGL CRC Steel Coil Manufacturer & Exporter`
            }
            // Keyword-rich homepage description
            if (!pageDesc) {
              pageDesc = companyDescTranslated || `Shandong Sunsea Steel Co., Ltd — Professional manufacturer and exporter of Galvanized (GI), Galvalume (GL), Prepainted (PPGI/PPGL) and Cold Rolled (CRC) steel coils. ASTM A653 / JIS G3302 / EN 10346 certified. Factory direct pricing, global shipping from Shandong, China.`
            }
            extraSchemas += jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/${lang}` }
            ] })
            extraSchemas += jsonLd({
              '@context': 'https://schema.org', '@type': 'WebSite',
              name: companyNameTranslated, url: `${siteUrl}/${lang}`,
              potentialAction: { '@type': 'SearchAction', target: `${siteUrl}/${lang}/products?search={search_term_string}`, 'query-input': 'required name=search_term_string' }
            })
            // SSR home content: company intro + top products
            const homeProducts = getAll('SELECT id, slug, name_en, name FROM products WHERE status=1 ORDER BY sort_order, id LIMIT 8')
            const companyDesc = esc(companyDescTranslated)
            const homeProductList = homeProducts.map(p => {
              if (tMap) translateProduct(p, tMap, lang)
              const trName = p[`name_${lang}`] || p.name_en || p.name
              return `<li><a href="${siteUrl}/${lang}/products/${p.slug || p.id}">${esc(trName)}</a></li>`
            }).join('')
            
            const allCats = getAll('SELECT id, slug, name_en, name FROM categories ORDER BY sort_order, id') || []
            const homeCatList = allCats.map(c => {
               const catSlug = c.slug || c.id
               let trName = c.name_en || c.name
               if (lang !== 'en' && tMap && tMap['categories'] && tMap['categories'][c.id] && tMap['categories'][c.id].name) {
                 trName = tMap['categories'][c.id].name
               }
               return `<li><a href="${siteUrl}/${lang}/products/category/${catSlug}">${esc(trName)}</a></li>`
            }).join('')
            
            const labCat = lang === 'zh' ? '主要分类' : 'Main Categories'
            const labProd = lang === 'zh' ? '主要产品' : 'Main Products'
            const labLink = lang === 'zh' ? '快捷链接' : 'Quick Links'
            const labAllProd = lang === 'zh' ? '所有产品' : 'All Products'
            const labNews = lang === 'zh' ? '新闻与博客' : 'News & Blog'
            const labContact = lang === 'zh' ? '联系我们' : 'Contact Us'
            const labAbout = lang === 'zh' ? '关于我们' : 'About Us'
            
            const quickLinks = `<li><a href="${siteUrl}/${lang}/products">${labAllProd}</a></li><li><a href="${siteUrl}/${lang}/news">${labNews}</a></li><li><a href="${siteUrl}/${lang}/contact">${labContact}</a></li><li><a href="${siteUrl}/${lang}/about">${labAbout}</a></li>`
            
            ssrContent = `<section id="ssr-home"><h1>${esc(pageTitle)}</h1><p>${companyDesc}</p><h2>${labCat}</h2><ul>${homeCatList}</ul><h2>${labProd}</h2><ul>${homeProductList}</ul><h2>${labLink}</h2><ul>${quickLinks}</ul></section>`
          }

          // ── Catch-all for invalid routes ──
          if (!matchedRoute) {
            if (url.startsWith('/admin') || url.startsWith('/crm')) {
              matchedRoute = true
              pageTitle = (url.startsWith('/admin') ? 'Admin Console' : 'CRM Console') + ' | ' + companyName
              pageDesc = 'Backend Management Console'
            } else {
              isNotFound = true
              pageTitle = 'Page Not Found | ' + companyName
              pageDesc = 'The requested page could not be found.'
            }
          }

        // ── Global Organization schema (on every page) ──
        const orgSchema = {
          '@context': 'https://schema.org', '@type': orgType,
          name: companyName,
          url: siteUrl,
          logo: `${siteUrl}/uploads/logo.png`,
          description: (company.description_en || '').substring(0, 300),
          address: seoSettings.local_business_address || company.address_en || company.address || '',
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
          hreflangTags = langCodes.map(code => {
            let actualHreflang = code
            if (code === 'en' && seoSettings.hreflang_en) actualHreflang = seoSettings.hreflang_en
            if (code === 'zh' && seoSettings.hreflang_zh) actualHreflang = seoSettings.hreflang_zh
            return `<link rel="alternate" hreflang="${esc(actualHreflang)}" href="${siteUrl}/${code}${subPath}" />`
          }).join('\n  ')
          hreflangTags += `\n  <link rel="alternate" hreflang="x-default" href="${siteUrl}/en${subPath}" />`
        } catch (e) {
          hreflangTags = `<link rel="alternate" hreflang="${esc(seoSettings.hreflang_en || 'en')}" href="${siteUrl}/en${subPath}" />\n  <link rel="alternate" hreflang="x-default" href="${siteUrl}/en${subPath}" />`
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
  <meta name="twitter:image" content="${esc(ogImage)}" />${seoSettings.geo_region ? `\n  <meta name="geo.region" content="${esc(seoSettings.geo_region)}" />` : ''}${seoSettings.geo_placename ? `\n  <meta name="geo.placename" content="${esc(seoSettings.geo_placename)}" />` : ''}${(seoSettings.geo_lat && seoSettings.geo_lng) ? `\n  <meta name="geo.position" content="${esc(seoSettings.geo_lat)};${esc(seoSettings.geo_lng)}" />\n  <meta name="ICBM" content="${esc(seoSettings.geo_lat)}, ${esc(seoSettings.geo_lng)}" />` : ''}
  ${hreflangTags}`

        // ── Replace meta tags in HTML ──
        html = html.replace(/<html\s+lang="[^"]*"/, `<html lang="${esc(lang)}"`)
        html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(pageTitle)}</title>`)
        html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(pageDesc)}">`)
        html = html.replace(/<meta\s+name="keywords"\s+content="[^"]*"\s*\/?>/, `<meta name="keywords" content="${esc(pageKeywords)}">`)
        html = html.replace(/<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/, robotsMeta)
        // Remove existing canonical if present, then add correct one via </head> injection
        html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/, '')
        const canonicalTag = `<link rel="canonical" href="${esc(pageCanonical)}">`
        
        // ── Inject SSR content and INITIAL_STATE for hydration ──
        // Insert real content inside <body> so non-JS crawlers can read it
        if (url.startsWith('/admin') || url.startsWith('/crm')) {
          const loadingHtml = `<style>body{margin:0;}.ssr-loader{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#f1f5f9;font-family:-apple-system,sans-serif;color:#64748b;}.ssr-spinner{width:40px;height:40px;border:4px solid #e2e8f0;border-top-color:#3b82f6;border-radius:50%;animation:ssr-spin 1s linear infinite;margin-bottom:16px;}@keyframes ssr-spin{to{transform:rotate(360deg);}}</style><div class="ssr-loader"><div class="ssr-spinner"></div><div style="font-weight:600;letter-spacing:1px;">Loading System...</div></div>`
          html = html.replace('<div id="app">', `<div id="app">${loadingHtml}`)
        } else if (ssrContent) {
          html = html.replace('<div id="app">', `<div id="ssr-content" style="display:none">${ssrContent}</div>\n<div id="app">`)
        }
        
        // Inject state for instant LCP rendering
        const initialState = {
          hero: getOne('SELECT * FROM hero_content WHERE id = 1') || {},
          company: company,
          pageTexts: getOne('SELECT * FROM page_texts WHERE id = 1') || {},
          ssrArticle: req.ssrArticle || null,
          ssrProduct: req.ssrProduct || null,
          seoSettings: seoSettings,
          languages: getAll('SELECT * FROM languages WHERE status=1 ORDER BY sort_order, code') || []
        }
        const stateTag = `<script>window.__INITIAL_STATE__ = ${JSON.stringify(initialState).replace(/</g, '\\u003c')}</script>`
        html = html.replace('</head>', `${canonicalTag}\n  ${extraMeta}\n  ${extraSchemas}\n  ${stateTag}\n</head>`)

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
