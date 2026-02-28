import { Router } from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.post('/', (req, res) => {
  const { name, email, phone, company, country, message, product_id } = req.body

  if (!name || !email) {
    return res.status(400).json({ error: '姓名和邮箱不能为空' })
  }

  const result = run(`
    INSERT INTO inquiries (name, email, phone, company, country, message, product_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [name, email, phone || null, company || null, country || null, message || null, product_id || null])

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

router.put('/:id/read', authMiddleware, (req, res) => {
  run('UPDATE inquiries SET is_read = 1 WHERE id = ?', [req.params.id])
  res.json({ message: '已标记为已读' })
})

router.delete('/:id', authMiddleware, (req, res) => {
  run('DELETE FROM inquiries WHERE id = ?', [req.params.id])
  res.json({ message: '删除成功' })
})

export default router
