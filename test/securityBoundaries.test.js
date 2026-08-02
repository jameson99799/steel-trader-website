import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('translation settings require authentication and never return the raw API key', () => {
  const source = read('server/routes/translation.js')
  assert.match(source, /router\.get\('\/settings',\s*authMiddleware/)
  assert.match(source, /sanitizeTranslationSettings/)
  assert.doesNotMatch(source, /res\.json\(s\s*\|\|\s*\{\}\)/)
})
test('AI channels and SMTP account APIs use secret-safe serializers', () => {
  const ai = read('server/routes/ai.js')
  const email = read('server/routes/email.js')
  assert.match(ai, /sanitizeAIChannel/)
  assert.doesNotMatch(ai, /api_key_display:\s*c\.api_key\s*\|\|\s*''/)
  assert.match(email, /sanitizeSmtpAccount/)
  assert.doesNotMatch(email, /res\.json\(accounts\)/)
})

test('production JWT configuration has no public hard-coded fallback', () => {
  const auth = read('server/middleware/auth.js')
  const setup = read('server-setup.sh')
  const update = read('server-update.sh')
  assert.match(auth, /getJwtSecrets/)
  assert.doesNotMatch(auth, /led-trade-secret-key-2024|crm-steel-secret-2024/)
  assert.match(setup, /CRM_JWT_SECRET=/)
  assert.match(setup, /UNSUBSCRIBE_SECRET=/)
  assert.match(update, /ensure_secret\s+"JWT_SECRET"/)
  assert.match(update, /ensure_secret\s+"CRM_JWT_SECRET"/)
  assert.match(update, /secret_is_valid/)
  assert.match(update, /\.env\.secret-backup-/)
  assert.match(update, /NODE_ENV=production node -e .*server\/config\/secrets\.js/)
})
