import { Router } from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'

const router = Router()

// Generate slug from title
function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        + '-' + Date.now()
}

// GET all news (public)
router.get('/', (req, res) => {
    const { status = '1', page = 1, limit = 12 } = req.query
    let sql = 'SELECT * FROM news WHERE 1=1'
    const params = []

    if (status !== 'all') {
        sql += ' AND status = ?'
        params.push(parseInt(status))
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total')
    const total = getOne(countSql, params)?.total || 0

    sql += ' ORDER BY sort_order, id DESC LIMIT ? OFFSET ?'
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit))

    const news = getAll(sql, params)
    res.json({ data: news, total, page: parseInt(page), limit: parseInt(limit) })
})

// GET single news by id or slug
router.get('/:slug', (req, res) => {
    const { slug } = req.params
    const isId = /^\d+$/.test(slug)
    const news = isId
        ? getOne('SELECT * FROM news WHERE id = ?', [slug])
        : getOne('SELECT * FROM news WHERE slug = ?', [slug])

    if (!news) return res.status(404).json({ error: '文章不存在' })
    res.json(news)
})

// POST create news (admin only)
router.post('/', authMiddleware, upload.single('cover_image'), (req, res) => {
    const { title, title_en, summary, summary_en, content, seo_title, seo_description, seo_keywords, status = 1, sort_order = 0 } = req.body
    if (!title) return res.status(400).json({ error: '标题不能为空' })

    const slug = slugify(title_en || title)
    const cover_image = req.file ? `/uploads/${req.file.filename}` : null

    const result = run(
        `INSERT INTO news (title, title_en, slug, summary, summary_en, content, cover_image, seo_title, seo_description, seo_keywords, status, sort_order)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [title, title_en || null, slug, summary || null, summary_en || null, content || null, cover_image, seo_title || null, seo_description || null, seo_keywords || null, parseInt(status), parseInt(sort_order)]
    )
    res.json({ id: result.lastInsertRowid, message: '创建成功' })
})

// PUT update news (admin only)
router.put('/:id', authMiddleware, upload.single('cover_image'), (req, res) => {
    const { id } = req.params
    const existing = getOne('SELECT * FROM news WHERE id = ?', [id])
    if (!existing) return res.status(404).json({ error: '文章不存在' })

    const { title, title_en, summary, summary_en, content, seo_title, seo_description, seo_keywords, status, sort_order } = req.body
    const cover_image = req.file ? `/uploads/${req.file.filename}` : existing.cover_image

    run(
        `UPDATE news SET title=?, title_en=?, summary=?, summary_en=?, content=?, cover_image=?, seo_title=?, seo_description=?, seo_keywords=?, status=?, sort_order=?, updated_at=CURRENT_TIMESTAMP
     WHERE id=?`,
        [title, title_en || null, summary || null, summary_en || null, content || null, cover_image, seo_title || null, seo_description || null, seo_keywords || null, parseInt(status || 1), parseInt(sort_order || 0), id]
    )
    res.json({ message: '更新成功' })
})

// DELETE news (admin only)
router.delete('/:id', authMiddleware, (req, res) => {
    run('DELETE FROM news WHERE id = ?', [req.params.id])
    res.json({ message: '删除成功' })
})

export default router
