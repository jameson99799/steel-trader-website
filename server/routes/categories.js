import { Router } from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import { loadTranslationsForLang, translateCategory } from '../helpers/translate.js'
import { buildPublicCategoryTree, getVisibleCategoryIds } from '../services/catalogVisibility.js'

const router = Router()

function slugify(text, id) {
  const base = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 60)
  return id ? `${base}-${id}` : base
}

router.get('/', (req, res) => {
  const allCategories = getAll('SELECT * FROM categories ORDER BY sort_order, id')
  const visibleIds = getVisibleCategoryIds(allCategories)
  const categories = allCategories.filter(category => visibleIds.has(category.id))

  // Inject translations if lang param is provided
  const lang = req.query.lang
  if (lang && lang !== 'en') {
    const tMap = loadTranslationsForLang(lang)
    if (tMap) categories.forEach(c => translateCategory(c, tMap, lang))
  }

  res.json(categories)
})

function categoryProductCounts() {
  return new Map(getAll('SELECT category_id, COUNT(*) as count FROM products WHERE status = 1 GROUP BY category_id')
    .map(product => [product.category_id, product.count]))
}

export function buildAdminCategoryTree(categories) {
  const byParent = new Map()
  for (const category of categories) {
    const parentId = Number(category.parent_id || 0)
    const siblings = byParent.get(parentId) || []
    siblings.push(category)
    byParent.set(parentId, siblings)
  }
  const buildBranch = parentId => (byParent.get(parentId) || []).map(category => ({
    ...category,
    children: buildBranch(category.id)
  }))
  return buildBranch(0)
}

router.get('/admin/tree', authMiddleware, (req, res) => {
  const categories = getAll('SELECT * FROM categories ORDER BY sort_order, id')
  res.json(buildAdminCategoryTree(categories))
})

router.get('/tree', (req, res) => {
  const categories = getAll('SELECT * FROM categories ORDER BY sort_order, id')

  // Inject translations if lang param is provided
  const lang = req.query.lang
  const tMap = (lang && lang !== 'en') ? loadTranslationsForLang(lang) : null

  const translateTree = nodes => {
    nodes.forEach(node => {
      if (tMap) translateCategory(node, tMap, lang)
      translateTree(node.children)
    })
  }
  const tree = buildPublicCategoryTree(categories, categoryProductCounts())
  translateTree(tree)
  res.json(tree)
})

router.post('/', authMiddleware, upload.single('image'), (req, res) => {
  try {
    const { name, name_en, parent_id = 0, sort_order = 0 } = req.body
    const image = req.file ? `/uploads/${req.file.filename}` : null

    if (!name) {
      return res.status(400).json({ error: '分类名称不能为空' })
    }

    const result = run('INSERT INTO categories (name, name_en, parent_id, sort_order, image, is_enabled) VALUES (?, ?, ?, ?, ?, 1)',
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
    const { name, name_en, parent_id, sort_order, is_enabled } = req.body

    const category = getOne('SELECT * FROM categories WHERE id = ?', [id])
    if (!category) {
      return res.status(404).json({ error: '分类不存在' })
    }

    const image = req.file ? `/uploads/${req.file.filename}` : category.image
    const nextName = name === undefined ? category.name : name
    const nextNameEn = name_en === undefined ? category.name_en : name_en || null
    const nextParentId = parent_id === undefined ? category.parent_id : parseInt(parent_id)
    const nextSortOrder = sort_order === undefined ? category.sort_order : parseInt(sort_order)
    const nextIsEnabled = is_enabled === undefined ? category.is_enabled : (parseInt(is_enabled) ? 1 : 0)
    const updatedSlug = req.body.slug || category.slug || slugify(nextNameEn || nextName, id)
    run('UPDATE categories SET name = ?, name_en = ?, parent_id = ?, sort_order = ?, image = ?, slug = ?, is_enabled = ? WHERE id = ?',
      [nextName, nextNameEn, nextParentId, nextSortOrder, image, updatedSlug, nextIsEnabled, id])
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
