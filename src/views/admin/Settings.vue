<template>
  <div class="settings-page">
    <h1>系统设置</h1>
    
    <div class="card">
      <div class="card-header">修改密码</div>
      <div class="card-body">
        <form @submit.prevent="handleSubmit" style="max-width: 400px;">
          <div class="form-group">
            <label>原密码</label>
            <input v-model="form.oldPassword" type="password" class="form-control" required />
          </div>
          <div class="form-group">
            <label>新密码</label>
            <input v-model="form.newPassword" type="password" class="form-control" required />
          </div>
          <div class="form-group">
            <label>确认新密码</label>
            <input v-model="form.confirmPassword" type="password" class="form-control" required />
          </div>
          <button type="submit" class="btn btn-primary" :disabled="loading">保存</button>
        </form>
      </div>
    </div>

    <!-- SSL Certificate Section -->
    <div class="card ssl-card">
      <div class="card-header">🔒 SSL证书配置</div>
      <div class="card-body">
        <div class="ssl-status" v-if="sslStatus">
          <span :class="['ssl-badge', sslStatus.hasCert && sslStatus.hasKey ? 'ssl-active' : 'ssl-none']">
            {{ sslStatus.hasCert && sslStatus.hasKey ? '✓ SSL证书已上传' : '⚠ 未配置SSL证书' }}
          </span>
          <span :class="['ssl-badge', sslStatus.nginxConfigured ? 'ssl-active' : 'ssl-none']">
            {{ sslStatus.nginxConfigured ? '✓ Nginx HTTPS已启用' : '⚠ Nginx未配置HTTPS' }}
          </span>
          <span class="ssl-hint" v-if="sslStatus.certInfo">
            上次更新: {{ new Date(sslStatus.certInfo.modified).toLocaleString('zh-CN') }}
          </span>
        </div>

        <div class="ssl-info">
          <h4>📋 操作说明：</h4>
          <ol>
            <li>在下方粘贴 <strong>证书文件</strong> 和 <strong>私钥文件</strong> 内容</li>
            <li>点击「保存并启用 HTTPS」</li>
            <li>系统会自动配置 Nginx 并启用 HTTPS，<strong>无需手动操作服务器</strong></li>
          </ol>
          <div class="ssl-sources">
            <strong>💡 免费SSL证书获取：</strong>
            <a href="https://www.sslforfree.com" target="_blank">SSL For Free</a> ·
            <a href="https://letsencrypt.org" target="_blank">Let's Encrypt</a>
          </div>
        </div>

        <div class="ssl-result" v-if="sslResult">
          <div :class="['ssl-result-box', sslResult.success ? 'result-success' : 'result-error']">
            <pre>{{ sslResult.message }}</pre>
          </div>
        </div>

        <div class="form-group">
          <label>证书文件内容（cert.pem / fullchain.pem）<span class="hint">以 -----BEGIN CERTIFICATE----- 开头</span></label>
          <textarea v-model="sslForm.cert" class="form-control ssl-textarea" rows="8" placeholder="-----BEGIN CERTIFICATE-----&#10;...证书内容...&#10;-----END CERTIFICATE-----" />
        </div>
        <div class="form-group">
          <label>私钥文件内容（key.pem / privkey.pem）<span class="hint">以 -----BEGIN RSA PRIVATE KEY----- 或 -----BEGIN PRIVATE KEY----- 开头</span></label>
          <textarea v-model="sslForm.key" class="form-control ssl-textarea" rows="8" placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...私钥内容...&#10;-----END RSA PRIVATE KEY-----" />
        </div>
        <div style="display:flex; gap:12px; align-items:center;">
          <button class="btn btn-primary" @click="saveSsl" :disabled="sslLoading">
            {{ sslLoading ? '保存配置中...' : '🔒 保存并启用 HTTPS' }}
          </button>
          <button v-if="sslStatus?.hasCert" class="btn btn-outline" @click="deleteSsl" style="color:#dc2626;border-color:#dc2626;">
            🗑 删除证书
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../../api'

const loading = ref(false)
const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const handleSubmit = async () => {
  if (form.newPassword !== form.confirmPassword) {
    alert('两次输入的密码不一致')
    return
  }

  loading.value = true
  try {
    await api.changePassword({
      oldPassword: form.oldPassword,
      newPassword: form.newPassword
    })
    alert('密码修改成功')
    form.oldPassword = ''
    form.newPassword = ''
    form.confirmPassword = ''
  } catch (e) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

// SSL section
const sslLoading = ref(false)
const sslStatus = ref(null)
const sslResult = ref(null)
const sslForm = reactive({ cert: '', key: '' })

const loadSslStatus = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/ssl/status', { headers: { Authorization: `Bearer ${token}` } })
    sslStatus.value = await res.json()
  } catch (e) { console.error(e) }
}

const saveSsl = async () => {
  if (!sslForm.cert || !sslForm.key) { alert('请填写证书和私钥内容'); return }
  sslLoading.value = true
  sslResult.value = null
  try {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/ssl/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ cert: sslForm.cert, key: sslForm.key })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    sslResult.value = { success: true, message: data.message + (data.nginxMessage ? '\n\n' + data.nginxMessage : '') }
    sslForm.cert = ''; sslForm.key = ''
    await loadSslStatus()
  } catch (e) {
    sslResult.value = { success: false, message: e.message }
  } finally { sslLoading.value = false }
}

const deleteSsl = async () => {
  if (!confirm('确定删除SSL证书吗？删除后网站将不支持HTTPS')) return
  try {
    const token = localStorage.getItem('token')
    await fetch('/api/ssl', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    await loadSslStatus()
    alert('SSL证书已删除')
  } catch (e) { alert(e.message) }
}

onMounted(loadSslStatus)
</script>

<style scoped>
.settings-page h1 {
  margin-bottom: 24px;
}

.ssl-card {
  margin-top: 24px;
}

.ssl-status {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.ssl-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.ssl-active { background: #dcfce7; color: #15803d; }
.ssl-none { background: #fef9c3; color: #854d0e; }

.ssl-hint { font-size: 12px; color: #64748b; }

.ssl-info {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  font-size: 14px;
  color: #374151;
}

.ssl-info h4 { margin: 0 0 8px; font-size: 14px; color: #1e40af; }
.ssl-info ol { margin: 0 0 12px; padding-left: 20px; }
.ssl-info li { margin-bottom: 6px; line-height: 1.5; }
.ssl-info code {
  background: #e0f2fe; padding: 2px 6px; border-radius: 4px;
  font-family: monospace; font-size: 12px; color: #0369a1;
}

.ssl-sources {
  font-size: 13px;
  color: #475569;
  margin-top: 8px;
}

.ssl-sources a {
  color: #2563eb;
  text-decoration: underline;
  margin: 0 4px;
}

.ssl-textarea {
  font-family: monospace;
  font-size: 12px;
  line-height: 1.6;
}

.hint {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 400;
  margin-left: 6px;
}

.ssl-result { margin-bottom: 16px; }
.ssl-result-box {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
}
.ssl-result-box pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
}
.result-success { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
.result-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5; }
</style>
