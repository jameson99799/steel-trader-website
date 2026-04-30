<template>
  <div class="news-page">
    <div class="page-header">
      <div class="container">
        <div class="header-content">
          <nav class="breadcrumb">
            <router-link :to="langPath('/')" class="breadcrumb-link">{{ t('home') }}</router-link>
            <svg class="breadcrumb-separator" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
            <router-link :to="langPath('/news')" class="breadcrumb-link">{{ t('news') }}</router-link>
            <template v-if="activeCategory">
              <svg class="breadcrumb-separator" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
              <span class="breadcrumb-current">{{ localizedValue(activeCategory, 'name') }}</span>
            </template>
          </nav>
          <h1 class="page-title">{{ activeCategory ? localizedValue(activeCategory, 'name') : t('newsUpdates') }}</h1>
          <p class="page-subtitle">{{ activeCategory ? t('browseArticlesIn') + ' ' + localizedValue(activeCategory, 'name') : t('newsSubtitle') }}</p>

          <!-- Category buttons + RAL Color button -->
          <div class="cat-buttons" v-if="categories.length || true">
            <router-link
              v-for="c in categories"
              :key="c.id"
              :to="langPath(`/news/category/${c.slug}`)"
              :class="['cat-btn', activeCatSlug === c.slug ? 'active' : '']"
            >{{ localizedValue(c, 'name') }}</router-link>
            <button class="cat-btn ral-btn" @click="openRalModal">
              <span class="ral-icon">🎨</span> RAL Color
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="page-content">
      <div class="container">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>{{ t('loadingNews') }}</p>
        </div>
        <div v-else-if="news.length === 0" class="empty-state">
          <p>{{ t('noNewsYet') }}</p>
        </div>
        <div v-else class="news-grid">
          <article v-for="item in news" :key="item.id" class="news-card" @click="goToArticle(item)">
            <div class="card-image" v-if="item.cover_image">
              <img :src="item.cover_image" :alt="localizedValue(item, 'title')" />
            </div>
            <div class="card-image card-image-placeholder" v-else>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8.5 3.5c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm7 13H6.5v-.75c0-2.33 4.67-3.5 7-3.5s7 1.17 7 3.5V19.5z"/></svg>
            </div>
            <div class="card-body">
              <h2 class="card-title">{{ localizedValue(item, 'title') }}</h2>
              <p class="card-summary" v-if="localizedValue(item, 'summary')">{{ localizedValue(item, 'summary') }}</p>
              <div class="card-meta">
                <span class="card-date">{{ formatDate(item.created_at) }}</span>
                <span class="read-more">{{ t('readMore') }}</span>
              </div>
            </div>
          </article>
        </div>

        <!-- Pagination -->
        <div class="pagination" v-if="total > limit">
          <button class="page-btn" :disabled="page <= 1" @click="changePage(page - 1)">{{ t('prevPage') }}</button>
          <span class="page-info">{{ t('pageOf') }} {{ page }} / {{ Math.ceil(total / limit) }}</span>
          <button class="page-btn" :disabled="page >= Math.ceil(total / limit)" @click="changePage(page + 1)">{{ t('nextPage') }}</button>
        </div>
      </div>
    </div>

    <!-- ── RAL Color Modal ───────────────────────────────────────────────── -->
    <div v-if="ralModalOpen" class="ral-overlay" @click.self="closeRalModal">
      <div class="ral-modal">
        <div class="ral-modal-header">
          <div class="ral-header-left">
            <span class="ral-title-icon">🎨</span>
            <h2 class="ral-title">RAL Color Chart</h2>
            <span class="ral-count">{{ ralFiltered.length }} colors</span>
          </div>
          <button class="ral-close" @click="closeRalModal">✕</button>
        </div>

        <!-- Search -->
        <div class="ral-search-wrap">
          <span class="ral-search-icon">🔍</span>
          <input
            v-model="ralSearch"
            class="ral-search"
            placeholder="Search RAL code or color name… (e.g. 9002 or white)"
            @input="filterRal"
          />
          <button v-if="ralSearch" class="ral-search-clear" @click="ralSearch=''; filterRal()">✕</button>
        </div>

        <!-- Color Grid -->
        <div class="ral-grid-wrap">
          <div v-if="ralLoading" class="ral-loading">
            <div class="ral-spinner"></div>
            <span>Loading colors...</span>
          </div>
          <div v-else-if="ralFiltered.length === 0" class="ral-empty">
            No colors found for "{{ ralSearch }}"
          </div>
          <div v-else class="ral-grid">
            <div
              v-for="color in ralFiltered"
              :key="color.code"
              class="ral-chip"
              :title="'RAL ' + color.code + ' — ' + color.name"
              @click="openRalDetail(color)"
            >
              <div class="ral-swatch" :style="{ background: color.hex }">
                <div class="ral-swatch-overlay">
                  <span class="ral-zoom-icon">🔍</span>
                </div>
              </div>
              <div class="ral-chip-info">
                <span class="ral-code">RAL {{ color.code }}</span>
                <span class="ral-name">{{ color.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── RAL Color Detail Lightbox ──────────────────────────────────────── -->
    <div v-if="ralDetail" class="ral-detail-overlay" @click.self="ralDetail=null">
      <div class="ral-detail-card">
        <button class="ral-detail-close" @click="ralDetail=null">✕</button>
        <div class="ral-detail-swatch" :style="{ background: ralDetail.hex }"></div>
        <div class="ral-detail-info">
          <p class="ral-detail-code">RAL {{ ralDetail.code }}</p>
          <p class="ral-detail-name">{{ ralDetail.name }}</p>
          <p class="ral-detail-hex">{{ ralDetail.hex }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useLang } from '../composables/useLang'
import api from '../api'

const { t, localizedValue, langPath } = useLang()
const router = useRouter()
const route = useRoute()

const news = ref([])
const loading = ref(true)
const total = ref(0)
const page = ref(1)
const limit = 12
const categories = ref([])

const activeCatSlug = computed(() => route.params.catSlug || null)
const activeCategory = computed(() =>
  activeCatSlug.value ? categories.value.find(c => c.slug === activeCatSlug.value) : null
)

// ── RAL Color Modal ─────────────────────────────────────────────────────────
const ralModalOpen = ref(false)
const ralLoading = ref(false)
const ralColors = ref([])
const ralSearch = ref('')
const ralFiltered = ref([])
const ralDetail = ref(null)

function filterRal() {
  const q = ralSearch.value.trim().toLowerCase()
  if (!q) { ralFiltered.value = ralColors.value; return }
  ralFiltered.value = ralColors.value.filter(c =>
    c.code.includes(q) ||
    c.name.toLowerCase().includes(q) ||
    c.name_zh.toLowerCase().includes(q) ||
    c.name_en.toLowerCase().includes(q) ||
    c.hex.toLowerCase().includes(q)
  )
}

async function openRalModal() {
  ralModalOpen.value = true
  document.body.style.overflow = 'hidden'
  if (ralColors.value.length === 0) {
    ralLoading.value = true
    try {
      ralColors.value = await api.getRalColors()
      filterRal()
    } catch (e) { console.error(e) }
    finally { ralLoading.value = false }
  }
}

function closeRalModal() {
  ralModalOpen.value = false
  document.body.style.overflow = ''
}

function openRalDetail(color) {
  ralDetail.value = color
}

// ── News ─────────────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function goToArticle(item) {
  router.push(langPath(`/news/${item.slug || item.id}`))
}

async function loadCategories() {
  try { categories.value = await api.getNewsCategories() } catch (e) { console.error(e) }
}

async function loadNews() {
  loading.value = true
  try {
    const params = { page: page.value, limit }
    if (activeCatSlug.value) params.category_slug = activeCatSlug.value
    const res = await api.getNews(params)
    news.value = res.data
    total.value = res.total
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

function changePage(p) {
  page.value = p
  loadNews()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

watch(() => route.params.catSlug, () => { page.value = 1; loadNews() })

onMounted(() => { loadCategories(); loadNews() })
</script>

<style scoped>
.news-page { min-height: 100vh; background: var(--gray-50); }

.page-header {
  background: var(--white);
  border-bottom: 1px solid var(--border);
  padding: var(--spacing-xl) 0 var(--spacing-lg);
}

.header-content { text-align: center; }

.breadcrumb {
  display: flex; align-items: center; justify-content: center;
  gap: var(--spacing-sm); margin-bottom: var(--spacing); font-size: var(--text-sm);
}
.breadcrumb-link { color: var(--text-secondary); transition: var(--transition); text-decoration: none; }
.breadcrumb-link:hover { color: var(--primary); }
.breadcrumb-separator { width: 16px; height: 16px; color: var(--text-muted); }
.breadcrumb-current { color: var(--text-primary); font-weight: 600; }

.page-title { font-size: var(--text-5xl); font-weight: 800; color: var(--text-primary); margin-bottom: var(--spacing-sm); }
.page-subtitle { color: var(--text-secondary); font-size: var(--text-lg); margin-bottom: var(--spacing-lg); }

/* ── Category + RAL buttons ── */
.cat-buttons {
  display: flex; align-items: center; justify-content: center;
  gap: 10px; margin-top: var(--spacing); flex-wrap: wrap;
}

.cat-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 24px; border-radius: 6px; font-size: 15px;
  font-weight: 600; text-decoration: none; transition: all 0.25s;
  border: 2px solid var(--primary, #1a56db);
  color: var(--primary, #1a56db); background: var(--white, #fff);
  cursor: pointer; letter-spacing: 0.01em;
}
.cat-btn:hover {
  background: var(--primary, #1a56db); color: #fff;
  transform: translateY(-2px); box-shadow: 0 4px 12px rgba(26,86,219,.3);
}
.cat-btn.active {
  background: var(--primary, #1a56db); color: #fff;
  border-color: var(--primary, #1a56db); box-shadow: 0 4px 14px rgba(26,86,219,.35);
}

/* RAL button — rainbow gradient border */
.ral-btn {
  border: 2px solid transparent;
  background: linear-gradient(var(--white,#fff),var(--white,#fff)) padding-box,
              linear-gradient(135deg,#e74c3c,#e67e22,#f1c40f,#2ecc71,#3498db,#9b59b6) border-box;
  color: #555; font-weight: 700;
}
.ral-btn:hover {
  background: linear-gradient(135deg,#e74c3c,#e67e22,#f1c40f,#2ecc71,#3498db,#9b59b6) border-box;
  background: linear-gradient(135deg,#e74c3c10,#3498db10) padding-box,
              linear-gradient(135deg,#e74c3c,#e67e22,#f1c40f,#2ecc71,#3498db,#9b59b6) border-box;
  color: #333; transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(100,100,200,.25);
}
.ral-icon { font-size: 16px; }

/* ── News Grid ── */
.page-content { padding: var(--spacing-2xl) 0; }
.news-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: var(--spacing-xl); margin-bottom: var(--spacing-2xl); }
.news-card { background: var(--white); border-radius: var(--radius-lg); box-shadow: var(--shadow); overflow: hidden; cursor: pointer; transition: var(--transition); }
.news-card:hover { transform: translateY(-6px); box-shadow: var(--shadow-xl); }
.card-image { height: 200px; overflow: hidden; }
.card-image img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
.news-card:hover .card-image img { transform: scale(1.05); }
.card-image-placeholder { background: var(--gray-100); display: flex; align-items: center; justify-content: center; }
.card-image-placeholder svg { width: 48px; height: 48px; color: var(--text-muted); }
.card-body { padding: var(--spacing-md) var(--spacing-lg) var(--spacing-lg); }
.card-title { font-size: var(--text-xl); font-weight: 700; color: var(--text-primary); margin-bottom: var(--spacing-sm); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card-summary { color: var(--text-secondary); font-size: var(--text-sm); line-height: 1.6; margin-bottom: var(--spacing); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.card-meta { display: flex; justify-content: space-between; align-items: center; font-size: var(--text-sm); }
.card-date { color: var(--text-muted); }
.read-more { color: var(--primary); font-weight: 600; transition: var(--transition); }
.news-card:hover .read-more { color: var(--primary-dark); }
.pagination { display: flex; align-items: center; justify-content: center; gap: var(--spacing-md); }
.page-btn { padding: 10px 20px; border: 2px solid var(--border); border-radius: var(--radius); background: var(--white); cursor: pointer; transition: var(--transition); font-weight: 600; }
.page-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { color: var(--text-secondary); font-size: var(--text-sm); }
.loading-state, .empty-state { text-align: center; padding: var(--spacing-2xl); color: var(--text-secondary); }
.spinner { width: 40px; height: 40px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ══════════════════════════════════════════
   RAL COLOR MODAL
══════════════════════════════════════════ */
.ral-overlay {
  position: fixed; inset: 0; z-index: 9000;
  background: rgba(0,0,0,.55); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  animation: fadeIn .18s ease;
}
@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }

.ral-modal {
  background: #fff; border-radius: 16px;
  width: 100%; max-width: 1100px; height: 88vh;
  display: flex; flex-direction: column;
  box-shadow: 0 24px 80px rgba(0,0,0,.35);
  overflow: hidden;
  animation: slideUp .2s ease;
}
@keyframes slideUp { from { transform: translateY(24px); opacity:0 } to { transform: translateY(0); opacity:1 } }

.ral-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(135deg, #f8faff 0%, #fff 100%);
  flex-shrink: 0;
}
.ral-header-left { display: flex; align-items: center; gap: 12px; }
.ral-title-icon { font-size: 28px; }
.ral-title { font-size: 22px; font-weight: 800; color: #1a1a2e; margin: 0; }
.ral-count { font-size: 13px; color: #6b7280; background: #f3f4f6; padding: 3px 10px; border-radius: 20px; }
.ral-close {
  width: 36px; height: 36px; border-radius: 50%; border: none;
  background: #f3f4f6; color: #6b7280; font-size: 16px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all .18s;
}
.ral-close:hover { background: #e5e7eb; color: #374151; }

.ral-search-wrap {
  position: relative; padding: 14px 24px;
  border-bottom: 1px solid #f0f0f0; flex-shrink: 0;
  background: #fafafa;
}
.ral-search-icon { position: absolute; left: 38px; top: 50%; transform: translateY(-50%); font-size: 16px; }
.ral-search {
  width: 100%; padding: 11px 40px 11px 44px;
  border: 2px solid #e5e7eb; border-radius: 10px;
  font-size: 15px; outline: none; background: #fff;
  transition: border-color .18s;
}
.ral-search:focus { border-color: #3b82f6; }
.ral-search-clear {
  position: absolute; right: 38px; top: 50%; transform: translateY(-50%);
  background: none; border: none; color: #9ca3af; font-size: 16px;
  cursor: pointer; padding: 4px;
}
.ral-search-clear:hover { color: #374151; }

.ral-grid-wrap {
  flex: 1; overflow-y: auto; padding: 20px 24px;
}
.ral-loading, .ral-empty {
  display: flex; align-items: center; justify-content: center;
  gap: 12px; padding: 60px; color: #6b7280; font-size: 16px;
}
.ral-spinner {
  width: 28px; height: 28px; border: 3px solid #e5e7eb;
  border-top-color: #3b82f6; border-radius: 50%;
  animation: spin .7s linear infinite;
}

.ral-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 14px;
}

.ral-chip {
  border-radius: 10px; overflow: hidden;
  border: 1px solid #e5e7eb; cursor: pointer;
  transition: transform .18s, box-shadow .18s;
  background: #fff;
}
.ral-chip:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,.14); }

.ral-swatch {
  height: 90px; position: relative;
}
.ral-swatch-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,.0);
  display: flex; align-items: center; justify-content: center;
  transition: background .18s;
}
.ral-chip:hover .ral-swatch-overlay { background: rgba(0,0,0,.18); }
.ral-zoom-icon { font-size: 20px; opacity: 0; transition: opacity .18s; }
.ral-chip:hover .ral-zoom-icon { opacity: 1; }

.ral-chip-info {
  padding: 8px 8px 10px;
  background: #fff; border-top: 1px solid #f0f0f0;
}
.ral-code {
  display: block; font-size: 12px; font-weight: 700;
  color: #374151; letter-spacing: .5px;
}
.ral-name {
  display: block; font-size: 11px; color: #6b7280;
  margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* ── RAL Detail Lightbox ── */
.ral-detail-overlay {
  position: fixed; inset: 0; z-index: 9100;
  background: rgba(0,0,0,.7); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  animation: fadeIn .15s ease;
}
.ral-detail-card {
  background: #fff; border-radius: 20px;
  width: 320px; overflow: hidden;
  box-shadow: 0 32px 80px rgba(0,0,0,.4);
  position: relative;
  animation: slideUp .18s ease;
}
.ral-detail-close {
  position: absolute; top: 12px; right: 12px;
  width: 32px; height: 32px; border-radius: 50%;
  background: rgba(0,0,0,.3); border: none; color: #fff;
  font-size: 14px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s;
}
.ral-detail-close:hover { background: rgba(0,0,0,.5); }
.ral-detail-swatch { height: 220px; }
.ral-detail-info { padding: 20px 24px 24px; text-align: center; }
.ral-detail-code { font-size: 20px; font-weight: 800; color: #1a1a2e; margin: 0 0 6px; }
.ral-detail-name { font-size: 16px; color: #374151; margin: 0 0 8px; }
.ral-detail-hex { font-size: 13px; color: #9ca3af; font-family: monospace; margin: 0; }

/* Responsive */
@media (max-width: 1024px) { .news-grid { grid-template-columns: repeat(2,1fr); } }
@media (max-width: 640px) {
  .news-grid { grid-template-columns: 1fr; }
  .page-title { font-size: var(--text-4xl); }
  .cat-btn { padding: 8px 16px; font-size: 13px; }
  .ral-grid { grid-template-columns: repeat(auto-fill, minmax(100px,1fr)); gap: 10px; }
  .ral-modal { height: 95vh; border-radius: 12px; }
}
</style>
