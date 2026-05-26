<template>
  <div class="futures-page">
    <div v-if="loading" class="futures-loading">
      <div class="spinner"></div>
      <p>加载期货行情中...</p>
    </div>

    <div v-else-if="futuresList.length === 0" class="futures-empty">
      <div class="empty-icon">📈</div>
      <p>暂未配置期货品种，请联系管理员添加</p>
    </div>

    <!-- Table Layout -->
    <div v-else class="futures-table-container">
      <table class="futures-table">
        <thead>
          <tr>
            <th>名称</th>
            <th>价格</th>
            <th>走势图</th>
            <th>成交量</th>
            <th>当日涨跌</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in futuresList" :key="item.symbol" @click="openKline(item)" class="clickable-row">
            <!-- 名称 -->
            <td>
              <div class="f-name">{{ item.name || item.name_en }}</div>
              <div class="f-code">{{ item.symbol }}</div>
            </td>
            
            <!-- 价格 -->
            <td>
              <div v-if="item.realtime" class="f-price" :class="item.realtime.change >= 0 ? 'up' : 'down'">
                {{ formatPrice(item.realtime.price) }}
              </div>
              <div v-else class="f-loading-text">--</div>
            </td>

            <!-- 走势图 (Mini ECharts Min-line) -->
            <td class="chart-cell">
              <div v-if="item.minline && item.minline.length > 0" class="mini-trend-wrap" :ref="el => setTrendRef(el, item)"></div>
              <div v-else class="f-loading-text">加载中</div>
            </td>

            <!-- 成交量 -->
            <td>
              <div v-if="item.realtime" class="f-vol">{{ item.realtime.volume }}</div>
              <div v-else>--</div>
            </td>

            <!-- 当日涨跌 -->
            <td>
              <div v-if="item.realtime" class="f-badge" :class="item.realtime.change >= 0 ? 'bg-up' : 'bg-down'">
                {{ item.realtime.change >= 0 ? '+' : '' }}{{ item.realtime.changePercent.toFixed(2) }}%
              </div>
              <div v-else>--</div>
            </td>
          </tr>
        </tbody>
      </table>
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
              <span class="modal-price" :class="modalItem.realtime?.change >= 0 ? 'up' : 'down'" v-if="modalItem.realtime">
                {{ modalItem.realtime.price }}
                <span class="modal-change">{{ modalItem.realtime.change >= 0 ? '+' : '' }}{{ modalItem.realtime.change.toFixed(2) }} ({{ modalItem.realtime.changePercent.toFixed(2) }}%)</span>
              </span>
            </div>
            <div class="modal-controls">
              <div v-if="klineLoading" class="mini-spinner"></div>
              <button
                v-for="d in dayOptions"
                :key="d.value"
                :class="['day-btn', activeDays === d.value ? 'active' : '']"
                @click="changeKlineDays(d.value)"
              >{{ d.label }}</button>
              <button class="close-btn" @click="closeModal">✕</button>
            </div>
          </div>
          <div class="kline-chart-wrap" ref="klineChartRef"></div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useLang } from '../composables/useLang'
import api from '../api'
import * as echarts from 'echarts'

const { t } = useLang()

const loading = ref(true)
const futuresList = ref([])
const trendCharts = {} // symbol -> echarts instance

// Kline modal
const modalItem = ref(null)
const activeDays = ref('minline') // 'minline', 60, 100, 9999
const klineLoading = ref(false)
const klineChartRef = ref(null)
let klineChartInstance = null
let klineDataCache = []

let refreshTimer = null

const dayOptions = [
  { value: 'minline', label: '分时' },
  { value: 60, label: '60日K' },
  { value: 100, label: '100日K' },
  { value: 9999, label: '全部日K' }
]

function formatPrice(p) {
  if (!p) return '-'
  return p > 1000 ? p.toFixed(0) : p.toFixed(2)
}

function setTrendRef(el, item) {
  if (el) {
    if (!trendCharts[item.symbol]) {
      const chart = echarts.init(el)
      trendCharts[item.symbol] = chart
      renderTrendChart(chart, item)
    } else {
      renderTrendChart(trendCharts[item.symbol], item)
    }
  }
}

async function loadAll() {
  try {
    const data = await api.getFuturesListData()
    futuresList.value = data || []
    loading.value = false
    
    nextTick(() => {
      futuresList.value.forEach(item => {
        if (trendCharts[item.symbol]) {
          renderTrendChart(trendCharts[item.symbol], item)
        }
      })
      // If modal is open and viewing minline, update it too
      if (modalItem.value && activeDays.value === 'minline' && klineChartInstance) {
        const liveItem = futuresList.value.find(i => i.symbol === modalItem.value.symbol)
        if (liveItem) {
          modalItem.value = liveItem
          renderModalMinlineChart()
        }
      }
    })
  } catch (e) {
    console.error('Futures list data error:', e)
  }
}

// Render Mini Trend Chart (Min-line)
function renderTrendChart(chart, item) {
  if (!item.minline || item.minline.length === 0) return
  
  const data = item.minline
  const times = []
  const prices = []
  let prevSettlement = parseFloat(data[0][5]) || 0

  if (prevSettlement === 0 && item.realtime) {
    prevSettlement = item.realtime.prevSettlement
  }

  data.forEach(d => {
    times.push(d[0])
    prices.push(parseFloat(d[1]))
  })

  const latestPrice = prices[prices.length - 1]
  const isUp = latestPrice >= prevSettlement
  const color = isUp ? '#ef232a' : '#14b143'

  const minP = Math.min(...prices, prevSettlement)
  const maxP = Math.max(...prices, prevSettlement)
  const range = maxP - minP

  const option = {
    animation: false,
    grid: { left: 0, right: 0, top: 5, bottom: 5 },
    xAxis: {
      type: 'category',
      data: times,
      show: false,
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      show: false,
      min: minP - range * 0.05,
      max: maxP + range * 0.05
    },
    series: [
      {
        data: prices,
        type: 'line',
        showSymbol: false,
        lineStyle: { color: color, width: 1.5 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: isUp ? 'rgba(239,35,42,0.2)' : 'rgba(20,177,67,0.2)' },
            { offset: 1, color: isUp ? 'rgba(239,35,42,0)' : 'rgba(20,177,67,0)' }
          ])
        },
        markLine: {
          symbol: ['none', 'none'],
          data: [{ yAxis: prevSettlement }],
          lineStyle: { color: '#94a3b8', type: 'dashed', width: 1 },
          label: { show: false },
          animation: false
        }
      }
    ]
  }
  chart.setOption(option)
}

// ==== K-Line Full Modal ====
function calculateMA(dayCount, data) {
  const result = []
  for (let i = 0, len = data.length; i < len; i++) {
    if (i < dayCount - 1) { result.push('-'); continue }
    let sum = 0
    for (let j = 0; j < dayCount; j++) sum += +data[i - j].c
    result.push((sum / dayCount).toFixed(2))
  }
  return result
}

function openKline(item) {
  modalItem.value = item
  activeDays.value = 'minline'
  nextTick(() => {
    initKlineChart()
    renderModalMinlineChart()
  })
}

function closeModal() {
  modalItem.value = null
  if (klineChartInstance) {
    klineChartInstance.dispose()
    klineChartInstance = null
  }
}

function changeKlineDays(days) {
  activeDays.value = days
  if (days === 'minline') {
    renderModalMinlineChart()
  } else {
    fetchKlineData()
  }
}

async function fetchKlineData() {
  klineLoading.value = true
  try {
    const data = await api.getFuturesKline(modalItem.value.symbol)
    klineDataCache = data || []
    renderKlineChart()
  } catch(e) {
    console.error('Kline fetch error', e)
  } finally {
    klineLoading.value = false
  }
}

function initKlineChart() {
  if (!klineChartRef.value) return
  if (klineChartInstance) klineChartInstance.dispose()
  klineChartInstance = echarts.init(klineChartRef.value)
}

function renderModalMinlineChart() {
  if (!klineChartInstance || !modalItem.value || !modalItem.value.minline) return
  
  const data = modalItem.value.minline
  const times = []
  const prices = []
  const avgs = []
  const volumes = []
  
  let prevSettlement = parseFloat(data[0][5]) || modalItem.value.realtime?.prevSettlement || 0
  
  data.forEach((d, i) => {
    times.push(d[0])
    prices.push(parseFloat(d[1]))
    avgs.push(parseFloat(d[2]))
    const p = parseFloat(d[1])
    const prevP = i === 0 ? prevSettlement : parseFloat(data[i-1][1])
    const color = p >= prevP ? '#ef232a' : '#14b143'
    volumes.push({ value: [i, parseFloat(d[3]), color], itemStyle: { color } })
  })

  const minP = Math.min(...prices, prevSettlement)
  const maxP = Math.max(...prices, prevSettlement)
  const range = maxP - minP

  const isUpOverall = (prices[prices.length - 1] || prevSettlement) >= prevSettlement
  const lineColor = isUpOverall ? '#ef232a' : '#14b143'
  const areaColors = isUpOverall 
    ? [{ offset: 0, color: 'rgba(239,35,42,0.3)' }, { offset: 1, color: 'rgba(239,35,42,0)' }]
    : [{ offset: 0, color: 'rgba(20,177,67,0.3)' }, { offset: 1, color: 'rgba(20,177,67,0)' }]

  const option = {
    animation: false,
    backgroundColor: '#0f172a',
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    axisPointer: { link: [{ xAxisIndex: 'all' }] },
    grid: [
      { left: '6%', right: '4%', top: '8%', height: '60%' },
      { left: '6%', right: '4%', top: '71%', height: '18%' }
    ],
    xAxis: [
      { type: 'category', data: times, boundaryGap: false, splitLine: { show: false }, axisLine: { onZero: false }, axisLabel: { color: '#94a3b8' } },
      { type: 'category', gridIndex: 1, data: times, boundaryGap: false, axisLabel: { show: false }, axisTick: { show: false } }
    ],
    yAxis: [
      { scale: true, splitArea: { show: false }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }, min: minP - range*0.02, max: maxP + range*0.02, axisLabel: { color: '#94a3b8' } },
      { scale: true, gridIndex: 1, splitNumber: 2, axisLabel: { show: false }, splitLine: { show: false } }
    ],
    series: [
      {
        name: '价格', type: 'line', data: prices, showSymbol: false,
        lineStyle: { color: lineColor, width: 1.5 },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, areaColors) },
        markLine: { symbol: ['none', 'none'], data: [{ yAxis: prevSettlement }], lineStyle: { color: '#94a3b8', type: 'dashed' }, label: { show: false } }
      },
      { name: '均价', type: 'line', data: avgs, showSymbol: false, lineStyle: { color: '#facc15', width: 1.5 } },
      { name: '成交量', type: 'bar', xAxisIndex: 1, yAxisIndex: 1, data: volumes }
    ]
  }
  klineChartInstance.setOption(option, true)
}

function renderKlineChart() {
  if (!klineChartInstance || klineDataCache.length === 0) return

  const data = activeDays.value >= 9999 ? klineDataCache : klineDataCache.slice(-activeDays.value)
  const categoryData = []
  const values = []
  const volumes = []
  
  data.forEach((item, index) => {
    categoryData.push(item.d)
    values.push([+item.o, +item.c, +item.l, +item.h])
    volumes.push([index, +item.v, +item.c >= +item.o ? 1 : -1])
  })

  const upColor = '#ef232a'
  const upBorderColor = '#ef232a'
  const downColor = '#14b143'
  const downBorderColor = '#14b143'

  const option = {
    animation: false,
    backgroundColor: '#0f172a',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: 'rgba(30,41,59,0.9)',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0' }
    },
    axisPointer: { link: [{ xAxisIndex: 'all' }] },
    grid: [
      { left: '6%', right: '4%', top: '8%', height: '60%' },
      { left: '6%', right: '4%', top: '71%', height: '18%' }
    ],
    xAxis: [
      { type: 'category', data: categoryData, boundaryGap: false, axisLine: { onZero: false }, splitLine: { show: false }, axisLabel: { color: '#94a3b8' }, min: 'dataMin', max: 'dataMax' },
      { type: 'category', gridIndex: 1, data: categoryData, boundaryGap: false, axisLine: { onZero: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, min: 'dataMin', max: 'dataMax' }
    ],
    yAxis: [
      { scale: true, splitArea: { show: false }, axisLine: { lineStyle: { color: '#475569' } }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }, axisLabel: { color: '#94a3b8' } },
      { scale: true, gridIndex: 1, splitNumber: 2, axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false } }
    ],
    dataZoom: [
      { type: 'inside', xAxisIndex: [0, 1], start: 0, end: 100 },
      { show: true, xAxisIndex: [0, 1], type: 'slider', top: '92%', height: 20, borderColor: '#334155', textStyle: { color: '#94a3b8' } }
    ],
    series: [
      { name: 'K线', type: 'candlestick', data: values, itemStyle: { color: upColor, color0: downColor, borderColor: upBorderColor, borderColor0: downBorderColor } },
      { name: 'MA5', type: 'line', data: calculateMA(5, data), smooth: true, lineStyle: { width: 1.5 }, itemStyle: { color: '#facc15' }, symbol: 'none' },
      { name: 'MA10', type: 'line', data: calculateMA(10, data), smooth: true, lineStyle: { width: 1.5 }, itemStyle: { color: '#60a5fa' }, symbol: 'none' },
      { name: 'MA20', type: 'line', data: calculateMA(20, data), smooth: true, lineStyle: { width: 1.5 }, itemStyle: { color: '#c084fc' }, symbol: 'none' },
      { name: '成交量', type: 'bar', xAxisIndex: 1, yAxisIndex: 1, data: volumes, itemStyle: { color: params => params.data[2] === 1 ? upColor : downColor } }
    ]
  }
  klineChartInstance.setOption(option, true)
}

onMounted(() => {
  loadAll()
  refreshTimer = setInterval(loadAll, 2500)
  
  window.addEventListener('resize', () => {
    if (klineChartInstance) klineChartInstance.resize()
    Object.values(trendCharts).forEach(c => c && c.resize())
  })
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  Object.values(trendCharts).forEach(c => c && c.dispose())
  if (klineChartInstance) klineChartInstance.dispose()
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

/* Table Layout */
.futures-table-container {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  overflow-x: auto;
  margin: 10px 0;
}

.futures-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  min-width: 600px;
}

.futures-table th {
  padding: 14px 16px;
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  border-bottom: 1px solid #f1f5f9;
  white-space: nowrap;
}

.clickable-row {
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #f8fafc;
}

.clickable-row:hover {
  background-color: #f8fafc;
}

.futures-table td {
  padding: 12px 16px;
  vertical-align: middle;
}

/* Cell Styles */
.f-name { font-size: 15px; font-weight: 600; color: #1e293b; line-height: 1.2; }
.f-code { font-size: 12px; color: #94a3b8; font-family: monospace; margin-top: 2px; }

.f-price { font-size: 16px; font-weight: 700; font-family: 'Inter', monospace; }
.f-price.up { color: #ef232a; }
.f-price.down { color: #14b143; }

.f-loading-text { color: #cbd5e1; font-size: 13px; }

.f-vol { font-size: 14px; font-weight: 500; color: #334155; }

.f-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  font-family: 'Inter', monospace;
  text-align: center;
  min-width: 70px;
}
.bg-up { background-color: #ef232a; }
.bg-down { background-color: #14b143; }

/* Mini Trend Chart */
.chart-cell { width: 140px; padding: 4px 16px !important; }
.mini-trend-wrap {
  width: 120px;
  height: 40px;
  pointer-events: none;
}

/* ==== Modal ==== */
.kline-modal {
  position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.85);
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.kline-modal-inner {
  background: #0f172a; border-radius: 12px; width: 100%; max-width: 1200px;
  height: 90vh; max-height: 750px; display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 24px 80px rgba(0,0,0,0.8);
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center; padding: 14px 20px;
  border-bottom: 1px solid #1e293b; flex-shrink: 0;
}
.modal-title-wrap { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.modal-symbol { font-size: 20px; font-weight: 800; color: #f1f5f9; }
.modal-name { font-size: 15px; color: #cbd5e1; }
.modal-exchange {
  font-size: 10px; font-weight: 700; background: #ef4444; color: #fff; border-radius: 4px; padding: 2px 6px;
}
.modal-price { font-size: 22px; font-weight: 800; margin-left: auto; }
.modal-price.up { color: #ef232a; }
.modal-price.down { color: #14b143; }
.modal-change { font-size: 13px; margin-left: 6px; font-weight: 600; }

.modal-controls { display: flex; align-items: center; gap: 6px; }
.mini-spinner {
  width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.2);
  border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 8px;
}
.day-btn {
  font-size: 12px; font-weight: 600; padding: 5px 12px; border-radius: 6px; border: 1px solid #334155;
  background: transparent; color: #94a3b8; cursor: pointer; transition: all 0.2s;
}
.day-btn:hover, .day-btn.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }
.close-btn {
  width: 32px; height: 32px; border-radius: 50%; background: #1e293b; border: none;
  color: #94a3b8; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; margin-left: 8px;
}
.close-btn:hover { background: #ef4444; color: #fff; }
.kline-chart-wrap { flex: 1; position: relative; overflow: hidden; width: 100%; height: 100%; }

@media (max-width: 768px) {
  .kline-modal-inner { max-height: 95vh; }
  .modal-title-wrap { flex-direction: column; align-items: flex-start; gap: 4px; }
  .modal-price { margin-left: 0; }
}
</style>
