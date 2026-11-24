// ─────────────────────────────────────────────────────────────────────────────
// Daily price board calculation (shared by client, SSR and tests).
// Each panel has its own base_price. Global surcharges + exchange rate +
// sea freight are shared across panels. Per-row thickness/AFP adjustments.
// ─────────────────────────────────────────────────────────────────────────────

export function parseCalcNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const text = String(value ?? '').replace(/[,\s＋]/g, m => (m === '＋' ? '+' : m)).trim()
  if (!text) return 0
  const parsed = Number.parseFloat(text)
  return Number.isFinite(parsed) ? parsed : 0
}

export function calcDefaults() {
  return {
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

// Numeric calc fields persisted per entry (exchange rate, freight, surcharges)
export const NUMERIC_CALC_FIELDS = Object.freeze(Object.keys(calcDefaults()))

// Global surcharges sum (RMB)
export function globalSurcharges(entry) {
  const num = field => parseCalcNumber(entry?.[field])
  return (
    num('packaging_surcharge') +
    num('head_tail_surcharge') +
    num('land_transport_surcharge') +
    num('port_charges_surcharge') +
    num('extra_width_surcharge') +
    num('spray_code_surcharge')
  )
}

// Compute USD price for one row in one panel
export function computeUsdPrice({ panel, thicknessAdj = 0, afpAdj = 0, withAfp = false, exchangeRate, seaFreight, globalSurchargeSum = 0 }) {
  const base = parseCalcNumber(panel?.base_price)
  const rate = parseCalcNumber(exchangeRate)
  const freight = parseCalcNumber(seaFreight)
  let sum = base + parseCalcNumber(thicknessAdj) + globalSurchargeSum
  if (withAfp) sum += parseCalcNumber(afpAdj)
  const usd = sum / (rate || 1) + freight
  const rounded = Math.round(usd * 10) / 10
  return Number.isFinite(rounded) ? rounded : 0
}

// Convenience: compute from entry + panel (extracts exchange_rate, sea_freight, global surcharges from entry)
export function computePanelRowPrice(entry, panel, row, withAfp = false) {
  return computeUsdPrice({
    panel,
    thicknessAdj: parseCalcNumber(row?.thickness_adj),
    afpAdj: parseCalcNumber(row?.afp_adj),
    withAfp,
    exchangeRate: entry?.exchange_rate,
    seaFreight: entry?.sea_freight,
    globalSurchargeSum: globalSurcharges(entry)
  })
}
