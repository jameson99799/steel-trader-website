<template>
  <div class="modal-backdrop">
    <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold">🤖 AI 自动发帖任务配置</h2>
        <button @click="$emit('close')" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
      </div>

      <!-- Dashboard Status -->
      <div class="bg-gray-100 p-4 rounded-md mb-6 flex justify-between items-center border" :class="settings.status === 'running' ? 'border-green-400 bg-green-50' : 'border-gray-300'">
        <div>
          <div class="text-lg font-bold" :class="settings.status === 'running' ? 'text-green-700' : 'text-gray-700'">
            状态: {{ settings.status === 'running' ? '运行中 (Running)' : '已暂停 (Paused)' }}
          </div>
          <div class="text-sm text-gray-600 mt-1" v-if="settings.next_run_at">
            下次执行时间: {{ new Date(settings.next_run_at).toLocaleString() }}
          </div>
        </div>
        <div class="flex gap-2">
          <button v-if="settings.status !== 'running'" @click="startTask" class="btn btn-primary bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded shadow" :disabled="loading">
            ▶ 启动任务
          </button>
          <button v-if="settings.status === 'running'" @click="pauseTask" class="btn btn-outline border-yellow-500 text-yellow-600 hover:bg-yellow-50 font-bold py-2 px-6 rounded shadow" :disabled="loading">
            ⏸ 暂停任务
          </button>
          <button v-if="settings.status === 'running'" @click="stopTask" class="btn btn-outline border-red-500 text-red-600 hover:bg-red-50 font-bold py-2 px-6 rounded shadow" :disabled="loading">
            ⏹ 停止任务
          </button>
        </div>
      </div>

      <!-- Test Run Area -->
      <div class="mb-6 p-4 border border-blue-200 bg-blue-50 rounded-md">
        <h3 class="font-bold text-blue-800 mb-2">测试与预览</h3>
        <p class="text-sm text-blue-600 mb-3">立即按照下方配置的流程生成 1 篇文章（不会影响自动任务的计划时间）。</p>
        <button @click="testRun" class="btn btn-primary bg-blue-600 text-white" :disabled="testing || loading">
          {{ testing ? '⏳ 正在生成测试文章...' : '⚡ 测试生成' }}
        </button>
        <div v-if="testResult" class="mt-4 p-3 bg-white border border-green-300 rounded text-green-800 text-sm">
          <strong>✅ 测试生成成功！</strong><br/>
          产品: {{ testResult.product }}<br/>
          标题: {{ testResult.title }}<br/>
          文章ID: {{ testResult.id }}
        </div>
      </div>

      <hr class="my-6 border-gray-200" />

      <!-- Configuration Form -->
      <div :class="{'opacity-60 pointer-events-none': settings.status === 'running'}">
        <h3 class="font-bold text-lg mb-4">执行规则配置</h3>
        
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium mb-1">执行频率 (天/次)</label>
            <input type="number" v-model="settings.frequency_days" class="input w-full" min="1" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">每次生成文章数</label>
            <input type="number" v-model="settings.articles_per_run" class="input w-full" min="1" max="5" />
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">自动生成的产品序列 (按顺序循环生成)</label>
          <div class="flex flex-wrap gap-2 mb-2">
            <label v-for="p in availableProducts" :key="p" class="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded cursor-pointer hover:bg-gray-200 border">
              <input type="checkbox" :value="p" v-model="selectedProducts" />
              {{ p }}
            </label>
          </div>
          <p class="text-xs text-gray-500">勾选多个产品后，每次任务将按顺序取下一个产品进行内容生成。可以包含前缀匹配用于提取图库照片（如 PPGI|Prepainted Galvanized）。</p>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">选择 AI 渠道</label>
          <select v-model="settings.channel_id" class="input w-full">
            <option v-for="c in channels" :key="c.id" :value="c.id">
              {{ c.name }} {{ c.is_default ? '(默认)' : '' }}
            </option>
          </select>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium mb-1 flex justify-between">
            <span>元数据 (标题/摘要/SEO) 提示词角色</span>
            <button class="text-blue-600 text-xs hover:underline" @click="openPromptEditor('metadata')">编辑/添加</button>
          </label>
          <select v-model="settings.metadata_prompt_id" class="input w-full">
            <option v-for="p in metadataPrompts" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>

        <div class="mb-6">
          <label class="block text-sm font-medium mb-1 flex justify-between">
            <span>长文正文提示词角色</span>
            <button class="text-blue-600 text-xs hover:underline" @click="openPromptEditor('body')">编辑/添加</button>
          </label>
          <select v-model="settings.body_prompt_id" class="input w-full">
            <option v-for="p in bodyPrompts" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>

        <div class="mb-6 bg-gray-50 p-4 border rounded">
          <h4 class="font-bold mb-2">生成后处理动作</h4>
          <label class="flex items-center gap-2 cursor-pointer mb-2">
            <input type="checkbox" v-model="settings.translate_all" :true-value="1" :false-value="0" />
            <span>自动翻译为全站所有语言 (调用现有后台翻译队列)</span>
          </label>
        </div>

        <div class="flex justify-end mt-6">
          <button @click="saveSettings" class="btn btn-primary" :disabled="loading">💾 保存配置</button>
        </div>
      </div>
    </div>

    <!-- Prompt Editor Modal -->
    <div v-if="editingPromptType" class="modal-backdrop" style="z-index: 60;">
      <div class="modal-content" style="max-width: 600px;">
        <h3 class="text-xl font-bold mb-4">管理提示词 ({{ editingPromptType === 'metadata' ? '元数据' : '正文' }})</h3>
        
        <div class="mb-4 max-h-60 overflow-y-auto border rounded p-2">
          <div v-for="p in currentPromptsList" :key="p.id" class="p-2 border-b last:border-0 flex justify-between items-center hover:bg-gray-50">
            <div>
              <div class="font-bold">{{ p.name }} <span v-if="p.is_default" class="text-xs bg-green-100 text-green-800 px-1 rounded">默认</span></div>
            </div>
            <div class="flex gap-2 text-sm">
              <button @click="selectEditPrompt(p)" class="text-blue-600 hover:underline">编辑</button>
              <button v-if="!p.is_default" @click="setDefaultPrompt(p.id)" class="text-green-600 hover:underline">设为默认</button>
              <button v-if="!p.is_default" @click="deletePrompt(p.id)" class="text-red-600 hover:underline">删除</button>
            </div>
          </div>
        </div>

        <div class="bg-gray-50 p-4 border rounded">
          <h4 class="font-bold mb-2">{{ editingPromptId ? '编辑' : '新增' }}提示词</h4>
          <input type="text" v-model="promptForm.name" placeholder="提示词名称 (例如: 专业SEO生成模板)" class="input w-full mb-2" />
          <textarea v-model="promptForm.content" rows="6" placeholder="输入Prompt... 可以使用 {product}, {title}, {summary} 变量" class="input w-full mb-2"></textarea>
          <div class="flex justify-end gap-2">
            <button v-if="editingPromptId" @click="clearPromptForm" class="btn btn-outline text-sm py-1 px-2">取消编辑</button>
            <button @click="savePrompt" class="btn btn-primary text-sm py-1 px-3">保存</button>
          </div>
        </div>

        <div class="mt-4 flex justify-end">
          <button @click="editingPromptType = null" class="btn btn-outline">关闭管理</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../api'

const emit = defineEmits(['close', 'refresh'])

const loading = ref(false)
const testing = ref(false)
const testResult = ref(null)

const settings = ref({
  status: 'paused',
  frequency_days: 1,
  articles_per_run: 1,
  products_json: '["GI"]',
  translate_all: 1,
  channel_id: null,
  metadata_prompt_id: null,
  body_prompt_id: null,
  next_run_at: null
})

const availableProducts = [
  'GI', 'GL', 'PPGI', 'PPGL', 'CRC', 'ROOFING SHEET', 
  'Prepainted Galvanized Steel Coil', 'Prepainted Galvalume Steel Coil', 'Aluzinc Steel Coil'
]
const selectedProducts = ref([])

const channels = ref([])
const prompts = ref([])

const metadataPrompts = computed(() => prompts.value.filter(p => p.type === 'metadata'))
const bodyPrompts = computed(() => prompts.value.filter(p => p.type === 'body'))

const fetchSettings = async () => {
  loading.value = true
  try {
    const res = await api.get('/ai-auto-post/settings')
    if (res.data) {
      settings.value = res.data
      try {
        selectedProducts.value = JSON.parse(res.data.products_json || '[]')
      } catch (e) {
        selectedProducts.value = ['GI']
      }
    }
  } catch (e) {
    alert('加载配置失败: ' + (e.response?.data?.error || e.message))
  }
  loading.value = false
}

const fetchDependencies = async () => {
  try {
    const [chRes, pRes] = await Promise.all([
      api.get('/ai/channels'),
      api.get('/ai-auto-post/prompts')
    ])
    channels.value = chRes.data
    prompts.value = pRes.data

    if (!settings.value.channel_id && channels.value.length > 0) {
      const def = channels.value.find(c => c.is_default) || channels.value[0]
      settings.value.channel_id = def.id
    }
    if (!settings.value.metadata_prompt_id && metadataPrompts.value.length > 0) {
      const def = metadataPrompts.value.find(p => p.is_default) || metadataPrompts.value[0]
      settings.value.metadata_prompt_id = def.id
    }
    if (!settings.value.body_prompt_id && bodyPrompts.value.length > 0) {
      const def = bodyPrompts.value.find(p => p.is_default) || bodyPrompts.value[0]
      settings.value.body_prompt_id = def.id
    }
  } catch (e) {
    console.error('Failed to load dependencies', e)
  }
}

onMounted(async () => {
  await fetchSettings()
  await fetchDependencies()
})

const saveSettings = async () => {
  if (selectedProducts.value.length === 0) {
    return alert('请至少选择一个产品！')
  }
  loading.value = true
  try {
    await api.post('/ai-auto-post/settings', {
      ...settings.value,
      products_json: JSON.stringify(selectedProducts.value)
    })
    alert('配置保存成功！')
    await fetchSettings()
  } catch (e) {
    alert('保存失败: ' + (e.response?.data?.error || e.message))
  }
  loading.value = false
}

const actionTask = async (action) => {
  loading.value = true
  try {
    await api.post('/ai-auto-post/action', { action })
    await fetchSettings()
  } catch (e) {
    alert('操作失败: ' + (e.response?.data?.error || e.message))
  }
  loading.value = false
}

const startTask = () => actionTask('start')
const pauseTask = () => actionTask('pause')
const stopTask = () => actionTask('stop')

const testRun = async () => {
  // Auto save settings first just in case
  await saveSettings()
  testing.value = true
  testResult.value = null
  try {
    const res = await api.post('/ai-auto-post/test-run')
    testResult.value = res.data.result
    emit('refresh') // Refresh news list in parent
  } catch (e) {
    alert('测试生成失败: ' + (e.response?.data?.error || e.message))
  }
  testing.value = false
}

// --- Prompts Management ---
const editingPromptType = ref(null) // 'metadata' or 'body'
const currentPromptsList = computed(() => editingPromptType.value === 'metadata' ? metadataPrompts.value : bodyPrompts.value)
const editingPromptId = ref(null)
const promptForm = ref({ name: '', content: '' })

const openPromptEditor = (type) => {
  editingPromptType.value = type
  clearPromptForm()
}

const clearPromptForm = () => {
  editingPromptId.value = null
  promptForm.value = { name: '', content: '' }
}

const selectEditPrompt = (p) => {
  editingPromptId.value = p.id
  promptForm.value = { name: p.name, content: p.content }
}

const reloadPrompts = async () => {
  const pRes = await api.get('/ai-auto-post/prompts')
  prompts.value = pRes.data
}

const savePrompt = async () => {
  if (!promptForm.value.name || !promptForm.value.content) return alert('名称和内容不能为空')
  try {
    if (editingPromptId.value) {
      await api.put(`/ai-auto-post/prompts/${editingPromptId.value}`, promptForm.value)
    } else {
      await api.post('/ai-auto-post/prompts', { ...promptForm.value, type: editingPromptType.value })
    }
    clearPromptForm()
    await reloadPrompts()
  } catch (e) {
    alert('保存失败: ' + (e.response?.data?.error || e.message))
  }
}

const deletePrompt = async (id) => {
  if (!confirm('确定删除此提示词吗？')) return
  try {
    await api.delete(`/ai-auto-post/prompts/${id}`)
    await reloadPrompts()
  } catch (e) {
    alert('删除失败')
  }
}

const setDefaultPrompt = async (id) => {
  try {
    await api.put(`/ai-auto-post/prompts/${id}/set-default`)
    await reloadPrompts()
  } catch (e) {
    alert('设置失败')
  }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 50;
}
.modal-content {
  background: white;
  border-radius: 8px;
  padding: 24px;
  width: 90%;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}
.btn {
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid transparent;
  transition: all 0.2s;
}
.btn-primary { background: #3b82f6; color: white; }
.btn-primary:hover { background: #2563eb; }
.btn-outline { border-color: #d1d5db; background: transparent; }
.btn-outline:hover { background: #f3f4f6; }
.input {
  border: 1px solid #d1d5db;
  padding: 6px 10px;
  border-radius: 4px;
  outline: none;
}
.input:focus { border-color: #3b82f6; }
</style>
