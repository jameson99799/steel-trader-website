import express from 'express'
import { run, getAll, getOne } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { sendWeChatNotification } from '../utils/wechatWebhook.js'
import fs from 'fs'
import http from 'http'
import https from 'https'

const router = express.Router()

function fetchGeoIP(ipAddress) {
  return new Promise((resolve) => {
    if (!ipAddress) return resolve(null)
    const cleanIp = ipAddress.replace(/^::ffff:/, '')
    if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.') || cleanIp.startsWith('172.16.') || cleanIp.startsWith('172.17.') || cleanIp.startsWith('172.18.') || cleanIp.startsWith('172.19.') || cleanIp.startsWith('172.2') || cleanIp.startsWith('172.3') || cleanIp.startsWith('127.')) {
      return resolve(null)
    }

    const options = {
      hostname: 'ip9.com.cn',
      path: `/get?ip=${cleanIp}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }

    https.get(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (parsed && parsed.ret === 200 && parsed.data) {
            const parts = []
            if (parsed.data.country) parts.push(parsed.data.country)
            if (parsed.data.prov && parsed.data.prov !== parsed.data.country) parts.push(parsed.data.prov)
            if (parsed.data.city && parsed.data.city !== parsed.data.prov) parts.push(parsed.data.city)
            const locString = parts.filter(Boolean).join(' ')
            resolve(locString || null)
          } else {
            resolve(null)
          }
        } catch (e) {
          resolve(null)
        }
      })
    }).on('error', (e) => {
      resolve(null)
    })
  })
}

async function processNotificationAndGeoIP(visitor_id, cleanIp, content) {
  try {
    let cachedCountry = null
    try {
      const existing = getOne("SELECT country FROM live_chat_messages WHERE visitor_id = ? AND country IS NOT NULL AND country != '' LIMIT 1", [visitor_id])
      cachedCountry = existing ? existing.country : null
    } catch (e) {}

    if (!cachedCountry) {
      cachedCountry = await fetchGeoIP(cleanIp)
      if (cachedCountry) {
        try {
          run("UPDATE live_chat_messages SET country = ? WHERE visitor_id = ? AND (country IS NULL OR country = '')", [cachedCountry, visitor_id])
        } catch (e) {}
      }
    }

    const shouldNotify = true
    if (shouldNotify) {
      const locationStr = cachedCountry || '未知'
      const markdownContent = `💬 **新客服会话通知**\n\n有新访客在官网上发起咨询：\n- **访客ID:** \`${visitor_id}\`\n- **IP地址:** \`${cleanIp}\` (${locationStr})\n- **咨询内容:** ${content}\n\n[👉 点击进入后台回复](https://www.sunseasteel.com/admin/mobile-chat?visitor_id=${visitor_id})`
      
      try {
        sendWeChatNotification('chat', markdownContent)
      } catch (webhookErr) {
        fs.appendFileSync('server/error.log', `[${new Date().toISOString()}] sendWeChatNotification call failed: ${webhookErr.message}\n`)
      }

      import('../emailService.js').then(({ sendMail, getEmailConfig }) => {
        const emailSettings = getOne('SELECT * FROM email_settings WHERE id=1') || {}
        const toEmails = emailSettings.to_emails || getEmailConfig().to_email || ''
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
                <p style="color:#64748b;margin:0 0 8px;font-size:13px"><strong>地理位置:</strong> ${cachedCountry || '未知'}</p>
                <p style="color:#64748b;margin:0 0 8px;font-size:13px"><strong>发送时间(北京):</strong> ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}</p>
                <p style="margin:0;line-height:1.6;font-size:15px;color:#1e293b"><strong>最新内容：</strong>${content}</p>
              </div>
              <p style="margin-bottom:0">请登录网站后台【在线客服】版块，与该客户进行实时回复。</p>
              <a href="https://www.sunseasteel.com/admin/mobile-chat?visitor_id=${visitor_id}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px">去后台回复 🚀</a>
              <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8">
                此邮件由 SunSea Steel 系统自动发送 · ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
              </div>
            </div>
          </div>
          `
          sendMail({
            to: toEmails,
            subject: `【新客服咨询】来自访客 ${visitor_id.substring(0, 8)}...`,
            html: html
          }).catch(e => {
            fs.appendFileSync('server/error.log', `[${new Date().toISOString()}] Chat email send failed: ${e.message}\n`)
          })
        }
      }).catch(err => {
        fs.appendFileSync('server/error.log', `[${new Date().toISOString()}] Email import load failed: ${err.message}\n`)
      })
    }
  } catch (e) {
    fs.appendFileSync('server/error.log', `[${new Date().toISOString()}] processNotificationAndGeoIP error: ${e.message}\n`)
  }
}

function lookupGeoIP(visitorId, ipAddress) {
  fetchGeoIP(ipAddress).then(country => {
    if (country) {
      try {
        run("UPDATE live_chat_messages SET country = ? WHERE visitor_id = ? AND (country IS NULL OR country = '')", [country, visitorId])
      } catch (e) {}
    }
  }).catch(() => {})
}

let schemaHealed = false
function healSchema() {
  if (schemaHealed) return
  try { run('ALTER TABLE live_chat_messages ADD COLUMN is_read INTEGER DEFAULT 0') } catch(e) {}
  try { run('ALTER TABLE live_chat_messages ADD COLUMN timestamp DATETIME DEFAULT CURRENT_TIMESTAMP') } catch(e) {}
  try { run('ALTER TABLE live_chat_messages ADD COLUMN ip TEXT') } catch(e) {}
  try { run('ALTER TABLE live_chat_messages ADD COLUMN country TEXT') } catch(e) {}
  try { run("ALTER TABLE live_chat_messages ADD COLUMN buttons TEXT DEFAULT '[]'") } catch(e) {}
  try { run("ALTER TABLE chat_wechat_webhooks ADD COLUMN notify_type TEXT DEFAULT 'all'") } catch(e) {}
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
  const { widget_enabled, auto_reply_enabled, start_time, end_time, auto_collapse_seconds, wechat_webhook_url } = req.body
  run(`UPDATE live_chat_settings SET widget_enabled=?, auto_reply_enabled=?, start_time=?, end_time=?, auto_collapse_seconds=?, wechat_webhook_url=?, updated_at=datetime('now') WHERE id=1`,
      [widget_enabled ? 1 : 0, auto_reply_enabled ? 1 : 0, start_time, end_time, auto_collapse_seconds || 10, wechat_webhook_url || ''])
  res.json({ success: true })
})

// ── Admin: Auto-Reply Messages (CRUD) ────────────────────────
router.get('/admin/auto-replies', authMiddleware, (req, res) => {
  const replies = getAll('SELECT * FROM chat_auto_replies ORDER BY sort_order ASC, id ASC')
  const parsed = replies.map(r => {
    let btns = []
    try {
      if (r.buttons) btns = JSON.parse(r.buttons)
    } catch (e) {}
    return { ...r, buttons: btns }
  })
  res.json(parsed)
})

router.post('/admin/auto-replies', authMiddleware, (req, res) => {
  const { content, enabled, buttons } = req.body
  if (!content) return res.status(400).json({ error: 'Content required' })
  const result = run('INSERT INTO chat_auto_replies (content, enabled, buttons) VALUES (?, ?, ?)',
    [content, enabled ? 1 : 0, JSON.stringify(buttons || [])])
  res.json({ success: true, id: result.lastInsertRowid })
})

router.put('/admin/auto-replies/:id', authMiddleware, (req, res) => {
  const { content, enabled, buttons } = req.body
  run('UPDATE chat_auto_replies SET content=?, enabled=?, buttons=? WHERE id=?',
    [content, enabled ? 1 : 0, JSON.stringify(buttons || []), req.params.id])
  res.json({ success: true })
})

router.delete('/admin/auto-replies/:id', authMiddleware, (req, res) => {
  run('DELETE FROM chat_auto_replies WHERE id=?', [req.params.id])
  res.json({ success: true })
})

// ── Admin: WeChat Webhooks (CRUD) ───────────────────────────
router.get('/admin/wechat-webhooks', authMiddleware, (req, res) => {
  const list = getAll('SELECT * FROM chat_wechat_webhooks ORDER BY id ASC')
  res.json(list)
})

router.post('/admin/wechat-webhooks', authMiddleware, (req, res) => {
  const { name, url, enabled, notify_type } = req.body
  if (!url) return res.status(400).json({ error: 'Webhook URL required' })
  const result = run('INSERT INTO chat_wechat_webhooks (name, url, enabled, notify_type) VALUES (?, ?, ?, ?)',
    [name || '未命名机器人', url, enabled ? 1 : 0, notify_type || 'all'])
  res.json({ success: true, id: result.lastInsertRowid })
})

router.put('/admin/wechat-webhooks/:id', authMiddleware, (req, res) => {
  const { name, url, enabled, notify_type } = req.body
  run('UPDATE chat_wechat_webhooks SET name=?, url=?, enabled=?, notify_type=? WHERE id=?',
    [name || '未命名机器人', url, enabled ? 1 : 0, notify_type || 'all', req.params.id])
  res.json({ success: true })
})

router.delete('/admin/wechat-webhooks/:id', authMiddleware, (req, res) => {
  run('DELETE FROM chat_wechat_webhooks WHERE id=?', [req.params.id])
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

  const lang = req.query.lang || 'en'

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

    // Load translations for activePreset if lang is not zh
    if (lang && lang !== 'zh') {
      try {
        const transRows = getAll(
          'SELECT content_field, translated_text FROM translations WHERE language_code=? AND content_type=? AND content_id=?',
          [lang, 'chat_welcome_preset', activePreset.id]
        )
        const transMap = {}
        for (const r of transRows) {
          transMap[r.content_field] = r.translated_text
        }
        if (transMap.greeting) {
          activePreset[`greeting_${lang}`] = transMap.greeting
        }
        buttons = buttons.map((btn, idx) => {
          const transLabel = transMap[`btn_label_${idx}`]
          if (transLabel) {
            btn[`label_${lang}`] = transLabel
          }
          return btn
        })
      } catch (transErr) {
        console.error('Failed to load translations for activePreset:', transErr.message)
      }
    }
    
    activePreset.buttons = buttons
  }

  // Get company logo
  let companyLogo = null
  try {
    const comp = getOne('SELECT logo FROM company WHERE id = 1')
    if (comp) {
      companyLogo = comp.logo
    }
  } catch (logoErr) {
    console.error('Failed to get company logo in widget-config:', logoErr.message)
  }

  res.json({
    enabled: true,
    auto_collapse_seconds: settings.auto_collapse_seconds || 10,
    welcome_preset: activePreset,
    company_logo: companyLogo
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
    const { visitor_id, content, lang } = req.body
    if (!visitor_id || !content) return res.status(400).json({ error: 'Missing fields' })

    // Extract client IP address safely (Cloudflare CF-Connecting-IP first)
    const rawIp = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip || (req.socket ? req.socket.remoteAddress : '') || ''
    const ipStr = Array.isArray(rawIp) ? rawIp[0] : String(rawIp)
    const cleanIp = ipStr.split(',')[0].trim().replace(/^::ffff:/, '')

    // Try to find cached country for this visitor
    let cachedCountry = null
    try {
      const existing = getOne("SELECT country FROM live_chat_messages WHERE visitor_id = ? AND country IS NOT NULL AND country != '' LIMIT 1", [visitor_id])
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

    // Trigger background lookup and notification process (async/non-blocking)
    processNotificationAndGeoIP(visitor_id, cleanIp, content).catch(err => {
      fs.appendFileSync('server/error.log', `[${new Date().toISOString()}] processNotificationAndGeoIP async catch: ${err.message}\n`)
    })

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
          
          let replyContent = reply.content
          if (lang && lang !== 'zh') {
            try {
              const trans = getOne(
                'SELECT translated_text FROM translations WHERE language_code=? AND content_type=? AND content_id=? AND content_field=?',
                [lang, 'chat_auto_reply', reply.id, 'content']
              )
              if (trans?.translated_text) {
                replyContent = trans.translated_text
              }
            } catch (transErr) {
              console.error('Failed to translate auto-reply:', transErr.message)
            }
          }
          run('INSERT INTO live_chat_messages (visitor_id, sender_type, content, buttons) VALUES (?, ?, ?, ?)',
              [visitor_id, 'admin', replyContent, reply.buttons || '[]'])
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

router.all('/poll', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  try {
    healSchema()
    const visitor_id = req.method === 'POST' ? req.body.visitor_id : req.query.visitor_id
    const last_id = req.method === 'POST' ? req.body.last_id : req.query.last_id
    
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
        run("UPDATE live_chat_messages SET is_read = 1 WHERE visitor_id = ? AND sender_type = 'admin' AND id > ?", [visitor_id, queryLastId])
      } catch (updateErr) {
        // Fallback: ignore if is_read column doesn't exist
        fs.appendFileSync('server/error.log', `[${new Date().toISOString()}] poll is_read update error: ${updateErr.message}\n`)
      }
    }

    const parsed = msgs.map(m => {
      let btns = []
      try {
        if (m.buttons) btns = JSON.parse(m.buttons)
      } catch (e) {}
      return { ...m, buttons: btns }
    })
    res.json(parsed)
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
        run("UPDATE live_chat_messages SET is_read = 1 WHERE visitor_id = ? AND sender_type = 'visitor'", [visitorId])
      } catch (e) {}
      
      let msgs = []
      try {
        msgs = getAll('SELECT * FROM live_chat_messages WHERE visitor_id = ? ORDER BY timestamp ASC', [visitorId])
      } catch (e) {
        msgs = getAll('SELECT * FROM live_chat_messages WHERE visitor_id = ? ORDER BY id ASC', [visitorId])
      }
      const parsed = msgs.map(m => {
        let btns = []
        try {
          if (m.buttons) btns = JSON.parse(m.buttons)
        } catch (e) {}
        return { ...m, buttons: btns }
      })
      res.json(parsed)
    } else {
      // Return list of unique visitors with their last message and unread count
      let visitors = []
      try {
        visitors = getAll(`
          SELECT m.*,
            (SELECT COUNT(*) FROM live_chat_messages WHERE visitor_id = m.visitor_id AND sender_type = 'visitor' AND is_read = 0) as unread_count
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
