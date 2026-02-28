import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { upload, compressImage } from '../middleware/upload.js'

const router = Router()

router.post('/', authMiddleware, upload.single('file'), compressImage, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请选择文件' })
  }
  res.json({ url: `/uploads/${req.file.filename}` })
})

export default router
