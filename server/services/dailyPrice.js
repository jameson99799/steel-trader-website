// ─────────────────────────────────────────────────────────────────────────────
// Daily price board store — one row per publish date, GI (galvanized) on the
// left and GL (galvalume) on the right. Table rows are stored as JSON arrays
// so the admin repeater can add/remove/reorder sizes atomically per date.
//
// Field display order is customizable per side and stored as a JSON array of
// field keys; the fixed keys are the six quote fields of a steel price sheet.
// ─────────────────────────────────────────────────────────────────────────────

import {
  calcDefaults,
  parseCalcNumber,
  NUMERIC_CALC_FIELDS
} from '../../shared/dailyPriceCalc.js'

export const PRICE_FIELD_KEYS = Object.freeze([
  'productName',
  'grade',
  'spangle',
  'coating',
  'coilId',
  'coilWeight'
])

export const DEFAULT_FIELD_ORDER = Object.freeze([
  'productName',
  'grade',
  'spangle',
  'coating',
  'coilId',
  'coilWeight'
])

export const DEFAULT_GI = Object.freeze({
  productName: 'PRIME HOT DIPPED GALVANIZED STEEL COILS',
  grade: 'DX51D',
  spangle: 'REGULAR SPANGLE',
  coating: 'Z100',
  coilId: '508mm',
  coilWeight: '6-9MT'
})

export const DEFAULT_GL = Object.freeze({
  productName: 'PRIME HOT DIPPED GALVALUME STEEL COILS',
  grade: 'DX51D',
  spangle: 'REGULAR SPANGLE',
  coating: 'AZ100',
  coilId: '508mm',
  coilWeight: '6-9MT'
})

export const DEFAULT_FOOTER = Object.freeze({
  tradeTerms: 'FOB TIANJIN PORT',
  paymentTerm: 'LC AT SIGHT OR TT',
  priceValidity: 'SUBJECT TO OUR FINAL CONFIRMATION'
})

const MAX_TEXT = 120
const MAX_ITEMS = 60

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function normalizePriceDate(value) {
  const text = String(value ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error('publish_date must be YYYY-MM-DD')
  const d = new Date(`${text}T00:00:00Z`)
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== text) {
    throw new Error('publish_date is not a real calendar date')
  }
  return text
}

function boundedText(value, label, { max = MAX_TEXT, required = false } = {}) {
  const normalized = String(value ?? '').trim()
  if (required && !normalized) throw new Error(`${label} is required`)
  if (normalized.length > max) throw new Error(`${label} must contain at most ${max} characters`)
  return normalized
}

function normalizeFieldOrder(value, label) {
  let order = value
  if (typeof order === 'string') {
    try { order = JSON.parse(order) } catch { order = null }
  }
  if (!Array.isArray(order)) return [...DEFAULT_FIELD_ORDER]
  const cleaned = order.filter(key => PRICE_FIELD_KEYS.includes(key))
  // Append any missing keys so every field always renders once.
  for (const key of PRICE_FIELD_KEYS) {
    if (!cleaned.includes(key)) cleaned.push(key)
  }
  if (cleaned.length !== PRICE_FIELD_KEYS.length) {
    throw new Error(`${label} must contain each field exactly once`)
  }
  return cleaned
}

function normalizeItems(value, { withAfp }) {
  let items = value
  if (typeof items === 'string') {
    try { items = JSON.parse(items) } catch { items = [] }
  }
  if (!Array.isArray(items)) items = []
  if (items.length > MAX_ITEMS) throw new Error(`at most ${MAX_ITEMS} price rows per side`)
  const rows = items.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`price row ${index + 1} is invalid`)
    // Rows carry their own thickness adjustment and — for GL — their own
    // anti-fingerprint adjustment (the AFP premium differs per thickness).
    // The displayed FOB / AFP prices are computed at render time.
    const row = {
      spec: boundedText(item.spec, `row ${index + 1} size`, { max: 40 }),
      quantity: boundedText(item.quantity, `row ${index + 1} quantity`, { max: 40 }),
      thickness_adj: parseCalcNumber(item.thickness_adj ?? item.thicknessAdj)
    }
    if (withAfp) row.afp_adj = parseCalcNumber(item.afp_adj ?? item.afpAdj)
    return row
  })
  // A freshly added blank row (admin clicked ＋ but left it empty) is dropped
  // instead of failing the whole save.
  return rows.filter(row =>
    row.spec || row.quantity || row.thickness_adj !== 0 || (withAfp && row.afp_adj !== 0)
  )
}

// Numeric calc fields follow the shared formula; blanks parse to 0.
function normalizeCalcFields(input) {
  const defaults = calcDefaults()
  const out = {}
  for (const field of NUMERIC_CALC_FIELDS) {
    const raw = input[field]
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      out[field] = defaults[field]
    } else {
      out[field] = parseCalcNumber(raw)
    }
  }
  return out
}

// Accept either the raw DB row (strings for JSON columns) or a form payload.
export function normalizeDailyPrice(input) {
  if (!input || typeof input !== 'object') throw new Error('daily price input must be an object')
  const publishDate = normalizePriceDate(input.publish_date ?? input.publishDate ?? todayStr())
  return {
    publish_date: publishDate,
    ...normalizeCalcFields(input),
    gi_product_name: boundedText(input.gi_product_name ?? DEFAULT_GI.productName, 'GI product name'),
    gi_grade: boundedText(input.gi_grade ?? DEFAULT_GI.grade, 'GI grade'),
    gi_spangle: boundedText(input.gi_spangle ?? DEFAULT_GI.spangle, 'GI spangle'),
    gi_coating: boundedText(input.gi_coating ?? DEFAULT_GI.coating, 'GI coating mass'),
    gi_coil_id: boundedText(input.gi_coil_id ?? DEFAULT_GI.coilId, 'GI coil ID'),
    gi_coil_weight: boundedText(input.gi_coil_weight ?? DEFAULT_GI.coilWeight, 'GI coil weight'),
    gi_field_order: normalizeFieldOrder(input.gi_field_order, 'GI field order'),
    gi_items: normalizeItems(input.gi_items, { withAfp: false }),
    gl_product_name: boundedText(input.gl_product_name ?? DEFAULT_GL.productName, 'GL product name'),
    gl_grade: boundedText(input.gl_grade ?? DEFAULT_GL.grade, 'GL grade'),
    gl_spangle: boundedText(input.gl_spangle ?? DEFAULT_GL.spangle, 'GL spangle'),
    gl_coating: boundedText(input.gl_coating ?? DEFAULT_GL.coating, 'GL coating mass'),
    gl_coil_id: boundedText(input.gl_coil_id ?? DEFAULT_GL.coilId, 'GL coil ID'),
    gl_coil_weight: boundedText(input.gl_coil_weight ?? DEFAULT_GL.coilWeight, 'GL coil weight'),
    gl_field_order: normalizeFieldOrder(input.gl_field_order, 'GL field order'),
    gl_items: normalizeItems(input.gl_items, { withAfp: true }),
    trade_terms: boundedText(input.trade_terms ?? DEFAULT_FOOTER.tradeTerms, 'trade terms'),
    payment_term: boundedText(input.payment_term ?? DEFAULT_FOOTER.paymentTerm, 'payment term'),
    price_validity: boundedText(input.price_validity ?? DEFAULT_FOOTER.priceValidity, 'price validity')
  }
}

// Shape handed to the public page / SSR: JSON strings parsed into arrays.
export function expandDailyPrice(row) {
  if (!row) return null
  const parse = (value, fallback) => {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : fallback
    } catch { return fallback }
  }
  return {
    ...row,
    gi_field_order: normalizeFieldOrder(row.gi_field_order, 'GI field order'),
    gl_field_order: normalizeFieldOrder(row.gl_field_order, 'GL field order'),
    gi_items: parse(row.gi_items, []),
    gl_items: parse(row.gl_items, [])
  }
}

export function createDailyPriceStore({ getAll, getOne, run }) {
  if (![getAll, getOne, run].every(dep => typeof dep === 'function')) {
    throw new Error('daily price store requires getAll, getOne, and run')
  }

  function listDates() {
    return getAll('SELECT publish_date, updated_at FROM daily_prices ORDER BY publish_date DESC')
  }

  function getByDate(date) {
    let normalized
    try {
      normalized = normalizePriceDate(date)
    } catch {
      // Malformed date strings (e.g. from a stale history link) are simply "not found"
      return null
    }
    return expandDailyPrice(getOne('SELECT * FROM daily_prices WHERE publish_date = ?', [normalized]))
  }

  function getLatest() {
    return expandDailyPrice(getOne('SELECT * FROM daily_prices ORDER BY publish_date DESC LIMIT 1'))
  }

  // Upsert by publish date: saving today publishes immediately; saving a past
  // date revises that history entry.
  function save(input) {
    const entry = normalizeDailyPrice(input)
    run(`
      INSERT INTO daily_prices (
        publish_date,
        base_price, exchange_rate, sea_freight,
        packaging_surcharge, head_tail_surcharge, land_transport_surcharge,
        port_charges_surcharge, extra_width_surcharge, spray_code_surcharge,
        gi_product_name, gi_grade, gi_spangle, gi_coating, gi_coil_id, gi_coil_weight, gi_field_order, gi_items,
        gl_product_name, gl_grade, gl_spangle, gl_coating, gl_coil_id, gl_coil_weight, gl_field_order, gl_items,
        trade_terms, payment_term, price_validity
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(publish_date) DO UPDATE SET
        base_price = excluded.base_price,
        exchange_rate = excluded.exchange_rate,
        sea_freight = excluded.sea_freight,
        packaging_surcharge = excluded.packaging_surcharge,
        head_tail_surcharge = excluded.head_tail_surcharge,
        land_transport_surcharge = excluded.land_transport_surcharge,
        port_charges_surcharge = excluded.port_charges_surcharge,
        extra_width_surcharge = excluded.extra_width_surcharge,
        spray_code_surcharge = excluded.spray_code_surcharge,
        gi_product_name = excluded.gi_product_name,
        gi_grade = excluded.gi_grade,
        gi_spangle = excluded.gi_spangle,
        gi_coating = excluded.gi_coating,
        gi_coil_id = excluded.gi_coil_id,
        gi_coil_weight = excluded.gi_coil_weight,
        gi_field_order = excluded.gi_field_order,
        gi_items = excluded.gi_items,
        gl_product_name = excluded.gl_product_name,
        gl_grade = excluded.gl_grade,
        gl_spangle = excluded.gl_spangle,
        gl_coating = excluded.gl_coating,
        gl_coil_id = excluded.gl_coil_id,
        gl_coil_weight = excluded.gl_coil_weight,
        gl_field_order = excluded.gl_field_order,
        gl_items = excluded.gl_items,
        trade_terms = excluded.trade_terms,
        payment_term = excluded.payment_term,
        price_validity = excluded.price_validity,
        updated_at = CURRENT_TIMESTAMP
    `, [
      entry.publish_date,
      entry.base_price, entry.exchange_rate, entry.sea_freight,
      entry.packaging_surcharge, entry.head_tail_surcharge, entry.land_transport_surcharge,
      entry.port_charges_surcharge, entry.extra_width_surcharge, entry.spray_code_surcharge,
      entry.gi_product_name, entry.gi_grade, entry.gi_spangle, entry.gi_coating, entry.gi_coil_id, entry.gi_coil_weight,
      JSON.stringify(entry.gi_field_order), JSON.stringify(entry.gi_items),
      entry.gl_product_name, entry.gl_grade, entry.gl_spangle, entry.gl_coating, entry.gl_coil_id, entry.gl_coil_weight,
      JSON.stringify(entry.gl_field_order), JSON.stringify(entry.gl_items),
      entry.trade_terms, entry.payment_term, entry.price_validity
    ])
    return getByDate(entry.publish_date)
  }

  function remove(date) {
    const normalized = normalizePriceDate(date)
    const result = run('DELETE FROM daily_prices WHERE publish_date = ?', [normalized])
    return Number(result?.changes ?? 0) > 0
  }

  function seedDefaultsIfEmpty() {
    const count = getOne('SELECT COUNT(*) AS c FROM daily_prices')?.c ?? 0
    if (count > 0) return false
    save({ publish_date: todayStr() })
    return true
  }

  return { listDates, getByDate, getLatest, save, remove, seedDefaultsIfEmpty }
}
