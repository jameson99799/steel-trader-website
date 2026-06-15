import { Router } from 'express'
import { getAll, getOne, run, findFuzzyBySlug } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import { loadTranslationsForLang, translateNews } from '../helpers/translate.js'

const router = Router()

// Generate SEO-friendly slug from title (no ID suffix)
function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .substring(0, 500)
        .replace(/^-+|-+$/g, '')
}

// Generate unique slug for news (appends -2, -3 ... if slug already exists)
function uniqueSlug(base, excludeId = null) {
    let slug = base
    let counter = 2
    while (true) {
        const exists = excludeId
            ? getOne('SELECT id FROM news WHERE slug = ? AND id != ?', [slug, excludeId])
            : getOne('SELECT id FROM news WHERE slug = ?', [slug])
        if (!exists) return slug
        slug = `${base}-${counter++}`
    }
}

// Resolve category: accepts category_id (number) or category_name (string)
// If category_name provided, look up by name or name_en (case-insensitive)
// If no match and create=true, auto-creates the category
function resolveCategoryId(category_id, category_name) {
    if (category_id) return parseInt(category_id)
    if (!category_name) return null
    const cat = getOne(
        'SELECT id FROM news_categories WHERE LOWER(name_en)=LOWER(?) OR LOWER(name)=LOWER(?)',
        [category_name, category_name]
    )
    if (cat) return cat.id
    // Auto-create the category if it doesn't exist
    const slug = category_name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '')
    const result = run('INSERT INTO news_categories (name, name_en, slug, sort_order) VALUES (?,?,?,?)', [category_name, category_name, slug, 99])
    return result.lastInsertRowid
}

// GET all news (public)
router.get('/', (req, res) => {
    const { status = '1', page = 1, limit = 12, category_id, category_slug } = req.query
    let sql = 'SELECT n.id, n.title, n.title_en, n.slug, n.summary, n.summary_en, n.cover_image, n.status, n.sort_order, n.category_id, n.created_at, n.render_mode, nc.name as category_name, nc.name_en as category_name_en, nc.slug as category_slug FROM news n LEFT JOIN news_categories nc ON n.category_id = nc.id WHERE 1=1'
    const params = []

    if (status !== 'all') {
        sql += ' AND n.status = ?'
        params.push(parseInt(status))
    }
    if (category_id) {
        sql += ' AND n.category_id = ?'
        params.push(parseInt(category_id))
    } else if (category_slug) {
        // Filter by slug (used by frontend category pages)
        sql += ' AND nc.slug = ?'
        params.push(category_slug)
    }

    const countSql = sql.replace('SELECT n.id, n.title, n.title_en, n.slug, n.summary, n.summary_en, n.cover_image, n.status, n.sort_order, n.category_id, n.created_at, n.render_mode, nc.name as category_name, nc.name_en as category_name_en, nc.slug as category_slug', 'SELECT COUNT(*) as total')
    const total = getOne(countSql, params)?.total || 0

    sql += ' ORDER BY n.sort_order, n.id DESC LIMIT ? OFFSET ?'
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit))

    const news = getAll(sql, params)

    // Inject translations if lang param is provided
    const lang = req.query.lang
    if (lang && lang !== 'en') {
        const tMap = loadTranslationsForLang(lang)
        if (tMap) news.forEach(n => translateNews(n, tMap, lang))
    }

    res.json({ data: news, total, page: parseInt(page), limit: parseInt(limit) })
})

// GET single news by id or slug
router.get('/:slug', (req, res) => {
    const { slug } = req.params
    const isId = /^\d+$/.test(slug)
  let news
  if (isId) {
    news = getOne('SELECT * FROM news WHERE id = ?', [slug])
  } else {
    news = findFuzzyBySlug('news', slug)
  }

  if (!news) return res.status(404).json({ error: '文章不存在' })

    // Inject translations if lang param is provided
    const lang = req.query.lang
    if (lang && lang !== 'en') {
        const tMap = loadTranslationsForLang(lang)
        if (tMap) translateNews(news, tMap, lang)
    }

    res.json(news)
})

// POST create news (admin only)
router.post('/', authMiddleware, upload.single('cover_image'), (req, res) => {
    const { title, title_en, summary, summary_en, content, seo_title, seo_description, seo_keywords, status = 1, sort_order = 0, render_mode = 'direct', category_id, category_name } = req.body
    if (!title) return res.status(400).json({ error: '标题不能为空' })

    const resolvedCatId = resolveCategoryId(category_id, category_name)
    const slug = slugify(title_en || title)
    const cover_image = req.file ? `/uploads/${req.file.filename}` : (req.body.cover_url || null)

    const result = run(
        `INSERT INTO news (title, title_en, slug, summary, summary_en, content, cover_image, seo_title, seo_description, seo_keywords, status, sort_order, render_mode, category_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [title, title_en || null, 'temp', summary || null, summary_en || null, content || null, cover_image, seo_title || null, seo_description || null, seo_keywords || null, parseInt(status), parseInt(sort_order), render_mode, resolvedCatId]
    )
    // Generate clean SEO slug without ID
    const newId = result.lastInsertRowid
    const cleanSlug = req.body.slug || uniqueSlug(slugify(title_en || title), newId)
    try {
        run('UPDATE news SET slug = ? WHERE id = ?', [cleanSlug, newId])
    } catch (err) {
        if (err.message && err.message.includes('UNIQUE constraint failed')) {
            run('DELETE FROM news WHERE id = ?', [newId]) // rollback
            return res.status(400).json({ error: '保存失败：自定义链接(Slug)已经被其他文章使用，请留空或修改后重试！' })
        }
        run('DELETE FROM news WHERE id = ?', [newId]) // rollback
        return res.status(500).json({ error: '服务器内部错误：' + err.message })
    }
    
    res.json({ id: newId, slug: cleanSlug, category_id: resolvedCatId, message: '创建成功' })
})

// PUT update news (admin only)
router.put('/:id', authMiddleware, upload.single('cover_image'), (req, res) => {
    const { id } = req.params
    const existing = getOne('SELECT * FROM news WHERE id = ?', [id])
    if (!existing) return res.status(404).json({ error: '文章不存在' })

    const { title, title_en, summary, summary_en, content, seo_title, seo_description, seo_keywords, status, sort_order, render_mode, category_id, category_name } = req.body
    const resolvedCatId = resolveCategoryId(category_id, category_name) ?? existing.category_id
    const cover_image = req.file ? `/uploads/${req.file.filename}` : (req.body.cover_url || existing.cover_image)
    // Preserve existing SEO slug unless explicitly modified
    const updatedSlug = req.body.slug || existing.slug || uniqueSlug(slugify(title_en || title), id)

    try {
      run(
        `UPDATE news SET title=?, title_en=?, slug=?, summary=?, summary_en=?, content=?, cover_image=?, seo_title=?, seo_description=?, seo_keywords=?, status=?, sort_order=?, render_mode=?, category_id=?, updated_at=CURRENT_TIMESTAMP
     WHERE id=?`,
        [title, title_en || null, updatedSlug, summary || null, summary_en || null, content || null, cover_image, seo_title || null, seo_description || null, seo_keywords || null, parseInt(status || 1), parseInt(sort_order || 0), render_mode || 'direct', resolvedCatId, id]
      )
      res.json({ message: '更新成功', slug: updatedSlug, category_id: resolvedCatId })

    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: '保存失败：自定义链接(Slug)或标题已经被其他文章使用，请修改后重试！' })
      }
      return res.status(500).json({ error: '服务器内部错误：' + err.message })
    }
})

// DELETE news (admin only)
router.delete('/:id', authMiddleware, (req, res) => {
    run('DELETE FROM news WHERE id = ?', [req.params.id])
    res.json({ message: '删除成功' })
})

export default router
