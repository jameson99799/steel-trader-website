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

          <!-- Category buttons -->
          <div class="cat-buttons" v-if="categories.length">
            <router-link
              v-for="c in categories"
              :key="c.id"
              :to="langPath(`/news/category/${c.slug}`)"
              :class="['cat-btn', activeCatSlug === c.slug ? 'active' : '']"
            >{{ localizedValue(c, 'name') }}</router-link>
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

// Derive active category from URL param
const activeCatSlug = computed(() => route.params.catSlug || null)
const activeCategory = computed(() =>
  activeCatSlug.value ? categories.value.find(c => c.slug === activeCatSlug.value) : null
)

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function goToArticle(item) {
  router.push(langPath(`/news/${item.slug || item.id}`))
}

async function loadCategories() {
  try {
    categories.value = await api.getNewsCategories()
  } catch (e) { console.error(e) }
}

async function loadNews() {
  loading.value = true
  try {
    const params = { page: page.value, limit }
    if (activeCatSlug.value) params.category_slug = activeCatSlug.value
    const res = await api.getNews(params)
    news.value = res.data
    total.value = res.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function changePage(p) {
  page.value = p
  loadNews()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Reload when route changes (e.g., clicking between categories)
watch(() => route.params.catSlug, () => {
  page.value = 1
  loadNews()
})

onMounted(() => {
  loadCategories()
  loadNews()
})
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

.page-title {
  font-size: var(--text-5xl); font-weight: 800;
  color: var(--text-primary); margin-bottom: var(--spacing-sm);
}

.page-subtitle { color: var(--text-secondary); font-size: var(--text-lg); margin-bottom: var(--spacing-lg); }

/* Category filter buttons — blue filled style */
.cat-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: var(--spacing);
}

.cat-btn {
  display: inline-flex;
  align-items: center;
  padding: 10px 28px;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.25s;
  border: 2px solid var(--primary, #1a56db);
  color: var(--primary, #1a56db);
  background: var(--white, #fff);
  cursor: pointer;
  letter-spacing: 0.01em;
}

.cat-btn:hover {
  background: var(--primary, #1a56db);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(26, 86, 219, 0.3);
}

.cat-btn.active {
  background: var(--primary, #1a56db);
  color: #fff;
  border-color: var(--primary, #1a56db);
  box-shadow: 0 4px 14px rgba(26, 86, 219, 0.35);
}

.page-content { padding: var(--spacing-2xl) 0; }

.news-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-2xl);
}

.news-card {
  background: var(--white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
  cursor: pointer;
  transition: var(--transition);
}

.news-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-xl);
}

.card-image { height: 200px; overflow: hidden; }

.card-image img {
  width: 100%; height: 100%;
  object-fit: cover;
  transition: transform 0.4s;
}

.news-card:hover .card-image img { transform: scale(1.05); }

.card-image-placeholder {
  background: var(--gray-100);
  display: flex; align-items: center; justify-content: center;
}

.card-image-placeholder svg { width: 48px; height: 48px; color: var(--text-muted); }

.card-body { padding: var(--spacing-md) var(--spacing-lg) var(--spacing-lg); }

.card-title {
  font-size: var(--text-xl); font-weight: 700;
  color: var(--text-primary); margin-bottom: var(--spacing-sm);
  line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}

.card-summary {
  color: var(--text-secondary); font-size: var(--text-sm);
  line-height: 1.6; margin-bottom: var(--spacing);
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}

.card-meta {
  display: flex; justify-content: space-between; align-items: center;
  font-size: var(--text-sm);
}

.card-date { color: var(--text-muted); }

.read-more {
  color: var(--primary); font-weight: 600;
  transition: var(--transition);
}

.news-card:hover .read-more { color: var(--primary-dark); }

.pagination {
  display: flex; align-items: center; justify-content: center;
  gap: var(--spacing-md);
}

.page-btn {
  padding: 10px 20px; border: 2px solid var(--border);
  border-radius: var(--radius); background: var(--white);
  cursor: pointer; transition: var(--transition); font-weight: 600;
}

.page-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { color: var(--text-secondary); font-size: var(--text-sm); }

.loading-state, .empty-state {
  text-align: center; padding: var(--spacing-2xl);
  color: var(--text-secondary);
}

.spinner {
  width: 40px; height: 40px; border: 3px solid var(--border);
  border-top-color: var(--primary); border-radius: 50%;
  animation: spin 0.8s linear infinite; margin: 0 auto 16px;
}

@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 1024px) { .news-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) {
  .news-grid { grid-template-columns: 1fr; }
  .page-title { font-size: var(--text-4xl); }
  .cat-btn { padding: 8px 18px; font-size: 13px; }
}
</style>
