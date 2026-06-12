import { Router } from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import https from 'https'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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
    const { name, api_url, api_key, models, is_default, default_model, is_image_default } = req.body
    if (!name || !api_url || !api_key) return res.status(400).json({ error: '名称、API URL 和 API Key 不能为空' })
    if (is_default) run('UPDATE ai_channels SET is_default = 0')
    if (is_image_default) run('UPDATE ai_channels SET is_image_default = 0')
    const result = run(
        'INSERT INTO ai_channels (name, api_url, api_key, models, is_default, default_model, is_image_default) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, api_url, api_key, JSON.stringify(models || []), is_default ? 1 : 0, default_model || '', is_image_default ? 1 : 0]
    )
    res.json({ id: result.lastInsertRowid, message: '创建成功' })
})

router.put('/channels/:id', authMiddleware, (req, res) => {
    const { id } = req.params
    const { name, api_url, api_key, models, is_default, default_model, is_image_default } = req.body
    const channel = getOne('SELECT * FROM ai_channels WHERE id = ?', [id])
    if (!channel) return res.status(404).json({ error: '渠道不存在' })
    const finalKey = (api_key && !api_key.includes('****')) ? api_key : channel.api_key
    if (is_default) run('UPDATE ai_channels SET is_default = 0')
    if (is_image_default) run('UPDATE ai_channels SET is_image_default = 0')
    run(
        'UPDATE ai_channels SET name=?, api_url=?, api_key=?, models=?, is_default=?, default_model=?, is_image_default=? WHERE id=?',
        [name || channel.name, api_url || channel.api_url, finalKey, JSON.stringify(models || JSON.parse(channel.models || '[]')), is_default ? 1 : 0, default_model || channel.default_model || '', is_image_default ? 1 : 0, id]
    )
    res.json({ message: '更新成功' })
})

router.delete('/channels/:id', authMiddleware, (req, res) => {
    run('DELETE FROM ai_channels WHERE id = ?', [req.params.id])
    res.json({ message: '删除成功' })
})

router.put('/channels/:id/set-default', authMiddleware, (req, res) => {
    run('UPDATE ai_channels SET is_default = 0')
    run('UPDATE ai_channels SET is_default = 1 WHERE id = ?', [req.params.id])
    res.json({ message: '已设为默认文本渠道' })
})

router.put('/channels/:id/set-image-default', authMiddleware, (req, res) => {
    run('UPDATE ai_channels SET is_image_default = 0')
    run('UPDATE ai_channels SET is_image_default = 1 WHERE id = ?', [req.params.id])
    res.json({ message: '已设为默认生图渠道' })
})

// ─── Test channel connectivity ────────────────────────────────────────────────

router.post('/channels/:id/test', authMiddleware, async (req, res) => {
    const channel = getOne('SELECT * FROM ai_channels WHERE id = ?', [req.params.id])
    if (!channel) return res.status(404).json({ error: '渠道不存在' })

    let apiUrl = channel.api_url.replace(/\/$/, '')
    if (!apiUrl.endsWith('/chat/completions')) {
        apiUrl += '/chat/completions'
    }
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
    let baseApiUrl = channel.api_url.replace(/\/$/, '')
    if (baseApiUrl.endsWith('/chat/completions')) {
        baseApiUrl = baseApiUrl.replace(/\/chat\/completions$/, '')
    }
    const apiUrl = baseApiUrl + '/models'
    const defaultModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4', 'claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-haiku-20240307', 'gemini-1.5-pro', 'gemini-1.5-flash', 'deepseek-chat', 'deepseek-coder']
    try {
        const result = await httpRequest(apiUrl, {
            headers: { 'Authorization': `Bearer ${channel.api_key}` }
        })
        if (result.status !== 200) return res.json({ models: defaultModels })
        let body = result.body
        if (typeof body === 'string') {
            try { body = JSON.parse(body) } catch(e) {}
        }
        let modelsList = body?.data || body || []
        if (!Array.isArray(modelsList) && Array.isArray(body?.models)) modelsList = body.models
        const models = (Array.isArray(modelsList) ? modelsList : []).map(m => m.id || m).filter(Boolean).sort()
        res.json({ models: models.length > 0 ? models : defaultModels })
    } catch (e) {
        res.json({ models: defaultModels })
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

// ─── AI Image Generation ──────────────────────────────────────────────────────

async function downloadImage(urlStr, destPath) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr)
        const lib = url.protocol === 'https:' ? https : http
        const file = fs.createWriteStream(destPath)
        lib.get(urlStr, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download image, status code: ${response.statusCode}`))
                return
            }
            response.pipe(file)
            file.on('finish', () => {
                file.close(resolve)
            })
        }).on('error', (err) => {
            fs.unlink(destPath, () => reject(err))
        })
    })
}

router.post('/generate-image', authMiddleware, async (req, res) => {
    const { target_type, target_id, prompt, model, size } = req.body
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' })

    const channel = getOne('SELECT * FROM ai_channels WHERE is_image_default = 1') ||
                    getOne('SELECT * FROM ai_channels WHERE is_default = 1') ||
                    getOne('SELECT * FROM ai_channels ORDER BY id ASC LIMIT 1')

    if (!channel) return res.status(400).json({ error: 'No AI channel configured' })

    const baseApiUrl = channel.api_url.replace(/\/$/, '')
    const isChatEndpoint = baseApiUrl.endsWith('/chat/completions')
    const apiUrl = isChatEndpoint ? baseApiUrl : (baseApiUrl + '/images/generations')
    const modelName = model || 'dall-e-3'

    try {
        const payload = isChatEndpoint ? {
            model: modelName,
            messages: [{ role: 'user', content: prompt }]
        } : {
            model: modelName,
            prompt: prompt,
            n: 1,
            size: size || '1024x1024'
        }

        const result = await httpRequest(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${channel.api_key}`,
                'Content-Type': 'application/json'
            }
        }, payload, 120000)

        if (result.status !== 200) {
            const errMsg = result.body?.error?.message || JSON.stringify(result.body)
            return res.status(502).json({ error: `AI Image API ${result.status}: ${errMsg}` })
        }

        let generatedUrl = ''
        if (isChatEndpoint) {
            const reply = result.body?.choices?.[0]?.message?.content || ''
            // Extract URL from markdown format ![img](url) or just http...
            const mdMatch = reply.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/)
            if (mdMatch) {
                generatedUrl = mdMatch[1]
            } else {
                const urlMatch = reply.match(/(https?:\/\/[^\s]+)/)
                if (urlMatch) generatedUrl = urlMatch[1]
            }
        } else {
            generatedUrl = result.body?.data?.[0]?.url
        }

        if (!generatedUrl) {
            return res.status(500).json({ error: 'API returned success but no image URL found', raw: result.body })
        }

        // Download the image
        const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'ai-images')
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true })
        }

        const filename = `ai-${Date.now()}-${Math.floor(Math.random()*1000)}.png`
        const filepath = path.join(uploadsDir, filename)
        
        await downloadImage(generatedUrl, filepath)

        const publicUrl = `/uploads/ai-images/${filename}`

        // Save to database
        const insertResult = run(
            'INSERT INTO ai_generated_images (target_type, target_id, prompt, image_url) VALUES (?, ?, ?, ?)',
            [target_type || '', target_id || 0, prompt, publicUrl]
        )

        const savedImage = getOne('SELECT * FROM ai_generated_images WHERE id = ?', [insertResult.lastInsertRowid])

        res.json({ success: true, image: savedImage })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

router.get('/images/:type/:id', authMiddleware, (req, res) => {
    try {
        const images = getAll(
            'SELECT * FROM ai_generated_images WHERE target_type = ? AND target_id = ? ORDER BY id DESC',
            [req.params.type, req.params.id]
        )
        res.json(images)
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

router.post('/images/delete', authMiddleware, (req, res) => {
    const { ids } = req.body
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'No IDs provided' })
    try {
        const placeholders = ids.map(() => '?').join(',')
        run(`DELETE FROM ai_generated_images WHERE id IN (${placeholders})`, ids)
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

export default router

