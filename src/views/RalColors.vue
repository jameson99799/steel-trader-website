<template>
  <div class="ral-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="container">
        <div class="header-content">
          <nav class="breadcrumb">
            <router-link :to="langPath('/')" class="breadcrumb-link">{{ t('home') }}</router-link>
            <svg class="breadcrumb-sep" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
            <span class="breadcrumb-current">{{ t('ralColorChart') }}</span>
          </nav>
          <h1 class="page-title">
            <span class="palette-icon">🎨</span> {{ t('ralColorChart') }}
          </h1>
          <p class="page-subtitle">{{ t('ralSubtitle') }}</p>

          <!-- Search bar -->
          <div class="search-wrap">
            <span class="search-icon">🔍</span>
            <input
              v-model="searchQuery"
              class="search-input"
              :placeholder="t('ralSearchPlaceholder')"
              @input="filterColors"
            />
            <button v-if="searchQuery" class="search-clear" @click="searchQuery=''; filterColors()">✕</button>
          </div>

          <div class="result-count" v-if="!loading">
            {{ filtered.length }} {{ t('ralColors') }}
          </div>
        </div>
      </div>
    </div>

    <!-- Color Grid -->
    <div class="page-content">
      <div class="container">
        <div v-if="loading" class="loading-wrap">
          <div class="spinner"></div>
        </div>
        <div v-else-if="filtered.length === 0" class="empty-wrap">
          {{ t('ralNoResult') }} "{{ searchQuery }}"
        </div>
        <div v-else class="color-grid">
          <div
            v-for="color in filtered"
            :key="color.code"
            class="color-chip"
            @click="openDetail(color)"
          >
            <div class="chip-swatch" :style="{ background: color.hex }">
              <div class="chip-overlay">
                <span class="chip-zoom">🔍</span>
              </div>
            </div>
            <div class="chip-info">
              <span class="chip-code">RAL {{ color.code }}</span>
              <span class="chip-name">{{ color.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Detail Lightbox -->
    <transition name="fade">
      <div v-if="detail" class="lightbox" @click.self="detail = null">
        <div class="lightbox-card">
          <button class="lb-close" @click="detail = null">✕</button>
          <div class="lb-swatch" :style="{ background: detail.hex }">
            <span class="lb-code-badge">RAL {{ detail.code }}</span>
          </div>
          <div class="lb-body">
            <h2 class="lb-name">{{ detail.name }}</h2>
            <div class="lb-meta">
              <div class="lb-meta-row">
                <span class="lb-label">{{ t('ralColorCode') }}</span>
                <span class="lb-value mono">RAL {{ detail.code }}</span>
              </div>
              <div class="lb-meta-row">
                <span class="lb-label">{{ t('ralColorName') }}</span>
                <span class="lb-value">{{ detail.name }}</span>
              </div>
              <div class="lb-meta-row" v-if="detail.name !== detail.name_en">
                <span class="lb-label">English</span>
                <span class="lb-value">{{ detail.name_en }}</span>
              </div>
              <div class="lb-meta-row">
                <span class="lb-label">{{ t('ralHexValue') }}</span>
                <span class="lb-value mono">{{ detail.hex }}</span>
              </div>
            </div>
            <div class="lb-swatch-mini" :style="{ background: detail.hex }"></div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useLang } from '../composables/useLang'
import api from '../api'

const { t, langPath } = useLang()

const colors = ref([])
const filtered = ref([])
const loading = ref(true)
const searchQuery = ref('')
const detail = ref(null)

function filterColors() {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) { filtered.value = colors.value; return }
  filtered.value = colors.value.filter(c =>
    c.code.includes(q) ||
    c.name.toLowerCase().includes(q) ||
    c.name_en.toLowerCase().includes(q) ||
    c.name_zh.toLowerCase().includes(q) ||
    c.hex.toLowerCase().replace('#','').includes(q.replace('#',''))
  )
}

function openDetail(color) {
  detail.value = color
  document.body.style.overflow = 'hidden'
}

function closeDetail() {
  detail.value = null
  document.body.style.overflow = ''
}

// Close on ESC
function onKey(e) { if (e.key === 'Escape') closeDetail() }

onMounted(async () => {
  window.addEventListener('keydown', onKey)
  try {
    colors.value = await api.getRalColors()
    filtered.value = colors.value
  } catch (e) { console.error(e) }
  finally { loading.value = false }
})
</script>

<style scoped>
.ral-page { min-height: 100vh; background: #f8faff; }

/* ── Header ── */
.page-header {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  padding: 40px 0 32px;
}
.header-content { text-align: center; }
.breadcrumb {
  display: flex; align-items: center; justify-content: center;
  gap: 8px; margin-bottom: 16px; font-size: 14px;
}
.breadcrumb-link { color: #6b7280; text-decoration: none; transition: color .2s; }
.breadcrumb-link:hover { color: var(--primary, #1a56db); }
.breadcrumb-sep { width: 14px; height: 14px; color: #d1d5db; }
.breadcrumb-current { color: #111827; font-weight: 600; }

.page-title {
  font-size: clamp(28px, 5vw, 42px);
  font-weight: 800; color: #111827;
  margin: 0 0 10px; display: flex; align-items: center;
  justify-content: center; gap: 12px;
}
.palette-icon { font-size: 36px; }
.page-subtitle { color: #6b7280; font-size: 16px; margin: 0 0 28px; }

/* ── Search ── */
.search-wrap {
  position: relative;
  max-width: 560px; margin: 0 auto 12px;
}
.search-icon {
  position: absolute; left: 16px; top: 50%;
  transform: translateY(-50%); font-size: 16px; pointer-events: none;
}
.search-input {
  width: 100%; padding: 13px 44px 13px 46px;
  border: 2px solid #e5e7eb; border-radius: 12px;
  font-size: 15px; outline: none; background: #fff;
  transition: border-color .2s, box-shadow .2s;
  box-sizing: border-box;
}
.search-input:focus {
  border-color: var(--primary, #1a56db);
  box-shadow: 0 0 0 3px rgba(26,86,219,.1);
}
.search-clear {
  position: absolute; right: 14px; top: 50%;
  transform: translateY(-50%); background: none; border: none;
  color: #9ca3af; font-size: 16px; cursor: pointer; padding: 4px;
}
.search-clear:hover { color: #374151; }
.result-count {
  font-size: 13px; color: #9ca3af;
  margin-top: 4px;
}

/* ── Grid ── */
.page-content { padding: 40px 0 60px; }
.loading-wrap {
  display: flex; justify-content: center; padding: 80px;
}
.spinner {
  width: 40px; height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: var(--primary, #1a56db);
  border-radius: 50%;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.empty-wrap {
  text-align: center; padding: 80px;
  color: #6b7280; font-size: 16px;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
}

.color-chip {
  border-radius: 12px; overflow: hidden;
  border: 1px solid #e5e7eb;
  background: #fff; cursor: pointer;
  transition: transform .2s, box-shadow .2s;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
}
.color-chip:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 30px rgba(0,0,0,.14);
}

.chip-swatch {
  height: 100px; position: relative;
}
.chip-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0);
  display: flex; align-items: center; justify-content: center;
  transition: background .2s;
}
.color-chip:hover .chip-overlay { background: rgba(0,0,0,.2); }
.chip-zoom { font-size: 22px; opacity: 0; transition: opacity .2s; }
.color-chip:hover .chip-zoom { opacity: 1; }

.chip-info {
  padding: 9px 10px 11px;
  border-top: 1px solid #f0f0f0;
}
.chip-code {
  display: block; font-size: 12px; font-weight: 700;
  color: #374151; letter-spacing: .4px;
}
.chip-name {
  display: block; font-size: 11px; color: #6b7280;
  margin-top: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* ── Lightbox ── */
.lightbox {
  position: fixed; inset: 0; z-index: 9000;
  background: rgba(0,0,0,.65); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.lightbox-card {
  background: #fff; border-radius: 20px;
  width: 100%; max-width: 680px;       /* 2× original 320px */
  overflow: hidden; position: relative;
  box-shadow: 0 40px 100px rgba(0,0,0,.45);
  animation: slideUp .2s ease;
}
@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

.lb-close {
  position: absolute; top: 14px; right: 14px; z-index: 10;
  width: 34px; height: 34px; border-radius: 50%;
  border: none; background: rgba(0,0,0,.35);
  color: #fff; font-size: 15px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s;
}
.lb-close:hover { background: rgba(0,0,0,.55); }

/* Swatch: full width, aspect 16/9 with height ~1× original */
.lb-swatch {
  width: 100%; height: 300px;     /* 1× increase from original 220px */
  position: relative;
  display: flex; align-items: flex-end;
}
.lb-code-badge {
  margin: 0 0 16px 20px;
  background: rgba(0,0,0,.45);
  color: #fff; font-size: 15px; font-weight: 700;
  padding: 6px 14px; border-radius: 20px;
  backdrop-filter: blur(4px);
}

.lb-body {
  padding: 24px 28px 28px;
}
.lb-name {
  font-size: 22px; font-weight: 800;
  color: #111827; margin: 0 0 18px;
}
.lb-meta { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.lb-meta-row {
  display: flex; align-items: center;
  padding: 10px 14px;
  background: #f8faff; border-radius: 8px;
  gap: 12px;
}
.lb-label {
  font-size: 12px; font-weight: 600; text-transform: uppercase;
  color: #9ca3af; letter-spacing: .5px; min-width: 90px;
}
.lb-value { font-size: 15px; color: #374151; font-weight: 500; }
.lb-value.mono { font-family: 'Courier New', monospace; color: #1a56db; }

.lb-swatch-mini {
  width: 100%; height: 10px; border-radius: 6px;
  margin-top: 4px;
}

/* Responsive */
@media (max-width: 640px) {
  .color-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 10px; }
  .chip-swatch { height: 80px; }
  .lightbox-card { max-width: 100%; border-radius: 14px; }
  .lb-swatch { height: 200px; }
}
</style>
