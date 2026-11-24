import test from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import {
  createDailyPriceStore,
  normalizeDailyPrice,
  normalizePriceDate,
  expandDailyPrice,
  DEFAULT_FIELD_ORDER,
  DEFAULT_PANEL_TEMPLATES,
  DEFAULT_FOOTER
} from '../server/services/dailyPrice.js'
import { computePanelRowPrice, parseCalcNumber, calcDefaults, globalSurcharges } from '../shared/dailyPriceCalc.js'

function createFixture() {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE daily_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      publish_date TEXT UNIQUE NOT NULL,
      panels TEXT,
      exchange_rate REAL,
      sea_freight REAL,
      packaging_surcharge REAL,
      head_tail_surcharge REAL,
      land_transport_surcharge REAL,
      port_charges_surcharge REAL,
      extra_width_surcharge REAL,
      spray_code_surcharge REAL,
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
  assert.throws(() => normalizePriceDate(''), /YYYY-MM-DD/i)
})

test('normalizeDailyPrice builds default panels (GI visible, GL visible, CRC hidden)', () => {
  const entry = normalizeDailyPrice({ publish_date: '2026-11-24' })
  assert.equal(entry.panels.length, 3)
  assert.equal(entry.panels[0].key, 'gi')
  assert.equal(entry.panels[0].visible, true)
  assert.equal(entry.panels[1].key, 'gl')
  assert.equal(entry.panels[1].visible, true)
  assert.equal(entry.panels[2].key, 'crc')
  assert.equal(entry.panels[2].visible, false)
  assert.equal(entry.panels[0].base_price, DEFAULT_PANEL_TEMPLATES.gi.base_price)
  assert.equal(entry.trade_terms, DEFAULT_FOOTER.tradeTerms)
})

test('normalizeDailyPrice handles custom panels with items and visibility toggles', () => {
  const entry = normalizeDailyPrice({
    publish_date: '2026-11-24',
    panels: [
      { key: 'gi', productName: 'GI COILS', base_price: 3500, has_afp: false, visible: true, items: [{ spec: '0.14', quantity: '500MT', thickness_adj: 300 }] },
      { key: 'crc', productName: 'CRC COILS', base_price: 3800, has_afp: false, visible: true, items: [{ spec: '0.5', quantity: '200MT', thickness_adj: 100 }] },
      { key: 'gl', productName: 'GL COILS', base_price: 3600, has_afp: true, visible: false, items: [{ spec: '0.14', quantity: '500MT', thickness_adj: 350, afp_adj: 20 }] }
    ]
  })
  assert.equal(entry.panels.length, 3)
  assert.equal(entry.panels[0].items[0].thickness_adj, 300)
  assert.equal(entry.panels[1].visible, true)
  assert.equal(entry.panels[1].key, 'crc')
  assert.equal(entry.panels[2].visible, false)
  assert.equal(entry.panels[2].items[0].afp_adj, 20)
})

test('computePanelRowPrice: (base+adj+global surcharges)/rate + freight', () => {
  const panel = { base_price: 3500 }
  const entry = { exchange_rate: 7.15, sea_freight: 30, packaging_surcharge: 50, head_tail_surcharge: 30, land_transport_surcharge: 60, port_charges_surcharge: 40, extra_width_surcharge: 0, spray_code_surcharge: 10 }
  const surcharges = globalSurcharges(entry) // 50+30+60+40+0+10 = 190
  assert.equal(surcharges, 190)
  // (3500+300+190)/7.15+30 = 3990/7.15+30 = 588.0
  const fob = computePanelRowPrice(entry, panel, { thickness_adj: 300 }, false)
  assert.equal(fob, Math.round((3500 + 300 + 190) / 7.15 + 30) * 1 === 0 ? 0 : Math.round((3990 / 7.15 + 30) * 10) / 10)
  // With AFP +20: (3500+300+20+190)/7.15+30
  const afp = computePanelRowPrice(entry, { ...panel, has_afp: true }, { thickness_adj: 300, afp_adj: 20 }, true)
  assert.equal(afp, Math.round((3500 + 300 + 20 + 190) / 7.15 + 30) * 10 / 10 === 0 ? 0 : Math.round((4010 / 7.15 + 30) * 10) / 10)
  // Different panel base → different price
  const crcPanel = { base_price: 3800 }
  const crcFob = computePanelRowPrice(entry, crcPanel, { thickness_adj: 300 }, false)
  assert.ok(crcFob > fob)
})

test('save upserts by publish date, getLatest returns newest', () => {
  const { db, store } = createFixture()
  store.save({ publish_date: '2026-11-23', panels: [{ key: 'gi', productName: 'GI', visible: true, items: [] }] })
  store.save({ publish_date: '2026-11-24', panels: [{ key: 'gi', productName: 'GI', visible: true, items: [] }, { key: 'gl', productName: 'GL', visible: true, items: [] }] })
  store.save({ publish_date: '2026-11-24', panels: [{ key: 'gi', productName: 'GI REVISED', visible: true, items: [] }] })
  assert.equal(db.prepare('SELECT COUNT(*) AS c FROM daily_prices').get().c, 2)

  const latest = store.getLatest()
  assert.equal(latest.publish_date, '2026-11-24')
  assert.equal(latest.panels.length, 1)
  assert.equal(latest.panels[0].productName, 'GI REVISED')
  assert.equal(store.getByDate('2026-11-23').panels.length, 1)
  assert.equal(store.getByDate('2026-13-01'), null)
})

test('expandDailyPrice falls back to legacy panels from old gi_/gl_ columns', () => {
  const expanded = expandDailyPrice({
    publish_date: '2026-11-20',
    gi_product_name: 'GI COILS', gi_base_price: 3500, gi_items: '[]',
    gl_product_name: 'GL COILS', gl_base_price: 3600, gl_items: '[]'
  })
  assert.equal(expanded.panels.length, 2)
  assert.equal(expanded.panels[0].key, 'gi')
  assert.equal(expanded.panels[0].base_price, 3500)
  assert.equal(expanded.panels[1].key, 'gl')
  assert.equal(expanded.panels[1].base_price, 3600)
})

test('save persists calc fields (exchange rate, surcharges) and panels', () => {
  const { store } = createFixture()
  store.save({ publish_date: '2026-11-24', exchange_rate: 7.2, sea_freight: 25, packaging_surcharge: 60, panels: [{ key: 'gi', productName: 'GI', base_price: 3500, visible: true, items: [] }] })
  const entry = store.getLatest()
  assert.equal(entry.exchange_rate, 7.2)
  assert.equal(entry.sea_freight, 25)
  assert.equal(entry.packaging_surcharge, 60)
  assert.equal(entry.panels[0].key, 'gi')
  // Upsert updates calc fields too
  store.save({ publish_date: '2026-11-24', exchange_rate: 7.3, panels: [{ key: 'gi', productName: 'GI2', visible: true, items: [] }] })
  assert.equal(store.getLatest().exchange_rate, 7.3)
  assert.equal(store.getLatest().panels[0].productName, 'GI2')
})

test('listDates orders newest first, remove deletes', () => {
  const { store } = createFixture()
  store.save({ publish_date: '2026-11-17' })
  store.save({ publish_date: '2026-11-19' })
  store.save({ publish_date: '2026-11-18' })
  assert.deepEqual(store.listDates().map(d => d.publish_date), ['2026-11-19', '2026-11-18', '2026-11-17'])
  assert.equal(store.remove('2026-11-18'), true)
  assert.equal(store.remove('2026-11-18'), false)
})

test('seedDefaultsIfEmpty seeds once', () => {
  const { store } = createFixture()
  assert.equal(store.seedDefaultsIfEmpty(), true)
  assert.equal(store.seedDefaultsIfEmpty(), false)
  const latest = store.getLatest()
  assert.ok(latest.panels.length >= 2)
  assert.ok(latest.panels.some(p => p.key === 'gi' && p.visible))
})
