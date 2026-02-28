import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'led-trade-secret-key-2024'

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

export default authMiddleware
