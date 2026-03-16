import express from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import nodemailer from 'nodemailer'

const router = express.Router()
router.use(express.json({ limit: '5mb' }))

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
    const contacts  = contactIds.map(id => getOne('SELECT * FROM mail_contacts WHERE id=?', [id])).filter(Boolean)
    let   accounts  = accountIds.length
        ? accountIds.map(id => getOne('SELECT * FROM smtp_accounts WHERE id=?', [id])).filter(Boolean)
        : getAll('SELECT * FROM smtp_accounts WHERE enabled=1 ORDER BY id ASC')

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

    // If this is a follow-up task, gather original message-ids + body keyed by email
    const parentLogData = {} // email -> { messageId, subject, html_body, from, sent_at }
    if (task.parent_task_id) {
        const parentLogs = getAll(
            `SELECT ml.contact_email, ml.message_id, ml.subject, ml.sent_at,
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
                html_body: l.html_body || '',
                from: l.from_name ? `"${l.from_name}" <${l.smtp_user}>` : l.smtp_user,
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

        try {
            const transport = nodemailer.createTransport({
                host:   account.smtp_host,
                port:   parseInt(account.smtp_port) || 465,
                secure: parseInt(account.smtp_port) === 465,
                auth:   { user: account.smtp_user, pass: account.smtp_pass },
                tls:    { rejectUnauthorized: false }
            })

            const subj = template.subject.replace(/{{name}}/g, contact.name || '').replace(/{{company}}/g, contact.company || '')
            const body = template.html_body.replace(/{{name}}/g, contact.name || '').replace(/{{company}}/g, contact.company || '')

            const mailOpts = {
                from:    `"${account.from_name || 'SunSea Steel'}" <${account.smtp_user}>`,
                to:      contact.email,
                subject: subj,
                html:    body
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
                const toAddr = contact.name ? `'${contact.name}'<${contact.email}>` : contact.email
                // Foxmail-style inline reply: original email always fully visible
                const quotedBlock = `
<br/><br/>
<div style="font-family:Arial,sans-serif;font-size:13px;color:#555">
  <div style="margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #ccc;font-size:12px;color:#888">
    ---- Replied Message ----<br/>
    <b>From</b>&nbsp;&nbsp;&nbsp;&nbsp;${orig.from}<br/>
    <b>Date</b>&nbsp;&nbsp;&nbsp;&nbsp;${fmtDate}<br/>
    <b>To</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${toAddr}<br/>
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

            run(`INSERT INTO mail_logs (task_id, contact_email, contact_name, account_id, template_id, subject, status, message_id)
                 VALUES (?,?,?,?,?,?,'sent',?)`,
                [taskId, contact.email, contact.name || '', account.id, template.id, subj, msgId])
            run('UPDATE smtp_accounts SET send_count = send_count + 1 WHERE id=?', [account.id])
            run('UPDATE mail_tasks SET sent_count = sent_count + 1 WHERE id=?', [taskId])
        } catch (e) {
            run(`INSERT INTO mail_logs (task_id, contact_email, contact_name, account_id, template_id, subject, status)
                 VALUES (?,?,?,?,?,?,'failed')`,
                [taskId, contact.email, contact.name || '', account.id, template.id, template.subject])
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
    const tasks = getAll('SELECT * FROM mail_tasks ORDER BY id DESC')
    // Inject real-time countdown info
    const result = tasks.map(t => {
        const prog = taskProgress.get(t.id)
        return { ...t, _progress: prog || null }
    })
    res.json(result)
})

router.post('/tasks', authMiddleware, (req, res) => {
    const { name, template_ids, contact_ids, account_ids, interval_min, interval_max, cc, read_receipt, schedule_at, priority, parent_task_id } = req.body
    const r = run(
        `INSERT INTO mail_tasks (name, status, template_ids, contact_ids, account_ids, interval_min, interval_max, cc, read_receipt, schedule_at, priority, parent_task_id)
         VALUES (?,'pending',?,?,?,?,?,?,?,?,?,?)`,
        [name || 'New Task',
         JSON.stringify(template_ids || []), JSON.stringify(contact_ids || []),
         JSON.stringify(account_ids || []),
         interval_min || 10, interval_max || 60, cc || '',
         read_receipt !== false ? 1 : 0,
         schedule_at || null,
         priority ? 1 : 0,
         parent_task_id || null]
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

    const { name, template_ids, contact_ids, account_ids, interval_min, interval_max, cc, read_receipt, schedule_at, priority, parent_task_id } = req.body
    run(`UPDATE mail_tasks SET name=?, template_ids=?, contact_ids=?, account_ids=?, interval_min=?, interval_max=?, cc=?, read_receipt=?, schedule_at=?, priority=?, parent_task_id=? WHERE id=?`,
        [name || 'Updated Task',
         JSON.stringify(template_ids || []), JSON.stringify(contact_ids || []),
         JSON.stringify(account_ids || []),
         interval_min || 10, interval_max || 60, cc || '',
         read_receipt !== false ? 1 : 0,
         schedule_at || null,
         priority ? 1 : 0,
         parent_task_id || null,
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
    const taskId = req.query.task_id
    const logs = taskId
        ? getAll('SELECT * FROM mail_logs WHERE task_id=? ORDER BY id ASC', [taskId])
        : getAll('SELECT * FROM mail_logs ORDER BY id DESC LIMIT 500')
    res.json(logs)
})

// Grouped view: one row per contact_email, with follow-up counts
router.get('/logs/grouped', authMiddleware, (req, res) => {
    const taskId = req.query.task_id
    // Get all logs for this task (or all tasks)
    const where = taskId ? `WHERE ml.task_id=${+taskId}` : ''
    const rows = getAll(
        `SELECT ml.*, mt.name AS task_name, mt2.name AS template_name
         FROM mail_logs ml
         LEFT JOIN mail_tasks mt ON mt.id = ml.task_id
         LEFT JOIN mail_templates mt2 ON mt2.id = ml.template_id
         ${where ? where.replace('ml.task_id', 'ml.task_id') : ''}
         ORDER BY ml.contact_email, ml.id ASC`
    )

    // Group by contact_email
    const grouped = {}
    for (const r of rows) {
        if (!grouped[r.contact_email]) {
            grouped[r.contact_email] = {
                contact_email: r.contact_email,
                contact_name:  r.contact_name || '',
                records: []
            }
        }
        grouped[r.contact_email].records.push(r)
    }

    // Build summary row for each email
    const result = Object.values(grouped).map(g => {
        const total = g.records.length
        // Follow-up = records from tasks that have a parent_task_id
        // We detect this from task name containing "跟进" or by checking parent_task_id
        let sendCount = 0; let followCount = 0
        for (const r of g.records) {
            if (r.task_name && r.task_name.includes('跟进')) followCount++
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

export default router

