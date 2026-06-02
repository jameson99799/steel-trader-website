import express from 'express'
import { run, getAll, getOne } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import fs from 'fs'
import http from 'http'
import https from 'https'

const router = express.Router()

// GeoIP lookup helper (returns Chinese country name)
function lookupGeoIP(visitorId, ipAddress) {
  if (!ipAddress || ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress.startsWith('192.168.') || ipAddress.startsWith('::ffff:')) return
  const cleanIp = ipAddress.replace(/^::ffff:/, '')
  
  https.get(`https://ip9.com.cn/get?ip=${cleanIp}`, (res) => {
    let data = ''
    res.on('data', (chunk) => { data += chunk })
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data)
        if (parsed.ret === 200 && parsed.data && parsed.data.country) {
          run('UPDATE live_chat_messages SET country = ? WHERE visitor_id = ? AND (country IS NULL OR country = "")', [parsed.data.country, visitorId])
        }
      } catch (e) {
        console.error('GeoIP parsing failed:', e.message)
      }
    })
  }).on('error', (e) => {
    console.error('GeoIP lookup failed for IP:', ipAddress, e.message)
  })
}

let schemaHealed = false
function healSchema() {
  if (schemaHealed) return
  try { run('ALTER TABLE live_chat_messages ADD COLUMN is_read INTEGER DEFAULT 0') } catch(e) {}
  try { run('ALTER TABLE live_chat_messages ADD COLUMN timestamp DATETIME DEFAULT CURRENT_TIMESTAMP') } catch(e) {}
  try { run('ALTER TABLE live_chat_messages ADD COLUMN ip TEXT') } catch(e) {}
  try { run('ALTER TABLE live_chat_messages ADD COLUMN country TEXT') } catch(e) {}
  schemaHealed = true
}

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

  // External links - dynamically loaded from company profile
  try {
    const comp = getOne('SELECT whatsapp, email FROM company WHERE id = 1')
    let waUrl = 'https://wa.me/'
    let mailUrl = 'mailto:'
    if (comp) {
      if (comp.whatsapp) {
        if (comp.whatsapp.startsWith('http')) {
          waUrl = comp.whatsapp
        } else {
          const cleanWa = comp.whatsapp.replace(/[^\d+]/g, '')
          waUrl = `https://wa.me/${cleanWa}`
        }
      }
      if (comp.email) {
        mailUrl = `mailto:${comp.email}`
      }
    }
    options.push({
      group: '外部链接',
      items: [
        { label: 'WhatsApp', label_en: 'WhatsApp', url: waUrl },
        { label: 'Email', label_en: 'Email', url: mailUrl },
      ]
    })
  } catch (e) {
    options.push({
      group: '外部链接',
      items: [
        { label: 'WhatsApp', label_en: 'WhatsApp', url: 'https://wa.me/' },
        { label: 'Email', label_en: 'Email', url: 'mailto:' },
      ]
    })
  }

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
    
    let buttons = JSON.parse(activePreset.buttons || '[]')
    
    // Dynamically replace generic wa.me/mailto templates with actual company info
    try {
      const comp = getOne('SELECT whatsapp, email FROM company WHERE id = 1')
      if (comp) {
        let waUrl = 'https://wa.me/'
        if (comp.whatsapp) {
          if (comp.whatsapp.startsWith('http')) {
            waUrl = comp.whatsapp
          } else {
            const cleanWa = comp.whatsapp.replace(/[^\d+]/g, '')
            waUrl = `https://wa.me/${cleanWa}`
          }
        }
        const mailUrl = comp.email ? `mailto:${comp.email}` : 'mailto:'

        buttons = buttons.map(btn => {
          if (btn.url === 'https://wa.me/' || btn.url === 'https://wa.me') {
            return { ...btn, url: waUrl }
          }
          if (btn.url === 'mailto:' || btn.url === 'mailto') {
            return { ...btn, url: mailUrl }
          }
          return btn
        })
      }
    } catch (e) {
      console.error('Failed to fill company links in widget-config', e.message)
    }
    
    activePreset.buttons = buttons
  }

  res.json({
    enabled: true,
    auto_collapse_seconds: settings.auto_collapse_seconds || 10,
    welcome_preset: activePreset
  })
})

// ── Public: Visitor API ──────────────────────────────────────

router.get('/debug-ip', (req, res) => {
  res.json({
    ip: req.ip,
    headers: req.headers,
    cf: req.headers['cf-connecting-ip'],
    xfwd: req.headers['x-forwarded-for'],
    real: req.headers['x-real-ip']
  })
})

router.post('/send', (req, res) => {
  try {
    healSchema()
    const { visitor_id, content } = req.body
    if (!visitor_id || !content) return res.status(400).json({ error: 'Missing fields' })

    // Extract client IP address safely (Cloudflare CF-Connecting-IP first)
    const rawIp = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip || (req.socket ? req.socket.remoteAddress : '') || ''
    const ipStr = Array.isArray(rawIp) ? rawIp[0] : String(rawIp)
    const cleanIp = ipStr.split(',')[0].trim().replace(/^::ffff:/, '')

    // Try to find cached country for this visitor
    let cachedCountry = null
    try {
      const existing = getOne('SELECT country FROM live_chat_messages WHERE visitor_id = ? AND country IS NOT NULL AND country != "" LIMIT 1', [visitor_id])
      cachedCountry = existing ? existing.country : null
    } catch (e) {}

    try {
      run('INSERT INTO live_chat_messages (visitor_id, sender_type, content, ip, country) VALUES (?, ?, ?, ?, ?)', 
          [visitor_id, 'visitor', content, cleanIp, cachedCountry])
    } catch (dbErr) {
      // Fallback in case columns do not exist yet (migration didn't run or failed)
      fs.appendFileSync('server/error.log', `[${new Date().toISOString()}] INSERT with ip/country failed, falling back: ${dbErr.message}\n`)
      run('INSERT INTO live_chat_messages (visitor_id, sender_type, content) VALUES (?, ?, ?)', 
          [visitor_id, 'visitor', content])
    }

    if (!cachedCountry) {
      // Look up in background (will catch internally and not crash or reject)
      lookupGeoIP(visitor_id, cleanIp)
    }

    // Send email notification on first message
    try {
      const msgCount = getOne('SELECT COUNT(*) as c FROM live_chat_messages WHERE visitor_id = ? AND sender_type = "visitor"', [visitor_id]).c
      if (msgCount === 1) {
        import('../emailService.js').then(({ sendMail, getEmailConfig }) => {
          const settings = getOne('SELECT * FROM email_settings WHERE id=1') || {}
          const toEmails = settings.to_emails || getEmailConfig().to_email || ''
          if (toEmails) {
            const html = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
              <div style="background:#2563eb;color:#fff;padding:24px;border-radius:8px 8px 0 0">
                <h2 style="margin:0">💬 新客服会话通知</h2>
                <p style="margin:6px 0 0;opacity:0.85">来自 SunSea Steel 官网在线客服</p>
              </div>
              <div style="background:#f8fafc;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none">
                <p>有新访客在官网上发起咨询：</p>
                <div style="margin:16px 0;padding:16px;background:#fff;border-radius:8px;border:1px solid #e2e8f0">
                  <p style="color:#64748b;margin:0 0 8px;font-size:13px"><strong>访客ID:</strong> ${visitor_id}</p>
                  <p style="color:#64748b;margin:0 0 8px;font-size:13px"><strong>IP地址:</strong> ${cleanIp}</p>
                  <p style="color:#64748b;margin:0 0 8px;font-size:13px"><strong>所在国家:</strong> ${cachedCountry || '获取中 (请登录后台查看)'}</p>
                  <p style="color:#64748b;margin:0 0 8px;font-size:13px"><strong>发送时间(北京):</strong> ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}</p>
                  <p style="margin:0;line-height:1.6;font-size:15px;color:#1e293b"><strong>最新内容：</strong>${content}</p>
                </div>
                <p style="margin-bottom:0">请登录网站后台【在线客服】版块，与该客户进行实时回复。</p>
                <a href="https://www.sunseasteel.com/admin/chat" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px">去后台回复 🚀</a>
                <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8">
                  此邮件由 SunSea Steel 系统自动发送 · ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
                </div>
              </div>
            </div>`
            sendMail({
              to: toEmails,
              subject: `【新客服咨询】来自访客 ${visitor_id.substring(0, 8)}...`,
              html
            }).catch(console.error)
          }
        }).catch(err => {
          fs.appendFileSync('server/error.log', `[${new Date().toISOString()}] Email import load failed: ${err.message}\n`)
        })
      }
    } catch (e) {
      console.error('Failed to trigger email notification:', e)
    }

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
  } catch (err) {
    try {
      fs.appendFileSync('server/error.log', `[${new Date().toISOString()}] /send global catch: ${err.stack}\n`)
    } catch (e) {}
    res.status(500).json({ error: err.message, stack: err.stack })
  }
})

router.get('/poll', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  try {
    healSchema()
    const { visitor_id, last_id } = req.query
    if (!visitor_id) return res.status(400).json({ error: 'Missing visitor_id' })

    const queryLastId = parseInt(last_id) || 0
    let msgs = []
    
    try {
      msgs = getAll('SELECT * FROM live_chat_messages WHERE visitor_id = ? AND id > ? ORDER BY timestamp ASC', [visitor_id, queryLastId])
    } catch (e) {
      // Fallback if timestamp column doesn't exist
      msgs = getAll('SELECT * FROM live_chat_messages WHERE visitor_id = ? AND id > ? ORDER BY id ASC', [visitor_id, queryLastId])
    }

    if (msgs.length > 0) {
      try {
        run('UPDATE live_chat_messages SET is_read = 1 WHERE visitor_id = ? AND sender_type = "admin" AND id > ?', [visitor_id, queryLastId])
      } catch (updateErr) {
        // Fallback: ignore if is_read column doesn't exist
        fs.appendFileSync('server/error.log', `[${new Date().toISOString()}] poll is_read update error: ${updateErr.message}\n`)
      }
    }

    res.json(msgs)
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack })
  }
})

// ── Admin: List Messages ─────────────────────────────────────
router.get('/admin/messages', authMiddleware, (req, res) => {
  try {
    healSchema()
    const visitorId = req.query.visitor_id
    if (visitorId) {
      try {
        run('UPDATE live_chat_messages SET is_read = 1 WHERE visitor_id = ? AND sender_type = "visitor"', [visitorId])
      } catch (e) {}
      
      let msgs = []
      try {
        msgs = getAll('SELECT * FROM live_chat_messages WHERE visitor_id = ? ORDER BY timestamp ASC', [visitorId])
      } catch (e) {
        msgs = getAll('SELECT * FROM live_chat_messages WHERE visitor_id = ? ORDER BY id ASC', [visitorId])
      }
      res.json(msgs)
    } else {
      // Return list of unique visitors with their last message and unread count
      let visitors = []
      try {
        visitors = getAll(`
          SELECT m.*,
            (SELECT COUNT(*) FROM live_chat_messages WHERE visitor_id = m.visitor_id AND sender_type = "visitor" AND is_read = 0) as unread_count
          FROM live_chat_messages m
          INNER JOIN (
            SELECT visitor_id, MAX(id) as max_id FROM live_chat_messages GROUP BY visitor_id
          ) grouped ON m.id = grouped.max_id
          ORDER BY m.timestamp DESC
        `)
      } catch (e) {
        // Fallback without is_read and timestamp if columns missing
        visitors = getAll(`
          SELECT m.*, 0 as unread_count
          FROM live_chat_messages m
          INNER JOIN (
            SELECT visitor_id, MAX(id) as max_id FROM live_chat_messages GROUP BY visitor_id
          ) grouped ON m.id = grouped.max_id
          ORDER BY m.id DESC
        `)
      }
      res.json(visitors)
    }
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack })
  }
})

// ── Admin: Delete Messages ───────────────────────────────────
router.delete('/admin/messages', authMiddleware, (req, res) => {
  try {
    const { visitor_ids } = req.body
    if (!visitor_ids || !Array.isArray(visitor_ids)) {
      return res.status(400).json({ error: 'Missing or invalid visitor_ids array' })
    }
    
    if (visitor_ids.length > 0) {
      const placeholders = visitor_ids.map(() => '?').join(',')
      run(`DELETE FROM live_chat_messages WHERE visitor_id IN (${placeholders})`, visitor_ids)
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack })
  }
})

export default router
