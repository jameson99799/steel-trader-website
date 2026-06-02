<template>
  <div class="chat-settings">
    <div class="header">
      <h2>微信实时客服设置</h2>
      <p>绑定您的微信，实现与网站访客的实时双向沟通。支持新客自动弹窗和离线自动回复。</p>
    </div>

    <div class="tabs">
      <button :class="{ active: activeTab === 'basic' }" @click="activeTab = 'basic'">基础设置与绑定</button>
      <button :class="{ active: activeTab === 'greetings' }" @click="activeTab = 'greetings'">新客欢迎弹窗</button>
      <button :class="{ active: activeTab === 'replies' }" @click="activeTab = 'replies'">离线自动回复</button>
    </div>

    <!-- Tab 1: 基础设置与绑定 -->
    <div v-if="activeTab === 'basic'" class="content-grid">
      <!-- 微信绑定卡片 -->
      <div class="card wechat-card">
        <h3>微信机器人绑定</h3>
        
        <div v-if="loadingStatus" class="loading">正在检查微信状态...</div>
        
        <div v-else-if="wechatStatus.isLoggedIn" class="status-logged-in">
          <div class="success-icon">✓</div>
          <h4>已成功绑定！</h4>
          <p>当前登录微信：<strong>{{ wechatStatus.currentUser }}</strong></p>
          <p class="desc">网站访客发送的消息将自动推送至您的微信【文件传输助手】。您可以直接回复访客。</p>
          <button class="btn btn-danger" @click="logoutWechat">解绑微信</button>
        </div>
        
        <div v-else class="status-logged-out">
          <h4>扫码绑定微信</h4>
          <p class="desc">请使用您的微信扫描下方二维码进行登录绑定。</p>
          
          <div class="qrcode-container">
            <img v-if="wechatStatus.qrCodeUrl" :src="wechatStatus.qrCodeUrl" alt="WeChat Login QR Code" />
            <div v-else class="qr-placeholder">二维码生成中... (请稍等或刷新页面)</div>
          </div>
          <button class="btn btn-secondary" @click="fetchStatus">刷新二维码</button>
        </div>
      </div>

      <!-- 基础设置卡片 -->
      <div class="card settings-card">
        <h3>全局功能设置</h3>
        <p class="desc">配置客服悬浮窗的前台显示规则与离线时间段。</p>
        
        <form @submit.prevent="saveSettings" class="settings-form">
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" v-model="settings.global_enabled" />
              启用前台在线客服功能 (取消勾选将隐藏图标)
            </label>
          </div>
          
          <div class="form-group">
            <label>自动缩回时间 (秒)</label>
            <input type="number" v-model="settings.auto_close_seconds" min="0" />
            <span class="help-text">设为 0 表示不自动缩回。例如设为 10，则弹窗开启 10 秒无交互后自动缩小为图标。</span>
          </div>

          <hr style="margin: 20px 0; border: 0; border-top: 1px solid #e5e7eb;" />

          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" v-model="settings.auto_reply_enabled" />
              启用离线自动回复逻辑
            </label>
          </div>
          
          <div class="form-row" :class="{ 'disabled': !settings.auto_reply_enabled }">
            <div class="form-group">
              <label>离线开始时间</label>
              <input type="time" v-model="settings.start_time" :disabled="!settings.auto_reply_enabled" />
            </div>
            <div class="form-group">
              <label>离线结束时间</label>
              <input type="time" v-model="settings.end_time" :disabled="!settings.auto_reply_enabled" />
            </div>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? '保存中...' : '保存全局设置' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Tab 2: 新客欢迎弹窗 -->
    <div v-if="activeTab === 'greetings'" class="card full-card">
      <div class="card-header">
        <h3>新客欢迎弹窗设置</h3>
        <button class="btn btn-primary" @click="openGreetingModal()">添加欢迎语</button>
      </div>
      <p class="desc">当新访客进入网站时，会自动弹窗并轮询发送已激活的欢迎语。支持添加产品按钮实现快速跳转。</p>
      
      <table class="data-table">
        <thead>
          <tr>
            <th>语言</th>
            <th>欢迎话术</th>
            <th>关联按钮数量</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="g in greetings" :key="g.id">
            <td>{{ g.lang }}</td>
            <td class="text-limit">{{ g.content }}</td>
            <td>{{ JSON.parse(g.buttons_json || '[]').length }} 个</td>
            <td>
              <span :class="g.is_active ? 'badge-success' : 'badge-default'">{{ g.is_active ? '启用' : '禁用' }}</span>
            </td>
            <td>
              <button class="btn-text" @click="openGreetingModal(g)">编辑</button>
              <button class="btn-text text-danger" @click="deleteGreeting(g.id)">删除</button>
            </td>
          </tr>
          <tr v-if="greetings.length === 0">
            <td colspan="5" style="text-align: center; color: #6b7280;">暂无欢迎语</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Tab 3: 离线自动回复 -->
    <div v-if="activeTab === 'replies'" class="card full-card">
      <div class="card-header">
        <h3>离线自动回复设置</h3>
        <button class="btn btn-primary" @click="openReplyModal()">添加回复话术</button>
      </div>
      <p class="desc">在离线时间段内，如果访客发送消息，系统将从下方激活的话术中轮询抽取一条自动回复。</p>
      
      <table class="data-table">
        <thead>
          <tr>
            <th>回复内容</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in autoReplies" :key="r.id">
            <td class="text-limit">{{ r.content }}</td>
            <td>
              <span :class="r.is_active ? 'badge-success' : 'badge-default'">{{ r.is_active ? '启用' : '禁用' }}</span>
            </td>
            <td>
              <button class="btn-text" @click="openReplyModal(r)">编辑</button>
              <button class="btn-text text-danger" @click="deleteReply(r.id)">删除</button>
            </td>
          </tr>
          <tr v-if="autoReplies.length === 0">
            <td colspan="3" style="text-align: center; color: #6b7280;">暂无自动回复</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modals -->
    <!-- 自动回复 Modal -->
    <div v-if="showReplyModal" class="modal-overlay">
      <div class="modal-content">
        <h3>{{ currentReply.id ? '编辑自动回复' : '添加自动回复' }}</h3>
        <div class="form-group">
          <label>回复内容</label>
          <textarea v-model="currentReply.content" rows="4"></textarea>
        </div>
        <div class="form-group checkbox-group">
          <label><input type="checkbox" v-model="currentReply.is_active" /> 启用此话术</label>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showReplyModal = false">取消</button>
          <button class="btn btn-primary" @click="saveReply">保存</button>
        </div>
      </div>
    </div>

    <!-- 欢迎语 Modal -->
    <div v-if="showGreetingModal" class="modal-overlay">
      <div class="modal-content large">
        <h3>{{ currentGreeting.id ? '编辑欢迎弹窗' : '添加欢迎弹窗' }}</h3>
        <div class="form-row">
          <div class="form-group">
            <label>目标语言 (例如: en, zh, es, pt)</label>
            <input type="text" v-model="currentGreeting.lang" />
          </div>
          <div class="form-group checkbox-group" style="align-items: center; display: flex; margin-top: 24px;">
            <label><input type="checkbox" v-model="currentGreeting.is_active" /> 启用此欢迎语</label>
          </div>
        </div>
        
        <div class="form-group">
          <label>欢迎话术内容</label>
          <textarea v-model="currentGreeting.content" rows="3" placeholder="例如：欢迎参观我们的网站，请问有什么可以帮您？"></textarea>
        </div>

        <div class="buttons-editor">
          <div class="card-header" style="margin-bottom: 10px;">
            <h4>关联快速跳转按钮</h4>
            <button class="btn btn-sm btn-secondary" @click="addGreetingButton">添加按钮</button>
          </div>
          <div v-for="(btn, index) in currentGreeting.buttons" :key="index" class="btn-row">
            <input type="text" v-model="btn.label" placeholder="按钮显示文字 (如: 镀锌钢卷)" />
            <input type="text" v-model="btn.url" placeholder="跳转链接 (如: /products/gi)" />
            <button class="btn-icon text-danger" @click="removeGreetingButton(index)">×</button>
          </div>
          <p v-if="currentGreeting.buttons.length === 0" class="help-text">可添加按钮引导客户点击，支持跳转到产品分类或新闻页面。</p>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showGreetingModal = false">取消</button>
          <button class="btn btn-primary" @click="saveGreeting">保存</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const activeTab = ref('basic')
const wechatStatus = ref({ isLoggedIn: false, currentUser: null, qrCodeUrl: null })
const settings = ref({ global_enabled: true, auto_close_seconds: 0, auto_reply_enabled: false, start_time: '22:00', end_time: '07:00' })
const loadingStatus = ref(true)
const saving = ref(false)

const autoReplies = ref([])
const greetings = ref([])

let pollInterval = null

// Modals State
const showReplyModal = ref(false)
const currentReply = ref({ id: null, content: '', is_active: true })

const showGreetingModal = ref(false)
const currentGreeting = ref({ id: null, lang: 'en', content: '', buttons: [], is_active: true })

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
})

// --- Basic APIs ---
const fetchStatus = async () => {
  try {
    const res = await fetch('/api/chat/admin/status', { headers: getHeaders() })
    if (res.ok) wechatStatus.value = await res.json()
  } catch (e) {
    console.error('Failed to fetch WeChat status', e)
  } finally {
    loadingStatus.value = false
  }
}

const fetchSettings = async () => {
  try {
    const res = await fetch('/api/chat/admin/settings', { headers: getHeaders() })
    if (res.ok) {
      const data = await res.json()
      settings.value = {
        global_enabled: Boolean(data.global_enabled ?? true),
        auto_close_seconds: data.auto_close_seconds || 0,
        auto_reply_enabled: Boolean(data.auto_reply_enabled),
        start_time: data.start_time || '22:00',
        end_time: data.end_time || '07:00'
      }
    }
  } catch (e) {
    console.error('Failed to fetch settings', e)
  }
}

const saveSettings = async () => {
  saving.value = true
  try {
    const res = await fetch('/api/chat/admin/settings', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(settings.value)
    })
    if (res.ok) alert('全局设置已保存！')
    else alert('保存失败')
  } catch (e) {
    alert('请求错误')
  } finally {
    saving.value = false
  }
}

const logoutWechat = async () => {
  if (!confirm('确定要解绑当前微信吗？')) return
  try {
    await fetch('/api/chat/admin/logout', { method: 'POST', headers: getHeaders() })
    await fetchStatus()
  } catch (e) {
    console.error('Logout failed', e)
  }
}

// --- Auto Replies APIs ---
const fetchAutoReplies = async () => {
  const res = await fetch('/api/chat/admin/auto-replies', { headers: getHeaders() })
  if (res.ok) autoReplies.value = await res.json()
}

const openReplyModal = (reply = null) => {
  if (reply) {
    currentReply.value = { ...reply, is_active: Boolean(reply.is_active) }
  } else {
    currentReply.value = { id: null, content: '', is_active: true }
  }
  showReplyModal.value = true
}

const saveReply = async () => {
  const method = currentReply.value.id ? 'PUT' : 'POST'
  const url = currentReply.value.id ? `/api/chat/admin/auto-replies/${currentReply.value.id}` : '/api/chat/admin/auto-replies'
  
  await fetch(url, {
    method,
    headers: getHeaders(),
    body: JSON.stringify(currentReply.value)
  })
  showReplyModal.value = false
  fetchAutoReplies()
}

const deleteReply = async (id) => {
  if (!confirm('确定删除这条回复？')) return
  await fetch(`/api/chat/admin/auto-replies/${id}`, { method: 'DELETE', headers: getHeaders() })
  fetchAutoReplies()
}

// --- Greetings APIs ---
const fetchGreetings = async () => {
  const res = await fetch('/api/chat/admin/greetings', { headers: getHeaders() })
  if (res.ok) greetings.value = await res.json()
}

const openGreetingModal = (greeting = null) => {
  if (greeting) {
    currentGreeting.value = { 
      ...greeting, 
      is_active: Boolean(greeting.is_active),
      buttons: JSON.parse(greeting.buttons_json || '[]')
    }
  } else {
    currentGreeting.value = { id: null, lang: 'en', content: '', buttons: [], is_active: true }
  }
  showGreetingModal.value = true
}

const addGreetingButton = () => {
  currentGreeting.value.buttons.push({ label: '', url: '' })
}
const removeGreetingButton = (index) => {
  currentGreeting.value.buttons.splice(index, 1)
}

const saveGreeting = async () => {
  const method = currentGreeting.value.id ? 'PUT' : 'POST'
  const url = currentGreeting.value.id ? `/api/chat/admin/greetings/${currentGreeting.value.id}` : '/api/chat/admin/greetings'
  
  const payload = {
    ...currentGreeting.value,
    buttons_json: JSON.stringify(currentGreeting.value.buttons)
  }

  await fetch(url, {
    method,
    headers: getHeaders(),
    body: JSON.stringify(payload)
  })
  showGreetingModal.value = false
  fetchGreetings()
}

const deleteGreeting = async (id) => {
  if (!confirm('确定删除这条欢迎语？')) return
  await fetch(`/api/chat/admin/greetings/${id}`, { method: 'DELETE', headers: getHeaders() })
  fetchGreetings()
}

onMounted(() => {
  fetchStatus()
  fetchSettings()
  fetchAutoReplies()
  fetchGreetings()
  pollInterval = setInterval(fetchStatus, 3000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<style scoped>
.chat-settings {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}
.header { margin-bottom: 24px; }
.header h2 { font-size: 24px; color: #1f2937; margin-bottom: 8px; }
.header p { color: #6b7280; }

.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;
}
.tabs button {
  background: none;
  border: none;
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
  color: #4b5563;
  border-bottom: 2px solid transparent;
}
.tabs button:hover { color: #2563eb; }
.tabs button.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
  font-weight: 600;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
@media (max-width: 768px) {
  .content-grid { grid-template-columns: 1fr; }
}

.card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border: 1px solid #e5e7eb;
}
.full-card { width: 100%; }
.card h3 { margin: 0 0 8px 0; font-size: 18px; color: #111827; }
.card .desc { font-size: 14px; color: #6b7280; margin-bottom: 20px; }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.loading { color: #6b7280; font-style: italic; }
.status-logged-in { text-align: center; }
.success-icon { font-size: 48px; color: #10b981; line-height: 1; margin-bottom: 12px; }
.status-logged-in h4 { color: #10b981; margin: 0 0 8px 0; }
.status-logged-out { text-align: center; }
.qrcode-container {
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  width: 250px;
  height: 250px;
  margin: 0 auto 20px auto;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.qrcode-container img { width: 100%; height: 100%; object-fit: contain; }
.qr-placeholder { color: #9ca3af; font-size: 14px; }

.settings-form .form-group { margin-bottom: 16px; display: flex; flex-direction: column; }
.settings-form .form-group label { margin-bottom: 6px; font-weight: 500; font-size: 14px; color: #374151; }
.settings-form input[type="time"], .settings-form input[type="number"], .settings-form textarea {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-family: inherit;
}
.settings-form .checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 600;
}
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.disabled { opacity: 0.5; pointer-events: none; }
.help-text { font-size: 12px; color: #6b7280; margin-top: 4px; }

.form-actions { display: flex; justify-content: flex-end; margin-top: 24px; }
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-sm { padding: 4px 8px; font-size: 12px; }
.btn:hover { opacity: 0.9; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: #2563eb; color: white; }
.btn-secondary { background: #e5e7eb; color: #374151; }
.btn-danger { background: #ef4444; color: white; }
.btn-text { background: none; border: none; color: #2563eb; cursor: pointer; padding: 4px 8px; }
.text-danger { color: #ef4444 !important; }
.btn-icon { background: none; border: none; font-size: 20px; cursor: pointer; display: flex; align-items: center; }

.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
.data-table th, .data-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
.data-table th { background: #f9fafb; font-weight: 600; color: #374151; }
.text-limit { max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.badge-success { background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
.badge-default { background: #f3f4f6; color: #374151; padding: 2px 8px; border-radius: 12px; font-size: 12px; }

/* Modal */
.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 50;
}
.modal-content {
  background: white; border-radius: 8px; padding: 24px;
  width: 400px; max-width: 90vw;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}
.modal-content.large { width: 600px; }
.modal-content h3 { margin: 0 0 20px 0; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }

.form-group { margin-bottom: 16px; display: flex; flex-direction: column; }
.form-group label { margin-bottom: 6px; font-weight: 500; font-size: 14px; color: #374151; }
.form-group input, .form-group textarea {
  padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-family: inherit; width: 100%; box-sizing: border-box;
}

.buttons-editor { background: #f9fafb; padding: 16px; border-radius: 6px; border: 1px solid #e5e7eb; }
.btn-row { display: flex; gap: 10px; margin-bottom: 10px; }
.btn-row input { flex: 1; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 4px; }
</style>
