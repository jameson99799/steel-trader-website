<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">3D 瓦型图管理与生成器</h1>
      <p class="page-subtitle">管理 3D 瓦型图、2D 工程截面图参数、瓦型分组及生成设置。</p>
    </div>

    <div class="admin-tabs">
      <button :class="['tab-btn', { active: activeTab === 'profiles' }]" @click="activeTab = 'profiles'">
        瓦型管理
      </button>
      <button :class="['tab-btn', { active: activeTab === 'categories' }]" @click="activeTab = 'categories'">
        瓦型分组
      </button>
    </div>

    <!-- Profiles Tab -->
    <div v-if="activeTab === 'profiles'" class="tab-content">
      <div class="toolbar">
        <button class="btn btn-primary" @click="openProfileModal(null)">
          <span class="icon">+</span> 添加新瓦型
        </button>
      </div>

      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>型号</th>
              <th>类型</th>
              <th>表面材质 / 颜色</th>
              <th>尺寸参数</th>
              <th>所属分组</th>
              <th>排序</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in profiles" :key="item.id">
              <td>{{ item.id }}</td>
              <td><strong>{{ item.model }}</strong></td>
              <td>{{ formatType(item.profile_type) }}</td>
              <td>
                <span class="badge">{{ item.surface ? item.surface.toUpperCase() : 'N/A' }}</span>
                <span class="color-dot" v-if="item.color" :style="{ background: item.color }" :title="item.color"></span>
              </td>
              <td class="text-xs">
                宽: {{ item.effective_width }}<br>
                高: {{ item.rib_height }}<br>
                距: {{ item.pitch }}
              </td>
              <td>{{ getCategoryName(item.category_id) }}</td>
              <td>{{ item.sort_order }}</td>
              <td>
                <div class="actions">
                  <button class="btn-icon text-blue" title="编辑" @click="openProfileModal(item)">✏️</button>
                  <button class="btn-icon text-green" title="复制" @click="duplicateProfile(item)">📄</button>
                  <button class="btn-icon text-red" title="删除" @click="deleteProfile(item.id)">🗑️</button>
                </div>
              </td>
            </tr>
            <tr v-if="profiles.length === 0">
              <td colspan="8" class="text-center text-gray">暂无瓦型数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Categories Tab -->
    <div v-if="activeTab === 'categories'" class="tab-content">
      <div class="toolbar">
        <button class="btn btn-primary" @click="openCategoryModal(null)">
          <span class="icon">+</span> 添加分组
        </button>
      </div>

      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>名称</th>
              <th>名称 (英文)</th>
              <th>排序</th>
              <th>前台显示</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in categories" :key="item.id">
              <td>{{ item.id }}</td>
              <td>
                <strong>{{ item.name }}</strong>
                <div v-if="item.translatedLangs && item.translatedLangs.length" style="margin-top: 4px; display: flex; gap: 4px; flex-wrap: wrap;">
                  <span v-for="l in item.translatedLangs" :key="l" style="font-size: 10px; padding: 2px 4px; border-radius: 3px; background: #e0f2fe; color: #0284c7;">{{ l.toUpperCase() }}</span>
                </div>
              </td>
              <td>{{ item.name_en }}</td>
              <td>{{ item.sort_order }}</td>
              <td>
                <span :class="['status-badge', item.is_active ? 'active' : 'inactive']">
                  {{ item.is_active ? '是' : '否' }}
                </span>
              </td>
              <td>
                <div class="actions">
                  <button class="btn-icon text-blue" title="编辑" @click="openCategoryModal(item)">✏️</button>
                  <button class="btn-icon text-red" title="删除" @click="deleteCategory(item.id)">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Profile Modal -->
    <div v-if="showProfileModal" class="modal-overlay" @click.self="showProfileModal = false">
      <div class="modal-container modal-large">
        <div class="modal-header">
          <h3>{{ editingProfile.id ? '编辑瓦型' : '添加新瓦型' }}</h3>
          <button class="close-btn" @click="showProfileModal = false">✕</button>
        </div>
        <div class="modal-body modal-body-split">
          <form @submit.prevent="saveProfile" class="form-grid">
            
            <div class="form-section-title">基本信息</div>
            <div class="form-row">
              <div class="form-group">
                <label>瓦型型号 <span class="req">*</span></label>
                <input type="text" v-model="editingProfile.model" required placeholder="例如: YX50-410-820" />
              </div>
              <div class="form-group">
                <label>所属分组</label>
                <select v-model.number="editingProfile.category_id">
                  <option value="0">未分组</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>截面类型 <span class="req">*</span></label>
                <select v-model="editingProfile.profile_type" required>
                  <option value="trapezoidal">角驰/梯形 (Trapezoidal)</option>
                  <option value="corrugated">波纹型 (Corrugated)</option>
                  <option value="standing_seam">直立锁边 (Standing Seam)</option>
                  <option value="glazed_tile">琉璃瓦 (Glazed Tile)</option>
                  <option value="wall_panel">墙面板 (Wall Panel)</option>
                </select>
              </div>
              <div class="form-group">
                <label>默认表面材质</label>
                <select v-model="editingProfile.surface" @change="handleSurfaceChange">
                  <option value="ppgi">彩涂 (PPGI / PPGL)</option>
                  <option value="gi">镀锌 (Galvanized GI)</option>
                  <option value="gl">镀铝锌 (Galvalume GL)</option>
                </select>
              </div>
              <div class="form-group" v-if="editingProfile.surface === 'ppgi'">
                <label>默认颜色 (HEX或RAL代码)</label>
                <input type="text" v-model="editingProfile.color" placeholder="例如: #1e40af 或 RAL 5010" />
              </div>
            </div>

            <div class="form-section-title">2D 尺寸参数 (用于生成截面图)</div>
            <div class="form-row">
              <div class="form-group">
                <label>有效宽度 (mm)</label>
                <input type="number" step="0.1" v-model.number="editingProfile.effective_width" />
              </div>
              <div class="form-group">
                <label>进料宽度 (mm)</label>
                <input type="number" step="0.1" v-model.number="editingProfile.coil_width" />
              </div>
              <div class="form-group">
                <label>波高/肋高 (mm)</label>
                <input type="number" step="0.1" v-model.number="editingProfile.rib_height" />
              </div>
              <div class="form-group">
                <label>波距 (mm)</label>
                <input type="number" step="0.1" v-model.number="editingProfile.pitch" />
              </div>
            </div>

            <div class="form-section-title">规格参数</div>
            <div class="form-row">
              <div class="form-group">
                <label>材质 (Material)</label>
                <input type="text" v-model="editingProfile.material" />
              </div>
              <div class="form-group">
                <label>厚度 (Thickness TCT)</label>
                <input type="text" v-model="editingProfile.thickness" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>涂层 (Coating)</label>
                <input type="text" v-model="editingProfile.coating" />
              </div>
              <div class="form-group">
                <label>长度 (Length)</label>
                <input type="text" v-model="editingProfile.length" />
              </div>
            </div>
            <div class="form-group">
              <label>应用场景 (Applications)</label>
              <input type="text" v-model="editingProfile.applications" />
            </div>

            <div class="form-section-title">其他设置</div>
            <div class="form-row">
              <div class="form-group">
                <label>排序 (Sort Order)</label>
                <input type="number" v-model.number="editingProfile.sort_order" />
              </div>
              <div class="form-group">
                <label>自定义图片 URL (覆盖3D渲染图)</label>
                <input type="text" v-model="editingProfile.image_url" placeholder="/images/roofing/..." />
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline" @click="showProfileModal = false">取消</button>
              <button type="submit" class="btn btn-primary">保存瓦型</button>
            </div>
          </form>

          <!-- Live Preview Side -->
          <div class="preview-panel">
            <div class="form-section-title">实时预览</div>
            
            <div class="preview-3d">
              <div class="preview-label">3D 渲染预览</div>
              <img v-if="editingProfile.image_url" :src="editingProfile.image_url" alt="3D Preview" class="preview-img" />
              <img v-else :src="getDefaultImage(editingProfile)" alt="3D Preview" class="preview-img" />
            </div>

            <div class="preview-2d">
              <div class="preview-label">2D 工程截面图预览</div>
              <RoofingProfileGenerator :profile="editingProfile" :showDimensions="true" class="admin-generator" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Category Modal -->
    <div v-if="showCategoryModal" class="modal-overlay" @click.self="showCategoryModal = false">
      <div class="modal-container">
        <div class="modal-header">
          <h3>{{ editingCategory.id ? '编辑分组' : '添加分组' }}</h3>
          <button class="close-btn" @click="showCategoryModal = false">✕</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveCategory">
            <div class="form-group">
              <label>名称 (中文/本地语言) <span class="req">*</span></label>
              <input type="text" v-model="editingCategory.name" required />
            </div>
            <div class="form-group">
              <label>名称 (英文)</label>
              <input type="text" v-model="editingCategory.name_en" />
            </div>
            <div class="form-group">
              <label>排序</label>
              <input type="number" v-model.number="editingCategory.sort_order" />
            </div>
            <div class="form-group checkbox-group">
              <label>
                <input type="checkbox" v-model="editingCategory.is_active" :true-value="1" :false-value="0" />
                在前台展示此分组
              </label>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" @click="showCategoryModal = false">取消</button>
              <button type="submit" class="btn btn-primary">保存分组</button>
            </div>
          </form>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import RoofingProfileGenerator from '../../components/RoofingProfileGenerator.vue'

const profiles = ref([])
const categories = ref([])
const activeTab = ref('profiles')

const showProfileModal = ref(false)
const editingProfile = ref({})

const showCategoryModal = ref(false)
const editingCategory = ref({})

const defaultMaterial = computed(() => {
  const s = editingProfile.value?.surface || 'ppgi'
  if (s === 'gi') return 'Galvanized Steel (GI)'
  if (s === 'gl') return 'Aluminum-Zinc Coated Steel (GL)'
  return 'Pre-Painted Steel (PPGI/PPGL)'
})

const defaultThickness = computed(() => {
  const s = editingProfile.value?.surface || 'ppgi'
  if (s === 'gi' || s === 'gl') return '0.12 – 0.80 mm'
  return '0.25 – 0.80 mm'
})

const defaultCoating = computed(() => {
  const s = editingProfile.value?.surface || 'ppgi'
  if (s === 'gi') return 'Z60 – Z275 (Galvanized)'
  if (s === 'gl') return 'AZ50 – AZ150 (Galvalume)'
  return 'PE / SMP / HDP / PVDF'
})

const fetchProfiles = async () => {
  try {
    const res = await fetch('/api/roofing-profiles', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    profiles.value = await res.json()
  } catch (e) {
    console.error(e)
  }
}

const fetchCategories = async () => {
  try {
    const res = await fetch('/api/roofing-profiles/categories', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    categories.value = await res.json()
  } catch (e) {
    console.error(e)
  }
}

const getCategoryName = (id) => {
  if (!id) return '-'
  const c = categories.value.find(c => c.id === id)
  return c ? c.name : '-'
}

const formatType = (type) => {
  const m = { trapezoidal: 'Trapezoidal', corrugated: 'Corrugated', standing_seam: 'Standing Seam', glazed_tile: 'Glazed Tile', wall_panel: 'Wall Panel' }
  return m[type] || type
}

const getDefaultImage = (profile) => {
  const type = profile.profile_type || 'trapezoidal'
  const surface = profile.surface || 'ppgi'
  
  if (type === 'corrugated') {
    if (surface === 'ppgi') return '/images/roofing/corrugated-ppgi.png'
    return surface === 'gl' ? '/images/roofing/corrugated-gl.png' : '/images/roofing/corrugated-gi.png'
  }
  if (type === 'standing_seam') return '/images/roofing/standing-seam.png'
  if (type === 'glazed_tile') return '/images/roofing/glazed-tile.png'
  
  if (surface === 'gi') return '/images/roofing/trapezoidal-gi.png'
  if (surface === 'gl') return '/images/roofing/trapezoidal-gl.png'
  return '/images/roofing/trapezoidal-ppgi.png'
}

// -- Profiles --
const handleSurfaceChange = () => {
  editingProfile.value.material = defaultMaterial.value
  editingProfile.value.thickness = defaultThickness.value
  editingProfile.value.coating = defaultCoating.value
}

const openProfileModal = (item) => {
  if (item) {
    editingProfile.value = { ...item }
    if (!editingProfile.value.material) editingProfile.value.material = defaultMaterial.value
    if (!editingProfile.value.thickness) editingProfile.value.thickness = defaultThickness.value
    if (!editingProfile.value.coating) editingProfile.value.coating = defaultCoating.value
    if (!editingProfile.value.length) editingProfile.value.length = 'Customizable (Max. 12m)'
    if (!editingProfile.value.applications) editingProfile.value.applications = 'Roofing, Wall Cladding, Siding'
  } else {
    editingProfile.value = {
      model: '', profile_type: 'trapezoidal', effective_width: 800, coil_width: 1000, 
      rib_height: 25, pitch: 200, color: '', surface: 'ppgi', sort_order: 0, 
      category_id: 0, image_url: '', 
      material: 'Pre-Painted Steel (PPGI/PPGL)', 
      thickness: '0.25 – 0.80 mm', 
      coating: 'PE / SMP / HDP / PVDF', 
      length: 'Customizable (Max. 12m)', 
      applications: 'Roofing, Wall Cladding, Siding'
    }
  }
  showProfileModal.value = true
}

const saveProfile = async () => {
  const isEdit = !!editingProfile.value.id
  const url = isEdit ? `/api/roofing-profiles/${editingProfile.value.id}` : '/api/roofing-profiles'
  const method = isEdit ? 'PUT' : 'POST'
  
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(editingProfile.value)
    })
    if (res.ok) {
      showProfileModal.value = false
      fetchProfiles()
    } else {
      alert('Failed to save profile')
    }
  } catch (e) {
    console.error(e)
  }
}

const duplicateProfile = async (item) => {
  const copy = { ...item }
  delete copy.id
  copy.model = copy.model + ' (Copy)'
  editingProfile.value = copy
  showProfileModal.value = true
}

const deleteProfile = async (id) => {
  if (!confirm('Are you sure you want to delete this profile?')) return
  try {
    await fetch(`/api/roofing-profiles/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    fetchProfiles()
  } catch (e) {
    console.error(e)
  }
}

// -- Categories --
const openCategoryModal = (item) => {
  if (item) {
    editingCategory.value = { ...item }
  } else {
    editingCategory.value = { name: '', name_en: '', sort_order: 0, is_active: 1 }
  }
  showCategoryModal.value = true
}

const saveCategory = async () => {
  const isEdit = !!editingCategory.value.id
  const url = isEdit ? `/api/roofing-profiles/categories/${editingCategory.value.id}` : '/api/roofing-profiles/categories'
  const method = isEdit ? 'PUT' : 'POST'
  
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(editingCategory.value)
    })
    if (res.ok) {
      showCategoryModal.value = false
      fetchCategories()
    } else {
      alert('Failed to save category')
    }
  } catch (e) {
    console.error(e)
  }
}

const deleteCategory = async (id) => {
  if (!confirm('Are you sure you want to delete this category? Associated profiles will be uncategorized.')) return
  try {
    await fetch(`/api/roofing-profiles/categories/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    fetchCategories()
    fetchProfiles()
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => {
  fetchCategories()
  fetchProfiles()
})
</script>

<style scoped>
.admin-page { padding: 30px; background: #f8fafc; min-height: calc(100vh - 60px); }
.page-header { margin-bottom: 24px; }
.page-title { font-size: 24px; font-weight: 700; color: #1e293b; margin: 0 0 8px; }
.page-subtitle { color: #64748b; font-size: 14px; margin: 0; }

.admin-tabs {
  display: flex; gap: 4px; background: #e2e8f0; padding: 4px; border-radius: 8px; width: fit-content; margin-bottom: 20px;
}
.tab-btn {
  padding: 8px 16px; border: none; background: transparent; color: #475569; font-weight: 600; cursor: pointer; border-radius: 6px; font-size: 14px;
}
.tab-btn.active { background: #fff; color: #0f172a; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

.toolbar { margin-bottom: 16px; display: flex; justify-content: flex-end; }
.btn { padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; border: 1px solid transparent; }
.btn-primary { background: #2563eb; color: #fff; }
.btn-primary:hover { background: #1d4ed8; }
.btn-outline { background: #fff; border-color: #cbd5e1; color: #334155; }
.btn-outline:hover { background: #f8fafc; }

.data-table-wrap { background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.data-table th, .data-table td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: left; }
.data-table th { background: #f8fafc; color: #475569; font-weight: 600; font-size: 13px; text-transform: uppercase; }
.data-table tbody tr:hover { background: #f8fafc; }

.actions { display: flex; gap: 8px; }
.btn-icon { background: none; border: none; cursor: pointer; font-size: 16px; opacity: 0.7; transition: opacity 0.2s; }
.btn-icon:hover { opacity: 1; transform: scale(1.1); }

.badge { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-weight: 600; color: #475569; }
.color-dot { display: inline-block; width: 14px; height: 14px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.1); vertical-align: middle; margin-left: 6px; }
.status-badge { padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; }
.status-badge.active { background: #dcfce7; color: #166534; }
.status-badge.inactive { background: #fee2e2; color: #991b1b; }

.text-xs { font-size: 12px; color: #64748b; line-height: 1.4; }
.text-center { text-align: center; }
.text-gray { color: #94a3b8; }

/* Modals */
.modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal-container { background: #fff; width: 100%; max-width: 500px; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); max-height: 90vh; display: flex; flex-direction: column; }
.modal-large { max-width: 1000px; }
.modal-header { padding: 20px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
.modal-header h3 { margin: 0; font-size: 18px; color: #0f172a; }
.close-btn { background: none; border: none; font-size: 20px; color: #64748b; cursor: pointer; }
.modal-body { padding: 24px; overflow-y: auto; flex: 1; }
.modal-body-split { display: grid; grid-template-columns: 1.2fr 1fr; gap: 30px; }
.modal-footer { margin-top: 24px; display: flex; justify-content: flex-end; gap: 12px; grid-column: 1 / -1; }

.preview-panel { background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 20px; }
.preview-label { font-size: 11px; font-weight: 800; color: #64748b; letter-spacing: 1px; margin-bottom: 8px; }
.preview-3d { display: flex; flex-direction: column; align-items: center; background: #fff; padding: 12px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.preview-img { width: 100%; max-height: 200px; object-fit: contain; }
.preview-2d { background: #fff; padding: 12px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.admin-generator { max-height: 200px; }

.form-grid { display: flex; flex-direction: column; gap: 16px; }
.form-section-title { font-size: 15px; font-weight: 700; color: #334155; margin: 24px 0 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
.form-section-title:first-child { margin-top: 0; }
.form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 13px; font-weight: 600; color: #475569; }
.form-group input, .form-group select { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; color: #1e293b; outline: none; }
.form-group input:focus, .form-group select:focus { border-color: #3b82f6; }
.checkbox-group { flex-direction: row; align-items: center; }
.checkbox-group input[type="checkbox"] { width: 16px; height: 16px; }
.req { color: #ef4444; }
.mb-15 { margin-bottom: 15px; }
</style>
