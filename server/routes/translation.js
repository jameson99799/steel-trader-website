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

// ─── Translation Prompts Management ─────────────────────────────────────────

router.get('/prompts', authMiddleware, (req, res) => {
    try {
        const prompts = getAll('SELECT * FROM translation_prompts ORDER BY is_default DESC, created_at DESC')
        res.json(prompts)
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

router.post('/prompts', authMiddleware, (req, res) => {
    const { name, content, is_default } = req.body
    if (!name || !content) return res.status(400).json({ error: 'Name and content are required' })
    try {
        if (is_default) run('UPDATE translation_prompts SET is_default = 0')
        const r = run('INSERT INTO translation_prompts (name, content, is_default) VALUES (?, ?, ?)', [name, content, is_default ? 1 : 0])
        res.json({ id: r.lastInsertRowid, name, content, is_default: is_default ? 1 : 0 })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

router.put('/prompts/:id', authMiddleware, (req, res) => {
    const { name, content, is_default } = req.body
    const id = req.params.id
    try {
        const existing = getOne('SELECT * FROM translation_prompts WHERE id = ?', [id])
        if (!existing) return res.status(404).json({ error: 'Prompt not found' })
        if (existing.is_system && content !== existing.content) {
            return res.status(400).json({ error: 'Cannot modify system prompt content' })
        }
        if (is_default) run('UPDATE translation_prompts SET is_default = 0')
        run('UPDATE translation_prompts SET name = ?, content = ?, is_default = ? WHERE id = ?', [name, existing.is_system ? existing.content : content, is_default ? 1 : 0, id])
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

router.delete('/prompts/:id', authMiddleware, (req, res) => {
    try {
        const existing = getOne('SELECT * FROM translation_prompts WHERE id = ?', [req.params.id])
        if (!existing) return res.status(404).json({ error: 'Prompt not found' })
        if (existing.is_system) return res.status(400).json({ error: 'Cannot delete system prompt' })
        run('DELETE FROM translation_prompts WHERE id = ?', [req.params.id])
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

router.put('/prompts/:id/default', authMiddleware, (req, res) => {
    try {
        run('UPDATE translation_prompts SET is_default = 0')
        run('UPDATE translation_prompts SET is_default = 1 WHERE id = ?', [req.params.id])
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

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

// ─── Concurrency Setting ────────────────────────────────────────────────────────

router.get('/concurrency', authMiddleware, (req, res) => {
    const s = getOne('SELECT concurrency FROM translation_settings WHERE id = 1')
    res.json({ concurrency: s?.concurrency || 3 })
})

router.put('/concurrency', authMiddleware, (req, res) => {
    const { concurrency } = req.body
    const c = parseInt(concurrency) || 3
    run('UPDATE translation_settings SET concurrency = ? WHERE id = 1', [c])
    // Update memory variable for background worker if it exists
    workerConcurrency = c
    res.json({ success: true, concurrency: c })
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
        req.setTimeout(300000, () => { req.destroy(new Error('Request timeout 300s')) })
        if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body))
        req.end()
    })
}

async function callAI(settings, messages, maxTokens = 8000) {
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
    let baseApiUrl = (req.body.api_url || s?.api_url || 'https://api.openai.com/v1').replace(/\/$/, '')
    if (baseApiUrl.endsWith('/chat/completions')) {
        baseApiUrl = baseApiUrl.replace(/\/chat\/completions$/, '')
    }
    const apiUrl = baseApiUrl + '/models'
    const apiKey = (req.body.api_key && !req.body.api_key.includes('****')) ? req.body.api_key : (s?.api_key || '')
    if (!apiKey) return res.status(400).json({ error: 'API key not configured' })
    try {
        const result = await httpRequest(apiUrl, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        })
        if (result.status !== 200) return res.status(502).json({ error: `AI API ${result.status}: ${JSON.stringify(result.body)}` })
        let body = result.body
        if (typeof body === 'string') {
            try { body = JSON.parse(body) } catch(e) {}
        }
        let modelsList = body?.data || body || []
        if (!Array.isArray(modelsList) && Array.isArray(body?.models)) modelsList = body.models
        const models = (Array.isArray(modelsList) ? modelsList : []).map(m => m.id || m).filter(Boolean).sort()
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
        
        // Core fields
        if (r.name_en) items.push({ type: 'product', id: r.id, field: 'name', text: r.name_en, itemName })
        if (r.description_en) items.push({ type: 'product', id: r.id, field: 'description', text: r.description_en, itemName })
        
        // SEO — combined into single field for efficient translation
        const seoObj = {}
        if (r.seo_title) seoObj.seo_title = r.seo_title
        if (r.seo_description) seoObj.seo_description = r.seo_description
        if (r.seo_keywords) seoObj.seo_keywords = r.seo_keywords
        if (Object.keys(seoObj).length > 0) {
            items.push({ type: 'product', id: r.id, field: 'seo_combined', text: JSON.stringify(seoObj), combined: true, subFields: Object.keys(seoObj), itemName })
        }
        
        // Detail HTML
        if (r.detail_content && r.detail_content.length > 10) {
            items.push({ type: 'product', id: r.id, field: 'detail_content', text: r.detail_content, long_html: true, itemName })
        }
        
        // FAQs — combined into single field
        if (r.faq_items) {
            try {
                const faqs = JSON.parse(r.faq_items)
                if (Array.isArray(faqs) && faqs.length > 0) {
                    const faqObj = {}
                    faqs.forEach((f, idx) => {
                        if (f.question) faqObj[`faq_q_${idx}`] = f.question
                        if (f.answer) faqObj[`faq_a_${idx}`] = f.answer
                    })
                    if (Object.keys(faqObj).length > 0) {
                        items.push({ type: 'product', id: r.id, field: 'faq_combined', text: JSON.stringify(faqObj), combined: true, subFields: Object.keys(faqObj), itemName })
                    }
                }
            } catch (e) { }
        }
        
        // Specs — combined into single field
        if (r.specs) {
            try {
                const specs = JSON.parse(r.specs)
                if (Array.isArray(specs) && specs.length > 0) {
                    const specObj = {}
                    specs.forEach((s, idx) => {
                        if (s.name) specObj[`spec_name_${idx}`] = s.name
                        if (s.value) specObj[`spec_value_${idx}`] = s.value
                    })
                    if (Object.keys(specObj).length > 0) {
                        items.push({ type: 'product', id: r.id, field: 'spec_combined', text: JSON.stringify(specObj), combined: true, subFields: Object.keys(specObj), itemName })
                    }
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
        
        // SEO combined
        const seoObj = {}
        if (r.seo_title) seoObj.seo_title = r.seo_title
        if (r.seo_description) seoObj.seo_description = r.seo_description
        if (r.seo_keywords) seoObj.seo_keywords = r.seo_keywords
        if (Object.keys(seoObj).length > 0) {
            items.push({ type: 'news', id: r.id, field: 'seo_combined', text: JSON.stringify(seoObj), combined: true, subFields: Object.keys(seoObj), itemName })
        }
        
        // Content HTML
        if (r.content && r.content.length > 10) {
            items.push({ type: 'news', id: r.id, field: 'content', text: r.content, long_html: true, itemName })
        }
        
        // FAQs combined
        if (r.faq_items) {
            try {
                const faqs = JSON.parse(r.faq_items)
                if (Array.isArray(faqs) && faqs.length > 0) {
                    const faqObj = {}
                    faqs.forEach((f, idx) => {
                        if (f.question) faqObj[`faq_q_${idx}`] = f.question
                        if (f.answer) faqObj[`faq_a_${idx}`] = f.answer
                    })
                    if (Object.keys(faqObj).length > 0) {
                        items.push({ type: 'news', id: r.id, field: 'faq_combined', text: JSON.stringify(faqObj), combined: true, subFields: Object.keys(faqObj), itemName })
                    }
                }
            } catch (e) { }
        }
    }
    return items
}

function collectCompany() {
    const c = getOne('SELECT * FROM company WHERE id=1')
    if (!c) return []
    const items = []
    // Only translate description and advantages — name, address, contact info stay in original language
    if (c.description_en) items.push({ type: 'company', id: 1, field: 'description', text: c.description_en, itemName: '公司简介', long_html: true })
    if (c.advantages_en) items.push({ type: 'company', id: 1, field: 'advantages', text: c.advantages_en, itemName: '公司优势', long_html: true })
    return items
}

function collectPageTexts() {
    const pt = getOne('SELECT * FROM page_texts WHERE id=1')
    if (!pt) return []
    const fields = [
        'featured_subtitle_en', 'categories_subtitle_en',
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

// Collect news category names (e.g. "Product Introduction", "Cases")
// IMPORTANT: use unique field keys (name_NC_{id}) because translateBatch
// merges all items into one JSON object — duplicate 'name' keys would overwrite each other
// translateBatch maps name_NC_* → 'name' at save time (via realField logic)
function collectNewsCategories() {
    const cats = getAll('SELECT id, name_en FROM news_categories WHERE name_en IS NOT NULL AND name_en != \'\'  ORDER BY sort_order, id')
    return cats.flatMap(c =>
        c.name_en ? [{ type: 'news_category', id: c.id, field: `name_NC_${c.id}`, text: c.name_en, itemName: `News Group: ${c.name_en}` }] : []
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

// ── Collect static UI text for translation ──
const UI_TEXTS_EN = {
    "home": "Home",
    "products": "Products",
    "about": "About Us",
    "contact": "Contact",
    "inquiry": "Inquiry",
    "sendInquiry": "Send Inquiry",
    "name": "Name",
    "email": "Email",
    "phone": "Phone",
    "company": "Company",
    "country": "Country",
    "message": "Message",
    "submit": "Submit",
    "cancel": "Cancel",
    "viewMore": "View More",
    "allProducts": "All Products",
    "featuredProducts": "Featured Products",
    "productCategories": "Product Categories",
    "ourAdvantages": "Our Advantages",
    "factoryDirect": "Factory Direct",
    "qualityAssurance": "Quality Assurance",
    "fastDelivery": "Fast Delivery",
    "customService": "Custom Service",
    "contactUs": "Contact Us",
    "getInTouch": "Get In Touch",
    "address": "Address",
    "specifications": "Specifications",
    "description": "Description",
    "relatedProducts": "Related Products",
    "relatedProductsDesc": "You may also be interested in these products",
    "relatedArticles": "Related Articles",
    "relatedArticlesDesc": "More insights you might find useful",
    "inquirySuccess": "Inquiry submitted successfully! We will contact you soon.",
    "required": "Required",
    "yearsExperience": "Years Experience",
    "productModels": "Product Models",
    "exportCountries": "Export Countries",
    "globalClients": "Global Clients",
    "news": "News",
    "newsCenter": "News Center",
    "whyChooseUs": "Why Choose Us",
    "categories": "Categories",
    "productsCount": "Products",
    "factoryDirectDesc": "Direct from manufacturer with competitive pricing and quality control",
    "qualityAssuranceDesc": "Rigorous testing and certification ensuring premium quality standards",
    "fastDeliveryDesc": "Efficient logistics and worldwide shipping for timely delivery",
    "customServiceDesc": "Tailored solutions and professional support for your specific needs",
    "readyToStart": "Ready to Start Your Project?",
    "getQuote": "Get in touch with our experts for professional solutions",
    "companyLabel": "Company",
    "factory": "Factory",
    "factoryTour": "Factory Tour",
    "factoryDesc": "Explore our modern manufacturing facilities and advanced production lines.",
    "ralColors": "RAL Colors",
    "ralColorChart": "RAL Color Chart",
    "ralDesc": "Standard RAL colors available for our prepainted steel coils (PPGI/PPGL).",
    "searchColor": "Search by RAL code or color name...",
    "noColorsFound": "No colors found matching your search.",
    "roofingProfiles": "Roofing Profiles",
    "roofingProfilesDesc": "Discover our wide range of corrugated roofing sheet profiles.",
    "aboutUs": "About Us",
    "featured": "Featured",
    "available": "products available",
    "noProductsFound": "No products found",
    "noProductsDesc": "Try adjusting your search or filter to find what you're looking for.",
    "viewAllProducts": "View All Products",
    "learnMore": "Learn more about our company and values",
    "ourAchievements": "Our Achievements",
    "achievementsDesc": "Numbers that speak for our excellence",
    "advantagesPageDesc": "Professional quality and service excellence in every aspect of our business operations.",
    "viewProducts": "View Products",
    "businessHours": "Business Hours",
    "followUs": "Follow Us",
    "monFri": "Monday - Friday",
    "saturday": "Saturday",
    "sunday": "Sunday",
    "closed": "Closed",
    "formIntro": "Fill out the form below and we'll get back to you within 24 hours",
    "sending": "Sending...",
    "privacyNote": "We respect your privacy and will never share your information with third parties.",
    "ourLocation": "Our Location",
    "newsUpdates": "News & Updates",
    "newsSubtitle": "Latest news, product knowledge and company updates",
    "readMore": "Read more →",
    "loadingNews": "Loading news...",
    "noNewsYet": "No news articles yet. Check back soon!",
    "prevPage": "← Prev",
    "nextPage": "Next →",
    "pageOf": "Page",
    "language": "Language",
    "clickToZoom": "Click to zoom",
    "productDetails": "Product Details",
    "sendEmail": "Send Email",
    "contactOurTeam": "Contact Our Team",
    "needMoreInfo": "Need more information? Scan to contact us directly.",
    "clickToEnlarge": "Click to enlarge",
    "scanQRWeChat": "Scan QR to add on WeChat",
    "backToNews": "← Back to News",
    "quickView": "Quick View",
    "contactInfo": "Contact Information",
    "yourRequirements": "Your Requirements",
    "placeholderName": "Your full name",
    "placeholderPhone": "+1 (555) 123-4567",
    "placeholderCompany": "Your company name",
    "placeholderCountry": "Your country",
    "placeholderMessage": "Please describe your steel requirements: product type, quantity, specifications, application, timeline, etc.",
    "benefit24h": "24-hour response",
    "benefitPricing": "Competitive pricing",
    "benefitQuality": "Quality guarantee",
    "articleNotFound": "Article not found",
    "inquiryForProduct": "I would like to inquire about",
    "browseArticlesIn": "Browse articles in:",
    "latestNews": "Latest News",
    "ralColorChart": "RAL Color",
    "ralColorBtn": "RAL Color",
    "ralSearchPlaceholder": "Search for your desired color.",
    "ralNoResult": "No colors found",
    "roofingProfilesBtn": "Roofing Profiles",
    "roofingTitle": "Roofing Sheet Profiles",
    "roofingSubtitle": "Common technical drawings and specifications for our steel roofing panels.",
    "allProfiles": "All Profiles",
    "surfaceControls": "Surface:",
    "ralColorControl": "RAL Color:",
    "roofing3dRendering": "3D RENDERING",
    "roofingProfileDimensions": "PROFILE & DIMENSIONS",
    "roofingSpecsTitle": "SPECIFICATIONS",
    "specMaterial": "Material",
    "specThickness": "Thickness (TCT)",
    "specEffectiveWidth": "Effective Width",
    "specOverallWidth": "Overall Width",
    "specPitch": "Pitch",
    "specRibHeight": "Rib Height",
    "specCoating": "Coating",
    "specLength": "Length",
    "specApplications": "Applications",
    "roofingTypeCorrugated": "Corrugated",
    "roofingTypeTrapezoidal": "Trapezoidal",
    "roofingTypeStandingSeam": "Standing Seam",
    "roofingTypeGlazedTile": "Glazed Tile",
    "roofingTypeWallPanel": "Wall Panel",
    "surfacePpgi": "PPGI / PPGL",
    "surfaceGi": "GI (Galvanized)",
    "surfaceGl": "GL (Galvalume)",
    "colorSelectRal": "Select RAL Color",
    "colorStandard": "Standard Color",
    "colorCustom": "Custom / Preset Color",
    "defaultLength": "Customizable (Max. 12m)",
    "defaultApplications": "Roofing, Wall Cladding, Siding",
    "defaultGiMaterial": "Galvanized Steel (GI)",
    "defaultGlMaterial": "Aluminum-Zinc Coated Steel (GL)",
    "defaultPpgiMaterial": "Pre-Painted Steel (PPGI/PPGL)",
    "defaultGiCoating": "Z60 – Z275 (Galvanized)",
    "defaultGlCoating": "AZ50 – AZ150 (Galvalume)",
    "defaultPpgiCoating": "PE / SMP / HDP / PVDF"
};

function collectUITexts() {
    const entries = Object.entries(UI_TEXTS_EN)
    const CHUNK_SIZE = 15  // read-frog style: small batches = higher AI success rate
    const items = []
    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
        const chunk = Object.fromEntries(entries.slice(i, i + CHUNK_SIZE))
        const chunkIdx = Math.floor(i / CHUNK_SIZE)
        items.push({
            type: 'ui_text', id: 'static', field: `ui_chunk_${chunkIdx}`,
            text: JSON.stringify(chunk),
            combined: true, subFields: Object.keys(chunk),
            itemName: `UI Text (batch ${chunkIdx + 1}/${Math.ceil(entries.length / CHUNK_SIZE)})`
        })
    }
    return items
}

function collectRalColors() {
    const colors = getAll('SELECT id, code, name_zh FROM ral_colors ORDER BY code ASC')
    return colors.map(c => ({
        type: 'ral_color',
        id: c.id,
        field: 'name',
        text: c.name_zh,
        itemName: `RAL ${c.code} (${c.name_zh})`
    }))
}

function collectRoofingCategories() {
    try {
        const categories = getAll('SELECT id, name, name_en FROM roofing_categories WHERE (name IS NOT NULL AND name != "") OR (name_en IS NOT NULL AND name_en != "")')
        return categories.map(c => {
            const textToTranslate = c.name_en || c.name;
            return {
                type: 'roofing_category',
                id: c.id,
                field: `name_RC_${c.id}`,
                text: textToTranslate,
                itemName: `Roofing Category: ${textToTranslate}`
            };
        })
    } catch (e) {
        return []
    }
}

function collectRoofingProfiles() {
    try {
        const profiles = getAll('SELECT id, model, material, thickness, coating, length, applications FROM roofing_profiles')
        const items = []
        for (const p of profiles) {
            if (p.model) items.push({ type: 'roofing_profile', id: p.id, field: 'model', text: p.model, itemName: `Profile ${p.id}: Model` })
            if (p.material) items.push({ type: 'roofing_profile', id: p.id, field: 'material', text: p.material, itemName: `Profile ${p.id}: Material` })
            if (p.thickness) items.push({ type: 'roofing_profile', id: p.id, field: 'thickness', text: p.thickness, itemName: `Profile ${p.id}: Thickness` })
            if (p.coating) items.push({ type: 'roofing_profile', id: p.id, field: 'coating', text: p.coating, itemName: `Profile ${p.id}: Coating` })
            if (p.length) items.push({ type: 'roofing_profile', id: p.id, field: 'length', text: p.length, itemName: `Profile ${p.id}: Length` })
            if (p.applications) items.push({ type: 'roofing_profile', id: p.id, field: 'applications', text: p.applications, itemName: `Profile ${p.id}: Applications` })
        }
        return items
    } catch (e) {
        return []
    }
}

function collectFactory() {
    try {
        const items = []
        const groups = getAll('SELECT id, name FROM factory_groups')
        for (const g of groups) {
            if (g.name) items.push({ type: 'factory_group', id: g.id, field: 'name', text: g.name, itemName: `Factory Group ${g.id}: Name` })
        }
        const media = getAll('SELECT id, description FROM factory_media WHERE type=\'video\' AND show_desc=1')
        for (const m of media) {
            if (m.description) items.push({ type: 'factory_media', id: m.id, field: 'description', text: m.description, itemName: `Factory Video ${m.id}: Description` })
        }
        return items
    } catch (e) {
        return []
    }
}

const PAGES = {
    ui_texts_static: () => collectUITexts(),
    products: collectProducts,
    news: collectNews,
    company: collectCompany,
    page_texts: collectPageTexts,
    categories: collectCategories,
    news_categories: collectNewsCategories,
    hero: collectHero,
    ral_colors: collectRalColors,
    roofing_categories: () => [...collectRoofingCategories(), ...collectRoofingProfiles()],
    roofing_profiles: collectRoofingProfiles,
    factory: collectFactory
};


    // Clean up garbled characters (replacement chars from truncated UTF-8)
    function cleanTranslation(text) {
        if (!text || typeof text !== 'string') return text
        return text.replace(/\uFFFD/g, '').replace(/\u{FFFD}/gu, '').replace(/\ufffd/g, '').replace(/\ufffd\ufffd\ufffd/g, '').trim()
    }

// ─── Translation core — handles both short text batches and long HTML ─────────
// ─── Translation core — SINGLE-CALL approach (like read-frog) ─────────────────
// Sends ALL short text fields in ONE API call as a JSON object.
// Long HTML is sent as complete text, not split into tiny blocks.
// This maximizes token efficiency and translation coherence.

async function translateBatch(settings, items, targetLang, langName, overrideNote, aiConcurrency = 3) {
    const results = []
    const errors = []
    
    // Fetch custom rules
    let businessRules = ''
    try {
        const defaultPromptRow = getOne('SELECT content FROM translation_prompts WHERE is_default = 1')
        if (defaultPromptRow && defaultPromptRow.content) {
            businessRules = `\n\n[Translation Rules]:\n${defaultPromptRow.content}`
        }
    } catch (e) {}
    const fullOverride = businessRules + (overrideNote ? `\n\n${overrideNote}` : '')

    const shortItems = items.filter(i => !i.long_html)
    const longItems = items.filter(i => i.long_html)

    // ── SHORT TEXT: Send ALL fields in ONE API call ──
    if (shortItems.length > 0) {
        // Build a merged JSON object — combined fields get expanded into sub-fields
        const fieldsObj = {}
        for (const item of shortItems) {
            if (item.combined) {
                try {
                    const subObj = JSON.parse(item.text)
                    Object.assign(fieldsObj, subObj)
                } catch (e) {
                    fieldsObj[item.field] = item.text
                }
            } else {
                fieldsObj[item.field] = item.text
            }
        }
        const fieldKeys = Object.keys(fieldsObj)
        const fieldVals = Object.values(fieldsObj)
        console.log('[translateBatch] Sending', fieldKeys.length, 'fields | JSON size:', JSON.stringify(fieldsObj).length, 'chars')

        // read-frog style: use NUMBERED lines instead of JSON to avoid ERR_NO_JSON
        // Format: "1. text1\n2. text2\n..." → AI returns "1. trans1\n2. trans2\n..."
        // Much more reliable than JSON for 3rd-party AI proxies
        const numberedInput = fieldVals.map((v, i) => `${i + 1}. ${v}`).join('\n')

        const systemPrompt = `Translate the following numbered items from English to ${langName}. This is content for a steel products company website.
Return ONLY numbered lines in the SAME order:
1. [translation of item 1]
2. [translation of item 2]
...
Rules:
- Translate ALL text completely and naturally
- Keep HTML tags, product codes, units (mm, kg, MPa) unchanged
- Keep URLs, email addresses unchanged
- DO NOT skip any numbered item${fullOverride}`

        const MAX_RETRIES = 2
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                const aiContent = await callAI(settings, [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: numberedInput }
                ], 16000)

                // Parse numbered response: "1. text\n2. text\n..."
                const lines = aiContent.split('\n').map(l => l.trim()).filter(Boolean)
                const translatedArr = []
                for (const line of lines) {
                    const m = line.match(/^\d+\.\s+(.+)$/)
                    if (m) translatedArr.push(m[1].trim())
                }

                if (translatedArr.length < Math.floor(fieldVals.length * 0.5)) {
                    // Fallback: try JSON format if numbered parsing got too few results
                    const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
                    if (jsonMatch) {
                        try {
                            const jsonTranslations = JSON.parse(jsonMatch[0])
                            // Map JSON response back to items
                            let anySuccess = false
                            for (const item of shortItems) {
                                const realField = item.field.startsWith('name_NC_') || item.field.startsWith('name_RC_') ? 'name' : item.field
                                if (item.combined) {
                                    try {
                                        const subObj = JSON.parse(item.text)
                                        for (const [subField, origVal] of Object.entries(subObj)) {
                                            const trans = jsonTranslations[subField]
                                            if (trans && typeof trans === 'string') {
                                                upsertTranslation(targetLang, item.type, item.id, subField, origVal, trans)
                                                results.push({ original: origVal.slice(0, 80), translated: trans.slice(0, 120), type: item.type, field: subField, itemName: item.itemName })
                                                anySuccess = true
                                            }
                                        }
                                    } catch {}
                                } else {
                                    const trans = jsonTranslations[item.field] || jsonTranslations[realField]
                                    if (trans && typeof trans === 'string') {
                                        upsertTranslation(targetLang, item.type, item.id, realField, item.text, trans)
                                        results.push({ original: item.text.slice(0, 80), translated: trans.slice(0, 120), type: item.type, field: realField, itemName: item.itemName })
                                        anySuccess = true
                                    }
                                }
                            }
                            if (anySuccess) break
                        } catch {}
                    }
                    if (attempt >= MAX_RETRIES) {
                        errors.push({ error: `Numbered parsing got ${translatedArr.length}/${fieldVals.length} items (retried ${MAX_RETRIES}x)`, errorCode: 'ERR_PARTIAL', itemName: shortItems[0]?.itemName })
                    }
                    continue
                }

                // Map numbered translations back to items
                let transIdx = 0
                for (const item of shortItems) {
                    const realField = item.field.startsWith('name_NC_') || item.field.startsWith('name_RC_') ? 'name' : item.field
                    if (item.combined) {
                        try {
                            const subObj = JSON.parse(item.text)
                            for (const [subField, origVal] of Object.entries(subObj)) {
                                const trans = translatedArr[transIdx++]
                                if (trans) {
                                    upsertTranslation(targetLang, item.type, item.id, subField, origVal, trans)
                                    results.push({ original: origVal.slice(0, 80), translated: trans.slice(0, 120), type: item.type, field: subField, itemName: item.itemName })
                                } else {
                                    errors.push({ item: subField, error: 'Missing numbered translation', errorCode: 'ERR_MISSING', itemName: item.itemName })
                                }
                            }
                        } catch (e) {
                            errors.push({ item: item.field, error: 'Combined field parse error', errorCode: 'ERR_PARSE', itemName: item.itemName })
                        }
                    } else {
                        const trans = translatedArr[transIdx++]
                        if (trans) {
                            upsertTranslation(targetLang, item.type, item.id, realField, item.text, trans)
                            results.push({ original: item.text.slice(0, 80), translated: trans.slice(0, 120), type: item.type, field: realField, itemName: item.itemName })
                        } else {
                            errors.push({ item: item.field, error: 'Missing numbered translation', errorCode: 'ERR_MISSING', itemName: item.itemName })
                        }
                    }
                }
                console.log('[translateBatch] Numbered format: mapped', translatedArr.length, 'translations to', shortItems.length, 'items')
                break  // Success
            } catch (e) {
                if (attempt >= MAX_RETRIES) {
                    errors.push({ error: e.message + ' (retried ' + MAX_RETRIES + 'x)', errorCode: 'ERR_API', itemName: shortItems[0]?.itemName })
                }
            }
        }
    }

    // ── LONG HTML: Send as COMPLETE text in ONE call (no block splitting) ──
    // For long HTML, send the entire content at once for coherent translation
    const AI_CONCURRENCY = aiConcurrency  // controlled per call-site to avoid rate limit when multiple langs are concurrent
    const runConcurrently = async (tasks, limit) => {
        const executing = new Set()
        for (const task of tasks) {
            const p = task().then(() => executing.delete(p))
            executing.add(p)
            if (executing.size >= limit) await Promise.race(executing)
        }
        await Promise.all(executing)
    }

    const htmlTasks = longItems.map(item => async () => {
        try {
            // Check content size - if very large (>15000 chars), use block splitting; otherwise send whole
            const contentLength = item.text.length
            const contextName = item.itemName || 'steel product'

            if (contentLength > 4000) {
                // HTML > 4000 chars: use block splitting (each block is fast and avoids timeout)
                const { root, blocks } = extractBlockSegments(item.text)
                if (!root || blocks.length === 0) {
                    // No blocks found, skip (don't try single call which may timeout)
                    console.log('[translateBatch] No blocks extracted from HTML, skipping:', item.itemName)
                    return
                }
                const BLOCK_BATCH = 8  // small batches = faster per AI call = no timeout
                const blockTasks = []
                for (let i = 0; i < blocks.length; i += BLOCK_BATCH) {
                    const batch = blocks.slice(i, i + BLOCK_BATCH)
                    blockTasks.push(async () => {
                        const numberedText = batch.map((b, idx) => `---BLOCK ${idx + 1}---\n${b.innerHTML}`).join('\n')
                        const blockPrompt = `Translate HTML blocks to ${langName}. Context: "${contextName}" steel product page.
Return the translated blocks in the exact same format using ---BLOCK N--- separators. Keep ALL HTML tags, attributes, URLs unchanged. Translate only visible text.
Example output format:
---BLOCK 1---
<p>Translated HTML</p>
---BLOCK 2---
<div>Translated HTML</div>${fullOverride}`
                        for (let retry = 0; retry <= 2; retry++) {
                            try {
                                const aiContent = await callAI(settings, [
                                    { role: 'system', content: blockPrompt },
                                    { role: 'user', content: numberedText }
                                ], 8000)
                                
                                const blockMatches = [...aiContent.matchAll(/---[\s]*BLOCK[\s]+(\d+)[\s]*---[\r\n]+([\s\S]*?)(?=\r?\n---[\s]*BLOCK|$)/gi)]
                                if (blockMatches.length > 0) {
                                    for (const match of blockMatches) {
                                        const idx = parseInt(match[1]) - 1
                                        if (idx >= 0 && idx < batch.length && match[2]) {
                                            batch[idx].translated = match[2].trim()
                                        }
                                    }
                                    break
                                } else {
                                    // Fallback: in case AI still outputs JSON
                                    const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
                                    if (jsonMatch) {
                                        const translations = JSON.parse(jsonMatch[0])
                                        for (let j = 0; j < batch.length; j++) {
                                            const translated = translations[String(j + 1)]
                                            if (translated) batch[j].translated = translated
                                        }
                                        break
                                    }
                                    throw new Error('No valid block separators or JSON found in AI response')
                                }
                            } catch (e) {
                                if (retry >= 2) errors.push({ error: e.message, errorCode: 'ERR_BLOCK', itemName: item.itemName })
                            }
                        }
                    })
                }
                // Run block batches concurrently
                await runConcurrently(blockTasks, AI_CONCURRENCY)

                const translatedCount = blocks.filter(b => b.translated).length
                if (translatedCount > 0) {
                    const translatedHtml = reassembleFromBlocks(item.text, root, blocks)
                    upsertTranslation(targetLang, item.type, item.id, item.field, '[HTML]', translatedHtml)
                    results.push({ original: '[HTML ' + item.field + ']', translated: translatedCount + '/' + blocks.length + ' blocks', type: item.type, field: item.field, itemName: item.itemName })
                }
            } else {
                // Normal HTML (<15000 chars): send ENTIRE content in ONE call
                const htmlPrompt = `Translate the following HTML content from English to ${langName}. Context: "${contextName}" steel product page.
Rules:
- Translate ALL visible text content completely
- Preserve ALL HTML tags, attributes, class names, styles, URLs exactly as-is
- Keep product codes, model numbers, units unchanged
- Return ONLY the translated HTML (no wrapper, no explanation)${fullOverride}`

                for (let retry = 0; retry <= 2; retry++) {
                    try {
                        const translated = await callAI(settings, [
                            { role: 'system', content: htmlPrompt },
                            { role: 'user', content: item.text }
                        ], 8000)  // 8000 max tokens keeps each call under 60s

                        if (translated && translated.length > 10) {
                            upsertTranslation(targetLang, item.type, item.id, item.field, '[HTML]', translated)
                            results.push({ original: '[HTML ' + item.field + ']', translated: '[Translated ' + translated.length + ' chars]', type: item.type, field: item.field, itemName: item.itemName })
                            break
                        }
                    } catch (e) {
                        if (retry >= 2) errors.push({ error: e.message + ' (retried 2x)', errorCode: 'ERR_HTML', itemName: item.itemName })
                    }
                }
            }
        } catch (e) {
            errors.push({ error: e.message, errorCode: 'ERR_API', itemName: item.itemName })
        }
    })

    // Run ALL long HTML items concurrently
    await runConcurrently(htmlTasks, AI_CONCURRENCY)

    return { results, errors }
}

// Cache for PRAGMA table_info results per language to avoid repeated DB schema queries
const _newsCatColCache = new Set()

function upsertTranslation(lang, type, id, field, original, translated) {
    // Clean garbled characters from translations
    if (translated && typeof translated === 'string') {
        translated = translated.replace(/\uFFFD/g, '').trim()
    }
    // For news_category names: also write directly to news_categories table
    // so localizedValue(cat, 'name') can find name_es / name_fr etc.
    if (type === 'news_category' && field === 'name' && id && lang) {
        const col = `name_${lang}`
        const cacheKey = col
        try {
            if (!_newsCatColCache.has(cacheKey)) {
                // Only check PRAGMA if we haven't confirmed column exists yet
                const tableInfo = getAll(`PRAGMA table_info(news_categories)`)
                const hasCol = tableInfo.some(c => c.name === col)
                if (!hasCol) {
                    run(`ALTER TABLE news_categories ADD COLUMN ${col} TEXT`)
                }
                _newsCatColCache.add(cacheKey) // cache: column confirmed to exist
            }
            run(`UPDATE news_categories SET ${col} = ? WHERE id = ?`, [translated, id])
        } catch (e) {
            // Ignore ALTER TABLE errors (column may already exist)
            _newsCatColCache.add(cacheKey) // still cache to avoid repeated attempts
        }
    }
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

// ─── Translate BULK items — aggregates ALL fields across multiple items for max token efficiency ──

router.post('/run-bulk', authMiddleware, async (req, res) => {
    const { lang: targetLang, items: requestedItems } = req.body
    // items = [{type:'product', id:1}, {type:'news', id:5}, ...]
    if (!targetLang || targetLang === 'en') return res.status(400).json({ error: 'Invalid target language' })
    if (!requestedItems || !requestedItems.length) return res.status(400).json({ error: 'No items' })

    const langRow = getOne('SELECT * FROM languages WHERE code=?', [targetLang])
    if (!langRow) return res.status(400).json({ error: 'Language not found' })

    const s = getOne('SELECT * FROM translation_settings WHERE id=1')
    if (!s?.api_key && !getOne('SELECT api_key FROM ai_channels WHERE is_default = 1')?.api_key) {
        return res.status(400).json({ error: 'AI API key not configured' })
    }

    const TYPE_TO_PAGE = { product: 'products', news: 'news', company: 'company', page_text: 'page_texts', category: 'categories', news_category: 'news_categories', hero: 'hero', ui_text: 'ui_texts_static', ral_color: 'ral_colors', roofing_category: 'roofing_categories', roofing_profile: 'roofing_profiles' }
    const manualOverrides = getAll('SELECT original_text, translated_text FROM translations WHERE language_code=? AND is_manual=1', [targetLang])
    let overrideNote = manualOverrides.length > 0
        ? '\n\nUse these approved translations as reference:\n' +
        manualOverrides.slice(0, 8).map(o => `"${o.original_text}" → "${o.translated_text}"`).join('\n')
        : ''

    let businessRules = ''
    try {
        const defaultPromptRow = getOne('SELECT content FROM translation_prompts WHERE is_default = 1')
        if (defaultPromptRow && defaultPromptRow.content) {
            businessRules = `\n\n[Translation Rules]:\n${defaultPromptRow.content}`
        }
    } catch (e) {}
    overrideNote = businessRules + overrideNote

    // Collect ALL fields from ALL requested items into one big list
    let allShortItems = []
    let allLongItems = []
    const itemMeta = [] // Track which item each field belongs to for progress reporting

    for (const ri of requestedItems) {
        const pageKey = TYPE_TO_PAGE[ri.type] || ri.type
        if (!PAGES[pageKey]) continue
        const pageItems = PAGES[pageKey]().filter(i => String(i.id) === String(ri.id))
        for (const item of pageItems) {
            if (item.long_html) {
                allLongItems.push({ ...item, _reqType: ri.type, _reqId: ri.id })
            } else {
                allShortItems.push({ ...item, _reqType: ri.type, _reqId: ri.id })
            }
        }
    }

    const enhanced = enhanceWithDefaultChannel(s)
    const results = []
    const errors = []

    // ── Keep-alive heartbeat: prevent Cloudflare 524 timeout ──
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()
    const keepAlive = setInterval(() => {
        try { res.write(' ') } catch (e) { clearInterval(keepAlive) }
    }, 25000)

    // ── Translate ALL short text fields in mega-batches ──
    const BATCH = 50
    for (let i = 0; i < allShortItems.length; i += BATCH) {
        const batch = allShortItems.slice(i, i + BATCH)
        const numberedText = batch.map((item, idx) => `${idx + 1}. ${item.text}`).join('\n')
        const systemPrompt = `Translate numbered lines to ${langRow.name}. Steel company context. Return JSON {"1":"...","2":"..."}.
Keep unchanged: codes, HTML, ASTM/JIS/EN/GB/T.${overrideNote}`

        const MAX_RETRIES = 2
        let attempt = 0
        let success = false
        while (!success && attempt <= MAX_RETRIES) {
            try {
                const content = await callAI(enhanced, [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: numberedText }
                ], 8000)
                // Parse JSON from response
                const jsonMatch = content.match(/\{[\s\S]*\}/)
                if (!jsonMatch) {
                    // Fallback: single item returned as plain text
                    const plainText = content.trim().replace(/^["']|["']$/g, '')
                    if (batch.length === 1 && plainText && plainText.length < 300 && !plainText.includes('{')) {
                        const item = batch[0]
                        const realField = item.field.match(/^name_(NC|RC)_/) ? 'name' : item.field
                        upsertTranslation(targetLang, item.type, item.id, realField, item.text, plainText)
                        results.push({ original: item.text.slice(0, 80), translated: plainText.slice(0, 120), type: item.type, field: realField, itemName: item.itemName })
                        success = true
                        break
                    }
                    attempt++
                    if (attempt > MAX_RETRIES) {
                        errors.push({ error: 'No JSON in AI response (retried ' + MAX_RETRIES + 'x)', errorCode: 'ERR_NO_JSON', itemName: batch.map(b => b.itemName).filter(Boolean).join(', ') })
                    }
                    continue
                }
                const translations = JSON.parse(jsonMatch[0])
                for (let j = 0; j < batch.length; j++) {
                    const item = batch[j]
                    const realField = item.field.match(/^name_(NC|RC)_/) ? 'name' : item.field
                    const translated = translations[String(j + 1)]
                    if (!translated) {
                        errors.push({ item: item.text.slice(0, 60), error: 'No translation', errorCode: 'ERR_MISSING', itemName: item.itemName })
                        continue
                    }
                    upsertTranslation(targetLang, item.type, item.id, realField, item.text, translated)
                    results.push({ original: item.text.slice(0, 80), translated: translated.slice(0, 120), type: item.type, field: item.field, itemName: item.itemName })
                }
                success = true
            } catch (e) {
                attempt++
                if (attempt > MAX_RETRIES) {
                    errors.push({ error: e.message + ' (retried ' + MAX_RETRIES + 'x)', errorCode: 'ERR_API', itemName: batch.map(b => b.itemName).filter(Boolean).join(', ') })
                }
            }
        }
    }

    // ── Translate long HTML items one by one (these are naturally large) ──
    for (const item of allLongItems) {
        try {
            const { root, blocks } = extractBlockSegments(item.text)
            if (!root || blocks.length === 0) continue

            const BLOCK_BATCH = 15
            const contextName = item.itemName ? `\nContext: This content is about "${item.itemName}".` : ''

            for (let i = 0; i < blocks.length; i += BLOCK_BATCH) {
                const batch = blocks.slice(i, i + BLOCK_BATCH)
                const numberedText = batch.map((b, idx) => `${idx + 1}. ${b.innerHTML}`).join('\n')
                let prevContext = ''
                if (i > 0) {
                    const recent = blocks.slice(Math.max(0, i - 3), i)
                    prevContext = '\nPrevious translated content for context:\n' + recent.map(b => b.innerHTML).join('\n')
                }
                const blockPrompt = `You are translating HTML content for a steel products company website from English to ${langRow.name}.
Translate each numbered HTML block. Preserve ALL HTML tags, attributes, CSS, and structure exactly. Only translate visible text content.
Return ONLY a JSON object like {"1":"<translated html>","2":"<translated html>"}.${contextName}${prevContext}${overrideNote}`
                try {
                    const aiContent = await callAI(enhanced, [
                        { role: 'system', content: blockPrompt },
                        { role: 'user', content: numberedText }
                    ], 8000)
                    const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
                    if (jsonMatch) {
                        const translations = JSON.parse(jsonMatch[0])
                        for (let j = 0; j < batch.length; j++) {
                            const translated = translations[String(j + 1)]
                            if (translated) batch[j].set_innerHTML(translated)
                        }
                    }
                } catch (e) {
                    errors.push({ error: e.message, errorCode: 'ERR_BLOCK', itemName: item.itemName })
                }
            }
            const translatedHtml = root.toString()
            upsertTranslation(targetLang, item.type, item.id, item.field, item.text, translatedHtml)
            results.push({ type: item.type, field: item.field, itemName: item.itemName, original: '[HTML]', translated: '[HTML translated]' })
        } catch (e) {
            errors.push({ error: e.message, errorCode: 'ERR_HTML', itemName: item.itemName })
        }
    }

    if (results.length > 0) {
        run('UPDATE languages SET ai_translated=1 WHERE code=?', [targetLang])
    }
    clearInterval(keepAlive)
    res.end(JSON.stringify({ success: true, results, errors, total: allShortItems.length + allLongItems.length, translated: results.length }))
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
    const TYPE_TO_PAGE = { product: 'products', news: 'news', company: 'company', page_text: 'page_texts', category: 'categories', news_category: 'news_categories', hero: 'hero', ui_text: 'ui_texts_static', ral_color: 'ral_colors', roofing_category: 'roofing_categories', roofing_profile: 'roofing_profiles' }
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

    // ── Keep-alive heartbeat: prevent Cloudflare 524 timeout ──
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()
    const keepAlive = setInterval(() => {
        try { res.write(' ') } catch (e) { clearInterval(keepAlive) }
    }, 25000)

    try {
        // Directly use translateBatch — the EXACT same function as full-site translation
        const { results, errors } = await translateBatch(enhanceWithDefaultChannel(s), items, targetLang, langRow.name, overrideNote)
        if (results.length > 0) {
            run('UPDATE languages SET ai_translated=1 WHERE code=?', [targetLang])
        }
        clearInterval(keepAlive)
        res.end(JSON.stringify({ success: true, results, errors, total: items.length, translated: results.length }))
    } catch (e) {
        clearInterval(keepAlive)
        res.end(JSON.stringify({ error: e.message, errorCode: 'ERR_API' }))
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


// Check translation status for a specific item across all active languages
router.get('/status/:type/:id', authMiddleware, (req, res) => {
    const { type, id } = req.params
    if (!['product', 'news', 'factory_group', 'factory_media'].includes(type)) return res.status(400).json({ error: 'Invalid type' })

    const langs = getAll("SELECT code, name FROM languages WHERE code != 'en' AND status=1")
    if (!langs.length) return res.json({ status: [] })

    // We can count how many fields are expected
    let expectedFields = 0
    if (type === 'product') {
        const r = getOne('SELECT name_en, description_en, seo_title, seo_description, seo_keywords, detail_content, faq_items, specs FROM products WHERE id=?', [id])
        if (r) {
            if (r.name_en) expectedFields++
            if (r.description_en) expectedFields++
            if (r.seo_title) expectedFields++
            if (r.seo_description) expectedFields++
            if (r.seo_keywords) expectedFields++
            if (r.detail_content) expectedFields++
            if (r.faq_items && r.faq_items !== '[]') expectedFields++
            if (r.specs && r.specs !== '[]') expectedFields++
        }
    } else if (type === 'news') {
        const r = getOne('SELECT title_en, summary_en, content, seo_title, seo_description, seo_keywords, faq_items FROM news WHERE id=?', [id])
        if (r) {
            if (r.title_en) expectedFields++
            if (r.summary_en) expectedFields++
            if (r.content) expectedFields++
            if (r.seo_title) expectedFields++
            if (r.seo_description) expectedFields++
            if (r.seo_keywords) expectedFields++
            if (r.faq_items && r.faq_items !== '[]') expectedFields++
        }
    } else if (type === 'factory_group') {
        const r = getOne('SELECT name FROM factory_groups WHERE id=?', [id])
        if (r && r.name) expectedFields = 1
    } else if (type === 'factory_media') {
        const r = getOne('SELECT description FROM factory_media WHERE id=?', [id])
        if (r && r.description) expectedFields = 1
    }


    if (expectedFields === 0) {
        return res.json({ status: langs.map(l => ({ code: l.code, name: l.name, translated: true, ratio: '0/0' })) })
    }

    // Get translations count per language for this item
    const rows = getAll('SELECT language_code, COUNT(*) as c FROM translations WHERE content_type=? AND content_id=? GROUP BY language_code', [type, id])
    const countMap = {}
    rows.forEach(r => countMap[r.language_code] = r.c)

    const status = langs.map(l => {
        const c = countMap[l.code] || 0
        return {
            code: l.code,
            name: l.name,
            translated: c >= expectedFields, // Full translation check
            count: c,
            total: expectedFields,
            ratio: `${c}/${expectedFields}`
        }
    })

    res.json({ status })
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



// ─── Serve UI text translations for frontend (public, no auth) ──────────────
router.get('/ui-texts/:lang', (req, res) => {
    const { lang } = req.params
    if (!lang || lang === 'en') return res.json({})
    
    try {
        // Get all ui_text translations for this language
        const rows = getAll(
            'SELECT content_field, translated_text FROM translations WHERE language_code = ? AND content_type = ? AND content_id = ?',
            [lang, 'ui_text', 'static']
        )
        
        const result = {}
        for (const row of rows) {
            result[row.content_field] = row.translated_text
        }
        
        // If we have a combined ui_combined field, it might contain JSON
        // Otherwise individual fields are already mapped
        res.json(result)
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// ─── Fuzzy search ALL translations (translated content) ──────────────────────
router.get('/search-translations/:lang', authMiddleware, (req, res) => {
    const { lang } = req.params
    const q = (req.query.q || '').trim()
    const page = req.query.page || 'all'
    
    if (!q || q.length < 1) return res.json([])
    
    // Search in translated_text for this language
    let sql = `SELECT id, language_code, content_type, content_id, content_field, 
                original_text, translated_text, is_manual 
                FROM translations WHERE language_code = ? AND translated_text LIKE ?`
    const params = [lang, `%${q}%`]
    
    // Filter by content type if specified
    if (page && page !== 'all') {
        const typeMap = { products: 'product', news: 'news', company: 'company', page_texts: 'page_text', categories: 'category', hero: 'hero' }
        const contentType = typeMap[page] || page
        sql += ' AND content_type = ?'
        params.push(contentType)
    }
    
    sql += ' ORDER BY id DESC LIMIT 100'
    
    try {
        const results = getAll(sql, params)
        res.json(results)
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// ─── Replace translation text (find & replace within translated content) ──────
router.post('/replace-translation', authMiddleware, (req, res) => {
    const { id, find_text, replace_text } = req.body
    if (!id || !find_text) return res.status(400).json({ error: 'Missing id or find_text' })
    
    try {
        const row = getOne('SELECT * FROM translations WHERE id = ?', [id])
        if (!row) return res.status(404).json({ error: 'Translation not found' })
        
        const newText = row.translated_text.replace(new RegExp(find_text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replace_text || '')
        
        run('UPDATE translations SET translated_text = ?, is_manual = 1 WHERE id = ?', [newText, id])
        res.json({ success: true, original: row.translated_text, updated: newText })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// ─── Batch replace text across ALL translations for a language ──────
router.post('/batch-replace', authMiddleware, (req, res) => {
    const { lang, find_text, replace_text, content_type } = req.body
    if (!lang || !find_text) return res.status(400).json({ error: 'Missing lang or find_text' })
    
    try {
        let sql = 'SELECT id, translated_text FROM translations WHERE language_code = ? AND translated_text LIKE ?'
        const params = [lang, `%${find_text}%`]
        if (content_type && content_type !== 'all') {
            const typeMap = { products: 'product', news: 'news', company: 'company', page_texts: 'page_text', categories: 'category', hero: 'hero' }
            sql += ' AND content_type = ?'
            params.push(typeMap[content_type] || content_type)
        }
        
        const rows = getAll(sql, params)
        let replaced = 0
        const escapedFind = find_text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        
        for (const row of rows) {
            const newText = row.translated_text.replace(new RegExp(escapedFind, 'g'), replace_text || '')
            if (newText !== row.translated_text) {
                run('UPDATE translations SET translated_text = ?, is_manual = 1 WHERE id = ?', [newText, row.id])
                replaced++
            }
        }
        
        res.json({ success: true, found: rows.length, replaced })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// ─── Translation status for products/news (per-item granular status) ─────────

router.get('/translation-status', authMiddleware, (req, res) => {
    const { type } = req.query  // 'product' or 'news' or 'factory_group'
    if (!type || !['product', 'news', 'factory_group'].includes(type)) return res.status(400).json({ error: 'Invalid type' })

    const nonEnLangs = getAll("SELECT code, name, flag FROM languages WHERE code != 'en' AND status = 1")
    if (!nonEnLangs.length) return res.json({ items: [], languages: [] })

    // Get all items with their actual content to determine expected field count
    let items = []
    if (type === 'product') {
        items = getAll(`SELECT p.id, p.name_en, p.description_en, p.seo_title, p.seo_description, p.seo_keywords,
            p.detail_content, p.faq_items, p.specs, p.category_id, p.created_at, c.name_en as category_name
            FROM products p LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.status = 1 ORDER BY p.id DESC`)
    } else if (type === 'news') {
        items = getAll(`SELECT id, title_en, summary_en, content, seo_title, seo_description, seo_keywords,
            faq_items, created_at FROM news WHERE status = 1 ORDER BY id DESC`)
    } else if (type === 'factory_group') {
        items = getAll(`SELECT id, name as name_en FROM factory_groups ORDER BY id DESC`)
    }

    // Calculate expected field count per item based on actual content
    function countExpectedFields(item, itemType) {
        let count = 0
        if (itemType === 'product') {
            if (item.name_en) count++
            if (item.description_en) count++
            if (item.seo_title) count++
            if (item.seo_description) count++
            if (item.seo_keywords) count++
            if (item.detail_content && item.detail_content.length > 10) count++
            if (item.faq_items) {
                try { const f = JSON.parse(item.faq_items); if (Array.isArray(f) && f.length > 0) count += f.length * 2 } catch {}
            }
            if (item.specs) {
                try { const s = JSON.parse(item.specs); if (Array.isArray(s) && s.length > 0) count += s.length * 2 } catch {}
            }
        } else if (itemType === 'news') {
            if (item.title_en) count++
            if (item.summary_en) count++
            if (item.seo_title) count++
            if (item.seo_description) count++
            if (item.seo_keywords) count++
            if (item.content && item.content.length > 10) count++
            if (item.faq_items) {
                try { const f = JSON.parse(item.faq_items); if (Array.isArray(f) && f.length > 0) count += f.length * 2 } catch {}
            }
        } else if (itemType === 'factory_group') {
            if (item.name_en) count++
        }
        return Math.max(count, 1)
    }

    // Get all translation counts in one query for efficiency
    const translationCounts = getAll(
        `SELECT content_id, language_code, COUNT(DISTINCT content_field) as field_count
         FROM translations WHERE content_type = ? AND content_id IS NOT NULL
         GROUP BY content_id, language_code`,
        [type]
    )
    const countMap = {}
    for (const tc of translationCounts) {
        if (!countMap[tc.content_id]) countMap[tc.content_id] = {}
        countMap[tc.content_id][tc.language_code] = tc.field_count
    }

    const result = items.map(item => {
        const expectedFields = countExpectedFields(item, type)
        const langStatus = {}
        const itemCounts = countMap[item.id] || {}
        for (const lang of nonEnLangs) {
            const count = itemCounts[lang.code] || 0
            if (count === 0) langStatus[lang.code] = 'none'
            // Consider "full" if translated at least 60% of expected fields (some combined fields merge)
            else if (count >= Math.max(2, Math.floor(expectedFields * 0.6))) langStatus[lang.code] = 'full'
            else langStatus[lang.code] = 'partial'
        }
        return {
            id: item.id,
            name: (type === 'product' || type === 'factory_group' ? item.name_en : item.title_en) || `#${item.id}`,
            category_id: item.category_id || null,
            category_name: item.category_name || null,
            created_at: item.created_at || null,
            languages: langStatus,
            expectedFields
        }
    })

    res.json({ items: result, languages: nonEnLangs })
})

// ─── Full Translation Audit (check ALL content across all languages) ─────────

router.get('/audit-translations', authMiddleware, (req, res) => {
    const nonEnLangs = getAll("SELECT code, name, flag FROM languages WHERE code != 'en' AND status = 1")
    if (!nonEnLangs.length) return res.json({ languages: [], report: [] })

    // Collect ALL translatable fields using the PAGES collector
    const productFields = PAGES.products ? PAGES.products() : []
    const newsFields = PAGES.news ? PAGES.news() : []
    const companyFields = PAGES.company ? PAGES.company() : []
    const pageTextFields = PAGES.page_texts ? PAGES.page_texts() : []
    const categoryFields = PAGES.categories ? PAGES.categories() : []
    const newsCategoryFields = PAGES.news_categories ? PAGES.news_categories() : []
    const heroFields = PAGES.hero ? PAGES.hero() : []
    const uiTextFields = PAGES.ui_texts_static ? PAGES.ui_texts_static() : []

    // Group fields by item, EXPANDING combined fields into actual stored sub-field names
    function groupByItem(fields, type) {
        const map = {}
        for (const f of fields) {
            const key = `${f.id}`
            if (!map[key]) map[key] = { id: f.id, type, itemName: f.itemName || `#${f.id}`, fields: [], basicFields: [], missingFields: [] }
            
            if (f.combined && f.text) {
                try {
                    const subObj = JSON.parse(f.text)
                    for (const subField of Object.keys(subObj)) {
                        map[key].fields.push(subField)
                    }
                } catch (e) {
                    map[key].fields.push(f.field)
                }
            } else if (f.long_html) {
                map[key].fields.push(f.field)
                map[key].basicFields.push(f.field)
            } else {
                // Map name_NC_{id} → 'name' to match what's stored in DB
                // (translateBatch uses name_NC_ to avoid key collision, but stores as 'name')
                const storedField = f.field.startsWith('name_NC_') ? 'name' : f.field
                map[key].fields.push(storedField)
                if (!f.field.startsWith('faq_') && !f.field.startsWith('spec_')) {
                    map[key].basicFields.push(storedField)
                }
            }
        }
        return Object.values(map)
    }

    const productItems = groupByItem(productFields, 'product')
    const newsItems = groupByItem(newsFields, 'news')

    // Add category info to products
    for (const p of productItems) {
        const prod = getOne('SELECT p.category_id, c.name_en as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?', [p.id])
        if (prod) {
            p.category_id = prod.category_id
            p.category_name = prod.category_name
        }
    }

    // Get ALL translation records
    const allTranslations = getAll(
        `SELECT content_type, content_id, language_code, content_field
         FROM translations WHERE content_id IS NOT NULL`
    )

    // Build lookup: { "product_1_zh": Set(['name','description',...]) }
    const transMap = {}
    for (const t of allTranslations) {
        const key = `${t.content_type}_${t.content_id}_${t.language_code}`
        if (!transMap[key]) transMap[key] = new Set()
        transMap[key].add(t.content_field)
    }

    // STRICT check: only "complete" if ALL fields are translated (100%)
    function checkItem(item, section, lang) {
        const key = `${item.type}_${item.id}_${lang.code}`
        const translated = transMap[key] || new Set()
        const totalFields = item.fields.length
        const translatedCount = item.fields.filter(f => translated.has(f)).length
        const missingFields = item.fields.filter(f => !translated.has(f))

        if (translatedCount === 0) {
            section.none++
            section.missing.push({
                id: item.id, name: item.itemName,
                category_id: item.category_id, category_name: item.category_name,
                status: 'none', translated: 0, total: totalFields,
                missingFields: missingFields.slice(0, 10)
            })
        } else if (translatedCount >= totalFields) {
            // STRICT: 100% = complete
            section.complete++
        } else {
            section.partial++
            section.missing.push({
                id: item.id, name: item.itemName,
                category_id: item.category_id, category_name: item.category_name,
                status: 'partial', translated: translatedCount, total: totalFields,
                missingFields: missingFields.slice(0, 10)
            })
        }
    }

    // Check UI texts: expand into individual keys and check each
    function checkUITexts(lang) {
        const uiKeys = Object.keys(UI_TEXTS_EN)
        const totalKeys = uiKeys.length
        // UI texts are stored as type='ui_text', id='static', field=each key name
        const translated = transMap[`ui_text_static_${lang.code}`] || new Set()
        const missingKeys = uiKeys.filter(k => !translated.has(k))
        const translatedCount = totalKeys - missingKeys.length
        return {
            total: totalKeys,
            translated: translatedCount,
            missing: missingKeys,
            complete: missingKeys.length === 0
        }
    }

    // Check simple content groups (company, page_texts, categories, hero)
    function checkSimpleGroup(fields, type, lang) {
        const section = { total: fields.length, complete: 0, partial: 0, none: 0, missing: [] }
        const items = groupByItem(fields, type)
        for (const item of items) {
            checkItem(item, section, lang)
        }
        return section
    }

    // Generate report per language
    const report = []
    for (const lang of nonEnLangs) {
        const langReport = {
            code: lang.code,
            name: lang.name,
            flag: lang.flag,
            products: { total: productItems.length, complete: 0, partial: 0, none: 0, missing: [] },
            news: { total: newsItems.length, complete: 0, partial: 0, none: 0, missing: [] },
            ui_texts: checkUITexts(lang),
            company: checkSimpleGroup(companyFields, 'company', lang),
            page_texts: checkSimpleGroup(pageTextFields, 'page_text', lang),
            categories: checkSimpleGroup(categoryFields, 'category', lang),
            news_categories: checkSimpleGroup(newsCategoryFields, 'news_category', lang),
            hero: checkSimpleGroup(heroFields, 'hero', lang)
        }

        for (const item of productItems) checkItem(item, langReport.products, lang)
        for (const item of newsItems) checkItem(item, langReport.news, lang)

        report.push(langReport)
    }

    res.json({ languages: nonEnLangs, report })
})

// ─── Selective translation (chosen items + chosen languages) ─────────────────

router.post('/run-selective', authMiddleware, async (req, res) => {
    const { type, ids, languages: targetLangs, concurrency: reqConcurrency } = req.body
    // type: 'product' | 'news'
    // ids: [1, 2, 3] — item IDs
    // languages: ['zh', 'es'] or ['all']
    // concurrency: number
    if (!type || !['product', 'news'].includes(type)) return res.status(400).json({ error: 'type must be product or news' })
    if (!ids || !ids.length) return res.status(400).json({ error: 'No items selected' })
    if (!targetLangs || !targetLangs.length) return res.status(400).json({ error: 'No languages selected' })

    const s = getOne('SELECT * FROM translation_settings WHERE id=1')
    if (!s?.api_key && !getOne('SELECT api_key FROM ai_channels WHERE is_default = 1')?.api_key) {
        return res.status(400).json({ error: 'AI API key not configured' })
    }

    // Determine language list
    let langs = []
    if (targetLangs.includes('all')) {
        langs = getAll("SELECT code, name FROM languages WHERE code != 'en' AND status = 1")
    } else {
        for (const code of targetLangs) {
            const l = getOne('SELECT code, name FROM languages WHERE code = ?', [code])
            if (l) langs.push(l)
        }
    }
    if (!langs.length) return res.status(400).json({ error: 'No valid languages found' })

    const enhanced = enhanceWithDefaultChannel(s)
    const TYPE_TO_PAGE = { product: 'products', news: 'news', company: 'company', page_text: 'page_texts', category: 'categories', news_category: 'news_categories', hero: 'hero', ui_text: 'ui_texts_static', ral_color: 'ral_colors', roofing_category: 'roofing_categories', roofing_profile: 'roofing_profiles', factory_group: 'factory', factory_media: 'factory' }
    const pageKey = TYPE_TO_PAGE[type]
    if (!PAGES[pageKey]) return res.status(400).json({ error: 'Invalid type' })

    const manualOverrides = {}
    for (const lang of langs) {
        const overrides = getAll('SELECT original_text, translated_text FROM translations WHERE language_code=? AND is_manual=1', [lang.code])
        manualOverrides[lang.code] = overrides.length > 0
            ? '\n\nUse these approved translations as reference:\n' +
              overrides.slice(0, 8).map(o => `"${o.original_text}" → "${o.translated_text}"`).join('\n')
            : ''
    }

    // Collect all fields for requested items
    const allPageItems = PAGES[pageKey]()
    const allResults = []
    const allErrors = []
    let totalTranslated = 0

    // Group items by ID
    const itemGroups = []
    for (const id of ids) {
        const itemFields = allPageItems.filter(i => String(i.id) === String(id))
        if (itemFields.length > 0) {
            itemGroups.push({ id, fields: itemFields, itemName: itemFields[0]?.itemName || `#${id}` })
        }
    }

    // Translate: for each language, process items in packages of 5
    for (const lang of langs) {
        const PACKAGE_SIZE = 5
        for (let i = 0; i < itemGroups.length; i += PACKAGE_SIZE) {
            const pkg = itemGroups.slice(i, i + PACKAGE_SIZE)
            const pkgItems = pkg.flatMap(g => g.fields)
            const pkgNames = pkg.map(g => g.itemName).join(', ')

            let retries = 0
            const MAX_RETRIES = 2
            let success = false
            while (!success && retries <= MAX_RETRIES) {
                try {
                    const { results, errors } = await translateBatch(enhanced, pkgItems, lang.code, lang.name, manualOverrides[lang.code])
                    allResults.push(...results.map(r => ({ ...r, lang: lang.code })))
                    if (errors.length > 0 && results.length === 0) {
                        // Entire package failed
                        retries++
                        if (retries > MAX_RETRIES) {
                            allErrors.push(...errors.map(e => ({ ...e, lang: lang.code })))
                        }
                        continue
                    }
                    allErrors.push(...errors.map(e => ({ ...e, lang: lang.code })))
                    totalTranslated += results.length
                    success = true
                } catch (e) {
                    retries++
                    if (retries > MAX_RETRIES) {
                        allErrors.push({ error: e.message, errorCode: 'ERR_API', itemName: pkgNames, lang: lang.code })
                    }
                }
            }
        }
        // Mark language as translated
        if (totalTranslated > 0) {
            run('UPDATE languages SET ai_translated=1 WHERE code=?', [lang.code])
        }
    }

    res.json({
        success: true,
        results: allResults,
        errors: allErrors,
        total: itemGroups.length * langs.length,
        translated: totalTranslated,
        languages: langs.length,
        items: itemGroups.length
    })
})

router.get('/:lang', authMiddleware, (req, res) => {
    if (['settings', 'multilingual-status', 'content', 'translation-status'].includes(req.params.lang)) return res.status(404).json({ error: 'not found' })
    const rows = getAll('SELECT * FROM translations WHERE language_code=? ORDER BY content_type, content_field', [req.params.lang])
    res.json(rows)
})
// ─── Sync images from English detail_content to all translations ─────────────
router.post('/sync-images', authMiddleware, (req, res) => {
    try {
        // Get all products with detail_content
        const products = getAll('SELECT id, name_en, detail_content FROM products WHERE detail_content IS NOT NULL AND detail_content != \'\'')
        // Get all translated detail_content entries
        const translations = getAll(
            `SELECT id, language_code, content_id, translated_text FROM translations 
             WHERE content_type='product' AND content_field='detail_content' AND translated_text IS NOT NULL AND translated_text != ''`
        )

        let synced = 0
        let skipped = 0

        for (const trans of translations) {
            const product = products.find(p => p.id === trans.content_id)
            if (!product || !product.detail_content) { skipped++; continue }

            // Extract image src values and full tags from base (English) content
            const baseImgs = []
            const baseImgTags = []
            product.detail_content.replace(/<img\b[^>]*?src\s*=\s*(["'])([^"']*?)\1[^>]*?\/?>/gi, (fullMatch, q, src) => {
                baseImgs.push(src)
                baseImgTags.push(fullMatch)
            })
            if (!baseImgs.length) { skipped++; continue }

            // Replace image src values in translated content positionally
            let idx = 0
            let updatedHtml = trans.translated_text.replace(
                /<img\b([^>]*?)src\s*=\s*(["'])([^"']*?)\2([^>]*?)\/?>/gi,
                (match, before, quote, oldSrc, after) => {
                    if (idx < baseImgs.length) {
                        const newSrc = baseImgs[idx]
                        idx++
                        if (newSrc === oldSrc) return match
                        const selfClose = match.trimEnd().endsWith('/>') ? ' />' : '>'
                        return `<img${before}src=${quote}${newSrc}${quote}${after}${selfClose}`
                    }
                    idx++
                    return match
                }
            )

            // If base has MORE images than translated, append the missing ones
            if (idx < baseImgs.length) {
                const missingTags = baseImgTags.slice(idx).join('\n')
                if (updatedHtml.includes('</body>')) {
                    updatedHtml = updatedHtml.replace('</body>', missingTags + '\n</body>')
                } else {
                    const lastDivIdx = updatedHtml.lastIndexOf('</div>')
                    if (lastDivIdx > updatedHtml.length * 0.8) {
                        updatedHtml = updatedHtml.slice(0, lastDivIdx) + missingTags + '\n' + updatedHtml.slice(lastDivIdx)
                    } else {
                        updatedHtml += '\n' + missingTags
                    }
                }
            }

            if (updatedHtml !== trans.translated_text) {
                run('UPDATE translations SET translated_text=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [updatedHtml, trans.id])
                synced++
            } else {
                skipped++
            }
        }

        // Also sync news article content images
        const articles = getAll('SELECT id, content FROM news WHERE content IS NOT NULL AND content != \'\'')
        const newsTranslations = getAll(
            `SELECT id, language_code, content_id, translated_text FROM translations 
             WHERE content_type='news' AND content_field='content' AND translated_text IS NOT NULL AND translated_text != ''`
        )
        let newsSynced = 0
        for (const trans of newsTranslations) {
            const article = articles.find(a => a.id === trans.content_id)
            if (!article || !article.content) continue
            const baseImgs = []
            const baseImgTags = []
            article.content.replace(/<img\b[^>]*?src\s*=\s*(["'])([^"']*?)\1[^>]*?\/?>/gi, (fullMatch, q, src) => {
                baseImgs.push(src)
                baseImgTags.push(fullMatch)
            })
            if (!baseImgs.length) continue
            let idx = 0
            let updatedHtml = trans.translated_text.replace(
                /<img\b([^>]*?)src\s*=\s*(["'])([^"']*?)\2([^>]*?)\/?>/gi,
                (match, before, quote, oldSrc, after) => {
                    if (idx < baseImgs.length) {
                        const newSrc = baseImgs[idx]
                        idx++
                        if (newSrc === oldSrc) return match
                        const selfClose = match.trimEnd().endsWith('/>') ? ' />' : '>'
                        return `<img${before}src=${quote}${newSrc}${quote}${after}${selfClose}`
                    }
                    idx++
                    return match
                }
            )
            // Append missing images
            if (idx < baseImgs.length) {
                const missingTags = baseImgTags.slice(idx).join('\n')
                if (updatedHtml.includes('</body>')) {
                    updatedHtml = updatedHtml.replace('</body>', missingTags + '\n</body>')
                } else {
                    updatedHtml += '\n' + missingTags
                }
            }
            if (updatedHtml !== trans.translated_text) {
                run('UPDATE translations SET translated_text=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [updatedHtml, trans.id])
                newsSynced++
            }
        }

        res.json({
            message: `同步完成`,
            productsSynced: synced,
            productsSkipped: skipped,
            newsSynced,
            totalTranslations: translations.length + newsTranslations.length
        })
    } catch (e) {
        console.error('Sync images error:', e)
        res.status(500).json({ error: e.message })
    }
})



// ─── Background Translation Worker ───────────────────────────────────────────

let workerRunning = false;
let workerPaused = false;
let activeWorkers = 0;
let workerConcurrency = 3;
try {
    const s = getOne('SELECT concurrency FROM translation_settings WHERE id = 1')
    if (s && s.concurrency) workerConcurrency = s.concurrency
} catch(e) {}

async function executeTranslationTask(targetLang, contentType, contentId) {
    const langRow = getOne('SELECT * FROM languages WHERE code=?', [targetLang])
    if (!langRow) throw new Error(`Language "${targetLang}" not found`)

    const s = getOne('SELECT * FROM translation_settings WHERE id=1')
    if (!s?.api_key && !getOne('SELECT api_key FROM ai_channels WHERE is_default = 1')?.api_key) {
        throw new Error('AI API key not configured.')
    }

    const TYPE_TO_PAGE = { product: 'products', news: 'news', company: 'company', page_text: 'page_texts', category: 'categories', news_category: 'news_categories', hero: 'hero', ui_text: 'ui_texts_static', ral_color: 'ral_colors', roofing_category: 'roofing_categories', roofing_profile: 'roofing_profiles', factory_group: 'factory', factory_media: 'factory' }
    const pageKey = TYPE_TO_PAGE[contentType] || contentType
    if (!PAGES[pageKey]) throw new Error(`Unknown content type: ${contentType}`)
    
    const allItems = PAGES[pageKey]()
    const items = allItems.filter(i => String(i.id) === String(contentId))

    if (items.length === 0) return { results: [], errors: [] }

    const manualOverrides = getAll('SELECT original_text, translated_text FROM translations WHERE language_code=? AND is_manual=1', [targetLang])
    const overrideNote = manualOverrides.length > 0
        ? '\n\nUse these approved translations as reference:\n' +
        manualOverrides.slice(0, 8).map(o => `"${o.original_text}" → "${o.translated_text}"`).join('\n')
        : ''

    const { results, errors } = await translateBatch(enhanceWithDefaultChannel(s), items, targetLang, langRow.name, overrideNote)
    if (results.length > 0) {
        run('UPDATE languages SET ai_translated=1 WHERE code=?', [targetLang])
    }
    return { results, errors }
}

async function processTranslationQueue() {
    if (workerRunning) return;
    workerRunning = true;
    
    try {
        while (!workerPaused) {
            if (activeWorkers >= workerConcurrency) {
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }
            
            // Fetch next task
            const task = getOne("SELECT * FROM translation_tasks WHERE status='pending' ORDER BY id ASC LIMIT 1");
            if (!task) {
                // If no pending, check if we should auto-retry failed ones
                const allFinished = getOne("SELECT count(*) as c FROM translation_tasks WHERE status='pending' OR status='running'");
                if (allFinished && allFinished.c === 0) {
                    // Try to auto-retry errors once
                    const errorCount = run("UPDATE translation_tasks SET status='error', status='pending', retry_count = retry_count + 1 WHERE status='error' AND retry_count = 0");
                    if (errorCount && errorCount.changes > 0) {
                        continue; // loop again to pick up the newly pending tasks
                    }
                }
                break; // queue truly empty
            }

            // Mark running
            run("UPDATE translation_tasks SET status='running', updated_at=CURRENT_TIMESTAMP WHERE id=?", [task.id]);
            activeWorkers++;

            (async () => {
                try {
                    const result = await executeTranslationTask(task.target_lang, task.item_type, task.item_id);
                    if (result.errors && result.errors.length > 0 && (!result.results || result.results.length === 0)) {
                        const errMsg = (result.errors[0].error || 'Unknown error').slice(0, 500);
                        run("UPDATE translation_tasks SET status='error', error_message=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", [errMsg, task.id]);
                    } else {
                        run("UPDATE translation_tasks SET status='success', error_message=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?", [task.id]);
                    }
                } catch (e) {
                    run("UPDATE translation_tasks SET status='error', error_message=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", [(e.message || 'Error').slice(0, 500), task.id]);
                } finally {
                    activeWorkers--;
                }
            })();
        }
    } finally {
        workerRunning = false;
    }
}

// ─── Background Batch API ────────────────────────────────────────────────────

router.post('/batch-start', authMiddleware, async (req, res) => {
    const { pages, lang, concurrency, explicitItems } = req.body;
    if (!pages || !lang) return res.status(400).json({ error: 'pages and lang are required' });
    
    if (concurrency) {
        workerConcurrency = parseInt(concurrency) || 3;
        run('UPDATE translation_settings SET concurrency = ? WHERE id = 1', [workerConcurrency])
    }
    workerPaused = false;
    
    // Auto clear >3 days old logs before starting new batch
    run("DELETE FROM translation_tasks WHERE created_at < datetime('now', '-3 days')");

    const targetLangs = [];
    if (lang === 'all') {
        const langs = getAll("SELECT code FROM languages WHERE code != 'en' AND status = 1");
        targetLangs.push(...langs.map(l => l.code));
    } else {
        targetLangs.push(lang);
    }

    const allItemsList = [];
    if (explicitItems && explicitItems.length > 0) {
        // Granular selection
        for (const exItem of explicitItems) {
            for (const tLang of targetLangs) {
                const uniqueKey = `${tLang}_${exItem.type}_${exItem.id}`;
                if (!allItemsList.find(x => x.uniqueKey === uniqueKey)) {
                    allItemsList.push({ ...exItem, targetLang: tLang, uniqueKey });
                }
            }
        }
    } else if (pages && pages.length > 0) {
        for (const page of pages) {
            if (!PAGES[page]) continue;
            const items = PAGES[page]();
            // Check untranslated
            for (const item of items) {
                if (item.long_html) continue;
                for (const tLang of targetLangs) {
                const t = getOne(
                    'SELECT translated_text FROM translations WHERE language_code=? AND content_type=? AND content_id=? AND content_field=?',
                    [tLang, item.type, item.id, item.field]
                );
                if (!t?.translated_text) {
                    // Unique check using composite string
                    const uniqueKey = `${tLang}_${item.type}_${item.id}`;
                    if (!allItemsList.find(x => x.uniqueKey === uniqueKey)) {
                        allItemsList.push({ ...item, targetLang: tLang, uniqueKey });
                    }
                }
            }
        }
    }
    } // End of pages block

    let inserted = 0;
    for (const item of allItemsList) {
        // avoid duplicating pending tasks
        const exist = getOne("SELECT id FROM translation_tasks WHERE target_lang=? AND item_type=? AND item_id=? AND (status='pending' OR status='running')", [item.targetLang, item.type, item.id]);
        if (!exist) {
            run("INSERT INTO translation_tasks (target_lang, item_type, item_id, item_name, status) VALUES (?, ?, ?, ?, 'pending')", 
            [item.targetLang, item.type, item.id, item.itemName || `${item.type}_${item.id}`]);
            inserted++;
        }
    }

    processTranslationQueue();
    res.json({ success: true, message: `Added ${inserted} tasks to queue.`, totalAdded: inserted });
});

router.get('/batch-status', authMiddleware, (req, res) => {
    const total = getOne("SELECT COUNT(*) as c FROM translation_tasks")?.c || 0;
    const pending = getOne("SELECT COUNT(*) as c FROM translation_tasks WHERE status='pending'")?.c || 0;
    const running = getOne("SELECT COUNT(*) as c FROM translation_tasks WHERE status='running'")?.c || 0;
    const success = getOne("SELECT COUNT(*) as c FROM translation_tasks WHERE status='success'")?.c || 0;
    const error = getOne("SELECT COUNT(*) as c FROM translation_tasks WHERE status='error'")?.c || 0;
    
    const logs = getAll("SELECT * FROM translation_tasks ORDER BY updated_at DESC LIMIT 100");
    
    res.json({ total, pending, running, success, error, workerRunning, workerPaused, logs });
});

router.post('/batch-action', authMiddleware, (req, res) => {
    const { action } = req.body;
    if (action === 'pause') {
        workerPaused = true;
    } else if (action === 'resume') {
        workerPaused = false;
        processTranslationQueue();
    } else if (action === 'retry_failed') {
        run("UPDATE translation_tasks SET status='pending', retry_count=0 WHERE status='error'");
        workerPaused = false;
        processTranslationQueue();
    } else if (action === 'clear_logs') {
        run("DELETE FROM translation_tasks");
    }
    res.json({ success: true });
});

export default router

// ── Named exports for background job system ──
export { PAGES, translateBatch, enhanceWithDefaultChannel, upsertTranslation }
