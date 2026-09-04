<template>
  <div class="admin-ships">
    <div class="page-header">
      <h1>🚢 船舶追踪管理</h1>
      <p class="page-desc">添加需要在前台展示的船舶，支持按船名 / IMO / MMSI 搜索，可自定义排序。</p>
    </div>

    <!-- API Settings -->
    <div class="api-section">
      <div class="api-header">
        <h3>🔑 API 配置</h3>
        <span class="api-badge" :class="apiStatus.aisstream_connected ? 'badge-on' : 'badge-off'">
          {{ apiStatus.aisstream_connected ? '实时连接中 (' + apiStatus.tracked_count + ' 艘)' : '未连接' }}
        </span>
      </div>
      <p class="hint">
        <b>SHIPXY_API_KEY 是主数据源</b>（船讯网，国内直连，搜索+实时位置，在 <a href="https://api.shipxy.com/v3/console/overview" target="_blank" rel="noopener">船讯网控制台</a> 注册申请）；AISSTREAM_API_KEY（aisstream.io）和 VESSEL_API_KEY（vesselapi.com）为可选备用源。均不配置时前台使用演示数据。
      </p>

      <div class="api-row">
        <label class="api-label">SHIPXY_API_KEY <span class="api-role pri">主数据源</span></label>
        <div class="api-input-row">
          <input
            :type="showShipxy ? 'text' : 'password'"
            v-model="shipxyKey"
            :placeholder="apiSettings.shipxy_api_key_configured ? apiSettings.shipxy_api_key_display + '（已配置，留空则保持不变）' : '输入船讯网 API Key'"
            class="api-input"
          />
          <button class="api-toggle" @click="showShipxy = !showShipxy">{{ showShipxy ? '隐藏' : '显示' }}</button>
          <button v-if="apiSettings.shipxy_api_key_configured" class="api-clear" @click="clearShipxy = true; shipxyKey = ''">清除</button>
        </div>
      </div>

      <div class="api-row">
        <label class="api-label">AISSTREAM_API_KEY <span class="api-role">备用实时源</span></label>
        <div class="api-input-row">
          <input
            :type="showAis ? 'text' : 'password'"
            v-model="aisKey"
            :placeholder="apiSettings.aisstream_api_key_configured ? apiSettings.aisstream_api_key_display + '（已配置，留空则保持不变）' : '输入 aisstream.io API Key（可选）'"
            class="api-input"
          />
          <button class="api-toggle" @click="showAis = !showAis">{{ showAis ? '隐藏' : '显示' }}</button>
          <button v-if="apiSettings.aisstream_api_key_configured" class="api-clear" @click="clearAis = true; aisKey = ''">清除</button>
        </div>
      </div>

      <div class="api-row">
        <label class="api-label">VESSEL_API_KEY <span class="api-role">船舶搜索</span></label>
        <div class="api-input-row">
          <input
            :type="showVessel ? 'text' : 'password'"
            v-model="vesselKey"
            :placeholder="apiSettings.vessel_api_key_configured ? apiSettings.vessel_api_key_display + '（已配置，留空则保持不变）' : '输入 vesselapi.com API Key'"
            class="api-input"
          />
          <button class="api-toggle" @click="showVessel = !showVessel">{{ showVessel ? '隐藏' : '显示' }}</button>
          <button v-if="apiSettings.vessel_api_key_configured" class="api-clear" @click="clearVessel = true; vesselKey = ''">清除</button>
        </div>
      </div>

      <div class="api-actions">
        <button class="btn-save" @click="saveApiSettings" :disabled="savingApi">
          {{ savingApi ? '保存中...' : '保存 API 配置' }}
        </button>
        <button class="btn-test" @click="testConnection" :disabled="testingConn">
          {{ testingConn ? '测试中...' : '🔍 测试连接' }}
        </button>
        <span class="api-note">保存后实时连接约 5 秒内自动生效，无需重启服务</span>
      </div>
      <div v-if="testResults.length" class="test-results" :class="{ fail: !testOverall }">
        <div v-for="(r, i) in testResults" :key="i" class="test-row">
          <span class="test-icon">{{ r.ok ? '✅' : '❌' }}</span>
          <b>{{ r.step }}</b>: {{ r.detail }}
        </div>
        <div class="test-summary" :class="testOverall ? 'ok' : 'bad'">
          {{ testOverall ? '✅ 连接正常，船舶数据应能实时推送' : '❌ 连接异常，见上方步骤' }}
        </div>
      </div>
      <div v-if="apiStatus.shipxy_key_configured" class="api-diag">
        <div v-if="apiStatus.shipxy_last_poll">🟢 船讯网数据轮询正常（最近: {{ formatDiagTime(apiStatus.shipxy_last_poll) }}，{{ apiStatus.shipxy_last_poll_count ?? 0 }} 艘）</div>
        <div v-else-if="apiStatus.shipxy_last_error">⚠️ 船讯网请求错误 ({{ formatDiagTime(apiStatus.shipxy_last_error.at) }}): <b>{{ apiStatus.shipxy_last_error.message }}</b></div>
        <div v-else>⏳ 等待首次轮询（最多 30 秒）...</div>
      </div>
      <div v-if="apiStatus.last_error || apiStatus.last_close || apiStatus.opened_at" class="api-diag">
        <div v-if="apiStatus.opened_at">🟢 最近连接成功: {{ formatDiagTime(apiStatus.opened_at) }}（已订阅 {{ apiStatus.last_subscribe_count ?? 0 }} 艘，收到消息 {{ apiStatus.messages_received ?? 0 }} 条）</div>
        <div v-if="apiStatus.subscribed_at">✅ 订阅确认: {{ formatDiagTime(apiStatus.subscribed_at) }}</div>
        <div v-if="apiStatus.last_error">⚠️ 连接错误 ({{ formatDiagTime(apiStatus.last_error.at) }}): <b>{{ apiStatus.last_error.message }}</b></div>
        <div v-if="apiStatus.last_close">
          ⚠️ 连接断开 ({{ formatDiagTime(apiStatus.last_close.at) }}): 代码 {{ apiStatus.last_close.code }} {{ apiStatus.last_close.reason }}
          <span v-if="!apiStatus.last_close.confirmed && !apiStatus.subscribed_at" class="diag-warn">（未收到订阅确认就断开 → 通常是 Key 无效或复制了掩码 Key，请在 aisstream.io 的 Account 页面<b>重新生成</b>一个完整 Key）</span>
        </div>
        <div class="diag-hint">断开代码 4401 = API Key 无效；4404 = 订阅参数错误；4413 = 触发频率限制；1006 = 握手后无关闭帧断开（Key 无效/订阅非法/网络重置都可能是 1006）。点"测试连接"可定位到具体环节。</div>
      </div>
    </div>

    <!-- Search & Add -->
    <div class="add-section">
      <h3>添加船舶</h3>
      <div class="search-row">
        <input
          v-model="searchQuery"
          @input="onSearch"
          placeholder="输入船名 / IMO / MMSI，如：PACIFIC TALENT"
          class="search-input"
        />
        <button @click="onSearch" class="btn-search" :disabled="searching">
          {{ searching ? '搜索中...' : '搜索' }}
        </button>
      </div>

      <!-- Search Results -->
      <div v-if="searchResults.length > 0" class="search-results">
        <div
          v-for="item in searchResults"
          :key="item.name"
          class="result-item"
        >
          <div class="result-info">
            <span class="result-name">{{ item.name }}</span>
            <span class="result-symbol" v-if="item.imo">IMO {{ item.imo }}</span>
            <span class="result-symbol" v-if="item.mmsi">MMSI {{ item.mmsi }}</span>
            <span class="result-exchange">{{ item.type }}</span>
          </div>
          <button
            class="btn-add"
            :disabled="adding === item.name || isAdded(item)"
            @click="addShip(item)"
          >
            {{ isAdded(item) ? '✓ 已添加' : (adding === item.name ? '添加中...' : '+ 添加') }}
          </button>
        </div>
      </div>
      <div v-else-if="searchQuery && !searching" class="no-result">
        未找到匹配船舶。试试输入：PACIFIC TALENT、9712943、477900500 等
      </div>
    </div>

    <!-- Current Watchlist -->
    <div class="watchlist-section">
      <div class="watchlist-header">
        <h3>当前监控列表 <span class="count">({{ watchlist.length }})</span></h3>
        <p class="hint">拖拽可调整排序</p>
      </div>

      <div v-if="loadingList" class="loading-text">加载中...</div>
      <div v-else-if="watchlist.length === 0" class="empty-watchlist">
        还没有添加任何船舶，请在上方搜索并添加
      </div>

      <div v-else class="watchlist">
        <div
          v-for="(item, index) in watchlist"
          :key="item.id"
          class="watch-item"
          :class="{ dragging: dragIndex === index }"
          draggable="true"
          @dragstart="onDragStart(index)"
          @dragover.prevent="onDragOver(index)"
          @drop="onDrop(index)"
          @dragend="onDragEnd"
        >
          <div class="drag-handle">⠿</div>
          <div class="watch-info">
            <span class="watch-name">{{ item.name }}</span>
            <span class="watch-symbol" v-if="item.imo">IMO {{ item.imo }}</span>
            <span class="watch-symbol" v-if="item.mmsi">MMSI {{ item.mmsi }}</span>
          </div>
          <div class="watch-actions">
            <span class="sort-badge">#{{ index + 1 }}</span>
            <button class="btn-delete" @click="deleteShip(item)" :disabled="deleting === item.id">
              {{ deleting === item.id ? '删除中...' : '删除' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Success / Error Toast -->
    <div class="toast" v-if="toast.show" :class="toast.type">
      {{ toast.msg }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import api from '../../api'

const watchlist = ref([])
const searchQuery = ref('')
const searchResults = ref([])
const searching = ref(false)
const adding = ref(null)
const deleting = ref(null)
const loadingList = ref(true)
const toast = ref({ show: false, type: 'success', msg: '' })
let searchTimer = null
const dragIndex = ref(null)

const apiSettings = ref({ shipxy_api_key_configured: false, shipxy_api_key_display: '', aisstream_api_key_configured: false, aisstream_api_key_display: '', vessel_api_key_configured: false, vessel_api_key_display: '' })
const apiStatus = ref({ shipxy_key_configured: false, shipxy_last_poll: null, shipxy_last_poll_count: 0, shipxy_last_error: null, aisstream_connected: false, tracked_count: 0, connect_attempts: 0, opened_at: null, subscribed_at: null, last_subscribe_count: 0, messages_received: 0, last_error: null, last_close: null })
const testResults = ref([])
const testOverall = ref(false)
const testingConn = ref(false)
const shipxyKey = ref('')
const aisKey = ref('')
const vesselKey = ref('')
const showShipxy = ref(false)
const showAis = ref(false)
const showVessel = ref(false)
const clearShipxy = ref(false)
const clearAis = ref(false)
const clearVessel = ref(false)
const savingApi = ref(false)
let statusTimer = null

function showToast(msg, type = 'success') {
  toast.value = { show: true, type, msg }
  setTimeout(() => { toast.value.show = false }, 3000)
}

function formatDiagTime(iso) {
  if (!iso) return '--'
  const d = new Date(iso)
  return d.toLocaleString('zh-CN', { hour12: false })
}

async function testConnection() {
  testingConn.value = true
  testResults.value = []
  try {
    const r = await api.testShipConnection()
    testResults.value = r.steps || []
    testOverall.value = !!r.overall
  } catch (e) {
    testResults.value = [{ step: '请求失败', ok: false, detail: e.message }]
    testOverall.value = false
  } finally {
    testingConn.value = false
    refreshApiStatus()
  }
}

async function loadApiSettings() {
  try {
    apiSettings.value = await api.getShipSettings()
  } catch (e) { /* ignore */ }
}

async function refreshApiStatus() {
  try {
    apiStatus.value = await api.getShipStatus()
  } catch (e) { /* ignore */ }
}

async function saveApiSettings() {
  savingApi.value = true
  try {
    const payload = {}
    if (clearShipxy.value) payload.shipxy_api_key = ''
    else if (shipxyKey.value.trim()) payload.shipxy_api_key = shipxyKey.value.trim()
    if (clearAis.value) payload.aisstream_api_key = ''
    else if (aisKey.value.trim()) payload.aisstream_api_key = aisKey.value.trim()
    if (clearVessel.value) payload.vessel_api_key = ''
    else if (vesselKey.value.trim()) payload.vessel_api_key = vesselKey.value.trim()
    if (Object.keys(payload).length === 0) {
      showToast('没有需要保存的变更', 'error')
      return
    }
    await api.updateShipSettings(payload)
    shipxyKey.value = ''
    aisKey.value = ''
    vesselKey.value = ''
    clearShipxy.value = false
    clearAis.value = false
    clearVessel.value = false
    showToast('API 配置已保存')
    await loadApiSettings()
    setTimeout(refreshApiStatus, 5000)
  } catch (e) {
    showToast('保存失败: ' + e.message, 'error')
  } finally {
    savingApi.value = false
  }
}

function isAdded(item) {
  return watchlist.value.some(w =>
    w.name.toUpperCase() === String(item.name).toUpperCase() ||
    (item.imo && w.imo === item.imo) ||
    (item.mmsi && w.mmsi === item.mmsi)
  )
}

async function loadList() {
  loadingList.value = true
  try {
    watchlist.value = await api.getShipList()
  } catch (e) {
    showToast('加载失败: ' + e.message, 'error')
  } finally {
    loadingList.value = false
  }
}

function onSearch() {
  clearTimeout(searchTimer)
  if (!searchQuery.value.trim()) { searchResults.value = []; return }
  searching.value = true
  searchTimer = setTimeout(async () => {
    try {
      searchResults.value = await api.searchShips(searchQuery.value.trim())
    } catch (e) {
      searchResults.value = []
    } finally {
      searching.value = false
    }
  }, 300)
}

async function addShip(item) {
  adding.value = item.name
  try {
    await api.addShip({ name: item.name, imo: item.imo, mmsi: item.mmsi })
    await loadList()
    showToast(`已添加 ${item.name}`)
  } catch (e) {
    showToast(e.message || '添加失败', 'error')
  } finally {
    adding.value = null
  }
}

async function deleteShip(item) {
  if (!confirm(`确认删除 ${item.name}?`)) return
  deleting.value = item.id
  try {
    await api.deleteShip(item.id)
    await loadList()
    showToast(`已删除 ${item.name}`)
  } catch (e) {
    showToast('删除失败', 'error')
  } finally {
    deleting.value = null
  }
}

// ── Drag & Drop sort ──────────────────────────────────────────────────────
function onDragStart(index) { dragIndex.value = index }
function onDragOver(index) {
  if (dragIndex.value === null || dragIndex.value === index) return
  const list = [...watchlist.value]
  const item = list.splice(dragIndex.value, 1)[0]
  list.splice(index, 0, item)
  watchlist.value = list
  dragIndex.value = index
}
async function onDrop() {
  const items = watchlist.value.map((item, i) => ({ id: item.id, sort_order: i + 1 }))
  try {
    await api.reorderShips(items)
  } catch (e) {
    showToast('排序保存失败', 'error')
  }
}
function onDragEnd() { dragIndex.value = null }

onMounted(() => {
  loadList()
  loadApiSettings()
  refreshApiStatus()
  statusTimer = setInterval(refreshApiStatus, 30000)
})

onUnmounted(() => {
  if (statusTimer) clearInterval(statusTimer)
})
</script>

<style scoped>
.admin-ships { max-width: 860px; }

.page-header { margin-bottom: 24px; }
.page-header h1 { font-size: 24px; font-weight: 800; color: var(--text-primary); margin-bottom: 6px; }
.page-desc { color: var(--text-secondary); font-size: 14px; }

/* API Settings Section */
.api-section {
  background: #fff; border-radius: 12px;
  padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 24px;
  border: 1px solid #e0e7ff;
}
.api-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.api-header h3 { font-size: 16px; font-weight: 700; color: #1e293b; }
.api-badge { font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px; }
.badge-on { background: #dcfce7; color: #166534; }
.badge-off { background: #fee2e2; color: #b91c1c; }
.api-section .hint { font-size: 12px; color: #64748b; line-height: 1.7; margin-bottom: 16px; }
.api-section .hint a { color: #2563eb; }
.api-row { margin-bottom: 14px; }
.api-label { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }
.api-role { font-size: 10px; font-weight: 700; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; }
.api-role.pri { background: #fef3c7; color: #92400e; }
.api-input-row { display: flex; gap: 8px; }
.api-input {
  flex: 1; padding: 10px 14px; border: 2px solid #e2e8f0;
  border-radius: 8px; font-size: 14px; transition: border-color 0.2s;
  outline: none;
}
.api-input:focus { border-color: #3b82f6; }
.api-toggle {
  padding: 10px 14px; background: #f1f5f9; color: #475569;
  border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; font-weight: 600;
  cursor: pointer; white-space: nowrap; transition: all 0.2s;
}
.api-toggle:hover { background: #e2e8f0; }
.api-clear {
  padding: 10px 14px; background: #fff; color: #ef4444;
  border: 1px solid #fca5a5; border-radius: 8px; font-size: 13px; font-weight: 600;
  cursor: pointer; white-space: nowrap; transition: all 0.2s;
}
.api-clear:hover { background: #ef4444; color: #fff; border-color: #ef4444; }
.api-actions { display: flex; align-items: center; gap: 14px; margin-top: 6px; }
.api-note { font-size: 12px; color: #94a3b8; }
.api-diag {
  margin-top: 14px; padding: 10px 14px;
  background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;
  font-size: 12px; color: #92400e; line-height: 1.8;
}
.api-diag b { color: #b45309; }
.diag-hint { font-size: 11px; color: #a16207; opacity: .9; }
.diag-warn { color: #b91c1c; font-weight: 600; }
.btn-save {
  padding: 10px 20px; background: #10b981; color: #fff;
  border: none; border-radius: 8px; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: background 0.2s; white-space: nowrap;
}
.btn-save:hover:not(:disabled) { background: #059669; }
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-test {
  padding: 10px 20px; background: #3b82f6; color: #fff;
  border: none; border-radius: 8px; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: background 0.2s; white-space: nowrap;
}
.btn-test:hover:not(:disabled) { background: #2563eb; }
.btn-test:disabled { opacity: 0.6; cursor: not-allowed; }
.test-results {
  margin-top: 14px; padding: 12px 14px;
  background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;
  font-size: 12px; color: #166534; line-height: 2;
}
.test-results.fail { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
.test-row { display: flex; gap: 6px; align-items: baseline; }
.test-icon { flex-shrink: 0; }
.test-summary { font-weight: 700; margin-top: 4px; }
.test-summary.ok { color: #166534; }
.test-summary.bad { color: #b91c1c; }

.add-section {
  background: #fff; border-radius: 12px;
  padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 24px;
}
.add-section h3 { font-size: 16px; font-weight: 700; margin-bottom: 14px; color: #1e293b; }

.search-row { display: flex; gap: 10px; margin-bottom: 16px; }
.search-input {
  flex: 1; padding: 10px 14px; border: 2px solid #e2e8f0;
  border-radius: 8px; font-size: 14px; transition: border-color 0.2s;
  outline: none;
}
.search-input:focus { border-color: #3b82f6; }
.btn-search {
  padding: 10px 20px; background: #3b82f6; color: #fff;
  border: none; border-radius: 8px; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: background 0.2s; white-space: nowrap;
}
.btn-search:hover:not(:disabled) { background: #2563eb; }
.btn-search:disabled { opacity: 0.6; cursor: not-allowed; }

.search-results {
  border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;
}
.result-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; border-bottom: 1px solid #f1f5f9;
  transition: background 0.15s;
}
.result-item:last-child { border-bottom: none; }
.result-item:hover { background: #f8fafc; }
.result-info { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.result-name { font-size: 14px; font-weight: 700; color: #1e293b; }
.result-symbol { font-size: 12px; font-weight: 700; color: #1e40af; font-family: monospace; }
.result-exchange {
  font-size: 10px; font-weight: 700; background: #e0f2fe; color: #0369a1;
  padding: 2px 6px; border-radius: 4px;
}
.btn-add {
  padding: 5px 14px; background: #16a34a; color: #fff;
  border: none; border-radius: 6px; font-size: 12px; font-weight: 700;
  cursor: pointer; transition: all 0.2s; white-space: nowrap;
}
.btn-add:hover:not(:disabled) { background: #15803d; }
.btn-add:disabled { background: #86efac; cursor: not-allowed; }
.no-result { color: #94a3b8; font-size: 13px; padding: 12px 0; }

.watchlist-section {
  background: #fff; border-radius: 12px;
  padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.watchlist-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.watchlist-header h3 { font-size: 16px; font-weight: 700; color: #1e293b; }
.count { color: #94a3b8; font-weight: 400; font-size: 14px; }
.hint { font-size: 12px; color: #94a3b8; }
.loading-text { color: #94a3b8; font-size: 14px; padding: 20px 0; }
.empty-watchlist { color: #94a3b8; font-size: 14px; padding: 30px; text-align: center; }

.watchlist { display: flex; flex-direction: column; gap: 8px; }
.watch-item {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 16px; border: 2px solid #e2e8f0;
  border-radius: 10px; background: #f8fafc;
  cursor: grab; transition: all 0.15s;
}
.watch-item:hover { border-color: #bfdbfe; background: #eff6ff; }
.watch-item.dragging { opacity: 0.5; border-color: #3b82f6; }

.drag-handle { font-size: 18px; color: #94a3b8; cursor: grab; user-select: none; }
.watch-info { flex: 1; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.watch-name { font-size: 15px; font-weight: 700; color: #1e293b; }
.watch-symbol { font-size: 12px; font-weight: 700; color: #1e40af; font-family: monospace; }
.watch-actions { display: flex; align-items: center; gap: 10px; }
.sort-badge {
  font-size: 12px; font-weight: 700; color: #64748b;
  background: #e2e8f0; padding: 2px 8px; border-radius: 4px;
}
.btn-delete {
  padding: 5px 12px; background: transparent; color: #ef4444;
  border: 1px solid #fca5a5; border-radius: 6px; font-size: 12px; font-weight: 600;
  cursor: pointer; transition: all 0.2s;
}
.btn-delete:hover:not(:disabled) { background: #ef4444; color: #fff; border-color: #ef4444; }
.btn-delete:disabled { opacity: 0.5; cursor: not-allowed; }

.toast {
  position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
  padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 600;
  z-index: 9999; box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  animation: slideUp 0.3s ease;
}
.toast.success { background: #16a34a; color: #fff; }
.toast.error { background: #dc2626; color: #fff; }
@keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
</style>