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
      gi_base_price REAL, gl_base_price REAL, base_price REAL, exchange_rate REAL, sea_freight REAL,
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
  assert.equal(entry.gi_base_price, calcDefaults().gi_base_price)
  assert.equal(entry.gl_base_price, calcDefaults().gl_base_price)
  assert.equal(entry.exchange_rate, calcDefaults().exchange_rate)
  assert.equal(entry.sea_freight, calcDefaults().sea_freight)

  // Thickness adjustments accept signed decimals; the GL row also carries its
  // own anti-fingerprint adjustment (per thickness, no longer global)
  const full = normalizeDailyPrice({
    publish_date: '2026-11-19',
    gi_base_price: '3600',
    gl_base_price: '3700',
    exchange_rate: '7.2',
    sea_freight: '35',
    gi_items: [{ spec: '0.14×1000', quantity: '500MT', thickness_adj: '300' }],
    gl_items: [{ spec: '0.14×1000', quantity: '500MT', thickness_adj: '350', afp_adj: '20' }],
    gi_field_order: ['coating', 'grade', 'productName', 'coilId', 'coilWeight', 'spangle']
  })
  assert.equal(full.gi_base_price, 3600)
  assert.equal(full.gl_base_price, 3700)
  assert.equal(full.exchange_rate, 7.2)
  assert.equal(full.gi_items[0].thickness_adj, 300)
  assert.equal(full.gl_items[0].thickness_adj, 350)
  assert.equal(full.gl_items[0].afp_adj, 20)
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

test('computeUsdPrice follows the agreed formula with per-side base prices', () => {
  const entry = {
    gi_base_price: 3500,
    gl_base_price: 3600,
    exchange_rate: 7.15,
    sea_freight: 30,
    packaging_surcharge: 50,
    head_tail_surcharge: 30,
    land_transport_surcharge: 60,
    port_charges_surcharge: 40,
    extra_width_surcharge: 0,
    spray_code_surcharge: 10
  }
  // GI: (3500 + 300 + 50 + 30 + 60 + 40 + 0 + 10) / 7.15 + 30 = 588.0
  const gi = computeUsdPrice({ entry, side: 'gi', thicknessAdj: 300, withAfp: false })
  assert.equal(gi, Math.round((3990 / 7.15 + 30) * 10) / 10)
  // GL: (3600 + 300 + 50 + 30 + 60 + 40 + 0 + 10) / 7.15 + 30 = 601.9
  const gl = computeUsdPrice({ entry, side: 'gl', thicknessAdj: 300, withAfp: false })
  assert.equal(gl, Math.round((4090 / 7.15 + 30) * 10) / 10)
  // GL AFP column adds the ROW's own anti-fingerprint surcharge inside the
  // RMB sum — the premium differs per thickness, so it is no longer a global
  // field but a per-row value (afpAdj)
  const afp = computeUsdPrice({ entry, side: 'gl', thicknessAdj: 300, afpAdj: 20, withAfp: true })
  assert.equal(afp, Math.round((4110 / 7.15 + 30) * 10) / 10)
  assert.ok(afp > gl)
  // Same row, different AFP adjustment → different AFP price
  const afp25 = computeUsdPrice({ entry, side: 'gl', thicknessAdj: 300, afpAdj: 25, withAfp: true })
  assert.ok(afp25 > afp)

  // Negative adjustments and string inputs work
  assert.equal(parseCalcNumber('＋200'), 200)
  assert.equal(parseCalcNumber('-200'), -200)
  assert.equal(
    computeUsdPrice({ entry, side: 'gi', thicknessAdj: '-200', withAfp: false }),
    computeUsdPrice({ entry, side: 'gi', thicknessAdj: -200, withAfp: false })
  )
})

test('legacy entries with the shared base_price fill both sides', () => {
  const legacy = normalizeDailyPrice({ publish_date: '2026-11-19', base_price: 3450 })
  assert.equal(legacy.gi_base_price, 3450)
  assert.equal(legacy.gl_base_price, 3450)

  const expanded = expandDailyPrice({ publish_date: '2026-11-19', base_price: 3450, gi_items: '[]', gl_items: '[]' })
  assert.equal(expanded.gi_base_price, 3450)
  assert.equal(expanded.gl_base_price, 3450)
  // Explicit two-base entries are untouched by the legacy fallback
  const dual = expandDailyPrice({ publish_date: '2026-11-19', gi_base_price: 3500, gl_base_price: 3600, gi_items: '[]', gl_items: '[]' })
  assert.equal(dual.gi_base_price, 3500)
  assert.equal(dual.gl_base_price, 3600)
})

test('save upserts by publish date and getLatest returns the newest entry', () => {
  const { db, store } = createFixture()
  store.save({ publish_date: '2026-11-18', gi_base_price: 3400, gl_base_price: 3500 })
  store.save({ publish_date: '2026-11-19', gi_base_price: 3500, gl_base_price: 3600, gi_items: [{ spec: '0.16', quantity: '600MT', thickness_adj: 350 }] })
  // Re-save the same date = revise, no duplicate row
  store.save({ publish_date: '2026-11-19', gi_base_price: 3550, gl_base_price: 3650 })
  assert.equal(db.prepare('SELECT COUNT(*) AS c FROM daily_prices').get().c, 2)

  const latest = store.getLatest()
  assert.equal(latest.publish_date, '2026-11-19')
  assert.equal(latest.gi_base_price, 3550)
  assert.equal(latest.gl_base_price, 3650)
  assert.equal(latest.gl_product_name, DEFAULT_GL.productName)
  assert.deepEqual(latest.gi_field_order, DEFAULT_FIELD_ORDER)
  assert.equal(latest.gi_items.length, 0) // revision replaced rows

  const byDate = store.getByDate('2026-11-18')
  assert.equal(byDate.gi_base_price, 3400)
  assert.equal(byDate.gl_base_price, 3500)
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
  assert.equal(latest.gi_base_price, calcDefaults().gi_base_price)
  assert.equal(latest.gl_base_price, calcDefaults().gl_base_price)
})