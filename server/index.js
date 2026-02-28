import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

import { initDb } from './db.js'
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

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001
const NODE_ENV = process.env.NODE_ENV || 'development'

async function startServer() {
  try {
    // 初始化数据库
    await initDb()
    console.log('✓ Database initialized')

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
      app.use(express.static(join(__dirname, '..', 'dist'), {
        maxAge: '1y',
        etag: true
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
    app.use('/api/pagetexts', pageTextsRoutes)
    app.use('/api/news', newsRoutes)
    app.use('/api/seo', seoRoutes)
    // Sitemap (accessible as /sitemap.xml)
    app.use('/sitemap.xml', sitemapRoutes)
    app.use('/api/languages', languagesRoutes)
    app.use('/api/translation', translationRoutes)

    // 健康检查端点
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() })
    })

    // 生产环境 SPA 路由
    if (NODE_ENV === 'production') {
      app.get('*', (req, res) => {
        res.sendFile(join(__dirname, '..', 'dist', 'index.html'))
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
