import { Router } from 'express'
import { getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import { loadTranslationsForLang, translateCompany } from '../helpers/translate.js'

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
  const result = company || {}

  // Inject translations if lang param is provided
  const lang = req.query.lang
  if (lang && lang !== 'en' && result.id) {
    const tMap = loadTranslationsForLang(lang)
    if (tMap) translateCompany(result, tMap, lang)
  }
  const ts = result.updated_at ? new Date(result.updated_at).getTime() : Date.now()
  const imgFields = ['logo', 'favicon', 'about_image', 'whatsapp_qr', 'wechat_qr']
  imgFields.forEach(f => {
    if (result[f] && typeof result[f] === 'string' && !result[f].startsWith('data:')) {
      result[f] = result[f].split('?')[0] + '?t=' + ts
    }
  })

  res.json(result)
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
    facebook, linkedin, instagram, tiktok, twitter, youtube, advantages, advantages_en, map_embed_url,
    company_video_embed, about_show_video, about_video_autoplay, home_show_video } = req.body

  // Only update image paths when a new valid file was uploaded; otherwise use provided url or keep existing value
  const logo = fileUrl(req.files, 'logo', req.body.logo_url || company?.logo)
  const favicon = fileUrl(req.files, 'favicon', req.body.favicon_url || company?.favicon)
  const about_image = fileUrl(req.files, 'about_image', req.body.about_image_url || company?.about_image)
  const whatsapp_qr = fileUrl(req.files, 'whatsapp_qr', req.body.whatsapp_qr_url || company?.whatsapp_qr)
  const wechat_qr = fileUrl(req.files, 'wechat_qr', req.body.wechat_qr_url || company?.wechat_qr)

  try {
    if (company) {
      run(`
        UPDATE company SET name=?, name_en=?, description=?, description_en=?, phone=?, email=?,
          address=?, address_en=?, whatsapp=?, wechat=?, facebook=?, linkedin=?, instagram=?,
          tiktok=?, twitter=?, youtube=?, whatsapp_qr=?, wechat_qr=?, logo=?, favicon=?, about_image=?,
          advantages=?, advantages_en=?, map_embed_url=?, company_video_embed=?, 
          about_show_video=?, about_video_autoplay=?, home_show_video=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=1
      `, [name, name_en, description, description_en, phone, email, address, address_en,
        whatsapp, wechat, facebook, linkedin, instagram, tiktok, twitter, youtube,
        whatsapp_qr, wechat_qr, logo, favicon, about_image,
        advantages, advantages_en, map_embed_url || null, company_video_embed || null,
        about_show_video ? 1 : 0, about_video_autoplay ? 1 : 0, home_show_video ? 1 : 0])
    } else {
      run(`
        INSERT INTO company (id, name, name_en, description, description_en, phone, email,
          address, address_en, whatsapp, wechat, facebook, linkedin, instagram, tiktok, twitter, youtube,
          whatsapp_qr, wechat_qr, logo, favicon, about_image, advantages, advantages_en, map_embed_url,
          company_video_embed, about_show_video, about_video_autoplay, home_show_video)
        VALUES (1, ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `, [name, name_en, description, description_en, phone, email, address, address_en,
        whatsapp, wechat, facebook, linkedin, instagram, tiktok, twitter, youtube,
        whatsapp_qr, wechat_qr, logo, favicon, about_image,
        advantages, advantages_en, map_embed_url || null, company_video_embed || null,
        about_show_video ? 1 : 0, about_video_autoplay ? 1 : 0, home_show_video ? 1 : 0])
    }

    res.json({ message: '更新成功' })
  } catch (err) {
    res.status(500).json({ error: '保存失败：' + err.message })
  }
})

export default router
