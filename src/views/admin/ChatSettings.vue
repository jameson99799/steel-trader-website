<template>
  <div class="chat-settings">
    <div class="header">
      <h2>💬 在线客服设置</h2>
      <p>配置网站右下角的在线客服对话窗口、自动回复和欢迎话术。</p>
    </div>

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

      <div v-for="(reply, idx) in autoReplies" :key="reply.id" class="reply-item">
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
            <input type="text" v-model="btn.label" placeholder="按钮文字（中文）" />
            <input type="text" v-model="btn.label_en" placeholder="Button Text (EN)" />
            <input type="text" v-model="btn.url" placeholder="跳转链接，如 /products" />
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
</template>

<script setup>
import { ref, onMounted } from 'vue'

const settings = ref({ widget_enabled: true, auto_reply_enabled: false, start_time: '22:00', end_time: '07:00', auto_collapse_seconds: 10 })
const autoReplies = ref([])
const welcomePresets = ref([])
const newReplyContent = ref('')
const saving = ref(false)
const token = () => localStorage.getItem('token')
const headers = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` })

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

// ── Auto-Replies ──
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

// ── Welcome Presets ──
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

onMounted(() => { fetchSettings(); fetchAutoReplies(); fetchWelcomePresets() })
</script>

<style scoped>
.chat-settings {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}
.header { margin-bottom: 24px; }
.header h2 { font-size: 24px; color: #1f2937; margin-bottom: 6px; }
.header p { color: #6b7280; font-size: 14px; }
.card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border: 1px solid #e5e7eb;
  margin-bottom: 20px;
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
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: 8px;
  margin-bottom: 6px;
}
.add-preset-area { margin-top: 10px; }
</style>
