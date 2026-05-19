import { Router } from 'express'
import { getOne, run, getAll } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

// Get security settings
router.get('/settings', authMiddleware, (req, res) => {
  const settings = getOne('SELECT * FROM security_settings WHERE id = 1')
  res.json(settings)
})

// Update security settings
router.put('/settings', authMiddleware, (req, res) => {
  const { login_max_attempts, login_block_minutes, inquiry_max_per_hour } = req.body
  run(
    'UPDATE security_settings SET login_max_attempts=?, login_block_minutes=?, inquiry_max_per_hour=?, updated_at=CURRENT_TIMESTAMP WHERE id=1',
    [login_max_attempts, login_block_minutes, inquiry_max_per_hour]
  )
  res.json({ message: 'Settings updated successfully' })
})

// Get blocked IPs
router.get('/blocked-ips', authMiddleware, (req, res) => {
  // Auto-cleanup expired blocks before returning
  run('DELETE FROM blocked_ips WHERE blocked_until < datetime("now")')
  
  const ips = getAll('SELECT * FROM blocked_ips ORDER BY blocked_until DESC')
  res.json(ips)
})

// Unblock IP
router.delete('/blocked-ips/:ip', authMiddleware, (req, res) => {
  run('DELETE FROM blocked_ips WHERE ip = ?', [req.params.ip])
  res.json({ message: 'IP unblocked successfully' })
})

export default router
