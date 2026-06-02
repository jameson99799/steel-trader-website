import express from 'express'
import { run, getAll, getOne } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()

// Track round-robin index for auto-replies and welcome presets
let autoReplyIndex = 0
let welcomePresetIndex = 0

// ── Admin: Settings ──────────────────────────────────────────
router.get('/admin/settings', authMiddleware, (req, res) => {
  const settings = getOne('SELECT * FROM live_chat_settings WHERE id = 1')
  res.json(settings || {})
})

router.put('/admin/settings', authMiddleware, (req, res) => {
  const { widget_enabled, auto_reply_enabled, start_time, end_time, auto_collapse_seconds } = req.body
  run(`UPDATE live_chat_settings SET widget_enabled=?, auto_reply_enabled=?, start_time=?, end_time=?, auto_collapse_seconds=?, updated_at=datetime('now') WHERE id=1`,
      [widget_enabled ? 1 : 0, auto_reply_enabled ? 1 : 0, start_time, end_time, auto_collapse_seconds || 10])
  res.json({ success: true })
})

// ── Admin: Auto-Reply Messages (CRUD) ────────────────────────
router.get('/admin/auto-replies', authMiddleware, (req, res) => {
  const replies = getAll('SELECT * FROM chat_auto_replies ORDER BY sort_order ASC, id ASC')
  res.json(replies)
})

router.post('/admin/auto-replies', authMiddleware, (req, res) => {
  const { content, enabled } = req.body
  if (!content) return res.status(400).json({ error: 'Content required' })
  const result = run('INSERT INTO chat_auto_replies (content, enabled) VALUES (?, ?)', [content, enabled ? 1 : 0])
  res.json({ success: true, id: result.lastInsertRowid })
})

router.put('/admin/auto-replies/:id', authMiddleware, (req, res) => {
  const { content, enabled } = req.body
  run('UPDATE chat_auto_replies SET content=?, enabled=? WHERE id=?', [content, enabled ? 1 : 0, req.params.id])
  res.json({ success: true })
})

router.delete('/admin/auto-replies/:id', authMiddleware, (req, res) => {
  run('DELETE FROM chat_auto_replies WHERE id=?', [req.params.id])
  res.json({ success: true })
})

// ── Admin: Welcome Presets (CRUD) ────────────────────────────
router.get('/admin/welcome-presets', authMiddleware, (req, res) => {
  const presets = getAll('SELECT * FROM chat_welcome_presets ORDER BY sort_order ASC, id ASC')
  // Parse buttons JSON
  const parsed = presets.map(p => ({ ...p, buttons: JSON.parse(p.buttons || '[]') }))
  res.json(parsed)
})

router.post('/admin/welcome-presets', authMiddleware, (req, res) => {
  const { greeting, greeting_en, buttons, enabled } = req.body
  if (!greeting) return res.status(400).json({ error: 'Greeting required' })
  const result = run('INSERT INTO chat_welcome_presets (greeting, greeting_en, buttons, enabled) VALUES (?, ?, ?, ?)',
    [greeting, greeting_en || '', JSON.stringify(buttons || []), enabled ? 1 : 0])
  res.json({ success: true, id: result.lastInsertRowid })
})

router.put('/admin/welcome-presets/:id', authMiddleware, (req, res) => {
  const { greeting, greeting_en, buttons, enabled } = req.body
  run('UPDATE chat_welcome_presets SET greeting=?, greeting_en=?, buttons=?, enabled=? WHERE id=?',
    [greeting, greeting_en || '', JSON.stringify(buttons || []), enabled ? 1 : 0, req.params.id])
  res.json({ success: true })
})

router.delete('/admin/welcome-presets/:id', authMiddleware, (req, res) => {
  run('DELETE FROM chat_welcome_presets WHERE id=?', [req.params.id])
  res.json({ success: true })
})

// ── Admin: Chat History ──────────────────────────────────────
router.get('/admin/messages', authMiddleware, (req, res) => {
  const visitorId = req.query.visitor_id
  if (visitorId) {
    const msgs = getAll('SELECT * FROM live_chat_messages WHERE visitor_id = ? ORDER BY timestamp ASC', [visitorId])
    res.json(msgs)
  } else {
    const visitors = getAll(`
      SELECT m.* FROM live_chat_messages m
      INNER JOIN (
        SELECT visitor_id, MAX(id) as max_id FROM live_chat_messages GROUP BY visitor_id
      ) grouped ON m.id = grouped.max_id
      ORDER BY m.timestamp DESC
    `)
    res.json(visitors)
  }
})

// ── Admin: Page Options for Button URL Dropdown ──────────────
router.get('/admin/page-options', authMiddleware, (req, res) => {
  const options = [
    { group: '主要页面', items: [
      { label: '首页', label_en: 'Home', url: '/' },
      { label: '产品中心', label_en: 'Products', url: '/products' },
      { label: '新闻资讯', label_en: 'News', url: '/news' },
      { label: '关于我们', label_en: 'About Us', url: '/about' },
      { label: '联系我们', label_en: 'Contact', url: '/contact' },
      { label: '工厂展示', label_en: 'Factory', url: '/factory' },
      { label: 'RAL颜色', label_en: 'RAL Colors', url: '/news/ral-colors' },
      { label: '屋顶型材', label_en: 'Roofing Profiles', url: '/news/roofing-profiles' },
      { label: '期货价格', label_en: 'Futures Price', url: '/news/futures-price' },
    ]},
  ]

  // Dynamic: Product Categories
  try {
    const cats = getAll('SELECT id, name, name_en, slug FROM categories ORDER BY sort_order ASC')
    if (cats.length > 0) {
      options.push({
        group: '产品分类',
        items: cats.map(c => ({
          label: c.name || c.name_en,
          label_en: c.name_en || c.name,
          url: `/products/category/${c.slug || c.id}`
        }))
      })
    }
  } catch (e) { /* categories table may not exist */ }

  // Dynamic: News Categories
  try {
    const newsCats = getAll('SELECT id, name, name_en, slug FROM news_categories ORDER BY sort_order ASC')
    if (newsCats.length > 0) {
      options.push({
        group: '新闻分类',
        items: newsCats.map(c => ({
          label: c.name || c.name_en,
          label_en: c.name_en || c.name,
          url: `/news/category/${c.slug || c.id}`
        }))
      })
    }
  } catch (e) { /* news_categories table may not exist */ }

  // External links
  options.push({
    group: '外部链接',
    items: [
      { label: 'WhatsApp', label_en: 'WhatsApp', url: 'https://wa.me/' },
      { label: 'Email', label_en: 'Email', url: 'mailto:' },
    ]
  })

  res.json(options)
})

router.post('/admin/messages', authMiddleware, (req, res) => {
  const { visitor_id, content } = req.body
  run('INSERT INTO live_chat_messages (visitor_id, sender_type, content) VALUES (?, ?, ?)', [visitor_id, 'admin', content])
  res.json({ success: true })
})

// ── Public: Widget Config (no auth) ─────────────────────────
router.get('/widget-config', (req, res) => {
  const settings = getOne('SELECT widget_enabled, auto_collapse_seconds FROM live_chat_settings WHERE id = 1')
  if (!settings || !settings.widget_enabled) {
    return res.json({ enabled: false })
  }

  // Get enabled welcome presets with round-robin
  const presets = getAll('SELECT * FROM chat_welcome_presets WHERE enabled = 1 ORDER BY sort_order ASC, id ASC')
  let activePreset = null
  if (presets.length > 0) {
    activePreset = presets[welcomePresetIndex % presets.length]
    welcomePresetIndex++
    activePreset.buttons = JSON.parse(activePreset.buttons || '[]')
  }

  res.json({
    enabled: true,
    auto_collapse_seconds: settings.auto_collapse_seconds || 10,
    welcome_preset: activePreset
  })
})

// ── Public: Visitor API ──────────────────────────────────────
router.post('/send', (req, res) => {
  const { visitor_id, content } = req.body
  if (!visitor_id || !content) return res.status(400).json({ error: 'Missing fields' })

  run('INSERT INTO live_chat_messages (visitor_id, sender_type, content) VALUES (?, ?, ?)', [visitor_id, 'visitor', content])

  // Check auto-reply logic
  const settings = getOne('SELECT * FROM live_chat_settings WHERE id = 1')
  if (settings && settings.auto_reply_enabled) {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMin = now.getMinutes()
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`

    let isOfflineTime = false
    if (settings.start_time <= settings.end_time) {
      isOfflineTime = currentTimeStr >= settings.start_time && currentTimeStr <= settings.end_time
    } else {
      isOfflineTime = currentTimeStr >= settings.start_time || currentTimeStr <= settings.end_time
    }

    if (isOfflineTime) {
      // Get enabled auto replies and rotate
      const replies = getAll('SELECT * FROM chat_auto_replies WHERE enabled = 1 ORDER BY sort_order ASC, id ASC')
      if (replies.length > 0) {
        const reply = replies[autoReplyIndex % replies.length]
        autoReplyIndex++
        run('INSERT INTO live_chat_messages (visitor_id, sender_type, content) VALUES (?, ?, ?)', [visitor_id, 'admin', reply.content])
      }
    }
  }

  res.json({ success: true })
})

router.get('/poll', (req, res) => {
  const { visitor_id, last_id } = req.query
  if (!visitor_id) return res.status(400).json({ error: 'Missing visitor_id' })

  const queryLastId = parseInt(last_id) || 0
  const msgs = getAll('SELECT * FROM live_chat_messages WHERE visitor_id = ? AND id > ? ORDER BY timestamp ASC', [visitor_id, queryLastId])

  if (msgs.length > 0) {
    run('UPDATE live_chat_messages SET is_read = 1 WHERE visitor_id = ? AND sender_type = "admin" AND id > ?', [visitor_id, queryLastId])
  }

  res.json(msgs)
})

export default router
