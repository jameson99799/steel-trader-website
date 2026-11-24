<template>
  <div class="email-page crm-scope crm-page">
    <h1>📧 邮件通知设置</h1>

    <!-- SSL状态 -->
    <div class="card" v-if="sslInfo">
      <div class="card-header"><h3>🔒 SSL 证书状态</h3></div>
      <div class="card-body">
        <div v-if="sslInfo.ssl" class="ssl-row">
          <span :class="['badge', sslInfo.ssl.expired ? 'badge-err' : sslInfo.ssl.days <= 14 ? 'badge-warn' : 'badge-ok']">
            {{ sslInfo.ssl.expired ? '❌ 已过期' : `⏳ 还有 ${sslInfo.ssl.days} 天到期` }}
          </span>
          <span class="hint-text">到期：{{ new Date(sslInfo.ssl.expiry).toLocaleDateString('zh-CN') }}</span>
          <span class="hint-text">| 剩余天数 ≤ 预警天数时自动发邮件提醒</span>
        </div>
        <div v-else class="ssl-row"><span class="badge badge-none">⚠️ 未检测到SSL证书</span></div>
      </div>
    </div>

    <!-- 发件账号列表 -->
    <div class="card">
      <div class="card-header">
        <h3>📮 SMTP 发件账号</h3>
        <button class="btn btn-primary btn-sm" @click="openAddAccount">+ 添加账号</button>
      </div>
      <div class="card-body no-pad">
        <div v-if="!accounts.length" class="empty-tip">暂无账号，请点击「添加账号」</div>
        <table v-else class="acct-table">
          <thead>
            <tr><th>名称</th><th>SMTP服务器</th><th>账号</th><th>状态</th><th>默认</th><th>发送量</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="a in accounts" :key="a.id" :class="{ 'row-default': a.is_default }">
              <td>{{ a.name }}</td>
              <td>{{ a.smtp_host }}:{{ a.smtp_port }}</td>
              <td>{{ a.smtp_user }}</td>
              <td><span :class="['badge', a.enabled ? 'badge-ok' : 'badge-none']">{{ a.enabled ? '启用' : '停用' }}</span></td>
              <td>{{ a.is_default ? '⭐ 默认' : '' }}</td>
              <td>{{ a.send_count || 0 }}</td>
              <td class="acct-actions">
                <button class="btn btn-sm btn-outline" @click="openEditAccount(a)">编辑</button>
                <button class="btn btn-sm btn-outline" @click="openTestAccount(a)" style="color:#059669;">发送测试</button>
                <button class="btn btn-sm btn-outline" @click="deleteAccount(a.id)" style="color:#dc2626;">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 全局设置 -->
    <div class="card">
      <div class="card-header"><h3>⚙️ 全局设置</h3></div>
      <div class="card-body">
        <div class="grid grid-2">
          <div class="form-group">
            <label>询盘通知收件邮箱 <small>（多个用逗号分隔）</small></label>
            <input v-model="settings.to_emails" class="form-control" placeholder="admin@company.com, sales@company.com" />
          </div>
          <div class="form-group">
            <label>SSL 证书到期预警天数</label>
            <input v-model.number="settings.ssl_warn_days" class="form-control" type="number" min="1" max="90" />
          </div>
        </div>
        <div class="form-group">
          <label class="toggle-label">
            <input type="checkbox" v-model="settings.round_robin" />
            <span>开启轮流发送（多账号按顺序交替发送询盘通知）</span>
          </label>
        </div>
        <div class="form-group" style="display: flex; flex-direction: column; gap: 10px; margin: 16px 0;">
          <label class="toggle-label">
            <input type="checkbox" v-model="settings.inquiry_notify_enabled" />
            <span>开启新询盘邮件通知</span>
          </label>
          <label class="toggle-label">
            <input type="checkbox" v-model="settings.chat_notify_enabled" />
            <span>开启新客服消息邮件通知</span>
          </label>
        </div>
        <div class="actions">
          <button class="btn btn-primary" @click="saveSettings" :disabled="savingSettings">
            {{ savingSettings ? '保存中...' : '💾 保存设置' }}
          </button>
        </div>
        <div v-if="settingsResult" :class="['result-box', settingsResult.ok ? 'result-ok' : 'result-err']">{{ settingsResult.msg }}</div>
      </div>
    </div>

    <!-- 账号弹窗 -->
    <div class="modal-overlay" v-if="showAcctModal" @click.self="showAcctModal = false">
      <div class="modal-box">
        <h3>{{ editingAcct.id ? '编辑账号' : '添加账号' }}</h3>
        <div class="grid grid-2">
          <div class="form-group">
            <label>账号名称</label>
            <input v-model="editingAcct.name" class="form-control" placeholder="如：Gmail主账号" />
          </div>
          <div class="form-group">
            <label>发件人显示名称</label>
            <input v-model="editingAcct.from_name" class="form-control" placeholder="SunSea Steel" />
          </div>
        </div>
        <div class="grid grid-2">
          <div class="form-group">
            <label>SMTP 服务器</label>
            <input v-model="editingAcct.smtp_host" class="form-control" placeholder="smtp.gmail.com" />
          </div>
          <div class="form-group">
            <label>SMTP 端口</label>
            <input v-model.number="editingAcct.smtp_port" class="form-control" type="number" placeholder="465" />
          </div>
        </div>
        <div class="grid grid-2">
          <div class="form-group">
            <label>邮箱账号</label>
            <input v-model="editingAcct.smtp_user" class="form-control" type="email" placeholder="your@gmail.com" />
          </div>
          <div class="form-group">
            <label>密码 / 应用专用密码</label>
            <input v-model="editingAcct.smtp_pass" class="form-control" type="password" placeholder="留空保持原密码" autocomplete="new-password" />
          </div>
        </div>
        <div class="flex-row gap-12">
          <label class="toggle-label"><input type="checkbox" v-model="editingAcct.is_default" /><span>设为默认账号</span></label>
          <label class="toggle-label"><input type="checkbox" v-model="editingAcct.enabled" /><span>启用</span></label>
        </div>
        <div class="modal-actions mt-16">
          <button class="btn btn-primary" @click="saveAccount" :disabled="savingAcct">{{ savingAcct ? '保存中...' : '💾 保存' }}</button>
          <button class="btn btn-outline" @click="showAcctModal = false">取消</button>
        </div>
        <div v-if="acctResult" :class="['result-box mt-8', acctResult.ok ? 'result-ok' : 'result-err']">{{ acctResult.msg }}</div>
      </div>
    </div>

    <!-- 测试邮件弹窗 -->
    <div class="modal-overlay" v-if="showTestModal" @click.self="showTestModal = false">
      <div class="modal-box">
        <h3>发送测试邮件</h3>
        <p style="font-size:13px;color:#64748b;margin:0 0 12px">账号：{{ testingAcct?.smtp_user }}</p>
        <div class="form-group">
          <label>测试收件邮箱</label>
          <input v-model="testTo" class="form-control" type="email" placeholder="test@example.com" />
          <p class="form-hint">此地址会被记住，下次打开自动填入</p>
        </div>
        <div v-if="testResult" :class="['result-box', testResult.ok ? 'result-ok' : 'result-err']">{{ testResult.msg }}</div>
        <div class="modal-actions">
          <button class="btn btn-primary" @click="sendTest" :disabled="testing">{{ testing ? '发送中...' : '📨 发送测试' }}</button>
          <button class="btn btn-outline" @click="showTestModal = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../../api'

const accounts = ref([])
const sslInfo = ref(null)
const settings = reactive({ to_emails: '', ssl_warn_days: 30, round_robin: false, inquiry_notify_enabled: true, chat_notify_enabled: true })
const showAcctModal = ref(false)
const showTestModal = ref(false)
const editingAcct = reactive({ id: null, name: '', smtp_host: '', smtp_port: 465, smtp_user: '', smtp_pass: '', from_name: 'SunSea Steel', is_default: false, enabled: true })
const testingAcct = ref(null)
const testTo = ref(localStorage.getItem('email_test_to') || '')
const testResult = ref(null)
const acctResult = ref(null)
const settingsResult = ref(null)
const savingAcct = ref(false)
const savingSettings = ref(false)
const testing = ref(false)

async function load() {
  try {
    const [accts, ssl, s] = await Promise.all([
      api.request('/email/accounts'),
      api.request('/email/ssl-status'),
      api.request('/email/settings')
    ])
    accounts.value = accts || []
    sslInfo.value = ssl
    if (s) {
      Object.assign(settings, {
        ...s,
        round_robin: !!s.round_robin,
        inquiry_notify_enabled: s.inquiry_notify_enabled !== 0,
        chat_notify_enabled: s.chat_notify_enabled !== 0
      })
    }
  } catch (e) { console.error(e) }
}

onMounted(load)

function openAddAccount() {
  Object.assign(editingAcct, { id: null, name: '', smtp_host: '', smtp_port: 465, smtp_user: '', smtp_pass: '', from_name: 'SunSea Steel', is_default: false, enabled: true })
  acctResult.value = null
  showAcctModal.value = true
}

function openEditAccount(a) {
  Object.assign(editingAcct, { ...a, smtp_pass: '', is_default: !!a.is_default, enabled: !!a.enabled })
  acctResult.value = null
  showAcctModal.value = true
}

async function saveAccount() {
  savingAcct.value = true; acctResult.value = null
  try {
    if (editingAcct.id) {
      await api.request(`/email/accounts/${editingAcct.id}`, { method: 'PUT', body: JSON.stringify(editingAcct) })
    } else {
      await api.request('/email/accounts', { method: 'POST', body: JSON.stringify(editingAcct) })
    }
    acctResult.value = { ok: true, msg: '✅ 保存成功' }
    await load()
    setTimeout(() => { showAcctModal.value = false }, 900)
  } catch (e) { acctResult.value = { ok: false, msg: '❌ ' + e.message } }
  finally { savingAcct.value = false }
}

async function deleteAccount(id) {
  if (!confirm('确认删除此账号？')) return
  await api.request(`/email/accounts/${id}`, { method: 'DELETE' })
  await load()
}

function openTestAccount(a) {
  testingAcct.value = a; testResult.value = null; showTestModal.value = true
}

async function sendTest() {
  if (!testTo.value) return alert('请填写收件邮箱')
  testing.value = true; testResult.value = null
  localStorage.setItem('email_test_to', testTo.value)
  try {
    const res = await api.request(`/email/accounts/${testingAcct.value.id}/test`, { method: 'POST', body: JSON.stringify({ to: testTo.value }) })
    testResult.value = { ok: true, msg: '✅ ' + res.message }
  } catch (e) { testResult.value = { ok: false, msg: '❌ ' + e.message } }
  finally { testing.value = false }
}

async function saveSettings() {
  savingSettings.value = true; settingsResult.value = null
  try {
    await api.request('/email/settings', { method: 'PUT', body: JSON.stringify(settings) })
    settingsResult.value = { ok: true, msg: '✅ 设置已保存' }
  } catch (e) { settingsResult.value = { ok: false, msg: '❌ ' + e.message } }
  finally { savingSettings.value = false }
}
</script>

<style scoped>
.email-page { color: var(--crm-text) }
h1 { font-size: 20px; font-weight: 800; color: var(--crm-text); margin: 0 0 20px; display: flex; align-items: center; gap: 8px }
.card {
  background: var(--crm-card); border: 1px solid var(--crm-border);
  border-radius: var(--crm-radius); box-shadow: var(--crm-shadow);
  margin-bottom: 16px; overflow: hidden;
}
.card-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; border-bottom: 1px solid var(--crm-border);
  background: var(--crm-bg);
}
.card-header h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--crm-text) }
.card-body { padding: 20px }
.card-body.no-pad { padding: 0 }

.ssl-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap }
.badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 12px; border-radius: 999px; font-size: 12px; font-weight: 600 }
.badge-ok { background: #d1fae5; color: #047857 }
.badge-warn { background: #fef3c7; color: #92400e }
.badge-err { background: #fee2e2; color: #b91c1c }
.badge-none { background: #e2e8f0; color: #475569 }
.hint-text { font-size: 12px; color: var(--crm-text-3) }

.acct-table { width: 100%; border-collapse: collapse; font-size: 13px }
.acct-table th { background: var(--crm-bg); padding: 10px 14px; text-align: left; font-weight: 700; color: var(--crm-text-2); border-bottom: 1px solid var(--crm-border); font-size: 11.5px; text-transform: uppercase; letter-spacing: .04em }
.acct-table td { padding: 10px 14px; border-bottom: 1px solid var(--crm-border) }
.acct-table tbody tr { transition: background .1s }
.acct-table tbody tr:hover { background: var(--crm-bg) }
.acct-table .row-default { background: var(--crm-primary-soft) }
.acct-actions { display: flex; gap: 6px; flex-wrap: wrap }
.empty-tip { text-align: center; color: var(--crm-text-3); padding: 30px; font-size: 13px }

.grid { display: grid; gap: 14px }
.grid-2 { grid-template-columns: 1fr 1fr }
.form-group { margin-bottom: 14px }
.form-group label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 5px; color: var(--crm-text-2) }
.form-group label small { font-weight: 400; color: var(--crm-text-3) }
.form-control { width: 100%; padding: 9px 12px; border: 1px solid var(--crm-border); border-radius: var(--crm-radius-sm); font-size: 13px; box-sizing: border-box; color: var(--crm-text); font-family: inherit; transition: border-color .15s, box-shadow .15s; background: var(--crm-card) }
.form-control:focus { outline: none; border-color: var(--crm-primary); box-shadow: 0 0 0 3px rgba(30,64,175,0.08) }
.toggle-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: var(--crm-text) }
.toggle-label input[type="checkbox"] { accent-color: var(--crm-primary); width: 15px; height: 15px; cursor: pointer }

.btn { padding: 8px 18px; border-radius: var(--crm-radius-sm); font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all 0.15s; font-family: inherit }
.btn-primary { background: var(--crm-primary); color: #fff }
.btn-primary:hover { background: var(--crm-primary-hover) }
.btn-outline { background: var(--crm-card); color: var(--crm-text); border: 1px solid var(--crm-border) }
.btn-outline:hover { border-color: var(--crm-primary); color: var(--crm-primary) }
.btn-sm { padding: 5px 13px; font-size: 12px; border-radius: 8px }
.btn:disabled { opacity: 0.5; cursor: not-allowed }
.actions { display: flex; gap: 10px; margin-top: 14px }

.result-box { padding: 10px 16px; border-radius: var(--crm-radius-sm); font-size: 13px; margin-top: 10px }
.result-ok { background: #f0fdf4; color: var(--crm-success); border: 1px solid #bbf7d0 }
.result-err { background: #fef2f2; color: var(--crm-danger); border: 1px solid #fecaca }

.modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000 }
.modal-box { background: var(--crm-card); border-radius: var(--crm-radius); padding: 26px; width: 520px; max-width: 95vw; max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 64px rgba(15,23,42,0.25) }
.modal-box h3 { margin: 0 0 18px; font-size: 16px; font-weight: 800; color: var(--crm-text) }
.modal-actions { display: flex; gap: 10px; margin-top: 18px; justify-content: flex-end }
</style>

