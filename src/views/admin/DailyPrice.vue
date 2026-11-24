<template>
  <div class="admin-daily-price">
    <div class="page-head">
      <h1>每日价格管理</h1>
      <p>按日期保存即发布。可自由添加/删除产品面板（GI/GL/CRC/自定义），控制每天显示哪些面板。</p>
    </div>

    <div class="toolbar">
      <label class="field"><span>发布日期</span><input type="date" v-model="form.publish_date" @change="onDateChange" /></label>
      <div class="field"><span>汇率 (RMB→USD)</span><input v-model="form.exchange_rate" placeholder="7.15" style="width:100px" /></div>
      <div class="field"><span>海运 (USD/吨)</span><input v-model="form.sea_freight" placeholder="30" style="width:80px" /></div>
      <button class="btn" @click="saveAll" :disabled="saving">{{ saving ? '保存中…' : '保存并发布' }}</button>
      <span v-if="saveMsg" class="save-msg" :class="{ err: saveErr }">{{ saveMsg }}</span>
    </div>

    <!-- 全局加价 -->
    <section class="calc-panel">
      <h2>全局加价 (元)</h2>
      <div class="field-grid">
        <label class="field"><span>包装</span><input v-model="form.packaging_surcharge" /></label>
        <label class="field"><span>头尾</span><input v-model="form.head_tail_surcharge" /></label>
        <label class="field"><span>陆运</span><input v-model="form.land_transport_surcharge" /></label>
        <label class="field"><span>港杂</span><input v-model="form.port_charges_surcharge" /></label>
        <label class="field"><span>特宽</span><input v-model="form.extra_width_surcharge" /></label>
        <label class="field"><span>喷码</span><input v-model="form.spray_code_surcharge" /></label>
      </div>
    </section>

    <!-- 动态面板列表 -->
    <div class="panels-container">
      <div class="crm-between" style="margin-bottom:14px">
        <h2 style="margin:0;font-size:16px">产品面板 ({{ form.panels.length }})</h2>
        <div class="crm-flex" style="gap:8px">
          <select class="crm-select" style="width:auto" v-model="addPanelKey" @change="addPanel">
            <option value="">＋ 添加面板…</option>
            <option v-for="tpl in availableTemplates" :key="tpl.key" :value="tpl.key">{{ tpl.label }}</option>
            <option value="custom">✏️ 自定义产品…</option>
          </select>
        </div>
      </div>

      <section v-for="(panel, pIdx) in form.panels" :key="panel.key" class="panel-editor" :class="{ 'panel-hidden': !panel.visible }">
        <div class="crm-between panel-head">
          <div class="crm-flex">
            <span class="panel-dot" :style="{ background: panelColor(pIdx) }"></span>
            <strong>{{ panel.productName || panel.key }}</strong>
            <label class="visible-toggle"><input type="checkbox" v-model="panel.visible" /> 显示</label>
            <label class="visible-toggle"><input type="checkbox" v-model="panel.has_afp" /> AFP列</label>
          </div>
          <button class="crm-btn crm-btn-danger crm-btn-sm" @click="removePanel(pIdx)">🗑️ 删除面板</button>
        </div>

        <div class="field-grid">
          <label class="field wide"><span>产品名称</span><input v-model="panel.productName" /></label>
          <label class="field"><span>基价 (元/吨)</span><input v-model="panel.base_price" /></label>
          <label class="field"><span>GRADE</span><input v-model="panel.grade" /></label>
          <label class="field"><span>SPANGLE</span><input v-model="panel.spangle" /></label>
          <label class="field"><span>COATING MASS</span><input v-model="panel.coating" /></label>
          <label class="field"><span>COIL ID</span><input v-model="panel.coilId" /></label>
          <label class="field"><span>COIL WEIGHT</span><input v-model="panel.coilWeight" /></label>
        </div>

        <div class="rows-box">
          <div class="crm-between rows-head">
            <span>价格行 → 自动算 FOB{{ panel.has_afp ? ' + AFP' : '' }}</span>
            <button class="crm-btn crm-btn-outline crm-btn-sm" @click="addRow(pIdx)">＋ 新增行</button>
          </div>
          <div class="row-line" v-for="(row, idx) in panel.items" :key="idx">
            <input v-model="row.spec" placeholder="尺寸" />
            <input v-model="row.quantity" placeholder="数量" />
            <input v-model="row.thickness_adj" placeholder="厚度加价 如+300" />
            <input v-if="panel.has_afp" v-model="row.afp_adj" placeholder="耐指纹加价" />
            <span class="calc-preview">
              <span class="calc-line">FOB ≈ {{ previewFob(panel, row, false) }}</span>
              <span v-if="panel.has_afp" class="calc-line afp">AFP ≈ {{ previewFob(panel, row, true) }}</span>
            </span>
            <span class="row-btns">
              <button :disabled="idx === 0" @click="moveRow(pIdx, idx, -1)">↑</button>
              <button :disabled="idx === panel.items.length - 1" @click="moveRow(pIdx, idx, 1)">↓</button>
              <button class="danger" @click="removeRow(pIdx, idx)">✕</button>
            </span>
          </div>
        </div>
      </section>
    </div>

    <section class="terms-panel">
      <h2>页脚贸易条款</h2>
      <div class="field-grid">
        <label class="field wide"><span>TRADE TERMS</span><input v-model="form.trade_terms" /></label>
        <label class="field wide"><span>PAYMENT TERM</span><input v-model="form.payment_term" /></label>
        <label class="field wide"><span>PRICE VALIDITY</span><input v-model="form.price_validity" /></label>
      </div>
    </section>

    <section class="history-panel">
      <h2>已发布日期</h2>
      <ul class="history-list">
        <li v-for="d in history" :key="d.publish_date" :class="{ current: d.publish_date === form.publish_date }">
          <button class="link" @click="loadDate(d.publish_date)">{{ d.publish_date }}</button>
          <button class="danger small" @click="deleteDate(d.publish_date)">删除</button>
        </li>
        <li v-if="!history.length" class="empty">暂无历史记录</li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../../api'
import { computePanelRowPrice, globalSurcharges, parseCalcNumber, calcDefaults } from '../../../shared/dailyPriceCalc.js'

const PANEL_TEMPLATES = [
  { key: 'gi', label: '热镀锌 (GI)', productName: 'PRIME HOT DIPPED GALVANIZED STEEL COILS', grade: 'DX51D', spangle: 'REGULAR SPANGLE', coating: 'Z100', coilId: '508mm', coilWeight: '6-9MT', base_price: 3500, has_afp: false },
  { key: 'gl', label: '镀铝锌 (GL)', productName: 'PRIME HOT DIPPED GALVALUME STEEL COILS', grade: 'DX51D', spangle: 'REGULAR SPANGLE', coating: 'AZ100', coilId: '508mm', coilWeight: '6-9MT', base_price: 3600, has_afp: true },
  { key: 'crc', label: '冷轧 (CRC)', productName: 'PRIME COLD ROLLED STEEL COILS', grade: 'SPCC', spangle: '—', coating: '—', coilId: '508mm', coilWeight: '3-8MT', base_price: 3800, has_afp: false },
  { key: 'ppgi', label: '彩涂 (PPGI)', productName: 'PRIME PREPAINTED GALVANIZED STEEL COILS', grade: 'TDC51D', spangle: '—', coating: 'PE 15μm', coilId: '508mm', coilWeight: '3-8MT', base_price: 4200, has_afp: false },
]

const today = () => new Date().toISOString().slice(0, 10)

function emptyPanel(key, label) {
  const tpl = PANEL_TEMPLATES.find(t => t.key === key)
  return {
    key: key,
    productName: tpl?.productName || (label ? 'PRIME ' + label.toUpperCase() + ' STEEL COILS' : ''),
    grade: tpl?.grade || 'DX51D',
    spangle: tpl?.spangle || 'REGULAR SPANGLE',
    coating: tpl?.coating || '—',
    coilId: tpl?.coilId || '508mm',
    coilWeight: tpl?.coilWeight || '6-9MT',
    base_price: tpl?.base_price || 3500,
    has_afp: tpl?.has_afp || false,
    visible: true,
    field_order: ['productName', 'grade', 'spangle', 'coating', 'coilId', 'coilWeight'],
    items: []
  }
}

const emptyForm = () => ({
  publish_date: today(),
  ...calcDefaults(),
  panels: [emptyPanel('gi'), emptyPanel('gl')],
  trade_terms: 'FOB TIANJIN PORT',
  payment_term: 'LC AT SIGHT OR TT',
  price_validity: 'SUBJECT TO OUR FINAL CONFIRMATION'
})

const form = ref(emptyForm())
const history = ref([])
const saving = ref(false)
const saveMsg = ref('')
const saveErr = ref(false)
const addPanelKey = ref('')

const panelColor = (idx) => ['#1e40af', '#0e7490', '#7c3aed', '#b45309', '#047857', '#be185d', '#dc2626'][idx % 7]

const availableTemplates = computed(() => {
  const used = new Set(form.value.panels.map(p => p.key))
  return PANEL_TEMPLATES.filter(t => !used.has(t.key))
})

function previewFob(panel, row, withAfp) {
  const entry = form.value
  return computePanelRowPrice(entry, panel, row, panel.has_afp && withAfp)
}

function applyEntry(entry) {
  if (!entry) return
  const panels = (entry.panels || []).map(p => ({
    key: p.key,
    productName: p.productName || '',
    grade: p.grade || '',
    spangle: p.spangle || '',
    coating: p.coating || '',
    coilId: p.coilId || '',
    coilWeight: p.coilWeight || '',
    base_price: p.base_price ?? 3500,
    has_afp: !!p.has_afp,
    visible: p.visible !== false,
    field_order: [...(p.field_order || [])],
    items: (p.items || []).map(r => ({ spec: r.spec || '', quantity: r.quantity || '', thickness_adj: r.thickness_adj ?? 0, ...(p.has_afp ? { afp_adj: r.afp_adj ?? 0 } : {}) }))
  }))
  form.value = {
    publish_date: entry.publish_date,
    exchange_rate: entry.exchange_rate ?? calcDefaults().exchange_rate,
    sea_freight: entry.sea_freight ?? calcDefaults().sea_freight,
    packaging_surcharge: entry.packaging_surcharge ?? 0,
    head_tail_surcharge: entry.head_tail_surcharge ?? 0,
    land_transport_surcharge: entry.land_transport_surcharge ?? 0,
    port_charges_surcharge: entry.port_charges_surcharge ?? 0,
    extra_width_surcharge: entry.extra_width_surcharge ?? 0,
    spray_code_surcharge: entry.spray_code_surcharge ?? 0,
    panels,
    trade_terms: entry.trade_terms || '',
    payment_term: entry.payment_term || '',
    price_validity: entry.price_validity || ''
  }
}

async function refreshHistory() {
  try { history.value = await api.getAdminDailyPrices() } catch (e) {}
}

async function onDateChange() {
  const date = form.value.publish_date
  if (!date) return
  const existing = history.value.find(d => d.publish_date === date)
  if (existing) { applyEntry(existing) }
  else { form.value = { ...form.value, publish_date: date }; saveMsg.value = '新日期已自动带入当前内容'; saveErr.value = false }
}

async function loadDate(date) {
  const existing = history.value.find(d => d.publish_date === date)
  if (existing) applyEntry(existing)
}

async function saveAll() {
  saving.value = true; saveMsg.value = ''; saveErr.value = false
  try {
    await api.saveDailyPrice({ ...form.value })
    saveMsg.value = '已保存发布 ✓'
    await refreshHistory()
  } catch (e) { saveErr.value = true; saveMsg.value = e.message || '保存失败' }
  finally { saving.value = false }
}

async function deleteDate(date) {
  if (!confirm('确认删除 ' + date + ' 的价格记录？')) return
  try {
    await api.deleteDailyPrice(date)
    if (form.value.publish_date === date) form.value = emptyForm()
    await refreshHistory()
  } catch (e) { alert(e.message) }
}

function addPanel() {
  if (!addPanelKey.value) return
  if (addPanelKey.value === 'custom') {
    const label = prompt('请输入产品面板名称（如：CRC、不锈钢、彩涂）:')
    if (!label) { addPanelKey.value = ''; return }
    const key = 'custom_' + Date.now()
    form.value.panels.push(emptyPanel(key, label))
  } else {
    form.value.panels.push(emptyPanel(addPanelKey.value))
  }
  addPanelKey.value = ''
}

function removePanel(idx) {
  if (!confirm('确认删除面板「' + (form.value.panels[idx].productName || form.value.panels[idx].key) + '」？')) return
  form.value.panels.splice(idx, 1)
}

function addRow(pIdx) {
  const panel = form.value.panels[pIdx]
  const row = { spec: '', quantity: '', thickness_adj: 0 }
  if (panel.has_afp) row.afp_adj = 0
  panel.items.push(row)
}

function removeRow(pIdx, idx) { form.value.panels[pIdx].items.splice(idx, 1) }

function moveRow(pIdx, idx, dir) {
  const list = form.value.panels[pIdx].items
  const target = idx + dir
  if (target < 0 || target >= list.length) return
  ;[list[idx], list[target]] = [list[target], list[idx]]
}

onMounted(async () => {
  await refreshHistory()
  if (history.value.length) applyEntry(history.value[0])
})
</script>

<style scoped>
.admin-daily-price { color: var(--crm-text, #0f172a); }
.page-head h1 { margin: 0 0 4px; font-size: 20px; }
.page-head p { margin: 0 0 16px; color: var(--crm-text-2, #64748b); font-size: 13px; }
.toolbar { display: flex; align-items: end; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.save-msg { font-size: 13px; color: #16a34a; }
.save-msg.err { color: #dc2626; }
.calc-panel { border: 1px solid var(--crm-border, #e2e8f0); border-radius: 10px; padding: 16px; background: #fffbeb; margin-bottom: 16px; }
.calc-panel h2 { margin: 0 0 12px; font-size: 15px; }
.panels-container { margin-bottom: 16px; }
.panel-editor { border: 1px solid var(--crm-border, #e2e8f0); border-radius: 10px; padding: 16px; background: #fff; margin-bottom: 16px; }
.panel-editor.panel-hidden { opacity: 0.55; border-style: dashed; }
.panel-head { margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--crm-border, #e2e8f0); }
.panel-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.visible-toggle { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; cursor: pointer; }
.visible-toggle input { accent-color: var(--crm-primary, #1e40af); }
.field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--crm-text-2, #64748b); }
.field input, .field select { padding: 7px 10px; border: 1px solid var(--crm-border, #e2e8f0); border-radius: 6px; font-size: 13px; }
.field.wide { margin-bottom: 10px; }
.field.wide input { width: 100%; }
.field-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 12px; }
.rows-box { border: 1px dashed var(--crm-border, #cbd5e1); border-radius: 8px; padding: 10px; }
.rows-head { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--crm-text-2, #64748b); margin-bottom: 8px; }
.row-line { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr auto auto; gap: 6px; margin-bottom: 6px; align-items: center; }
.row-line input { padding: 6px 8px; border: 1px solid var(--crm-border, #e2e8f0); border-radius: 6px; font-size: 13px; min-width: 0; }
.calc-preview { display: flex; flex-direction: column; gap: 2px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.calc-line { color: #16a34a; }
.calc-line.afp { color: #b45309; }
.row-btns { display: flex; gap: 4px; }
.row-btns button { padding: 2px 8px; border: 1px solid var(--crm-border, #e2e8f0); border-radius: 4px; background: #fff; cursor: pointer; font-size: 12px; }
.row-btns button:disabled { opacity: .4; }
.row-btns button.danger { color: #dc2626; border-color: #fecaca; }
.terms-panel, .history-panel { border: 1px solid var(--crm-border, #e2e8f0); border-radius: 10px; padding: 16px; background: #fff; margin-bottom: 16px; }
.terms-panel h2, .history-panel h2 { margin: 0 0 12px; font-size: 15px; }
.btn { padding: 8px 16px; border: none; border-radius: 8px; background: var(--crm-primary, #1e40af); color: #fff; font-weight: 600; cursor: pointer; font-family: inherit; font-size: 13px; }
.btn:disabled { opacity: .6; }
.btn.small { padding: 5px 10px; font-size: 12px; }
.crm-select { padding: 6px 10px; border: 1px solid var(--crm-border, #e2e8f0); border-radius: 6px; font-size: 13px; }
.history-list { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
.history-list li { display: flex; gap: 6px; align-items: center; border: 1px solid var(--crm-border, #e2e8f0); border-radius: 8px; padding: 4px 8px; }
.history-list li.current { border-color: var(--crm-primary, #1e40af); background: #eff6ff; }
.history-list .link { border: none; background: none; cursor: pointer; font-size: 13px; color: var(--crm-primary, #1e40af); padding: 0; }
.history-list .empty { border: none; color: var(--crm-text-2, #64748b); }
</style>
