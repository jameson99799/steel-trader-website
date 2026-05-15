import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { getAll, getOne, run } from '../db.js'
import { applyWatermark } from '../utils/watermark.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'led-trade-secret-key-2024'

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: '未授权' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Token无效' })
  }
}

// ==========================================
// PUBLIC ENDPOINTS (For frontend display)
// ==========================================

router.get('/public', (req, res) => {
  try {
    const groups = getAll('SELECT * FROM factory_groups ORDER BY sort_order ASC, id ASC')
    const media = getAll('SELECT * FROM factory_media ORDER BY sort_order ASC, id ASC')
    
    // Attach media to groups
    const result = groups.map(g => {
      return {
        ...g,
        type: 'factory_group',
        items: media.filter(m => m.group_id === g.id)
      }
    })
    
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ==========================================
// ADMIN ENDPOINTS (Protected)
// ==========================================

// Get all groups with media
router.get('/', authMiddleware, (req, res) => {
  try {
    const groups = getAll('SELECT * FROM factory_groups ORDER BY sort_order ASC, id ASC')
    const media = getAll('SELECT * FROM factory_media ORDER BY sort_order ASC, id ASC')
    
    const result = groups.map(g => ({
      ...g,
      type: 'factory_group',
      items: media.filter(m => m.group_id === g.id)
    }))
    
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Create a group
router.post('/groups', authMiddleware, (req, res) => {
  const { name, name_en, sort_order, carousel_enabled, carousel_speed } = req.body
  if (!name) return res.status(400).json({ error: '请填写分组名称' })
  
  try {
    const r = run(`
      INSERT INTO factory_groups (name, name_en, sort_order, carousel_enabled, carousel_speed)
      VALUES (?, ?, ?, ?, ?)
    `, [name, name_en || '', sort_order || 0, carousel_enabled ? 1 : 0, carousel_speed || 3])
    
    res.json({ id: r.lastInsertRowid, message: '分组已创建' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Update a group
router.put('/groups/:id', authMiddleware, (req, res) => {
  const { name, name_en, sort_order, carousel_enabled, carousel_speed } = req.body
  try {
    run(`
      UPDATE factory_groups 
      SET name = ?, name_en = ?, sort_order = ?, carousel_enabled = ?, carousel_speed = ?
      WHERE id = ?
    `, [name, name_en || '', sort_order || 0, carousel_enabled ? 1 : 0, carousel_speed || 3, req.params.id])
    
    res.json({ message: '分组已更新' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Delete a group
router.delete('/groups/:id', authMiddleware, (req, res) => {
  try {
    run('DELETE FROM factory_media WHERE group_id = ?', [req.params.id])
    run('DELETE FROM factory_groups WHERE id = ?', [req.params.id])
    res.json({ message: '分组已删除' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Add media to group
router.post('/media', authMiddleware, async (req, res) => {
  const { group_id, type, media_url, sort_order, autoplay, apply_watermark } = req.body
  if (!group_id || !type || !media_url) return res.status(400).json({ error: '参数不完整' })
  
  try {
    let finalUrl = media_url
    if (type === 'image' && apply_watermark) {
      finalUrl = await applyWatermark(media_url)
    }

    const r = run(`
      INSERT INTO factory_media (group_id, type, media_url, sort_order, autoplay)
      VALUES (?, ?, ?, ?, ?)
    `, [group_id, type, finalUrl, sort_order || 0, autoplay ? 1 : 0])
    
    res.json({ id: r.lastInsertRowid, message: '媒体已添加', media_url: finalUrl })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Batch Watermark Media
router.post('/groups/:id/batch-watermark', authMiddleware, async (req, res) => {
  const { media_ids, template_id } = req.body
  if (!media_ids || !Array.isArray(media_ids) || media_ids.length === 0) {
    return res.status(400).json({ error: '未选择任何图片' })
  }
  
  try {
    let successCount = 0
    for (const mid of media_ids) {
      const media = getOne("SELECT * FROM factory_media WHERE id = ? AND group_id = ? AND type = 'image'", [mid, req.params.id])
      if (media && media.media_url) {
        const finalUrl = await applyWatermark(media.media_url, template_id || null)
        if (finalUrl !== media.media_url) {
          run('UPDATE factory_media SET media_url = ? WHERE id = ?', [finalUrl, mid])
          successCount++
        }
      }
    }
    res.json({ message: `批量处理完成，共处理 ${successCount} 张图片` })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Update media
router.put('/media/:id', authMiddleware, (req, res) => {
  const { sort_order, autoplay, media_url } = req.body
  try {
    run(`
      UPDATE factory_media 
      SET sort_order = ?, autoplay = ?, media_url = ?
      WHERE id = ?
    `, [sort_order || 0, autoplay ? 1 : 0, media_url, req.params.id])
    
    res.json({ message: '媒体已更新' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Delete media
router.delete('/media/:id', authMiddleware, (req, res) => {
  try {
    run('DELETE FROM factory_media WHERE id = ?', [req.params.id])
    res.json({ message: '媒体已删除' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
