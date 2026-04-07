<template>
  <div class="indexing-page">
    <h1>🔍 Google 批量收录提交</h1>

    <!-- Step 1: Service Account Setup -->
    <div class="card">
      <div class="card-header">
        <h3>🔑 第一步：配置 Google Service Account</h3>
        <span :class="['badge', credStatus.configured ? 'badge-ok' : 'badge-warn']">
          {{ credStatus.configured ? `✅ 已配置 (${credStatus.email})` : '⚠️ 未配置' }}
        </span>
      </div>
      <div class="card-body">
        <div class="info-box" v-if="!credStatus.configured">
          <strong>📌 配置步骤（只需做一次）：</strong>
          <ol>
            <li>访问 <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a> → 创建项目</li>
            <li>启用 <strong>Google Search Console API</strong> 和 <strong>Web Search Indexing API</strong></li>
            <li>创建服务账号（IAM → 服务账号 → 创建 → 角色：Owner）</li>
            <li>生成 JSON 密钥（服务账号 → 密钥 → 添加密钥 → JSON）</li>
            <li>在 <a href="https://search.google.com/search-console" target="_blank">Google Search Console</a> → 设置 → 用户和权限 → 添加该服务账号邮箱为「所有者」</li>
            <li>将 JSON 文件内容粘贴到下方文本框保存</li>
          </ol>
        </div>
        <div v-if="credStatus.configured" class="info-box info-ok">
          ✅ Service Account 已配置：<strong>{{ credStatus.email }}</strong><br>
          已可以使用 Google Indexing API 批量提交 URL
        </div>
        <div class="form-group">
          <label>Service Account JSON 密钥内容</label>
          <textarea v-model="serviceAccountJson" class="form-control code-input" rows="6"
            placeholder='{"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----...","client_email":"...@....gserviceaccount.com",...}'></textarea>
        </div>
        <button class="btn btn-primary" @click="saveCredentials" :disabled="savingCred || !serviceAccountJson">
          {{ savingCred ? '保存中...' : '💾 保存凭据' }}
        </button>
        <span v-if="credMsg" :class="['msg', credMsg.ok ? 'msg-ok' : 'msg-err']">{{ credMsg.text }}</span>
      </div>
    </div>

    <!-- Step 2: Batch Submit -->
    <div class="card">
      <div class="card-header">
        <h3>🚀 第二步：批量提交 URL 到 Google 索引</h3>
        <span class="badge badge-info">每日限额 200 个 URL</span>
      </div>
      <div class="card-body">
        <div class="stats-row" v-if="urlList.length">
          <div class="stat-box">
            <div class="stat-num">{{ urlList.length }}</div>
            <div class="stat-label">待提交 URL 总数</div>
          </div>
          <div class="stat-box ok" v-if="batchResult">
            <div class="stat-num">{{ batchResult.successCount }}</div>
            <div class="stat-label">提交成功</div>
          </div>
          <div class="stat-box err" v-if="batchResult">
            <div class="stat-num">{{ batchResult.failCount }}</div>
            <div class="stat-label">提交失败</div>
          </div>
        </div>

        <div class="url-select" v-if="urlList.length">
          <div class="url-select-header">
            <label><input type="checkbox" @change="toggleAll" :checked="selectedUrls.length === urlList.length"> 全选 ({{ selectedUrls.length }}/{{ urlList.length }})</label>
            <div class="filter-row">
              <select v-model="filterLang" class="small-select">
                <option value="">全部语言</option>
                <option v-for="l in availableLangs" :key="l" :value="l">{{ l }}</option>
              </select>
              <select v-model="filterType" class="small-select">
                <option value="">全部类型</option>
                <option value="static">首页/静态</option>
                <option value="products">产品</option>
                <option value="news">新闻</option>
              </select>
            </div>
          </div>
          <div class="url-list-wrap">
            <div v-for="url in filteredUrls" :key="url" class="url-item">
              <label>
                <input type="checkbox" :value="url" v-model="selectedUrls">
                <span :class="['url-status', getUrlStatus(url)]">{{ getUrlStatusIcon(url) }}</span>
                <span class="url-text">{{ url }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="action-row">
          <button class="btn btn-secondary" @click="loadUrls" :disabled="loadingUrls">
            {{ loadingUrls ? '加载中...' : '🔄 加载 URL 列表' }}
          </button>
          <button class="btn btn-primary" @click="submitSelected"
            :disabled="!credStatus.configured || submitting || !selectedUrls.length">
            {{ submitting ? `提交中 ${submitProgress}/${selectedUrls.length}...` : `🚀 提交选中的 ${selectedUrls.length} 个 URL` }}
          </button>
          <button class="btn btn-outline" @click="submitSelected100"
            :disabled="!credStatus.configured || submitting || !urlList.length">
            ⚡ 提交前100个（快速）
          </button>
        </div>

        <!-- Progress bar -->
        <div class="progress-wrap" v-if="submitting">
          <div class="progress-bar">
            <div class="progress-fill" :style="{width: (submitProgress / selectedUrls.length * 100) + '%'}"></div>
          </div>
          <span class="progress-text">{{ submitProgress }} / {{ selectedUrls.length }}</span>
        </div>

        <!-- Results -->
        <div v-if="batchResult && batchResult.results" class="results-section">
          <h4>提交结果 ({{ batchResult.successCount }} 成功 / {{ batchResult.failCount }} 失败)</h4>
          <div class="result-list">
            <div v-for="r in batchResult.results.slice(0, 50)" :key="r.url"
              :class="['result-row', r.success ? 'ok' : 'err']">
              <span class="result-icon">{{ r.success ? '✅' : '❌' }}</span>
              <span class="result-url">{{ r.url.replace('https://www.sunseasteel.com', '') }}</span>
              <span v-if="r.error" class="result-err">{{ r.error }}</span>
            </div>
            <div v-if="batchResult.results.length > 50" class="more-results">
              ... 还有 {{ batchResult.results.length - 50 }} 条结果（仅显示前50条）
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 3: Bing + Yandex Sitemap-->
    <div class="card">
      <div class="card-header"><h3>🌐 Bing / Yandex Sitemap 通知</h3></div>
      <div class="card-body">
        <div class="form-group">
          <label>Sitemap URL</label>
          <div style="display:flex;gap:8px">
            <input v-model="sitemapUrl" class="form-control" readonly />
            <a :href="sitemapUrl" target="_blank" class="btn btn-outline" style="white-space:nowrap">预览</a>
          </div>
        </div>
        <div class="action-row">
          <button class="btn btn-secondary" @click="submitSitemap" :disabled="submittingSitemap">
            {{ submittingSitemap ? '提交中...' : '📡 通知 Bing + Yandex' }}
          </button>
          <span class="last-submit" v-if="lastSubmit">上次提交：{{ lastSubmit }}</span>
        </div>
        <div v-if="sitemapResults.length" class="results" style="margin-top:12px">
          <div v-for="r in sitemapResults" :key="r.engine" :class="['result-row', r.success ? 'ok' : 'err']">
            <span class="engine">{{ r.engine }}</span>
            <span>{{ r.message }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'

const token = () => localStorage.getItem('token')
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` })

// Credentials
const serviceAccountJson = ref('')
const savingCred = ref(false)
const credMsg = ref(null)
const credStatus = reactive({ configured: false, email: null })

// URLs
const urlList = ref([])
const selectedUrls = ref([])
const loadingUrls = ref(false)
const filterLang = ref('')
const filterType = ref('')
const availableLangs = ref([])

// Submission
const submitting = ref(false)
const submitProgress = ref(0)
const batchResult = ref(null)
const urlStatuses = reactive({}) // url -> 'ok' | 'err'

// Sitemap
const sitemapUrl = ref('https://www.sunseasteel.com/sitemap.xml')
const submittingSitemap = ref(false)
const sitemapResults = ref([])
const lastSubmit = ref('')

const filteredUrls = computed(() => {
  let list = urlList.value
  if (filterLang.value) list = list.filter(u => u.includes(`/${filterLang.value}/`))
  if (filterType.value === 'static') list = list.filter(u => !u.includes('/products/') && !u.includes('/news/') && !u.includes('?category'))
  if (filterType.value === 'products') list = list.filter(u => u.includes('/products/') || u.includes('?category'))
  if (filterType.value === 'news') list = list.filter(u => u.includes('/news/'))
  return list
})

function getUrlStatus(url) {
  return urlStatuses[url] || ''
}
function getUrlStatusIcon(url) {
  const s = urlStatuses[url]
  if (s === 'ok') return '✅'
  if (s === 'err') return '❌'
  return '⬜'
}

function toggleAll(e) {
  selectedUrls.value = e.target.checked ? [...filteredUrls.value] : []
}

async function loadCredStatus() {
  try {
    const r = await fetch('/api/indexing/credentials-status', { headers: headers() })
    const d = await r.json()
    credStatus.configured = d.configured
    credStatus.email = d.email
  } catch {}
}

async function saveCredentials() {
  savingCred.value = true
  credMsg.value = null
  try {
    const r = await fetch('/api/indexing/save-credentials', {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ service_account_json: serviceAccountJson.value })
    })
    const d = await r.json()
    if (r.ok) {
      credMsg.value = { ok: true, text: `✅ 保存成功！服务账号：${d.email}` }
      serviceAccountJson.value = ''
      await loadCredStatus()
    } else {
      credMsg.value = { ok: false, text: `❌ ${d.error}` }
    }
  } catch (e) {
    credMsg.value = { ok: false, text: `❌ ${e.message}` }
  } finally { savingCred.value = false }
}

async function loadUrls() {
  loadingUrls.value = true
  try {
    const r = await fetch('/api/indexing/url-list', { headers: headers() })
    const d = await r.json()
    urlList.value = d.urls || []
    selectedUrls.value = [...urlList.value]
    // Extract unique lang codes
    const langs = new Set()
    urlList.value.forEach(u => {
      const m = u.match(/sunseasteel\.com\/([a-z]{2})\//)
      if (m) langs.add(m[1])
    })
    availableLangs.value = [...langs].sort()
  } catch (e) {
    alert('加载失败: ' + e.message)
  } finally { loadingUrls.value = false }
}

async function submitSelected() {
  if (!selectedUrls.value.length) return
  submitting.value = true
  submitProgress.value = 0
  batchResult.value = null

  try {
    // Submit in chunks of 50, updating progress
    const CHUNK = 50
    const allUrls = selectedUrls.value
    const allResults = []
    let successCount = 0, failCount = 0

    for (let i = 0; i < allUrls.length; i += CHUNK) {
      const chunk = allUrls.slice(i, i + CHUNK)
      const r = await fetch('/api/indexing/submit-batch', {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ urls: chunk })
      })
      const d = await r.json()
      if (d.results) {
        for (const res of d.results) {
          allResults.push(res)
          urlStatuses[res.url] = res.success ? 'ok' : 'err'
          if (res.success) successCount++; else failCount++
        }
      }
      submitProgress.value = Math.min(i + CHUNK, allUrls.length)
    }

    batchResult.value = { successCount, failCount, results: allResults }
  } catch (e) {
    batchResult.value = { successCount: 0, failCount: selectedUrls.value.length, results: [{ url: '错误', success: false, error: e.message }] }
  } finally { submitting.value = false }
}

async function submitSelected100() {
  selectedUrls.value = urlList.value.slice(0, 100)
  await submitSelected()
}

async function submitSitemap() {
  submittingSitemap.value = true
  try {
    const r = await fetch('/api/indexing/submit', {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ sitemapUrl: sitemapUrl.value })
    })
    const d = await r.json()
    sitemapResults.value = d.results || []
    lastSubmit.value = new Date().toLocaleString('zh-CN')
  } catch (e) {
    sitemapResults.value = [{ engine: '错误', success: false, message: e.message }]
  } finally { submittingSitemap.value = false }
}

onMounted(async () => {
  await loadCredStatus()
  await loadUrls()
})
</script>

<style scoped>
.indexing-page { padding: 0 }
h1 { font-size: 24px; font-weight: 700; margin-bottom: 24px; color: #1e293b }
.card { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px }
.card-header { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 12px }
.card-header h3 { margin: 0; font-size: 16px; flex: 1 }
.card-body { padding: 20px }
.badge { padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600 }
.badge-ok { background: #dcfce7; color: #15803d }
.badge-warn { background: #fef9c3; color: #92400e }
.badge-info { background: #eff6ff; color: #1d4ed8 }
.info-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px; font-size: 13px; color: #1e40af; line-height: 1.8 }
.info-box a { color: #2563eb; font-weight: 600 }
.info-box ol { margin: 8px 0 0 18px; padding: 0 }
.info-ok { background: #dcfce7; border-color: #86efac; color: #15803d }
.form-group { margin-bottom: 16px }
.form-group label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; color: #374151 }
.form-control { width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; background: #f8fafc; box-sizing: border-box }
.code-input { font-family: monospace; font-size: 12px; resize: vertical }
.btn { padding: 8px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; text-decoration: none; display: inline-block; transition: all 0.2s }
.btn-primary { background: #3b82f6; color: #fff }
.btn-primary:hover:not(:disabled) { background: #2563eb }
.btn-secondary { background: #64748b; color: #fff }
.btn-secondary:hover:not(:disabled) { background: #475569 }
.btn-outline { background: #fff; color: #374151; border: 1px solid #d1d5db }
.btn:disabled { opacity: 0.5; cursor: not-allowed }
.msg { margin-left: 12px; font-size: 14px }
.msg-ok { color: #15803d }
.msg-err { color: #dc2626 }
.stats-row { display: flex; gap: 12px; margin-bottom: 20px }
.stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; text-align: center; min-width: 100px }
.stat-box.ok { background: #dcfce7; border-color: #86efac }
.stat-box.err { background: #fee2e2; border-color: #f87171 }
.stat-num { font-size: 28px; font-weight: 800; color: #1e293b }
.stat-label { font-size: 12px; color: #64748b; margin-top: 2px }
.url-select { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 16px }
.url-select-header { padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center }
.url-select-header label { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; cursor: pointer }
.filter-row { display: flex; gap: 8px }
.small-select { padding: 4px 8px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px; background: white }
.url-list-wrap { max-height: 300px; overflow-y: auto; padding: 8px 0 }
.url-item { padding: 4px 16px }
.url-item label { display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; font-family: monospace }
.url-status { font-size: 12px; min-width: 16px }
.url-text { color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis }
.action-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px }
.last-submit { font-size: 13px; color: #94a3b8 }
.progress-wrap { display: flex; align-items: center; gap: 12px; margin-bottom: 16px }
.progress-bar { flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden }
.progress-fill { height: 100%; background: #3b82f6; border-radius: 4px; transition: width 0.3s }
.progress-text { font-size: 13px; color: #64748b; white-space: nowrap }
.results-section { margin-top: 16px }
.results-section h4 { font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #1e293b }
.result-list { max-height: 400px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px }
.result-row { display: flex; align-items: center; gap: 10px; padding: 6px 12px; font-size: 12px; border-bottom: 1px solid #f1f5f9 }
.result-row.ok { background: #f0fdf4 }
.result-row.err { background: #fff1f2 }
.result-icon { min-width: 16px }
.result-url { font-family: monospace; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis }
.result-err { color: #dc2626; font-size: 11px; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis }
.more-results { padding: 8px 12px; text-align: center; font-size: 12px; color: #94a3b8 }
.results { display: flex; flex-direction: column; gap: 8px }
.result-row .engine { font-weight: 700; min-width: 50px }
</style>
