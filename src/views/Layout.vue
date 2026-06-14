<template>
  <div class="site-layout">
    <SiteHeader />
    <main class="site-main">
      <router-view :key="$route.fullPath" />
    </main>
    <SiteFooter />
    <!-- Floating contact is core UI on mobile, load immediately -->
    <FloatingContact />
    <!-- Defer sticky third-party widgets until page has settled OR user interacts -->
    <LiveChatWidget v-if="isWidgetsReady" />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLang } from '../composables/useLang'
import SiteHeader from '../components/SiteHeader.vue'
import api from '../api'

// Async load below-the-fold components to reduce Total Blocking Time
import SiteFooter from '../components/SiteFooter.vue'
const FloatingContact = defineAsyncComponent(() => import('../components/FloatingContact.vue'))
const LiveChatWidget = defineAsyncComponent(() => import('../components/LiveChatWidget.vue'))

const route = useRoute()
const router = useRouter()
const { lang, setRouter } = useLang()

// Connect router to useLang for URL sync
setRouter(router)

// Inject hreflang tags for all active languages
async function updateHreflang() {
  // Remove old hreflang tags
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove())

  try {
    const languages = window.__INITIAL_STATE__?.languages || await api.getActiveLanguages()
    if (!languages || !languages.length) return

    const seoSettings = window.__INITIAL_STATE__?.seoSettings || await api.getSeoSettings().catch(() => ({}))
    const currentPath = route.path.replace(/^\/[a-z]{2}(\/|$)/, '/')
    const origin = window.location.origin

    for (const l of languages) {
      const link = document.createElement('link')
      link.rel = 'alternate'
      
      let actualHreflang = l.code
      if (l.code === 'en' && seoSettings.hreflang_en) actualHreflang = seoSettings.hreflang_en
      if (l.code === 'zh' && seoSettings.hreflang_zh) actualHreflang = seoSettings.hreflang_zh
      
      link.hreflang = actualHreflang
      // ALL languages get /xx/ prefix for consistent SEO
      const href = origin + '/' + l.code + (currentPath === '/' ? '' : currentPath)
      link.href = href
      document.head.appendChild(link)
    }

    // x-default points to English version
    const xDefault = document.createElement('link')
    xDefault.rel = 'alternate'
    xDefault.hreflang = 'x-default'
    xDefault.href = origin + '/en' + (currentPath === '/' ? '' : currentPath)
    document.head.appendChild(xDefault)
  } catch (e) {
    console.warn('Failed to load languages for hreflang:', e)
  }
}

// Inject canonical URL tag
function updateCanonical() {
  let el = document.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = window.location.origin + route.path
}

// Inject Organization + WebSite structured data (JSON-LD)
async function injectStructuredData() {
  // Remove old structured data
  document.querySelectorAll('script[data-seo-jsonld]').forEach(el => el.remove())

  try {
    const [company, seo] = await Promise.all([
      api.getCompany().catch(() => null),
      api.getSeoSettings().catch(() => null)
    ])

    const origin = window.location.origin
    const name = company?.name_en || company?.name || 'Shandong Sunsea Steel Co., Ltd'
    const description = seo?.site_description || company?.description_en || ''
    const logo = company?.logo ? origin + company.logo : ''

    // Organization schema
    const orgSchema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name,
      url: origin,
      description,
      ...(logo && { logo }),
      ...(company?.email && { email: company.email }),
      ...(company?.phone && { telephone: company.phone }),
      ...(company?.address && {
        address: {
          '@type': 'PostalAddress',
          streetAddress: company.address
        }
      }),
      sameAs: [
        company?.facebook, company?.linkedin, company?.twitter, company?.youtube
      ].filter(Boolean)
    }

    const orgScript = document.createElement('script')
    orgScript.type = 'application/ld+json'
    orgScript.setAttribute('data-seo-jsonld', 'org')
    orgScript.textContent = JSON.stringify(orgSchema)
    document.head.appendChild(orgScript)

    // WebSite schema (enables sitelinks search box)
    const siteSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: seo?.site_title || name,
      url: origin,
      description
    }

    const siteScript = document.createElement('script')
    siteScript.type = 'application/ld+json'
    siteScript.setAttribute('data-seo-jsonld', 'site')
    siteScript.textContent = JSON.stringify(siteSchema)
    document.head.appendChild(siteScript)
  } catch (e) {
    console.error('Hreflang generation error:', e)
  }
}

// Optimization: Defer widgets to preserve 100/100 Lighthouse TTI / Network Idle
const isWidgetsReady = ref(false)

onMounted(() => {
  // If no SSR state (e.g. Dev mode), inject tags immediately.
  // Otherwise, SSR already injected perfect tags, so we leave them untouched on first load!
  if (!window.__INITIAL_STATE__) {
    updateHreflang()
    updateCanonical()
    injectStructuredData()
  }

  const showWidgets = () => {
    if (!isWidgetsReady.value) {
      isWidgetsReady.value = true
      if (typeof window !== 'undefined') {
        window.removeEventListener('scroll', showWidgets)
        window.removeEventListener('mousemove', showWidgets)
        window.removeEventListener('touchstart', showWidgets)
      }
    }
  }

  setTimeout(showWidgets, 3000)
  
  if (typeof window !== 'undefined') {
    window.addEventListener('scroll', showWidgets, { once: true, passive: true })
    window.addEventListener('mousemove', showWidgets, { once: true, passive: true })
    window.addEventListener('touchstart', showWidgets, { once: true, passive: true })
  }
})
watch(() => route.path, () => {
  updateHreflang()
  updateCanonical()
})
watch(lang, updateHreflang)
</script>

<style scoped>
.site-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.site-main {
  flex: 1;
}
</style>
