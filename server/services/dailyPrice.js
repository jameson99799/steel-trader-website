// ─────────────────────────────────────────────────────────────────────────────
// Daily price board store — dynamic panel system.
// Each publish date has a "panels" JSON array; each panel is a product quote
// sheet (GI, GL, CRC, or any custom product). Admin can add/remove panels,
// toggle visibility per day, and customize all fields.
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

// Default panel templates
export const DEFAULT_PANEL_TEMPLATES = Object.freeze({
  gi: {
    key: 'gi',
    productName: 'PRIME HOT DIPPED GALVANIZED STEEL COILS',
    grade: 'DX51D',
    spangle: 'REGULAR SPANGLE',
    coating: 'Z100',
    coilId: '508mm',
    coilWeight: '6-9MT',
    base_price: 3500,
    has_afp: false,
    visible: true
  },
  gl: {
    key: 'gl',
    productName: 'PRIME HOT DIPPED GALVALUME STEEL COILS',
    grade: 'DX51D',
    spangle: 'REGULAR SPANGLE',
    coating: 'AZ100',
    coilId: '508mm',
    coilWeight: '6-9MT',
    base_price: 3600,
    has_afp: true,
    visible: true
  },
  crc: {
    key: 'crc',
    productName: 'PRIME COLD ROLLED STEEL COILS',
    grade: 'SPCC',
    spangle: '—',
    coating: '—',
    coilId: '508mm',
    coilWeight: '3-8MT',
    base_price: 3800,
    has_afp: false,
    visible: false
  }
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
  const d = new Date(text + 'T00:00:00Z')
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== text) {
    throw new Error('publish_date is not a real calendar date')
  }
  return text
}

function boundedText(value, label, { max = MAX_TEXT, required = false } = {}) {
  const normalized = String(value ?? '').trim()
  if (required && !normalized) throw new Error(label + ' is required')
  if (normalized.length > max) throw new Error(label + ' must contain at most ' + max + ' characters')
  return normalized
}

function normalizeFieldOrder(value, label) {
  let order = value
  if (typeof order === 'string') {
    try { order = JSON.parse(order) } catch { order = null }
  }
  if (!Array.isArray(order)) return [...DEFAULT_FIELD_ORDER]
  const cleaned = order.filter(key => PRICE_FIELD_KEYS.includes(key))
  for (const key of PRICE_FIELD_KEYS) {
    if (!cleaned.includes(key)) cleaned.push(key)
  }
  return cleaned
}

function normalizeItems(value, { withAfp }) {
  let items = value
  if (typeof items === 'string') {
    try { items = JSON.parse(items) } catch { items = [] }
  }
  if (!Array.isArray(items)) items = []
  if (items.length > MAX_ITEMS) throw new Error('at most ' + MAX_ITEMS + ' price rows per side')
  const rows = items.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error('price row ' + (index + 1) + ' is invalid')
    const row = {
      spec: boundedText(item.spec, 'row ' + (index + 1) + ' size', { max: 40 }),
      quantity: boundedText(item.quantity, 'row ' + (index + 1) + ' quantity', { max: 40 }),
      thickness_adj: parseCalcNumber(item.thickness_adj ?? item.thicknessAdj)
    }
    if (withAfp) row.afp_adj = parseCalcNumber(item.afp_adj ?? item.afpAdj)
    return row
  })
  return rows.filter(row =>
    row.spec || row.quantity || row.thickness_adj !== 0 || (withAfp && row.afp_adj !== 0)
  )
}

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

// Normalize a single panel
function normalizePanel(panel, index) {
  if (!panel || typeof panel !== 'object') throw new Error('panel ' + (index + 1) + ' is invalid')
  const key = boundedText(panel.key, 'panel key', { max: 30 }) || ('panel_' + (index + 1))
  return {
    key,
    productName: boundedText(panel.productName ?? panel.product_name, 'panel product name'),
    grade: boundedText(panel.grade, 'panel grade'),
    spangle: boundedText(panel.spangle, 'panel spangle'),
    coating: boundedText(panel.coating, 'panel coating'),
    coilId: boundedText(panel.coilId ?? panel.coil_id, 'panel coil ID'),
    coilWeight: boundedText(panel.coilWeight ?? panel.coil_weight, 'panel coil weight'),
    base_price: parseCalcNumber(panel.base_price),
    field_order: normalizeFieldOrder(panel.field_order, 'panel field order'),
    items: normalizeItems(panel.items, { withAfp: !!panel.has_afp }),
    has_afp: !!panel.has_afp,
    visible: panel.visible !== false
  }
}

// Normalize the full panels array
function normalizePanels(value) {
  let panels = value
  if (typeof panels === 'string') {
    try { panels = JSON.parse(panels) } catch { panels = null }
  }
  if (!Array.isArray(panels)) return buildDefaultPanels()
  return panels.map((p, i) => normalizePanel(p, i))
}

// Build default panels (GI visible, GL visible, CRC hidden)
function buildDefaultPanels() {
  return Object.values(DEFAULT_PANEL_TEMPLATES).map(tpl => ({
    ...tpl,
    field_order: [...DEFAULT_FIELD_ORDER],
    items: []
  }))
}

// Accept either the raw DB row or a form payload
export function normalizeDailyPrice(input) {
  if (!input || typeof input !== 'object') throw new Error('daily price input must be an object')
  const publishDate = normalizePriceDate(input.publish_date ?? input.publishDate ?? todayStr())
  const calc = normalizeCalcFields(input)
  const panels = normalizePanels(input.panels)
  return {
    publish_date: publishDate,
    ...calc,
    panels,
    trade_terms: boundedText(input.trade_terms ?? DEFAULT_FOOTER.tradeTerms, 'trade terms'),
    payment_term: boundedText(input.payment_term ?? DEFAULT_FOOTER.paymentTerm, 'payment term'),
    price_validity: boundedText(input.price_validity ?? DEFAULT_FOOTER.priceValidity, 'price validity')
  }
}

// Shape handed to the public page / SSR: JSON strings parsed
export function expandDailyPrice(row) {
  if (!row) return null
  const parse = (value, fallback) => {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : fallback
    } catch { return fallback }
  }
  const expanded = {
    ...row,
    panels: parse(row.panels, null)
  }
  // Backward compat: if no panels column, build from legacy gi_/gl_ fields
  if (!expanded.panels) {
    expanded.panels = buildLegacyPanels(row)
  }
  return expanded
}

// Build panels from legacy gi_/gl_ column format
function buildLegacyPanels(row) {
  const panels = []
  if (row.gi_product_name || row.gi_base_price != null) {
    panels.push({
      key: 'gi',
      productName: row.gi_product_name || '',
      grade: row.gi_grade || '',
      spangle: row.gi_spangle || '',
      coating: row.gi_coating || '',
      coilId: row.gi_coil_id || '',
      coilWeight: row.gi_coil_weight || '',
      base_price: row.gi_base_price ?? 3500,
      field_order: normalizeFieldOrder(row.gi_field_order, 'GI'),
      items: safeParseItems(row.gi_items),
      has_afp: false,
      visible: true
    })
  }
  if (row.gl_product_name || row.gl_base_price != null) {
    panels.push({
      key: 'gl',
      productName: row.gl_product_name || '',
      grade: row.gl_grade || '',
      spangle: row.gl_spangle || '',
      coating: row.gl_coating || '',
      coilId: row.gl_coil_id || '',
      coilWeight: row.gl_coil_weight || '',
      base_price: row.gl_base_price ?? 3600,
      field_order: normalizeFieldOrder(row.gl_field_order, 'GL'),
      items: safeParseItems(row.gl_items),
      has_afp: true,
      visible: true
    })
  }
  return panels
}

function safeParseItems(value) {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
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
    try { normalized = normalizePriceDate(date) } catch { return null }
    return expandDailyPrice(getOne('SELECT * FROM daily_prices WHERE publish_date = ?', [normalized]))
  }

  function getLatest() {
    return expandDailyPrice(getOne('SELECT * FROM daily_prices ORDER BY publish_date DESC LIMIT 1'))
  }

  function save(input) {
    const entry = normalizeDailyPrice(input)
    const calcCols = [...NUMERIC_CALC_FIELDS]
    const cols = ['publish_date', 'panels', ...calcCols, 'trade_terms', 'payment_term', 'price_validity']
    const placeholders = cols.map(() => '?').join(',')
    const updates = cols.filter(c => c !== 'publish_date').map(c => `${c} = excluded.${c}`).join(', ')
    run(`
      INSERT INTO daily_prices (${cols.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT(publish_date) DO UPDATE SET
        ${updates},
        updated_at = CURRENT_TIMESTAMP
    `, [
      entry.publish_date,
      JSON.stringify(entry.panels),
      ...calcCols.map(c => entry[c]),
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

// Compute USD price for a panel row
export function computePanelPrice({ panel, thicknessAdj = 0, afpAdj = 0, withAfp = false, exchangeRate, seaFreight }) {
  const base = parseCalcNumber(panel?.base_price)
  const rate = parseCalcNumber(exchangeRate)
  const freight = parseCalcNumber(seaFreight)
  const surcharges = 0 // global surcharges handled by caller
  let sum = base + parseCalcNumber(thicknessAdj) + surcharges
  if (withAfp) sum += parseCalcNumber(afpAdj)
  const usd = sum / (rate || 1) + freight
  const rounded = Math.round(usd * 10) / 10
  return Number.isFinite(rounded) ? rounded : 0
}
