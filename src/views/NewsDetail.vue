<template>
  <div class="news-detail-page" v-if="article">
    <!-- SEO meta tags injected via document title -->
    <div class="page-header">
      <div class="container">
        <nav class="breadcrumb">
          <router-link :to="langPath('/')" class="breadcrumb-link">{{ t('home') }}</router-link>
          <svg class="breadcrumb-separator" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
          <router-link :to="langPath('/news')" class="breadcrumb-link">{{ t('news') }}</router-link>
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
              <span class="article-author" v-if="seoSettings?.default_news_author">
                <span class="meta-divider">•</span>
                <svg style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>
                {{ seoSettings.default_news_author }}
              </span>
            </div>
            <p class="article-summary" v-if="localizedValue(article, 'summary')">
              {{ localizedValue(article, 'summary') }}
            </p>
          </header>

          <div class="article-cover" v-if="article.cover_image">
            <img :src="article.cover_image" :alt="localizedValue(article, 'title')" />
          </div>

          <!-- iframe mode: full HTML isolation (supports <style> tags) -->
          <div class="article-body" v-if="article.content && article.render_mode === 'iframe'">
            <iframe
              ref="articleIframe"
              class="article-iframe"
              :srcdoc="iframeContent"
              frameborder="0"
              scrolling="no"
              @load="resizeIframe"
            ></iframe>
          </div>

          <!-- direct mode: v-html (better SEO, strips only <style>/<script> tags) -->
          <div class="article-body article-body-direct" v-else-if="article.content" v-html="sanitizedContent" @click="handleBodyClick"></div>

          <div class="article-footer">
            <router-link :to="langPath('/news')" class="back-link">
              {{ t('backToNews') }}
            </router-link>
          </div>
        </article>
      </div>
    </div>

    <!-- Related News Section (SEO internal linking) -->
    <div class="related-news-section" v-if="relatedNews.length">
      <div class="container">
        <div class="section-hdr">
          <h2>{{ t('relatedArticles') || 'Related Articles' }}</h2>
          <p>{{ t('relatedArticlesDesc') || 'More insights you might find useful' }}</p>
        </div>
        <div class="related-news-grid">
          <router-link
            v-for="rn in relatedNews"
            :key="rn.id"
            :to="langPath(`/news/${rn.slug || rn.id}`)"
            class="rn-card"
          >
            <div class="rn-image">
              <img :src="rn.cover_image" :alt="localizedValue(rn, 'title')" v-if="rn.cover_image" />
              <div class="rn-placeholder" v-else>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z"/></svg>
              </div>
            </div>
            <div class="rn-info">
              <h3>{{ localizedValue(rn, 'title') }}</h3>
              <span class="rn-date">{{ formatDate(rn.created_at) }}</span>
            </div>
          </router-link>
        </div>
      </div>
    </div>

    <!-- Product Categories Section -->
    <div class="categories-section" v-if="allCategories.length">
      <div class="container">
        <div class="section-hdr">
          <h2>{{ t('productCategories') }}</h2>
          <p>{{ localizedValue(pageTexts, 'categories_subtitle') || t('productCategories') }}</p>
        </div>
        <div class="categories-grid">
          <router-link
            v-for="cat in allCategories"
            :key="cat.id"
            :to="langPath(`/products/category/${cat.slug || cat.id}`)"
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
              <span v-if="cat.product_count" class="cat-count">{{ cat.product_count }} {{ t('productsCount') }}</span>
            </div>
          </router-link>
        </div>
      </div>
    </div>
  </div>

  <div v-else-if="loading" class="loading-state">
    <div class="container">
      <div class="spinner"></div>
      <p>{{ t('loadingNews') }}</p>
    </div>
  </div>

  <div v-else class="not-found">
    <div class="container">
      <h2>{{ t('articleNotFound') }}</h2>
      <router-link :to="langPath('/news')" class="btn btn-primary">{{ t('backToNews') }}</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useLang } from '../composables/useLang'
import api from '../api'

const route = useRoute()
const { t, localizedValue, localizedHtml, lang, langPath } = useLang()

const article = ref(null)
const loading = ref(true)
const allCategories = ref([])
const pageTexts = ref(null)
const articleIframe = ref(null)
const company = ref(null)
const relatedNews = ref([])
const seoSettings = ref(null)

// ── Template variable substitution helper ────────────────────────────────
function resolveTemplateVars(html) {
  const co = company.value || {}
  const email       = co.email || ''
  const phone       = co.phone || ''
  const whatsapp    = co.whatsapp || ''
  const whatsappRaw = whatsapp.replace(/[^0-9+]/g, '')
  const whatsappLink = whatsappRaw ? `https://api.whatsapp.com/send?phone=${whatsappRaw.replace(/^\+/, '')}` : '#'
  const companyName = co.name_en || co.name || ''
  return html
    .replace(/\{\{email\}\}/g,          email)
    .replace(/\{\{phone\}\}/g,          phone)
    .replace(/\{\{whatsapp\}\}/g,       whatsapp)
    .replace(/\{\{whatsapp_raw\}\}/g,   whatsappRaw)
    .replace(/\{\{whatsapp_link\}\}/g,  whatsappLink)
    .replace(/\{\{company_name\}\}/g,   companyName)
}

// Helper to format email hyperlinks with pre-filled subject and body
function formatMailtoLinks(html) {
  if (!html) return html
  
  const articleTitle = localizedValue(article.value, 'title') || ''
  const articleUrl = window.location.origin + route.fullPath
  const companyEmail = company.value?.email || 'jameson@sunseasteel.com'
  
  const subject = `Article Inquiry: ${articleTitle}`
  const body = `Hi,\n\nI am interested in your article: "${articleTitle}"\nSource Link: ${articleUrl}\n\nPlease provide more information.`
  const query = `?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  
  return html.replace(/href=(['"])([^'"]+)\1/gi, (match, quote, href) => {
    let email = ''
    if (href.startsWith('mailto:')) {
      const emailPart = href.slice(7).split('?')[0].trim()
      email = (emailPart && emailPart !== '{{email}}') ? emailPart : companyEmail
    } else if (href === '{{email}}') {
      email = companyEmail
    } else if (href.includes('@') && !href.includes('/') && !href.toLowerCase().startsWith('http')) {
      email = href.trim()
    } else {
      return match
    }
    return `href=${quote}mailto:${email}${query}${quote}`
  })
}

// Build iframe srcdoc — isolates all article HTML styles from main page
const iframeContent = computed(() => {
  const raw = localizedHtml(article.value, 'content') || ''
  if (!raw) return ''
  let html = resolveTemplateVars(raw)
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  html = formatMailtoLinks(html)
  
  // CSS fix for full-HTML documents: prevent image overflow + consistent table styling
  const fixCss = `<style>
    .replace-tip{display:none!important}
    body{overflow-x:hidden;box-sizing:border-box}
    *,*::before,*::after{box-sizing:inherit}
    img{max-width:100%!important;height:auto!important}
    table{width:100%!important;border-collapse:collapse!important;margin:16px 0;table-layout:fixed}
    table th,table td{padding:8px 12px!important;word-wrap:break-word}
    table td{border-bottom:1px solid #e8ecf0}
  </style>`
  if (html.includes('<html') || html.includes('<body')) {
    return html.replace(/<\/head>/i, fixCss + '</head>')
  }
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>body{margin:0;padding:20px;font-family:Arial,Helvetica,sans-serif;line-height:1.8;color:#333;font-size:16px;overflow-x:hidden;box-sizing:border-box}*,*::before,*::after{box-sizing:inherit}img{max-width:100%!important;height:auto!important;display:block;margin:12px auto;border-radius:6px}p{margin:0 0 12px}h1,h2,h3,h4{margin:20px 0 10px;font-weight:700}ul,ol{padding-left:24px;margin:8px 0}table{width:100%!important;border-collapse:collapse;margin:16px 0;table-layout:fixed}table th,table td{border:1px solid #ddd;padding:8px 12px;word-wrap:break-word}table th{background:#f5f5f5;font-weight:600}a{color:#1f4e79}.replace-tip{display:none!important}</style></head><body>${html}</body></html>`
})

// Sanitized content for direct render mode — strips <style>/<script> only, keeps inline styles for SEO
const sanitizedContent = computed(() => {
  const raw = localizedHtml(article.value, 'content') || ''
  if (!raw) return ''
  let html = resolveTemplateVars(raw)
  html = formatMailtoLinks(html)
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<span\s+class=["']replace-tip["'][^>]*>.*?<\/span>/gi, '')
})

function handleMailtoClick(href, event) {
  if (event) event.preventDefault()

  let targetEmail = company.value?.email || 'jameson@sunseasteel.com'
  if (href && href.startsWith('mailto:')) {
    const match = href.match(/^mailto:([^?#]+)/)
    if (match) {
      targetEmail = match[1].trim()
    }
  } else if (href && href.includes('@') && !href.includes('/') && !href.toLowerCase().startsWith('http') && href !== '{{email}}') {
    targetEmail = href.trim()
  }

  const articleTitle = localizedValue(article.value, 'title') || ''
  const articleUrl = window.location.href

  const subject = `Article Inquiry: ${articleTitle}`
  const body = `Hi,\n\nI am interested in your article: "${articleTitle}"\nSource Link: ${articleUrl}\n\nPlease provide more information.`

  window.location.href = `mailto:${targetEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

function handleBodyClick(e) {
  const anchor = e.target.closest('a')
  if (!anchor) return

  const href = anchor.getAttribute('href') || ''
  if (href.startsWith('mailto:') || href === '{{email}}' || (href.includes('@') && !href.includes('/') && !href.toLowerCase().startsWith('http'))) {
    handleMailtoClick(href, e)
  }
}

function setupIframeMailtoInterception(doc) {
  if (!doc) return
  doc.addEventListener('click', (e) => {
    const anchor = e.target.closest('a')
    if (!anchor) return

    const href = anchor.getAttribute('href') || ''
    if (href.startsWith('mailto:') || href === '{{email}}' || (href.includes('@') && !href.includes('/') && !href.toLowerCase().startsWith('http'))) {
      handleMailtoClick(href, e)
    }
  })
}

function resizeIframe() {
  const iframe = articleIframe.value
  if (!iframe) return
  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (doc) {
      iframe.style.height = doc.documentElement.scrollHeight + 'px'
      doc.querySelectorAll('img').forEach(img => {
        if (!img.complete) img.addEventListener('load', () => {
          iframe.style.height = doc.documentElement.scrollHeight + 'px'
        })
      })
      setupIframeMailtoInterception(doc)
    }
  } catch (e) { /* srcdoc won't have cross-origin issues */ }
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

async function loadArticle(slug) {
  loading.value = true
  article.value = null
  try {
    const [art, cats, texts, comp, seoRes] = await Promise.all([
      api.getNewsItem(slug),
      api.getCategories(),
      api.getPageTexts(),
      api.getCompany(),
      fetch('/api/seo').then(r => r.json()).catch(() => ({}))
    ])
    article.value = art
    allCategories.value = cats || []
    pageTexts.value = texts
    company.value = comp
    seoSettings.value = seoRes
    if (article.value) {
      document.title = article.value.seo_title || localizedValue(article.value, 'title')

      // ── GEO: Inject Article JSON-LD ──────────────────────────
      const a = article.value
      const siteUrl = window.location.origin
      const articleUrl = `${siteUrl}/news/${a.slug || a.id}`
      const articleTitle = a.seo_title || a.title_en || a.title || ''
      const articleDesc = a.seo_description || a.summary_en || a.summary || ''

      const articleSchema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        'headline': articleTitle,
        'description': articleDesc,
        'url': articleUrl,
        'datePublished': a.created_at,
        ...(a.updated_at && { 'dateModified': a.updated_at }),
        ...(a.cover_image && { 'image': a.cover_image.startsWith('http') ? a.cover_image : siteUrl + a.cover_image }),
        ...(seoRes?.default_news_author && { 'author': { '@type': 'Person', 'name': seoRes.default_news_author } }),
        'publisher': {
          '@type': 'Organization',
          'name': document.title || 'SunSea Steel'
        },
        'mainEntityOfPage': { '@type': 'WebPage', '@id': articleUrl }
      }

      document.getElementById('article-jsonld')?.remove()
      const script = document.createElement('script')
      script.id = 'article-jsonld'
      script.type = 'application/ld+json'
      script.textContent = JSON.stringify(articleSchema, null, 2)
      document.head.appendChild(script)

      // FAQ schema (if article has faq_items)
      const faqJson = localizedValue(a, 'faq_items') || a.faq_items
      if (faqJson) {
        try {
          const faqs = JSON.parse(faqJson)
          if (faqs.length) {
            const faqSchema = {
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              'mainEntity': faqs.map(f => ({
                '@type': 'Question',
                'name': f.question,
                'acceptedAnswer': { '@type': 'Answer', 'text': f.answer }
              }))
            }
            document.getElementById('faq-jsonld')?.remove()
            const faqScript = document.createElement('script')
            faqScript.id = 'faq-jsonld'
            faqScript.type = 'application/ld+json'
            faqScript.textContent = JSON.stringify(faqSchema, null, 2)
            document.head.appendChild(faqScript)
          }
        } catch (e) {}
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }

  // Fetch related news articles (after main article loads)
  try {
    const allNewsData = await api.getNews({ status: 1 })
    const newsList = (allNewsData.data || allNewsData || []).filter(n => n.id !== article.value?.id)
    relatedNews.value = newsList.slice(0, 4)
  } catch (e) { console.warn('Failed to load related news:', e) }
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

.article-meta { margin-bottom: var(--spacing); display:flex; align-items:center; gap:8px; color:var(--text-muted); font-size:var(--text-sm); }
.article-date { color: var(--text-muted); font-size: var(--text-sm); }
.meta-divider { color: #cbd5e1; }
.article-author { color: var(--text-secondary); font-weight: 500; }

.article-summary {
  font-size: var(--text-lg); color: var(--text-secondary);
  line-height: 1.7; font-style: italic;
  border-left: 4px solid var(--primary); padding-left: var(--spacing);
}

.article-cover {
  width: 100%; overflow: hidden;
  background-color: #f8f9fa;
  text-align: center;
}

.article-cover img {
  max-width: 100%; max-height: 600px; height: auto; object-fit: contain; display: block; margin: 0 auto;
}

.article-body {
  padding: 0;
}

.article-iframe {
  width: 100%;
  min-height: 300px;
  border: none;
  display: block;
}

/* Direct render mode: clean HTML display */
.article-body-direct {
  padding: var(--spacing-2xl);
  line-height: 1.8;
  font-size: 16px;
  color: var(--text-primary);
  word-wrap: break-word;
}

.article-body-direct img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 12px auto;
  border-radius: 6px;
}

.article-body-direct p { margin: 0 0 14px; }
.article-body-direct h1, .article-body-direct h2,
.article-body-direct h3, .article-body-direct h4 { margin: 20px 0 10px; font-weight: 700; }
.article-body-direct ul, .article-body-direct ol { padding-left: 24px; margin: 8px 0; }
.article-body-direct a { color: var(--primary); text-decoration: underline; }
.article-body-direct table { 
  width: 100%; 
  border-collapse: collapse; 
  margin: 16px 0; 
  display: block; 
  overflow-x: auto; 
  -webkit-overflow-scrolling: touch; 
}
.article-body-direct td, .article-body-direct th { border: 1px solid var(--border); padding: 8px 12px; }
.article-body-direct th { background: var(--gray-50); font-weight: 600; }

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

/* ── Related News ── */
.related-news-section {
  background: var(--white);
  padding: var(--spacing-2xl) 0;
  border-top: 1px solid var(--border);
  margin-top: var(--spacing-xl);
}

.related-news-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--spacing-lg);
}

.rn-card {
  background: var(--gray-50);
  border-radius: var(--radius-lg);
  overflow: hidden;
  text-decoration: none;
  transition: var(--transition);
  border: 1px solid var(--border);
}

.rn-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--primary);
}

.rn-image {
  height: 140px;
  overflow: hidden;
  background: linear-gradient(135deg, #f0f4ff, #e8f0fe);
  display: flex; align-items: center; justify-content: center;
}

.rn-image img {
  width: 100%; height: 100%; object-fit: cover;
  transition: transform 0.3s;
}

.rn-card:hover .rn-image img { transform: scale(1.05); }

.rn-placeholder svg { width: 40px; height: 40px; color: var(--text-muted); }

.rn-info { padding: var(--spacing) var(--spacing-md); }

.rn-info h3 {
  font-size: var(--text-sm); font-weight: 700;
  color: var(--text-primary); margin-bottom: 4px;
  line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
}

.rn-date { font-size: 11px; color: var(--text-muted); }
</style>
