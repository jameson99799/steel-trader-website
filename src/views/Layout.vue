<template>
  <div class="site-layout">
    <SiteHeader />
    <main class="site-main">
      <router-view :key="lang" />
    </main>
    <SiteFooter />
    <FloatingContact />
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

onMounted(updateHreflang)
watch(() => route.path, updateHreflang)
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
