import { Router } from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import https from 'https'
import http from 'http'

const router = Router()

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
        if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body))
        req.end()
    })
}

async function callAI(settings, messages) {
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
        max_tokens: 2000
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

// ─── Content collector ────────────────────────────────────────────────────────

const PAGES = {
    products: () => {
        const rows = getAll('SELECT id, name_en, description_en FROM products WHERE status=1')
        return rows.flatMap(r => [
            r.name_en ? { type: 'product', id: r.id, field: 'name', text: r.name_en } : null,
            r.description_en ? { type: 'product', id: r.id, field: 'description', text: r.description_en } : null
        ]).filter(Boolean)
    },
    news: () => {
        const rows = getAll('SELECT id, title_en, summary_en FROM news WHERE status=1')
        return rows.flatMap(r => [
            r.title_en ? { type: 'news', id: r.id, field: 'title', text: r.title_en } : null,
            r.summary_en ? { type: 'news', id: r.id, field: 'summary', text: r.summary_en } : null
        ]).filter(Boolean)
    },
    company: () => {
        const c = getOne('SELECT * FROM company WHERE id=1')
        if (!c) return []
        return ['name', 'description', 'address'].flatMap(f =>
            c[`${f}_en`] ? [{ type: 'company', id: 1, field: f, text: c[`${f}_en`] }] : []
        )
    },
    page_texts: () => {
        const pt = getOne('SELECT * FROM page_texts WHERE id=1')
        if (!pt) return []
        const fields = [
            'logo_subtitle', 'featured_subtitle_en', 'categories_subtitle_en',
            'cta_title_en', 'cta_subtitle_en', 'contact_page_title_en',
            'contact_page_subtitle_en', 'contact_form_desc_en', 'inquiry_subtitle_en',
            'about_tagline_en', 'about_cta_subtitle_en'
        ]
        return fields.flatMap(f =>
            pt[f] ? [{ type: 'page_text', id: 1, field: f.replace(/_en$/, ''), text: pt[f] }] : []
        )
    }
}

// ─── Run translation (synchronous, per page, with error details) ──────────────

router.post('/run', authMiddleware, async (req, res) => {
    const { lang: targetLang, page } = req.body
    if (!targetLang || targetLang === 'en') return res.status(400).json({ error: 'Invalid target language' })

    const langRow = getOne('SELECT * FROM languages WHERE code=?', [targetLang])
    if (!langRow) return res.status(400).json({ error: `Language "${targetLang}" not found` })

    const s = getOne('SELECT * FROM translation_settings WHERE id=1')
    if (!s?.api_key) return res.status(400).json({ error: 'AI API key not configured. Please save your API key first.' })
    if (!s?.model_name) return res.status(400).json({ error: 'AI model not configured.' })

    // Collect items for the requested page(s)
    const pageNames = page && page !== 'all' ? [page] : Object.keys(PAGES)
    let items = []
    for (const p of pageNames) {
        if (PAGES[p]) items = items.concat(PAGES[p]())
    }

    if (items.length === 0) return res.json({ success: true, results: [], message: 'No content to translate for this page.' })

    // Load manual overrides as context
    const manualOverrides = getAll('SELECT original_text, translated_text FROM translations WHERE language_code=? AND is_manual=1', [targetLang])
    const overrideNote = manualOverrides.length > 0
        ? '\n\nUse these approved translations as reference:\n' +
        manualOverrides.slice(0, 8).map(o => `"${o.original_text}" → "${o.translated_text}"`).join('\n')
        : ''

    const BATCH = 5
    const results = []
    const errors = []

    // Translate in small batches
    for (let i = 0; i < items.length; i += BATCH) {
        const batch = items.slice(i, i + BATCH)
        const numberedText = batch.map((item, idx) => `${idx + 1}. ${item.text}`).join('\n')
        const systemPrompt = `You are a professional translator for a steel and LED products export company (GI GL PPGI PPGL steel coil, LED lighting products).
Translate each numbered line from English to ${langRow.name}.
Rules: Keep product codes, model numbers, and brand names unchanged. Return ONLY a JSON object like {"1":"translation","2":"translation"}.${overrideNote}`

        try {
            const content = await callAI(s, [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: numberedText }
            ])

            let translations = {}
            const jsonMatch = content.match(/\{[\s\S]*?\}/)
            if (jsonMatch) {
                try { translations = JSON.parse(jsonMatch[0]) } catch (e) {
                    errors.push({ batch: i / BATCH + 1, error: 'JSON parse error: ' + content.slice(0, 200) })
                    continue
                }
            } else {
                errors.push({ batch: i / BATCH + 1, error: 'No JSON in response: ' + content.slice(0, 200) })
                continue
            }

            for (let j = 0; j < batch.length; j++) {
                const item = batch[j]
                const translated = translations[String(j + 1)]
                if (!translated) {
                    errors.push({ item: item.text.slice(0, 60), error: 'No translation in response' })
                    continue
                }
                try {
                    run(
                        `INSERT INTO translations (language_code, content_type, content_id, content_field, original_text, translated_text, is_manual)
             VALUES (?, ?, ?, ?, ?, ?, 0)`,
                        [targetLang, item.type, item.id || null, item.field, item.text, translated]
                    )
                } catch (e) {
                    // On conflict — update
                    try {
                        run(
                            `UPDATE translations SET translated_text=?, updated_at=CURRENT_TIMESTAMP
               WHERE language_code=? AND content_type=? AND content_id IS ? AND content_field=? AND is_manual=0`,
                            [translated, targetLang, item.type, item.id || null, item.field]
                        )
                    } catch (e2) { }
                }
                results.push({ original: item.text, translated, type: item.type, field: item.field })
            }
        } catch (e) {
            errors.push({ batch: i / BATCH + 1, error: e.message })
        }
    }

    // Mark language as ai_translated if any succeeded
    if (results.length > 0) {
        run('UPDATE languages SET ai_translated=1 WHERE code=?', [targetLang])
    }

    res.json({ success: true, results, errors, total: items.length, translated: results.length })
})

// ─── Progress ─────────────────────────────────────────────────────────────────

router.get('/progress/:lang', authMiddleware, (req, res) => {
    const count = getOne('SELECT COUNT(*) as c FROM translations WHERE language_code=?', [req.params.lang])
    const langRow = getOne('SELECT ai_translated FROM languages WHERE code=?', [req.params.lang])
    res.json({ count: count?.c || 0, ai_translated: langRow?.ai_translated || 0 })
})

// ─── Search untranslated (all content for any page) ───────────────────────────

router.get('/search-untranslated/:lang', authMiddleware, (req, res) => {
    const lang = req.params.lang
    const query = (req.query.q || '').trim()
    const page = req.query.page || 'all'
    const results = []

    if (page === 'all' || page === 'products') {
        const products = query
            ? getAll('SELECT id, name_en, description_en FROM products WHERE status=1 AND (name_en LIKE ? OR description_en LIKE ?)', [`%${query}%`, `%${query}%`])
            : getAll('SELECT id, name_en, description_en FROM products WHERE status=1')
        for (const p of products) {
            if (p.name_en) {
                const t = getOne('SELECT translated_text FROM translations WHERE language_code=? AND content_type=? AND content_id=? AND content_field=?', [lang, 'product', p.id, 'name'])
                if (!t?.translated_text) results.push({ page: 'Products', field: 'name', id: p.id, content_type: 'product', original: p.name_en })
            }
            if (p.description_en) {
                const t = getOne('SELECT translated_text FROM translations WHERE language_code=? AND content_type=? AND content_id=? AND content_field=?', [lang, 'product', p.id, 'description'])
                if (!t?.translated_text) results.push({ page: 'Products', field: 'description', id: p.id, content_type: 'product', original: p.description_en })
            }
        }
    }

    if (page === 'all' || page === 'news') {
        const news = query
            ? getAll('SELECT id, title_en, summary_en FROM news WHERE status=1 AND (title_en LIKE ? OR summary_en LIKE ?)', [`%${query}%`, `%${query}%`])
            : getAll('SELECT id, title_en, summary_en FROM news WHERE status=1')
        for (const n of news) {
            if (n.title_en) {
                const t = getOne('SELECT translated_text FROM translations WHERE language_code=? AND content_type=? AND content_id=? AND content_field=?', [lang, 'news', n.id, 'title'])
                if (!t?.translated_text) results.push({ page: 'News', field: 'title', id: n.id, content_type: 'news', original: n.title_en })
            }
            if (n.summary_en) {
                const t = getOne('SELECT translated_text FROM translations WHERE language_code=? AND content_type=? AND content_id=? AND content_field=?', [lang, 'news', n.id, 'summary'])
                if (!t?.translated_text) results.push({ page: 'News', field: 'summary', id: n.id, content_type: 'news', original: n.summary_en })
            }
        }
    }

    if (page === 'all' || page === 'company') {
        const c = getOne('SELECT * FROM company WHERE id=1')
        if (c) {
            for (const field of ['name', 'description', 'address']) {
                const text = c[`${field}_en`]
                if (!text || (query && !text.toLowerCase().includes(query.toLowerCase()))) continue
                const t = getOne('SELECT translated_text FROM translations WHERE language_code=? AND content_type=? AND content_id=? AND content_field=?', [lang, 'company', 1, field])
                if (!t?.translated_text) results.push({ page: 'Company', field, id: 1, content_type: 'company', original: text })
            }
        }
    }

    if (page === 'all' || page === 'page_texts') {
        const pt = getOne('SELECT * FROM page_texts WHERE id=1')
        if (pt) {
            const fields = ['logo_subtitle', 'featured_subtitle_en', 'categories_subtitle_en', 'cta_title_en', 'cta_subtitle_en', 'inquiry_subtitle_en']
            for (const f of fields) {
                const text = pt[f]
                if (!text || (query && !text.toLowerCase().includes(query.toLowerCase()))) continue
                const fieldKey = f.replace(/_en$/, '')
                const t = getOne('SELECT translated_text FROM translations WHERE language_code=? AND content_type=? AND content_id=? AND content_field=?', [lang, 'page_text', 1, fieldKey])
                if (!t?.translated_text) results.push({ page: 'Page Texts', field: fieldKey, id: 1, content_type: 'page_text', original: text })
            }
        }
    }

    res.json(results.slice(0, 100))
})

// ─── Manual override ──────────────────────────────────────────────────────────

router.post('/override', authMiddleware, (req, res) => {
    const { language_code, content_type, content_id, content_field, original_text, translated_text } = req.body
    if (!language_code || !content_field || !translated_text) return res.status(400).json({ error: 'missing required fields' })
    try {
        run(
            `INSERT INTO translations (language_code, content_type, content_id, content_field, original_text, translated_text, is_manual)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [language_code, content_type || 'manual', content_id || null, content_field, original_text || '', translated_text]
        )
    } catch (e) {
        run(
            `UPDATE translations SET translated_text=?, is_manual=1, updated_at=CURRENT_TIMESTAMP
       WHERE language_code=? AND content_type=? AND content_id IS ? AND content_field=?`,
            [translated_text, language_code, content_type || 'manual', content_id || null, content_field]
        )
    }
    res.json({ message: 'Saved' })
})

// ─── Get all translations for a language ─────────────────────────────────────

router.get('/:lang', authMiddleware, (req, res) => {
    if (['settings', 'multilingual-status'].includes(req.params.lang)) return res.status(404).json({ error: 'not found' })
    const rows = getAll('SELECT * FROM translations WHERE language_code=? ORDER BY content_type, content_field', [req.params.lang])
    res.json(rows)
})

export default router
