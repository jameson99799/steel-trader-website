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
                  <iframe 
                    :src="getYoutubeEmbedUrl(video.media_url, video.autoplay)" 
                    width="100%" 
                    height="400" 
                    style="border:0; border-radius:var(--radius-lg); box-shadow:var(--shadow);" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                  </iframe>
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
      <div class="lightbox-content" @click.stop v-if="lightboxGroup && lightboxImages.length > 0">
        <!-- Title bar -->
        <div class="lightbox-header">
          <span class="lightbox-title">{{ localizedValue(lightboxGroup.name_zh, lightboxGroup.name_en) }} ({{ lightboxIndex + 1 }} / {{ lightboxImages.length }})</span>
          <button class="lightbox-close" @click="closeLightbox">&times;</button>
        </div>
        
        <!-- Navigation -->
        <button class="lightbox-nav prev" @click="lightboxPrev" v-show="lightboxIndex > 0">❮</button>
        <button class="lightbox-nav next" @click="lightboxNext" v-show="lightboxIndex < lightboxImages.length - 1">❯</button>
        
        <!-- Image -->
        <img :src="lightboxImages[lightboxIndex].media_url" @click="closeLightbox" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useLang } from '../composables/useLang'
import api from '../api'

const { t, localizedValue, langPath } = useLang()
const loading = ref(true)
const groups = ref([])
const lightboxActive = ref(false)
const lightboxImages = ref([])
const lightboxIndex = ref(0)
const lightboxGroup = ref(null)

const carousels = {} // track intervals

const loadData = async () => {
  try {
    const res = await fetch('/api/factory/public')
    groups.value = await res.json()
  } catch (e) {
    console.error('Failed to load factory data', e)
  } finally {
    loading.value = false
  }
}

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
  return group.items.filter(item => item.type === 'video').sort((a, b) => a.sort_order - b.sort_order)
}

const getImages = (group) => {
  return group.items.filter(item => item.type === 'image').sort((a, b) => a.sort_order - b.sort_order)
}

const getYoutubeEmbedUrl = (url, autoplay) => {
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
  } else if (url.includes('youtube.com/embed/')) {
    videoId = url.split('embed/')[1];
    const questionPosition = videoId.indexOf('?');
    if(questionPosition !== -1) videoId = videoId.substring(0, questionPosition);
  } else {
    return url + (autoplay ? '?autoplay=1&mute=1' : '');
  }
  return `https://www.youtube.com/embed/${videoId}${autoplay ? '?autoplay=1&mute=1' : ''}`;
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
  max-height: 90vh;
}

.lightbox-content img {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  cursor: zoom-out;
}

.lightbox-close {
  position: absolute;
  top: -40px;
  right: 0;
  background: none;
  border: none;
  color: white;
  font-size: 36px;
  cursor: pointer;
  line-height: 1;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.lightbox-close:hover {
  opacity: 1;
}

.lightbox-header {
  position: absolute;
  top: -40px;
  left: 0;
  color: white;
  font-size: 18px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 12px;
}

.lightbox-title {
  background: rgba(0,0,0,0.5);
  padding: 4px 12px;
  border-radius: 4px;
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: none;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(4px);
}

.lightbox-nav:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-50%) scale(1.1);
}

.lightbox-nav.prev {
  left: -70px;
}

.lightbox-nav.next {
  right: -70px;
}

/* Responsive */
@media (max-width: 1024px) {
  .carousel-slide {
    flex: 0 0 calc(50% - 8px);
  }
}

@media (max-width: 768px) {
  .lightbox-nav.prev { left: -10px; }
  .lightbox-nav.next { right: -10px; }
  .lightbox-header { top: -30px; font-size: 14px; }
  
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

  .video-item iframe {
    height: 250px;
  }
}
</style>
