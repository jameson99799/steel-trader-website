import express from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import nodemailer from 'nodemailer'

const router = express.Router()
router.use(express.json({ limit: '5mb' }))

// ─── In-memory task runner ───────────────────────────────────────────────────
const activeTasks = new Map() // taskId -> { timer, cancelled }

function cancelTask(taskId) {
    const t = activeTasks.get(taskId)
    if (t) { clearTimeout(t.timer); t.cancelled = true; activeTasks.delete(taskId) }
}

async function runTask(taskId) {
    const task = getOne('SELECT * FROM mail_tasks WHERE id=?', [taskId])
    if (!task) return
    run("UPDATE mail_tasks SET status='running' WHERE id=?", [taskId])

    const templateIds = JSON.parse(task.template_ids || '[]')
    const contactIds = JSON.parse(task.contact_ids || '[]')
    const accountIds = JSON.parse(task.account_ids || '[]')

    const templates = templateIds.map(id => getOne('SELECT * FROM mail_templates WHERE id=?', [id])).filter(Boolean)
    const contacts = contactIds.map(id => getOne('SELECT * FROM mail_contacts WHERE id=?', [id])).filter(Boolean)
    let accounts = accountIds.length
        ? accountIds.map(id => getOne('SELECT * FROM smtp_accounts WHERE id=?', [id])).filter(Boolean)
        : getAll('SELECT * FROM smtp_accounts WHERE enabled=1 ORDER BY id ASC')

    if (!templates.length || !contacts.length || !accounts.length) {
        run("UPDATE mail_tasks SET status='failed' WHERE id=?", [taskId])
        return
    }

    run('UPDATE mail_tasks SET total_count=?, sent_count=0 WHERE id=?', [contacts.length, taskId])
    const ctx = { cancelled: false }
    activeTasks.set(taskId, ctx)

    let tplIdx = 0; let acctIdx = 0
    for (let i = 0; i < contacts.length; i++) {
        if (ctx.cancelled) break
        const contact = contacts[i]
        const template = templates[tplIdx % templates.length]
        const account = accounts[acctIdx % accounts.length]
        tplIdx++; acctIdx++

        try {
            const transport = nodemailer.createTransport({
                host: account.smtp_host, port: parseInt(account.smtp_port) || 465,
                secure: parseInt(account.smtp_port) === 465,
                auth: { user: account.smtp_user, pass: account.smtp_pass },
                tls: { rejectUnauthorized: false }
            })
            // Personalize subject/body
            const subj = template.subject.replace(/{{name}}/g, contact.name || '').replace(/{{company}}/g, contact.company || '')
            const body = template.html_body.replace(/{{name}}/g, contact.name || '').replace(/{{company}}/g, contact.company || '')

            const mailOpts = {
                from: `"${account.from_name || 'SunSea Steel'}" <${account.smtp_user}>`,
                to: contact.email,
                subject: subj,
                html: body
            }
            if (task.cc) mailOpts.cc = task.cc
            if (task.read_receipt) mailOpts.headers = { 'Disposition-Notification-To': account.smtp_user, 'Return-Receipt-To': account.smtp_user }

            await transport.sendMail(mailOpts)
            run(`INSERT INTO mail_logs (task_id, contact_email, contact_name, account_id, template_id, subject, status) VALUES (?,?,?,?,?,?,'sent')`,
                [taskId, contact.email, contact.name || '', account.id, template.id, subj])
            run('UPDATE smtp_accounts SET send_count = send_count + 1 WHERE id=?', [account.id])
            run('UPDATE mail_tasks SET sent_count = sent_count + 1 WHERE id=?', [taskId])
        } catch (e) {
            run(`INSERT INTO mail_logs (task_id, contact_email, contact_name, account_id, template_id, subject, status) VALUES (?,?,?,?,?,?,'failed')`,
                [taskId, contact.email, contact.name || '', account.id, template.id, template.subject])
        }

        // Wait for next send if not last
        if (i < contacts.length - 1 && !ctx.cancelled) {
            const delay = (Math.floor(Math.random() * (task.interval_max - task.interval_min + 1)) + task.interval_min) * 1000
            await new Promise(resolve => { ctx.timer = setTimeout(resolve, delay) })
        }
    }

    activeTasks.delete(taskId)
    run("UPDATE mail_tasks SET status=? WHERE id=?", [ctx.cancelled ? 'cancelled' : 'done', taskId])
}

// ─── Templates ───────────────────────────────────────────────────────────────
router.get('/templates', authMiddleware, (req, res) => {
    res.json(getAll('SELECT * FROM mail_templates ORDER BY id DESC'))
})
router.post('/templates', authMiddleware, (req, res) => {
    const { name, subject, html_body, note } = req.body
    const r = run('INSERT INTO mail_templates (name, subject, html_body, note) VALUES (?,?,?,?)', [name, subject, html_body, note || ''])
    res.json({ id: r.lastInsertRowid, message: '模板已保存' })
})
router.put('/templates/:id', authMiddleware, (req, res) => {
    const { name, subject, html_body, note } = req.body
    run('UPDATE mail_templates SET name=?, subject=?, html_body=?, note=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
        [name, subject, html_body, note || '', req.params.id])
    res.json({ message: '模板已更新' })
})
router.delete('/templates/:id', authMiddleware, (req, res) => {
    run('DELETE FROM mail_templates WHERE id=?', [req.params.id])
    res.json({ message: '已删除' })
})

// ─── Contacts ─────────────────────────────────────────────────────────────────
router.get('/contacts', authMiddleware, (req, res) => {
    res.json(getAll('SELECT * FROM mail_contacts ORDER BY id DESC'))
})
router.post('/contacts', authMiddleware, (req, res) => {
    const { email, name, company } = req.body
    if (!email) return res.status(400).json({ error: '请填写邮箱' })
    const r = run('INSERT INTO mail_contacts (email, name, company) VALUES (?,?,?)', [email, name || '', company || ''])
    res.json({ id: r.lastInsertRowid, message: '联系人已添加' })
})
router.post('/contacts/import', authMiddleware, (req, res) => {
    // Bulk import from text (one per line: email,name,company)
    const { lines } = req.body
    let added = 0
    for (const line of (lines || [])) {
        const [email, name, company] = line.split(',').map(s => s.trim())
        if (email && email.includes('@')) {
            try { run('INSERT INTO mail_contacts (email, name, company) VALUES (?,?,?)', [email, name || '', company || '']); added++ } catch (e) {}
        }
    }
    res.json({ message: `已导入 ${added} 个联系人` })
})
router.put('/contacts/:id', authMiddleware, (req, res) => {
    const { email, name, company } = req.body
    run('UPDATE mail_contacts SET email=?, name=?, company=? WHERE id=?', [email, name || '', company || '', req.params.id])
    res.json({ message: '联系人已更新' })
})
router.delete('/contacts/:id', authMiddleware, (req, res) => {
    run('DELETE FROM mail_contacts WHERE id=?', [req.params.id])
    res.json({ message: '已删除' })
})

// ─── Tasks ────────────────────────────────────────────────────────────────────
router.get('/tasks', authMiddleware, (req, res) => {
    res.json(getAll('SELECT * FROM mail_tasks ORDER BY id DESC'))
})
router.post('/tasks', authMiddleware, (req, res) => {
    const { name, template_ids, contact_ids, account_ids, interval_min, interval_max, cc, read_receipt } = req.body
    const r = run(`INSERT INTO mail_tasks (name, status, template_ids, contact_ids, account_ids, interval_min, interval_max, cc, read_receipt)
        VALUES (?,'pending',?,?,?,?,?,?,?)`,
        [name || 'New Task',
         JSON.stringify(template_ids || []), JSON.stringify(contact_ids || []),
         JSON.stringify(account_ids || []),
         interval_min || 10, interval_max || 60, cc || '', read_receipt !== false ? 1 : 0])
    res.json({ id: r.lastInsertRowid, message: '任务已创建' })
})
router.post('/tasks/:id/start', authMiddleware, async (req, res) => {
    const task = getOne('SELECT * FROM mail_tasks WHERE id=?', [req.params.id])
    if (!task) return res.status(404).json({ error: '任务不存在' })
    if (activeTasks.has(+req.params.id)) return res.status(400).json({ error: '任务正在运行中' })
    run("UPDATE mail_tasks SET status='pending', sent_count=0 WHERE id=?", [req.params.id])
    // Fire and forget
    runTask(+req.params.id).catch(e => console.error('Task error:', e))
    res.json({ message: '任务已开始' })
})
router.post('/tasks/:id/stop', authMiddleware, (req, res) => {
    cancelTask(+req.params.id)
    res.json({ message: '任务已停止' })
})
router.delete('/tasks/:id', authMiddleware, (req, res) => {
    cancelTask(+req.params.id)
    run('DELETE FROM mail_tasks WHERE id=?', [req.params.id])
    run('DELETE FROM mail_logs WHERE task_id=?', [req.params.id])
    res.json({ message: '已删除' })
})

// ─── Logs ─────────────────────────────────────────────────────────────────────
router.get('/logs', authMiddleware, (req, res) => {
    const taskId = req.query.task_id
    const logs = taskId
        ? getAll('SELECT * FROM mail_logs WHERE task_id=? ORDER BY id DESC', [taskId])
        : getAll('SELECT * FROM mail_logs ORDER BY id DESC LIMIT 500')
    res.json(logs)
})

export default router
