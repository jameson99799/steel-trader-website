<template>
  <div class="product-ai-page">
    <!-- Top bar -->
    <div class="ai-topbar">
      <div class="ai-topbar-left">
        <button class="btn btn-sm btn-secondary" @click="$router.push('/admin/products')">← 返回产品列表</button>
        <h2 v-if="product">🤖 AI 生成：{{ product.name_en || product.name }}</h2>
      </div>
      <div class="ai-topbar-right">
        <select v-model="channelId" class="form-control form-control-sm" @change="onChannelChange">
          <option v-for="ch in channels" :key="ch.id" :value="ch.id">{{ ch.name }}</option>
        </select>
        <select v-model="model" class="form-control form-control-sm">
          <option v-for="m in currentModels" :key="m" :value="m">{{ m }}</option>
        </select>
        <label class="ctx-label" title="上下文消息数量">
          上下文: <input v-model.number="contextCount" type="number" min="0" max="100" class="ctx-input" />
        </label>
        <button class="btn btn-sm btn-outline" @click="clearChat" title="清空对话">🗑 清空</button>
        <button class="btn btn-sm btn-primary" @click="saveToProduct" :disabled="savingProduct" title="保存详情到产品">
          {{ savingProduct ? '保存中...' : '💾 保存产品' }}
        </button>
      </div>
    </div>

    <div class="ai-split">
      <!-- Left: Preview -->
      <div class="ai-preview-panel">
        <div class="preview-toolbar">
          <span class="preview-title">📄 产品详情预览</span>
          <button class="btn btn-sm btn-secondary" @click="showSourceCode = !showSourceCode">
            {{ showSourceCode ? '👁 预览' : '📝 源码' }}
          </button>
        </div>
        <div v-if="showSourceCode" class="source-code-area">
          <textarea v-model="detailHtml" class="source-textarea" spellcheck="false"></textarea>
        </div>
        <div v-else class="preview-frame-wrap">
          <iframe ref="previewFrame" class="preview-frame" sandbox="allow-scripts allow-same-origin" :srcdoc="iframeDoc"></iframe>
        </div>
      </div>

      <!-- Right: Chat -->
      <div class="ai-chat-panel">
        <!-- System prompt -->
        <div class="system-prompt-bar">
          <div class="sp-header" @click="showSystemPrompt = !showSystemPrompt">
            <span>⚙️ 系统提示词</span>
            <span class="sp-toggle">{{ showSystemPrompt ? '收起 ▲' : '展开 ▼' }}</span>
          </div>
          <div v-if="showSystemPrompt" class="sp-body">
            <textarea v-model="systemPrompt" class="form-control" rows="8" placeholder="自定义系统提示词..."></textarea>
          </div>
        </div>

        <!-- Messages -->
        <div class="chat-messages" ref="chatMessagesEl">
          <div v-if="!messages.length" class="chat-empty">
            <p>👋 在下方输入产品相关描述开始生成</p>
            <p style="font-size:13px;color:#94a3b8;">例如：请为镀铝锌钢卷生成一个完整的产品详情页</p>
          </div>
          <div v-for="(msg, idx) in messages" :key="idx" :class="['chat-msg', 'msg-' + msg.role]">
            <div class="msg-avatar">{{ msg.role === 'user' ? '👤' : '🤖' }}</div>
            <div class="msg-content">
              <!-- User message: editable -->
              <div v-if="msg.role === 'user'">
                <div v-if="editingIdx === idx" class="msg-edit-area">
                  <textarea v-model="editText" class="form-control" rows="3"></textarea>
                  <div class="msg-edit-actions">
                    <button class="btn btn-sm btn-primary" @click="confirmEdit(idx)">发送</button>
                    <button class="btn btn-sm btn-secondary" @click="editingIdx = -1">取消</button>
                  </div>
                </div>
                <div v-else class="msg-text-wrap">
                  <div class="msg-text" v-text="msg.content"></div>
                  <button class="msg-action-btn" @click="startEdit(idx)" title="重新编辑">✏️</button>
                </div>
              </div>
              <!-- AI message: markdown/code rendering -->
              <div v-else>
                <div class="msg-text msg-ai-text" v-html="renderMarkdown(msg.content)"></div>
                <div class="msg-ai-actions">
                  <button class="msg-action-btn" @click="regenerate(idx)" title="重新回答">⟳ 重新回答</button>
                  <button v-if="hasHtmlCode(msg.content)" class="msg-action-btn apply-btn" @click="applyHtml(msg.content)" title="应用到预览">📋 应用到预览</button>
                  <button class="msg-action-btn" @click="copyText(msg.content)" title="复制">📄 复制</button>
                </div>
              </div>
            </div>
          </div>
          <!-- Streaming indicator -->
          <div v-if="streaming" class="chat-msg msg-assistant">
            <div class="msg-avatar">🤖</div>
            <div class="msg-content">
              <div class="msg-text msg-ai-text" v-html="renderMarkdown(streamContent)"></div>
              <div class="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Input -->
        <div class="chat-input-area">
          <textarea
            v-model="userInput"
            class="chat-input"
            placeholder="输入消息...（Shift+Enter 换行，Enter 发送）"
            rows="3"
            @keydown="handleInputKey"
            :disabled="streaming"
          ></textarea>
          <div class="chat-input-actions">
            <span class="char-count">{{ userInput.length }}</span>
            <button v-if="streaming" class="btn btn-sm btn-danger" @click="stopStream">⏹ 停止</button>
            <button v-else class="btn btn-sm btn-primary" @click="sendMessage" :disabled="!userInput.trim()">发送</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../../api'

const route = useRoute()
const router = useRouter()
const productId = route.params.id

// Product data
const product = ref(null)
const detailHtml = ref('')
const savingProduct = ref(false)

// AI channels
const channels = ref([])
const channelId = ref(null)
const model = ref('')
const currentModels = computed(() => {
  const ch = channels.value.find(c => c.id === channelId.value)
  return ch?.models || []
})

// Chat state
const messages = ref([])
const userInput = ref('')
const streaming = ref(false)
const streamContent = ref('')
const contextCount = ref(20)
const showSystemPrompt = ref(false)
const showSourceCode = ref(false)
const editingIdx = ref(-1)
const editText = ref('')
const chatMessagesEl = ref(null)
const previewFrame = ref(null)
let abortController = null

const systemPrompt = ref(`你是一个专业的钢铁产品页面内容生成专家。根据用户提供的产品信息，生成高质量的产品详情页 HTML 代码。

要求：
1. 生成完整的产品详情页 HTML，包含内联 CSS 样式
2. 内容包含：Hero区域、产品概述、技术规格表、应用场景、产品对比（如适用）、为什么选择我们、工厂实力、质量控制、包装、物流、FAQ
3. 必须符合 Google SEO 规范：在 <head> 中添加 Product + FAQPage 的 JSON-LD 结构化数据
4. 必须符合 GEO（Generative Engine Optimization）要求：包含结构化 FAQ，清晰的段落标题和描述
5. 图片位置使用占位符 src="images/placeholder-xxx.jpg"，并在图片下方添加 <span class="replace-tip">👉 替换提示：请将此处替换为xxx的实景照片</span>
6. 2图并排时使用 .grid-2 + .img-wrap 固定高度（280px），单图使用 .image-box.single 保持自然尺寸
7. 联系方式使用 {{email}} 和 {{whatsapp_link}} 模板变量
8. 所有面向客户的文字内容使用英文
9. 图片替换提示使用中文
10. 返回完整可用的 HTML 代码，用 \`\`\`html 代码块包裹`)

// Computed iframe doc
const iframeDoc = computed(() => {
  if (!detailHtml.value) return '<html><body style="font-family:sans-serif;color:#94a3b8;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><p>AI 生成的产品详情将在此处预览</p></body></html>'
  return detailHtml.value
})

// Load product and channels
onMounted(async () => {
  try {
    product.value = await api.getProduct(productId)
    detailHtml.value = product.value.detail_content || ''
  } catch (e) {
    alert('加载产品失败: ' + e.message)
    router.push('/admin/products')
    return
  }
  try {
    channels.value = await api.getAIChannels()
    if (channels.value.length) {
      const def = channels.value.find(c => c.is_default) || channels.value[0]
      channelId.value = def.id
      model.value = def.models[0] || ''
    }
  } catch (e) { console.error(e) }
})

function onChannelChange() {
  const ch = channels.value.find(c => c.id === channelId.value)
  if (ch?.models?.length) model.value = ch.models[0]
}

// ─── Chat functions ────────────────────────────────────────────────────────────

function buildMessages() {
  const msgs = []
  msgs.push({ role: 'system', content: systemPrompt.value })
  // Respect context count
  const ctxMessages = contextCount.value > 0 ? messages.value.slice(-contextCount.value) : messages.value
  for (const m of ctxMessages) {
    msgs.push({ role: m.role, content: m.content })
  }
  return msgs
}

async function sendMessage() {
  const text = userInput.value.trim()
  if (!text || streaming.value) return
  messages.value.push({ role: 'user', content: text })
  userInput.value = ''
  await doStream()
}

async function doStream() {
  if (!channelId.value || !model.value) {
    alert('请先在 AI 设置中添加渠道和模型')
    return
  }
  streaming.value = true
  streamContent.value = ''
  abortController = new AbortController()

  try {
    const token = localStorage.getItem('token')
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        channel_id: channelId.value,
        model: model.value,
        messages: buildMessages(),
        temperature: 0.7
      }),
      signal: abortController.signal
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || `HTTP ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

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
            streamContent.value += delta
            scrollToBottom()
          }
        } catch {}
      }
    }

    // Finished: add to messages
    if (streamContent.value) {
      messages.value.push({ role: 'assistant', content: streamContent.value })
    }
  } catch (e) {
    if (e.name !== 'AbortError') {
      messages.value.push({ role: 'assistant', content: `❌ 错误: ${e.message}` })
    } else if (streamContent.value) {
      messages.value.push({ role: 'assistant', content: streamContent.value })
    }
  } finally {
    streaming.value = false
    streamContent.value = ''
    abortController = null
    scrollToBottom()
  }
}

function stopStream() {
  abortController?.abort()
}

function clearChat() {
  if (messages.value.length && !confirm('确定清空所有对话？')) return
  messages.value = []
}

function handleInputKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

// ─── Edit & Regenerate ─────────────────────────────────────────────────────────

function startEdit(idx) {
  editingIdx.value = idx
  editText.value = messages.value[idx].content
}

function confirmEdit(idx) {
  messages.value[idx].content = editText.value
  // Remove all messages after this one
  messages.value.splice(idx + 1)
  editingIdx.value = -1
  doStream()
}

function regenerate(idx) {
  // Remove this AI message and all after it
  messages.value.splice(idx)
  doStream()
}

// ─── HTML detection & application ──────────────────────────────────────────────

function hasHtmlCode(text) {
  return /```html[\s\S]*?```/i.test(text) || /<(!DOCTYPE|html|div|section|head|body)/i.test(text)
}

function applyHtml(text) {
  // Extract HTML from code block
  const match = text.match(/```html\s*([\s\S]*?)```/)
  if (match) {
    detailHtml.value = match[1].trim()
  } else {
    // Try to find raw HTML
    const htmlMatch = text.match(/(<!DOCTYPE[\s\S]*<\/html>)/i) || text.match(/(<div[\s\S]*<\/div>\s*$)/im)
    if (htmlMatch) detailHtml.value = htmlMatch[1].trim()
    else detailHtml.value = text
  }
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {}).catch(() => {})
}

// ─── Markdown rendering ────────────────────────────────────────────────────────

function renderMarkdown(text) {
  if (!text) return ''
  let html = text
  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = code.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<div class="code-block"><div class="code-header"><span>${lang || 'code'}</span><button onclick="navigator.clipboard.writeText(this.closest('.code-block').querySelector('code').textContent)">📋 复制</button></div><pre><code class="lang-${lang}">${escaped}</code></pre></div>`
  })
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
  // Headers
  html = html.replace(/^### (.*$)/gm, '<h4>$1</h4>')
  html = html.replace(/^## (.*$)/gm, '<h3>$1</h3>')
  html = html.replace(/^# (.*$)/gm, '<h2>$1</h2>')
  // Lists
  html = html.replace(/^\- (.*$)/gm, '<li>$1</li>')
  html = html.replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
  // Paragraphs (double newline)
  html = html.replace(/\n\n/g, '</p><p>')
  html = html.replace(/\n/g, '<br/>')
  return `<p>${html}</p>`
}

// ─── Save product ──────────────────────────────────────────────────────────────

async function saveToProduct() {
  if (!detailHtml.value.trim()) { alert('预览内容为空，无法保存'); return }
  if (!confirm('确定将当前预览内容保存到产品详情？')) return
  savingProduct.value = true
  try {
    const formData = new FormData()
    // Re-send all existing fields
    const p = product.value
    formData.append('name', p.name)
    formData.append('name_en', p.name_en || '')
    formData.append('category_id', p.category_id || '')
    formData.append('description', p.description || '')
    formData.append('description_en', p.description_en || '')
    formData.append('detail_content', detailHtml.value)
    formData.append('specs', p.specs || '[]')
    formData.append('is_featured', p.is_featured || 0)
    formData.append('status', p.status ?? 1)
    formData.append('sort_order', p.sort_order || 0)
    formData.append('seo_title', p.seo_title || '')
    formData.append('seo_description', p.seo_description || '')
    formData.append('seo_keywords', p.seo_keywords || '')
    formData.append('faq_items', p.faq_items || '[]')
    formData.append('existing_images', p.images || '')
    await api.updateProduct(productId, formData)
    alert('✅ 产品详情已保存！')
  } catch (e) { alert('保存失败: ' + e.message) }
  finally { savingProduct.value = false }
}

// ─── Utility ───────────────────────────────────────────────────────────────────

function scrollToBottom() {
  nextTick(() => {
    if (chatMessagesEl.value) {
      chatMessagesEl.value.scrollTop = chatMessagesEl.value.scrollHeight
    }
  })
}

watch(messages, scrollToBottom, { deep: true })
</script>

<style scoped>
.product-ai-page {
  display: flex; flex-direction: column; height: calc(100vh - 20px);
  margin: -20px -30px; /* override admin padding */
}

/* ── Top bar ── */
.ai-topbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 20px; background: #fff; border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0; gap: 12px; flex-wrap: wrap;
}
.ai-topbar-left { display: flex; align-items: center; gap: 12px; }
.ai-topbar-left h2 { margin: 0; font-size: 18px; white-space: nowrap; }
.ai-topbar-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.form-control-sm { padding: 4px 8px; font-size: 13px; height: 32px; min-width: 120px; }
.ctx-label { font-size: 13px; color: #64748b; white-space: nowrap; display: flex; align-items: center; gap: 4px; }
.ctx-input { width: 50px; padding: 2px 6px; border: 1px solid #e2e8f0; border-radius: 4px; text-align: center; font-size: 13px; }

/* ── Split layout ── */
.ai-split { display: flex; flex: 1; overflow: hidden; }
.ai-preview-panel { flex: 1; display: flex; flex-direction: column; border-right: 1px solid #e2e8f0; background: #f8fafc; }
.ai-chat-panel { flex: 1; display: flex; flex-direction: column; background: #fff; min-width: 0; }

/* ── Preview ── */
.preview-toolbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 16px; background: #fff; border-bottom: 1px solid #e2e8f0; flex-shrink: 0;
}
.preview-title { font-weight: 600; font-size: 14px; }
.preview-frame-wrap { flex: 1; overflow: auto; }
.preview-frame { width: 100%; height: 100%; border: none; background: #fff; }
.source-code-area { flex: 1; display: flex; }
.source-textarea {
  flex: 1; border: none; padding: 16px; font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px; line-height: 1.6; resize: none; outline: none;
  background: #1e293b; color: #e2e8f0; tab-size: 2;
}

/* ── System prompt ── */
.system-prompt-bar { border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
.sp-header {
  display: flex; justify-content: space-between; padding: 10px 16px;
  cursor: pointer; font-size: 14px; font-weight: 500; background: #f8fafc;
}
.sp-header:hover { background: #f1f5f9; }
.sp-toggle { color: #94a3b8; font-size: 12px; }
.sp-body { padding: 12px 16px; background: #fff; }
.sp-body textarea { font-size: 13px; line-height: 1.6; }

/* ── Chat messages ── */
.chat-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.chat-empty { text-align: center; color: #94a3b8; padding: 60px 20px; }
.chat-empty p:first-child { font-size: 18px; }

.chat-msg { display: flex; gap: 10px; max-width: 100%; }
.msg-avatar { font-size: 24px; flex-shrink: 0; width: 36px; text-align: center; }
.msg-content { flex: 1; min-width: 0; }

.msg-user .msg-content { background: #eff6ff; border-radius: 12px 12px 0 12px; padding: 12px 16px; }
.msg-assistant .msg-content { background: #f8fafc; border-radius: 12px 12px 12px 0; padding: 12px 16px; border: 1px solid #e2e8f0; }

.msg-text { font-size: 14px; line-height: 1.7; word-break: break-word; }
.msg-text-wrap { display: flex; align-items: flex-start; gap: 8px; }
.msg-text-wrap .msg-text { flex: 1; }

.msg-action-btn {
  background: none; border: 1px solid #e2e8f0; padding: 3px 10px; border-radius: 4px;
  font-size: 12px; cursor: pointer; color: #64748b; transition: 0.2s;
}
.msg-action-btn:hover { background: #f1f5f9; color: #1e293b; }
.apply-btn { color: #059669; border-color: #a7f3d0; }
.apply-btn:hover { background: #ecfdf5; }

.msg-ai-actions { display: flex; gap: 6px; margin-top: 10px; }
.msg-edit-area { display: flex; flex-direction: column; gap: 8px; }
.msg-edit-actions { display: flex; gap: 6px; }

/* ── AI text rendering ── */
.msg-ai-text :deep(h2), .msg-ai-text :deep(h3), .msg-ai-text :deep(h4) { margin: 12px 0 6px; }
.msg-ai-text :deep(p) { margin: 0 0 8px; }
.msg-ai-text :deep(li) { margin-bottom: 4px; }
.msg-ai-text :deep(.code-block) {
  border-radius: 8px; overflow: hidden; margin: 8px 0; background: #1e293b;
}
.msg-ai-text :deep(.code-header) {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 12px; background: #0f172a; color: #94a3b8; font-size: 12px;
}
.msg-ai-text :deep(.code-header button) {
  background: none; border: 1px solid #475569; color: #94a3b8; padding: 2px 8px;
  border-radius: 4px; cursor: pointer; font-size: 11px;
}
.msg-ai-text :deep(.code-header button:hover) { background: #334155; color: #e2e8f0; }
.msg-ai-text :deep(pre) { margin: 0; padding: 12px 16px; overflow-x: auto; }
.msg-ai-text :deep(code) { font-family: 'Consolas', 'Monaco', monospace; font-size: 13px; color: #e2e8f0; }
.msg-ai-text :deep(.inline-code) {
  background: #f1f5f9; color: #e11d48; padding: 1px 6px; border-radius: 3px; font-size: 13px;
}

/* ── Typing indicator ── */
.typing-indicator { display: flex; gap: 4px; padding: 4px 0; }
.typing-indicator span { width: 8px; height: 8px; border-radius: 50%; background: #94a3b8; animation: typing 1.4s infinite; }
.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
@keyframes typing { 0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); } 30% { opacity: 1; transform: scale(1); } }

/* ── Chat input ── */
.chat-input-area { border-top: 1px solid #e2e8f0; padding: 12px 16px; flex-shrink: 0; background: #fff; }
.chat-input {
  width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px;
  font-size: 14px; line-height: 1.5; resize: none; outline: none;
  font-family: inherit; box-sizing: border-box;
}
.chat-input:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
.chat-input-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
.char-count { font-size: 12px; color: #94a3b8; }
</style>
