import express from 'express'
import { getAll, getOne, run } from '../db.js'
import { dualAuthMiddleware as authMiddleware } from '../middleware/auth.js'
import nodemailer from 'nodemailer'
import { attachmentUpload } from '../middleware/upload.js'
import { join, dirname, basename } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const uploadsDir = join(__dirname, '..', '..', 'uploads')

const router = express.Router()
router.use(express.json({ limit: '5mb' }))

// ─── User identity helper for data isolation ────────────────────────────────
function getUserId(req) {
    if (req.user) return { userId: String(req.user.id), isAdmin: true } // website admin
    if (req.crmUser) {
        const isAdmin = req.crmUser.role === 'admin'
        return { userId: String(req.crmUser.id), isAdmin }
    }
    return { userId: '', isAdmin: true }
}

// ─── In-memory task runner ────────────────────────────────────────────────────
const activeTasks = new Map()   // taskId -> ctx
const scheduledTasks = new Map() // taskId -> setTimeout handle

// Real-time countdown state (updated as task runs)
const taskProgress = new Map()  // taskId -> { nextEmail, nextSendAt, remaining }

function cancelTask(taskId) {
    const t = activeTasks.get(taskId)
    if (t) { clearTimeout(t.timer); t.cancelled = true; activeTasks.delete(taskId) }
    taskProgress.delete(taskId)
}

function cancelScheduled(taskId) {
    const h = scheduledTasks.get(taskId)
    if (h) { clearTimeout(h); scheduledTasks.delete(taskId) }
}

async function runTask(taskId, isResume = false) {
    const task = getOne('SELECT * FROM mail_tasks WHERE id=?', [taskId])
    if (!task) return
    run("UPDATE mail_tasks SET status='running' WHERE id=?", [taskId])

    const templateIds = JSON.parse(task.template_ids || '[]')
    const contactIds  = JSON.parse(task.contact_ids  || '[]')
    const accountIds  = JSON.parse(task.account_ids  || '[]')

    const templates = templateIds.map(id => getOne('SELECT * FROM mail_templates WHERE id=?', [id])).filter(Boolean)
    let   contacts  = contactIds.map(cid => {
        // Parse prefixed IDs: 'crm_5' → crm_customers, 'mc_3' → mail_contacts, plain number → mail_contacts (backward compat)
        const str = String(cid)
        if (str.startsWith('crm_')) {
            const id = parseInt(str.slice(4))
            const crm = getOne('SELECT id, email, name, first_name, last_name, company FROM crm_customers WHERE id=?', [id])
            if (crm) return { id: crm.id, email: crm.email, name: crm.name || ((crm.first_name||'') + ' ' + (crm.last_name||'')).trim(), company: crm.company || '', _crm: true }
            return null
        }
        if (str.startsWith('mc_')) {
            return getOne('SELECT * FROM mail_contacts WHERE id=?', [parseInt(str.slice(3))])
        }
        // Plain number: mail_contacts (backward compatibility for old tasks)
        return getOne('SELECT * FROM mail_contacts WHERE id=?', [cid])
    }).filter(c => c && c.email)
    let   accounts  = accountIds.length
        ? accountIds.map(id => getOne('SELECT * FROM smtp_accounts WHERE id=?', [id])).filter(Boolean)
        : getAll('SELECT * FROM smtp_accounts WHERE enabled=1 ORDER BY id ASC')

    // Skip contacts emailed within X days (only for first-time sends, not follow-ups)
    const skipDays = task.skip_days || 0
    if (skipDays > 0 && !task.parent_task_id) {
        const cutoff = new Date(Date.now() - skipDays * 86400000).toISOString()
        const recentlySent = getAll(
            `SELECT DISTINCT contact_email FROM mail_logs WHERE status='sent' AND sent_at > ?`, [cutoff]
        )
        const recentEmails = new Set(recentlySent.map(r => r.contact_email.toLowerCase()))
        const before = contacts.length
        contacts = contacts.filter(c => !recentEmails.has(c.email.toLowerCase()))
        if (before !== contacts.length) {
            console.log(`[skip_days] Skipped ${before - contacts.length} contacts emailed within ${skipDays} days`)
        }
    }

    if (!templates.length || !contacts.length || !accounts.length) {
        run("UPDATE mail_tasks SET status='failed' WHERE id=?", [taskId])
        return
    }

    let startIndex = 0
    if (isResume && task.sent_count > 0) {
        startIndex = task.sent_count
    } else {
        run('UPDATE mail_tasks SET total_count=?, sent_count=0 WHERE id=?', [contacts.length, taskId])
    }

    const ctx = { cancelled: false, paused: false, timer: null }
    activeTasks.set(taskId, ctx)

    // If this is a follow-up task, gather original sent content keyed by email
    const parentLogData = {} // email -> { messageId, subject, sent_html, from, from_email, sent_at }
    if (task.parent_task_id) {
        const parentLogs = getAll(
            `SELECT ml.contact_email, ml.message_id, ml.subject, ml.sent_at, ml.sent_html,
                    mt.html_body, sa.from_name, sa.smtp_user
             FROM mail_logs ml
             LEFT JOIN mail_templates mt ON mt.id = ml.template_id
             LEFT JOIN smtp_accounts sa ON sa.id = ml.account_id
             WHERE ml.task_id=? AND ml.status='sent'`,
            [task.parent_task_id]
        )
        for (const l of parentLogs) {
            parentLogData[l.contact_email] = {
                messageId: l.message_id,
                subject: l.subject,
                // Use sent_html (full email with previous quotes) if available, fall back to template body
                html_body: l.sent_html || l.html_body || '',
                from: l.from_name ? `"${l.from_name}" <${l.smtp_user}>` : l.smtp_user,
                from_email: l.smtp_user,
                sent_at: l.sent_at
            }
        }
    }

    let tplIdx = startIndex % templates.length
    let acctIdx = startIndex % accounts.length

    for (let i = startIndex; i < contacts.length; i++) {
        if (ctx.cancelled || ctx.paused) break
        const contact  = contacts[i]
        const template = templates[tplIdx % templates.length]
        const account  = accounts[acctIdx % accounts.length]
        tplIdx++; acctIdx++

        // Update real-time progress state
        taskProgress.set(taskId, {
            nextEmail: contact.email,
            nextName:  contact.name || '',
            remaining: contacts.length - i,
            nextSendAt: Date.now()
        })

        const taskRow = getOne('SELECT created_by FROM mail_tasks WHERE id=?', [taskId])
        try {
            const transport = nodemailer.createTransport({
                host:   account.smtp_host,
                port:   parseInt(account.smtp_port) || 465,
                secure: parseInt(account.smtp_port) === 465,
                auth:   { user: account.smtp_user, pass: account.smtp_pass },
                tls:    { rejectUnauthorized: false }
            })

            const subj = template.subject.replace(/{{name}}/g, contact.name || '').replace(/{{company}}/g, contact.company || '').replace(/{{first_name}}/g, contact.name?.split(' ')[0] || '').replace(/{{last_name}}/g, contact.name?.split(' ').slice(1).join(' ') || '')
            let body = template.html_body.replace(/{{name}}/g, contact.name || '').replace(/{{company}}/g, contact.company || '').replace(/{{first_name}}/g, contact.name?.split(' ')[0] || '').replace(/{{last_name}}/g, contact.name?.split(' ').slice(1).join(' ') || '')

            // Replace sender variables (email, phone, whatsapp)
            try {
                const comp = getOne('SELECT phone, email, whatsapp, name_en FROM company WHERE id=1')
                const senderEmail = account.smtp_user || comp?.email || ''
                const senderPhone = comp?.phone || comp?.whatsapp || ''
                const cleanPhone = senderPhone.replace(/[^\d]/g, '')
                const waLink = cleanPhone ? `https://api.whatsapp.com/send?phone=${cleanPhone}` : ''
                body = body.replace(/\{\{email\}\}/g, senderEmail)
                body = body.replace(/\{\{phone\}\}/g, senderPhone)
                body = body.replace(/\{\{whatsapp_link\}\}/g, waLink)
                body = body.replace(/\{\{company_name\}\}/g, comp?.name_en || 'SunSea Steel')
            } catch (_) { }
            // Replace {{subject}} with actual email subject (URL-encoded for mailto)
            body = body.replace(/\{\{subject\}\}/g, encodeURIComponent('Re: ' + subj))
            body = body.replace(/\{\{subject_raw\}\}/g, subj)

            // Convert relative image URLs to absolute URLs for email clients
            try {
                let siteUrl = 'https://www.sunseasteel.com'
                try {
                    const comp = getOne("SELECT name_en FROM company WHERE id=1")
                    // Try to find website URL from company data
                    const seoRow = getOne("SELECT site_title FROM seo_settings WHERE id=1")
                    // Use request host if available  
                } catch (_) { }
                body = body.replace(/src=["'](\/uploads\/[^"']+)["']/gi, `src="${siteUrl}$1"`)
                body = body.replace(/src=["'](\/api\/[^"']+)["']/gi, `src="${siteUrl}$1"`)
                // Remove placeholder base64 images (1x1 transparent gif)
                body = body.replace(/src=["']data:image\/gif;base64,[^"']*["']/gi, 'src=""')
                // Remove .replace-tip spans from sent emails
                body = body.replace(/<span\s+class=["']replace-tip["'][^>]*>.*?<\/span>/gi, '')
            } catch (urlErr) { console.error('URL conversion error', urlErr) }

            // Replace custom variables (emoji groups, random, etc.)
            body = replaceCustomVars(body)

            // Build attachment list from task's attachment_paths
            const taskAttachments = []
            try {
                const aPaths = JSON.parse(task.attachment_paths || '[]')
                for (const ap of aPaths) {
                    const fullPath = join(uploadsDir, ap.filename)
                    if (fs.existsSync(fullPath)) {
                        taskAttachments.push({ filename: ap.originalName || ap.filename, path: fullPath })
                    }
                }
            } catch (e) { }

            const mailOpts = {
                from:    `"${account.from_name || 'SunSea Steel'}" <${account.smtp_user}>`,
                to:      contact.email,
                subject: subj,
                html:    body,
                attachments: taskAttachments.length ? taskAttachments : undefined
            }
            if (task.cc) mailOpts.cc = task.cc
            if (task.read_receipt) {
                mailOpts.headers = {
                    'Disposition-Notification-To': account.smtp_user,
                    'Return-Receipt-To': account.smtp_user
                }
            }
            // Priority / urgent
            if (task.priority) {
                mailOpts.priority = 'high'
                if (!mailOpts.headers) mailOpts.headers = {}
                mailOpts.headers['X-Priority'] = '1'
                mailOpts.headers['Importance'] = 'High'
            }
            // Follow-up: set In-Reply-To + append quoted original email body (Foxmail reply style)
            const orig = parentLogData[contact.email]
            if (orig?.messageId) {
                if (!mailOpts.headers) mailOpts.headers = {}
                mailOpts.headers['In-Reply-To'] = orig.messageId
                mailOpts.headers['References']  = orig.messageId
                if (!mailOpts.subject.startsWith('Re:')) {
                    mailOpts.subject = `Re: ${orig.subject || mailOpts.subject}`
                }
                // Format date like Foxmail: 3/16/2026 10:12
                const d = orig.sent_at ? new Date(orig.sent_at) : null
                const fmtDate = d
                    ? `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
                    : ''
                const fromEmail = orig.from_email || ''
                const toEmail = contact.email
                // Foxmail-style inline reply with clickable mailto links
                const quotedBlock = `
<br/><br/>
<div style="font-family:Arial,sans-serif;font-size:13px;color:#555">
  <div style="margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #ccc;font-size:12px;color:#888">
    ---- Replied Message ----<br/>
    <b>From</b>&nbsp;&nbsp;&nbsp;&nbsp;<a href="mailto:${fromEmail}" style="color:#0563c1">${fromEmail}</a><br/>
    <b>Date</b>&nbsp;&nbsp;&nbsp;&nbsp;${fmtDate}<br/>
    <b>To</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href="mailto:${toEmail}" style="color:#0563c1">${toEmail}</a><br/>
    <b>Subject</b>&nbsp;${orig.subject}
  </div>
  <div style="border-left:2px solid #bebebe;padding-left:12px">
    ${orig.html_body || ''}
  </div>
</div>`
                mailOpts.html = mailOpts.html + quotedBlock
            }

            const info = await transport.sendMail(mailOpts)
            const msgId = (info.messageId || '').replace(/[<>]/g, '')

            run(`INSERT INTO mail_logs (task_id, contact_email, contact_name, account_id, template_id, subject, status, message_id, sent_html, sent_at, created_by)
                 VALUES (?,?,?,?,?,?,'sent',?,?,datetime('now'),?)`,
                [taskId, contact.email, contact.name || '', account.id, template.id, subj, msgId, mailOpts.html, taskRow?.created_by || ''])
            run('UPDATE smtp_accounts SET send_count = send_count + 1 WHERE id=?', [account.id])
            run('UPDATE mail_tasks SET sent_count = sent_count + 1 WHERE id=?', [taskId])
        } catch (e) {
            run(`INSERT INTO mail_logs (task_id, contact_email, contact_name, account_id, template_id, subject, status, sent_at, created_by)
                 VALUES (?,?,?,?,?,?,'failed',datetime('now'),?)`,
                [taskId, contact.email, contact.name || '', account.id, template.id, template.subject, taskRow?.created_by || ''])
        }

        // Delay before next send
        if (i < contacts.length - 1 && !ctx.cancelled && !ctx.paused) {
            const delay = (Math.floor(Math.random() * ((task.interval_max||60) - (task.interval_min||10) + 1)) + (task.interval_min||10)) * 1000
            const nextSendAt = Date.now() + delay
            taskProgress.set(taskId, {
                nextEmail:  contacts[i + 1]?.email || '',
                nextName:   contacts[i + 1]?.name  || '',
                remaining:  contacts.length - i - 1,
                nextSendAt
            })
            await new Promise(resolve => { ctx.timer = setTimeout(resolve, delay) })
        }
    }

    activeTasks.delete(taskId)
    taskProgress.delete(taskId)
    run("UPDATE mail_tasks SET status=? WHERE id=?",
        [ctx.paused ? 'paused' : (ctx.cancelled ? 'cancelled' : 'done'), taskId])
}

// Schedule a task to run at a future time
function scheduleTask(taskId, scheduleAt) {
    cancelScheduled(taskId)
    const delay = new Date(scheduleAt).getTime() - Date.now()
    if (delay <= 0) {
        runTask(taskId).catch(e => console.error('Scheduled task error:', e))
    } else {
        const h = setTimeout(() => {
            scheduledTasks.delete(taskId)
            runTask(taskId).catch(e => console.error('Scheduled task error:', e))
        }, delay)
        scheduledTasks.set(taskId, h)
    }
}

// Re-schedule any pending/scheduled tasks on server restart
function restoreScheduledTasks() {
    try {
        const tasks = getAll("SELECT * FROM mail_tasks WHERE schedule_at IS NOT NULL AND status='pending'")
        for (const t of tasks) {
            scheduleTask(t.id, t.schedule_at)
        }
    } catch (e) {}
}
// Call after a small delay to ensure DB is ready
setTimeout(restoreScheduledTasks, 2000)

// ─── Templates ───────────────────────────────────────────────────────────────
router.get('/templates', authMiddleware, (req, res) => {
    try { run('ALTER TABLE mail_templates ADD COLUMN assigned_users TEXT DEFAULT ""') } catch(e) {}
    const { userId, isAdmin } = getUserId(req)
    const templates = isAdmin
        ? getAll('SELECT * FROM mail_templates ORDER BY id DESC')
        : getAll(`SELECT * FROM mail_templates WHERE created_by=? OR assigned_users=? ORDER BY id DESC`, [userId, userId])
    const users = getAll('SELECT id, username, display_name, role FROM crm_users ORDER BY id')
    res.json({ templates, users })
})
router.post('/templates', authMiddleware, (req, res) => {
    const { name, subject, html_body, note, template_type } = req.body
    const { userId } = getUserId(req)
    const r = run('INSERT INTO mail_templates (name, subject, html_body, note, template_type, created_by) VALUES (?,?,?,?,?,?)', [name, subject, html_body, note || '', template_type || 'rich', userId])
    res.json({ id: r.lastInsertRowid, message: '模板已保存' })
})
router.put('/templates/:id', authMiddleware, (req, res) => {
    const { name, subject, html_body, note, template_type } = req.body
    run('UPDATE mail_templates SET name=?, subject=?, html_body=?, note=?, template_type=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
        [name, subject, html_body, note || '', template_type || 'rich', req.params.id])
    res.json({ message: '模板已更新' })
})
router.delete('/templates/:id', authMiddleware, (req, res) => {
    run('DELETE FROM mail_templates WHERE id=?', [req.params.id])
    res.json({ message: '已删除' })
})
router.post('/templates/:id/duplicate', authMiddleware, (req, res) => {
    const orig = getOne('SELECT * FROM mail_templates WHERE id=?', [req.params.id])
    if (!orig) return res.status(404).json({ error: '模板不存在' })
    const { userId } = getUserId(req)
    const r = run('INSERT INTO mail_templates (name, subject, html_body, note, template_type, created_by) VALUES (?,?,?,?,?,?)',
        [orig.name + ' (副本)', orig.subject, orig.html_body, orig.note || '', orig.template_type || 'rich', userId])
    res.json({ id: r.lastInsertRowid, message: '模板已复制' })
})

// ─── Contacts ─────────────────────────────────────────────────────────────────
// ─── Contact Groups ──────────────────────────────────────────────────────────
router.get('/contact-groups', authMiddleware, (req, res) => {
    const groups = getAll(`SELECT cg.*, COUNT(mc.id) as contact_count
                           FROM contact_groups cg
                           LEFT JOIN mail_contacts mc ON mc.group_id = cg.id
                           GROUP BY cg.id ORDER BY cg.name`)
    res.json(groups)
})
router.post('/contact-groups', authMiddleware, (req, res) => {
    const { name } = req.body
    if (!name) return res.status(400).json({ error: '请填写分组名称' })
    try {
        const r = run('INSERT INTO contact_groups (name) VALUES (?)', [name.trim()])
        res.json({ id: r.lastInsertRowid, message: '分组已创建' })
    } catch (e) { res.status(400).json({ error: '分组名已存在' }) }
})
router.put('/contact-groups/:id', authMiddleware, (req, res) => {
    const { name } = req.body
    run('UPDATE contact_groups SET name=? WHERE id=?', [name.trim(), req.params.id])
    res.json({ message: '分组已更新' })
})
router.delete('/contact-groups/:id', authMiddleware, (req, res) => {
    // Set contacts in this group to no group
    run('UPDATE mail_contacts SET group_id=NULL WHERE group_id=?', [req.params.id])
    run('DELETE FROM contact_groups WHERE id=?', [req.params.id])
    res.json({ message: '分组已删除' })
})

// ─── Contacts ────────────────────────────────────────────────────────────────
router.get('/contacts', authMiddleware, (req, res) => {
    const { userId, isAdmin } = getUserId(req)
    const sql = isAdmin
        ? `SELECT mc.*, cg.name as group_name FROM mail_contacts mc LEFT JOIN contact_groups cg ON cg.id = mc.group_id ORDER BY mc.id DESC`
        : `SELECT mc.*, cg.name as group_name FROM mail_contacts mc LEFT JOIN contact_groups cg ON cg.id = mc.group_id WHERE mc.created_by=? ORDER BY mc.id DESC`
    res.json(isAdmin ? getAll(sql) : getAll(sql, [userId]))
})
router.post('/contacts', authMiddleware, (req, res) => {
    const { email, name, company, group_id } = req.body
    if (!email) return res.status(400).json({ error: '请填写邮箱' })
    const { userId } = getUserId(req)
    const r = run('INSERT INTO mail_contacts (email, name, company, group_id, created_by) VALUES (?,?,?,?,?)', [email, name || '', company || '', group_id || null, userId])
    res.json({ id: r.lastInsertRowid, message: '联系人已添加' })
})
router.post('/contacts/import', authMiddleware, (req, res) => {
    const { lines, group_id } = req.body
    let added = 0, skipped = 0
    for (const line of (lines || [])) {
        const [email, name, company] = line.split(',').map(s => s.trim())
        if (email && email.includes('@')) {
            // Check if email already exists
            const exists = getOne('SELECT id FROM mail_contacts WHERE email=?', [email.toLowerCase()])
            if (exists) { skipped++; continue }
            try { const { userId: uid } = getUserId(req); run('INSERT INTO mail_contacts (email, name, company, group_id, created_by) VALUES (?,?,?,?,?)', [email.toLowerCase(), name || '', company || '', group_id || null, uid]); added++ } catch (e) { skipped++ }
        }
    }
    res.json({ message: `已导入 ${added} 个联系人` + (skipped ? `，跳过 ${skipped} 个已存在邮箱` : '') })
})
router.put('/contacts/:id', authMiddleware, (req, res) => {
    const { email, name, company, group_id } = req.body
    run('UPDATE mail_contacts SET email=?, name=?, company=?, group_id=? WHERE id=?', [email, name || '', company || '', group_id || null, req.params.id])
    res.json({ message: '联系人已更新' })
})
router.delete('/contacts/:id', authMiddleware, (req, res) => {
    run('DELETE FROM mail_contacts WHERE id=?', [req.params.id])
    res.json({ message: '已删除' })
})
router.post('/contacts/bulk-delete', authMiddleware, (req, res) => {
    const { ids } = req.body
    if (!ids?.length) return res.status(400).json({ error: '无选中项' })
    const placeholders = ids.map(() => '?').join(',')
    run(`DELETE FROM mail_contacts WHERE id IN (${placeholders})`, ids)
    res.json({ message: `已删除 ${ids.length} 个联系人` })
})
router.post('/contacts/assign', authMiddleware, (req, res) => {
    const { ids, user_id } = req.body
    if (!ids?.length || !user_id) return res.status(400).json({ error: '缺少参数' })
    const placeholders = ids.map(() => '?').join(',')
    run(`UPDATE mail_contacts SET created_by=? WHERE id IN (${placeholders})`, [String(user_id), ...ids])
    res.json({ message: `已分配 ${ids.length} 个联系人` })
})
router.post('/contacts/move-group', authMiddleware, (req, res) => {
    const { ids, group_id } = req.body
    if (!ids?.length) return res.status(400).json({ error: '无选中项' })
    const placeholders = ids.map(() => '?').join(',')
    run(`UPDATE mail_contacts SET group_id=? WHERE id IN (${placeholders})`, [group_id || null, ...ids])
    res.json({ message: `已移动 ${ids.length} 个联系人` })
})

// ─── Tasks ────────────────────────────────────────────────────────────────────
router.get('/tasks', authMiddleware, (req, res) => {
    const { userId, isAdmin } = getUserId(req)
    const tasks = isAdmin
        ? getAll('SELECT * FROM mail_tasks ORDER BY id DESC')
        : getAll(`SELECT * FROM mail_tasks WHERE created_by=? ORDER BY id DESC`, [userId])
    const result = tasks.map(t => {
        const prog = taskProgress.get(t.id)
        return { ...t, _progress: prog || null }
    })
    res.json(result)
})

// ─── Attachment upload/delete ─────────────────────────────────────────────────
router.post('/attachments', authMiddleware, attachmentUpload.array('files', 20), (req, res) => {
    if (!req.files?.length) return res.status(400).json({ error: '请选择文件' })
    const result = req.files.map(f => ({
        filename: f.filename,
        originalName: f.originalname,
        size: f.size,
        url: `/uploads/${f.filename}`
    }))
    res.json(result)
})

router.delete('/attachments/:filename', authMiddleware, (req, res) => {
    const filePath = join(uploadsDir, req.params.filename)
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath) } catch (e) { }
    res.json({ message: '已删除' })
})

router.post('/tasks', authMiddleware, (req, res) => {
    const { name, template_ids, contact_ids, account_ids, interval_min, interval_max, cc, read_receipt, schedule_at, priority, parent_task_id, skip_days, attachment_paths } = req.body
    const { userId } = getUserId(req)
    const r = run(
        `INSERT INTO mail_tasks (name, status, template_ids, contact_ids, account_ids, interval_min, interval_max, cc, read_receipt, schedule_at, priority, parent_task_id, skip_days, attachment_paths, created_by)
         VALUES (?,'pending',?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [name || 'New Task',
         JSON.stringify(template_ids || []), JSON.stringify(contact_ids || []),
         JSON.stringify(account_ids || []),
         interval_min || 10, interval_max || 60, cc || '',
         read_receipt !== false ? 1 : 0,
         schedule_at || null,
         priority ? 1 : 0,
         parent_task_id || null,
         skip_days || 0,
         JSON.stringify(attachment_paths || []),
         userId]
    )
    const newId = r.lastInsertRowid
    // Auto-schedule if schedule_at given
    if (schedule_at) scheduleTask(newId, schedule_at)
    res.json({ id: newId, message: '任务已创建' })
})

router.put('/tasks/:id', authMiddleware, (req, res) => {
    const task = getOne('SELECT status FROM mail_tasks WHERE id=?', [req.params.id])
    if (!task) return res.status(404).json({ error: '任务不存在' })
    if (task.status === 'running') return res.status(400).json({ error: '运行中的任务无法直接修改，请先暂停' })

    const { name, template_ids, contact_ids, account_ids, interval_min, interval_max, cc, read_receipt, schedule_at, priority, parent_task_id, attachment_paths } = req.body
    run(`UPDATE mail_tasks SET name=?, template_ids=?, contact_ids=?, account_ids=?, interval_min=?, interval_max=?, cc=?, read_receipt=?, schedule_at=?, priority=?, parent_task_id=?, attachment_paths=? WHERE id=?`,
        [name || 'Updated Task',
         JSON.stringify(template_ids || []), JSON.stringify(contact_ids || []),
         JSON.stringify(account_ids || []),
         interval_min || 10, interval_max || 60, cc || '',
         read_receipt !== false ? 1 : 0,
         schedule_at || null,
         priority ? 1 : 0,
         parent_task_id || null,
         JSON.stringify(attachment_paths || []),
         req.params.id])
    // Update schedule
    cancelScheduled(+req.params.id)
    if (schedule_at) scheduleTask(+req.params.id, schedule_at)
    res.json({ message: '任务已更新' })
})

router.post('/tasks/:id/start', authMiddleware, async (req, res) => {
    const task = getOne('SELECT * FROM mail_tasks WHERE id=?', [req.params.id])
    if (!task) return res.status(404).json({ error: '任务不存在' })
    if (activeTasks.has(+req.params.id)) return res.status(400).json({ error: '任务正在运行中' })
    cancelScheduled(+req.params.id)
    run("UPDATE mail_tasks SET status='pending', sent_count=0, schedule_at=NULL WHERE id=?", [req.params.id])
    runTask(+req.params.id).catch(e => console.error('Task error:', e))
    res.json({ message: '任务已开始' })
})

router.post('/tasks/:id/resume', authMiddleware, async (req, res) => {
    const task = getOne('SELECT * FROM mail_tasks WHERE id=?', [req.params.id])
    if (!task) return res.status(404).json({ error: '任务不存在' })
    if (activeTasks.has(+req.params.id)) return res.status(400).json({ error: '任务正在运行中' })
    if (task.status !== 'paused' && task.status !== 'failed') return res.status(400).json({ error: '只有暂停或失败的任务才能续发' })
    run("UPDATE mail_tasks SET status='running' WHERE id=?", [req.params.id])
    runTask(+req.params.id, true).catch(e => console.error('Task error:', e))
    res.json({ message: '任务已继续运行' })
})

router.post('/tasks/:id/stop', authMiddleware, (req, res) => {
    const t = activeTasks.get(+req.params.id)
    if (t) { clearTimeout(t.timer); t.paused = true; activeTasks.delete(+req.params.id) }
    taskProgress.delete(+req.params.id)
    run("UPDATE mail_tasks SET status='paused' WHERE id=?", [req.params.id])
    res.json({ message: '任务已暂停' })
})

router.post('/tasks/:id/schedule', authMiddleware, (req, res) => {
    const { schedule_at } = req.body
    if (!schedule_at) return res.status(400).json({ error: '请提供定时时间' })
    const task = getOne('SELECT * FROM mail_tasks WHERE id=?', [req.params.id])
    if (!task) return res.status(404).json({ error: '任务不存在' })
    if (task.status === 'running') return res.status(400).json({ error: '运行中的任务无法设定定时' })
    run("UPDATE mail_tasks SET schedule_at=?, status='pending' WHERE id=?", [schedule_at, req.params.id])
    scheduleTask(+req.params.id, schedule_at)
    res.json({ message: '定时任务已设置' })
})

router.delete('/tasks/:id', authMiddleware, (req, res) => {
    const t = activeTasks.get(+req.params.id)
    if (t) { clearTimeout(t.timer); t.cancelled = true; activeTasks.delete(+req.params.id) }
    cancelScheduled(+req.params.id)
    taskProgress.delete(+req.params.id)
    run('DELETE FROM mail_tasks WHERE id=?', [req.params.id])
    run('DELETE FROM mail_logs WHERE task_id=?', [req.params.id])
    res.json({ message: '已删除' })
})

// ─── Realtime status polling (for running tasks) ─────────────────────────────
router.get('/tasks/realtime', authMiddleware, (req, res) => {
    const result = {}
    for (const [id, prog] of taskProgress.entries()) {
        const msLeft = Math.max(0, prog.nextSendAt - Date.now())
        result[id] = {
            nextEmail:  prog.nextEmail,
            nextName:   prog.nextName,
            remaining:  prog.remaining,
            countdownMs: msLeft
        }
    }
    res.json(result)
})

// ─── Logs ─────────────────────────────────────────────────────────────────────
router.get('/logs', authMiddleware, (req, res) => {
    const { userId, isAdmin } = getUserId(req)
    const taskId = req.query.task_id
    let logs
    if (taskId) {
        logs = isAdmin
            ? getAll('SELECT * FROM mail_logs WHERE task_id=? ORDER BY id ASC', [taskId])
            : getAll(`SELECT * FROM mail_logs WHERE task_id=? AND created_by=? ORDER BY id ASC`, [taskId, userId])
    } else {
        logs = isAdmin
            ? getAll('SELECT * FROM mail_logs ORDER BY id DESC LIMIT 500')
            : getAll(`SELECT * FROM mail_logs WHERE created_by=? ORDER BY id DESC LIMIT 500`, [userId])
    }
    res.json(logs)
})

// CRM customers + mail_contacts combined for task creation picker
router.get('/crm-customers', authMiddleware, (req, res) => {
    const { search, country, status, tag, source } = req.query
    let results = []

    // Load CRM customers
    if (source !== 'mailer_only') {
        let crmWhere = ['1=1']
        let crmParams = []
        if (search) { crmWhere.push("(c.first_name LIKE ? OR c.last_name LIKE ? OR c.name LIKE ? OR c.company LIKE ? OR c.email LIKE ?)"); const q = `%${search}%`; crmParams.push(q,q,q,q,q) }
        if (country) { crmWhere.push('c.country = ?'); crmParams.push(country) }
        if (status) { crmWhere.push('c.status = ?'); crmParams.push(status) }
        if (tag) { crmWhere.push("c.tags LIKE ?"); crmParams.push(`%${tag}%`) }
        const crmRows = getAll(`SELECT c.* FROM crm_customers c WHERE ${crmWhere.join(' AND ')} ORDER BY c.created_at DESC LIMIT 500`, crmParams)
        for (const c of crmRows) {
            results.push({
                id: c.id, name: c.first_name || c.name || '', last_name: c.last_name || '',
                email: c.email || '', phone: c.phone || '', company: c.company || '',
                country: c.country || '', status: c.status || '', tags: c.tags || '[]',
                _source: 'crm'
            })
        }
    }

    // Load mail_contacts
    if (source !== 'crm') {
        let mcWhere = ['1=1']
        let mcParams = []
        if (search) { mcWhere.push("(mc.email LIKE ? OR mc.name LIKE ? OR mc.company LIKE ?)"); const q = `%${search}%`; mcParams.push(q,q,q) }
        if (country) {
            // When source is mailer_only, 'country' filter actually matches group name
            mcWhere.push('(mg.name = ? OR mc.country = ?)'); mcParams.push(country, country)
        }
        const mcRows = getAll(`SELECT mc.*, mg.name as group_name FROM mail_contacts mc LEFT JOIN mail_contact_groups mg ON mg.id = mc.group_id WHERE ${mcWhere.join(' AND ')} ORDER BY mc.id DESC LIMIT 500`, mcParams)
        for (const mc of mcRows) {
            results.push({
                id: mc.id, name: mc.name || '', last_name: '',
                email: mc.email || '', phone: '', company: mc.company || '',
                country: mc.group_name || mc.country || '', status: '', tags: '[]',
                group_name: mc.group_name || '',
                _source: 'mailer'
            })
        }
    }

    // Build meta for filters
    const countries = [...new Set(results.map(r => r.country).filter(Boolean))].sort()
    const statuses = [...new Set(results.map(r => r.status).filter(Boolean))].sort()
    let allTags = []
    for (const r of results) { try { const t = JSON.parse(r.tags || '[]'); allTags.push(...t) } catch(e) {} }
    const tags = [...new Set(allTags)].sort()

    res.json({ customers: results, meta: { countries, statuses, tags } })
})

// Grouped view: one row per contact_email, with follow-up counts
router.get('/logs/grouped', authMiddleware, (req, res) => {
    const { userId, isAdmin } = getUserId(req)
    const taskId = req.query.task_id
    let whereParts = []
    let params = []
    if (taskId) { whereParts.push(`ml.task_id=?`); params.push(+taskId) }
    if (!isAdmin) { whereParts.push(`ml.created_by=?`); params.push(userId) }
    const where = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : ''
    const rows = getAll(
        `SELECT ml.*, 
          CASE 
            WHEN ml.task_id = 0 AND ml.subject LIKE 'Re:%' THEN '快速跟进'
            WHEN ml.task_id = 0 THEN '快速发送'
            ELSE COALESCE(mt.name, '邮件任务')
          END AS task_name, 
          mt2.name AS template_name
         FROM mail_logs ml
         LEFT JOIN mail_tasks mt ON mt.id = ml.task_id
         LEFT JOIN mail_templates mt2 ON mt2.id = ml.template_id
         ${where}
         ORDER BY ml.contact_email, ml.id ASC`, params
    )

    // Also include crm_email_logs (quick-send / quick-followup) when showing all records
    if (!taskId) {
        const crmRows = getAll(`SELECT id, recipient_email as contact_email, '' as contact_name, subject, status, sent_at,
            CASE WHEN subject LIKE 'Re:%' THEN '快速跟进' ELSE '快速发送' END as task_name
            FROM crm_email_logs ORDER BY id ASC`)
        rows.push(...crmRows)
    }

    // Group by contact_email
    const grouped = {}
    for (const r of rows) {
        const email = r.contact_email
        if (!email) continue
        if (!grouped[email]) {
            grouped[email] = {
                contact_email: email,
                contact_name:  r.contact_name || '',
                records: []
            }
        }
        grouped[email].records.push(r)
    }

    // Sort records within each group by sent_at ASC (chronological for numbering)
    for (const g of Object.values(grouped)) {
        g.records.sort((a, b) => {
            const ta = a.sent_at || a.id?.toString() || ''
            const tb = b.sent_at || b.id?.toString() || ''
            return ta.localeCompare(tb)
        })
    }

    // Build summary row for each email
    const result = Object.values(grouped).map(g => {
        const total = g.records.length
        let sendCount = 0; let followCount = 0
        for (const r of g.records) {
            const tn = r.task_name || ''
            if (tn.includes('跟进')) followCount++
            else sendCount++
        }
        return {
            contact_email: g.contact_email,
            contact_name:  g.contact_name,
            send_count:    sendCount,
            follow_count:  followCount,
            total:         total,
            last_sent_at:  g.records[g.records.length - 1]?.sent_at,
            records:       g.records
        }
    })

    // Sort groups by last_sent_at DESC (newest first)
    result.sort((a, b) => (b.last_sent_at || '').localeCompare(a.last_sent_at || ''))

    res.json(result)
})

// Bulk delete selected log records
router.post('/logs/bulk-delete', authMiddleware, express.json(), (req, res) => {
    const ids = req.body?.ids
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: '未选择记录' })
    const placeholders = ids.map(() => '?').join(',')
    run(`DELETE FROM mail_logs WHERE id IN (${placeholders})`, ids)
    res.json({ message: `已删除 ${ids.length} 条记录` })
})

// ─── CRM Customer + mail_contacts picker (for CRM context) ─────────────────
router.get('/crm-customers', authMiddleware, (req, res) => {
    const { search, country, status, tag, source } = req.query
    let crmCustomers = [], mailContacts = []

    // CRM customers (unless source=mailer)
    if (source !== 'mailer') {
        let sql = `SELECT id, first_name, last_name, name, email, company, country, status, tags FROM crm_customers WHERE 1=1`
        const params = []
        if (search) { sql += ` AND (name LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR company LIKE ?)`; const s = `%${search}%`; params.push(s,s,s,s,s) }
        if (country) { sql += ` AND country=?`; params.push(country) }
        if (status) { sql += ` AND status=?`; params.push(status) }
        if (tag) { sql += ` AND tags LIKE ?`; params.push(`%${tag}%`) }
        sql += ` ORDER BY id DESC LIMIT 500`
        crmCustomers = getAll(sql, params).map(c => ({ ...c, _source: 'crm' }))
    }

    // Mail contacts (unless source=crm)
    if (source !== 'crm') {
        let mcSql = `SELECT mc.id, mc.email, mc.name, mc.company, mc.country, mg.name as group_name FROM mail_contacts mc LEFT JOIN mail_groups mg ON mc.group_id=mg.id WHERE 1=1`
        const mcParams = []
        if (search) { const s = `%${search}%`; mcSql += ` AND (mc.name LIKE ? OR mc.email LIKE ? OR mc.company LIKE ?)`; mcParams.push(s,s,s) }
        if (country) { mcSql += ` AND mc.country=?`; mcParams.push(country) }
        mcSql += ` ORDER BY mc.id DESC LIMIT 500`
        mailContacts = getAll(mcSql, mcParams).map(c => ({ ...c, _source: 'mailer' }))
    }

    // Filter options
    const countries = getAll('SELECT DISTINCT country FROM crm_customers WHERE country!="" ORDER BY country')
    const statuses = getAll('SELECT DISTINCT status FROM crm_customers WHERE status!="" ORDER BY status')
    const allTags = new Set()
    getAll('SELECT tags FROM crm_customers WHERE tags!="[]"').forEach(r => {
        try { JSON.parse(r.tags).forEach(t => allTags.add(t)) } catch(e) {}
    })
    // mail_contacts countries
    const mcCountries = getAll('SELECT DISTINCT country FROM mail_contacts WHERE country!="" ORDER BY country').map(c=>c.country)
    const mergedCountries = [...new Set([...countries.map(c=>c.country), ...mcCountries])].sort()

    res.json({
        customers: [...crmCustomers, ...mailContacts],
        meta: { countries: mergedCountries, statuses: statuses.map(s=>s.status), tags: [...allTags] }
    })
})

// ─── Default template toggle (marketing + followup) ──────────────────────────
router.post('/templates/:id/set-default', authMiddleware, express.json(), (req, res) => {
    // Ensure is_followup_default column exists
    try { run('ALTER TABLE mail_templates ADD COLUMN is_followup_default INTEGER DEFAULT 0') } catch(e) {}
    
    const role = req.body?.role || 'marketing'
    if (role === 'followup') {
        run('UPDATE mail_templates SET is_followup_default=0')
        run('UPDATE mail_templates SET is_followup_default=1 WHERE id=?', [req.params.id])
        res.json({ message: '已设为默认跟进模板' })
    } else {
        run('UPDATE mail_templates SET is_default=0')
        run('UPDATE mail_templates SET is_default=1 WHERE id=?', [req.params.id])
        res.json({ message: '已设为默认营销模板' })
    }
})

// ─── Assign template to user ────────────────────────────────────────────────
router.post('/templates/:id/assign', authMiddleware, express.json(), (req, res) => {
    try { run('ALTER TABLE mail_templates ADD COLUMN assigned_users TEXT DEFAULT ""') } catch(e) {}
    const userId = req.body?.user_id
    if (userId === undefined) return res.status(400).json({ error: '缺少user_id' })
    run('UPDATE mail_templates SET assigned_users=? WHERE id=?', [String(userId), req.params.id])
    const user = userId ? getOne('SELECT display_name FROM crm_users WHERE id=?', [userId]) : null
    res.json({ message: user ? `已分配给 ${user.display_name}` : '已取消分配' })
})

// ─── Assign SMTP account to user ────────────────────────────────────────────
router.post('/smtp/:id/assign', authMiddleware, express.json(), (req, res) => {
    try { run('ALTER TABLE smtp_accounts ADD COLUMN assigned_users TEXT DEFAULT ""') } catch(e) {}
    const userId = req.body?.user_id
    if (userId === undefined) return res.status(400).json({ error: '缺少user_id' })
    run('UPDATE smtp_accounts SET assigned_users=? WHERE id=?', [String(userId), req.params.id])
    const user = userId ? getOne('SELECT display_name FROM crm_users WHERE id=?', [userId]) : null
    res.json({ message: user ? `已分配给 ${user.display_name}` : '已取消分配' })
})

// ─── CRM Users list for assignment dropdown ─────────────────────────────────
router.get('/users', authMiddleware, (req, res) => {
    const users = getAll('SELECT id, username, display_name, role FROM crm_users ORDER BY id')
    res.json(users)
})

// ═══════════════════════════════════════════════════════════════════════════════
// Custom Variables CRUD
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/variables', authMiddleware, (req, res) => {
    try { run(`CREATE TABLE IF NOT EXISTS mail_variables (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL DEFAULT '',
      var_key TEXT NOT NULL UNIQUE, var_type TEXT DEFAULT 'text',
      value TEXT DEFAULT '', group_name TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`) } catch(e) {}
    const vars = getAll('SELECT * FROM mail_variables ORDER BY group_name, id')
    res.json(vars)
})

router.post('/variables', authMiddleware, express.json(), (req, res) => {
    const { name, var_key, var_type, value, group_name } = req.body
    if (!name || !var_key) return res.status(400).json({ error: '名称和变量键不能为空' })
    const key = var_key.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
    try {
        run('INSERT INTO mail_variables (name, var_key, var_type, value, group_name) VALUES (?,?,?,?,?)',
            [name, key, var_type || 'text', value || '', group_name || ''])
        res.json({ message: '创建成功' })
    } catch (e) {
        if (e.message?.includes('UNIQUE')) return res.status(400).json({ error: '变量键已存在' })
        res.status(500).json({ error: e.message })
    }
})

router.put('/variables/:id', authMiddleware, express.json(), (req, res) => {
    const { name, var_key, var_type, value, group_name } = req.body
    const key = var_key ? var_key.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() : undefined
    const sets = [], params = []
    if (name !== undefined) { sets.push('name=?'); params.push(name) }
    if (key) { sets.push('var_key=?'); params.push(key) }
    if (var_type !== undefined) { sets.push('var_type=?'); params.push(var_type) }
    if (value !== undefined) { sets.push('value=?'); params.push(value) }
    if (group_name !== undefined) { sets.push('group_name=?'); params.push(group_name) }
    if (!sets.length) return res.status(400).json({ error: '无更新内容' })
    params.push(req.params.id)
    run(`UPDATE mail_variables SET ${sets.join(',')} WHERE id=?`, params)
    res.json({ message: '更新成功' })
})

router.delete('/variables/:id', authMiddleware, (req, res) => {
    run('DELETE FROM mail_variables WHERE id=?', [req.params.id])
    res.json({ message: '删除成功' })
})

// ─── Replace custom variables in email body ─────────────────────────────────
export function replaceCustomVars(html) {
    try {
        const vars = getAll('SELECT * FROM mail_variables')
        let out = html
        for (const v of vars) {
            const pattern = new RegExp(`\\{\\{${v.var_key}\\}\\}`, 'g')
            let replacement = ''
            switch (v.var_type) {
                case 'text':
                    replacement = v.value || ''
                    break
                case 'emoji_group': {
                    const emojis = JSON.parse(v.value || '[]')
                    replacement = emojis.length ? emojis[Math.floor(Math.random() * emojis.length)] : ''
                    break
                }
                case 'random_number': {
                    const len = parseInt(v.value) || 6
                    replacement = Array.from({length: len}, () => Math.floor(Math.random() * 10)).join('')
                    break
                }
                case 'random_alphanumeric': {
                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
                    const len2 = parseInt(v.value) || 8
                    replacement = Array.from({length: len2}, () => chars[Math.floor(Math.random() * chars.length)]).join('')
                    break
                }
                case 'builtin':
                    if (v.value === 'date') replacement = new Date().toISOString().split('T')[0]
                    break
                default:
                    replacement = v.value || ''
            }
            out = out.replace(pattern, replacement)
        }
        return out
    } catch (_) { return html }
}

export default router

