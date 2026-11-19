// ─────────────────────────────────────────────────────────────────────────────
// Daily price board calculation (shared by client, SSR and tests).
//
// The admin maintains a base price in RMB plus a set of global surcharges;
// each table row carries its own thickness adjustment and — for the GL side —
// its own anti-fingerprint (AFP) adjustment, because the AFP premium differs
// per thickness. The displayed USD price is:
//
//   FOB  = (base + thicknessAdj + packaging + headTail + landTransport
//            + portCharges + extraWidth + sprayCode) / exchangeRate + seaFreight
//   AFP  = same RMB sum + row.afpAdj, then / exchangeRate + seaFreight
//
// ─────────────────────────────────────────────────────────────────────────────

const NUMERIC_CALC_FIELDS = Object.freeze([
  'base_price',
  'exchange_rate',
  'sea_freight',
  'packaging_surcharge',
  'head_tail_surcharge',
  'land_transport_surcharge',
  'port_charges_surcharge',
  'extra_width_surcharge',
  'spray_code_surcharge'
])

export { NUMERIC_CALC_FIELDS }

export function parseCalcNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const text = String(value ?? '').replace(/[,\s＋]/g, m => (m === '＋' ? '+' : m)).trim()
  if (!text) return 0
  const parsed = Number.parseFloat(text)
  return Number.isFinite(parsed) ? parsed : 0
}

export function calcDefaults() {
  return {
    base_price: 3500,
    exchange_rate: 7.15,
    sea_freight: 30,
    packaging_surcharge: 50,
    head_tail_surcharge: 30,
    land_transport_surcharge: 60,
    port_charges_surcharge: 40,
    extra_width_surcharge: 0,
    spray_code_surcharge: 10
  }
}

// Raw RMB sum for a row (before exchange conversion)
export function rmbSum({ entry, thicknessAdj = 0, afpAdj = 0, withAfp = false }) {
  const num = field => parseCalcNumber(entry?.[field])
  return (
    num('base_price') +
    parseCalcNumber(thicknessAdj) +
    num('packaging_surcharge') +
    num('head_tail_surcharge') +
    num('land_transport_surcharge') +
    num('port_charges_surcharge') +
    (withAfp ? parseCalcNumber(afpAdj) : 0) +
    num('extra_width_surcharge') +
    num('spray_code_surcharge')
  )
}

export function computeUsdPrice({ entry, thicknessAdj = 0, afpAdj = 0, withAfp = false }) {
  const rate = parseCalcNumber(entry?.exchange_rate)
  const freight = parseCalcNumber(entry?.sea_freight)
  const usd = rmbSum({ entry, thicknessAdj, afpAdj, withAfp }) / (rate || 1) + freight
  return roundUsd(usd)
}

function roundUsd(value) {
  const rounded = Math.round(value * 10) / 10
  return Number.isFinite(rounded) ? rounded : 0
}

// Display formatter: 598 -> "598", 598.4 -> "598.4"
export function formatUsd(value) {
  return String(value)
}
