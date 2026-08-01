import { Router } from 'express'
import { getAll, getOne, run } from '../db.js'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import {
    createLegacySeoReviewHandler,
    productReviewStore,
    registerExternalProductReviewRoutes
} from './product-reviews.js'

// ─── Product type detection from article context ─────────────────────────────
const PRODUCT_TYPE_MAP = [
    {
        type: 'GI', label: 'GI (Galvanized Steel / 镀锌钢板)',
        keywords: ['galvanized', 'gi coil', 'hot-dip zinc', 'zinc coated', 'z40', 'z60', 'z100', 'z275', 'hdg', '镀锌'],
        must_cover: ['zinc coating weight (Z40-Z275 g/m²)', 'hot-dip galvanizing process', 'corrosion resistance', 'MOQ/pricing', 'compliance standards (ASTM A653 / JIS G3302 / EN 10346)', 'delivery time', 'customization options'],
        must_not_mention: ['galvalume', 'GL', 'PPGI', 'PPGL', 'aluminum-zinc alloy', 'color coating', 'RAL color', 'AZ50', 'AZ150'],
        sample_questions: ['What is the zinc coating weight for GI steel coils?', 'What standards does your galvanized steel comply with?', 'What is the MOQ for GI coils?', 'What is the service life of hot-dip galvanized steel?', 'Can you customize the GI coil width and thickness?']
    },
    {
        type: 'GL', label: 'GL (Galvalume / Aluzinc / 镀铝锌)',
        keywords: ['galvalume', 'aluzinc', 'aluminum-zinc', 'az50', 'az150', 'gl coil', 'aluminized zinc', '镀铝锌'],
        must_cover: ['aluminum-zinc alloy composition (55% Al, 43.4% Zn, 1.6% Si)', 'superior heat resistance vs GI', 'corrosion resistance life', 'MOQ/pricing', 'standards (ASTM A792 / JIS G3321 / EN 10346)', 'roofing/industrial applications'],
        must_not_mention: ['hot-dip zinc only', 'pure zinc coating', 'GI', 'PPGI', 'PPGL', 'RAL color'],
        sample_questions: ['What is the difference between GL (Galvalume) and GI (Galvanized) steel?', 'What coating composition does Galvalume steel have?', 'Is GL steel suitable for roofing applications?', 'What standards does your GL coil comply with?', 'What is the heat resistance of Galvalume steel?']
    },
    {
        type: 'PPGI', label: 'PPGI / PPGL (Pre-painted Color Coated / 彩涂钢板)',
        keywords: ['ppgi', 'ppgl', 'prepainted', 'color coated', 'colour coated', 'ral', 'painted steel', 'colored steel', '彩涂', '彩钢'],
        must_cover: ['available RAL colors and custom color matching', 'coating layers (primer + topcoat)', 'thickness range', 'applications (roofing, wall panels, appliances)', 'MOQ per color', 'standards (ASTM A755 / JIS G3312)', 'weather resistance'],
        must_not_mention: ['bare GI without paint', 'bare GL without paint', 'uncoated zinc'],
        sample_questions: ['What RAL colors are available for PPGI steel coils?', 'What coating thickness options are available for PPGI?', 'Is PPGI steel suitable for roofing applications?', 'What is the MOQ for each color?', 'Can you provide custom colors for PPGI coils?']
    },
    {
        type: 'CRC', label: 'CRC (Cold Rolled Steel / 冷轧钢板)',
        keywords: ['cold rolled', 'cold-rolled', 'crc', 'spcc', 'dc01', 'dc03', 'st12', 'cold drawn', '冷轧'],
        must_cover: ['precision thickness tolerance', 'surface finish options (BA / 2B / matt)', 'tensile strength', 'applications (auto body, appliances, precision stamping)', 'MOQ/pricing', 'standards (ASTM A1008 / JIS G3141 / EN 10130)'],
        must_not_mention: ['hot-dip zinc coating', 'color coating', 'galvanized', 'PPGI'],
        sample_questions: ['What thickness tolerance can you achieve for CRC?', 'What surface finish options are available for cold rolled steel?', 'What industries use cold rolled steel coils?', 'What is the tensile strength of your CR steel?', 'What standards does your CRC comply with?']
    },
    {
        type: 'ROOFING', label: 'Roofing Sheet (屋顶板)',
        keywords: ['roofing', 'roof sheet', 'corrugated', 'ibr', 'tile sheet', 'roof panel', '屋顶板', '瓦楞板', '彩钢瓦'],
        must_cover: ['available profiles (corrugated / IBR / tile)', 'panel thickness and coverage width', 'suitable base material (GI or GL)', 'installation method', 'weather and UV resistance', 'MOQ/container quantities'],
        must_not_mention: ['flat coil only use cases', 'cold forming applications'],
        sample_questions: ['What corrugated roofing sheet profiles do you offer?', 'Are your roofing sheets pre-painted or bare metal?', 'What thickness is recommended for industrial roofing?', 'How many roofing sheets fit in one container?', 'What is the warranty on your roofing sheets?']
    }
]

function detectProductType(title, content) {
    const text = ((title || '') + ' ' + (content || '')).toLowerCase().substring(0, 1000)
    for (const pt of PRODUCT_TYPE_MAP) {
        if (pt.keywords.some(kw => text.includes(kw.toLowerCase()))) return pt
    }
    return null
}

const router = Router()

// ─── Slugify helper ──────────────────────────────────────────────────────────
function slugify(text, id) {
    const base = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .substring(0, 500)
        .replace(/^-+|-+$/g, '')
    return id ? `${base}-${id}` : base
}

function uniqueSlug(table, base, excludeId = null) {
    let slug = base || table
    let counter = 2
    while (true) {
        const exists = excludeId
            ? getOne(`SELECT id FROM ${table} WHERE slug = ? AND id != ?`, [slug, excludeId])
            : getOne(`SELECT id FROM ${table} WHERE slug = ?`, [slug])
        if (!exists) return slug
        slug = `${base}-${counter++}`
    }
}

// ─── Auto SEO helper ─────────────────────────────────────────────────────────
function autoSeoProduct(name_en, description_en, categoryName) {
    const title = `${(name_en || '').substring(0, 40)} - ${categoryName || 'Steel Coil'} | SunSea Steel`
    const desc = `Factory direct ${name_en || 'steel coil'}. ${(description_en || '').substring(0, 90).replace(/<[^>]*>/g, '')}. Get a quote from SunSea Steel.`
    const keywords = [
        name_en, categoryName,
        `${name_en} manufacturer`, `${name_en} supplier`,
        'steel coil manufacturer China', 'GI GL PPGI PPGL CRC steel'
    ].filter(Boolean).join(', ')
    return {
        seo_title: title.substring(0, 60),
        seo_description: desc.substring(0, 160),
        seo_keywords: keywords.substring(0, 200)
    }
}

function autoSeoNews(title_en, summary_en) {
    const title = `${(title_en || '').substring(0, 50)} | SunSea Steel`
    const desc = (summary_en || '').replace(/<[^>]*>/g, '').substring(0, 155)
    const words = (title_en || '').toLowerCase().split(/\s+/).filter(w => w.length > 4).slice(0, 6)
    const keywords = [...words, 'steel coil', 'SunSea Steel'].join(', ')
    return {
        seo_title: title.substring(0, 60),
        seo_description: desc || `${title_en} - Expert insights from SunSea Steel.`,
        seo_keywords: keywords.substring(0, 200)
    }
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

// ─── GET /api/external/media/groups ─────────────────────────────────────────
// Returns all media groups for AI to pick the correct image source.
// Call this first, then use group slug in GET /api/external/media?group_slug=xxx
router.get('/media/groups', apiKeyMiddleware, (req, res) => {
    const groups = getAll(`
        SELECT mg.id, mg.name, mg.slug, mg.sort_order,
               (SELECT COUNT(*) FROM media m WHERE m.group_id = mg.id AND m.status = 1) as image_count
        FROM media_groups mg ORDER BY mg.sort_order, mg.name`)
    res.json({
        groups,
        // ── Smart matching guide for AI ──────────────────────────────────────
        // Step 1: Call this endpoint to get the live group list
        // Step 2: Use the rules below to pick group_slug for each image slot
        // Step 3: GET /api/external/media?group_slug=xxx to fetch actual image URLs
        matching_hints: {
            description: 'Context-aware rules for matching content sections to image groups. Use these when building product detail pages and articles.',
            by_product_type: [
                { match_when: 'Product is GI / Galvanized Steel / Hot-dip zinc / HDG / Z40/Z60/Z100/Z275 coating', group_slug: 'gi', note: 'Main product images, hero banner, overview section' },
                { match_when: 'Product is GL / Galvalume / Aluzinc / AZ50/AZ150 / ALUZINC coating', group_slug: 'gl', note: 'Main product images, hero banner, overview section' },
                { match_when: 'Product is PPGI / PPGL / Prepainted / Color coated / RAL colors / painted galvanized', group_slug: 'ppgi', note: 'Main product images, color chart section' },
                { match_when: 'Product is CRC / Cold Rolled / SPCC / DC01 / cold-drawn', group_slug: 'crc', note: 'Main product images' },
                { match_when: 'Product is Roofing sheet / Corrugated sheet / IBR / Tile / Roof panel', group_slug: 'roofing', note: 'Main product images + application section' }
            ],
            by_content_section: [
                {
                    section: 'Product Applications / End-use scenarios for GI/GL products',
                    group_slug: '镀锌产品应用',
                    fallback_slug: 'gi',
                    use_in: 'Applications section, use-case cards, construction/industry images'
                },
                {
                    section: 'Product Applications / End-use scenarios for PPGI/Color coated products',
                    group_slug: '彩涂产品应用',
                    fallback_slug: 'ppgi',
                    use_in: 'Applications section showing roofing, wall panels, appliances in color'
                },
                {
                    section: 'Packaging & Shipping — how product is packed (inner/outer wrap, steel strip)',
                    group_slug: '包装',
                    use_in: 'Packaging section, what-you-receive section'
                },
                {
                    section: 'Factory / Production facility / Manufacturing process / Workshop',
                    group_slug: '工厂',
                    use_in: 'Factory section, production capability, manufacturing images'
                },
                {
                    section: 'Quality inspection / Testing / Certifications / Lab',
                    group_slug: '质检',
                    fallback_slug: '工厂',
                    use_in: 'Quality control section, inspection process images'
                },
                {
                    section: 'Container shipping / FCL / 20GP / 40HQ / Container loading',
                    group_slug: '集装箱',
                    use_in: 'Shipping section, logistics, delivery method'
                },
                {
                    section: 'Bulk vessel / Bulk carrier / Break bulk / Ocean freight without container',
                    group_slug: '散货',
                    use_in: 'Shipping section for bulk orders'
                }
            ],
            product_detail_image_slots: {
                description: 'Recommended image placement for a complete product detail page',
                slots: [
                    { slot: 'images field (product card)', group: 'match product type (gi/gl/ppgi/crc/roofing)', count: '2-3 images' },
                    { slot: 'Hero banner background', group: 'match product type', count: '1 image' },
                    { slot: 'Product overview (left or right image)', group: 'match product type', count: '1 image' },
                    { slot: 'Applications section images', group: '镀锌产品应用 or 彩涂产品应用', count: '2-4 images' },
                    { slot: 'Factory / Production section', group: '工厂', count: '1-2 images' },
                    { slot: 'Quality Control section', group: '质检', count: '1-2 images' },
                    { slot: 'Packaging & Shipping section', group: '包装', count: '1-2 images' },
                    { slot: 'Shipping method section', group: '集装箱 or 散货', count: '1 image' }
                ]
            },
            fallback_rule: 'If a group_slug returns 0 images, fall back to the closest product type group (gi/gl/ppgi/crc/roofing). Never leave <img> with a placeholder when real images are available.',
            new_group_tip: 'When admin adds new groups in the backend, they appear here automatically. Re-call GET /api/external/media/groups to refresh.'
        }
    })
})

// ─── GET /api/external/media — search images ─────────────────────────────────
// Query: group_slug, group_id, search (filename/alt), limit (default 10), page
router.get('/media', apiKeyMiddleware, (req, res) => {
    const { group_slug, group_id, search, limit = 10, page = 1 } = req.query
    let where = 'WHERE m.status = 1'
    const params = []

    // Resolve group by slug if provided
    let resolvedGroupId = group_id || null
    if (group_slug && !group_id) {
        const grp = getOne('SELECT id FROM media_groups WHERE slug = ? OR LOWER(name) = LOWER(?)', [group_slug, group_slug])
        if (grp) resolvedGroupId = grp.id
    }
    if (resolvedGroupId) { where += ' AND m.group_id = ?'; params.push(resolvedGroupId) }
    if (search) { where += ' AND (m.original_filename LIKE ? OR m.alt LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }

    const total = getOne(`SELECT COUNT(*) as c FROM media m ${where}`, params)?.c || 0
    const offset = (parseInt(page) - 1) * parseInt(limit)
    const items = getAll(
        `SELECT m.id, m.filepath, m.original_filename, m.alt, m.width, m.height, mg.name as group_name, mg.slug as group_slug
         FROM media m LEFT JOIN media_groups mg ON mg.id = m.group_id
         ${where} ORDER BY m.created_at DESC LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), offset]
    )
    res.json({ items, total, page: parseInt(page), limit: parseInt(limit) })
})

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

// ─── GET /api/external/news/faq-status — bulk FAQ status with product hints ──
// Returns all articles sorted by: missing FAQ first, then by ID desc
// Each article includes a faq_writing_guide to help AI write product-specific FAQs
router.get('/news/faq-status', apiKeyMiddleware, (req, res) => {
    const articles = getAll(`
        SELECT id, title, title_en, slug, summary_en, content, cover_image, seo_title, faq_items, status, created_at
        FROM news ORDER BY id DESC`)

    const result = articles.map(a => {
        let faqCount = 0
        try { faqCount = JSON.parse(a.faq_items || '[]').length } catch {}

        // Strip HTML for product type detection
        const plainContent = (a.content || '').replace(/<[^>]*>/g, ' ').substring(0, 800)
        const productType = detectProductType(a.title_en || a.title, plainContent)

        const hint = productType
            ? `This article is about ${productType.label}. FAQ MUST cover ${productType.type}-specific topics. Do NOT mention: ${productType.must_not_mention.join(', ')}.`
            : 'General steel industry article. FAQ should cover topics actually mentioned in the article content.'

        return {
            id: a.id,
            title: a.title_en || a.title,
            slug: a.slug,
            status: a.status,
            faq_count: faqCount,
            needs_faq: faqCount < 5,
            product_type: productType?.type || 'GENERAL',
            hint,
            cover_image: a.cover_image || null
        }
    })

    const needsFaq = result.filter(a => a.needs_faq)
    const hasFaq = result.filter(a => !a.needs_faq)

    res.json({
        total: result.length,
        needs_faq_count: needsFaq.length,
        has_faq_count: hasFaq.length,
        // Articles needing FAQ come first for easy processing
        articles: [...needsFaq, ...hasFaq],
        workflow: [
            '1. Pick article from this list where needs_faq=true',
            '2. GET /api/external/news/:id → get full content + faq_writing_guide',
            '3. Write 5-7 FAQ pairs based on article content and faq_writing_guide',
            '4. PUT /api/external/news/:id/faq → submit {"faq_items":[{"question":"...","answer":"..."},...]}',
            '5. Repeat for next article'
        ]
    })
})

// ─── GET /api/external/news/:id — get single news article with FAQ writing guide
router.get('/news/:id', apiKeyMiddleware, (req, res) => {
    const n = getOne('SELECT * FROM news WHERE id = ?', [req.params.id])
    if (!n) return res.status(404).json({ error: 'News not found' })

    let faqCount = 0
    let currentFaq = []
    try { currentFaq = JSON.parse(n.faq_items || '[]'); faqCount = currentFaq.length } catch {}

    // Detect product type from article
    const plainContent = (n.content || '').replace(/<[^>]*>/g, ' ').substring(0, 800)
    const productType = detectProductType(n.title_en || n.title, plainContent)

    // Build content excerpt (first 600 chars of plain text) to help AI understand article
    const contentExcerpt = plainContent.replace(/\s+/g, ' ').trim().substring(0, 600)

    res.json({
        ...n,
        faq_count: faqCount,
        current_faq: currentFaq,
        content_excerpt: contentExcerpt,
        // ── FAQ Writing Guide ── The most important part for product-specific FAQ
        faq_writing_guide: productType ? {
            product_type: productType.type,
            product_label: productType.label,
            CRITICAL_RULE: `All FAQ questions and answers MUST be about ${productType.label}. Do NOT write FAQ about other product types.`,
            must_cover_topics: productType.must_cover,
            must_not_mention: productType.must_not_mention,
            sample_questions: productType.sample_questions,
            format: 'Return as JSON array: [{"question":"...","answer":"..."},{"question":"...","answer":"..."}]',
            min_count: 5,
            max_count: 7,
            answer_length: '2-4 sentences per answer. Include specific numbers, standards, or technical details.'
        } : {
            product_type: 'GENERAL',
            CRITICAL_RULE: 'Write FAQ based ONLY on topics covered in this specific article. Do not invent unrelated content.',
            format: 'Return as JSON array: [{"question":"...","answer":"..."}]',
            min_count: 5,
            max_count: 7,
            answer_length: '2-4 sentences per answer.'
        }
    })
})

// ─── PUT /api/external/news/:id/faq — dedicated FAQ update endpoint ──────────
// Validates FAQ format + warns on cross-product contamination
router.put('/news/:id/faq', apiKeyMiddleware, (req, res) => {
    const { id } = req.params
    const article = getOne('SELECT id, title, title_en, content, faq_items FROM news WHERE id = ?', [id])
    if (!article) return res.status(404).json({ error: 'Article not found' })

    const { faq_items } = req.body
    if (!faq_items) return res.status(400).json({ error: 'faq_items is required' })

    // Parse and validate
    let faqs
    try {
        faqs = Array.isArray(faq_items) ? faq_items : JSON.parse(faq_items)
    } catch (e) {
        return res.status(400).json({ error: 'faq_items must be a valid JSON array', hint: '[{"question":"Q1","answer":"A1"},{"question":"Q2","answer":"A2"}]' })
    }

    if (!Array.isArray(faqs)) return res.status(400).json({ error: 'faq_items must be an array' })
    if (faqs.length < 3) return res.status(400).json({ error: `Need at least 3 FAQ pairs, got ${faqs.length}. Minimum 5 recommended.` })

    // Validate each item
    for (let i = 0; i < faqs.length; i++) {
        if (!faqs[i].question || !faqs[i].answer) {
            return res.status(400).json({ error: `FAQ item ${i + 1} missing question or answer field` })
        }
    }

    // Cross-product contamination check (warn only, don't block)
    const warnings = []
    const plainContent = (article.content || '').replace(/<[^>]*>/g, ' ').substring(0, 800)
    const articleProductType = detectProductType(article.title_en || article.title, plainContent)
    if (articleProductType) {
        const faqText = faqs.map(f => f.question + ' ' + f.answer).join(' ').toLowerCase()
        for (const forbiddenTerm of articleProductType.must_not_mention) {
            if (faqText.includes(forbiddenTerm.toLowerCase())) {
                warnings.push(`FAQ mentions "${forbiddenTerm}" which is NOT a ${articleProductType.type} product topic. This may confuse search engines.`)
            }
        }
    }

    // Save to DB
    const faqJson = JSON.stringify(faqs)
    run(`UPDATE news SET faq_items=?, updated_at=datetime('now') WHERE id=?`, [faqJson, id])

    res.json({
        success: true,
        article_id: parseInt(id),
        article_title: article.title_en || article.title,
        faq_count: faqs.length,
        product_type: articleProductType?.type || 'GENERAL',
        warnings: warnings.length ? warnings : undefined,
        message: warnings.length
            ? `FAQ saved with ${warnings.length} product-type warning(s). Please review.`
            : `FAQ updated successfully with ${faqs.length} Q&A pairs. FAQPage schema will be active on next page load.`
    })
})

// Product reviews use the same X-API-Key middleware as the existing external API.
registerExternalProductReviewRoutes(router, {
    store: productReviewStore,
    middleware: apiKeyMiddleware
})

// Deprecated compatibility endpoint: product reviews are queued as pending.
// Article reviews are rejected because the moderated review domain is product-only.
router.post('/seo-reviews', apiKeyMiddleware, createLegacySeoReviewHandler({ store: productReviewStore }))

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
        seo_title, seo_description, seo_keywords, faq_items, slug
    } = req.body

    if (!name && !name_en) return res.status(400).json({ error: 'name or name_en is required' })

    // Auto-generate SEO fields if not provided
    const cat = category_id ? getOne('SELECT name_en, name FROM categories WHERE id = ?', [category_id]) : null
    const catName = cat?.name_en || cat?.name || 'Steel Coil'
    const autoSeo = autoSeoProduct(name_en || name, description_en || description, catName)
    const finalSeoTitle = seo_title || autoSeo.seo_title
    const finalSeoDesc = seo_description || autoSeo.seo_description
    const finalSeoKw = seo_keywords || autoSeo.seo_keywords

    const baseSlugStr = slugify(name_en || name) || 'product'
    const finalSlug = slug || uniqueSlug('products', baseSlugStr)

    let newId
    try {
        const result = run(`
            INSERT INTO products (name, name_en, slug, category_id, description, description_en, specs, images, detail_content, is_featured, sort_order, status, seo_title, seo_description, seo_keywords, faq_items)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            name || name_en, name_en || null, finalSlug, category_id || null,
            description || null, description_en || null, specs || null,
            images || '', detail_content || null,
            parseInt(is_featured || 0), parseInt(sort_order || 0), parseInt(status ?? 1),
            finalSeoTitle, finalSeoDesc, finalSeoKw,
            faq_items || '[]'
        ])
        newId = result.lastInsertRowid
    } catch (err) {
        if (err.message && err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Slug already exists' })
        }
        return res.status(500).json({ error: err.message })
    }

    res.json({
        success: true,
        id: newId,
        slug: finalSlug,
        seo_title: finalSeoTitle,
        seo_description: finalSeoDesc,
        seo_auto_generated: !seo_title,
        message: 'Product created successfully'
    })
})

// ─── POST /api/external/news — create news article ──────────────────────────
router.post('/news', apiKeyMiddleware, (req, res) => {
    const {
        title, title_en, summary, summary_en, content, cover_image,
        seo_title, seo_description, seo_keywords, status, render_mode,
        faq_items, category_name, category_id, slug
    } = req.body

    if (!title && !title_en) return res.status(400).json({ error: 'title or title_en is required' })

    // Resolve category: prefer category_name lookup, fallback to category_id
    let resolvedCatId = category_id || null
    if (category_name && !resolvedCatId) {
        const cat = getOne('SELECT id FROM news_categories WHERE LOWER(name_en) = LOWER(?) OR LOWER(name) = LOWER(?)', [category_name, category_name])
        if (cat) resolvedCatId = cat.id
        else {
            // Auto-create new category
            const slug = category_name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')
            const r = run('INSERT INTO news_categories (name_en, name, slug, sort_order) VALUES (?,?,?,?)', [category_name, category_name, slug, 99])
            resolvedCatId = r.lastInsertRowid
        }
    }

    // Auto-generate SEO fields if not provided
    const autoSeo = autoSeoNews(title_en || title, summary_en || summary)
    const finalSeoTitle = seo_title || autoSeo.seo_title
    const finalSeoDesc = seo_description || autoSeo.seo_description
    const finalSeoKw = seo_keywords || autoSeo.seo_keywords

    const baseSlugStr = slugify(title_en || title) || 'news'
    const finalSlug = slug || uniqueSlug('news', baseSlugStr)

    let newId
    try {
        const result = run(`
            INSERT INTO news (title, title_en, slug, summary, summary_en, content, cover_image, seo_title, seo_description, seo_keywords, status, sort_order, render_mode, faq_items, category_id)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `, [
            title || title_en, title_en || null, finalSlug,
            summary || null, summary_en || null, content || null,
            cover_image || null,
            finalSeoTitle, finalSeoDesc, finalSeoKw,
            parseInt(status ?? 1), 0, render_mode || 'direct',
            faq_items || '[]', resolvedCatId
        ])
        newId = result.lastInsertRowid
    } catch (err) {
        if (err.message && err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Slug already exists' })
        }
        return res.status(500).json({ error: err.message })
    }

    res.json({
        success: true,
        id: newId,
        slug: finalSlug,
        category_id: resolvedCatId,
        seo_title: finalSeoTitle,
        seo_description: finalSeoDesc,
        seo_auto_generated: !seo_title,
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
        seo_title, seo_description, seo_keywords, faq_items, slug
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
    if (slug !== undefined) { sets.push('slug=?'); vals.push(slug) }
    if (slug !== undefined) { sets.push('slug=?'); vals.push(slug) }

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
    const existing = getOne('SELECT * FROM news WHERE id = ?', [id])
    if (!existing) return res.status(404).json({ error: 'News not found' })
    const {
        title, title_en, summary, summary_en, content, cover_image,
        seo_title, seo_description, seo_keywords, status, render_mode,
        faq_items, category_name, category_id, slug
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
    if (faq_items !== undefined) { sets.push('faq_items=?'); vals.push(faq_items) }
    if (slug !== undefined) { sets.push('slug=?'); vals.push(slug) }
    if (slug !== undefined) { sets.push('slug=?'); vals.push(slug) }
    // category_name resolution
    if (category_name !== undefined) {
        let resolvedCatId = category_id || null
        const cat = getOne('SELECT id FROM news_categories WHERE LOWER(name_en) = LOWER(?) OR LOWER(name) = LOWER(?)', [category_name, category_name])
        if (cat) resolvedCatId = cat.id
        else {
            const slug = category_name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')
            const r = run('INSERT INTO news_categories (name_en, name, slug, sort_order) VALUES (?,?,?,?)', [category_name, category_name, slug, 99])
            resolvedCatId = r.lastInsertRowid
        }
        sets.push('category_id=?'); vals.push(resolvedCatId)
    } else if (category_id !== undefined) {
        sets.push('category_id=?'); vals.push(category_id)
    }

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

// ─── GET /api/external/translation-prompts ──────────────────────────────────
router.get('/translation-prompts', apiKeyMiddleware, (req, res) => {
    const { search, page = 1, limit = 50 } = req.query
    let where = ['1=1'], params = []
    if (search) {
        where.push('(name LIKE ? OR content LIKE ?)')
        const s = `%${search}%`; params.push(s, s)
    }
    const total = getOne(`SELECT COUNT(*) as c FROM translation_prompts WHERE ${where.join(' AND ')}`, params)?.c || 0
    const offset = (parseInt(page) - 1) * parseInt(limit)
    const prompts = getAll(
        `SELECT id, name, content, is_system, is_default, created_at
         FROM translation_prompts WHERE ${where.join(' AND ')} ORDER BY is_default DESC, id DESC LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), offset]
    )
    res.json({ prompts, total, page: parseInt(page), limit: parseInt(limit) })
})

// ─── GET /api/external/translation-prompts/:id ──────────────────────────────
router.get('/translation-prompts/:id', apiKeyMiddleware, (req, res) => {
    const t = getOne('SELECT * FROM translation_prompts WHERE id = ?', [req.params.id])
    if (!t) return res.status(404).json({ error: 'Prompt not found' })
    res.json(t)
})

// ─── POST /api/external/translation-prompts ─────────────────────────────────
router.post('/translation-prompts', apiKeyMiddleware, (req, res) => {
    const { name, content, is_default } = req.body
    if (!name || !content) return res.status(400).json({ error: 'name and content are required' })
    
    if (is_default) run('UPDATE translation_prompts SET is_default = 0')
    const r = run('INSERT INTO translation_prompts (name, content, is_default) VALUES (?,?,?)',
        [name, content, is_default ? 1 : 0])
    res.json({ success: true, id: r.lastInsertRowid, message: 'Translation prompt created successfully' })
})

// ─── PUT /api/external/translation-prompts/:id ──────────────────────────────
router.put('/translation-prompts/:id', apiKeyMiddleware, (req, res) => {
    const { id } = req.params
    const existing = getOne('SELECT * FROM translation_prompts WHERE id = ?', [id])
    if (!existing) return res.status(404).json({ error: 'Prompt not found' })
    
    const { name, content, is_default } = req.body
    const sets = []
    const vals = []
    
    if (name !== undefined) { sets.push('name=?'); vals.push(name) }
    if (content !== undefined) {
        if (existing.is_system) return res.status(400).json({ error: 'Cannot modify system prompt content' })
        sets.push('content=?'); vals.push(content)
    }
    if (is_default !== undefined) {
        if (is_default) run('UPDATE translation_prompts SET is_default = 0')
        sets.push('is_default=?'); vals.push(is_default ? 1 : 0)
    }
    
    if (!sets.length) return res.status(400).json({ error: 'No fields to update' })
    vals.push(id)
    run(`UPDATE translation_prompts SET ${sets.join(',')} WHERE id = ?`, vals)
    res.json({ success: true, message: 'Translation prompt updated' })
})

// ─── DELETE /api/external/translation-prompts/:id ───────────────────────────
router.delete('/translation-prompts/:id', apiKeyMiddleware, (req, res) => {
    const existing = getOne('SELECT * FROM translation_prompts WHERE id = ?', [req.params.id])
    if (!existing) return res.status(404).json({ error: 'Prompt not found' })
    if (existing.is_system) return res.status(400).json({ error: 'Cannot delete system prompt' })
    
    run('DELETE FROM translation_prompts WHERE id = ?', [req.params.id])
    res.json({ success: true, message: 'Translation prompt deleted' })
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

// ─── POST /api/external/send-email ──────────────────────────────────────────
router.post('/send-email', apiKeyMiddleware, async (req, res) => {
    const { to_email, to_name, subject, html_body, template_id, account_id } = req.body
    if (!to_email) return res.status(400).json({ error: 'to_email is required' })

    let finalSubject = subject || ''
    let finalBody = html_body || ''
    let tpl = null

    // If template_id is provided, load the template
    if (template_id) {
        tpl = getOne('SELECT * FROM mail_templates WHERE id = ?', [template_id])
        if (tpl) {
            finalSubject = finalSubject || tpl.subject || ''
            finalBody = finalBody || tpl.html_body || ''
        }
    }

    if (!finalSubject && !finalBody) {
        return res.status(400).json({ error: 'Must provide either subject/html_body or a valid template_id' })
    }

    // Replace basic variables
    const vars = { name: to_name || '', email: to_email }
    for (const [k, v] of Object.entries(vars)) {
        const regex = new RegExp(`\\{\\{${k}\\}\\}`, 'gi')
        finalSubject = finalSubject.replace(regex, v)
        finalBody = finalBody.replace(regex, v)
    }

    // Find SMTP account
    let smtp = null
    if (account_id) {
        smtp = getOne('SELECT * FROM smtp_accounts WHERE id = ? AND enabled = 1', [account_id])
    }
    if (!smtp) {
        smtp = getOne('SELECT * FROM smtp_accounts WHERE enabled = 1 ORDER BY is_default DESC, id ASC LIMIT 1')
    }
    if (!smtp) return res.status(500).json({ error: 'No enabled SMTP accounts found' })

    const transport = nodemailer.createTransport({
        host: smtp.smtp_host,
        port: parseInt(smtp.smtp_port) || 465,
        secure: parseInt(smtp.smtp_port) === 465,
        auth: { user: smtp.smtp_user, pass: smtp.smtp_pass },
        tls: { rejectUnauthorized: false }
    })

    try {
        const info = await transport.sendMail({
            from: `"${smtp.from_name || 'SunSea Steel'}" <${smtp.smtp_user}>`,
            to: to_email,
            subject: finalSubject,
            html: finalBody
        })

        // Log success
        run(`INSERT INTO mail_logs (task_id, contact_email, contact_name, template_id, account_id, account_name, subject, sent_html, status, sent_at, message_id)
             VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, 'sent', ?, ?)`,
            [to_email, to_name || '', template_id || null, smtp.id, smtp.name || smtp.smtp_user, finalSubject, finalBody, new Date().toISOString(), info.messageId || '']
        )
        // Increment send count
        run('UPDATE smtp_accounts SET send_count = send_count + 1 WHERE id = ?', [smtp.id])

        res.json({ success: true, message: 'Email sent successfully', messageId: info.messageId })
    } catch (e) {
        // Log failure
        run(`INSERT INTO mail_logs (task_id, contact_email, contact_name, template_id, account_id, account_name, subject, sent_html, status, sent_at, error_msg)
             VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, 'failed', ?, ?)`,
            [to_email, to_name || '', template_id || null, smtp.id, smtp.name || smtp.smtp_user, finalSubject, finalBody, new Date().toISOString(), e.message]
        )
        res.status(500).json({ success: false, error: 'Failed to send email: ' + e.message })
    }
})

router.get('/docs', (req, res) => {
    // Dynamically load data from DB
    const cats = getAll('SELECT id, name, name_en, slug FROM categories ORDER BY sort_order')
    const catList = cats.map(c => ({ id: c.id, name: c.name_en || c.name, slug: c.slug }))
    const mediaGroups = getAll(`SELECT mg.id, mg.name, mg.slug,
        (SELECT COUNT(*) FROM media m WHERE m.group_id = mg.id AND m.status = 1) as image_count
        FROM media_groups mg ORDER BY mg.sort_order, mg.name`)
    const newsCats = getAll('SELECT id, name, name_en, slug FROM news_categories ORDER BY sort_order')

    res.json({
        info: 'SunSea Steel External API — Content Creation Guide for AI Systems',
        version: '3.0',
        base_url: req.protocol + '://' + req.get('host') + '/api/external',
        auth: {
            method: 'Header: X-API-Key',
            description: 'All write endpoints require X-API-Key in HTTP header. GET /media/groups and GET /media also require API key.',
            cloudflare_waf_bypass: {
                warning: 'If you receive a 403 error with code 1010, you are being blocked by Cloudflare WAF (Bot Fight Mode).',
                solution: 'You MUST provide standard browser-like headers in your requests: "User-Agent", "Referer", and "Origin".',
                example_headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Origin': 'https://www.sunseasteel.com',
                    'Referer': 'https://www.sunseasteel.com/'
                }
            }
        },

        // ═══ Product Categories ═══
        product_categories: {
            description: 'Product category_id mapping. Use these IDs when creating products.',
            list: catList
        },

        // ═══ News Categories ═══
        news_categories: {
            description: 'News article grouping. Pass category_name (string) or category_id when creating/updating news articles.',
            list: newsCats.map(c => ({ id: c.id, name_en: c.name_en, name: c.name, slug: c.slug })),
            usage: 'Pass "category_name": "Product Introduction" to auto-assign. New categories are created automatically.'
        },

        // ═══ Media Library ═══
        media_library: {
            description: 'Read-only access to the media library. Use to get real image URLs for products and articles.',
            groups: mediaGroups,
            matching_hints: {
                description: 'Map content type to group_slug when calling GET /api/external/media',
                rules: [
                    { keywords: ['GI', 'galvanized', 'hot-dip zinc', 'zinc coated', 'Z40', 'Z275'], group_slug: 'gi', example_product: 'Galvanized Steel Coil' },
                    { keywords: ['GL', 'galvalume', 'aluzinc', 'aluminum-zinc', 'AZ150', 'AZ50'], group_slug: 'gl', example_product: 'Galvalume Steel Coil' },
                    { keywords: ['PPGI', 'PPGL', 'prepainted', 'color coated', 'RAL', 'painted steel'], group_slug: 'ppgi', example_product: 'PPGI / PPGL Color Coated Coil' },
                    { keywords: ['CRC', 'cold rolled', 'cold-rolled', 'SPCC', 'DC01'], group_slug: 'crc', example_product: 'Cold Rolled Steel Coil' },
                    { keywords: ['roofing', 'roof sheet', 'corrugated', 'IBR', 'tile sheet'], group_slug: 'roofing', example_product: 'Steel Roofing Sheet' }
                ],
                tip: 'If a new group is added by admin, call GET /api/external/media/groups to get the latest list automatically.'
            },
            workflow: [
                '1. GET /api/external/media/groups → get all groups + matching hints',
                '2. Match product/content to the correct group_slug',
                '3. GET /api/external/media?group_slug=gi&limit=5 → get image URLs',
                '4. Use filepath values directly in: images field (comma-separated), detail_content <img> src, cover_image'
            ]
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
                update: { method: 'PUT', path: '/api/external/products/:id', note: '只传需要更新的字段. Supports slug.' },
                delete: { method: 'DELETE', path: '/api/external/products/:id' }
            },
            news: {
                list: {
                    method: 'GET', path: '/api/external/news',
                    query_params: { search: 'Search title (EN/CN)', status: '0=draft 1=published', page: 'page num (default 1)', limit: 'per page (default 50)' }
                },
                faq_status: {
                    method: 'GET', path: '/api/external/news/faq-status',
                    description: 'Get ALL articles sorted by missing FAQ first. Each article includes product_type and hint for AI-friendly FAQ writing.',
                    response_fields: {
                        articles: 'Array of all articles with faq_count, needs_faq, product_type, hint fields',
                        needs_faq_count: 'Number of articles with <5 FAQ items'
                    }
                },
                get_by_id: {
                    method: 'GET', path: '/api/external/news/:id',
                    description: 'Returns full article + current_faq + content_excerpt + faq_writing_guide (product-specific topics to cover)'
                },
                update_faq: {
                    method: 'PUT', path: '/api/external/news/:id/faq',
                    description: 'Dedicated FAQ update endpoint. Validates format, validates product-type match, saves to DB.',
                    body: {
                        faq_items: '(required) Array or JSON string: [{"question":"...","answer":"..."}, ...]. Min 3 pairs, recommend 5-7.'
                    },
                    CRITICAL_FAQ_RULE: 'FAQ content MUST match the article product type. GI article → GI FAQs only. GL article → GL FAQs only. Cross-product FAQ contamination is flagged as warnings in the response.',
                    workflow: [
                        '1. GET /api/external/news/faq-status → find articles needing FAQ (needs_faq=true)',
                        '2. GET /api/external/news/:id → read content_excerpt + faq_writing_guide',
                        '3. Write 5-7 FAQ based on article content and faq_writing_guide.must_cover_topics',
                        '4. PUT /api/external/news/:id/faq with {"faq_items":[...]}'
                    ]
                },
                create: {
                    method: 'POST',
                    path: '/api/external/news',
                    note: 'seo_title/description/keywords are AUTO-GENERATED if not provided. Always provide faq_items for GEO optimization.',
                    body: {
                        title: '(required) Article title (Chinese)',
                        title_en: '(recommended) Article title (English)',
                        summary: '(string) Chinese summary',
                        summary_en: '(string) English summary (used for auto SEO description)',
                        content: '(HTML string) Article body HTML',
                        cover_image: '(string) Cover image URL — get from GET /api/external/media?group_slug=gi',
                        category_name: '(string) News group name — e.g. "Product Introduction" or "Cases". Auto-creates if not found.',
                        category_id: '(integer) News category ID — alternative to category_name',
                        seo_title: '(string, optional) SEO title ≤60 chars. AUTO-GENERATED from title_en if omitted.',
                        seo_description: '(string, optional) SEO description ≤160 chars. AUTO-GENERATED from summary_en if omitted.',
                        seo_keywords: '(string, optional) SEO keywords comma-separated. AUTO-GENERATED if omitted.',
                        faq_items: '(JSON string) FAQ array. Format: [{"question":"...","answer":"..."}]. MUST match article product type.',
                        status: '(0/1) 0=draft 1=published',
                        render_mode: '(string) direct (default, best SEO) or iframe (for content with <style> tags)'
                    },
                    faq_requirement: 'Always include faq_items — it generates FAQPage JSON-LD schema for Google SGE, ChatGPT, Perplexity. FAQ must match article product type (GI article = GI FAQs, not GL/PPGI).'
                },
                update: { method: 'PUT', path: '/api/external/news/:id', note: 'Pass only fields to update. slug, faq_items, category_name supported.' },
                delete: { method: 'DELETE', path: '/api/external/news/:id' }
            },
            media: {
                get_groups: {
                    method: 'GET', path: '/api/external/media/groups',
                    description: 'Get all media groups with image counts. Returns matching_hints to map product types to group slugs. Call FIRST before fetching images.',
                    headers: { 'X-API-Key': 'Required' }
                },
                search: {
                    method: 'GET', path: '/api/external/media',
                    description: 'Get images from a specific group or search by filename/alt text.',
                    query_params: {
                        group_slug: '(string) Group slug — e.g. gi, gl, ppgi, crc, roofing',
                        group_id: '(integer) Group ID — alternative to group_slug',
                        search: '(string) Search by original_filename or alt text',
                        limit: '(integer) Max results (default 10)',
                        page: '(integer) Page number (default 1)'
                    },
                    response_fields: 'items[].filepath — use this URL directly in images, cover_image, or <img> src',
                    example_workflow: [
                        'GET /api/external/media/groups → find gi group slug',
                        'GET /api/external/media?group_slug=gi&limit=5 → get GI coil images',
                        'Use items[0].filepath in images field: "/uploads/gi-coil-main.webp"'
                    ]
                }
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
            },
            translation_prompts: {
                list: {
                    method: 'GET', path: '/api/external/translation-prompts',
                    query_params: { search: '搜索提示词名称/内容', page: '页码(默认1)', limit: '每页数量(默认50)' }
                },
                get_by_id: { method: 'GET', path: '/api/external/translation-prompts/:id', note: '获取单个提示词的详细内容' },
                create: {
                    method: 'POST',
                    path: '/api/external/translation-prompts',
                    body: {
                        name: '(required) 提示词规则名称，如 "俄语小语种限制规则"',
                        content: '(required) 规则的具体文本描述',
                        is_default: '(integer) 是否作为默认提示词 (1=是, 0=否)'
                    }
                },
                update: { 
                    method: 'PUT', 
                    path: '/api/external/translation-prompts/:id', 
                    note: '只传需要更新的字段。注意：系统提示词 (is_system=1) 无法修改内容 (content)'
                },
                delete: { 
                    method: 'DELETE', 
                    path: '/api/external/translation-prompts/:id', 
                    note: '注意：系统默认的核心提示词 (is_system=1) 无法删除'
                }
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

