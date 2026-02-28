import { Router } from 'express'
import { getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/', (req, res) => {
  const hero = getOne('SELECT * FROM hero_content WHERE id = 1')
  res.json(hero || {})
})

router.put('/', authMiddleware, (req, res) => {
  const { tag, tag_en, title, title_en, subtitle, subtitle_en, stat1_num, stat1_label, stat1_label_en, stat2_num, stat2_label, stat2_label_en, stat3_num, stat3_label, stat3_label_en } = req.body

  const hero = getOne('SELECT * FROM hero_content WHERE id = 1')

  if (hero) {
    run(`
      UPDATE hero_content SET tag = ?, tag_en = ?, title = ?, title_en = ?, subtitle = ?, subtitle_en = ?, stat1_num = ?, stat1_label = ?, stat1_label_en = ?, stat2_num = ?, stat2_label = ?, stat2_label_en = ?, stat3_num = ?, stat3_label = ?, stat3_label_en = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `, [tag, tag_en, title, title_en, subtitle, subtitle_en, stat1_num, stat1_label, stat1_label_en, stat2_num, stat2_label, stat2_label_en, stat3_num, stat3_label, stat3_label_en])
  } else {
    run(`
      INSERT INTO hero_content (id, tag, tag_en, title, title_en, subtitle, subtitle_en, stat1_num, stat1_label, stat1_label_en, stat2_num, stat2_label, stat2_label_en, stat3_num, stat3_label, stat3_label_en)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [tag, tag_en, title, title_en, subtitle, subtitle_en, stat1_num, stat1_label, stat1_label_en, stat2_num, stat2_label, stat2_label_en, stat3_num, stat3_label, stat3_label_en])
  }

  res.json({ message: '更新成功' })
})

export default router
