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

// ─── GET /api/external/products — list/search products ───────────────────────
router.get('/products', apiKeyMiddleware, (req, res) => {
    const { search, category_id, status, page = 1, limit = 50 } = req.query
    let where = ['1=1'], params = []
    if (search) {
        where.push('(p.name LIKE ? OR p.name_en LIKE ? OR p.description_en LIKE ?)')
        const s = `%${search}%`; params.push(s, s, s)
    }
    if (category_id) { where.push('p.category_id = ?'); params.push(parseInt(category_id)) }
    if (status !== undefined) { where.push('p.status = ?'); params.push(parseInt(status)) }

    const total = getOne(`SELECT COUNT(*) as c FROM products p WHERE ${where.join(' AND ')}`, params)?.c || 0
    const offset = (parseInt(page) - 1) * parseInt(limit)
    const products = getAll(
        `SELECT p.id, p.name, p.name_en, p.slug, p.category_id, p.description_en, p.images, p.is_featured, p.status, p.created_at
         FROM products p WHERE ${where.join(' AND ')} ORDER BY p.sort_order DESC, p.id DESC LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), offset]
    )
    res.json({ products, total, page: parseInt(page), limit: parseInt(limit) })
})

// ─── GET /api/external/products/:id — get single product ─────────────────────
router.get('/products/:id', apiKeyMiddleware, (req, res) => {
    const p = getOne('SELECT * FROM products WHERE id = ?', [req.params.id])
    if (!p) return res.status(404).json({ error: 'Product not found' })
    res.json(p)
})

// ─── GET /api/external/news — list/search news ──────────────────────────────
router.get('/news', apiKeyMiddleware, (req, res) => {
    const { search, status, page = 1, limit = 50 } = req.query
    let where = ['1=1'], params = []
    if (search) {
        where.push('(n.title LIKE ? OR n.title_en LIKE ? OR n.summary_en LIKE ?)')
        const s = `%${search}%`; params.push(s, s, s)
    }
    if (status !== undefined) { where.push('n.status = ?'); params.push(parseInt(status)) }

    const total = getOne(`SELECT COUNT(*) as c FROM news n WHERE ${where.join(' AND ')}`, params)?.c || 0
    const offset = (parseInt(page) - 1) * parseInt(limit)
    const news = getAll(
        `SELECT n.id, n.title, n.title_en, n.slug, n.summary_en, n.cover_image, n.status, n.created_at
         FROM news n WHERE ${where.join(' AND ')} ORDER BY n.id DESC LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), offset]
    )
    res.json({ news, total, page: parseInt(page), limit: parseInt(limit) })
})

// ─── GET /api/external/news/:id — get single news article ───────────────────
router.get('/news/:id', apiKeyMiddleware, (req, res) => {
    const n = getOne('SELECT * FROM news WHERE id = ?', [req.params.id])
    if (!n) return res.status(404).json({ error: 'News not found' })
    res.json(n)
})

// ─── GET /api/external/templates — list/search email templates ──────────────
router.get('/templates', apiKeyMiddleware, (req, res) => {
    const { search, page = 1, limit = 50 } = req.query
    let where = ['1=1'], params = []
    if (search) {
        where.push('(t.name LIKE ? OR t.note LIKE ? OR t.subject LIKE ?)')
        const s = `%${search}%`; params.push(s, s, s)
    }
    const total = getOne(`SELECT COUNT(*) as c FROM mail_templates t WHERE ${where.join(' AND ')}`, params)?.c || 0
    const offset = (parseInt(page) - 1) * parseInt(limit)
    const templates = getAll(
        `SELECT t.id, t.name, t.subject, t.note, t.template_type, t.is_default, t.created_at, t.updated_at
         FROM mail_templates t WHERE ${where.join(' AND ')} ORDER BY t.id DESC LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), offset]
    )
    res.json({ templates, total, page: parseInt(page), limit: parseInt(limit) })
})

// ─── GET /api/external/templates/:id — get single template with html_body ───
router.get('/templates/:id', apiKeyMiddleware, (req, res) => {
    const t = getOne('SELECT * FROM mail_templates WHERE id = ?', [req.params.id])
    if (!t) return res.status(404).json({ error: 'Template not found' })
    res.json(t)
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

// ─── POST /api/external/templates — create email template ────────────────────
router.post('/templates', apiKeyMiddleware, (req, res) => {
    const { name, subject, html_body, note, template_type } = req.body
    if (!name) return res.status(400).json({ error: 'name is required' })
    if (!html_body) return res.status(400).json({ error: 'html_body is required' })
    const r = run('INSERT INTO mail_templates (name, subject, html_body, note, template_type) VALUES (?,?,?,?,?)',
        [name, subject || '', html_body, note || '', template_type || 'html'])
    res.json({ success: true, id: r.lastInsertRowid, message: 'Template created successfully' })
})

// ─── PUT /api/external/templates/:id — update email template ────────────────
router.put('/templates/:id', apiKeyMiddleware, (req, res) => {
    const { id } = req.params
    const existing = getOne('SELECT id FROM mail_templates WHERE id = ?', [id])
    if (!existing) return res.status(404).json({ error: 'Template not found' })
    const { name, subject, html_body, note, template_type } = req.body
    const sets = []
    const vals = []
    if (name !== undefined) { sets.push('name=?'); vals.push(name) }
    if (subject !== undefined) { sets.push('subject=?'); vals.push(subject) }
    if (html_body !== undefined) { sets.push('html_body=?'); vals.push(html_body) }
    if (note !== undefined) { sets.push('note=?'); vals.push(note) }
    if (template_type !== undefined) { sets.push('template_type=?'); vals.push(template_type) }
    if (!sets.length) return res.status(400).json({ error: 'No fields to update' })
    sets.push('updated_at=CURRENT_TIMESTAMP')
    vals.push(id)
    run(`UPDATE mail_templates SET ${sets.join(',')} WHERE id = ?`, vals)
    res.json({ success: true, message: 'Template updated' })
})

// ─── DELETE /api/external/templates/:id ──────────────────────────────────────
router.delete('/templates/:id', apiKeyMiddleware, (req, res) => {
    run('DELETE FROM mail_templates WHERE id = ?', [req.params.id])
    res.json({ success: true, message: 'Template deleted' })
})

router.get('/docs', (req, res) => {
    // Dynamically load categories from DB
    const cats = getAll('SELECT id, name, name_en, slug FROM categories ORDER BY sort_order')
    const catList = cats.map(c => ({ id: c.id, name: c.name_en || c.name, slug: c.slug }))

    res.json({
        info: 'SunSea Steel External API — Content Creation Guide for AI Systems',
        version: '2.0',
        base_url: req.protocol + '://' + req.get('host') + '/api/external',
        auth: {
            method: 'Header: X-API-Key',
            description: '所有写入接口需要在 HTTP Header 中携带 X-API-Key'
        },

        // ═══ Categories ═══
        categories: {
            description: 'Product category_id mapping. Use these IDs when creating products.',
            list: catList
        },

        // ═══ Template Variables ═══
        template_variables: {
            description: 'Available in detail_content and news content. Frontend auto-replaces with backend settings.',
            variables: {
                '{{email}}': 'Company email address',
                '{{phone}}': 'Company phone number',
                '{{whatsapp}}': 'WhatsApp number',
                '{{whatsapp_link}}': 'WhatsApp click-to-chat URL (https://wa.me/xxx)',
                '{{company_name}}': 'Company English name'
            },
            usage_example: '<a href="mailto:{{email}}">{{email}}</a> or <a href="{{whatsapp_link}}">WhatsApp Us</a>'
        },

        // ═══ Content Generation Guide ═══
        content_generation: {
            description: 'Complete guide for generating product detail_content and news content HTML',

            // ── Image Placeholder Rules ──
            image_rules: {
                description: 'How to handle images in generated content',
                placeholder_image: 'Use a 1x1 transparent placeholder: data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
                replace_tip: {
                    description: 'Add a <span class="replace-tip">提示文字</span> AFTER each placeholder image to tell admin what image to upload',
                    example: '<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="PPGI coil" />\n<span class="replace-tip">📷 请上传PPGI钢卷产品图片（建议尺寸：800x600px）</span>',
                    behavior: 'Frontend automatically hides .replace-tip. Admin backend shows it as yellow clickable prompt — clicking triggers image upload and auto-removes the tip after upload.',
                    important: 'The .replace-tip span MUST be placed AFTER or inside the same parent as the <img> tag it references.'
                },
                side_by_side_images: {
                    description: 'For 2+ images displayed side-by-side, use a flex container with fixed-size frames',
                    html_pattern: '<div style="display:flex;gap:16px;margin:20px 0">\n  <div class="fixed-image-frame" style="flex:1">\n    <img src="placeholder" alt="desc1" />\n    <span class="replace-tip">📷 上传左侧图片</span>\n  </div>\n  <div class="fixed-image-frame" style="flex:1">\n    <img src="placeholder" alt="desc2" />\n    <span class="replace-tip">📷 上传右侧图片</span>\n  </div>\n</div>',
                    css_for_fixed_frame: '.fixed-image-frame { position:relative; aspect-ratio:4/3; overflow:hidden; border-radius:12px; background:#f0f4f8; } .fixed-image-frame img { width:100%; height:100%; object-fit:cover; }'
                }
            },

            // ── Product Detail Content Structure ──
            product_detail_structure: {
                description: 'Recommended HTML structure for detail_content field (full HTML page with embedded CSS)',
                sections: [
                    '1. <style> — Complete CSS with variables (--primary:#1f4e79, --secondary:#2980b9, --accent:#e67e22, etc.)',
                    '2. Hero Banner — Full-width gradient background + product title + subtitle + key features badges',
                    '3. Quick Navigation — Anchor links to page sections',
                    '4. Product Overview — Left text + right image layout, 2-3 paragraphs',
                    '5. Technical Specifications Table — Styled <table> with parameters (thickness, width, coating, etc.)',
                    '6. Applications Section — 2-column card grid with icons + descriptions',
                    '7. Product Comparison Table — vs competing products, highlight advantages',
                    '8. Advantages Section — Icon cards or checklist items with descriptions',
                    '9. Why Choose Us — 4-column card grid (Experience, Quality, Price, Service)',
                    '10. Factory/Production — Image + text showcasing manufacturing capability',
                    '11. Quality Control — Process description + certification badges',
                    '12. Packaging & Shipping — Standard packaging specs + logistics info',
                    '13. FAQ Section — Card-style Q&A list (also use faq_items field for JSON-LD)',
                    '14. CTA Section — Gradient background + contact buttons using {{email}} and {{whatsapp_link}}'
                ],
                css_variables: {
                    '--primary': '#1f4e79 (main brand color)',
                    '--secondary': '#2980b9 (links, accents)',
                    '--accent': '#e67e22 (highlights, CTA buttons)',
                    '--bg-light': '#f8f9fa',
                    '--bg-dark': '#1a1a2e',
                    '--text-dark': '#2c3e50',
                    '--text-light': '#ecf0f1',
                    '--border': '#e0e6ed',
                    '--radius': '12px',
                    '--shadow': '0 4px 20px rgba(0,0,0,0.08)'
                },
                important_css_classes: [
                    '.hero — Full-width hero section with gradient background',
                    '.section — Standard content section with padding',
                    '.section-title — Section heading (h2)',
                    '.overview-grid — 2-column text+image layout',
                    '.spec-table — Styled specification table',
                    '.app-grid — Application cards grid',
                    '.image-box — Single image container with rounded corners',
                    '.fixed-image-frame — Fixed aspect-ratio image container for side-by-side',
                    '.dual-images — Flex container for 2 side-by-side images',
                    '.card-grid — Multi-column card layout',
                    '.faq-item — FAQ question/answer card',
                    '.cta-section — Call-to-action with gradient background',
                    '.replace-tip — Image upload prompt (auto-hidden on frontend)'
                ]
            },

            // ── News Article Content Structure ──
            news_article_structure: {
                description: 'Structure for news content field',
                format: 'Can be plain HTML (recommended for SEO) or full HTML page with <style> tags (use render_mode=iframe)',
                sections: [
                    '1. Introduction paragraph — Hook + context',
                    '2. Main content — Multiple H2/H3 sections with paragraphs',
                    '3. Images — Use placeholder imgs with .replace-tip prompts',
                    '4. Key points — Bullet lists or numbered lists',
                    '5. Conclusion — Summary + CTA with {{email}}/{{whatsapp_link}}',
                    '6. FAQ (optional) — Also set faq_items field for JSON-LD schema'
                ],
                render_mode: {
                    'direct': 'Default. HTML rendered directly on page. Best SEO. <style> tags are stripped.',
                    'iframe': 'HTML rendered in isolated iframe. Use when content has its own <style> tags.'
                }
            }
        },

        // ═══ Field Formats ═══
        field_formats: {
            specs: {
                description: 'Product specifications — JSON array string',
                format: '[{"name":"Parameter Name","value":"Parameter Value"}, ...]',
                example: '[{"name":"Thickness","value":"0.12mm - 1.2mm"},{"name":"Width","value":"600mm - 1250mm"},{"name":"Zinc Coating","value":"40-275 g/m²"},{"name":"Surface Treatment","value":"Chromated / Oiled / Passivated"},{"name":"Standard","value":"ASTM A653, EN 10346, JIS G3302"}]',
                recommended_count: '5-6 key specifications'
            },
            faq_items: {
                description: 'FAQ items — JSON array string (used for GEO/SEO structured data)',
                format: '[{"question":"Q text","answer":"A text"}, ...]',
                example: '[{"question":"What is the MOQ for PPGI steel coils?","answer":"Our minimum order quantity is typically 25 metric tons per color/specification."},{"question":"Do you provide free samples?","answer":"Yes, we offer free samples up to 300x300mm for quality evaluation."}]',
                recommended_count: '7-10 FAQs covering: MOQ, pricing, delivery, quality, customization, payment, warranty'
            },
            images: {
                description: 'Product card images — comma-separated URLs or paths',
                example: '/uploads/product1.webp,/uploads/product2.webp'
            }
        },

        // ═══ SEO & GEO Requirements ═══
        seo_geo_requirements: {
            seo_title: 'Product keyword + Brand name, ≤60 chars. Example: "PPGI Steel Coil - Prepainted Galvanized Steel | SunSea Steel"',
            seo_description: 'Product features + use cases + CTA, ≤160 chars. Example: "Premium PPGI steel coils with RAL color coating. Custom thickness 0.12-1.2mm. Factory direct pricing. Get quote now."',
            seo_keywords: '8-12 relevant keywords, comma-separated. Include: product name, variations, applications, industry terms',
            faq_for_geo: 'FAQ items are automatically rendered as JSON-LD FAQPage schema for AI search engines (Google SGE, Bing Chat, Perplexity)',
            content_best_practices: [
                'Use natural product keywords in H2/H3 headings',
                'Include specific numbers (thickness ranges, MOQ, delivery days)',
                'Add comparison with alternatives for featured snippets',
                'Use schema-friendly structure (tables for specs, Q&A for FAQ)',
                'Include CTA with {{email}} and {{whatsapp_link}} template variables'
            ]
        },

        // ═══ API Endpoints ═══
        endpoints: {
            products: {
                list: {
                    method: 'GET', path: '/api/external/products',
                    query_params: { search: '搜索产品名称(中/英)', category_id: '分类ID', status: '0=草稿 1=发布', page: '页码(默认1)', limit: '每页数量(默认50)' }
                },
                get_by_id: { method: 'GET', path: '/api/external/products/:id' },
                create: {
                    method: 'POST',
                    path: '/api/external/products',
                    body: {
                        name: '(required) 产品名称中文',
                        name_en: '(recommended) 产品名称英文',
                        category_id: '(integer) 分类ID，参考categories.list',
                        description: '(string) 中文描述',
                        description_en: '(string) 英文描述',
                        specs: '(JSON string) 规格参数数组，参考field_formats.specs',
                        detail_content: '(HTML string) 完整产品详情页HTML（含<style>标签+所有sections）',
                        images: '(string) 产品卡片图片URL，逗号分隔',
                        is_featured: '(0/1) 是否推荐',
                        sort_order: '(integer) 排序',
                        status: '(0/1) 0=草稿 1=发布',
                        seo_title: '(string) SEO标题',
                        seo_description: '(string) SEO描述',
                        seo_keywords: '(string) SEO关键词',
                        faq_items: '(JSON string) FAQ数组，参考field_formats.faq_items'
                    }
                },
                update: { method: 'PUT', path: '/api/external/products/:id', note: '只传需要更新的字段' },
                delete: { method: 'DELETE', path: '/api/external/products/:id' }
            },
            news: {
                list: {
                    method: 'GET', path: '/api/external/news',
                    query_params: { search: '搜索文章标题(中/英)', status: '0=草稿 1=发布', page: '页码(默认1)', limit: '每页数量(默认50)' }
                },
                get_by_id: { method: 'GET', path: '/api/external/news/:id' },
                create: {
                    method: 'POST',
                    path: '/api/external/news',
                    body: {
                        title: '(required) 文章标题中文',
                        title_en: '(recommended) 文章标题英文',
                        summary: '(string) 中文摘要',
                        summary_en: '(string) 英文摘要',
                        content: '(HTML string) 文章内容HTML',
                        cover_image: '(string) 封面图URL',
                        seo_title: '(string) SEO标题',
                        seo_description: '(string) SEO描述',
                        seo_keywords: '(string) SEO关键词',
                        status: '(0/1) 0=草稿 1=发布',
                        render_mode: '(string) direct(默认) 或 iframe'
                    }
                },
                update: { method: 'PUT', path: '/api/external/news/:id', note: '只传需要更新的字段' },
                delete: { method: 'DELETE', path: '/api/external/news/:id' }
            },
            templates: {
                list: {
                    method: 'GET', path: '/api/external/templates',
                    query_params: { search: '搜索模板名称/备注/主题', page: '页码(默认1)', limit: '每页数量(默认50)' }
                },
                get_by_id: { method: 'GET', path: '/api/external/templates/:id', note: '返回完整html_body' },
                create: {
                    method: 'POST',
                    path: '/api/external/templates',
                    body: {
                        name: '(required) 模板名称，如 "Cold Email - English"',
                        subject: '(string) 邮件主题',
                        html_body: '(required, HTML string) 邮件正文HTML，必须包含签名',
                        note: '(string) 模板备注',
                        template_type: '(string) "html"(HTML格式，支持完整样式) 或 "rich"(富文本编辑器)'
                    }
                },
                update: { method: 'PUT', path: '/api/external/templates/:id', note: '只传需要更新的字段' },
                delete: { method: 'DELETE', path: '/api/external/templates/:id' }
            }
        },

        // ═══ Email Template Generation Guide ═══
        email_template_guide: {
            description: 'Complete guide for generating email template html_body content',
            template_type: {
                html: 'Full HTML with inline styles — recommended for cold emails, supports complex layouts',
                rich: 'Simple HTML for rich-text editor — basic formatting only'
            },
            signature: {
                description: 'All email templates MUST include a professional signature at the bottom',
                format: `<div style="margin-top:30px;padding-top:20px;border-top:2px solid #e0e6ed;font-family:Arial,sans-serif;font-size:13px;color:#555;line-height:1.8">
  <p style="margin:0 0 4px"><strong>Best Regards</strong></p>
  <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#1f4e79">Mr Jameson / Sales Manager / International Dept.</p>
  <p style="margin:0 0 4px">📱 Mobile / WhatsApp / Wechat: <a href="{{whatsapp_link}}" style="color:#25d366;text-decoration:none">{{phone}}</a></p>
  <p style="margin:0 0 12px">📧 Email: <a href="mailto:{{email}}" style="color:#0563c1;text-decoration:none">{{email}}</a></p>
  <div style="margin:12px 0"><img src="COMPANY_LOGO_PLACEHOLDER" alt="Company Logo" style="max-height:50px" class="replace-tip-target" /><span class="replace-tip">📷 请上传公司LOGO图片</span></div>
  <p style="margin:0;font-weight:700;color:#1f4e79;font-size:13px">SHANDONG FADA STEEL CO., LTD</p>
  <p style="margin:0;font-size:12px;color:#777">SHANDONG YANGGU NEW GLOBAL STEEL CO., LTD</p>
  <p style="margin:0;font-size:12px;color:#777">FADA STEEL PTE. LTD. (SINGAPORE BRANCH)</p>
  <p style="margin:4px 0 0;font-size:12px;color:#777">📍 ADD: YANGGU, LIAOCHENG CITY, SHANDONG PROVINCE, CHINA</p>
  <p style="margin:2px 0 0">🌐 <a href="https://www.fadasteel.com" style="color:#0563c1;text-decoration:none;font-weight:600">WWW.FADASTEEL.COM</a></p>
</div>`,
                important: 'Use {{email}}, {{phone}}, {{whatsapp_link}} template variables so signature auto-updates with backend settings. The company LOGO should use a placeholder img with .replace-tip for the admin to upload.',
                logo_placeholder: 'Use data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7 as placeholder src with a .replace-tip span'
            },
            image_rules: {
                description: 'Same rules as product detail — use placeholder images with .replace-tip',
                side_by_side: 'Use <div style="display:flex;gap:10px"> for side-by-side images, each with flex:1 and fixed aspect-ratio container',
                click_to_replace: 'Admin visual editor supports double-click on images to replace, and clicking .replace-tip to upload'
            },
            best_practices: [
                'Use inline styles (not <style> blocks) for maximum email client compatibility',
                'Keep email width ≤600px with margin:auto for centered layout',
                'Use table-based layout for complex structures (Outlook compatibility)',
                'Include both text and image content for spam filter avoidance',
                'Use template variables {{email}}, {{phone}}, {{whatsapp_link}} in all contact points',
                'Always include the standard signature block at the bottom'
            ]
        }
    })
})

export default router

