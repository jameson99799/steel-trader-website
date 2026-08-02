import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('unsubscribe tokens are signed, normalized and tamper resistant', async () => {
  const { createUnsubscribeToken, verifyUnsubscribeToken } = await import('../server/services/mailCompliance.js')
  const token = createUnsubscribeToken(' User@Example.COM ', 'test-secret-that-is-long-enough-123456')
  assert.equal(verifyUnsubscribeToken(token, 'test-secret-that-is-long-enough-123456'), 'user@example.com')
  assert.equal(verifyUnsubscribeToken(token + 'x', 'test-secret-that-is-long-enough-123456'), '')
})

test('marketing message contains visible unsubscribe link and RFC one-click headers', async () => {
  const { applyUnsubscribe } = await import('../server/services/mailCompliance.js')
  const message = applyUnsubscribe({ html: '<p>Hello</p>' }, 'user@example.com', 'secret-secret-secret-secret-secret-123')
  assert.match(message.html, /unsubscribe/i)
  assert.match(message.headers['List-Unsubscribe'], /<https:\/\/www\.sunseasteel\.com\/api\/unsubscribe\?token=/)
  assert.equal(message.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click')
})

test('suppression schema and public unsubscribe route are installed', () => {
  assert.match(read('server/db.js'), /CREATE TABLE IF NOT EXISTS mail_suppressions/)
  assert.match(read('server/index.js'), /unsubscribeRoutes/)
  const mailer = read('server/routes/mailer.js')
  assert.match(mailer, /mail_suppressions/)
  assert.match(mailer, /applyUnsubscribe/)
})

test('CRM bulk, quick-send and follow-up paths all honor suppression and close pooled transports', () => {
  const crm = read('server/routes/crm-customers.js')
  assert.ok((crm.match(/mail_suppressions/g) || []).length >= 3)
  assert.ok((crm.match(/applyUnsubscribe\(/g) || []).length >= 3)
  assert.ok((crm.match(/transport\.close\?\.\(\)/g) || []).length >= 3)
})

test('external email API also honors suppressions and adds one-click unsubscribe', () => {
  const source = read('server/routes/external-api.js')
  assert.match(source, /mail_suppressions/)
  assert.match(source, /applyUnsubscribe/)
})
