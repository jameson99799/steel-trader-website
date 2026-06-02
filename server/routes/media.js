import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { getAll, getOne, run } from '../db.js'
import { upload, compressImage } from '../middleware/upload.js'
import { applyWatermark } from '../utils/watermark.js'
import fs from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const uploadDir = join(__dirname, '..', '..', 'uploads')

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'led-trade-secret-key-2024'

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: '未授权' })
  try { req.user = jwt.verify(token, JWT_SECRET); next() }
  catch { res.status(401).json({ error: 'Token无效' }) }
}

// ─── Media Groups ───────────────────────────────────────────────────────────
router.get('/groups', authMiddleware, (req, res) => {
  const groups = getAll(`SELECT mg.*, (SELECT COUNT(*) FROM media m WHERE m.group_id=mg.id AND m.status=1) as image_count
                         FROM media_groups mg ORDER BY mg.sort_order, mg.name`)
  res.json(groups)
})

router.post('/groups', authMiddleware, (req, res) => {
  const { name, slug } = req.body
  if (!name) return res.status(400).json({ error: '请填写分组名称' })
  const maxSort = getOne('SELECT MAX(sort_order) as m FROM media_groups')
  const r = run('INSERT INTO media_groups (name, slug, sort_order) VALUES (?,?,?)',
    [name.trim(), (slug || name).toLowerCase().replace(/[^a-z0-9]+/g, '-'), (maxSort?.m || 0) + 1])
  res.json({ id: r.lastInsertRowid, message: '分组已创建' })
})

router.put('/groups/:id', authMiddleware, (req, res) => {
  const { name, slug } = req.body
  run('UPDATE media_groups SET name=?, slug=? WHERE id=?',
    [name?.trim(), (slug || name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'), req.params.id])
  res.json({ message: '分组已更新' })
})

router.delete('/groups/:id', authMiddleware, (req, res) => {
  const group = getOne('SELECT * FROM media_groups WHERE id=?', [req.params.id])
  if (!group) return res.status(404).json({ error: '分组不存在' })
  const count = getOne('SELECT COUNT(*) as c FROM media WHERE group_id=? AND status=1', [req.params.id])
  if (count.c > 0) return res.status(400).json({ error: `该分组下有 ${count.c} 张图片，请先移动或删除` })
  run('DELETE FROM media_groups WHERE id=?', [req.params.id])
  res.json({ message: '分组已删除' })
})

// ─── Media List ─────────────────────────────────────────────────────────────
router.get('/', authMiddleware, (req, res) => {
  const { page = 1, per_page = 30, group_id, folder_id, search } = req.query
  
  let whereFolders = 'WHERE 1=1'
  const paramsFolders = []

  let whereItems = 'WHERE m.status=1'
  const paramsItems = []

  if (search) {
    if (group_id) { 
      whereFolders += ' AND group_id=?'; paramsFolders.push(group_id)
      whereItems += ' AND m.group_id=?'; paramsItems.push(group_id) 
    }
    const terms = search.split('|').map(s => s.trim()).filter(Boolean)
    if (terms.length > 0) {
      const orsFolders = terms.map(() => 'name LIKE ?').join(' OR ')
      whereFolders += ` AND (${orsFolders})`
      terms.forEach(term => paramsFolders.push(`%${term}%`))

      const orsItems = terms.map(() => '(m.original_filename LIKE ? OR m.alt LIKE ? OR m.filename LIKE ?)').join(' OR ')
      whereItems += ` AND (${orsItems})`
      terms.forEach(term => paramsItems.push(`%${term}%`, `%${term}%`, `%${term}%`))
    }
  } else {
    if (folder_id) {
      whereFolders += ' AND 1=0'
      whereItems += ' AND m.folder_id=?'; paramsItems.push(folder_id)
    } else if (group_id) {
      whereFolders += ' AND group_id=?'; paramsFolders.push(group_id)
      whereItems += ' AND m.group_id=? AND m.folder_id IS NULL'; paramsItems.push(group_id)
    } else {
      whereFolders += ' AND 1=0'
    }
  }

  const folders = getAll(`SELECT mf.*, (SELECT COUNT(*) FROM media m WHERE m.folder_id=mf.id AND m.status=1) as image_count FROM media_folders mf ${whereFolders} ORDER BY mf.name`, paramsFolders)

  const total = getOne(`SELECT COUNT(*) as c FROM media m ${whereItems}`, paramsItems)
  const offset = (parseInt(page) - 1) * parseInt(per_page)
  const items = getAll(`SELECT m.*, mg.name as group_name,
    (SELECT COUNT(*) FROM product_images pi WHERE pi.media_id=m.id) as ref_count
    FROM media m LEFT JOIN media_groups mg ON mg.id=m.group_id
    ${whereItems} ORDER BY m.created_at DESC LIMIT ? OFFSET ?`,
    [...paramsItems, parseInt(per_page), offset])

  res.json({ folders, items, total: total.c, page: parseInt(page), per_page: parseInt(per_page) })
})

// ─── Media Folders ──────────────────────────────────────────────────────────
router.post('/folders', authMiddleware, (req, res) => {
  const { name, group_id } = req.body
  if (!name || !group_id) return res.status(400).json({ error: '请填写名称并选择分组' })
  const r = run('INSERT INTO media_folders (name, group_id) VALUES (?,?)', [name.trim(), group_id])
  res.json({ id: r.lastInsertRowid, message: '文件夹已创建' })
})

router.put('/folders/:id', authMiddleware, (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: '请填写名称' })
  run('UPDATE media_folders SET name=? WHERE id=?', [name.trim(), req.params.id])
  res.json({ message: '文件夹已更新' })
})

router.delete('/folders/:id', authMiddleware, (req, res) => {
  const count = getOne('SELECT COUNT(*) as c FROM media WHERE folder_id=? AND status=1', [req.params.id])
  if (count.c > 0) return res.status(400).json({ error: `该文件夹下有 ${count.c} 张图片，请先移动或删除` })
  run('DELETE FROM media_folders WHERE id=?', [req.params.id])
  res.json({ message: '文件夹已删除' })
})

// ─── Watermark Templates ───────────────────────────────────────────────────────
router.get('/watermark-templates', authMiddleware, (req, res) => {
  const templates = getAll('SELECT * FROM watermark_templates ORDER BY is_default DESC, created_at DESC')
  res.json(templates)
})

router.post('/watermark-templates', authMiddleware, (req, res) => {
  const { name, type, watermark_url, text_content, font_family, font_size, text_color, stroke_color, stroke_width, opacity, scale, pos_x, pos_y } = req.body
  if (!name) return res.status(400).json({ error: '请填写模板名称' })
  
  const hasTemplates = getOne('SELECT count(*) as c FROM watermark_templates').c > 0
  const isDefault = hasTemplates ? 0 : 1

  const r = run(`
    INSERT INTO watermark_templates (name, is_default, type, watermark_url, text_content, font_family, font_size, text_color, stroke_color, stroke_width, opacity, scale, pos_x, pos_y) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [name, isDefault, type || 'image', watermark_url || '', text_content || '', font_family || 'Arial', font_size || 0.05, text_color || '#000000', stroke_color || 'transparent', stroke_width || 0.02, opacity || 0.8, scale || 0.15, pos_x || 0.9, pos_y || 0.9])
  res.json({ id: r.lastInsertRowid, message: '水印模板已创建' })
})

router.put('/watermark-templates/:id', authMiddleware, (req, res) => {
  const { name, type, watermark_url, text_content, font_family, font_size, text_color, stroke_color, stroke_width, opacity, scale, pos_x, pos_y } = req.body
  run(`
    UPDATE watermark_templates 
    SET name=?, type=?, watermark_url=?, text_content=?, font_family=?, font_size=?, text_color=?, stroke_color=?, stroke_width=?, opacity=?, scale=?, pos_x=?, pos_y=?
    WHERE id=?
  `, [name, type, watermark_url, text_content, font_family, font_size, text_color, stroke_color, stroke_width, opacity, scale, pos_x, pos_y, req.params.id])
  res.json({ message: '水印模板已更新' })
})

router.delete('/watermark-templates/:id', authMiddleware, (req, res) => {
  run('DELETE FROM watermark_templates WHERE id=?', [req.params.id])
  res.json({ message: '模板已删除' })
})

router.put('/watermark-templates/:id/set-default', authMiddleware, (req, res) => {
  run('UPDATE watermark_templates SET is_default=0')
  run('UPDATE watermark_templates SET is_default=1 WHERE id=?', [req.params.id])
  res.json({ message: '已设置为默认模板' })
})

// ─── Media Detail ───────────────────────────────────────────────────────────
router.get('/:id', authMiddleware, (req, res) => {
  const item = getOne(`SELECT m.*, mg.name as group_name, mf.name as folder_name FROM media m
    LEFT JOIN media_groups mg ON mg.id=m.group_id 
    LEFT JOIN media_folders mf ON mf.id=m.folder_id
    WHERE m.id=?`, [req.params.id])
  if (!item) return res.status(404).json({ error: '图片不存在' })
  // Get references
  const refs = getAll(`SELECT pi.*, p.name_en, p.name FROM product_images pi
    LEFT JOIN products p ON p.id=pi.product_id WHERE pi.media_id=?`, [req.params.id])
  item.references = refs
  item.ref_count = refs.length
  res.json(item)
})

// ─── Upload (single or multi) ───────────────────────────────────────────────
router.post('/upload', authMiddleware, upload.array('files', 50), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: '请选择文件' })
  const groupId = req.body.group_id || null
  const folderId = req.body.folder_id || null

  let sharp = null
  try { const m = await import('sharp'); sharp = m.default } catch {}

  const results = []
  for (const file of req.files) {
    let filename = file.filename
    let filepath = `/uploads/${filename}`
    let width = 0, height = 0, filesize = file.size
    const skipExts = ['.svg', '.gif', '.ico']
    const ext = (file.originalname.match(/\.[^.]+$/) || ['.jpg'])[0].toLowerCase()

    // Compress to WebP if sharp available
    if (sharp && !skipExts.includes(ext)) {
      try {
        const newFilename = filename.replace(/\.[^.]+$/, '.webp')
        const newPath = join(uploadDir, newFilename)
        const meta = await sharp(file.path)
          .rotate() // Auto-orient based on EXIF
          .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82, effort: 4 })
          .toFile(newPath)
        fs.unlinkSync(file.path)
        filename = newFilename
        filepath = `/uploads/${newFilename}`
        width = meta.width
        height = meta.height
        filesize = meta.size
      } catch (e) {
        // Use original on failure
        try {
          const meta = await sharp(file.path).rotate().metadata()
          width = meta.width || 0; height = meta.height || 0
        } catch {}
      }
    } else if (sharp) {
      try {
        const meta = await sharp(file.path).metadata()
        width = meta.width || 0; height = meta.height || 0
      } catch {}
    }

    const r = run(`INSERT INTO media (original_filename, filename, filepath, mimetype, filesize, width, height, group_id, folder_id)
      VALUES (?,?,?,?,?,?,?,?,?)`,
      [file.originalname, filename, filepath, 'image/webp', filesize, width, height, groupId, folderId])
    results.push({ id: r.lastInsertRowid, filepath, filename, width, height, filesize })
  }
  res.json({ items: results, count: results.length })
})

// ─── Update Media ───────────────────────────────────────────────────────────
router.put('/:id', authMiddleware, (req, res) => {
  const { alt, group_id, folder_id, original_filename } = req.body
  const sets = []
  const params = []
  if (alt !== undefined) { sets.push('alt=?'); params.push(alt) }
  if (group_id !== undefined) { sets.push('group_id=?'); params.push(group_id || null) }
  if (folder_id !== undefined) { sets.push('folder_id=?'); params.push(folder_id || null) }
  if (original_filename !== undefined) { sets.push('original_filename=?'); params.push(original_filename) }
  if (sets.length) {
    sets.push("updated_at=datetime('now')")
    params.push(req.params.id)
    run(`UPDATE media SET ${sets.join(',')} WHERE id=?`, params)
  }
  res.json({ message: '已更新' })
})

// ─── Delete Media ───────────────────────────────────────────────────────────
router.delete('/:id', authMiddleware, (req, res) => {
  const item = getOne('SELECT * FROM media WHERE id=?', [req.params.id])
  if (!item) return res.status(404).json({ error: '图片不存在' })
  const refCount = getOne('SELECT COUNT(*) as c FROM product_images WHERE media_id=?', [req.params.id])
  if (refCount.c > 0 && !req.query.force) {
    return res.status(400).json({ error: `该图片被 ${refCount.c} 个商品引用，无法删除。若需强制删除请传 force=1` })
  }
  // Soft delete (keep file, mark status=0)
  run('UPDATE media SET status=0 WHERE id=?', [req.params.id])
  // Remove product_images references
  run('DELETE FROM product_images WHERE media_id=?', [req.params.id])
  res.json({ message: '图片已删除' })
})

// ─── Batch Operations ───────────────────────────────────────────────────────
router.post('/apply-watermark-batch', authMiddleware, async (req, res) => {
  const { urls, template_id } = req.body
  if (!urls || !Array.isArray(urls)) return res.status(400).json({ error: '请提供图片URL数组' })
  
  try {
    const results = []
    for (const url of urls) {
      if (template_id) {
        // applyWatermark automatically ignores non-images and returns the new url
        const finalUrl = await applyWatermark(url, template_id)
        results.push(finalUrl)
      } else {
        results.push(url)
      }
    }
    res.json({ urls: results })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/batch-move', authMiddleware, (req, res) => {
  const { ids, group_id, folder_id } = req.body
  if (!ids?.length) return res.status(400).json({ error: '请选择图片' })
  const placeholders = ids.map(() => '?').join(',')
  run(`UPDATE media SET group_id=?, folder_id=?, updated_at=datetime('now') WHERE id IN (${placeholders})`,
    [group_id || null, folder_id || null, ...ids])
  res.json({ message: `已移动 ${ids.length} 张图片` })
})

router.post('/batch-delete', authMiddleware, (req, res) => {
  const { ids } = req.body
  if (!ids?.length) return res.status(400).json({ error: '请选择图片' })
  // Check refs
  const placeholders = ids.map(() => '?').join(',')
  const refsCount = getOne(`SELECT COUNT(*) as c FROM product_images WHERE media_id IN (${placeholders})`, ids)
  if (refsCount.c > 0) return res.status(400).json({ error: `选中图片中有 ${refsCount.c} 条引用记录，请先解除引用` })
  run(`UPDATE media SET status=0 WHERE id IN (${placeholders})`, ids)
  res.json({ message: `已删除 ${ids.length} 张图片` })
})

// ─── Replace Image ──────────────────────────────────────────────────────────
router.post('/:id/replace', authMiddleware, upload.single('file'), async (req, res) => {
  const oldMedia = getOne('SELECT * FROM media WHERE id=?', [req.params.id])
  if (!oldMedia) return res.status(404).json({ error: '图片不存在' })

  let sharp = null
  try { const m = await import('sharp'); sharp = m.default } catch {}

  if (req.file) {
    // Upload new file
    let filename = req.file.filename
    let filepath = `/uploads/${filename}`
    let width = 0, height = 0, filesize = req.file.size
    const ext = (req.file.originalname.match(/\.[^.]+$/) || ['.jpg'])[0].toLowerCase()

    if (sharp && !['.svg', '.gif', '.ico'].includes(ext)) {
      try {
        const newFilename = filename.replace(/\.[^.]+$/, '.webp')
        const newPath = join(uploadDir, newFilename)
        const meta = await sharp(req.file.path)
          .rotate() // Auto-orient based on EXIF
          .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82, effort: 4 })
          .toFile(newPath)
        fs.unlinkSync(req.file.path)
        filename = newFilename
        filepath = `/uploads/${newFilename}`
        width = meta.width; height = meta.height; filesize = meta.size
      } catch {}
    }

    // Update media record
    run(`UPDATE media SET filename=?, filepath=?, filesize=?, width=?, height=?,
      original_filename=?, updated_at=datetime('now') WHERE id=?`,
      [filename, filepath, filesize, width, height, req.file.originalname, req.params.id])

    // Update all product_images references that used the old URL
    run('UPDATE product_images SET image_url=? WHERE media_id=?', [filepath, req.params.id])

    // Update rich text references in products and news
    const oldUrl = oldMedia.filepath
    if (oldUrl && oldUrl !== filepath) {
      run("UPDATE products SET detail_content=REPLACE(detail_content, ?, ?) WHERE detail_content LIKE ?",
        [oldUrl, filepath, `%${oldUrl}%`])
      run("UPDATE products SET images=REPLACE(images, ?, ?) WHERE images LIKE ?",
        [oldUrl, filepath, `%${oldUrl}%`])
      try {
        run("UPDATE news SET content=REPLACE(content, ?, ?) WHERE content LIKE ?",
          [oldUrl, filepath, `%${oldUrl}%`])
      } catch {}
    }

    res.json({ message: '图片已替换', filepath, old_filepath: oldUrl })
  } else if (req.body.replace_with_id) {
    // Replace with another existing media item
    const newMedia = getOne('SELECT * FROM media WHERE id=?', [req.body.replace_with_id])
    if (!newMedia) return res.status(404).json({ error: '替换目标图片不存在' })

    // Update all references from old to new
    run('UPDATE product_images SET media_id=?, image_url=? WHERE media_id=?',
      [newMedia.id, newMedia.filepath, req.params.id])
    // Mark old as replaced
    run("UPDATE media SET replaced_by=?, updated_at=datetime('now') WHERE id=?",
      [newMedia.id, req.params.id])
    // Update rich text
    const oldUrl = oldMedia.filepath
    if (oldUrl && oldUrl !== newMedia.filepath) {
      run("UPDATE products SET detail_content=REPLACE(detail_content, ?, ?) WHERE detail_content LIKE ?",
        [oldUrl, newMedia.filepath, `%${oldUrl}%`])
      run("UPDATE products SET images=REPLACE(images, ?, ?) WHERE images LIKE ?",
        [oldUrl, newMedia.filepath, `%${oldUrl}%`])
      try {
        run("UPDATE news SET content=REPLACE(content, ?, ?) WHERE content LIKE ?",
          [oldUrl, newMedia.filepath, `%${oldUrl}%`])
      } catch {}
    }
    res.json({ message: '图片引用已替换', new_filepath: newMedia.filepath, old_filepath: oldUrl })
  } else {
    res.status(400).json({ error: '请上传新文件或指定替换目标' })
  }
})

// ─── Batch Rename ───────────────────────────────────────────────────────────
router.post('/batch-rename', authMiddleware, async (req, res) => {
  const { ids, prefix } = req.body
  if (!ids?.length) return res.status(400).json({ error: '请选择要重命名的图片' })
  if (!prefix) return res.status(400).json({ error: '请输入重命名前缀' })

  // Format prefix: lower case, replace non-alphanumeric with hyphen, remove consecutive hyphens
  const baseName = prefix.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  
  if (!baseName) return res.status(400).json({ error: '前缀只包含无效字符' })

  let successCount = 0
  let errorCount = 0
  const errors = []

  // Global replace tables
  const tablesToUpdate = [
    { table: 'products', columns: ['detail_content', 'images'] },
    { table: 'news', columns: ['content', 'cover_image'] },
    { table: 'categories', columns: ['image'] },
    { table: 'hero_slides', columns: ['image_url'] },
    { table: 'company', columns: ['about_image', 'logo', 'favicon', 'whatsapp_qr', 'wechat_qr'] },
    { table: 'banners', columns: ['image'] },
    { table: 'seo_settings', columns: ['og_image'] }
  ]

  // Start renaming
  for (let i = 0; i < ids.length; i++) {
    const mediaId = ids[i]
    const media = getOne('SELECT * FROM media WHERE id=?', [mediaId])
    if (!media) {
      errorCount++
      errors.push({ id: mediaId, reason: '记录不存在' })
      continue
    }

    const oldPath = join(uploadDir, media.filename)
    if (!fs.existsSync(oldPath)) {
      errorCount++
      errors.push({ id: mediaId, reason: '物理文件丢失' })
      continue
    }

    const ext = (media.filename.match(/\.[^.]+$/) || ['.jpg'])[0].toLowerCase()
    
    // Find next available filename
    let counter = i + 1
    let newFilename = `${baseName}-${counter}${ext}`
    let newPath = join(uploadDir, newFilename)
    
    // Ensure filename is unique on disk AND in DB
    while (fs.existsSync(newPath) || getOne('SELECT id FROM media WHERE filename=?', [newFilename])) {
      counter++
      newFilename = `${baseName}-${counter}${ext}`
      newPath = join(uploadDir, newFilename)
    }

    try {
      // 1. Rename physical file
      fs.renameSync(oldPath, newPath)

      const oldFilepath = media.filepath
      const newFilepath = `/uploads/${newFilename}`

      // 2. Update media table
      run(`UPDATE media SET filename=?, original_filename=?, filepath=?, updated_at=datetime('now') WHERE id=?`,
        [newFilename, newFilename, newFilepath, media.id])

      // 3. Update product_images references
      run('UPDATE product_images SET image_url=? WHERE image_url=?', [newFilepath, oldFilepath])

      // 4. Update rich text globally
      for (const t of tablesToUpdate) {
        for (const col of t.columns) {
          try {
            run(`UPDATE ${t.table} SET ${col}=REPLACE(${col}, ?, ?) WHERE ${col} LIKE ?`,
              [oldFilepath, newFilepath, `%${oldFilepath}%`])
          } catch (e) { } // ignore missing columns
        }
      }

      successCount++
    } catch (e) {
      console.error('Rename error:', e)
      errorCount++
      errors.push({ id: mediaId, reason: e.message })
    }
  }

  res.json({ message: '重命名完成', successCount, errorCount, errors })
})

// ─── Batch Optimize All Historical Images (Disk-based) ──────────────────────────
router.post('/optimize-all', authMiddleware, async (req, res) => {
  let sharp = null
  try { const m = await import('sharp'); sharp = m.default } catch {}
  if (!sharp) return res.status(500).json({ error: '服务器未安装 sharp 图像处理库，无法压缩' })

  let files = []
  try {
    files = fs.readdirSync(uploadDir)
  } catch (e) {
    return res.status(500).json({ error: '无法读取上传目录' })
  }

  // Target legacy image formats
  const targetExts = ['.jpg', '.jpeg', '.png', '.bmp']
  const imagesToOptimize = files.filter(f => targetExts.includes(f.match(/\.[^.]+$/)?.[0].toLowerCase()))

  if (imagesToOptimize.length === 0) {
    return res.json({ message: '没有需要优化的图片', total: 0, successCount: 0, errorCount: 0, errors: [] })
  }

  let successCount = 0
  let errorCount = 0
  let errors = []

  for (const filename of imagesToOptimize) {
    const oldPath = join(uploadDir, filename)
    const newFilename = filename.replace(/\.[^.]+$/, '.webp')
    const newPath = join(uploadDir, newFilename)

    try {
      const meta = await sharp(oldPath)
        .rotate() // Auto-orient based on EXIF
        .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85, effort: 4 })
        .toFile(newPath)

      const oldFilepath = `/uploads/${filename}`
      const newFilepath = `/uploads/${newFilename}`

      // 1. Update media table
      run(`UPDATE media SET filename=?, filepath=?, mimetype=?, filesize=?, width=?, height=?, updated_at=datetime('now') WHERE filepath=?`,
        [newFilename, newFilepath, 'image/webp', meta.size, meta.width, meta.height, oldFilepath])

      // 2. Update product_images table
      run('UPDATE product_images SET image_url=? WHERE image_url=?', [newFilepath, oldFilepath])

      // 3. Update rich text globally
      const tablesToUpdate = [
        { table: 'products', columns: ['detail_content', 'images'] },
        { table: 'news', columns: ['content', 'cover_image'] },
        { table: 'categories', columns: ['image'] },
        { table: 'hero_slides', columns: ['image_url'] },
        { table: 'company', columns: ['about_image', 'logo', 'favicon', 'whatsapp_qr', 'wechat_qr'] },
        { table: 'banners', columns: ['image'] },
        { table: 'seo_settings', columns: ['og_image'] }
      ]

      for (const t of tablesToUpdate) {
        for (const col of t.columns) {
          try {
            run(`UPDATE ${t.table} SET ${col}=REPLACE(${col}, ?, ?) WHERE ${col} LIKE ?`,
              [oldFilepath, newFilepath, `%${oldFilepath}%`])
          } catch (e) {
            // ignore missing columns during global replace
          }
        }
      }

      // Delete original file
      fs.unlinkSync(oldPath)
      successCount++
    } catch (err) {
      console.error(`Failed to optimize ${filename}:`, err)
      errorCount++
      errors.push({ filename, reason: err.message })
    }
  }

  res.json({ message: '优化完成', successCount, errorCount, total: imagesToOptimize.length, errors })
})

export default router
