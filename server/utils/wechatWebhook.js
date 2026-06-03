import https from 'https'
import fs from 'fs'
import { getAll, getOne } from '../db.js'

export function sendWeChatNotification(type, markdownContent) {
  let webhooks = []
  try {
    webhooks = getAll("SELECT url, notify_type FROM chat_wechat_webhooks WHERE enabled = 1")
  } catch (e) {
    // Fallback to legacy single webhook if table/columns don't exist
    try {
      const settings = getOne("SELECT wechat_webhook_url FROM live_chat_settings WHERE id = 1") || {}
      if (settings.wechat_webhook_url) {
        webhooks = [{ url: settings.wechat_webhook_url, notify_type: 'all' }]
      }
    } catch (dbErr) {}
  }

  const payload = JSON.stringify({
    msgtype: 'markdown',
    markdown: {
      content: markdownContent
    }
  })

  for (const wh of webhooks) {
    if (!wh.url) continue
    // Check if notify_type matches
    const whType = wh.notify_type || 'all'
    if (whType !== 'all' && whType !== type) {
      continue
    }

    try {
      const urlObj = new URL(wh.url)
      const req = https.request({
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {
        let resData = ''
        res.on('data', chunk => resData += chunk)
        res.on('end', () => {
          if (res.statusCode !== 200) {
            fs.appendFileSync('server/error.log', `[${new Date().toISOString()}] WeChat webhook response error: ${res.statusCode} ${resData}\n`)
          }
        })
      })
      req.on('error', (e) => {
        fs.appendFileSync('server/error.log', `[${new Date().toISOString()}] WeChat webhook send failed: ${e.message}\n`)
      })
      req.write(payload)
      req.end()
    } catch (err) {
      fs.appendFileSync('server/error.log', `[${new Date().toISOString()}] WeChat webhook send/parsing error: ${err.message}\n`)
    }
  }
}
