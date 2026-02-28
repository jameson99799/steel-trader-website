import { Router } from 'express'
import { getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'

const router = Router()

// Safe URL builder — only creates /uploads/X if filename is a real non-empty string
function fileUrl(files, field, fallback) {
  const f = files?.[field]?.[0]
  if (f && f.filename && f.filename !== 'undefined') {
    return `/uploads/${f.filename}`
  }
  return fallback || null
}

router.get('/', (req, res) => {
  const company = getOne('SELECT * FROM company WHERE id = 1')
  res.json(company || {})
})

router.put('/', authMiddleware, upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'favicon', maxCount: 1 },
  { name: 'about_image', maxCount: 1 },
  { name: 'whatsapp_qr', maxCount: 1 },
  { name: 'wechat_qr', maxCount: 1 }
]), (req, res) => {
  const company = getOne('SELECT * FROM company WHERE id = 1')
  const { name, name_en, description, description_en, phone, email, address, address_en, whatsapp, wechat,
    facebook, linkedin, instagram, tiktok, twitter, advantages, advantages_en, map_embed_url } = req.body

  // Only update image paths when a new valid file was uploaded; otherwise keep existing value
  const logo = fileUrl(req.files, 'logo', company?.logo)
  const favicon = fileUrl(req.files, 'favicon', company?.favicon)
  const about_image = fileUrl(req.files, 'about_image', company?.about_image)
  const whatsapp_qr = fileUrl(req.files, 'whatsapp_qr', company?.whatsapp_qr)
  const wechat_qr = fileUrl(req.files, 'wechat_qr', company?.wechat_qr)

  if (company) {
    run(`
      UPDATE company SET name=?, name_en=?, description=?, description_en=?, phone=?, email=?,
        address=?, address_en=?, whatsapp=?, wechat=?, facebook=?, linkedin=?, instagram=?,
        tiktok=?, twitter=?, whatsapp_qr=?, wechat_qr=?, logo=?, favicon=?, about_image=?,
        advantages=?, advantages_en=?, map_embed_url=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=1
    `, [name, name_en, description, description_en, phone, email, address, address_en,
      whatsapp, wechat, facebook, linkedin, instagram, tiktok, twitter,
      whatsapp_qr, wechat_qr, logo, favicon, about_image,
      advantages, advantages_en, map_embed_url || null])
  } else {
    run(`
      INSERT INTO company (id, name, name_en, description, description_en, phone, email,
        address, address_en, whatsapp, wechat, facebook, linkedin, instagram, tiktok, twitter,
        whatsapp_qr, wechat_qr, logo, favicon, about_image, advantages, advantages_en, map_embed_url)
      VALUES (1, ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [name, name_en, description, description_en, phone, email, address, address_en,
      whatsapp, wechat, facebook, linkedin, instagram, tiktok, twitter,
      whatsapp_qr, wechat_qr, logo, favicon, about_image,
      advantages, advantages_en, map_embed_url || null])
  }

  res.json({ message: '更新成功' })
})

export default router
