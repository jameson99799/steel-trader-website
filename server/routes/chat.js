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
  const { auto_reply_enabled, start_time, end_time, reply_text } = req.body
  run(`UPDATE live_chat_settings SET auto_reply_enabled=?, start_time=?, end_time=?, reply_text=?, updated_at=datetime('now') WHERE id=1`, 
      [auto_reply_enabled ? 1 : 0, start_time, end_time, reply_text])
  res.json({ success: true })
})

// ── Admin: Chat History ──────────────────────────────────────
router.get('/admin/messages', authMiddleware, (req, res) => {
  const visitorId = req.query.visitor_id
  if (visitorId) {
    const msgs = getAll('SELECT * FROM live_chat_messages WHERE visitor_id = ? ORDER BY timestamp ASC', [visitorId])
    res.json(msgs)
  } else {
    // Get latest message for each visitor
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
  // We can also send this to filehelper so the admin's phone keeps a history
  await sendWechatMessage(`Replied to visitor ${visitor_id}:\n${content}`)
  res.json({ success: true })
})

// ── Public: Visitor API ──────────────────────────────────────
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
      // Crosses midnight
      isOfflineTime = currentTimeStr >= settings.start_time || currentTimeStr <= settings.end_time
    }

    if (isOfflineTime && settings.reply_text) {
      // Save auto reply
      run('INSERT INTO live_chat_messages (visitor_id, sender_type, content) VALUES (?, ?, ?)', [visitor_id, 'admin', settings.reply_text])
      // Send auto reply to WeChat as well to inform Admin
      await sendWechatMessage(`Auto-replied to visitor [${visitor_id}]:\n${settings.reply_text}`)
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
