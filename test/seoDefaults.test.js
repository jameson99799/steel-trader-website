import test from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import {
  DEFAULT_LLMS_TXT,
  DEFAULT_LLMS_FULL_TXT,
  LEGACY_LLMS_TXT,
  LEGACY_LLMS_FULL_TXT,
  migrateLegacyLlmsDefaults
} from '../server/services/seoDefaults.js'

function databaseWith(txt, full) {
  const db = new Database(':memory:')
  db.exec('CREATE TABLE seo_settings (id INTEGER PRIMARY KEY, llms_txt TEXT, llms_full_txt TEXT)')
  db.prepare('INSERT INTO seo_settings (id, llms_txt, llms_full_txt) VALUES (1, ?, ?)').run(txt, full)
  return db
}

test('SUNSEA defaults contain no legacy LED Trade identity', () => {
  assert.match(DEFAULT_LLMS_TXT, /^# SUNSEA STEEL/)
  assert.match(DEFAULT_LLMS_FULL_TXT, /^# SUNSEA STEEL/)
  assert.doesNotMatch(DEFAULT_LLMS_TXT + DEFAULT_LLMS_FULL_TXT, /LED Trade/i)
})

test('legacy system defaults migrate to SUNSEA defaults', () => {
  const db = databaseWith(LEGACY_LLMS_TXT, LEGACY_LLMS_FULL_TXT)
  try {
    migrateLegacyLlmsDefaults(db)
    const row = db.prepare('SELECT llms_txt, llms_full_txt FROM seo_settings WHERE id = 1').get()
    assert.equal(row.llms_txt, DEFAULT_LLMS_TXT)
    assert.equal(row.llms_full_txt, DEFAULT_LLMS_FULL_TXT)
  } finally {
    db.close()
  }
})

test('administrator custom llms content is preserved byte-for-byte', () => {
  const customTxt = '# Custom AI guide\nDo not replace this text.'
  const customFull = '# Custom full guide\nCompany-approved content.'
  const db = databaseWith(customTxt, customFull)
  try {
    migrateLegacyLlmsDefaults(db)
    const row = db.prepare('SELECT llms_txt, llms_full_txt FROM seo_settings WHERE id = 1').get()
    assert.deepEqual(row, { llms_txt: customTxt, llms_full_txt: customFull })
  } finally {
    db.close()
  }
})
