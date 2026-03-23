import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { getAll, getOne, run } from '../db.js'

const router = Router()

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

  res.json({ customers, total, countries: countries.map(c => c.country), page: parseInt(page), limit: parseInt(limit) })
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
      ...getAll(`SELECT c.id, c.name, c.company, c.country, 'customer' as type FROM crm_customers c WHERE (c.name LIKE ? OR c.email LIKE ? OR c.company LIKE ? OR c.phone LIKE ?) ${ownerFilter} LIMIT 20`, [s, s, s, s, ...ownerParams]),
      ...getAll(`SELECT i.id, i.customer_id, i.note, i.inquiry_time, 'inquiry' as type, c.name as customer_name FROM crm_inquiries i JOIN crm_customers c ON i.customer_id=c.id WHERE (i.content_html LIKE ? OR i.note LIKE ?) ${ownerFilter} ORDER BY i.inquiry_time DESC LIMIT 20`, [s, s, ...ownerParams]),
      ...getAll(`SELECT q.id, q.customer_id, q.note, q.quotation_time, 'quotation' as type, c.name as customer_name FROM crm_quotations q JOIN crm_customers c ON q.customer_id=c.id WHERE (q.content_html LIKE ? OR q.note LIKE ?) ${ownerFilter} ORDER BY q.quotation_time DESC LIMIT 20`, [s, s, ...ownerParams])
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
  const { name, country, phone, email, whatsapp, wechat, company, status, tags, note } = req.body
  if (!name) return res.status(400).json({ error: '客户名称不能为空' })
  const ownerId = req.crmUser?.id || null
  const now = new Date().toISOString()
  const result = run(
    `INSERT INTO crm_customers (owner_id,name,country,phone,email,whatsapp,wechat,company,status,tags,note,last_activity_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [ownerId, name, country||'', phone||'', email||'', whatsapp||'', wechat||'', company||'', status||'开发中', JSON.stringify(tags||[]), note||'', now, now]
  )
  res.json({ id: result.lastInsertRowid, message: '添加成功' })
})

// Update customer
router.put('/:id', dualAuth, (req, res) => {
  const { name, country, phone, email, whatsapp, wechat, company, status, tags, note } = req.body
  run(`UPDATE crm_customers SET name=?,country=?,phone=?,email=?,whatsapp=?,wechat=?,company=?,status=?,tags=?,note=? WHERE id=?`,
    [name, country||'', phone||'', email||'', whatsapp||'', wechat||'', company||'', status||'开发中', JSON.stringify(tags||[]), note||'', req.params.id])
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
  list.forEach(f => { try { f.attachments = JSON.parse(f.attachments||'[]') } catch(e) { f.attachments = [] } })
  res.json(list)
})

router.post('/:id/followups', dualAuth, (req, res) => {
  const { content_html, note, attachments } = req.body
  const now = new Date().toISOString()
  const result = run(`INSERT INTO crm_followups (customer_id,user_id,content_html,note,attachments,created_at) VALUES (?,?,?,?,?,?)`,
    [req.params.id, req.crmUser?.id||null, content_html||'', note||'', JSON.stringify(attachments||[]), now])
  run('UPDATE crm_customers SET last_activity_at=? WHERE id=?', [now, req.params.id])
  res.json({ id: result.lastInsertRowid })
})

router.put('/followups/:fId', dualAuth, (req, res) => {
  const { content_html, note, attachments } = req.body
  run(`UPDATE crm_followups SET content_html=?,note=?,attachments=?,updated_at=? WHERE id=?`,
    [content_html, note||'', JSON.stringify(attachments||[]), new Date().toISOString(), req.params.fId])
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
      sent++
    } catch (e) { failed++ }
  }
  res.json({ message: `发送完成: 成功 ${sent}, 失败 ${failed}` })
})

// ─── Export all customers ───────────────────────────────────────────────────────
router.get('/export/all', dualAuth, (req, res) => {
  if (req.crmUser && req.crmUser.role !== 'admin' && !req.user) {
    return res.status(403).json({ error: '需要管理员权限' })
  }
  const users = getAll('SELECT id,username,display_name FROM crm_users')
  const exportData = { exported_at: new Date().toISOString(), users: [] }
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
  res.json(exportData)
})

export default router
