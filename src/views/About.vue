<template>
  <div class="about-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="container">
        <div class="header-content">
          <nav class="breadcrumb">
            <router-link to="/" class="breadcrumb-link">{{ t('home') }}</router-link>
            <svg class="breadcrumb-separator" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
            </svg>
            <span class="breadcrumb-current">{{ t('about') }}</span>
          </nav>
          <h1 class="page-title">{{ t('about') }}</h1>
          <p class="page-subtitle">Learn more about our company and values</p>
        </div>
      </div>
    </div>

    <!-- About Content -->
    <div class="page-content">
      <div class="container">
        <!-- Company Introduction -->
        <div class="intro-section">
          <div class="intro-layout">
            <div class="intro-image" v-if="company?.about_image">
              <img :src="company.about_image" :alt="localizedValue(company, 'name')" />
              <div class="image-overlay">
                <div class="overlay-content">
                  <h3>{{ localizedValue(company, 'name') }}</h3>
                  <p>{{ pageTexts?.about_overlay_text || 'Professional LED Solutions' }}</p>
                </div>
              </div>
            </div>
            <div class="intro-content">
              <div class="company-header">
                <h2 class="company-name">{{ localizedValue(company, 'name') }}</h2>
                <div class="company-tagline">
                  <svg class="tagline-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                   <span>{{ pageTexts?.about_tagline || 'Trusted LED Manufacturer & Exporter' }}</span>
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
                   <span>{{ pageTexts?.about_iso || 'ISO Certified Quality' }}</span>
                </div>
                <div class="highlight-item">
                  <svg class="highlight-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                   <span>{{ pageTexts?.about_global || 'Global Export Experience' }}</span>
                </div>
                <div class="highlight-item">
                  <svg class="highlight-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" />
                  </svg>
                   <span>{{ pageTexts?.about_innovation || 'Innovation & Technology' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Statistics Section -->
        <div class="stats-section" v-if="hero">
          <div class="stats-header">
            <h2>Our Achievements</h2>
            <p>Numbers that speak for our excellence</p>
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
            <p>What makes us the preferred choice for LED solutions</p>
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
                <p>Professional quality and service excellence in every aspect of our business operations.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- CTA Section -->
        <div class="cta-section">
          <div class="cta-content">
            <div class="cta-text">
              <h2>{{ t('getInTouch') }}</h2>
              <p>{{ pageTexts?.about_cta_subtitle || 'Ready to start your LED project? Contact our expert team for professional consultation and competitive pricing.' }}</p>
            </div>
            <div class="cta-actions">
              <router-link to="/contact" class="btn btn-primary btn-lg">
                <svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                {{ t('contactUs') }}
              </router-link>
              <router-link to="/products" class="btn btn-outline btn-lg">
                <svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
                </svg>
                View Products
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useLang } from '../composables/useLang'
import api from '../api'

const { t, localizedValue, lang } = useLang()
const company = ref(null)
const hero = ref(null)
const pageTexts = ref(null)

const advantages = computed(() => {
  if (!company.value) return []
  const text = lang.value === 'en' ? company.value.advantages_en : company.value.advantages
  return text?.split('\n').filter(Boolean) || []
})

onMounted(async () => {
  try {
    [company.value, hero.value, pageTexts.value] = await Promise.all([
      api.getCompany(),
      api.getHero(),
      api.getPageTexts()
    ])
  } catch (e) {
    console.error(e)
  }
})
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
  align-items: center;
}

.intro-image {
  position: relative;
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
</style>
