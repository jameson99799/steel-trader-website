<template>
  <div class="daily-price">
    <!-- Date picker: the date itself is the history selector -->
    <div class="price-toolbar">
      <label class="price-date">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
        <select
          class="date-select"
          :value="entry?.publish_date || ''"
          :disabled="loading"
          :aria-label="t('priceHistory')"
          @change="onHistoryChange"
        >
          <option v-if="!dates.length" :value="entry?.publish_date || ''">{{ entry?.publish_date || '—' }}</option>
          <option v-for="d in dates" :key="d.publish_date" :value="d.publish_date">{{ d.publish_date }}</option>
        </select>
        <svg class="chevron" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
      </label>
    </div>

    <div v-if="loading" class="price-loading">{{ t('priceLoading') }}</div>

    <template v-else-if="entry">
      <!-- GI left / GL right -->
      <div class="price-panels">
        <section
          v-for="side in sides"
          :key="side.key"
          class="price-panel"
          :class="`price-panel-${side.key}`"
          :aria-label="entry[sidePrefix(side.key) + '_product_name']"
        >
          <h2 class="panel-product">{{ entry[sidePrefix(side.key) + '_product_name'] }}</h2>
          <ul class="panel-info">
            <li v-for="field in infoFields(side.key)" :key="field.key">
              <strong>{{ field.label }}:</strong>
              <span>{{ field.value }}</span>
            </li>
          </ul>

          <div class="panel-table-wrap">
            <table class="price-table">
              <thead>
                <tr>
                  <th>{{ t('priceColSize') }}</th>
                  <th v-for="col in tableHeaders(side.key)" :key="col.full" v-html="col.html"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, index) in entry[sidePrefix(side.key) + '_items']"
                  :key="index"
                  :class="{ highlighted: highlighted[side.key] === index }"
                  tabindex="0"
                  @click="toggleHighlight(side.key, index)"
                  @keydown.enter.prevent="toggleHighlight(side.key, index)"
                  @keydown.space.prevent="toggleHighlight(side.key, index)"
                >
                  <td>{{ row.spec }}</td>
                  <td>{{ row.quantity }}</td>
                  <td>{{ computedFob(side.key, row) }}</td>
                  <td v-if="side.key === 'gl'" class="afp-col">{{ computedFob(side.key, row, true) }}</td>
                </tr>
                <tr v-if="!(entry[sidePrefix(side.key) + '_items'] || []).length">
                  <td :colspan="side.key === 'gl' ? 4 : 3" class="table-empty">{{ t('priceNoRows') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- Trade terms footer -->
      <ul class="price-terms">
        <li><strong>{{ t('priceTradeTerms') }}:</strong> {{ entry.trade_terms }}</li>
        <li><strong>{{ t('pricePaymentTerm') }}:</strong> {{ entry.payment_term }}</li>
        <li><strong>{{ t('priceValidity') }}:</strong> {{ entry.price_validity }}</li>
      </ul>
    </template>

    <div v-else class="price-empty">{{ t('priceNoData') }}</div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../api'
import { useLang } from '../composables/useLang'
import { computeUsdPrice } from '../../shared/dailyPriceCalc.js'

const route = useRoute()
const { t } = useLang()

const sides = [
  { key: 'gi' },
  { key: 'gl' }
]

const entry = ref(null)
const dates = ref([])
const loading = ref(true)
const highlighted = reactive({ gi: -1, gl: -1 })

const sidePrefix = key => (key === 'gi' ? 'gi' : 'gl')
// Trade-document labels stay in English by convention (they are part of the
// quote sheet itself, like the product name and trade terms).
const FIELD_LABELS = {
  grade: 'GRADE',
  spangle: 'SPANGLE',
  coating: 'COATING MASS',
  coilId: 'COIL ID',
  coilWeight: 'COIL WEIGHT'
}
const FIELD_COLUMNS = {
  productName: 'product_name',
  grade: 'grade',
  spangle: 'spangle',
  coating: 'coating',
  coilId: 'coil_id',
  coilWeight: 'coil_weight'
}

// Ordered info rows for one panel: follows the admin-defined field order,
// productName renders as the panel heading so it is skipped here.
function infoFields(sideKey) {
  const prefix = sidePrefix(sideKey)
  const order = entry.value?.[`${prefix}_field_order`] || []
  return order
    .filter(key => key !== 'productName')
    .map(key => ({
      key,
      label: FIELD_LABELS[key] || key,
      value: entry.value?.[`${prefix}_${FIELD_COLUMNS[key]}`] || ''
    }))
}

// Table headers with the unit pushed onto its own line: "FOB PRICE (USD/MT)"
// renders as "FOB PRICE" / "(USD/MT)". Returns v-html strings split on the
// first parenthesis group.
function headerHtml(text) {
  const label = String(text || '')
  const match = label.match(/^([^()]*)\((.*)\)\s*$/)
  if (!match) return { html: escapeHtml(label) }
  return { html: `${escapeHtml(match[1].trim())}<br><span class="th-unit">(${escapeHtml(match[2])})</span>` }
}

function tableHeaders(sideKey) {
  const keys = ['priceColQuantity', 'priceColFob']
  if (sideKey === 'gl') keys.push('priceColFobAfp')
  return keys.map(key => {
    const full = t(key)
    return { full, html: headerHtml(full).html }
  })
}

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function toggleHighlight(sideKey, index) {
  highlighted[sideKey] = highlighted[sideKey] === index ? -1 : index
}

const computedFob = (sideKey, row, withAfp = false) =>
  computeUsdPrice({
    entry: entry.value,
    side: sideKey,
    thicknessAdj: row?.thickness_adj,
    afpAdj: row?.afp_adj,
    withAfp: sideKey === 'gl' && withAfp
  })

async function loadDate(date) {
  loading.value = true
  try {
    const data = date ? await api.getDailyPriceByDate(date) : await api.getDailyPriceLatest()
    if (data) {
      entry.value = data
      highlighted.gi = -1
      highlighted.gl = -1
    } else if (!date) {
      entry.value = null
    }
  } catch (e) {
    if (date) {
      // Requested history date no longer exists — fall back to latest
      entry.value = await api.getDailyPriceLatest().catch(() => null)
    }
  } finally {
    loading.value = false
  }
}

async function onHistoryChange(event) {
  await loadDate(event.target.value)
}

onMounted(async () => {
  loadDate(null)
  api.getDailyPriceDates().then(list => { dates.value = list || [] }).catch(() => {})
})
</script>

<style scoped>
.daily-price { color: var(--text-primary); }
.price-toolbar {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  margin-bottom: 20px; flex-wrap: wrap;
}
.price-date { display: inline-flex; align-items: center; gap: 6px; }
.price-date > svg:first-child { width: 22px; height: 22px; color: var(--primary); }
.date-select {
  appearance: none; -webkit-appearance: none; border: none; background: transparent;
  font-size: 20px; font-weight: 700; color: var(--text-primary, #0f172a);
  font-family: inherit; cursor: pointer; padding-right: 2px;
}
.date-select:focus-visible { outline: 2px solid var(--primary, #1e40af); outline-offset: 2px; border-radius: 4px; }
.date-select:disabled { cursor: default; }
.price-date .chevron { width: 16px; height: 16px; color: var(--text-secondary); pointer-events: none; }

.price-panels {
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start;
}
@media (max-width: 900px) { .price-panels { grid-template-columns: 1fr; } }

.price-panel { border: 1px solid var(--border); border-radius: 12px; padding: 18px; background: var(--white, #fff); }
.panel-product { font-size: 16px; font-weight: 800; letter-spacing: .02em; margin: 0 0 12px; line-height: 1.4; }
.panel-info { list-style: none; margin: 0 0 14px; padding: 0; display: grid; gap: 4px; font-size: 14px; }
.panel-info strong { color: var(--text-secondary); font-size: 12px; letter-spacing: .05em; }

.panel-table-wrap { overflow-x: auto; }
.price-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.price-table th, .price-table td { border: 1px solid var(--border); padding: 8px 10px; text-align: center; white-space: nowrap; }
.price-table th { background: var(--gray-100, #f1f5f9); font-size: 12px; letter-spacing: .04em; }
.price-table th .th-unit { font-weight: 500; font-size: 11px; color: var(--text-secondary); }
.price-table tbody tr { cursor: pointer; transition: background .12s ease; }
.price-table tbody tr:hover { background: #f8fafc; }
.price-table tbody tr.highlighted { background: #dbeafe; box-shadow: inset 3px 0 0 var(--primary); }
.price-table .afp-col { background: #fffbeb; }
.price-table tr.highlighted .afp-col { background: #fde68a; }
.table-empty { text-align: center; color: var(--text-secondary); cursor: default; }
.table-empty:hover { background: transparent; }

.price-terms {
  margin: 20px 0 0; padding: 14px 18px; border: 1px solid var(--border); border-radius: 12px;
  background: var(--gray-50, #f8fafc); list-style: none; font-size: 14px; display: grid; gap: 4px;
}
.price-loading, .price-empty { padding: 40px 0; text-align: center; color: var(--text-secondary); }
</style>
