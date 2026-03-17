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

// ─── PUT /api/external/products/:id — update product ────────────────────────
router.put('/products/:id', apiKeyMiddleware, (req, res) => {
    const { id } = req.params
    const existing = getOne('SELECT id FROM products WHERE id = ?', [id])
    if (!existing) return res.status(404).json({ error: 'Product not found' })
    const {
        name, name_en, category_id, description, description_en, specs,
        detail_content, images, is_featured, sort_order, status,
        seo_title, seo_description, seo_keywords, faq_items
    } = req.body

    const sets = []
    const vals = []
    if (name !== undefined) { sets.push('name=?'); vals.push(name) }
    if (name_en !== undefined) { sets.push('name_en=?'); vals.push(name_en) }
    if (category_id !== undefined) { sets.push('category_id=?'); vals.push(category_id) }
    if (description !== undefined) { sets.push('description=?'); vals.push(description) }
    if (description_en !== undefined) { sets.push('description_en=?'); vals.push(description_en) }
    if (specs !== undefined) { sets.push('specs=?'); vals.push(specs) }
    if (detail_content !== undefined) { sets.push('detail_content=?'); vals.push(detail_content) }
    if (images !== undefined) { sets.push('images=?'); vals.push(images) }
    if (is_featured !== undefined) { sets.push('is_featured=?'); vals.push(parseInt(is_featured)) }
    if (sort_order !== undefined) { sets.push('sort_order=?'); vals.push(parseInt(sort_order)) }
    if (status !== undefined) { sets.push('status=?'); vals.push(parseInt(status)) }
    if (seo_title !== undefined) { sets.push('seo_title=?'); vals.push(seo_title) }
    if (seo_description !== undefined) { sets.push('seo_description=?'); vals.push(seo_description) }
    if (seo_keywords !== undefined) { sets.push('seo_keywords=?'); vals.push(seo_keywords) }
    if (faq_items !== undefined) { sets.push('faq_items=?'); vals.push(faq_items) }

    if (!sets.length) return res.status(400).json({ error: 'No fields to update' })
    vals.push(id)
    run(`UPDATE products SET ${sets.join(',')} WHERE id = ?`, vals)
    res.json({ success: true, message: 'Product updated' })
})

// ─── DELETE /api/external/products/:id ──────────────────────────────────────
router.delete('/products/:id', apiKeyMiddleware, (req, res) => {
    run('DELETE FROM products WHERE id = ?', [req.params.id])
    res.json({ success: true, message: 'Product deleted' })
})

// ─── PUT /api/external/news/:id — update news ──────────────────────────────
router.put('/news/:id', apiKeyMiddleware, (req, res) => {
    const { id } = req.params
    const existing = getOne('SELECT id FROM news WHERE id = ?', [id])
    if (!existing) return res.status(404).json({ error: 'News not found' })
    const {
        title, title_en, summary, summary_en, content, cover_image,
        seo_title, seo_description, seo_keywords, status, render_mode
    } = req.body

    const sets = []
    const vals = []
    if (title !== undefined) { sets.push('title=?'); vals.push(title) }
    if (title_en !== undefined) { sets.push('title_en=?'); vals.push(title_en) }
    if (summary !== undefined) { sets.push('summary=?'); vals.push(summary) }
    if (summary_en !== undefined) { sets.push('summary_en=?'); vals.push(summary_en) }
    if (content !== undefined) { sets.push('content=?'); vals.push(content) }
    if (cover_image !== undefined) { sets.push('cover_image=?'); vals.push(cover_image) }
    if (seo_title !== undefined) { sets.push('seo_title=?'); vals.push(seo_title) }
    if (seo_description !== undefined) { sets.push('seo_description=?'); vals.push(seo_description) }
    if (seo_keywords !== undefined) { sets.push('seo_keywords=?'); vals.push(seo_keywords) }
    if (status !== undefined) { sets.push('status=?'); vals.push(parseInt(status)) }
    if (render_mode !== undefined) { sets.push('render_mode=?'); vals.push(render_mode) }

    if (!sets.length) return res.status(400).json({ error: 'No fields to update' })
    vals.push(id)
    run(`UPDATE news SET ${sets.join(',')} WHERE id = ?`, vals)
    res.json({ success: true, message: 'News updated' })
})

// ─── DELETE /api/external/news/:id ─────────────────────────────────────────
router.delete('/news/:id', apiKeyMiddleware, (req, res) => {
    run('DELETE FROM news WHERE id = ?', [req.params.id])
    res.json({ success: true, message: 'News deleted' })
})

// ─── API Documentation endpoint ─────────────────────────────────────────────
router.get('/docs', (req, res) => {
    res.json({
        info: 'SunSea Steel External API — 用于AI和外部系统自动上传产品和文章',
        auth: '所有写入接口需要在Header中携带 X-API-Key',
        categories: {
            description: '分类ID映射（category_id字段使用）',
            list: [
                { id: 1, name: 'Galvanized Steel Coil' },
                { id: 2, name: 'Galvalume Steel Coil' },
                { id: 3, name: 'Prepainted Galvalume Steel Coil' },
                { id: 4, name: 'Prepainted Galvanized Steel Coil' },
                { id: 5, name: 'Corrugated Roofing Sheet' },
                { id: 6, name: 'Cold Rolled Coil' }
            ]
        },
        template_variables: {
            description: '在detail_content和news content中可用的模板变量，前端会自动替换为网站后台设置的值',
            variables: {
                '{{email}}': '公司邮箱',
                '{{phone}}': '公司电话',
                '{{whatsapp}}': 'WhatsApp号码',
                '{{whatsapp_link}}': 'WhatsApp链接 (https://wa.me/xxx)',
                '{{company_name}}': '公司英文名'
            }
        },
        content_requirements: {
            description: '产品详情和文章内容生成要求',
            structure: [
                '1. Hero Banner区 — 全宽背景图+标题+描述（使用.hero类）',
                '2. Quick Links导航 — 页面内锚点链接',
                '3. 产品概述（Overview）— 左文右图布局',
                '4. 技术规格表（Specifications）— 标准table格式',
                '5. 应用领域（Applications）— 双列图文卡片',
                '6. 同类产品对比（Comparison）— 详细对比表格+双栏图片',
                '7. 产品优势（Advantages）— 图文并排+check list',
                '8. 为何选择（Why Choose Us）— 4列card grid',
                '9. 工厂实力（Factory Strength）— 图文并排',
                '10. 质量控制（Quality Control）— 双栏图片+4列cards',
                '11. 包装（Packaging）— 带背景的图文section',
                '12. 发运（Shipping）— 双栏图片+info box',
                '13. FAQ — 卡片式FAQ列表',
                '14. CTA区 — 渐变背景+Email和WhatsApp按钮（使用{{email}}和{{whatsapp_link}}变量）'
            ],
            image_placeholders: '图片位置使用 .image-box 或 .fixed-image-frame 容器，内含可点击上传的img标签。中文提示使用 .replace-tip 类（display:none），添加图片后自动隐藏',
            seo_requirements: [
                'seo_title: 包含产品关键词 + 公司名 (60字符内)',
                'seo_description: 包含产品特性 + 使用场景 + CTA (160字符内)',
                'seo_keywords: 8-12个关键词，逗号分隔',
                'faq_items: 7-10个FAQ，覆盖常见采购问题'
            ],
            css_styling: '使用参考模板的CSS变量系统（--primary, --secondary等），完整CSS包含在detail_content的<style>标签中'
        },
        specs_format: {
            description: 'specs字段格式 — JSON数组，每项包含name和value',
            example: '[{"name":"Thickness","value":"0.12mm - 1.2mm"},{"name":"Width","value":"600mm - 1250mm"}]',
            recommended_count: '5-6个核心规格参数'
        },
        faq_format: {
            description: 'faq_items字段格式 — JSON数组，每项包含question和answer',
            example: '[{"question":"What is PPGI?","answer":"PPGI stands for..."}]',
            recommended_count: '7-10个FAQ'
        },
        endpoints: [
            {
                method: 'POST', path: '/api/external/products', description: '创建产品',
                body: { name: '中文名(必填)', name_en: '英文名(推荐)', category_id: '分类ID', description: '中文描述', description_en: '英文描述', specs: '规格JSON数组', detail_content: '详情页HTML(含CSS)', images: '图片URL逗号分隔', is_featured: '0/1推荐', seo_title: 'SEO标题', seo_description: 'SEO描述', seo_keywords: 'SEO关键词', faq_items: 'FAQ JSON数组', status: '0草稿/1发布' }
            },
            { method: 'PUT', path: '/api/external/products/:id', description: '更新产品（只传需要更新的字段）' },
            { method: 'DELETE', path: '/api/external/products/:id', description: '删除产品' },
            {
                method: 'POST', path: '/api/external/news', description: '创建文章',
                body: { title: '中文标题(必填)', title_en: '英文标题', summary: '中文摘要', summary_en: '英文摘要', content: '内容HTML', cover_image: '封面图URL', seo_title: 'SEO标题', seo_description: 'SEO描述', seo_keywords: 'SEO关键词', status: '0草稿/1发布' }
            },
            { method: 'PUT', path: '/api/external/news/:id', description: '更新文章（只传需要更新的字段）' },
            { method: 'DELETE', path: '/api/external/news/:id', description: '删除文章' }
        ]
    })
})

export default router

