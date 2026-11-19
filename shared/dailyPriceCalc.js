// ─────────────────────────────────────────────────────────────────────────────
// Daily price board calculation (shared by client, SSR and tests).
//
// The admin maintains a base price in RMB plus a set of surcharges; table rows
// only carry a per-size thickness adjustment. The displayed USD price is:
//
//   (base + thicknessAdj + packaging + headTail + landTransport + portCharges
//            + (withAfp ? afpSurcharge : 0) + extraWidth + sprayCode)
//       / exchangeRate + seaFreight = final USD price
//
// The AFP column (GL) is the only consumer of the anti-fingerprint surcharge.
// ─────────────────────────────────────────────────────────────────────────────

const NUMERIC_CALC_FIELDS = Object.freeze([
  'base_price',
  'exchange_rate',
  'sea_freight',
  'packaging_surcharge',
  'head_tail_surcharge',
  'land_transport_surcharge',
  'port_charges_surcharge',
  'afp_surcharge',
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
    afp_surcharge: 20,
    extra_width_surcharge: 0,
    spray_code_surcharge: 10
  }
}

// Raw RMB sum for a row (before exchange conversion)
export function rmbSum({ entry, thicknessAdj = 0, withAfp = false }) {
  const num = field => parseCalcNumber(entry?.[field])
  return (
    num('base_price') +
    parseCalcNumber(thicknessAdj) +
    num('packaging_surcharge') +
    num('head_tail_surcharge') +
    num('land_transport_surcharge') +
    num('port_charges_surcharge') +
    (withAfp ? num('afp_surcharge') : 0) +
    num('extra_width_surcharge') +
    num('spray_code_surcharge')
  )
}

export function computeUsdPrice({ entry, thicknessAdj = 0, withAfp = false }) {
  const rate = parseCalcNumber(entry?.exchange_rate)
  const freight = parseCalcNumber(entry?.sea_freight)
  const usd = rmbSum({ entry, thicknessAdj, withAfp }) / (rate || 1) + freight
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
