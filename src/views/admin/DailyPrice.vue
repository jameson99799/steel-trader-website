<template>
  <div class="admin-daily-price">
    <div class="page-head">
      <h1>每日价格管理 (GI / GL)</h1>
      <p>按日期保存即发布。表格价格 = （基价 + 厚度加价 + 包装 + 头尾 + 陆运 + 港杂 + 特宽 + 喷码）÷ 汇率 + 海运；GL 的 AFP 列再在分子中加上该行的耐指纹加价。新建日期自动带入当前内容，日常只需改基价/加价。</p>
    </div>

    <div class="toolbar">
      <label class="field"><span>发布日期</span><input type="date" v-model="form.publish_date" @change="onDateChange" /></label>
      <button class="btn" @click="saveAll" :disabled="saving">{{ saving ? '保存中…' : '保存并发布' }}</button>
      <span v-if="saveMsg" class="save-msg" :class="{ err: saveErr }">{{ saveMsg }}</span>
    </div>

    <!-- 计价参数 -->
    <section class="calc-panel">
      <h2>计价参数</h2>
      <div class="field-grid">
        <label class="field"><span>基价 (元/吨)</span><input v-model="form.base_price" placeholder="3500" /></label>
        <label class="field"><span>汇率 (RMB→USD)</span><input v-model="form.exchange_rate" placeholder="7.15" /></label>
        <label class="field"><span>海运 (USD/吨)</span><input v-model="form.sea_freight" placeholder="30" /></label>
      </div>
      <div class="field-grid">
        <label class="field"><span>包装 (元)</span><input v-model="form.packaging_surcharge" /></label>
        <label class="field"><span>头尾 (元)</span><input v-model="form.head_tail_surcharge" /></label>
        <label class="field"><span>陆运 (元)</span><input v-model="form.land_transport_surcharge" /></label>
        <label class="field"><span>港杂 (元)</span><input v-model="form.port_charges_surcharge" /></label>
        <label class="field"><span>特宽 (元)</span><input v-model="form.extra_width_surcharge" /></label>
        <label class="field"><span>喷码 (元)</span><input v-model="form.spray_code_surcharge" /></label>
      </div>
    </section>

    <div class="panels">
      <!-- GI -->
      <section class="side-panel">
        <h2>热镀锌钢卷 (GI) — 左侧</h2>
        <label class="field wide"><span>产品名称</span><input v-model="form.gi_product_name" /></label>
        <div class="field-grid">
          <label class="field"><span>GRADE</span><input v-model="form.gi_grade" /></label>
          <label class="field"><span>SPANGLE（普通锌花）</span><input v-model="form.gi_spangle" /></label>
          <label class="field"><span>COATING MASS（镀锌量）</span><input v-model="form.gi_coating" /></label>
          <label class="field"><span>COIL ID（卷内径）</span><input v-model="form.gi_coil_id" /></label>
          <label class="field"><span>COIL WEIGHT（卷重）</span><input v-model="form.gi_coil_weight" /></label>
        </div>
        <div class="order-box">
          <span class="order-title">信息字段显示顺序（上/下调整）</span>
          <ul>
            <li v-for="(key, idx) in form.gi_field_order" :key="key">
              <span>{{ fieldLabel(key) }}</span>
              <span class="order-btns">
                <button :disabled="idx === 0" @click="moveField('gi', idx, -1)">↑</button>
                <button :disabled="idx === form.gi_field_order.length - 1" @click="moveField('gi', idx, 1)">↓</button>
              </span>
            </li>
          </ul>
        </div>
        <div class="rows-box">
          <div class="rows-head">
            <span>价格行：尺寸 / 数量 / 厚度加价 → 自动算 FOB</span>
            <button class="btn small" @click="addRow('gi')">＋ 新增行</button>
          </div>
          <div class="row-line gi" v-for="(row, idx) in form.gi_items" :key="idx">
            <input v-model="row.spec" placeholder="尺寸 如 0.14×1000" />
            <input v-model="row.quantity" placeholder="数量 如 500MT" />
            <input v-model="row.thickness_adj" placeholder="厚度加价 如 +300" />
            <span class="calc-preview">
              <span class="calc-line">FOB ≈ {{ previewFob(row) }}</span>
            </span>
            <span class="row-btns">
              <button :disabled="idx === 0" @click="moveRow('gi', idx, -1)">↑</button>
              <button :disabled="idx === form.gi_items.length - 1" @click="moveRow('gi', idx, 1)">↓</button>
              <button class="danger" @click="removeRow('gi', idx)">✕</button>
            </span>
          </div>
        </div>
      </section>

      <!-- GL -->
      <section class="side-panel">
        <h2>热镀铝锌钢卷 (GL) — 右侧</h2>
        <label class="field wide"><span>产品名称</span><input v-model="form.gl_product_name" /></label>
        <div class="field-grid">
          <label class="field"><span>GRADE</span><input v-model="form.gl_grade" /></label>
          <label class="field"><span>SPANGLE（普通锌花）</span><input v-model="form.gl_spangle" /></label>
          <label class="field"><span>COATING MASS（镀铝锌量）</span><input v-model="form.gl_coating" /></label>
          <label class="field"><span>COIL ID（卷内径）</span><input v-model="form.gl_coil_id" /></label>
          <label class="field"><span>COIL WEIGHT（卷重）</span><input v-model="form.gl_coil_weight" /></label>
        </div>
        <div class="order-box">
          <span class="order-title">信息字段显示顺序（上/下调整）</span>
          <ul>
            <li v-for="(key, idx) in form.gl_field_order" :key="key">
              <span>{{ fieldLabel(key) }}</span>
              <span class="order-btns">
                <button :disabled="idx === 0" @click="moveField('gl', idx, -1)">↑</button>
                <button :disabled="idx === form.gl_field_order.length - 1" @click="moveField('gl', idx, 1)">↓</button>
              </span>
            </li>
          </ul>
        </div>
        <div class="rows-box">
          <div class="rows-head">
            <span>价格行：尺寸 / 数量 / 厚度加价 / 耐指纹加价 → 自动算 FOB 与 AFP</span>
            <button class="btn small" @click="addRow('gl')">＋ 新增行</button>
          </div>
          <div class="row-line gl" v-for="(row, idx) in form.gl_items" :key="idx">
            <input v-model="row.spec" placeholder="尺寸 如 0.14×1000" />
            <input v-model="row.quantity" placeholder="数量 如 500MT" />
            <input v-model="row.thickness_adj" placeholder="厚度加价 如 +350" />
            <input v-model="row.afp_adj" placeholder="耐指纹加价 如 +20" />
            <span class="calc-preview">
              <span class="calc-line">FOB ≈ {{ previewFob(row, false) }}</span>
              <span class="calc-line afp">AFP ≈ {{ previewFob(row, true) }}</span>
            </span>
            <span class="row-btns">
              <button :disabled="idx === 0" @click="moveRow('gl', idx, -1)">↑</button>
              <button :disabled="idx === form.gl_items.length - 1" @click="moveRow('gl', idx, 1)">↓</button>
              <button class="danger" @click="removeRow('gl', idx)">✕</button>
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
      <h2>已发布日期（点击载入编辑）</h2>
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
import { ref, onMounted } from 'vue'
import api from '../../api'
import { computeUsdPrice, calcDefaults, parseCalcNumber } from '../../../shared/dailyPriceCalc.js'

const FIELD_LABELS = {
  productName: '产品名称',
  grade: 'GRADE',
  spangle: 'SPANGLE',
  coating: 'COATING MASS',
  coilId: 'COIL ID',
  coilWeight: 'COIL WEIGHT'
}

const today = () => new Date().toISOString().slice(0, 10)

// 空白表单 = 上期记忆的载体：默认取计价默认值，日期变更时自动带入当前表单内容
const emptyForm = () => ({
  publish_date: today(),
  ...calcDefaults(),
  gi_product_name: 'PRIME HOT DIPPED GALVANIZED STEEL COILS',
  gi_grade: 'DX51D',
  gi_spangle: 'REGULAR SPANGLE',
  gi_coating: 'Z100',
  gi_coil_id: '508mm',
  gi_coil_weight: '6-9MT',
  gi_field_order: ['productName', 'grade', 'spangle', 'coating', 'coilId', 'coilWeight'],
  gi_items: [],
  gl_product_name: 'PRIME HOT DIPPED GALVALUME STEEL COILS',
  gl_grade: 'DX51D',
  gl_spangle: 'REGULAR SPANGLE',
  gl_coating: 'AZ100',
  gl_coil_id: '508mm',
  gl_coil_weight: '6-9MT',
  gl_field_order: ['productName', 'grade', 'spangle', 'coating', 'coilId', 'coilWeight'],
  gl_items: [],
  trade_terms: 'FOB TIANJIN PORT',
  payment_term: 'LC AT SIGHT OR TT',
  price_validity: 'SUBJECT TO OUR FINAL CONFIRMATION'
})

const form = ref(emptyForm())
const history = ref([])
const saving = ref(false)
const saveMsg = ref('')
const saveErr = ref(false)

const fieldLabel = key => FIELD_LABELS[key] || key

// 后台实时预览：输入厚度加价（及 GL 行的耐指纹加价）即看到最终 USD 价格
function previewFob(row, withAfp = false) {
  return computeUsdPrice({
    entry: form.value,
    thicknessAdj: parseCalcNumber(row?.thickness_adj),
    afpAdj: parseCalcNumber(row?.afp_adj),
    withAfp
  })
}

function applyEntry(entry) {
  if (!entry) return
  form.value = {
    publish_date: entry.publish_date,
    base_price: entry.base_price ?? 0,
    exchange_rate: entry.exchange_rate ?? 0,
    sea_freight: entry.sea_freight ?? 0,
    packaging_surcharge: entry.packaging_surcharge ?? 0,
    head_tail_surcharge: entry.head_tail_surcharge ?? 0,
    land_transport_surcharge: entry.land_transport_surcharge ?? 0,
    port_charges_surcharge: entry.port_charges_surcharge ?? 0,
    extra_width_surcharge: entry.extra_width_surcharge ?? 0,
    spray_code_surcharge: entry.spray_code_surcharge ?? 0,
    gi_product_name: entry.gi_product_name || '',
    gi_grade: entry.gi_grade || '',
    gi_spangle: entry.gi_spangle || '',
    gi_coating: entry.gi_coating || '',
    gi_coil_id: entry.gi_coil_id || '',
    gi_coil_weight: entry.gi_coil_weight || '',
    gi_field_order: [...(entry.gi_field_order || [])],
    gi_items: (entry.gi_items || []).map(r => ({ spec: r.spec || '', quantity: r.quantity || '', thickness_adj: r.thickness_adj ?? 0 })),
    gl_product_name: entry.gl_product_name || '',
    gl_grade: entry.gl_grade || '',
    gl_spangle: entry.gl_spangle || '',
    gl_coating: entry.gl_coating || '',
    gl_coil_id: entry.gl_coil_id || '',
    gl_coil_weight: entry.gl_coil_weight || '',
    gl_field_order: [...(entry.gl_field_order || [])],
    gl_items: (entry.gl_items || []).map(r => ({ spec: r.spec || '', quantity: r.quantity || '', thickness_adj: r.thickness_adj ?? 0, afp_adj: r.afp_adj ?? 0 })),
    trade_terms: entry.trade_terms || '',
    payment_term: entry.payment_term || '',
    price_validity: entry.price_validity || ''
  }
}

async function refreshHistory() {
  try {
    history.value = await api.getAdminDailyPrices()
  } catch (e) { /* first run: empty */ }
}

// 日期切换：已有记录则载入；新日期自动带入当前表单内容（=上期），仅日期不同
async function onDateChange() {
  const date = form.value.publish_date
  if (!date) return
  const existing = history.value.find(d => d.publish_date === date)
  if (existing) {
    applyEntry(existing)
  } else {
    form.value = { ...form.value, publish_date: date }
    saveMsg.value = '新日期已自动带入当前内容（含基价与全部加价），修改后保存即可'
    saveErr.value = false
  }
}

async function loadDate(date) {
  const existing = history.value.find(d => d.publish_date === date)
  if (existing) applyEntry(existing)
}

async function saveAll() {
  saving.value = true
  saveMsg.value = ''
  saveErr.value = false
  try {
    await api.saveDailyPrice({ ...form.value })
    saveMsg.value = '已保存发布 ✓'
    await refreshHistory()
  } catch (e) {
    saveErr.value = true
    saveMsg.value = e.message || '保存失败'
  } finally {
    saving.value = false
  }
}

async function deleteDate(date) {
  if (!confirm(`确认删除 ${date} 的价格记录？`)) return
  try {
    await api.deleteDailyPrice(date)
    if (form.value.publish_date === date) {
      form.value = emptyForm()
    }
    await refreshHistory()
  } catch (e) {
    alert(e.message || '删除失败')
  }
}

function moveField(side, idx, dir) {
  const list = form.value[`${side}_field_order`]
  const target = idx + dir
  if (target < 0 || target >= list.length) return
  ;[list[idx], list[target]] = [list[target], list[idx]]
}

function addRow(side) {
  form.value[`${side}_items`].push(side === 'gl'
    ? { spec: '', quantity: '', thickness_adj: 0, afp_adj: 0 }
    : { spec: '', quantity: '', thickness_adj: 0 })
}

function removeRow(side, idx) {
  form.value[`${side}_items`].splice(idx, 1)
}

function moveRow(side, idx, dir) {
  const list = form.value[`${side}_items`]
  const target = idx + dir
  if (target < 0 || target >= list.length) return
  ;[list[idx], list[target]] = [list[target], list[idx]]
}

onMounted(async () => {
  await refreshHistory()
  if (history.value.length) {
    // 编辑器默认载入最新一期（含最后一次填写的基价与加价）
    applyEntry(history.value[0])
  }
})
</script>

<style scoped>
.admin-daily-price { color: var(--text-primary, #0f172a); }
.page-head h1 { margin: 0 0 4px; font-size: 20px; }
.page-head p { margin: 0 0 16px; color: var(--text-secondary, #64748b); font-size: 13px; }

.toolbar { display: flex; align-items: end; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.save-msg { font-size: 13px; color: #16a34a; }
.save-msg.err { color: #dc2626; }

.calc-panel { border: 1px solid var(--border, #e2e8f0); border-radius: 10px; padding: 16px; background: #fffbeb; margin-bottom: 16px; }
.calc-panel h2 { margin: 0 0 12px; font-size: 15px; }

.panels { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 1100px) { .panels { grid-template-columns: 1fr; } }

.side-panel, .terms-panel, .history-panel {
  border: 1px solid var(--border, #e2e8f0); border-radius: 10px; padding: 16px; background: #fff; margin-bottom: 16px;
}
.side-panel h2, .terms-panel h2, .history-panel h2 { margin: 0 0 12px; font-size: 15px; }

.field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--text-secondary, #64748b); }
.field input { padding: 7px 10px; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; font-size: 13px; }
.field.wide { margin-bottom: 10px; }
.field.wide input { width: 100%; }
.field-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 12px; }

.order-box { border: 1px dashed var(--border, #cbd5e1); border-radius: 8px; padding: 10px; margin-bottom: 12px; }
.order-title { font-size: 12px; color: var(--text-secondary, #64748b); display: block; margin-bottom: 6px; }
.order-box ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.order-box li { display: flex; justify-content: space-between; align-items: center; font-size: 13px; background: var(--gray-50, #f8fafc); border-radius: 6px; padding: 4px 8px; }
.order-btns { display: flex; gap: 4px; }
.order-btns button, .row-btns button { padding: 2px 8px; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; background: #fff; cursor: pointer; font-size: 12px; }
.order-btns button:disabled, .row-btns button:disabled { opacity: .4; cursor: default; }

.rows-box { border: 1px dashed var(--border, #cbd5e1); border-radius: 8px; padding: 10px; }
.rows-head { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text-secondary, #64748b); margin-bottom: 8px; }
.row-line { display: grid; grid-template-columns: 1fr 1fr 1fr auto auto; gap: 6px; margin-bottom: 6px; align-items: center; }
.row-line.gl { grid-template-columns: 1fr 1fr 1fr 1fr auto auto; }
.row-line input { padding: 6px 8px; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; font-size: 13px; min-width: 0; }
.calc-preview { display: flex; flex-direction: column; gap: 2px; font-size: 12px; font-weight: 700; white-space: nowrap; }
.calc-line { color: #16a34a; }
.calc-line.afp { color: #b45309; }
.row-btns { display: flex; gap: 4px; align-items: center; }
button.danger { color: #dc2626; border-color: #fecaca !important; }
button.small { padding: 5px 10px; font-size: 12px; }
.btn { padding: 8px 16px; border: none; border-radius: 8px; background: var(--primary, #1e40af); color: #fff; font-weight: 600; cursor: pointer; }
.btn:disabled { opacity: .6; cursor: default; }
.btn.small { background: var(--gray-100, #f1f5f9); color: var(--text-primary, #0f172a); }

.history-list { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
.history-list li { display: flex; gap: 6px; align-items: center; border: 1px solid var(--border, #e2e8f0); border-radius: 8px; padding: 4px 8px; }
.history-list li.current { border-color: var(--primary, #1e40af); background: #eff6ff; }
.history-list .link { border: none; background: none; cursor: pointer; font-size: 13px; color: var(--primary, #1e40af); padding: 0; }
.history-list .empty { border: none; color: var(--text-secondary, #64748b); }
</style>
