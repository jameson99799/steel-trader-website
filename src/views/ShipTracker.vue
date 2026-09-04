<template>
  <div class="shipxy-dash">
    <!-- Loading Screen -->
    <div id="loading-screen">
      <div class="loader-content">
        <div class="ship-loader">
          <svg class="ship-svg" viewBox="0 0 120 80" fill="none">
            <path d="M10 60 L20 25 L55 25 L65 45 L110 45 L105 60 Z" fill="#00d4ff" opacity="0.8"/>
            <rect x="20" y="20" width="35" height="8" rx="2" fill="#e2e8f0"/>
            <circle cx="78" cy="52" r="4" fill="#e2e8f0"/>
            <path d="M40 60 L55 70 L85 70 L100 60 Z" fill="#0ea5e9"/>
          </svg>
        </div>
        <div class="loader-title">船舶实时追踪</div>
        <div class="loader-bar"><div class="loader-bar-fill"></div></div>
        <div class="loader-text">正在加载全球船舶数据...</div>
      </div>
    </div>

    <div class="app-container">
      <!-- Top Bar -->
      <header class="top-bar">
        <div class="logo-section">
          <span class="logo-icon">⚓</span>
          <div class="logo-text">
            <span class="logo-title">船舶实时追踪</span>
            <span class="logo-subtitle">Live Ship Tracking</span>
          </div>
        </div>
        <div class="view-toggle">
          <button class="view-btn active" data-view="map">🗺️ 2D</button>
          <button class="view-btn" data-view="globe">🌍 3D</button>
        </div>
        <nav class="nav-tabs" id="nav-tabs">
          <button class="nav-tab active" data-panel="dashboard"><span class="tab-icon">📊</span>仪表盘</button>
          <button class="nav-tab" data-panel="search"><span class="tab-icon">🔍</span>搜索</button>
          <button class="nav-tab" data-panel="route"><span class="tab-icon">🗺️</span>航线</button>
          <button class="nav-tab" data-panel="weather"><span class="tab-icon">🌊</span>气象</button>
          <button class="nav-tab" data-panel="port"><span class="tab-icon">⚓</span>港口</button>
        </nav>
        <div class="header-right">
          <span class="api-status" id="api-status" title="API状态">🟡</span>
          <span class="time-display" id="time-display">--</span>
          <button class="icon-btn" id="btn-panel-toggle" title="侧栏">☰</button>
          <button class="icon-btn" id="btn-fullscreen" title="全屏">⛶</button>
          <button class="icon-btn" id="btn-settings" title="设置">⚙️</button>
        </div>
      </header>

      <!-- Main -->
      <div class="main-content">
        <div class="map-container" id="map-container"></div>
        <div class="globe-container" id="globe-container" style="display:none">
          <canvas id="globe-canvas"></canvas>
          <div class="globe-overlay-info">船舶: <span id="ship-count-globe">--</span> | 点击标记查看详情</div>
          <div class="globe-legend">
            <span class="legend-item"><span class="legend-dot cargo"></span>货船</span>
            <span class="legend-item"><span class="legend-dot tanker"></span>油轮</span>
            <span class="legend-item"><span class="legend-dot fishing"></span>渔船</span>
            <span class="legend-item"><span class="legend-dot passenger"></span>客船</span>
            <span class="legend-item"><span class="legend-dot other"></span>其他</span>
          </div>
        </div>
        <div class="map-overlay-info" id="map-overlay">
          <span>船舶: <b id="ship-count-map">--</b></span>
          <span class="map-coords" id="map-coords">--</span>
        </div>
        <div class="map-legend">
          <span class="legend-item"><span class="legend-dot cargo"></span>货船</span>
          <span class="legend-item"><span class="legend-dot tanker"></span>油轮</span>
          <span class="legend-item"><span class="legend-dot fishing"></span>渔船</span>
          <span class="legend-item"><span class="legend-dot passenger"></span>客船</span>
          <span class="legend-item"><span class="legend-dot other"></span>其他</span>
        </div>

        <!-- Side Panel -->
        <aside class="side-panel" id="side-panel">
          <div class="panel active" id="panel-dashboard">
            <div class="panel-header">
              <h2>📊 实时仪表盘</h2>
              <span class="panel-badge live" id="stat-badge">LIVE</span>
            </div>
            <div class="panel-body">
              <div class="stats-grid">
                <div class="stat-card"><div class="stat-icon">🚢</div><div class="stat-value" id="stat-total-ships">--</div><div class="stat-label">监控船舶总数</div></div>
                <div class="stat-card"><div class="stat-icon">⚓</div><div class="stat-value" id="stat-at-port">--</div><div class="stat-label">靠泊中</div></div>
                <div class="stat-card"><div class="stat-icon">🌊</div><div class="stat-value" id="stat-underway">--</div><div class="stat-label">航行中</div></div>
                <div class="stat-card"><div class="stat-icon">📡</div><div class="stat-value" id="stat-data-source">--</div><div class="stat-label">数据来源</div></div>
              </div>
              <div class="chart-container"><h3>📈 船舶类型分布</h3><canvas id="chart-ship-types" height="140"></canvas></div>
              <div class="recent-list"><h3>🚢 最近活跃船舶</h3><div id="recent-ships-list"></div></div>
            </div>
          </div>

          <div class="panel" id="panel-search">
            <div class="panel-header">
              <h2>🔍 船舶搜索</h2>
              <span class="panel-badge live">SEARCH</span>
            </div>
            <div class="panel-body">
              <div class="search-box">
                <input id="search-input" placeholder="输入船名 / 呼号 / MMSI / IMO..." />
                <button class="btn-primary" id="btn-search">搜索</button>
              </div>
              <div class="search-filters">
                <label>结果数</label>
                <select id="search-max">
                  <option value="5">5</option>
                  <option value="10" selected>10</option>
                  <option value="20">20</option>
                </select>
              </div>
              <div id="search-results"></div>
            </div>
          </div>

          <div class="panel" id="panel-route">
            <div class="panel-header">
              <h2>🗺️ 航线规划</h2>
              <span class="panel-badge live">ROUTE</span>
            </div>
            <div class="panel-body">
              <div class="route-type-select">
                <button class="route-type-btn active" data-type="points">📍 点到点</button>
                <button class="route-type-btn" data-type="eta">⏱️ ETA查询</button>
              </div>
              <div id="route-inputs-points">
                <div class="input-group"><label>起点纬度</label><input id="route-lat1" type="number" step="0.01" value="31.23" /></div>
                <div class="input-group"><label>起点经度</label><input id="route-lng1" type="number" step="0.01" value="121.47" /></div>
                <div class="input-group"><label>终点纬度</label><input id="route-lat2" type="number" step="0.01" value="1.35" /></div>
                <div class="input-group"><label>终点经度</label><input id="route-lng2" type="number" step="0.01" value="103.82" /></div>
              </div>
              <button class="btn-primary" id="btn-route" style="width:100%">🚀 规划航线</button>
              <div class="route-result" id="route-result"></div>
            </div>
          </div>

          <div class="panel" id="panel-weather">
            <div class="panel-header">
              <h2>🌊 气象天气</h2>
              <span class="panel-badge live">WEATHER</span>
            </div>
            <div class="panel-body">
              <div class="weather-type-select">
                <button class="weather-type-btn active" data-type="point">🌡️ 点位气象</button>
                <button class="weather-type-btn" data-type="typhoon">🌀 台风</button>
                <button class="weather-type-btn" data-type="tide">🌊 港口潮汐</button>
              </div>
              <div id="weather-inputs-point">
                <div class="input-group"><label>纬度</label><input id="weather-lat" type="number" step="0.01" value="31.23" /></div>
                <div class="input-group"><label>经度</label><input id="weather-lng" type="number" step="0.01" value="121.47" /></div>
              </div>
              <button class="btn-primary" id="btn-weather" style="width:100%">🌤️ 查询</button>
              <div class="weather-result" id="weather-result"></div>
            </div>
          </div>

          <div class="panel" id="panel-port">
            <div class="panel-header">
              <h2>⚓ 港口查询</h2>
              <span class="panel-badge live">PORT</span>
            </div>
            <div class="panel-body">
              <div class="search-box">
                <input id="port-search-input" placeholder="输入港口名称，如：上海" />
                <button class="btn-primary" id="btn-port-search">查询</button>
              </div>
              <div id="port-results"></div>
              <div class="port-actions" id="port-actions" style="display:none">
                <button class="btn-secondary port-action-btn" data-action="berthed">⚓ 靠泊</button>
                <button class="btn-secondary port-action-btn" data-action="anchored">⛓️ 锚泊</button>
                <button class="btn-secondary port-action-btn" data-action="expected">📅 预抵</button>
              </div>
              <div class="port-detail" id="port-detail"></div>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <!-- Ship Detail Modal -->
    <div class="modal" id="ship-modal">
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <button class="modal-close" onclick="App.closeShipModal()">×</button>
        <div class="modal-body" id="ship-detail-content"></div>
      </div>
    </div>

    <!-- Settings Modal -->
    <div class="modal modal-sm" id="settings-modal">
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <button class="modal-close" onclick="App.closeSettingsModal()">×</button>
        <div class="modal-body">
          <h2 style="margin-bottom:14px">⚙️ 设置</h2>
          <div class="settings-form">
            <div class="input-group">
              <label>刷新间隔（秒）</label>
              <input id="settings-refresh" type="number" min="10" max="600" value="60" />
            </div>
            <small>数据源：船讯网 API（Key 已在网站后台配置，无需在此填写）</small>
            <button class="btn-primary" id="btn-save-settings" style="width:100%;margin-top:10px">保存设置</button>
            <p class="settings-note">快捷键：Ctrl+1~5 切换面板，Ctrl+K 聚焦搜索</p>
          </div>
        </div>
      </div>
    </div>

    <div class="toast-container" id="toast-container"></div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import '../styles/shipxy-dashboard.css'
import ShipXYAPI from '../utils/shipxyApi'
import Map2D from '../utils/shipxyMap2d'
import Globe, { loadThree } from '../utils/shipxyGlobe'

const $ = (s) => document.querySelector(s)
const $$ = (s) => document.querySelectorAll(s)

// State
let currentView = 'map'
let currentPanel = 'dashboard'
let currentShips = []
let shipMarkersData = new Map()
let refreshTimer = null
let refreshSecs = 60
let timeTimer = null
let globeModule = null
let currentPortCode = null

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('脚本加载失败'))
    document.head.appendChild(s)
  })
}

function loadCss(href) {
  return new Promise((resolve) => {
    const l = document.createElement('link')
    l.rel = 'stylesheet'
    l.href = href
    l.onload = () => resolve()
    l.onerror = () => resolve()
    document.head.appendChild(l)
  })
}

async function ensureLibs() {
  if (!window.L) {
    await loadCss('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css')
    await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js')
  }
  if (!window.Chart) {
    await loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js')
  }
}

async function init() {
  await ensureLibs()
  setupNav()
  setupViewToggle()
  setupModals()
  setupTime()
  setupSettings()
  setupSearch()
  setupRoute()
  setupWeather()
  setupPort()

  Map2D.init('map-container')
  Map2D.setOnShipClick(handleShipClick2D)
  updateMapCoords()

  await loadData()
  startRefresh()

  setTimeout(() => $('#loading-screen')?.classList.add('hidden'), 600)
}

// ===== View toggle =====
function setupViewToggle() {
  $$('.view-btn').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)))
}

function switchView(view) {
  currentView = view
  $$('.view-btn').forEach(b => b.classList.remove('active'))
  $(`.view-btn[data-view="${view}"]`)?.classList.add('active')
  $('#globe-container').style.display = view === 'globe' ? 'block' : 'none'
  $('#map-container').style.display = view === 'map' ? 'block' : 'none'
  if (view === 'globe') { initGlobe(); updateGlobeMarkers() }
  else { Map2D.resize(); updateMapMarkers() }
}

async function initGlobe() {
  if (globeModule) return
  try {
    await loadThree()
    globeModule = Globe
    globeModule.init($('#globe-container'), $('#globe-canvas'))
    globeModule.setOnShipClick((mmsi) => {
      const ship = shipMarkersData.get(String(mmsi))
      if (ship) openShipDetail(ship)
    })
  } catch (e) {
    console.warn('3D地球加载失败:', e.message)
    showToast('3D地球加载失败', 'warning')
    switchView('map')
  }
}

// ===== Nav =====
function setupNav() {
  $('#nav-tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.nav-tab')
    if (!tab) return
    const panel = tab.dataset.panel
    $$('.nav-tab').forEach(t => t.classList.remove('active'))
    tab.classList.add('active')
    $$('.panel').forEach(p => p.classList.remove('active'))
    const p = $(`#panel-${panel}`)
    if (p) p.classList.add('active')
    currentPanel = panel
    if (panel === 'dashboard') loadData()
  })
  $('#btn-panel-toggle').addEventListener('click', () => {
    $('#side-panel').classList.toggle('mobile-open')
  })
}

// ===== Time =====
function setupTime() {
  const update = () => {
    const n = new Date()
    const utc = n.toISOString().replace('T', ' ').slice(0, 19)
    const bjt = new Date(n.getTime() + 8 * 3600000).toISOString().replace('T', ' ').slice(0, 19)
    const el = $('#time-display')
    if (el) el.innerHTML = `UTC ${utc.slice(11, 19)}<br><span style="color:var(--accent);font-size:10px">BJT ${bjt.slice(11, 19)}</span>`
  }
  update()
  timeTimer = setInterval(update, 1000)
}

// ===== Modals =====
function setupModals() {
  $$('.modal-backdrop, .modal-close').forEach(el => el.addEventListener('click', () => el.closest('.modal')?.classList.remove('show')))
  $('#btn-settings').addEventListener('click', () => $('#settings-modal').classList.add('show'))
  $('#btn-fullscreen').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen().catch(() => {})
  })
}

function showToast(msg, type = 'info') {
  const t = document.createElement('div')
  t.className = `toast ${type}`
  t.textContent = msg
  $('#toast-container').appendChild(t)
  setTimeout(() => {
    t.style.opacity = '0'
    t.style.transform = 'translateX(100%)'
    t.style.transition = '0.3s'
    setTimeout(() => t.remove(), 300)
  }, 3000)
}

// ===== Data =====
async function loadData() {
  try {
    const result = await ShipXYAPI.dashboardData()
    let ships = []
    let isRealData = false

    if (!result.error && result.data) {
      ships = Array.isArray(result.data) ? result.data : []
      isRealData = true
    }

    updateAPIStatus(isRealData, ships.length === 0 ? '无数据' : undefined)
    currentShips = ships
    shipMarkersData.clear()
    ships.forEach(s => shipMarkersData.set(String(s.mmsi), s))

    const total = ships.length
    const atPort = ships.filter(s => s.navistat === 5).length
    const underway = ships.filter(s => s.navistat === 0).length
    const srcs = [...new Set(ships.map(s => s.data_source))]
    const src = srcs.length === 0 ? '--' : srcs.every(s => s === 0) ? 'AIS岸基' : srcs.every(s => s === 1) ? 'AIS卫星' : '岸基+卫星'

    const elTotal = $('#stat-total-ships'); if (elTotal) elTotal.textContent = total || '--'
    const elPort = $('#stat-at-port'); if (elPort) elPort.textContent = atPort || '--'
    const elUw = $('#stat-underway'); if (elUw) elUw.textContent = underway || '--'
    const elSrc = $('#stat-data-source'); if (elSrc) elSrc.textContent = src
    const elMap = $('#ship-count-map'); if (elMap) elMap.textContent = total
    const elGlobe = $('#ship-count-globe'); if (elGlobe) elGlobe.textContent = total

    updateChart(ships)
    updateRecentList(ships.slice(0, 8))
    if (currentView === 'map') { Map2D.resize(); updateMapMarkers() }
    else updateGlobeMarkers()

    if (total > 0 && currentView === 'map') Map2D.fitAllMarkers()
  } catch (e) {
    console.error('加载失败:', e)
    updateAPIStatus(false, e.message)
  }
}

function updateAPIStatus(online, msg) {
  const el = $('#api-status')
  if (!el) return
  el.textContent = online ? '🟢' : '🟡'
  el.title = online ? 'API在线 - 真实数据' : ('API离线 - ' + (msg || '使用演示数据'))
}

// ===== Chart =====
function updateChart(ships) {
  const c = $('#chart-ship-types')
  if (!c) return
  if (c._chart) { c._chart.destroy(); c._chart = null }
  if (!window.Chart) return
  const types = {}
  ships.forEach(s => { const t = s.ship_type || 0; types[t] = (types[t] || 0) + 1 })
  const names = { 30: '渔船', 60: '客船', 70: '货船', 80: '油轮', 90: '其他' }
  const colors = { 30: '#10b981', 60: '#8b5cf6', 70: '#00d4ff', 80: '#f59e0b', 90: '#94a3b8' }
  const keys = Object.keys(types)
  if (keys.length === 0) return
  c._chart = new Chart(c, {
    type: 'doughnut',
    data: {
      labels: keys.map(t => names[t] || t),
      datasets: [{ data: keys.map(t => types[t]), backgroundColor: keys.map(t => colors[t] || '#94a3b8'), borderColor: '#111827', borderWidth: 2 }]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 10, font: { size: 10 }, usePointStyle: true } } } }
  })
}

function updateRecentList(ships) {
  const el = $('#recent-ships-list')
  if (!el) return
  el.innerHTML = ships.map(s => `
    <div class="recent-ship-item" onclick="App.showShip(${s.mmsi})">
      <div class="ship-item-icon">🚢</div>
      <div class="ship-item-info">
        <div class="ship-item-name">${s.ship_name || s.ship_cnname || 'Unknown'}</div>
        <div class="ship-item-meta">MMSI:${s.mmsi} | ${s.sog != null && s.sog !== -1 ? s.sog.toFixed(1) + '节' : '--'}</div>
      </div>
      <div class="ship-item-status">${s.navistat === 5 ? '靠泊' : s.navistat === 0 ? '航行' : '锚泊'}</div>
    </div>`).join('')
}

// ===== Markers =====
function updateMapMarkers() {
  Map2D.clearAllMarkers()
  shipMarkersData.forEach((ship, id) => {
    if (ship.lat && ship.lng) Map2D.addShipMarker(id, ship.lat, ship.lng, ship)
  })
}

function updateGlobeMarkers() {
  if (!globeModule) return
  globeModule.clearAllMarkers()
  shipMarkersData.forEach((ship, id) => {
    if (ship.lat && ship.lng) globeModule.addShipMarker(id, ship.lat, ship.lng, ship.ship_type || 70)
  })
}

function handleShipClick2D(id, shipData) {
  openShipDetail(shipData)
}

function updateMapCoords() {
  setTimeout(() => {
    const m = Map2D.getMap()
    if (!m) return
    m.on('mousemove', e => {
      const el = $('#map-coords')
      if (el) el.textContent = `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`
    })
  }, 1500)
}

// ===== Ship detail =====
function openShipDetail(ship) {
  const navi = { '-1': '无效', 0: '航行中', 1: '锚泊', 5: '靠泊' }
  $('#ship-detail-content').innerHTML = `
    <div class="ship-detail-header">
      <div class="ship-detail-avatar">🚢</div>
      <div class="ship-detail-title">
        <h2>${ship.ship_name || '未知'}</h2>
        <p>${ship.ship_cnname || ''} | MMSI:${ship.mmsi} | IMO:${ship.imo || '--'}</p>
      </div>
    </div>
    <div class="detail-grid">
      <div class="detail-item"><div class="label">纬度</div><div class="value highlight">${ship.lat != null ? ship.lat.toFixed(4) : '--'}</div></div>
      <div class="detail-item"><div class="label">经度</div><div class="value highlight">${ship.lng != null ? ship.lng.toFixed(4) : '--'}</div></div>
      <div class="detail-item"><div class="label">航速</div><div class="value">${ship.sog === -1 ? '无效' : (ship.sog != null ? ship.sog.toFixed(1) + ' 节' : '--')}</div></div>
      <div class="detail-item"><div class="label">航向</div><div class="value">${ship.cog === -1 ? '无效' : (ship.cog != null ? ship.cog.toFixed(1) + '°' : '--')}</div></div>
      <div class="detail-item"><div class="label">状态</div><div class="value">${navi[ship.navistat] || '未知'}</div></div>
      <div class="detail-item"><div class="label">目的地</div><div class="value">${ship.dest || '--'}</div></div>
      <div class="detail-item"><div class="label">船长/宽</div><div class="value">${ship.length || '--'}m / ${ship.width || '--'}m</div></div>
      <div class="detail-item"><div class="label">吃水</div><div class="value">${ship.draught != null ? ship.draught.toFixed(1) : '--'} m</div></div>
      <div class="detail-item"><div class="label">呼号</div><div class="value">${ship.call_sign || '--'}</div></div>
      <div class="detail-item"><div class="label">数据源</div><div class="value">${ship.data_source === 0 ? 'AIS岸基' : 'AIS卫星'}</div></div>
      <div class="detail-item"><div class="label">更新</div><div class="value" style="font-size:11px">${ship.last_time || '--'}</div></div>
      <div class="detail-item"><div class="label">ETA</div><div class="value" style="font-size:11px">${ship.eta || '--'}</div></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn-primary" onclick="App.showOnMap(${ship.lat ?? 0},${ship.lng ?? 0})">📍 地图定位</button>
      <button class="btn-secondary" onclick="App.showOnGlobe(${ship.lat ?? 0},${ship.lng ?? 0})">🌍 地球定位</button>
      <button class="btn-secondary" onclick="App.trackShip(${ship.mmsi})">📈 历史轨迹</button>
      <button class="btn-secondary" onclick="App.nearbyShips(${ship.mmsi})">🔍 周边船舶</button>
    </div>`
  $('#ship-modal').classList.add('show')
}

// ===== Search =====
function setupSearch() {
  $('#btn-search').addEventListener('click', doSearch)
  $('#search-input').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch() })
}

async function doSearch() {
  const kw = $('#search-input').value.trim()
  if (!kw) return showToast('请输入关键字', 'warning')
  const el = $('#search-results')
  el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">🔍 搜索中...</div>'
  const r = await ShipXYAPI.searchShip(kw, parseInt($('#search-max').value) || 10)
  if (r.error) { el.innerHTML = `<div style="color:var(--accent-red);text-align:center;padding:20px">❌ ${r.msg || '搜索失败'}</div>`; return }
  const ships = r.data || []
  if (!ships.length) { el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">未找到</div>'; return }
  const labels = { 1: '船名', 2: '呼号', 3: 'MMSI', 5: 'IMO' }
  el.innerHTML = ships.map(s => `
    <div class="search-result-item" onclick="App.showShip(${s.mmsi})">
      <div class="ship-header">
        <div><div class="ship-name">${s.ship_name || '未知'}</div><div class="ship-cnname">${s.ship_cnname || ''}</div></div>
        <span class="match-type">${labels[s.match_type] || '匹配'}</span>
      </div>
      <div class="ship-details">
        <div><span class="detail-label">MMSI:</span>${s.mmsi}</div>
        <div><span class="detail-label">IMO:</span>${s.imo || '--'}</div>
        <div><span class="detail-label">呼号:</span>${s.call_sign || '--'}</div>
        <div><span class="detail-label">更新:</span>${s.last_time || '--'}</div>
      </div>
    </div>`).join('')
}

// ===== Route =====
function setupRoute() {
  $$('.route-type-btn').forEach(b => b.addEventListener('click', () => {
    $$('.route-type-btn').forEach(x => x.classList.remove('active'))
    b.classList.add('active')
  }))
  $('#btn-route').addEventListener('click', planRoute)
}

async function planRoute() {
  const type = $('.route-type-btn.active')?.dataset.type || 'points'
  const el = $('#route-result')
  if (type === 'points') {
    const l1 = parseFloat($('#route-lat1').value) || 31.23
    const g1 = parseFloat($('#route-lng1').value) || 121.47
    const l2 = parseFloat($('#route-lat2').value) || 1.35
    const g2 = parseFloat($('#route-lng2').value) || 103.82
    el.innerHTML = '<div style="text-align:center;padding:20px">🗺️ 规划中...</div>'
    const r = await ShipXYAPI.routeByPoints(l1, g1, l2, g2)
    if (r.error) { el.innerHTML = '<div style="color:var(--accent-red)">❌ 失败</div>'; return }
    const d = r.data
    el.innerHTML = `<div class="chart-container"><h3>📏 航线结果</h3><div style="text-align:center;margin:10px 0"><span style="font-size:26px;font-weight:700;color:var(--accent)">${d.distance_nm?.toFixed(0) || '--'}</span> <span style="color:var(--text-muted);font-size:12px">海里</span></div></div>`
    if (currentView === 'map') Map2D.addRoute(d.waypoints || [], '#00d4ff')
    else if (globeModule) { globeModule.clearRoutes(); globeModule.addRouteLine(d.waypoints || [], 0x00d4ff); globeModule.focusOnLocation((l1 + l2) / 2, (g1 + g2) / 2, 4) }
  } else {
    el.innerHTML = '<div style="text-align:center;padding:20px">📡 查询ETA...</div>'
    const r = await ShipXYAPI.getETA(477172700, 'CNSHA')
    if (!r.error) {
      const e = r.data
      el.innerHTML = `<div class="chart-container"><h3>⏱️ ETA</h3><div class="detail-grid"><div class="detail-item"><div class="label">预计到达</div><div class="value highlight">${e.eta || '--'}</div></div><div class="detail-item"><div class="label">剩余距离</div><div class="value">${e.distance_remaining?.toFixed(0) || '--'} 海里</div></div><div class="detail-item"><div class="label">平均航速</div><div class="value">${e.avg_speed || '--'} 节</div></div><div class="detail-item"><div class="label">预计时间</div><div class="value">${e.time_remaining_hours || '--'} 小时</div></div></div></div>`
    }
  }
}

// ===== Weather =====
function setupWeather() {
  $$('.weather-type-btn').forEach(b => b.addEventListener('click', () => {
    $$('.weather-type-btn').forEach(x => x.classList.remove('active'))
    b.classList.add('active')
  }))
  $('#btn-weather').addEventListener('click', queryWeather)
}

async function queryWeather() {
  const type = $('.weather-type-btn.active')?.dataset.type || 'point'
  const el = $('#weather-result')
  if (type === 'point') {
    const lat = parseFloat($('#weather-lat').value) || 31.23
    const lng = parseFloat($('#weather-lng').value) || 121.47
    el.innerHTML = '<div style="text-align:center;padding:20px">🌊 查询中...</div>'
    const r = await ShipXYAPI.getPointWeather(lat, lng)
    if (r.error) { el.innerHTML = '<div style="color:var(--accent-red)">❌ 失败</div>'; return }
    const w = r.data
    el.innerHTML = `<div class="chart-container"><h3>🌡️ 气象 (${w.lat?.toFixed(2)},${w.lng?.toFixed(2)})</h3><div class="detail-grid">
      <div class="detail-item"><div class="label">温度</div><div class="value highlight">${w.temperature?.toFixed(1) || '--'}°C</div></div>
      <div class="detail-item"><div class="label">湿度</div><div class="value">${w.humidity?.toFixed(0) || '--'}%</div></div>
      <div class="detail-item"><div class="label">风速</div><div class="value">${w.wind_speed?.toFixed(1) || '--'} m/s</div></div>
      <div class="detail-item"><div class="label">风向</div><div class="value">${w.wind_direction?.toFixed(0) || '--'}°</div></div>
      <div class="detail-item"><div class="label">浪高</div><div class="value">${w.wave_height?.toFixed(1) || '--'} m</div></div>
      <div class="detail-item"><div class="label">能见度</div><div class="value">${w.visibility?.toFixed(1) || '--'} km</div></div>
      <div class="detail-item"><div class="label">气压</div><div class="value">${w.pressure?.toFixed(0) || '--'} hPa</div></div>
      <div class="detail-item"><div class="label">涌浪</div><div class="value">${w.swell_height?.toFixed(1) || '--'} m</div></div>
    </div></div>`
  } else if (type === 'typhoon') {
    el.innerHTML = '<div style="text-align:center;padding:20px">🌀 查询中...</div>'
    const r = await ShipXYAPI.getTyphoons()
    if (!r.error && r.data?.[0]) {
      const t = r.data[0]
      el.innerHTML = `<div class="chart-container"><h3>🌀 ${t.cn_name || t.name}</h3><div class="detail-grid">
        <div class="detail-item"><div class="label">风级</div><div class="value highlight">${t.level} 级</div></div>
        <div class="detail-item"><div class="label">风速</div><div class="value">${t.wind_speed} m/s</div></div>
        <div class="detail-item"><div class="label">气压</div><div class="value">${t.pressure} hPa</div></div>
        <div class="detail-item"><div class="label">位置</div><div class="value">${t.lat?.toFixed(1)},${t.lng?.toFixed(1)}</div></div>
      </div></div>`
      if (currentView === 'map') Map2D.addRoute(t.forecast || [], '#ef4444')
    }
  } else {
    const r = await ShipXYAPI.getGlobalPortTide('CNSHA')
    if (!r.error) {
      const tides = r.data.tides || []
      el.innerHTML = `<div class="chart-container"><h3>🌊 ${r.data.port_cnname || '上海港'} 潮汐</h3><canvas id="tide-chart" height="140"></canvas></div>`
      setTimeout(() => {
        const tc = $('#tide-chart')
        if (tc && window.Chart) {
          new Chart(tc, {
            type: 'line',
            data: {
              labels: tides.map(t => t.time),
              datasets: [{ label: '潮汐(m)', data: tides.map(t => t.height?.toFixed(2)), borderColor: '#00d4ff', backgroundColor: 'rgba(0,212,255,0.1)', fill: true, tension: 0.4, pointRadius: 0 }]
            },
            options: {
              responsive: true,
              scales: {
                x: { ticks: { color: '#64748b', font: { size: 9 } }, grid: { color: '#1e3a5f' } },
                y: { ticks: { color: '#64748b' }, grid: { color: '#1e3a5f' } }
              },
              plugins: { legend: { labels: { color: '#94a3b8', font: { size: 10 } } } }
            }
          })
        }
      }, 100)
    }
  }
}

// ===== Port =====
function setupPort() {
  $('#btn-port-search').addEventListener('click', searchPort)
  $('#port-search-input').addEventListener('keydown', e => { if (e.key === 'Enter') searchPort() })
  $$('.port-action-btn').forEach(b => b.addEventListener('click', () => loadPortShips(b.dataset.action)))
}

async function searchPort() {
  const kw = $('#port-search-input').value.trim()
  if (!kw) return showToast('请输入港口名称', 'warning')
  const r = await ShipXYAPI.searchPort(kw)
  if (r.error || !r.data?.length) { $('#port-results').innerHTML = '<div style="color:var(--accent-red)">未找到港口</div>'; return }
  const p = r.data[0]
  currentPortCode = p.port_code
  $('#port-results').innerHTML = `<div class="chart-container"><h3>⚓ ${p.port_cnname || p.port_name}</h3><div class="detail-grid">
    <div class="detail-item"><div class="label">代码</div><div class="value highlight">${p.port_code}</div></div>
    <div class="detail-item"><div class="label">国家</div><div class="value">${p.country_cn || p.country}</div></div>
    <div class="detail-item"><div class="label">时区</div><div class="value">${p.timezone || '--'}</div></div>
    <div class="detail-item"><div class="label">EN</div><div class="value">${p.port_name}</div></div>
  </div></div>`
  $('#port-actions').style.display = 'flex'
}

async function loadPortShips(type) {
  const el = $('#port-detail')
  el.innerHTML = '<div style="text-align:center;padding:10px">⏳ 加载中...</div>'
  let r
  const labels = { berthed: '靠泊', anchored: '锚泊', expected: '预抵' }
  if (type === 'berthed') r = await ShipXYAPI.getPortBerthedShips(currentPortCode)
  else if (type === 'anchored') r = await ShipXYAPI.getPortAnchoredShips(currentPortCode)
  else r = await ShipXYAPI.getPortExpectedShips(currentPortCode)
  if (r.error) { el.innerHTML = '<div style="color:var(--accent-red)">❌ 失败</div>'; return }
  const ships = r.data || []
  el.innerHTML = `<div class="chart-container"><h3>🚢 ${labels[type]}船舶 (${ships.length}艘)</h3>${ships.slice(0, 10).map(s => `
    <div class="recent-ship-item" onclick="App.showShip(${s.mmsi})">
      <div class="ship-item-icon">🚢</div>
      <div class="ship-item-info">
        <div class="ship-item-name">${s.ship_name || 'Unknown'}</div>
        <div class="ship-item-meta">MMSI:${s.mmsi} | ${s.length || '--'}m×${s.width || '--'}m</div>
      </div>
    </div>`).join('')}${ships.length > 10 ? `<div style="color:var(--text-muted);text-align:center;padding:8px">还有${ships.length - 10}艘...</div>` : ''}</div>`
}

// ===== Settings =====
function setupSettings() {
  $('#btn-save-settings').addEventListener('click', () => {
    refreshSecs = parseInt($('#settings-refresh').value) || 60
    $('#settings-modal').classList.remove('show')
    startRefresh()
    showToast('✅ 设置已保存，重新加载数据...', 'success')
    loadData()
  })
}

function startRefresh() {
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = setInterval(() => { if (currentPanel === 'dashboard') loadData() }, refreshSecs * 1000)
}

// ===== Global methods (used by inline onclick) =====
window.App = {
  showShip: async (mmsi) => {
    const r = await ShipXYAPI.getSingleShip(mmsi)
    if (!r.error && r.data) {
      openShipDetail(r.data)
      if (currentView === 'map') Map2D.focusOnLocation(r.data.lat, r.data.lng, 10)
      else if (globeModule) globeModule.focusOnLocation(r.data.lat, r.data.lng, 2)
    } else {
      const local = shipMarkersData.get(String(mmsi))
      if (local) openShipDetail(local)
      else showToast('无法获取详情', 'error')
    }
  },
  showOnMap: (lat, lng) => { switchView('map'); Map2D.focusOnLocation(lat, lng, 10) },
  showOnGlobe: (lat, lng) => {
    switchView('globe')
    initGlobe().then(() => globeModule?.focusOnLocation(lat, lng, 2))
  },
  trackShip: async (mmsi) => {
    const r = await ShipXYAPI.getShipTrack(mmsi)
    if (!r.error && r.data) {
      if (currentView === 'map') Map2D.addRoute(r.data, '#10b981')
      else {
        switchView('globe')
        await initGlobe()
        globeModule?.clearRoutes()
        globeModule?.addRouteLine(r.data, 0x10b981)
        if (r.data[0]) globeModule?.focusOnLocation(r.data[0].lat, r.data[0].lng, 3)
      }
      showToast('✅ 轨迹已加载', 'success')
    } else {
      showToast('轨迹获取失败', 'error')
    }
  },
  nearbyShips: async (mmsi) => {
    const r = await ShipXYAPI.getNearbyShip(mmsi)
    if (!r.error && r.data) {
      shipMarkersData.clear()
      r.data.forEach(s => shipMarkersData.set(String(s.mmsi), s))
      if (currentView === 'map') updateMapMarkers()
      else updateGlobeMarkers()
      Map2D.fitAllMarkers()
      showToast(`✅ 显示${r.data.length}艘周边船舶`, 'success')
    } else {
      showToast('周边船舶获取失败', 'error')
    }
  },
  closeShipModal: () => $('#ship-modal').classList.remove('show'),
  closeSettingsModal: () => $('#settings-modal').classList.remove('show')
}

// ===== Keyboard shortcuts =====
const handleKeydown = (e) => {
  if (e.ctrlKey) {
    const map = { 1: 'dashboard', 2: 'search', 3: 'route', 4: 'weather', 5: 'port' }
    const panel = map[e.key]
    if (panel) {
      e.preventDefault()
      $$('.nav-tab').forEach(t => t.classList.remove('active'))
      const tab = $(`.nav-tab[data-panel="${panel}"]`)
      if (tab) tab.classList.add('active')
      $$('.panel').forEach(p => p.classList.remove('active'))
      const p = $(`#panel-${panel}`)
      if (p) p.classList.add('active')
      currentPanel = panel
    }
    if (e.key === 'k') { e.preventDefault(); $('#search-input')?.focus() }
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  init()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  if (refreshTimer) clearInterval(refreshTimer)
  if (timeTimer) clearInterval(timeTimer)
  if (globeModule) globeModule.dispose()
  Map2D.destroy()
  if (window.App) delete window.App
})
</script>

<style>
/* Dashboard styles are imported from src/styles/shipxy-dashboard.css */
</style>