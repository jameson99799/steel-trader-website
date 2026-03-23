import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { crmAuthMiddleware } from './crm-auth.js'

const router = Router()

// All routes require website admin auth
// ─── List all CRM users ─────────────────────────────────────────────────────────
router.get('/', authMiddleware, (req, res) => {
  const users = getAll(
    `SELECT id, username, display_name, email, role, status, created_at FROM crm_users ORDER BY id ASC`
  )
  res.json(users)
})

// ─── Create CRM user ────────────────────────────────────────────────────────────
router.post('/', authMiddleware, (req, res) => {
  const { username, password, display_name, email, role } = req.body
  if (!username || !password || !display_name) {
    return res.status(400).json({ error: '用户名、密码和显示名称不能为空' })
  }

  const existing = getOne('SELECT id FROM crm_users WHERE username = ?', [username])
  if (existing) return res.status(400).json({ error: '用户名已存在' })

  const hashed = bcrypt.hashSync(password, 10)
  const result = run(
    `INSERT INTO crm_users (username, password, display_name, email, role) VALUES (?,?,?,?,?)`,
    [username, hashed, display_name, email || '', role || 'sub']
  )
  res.json({ id: result.lastInsertRowid, message: '创建成功' })
})

// ─── Update CRM user ────────────────────────────────────────────────────────────
router.put('/:id', authMiddleware, (req, res) => {
  const { display_name, email, role, status, password } = req.body
  const id = req.params.id

  const user = getOne('SELECT id FROM crm_users WHERE id = ?', [id])
  if (!user) return res.status(404).json({ error: '用户不存在' })

  if (password) {
    run('UPDATE crm_users SET password = ? WHERE id = ?', [bcrypt.hashSync(password, 10), id])
  }

  run(
    `UPDATE crm_users SET display_name = ?, email = ?, role = ?, status = ? WHERE id = ?`,
    [display_name, email || '', role || 'sub', status ?? 1, id]
  )
  res.json({ message: '更新成功' })
})

// ─── Delete CRM user ────────────────────────────────────────────────────────────
router.delete('/:id', authMiddleware, (req, res) => {
  const id = req.params.id
  // Transfer customers to unassigned (owner_id = null) before deleting
  run('UPDATE crm_customers SET owner_id = NULL WHERE owner_id = ?', [id])
  run('DELETE FROM crm_users WHERE id = ?', [id])
  res.json({ message: '删除成功' })
})

export default router
