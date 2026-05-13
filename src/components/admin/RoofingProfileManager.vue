<template>
  <div class="roofing-manager">
    <div class="tabs" style="margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; display:flex; gap:20px;">
      <div :class="['tab', activeTab === 'profiles' ? 'active' : '']" @click="activeTab = 'profiles'">瓦型管理</div>
      <div :class="['tab', activeTab === 'categories' ? 'active' : '']" @click="activeTab = 'categories'">瓦型分组管理</div>
    </div>

    <!-- Profiles Tab -->
    <div v-if="activeTab === 'profiles'" style="display:flex; gap: 20px; height: 600px;">
      <!-- Left side: List -->
      <div style="flex: 1; border-right: 1px solid #e2e8f0; padding-right: 20px; overflow-y: auto;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px;">
          <h4 style="margin:0;">已保存的瓦型 ({{ profiles.length }})</h4>
          <button class="btn btn-sm btn-primary" @click="createNew">+ 新建</button>
        </div>
        <div class="profile-list">
          <div 
            v-for="p in profiles" 
            :key="p.id" 
            :class="['profile-item', currentProfile.id === p.id ? 'active' : '']"
            @click="editProfile(p)"
          >
            <div style="font-weight: 600;">{{ p.model || '未命名' }}</div>
            <div style="font-size: 12px; color: #64748b;">{{ getTypeLabel(p.profile_type) }}</div>
            <div style="font-size: 12px; color: #94a3b8;">{{ p.rib_height }} / {{ p.pitch }} / {{ p.effective_width }}</div>
            <div style="position: absolute; top: 8px; right: 8px; display: flex; gap: 4px;" class="action-btns">
              <button class="btn-action" @click.stop="copyProfile(p)" title="复制">📋</button>
              <button class="btn-action btn-delete" @click.stop="deleteProfile(p.id)" title="删除">×</button>
            </div>
          </div>
          <div v-if="!profiles.length" style="color:#94a3b8; font-size:13px; text-align:center; padding: 20px;">暂无瓦型数据</div>
        </div>
      </div>
      
      <!-- Right side: Editor & 3D Preview -->
      <div style="flex: 2; display:flex; flex-direction: column; gap: 20px; overflow-y:auto; padding-right:10px;">
        <div class="preview-area" style="background:#1e293b; border-radius:8px; overflow:hidden; position:relative; min-height:240px;">
          <RoofingProfileGenerator :profile="currentProfile" width="100%" height="240px" :showDimensions="true" />
          <div style="position:absolute; top:10px; right:10px; color:rgba(255,255,255,0.7); font-size:12px; background:rgba(0,0,0,0.3); padding:4px 8px; border-radius:4px;">
            实时 3D 预览
          </div>
        </div>
        
        <form @submit.prevent="saveProfile" class="editor-form">
          <div class="form-grid">
            <div class="form-group">
              <label>瓦型型号 (Model)</label>
              <input v-model="currentProfile.model" class="form-control" placeholder="例: YX50-410-820" required />
            </div>
            <div class="form-group">
              <label>所属分组 (Category)</label>
              <select v-model="currentProfile.category_id" class="form-control">
                <option value="0">无分组 / Default</option>
                <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>截面类型 (用于3D渲染)</label>
              <select v-model="currentProfile.profile_type" class="form-control">
                <option value="trapezoidal">角驰/梯形 (Trapezoidal)</option>
                <option value="corrugated">波纹型 (Corrugated / Sine)</option>
                <option value="standing_seam">直立锁边 (Standing Seam)</option>
                <option value="glazed_tile">琉璃瓦 (Glazed Tile)</option>
                <option value="wall_panel">墙面板 (Wall Panel)</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>波高/肋高 Rib Height (mm)</label>
              <input type="number" v-model="currentProfile.rib_height" class="form-control" placeholder="例: 50" required />
            </div>
            <div class="form-group">
              <label>波距 Pitch (mm)</label>
              <input type="number" v-model="currentProfile.pitch" class="form-control" placeholder="例: 410" required />
            </div>
            
            <div class="form-group">
              <label>有效宽度 Effective Width (mm)</label>
              <input type="number" v-model="currentProfile.effective_width" class="form-control" placeholder="例: 820" required />
            </div>
            <div class="form-group">
              <label>进料宽度 Coil Width (mm)</label>
              <input type="number" v-model="currentProfile.coil_width" class="form-control" placeholder="例: 1000" />
            </div>
            

            <div class="form-group">
              <label>优先级 Priority (1-100, 越大越前)</label>
              <input type="number" v-model="currentProfile.sort_order" class="form-control" placeholder="例: 100" />
            </div>
            <div class="form-group" style="grid-column: span 2;">
              <label>上传真实图片替换 3D 渲染 (可选)</label>
              <div style="display:flex; gap:10px; align-items:center;">
                <button type="button" class="btn btn-sm btn-outline" style="color:#7c3aed;border-color:#7c3aed;" @click="showMediaPicker=true">📷 从图库选择</button>
                <button type="button" class="btn btn-sm btn-outline" style="color:#d97706;border-color:#fcd34d;" @click="openAiModal">🤖 AI 生图 (自动)</button>
                <button type="button" class="btn btn-sm btn-outline" v-if="currentProfile.image_url" @click="currentProfile.image_url = ''">移除图片</button>
              </div>
              
              <div style="margin-top:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:12px;">
                <label style="font-size:13px;color:#475569;margin-bottom:6px;display:block;font-weight:600;">🤖 AI 生图提示词 (供 Midjourney/DALL-E 手动生成使用)：</label>
                <div style="position:relative;">
                  <textarea readonly class="form-control" style="font-size:12px; background:#fff; color:#334155; min-height:80px; resize:none;">{{ aiCopyPrompt }}</textarea>
                  <button type="button" class="btn btn-xs btn-outline" style="position:absolute; bottom:8px; right:8px;" @click="copyPrompt">复制</button>
                </div>
                <p style="font-size:12px;color:#94a3b8;margin-top:6px;">提示词已包含当前选择的瓦型、高度、波距等参数，你可以直接复制它到 AI 画图工具中生成对应的 2D 图片或材质。</p>
              </div>

              <img v-if="currentProfile.image_url" :src="currentProfile.image_url" style="height: 100px; margin-top: 10px; border-radius: 4px; border: 1px solid #e2e8f0;"/>
              <p class="form-hint" style="margin-top: 4px; color: #64748b; font-size: 12px;">如果选择了真实图片，前台将显示该图片，不再显示可切换颜色的 3D 渲染图。</p>
            </div>
          </div>
          
          <div style="margin-top: 20px; display:flex; justify-content: flex-end;">
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? '保存中...' : '💾 保存瓦型数据' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- AI Generation Modal -->
    <div v-if="showAiModal" class="modal-overlay" @click.self="showAiModal = false" style="z-index: 10000;">
      <div class="modal" style="max-width: 800px; width: 90vw;">
        <div class="modal-header">
          <h3>🤖 AI 瓦型图生成</h3>
          <button class="modal-close" @click="showAiModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>AI 提示词 (可修改)</label>
            <textarea v-model="aiPrompt" class="form-control" style="height: 80px; resize: vertical;"></textarea>
          </div>
          <div style="margin-top: 10px; text-align: right;">
            <button class="btn btn-primary" @click="generateAiImage" :disabled="aiGenerating">
              {{ aiGenerating ? '✨ 生成中...' : '✨ 开始生成' }}
            </button>
          </div>

          <div style="margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
            <div style="display:flex; justify-content:space-between; margin-bottom: 10px;">
              <h4 style="margin:0;">历史生成记录</h4>
              <button class="btn btn-sm btn-outline" style="color:#ef4444;" @click="deleteSelectedAiImages" v-if="selectedAiImages.length">
                删除选中 ({{ selectedAiImages.length }})
              </button>
            </div>
            
            <div class="ai-gallery" v-if="aiHistory.length">
              <div v-for="img in aiHistory" :key="img.id" class="ai-img-card">
                <input type="checkbox" :value="img.id" v-model="selectedAiImages" class="img-check" />
                <img :src="img.image_url" class="img-thumb" />
                <div class="img-overlay">
                  <button class="btn btn-sm btn-primary" @click="useAiImage(img.image_url)">使用此图</button>
                </div>
              </div>
            </div>
            <div v-else style="text-align:center; color:#94a3b8; padding: 30px;">
              暂无生图记录，快去生成第一张吧！
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Categories Tab -->
    <div v-if="activeTab === 'categories'" style="height: 600px; overflow-y: auto;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
        <h4 style="margin:0;">瓦型分组列表</h4>
        <div style="display:flex; gap:10px;">
          <input v-model="newCatName" class="form-control" placeholder="新增分组名称 (英文)" style="width:200px;" />
          <button class="btn btn-primary" @click="createCategory">+ 新增分组</button>
        </div>
      </div>
      
      <table class="data-table" style="width:100%; border-collapse:collapse; text-align:left;">
        <thead>
          <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0;">
            <th style="padding:10px;">ID</th>
            <th style="padding:10px;">分组名称</th>
            <th style="padding:10px;">优先级排序 (大靠前)</th>
            <th style="padding:10px;">是否在前台展示</th>
            <th style="padding:10px; width:120px;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in categories" :key="c.id" style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:10px;">{{ c.id }}</td>
            <td style="padding:10px;">
              <input v-model="c.name" class="form-control" @blur="updateCategory(c)" />
            </td>
            <td style="padding:10px;">
              <input type="number" v-model="c.sort_order" class="form-control" @blur="updateCategory(c)" style="width:80px;" />
            </td>
            <td style="padding:10px;">
              <input type="checkbox" v-model="c.is_active" :true-value="1" :false-value="0" @change="updateCategory(c)" />
            </td>
            <td style="padding:10px;">
              <button class="btn btn-sm btn-outline" style="color:#ef4444; border-color:#ef4444;" @click="deleteCategory(c.id)">删除</button>
            </td>
          </tr>
          <tr v-if="!categories.length">
            <td colspan="5" style="padding:20px; text-align:center; color:#94a3b8;">暂无分组</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Media Library Picker -->
    <div v-if="showMediaPicker" class="modal-overlay" @click.self="showMediaPicker=false" style="z-index: 10000;">
      <div class="modal" style="max-width:700px;">
        <div class="modal-header" style="background:#f5f3ff;color:#7c3aed;">
          <h3>📷 从图库选择</h3>
          <button class="modal-close" @click="showMediaPicker=false">&times;</button>
        </div>
        <div class="modal-body">
          <div style="display:flex;gap:8px;margin-bottom:12px;">
            <input v-model="mediaPickerSearch" class="form-control" placeholder="搜索文件名..." @input="loadMediaPicker" style="max-width:200px;" />
            <select v-model="mediaPickerGroup" class="form-control" @change="loadMediaPicker" style="max-width:140px;">
              <option value="">全部分组</option>
              <option v-for="g in mediaGroups" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
          </div>
          <div v-if="mediaPickerItems.length" class="import-grid">
            <div v-for="item in mediaPickerItems" :key="item.id" :class="['import-item', { selected: mediaPickerSelected === item.filepath }]" @click="mediaPickerSelected = item.filepath">
              <img :src="item.filepath" />
              <div class="import-check">✓</div>
            </div>
          </div>
          <p v-else style="color:#94a3b8;text-align:center;padding:20px;">暂无图片</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showMediaPicker=false">取消</button>
          <button type="button" class="btn btn-primary" style="background:#7c3aed;" @click="doImportFromMedia" :disabled="!mediaPickerSelected">使用选中的图片</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import api from '../../api'
import RoofingProfileGenerator from '../RoofingProfileGenerator.vue'

const activeTab = ref('profiles')
const profiles = ref([])
const categories = ref([])
const saving = ref(false)
const newCatName = ref('')

const getEmptyProfile = () => ({
  id: null,
  model: 'YX50-410-820',
  profile_type: 'trapezoidal',
  effective_width: 820,
  coil_width: 1000,
  rib_height: 50,
  pitch: 410,
  sort_order: 0,
  category_id: 0,
  image_url: ''
})

const currentProfile = ref(getEmptyProfile())

const getTypeLabel = (t) => {
  const map = {
    trapezoidal: '角驰/梯形', corrugated: '波纹型', standing_seam: '直立锁边',
    glazed_tile: '琉璃瓦', wall_panel: '墙面板'
  }
  return map[t] || t
}

const loadProfiles = async () => {
  try {
    const res = await api.request('/roofing-profiles')
    profiles.value = res || []
    if (!currentProfile.value.id && profiles.value.length > 0) {
      editProfile(profiles.value[0])
    }
  } catch (e) {
    console.error('Failed to load profiles', e)
  }
}

const loadCategories = async () => {
  try {
    const res = await api.request('/roofing-profiles/categories')
    categories.value = res || []
  } catch (e) {
    console.error('Failed to load roofing categories', e)
  }
}

const createNew = () => {
  currentProfile.value = getEmptyProfile()
}

const editProfile = (p) => {
  currentProfile.value = JSON.parse(JSON.stringify(p))
}

const saveProfile = async () => {
  saving.value = true
  try {
    const p = currentProfile.value
    if (p.id) {
      await api.request(`/roofing-profiles/${p.id}`, 'PUT', p)
    } else {
      const res = await api.request('/roofing-profiles', 'POST', p)
      currentProfile.value.id = res.id
    }
    await loadProfiles()
    alert('保存成功！')
  } catch (e) {
    alert('保存失败: ' + e.message)
  } finally {
    saving.value = false
  }
}

const deleteProfile = async (id) => {
  if (!confirm('确定要删除这个瓦型吗？')) return
  try {
    await api.request(`/roofing-profiles/${id}`, 'DELETE')
    if (currentProfile.value.id === id) createNew()
    await loadProfiles()
  } catch (e) {
    alert('删除失败: ' + e.message)
  }
}

const copyProfile = async (p) => {
  try {
    const copy = JSON.parse(JSON.stringify(p))
    delete copy.id
    copy.model = copy.model + ' (Copy)'
    const res = await api.request('/roofing-profiles', 'POST', copy)
    currentProfile.value = { ...copy, id: res.id }
    await loadProfiles()
  } catch (e) {
    alert('复制失败: ' + e.message)
  }
}

// AI Prompt Generation
const aiCopyPrompt = computed(() => {
  const p = currentProfile.value
  const tStr = getTypeLabel(p.profile_type)
  return `A highly realistic, professional studio photograph of a single piece of ${tStr} roofing sheet. Material: Galvanized Steel (GI) / Prepainted (PPGI). Dimensions: Coil width ${p.coil_width}mm, Effective width ${p.effective_width}mm, Rib height ${p.rib_height}mm, Pitch ${p.pitch}mm. Clean white background, perfect studio lighting, metallic texture, 8k resolution, photorealistic. --ar 16:9`
})

const copyPrompt = () => {
  navigator.clipboard.writeText(aiCopyPrompt.value)
  alert('提示词已复制！')
}

// Media Picker
const showMediaPicker = ref(false)
const mediaPickerSearch = ref('')
const mediaPickerGroup = ref('')
const mediaPickerItems = ref([])
const mediaPickerSelected = ref('')
const mediaGroups = ref([])

async function loadMediaPicker() {
  const params = new URLSearchParams({ per_page: '50' })
  if (mediaPickerSearch.value) params.set('search', mediaPickerSearch.value)
  if (mediaPickerGroup.value) params.set('group_id', mediaPickerGroup.value)
  try {
    const res = await fetch(`/api/media?${params}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
    const data = await res.json()
    mediaPickerItems.value = data.items || []
  } catch (e) { console.error(e) }
}

async function loadMediaGroups() {
  try {
    const res = await fetch('/api/media/groups', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
    mediaGroups.value = await res.json()
  } catch (e) { console.error(e) }
}

function doImportFromMedia() {
  if (mediaPickerSelected.value) {
    currentProfile.value.image_url = mediaPickerSelected.value
  }
  showMediaPicker.value = false
  mediaPickerSelected.value = ''
}

function toggleMediaPickerSelect(fp) {
  if (mediaPickerSelected.value === fp) {
    mediaPickerSelected.value = ''
  } else {
    mediaPickerSelected.value = fp
  }
}

watch(showMediaPicker, (v) => {
  if (v) {
    loadMediaGroups()
    mediaPickerGroup.value = localStorage.getItem('_lastMediaGroup') || ''
    loadMediaPicker()
    mediaPickerSelected.value = ''
  }
})
watch(mediaPickerGroup, v => { if (v) localStorage.setItem('_lastMediaGroup', v) })

// --- Category Management ---
const createCategory = async () => {
  if (!newCatName.value) return
  try {
    await api.request('/roofing-profiles/categories', 'POST', { name: newCatName.value, sort_order: 0, is_active: 1 })
    newCatName.value = ''
    await loadCategories()
  } catch (e) {
    alert('分组创建失败: ' + e.message)
  }
}

const updateCategory = async (c) => {
  try {
    await api.request(`/roofing-profiles/categories/${c.id}`, 'PUT', { name: c.name, sort_order: c.sort_order, is_active: c.is_active })
  } catch (e) {
    alert('分组更新失败: ' + e.message)
  }
}

const deleteCategory = async (id) => {
  if (!confirm('确定删除这个分组吗？相关瓦型将变为无分组状态。')) return
  try {
    await api.request(`/roofing-profiles/categories/${id}`, 'DELETE')
    await loadCategories()
    await loadProfiles() // Reload profiles because category assignment changed
  } catch (e) {
    alert('删除分组失败: ' + e.message)
  }
}

// ─── AI Image Generation ──────────────────────────────────────────────────
const showAiModal = ref(false)
const aiPrompt = ref('')
const aiGenerating = ref(false)
const aiHistory = ref([])
const selectedAiImages = ref([])

const generatePrompt = () => {
  const p = currentProfile.value
  let surfaceStr = 'silver metallic finish, highly detailed smooth texture'

  let typeStr = p.profile_type || 'trapezoidal'
  if (typeStr === 'corrugated') typeStr = 'corrugated steel roofing sheet panel with sine-wave corrugations'
  else if (typeStr === 'standing_seam') typeStr = 'standing seam steel roofing sheet panel'
  else if (typeStr === 'glazed_tile') typeStr = 'glazed tile effect steel roofing sheet panel'
  else typeStr = 'trapezoidal steel roofing sheet panel'

  return `Professional 3D isometric rendering of a ${typeStr}, ${surfaceStr}. The panel shows 4-5 repeating profiles, viewed from a 30-degree isometric angle showing the top surface and front edge. Clean white background. Photorealistic product rendering style like a manufacturer datasheet. No text, no labels, no dimensions. Sharp crisp edges.`
}

const openAiModal = async () => {
  if (!currentProfile.value.id) {
    alert('请先保存瓦型再进行生图！')
    return
  }
  aiPrompt.value = generatePrompt()
  selectedAiImages.value = []
  showAiModal.value = true
  await loadAiHistory()
}

const loadAiHistory = async () => {
  try {
    aiHistory.value = await api.request(`/ai/images/roofing_profile/${currentProfile.value.id}`)
  } catch (e) {
    console.error('Failed to load AI history', e)
  }
}

const generateAiImage = async () => {
  aiGenerating.value = true
  try {
    const res = await api.request('/ai/generate-image', 'POST', {
      target_type: 'roofing_profile',
      target_id: currentProfile.value.id,
      prompt: aiPrompt.value,
      size: '1024x1024'
    })
    if (res.success) {
      await loadAiHistory()
    }
  } catch (e) {
    alert('生图失败: ' + e.message)
  } finally {
    aiGenerating.value = false
  }
}

const deleteSelectedAiImages = async () => {
  if (!confirm(`确定删除选中的 ${selectedAiImages.value.length} 张图片？`)) return
  try {
    await api.request('/ai/images/delete', 'POST', { ids: selectedAiImages.value })
    selectedAiImages.value = []
    await loadAiHistory()
  } catch (e) {
    alert('删除失败: ' + e.message)
  }
}

const useAiImage = (url) => {
  currentProfile.value.image_url = url
  showAiModal.value = false
}

onMounted(() => {
  loadCategories()
  loadProfiles()
})
</script>

<style scoped>
.tabs {
  margin-bottom: 20px;
}
.tab {
  padding: 10px 0;
  cursor: pointer;
  font-weight: 600;
  color: #64748b;
  border-bottom: 2px solid transparent;
}
.tab:hover {
  color: #3b82f6;
}
.tab.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

.profile-item {
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  margin-bottom: 10px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}
.profile-item:hover {
  border-color: #94a3b8;
}
.profile-item.active {
  border-color: #3b82f6;
  background: #eff6ff;
}
.action-btns {
  display: none;
}
.profile-item:hover .action-btns {
  display: flex;
}
.btn-action {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
}
.btn-action:hover {
  background: #f1f5f9;
  border-radius: 4px;
}
.btn-delete {
  color: #ef4444;
  font-size: 18px;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}
.form-group label {
  display: block;
  font-size: 13px;
  color: #64748b;
  margin-bottom: 6px;
  font-weight: 600;
}
.form-control {
  width: 100%;
  height: 36px;
  padding: 0 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #f8fafc;
}
.form-control:focus {
  outline: none;
  border-color: #3b82f6;
  background: #fff;
}

.ai-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 15px;
}
.ai-img-card {
  position: relative;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  background: #f8fafc;
  aspect-ratio: 1/1;
}
.ai-img-card .img-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ai-img-card .img-check {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  width: 18px;
  height: 18px;
  cursor: pointer;
}
.ai-img-card .img-overlay {
  position: absolute;
  bottom: -40px;
  left: 0;
  width: 100%;
  background: rgba(0,0,0,0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 0;
  transition: bottom 0.2s;
}
.ai-img-card:hover .img-overlay {
  bottom: 0;
}

/* Import image picker grid */
.import-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; max-height: 400px; overflow-y: auto; }
.import-item { position: relative; aspect-ratio: 1; border: 2px solid #e2e8f0; border-radius: 8px; overflow: hidden; cursor: pointer; transition: all 0.15s; }
.import-item img { width: 100%; height: 100%; object-fit: cover; }
.import-item:hover { border-color: #93c5fd; }
.import-item.selected { border-color: #7c3aed; }
.import-item .import-check { position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; border-radius: 50%;
  background: #7c3aed; color: #fff; font-size: 14px; display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.15s; }
.import-item.selected .import-check { opacity: 1; }
</style>
