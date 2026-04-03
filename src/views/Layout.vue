<template>
  <div class="site-layout">
    <SiteHeader :key="'header-' + lang" />
    <main class="site-main">
      <router-view :key="lang" />
    </main>
    <SiteFooter :key="'footer-' + lang" />
    <FloatingContact :key="'float-' + lang" />
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLang } from '../composables/useLang'
import SiteHeader from '../components/SiteHeader.vue'
import SiteFooter from '../components/SiteFooter.vue'
import FloatingContact from '../components/FloatingContact.vue'
import api from '../api'

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
    const languages = await api.getActiveLanguages()
    if (!languages || !languages.length) return

    const currentPath = route.path.replace(/^\/[a-z]{2}(\/|$)/, '/')
    const origin = window.location.origin

    for (const l of languages) {
      const link = document.createElement('link')
      link.rel = 'alternate'
      link.hreflang = l.code
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
    console.warn('Failed to inject structured data:', e)
  }
}

onMounted(() => {
  updateHreflang()
  updateCanonical()
  injectStructuredData()
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
