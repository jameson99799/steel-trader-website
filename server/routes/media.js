import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { getAll, getOne, run } from '../db.js'
import { upload, compressImage } from '../middleware/upload.js'
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
  run('UPDATE media_groups SET name=?, slug=? WHERE id=? AND is_system=0',
    [name?.trim(), (slug || name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'), req.params.id])
  res.json({ message: '分组已更新' })
})

router.delete('/groups/:id', authMiddleware, (req, res) => {
  const group = getOne('SELECT * FROM media_groups WHERE id=?', [req.params.id])
  if (!group) return res.status(404).json({ error: '分组不存在' })
  if (group.is_system) return res.status(400).json({ error: '系统默认分组不能删除' })
  const count = getOne('SELECT COUNT(*) as c FROM media WHERE group_id=? AND status=1', [req.params.id])
  if (count.c > 0) return res.status(400).json({ error: `该分组下有 ${count.c} 张图片，请先移动或删除` })
  run('DELETE FROM media_groups WHERE id=?', [req.params.id])
  res.json({ message: '分组已删除' })
})

// ─── Media List ─────────────────────────────────────────────────────────────
router.get('/', authMiddleware, (req, res) => {
  const { page = 1, per_page = 30, group_id, search } = req.query
  let where = 'WHERE m.status=1'
  const params = []
  if (group_id) { where += ' AND m.group_id=?'; params.push(group_id) }
  if (search) { where += ' AND (m.original_filename LIKE ? OR m.alt LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }

  const total = getOne(`SELECT COUNT(*) as c FROM media m ${where}`, params)
  const offset = (parseInt(page) - 1) * parseInt(per_page)
  const items = getAll(`SELECT m.*, mg.name as group_name,
    (SELECT COUNT(*) FROM product_images pi WHERE pi.media_id=m.id) as ref_count
    FROM media m LEFT JOIN media_groups mg ON mg.id=m.group_id
    ${where} ORDER BY m.created_at DESC LIMIT ? OFFSET ?`,
    [...params, parseInt(per_page), offset])

  res.json({ items, total: total.c, page: parseInt(page), per_page: parseInt(per_page) })
})

// ─── Media Detail ───────────────────────────────────────────────────────────
router.get('/:id', authMiddleware, (req, res) => {
  const item = getOne(`SELECT m.*, mg.name as group_name FROM media m
    LEFT JOIN media_groups mg ON mg.id=m.group_id WHERE m.id=?`, [req.params.id])
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
          const meta = await sharp(file.path).metadata()
          width = meta.width || 0; height = meta.height || 0
        } catch {}
      }
    } else if (sharp) {
      try {
        const meta = await sharp(file.path).metadata()
        width = meta.width || 0; height = meta.height || 0
      } catch {}
    }

    const r = run(`INSERT INTO media (original_filename, filename, filepath, mimetype, filesize, width, height, group_id)
      VALUES (?,?,?,?,?,?,?,?)`,
      [file.originalname, filename, filepath, 'image/webp', filesize, width, height, groupId])
    results.push({ id: r.lastInsertRowid, filepath, filename, width, height, filesize })
  }
  res.json({ items: results, count: results.length })
})

// ─── Update Media ───────────────────────────────────────────────────────────
router.put('/:id', authMiddleware, (req, res) => {
  const { alt, group_id, original_filename } = req.body
  const sets = []
  const params = []
  if (alt !== undefined) { sets.push('alt=?'); params.push(alt) }
  if (group_id !== undefined) { sets.push('group_id=?'); params.push(group_id || null) }
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
router.post('/batch-move', authMiddleware, (req, res) => {
  const { ids, group_id } = req.body
  if (!ids?.length) return res.status(400).json({ error: '请选择图片' })
  const placeholders = ids.map(() => '?').join(',')
  run(`UPDATE media SET group_id=?, updated_at=datetime('now') WHERE id IN (${placeholders})`,
    [group_id || null, ...ids])
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

export default router
