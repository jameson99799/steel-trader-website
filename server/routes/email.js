import express from 'express'
import { getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { sendMail, getEmailConfig, getSslDaysRemaining } from '../emailService.js'

const router = express.Router()

// GET /api/email/config
router.get('/config', authMiddleware, (req, res) => {
    const config = getEmailConfig()
    // Mask password
    res.json({ ...config, smtp_pass: config.smtp_pass ? '••••••••' : '' })
})

// PUT /api/email/config
router.put('/config', authMiddleware, express.json(), (req, res) => {
    const { smtp_host, smtp_port, smtp_user, smtp_pass, from_name, to_email, ssl_warn_days, enabled } = req.body
    const existing = getOne('SELECT id FROM email_config WHERE id = 1')

    if (existing) {
        // Only update password if a real value was provided (not masked)
        const passUpdate = smtp_pass && smtp_pass !== '••••••••' ? smtp_pass : getOne('SELECT smtp_pass FROM email_config WHERE id = 1')?.smtp_pass
        run(`UPDATE email_config SET smtp_host=?, smtp_port=?, smtp_user=?, smtp_pass=?,
         from_name=?, to_email=?, ssl_warn_days=?, enabled=? WHERE id=1`,
            [smtp_host, smtp_port || 465, smtp_user, passUpdate, from_name, to_email, ssl_warn_days || 30, enabled ? 1 : 0])
    } else {
        run(`INSERT INTO email_config (id, smtp_host, smtp_port, smtp_user, smtp_pass, from_name, to_email, ssl_warn_days, enabled)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [smtp_host, smtp_port || 465, smtp_user, smtp_pass, from_name, to_email, ssl_warn_days || 30, enabled ? 1 : 0])
    }
    res.json({ message: '邮件配置已保存' })
})

// POST /api/email/test — send test email
router.post('/test', authMiddleware, express.json(), async (req, res) => {
    try {
        const { to } = req.body
        const config = getEmailConfig()
        if (!config.smtp_host || !config.smtp_user) {
            return res.status(400).json({ error: '请先保存SMTP配置' })
        }
        await sendMail({
            to: to || config.to_email,
            subject: '✅ 邮件测试成功 - SunSea Steel',
            html: `
        <div style="font-family:Arial,sans-serif;padding:24px;max-width:500px">
          <h2 style="color:#1e40af">✅ 邮件发送测试成功</h2>
          <p>这是来自 SunSea Steel 后台的测试邮件，说明您的邮件配置正常。</p>
          <p style="color:#64748b;font-size:13px">发送时间：${new Date().toLocaleString('zh-CN')}</p>
        </div>
      `
        })
        res.json({ success: true, message: `测试邮件已发送到 ${to || config.to_email}` })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// GET /api/email/ssl-status — get SSL cert expiry info
router.get('/ssl-status', authMiddleware, (req, res) => {
    const ssl = getSslDaysRemaining()
    const config = getEmailConfig()
    res.json({
        ssl,
        warn_days: config.ssl_warn_days || 30,
        will_warn: ssl ? ssl.days <= (config.ssl_warn_days || 30) : false
    })
})

export default router
