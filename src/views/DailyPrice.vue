<template>
  <div class="daily-price">
    <div class="price-toolbar">
      <label class="price-date">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
        <select class="date-select" :value="entry?.publish_date || ''" :disabled="loading" :aria-label="t('priceHistory')" @change="onHistoryChange">
          <option v-if="!dates.length" :value="entry?.publish_date || ''">{{ entry?.publish_date || '—' }}</option>
          <option v-for="d in dates" :key="d.publish_date" :value="d.publish_date">{{ d.publish_date }}</option>
        </select>
        <svg class="chevron" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
      </label>
    </div>

    <div v-if="loading" class="price-loading">{{ t('priceLoading') }}</div>

    <template v-else-if="entry">
      <div class="price-panels">
        <section v-for="panel in visiblePanels" :key="panel.key" class="price-panel" :class="'price-panel-' + panel.key" :aria-label="panel.productName">
          <h2 class="panel-product">{{ panel.productName }}</h2>
          <ul class="panel-info">
            <li v-for="field in infoFields(panel)" :key="field.key">
              <strong>{{ field.label }}:</strong>
              <span>{{ field.value }}</span>
            </li>
          </ul>
          <div class="panel-table-wrap">
            <table class="price-table">
              <thead>
                <tr>
                  <th>{{ t('priceColSize') }}</th>
                  <th>{{ t('priceColQuantity') }}</th>
                  <th>{{ t('priceColFob') }}</th>
                  <th v-if="panel.has_afp" class="afp-col">{{ t('priceColFobAfp') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in panel.items" :key="index"
                    :class="{ highlighted: highlighted[panel.key] === index }"
                    tabindex="0"
                    @click="toggleHighlight(panel.key, index)"
                    @keydown.enter.prevent="toggleHighlight(panel.key, index)"
                    @keydown.space.prevent="toggleHighlight(panel.key, index)">
                  <td>{{ row.spec }}</td>
                  <td>{{ row.quantity }}</td>
                  <td>{{ computedFob(panel, row, false) }}</td>
                  <td v-if="panel.has_afp" class="afp-col">{{ computedFob(panel, row, true) }}</td>
                </tr>
                <tr v-if="!(panel.items || []).length">
                  <td :colspan="panel.has_afp ? 4 : 3" class="table-empty">{{ t('priceNoRows') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <ul class="price-terms">
        <li><strong>{{ t('priceTradeTerms') }}:</strong> {{ localizedValue(entry, 'trade_terms') }}</li>
        <li><strong>{{ t('pricePaymentTerm') }}:</strong> {{ localizedValue(entry, 'payment_term') }}</li>
        <li><strong>{{ t('priceValidity') }}:</strong> {{ localizedValue(entry, 'price_validity') }}</li>
      </ul>
    </template>

    <div v-else class="price-empty">{{ t('priceNoData') }}</div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../api'
import { useLang } from '../composables/useLang'
import { computePanelRowPrice, globalSurcharges } from '../../shared/dailyPriceCalc.js'

const route = useRoute()
const { t, localizedValue } = useLang()

const entry = ref(null)
const dates = ref([])
const loading = ref(true)
const highlighted = reactive({})

const visiblePanels = computed(() => (entry.value?.panels || []).filter(p => p.visible))
const surchargeSum = computed(() => globalSurcharges(entry.value))

const FIELD_LABEL_KEYS = {
  grade: 'priceFieldGrade',
  spangle: 'priceFieldSpangle',
  coating: 'priceFieldCoating',
  coilId: 'priceFieldCoilId',
  coilWeight: 'priceFieldCoilWeight'
}
const FIELD_KEYS = {
  productName: 'productName',
  grade: 'grade',
  spangle: 'spangle',
  coating: 'coating',
  coilId: 'coilId',
  coilWeight: 'coilWeight'
}

function infoFields(panel) {
  const order = panel.field_order || []
  return order
    .filter(key => key !== 'productName')
    .map(key => ({
      key,
      label: t(FIELD_LABEL_KEYS[key] || key),
      value: panel[FIELD_KEYS[key]] || ''
    }))
}

function toggleHighlight(panelKey, index) {
  highlighted[panelKey] = highlighted[panelKey] === index ? -1 : index
}

const computedFob = (panel, row, withAfp) =>
  computePanelRowPrice(entry.value, panel, row, panel.has_afp && withAfp)

async function loadDate(date) {
  loading.value = true
  try {
    const data = date ? await api.getDailyPriceByDate(date) : await api.getDailyPriceLatest()
    if (data) { entry.value = data; Object.keys(highlighted).forEach(k => delete highlighted[k]) }
    else if (!date) entry.value = null
  } catch (e) {
    if (date) entry.value = await api.getDailyPriceLatest().catch(() => null)
  } finally { loading.value = false }
}

async function onHistoryChange(event) { await loadDate(event.target.value) }

onMounted(() => {
  loadDate(null)
  api.getDailyPriceDates().then(list => { dates.value = list || [] }).catch(() => {})
})
</script>

<style scoped>
.daily-price { color: var(--crm-text, #0f172a); }
.price-toolbar { display: flex; align-items: center; margin-bottom: 20px; }
.price-date { display: inline-flex; align-items: center; gap: 6px; }
.price-date > svg:first-child { width: 22px; height: 22px; color: var(--crm-primary, #1e40af); }
.date-select { appearance: none; -webkit-appearance: none; border: none; background: transparent; font-size: 20px; font-weight: 700; color: var(--crm-text, #0f172a); font-family: inherit; cursor: pointer; padding-right: 2px; }
.date-select:focus-visible { outline: 2px solid var(--crm-primary, #1e40af); outline-offset: 2px; border-radius: 4px; }
.date-select:disabled { cursor: default; }
.price-date .chevron { width: 16px; height: 16px; color: var(--crm-text-2, #64748b); pointer-events: none; }

.price-panels { display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 16px; align-items: start; }
.price-panel { border: 1px solid var(--crm-border, #e6eaf2); border-radius: var(--crm-radius, 14px); padding: 18px; background: var(--crm-card, #fff); }
.panel-product { font-size: 16px; font-weight: 800; letter-spacing: .02em; margin: 0 0 12px; line-height: 1.4; }
.panel-info { list-style: none; margin: 0 0 14px; padding: 0; display: grid; gap: 4px; font-size: 14px; }
.panel-info strong { color: var(--crm-text-2, #64748b); font-size: 12px; letter-spacing: .05em; }

.panel-table-wrap { overflow-x: auto; }
.price-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.price-table th, .price-table td { border: 1px solid var(--crm-border, #e6eaf2); padding: 8px 10px; text-align: center; white-space: nowrap; }
.price-table th { background: var(--crm-bg, #f6f8fb); font-size: 12px; letter-spacing: .04em; }
.price-table th .th-unit { font-weight: 500; font-size: 11px; color: var(--crm-text-2, #64748b); }
.price-table tbody tr { cursor: pointer; transition: background .12s ease; }
.price-table tbody tr:hover { background: #f8fafc; }
.price-table tbody tr.highlighted { background: #dbeafe; box-shadow: inset 3px 0 0 var(--crm-primary, #1e40af); }
.price-table .afp-col { background: #fffbeb; }
.price-table tr.highlighted .afp-col { background: #fde68a; }
.table-empty { text-align: center; color: var(--crm-text-2, #64748b); cursor: default; }
.table-empty:hover { background: transparent; }

.price-terms { margin: 20px 0 0; padding: 14px 18px; border: 1px solid var(--crm-border, #e6eaf2); border-radius: var(--crm-radius, 14px); background: var(--crm-bg, #f8fafc); list-style: none; font-size: 14px; display: grid; gap: 4px; }
.price-loading, .price-empty { padding: 40px 0; text-align: center; color: var(--crm-text-2, #64748b); }
</style>
