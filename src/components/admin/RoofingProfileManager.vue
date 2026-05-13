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
              <label>表面处理 (Surface)</label>
              <select v-model="currentProfile.surface" class="form-control">
                <option value="ppgi">彩涂彩钢 (PPGI/RAL Color)</option>
                <option value="gi">镀锌表面/锌花 (Galvanized)</option>
                <option value="gl">镀铝锌表面 (Galvalume)</option>
              </select>
            </div>
            <div class="form-group" v-if="currentProfile.surface === 'ppgi'">
              <label>颜色 (RAL Color Hex)</label>
              <div style="display:flex; gap: 10px;">
                <input type="color" v-model="currentProfile.color" style="height:36px; padding:0; cursor:pointer;" />
                <input type="text" v-model="currentProfile.color" class="form-control" placeholder="#3498db" />
              </div>
            </div>
            <div class="form-group">
              <label>优先级 Priority (1-100, 越大越前)</label>
              <input type="number" v-model="currentProfile.sort_order" class="form-control" placeholder="例: 100" />
            </div>
            <div class="form-group" style="grid-column: span 2;">
              <label>上传真实图片替换 3D 渲染 (可选)</label>
              <div style="display:flex; gap:10px; align-items:center;">
                <input type="file" @change="handleImageUpload" accept="image/*" class="form-control" style="padding:4px; height:auto;" />
                <button type="button" class="btn btn-sm btn-outline" v-if="currentProfile.image_url" @click="currentProfile.image_url = ''">移除图片</button>
              </div>
              <img v-if="currentProfile.image_url" :src="currentProfile.image_url" style="height: 100px; margin-top: 10px; border-radius: 4px; border: 1px solid #e2e8f0;"/>
              <p class="form-hint" style="margin-top: 4px; color: #64748b; font-size: 12px;">如果上传了真实图片，前台将显示该图片，不再显示可切换颜色的 3D 渲染图。</p>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
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
  surface: 'ppgi',
  color: '#3498db',
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

const handleImageUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  const formData = new FormData()
  formData.append('file', file)
  try {
    const res = await api.request('/upload', 'POST', formData)
    currentProfile.value.image_url = res.url
  } catch (err) {
    alert('图片上传失败: ' + err.message)
  }
}

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
</style>
