<template>
  <div class="admin-futures">
    <div class="page-header">
      <h1>📈 期货价格管理</h1>
      <p class="page-desc">添加需要在前台展示的期货品种行情，支持自定义排序。</p>
    </div>

    <!-- Settings Section -->
    <div class="settings-section">
      <h3>全局显示设置</h3>
      <div class="settings-row">
        <label>前台列表K线预览天数：</label>
        <input type="number" v-model="settings.preview_days" min="5" max="100" class="input-days" />
        <span class="unit">天</span>
        <button @click="saveSettings" class="btn-save" :disabled="savingSettings">
          {{ savingSettings ? '保存中...' : '保存设置' }}
        </button>
      </div>
      <p class="hint">例如设置 15，前台列表就会显示为“走势图 (15日)”，并读取最近 15 天的数据绘制K线。</p>
    </div>

    <!-- Search & Add -->
    <div class="add-section">
      <h3>添加期货品种</h3>
      <div class="search-row">
        <input
          v-model="searchQuery"
          @input="onSearch"
          placeholder="输入期货代码或名称，如：HC、螺纹钢、铁矿石..."
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
          :key="item.symbol"
          class="result-item"
        >
          <div class="result-info">
            <span class="result-symbol">{{ item.symbol }}</span>
            <span class="result-name">{{ item.name }}</span>
            <span class="result-exchange">{{ item.exchange }}</span>
          </div>
          <button
            class="btn-add"
            :disabled="adding === item.symbol || isAdded(item.symbol)"
            @click="addFutures(item)"
          >
            {{ isAdded(item.symbol) ? '✓ 已添加' : (adding === item.symbol ? '添加中...' : '+ 添加') }}
          </button>
        </div>
      </div>
      <div v-else-if="searchQuery && !searching" class="no-result">
        未找到匹配品种。试试输入：HC（热卷）、RB（螺纹钢）、I（铁矿石）、J（焦炭）等
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
        还没有添加任何期货品种，请在上方搜索并添加
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
            <span class="watch-symbol">{{ item.symbol }}</span>
            <span class="watch-name">{{ item.name }}</span>
            <span class="watch-exchange">{{ item.exchange }}</span>
          </div>
          <div class="watch-actions">
            <span class="sort-badge">#{{ index + 1 }}</span>
            <button class="btn-delete" @click="deleteFutures(item)" :disabled="deleting === item.id">
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
import { ref, onMounted } from 'vue'
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
let dragIndex = ref(null)

const settings = ref({ preview_days: 10 })
const savingSettings = ref(false)

function showToast(msg, type = 'success') {
  toast.value = { show: true, type, msg }
  setTimeout(() => { toast.value.show = false }, 3000)
}

function isAdded(symbol) {
  return watchlist.value.some(w => w.symbol === symbol)
}

async function loadList() {
  loadingList.value = true
  try {
    const [listData, settingsData] = await Promise.all([
      api.getFuturesList(),
      api.getFuturesSettings().catch(() => ({ preview_days: 10 }))
    ])
    watchlist.value = listData
    if (settingsData && settingsData.preview_days) {
      settings.value.preview_days = settingsData.preview_days
    }
  } catch (e) {
    showToast('加载失败: ' + e.message, 'error')
  } finally {
    loadingList.value = false
  }
}

async function saveSettings() {
  savingSettings.value = true
  try {
    await api.updateFuturesSettings(settings.value)
    showToast('设置保存成功')
  } catch (e) {
    showToast('设置保存失败', 'error')
  } finally {
    savingSettings.value = false
  }
}

function onSearch() {
  clearTimeout(searchTimer)
  if (!searchQuery.value.trim()) { searchResults.value = []; return }
  searching.value = true
  searchTimer = setTimeout(async () => {
    try {
      searchResults.value = await api.searchFutures(searchQuery.value.trim())
    } catch (e) {
      searchResults.value = []
    } finally {
      searching.value = false
    }
  }, 300)
}

async function addFutures(item) {
  adding.value = item.symbol
  try {
    await api.addFutures(item)
    await loadList()
    showToast(`已添加 ${item.symbol} (${item.name})`)
  } catch (e) {
    showToast(e.message || '添加失败', 'error')
  } finally {
    adding.value = null
  }
}

async function deleteFutures(item) {
  if (!confirm(`确认删除 ${item.symbol} (${item.name})?`)) return
  deleting.value = item.id
  try {
    await api.deleteFutures(item.id)
    await loadList()
    showToast(`已删除 ${item.symbol}`)
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
    await api.reorderFutures(items)
  } catch (e) {
    showToast('排序保存失败', 'error')
  }
}
function onDragEnd() { dragIndex.value = null }

onMounted(loadList)
</script>

<style scoped>
.admin-futures { max-width: 860px; }

.page-header { margin-bottom: 24px; }
.page-header h1 { font-size: 24px; font-weight: 800; color: var(--text-primary); margin-bottom: 6px; }
.page-desc { color: var(--text-secondary); font-size: 14px; }

/* Settings Section */
.settings-section {
  background: #fff; border-radius: 12px;
  padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 24px;
}
.settings-section h3 { font-size: 16px; font-weight: 700; margin-bottom: 14px; color: #1e293b; }
.settings-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.settings-row label { font-size: 14px; color: #475569; font-weight: 500; }
.input-days { width: 80px; padding: 6px 10px; border: 2px solid #e2e8f0; border-radius: 6px; font-size: 14px; outline: none; }
.input-days:focus { border-color: #3b82f6; }
.unit { font-size: 14px; color: #64748b; }
.btn-save { padding: 6px 16px; background: #10b981; color: #fff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.2s; margin-left: 10px; }
.btn-save:hover:not(:disabled) { background: #059669; }
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

/* Add Section */
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

/* Search Results */
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
.result-info { display: flex; align-items: center; gap: 10px; }
.result-symbol { font-size: 14px; font-weight: 800; color: #1e40af; font-family: monospace; }
.result-name { font-size: 14px; color: #334155; }
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

/* Watchlist */
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
.watch-info { flex: 1; display: flex; align-items: center; gap: 10px; }
.watch-symbol { font-size: 15px; font-weight: 800; color: #1e40af; font-family: monospace; }
.watch-name { font-size: 14px; color: #334155; font-weight: 500; }
.watch-exchange {
  font-size: 10px; font-weight: 700; background: #dbeafe; color: #1d4ed8;
  padding: 2px 6px; border-radius: 4px;
}
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

/* Toast */
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
