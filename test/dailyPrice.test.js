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
import { computeUsdPrice, calcDefaults, parseCalcNumber } from '../shared/dailyPriceCalc.js'

const CALC_COLS = `
      base_price REAL, exchange_rate REAL, sea_freight REAL,
      packaging_surcharge REAL, head_tail_surcharge REAL, land_transport_surcharge REAL,
      port_charges_surcharge REAL, afp_surcharge REAL, extra_width_surcharge REAL, spray_code_surcharge REAL,
`

function createFixture() {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE daily_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      publish_date TEXT UNIQUE NOT NULL,
      ${CALC_COLS}
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

test('normalizeDailyPrice applies spec and calc defaults, normalizes rows and field order', () => {
  const entry = normalizeDailyPrice({ publish_date: '2026-11-19' })
  assert.equal(entry.gi_product_name, DEFAULT_GI.productName)
  assert.equal(entry.gi_coating, 'Z100')
  assert.equal(entry.gl_product_name, DEFAULT_GL.productName)
  assert.equal(entry.gl_coating, 'AZ100')
  assert.deepEqual(entry.gi_field_order, DEFAULT_FIELD_ORDER)
  assert.deepEqual(entry.gi_items, [])
  assert.equal(entry.trade_terms, DEFAULT_FOOTER.tradeTerms)
  assert.equal(entry.base_price, calcDefaults().base_price)
  assert.equal(entry.exchange_rate, calcDefaults().exchange_rate)
  assert.equal(entry.sea_freight, calcDefaults().sea_freight)
  assert.equal(entry.afp_surcharge, calcDefaults().afp_surcharge)

  // Thickness adjustments accept signed decimals; +300 style input parses
  const full = normalizeDailyPrice({
    publish_date: '2026-11-19',
    base_price: '3600',
    exchange_rate: '7.2',
    sea_freight: '35',
    afp_surcharge: '25',
    gi_items: [{ spec: '0.14×1000', quantity: '500MT', thickness_adj: '300' }],
    gl_items: [{ spec: '0.14×1000', quantity: '500MT', thickness_adj: '350' }],
    gi_field_order: ['coating', 'grade', 'productName', 'coilId', 'coilWeight', 'spangle']
  })
  assert.equal(full.base_price, 3600)
  assert.equal(full.exchange_rate, 7.2)
  assert.equal(full.gi_items[0].thickness_adj, 300)
  assert.equal(full.gl_items[0].thickness_adj, 350)
  assert.equal(!('fob' in full.gl_items[0]), true)
  assert.deepEqual(full.gi_field_order, ['coating', 'grade', 'productName', 'coilId', 'coilWeight', 'spangle'])

  // A blank row freshly added in the admin repeater is silently dropped
  const blankDropped = normalizeDailyPrice({
    publish_date: '2026-11-19',
    gi_items: [{ spec: '', quantity: '', thickness_adj: 0 }, { spec: '0.14', quantity: '500MT', thickness_adj: 300 }]
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

test('computeUsdPrice follows the agreed formula: (base+adj+surcharges)/rate + freight', () => {
  const entry = {
    base_price: 3500,
    exchange_rate: 7.15,
    sea_freight: 30,
    packaging_surcharge: 50,
    head_tail_surcharge: 30,
    land_transport_surcharge: 60,
    port_charges_surcharge: 40,
    afp_surcharge: 20,
    extra_width_surcharge: 0,
    spray_code_surcharge: 10
  }
  // (3500 + 300 + 50 + 30 + 60 + 40 + 0 + 10) / 7.15 + 30 = 588.0
  const fob = computeUsdPrice({ entry, thicknessAdj: 300, withAfp: false })
  assert.equal(fob, Math.round((3990 / 7.15 + 30) * 10) / 10)
  // AFP column adds the anti-fingerprint surcharge inside the RMB sum
  const afp = computeUsdPrice({ entry, thicknessAdj: 300, withAfp: true })
  assert.equal(afp, Math.round((4010 / 7.15 + 30) * 10) / 10)
  assert.ok(afp > fob)

  // Negative adjustments and string inputs work
  assert.equal(parseCalcNumber('＋200'), 200)
  assert.equal(parseCalcNumber('-200'), -200)
  assert.equal(
    computeUsdPrice({ entry, thicknessAdj: '-200', withAfp: false }),
    computeUsdPrice({ entry, thicknessAdj: -200, withAfp: false })
  )
})

test('save upserts by publish date and getLatest returns the newest entry', () => {
  const { db, store } = createFixture()
  store.save({ publish_date: '2026-11-18', base_price: 3400 })
  store.save({ publish_date: '2026-11-19', base_price: 3500, gi_items: [{ spec: '0.16', quantity: '600MT', thickness_adj: 350 }] })
  // Re-save the same date = revise, no duplicate row
  store.save({ publish_date: '2026-11-19', base_price: 3550 })
  assert.equal(db.prepare('SELECT COUNT(*) AS c FROM daily_prices').get().c, 2)

  const latest = store.getLatest()
  assert.equal(latest.publish_date, '2026-11-19')
  assert.equal(latest.base_price, 3550)
  assert.equal(latest.gl_product_name, DEFAULT_GL.productName)
  assert.deepEqual(latest.gi_field_order, DEFAULT_FIELD_ORDER)
  assert.equal(latest.gi_items.length, 0) // revision replaced rows

  const byDate = store.getByDate('2026-11-18')
  assert.equal(byDate.base_price, 3400)
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
    gl_items: '[{"spec":"0.14","quantity":"500MT","thickness_adj":350}]'
  })
  assert.deepEqual(expanded.gi_field_order, DEFAULT_FIELD_ORDER)
  assert.deepEqual(expanded.gi_items, [])
  assert.deepEqual(expanded.gl_field_order, ['coating', 'grade', 'productName', 'coilId', 'coilWeight', 'spangle'])
  assert.equal(expanded.gl_items[0].thickness_adj, 350)
})

test('seedDefaultsIfEmpty seeds once with today date', () => {
  const { store } = createFixture()
  assert.equal(store.seedDefaultsIfEmpty(), true)
  assert.equal(store.seedDefaultsIfEmpty(), false)
  const latest = store.getLatest()
  assert.equal(latest.gi_product_name, DEFAULT_GI.productName)
  assert.deepEqual(latest.gi_items, [])
  assert.equal(latest.base_price, calcDefaults().base_price)
})
