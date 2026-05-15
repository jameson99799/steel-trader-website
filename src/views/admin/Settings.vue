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

    <!-- Watermark Templates Section -->
    <div class="card ssl-card">
      <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
        <span>💦 水印模板管理</span>
        <button class="btn btn-sm btn-primary" @click="openWatermarkEditor(null)">+ 新建模板</button>
      </div>
      <div class="card-body">
        <div class="ssl-info">
          <h4>📋 说明：</h4>
          <p>您可以创建多个图片或文字水印模板。设置一个为「默认模板」后，在图库或工厂管理中勾选添加水印时将自动使用默认模板。</p>
        </div>
        
        <table class="table" style="margin-top:16px;">
          <thead>
            <tr>
              <th>模板名称</th>
              <th>类型</th>
              <th>默认</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tpl in watermarkTemplates" :key="tpl.id">
              <td>{{ tpl.name }}</td>
              <td>
                <span class="badge" :class="tpl.type === 'text' ? 'badge-blue' : 'badge-green'">
                  {{ tpl.type === 'text' ? '文字' : '图片' }}
                </span>
              </td>
              <td>
                <span v-if="tpl.is_default" class="badge badge-yellow">默认</span>
                <button v-else class="btn btn-sm btn-outline" @click="setDefaultTemplate(tpl.id)">设为默认</button>
              </td>
              <td style="display:flex;gap:8px;">
                <button class="btn btn-sm btn-outline" @click="openWatermarkEditor(tpl)">编辑</button>
                <button class="btn btn-sm btn-outline" style="color:#dc2626;border-color:#dc2626;" @click="deleteTemplate(tpl.id)">删除</button>
              </td>
            </tr>
            <tr v-if="watermarkTemplates.length === 0">
              <td colspan="4" style="text-align:center; color:#94a3b8;">暂无模板，请新建</td>
            </tr>
          </tbody>
        </table>
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

    <!-- Watermark Editor Modal -->
    <div v-if="showWatermarkEditor" class="modal-overlay" style="z-index: 1000;">
      <WatermarkEditor 
        :template="editingTemplate" 
        @close="showWatermarkEditor=false" 
        @save="saveWatermarkTemplate"
        @pick-media="openMediaPicker('watermark')"
        ref="watermarkEditorRef"
        style="width: 90vw; max-width: 1200px;"
      />
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../../api'
import WatermarkEditor from '../../components/admin/WatermarkEditor.vue'

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

// Watermark Templates
const watermarkTemplates = ref([])
const showWatermarkEditor = ref(false)
const editingTemplate = ref(null)
const watermarkEditorRef = ref(null)

const loadWatermarkSettings = async () => {
  try {
    const data = await api.request('/media/watermark-templates')
    watermarkTemplates.value = data || []
  } catch (e) {
    console.error('Failed to load watermark templates', e)
  }
}

const openWatermarkEditor = (tpl) => {
  editingTemplate.value = tpl
  showWatermarkEditor.value = true
}

const saveWatermarkTemplate = async (form) => {
  try {
    if (form.id) {
      await api.request(`/media/watermark-templates/${form.id}`, { method: 'PUT', body: JSON.stringify(form) })
    } else {
      await api.request('/media/watermark-templates', { method: 'POST', body: JSON.stringify(form) })
    }
    showWatermarkEditor.value = false
    await loadWatermarkSettings()
  } catch (e) {
    alert(e.message)
  }
}

const deleteTemplate = async (id) => {
  if (!confirm('确定删除此模板吗？')) return
  try {
    await api.request(`/media/watermark-templates/${id}`, { method: 'DELETE' })
    await loadWatermarkSettings()
  } catch (e) { alert(e.message) }
}

const setDefaultTemplate = async (id) => {
  try {
    await api.request(`/media/watermark-templates/${id}/set-default`, { method: 'PUT' })
    await loadWatermarkSettings()
  } catch (e) { alert(e.message) }
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
    mediaPickerItems.value = data.items.map(m => ({ id: m.id, filepath: m.filepath }))
  } catch (e) { console.error(e) }
}

const doSelectMedia = () => {
  if (mediaPickerSelected.value) {
    if (watermarkEditorRef.value) {
      watermarkEditorRef.value.setMediaUrl(mediaPickerSelected.value)
    }
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
