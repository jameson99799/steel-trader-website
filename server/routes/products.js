import { Router } from 'express'
import { getAll, getOne, run, findFuzzyBySlug } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { upload, compressImage } from '../middleware/upload.js'
import { loadTranslationsForLang, translateProduct } from '../helpers/translate.js'

const router = Router()

// Slugify helper for SEO-friendly URLs
function slugify(text) {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .substring(0, 500)
    .replace(/^-+|-+$/g, '')
}

// Generate unique slug (appends -2, -3 ... if slug already exists)
function uniqueSlug(base, excludeId = null) {
  let slug = base
  let counter = 2
  while (true) {
    const exists = excludeId
      ? getOne('SELECT id FROM products WHERE slug = ? AND id != ?', [slug, excludeId])
      : getOne('SELECT id FROM products WHERE slug = ?', [slug])
    if (!exists) return slug
    slug = `${base}-${counter++}`
  }
}

router.get('/', (req, res) => {
  const { category_id, featured, status, page = 1, limit = 20 } = req.query
  let sql = 'SELECT p.id, p.name, p.name_en, p.slug, p.category_id, p.images, p.description, p.description_en, p.is_featured, p.status, p.sort_order, c.name as category_name, c.name_en as category_name_en FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1'
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

  sql += ' ORDER BY p.sort_order DESC, p.id DESC'

  const countSql = sql.replace('SELECT p.id, p.name, p.name_en, p.slug, p.category_id, p.images, p.description, p.description_en, p.is_featured, p.status, p.sort_order, c.name as category_name, c.name_en as category_name_en', 'SELECT COUNT(*) as total')
  const totalResult = getOne(countSql, params)
  const total = totalResult?.total || 0

  const offset = (parseInt(page) - 1) * parseInt(limit)
  sql += ` LIMIT ? OFFSET ?`
  params.push(parseInt(limit), offset)

  const products = getAll(sql, params)

  // Inject translations if lang param is provided
  const lang = req.query.lang
  if (lang && lang !== 'en') {
    const tMap = loadTranslationsForLang(lang)
    if (tMap) products.forEach(p => translateProduct(p, tMap, lang))
  }

  res.json({ data: products, total, page: parseInt(page), limit: parseInt(limit) })
})

// Public API: Get all active products (no auth required)
router.get('/public/all', (req, res) => {
  const products = getAll(`
    SELECT p.id, p.name, p.name_en, p.slug, p.category_id, p.images, p.description_en, p.is_featured, p.status, p.sort_order,
           c.name as category_name, c.name_en as category_name_en, c.sort_order as category_sort_order
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.status = 1
    ORDER BY c.sort_order, p.sort_order DESC, p.id DESC
  `)
  res.json({ data: products, total: products.length })
})

router.get('/:slug', (req, res) => {
  const { slug } = req.params
  // Support both numeric ID (legacy) and slug
  const isId = /^\d+$/.test(slug)
  let product = isId
    ? getOne(`SELECT p.*, c.name as category_name, c.name_en as category_name_en FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?`, [slug])
    : getOne(`SELECT p.*, c.name as category_name, c.name_en as category_name_en FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.slug = ?`, [slug])

  if (!product && !isId) {
    const fallbackProduct = findFuzzyBySlug('products', slug)
    if (fallbackProduct) {
      product = getOne(`SELECT p.*, c.name as category_name, c.name_en as category_name_en FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?`, [fallbackProduct.id])
    }
  }

  if (!product) {
    return res.status(404).json({ error: 'Product not found' })
  }

  // Inject translations if lang param is provided
  const lang = req.query.lang
  if (lang && lang !== 'en') {
    const tMap = loadTranslationsForLang(lang)
    if (tMap) translateProduct(product, tMap, lang)
  }

  res.json(product)
})

router.post('/', authMiddleware, upload.array('images', 10), async (req, res) => {
  const { name, name_en, category_id, description, description_en, specs, is_featured = 0, sort_order = 0, status = 1,
    seo_title, seo_description, seo_keywords } = req.body

  // Validate BEFORE processing files to avoid wasting resources on invalid requests
  if (!name) {
    return res.status(400).json({ error: '商品名称不能为空' })
  }

  // Compress each uploaded image (use separate fileRef to avoid req.file race condition)
  const imageUrls = []
  for (const f of (req.files || [])) {
    const fileRef = { file: f }
    const mockReq = { ...req, file: f }
    await new Promise(r => compressImage(mockReq, res, r))
    imageUrls.push(`/uploads/${mockReq.file.filename}`)
  }
  const images = imageUrls.join(',')

  const result = run(`
    INSERT INTO products (name, name_en, category_id, description, description_en, specs, images, detail_content, is_featured, sort_order, status, seo_title, seo_description, seo_keywords, faq_items)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [name, name_en || null, category_id || null, description || null, description_en || null, specs || null, images,
    req.body.detail_content || null, parseInt(is_featured), parseInt(sort_order), parseInt(status),
    seo_title || null, seo_description || null, seo_keywords || null, req.body.faq_items || '[]'])

  const newId = result.lastInsertRowid
  const base = slugify(name_en || name)
  const slug = req.body.slug || uniqueSlug(base, newId)
  try {
    run('UPDATE products SET slug = ? WHERE id = ?', [slug, newId])
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      run('DELETE FROM products WHERE id = ?', [newId]) // rollback
      return res.status(400).json({ error: '保存失败：自定义链接(Slug)已经被其他产品使用，请留空或修改后重试！' })
    }
    run('DELETE FROM products WHERE id = ?', [newId]) // rollback
    return res.status(500).json({ error: '服务器内部错误：' + err.message })
  }

  res.json({ id: newId, slug, message: '创建成功' })
})

router.put('/:id', authMiddleware, upload.array('images', 10), async (req, res) => {
  const { id } = req.params
  const { name, name_en, category_id, description, description_en, specs, is_featured, sort_order, status, existing_images,
    seo_title, seo_description, seo_keywords } = req.body

  const product = getOne('SELECT * FROM products WHERE id = ?', [id])
  if (!product) {
    return res.status(404).json({ error: '商品不存在' })
  }

  // Compress each uploaded image (use mockReq to avoid req.file race condition)
  const imageUrls = []
  for (const f of (req.files || [])) {
    const mockReq = { ...req, file: f }
    await new Promise(r => compressImage(mockReq, res, r))
    imageUrls.push(`/uploads/${mockReq.file.filename}`)
  }

  // Use existing_images from frontend (may be empty string if all deleted)
  // Don't use || because empty string is a valid value (all images removed)
  let images = existing_images !== undefined ? existing_images : product.images
  if (imageUrls.length) {
    images = images ? `${images},${imageUrls.join(',')}` : imageUrls.join(',')
  }

  const newBase = slugify(name_en || name)
  const newSlug = req.body.slug || product.slug || uniqueSlug(newBase, id)

  try {
    run(`
      UPDATE products SET name=?, name_en=?, category_id=?, description=?, description_en=?, specs=?, images=?, detail_content=?,
      is_featured=?, sort_order=?, status=?, seo_title=?, seo_description=?, seo_keywords=?, slug=?, faq_items=?
      WHERE id=?
    `, [name, name_en || null, category_id || null, description || null, description_en || null, specs || null, images,
      req.body.detail_content || null, parseInt(is_featured || 0), parseInt(sort_order || 0), parseInt(status || 1),
      seo_title || null, seo_description || null, seo_keywords || null, newSlug, req.body.faq_items || '[]', id])

    res.json({ message: '更新成功', slug: newSlug })
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: '保存失败：自定义链接(Slug)已经被其他产品使用，请修改后重试！' })
    }
    return res.status(500).json({ error: '服务器内部错误：' + err.message })
  }
})

router.delete('/:id', authMiddleware, (req, res) => {
  run('DELETE FROM products WHERE id = ?', [req.params.id])
  res.json({ message: '删除成功' })
})

export default router
