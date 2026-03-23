import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { upload, compressImage, attachmentUpload } from '../middleware/upload.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'led-trade-secret-key-2024'
const CRM_SECRET = process.env.CRM_JWT_SECRET || 'crm-steel-secret-2024'

// Accept both admin and CRM tokens for upload
function dualAuthUpload(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: '未授权访问' })

  // Try admin token
  try { req.user = jwt.verify(token, JWT_SECRET); return next() } catch (e) {}
  // Try CRM token
  try { req.crmUser = jwt.verify(token, CRM_SECRET); return next() } catch (e) {}

  return res.status(401).json({ error: 'Token无效' })
}

// Image upload with compression (images only)
router.post('/', dualAuthUpload, upload.single('file'), compressImage, (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请选择文件' })
  res.json({ url: `/uploads/${req.file.filename}` })
})

router.post('/image', dualAuthUpload, upload.single('image'), compressImage, (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请选择文件' })
  res.json({ url: `/uploads/${req.file.filename}` })
})

// CRM file upload — accepts ALL file types (PDF, Excel, docs, images, etc.)
router.post('/file', dualAuthUpload, attachmentUpload.single('file'), compressImage, (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请选择文件' })
  res.json({ url: `/uploads/${req.file.filename}`, name: req.file.originalname })
})

export default router
