import { Router } from 'express'
import { getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'

const router = Router()

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

  const logo = req.files?.logo?.[0] ? `/uploads/${req.files.logo[0].filename}` : company?.logo
  const favicon = req.files?.favicon?.[0] ? `/uploads/${req.files.favicon[0].filename}` : company?.favicon
  const about_image = req.files?.about_image?.[0] ? `/uploads/${req.files.about_image[0].filename}` : company?.about_image
  const whatsapp_qr = req.files?.whatsapp_qr?.[0] ? `/uploads/${req.files.whatsapp_qr[0].filename}` : company?.whatsapp_qr
  const wechat_qr = req.files?.wechat_qr?.[0] ? `/uploads/${req.files.wechat_qr[0].filename}` : company?.wechat_qr

  if (company) {
    run(`
      UPDATE company SET name=?, name_en=?, description=?, description_en=?, phone=?, email=?, address=?, address_en=?, whatsapp=?, wechat=?, facebook=?, linkedin=?, instagram=?, tiktok=?, twitter=?, whatsapp_qr=?, wechat_qr=?, logo=?, favicon=?, about_image=?, advantages=?, advantages_en=?, map_embed_url=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=1
    `, [name, name_en, description, description_en, phone, email, address, address_en, whatsapp, wechat,
      facebook, linkedin, instagram, tiktok, twitter, whatsapp_qr, wechat_qr, logo, favicon, about_image, advantages, advantages_en, map_embed_url || null])
  } else {
    run(`
      INSERT INTO company (id, name, name_en, description, description_en, phone, email, address, address_en, whatsapp, wechat, facebook, linkedin, instagram, tiktok, twitter, whatsapp_qr, wechat_qr, logo, favicon, about_image, advantages, advantages_en, map_embed_url)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, name_en, description, description_en, phone, email, address, address_en, whatsapp, wechat,
      facebook, linkedin, instagram, tiktok, twitter, whatsapp_qr, wechat_qr, logo, favicon, about_image, advantages, advantages_en, map_embed_url || null])
  }

  res.json({ message: '更新成功' })
})

export default router
