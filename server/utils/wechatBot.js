import { WechatyBuilder } from 'wechaty'
import QRCode from 'qrcode'
import { run, getAll, getOne } from '../db.js'

let bot = null
let currentQrCodeUrl = null
let isLoggedIn = false
let currentUser = null

export function initWechatBot() {
  if (bot) return

  bot = WechatyBuilder.build({
    name: 'led-trade-bot',
    puppet: 'wechaty-puppet-wechat',
  })

  bot.on('scan', async (qrcode, status) => {
    // Generate QR code data URL
    try {
      currentQrCodeUrl = await QRCode.toDataURL(qrcode)
    } catch (e) {
      console.error('Failed to generate QR code data URL', e)
    }
  })

  bot.on('login', user => {
    isLoggedIn = true
    currentUser = user
    currentQrCodeUrl = null
    console.log(`WeChat bot logged in as ${user.name()}`)
  })

  bot.on('logout', user => {
    isLoggedIn = false
    currentUser = null
    console.log(`WeChat bot logged out: ${user.name()}`)
  })

  bot.on('message', async message => {
    if (message.self()) return // Ignore own messages
    if (message.room()) return // Ignore group messages

    const contact = message.talker()
    const text = message.text()
    
    // Determine if this message is a reply to a website visitor.
    // In a real implementation, you might use a prefix or session mapping.
    // For simplicity, we assume the latest active visitor is the recipient, or we route based on text prefix.
    // Example format expected from admin: "reply [visitor_id]: Hello!"
    // But since the bot forwards messages from the visitor, we can just save it.
    
    // Just a simple routing: find the last active visitor who sent a message.
    const lastMsg = getOne('SELECT visitor_id FROM live_chat_messages WHERE sender_type="visitor" ORDER BY id DESC LIMIT 1')
    if (lastMsg) {
      run('INSERT INTO live_chat_messages (visitor_id, sender_type, content, is_read) VALUES (?, ?, ?, ?)', [
        lastMsg.visitor_id,
        'admin',
        text,
        0
      ])
    }
  })

  bot.start()
    .then(() => console.log('Wechaty bot started'))
    .catch(console.error)
}

export function getWechatStatus() {
  return {
    isLoggedIn,
    currentUser: currentUser ? currentUser.name() : null,
    qrCodeUrl: currentQrCodeUrl
  }
}

export async function logoutWechat() {
  if (bot && isLoggedIn) {
    await bot.logout()
  }
}

export async function sendWechatMessage(text) {
  if (bot && isLoggedIn) {
    // Usually, we would send this to a specific "FileHelper" or a specific group so the admin sees it.
    try {
      const filehelper = await bot.Contact.find({ id: 'filehelper' })
      if (filehelper) {
        await filehelper.say(text)
      }
    } catch (e) {
      console.error('Failed to send wechat message to filehelper', e)
    }
  }
}
