<template>
  <div class="home">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-background">
        <div class="hero-overlay"></div>
      </div>
      <div class="container">
        <div class="hero-content">
          <div class="hero-text">
            <span class="hero-badge" style="min-height:20px;display:inline-block;">{{ hero?.tag_en || hero?.tag }}</span>
            <h1 class="hero-title" style="min-height:1.2em;">{{ localizedValue(hero, 'title') }}</h1>
            <h2 class="hero-subtitle" style="min-height:1.5em;">{{ localizedValue(hero, 'subtitle') }}</h2>
            
            <div class="hero-stats">
              <div class="stat-item">
                <div class="stat-number">{{ hero?.stat1_num }}</div>
                <div class="stat-label">{{ localizedValue(hero, 'stat1_label') }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">{{ hero?.stat2_num }}</div>
                <div class="stat-label">{{ localizedValue(hero, 'stat2_label') }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">{{ hero?.stat3_num }}</div>
                <div class="stat-label">{{ localizedValue(hero, 'stat3_label') }}</div>
              </div>
            </div>
            
            <div class="hero-actions">
              <router-link :to="langPath('/products')" class="btn btn-primary btn-lg">
                <svg class="icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
                </svg>
                {{ t('viewMore') }}
              </router-link>
              <router-link :to="langPath('/contact')" class="btn btn-outline btn-lg">
                <svg class="icon" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                {{ t('contactUs') }}
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Featured Products -->
    <section class="section featured-products" v-if="featuredProducts.length">
      <div class="container">
        <div class="section-header">
          <div class="section-badge">{{ t('products') }}</div>
          <h2 class="section-title">{{ t('featuredProducts') }}</h2>
          <p class="section-subtitle">{{ localizedValue(pageTexts, 'featured_subtitle') || t('featuredProducts') }}</p>
        </div>
        
        <div class="products-grid">
          <router-link
            v-for="(product, index) in featuredProducts"
            :key="product.id"
            :to="langPath(`/products/${product.slug || product.id}`)"
            class="product-card"
          >
            <div class="product-image">
              <img
                :src="(product.images?.split(',')[0] || '/placeholder.svg') + (product.images?.split(',')[0] ? '?w=400' : '')"
                :alt="localizedValue(product, 'name')"
                :loading="index < 3 ? 'eager' : 'lazy'"
                :fetchpriority="index < 3 ? 'high' : 'auto'"
                :decoding="index < 3 ? 'sync' : 'async'"
                width="400" height="300"
              />
              <div class="product-overlay">
                <div class="product-actions">
                  <button class="action-btn" :aria-label="'View ' + localizedValue(product, 'name')">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div class="product-info">
              <h3 class="product-name">{{ localizedValue(product, 'name') }}</h3>
              <p class="product-category">{{ localizedValue(product, 'category_name') }}</p>
            </div>
          </router-link>
        </div>
        


      </div>
    </section>

    <!-- Categories -->
    <section class="section categories-section" v-if="categories.length">
      <div class="container">
        <div class="section-header">
          <div class="section-badge">{{ t('categories') }}</div>
          <h2 class="section-title">{{ t('productCategories') }}</h2>
          <p class="section-subtitle">{{ localizedValue(pageTexts, 'categories_subtitle') || t('productCategories') }}</p>
        </div>
        
        <div class="categories-grid">
          <router-link 
            v-for="cat in categories" 
            :key="cat.id" 
            :to="langPath(`/products/category/${cat.slug || cat.id}`)"
            class="category-card"
          >
            <div class="category-image">
              <img :src="(cat.image || '/placeholder.svg') + (cat.image ? '?w=400' : '')" :alt="localizedValue(cat, 'name')" loading="lazy" decoding="async" width="400" height="300" />
              <div class="category-overlay">
                <div class="category-icon">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            <div class="category-info">
              <h3 class="category-name">{{ localizedValue(cat, 'name') }}</h3>
              <p class="category-count">{{ cat.product_count }} {{ t('productsCount') }}</p>
            </div>
          </router-link>
        </div>
      </div>
    </section>

    <!-- Advantages -->
    <section class="section advantages-section">
      <div class="container">
        <div class="section-header">
          <div class="section-badge">{{ t('whyChooseUs') }}</div>
          <h2 class="section-title">{{ t('ourAdvantages') }}</h2>
          <p class="section-subtitle">{{ localizedValue(pageTexts, 'advantages_subtitle') || t('ourAdvantages') }}</p>
        </div>
        
        <!-- Modern Video Component -->
        <div class="home-video-wrapper" v-if="company?.company_video_embed && company?.home_show_video">
          <template v-if="company.company_video_embed.toLowerCase().endsWith('.mp4') || company.company_video_embed.toLowerCase().endsWith('.webm')">
            <div class="yt-video-active" v-if="company.about_video_autoplay === 1" @click="openVideoLightbox(company.company_video_embed)" style="cursor: pointer; margin-bottom: var(--spacing-2xl);">
              <video :src="company.company_video_embed" autoplay controlsList="nodownload" disablePictureInPicture muted loop playsinline style="width:100%;height:100%;object-fit:contain;background-color:#000;pointer-events:none;"></video>
            </div>
            <div v-else class="yt-video-cover" @click="openVideoLightbox(company.company_video_embed)" style="margin-bottom: var(--spacing-2xl);">
              <video :src="company.company_video_embed" preload="metadata" style="width:100%;height:100%;object-fit:contain;background-color:#000;pointer-events:none;"></video>
              <div class="yt-play-button"><svg viewBox="0 0 68 48"><path class="yt-play-bg" d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00"></path><path d="M 45,24 27,14 27,34" fill="#fff"></path></svg></div>
            </div>
          </template>
          <template v-else>
            <div v-if="company.about_video_autoplay === 1" class="yt-video-active" @click="openVideoLightbox(company.company_video_embed)" style="cursor: pointer; margin-bottom: var(--spacing-2xl);">
              <iframe 
                :src="getYoutubeEmbedUrl(company.company_video_embed, true, true)" 
                style="width:100%;height:100%;border:none;pointer-events:none;" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowfullscreen>
              </iframe>
            </div>
            <div v-else class="yt-video-cover" @click="openVideoLightbox(company.company_video_embed)" style="margin-bottom: var(--spacing-2xl);">
              <img v-if="getYoutubeThumbnail(company.company_video_embed)" :src="getYoutubeThumbnail(company.company_video_embed)" alt="Company intro video thumbnail" class="yt-thumbnail" />
              <div v-else class="yt-thumbnail-fallback"></div>
              <div class="yt-play-button">
                <svg viewBox="0 0 68 48"><path class="yt-play-bg" d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00"></path><path d="M 45,24 27,14 27,34" fill="#fff"></path></svg>
              </div>
            </div>
          </template>
        </div>

        <div class="advantages-grid">
          <div class="advantage-card">
            <div class="advantage-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z"/>
                <path d="M8 21v-4a2 2 0 012-2h4a2 2 0 012 2v4"/>
                <path d="M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3"/>
              </svg>
            </div>
            <h3 class="advantage-title">{{ t('factoryDirect') }}</h3>
            <p class="advantage-desc">{{ t('factoryDirectDesc') }}</p>
          </div>
          
          <div class="advantage-card">
            <div class="advantage-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4"/>
                <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                <path d="M13 12h1"/>
              </svg>
            </div>
            <h3 class="advantage-title">{{ t('qualityAssurance') }}</h3>
            <p class="advantage-desc">{{ t('qualityAssuranceDesc') }}</p>
          </div>
          
          <div class="advantage-card">
            <div class="advantage-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <h3 class="advantage-title">{{ t('fastDelivery') }}</h3>
            <p class="advantage-desc">{{ t('fastDeliveryDesc') }}</p>
          </div>
          
          <div class="advantage-card">
            <div class="advantage-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <h3 class="advantage-title">{{ t('customService') }}</h3>
            <p class="advantage-desc">{{ t('customServiceDesc') }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="section cta-section">
      <div class="container">
        <div class="cta-content">
          <div class="cta-text">
            <h2 class="cta-title">{{ localizedValue(pageTexts, 'cta_title') || t('readyToStart') }}</h2>
            <p class="cta-subtitle">{{ localizedValue(pageTexts, 'cta_subtitle') || t('getQuote') }}</p>
          </div>
          <div class="cta-actions">
            <router-link :to="langPath('/contact')" class="btn btn-primary btn-lg">
              {{ t('contactUs') }}
            </router-link>
            <router-link :to="langPath('/products')" class="btn btn-ghost btn-lg">
              {{ t('viewMore') }}
            </router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- Video Lightbox -->
    <div class="video-lightbox" :class="{ 'active': videoLightboxActive }" @click.self="closeVideoLightbox">
      <div class="video-lightbox-top-bar" @click.stop v-if="videoLightboxActive">
        <button class="video-lightbox-close" @click="closeVideoLightbox">&times;</button>
      </div>
      <div class="video-lightbox-content" @click.stop v-if="videoLightboxActive">
        <video v-if="videoLightboxIsMp4" :src="videoLightboxUrl" controls controlsList="nodownload" disablePictureInPicture autoplay style="width:100%;max-height:85vh;object-fit:contain;border-radius:8px;box-shadow: 0 10px 30px rgba(0,0,0,0.5);"></video>
        <div v-else style="width:100%; display:flex; flex-direction:column; align-items:center;">
          <iframe :src="getYoutubeEmbedUrl(videoLightboxUrl, true, false)" style="width:100%;aspect-ratio:16/9;max-height:85vh;height:auto;max-width:1100px;border:none;border-radius:8px;box-shadow: 0 10px 30px rgba(0,0,0,0.5);" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useLang } from '../composables/useLang'
import api from '../api'

const { t, localizedValue, langPath, lang } = useLang()
const hero = ref(window.__INITIAL_STATE__?.hero || {})
const featuredProducts = ref(window.__INITIAL_STATE__?.featuredProducts || [])
const categories = ref(window.__INITIAL_STATE__?.categories || [])
const pageTexts = ref(typeof window !== 'undefined' ? window.__INITIAL_STATE__?.pageTexts || {} : {})
const company = ref(typeof window !== 'undefined' ? window.__INITIAL_STATE__?.company || {} : {})

const videoLightboxActive = ref(false)
const videoLightboxUrl = ref('')
const videoLightboxIsMp4 = ref(false)

const openVideoLightbox = (url) => {
  videoLightboxUrl.value = url
  videoLightboxIsMp4.value = url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm')
  videoLightboxActive.value = true
  document.body.classList.add('no-scroll')
}

const closeVideoLightbox = () => {
  videoLightboxActive.value = false
  document.body.classList.remove('no-scroll')
  setTimeout(() => {
    videoLightboxUrl.value = ''
  }, 300)
}

const getYoutubeThumbnail = (url) => {
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
    return '';
  }
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}


const getYoutubeEmbedUrl = (url, autoplay, mute = false) => {
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
    return url + (url.includes('?') ? '&' : '?') + (autoplay ? `autoplay=1${mute ? '&mute=1' : ''}&` : '') + 'enablejsapi=1&playsinline=1&vq=hd2160';
  }
  return `https://www.youtube.com/embed/${videoId}?vq=hd2160&enablejsapi=1&playsinline=1${autoplay ? `&autoplay=1${mute ? '&mute=1' : ''}` : ''}`;
}

async function loadPageData() {
  try {
    if (!hero.value.id) {
      hero.value = await api.getHero()
    }
    if (!featuredProducts.value.length) {
      const productsRes = await api.getProducts({ featured: '1', limit: 12 })
      featuredProducts.value = productsRes.data
    }
    
    if (!categories.value.length) {
      const tree = await api.getCategoryTree()
      categories.value = tree.slice(0, 6)
    }
    
    if (!pageTexts.value.id || !company.value.id) {
      const [textsRes, companyRes] = await Promise.all([
        api.getPageTexts(),
        api.getCompany()
      ])
      if (!pageTexts.value.id) pageTexts.value = textsRes
      if (!company.value.id) company.value = companyRes
    }
  } catch (e) {
    console.error(e)
  }
}

onMounted(loadPageData)

// Re-fetch hero when language changes so stat labels update immediately
watch(lang, () => {
  api.getHero().then(data => { hero.value = data }).catch(() => {})
})

</script>

<style scoped>
/* Hero Section */
.hero {
  position: relative;
  height: 100vh;
  height: 100svh;
  min-height: 600px;
  display: flex;
  align-items: center;
  background: var(--primary-gradient);
  overflow: hidden;
  contain: layout style;
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><defs><pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(%23grid)"/></svg>');
}

.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(30, 64, 175, 0.9) 0%, rgba(59, 130, 246, 0.8) 100%);
}

.hero-content {
  position: relative;
  z-index: 2;
  text-align: center;
  color: var(--white);
  max-width: 800px;
  margin: 0 auto;
}

.hero-badge {
  display: inline-block;
  padding: 8px 24px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50px;
  font-size: var(--text-sm);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: var(--spacing-md);
  backdrop-filter: blur(10px);
}

.hero-title {
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 800;
  line-height: var(--leading-tight);
  margin-bottom: var(--spacing);
  background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: var(--text-xl);
  line-height: var(--leading-relaxed);
  margin-bottom: var(--spacing-2xl);
  opacity: 0.9;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: var(--spacing-2xl);
  margin-bottom: var(--spacing-2xl);
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: var(--text-5xl);
  font-weight: 800;
  line-height: 1;
  margin-bottom: var(--spacing-sm);
}

.stat-label {
  font-size: var(--text-sm);
  opacity: 0.8;
  font-weight: 500;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: var(--spacing);
  flex-wrap: wrap;
}

.hero-actions .btn {
  min-width: 180px;
}

.btn-outline {
  background: rgba(255, 255, 255, 0.1);
  color: var(--white);
  border: 2px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
}

.btn-outline:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
}

/* Section Styles */
.section {
  padding: var(--spacing-2xl) 0;
}

.section-header {
  text-align: center;
  margin-bottom: var(--spacing-2xl);
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.section-badge {
  display: inline-block;
  padding: 6px 16px;
  background: var(--primary);
  color: var(--white);
  border-radius: 50px;
  font-size: var(--text-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--spacing);
}

.section-title {
  font-size: var(--text-4xl);
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: var(--spacing);
  line-height: var(--leading-tight);
}

.section-subtitle {
  font-size: var(--text-lg);
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
}

.section-footer {
  text-align: center;
  margin-top: var(--spacing-lg);
}

/* Featured Products */
.featured-products {
  background: var(--gray-50);
  min-height: 800px;
  padding-bottom: var(--spacing-xl);
  content-visibility: auto;
  contain-intrinsic-size: 0 800px;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-lg);
}

.product-card {
  background: var(--white);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow);
  transition: var(--transition-slow);
  text-decoration: none;
  color: inherit;
}

.product-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-xl);
}

.product-image {
  position: relative;
  aspect-ratio: 4/3;
  overflow: hidden;
  background: var(--gray-100);
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: var(--transition-slow);
  loading: lazy;
}

.product-card:hover .product-image img {
  transform: scale(1.1);
}

.product-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(30, 64, 175, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: var(--transition);
}

.product-card:hover .product-overlay {
  opacity: 1;
}

.product-actions {
  display: flex;
  gap: var(--spacing);
}

.action-btn {
  width: 48px;
  height: 48px;
  background: var(--white);
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
  cursor: pointer;
  transition: var(--transition);
}

.action-btn:hover {
  transform: scale(1.1);
}

.action-btn svg {
  width: 20px;
  height: 20px;
}

.product-info {
  padding: var(--spacing-md);
}

.product-name {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
  line-height: var(--leading-tight);
}

.product-category {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-weight: 500;
}

/* Categories */
.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}

.categories-section {
  background: var(--white);
  min-height: 600px;
  content-visibility: auto;
  contain-intrinsic-size: 0 600px;
}

.category-card {
  background: var(--white);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow);
  transition: var(--transition-slow);
  text-decoration: none;
  color: inherit;
}

.category-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.category-image {
  position: relative;
  aspect-ratio: 16/9;
  overflow: hidden;
  background: var(--gray-100);
}

.category-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: var(--transition-slow);
}

.category-card:hover .category-image img {
  transform: scale(1.05);
}

.category-overlay {
  position: absolute;
  top: var(--spacing);
  right: var(--spacing);
  width: 40px;
  height: 40px;
  background: var(--white);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: var(--transition);
}

.category-card:hover .category-overlay {
  opacity: 1;
}

.category-icon svg {
  width: 20px;
  height: 20px;
  color: var(--primary);
}

.category-info {
  padding: var(--spacing-md);
}

.category-name {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
}

.category-count {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-weight: 500;
}

/* Advantages */
.advantages-section {
  background: var(--gray-50);
}

.advantages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.advantage-card {
  background: var(--white);
  padding: var(--spacing-2xl);
  border-radius: var(--radius-lg);
  text-align: center;
  box-shadow: var(--shadow);
  transition: var(--transition-slow);
}

.advantage-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.advantage-icon {
  width: 80px;
  height: 80px;
  background: var(--primary-gradient);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--spacing-md);
  color: var(--white);
}

.advantage-icon svg {
  width: 32px;
  height: 32px;
}

.advantage-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--spacing);
}

.advantage-desc {
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
}

/* CTA Section */
.cta-section {
  background: var(--primary-gradient);
  color: var(--white);
}

.cta-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2xl);
  max-width: 1000px;
  margin: 0 auto;
}

.cta-title {
  font-size: var(--text-3xl);
  font-weight: 800;
  margin-bottom: var(--spacing);
  line-height: var(--leading-tight);
}

.cta-subtitle {
  font-size: var(--text-lg);
  opacity: 0.9;
  line-height: var(--leading-relaxed);
}

.cta-actions {
  display: flex;
  gap: var(--spacing);
  flex-shrink: 0;
}

.btn-ghost {
  background: rgba(255, 255, 255, 0.1);
  color: var(--white);
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
}

.icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero-stats {
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .hero-actions {
    flex-direction: column;
    align-items: center;
  }

  .hero-actions .btn {
    width: 100%;
    max-width: 280px;
  }

  .products-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .categories-grid,
  .advantages-grid {
    grid-template-columns: 1fr;
  }

  .cta-content {
    flex-direction: column;
    text-align: center;
  }

  .cta-actions {
    flex-direction: column;
    width: 100%;
  }

  .cta-actions .btn {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .products-grid {
    grid-template-columns: 1fr;
  }

  .section {
    padding: var(--spacing-xl) 0;
  }

  .section-title {
    font-size: var(--text-3xl);
  }

  .hero-title {
    font-size: var(--text-3xl);
  }

  .hero-subtitle {
    font-size: var(--text-lg);
  }

  .stat-number {
    font-size: var(--text-4xl);
  }
}

/* Video Cover System */
.yt-video-active, .yt-video-cover {
  width: 100%;
  height: 500px;
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  background: #000;
}

@media (max-width: 768px) {
  .yt-video-active, .yt-video-cover {
    height: 300px;
  }
}

.yt-video-cover {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.yt-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.8;
  transition: opacity 0.3s;
}

.yt-video-cover:hover .yt-thumbnail {
  opacity: 1;
}

.yt-thumbnail-fallback {
  width: 100%;
  height: 100%;
  background: #222;
}

.yt-play-button {
  position: absolute;
  width: 68px;
  height: 48px;
  transition: transform 0.2s;
  z-index: 2;
}

.yt-video-cover:hover .yt-play-button {
  transform: scale(1.1);
}

.yt-play-bg {
  transition: fill 0.2s;
}

.yt-video-cover:hover .yt-play-bg {
  fill: #ff0000;
}

/* Video Lightbox */
.video-lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
  backdrop-filter: blur(5px);
}
.video-lightbox.active {
  opacity: 1;
  pointer-events: auto;
}
.video-lightbox-top-bar {
  position: absolute;
  top: 0;
  right: 0;
  padding: 20px;
  z-index: 10001;
}
.video-lightbox-close {
  background: none;
  border: none;
  color: white;
  font-size: 40px;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}
.video-lightbox-close:hover {
  opacity: 1;
}
.video-lightbox-content {
  width: 100%;
  max-width: 1200px;
  padding: 0 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}

</style>
