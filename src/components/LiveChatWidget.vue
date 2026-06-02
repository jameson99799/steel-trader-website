<template>
  <div v-if="widgetEnabled" class="live-chat-wrapper">
    <!-- Floating Button -->
    <button class="chat-toggle" :class="{ 'has-logo': !!logoUrl }" @click="toggleChat">
      <div class="chat-icon">
        <img v-if="logoUrl" :src="logoUrl" alt="Logo" class="chat-logo-img" />
        <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
    </button>

    <!-- Chat Window -->
    <transition name="chat-slide">
      <div v-if="isOpen" class="chat-window">
        <div class="chat-header">
          <div class="header-info">
            <h3>{{ uiTexts.chatTitle }}</h3>
            <span class="status-dot"></span> {{ uiTexts.chatOnline }}
          </div>
          <button class="close-btn" @click="closeChat">&times;</button>
        </div>

        <div class="chat-messages" ref="messagesContainer">
          <!-- Welcome preset (first message) -->
          <div v-if="welcomePreset" class="message admin welcome-msg">
            <div class="message-bubble">
              {{ getWelcomeGreeting() }}
            </div>
            <div v-if="welcomePreset.buttons && welcomePreset.buttons.length" class="quick-buttons">
              <a v-for="(btn, bi) in welcomePreset.buttons" :key="bi"
                 :href="getButtonUrl(btn)"
                 class="quick-btn"
                 @click.prevent="handleButtonClick(btn)">
                {{ getButtonLabel(btn) }}
              </a>
            </div>
          </div>

          <!-- Regular messages -->
          <div v-for="msg in messages" :key="msg.id" :class="['message', msg.sender_type]">
            <div class="message-bubble">{{ msg.content }}</div>
            <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
          </div>
        </div>

        <div class="chat-input-area">
          <textarea
            ref="textareaRef"
            v-model="newMessage"
            @keydown.enter.exact.prevent="sendMessage"
            @input="adjustTextareaHeight"
            :placeholder="uiTexts.chatPlaceholder"
            rows="1"
          ></textarea>
          <button @click="sendMessage" :disabled="!newMessage.trim()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const widgetEnabled = ref(false)
const isOpen = ref(false)
const messages = ref([])
const newMessage = ref('')
const unreadCount = ref(0)
const messagesContainer = ref(null)
const welcomePreset = ref(null)
const autoCollapseSeconds = ref(10)
const lang = ref('en')
const logoUrl = ref('')
const textareaRef = ref(null)

const localizedUiTexts = {
  zh: {
    chatTitle: '客服支持',
    chatOnline: '在线',
    chatOffline: '离线',
    chatPlaceholder: '请输入消息...',
    chatSend: '发送'
  },
  en: {
    chatTitle: 'SunSea Steel Support',
    chatOnline: 'Online',
    chatOffline: 'Offline',
    chatPlaceholder: 'Type your message...',
    chatSend: 'Send'
  },
  ru: {
    chatTitle: 'Служба поддержки',
    chatOnline: 'В сети',
    chatOffline: 'Вне сети',
    chatPlaceholder: 'Введите сообщение...',
    chatSend: 'Отправить'
  },
  es: {
    chatTitle: 'Soporte Técnico',
    chatOnline: 'En línea',
    chatOffline: 'Desconectado',
    chatPlaceholder: 'Escribe tu mensaje...',
    chatSend: 'Enviar'
  },
  fr: {
    chatTitle: 'Support Client',
    chatOnline: 'En ligne',
    chatOffline: 'Hors ligne',
    chatPlaceholder: 'Tapez votre message...',
    chatSend: 'Envoyer'
  },
  de: {
    chatTitle: 'Kundenservice',
    chatOnline: 'Online',
    chatOffline: 'Offline',
    chatPlaceholder: 'Schreiben Sie eine Nachricht...',
    chatSend: 'Senden'
  },
  pt: {
    chatTitle: 'Suporte ao Cliente',
    chatOnline: 'Online',
    chatOffline: 'Offline',
    chatPlaceholder: 'Digite sua mensagem...',
    chatSend: 'Enviar'
  },
  ar: {
    chatTitle: 'الدعم الفني',
    chatOnline: 'متصل',
    chatOffline: 'غير متصل',
    chatPlaceholder: 'اكتب رسالتك...',
    chatSend: 'إرسال'
  },
  hi: {
    chatTitle: 'ग्राहक सहायता',
    chatOnline: 'ऑनलाइन',
    chatOffline: 'ऑफ़라인',
    chatPlaceholder: 'अपना संदेश लिखें...',
    chatSend: 'भेजें'
  },
  ja: {
    chatTitle: 'カスタマーサポート',
    chatOnline: 'オンライン',
    chatOffline: 'オフ라인',
    chatPlaceholder: 'メッセージを入力してください...',
    chatSend: '送信'
  },
  ko: {
    chatTitle: '고객 지원',
    chatOnline: '온라인',
    chatOffline: '오프라인',
    chatPlaceholder: '메시지를 입력하세요...',
    chatSend: '전송'
  }
}

const uiTexts = computed(() => {
  const currentLang = lang.value || 'en'
  return localizedUiTexts[currentLang] || localizedUiTexts.en
})

let visitorId = ''
let pollInterval = null
let collapseTimer = null
let hasInteracted = false

// Detect language from URL
const detectLang = () => {
  const path = route?.path || window.location.pathname
  const match = path.match(/^\/(zh|en|ru|es|fr|de|pt|ar|hi|ja|ko)\//)
  lang.value = match ? match[1] : 'en'
}

watch(() => route?.path, detectLang)

const isExternalOrProtocol = (url) => {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:') || url.startsWith('tel:')
}

const getButtonUrl = (btn) => {
  const url = btn.url || '/'
  if (isExternalOrProtocol(url)) {
    return url
  }
  return lang.value && lang.value !== 'en' ? `/${lang.value}${url}` : url
}

const handleButtonClick = (btn) => {
  const url = btn.url || '/'
  if (url.startsWith('mailto:') || url.startsWith('tel:')) {
    window.location.href = url
  } else if (url.startsWith('http://') || url.startsWith('https://')) {
    window.open(url, '_blank')
  } else {
    const fullUrl = lang.value && lang.value !== 'en' ? `/${lang.value}${url}` : url
    router.push(fullUrl)
    closeChat()
  }
}

const toggleChat = () => {
  if (isOpen.value) {
    closeChat()
  } else {
    openChat()
  }
}

const openChat = () => {
  isOpen.value = true
  hasInteracted = true
  unreadCount.value = 0
  if (collapseTimer) { clearTimeout(collapseTimer); collapseTimer = null }
  scrollToBottom()
}

const closeChat = () => {
  isOpen.value = false
  hasInteracted = true
  if (collapseTimer) { clearTimeout(collapseTimer); collapseTimer = null }
}

const formatTime = (isoString) => {
  if (!isoString) return ''
  const safeStr = isoString.includes('Z') ? isoString : isoString.replace(' ', 'T') + 'Z'
  const date = new Date(safeStr)
  return date.toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false, hour: '2-digit', minute: '2-digit' })
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const adjustTextareaHeight = () => {
  nextTick(() => {
    const ta = textareaRef.value
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = ta.scrollHeight + 'px'
  })
}

watch(newMessage, () => {
  adjustTextareaHeight()
})

const sendMessage = async () => {
  if (!newMessage.value.trim()) return
  const text = newMessage.value.trim()
  newMessage.value = ''
  adjustTextareaHeight()
  hasInteracted = true

  messages.value.push({
    id: 'local-' + Date.now(),
    visitor_id: visitorId,
    sender_type: 'visitor',
    content: text,
    timestamp: new Date().toISOString()
  })
  scrollToBottom()

  try {
    await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor_id: visitorId, content: text, lang: lang.value })
    })
    pollMessages()
  } catch (e) {
    console.error('Failed to send message', e)
  }
}

const pollMessages = async () => {
  if (!visitorId) return
  
  // Only calculate max ID from real database IDs (numbers), ignore 'local-xxx' strings
  const realIds = messages.value.map(m => parseInt(m.id)).filter(id => !isNaN(id))
  const lastId = realIds.length > 0 ? Math.max(...realIds) : 0

  try {
    const res = await fetch('/api/chat/poll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor_id: visitorId, last_id: lastId })
    })
    if (res.ok) {
      const newMsgs = await res.json()
      if (newMsgs.length > 0) {
        const incomingIds = newMsgs.map(m => m.id)
        
        // Remove optimistic local messages and old duplicates
        messages.value = messages.value.filter(m => !incomingIds.includes(m.id) && !String(m.id).startsWith('local-'))

        let hasAdminReply = false
        for (const msg of newMsgs) {
          messages.value.push(msg)
          if (msg.sender_type === 'admin') hasAdminReply = true
        }

        if (hasAdminReply && !isOpen.value) {
          unreadCount.value += newMsgs.filter(m => m.sender_type === 'admin').length
        }

        if (isOpen.value) scrollToBottom()
      }
    }
  } catch (e) {
    console.error('Polling chat failed', e)
  }
}

const getWelcomeGreeting = () => {
  if (!welcomePreset.value) return ''
  const currentLang = lang.value || 'en'
  if (currentLang === 'zh') {
    return welcomePreset.value.greeting
  }
  return welcomePreset.value[`greeting_${currentLang}`] || welcomePreset.value.greeting_en || welcomePreset.value.greeting
}

const getButtonLabel = (btn) => {
  if (!btn) return ''
  const currentLang = lang.value || 'en'
  if (currentLang === 'zh') {
    return btn.label
  }
  return btn[`label_${currentLang}`] || btn.label_en || btn.label
}

const generateId = () => {
  return 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8)
}

const fetchWidgetConfig = async () => {
  try {
    const res = await fetch(`/api/chat/widget-config?lang=${lang.value}`)
    if (res.ok) {
      const config = await res.json()
      widgetEnabled.value = config.enabled
      if (!config.enabled) return

      autoCollapseSeconds.value = config.auto_collapse_seconds || 10
      logoUrl.value = config.company_logo || ''
      if (config.welcome_preset) {
        welcomePreset.value = config.welcome_preset
      }

      // Auto-popup on every page entry
      setTimeout(() => {
        if (!hasInteracted) {
          isOpen.value = true
          // Auto-collapse after X seconds
          collapseTimer = setTimeout(() => {
            if (!hasInteracted) {
              isOpen.value = false
            }
          }, autoCollapseSeconds.value * 1000)
        }
      }, 1500) // Small delay before showing popup
    }
  } catch (e) {
    console.error('Failed to fetch widget config', e)
  }
}

watch(lang, () => {
  fetchWidgetConfig()
})

onMounted(() => {
  if (typeof window === 'undefined') return
  detectLang()

  visitorId = localStorage.getItem('chat_visitor_id')
  if (!visitorId) {
    visitorId = generateId()
    localStorage.setItem('chat_visitor_id', visitorId)
  }

  fetchWidgetConfig()
  pollMessages()
  pollInterval = setInterval(pollMessages, 3000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  if (collapseTimer) clearTimeout(collapseTimer)
})
</script>

<style scoped>
.live-chat-wrapper {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.chat-toggle {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: white;
  border: none;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.35);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;
  animation: pulse-ring 2s ease-out infinite;
}

.chat-toggle.has-logo {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  padding: 4px;
}

.chat-toggle.has-logo .chat-icon {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-toggle.has-logo .chat-logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 50%;
}

@keyframes pulse-ring {
  0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
  70% { box-shadow: 0 0 0 12px rgba(37, 99, 235, 0); }
  100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
}

.chat-toggle:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
}

.chat-icon svg { width: 30px; height: 30px; }

.unread-badge {
  position: absolute;
  top: -4px; right: -4px;
  background: #ef4444;
  color: white;
  font-size: 11px;
  font-weight: 700;
  border-radius: 50%;
  width: 22px; height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
}

.chat-window {
  position: absolute;
  bottom: 76px;
  right: 0;
  width: 360px;
  height: 520px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@media (max-width: 480px) {
  .chat-window {
    position: fixed;
    bottom: 0; right: 0;
    width: 100vw; height: 100vh;
    border-radius: 0;
  }
}

.chat-header {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: white;
  padding: 16px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-info h3 { margin: 0 0 3px; font-size: 15px; font-weight: 600; }
.status-dot {
  display: inline-block;
  width: 8px; height: 8px;
  background: #34d399;
  border-radius: 50%;
  margin-right: 4px;
  animation: blink 2s infinite;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.header-info { font-size: 12px; color: #dbeafe; }
.close-btn {
  background: none; border: none; color: white;
  font-size: 26px; cursor: pointer; padding: 0; line-height: 1;
  opacity: 0.8; transition: opacity 0.2s;
}
.close-btn:hover { opacity: 1; }

.chat-messages {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #f8fafc;
}

.message { display: flex; flex-direction: column; max-width: 85%; }
.message.visitor { align-self: flex-end; }
.message.admin { align-self: flex-start; }

.message-bubble {
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 13.5px;
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
}

.message.visitor .message-bubble {
  background: linear-gradient(135deg, #2563eb, #3b82f6);
  color: white;
  border-bottom-right-radius: 4px;
}

.message.admin .message-bubble {
  background: #e5e7eb;
  color: #1f2937;
  border-bottom-left-radius: 4px;
}

.message-time { font-size: 10px; color: #9ca3af; margin-top: 3px; }
.message.visitor .message-time { text-align: right; }

/* Quick buttons in welcome message */
.quick-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.quick-btn {
  padding: 6px 14px;
  background: white;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  border-radius: 20px;
  font-size: 12.5px;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.15s;
  font-weight: 500;
}

.quick-btn:hover {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
}

.chat-input-area {
  padding: 14px 16px;
  background: white;
  border-top: 1px solid #e5e7eb;
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.chat-input-area textarea {
  flex: 1;
  border: 1px solid #d1d5db;
  border-radius: 20px;
  padding: 9px 16px;
  font-family: inherit;
  font-size: 13.5px;
  resize: none;
  outline: none;
  max-height: 120px;
  transition: border-color 0.2s;
  overflow-y: auto;
}

.chat-input-area textarea:focus { border-color: #2563eb; }

.chat-input-area button {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: white;
  border: none;
  border-radius: 50%;
  width: 38px; height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.15s;
}
.chat-input-area button:hover { transform: scale(1.05); }
.chat-input-area button:disabled { background: #9ca3af; cursor: not-allowed; transform: none; }
.chat-input-area button svg {
  width: 18px; height: 18px;
  transform: rotate(-45deg);
  margin-left: 2px; margin-top: -1px;
}

/* Transition */
.chat-slide-enter-active, .chat-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.chat-slide-enter-from, .chat-slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
</style>
