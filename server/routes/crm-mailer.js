/**
 * CRM Mailer routes: uses SHARED smtp_accounts + mail_templates tables.
 * Supports assignment, enhanced customer picker, send tasks with real-time progress,
 * and comprehensive send records (mail_logs).
 */
import { Router } from 'express'
import nodemailer from 'nodemailer'
import { getAll, getOne, run } from '../db.js'
import { dualAuth } from './crm-customers.js'

const router = Router()

// Helper: check if user can access based on assigned_users
function canAccess(assigned, userId) {
  if (!assigned || assigned === '' || assigned === 'all') return true
  return assigned.split(',').map(s => s.trim()).includes(String(userId))
}

// ─── SMTP Accounts (shared smtp_accounts table) ────────────────────────────────
router.get('/accounts', dualAuth, (req, res) => {
  const isAdmin = req.crmUser?.role === 'admin' || req.user
  let accounts = getAll('SELECT * FROM smtp_accounts ORDER BY id DESC')
  if (!isAdmin) {
    const userId = req.crmUser?.id
    accounts = accounts.filter(a => canAccess(a.assigned_users, userId))
  }
  // Also get CRM users for assignment dropdown
  const users = isAdmin ? getAll('SELECT id, username, display_name FROM crm_users ORDER BY id') : []
  res.json({ accounts, users })
})

router.post('/accounts', dualAuth, (req, res) => {
  const { smtp_host, smtp_port, smtp_user, smtp_pass, from_name, assigned_users } = req.body
  if (!smtp_host || !smtp_user || !smtp_pass) return res.status(400).json({ error: '请填写完整信息' })
  const r = run(`INSERT INTO smtp_accounts (name, smtp_host, smtp_port, smtp_user, smtp_pass, from_name, assigned_users, enabled) VALUES (?,?,?,?,?,?,?,1)`,
    [smtp_user, smtp_host, parseInt(smtp_port)||465, smtp_user, smtp_pass, from_name||'SunSea Steel', assigned_users||'all'])
  res.json({ id: r.lastInsertRowid, message: '邮箱已添加' })
})

router.put('/accounts/:id', dualAuth, (req, res) => {
  const { smtp_host, smtp_port, smtp_user, smtp_pass, from_name, assigned_users } = req.body
  if (req.crmUser?.role !== 'admin' && !req.user) return res.status(403).json({ error: '无权限' })
  run('UPDATE smtp_accounts SET smtp_host=?,smtp_port=?,smtp_user=?,smtp_pass=?,from_name=?,assigned_users=? WHERE id=?',
    [smtp_host, parseInt(smtp_port)||465, smtp_user, smtp_pass, from_name||'', assigned_users||'all', req.params.id])
  res.json({ message: '已更新' })
})

router.delete('/accounts/:id', dualAuth, (req, res) => {
  if (req.crmUser?.role !== 'admin' && !req.user) return res.status(403).json({ error: '无权限' })
  run('DELETE FROM smtp_accounts WHERE id=?', [req.params.id])
  res.json({ message: '已删除' })
})

// Test SMTP connection
router.post('/accounts/:id/test', dualAuth, async (req, res) => {
  const acct = getOne('SELECT * FROM smtp_accounts WHERE id=?', [req.params.id])
  if (!acct) return res.status(404).json({ error: '账号不存在' })
  try {
    const transport = nodemailer.createTransport({
      host: acct.smtp_host, port: parseInt(acct.smtp_port)||465,
      secure: parseInt(acct.smtp_port) === 465,
      auth: { user: acct.smtp_user, pass: acct.smtp_pass },
      tls: { rejectUnauthorized: false }, connectionTimeout: 10000
    })
    await transport.verify()
    res.json({ success: true, message: '✅ 连接成功' })
  } catch (e) {
    res.json({ success: false, message: `❌ 连接失败: ${e.message}` })
  }
})

// ─── Templates (shared mail_templates with assignment) ──────────────────────────
router.get('/templates', dualAuth, (req, res) => {
  const isAdmin = req.crmUser?.role === 'admin' || req.user
  let templates = getAll('SELECT * FROM mail_templates ORDER BY id DESC')
  if (!isAdmin) {
    const userId = req.crmUser?.id
    templates = templates.filter(t => canAccess(t.assigned_users, userId))
  }
  res.json(templates)
})

router.post('/templates', dualAuth, (req, res) => {
  const { name, subject, html_body, assigned_users } = req.body
  const r = run('INSERT INTO mail_templates (name, subject, html_body, assigned_users) VALUES (?,?,?,?)',
    [name, subject, html_body||'', assigned_users||''])
  res.json({ id: r.lastInsertRowid, message: '模板已保存' })
})

router.put('/templates/:id', dualAuth, (req, res) => {
  const { name, subject, html_body, assigned_users } = req.body
  if (assigned_users !== undefined) {
    run('UPDATE mail_templates SET name=?,subject=?,html_body=?,assigned_users=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [name, subject, html_body, assigned_users, req.params.id])
  } else {
    run('UPDATE mail_templates SET name=?,subject=?,html_body=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [name, subject, html_body, req.params.id])
  }
  res.json({ message: '已更新' })
})

router.delete('/templates/:id', dualAuth, (req, res) => {
  run('DELETE FROM mail_templates WHERE id=?', [req.params.id])
  res.json({ message: '已删除' })
})

// ─── Enhanced Customer Picker ──────────────────────────────────────────────────
router.get('/customers-picker', dualAuth, (req, res) => {
  const { search, country, status, tag, has_email } = req.query
  let where = ['1=1'], params = []
  // Owner filter for sub-users
  if (req.crmUser && req.crmUser.role !== 'admin') {
    where.push('(c.owner_id = ? OR c.owner_id IS NULL)')
    params.push(req.crmUser.id)
  }
  if (search) { where.push("(c.name LIKE ? OR c.email LIKE ? OR c.company LIKE ?)"); params.push(`%${search}%`,`%${search}%`,`%${search}%`) }
  if (country) { where.push("c.country = ?"); params.push(country) }
  if (status) { where.push("c.status = ?"); params.push(status) }
  if (tag) { where.push("c.tags LIKE ?"); params.push(`%${tag}%`) }
  if (has_email === '1') { where.push("c.email != '' AND c.email IS NOT NULL") }

  const customers = getAll(`SELECT c.id, c.name, c.email, c.company, c.country, c.status, c.tags FROM crm_customers c
    WHERE ${where.join(' AND ')} ORDER BY c.name ASC LIMIT 500`, params)
  
  // Get distinct values for filters
  const countries = getAll("SELECT DISTINCT country FROM crm_customers WHERE country != '' ORDER BY country").map(r => r.country)
  const statuses = getAll("SELECT DISTINCT status FROM crm_customers WHERE status != '' ORDER BY status").map(r => r.status)
  // Get all tags
  const allTags = new Set()
  getAll("SELECT tags FROM crm_customers WHERE tags != '' AND tags != '[]'").forEach(r => {
    try { JSON.parse(r.tags).forEach(t => allTags.add(t)) } catch(e) {}
  })

  res.json({ customers, countries, statuses, tags: [...allTags].sort() })
})

// ─── Send email to CRM customers ──────────────────────────────────────────────
const activeTasks = new Map()
const taskProgress = new Map()

router.post('/send', dualAuth, async (req, res) => {
  const { customer_ids, template_id, account_id, subject, html_body, interval_min, interval_max } = req.body

  let smtp
  if (account_id) smtp = getOne('SELECT * FROM smtp_accounts WHERE id=?', [account_id])
  if (!smtp) smtp = getOne('SELECT * FROM smtp_accounts WHERE enabled=1 LIMIT 1')
  if (!smtp) return res.status(400).json({ error: '未配置发送邮箱' })

  let tpl = null
  if (template_id) tpl = getOne('SELECT * FROM mail_templates WHERE id=?', [template_id])
  const finalSubject = subject || tpl?.subject || 'SunSea Steel'
  const finalBody = html_body || tpl?.html_body || ''
  if (!finalBody.trim()) return res.status(400).json({ error: '邮件内容不能为空' })

  const customers = (customer_ids || []).map(id => getOne('SELECT * FROM crm_customers WHERE id=?', [id])).filter(c => c?.email)
  if (!customers.length) return res.status(400).json({ error: '没有有效的收件人' })

  const taskResult = run('INSERT INTO crm_email_logs (recipient_email,subject,status,sent_at,sent_by) VALUES (?,?,?,?,?)',
    ['[task]', `批量发送: ${customers.length}封`, 'running', new Date().toISOString(), req.crmUser?.id||null])
  const taskId = taskResult.lastInsertRowid

  const ctx = { cancelled: false }
  activeTasks.set(taskId, ctx)

  async function runSendTask() {
    const transport = nodemailer.createTransport({
      host: smtp.smtp_host, port: parseInt(smtp.smtp_port)||465,
      secure: parseInt(smtp.smtp_port) === 465,
      auth: { user: smtp.smtp_user, pass: smtp.smtp_pass },
      tls: { rejectUnauthorized: false }
    })
    let sent = 0, failed = 0
    for (let i = 0; i < customers.length; i++) {
      if (ctx.cancelled) break
      const c = customers[i]
      taskProgress.set(taskId, { nextEmail: c.email, remaining: customers.length - i, total: customers.length, sent, failed })
      try {
        const subj = finalSubject.replace(/\{\{name\}\}/g, c.name||'').replace(/\{\{company\}\}/g, c.company||'')
        const body = finalBody.replace(/\{\{name\}\}/g, c.name||'').replace(/\{\{company\}\}/g, c.company||'')
        await transport.sendMail({
          from: `"${smtp.from_name||'SunSea Steel'}" <${smtp.smtp_user}>`, to: c.email, subject: subj, html: body
        })
        run('INSERT INTO crm_email_logs (recipient_email,subject,status,sent_at,sent_by) VALUES (?,?,?,?,?)',
          [c.email, subj, 'sent', new Date().toISOString(), req.crmUser?.id||null])
        sent++
      } catch (e) {
        run('INSERT INTO crm_email_logs (recipient_email,subject,status,sent_at,sent_by) VALUES (?,?,?,?,?)',
          [c.email, finalSubject, 'failed', new Date().toISOString(), req.crmUser?.id||null])
        failed++
      }
      if (i < customers.length - 1 && !ctx.cancelled) {
        const min = parseInt(interval_min) || 5
        const max = parseInt(interval_max) || 30
        const delay = (Math.floor(Math.random() * (max - min + 1)) + min) * 1000
        await new Promise(r => setTimeout(r, delay))
      }
    }
    run('UPDATE crm_email_logs SET status=?, subject=? WHERE id=?',
      [ctx.cancelled ? 'cancelled' : 'done', `批量: 成功${sent} 失败${failed} / ${customers.length}封`, taskId])
    activeTasks.delete(taskId)
    taskProgress.delete(taskId)
  }

  runSendTask().catch(e => console.error('CRM send task error:', e))
  res.json({ task_id: taskId, message: `开始发送 ${customers.length} 封邮件` })
})

// Real-time progress
router.get('/progress', dualAuth, (req, res) => {
  const result = {}
  for (const [id, prog] of taskProgress.entries()) result[id] = prog
  res.json(result)
})

// Stop task
router.post('/stop/:taskId', dualAuth, (req, res) => {
  const ctx = activeTasks.get(+req.params.taskId)
  if (ctx) { ctx.cancelled = true; activeTasks.delete(+req.params.taskId) }
  taskProgress.delete(+req.params.taskId)
  res.json({ message: '已停止' })
})

// ─── Send records (CRM + website mail_logs) ────────────────────────────────────
router.get('/records', dualAuth, (req, res) => {
  const isAdmin = req.crmUser?.role === 'admin' || req.user

  // CRM email logs
  let crmFilter = '', crmParams = []
  if (!isAdmin) { crmFilter = 'WHERE sent_by = ?'; crmParams = [req.crmUser.id] }
  const crmLogs = getAll(`SELECT id, recipient_email, subject, status, sent_at, sent_by, 'crm' as source FROM crm_email_logs ${crmFilter} ORDER BY sent_at DESC LIMIT 300`, crmParams)

  // Website mail_logs (admin only sees these)
  let siteLogs = []
  if (isAdmin) {
    try {
      siteLogs = getAll(`SELECT id, contact_email as recipient_email, subject, status, sent_at, account_name as sent_by_name, 'site' as source FROM mail_logs ORDER BY sent_at DESC LIMIT 300`)
    } catch(e) {}
  }

  // Merge and sort by date
  const all = [...crmLogs, ...siteLogs].sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at)).slice(0, 500)
  res.json(all)
})

router.delete('/records/:id', dualAuth, (req, res) => {
  const { source } = req.query
  if (source === 'site') {
    run('DELETE FROM mail_logs WHERE id=?', [req.params.id])
  } else {
    run('DELETE FROM crm_email_logs WHERE id=?', [req.params.id])
  }
  res.json({ message: '已删除' })
})

export default router
