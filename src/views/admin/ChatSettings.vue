<template>
  <div class="chat-settings">
    <div class="header">
      <h2>Live Chat & WeChat Settings</h2>
      <p>Bind your WeChat to reply to website visitors in real-time, and configure auto-replies for off-hours.</p>
    </div>

    <div class="content-grid">
      <!-- WeChat Binding Card -->
      <div class="card wechat-card">
        <h3>WeChat Integration (Wechaty)</h3>
        
        <div v-if="loadingStatus" class="loading">
          Checking WeChat status...
        </div>
        
        <div v-else-if="wechatStatus.isLoggedIn" class="status-logged-in">
          <div class="success-icon">✓</div>
          <h4>Successfully Bound!</h4>
          <p>Logged in as: <strong>{{ wechatStatus.currentUser }}</strong></p>
          <p class="desc">Messages from the website will now be forwarded to your WeChat FileHelper (文件传输助手). You can reply there, and the visitor will see it.</p>
          <button class="btn btn-danger" @click="logoutWechat">Unbind WeChat</button>
        </div>
        
        <div v-else class="status-logged-out">
          <h4>Scan to Bind WeChat</h4>
          <p class="desc">Please use your WeChat app to scan the QR code below.</p>
          
          <div class="qrcode-container">
            <img v-if="wechatStatus.qrCodeUrl" :src="wechatStatus.qrCodeUrl" alt="WeChat Login QR Code" />
            <div v-else class="qr-placeholder">
              Generating QR Code...
            </div>
          </div>
          <button class="btn btn-secondary" @click="fetchStatus">Refresh QR Code</button>
        </div>
      </div>

      <!-- Auto Reply Card -->
      <div class="card settings-card">
        <h3>Auto-Reply Settings</h3>
        <p class="desc">Automatically reply to visitors during your off-hours.</p>
        
        <form @submit.prevent="saveSettings" class="settings-form">
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" v-model="settings.auto_reply_enabled" />
              Enable Auto-Reply
            </label>
          </div>
          
          <div class="form-row" :class="{ 'disabled': !settings.auto_reply_enabled }">
            <div class="form-group">
              <label>Offline Start Time</label>
              <input type="time" v-model="settings.start_time" :disabled="!settings.auto_reply_enabled" />
            </div>
            <div class="form-group">
              <label>Offline End Time</label>
              <input type="time" v-model="settings.end_time" :disabled="!settings.auto_reply_enabled" />
            </div>
          </div>
          
          <div class="form-group" :class="{ 'disabled': !settings.auto_reply_enabled }">
            <label>Auto-Reply Message</label>
            <textarea 
              v-model="settings.reply_text" 
              rows="4" 
              placeholder="e.g. Hello! We are currently offline..."
              :disabled="!settings.auto_reply_enabled"
            ></textarea>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Saving...' : 'Save Settings' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const wechatStatus = ref({ isLoggedIn: false, currentUser: null, qrCodeUrl: null })
const settings = ref({ auto_reply_enabled: false, start_time: '22:00', end_time: '07:00', reply_text: '' })
const loadingStatus = ref(true)
const saving = ref(false)
let pollInterval = null

const fetchStatus = async () => {
  try {
    const res = await fetch('/api/chat/admin/status', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
    })
    if (res.ok) {
      wechatStatus.value = await res.json()
    }
  } catch (e) {
    console.error('Failed to fetch WeChat status', e)
  } finally {
    loadingStatus.value = false
  }
}

const fetchSettings = async () => {
  try {
    const res = await fetch('/api/chat/admin/settings', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
    })
    if (res.ok) {
      const data = await res.json()
      settings.value = {
        auto_reply_enabled: Boolean(data.auto_reply_enabled),
        start_time: data.start_time || '22:00',
        end_time: data.end_time || '07:00',
        reply_text: data.reply_text || ''
      }
    }
  } catch (e) {
    console.error('Failed to fetch chat settings', e)
  }
}

const saveSettings = async () => {
  saving.value = true
  try {
    const res = await fetch('/api/chat/admin/settings', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}` 
      },
      body: JSON.stringify(settings.value)
    })
    if (res.ok) {
      alert('Settings saved successfully!')
    } else {
      alert('Failed to save settings')
    }
  } catch (e) {
    console.error('Failed to save chat settings', e)
    alert('Error saving settings')
  } finally {
    saving.value = false
  }
}

const logoutWechat = async () => {
  if (!confirm('Are you sure you want to unbind this WeChat account?')) return
  try {
    await fetch('/api/chat/admin/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
    })
    await fetchStatus()
  } catch (e) {
    console.error('Failed to logout WeChat', e)
  }
}

onMounted(() => {
  fetchStatus()
  fetchSettings()
  // Poll for QR code updates or login success every 3 seconds
  pollInterval = setInterval(fetchStatus, 3000)
})

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval)
  }
})
</script>

<style scoped>
.chat-settings {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}
.header {
  margin-bottom: 30px;
}
.header h2 {
  font-size: 24px;
  color: #1f2937;
  margin-bottom: 8px;
}
.header p {
  color: #6b7280;
}
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
.card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border: 1px solid #e5e7eb;
}
.card h3 {
  font-size: 18px;
  margin-bottom: 16px;
  color: #111827;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 12px;
}
.desc {
  color: #6b7280;
  font-size: 14px;
  margin-bottom: 20px;
  line-height: 1.5;
}
.status-logged-in {
  text-align: center;
  padding: 20px 0;
}
.success-icon {
  width: 64px;
  height: 64px;
  background: #10b981;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin: 0 auto 16px;
}
.status-logged-in h4 {
  font-size: 20px;
  color: #10b981;
  margin-bottom: 8px;
}
.qrcode-container {
  display: flex;
  justify-content: center;
  margin: 20px 0;
  min-height: 200px;
}
.qrcode-container img {
  max-width: 200px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px;
  background: white;
}
.qr-placeholder {
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  color: #9ca3af;
}
.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}
.btn-primary {
  background: #3b82f6;
  color: white;
}
.btn-primary:hover {
  background: #2563eb;
}
.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.btn-secondary {
  background: #f3f4f6;
  color: #4b5563;
  border: 1px solid #d1d5db;
}
.btn-secondary:hover {
  background: #e5e7eb;
}
.btn-danger {
  background: #ef4444;
  color: white;
}
.btn-danger:hover {
  background: #dc2828;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-group label {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}
.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  cursor: pointer;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
input[type="time"], textarea {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-family: inherit;
  font-size: 14px;
}
input[type="time"]:focus, textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59,130,246,0.2);
}
.disabled {
  opacity: 0.6;
}
.form-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}
</style>
