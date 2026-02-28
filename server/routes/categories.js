import { Router } from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'

const router = Router()

router.get('/', (req, res) => {
  const categories = getAll('SELECT * FROM categories ORDER BY sort_order, id')
  res.json(categories)
})

router.get('/tree', (req, res) => {
  const categories = getAll('SELECT * FROM categories ORDER BY sort_order, id')
  const products = getAll('SELECT category_id, COUNT(*) as count FROM products WHERE status = 1 GROUP BY category_id')
  
  const productCountMap = {}
  products.forEach(p => { productCountMap[p.category_id] = p.count })

  const buildTree = (parentId = 0) => {
    return categories
      .filter(c => c.parent_id === parentId)
      .map(c => ({
        ...c,
        product_count: productCountMap[c.id] || 0,
        children: buildTree(c.id)
      }))
  }

  res.json(buildTree())
})

router.post('/', authMiddleware, upload.single('image'), (req, res) => {
  const { name, name_en, parent_id = 0, sort_order = 0 } = req.body
  const image = req.file ? `/uploads/${req.file.filename}` : null

  if (!name) {
    return res.status(400).json({ error: '分类名称不能为空' })
  }

  const result = run('INSERT INTO categories (name, name_en, parent_id, sort_order, image) VALUES (?, ?, ?, ?, ?)',
    [name, name_en || null, parseInt(parent_id), parseInt(sort_order), image])

  res.json({ id: result.lastInsertRowid, message: '创建成功' })
})

router.put('/:id', authMiddleware, upload.single('image'), (req, res) => {
  const { id } = req.params
  const { name, name_en, parent_id, sort_order } = req.body
  
  const category = getOne('SELECT * FROM categories WHERE id = ?', [id])
  if (!category) {
    return res.status(404).json({ error: '分类不存在' })
  }

  const image = req.file ? `/uploads/${req.file.filename}` : category.image

  run('UPDATE categories SET name = ?, name_en = ?, parent_id = ?, sort_order = ?, image = ? WHERE id = ?',
    [name, name_en || null, parseInt(parent_id || 0), parseInt(sort_order || 0), image, id])

  res.json({ message: '更新成功' })
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
