import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('resume retries failed recipients but never duplicates successful sends', async () => {
  const { pendingRecipientsForResume } = await import('../server/services/mailerPolicy.js')
  const contacts = [{ email: 'sent@example.com' }, { email: 'failed@example.com' }, { email: 'new@example.com' }]
  const logs = [{ contact_email: 'sent@example.com', status: 'sent' }, { contact_email: 'failed@example.com', status: 'failed' }]
  assert.deepEqual(pendingRecipientsForResume(contacts, logs).map(c => c.email), ['failed@example.com', 'new@example.com'])
})

test('task completion distinguishes success, partial failure and total failure', async () => {
  const { deriveTaskStatus } = await import('../server/services/mailerPolicy.js')
  assert.equal(deriveTaskStatus({ sent: 2, failed: 0 }), 'done')
  assert.equal(deriveTaskStatus({ sent: 2, failed: 1 }), 'partial')
  assert.equal(deriveTaskStatus({ sent: 0, failed: 2 }), 'failed')
  assert.equal(deriveTaskStatus({ sent: 1, failed: 0, paused: true }), 'paused')
})

test('mailer schema includes every field queried by reports and recovery', () => {
  const db = read('server/db.js')
  for (const column of ['account_name', 'error_msg', 'failed_count', 'error_message']) {
    assert.match(db, new RegExp(`ADD COLUMN ${column}`))
  }
  assert.doesNotMatch(read('server/routes/mailer.js'), /mc\.country/)
})

test('scheduler uses a bounded timeout helper and restart recovery', () => {
  const source = read('server/routes/mailer.js')
  assert.match(source, /scheduleWithLongTimeout/)
  assert.match(source, /status='running'/)
  assert.match(source, /status='paused'/)
})

test('every one-off pooled SMTP transport is explicitly closed', () => {
  for (const path of ['server/emailService.js', 'server/routes/email.js', 'server/routes/crm-mailer.js', 'server/routes/external-api.js']) {
    assert.match(read(path), /\.close\?\.\(\)/, `${path} must close pooled SMTP transports`)
  }
})
