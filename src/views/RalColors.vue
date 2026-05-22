<template>
  <div class="ral-page">

    <!-- Page Header -->
    <div class="page-header" v-if="!hideHeader">
      <div class="container">
        <div class="header-content">
          <nav class="breadcrumb">
            <router-link :to="langPath('/')" class="breadcrumb-link">{{ t('home') }}</router-link>
            <svg class="breadcrumb-sep" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
            </svg>
            <span class="breadcrumb-current">{{ t('ralColorChart') }}</span>
          </nav>

          <h1 class="page-title">🎨 {{ t('ralColorChart') }}</h1>

          <!-- Search -->
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
        </div>
      </div>
    </div>

    <!-- Search (rendered only when header is hidden) -->
    <div class="search-wrap-embedded" v-if="hideHeader" style="max-width: 520px; margin: 0 auto 32px; position: relative;">
      <span class="search-icon" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); font-size: 16px; pointer-events: none;">🔍</span>
      <input
        v-model="searchQuery"
        class="search-input"
        :placeholder="t('ralSearchPlaceholder')"
        @input="filterColors"
        style="width: 100%; padding: 13px 44px 13px 46px; border: 2px solid #e5e7eb; border-radius: 12px; font-size: 15px; outline: none; background: #fff; box-sizing: border-box;"
      />
      <button v-if="searchQuery" class="search-clear" @click="searchQuery=''; filterColors()" style="position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #9ca3af; font-size: 16px; cursor: pointer; padding: 4px;">✕</button>
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
      <div v-if="detail" class="lightbox" @click.self="closeDetail">
        <div class="lightbox-card">
          <button class="lb-close" @click="closeDetail">✕</button>
          <!-- Color swatch: 80% of card height -->
          <div class="lb-swatch" :style="{ background: detail.hex }"></div>
          <!-- Info: only RAL code + localized name -->
          <div class="lb-body">
            <p class="lb-code">RAL {{ detail.code }}</p>
            <p class="lb-name">{{ detail.name }}</p>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useLang } from '../composables/useLang'
import api from '../api'

const { t, langPath } = useLang()

defineProps({
  hideHeader: {
    type: Boolean,
    default: false
  }
})

const colors   = ref([])
const filtered = ref([])
const loading  = ref(true)
const searchQuery = ref('')
const detail   = ref(null)

function filterColors() {
  const rawQ = searchQuery.value.trim().toLowerCase()
  if (!rawQ) { filtered.value = colors.value; return }
  
  // Normalize the query: remove 'ral' and any spaces/dashes prefix
  let codeQ = rawQ
  if (codeQ.startsWith('ral')) {
    codeQ = codeQ.replace(/^ral[\s-]?/, '')
  }

  filtered.value = colors.value.filter(c => {
    // If the query is just "ral", show all colors (as they are all RAL colors)
    if (rawQ === 'ral') return true

    const code = (c.code || '').toLowerCase()
    const name = (c.name || '').toLowerCase()
    const nameEn = (c.name_en || '').toLowerCase()
    const nameZh = (c.name_zh || '').toLowerCase()
    const hex = (c.hex || '').toLowerCase().replace('#', '')
    const cleanQ = rawQ.replace('#', '')

    const codeMatch = codeQ && code.includes(codeQ)

    return (
      codeMatch ||
      name.includes(rawQ) ||
      nameEn.includes(rawQ) ||
      nameZh.includes(rawQ) ||
      hex.includes(cleanQ)
    )
  })
}

function openDetail(color) {
  detail.value = color
  document.body.style.overflow = 'hidden'
}

function closeDetail() {
  detail.value = null
  document.body.style.overflow = ''
}

function onKey(e) {
  if (e.key === 'Escape') closeDetail()
}

onMounted(async () => {
  window.addEventListener('keydown', onKey)
  try {
    colors.value = await api.getRalColors()
    filtered.value = colors.value
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  // Always restore scroll when leaving page
  document.body.style.overflow = ''
})
</script>

<style scoped>
.ral-page { min-height: 100vh; background: #f8faff; }

/* ── Header ── */
.page-header {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  padding: 36px 0 28px;
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
  font-size: clamp(26px, 4vw, 38px);
  font-weight: 800; color: #111827;
  margin: 0 0 24px;
}

/* ── Search ── */
.search-wrap {
  position: relative;
  max-width: 520px; margin: 0 auto;
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

/* ── Grid ── */
.page-content { padding: 36px 0 60px; }
.loading-wrap { display: flex; justify-content: center; padding: 80px; }
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
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.lightbox {
  position: fixed; inset: 0; z-index: 9000;
  background: rgba(0,0,0,.65); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}

.lightbox-card {
  background: #fff; border-radius: 20px;
  width: 100%; max-width: 640px;
  overflow: hidden; position: relative;
  box-shadow: 0 40px 100px rgba(0,0,0,.45);
  animation: slideUp .2s ease;
  /* Total height: swatch 80% + info 20% */
  display: flex; flex-direction: column;
}
@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

.lb-close {
  position: absolute; top: 14px; right: 14px; z-index: 10;
  width: 36px; height: 36px; border-radius: 50%;
  border: none; background: rgba(0,0,0,.35);
  color: #fff; font-size: 16px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s;
}
.lb-close:hover { background: rgba(0,0,0,.55); }

/* Swatch: 80% of the card */
.lb-swatch {
  flex: 4;          /* ratio 4:1 with lb-body */
  min-height: 320px;
}

/* Info: 20% of the card — only code + name */
.lb-body {
  flex: 1;
  min-height: 80px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 14px 24px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  gap: 4px;
}
.lb-code {
  font-size: 15px; font-weight: 700;
  color: #374151; margin: 0;
  letter-spacing: .5px;
}
.lb-name {
  font-size: 18px; font-weight: 700;
  color: #111827; margin: 0;
}

/* Responsive */
@media (max-width: 640px) {
  .color-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 10px; }
  .chip-swatch { height: 80px; }
  .lightbox-card { max-width: 100%; border-radius: 14px; }
  .lb-swatch { min-height: 220px; }
}
</style>
