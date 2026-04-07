<template>
  <div class="indexing-page">
    <h1>🔍 Google 批量收录提交</h1>

    <!-- Credentials -->
    <div class="card">
      <div class="card-header">
        <h3>🔑 第一步：配置 Google Service Account</h3>
        <span :class="['badge', cred.configured ? 'badge-ok' : 'badge-warn']">
          {{ cred.configured ? `✅ 已配置 (${cred.email})` : '⚠️ 未配置' }}
        </span>
      </div>
      <div class="card-body">
        <div class="info-box" v-if="!cred.configured">
          <strong>📌 配置步骤（只需做一次）：</strong>
          <ol>
            <li>访问 <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a> → 新建项目</li>
            <li>启用 <strong>Web Search Indexing API</strong></li>
            <li>IAM → 服务账号 → 创建 → 密钥 → 下载 JSON</li>
            <li>在 <a href="https://search.google.com/search-console" target="_blank">Google Search Console</a> → 设置 → 用户和权限 → 添加服务账号邮箱为<strong>「所有者」</strong></li>
            <li>将 JSON 内容粘贴到下方保存</li>
          </ol>
        </div>
        <div v-else class="info-box info-ok">
          ✅ Service Account: <strong>{{ cred.email }}</strong>
        </div>
        <div class="form-group">
          <label>Service Account JSON 内容</label>
          <textarea v-model="saJson" class="form-control code-input" rows="5"
            placeholder='{"type":"service_account","client_email":"...@....gserviceaccount.com","private_key":"-----BEGIN PRIVATE KEY-----\n..."}'></textarea>
        </div>
        <button class="btn btn-primary" @click="saveCred" :disabled="savingCred || !saJson">
          {{ savingCred ? '保存中...' : '💾 保存凭据' }}
        </button>
        <span v-if="credMsg" :class="['inline-msg', credMsg.ok ? 'ok' : 'err']">{{ credMsg.text }}</span>
      </div>
    </div>

    <!-- Quota + Queue Stats -->
    <div class="stats-grid" v-if="status">
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-val">{{ status.quota.used }} / {{ status.quota.limit }}</div>
        <div class="stat-label">今日已提交 / 配额</div>
        <div class="stat-sub">{{ status.quota.remaining }} 个剩余</div>
        <div v-if="status.quota.auto_paused" class="stat-badge warn">已暂停（配额用尽）</div>
      </div>
      <div class="stat-card ok">
        <div class="stat-icon">✅</div>
        <div class="stat-val">{{ status.queue.submitted }}</div>
        <div class="stat-label">已成功提交</div>
        <div class="stat-sub">不会重复提交</div>
      </div>
      <div class="stat-card pending">
        <div class="stat-icon">⏳</div>
        <div class="stat-val">{{ status.queue.pending }}</div>
        <div class="stat-label">待提交</div>
        <div class="stat-sub">调度器自动处理</div>
      </div>
      <div class="stat-card err" v-if="status.queue.failed">
        <div class="stat-icon">❌</div>
        <div class="stat-val">{{ status.queue.failed }}</div>
        <div class="stat-label">失败（将自动重试）</div>
        <div class="stat-sub">指数退避: 1h/4h/24h/48h</div>
      </div>
    </div>

    <!-- Actions -->
    <div class="card">
      <div class="card-header"><h3>🚀 提交控制</h3></div>
      <div class="card-body">
        <div class="action-row">
          <button class="btn btn-primary" @click="enqueueAll(false)" :disabled="actioning">
            📋 同步 URL 到队列（跳过已成功）
          </button>
          <button class="btn btn-secondary" @click="runNow" :disabled="actioning || status?.scheduler_running">
            {{ status?.scheduler_running ? '⚙️ 调度器运行中...' : '▶️ 立即执行调度器' }}
          </button>
          <button class="btn btn-outline" @click="enqueueAll(true)" :disabled="actioning">
            🔄 重置全部（包含已成功）
          </button>
        </div>
        <div v-if="actionMsg" :class="['action-msg', actionMsg.ok ? 'ok' : 'err']">{{ actionMsg.text }}</div>

        <!-- Scheduler explanation -->
        <div class="explain-box">
          <strong>🤖 自动调度工作原理：</strong>
          <ul>
            <li>服务器启动后 <strong>每小时检查一次</strong>，自动提交待处理 URL</li>
            <li>每天最多提交 <strong>200 个</strong>（Google 官方配额），到达后自动暂停</li>
            <li>第二天凌晨配额重置，<strong>自动继续</strong>提交剩余 URL</li>
            <li>已成功的 URL <strong>不会重复提交</strong>（除非手动重置）</li>
            <li>失败的 URL 按 <strong>1h → 4h → 24h → 48h</strong> 指数退避自动重试</li>
            <li>即使网站更新、服务器重启，<strong>进度完全不受影响</strong>（存储在数据库）</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Success/Failure Explanation -->
    <div class="card">
      <div class="card-header"><h3>📖 成功/失败判断依据（官方 Google API 标准）</h3></div>
      <div class="card-body">
        <table class="code-table">
          <thead><tr><th>HTTP 状态码</th><th>含义</th><th>处理方式</th></tr></thead>
          <tbody>
            <tr class="ok-row"><td><code>200 OK</code></td><td>✅ 成功 — Google 已收到收录请求</td><td>标记为「已提交」，不再重试</td></tr>
            <tr class="err-row"><td><code>429</code></td><td>❌ 超出每日配额（200/天）</td><td>立即暂停，明天自动继续</td></tr>
            <tr class="err-row"><td><code>403</code></td><td>❌ 未授权 — 服务账号未在 GSC 添加为所有者</td><td>重试（需手动修复权限）</td></tr>
            <tr class="err-row"><td><code>401</code></td><td>❌ Token 无效或过期</td><td>重试（系统自动刷新 Token）</td></tr>
            <tr class="err-row"><td><code>400</code></td><td>❌ URL 格式不合法</td><td>标记失败，指数退避重试</td></tr>
            <tr class="err-row"><td><code>404</code></td><td>❌ URL 不存在</td><td>标记失败，指数退避重试</td></tr>
            <tr class="warn-row"><td><code>5xx</code></td><td>⚠️ Google 服务器临时错误</td><td>指数退避重试</td></tr>
          </tbody>
        </table>
        <div class="info-note">
          <strong>注意：</strong> 200 只代表 Google <em>收到了通知</em>，不代表立即收录。Google 会在之后的爬取中优先处理这些 URL，实际收录时间通常为 1-7 天。
        </div>
      </div>
    </div>

    <!-- Recent Submission Log -->
    <div class="card">
      <div class="card-header">
        <h3>📋 最近提交记录</h3>
        <button class="btn btn-sm btn-outline" @click="loadStatus">🔄 刷新</button>
      </div>
      <div class="card-body p0">
        <div class="log-table-wrap">
          <table class="log-table" v-if="status?.recent?.length">
            <thead>
              <tr><th>状态</th><th>URL</th><th>HTTP码</th><th>错误信息</th><th>提交时间</th><th>重试次数</th><th>操作</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in status.recent" :key="r.url" :class="['log-row', r.status]">
                <td><span :class="['status-badge', r.status]">{{ statusLabel(r.status) }}</span></td>
                <td class="url-cell" :title="r.url">{{ r.url.replace('https://www.sunseasteel.com', '') }}</td>
                <td>{{ r.http_code || '-' }}</td>
                <td class="err-cell">{{ r.error_message || '-' }}</td>
                <td>{{ r.submitted_at ? r.submitted_at.substring(0, 16) : '-' }}</td>
                <td>{{ r.retry_count }}</td>
                <td>
                  <button class="btn btn-xs" @click="resetUrl(r.url)" v-if="r.status !== 'pending'">重置</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-state">暂无记录，请先点「同步 URL 到队列」</div>
        </div>
      </div>
    </div>

    <!-- Bing / Yandex -->
    <div class="card">
      <div class="card-header"><h3>🌐 Bing / Yandex Sitemap 通知</h3></div>
      <div class="card-body">
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <input :value="'https://www.sunseasteel.com/sitemap.xml'" class="form-control" readonly />
          <a href="https://www.sunseasteel.com/sitemap.xml" target="_blank" class="btn btn-outline">预览</a>
        </div>
        <div class="action-row">
          <button class="btn btn-secondary" @click="submitSitemap" :disabled="submittingSitemap">
            {{ submittingSitemap ? '提交中...' : '📡 通知 Bing + Yandex' }}
          </button>
          <span class="last-submit" v-if="lastSubmit">上次：{{ lastSubmit }}</span>
        </div>
        <div v-if="sitemapResults.length" style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
          <div v-for="r in sitemapResults" :key="r.engine" :class="['ping-row', r.success ? 'ok' : 'err']">
            <strong>{{ r.engine }}</strong> {{ r.message }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'

const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` })
const api = async (path, opts = {}) => { const r = await fetch('/api/indexing' + path, { headers: h(), ...opts }); return r.json() }

const cred = reactive({ configured: false, email: null })
const saJson = ref('')
const savingCred = ref(false)
const credMsg = ref(null)

const status = ref(null)
const actioning = ref(false)
const actionMsg = ref(null)

const submittingSitemap = ref(false)
const sitemapResults = ref([])
const lastSubmit = ref('')

let refreshTimer = null

function statusLabel(s) {
  return { submitted: '✅ 已提交', pending: '⏳ 待提交', failed: '❌ 失败' }[s] || s
}

async function loadCred() {
  const d = await api('/credentials-status')
  cred.configured = d.configured
  cred.email = d.email
}

async function loadStatus() {
  try { status.value = await api('/status') } catch {}
}

async function saveCred() {
  savingCred.value = true; credMsg.value = null
  try {
    const d = await api('/save-credentials', { method: 'POST', body: JSON.stringify({ service_account_json: saJson.value }) })
    if (d.email) { credMsg.value = { ok: true, text: `✅ 已保存：${d.email}` }; saJson.value = ''; await loadCred() }
    else credMsg.value = { ok: false, text: `❌ ${d.error}` }
  } catch (e) { credMsg.value = { ok: false, text: `❌ ${e.message}` } }
  savingCred.value = false
}

async function enqueueAll(force) {
  actioning.value = true; actionMsg.value = null
  try {
    const d = await api('/enqueue', { method: 'POST', body: JSON.stringify({ force }) })
    actionMsg.value = { ok: true, text: d.message }
    await loadStatus()
  } catch (e) { actionMsg.value = { ok: false, text: e.message } }
  actioning.value = false
}

async function runNow() {
  actioning.value = true; actionMsg.value = null
  try {
    const d = await api('/run-now', { method: 'POST', body: '{}' })
    actionMsg.value = { ok: true, text: d.message }
    setTimeout(loadStatus, 3000)
  } catch (e) { actionMsg.value = { ok: false, text: e.message } }
  actioning.value = false
}

async function resetUrl(url) {
  await api('/reset-url', { method: 'POST', body: JSON.stringify({ url }) })
  await loadStatus()
}

async function submitSitemap() {
  submittingSitemap.value = true
  try {
    const d = await api('/submit', { method: 'POST', body: JSON.stringify({ sitemapUrl: 'https://www.sunseasteel.com/sitemap.xml' }) })
    sitemapResults.value = d.results || []
    lastSubmit.value = new Date().toLocaleString('zh-CN')
  } catch (e) { sitemapResults.value = [{ engine: '错误', success: false, message: e.message }] }
  submittingSitemap.value = false
}

onMounted(async () => {
  await Promise.all([loadCred(), loadStatus()])
  refreshTimer = setInterval(loadStatus, 15000) // auto-refresh every 15s
})
onUnmounted(() => clearInterval(refreshTimer))
</script>

<style scoped>
.indexing-page { padding: 0 }
h1 { font-size: 24px; font-weight: 700; margin-bottom: 24px; color: #1e293b }
.card { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px }
.card-header { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 12px }
.card-header h3 { margin: 0; font-size: 16px; flex: 1 }
.card-body { padding: 20px }
.card-body.p0 { padding: 0 }
.badge { padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600 }
.badge-ok { background: #dcfce7; color: #15803d }
.badge-warn { background: #fef9c3; color: #92400e }
.info-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px; font-size: 13px; color: #1e40af; line-height: 1.8 }
.info-box a { color: #2563eb; font-weight: 600 }
.info-box ol { margin: 8px 0 0 18px }
.info-ok { background: #dcfce7; border-color: #86efac; color: #15803d }
.form-group { margin-bottom: 14px }
.form-group label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; color: #374151 }
.form-control { width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; background: #f8fafc; box-sizing: border-box }
.code-input { font-family: monospace; font-size: 12px; resize: vertical }
.btn { padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; display: inline-block; transition: all 0.2s; text-decoration: none }
.btn-primary { background: #3b82f6; color: #fff }
.btn-primary:hover:not(:disabled) { background: #2563eb }
.btn-secondary { background: #6366f1; color: #fff }
.btn-secondary:hover:not(:disabled) { background: #4f46e5 }
.btn-outline { background: #fff; color: #374151; border: 1px solid #d1d5db }
.btn-sm { padding: 4px 12px; font-size: 13px }
.btn-xs { padding: 2px 8px; font-size: 11px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; cursor: pointer }
.btn:disabled { opacity: 0.5; cursor: not-allowed }
.inline-msg { margin-left: 12px; font-size: 14px }
.inline-msg.ok { color: #15803d }
.inline-msg.err { color: #dc2626 }

/* Stats Grid */
.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px }
.stat-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center }
.stat-card.ok { border-color: #86efac; background: #f0fdf4 }
.stat-card.pending { border-color: #93c5fd; background: #eff6ff }
.stat-card.err { border-color: #f87171; background: #fff1f2 }
.stat-icon { font-size: 24px; margin-bottom: 6px }
.stat-val { font-size: 32px; font-weight: 800; color: #1e293b; line-height: 1 }
.stat-label { font-size: 13px; color: #64748b; margin: 4px 0 2px }
.stat-sub { font-size: 11px; color: #94a3b8 }
.stat-badge { display: inline-block; margin-top: 6px; padding: 2px 8px; border-radius: 10px; font-size: 11px }
.stat-badge.warn { background: #fef9c3; color: #92400e }

/* Action row */
.action-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 12px }
.action-msg { font-size: 14px; padding: 8px 12px; border-radius: 8px; margin-top: 8px }
.action-msg.ok { background: #dcfce7; color: #15803d }
.action-msg.err { background: #fee2e2; color: #dc2626 }
.last-submit { font-size: 13px; color: #94a3b8 }

/* Explain box */
.explain-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-top: 16px; font-size: 13px; color: #374151 }
.explain-box ul { margin: 8px 0 0 18px; line-height: 2 }

/* Code table */
.code-table { width: 100%; border-collapse: collapse; font-size: 13px }
.code-table th { background: #f8fafc; padding: 8px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e2e8f0 }
.code-table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9 }
.code-table code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 600 }
.ok-row td { color: #15803d }
.err-row td { color: #dc2626 }
.warn-row td { color: #d97706 }
.info-note { margin-top: 12px; padding: 10px 14px; background: #fef9c3; border-radius: 8px; font-size: 13px; color: #92400e }

/* Log table */
.log-table-wrap { overflow-x: auto; max-height: 400px; overflow-y: auto }
.log-table { width: 100%; border-collapse: collapse; font-size: 12px }
.log-table th { background: #f8fafc; padding: 8px 12px; text-align: left; position: sticky; top: 0; border-bottom: 1px solid #e2e8f0; font-size: 12px }
.log-table td { padding: 6px 12px; border-bottom: 1px solid #f8fafc }
.log-row.submitted { background: #f0fdf4 }
.log-row.failed { background: #fff1f2 }
.status-badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; white-space: nowrap }
.status-badge.submitted { background: #dcfce7; color: #15803d }
.status-badge.pending { background: #eff6ff; color: #1d4ed8 }
.status-badge.failed { background: #fee2e2; color: #dc2626 }
.url-cell { max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace }
.err-cell { color: #dc2626; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
.empty-state { text-align: center; padding: 40px; color: #94a3b8; font-size: 14px }

/* Bing/Yandex */
.ping-row { padding: 8px 12px; border-radius: 8px; font-size: 14px }
.ping-row.ok { background: #dcfce7; color: #15803d }
.ping-row.err { background: #fee2e2; color: #b91c1c }
</style>
