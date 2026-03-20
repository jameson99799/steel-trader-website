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

// ─── Fetch available models for a channel ─────────────────────────────────────

router.get('/channels/:id/models', authMiddleware, async (req, res) => {
    const channel = getOne('SELECT * FROM ai_channels WHERE id = ?', [req.params.id])
    if (!channel) return res.status(404).json({ error: '渠道不存在' })
    const apiUrl = channel.api_url.replace(/\/$/, '') + '/models'
    try {
        const result = await httpRequest(apiUrl, {
            headers: { 'Authorization': `Bearer ${channel.api_key}` }
        })
        if (result.status !== 200) return res.status(result.status).json({ error: JSON.stringify(result.body) })
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
                    res.status(result.status).json({ error: errJson?.error?.message || errData })
                } catch {
                    res.status(result.status).json({ error: errData || `API Error ${result.status}` })
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
            return res.status(metaResult.status).json({ error: errMsg })
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
                const templatePrompt = `You are a product detail page content generator for a steel company.

TASK: Replace ALL text content in the HTML template below with content specific to "${product_name}".

RULES:
1. Keep the EXACT same HTML structure, CSS classes, and layout - do NOT change any HTML tags or attributes
2. Replace ALL text content (headings, paragraphs, table data, FAQ questions/answers, etc.) with content about "${product_name}"
3. Keep all image src, placeholder paths, and {{template_variables}} exactly as they are
4. All text content must be in English
5. Content must be 100% accurate for "${product_name}" - do NOT mix in content from other products
6. Return ONLY the HTML code, no explanations, no markdown code blocks

HTML TEMPLATE:
${detail_template.substring(0, 30000)}`

                const detailResult = await httpRequest(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${channel.api_key}`,
                        'Content-Type': 'application/json'
                    }
                }, {
                    model: modelName,
                    messages: [
                        { role: 'system', content: templatePrompt },
                        { role: 'user', content: `Generate the product detail HTML for: ${product_name}. Keep the same HTML structure, only replace text content.` }
                    ],
                    temperature: 0.3,
                    stream: false
                })

                if (detailResult.status === 200) {
                    let html = detailResult.body?.choices?.[0]?.message?.content || ''
                    // Strip markdown code blocks if present
                    const htmlMatch = html.match(/```(?:html)?\s*([\s\S]*?)```/)
                    if (htmlMatch) html = htmlMatch[1].trim()
                    // Basic validation: must contain HTML tags
                    if (html.includes('<') && html.length > 200) {
                        productData.detail_content = html
                    }
                }
            } catch (e) {
                // detail_content generation failed, continue without it
                console.error('Detail content generation error:', e.message)
            }
        }

        res.json(productData)
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

export default router
