<template>
  <div class="futures-page">
    <!-- Loading -->
    <div v-if="loading" class="futures-loading">
      <div class="spinner"></div>
      <p>加载期货行情中...</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="futuresList.length === 0" class="futures-empty">
      <div class="empty-icon">📈</div>
      <p>暂未配置期货品种，请联系管理员添加</p>
    </div>

    <!-- Futures Cards Grid -->
    <div v-else class="futures-grid">
      <div
        v-for="item in futuresList"
        :key="item.symbol"
        class="futures-card"
        :class="{ loading: item.loading }"
      >
        <!-- Card Header -->
        <div class="card-header">
          <div class="symbol-info">
            <span class="symbol-code">{{ item.symbol }}</span>
            <span class="exchange-tag">{{ item.exchange }}</span>
          </div>
          <div class="symbol-name">{{ item.name || item.name_en }}</div>
        </div>

        <!-- Price Display -->
        <div class="card-price-row" v-if="item.latest">
          <div class="latest-price" :class="item.change >= 0 ? 'up' : 'down'">
            {{ item.latest }}
          </div>
          <div class="price-change" :class="item.change >= 0 ? 'up' : 'down'">
            <span class="change-arrow">{{ item.change >= 0 ? '▲' : '▼' }}</span>
            <span>{{ Math.abs(item.change).toFixed(1) }}</span>
            <span>({{ item.changePct }}%)</span>
          </div>
        </div>
        <div class="card-price-row" v-else>
          <div class="no-price">{{ t('futuresNoData') }}</div>
        </div>

        <!-- OHLV Row -->
        <div class="card-stats" v-if="item.latest">
          <div class="stat-item">
            <span class="stat-label">{{ t('futuresOpen') }}</span>
            <span class="stat-val">{{ item.open }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">{{ t('futuresHigh') }}</span>
            <span class="stat-val up">{{ item.high }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">{{ t('futuresLow') }}</span>
            <span class="stat-val down">{{ item.low }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">{{ t('futuresVol') }}</span>
            <span class="stat-val">{{ formatVol(item.vol) }}</span>
          </div>
        </div>

        <!-- Mini K-Line Canvas -->
        <div class="mini-chart-wrap" v-if="item.kdata && item.kdata.length > 1">
          <canvas
            :ref="el => { if(el) miniChartRefs[item.symbol] = el }"
            class="mini-chart"
            width="280" height="60"
          ></canvas>
        </div>

        <!-- Footer: date + K线 button -->
        <div class="card-footer">
          <span class="last-date" v-if="item.lastDate">{{ item.lastDate }}</span>
          <button
            v-if="item.kdata && item.kdata.length > 1"
            class="kline-btn"
            @click="openKline(item)"
          >
            📊 {{ t('futuresKline') }}
          </button>
        </div>
      </div>
    </div>

    <!-- K-Line Fullscreen Modal -->
    <Teleport to="body">
      <div class="kline-modal" v-if="modalItem" @click.self="closeModal">
        <div class="kline-modal-inner">
          <div class="modal-header">
            <div class="modal-title-wrap">
              <span class="modal-symbol">{{ modalItem.symbol }}</span>
              <span class="modal-name">{{ modalItem.name || modalItem.name_en }}</span>
              <span class="modal-exchange">{{ modalItem.exchange }}</span>
              <span class="modal-price" :class="modalItem.change >= 0 ? 'up' : 'down'" v-if="modalItem.latest">
                {{ modalItem.latest }}
                <span class="modal-change">{{ modalItem.change >= 0 ? '+' : '' }}{{ modalItem.change.toFixed(1) }} ({{ modalItem.changePct }}%)</span>
              </span>
            </div>
            <div class="modal-controls">
              <button
                v-for="d in dayOptions"
                :key="d.value"
                :class="['day-btn', activeDays === d.value ? 'active' : '']"
                @click="activeDays = d.value; drawFullKline()"
              >{{ d.label }}</button>
              <button class="close-btn" @click="closeModal">✕</button>
            </div>
          </div>
          <!-- Full K-Line Canvas -->
          <div class="kline-canvas-wrap">
            <canvas ref="fullKlineCanvas" class="full-kline-canvas"></canvas>
          </div>
          <!-- Tooltip -->
          <div class="kline-tooltip" v-if="tooltip.visible" :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }">
            <div class="tip-date">{{ tooltip.date }}</div>
            <div class="tip-row"><span>开盘</span><span>{{ tooltip.open }}</span></div>
            <div class="tip-row"><span>收盘</span><span :class="parseFloat(tooltip.close) >= parseFloat(tooltip.open) ? 'up' : 'down'">{{ tooltip.close }}</span></div>
            <div class="tip-row"><span>最高</span><span class="up">{{ tooltip.high }}</span></div>
            <div class="tip-row"><span>最低</span><span class="down">{{ tooltip.low }}</span></div>
            <div class="tip-row"><span>成交量</span><span>{{ tooltip.vol }}</span></div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, reactive } from 'vue'
import { useLang } from '../composables/useLang'
import api from '../api'

const { t } = useLang()

const loading = ref(true)
const futuresList = ref([])
const miniChartRefs = reactive({})
const fullKlineCanvas = ref(null)
const modalItem = ref(null)
const activeDays = ref(60)
const tooltip = ref({ visible: false, x: 0, y: 0, date: '', open: '', close: '', high: '', low: '', vol: '' })
let refreshTimer = null

const dayOptions = [
  { value: 30, label: t('futuresDays30') },
  { value: 90, label: t('futuresDays90') },
  { value: 9999, label: t('futuresDaysAll') }
]

function formatVol(v) {
  if (!v) return '-'
  const n = parseInt(v)
  if (n >= 10000) return (n / 10000).toFixed(1) + '万手'
  return n + '手'
}

async function loadAll() {
  loading.value = true
  try {
    const list = await api.getFuturesList()
    futuresList.value = list.map(item => ({ ...item, loading: true, kdata: [], latest: null, change: 0, changePct: '0.00' }))
    // Load kline for each symbol
    await Promise.all(futuresList.value.map(item => loadKline(item)))
  } catch (e) {
    console.error('Futures load error:', e)
  } finally {
    loading.value = false
    await nextTick()
    futuresList.value.forEach(item => drawMiniChart(item))
  }
}

async function loadKline(item) {
  try {
    const data = await api.getFuturesKline(item.symbol)
    item.kdata = data || []
    if (data && data.length > 0) {
      const last = data[data.length - 1]
      const prev = data.length > 1 ? data[data.length - 2] : last
      item.latest = last.c
      item.open = last.o
      item.high = last.h
      item.low = last.l
      item.vol = last.v
      item.lastDate = last.d
      const change = parseFloat(last.c) - parseFloat(prev.c)
      item.change = change
      item.changePct = prev.c !== '0' ? (change / parseFloat(prev.c) * 100).toFixed(2) : '0.00'
    }
  } catch (e) {
    item.kdata = []
  } finally {
    item.loading = false
  }
}

function drawMiniChart(item) {
  const canvas = miniChartRefs[item.symbol]
  if (!canvas || !item.kdata || item.kdata.length < 2) return
  const data = item.kdata.slice(-30)  // last 30 days
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  ctx.clearRect(0, 0, W, H)

  const closes = data.map(d => parseFloat(d.c))
  const minP = Math.min(...closes)
  const maxP = Math.max(...closes)
  const range = maxP - minP || 1
  const pad = { t: 4, b: 4, l: 4, r: 4 }
  const iW = W - pad.l - pad.r
  const iH = H - pad.t - pad.b
  const step = iW / (data.length - 1)

  // Determine color by trend
  const isUp = closes[closes.length - 1] >= closes[0]
  const lineColor = isUp ? '#16a34a' : '#dc2626'
  const fillColor = isUp ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)'

  ctx.beginPath()
  data.forEach((d, i) => {
    const x = pad.l + i * step
    const y = pad.t + iH - ((parseFloat(d.c) - minP) / range) * iH
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.strokeStyle = lineColor
  ctx.lineWidth = 1.5
  ctx.lineJoin = 'round'
  ctx.stroke()

  // Fill below
  ctx.lineTo(pad.l + (data.length - 1) * step, H - pad.b)
  ctx.lineTo(pad.l, H - pad.b)
  ctx.closePath()
  ctx.fillStyle = fillColor
  ctx.fill()
}

function openKline(item) {
  modalItem.value = item
  activeDays.value = 60
  nextTick(() => drawFullKline())
}

function closeModal() {
  modalItem.value = null
  tooltip.value.visible = false
}

function drawFullKline() {
  const canvas = fullKlineCanvas.value
  if (!canvas || !modalItem.value) return
  const item = modalItem.value
  const allData = item.kdata || []
  const data = activeDays.value >= 9999 ? allData : allData.slice(-activeDays.value)
  if (data.length < 2) return

  // Resize canvas to parent
  const parent = canvas.parentElement
  canvas.width = parent.clientWidth || 900
  canvas.height = parent.clientHeight || 400
  const W = canvas.width, H = canvas.height
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, W, H)

  const pad = { t: 30, b: 40, l: 55, r: 20 }
  const iW = W - pad.l - pad.r
  const iH = H - pad.t - pad.b
  const n = data.length

  const highs = data.map(d => parseFloat(d.h))
  const lows = data.map(d => parseFloat(d.l))
  const minP = Math.min(...lows)
  const maxP = Math.max(...highs)
  const range = maxP - minP || 1
  const candleW = Math.max(2, Math.min(18, iW / n - 2))

  function px(price) { return pad.t + iH - ((price - minP) / range) * iH }
  function cx(i) { return pad.l + (i + 0.5) * (iW / n) }

  // Background
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, W, H)

  // Grid lines + Y labels
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  ctx.font = '11px sans-serif'
  ctx.fillStyle = '#64748b'
  const gridCount = 5
  for (let i = 0; i <= gridCount; i++) {
    const y = pad.t + (iH / gridCount) * i
    const price = maxP - (range / gridCount) * i
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + iW, y); ctx.stroke()
    ctx.fillText(price.toFixed(1), 4, y + 4)
  }

  // X axis labels (show ~6 dates)
  const labelStep = Math.max(1, Math.floor(n / 6))
  ctx.fillStyle = '#64748b'
  ctx.font = '10px sans-serif'
  for (let i = 0; i < n; i += labelStep) {
    const x = cx(i)
    const d = data[i].d || ''
    const label = d.slice(5)  // MM-DD
    ctx.fillText(label, x - 16, H - 10)
  }

  // Candles
  data.forEach((d, i) => {
    const o = parseFloat(d.o), c = parseFloat(d.c), h = parseFloat(d.h), l = parseFloat(d.l)
    const isUp = c >= o
    const color = isUp ? '#16a34a' : '#dc2626'
    const x = cx(i)
    const top = px(Math.max(o, c))
    const bot = px(Math.min(o, c))
    const candleH = Math.max(1, bot - top)

    ctx.strokeStyle = color
    ctx.fillStyle = isUp ? color : color

    // Wick
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, px(h)); ctx.lineTo(x, px(l))
    ctx.stroke()

    // Body
    ctx.fillRect(x - candleW / 2, top, candleW, candleH)
    if (isUp) {
      ctx.strokeRect(x - candleW / 2, top, candleW, candleH)
    }
  })

  // Mousemove tooltip
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect()
    const mouseX = (e.clientX - rect.left) * (W / rect.width)
    const idx = Math.round((mouseX - pad.l) / (iW / n) - 0.5)
    if (idx >= 0 && idx < n) {
      const d = data[idx]
      tooltip.value = {
        visible: true,
        x: e.clientX - rect.left + 12,
        y: e.clientY - rect.top - 40,
        date: d.d, open: d.o, close: d.c, high: d.h, low: d.l, vol: formatVol(d.v)
      }
    }
  }
  canvas.onmouseleave = () => { tooltip.value.visible = false }
}

onMounted(() => {
  loadAll()
  refreshTimer = setInterval(loadAll, 60000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style scoped>
.futures-page { padding: 8px 0; }

.futures-loading, .futures-empty {
  text-align: center; padding: 60px 20px;
  color: var(--text-secondary);
}
.futures-loading .spinner {
  width: 36px; height: 36px; border: 3px solid var(--border);
  border-top-color: var(--primary); border-radius: 50%;
  animation: spin 0.8s linear infinite; margin: 0 auto 12px;
}
.empty-icon { font-size: 48px; margin-bottom: 12px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Grid */
.futures-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

/* Card */
.futures-card {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  padding: 18px 20px 14px;
  transition: box-shadow 0.2s, transform 0.2s;
  position: relative;
  overflow: hidden;
}
.futures-card:hover {
  box-shadow: 0 8px 28px rgba(0,0,0,0.14);
  transform: translateY(-2px);
}

.card-header { margin-bottom: 10px; }
.symbol-info {
  display: flex; align-items: center; gap: 8px; margin-bottom: 2px;
}
.symbol-code {
  font-size: 17px; font-weight: 800; color: #1e293b; letter-spacing: 0.04em;
}
.exchange-tag {
  font-size: 10px; font-weight: 700; color: #fff;
  background: #3b82f6; border-radius: 4px; padding: 1px 6px;
  letter-spacing: 0.04em;
}
.symbol-name { font-size: 13px; color: #64748b; font-weight: 500; }

/* Price */
.card-price-row { display: flex; align-items: baseline; gap: 12px; margin: 6px 0; }
.latest-price {
  font-size: 26px; font-weight: 800; line-height: 1;
}
.latest-price.up { color: #16a34a; }
.latest-price.down { color: #dc2626; }
.no-price { color: #94a3b8; font-size: 13px; }

.price-change {
  font-size: 13px; font-weight: 700; display: flex; gap: 3px; align-items: center;
}
.price-change.up { color: #16a34a; }
.price-change.down { color: #dc2626; }

/* Stats */
.card-stats {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 4px; margin: 8px 0;
  background: #f8fafc; border-radius: 8px; padding: 8px;
}
.stat-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.stat-label { font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase; }
.stat-val { font-size: 12px; font-weight: 700; color: #1e293b; }
.stat-val.up { color: #16a34a; }
.stat-val.down { color: #dc2626; }

/* Mini Chart */
.mini-chart-wrap {
  margin: 10px -4px 0;
  overflow: hidden;
}
.mini-chart { display: block; width: 100%; height: 60px; }

/* Footer */
.card-footer {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 10px;
}
.last-date { font-size: 11px; color: #94a3b8; }
.kline-btn {
  font-size: 12px; font-weight: 700; color: #3b82f6;
  background: #eff6ff; border: 1px solid #bfdbfe;
  border-radius: 6px; padding: 4px 12px; cursor: pointer;
  transition: all 0.2s;
}
.kline-btn:hover { background: #3b82f6; color: #fff; border-color: #3b82f6; }

/* ==== Modal ==== */
.kline-modal {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.75);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.kline-modal-inner {
  background: #0f172a;
  border-radius: 16px;
  width: 100%; max-width: 1100px;
  height: 90vh; max-height: 680px;
  display: flex; flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 80px rgba(0,0,0,0.6);
  position: relative;
}

.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}
.modal-title-wrap { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.modal-symbol { font-size: 20px; font-weight: 800; color: #f1f5f9; }
.modal-name { font-size: 14px; color: #94a3b8; }
.modal-exchange {
  font-size: 10px; font-weight: 700; background: #3b82f6;
  color: #fff; border-radius: 4px; padding: 2px 6px;
}
.modal-price { font-size: 22px; font-weight: 800; }
.modal-price.up { color: #4ade80; }
.modal-price.down { color: #f87171; }
.modal-change { font-size: 13px; margin-left: 6px; font-weight: 600; }

.modal-controls { display: flex; align-items: center; gap: 6px; }
.day-btn {
  font-size: 12px; font-weight: 600; padding: 5px 12px;
  border-radius: 6px; border: 1px solid rgba(255,255,255,0.15);
  background: transparent; color: #94a3b8; cursor: pointer; transition: all 0.2s;
}
.day-btn:hover, .day-btn.active {
  background: #3b82f6; color: #fff; border-color: #3b82f6;
}
.close-btn {
  width: 32px; height: 32px; border-radius: 50%;
  background: rgba(255,255,255,0.08); border: none;
  color: #94a3b8; font-size: 16px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; margin-left: 4px;
}
.close-btn:hover { background: #ef4444; color: #fff; }

.kline-canvas-wrap {
  flex: 1; position: relative; overflow: hidden;
}
.full-kline-canvas {
  display: block; width: 100%; height: 100%; cursor: crosshair;
}

/* Tooltip */
.kline-tooltip {
  position: absolute; z-index: 10;
  background: rgba(30,41,59,0.97);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px; padding: 10px 14px;
  font-size: 12px; color: #e2e8f0;
  pointer-events: none; min-width: 130px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
}
.tip-date { font-weight: 700; color: #94a3b8; margin-bottom: 6px; }
.tip-row { display: flex; justify-content: space-between; gap: 16px; padding: 1px 0; }
.tip-row .up { color: #4ade80; font-weight: 700; }
.tip-row .down { color: #f87171; font-weight: 700; }

/* Responsive */
@media (max-width: 768px) {
  .futures-grid { grid-template-columns: 1fr; }
  .kline-modal-inner { max-height: 95vh; }
}
@media (max-width: 480px) {
  .card-stats { grid-template-columns: repeat(2, 1fr); }
}
</style>
