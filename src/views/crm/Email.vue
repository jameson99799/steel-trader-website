<template>
  <div class="crm-email">
    <div class="page-header">
      <h1>📧 邮件系统</h1>
    </div>

    <div class="tabs">
      <button :class="{ active: tab === 'accounts' }" @click="tab = 'accounts'; loadAccounts()">📬 发送邮箱</button>
      <button :class="{ active: tab === 'templates' }" @click="tab = 'templates'; loadTemplates()">📋 邮件模板</button>
      <button :class="{ active: tab === 'send' }" @click="tab = 'send'">🚀 发送邮件</button>
      <button :class="{ active: tab === 'records' }" @click="tab = 'records'; loadRecords()">📊 发送记录</button>
    </div>

    <!-- ═══ SMTP Accounts Tab ═══ -->
    <div v-if="tab === 'accounts'" class="tab-panel">
      <div class="panel-header">
        <h3>发送邮箱管理</h3>
        <button class="btn btn-primary" @click="openAccountModal()">➕ 添加邮箱</button>
      </div>
      <div v-if="accountList.length" class="account-list">
        <div v-for="a in accountList" :key="a.id" :class="['account-card', a.source === 'system' ? 'system' : '']">
          <div class="acc-main">
            <span v-if="a.source === 'system'" class="source-badge sys">🌐 同步</span>
            <span v-else class="source-badge crm">📬 CRM</span>
            <div class="acc-host">{{ a.smtp_host }}:{{ a.smtp_port }}</div>
            <div class="acc-user">{{ a.smtp_user }}</div>
            <div class="acc-pass">{{ a.smtp_pass }}</div>
            <div class="acc-name">{{ a.from_name || '-' }}</div>
          </div>
          <div class="acc-assign" v-if="isAdmin">
            <span v-if="!a.assigned_users || a.assigned_users === 'all'" class="assign-badge all">全部可用</span>
            <span v-else class="assign-badge specific">指定: {{ getAssignNames(a.assigned_users) }}</span>
          </div>
          <div class="acc-actions">
            <button class="btn-sm btn-view" @click="testAccount(a.id)">🔌 测试</button>
            <button class="btn-sm btn-edit" @click="openAccountModal(a)">编辑</button>
            <button v-if="a.source !== 'system'" class="btn-sm btn-danger" @click="deleteAccount(a.id)">删除</button>
          </div>
          <div v-if="a._testResult" :class="['test-result', a._testResult.success ? 'ok' : 'fail']">{{ a._testResult.message }}</div>
        </div>
      </div>
      <p v-else class="empty">暂无邮箱账号</p>
    </div>

    <!-- ═══ Templates Tab ═══ -->
    <div v-if="tab === 'templates'" class="tab-panel">
      <div class="panel-header">
        <h3>邮件模板</h3>
        <button class="btn btn-primary" @click="openTplModal()">➕ 新建模板</button>
      </div>
      <div v-for="t in templates" :key="t.id" class="tpl-card">
        <div class="tpl-info">
          <strong>{{ t.name }}</strong>
          <span class="tpl-subject">{{ t.subject }}</span>
          <span v-if="isAdmin" class="assign-badge" :class="!t.assigned_users || t.assigned_users === '' || t.assigned_users === 'all' ? 'all' : 'specific'">
            {{ !t.assigned_users || t.assigned_users === '' || t.assigned_users === 'all' ? '全部可用' : '指定: ' + getAssignNames(t.assigned_users) }}
          </span>
        </div>
        <div class="tpl-actions">
          <button class="btn-sm btn-view" @click="previewTpl = t">预览</button>
          <button class="btn-sm btn-edit" @click="openTplModal(t)">编辑</button>
          <button class="btn-sm btn-danger" @click="deleteTpl(t.id)">删除</button>
        </div>
      </div>
      <p v-if="!templates.length" class="empty">暂无模板</p>
    </div>

    <!-- ═══ Send Tab ═══ -->
    <div v-if="tab === 'send'" class="tab-panel">
      <div class="send-layout">
        <div class="send-form">
          <h3>🚀 发送营销邮件</h3>
          <div class="form-group">
            <label>发送邮箱</label>
            <select v-model="sendForm.account_id">
              <option value="">自动选择</option>
              <option v-for="a in allAccounts" :key="a.id" :value="a.id">{{ a.smtp_user }} ({{ a.smtp_host }})</option>
            </select>
          </div>
          <div class="form-group">
            <label>选择模板</label>
            <select v-model="sendForm.template_id" @change="applyTemplate">
              <option value="">不使用模板</option>
              <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>邮件主题</label>
            <input v-model="sendForm.subject" placeholder="支持 {{name}} {{company}} 变量" />
          </div>
          <div class="form-group">
            <label>邮件内容</label>
            <div ref="sendEditorRef" class="rich-editor" contenteditable="true" style="min-height:200px"></div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>发送间隔（秒）</label>
              <div class="interval-row">
                <input v-model.number="sendForm.interval_min" type="number" placeholder="最小" /> ~
                <input v-model.number="sendForm.interval_max" type="number" placeholder="最大" />
              </div>
            </div>
          </div>
          <div class="form-group">
            <label>选择收件客户 ({{ sendForm.customer_ids.length }})</label>
            <input v-model="customerSearch" type="text" placeholder="搜索客户..." @input="searchCustomers" />
            <div class="customer-picker" v-if="pickerCustomers.length">
              <label v-for="c in pickerCustomers" :key="c.id" class="picker-item">
                <input type="checkbox" :value="c.id" v-model="sendForm.customer_ids" />
                <span>{{ c.name }} <small v-if="c.email">({{ c.email }})</small></span>
              </label>
            </div>
          </div>
          <button class="btn btn-primary btn-lg" :disabled="sending" @click="doSend">
            {{ sending ? '发送中...' : '🚀 开始发送' }}
          </button>
        </div>
        <div class="send-status" v-if="Object.keys(progress).length">
          <h4>⏳ 实时发送状态</h4>
          <div v-for="(p, taskId) in progress" :key="taskId" class="progress-card">
            <div class="prog-header">
              任务 #{{ taskId }}
              <button class="btn-sm btn-danger" @click="stopTask(taskId)">⏹ 停止</button>
            </div>
            <div class="prog-bar-wrap">
              <div class="prog-bar" :style="{ width: ((p.total - p.remaining) / p.total * 100) + '%' }"></div>
            </div>
            <div class="prog-detail">
              <span>✅ {{ p.sent }} 成功</span>
              <span>❌ {{ p.failed }} 失败</span>
              <span>📨 剩余 {{ p.remaining }} / {{ p.total }}</span>
            </div>
            <div class="prog-next" v-if="p.nextEmail">下一封: {{ p.nextEmail }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ Records Tab ═══ -->
    <div v-if="tab === 'records'" class="tab-panel">
      <div class="panel-header"><h3>📊 发送记录</h3></div>
      <table v-if="records.length" class="records-table">
        <thead>
          <tr><th>时间</th><th>收件人</th><th>主题</th><th>状态</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in records" :key="r.id">
            <td>{{ formatDate(r.sent_at) }}</td>
            <td>{{ r.recipient_email }}</td>
            <td>{{ r.subject }}</td>
            <td>
              <span :class="['status-badge', statusClass(r.status)]">{{ statusText(r.status) }}</span>
            </td>
            <td><button class="btn-sm btn-danger" @click="deleteRecord(r.id)">删除</button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">暂无记录</p>
    </div>

    <!-- ═══ Account Modal ═══ -->
    <div v-if="showAccountModal" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editAccountId ? '编辑邮箱' : '添加邮箱' }}</h3>
          <button class="modal-close" @click="showAccountModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group"><label>SMTP服务器</label><input v-model="accForm.smtp_host" placeholder="smtp.example.com" /></div>
          <div class="form-group"><label>端口</label><input v-model.number="accForm.smtp_port" type="number" placeholder="465" /></div>
          <div class="form-group"><label>邮箱账号</label><input v-model="accForm.smtp_user" placeholder="user@example.com" /></div>
          <div class="form-group"><label>密码</label><input v-model="accForm.smtp_pass" type="text" placeholder="明文密码" /></div>
          <div class="form-group"><label>发件人名称</label><input v-model="accForm.from_name" placeholder="SunSea Steel" /></div>
          <div v-if="isAdmin" class="form-group">
            <label>分配给子账户</label>
            <select v-model="accForm.assign_mode">
              <option value="all">全部子账户可用</option>
              <option value="specific">指定子账户</option>
            </select>
            <div v-if="accForm.assign_mode === 'specific'" class="assign-picks">
              <label v-for="u in crmUsers" :key="u.id" class="pick-item">
                <input type="checkbox" :value="String(u.id)" v-model="accForm.assign_ids" />
                {{ u.display_name || u.username }}
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showAccountModal = false">取消</button>
          <button class="btn btn-primary" @click="saveAccount">保存</button>
        </div>
      </div>
    </div>

    <!-- ═══ Template Modal ═══ -->
    <div v-if="showTplModal" class="modal-overlay">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>{{ editTplId ? '编辑模板' : '新建模板' }}</h3>
          <button class="modal-close" @click="showTplModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-row2">
            <div class="form-group"><label>模板名称</label><input v-model="tplForm.name" placeholder="模板名称" /></div>
            <div class="form-group"><label>邮件主题</label><input v-model="tplForm.subject" placeholder="邮件主题" /></div>
          </div>
          <div v-if="isAdmin" class="form-group">
            <label>分配给子账户</label>
            <select v-model="tplForm.assign_mode">
              <option value="all">全部子账户可用</option>
              <option value="specific">指定子账户</option>
            </select>
            <div v-if="tplForm.assign_mode === 'specific'" class="assign-picks">
              <label v-for="u in crmUsers" :key="u.id" class="pick-item">
                <input type="checkbox" :value="String(u.id)" v-model="tplForm.assign_ids" />
                {{ u.display_name || u.username }}
              </label>
            </div>
          </div>
          <div class="form-group">
            <label>邮件内容（支持 {{name}} {{company}} 变量）</label>
            <div ref="tplEditorRef" class="rich-editor" contenteditable="true" style="min-height:250px" v-html="tplForm.html_body"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showTplModal = false">取消</button>
          <button class="btn btn-primary" @click="saveTpl">保存</button>
        </div>
      </div>
    </div>

    <!-- ═══ Template Preview ═══ -->
    <div v-if="previewTpl" class="modal-overlay">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>{{ previewTpl.name }}</h3>
          <button class="modal-close" @click="previewTpl = null">&times;</button>
        </div>
        <div class="modal-body">
          <div class="preview-meta">主题: {{ previewTpl.subject }}</div>
          <div class="preview-html" v-html="previewTpl.html_body"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="previewTpl = null">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import crmApi from '../../api/crm'

const tab = ref('accounts')
const isAdmin = ref(false)
const accounts = ref({ accounts: [], users: [] })
const templates = ref([])
const records = ref([])
const crmUsers = ref([])
const progress = ref({})
const sending = ref(false)
let progressTimer = null

// Account
const showAccountModal = ref(false)
const editAccountId = ref(null)
const accForm = reactive({ smtp_host: '', smtp_port: 465, smtp_user: '', smtp_pass: '', from_name: '', assign_mode: 'all', assign_ids: [] })

// Template
const showTplModal = ref(false)
const editTplId = ref(null)
const tplForm = reactive({ name: '', subject: '', html_body: '', assign_mode: 'all', assign_ids: [] })
const tplEditorRef = ref(null)
const previewTpl = ref(null)

// Send
const sendForm = reactive({ account_id: '', template_id: '', subject: '', customer_ids: [], interval_min: 5, interval_max: 30 })
const sendEditorRef = ref(null)
const customerSearch = ref('')
const pickerCustomers = ref([])

const accountList = computed(() => accounts.value.accounts || [])
const allAccounts = computed(() => accounts.value.accounts || [])

function getAssignNames(assigned) {
  if (!assigned || assigned === 'all') return '全部'
  const ids = assigned.split(',').map(s => s.trim())
  return ids.map(id => {
    const u = crmUsers.value.find(u => String(u.id) === id)
    return u ? (u.display_name || u.username) : `#${id}`
  }).join(', ')
}

onMounted(async () => {
  try {
    const user = JSON.parse(localStorage.getItem('crm_user') || '{}')
    isAdmin.value = user.role === 'admin'
  } catch (e) {}
  loadAccounts()
  if (isAdmin.value) loadUsers()
})
onUnmounted(() => { if (progressTimer) clearInterval(progressTimer) })

// Safe fetch helper — never redirects on 401
async function safeFetch(url) {
  const token = localStorage.getItem('crm_token')
  try {
    const res = await fetch(`/api/crm${url}`, {
      headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    })
    if (res.ok) return await res.json()
    return null
  } catch (e) { return null }
}

async function safePost(url, body) {
  const token = localStorage.getItem('crm_token')
  try {
    const res = await fetch(`/api/crm${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      body: JSON.stringify(body)
    })
    if (res.ok) return await res.json()
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || '请求失败')
  } catch (e) { throw e }
}

async function safePut(url, body) {
  const token = localStorage.getItem('crm_token')
  try {
    const res = await fetch(`/api/crm${url}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      body: JSON.stringify(body)
    })
    if (res.ok) return await res.json()
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || '请求失败')
  } catch (e) { throw e }
}

async function safeDel(url) {
  const token = localStorage.getItem('crm_token')
  try {
    const res = await fetch(`/api/crm${url}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    })
    if (res.ok) return await res.json()
    return null
  } catch (e) { return null }
}

function startProgressPoll() {
  const token = localStorage.getItem('crm_token')
  progressTimer = setInterval(async () => {
    try {
      const res = await fetch('/api/crm/mailer/progress', {
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      })
      if (res.ok) progress.value = await res.json()
    } catch (e) {}
  }, 3000)
}

async function loadAccounts() {
  const data = await safeFetch('/mailer/accounts')
  accounts.value = data || { accounts: [], users: [] }
  // Merge users from accounts response
  if (data?.users?.length) crmUsers.value = data.users
}

async function loadUsers() {
  const data = await safeFetch('/users')
  crmUsers.value = data || []
}

function openAccountModal(a) {
  editAccountId.value = a?.id || null
  const au = a?.assigned_users || 'all'
  Object.assign(accForm, {
    smtp_host: a?.smtp_host || '', smtp_port: a?.smtp_port || 465,
    smtp_user: a?.smtp_user || '', smtp_pass: a?.smtp_pass || '',
    from_name: a?.from_name || '',
    assign_mode: (!au || au === 'all') ? 'all' : 'specific',
    assign_ids: (!au || au === 'all') ? [] : au.split(',').map(s => s.trim())
  })
  showAccountModal.value = true
}

async function saveAccount() {
  const assigned_users = accForm.assign_mode === 'all' ? 'all' : accForm.assign_ids.join(',')
  const payload = { ...accForm, assigned_users }
  try {
    if (editAccountId.value) await safePut(`/mailer/accounts/${editAccountId.value}`, payload)
    else await safePost('/mailer/accounts', payload)
    showAccountModal.value = false; loadAccounts()
  } catch (e) { alert(e.message) }
}

async function deleteAccount(id) {
  if (!confirm('确定删除？')) return
  try { await safeDel(`/mailer/accounts/${id}`); loadAccounts() } catch (e) { alert(e.message) }
}

async function testAccount(id) {
  const acct = accountList.value.find(a => a.id === id)
  if (acct) acct._testResult = { success: false, message: '测试中...' }
  try {
    const res = await safePost(`/mailer/accounts/${id}/test`, {})
    if (acct) acct._testResult = res || { success: false, message: '测试失败' }
  } catch (e) { if (acct) acct._testResult = { success: false, message: e.message } }
}

// Templates
async function loadTemplates() {
  const data = await safeFetch('/mailer/templates')
  templates.value = data || []
}

function openTplModal(t) {
  editTplId.value = t?.id || null
  const au = t?.assigned_users || ''
  Object.assign(tplForm, {
    name: t?.name || '', subject: t?.subject || '', html_body: t?.html_body || '',
    assign_mode: (!au || au === '' || au === 'all') ? 'all' : 'specific',
    assign_ids: (!au || au === '' || au === 'all') ? [] : au.split(',').map(s => s.trim())
  })
  showTplModal.value = true
}

async function saveTpl() {
  const assigned_users = tplForm.assign_mode === 'all' ? 'all' : tplForm.assign_ids.join(',')
  const data = { name: tplForm.name, subject: tplForm.subject, html_body: tplEditorRef.value?.innerHTML || tplForm.html_body, assigned_users }
  try {
    if (editTplId.value) await safePut(`/mailer/templates/${editTplId.value}`, data)
    else await safePost('/mailer/templates', data)
    showTplModal.value = false; loadTemplates()
  } catch (e) { alert(e.message) }
}

async function deleteTpl(id) {
  if (!confirm('确定删除？')) return
  try { await safeDel(`/mailer/templates/${id}`); loadTemplates() } catch (e) { alert(e.message) }
}

// Send
function applyTemplate() {
  const t = templates.value.find(t => t.id == sendForm.template_id)
  if (t) {
    sendForm.subject = t.subject
    if (sendEditorRef.value) sendEditorRef.value.innerHTML = t.html_body || ''
  }
}

async function searchCustomers() {
  if (!customerSearch.value.trim()) { pickerCustomers.value = []; return }
  try {
    const data = await safeFetch(`/customers?search=${encodeURIComponent(customerSearch.value)}&limit=50`)
    pickerCustomers.value = (data?.customers || []).filter(c => c.email)
  } catch (e) { pickerCustomers.value = [] }
}

async function doSend() {
  const html_body = sendEditorRef.value?.innerHTML || ''
  if (!sendForm.subject || !html_body.trim()) { alert('请填写主题和内容'); return }
  if (!sendForm.customer_ids.length) { alert('请选择收件客户'); return }
  sending.value = true
  try {
    const res = await safePost('/mailer/send', {
      customer_ids: sendForm.customer_ids,
      account_id: sendForm.account_id || undefined,
      template_id: sendForm.template_id || undefined,
      subject: sendForm.subject,
      html_body,
      interval_min: sendForm.interval_min,
      interval_max: sendForm.interval_max
    })
    alert(res?.message || '发送已开始')
    startProgressPoll()
  } catch (e) { alert(e.message || '发送失败') }
  sending.value = false
}

async function stopTask(id) {
  await safePost(`/mailer/stop/${id}`, {})
}

// Records
async function loadRecords() {
  const data = await safeFetch('/mailer/records')
  records.value = data || []
}

async function deleteRecord(id) {
  await safeDel(`/mailer/records/${id}`)
  loadRecords()
}

function statusClass(s) { return { sent: 'st-ok', failed: 'st-fail', done: 'st-ok', running: 'st-run', cancelled: 'st-fail' }[s] || '' }
function statusText(s) { return { sent: '✅ 已发送', failed: '❌ 失败', done: '✅ 完成', running: '⏳ 进行中', cancelled: '⏹ 已停止' }[s] || s }
function formatDate(d) { return d ? new Date(d).toLocaleString('zh-CN') : '-' }
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header h1 { margin: 0; font-size: 24px; color: #0f172a; }
.tabs { display: flex; gap: 0; background: #fff; border-radius: 10px; overflow: hidden; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.tabs button { flex: 1; padding: 14px; border: none; background: transparent; font-size: 14px; font-weight: 600; cursor: pointer; color: #64748b; border-bottom: 3px solid transparent; transition: 0.2s; }
.tabs button.active { color: #2563eb; border-bottom-color: #2563eb; background: #eff6ff; }
.tabs button:hover:not(.active) { background: #f8fafc; }
.tab-panel { background: #fff; border-radius: 10px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.panel-header h3 { margin: 0; font-size: 18px; }

/* Accounts */
.account-list { display: flex; flex-direction: column; gap: 10px; }
.account-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.account-card.system { background: #f8fafc; border-style: dashed; }
.acc-main { display: flex; gap: 16px; flex: 1; min-width: 300px; align-items: center; font-size: 13px; }
.acc-host { font-weight: 600; color: #0f172a; }
.acc-user { color: #2563eb; }
.acc-pass { color: #64748b; font-family: monospace; font-size: 12px; }
.acc-name { color: #475569; }
.acc-owner { background: #eff6ff; color: #2563eb; padding: 2px 8px; border-radius: 10px; font-size: 11px; }
.acc-actions { display: flex; gap: 6px; }
.acc-assign { font-size: 12px; }
.source-badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; margin-right: 8px; }
.source-badge.sys { background: #dbeafe; color: #1d4ed8; }
.source-badge.crm { background: #fef3c7; color: #92400e; }
.assign-badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; margin-left: 8px; }
.assign-badge.all { background: #d1fae5; color: #065f46; }
.assign-badge.specific { background: #fef3c7; color: #92400e; }
.assign-picks { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
.pick-item { display: flex; align-items: center; gap: 4px; font-size: 13px; cursor: pointer; }
.test-result { width: 100%; padding: 8px 12px; border-radius: 6px; font-size: 13px; margin-top: 4px; }
.test-result.ok { background: #f0fdf4; color: #15803d; }
.test-result.fail { background: #fef2f2; color: #dc2626; }

/* Templates */
.tpl-card { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; }
.tpl-info strong { display: block; font-size: 14px; }
.tpl-subject { font-size: 12px; color: #64748b; }
.tpl-actions { display: flex; gap: 6px; }

/* Send */
.send-layout { display: grid; grid-template-columns: 1fr 360px; gap: 24px; }
@media (max-width: 900px) { .send-layout { grid-template-columns: 1fr; } }
.send-form h3 { margin: 0 0 16px; }
.interval-row { display: flex; align-items: center; gap: 8px; }
.interval-row input { width: 80px; }
.customer-picker { max-height: 200px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; margin-top: 8px; }
.picker-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px; cursor: pointer; }
.picker-item small { color: #64748b; }
.btn-lg { width: 100%; padding: 14px; font-size: 16px; margin-top: 16px; }
.send-status { background: #f8fafc; border-radius: 10px; padding: 16px; }
.send-status h4 { margin: 0 0 12px; }
.progress-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
.prog-header { display: flex; justify-content: space-between; align-items: center; font-weight: 600; margin-bottom: 8px; }
.prog-bar-wrap { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
.prog-bar { height: 100%; background: linear-gradient(90deg, #2563eb, #059669); border-radius: 4px; transition: width 0.3s; }
.prog-detail { display: flex; gap: 16px; font-size: 12px; margin-top: 8px; color: #475569; }
.prog-next { font-size: 12px; color: #94a3b8; margin-top: 4px; }

/* Records */
.records-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.records-table th { background: #f8fafc; padding: 10px 12px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; text-align: left; white-space: nowrap; }
.records-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
.status-badge { padding: 3px 10px; border-radius: 10px; font-size: 12px; font-weight: 600; }
.st-ok { background: #d1fae5; color: #065f46; }
.st-fail { background: #fef2f2; color: #dc2626; }
.st-run { background: #fef3c7; color: #92400e; }

/* Shared */
.empty { text-align: center; padding: 40px; color: #64748b; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; margin-bottom: 4px; font-size: 13px; font-weight: 600; color: #334155; }
.form-group input, .form-group select { width: 100%; padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
.form-group input:focus, .form-group select:focus { outline: none; border-color: #2563eb; }
.form-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.rich-editor { min-height: 120px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; line-height: 1.6; overflow-y: auto; max-height: 400px; }
.rich-editor:focus { outline: none; border-color: #2563eb; }
.preview-meta { font-size: 13px; color: #64748b; margin-bottom: 8px; }
.preview-html { padding: 16px; background: #fafafe; border-radius: 8px; line-height: 1.6; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; border-radius: 14px; width: 560px; max-width: 92vw; max-height: 90vh; overflow-y: auto; }
.modal-lg { width: 800px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e2e8f0; }
.modal-header h3 { margin: 0; }
.modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b; }
.modal-body { padding: 24px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid #e2e8f0; }
.btn { padding: 9px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-primary { background: #2563eb; color: #fff; } .btn-primary:hover { background: #1d4ed8; }
.btn-secondary { background: #f1f5f9; color: #334155; }
.btn-sm { padding: 4px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
.btn-edit { background: #eff6ff; color: #2563eb; } .btn-view { background: #f0fdf4; color: #15803d; } .btn-danger { background: #fef2f2; color: #dc2626; }
.btn-sm:hover { opacity: 0.85; }
</style>
