<template>
  <div class="ai-settings-page">
    <h1>🤖 AI 渠道设置</h1>
    <p class="page-desc">管理 AI 服务渠道，支持 OpenAI、DeepSeek、Anthropic 等兼容 API。</p>

    <div class="card">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
        <span>AI 渠道列表</span>
        <button class="btn btn-primary btn-sm" @click="showAdd = true">➕ 添加渠道</button>
      </div>
      <div class="card-body">
        <table v-if="channels.length" class="table">
          <thead>
            <tr>
              <th>名称</th>
              <th>API URL</th>
              <th>API Key</th>
              <th>模型</th>
              <th>默认</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ch in channels" :key="ch.id">
              <td><strong>{{ ch.name }}</strong></td>
              <td style="font-size:13px;color:#64748b;">{{ ch.api_url }}</td>
              <td style="font-size:13px;font-family:monospace;">{{ ch.api_key_display }}</td>
              <td>
                <span v-for="m in ch.models" :key="m" class="model-tag">{{ m }}</span>
                <span v-if="!ch.models.length" style="color:#94a3b8;font-size:13px;">未添加</span>
              </td>
              <td>
                <span v-if="ch.is_default" class="badge badge-success">默认</span>
              </td>
              <td>
                <button class="btn btn-sm btn-secondary" @click="editChannel(ch)">编辑</button>
                <button class="btn btn-sm btn-outline" style="color:#0077b5;border-color:#0077b5;" @click="fetchModels(ch)">获取模型</button>
                <button class="btn btn-sm btn-danger" @click="deleteChannel(ch)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else style="text-align:center;color:#94a3b8;padding:30px;">暂无 AI 渠道，请点击「添加渠道」</p>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAdd || editingChannel" class="modal-overlay" @click.self="closeModal">
      <div class="modal" style="max-width:580px;">
        <div class="modal-header">
          <h3>{{ editingChannel ? '编辑渠道' : '添加渠道' }}</h3>
          <button class="modal-close" @click="closeModal">&times;</button>
        </div>
        <form @submit.prevent="saveChannel">
          <div class="modal-body">
            <div class="form-group">
              <label>渠道名称</label>
              <input v-model="form.name" class="form-control" placeholder="如：OpenAI / DeepSeek / Anthropic" required />
            </div>
            <div class="form-group">
              <label>API URL <span class="hint">OpenAI 兼容格式，如 https://api.openai.com/v1</span></label>
              <input v-model="form.api_url" class="form-control" placeholder="https://api.openai.com/v1" required />
            </div>
            <div class="form-group">
              <label>API Key</label>
              <input v-model="form.api_key" class="form-control" type="password" placeholder="sk-..." required />
            </div>
            <div class="form-group">
              <label>已添加模型</label>
              <div class="models-list">
                <span v-for="(m, i) in form.models" :key="i" class="model-tag removable" @click="form.models.splice(i, 1)">
                  {{ m }} ✕
                </span>
                <span v-if="!form.models.length" style="color:#94a3b8;font-size:13px;">点击下方「获取模型」添加</span>
              </div>
              <div style="display:flex;gap:8px;margin-top:8px;">
                <input v-model="manualModel" class="form-control" placeholder="手动输入模型名称" style="flex:1;" @keyup.enter.prevent="addManualModel" />
                <button type="button" class="btn btn-sm btn-secondary" @click="addManualModel">添加</button>
                <button type="button" class="btn btn-sm btn-outline" style="color:#0077b5;border-color:#0077b5;" @click="fetchModelsForForm" :disabled="fetchingModels">
                  {{ fetchingModels ? '获取中...' : '获取模型' }}
                </button>
              </div>
            </div>
            <!-- Model Selection Popup -->
            <div v-if="availableModels.length" class="model-picker">
              <p style="font-weight:600;margin:0 0 8px;">选择模型（可多选）：</p>
              <div class="model-grid">
                <label v-for="m in availableModels" :key="m" class="model-option">
                  <input type="checkbox" :value="m" v-model="selectedModels" />
                  <span>{{ m }}</span>
                </label>
              </div>
              <div style="display:flex;gap:8px;margin-top:10px;">
                <button type="button" class="btn btn-sm btn-primary" @click="confirmModels">确认添加</button>
                <button type="button" class="btn btn-sm btn-secondary" @click="availableModels = []">取消</button>
              </div>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" v-model="form.is_default" /> 设为默认渠道
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeModal">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api'

const channels = ref([])
const showAdd = ref(false)
const editingChannel = ref(null)
const saving = ref(false)
const fetchingModels = ref(false)
const availableModels = ref([])
const selectedModels = ref([])
const manualModel = ref('')

const form = ref({ name: '', api_url: 'https://api.openai.com/v1', api_key: '', models: [], is_default: false })

async function loadChannels() {
  try { channels.value = await api.getAIChannels() } catch (e) { console.error(e) }
}

function editChannel(ch) {
  editingChannel.value = ch
  form.value = { name: ch.name, api_url: ch.api_url, api_key: ch.api_key_display, models: [...ch.models], is_default: !!ch.is_default }
  availableModels.value = []
}

function closeModal() {
  showAdd.value = false
  editingChannel.value = null
  form.value = { name: '', api_url: 'https://api.openai.com/v1', api_key: '', models: [], is_default: false }
  availableModels.value = []
}

async function saveChannel() {
  saving.value = true
  try {
    if (editingChannel.value) {
      await api.updateAIChannel(editingChannel.value.id, form.value)
    } else {
      await api.createAIChannel(form.value)
    }
    closeModal()
    await loadChannels()
  } catch (e) { alert(e.message) }
  finally { saving.value = false }
}

async function deleteChannel(ch) {
  if (!confirm(`确定删除渠道 "${ch.name}"？`)) return
  try { await api.deleteAIChannel(ch.id); await loadChannels() } catch (e) { alert(e.message) }
}

async function fetchModels(ch) {
  try {
    const res = await api.getAIModels(ch.id)
    alert(`${ch.name} 可用模型(${res.models.length}):\n${res.models.join('\n')}`)
  } catch (e) { alert('获取失败: ' + e.message) }
}

async function fetchModelsForForm() {
  if (!form.value.api_url || !form.value.api_key) { alert('请先填写 API URL 和 API Key'); return }
  fetchingModels.value = true
  try {
    // If editing, use the channel id; otherwise create a temp channel
    let models = []
    if (editingChannel.value) {
      const res = await api.getAIModels(editingChannel.value.id)
      models = res.models
    } else {
      // Temporarily save, fetch, then we'll show the picker
      const tempRes = await api.createAIChannel({ ...form.value, name: form.value.name || 'Temp' })
      try {
        const res = await api.getAIModels(tempRes.id)
        models = res.models
      } finally {
        await api.deleteAIChannel(tempRes.id)
      }
    }
    availableModels.value = models
    selectedModels.value = [...form.value.models]
  } catch (e) { alert('获取模型失败: ' + e.message) }
  finally { fetchingModels.value = false }
}

function confirmModels() {
  const unique = [...new Set([...form.value.models, ...selectedModels.value])]
  form.value.models = unique
  availableModels.value = []
}

function addManualModel() {
  const m = manualModel.value.trim()
  if (m && !form.value.models.includes(m)) { form.value.models.push(m) }
  manualModel.value = ''
}

onMounted(loadChannels)
</script>

<style scoped>
.ai-settings-page { max-width: 1100px; }
.page-desc { color: #64748b; margin-bottom: 24px; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { border: 1px solid #e2e8f0; padding: 10px 14px; text-align: left; vertical-align: middle; }
.table th { background: #f8fafc; font-weight: 600; }
.model-tag {
  display: inline-block; background: #ede9fe; color: #6d28d9;
  padding: 2px 10px; border-radius: 12px; font-size: 12px; margin: 2px 3px;
}
.model-tag.removable { cursor: pointer; }
.model-tag.removable:hover { background: #fecaca; color: #dc2626; }
.models-list { min-height: 36px; padding: 6px 0; }
.model-picker {
  background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-top: 12px;
}
.model-grid {
  max-height: 250px; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 6px;
}
.model-option { display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; padding: 4px 8px; border-radius: 4px; }
.model-option:hover { background: #e2e8f0; }
.model-option input { margin: 0; }
</style>
