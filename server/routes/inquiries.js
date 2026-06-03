import { Router } from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { sendInquiryNotification } from '../emailService.js'
import { sendWeChatNotification } from '../utils/wechatWebhook.js'

const router = Router()

router.post('/', async (req, res) => {
  const { name, email, phone, company, country, message, product_id } = req.body

  if (!name || !email) {
    return res.status(400).json({ error: '姓名和邮箱不能为空' })
  }

  const result = run(`
    INSERT INTO inquiries (name, email, phone, company, country, message, product_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [name, email, phone || null, company || null, country || null, message || null, product_id || null])

  const product = product_id ? getOne('SELECT name, name_en FROM products WHERE id = ?', [product_id]) : null
  const productNameStr = product ? (product.name_en || product.name) : ''

  // Send email notification asynchronously (don't block response)
  sendInquiryNotification({ name, email, phone, company, country, message, product_name: productNameStr }).catch(() => { })

  // Send WeChat Webhook notification
  try {
    const markdownContent = `📋 **新网站询盘通知**\n\n有新客户在官网上提交了询盘：\n- **客户姓名:** \`${name}\`\n- **电子邮箱:** \`${email}\`\n- **联络电话:** \`${phone || '无'}\`\n- **公司名称:** \`${company || '无'}\`\n- **国家/地区:** \`${country || '未知'}\`\n${productNameStr ? `- **意向产品:** \`${productNameStr}\`\n` : ''}- **留言内容:** ${message || '无'}\n\n[👉 点击进入后台查看询盘](https://www.sunseasteel.com/admin/inquiries)`
    sendWeChatNotification('inquiry', markdownContent)
  } catch (webhookErr) {
    console.error('Failed to send WeChat notification:', webhookErr)
  }

  res.json({ id: result.lastInsertRowid, message: '询盘提交成功' })
})

router.get('/', authMiddleware, (req, res) => {
  const inquiries = getAll(`
    SELECT i.*, p.name as product_name, p.name_en as product_name_en
    FROM inquiries i
    LEFT JOIN products p ON i.product_id = p.id
    ORDER BY i.created_at DESC
  `)

  const unreadCount = getOne('SELECT COUNT(*) as count FROM inquiries WHERE is_read = 0')

  res.json({ data: inquiries, unread_count: unreadCount.count })
})

// Lightweight endpoint for sidebar badge polling
router.get('/unread-count', authMiddleware, (req, res) => {
  const row = getOne('SELECT COUNT(*) as count FROM inquiries WHERE is_read = 0')
  res.json({ count: row.count })
})

router.put('/:id/read', authMiddleware, (req, res) => {
  run('UPDATE inquiries SET is_read = 1 WHERE id = ?', [req.params.id])
  res.json({ message: '已标记为已读' })
})

router.delete('/:id', authMiddleware, (req, res) => {
  run('DELETE FROM inquiries WHERE id = ?', [req.params.id])
  res.json({ message: '删除成功' })
})

export default router
