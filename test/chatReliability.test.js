import test from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import fs from 'node:fs'
import { visitorListSql } from '../server/services/chatVisitorMetadata.js'

test('visitor list keeps visitor GeoIP metadata after an admin reply becomes the latest message', () => {
  const db = new Database(':memory:')
  db.exec(`CREATE TABLE live_chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_id TEXT NOT NULL,
    sender_type TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip TEXT,
    country TEXT,
    country_code TEXT,
    geo_source TEXT
  )`)
  db.prepare(`INSERT INTO live_chat_messages
    (visitor_id, sender_type, content, ip, country, country_code, geo_source)
    VALUES (?, 'visitor', 'Need a quote', ?, ?, ?, ?)`)
    .run('visitor-1', '8.8.8.8', 'United States', 'US', 'fallback')
  db.prepare("INSERT INTO live_chat_messages (visitor_id, sender_type, content) VALUES (?, 'admin', 'Hello')")
    .run('visitor-1')

  const [visitor] = db.prepare(visitorListSql()).all()
  assert.equal(visitor.content, 'Hello')
  assert.equal(visitor.ip, '8.8.8.8')
  assert.equal(visitor.country, 'United States')
  assert.equal(visitor.country_code, 'US')
  assert.equal(visitor.geo_source, 'fallback')
})

for (const componentPath of [
  'src/views/admin/MobileChat.vue',
  'src/views/admin/ChatSettings.vue'
]) {
  test(`${componentPath} keeps reply text on failure and redirects expired sessions to login`, () => {
    const source = fs.readFileSync(componentPath, 'utf8')
    assert.match(source, /const chatVisitorListError = ref\(''\)/)
    assert.match(source, /const chatMessagesError = ref\(''\)/)
    assert.match(source, /const chatSendError = ref\(''\)/)
    assert.match(source, /v-if="chatVisitorListError"/)
    assert.match(source, /v-if="chatMessagesError"/)
    assert.match(source, /v-if="chatSendError"/)
    assert.match(source, /if \(res\?\.status === 401\)/)
    assert.match(source, /localStorage\.removeItem\('token'\)/)
    assert.match(source, /router\.replace\(\{ path: '\/admin\/login', query: \{ redirect: route\.fullPath \} \}\)/)
    assert.match(source, /if \(res\.ok\) \{[\s\S]*?replyText\.value = ''[\s\S]*?chatSendError\.value = ''[\s\S]*?await fetchActiveMessages\(\)/)
    assert.match(source, /visitor_id=\$\{encodeURIComponent\(activeVisitorId\.value\)\}/)
    assert.match(source, /catch \(e\) \{[\s\S]*handleChatError\(null, '加载会话'\)/)
    assert.match(source, /catch \(e\) \{[\s\S]*handleChatError\(null, '加载消息'\)/)
    assert.match(source, /catch \(e\) \{[\s\S]*handleChatError\(null, '发送回复'\)/)
  })
}
