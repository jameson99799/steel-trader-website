<template>
  <div class="mobile-chat-container">
    <!-- Header -->
    <header class="chat-header">
      <button v-if="activeVisitorId" class="header-back-btn" @click="goBackToList">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        <span>列表</span>
      </button>
      <div class="header-title">
        <span v-if="activeVisitorId" class="visitor-title">
          访客 #{{ activeVisitorId.substring(0, 8) }}
          <span class="location-badge" v-if="activeVisitorMeta?.country">
            {{ activeVisitorMeta.country }}
          </span>
        </span>
        <span v-else>移动客服控制台</span>
      </div>
      <div class="header-actions">
        <button class="icon-btn" @click="fetchData" title="刷新">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="{ 'spinning': refreshing }">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
        </button>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="chat-main-body">
      <!-- 1. Visitor List View -->
      <div v-if="!activeVisitorId" class="visitor-list-view">
        <div class="search-bar-wrapper">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="搜索访客ID、地理位置或聊天内容..." 
            class="search-input"
          />
          <span v-if="searchQuery" class="clear-search" @click="searchQuery = ''">✕</span>
        </div>

        <div v-if="filteredVisitors.length === 0" class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <p>暂无符合条件的会话记录</p>
        </div>

        <div v-else class="visitor-scroll-list">
          <div 
            v-for="visitor in filteredVisitors" 
            :key="visitor.visitor_id" 
            class="visitor-item-card"
            :class="{ 'has-unread': visitor.unread_count > 0 }"
            @click="selectVisitor(visitor.visitor_id)"
          >
            <div class="card-avatar">
              <span>{{ visitor.visitor_id.substring(0, 2).toUpperCase() }}</span>
              <div v-if="visitor.unread_count > 0" class="unread-dot"></div>
            </div>
            <div class="card-details">
              <div class="details-top">
                <span class="visitor-id">访客 #{{ visitor.visitor_id.substring(0, 10) }}</span>
                <span class="message-time">{{ formatTime(visitor.timestamp) }}</span>
              </div>
              <div class="details-middle">
                <span class="visitor-meta-loc">
                  IP: {{ visitor.ip || '未知' }} | 📍 {{ visitor.country || '未知国家' }}
                </span>
                <span v-if="visitor.unread_count > 0" class="unread-badge">
                  {{ visitor.unread_count }}条新消息
                </span>
              </div>
              <div class="details-bottom">
                <p class="last-message-text">{{ visitor.content }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Active Chat View -->
      <div v-else class="active-chat-view">
        <!-- Messages Container -->
        <div ref="messagesContainer" class="messages-scroller">
          <div v-for="msg in activeMessages" :key="msg.id" class="message-bubble-wrapper" :class="msg.sender_type">
            <div class="bubble-meta">
              <span class="sender-name">{{ msg.sender_type === 'visitor' ? '访客' : '客服' }}</span>
              <span class="bubble-time">{{ formatTime(msg.timestamp) }}</span>
            </div>
            
            <div class="bubble-body-row">
              <div class="message-bubble">
                <div class="bubble-content">{{ msg.content }}</div>
                <div v-if="msg.buttons && msg.buttons.length" class="bubble-quick-buttons-preview" style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px;">
                  <span v-for="(btn, bi) in msg.buttons" :key="bi" class="bubble-quick-btn-preview-tag" style="background: rgba(0,0,0,0.05); color: inherit; font-size: 11px; padding: 2px 6px; border-radius: 4px; border: 1px dashed currentColor; opacity: 0.85;">
                    🔗 {{ btn.label || btn.label_en || '链接' }}
                  </span>
                </div>
                
                <!-- AI Translation Display -->
                <div v-if="bubbleTranslations[msg.id]" class="bubble-translation-content">
                  <div class="translation-divider"></div>
                  <div class="translated-label">AI 翻译：</div>
                  <div class="translated-text">{{ bubbleTranslations[msg.id] }}</div>
                </div>
              </div>

              <!-- Inline Translate Trigger Icon (Only for visitor bubbles) -->
              <button 
                v-if="msg.sender_type === 'visitor' && aiChannels.length"
                class="bubble-translate-icon-btn" 
                :disabled="translatingBubbleId === msg.id"
                @click="translateBubble(msg)"
                title="AI 翻译"
              >
                <span v-if="translatingBubbleId === msg.id" class="translating-spinner">⏳</span>
                <span v-else>🌐</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Chat Input Bar (Mobile Docked) -->
        <div class="input-panel-dock">
          <!-- Translation Helper Bar -->
          <div class="translation-quick-bar" v-if="aiChannels.length">
            <div class="lang-selector-group">
              <span class="toolbar-avatar">🤖</span>
              <select v-model="targetLang" class="quick-select">
                <option value="EN">English (EN)</option>
                <option value="ZH">简体中文 (ZH)</option>
                <option value="TR">Türkçe (TR)</option>
                <option value="ES">Español (ES)</option>
                <option value="RU">Русский (RU)</option>
                <option value="FR">Français (FR)</option>
                <option value="DE">Deutsch (DE)</option>
                <option value="PT">Português (PT)</option>
                <option value="AR">العربية (AR)</option>
                <option value="JA">日本語 (JA)</option>
                <option value="KO">한국어 (KO)</option>
              </select>
              <button 
                class="settings-gear-btn" 
                :class="{ active: showTranslationConfig }"
                @click="showTranslationConfig = !showTranslationConfig"
                title="AI 渠道和模型设置"
              >
                ⚙️
              </button>
            </div>
            <button 
              class="quick-action-btn translate-input-btn"
              :disabled="translatingInput || !replyText.trim()"
              @click="translateInput"
            >
              <span>{{ translatingInput ? '正在翻译...' : '翻译并替换' }}</span>
            </button>
          </div>

          <!-- Collapsible AI settings -->
          <div v-if="showTranslationConfig && aiChannels.length" class="ai-config-collapse-panel">
            <div class="config-row">
              <span class="config-label">AI 渠道:</span>
              <select v-model="selectedChannelId" class="config-select" @change="onChannelChange">
                <option v-for="ch in aiChannels" :key="ch.id" :value="ch.id">{{ ch.name }}</option>
              </select>
            </div>
            <div class="config-row">
              <span class="config-label">AI 模型:</span>
              <select v-model="selectedModel" class="config-select">
                <option v-for="m in currentChannelModels" :key="m" :value="m">{{ m }}</option>
              </select>
            </div>
          </div>

          <!-- Typing & Sending Row -->
          <div class="typing-action-row">
            <textarea 
              ref="textareaRef"
              v-model="replyText" 
              placeholder="请输入回复消息..." 
              class="typing-textarea"
              rows="1"
              @keydown.enter.exact.prevent="sendReply"
            ></textarea>
            <button 
              class="send-message-btn" 
              :disabled="!replyText.trim() || sending"
              @click="sendReply"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// Authentication helper
const token = () => localStorage.getItem('token')
const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token()}`
})

// UI & Loading States
const refreshing = ref(false)
const searchQuery = ref('')
const replyText = ref('')
const sending = ref(false)
const messagesContainer = ref(null)
const textareaRef = ref(null)

// Core states
const visitors = ref([])
const activeVisitorId = ref('')
const activeMessages = ref([])

// AI Translation States
const aiChannels = ref([])
const selectedChannelId = ref(null)
const selectedModel = ref('')
const targetLang = ref(localStorage.getItem('chat_target_lang') || 'EN')
const systemPrompt = ref(localStorage.getItem('chat_system_prompt') || '你是一个专业的外贸业务助手和翻译官。请把下面的文字翻译成目标语言，要求表达自然、流畅、得体。不要返回任何多余的解释、前言或标点引导，只需要输出翻译后的纯文本内容。')
const showTranslationConfig = ref(localStorage.getItem('chat_show_translation_config') === 'true')
const translatingInput = ref(false)
const translatingBubbleId = ref(null)
const bubbleTranslations = ref({})
const lastInputTranslation = ref({
  originalText: '',
  translatedText: '',
  timestamp: 0
})

// Auto height for input area
const adjustTextareaHeight = () => {
  nextTick(() => {
    const ta = textareaRef.value
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = ta.scrollHeight + 'px'
  })
}

watch(replyText, adjustTextareaHeight)

// Watch AI settings to keep in localStorage
watch(showTranslationConfig, (newVal) => localStorage.setItem('chat_show_translation_config', String(newVal)))
watch(targetLang, (newVal) => localStorage.setItem('chat_target_lang', newVal))
watch(selectedChannelId, (newVal) => {
  if (newVal) localStorage.setItem('chat_selected_channel_id', newVal)
})
watch(selectedModel, (newVal) => {
  if (newVal) localStorage.setItem('chat_selected_model', newVal)
})

const currentChannelModels = computed(() => {
  const ch = aiChannels.value.find(c => c.id === selectedChannelId.value)
  return ch?.models || []
})

const onChannelChange = () => {
  const ch = aiChannels.value.find(c => c.id === selectedChannelId.value)
  if (ch) {
    selectedModel.value = ch.default_model || ch.models[0] || ''
  }
}

// Timer for polling messages
let pollTimer = null

// Filtered visitors
const filteredVisitors = computed(() => {
  if (!searchQuery.value.trim()) return visitors.value
  const q = searchQuery.value.toLowerCase()
  return visitors.value.filter(v => 
    v.visitor_id.toLowerCase().includes(q) || 
    (v.country && v.country.toLowerCase().includes(q)) ||
    (v.ip && v.ip.toLowerCase().includes(q)) ||
    (v.content && v.content.toLowerCase().includes(q))
  )
})

const activeVisitorMeta = computed(() => {
  return visitors.value.find(v => v.visitor_id === activeVisitorId.value) || null
})

// Formatting functions
const formatTime = (timeStr) => {
  if (!timeStr) return ''
  // Handle timestamp
  const safeStr = timeStr.includes('Z') ? timeStr : timeStr.replace(' ', 'T') + 'Z'
  const date = new Date(safeStr)
  return date.toLocaleString('zh-CN', { 
    timeZone: 'Asia/Shanghai', 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    month: 'short', 
    day: 'numeric' 
  })
}

// Navigation & Actions
const goBackToList = () => {
  activeVisitorId.value = ''
  activeMessages.value = []
  bubbleTranslations.value = {}
  router.replace({ path: '/admin/mobile-chat', query: {} })
  fetchVisitors()
}

const selectVisitor = async (id) => {
  activeVisitorId.value = id
  router.replace({ path: '/admin/mobile-chat', query: { visitor_id: id } })
  await fetchActiveMessages()
  scrollToBottom()
  fetchVisitors() // Refresh visitor list for unread statuses
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Fetch visitors
const fetchVisitors = async () => {
  try {
    const res = await fetch('/api/chat/admin/messages', { headers: headers() })
    if (res.ok) {
      visitors.value = await res.json()
    }
  } catch (e) {
    console.error('Failed to fetch visitors', e)
  }
}

// Fetch messages for active visitor
const fetchActiveMessages = async () => {
  if (!activeVisitorId.value) return
  try {
    const res = await fetch(`/api/chat/admin/messages?visitor_id=${activeVisitorId.value}`, { 
      headers: headers() 
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

// Global data refresh
const fetchData = async () => {
  refreshing.value = true
  if (activeVisitorId.value) {
    await fetchActiveMessages()
  }
  await fetchVisitors()
  refreshing.value = false
}

// Send reply
const sendReply = async () => {
  if (!replyText.value.trim() || !activeVisitorId.value || sending.value) return
  sending.value = true
  const content = replyText.value.trim()
  replyText.value = ''
  adjustTextareaHeight()

  try {
    const res = await fetch('/api/chat/admin/messages', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ visitor_id: activeVisitorId.value, content })
    })
    if (res.ok) {
      await fetchActiveMessages()
      fetchVisitors()
    }
  } catch (e) {
    console.error('Failed to send reply', e)
  } finally {
    sending.value = false
  }
}

// AI translations
const fetchAiSettings = async () => {
  try {
    const res = await fetch('/api/ai/channels', { headers: headers() })
    if (res.ok) {
      aiChannels.value = await res.json()
      if (aiChannels.value.length) {
        const savedChannelId = localStorage.getItem('chat_selected_channel_id')
        let matched = aiChannels.value.find(c => String(c.id) === String(savedChannelId))
        if (!matched) {
          matched = aiChannels.value.find(c => c.is_default) || aiChannels.value[0]
        }
        selectedChannelId.value = matched.id
        
        const savedModel = localStorage.getItem('chat_selected_model')
        if (savedModel && matched.models.includes(savedModel)) {
          selectedModel.value = savedModel
        } else {
          selectedModel.value = matched.default_model || matched.models[0] || ''
        }
      }
    }
  } catch (e) {
    console.error('Failed to fetch AI channels', e)
  }
}

const translateText = async (text, targetLanguage) => {
  if (!selectedChannelId.value || !selectedModel.value) {
    alert('请配置有效的 AI 渠道和模型')
    return null
  }
  
  const payload = {
    channel_id: selectedChannelId.value,
    model: selectedModel.value,
    messages: [
      { role: 'system', content: systemPrompt.value },
      { role: 'user', content: `Target Language: ${targetLanguage}\n\nText to translate:\n${text}` }
    ],
    temperature: 0.3
  }
  
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || `HTTP ${response.status}`)
    }
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let resultText = ''
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') continue
        try {
          const json = JSON.parse(data)
          const delta = json.choices?.[0]?.delta?.content
          if (delta) { 
            resultText += delta
          }
        } catch {}
      }
    }
    return resultText.trim()
  } catch (e) {
    console.error('Translation call failed', e)
    alert('翻译出错: ' + e.message)
    return null
  }
}

const translateInput = async () => {
  const currentText = replyText.value.trim()
  if (!currentText || translatingInput.value) return
  
  translatingInput.value = true
  const duration = 5000
  
  let textToTranslate = currentText
  if (
    lastInputTranslation.value.originalText &&
    Date.now() - lastInputTranslation.value.timestamp <= duration &&
    currentText === lastInputTranslation.value.translatedText
  ) {
    textToTranslate = lastInputTranslation.value.originalText
  }
  
  const result = await translateText(textToTranslate, targetLang.value)
  if (result) {
    lastInputTranslation.value = {
      originalText: textToTranslate,
      translatedText: result,
      timestamp: Date.now()
    }
    replyText.value = result
  }
  translatingInput.value = false
}

const detectLanguage = (text) => {
  const chinesePattern = /[\u4e00-\u9fff]/;
  if (chinesePattern.test(text)) return 'ZH';
  return 'OTHER';
}

const translateBubble = async (msg) => {
  if (translatingBubbleId.value) return
  translatingBubbleId.value = msg.id
  
  const sourceLang = detectLanguage(msg.content)
  const langToUse = sourceLang === 'ZH' ? targetLang.value : 'ZH'
  
  bubbleTranslations.value[msg.id] = '正在翻译...'
  
  const result = await translateText(msg.content, langToUse)
  if (result) {
    bubbleTranslations.value[msg.id] = result
  } else {
    delete bubbleTranslations.value[msg.id]
  }
  translatingBubbleId.value = null
}

// Lifecycle Hooks & Polling
onMounted(async () => {
  await fetchVisitors()
  await fetchAiSettings()
  
  // Auto load active chat room if visitor_id query param exists
  const visitorIdParam = route.query.visitor_id
  if (visitorIdParam) {
    activeVisitorId.value = visitorIdParam
    await fetchActiveMessages()
    scrollToBottom()
  }

  // Poll for new messages every 3 seconds
  pollTimer = setInterval(async () => {
    await fetchVisitors()
    if (activeVisitorId.value) {
      await fetchActiveMessages()
    }
  }, 3000)
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
  }
})
</script>

<style scoped>
/* Reset and General Layout */
.mobile-chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background-color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #1e293b;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 99999;
}

/* Header Styles */
.chat-header {
  height: 56px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.header-back-btn {
  display: flex;
  align-items: center;
  background: none;
  border: none;
  color: #2563eb;
  font-size: 16px;
  font-weight: 500;
  padding: 0;
  cursor: pointer;
  margin-right: 8px;
}

.header-back-btn svg {
  margin-right: 2px;
}

.header-title {
  font-size: 17px;
  font-weight: 600;
  color: #0f172a;
  flex: 1;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.visitor-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.location-badge {
  background: #eff6ff;
  color: #2563eb;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 99px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  align-items: center;
}

.icon-btn {
  background: none;
  border: none;
  color: #64748b;
  padding: 8px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.icon-btn:active {
  background-color: #f1f5f9;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Main Body Layout */
.chat-main-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 1. Visitor List Styles */
.visitor-list-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-bar-wrapper {
  padding: 10px 16px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 8px 32px 8px 12px;
  background-color: #f1f5f9;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
}

.search-input:focus {
  background-color: #ffffff;
  border-color: #cbd5e1;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
}

.clear-search {
  position: absolute;
  right: 26px;
  color: #94a3b8;
  cursor: pointer;
  font-size: 14px;
}

.visitor-scroll-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  -webkit-overflow-scrolling: touch;
}

.visitor-item-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 12px;
  display: flex;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.visitor-item-card:active {
  transform: scale(0.98);
  background-color: #f8fafc;
}

.visitor-item-card.has-unread {
  border-color: #bfdbfe;
  background-color: #f0f7ff;
}

.card-avatar {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: #ffffff;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 15px;
  position: relative;
  flex-shrink: 0;
}

.unread-dot {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 10px;
  height: 10px;
  background-color: #ef4444;
  border: 2px solid #ffffff;
  border-radius: 50%;
}

.card-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.details-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.visitor-id {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}

.message-time {
  font-size: 12px;
  color: #94a3b8;
}

.details-middle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.visitor-meta-loc {
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.unread-badge {
  background-color: #ef4444;
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 99px;
  flex-shrink: 0;
}

.details-bottom {
  margin-top: 2px;
}

.last-message-text {
  font-size: 13px;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  gap: 12px;
}

/* 2. Active Chat View Styles */
.active-chat-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.messages-scroller {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background-color: #f1f5f9;
  -webkit-overflow-scrolling: touch;
}

.message-bubble-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.bubble-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 11px;
  color: #94a3b8;
}

.message-bubble-wrapper.admin .bubble-meta {
  justify-content: flex-end;
}

.bubble-body-row {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
}

.message-bubble-wrapper.visitor .bubble-body-row {
  justify-content: flex-start;
}

.message-bubble-wrapper.admin .bubble-body-row {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  word-break: break-word;
}

.message-bubble-wrapper.visitor .message-bubble {
  background-color: #ffffff;
  color: #0f172a;
  border-bottom-left-radius: 4px;
}

.message-bubble-wrapper.admin .message-bubble {
  background-color: #2563eb;
  color: #ffffff;
  border-bottom-right-radius: 4px;
}

/* Inline Translate Button Styles */
.bubble-translate-icon-btn {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}

.bubble-translate-icon-btn:active {
  background-color: #f1f5f9;
  transform: scale(0.9);
}

.translating-spinner {
  display: inline-block;
  animation: pulse 1s infinite alternate;
}

@keyframes pulse {
  from { opacity: 0.5; }
  to { opacity: 1; }
}

/* Translated Text Styles */
.bubble-translation-content {
  margin-top: 8px;
  padding-top: 8px;
}

.translation-divider {
  border-top: 1px dashed rgba(0, 0, 0, 0.1);
  margin-bottom: 8px;
}

.message-bubble-wrapper.admin .translation-divider {
  border-top-color: rgba(255, 255, 255, 0.2);
}

.translated-label {
  font-size: 11px;
  font-weight: 600;
  color: #8b5cf6;
  margin-bottom: 2px;
}

.message-bubble-wrapper.admin .translated-label {
  color: #d8b4fe;
}

.translated-text {
  font-style: italic;
  color: #4c1d95;
}

.message-bubble-wrapper.admin .translated-text {
  color: #fae8ff;
}

/* Chat Input Bar (Mobile Docked) */
.input-panel-dock {
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 12px;
  flex-shrink: 0;
}

.translation-quick-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 6px;
}

.lang-selector-group {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
}

.toolbar-avatar {
  font-size: 14px;
}

.quick-select {
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background-color: #ffffff;
  padding: 2px 6px;
  font-size: 11px;
  outline: none;
  font-weight: 500;
}

.settings-gear-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  font-size: 13px;
  transition: all 0.2s;
}

.settings-gear-btn:active {
  background-color: #f1f5f9;
}

.settings-gear-btn.active {
  background-color: #eff6ff;
  border-radius: 4px;
}

.quick-action-btn {
  background-color: #f1f5f9;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  color: #475569;
  font-size: 11px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.quick-action-btn:active {
  background-color: #e2e8f0;
}

.quick-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.translate-input-btn {
  background-color: #eff6ff;
  color: #2563eb;
}

/* Collapsible AI settings panel */
.ai-config-collapse-panel {
  background-color: #f8fafc;
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px dashed #cbd5e1;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.config-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.config-label {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
}

.config-select {
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background-color: #ffffff;
  padding: 2px 6px;
  font-size: 11px;
  outline: none;
  width: 70%;
}

.typing-action-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.typing-textarea {
  flex: 1;
  background-color: #f1f5f9;
  border: 1px solid transparent;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 14px;
  outline: none;
  resize: none;
  max-height: 100px;
  min-height: 36px;
  line-height: 20px;
  box-sizing: border-box;
}

.typing-textarea:focus {
  background-color: #ffffff;
  border-color: #cbd5e1;
}

.send-message-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #2563eb;
  color: #ffffff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 0.2s;
}

.send-message-btn:disabled {
  background-color: #cbd5e1;
  cursor: not-allowed;
}

.send-message-btn:active:not(:disabled) {
  background-color: #1d4ed8;
}
</style>
