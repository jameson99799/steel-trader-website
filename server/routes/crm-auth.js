import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getAll, getOne, run } from '../db.js'
import { CRM_SECRET as CRM_JWT_SECRET } from '../config/secrets.js'

const router = Router()

// ─── CRM token helpers ─────────────────────────────────────────────────────────
export function generateCrmToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, display_name: user.display_name, role: user.role },
    CRM_JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export function crmAuthMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: '未授权访问' })
  try {
    req.crmUser = jwt.verify(token, CRM_JWT_SECRET)
    next()
  } catch (e) {
    return res.status(401).json({ error: 'Token 无效或已过期' })
  }
}

// Admin-only middleware (website admin or CRM admin)
export function crmAdminMiddleware(req, res, next) {
  // Allow website admin (from existing authMiddleware) OR CRM admin role
  if (req.user || (req.crmUser && req.crmUser.role === 'admin')) {
    next()
  } else {
    return res.status(403).json({ error: '需要管理员权限' })
  }
}

// ─── Login ──────────────────────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' })

  // Try CRM users first
  const user = getOne('SELECT * FROM crm_users WHERE LOWER(username) = LOWER(?) AND status = 1', [username])
  if (user && bcrypt.compareSync(password, user.password)) {
    const token = generateCrmToken(user)
    return res.json({
      token,
      user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role }
    })
  }

  // Fallback: check website admin users table
  try {
    const adminUser = getOne('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [username])
    if (adminUser && bcrypt.compareSync(password, adminUser.password)) {
      // Website admin can log in as CRM admin — auto-sync password
      let crmAdmin = getOne('SELECT * FROM crm_users WHERE role = ?', ['admin'])
      if (crmAdmin) {
        // Sync password to CRM admin
        run('UPDATE crm_users SET password = ? WHERE id = ?', [adminUser.password, crmAdmin.id])
      } else {
        // Create CRM admin from website admin
        const r = run('INSERT INTO crm_users (username, password, display_name, role) VALUES (?,?,?,?)',
          [adminUser.username, adminUser.password, 'CRM管理员', 'admin'])
        crmAdmin = { id: r.lastInsertRowid, username: adminUser.username, display_name: 'CRM管理员', role: 'admin' }
      }
      const token = generateCrmToken(crmAdmin)
      return res.json({
        token,
        user: { id: crmAdmin.id, username: crmAdmin.username, display_name: crmAdmin.display_name, role: crmAdmin.role }
      })
    }
  } catch (e) { /* users table may not exist */ }

  return res.status(401).json({ error: '用户名或密码错误' })
})

// ─── Current user ───────────────────────────────────────────────────────────────
router.get('/me', crmAuthMiddleware, (req, res) => {
  const user = getOne(
    'SELECT id, username, display_name, email, role, created_at FROM crm_users WHERE id = ?',
    [req.crmUser.id]
  )
  if (!user) return res.status(404).json({ error: '用户不存在' })
  res.json(user)
})

// ─── Change password ────────────────────────────────────────────────────────────
router.post('/change-password', crmAuthMiddleware, (req, res) => {
  const { oldPassword, newPassword } = req.body
  if (!oldPassword || !newPassword) return res.status(400).json({ error: '请填写完整信息' })

  const user = getOne('SELECT * FROM crm_users WHERE id = ?', [req.crmUser.id])
  if (!bcrypt.compareSync(oldPassword, user.password)) {
    return res.status(400).json({ error: '原密码错误' })
  }

  run('UPDATE crm_users SET password = ? WHERE id = ?', [bcrypt.hashSync(newPassword, 10), req.crmUser.id])
  res.json({ message: '密码修改成功' })
})

export default router
