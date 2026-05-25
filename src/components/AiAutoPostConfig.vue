<template>
  <div class="modal-backdrop">
    <div class="modal-content !max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl rounded-xl">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-white">
        <h2 class="text-xl font-bold text-indigo-900 flex items-center gap-2">
          <span class="text-2xl">🤖</span> AI 自动发帖任务中心
        </h2>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 overflow-y-auto flex-1 bg-gray-50/50">
        
        <!-- Status & Controls -->
        <div class="flex flex-col md:flex-row gap-4 mb-6">
          <div class="flex-1 bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center relative overflow-hidden">
            <div class="absolute right-0 top-0 w-32 h-32 bg-gradient-to-br from-green-50 to-transparent rounded-bl-full opacity-50" v-if="settings.status === 'running'"></div>
            <div class="relative z-10 flex items-center gap-4">
              <div class="w-12 h-12 rounded-full flex items-center justify-center text-2xl" :class="settings.status === 'running' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'">
                <span :class="{'animate-pulse': settings.status === 'running'}">{{ settings.status === 'running' ? '⚡' : '⏸' }}</span>
              </div>
              <div>
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">系统状态</h3>
                <div class="text-lg font-bold" :class="settings.status === 'running' ? 'text-green-600' : 'text-gray-700'">
                  {{ settings.status === 'running' ? '自动运行中 (Running)' : '已暂停 (Paused)' }}
                </div>
                <div class="text-xs text-gray-500 mt-1" v-if="settings.next_run_at && settings.status === 'running'">
                  ⏳ 下次发帖: {{ new Date(settings.next_run_at).toLocaleString() }}
                </div>
              </div>
            </div>
          </div>

          <div class="flex-1 bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center gap-3">
            <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">任务控制</h3>
            <div class="flex gap-2">
              <button v-if="settings.status !== 'running'" @click="startTask" class="flex-1 btn-premium bg-green-500 hover:bg-green-600 text-white shadow-green-200" :disabled="loading">
                ▶ 启动任务
              </button>
              <button v-if="settings.status === 'running'" @click="pauseTask" class="flex-1 btn-premium bg-yellow-500 hover:bg-yellow-600 text-white shadow-yellow-200" :disabled="loading">
                ⏸ 暂停
              </button>
              <button v-if="settings.status === 'running'" @click="stopTask" class="flex-1 btn-premium bg-red-500 hover:bg-red-600 text-white shadow-red-200" :disabled="loading">
                ⏹ 停止
              </button>
              <button @click="testRun" class="flex-1 btn-premium border-2 border-indigo-100 text-indigo-700 bg-indigo-50 hover:bg-indigo-100" :disabled="testing || loading">
                {{ testing ? '⏳ 生成中...' : '⚡ 测试生成1篇' }}
              </button>
            </div>
            <div v-if="testResult" class="text-xs p-2 bg-green-50 border border-green-200 text-green-700 rounded mt-1">
              ✅ 成功！生成产品: {{ testResult.product }}
            </div>
          </div>
        </div>

        <!-- Configuration Sections -->
        <div :class="{'opacity-60 pointer-events-none filter blur-[1px] transition-all duration-300': settings.status === 'running'}">
          
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <!-- Left Column: Strategy -->
            <div class="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <h3 class="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
                <span class="text-blue-500">⚙️</span> 发帖策略
              </h3>
              
              <div class="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">发帖频率 (每N天一次)</label>
                  <input type="number" v-model="settings.frequency_days" class="input-modern" min="1" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">单次生成文章数</label>
                  <input type="number" v-model="settings.articles_per_run" class="input-modern" min="1" max="5" />
                </div>
              </div>

              <div class="mb-5">
                <label class="block text-sm font-medium text-gray-700 mb-2">生成产品序列 (按顺序循环)</label>
                <div class="flex flex-col gap-2 max-h-[300px] overflow-y-auto p-1">
                  <label v-for="p in availableProducts" :key="p" 
                        class="flex items-center p-3 rounded-lg cursor-pointer transition-all border"
                        :class="selectedProducts.includes(p) ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'">
                    <input type="checkbox" :value="p" v-model="selectedProducts" class="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 mr-3" />
                    <span class="font-medium text-sm">{{ p }}</span>
                  </label>
                </div>
                <p class="text-xs text-gray-500 mt-2 leading-relaxed">系统每次将按顺序取下一个产品生成。会根据 <code>|</code> 前的简写词自动去图库匹配对应的真实照片（如提取 PPGI）。</p>
              </div>
            </div>

            <!-- Right Column: AI & Post Processing -->
            <div class="flex flex-col gap-6">
              
              <!-- AI Config -->
              <div class="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex-1">
                <h3 class="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
                  <span class="text-purple-500">🧠</span> AI 大模型配置
                </h3>
                
                <div class="mb-5">
                  <label class="block text-sm font-medium text-gray-700 mb-1">调用渠道</label>
                  <select v-model="settings.channel_id" class="input-modern bg-gray-50">
                    <option v-for="c in channels" :key="c.id" :value="c.id">
                      {{ c.name }} {{ c.is_default ? '(默认)' : '' }}
                    </option>
                  </select>
                </div>

                <div class="mb-5">
                  <label class="block text-sm font-medium text-gray-700 mb-1 flex justify-between items-center">
                    <span>元数据 (标题/摘要/SEO) 模板</span>
                    <button class="text-indigo-600 hover:text-indigo-800 text-xs font-bold" @click="openPromptEditor('metadata')">编辑 / 添加</button>
                  </label>
                  <select v-model="settings.metadata_prompt_id" class="input-modern border-indigo-200 bg-indigo-50/30 text-indigo-900 font-medium">
                    <option v-for="p in metadataPrompts" :key="p.id" :value="p.id">{{ p.name }}</option>
                  </select>
                </div>

                <div class="mb-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1 flex justify-between items-center">
                    <span>长文正文排版模板</span>
                    <button class="text-indigo-600 hover:text-indigo-800 text-xs font-bold" @click="openPromptEditor('body')">编辑 / 添加</button>
                  </label>
                  <select v-model="settings.body_prompt_id" class="input-modern border-indigo-200 bg-indigo-50/30 text-indigo-900 font-medium">
                    <option v-for="p in bodyPrompts" :key="p.id" :value="p.id">{{ p.name }}</option>
                  </select>
                </div>
              </div>

              <!-- Post Processing -->
              <div class="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 class="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span class="text-orange-500">✨</span> 生成后处理
                </h3>
                <div class="flex flex-col gap-3">
                  <label class="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100">
                    <input type="checkbox" v-model="settings.translate_all" :true-value="1" :false-value="0" class="w-4 h-4 text-orange-500 rounded border-gray-300" />
                    <span class="text-sm font-medium text-gray-700">自动进入翻译队列（覆盖多语言站点）</span>
                  </label>
                  <label class="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100">
                    <input type="checkbox" v-model="settings.apply_watermark" :true-value="1" :false-value="0" class="w-4 h-4 text-orange-500 rounded border-gray-300" />
                    <span class="text-sm font-medium text-gray-700">为正文图片自动嵌入默认防伪水印</span>
                  </label>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-100 bg-gray-50/80 flex justify-end gap-3">
        <button @click="$emit('close')" class="btn-premium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50" v-if="settings.status !== 'running'">关闭</button>
        <button @click="saveSettings" class="btn-premium bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200" :disabled="loading || settings.status === 'running'">
          💾 保存发帖策略
        </button>
      </div>

    </div>

    <!-- Prompt Editor Modal -->
    <div v-if="editingPromptType" class="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-[60] backdrop-blur-sm">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] scale-in">
        <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
          <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2">
            📝 提示词库管理 ({{ editingPromptType === 'metadata' ? '元数据/标题' : '长文正文' }})
          </h3>
          <button @click="editingPromptType = null" class="text-gray-400 hover:text-gray-600 text-2xl transition-colors">&times;</button>
        </div>
        
        <div class="p-6 overflow-y-auto flex-1">
          <div class="mb-6 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div class="max-h-60 overflow-y-auto">
              <div v-for="p in currentPromptsList" :key="p.id" class="p-3 border-b border-gray-100 last:border-0 flex justify-between items-center hover:bg-indigo-50/30 transition-colors">
                <div>
                  <div class="font-medium text-gray-800">{{ p.name }} 
                    <span v-if="p.is_default" class="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-2 uppercase font-bold tracking-wider">默认</span>
                  </div>
                </div>
                <div class="flex gap-3 text-sm">
                  <button @click="selectEditPrompt(p)" class="text-indigo-600 hover:text-indigo-800 font-medium">编辑</button>
                  <button v-if="!p.is_default" @click="setDefaultPrompt(p.id)" class="text-green-600 hover:text-green-800 font-medium">设为默认</button>
                  <button v-if="!p.is_default" @click="deletePrompt(p.id)" class="text-red-500 hover:text-red-700 font-medium">删除</button>
                </div>
              </div>
              <div v-if="currentPromptsList.length === 0" class="p-6 text-center text-gray-400 text-sm">
                暂无自定义模板
              </div>
            </div>
          </div>

          <div class="bg-indigo-50/40 p-5 border border-indigo-100 rounded-xl">
            <h4 class="font-bold text-indigo-900 mb-4 flex items-center gap-2">
              <span class="text-indigo-500">{{ editingPromptId ? '✏️ 编辑' : '➕ 新增' }}</span> 提示词模板
            </h4>
            <input type="text" v-model="promptForm.name" placeholder="模板名称 (例如: 提问式高转化SEO模板)" class="input-modern mb-4 bg-white" />
            <textarea v-model="promptForm.content" rows="8" placeholder="输入Prompt...&#10;系统支持以下变量替换：&#10;{product} = 当前生成的产品名称&#10;{title} = (正文专属) 当前生成的文章标题&#10;{summary} = (正文专属) 当前生成的文章摘要" class="input-modern mb-4 font-mono text-sm leading-relaxed bg-white"></textarea>
            <div class="flex justify-end gap-3">
              <button v-if="editingPromptId" @click="clearPromptForm" class="btn-premium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm">取消编辑</button>
              <button @click="savePrompt" class="btn-premium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm text-sm">💾 {{ editingPromptId ? '保存修改' : '保存为新模板' }}</button>
            </div>
          </div>
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
  apply_watermark: 0,
  channel_id: null,
  metadata_prompt_id: null,
  body_prompt_id: null,
  next_run_at: null
})

const availableProducts = [
  'GI | Galvanized Steel Coil',
  'GL | Aluzinc Steel Coil',
  'PPGI | Prepainted Galvanized Steel Coil',
  'PPGL | Prepainted Galvalume Steel Coil',
  'CRC | Cold Rolled Coil',
  'ROOFING SHEET | Corrugated Roofing Sheet'
]
const selectedProducts = ref([])

const channels = ref([])
const prompts = ref([])

const metadataPrompts = computed(() => prompts.value.filter(p => p.type === 'metadata'))
const bodyPrompts = computed(() => prompts.value.filter(p => p.type === 'body'))

const fetchSettings = async () => {
  loading.value = true
  try {
    const res = await api.request('/ai-auto-post/settings')
    if (res) {
      settings.value = res
      try {
        selectedProducts.value = JSON.parse(res.products_json || '[]')
      } catch (e) {
        selectedProducts.value = ['GI']
      }
    }
  } catch (e) {
    alert('加载配置失败: ' + e.message)
  }
  loading.value = false
}

const fetchDependencies = async () => {
  try {
    const [chRes, pRes] = await Promise.all([
      api.request('/ai/channels'),
      api.request('/ai-auto-post/prompts')
    ])
    channels.value = chRes
    prompts.value = pRes

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
    await api.request('/ai-auto-post/settings', {
      method: 'POST',
      body: JSON.stringify({
        ...settings.value,
        products_json: JSON.stringify(selectedProducts.value)
      })
    })
    alert('配置保存成功！')
    await fetchSettings()
  } catch (e) {
    alert('保存失败: ' + e.message)
  }
  loading.value = false
}

const actionTask = async (action) => {
  loading.value = true
  try {
    await api.request('/ai-auto-post/action', { method: 'POST', body: JSON.stringify({ action }) })
    await fetchSettings()
  } catch (e) {
    alert('操作失败: ' + e.message)
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
    const res = await api.request('/ai-auto-post/test-run', { method: 'POST' })
    testResult.value = res.result
    emit('refresh') // Refresh news list in parent
  } catch (e) {
    alert('测试生成失败: ' + e.message)
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
  const pRes = await api.request('/ai-auto-post/prompts')
  prompts.value = pRes
}

const savePrompt = async () => {
  if (!promptForm.value.name || !promptForm.value.content) return alert('名称和内容不能为空')
  try {
    if (editingPromptId.value) {
      await api.request(`/ai-auto-post/prompts/${editingPromptId.value}`, { method: 'PUT', body: JSON.stringify(promptForm.value) })
    } else {
      await api.request('/ai-auto-post/prompts', { method: 'POST', body: JSON.stringify({ ...promptForm.value, type: editingPromptType.value }) })
    }
    clearPromptForm()
    await reloadPrompts()
  } catch (e) {
    alert('保存失败: ' + e.message)
  }
}

const deletePrompt = async (id) => {
  if (!confirm('确定删除此提示词吗？')) return
  try {
    await api.request(`/ai-auto-post/prompts/${id}`, { method: 'DELETE' })
    await reloadPrompts()
  } catch (e) {
    alert('删除失败')
  }
}

const setDefaultPrompt = async (id) => {
  try {
    await api.request(`/ai-auto-post/prompts/${id}/set-default`, { method: 'PUT' })
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
  background: rgba(17, 24, 39, 0.4);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 50;
}

.scale-in {
  animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.input-modern {
  width: 100%;
  border: 1px solid #e5e7eb;
  padding: 10px 14px;
  border-radius: 8px;
  outline: none;
  font-size: 14px;
  transition: all 0.2s;
  background-color: #fdfdfd;
}
.input-modern:focus { 
  border-color: #6366f1; 
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  background-color: #ffffff;
}

.btn-premium {
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s ease-in-out;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.btn-premium:active {
  transform: scale(0.98);
}
.btn-premium:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}
</style>
