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
            <video v-if="article.cover_image && (article.cover_image.toLowerCase().endsWith('.mp4') || article.cover_image.toLowerCase().endsWith('.webm'))" :src="article.cover_image" autoplay loop muted playsinline style="width:100%;height:auto;object-fit:cover;"></video>
            <img v-else :src="article.cover_image" :alt="localizedValue(article, 'title')" />
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
              <video v-if="rn.cover_image && (rn.cover_image.toLowerCase().endsWith('.mp4') || rn.cover_image.toLowerCase().endsWith('.webm'))" :src="rn.cover_image" autoplay loop muted playsinline style="width:100%;height:100%;object-fit:cover;"></video>
                <img v-else-if="rn.cover_image" :src="rn.cover_image" :alt="localizedValue(rn, 'title')" />
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

  <!-- Lightbox -->
  <div class="lightbox" :class="{ 'active': lightboxActive }" @click="closeLightbox">
    <div class="lightbox-top-bar" @click.stop v-if="lightboxImages.length > 0 || lightboxActiveVideo">
      <div class="lightbox-center-controls">
        <div class="lightbox-title" v-if="lightboxImages.length > 0">{{ lightboxIndex + 1 }} / {{ lightboxImages.length }}</div>
      </div>
      <button class="lightbox-close" @click="closeLightbox">&times;</button>
    </div>

    <div class="lightbox-content" @click.stop v-if="lightboxImages.length > 0">
      <img :src="lightboxImages[lightboxIndex]" @click="closeLightbox" />
    </div>

    <div class="lightbox-content" @click.stop v-if="lightboxActiveVideo" style="width:100%; display:flex; flex-direction:column; align-items:center;">
      <iframe v-if="lightboxActiveVideo.media_url.includes('youtube') || lightboxActiveVideo.media_url.includes('youtu.be')"
        :src="getYoutubeEmbedUrl(lightboxActiveVideo.media_url, true, false)"
        style="width:100%;height:80vh;max-width:1100px;border:none;border-radius:8px;box-shadow: 0 10px 30px rgba(0,0,0,0.5);"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen>
      </iframe>
      <video v-else
        :src="lightboxActiveVideo.media_url"
        controls controlsList="nodownload" disablePictureInPicture autoplay playsinline preload="auto"
        style="width:100%;max-height:85vh;object-fit:contain;border-radius:8px;box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
      </video>
    </div>

    <div class="lightbox-bottom-bar" @click.stop v-if="lightboxImages.length > 0">
      <button class="lightbox-bottom-nav prev" @click="lightboxPrev" :disabled="lightboxIndex === 0">❮</button>
      <button class="lightbox-bottom-nav next" @click="lightboxNext" :disabled="lightboxIndex === lightboxImages.length - 1">❯</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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

// Lightbox state
const lightboxActive = ref(false)
const lightboxImages = ref([])
const lightboxIndex = ref(0)
const lightboxActiveVideo = ref(null)

// ── Template variable substitution helper ────────────────────────────────
function resolveTemplateVars(html) {
  if (!html) return ''
  html = html.replace(/contenteditable="true"/g, 'contenteditable="false"')
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
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>body{margin:0;padding:20px;font-family:Arial,Helvetica,sans-serif;line-height:1.8;color:#333;font-size:16px;overflow-x:hidden;box-sizing:border-box}*,*::before,*::after{box-sizing:inherit}img{max-width:100%!important;height:auto!important;display:block;margin:12px auto;border-radius:6px}p{margin:0 0 12px}h1,h2,h3,h4{margin:20px 0 10px;font-weight:700}ul,ol{padding-left:24px;margin:8px 0}table{width:100%!important;border-collapse:collapse;margin:16px 0;table-layout:fixed}table th,table td{border:1px solid #ddd;padding:8px 12px;word-wrap:break-word}table th{background:#f5f5f5;font-weight:600}a{color:#1f4e79}.replace-tip{display:none!important}blockquote{border-left:4px solid #2980b9;margin:16px 0;padding:12px 20px;background:#f0f7ff;border-radius:0 8px 8px 0;font-style:italic;color:#34495e}</style></head><body>${html}</body></html>`
})

// Sanitized content for direct render mode — strips <style>/<script> only, keeps inline styles for SEO
const sanitizedContent = computed(() => {
    const raw = localizedHtml(article.value, 'content') || ''
    if (!raw) return ''
    let html = resolveTemplateVars(raw)
    html = formatMailtoLinks(html)
    
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    html = html.replace(/<span\s+class=["'](?:hero-tip|replace-tip)["'][^>]*>.*?<\/span>/gi, '')
    
    // Extract <style> tags and scope them to .article-body-direct
    html = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, css) => {
      const scoped = css.replace(/([^{}]+)\{/g, (m, selector) => {
        const trimmed = selector.trim()
        if (!trimmed || trimmed.startsWith('@') || trimmed.startsWith('from') || trimmed.startsWith('to') || /^\d+%/.test(trimmed)) return m
        const scopedSelectors = trimmed.split(',').map(s => {
          s = s.trim()
          if (s.startsWith('.article-body-direct') || s === 'body' || s === 'html' || s === '*') return s
          return '.article-body-direct ' + s
        }).join(', ')
        return scopedSelectors + ' {'
      })
      return `<style>${scoped}</style>`
    })

    // Strip raw full-page HTML tags that might leak from AI generated content
    html = html.replace(/<!DOCTYPE[^>]*>/gi, '')
    html = html.replace(/<html[^>]*>/gi, '').replace(/<\/html>/gi, '')
    html = html.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, (match) => {
      // Keep <style> tags from head
      const styles = match.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []
      return styles.join('')
    })
    html = html.replace(/<body[^>]*>/gi, '').replace(/<\/body>/gi, '')
    html = html.replace(/<meta[^>]*>/gi, '')
    html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '')

    return html
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
  const videoContainer = e.target.closest('.video-container')
  if (videoContainer) {
    e.preventDefault()
    const url = videoContainer.getAttribute('data-media-url')
    if (url) {
      lightboxActiveVideo.value = { media_url: url }
      lightboxActive.value = true
    }
    return
  }

  if (e.target.tagName === 'IMG') {
    const container = e.currentTarget
    const images = Array.from(container.querySelectorAll('img')).map(img => img.src)
    const index = images.indexOf(e.target.src)
    if (index !== -1) {
      lightboxImages.value = images
      lightboxIndex.value = index
      lightboxActive.value = true
    }
    return
  }

  const anchor = e.target.closest('a')
  if (!anchor) return

  const href = anchor.getAttribute('href') || ''
  
  if (href.startsWith('#') && href.length > 1) {
    e.preventDefault()
    const targetId = href.substring(1)
    
    // Exactly like ProductDetail: robust case-insensitive ID matching for AI-translated anchors
    let targetEl = document.getElementById(targetId) || document.getElementById(decodeURIComponent(targetId))
    if (!targetEl) {
      try {
        targetEl = document.querySelector(`[id="${targetId}" i]`) || document.querySelector(`[id="${decodeURIComponent(targetId)}" i]`)
      } catch (err) {}
    }
    
    // MULTI-LANGUAGE TOC FALLBACK: If the AI Translation API translated the href string but 
    // left the target h2 ID untranslated (or vice versa), the strings will mismatch and ID lookups fail.
    // However, the visual TEXT translated inside <a> and <h2> will likely be identical. 
    // We match against article headings text to fix this organically!
    if (!targetEl) {
      const cleanText = (t) => (t || '').replace(/^[\d\.\s\-\)]+/, '').trim().toLowerCase()
      const anchorText = cleanText(anchor.textContent)
      if (anchorText) {
        const headings = Array.from(document.querySelectorAll('.article-body-direct h1, .article-body-direct h2, .article-body-direct h3, .article-body-direct h4, .article-body-direct h5, .article-body-direct h6'))
        targetEl = headings.find(h => cleanText(h.textContent) === anchorText)
      }
    }
    
    if (targetEl) {
      const topPos = targetEl.getBoundingClientRect().top + window.scrollY - 100 // Updated offset to match ProductDetail layout
      window.scrollTo({
        top: topPos,
        behavior: 'smooth'
      })
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, null, href)
      }
    }
    return
  }

  if (href.startsWith('mailto:') || href === '{{email}}' || (href.includes('@') && !href.includes('/') && !href.toLowerCase().startsWith('http'))) {
    handleMailtoClick(href, e)
  }
}

// Lightbox state event emitter
watch(lightboxActive, (newVal) => {
  window.dispatchEvent(new CustomEvent('lightbox-toggle', { detail: { active: newVal } }))
})

// Lightbox functions
const closeLightbox = () => {
  lightboxActive.value = false
  setTimeout(() => {
    lightboxImages.value = []
    lightboxActiveVideo.value = null
  }, 300)
}

const getYoutubeEmbedUrl = (url, autoplay = false, mute = false, thumbnailOnly = false) => {
  if (!url) return '';
  let videoId = '';
  if (url.includes('youtube.com/watch?v=')) {
    videoId = url.split('v=')[1];
    const ampersandPosition = videoId.indexOf('&');
    if(ampersandPosition !== -1) videoId = videoId.substring(0, ampersandPosition);
  } else if (url.includes('youtube.com/shorts/')) {
    videoId = url.split('shorts/')[1];
    const questionPosition = videoId.indexOf('?');
    if(questionPosition !== -1) videoId = videoId.substring(0, questionPosition);
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1];
    const questionPosition = videoId.indexOf('?');
    if(questionPosition !== -1) videoId = videoId.substring(0, questionPosition);
  } else if (url.includes('youtube.com/embed/')) {
    videoId = url.split('embed/')[1];
    const questionPosition = videoId.indexOf('?');
    if(questionPosition !== -1) videoId = videoId.substring(0, questionPosition);
  } else {
    return url;
  }
  if (thumbnailOnly) return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  return `https://www.youtube.com/embed/${videoId}?vq=hd2160&enablejsapi=1&playsinline=1${autoplay ? `&autoplay=1${mute ? '&mute=1' : ''}` : ''}`;
}

const lightboxPrev = () => {
  if (lightboxIndex.value > 0) {
    lightboxIndex.value--
  }
}

const lightboxNext = () => {
  if (lightboxIndex.value < lightboxImages.value.length - 1) {
    lightboxIndex.value++
  }
}

const handleKeydown = (e) => {
  if (!lightboxActive.value) return
  if (e.key === 'ArrowLeft') lightboxPrev()
  if (e.key === 'ArrowRight') lightboxNext()
  if (e.key === 'Escape') closeLightbox()
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
  const ssr = window.__INITIAL_STATE__
  const isHydrating = ssr && ssr.ssrArticle && (
    ssr.ssrArticle.slug === slug || 
    ssr.ssrArticle.id.toString() === (slug.match(/-(\d+)$/)?.[1] || slug)
  )

  if (isHydrating) {
    article.value = ssr.ssrArticle
    company.value = ssr.company
    pageTexts.value = ssr.pageTexts
    loading.value = false
    window.__INITIAL_STATE__.ssrArticle = null // consume it once
  } else {
    loading.value = true
    article.value = null
  }

  try {
    const promises = [
      isHydrating ? Promise.resolve(article.value) : api.getNewsItem(slug),
      api.getCategories(),
      isHydrating ? Promise.resolve(pageTexts.value) : api.getPageTexts(),
      isHydrating ? Promise.resolve(company.value) : api.getCompany(),
      window.__INITIAL_STATE__?.seoSettings ? Promise.resolve(window.__INITIAL_STATE__.seoSettings) : api.getSeoSettings().catch(() => ({}))
    ]
    
    const [art, cats, texts, comp, seoRes] = await Promise.all(promises)
    
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

      let script = document.getElementById('article-jsonld')
      if (!script) {
        script = document.createElement('script')
        script.id = 'article-jsonld'
        script.type = 'application/ld+json'
        document.head.appendChild(script)
      }
      script.textContent = JSON.stringify(articleSchema, null, 2)

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
            let faqScript = document.getElementById('faq-jsonld')
            if (!faqScript) {
              faqScript = document.createElement('script')
              faqScript.id = 'faq-jsonld'
              faqScript.type = 'application/ld+json'
              document.head.appendChild(faqScript)
            }
            faqScript.textContent = JSON.stringify(faqSchema, null, 2)
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

onMounted(() => {
  loadArticle(route.params.slug)
  window.addEventListener('keydown', handleKeydown)
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
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

.article-body:not(.article-body-direct) {
  padding: 0;
}
.article-body.article-body-direct {
  padding: 0 var(--spacing-2xl) var(--spacing-2xl);
}

.article-iframe {
  width: 100%;
  min-height: 300px;
  border: none;
  display: block;
}
</style>

<style>
.article-body-direct {
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
  cursor: pointer;
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
.article-body-direct th, .article-body-direct table th { background: var(--gray-50) !important; font-weight: 600 !important; color: var(--text-primary) !important; text-align: left; }

/* Force safe backgrounds on common AI generated content blocks (like TOC) to prevent them from becoming unexpectedly dark */
.article-body-direct .table-of-contents,
.article-body-direct .toc,
.article-body-direct #toc-container {
    background: var(--gray-50) !important;
    color: var(--text-primary) !important;
}
.article-body-direct .table-of-contents *,
.article-body-direct .toc *,
.article-body-direct #toc-container * {
    color: inherit;
}
.article-body-direct .table-of-contents a,
.article-body-direct .toc a,
.article-body-direct #toc-container a {
    color: var(--primary) !important;
}

/* Custom Article Layout Utilities */
.article-body-direct .image-gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin: 25px 0;
}
.article-body-direct .image-gallery img {
  width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  transition: transform 0.3s ease;
  margin: 0;
}
.article-body-direct .image-gallery img:hover {
  transform: scale(1.02);
}

/* Dynamic Image Grid Layout */
.article-body-direct .image-grid-layout { display: grid; gap: 12px; margin: 25px 0; }
.article-body-direct .grid-cols-1 { grid-template-columns: 1fr; }
.article-body-direct .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.article-body-direct .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
.article-body-direct .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
.article-body-direct .grid-cols-5 { grid-template-columns: repeat(5, 1fr); }
.article-body-direct .grid-cols-6 { grid-template-columns: repeat(6, 1fr); }

.article-body-direct .image-grid-layout .grid-item {
  aspect-ratio: 4/3;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}
.article-body-direct .image-grid-layout .grid-item:empty {
  display: none;
}
.article-body-direct .image-grid-layout .grid-item img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  margin: 0;
  display: block;
  border-radius: 0;
  box-shadow: none;
}

@media (max-width: 768px) {
  .article-body-direct .image-gallery { grid-template-columns: repeat(2, 1fr); }
  .article-body-direct .grid-cols-3, .article-body-direct .grid-cols-4, .article-body-direct .grid-cols-5, .article-body-direct .grid-cols-6 { grid-template-columns: repeat(2, 1fr); }
}

.article-body-direct .cta-box {
  background-color: #f8f9fa;
  padding: 20px;
  border-left: 5px solid #0056b3;
  margin-top: 30px;
  border-radius: 4px;
}
.article-body-direct .cta-box h3 { margin-top: 0; }
.article-body-direct .cta-box a {
  color: #0056b3;
  text-decoration: none;
  font-weight: bold;
}

.article-body-direct .hashtags {
  color: #0056b3;
  font-size: 0.9em;
  margin-top: 20px;
  word-wrap: break-word;
}
</style>

<style scoped>
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
  .article-body:not(.article-body-direct) { padding: 0; }
  .article-body.article-body-direct { padding: 0 var(--spacing-md) var(--spacing-md); }
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

/* ── Lightbox ── */
.lightbox {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; pointer-events: none;
  transition: opacity 0.3s ease;
  backdrop-filter: blur(5px);
}

.lightbox.active {
  opacity: 1; pointer-events: auto;
}

.lightbox-content {
  position: relative;
  max-width: 90vw; max-height: calc(100vh - 100px);
  margin-top: 60px;
  display: flex; align-items: center; justify-content: center;
}

.lightbox-content img {
  max-width: 100%; max-height: calc(100vh - 100px);
  object-fit: contain; border-radius: 4px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  cursor: zoom-out;
}

.lightbox-top-bar {
  position: absolute; top: 0; left: 0;
  width: 100%; height: 60px;
  background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(8px);
  display: flex; justify-content: center; align-items: center;
  padding: 0 20px; color: white; z-index: 10;
}

.lightbox-center-controls {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; max-width: 800px; padding: 0 80px;
}

.lightbox-title {
  text-align: center; font-size: 32px; font-weight: 500;
  letter-spacing: 1px; flex: 1;
}

.lightbox-close {
  background: none; border: none; color: white; font-size: 40px;
  cursor: pointer; transition: 0.2s; position: absolute; right: 20px;
}
.lightbox-close:hover { color: #ff4757; transform: scale(1.1); }

.lightbox-bottom-bar {
  position: absolute; bottom: 20px; left: 0;
  width: 100%; height: auto;
  display: flex; justify-content: center; align-items: center;
  gap: 80px; z-index: 1000;
  padding-bottom: env(safe-area-inset-bottom);
}

.lightbox-bottom-nav {
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid rgba(255, 255, 255, 0.6);
  color: white; font-size: 32px;
  width: 60px; height: 60px; border-radius: 50%;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
}

.lightbox-bottom-nav:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3); transform: scale(1.05);
}
.lightbox-bottom-nav:disabled { opacity: 0.3; cursor: not-allowed; }

@media (max-width: 1024px) {
  .lightbox-bottom-bar { gap: 40px; bottom: 80px; }
  .lightbox-bottom-nav { width: 50px; height: 50px; font-size: 24px; }
  .lightbox-close { right: 10px; font-size: 36px; z-index: 20; }
  .lightbox-center-controls { padding: 0 40px; }
  .lightbox-title { font-size: 20px; }
}

@media (max-width: 480px) {
  .article-body-direct .image-gallery { grid-template-columns: 1fr; }
  .article-body-direct .grid-cols-2, .article-body-direct .grid-cols-3, .article-body-direct .grid-cols-4 { grid-template-columns: 1fr; }
}
</style>
