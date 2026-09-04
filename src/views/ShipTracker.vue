<template>
  <div class="ship-tracker-page">
    <!-- Top bar -->
    <div class="ship-topbar">
      <div class="search-row">
        <input
          v-model="searchQuery"
          class="search-input"
          :placeholder="t('shipSearchPlaceholder') || '输入船名 / IMO / MMSI，如 PACIFIC TALENT'"
          @keydown.enter="doSearch"
        />
        <button class="btn-search" :disabled="searching" @click="doSearch">
          {{ searching ? (t('shipSearching') || '搜索中...') : (t('shipSearchBtn') || '查询') }}
        </button>
      </div>
      <div class="status-area">
        <span class="conn-dot" :class="hasLiveData ? 'on' : ''"></span>
        <span class="st-text">{{ t('shipListTitle') || '船舶列表' }}: <b>{{ shipList.length }}</b></span>
        <span class="st-text" v-if="lastUpdate">{{ t('shipUpdated') || '更新时间' }}: <b>{{ lastUpdate }}</b></span>
        <button class="btn-refresh" :disabled="refreshing" @click="loadList">{{ t('shipRefresh') || '刷新' }}</button>
      </div>
    </div>

    <!-- Dashboard: map + list -->
    <div class="dashboard">
      <div class="map-panel" ref="mapPanelRef">
        <div class="map-box" ref="mapRef"></div>
        <div class="map-fallback" v-if="mapFailed">
          {{ t('shipMapFailed') || '地图加载失败，请检查网络连接' }}
        </div>
        <div class="map-legend">
          <span class="lg-item"><span class="lg-dot" style="background:#d97706"></span>{{ t('shipLegendBulk') || '散货船' }}</span>
          <span class="lg-item"><span class="lg-dot" style="background:#2563eb"></span>{{ t('shipLegendCargo') || '货船' }}</span>
          <span class="lg-item"><span class="lg-dot" style="background:#0ea5e9"></span>{{ t('shipLegendTanker') || '油轮' }}</span>
          <span class="lg-item"><span class="lg-dot" style="background:#7c3aed"></span>{{ t('shipLegendPassenger') || '客船' }}</span>
          <span class="lg-item"><span class="lg-dot" style="background:#64748b"></span>{{ t('shipLegendOther') || '其他' }}</span>
        </div>
        <div class="map-hint" v-if="!mapFailed && shipList.length > 0">{{ t('shipMapHint') || '点击船舶标记查看详情' }}</div>
      </div>

      <div class="side-panel">
        <div class="panel-head">
          <span>🚢 {{ t('shipListTitle') || '船舶列表' }}</span>
          <span class="panel-badge">{{ liveCount }}/{{ shipList.length }}</span>
        </div>
        <div v-if="loading" class="panel-loading">
          <div class="spinner"></div>
          <p>{{ t('shipLoading') || '加载船舶数据中...' }}</p>
        </div>
        <div v-else-if="shipList.length === 0" class="panel-empty">
          <div class="empty-icon">🚢</div>
          <p>{{ t('shipEmpty') || '暂未配置船舶，请联系管理员添加' }}</p>
        </div>
        <div v-else class="ship-cards">
          <div
            v-for="(ship, i) in shipList"
            :key="ship.id"
            class="ship-card"
            :class="{ on: selected && selected.id === ship.id }"
            :style="{ animationDelay: (i * 0.03) + 's' }"
            @click="selectShip(ship)"
          >
            <div class="c-l1">
              <div class="c-name">
                {{ ship.name }}
                <span v-if="!hasPos(ship)" class="c-tag">{{ t('shipNoPosition') || '暂无位置' }}</span>
              </div>
              <span class="status-pill" :class="statusClass(ship)">{{ statusText(ship) }}</span>
            </div>
            <div class="c-l2">
              <div v-if="ship.mmsi">MMSI <s>{{ ship.mmsi }}</s></div>
              <div>{{ t('shipType') || '类型' }} <s>{{ lang === 'zh' ? (ship.typeZh || ship.type) : ship.type }}</s></div>
              <div>{{ t('shipSpeed') || '航速' }} <s>{{ ship.live ? (ship.live.sog != null ? ship.live.sog.toFixed(1) + ' kn' : '--') : '--' }}</s></div>
              <div>{{ t('shipCourse') || '航向' }} <s>{{ ship.live && ship.live.cog != null ? ship.live.cog.toFixed(0) + '°' : '--' }}</s></div>
              <div v-if="ship.live && ship.live.dest" class="c-full">{{ t('shipDest') || '目的地' }}: <s style="color:#059669">{{ lang === 'zh' ? (ship.live.destZh || ship.live.dest) : ship.live.dest }}</s></div>
              <div v-if="ship.live && ship.live.eta" class="c-full">ETA: <s style="color:#d97706">{{ ship.live.eta }}</s></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="futures-notice">
      <i class="notice-icon">📢</i>
      <span>{{ t('shipNotice') || '注意：船舶位置数据来自 AIS 公共数据源，未配置 API Key 时展示为演示数据' }}</span>
    </div>

    <!-- Detail modal -->
    <Teleport to="body">
      <div class="ship-modal" v-if="selected" @click.self="closeDetail">
        <div class="modal-box">
          <button class="modal-close" @click="closeDetail">✕</button>
          <div class="modal-head">
            <div>
              <h3>🚢 {{ selected.name }}</h3>
              <div class="modal-meta">
                <span v-if="selected.imo">IMO {{ selected.imo }}</span>
                <span v-if="selected.mmsi">MMSI {{ selected.mmsi }}</span>
                <span v-if="selected.callsign">{{ t('shipCallsign') || '呼号' }} {{ selected.callsign }}</span>
                <span v-if="selected.flagName">{{ t('shipFlag') || '船旗' }} {{ lang === 'zh' ? (selected.flagNameZh || selected.flagName) : selected.flagName }}</span>
                <span>{{ lang === 'zh' ? (selected.typeZh || selected.type) : selected.type }}</span>
              </div>
            </div>
            <span class="status-pill" :class="statusClass(selected)">{{ statusText(selected) }}</span>
          </div>

          <div class="modal-body">
            <div class="sec-title">{{ t('shipRealtime') || '实时动态' }}</div>
            <div class="sec-grid">
              <div class="sec-item"><div class="k">{{ t('shipLat') || '纬度' }}</div><div class="v hi">{{ pos(selected, 'lat') }}</div></div>
              <div class="sec-item"><div class="k">{{ t('shipLon') || '经度' }}</div><div class="v hi">{{ pos(selected, 'lon') }}</div></div>
              <div class="sec-item"><div class="k">{{ t('shipSpeed') || '航速' }}</div><div class="v">{{ val(selected, 'sog', ' kn') }}</div></div>
              <div class="sec-item"><div class="k">{{ t('shipCourse') || '航向' }}</div><div class="v">{{ val(selected, 'cog', '°') }}</div></div>
              <div class="sec-item"><div class="k">{{ t('shipHeading') || '船艏向' }}</div><div class="v">{{ val(selected, 'heading', '°') }}</div></div>
              <div class="sec-item"><div class="k">{{ t('shipStatus') || '状态' }}</div><div class="v">{{ statusText(selected) }}</div></div>
              <div class="sec-item"><div class="k">{{ t('shipDest') || '目的地' }}</div><div class="v" style="color:#059669">{{ selected.live ? (lang === 'zh' ? (selected.live.destZh || selected.live.dest || '--') : (selected.live.dest || '--')) : '--' }}</div></div>
              <div class="sec-item"><div class="k">{{ t('shipEta') || '预计到达' }}</div><div class="v" style="color:#d97706">{{ selected.live && selected.live.eta ? selected.live.eta : '--' }}</div></div>
              <div class="sec-item"><div class="k">{{ t('shipLastPort') || '上一港口' }}</div><div class="v">{{ selected.live ? (lang === 'zh' ? (selected.live.lastPortZh || selected.live.lastPort || '--') : (selected.live.lastPort || '--')) : '--' }}</div></div>
              <div class="sec-item"><div class="k">{{ t('shipDataSource') || '数据源' }}</div><div class="v">{{ selected.live && selected.live.source === 'live' ? (t('shipLiveData') || '实时数据') : (t('shipDemoData') || '演示数据') }}</div></div>
              <div class="sec-item"><div class="k">{{ t('shipUpdated') || '更新时间' }}</div><div class="v small">{{ formatTime(selected.live && selected.live.updatedAt) }}</div></div>
            </div>

            <div class="sec-title">{{ t('shipParticulars') || '船舶资料' }}</div>
            <div class="sec-grid">
              <div class="sec-item"><div class="k">{{ t('shipBuilt') || '建造年份' }}</div><div class="v">{{ selected.built || '--' }}</div></div>
              <div class="sec-item"><div class="k">{{ t('shipGt') || '总吨位' }}</div><div class="v">{{ selected.gt ? selected.gt.toLocaleString() : '--' }}</div></div>
              <div class="sec-item"><div class="k">{{ t('shipDwt') || '载重吨' }}</div><div class="v">{{ selected.dwt ? selected.dwt.toLocaleString() + ' t' : '--' }}</div></div>
              <div class="sec-item"><div class="k">{{ t('shipLoa') || '总长' }}</div><div class="v">{{ selected.loa ? selected.loa + ' m' : '--' }}</div></div>
              <div class="sec-item"><div class="k">{{ t('shipBeam') || '船宽' }}</div><div class="v">{{ selected.beam ? selected.beam + ' m' : '--' }}</div></div>
            </div>
          </div>

          <div class="modal-foot">
            <button class="btn-primary" @click="locateOnMap">{{ t('shipLocate') || '地图定位' }} 📍</button>
            <button class="btn-plain" @click="closeDetail">{{ t('shipClose') || '关闭' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useLang } from '../composables/useLang'
import api from '../api'

const { t, lang } = useLang()

const loading = ref(true)
const refreshing = ref(false)
const shipList = ref([])
const searchQuery = ref('')
const searching = ref(false)
const selected = ref(null)
const lastUpdate = ref('')

const mapPanelRef = ref(null)
const mapRef = ref(null)
let map = null
let markers = new Map()
let mapFailed = ref(false)
let leafletLoading = false
let leafletWaiters = []

const suggestShips = ['PACIFIC TALENT', 'PACIFIC BLISS', 'PACIFIC CHAMP', '9712943', '477900500']

const liveCount = computed(() => shipList.value.filter(s => s.live).length)
const hasLiveData = computed(() => shipList.value.some(s => s.live && s.live.source === 'live'))

const TYPE_COLORS = {
  bulk: '#d97706', cargo: '#2563eb', tanker: '#0ea5e9',
  passenger: '#7c3aed', fishing: '#059669', other: '#64748b'
}

function shipColor(ship) {
  const type = String(ship.type || '').toLowerCase()
  if (type.includes('bulk')) return TYPE_COLORS.bulk
  if (type.includes('tank')) return TYPE_COLORS.tanker
  if (type.includes('passenger')) return TYPE_COLORS.passenger
  if (type.includes('fish')) return TYPE_COLORS.fishing
  if (type.includes('cargo') || type.includes('container')) return TYPE_COLORS.cargo
  return TYPE_COLORS.other
}

function hasPos(ship) {
  return ship.live && ship.live.lat !== undefined && ship.live.lon !== undefined
}

function statusClass(ship) {
  const s = ship.live?.status || 'na'
  return s === 'underway' ? 'pill-green' : s === 'anchored' ? 'pill-orange' : s === 'moored' ? 'pill-blue' : 'pill-gray'
}

function statusText(ship) {
  const s = ship.live?.status || 'na'
  const map = {
    underway: t('shipStUnderway') || '航行中',
    anchored: t('shipStAnchored') || '锚泊',
    moored: t('shipStMoored') || '靠泊',
    na: t('shipStUnknown') || '未知'
  }
  return map[s] || map.na
}

function pos(ship, key) {
  if (!ship.live || ship.live[key] === undefined || ship.live[key] === null) return '--'
  return ship.live[key].toFixed(4)
}

function val(ship, key, unit) {
  if (!ship.live || ship.live[key] === undefined || ship.live[key] === null) return '--'
  return ship.live[key].toFixed(1) + unit
}

function formatTime(iso) {
  if (!iso) return '--'
  const d = new Date(iso)
  return d.toLocaleString(lang.value === 'zh' ? 'zh-CN' : 'en-GB', { hour12: false })
}

// ── Leaflet dynamic load (CDN, graceful fallback) ─────────────────────────
function loadLeaflet() {
  return new Promise((resolve) => {
    if (window.L) return resolve(true)
    if (leafletLoading) {
      leafletWaiters.push(resolve)
      return
    }
    leafletLoading = true
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => {
      leafletLoading = false
      leafletWaiters.forEach(w => w(true))
      leafletWaiters = []
      resolve(true)
    }
    script.onerror = () => {
      leafletLoading = false
      leafletWaiters.forEach(w => w(false))
      leafletWaiters = []
      resolve(false)
    }
    document.head.appendChild(script)
  })
}

async function initMap() {
  const ok = await loadLeaflet()
  if (!ok) { mapFailed.value = true; return }
  await nextTick()
  if (!mapRef.value) return
  map = L.map(mapRef.value, { center: [20, 110], zoom: 3, zoomControl: true, attributionControl: false })
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd', maxZoom: 20
  }).addTo(map)
  renderMarkers()
}

function renderMarkers() {
  if (!map) return
  const seen = new Set()
  shipList.value.filter(hasPos).forEach(ship => {
    const key = String(ship.mmsi || ship.id)
    seen.add(key)
    const latlng = [ship.live.lat, ship.live.lon]
    let marker = markers.get(key)
    if (!marker) {
      const color = shipColor(ship)
      const label = String(ship.name || key).slice(0, 10)
      const icon = L.divIcon({
        className: 'ship-marker-wrap',
        html: `<div class="ship-marker" style="--mc:${color}"><span class="m-dot"></span><span class="m-lbl">${label}</span></div>`,
        iconSize: [16, 16], iconAnchor: [8, 8]
      })
      marker = L.marker(latlng, { icon }).addTo(map)
      marker.on('click', () => {
        const match = shipList.value.find(s => String(s.mmsi || s.id) === key)
        if (match) selectShip(match)
      })
      markers.set(key, marker)
    } else {
      marker.setLatLng(latlng)
    }
  })
  for (const [key, marker] of markers) {
    if (!seen.has(key)) {
      map.removeLayer(marker)
      markers.delete(key)
    }
  }
}

// ── Data ──────────────────────────────────────────────────────────────────
async function loadList(silent = false) {
  if (!silent) loading.value = true
  refreshing.value = true
  try {
    shipList.value = await api.getShipListData()
    lastUpdate.value = new Date().toLocaleTimeString(lang.value === 'zh' ? 'zh-CN' : 'en-GB', { hour12: false })
    renderMarkers()
    if (selected.value) {
      const fresh = shipList.value.find(s => s.id === selected.value.id || s.name === selected.value.name)
      if (fresh) selected.value = fresh
    }
  } catch (e) {
    console.error('Ship list data error:', e)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function doSearch() {
  const q = searchQuery.value.trim()
  if (!q || searching.value) return
  searching.value = true
  try {
    const results = await api.searchShips(q)
    if (results && results.length > 0) {
      selected.value = results[0]
      await nextTick()
      if (map && hasPos(selected.value)) {
        map.flyTo([selected.value.live.lat, selected.value.live.lon], 10, { duration: 0.8 })
      }
    } else {
      alert(t('shipNoResult') || '未找到该船舶，请检查船名或编号')
    }
  } catch (e) {
    alert(t('shipSearchError') || '查询失败，请稍后重试')
  } finally {
    searching.value = false
  }
}

function quickSearch(q) {
  searchQuery.value = q
  doSearch()
}

function selectShip(ship) {
  selected.value = ship
  if (map && hasPos(ship)) {
    map.flyTo([ship.live.lat, ship.live.lon], 9, { duration: 0.6 })
  }
}

function locateOnMap() {
  if (!map || !selected.value || !hasPos(selected.value)) return
  map.flyTo([selected.value.live.lat, selected.value.live.lon], 11, { duration: 0.8 })
  closeDetail()
}

function closeDetail() {
  selected.value = null
}

let refreshTimer = null

onMounted(() => {
  initMap()
  loadList()
  refreshTimer = setInterval(() => loadList(true), 20000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  if (map) { map.remove() }
  map = null
  markers = new Map()
})
</script>

<style scoped>
.ship-tracker-page { padding: 8px 0; }

/* Top bar */
.ship-topbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--spacing);
  margin-bottom: var(--spacing);
  box-shadow: var(--shadow-sm);
}
.search-row { display: flex; gap: 10px; flex: 1; min-width: 260px; }
.search-input {
  flex: 1;
  padding: 10px 14px;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  font-size: var(--text-sm);
  outline: none;
  transition: border-color .2s;
}
.search-input:focus { border-color: var(--primary); }
.btn-search {
  padding: 10px 22px;
  background: var(--primary-gradient);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: opacity .2s;
  white-space: nowrap;
}
.btn-search:hover:not(:disabled) { opacity: .9; }
.btn-search:disabled { opacity: .6; cursor: not-allowed; }
.status-area { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.conn-dot {
  width: 9px; height: 9px; border-radius: 50%;
  background: #dc2626; transition: background .3s;
}
.conn-dot.on { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,.6); }
.st-text { font-size: 12px; color: var(--text-secondary); }
.st-text b { color: var(--primary); }
.btn-refresh {
  padding: 8px 16px;
  border: 1px solid var(--border);
  background: var(--white);
  color: var(--text-secondary);
  border-radius: var(--radius);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all .2s;
}
.btn-refresh:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.btn-refresh:disabled { opacity: .6; cursor: not-allowed; }

/* Dashboard grid */
.dashboard {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: var(--spacing);
  margin-bottom: var(--spacing);
}
@media (max-width: 980px) { .dashboard { grid-template-columns: 1fr; } }

/* Map panel */
.map-panel {
  position: relative;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  min-height: 480px;
}
@media (max-width: 980px) { .map-panel { min-height: 360px; } }
.map-box { width: 100%; height: 100%; min-height: 480px; }
@media (max-width: 980px) { .map-box { min-height: 360px; } }
.map-fallback {
  position: absolute; inset: 0; z-index: 500;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #dbeafe, #e0f2fe);
  color: var(--text-secondary); font-size: var(--text-sm);
  text-align: center; padding: 20px;
}
.map-legend {
  position: absolute; bottom: 12px; left: 12px; z-index: 1000;
  display: flex; gap: 10px; flex-wrap: wrap;
  background: rgba(255,255,255,.92);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 6px 12px;
  font-size: 11px; color: var(--text-secondary);
  box-shadow: var(--shadow-sm);
}
.lg-item { display: flex; align-items: center; gap: 4px; }
.lg-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.map-hint {
  position: absolute; top: 12px; left: 50%; transform: translateX(-50%); z-index: 1000;
  background: rgba(255,255,255,.92);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 14px;
  font-size: 11px; color: var(--text-secondary);
  pointer-events: none;
  box-shadow: var(--shadow-sm);
}

/* Side panel */
.side-panel {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 480px;
  max-height: 620px;
}
.panel-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--gray-50);
  font-size: var(--text-sm); font-weight: 700; color: var(--text-primary);
}
.panel-badge {
  font-size: 11px; font-weight: 600; color: var(--text-secondary);
  background: var(--gray-100);
  padding: 2px 8px; border-radius: 999px;
}
.ship-cards {
  flex: 1; overflow-y: auto; padding: 10px;
  display: flex; flex-direction: column; gap: 8px;
}
.ship-cards::-webkit-scrollbar { width: 4px; }
.ship-cards::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
.ship-card {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all .2s;
  box-shadow: var(--shadow-sm);
  animation: cardUp .3s ease-out;
}
@keyframes cardUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.ship-card:hover { transform: translateY(-1px); box-shadow: var(--shadow-md); border-color: var(--primary); }
.ship-card:active { transform: scale(.98); }
.ship-card.on { border-color: var(--primary); background: #f0f4ff; }
.c-l1 { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 4px; }
.c-name { font-size: 14px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.c-tag {
  font-size: 9px; font-weight: 700; color: var(--text-muted);
  background: var(--gray-100); padding: 1px 5px; border-radius: 4px;
}
.c-l2 {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 2px 8px;
  font-size: 11px; color: var(--text-muted);
}
.c-l2 s { color: var(--text-primary); font-weight: 500; text-decoration: none; }
.c-full { grid-column: 1 / -1; }
.status-pill {
  font-size: 10px; font-weight: 700;
  padding: 2px 8px; border-radius: 999px; white-space: nowrap; flex-shrink: 0;
}
.pill-green { background: #22c55e; color: #fff; }
.pill-orange { background: #f59e0b; color: #1e293b; }
.pill-blue { background: #3b82f6; color: #fff; }
.pill-gray { background: #64748b; color: #fff; }

.panel-loading, .panel-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--text-muted); font-size: var(--text-sm); padding: 30px; }
.spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-icon { font-size: 36px; }

/* Leaflet marker styling (injected into map DOM) */
:deep(.ship-marker-wrap) { background: transparent; border: none; }
:deep(.ship-marker) { position: relative; }
:deep(.ship-marker .m-dot) {
  display: block; width: 14px; height: 14px;
  background: var(--mc);
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 2px 5px rgba(0,0,0,.25);
}
:deep(.ship-marker .m-lbl) {
  position: absolute; top: -15px; left: 50%;
  transform: translateX(-50%);
  background: #fff; color: var(--mc);
  font-size: 9px; font-weight: 700;
  white-space: nowrap;
  padding: 1px 5px;
  border-radius: 3px;
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 1px 3px rgba(0,0,0,.15);
}

/* Detail modal */
.ship-modal {
  position: fixed; inset: 0; z-index: 3000;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,.45);
  backdrop-filter: blur(2px);
  padding: 16px;
}
.modal-box {
  position: relative;
  background: var(--white);
  border-radius: var(--radius-lg);
  width: 100%; max-width: 640px;
  max-height: 88vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0,0,0,.2);
  animation: modalIn .3s ease-out;
}
@keyframes modalIn { from { opacity: 0; transform: scale(.95) translateY(14px); } to { opacity: 1; transform: scale(1) translateY(0); } }
.modal-close {
  position: sticky; top: 10px; float: right; z-index: 10;
  width: 30px; height: 30px;
  border: none;
  background: var(--gray-100);
  color: var(--text-secondary);
  border-radius: 50%;
  cursor: pointer;
  font-size: 15px;
  display: flex; align-items: center; justify-content: center;
  transition: all .2s;
  margin: 10px 12px 0 0;
}
.modal-close:hover { background: #fee2e2; color: #dc2626; }
.modal-head {
  padding: 20px 24px 12px;
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: 12px;
}
.modal-head h3 { font-size: var(--text-xl); font-weight: 800; color: var(--text-primary); }
.modal-meta {
  display: flex; gap: 12px; flex-wrap: wrap;
  font-size: 11px; color: var(--text-muted);
  margin-top: 4px;
}
.modal-body { padding: 4px 24px 16px; }
.sec-title {
  font-size: 13px; font-weight: 700; color: var(--text-secondary);
  margin: 14px 0 8px;
  padding-bottom: 4px;
  border-bottom: 2px solid var(--border);
}
.sec-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
@media (max-width: 560px) { .sec-grid { grid-template-columns: repeat(2, 1fr); } }
.sec-item {
  background: var(--gray-50);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 10px;
}
.sec-item .k { font-size: 10px; color: var(--text-muted); margin-bottom: 2px; }
.sec-item .v { font-size: 14px; font-weight: 600; color: var(--text-primary); word-break: break-all; }
.sec-item .v.hi { color: var(--primary); font-size: 15px; }
.sec-item .v.small { font-size: 11px; font-weight: 500; }
.modal-foot {
  padding: 14px 24px 20px;
  display: flex; gap: 10px; justify-content: flex-end;
  border-top: 1px solid var(--border);
}
.btn-primary {
  padding: 9px 20px;
  background: var(--primary-gradient);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: 13px; font-weight: 600;
  cursor: pointer;
  transition: opacity .2s;
}
.btn-primary:hover { opacity: .9; }
.btn-plain {
  padding: 9px 20px;
  border: 1px solid var(--border);
  background: var(--white);
  color: var(--text-secondary);
  border-radius: var(--radius);
  font-size: 13px; font-weight: 600;
  cursor: pointer;
  transition: all .2s;
}
.btn-plain:hover { border-color: var(--primary); color: var(--primary); }

.futures-notice {
  display: flex; align-items: center; gap: 8px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: var(--radius);
  padding: 10px 16px;
  font-size: var(--text-xs);
  color: #1e40af;
  margin-bottom: 8px;
}
.notice-icon { font-style: normal; }
</style>