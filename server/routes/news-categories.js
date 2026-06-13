import { Router } from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

// GET all categories (public)
router.get('/', (req, res) => {
  const cats = getAll('SELECT * FROM news_categories ORDER BY sort_order, id')
  // Load all translations for news_category type once (correct column names from db.js schema)
  const allTranslations = getAll(
    `SELECT content_id, language_code, content_field, translated_text FROM translations
     WHERE content_type = 'news_category' AND content_field = 'name'`
  )
  // Build a quick lookup: { [catId]: { zh: '...', th: '...' } }
  const transMap = {}
  for (const tr of allTranslations) {
    if (!transMap[tr.content_id]) transMap[tr.content_id] = {}
    transMap[tr.content_id][tr.language_code] = tr.translated_text
  }

  const withCount = cats.map(c => {
    const r = getOne('SELECT COUNT(*) as count FROM news WHERE category_id = ?', [c.id])
    // Attach translated names as name_{lang} fields so localizedValue() works
    const langFields = {}
    // The 'name' column is Chinese by convention → always provide name_zh
    if (c.name) langFields['name_zh'] = c.name
    // Then overlay any AI-translated names from translations table
    if (transMap[c.id]) {
      for (const [lang, text] of Object.entries(transMap[c.id])) {
        langFields[`name_${lang}`] = text
      }
    }
    return { ...c, ...langFields, count: r?.count || 0 }
  })
  res.json(withCount)
})

// POST create category (admin)
router.post('/', authMiddleware, (req, res) => {
  const { name, name_en, sort_order = 0 } = req.body
  if (!name) return res.status(400).json({ error: '分组名称不能为空' })
  // Generate slug from English name
  const slug = (name_en || name).toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '')
  const result = run(
    'INSERT INTO news_categories (name, name_en, slug, sort_order) VALUES (?,?,?,?)',
    [name, name_en || '', slug, parseInt(sort_order)]
  )
  res.json({ id: result.lastInsertRowid, message: '创建成功' })
})

// PUT update category (admin)
router.put('/:id', authMiddleware, (req, res) => {
  const { name, name_en, sort_order } = req.body
  const existing = getOne('SELECT * FROM news_categories WHERE id = ?', [req.params.id])
  if (!existing) return res.status(404).json({ error: '分组不存在' })
  const newNameEn = name_en ?? existing.name_en
  const newName = name || existing.name
  const slug = req.body.slug || existing.slug || (newNameEn || newName).toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '')
  run(
    'UPDATE news_categories SET name=?, name_en=?, slug=?, sort_order=? WHERE id=?',
    [newName, newNameEn, slug, sort_order ?? existing.sort_order, req.params.id]
  )
  res.json({ message: '更新成功' })
})

// DELETE category (admin) — moves articles to another category or nulls them
router.delete('/:id', authMiddleware, (req, res) => {
  const { move_to } = req.query  // optional: move articles to this category ID
  const existing = getOne('SELECT * FROM news_categories WHERE id = ?', [req.params.id])
  if (!existing) return res.status(404).json({ error: '分组不存在' })

  if (move_to) {
    // Move articles to another category
    const target = getOne('SELECT id FROM news_categories WHERE id = ?', [move_to])
    if (!target) return res.status(400).json({ error: '目标分组不存在' })
    run('UPDATE news SET category_id = ? WHERE category_id = ?', [parseInt(move_to), req.params.id])
  } else {
    // Check if there are other categories to fall back to
    const others = getAll('SELECT id FROM news_categories WHERE id != ? ORDER BY sort_order, id LIMIT 1', [req.params.id])
    if (others.length > 0) {
      run('UPDATE news SET category_id = ? WHERE category_id = ?', [others[0].id, req.params.id])
    } else {
      run('UPDATE news SET category_id = NULL WHERE category_id = ?', [req.params.id])
    }
  }

  run('DELETE FROM news_categories WHERE id = ?', [req.params.id])
  res.json({ message: '删除成功' })
})

// POST /move — move selected articles to a category
router.post('/move', authMiddleware, (req, res) => {
  const { article_ids, category_id } = req.body
  if (!Array.isArray(article_ids) || !article_ids.length) {
    return res.status(400).json({ error: '请选择要移动的文章' })
  }
  const target = getOne('SELECT id FROM news_categories WHERE id = ?', [category_id])
  if (!target) return res.status(400).json({ error: '目标分组不存在' })

  const placeholders = article_ids.map(() => '?').join(',')
  run(`UPDATE news SET category_id = ? WHERE id IN (${placeholders})`, [parseInt(category_id), ...article_ids])
  res.json({ message: `已移动 ${article_ids.length} 篇文章`, moved: article_ids.length })
})

export default router
