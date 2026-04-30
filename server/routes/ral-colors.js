import { Router } from 'express'
import { getAll } from '../db.js'

const router = Router()

// GET /api/ral-colors — returns all RAL colors with translations for the requested lang
router.get('/', (req, res) => {
  const lang = req.query.lang || 'en'

  const colors = getAll('SELECT id, code, hex, name_zh, name_en FROM ral_colors ORDER BY code ASC')

  // Load translations for this language
  let transMap = {}
  if (lang && lang !== 'en') {
    const translations = getAll(
      `SELECT content_id, translated_text FROM translations
       WHERE content_type = 'ral_color' AND content_field = 'name' AND language_code = ?`,
      [lang]
    )
    for (const t of translations) {
      transMap[t.content_id] = t.translated_text
    }
  }

  const result = colors.map(c => {
    // Determine localized name: translated → English → Chinese fallback
    let localizedName = c.name_en  // default
    if (lang === 'zh') {
      localizedName = c.name_zh
    } else if (lang !== 'en' && transMap[c.id]) {
      localizedName = transMap[c.id]
    }
    return {
      id: c.id,
      code: c.code,
      hex: c.hex,
      name_zh: c.name_zh,
      name_en: c.name_en,
      name: localizedName  // localized name for current language
    }
  })

  res.json(result)
})

export default router
