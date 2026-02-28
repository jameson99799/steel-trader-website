import { Router } from 'express'
import { getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'

const router = Router()

router.get('/', (req, res) => {
    const settings = getOne('SELECT * FROM seo_settings WHERE id = 1')
    res.json(settings || {})
})

router.put('/', authMiddleware, upload.single('og_image'), (req, res) => {
    const existing = getOne('SELECT * FROM seo_settings WHERE id = 1')
    const { site_title, site_description, site_keywords, google_analytics, google_search_console, robots_txt } = req.body
    const og_image = req.file ? `/uploads/${req.file.filename}` : existing?.og_image

    if (existing) {
        run(
            'UPDATE seo_settings SET site_title=?, site_description=?, site_keywords=?, og_image=?, google_analytics=?, google_search_console=?, robots_txt=?, updated_at=CURRENT_TIMESTAMP WHERE id=1',
            [site_title, site_description, site_keywords, og_image, google_analytics, google_search_console, robots_txt]
        )
    } else {
        run(
            'INSERT INTO seo_settings (id, site_title, site_description, site_keywords, og_image, google_analytics, google_search_console, robots_txt) VALUES (1,?,?,?,?,?,?,?)',
            [site_title, site_description, site_keywords, og_image, google_analytics, google_search_console, robots_txt]
        )
    }
    res.json({ message: '保存成功' })
})

export default router
