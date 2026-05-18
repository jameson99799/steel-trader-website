<template>
  <div class="indexing-page">
    <h1>🔍 Google 网页检查与收录提交</h1>

    <!-- OAuth Credentials -->
    <div class="card">
      <div class="card-header">
        <h3>🔑 第一步：配置 Google OAuth API 凭据</h3>
        <span :class="['badge', oauthStatus?.authorized ? 'badge-ok' : 'badge-warn']">
          {{ oauthStatus?.authorized ? `✅ 账号已授权登录` : '⚠️ 尚未授权登录' }}
        </span>
      </div>
      <div class="card-body">
        <div class="info-box" v-if="!oauthStatus?.authorized">
          <strong>📌 配置步骤：</strong>
          <ol>
            <li>访问 <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a> → 创建项目</li>
            <li>启用 <strong>Google Search Console API</strong> 和 <strong>Web Search Indexing API</strong></li>
            <li>API 和服务 → 凭据 → <strong>创建 OAuth 客户端 ID</strong> (Web 应用)</li>
            <li>将授权的重定向 URI 设置为：<code>https://www.sunseasteel.com/api/indexing/oauth/callback</code></li>
            <li>复制下方的 Client ID 和 Client Secret 进行保存，然后点击登录。</li>
          </ol>
        </div>
        
        <div v-if="!oauthStatus?.authorized" class="form-row">
          <div class="form-group">
            <label>Client ID</label>
            <input v-model="clientId" class="form-control" placeholder="例如：12345678-xxxx.apps.googleusercontent.com" />
          </div>
          <div class="form-group">
            <label>Client Secret</label>
            <input v-model="clientSecret" type="password" class="form-control" placeholder="例如：GOCSPX-xxxx" />
          </div>
          <button class="btn btn-primary" @click="saveClientConfig" :disabled="savingCred || !clientId || !clientSecret">
            {{ savingCred ? '保存中...' : '💾 保存 Client 信息' }}
          </button>
          <span v-if="credMsg" :class="['inline-msg', credMsg.ok ? 'ok' : 'err']">{{ credMsg.text }}</span>
        </div>

        <div style="margin-top: 16px;">
          <button v-if="!oauthStatus?.authorized" class="btn btn-login" @click="loginWithGoogle" :disabled="!oauthStatus?.has_client">
            <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="G" class="g-logo" />
            使用 Google 账号登录并授权
          </button>
          <div v-else class="action-row">
            <div class="info-ok">✅ 已成功获取 Google 授权 (Access/Refresh Token 正常)</div>
            <button class="btn btn-outline" @click="revokeAuth" style="margin-left:auto; color:#dc2626; border-color:#fca5a5">
              退出登录 / 撤销授权
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Quota + Queue Stats -->
    <div class="stats-grid" v-if="status">
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-val">{{ status.quota.used }} / {{ status.quota.limit }}</div>
        <div class="stat-label">今日配额 (API)</div>
        <div class="stat-sub">{{ status.quota.remaining }} 个剩余</div>
        <div v-if="status.quota.auto_paused" class="stat-badge warn">已暂停（配额用尽）</div>
      </div>
      <div class="stat-card ok">
        <div class="stat-icon">✅</div>
        <div class="stat-val">{{ status.queue.submitted }}</div>
        <div class="stat-label">已处理完毕</div>
        <div class="stat-sub">已收录或已推送</div>
      </div>
      <div class="stat-card pending">
        <div class="stat-icon">⏳</div>
        <div class="stat-val">{{ status.queue.pending }}</div>
        <div class="stat-label">待处理</div>
        <div class="stat-sub">调度器自动处理</div>
      </div>
      <div class="stat-card err" v-if="status.queue.failed">
        <div class="stat-icon">❌</div>
        <div class="stat-val">{{ status.queue.failed }}</div>
        <div class="stat-label">失败 (将重试)</div>
        <div class="stat-sub">网络或 API 错误</div>
      </div>
    </div>

    <!-- Actions -->
    <div class="card">
      <div class="card-header"><h3>🚀 收录控制台</h3></div>
      <div class="card-body">
        <div class="action-row">
          <button class="btn btn-primary" @click="enqueueAll(false)" :disabled="actioning">
            📋 同步网站所有 URL (跳过已处理)
          </button>
          <button class="btn btn-secondary" @click="runNow" :disabled="actioning || status?.scheduler_running || !oauthStatus?.authorized">
            {{ status?.scheduler_running ? '⚙️ 调度器运行中...' : '▶️ 立即执行 (检查GSC并提交)' }}
          </button>
          <button class="btn btn-outline" @click="enqueueAll(true)" :disabled="actioning">
            🔄 全部重置 (重新检查收录状态)
          </button>
        </div>
        <div v-if="actionMsg" :class="['action-msg', actionMsg.ok ? 'ok' : 'err']">{{ actionMsg.text }}</div>

        <!-- Scheduler explanation -->
        <div class="explain-box">
          <strong>🤖 自动处理流程：</strong>
          <ol>
            <li>自动使用 Search Console API 检查每个 URL 的真实收录状态。</li>
            <li>如果 GSC 报告网页<strong>“已编入索引”</strong>，系统将其标记为处理成功，<strong>不浪费</strong>每日提交配额。</li>
            <li>如果 GSC 报告网页<strong>“尚未编入索引”</strong>，系统自动调用 Indexing API 发起强制收录推送。</li>
            <li>由于 Google 限制，每天最多执行 200 次推送，未处理的 URL 将在次日自动继续。</li>
          </ol>
        </div>
      </div>
    </div>

    <!-- Recent Submission Log -->
    <div class="card">
      <div class="card-header">
        <h3>📋 URL 状态跟踪回执</h3>
        <button class="btn btn-sm btn-outline" @click="loadStatus">🔄 刷新</button>
      </div>
      <div class="card-body p0">
        <div class="log-table-wrap">
          <table class="log-table" v-if="status?.recent?.length">
            <thead>
              <tr>
                <th>处理状态</th>
                <th>URL</th>
                <th>GSC 回执 (Coverage State)</th>
                <th>GSC 上次抓取</th>
                <th>提交报错</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in status.recent" :key="r.url" :class="['log-row', r.status]">
                <td><span :class="['status-badge', r.status]">{{ statusLabel(r.status) }}</span></td>
                <td class="url-cell" :title="r.url">{{ r.url.replace('https://www.sunseasteel.com', '') }}</td>
                <td>
                  <span v-if="r.gsc_coverage_state" :class="['gsc-state', r.gsc_coverage_state.includes('Indexed') ? 'gsc-ok' : 'gsc-warn']">
                    {{ r.gsc_verdict === 'PASS' ? '✅' : '⚠️' }} {{ r.gsc_coverage_state }}
                  </span>
                  <span v-else class="gsc-empty">-</span>
                </td>
                <td>{{ r.gsc_last_crawl_time ? new Date(r.gsc_last_crawl_time).toLocaleString('zh-CN') : '-' }}</td>
                <td class="err-cell">{{ r.error_message || (r.http_code ? `HTTP ${r.http_code}` : '-') }}</td>
                <td>
                  <button class="btn btn-xs" @click="resetUrl(r.url)" v-if="r.status !== 'pending'">重试</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-state">暂无记录，请先点「同步网站所有 URL」</div>
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
import { ref, onMounted, onUnmounted } from 'vue'

const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` })
const api = async (path, opts = {}) => { const r = await fetch('/api/indexing' + path, { headers: h(), ...opts }); return r.json() }

const oauthStatus = ref(null)
const clientId = ref('')
const clientSecret = ref('')
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
  return { submitted: '✅ 完成', pending: '⏳ 待处理', failed: '❌ 报错' }[s] || s
}

async function loadOAuthStatus() {
  const d = await api('/oauth/status')
  oauthStatus.value = d
  if (d.has_client && !clientId.value) {
    clientId.value = d.client_id
    clientSecret.value = '********' // placeholder
  }
}

async function loadStatus() {
  try { status.value = await api('/status') } catch {}
}

async function saveClientConfig() {
  savingCred.value = true; credMsg.value = null
  try {
    const d = await api('/oauth/save-client', { method: 'POST', body: JSON.stringify({ client_id: clientId.value, client_secret: clientSecret.value }) })
    if (d.error) throw new Error(d.error)
    credMsg.value = { ok: true, text: '✅ 已保存，请点击下方按钮登录' }
    await loadOAuthStatus()
  } catch (e) { credMsg.value = { ok: false, text: `❌ ${e.message}` } }
  savingCred.value = false
}

async function loginWithGoogle() {
  try {
    const d = await api('/oauth/auth-url')
    if (d.url) {
      window.open(d.url, 'google_auth', 'width=500,height=600')
    } else {
      alert(d.error || '无法生成登录链接')
    }
  } catch (e) { alert(e.message) }
}

async function revokeAuth() {
  if (!confirm('确定要退出登录吗？所有自动处理将暂停。')) return
  await api('/oauth/revoke', { method: 'POST' })
  await loadOAuthStatus()
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
    setTimeout(loadStatus, 2000)
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
    const d = await api('/submit', { method: 'POST' })
    sitemapResults.value = d.results || []
    lastSubmit.value = new Date().toLocaleString('zh-CN')
  } catch (e) { sitemapResults.value = [{ engine: '错误', success: false, message: e.message }] }
  submittingSitemap.value = false
}

onMounted(async () => {
  await Promise.all([loadOAuthStatus(), loadStatus()])
  refreshTimer = setInterval(() => {
    loadStatus()
    loadOAuthStatus() // in case popup logged in
  }, 10000)
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
.info-ok { padding: 8px 12px; background: #dcfce7; border: 1px solid #86efac; border-radius: 8px; color: #15803d; font-size: 14px; font-weight: 500; }
.form-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap }
.form-group { flex: 1; min-width: 250px }
.form-group label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; color: #374151 }
.form-control { width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; background: #f8fafc; box-sizing: border-box }

.btn { padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; display: inline-block; transition: all 0.2s; text-decoration: none }
.btn-primary { background: #3b82f6; color: #fff }
.btn-primary:hover:not(:disabled) { background: #2563eb }
.btn-secondary { background: #6366f1; color: #fff }
.btn-secondary:hover:not(:disabled) { background: #4f46e5 }
.btn-outline { background: #fff; color: #374151; border: 1px solid #d1d5db }
.btn-sm { padding: 4px 12px; font-size: 13px }
.btn-xs { padding: 2px 8px; font-size: 11px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; cursor: pointer }
.btn:disabled { opacity: 0.5; cursor: not-allowed }
.btn-login { background: #fff; color: #3c4043; border: 1px solid #dadce0; display: flex; align-items: center; gap: 10px; font-weight: 500; padding: 10px 20px; border-radius: 8px; font-size: 15px }
.btn-login:hover:not(:disabled) { background: #f8f9fa }
.g-logo { width: 18px; height: 18px }
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
.explain-box ol { margin: 8px 0 0 18px; line-height: 1.8 }

/* Log table */
.log-table-wrap { overflow-x: auto; max-height: 500px; overflow-y: auto }
.log-table { width: 100%; border-collapse: collapse; font-size: 12px }
.log-table th { background: #f8fafc; padding: 8px 12px; text-align: left; position: sticky; top: 0; border-bottom: 1px solid #e2e8f0; font-size: 12px }
.log-table td { padding: 8px 12px; border-bottom: 1px solid #f8fafc; vertical-align: middle }
.log-row.submitted { background: #f0fdf4 }
.log-row.failed { background: #fff1f2 }
.status-badge { padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; white-space: nowrap }
.status-badge.submitted { background: #dcfce7; color: #15803d }
.status-badge.pending { background: #eff6ff; color: #1d4ed8 }
.status-badge.failed { background: #fee2e2; color: #dc2626 }
.url-cell { max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace; color: #2563eb }
.err-cell { color: #dc2626; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
.gsc-state { font-weight: 600; font-size: 11px; padding: 2px 6px; border-radius: 4px; border: 1px solid transparent; display: inline-block; white-space: nowrap }
.gsc-ok { background: #dcfce7; border-color: #86efac; color: #15803d }
.gsc-warn { background: #fef9c3; border-color: #fde047; color: #a16207 }
.gsc-empty { color: #cbd5e1 }
.empty-state { text-align: center; padding: 40px; color: #94a3b8; font-size: 14px }

/* Bing/Yandex */
.ping-row { padding: 8px 12px; border-radius: 8px; font-size: 14px }
.ping-row.ok { background: #dcfce7; color: #15803d }
.ping-row.err { background: #fee2e2; color: #b91c1c }
</style>
