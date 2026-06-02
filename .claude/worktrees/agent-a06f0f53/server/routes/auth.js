import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { getOne, run } from '../db.js'
import { generateToken, authMiddleware } from '../middleware/auth.js'

const router = Router()

router.post('/login', (req, res) => {
  const { username, password } = req.body
  
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' })
  }

  const user = getOne('SELECT * FROM users WHERE username = ?', [username])
  
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: '用户名或密码错误' })
  }

  const token = generateToken(user)
  res.json({ token, user: { id: user.id, username: user.username } })
})

router.post('/change-password', authMiddleware, (req, res) => {
  const { oldPassword, newPassword } = req.body
  
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '请填写完整信息' })
  }

  const user = getOne('SELECT * FROM users WHERE id = ?', [req.user.id])
  
  if (!bcrypt.compareSync(oldPassword, user.password)) {
    return res.status(400).json({ error: '原密码错误' })
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10)
  run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id])
  
  // Sync CRM admin password: update CRM admin user whenever website admin changes password
  try {
    const crmAdmin = getOne('SELECT id FROM crm_users WHERE role = ?', ['admin'])
    if (crmAdmin) {
      run('UPDATE crm_users SET password = ? WHERE id = ?', [hashedPassword, crmAdmin.id])
    }
  } catch (e) { /* CRM table may not exist yet */ }
  
  res.json({ message: '密码修改成功' })
})

router.get('/me', authMiddleware, (req, res) => {
  const user = getOne('SELECT id, username, created_at FROM users WHERE id = ?', [req.user.id])
  res.json(user)
})

export default router
