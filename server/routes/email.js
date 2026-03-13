import express from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { getSslDaysRemaining } from '../emailService.js'
import nodemailer from 'nodemailer'

const router = express.Router()

// ─── SMTP Accounts CRUD ─────────────────────────────────────────────────────

// GET all accounts (plaintext passwords for admin editing)
router.get('/accounts', authMiddleware, (req, res) => {
    const accounts = getAll('SELECT * FROM smtp_accounts ORDER BY is_default DESC, id ASC')
    res.json(accounts)
})

// POST create account
router.post('/accounts', authMiddleware, express.json(), (req, res) => {
    const { name, smtp_host, smtp_port, smtp_user, smtp_pass, from_name, is_default, enabled } = req.body
    if (!smtp_host || !smtp_user || !smtp_pass) return res.status(400).json({ error: '请填写SMTP服务器、账号和密码' })
    if (is_default) run('UPDATE smtp_accounts SET is_default = 0')
    const result = run(
        `INSERT INTO smtp_accounts (name, smtp_host, smtp_port, smtp_user, smtp_pass, from_name, is_default, enabled) VALUES (?,?,?,?,?,?,?,?)`,
        [name || smtp_user, smtp_host, smtp_port || 465, smtp_user, smtp_pass, from_name || 'SunSea Steel', is_default ? 1 : 0, enabled !== false ? 1 : 0]
    )
    res.json({ id: result.lastInsertRowid, message: '账号已添加' })
})

// PUT update account
router.put('/accounts/:id', authMiddleware, express.json(), (req, res) => {
    const { name, smtp_host, smtp_port, smtp_user, smtp_pass, from_name, is_default, enabled } = req.body
    if (is_default) run('UPDATE smtp_accounts SET is_default = 0')
    run(
        `UPDATE smtp_accounts SET name=?, smtp_host=?, smtp_port=?, smtp_user=?, smtp_pass=?, from_name=?, is_default=?, enabled=? WHERE id=?`,
        [name, smtp_host, smtp_port || 465, smtp_user, smtp_pass, from_name || 'SunSea Steel', is_default ? 1 : 0, enabled ? 1 : 0, req.params.id]
    )
    res.json({ message: '账号已更新' })
})

// DELETE account
router.delete('/accounts/:id', authMiddleware, (req, res) => {
    run('DELETE FROM smtp_accounts WHERE id=?', [req.params.id])
    res.json({ message: '账号已删除' })
})

// POST test single account
router.post('/accounts/:id/test', authMiddleware, express.json(), async (req, res) => {
    try {
        const acct = getOne('SELECT * FROM smtp_accounts WHERE id=?', [req.params.id])
        if (!acct) return res.status(404).json({ error: '账号不存在' })
        const to = req.body.to
        if (!to) return res.status(400).json({ error: '请填写测试收件邮箱' })
        const transporter = nodemailer.createTransport({
            host: acct.smtp_host,
            port: parseInt(acct.smtp_port) || 465,
            secure: parseInt(acct.smtp_port) === 465,
            auth: { user: acct.smtp_user, pass: acct.smtp_pass },
            tls: { rejectUnauthorized: false }
        })
        await transporter.sendMail({
            from: `"${acct.from_name || 'SunSea Steel'}" <${acct.smtp_user}>`,
            to,
            subject: '✅ 邮件测试成功 - SunSea Steel',
            html: `<div style="font-family:Arial,sans-serif;padding:24px;max-width:500px">
              <h2 style="color:#1e40af">✅ 邮件发送测试成功</h2>
              <p>账号：<strong>${acct.smtp_user}</strong></p>
              <p>SMTP：${acct.smtp_host}:${acct.smtp_port}</p>
              <p style="color:#64748b;font-size:13px">发送时间：${new Date().toLocaleString('zh-CN')}</p>
            </div>`
        })
        res.json({ success: true, message: `测试邮件已发送到 ${to}` })
    } catch (e) {
        res.status(500).json({ error: '发送失败: ' + e.message })
    }
})

// ─── Email Settings (global, single row) ────────────────────────────────────

router.get('/settings', authMiddleware, (req, res) => {
    const s = getOne('SELECT * FROM email_settings WHERE id=1') || {}
    res.json(s)
})

router.put('/settings', authMiddleware, express.json(), (req, res) => {
    const { to_emails, ssl_warn_days, round_robin } = req.body
    const existing = getOne('SELECT id FROM email_settings WHERE id=1')
    if (existing) {
        run(`UPDATE email_settings SET to_emails=?, ssl_warn_days=?, round_robin=? WHERE id=1`,
            [to_emails || '', ssl_warn_days || 30, round_robin ? 1 : 0])
    } else {
        run(`INSERT INTO email_settings (id, to_emails, ssl_warn_days, round_robin) VALUES (1,?,?,?)`,
            [to_emails || '', ssl_warn_days || 30, round_robin ? 1 : 0])
    }
    res.json({ message: '设置已保存' })
})

// ─── SSL status ──────────────────────────────────────────────────────────────
router.get('/ssl-status', authMiddleware, (req, res) => {
    const ssl = getSslDaysRemaining()
    const settings = getOne('SELECT ssl_warn_days FROM email_settings WHERE id=1') || {}
    const warnDays = settings.ssl_warn_days || 30
    res.json({ ssl, warn_days: warnDays, will_warn: ssl ? ssl.days <= warnDays : false })
})

// ─── Legacy config endpoint (kept for backward compat) ───────────────────────
router.get('/config', authMiddleware, (req, res) => {
    const accounts = getAll('SELECT * FROM smtp_accounts WHERE is_default=1 LIMIT 1')
    const acct = accounts[0] || {}
    const settings = getOne('SELECT * FROM email_settings WHERE id=1') || {}
    res.json({
        smtp_host: acct.smtp_host || '', smtp_port: acct.smtp_port || 465,
        smtp_user: acct.smtp_user || '', smtp_pass: acct.smtp_pass ? '••••••••' : '',
        from_name: acct.from_name || 'SunSea Steel',
        to_email: settings.to_emails || '', ssl_warn_days: settings.ssl_warn_days || 30,
        enabled: !!acct.enabled
    })
})

export default router
