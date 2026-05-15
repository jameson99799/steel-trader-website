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

    <!-- Watermark Settings Section -->
    <div class="card ssl-card">
      <div class="card-header">💦 媒体库水印配置</div>
      <div class="card-body">
        <div class="ssl-info">
          <h4>📋 说明：</h4>
          <p>配置全局默认的图片水印。在工厂展示等模块选择图片时，您可以勾选是否叠加此水印生成新图。</p>
        </div>
        <form @submit.prevent="saveWatermarkSettings" style="max-width: 500px; margin-top:16px;">
          <div class="form-group">
            <label>水印 Logo 图片</label>
            <div style="display:flex;gap:8px;align-items:center;">
              <input v-model="wmForm.watermark_url" type="text" class="form-control" placeholder="/uploads/wangzhanlogo.png" />
              <button type="button" class="btn btn-sm btn-outline" @click="openMediaPicker('watermark')" style="color:#7c3aed;border-color:#7c3aed;">📷 选择</button>
            </div>
            <div class="preview-box preview-small" v-if="wmForm.watermark_url" style="margin-top:8px;">
              <img :src="wmForm.watermark_url" style="max-height:64px; border:1px solid #e2e8f0; border-radius:4px; padding:4px; background:#f8fafc;" />
            </div>
          </div>
          <div class="form-group">
            <label>水印位置 (Position)</label>
            <select v-model="wmForm.position" class="form-control">
              <option value="bottom-right">右下角 (Bottom Right)</option>
              <option value="bottom-left">左下角 (Bottom Left)</option>
              <option value="top-right">右上角 (Top Right)</option>
              <option value="top-left">左上角 (Top Left)</option>
              <option value="center">居中 (Center)</option>
            </select>
          </div>
          <div class="form-group">
            <label>水印比例缩放 (Scale)</label>
            <input type="number" v-model.number="wmForm.scale" step="0.01" min="0.05" max="1" class="form-control" />
            <p class="hint">0.15 表示占原图宽度的 15%</p>
          </div>
          <button type="submit" class="btn btn-primary" :disabled="wmLoading">
            {{ wmLoading ? '保存中...' : '保存水印配置' }}
          </button>
        </form>
      </div>
    </div>

    <!-- External API Key Section -->
    <div class="card ssl-card">
      <div class="card-header">🔑 外部 API 密钥</div>
      <div class="card-body">
        <div class="ssl-info">
          <h4>📋 说明：</h4>
          <p>外部 API 允许通过 HTTP 接口提交产品和新闻文章，适合 AI 或外部系统自动上传内容。</p>
          <p>请求时在 Header 中携带 <code>X-API-Key: your-key</code> 进行认证。</p>
          <p>接口文档：<a :href="apiDocsUrl" target="_blank">{{ apiDocsUrl }}</a></p>
        </div>
        <div class="form-group" style="margin-top:12px">
          <label>API Key</label>
          <div style="display:flex;gap:8px;align-items:center">
            <input :value="externalApiKey" class="form-control" readonly style="font-family:monospace;font-size:13px" />
            <button class="btn btn-outline" @click="copyApiKey" v-if="externalApiKey">📋 复制</button>
            <button class="btn btn-primary" @click="generateApiKey">{{ externalApiKey ? '🔄 重新生成' : '✨ 生成密钥' }}</button>
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- Media Library Picker -->
    <div v-if="showMediaPicker" class="modal-overlay" @click.self="showMediaPicker=false">
      <div class="modal" style="max-width:700px;">
        <div class="modal-header" style="background:#f5f3ff;color:#7c3aed;">
          <h3>📷 从图库选择水印</h3>
          <button class="modal-close" @click="showMediaPicker=false">&times;</button>
        </div>
        <div class="modal-body">
          <div style="display:flex;gap:8px;margin-bottom:12px;">
            <input v-model="mediaPickerSearch" class="form-control" placeholder="搜索文件名..." @input="loadMediaPicker" style="max-width:200px;" />
            <select v-model="mediaPickerGroup" class="form-control" @change="loadMediaPicker" style="max-width:140px;">
              <option value="">全部分组</option>
              <option v-for="g in mediaGroups" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
          </div>
          <div v-if="mediaPickerItems.length" class="media-grid">
            <div v-for="item in mediaPickerItems" :key="item.id" :class="['media-item', { selected: mediaPickerSelected === item.filepath }]" @click="mediaPickerSelected = item.filepath">
              <img :src="item.filepath" />
            </div>
          </div>
          <p v-else style="color:#94a3b8;text-align:center;padding:20px;">暂无图片</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showMediaPicker=false">取消</button>
          <button type="button" class="btn btn-primary" style="background:#7c3aed;" @click="doSelectMedia" :disabled="!mediaPickerSelected">确认选择</button>
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
    const [statusRes, contentRes] = await Promise.all([
      fetch('/api/ssl/status', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/ssl/cert-content', { headers: { Authorization: `Bearer ${token}` } })
    ])
    sslStatus.value = await statusRes.json()
    // Auto-fill existing cert/key so user can see what's configured
    if (contentRes.ok) {
      const content = await contentRes.json()
      if (content.cert) sslForm.cert = content.cert
      if (content.key) sslForm.key = content.key
    }
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
    sslForm.cert = ''; sslForm.key = ''
    await loadSslStatus()
    alert('SSL证书已删除')
  } catch (e) { alert(e.message) }
}

onMounted(() => {
  loadSslStatus()
  loadApiKey()
  loadWatermarkSettings()
})

// Watermark Settings
const wmLoading = ref(false)
const wmForm = reactive({
  enabled: 0,
  watermark_url: '',
  position: 'bottom-right',
  opacity: 0.8,
  scale: 0.15
})

const loadWatermarkSettings = async () => {
  try {
    const data = await api.request('/media/watermark-settings')
    if (data) {
      Object.assign(wmForm, data)
    }
  } catch (e) {
    console.error('Failed to load watermark settings', e)
  }
}

const saveWatermarkSettings = async () => {
  wmLoading.value = true
  try {
    await api.request('/media/watermark-settings', {
      method: 'POST',
      body: JSON.stringify(wmForm)
    })
    alert('水印配置已保存')
  } catch (e) {
    alert(e.message)
  } finally {
    wmLoading.value = false
  }
}

// Media Picker
const showMediaPicker = ref(false)
const mediaGroups = ref([])
const mediaPickerItems = ref([])
const mediaPickerSearch = ref('')
const mediaPickerGroup = ref('')
const mediaPickerSelected = ref('')

const openMediaPicker = async () => {
  showMediaPicker.value = true
  mediaPickerSelected.value = ''
  try {
    const groups = await api.request('/media/groups')
    mediaGroups.value = groups
    await loadMediaPicker()
  } catch (e) { console.error(e) }
}

const loadMediaPicker = async () => {
  try {
    let url = '/media?page=1&per_page=50'
    if (mediaPickerGroup.value) url += `&group_id=${mediaPickerGroup.value}`
    if (mediaPickerSearch.value) url += `&search=${encodeURIComponent(mediaPickerSearch.value)}`
    const data = await api.request(url)
    mediaPickerItems.value = data.items.map(m => ({ id: m.id, filepath: m.media_url }))
  } catch (e) { console.error(e) }
}

const doSelectMedia = () => {
  if (mediaPickerSelected.value) {
    wmForm.watermark_url = mediaPickerSelected.value
    showMediaPicker.value = false
  }
}

// External API Key
const externalApiKey = ref('')
const apiDocsUrl = window.location.origin + '/api/external/docs'

const loadApiKey = async () => {
  try {
    const data = await api.request('/external/key')
    externalApiKey.value = data?.key || ''
  } catch (e) { console.error(e) }
}
const generateApiKey = async () => {
  if (externalApiKey.value && !confirm('重新生成将使旧密钥失效，确定继续？')) return
  try {
    const data = await api.request('/external/key/generate', { method: 'POST' })
    externalApiKey.value = data?.key || ''
    alert('API Key 已生成')
  } catch (e) { alert(e.message) }
}
const copyApiKey = () => {
  navigator.clipboard.writeText(externalApiKey.value)
  alert('API Key 已复制到剪贴板')
}
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

.media-grid { 
  display: grid; 
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); 
  gap: 10px; 
  max-height: 400px; 
  overflow-y: auto; 
  padding-right: 8px; 
}
.media-item { 
  aspect-ratio: 1; 
  border-radius: 8px; 
  overflow: hidden; 
  border: 2px solid transparent; 
  cursor: pointer; 
  position: relative; 
}
.media-item img { 
  width: 100%; 
  height: 100%; 
  object-fit: cover; 
}
.media-item.selected { 
  border-color: #7c3aed; 
}
</style>
