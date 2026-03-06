<template>
  <div class="email-page">
    <h1>📧 邮件通知设置</h1>

    <!-- SSL Certificate Status -->
    <div class="card" v-if="sslInfo">
      <div class="card-header"><h3>SSL 证书状态</h3></div>
      <div class="card-body">
        <div v-if="sslInfo.ssl" class="ssl-status-bar">
          <span :class="['badge', sslInfo.ssl.expired ? 'badge-error' : sslInfo.ssl.days <= 14 ? 'badge-warn' : 'badge-ok']">
            {{ sslInfo.ssl.expired ? '❌ 已过期' : `⏳ 还有 ${sslInfo.ssl.days} 天到期` }}
          </span>
          <span class="ssl-date">到期时间：{{ new Date(sslInfo.ssl.expiry).toLocaleDateString('zh-CN', {year:'numeric',month:'long',day:'numeric'}) }}</span>
          <span class="hint">当证书剩余天数 ≤ 预警天数时，自动发送邮件提醒</span>
        </div>
        <div v-else class="ssl-status-bar">
          <span class="badge badge-none">⚠️ 暂无SSL证书</span>
        </div>
      </div>
    </div>

    <!-- Email Config -->
    <div class="card">
      <div class="card-header">
        <h3>SMTP 邮件配置</h3>
        <label class="toggle-label">
          <input type="checkbox" v-model="form.enabled" />
          <span>{{ form.enabled ? '✅ 已启用' : '关闭' }}</span>
        </label>
      </div>
      <div class="card-body">
        <div class="info-box">
          <strong>💡 Gmail 使用说明：</strong>Gmail 需要使用「应用专用密码」而非账号密码。
          前往 <a href="https://myaccount.google.com/apppasswords" target="_blank">Google 账户 → 安全性 → 应用专用密码</a> 生成后填入。
        </div>

        <div class="grid grid-2">
          <div class="form-group">
            <label>SMTP 服务器</label>
            <input v-model="form.smtp_host" class="form-control" placeholder="smtp.gmail.com" />
          </div>
          <div class="form-group">
            <label>SMTP 端口</label>
            <input v-model="form.smtp_port" class="form-control" type="number" placeholder="465" />
            <p class="form-hint">Gmail: 465 (SSL) 或 587 (TLS)</p>
          </div>
        </div>

        <div class="grid grid-2">
          <div class="form-group">
            <label>Gmail 账号（发件人）</label>
            <input v-model="form.smtp_user" class="form-control" type="email" placeholder="your@gmail.com" />
          </div>
          <div class="form-group">
            <label>应用专用密码</label>
            <input v-model="form.smtp_pass" class="form-control" type="password" placeholder="16位应用专用密码" autocomplete="new-password" />
          </div>
        </div>

        <div class="grid grid-2">
          <div class="form-group">
            <label>发件人显示名称</label>
            <input v-model="form.from_name" class="form-control" placeholder="SunSea Steel" />
          </div>
          <div class="form-group">
            <label>询盘通知收件邮箱</label>
            <input v-model="form.to_email" class="form-control" type="email" placeholder="admin@yourcompany.com" />
            <p class="form-hint">新询盘提交后，邮件将发送到此邮箱</p>
          </div>
        </div>

        <div class="form-group" style="max-width:300px">
          <label>SSL 证书到期预警天数</label>
          <input v-model="form.ssl_warn_days" class="form-control" type="number" min="1" max="90" placeholder="30" />
          <p class="form-hint">当证书剩余天数少于此值时，每天发送一封提醒邮件</p>
        </div>

        <div class="actions">
          <button class="btn btn-primary" @click="saveConfig" :disabled="saving">
            {{ saving ? '保存中...' : '💾 保存配置' }}
          </button>
          <button class="btn btn-outline" @click="showTestModal = true">
            📨 发送测试邮件
          </button>
        </div>

        <div v-if="saveResult" :class="['result-box', saveResult.ok ? 'result-ok' : 'result-err']">
          {{ saveResult.message }}
        </div>
      </div>
    </div>

    <!-- Test Email Modal -->
    <div class="modal-overlay" v-if="showTestModal" @click.self="showTestModal = false">
      <div class="modal-box">
        <h3>发送测试邮件</h3>
        <div class="form-group">
          <label>收件地址（留空则发送到配置的收件邮箱）</label>
          <input v-model="testEmail" class="form-control" type="email" placeholder="test@example.com" />
        </div>
        <div v-if="testResult" :class="['result-box', testResult.ok ? 'result-ok' : 'result-err']">
          {{ testResult.message }}
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" @click="sendTest" :disabled="testing">
            {{ testing ? '发送中...' : '📨 发送' }}
          </button>
          <button class="btn btn-outline" @click="showTestModal = false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../../api'

const saving = ref(false)
const testing = ref(false)
const showTestModal = ref(false)
const testEmail = ref('')
const testResult = ref(null)
const saveResult = ref(null)
const sslInfo = ref(null)

const form = reactive({
  smtp_host: '', smtp_port: 465, smtp_user: '', smtp_pass: '',
  from_name: 'SunSea Steel', to_email: '', ssl_warn_days: 30, enabled: false
})

onMounted(async () => {
  try {
    const [cfg, ssl] = await Promise.all([
      api.request('/email/config'),
      api.request('/email/ssl-status')
    ])
    if (cfg && cfg.smtp_host) {
      Object.assign(form, { ...cfg, enabled: !!cfg.enabled, smtp_pass: '' })
    }
    sslInfo.value = ssl
  } catch (e) { console.error(e) }
})

const saveConfig = async () => {
  saving.value = true
  saveResult.value = null
  try {
    await api.request('/email/config', { method: 'PUT', body: JSON.stringify(form) })
    saveResult.value = { ok: true, message: '✅ 邮件配置已保存' }
  } catch (e) {
    saveResult.value = { ok: false, message: '❌ ' + e.message }
  } finally { saving.value = false }
}

const sendTest = async () => {
  testing.value = true
  testResult.value = null
  try {
    const res = await api.request('/email/test', {
      method: 'POST',
      body: JSON.stringify({ to: testEmail.value || undefined })
    })
    testResult.value = { ok: true, message: '✅ ' + res.message }
  } catch (e) {
    testResult.value = { ok: false, message: '❌ ' + e.message }
  } finally { testing.value = false }
}
</script>

<style scoped>
.email-page { padding: 0 }
h1 { font-size: 24px; font-weight: 700; margin-bottom: 24px; color: #1e293b }
.card { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px }
.card-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #e2e8f0 }
.card-header h3 { margin: 0; font-size: 16px }
.card-body { padding: 20px }
.ssl-status-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap }
.badge { padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600 }
.badge-ok { background: #dcfce7; color: #15803d }
.badge-warn { background: #fef3c7; color: #92400e }
.badge-error { background: #fee2e2; color: #b91c1c }
.badge-none { background: #f1f5f9; color: #64748b }
.ssl-date { color: #475569; font-size: 14px }
.hint { color: #94a3b8; font-size: 12px }
.grid { display: grid; gap: 16px; margin-bottom: 0 }
.grid-2 { grid-template-columns: 1fr 1fr }
.form-group { margin-bottom: 16px }
.form-group label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; color: #374151 }
.form-control { width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; box-sizing: border-box }
.form-hint { font-size: 12px; color: #94a3b8; margin: 4px 0 0 }
.actions { display: flex; gap: 12px; margin-top: 8px }
.btn { padding: 8px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none }
.btn-primary { background: #3b82f6; color: #fff }
.btn-primary:hover { background: #2563eb }
.btn-outline { background: #fff; color: #374151; border: 1px solid #d1d5db }
.btn-outline:hover { background: #f9fafb }
.btn:disabled { opacity: 0.6; cursor: not-allowed }
.result-box { margin-top: 12px; padding: 10px 14px; border-radius: 8px; font-size: 14px }
.result-ok { background: #dcfce7; color: #15803d }
.result-err { background: #fee2e2; color: #b91c1c }
.info-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 14px; color: #1e40af }
.info-box a { color: #2563eb }
.toggle-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000 }
.modal-box { background: #fff; border-radius: 12px; padding: 24px; width: 420px; max-width: 90vw }
.modal-box h3 { margin: 0 0 16px; font-size: 18px }
.modal-actions { display: flex; gap: 12px; margin-top: 16px }
</style>
