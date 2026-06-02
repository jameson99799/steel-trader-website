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
          <div style="display:flex;gap:6px;">
            <button class="btn btn-sm btn-secondary" @click="showSourceCode = !showSourceCode">
              {{ showSourceCode ? '👁 预览' : '📝 源码' }}
            </button>
          </div>
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
            <p style="font-size:13px;color:#94a3b8;">
              {{ detailHtml ? '已加载现有产品详情，对话将基于现有内容进行修改' : '产品详情为空，将生成全新的内容' }}
            </p>
          </div>
          <div v-for="(msg, idx) in messages" :key="idx" :class="['chat-msg', 'msg-' + msg.role]">
            <div class="msg-avatar">{{ msg.role === 'user' ? '👤' : '🤖' }}</div>
            <div class="msg-content">
              <!-- User message -->
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
              <!-- AI message -->
              <div v-else>
                <div class="msg-text msg-ai-text" v-html="renderAIMessage(msg.content)"></div>
                <div class="msg-ai-actions">
                  <button class="msg-action-btn" @click="regenerate(idx)" title="重新回答">⟳ 重新回答</button>
                  <button v-if="hasHtmlCode(msg.content)" class="msg-action-btn apply-btn" @click="applyHtml(msg.content)" title="应用到预览">📋 应用到预览</button>
                  <button class="msg-action-btn" @click="copyText(msg.content)" title="复制全部">📄 复制</button>
                </div>
              </div>
            </div>
          </div>
          <!-- Streaming -->
          <div v-if="streaming" class="chat-msg msg-assistant">
            <div class="msg-avatar">🤖</div>
            <div class="msg-content">
              <div class="msg-text msg-ai-text" v-html="renderAIMessage(streamContent)"></div>
              <div class="typing-indicator"><span></span><span></span><span></span></div>
            </div>
          </div>
        </div>

        <!-- Input -->
        <div class="chat-input-area">
          <textarea v-model="userInput" class="chat-input" :placeholder="inputPlaceholder" rows="3"
            @keydown="handleInputKey" :disabled="streaming"></textarea>
          <div class="chat-input-actions">
            <span class="char-count">{{ userInput.length }}</span>
            <button v-if="streaming" class="btn btn-sm btn-danger" @click="stopStream">⏹ 停止</button>
            <button v-else class="btn btn-sm btn-primary" @click="sendMessage" :disabled="!userInput.trim()">发送</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden file input for preview image upload -->
    <input type="file" ref="imgFileInput" accept="image/*" style="display:none" @change="handlePreviewImgUpload" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../../api'

const route = useRoute()
const router = useRouter()
const productId = route.params.id

// Product
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

// Chat
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
const imgFileInput = ref(null)
let abortController = null
let clickedImgEl = null // for preview image replacement

const inputPlaceholder = computed(() =>
  detailHtml.value
    ? '基于现有详情进行修改，例如：把FAQ部分改为6个问题...'
    : '描述产品信息开始生成，例如：请为镀铝锌钢卷生成产品详情页内容'
)

const systemPrompt = ref(`你是一个专业的钢铁产品详情页内容生成专家。

重要：你只需要生成产品详情区域的HTML片段（从第一个 <section> 或 <div> 开始），不要生成完整的 HTML 页面（不要包含 <!DOCTYPE>, <html>, <head>, <body> 等外层标签）。生成的内容将被嵌入到产品详情页面的内容区域中。

内容结构要求：
1. 产品概述（Overview）
2. 技术规格表（Specifications）
3. 应用场景（Applications）— 2图并排
4. 产品对比（Comparison）— 如适用，含对比表格和优势卡片
5. 为什么选择我们（Why Choose Us）— 卡片网格
6. 工厂实力（Factory Strength）
7. 质量控制（Quality Control）
8. 包装（Packaging）
9. 物流（Shipping）— 2图并排
10. 常见问题 FAQ — 卡片网格

SEO & GEO 要求：
- 在内容开头添加 <script type="application/ld+json"> 包含 Product + FAQPage 的 JSON-LD 结构化数据
- FAQ 部分要有清晰的问答结构，方便 AI 搜索引擎（Google AI Overview、Bing Copilot）引用
- 文字内容使用英文

图片规则：
- 图片使用占位符 src="images/placeholder-xxx.jpg"
- 在每张图片下方添加中文替换提示：<span class="replace-tip">👉 替换提示：请将此处替换为xxx的实景照片</span>
- 2图并排：使用 .grid-2 > .image-box > .img-wrap（固定280px高度）
- 单张图片：使用 .image-box.single（自然尺寸，max-height: 480px）

联系方式：使用 {{email}} 和 {{whatsapp_link}} 模板变量

请用 \`\`\`html 代码块返回 HTML 代码。`)

// ─── Iframe doc with interactive image handling ─────────────────────────────

const iframeDoc = computed(() => {
  if (!detailHtml.value) return `<html><body style="font-family:sans-serif;color:#94a3b8;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;"><div><p style="font-size:18px;">AI 生成的产品详情将在此处预览</p><p style="font-size:13px;">在右侧对话框中输入产品描述开始生成</p></div></body></html>`
  // Inject interactive image handling script
  const interactiveScript = `
<style>
  .replace-tip { display: block; background: #fffbeb; color: #d97706; font-weight: bold; padding: 10px; margin-top: 12px; border-radius: 4px; border: 1px solid #fcd34d; font-size: 14px; cursor: pointer; }
  .replace-tip:hover { background: #fef3c7; }
  img { cursor: pointer; transition: outline 0.2s; }
  img:hover { outline: 3px solid #7c3aed; outline-offset: 2px; }
  .img-toolbar { position: absolute; top: 4px; right: 4px; display: none; gap: 4px; z-index: 10; }
  .image-box:hover .img-toolbar, .img-wrap:hover .img-toolbar { display: flex; }
  .img-toolbar button { background: rgba(0,0,0,0.7); color: #fff; border: none; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer; }
  .img-toolbar button:hover { background: rgba(124,58,237,0.9); }
</style>
<script>
document.addEventListener('click', function(e) {
  var img = e.target.closest('img');
  var tip = e.target.closest('.replace-tip');
  if (img || tip) {
    var targetImg = img || (tip ? tip.parentElement.querySelector('img') : null);
    if (targetImg) {
      window.parent.postMessage({ type: 'img-click', src: targetImg.src, rect: targetImg.getBoundingClientRect() }, '*');
    }
  }
});
<\/script>`
  return detailHtml.value + interactiveScript
})

// ─── Listen for iframe messages ──────────────────────────────────────────────

onMounted(async () => {
  // Listen for image click from iframe
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'img-click') {
      // Trigger image upload
      clickedImgEl = e.data.src
      imgFileInput.value?.click()
    }
  })

  // Load product
  try {
    product.value = await api.getProduct(productId)
    detailHtml.value = product.value.detail_content || ''
  } catch (e) {
    alert('加载产品失败: ' + e.message)
    router.push('/admin/products')
    return
  }

  // Load channels
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

// ─── Preview image upload ────────────────────────────────────────────────────

async function handlePreviewImgUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const res = await api.upload(file)
    if (clickedImgEl && detailHtml.value) {
      // Replace the image src in the HTML
      // Find and replace the clicked image's src
      const oldSrc = clickedImgEl
      let html = detailHtml.value
      // Replace src attribute
      html = html.replace(new RegExp(`src=["']${escapeRegex(oldSrc)}["']`, 'g'), `src="${res.url}"`)
      // Remove the replace-tip that follows this image (if any)
      const imgIdx = html.indexOf(`src="${res.url}"`)
      if (imgIdx !== -1) {
        // Find the next replace-tip after this image tag
        const afterImg = html.substring(imgIdx)
        const tipMatch = afterImg.match(/<span\s+class=["']replace-tip["'][^>]*>.*?<\/span>/i)
        if (tipMatch && afterImg.indexOf(tipMatch[0]) < 300) {
          html = html.substring(0, imgIdx) + afterImg.replace(tipMatch[0], '')
        }
      }
      detailHtml.value = html
    }
  } catch (err) {
    alert('图片上传失败: ' + err.message)
  }
  clickedImgEl = null
  if (imgFileInput.value) imgFileInput.value.value = ''
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ─── Chat ────────────────────────────────────────────────────────────────────

function buildMessages() {
  const msgs = [{ role: 'system', content: systemPrompt.value }]

  // If there's existing detail_content and this is the first user message, prepend context
  if (detailHtml.value && messages.value.length > 0) {
    // Check if we already added context (avoid duplicate)
    const firstUserMsg = messages.value.find(m => m.role === 'user')
    if (firstUserMsg && !firstUserMsg._contextAdded) {
      // Inject existing HTML as assistant context before first user message
      msgs.push({
        role: 'assistant',
        content: `当前产品详情的 HTML 源代码如下：\n\`\`\`html\n${detailHtml.value.substring(0, 15000)}\n\`\`\`\n\n我已了解现有内容，请告诉我需要怎样修改。`
      })
    }
  }

  const ctxMessages = contextCount.value > 0 ? messages.value.slice(-contextCount.value) : messages.value
  for (const m of ctxMessages) {
    msgs.push({ role: m.role, content: m.content })
  }
  return msgs
}

async function sendMessage() {
  const text = userInput.value.trim()
  if (!text || streaming.value) return

  // If first message and there's existing content, mark context as added
  if (messages.value.length === 0 && detailHtml.value) {
    messages.value.push({ role: 'user', content: text, _contextAdded: true })
  } else {
    messages.value.push({ role: 'user', content: text })
  }
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
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
          if (delta) { streamContent.value += delta; scrollToBottom() }
        } catch {}
      }
    }
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

function stopStream() { abortController?.abort() }

function clearChat() {
  if (messages.value.length && !confirm('确定清空所有对话？')) return
  messages.value = []
}

function handleInputKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
}

// ─── Edit & Regenerate ─────────────────────────────────────────────────────

function startEdit(idx) { editingIdx.value = idx; editText.value = messages.value[idx].content }
function confirmEdit(idx) {
  messages.value[idx].content = editText.value
  messages.value.splice(idx + 1)
  editingIdx.value = -1
  doStream()
}
function regenerate(idx) { messages.value.splice(idx); doStream() }

// ─── HTML detection & apply ────────────────────────────────────────────────

function hasHtmlCode(text) {
  return /```html[\s\S]*?```/i.test(text) || /<(section|div|table|h[1-6]|p|ul|ol)\b/i.test(text)
}

function applyHtml(text) {
  const match = text.match(/```html\s*([\s\S]*?)```/)
  if (match) {
    detailHtml.value = match[1].trim()
  } else {
    const htmlMatch = text.match(/(<!DOCTYPE[\s\S]*<\/html>)/i) ||
                      text.match(/(<section[\s\S]*<\/section>\s*(?:<section[\s\S]*<\/section>\s*)*)/i) ||
                      text.match(/(<div[\s\S]*<\/div>\s*$)/im)
    if (htmlMatch) detailHtml.value = htmlMatch[1].trim()
    else detailHtml.value = text
  }
  showSourceCode.value = false
}

function copyText(text) { navigator.clipboard.writeText(text).catch(() => {}) }

// ─── Markdown / AI message rendering ─────────────────────────────────────────

function renderAIMessage(text) {
  if (!text) return ''
  let html = text

  // 1. Extract and handle <think> blocks (thinking process) → collapsible
  html = html.replace(/<think>([\s\S]*?)<\/think>/gi, (_, content) => {
    const trimmed = content.trim()
    if (!trimmed) return ''
    const escaped = trimmed.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')
    return `<details class="think-block"><summary>💭 思考过程（点击展开）</summary><div class="think-content">${escaped}</div></details>`
  })

  // 2. Code blocks → collapsible with preview for HTML
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = code.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const id = 'cb_' + Math.random().toString(36).substr(2, 8)
    const isHtml = lang.toLowerCase() === 'html'
    const previewBtn = isHtml
      ? `<button class="code-action-btn" onclick="this.closest('.code-block-wrap').querySelector('.code-preview').style.display = this.closest('.code-block-wrap').querySelector('.code-preview').style.display === 'none' ? 'block' : 'none'">👁 预览</button>`
      : ''
    const previewDiv = isHtml
      ? `<div class="code-preview" style="display:none;"><div class="code-preview-frame">${code}</div></div>`
      : ''
    return `<div class="code-block-wrap">
      <details class="code-block" open>
        <summary class="code-header">
          <span class="code-lang">${lang || 'code'}</span>
          <span class="code-actions">
            ${previewBtn}
            <button class="code-action-btn" onclick="var c=this.closest('.code-block-wrap').querySelector('code');navigator.clipboard.writeText(c.textContent)">📋 复制</button>
            <span class="code-collapse-hint">点击折叠 ▲</span>
          </span>
        </summary>
        <pre class="code-pre"><code id="${id}" class="lang-${lang}">${escaped}</code></pre>
      </details>
      ${previewDiv}
    </div>`
  })

  // 3. Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
  // 4. Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  // 5. Italic
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
  // 6. Headers
  html = html.replace(/^### (.*$)/gm, '<h4>$1</h4>')
  html = html.replace(/^## (.*$)/gm, '<h3>$1</h3>')
  html = html.replace(/^# (.*$)/gm, '<h2>$1</h2>')
  // 7. Lists
  html = html.replace(/^[\-\*] (.*$)/gm, '<li>$1</li>')
  html = html.replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
  // 8. Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>')
  // 9. Paragraphs
  html = html.replace(/\n\n/g, '</p><p>')
  html = html.replace(/\n/g, '<br/>')

  return `<p>${html}</p>`
}

// ─── Save product ──────────────────────────────────────────────────────────

async function saveToProduct() {
  if (!detailHtml.value.trim()) { alert('预览内容为空'); return }
  if (!confirm('确定保存当前预览内容到产品详情？')) return
  savingProduct.value = true
  try {
    const fd = new FormData()
    const p = product.value
    fd.append('name', p.name)
    fd.append('name_en', p.name_en || '')
    fd.append('category_id', p.category_id || '')
    fd.append('description', p.description || '')
    fd.append('description_en', p.description_en || '')
    fd.append('detail_content', detailHtml.value)
    fd.append('specs', p.specs || '[]')
    fd.append('is_featured', p.is_featured || 0)
    fd.append('status', p.status ?? 1)
    fd.append('sort_order', p.sort_order || 0)
    fd.append('seo_title', p.seo_title || '')
    fd.append('seo_description', p.seo_description || '')
    fd.append('seo_keywords', p.seo_keywords || '')
    fd.append('faq_items', p.faq_items || '[]')
    fd.append('existing_images', p.images || '')
    await api.updateProduct(productId, fd)
    alert('✅ 产品详情已保存！')
  } catch (e) { alert('保存失败: ' + e.message) }
  finally { savingProduct.value = false }
}

// ─── Utility ────────────────────────────────────────────────────────────────

function scrollToBottom() {
  nextTick(() => { if (chatMessagesEl.value) chatMessagesEl.value.scrollTop = chatMessagesEl.value.scrollHeight })
}
watch(messages, scrollToBottom, { deep: true })
</script>

<style scoped>
.product-ai-page {
  display: flex; flex-direction: column; height: calc(100vh - 20px);
  margin: -20px -30px;
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

/* ── Split ── */
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
.sp-header { display: flex; justify-content: space-between; padding: 10px 16px; cursor: pointer; font-size: 14px; font-weight: 500; background: #f8fafc; }
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
.msg-text-wrap .msg-text { flex: 1; white-space: pre-wrap; }

.msg-action-btn {
  background: none; border: 1px solid #e2e8f0; padding: 3px 10px; border-radius: 4px;
  font-size: 12px; cursor: pointer; color: #64748b; transition: 0.2s;
}
.msg-action-btn:hover { background: #f1f5f9; color: #1e293b; }
.apply-btn { color: #059669; border-color: #a7f3d0; }
.apply-btn:hover { background: #ecfdf5; }

.msg-ai-actions { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
.msg-edit-area { display: flex; flex-direction: column; gap: 8px; }
.msg-edit-actions { display: flex; gap: 6px; }

/* ── AI text: think blocks ── */
.msg-ai-text :deep(.think-block) {
  background: #f8f5ff; border: 1px solid #e9d5ff; border-radius: 8px; margin: 8px 0; overflow: hidden;
}
.msg-ai-text :deep(.think-block summary) {
  padding: 8px 14px; cursor: pointer; font-size: 13px; color: #7c3aed; font-weight: 500;
  list-style: none; user-select: none;
}
.msg-ai-text :deep(.think-block summary::-webkit-details-marker) { display: none; }
.msg-ai-text :deep(.think-block summary::before) { content: '▶ '; font-size: 10px; }
.msg-ai-text :deep(.think-block[open] summary::before) { content: '▼ '; }
.msg-ai-text :deep(.think-content) {
  padding: 10px 14px; font-size: 13px; color: #6b21a8; line-height: 1.6; border-top: 1px solid #e9d5ff;
}

/* ── AI text: code blocks ── */
.msg-ai-text :deep(.code-block-wrap) { margin: 10px 0; }
.msg-ai-text :deep(.code-block) {
  border-radius: 8px; overflow: hidden; background: #1e293b; border: 1px solid #334155;
}
.msg-ai-text :deep(.code-block summary) {
  list-style: none; cursor: pointer; user-select: none;
}
.msg-ai-text :deep(.code-block summary::-webkit-details-marker) { display: none; }
.msg-ai-text :deep(.code-header) {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 14px; background: #0f172a; color: #94a3b8; font-size: 12px;
}
.msg-ai-text :deep(.code-lang) { font-weight: 600; text-transform: uppercase; }
.msg-ai-text :deep(.code-actions) { display: flex; gap: 6px; align-items: center; }
.msg-ai-text :deep(.code-action-btn) {
  background: none; border: 1px solid #475569; color: #94a3b8; padding: 2px 8px;
  border-radius: 4px; cursor: pointer; font-size: 11px;
}
.msg-ai-text :deep(.code-action-btn:hover) { background: #334155; color: #e2e8f0; }
.msg-ai-text :deep(.code-collapse-hint) { color: #475569; font-size: 11px; }
.msg-ai-text :deep(.code-pre) { margin: 0; padding: 14px 16px; overflow-x: auto; max-height: 400px; overflow-y: auto; }
.msg-ai-text :deep(code) { font-family: 'Consolas', 'Monaco', 'Fira Code', monospace; font-size: 13px; color: #e2e8f0; line-height: 1.5; }
.msg-ai-text :deep(.inline-code) { background: #f1f5f9; color: #e11d48; padding: 1px 6px; border-radius: 3px; font-size: 13px; }

/* ── Code preview (HTML) ── */
.msg-ai-text :deep(.code-preview) {
  border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; background: #fff; margin-top: -1px;
}
.msg-ai-text :deep(.code-preview-frame) {
  padding: 16px; max-height: 300px; overflow-y: auto; font-size: 14px;
}

/* ── General text ── */
.msg-ai-text :deep(h2), .msg-ai-text :deep(h3), .msg-ai-text :deep(h4) { margin: 12px 0 6px; }
.msg-ai-text :deep(p) { margin: 0 0 8px; }
.msg-ai-text :deep(ul) { margin: 4px 0 8px 16px; padding: 0; }
.msg-ai-text :deep(li) { margin-bottom: 4px; }
.msg-ai-text :deep(strong) { color: #1e293b; }

/* ── Typing ── */
.typing-indicator { display: flex; gap: 4px; padding: 4px 0; }
.typing-indicator span { width: 8px; height: 8px; border-radius: 50%; background: #94a3b8; animation: typing 1.4s infinite; }
.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
@keyframes typing { 0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); } 30% { opacity: 1; transform: scale(1); } }

/* ── Input ── */
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
