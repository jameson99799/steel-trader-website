import { Router } from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { upload, compressImage } from '../middleware/upload.js'

const router = Router()

router.get('/', (req, res) => {
  const { category_id, featured, status, page = 1, limit = 20 } = req.query
  let sql = 'SELECT p.*, c.name as category_name, c.name_en as category_name_en FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1'
  const params = []

  if (category_id) {
    const categoryIds = [parseInt(category_id)]
    const children = getAll('SELECT id FROM categories WHERE parent_id = ?', [category_id])
    children.forEach(c => {
      categoryIds.push(c.id)
      const grandChildren = getAll('SELECT id FROM categories WHERE parent_id = ?', [c.id])
      grandChildren.forEach(gc => categoryIds.push(gc.id))
    })
    sql += ` AND p.category_id IN (${categoryIds.join(',')})`
  }

  if (featured === '1') {
    sql += ' AND p.is_featured = 1'
  }

  if (status !== undefined) {
    sql += ' AND p.status = ?'
    params.push(parseInt(status))
  }

  sql += ' ORDER BY p.sort_order, p.id DESC'

  const countSql = sql.replace('SELECT p.*, c.name as category_name, c.name_en as category_name_en', 'SELECT COUNT(*) as total')
  const totalResult = getOne(countSql, params)
  const total = totalResult?.total || 0

  const offset = (parseInt(page) - 1) * parseInt(limit)
  sql += ` LIMIT ? OFFSET ?`
  params.push(parseInt(limit), offset)

  const products = getAll(sql, params)
  res.json({ data: products, total, page: parseInt(page), limit: parseInt(limit) })
})

router.get('/:id', (req, res) => {
  const product = getOne(`
    SELECT p.*, c.name as category_name, c.name_en as category_name_en 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    WHERE p.id = ?
  `, [req.params.id])

  if (!product) {
    return res.status(404).json({ error: '商品不存在' })
  }

  res.json(product)
})

router.post('/', authMiddleware, upload.array('images', 10), async (req, res) => {
  const { name, name_en, category_id, description, description_en, specs, is_featured = 0, sort_order = 0, status = 1,
    seo_title, seo_description, seo_keywords } = req.body

  // Compress each uploaded image
  const imageUrls = []
  for (const f of (req.files || [])) {
    req.file = f
    await new Promise(r => compressImage(req, res, r))
    imageUrls.push(`/uploads/${req.file.filename}`)
  }
  const images = imageUrls.join(',')

  if (!name) {
    return res.status(400).json({ error: '商品名称不能为空' })
  }

  const result = run(`
    INSERT INTO products (name, name_en, category_id, description, description_en, specs, images, detail_content, is_featured, sort_order, status, seo_title, seo_description, seo_keywords)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [name, name_en || null, category_id || null, description || null, description_en || null, specs || null, images,
    req.body.detail_content || null, parseInt(is_featured), parseInt(sort_order), parseInt(status),
    seo_title || null, seo_description || null, seo_keywords || null])

  res.json({ id: result.lastInsertRowid, message: '创建成功' })
})

router.put('/:id', authMiddleware, upload.array('images', 10), async (req, res) => {
  const { id } = req.params
  const { name, name_en, category_id, description, description_en, specs, is_featured, sort_order, status, existing_images,
    seo_title, seo_description, seo_keywords } = req.body

  const product = getOne('SELECT * FROM products WHERE id = ?', [id])
  if (!product) {
    return res.status(404).json({ error: '商品不存在' })
  }

  // Compress each uploaded image
  const imageUrls = []
  for (const f of (req.files || [])) {
    req.file = f
    await new Promise(r => compressImage(req, res, r))
    imageUrls.push(`/uploads/${req.file.filename}`)
  }

  let images = existing_images || product.images
  if (imageUrls.length) {
    images = images ? `${images},${imageUrls.join(',')}` : imageUrls.join(',')
  }

  run(`
    UPDATE products SET name=?, name_en=?, category_id=?, description=?, description_en=?, specs=?, images=?, detail_content=?,
    is_featured=?, sort_order=?, status=?, seo_title=?, seo_description=?, seo_keywords=?
    WHERE id=?
  `, [name, name_en || null, category_id || null, description || null, description_en || null, specs || null, images,
    req.body.detail_content || null, parseInt(is_featured || 0), parseInt(sort_order || 0), parseInt(status || 1),
    seo_title || null, seo_description || null, seo_keywords || null, id])

  res.json({ message: '更新成功' })
})

router.delete('/:id', authMiddleware, (req, res) => {
  run('DELETE FROM products WHERE id = ?', [req.params.id])
  res.json({ message: '删除成功' })
})

export default router
