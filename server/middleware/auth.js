import jwt from 'jsonwebtoken'
import { getJwtSecrets } from '../config/secrets.js'

const { jwtSecret: JWT_SECRET, crmSecret: CRM_SECRET } = getJwtSecrets()

export const generateToken = (user) => {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' })
}

export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  
  if (!token) {
    return res.status(401).json({ error: '未授权访问' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Token无效或已过期' })
  }
}

// Accepts both admin token and CRM token via the same Authorization header
// Tries admin JWT secret first, then CRM JWT secret
export const dualAuthMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: '未授权访问' })
  
  // Try admin secret first
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    return next()
  } catch (e) {}
  
  // Try CRM secret
  try {
    req.crmUser = jwt.verify(token, CRM_SECRET)
    return next()
  } catch (e) {}
  
  return res.status(401).json({ error: '未授权访问' })
}

export default authMiddleware
