import express from 'express'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { authMiddleware } from './auth.js'

const router = express.Router()
const __dirname = dirname(fileURLToPath(import.meta.url))
const SSL_DIR = join(__dirname, '..', '..', 'ssl')

// Ensure ssl directory exists
if (!fs.existsSync(SSL_DIR)) fs.mkdirSync(SSL_DIR, { recursive: true })

// Get SSL status
router.get('/ssl/status', authMiddleware, (req, res) => {
    const certFile = join(SSL_DIR, 'cert.pem')
    const keyFile = join(SSL_DIR, 'key.pem')
    const hasCert = fs.existsSync(certFile)
    const hasKey = fs.existsSync(keyFile)

    let certInfo = null
    if (hasCert) {
        const stat = fs.statSync(certFile)
        certInfo = {
            size: stat.size,
            modified: stat.mtime
        }
    }

    res.json({ hasCert, hasKey, certInfo })
})

// Upload SSL cert and key (text content)
router.post('/ssl/upload', authMiddleware, express.json({ limit: '1mb' }), (req, res) => {
    try {
        const { cert, key } = req.body
        if (!cert || !key) return res.status(400).json({ error: '请提供证书和私钥' })

        // Basic validation
        if (!cert.includes('-----BEGIN CERTIFICATE-----')) {
            return res.status(400).json({ error: '证书格式无效，请使用 PEM 格式（以 -----BEGIN CERTIFICATE----- 开头）' })
        }
        if (!key.includes('-----BEGIN') || !key.includes('PRIVATE KEY-----')) {
            return res.status(400).json({ error: '私钥格式无效，请使用 PEM 格式（以 -----BEGIN PRIVATE KEY----- 开头）' })
        }

        fs.writeFileSync(join(SSL_DIR, 'cert.pem'), cert, 'utf8')
        fs.writeFileSync(join(SSL_DIR, 'key.pem'), key, 'utf8')

        res.json({ success: true, message: 'SSL证书已保存，请重启服务以生效' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// Delete SSL certs
router.delete('/ssl', authMiddleware, (req, res) => {
    try {
        const certFile = join(SSL_DIR, 'cert.pem')
        const keyFile = join(SSL_DIR, 'key.pem')
        if (fs.existsSync(certFile)) fs.unlinkSync(certFile)
        if (fs.existsSync(keyFile)) fs.unlinkSync(keyFile)
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

export default router
