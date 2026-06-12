import { Router } from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import https from 'https'
import http from 'http'

const router = Router()

// ─── HTTP helper (shared pattern from translation.js) ────────────────────────
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

function getAISettings() {
    const s = getOne('SELECT * FROM translation_settings WHERE id=1') || {}
    const ch = getOne('SELECT * FROM ai_channels WHERE is_default = 1')
    if (ch) {
        if (ch.api_url) s.api_url = ch.api_url
        if (ch.api_key) s.api_key = ch.api_key
        if (ch.default_model) s.model_name = ch.default_model
        else {
            const models = JSON.parse(ch.models || '[]')
            if (models.length > 0) s.model_name = models[0]
        }
    }
    s.rpm_limit = s.rpm_limit || 0
    return s
}

const channelRpmTrackers = new Map() // key -> { minuteStart, count }

async function callAI(settings, messages, maxTokens = 4000) {
    const limit = parseInt(settings.rpm_limit) || 0
    const intervalWindow = (parseInt(settings.rpm_interval) || 60) * 1000
    if (limit > 0) {
        const channelKey = `${settings.api_key}_${settings.api_url}`
        let tracker = channelRpmTrackers.get(channelKey)
        const now = Date.now()
        if (!tracker || (now - tracker.minuteStart) >= intervalWindow) {
            tracker = { minuteStart: now, count: 0 }
            channelRpmTrackers.set(channelKey, tracker)
        }
        if (tracker.count >= limit) {
            const waitTime = intervalWindow - (now - tracker.minuteStart)
            console.log(`[RateLimit/News] API 请求已达阈值 (${limit}次/${intervalWindow/1000}秒)，自动休眠排队中... 需等待 ${Math.round(waitTime/1000)} 秒`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
            tracker.minuteStart = Date.now()
            tracker.count = 0
            channelRpmTrackers.set(channelKey, tracker)
        }
        tracker.count++
    }

    const apiUrl = (settings.api_url || 'https://api.openai.com/v1').replace(/\/$/, '') + '/chat/completions'
    const result = await httpRequest(apiUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${settings.api_key}`, 'Content-Type': 'application/json' }
    }, {
        model: settings.model_name || 'gpt-4o-mini',
        messages,
        temperature: 0.4,
        max_tokens: maxTokens
    })
    if (result.status !== 200) {
        const errMsg = typeof result.body === 'object'
            ? (result.body?.error?.message || JSON.stringify(result.body)) : result.body
        throw new Error(`API Error ${result.status}: ${errMsg}`)
    }
    return result.body?.choices?.[0]?.message?.content || ''
}

function stripHtml(html) {
    return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 3000)
}

// ─── GET /api/news/test-ai — debug: test AI channel with a simple prompt ──────
router.get('/test-ai', authMiddleware, async (req, res) => {
    const s = getAISettings()
    if (!s.api_key) return res.json({ error: 'No API key configured' })
    try {
        const raw = await callAI(s, [
            { role: 'system', content: 'Return only a JSON array. No markdown.' },
            { role: 'user', content: 'Generate 2 example FAQ pairs about steel coils as a JSON array: [{"question":"...","answer":"..."}]' }
        ], 500)
        res.json({
            api_url: s.api_url,
            model: s.model_name,
            raw_response: raw,
            response_length: raw.length,
            has_json_array: /\[[\s\S]*\]/.test(raw),
            has_code_block: raw.includes('```')
        })
    } catch (e) {
        res.json({ error: e.message, api_url: s.api_url, model: s.model_name })
    }
})

// ─── GET /api/news/batch-status ──────────────────────────────────────────────
// Returns stats: how many articles have/lack faq_items and SEO fields
router.get('/batch-status', authMiddleware, (req, res) => {
    const all = getAll('SELECT id, title_en, title, faq_items, seo_title, seo_description, seo_keywords, summary_en, summary, content FROM news WHERE status=1')
    const stats = {
        total: all.length,
        missing_faq: 0,
        missing_seo_title: 0,
        missing_seo_desc: 0,
        needs_work: [],
    }
    for (const a of all) {
        let issues = []
        try {
            const faqs = JSON.parse(a.faq_items || '[]')
            if (!faqs.length) { stats.missing_faq++; issues.push('no_faq') }
        } catch { stats.missing_faq++; issues.push('no_faq') }
        if (!a.seo_title) { stats.missing_seo_title++; issues.push('no_seo_title') }
        if (!a.seo_description) { stats.missing_seo_desc++; issues.push('no_seo_desc') }
        if (issues.length) stats.needs_work.push({ id: a.id, title: a.title_en || a.title, issues })
    }
    res.json(stats)
})

// ─── POST /api/news/batch-enhance ────────────────────────────────────────────
// Streams progress — processes all articles missing FAQ or SEO fields
// Options in body: { mode: 'all'|'faq_only'|'seo_only', ids: [optional array to limit] }
router.post('/batch-enhance', authMiddleware, async (req, res) => {
    const s = getAISettings()
    if (!s.api_key) return res.status(400).json({ error: 'AI API key not configured — set in AI Translation settings' })

    const { mode = 'all', ids, force = false } = req.body

    let articles = getAll('SELECT id, title_en, title, faq_items, seo_title, seo_description, seo_keywords, summary_en, summary, content FROM news WHERE status=1 ORDER BY id ASC')

    // Filter by IDs if provided
    if (ids && ids.length) articles = articles.filter(a => ids.includes(a.id))

    // Filter to only articles that need work (unless force=true)
    if (!force) {
        articles = articles.filter(a => {
            const hasFaq = (() => { try { return JSON.parse(a.faq_items || '[]').length > 0 } catch { return false } })()
            const hasSeo = !!(a.seo_title && a.seo_description)
            if (mode === 'faq_only') return !hasFaq
            if (mode === 'seo_only') return !hasSeo
            return !hasFaq || !hasSeo
        })
    }

    if (!articles.length) return res.json({ success: true, message: 'All articles already have FAQ and SEO — nothing to do!', processed: 0 })

    // ── Streaming response with keep-alive ──
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    const keepAlive = setInterval(() => {
        try { res.write(' ') } catch { clearInterval(keepAlive) }
    }, 20000)

    const results = []
    const errors = []
    let processed = 0

    for (const article of articles) {
        const articleTitle = article.title_en || article.title || `Article #${article.id}`
        const textContent = stripHtml(article.content)
        const summary = article.summary_en || article.summary || ''

        // Skip if content is too short to generate meaningful FAQ
        if (textContent.length < 100 && !summary) {
            errors.push({ id: article.id, title: articleTitle, error: 'Content too short to generate FAQ' })
            continue
        }

        let updatedFaq = null
        let updatedSeoTitle = null
        let updatedSeoDesc = null
        let updatedSeoKw = null

        // ── Generate FAQ ──
        const needFaq = mode !== 'seo_only'
        if (needFaq) {
            try {
                const hasFaq = (() => { try { return JSON.parse(article.faq_items || '[]').length > 0 } catch { return false } })()
                if (!hasFaq || force) {
                    const prompt = `You are an SEO and GEO expert for a steel products company (SunSea Steel).
Based on this article content, generate 5-7 FAQ pairs in JSON format.

Article title: "${articleTitle}"
Article summary: "${summary}"
Article content (excerpt): "${textContent.substring(0, 2000)}"

REQUIREMENTS:
- Questions should be what steel buyers/importers actually ask about this topic
- Answers should be 2-4 sentences, factual and specific
- Cover: product specs, pricing/MOQ, delivery/shipping, quality/certifications, customization
- Return ONLY a valid JSON array (no markdown code blocks, no explanation):
[{"question":"...","answer":"..."},{"question":"...","answer":"..."}]`

                    const aiResponse = await callAI(s, [
                        { role: 'system', content: 'You generate FAQ JSON arrays for steel company articles. Output ONLY the raw JSON array starting with [ and ending with ]. No markdown. No explanations.' },
                        { role: 'user', content: prompt }
                    ], 2000)

                    // Extract JSON array — handle markdown code blocks and plain JSON
                    const arrayMatch =
                        aiResponse.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/) ||
                        aiResponse.match(/(\[[\s\S]*\])/)
                    const rawJsonStr = arrayMatch ? (arrayMatch[1] || arrayMatch[0]) : null

                    if (rawJsonStr) {
                        try {
                            const faqs = JSON.parse(rawJsonStr)
                            if (Array.isArray(faqs) && faqs.length >= 3) {
                                updatedFaq = JSON.stringify(faqs)
                            } else {
                                errors.push({ id: article.id, title: articleTitle, error: `FAQ parse OK but only ${faqs.length} items (need ≥3)` })
                            }
                        } catch (parseErr) {
                            errors.push({ id: article.id, title: articleTitle, error: `FAQ JSON parse failed: ${parseErr.message} | Raw: ${rawJsonStr.substring(0, 100)}` })
                        }
                    } else {
                        // Record what AI actually returned for debugging
                        const preview = aiResponse ? aiResponse.substring(0, 150) : '(empty response)'
                        errors.push({ id: article.id, title: articleTitle, error: `FAQ: no JSON array found in AI response. Preview: ${preview}` })
                    }
                }
            } catch (e) {
                errors.push({ id: article.id, title: articleTitle, error: `FAQ generation failed: ${e.message}` })
            }
        }

        // ── Generate/fix SEO fields ──
        const needSeo = mode !== 'faq_only'
        if (needSeo) {
            try {
                const missingSeoTitle = !article.seo_title
                const missingSeoDesc = !article.seo_description
                if (missingSeoTitle || missingSeoDesc || force) {
                    const seoPrompt = `You are an SEO expert for a steel products company (SunSea Steel, China).
Generate SEO metadata for this article. Return ONLY valid JSON.

Article title: "${articleTitle}"
Summary: "${summary}"
Content excerpt: "${textContent.substring(0, 800)}"

Return JSON with these fields:
{
  "seo_title": "≤60 chars, include main keyword + | SunSea Steel",
  "seo_description": "≤160 chars, include main keyword, benefit, and CTA",
  "seo_keywords": "8-12 comma-separated keywords for steel industry buyers"
}
Context: B2B steel exporter, buyers are importers/distributors worldwide.`

                    const aiResponse = await callAI(s, [
                        { role: 'system', content: 'Generate SEO metadata JSON for steel company articles.' },
                        { role: 'user', content: seoPrompt }
                    ], 500)

                    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
                    if (jsonMatch) {
                        const seo = JSON.parse(jsonMatch[0])
                        if (!article.seo_title && seo.seo_title) updatedSeoTitle = seo.seo_title.substring(0, 60)
                        if (!article.seo_description && seo.seo_description) updatedSeoDesc = seo.seo_description.substring(0, 160)
                        if (!article.seo_keywords && seo.seo_keywords) updatedSeoKw = seo.seo_keywords
                    }
                }
            } catch (e) {
                errors.push({ id: article.id, title: articleTitle, error: `SEO generation failed: ${e.message}` })
            }
        }

        // ── Save updates to DB ──
        const sets = []
        const vals = []
        if (updatedFaq !== null) { sets.push('faq_items=?'); vals.push(updatedFaq) }
        if (updatedSeoTitle !== null) { sets.push('seo_title=?'); vals.push(updatedSeoTitle) }
        if (updatedSeoDesc !== null) { sets.push('seo_description=?'); vals.push(updatedSeoDesc) }
        if (updatedSeoKw !== null) { sets.push('seo_keywords=?'); vals.push(updatedSeoKw) }

        if (sets.length) {
            sets.push("updated_at=datetime('now')")
            vals.push(article.id)
            run(`UPDATE news SET ${sets.join(',')} WHERE id=?`, vals)
        }

        processed++
        results.push({
            id: article.id,
            title: articleTitle,
            faq_added: updatedFaq !== null,
            faq_count: updatedFaq ? JSON.parse(updatedFaq).length : 0,
            seo_title_added: updatedSeoTitle !== null,
            seo_desc_added: updatedSeoDesc !== null
        })
    }

    clearInterval(keepAlive)
    res.end(JSON.stringify({
        success: true,
        processed,
        skipped: articles.length - processed,
        errors_count: errors.length,
        results,
        errors,
        summary: `✅ Processed ${processed}/${articles.length} articles. FAQ added to ${results.filter(r => r.faq_added).length} articles. SEO filled for ${results.filter(r => r.seo_title_added).length} articles.`
    }))
})

// ─── GET /api/news/seo-audit ─────────────────────────────────────────────────
// Returns detailed SEO/GEO audit for all news articles
router.get('/seo-audit', authMiddleware, (req, res) => {
    const articles = getAll('SELECT id, title_en, title, slug, faq_items, seo_title, seo_description, seo_keywords, summary_en, summary, cover_image, content, status FROM news ORDER BY id DESC')

    const audit = articles.map(a => {
        const issues = []
        const passes = []

        // SEO checks
        if (!a.seo_title) issues.push({ type: 'error', msg: 'Missing seo_title — page will use raw title as fallback' })
        else if (a.seo_title.length > 60) issues.push({ type: 'warning', msg: `seo_title too long: ${a.seo_title.length} chars (max 60)` })
        else passes.push('seo_title ✓')

        if (!a.seo_description) issues.push({ type: 'error', msg: 'Missing seo_description — Google will auto-generate (often poor quality)' })
        else if (a.seo_description.length > 160) issues.push({ type: 'warning', msg: `seo_description too long: ${a.seo_description.length} chars (max 160)` })
        else passes.push('seo_description ✓')

        if (!a.seo_keywords) issues.push({ type: 'warning', msg: 'Missing seo_keywords' })
        else passes.push('seo_keywords ✓')

        // GEO checks
        let faqCount = 0
        try { faqCount = JSON.parse(a.faq_items || '[]').length } catch {}
        if (!faqCount) issues.push({ type: 'error', msg: 'Missing faq_items — no FAQPage schema, AI engines cannot extract Q&A' })
        else if (faqCount < 5) issues.push({ type: 'warning', msg: `Only ${faqCount} FAQ items — recommend 5-7 for better GEO coverage` })
        else passes.push(`faq_items ✓ (${faqCount} Q&A pairs)`)

        // Content checks
        if (!a.cover_image) issues.push({ type: 'warning', msg: 'No cover_image — social sharing will have no image' })
        else passes.push('cover_image ✓')

        const textLen = stripHtml(a.content).length
        if (textLen < 300) issues.push({ type: 'warning', msg: `Content too short: ~${textLen} chars (recommend 600+)` })
        else passes.push(`content length ✓ (~${textLen} chars)`)

        if (!a.summary_en && !a.summary) issues.push({ type: 'warning', msg: 'No summary — used for meta description fallback' })
        else passes.push('summary ✓')

        const score = Math.round((passes.length / (passes.length + issues.length)) * 100)

        return {
            id: a.id,
            title: a.title_en || a.title,
            slug: a.slug,
            status: a.status,
            seo_score: score,
            passes_count: passes.length,
            issues_count: issues.length,
            issues,
            passes
        }
    })

    const avgScore = Math.round(audit.reduce((s, a) => s + a.seo_score, 0) / (audit.length || 1))
    const critical = audit.filter(a => a.issues.some(i => i.type === 'error')).length

    res.json({
        total: audit.length,
        avg_seo_score: avgScore,
        critical_issues: critical,
        articles_needing_faq: audit.filter(a => a.issues.some(i => i.msg.includes('faq'))).length,
        articles_needing_seo: audit.filter(a => a.issues.some(i => !i.msg.includes('faq') && i.type === 'error')).length,
        articles: audit
    })
})

export default router
