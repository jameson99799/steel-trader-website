<template>
  <div class="roofing-manager">
    <div style="display:flex; gap: 20px; height: 600px;">
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
              <label>截面类型 (Type)</label>
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
          </div>
          
          <div style="margin-top: 20px; display:flex; justify-content: flex-end;">
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? '保存中...' : '💾 保存瓦型数据' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api'
import RoofingProfileGenerator from '../RoofingProfileGenerator.vue'

const profiles = ref([])
const saving = ref(false)

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
  sort_order: 0
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

onMounted(() => {
  loadProfiles()
})
</script>

<style scoped>
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
