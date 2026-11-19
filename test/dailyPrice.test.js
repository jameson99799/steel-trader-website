import test from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import {
  createDailyPriceStore,
  normalizeDailyPrice,
  normalizePriceDate,
  expandDailyPrice,
  DEFAULT_FIELD_ORDER,
  DEFAULT_GI,
  DEFAULT_GL,
  DEFAULT_FOOTER
} from '../server/services/dailyPrice.js'

function createFixture() {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE daily_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      publish_date TEXT UNIQUE NOT NULL,
      gi_product_name TEXT, gi_grade TEXT, gi_spangle TEXT, gi_coating TEXT, gi_coil_id TEXT, gi_coil_weight TEXT,
      gi_field_order TEXT, gi_items TEXT DEFAULT '[]',
      gl_product_name TEXT, gl_grade TEXT, gl_spangle TEXT, gl_coating TEXT, gl_coil_id TEXT, gl_coil_weight TEXT,
      gl_field_order TEXT, gl_items TEXT DEFAULT '[]',
      trade_terms TEXT, payment_term TEXT, price_validity TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  const store = createDailyPriceStore({
    getAll: (sql, params = []) => db.prepare(sql).all(...params),
    getOne: (sql, params = []) => db.prepare(sql).get(...params) || null,
    run: (sql, params = []) => db.prepare(sql).run(...params)
  })
  return { db, store }
}

test('normalizePriceDate accepts real dates and rejects impossible ones', () => {
  assert.equal(normalizePriceDate('2026-02-28'), '2026-02-28')
  assert.throws(() => normalizePriceDate('2026-02-30'), /date/i)
  assert.throws(() => normalizePriceDate('19-02-2026'), /YYYY-MM-DD/i)
  assert.throws(() => normalizePriceDate(''), /YYYY-MM-DD/i)
})

test('normalizeDailyPrice applies spec defaults and normalizes rows and field order', () => {
  const entry = normalizeDailyPrice({ publish_date: '2026-11-19' })
  assert.equal(entry.gi_product_name, DEFAULT_GI.productName)
  assert.equal(entry.gi_coating, 'Z100')
  assert.equal(entry.gl_product_name, DEFAULT_GL.productName)
  assert.equal(entry.gl_coating, 'AZ100')
  assert.deepEqual(entry.gi_field_order, DEFAULT_FIELD_ORDER)
  assert.deepEqual(entry.gi_items, [])
  assert.equal(entry.trade_terms, DEFAULT_FOOTER.tradeTerms)
  assert.equal(entry.payment_term, DEFAULT_FOOTER.paymentTerm)
  assert.equal(entry.price_validity, DEFAULT_FOOTER.priceValidity)

  const full = normalizeDailyPrice({
    publish_date: '2026-11-19',
    gi_items: [{ spec: '0.14×1000', quantity: '500MT', fob: '512' }],
    gl_items: [{ spec: '0.14×1000', quantity: '500MT', fob: '512', afp: '520' }],
    gi_field_order: ['coating', 'grade', 'productName', 'coilId', 'coilWeight', 'spangle']
  })
  assert.deepEqual(full.gi_field_order, ['coating', 'grade', 'productName', 'coilId', 'coilWeight', 'spangle'])
  assert.equal(full.gl_items[0].afp, '520')
  assert.equal(!('afp' in full.gi_items[0]), true)

  // A blank row freshly added in the admin repeater is silently dropped
  const blankDropped = normalizeDailyPrice({
    publish_date: '2026-11-19',
    gi_items: [{ spec: '', quantity: '', fob: '' }, { spec: '0.14', quantity: '500MT', fob: '512' }]
  })
  assert.equal(blankDropped.gi_items.length, 1)

  // A partial field order is auto-completed with the missing keys (the admin
  // UI always sends the full order; this is robustness against stale clients)
  const partial = normalizeDailyPrice({
    publish_date: '2026-11-19',
    gi_field_order: ['grade', 'spangle']
  })
  assert.deepEqual(partial.gi_field_order, ['grade', 'spangle', 'productName', 'coating', 'coilId', 'coilWeight'])
})

test('save upserts by publish date and getLatest returns the newest entry', () => {
  const { db, store } = createFixture()
  store.save({ publish_date: '2026-11-18', gi_coating: 'Z80' })
  store.save({ publish_date: '2026-11-19', gi_coating: 'Z100', gi_items: [{ spec: '0.16', quantity: '600MT', fob: '515' }] })
  // Re-save the same date = revise, no duplicate row
  store.save({ publish_date: '2026-11-19', gi_coating: 'Z120' })
  assert.equal(db.prepare('SELECT COUNT(*) AS c FROM daily_prices').get().c, 2)

  const latest = store.getLatest()
  assert.equal(latest.publish_date, '2026-11-19')
  assert.equal(latest.gi_coating, 'Z120')
  assert.equal(latest.gl_product_name, DEFAULT_GL.productName)
  assert.deepEqual(latest.gi_field_order, DEFAULT_FIELD_ORDER)
  assert.equal(latest.gi_items.length, 0) // revision replaced rows

  const byDate = store.getByDate('2026-11-18')
  assert.equal(byDate.gi_coating, 'Z80')
  assert.deepEqual(byDate.gi_items, [])
  assert.equal(store.getByDate('2026-13-01'), null)
})

test('listDates orders newest first and remove deletes one entry', () => {
  const { store } = createFixture()
  store.save({ publish_date: '2026-11-17' })
  store.save({ publish_date: '2026-11-19' })
  store.save({ publish_date: '2026-11-18' })
  const dates = store.listDates().map(d => d.publish_date)
  assert.deepEqual(dates, ['2026-11-19', '2026-11-18', '2026-11-17'])

  assert.equal(store.remove('2026-11-18'), true)
  assert.equal(store.remove('2026-11-18'), false)
  assert.deepEqual(store.listDates().map(d => d.publish_date), ['2026-11-19', '2026-11-17'])
})

test('expandDailyPrice tolerates corrupt JSON and missing field order', () => {
  const expanded = expandDailyPrice({
    publish_date: '2026-11-19',
    gi_field_order: null,
    gi_items: '{broken',
    gl_field_order: '["coating","grade","productName","coilId","coilWeight","spangle"]',
    gl_items: '[{"spec":"0.14","quantity":"500MT","fob":"512","afp":"520"}]'
  })
  assert.deepEqual(expanded.gi_field_order, DEFAULT_FIELD_ORDER)
  assert.deepEqual(expanded.gi_items, [])
  assert.deepEqual(expanded.gl_field_order, ['coating', 'grade', 'productName', 'coilId', 'coilWeight', 'spangle'])
  assert.equal(expanded.gl_items[0].afp, '520')
})

test('seedDefaultsIfEmpty seeds once with today date', () => {
  const { store } = createFixture()
  assert.equal(store.seedDefaultsIfEmpty(), true)
  assert.equal(store.seedDefaultsIfEmpty(), false)
  const latest = store.getLatest()
  assert.equal(latest.gi_product_name, DEFAULT_GI.productName)
  assert.deepEqual(latest.gi_items, [])
})
