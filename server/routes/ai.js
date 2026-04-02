import { Router } from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import https from 'https'
import http from 'http'

const router = Router()

// ─── HTTP helper ──────────────────────────────────────────────────────────────

function httpRequest(urlStr, options = {}, body = null, timeoutMs = 120000) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr)
        const lib = url.protocol === 'https:' ? https : http
        const reqOptions = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method: options.method || 'GET',
            headers: options.headers || {},
            timeout: timeoutMs
        }
        const req = lib.request(reqOptions, (res) => {
            res.setEncoding('utf8')
            let data = ''
            res.on('data', chunk => { data += chunk })
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
                catch (e) { resolve({ status: res.statusCode, body: data }) }
            })
        })
        req.on('timeout', () => { req.destroy(); reject(new Error('AI API 请求超时（120秒），请稍后重试')) })
        req.on('error', reject)
        if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body))
        req.end()
    })
}

// ─── Streaming HTTP helper (for SSE chat) ─────────────────────────────────────

function httpStream(urlStr, options = {}, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr)
        const lib = url.protocol === 'https:' ? https : http
        const reqOptions = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method: options.method || 'POST',
            headers: options.headers || {}
        }
        const req = lib.request(reqOptions, (res) => {
            resolve({ status: res.statusCode, stream: res })
        })
        req.on('error', reject)
        if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body))
        req.end()
    })
}

// ─── Channel CRUD ─────────────────────────────────────────────────────────────

router.get('/channels', authMiddleware, (req, res) => {
    const channels = getAll('SELECT * FROM ai_channels ORDER BY is_default DESC, id ASC')
    // Return channels with plaintext keys (private server) + parsed models
    const parsed = channels.map(c => ({
        ...c,
        api_key_display: c.api_key || '',
        models: JSON.parse(c.models || '[]')
    }))
    res.json(parsed)
})

router.post('/channels', authMiddleware, (req, res) => {
    const { name, api_url, api_key, models, is_default, default_model } = req.body
    if (!name || !api_url || !api_key) return res.status(400).json({ error: '名称、API URL 和 API Key 不能为空' })
    if (is_default) run('UPDATE ai_channels SET is_default = 0')
    const result = run(
        'INSERT INTO ai_channels (name, api_url, api_key, models, is_default, default_model) VALUES (?, ?, ?, ?, ?, ?)',
        [name, api_url, api_key, JSON.stringify(models || []), is_default ? 1 : 0, default_model || '']
    )
    res.json({ id: result.lastInsertRowid, message: '创建成功' })
})

router.put('/channels/:id', authMiddleware, (req, res) => {
    const { id } = req.params
    const { name, api_url, api_key, models, is_default, default_model } = req.body
    const channel = getOne('SELECT * FROM ai_channels WHERE id = ?', [id])
    if (!channel) return res.status(404).json({ error: '渠道不存在' })
    const finalKey = (api_key && !api_key.includes('****')) ? api_key : channel.api_key
    if (is_default) run('UPDATE ai_channels SET is_default = 0')
    run(
        'UPDATE ai_channels SET name=?, api_url=?, api_key=?, models=?, is_default=?, default_model=? WHERE id=?',
        [name || channel.name, api_url || channel.api_url, finalKey, JSON.stringify(models || JSON.parse(channel.models || '[]')), is_default ? 1 : 0, default_model || channel.default_model || '', id]
    )
    res.json({ message: '更新成功' })
})

router.delete('/channels/:id', authMiddleware, (req, res) => {
    run('DELETE FROM ai_channels WHERE id = ?', [req.params.id])
    res.json({ message: '删除成功' })
})

// ─── Test channel connectivity ────────────────────────────────────────────────

router.post('/channels/:id/test', authMiddleware, async (req, res) => {
    const channel = getOne('SELECT * FROM ai_channels WHERE id = ?', [req.params.id])
    if (!channel) return res.status(404).json({ error: '渠道不存在' })

    const apiUrl = channel.api_url.replace(/\/$/, '') + '/chat/completions'
    const models = JSON.parse(channel.models || '[]')
    const modelName = channel.default_model || models[0] || 'gpt-3.5-turbo'

    try {
        const result = await httpRequest(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${channel.api_key}`,
                'Content-Type': 'application/json'
            }
        }, {
            model: modelName,
            messages: [{ role: 'user', content: 'Say "Hello" in one word.' }],
            max_tokens: 20,
            temperature: 0
        }, 15000) // 15s timeout for test

        if (result.status !== 200) {
            const errMsg = result.body?.error?.message || JSON.stringify(result.body)
            // Always use 502 for upstream AI errors — never forward 401/403 which would trigger frontend auto-logout
            return res.status(502).json({ error: `AI API ${result.status}: ${errMsg}` })
        }

        const reply = result.body?.choices?.[0]?.message?.content || ''
        const usage = result.body?.usage || {}
        res.json({
            success: true,
            reply,
            model: modelName,
            tokens: usage.total_tokens || 0
        })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// ─── Fetch available models for a channel ─────────────────────────────────────

router.get('/channels/:id/models', authMiddleware, async (req, res) => {
    const channel = getOne('SELECT * FROM ai_channels WHERE id = ?', [req.params.id])
    if (!channel) return res.status(404).json({ error: '渠道不存在' })
    const apiUrl = channel.api_url.replace(/\/$/, '') + '/models'
    try {
        const result = await httpRequest(apiUrl, {
            headers: { 'Authorization': `Bearer ${channel.api_key}` }
        })
        if (result.status !== 200) return res.status(502).json({ error: `AI API ${result.status}: ${JSON.stringify(result.body)}` })
        const models = (result.body?.data || []).map(m => m.id).filter(Boolean).sort()
        res.json({ models })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// ─── Streaming Chat (SSE proxy) ───────────────────────────────────────────────

router.post('/chat', authMiddleware, async (req, res) => {
    const { channel_id, model, messages, temperature = 0.7 } = req.body
    if (!messages || !messages.length) return res.status(400).json({ error: '消息不能为空' })

    // Find channel
    let channel
    if (channel_id) {
        channel = getOne('SELECT * FROM ai_channels WHERE id = ?', [channel_id])
    } else {
        channel = getOne('SELECT * FROM ai_channels WHERE is_default = 1') ||
            getOne('SELECT * FROM ai_channels ORDER BY id ASC LIMIT 1')
    }
    if (!channel) return res.status(400).json({ error: '未配置 AI 渠道，请先在 AI 设置中添加' })

    const apiUrl = channel.api_url.replace(/\/$/, '') + '/chat/completions'
    const modelName = model || JSON.parse(channel.models || '[]')[0] || 'gpt-3.5-turbo'

    try {
        const result = await httpStream(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${channel.api_key}`,
                'Content-Type': 'application/json'
            }
        }, {
            model: modelName,
            messages,
            temperature,
            stream: true
        })

        if (result.status !== 200) {
            let errData = ''
            result.stream.on('data', c => { errData += c })
            result.stream.on('end', () => {
                try {
                    const errJson = JSON.parse(errData)
                    res.status(502).json({ error: errJson?.error?.message || errData })
                } catch {
                    res.status(502).json({ error: errData || `API Error ${result.status}` })
                }
            })
            return
        }

        // SSE headers
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.setHeader('X-Accel-Buffering', 'no')
        res.flushHeaders()

        // Pipe the upstream SSE stream to client
        let buffer = ''
        result.stream.on('data', (chunk) => {
            buffer += chunk.toString()
            const lines = buffer.split('\n')
            buffer = lines.pop() // Keep incomplete line in buffer

            for (const line of lines) {
                const trimmed = line.trim()
                if (!trimmed) { res.write('\n'); continue }
                if (trimmed.startsWith('data:')) {
                    res.write(trimmed + '\n\n')
                }
            }
        })

        result.stream.on('end', () => {
            if (buffer.trim()) res.write(buffer.trim() + '\n\n')
            res.write('data: [DONE]\n\n')
            res.end()
        })

        result.stream.on('error', (err) => {
            res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
            res.end()
        })

        // Handle client disconnect
        req.on('close', () => {
            result.stream.destroy()
        })

    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// ─── AI Product Generation (non-streaming, returns JSON) ──────────────────────

router.post('/generate-product', authMiddleware, async (req, res) => {
    const { product_name, category_name, channel_id, model, detail_template } = req.body
    if (!product_name) return res.status(400).json({ error: '产品名称不能为空' })

    // Find channel
    let channel
    if (channel_id) {
        channel = getOne('SELECT * FROM ai_channels WHERE id = ?', [channel_id])
    } else {
        channel = getOne('SELECT * FROM ai_channels WHERE is_default = 1') ||
            getOne('SELECT * FROM ai_channels ORDER BY id ASC LIMIT 1')
    }
    if (!channel) return res.status(400).json({ error: '未配置 AI 渠道，请先在 AI 设置中添加' })

    const apiUrl = channel.api_url.replace(/\/$/, '') + '/chat/completions'
    const modelName = model || channel.default_model || JSON.parse(channel.models || '[]')[0] || 'gpt-3.5-turbo'

    // ── Step 1: Generate metadata JSON ──
    const metaPrompt = `You are a professional steel product content generator.
Generate product data for: "${product_name}"${category_name ? ` (category: ${category_name})` : ''}.

CRITICAL: ALL content MUST be 100% about "${product_name}" only. Return ONLY valid JSON, no markdown code blocks.

{
  "name": "Chinese product name (中文)",
  "name_en": "English Product Name",
  "description": "Chinese description 80-120 chars (中文产品介绍)",
  "description_en": "English description 80-120 words, professional SEO",
  "specs": [{"name":"Spec Name","value":"Value with units"}, ...8-12 items],
  "seo_title": "Product - Category | Sunsea Steel Manufacturer",
  "seo_description": "150 chars max English SEO description",
  "seo_keywords": "keyword1, keyword2, keyword3, keyword4, keyword5",
  "faq_items": [{"question":"English Q?","answer":"English A"}, ...5 items]
}`

    try {
        // Call AI for metadata
        const metaResult = await httpRequest(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${channel.api_key}`,
                'Content-Type': 'application/json'
            }
        }, {
            model: modelName,
            messages: [
                { role: 'system', content: metaPrompt },
                { role: 'user', content: `Generate complete product data JSON for: ${product_name}` }
            ],
            temperature: 0.5,
            stream: false
        })

        if (metaResult.status !== 200) {
            const errMsg = metaResult.body?.error?.message || JSON.stringify(metaResult.body)
            return res.status(502).json({ error: `AI API ${metaResult.status}: ${errMsg}` })
        }

        const metaContent = metaResult.body?.choices?.[0]?.message?.content || ''
        let jsonStr = metaContent.trim()
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch) jsonStr = jsonMatch[1].trim()
        const braceMatch = jsonStr.match(/\{[\s\S]*\}/)
        if (braceMatch) jsonStr = braceMatch[0]

        let productData
        try {
            productData = JSON.parse(jsonStr)
        } catch (parseErr) {
            return res.status(500).json({ error: 'AI 返回的 JSON 格式无效，请重试', raw: metaContent.substring(0, 500) })
        }

        // ── Step 2: Generate detail_content if template provided ──
        if (detail_template && detail_template.trim().length > 100) {
            try {
                const detailPrompt = `You are a steel product content expert. Generate DETAILED page content for "${product_name}".
Return ONLY valid JSON with these fields (all in English):

{
  "hero_title": "Short product name for hero banner",
  "hero_subtitle": "One line product tagline with key selling points",
  "overview_title": "What Is [Product Name]?",
  "overview_p1": "First overview paragraph (50-80 words)",
  "overview_p2": "Second paragraph about applications (50-80 words)",
  "overview_p3": "Third paragraph about options/treatments (40-60 words)",
  "spec_table": [["Product","Full product name"],["Coating","Coating details"],["Thickness","Range"],["Width","Range"],["Standard","Standards"],["Surface","Options"],["Steel Grade","Grades"],["Coil ID","508/610mm"],["Coil Weight","Weight range"]],
  "app1_title": "Application Area 1",
  "app1_icon": "🏗️",
  "app1_desc": "Description",
  "app2_title": "Application Area 2",
  "app2_icon": "🏠",
  "app2_desc": "Description",
  "app3_title": "Application Area 3",
  "app3_icon": "🔧",
  "app3_desc": "Description",
  "app4_title": "Application Area 4",
  "app4_icon": "🚗",
  "app4_desc": "Description",
  "compare_title": "Product Type A vs Type B",
  "compare_a_name": "Type A name",
  "compare_a_desc": "Type A description",
  "compare_b_name": "Type B name",
  "compare_b_desc": "Type B description",
  "compare_table": [["Feature","Type A value","Type B value"],["Feature 2","Value","Value"],["Best For","Use A","Use B"]],
  "advantages": ["Advantage 1 title — detail","Advantage 2 — detail","Advantage 3 — detail","Advantage 4 — detail","Advantage 5 — detail","Advantage 6 — detail"],
  "why_cards": [{"title":"Card1","desc":"Detail"},{"title":"Card2","desc":"Detail"},{"title":"Card3","desc":"Detail"},{"title":"Card4","desc":"Detail"}],
  "factory_p1": "Factory paragraph 1",
  "factory_p2": "Factory paragraph 2",
  "factory_points": ["Point 1","Point 2","Point 3","Point 4"],
  "qc_step1_title": "QC Step 1 title",
  "qc_step1_desc": "Description",
  "qc_step2_title": "QC Step 2 title",
  "qc_step2_desc": "Description",
  "qc_cards": [{"title":"QC Card1","desc":"Detail"},{"title":"QC Card2","desc":"Detail"},{"title":"QC Card3","desc":"Detail"},{"title":"QC Card4","desc":"Detail"}],
  "pack_steps": ["Step 1: detail","Step 2: detail","Step 3: detail","Step 4: detail","Step 5: detail"],
  "ship_container": "Container shipping description",
  "ship_bulk": "Bulk vessel description",
  "faqs": [{"q":"Question 1?","a":"Answer 1"},{"q":"Q2?","a":"A2"},{"q":"Q3?","a":"A3"},{"q":"Q4?","a":"A4"},{"q":"Q5?","a":"A5"},{"q":"Q6?","a":"A6"},{"q":"Q7?","a":"A7"}],
  "cta_title": "Looking for a Reliable [Product] Supplier?",
  "cta_desc": "CTA description"
}

ALL content must be 100% about "${product_name}". NO markdown, ONLY JSON.`

                const detailResult = await httpRequest(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${channel.api_key}`,
                        'Content-Type': 'application/json'
                    }
                }, {
                    model: modelName,
                    messages: [
                        { role: 'system', content: detailPrompt },
                        { role: 'user', content: `Generate all detail page content JSON for: ${product_name}` }
                    ],
                    temperature: 0.4,
                    stream: false
                })

                if (detailResult.status === 200) {
                    let rawContent = detailResult.body?.choices?.[0]?.message?.content || ''
                    let contentStr = rawContent.trim()
                    const codeMatch = contentStr.match(/```(?:json)?\s*([\s\S]*?)```/)
                    if (codeMatch) contentStr = codeMatch[1].trim()
                    const braceMatch2 = contentStr.match(/\{[\s\S]*\}/)
                    if (braceMatch2) contentStr = braceMatch2[0]

                    try {
                        const d = JSON.parse(contentStr)
                        // Merge into template
                        let html = detail_template
                        const nameEn = productData.name_en || product_name

                        // Hero
                        html = html.replace(/PRODUCT_NAME/g, d.hero_title || nameEn)
                        html = html.replace(/>Product subtitle and key selling points</, `>${d.hero_subtitle || ''}<`)

                        // Overview
                        html = html.replace(/>What Is PRODUCT_NAME\?</, `>${d.overview_title || 'What Is ' + nameEn + '?'}<`)
                        html = html.replace(/<p><strong>PRODUCT_NAME<\/strong> overview paragraph 1\.<\/p>/, `<p><strong>${d.hero_title || nameEn}</strong> ${d.overview_p1 || ''}</p>`)
                        html = html.replace(/>Overview paragraph 2 with applications\.</, `>${d.overview_p2 || ''}<`)
                        html = html.replace(/>Overview paragraph 3 with edge conditions and treatments\.</, `>${d.overview_p3 || ''}<`)

                        // Spec table
                        if (d.spec_table?.length) {
                            let specRows = d.spec_table.map(r => `<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join('')
                            html = html.replace(/<tbody><tr><th>Product<\/th>[\s\S]*?<\/tbody>/, `<tbody>${specRows}</tbody>`)
                        }

                        // Applications
                        const apps = [
                            { t: 'app1_title', i: 'app1_icon', d: 'app1_desc', pt: 'Application Area 1', pd: 'Description of application area 1.' },
                            { t: 'app2_title', i: 'app2_icon', d: 'app2_desc', pt: 'Application Area 2', pd: 'Description of application area 2.' },
                            { t: 'app3_title', i: 'app3_icon', d: 'app3_desc', pt: 'Application Area 3', pd: 'Description of application area 3.' },
                            { t: 'app4_title', i: 'app4_icon', d: 'app4_desc', pt: 'Application Area 4', pd: 'Description of application area 4.' }
                        ]
                        for (const app of apps) {
                            if (d[app.t]) html = html.replace(new RegExp('>' + app.pt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '<'), `>${(d[app.i]||'') + ' ' + d[app.t]}<`)
                            if (d[app.d]) html = html.replace(new RegExp('>' + app.pd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '<'), `>${d[app.d]}<`)
                        }

                        // Comparison
                        if (d.compare_title) html = html.replace(/>Product Comparison</, `>${d.compare_title}<`)
                        if (d.compare_a_name) html = html.replace(/>Product Type A<\/h3>/g, `>${d.compare_a_name}</h3>`)
                        if (d.compare_b_name) html = html.replace(/>Product Type B<\/h3>/g, `>${d.compare_b_name}</h3>`)

                        // Advantages
                        if (d.advantages?.length) {
                            let advHtml = d.advantages.map(a => {
                                const parts = a.split(' — ')
                                return `<li><strong>${parts[0]}</strong>${parts.length > 1 ? ' — ' + parts[1] : ''}</li>`
                            }).join('')
                            html = html.replace(/<li><strong>Advantage 1<\/strong>[\s\S]*?<\/ul>/, advHtml + '</ul>')
                        }

                        // Why cards
                        if (d.why_cards?.length) {
                            let cardsHtml = d.why_cards.map(c => `<div class="card"><h3>${c.title}</h3><p>${c.desc}</p></div>`).join('')
                            html = html.replace(/<div class="card"><h3>Reason 1[\s\S]*?<\/div><\/div>/, cardsHtml + '</div>')
                        }

                        // Factory
                        if (d.factory_p1) html = html.replace(/>Factory description paragraph 1\.</, `>${d.factory_p1}<`)
                        if (d.factory_p2) html = html.replace(/>Factory description paragraph 2\.</, `>${d.factory_p2}<`)

                        // FAQ
                        if (d.faqs?.length) {
                            let faqHtml = d.faqs.map(f => `<div class="faq-item"><h3>${f.q}</h3><p>${f.a}</p></div>`).join('')
                            html = html.replace(/<div class="faq-list">[\s\S]*?<\/div>\s*<\/section>/, `<div class="faq-list">${faqHtml}</div></section>`)
                        }

                        // CTA
                        if (d.cta_title) html = html.replace(/>Looking for a Reliable PRODUCT_NAME Supplier\?</, `>${d.cta_title}<`)
                        if (d.cta_desc) html = html.replace(/>Contact us for pricing, specifications[\s\S]*?<\/p>/, `>${d.cta_desc}</p>`)

                        // Final cleanup: replace any remaining PRODUCT_NAME
                        html = html.replace(/PRODUCT_NAME/g, d.hero_title || nameEn)

                        productData.detail_content = html
                    } catch (parseErr) {
                        console.error('Detail JSON parse error:', parseErr.message)
                    }
                }
            } catch (e) {
                console.error('Detail content generation error:', e.message)
            }
        }

        res.json(productData)
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

export default router
