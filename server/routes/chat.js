import express from 'express'
import { run, getAll, getOne } from '../db.js'
import { getWechatStatus, logoutWechat, sendWechatMessage } from '../utils/wechatBot.js'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()

// ── Admin: WeChat Bot Status & Control ─────────────────────────
router.get('/admin/status', authMiddleware, (req, res) => {
  res.json(getWechatStatus())
})

router.post('/admin/logout', authMiddleware, async (req, res) => {
  await logoutWechat()
  res.json({ success: true })
})

// ── Admin: Settings ──────────────────────────────────────────
router.get('/admin/settings', authMiddleware, (req, res) => {
  const settings = getOne('SELECT * FROM live_chat_settings WHERE id = 1')
  res.json(settings || {})
})

router.put('/admin/settings', authMiddleware, (req, res) => {
  const { auto_reply_enabled, start_time, end_time, global_enabled, auto_close_seconds } = req.body
  run(`UPDATE live_chat_settings SET auto_reply_enabled=?, start_time=?, end_time=?, global_enabled=?, auto_close_seconds=?, updated_at=datetime('now') WHERE id=1`, 
      [auto_reply_enabled ? 1 : 0, start_time, end_time, global_enabled ? 1 : 0, auto_close_seconds || 0])
  res.json({ success: true })
})

// ── Admin: Auto Replies ──────────────────────────────────────
router.get('/admin/auto-replies', authMiddleware, (req, res) => {
  const replies = getAll('SELECT * FROM live_chat_auto_replies ORDER BY id ASC')
  res.json(replies)
})

router.post('/admin/auto-replies', authMiddleware, (req, res) => {
  const { content, is_active } = req.body
  const info = run('INSERT INTO live_chat_auto_replies (content, is_active) VALUES (?, ?)', [content, is_active ? 1 : 0])
  res.json({ id: info.lastInsertRowid })
})

router.put('/admin/auto-replies/:id', authMiddleware, (req, res) => {
  const { content, is_active } = req.body
  run('UPDATE live_chat_auto_replies SET content=?, is_active=? WHERE id=?', [content, is_active ? 1 : 0, req.params.id])
  res.json({ success: true })
})

router.delete('/admin/auto-replies/:id', authMiddleware, (req, res) => {
  run('DELETE FROM live_chat_auto_replies WHERE id=?', [req.params.id])
  res.json({ success: true })
})

// ── Admin: Greetings ─────────────────────────────────────────
router.get('/admin/greetings', authMiddleware, (req, res) => {
  const greetings = getAll('SELECT * FROM live_chat_greetings ORDER BY id ASC')
  res.json(greetings)
})

router.post('/admin/greetings', authMiddleware, (req, res) => {
  const { lang, content, buttons_json, is_active } = req.body
  const info = run('INSERT INTO live_chat_greetings (lang, content, buttons_json, is_active) VALUES (?, ?, ?, ?)', [lang || 'en', content, buttons_json || '[]', is_active ? 1 : 0])
  res.json({ id: info.lastInsertRowid })
})

router.put('/admin/greetings/:id', authMiddleware, (req, res) => {
  const { lang, content, buttons_json, is_active } = req.body
  run('UPDATE live_chat_greetings SET lang=?, content=?, buttons_json=?, is_active=? WHERE id=?', [lang, content, buttons_json, is_active ? 1 : 0, req.params.id])
  res.json({ success: true })
})

router.delete('/admin/greetings/:id', authMiddleware, (req, res) => {
  run('DELETE FROM live_chat_greetings WHERE id=?', [req.params.id])
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

router.post('/admin/messages', authMiddleware, async (req, res) => {
  const { visitor_id, content } = req.body
  run('INSERT INTO live_chat_messages (visitor_id, sender_type, content) VALUES (?, ?, ?)', [visitor_id, 'admin', content])
  await sendWechatMessage(`Replied to visitor ${visitor_id}:\n${content}`)
  res.json({ success: true })
})

// ── Public: Visitor API ──────────────────────────────────────

router.get('/settings', (req, res) => {
  const settings = getOne('SELECT global_enabled, auto_close_seconds FROM live_chat_settings WHERE id = 1')
  res.json(settings || { global_enabled: 1, auto_close_seconds: 0 })
})

router.post('/init', (req, res) => {
  const { visitor_id, lang } = req.body
  if (!visitor_id) return res.status(400).json({ error: 'Missing visitor_id' })
  
  const hasHistory = getOne('SELECT id FROM live_chat_messages WHERE visitor_id = ? LIMIT 1', [visitor_id])
  if (hasHistory) return res.json({ new_session: false })

  // Find greetings for this language
  const greetings = getAll('SELECT * FROM live_chat_greetings WHERE is_active = 1 AND lang = ? ORDER BY id ASC', [lang || 'en'])
  if (greetings.length > 0) {
    const settings = getOne('SELECT greeting_index FROM live_chat_settings WHERE id = 1')
    let gIdx = settings.greeting_index || 0
    if (gIdx >= greetings.length) gIdx = 0
    
    const selectedGreeting = greetings[gIdx]
    run('INSERT INTO live_chat_messages (visitor_id, sender_type, content, buttons_json) VALUES (?, ?, ?, ?)', 
      [visitor_id, 'admin', selectedGreeting.content, selectedGreeting.buttons_json || '[]'])
      
    // Increment index
    run('UPDATE live_chat_settings SET greeting_index = ? WHERE id = 1', [(gIdx + 1) % greetings.length])
    return res.json({ new_session: true, greeting_sent: true })
  }
  
  res.json({ new_session: true, greeting_sent: false })
})

router.post('/send', async (req, res) => {
  const { visitor_id, content } = req.body
  if (!visitor_id || !content) return res.status(400).json({ error: 'Missing fields' })

  // Save visitor message
  run('INSERT INTO live_chat_messages (visitor_id, sender_type, content) VALUES (?, ?, ?)', [visitor_id, 'visitor', content])

  // Forward to WeChat (Admin)
  await sendWechatMessage(`Visitor [${visitor_id}]:\n${content}`)

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
      const autoReplies = getAll('SELECT * FROM live_chat_auto_replies WHERE is_active = 1 ORDER BY id ASC')
      if (autoReplies.length > 0) {
        let rIdx = settings.auto_reply_index || 0
        if (rIdx >= autoReplies.length) rIdx = 0
        const selectedReply = autoReplies[rIdx]
        
        // Save auto reply
        run('INSERT INTO live_chat_messages (visitor_id, sender_type, content) VALUES (?, ?, ?)', [visitor_id, 'admin', selectedReply.content])
        await sendWechatMessage(`Auto-replied to visitor [${visitor_id}]:\n${selectedReply.content}`)
        
        // Increment index
        run('UPDATE live_chat_settings SET auto_reply_index = ? WHERE id = 1', [(rIdx + 1) % autoReplies.length])
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
  
  // Mark as read
  if (msgs.length > 0) {
    run('UPDATE live_chat_messages SET is_read = 1 WHERE visitor_id = ? AND sender_type = "admin" AND id > ?', [visitor_id, queryLastId])
  }
  
  res.json(msgs)
})

export default router
