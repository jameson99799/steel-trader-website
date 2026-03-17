import { Router } from 'express'
import { getAll, getOne, run } from '../db.js'
import crypto from 'crypto'

const router = Router()

// ─── Slugify helper ──────────────────────────────────────────────────────────
function slugify(text, id) {
    const base = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 80)
    return id ? `${base}-${id}` : base
}

// ─── API Key middleware ──────────────────────────────────────────────────────
function apiKeyMiddleware(req, res, next) {
    const key = req.headers['x-api-key']
    if (!key) return res.status(401).json({ error: 'Missing X-API-Key header' })
    const stored = getOne('SELECT value FROM api_keys WHERE name = ?', ['external_api_key'])
    if (!stored?.value || stored.value !== key) {
        return res.status(403).json({ error: 'Invalid API key' })
    }
    next()
}

// ─── GET /api/external/key — admin: get/regenerate key ───────────────────────
// (Protected by normal auth, used in Settings page)
import { authMiddleware } from '../middleware/auth.js'

router.get('/key', authMiddleware, (req, res) => {
    const row = getOne('SELECT value FROM api_keys WHERE name = ?', ['external_api_key'])
    res.json({ key: row?.value || '' })
})

router.post('/key/generate', authMiddleware, (req, res) => {
    const newKey = 'ext_' + crypto.randomBytes(24).toString('hex')
    const existing = getOne('SELECT * FROM api_keys WHERE name = ?', ['external_api_key'])
    if (existing) {
        run('UPDATE api_keys SET value = ? WHERE name = ?', [newKey, 'external_api_key'])
    } else {
        run('INSERT INTO api_keys (name, value) VALUES (?, ?)', ['external_api_key', newKey])
    }
    res.json({ key: newKey })
})

// ─── POST /api/external/products — create product ────────────────────────────
router.post('/products', apiKeyMiddleware, (req, res) => {
    const {
        name, name_en, category_id, description, description_en, specs,
        detail_content, images, is_featured, sort_order, status,
        seo_title, seo_description, seo_keywords, faq_items
    } = req.body

    if (!name && !name_en) return res.status(400).json({ error: 'name or name_en is required' })

    const result = run(`
        INSERT INTO products (name, name_en, category_id, description, description_en, specs, images, detail_content, is_featured, sort_order, status, seo_title, seo_description, seo_keywords, faq_items)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        name || name_en, name_en || null, category_id || null,
        description || null, description_en || null, specs || null,
        images || '', detail_content || null,
        parseInt(is_featured || 0), parseInt(sort_order || 0), parseInt(status ?? 1),
        seo_title || null, seo_description || null, seo_keywords || null,
        faq_items || '[]'
    ])

    const newId = result.lastInsertRowid
    const base = slugify(name_en || name, newId)
    run('UPDATE products SET slug = ? WHERE id = ?', [base, newId])

    res.json({
        success: true,
        id: newId,
        slug: base,
        message: 'Product created successfully'
    })
})

// ─── POST /api/external/news — create news article ──────────────────────────
router.post('/news', apiKeyMiddleware, (req, res) => {
    const {
        title, title_en, summary, summary_en, content, cover_image,
        seo_title, seo_description, seo_keywords, status, render_mode
    } = req.body

    if (!title && !title_en) return res.status(400).json({ error: 'title or title_en is required' })

    const result = run(`
        INSERT INTO news (title, title_en, slug, summary, summary_en, content, cover_image, seo_title, seo_description, seo_keywords, status, sort_order, render_mode)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
        title || title_en, title_en || null, 'temp',
        summary || null, summary_en || null, content || null,
        cover_image || null,
        seo_title || null, seo_description || null, seo_keywords || null,
        parseInt(status ?? 1), 0, render_mode || 'direct'
    ])

    const newId = result.lastInsertRowid
    const cleanSlug = slugify(title_en || title, newId)
    run('UPDATE news SET slug = ? WHERE id = ?', [cleanSlug, newId])

    res.json({
        success: true,
        id: newId,
        slug: cleanSlug,
        message: 'News article created successfully'
    })
})

// ─── API Documentation endpoint ─────────────────────────────────────────────
router.get('/docs', (req, res) => {
    res.json({
        endpoints: [
            {
                method: 'POST', path: '/api/external/products',
                description: 'Create a new product',
                auth: 'X-API-Key header',
                body: {
                    name: { type: 'string', required: true, description: '产品名称（中文）' },
                    name_en: { type: 'string', required: false, description: '产品名称（英文，推荐，用于URL slug）' },
                    category_id: { type: 'number', required: false, description: '分类ID' },
                    description: { type: 'string', required: false, description: '产品描述（中文）' },
                    description_en: { type: 'string', required: false, description: '产品描述（英文）' },
                    specs: { type: 'string', required: false, description: '规格参数（JSON字符串）' },
                    detail_content: { type: 'string', required: false, description: '详情页HTML内容' },
                    images: { type: 'string', required: false, description: '图片URL，逗号分隔' },
                    is_featured: { type: 'number', required: false, description: '是否推荐 0/1' },
                    seo_title: { type: 'string', required: false, description: 'SEO标题' },
                    seo_description: { type: 'string', required: false, description: 'SEO描述' },
                    seo_keywords: { type: 'string', required: false, description: 'SEO关键词' },
                    faq_items: { type: 'string', required: false, description: 'FAQ JSON数组' },
                    status: { type: 'number', required: false, description: '0=草稿 1=发布，默认1' }
                }
            },
            {
                method: 'POST', path: '/api/external/news',
                description: 'Create a new news article',
                auth: 'X-API-Key header',
                body: {
                    title: { type: 'string', required: true, description: '标题（中文）' },
                    title_en: { type: 'string', required: false, description: '标题（英文）' },
                    summary: { type: 'string', required: false, description: '摘要（中文）' },
                    summary_en: { type: 'string', required: false, description: '摘要（英文）' },
                    content: { type: 'string', required: false, description: '内容HTML' },
                    cover_image: { type: 'string', required: false, description: '封面图URL' },
                    seo_title: { type: 'string', required: false, description: 'SEO标题' },
                    seo_description: { type: 'string', required: false, description: 'SEO描述' },
                    seo_keywords: { type: 'string', required: false, description: 'SEO关键词' },
                    status: { type: 'number', required: false, description: '0=草稿 1=发布，默认1' }
                }
            }
        ]
    })
})

export default router
