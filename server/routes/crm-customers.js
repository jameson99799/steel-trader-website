import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { getAll, getOne, run } from '../db.js'
import { replaceCustomVars } from './mailer.js'
import archiver from 'archiver'
import AdmZip from 'adm-zip'
import { join, basename, dirname } from 'path'
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = join(__dirname, '..', '..', 'uploads')

const router = Router()

// Helper: convert relative image URLs to absolute for email clients
function fixEmailImageUrls(html) {
  const siteUrl = 'https://www.sunseasteel.com'
  let out = html
  out = out.replace(/src=["'](\/uploads\/[^"']+)["']/gi, `src="${siteUrl}$1"`)
  out = out.replace(/src=["'](\/api\/[^"']+)["']/gi, `src="${siteUrl}$1"`)
  out = out.replace(/src=["']data:image\/gif;base64,[^"']*["']/gi, 'src=""')
  out = out.replace(/<span\s+class=["']replace-tip["'][^>]*>.*?<\/span>/gi, '')
  return out
}

// Helper: replace sender variables (email, phone, whatsapp)
function replaceSenderVars(html, smtpUser) {
  try {
    const comp = getOne('SELECT phone, email, whatsapp, name_en FROM company WHERE id=1')
    const senderEmail = smtpUser || comp?.email || ''
    const senderPhone = comp?.phone || comp?.whatsapp || ''
    const cleanPhone = senderPhone.replace(/[^\d]/g, '')
    const waLink = cleanPhone ? `https://api.whatsapp.com/send?phone=${cleanPhone}` : ''
    let out = html
    out = out.replace(/\{\{email\}\}/g, senderEmail)
    out = out.replace(/\{\{phone\}\}/g, senderPhone)
    out = out.replace(/\{\{whatsapp_link\}\}/g, waLink)
    out = out.replace(/\{\{company_name\}\}/g, comp?.name_en || 'SunSea Steel')
    return out
  } catch (_) { return html }
}

const CRM_SECRET = process.env.CRM_JWT_SECRET || 'crm-steel-secret-2024'
const ADMIN_SECRET = process.env.JWT_SECRET || 'led-trade-secret-key-2024'

// Dual auth: accepts both CRM token or admin token
export function dualAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: '未授权' })

  // Try CRM token first
  try {
    req.crmUser = jwt.verify(token, CRM_SECRET)
    return next()
  } catch (e) {}

  // Try admin token
  try {
    req.user = jwt.verify(token, ADMIN_SECRET)
    return next()
  } catch (e) {}

  return res.status(401).json({ error: 'Token 无效' })
}

// ─── List customers ─────────────────────────────────────────────────────────────
router.get('/', dualAuth, (req, res) => {
  const { search, country, status, tag, start_date, end_date, company_fuzzy, page = 1, limit = 50 } = req.query
  let where = ['1=1']
  let params = []

  // Sub users only see own customers
  if (req.crmUser && req.crmUser.role !== 'admin') {
    where.push('c.owner_id = ?')
    params.push(req.crmUser.id)
  }

  if (search) {
    where.push(`(c.name LIKE ? OR c.email LIKE ? OR c.company LIKE ? OR c.phone LIKE ? OR c.whatsapp LIKE ?)`)
    const s = `%${search}%`
    params.push(s, s, s, s, s)
  }
  // Company fuzzy match: extract core words, match any containing them
  if (company_fuzzy) {
    const core = company_fuzzy.replace(/\b(pte|ltd|co|inc|corp|llc|steel|trading|international)\b/gi, '').replace(/[.,\s]+/g, ' ').trim().split(/\s+/).filter(w => w.length > 1)
    if (core.length) {
      const clauses = core.map(() => 'LOWER(c.company) LIKE ?')
      where.push(`(${clauses.join(' OR ')})`)
      core.forEach(w => params.push(`%${w.toLowerCase()}%`))
    }
  }
  if (country) { where.push('c.country = ?'); params.push(country) }
  if (status) { where.push('c.status = ?'); params.push(status) }
  if (tag) { where.push("c.tags LIKE ?"); params.push(`%${tag}%`) }
  if (start_date) { where.push("c.created_at >= ?"); params.push(start_date) }
  if (end_date) { where.push("c.created_at <= ?"); params.push(end_date + ' 23:59:59') }

  // Admin can filter by specific owner
  const { owner_id } = req.query
  if (owner_id) { where.push('c.owner_id = ?'); params.push(owner_id) }

  const offset = (parseInt(page) - 1) * parseInt(limit)

  const total = getOne(
    `SELECT COUNT(*) as count FROM crm_customers c WHERE ${where.join(' AND ')}`, params
  )?.count || 0

  const customers = getAll(
    `SELECT c.*, u.display_name as owner_name,
       (SELECT COUNT(*) FROM crm_inquiries WHERE customer_id = c.id) as inquiry_count,
       (SELECT COUNT(*) FROM crm_quotations WHERE customer_id = c.id) as quotation_count,
       (SELECT COUNT(*) FROM crm_followups WHERE customer_id = c.id) as followup_count
     FROM crm_customers c
     LEFT JOIN crm_users u ON c.owner_id = u.id
     WHERE ${where.join(' AND ')}
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), offset]
  )

  // Get unique countries for filters
  const countries = getAll(
    `SELECT DISTINCT country FROM crm_customers WHERE country IS NOT NULL AND country != '' ORDER BY country`
  )

  // Get CRM users for owner filter dropdown
  const users = getAll('SELECT id, display_name FROM crm_users ORDER BY id')

  res.json({ customers, total, countries: countries.map(c => c.country), users, page: parseInt(page), limit: parseInt(limit) })
})

// ─── Get single customer ────────────────────────────────────────────────────────
router.get('/stats/overview', dualAuth, (req, res) => {
  let ownerFilter = ''
  let params = []
  if (req.crmUser && req.crmUser.role !== 'admin') {
    ownerFilter = 'WHERE owner_id = ?'
    params = [req.crmUser.id]
  }
  const w2 = ownerFilter ? ownerFilter + ' AND' : 'WHERE'
  const total = getOne(`SELECT COUNT(*) as c FROM crm_customers ${ownerFilter}`, params)?.c || 0
  const developing = getOne(`SELECT COUNT(*) as c FROM crm_customers ${w2} status = '开发中'`, params)?.c || 0
  const contacting = getOne(`SELECT COUNT(*) as c FROM crm_customers ${w2} status = '联系中'`, params)?.c || 0
  const closed = getOne(`SELECT COUNT(*) as c FROM crm_customers ${w2} status = '已成交'`, params)?.c || 0
  const pool = getOne(`SELECT COUNT(*) as c FROM crm_customers WHERE status = '公海池'`)?.c || 0
  res.json({ total, developing, contacting, closed, pool })
})

// Sea pool list
router.get('/pool/sea', dualAuth, (req, res) => {
  const customers = getAll(
    `SELECT c.*, u.display_name as owner_name,
       (SELECT COUNT(*) FROM crm_inquiries WHERE customer_id = c.id) as inquiry_count,
       (SELECT COUNT(*) FROM crm_quotations WHERE customer_id = c.id) as quotation_count
     FROM crm_customers c LEFT JOIN crm_users u ON c.owner_id = u.id
     WHERE c.status = '公海池' ORDER BY c.country, c.created_at DESC`
  )
  res.json(customers)
})

// Claim from sea pool
router.post('/pool/claim/:id', dualAuth, (req, res) => {
  const id = req.params.id
  const customer = getOne('SELECT * FROM crm_customers WHERE id = ? AND status = ?', [id, '公海池'])
  if (!customer) return res.status(400).json({ error: '该客户不在公海池中' })
  const userId = req.crmUser?.id
  if (!userId) return res.status(400).json({ error: '无法确定申领人' })
  const now = new Date().toISOString()
  run(`INSERT INTO crm_customer_history (customer_id, from_user_id, to_user_id, action, created_at) VALUES (?,?,?,?,?)`,
    [id, customer.owner_id, userId, 'claim', now])
  run(`UPDATE crm_customers SET owner_id = ?, status = '联系中', last_activity_at = ? WHERE id = ?`, [userId, now, id])
  res.json({ message: '申领成功' })
})

// CRM settings
router.get('/settings/crm', dualAuth, (req, res) => {
  const s = getOne('SELECT * FROM crm_settings WHERE id = 1')
  res.json(s || { sea_pool_days: 30 })
})

router.put('/settings/crm', dualAuth, (req, res) => {
  if (req.crmUser && req.crmUser.role !== 'admin' && !req.user) {
    return res.status(403).json({ error: '需要管理员权限' })
  }
  const { sea_pool_days } = req.body
  run('UPDATE crm_settings SET sea_pool_days = ? WHERE id = 1', [sea_pool_days || 30])
  // Auto-move inactive
  const days = parseInt(sea_pool_days) || 30
  const cutoff = new Date(Date.now() - days * 86400000).toISOString()
  const inactive = getAll(
    `SELECT id, owner_id FROM crm_customers WHERE status NOT IN ('公海池', '已成交') AND last_activity_at < ?`, [cutoff]
  )
  const now = new Date().toISOString()
  for (const c of inactive) {
    run(`UPDATE crm_customers SET status = '公海池', sea_pool_count = sea_pool_count + 1 WHERE id = ?`, [c.id])
    run(`INSERT INTO crm_customer_history (customer_id, from_user_id, to_user_id, action, created_at) VALUES (?,?,NULL,'auto_pool',?)`,
      [c.id, c.owner_id, now])
  }
  res.json({ message: '设置已保存', moved_to_pool: inactive.length })
})

// Move customer(s) to sea pool
router.post('/pool/move', dualAuth, (req, res) => {
  const { customer_ids } = req.body
  if (!customer_ids?.length) return res.status(400).json({ error: '请选择客户' })
  const now = new Date().toISOString()
  let moved = 0
  for (const id of customer_ids) {
    const c = getOne('SELECT id, owner_id, status FROM crm_customers WHERE id=?', [id])
    if (c && c.status !== '公海池') {
      run(`UPDATE crm_customers SET status='公海池', sea_pool_count = sea_pool_count + 1, last_activity_at=? WHERE id=?`, [now, id])
      run(`INSERT INTO crm_customer_history (customer_id, from_user_id, to_user_id, action, created_at) VALUES (?,?,NULL,'manual_pool',?)`,
        [id, c.owner_id, now])
      moved++
    }
  }
  res.json({ message: `已移入公海池 ${moved} 位客户`, moved })
})

// Bulk assign customers to a specific owner
router.post('/bulk-assign', dualAuth, (req, res) => {
  const { ids, owner_id } = req.body
  if (!ids?.length) return res.status(400).json({ error: '请选择客户' })
  if (owner_id === undefined) return res.status(400).json({ error: '请选择负责人' })
  const now = new Date().toISOString()
  let assigned = 0
  for (const id of ids) {
    const c = getOne('SELECT id, owner_id FROM crm_customers WHERE id = ?', [id])
    if (c) {
      run('UPDATE crm_customers SET owner_id = ? WHERE id = ?', [owner_id || null, id])
      run(`INSERT INTO crm_customer_history (customer_id, from_user_id, to_user_id, action, created_at) VALUES (?,?,?,'assign',?)`,
        [id, c.owner_id, owner_id || null, now])
      assigned++
    }
  }
  res.json({ message: `已分配 ${assigned} 位客户`, assigned })
})

// Global search
router.get('/search/global', dualAuth, (req, res) => {
  const { q, date } = req.query
  if (!q && !date) return res.json({ results: [] })
  let ownerFilter = '', ownerParams = []
  if (req.crmUser && req.crmUser.role !== 'admin') {
    ownerFilter = 'AND c.owner_id = ?'
    ownerParams = [req.crmUser.id]
  }
  let results = []
  if (q) {
    const s = `%${q}%`
    results = [
      ...getAll(`SELECT c.id, c.first_name, c.last_name, c.name, c.company, c.country, c.email, 'customer' as type FROM crm_customers c WHERE (c.name LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ? OR c.company LIKE ? OR c.phone LIKE ? OR c.note LIKE ?) ${ownerFilter} LIMIT 20`, [s, s, s, s, s, s, s, ...ownerParams]),
      ...getAll(`SELECT i.id, i.customer_id, i.note, i.inquiry_time, 'inquiry' as type, c.name as customer_name FROM crm_inquiries i JOIN crm_customers c ON i.customer_id=c.id WHERE (i.content_html LIKE ? OR i.note LIKE ?) ${ownerFilter.replace('c.owner_id', 'c.owner_id')} ORDER BY i.inquiry_time DESC LIMIT 20`, [s, s, ...ownerParams]),
      ...getAll(`SELECT q.id, q.customer_id, q.note, q.quotation_time, 'quotation' as type, c.name as customer_name FROM crm_quotations q JOIN crm_customers c ON q.customer_id=c.id WHERE (q.content_html LIKE ? OR q.note LIKE ?) ${ownerFilter.replace('c.owner_id', 'c.owner_id')} ORDER BY q.quotation_time DESC LIMIT 20`, [s, s, ...ownerParams]),
      ...getAll(`SELECT f.id, f.customer_id, f.content as note, f.created_at as followup_time, 'followup' as type, c.name as customer_name FROM crm_followups f JOIN crm_customers c ON f.customer_id=c.id WHERE (f.content LIKE ? OR f.subject LIKE ?) ${ownerFilter.replace('c.owner_id', 'c.owner_id')} ORDER BY f.created_at DESC LIMIT 20`, [s, s, ...ownerParams])
    ]
  }
  if (date) {
    results = [
      ...results,
      ...getAll(`SELECT i.id, i.customer_id, i.note, i.inquiry_time, 'inquiry' as type, c.name as customer_name FROM crm_inquiries i JOIN crm_customers c ON i.customer_id=c.id WHERE DATE(i.inquiry_time)=? ${ownerFilter} ORDER BY i.inquiry_time DESC`, [date, ...ownerParams]),
      ...getAll(`SELECT q.id, q.customer_id, q.note, q.quotation_time, 'quotation' as type, c.name as customer_name FROM crm_quotations q JOIN crm_customers c ON q.customer_id=c.id WHERE DATE(q.quotation_time)=? ${ownerFilter} ORDER BY q.quotation_time DESC`, [date, ...ownerParams])
    ]
  }
  res.json({ results })
})

// ─── Single customer ────────────────────────────────────────────────────────────
router.get('/:id', dualAuth, (req, res) => {
  const c = getOne(
    `SELECT c.*, u.display_name as owner_name FROM crm_customers c
     LEFT JOIN crm_users u ON c.owner_id = u.id WHERE c.id = ?`, [req.params.id]
  )
  if (!c) return res.status(404).json({ error: '客户不存在' })
  c.claim_history = getAll(
    `SELECT h.*, fu.display_name as from_name, tu.display_name as to_name
     FROM crm_customer_history h LEFT JOIN crm_users fu ON h.from_user_id=fu.id
     LEFT JOIN crm_users tu ON h.to_user_id=tu.id WHERE h.customer_id=? ORDER BY h.created_at DESC`, [req.params.id]
  )
  try { c.tags = JSON.parse(c.tags || '[]') } catch (e) { c.tags = [] }
  res.json(c)
})

// Create customer
router.post('/', dualAuth, (req, res) => {
  const { first_name, last_name, name, country, phone, email, whatsapp, wechat, company, status, tags, note } = req.body
  const fn = first_name || ''
  const ln = last_name || ''
  const fullName = name || `${fn} ${ln}`.trim() || '未命名'
  if (!fullName) return res.status(400).json({ error: '客户名称不能为空' })
  const ownerId = req.crmUser?.id || null
  const now = new Date().toISOString()
  const result = run(
    `INSERT INTO crm_customers (owner_id,first_name,last_name,name,country,phone,email,whatsapp,wechat,company,status,tags,note,last_activity_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [ownerId, fn, ln, fullName, country||'', phone||'', email||'', whatsapp||'', wechat||'', company||'', status||'开发中', JSON.stringify(tags||[]), note||'', now, now]
  )
  res.json({ id: result.lastInsertRowid, message: '添加成功' })
})

// Update customer
router.put('/:id', dualAuth, (req, res) => {
  const { first_name, last_name, name, country, phone, email, whatsapp, wechat, company, status, tags, note } = req.body
  const fn = first_name || ''
  const ln = last_name || ''
  const fullName = name || `${fn} ${ln}`.trim() || '未命名'
  run(`UPDATE crm_customers SET first_name=?,last_name=?,name=?,country=?,phone=?,email=?,whatsapp=?,wechat=?,company=?,status=?,tags=?,note=? WHERE id=?`,
    [fn, ln, fullName, country||'', phone||'', email||'', whatsapp||'', wechat||'', company||'', status||'开发中', JSON.stringify(tags||[]), note||'', req.params.id])
  res.json({ message: '更新成功' })
})

// Delete customer
router.delete('/:id', dualAuth, (req, res) => {
  const id = req.params.id
  run('DELETE FROM crm_inquiries WHERE customer_id=?', [id])
  run('DELETE FROM crm_quotations WHERE customer_id=?', [id])
  run('DELETE FROM crm_followups WHERE customer_id=?', [id])
  run('DELETE FROM crm_customer_history WHERE customer_id=?', [id])
  run('DELETE FROM crm_customers WHERE id=?', [id])
  res.json({ message: '删除成功' })
})

// ─── Inquiries ──────────────────────────────────────────────────────────────────
router.get('/:id/inquiries', dualAuth, (req, res) => {
  const list = getAll('SELECT * FROM crm_inquiries WHERE customer_id=? ORDER BY inquiry_time DESC', [req.params.id])
  list.forEach(i => {
    try { i.images = JSON.parse(i.images||'[]') } catch(e) { i.images = [] }
    try { i.files = JSON.parse(i.files||'[]') } catch(e) { i.files = [] }
  })
  res.json(list)
})

router.post('/:id/inquiries', dualAuth, (req, res) => {
  const { content_html, note, inquiry_time, images, files } = req.body
  const now = new Date().toISOString()
  const result = run(`INSERT INTO crm_inquiries (customer_id,content_html,note,images,files,inquiry_time,created_at) VALUES (?,?,?,?,?,?,?)`,
    [req.params.id, content_html||'', note||'', JSON.stringify(images||[]), JSON.stringify(files||[]), inquiry_time||now, now])
  run('UPDATE crm_customers SET last_activity_at=? WHERE id=?', [now, req.params.id])
  res.json({ id: result.lastInsertRowid })
})

router.put('/inquiries/:inqId', dualAuth, (req, res) => {
  const { content_html, note, inquiry_time, images, files } = req.body
  run(`UPDATE crm_inquiries SET content_html=?,note=?,images=?,files=?,inquiry_time=?,updated_at=? WHERE id=?`,
    [content_html, note||'', JSON.stringify(images||[]), JSON.stringify(files||[]), inquiry_time, new Date().toISOString(), req.params.inqId])
  res.json({ message: '更新成功' })
})

router.delete('/inquiries/:inqId', dualAuth, (req, res) => {
  run('DELETE FROM crm_inquiries WHERE id=?', [req.params.inqId])
  res.json({ message: '删除成功' })
})

// ─── Quotations ─────────────────────────────────────────────────────────────────
router.get('/:id/quotations', dualAuth, (req, res) => {
  const list = getAll('SELECT * FROM crm_quotations WHERE customer_id=? ORDER BY quotation_time DESC', [req.params.id])
  list.forEach(q => {
    try { q.ports = JSON.parse(q.ports||'[]') } catch(e) { q.ports = [] }
    try { q.price_rows = JSON.parse(q.price_rows||'[]') } catch(e) { q.price_rows = [] }
    try { q.files = JSON.parse(q.files||'[]') } catch(e) { q.files = [] }
    try { q.images = JSON.parse(q.images||'[]') } catch(e) { q.images = [] }
  })
  res.json(list)
})

router.post('/:id/quotations', dualAuth, (req, res) => {
  const { content_html, note, freight_type, ports, price_rows, files, images, quotation_time } = req.body
  const now = new Date().toISOString()
  const result = run(
    `INSERT INTO crm_quotations (customer_id,content_html,note,freight_type,ports,price_rows,files,images,quotation_time,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [req.params.id, content_html||'', note||'', freight_type||'container', JSON.stringify(ports||[]), JSON.stringify(price_rows||[]), JSON.stringify(files||[]), JSON.stringify(images||[]), quotation_time||now, now])
  run('UPDATE crm_customers SET last_activity_at=? WHERE id=?', [now, req.params.id])
  res.json({ id: result.lastInsertRowid })
})

router.put('/quotations/:qId', dualAuth, (req, res) => {
  const { content_html, note, freight_type, ports, price_rows, files, images, quotation_time } = req.body
  run(`UPDATE crm_quotations SET content_html=?,note=?,freight_type=?,ports=?,price_rows=?,files=?,images=?,quotation_time=?,updated_at=? WHERE id=?`,
    [content_html, note||'', freight_type||'container', JSON.stringify(ports||[]), JSON.stringify(price_rows||[]), JSON.stringify(files||[]), JSON.stringify(images||[]), quotation_time, new Date().toISOString(), req.params.qId])
  res.json({ message: '更新成功' })
})

router.delete('/quotations/:qId', dualAuth, (req, res) => {
  run('DELETE FROM crm_quotations WHERE id=?', [req.params.qId])
  res.json({ message: '删除成功' })
})

// ─── Followups ──────────────────────────────────────────────────────────────────
router.get('/:id/followups', dualAuth, (req, res) => {
  const list = getAll(
    `SELECT f.*, u.display_name as user_name FROM crm_followups f
     LEFT JOIN crm_users u ON f.user_id=u.id WHERE f.customer_id=? ORDER BY f.created_at DESC`, [req.params.id])
  list.forEach(f => { try { f.attachments = JSON.parse(f.attachments||'[]') } catch(e) { f.attachments = [] }; try { f.images = JSON.parse(f.images||'[]') } catch(e) { f.images = [] } })
  res.json(list)
})

router.post('/:id/followups', dualAuth, (req, res) => {
  const { content_html, note, images, attachments } = req.body
  const now = new Date().toISOString()
  const result = run(`INSERT INTO crm_followups (customer_id,user_id,content_html,note,images,attachments,created_at) VALUES (?,?,?,?,?,?,?)`,
    [req.params.id, req.crmUser?.id||null, content_html||'', note||'', JSON.stringify(images||[]), JSON.stringify(attachments||[]), now])
  run('UPDATE crm_customers SET last_activity_at=? WHERE id=?', [now, req.params.id])
  res.json({ id: result.lastInsertRowid })
})

router.put('/followups/:fId', dualAuth, (req, res) => {
  const { content_html, note, images, attachments } = req.body
  run(`UPDATE crm_followups SET content_html=?,note=?,images=?,attachments=?,updated_at=? WHERE id=?`,
    [content_html, note||'', JSON.stringify(images||[]), JSON.stringify(attachments||[]), new Date().toISOString(), req.params.fId])
  res.json({ message: '更新成功' })
})

router.delete('/followups/:fId', dualAuth, (req, res) => {
  run('DELETE FROM crm_followups WHERE id=?', [req.params.fId])
  res.json({ message: '删除成功' })
})

// ─── CRM Email (reuse mailer SMTP) ─────────────────────────────────────────────
router.post('/email/send', dualAuth, async (req, res) => {
  const { customer_ids, subject, html_body } = req.body
  if (!customer_ids?.length || !subject || !html_body) return res.status(400).json({ error: '请填写完整信息' })

  // Get SMTP config: prefer CRM user's own, fall back to first system account
  let smtp = null
  if (req.crmUser) {
    const crmUser = getOne('SELECT smtp_host,smtp_port,smtp_user,smtp_pass,from_name FROM crm_users WHERE id=?', [req.crmUser.id])
    if (crmUser?.smtp_host && crmUser?.smtp_user && crmUser?.smtp_pass) smtp = crmUser
  }
  if (!smtp) {
    smtp = getOne('SELECT smtp_host,smtp_port,smtp_user as smtp_user,smtp_pass,from_name FROM smtp_accounts WHERE enabled=1 LIMIT 1')
  }
  if (!smtp) return res.status(400).json({ error: '未配置邮箱账号' })

  const customers = customer_ids.map(id => getOne('SELECT email,name,company FROM crm_customers WHERE id=?', [id])).filter(c => c?.email)
  let sent = 0, failed = 0
  const nodemailer = (await import('nodemailer')).default
  const transport = nodemailer.createTransport({
    host: smtp.smtp_host, port: parseInt(smtp.smtp_port)||465, secure: parseInt(smtp.smtp_port)===465,
    auth: { user: smtp.smtp_user, pass: smtp.smtp_pass }, tls: { rejectUnauthorized: false }
  })
  for (const c of customers) {
    try {
      const subj = subject.replace(/\{\{name\}\}/g, c.name||'').replace(/\{\{company\}\}/g, c.company||'')
      const body = html_body.replace(/\{\{name\}\}/g, c.name||'').replace(/\{\{company\}\}/g, c.company||'')
      await transport.sendMail({
        from: `"${smtp.from_name||'SunSea Steel'}" <${smtp.smtp_user}>`, to: c.email, subject: subj, html: body
      })
      run('INSERT INTO crm_email_logs (recipient_email,subject,status,sent_at,sent_by) VALUES (?,?,?,?,?)',
        [c.email, subj, 'sent', new Date().toISOString(), req.crmUser?.id||null])
      sent++
    } catch (e) {
      run('INSERT INTO crm_email_logs (recipient_email,subject,status,sent_at,sent_by) VALUES (?,?,?,?,?)',
        [c.email, subject, 'failed', new Date().toISOString(), req.crmUser?.id||null])
      failed++
    }
  }
  res.json({ message: `发送完成: 成功 ${sent}, 失败 ${failed}` })
})

// ─── Export all customers ───────────────────────────────────────────────────────

// Quick-send: one-click email to a single customer using default template
router.post('/email/quick-send', dualAuth, async (req, res) => {
  const { customer_id } = req.body
  if (!customer_id) return res.status(400).json({ error: '缺少客户ID' })
  
  const customer = getOne('SELECT * FROM crm_customers WHERE id=?', [customer_id])
  if (!customer?.email) return res.status(400).json({ error: '该客户没有邮箱' })

  // Get default template (first template, or one marked as default)
  const tpl = getOne("SELECT * FROM mail_templates WHERE is_default=1 LIMIT 1") 
    || getOne("SELECT * FROM mail_templates ORDER BY id ASC LIMIT 1")
  if (!tpl) return res.status(400).json({ error: '未设置默认邮件模板，请先在邮件系统中创建模板' })

  // Get SMTP account (round-robin using modulo on customer_id)
  const accounts = getAll('SELECT * FROM smtp_accounts WHERE enabled=1 ORDER BY id ASC')
  if (!accounts.length) return res.status(400).json({ error: '未配置发送邮箱' })
  const smtp = accounts[customer_id % accounts.length]

  // Variable replacement
  const vars = { 
    name: customer.name||'', company: customer.company||'', 
    first_name: customer.first_name||customer.name||'', last_name: customer.last_name||'' 
  }
  let subj = tpl.subject || '', body = tpl.html_body || ''
  for (const [k, v] of Object.entries(vars)) {
    subj = subj.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v)
    body = body.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v)
  }
  body = fixEmailImageUrls(body)
  body = replaceSenderVars(body, smtp.smtp_user)
  body = replaceCustomVars(body)
  body = body.replace(/\{\{subject\}\}/g, encodeURIComponent('Re: ' + subj))
  body = body.replace(/\{\{subject_raw\}\}/g, subj)

  const now = new Date().toISOString()
  try {
    const nodemailer = (await import('nodemailer')).default
    const transport = nodemailer.createTransport({
      host: smtp.smtp_host, port: parseInt(smtp.smtp_port)||465, secure: parseInt(smtp.smtp_port)===465,
      auth: { user: smtp.smtp_user, pass: smtp.smtp_pass }, tls: { rejectUnauthorized: false }
    })
    await transport.sendMail({
      from: `"${smtp.from_name||'SunSea Steel'}" <${smtp.smtp_user}>`, to: customer.email, subject: subj, html: body
    })
    // Log to both tables for full visibility
    run('INSERT INTO crm_email_logs (recipient_email,subject,status,sent_at,sent_by) VALUES (?,?,?,?,?)',
      [customer.email, subj, 'sent', now, req.crmUser?.id||null])
    run(`INSERT INTO mail_logs (task_id,template_id,account_id,contact_email,contact_name,subject,status,message_id,sent_html,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [0, tpl.id, smtp.id, customer.email, customer.name||customer.first_name||'', subj, 'sent', '', body, String(req.crmUser?.id||'')])
    res.json({ message: `✅ 已发送给 ${customer.email}`, status: 'sent' })
  } catch (e) {
    run('INSERT INTO crm_email_logs (recipient_email,subject,status,sent_at,sent_by) VALUES (?,?,?,?,?)',
      [customer.email, subj, 'failed', now, req.crmUser?.id||null])
    run(`INSERT INTO mail_logs (task_id,template_id,account_id,contact_email,contact_name,subject,status,created_by) VALUES (?,?,?,?,?,?,?,?)`,
      [0, tpl.id, smtp.id, customer.email, customer.name||customer.first_name||'', subj, 'failed', String(req.crmUser?.id||'')])
    res.json({ message: `❌ 发送失败: ${e.message}`, status: 'failed' })
  }
})


// Quick follow-up: send a reply to a previously sent email
router.post('/email/quick-followup', dualAuth, async (req, res) => {
  const { recipient_email, original_subject, original_sent_at } = req.body
  if (!recipient_email) return res.status(400).json({ error: '缺少收件人' })

  // Ensure is_followup_default column exists
  try { run('ALTER TABLE mail_templates ADD COLUMN is_followup_default INTEGER DEFAULT 0') } catch(e) {}

  // Get followup default template (fallback to marketing default, then first template)
  const tpl = getOne("SELECT * FROM mail_templates WHERE is_followup_default=1 LIMIT 1")
    || getOne("SELECT * FROM mail_templates WHERE is_default=1 LIMIT 1")
    || getOne("SELECT * FROM mail_templates ORDER BY id ASC LIMIT 1")
  if (!tpl) return res.status(400).json({ error: '未设置默认邮件模板' })

  // Get SMTP account
  const accounts = getAll('SELECT * FROM smtp_accounts WHERE enabled=1 ORDER BY id ASC')
  if (!accounts.length) return res.status(400).json({ error: '未配置发送邮箱' })
  const smtp = accounts[Math.floor(Math.random() * accounts.length)]

  // Build follow-up subject
  const subj = original_subject
    ? (original_subject.startsWith('Re:') ? original_subject : `Re: ${original_subject}`)
    : tpl.subject || ''

  let body = tpl.html_body || ''
  const vars = { name: '', company: '', first_name: '', last_name: '' }
  const cust = getOne('SELECT * FROM crm_customers WHERE email=?', [recipient_email])
  if (cust) {
    vars.name = cust.name || ''; vars.company = cust.company || ''
    vars.first_name = cust.first_name || cust.name || ''; vars.last_name = cust.last_name || ''
  }
  for (const [k, v] of Object.entries(vars)) {
    body = body.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v)
  }
  body = fixEmailImageUrls(body)
  body = replaceSenderVars(body, smtp.smtp_user)
  body = replaceCustomVars(body)
  body = body.replace(/\{\{subject\}\}/g, encodeURIComponent('Re: ' + (subject || '')))
  body = body.replace(/\{\{subject_raw\}\}/g, subject || '')

  // Find the original email's HTML body from mail_logs
  const origEmail = getOne('SELECT sent_html, subject, sent_at FROM mail_logs WHERE contact_email=? AND status=? ORDER BY id DESC LIMIT 1', [recipient_email, 'sent'])
  const originalBody = origEmail?.sent_html || ''

  // Add Foxmail-style quoted reply with original email content
  const fmtDate = (origEmail?.sent_at || original_sent_at) ? new Date(origEmail?.sent_at || original_sent_at).toLocaleString('zh-CN') : ''
  const quotedBlock = `<br/><br/><div style="font-family:Arial;font-size:13px;color:#555"><div style="margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #ccc;font-size:12px;color:#888">---- Replied Message ----<br/><b>From</b>&nbsp;&nbsp;&nbsp;&nbsp;<a href="mailto:${smtp.smtp_user}" style="color:#0563c1">${smtp.smtp_user}</a><br/><b>Date</b>&nbsp;&nbsp;&nbsp;&nbsp;${fmtDate}<br/><b>To</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href="mailto:${recipient_email}" style="color:#0563c1">${recipient_email}</a><br/><b>Subject</b>&nbsp;${original_subject || origEmail?.subject || ''}</div><blockquote style="margin:10px 0 0 0;padding:10px 15px;border-left:3px solid #ccc;color:#666">${originalBody}</blockquote></div>`
  body = body + quotedBlock

  const now = new Date().toISOString()
  try {
    const nodemailer = (await import('nodemailer')).default
    const transport = nodemailer.createTransport({
      host: smtp.smtp_host, port: parseInt(smtp.smtp_port)||465, secure: parseInt(smtp.smtp_port)===465,
      auth: { user: smtp.smtp_user, pass: smtp.smtp_pass }, tls: { rejectUnauthorized: false }
    })
    const mailOpts = {
      from: `"${smtp.from_name||'SunSea Steel'}" <${smtp.smtp_user}>`, to: recipient_email, subject: subj, html: body
    }
    const origLog = getOne('SELECT message_id FROM mail_logs WHERE contact_email=? AND status=? ORDER BY id DESC LIMIT 1', [recipient_email, 'sent'])
    if (origLog?.message_id) {
      mailOpts.headers = { 'In-Reply-To': origLog.message_id, 'References': origLog.message_id }
    }
    await transport.sendMail(mailOpts)
    run('INSERT INTO crm_email_logs (recipient_email,subject,status,sent_at,sent_by) VALUES (?,?,?,?,?)',
      [recipient_email, subj, 'sent', now, req.crmUser?.id||null])
    run(`INSERT INTO mail_logs (task_id,template_id,account_id,contact_email,contact_name,subject,status,sent_at,sent_html,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [0, tpl.id, smtp.id, recipient_email, cust?.name||cust?.first_name||'', subj, 'sent', now, body, String(req.crmUser?.id||'')])
    res.json({ message: `✅ 跟进邮件已发送给 ${recipient_email}`, status: 'sent' })
  } catch (e) {
    run('INSERT INTO crm_email_logs (recipient_email,subject,status,sent_at,sent_by) VALUES (?,?,?,?,?)',
      [recipient_email, subj, 'failed', now, req.crmUser?.id||null])
    res.json({ message: `❌ 发送失败: ${e.message}`, status: 'failed' })
  }
})


router.get('/export/all', dualAuth, (req, res) => {
  if (req.crmUser && req.crmUser.role !== 'admin' && !req.user) {
    return res.status(403).json({ error: '需要管理员权限' })
  }
  const users = getAll('SELECT id,username,display_name FROM crm_users')
  const exportData = { exported_at: new Date().toISOString(), version: '1.0', users: [] }
  for (const u of users) {
    const customers = getAll(`SELECT c.* FROM crm_customers c WHERE c.owner_id=? ORDER BY c.created_at DESC`, [u.id])
    const userData = { user: u, customers: [] }
    for (const c of customers) {
      try { c.tags = JSON.parse(c.tags||'[]') } catch(e) { c.tags = [] }
      c.inquiries = getAll('SELECT * FROM crm_inquiries WHERE customer_id=? ORDER BY inquiry_time DESC', [c.id])
      c.inquiries.forEach(i => { try { i.images = JSON.parse(i.images||'[]') } catch(e) { i.images = [] }; try { i.files = JSON.parse(i.files||'[]') } catch(e) { i.files = [] } })
      c.quotations = getAll('SELECT * FROM crm_quotations WHERE customer_id=? ORDER BY quotation_time DESC', [c.id])
      c.quotations.forEach(q => { try { q.ports = JSON.parse(q.ports||'[]') } catch(e) { q.ports = [] }; try { q.price_rows = JSON.parse(q.price_rows||'[]') } catch(e) { q.price_rows = [] }; try { q.files = JSON.parse(q.files||'[]') } catch(e) { q.files = [] }; try { q.images = JSON.parse(q.images||'[]') } catch(e) { q.images = [] } })
      c.followups = getAll('SELECT f.*,u.display_name as user_name FROM crm_followups f LEFT JOIN crm_users u ON f.user_id=u.id WHERE f.customer_id=? ORDER BY f.created_at DESC', [c.id])
      c.followups.forEach(f => { try { f.attachments = JSON.parse(f.attachments||'[]') } catch(e) { f.attachments = [] } })
      userData.customers.push(c)
    }
    exportData.users.push(userData)
  }
  // Also include unassigned customers
  const unassigned = getAll(`SELECT c.* FROM crm_customers c WHERE c.owner_id IS NULL ORDER BY c.created_at DESC`)
  if (unassigned.length) {
    const unData = { user: { id: null, username: 'unassigned', display_name: '未分配' }, customers: [] }
    for (const c of unassigned) {
      try { c.tags = JSON.parse(c.tags||'[]') } catch(e) { c.tags = [] }
      c.inquiries = getAll('SELECT * FROM crm_inquiries WHERE customer_id=? ORDER BY inquiry_time DESC', [c.id])
      c.inquiries.forEach(i => { try { i.images = JSON.parse(i.images||'[]') } catch(e) { i.images = [] }; try { i.files = JSON.parse(i.files||'[]') } catch(e) { i.files = [] } })
      c.quotations = getAll('SELECT * FROM crm_quotations WHERE customer_id=? ORDER BY quotation_time DESC', [c.id])
      c.quotations.forEach(q => { try { q.ports = JSON.parse(q.ports||'[]') } catch(e) { q.ports = [] }; try { q.price_rows = JSON.parse(q.price_rows||'[]') } catch(e) { q.price_rows = [] }; try { q.files = JSON.parse(q.files||'[]') } catch(e) { q.files = [] }; try { q.images = JSON.parse(q.images||'[]') } catch(e) { q.images = [] } })
      c.followups = getAll('SELECT f.* FROM crm_followups f WHERE f.customer_id=? ORDER BY f.created_at DESC', [c.id])
      c.followups.forEach(f => { try { f.attachments = JSON.parse(f.attachments||'[]') } catch(e) { f.attachments = [] } })
      unData.customers.push(c)
    }
    exportData.users.push(unData)
  }
  res.json(exportData)
})

// ─── Export as HTML file ────────────────────────────────────────────────────────
router.get('/export/html', dualAuth, (req, res) => {
  if (req.crmUser && req.crmUser.role !== 'admin' && !req.user) {
    return res.status(403).json({ error: '需要管理员权限' })
  }
  // Reuse export/all logic to gather data
  const users = getAll('SELECT id,username,display_name FROM crm_users')
  const exportData = { exported_at: new Date().toISOString(), version: '1.0', users: [] }
  const gatherCustomers = (ownerId) => {
    const cond = ownerId ? 'c.owner_id=?' : 'c.owner_id IS NULL'
    const params = ownerId ? [ownerId] : []
    const customers = getAll(`SELECT c.* FROM crm_customers c WHERE ${cond} ORDER BY c.created_at DESC`, params)
    return customers.map(c => {
      try { c.tags = JSON.parse(c.tags||'[]') } catch(e) { c.tags = [] }
      c.inquiries = getAll('SELECT * FROM crm_inquiries WHERE customer_id=? ORDER BY inquiry_time DESC', [c.id])
      c.inquiries.forEach(i => { try { i.images = JSON.parse(i.images||'[]') } catch(e) { i.images = [] }; try { i.files = JSON.parse(i.files||'[]') } catch(e) { i.files = [] } })
      c.quotations = getAll('SELECT * FROM crm_quotations WHERE customer_id=? ORDER BY quotation_time DESC', [c.id])
      c.quotations.forEach(q => { try { q.ports = JSON.parse(q.ports||'[]') } catch(e) { q.ports = [] }; try { q.price_rows = JSON.parse(q.price_rows||'[]') } catch(e) { q.price_rows = [] }; try { q.files = JSON.parse(q.files||'[]') } catch(e) { q.files = [] }; try { q.images = JSON.parse(q.images||'[]') } catch(e) { q.images = [] } })
      c.followups = getAll('SELECT f.* FROM crm_followups f WHERE f.customer_id=? ORDER BY f.created_at DESC', [c.id])
      c.followups.forEach(f => { try { f.attachments = JSON.parse(f.attachments||'[]') } catch(e) { f.attachments = [] } })
      return c
    })
  }
  for (const u of users) {
    exportData.users.push({ user: u, customers: gatherCustomers(u.id) })
  }
  const unassigned = gatherCustomers(null)
  if (unassigned.length) exportData.users.push({ user: { id: null, username: 'unassigned', display_name: '未分配' }, customers: unassigned })

  const totalCustomers = exportData.users.reduce((s, u) => s + u.customers.length, 0)
  const totalInquiries = exportData.users.reduce((s, u) => s + u.customers.reduce((s2, c) => s2 + (c.inquiries?.length||0), 0), 0)
  const totalQuotations = exportData.users.reduce((s, u) => s + u.customers.reduce((s2, c) => s2 + (c.quotations?.length||0), 0), 0)
  const totalFollowups = exportData.users.reduce((s, u) => s + u.customers.reduce((s2, c) => s2 + (c.followups?.length||0), 0), 0)
  const jsonStr = JSON.stringify(exportData)

  const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>SunSea CRM 离线系统 - ${new Date().toLocaleDateString('zh-CN')}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;color:#334155;line-height:1.6;display:flex;min-height:100vh}
/* Sidebar */
.sidebar{width:220px;background:linear-gradient(180deg,#0f172a,#1e293b);color:#94a3b8;display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:100}
.sidebar .logo{padding:20px;color:#fff;font-size:18px;font-weight:800;border-bottom:1px solid #334155}
.nav-item{padding:12px 20px;cursor:pointer;font-size:14px;font-weight:500;transition:all .2s;border-left:3px solid transparent;display:flex;align-items:center;gap:10px}
.nav-item:hover{background:rgba(255,255,255,.05);color:#e2e8f0}
.nav-item.active{background:rgba(59,130,246,.15);color:#60a5fa;border-left-color:#3b82f6}
.nav-item .count{margin-left:auto;background:rgba(255,255,255,.1);padding:1px 8px;border-radius:10px;font-size:11px}
.sidebar-footer{margin-top:auto;padding:16px 20px;border-top:1px solid #334155;font-size:11px;color:#64748b}
/* Main */
.main{margin-left:220px;flex:1;padding:24px;min-height:100vh}
.page{display:none}.page.active{display:block}
/* Cards */
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px}
.stat-card{background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.stat-card .label{font-size:13px;color:#64748b;margin-bottom:4px}
.stat-card .value{font-size:28px;font-weight:800;color:#0f172a}
.stat-card .sub{font-size:12px;color:#94a3b8;margin-top:4px}
.stat-card.blue{border-left:4px solid #3b82f6}.stat-card.green{border-left:4px solid #16a34a}
.stat-card.amber{border-left:4px solid #f59e0b}.stat-card.purple{border-left:4px solid #8b5cf6}
/* Table */
.toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;align-items:center}
.toolbar input,.toolbar select{padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;outline:none;background:#fff}
.toolbar input:focus{border-color:#3b82f6}
.tbl-wrap{background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06);overflow-x:auto}
table{width:100%;border-collapse:collapse}
th{background:#f8fafc;padding:10px 12px;text-align:left;font-size:12px;color:#64748b;border-bottom:2px solid #e2e8f0;white-space:nowrap}
td{padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px}
tr:hover td{background:#f8fafc}
.tag{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;background:#dbeafe;color:#1e40af;margin:1px}
.st{padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600}
.s-dev{background:#fef3c7;color:#92400e}.s-con{background:#dbeafe;color:#1e40af}.s-cls{background:#dcfce7;color:#15803d}.s-pool{background:#f1f5f9;color:#64748b}
.link{color:#2563eb;cursor:pointer;font-weight:600;text-decoration:none}.link:hover{text-decoration:underline}
/* Page header */
.pg-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.pg-head h2{font-size:22px;font-weight:700}
.btn{padding:8px 18px;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;transition:all .2s}
.btn-g{background:#16a34a;color:#fff}.btn-g:hover{background:#15803d}
.btn-b{background:#3b82f6;color:#fff}.btn-b:hover{background:#2563eb}
.btn-o{background:#fff;border:1px solid #cbd5e1;color:#334155}.btn-o:hover{background:#f8fafc}
/* Detail panel */
.detail-page{display:none}.detail-page.active{display:block}
.back-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:#f1f5f9;border:none;border-radius:6px;cursor:pointer;font-size:13px;color:#475569;margin-bottom:16px}
.back-btn:hover{background:#e2e8f0}
.detail-header{display:flex;gap:20px;margin-bottom:24px;background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.detail-info{flex:1}
.detail-info h3{font-size:20px;font-weight:700;margin-bottom:8px}
.info-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;font-size:13px}
.info-grid .lbl{color:#64748b;font-weight:600}.info-grid .val{color:#0f172a}
.tabs{display:flex;gap:4px;margin-bottom:16px;border-bottom:2px solid #e2e8f0}
.tab-btn{padding:8px 18px;border:none;background:none;cursor:pointer;font-weight:600;color:#64748b;border-bottom:2px solid transparent;margin-bottom:-2px;transition:all .2s;font-size:14px}
.tab-btn.active{color:#2563eb;border-bottom-color:#2563eb}
.tab-panel{display:none}.tab-panel.active{display:block}
.record-card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:12px}
.record-card .rc-time{color:#64748b;font-size:12px;margin-bottom:6px}
.record-card .rc-note{font-size:13px;margin-bottom:8px}
.record-card .rc-html{background:#f8fafc;padding:10px;border-radius:6px;font-size:12px;margin-top:8px;overflow:auto;max-height:300px}
.price-tbl{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}
.price-tbl th,.price-tbl td{padding:6px 10px;border:1px solid #e2e8f0;text-align:left}
.price-tbl th{background:#f8fafc;font-weight:600}
.empty-msg{color:#94a3b8;font-style:italic;padding:20px;text-align:center}
.pagination{display:flex;justify-content:center;gap:8px;margin-top:16px}
.pagination button{padding:6px 14px;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;background:#fff;font-size:13px}
.pagination button:disabled{opacity:.4;cursor:not-allowed}
.pagination button.active{background:#2563eb;color:#fff;border-color:#2563eb}
.result-count{font-size:13px;color:#64748b;margin-left:auto}
/* Status distribution */
.status-dist{display:flex;gap:12px;margin-top:16px;flex-wrap:wrap}
.sd-item{padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s}
.sd-item:hover{transform:translateY(-2px);box-shadow:0 2px 8px rgba(0,0,0,.1)}
</style></head><body>
<div class="sidebar">
  <div class="logo">📊 SunSea CRM</div>
  <div class="nav-item active" onclick="showPage('dashboard')">📈 <span>数据概览</span></div>
  <div class="nav-item" onclick="showPage('customers')">👥 <span>客户管理</span><span class="count">${totalCustomers}</span></div>
  <div class="nav-item" onclick="showPage('inquiries')">📋 <span>询盘记录</span><span class="count">${totalInquiries}</span></div>
  <div class="nav-item" onclick="showPage('quotations')">💰 <span>报价记录</span><span class="count">${totalQuotations}</span></div>
  <div class="sidebar-footer">
    导出时间: ${new Date().toLocaleString('zh-CN')}<br/>
    离线版 v1.0 — 仅供浏览
  </div>
</div>
<div class="main">
  <!-- Dashboard -->
  <div class="page active" id="page-dashboard">
    <div class="pg-head"><h2>📈 数据概览</h2>
      <div style="display:flex;gap:8px">
        <button class="btn btn-g" onclick="downloadJSON()">💾 下载JSON (可导入)</button>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-card blue"><div class="label">客户总数</div><div class="value">${totalCustomers}</div><div class="sub">所有客户</div></div>
      <div class="stat-card green"><div class="label">询盘总数</div><div class="value">${totalInquiries}</div><div class="sub">全部询盘记录</div></div>
      <div class="stat-card amber"><div class="label">报价总数</div><div class="value">${totalQuotations}</div><div class="sub">全部报价记录</div></div>
      <div class="stat-card purple"><div class="label">跟进总数</div><div class="value">${totalFollowups}</div><div class="sub">全部跟进记录</div></div>
    </div>
    <div class="stats-grid">
      <div class="stat-card" id="statusDist"></div>
      <div class="stat-card" id="countryDist"></div>
      <div class="stat-card" id="ownerDist"></div>
    </div>
  </div>

  <!-- Customers -->
  <div class="page" id="page-customers">
    <div class="pg-head"><h2>👥 客户管理</h2></div>
    <div class="toolbar">
      <input id="searchBox" placeholder="🔍 搜索客户名/公司/邮箱/电话..." oninput="filterCustomers()" style="width:260px"/>
      <select id="statusFilter" onchange="filterCustomers()"><option value="">全部状态</option><option>开发中</option><option>联系中</option><option>已成交</option><option>公海池</option></select>
      <select id="countryFilter" onchange="filterCustomers()"><option value="">全部国家</option></select>
      <select id="ownerFilter" onchange="filterCustomers()"><option value="">全部负责人</option></select>
      <span class="result-count" id="resultCount"></span>
    </div>
    <div class="tbl-wrap"><table><thead><tr>
      <th>姓名</th><th>公司</th><th>邮箱</th><th>电话/WhatsApp</th><th>国家</th><th>状态</th><th>询盘</th><th>报价</th><th>跟进</th><th>负责人</th><th>创建时间</th>
    </tr></thead><tbody id="custBody"></tbody></table></div>
    <div class="pagination" id="custPagination"></div>
  </div>

  <!-- Customer Detail -->
  <div class="detail-page" id="page-detail"></div>

  <!-- Inquiries -->
  <div class="page" id="page-inquiries">
    <div class="pg-head"><h2>📋 全部询盘记录</h2></div>
    <div class="toolbar">
      <input id="inqSearch" placeholder="🔍 搜索..." oninput="filterInquiries()" style="width:260px"/>
      <span class="result-count" id="inqCount"></span>
    </div>
    <div id="inqList"></div>
  </div>

  <!-- Quotations -->
  <div class="page" id="page-quotations">
    <div class="pg-head"><h2>💰 全部报价记录</h2></div>
    <div class="toolbar">
      <input id="quotSearch" placeholder="🔍 搜索..." oninput="filterQuotations()" style="width:260px"/>
      <span class="result-count" id="quotCount"></span>
    </div>
    <div id="quotList"></div>
  </div>
</div>

<script id="crmData" type="application/json">${jsonStr.replace(/<\//g,'<\\/')}</script>
<script>
const DATA=JSON.parse(document.getElementById('crmData').textContent);
const AC=[];DATA.users.forEach(u=>u.customers.forEach(c=>{c._owner=u.user.display_name;AC.push(c)}));
const allInq=[],allQuot=[];
AC.forEach(c=>{(c.inquiries||[]).forEach(i=>{i._cust=c;allInq.push(i)});(c.quotations||[]).forEach(q=>{q._cust=c;allQuot.push(q)})});
// Populate filters
const countries=[...new Set(AC.map(c=>c.country).filter(Boolean))].sort();
const owners=[...new Set(AC.map(c=>c._owner).filter(Boolean))].sort();
const cf=document.getElementById('countryFilter');countries.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;cf.appendChild(o)});
const of2=document.getElementById('ownerFilter');owners.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;of2.appendChild(o)});

function sc(s){if(s==='开发中')return's-dev';if(s==='联系中')return's-con';if(s==='已成交')return's-cls';if(s==='公海池')return's-pool';return''}
function showPage(p){document.querySelectorAll('.page,.detail-page').forEach(e=>e.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active'));
  const el=document.getElementById('page-'+p);if(el)el.classList.add('active');
  document.querySelectorAll('.nav-item').forEach((e,i)=>{if((['dashboard','customers','inquiries','quotations'])[i]===p)e.classList.add('active')});
  if(p==='customers')filterCustomers();if(p==='inquiries')filterInquiries();if(p==='quotations')filterQuotations()}

// Dashboard
function initDashboard(){
  const sCounts={};AC.forEach(c=>{sCounts[c.status||'未知']=(sCounts[c.status||'未知']||0)+1});
  let sh='<div class="label">状态分布</div><div class="status-dist">';
  for(const[s,n]of Object.entries(sCounts))sh+='<div class="sd-item '+sc(s)+'" onclick="filterByStatus(\\''+s+'\\')">'+s+': '+n+'</div>';
  sh+='</div>';document.getElementById('statusDist').innerHTML=sh;
  const cCounts={};AC.forEach(c=>{if(c.country)cCounts[c.country]=(cCounts[c.country]||0)+1});
  const topC=Object.entries(cCounts).sort((a,b)=>b[1]-a[1]).slice(0,10);
  let ch='<div class="label">Top 国家</div><div style="margin-top:8px">';
  topC.forEach(([c,n])=>ch+='<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13px"><span>'+c+'</span><strong>'+n+'</strong></div>');
  ch+='</div>';document.getElementById('countryDist').innerHTML=ch;
  const oCounts={};AC.forEach(c=>{oCounts[c._owner||'未分配']=(oCounts[c._owner||'未分配']||0)+1});
  let oh='<div class="label">负责人分布</div><div style="margin-top:8px">';
  for(const[o,n]of Object.entries(oCounts))oh+='<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13px"><span>'+o+'</span><strong>'+n+'</strong></div>';
  oh+='</div>';document.getElementById('ownerDist').innerHTML=oh;
}
function filterByStatus(s){document.getElementById('statusFilter').value=s;showPage('customers')}

// Customer list
let custPage=1;const PER=30;
function filterCustomers(){
  const q=document.getElementById('searchBox').value.toLowerCase();
  const s=document.getElementById('statusFilter').value;
  const co=document.getElementById('countryFilter').value;
  const ow=document.getElementById('ownerFilter').value;
  const list=AC.filter(c=>{if(s&&c.status!==s)return false;if(co&&c.country!==co)return false;if(ow&&c._owner!==ow)return false;
    if(q){const t=[c.name,c.first_name,c.last_name,c.company,c.email,c.phone,c.whatsapp,c.note].join(' ').toLowerCase();if(!t.includes(q))return false}return true});
  custPage=1;renderCustPage(list)}
function renderCustPage(list){
  const total=list.length;const pages=Math.max(1,Math.ceil(total/PER));if(custPage>pages)custPage=pages;
  const start=(custPage-1)*PER;const slice=list.slice(start,start+PER);
  let h='';slice.forEach(c=>{const tags=(Array.isArray(c.tags)?c.tags:[]).map(t=>'<span class="tag">'+t+'</span>').join('');
    h+='<tr><td><a class="link" onclick="showCustomer('+c.id+')">'+((c.first_name||c.name)||'')+(c.last_name?' '+c.last_name:'')+'</a></td>';
    h+='<td>'+(c.company||'-')+'</td><td>'+(c.email||'-')+'</td><td>'+(c.phone||c.whatsapp||'-')+'</td>';
    h+='<td>'+(c.country||'-')+'</td><td><span class="st '+sc(c.status)+'">'+(c.status||'-')+'</span></td>';
    h+='<td style="text-align:center">'+(c.inquiries?.length||0)+'</td><td style="text-align:center">'+(c.quotations?.length||0)+'</td>';
    h+='<td style="text-align:center">'+(c.followups?.length||0)+'</td><td>'+(c._owner||'-')+'</td>';
    h+='<td style="white-space:nowrap">'+(c.created_at||'').slice(0,10)+'</td></tr>'});
  document.getElementById('custBody').innerHTML=h||'<tr><td colspan="11" class="empty-msg">无匹配客户</td></tr>';
  document.getElementById('resultCount').textContent='显示 '+slice.length+' / '+total+' 位客户';
  // Pagination
  let pg='';if(pages>1){pg+='<button '+(custPage<=1?'disabled':'')+' onclick="custPage--;renderCustPage(window._custList)">‹ 上一页</button>';
    for(let i=1;i<=Math.min(pages,10);i++)pg+='<button class="'+(i===custPage?'active':'')+'" onclick="custPage='+i+';renderCustPage(window._custList)">'+i+'</button>';
    if(pages>10)pg+='<span>... / '+pages+'</span>';
    pg+='<button '+(custPage>=pages?'disabled':'')+' onclick="custPage++;renderCustPage(window._custList)">下一页 ›</button>'}
  document.getElementById('custPagination').innerHTML=pg;
  window._custList=list}

function showCustomer(id){
  const c=AC.find(x=>x.id===id);if(!c)return;
  document.querySelectorAll('.page,.detail-page').forEach(e=>e.classList.remove('active'));
  const dp=document.getElementById('page-detail');dp.classList.add('active');
  let h='<button class="back-btn" onclick="showPage(\\'customers\\')">← 返回客户列表</button>';
  h+='<div class="detail-header"><div class="detail-info"><h3>'+((c.first_name||c.name)||'未命名')+(c.last_name?' '+c.last_name:'')+'</h3>';
  h+='<div class="info-grid">';
  h+='<div><span class="lbl">公司:</span> <span class="val">'+(c.company||'-')+'</span></div>';
  h+='<div><span class="lbl">国家:</span> <span class="val">'+(c.country||'-')+'</span></div>';
  h+='<div><span class="lbl">邮箱:</span> <span class="val">'+(c.email||'-')+'</span></div>';
  h+='<div><span class="lbl">电话:</span> <span class="val">'+(c.phone||'-')+'</span></div>';
  h+='<div><span class="lbl">WhatsApp:</span> <span class="val">'+(c.whatsapp||'-')+'</span></div>';
  h+='<div><span class="lbl">WeChat:</span> <span class="val">'+(c.wechat||'-')+'</span></div>';
  h+='<div><span class="lbl">状态:</span> <span class="st '+sc(c.status)+'">'+(c.status||'-')+'</span></div>';
  h+='<div><span class="lbl">负责人:</span> <span class="val">'+(c._owner||'-')+'</span></div>';
  h+='</div>';
  if(c.note)h+='<div style="margin-top:12px;padding:10px;background:#f8fafc;border-radius:6px;font-size:13px"><b>备注:</b> '+c.note+'</div>';
  h+='</div></div>';
  // Tabs
  h+='<div class="tabs"><button class="tab-btn active" onclick="switchTab(this,\\'tinq\\')">📋 询盘 ('+((c.inquiries||[]).length)+')</button>';
  h+='<button class="tab-btn" onclick="switchTab(this,\\'tquot\\')">💰 报价 ('+((c.quotations||[]).length)+')</button>';
  h+='<button class="tab-btn" onclick="switchTab(this,\\'tfu\\')">📝 跟进 ('+((c.followups||[]).length)+')</button></div>';
  // Inquiries tab
  h+='<div class="tab-panel active" id="tinq">';
  if((c.inquiries||[]).length){c.inquiries.forEach(i=>{h+='<div class="record-card"><div class="rc-time">📅 '+(i.inquiry_time||'-')+'</div>';
    if(i.note)h+='<div class="rc-note">'+i.note+'</div>';
    if(i.content_html)h+='<div class="rc-html">'+i.content_html+'</div>';
    if(i.images?.length)h+='<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">'+i.images.map(img=>'<img src="'+img+'" style="max-height:100px;border-radius:4px">').join('')+'</div>';
    h+='</div>'})}else h+='<p class="empty-msg">暂无询盘记录</p>';
  h+='</div>';
  // Quotations tab
  h+='<div class="tab-panel" id="tquot">';
  if((c.quotations||[]).length){c.quotations.forEach(q=>{h+='<div class="record-card"><div class="rc-time">📅 '+(q.quotation_time||'-')+'</div>';
    if(q.note)h+='<div class="rc-note">'+q.note+'</div>';
    if(q.freight_type)h+='<div style="font-size:12px;color:#64748b">运输方式: '+(q.freight_type||'-')+'</div>';
    if(q.ports?.length)h+='<div style="font-size:12px;color:#64748b">港口: '+q.ports.join(', ')+'</div>';
    if(q.price_rows?.length){h+='<table class="price-tbl"><thead><tr><th>品名</th><th>规格</th><th>数量</th><th>单价</th><th>总价</th></tr></thead><tbody>';
      q.price_rows.forEach(r=>h+='<tr><td>'+(r.product||r.name||'-')+'</td><td>'+(r.spec||r.specification||'-')+'</td><td>'+(r.qty||r.quantity||'-')+'</td><td>'+(r.price||r.unit_price||'-')+'</td><td>'+(r.total||r.amount||'-')+'</td></tr>');
      h+='</tbody></table>'}
    if(q.content_html)h+='<div class="rc-html">'+q.content_html+'</div>';
    h+='</div>'})}else h+='<p class="empty-msg">暂无报价记录</p>';
  h+='</div>';
  // Followups tab
  h+='<div class="tab-panel" id="tfu">';
  if((c.followups||[]).length){c.followups.forEach(f=>{h+='<div class="record-card"><div class="rc-time">📅 '+(f.created_at||'-')+'</div>';
    if(f.note)h+='<div class="rc-note">'+f.note+'</div>';
    if(f.content_html)h+='<div class="rc-html">'+f.content_html+'</div>';
    h+='</div>'})}else h+='<p class="empty-msg">暂无跟进记录</p>';
  h+='</div>';
  dp.innerHTML=h}
function switchTab(btn,id){btn.closest('.tabs').querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
  const panels=btn.closest('.tabs').parentElement.querySelectorAll('.tab-panel');panels.forEach(p=>p.classList.remove('active'));
  document.getElementById(id).classList.add('active')}

// All Inquiries
function filterInquiries(){const q=(document.getElementById('inqSearch')?.value||'').toLowerCase();
  const list=q?allInq.filter(i=>[i.note,i.content_html,i._cust?.name,i._cust?.company,i._cust?.email].join(' ').toLowerCase().includes(q)):allInq;
  let h='';list.slice(0,100).forEach(i=>{h+='<div class="record-card"><div style="display:flex;justify-content:space-between"><div class="rc-time">📅 '+(i.inquiry_time||'-')+'</div>';
    h+='<a class="link" onclick="showCustomer('+i._cust?.id+')" style="font-size:12px">'+(i._cust?.name||'-')+' - '+(i._cust?.company||'')+'</a></div>';
    if(i.note)h+='<div class="rc-note">'+i.note+'</div>';
    if(i.content_html)h+='<div class="rc-html">'+i.content_html+'</div>';h+='</div>'});
  document.getElementById('inqList').innerHTML=h||'<p class="empty-msg">无匹配询盘</p>';
  document.getElementById('inqCount').textContent='显示 '+Math.min(list.length,100)+' / '+list.length+' 条询盘'}

// All Quotations
function filterQuotations(){const q=(document.getElementById('quotSearch')?.value||'').toLowerCase();
  const list=q?allQuot.filter(i=>[i.note,i.content_html,i._cust?.name,i._cust?.company].join(' ').toLowerCase().includes(q)):allQuot;
  let h='';list.slice(0,100).forEach(qt=>{h+='<div class="record-card"><div style="display:flex;justify-content:space-between"><div class="rc-time">📅 '+(qt.quotation_time||'-')+'</div>';
    h+='<a class="link" onclick="showCustomer('+qt._cust?.id+')" style="font-size:12px">'+(qt._cust?.name||'-')+' - '+(qt._cust?.company||'')+'</a></div>';
    if(qt.note)h+='<div class="rc-note">'+qt.note+'</div>';
    if(qt.price_rows?.length){h+='<table class="price-tbl"><thead><tr><th>品名</th><th>规格</th><th>数量</th><th>单价</th><th>总价</th></tr></thead><tbody>';
      qt.price_rows.forEach(r=>h+='<tr><td>'+(r.product||r.name||'-')+'</td><td>'+(r.spec||r.specification||'-')+'</td><td>'+(r.qty||r.quantity||'-')+'</td><td>'+(r.price||r.unit_price||'-')+'</td><td>'+(r.total||r.amount||'-')+'</td></tr>');
      h+='</tbody></table>'}
    if(qt.content_html)h+='<div class="rc-html">'+qt.content_html+'</div>';h+='</div>'});
  document.getElementById('quotList').innerHTML=h||'<p class="empty-msg">无匹配报价</p>';
  document.getElementById('quotCount').textContent='显示 '+Math.min(list.length,100)+' / '+list.length+' 条报价'}

function downloadJSON(){const b=new Blob([JSON.stringify(DATA,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='crm_export_'+new Date().toISOString().slice(0,10)+'.json';a.click()}
initDashboard();
</script></body></html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="CRM_Export_${new Date().toISOString().slice(0,10)}.html"`)
  res.send(html)
})

// ─── Import customers with merge ────────────────────────────────────────────────
router.post('/import', dualAuth, (req, res) => {
  if (req.crmUser && req.crmUser.role !== 'admin' && !req.user) {
    return res.status(403).json({ error: '需要管理员权限' })
  }
  const data = req.body
  if (!data?.users || !Array.isArray(data.users)) {
    return res.status(400).json({ error: '无效的导入数据格式' })
  }

  let created = 0, updated = 0, skipped = 0
  let inqCreated = 0, quotCreated = 0, fuCreated = 0
  const now = new Date().toISOString()

  for (const userData of data.users) {
    const customers = userData.customers || []
    for (const c of customers) {
      // Match by email (primary key for dedup)
      let existing = null
      if (c.email) {
        existing = getOne('SELECT * FROM crm_customers WHERE email=?', [c.email])
      }
      // Also try matching by name + company if no email match
      if (!existing && c.name && c.company) {
        existing = getOne('SELECT * FROM crm_customers WHERE name=? AND company=?', [c.name, c.company])
      }

      let customerId
      if (existing) {
        // Merge: keep the most recent data
        const existingDate = existing.last_activity_at || existing.created_at || ''
        const importDate = c.last_activity_at || c.created_at || ''
        if (importDate > existingDate) {
          // Import data is newer — update fields
          run(`UPDATE crm_customers SET first_name=?,last_name=?,name=?,country=?,phone=?,email=?,whatsapp=?,wechat=?,company=?,status=?,tags=?,note=?,last_activity_at=? WHERE id=?`,
            [c.first_name||existing.first_name, c.last_name||existing.last_name, c.name||existing.name,
             c.country||existing.country, c.phone||existing.phone, c.email||existing.email,
             c.whatsapp||existing.whatsapp, c.wechat||existing.wechat, c.company||existing.company,
             c.status||existing.status, JSON.stringify(c.tags||[]),
             c.note || existing.note, importDate || now, existing.id])
          updated++
        } else {
          skipped++
        }
        customerId = existing.id
      } else {
        // Create new customer
        const ownerId = req.crmUser?.id || null
        const result = run(
          `INSERT INTO crm_customers (owner_id,first_name,last_name,name,country,phone,email,whatsapp,wechat,company,status,tags,note,last_activity_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [ownerId, c.first_name||'', c.last_name||'', c.name||'未命名', c.country||'', c.phone||'', c.email||'',
           c.whatsapp||'', c.wechat||'', c.company||'', c.status||'开发中', JSON.stringify(c.tags||[]),
           c.note||'', c.last_activity_at||now, c.created_at||now])
        customerId = result.lastInsertRowid
        created++
      }

      // Import related records (avoid duplicates by checking unique content)
      if (c.inquiries?.length) {
        for (const inq of c.inquiries) {
          const dup = getOne('SELECT id FROM crm_inquiries WHERE customer_id=? AND inquiry_time=? AND note=?',
            [customerId, inq.inquiry_time||'', inq.note||''])
          if (!dup) {
            run(`INSERT INTO crm_inquiries (customer_id,content_html,note,images,files,inquiry_time,created_at) VALUES (?,?,?,?,?,?,?)`,
              [customerId, inq.content_html||'', inq.note||'', JSON.stringify(inq.images||[]), JSON.stringify(inq.files||[]), inq.inquiry_time||now, inq.created_at||now])
            inqCreated++
          }
        }
      }
      if (c.quotations?.length) {
        for (const q of c.quotations) {
          const dup = getOne('SELECT id FROM crm_quotations WHERE customer_id=? AND quotation_time=? AND note=?',
            [customerId, q.quotation_time||'', q.note||''])
          if (!dup) {
            run(`INSERT INTO crm_quotations (customer_id,content_html,note,freight_type,ports,price_rows,files,images,quotation_time,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
              [customerId, q.content_html||'', q.note||'', q.freight_type||'container', JSON.stringify(q.ports||[]),
               JSON.stringify(q.price_rows||[]), JSON.stringify(q.files||[]), JSON.stringify(q.images||[]), q.quotation_time||now, q.created_at||now])
            quotCreated++
          }
        }
      }
      if (c.followups?.length) {
        for (const f of c.followups) {
          const dup = getOne('SELECT id FROM crm_followups WHERE customer_id=? AND created_at=?',
            [customerId, f.created_at||''])
          if (!dup) {
            run(`INSERT INTO crm_followups (customer_id,user_id,content_html,note,images,attachments,created_at) VALUES (?,?,?,?,?,?,?)`,
              [customerId, null, f.content_html||'', f.note||'', JSON.stringify(f.images||[]), JSON.stringify(f.attachments||[]), f.created_at||now])
            fuCreated++
          }
        }
      }
    }
  }

  res.json({
    message: `导入完成: 新增 ${created}, 更新 ${updated}, 跳过 ${skipped} 位客户，新增 ${inqCreated} 条询盘、${quotCreated} 条报价、${fuCreated} 条跟进`,
    created, updated, skipped, inquiries: inqCreated, quotations: quotCreated, followups: fuCreated
  })
})

// ─── Email send records (merged from both tables) ───────────────────────────
router.get('/email/records', dualAuth, (req, res) => {
  const isAdmin = req.user || (req.crmUser?.role === 'admin')
  const userId = req.crmUser?.id ? String(req.crmUser.id) : ''
  // Get records from mail_logs (mailer tasks) joined with mail_tasks for task_name
  const mailerLogs = isAdmin
    ? getAll(`SELECT ml.id, ml.contact_email as recipient_email, ml.subject, ml.status, 
    ml.sent_at, 
    CASE 
      WHEN ml.task_id = 0 AND ml.subject LIKE 'Re:%' THEN '快速跟进'
      WHEN ml.task_id = 0 THEN '快速发送'
      ELSE COALESCE(mt.name,'邮件任务')
    END as task_name
    FROM mail_logs ml LEFT JOIN mail_tasks mt ON ml.task_id=mt.id ORDER BY ml.id DESC LIMIT 200`)
    : getAll(`SELECT ml.id, ml.contact_email as recipient_email, ml.subject, ml.status, 
    ml.sent_at, 
    CASE 
      WHEN ml.task_id = 0 AND ml.subject LIKE 'Re:%' THEN '快速跟进'
      WHEN ml.task_id = 0 THEN '快速发送'
      ELSE COALESCE(mt.name,'邮件任务')
    END as task_name
    FROM mail_logs ml LEFT JOIN mail_tasks mt ON ml.task_id=mt.id WHERE ml.created_by=? ORDER BY ml.id DESC LIMIT 200`, [userId])
  // Get records from crm_email_logs (quick-send / quick-followup)
  const crmLogs = isAdmin
    ? getAll(`SELECT id, recipient_email, subject, status, sent_at,
    CASE WHEN subject LIKE 'Re:%' THEN '快速跟进' ELSE '快速发送' END as task_name
    FROM crm_email_logs ORDER BY sent_at DESC LIMIT 200`)
    : getAll(`SELECT id, recipient_email, subject, status, sent_at,
    CASE WHEN subject LIKE 'Re:%' THEN '快速跟进' ELSE '快速发送' END as task_name
    FROM crm_email_logs WHERE sent_by=? ORDER BY sent_at DESC LIMIT 200`, [req.crmUser?.id || null])
  // Merge and sort by sent_at desc
  const merged = [...mailerLogs, ...crmLogs].sort((a, b) => (b.sent_at||'').localeCompare(a.sent_at||'')).slice(0, 200)
  res.json(merged)
})

router.post('/email/records/bulk-delete', dualAuth, (req, res) => {
  const { ids } = req.body
  if (!ids?.length) return res.status(400).json({ error: '无选中项' })
  const placeholders = ids.map(() => '?').join(',')
  // Delete from both tables since records are merged from mail_logs and crm_email_logs
  run(`DELETE FROM mail_logs WHERE id IN (${placeholders})`, ids)
  run(`DELETE FROM crm_email_logs WHERE id IN (${placeholders})`, ids)
  res.json({ message: `已删除 ${ids.length} 条记录` })
})

// ─── Export as ZIP (full offline CRM) ─────────────────────────────────────────
router.get('/export/zip', dualAuth, (req, res) => {
  if (req.crmUser && req.crmUser.role !== 'admin' && !req.user) {
    return res.status(403).json({ error: '需要管理员权限' })
  }
  try {
    // Gather all CRM data
    const users = getAll('SELECT id,username,display_name FROM crm_users')
    const exportData = { exported_at: new Date().toISOString(), version: '2.0', users: [] }
    const imageFiles = new Set()
    const gatherCustomers = (ownerId) => {
      const cond = ownerId ? 'c.owner_id=?' : 'c.owner_id IS NULL'
      const params = ownerId ? [ownerId] : []
      const customers = getAll(`SELECT c.* FROM crm_customers c WHERE ${cond} ORDER BY c.created_at DESC`, params)
      return customers.map(c => {
        try { c.tags = JSON.parse(c.tags||'[]') } catch(e) { c.tags = [] }
        c.inquiries = getAll('SELECT * FROM crm_inquiries WHERE customer_id=? ORDER BY inquiry_time DESC', [c.id])
        c.inquiries.forEach(i => {
          try { i.images = JSON.parse(i.images||'[]') } catch(e) { i.images = [] }
          try { i.files = JSON.parse(i.files||'[]') } catch(e) { i.files = [] }
          i.images.forEach(p => { if (p) imageFiles.add(p) })
          i.files.forEach(p => { if (p) imageFiles.add(p) })
        })
        c.quotations = getAll('SELECT * FROM crm_quotations WHERE customer_id=? ORDER BY quotation_time DESC', [c.id])
        c.quotations.forEach(q => {
          try { q.ports = JSON.parse(q.ports||'[]') } catch(e) { q.ports = [] }
          try { q.price_rows = JSON.parse(q.price_rows||'[]') } catch(e) { q.price_rows = [] }
          try { q.files = JSON.parse(q.files||'[]') } catch(e) { q.files = [] }
          try { q.images = JSON.parse(q.images||'[]') } catch(e) { q.images = [] }
          q.images.forEach(p => { if (p) imageFiles.add(p) })
          q.files.forEach(p => { if (p) imageFiles.add(p) })
        })
        c.followups = getAll('SELECT f.* FROM crm_followups f WHERE f.customer_id=? ORDER BY f.created_at DESC', [c.id])
        c.followups.forEach(f => {
          try { f.attachments = JSON.parse(f.attachments||'[]') } catch(e) { f.attachments = [] }
          f.attachments.forEach(p => { if (p) imageFiles.add(p) })
        })
        return c
      })
    }
    for (const u of users) {
      exportData.users.push({ user: u, customers: gatherCustomers(u.id) })
    }
    const unassigned = gatherCustomers(null)
    if (unassigned.length) exportData.users.push({ user: { id: null, username: 'unassigned', display_name: '未分配' }, customers: unassigned })

    const totalC = exportData.users.reduce((s, u) => s + u.customers.length, 0)
    const totalI = exportData.users.reduce((s, u) => s + u.customers.reduce((s2, c) => s2 + (c.inquiries?.length||0), 0), 0)
    const totalQ = exportData.users.reduce((s, u) => s + u.customers.reduce((s2, c) => s2 + (c.quotations?.length||0), 0), 0)
    const totalF = exportData.users.reduce((s, u) => s + u.customers.reduce((s2, c) => s2 + (c.followups?.length||0), 0), 0)

    // Build the offline CRM SPA HTML
    const spaHtml = buildOfflineCrmHtml(totalC, totalI, totalQ, totalF)

    // Create ZIP
    const archive = archiver('zip', { zlib: { level: 9 } })
    archive.on('error', (err) => {
      console.error('Archive error:', err)
      if (!res.headersSent) res.status(500).json({ error: 'ZIP创建失败: ' + err.message })
    })
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="CRM_Offline_${new Date().toISOString().slice(0,10)}.zip"`)
    archive.pipe(res)
    archive.append(spaHtml, { name: 'index.html' })
    archive.append(JSON.stringify(exportData, null, 2), { name: 'data.json' })
    // Add referenced images/files
    for (const filePath of imageFiles) {
      const clean = filePath.replace(/^\//, '')
      const absPath = join(UPLOADS_DIR, '..', clean)
      if (existsSync(absPath)) {
        archive.file(absPath, { name: clean })
      }
    }
    archive.finalize()
  } catch (e) {
    console.error('ZIP export error:', e)
    if (!res.headersSent) res.status(500).json({ error: '导出失败: ' + e.message })
  }
})

// ─── Import from ZIP ──────────────────────────────────────────────────────────
router.post('/import/zip', dualAuth, (req, res) => {
  if (req.crmUser && req.crmUser.role !== 'admin' && !req.user) {
    return res.status(403).json({ error: '需要管理员权限' })
  }
  try {
    const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body)
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries()
    const dataEntry = entries.find(e => e.entryName === 'data.json' || e.entryName.endsWith('/data.json'))
    if (!dataEntry) return res.status(400).json({ error: 'ZIP中未找到data.json' })
    const data = JSON.parse(dataEntry.getData().toString('utf8'))
    if (!data?.users || !Array.isArray(data.users)) {
      return res.status(400).json({ error: '无效的数据格式' })
    }
    let filesCopied = 0
    for (const entry of entries) {
      if (entry.isDirectory) continue
      if (entry.entryName === 'data.json' || entry.entryName === 'index.html') continue
      const targetPath = join(UPLOADS_DIR, '..', entry.entryName)
      const targetDir = join(targetPath, '..')
      if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true })
      writeFileSync(targetPath, entry.getData())
      filesCopied++
    }
    let created = 0, updated = 0, skipped = 0
    let inqCreated = 0, quotCreated = 0, fuCreated = 0
    const now = new Date().toISOString()
    for (const userData of data.users) {
      const customers = userData.customers || []
      for (const c of customers) {
        let existing = null
        if (c.email) existing = getOne('SELECT * FROM crm_customers WHERE email=?', [c.email])
        if (!existing && c.name && c.company) existing = getOne('SELECT * FROM crm_customers WHERE name=? AND company=?', [c.name, c.company])
        let customerId
        if (existing) {
          const existingDate = existing.last_activity_at || existing.created_at || ''
          const importDate = c.last_activity_at || c.created_at || ''
          if (importDate > existingDate) {
            run(`UPDATE crm_customers SET first_name=?,last_name=?,name=?,country=?,phone=?,email=?,whatsapp=?,wechat=?,company=?,status=?,tags=?,note=?,last_activity_at=? WHERE id=?`,
              [c.first_name||existing.first_name, c.last_name||existing.last_name, c.name||existing.name,
               c.country||existing.country, c.phone||existing.phone, c.email||existing.email,
               c.whatsapp||existing.whatsapp, c.wechat||existing.wechat, c.company||existing.company,
               c.status||existing.status, JSON.stringify(c.tags||[]),
               c.note || existing.note, importDate || now, existing.id])
            updated++
          } else { skipped++ }
          customerId = existing.id
        } else {
          const ownerId = req.crmUser?.id || null
          const result = run(
            `INSERT INTO crm_customers (owner_id,first_name,last_name,name,country,phone,email,whatsapp,wechat,company,status,tags,note,last_activity_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [ownerId, c.first_name||'', c.last_name||'', c.name||'未命名', c.country||'', c.phone||'', c.email||'',
             c.whatsapp||'', c.wechat||'', c.company||'', c.status||'开发中', JSON.stringify(c.tags||[]),
             c.note||'', c.last_activity_at||now, c.created_at||now])
          customerId = result.lastInsertRowid
          created++
        }
        if (c.inquiries?.length) {
          for (const inq of c.inquiries) {
            const dup = getOne('SELECT id FROM crm_inquiries WHERE customer_id=? AND inquiry_time=? AND note=?', [customerId, inq.inquiry_time||'', inq.note||''])
            if (!dup) { run(`INSERT INTO crm_inquiries (customer_id,content_html,note,images,files,inquiry_time,created_at) VALUES (?,?,?,?,?,?,?)`, [customerId, inq.content_html||'', inq.note||'', JSON.stringify(inq.images||[]), JSON.stringify(inq.files||[]), inq.inquiry_time||now, inq.created_at||now]); inqCreated++ }
          }
        }
        if (c.quotations?.length) {
          for (const q of c.quotations) {
            const dup = getOne('SELECT id FROM crm_quotations WHERE customer_id=? AND quotation_time=? AND note=?', [customerId, q.quotation_time||'', q.note||''])
            if (!dup) { run(`INSERT INTO crm_quotations (customer_id,content_html,note,ports,price_rows,freight_type,images,files,quotation_time,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`, [customerId, q.content_html||'', q.note||'', JSON.stringify(q.ports||[]), JSON.stringify(q.price_rows||[]), q.freight_type||'', JSON.stringify(q.images||[]), JSON.stringify(q.files||[]), q.quotation_time||now, q.created_at||now]); quotCreated++ }
          }
        }
        if (c.followups?.length) {
          for (const f of c.followups) {
            const dup = getOne('SELECT id FROM crm_followups WHERE customer_id=? AND created_at=?', [customerId, f.created_at||''])
            if (!dup) { run(`INSERT INTO crm_followups (customer_id,content_html,note,attachments,created_at) VALUES (?,?,?,?,?)`, [customerId, f.content_html||'', f.note||'', JSON.stringify(f.attachments||[]), f.created_at||now]); fuCreated++ }
          }
        }
      }
    }
    res.json({ message: `导入完成：新增${created}，更新${updated}，跳过${skipped}客户；新增询盘${inqCreated}，报价${quotCreated}，跟进${fuCreated}；复制文件${filesCopied}个` })
  } catch (e) {
    console.error('ZIP import error:', e)
    res.status(500).json({ error: '导入失败: ' + e.message })
  }
})

// ─── Build offline CRM HTML SPA ──────────────────────────────────────────────
function buildOfflineCrmHtml(totalC, totalI, totalQ, totalF) {
  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>SunSea CRM 离线系统</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;color:#334155;line-height:1.6;display:flex;min-height:100vh}
.sidebar{width:220px;background:linear-gradient(180deg,#0f172a,#1e293b);color:#94a3b8;display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:100}
.sidebar .logo{padding:20px;color:#fff;font-size:18px;font-weight:800;border-bottom:1px solid #334155}
.nav-item{padding:12px 20px;cursor:pointer;font-size:14px;font-weight:500;transition:all .2s;border-left:3px solid transparent;display:flex;align-items:center;gap:10px}
.nav-item:hover{background:rgba(255,255,255,.05);color:#e2e8f0}
.nav-item.active{background:rgba(59,130,246,.15);color:#60a5fa;border-left-color:#3b82f6}
.nav-item .count{margin-left:auto;background:rgba(255,255,255,.1);padding:1px 8px;border-radius:10px;font-size:11px}
.sidebar-footer{margin-top:auto;padding:16px 20px;border-top:1px solid #334155;font-size:11px;color:#64748b}
.main{margin-left:220px;flex:1;padding:24px;min-height:100vh}
.page{display:none}.page.active{display:block}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px}
.stat-card{background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.stat-card .label{font-size:13px;color:#64748b;margin-bottom:4px}
.stat-card .value{font-size:28px;font-weight:800;color:#0f172a}
.stat-card .sub{font-size:12px;color:#94a3b8;margin-top:4px}
.stat-card.blue{border-left:4px solid #3b82f6}.stat-card.green{border-left:4px solid #16a34a}
.stat-card.amber{border-left:4px solid #f59e0b}.stat-card.purple{border-left:4px solid #8b5cf6}
.toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;align-items:center}
.toolbar input,.toolbar select{padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;outline:none;background:#fff}
.toolbar input:focus{border-color:#3b82f6}
.tbl-wrap{background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06);overflow-x:auto}
table{width:100%;border-collapse:collapse}
th{background:#f8fafc;padding:10px 12px;text-align:left;font-size:12px;color:#64748b;border-bottom:2px solid #e2e8f0;white-space:nowrap}
td{padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px}
tr:hover td{background:#f8fafc}
.tag{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;background:#dbeafe;color:#1e40af;margin:1px}
.st{padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600}
.s-dev{background:#fef3c7;color:#92400e}.s-con{background:#dbeafe;color:#1e40af}.s-cls{background:#dcfce7;color:#15803d}.s-pool{background:#f1f5f9;color:#64748b}
.link{color:#2563eb;cursor:pointer;font-weight:600;text-decoration:none}.link:hover{text-decoration:underline}
.pg-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.pg-head h2{font-size:22px;font-weight:700}
.btn{padding:8px 18px;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;transition:all .2s}
.btn-g{background:#16a34a;color:#fff}.btn-g:hover{background:#15803d}
.btn-b{background:#3b82f6;color:#fff}.btn-b:hover{background:#2563eb}
.detail-page{display:none}.detail-page.active{display:block}
.back-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:#f1f5f9;border:none;border-radius:6px;cursor:pointer;font-size:13px;color:#475569;margin-bottom:16px}
.back-btn:hover{background:#e2e8f0}
.detail-header{background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.06);margin-bottom:16px}
.detail-info h3{font-size:20px;font-weight:700;margin-bottom:12px}
.info-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;font-size:13px}
.info-grid .lbl{color:#64748b;font-weight:600}.info-grid .val{color:#0f172a}
.tabs{display:flex;gap:4px;margin-bottom:16px;border-bottom:2px solid #e2e8f0}
.tab-btn{padding:8px 18px;border:none;background:none;cursor:pointer;font-weight:600;color:#64748b;border-bottom:2px solid transparent;margin-bottom:-2px;transition:all .2s;font-size:14px}
.tab-btn.active{color:#2563eb;border-bottom-color:#2563eb}
.tab-panel{display:none}.tab-panel.active{display:block}
.record-card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:12px}
.record-card .rc-time{color:#64748b;font-size:12px;margin-bottom:6px}
.record-card .rc-note{font-size:13px;margin-bottom:8px}
.record-card .rc-html{background:#f8fafc;padding:10px;border-radius:6px;font-size:12px;margin-top:8px;overflow:auto;max-height:300px}
.price-tbl{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}
.price-tbl th,.price-tbl td{padding:6px 10px;border:1px solid #e2e8f0;text-align:left}
.price-tbl th{background:#f8fafc;font-weight:600}
.empty-msg{color:#94a3b8;font-style:italic;padding:20px;text-align:center}
.pagination{display:flex;justify-content:center;gap:8px;margin-top:16px}
.pagination button{padding:6px 14px;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;background:#fff;font-size:13px}
.pagination button:disabled{opacity:.4;cursor:not-allowed}
.pagination button.active{background:#2563eb;color:#fff;border-color:#2563eb}
.result-count{font-size:13px;color:#64748b;margin-left:auto}
.status-dist{display:flex;gap:12px;margin-top:16px;flex-wrap:wrap}
.sd-item{padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s}
.sd-item:hover{transform:translateY(-2px);box-shadow:0 2px 8px rgba(0,0,0,.1)}
/* Edit form */
.edit-form{background:#fff;border-radius:12px;padding:20px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.edit-form h4{margin-bottom:12px;color:#1e40af}
.edit-form .fg{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
.edit-form label{font-size:12px;color:#64748b;display:block;margin-bottom:2px}
.edit-form input,.edit-form select,.edit-form textarea{width:100%;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px}
.edit-form textarea{resize:vertical;min-height:60px}
.edit-form .save-row{display:flex;gap:8px;margin-top:12px}
/* Img in record */
.rc-imgs{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}
.rc-imgs img{max-height:100px;border-radius:4px;cursor:pointer}
.rc-imgs img:hover{opacity:.8}
.toast{position:fixed;top:20px;right:20px;background:#16a34a;color:#fff;padding:10px 20px;border-radius:8px;font-size:14px;z-index:9999;animation:fadeIn .3s}
@keyframes fadeIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
</style></head><body>
<div class="sidebar">
  <div class="logo">📊 SunSea CRM</div>
  <div class="nav-item active" onclick="showPage('dashboard')">📈 <span>数据概览</span></div>
  <div class="nav-item" onclick="showPage('customers')">👥 <span>客户管理</span><span class="count" id="navCustCount"></span></div>
  <div class="nav-item" onclick="showPage('inquiries')">📋 <span>询盘记录</span><span class="count" id="navInqCount"></span></div>
  <div class="nav-item" onclick="showPage('quotations')">💰 <span>报价记录</span><span class="count" id="navQuotCount"></span></div>
  <div class="sidebar-footer">
    离线CRM系统 v2.0<br/>可编辑 · 可保存 · 可导入
  </div>
</div>
<div class="main">
  <div class="page active" id="page-dashboard">
    <div class="pg-head"><h2>📈 数据概览</h2>
      <div style="display:flex;gap:8px">
        <button class="btn btn-g" onclick="saveModifiedData()">💾 保存修改为JSON</button>
      </div>
    </div>
    <div class="stats-grid" id="dashStats"></div>
    <div class="stats-grid">
      <div class="stat-card" id="statusDist"></div>
      <div class="stat-card" id="countryDist"></div>
      <div class="stat-card" id="ownerDist"></div>
    </div>
  </div>
  <div class="page" id="page-customers">
    <div class="pg-head"><h2>👥 客户管理</h2>
      <button class="btn btn-b" onclick="addNewCustomer()">➕ 添加客户</button>
    </div>
    <div class="toolbar">
      <input id="searchBox" placeholder="🔍 搜索客户名/公司/邮箱/电话..." oninput="filterCustomers()" style="width:260px"/>
      <select id="statusFilter" onchange="filterCustomers()"><option value="">全部状态</option><option>开发中</option><option>联系中</option><option>已成交</option><option>公海池</option></select>
      <select id="countryFilter" onchange="filterCustomers()"><option value="">全部国家</option></select>
      <select id="ownerFilter" onchange="filterCustomers()"><option value="">全部负责人</option></select>
      <span class="result-count" id="resultCount"></span>
    </div>
    <div class="tbl-wrap"><table><thead><tr>
      <th>姓名</th><th>公司</th><th>邮箱</th><th>电话/WhatsApp</th><th>国家</th><th>状态</th><th>询盘</th><th>报价</th><th>跟进</th><th>负责人</th><th>创建时间</th>
    </tr></thead><tbody id="custBody"></tbody></table></div>
    <div class="pagination" id="custPagination"></div>
  </div>
  <div class="detail-page" id="page-detail"></div>
  <div class="page" id="page-inquiries">
    <div class="pg-head"><h2>📋 全部询盘记录</h2></div>
    <div class="toolbar"><input id="inqSearch" placeholder="🔍 搜索..." oninput="filterInquiries()" style="width:260px"/><span class="result-count" id="inqCount"></span></div>
    <div id="inqList"></div>
  </div>
  <div class="page" id="page-quotations">
    <div class="pg-head"><h2>💰 全部报价记录</h2></div>
    <div class="toolbar"><input id="quotSearch" placeholder="🔍 搜索..." oninput="filterQuotations()" style="width:260px"/><span class="result-count" id="quotCount"></span></div>
    <div id="quotList"></div>
  </div>
</div>
<script>
// Load data from external data.json or embedded
let DATA;
const dataEl = document.getElementById('crmData');
if (dataEl) { DATA = JSON.parse(dataEl.textContent); initCRM(); }
else { fetch('data.json').then(r=>r.json()).then(d=>{DATA=d;initCRM()}).catch(()=>{document.querySelector('.main').innerHTML='<div style="padding:40px;text-align:center"><h2>⚠️ 未找到 data.json</h2><p>请确保 data.json 文件与 index.html 在同一目录</p></div>'}) }

let AC=[],allInq=[],allQuot=[],modified=false;
function initCRM(){
  AC=[];allInq=[];allQuot=[];
  DATA.users.forEach(u=>u.customers.forEach(c=>{c._owner=u.user.display_name;AC.push(c)}));
  AC.forEach(c=>{(c.inquiries||[]).forEach(i=>{i._cust=c;allInq.push(i)});(c.quotations||[]).forEach(q=>{q._cust=c;allQuot.push(q)})});
  // Populate filters
  const countries=[...new Set(AC.map(c=>c.country).filter(Boolean))].sort();
  const owners=[...new Set(AC.map(c=>c._owner).filter(Boolean))].sort();
  const cf=document.getElementById('countryFilter');countries.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;cf.appendChild(o)});
  const of2=document.getElementById('ownerFilter');owners.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;of2.appendChild(o)});
  document.getElementById('navCustCount').textContent=AC.length;
  document.getElementById('navInqCount').textContent=allInq.length;
  document.getElementById('navQuotCount').textContent=allQuot.length;
  initDashboard();
}
function sc(s){if(s==='开发中')return's-dev';if(s==='联系中')return's-con';if(s==='已成交')return's-cls';if(s==='公海池')return's-pool';return''}
function showPage(p){document.querySelectorAll('.page,.detail-page').forEach(e=>e.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active'));
  const el=document.getElementById('page-'+p);if(el)el.classList.add('active');
  document.querySelectorAll('.nav-item').forEach((e,i)=>{if((['dashboard','customers','inquiries','quotations'])[i]===p)e.classList.add('active')});
  if(p==='customers')filterCustomers();if(p==='inquiries')filterInquiries();if(p==='quotations')filterQuotations()}
function toast(msg){const d=document.createElement('div');d.className='toast';d.textContent=msg;document.body.appendChild(d);setTimeout(()=>d.remove(),2500)}
function initDashboard(){
  document.getElementById('dashStats').innerHTML=
    '<div class="stat-card blue"><div class="label">客户总数</div><div class="value">'+AC.length+'</div></div>'+
    '<div class="stat-card green"><div class="label">询盘总数</div><div class="value">'+allInq.length+'</div></div>'+
    '<div class="stat-card amber"><div class="label">报价总数</div><div class="value">'+allQuot.length+'</div></div>'+
    '<div class="stat-card purple"><div class="label">跟进总数</div><div class="value">'+AC.reduce((s,c)=>s+(c.followups?.length||0),0)+'</div></div>';
  const sCounts={};AC.forEach(c=>{sCounts[c.status||'未知']=(sCounts[c.status||'未知']||0)+1});
  let sh='<div class="label">状态分布</div><div class="status-dist">';for(const[s,n]of Object.entries(sCounts))sh+='<div class="sd-item '+sc(s)+'" onclick="filterByStatus(\''+s+'\')" style="cursor:pointer">'+s+': '+n+'</div>';sh+='</div>';document.getElementById('statusDist').innerHTML=sh;
  const cCounts={};AC.forEach(c=>{if(c.country)cCounts[c.country]=(cCounts[c.country]||0)+1});const topC=Object.entries(cCounts).sort((a,b)=>b[1]-a[1]).slice(0,10);
  let ch='<div class="label">Top 国家</div><div style="margin-top:8px">';topC.forEach(([c,n])=>ch+='<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13px"><span>'+c+'</span><strong>'+n+'</strong></div>');ch+='</div>';document.getElementById('countryDist').innerHTML=ch;
  const oCounts={};AC.forEach(c=>{oCounts[c._owner||'未分配']=(oCounts[c._owner||'未分配']||0)+1});let oh='<div class="label">负责人分布</div><div style="margin-top:8px">';for(const[o,n]of Object.entries(oCounts))oh+='<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13px"><span>'+o+'</span><strong>'+n+'</strong></div>';oh+='</div>';document.getElementById('ownerDist').innerHTML=oh;
}
function filterByStatus(s){document.getElementById('statusFilter').value=s;showPage('customers')}
let custPage=1;const PER=30;
function filterCustomers(){
  const q=document.getElementById('searchBox').value.toLowerCase();const s=document.getElementById('statusFilter').value;const co=document.getElementById('countryFilter').value;const ow=document.getElementById('ownerFilter').value;
  const list=AC.filter(c=>{if(s&&c.status!==s)return false;if(co&&c.country!==co)return false;if(ow&&c._owner!==ow)return false;if(q){const t=[c.name,c.first_name,c.last_name,c.company,c.email,c.phone,c.whatsapp,c.note].join(' ').toLowerCase();if(!t.includes(q))return false}return true});
  custPage=1;renderCustPage(list)}
function renderCustPage(list){
  const total=list.length;const pages=Math.max(1,Math.ceil(total/PER));if(custPage>pages)custPage=pages;
  const start=(custPage-1)*PER;const slice=list.slice(start,start+PER);
  let h='';slice.forEach(c=>{h+='<tr><td><a class="link" onclick="showCustomer('+c.id+')">'+(c.first_name||c.name||'')+(c.last_name?' '+c.last_name:'')+'</a></td>';h+='<td>'+(c.company||'-')+'</td><td>'+(c.email||'-')+'</td><td>'+(c.phone||c.whatsapp||'-')+'</td>';h+='<td>'+(c.country||'-')+'</td><td><span class="st '+sc(c.status)+'">'+(c.status||'-')+'</span></td>';h+='<td style="text-align:center">'+(c.inquiries?.length||0)+'</td><td style="text-align:center">'+(c.quotations?.length||0)+'</td>';h+='<td style="text-align:center">'+(c.followups?.length||0)+'</td><td>'+(c._owner||'-')+'</td>';h+='<td style="white-space:nowrap">'+(c.created_at||'').slice(0,10)+'</td></tr>'});
  document.getElementById('custBody').innerHTML=h||'<tr><td colspan="11" class="empty-msg">无匹配客户</td></tr>';
  document.getElementById('resultCount').textContent='显示 '+slice.length+' / '+total+' 位客户';
  let pg='';if(pages>1){pg+='<button '+(custPage<=1?'disabled':'')+' onclick="custPage--;renderCustPage(window._cl)">‹ 上一页</button>';for(let i=1;i<=Math.min(pages,10);i++)pg+='<button class="'+(i===custPage?'active':'')+'" onclick="custPage='+i+';renderCustPage(window._cl)">'+i+'</button>';if(pages>10)pg+='<span>… / '+pages+'</span>';pg+='<button '+(custPage>=pages?'disabled':'')+' onclick="custPage++;renderCustPage(window._cl)">下一页 ›</button>'}document.getElementById('custPagination').innerHTML=pg;window._cl=list}
function showCustomer(id){
  const c=AC.find(x=>x.id===id);if(!c)return;
  document.querySelectorAll('.page,.detail-page').forEach(e=>e.classList.remove('active'));
  const dp=document.getElementById('page-detail');dp.classList.add('active');
  let h='<button class="back-btn" onclick="showPage(\'customers\')">← 返回客户列表</button>';
  // Editable info
  h+='<div class="edit-form"><h4>📝 客户信息 <span style="font-size:12px;color:#94a3b8">(可直接编辑)</span></h4><div class="fg">';
  h+='<div><label>姓名</label><input id="ef_name" value="'+((c.first_name||c.name||'').replace(/"/g,'&quot;'))+'" onchange="editCust('+c.id+',\'name\',this.value)"/></div>';
  h+='<div><label>姓氏</label><input id="ef_lname" value="'+((c.last_name||'').replace(/"/g,'&quot;'))+'" onchange="editCust('+c.id+',\'last_name\',this.value)"/></div>';
  h+='<div><label>公司</label><input value="'+((c.company||'').replace(/"/g,'&quot;'))+'" onchange="editCust('+c.id+',\'company\',this.value)"/></div>';
  h+='<div><label>国家</label><input value="'+((c.country||'').replace(/"/g,'&quot;'))+'" onchange="editCust('+c.id+',\'country\',this.value)"/></div>';
  h+='<div><label>邮箱</label><input value="'+((c.email||'').replace(/"/g,'&quot;'))+'" onchange="editCust('+c.id+',\'email\',this.value)"/></div>';
  h+='<div><label>电话</label><input value="'+((c.phone||'').replace(/"/g,'&quot;'))+'" onchange="editCust('+c.id+',\'phone\',this.value)"/></div>';
  h+='<div><label>WhatsApp</label><input value="'+((c.whatsapp||'').replace(/"/g,'&quot;'))+'" onchange="editCust('+c.id+',\'whatsapp\',this.value)"/></div>';
  h+='<div><label>微信</label><input value="'+((c.wechat||'').replace(/"/g,'&quot;'))+'" onchange="editCust('+c.id+',\'wechat\',this.value)"/></div>';
  h+='<div><label>状态</label><select onchange="editCust('+c.id+',\'status\',this.value)"><option'+(c.status==='开发中'?' selected':'')+'>开发中</option><option'+(c.status==='联系中'?' selected':'')+'>联系中</option><option'+(c.status==='已成交'?' selected':'')+'>已成交</option><option'+(c.status==='公海池'?' selected':'')+'>公海池</option></select></div>';
  h+='</div>';
  if(c.note)h+='<div style="margin-top:8px"><label>备注</label><textarea onchange="editCust('+c.id+',\'note\',this.value)">'+c.note+'</textarea></div>';
  h+='</div>';
  // Tabs
  h+='<div class="tabs"><button class="tab-btn active" onclick="switchTab(this,\'tinq\');">📋 询盘 ('+((c.inquiries||[]).length)+')</button>';
  h+='<button class="tab-btn" onclick="switchTab(this,\'tquot\');">💰 报价 ('+((c.quotations||[]).length)+')</button>';
  h+='<button class="tab-btn" onclick="switchTab(this,\'tfu\');">📝 跟进 ('+((c.followups||[]).length)+')</button></div>';
  // Inquiries
  h+='<div class="tab-panel active" id="tinq">';
  h+='<button class="btn btn-b" style="margin-bottom:12px;font-size:12px;padding:6px 14px" onclick="addRecord('+c.id+',\'inquiry\')">➕ 添加询盘</button>';
  if((c.inquiries||[]).length){c.inquiries.forEach(i=>{h+='<div class="record-card"><div class="rc-time">📅 '+(i.inquiry_time||'-')+'</div>';if(i.note)h+='<div class="rc-note">'+i.note+'</div>';if(i.content_html)h+='<div class="rc-html">'+i.content_html+'</div>';if(i.images?.length)h+='<div class="rc-imgs">'+i.images.map(img=>'<img src="'+img+'" onclick="window.open(this.src)">').join('')+'</div>';h+='</div>'})}else h+='<p class="empty-msg">暂无询盘</p>';
  h+='</div>';
  // Quotations
  h+='<div class="tab-panel" id="tquot">';
  h+='<button class="btn btn-b" style="margin-bottom:12px;font-size:12px;padding:6px 14px" onclick="addRecord('+c.id+',\'quotation\')">➕ 添加报价</button>';
  if((c.quotations||[]).length){c.quotations.forEach(q=>{h+='<div class="record-card"><div class="rc-time">📅 '+(q.quotation_time||'-')+'</div>';if(q.note)h+='<div class="rc-note">'+q.note+'</div>';if(q.freight_type)h+='<div style="font-size:12px;color:#64748b">运输: '+q.freight_type+'</div>';if(q.ports?.length)h+='<div style="font-size:12px;color:#64748b">港口: '+q.ports.join(', ')+'</div>';if(q.price_rows?.length){h+='<table class="price-tbl"><thead><tr><th>品名</th><th>规格</th><th>数量</th><th>单价</th><th>总价</th></tr></thead><tbody>';q.price_rows.forEach(r=>h+='<tr><td>'+(r.product||r.name||'-')+'</td><td>'+(r.spec||r.specification||'-')+'</td><td>'+(r.qty||r.quantity||'-')+'</td><td>'+(r.price||r.unit_price||'-')+'</td><td>'+(r.total||r.amount||'-')+'</td></tr>');h+='</tbody></table>'}if(q.content_html)h+='<div class="rc-html">'+q.content_html+'</div>';h+='</div>'})}else h+='<p class="empty-msg">暂无报价</p>';
  h+='</div>';
  // Followups
  h+='<div class="tab-panel" id="tfu">';
  h+='<button class="btn btn-b" style="margin-bottom:12px;font-size:12px;padding:6px 14px" onclick="addRecord('+c.id+',\'followup\')">➕ 添加跟进</button>';
  if((c.followups||[]).length){c.followups.forEach(f=>{h+='<div class="record-card"><div class="rc-time">📅 '+(f.created_at||'-')+'</div>';if(f.note)h+='<div class="rc-note">'+f.note+'</div>';if(f.content_html)h+='<div class="rc-html">'+f.content_html+'</div>';h+='</div>'})}else h+='<p class="empty-msg">暂无跟进</p>';
  h+='</div>';
  dp.innerHTML=h}
function switchTab(btn,id){btn.closest('.tabs').querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const parent=btn.closest('.tabs').parentElement;parent.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));document.getElementById(id).classList.add('active')}
function editCust(id,field,val){const c=AC.find(x=>x.id===id);if(!c)return;if(field==='name'){c.first_name=val;c.name=val}else c[field]=val;c.last_activity_at=new Date().toISOString();modified=true;toast('✅ 已修改 (本地)')}
function addRecord(custId,type){const c=AC.find(x=>x.id===custId);if(!c)return;const now=new Date().toISOString();const note=prompt('输入'+({inquiry:'询盘',quotation:'报价',followup:'跟进'}[type])+'备注:');if(!note)return;
  if(type==='inquiry'){if(!c.inquiries)c.inquiries=[];c.inquiries.unshift({note,inquiry_time:now,created_at:now,images:[],files:[]})}
  else if(type==='quotation'){if(!c.quotations)c.quotations=[];c.quotations.unshift({note,quotation_time:now,created_at:now,price_rows:[],ports:[],files:[],images:[]})}
  else{if(!c.followups)c.followups=[];c.followups.unshift({note,created_at:now,attachments:[]})}
  modified=true;showCustomer(custId);toast('✅ 已添加'+({inquiry:'询盘',quotation:'报价',followup:'跟进'}[type]))}
function addNewCustomer(){const name=prompt('输入客户名字:');if(!name)return;const email=prompt('输入邮箱(可留空):');const company=prompt('输入公司(可留空):');
  const newId=AC.length?Math.max(...AC.map(c=>c.id))+1:1;
  const c={id:newId,first_name:name,name:name,last_name:'',email:email||'',company:company||'',country:'',phone:'',whatsapp:'',wechat:'',status:'开发中',tags:[],note:'',created_at:new Date().toISOString(),last_activity_at:new Date().toISOString(),inquiries:[],quotations:[],followups:[],_owner:'离线添加'};
  AC.push(c);modified=true;filterCustomers();toast('✅ 已添加客户')}
// Inquiries page
function filterInquiries(){const q=(document.getElementById('inqSearch')?.value||'').toLowerCase();const list=q?allInq.filter(i=>[i.note,i.content_html,i._cust?.name,i._cust?.company,i._cust?.email].join(' ').toLowerCase().includes(q)):allInq;
  let h='';list.slice(0,100).forEach(i=>{h+='<div class="record-card"><div style="display:flex;justify-content:space-between"><div class="rc-time">📅 '+(i.inquiry_time||'-')+'</div><a class="link" onclick="showCustomer('+i._cust?.id+')" style="font-size:12px">'+(i._cust?.name||'-')+' - '+(i._cust?.company||'')+'</a></div>';if(i.note)h+='<div class="rc-note">'+i.note+'</div>';if(i.content_html)h+='<div class="rc-html">'+i.content_html+'</div>';if(i.images?.length)h+='<div class="rc-imgs">'+i.images.map(img=>'<img src="'+img+'">').join('')+'</div>';h+='</div>'});
  document.getElementById('inqList').innerHTML=h||'<p class="empty-msg">无匹配询盘</p>';document.getElementById('inqCount').textContent='显示 '+Math.min(list.length,100)+' / '+list.length+' 条'}
function filterQuotations(){const q=(document.getElementById('quotSearch')?.value||'').toLowerCase();const list=q?allQuot.filter(i=>[i.note,i.content_html,i._cust?.name,i._cust?.company].join(' ').toLowerCase().includes(q)):allQuot;
  let h='';list.slice(0,100).forEach(qt=>{h+='<div class="record-card"><div style="display:flex;justify-content:space-between"><div class="rc-time">📅 '+(qt.quotation_time||'-')+'</div><a class="link" onclick="showCustomer('+qt._cust?.id+')" style="font-size:12px">'+(qt._cust?.name||'-')+' - '+(qt._cust?.company||'')+'</a></div>';if(qt.note)h+='<div class="rc-note">'+qt.note+'</div>';if(qt.price_rows?.length){h+='<table class="price-tbl"><thead><tr><th>品名</th><th>规格</th><th>数量</th><th>单价</th><th>总价</th></tr></thead><tbody>';qt.price_rows.forEach(r=>h+='<tr><td>'+(r.product||r.name||'-')+'</td><td>'+(r.spec||r.specification||'-')+'</td><td>'+(r.qty||r.quantity||'-')+'</td><td>'+(r.price||r.unit_price||'-')+'</td><td>'+(r.total||r.amount||'-')+'</td></tr>');h+='</tbody></table>'}if(qt.content_html)h+='<div class="rc-html">'+qt.content_html+'</div>';h+='</div>'});
  document.getElementById('quotList').innerHTML=h||'<p class="empty-msg">无匹配报价</p>';document.getElementById('quotCount').textContent='显示 '+Math.min(list.length,100)+' / '+list.length+' 条'}
function saveModifiedData(){
  // Rebuild DATA from AC
  const grouped={};AC.forEach(c=>{const o=c._owner||'未分配';if(!grouped[o])grouped[o]=[];grouped[o].push(c)});
  const newData={exported_at:new Date().toISOString(),version:'2.0',users:[]};
  for(const[owner,custs]of Object.entries(grouped)){newData.users.push({user:{id:null,display_name:owner,username:owner},customers:custs.map(c=>{const cc={...c};delete cc._owner;return cc})})}
  const b=new Blob([JSON.stringify(newData,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='data.json';a.click();toast('💾 data.json 已下载，放回文件夹后可上传导入')}
</script></body></html>`
}

export default router
