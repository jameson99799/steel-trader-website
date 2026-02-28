<template>
  <div class="float-panel" v-if="company">
    <div class="panel-header">Contact Us</div>

    <!-- WhatsApp -->
    <div class="panel-item" v-if="company.whatsapp">
      <div class="panel-qr-wrap" v-if="company.whatsapp_qr">
        <img
          :src="company.whatsapp_qr"
          alt="WhatsApp QR Code"
          class="panel-qr"
          :class="{ 'qr-zoomed': zoomed === 'wa' }"
          @click="toggleZoom('wa')"
          title="Click to zoom"
        />
        <div class="qr-zoom-hint">{{ zoomed === 'wa' ? 'Click to shrink' : 'Click to zoom' }}</div>
      </div>
      <a :href="`https://wa.me/${company.whatsapp.replace(/[^0-9]/g, '')}`" target="_blank" class="panel-row wa-row">
        <svg class="row-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
        </svg>
        <div class="row-text">
          <span class="row-label">WhatsApp</span>
          <span class="row-num">{{ company.whatsapp }}</span>
        </div>
      </a>
    </div>

    <!-- WeChat -->
    <div class="panel-item" v-if="company.wechat || company.wechat_qr">
      <div class="panel-qr-wrap" v-if="company.wechat_qr">
        <img
          :src="company.wechat_qr"
          alt="WeChat QR Code"
          class="panel-qr"
          :class="{ 'qr-zoomed': zoomed === 'wc' }"
          @click="toggleZoom('wc')"
          title="Click to zoom"
        />
        <div class="qr-zoom-hint">{{ zoomed === 'wc' ? 'Click to shrink' : 'Click to zoom' }}</div>
      </div>
      <div class="panel-row wc-row" @click="copyWechat" style="cursor:pointer;" title="Click to copy WeChat number">
        <svg class="row-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.295.295a.328.328 0 00.168-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.603-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.83 6.22.836 2.498 3.499 4.148 6.386 4.148.801 0 1.536-.107 2.24-.313a.647.647 0 01.527.082l1.396.82a.25.25 0 00.377-.296l-.286-1.094a.44.44 0 01.16-.497c1.348-1.194 2.203-2.976 2.203-4.876-.001-3.543-2.718-5.98-5.893-5.98zm-2.904 3.137c.472 0 .857.385.857.857s-.385.857-.857.857a.857.857 0 010-1.714zm5.654 0c.472 0 .857.385.857.857s-.385.857-.857.857a.857.857 0 010-1.714z"/>
        </svg>
        <div class="row-text">
          <span class="row-label">WeChat <small>(tap to copy)</small></span>
          <span class="row-num" v-if="company.wechat">{{ company.wechat }}</span>
        </div>
      </div>
    </div>

    <!-- Phone -->
    <div class="panel-item" v-if="company.phone">
      <a :href="`tel:${company.phone}`" class="panel-row tel-row">
        <svg class="row-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
        </svg>
        <div class="row-text">
          <span class="row-label">TEL</span>
          <span class="row-num">{{ company.phone }}</span>
        </div>
      </a>
    </div>

    <!-- Email -->
    <div class="panel-item" v-if="company.email">
      <a :href="`mailto:${company.email}`" class="panel-row email-row">
        <svg class="row-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
        </svg>
        <div class="row-text">
          <span class="row-label">Email</span>
          <span class="row-num">{{ company.email }}</span>
        </div>
      </a>
    </div>

    <!-- Copy Toast -->
    <div class="copy-toast" :class="{ show: toastVisible }">✓ Number Copied!</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'

const company = ref(null)
const toastVisible = ref(false)
const zoomed = ref(null) // 'wa' | 'wc' | null

function toggleZoom(key) {
  zoomed.value = zoomed.value === key ? null : key
}

function copyWechat() {
  if (!company.value?.wechat) return
  const num = company.value.wechat

  const doToast = () => {
    toastVisible.value = true
    setTimeout(() => { toastVisible.value = false }, 2500)
  }

  if (navigator.clipboard) {
    navigator.clipboard.writeText(num).then(doToast).catch(() => {
      fallbackCopy(num)
      doToast()
    })
  } else {
    fallbackCopy(num)
    doToast()
  }
}

function fallbackCopy(text) {
  const el = document.createElement('textarea')
  el.value = text
  el.style.position = 'fixed'
  el.style.opacity = '0'
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
}

onMounted(async () => {
  try { company.value = await api.getCompany() } catch (e) {}
})
</script>

<style scoped>
.float-panel {
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 9999;
  background: white;
  border-radius: 12px 0 0 12px;
  box-shadow: -4px 0 28px rgba(0,0,0,0.15);
  width: 230px;
  overflow: visible;
}

.panel-header {
  background: #1a202c;
  color: white;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  padding: 10px 14px;
  border-radius: 12px 0 0 0;
}

.panel-item {
  border-bottom: 1px solid #f1f5f9;
  position: relative;
}
.panel-item:last-child { border-bottom: none; }

/* QR image */
.panel-qr-wrap {
  padding: 8px 14px 2px;
  text-align: left;
}

.panel-qr {
  width: 120px;
  height: 120px;
  object-fit: contain;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  cursor: zoom-in;
  display: block;
  transition: all 0.3s ease;
}

/* Zoomed state: expand image inline */
.panel-qr.qr-zoomed {
  width: 195px;
  height: 195px;
  cursor: zoom-out;
  border-color: #3b82f6;
  box-shadow: 0 4px 16px rgba(59,130,246,0.25);
}

.qr-zoom-hint {
  font-size: 10px;
  color: #94a3b8;
  margin-top: 3px;
  text-align: left;
}

/* Contact rows */
.panel-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 14px;
  text-decoration: none;
  transition: background 0.18s;
  text-align: left;
}
.panel-row:hover { background: #f8fafc; }
.wa-row { background: #f0fdf4; }
.wa-row:hover { background: #dcfce7; }
.wc-row { background: #f0fdf4; }
.wc-row:hover { background: #dcfce7; }

.row-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  color: #64748b;
}
.wa-row .row-icon { color: #25D366; }
.wc-row .row-icon { color: #07C160; }
.tel-row .row-icon { color: #3B82F6; }
.email-row .row-icon { color: #F59E0B; }

.row-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.row-label {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1;
  white-space: nowrap;
}
.row-label small { font-weight: 400; text-transform: none; letter-spacing: 0; color: #cbd5e1; font-size: 10px; }

/* Increased font size by 3 — was 12px → now 15px */
.row-num {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 175px;
}

/* Toast */
.copy-toast {
  position: absolute;
  bottom: -44px;
  left: 50%;
  transform: translateX(-50%);
  background: #1e293b;
  color: white;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 8px;
  white-space: nowrap;
  transition: opacity 0.25s, bottom 0.25s;
  opacity: 0;
  pointer-events: none;
}
.copy-toast.show { opacity: 1; bottom: -40px; }

/* Mobile: bottom bar */
@media (max-width: 768px) {
  .float-panel {
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    transform: none;
    border-radius: 12px 12px 0 0;
    width: 100%;
    display: flex;
    flex-direction: row;
    overflow: hidden;
  }
  .panel-header { display: none; }
  .panel-qr-wrap { display: none; }
  .panel-item { flex: 1; border-bottom: none; border-right: 1px solid #f1f5f9; }
  .panel-row { flex-direction: column; gap: 2px; padding: 8px 4px; justify-content: center; align-items: center; text-align: center; }
  .row-num { font-size: 11px; max-width: 80px; }
}
</style>
