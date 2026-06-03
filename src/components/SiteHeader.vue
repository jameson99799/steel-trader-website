<template>
  <header class="site-header">
    <div class="header-top">
      <div class="container" style="max-width: 1440px;">
        <div class="header-top-content">
          <div class="contact-info">
            <a v-if="company?.email" :href="`mailto:${company.email}`" class="contact-item">
              <svg class="icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              {{ company.email }}
            </a>
            <a v-if="company?.phone" :href="`tel:${company.phone}`" class="contact-item">
              <svg class="icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              {{ company.phone }}
            </a>
            <a v-if="company?.whatsapp" :href="`https://api.whatsapp.com/send?phone=${company.whatsapp.replace(/[^0-9]/g, '')}`" class="contact-item whatsapp-item" target="_blank" rel="noopener">
              <svg class="icon whatsapp-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
              </svg>
              {{ company.whatsapp }}
            </a>
          </div>
          <div class="header-actions">
            <!-- Dynamic Language Switcher -->
            <div class="lang-switcher" ref="langSwitcherRef" :style="{ visibility: (multilingualEnabled && activeLanguages.length > 1) ? 'visible' : 'hidden' }">
              <button class="lang-btn" @click="langDropOpen = !langDropOpen" aria-label="Language options">
                <!-- Globe Icon -->
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 2a14.5 14.5 0 0 1 0 20M12 2a14.5 14.5 0 0 0 0 20M2 12h20"/>
                </svg>
                <span>Language</span>
                <svg class="chevron" :class="{open: langDropOpen}" viewBox="0 0 20 20" fill="currentColor" style="width:14px;height:14px">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
                </svg>
              </button>
              <div class="lang-dropdown" v-show="langDropOpen">
                <button v-for="l in activeLanguages" :key="l.code"
                  class="lang-drop-item"
                  :class="{ active: lang === l.code }"
                  @click="selectLang(l.code)">
                  <span class="lang-flag">{{ l.flag }}</span>
                  <span>{{ l.name }}</span>
                  <span v-if="lang === l.code" class="lang-check">✓</span>
                </button>
              </div>
            </div>
            <!-- Simple EN-only toggle (multilingual disabled) -->
            <button v-if="!multilingualEnabled" class="lang-toggle" style="cursor:default;opacity:0.6" disabled>
              <svg class="icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389c-.188-.196-.373-.396-.554-.6a19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.087 17.087 0 003.13-3.733 18.992 18.992 0 01-1.487-2.494 1 1 0 111.79-.89c.234.47.489.928.764 1.372.417-.934.752-1.913.997-2.927H3a1 1 0 110-2h3V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.982a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.79.895L15.383 16h-4.764l-.724 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.982A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z" clip-rule="evenodd"/></svg>
              EN
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="header-main">
      <div class="container" style="max-width: 1440px;">
        <div class="header-main-content">
          <router-link :to="langPath('/')" class="logo" aria-label="Home">
            <div class="logo-image" v-if="company?.logo">
              <img :src="company.logo" :alt="localizedValue(company, 'name') || 'SUNSEA STEEL Logo'" />
            </div>
            <div class="logo-text">
              <span class="logo-title">{{ localizedValue(company, 'name') }}</span>
              <p class="logo-subtitle">{{ localizedValue(pageTexts, 'logo_subtitle') }}</p>
            </div>
            <!-- Mobile-only hardcoded compact brand -->
            <div class="logo-text-mobile">
              <span class="mobile-brand-name">SUNSEA STEEL</span>
              <span class="mobile-brand-sub">GI GL PPGI PPGL CRC</span>
            </div>
          </router-link>
          
          <nav class="main-nav" :class="{ active: menuOpen }">
            <!-- Tablet-only globe: left of Home -->
            <div class="tablet-nav-lang" ref="tabletLangRef" :style="{ visibility: (multilingualEnabled && activeLanguages.length > 1) ? 'visible' : 'hidden' }">
              <button class="tablet-globe-btn" @click="tabletLangOpen = !tabletLangOpen" aria-label="Switch language">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 2a14.5 14.5 0 0 1 0 20M12 2a14.5 14.5 0 0 0 0 20M2 12h20"/>
                </svg>
                <svg class="tablet-lang-chevron" :class="{ open: tabletLangOpen }" viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
                </svg>
              </button>
              <div class="tablet-lang-dropdown" v-show="tabletLangOpen">
                <button v-for="l in activeLanguages" :key="l.code"
                  class="lang-drop-item"
                  :class="{ active: lang === l.code }"
                  @click="selectLang(l.code); tabletLangOpen = false">
                  <span class="lang-flag">{{ l.flag }}</span>
                  <span>{{ l.name }}</span>
                  <span v-if="lang === l.code" class="lang-check">✓</span>
                </button>
              </div>
            </div>

            <router-link :to="langPath('/')" @click="menuOpen = false" class="nav-link home-link">
              {{ t('home') }}
            </router-link>

            <div class="nav-dropdown-wrapper">
              <router-link :to="langPath('/products')" @click="handleNavClick($event, 'products')" class="nav-link">
                {{ t('products') }}
                <svg class="dropdown-arrow" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </router-link>
              <div class="nav-dropdown" v-if="productCategories.length" :class="{ 'mobile-show': mobileProductsExpanded }">
                <router-link 
                  v-for="cat in productCategories" :key="cat.id" 
                  :to="langPath(`/products/category/${cat.slug || cat.id}`)" 
                  @click="menuOpen = false"
                  class="nav-dropdown-item"
                >
                  {{ localizedValue(cat, 'name') }}
                </router-link>
              </div>
            </div>

            <div class="nav-dropdown-wrapper">
              <router-link :to="langPath('/news')" @click="handleNavClick($event, 'news')" class="nav-link">
                {{ t('news') }}
                <svg class="dropdown-arrow" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </router-link>
              <div class="nav-dropdown" v-if="newsCategories.length || true" :class="{ 'mobile-show': mobileNewsExpanded }">
                <router-link 
                  v-for="cat in newsCategories" :key="cat.id" 
                  :to="langPath(`/news/category/${cat.slug || cat.id}`)" 
                  @click="menuOpen = false"
                  class="nav-dropdown-item"
                >
                  {{ localizedValue(cat, 'name') }}
                </router-link>
                <router-link :to="langPath('/ral-colors')" @click="menuOpen = false" class="nav-dropdown-item">
                  {{ t('ralColorBtn') }}
                </router-link>
                <router-link :to="langPath('/roofing-profiles')" @click="menuOpen = false" class="nav-dropdown-item">
                  {{ t('roofingProfilesBtn') }}
                </router-link>
                <router-link :to="langPath('/news/futures-price')" @click="menuOpen = false" class="nav-dropdown-item">
                  {{ t('futuresTitle') || 'Futures Price' }}
                </router-link>
              </div>
            </div>

            <router-link :to="langPath('/about')" @click="menuOpen = false" class="nav-link">
              {{ t('about') }}
            </router-link>
            <router-link :to="langPath('/factory')" @click="menuOpen = false" class="nav-link">
              {{ t('factory') || 'Factory' }}
            </router-link>
            <router-link :to="langPath('/contact')" @click="menuOpen = false" class="nav-link">
              {{ t('contact') }}
            </router-link>

          </nav>

          <div class="header-cta">
            <router-link :to="langPath('/contact')" class="btn btn-primary">
              <svg class="icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              {{ t('getInTouch') }}
            </router-link>
            <!-- Mobile Language Globe Button -->
            <div class="mobile-lang-globe" ref="mobileLangRef" :style="{ visibility: (multilingualEnabled && activeLanguages.length > 1) ? 'visible' : 'hidden' }">
              <button class="globe-btn" @click="mobileLangOpen = !mobileLangOpen" aria-label="Switch language">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 2a14.5 14.5 0 0 1 0 20M12 2a14.5 14.5 0 0 0 0 20M2 12h20"/>
                </svg>
              </button>
              <div class="mobile-lang-dropdown" v-show="mobileLangOpen">
                <button
                  v-for="l in activeLanguages" :key="l.code"
                  class="mobile-lang-item"
                  :class="{ active: lang === l.code }"
                  @click="selectLang(l.code); mobileLangOpen = false"
                >
                  <span class="lang-flag">{{ l.flag }}</span>
                  <span>{{ l.name }}</span>
                  <span v-if="lang === l.code" class="lang-check">✓</span>
                </button>
              </div>
            </div>
            <button class="mobile-menu-toggle" @click="menuOpen = !menuOpen" aria-label="Toggle navigation menu">
              <span class="hamburger-line"></span>
              <span class="hamburger-line"></span>
              <span class="hamburger-line"></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useLang } from '../composables/useLang'
import api from '../api'

const { lang, setLang, toggleLang, t, localizedValue, langPath } = useLang()
const menuOpen = ref(false)
const company = ref(window.__INITIAL_STATE__?.company || null)
const pageTexts = ref(window.__INITIAL_STATE__?.pageTexts || null)
const multilingualEnabled = ref(true)
const activeLanguages = ref([])
const langDropOpen = ref(false)
const langSwitcherRef = ref(null)
const mobileLangOpen = ref(false)
const mobileLangRef = ref(null)
const tabletLangOpen = ref(false)
const tabletLangRef = ref(null)

const productCategories = ref([])
const newsCategories = ref([])

const mobileProductsExpanded = ref(false)
const mobileNewsExpanded = ref(false)

watch(menuOpen, (newVal) => {
  if (!newVal) {
    mobileProductsExpanded.value = false
    mobileNewsExpanded.value = false
  }
})

const handleNavClick = (e, menuName) => {
  if (window.innerWidth <= 1024) {
    if (menuName === 'products') {
      if (!mobileProductsExpanded.value) {
        e.preventDefault()
        mobileProductsExpanded.value = true
        mobileNewsExpanded.value = false
      } else {
        menuOpen.value = false
        mobileProductsExpanded.value = false
      }
    } else if (menuName === 'news') {
      if (!mobileNewsExpanded.value) {
        e.preventDefault()
        mobileNewsExpanded.value = true
        mobileProductsExpanded.value = false
      } else {
        menuOpen.value = false
        mobileNewsExpanded.value = false
      }
    }
  } else {
    menuOpen.value = false
  }
}

const selectLang = (code) => {
  if (typeof setLang === 'function') setLang(code)
  else if (typeof toggleLang === 'function') toggleLang() // fallback
  langDropOpen.value = false
}

const handleClickOutside = (e) => {
  if (langSwitcherRef.value && !langSwitcherRef.value.contains(e.target)) {
    langDropOpen.value = false
  }
  if (mobileLangRef.value && !mobileLangRef.value.contains(e.target)) {
    mobileLangOpen.value = false
  }
  if (tabletLangRef.value && !tabletLangRef.value.contains(e.target)) {
    tabletLangOpen.value = false
  }
}

onMounted(async () => {
  try {
    if (!window.__INITIAL_STATE__?.company) {
      company.value = await api.getCompany()
    }
    if (!window.__INITIAL_STATE__?.pageTexts) {
      pageTexts.value = await api.getPageTexts()
    }
  } catch (e) {}
  try {
    const [status, langs, pcats, ncats] = await Promise.all([
      api.getMultilingualStatus(),
      api.getActiveLanguages(),
      api.getCategoryTree().catch(() => []),
      api.getNewsCategories().catch(() => [])
    ])
    multilingualEnabled.value = !!status?.enabled
    activeLanguages.value = langs || []
    productCategories.value = pcats
    newsCategories.value = ncats
  } catch (e) {}
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.site-header {
  background: var(--white);
  box-shadow: var(--shadow-lg);
  position: sticky;
  top: 0;
  z-index: 100;
}

/* Language Switcher Dropdown */
.lang-switcher {
  position: relative;
}
.lang-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1.5px solid rgba(255,255,255,0.3);
  color: var(--gray-300);
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}
.lang-btn:hover { border-color: rgba(255,255,255,0.7); color: white; }
.lang-btn .icon { width: 16px; height: 16px; flex-shrink: 0; }
.chevron { transition: transform 0.2s; }
.chevron.open { transform: rotate(180deg); }

.lang-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 160px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.15);
  overflow: hidden;
  z-index: 200;
  border: 1px solid #e2e8f0;
}
.lang-drop-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #334155;
  text-align: left;
  transition: background 0.15s;
}
.lang-drop-item:hover { background: #f0f4ff; }
.lang-drop-item.active { background: #eff6ff; color: #1d4ed8; font-weight: 700; }
.lang-flag { font-size: 18px; }
.lang-check { margin-left: auto; color: #22c55e; font-weight: 700; }

.lang-toggle {
  background: transparent;
  border: 1.5px solid rgba(255,255,255,0.3);
  color: var(--gray-300);
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}
.lang-toggle:hover { border-color: rgba(255,255,255,0.7); color: white; }
.lang-toggle .icon { width: 16px; height: 16px; }

.header-top {
  background: var(--gray-900);
  color: var(--white);
  padding: 10px 0;
  font-size: 0.95rem;
}

.header-top-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.contact-info {
  display: flex;
  gap: 28px;
  align-items: center;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--gray-300);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  transition: color 0.2s;
}

.contact-item:hover {
  color: var(--white);
}

.contact-item .icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.whatsapp-item {
  color: #4ade80;
}

.whatsapp-item:hover {
  color: #86efac;
}

.whatsapp-icon {
  color: #25D366;
}

.whatsapp-item:hover .whatsapp-icon {
  color: #4ade80;
}

.lang-toggle {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius);
  color: var(--white);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.lang-toggle:hover {
  background: rgba(255, 255, 255, 0.2);
}

.lang-toggle .icon {
  width: 16px;
  height: 16px;
}

.header-main {
  background: var(--white);
  padding: 16px 0;
  min-height: 72px; /* prevent CLS */
}

.header-main-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--spacing);
  text-decoration: none;
  color: inherit;
  min-height: 48px; /* prevent CLS — reserve logo space */
}

.logo-image {
  width: 60px;
  height: 60px;
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--gray-100);
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.logo-title {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--primary);
  line-height: var(--leading-tight);
  margin: 0;
  min-height: 1.25em; /* prevent CLS */
}

.logo-subtitle {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: 0;
  font-weight: 500;
}

/* Mobile-only brand (hidden on desktop) */
.logo-text-mobile {
  display: none;
}
.mobile-brand-name {
  font-size: 16px;
  font-weight: 800;
  color: var(--primary);
  line-height: 1.2;
  letter-spacing: 0.02em;
}
.mobile-brand-sub {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
  line-height: 1.2;
}

.main-nav {
  display: flex;
  align-items: center;
  gap: 24px;
}

.nav-link {
  position: relative;
  padding: 12px 0;
  color: var(--text-primary);
  font-weight: 600;
  font-size: var(--text-base);
  text-decoration: none;
  transition: var(--transition);
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 3px;
  background: var(--primary-gradient);
  border-radius: 2px;
  transition: var(--transition);
}

.nav-link:hover,
.nav-link:not(.home-link).router-link-active,
.nav-link.home-link.router-link-exact-active {
  color: var(--primary);
}

.nav-link:hover::after,
.nav-link:not(.home-link).router-link-active::after,
.nav-link.home-link.router-link-exact-active::after {
  width: 100%;
}

.nav-link:focus,
.nav-dropdown-item:focus {
  outline: none;
}

/* Nav Dropdown */
.nav-dropdown-wrapper {
  position: relative;
}
.dropdown-arrow {
  width: 16px;
  height: 16px;
  margin-left: 4px;
  display: inline-block;
  vertical-align: middle;
  transition: transform 0.2s;
}
.nav-dropdown-wrapper:hover .dropdown-arrow {
  transform: rotate(180deg);
}
.nav-dropdown {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(10px);
  min-width: 220px;
  background: var(--white);
  border-radius: var(--radius-lg);
  box-shadow: 0 10px 40px rgba(0,0,0,0.1);
  padding: 8px 0;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  z-index: 200;
  border: 1px solid var(--border);
}
.nav-dropdown-wrapper:hover .nav-dropdown {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}
.nav-dropdown-item {
  display: block;
  padding: 10px 20px;
  color: var(--text-primary);
  font-size: var(--text-sm);
  font-weight: 500;
  text-decoration: none;
  transition: var(--transition);
}
.nav-dropdown-item:hover {
  background: var(--gray-50);
  color: var(--primary);
  padding-left: 24px;
}

.header-cta {
  display: flex;
  align-items: center;
  gap: var(--spacing);
}

.header-cta .btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  white-space: nowrap;
}

.header-cta .btn .icon {
  width: 18px;
  height: 18px;
}

.mobile-menu-toggle {
  display: none;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: var(--radius);
  transition: var(--transition);
}

.mobile-menu-toggle:hover {
  background: var(--gray-100);
}

.hamburger-line {
  width: 24px;
  height: 2px;
  background: var(--text-primary);
  border-radius: 1px;
  transition: var(--transition);
}

.icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* ── Tablet (769px – 1024px) ────────────────────────────────────────────── */
@media (min-width: 769px) and (max-width: 1024px) {
  /* Hide top black bar */
  .header-top { display: none; }

  /* Compact logo – same size as mobile */
  .logo-image { width: 40px !important; height: 40px !important; flex-shrink: 0; }

  /* Switch to compact brand text */
  .logo-text { display: none !important; }
  .logo-text-mobile {
    display: flex !important;
    flex-direction: column;
    justify-content: center;
  }

  /* Shrink nav gaps + font */
  .main-nav { gap: 4px; }
  .nav-link { font-size: 13px; padding: 10px 6px; }

  /* Hide 'Get in Touch' button */
  .header-cta .btn-primary { display: none !important; }

  /* Hide the header-cta globe – nav globe handles it */
  .mobile-lang-globe { display: none !important; }

  /* Show tablet nav globe — override the default display:none */
  .tablet-nav-lang { display: flex !important; align-items: center; }
}

/* ── Shared: all breakpoints ≤ 1024px ────────────────────────────────────── */
@media (max-width: 1024px) {
  .header-top { display: none; }
  .logo-title { font-size: var(--text-xl); }
}

@media (max-width: 768px) {
  .contact-info {
    gap: var(--spacing);
  }
  
  .contact-item {
    font-size: var(--text-xs);
  }
  
  /* Show compact brand on mobile */
  .logo-text {
    display: none;
  }
  .logo-text-mobile {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .logo {
    flex: 1;
    min-width: 0;
  }
  .logo-image {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
  }

  .header-main {
    position: relative;
  }
  
  .main-nav {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--white);
    flex-direction: column;
    padding: 0;
    gap: 0;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    z-index: 200;
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.35s ease, opacity 0.3s ease;
    opacity: 0;
  }

  .main-nav.active {
    max-height: calc(100vh - 60px);
    opacity: 1;
    overflow-y: auto;
  }

  .nav-link {
    width: 100%;
    padding: var(--spacing);
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .nav-link:last-child {
    border-bottom: none;
  }
  
  .nav-dropdown-wrapper {
    width: 100%;
  }
  
  .nav-dropdown {
    display: none !important;
    position: static !important;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
    border: none;
    border-top: 1px solid var(--border);
    background: var(--gray-50);
    opacity: 1 !important;
    visibility: visible !important;
    transform: none !important;
    width: 100%;
    border-radius: 0;
  }
  
  .nav-dropdown.mobile-show {
    display: block !important;
  }
  
  .nav-dropdown-item {
    padding-left: 32px;
    border-bottom: 1px solid var(--border);
  }
  
  .nav-dropdown-item:last-child {
    border-bottom: none;
  }

  .mobile-menu-toggle {
    display: flex;
  }

  .header-cta .btn {
    display: none;
  }
}

/* Mobile language globe button (header bar) */
.mobile-lang-globe {
  display: none;
  position: relative;
}
.globe-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: none;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-primary);
  transition: all 0.2s;
}
.globe-btn:hover { border-color: var(--primary); color: var(--primary); }
.mobile-lang-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 160px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.15);
  overflow: hidden;
  z-index: 200;
  border: 1px solid #e2e8f0;
}
.mobile-lang-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #334155;
  text-align: left;
  transition: background 0.15s;
}
.mobile-lang-item:hover { background: #f0f4ff; }
.mobile-lang-item.active { background: #eff6ff; color: #1d4ed8; font-weight: 700; }
.mobile-lang-item .lang-flag { font-size: 18px; }
.mobile-lang-item .lang-check { margin-left: auto; color: #22c55e; font-weight: 700; }

/* ── Tablet nav globe (left of Home) — hidden by default ── */
.tablet-nav-lang {
  display: none;
  position: relative;
  margin-right: 4px;
}
.tablet-globe-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  padding: 6px 9px;
  cursor: pointer;
  color: var(--text-primary);
  transition: all 0.2s;
}
.tablet-globe-btn:hover { border-color: var(--primary); color: var(--primary); }
.tablet-lang-chevron { transition: transform 0.2s; flex-shrink: 0; }
.tablet-lang-chevron.open { transform: rotate(180deg); }
.tablet-lang-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 160px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.15);
  overflow: hidden;
  z-index: 300;
  border: 1px solid #e2e8f0;
}

/* ── Mobile (≤ 768px) ───────────────────────────────────────────────────── */
@media (max-width: 768px) {
  /* Show the header-cta globe on mobile (hamburger menu hides the nav globe) */
  .mobile-lang-globe { display: block; }
  /* Nav globe hidden on mobile since nav is a dropdown / hamburger */
  .tablet-nav-lang { display: none !important; }
}

@media (max-width: 640px) {
  .header-main {
    padding: 12px 0;
  }
  
  .logo-image {
    width: 48px;
    height: 48px;
  }
  
  .contact-info {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
