<template>
  <transition name="modal-fade">
    <div v-if="show" class="ral-modal-overlay" @click.self="closeModal">
      <div class="ral-modal-container">
        <!-- Header -->
        <div class="modal-header">
          <h3 class="modal-title">Select RAL Color</h3>
          <button class="modal-close" @click="closeModal">✕</button>
        </div>

        <!-- Search -->
        <div class="modal-search">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            class="search-input"
            placeholder="Search RAL code or color name..."
            @input="filterColors"
          />
          <button v-if="searchQuery" class="search-clear" @click="searchQuery=''; filterColors()">✕</button>
        </div>

        <!-- Content -->
        <div class="modal-body">
          <div v-if="loading" class="loading-wrap">
            <div class="spinner"></div>
          </div>
          <div v-else-if="filtered.length === 0" class="empty-wrap">
            No colors found for "{{ searchQuery }}"
          </div>
          <div v-else class="color-grid">
            <div
              v-for="color in filtered"
              :key="color.code"
              class="color-chip"
              @click="selectColor(color)"
            >
              <div class="chip-swatch" :style="{ background: color.hex }"></div>
              <div class="chip-info">
                <span class="chip-code">RAL {{ color.code }}</span>
                <span class="chip-name" :title="color.name">{{ color.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import api from '../api'

const props = defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['update:show', 'select'])

const colors = ref([])
const filtered = ref([])
const loading = ref(true)
const searchQuery = ref('')

function closeModal() {
  emit('update:show', false)
}

function selectColor(color) {
  emit('select', color)
  closeModal()
}

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

function onKey(e) {
  if (e.key === 'Escape' && props.show) closeModal()
}

watch(() => props.show, async (newVal) => {
  if (newVal) {
    document.body.style.overflow = 'hidden'
    if (colors.value.length === 0) {
      loading.value = true
      try {
        colors.value = await api.getRalColors()
        filtered.value = colors.value
      } catch (e) {
        console.error(e)
      } finally {
        loading.value = false
      }
    }
  } else {
    document.body.style.overflow = ''
  }
})

onMounted(() => {
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

.ral-modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  z-index: 10000;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}

.ral-modal-container {
  background: #fff;
  border-radius: 12px;
  width: 100%; max-width: 800px;
  max-height: 90vh;
  display: flex; flex-direction: column;
  box-shadow: 0 20px 40px rgba(0,0,0,0.2);
  overflow: hidden;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex; justify-content: space-between; align-items: center;
}
.modal-title { margin: 0; font-size: 18px; font-weight: 700; color: #1e293b; }
.modal-close {
  background: none; border: none; font-size: 20px; color: #64748b;
  cursor: pointer; padding: 4px; line-height: 1; transition: color 0.2s;
}
.modal-close:hover { color: #0f172a; }

.modal-search {
  position: relative; padding: 16px 24px;
  border-bottom: 1px solid #e2e8f0; background: #f8fafc;
}
.search-icon { position: absolute; left: 36px; top: 50%; transform: translateY(-50%); font-size: 14px; opacity: 0.5; }
.search-input {
  width: 100%; padding: 10px 36px; border: 1px solid #cbd5e1; border-radius: 6px;
  font-size: 14px; outline: none; transition: border-color 0.2s;
}
.search-input:focus { border-color: #3b82f6; }
.search-clear {
  position: absolute; right: 36px; top: 50%; transform: translateY(-50%);
  background: none; border: none; color: #94a3b8; cursor: pointer;
}

.modal-body {
  flex: 1; overflow-y: auto; padding: 24px; background: #f1f5f9;
}

.loading-wrap { display: flex; justify-content: center; padding: 40px; }
.spinner { width: 30px; height: 30px; border: 3px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.empty-wrap { text-align: center; padding: 40px; color: #64748b; }

.color-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px;
}
.color-chip {
  background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;
  cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;
}
.color-chip:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-color: #cbd5e1; }
.chip-swatch { height: 70px; width: 100%; }
.chip-info { padding: 8px; text-align: center; }
.chip-code { display: block; font-size: 11px; font-weight: 700; color: #334155; }
.chip-name { display: block; font-size: 10px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }

@media (max-width: 600px) {
  .color-grid { grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); }
  .modal-body { padding: 16px; }
}
</style>
