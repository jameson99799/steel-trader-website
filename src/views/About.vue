<template>
  <div class="about-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="container">
        <div class="header-content">
          <nav class="breadcrumb">
            <router-link :to="langPath('/')" class="breadcrumb-link">{{ t('home') }}</router-link>
            <svg class="breadcrumb-separator" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
            </svg>
            <span class="breadcrumb-current">{{ t('about') }}</span>
          </nav>
          <h1 class="page-title">{{ t('about') }}</h1>
          <p class="page-subtitle">{{ t('learnMore') }}</p>
        </div>
      </div>
    </div>

    <!-- About Content -->
    <div class="page-content">
      <div class="container">
        <!-- Company Introduction -->
        <div class="intro-section">
          <div class="intro-layout">
            <!-- Modern Video Component -->
            <div class="intro-image" v-if="company?.company_video_embed && company?.about_show_video">
              <template v-if="company.company_video_embed.toLowerCase().endsWith('.mp4') || company.company_video_embed.toLowerCase().endsWith('.webm')">
                <div class="yt-video-active" v-if="company.about_video_autoplay === 1" @click="openVideoLightbox(company.company_video_embed)" style="cursor: pointer;">
                  <video :src="company.company_video_embed" autoplay controlsList="nodownload" disablePictureInPicture muted loop playsinline style="width:100%;height:100%;object-fit:contain;background-color:#000;pointer-events:none;"></video>
                </div>
                <div v-else class="yt-video-cover" @click="openVideoLightbox(company.company_video_embed)">
                  <video :src="company.company_video_embed" preload="metadata" style="width:100%;height:100%;object-fit:contain;background-color:#000;pointer-events:none;"></video>
                  <div class="yt-play-button"><svg viewBox="0 0 68 48"><path class="yt-play-bg" d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00"></path><path d="M 45,24 27,14 27,34" fill="#fff"></path></svg></div>
                </div>
              </template>
              <template v-else>
                <div v-if="company.about_video_autoplay === 1" class="yt-video-active" @click="openVideoLightbox(company.company_video_embed)" style="cursor: pointer;">
                  <iframe 
                    :src="getYoutubeEmbedUrl(company.company_video_embed, true, true)" 
                    style="width:100%;height:100%;border:none;pointer-events:none;" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    allowfullscreen>
                  </iframe>
                </div>
                <div v-else class="yt-video-cover" @click="openVideoLightbox(company.company_video_embed)">
                  <img v-if="getYoutubeThumbnail(company.company_video_embed)" :src="getYoutubeThumbnail(company.company_video_embed)" class="yt-thumbnail" />
                  <div v-else class="yt-thumbnail-fallback"></div>
                  <div class="yt-play-button">
                    <svg viewBox="0 0 68 48"><path class="yt-play-bg" d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00"></path><path d="M 45,24 27,14 27,34" fill="#fff"></path></svg>
                  </div>
                </div>
              </template>
            </div>
            <div class="intro-image about-clickable-image" v-else-if="company?.about_image" @click="openImageLightbox">
              <img :src="company.about_image" :alt="localizedValue(company, 'name')" />
              <div class="image-overlay">
                <div class="overlay-content">
                  <h3>{{ localizedValue(company, 'name') }}</h3>
                  <p>{{ localizedValue(pageTexts, 'about_overlay_text') }}</p>
                </div>
              </div>
              <div class="image-overlay-hover">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
            </div>
            <div class="intro-content">
              <div class="company-header">
                <h2 class="company-name">{{ localizedValue(company, 'name') }}</h2>
                <div class="company-tagline">
                  <svg class="tagline-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                   <span>{{ localizedValue(pageTexts, 'about_tagline') || t('aboutUs') }}</span>
                </div>
              </div>
              <div class="company-description">
                <p>{{ localizedValue(company, 'description') }}</p>
              </div>
              <div class="company-highlights">
                <div class="highlight-item">
                  <svg class="highlight-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                   <span>{{ localizedValue(pageTexts, 'about_iso') }}</span>
                </div>
                <div class="highlight-item">
                  <svg class="highlight-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                   <span>{{ localizedValue(pageTexts, 'about_global') }}</span>
                </div>
                <div class="highlight-item">
                  <svg class="highlight-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" />
                  </svg>
                   <span>{{ localizedValue(pageTexts, 'about_innovation') }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Statistics Section -->
        <div class="stats-section" v-if="hero">
          <div class="stats-header">
            <h2>{{ t('ourAchievements') }}</h2>
            <p>{{ t('achievementsDesc') }}</p>
          </div>
          <div class="stats-grid">
            <div class="stat-card" v-if="hero.stat1_num">
              <div class="stat-icon">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="stat-content">
                <span class="stat-num">{{ hero.stat1_num }}</span>
                <span class="stat-label">{{ localizedValue(hero, 'stat1_label') }}</span>
              </div>
            </div>
            <div class="stat-card" v-if="hero.stat2_num">
              <div class="stat-icon">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
              </div>
              <div class="stat-content">
                <span class="stat-num">{{ hero.stat2_num }}</span>
                <span class="stat-label">{{ localizedValue(hero, 'stat2_label') }}</span>
              </div>
            </div>
            <div class="stat-card" v-if="hero.stat3_num">
              <div class="stat-icon">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="stat-content">
                <span class="stat-num">{{ hero.stat3_num }}</span>
                <span class="stat-label">{{ localizedValue(hero, 'stat3_label') }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Advantages Section -->
        <div class="advantages-section" v-if="advantages.length">
          <div class="section-header">
            <h2>{{ t('ourAdvantages') }}</h2>
            <p>{{ t('advantagesPageDesc') }}</p>
          </div>
          <div class="advantages-grid">
            <div class="advantage-card" v-for="(adv, index) in advantages" :key="index">
              <div class="advantage-icon">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="advantage-content">
                <h3>{{ adv }}</h3>
                <p>{{ index === 0 ? t('factoryDirectDesc') : index === 1 ? t('qualityAssuranceDesc') : index === 2 ? t('fastDeliveryDesc') : t('customServiceDesc') }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- CTA Section -->
        <div class="cta-section">
          <div class="cta-content">
            <div class="cta-text">
              <h2>{{ t('getInTouch') }}</h2>
              <p>{{ localizedValue(pageTexts, 'about_cta_subtitle') || t('getQuote') }}</p>
            </div>
            <div class="cta-actions">
              <router-link :to="langPath('/contact')" class="btn btn-primary btn-lg">
                <svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                {{ t('contactUs') }}
              </router-link>
              <router-link :to="langPath('/products')" class="btn btn-outline btn-lg">
                <svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
                </svg>
                {{ t('viewProducts') }}
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>

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

    <!-- Image Lightbox (Factory-style) -->
    <div class="lightbox" :class="{ 'active': imageLightboxActive }" @click="closeImageLightbox">
      <div class="lightbox-top-bar" @click.stop v-if="imageLightboxActive">
        <div class="lightbox-center-controls">
          <div class="lightbox-title">{{ localizedValue(company, 'name') }}</div>
        </div>
        <button class="lightbox-close" @click="closeImageLightbox">&times;</button>
      </div>

      <div class="lightbox-content" @click.stop v-if="imageLightboxActive">
        <img :src="company.about_image" @click="closeImageLightbox" />
      </div>

      <div class="lightbox-bottom-bar" @click.stop v-if="imageLightboxActive">
        <button class="lightbox-bottom-nav" @click="closeImageLightbox">&times;</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useLang } from '../composables/useLang'
import api from '../api'

const { t, localizedValue, lang, langPath } = useLang()
const company = ref(typeof window !== 'undefined' ? window.__INITIAL_STATE__?.company || null : null)
const hero = ref(null)
const pageTexts = ref(typeof window !== 'undefined' ? window.__INITIAL_STATE__?.pageTexts || null : null)

const imageLightboxActive = ref(false)

const openImageLightbox = () => {
  imageLightboxActive.value = true
  document.body.classList.add('no-scroll')
}

const closeImageLightbox = () => {
  imageLightboxActive.value = false
  document.body.classList.remove('no-scroll')
}

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
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1];
    const questionPosition = videoId.indexOf('?');
    if(questionPosition !== -1) videoId = videoId.substring(0, questionPosition);
  } else {
    return '';
  }
  return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
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

const advantages = computed(() => {
  if (!company.value) return []
  const text = localizedValue(company.value, 'advantages')
  return text?.split('\n').filter(Boolean) || []
})

const loadData = async () => {
  try {
    ;[company.value, hero.value, pageTexts.value] = await Promise.all([
      api.getCompany(),
      api.getHero(),
      api.getPageTexts()
    ])
  } catch (e) {
    console.error(e)
  }
}

watch(lang, loadData)
onMounted(loadData)
</script>

<style scoped>
.about-page {
  min-height: 100vh;
  background: var(--gray-50);
}

.page-header {
  background: var(--white);
  border-bottom: 1px solid var(--border);
  padding: var(--spacing-xl) 0;
}

.header-content {
  text-align: center;
}

.breadcrumb {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing);
  font-size: var(--text-sm);
}

.breadcrumb-link {
  color: var(--text-secondary);
  transition: var(--transition);
}

.breadcrumb-link:hover {
  color: var(--primary);
}

.breadcrumb-separator {
  width: 16px;
  height: 16px;
  color: var(--text-muted);
}

.breadcrumb-current {
  color: var(--text-primary);
  font-weight: 600;
}

.page-title {
  font-size: var(--text-5xl);
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
  line-height: var(--leading-tight);
}

.page-subtitle {
  color: var(--text-secondary);
  font-size: var(--text-lg);
}

.page-content {
  padding: var(--spacing-2xl) 0;
}

.intro-section {
  margin-bottom: var(--spacing-2xl);
}

.intro-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-2xl);
  align-items: start;
}

.intro-image {
  position: sticky;
  top: 100px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
}

.intro-image img {
  width: 100%;
  height: 500px;
  object-fit: cover;
  transition: var(--transition-slow);
}

.intro-image:hover img {
  transform: scale(1.05);
}

.image-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  padding: var(--spacing-xl) var(--spacing-md) var(--spacing-md);
  color: var(--white);
}

.overlay-content h3 {
  font-size: var(--text-2xl);
  font-weight: 700;
  margin-bottom: var(--spacing-sm);
}

.overlay-content p {
  font-size: var(--text-sm);
  opacity: 0.9;
}

.intro-content {
  background: var(--white);
  padding: var(--spacing-xl);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.company-header {
  margin-bottom: var(--spacing-xl);
}

.company-name {
  font-size: var(--text-4xl);
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: var(--spacing);
  line-height: var(--leading-tight);
}

.company-tagline {
  display: flex;
  align-items: center;
  gap: var(--spacing);
  color: var(--primary);
  font-weight: 600;
  font-size: var(--text-lg);
}

.tagline-icon {
  width: 24px;
  height: 24px;
}

.company-description {
  margin-bottom: var(--spacing-xl);
}

.company-description p {
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
  font-size: var(--text-lg);
  white-space: pre-wrap;
}

.company-highlights {
  display: flex;
  flex-direction: column;
  gap: var(--spacing);
}

.highlight-item {
  display: flex;
  align-items: center;
  gap: var(--spacing);
  padding: var(--spacing);
  background: var(--gray-50);
  border-radius: var(--radius);
  border-left: 4px solid var(--primary);
}

.highlight-icon {
  width: 20px;
  height: 20px;
  color: var(--primary);
  flex-shrink: 0;
}

.highlight-item span {
  font-weight: 600;
  color: var(--text-primary);
}

.stats-section {
  margin-bottom: var(--spacing-2xl);
}

.stats-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.stats-header h2 {
  font-size: var(--text-4xl);
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: var(--spacing);
}

.stats-header p {
  color: var(--text-secondary);
  font-size: var(--text-lg);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-xl);
}

.stat-card {
  background: var(--white);
  padding: var(--spacing-xl);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  text-align: center;
  position: relative;
  overflow: hidden;
  transition: var(--transition);
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--primary-gradient);
}

.stat-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-xl);
}

.stat-icon {
  width: 60px;
  height: 60px;
  background: var(--primary-gradient);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--spacing-md);
}

.stat-icon svg {
  width: 30px;
  height: 30px;
  color: var(--white);
}

.stat-num {
  display: block;
  font-size: var(--text-5xl);
  font-weight: 800;
  color: var(--primary);
  margin-bottom: var(--spacing-sm);
  line-height: 1;
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.advantages-section {
  margin-bottom: var(--spacing-2xl);
}

.section-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.section-header h2 {
  font-size: var(--text-4xl);
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: var(--spacing);
}

.section-header p {
  color: var(--text-secondary);
  font-size: var(--text-lg);
}

.advantages-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-xl);
}

.advantage-card {
  background: var(--white);
  padding: var(--spacing-xl);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  display: flex;
  gap: var(--spacing-md);
  transition: var(--transition);
}

.advantage-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.advantage-icon {
  width: 48px;
  height: 48px;
  background: var(--success);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.advantage-icon svg {
  width: 24px;
  height: 24px;
  color: var(--white);
}

.advantage-content h3 {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
}

.advantage-content p {
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
}

.cta-section {
  background: var(--white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
  position: relative;
}

.cta-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--primary-gradient);
  opacity: 0.05;
}

.cta-content {
  position: relative;
  padding: var(--spacing-2xl);
  text-align: center;
}

.cta-text {
  margin-bottom: var(--spacing-xl);
}

.cta-text h2 {
  font-size: var(--text-4xl);
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: var(--spacing);
}

.cta-text p {
  color: var(--text-secondary);
  font-size: var(--text-lg);
  line-height: var(--leading-relaxed);
  max-width: 600px;
  margin: 0 auto;
}

.cta-actions {
  display: flex;
  justify-content: center;
  gap: var(--spacing-md);
}

.btn-icon {
  width: 20px;
  height: 20px;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .intro-layout {
    grid-template-columns: 1fr;
    gap: var(--spacing-xl);
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }
  
  .advantages-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }
}

@media (max-width: 768px) {
  .page-header {
    padding: var(--spacing-md) 0;
  }
  
  .page-title {
    font-size: var(--text-4xl);
  }
  
  .page-content {
    padding: var(--spacing-xl) 0;
  }
  
  .intro-content {
    padding: var(--spacing-md);
  }
  
  .company-name {
    font-size: var(--text-3xl);
  }
  
  .company-tagline {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }
  
  .company-highlights {
    gap: var(--spacing-sm);
  }
  
  .highlight-item {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }
  
  .stats-header h2,
  .section-header h2,
  .cta-text h2 {
    font-size: var(--text-3xl);
  }
  
  .stat-num {
    font-size: var(--text-4xl);
  }
  
  .advantage-card {
    flex-direction: column;
    text-align: center;
  }
  
  .cta-content {
    padding: var(--spacing-xl) var(--spacing-md);
  }
  
  .cta-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .breadcrumb {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .intro-image img {
    height: 300px;
  }
  
  .stat-card {
    padding: var(--spacing-md);
  }
  
  .advantage-card {
    padding: var(--spacing-md);
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


/* Lightbox */
.lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
  backdrop-filter: blur(5px);
}

.lightbox.active {
  opacity: 1;
  pointer-events: auto;
}

.lightbox-content {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
}

.lightbox-content img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  border-radius: 4px;
}

.lightbox-top-bar {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 60px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 20px;
  color: white;
  z-index: 10;
}

.lightbox-center-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 800px;
  padding: 0 80px; 
}

.lightbox-title {
  text-align: center;
  font-size: 32px;
  font-weight: 500;
  letter-spacing: 1px;
  flex: 1;
}

.lightbox-close {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: white;
  font-size: 44px;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
  padding: 0 10px;
}

.lightbox-close:hover {
  opacity: 1;
}

.lightbox-bottom-bar {
  position: absolute;
  bottom: 20px;
  left: 0;
  width: 100%;
  height: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 80px;
  z-index: 1000;
  padding-bottom: env(safe-area-inset-bottom);
}

.lightbox-bottom-nav {
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid rgba(255, 255, 255, 0.6);
  color: white;
  font-size: 32px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
}

.lightbox-bottom-nav:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.about-clickable-image {
  cursor: zoom-in;
  position: relative;
}

.image-overlay-hover {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 2;
  pointer-events: none;
}

.about-clickable-image:hover .image-overlay-hover {
  opacity: 1;
}

.image-overlay-hover svg {
  width: 48px;
  height: 48px;
  color: var(--white);
}

@media (max-width: 768px) {
  .lightbox-top-bar { padding: 0; height: 60px; }
  .lightbox-center-controls { padding: 0 60px; }
  .lightbox-title { font-size: 24px; }
  .lightbox-close { right: 10px; font-size: 36px; z-index: 20; }
  .lightbox-content { padding: 60px 10px; }
  .lightbox-bottom-bar { bottom: 30px; }
}

</style>
