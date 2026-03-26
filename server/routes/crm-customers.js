import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { getAll, getOne, run } from '../db.js'
import { replaceCustomVars } from './mailer.js'

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
  const jsonStr = JSON.stringify(exportData)

  const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>CRM客户数据导出 - ${new Date().toLocaleDateString('zh-CN')}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;color:#334155;line-height:1.6}
.header{background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;padding:24px 32px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
.header h1{font-size:22px;font-weight:700}.header .meta{font-size:13px;opacity:.85}
.toolbar{background:#fff;padding:12px 32px;border-bottom:1px solid #e2e8f0;display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.toolbar input,.toolbar select{padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;outline:none}
.toolbar input:focus{border-color:#3b82f6}
.toolbar button{padding:8px 18px;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;transition:all .2s}
.btn-blue{background:#3b82f6;color:#fff}.btn-blue:hover{background:#2563eb}
.btn-green{background:#16a34a;color:#fff}.btn-green:hover{background:#15803d}
.container{max-width:1200px;margin:20px auto;padding:0 16px}
.user-section{margin-bottom:24px}.user-title{font-size:16px;font-weight:700;color:#1e40af;padding:12px 16px;background:#eff6ff;border-radius:8px 8px 0 0;border:1px solid #bfdbfe}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;border-radius:0 0 8px 8px;overflow:hidden}
th{background:#f8fafc;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0}
td{padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
tr:hover td{background:#f8fafc}.tag{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;background:#dbeafe;color:#1e40af;margin:1px}
.status{padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600}
.s-dev{background:#fef3c7;color:#92400e}.s-contact{background:#dbeafe;color:#1e40af}.s-closed{background:#dcfce7;color:#15803d}.s-pool{background:#f1f5f9;color:#64748b}
.detail-btn{background:none;border:1px solid #cbd5e1;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;color:#3b82f6}
.detail-btn:hover{background:#eff6ff}
.modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:1000;display:none;align-items:center;justify-content:center}
.modal-overlay.show{display:flex}
.modal{background:#fff;border-radius:12px;max-width:800px;width:95%;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2)}
.modal-head{padding:16px 20px;border-bottom:1px solid #e2e8f0;font-weight:700;display:flex;justify-content:space-between;align-items:center}
.modal-head .close{background:none;border:none;font-size:24px;cursor:pointer;color:#94a3b8}
.modal-body{padding:20px}.modal-body h4{color:#1e40af;margin:16px 0 8px;font-size:14px}
.record{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin:8px 0;font-size:13px}
.record .time{color:#64748b;font-size:12px}
.empty{color:#94a3b8;font-style:italic;padding:8px 0}
.footer{text-align:center;padding:24px;color:#94a3b8;font-size:12px}
.hidden{display:none}
</style></head><body>
<div class="header">
  <div><h1>📊 CRM客户数据</h1><div class="meta">导出时间: ${new Date().toLocaleString('zh-CN')} | 共 ${totalCustomers} 位客户</div></div>
  <div><button class="btn-green" onclick="downloadJSON()">💾 下载JSON (可导入)</button></div>
</div>
<div class="toolbar">
  <input id="searchBox" placeholder="🔍 搜索客户名/公司/邮箱..." oninput="filterTable()" style="width:250px"/>
  <select id="statusFilter" onchange="filterTable()"><option value="">全部状态</option><option>开发中</option><option>联系中</option><option>已成交</option><option>公海池</option></select>
  <select id="countryFilter" onchange="filterTable()"><option value="">全部国家</option></select>
  <span id="resultCount" style="font-size:13px;color:#64748b;margin-left:auto;"></span>
</div>
<div class="container" id="content"></div>
<div class="footer">SunSea Steel CRM — 本文件可离线浏览，点击"下载JSON"获取可导入的数据文件</div>
<div class="modal-overlay" id="detailModal"><div class="modal">
  <div class="modal-head"><span id="modalTitle">客户详情</span><button class="close" onclick="closeModal()">&times;</button></div>
  <div class="modal-body" id="modalBody"></div>
</div></div>
<script id="crmData" type="application/json">${jsonStr.replace(/<\//g,'<\\/')}</script>
<script>
const DATA=JSON.parse(document.getElementById('crmData').textContent);
const allCustomers=[];DATA.users.forEach(u=>u.customers.forEach(c=>{c._owner=u.user.display_name;allCustomers.push(c)}));
const countries=[...new Set(allCustomers.map(c=>c.country).filter(Boolean))].sort();
const cf=document.getElementById('countryFilter');countries.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;cf.appendChild(o)});
function statusClass(s){if(s==='开发中')return's-dev';if(s==='联系中')return's-contact';if(s==='已成交')return's-closed';if(s==='公海池')return's-pool';return''}
function renderTable(list){
  const grouped={};list.forEach(c=>{const o=c._owner||'未分配';if(!grouped[o])grouped[o]=[];grouped[o].push(c)});
  let html='';for(const[owner,custs]of Object.entries(grouped)){
    html+='<div class="user-section"><div class="user-title">👤 '+owner+' ('+custs.length+')</div><table><thead><tr><th>ID</th><th>姓名</th><th>公司</th><th>邮箱</th><th>电话</th><th>国家</th><th>状态</th><th>标签</th><th>创建时间</th><th>操作</th></tr></thead><tbody>';
    custs.forEach(c=>{const tags=(Array.isArray(c.tags)?c.tags:[]).map(t=>'<span class="tag">'+t+'</span>').join('');
      html+='<tr data-id="'+c.id+'"><td>'+c.id+'</td><td>'+(c.name||'')+'</td><td>'+(c.company||'')+'</td><td>'+(c.email||'')+'</td><td>'+(c.phone||c.whatsapp||'')+'</td><td>'+(c.country||'')+'</td><td><span class="status '+statusClass(c.status)+'">'+(c.status||'')+'</span></td><td>'+tags+'</td><td>'+(c.created_at||'').slice(0,10)+'</td><td><button class="detail-btn" onclick="showDetail('+c.id+')">详情</button></td></tr>'});
    html+='</tbody></table></div>'}
  document.getElementById('content').innerHTML=html||'<p style="text-align:center;padding:40px;color:#94a3b8">无匹配客户</p>';
  document.getElementById('resultCount').textContent='显示 '+list.length+' / '+allCustomers.length+' 位客户'}
function filterTable(){
  const q=document.getElementById('searchBox').value.toLowerCase(),s=document.getElementById('statusFilter').value,co=document.getElementById('countryFilter').value;
  const filtered=allCustomers.filter(c=>{if(s&&c.status!==s)return false;if(co&&c.country!==co)return false;if(q){const t=[c.name,c.company,c.email,c.phone,c.whatsapp,c.note].join(' ').toLowerCase();if(!t.includes(q))return false}return true});renderTable(filtered)}
function showDetail(id){
  const c=allCustomers.find(x=>x.id===id);if(!c)return;
  document.getElementById('modalTitle').textContent=c.name+' - '+(c.company||'');
  let h='<p><b>邮箱:</b> '+(c.email||'-')+' | <b>电话:</b> '+(c.phone||'-')+' | <b>WhatsApp:</b> '+(c.whatsapp||'-')+' | <b>WeChat:</b> '+(c.wechat||'-')+'</p>';
  h+='<p><b>国家:</b> '+(c.country||'-')+' | <b>状态:</b> '+(c.status||'-')+' | <b>负责人:</b> '+(c._owner||'-')+'</p>';
  if(c.note)h+='<p><b>备注:</b> '+c.note+'</p>';
  h+='<h4>📋 询盘记录 ('+((c.inquiries||[]).length)+')</h4>';
  (c.inquiries||[]).forEach(i=>{h+='<div class="record"><div class="time">'+i.inquiry_time+'</div>'+(i.note?'<div>'+i.note+'</div>':'')+(i.content_html?'<div style="margin-top:8px;padding:8px;background:#fff;border-radius:4px;font-size:12px">'+i.content_html+'</div>':'')+'</div>'});
  if(!(c.inquiries||[]).length)h+='<p class="empty">暂无询盘</p>';
  h+='<h4>💰 报价记录 ('+((c.quotations||[]).length)+')</h4>';
  (c.quotations||[]).forEach(q=>{h+='<div class="record"><div class="time">'+q.quotation_time+'</div>'+(q.note?'<div>'+q.note+'</div>':'')+(q.content_html?'<div style="margin-top:8px;padding:8px;background:#fff;border-radius:4px;font-size:12px">'+q.content_html+'</div>':'')+'</div>'});
  if(!(c.quotations||[]).length)h+='<p class="empty">暂无报价</p>';
  h+='<h4>📝 跟进记录 ('+((c.followups||[]).length)+')</h4>';
  (c.followups||[]).forEach(f=>{h+='<div class="record"><div class="time">'+f.created_at+'</div>'+(f.content_html||f.note||'')+'</div>'});
  if(!(c.followups||[]).length)h+='<p class="empty">暂无跟进</p>';
  document.getElementById('modalBody').innerHTML=h;document.getElementById('detailModal').classList.add('show')}
function closeModal(){document.getElementById('detailModal').classList.remove('show')}
function downloadJSON(){const b=new Blob([JSON.stringify(DATA,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='crm_export_'+new Date().toISOString().slice(0,10)+'.json';a.click()}
renderTable(allCustomers);
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

export default router
