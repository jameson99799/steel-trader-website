import { Router } from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import https from 'https'
import http from 'http'
import { parse as parseHTML } from 'node-html-parser'

const router = Router()

// Helper: override translation settings with default AI channel if available
function enhanceWithDefaultChannel(settings) {
    const ch = getOne('SELECT * FROM ai_channels WHERE is_default = 1')
    if (!ch) return settings
    const s = { ...settings }
    // Use channel's API url and key if translation_settings has defaults or empty
    if (ch.api_url) s.api_url = ch.api_url
    if (ch.api_key) s.api_key = ch.api_key
    // Use channel's default_model, or first model in list
    if (ch.default_model) s.model_name = ch.default_model
    else {
        const models = JSON.parse(ch.models || '[]')
        if (models.length > 0) s.model_name = models[0]
    }
    return s
}

// ─── Settings ────────────────────────────────────────────────────────────────

router.get('/settings', (req, res) => {
    const s = getOne('SELECT * FROM translation_settings WHERE id = 1')
    if (s && s.api_key && s.api_key.length > 8) {
        s.api_key_display = s.api_key.slice(0, 4) + '****' + s.api_key.slice(-4)
    }
    res.json(s || {})
})

router.put('/settings', authMiddleware, (req, res) => {
    const { api_url, api_key, model_name, multilingual_enabled } = req.body
    const existing = getOne('SELECT * FROM translation_settings WHERE id = 1')
    const finalKey = (api_key && !api_key.includes('****')) ? api_key : (existing?.api_key || '')
    run(
        'UPDATE translation_settings SET api_url=?, api_key=?, model_name=?, multilingual_enabled=?, updated_at=CURRENT_TIMESTAMP WHERE id=1',
        [api_url || 'https://api.openai.com/v1', finalKey, model_name || 'gpt-3.5-turbo', multilingual_enabled != null ? (multilingual_enabled ? 1 : 0) : 1]
    )
    res.json({ message: 'Saved' })
})

router.get('/multilingual-status', (req, res) => {
    const s = getOne('SELECT multilingual_enabled FROM translation_settings WHERE id = 1')
    res.json({ enabled: s ? !!s.multilingual_enabled : true })
})

// ─── HTTP helper (no external deps) ─────────────────────────────────────────

function httpRequest(urlStr, options = {}, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr)
        const lib = url.protocol === 'https:' ? https : http
        const reqOptions = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        }
        const req = lib.request(reqOptions, (res) => {
            let data = ''
            res.on('data', chunk => { data += chunk })
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
                catch (e) { resolve({ status: res.statusCode, body: data }) }
            })
        })
        req.on('error', reject)
        req.setTimeout(120000, () => { req.destroy(new Error('Request timeout 120s')) })
        if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body))
        req.end()
    })
}

async function callAI(settings, messages, maxTokens = 4000) {
    const apiUrl = (settings.api_url || 'https://api.openai.com/v1').replace(/\/$/, '') + '/chat/completions'
    const result = await httpRequest(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${settings.api_key}`,
            'Content-Type': 'application/json'
        }
    }, {
        model: settings.model_name || 'gpt-3.5-turbo',
        messages,
        temperature: 0.3,
        max_tokens: maxTokens
    })
    if (result.status !== 200) {
        const errMsg = typeof result.body === 'object'
            ? (result.body?.error?.message || JSON.stringify(result.body))
            : result.body
        throw new Error(`API Error ${result.status}: ${errMsg}`)
    }
    return result.body?.choices?.[0]?.message?.content || ''
}

// ─── Models ──────────────────────────────────────────────────────────────────

router.post('/models', authMiddleware, async (req, res) => {
    const s = getOne('SELECT * FROM translation_settings WHERE id = 1')
    const apiUrl = (req.body.api_url || s?.api_url || 'https://api.openai.com/v1').replace(/\/$/, '') + '/models'
    const apiKey = (req.body.api_key && !req.body.api_key.includes('****')) ? req.body.api_key : (s?.api_key || '')
    if (!apiKey) return res.status(400).json({ error: 'API key not configured' })
    try {
        const result = await httpRequest(apiUrl, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        })
        if (result.status !== 200) return res.status(result.status).json({ error: JSON.stringify(result.body) })
        const models = (result.body?.data || []).map(m => m.id).filter(Boolean).sort()
        res.json({ models })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// ─── Block-level HTML translation (inspired by read-frog / immersive-translate) ─
// Translates complete block elements (p, h1-h6, li, td, th, div) as units,
// preserving inline HTML tags. Produces coherent, selectable text.

const BLOCK_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th', 'dt', 'dd', 'figcaption', 'blockquote', 'caption'])
const SKIP_TAGS = new Set(['style', 'script', 'code', 'pre', 'svg', 'math', 'noscript'])

function extractBlockSegments(html) {
    if (!html || typeof html !== 'string') return { root: null, blocks: [] }
    
    let bodyHtml = html
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
    if (bodyMatch) bodyHtml = bodyMatch[1]
    
    const root = parseHTML(bodyHtml, { comment: false })
    const blocks = []
    let blockId = 0
    
    function walk(node) {
        if (!node || node.nodeType === 3) return
        const tag = (node.tagName || '').toLowerCase()
        
        if (SKIP_TAGS.has(tag)) return
        if (node.classList && node.classList.contains('replace-tip')) return
        
        // Block element with text -> translate as a unit
        if (BLOCK_TAGS.has(tag)) {
            const textContent = node.textContent.trim()
            if (textContent.length > 1 && /[a-zA-Z]/.test(textContent)) {
                blocks.push({ id: blockId++, tag, innerHTML: node.innerHTML, node })
                return
            }
        }
        
        // Non-block elements: div, span, a -> only if no block children
        if (['div', 'section', 'article', 'span', 'a', 'label', 'strong', 'em', 'b', 'i'].includes(tag)) {
            const children = node.childNodes || []
            let hasBlockChildren = false
            for (const child of children) {
                if (child.nodeType === 1) {
                    const ct = (child.tagName || '').toLowerCase()
                    if (BLOCK_TAGS.has(ct) || ['div', 'section', 'ul', 'ol', 'table', 'article'].includes(ct)) {
                        hasBlockChildren = true
                        break
                    }
                }
            }
            if (!hasBlockChildren) {
                const textContent = node.textContent.trim()
                if (textContent.length > 2 && /[a-zA-Z]/.test(textContent)
                    && !textContent.includes('{') && !textContent.includes('var(')) {
                    blocks.push({ id: blockId++, tag, innerHTML: node.innerHTML, node })
                    return
                }
            }
        }
        
        for (const child of (node.childNodes || [])) {
            if (child.nodeType === 1) walk(child)
        }
    }
    
    walk(root)
    return { root, blocks }
}

function reassembleFromBlocks(html, root, translatedBlocks) {
    for (const block of translatedBlocks) {
        if (block.translated && block.node) {
            block.node.set_content(block.translated)
        }
    }
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
    if (bodyMatch) return html.replace(bodyMatch[1], root.toString())
    return root.toString()
}

// ─── Content collector — EXPANDED to cover ALL site content ──────────────────

function collectProducts() {
    const rows = getAll('SELECT id, name_en, description_en, seo_title, seo_description, seo_keywords, detail_content, faq_items, specs FROM products WHERE status=1')
    const items = []
    for (const r of rows) {
        const itemName = r.name_en || `Product #${r.id}`
        if (r.name_en) items.push({ type: 'product', id: r.id, field: 'name', text: r.name_en, itemName })
        if (r.description_en) items.push({ type: 'product', id: r.id, field: 'description', text: r.description_en, itemName })
        if (r.seo_title) items.push({ type: 'product', id: r.id, field: 'seo_title', text: r.seo_title, itemName })
        if (r.seo_description) items.push({ type: 'product', id: r.id, field: 'seo_description', text: r.seo_description, itemName })
        if (r.seo_keywords) items.push({ type: 'product', id: r.id, field: 'seo_keywords', text: r.seo_keywords, itemName })
        if (r.detail_content && r.detail_content.length > 10) {
            items.push({ type: 'product', id: r.id, field: 'detail_content', text: r.detail_content, long_html: true, itemName })
        }
        if (r.faq_items) {
            try {
                const faqs = JSON.parse(r.faq_items)
                if (Array.isArray(faqs)) {
                    faqs.forEach((f, idx) => {
                        if (f.question) items.push({ type: 'product', id: r.id, field: `faq_q_${idx}`, text: f.question, itemName })
                        if (f.answer) items.push({ type: 'product', id: r.id, field: `faq_a_${idx}`, text: f.answer, itemName })
                    })
                }
            } catch (e) { }
        }
        if (r.specs) {
            try {
                const specs = JSON.parse(r.specs)
                if (Array.isArray(specs)) {
                    specs.forEach((s, idx) => {
                        if (s.name) items.push({ type: 'product', id: r.id, field: `spec_name_${idx}`, text: s.name, itemName })
                        if (s.value) items.push({ type: 'product', id: r.id, field: `spec_value_${idx}`, text: s.value, itemName })
                    })
                }
            } catch (e) { }
        }
    }
    return items
}

function collectNews() {
    const rows = getAll('SELECT id, title_en, summary_en, content, seo_title, seo_description, seo_keywords, faq_items FROM news WHERE status=1')
    const items = []
    for (const r of rows) {
        const itemName = r.title_en || `News #${r.id}`
        if (r.title_en) items.push({ type: 'news', id: r.id, field: 'title', text: r.title_en, itemName })
        if (r.summary_en) items.push({ type: 'news', id: r.id, field: 'summary', text: r.summary_en, itemName })
        if (r.seo_title) items.push({ type: 'news', id: r.id, field: 'seo_title', text: r.seo_title, itemName })
        if (r.seo_description) items.push({ type: 'news', id: r.id, field: 'seo_description', text: r.seo_description, itemName })
        if (r.seo_keywords) items.push({ type: 'news', id: r.id, field: 'seo_keywords', text: r.seo_keywords, itemName })
        if (r.content && r.content.length > 10) {
            items.push({ type: 'news', id: r.id, field: 'content', text: r.content, long_html: true, itemName })
        }
        if (r.faq_items) {
            try {
                const faqs = JSON.parse(r.faq_items)
                if (Array.isArray(faqs)) {
                    faqs.forEach((f, idx) => {
                        if (f.question) items.push({ type: 'news', id: r.id, field: `faq_q_${idx}`, text: f.question, itemName })
                        if (f.answer) items.push({ type: 'news', id: r.id, field: `faq_a_${idx}`, text: f.answer, itemName })
                    })
                }
            } catch (e) { }
        }
    }
    return items
}

function collectCompany() {
    const c = getOne('SELECT * FROM company WHERE id=1')
    if (!c) return []
    // Only translate description — company name, address, and contact info always stay in English
    return c.description_en
        ? [{ type: 'company', id: 1, field: 'description', text: c.description_en, itemName: '公司简介' }]
        : []
}

function collectPageTexts() {
    const pt = getOne('SELECT * FROM page_texts WHERE id=1')
    if (!pt) return []
    const fields = [
        'logo_subtitle', 'featured_subtitle_en', 'categories_subtitle_en',
        'advantages_subtitle_en', 'cta_title_en', 'cta_subtitle_en',
        'products_page_subtitle_en', 'contact_page_title_en', 'contact_page_subtitle_en',
        'contact_form_desc_en', 'inquiry_panel_title_en', 'contact_tagline_en',
        'about_overlay_text_en', 'about_tagline_en', 'about_cta_subtitle_en',
        'about_iso_en', 'about_global_en', 'about_innovation_en',
        'inquiry_subtitle_en'
    ]
    return fields.flatMap(f =>
        pt[f] ? [{ type: 'page_text', id: 1, field: f.replace(/_en$/, ''), text: pt[f], itemName: f.replace(/_en$/, '') }] : []
    )
}

function collectCategories() {
    const cats = getAll('SELECT id, name_en FROM categories')
    return cats.flatMap(c =>
        c.name_en ? [{ type: 'category', id: c.id, field: 'name', text: c.name_en, itemName: c.name_en }] : []
    )
}

function collectHero() {
    const h = getOne('SELECT * FROM hero_content WHERE id=1')
    if (!h) return []
    const fields = ['tag', 'title', 'subtitle', 'stat1_label', 'stat2_label', 'stat3_label']
    return fields.flatMap(f =>
        h[`${f}_en`] ? [{ type: 'hero', id: 1, field: f, text: h[`${f}_en`], itemName: `Hero ${f}` }] : []
    )
}

const PAGES = {
    products: collectProducts,
    news: collectNews,
    company: collectCompany,
    page_texts: collectPageTexts,
    categories: collectCategories,
    hero: collectHero
}

// ─── Translation core — handles both short text batches and long HTML ─────────

async function translateBatch(settings, items, targetLang, langName, overrideNote) {
    const results = []
    const errors = []

    // Separate long_html items from short text items
    const shortItems = items.filter(i => !i.long_html)
    const longItems = items.filter(i => i.long_html)

    // ── Translate short text in batches of 5 ──
    const BATCH = 5
    for (let i = 0; i < shortItems.length; i += BATCH) {
        const batch = shortItems.slice(i, i + BATCH)
        const numberedText = batch.map((item, idx) => `${idx + 1}. ${item.text}`).join('\n')
        const systemPrompt = `You are a professional translator for a steel products export company (GI GL PPGI PPGL steel coil, CRC, roofing sheets).
Translate each numbered line from English to ${langName}.
Rules: Keep product codes, model numbers, brand names, HTML tags, and technical specifications unchanged. Return ONLY a JSON object like {"1":"translation","2":"translation"}.
GLOSSARY (use these translations when applicable):
- Galvalume / GL = 镀铝锌 (for zh/Chinese)
- ALUZINC = 镀铝锌 (for zh/Chinese)
- PPGI = 彩涂镀锌 (for zh/Chinese)
- PPGL = 彩涂镀铝锌 (for zh/Chinese)
- GI = 镀锌 (for zh/Chinese)
- CRC = 冷轧卷 (for zh/Chinese)
DO NOT TRANSLATE these terms — keep them exactly as-is:
- "SHANDONG SUNSEA STEEL CO., LTD" (company name, never translate)
- ASTM, JIS, EN, GB/T (standards)
- Product model numbers and codes${overrideNote}`

        const MAX_RETRIES = 2
        let attempt = 0
        let success = false
        while (attempt <= MAX_RETRIES && !success) {
            try {
                const content = await callAI(settings, [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: numberedText }
                ])

                let translations = {}
                const jsonMatch = content.match(/\{[\s\S]*\}/)
                if (jsonMatch) {
                    try { translations = JSON.parse(jsonMatch[0]) } catch (e) {
                        attempt++
                        if (attempt > MAX_RETRIES) {
                            errors.push({ batch: Math.floor(i / BATCH) + 1, error: 'JSON parse error (retried ' + MAX_RETRIES + 'x): ' + content.slice(0, 200), errorCode: 'ERR_PARSE', itemName: batch.map(b => b.itemName).filter(Boolean).join(', ') })
                        }
                        continue
                    }
                } else {
                    attempt++
                    if (attempt > MAX_RETRIES) {
                        errors.push({ batch: Math.floor(i / BATCH) + 1, error: 'No JSON in response (retried ' + MAX_RETRIES + 'x): ' + content.slice(0, 200), errorCode: 'ERR_NO_JSON', itemName: batch.map(b => b.itemName).filter(Boolean).join(', ') })
                    }
                    continue
                }

                for (let j = 0; j < batch.length; j++) {
                    const item = batch[j]
                    const translated = translations[String(j + 1)]
                    if (!translated) {
                        errors.push({ item: item.text.slice(0, 60), error: 'No translation in response', errorCode: 'ERR_MISSING', itemName: item.itemName })
                        continue
                    }
                    upsertTranslation(targetLang, item.type, item.id, item.field, item.text, translated)
                    results.push({ original: item.text.slice(0, 80), translated: translated.slice(0, 120), type: item.type, field: item.field, itemName: item.itemName })
                }
                success = true
            } catch (e) {
                attempt++
                if (attempt > MAX_RETRIES) {
                    errors.push({ batch: Math.floor(i / BATCH) + 1, error: e.message + ' (retried ' + MAX_RETRIES + 'x)', errorCode: 'ERR_API', itemName: batch.map(b => b.itemName).filter(Boolean).join(', ') })
                }
            }
        }
    }

    // ── Translate long HTML using block-level DOM parsing ──
    for (const item of longItems) {
        try {
            const { root, blocks } = extractBlockSegments(item.text)
            if (!root || blocks.length === 0) continue

            const BLOCK_BATCH = 8 // blocks per API call
            const contextName = item.itemName ? `\nContext: This content is about "${item.itemName}".` : ''
            
            for (let i = 0; i < blocks.length; i += BLOCK_BATCH) {
                const batch = blocks.slice(i, i + BLOCK_BATCH)
                // Send full innerHTML of each block for translation
                const numberedText = batch.map((b, idx) => `${idx + 1}. ${b.innerHTML}`).join('\n')
                
                // Build previous context for coherence
                let prevContext = ''
                if (i > 0) {
                    const recent = blocks.slice(Math.max(0, i - 3), i)
                        .filter(b => b.translated)
                        .map(b => b.translated.replace(/<[^>]+>/g, ''))
                        .join(' ')
                    if (recent) prevContext = `\nPrevious translated context (for coherence): "${recent.slice(0, 200)}"`
                }

                const systemPrompt = `You are a professional translator for a steel products export company (GI GL PPGI PPGL steel coil, CRC, roofing sheets, galvanized/galvalume products).${contextName}${prevContext}
Translate each numbered HTML block from English to ${langName}.
CRITICAL RULES:
- Translate ALL text content completely, do NOT leave any English text untranslated
- Preserve ALL HTML tags (<strong>, <a>, <em>, <span>, <br>, etc.) exactly as they are
- Keep product codes, model numbers, brand names, units (mm, kg, MPa, etc.) unchanged
- Keep URLs, email addresses, and phone numbers unchanged
- Return ONLY a JSON object like {"1":"translated html","2":"translated html",...}
- Each value should be the complete translated HTML block
GLOSSARY (use these translations when applicable):
- Galvalume / GL = 镀铝锌 (for zh/Chinese)
- ALUZINC = 镀铝锌 (for zh/Chinese)
- PPGI = 彩涂镀锌 (for zh/Chinese)
- PPGL = 彩涂镀铝锌 (for zh/Chinese)
- GI = 镀锌 (for zh/Chinese)
- CRC = 冷轧卷 (for zh/Chinese)
DO NOT TRANSLATE these terms — keep them exactly as-is:
- "SHANDONG SUNSEA STEEL CO., LTD" (company name, never translate)
- ASTM, JIS, EN, GB/T (standards)
- Product model numbers and codes${overrideNote}`

                let batchSuccess = false
                for (let retry = 0; retry <= 2 && !batchSuccess; retry++) {
                    try {
                        const aiContent = await callAI(settings, [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: numberedText }
                        ], 4000)

                        let translations = {}
                        const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
                        if (jsonMatch) {
                            try { translations = JSON.parse(jsonMatch[0]); batchSuccess = true } catch (e) {
                                if (retry >= 2) {
                                    errors.push({ item: `${item.type}/${item.field} block${i}`, error: 'JSON parse error (retried 2x): ' + aiContent.slice(0, 300), errorCode: 'ERR_PARSE', itemName: item.itemName })
                                }
                                continue
                            }
                        } else {
                            if (retry >= 2) {
                                errors.push({ item: `${item.type}/${item.field} block${i}`, error: 'No JSON (retried 2x): ' + aiContent.slice(0, 300), errorCode: 'ERR_NO_JSON', itemName: item.itemName })
                            }
                            continue
                        }

                        for (let j = 0; j < batch.length; j++) {
                            const translated = translations[String(j + 1)]
                            if (translated) {
                                batch[j].translated = translated
                            }
                        }
                    } catch (e) {
                        if (retry >= 2) {
                            errors.push({ item: `${item.type}/${item.field} block${i}`, error: e.message + ' (retried 2x)', errorCode: 'ERR_API', itemName: item.itemName })
                        }
                    }
                }
            }

            const translatedCount = blocks.filter(b => b.translated).length
            if (translatedCount > 0) {
                const translatedHtml = reassembleFromBlocks(item.text, root, blocks)
                upsertTranslation(targetLang, item.type, item.id, item.field, '[HTML]', translatedHtml)
                results.push({ original: `[HTML ${item.field}]`, translated: `${translatedCount}/${blocks.length} blocks`, type: item.type, field: item.field, itemName: item.itemName })
            }
        } catch (e) {
            errors.push({ item: `${item.type}/${item.field} id=${item.id}`, error: e.message, errorCode: 'ERR_API', itemName: item.itemName })
        }
    }

    return { results, errors }
}

function upsertTranslation(lang, type, id, field, original, translated) {
    try {
        run(
            `INSERT INTO translations (language_code, content_type, content_id, content_field, original_text, translated_text, is_manual)
             VALUES (?, ?, ?, ?, ?, ?, 0)`,
            [lang, type, id || null, field, original, translated]
        )
    } catch (e) {
        try {
            run(
                `UPDATE translations SET translated_text=?, updated_at=CURRENT_TIMESTAMP
               WHERE language_code=? AND content_type=? AND content_id IS ? AND content_field=? AND is_manual=0`,
                [translated, lang, type, id || null, field]
            )
        } catch (e2) {
            // Also try with = instead of IS for non-null IDs
            try {
                run(
                    `UPDATE translations SET translated_text=?, updated_at=CURRENT_TIMESTAMP
                   WHERE language_code=? AND content_type=? AND content_id=? AND content_field=? AND is_manual=0`,
                    [translated, lang, type, id, field]
                )
            } catch (e3) { }
        }
    }
}

// ─── List items to translate (for progress display) ──────────────────────────

router.post('/items', authMiddleware, (req, res) => {
    const { page } = req.body
    const pageNames = page && page !== 'all' ? [page] : Object.keys(PAGES)
    const allItems = []
    for (const p of pageNames) {
        if (PAGES[p]) allItems.push(...PAGES[p]())
    }
    // Group by unique item (type + id) and return summary
    const grouped = {}
    for (const item of allItems) {
        const key = `${item.type}_${item.id}`
        if (!grouped[key]) {
            grouped[key] = { type: item.type, id: item.id, itemName: item.itemName || key, fields: [], hasHtml: false }
        }
        grouped[key].fields.push(item.field)
        if (item.long_html) grouped[key].hasHtml = true
    }
    res.json(Object.values(grouped))
})

// ─── Translate ONE item (type + id) to avoid timeout ─────────────────────────

router.post('/run-one', authMiddleware, async (req, res) => {
    const { lang: targetLang, content_type, content_id } = req.body
    if (!targetLang || targetLang === 'en') return res.status(400).json({ error: 'Invalid target language' })

    const langRow = getOne('SELECT * FROM languages WHERE code=?', [targetLang])
    if (!langRow) return res.status(400).json({ error: `Language "${targetLang}" not found` })

    const s = getOne('SELECT * FROM translation_settings WHERE id=1')
    if (!s?.api_key && !getOne('SELECT api_key FROM ai_channels WHERE is_default = 1')?.api_key) return res.status(400).json({ error: 'AI API key not configured. Please add an AI channel in AI Translation settings.' })

    // Map singular type names to PAGES keys (product -> products, category -> categories, etc.)
    const TYPE_TO_PAGE = { product: 'products', news: 'news', company: 'company', page_text: 'page_texts', category: 'categories', hero: 'hero' }
    const pageKey = TYPE_TO_PAGE[content_type] || content_type
    if (!PAGES[pageKey]) return res.status(400).json({ error: `Unknown content type: ${content_type}` })
    const allItems = PAGES[pageKey]()
    const items = allItems.filter(i => String(i.id) === String(content_id))

    if (items.length === 0) return res.json({ success: true, results: [], errors: [], total: 0, translated: 0 })

    const manualOverrides = getAll('SELECT original_text, translated_text FROM translations WHERE language_code=? AND is_manual=1', [targetLang])
    const overrideNote = manualOverrides.length > 0
        ? '\n\nUse these approved translations as reference:\n' +
        manualOverrides.slice(0, 8).map(o => `"${o.original_text}" → "${o.translated_text}"`).join('\n')
        : ''

    try {
        const { results, errors } = await translateBatch(enhanceWithDefaultChannel(s), items, targetLang, langRow.name, overrideNote)
        if (results.length > 0) {
            run('UPDATE languages SET ai_translated=1 WHERE code=?', [targetLang])
        }
        res.json({ success: true, results, errors, total: items.length, translated: results.length })
    } catch (e) {
        res.status(500).json({ error: e.message, errorCode: 'ERR_API' })
    }
})

// ─── Run full translation (per page or all) ──────────────────────────────────

router.post('/run', authMiddleware, async (req, res) => {
    const { lang: targetLang, page } = req.body
    if (!targetLang || targetLang === 'en') return res.status(400).json({ error: 'Invalid target language' })

    const langRow = getOne('SELECT * FROM languages WHERE code=?', [targetLang])
    if (!langRow) return res.status(400).json({ error: `Language "${targetLang}" not found` })

    const s = getOne('SELECT * FROM translation_settings WHERE id=1')
    if (!s?.api_key) return res.status(400).json({ error: 'AI API key not configured. Please save your API key first.' })

    // Collect items
    const pageNames = page && page !== 'all' ? [page] : Object.keys(PAGES)
    let items = []
    for (const p of pageNames) {
        if (PAGES[p]) items = items.concat(PAGES[p]())
    }

    if (items.length === 0) return res.json({ success: true, results: [], message: 'No content to translate.' })

    // Load manual overrides
    const manualOverrides = getAll('SELECT original_text, translated_text FROM translations WHERE language_code=? AND is_manual=1', [targetLang])
    const overrideNote = manualOverrides.length > 0
        ? '\n\nUse these approved translations as reference:\n' +
        manualOverrides.slice(0, 8).map(o => `"${o.original_text}" → "${o.translated_text}"`).join('\n')
        : ''

    const { results, errors } = await translateBatch(enhanceWithDefaultChannel(s), items, targetLang, langRow.name, overrideNote)

    if (results.length > 0) {
        run('UPDATE languages SET ai_translated=1 WHERE code=?', [targetLang])
    }

    res.json({ success: true, results, errors, total: items.length, translated: results.length })
})

// ─── Translate single product or article ─────────────────────────────────────

router.post('/translate-item', authMiddleware, async (req, res) => {
    const { type, id } = req.body
    if (!type || !id) return res.status(400).json({ error: 'type and id required' })

    const s = getOne('SELECT * FROM translation_settings WHERE id=1')
    if (!s?.api_key) return res.status(400).json({ error: 'AI API key not configured' })

    // Get all non-English active languages
    const langs = getAll("SELECT code, name FROM languages WHERE code != 'en' AND status=1")
    if (langs.length === 0) return res.status(400).json({ error: 'No target languages configured' })

    // Collect items for this single product/article
    let items = []
    if (type === 'product') {
        const r = getOne('SELECT id, name_en, description_en, seo_title, seo_description, seo_keywords, detail_content, faq_items, specs FROM products WHERE id=?', [id])
        if (!r) return res.status(404).json({ error: 'Product not found' })
        if (r.name_en) items.push({ type: 'product', id: r.id, field: 'name', text: r.name_en })
        if (r.description_en) items.push({ type: 'product', id: r.id, field: 'description', text: r.description_en })
        if (r.seo_title) items.push({ type: 'product', id: r.id, field: 'seo_title', text: r.seo_title })
        if (r.seo_description) items.push({ type: 'product', id: r.id, field: 'seo_description', text: r.seo_description })
        if (r.seo_keywords) items.push({ type: 'product', id: r.id, field: 'seo_keywords', text: r.seo_keywords })
        if (r.detail_content && r.detail_content.length > 10) {
            items.push({ type: 'product', id: r.id, field: 'detail_content', text: r.detail_content, long_html: true })
        }
        if (r.faq_items) {
            try {
                const faqs = JSON.parse(r.faq_items)
                if (Array.isArray(faqs)) faqs.forEach((f, idx) => {
                    if (f.question) items.push({ type: 'product', id: r.id, field: `faq_q_${idx}`, text: f.question })
                    if (f.answer) items.push({ type: 'product', id: r.id, field: `faq_a_${idx}`, text: f.answer })
                })
            } catch (e) { }
        }
        if (r.specs) {
            try {
                const specs = JSON.parse(r.specs)
                if (Array.isArray(specs)) specs.forEach((sp, idx) => {
                    if (sp.name) items.push({ type: 'product', id: r.id, field: `spec_name_${idx}`, text: sp.name })
                    if (sp.value) items.push({ type: 'product', id: r.id, field: `spec_value_${idx}`, text: sp.value })
                })
            } catch (e) { }
        }
    } else if (type === 'news') {
        const r = getOne('SELECT id, title_en, summary_en, content, seo_title, seo_description, seo_keywords, faq_items FROM news WHERE id=?', [id])
        if (!r) return res.status(404).json({ error: 'Article not found' })
        if (r.title_en) items.push({ type: 'news', id: r.id, field: 'title', text: r.title_en })
        if (r.summary_en) items.push({ type: 'news', id: r.id, field: 'summary', text: r.summary_en })
        if (r.seo_title) items.push({ type: 'news', id: r.id, field: 'seo_title', text: r.seo_title })
        if (r.seo_description) items.push({ type: 'news', id: r.id, field: 'seo_description', text: r.seo_description })
        if (r.seo_keywords) items.push({ type: 'news', id: r.id, field: 'seo_keywords', text: r.seo_keywords })
        if (r.content && r.content.length > 10) {
            items.push({ type: 'news', id: r.id, field: 'content', text: r.content, long_html: true })
        }
        if (r.faq_items) {
            try {
                const faqs = JSON.parse(r.faq_items)
                if (Array.isArray(faqs)) faqs.forEach((f, idx) => {
                    if (f.question) items.push({ type: 'news', id: r.id, field: `faq_q_${idx}`, text: f.question })
                    if (f.answer) items.push({ type: 'news', id: r.id, field: `faq_a_${idx}`, text: f.answer })
                })
            } catch (e) { }
        }
    } else {
        return res.status(400).json({ error: 'type must be "product" or "news"' })
    }

    if (items.length === 0) return res.json({ success: true, message: 'No translatable content found' })

    const allResults = []
    const allErrors = []

    for (const lang of langs) {
        const { results, errors } = await translateBatch(enhanceWithDefaultChannel(s), items, lang.code, lang.name, '')
        allResults.push(...results.map(r => ({ ...r, lang: lang.code })))
        allErrors.push(...errors.map(e => ({ ...e, lang: lang.code })))
    }

    res.json({ success: true, results: allResults, errors: allErrors, languages: langs.length, fields: items.length })
})

// ─── Progress ─────────────────────────────────────────────────────────────────

router.get('/progress/:lang', authMiddleware, (req, res) => {
    const count = getOne('SELECT COUNT(*) as c FROM translations WHERE language_code=?', [req.params.lang])
    const langRow = getOne('SELECT ai_translated FROM languages WHERE code=?', [req.params.lang])

    // Count total translatable items
    let total = 0
    for (const p of Object.values(PAGES)) {
        try { total += p().filter(i => !i.long_html).length } catch (e) { }
    }

    res.json({ count: count?.c || 0, total, ai_translated: langRow?.ai_translated || 0 })
})

// ─── Get translations for frontend rendering ─────────────────────────────────

router.get('/content/:lang', (req, res) => {
    const lang = req.params.lang
    if (!lang || lang === 'en') return res.json({})

    const rows = getAll('SELECT content_type, content_id, content_field, translated_text FROM translations WHERE language_code=?', [lang])
    // Group by type/id for easier frontend consumption
    const map = {}
    for (const r of rows) {
        const key = `${r.content_type}_${r.content_id || 0}`
        if (!map[key]) map[key] = {}
        map[key][r.content_field] = r.translated_text
    }
    res.json(map)
})

// ─── Search untranslated ─────────────────────────────────────────────────────

router.get('/search-untranslated/:lang', authMiddleware, (req, res) => {
    const lang = req.params.lang
    const query = (req.query.q || '').trim()
    const page = req.query.page || 'all'
    const results = []

    const pageNames = page && page !== 'all' ? [page] : Object.keys(PAGES)
    for (const p of pageNames) {
        if (!PAGES[p]) continue
        const items = PAGES[p]()
        for (const item of items) {
            if (item.long_html) continue // skip HTML in search
            if (query && !item.text.toLowerCase().includes(query.toLowerCase())) continue
            const t = getOne(
                'SELECT translated_text FROM translations WHERE language_code=? AND content_type=? AND content_id=? AND content_field=?',
                [lang, item.type, item.id, item.field]
            )
            if (!t?.translated_text) {
                results.push({ page: p, field: item.field, id: item.id, content_type: item.type, original: item.text })
            }
            if (results.length >= 100) break
        }
        if (results.length >= 100) break
    }

    res.json(results)
})

// ─── Manual override ──────────────────────────────────────────────────────────

router.post('/override', authMiddleware, (req, res) => {
    const { language_code, content_type, content_id, content_field, original_text, translated_text } = req.body
    if (!language_code || !content_field || !translated_text) return res.status(400).json({ error: 'missing required fields' })
    upsertTranslation(language_code, content_type || 'manual', content_id || null, content_field, original_text || '', translated_text)
    // Mark as manual
    try {
        run(
            `UPDATE translations SET is_manual=1 WHERE language_code=? AND content_type=? AND content_id IS ? AND content_field=?`,
            [language_code, content_type || 'manual', content_id || null, content_field]
        )
    } catch (e) { }
    res.json({ message: 'Saved' })
})

// ─── Get all translations for a language ─────────────────────────────────────

router.get('/:lang', authMiddleware, (req, res) => {
    if (['settings', 'multilingual-status', 'content'].includes(req.params.lang)) return res.status(404).json({ error: 'not found' })
    const rows = getAll('SELECT * FROM translations WHERE language_code=? ORDER BY content_type, content_field', [req.params.lang])
    res.json(rows)
})

export default router
