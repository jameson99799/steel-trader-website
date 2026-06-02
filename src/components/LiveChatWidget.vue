<template>
  <div class="live-chat-wrapper">
    <!-- Chat Button -->
    <button v-if="!isOpen" class="chat-toggle" @click="toggleChat">
      <div class="chat-icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <h3>SunSea Steel Support</h3>
            <span class="status-dot"></span> Online
          </div>
          <button class="close-btn" @click="toggleChat">&times;</button>
        </div>
        
        <div class="chat-messages" ref="messagesContainer">
          <div v-for="msg in messages" :key="msg.id" :class="['message', msg.sender_type]">
            <div class="message-bubble">{{ msg.content }}</div>
            <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
          </div>
        </div>

        <div class="chat-input-area">
          <textarea 
            v-model="newMessage" 
            @keyup.enter.prevent="sendMessage"
            placeholder="Type your message here..."
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
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { v4 as uuidv4 } from 'uuid'

const isOpen = ref(false)
const messages = ref([])
const newMessage = ref('')
const unreadCount = ref(0)
const messagesContainer = ref(null)
let visitorId = ''
let pollInterval = null

const toggleChat = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    unreadCount.value = 0
    scrollToBottom()
  }
}

const formatTime = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const sendMessage = async () => {
  if (!newMessage.value.trim()) return
  
  const text = newMessage.value.trim()
  newMessage.value = ''
  
  // Optimistically add to UI
  messages.value.push({
    id: Date.now(),
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
      body: JSON.stringify({ visitor_id: visitorId, content: text })
    })
    // The poll will pick up the real DB id and any instant auto-replies
    pollMessages()
  } catch (e) {
    console.error('Failed to send message', e)
  }
}

const pollMessages = async () => {
  if (!visitorId) return
  
  const lastId = messages.value.length > 0 ? Math.max(...messages.value.map(m => m.id)) : 0
  
  try {
    const res = await fetch(`/api/chat/poll?visitor_id=${visitorId}&last_id=${lastId}`)
    if (res.ok) {
      const newMsgs = await res.json()
      if (newMsgs.length > 0) {
        // Only append new messages
        const incomingIds = newMsgs.map(m => m.id)
        messages.value = messages.value.filter(m => !incomingIds.includes(m.id)) // Remove optimistic msgs if they matched an ID by chance (unlikely)
        
        let hasAdminReply = false
        for (const msg of newMsgs) {
          messages.value.push(msg)
          if (msg.sender_type === 'admin') hasAdminReply = true
        }
        
        if (hasAdminReply && !isOpen.value) {
          unreadCount.value += newMsgs.filter(m => m.sender_type === 'admin').length
        }
        
        if (isOpen.value) {
          scrollToBottom()
        }
      }
    }
  } catch (e) {
    console.error('Polling chat failed', e)
  }
}

onMounted(() => {
  // Only initialize on client-side
  if (typeof window !== 'undefined') {
    visitorId = localStorage.getItem('chat_visitor_id')
    if (!visitorId) {
      visitorId = uuidv4()
      localStorage.setItem('chat_visitor_id', visitorId)
    }
    
    // Initial fetch
    pollMessages()
    
    // Poll every 3 seconds
    pollInterval = setInterval(pollMessages, 3000)
  }
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
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
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: transform 0.2s;
}

.chat-toggle:hover {
  transform: scale(1.05);
}

.chat-icon svg {
  width: 32px;
  height: 32px;
}

.unread-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ef4444;
  color: white;
  font-size: 12px;
  font-weight: bold;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
}

.chat-window {
  position: absolute;
  bottom: 80px;
  right: 0;
  width: 350px;
  height: 500px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@media (max-width: 480px) {
  .chat-window {
    position: fixed;
    bottom: 0;
    right: 0;
    width: 100vw;
    height: 100vh;
    border-radius: 0;
  }
}

.chat-header {
  background: #2563eb;
  color: white;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-info h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  margin-right: 4px;
}

.header-info {
  font-size: 12px;
  color: #dbeafe;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.chat-messages {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #f9fafb;
}

.message {
  display: flex;
  flex-direction: column;
  max-width: 80%;
}

.message.visitor {
  align-self: flex-end;
}

.message.admin {
  align-self: flex-start;
}

.message-bubble {
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.4;
  word-break: break-word;
}

.message.visitor .message-bubble {
  background: #2563eb;
  color: white;
  border-bottom-right-radius: 4px;
}

.message.admin .message-bubble {
  background: #e5e7eb;
  color: #1f2937;
  border-bottom-left-radius: 4px;
}

.message-time {
  font-size: 10px;
  color: #9ca3af;
  margin-top: 4px;
}

.message.visitor .message-time {
  text-align: right;
}

.chat-input-area {
  padding: 16px;
  background: white;
  border-top: 1px solid #e5e7eb;
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.chat-input-area textarea {
  flex: 1;
  border: 1px solid #d1d5db;
  border-radius: 20px;
  padding: 10px 16px;
  font-family: inherit;
  font-size: 14px;
  resize: none;
  outline: none;
  max-height: 80px;
  transition: border-color 0.2s;
}

.chat-input-area textarea:focus {
  border-color: #2563eb;
}

.chat-input-area button {
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.chat-input-area button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.chat-input-area button svg {
  width: 20px;
  height: 20px;
  transform: rotate(-45deg);
  margin-left: 2px;
  margin-top: -2px;
}

/* Transition */
.chat-slide-enter-active,
.chat-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.chat-slide-enter-from,
.chat-slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
</style>
