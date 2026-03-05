<template>
  <div class="news-detail-page" v-if="article">
    <!-- SEO meta tags injected via document title -->
    <div class="page-header">
      <div class="container">
        <nav class="breadcrumb">
          <router-link to="/" class="breadcrumb-link">Home</router-link>
          <svg class="breadcrumb-separator" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
          <router-link to="/news" class="breadcrumb-link">News</router-link>
          <svg class="breadcrumb-separator" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
          <span class="breadcrumb-current">{{ localizedValue(article, 'title') }}</span>
        </nav>
      </div>
    </div>

    <div class="article-content">
      <div class="container">
        <article class="article-wrap">
          <header class="article-header">
            <h1 class="article-title">{{ localizedValue(article, 'title') }}</h1>
            <div class="article-meta">
              <span class="article-date">{{ formatDate(article.created_at) }}</span>
            </div>
            <p class="article-summary" v-if="localizedValue(article, 'summary')">
              {{ localizedValue(article, 'summary') }}
            </p>
          </header>

          <div class="article-cover" v-if="article.cover_image">
            <img :src="article.cover_image" :alt="localizedValue(article, 'title')" />
          </div>

          <div class="article-body ql-snow" v-if="article.content">
            <div class="ql-editor" v-html="article.content"></div>
          </div>

          <div class="article-footer">
            <router-link to="/news" class="back-link">
              ← Back to News
            </router-link>
          </div>
        </article>
      </div>
    </div>

    <!-- Product Categories Section -->
    <div class="categories-section" v-if="allCategories.length">
      <div class="container">
        <div class="section-hdr">
          <h2>Product Categories</h2>
          <p>{{ pageTexts?.categories_subtitle || 'Explore our comprehensive range of LED products' }}</p>
        </div>
        <div class="categories-grid">
          <router-link
            v-for="cat in allCategories"
            :key="cat.id"
            :to="`/products?category_id=${cat.id}`"
            class="cat-card"
          >
            <div class="cat-image" v-if="cat.image">
              <img :src="cat.image" :alt="localizedValue(cat, 'name')" />
            </div>
            <div class="cat-image cat-image-placeholder" v-else>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>
            </div>
            <div class="cat-info">
              <h3>{{ localizedValue(cat, 'name') }}</h3>
              <span v-if="cat.product_count" class="cat-count">{{ cat.product_count }} products</span>
            </div>
          </router-link>
        </div>
      </div>
    </div>
  </div>

  <div v-else-if="loading" class="loading-state">
    <div class="container">
      <div class="spinner"></div>
      <p>Loading article...</p>
    </div>
  </div>

  <div v-else class="not-found">
    <div class="container">
      <h2>Article not found</h2>
      <router-link to="/news" class="btn btn-primary">Back to News</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useLang } from '../composables/useLang'
import api from '../api'
import 'quill/dist/quill.snow.css'

const route = useRoute()
const { localizedValue } = useLang()

const article = ref(null)
const loading = ref(true)
const allCategories = ref([])
const pageTexts = ref(null)

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

async function loadArticle(slug) {
  loading.value = true
  article.value = null
  try {
    const [art, cats, texts] = await Promise.all([
      api.getNewsItem(slug),
      api.getCategories(),
      api.getPageTexts()
    ])
    article.value = art
    allCategories.value = cats || []
    pageTexts.value = texts
    if (article.value) {
      document.title = article.value.seo_title || localizedValue(article.value, 'title')
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadArticle(route.params.slug))
watch(() => route.params.slug, (slug) => { if (slug) loadArticle(slug) })
</script>

<style scoped>
.news-detail-page { min-height: 100vh; background: var(--gray-50); }

.page-header {
  background: var(--white);
  border-bottom: 1px solid var(--border);
  padding: var(--spacing-md) 0;
}

.breadcrumb {
  display: flex; align-items: center; gap: var(--spacing-sm);
  font-size: var(--text-sm);
}

.breadcrumb-link { color: var(--text-secondary); transition: var(--transition); }
.breadcrumb-link:hover { color: var(--primary); }
.breadcrumb-separator { width: 14px; height: 14px; color: var(--text-muted); }
.breadcrumb-current { color: var(--text-primary); font-weight: 600;
  max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.article-content { padding: var(--spacing-2xl) 0; }

.article-wrap {
  max-width: 860px; margin: 0 auto;
  background: var(--white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.article-header {
  padding: var(--spacing-2xl) var(--spacing-2xl) var(--spacing-xl);
}

.article-title {
  font-size: var(--text-4xl); font-weight: 800;
  color: var(--text-primary); line-height: var(--leading-tight);
  margin-bottom: var(--spacing);
}

.article-meta { margin-bottom: var(--spacing); }
.article-date { color: var(--text-muted); font-size: var(--text-sm); }

.article-summary {
  font-size: var(--text-lg); color: var(--text-secondary);
  line-height: 1.7; font-style: italic;
  border-left: 4px solid var(--primary); padding-left: var(--spacing);
}

.article-cover {
  width: 100%; max-height: 480px; overflow: hidden;
}

.article-cover img {
  width: 100%; height: 100%; object-fit: cover;
}

.article-body {
  padding: var(--spacing-2xl);
}

:deep(.ql-editor) {
  padding: 0;
  font-size: 16px;
  line-height: 1.8;
  color: var(--text-primary);
}

:deep(.ql-editor) p { margin-bottom: 16px; font-size: 0; }
:deep(.ql-editor) p > * { font-size: 16px; }
:deep(.ql-editor h1), :deep(.ql-editor h2), :deep(.ql-editor h3) { margin: 24px 0 12px; font-weight: 700; font-size: revert; }
:deep(.ql-editor img) {
  max-width: 100%; border-radius: 8px;
  display: inline-block; vertical-align: top; height: auto;
}
:deep(.ql-editor) figure {
  text-align: center; margin: 16px 0;
}
:deep(.ql-editor) figcaption {
  text-align: center; color: #666; font-size: 13px; margin-top: 4px;
}
:deep(.ql-editor table) { width: 100%; border-collapse: collapse; margin: 16px 0; }
:deep(.ql-editor td), :deep(.ql-editor th) { border: 1px solid #d1d5db; padding: 8px 12px; }
:deep(.ql-editor th) { background: var(--gray-50); font-weight: 600; }

.article-footer {
  padding: var(--spacing-xl) var(--spacing-2xl) var(--spacing-2xl);
  border-top: 1px solid var(--border);
}

.back-link {
  display: inline-flex; align-items: center; gap: 6px;
  color: var(--primary); font-weight: 600;
  transition: var(--transition);
}

.back-link:hover { gap: 10px; }

/* ── Product Categories ── */
.categories-section {
  background: var(--white);
  padding: var(--spacing-2xl) 0;
  border-top: 1px solid var(--border);
  margin-top: var(--spacing-xl);
}

.section-hdr {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.section-hdr h2 {
  font-size: var(--text-3xl);
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
}

.section-hdr p {
  color: var(--text-secondary);
  font-size: var(--text-lg);
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--spacing-lg);
}

.cat-card {
  background: var(--gray-50);
  border-radius: var(--radius);
  overflow: hidden;
  text-decoration: none;
  transition: var(--transition);
  border: 1px solid var(--border);
}

.cat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  border-color: var(--primary);
}

.cat-image {
  height: 120px;
  overflow: hidden;
  background: linear-gradient(135deg, #f0f4ff, #e8f0fe);
  display: flex; align-items: center; justify-content: center;
}

.cat-image img { width: 100%; height: 100%; object-fit: cover; }
.cat-image-placeholder svg { width: 40px; height: 40px; color: var(--text-muted); }

.cat-info { padding: var(--spacing-sm) var(--spacing); }
.cat-info h3 { font-size: var(--text-sm); font-weight: 700; color: var(--text-primary); margin-bottom: 2px; }
.cat-count { font-size: 11px; color: var(--text-muted); }

.loading-state, .not-found {
  min-height: 60vh; display: flex; align-items: center;
  justify-content: center; text-align: center;
  flex-direction: column; gap: 16px; color: var(--text-secondary);
}

.spinner {
  width: 40px; height: 40px; border: 3px solid var(--border);
  border-top-color: var(--primary); border-radius: 50%;
  animation: spin 0.8s linear infinite; margin: 0 auto 16px;
}

@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .article-header { padding: var(--spacing-xl) var(--spacing-md) var(--spacing-md); }
  .article-title { font-size: var(--text-3xl); }
  .article-body { padding: var(--spacing-md); }
  .article-footer { padding: var(--spacing-md); }
}
</style>
