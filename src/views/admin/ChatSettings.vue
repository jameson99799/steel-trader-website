<template>
  <div class="chat-dashboard">
    <div class="header">
      <h2>💬 在线客服控制台</h2>
      <p>与网站在线的客户进行实时对话，配置自动回复话术及窗口预设。</p>
    </div>

    <!-- 选项卡切换 -->
    <div class="tabs">
      <button :class="['tab-btn', { active: activeTab === 'chat' }]" @click="activeTab = 'chat'">
        💬 实时对话
        <span v-if="totalUnread" class="unread-badge">{{ totalUnread }}</span>
      </button>
      <button :class="['tab-btn', { active: activeTab === 'settings' }]" @click="activeTab = 'settings'">
        ⚙️ 客服设置
      </button>
    </div>

    <div v-show="activeTab === 'chat'" class="chat-workspace">
      <!-- 左侧访客列表 -->
      <div class="visitor-sidebar">
        <div class="search-box">
          <input type="text" v-model="searchQuery" placeholder="搜索访客 ID..." />
          <div class="bulk-actions" v-if="filteredVisitors.length > 0">
            <label class="select-all">
              <input type="checkbox" @change="toggleSelectAll" :checked="selectedVisitors.length === filteredVisitors.length && filteredVisitors.length > 0" /> 全选
            </label>
            <button v-if="selectedVisitors.length > 0" class="btn-delete-sm" @click="deleteSelectedVisitors">
              清除记录 ({{ selectedVisitors.length }})
            </button>
          </div>
        </div>
        <div class="visitor-list">
          <div v-if="filteredVisitors.length === 0" class="no-visitors">
            暂无会话记录
          </div>
          <div 
            v-for="visitor in filteredVisitors" 
            :key="visitor.visitor_id" 
            :class="['visitor-item', { active: activeVisitorId === visitor.visitor_id }]"
            @click="selectVisitor(visitor.visitor_id)"
          >
            <div class="visitor-info">
              <input type="checkbox" class="v-checkbox" :value="visitor.visitor_id" v-model="selectedVisitors" @click.stop />
              <span class="visitor-id">访客 #{{ visitor.visitor_id.substring(0, 8) }}</span>
              <span :class="['status-dot', { online: isOnline(visitor.timestamp) }]"></span>
            </div>
            <div v-if="visitor.ip" class="visitor-geoip">
              📍 {{ visitor.country || '未知国家' }} ({{ visitor.ip }})
            </div>
            <div class="last-msg-snippet">
              {{ visitor.content }}
            </div>
            <div class="meta-row">
              <span class="time">{{ formatTime(visitor.timestamp) }}</span>
              <span v-if="visitor.unread_count > 0" class="unread-count">{{ visitor.unread_count }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧对话窗 -->
      <div class="chat-area">
        <div v-if="!activeVisitorId" class="no-active-chat">
          <div class="placeholder-icon">💬</div>
          <h3>请选择左侧的一个访客开始对话</h3>
          <p>新消息到达时，系统将发出提示音。</p>
        </div>

        <div v-else class="active-chat">
          <div class="chat-header">
            <div class="chat-header-title">
              <h3>对讲中：访客 #{{ activeVisitorId.substring(0, 12) }}...</h3>
              <div v-if="activeVisitorMeta && activeVisitorMeta.ip" class="chat-header-geoip">
                IP: {{ activeVisitorMeta.ip }} | 国家: {{ activeVisitorMeta.country || '未知国家' }}
              </div>
            </div>
            <span :class="['status-badge', { online: isCurrentOnline }]">
              {{ isCurrentOnline ? '在线' : '离线' }}
            </span>
          </div>

          <div class="chat-messages" ref="messagesContainer">
            <div v-for="msg in activeMessages" :key="msg.id" :class="['message', msg.sender_type]">
              <div class="message-bubble">{{ msg.content }}</div>
              <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
            </div>
          </div>

          <div class="chat-input">
            <textarea 
              v-model="replyText" 
              @keydown.enter.exact.prevent="sendReply"
              placeholder="按 Enter 发送消息，Shift + Enter 换行..."
              rows="2"
            ></textarea>
            <button class="btn btn-primary send-btn" @click="sendReply" :disabled="!replyText.trim() || sending">
              发送
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 客服设置 Tab -->
    <div v-show="activeTab === 'settings'" class="settings-content">
      <!-- 基础设置 -->
      <div class="card">
        <h3>基础设置</h3>
        <form @submit.prevent="saveSettings" class="settings-form">
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" v-model="settings.widget_enabled" />
              <strong>开启对话窗口</strong>
              <span class="hint">关闭后，前台将不显示对话图标</span>
            </label>
          </div>

          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" v-model="settings.auto_reply_enabled" />
              <strong>开启自动回复</strong>
              <span class="hint">在设定的时间段内自动回复客户消息</span>
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

          <div class="form-group">
            <label>弹窗自动缩回时间（秒）</label>
            <input type="number" v-model.number="settings.auto_collapse_seconds" min="3" max="60" />
            <span class="hint">新用户进入网站后，弹窗会在此秒数后自动缩回为图标按钮</span>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? '保存中...' : '保存设置' }}
            </button>
          </div>
        </form>
      </div>

      <!-- 自动回复话术 -->
      <div class="card">
        <h3>自动回复话术 <span class="badge">轮询发送</span></h3>
        <p class="desc">可以添加多条自动回复话术，勾选启用的话术将在离线时间段内轮询发送给客户。</p>

        <div v-for="reply in autoReplies" :key="reply.id" class="reply-item">
          <div class="reply-check">
            <input type="checkbox" :checked="reply.enabled" @change="toggleReply(reply)" />
          </div>
          <textarea v-model="reply.content" rows="2" class="reply-textarea"></textarea>
          <div class="reply-actions">
            <button class="btn btn-sm btn-primary" @click="updateReply(reply)">保存</button>
            <button class="btn btn-sm btn-danger" @click="deleteReply(reply.id)">删除</button>
          </div>
        </div>

        <div class="add-row">
          <textarea v-model="newReplyContent" rows="2" placeholder="输入新的自动回复话术..." class="reply-textarea"></textarea>
          <button class="btn btn-primary" @click="addReply" :disabled="!newReplyContent.trim()">+ 添加话术</button>
        </div>
      </div>

      <!-- 欢迎预设话术 -->
      <div class="card">
        <h3>欢迎预设话术 <span class="badge">轮询显示</span></h3>
        <p class="desc">新用户进入网站后，对话窗口自动弹出并显示预设的欢迎语和按钮。勾选启用的预设将轮询显示。按钮支持自定义文字和跳转链接，并跟随网站语言切换。</p>

        <div v-for="(preset, idx) in welcomePresets" :key="preset.id" class="preset-item">
          <div class="preset-header">
            <input type="checkbox" :checked="preset.enabled" @change="togglePreset(preset)" />
            <strong>预设 #{{ idx + 1 }}</strong>
            <button class="btn btn-sm btn-danger" @click="deletePreset(preset.id)">删除</button>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>欢迎语（中文）</label>
              <input type="text" v-model="preset.greeting" />
            </div>
            <div class="form-group">
              <label>欢迎语（英文）</label>
              <input type="text" v-model="preset.greeting_en" />
            </div>
          </div>

          <div class="buttons-editor">
            <label>快捷按钮</label>
            <div v-for="(btn, bi) in preset.buttons" :key="bi" class="button-row">
              <select v-model="btn.url" @change="onPageSelect(btn, $event)" class="url-select">
                <option value="">-- 选择跳转页面 --</option>
                <optgroup v-for="group in pageOptions" :key="group.group" :label="group.group">
                  <option v-for="item in group.items" :key="item.url" :value="item.url">
                    {{ item.label }} ({{ item.label_en }})
                  </option>
                </optgroup>
              </select>
              <input type="text" v-model="btn.label" placeholder="按钮文字（中文）" />
              <input type="text" v-model="btn.label_en" placeholder="Button Text (EN)" />
              <button class="btn btn-sm btn-danger" @click="preset.buttons.splice(bi, 1)">×</button>
            </div>
            <button class="btn btn-sm btn-secondary" @click="preset.buttons.push({ label: '', label_en: '', url: '' })">+ 添加按钮</button>
          </div>

          <div class="form-actions">
            <button class="btn btn-primary" @click="updatePreset(preset)">保存此预设</button>
          </div>
        </div>

        <div class="add-preset-area">
          <button class="btn btn-primary" @click="addPreset">+ 新增欢迎预设</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

const activeTab = ref('chat')
const settings = ref({ widget_enabled: true, auto_reply_enabled: false, start_time: '22:00', end_time: '07:00', auto_collapse_seconds: 10 })
const autoReplies = ref([])
const welcomePresets = ref([])
const pageOptions = ref([])
const newReplyContent = ref('')
const saving = ref(false)

// Chat console reactive variables
const visitors = ref([])
const activeVisitorId = ref('')
const activeMessages = ref([])
const replyText = ref('')
const sending = ref(false)
const searchQuery = ref('')
const messagesContainer = ref(null)

const selectedVisitors = ref([])
const toggleSelectAll = (e) => {
  if (e.target.checked) {
    selectedVisitors.value = filteredVisitors.value.map(v => v.visitor_id)
  } else {
    selectedVisitors.value = []
  }
}

const deleteSelectedVisitors = async () => {
  if (selectedVisitors.value.length === 0) return
  if (!confirm(`确定要删除选中的 ${selectedVisitors.value.length} 个对话记录吗？`)) return
  
  try {
    const res = await fetch('/api/chat/admin/messages', {
      method: 'DELETE',
      headers: headers(),
      body: JSON.stringify({ visitor_ids: selectedVisitors.value })
    })
    if (res.ok) {
      if (selectedVisitors.value.includes(activeVisitorId.value)) {
        activeVisitorId.value = ''
        activeMessages.value = []
      }
      selectedVisitors.value = []
      fetchVisitors()
    } else {
      alert('删除失败，请重试')
    }
  } catch (e) {
    console.error('Delete error', e)
  }
}

let pollInterval = null

const token = () => localStorage.getItem('token')
const headers = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` })

// Play high-quality synthed chime sound when new message arrives
const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
  } catch (e) {
    console.error('Audio synth failed', e)
  }
}

// ── Visitor List Computeds & Helpers ──
const filteredVisitors = computed(() => {
  if (!searchQuery.value.trim()) return visitors.value
  const q = searchQuery.value.toLowerCase()
  return visitors.value.filter(v => v.visitor_id.toLowerCase().includes(q))
})

const totalUnread = computed(() => {
  return visitors.value.reduce((acc, curr) => acc + (curr.unread_count || 0), 0)
})

const isOnline = (isoString) => {
  if (!isoString) return false
  const safeStr = isoString.includes('Z') ? isoString : isoString.replace(' ', 'T') + 'Z'
  const diff = Date.now() - new Date(safeStr).getTime()
  return diff < 15 * 60 * 1000 // consider active if message within 15 minutes
}

const isCurrentOnline = computed(() => {
  const current = visitors.value.find(v => v.visitor_id === activeVisitorId.value)
  return current ? isOnline(current.timestamp) : false
})

const activeVisitorMeta = computed(() => {
  return visitors.value.find(v => v.visitor_id === activeVisitorId.value) || null
})

const formatTime = (isoString) => {
  if (!isoString) return ''
  const safeStr = isoString.includes('Z') ? isoString : isoString.replace(' ', 'T') + 'Z'
  const date = new Date(safeStr)
  return date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false, hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })
}

const selectVisitor = async (id) => {
  activeVisitorId.value = id
  await fetchActiveMessages()
  scrollToBottom()
  fetchVisitors() // refresh unreads count in list
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// ── Backend API Calls ──
const fetchVisitors = async () => {
  try {
    const res = await fetch('/api/chat/admin/messages', { headers: { 'Authorization': `Bearer ${token()}` } })
    if (res.ok) {
      const data = await res.json()
      // Detect new unread messages to play chime sound
      const prevTotalUnread = totalUnread.value
      visitors.value = data
      const currentTotalUnread = totalUnread.value
      if (currentTotalUnread > prevTotalUnread) {
        playNotificationSound()
      }
    }
  } catch (e) {
    console.error('Failed to fetch visitors', e)
  }
}

const fetchActiveMessages = async () => {
  if (!activeVisitorId.value) return
  try {
    const res = await fetch(`/api/chat/admin/messages?visitor_id=${activeVisitorId.value}`, { 
      headers: { 'Authorization': `Bearer ${token()}` } 
    })
    if (res.ok) {
      const data = await res.json()
      const isNewMessageAdded = data.length > activeMessages.value.length
      activeMessages.value = data
      if (isNewMessageAdded) {
        scrollToBottom()
      }
    }
  } catch (e) {
    console.error('Failed to fetch active messages', e)
  }
}

const sendReply = async () => {
  if (!replyText.value.trim() || !activeVisitorId.value || sending.value) return
  sending.value = true
  const content = replyText.value.trim()
  replyText.value = ''

  try {
    const res = await fetch('/api/chat/admin/messages', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ visitor_id: activeVisitorId.value, content })
    })
    if (res.ok) {
      fetchActiveMessages()
      fetchVisitors()
    }
  } catch (e) {
    console.error('Failed to send reply', e)
  } finally {
    sending.value = false
  }
}

// ── Page Options (Dropdown Settings) ──
const onPageSelect = (btn, event) => {
  const selectedUrl = event.target.value
  for (const group of pageOptions.value) {
    const found = group.items.find(i => i.url === selectedUrl)
    if (found) {
      if (!btn.label) btn.label = found.label
      if (!btn.label_en) btn.label_en = found.label_en
      break
    }
  }
}

const fetchPageOptions = async () => {
  try {
    const res = await fetch('/api/chat/admin/page-options', { headers: { 'Authorization': `Bearer ${token()}` } })
    if (res.ok) pageOptions.value = await res.json()
  } catch (e) { console.error(e) }
}

// ── Settings ──
const fetchSettings = async () => {
  try {
    const res = await fetch('/api/chat/admin/settings', { headers: { 'Authorization': `Bearer ${token()}` } })
    if (res.ok) {
      const d = await res.json()
      settings.value = {
        widget_enabled: Boolean(d.widget_enabled),
        auto_reply_enabled: Boolean(d.auto_reply_enabled),
        start_time: d.start_time || '22:00',
        end_time: d.end_time || '07:00',
        auto_collapse_seconds: d.auto_collapse_seconds || 10
      }
    }
  } catch (e) { console.error(e) }
}

const saveSettings = async () => {
  saving.value = true
  try {
    await fetch('/api/chat/admin/settings', { method: 'PUT', headers: headers(), body: JSON.stringify(settings.value) })
    alert('设置已保存！')
  } catch (e) { alert('保存失败') }
  finally { saving.value = false }
}

// ── Auto-Replies CRUD ──
const fetchAutoReplies = async () => {
  try {
    const res = await fetch('/api/chat/admin/auto-replies', { headers: { 'Authorization': `Bearer ${token()}` } })
    if (res.ok) autoReplies.value = (await res.json()).map(r => ({ ...r, enabled: Boolean(r.enabled) }))
  } catch (e) { console.error(e) }
}

const addReply = async () => {
  if (!newReplyContent.value.trim()) return
  await fetch('/api/chat/admin/auto-replies', { method: 'POST', headers: headers(), body: JSON.stringify({ content: newReplyContent.value, enabled: true }) })
  newReplyContent.value = ''
  fetchAutoReplies()
}

const updateReply = async (reply) => {
  await fetch(`/api/chat/admin/auto-replies/${reply.id}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ content: reply.content, enabled: reply.enabled }) })
  alert('已保存')
}

const toggleReply = async (reply) => {
  reply.enabled = !reply.enabled
  await updateReply(reply)
}

const deleteReply = async (id) => {
  if (!confirm('确定删除此话术？')) return
  await fetch(`/api/chat/admin/auto-replies/${id}`, { method: 'DELETE', headers: headers() })
  fetchAutoReplies()
}

// ── Welcome Presets CRUD ──
const fetchWelcomePresets = async () => {
  try {
    const res = await fetch('/api/chat/admin/welcome-presets', { headers: { 'Authorization': `Bearer ${token()}` } })
    if (res.ok) welcomePresets.value = (await res.json()).map(p => ({ ...p, enabled: Boolean(p.enabled), buttons: p.buttons || [] }))
  } catch (e) { console.error(e) }
}

const addPreset = async () => {
  await fetch('/api/chat/admin/welcome-presets', { method: 'POST', headers: headers(), body: JSON.stringify({ greeting: '欢迎参观我们的网站！', greeting_en: 'Welcome to our website!', buttons: [{ label: '产品中心', label_en: 'Products', url: '/products' }], enabled: true }) })
  fetchWelcomePresets()
}

const updatePreset = async (preset) => {
  await fetch(`/api/chat/admin/welcome-presets/${preset.id}`, { method: 'PUT', headers: headers(), body: JSON.stringify(preset) })
  alert('预设已保存！')
}

const togglePreset = async (preset) => {
  preset.enabled = !preset.enabled
  await updatePreset(preset)
}

const deletePreset = async (id) => {
  if (!confirm('确定删除此预设？')) return
  await fetch(`/api/chat/admin/welcome-presets/${id}`, { method: 'DELETE', headers: headers() })
  fetchWelcomePresets()
}

// ── Polling Engine ──
const runChatPolling = () => {
  fetchVisitors()
  fetchActiveMessages()
}

onMounted(() => {
  fetchSettings()
  fetchAutoReplies()
  fetchWelcomePresets()
  fetchPageOptions()
  
  // Real-time polling every 3 seconds for visitors list & current messages
  runChatPolling()
  pollInterval = setInterval(runChatPolling, 3000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<style scoped>
.chat-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.header { margin-bottom: 20px; }
.header h2 { font-size: 24px; color: #1f2937; margin-bottom: 4px; }
.header p { color: #6b7280; font-size: 14px; }

/* Tabs switcher styling */
.tabs {
  display: flex;
  gap: 12px;
  border-bottom: 2px solid #e5e7eb;
  margin-bottom: 24px;
}
.tab-btn {
  padding: 12px 24px;
  background: none;
  border: none;
  font-size: 15px;
  font-weight: 600;
  color: #4b5563;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}
.tab-btn.active {
  color: #2563eb;
}
.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -2px; left: 0; right: 0;
  height: 2px;
  background: #2563eb;
}
.unread-badge {
  background: #ef4444;
  color: white;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 10px;
  margin-left: 6px;
  font-weight: bold;
}

/* Chat Workspace (Tab 1) Layout */
.chat-workspace {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  height: calc(100vh - 200px);
  min-height: 500px;
  overflow: hidden;
}

/* Left visitor list sidebar */
.visitor-sidebar {
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}
.search-box {
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
  background: white;
}
.search-box input {
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  width: 100%;
  font-size: 13px;
  box-sizing: border-box;
}
.bulk-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  font-size: 13px;
}
.select-all {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
  cursor: pointer;
}
.btn-delete-sm {
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
}
.btn-delete-sm:hover {
  background: #dc2626;
}
.v-checkbox {
  margin-right: 8px;
  cursor: pointer;
}
.visitor-list {
  flex: 1;
  overflow-y: auto;
}
.no-visitors {
  text-align: center;
  color: #94a3b8;
  padding: 30px 10px;
  font-size: 13px;
}
.visitor-item {
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.15s;
  background: white;
}
.visitor-item:hover {
  background: #f1f5f9;
}
.visitor-item.active {
  background: #eff6ff;
  border-left: 4px solid #2563eb;
}
.visitor-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.visitor-id {
  font-weight: 600;
  color: #1e293b;
  font-size: 13.5px;
}
.status-dot {
  width: 8px; height: 8px;
  background: #cbd5e1;
  border-radius: 50%;
}
.status-dot.online {
  background: #10b981;
}
.visitor-geoip {
  font-size: 11px;
  color: #2563eb;
  background: #eff6ff;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
  margin-bottom: 4px;
  font-weight: 500;
}
.last-msg-snippet {
  font-size: 12.5px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 6px;
}
.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.meta-row .time {
  font-size: 11px;
  color: #94a3b8;
}
.meta-row .unread-count {
  background: #ef4444;
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 600;
}

/* Right Chat Area */
.chat-area {
  display: flex;
  flex-direction: column;
  background: #fff;
  min-height: 0;
  height: 100%;
}
.no-active-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
}
.placeholder-icon {
  font-size: 64px;
  margin-bottom: 12px;
}
.active-chat {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.chat-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.chat-header h3 {
  margin: 0;
  font-size: 16px;
  color: #1e293b;
  font-weight: 600;
}
.chat-header-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.chat-header-geoip {
  font-size: 12px;
  color: #64748b;
}
.status-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  background: #e2e8f0;
  color: #4b5563;
}
.status-badge.online {
  background: #d1fae5;
  color: #065f46;
}

.chat-messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.message {
  display: flex;
  flex-direction: column;
  max-width: 75%;
}
.message.admin {
  align-self: flex-end;
}
.message.visitor {
  align-self: flex-start;
}
.message-bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13.5px;
  line-height: 1.5;
  word-break: break-word;
}
.message.admin .message-bubble {
  background: #2563eb;
  color: white;
  border-bottom-right-radius: 2px;
}
.message.visitor .message-bubble {
  background: white;
  color: #1e293b;
  border-bottom-left-radius: 2px;
  border: 1px solid #e2e8f0;
}
.message-time {
  font-size: 10px;
  color: #94a3b8;
  margin-top: 4px;
}
.message.admin .message-time {
  text-align: right;
}

.chat-input {
  padding: 16px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 12px;
  align-items: flex-end;
}
.chat-input textarea {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13.5px;
  resize: none;
  outline: none;
}
.chat-input textarea:focus {
  border-color: #2563eb;
}
.send-btn {
  padding: 10px 20px;
  height: 42px;
}

/* Settings Tab Styling (Tab 2) */
.settings-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border: 1px solid #e5e7eb;
}
.card h3 {
  font-size: 16px;
  margin-bottom: 14px;
  color: #111827;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.badge {
  font-size: 11px;
  background: #dbeafe;
  color: #2563eb;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}
.desc { color: #6b7280; font-size: 13px; margin-bottom: 16px; line-height: 1.6; }
.hint { color: #9ca3af; font-size: 12px; margin-left: 4px; }
.settings-form { display: flex; flex-direction: column; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-group label { font-weight: 500; color: #374151; font-size: 13px; }
.checkbox-group label { display: flex; align-items: center; gap: 8px; cursor: pointer; flex-wrap: wrap; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
input[type="time"], input[type="number"], input[type="text"], textarea, select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-family: inherit;
  font-size: 13px;
  width: 100%;
  box-sizing: border-box;
}
input:focus, textarea:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.15); }
.disabled { opacity: 0.5; pointer-events: none; }
.form-actions { margin-top: 8px; display: flex; justify-content: flex-end; }
.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
  font-size: 13px;
}
.btn-primary { background: #3b82f6; color: white; }
.btn-primary:hover { background: #2563eb; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { background: #f3f4f6; color: #4b5563; border: 1px solid #d1d5db; }
.btn-secondary:hover { background: #e5e7eb; }
.btn-danger { background: #ef4444; color: white; }
.btn-danger:hover { background: #dc2626; }
.btn-sm { padding: 4px 10px; font-size: 12px; }

/* Auto-replies */
.reply-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 10px;
  background: #fafafa;
}
.reply-check { padding-top: 8px; }
.reply-textarea { flex: 1; resize: vertical; min-height: 44px; }
.reply-actions { display: flex; flex-direction: column; gap: 4px; }
.add-row { display: flex; gap: 10px; align-items: flex-start; margin-top: 8px; }
.add-row .reply-textarea { flex: 1; }

/* Welcome presets */
.preset-item {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 14px;
  background: #fafafa;
}
.preset-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.preset-header strong { flex: 1; }
.buttons-editor { margin-top: 12px; }
.buttons-editor > label { font-weight: 600; font-size: 13px; color: #374151; display: block; margin-bottom: 8px; }
.button-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: 8px;
  margin-bottom: 6px;
  align-items: center;
}
.url-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-family: inherit;
  font-size: 13px;
  background: white;
  cursor: pointer;
  width: 100%;
  box-sizing: border-box;
}
.url-select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.15); }
.add-preset-area { margin-top: 10px; }
</style>
