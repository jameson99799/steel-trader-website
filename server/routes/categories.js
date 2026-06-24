import { Router } from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import { loadTranslationsForLang, translateCategory } from '../helpers/translate.js'

const router = Router()

function slugify(text, id) {
  const base = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 60)
  return id ? `${base}-${id}` : base
}

router.get('/', (req, res) => {
  const categories = getAll('SELECT * FROM categories ORDER BY sort_order, id')

  // Inject translations if lang param is provided
  const lang = req.query.lang
  if (lang && lang !== 'en') {
    const tMap = loadTranslationsForLang(lang)
    if (tMap) categories.forEach(c => translateCategory(c, tMap, lang))
  }

  res.json(categories)
})

router.get('/tree', (req, res) => {
  const categories = getAll('SELECT * FROM categories ORDER BY sort_order, id')
  const products = getAll('SELECT category_id, COUNT(*) as count FROM products WHERE status = 1 GROUP BY category_id')

  const productCountMap = {}
  products.forEach(p => { productCountMap[p.category_id] = p.count })

  // Inject translations if lang param is provided
  const lang = req.query.lang
  const tMap = (lang && lang !== 'en') ? loadTranslationsForLang(lang) : null

  const buildTree = (parentId = 0) => {
    return categories
      .filter(c => c.parent_id === parentId)
      .map(c => {
        const node = {
          ...c,
          product_count: productCountMap[c.id] || 0,
          children: buildTree(c.id)
        }
        if (tMap) translateCategory(node, tMap, lang)
        return node
      })
  }

  res.json(buildTree())
})

router.post('/', authMiddleware, upload.single('image'), (req, res) => {
  try {
    const { name, name_en, parent_id = 0, sort_order = 0 } = req.body
    const image = req.file ? `/uploads/${req.file.filename}` : null

    if (!name) {
      return res.status(400).json({ error: '分类名称不能为空' })
    }

    const result = run('INSERT INTO categories (name, name_en, parent_id, sort_order, image) VALUES (?, ?, ?, ?, ?)',
      [name, name_en || null, parseInt(parent_id), parseInt(sort_order), image])
    const newId = result.lastInsertRowid
    run('UPDATE categories SET slug = ? WHERE id = ?', [slugify(name_en || name, newId), newId])
    res.json({ id: newId, message: '创建成功' })
  } catch (err) {
    res.status(500).json({ error: '分类创建失败：' + err.message })
  }
})

router.put('/:id', authMiddleware, upload.single('image'), (req, res) => {
  try {
    const { id } = req.params
    const { name, name_en, parent_id, sort_order } = req.body

    const category = getOne('SELECT * FROM categories WHERE id = ?', [id])
    if (!category) {
      return res.status(404).json({ error: '分类不存在' })
    }

    const image = req.file ? `/uploads/${req.file.filename}` : category.image
    const updatedSlug = req.body.slug || category.slug || slugify(name_en || name, id)
    run('UPDATE categories SET name = ?, name_en = ?, parent_id = ?, sort_order = ?, image = ?, slug = ? WHERE id = ?',
      [name, name_en || null, parseInt(parent_id || 0), parseInt(sort_order || 0), image, updatedSlug, id])
    res.json({ message: '更新成功' })
  } catch (err) {
    res.status(500).json({ error: '分类更新失败：' + err.message })
  }
})

router.delete('/:id', authMiddleware, (req, res) => {
  const { id } = req.params

  const hasChildren = getOne('SELECT COUNT(*) as count FROM categories WHERE parent_id = ?', [id])
  if (hasChildren.count > 0) {
    return res.status(400).json({ error: '该分类下有子分类，无法删除' })
  }

  const hasProducts = getOne('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [id])
  if (hasProducts.count > 0) {
    return res.status(400).json({ error: '该分类下有商品，无法删除' })
  }

  run('DELETE FROM categories WHERE id = ?', [id])
  res.json({ message: '删除成功' })
})

export default router
