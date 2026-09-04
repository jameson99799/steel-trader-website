<template>
  <div class="ship-tracker-page">
    <!-- Search -->
    <div class="ship-search-box">
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
      <div class="suggest-row">
        <span class="suggest-label">{{ t('shipTry') || '试试:' }}</span>
        <button v-for="s in suggestShips" :key="s" class="suggest-chip" @click="quickSearch(s)">{{ s }}</button>
      </div>
    </div>

    <!-- Search Result Detail -->
    <div v-if="selected" class="ship-detail-card">
      <div class="detail-head">
        <div class="head-left">
          <h3 class="ship-name">🚢 {{ selected.name }}</h3>
          <div class="ship-meta">
            <span v-if="selected.imo">IMO {{ selected.imo }}</span>
            <span v-if="selected.mmsi">MMSI {{ selected.mmsi }}</span>
            <span v-if="selected.callsign">{{ t('shipCallsign') || '呼号' }} {{ selected.callsign }}</span>
            <span v-if="selected.flagName">{{ t('shipFlag') || '船旗' }} {{ lang === 'zh' ? (selected.flagNameZh || selected.flagName) : selected.flagName }}</span>
          </div>
        </div>
        <span class="status-pill" :class="statusClass(selected)">
          {{ statusText(selected) }}
        </span>
      </div>

      <div class="detail-body">
        <div class="detail-grid">
          <div class="d-item"><div class="d-k">{{ t('shipType') || '船型' }}</div><div class="d-v">{{ lang === 'zh' ? (selected.typeZh || selected.type) : selected.type }}</div></div>
          <div class="d-item"><div class="d-k">{{ t('shipBuilt') || '建造年份' }}</div><div class="d-v">{{ selected.built || '--' }}</div></div>
          <div class="d-item"><div class="d-k">{{ t('shipGt') || '总吨位' }}</div><div class="d-v">{{ selected.gt ? selected.gt.toLocaleString() : '--' }}</div></div>
          <div class="d-item"><div class="d-k">{{ t('shipDwt') || '载重吨' }}</div><div class="d-v">{{ selected.dwt ? selected.dwt.toLocaleString() + ' t' : '--' }}</div></div>
          <div class="d-item"><div class="d-k">{{ t('shipLoa') || '总长' }}</div><div class="d-v">{{ selected.loa ? selected.loa + ' m' : '--' }}</div></div>
          <div class="d-item"><div class="d-k">{{ t('shipBeam') || '船宽' }}</div><div class="d-v">{{ selected.beam ? selected.beam + ' m' : '--' }}</div></div>
        </div>

        <div v-if="selected.live" class="live-section">
          <div class="live-title">
            <span class="live-dot"></span>
            {{ t('shipLivePosition') || '实时位置' }}
            <span v-if="selected.live.source === 'demo'" class="demo-tag">{{ t('shipDemoData') || '演示数据' }}</span>
            <span v-else class="live-tag">{{ t('shipLiveData') || '实时数据' }}</span>
          </div>
          <div class="live-grid">
            <div class="d-item"><div class="d-k">{{ t('shipLat') || '纬度' }}</div><div class="d-v">{{ selected.live.lat?.toFixed(4) ?? '--' }}</div></div>
            <div class="d-item"><div class="d-k">{{ t('shipLon') || '经度' }}</div><div class="d-v">{{ selected.live.lon?.toFixed(4) ?? '--' }}</div></div>
            <div class="d-item"><div class="d-k">{{ t('shipSpeed') || '航速' }}</div><div class="d-v">{{ selected.live.sog?.toFixed(1) ?? '--' }} kn</div></div>
            <div class="d-item"><div class="d-k">{{ t('shipCourse') || '航向' }}</div><div class="d-v">{{ selected.live.cog?.toFixed(0) ?? '--' }}°</div></div>
            <div class="d-item"><div class="d-k">{{ t('shipDest') || '目的地' }}</div><div class="d-v">{{ lang === 'zh' ? (selected.live.destZh || selected.live.dest) : selected.live.dest }}</div></div>
            <div class="d-item"><div class="d-k">{{ t('shipEta') || '预计到达' }}</div><div class="d-v">{{ selected.live.eta || '--' }}</div></div>
            <div class="d-item"><div class="d-k">{{ t('shipLastPort') || '上一港口' }}</div><div class="d-v">{{ lang === 'zh' ? (selected.live.lastPortZh || selected.live.lastPort) : selected.live.lastPort }}</div></div>
            <div class="d-item"><div class="d-k">{{ t('shipUpdated') || '更新时间' }}</div><div class="d-v">{{ formatTime(selected.live.updatedAt) }}</div></div>
          </div>
          <div class="map-wrap">
            <div class="map-bar">
              <a :href="mapUrl(selected)" target="_blank" rel="noopener" class="map-link">
                {{ t('shipViewMap') || '在 Google 地图查看位置' }} ↗
              </a>
            </div>
          </div>
        </div>
        <div v-else class="no-live">{{ t('shipNoLive') || '暂无实时位置数据' }}</div>
      </div>
    </div>

    <!-- Watchlist Table -->
    <div class="futures-notice">
      <i class="notice-icon">📢</i>
      <span>{{ t('shipNotice') || '注意：船舶位置数据来自 AIS 公共数据源，未配置 API Key 时展示为演示数据' }}</span>
    </div>

    <div v-if="loading" class="futures-loading">
      <div class="spinner"></div>
      <p>{{ t('shipLoading') || '加载船舶数据中...' }}</p>
    </div>

    <div v-else-if="shipList.length === 0" class="futures-empty">
      <div class="empty-icon">🚢</div>
      <p>{{ t('shipEmpty') || '暂未配置船舶，请联系管理员添加' }}</p>
    </div>

    <div v-else class="futures-table-container">
      <table class="futures-table ship-table">
        <thead>
          <tr>
            <th>{{ t('shipName') || '船名' }}</th>
            <th>{{ t('shipType') || '船型' }}</th>
            <th>{{ t('shipIdentification') || 'IMO / MMSI' }}</th>
            <th>{{ t('shipStatus') || '状态' }}</th>
            <th>{{ t('shipSpeed') || '航速' }}</th>
            <th>{{ t('shipCourse') || '航向' }}</th>
            <th>{{ t('shipPosition') || '位置' }}</th>
            <th>{{ t('shipDest') || '目的地' }}</th>
            <th>{{ t('shipEta') || 'ETA' }}</th>
            <th>{{ t('shipUpdated') || '更新时间' }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ship in shipList" :key="ship.id" class="clickable-row" @click="selectShip(ship)">
            <td>
              <div class="f-name">{{ ship.name }}</div>
              <div class="f-code">{{ ship.built || '--' }} · {{ lang === 'zh' ? (ship.typeZh || ship.type) : ship.type }}</div>
            </td>
            <td><div class="f-code">{{ lang === 'zh' ? (ship.typeZh || ship.type) : ship.type }}</div></td>
            <td>
              <div class="f-code" v-if="ship.imo">IMO {{ ship.imo }}</div>
              <div class="f-code" v-if="ship.mmsi">MMSI {{ ship.mmsi }}</div>
            </td>
            <td>
              <span class="status-pill" :class="statusClass(ship)">{{ statusText(ship) }}</span>
            </td>
            <td>
              <div v-if="ship.live" class="f-price">{{ ship.live.sog?.toFixed(1) ?? '--' }} <span class="unit-kn">kn</span></div>
              <div v-else class="f-loading-text">--</div>
            </td>
            <td>
              <div v-if="ship.live" class="f-code">{{ ship.live.cog?.toFixed(0) ?? '--' }}°</div>
              <div v-else class="f-loading-text">--</div>
            </td>
            <td>
              <div v-if="ship.live" class="f-code">{{ fmtPos(ship.live) }}</div>
              <div v-else class="f-loading-text">--</div>
            </td>
            <td>
              <div v-if="ship.live" class="f-name dest-name">{{ lang === 'zh' ? (ship.live.destZh || ship.live.dest) : ship.live.dest }}</div>
              <div v-else class="f-loading-text">--</div>
            </td>
            <td>
              <div v-if="ship.live" class="f-code">{{ ship.live.eta || '--' }}</div>
              <div v-else class="f-loading-text">--</div>
            </td>
            <td>
              <div v-if="ship.live" class="f-code updated-cell">{{ formatTime(ship.live.updatedAt) }}</div>
              <div v-else class="f-loading-text">--</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useLang } from '../composables/useLang'
import api from '../api'

const { t, lang } = useLang()

const loading = ref(true)
const shipList = ref([])
const searchQuery = ref('')
const searching = ref(false)
const selected = ref(null)

const suggestShips = ['PACIFIC TALENT', 'PACIFIC BLISS', 'PACIFIC CHAMP', '9712943', '477900500']

let refreshTimer = null

function statusClass(ship) {
  const s = ship.live?.status || ship.status || 'na'
  return s === 'underway' ? 'pill-green' : s === 'anchored' ? 'pill-orange' : s === 'moored' ? 'pill-blue' : 'pill-gray'
}

function statusText(ship) {
  const s = ship.live?.status || ship.status || 'na'
  const map = {
    underway: t('shipStUnderway') || '航行中',
    anchored: t('shipStAnchored') || '锚泊',
    moored: t('shipStMoored') || '靠泊',
    na: t('shipStUnknown') || '未知'
  }
  return map[s] || map.na
}

function fmtPos(live) {
  if (!live || live.lat === undefined || live.lon === undefined) return '--'
  return `${live.lat.toFixed(2)}, ${live.lon.toFixed(2)}`
}

function mapUrl(ship) {
  if (!ship.live) return '#'
  return `https://www.google.com/maps?q=${ship.live.lat},${ship.live.lon}`
}

function formatTime(iso) {
  if (!iso) return '--'
  const d = new Date(iso)
  return d.toLocaleString(lang.value === 'zh' ? 'zh-CN' : 'en-GB', { hour12: false })
}

async function loadList() {
  loading.value = true
  try {
    shipList.value = await api.getShipListData()
    if (selected.value) {
      const fresh = shipList.value.find(s => s.id === selected.value.id || s.name === selected.value.name)
      if (fresh) selected.value = fresh
    }
  } catch (e) {
    console.error('Ship list data error:', e)
  } finally {
    loading.value = false
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
    } else {
      selected.value = null
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
  searchQuery.value = ship.name
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  loadList()
  refreshTimer = setInterval(loadList, 20000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style scoped>
.ship-tracker-page { padding: 8px 0; }

/* Search */
.ship-search-box {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  box-shadow: var(--shadow-sm);
}
.search-row { display: flex; gap: 10px; }
.search-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  font-size: var(--text-base);
  outline: none;
  transition: border-color .2s;
}
.search-input:focus { border-color: var(--primary); }
.btn-search {
  padding: 12px 28px;
  background: var(--primary-gradient);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: var(--text-base);
  font-weight: 600;
  cursor: pointer;
  transition: opacity .2s;
}
.btn-search:hover:not(:disabled) { opacity: .9; }
.btn-search:disabled { opacity: .6; cursor: not-allowed; }
.suggest-row {
  display: flex; align-items: center; gap: 8px;
  margin-top: 12px; flex-wrap: wrap;
}
.suggest-label { font-size: var(--text-xs); color: var(--text-muted); }
.suggest-chip {
  font-size: var(--text-xs);
  color: var(--primary);
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 999px;
  padding: 4px 12px;
  cursor: pointer;
  transition: all .15s;
}
.suggest-chip:hover { background: #e0e7ff; }

/* Detail card */
.ship-detail-card {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-bottom: var(--spacing-md);
  box-shadow: var(--shadow-sm);
}
.detail-head {
  display: flex; justify-content: space-between; align-items: center;
  flex-wrap: wrap; gap: 12px;
  padding: var(--spacing) var(--spacing-md);
  background: linear-gradient(135deg, #0f2547, #1e3a8a);
  color: #fff;
}
.ship-name { font-size: var(--text-xl); font-weight: 700; }
.ship-meta {
  display: flex; gap: 14px; flex-wrap: wrap;
  font-size: var(--text-xs); opacity: .85; margin-top: 4px;
}
.detail-body { padding: var(--spacing-md); }
.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px 24px;
  margin-bottom: var(--spacing-md);
}
@media (max-width: 640px) { .detail-grid { grid-template-columns: repeat(2, 1fr); } }
.d-item .d-k { font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: .5px; }
.d-item .d-v { font-size: var(--text-base); font-weight: 600; color: var(--text-primary); margin-top: 2px; word-break: break-all; }

.live-section {
  border-top: 1px solid var(--border);
  padding-top: var(--spacing);
}
.live-title {
  display: flex; align-items: center; gap: 8px;
  font-size: var(--text-sm); font-weight: 700; color: var(--text-primary);
  margin-bottom: 12px;
}
.live-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #22c55e; display: inline-block;
  animation: pulse 1.6s infinite;
}
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
.demo-tag {
  font-size: 10px; font-weight: 700; color: #92400e;
  background: #fef3c7; padding: 2px 8px; border-radius: 999px;
}
.live-tag {
  font-size: 10px; font-weight: 700; color: #166534;
  background: #dcfce7; padding: 2px 8px; border-radius: 999px;
}
.live-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px 24px;
}
@media (max-width: 760px) { .live-grid { grid-template-columns: repeat(2, 1fr); } }
.map-wrap { margin-top: 14px; }
.map-bar {
  display: flex; justify-content: flex-end;
  padding: 10px 14px;
  background: var(--gray-50);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.map-link { color: var(--primary); font-size: var(--text-sm); font-weight: 600; text-decoration: none; }
.map-link:hover { text-decoration: underline; }
.no-live { color: var(--text-muted); font-size: var(--text-sm); padding: var(--spacing); text-align: center; }

/* Status pills */
.status-pill {
  font-size: 12px; font-weight: 700;
  padding: 4px 12px; border-radius: 999px; white-space: nowrap;
}
.pill-green { background: #22c55e; color: #fff; }
.pill-orange { background: #f59e0b; color: #1e293b; }
.pill-blue { background: #3b82f6; color: #fff; }
.pill-gray { background: #64748b; color: #fff; }

/* Table (reuses futures table styles) */
.unit-kn { font-size: 11px; color: var(--text-muted); font-weight: 400; }
.dest-name { font-size: 13px; }
.updated-cell { font-size: 12px; }
</style>