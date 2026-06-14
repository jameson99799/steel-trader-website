<template>
  <div class="factory-page">
    <div class="page-header">
      <div class="container">
        <div class="header-content">
          <nav class="breadcrumb">
            <router-link :to="langPath('/')" class="breadcrumb-link">{{ t('home') }}</router-link>
            <svg class="breadcrumb-separator" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
            </svg>
            <span class="breadcrumb-current">{{ t('factory') || 'Factory' }}</span>
          </nav>
          <h1 class="page-title">{{ t('factoryTour') || 'Factory Tour' }}</h1>
          <p class="page-subtitle">{{ t('factoryDesc') || 'Explore our modern manufacturing facilities and advanced production lines.' }}</p>
          <div class="group-nav-buttons" v-if="groups.length > 0">
            <button v-for="group in groups" :key="'nav-'+group.id" class="group-nav-btn" @click="scrollToGroup(group.id)">
              {{ localizedValue(group, 'name') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="page-content">
      <div class="container">
        <div v-if="loading" class="loading-wrapper">
          <div class="loader"></div>
        </div>

        <div v-else-if="groups.length === 0" class="empty-state">
          <p>No factory information available yet.</p>
        </div>

        <div v-else class="factory-groups">
          <div v-for="(group, idx) in groups" :key="group.id" :id="'factory-group-' + group.id" class="group-section" :class="{ 'alt-bg': idx % 2 !== 0 }">
            <div class="section-header">
              <h2>{{ localizedValue(group, 'name') }}</h2>
              <div class="header-line"></div>
            </div>

            <div class="group-content">
              <!-- Videos block: display videos first if any -->
              <div v-if="getVideos(group).length > 0" class="videos-grid">
                <div v-for="video in getVideos(group)" :key="video.id" class="video-item">
                  <template v-if="video.media_url && (video.media_url.toLowerCase().endsWith('.mp4') || video.media_url.toLowerCase().endsWith('.webm'))">
                    <video v-if="activeVideoId === video.id || video.autoplay" :src="video.media_url" :autoplay="video.autoplay === 1" :controls="video.autoplay !== 1" :muted="video.autoplay === 1" :loop="video.autoplay === 1" playsinline style="width:100%;height:100%;object-fit:cover;"></video>
                    <div v-else class="yt-video-cover" @click="playVideo(video.id)">
                      <video :src="video.media_url" preload="metadata" style="width:100%;height:100%;object-fit:cover;"></video>
                      <div class="yt-play-button"><svg viewBox="0 0 68 48"><path class="yt-play-bg" d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00"></path><path d="M 45,24 27,14 27,34" fill="#fff"></path></svg></div>
                    </div>
                  </template>
                  <template v-else>
                    <div v-if="activeVideoId === video.id" class="yt-video-active">
                      <iframe 
                        :src="getYoutubeEmbedUrl(video.media_url, true, isAutoPlaying)" 
                        width="100%" 
                        height="100%" 
                        style="border:0;" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowfullscreen>
                      </iframe>
                      <div style="text-align: right; margin-top: 8px; font-size: 13px;">
                        <a :href="video.media_url" target="_blank" style="color: var(--primary); text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                          <svg viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px;"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                          Watch on YouTube App (If Sign-In Fails)
                        </a>
                      </div>
                    </div>
                    <div v-else class="yt-video-cover" @click="playVideo(video.id)">
                      <img v-if="getYoutubeThumbnail(video.media_url)" :src="getYoutubeThumbnail(video.media_url)" class="yt-thumbnail" />
                      <div v-else class="yt-thumbnail-fallback"></div>
                      <div class="yt-play-button">
                        <svg viewBox="0 0 68 48"><path class="yt-play-bg" d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00"></path><path d="M 45,24 27,14 27,34" fill="#fff"></path></svg>
                      </div>
                    </div>
                  </template>
                  
                  <!-- Video Description Block -->
                  <div v-if="video.show_desc && (video['description_' + lang] || video.description)" class="video-description">
                    {{ video['description_' + lang] || video.description }}
                  </div>
                </div>
              </div>

              <!-- Images block -->
              <div v-if="getImages(group).length > 0" class="images-block">
                <!-- Carousel Mode -->
                <div v-if="group.carousel_enabled" class="carousel-wrapper">
                  <div class="carousel-container" :ref="el => { if (el) startCarousel(el, group.id, group.carousel_speed) }">
                    <div class="carousel-track" :id="'carousel-' + group.id">
                      <div v-for="(img, idx) in getImages(group)" :key="img.id" class="carousel-slide" :id="'factory-img-' + img.id">
                        <img :src="img.media_url" @click="openLightbox(group, idx)" loading="lazy" />
                      </div>
                    </div>
                  </div>
                  <button class="carousel-btn prev" @click="scrollCarousel(group.id, -1)">❮</button>
                  <button class="carousel-btn next" @click="scrollCarousel(group.id, 1)">❯</button>
                </div>

                <!-- Grid Mode -->
                <div v-else class="images-grid">
                  <div v-for="(img, idx) in getImages(group)" :key="img.id" class="image-item" :id="'factory-img-' + img.id" @click="openLightbox(group, idx)">
                    <div class="image-inner">
                      <img :src="img.media_url" loading="lazy" />
                      <div class="image-overlay-hover">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Lightbox -->
    <div class="lightbox" :class="{ 'active': lightboxActive }" @click="closeLightbox">
      <div class="lightbox-top-bar" @click.stop v-if="lightboxGroup && lightboxImages.length > 0">
        <div class="lightbox-center-controls">
          <div class="lightbox-title">{{ localizedValue(lightboxGroup, 'name') }} &nbsp;&nbsp; {{ lightboxIndex + 1 }} / {{ lightboxImages.length }}</div>
        </div>
        <button class="lightbox-close" @click="closeLightbox">&times;</button>
      </div>

      <div class="lightbox-content" @click.stop v-if="lightboxGroup && lightboxImages.length > 0">
        <!-- Image -->
        <img :src="lightboxImages[lightboxIndex].media_url" @click="closeLightbox" />
      </div>

      <div class="lightbox-bottom-bar" @click.stop v-if="lightboxGroup && lightboxImages.length > 0">
        <button class="lightbox-bottom-nav prev" @click="lightboxPrev" :disabled="lightboxIndex === 0">❮</button>
        <button class="lightbox-bottom-nav next" @click="lightboxNext" :disabled="lightboxIndex === lightboxImages.length - 1">❯</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useLang } from '../composables/useLang'
import api from '../api'

const { t, localizedValue, langPath, lang } = useLang()
const loading = ref(true)
const groups = ref([])
const lightboxActive = ref(false)
const lightboxImages = ref([])
const lightboxIndex = ref(0)
const lightboxGroup = ref(null)

const carousels = {} // track intervals

const activeVideoId = ref(null)
const isAutoPlaying = ref(false)

const playVideo = (id) => {
  activeVideoId.value = id
  isAutoPlaying.value = false // manual click, so not auto-playing on load
}

const loadData = async () => {
  try {
    const res = await fetch(`/api/factory/public${lang.value !== 'en' ? '?lang=' + lang.value : ''}`)
    const data = await res.json()
    groups.value = data
    
    // Automatically play the first video marked as autoplay
    for (const group of data) {
      const autoVideo = group.items?.find(item => item.type === 'video' && item.autoplay === 1)
      if (autoVideo) {
        activeVideoId.value = autoVideo.id
        isAutoPlaying.value = true // set flag so we can mute it
        break
      }
    }
  } catch (e) {
    console.error('Failed to load factory data', e)
  } finally {
    loading.value = false
  }
}

watch(lang, () => {
  loading.value = true
  loadData()
})

const scrollToGroup = (id) => {
  const el = document.getElementById('factory-group-' + id)
  if (el) {
    const offset = 80 // Header offset
    const bodyRect = document.body.getBoundingClientRect().top
    const elementRect = el.getBoundingClientRect().top
    const elementPosition = elementRect - bodyRect
    const offsetPosition = elementPosition - offset
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    })
  }
}

const getVideos = (group) => {
  return group.items.filter(item => item.type === 'video').sort((a, b) => b.sort_order - a.sort_order)
}

const getImages = (group) => {
  return group.items.filter(item => item.type === 'image').sort((a, b) => b.sort_order - a.sort_order)
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
    return url + (url.includes('?') ? '&' : '?') + (autoplay ? `autoplay=1${mute ? '&mute=1' : ''}&` : '') + 'enablejsapi=1&playsinline=1&vq=hd1080';
  }
  return `https://www.youtube.com/embed/${videoId}?vq=hd1080&enablejsapi=1&playsinline=1${autoplay ? `&autoplay=1${mute ? '&mute=1' : ''}` : ''}`;
}

const openLightbox = (group, index) => {
  lightboxGroup.value = group
  lightboxImages.value = getImages(group)
  lightboxIndex.value = index
  lightboxActive.value = true
  // document.body.style.overflow = 'hidden' // Removed to allow background scrolling syncing
}

const closeLightbox = () => {
  lightboxActive.value = false
  setTimeout(() => {
    lightboxImages.value = []
    lightboxGroup.value = null
  }, 300)
}

const syncLightboxScroll = () => {
  const currentImg = lightboxImages.value[lightboxIndex.value]
  if (!currentImg) return
  const el = document.getElementById('factory-img-' + currentImg.id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

const lightboxPrev = () => {
  if (lightboxIndex.value > 0) {
    lightboxIndex.value--
    syncLightboxScroll()
  }
}

const lightboxNext = () => {
  if (lightboxIndex.value < lightboxImages.value.length - 1) {
    lightboxIndex.value++
    syncLightboxScroll()
  }
}

const handleKeydown = (e) => {
  if (!lightboxActive.value) return
  if (e.key === 'ArrowLeft') lightboxPrev()
  if (e.key === 'ArrowRight') lightboxNext()
  if (e.key === 'Escape') closeLightbox()
}

// Carousel logic
const startCarousel = (el, id, speedInSeconds) => {
  if (carousels[id]) return // Already running
  const track = el.querySelector('.carousel-track')
  if (!track) return

  carousels[id] = setInterval(() => {
    if (!track.children.length) return
    const firstSlide = track.children[0]
    const slideWidth = firstSlide.offsetWidth + 16 // includes gap
    track.scrollBy({ left: slideWidth, behavior: 'smooth' })
    
    // Reset to start if near end
    if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
      setTimeout(() => {
        track.scrollTo({ left: 0, behavior: 'smooth' })
      }, 500)
    }
  }, (speedInSeconds || 3) * 1000)
}

const scrollCarousel = (id, direction) => {
  const track = document.getElementById('carousel-' + id)
  if (!track || !track.children.length) return
  const slideWidth = track.children[0].offsetWidth + 16
  track.scrollBy({ left: direction * slideWidth, behavior: 'smooth' })
}

onMounted(() => {
  loadData()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  // Clear all carousel intervals
  Object.values(carousels).forEach(clearInterval)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.factory-page {
  min-height: 100vh;
  background: var(--gray-50);
}

.page-header {
  background: var(--white);
  border-bottom: 1px solid var(--border);
  padding: var(--spacing-xl) 0;
}

.header-content { text-align: center; }

.breadcrumb {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing);
  font-size: var(--text-sm);
}

.breadcrumb-link { color: var(--text-secondary); transition: var(--transition); }
.breadcrumb-link:hover { color: var(--primary); }
.breadcrumb-separator { width: 16px; height: 16px; color: var(--text-muted); }
.breadcrumb-current { color: var(--text-primary); font-weight: 600; }

.page-title {
  font-size: var(--text-5xl);
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
}

.page-subtitle {
  color: var(--text-secondary);
  font-size: var(--text-lg);
}

.group-nav-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
}

.group-nav-btn {
  padding: 10px 24px;
  border-radius: 30px;
  background: var(--white);
  border: 1px solid var(--border);
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
  box-shadow: 0 2px 4px rgba(0,0,0,0.03);
}

.group-nav-btn:hover {
  background: var(--primary);
  color: var(--white);
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.page-content {
  padding: 0 0 var(--spacing-2xl) 0;
}

.loading-wrapper {
  display: flex;
  justify-content: center;
  padding: 100px 0;
}

.loader {
  width: 48px;
  height: 48px;
  border: 5px solid var(--primary-light);
  border-bottom-color: var(--primary);
  border-radius: 50%;
  animation: rotation 1s linear infinite;
}

@keyframes rotation {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: var(--text-secondary);
  font-size: var(--text-lg);
}

.group-section {
  padding: var(--spacing-2xl) 0;
  border-bottom: 1px solid var(--border);
}

.group-section.alt-bg {
  background: var(--white);
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

.header-line {
  width: 60px;
  height: 4px;
  background: var(--primary-gradient);
  margin: 0 auto;
  border-radius: 2px;
}

.group-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-xl);
}

.videos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
}

.yt-video-active, .yt-video-cover {
  width: 100%;
  height: 400px;
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow);
  background: #000;
}

.video-description {
  margin-top: 12px;
  font-size: 15px;
  font-weight: 700;
  text-align: center;
  line-height: 1.6;
  color: var(--text);
  background: #f8fafc;
  padding: 16px 20px;
  border-radius: var(--radius-md);
  border: 1px solid #e2e8f0;
  white-space: pre-wrap;
  word-wrap: break-word;
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

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-md);
}

.image-item {
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  background: var(--white);
  box-shadow: var(--shadow);
  transition: var(--transition);
}

.image-item:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.image-inner {
  position: relative;
  aspect-ratio: 4/3;
  overflow: hidden;
}

.image-inner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.image-item:hover .image-inner img {
  transform: scale(1.05);
}

.image-overlay-hover {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-item:hover .image-overlay-hover {
  opacity: 1;
}

.image-overlay-hover svg {
  width: 48px;
  height: 48px;
  color: var(--white);
}

/* Carousel */
.carousel-wrapper {
  position: relative;
  padding: 0 40px;
}

.carousel-container {
  overflow: hidden;
  border-radius: var(--radius-lg);
}

.carousel-track {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding-bottom: 8px; /* For shadow */
}

.carousel-track::-webkit-scrollbar {
  display: none;
}

.carousel-slide {
  flex: 0 0 calc(33.333% - 11px);
  scroll-snap-align: start;
  aspect-ratio: 4/3;
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  box-shadow: var(--shadow);
  transition: var(--transition);
  position: relative;
}

.carousel-slide:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.carousel-slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.carousel-slide:hover img {
  transform: scale(1.05);
}

.carousel-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--white);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-md);
  color: var(--text-primary);
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition);
  z-index: 10;
}

.carousel-btn:hover {
  background: var(--primary);
  color: var(--white);
  border-color: var(--primary);
}

.carousel-btn.prev { left: 0; }
.carousel-btn.next { right: 0; }

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
  max-width: 90vw;
  max-height: calc(100vh - 100px);
  margin-top: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-content img {
  max-width: 100%;
  max-height: calc(100vh - 100px);
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  cursor: zoom-out;
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
  padding: 0 80px; /* Space for the absolute X button */
}

.lightbox-title {
  text-align: center;
  font-size: 32px;
  font-weight: 500;
  letter-spacing: 1px;
  flex: 1;
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

.lightbox-bottom-nav:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.lightbox-bottom-nav:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.lightbox-close {
  position: absolute;
  right: 20px;
  background: none;
  border: none;
  color: white;
  font-size: 36px;
  cursor: pointer;
  line-height: 1;
  opacity: 0.7;
  transition: opacity 0.2s;
  padding: 0 10px;
}

.lightbox-close:hover {
  opacity: 1;
}

/* Responsive */
@media (max-width: 1024px) {
  .carousel-slide {
    flex: 0 0 calc(50% - 8px);
  }
  .lightbox-bottom-bar {
    bottom: 80px;
  }
}

@media (max-width: 768px) {
  .lightbox-top-bar { padding: 0; height: 60px; }
  .lightbox-center-controls { padding: 0 60px; }
  .lightbox-title { font-size: 24px; }
  .lightbox-bottom-nav { width: 50px; height: 50px; font-size: 24px; }
  /* Avoid overlapping with FloatingContact on mobile */
  .lightbox-bottom-bar { gap: 40px; bottom: 80px; }
  .lightbox-close { right: 10px; font-size: 36px; z-index: 20; }
  
  .page-title {
    font-size: var(--text-4xl);
  }
  
  .section-header h2 {
    font-size: var(--text-3xl);
  }

  .carousel-slide {
    flex: 0 0 100%;
  }

  .carousel-wrapper {
    padding: 0;
  }

  .carousel-btn {
    display: none; /* Hide buttons on mobile, allow touch scrolling */
  }

  .videos-grid {
    grid-template-columns: 1fr;
  }

  .yt-video-active, .yt-video-cover {
    height: 250px;
  }
}
</style>
