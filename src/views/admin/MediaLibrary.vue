<template>
  <div class="media-page">
    <div class="sticky-top">
      <div class="page-header">
        <h1>📷 图库管理</h1>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-outline" @click="optimizeAllImages" :disabled="optimizing" style="color:#d97706;border-color:#d97706;">
            {{ optimizing ? '正在压缩优化中...' : '🚀 一键优化所有旧图片 (WebP)' }}
          </button>
          <button class="btn btn-primary" @click="openUploadModal">📤 上传图片</button>
          <button class="btn btn-secondary" @click="showGroupMgr = !showGroupMgr">📁 分组管理</button>
        </div>
      </div>

    <!-- Optimization Progress Modal -->
    <div v-if="optimizing || optimizeResult" class="modal-overlay">
      <div class="modal" style="max-width:400px; padding: 24px; text-align: center;">
        <h3 style="margin-top:0;">{{ optimizeResult ? '✅ 优化完成' : '🚀 正在批量优化图片...' }}</h3>
        <p v-if="optimizing" style="color:#64748b;font-size:14px;">
          系统正在将服务器中残留的 JPG/PNG 历史图片无损压缩为 WebP 格式。<br/>
          这需要消耗一定的时间，请勿关闭此页面。
        </p>
        <div v-if="optimizeResult" style="text-align:left; background:#f0fdf4; padding:12px; border-radius:8px; margin:16px 0; font-size:14px; color:#166534;">
          <p style="margin:4px 0">扫描到旧图片: <b>{{ optimizeResult.total }}</b> 张</p>
          <p style="margin:4px 0">成功压缩转码: <b>{{ optimizeResult.successCount }}</b> 张</p>
          <p style="margin:4px 0" v-if="optimizeResult.errorCount">处理失败: <b style="color:red">{{ optimizeResult.errorCount }}</b> 张</p>
          <div v-if="optimizeResult.errors && optimizeResult.errors.length" style="margin-top:8px;font-size:12px;color:#b91c1c;">
            <strong>失败原因：</strong>
            <ul style="margin:4px 0;padding-left:16px;max-height:100px;overflow-y:auto;">
              <li v-for="err in optimizeResult.errors" :key="err.filename" style="margin-bottom:2px;">
                {{ err.filename }} - {{ err.reason }}
              </li>
            </ul>
          </div>
        </div>
        <button v-if="optimizeResult" class="btn btn-primary" @click="closeOptimizeResult" style="width:100%">确认</button>
      </div>
    </div>

    <!-- Groups Manager Panel -->
    <div v-if="showGroupMgr" class="groups-panel">
      <h3>分组管理</h3>
      <div class="groups-list">
        <div v-for="g in groups" :key="g.id" class="group-item">
          <span v-if="editGroupId !== g.id" class="group-name">{{ g.name }} <small>({{ g.image_count }})</small></span>
          <input v-else v-model="editGroupName" class="form-control form-control-sm" @keyup.enter="saveGroup(g)" style="width:120px" />
          <div class="group-actions">
            <template v-if="editGroupId !== g.id">
              <button class="btn btn-sm btn-outline" @click="editGroupId=g.id; editGroupName=g.name">编辑</button>
              <button class="btn btn-sm btn-danger" @click="deleteGroup(g)">删除</button>
            </template>
            <template v-else>
              <button class="btn btn-sm btn-primary" @click="saveGroup(g)">保存</button>
              <button class="btn btn-sm btn-outline" @click="editGroupId=null">取消</button>
            </template>
          </div>
        </div>
      </div>
      <div class="new-group-row">
        <input v-model="newGroupName" class="form-control form-control-sm" placeholder="新分组名称..." @keyup.enter="addGroup" />
        <button class="btn btn-sm btn-primary" @click="addGroup" :disabled="!newGroupName.trim()">添加</button>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="filter-bar">
      <input v-model="search" class="form-control filter-search" placeholder="🔍 搜索文件名..." @input="loadMedia(false)" />
      <select v-model="filterGroup" class="form-control filter-select" @change="currentPage=1; loadMedia(false)">
        <option value="">全部分组</option>
        <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }} ({{ g.image_count }})</option>
      </select>
      <button class="btn btn-sm btn-outline" @click="toggleSelectAll">{{ selectedIds.length === items.length && items.length ? '取消全选' : '☑ 全选' }}</button>
      <div v-if="selectedIds.length" class="batch-bar">
        <span>已选 {{ selectedIds.length }} 张</span>
        <select v-model="batchGroupTarget" class="form-control form-control-sm" style="width:120px">
          <option value="">移动到分组...</option>
          <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
        </select>
        <button class="btn btn-sm btn-primary" @click="batchMove" :disabled="!batchGroupTarget || isBatchMoving">
          {{ isBatchMoving ? '移动中...' : '移动' }}
        </button>
        <button class="btn btn-sm btn-outline" style="border-color:#eab308; color:#eab308;" @click="batchRename" :disabled="isBatchRenaming">
          {{ isBatchRenaming ? '处理中...' : '✏️ 重命名' }}
        </button>
        <button class="btn btn-sm btn-danger" @click="batchDelete">删除</button>
      </div>
      <div class="filter-count">共 {{ total }} 张图片</div>
    </div>
    </div>

    <!-- Image grid -->
    <div class="media-grid" v-if="items.length">
      <div v-for="item in items" :key="item.id" :class="['media-card', { selected: selectedIds.includes(item.id) }]"
           @click="toggleSelect(item.id)">
        <div class="media-thumb">
          <img :src="item.filepath" :alt="item.alt || item.original_filename" loading="lazy" />
          <div class="media-check"><input type="checkbox" :checked="selectedIds.includes(item.id)" @click.stop="toggleSelect(item.id)" /></div>
          <div class="media-badge" v-if="item.ref_count">引用 {{ item.ref_count }}</div>
        </div>
        <div class="media-info">
          <div class="media-name" v-if="renamingId !== item.id" @dblclick.stop="startRename(item)" title="双击修改文件名">{{ item.original_filename || item.filename }}</div>
          <input v-else class="media-name-input" v-model="renameValue" @blur="saveRename(item)" @keyup.enter="saveRename(item)" @keyup.esc="renamingId=null" @click.stop ref="renameInput" />
          <div class="media-meta">
            <span v-if="item.group_name" class="meta-group">{{ item.group_name }}</span>
            <span>{{ formatSize(item.filesize) }}</span>
            <span v-if="item.width">{{ item.width }}×{{ item.height }}</span>
          </div>
        </div>
        <div class="media-actions" @click.stop>
          <button class="btn btn-sm btn-outline" @click="openDetail(item)" title="详情">📋</button>
          <button class="btn btn-sm btn-outline" @click="copyUrl(item)" title="复制地址">📎</button>
          <button class="btn btn-sm btn-outline" @click="replaceImage(item)" title="替换" style="color:#d97706;border-color:#d97706;">🔄</button>
          <button class="btn btn-sm btn-danger" @click="deleteImage(item)" title="删除">🗑</button>
        </div>
      </div>
    </div>
    <p v-else class="empty">暂无图片</p>

    <!-- Loading More Indicator -->
    <div v-if="loadingMore" style="text-align:center; padding: 20px; color:#64748b; font-size:14px;">
      <span class="loader-inline"></span> 正在加载更多图片...
    </div>
    <div v-else-if="items.length && currentPage >= totalPages" style="text-align:center; padding: 20px; color:#94a3b8; font-size:13px;">
      已经到底啦
    </div>

    <!-- Upload Modal -->
    <div v-if="showUploadModal" class="modal-overlay" @click.self="showUploadModal=false">
      <div class="modal" style="max-width:520px;">
        <div class="modal-header"><h3>📤 上传图片</h3><button class="modal-close" @click="showUploadModal=false">&times;</button></div>
        <div class="modal-body">
          <div class="form-group">
            <label>上传到分组</label>
            <select v-model="uploadGroupId" class="form-control">
              <option value="">默认（未分组）</option>
              <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>选择图片（支持多选）</label>
            <input type="file" multiple accept="image/*" @change="handleUploadFiles" class="form-control" />
          </div>
          <div v-if="uploadProgress" class="upload-progress">
            <div class="prog-bar-wrap"><div class="prog-bar" :style="{width: uploadProgress+'%'}"></div></div>
            <span>{{ uploadProgress }}%</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showUploadModal=false">取消</button>
          <button class="btn btn-primary" @click="doUpload" :disabled="!uploadFiles.length || uploading">{{ uploading ? '上传中...' : '🚀 开始上传' }}</button>
        </div>
      </div>
    </div>

    <!-- Detail Panel -->
    <div v-if="detailItem" class="modal-overlay" @click.self="detailItem=null">
      <div class="modal" style="max-width:600px;">
        <div class="modal-header"><h3>图片详情</h3><button class="modal-close" @click="detailItem=null">&times;</button></div>
        <div class="modal-body">
          <img :src="detailItem.filepath" style="max-width:100%;border-radius:8px;margin-bottom:16px;" />
          <table class="detail-table">
            <tr><th>文件名</th><td>{{ detailItem.original_filename }}</td></tr>
            <tr><th>尺寸</th><td>{{ detailItem.width }}×{{ detailItem.height }}</td></tr>
            <tr><th>大小</th><td>{{ formatSize(detailItem.filesize) }}</td></tr>
            <tr><th>分组</th><td>
              <select v-model="detailItem.group_id" class="form-control form-control-sm" @change="updateDetail('group_id', detailItem.group_id)" style="width:150px;">
                <option :value="null">未分组</option>
                <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
              </select>
            </td></tr>
            <tr><th>图片地址</th><td><code style="font-size:12px;word-break:break-all;">{{ detailItem.filepath }}</code></td></tr>
            <tr><th>被引用</th><td>{{ detailItem.ref_count || 0 }} 次</td></tr>
            <tr><th>上传时间</th><td>{{ detailItem.created_at }}</td></tr>
          </table>
          <div v-if="detailItem.references?.length" style="margin-top:12px;">
            <h4 style="font-size:14px;">引用详情</h4>
            <div v-for="r in detailItem.references" :key="r.id" style="font-size:12px;color:#64748b;">
              商品 #{{ r.product_id }} - {{ r.name_en || r.name }}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="replaceImage(detailItem)" style="color:#d97706;border-color:#d97706;">🔄 替换图片</button>
          <button class="btn btn-secondary" @click="detailItem=null">关闭</button>
        </div>
      </div>
    </div>

    <!-- Replace file input (hidden) -->
    <input type="file" ref="replaceInput" accept="image/*" style="display:none" @change="handleReplaceFile" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

const token = () => localStorage.getItem('token')
const headers = () => ({ 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' })

const items = ref([])
const groups = ref([])
const total = ref(0)
const currentPage = ref(1)
const perPage = 30
const search = ref('')
const filterGroup = ref('')
const selectedIds = ref([])
const batchGroupTarget = ref('')
const showUploadModal = ref(false)
const uploadGroupId = ref('')
const uploadFiles = ref([])
const uploading = ref(false)
const uploadProgress = ref(0)
const detailItem = ref(null)
const showGroupMgr = ref(false)
const editGroupId = ref(null)
const editGroupName = ref('')
const newGroupName = ref('')
const replaceTargetId = ref(null)
const replaceInput = ref(null)
const renamingId = ref(null)
const renameValue = ref('')
const renameInput = ref(null)

const isBatchRenaming = ref(false)
const isBatchMoving = ref(false)

const optimizing = ref(false)
const optimizeResult = ref(null)

const loadingMore = ref(false)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage)))

async function loadMedia(isLoadMore = false) {
  if (!isLoadMore) {
    currentPage.value = 1
  }
  const params = new URLSearchParams({ page: currentPage.value, per_page: perPage })
  if (filterGroup.value) params.set('group_id', filterGroup.value)
  if (search.value) params.set('search', search.value)
  const res = await fetch(`/api/media?${params}`, { headers: headers() })
  const data = await res.json()
  if (isLoadMore) {
    items.value = [...items.value, ...(data.items || [])]
  } else {
    items.value = data.items || []
  }
  total.value = data.total || 0
}

function handleScroll() {
  const bottomOfWindow = document.documentElement.scrollTop + window.innerHeight >= document.documentElement.offsetHeight - 200
  if (bottomOfWindow && !loadingMore.value && currentPage.value < totalPages.value) {
    loadingMore.value = true
    currentPage.value++
    loadMedia(true).finally(() => {
      loadingMore.value = false
    })
  }
}

async function loadGroups() {
  const res = await fetch('/api/media/groups', { headers: headers() })
  groups.value = await res.json()
}

function toggleSelect(id) {
  const i = selectedIds.value.indexOf(id)
  if (i >= 0) selectedIds.value.splice(i, 1)
  else selectedIds.value.push(id)
}

function toggleSelectAll() {
  if (selectedIds.value.length === items.value.length && items.value.length) {
    selectedIds.value = []
  } else {
    selectedIds.value = items.value.map(i => i.id)
  }
}

function formatSize(bytes) {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB'
  return (bytes / 1048576).toFixed(1) + 'MB'
}

function copyUrl(item) {
  const url = window.location.origin + item.filepath
  navigator.clipboard?.writeText(url).then(() => alert('已复制: ' + url))
}

// Upload
function openUploadModal() {
  uploadGroupId.value = filterGroup.value || ''
  showUploadModal.value = true
}

function handleUploadFiles(e) { uploadFiles.value = Array.from(e.target.files || []) }

async function doUpload() {
  if (!uploadFiles.value.length) return
  uploading.value = true; uploadProgress.value = 0
  const formData = new FormData()
  uploadFiles.value.forEach(f => formData.append('files', f))
  if (uploadGroupId.value) formData.append('group_id', uploadGroupId.value)
  try {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/media/upload')
    xhr.setRequestHeader('Authorization', `Bearer ${token()}`)
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) uploadProgress.value = Math.round(e.loaded / e.total * 100) }
    xhr.onload = () => {
      uploading.value = false
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText)
        alert(`✅ 成功上传 ${data.count} 张图片`)
        showUploadModal.value = false; uploadFiles.value = []
        loadMedia(); loadGroups()
      } else { alert('上传失败: ' + xhr.responseText) }
    }
    xhr.onerror = () => { uploading.value = false; alert('上传失败') }
    xhr.send(formData)
  } catch (e) { uploading.value = false; alert('上传失败: ' + e.message) }
}

// Detail
async function openDetail(item) {
  const res = await fetch(`/api/media/${item.id}`, { headers: headers() })
  detailItem.value = await res.json()
}

async function updateDetail(field, value) {
  await fetch(`/api/media/${detailItem.value.id}`, {
    method: 'PUT', headers: headers(),
    body: JSON.stringify({ [field]: value })
  })
  loadMedia(); loadGroups()
}

// Replace
function replaceImage(item) {
  replaceTargetId.value = item.id
  replaceInput.value?.click()
}

async function handleReplaceFile(e) {
  const file = e.target.files?.[0]
  if (!file || !replaceTargetId.value) return
  const formData = new FormData()
  formData.append('file', file)
  try {
    const res = await fetch(`/api/media/${replaceTargetId.value}/replace`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token()}` },
      body: formData
    })
    const data = await res.json()
    if (res.ok) { alert('✅ ' + data.message); loadMedia(); if (detailItem.value) openDetail(detailItem.value) }
    else alert('替换失败: ' + data.error)
  } catch (e) { alert('替换失败: ' + e.message) }
  if (replaceInput.value) replaceInput.value.value = ''
}

// Delete
async function deleteImage(item) {
  if (!confirm(`删除图片 "${item.original_filename || item.filename}"？`)) return
  const res = await fetch(`/api/media/${item.id}`, { method: 'DELETE', headers: headers() })
  const data = await res.json()
  if (res.ok) { loadMedia(); loadGroups() }
  else alert(data.error)
}

// Batch
async function batchMove() {
  if (!selectedIds.value.length || !batchGroupTarget.value || isBatchMoving.value) return
  isBatchMoving.value = true
  try {
    const res = await fetch('/api/media/batch-move', {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ ids: selectedIds.value, group_id: Number(batchGroupTarget.value) })
    })
    const data = await res.json()
    if (res.ok) {
      selectedIds.value = []; batchGroupTarget.value = ''
      loadMedia()
      loadGroups()
    } else {
      alert('移动失败: ' + (data.error || '未知错误'))
    }
  } catch(e) {
    alert('移动失败: ' + e.message)
  } finally {
    isBatchMoving.value = false
  }
}

async function batchDelete() {
  if (!selectedIds.value.length || !confirm(`确定删除 ${selectedIds.value.length} 张图片？`)) return
  const res = await fetch('/api/media/batch-delete', {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ ids: selectedIds.value })
  })
  const data = await res.json()
  if (res.ok) { selectedIds.value = []; loadMedia(); loadGroups() }
  else alert(data.error)
}

async function batchRename() {
  if (!selectedIds.value.length) return
  const prefix = prompt(`正在为选中的 ${selectedIds.value.length} 张图片批量重命名。\n请输入英文前缀 (例如: GI coil):`)
  if (!prefix) return
  
  isBatchRenaming.value = true
  try {
    const res = await fetch('/api/media/batch-rename', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ ids: selectedIds.value, prefix })
    })
    const data = await res.json()
    if (res.ok) {
      alert(`批量重命名成功！\n成功: ${data.successCount} 个\n失败: ${data.errorCount} 个`)
      selectedIds.value = []
      loadMedia()
      loadGroups()
    } else {
      alert('重命名失败: ' + (data.error || '未知错误'))
    }
  } catch (e) {
    alert('重命名失败: ' + e.message)
  } finally {
    isBatchRenaming.value = false
  }
}

// Groups
async function addGroup() {
  if (!newGroupName.value.trim()) return
  await fetch('/api/media/groups', {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ name: newGroupName.value.trim() })
  })
  newGroupName.value = ''; loadGroups()
}

async function saveGroup(g) {
  await fetch(`/api/media/groups/${g.id}`, {
    method: 'PUT', headers: headers(),
    body: JSON.stringify({ name: editGroupName.value.trim() })
  })
  editGroupId.value = null; loadGroups()
}

async function deleteGroup(g) {
  if (!confirm(`删除分组 "${g.name}"？`)) return
  const res = await fetch(`/api/media/groups/${g.id}`, { method: 'DELETE', headers: headers() })
  const data = await res.json()
  if (res.ok) loadGroups()
  else alert(data.error)
}

async function startRename(item) {
  renamingId.value = item.id
  renameValue.value = item.original_filename || item.filename || ''
  await nextTick()
  renameInput.value?.focus()
  renameInput.value?.select()
}

async function saveRename(item) {
  const newName = renameValue.value.trim()
  if (!newName || newName === (item.original_filename || item.filename)) {
    renamingId.value = null
    return
  }
  try {
    await fetch(`/api/media/${item.id}`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify({ original_filename: newName })
    })
    item.original_filename = newName
  } catch (e) { console.error('Rename failed:', e) }
  renamingId.value = null
}

async function optimizeAllImages() {
  if (!confirm('此操作将扫描所有未优化的历史 JPG/PNG 图片，将其转换为体积更小的 WebP 格式，并自动替换关联的文章和产品中的旧地址。\n\n这可能需要几十秒到几分钟，确定开始吗？')) return
  
  optimizing.value = true
  optimizeResult.value = null
  try {
    const res = await fetch('/api/media/optimize-all', {
      method: 'POST',
      headers: headers()
    })
    const data = await res.json()
    if (res.ok) {
      optimizeResult.value = data
    } else {
      alert('优化失败: ' + data.error)
      optimizing.value = false
    }
  } catch (e) {
    alert('优化异常: ' + e.message)
    optimizing.value = false
  }
}

function closeOptimizeResult() {
  optimizeResult.value = null
  optimizing.value = false
  loadMedia()
}

onMounted(() => {
  loadGroups()
  loadMedia()
  window.addEventListener('scroll', handleScroll)
})
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.media-page { padding: 0; }
.sticky-top {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--light, #f8fafc);
  padding: 16px 20px 10px;
  margin: -20px -20px 16px -20px;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
}
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h1 { margin: 0; font-size: 24px; }

/* Groups Panel */
.groups-panel { background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.groups-panel h3 { margin: 0 0 12px; font-size: 16px; }
.groups-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.group-item { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; }
.group-name { font-weight: 600; }
.group-actions { display: flex; gap: 4px; }
.new-group-row { display: flex; gap: 8px; max-width: 300px; }
.new-group-row input { font-size: 13px; }

/* Filter bar */
.filter-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.filter-search { max-width: 240px; }
.filter-select { max-width: 160px; }
.filter-count { margin-left: auto; font-size: 13px; color: #64748b; }
.batch-bar { display: flex; gap: 6px; align-items: center; padding: 4px 10px; background: #eff6ff; border-radius: 6px; font-size: 13px; }

/* Image Grid */
.media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.media-card { background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); cursor: pointer; transition: all 0.2s; border: 2px solid transparent; }
.media-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.media-card.selected { border-color: #2563eb; background: #eff6ff; }

.media-thumb { position: relative; aspect-ratio: 1; background: #f8fafc; overflow: hidden; }
.media-thumb img { width: 100%; height: 100%; object-fit: cover; }
.media-check { position: absolute; top: 6px; left: 6px; }
.media-check input { width: 16px; height: 16px; }
.media-badge { position: absolute; top: 6px; right: 6px; background: #2563eb; color: #fff; padding: 1px 6px; border-radius: 10px; font-size: 10px; font-weight: 600; }

.media-info { padding: 8px 10px 4px; }
.media-name { font-size: 12px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #0f172a; cursor: text; }
.media-name:hover { color: #2563eb; }
.media-name-input { width: 100%; font-size: 12px; font-weight: 600; color: #0f172a; border: 1px solid #3b82f6; border-radius: 4px; padding: 2px 6px; outline: none; background: #eff6ff; box-sizing: border-box; }
.media-meta { display: flex; gap: 6px; font-size: 11px; color: #94a3b8; margin-top: 2px; flex-wrap: wrap; }
.meta-group { background: #dbeafe; color: #1d4ed8; padding: 0 4px; border-radius: 4px; font-weight: 600; }

.media-actions { display: flex; gap: 4px; padding: 4px 8px 8px; }
.media-actions .btn { font-size: 11px; padding: 2px 6px; }

/* Infinite Scroll loader */
.loader-inline {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid #cbd5e1;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  vertical-align: middle;
  margin-right: 6px;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Upload */
.upload-progress { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
.prog-bar-wrap { flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
.prog-bar { height: 100%; background: linear-gradient(90deg, #2563eb, #059669); border-radius: 4px; transition: width 0.3s; }

/* Detail */
.detail-table { width: 100%; font-size: 13px; }
.detail-table th { text-align: left; padding: 6px 10px; color: #64748b; font-weight: 600; width: 80px; }
.detail-table td { padding: 6px 10px; }

/* Shared */
.empty { text-align: center; padding: 60px; color: #94a3b8; font-size: 15px; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; margin-bottom: 4px; font-size: 13px; font-weight: 600; color: #334155; }
.form-control { width: 100%; padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
.form-control:focus { outline: none; border-color: #2563eb; }
.form-control-sm { padding: 5px 8px; font-size: 13px; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; border-radius: 14px; max-width: 92vw; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid #e2e8f0; }
.modal-header h3 { margin: 0; font-size: 18px; }
.modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b; }
.modal-body { padding: 24px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 24px; border-top: 1px solid #e2e8f0; }
.btn { padding: 8px 16px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-primary { background: #2563eb; color: #fff; } .btn-primary:hover { background: #1d4ed8; }
.btn-secondary { background: #f1f5f9; color: #334155; }
.btn-outline { background: transparent; border: 1px solid #e2e8f0; color: #334155; }
.btn-outline:hover { background: #f8fafc; }
.btn-danger { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.btn-sm { padding: 4px 10px; font-size: 12px; }
</style>
