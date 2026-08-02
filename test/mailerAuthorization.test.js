import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('mailer mutations enforce owner access and task references are validated', () => {
  const source = read('server/routes/mailer.js')
  assert.match(source, /requireOwnedRecord/)
  assert.match(source, /validateTaskReferences/)
  assert.match(source, /router\.put\('\/templates\/:id'[\s\S]{0,300}requireOwnedRecord/)
  assert.match(source, /router\.post\('\/tasks'[\s\S]{0,500}validateTaskReferences/)
  assert.match(source, /router\.post\('\/contacts\/assign'[\s\S]{0,250}isAdmin/)
})

test('SMTP account update, delete and test require account access', () => {
  const source = read('server/routes/email.js')
  assert.match(source, /requireAccountAccess/)
  assert.match(source, /router\.put\('\/accounts\/:id'[\s\S]{0,300}requireAccountAccess/)
  assert.match(source, /router\.delete\('\/accounts\/:id'[\s\S]{0,200}requireAccountAccess/)
  assert.match(source, /router\.post\('\/accounts\/:id\/test'[\s\S]{0,300}requireAccountAccess/)
  assert.match(source, /router\.put\('\/accounts\/:id'[\s\S]{0,180}requireAccountAccess\(req, res, req\.params\.id, false\)/)
  assert.match(source, /router\.delete\('\/accounts\/:id'[\s\S]{0,180}requireAccountAccess\(req, res, req\.params\.id, false\)/)
})
