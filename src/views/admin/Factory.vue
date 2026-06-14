<template>
  <div class="factory-admin-page">
    <div class="page-header">
      <h1>🏭 工厂展示管理</h1>
      <button class="btn btn-primary" @click="addGroup">➕ 添加分组</button>
    </div>
    
    <p class="intro-text">
      在这里你可以自定义工厂展示页面的内容，例如：工厂生产，包装，运输，质检等。
      可以添加图片或 YouTube 视频，并支持开启图片轮播功能。
    </p>

    <div v-if="loading" class="loading-state">加载中...</div>

    <div v-else class="groups-container">
      <div v-for="group in groups" :key="group.id" class="group-card">
        <div class="group-header">
          <div class="group-title">
            <input v-model="group.name" class="form-control" placeholder="分组名称（如：生产车间）" @blur="updateGroup(group)" />
            <input v-model="group.name_en" class="form-control" placeholder="英文名称（如：Production）" @blur="updateGroup(group)" />
          </div>
          <div class="group-settings">
            <label class="setting-item">
              排序优先级(1-99):
              <input type="number" v-model="group.sort_order" class="form-control short-input" @blur="updateGroup(group)" />
            </label>
            <label class="setting-item checkbox-label">
              <input type="checkbox" v-model="group.carousel_enabled" :true-value="1" :false-value="0" @change="updateGroup(group)" />
              开启图片轮播
            </label>
            <label class="setting-item" v-if="group.carousel_enabled">
              轮播速度(秒):
              <input type="number" v-model="group.carousel_speed" class="form-control short-input" min="1" max="10" @blur="updateGroup(group)" />
            </label>
            <button class="btn btn-danger btn-sm" @click="deleteGroup(group.id)">删除分组</button>
          </div>
        </div>

        <div class="media-container">
          <div class="media-header">
            <h4>展示内容 ({{ group.items.length }})</h4>
            <div class="media-actions">
              <button class="btn btn-outline btn-sm" @click="openMediaPicker(group.id)">📷 从图库添加图片</button>
              <button class="btn btn-outline btn-sm" @click="openVideoModal(group.id)">🎥 添加 YouTube 视频</button>
              <button class="btn btn-outline btn-sm" style="color:#2563eb;border-color:#bfdbfe;" @click="openBatchWatermarkModal(group.id)">💦 批量追加水印</button>
            </div>
          </div>

          <div class="media-grid">
            <div v-for="item in group.items" :key="item.id" class="media-card">
              <div class="media-preview" v-if="item.type === 'image'" @click="openAdminPreview(item, group)" style="cursor: pointer;">
                <img :src="item.media_url" />
                <span class="media-badge image-badge">图片</span>
              </div>
              <div class="media-preview video-preview" v-else @click="openAdminPreview(item, group)" style="cursor: pointer;">
                <div class="video-icon">▶</div>
                <span class="media-badge video-badge">视频</span>
              </div>
              
              <div class="media-info">
                <div class="media-url" :title="item.media_url">{{ item.media_url }}</div>
                
                <div class="media-settings">
                  <label class="setting-item">
                    排序:
                    <input type="number" v-model="item.sort_order" class="form-control very-short-input" @blur="updateMedia(item)" />
                  </label>
                  
                  <label class="setting-item checkbox-label" v-if="item.type === 'video'">
                    <input type="checkbox" v-model="item.autoplay" :true-value="1" :false-value="0" @change="updateMedia(item)" />
                    自动播放
                  </label>
                </div>

                <div v-if="item.type === 'video'" style="margin-top: 8px;">
                  <label class="setting-item checkbox-label" style="margin-bottom: 4px;">
                    <input type="checkbox" v-model="item.show_desc" :true-value="1" :false-value="0" @change="updateMedia(item)" />
                    在视频下方显示描述文本
                  </label>
                  <textarea 
                    v-if="item.show_desc" 
                    v-model="item.description" 
                    class="form-control" 
                    placeholder="Enter English description here" 
                    rows="2" 
                    @blur="updateMedia(item)" 
                    style="font-size: 12px; padding: 6px;"></textarea>
                </div>
              </div>
              
              <button class="btn-delete-media" @click="deleteMedia(item.id)">✕</button>
            </div>
            <div v-if="group.items.length === 0" class="empty-media">该分组暂无内容</div>
          </div>
        </div>
      </div>
      <div v-if="groups.length === 0" class="empty-state">
        暂无分组，请点击上方按钮添加。
      </div>
    </div>

    <!-- Media Library Picker -->
    <div v-if="showMediaPicker" class="modal-overlay" @click.self="showMediaPicker=false">
      <div class="modal" style="max-width:700px;">
        <div class="modal-header" style="background:#f5f3ff;color:#7c3aed;">
          <h3>📷 从图库选择 (可多选)</h3>
          <button class="modal-close" @click="showMediaPicker=false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="breadcrumb" style="width: 100%; display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: bold; margin-bottom: 8px;">
            <span @click="mediaPickerGroup=''; mediaPickerFolder=''; loadMediaPicker()" style="cursor: pointer; color: #2563eb;">🏠 全部分组</span>
            <template v-if="mediaPickerGroup">
              <span style="color:#94a3b8">/</span>
              <span @click="mediaPickerFolder=''; loadMediaPicker()" style="cursor: pointer; color: #2563eb;">{{ mediaGroups.find(g => g.id === mediaPickerGroup)?.name }}</span>
            </template>
            <template v-if="mediaPickerFolder">
              <span style="color:#94a3b8">/</span>
              <span>{{ mediaPickerCurrentFolderName }}</span>
            </template>
          </div>
          <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center;">
            <input v-model="mediaPickerSearch" class="form-control" placeholder="搜索文件名..." @input="loadMediaPicker" style="max-width:200px;" />
            <select v-model="mediaPickerGroup" class="form-control" @change="mediaPickerFolder=''; loadMediaPicker()" style="max-width:140px;">
              <option value="">全部分组</option>
              <option v-for="g in mediaGroups" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
            <select v-model="mediaPickerWatermark" class="form-control" style="max-width:140px;">
              <option value="">不添加水印</option>
              <option v-for="t in watermarkTemplates" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
            <button v-if="mediaPickerItems.length" type="button" class="btn btn-sm btn-outline" @click="mediaPickerSelected = mediaPickerSelected.length === mediaPickerItems.length ? [] : mediaPickerItems.map(i=>i.filepath)">
              {{ mediaPickerSelected.length === mediaPickerItems.length ? '取消全选' : '全选图片' }}
            </button>
          </div>
          <div v-if="mediaPickerItems.length || mediaPickerFolders.length" class="lib-grid">
            <div v-for="folder in mediaPickerFolders" :key="'ff_'+folder.id" class="lib-item" style="cursor:pointer; background:#f1f5f9; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:10px;" @click="enterMediaPickerFolder(folder)">
              <div style="font-size: 32px;">📁</div>
              <div style="font-size: 12px; margin-top:8px; text-align:center; line-height:1.2;">{{ folder.name }}</div>
            </div>
            <div v-for="item in mediaPickerItems" :key="item.id" 
                 :class="['lib-item', { selected: mediaPickerSelected.includes(item.filepath) }]" 
                 @click="toggleMediaSelect(item.filepath)">
              <video v-if="item.filepath && (item.filepath.toLowerCase().endsWith('.mp4') || item.filepath.toLowerCase().endsWith('.webm'))" :src="item.filepath" style="width:100%;height:100%;object-fit:cover;" preload="metadata"></video>
                <img v-else :src="item.filepath" @error="item.filepath='/placeholder.png'" />
              <div class="check-icon">✓</div>
            </div>
          </div>
          <p v-else style="color:#94a3b8;text-align:center;padding:20px;">暂无图片</p>
        </div>
        <div class="modal-footer" style="display:flex; justify-content:flex-end; align-items:center;">
          <div style="display:flex; gap:8px;">
            <button v-if="mediaPickerSelected.length > 0" type="button" class="btn btn-outline" style="border-color:#eab308; color:#eab308;" @click="doBatchRename('media')">✏️ 批量重命名</button>
            <button type="button" class="btn btn-secondary" @click="showMediaPicker=false">取消</button>
            <button type="button" class="btn btn-primary" style="background:#7c3aed;" @click="doAddSelectedMedia" :disabled="!mediaPickerSelected.length">确认添加 ({{ mediaPickerSelected.length }})</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Video Modal -->
    <div v-if="showVideoModal" class="modal-overlay" @click.self="showVideoModal=false">
      <div class="modal" style="max-width:500px;">
        <div class="modal-header" style="background:#fef2f2;color:#dc2626;">
          <h3>🎥 添加 YouTube 视频</h3>
          <button class="modal-close" @click="showVideoModal=false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>YouTube 嵌入链接或视频地址</label>
            <input v-model="videoUrlInput" class="form-control" placeholder="https://www.youtube.com/embed/..." />
            <p class="form-hint" style="margin-top:4px;">请使用 Embed 链接以确保最佳显示效果</p>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="videoAutoplayInput" />
              进入页面后自动静音播放
            </label>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="videoShowDescInput" />
              在视频下方显示描述文本
            </label>
            <textarea 
              v-if="videoShowDescInput"
              v-model="videoDescInput" 
              class="form-control" 
              placeholder="Enter English description here" 
              rows="3" 
              style="margin-top: 8px;"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showVideoModal=false">取消</button>
          <button type="button" class="btn btn-primary" style="background:#dc2626;border-color:#dc2626;" @click="doAddVideo" :disabled="!videoUrlInput">确认添加</button>
        </div>
      </div>
    </div>

    <!-- Batch Watermark Modal -->
    <div v-if="showBatchWatermark" class="modal-overlay" @click.self="showBatchWatermark=false">
      <div class="modal" style="max-width:600px;">
        <div class="modal-header" style="background:#eff6ff;color:#1e40af;">
          <h3>💦 批量追加水印</h3>
          <button class="modal-close" @click="showBatchWatermark=false">&times;</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom:12px;color:#475569;font-size:14px;">请勾选当前分组中需要追加水印的照片。原照片不会受影响，系统将生成带有水印的新图并替换当前展示记录。</p>
          
          <div class="form-group">
            <label>选择水印模板</label>
            <select v-model="batchWatermarkTemplateId" class="form-control">
              <option value="">使用默认水印模板</option>
              <option v-for="t in watermarkTemplates" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>

          <div v-if="batchWatermarkItems.length" class="lib-grid" style="max-height: 300px;">
            <div v-for="item in batchWatermarkItems" :key="item.id" 
                 :class="['lib-item', { selected: batchWatermarkSelected.includes(item.id) }]" 
                 @click="toggleBatchWatermarkSelect(item.id)">
              <img :src="item.media_url" />
              <div class="check-icon">✓</div>
            </div>
          </div>
          <p v-else style="color:#94a3b8;text-align:center;padding:20px;">当前分组下没有可用的照片</p>
        </div>
        <div class="modal-footer" style="display:flex; justify-content:flex-end; align-items:center;">
          <div style="display:flex; gap:8px;">
            <button v-if="batchWatermarkSelected.length > 0" type="button" class="btn btn-outline" style="border-color:#eab308; color:#eab308;" @click="doBatchRename('batch')">✏️ 批量重命名</button>
            <button type="button" class="btn btn-secondary" @click="showBatchWatermark=false">取消</button>
            <button type="button" class="btn btn-primary" style="background:#2563eb;" @click="doBatchWatermark" :disabled="!batchWatermarkSelected.length || isBatchWatermarking">
              {{ isBatchWatermarking ? '处理中...' : `对选中的 ${batchWatermarkSelected.length} 张图加水印` }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Global Loading Overlay -->
    <div v-if="globalProcessing" class="loading-overlay">
      <div class="loader"></div>
      <div style="margin-top:16px;color:white;">系统处理中，请稍候...</div>
    </div>

    <!-- Admin Preview Modal -->
    <div v-if="adminPreviewItem" class="modal-overlay" @click.self="closeAdminPreview" style="z-index: 2000;">
      <div class="modal" style="max-width:800px; background: transparent; box-shadow: none;">
        <div style="position: relative; display: flex; justify-content: center; align-items: center;">
          <div style="position: absolute; top: -50px; width: 100%; display: flex; justify-content: space-between; align-items: center; z-index: 10;">
            <!-- Delete Button (Top Left) -->
            <button class="btn btn-danger btn-sm" @click="deleteAdminPreview" style="box-shadow: 0 4px 6px rgba(0,0,0,0.3);">🗑️ 删除当前照片</button>
            <!-- Close Button (Top Right) -->
            <button class="modal-close" @click="closeAdminPreview" style="color: white; font-size: 36px; background: none; border: none; cursor: pointer;">&times;</button>
          </div>
          
          <img v-if="adminPreviewItem.type === 'image'" :src="adminPreviewItem.media_url" style="max-width: 100%; max-height: 80vh; object-fit: contain; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);" @click="closeAdminPreview" />
          
          <div v-else-if="adminPreviewItem.type === 'video'" style="width: 100%; max-width: 800px; aspect-ratio: 16/9; background: #000; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <video v-if="adminPreviewItem.media_url.toLowerCase().endsWith('.mp4') || adminPreviewItem.media_url.toLowerCase().endsWith('.webm')" :src="adminPreviewItem.media_url" controls autoplay style="width:100%;height:100%;"></video>
            <iframe v-else :src="getYoutubeEmbedUrl(adminPreviewItem.media_url)" style="width: 100%; height: 100%; border: none;" allow="autoplay; encrypted-media" allowfullscreen></iframe>
          </div>

          <!-- Navigation Buttons -->
          <button v-if="adminPreviewIndex > 0" class="preview-nav-btn prev" @click.stop="adminPreviewPrev" style="position: absolute; left: -60px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; font-size: 32px; width: 50px; height: 50px; border-radius: 50%; cursor: pointer;">❮</button>
          <button v-if="adminPreviewGroup && adminPreviewIndex < adminPreviewGroup.items.length - 1" class="preview-nav-btn next" @click.stop="adminPreviewNext" style="position: absolute; right: -60px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; font-size: 32px; width: 50px; height: 50px; border-radius: 50%; cursor: pointer;">❯</button>
        </div>
      </div>
    </div>

    <!-- Global Loading Overlay -->
    <div v-if="globalProcessing" class="loading-overlay">
      <div class="loader"></div>
      <div style="margin-top:16px;color:white;">系统处理中，请稍候...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

const loading = ref(true)
const groups = ref([])

// Media Library Picker State
const showMediaPicker = ref(false)
const mediaPickerSearch = ref('')
const mediaPickerGroup = ref('')
const mediaPickerWatermark = ref('')
const mediaPickerVideoAutoplay = ref(true)
const mediaPickerItems = ref([])
const mediaPickerSelected = ref([])
const mediaGroups = ref([])
const currentGroupIdForMedia = ref(null)
const mediaPickerFolders = ref([])
const mediaPickerFolder = ref('')
const mediaPickerCurrentFolderName = ref('')

function enterMediaPickerFolder(folder) {
  mediaPickerFolder.value = folder.id
  mediaPickerCurrentFolderName.value = folder.name
  loadMediaPicker()
}

const globalProcessing = ref(false)

async function loadWatermarkTemplates() {
  if (watermarkTemplates.value.length) return
  try {
    const res = await fetch('/api/media/watermark-templates', {
      headers: { 'Authorization': `Bearer ${token()}` }
    })
    watermarkTemplates.value = await res.json()
  } catch (e) { console.error(e) }
}

// Video Modal State
const showVideoModal = ref(false)
const videoUrlInput = ref('')
const videoAutoplayInput = ref(false)
const videoShowDescInput = ref(false)
const videoDescInput = ref('')
const currentGroupIdForVideo = ref(null)

const adminPreviewItem = ref(null)
const adminPreviewGroup = ref(null)
const adminPreviewIndex = ref(-1)

const token = () => localStorage.getItem('token')

const loadData = async () => {
  try {
    const res = await fetch('/api/factory', {
      headers: { 'Authorization': `Bearer ${token()}` }
    })
    groups.value = await res.json()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const addGroup = async () => {
  try {
    const res = await fetch('/api/factory/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
      body: JSON.stringify({ name: '新分组', sort_order: groups.value.length + 1 })
    })
    if (res.ok) loadData()
  } catch (e) { console.error(e) }
}

const updateGroup = async (group) => {
  try {
    await fetch(`/api/factory/groups/${group.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
      body: JSON.stringify(group)
    })
  } catch (e) { console.error(e) }
}

const deleteGroup = async (id) => {
  if (!confirm('确定删除此分组及其所有内容吗？')) return
  try {
    await fetch(`/api/factory/groups/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token()}` }
    })
    loadData()
  } catch (e) { console.error(e) }
}

const updateMedia = async (item) => {
  try {
    const res = await fetch(`/api/factory/media/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
      body: JSON.stringify(item)
    })
    if (res.ok) {
      // Reload to reflect sorting changes
      loadData()
    }
  } catch (e) { console.error(e) }
}

const deleteMedia = async (id) => {
  if (!confirm('确定删除此内容吗？')) return
  try {
    await fetch(`/api/factory/media/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token()}` }
    })
    loadData()
  } catch (e) { console.error(e) }
}

const openAdminPreview = (item, group) => {
  adminPreviewGroup.value = group
  adminPreviewIndex.value = group.items.findIndex(i => i.id === item.id)
  adminPreviewItem.value = item
}

const closeAdminPreview = () => {
  adminPreviewItem.value = null
  adminPreviewGroup.value = null
  adminPreviewIndex.value = -1
}

const adminPreviewPrev = () => {
  if (adminPreviewIndex.value > 0 && adminPreviewGroup.value) {
    adminPreviewIndex.value--
    adminPreviewItem.value = adminPreviewGroup.value.items[adminPreviewIndex.value]
  }
}

const adminPreviewNext = () => {
  if (adminPreviewGroup.value && adminPreviewIndex.value < adminPreviewGroup.value.items.length - 1) {
    adminPreviewIndex.value++
    adminPreviewItem.value = adminPreviewGroup.value.items[adminPreviewIndex.value]
  }
}

const deleteAdminPreview = async () => {
  if (!adminPreviewItem.value) return
  if (confirm('确定删除正在预览的照片吗？')) {
    const idToDelete = adminPreviewItem.value.id
    try {
      await fetch(`/api/factory/media/${idToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token()}` }
      })
      // Close preview, reload data
      closeAdminPreview()
      loadData()
    } catch (e) { console.error(e) }
  }
}

const handleAdminKeydown = (e) => {
  if (!adminPreviewItem.value) return
  if (e.key === 'ArrowLeft') adminPreviewPrev()
  if (e.key === 'ArrowRight') adminPreviewNext()
  if (e.key === 'Escape') closeAdminPreview()
  if (e.key === 'Delete') deleteAdminPreview()
}

onMounted(() => {
  loadData()
  window.addEventListener('keydown', handleAdminKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleAdminKeydown)
})

const getYoutubeEmbedUrl = (url) => {
  if (!url) return '';
  let videoId = '';
  if (url.includes('youtube.com/watch?v=')) {
    videoId = url.split('v=')[1];
    const ampersandPosition = videoId.indexOf('&');
    if(ampersandPosition !== -1) videoId = videoId.substring(0, ampersandPosition);
  } else if (url.includes('youtube.com/shorts/')) {
    videoId = url.split('shorts/')[1];
    const questionPosition = videoId.indexOf('?');
    if(questionPosition !== -1) videoId = videoId.substring(0, questionPosition);
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1];
    const questionPosition = videoId.indexOf('?');
    if(questionPosition !== -1) videoId = videoId.substring(0, questionPosition);
  } else if (url.includes('youtube.com/embed/')) {
    videoId = url.split('embed/')[1];
    const questionPosition = videoId.indexOf('?');
    if(questionPosition !== -1) videoId = videoId.substring(0, questionPosition);
    return url + (url.includes('?') ? '&' : '?') + 'vq=hd1080&autoplay=1';
  } else {
    return url + '?vq=hd1080&autoplay=1';
  }
  return `https://www.youtube.com/embed/${videoId}?vq=hd1080&autoplay=1`;
}

// Media Picker Logic
const openMediaPicker = (groupId) => {
  currentGroupIdForMedia.value = groupId
  mediaPickerSelected.value = []
  mediaPickerWatermark.value = localStorage.getItem('_lastWatermarkTemplate') || ''
  mediaPickerFolder.value = localStorage.getItem('_lastMediaFolder') || ''
  mediaPickerCurrentFolderName.value = localStorage.getItem('_lastMediaFolderName') || ''
  showMediaPicker.value = true
  loadMediaGroups()
  loadWatermarkTemplates()
  loadMediaPicker()
}
watch(mediaPickerWatermark, v => { if (v !== undefined) localStorage.setItem('_lastWatermarkTemplate', v) })

const loadMediaPicker = async () => {
  const params = new URLSearchParams({ per_page: '50' })
  if (mediaPickerSearch.value) params.set('search', mediaPickerSearch.value)
  if (mediaPickerGroup.value) params.set('group_id', mediaPickerGroup.value)
  if (mediaPickerFolder.value) params.set('folder_id', mediaPickerFolder.value)
  try {
    const res = await fetch(`/api/media?${params}`, {
      headers: { 'Authorization': `Bearer ${token()}` }
    })
    const data = await res.json()
    mediaPickerItems.value = data.items || []
    mediaPickerFolders.value = data.folders || []
    if (mediaPickerFolder.value && !mediaPickerCurrentFolderName.value) { const folder = mediaPickerFolders.value.find(f => f.id === mediaPickerFolder.value); if (folder) mediaPickerCurrentFolderName.value = folder.name; }
  } catch (e) { console.error(e) }
}

const loadMediaGroups = async () => {
  try {
    const res = await fetch('/api/media/groups', {
      headers: { 'Authorization': `Bearer ${token()}` }
    })
    mediaGroups.value = await res.json()
  } catch (e) { console.error(e) }
}

const toggleMediaSelect = (url) => {
  const idx = mediaPickerSelected.value.indexOf(url)
  if (idx >= 0) mediaPickerSelected.value.splice(idx, 1)
  else mediaPickerSelected.value.push(url)
}

const doAddSelectedMedia = async () => {
  if (!mediaPickerSelected.value.length || !currentGroupIdForMedia.value) return
  
  let urlsToAdd = mediaPickerSelected.value

  if (mediaPickerWatermark.value) {
    globalProcessing.value = true
    try {
      const res = await fetch('/api/media/apply-watermark-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
        body: JSON.stringify({ urls: urlsToAdd, template_id: mediaPickerWatermark.value })
      })
      const data = await res.json()
      if (res.ok && data.urls) urlsToAdd = data.urls
    } catch (e) { console.error(e) }
    globalProcessing.value = false
  }

  for (const url of urlsToAdd) {
    await fetch('/api/factory/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
      body: JSON.stringify({
        group_id: currentGroupIdForMedia.value,
        type: 'image',
        media_url: url,
        apply_watermark: false
      })
    })
  }
  showMediaPicker.value = false
  loadData()
}

// ─── Batch Rename ───────────────────────────────────────────────────────────
async function doBatchRename(type) {
  let ids = []
  if (type === 'media') {
    ids = mediaPickerItems.value.filter(i => mediaPickerSelected.value.includes(i.filepath)).map(i => i.id)
  } else if (type === 'batch') {
    ids = batchWatermarkSelected.value
  }
  if (!ids.length) return
  
  const prefix = prompt(`正在为选中的 ${ids.length} 张图片批量重命名。\n请输入英文前缀 (例如: GI coil):`)
  if (!prefix) return
  
  globalProcessing.value = true
  try {
    const res = await fetch('/api/media/batch-rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
      body: JSON.stringify({ ids, prefix })
    })
    const data = await res.json()
    if (res.ok) {
      alert(`批量重命名成功！\n成功: ${data.successCount} 个\n失败: ${data.errorCount} 个`)
      if (type === 'media') {
        mediaPickerSelected.value = []
        await loadMediaPicker()
      } else if (type === 'batch') {
        batchWatermarkSelected.value = []
        showBatchWatermark.value = false
      }
      await loadData()
    } else {
      alert('重命名失败: ' + (data.error || '未知错误'))
    }
  } catch (e) {
    alert('重命名失败: ' + e.message)
  } finally {
    globalProcessing.value = false
  }
}

// Batch Watermark
const showBatchWatermark = ref(false)
const batchWatermarkItems = ref([])
const batchWatermarkSelected = ref([])
const batchWatermarkTemplateId = ref('')
const watermarkTemplates = ref([])
const isBatchWatermarking = ref(false)

const openBatchWatermarkModal = async (groupId) => {
  currentGroupIdForMedia.value = groupId
  const group = groups.value.find(g => g.id === groupId)
  if (!group) return
  batchWatermarkItems.value = group.items.filter(i => i.type === 'image')
  batchWatermarkSelected.value = []
  batchWatermarkTemplateId.value = ''
  
  try {
    const res = await fetch('/api/media/watermark-templates', {
      headers: { 'Authorization': `Bearer ${token()}` }
    })
    watermarkTemplates.value = await res.json()
  } catch (e) { console.error(e) }
  
  showBatchWatermark.value = true
}

const toggleBatchWatermarkSelect = (id) => {
  const idx = batchWatermarkSelected.value.indexOf(id)
  if (idx >= 0) batchWatermarkSelected.value.splice(idx, 1)
  else batchWatermarkSelected.value.push(id)
}

const doBatchWatermark = async () => {
  if (!batchWatermarkSelected.value.length || !currentGroupIdForMedia.value) return
  isBatchWatermarking.value = true
  globalProcessing.value = true
  try {
    const res = await fetch(`/api/factory/groups/${currentGroupIdForMedia.value}/batch-watermark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
      body: JSON.stringify({
        media_ids: batchWatermarkSelected.value,
        template_id: batchWatermarkTemplateId.value || null
      })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '批量处理失败')
    alert(data.message)
    showBatchWatermark.value = false
    await loadData()
  } catch (e) {
    alert(e.message)
  } finally {
    isBatchWatermarking.value = false
    globalProcessing.value = false
  }
}

// Video Modal Logic
const openVideoModal = (groupId) => {
  currentGroupIdForVideo.value = groupId
  videoUrlInput.value = ''
  videoAutoplayInput.value = false
  videoShowDescInput.value = false
  videoDescInput.value = ''
  showVideoModal.value = true
}

const doAddVideo = async () => {
  if (!videoUrlInput.value || !currentGroupIdForVideo.value) return
  await fetch('/api/factory/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
    body: JSON.stringify({
      group_id: currentGroupIdForVideo.value,
      type: 'video',
      media_url: videoUrlInput.value,
      autoplay: videoAutoplayInput.value ? 1 : 0,
      description: videoDescInput.value,
      show_desc: videoShowDescInput.value ? 1 : 0
    })
  })
  showVideoModal.value = false
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.page-header h1 { margin: 0; font-size: 24px; }
.intro-text { color: #64748b; font-size: 14px; margin-bottom: 24px; }

.group-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); overflow: hidden; }
.group-header { background: #f8fafc; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
.group-title { display: flex; gap: 12px; flex: 1; min-width: 300px; }
.group-title .form-control { flex: 1; font-weight: 600; }
.group-settings { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
.setting-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #475569; }
.short-input { width: 70px; text-align: center; }

.media-container { padding: 20px; }
.media-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.media-header h4 { margin: 0; font-size: 15px; color: #1e293b; }
.media-actions { display: flex; gap: 8px; }

.media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.media-card { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; position: relative; display: flex; flex-direction: column; background: #fff; }
.media-preview { height: 140px; background: #f1f5f9; position: relative; }
.media-preview img { width: 100%; height: 100%; object-fit: cover; }
.video-preview { display: flex; align-items: center; justify-content: center; background: #0f172a; }
.video-icon { font-size: 40px; color: #dc2626; text-shadow: 0 0 10px rgba(0,0,0,0.5); }

.media-badge { position: absolute; top: 8px; left: 8px; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; color: #fff; }
.image-badge { background: rgba(5, 150, 105, 0.9); }
.video-badge { background: rgba(220, 38, 38, 0.9); }

.media-info { padding: 12px; flex: 1; display: flex; flex-direction: column; gap: 10px; }
.media-url { font-size: 12px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.media-settings { display: flex; justify-content: space-between; align-items: center; }
.very-short-input { width: 60px; padding: 4px 8px; height: 28px; }

.btn-delete-media { position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; border-radius: 50%; background: rgba(0,0,0,0.5); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; opacity: 0; transition: opacity 0.2s; }
.media-card:hover .btn-delete-media { opacity: 1; }
.btn-delete-media:hover { background: #ef4444; }

.empty-media { grid-column: 1 / -1; padding: 30px; text-align: center; color: #94a3b8; font-size: 14px; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1; }
.empty-state { padding: 60px; text-align: center; color: #64748b; background: #fff; border-radius: 12px; border: 1px dashed #cbd5e1; }

.lib-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; max-height: 400px; overflow-y: auto; padding-right: 8px; }
.lib-item { aspect-ratio: 1; border-radius: 8px; overflow: hidden; border: 2px solid transparent; box-sizing: border-box; cursor: pointer; position: relative; transition: all 0.15s; }
.lib-item:hover { border-color: #93c5fd; }
.lib-item img { width: 100%; height: 100%; object-fit: cover; }
.lib-item.selected { border-color: #7c3aed; }
.check-icon { position: absolute; top: 6px; right: 6px; width: 20px; height: 20px; background: #7c3aed; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; opacity: 0; }
.lib-item.selected .check-icon { opacity: 1; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.modal { background: #fff; border-radius: 12px; width: 100%; margin: 20px; overflow: hidden; }
.modal-header { padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
.modal-header h3 { margin: 0; font-size: 16px; }
.modal-close { background: none; border: none; font-size: 20px; cursor: pointer; opacity: 0.7; }
.modal-body { padding: 20px; max-height: 60vh; overflow-y: auto; }
.modal-footer { padding: 16px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; }

.btn { padding: 8px 16px; border-radius: 6px; border: 1px solid transparent; cursor: pointer; font-size: 14px; font-weight: 500; }
.btn-primary { background: #2563eb; color: #fff; }
.btn-secondary { background: #f1f5f9; color: #475569; }
.btn-danger { background: #fef2f2; color: #ef4444; border-color: #fecaca; }
.btn-outline { background: transparent; border-color: #cbd5e1; color: #475569; }
.btn-sm { padding: 6px 12px; font-size: 13px; }
.form-control { width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; }
.form-control:focus { outline: none; border-color: #2563eb; }
.form-hint { font-size: 12px; color: #64748b; margin: 0; }
.checkbox-label { cursor: pointer; }

.loading-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loader {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2563eb;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.loader {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #7c3aed;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
