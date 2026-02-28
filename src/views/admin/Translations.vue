<template>
  <div class="translations-page">
    <h1>🤖 AI 翻译管理</h1>

    <!-- AI Settings Card -->
    <div class="card">
      <div class="card-header-row">
        <h3>AI 渠道设置</h3>
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
      </div>
      <div class="card-body">
        <div class="grid-2">
          <div class="form-group">
            <label>API 地址 <span class="hint">支持 OpenAI 及所有兼容格式接口</span></label>
            <input v-model="settings.api_url" class="form-control" placeholder="https://api.openai.com/v1" />
          </div>
          <div class="form-group">
            <label>API 密钥</label>
            <input v-model="settings.api_key" class="form-control" type="password" placeholder="sk-..." autocomplete="new-password" />
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label>模型名称</label>
            <div class="model-row">
              <input v-model="settings.model_name" class="form-control" placeholder="gpt-3.5-turbo" />
              <button class="btn btn-outline btn-sm" @click="fetchModels" :disabled="fetchingModels">
                {{ fetchingModels ? '搜索中...' : '🔍 搜索模型' }}
              </button>
            </div>
            <div class="model-list" v-if="models.length">
              <div v-for="m in models" :key="m" class="model-item"
                   :class="{ selected: settings.model_name === m }"
                   @click="settings.model_name = m">{{ m }}</div>
            </div>
          </div>
          <div class="form-group">
            <label>翻译源语言</label>
            <select v-model="settings.source_lang" class="form-control">
              <option value="en">English（英文，推荐）</option>
            </select>
            <p class="form-hint">翻译以英文内容为标准源语言进行翻译</p>
          </div>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" @click="saveSettings" :disabled="saving">
            {{ saving ? '保存中...' : '💾 保存设置' }}
          </button>
          <span v-if="savedMsg" class="save-ok">✅ 已保存</span>
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
                <option value="products">产品（Products）</option>
                <option value="news">新闻（News）</option>
                <option value="company">公司信息（Company）</option>
                <option value="page_texts">页面文字（Page Texts）</option>
              </select>
            </div>
          </div>
          <button class="btn btn-primary" @click="startTranslate" :disabled="translating || !selectedLang">
            {{ translating ? '⏳ 翻译中...' : '🚀 开始翻译' }}
          </button>
        </div>

        <!-- Translation Results -->
        <div v-if="translateResult" class="result-panel">
          <div class="result-summary" :class="translateResult.errors?.length ? 'has-error' : 'all-ok'">
            <strong>翻译完成：</strong>
            成功 {{ translateResult.translated }} / {{ translateResult.total }} 项
            <span v-if="translateResult.errors?.length" class="err-count">
              ，{{ translateResult.errors.length }} 个错误
            </span>
          </div>

          <!-- Success list -->
          <div v-if="translateResult.results?.length" class="result-list">
            <div v-for="(r, i) in translateResult.results.slice(0, 30)" :key="i" class="result-row ok">
              <span class="r-type">{{ r.type }}/{{ r.field }}</span>
              <span class="r-src">{{ r.original.slice(0, 50) }}</span>
              <span class="r-arrow">→</span>
              <span class="r-dst">{{ r.translated.slice(0, 80) }}</span>
            </div>
            <p v-if="translateResult.results.length > 30" class="more-note">
              ...还有 {{ translateResult.results.length - 30 }} 项（已全部保存到数据库）
            </p>
          </div>

          <!-- Error logs -->
          <div v-if="translateResult.errors?.length" class="error-log">
            <h4>⚠️ 错误日志（可根据此调整 API 设置）</h4>
            <div v-for="(e, i) in translateResult.errors" :key="i" class="error-row">
              <code>{{ e.batch ? `Batch ${e.batch}` : e.item }}</code>: {{ e.error }}
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

const languages = ref([])
const models = ref([])
const fetchingModels = ref(false)
const saving = ref(false)
const savedMsg = ref(false)

const selectedLang = ref('')
const selectedPage = ref('all')
const translating = ref(false)
const translateResult = ref(null)

const searchLang = ref('')
const searchPage = ref('all')
const searchQuery = ref('')
const searchResults = ref([])
const searching = ref(false)
const searched = ref(false)

const nonEnLangs = computed(() => languages.value.filter(l => l.code !== 'en'))

onMounted(async () => {
  try {
    const [s, langs] = await Promise.all([
      api.getTranslationSettings(),
      api.getLanguages()
    ])
    if (s) {
      settings.api_url = s.api_url || 'https://api.openai.com/v1'
      settings.api_key = ''  // Never pre-fill key for security; user must re-enter to change
      settings.model_name = s.model_name || 'gpt-3.5-turbo'
      settings.multilingual_enabled = !!s.multilingual_enabled
    }
    languages.value = langs || []
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
    alert('保存失败: ' + e.message)
  } finally {
    saving.value = false
  }
}

const fetchModels = async () => {
  if (!settings.api_key) return alert('请先填入 API 密钥')
  fetchingModels.value = true; models.value = []
  try {
    const res = await api.fetchAIModels({ api_url: settings.api_url, api_key: settings.api_key })
    models.value = res.models || []
    if (!models.value.length) alert('未获取到模型列表，请检查 API 地址和密钥是否正确')
  } catch (e) {
    alert('获取模型失败: ' + e.message)
  } finally {
    fetchingModels.value = false }
}

const startTranslate = async () => {
  if (!settings.api_key && !savedMsg.value) {
    // Check if key is already saved
    const check = await api.getTranslationSettings().catch(() => null)
    if (!check?.api_key) return alert('请先填入并保存 API 密钥')
  }
  if (!selectedLang.value) return alert('请选择目标语言')
  translating.value = true
  translateResult.value = null
  try {
    // Save settings first (if api_key is filled)
    if (settings.api_key) await saveSettings()
    const res = await api.runTranslationPage(selectedLang.value, selectedPage.value)
    translateResult.value = res
    // Refresh language list to get updated ai_translated status
    languages.value = await api.getLanguages()
  } catch (e) {
    translateResult.value = { success: false, error: e.message, results: [], errors: [{ error: e.message }], total: 0, translated: 0 }
  } finally {
    translating.value = false
  }
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
</style>
