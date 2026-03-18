<template>
  <div class="translations-page">
    <h1>🤖 AI 翻译管理</h1>

    <!-- AI 渠道管理 -->
    <div class="card">
      <div class="card-header-row">
        <h3>🤖 AI 渠道管理</h3>
        <div style="display:flex;align-items:center;gap:12px">
          <div class="multilingual-toggle">
            <span>多语言开关</span>
            <label class="switch">
              <input type="checkbox" v-model="settings.multilingual_enabled" @change="saveSettings" />
              <span class="slider"></span>
            </label>
            <span class="toggle-status" :class="settings.multilingual_enabled ? 'on' : 'off'">
              {{ settings.multilingual_enabled ? '已开启' : '已关闭' }}
            </span>
          </div>
          <button class="btn btn-primary btn-sm" @click="openChannelDialog()">➕ 添加渠道</button>
        </div>
      </div>
      <div class="card-body">
        <div v-if="channels.length === 0" class="empty-tip">暂无 AI 渠道，请点击「添加渠道」创建</div>
        <div v-else class="channel-list">
          <div v-for="ch in channels" :key="ch.id" class="channel-card" :class="{ 'is-default': ch.is_default }">
            <div class="ch-header">
              <div class="ch-name">
                <span class="ch-badge" v-if="ch.is_default">默认</span>
                {{ ch.name }}
              </div>
              <div class="ch-actions">
                <button class="btn btn-outline btn-xs" @click="openChannelDialog(ch)">✏️ 编辑</button>
                <button class="btn btn-outline btn-xs" @click="setDefaultChannel(ch.id)" v-if="!ch.is_default">⭐ 设为默认</button>
                <button class="btn btn-outline btn-xs btn-danger" @click="deleteChannel(ch.id)">🗑️</button>
              </div>
            </div>
            <div class="ch-info">
              <div><span class="ch-label">API:</span> {{ ch.api_url }}</div>
              <div><span class="ch-label">Key:</span> {{ ch.api_key_display }}</div>
              <div><span class="ch-label">模型:</span>
                <span v-if="ch.models && ch.models.length" class="ch-models">
                  <span v-for="m in ch.models" :key="m" class="model-tag">{{ m }}</span>
                </span>
                <span v-else class="ch-no-model">未选择模型</span>
              </div>
              <div v-if="ch.default_model"><span class="ch-label">默认:</span> <span class="model-tag" style="background:#dcfce7;color:#166534">{{ ch.default_model }}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Channel Dialog -->
    <div class="modal-overlay" v-if="showChannelDialog" @click.self="showChannelDialog = false">
      <div class="modal-box">
        <h3>{{ editingChannel ? '编辑渠道' : '添加渠道' }}</h3>
        <div class="form-group">
          <label>渠道名称</label>
          <input v-model="channelForm.name" class="form-control" placeholder="例如：OpenAI / DeepSeek / 硅基流动" />
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label>API 地址</label>
            <input v-model="channelForm.api_url" class="form-control" placeholder="https://api.openai.com/v1" />
          </div>
          <div class="form-group">
            <label>API 密钥</label>
            <input v-model="channelForm.api_key" class="form-control" type="password" :placeholder="editingChannel ? '留空保持不变' : 'sk-...'" autocomplete="new-password" />
          </div>
        </div>
        <div class="form-group">
          <label>模型选择 <button class="btn btn-outline btn-xs" @click="fetchChannelModels" :disabled="fetchingChModels" style="margin-left:8px">{{ fetchingChModels ? '搜索中...' : '🔍 搜索可用模型' }}</button></label>
          <div class="model-list" v-if="channelModelList.length">
            <div v-for="m in channelModelList" :key="m" class="model-item"
                 :class="{ selected: channelForm.models.includes(m) }"
                 @click="toggleModel(m)">
              <span class="model-check">{{ channelForm.models.includes(m) ? '☑' : '☐' }}</span> {{ m }}
            </div>
          </div>
          <div v-if="channelForm.models.length" class="selected-models">
            <span class="ch-label">已选模型：</span>
            <span v-for="m in channelForm.models" :key="m" class="model-tag removable" @click="removeModel(m)">{{ m }} ×</span>
          </div>
        </div>
        <div class="form-group" v-if="channelForm.models.length">
          <label>默认翻译模型</label>
          <select v-model="channelForm.default_model" class="form-control">
            <option value="">自动选择（使用列表第一个）</option>
            <option v-for="m in channelForm.models" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="channelForm.is_default" /> 设为默认渠道（翻译时使用）
          </label>
        </div>
        <div class="btn-row" style="justify-content:flex-end">
          <button class="btn btn-outline" @click="showChannelDialog = false">取消</button>
          <button class="btn btn-primary" @click="saveChannel" :disabled="savingChannel">
            {{ savingChannel ? '保存中...' : '💾 保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Per-language per-page Translation -->
    <div class="card" style="margin-top:20px">
      <div class="card-body">
        <h3 class="section-title">🌐 全站翻译</h3>
        <p class="page-desc">选择目标语言和翻译范围，点击「翻译」。翻译同步执行，完成后显示结果和错误日志。</p>

        <div v-if="nonEnLangs.length === 0" class="empty-tip">
          请先在 <a href="/admin/languages">🌍 语言管理</a> 中添加目标语言
        </div>

        <div v-else class="translate-panel">
          <!-- Target language selector -->
          <div class="panel-row">
            <div class="form-group" style="flex:1">
              <label>目标语言</label>
              <select v-model="selectedLang" class="form-control">
                <option v-for="l in nonEnLangs" :key="l.code" :value="l.code">
                  {{ l.flag }} {{ l.name }} — {{ l.ai_translated ? '✓ 已翻译' : '待翻译' }}
                </option>
              </select>
            </div>
            <div class="form-group" style="flex:1">
              <label>翻译范围</label>
              <select v-model="selectedPage" class="form-control">
                <option value="all">全站（所有内容）</option>
                <option value="products">产品（Products）— 名称、描述、SEO、详情HTML、FAQ、规格</option>
                <option value="news">新闻（News）— 标题、摘要、SEO、正文HTML、FAQ</option>
                <option value="company">公司信息（Company）</option>
                <option value="page_texts">页面文字（Page Texts）</option>
                <option value="categories">产品分类名称（Categories）</option>
                <option value="hero">首页 Hero 区域（Hero）</option>
              </select>
            </div>
            <div class="form-group" style="width:120px">
              <label>并发数</label>
              <select v-model="concurrency" class="form-control">
                <option v-for="n in 10" :key="n" :value="n">{{ n }} 并发</option>
              </select>
            </div>
          </div>
          <div class="btn-row" style="gap:8px">
            <button class="btn btn-primary" @click="startTranslate" :disabled="translating || !selectedLang">
              {{ translating ? '⏳ 翻译中...' : '🚀 开始翻译' }}
            </button>
            <button v-if="failedItems.length" class="btn btn-warning" @click="retryFailed" :disabled="translating">
              🔄 重试失败项 ({{ failedItems.length }})
            </button>
            <button v-if="translating" class="btn btn-outline" @click="abortTranslation">
              ⛔ 停止
            </button>
          </div>

          <!-- Real-time Progress Bar -->
          <div v-if="progressTotal > 0" class="progress-bar-wrap">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progressPct + '%' }" :class="{ error: progressErrors > 0 }"></div>
            </div>
            <div class="progress-text">
              {{ progressDone }}/{{ progressTotal }} 页面  |  ✅ {{ progressOk }} 项  |  ⚠️ {{ progressErrors }} 错误
              <span v-if="translating" class="spin">⏳</span>
            </div>
          </div>

          <!-- Real-time Log -->
          <div v-if="logEntries.length" class="log-panel" ref="logPanelRef">
            <div class="log-header">
              <span>📝 实时日志 ({{ logEntries.length }} 条)</span>
              <button class="btn btn-sm btn-outline" @click="logEntries = []">× 清空</button>
            </div>
            <div class="log-body">
              <div v-for="(log, i) in logEntries" :key="i" :class="['log-entry', log.type]">
                <span class="log-time">{{ log.time }}</span>
                <span class="log-icon">{{ log.type === 'ok' ? '✅' : log.type === 'error' ? '❌' : log.type === 'warn' ? '⚠️' : 'ℹ️' }}</span>
                <span class="log-msg">{{ log.msg }}</span>
              </div>
            </div>
          </div>
        </div>  <!-- end translate-panel -->

        <!-- Translation Results -->
        <div v-if="translateResult" class="result-panel">
          <div class="result-summary" :class="translateResult.errors?.length ? 'has-error' : 'all-ok'">
            <strong>翻译完成：</strong>
            成功 {{ translateResult.translated }} / {{ translateResult.total }} 项
            <span v-if="translateResult.errors?.length" class="err-count">
              ，{{ translateResult.errors.length }} 个错误
            </span>
          </div>

          <!-- Error logs -->
          <div v-if="translateResult.errors?.length" class="error-log">
            <h4>⚠️ 错误日志 ({{ translateResult.errors.length }} 个)</h4>
            <div v-for="(e, i) in translateResult.errors" :key="i" class="error-row">
              <code>{{ e.errorCode || 'ERR' }}</code>
              <strong>{{ e.itemName || e.item || e.page || `Batch ${e.batch}` }}</strong>: {{ e.error }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Manual Search & Replace -->
    <div class="card" style="margin-top:20px">
      <div class="card-body">
        <h3 class="section-title">✏️ 手动搜索 &amp; 替换翻译</h3>
        <p class="page-desc">搜索前台未翻译的内容，手动输入翻译并保存。保存后 AI 翻译时会优先参考这些记录。</p>

        <div class="search-row">
          <select v-model="searchLang" class="form-control" style="width:160px;flex-shrink:0">
            <option value="" disabled>选择目标语言</option>
            <option v-for="l in nonEnLangs" :key="l.code" :value="l.code">{{ l.flag }} {{ l.name }}</option>
          </select>
          <select v-model="searchPage" class="form-control" style="width:160px;flex-shrink:0">
            <option value="all">所有页面</option>
            <option value="products">产品</option>
            <option value="news">新闻</option>
            <option value="company">公司信息</option>
            <option value="page_texts">页面文字</option>
          </select>
          <input v-model="searchQuery" class="form-control" placeholder="关键词（留空查全部未翻译）" @keyup.enter="doSearch" />
          <button class="btn btn-outline" @click="doSearch" :disabled="searching || !searchLang">
            {{ searching ? '搜索中...' : '搜索' }}
          </button>
        </div>

        <div v-if="searchResults.length" class="search-results">
          <div v-for="(item, idx) in searchResults" :key="idx" class="result-item">
            <div class="result-meta">📄 {{ item.page }} — {{ item.field }}</div>
            <div class="result-original">{{ item.original }}</div>
            <div class="result-replace">
              <input v-model="item.replacement" class="form-control"
                     :placeholder="`输入 ${searchLang} 翻译...`" />
              <button class="btn btn-sm btn-primary" @click="saveOverride(item)" :disabled="item.saving">
                {{ item.saving ? '...' : '保存' }}
              </button>
            </div>
            <div v-if="item.saved" class="result-saved">✅ 已保存</div>
          </div>
        </div>
        <p v-else-if="searched && !searching" class="empty-tip">
          {{ searchResults.length === 0 ? '✅ 未找到未翻译的内容（可能已全部翻译）' : '' }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import api from '../../api'

const settings = reactive({
  api_url: 'https://api.openai.com/v1',
  api_key: '',
  model_name: 'gpt-3.5-turbo',
  multilingual_enabled: true,
  source_lang: 'en'
})

// AI Channel CRUD
const channels = ref([])
const showChannelDialog = ref(false)
const editingChannel = ref(null)
const channelModelList = ref([])
const fetchingChModels = ref(false)
const savingChannel = ref(false)
const channelForm = reactive({
  name: '', api_url: 'https://api.openai.com/v1', api_key: '', models: [], is_default: false, default_model: ''
})

const languages = ref([])
const models = ref([])
const fetchingModels = ref(false)
const saving = ref(false)
const savedMsg = ref(false)

const selectedLang = ref('')
const selectedPage = ref('all')
const concurrency = ref(3)
const translating = ref(false)
const translateResult = ref(null)
const logEntries = ref([])
const logPanelRef = ref(null)
const failedPages = ref([])
const progressTotal = ref(0)
const progressDone = ref(0)
const progressOk = ref(0)
const progressErrors = ref(0)
let aborted = false

const searchLang = ref('')
const searchPage = ref('all')
const searchQuery = ref('')
const searchResults = ref([])
const searching = ref(false)
const searched = ref(false)

const nonEnLangs = computed(() => languages.value.filter(l => l.code !== 'en'))

const progressPct = computed(() => progressTotal.value ? Math.round(progressDone.value / progressTotal.value * 100) : 0)

onMounted(async () => {
  try {
    const [s, langs] = await Promise.all([
      api.getTranslationSettings(),
      api.getLanguages()
    ])
    if (s) {
      settings.api_url = s.api_url || 'https://api.openai.com/v1'
      settings.api_key = ''
      settings.model_name = s.model_name || 'gpt-3.5-turbo'
      settings.multilingual_enabled = !!s.multilingual_enabled
    }
    languages.value = langs || []
    await loadChannels()
    if (nonEnLangs.value.length > 0) {
      selectedLang.value = nonEnLangs.value[0].code
      searchLang.value = nonEnLangs.value[0].code
    }
  } catch (e) {
    console.error('Failed to load settings:', e)
  }
})

const saveSettings = async () => {
  saving.value = true; savedMsg.value = false
  try {
    await api.saveTranslationSettings({
      api_url: settings.api_url,
      api_key: settings.api_key,
      model_name: settings.model_name,
      multilingual_enabled: settings.multilingual_enabled ? 1 : 0
    })
    savedMsg.value = true
    setTimeout(() => { savedMsg.value = false }, 3000)
  } catch (e) {
    alert('\u4fdd\u5b58\u5931\u8d25: ' + e.message)
  } finally {
    saving.value = false
  }
}

const fetchModels = async () => {
  if (!settings.api_key) return alert('\u8bf7\u5148\u586b\u5165 API \u5bc6\u94a5')
  fetchingModels.value = true; models.value = []
  try {
    const res = await api.fetchAIModels({ api_url: settings.api_url, api_key: settings.api_key })
    models.value = res.models || []
    if (!models.value.length) alert('\u672a\u83b7\u53d6\u5230\u6a21\u578b\u5217\u8868')
  } catch (e) {
    alert('\u83b7\u53d6\u6a21\u578b\u5931\u8d25: ' + e.message)
  } finally { fetchingModels.value = false }
}

// Channel CRUD Methods
async function loadChannels() {
  try {
    const res = await fetch('/api/ai/channels', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } })
    if (res.ok) channels.value = await res.json()
  } catch (e) { console.error('Load channels failed:', e) }
}

function openChannelDialog(ch = null) {
  editingChannel.value = ch
  channelModelList.value = ch?.models || []
  if (ch) {
    channelForm.name = ch.name
    channelForm.api_url = ch.api_url
    channelForm.api_key = ''
    channelForm.models = [...(ch.models || [])]
    channelForm.is_default = !!ch.is_default
    channelForm.default_model = ch.default_model || ''
  } else {
    channelForm.name = ''
    channelForm.api_url = 'https://api.openai.com/v1'
    channelForm.api_key = ''
    channelForm.models = []
    channelForm.is_default = channels.value.length === 0
    channelForm.default_model = ''
  }
  showChannelDialog.value = true
}

function toggleModel(m) {
  const idx = channelForm.models.indexOf(m)
  if (idx >= 0) channelForm.models.splice(idx, 1)
  else channelForm.models.push(m)
}

function removeModel(m) {
  channelForm.models = channelForm.models.filter(x => x !== m)
}

async function fetchChannelModels() {
  if (editingChannel.value) {
    fetchingChModels.value = true
    try {
      const res = await fetch('/api/ai/channels/' + editingChannel.value.id + '/models', {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
      })
      if (res.ok) {
        const data = await res.json()
        channelModelList.value = data.models || []
      } else {
        const err = await res.json().catch(() => ({}))
        alert('获取模型失败: ' + (err.error || res.statusText))
      }
    } catch (e) { alert('获取模型失败: ' + e.message) }
    finally { fetchingChModels.value = false }
  } else {
    if (!channelForm.api_key || !channelForm.api_url) return alert('请先填入 API 地址和密钥')
    fetchingChModels.value = true
    try {
      const res = await api.fetchAIModels({ api_url: channelForm.api_url, api_key: channelForm.api_key })
      channelModelList.value = res.models || []
      if (!channelModelList.value.length) alert('未获取到模型列表')
    } catch (e) { alert('获取模型失败: ' + e.message) }
    finally { fetchingChModels.value = false }
  }
}

async function saveChannel() {
  if (!channelForm.name) return alert('请填入渠道名称')
  if (!channelForm.api_url) return alert('请填入 API 地址')
  if (!editingChannel.value && !channelForm.api_key) return alert('请填入 API 密钥')
  savingChannel.value = true
  try {
    const body = { name: channelForm.name, api_url: channelForm.api_url, models: channelForm.models, is_default: channelForm.is_default, default_model: channelForm.default_model }
    if (channelForm.api_key) body.api_key = channelForm.api_key
    const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') }
    if (editingChannel.value) {
      await fetch('/api/ai/channels/' + editingChannel.value.id, { method: 'PUT', headers, body: JSON.stringify(body) })
    } else {
      body.api_key = channelForm.api_key
      await fetch('/api/ai/channels', { method: 'POST', headers, body: JSON.stringify(body) })
    }
    showChannelDialog.value = false
    await loadChannels()
  } catch (e) { alert('保存失败: ' + e.message) }
  finally { savingChannel.value = false }
}

async function deleteChannel(id) {
  if (!confirm('确定删除此渠道？')) return
  try {
    await fetch('/api/ai/channels/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } })
    await loadChannels()
  } catch (e) { alert('删除失败: ' + e.message) }
}

async function setDefaultChannel(id) {
  try {
    await fetch('/api/ai/channels/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') },
      body: JSON.stringify({ is_default: true })
    })
    await loadChannels()
  } catch (e) { alert('设置失败: ' + e.message) }
}

function addLog(type, msg) {
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  logEntries.value.push({ type, msg, time })
  setTimeout(() => {
    const el = logPanelRef.value?.querySelector('.log-body')
    if (el) el.scrollTop = el.scrollHeight
  }, 50)
}

function abortTranslation() {
  aborted = true
  addLog('warn', '用户停止了翻译')
}

const allPages = ['products', 'news', 'company', 'page_texts', 'categories', 'hero']
const pageLabels = { products: '产品', news: '新闻', company: '公司信息', page_texts: '页面文字', categories: '产品分类', hero: 'Hero区域' }

const failedItems = ref([])

const startTranslate = async () => {
  if (!selectedLang.value) return alert('请选择目标语言')
  aborted = false
  const pages = selectedPage.value === 'all' ? [...allPages] : [selectedPage.value]
  await runPages(pages)
}

async function retryFailed() {
  if (!failedItems.value.length) return
  const items = [...failedItems.value]
  failedItems.value = []
  addLog('info', `🔄 重试 ${items.length} 个失败项目`)
  aborted = false
  await runItems(items)
}

async function runPages(pages) {
  translating.value = true
  translateResult.value = null
  failedPages.value = []
  failedItems.value = []
  progressTotal.value = 0
  progressDone.value = 0
  progressOk.value = 0
  progressErrors.value = 0

  addLog('info', `开始翻译 → 目标语言: ${selectedLang.value}，范围: ${pages.map(p => pageLabels[p] || p).join(', ')}`)

  addLog('info', `📋 正在获取待翻译内容列表...`)
  let allItemsList = []
  try {
    for (const page of pages) {
      const items = await api.getTranslationItems(page)
      allItemsList.push(...(items || []))
    }
    addLog('ok', `📋 共发现 ${allItemsList.length} 个待翻译项目`)
  } catch (e) {
    addLog('error', `❌ 获取翻译列表失败: ${e.message}`)
    translating.value = false
    return
  }

  if (allItemsList.length === 0) {
    addLog('ok', `✔ 无需翻译（已全部翻译）`)
    translating.value = false
    return
  }

  await runItems(allItemsList)
}

async function runItems(itemsList) {
  translating.value = true
  progressTotal.value = itemsList.length
  progressDone.value = 0
  progressOk.value = 0
  progressErrors.value = 0
  const allResults = []
  const allErrors = []
  const newFailed = []

  const CONCURRENCY = concurrency.value || 3
  const BULK_SIZE = 5

  addLog('info', `⚡ 批量翻译模式: 每次 ${BULK_SIZE} 个项目, ${CONCURRENCY} 路并发`)

  let queueIdx = 0

  async function worker() {
    while (queueIdx < itemsList.length) {
      if (aborted) break
      const chunk = []
      while (queueIdx < itemsList.length && chunk.length < BULK_SIZE) {
        chunk.push(itemsList[queueIdx++])
      }
      if (chunk.length === 0) break

      if (aborted) {
        for (const item of chunk) { newFailed.push(item); progressDone.value++ }
        addLog('warn', `⏭ 跳过 ${chunk.length} 个项目（已停止）`)
        continue
      }

      const names = chunk.map(c => c.itemName).join(', ')
      const totalFields = chunk.reduce((s, c) => s + (c.fields?.length || 0), 0)
      addLog('info', `→ 批量翻译 ${chunk.length} 个项目 (${totalFields} 个字段): ${names.slice(0, 120)}`)

      try {
        const bulkItems = chunk.map(c => ({ type: c.type, id: c.id }))
        const res = await api.runTranslationBulk(selectedLang.value, bulkItems)
        const ok = res.results?.length || 0
        const errs = res.errors?.length || 0
        progressOk.value += ok
        progressErrors.value += errs

        if (res.results) allResults.push(...res.results)
        if (res.errors) allErrors.push(...res.errors)

        if (errs > 0) {
          for (const e of res.errors) {
            const code = e.errorCode ? `[${e.errorCode}]` : ''
            addLog('error', `   ❌ ${e.itemName || ''} ${code}: ${(e.error || '').slice(0, 120)}`)
          }
          if (ok > 0) addLog('warn', `   ⚠️ 批量: ${ok} 成功, ${errs} 错误`)
          for (const item of chunk) newFailed.push(item)
        } else if (ok === 0) {
          addLog('ok', `   ✔ 批量 ${chunk.length} 个项目无需翻译`)
        } else {
          addLog('ok', `   ✅ 批量翻译成功: ${ok} 个字段`)
        }
      } catch (e) {
        progressErrors.value += chunk.length
        for (const item of chunk) {
          allErrors.push({ item: item.itemName, error: e.message, errorCode: 'ERR_API' })
          newFailed.push(item)
        }
        addLog('error', `   ❌ 批量翻译失败: ${e.message}`)
      }

      progressDone.value += chunk.length
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, Math.ceil(itemsList.length / BULK_SIZE)) }, () => worker())
  await Promise.all(workers)

  failedItems.value = newFailed
  failedPages.value = newFailed.length > 0 ? ['has_failures'] : []
  translateResult.value = {
    total: progressOk.value + progressErrors.value,
    translated: progressOk.value,
    results: allResults,
    errors: allErrors
  }

  addLog('info', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  addLog(newFailed.length ? 'warn' : 'ok',
    `🏁 翻译完成: 成功 ${progressOk.value} 项, 错误 ${progressErrors.value} 项` +
    (newFailed.length ? ` | ${newFailed.length} 个项目失败` : ' | 全部成功！')
  )
  if (newFailed.length) {
    addLog('info', `💡 点击「🔄 重试失败项」可重新翻译: ${newFailed.map(i => i.itemName).slice(0, 5).join(', ')}${newFailed.length > 5 ? '...' : ''}`)
  }
  addLog('info', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

  translating.value = false
  languages.value = await api.getLanguages()
}

const doSearch = async () => {
  if (!searchLang.value) return alert('请选择目标语言')
  searching.value = true; searched.value = false; searchResults.value = []
  try {
    const res = await api.searchUntranslated(searchLang.value, searchQuery.value, searchPage.value)
    searchResults.value = (res || []).map(r => ({ ...r, replacement: '', saving: false, saved: false }))
    searched.value = true
  } catch (e) {
    alert(e.message)
  } finally {
    searching.value = false
  }
}

const saveOverride = async (item) => {
  if (!item.replacement.trim()) return alert('请输入翻译内容')
  item.saving = true
  try {
    await api.saveTranslationOverride({
      language_code: searchLang.value,
      content_type: item.content_type,
      content_id: item.id,
      content_field: item.field,
      original_text: item.original,
      translated_text: item.replacement
    })
    item.saved = true
    setTimeout(() => {
      searchResults.value = searchResults.value.filter(r => r !== item)
    }, 1500)
  } catch (e) { alert(e.message) } finally { item.saving = false }
}
</script>

<style scoped>
.translations-page h1 { margin-bottom: 20px; font-size: 22px; }
.page-desc { color: #64748b; font-size: 14px; margin-bottom: 16px; }
.section-title { margin: 0 0 10px; font-size: 16px; }

.card { background: white; border-radius: 12px; box-shadow: 0 1px 6px rgba(0,0,0,0.07); }
.card-header-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid #f1f5f9; flex-wrap: wrap; gap: 10px; }
.card-header-row h3 { margin: 0; font-size: 15px; }
.card-body { padding: 20px; }

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media(max-width:700px){ .grid-2 { grid-template-columns: 1fr; } }

.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-weight: 600; font-size: 14px; margin-bottom: 5px; color: #334155; }
.form-control { width: 100%; padding: 9px 12px; border: 2px solid #e2e8f0; border-radius: 6px; font-size: 14px; box-sizing: border-box; transition: border-color .2s; }
.form-control:focus { outline: none; border-color: #3b82f6; }
.form-hint { font-size: 12px; color: #94a3b8; margin-top: 4px; }
.hint { color: #94a3b8; font-size: 12px; font-weight: 400; }
.btn-row { display: flex; align-items: center; gap: 12px; }
.save-ok { color: #22c55e; font-size: 14px; font-weight: 600; }

.model-row { display: flex; gap: 8px; }
.model-row input { flex: 1; }
.model-list { max-height: 180px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 6px; margin-top: 6px; }
.model-item { padding: 7px 12px; font-size: 13px; cursor: pointer; font-family: monospace; border-bottom: 1px solid #f1f5f9; }
.model-item:hover { background: #f0f4ff; }
.model-item.selected { background: #dbeafe; color: #1d4ed8; font-weight: 700; }

.multilingual-toggle { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #475569; }
.toggle-status.on { color: #22c55e; font-weight: 700; }
.toggle-status.off { color: #94a3b8; }

/* Translate panel */
.translate-panel { }
.panel-row { display: flex; gap: 16px; margin-bottom: 12px; }
@media(max-width:600px){ .panel-row { flex-direction: column; } }

/* Results */
.result-panel { margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
.result-summary { padding: 10px 14px; border-radius: 8px; font-size: 14px; margin-bottom: 12px; }
.result-summary.all-ok { background: #dcfce7; color: #166534; }
.result-summary.has-error { background: #fef3c7; color: #92400e; }
.err-count { color: #dc2626; font-weight: 700; }
.result-list { display: flex; flex-direction: column; gap: 4px; max-height: 300px; overflow-y: auto; }
.result-row { display: flex; gap: 8px; align-items: center; font-size: 13px; padding: 6px 10px; border-radius: 4px; background: #f8fafc; }
.result-row.ok { border-left: 3px solid #22c55e; }
.r-type { color: #94a3b8; font-size: 11px; font-family: monospace; white-space: nowrap; }
.r-src { color: #64748b; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.r-arrow { color: #94a3b8; flex-shrink: 0; }
.r-dst { color: #1e293b; font-weight: 500; flex: 1.5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.more-note { font-size: 12px; color: #94a3b8; text-align: center; padding: 8px; }
.error-log { margin-top: 14px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px; }
.error-log h4 { margin: 0 0 10px; font-size: 14px; color: #dc2626; }
.error-row { font-size: 13px; color: #7f1d1d; margin-bottom: 6px; word-break: break-all; }
.error-row code { background: #fee2e2; padding: 1px 5px; border-radius: 3px; font-family: monospace; }

/* Search */
.search-row { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.search-results { display: flex; flex-direction: column; gap: 12px; }
.result-item { padding: 14px; background: #f8fafc; border-radius: 8px; border-left: 3px solid #3b82f6; }
.result-meta { font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 6px; }
.result-original { font-size: 14px; color: #334155; margin-bottom: 8px; background: white; padding: 8px 10px; border-radius: 4px; border: 1px solid #e2e8f0; }
.result-replace { display: flex; gap: 8px; align-items: center; }
.result-replace input { flex: 1; }
.result-saved { color: #22c55e; font-size: 13px; font-weight: 700; margin-top: 6px; }
.empty-tip { color: #94a3b8; text-align: center; padding: 24px; font-size: 14px; }
.empty-tip a { color: #3b82f6; }

/* Toggle */
.switch { position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; inset: 0; background: #cbd5e1; border-radius: 22px; transition: .3s; }
.slider:before { position: absolute; content: ''; height: 16px; width: 16px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: .3s; }
input:checked + .slider { background: #22c55e; }
input:checked + .slider:before { transform: translateX(18px); }
.btn { padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; border: none; font-size: 14px; transition: all .2s; }
.btn-primary { background: #2563eb; color: white; }
.btn-primary:hover { background: #1d4ed8; }
.btn-outline { background: white; color: #2563eb; border: 1.5px solid #2563eb; }
.btn-outline:hover { background: #eff6ff; }
.btn-sm { padding: 5px 12px; font-size: 13px; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-warning { background: #f59e0b; color: white; }
.btn-warning:hover { background: #d97706; }

/* Progress Bar */
.progress-bar-wrap { margin-top: 16px; }
.progress-bar { width: 100%; height: 8px; background: #e2e8f0; border-radius: 8px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #22c55e, #16a34a); border-radius: 8px; transition: width 0.3s ease; }
.progress-fill.error { background: linear-gradient(90deg, #f59e0b, #d97706); }
.progress-text { font-size: 13px; color: #64748b; margin-top: 6px; text-align: center; }
.spin { display: inline-block; animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* Log Panel */
.log-panel { margin-top: 16px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
.log-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; color: #475569; }
.log-body { max-height: 320px; overflow-y: auto; padding: 8px; font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; background: #1e293b; color: #e2e8f0; }
.log-entry { padding: 3px 8px; border-radius: 3px; display: flex; gap: 8px; align-items: flex-start; line-height: 1.5; }
.log-entry.ok { color: #4ade80; }
.log-entry.error { color: #f87171; }
.log-entry.warn { color: #fbbf24; }
.log-entry.info { color: #93c5fd; }
.log-time { color: #64748b; flex-shrink: 0; font-size: 11px; }
.log-icon { flex-shrink: 0; }
.log-msg { word-break: break-all; }

.channel-list { display: flex; flex-direction: column; gap: 12px; }
.channel-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; background: #fff; transition: all 0.2s; }
.channel-card:hover { border-color: var(--primary, #1d4f73); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.channel-card.is-default { border-color: var(--primary, #1d4f73); background: linear-gradient(135deg, #f0f7ff 0%, #fff 100%); }
.ch-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.ch-name { font-weight: 600; font-size: 15px; display: flex; align-items: center; gap: 8px; }
.ch-badge { background: var(--primary, #1d4f73); color: #fff; font-size: 11px; padding: 2px 8px; border-radius: 4px; }
.ch-actions { display: flex; gap: 6px; }
.ch-info { font-size: 13px; color: #64748b; display: flex; flex-direction: column; gap: 4px; }
.ch-label { color: #94a3b8; min-width: 40px; display: inline-block; }
.ch-models { display: flex; flex-wrap: wrap; gap: 4px; }
.model-tag { background: #e2e8f0; color: #334155; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.model-tag.removable { cursor: pointer; }
.model-tag.removable:hover { background: #fecaca; color: #991b1b; }
.ch-no-model { color: #94a3b8; font-style: italic; }
.selected-models { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.btn-xs { padding: 3px 8px; font-size: 12px; }
.btn-danger { color: #e74c3c; border-color: #e74c3c; }
.btn-danger:hover { background: #e74c3c; color: #fff; }
.model-check { margin-right: 4px; }
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.modal-box { background: #fff; border-radius: 14px; padding: 28px; width: 600px; max-width: 95vw; max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
.modal-box h3 { margin: 0 0 20px; font-size: 18px; }
.checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }
.checkbox-label input { width: 16px; height: 16px; }
</style>
