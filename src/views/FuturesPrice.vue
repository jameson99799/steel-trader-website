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
        <div class="card-price-row" v-if="item.price > 0">
          <div class="latest-price" :class="item.change >= 0 ? 'up' : 'down'">
            {{ item.price.toFixed(item.price > 1000 ? 0 : 2) }}
          </div>
          <div class="price-change" :class="item.change >= 0 ? 'up' : 'down'">
            <span class="change-arrow">{{ item.change >= 0 ? '▲' : '▼' }}</span>
            <span>{{ Math.abs(item.change).toFixed(2) }}</span>
            <span>({{ item.changePercent.toFixed(2) }}%)</span>
          </div>
        </div>
        <div class="card-price-row" v-else>
          <div class="no-price">数据加载中...</div>
        </div>

        <!-- OHLV Row -->
        <div class="card-stats" v-if="item.price > 0">
          <div class="stat-item">
            <span class="stat-label">开盘</span>
            <span class="stat-val">{{ item.open }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">最高</span>
            <span class="stat-val up">{{ item.high }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">最低</span>
            <span class="stat-val down">{{ item.low }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">持仓</span>
            <span class="stat-val">{{ formatVol(item.openInterest) }}</span>
          </div>
        </div>

        <!-- Footer: K线 button -->
        <div class="card-footer">
          <span class="last-date" v-if="item.volume">成交: {{ formatVol(item.volume) }}</span>
          <button
            class="kline-btn"
            @click="openKline(item)"
          >
            📊 {{ t('futuresKline') || 'K线图' }}
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
              <span class="modal-price" :class="modalItem.change >= 0 ? 'up' : 'down'" v-if="modalItem.price > 0">
                {{ modalItem.price }}
                <span class="modal-change">{{ modalItem.change >= 0 ? '+' : '' }}{{ modalItem.change.toFixed(2) }} ({{ modalItem.changePercent.toFixed(2) }}%)</span>
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
          
          <!-- Full K-Line ECharts Container -->
          <div class="kline-chart-wrap" ref="klineChartRef"></div>
          
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, shallowRef } from 'vue'
import { useLang } from '../composables/useLang'
import api from '../api'
import * as echarts from 'echarts'

const { t } = useLang()

const loading = ref(true)
const futuresList = ref([])
const modalItem = ref(null)
const activeDays = ref(100)
const klineLoading = ref(false)
const klineChartRef = ref(null)
let chartInstance = null
let refreshTimer = null
let klineDataCache = []

const dayOptions = [
  { value: 60, label: '60天' },
  { value: 100, label: '100天' },
  { value: 9999, label: '全部' }
]

function formatVol(v) {
  if (!v) return '-'
  const n = parseInt(v)
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return n.toString()
}

// 1. 获取列表并初始化
async function loadAll() {
  loading.value = true
  try {
    const list = await api.getFuturesList()
    futuresList.value = list.map(item => ({
      ...item,
      loading: true,
      price: 0, change: 0, changePercent: 0,
      open: 0, high: 0, low: 0, volume: 0, openInterest: 0
    }))
    await fetchRealtime()
  } catch (e) {
    console.error('Futures load error:', e)
  } finally {
    loading.value = false
  }
}

// 2. 获取实时行情 (毫秒级更新)
async function fetchRealtime() {
  if (futuresList.value.length === 0) return
  const symbols = futuresList.value.map(item => item.symbol).join(',')
  try {
    const realtimeData = await api.getFuturesRealtime(symbols)
    const dataMap = {}
    realtimeData.forEach(d => { dataMap[d.symbol] = d })
    
    futuresList.value.forEach(item => {
      // API returns something like "nf_HC0", we remove "nf_" to match
      const key = `nf_${item.symbol}`
      const rt = dataMap[key] || dataMap[item.symbol]
      if (rt) {
        item.price = rt.price
        item.change = rt.change
        item.changePercent = rt.changePercent
        item.open = rt.open
        item.high = rt.high
        item.low = rt.low
        item.volume = rt.volume
        item.openInterest = rt.openInterest
      }
      item.loading = false
    })
  } catch (e) {
    console.error('Realtime fetch error:', e)
  }
}

// ================= ECharts K线图逻辑 =================

// 计算移动平均线
function calculateMA(dayCount, data) {
  const result = []
  for (let i = 0, len = data.length; i < len; i++) {
    if (i < dayCount - 1) {
      result.push('-')
      continue
    }
    let sum = 0
    for (let j = 0; j < dayCount; j++) {
      sum += +data[i - j].c // .c is close price
    }
    result.push((sum / dayCount).toFixed(2))
  }
  return result
}

function openKline(item) {
  modalItem.value = item
  activeDays.value = 100
  nextTick(() => {
    initChart()
    fetchKlineData()
  })
}

function closeModal() {
  modalItem.value = null
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
}

function changeKlineDays(days) {
  activeDays.value = days
  renderChart()
}

async function fetchKlineData() {
  klineLoading.value = true
  try {
    const data = await api.getFuturesKline(modalItem.value.symbol)
    klineDataCache = data || []
    renderChart()
  } catch(e) {
    console.error('Kline fetch error', e)
  } finally {
    klineLoading.value = false
  }
}

function initChart() {
  if (!klineChartRef.value) return
  if (chartInstance) chartInstance.dispose()
  chartInstance = echarts.init(klineChartRef.value)
  
  // 响应式
  window.addEventListener('resize', () => {
    chartInstance && chartInstance.resize()
  })
}

function renderChart() {
  if (!chartInstance || klineDataCache.length === 0) return

  const data = activeDays.value >= 9999 ? klineDataCache : klineDataCache.slice(-activeDays.value)
  
  const categoryData = []
  const values = []
  const volumes = []
  
  data.forEach((item, index) => {
    categoryData.push(item.d)
    // ECharts Candlestick: [open, close, lowest, highest]
    values.push([+item.o, +item.c, +item.l, +item.h])
    volumes.push([index, +item.v, +item.c >= +item.o ? 1 : -1])
  })

  const upColor = '#ef232a'
  const upBorderColor = '#ef232a'
  const downColor = '#14b143'
  const downBorderColor = '#14b143'

  const option = {
    animation: false,
    backgroundColor: '#0f172a', // 深色背景
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: 'rgba(30,41,59,0.9)',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0' }
    },
    axisPointer: {
      link: [{ xAxisIndex: 'all' }],
      label: { backgroundColor: '#777' }
    },
    grid: [
      { left: '6%', right: '4%', top: '8%', height: '60%' }, // K线区域
      { left: '6%', right: '4%', top: '71%', height: '18%' }  // 成交量区域
    ],
    xAxis: [
      {
        type: 'category',
        data: categoryData,
        boundaryGap: false,
        axisLine: { onZero: false, lineStyle: { color: '#475569' } },
        splitLine: { show: false },
        min: 'dataMin', max: 'dataMax',
        axisLabel: { color: '#94a3b8' }
      },
      {
        type: 'category',
        gridIndex: 1,
        data: categoryData,
        boundaryGap: false,
        axisLine: { onZero: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        min: 'dataMin', max: 'dataMax'
      }
    ],
    yAxis: [
      {
        scale: true,
        splitArea: { show: false },
        axisLine: { lineStyle: { color: '#475569' } },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
        axisLabel: { color: '#94a3b8' }
      },
      {
        scale: true,
        gridIndex: 1,
        splitNumber: 2,
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false }
      }
    ],
    dataZoom: [
      {
        type: 'inside', xAxisIndex: [0, 1], start: 0, end: 100
      },
      {
        show: true, xAxisIndex: [0, 1], type: 'slider',
        top: '92%', height: 20,
        borderColor: '#334155',
        textStyle: { color: '#94a3b8' }
      }
    ],
    series: [
      {
        name: 'K线',
        type: 'candlestick',
        data: values,
        itemStyle: {
          color: upColor, color0: downColor,
          borderColor: upBorderColor, borderColor0: downBorderColor
        }
      },
      {
        name: 'MA5', type: 'line', data: calculateMA(5, data), smooth: true,
        lineStyle: { width: 1.5 }, itemStyle: { color: '#facc15' }, symbol: 'none'
      },
      {
        name: 'MA10', type: 'line', data: calculateMA(10, data), smooth: true,
        lineStyle: { width: 1.5 }, itemStyle: { color: '#60a5fa' }, symbol: 'none'
      },
      {
        name: 'MA20', type: 'line', data: calculateMA(20, data), smooth: true,
        lineStyle: { width: 1.5 }, itemStyle: { color: '#c084fc' }, symbol: 'none'
      },
      {
        name: '成交量',
        type: 'bar',
        xAxisIndex: 1, yAxisIndex: 1,
        data: volumes,
        itemStyle: {
          color: function(params) {
            return params.data[2] === 1 ? upColor : downColor;
          }
        }
      }
    ]
  };

  chartInstance.setOption(option)
}

onMounted(() => {
  loadAll()
  // 5秒刷新一次真实行情，与专业炒股软件同步
  refreshTimer = setInterval(fetchRealtime, 5000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  if (chartInstance) chartInstance.dispose()
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
  background: #ef4444; border-radius: 4px; padding: 1px 6px;
  letter-spacing: 0.04em;
}
.symbol-name { font-size: 13px; color: #64748b; font-weight: 500; }

/* Price */
.card-price-row { display: flex; align-items: baseline; gap: 12px; margin: 6px 0; }
.latest-price {
  font-size: 26px; font-weight: 800; line-height: 1;
}
/* Note: In China, Red is UP, Green is DOWN. Sina uses this convention */
.latest-price.up { color: #ef232a; }
.latest-price.down { color: #14b143; }
.no-price { color: #94a3b8; font-size: 13px; }

.price-change {
  font-size: 13px; font-weight: 700; display: flex; gap: 3px; align-items: center;
}
.price-change.up { color: #ef232a; }
.price-change.down { color: #14b143; }

/* Stats */
.card-stats {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 4px; margin: 8px 0;
  background: #f8fafc; border-radius: 8px; padding: 8px;
}
.stat-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.stat-label { font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase; }
.stat-val { font-size: 12px; font-weight: 700; color: #1e293b; }
.stat-val.up { color: #ef232a; }
.stat-val.down { color: #14b143; }

/* Footer */
.card-footer {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #e2e8f0;
}
.last-date { font-size: 12px; color: #64748b; font-weight: 500; }
.kline-btn {
  font-size: 12px; font-weight: 700; color: #ef4444;
  background: #fef2f2; border: 1px solid #fecaca;
  border-radius: 6px; padding: 6px 14px; cursor: pointer;
  transition: all 0.2s;
}
.kline-btn:hover { background: #ef4444; color: #fff; border-color: #ef4444; }

/* ==== Modal ==== */
.kline-modal {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.85);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.kline-modal-inner {
  background: #0f172a;
  border-radius: 12px;
  width: 100%; max-width: 1200px;
  height: 90vh; max-height: 750px;
  display: flex; flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 80px rgba(0,0,0,0.8);
}

.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
}
.modal-title-wrap { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.modal-symbol { font-size: 20px; font-weight: 800; color: #f1f5f9; }
.modal-name { font-size: 15px; color: #cbd5e1; }
.modal-exchange {
  font-size: 10px; font-weight: 700; background: #ef4444;
  color: #fff; border-radius: 4px; padding: 2px 6px;
}
.modal-price { font-size: 22px; font-weight: 800; margin-left: auto; }
.modal-price.up { color: #ef232a; }
.modal-price.down { color: #14b143; }
.modal-change { font-size: 13px; margin-left: 6px; font-weight: 600; }

.modal-controls { display: flex; align-items: center; gap: 6px; }
.mini-spinner {
  width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.2);
  border-top-color: #fff; border-radius: 50%;
  animation: spin 0.8s linear infinite; margin-right: 8px;
}
.day-btn {
  font-size: 12px; font-weight: 600; padding: 5px 12px;
  border-radius: 6px; border: 1px solid #334155;
  background: transparent; color: #94a3b8; cursor: pointer; transition: all 0.2s;
}
.day-btn:hover, .day-btn.active {
  background: #3b82f6; color: #fff; border-color: #3b82f6;
}
.close-btn {
  width: 32px; height: 32px; border-radius: 50%;
  background: #1e293b; border: none;
  color: #94a3b8; font-size: 16px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; margin-left: 8px;
}
.close-btn:hover { background: #ef4444; color: #fff; }

.kline-chart-wrap {
  flex: 1; position: relative; overflow: hidden; width: 100%; height: 100%;
}

/* Responsive */
@media (max-width: 768px) {
  .futures-grid { grid-template-columns: 1fr; }
  .kline-modal-inner { max-height: 95vh; }
  .modal-title-wrap { flex-direction: column; align-items: flex-start; gap: 4px; }
  .modal-price { margin-left: 0; }
}
</style>
