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

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

async function loadArticle(slug) {
  loading.value = true
  article.value = null
  try {
    article.value = await api.getNewsItem(slug)
    // Set page SEO title
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

:deep(.ql-editor p) { margin-bottom: 16px; }
:deep(.ql-editor h1, .ql-editor h2, .ql-editor h3) { margin: 24px 0 12px; font-weight: 700; }
:deep(.ql-editor img) { max-width: 100%; border-radius: 8px; }

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
