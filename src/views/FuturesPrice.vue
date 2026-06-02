<template>
  <div class="futures-page">
    <div v-if="loading" class="futures-loading">
      <div class="spinner"></div>
      <p>{{ t('futuresLoading') || '加载期货行情中...' }}</p>
    </div>

    <div v-else-if="futuresList.length === 0" class="futures-empty">
      <div class="empty-icon">📈</div>
      <p>{{ t('futuresEmpty') || '暂未配置期货品种，请联系管理员添加' }}</p>
    </div>

    <!-- Table Layout -->
    <div v-else class="futures-content-wrapper">
      <div class="futures-notice">
        <i class="notice-icon">📢</i>
        <span>{{ t('futuresTimeNote') || '请注意：所有期货价格时间是中国北京时间，所有显示的价格为人民币' }}</span>
      </div>
      
      <div class="futures-table-container">
        <table class="futures-table">
        <thead>
          <tr>
            <th>{{ t('futuresName') || '期货名称' }}</th>
            <th>{{ t('futuresCurrentPrice') || '今日实时价格' }}</th>
            <th>{{ t('futuresPrevClose') || '昨日收盘价格' }}</th>
            <th>{{ t('futuresChartRealtime') || '走势图 (实时)' }}</th>
            <th>{{ t('futuresChartDays') ? t('futuresChartDays').replace('{days}', previewDays) : '走势图 (' + previewDays + '日)' }}</th>
            <th>{{ t('futuresDailyChange') || '当日涨跌' }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in futuresList" :key="item.symbol" @click="openKline(item)" class="clickable-row">
            <!-- 名称 -->
            <td>
              <div class="f-name">{{ localizedValue(item, 'name') }}</div>
              <div class="f-code">{{ item.symbol }}</div>
            </td>
            
            <!-- 价格 -->
            <td>
              <div v-if="item.realtime" class="f-price" :class="item.realtime.change >= 0 ? 'up' : 'down'">
                {{ formatPrice(item.realtime.price, item.symbol) }}
              </div>
              <div v-else class="f-loading-text">--</div>
            </td>

            <!-- 昨日收盘 -->
            <td>
              <div v-if="item.realtime" class="f-price" style="color: #64748b;">
                {{ formatPrice(item.realtime.prevSettlement, item.symbol) }}
              </div>
              <div v-else class="f-loading-text">--</div>
            </td>

            <!-- 走势图 (Mini ECharts Min-line) -->
            <td class="chart-cell" @click.stop="openKline(item, 'minline')">
              <div v-if="item.minline && item.minline.length > 0" class="mini-trend-wrap" :id="'trend-' + item.symbol"></div>
              <div v-else class="f-loading-text">{{ t('futuresLoadingShort') || '加载中' }}</div>
            </td>

            <!-- 动态日走势 (Mini ECharts K-line) -->
            <td class="chart-cell" @click.stop="openKline(item, previewDays)">
              <div v-if="item.kline && item.kline.length > 0" class="mini-trend-wrap" :id="'mini-kline-' + item.symbol"></div>
              <div v-else class="f-loading-text">{{ t('futuresLoadingShort') || '加载中' }}</div>
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
    </div>

    <!-- K-Line Fullscreen Modal -->
    <Teleport to="body">
      <div class="kline-modal" v-if="modalItem" @click.self="closeModal">
        <div class="kline-modal-inner">
          <div class="modal-header">
            <div class="modal-header-top">
              <div class="modal-title-wrap">
                <span class="modal-symbol">{{ modalItem.symbol }}</span>
                <span class="modal-name">{{ localizedValue(modalItem, 'name') }}</span>
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
            
            <div class="kline-stats" v-if="currentRealtime.price !== undefined">
              <div class="stat-item">
                <span class="s-label">{{ t('futuresDateTime') || '日期时间' }}</span>
                <span class="s-val">{{ currentRealtime.date || '--' }}</span>
              </div>
              <div class="stat-item">
                <span class="s-label">{{ t('futuresCurrentPriceStr') || '实时价格' }}</span>
                <span class="s-val" :class="currentRealtime.change >= 0 ? 'up' : 'down'">{{ formatPrice(currentRealtime.price, modalItem.symbol) }}</span>
              </div>
              <div class="stat-item">
                <span class="s-label">{{ t('futuresChangePct') || '涨跌幅' }}</span>
                <span class="s-val" :class="currentRealtime.change >= 0 ? 'up' : 'down'">
                  {{ currentRealtime.change >= 0 ? '+' : '' }}{{ currentRealtime.changePercent !== undefined ? currentRealtime.changePercent.toFixed(2) : '0.00' }}%
                </span>
              </div>
              <div class="stat-item">
                <span class="s-label">{{ t('futuresOpenStr') || '开盘价格' }}</span>
                <span class="s-val">{{ formatPrice(currentRealtime.open, modalItem.symbol) }}</span>
              </div>
              <div class="stat-item">
                <span class="s-label">{{ t('futuresCloseStr') || '收盘价格' }}</span>
                <span class="s-val">{{ formatPrice(currentRealtime.close !== undefined ? currentRealtime.close : currentRealtime.prevSettlement, modalItem.symbol) }}</span>
              </div>
              <div class="stat-item">
                <span class="s-label">{{ t('futuresHighStr') || '最高价格' }}</span>
                <span class="s-val">{{ formatPrice(currentRealtime.high, modalItem.symbol) }}</span>
              </div>
              <div class="stat-item">
                <span class="s-label">{{ t('futuresLowStr') || '最低价格' }}</span>
                <span class="s-val">{{ formatPrice(currentRealtime.low, modalItem.symbol) }}</span>
              </div>
            </div>
          </div>
          <div class="kline-chart-wrap" ref="klineChartRef"></div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useLang } from '../composables/useLang'
import api from '../api'
import * as echarts from 'echarts'

const { t, localizedValue } = useLang()

const loading = ref(true)
const futuresList = ref([])

// Kline modal
const modalItem = ref(null)
const hoveredRealtime = ref(null)
const currentRealtime = computed(() => {
  if (hoveredRealtime.value) return hoveredRealtime.value
  return modalItem.value?.realtime || {}
})
const activeDays = ref('minline') // 'minline', 60, 100, 9999
const klineLoading = ref(false)
const klineChartRef = ref(null)
const previewDays = ref(10)
let klineChartInstance = null
let klineDataCache = []
let categoryData = []
let values = []

let refreshTimer = null

const dayOptions = computed(() => [
  { value: 'minline', label: t('futuresMinline') || '分时' },
  { value: 30, label: t('futures30d') || '30日' },
  { value: 60, label: t('futures60d') || '60日' },
  { value: 100, label: t('futures100d') || '100日' }
])

function formatPrice(p, symbol = '') {
  if (p === null || p === undefined || isNaN(p) || p === '') return '--'
  if (symbol && symbol.includes('USDCNH')) {
    const str = p.toString()
    const match = str.match(/^-?\d+(?:\.\d{0,4})?/)
    let val = match ? match[0] : str
    if (val.indexOf('.') === -1) {
      val += '.0000'
    } else {
      const parts = val.split('.')
      parts[1] = parts[1].padEnd(4, '0')
      val = parts[0] + '.' + parts[1]
    }
    return val
  }
  const num = Number(p)
  const rounded = Math.round(num * 10000) / 10000
  return rounded.toString()
}

// removed setTrendRef

async function loadAll() {
  try {
    const [data, settings] = await Promise.all([
      api.getFuturesListData(),
      api.getFuturesSettings().catch(() => ({ preview_days: 10 }))
    ])
    futuresList.value = data || []
    previewDays.value = settings.preview_days || 10
    loading.value = false
    
    nextTick(() => {
      futuresList.value.forEach(item => {
        renderTrendChart(item)
        renderMiniKlineChart(item)
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
function renderTrendChart(item) {
  if (!item.minline || item.minline.length === 0) return
  const el = document.getElementById('trend-' + item.symbol)
  if (!el) return
  let chart = echarts.getInstanceByDom(el)
  if (!chart) chart = echarts.init(el)
  
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

  let minP = Math.min(...prices, prevSettlement)
  let maxP = Math.max(...prices, prevSettlement)
  let range = maxP - minP
  if (range === 0) {
    range = maxP * 0.01 || 10;
  }

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

// Render Mini Kline Chart (30-day preview)
function renderMiniKlineChart(item) {
  if (!item.kline || item.kline.length === 0) return
  const el = document.getElementById('mini-kline-' + item.symbol)
  if (!el) return
  let chart = echarts.getInstanceByDom(el)
  if (!chart) chart = echarts.init(el)
  
  const data = item.kline
  const categoryData = []
  const values = []
  
  data.forEach(d => {
    categoryData.push(d.d)
    values.push([+d.o, +d.c, +d.l, +d.h])
  })

  const option = {
    animation: false,
    grid: { left: 0, right: 0, top: 5, bottom: 5 },
    xAxis: { type: 'category', data: categoryData, show: false },
    yAxis: { type: 'value', show: false, min: 'dataMin', max: 'dataMax' },
    series: [
      {
        type: 'candlestick',
        data: values,
        itemStyle: {
          color: '#ef232a', color0: '#14b143',
          borderColor: '#ef232a', borderColor0: '#14b143'
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

function openKline(item, targetMode = null) {
  modalItem.value = item
  if (targetMode !== null) {
    activeDays.value = targetMode
  } else {
    let saved = localStorage.getItem('kline_default_days')
    if (saved === 'minline') {
      activeDays.value = 'minline'
    } else {
      activeDays.value = parseInt(saved) || 30
    }
  }
  nextTick(() => {
    initKlineChart()
    if (activeDays.value === 'minline') {
      renderModalMinlineChart()
    } else {
      fetchKlineData()
    }
  })
}

function closeModal() {
  modalItem.value = null
  hoveredRealtime.value = null
  if (klineChartInstance) {
    klineChartInstance.dispose()
    klineChartInstance = null
  }
}

function changeKlineDays(days) {
  activeDays.value = days
  localStorage.setItem('kline_default_days', days)
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
  
  klineChartInstance.on('updateAxisPointer', function (event) {
    const xAxisInfo = event.axesInfo && event.axesInfo[0]
    if (xAxisInfo) {
      const dataIndex = xAxisInfo.value
      if (activeDays.value === 'minline') {
        const minData = modalItem.value?.minline
        if (minData && minData[dataIndex]) {
          const d = minData[dataIndex]
          const price = parseFloat(d[1])
          const prev = parseFloat(d[5]) || modalItem.value.realtime?.prevSettlement || 0
          const change = price - prev
          const changePercent = prev ? (change / prev) * 100 : 0
          hoveredRealtime.value = {
            date: d[6] ? `${d[6]} ${d[0]}` : d[0],
            price: price,
            change: change,
            changePercent: changePercent,
            open: '--',
            close: price,
            high: '--',
            low: '--',
            prevSettlement: prev
          }
        }
      } else {
        if (klineDataCache && klineDataCache[dataIndex]) {
          const item = klineDataCache[dataIndex]
          const price = parseFloat(item.c)
          const prev = dataIndex > 0 ? parseFloat(klineDataCache[dataIndex - 1].c) : (parseFloat(item.o) || price)
          const change = price - prev
          const changePercent = prev ? (change / prev) * 100 : 0
          hoveredRealtime.value = {
            date: item.d,
            price: price,
            change: change,
            changePercent: changePercent,
            open: parseFloat(item.o),
            close: price,
            high: parseFloat(item.h),
            low: parseFloat(item.l),
            prevSettlement: prev
          }
        }
      }
    }
  })
  
  klineChartInstance.on('globalout', function () {
    hoveredRealtime.value = null
  })
}

function renderModalMinlineChart() {
  if (!klineChartInstance || !modalItem.value || !modalItem.value.minline) return
  
  const data = modalItem.value.minline
  const times = []
  const prices = []
  const avgs = []
  
  let prevSettlement = parseFloat(data[0][5]) || modalItem.value.realtime?.prevSettlement || 0
  
  data.forEach((d, i) => {
    times.push(d[6] ? `${d[6]} ${d[0]}` : d[0])
    prices.push(parseFloat(d[1]))
    avgs.push(parseFloat(d[2]) || parseFloat(d[1]))
  })

  let minP = Math.min(...prices, prevSettlement)
  let maxP = Math.max(...prices, prevSettlement)
  let range = maxP - minP
  if (range === 0) {
    range = maxP * 0.01 || 10;
  }

  const minLimit = minP - range * 0.02
  const maxLimit = maxP + range * 0.02
  const minPercent = prevSettlement ? ((minLimit - prevSettlement) / prevSettlement) * 100 : 0
  const maxPercent = prevSettlement ? ((maxLimit - prevSettlement) / prevSettlement) * 100 : 0

  const isUpOverall = (prices[prices.length - 1] || prevSettlement) >= prevSettlement
  const lineColor = isUpOverall ? '#ef232a' : '#14b143'
  const areaColors = isUpOverall 
    ? [{ offset: 0, color: 'rgba(239,35,42,0.15)' }, { offset: 1, color: 'rgba(239,35,42,0)' }]
    : [{ offset: 0, color: 'rgba(20,177,67,0.15)' }, { offset: 1, color: 'rgba(20,177,67,0)' }]

  const option = {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: { 
      trigger: 'axis', 
      axisPointer: { type: 'cross' },
      backgroundColor: 'rgba(24,24,27,0.95)',
      borderColor: '#3f3f46',
      textStyle: { color: '#e2e8f0' }
    },
    axisPointer: { link: [{ xAxisIndex: 'all' }] },
    grid: [
      { left: '8%', right: '8%', top: '8%', height: '82%' }
    ],
    xAxis: [
      { 
        type: 'category', 
        data: times, 
        boundaryGap: false, 
        splitLine: { show: false }, 
        axisLine: { lineStyle: { color: '#3f3f46' } }, 
        axisLabel: { 
          color: '#94a3b8',
          formatter: function(value) {
            return value.split(' ')[1] || value;
          }
        } 
      }
    ],
    yAxis: [
      {
        type: 'value',
        scale: true,
        position: 'left',
        min: minLimit,
        max: maxLimit,
        splitArea: { show: false },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.03)' } },
        axisLine: { show: true, lineStyle: { color: '#3f3f46' } },
        axisLabel: {
          color: function (value) {
            if (value > prevSettlement) return '#ef232a';
            if (value < prevSettlement) return '#14b143';
            return '#94a3b8';
          },
          formatter: function (value) {
            return formatPrice(value, modalItem.value.symbol);
          }
        }
      },
      {
        type: 'value',
        scale: true,
        position: 'right',
        min: minPercent,
        max: maxPercent,
        splitLine: { show: false },
        axisLine: { show: true, lineStyle: { color: '#3f3f46' } },
        axisLabel: {
          color: function (value) {
            if (value > 0) return '#ef232a';
            if (value < 0) return '#14b143';
            return '#94a3b8';
          },
          formatter: function (value) {
            return (value > 0 ? '+' : '') + value.toFixed(2) + '%';
          }
        }
      }
    ],
    series: [
      {
        name: t('futuresPrice') || '价格', 
        type: 'line', 
        data: prices, 
        showSymbol: false,
        lineStyle: { color: lineColor, width: 1.5 },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, areaColors) },
        markLine: { 
          symbol: ['none', 'none'], 
          data: [{ yAxis: prevSettlement }], 
          lineStyle: { color: '#94a3b8', type: 'dashed', opacity: 0.5 }, 
          label: { show: false } 
        }
      }
    ]
  }
  klineChartInstance.setOption(option, true)
}

function renderKlineChart() {
  if (!klineChartInstance || klineDataCache.length === 0) return

  const rawData = klineDataCache
  categoryData = []
  values = []
  
  rawData.forEach((item, index) => {
    categoryData.push(item.d)
    values.push([+item.o, +item.c, +item.l, +item.h])
  })

  const total = rawData.length
  let startValue = 0
  if (activeDays.value < 9999 && total > activeDays.value) {
    startValue = total - activeDays.value
  }
  const endValue = total - 1

  const upColor = '#ef232a'
  const upBorderColor = '#ef232a'
  const downColor = '#14b143'
  const downBorderColor = '#14b143'

  // Initial calculation of visible extremes for markPoint
  let maxVal = -Infinity, minVal = Infinity
  let maxIdx = startValue, minIdx = startValue

  for (let i = startValue; i <= endValue; i++) {
    const item = rawData[i]
    if (!item) continue
    const h = parseFloat(item.h)
    const l = parseFloat(item.l)
    if (h > maxVal) { maxVal = h; maxIdx = i }
    if (l < minVal) { minVal = l; minIdx = i }
  }

  const option = {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: 'rgba(24,24,27,0.95)',
      borderColor: '#3f3f46',
      textStyle: { color: '#e2e8f0' },
      formatter: function (params) {
        let res = params[0].name + '<br/>'
        params.forEach(p => {
          if (p.seriesType === 'candlestick') {
            let o, c, l, h
            if (p.value && p.value.length >= 5) {
               o = p.value[1]; c = p.value[2]; l = p.value[3]; h = p.value[4];
            } else if (p.data && p.data.length >= 4) {
               o = p.data[0]; c = p.data[1]; l = p.data[2]; h = p.data[3];
            }
            res += `${p.marker} ${t('futuresCurrentPriceStr') || '实时价格'} <span style="float:right;margin-left:20px;font-weight:bold">${c}</span><br/>`
            res += `<div style="padding-left:14px;color:#94a3b8;font-size:12px;margin-top:4px;margin-bottom:4px;">`
            res += `${t('futuresOpenStr') || '开盘价格'} <span style="float:right;margin-left:15px">${formatPrice(o, modalItem.value.symbol)}</span><br/>`
            res += `${t('futuresCloseStr') || '收盘价格'} <span style="float:right;margin-left:15px">${formatPrice(c, modalItem.value.symbol)}</span><br/>`
            res += `${t('futuresLowStr') || '最低价格'} <span style="float:right;margin-left:15px">${formatPrice(l, modalItem.value.symbol)}</span><br/>`
            res += `${t('futuresHighStr') || '最高价格'} <span style="float:right;margin-left:15px">${formatPrice(h, modalItem.value.symbol)}</span>`
            res += `</div>`
          } else {
            let val = (p.value !== '-' && p.value !== undefined && !isNaN(p.value)) ? formatPrice(p.value, modalItem.value.symbol) : '-'
            res += `${p.marker} ${p.seriesName} <span style="float:right;margin-left:20px;font-weight:bold">${val}</span><br/>`
          }
        })
        return res
      }
    },
    axisPointer: { link: [{ xAxisIndex: 'all' }] },
    grid: [
      { left: '8%', right: '8%', top: '8%', height: '82%' }
    ],
    xAxis: [
      { 
        type: 'category', 
        data: categoryData, 
        boundaryGap: true, 
        axisLine: { lineStyle: { color: '#3f3f46' } }, 
        splitLine: { show: false }, 
        axisLabel: { color: '#94a3b8' }, 
        min: 'dataMin', 
        max: 'dataMax' 
      }
    ],
    yAxis: [
      { 
        scale: true, 
        splitArea: { show: false }, 
        axisLine: { show: true, lineStyle: { color: '#3f3f46' } }, 
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.03)' } }, 
        axisLabel: { color: '#94a3b8' } 
      }
    ],
    dataZoom: [
      { type: 'inside', xAxisIndex: [0], startValue, endValue },
      { show: true, xAxisIndex: [0], type: 'slider', top: '92%', height: 16, borderColor: '#27272a', textStyle: { color: '#94a3b8' }, startValue, endValue }
    ],
    series: [
      { 
        name: t('futuresCurrentPriceStr') || '实时价格', 
        type: 'candlestick', 
        data: values, 
        itemStyle: { 
          color: upColor, 
          color0: downColor, 
          borderColor: upBorderColor, 
          borderColor0: downBorderColor 
        },
        markPoint: {
          label: {
            show: true,
            color: '#ffffff',
            fontSize: 10,
            backgroundColor: 'rgba(24,24,27,0.85)',
            padding: [3, 6],
            borderRadius: 4,
            borderColor: '#3f3f46',
            borderWidth: 1
          },
          data: [
            {
              coord: [categoryData[maxIdx], maxVal],
              value: maxVal,
              label: { formatter: '← {c}', position: 'top', color: '#ef232a' },
              symbol: 'circle', symbolSize: 4, itemStyle: { color: '#ef232a' }
            },
            {
              coord: [categoryData[minIdx], minVal],
              value: minVal,
              label: { formatter: '{c} →', position: 'bottom', color: '#14b143' },
              symbol: 'circle', symbolSize: 4, itemStyle: { color: '#14b143' }
            }
          ]
        }
      },
      { name: 'MA5', type: 'line', data: calculateMA(5, rawData), smooth: true, lineStyle: { width: 1.2 }, itemStyle: { color: '#facc15' }, symbol: 'none' },
      { name: 'MA10', type: 'line', data: calculateMA(10, rawData), smooth: true, lineStyle: { width: 1.2 }, itemStyle: { color: '#60a5fa' }, symbol: 'none' },
      { name: 'MA20', type: 'line', data: calculateMA(20, rawData), smooth: true, lineStyle: { width: 1.2 }, itemStyle: { color: '#c084fc' }, symbol: 'none' }
    ]
  }
  
  klineChartInstance.setOption(option, true)

  // Listen to datazoom to update extremes dynamically
  klineChartInstance.off('datazoom')
  klineChartInstance.on('datazoom', function () {
    const opt = klineChartInstance.getOption()
    const dz = opt.dataZoom[0]
    if (!dz) return
    
    const sIdx = Math.max(0, Math.round(dz.startValue))
    const eIdx = Math.min(klineDataCache.length - 1, Math.round(dz.endValue))
    
    let curMaxVal = -Infinity, curMinVal = Infinity
    let curMaxIdx = sIdx, curMinIdx = sIdx
    
    for (let i = sIdx; i <= eIdx; i++) {
      const item = klineDataCache[i]
      if (!item) continue
      const h = parseFloat(item.h)
      const l = parseFloat(item.l)
      if (h > curMaxVal) { curMaxVal = h; curMaxIdx = i }
      if (l < curMinVal) { curMinVal = l; curMinIdx = i }
    }
    
    klineChartInstance.setOption({
      series: [
        {
          name: t('futuresCurrentPriceStr') || '实时价格',
          markPoint: {
            data: [
              {
                coord: [categoryData[curMaxIdx], curMaxVal],
                value: curMaxVal,
                label: { formatter: '← {c}', position: 'top', color: '#ef232a' },
                symbol: 'circle', symbolSize: 4, itemStyle: { color: '#ef232a' }
              },
              {
                coord: [categoryData[curMinIdx], curMinVal],
                value: curMinVal,
                label: { formatter: '{c} →', position: 'bottom', color: '#14b143' },
                symbol: 'circle', symbolSize: 4, itemStyle: { color: '#14b143' }
              }
            ]
          }
        }
      ]
    }, { lazyUpdate: true })
  })
}

onMounted(() => {
  loadAll()
  refreshTimer = setInterval(loadAll, 2500)
  
  window.addEventListener('resize', () => {
    if (klineChartInstance) klineChartInstance.resize()
    futuresList.value.forEach(item => {
      const el1 = document.getElementById('trend-' + item.symbol)
      if (el1) echarts.getInstanceByDom(el1)?.resize()
      const el2 = document.getElementById('mini-kline-' + item.symbol)
      if (el2) echarts.getInstanceByDom(el2)?.resize()
    })
  })
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
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

/* Notice Banner */
.futures-notice {
  background-color: #fffbeb;
  border: 1px solid #fcd34d;
  color: #92400e;
  padding: 12px 16px;
  margin: 12px 0 0;
  border-radius: 8px;
  font-size: 14px;
  display: flex;
  align-items: center;
}
.notice-icon {
  font-style: normal;
  margin-right: 8px;
  font-size: 16px;
}

/* Table Layout */
.futures-table-container {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  overflow-x: auto;
  margin: 10px 0;
  text-align: center;
  width: 100%;
}

.futures-table th, .futures-table td {
  text-align: center !important;
}

/* Column Widths */
.futures-table th:nth-child(1), .futures-table td:nth-child(1) { width: 22%; }
.futures-table th:nth-child(2), .futures-table td:nth-child(2) { width: 14%; }
.futures-table th:nth-child(3), .futures-table td:nth-child(3) { width: 14%; }
.futures-table th:nth-child(4), .futures-table td:nth-child(4) { width: 18%; }
.futures-table th:nth-child(5), .futures-table td:nth-child(5) { width: 18%; }
.futures-table th:nth-child(6), .futures-table td:nth-child(6) { width: 14%; }

.futures-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  min-width: 700px;
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
  padding: 5px 10px;
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  font-family: 'Inter', monospace;
  text-align: center;
  min-width: 75px;
}
.bg-up { background-color: #ef232a; }
.bg-down { background-color: #14b143; }

/* Mini Trend Chart */
.chart-cell { padding: 4px 16px !important; }
.mini-trend-wrap {
  width: 140px;
  height: 44px;
  pointer-events: none;
  margin: 0 auto;
}

/* ==== Modal ==== */
.kline-modal {
  position: fixed; inset: 0; z-index: 9999; background: rgba(9, 9, 11, 0.82);
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.kline-modal-inner {
  background: #18181b; border: 1px solid #27272a; border-radius: 14px; width: 100%; max-width: 1200px;
  height: 90vh; max-height: 750px; display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}
.modal-header {
  display: flex; flex-direction: column; gap: 14px; padding: 16px 24px;
  border-bottom: 1px solid #27272a; flex-shrink: 0;
  background-color: #1f1f23 !important;
}
.modal-header-top { display: flex; justify-content: space-between; align-items: flex-start; width: 100%; }
.modal-title-wrap { display: flex; align-items: baseline; }
.kline-stats {
  display: flex; gap: 10px; flex-wrap: wrap; margin-top: 4px;
}
.stat-item {
  display: flex; align-items: center; justify-content: flex-start; gap: 6px;
  background: rgba(255, 255, 255, 0.03); 
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 5px 10px; border-radius: 6px;
  white-space: nowrap;
}
.s-label { color: #a1a1aa; font-size: 12px; white-space: nowrap; }
.s-val { color: #f4f4f5; font-size: 14px; font-weight: 700; font-family: 'Inter', monospace; white-space: nowrap; }
.s-val.up { color: #ef232a; }
.s-val.down { color: #14b143; }

@media (max-width: 1024px) {
  .kline-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    width: 100%;
  }
}

@media (max-width: 600px) {
  .kline-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }
  .stat-item {
    padding: 6px 4px;
  }
  .s-label { font-size: 11px; }
  .s-val { font-size: 12px; }
}

.modal-symbol { font-size: 20px; font-weight: 800; color: #f4f4f5; margin-right: 12px; }
.modal-name { font-size: 15px; color: #a1a1aa; }
.modal-exchange {
  font-size: 10px; font-weight: 700; background: #ef4444; color: #fff; border-radius: 4px; padding: 2px 6px;
}
.modal-controls { display: flex; align-items: center; gap: 6px; }
.mini-spinner {
  width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.2);
  border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 8px;
}
.day-btn {
  font-size: 12px; font-weight: 500; padding: 5px 12px; border-radius: 6px; border: 1px solid #3f3f46;
  background: transparent; color: #a1a1aa; cursor: pointer; transition: all 0.2s;
}
.day-btn:hover { background: #27272a; color: #f4f4f5; border-color: #52525b; }
.day-btn.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }
.close-btn {
  width: 32px; height: 32px; border-radius: 50%; background: #27272a; border: none;
  color: #a1a1aa; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; margin-left: 8px;
}
.close-btn:hover { background: #ef4444; color: #fff; }
.kline-chart-wrap { flex: 1; position: relative; overflow: hidden; width: 100%; height: 100%; padding-bottom: 8px; }

@media (max-width: 768px) {
  .kline-modal-inner { max-height: 95vh; }
  .modal-header-top { flex-direction: column; gap: 12px; }
  .modal-title-wrap { flex-direction: column; align-items: flex-start; gap: 4px; }
  .modal-controls { width: 100%; flex-wrap: wrap; }
}
</style>
