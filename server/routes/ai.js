import { Router } from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import https from 'https'
import http from 'http'

const router = Router()

// ─── HTTP helper ──────────────────────────────────────────────────────────────

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
    // Mask API keys
    const masked = channels.map(c => ({
        ...c,
        api_key_display: c.api_key && c.api_key.length > 8
            ? c.api_key.slice(0, 4) + '****' + c.api_key.slice(-4) : '****',
        models: JSON.parse(c.models || '[]')
    }))
    res.json(masked)
})

router.post('/channels', authMiddleware, (req, res) => {
    const { name, api_url, api_key, models, is_default } = req.body
    if (!name || !api_url || !api_key) return res.status(400).json({ error: '名称、API URL 和 API Key 不能为空' })
    if (is_default) run('UPDATE ai_channels SET is_default = 0')
    const result = run(
        'INSERT INTO ai_channels (name, api_url, api_key, models, is_default) VALUES (?, ?, ?, ?, ?)',
        [name, api_url, api_key, JSON.stringify(models || []), is_default ? 1 : 0]
    )
    res.json({ id: result.lastInsertRowid, message: '创建成功' })
})

router.put('/channels/:id', authMiddleware, (req, res) => {
    const { id } = req.params
    const { name, api_url, api_key, models, is_default } = req.body
    const channel = getOne('SELECT * FROM ai_channels WHERE id = ?', [id])
    if (!channel) return res.status(404).json({ error: '渠道不存在' })
    const finalKey = (api_key && !api_key.includes('****')) ? api_key : channel.api_key
    if (is_default) run('UPDATE ai_channels SET is_default = 0')
    run(
        'UPDATE ai_channels SET name=?, api_url=?, api_key=?, models=?, is_default=? WHERE id=?',
        [name || channel.name, api_url || channel.api_url, finalKey, JSON.stringify(models || JSON.parse(channel.models || '[]')), is_default ? 1 : 0, id]
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

export default router
