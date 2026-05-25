<template>
  <div class="modal-backdrop">
    <div class="modal-content premium-modal">
      <!-- Header -->
      <div class="modal-header-premium">
        <h2>
          <span style="font-size: 24px; margin-right: 8px;">🤖</span> AI 自动发帖任务中心
          <button @click="showLogViewer = true" class="btn-premium btn-ghost-border" style="margin-left: 16px; padding: 4px 12px; font-size: 12px;">📄 查看运行日志</button>
        </h2>
        <button @click="$emit('close')" class="modal-close-btn">&times;</button>
      </div>

      <!-- Body -->
      <div class="modal-body-premium">
        
        <!-- Status & Controls -->
        <div class="status-panel">
          <div class="status-card" :class="{ 'is-running': settings.status === 'running' }">
            <div class="status-icon">
              <span :class="{'animate-pulse': settings.status === 'running'}">{{ settings.status === 'running' ? '⚡' : '⏸' }}</span>
            </div>
            <div class="status-info">
              <span class="status-label">系统状态</span>
              <div class="status-value" :class="settings.status === 'running' ? 'text-green' : 'text-gray'">
                {{ settings.status === 'running' ? '自动运行中 (Running)' : '已暂停 (Paused)' }}
              </div>
              <div class="status-time" v-if="settings.next_run_at && settings.status === 'running'">
                ⏳ 下次发帖: {{ new Date(settings.next_run_at).toLocaleString() }}
              </div>
            </div>
          </div>

          <div class="controls-card">
            <span class="status-label">任务控制</span>
            <div class="controls-buttons">
              <button v-if="settings.status !== 'running'" @click="startTask" class="btn-premium btn-green" :disabled="loading">
                ▶ 启动任务
              </button>
              <button v-if="settings.status === 'running'" @click="pauseTask" class="btn-premium btn-yellow" :disabled="loading">
                ⏸ 暂停
              </button>
              <button v-if="settings.status === 'running'" @click="stopTask" class="btn-premium btn-red" :disabled="loading">
                ⏹ 停止
              </button>
              <button @click="testRun" class="btn-premium btn-outline-indigo" :disabled="testing || loading">
                {{ testing ? '⏳ 生成中...' : '⚡ 测试生成1篇' }}
              </button>
            </div>
            <div v-if="testResult" class="test-success">
              ✅ 成功！生成产品: {{ testResult.product }}
            </div>
            <div v-if="testError" class="test-error" style="font-size: 12px; padding: 12px; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-radius: 6px; margin-top: 8px; max-height: 200px; overflow-y: auto;">
              ❌ 测试生成失败：<br/>
              <pre style="white-space: pre-wrap; font-family: monospace; margin-top: 4px; font-size: 11px;">{{ testError }}</pre>
            </div>
          </div>
        </div>

        <!-- Configuration Sections -->
        <div class="config-sections" :class="{'is-disabled': settings.status === 'running'}">
          
          <div class="config-grid">
            <!-- Left Column: Strategy -->
            <div class="config-card">
              <h3 class="card-title">
                <span style="color: #3b82f6;">⚙️</span> 发帖策略
              </h3>
              
              <div class="input-grid">
                <div class="input-group">
                  <label>发帖频率 (每N天一次)</label>
                  <input type="number" v-model="settings.frequency_days" class="input-modern" min="1" />
                </div>
                <div class="input-group">
                  <label>单次生成文章数</label>
                  <input type="number" v-model="settings.articles_per_run" class="input-modern" min="1" max="5" />
                </div>
              </div>

              <div class="products-group">
                <label>生成产品序列 (按顺序循环)</label>
                <div class="products-list">
                  <label v-for="p in availableProducts" :key="p" 
                        class="product-checkbox"
                        :class="{'is-selected': selectedProducts.includes(p)}">
                    <input type="checkbox" :value="p" v-model="selectedProducts" />
                    <span>{{ p }}</span>
                  </label>
                </div>
                <p class="helper-text">系统每次将按顺序取下一个产品生成。会根据 <code>|</code> 前的简写词自动去图库匹配对应的真实照片（如提取 PPGI）。</p>
              </div>
            </div>

            <!-- Right Column: AI & Post Processing -->
            <div class="right-column">
              
              <!-- AI Config -->
              <div class="config-card">
                <h3 class="card-title">
                  <span style="color: #8b5cf6;">🧠</span> AI 大模型配置
                </h3>
                
                <div class="input-group">
                  <label>调用渠道</label>
                  <select v-model="settings.channel_id" class="input-modern">
                    <option v-for="c in channels" :key="c.id" :value="c.id">
                      {{ c.name }} {{ c.is_default ? '(默认)' : '' }}
                    </option>
                  </select>
                </div>

                <div class="input-group">
                  <div class="label-with-action">
                    <label>元数据 (标题/摘要/SEO) 模板</label>
                    <button class="action-link" @click="openPromptEditor('metadata')">编辑 / 添加</button>
                  </div>
                  <select v-model="settings.metadata_prompt_id" class="input-modern select-highlight">
                    <option v-for="p in metadataPrompts" :key="p.id" :value="p.id">{{ p.name }}</option>
                  </select>
                </div>

                <div class="input-group">
                  <div class="label-with-action">
                    <label>长文正文排版模板</label>
                    <button class="action-link" @click="openPromptEditor('body')">编辑 / 添加</button>
                  </div>
                  <select v-model="settings.body_prompt_id" class="input-modern select-highlight">
                    <option v-for="p in bodyPrompts" :key="p.id" :value="p.id">{{ p.name }}</option>
                  </select>
                </div>
              </div>

              <!-- Post Processing -->
              <div class="config-card mt-card">
                <h3 class="card-title">
                  <span style="color: #f97316;">✨</span> 生成后处理
                </h3>
                
                <div class="input-group">
                  <label>目标文章分组</label>
                  <select v-model="settings.category_id" class="input-modern select-highlight">
                    <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </select>
                </div>

                <div class="options-list">
                  <label class="option-checkbox">
                    <input type="checkbox" v-model="settings.translate_all" :true-value="1" :false-value="0" />
                    <span>自动进入翻译队列（覆盖多语言站点）</span>
                  </label>
                  <label class="option-checkbox">
                    <input type="checkbox" v-model="settings.apply_watermark" :true-value="1" :false-value="0" />
                    <span>为正文图片自动嵌入默认防伪水印</span>
                  </label>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="modal-footer-premium">
        <button @click="$emit('close')" class="btn-premium btn-ghost-border" v-if="settings.status !== 'running'">关闭</button>
        <button @click="saveSettings" class="btn-premium btn-indigo" :disabled="loading || settings.status === 'running'">
          💾 保存发帖策略
        </button>
      </div>

    </div>

    <!-- Prompt Editor Modal -->
    <div v-if="editingPromptType" class="modal-backdrop z-top">
      <div class="modal-content premium-modal scale-in" style="max-width: 650px;">
        <div class="modal-header-premium">
          <h2>
            📝 提示词库管理 ({{ editingPromptType === 'metadata' ? '元数据/标题' : '长文正文' }})
          </h2>
          <button @click="editingPromptType = null" class="modal-close-btn">&times;</button>
        </div>
        
        <div class="modal-body-premium">
          <div class="prompts-list-container">
            <div class="prompts-list">
              <div v-for="p in currentPromptsList" :key="p.id" class="prompt-item">
                <div class="prompt-name">
                  {{ p.name }} 
                  <span v-if="p.is_default" class="badge-default">默认</span>
                </div>
                <div class="prompt-actions">
                  <button @click="selectEditPrompt(p)" class="action-link">编辑</button>
                  <button v-if="!p.is_default" @click="setDefaultPrompt(p.id)" class="action-link-green">设为默认</button>
                  <button v-if="!p.is_default" @click="deletePrompt(p.id)" class="action-link-red">删除</button>
                </div>
              </div>
              <div v-if="currentPromptsList.length === 0" class="empty-state">
                暂无自定义模板
              </div>
            </div>
          </div>

          <div class="prompt-editor-form">
            <h4>
              <span style="color: #6366f1;">{{ editingPromptId ? '✏️ 编辑' : '➕ 新增' }}</span> 提示词模板
            </h4>
            <input type="text" v-model="promptForm.name" placeholder="模板名称 (例如: 提问式高转化SEO模板)" class="input-modern mb-12" />
            <textarea v-model="promptForm.content" rows="8" placeholder="输入Prompt...&#10;系统支持以下变量替换：&#10;{product} = 当前生成的产品名称&#10;{title} = (正文专属) 当前生成的文章标题&#10;{summary} = (正文专属) 当前生成的文章摘要" class="input-modern mb-12 textarea-mono"></textarea>
            <div class="form-actions">
              <button v-if="editingPromptId" @click="clearPromptForm" class="btn-premium btn-ghost-border">取消编辑</button>
              <button @click="savePrompt" class="btn-premium btn-indigo">💾 {{ editingPromptId ? '保存修改' : '保存为新模板' }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Log Viewer Modal -->
    <div v-if="showLogViewer" class="modal-backdrop z-top">
      <div class="modal-content premium-modal scale-in" style="max-width: 800px;">
        <div class="modal-header-premium">
          <h2>📄 AI 生成运行日志</h2>
          <button @click="showLogViewer = false" class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body-premium" style="padding: 0;">
          <div style="padding: 12px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 8px; background: #f9fafb;">
            <span v-if="autoRefresh" style="font-size: 12px; color: #10b981; line-height: 26px; margin-right: auto;">● 自动刷新中 (每2秒)</span>
            <button @click="clearLogs" class="btn-premium btn-outline-red" style="padding: 4px 12px; font-size: 12px; color: #dc2626; border-color: #fca5a5;">🗑 清空日志</button>
            <button @click="fetchLogs" class="btn-premium btn-outline-indigo" style="padding: 4px 12px; font-size: 12px;">🔄 刷新日志</button>
          </div>
          <pre style="margin: 0; padding: 16px; background: #1e1e1e; color: #d4d4d4; font-family: monospace; font-size: 13px; max-height: 60vh; overflow-y: auto; white-space: pre-wrap;">{{ logContent }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import api from '../api'

const emit = defineEmits(['close', 'refresh'])

const loading = ref(false)
const testing = ref(false)
const testResult = ref(null)
const testError = ref(null)

const showLogViewer = ref(false)
const logContent = ref('加载中...')
const autoRefresh = ref(false)
let refreshInterval = null

const fetchLogs = async (isAuto = false) => {
  if (!isAuto) logContent.value = '加载中...'
  try {
    const res = await api.request('/ai-auto-post/logs')
    logContent.value = res.logs || '暂无日志记录'
  } catch (e) {
    if (!isAuto) logContent.value = '读取日志失败: ' + e.message
  }
}

const clearLogs = async () => {
  if (!confirm('确定要清空日志吗？')) return
  try {
    await api.request('/ai-auto-post/logs', { method: 'DELETE' })
    fetchLogs()
  } catch (e) {
    alert('清空失败: ' + e.message)
  }
}

watch(showLogViewer, (newVal) => {
  if (newVal) {
    fetchLogs()
    autoRefresh.value = true
    refreshInterval = setInterval(() => fetchLogs(true), 2000)
  } else {
    autoRefresh.value = false
    if (refreshInterval) clearInterval(refreshInterval)
  }
})

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
const categories = ref([])

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
    const [chRes, pRes, catRes] = await Promise.all([
      api.request('/ai/channels'),
      api.request('/ai-auto-post/prompts'),
      api.request('/news-categories')
    ])
    channels.value = chRes
    prompts.value = pRes
    categories.value = catRes

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
    if (!settings.value.category_id && categories.value.length > 0) {
      settings.value.category_id = categories.value[0].id
    }
  } catch (e) {
    console.error('Failed to load dependencies', e)
  }
}

onMounted(async () => {
  await fetchSettings()
  await fetchDependencies()
})

const saveSettings = async (silent = false) => {
  if (selectedProducts.value.length === 0) {
    if (!silent) alert('请至少选择一个产品！')
    return false
  }
  loading.value = true
  let success = false
  try {
    await api.request('/ai-auto-post/settings', {
      method: 'POST',
      body: JSON.stringify({
        ...settings.value,
        channel_id: settings.value.channel_id || null,
        metadata_prompt_id: settings.value.metadata_prompt_id || null,
        body_prompt_id: settings.value.body_prompt_id || null,
        category_id: settings.value.category_id || 1,
        products_json: JSON.stringify(selectedProducts.value)
      })
    })
    if (!silent) alert('配置保存成功！')
    await fetchSettings()
    success = true
  } catch (e) {
    if (!silent) alert('保存失败: ' + e.message)
  }
  loading.value = false
  return success
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
  // Auto save settings silently first
  const saved = await saveSettings(true)
  if (!saved) return

  testing.value = true
  testResult.value = null
  testError.value = null
  try {
    const res = await api.request('/ai-auto-post/test-run', { method: 'POST' })
    testResult.value = res.result
    emit('refresh') // Refresh news list in parent
  } catch (e) {
    testError.value = e.message
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
  background: rgba(17, 24, 39, 0.5);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 50;
}
.z-top { z-index: 60; }

.premium-modal {
  background: #ffffff;
  border-radius: 16px;
  width: 90%;
  max-width: 900px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 90vh;
}

.modal-header-premium {
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
  background: linear-gradient(to right, #f8fafc, #ffffff);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header-premium h2 {
  font-size: 20px;
  font-weight: 700;
  color: #312e81;
  display: flex;
  align-items: center;
  margin: 0;
}

.modal-close-btn {
  background: transparent;
  border: none;
  font-size: 28px;
  line-height: 1;
  color: #9ca3af;
  cursor: pointer;
  transition: color 0.2s;
}
.modal-close-btn:hover { color: #4b5563; }

.modal-body-premium {
  padding: 24px;
  overflow-y: auto;
  background: #f8fafc;
  flex: 1;
}

.status-panel {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}
@media (max-width: 768px) {
  .status-panel { flex-direction: column; }
}

.status-card, .controls-card {
  flex: 1;
  background: #ffffff;
  border: 1px solid #f3f4f6;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-card.is-running::after {
  content: "";
  position: absolute;
  right: 0; top: 0;
  width: 120px; height: 120px;
  background: linear-gradient(to bottom right, #ecfdf5, transparent);
  border-bottom-left-radius: 100%;
  opacity: 0.5;
  pointer-events: none;
}

.status-icon {
  width: 48px; height: 48px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px;
  background: #f3f4f6;
  color: #6b7280;
  z-index: 1;
}
.is-running .status-icon {
  background: #d1fae5;
  color: #059669;
}

.status-info { z-index: 1; }
.status-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: #9ca3af;
  letter-spacing: 0.05em;
  display: block;
  margin-bottom: 4px;
}
.status-value {
  font-size: 18px;
  font-weight: 700;
}
.text-green { color: #059669; }
.text-gray { color: #374151; }

.status-time {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}

.controls-buttons {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.test-success {
  font-size: 12px;
  padding: 8px;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #047857;
  border-radius: 6px;
  margin-top: 8px;
}

.config-sections.is-disabled {
  opacity: 0.6;
  pointer-events: none;
  filter: blur(1px);
}

.config-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
@media (max-width: 1024px) {
  .config-grid { grid-template-columns: 1fr; }
}

.config-card {
  background: #ffffff;
  border: 1px solid #f3f4f6;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
.mt-card { margin-top: 24px; }

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}
.input-group { margin-bottom: 20px; }
.input-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.products-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}
.products-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
  padding: 4px;
}
.product-checkbox {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  transition: all 0.2s;
}
.product-checkbox:hover { background: #f9fafb; }
.product-checkbox.is-selected {
  background: #eef2ff;
  border-color: #c7d2fe;
  color: #312e81;
}
.product-checkbox input { margin-right: 12px; width: 16px; height: 16px; }

.helper-text {
  font-size: 12px;
  color: #6b7280;
  margin-top: 8px;
  line-height: 1.5;
}
.helper-text code {
  background: #f3f4f6;
  padding: 2px 4px;
  border-radius: 4px;
}

.label-with-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.label-with-action label { margin-bottom: 0; }
.action-link {
  background: transparent;
  border: none;
  color: #4f46e5;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.action-link:hover { text-decoration: underline; }

.select-highlight {
  background-color: #eef2ff !important;
  border-color: #c7d2fe !important;
  color: #312e81 !important;
  font-weight: 500;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.option-checkbox {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #f9fafb;
  border: 1px solid #f3f4f6;
  cursor: pointer;
  transition: all 0.2s;
}
.option-checkbox:hover { background: #f3f4f6; }
.option-checkbox span {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.modal-footer-premium {
  padding: 16px 24px;
  border-top: 1px solid #f3f4f6;
  background: rgba(249, 250, 251, 0.8);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.prompts-list-container {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  margin-bottom: 24px;
  overflow: hidden;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
.prompts-list {
  max-height: 240px;
  overflow-y: auto;
}
.prompt-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.prompt-item:last-child { border-bottom: none; }
.prompt-item:hover { background: rgba(238, 242, 255, 0.3); }
.prompt-name {
  font-weight: 500;
  color: #1f2937;
  font-size: 14px;
}
.badge-default {
  font-size: 10px;
  background: #d1fae5;
  color: #047857;
  padding: 2px 8px;
  border-radius: 9999px;
  margin-left: 8px;
  text-transform: uppercase;
  font-weight: 700;
}
.prompt-actions { display: flex; gap: 12px; font-size: 14px; }
.action-link-green { background: transparent; border: none; color: #059669; font-weight: 500; cursor: pointer; }
.action-link-red { background: transparent; border: none; color: #ef4444; font-weight: 500; cursor: pointer; }
.empty-state { padding: 24px; text-align: center; color: #9ca3af; font-size: 14px; }

.prompt-editor-form {
  background: rgba(238, 242, 255, 0.4);
  padding: 20px;
  border: 1px solid #e0e7ff;
  border-radius: 12px;
}
.prompt-editor-form h4 {
  font-weight: 700; color: #312e81; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;
}
.mb-12 { margin-bottom: 12px !important; }
.textarea-mono { font-family: monospace; font-size: 14px; line-height: 1.5; }
.form-actions { display: flex; justify-content: flex-end; gap: 12px; }

/* Utilities */
.scale-in {
  animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.input-modern {
  width: 100%;
  border: 1px solid #e5e7eb;
  padding: 10px 14px;
  border-radius: 8px;
  outline: none;
  font-size: 14px;
  transition: all 0.2s;
  background-color: #ffffff;
}
.input-modern:focus { 
  border-color: #6366f1; 
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
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
  border: none;
}
.btn-premium:active { transform: scale(0.98); }
.btn-premium:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

.btn-green { background: #10b981; color: white; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2); flex: 1; }
.btn-green:hover:not(:disabled) { background: #059669; }

.btn-yellow { background: #f59e0b; color: white; box-shadow: 0 4px 6px -1px rgba(245, 158, 11, 0.2); flex: 1; }
.btn-yellow:hover:not(:disabled) { background: #d97706; }

.btn-red { background: #ef4444; color: white; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.2); flex: 1; }
.btn-red:hover:not(:disabled) { background: #dc2626; }

.btn-outline-indigo { background: #eef2ff; border: 1px solid #c7d2fe; color: #4338ca; flex: 1; }
.btn-outline-indigo:hover:not(:disabled) { background: #e0e7ff; }

.btn-indigo { background: #4f46e5; color: white; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2); }
.btn-indigo:hover:not(:disabled) { background: #4338ca; }

.btn-ghost-border { background: #ffffff; border: 1px solid #d1d5db; color: #374151; }
.btn-ghost-border:hover:not(:disabled) { background: #f9fafb; }
</style>
