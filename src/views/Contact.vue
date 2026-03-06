<template>
  <div class="contact-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="container">
        <div class="header-content">
          <nav class="breadcrumb">
            <router-link to="/" class="breadcrumb-link">{{ t('home') }}</router-link>
            <svg class="breadcrumb-separator" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
            </svg>
            <span class="breadcrumb-current">{{ t('contactUs') }}</span>
          </nav>
          <h1 class="page-title">{{ t('contactUs') }}</h1>
           <p class="page-subtitle">{{ pageTexts?.contact_page_subtitle || (t('getInTouch') + " - We're here to help with your LED requirements") }}</p>
        </div>
      </div>
    </div>

    <!-- Contact Content -->
    <div class="page-content">
      <div class="container">
        <div class="contact-layout">
          <!-- Contact Information -->
          <div class="contact-info-section">
            <div class="info-card">
              <div class="info-header">
                <h3>{{ localizedValue(company, 'name') }}</h3>
                <p class="company-tagline">{{ pageTexts?.contact_tagline || 'Professional LED Solutions Provider' }}</p>
              </div>
              
              <div class="info-content">
                <div class="info-item" v-if="company?.email">
                  <div class="info-icon">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </div>
                  <div class="info-details">
                    <label>{{ t('email') }}</label>
                    <a :href="`mailto:${company.email}`" class="info-value">{{ company.email }}</a>
                  </div>
                </div>

                <div class="info-item" v-if="company?.phone">
                  <div class="info-icon">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                  </div>
                  <div class="info-details">
                    <label>{{ t('phone') }}</label>
                    <a :href="`tel:${company.phone}`" class="info-value">{{ company.phone }}</a>
                  </div>
                </div>

                 <div class="info-item" v-if="company?.whatsapp">
                  <div class="info-icon whatsapp-icon-wrap">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                    </svg>
                  </div>
                  <div class="info-details">
                    <label>WhatsApp</label>
                    <a :href="`https://wa.me/${company.whatsapp.replace(/[^0-9]/g, '')}`" target="_blank" class="info-value">{{ company.whatsapp }}</a>
                  </div>
                </div>

                <div class="info-item" v-if="company?.wechat">
                  <div class="info-icon">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" />
                    </svg>
                  </div>
                  <div class="info-details">
                    <label>WeChat</label>
                    <span class="info-value">{{ company.wechat }}</span>
                  </div>
                </div>

                <div class="info-item" v-if="localizedValue(company, 'address')">
                  <div class="info-icon">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                    </svg>
                  </div>
                  <div class="info-details">
                    <label>{{ t('address') }}</label>
                    <span class="info-value">{{ localizedValue(company, 'address') }}</span>
                  </div>
                </div>
              </div>

              <div class="business-hours">
                <h4>Business Hours</h4>
                <div class="hours-list">
                  <div class="hours-item">
                    <span>Monday - Friday</span>
                    <span>9:00 AM - 6:00 PM</span>
                  </div>
                  <div class="hours-item">
                    <span>Saturday</span>
                    <span>9:00 AM - 12:00 PM</span>
                  </div>
                  <div class="hours-item">
                    <span>Sunday</span>
                    <span>Closed</span>
                  </div>
                </div>
              </div>

              <!-- Social Media Links -->
              <div class="social-links" v-if="company?.facebook || company?.linkedin || company?.instagram || company?.tiktok || company?.twitter || company?.youtube">
                <h4>Follow Us</h4>
                <div class="social-icons">
                  <a v-if="company.facebook" :href="company.facebook" target="_blank" class="social-icon" title="Facebook">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                  <a v-if="company.linkedin" :href="company.linkedin" target="_blank" class="social-icon" title="LinkedIn">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  </a>
                  <a v-if="company.instagram" :href="company.instagram" target="_blank" class="social-icon" title="Instagram">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  </a>
                  <a v-if="company.tiktok" :href="company.tiktok" target="_blank" class="social-icon" title="TikTok">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                  </a>
                  <a v-if="company.twitter" :href="company.twitter" target="_blank" class="social-icon" title="X (Twitter)">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </a>
                  <a v-if="company.youtube" :href="company.youtube" target="_blank" class="social-icon" title="YouTube">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  </a>
                </div>
              </div>

            </div>
          </div>

          <!-- Contact Form -->
          <div class="contact-form-section">
            <div class="form-card">
              <div class="form-header">
                <h3>{{ t('sendInquiry') }}</h3>
                <p>Fill out the form below and we'll get back to you within 24 hours</p>
              </div>
              
              <form @submit.prevent="handleSubmit" class="contact-form">
                <div class="form-row">
                  <div class="form-group">
                    <label>{{ t('name') }} <span class="required">*</span></label>
                    <input v-model="form.name" type="text" class="form-control" required placeholder="Your full name" />
                  </div>
                  <div class="form-group">
                    <label>{{ t('email') }} <span class="required">*</span></label>
                    <input v-model="form.email" type="email" class="form-control" required placeholder="your@email.com" />
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>{{ t('phone') }}</label>
                    <input v-model="form.phone" type="text" class="form-control" placeholder="+1 (555) 123-4567" />
                  </div>
                  <div class="form-group">
                    <label>{{ t('company') }}</label>
                    <input v-model="form.company" type="text" class="form-control" placeholder="Your company name" />
                  </div>
                </div>
                
                <div class="form-group">
                  <label>{{ t('country') }}</label>
                  <input v-model="form.country" type="text" class="form-control" placeholder="Your country" />
                </div>
                
                <div class="form-group">
                  <label>{{ t('message') }}</label>
                  <textarea v-model="form.message" class="form-control" rows="6" :placeholder="pageTexts?.contact_form_desc || 'Tell us about your LED requirements, project details, quantity needed, etc.'"></textarea>
                </div>
                
                <div class="form-actions">
                  <button type="submit" class="btn btn-primary btn-lg" :disabled="loading">
                    <svg v-if="loading" class="btn-icon animate-spin" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
                    </svg>
                    <svg v-else class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                    {{ loading ? 'Sending...' : t('submit') }}
                  </button>
                  <p class="form-note">
                    <svg class="note-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                    </svg>
                    We respect your privacy and will never share your information with third parties.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
        <!-- Spacer -->
      </div>
    </div>

    <!-- Google Maps Embed Section -->
    <div class="map-section">
      <div class="container">
        <div class="map-header">
          <svg viewBox="0 0 24 24" fill="currentColor" class="map-pin-icon">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          <h3>Our Location</h3>
        </div>
        <div class="map-embed-wrap" v-if="company?.map_embed_url">
          <iframe
            :src="company.map_embed_url"
            width="100%"
            height="420"
            style="border:0;"
            allowfullscreen=""
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
        <div class="map-placeholder" v-else>
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:48px;height:48px;color:#cbd5e1;margin-bottom:12px;">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          <p>To show a Google Map here, go to <strong>Admin → Company Info → Google Maps Embed URL</strong> and paste your Google Maps embed link.</p>
        </div>
      </div>
    </div>

    <!-- SEO Sitemap Link (small bar, below map) -->
    <div class="sitemap-bar">
      <div class="container">
        <div class="sitemap-bar-inner">
          <div class="sitemap-bar-text">
            <strong>Google SEO Sitemap</strong>
            <span>Helps Google index all pages, products and news automatically.</span>
          </div>
          <a href="/sitemap.xml" target="_blank" class="sitemap-btn">sitemap.xml</a>
        </div>
      </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useLang } from '../composables/useLang'
import api from '../api'

const { t, localizedValue } = useLang()
const company = ref(null)
const pageTexts = ref(null)
const loading = ref(false)

const form = reactive({
  name: '',
  email: '',
  phone: '',
  company: '',
  country: '',
  message: ''
})

const handleSubmit = async () => {
  loading.value = true
  try {
    await api.submitInquiry(form)
    alert(t('inquirySuccess'))
    Object.keys(form).forEach(key => form[key] = '')
  } catch (e) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    [company.value, pageTexts.value] = await Promise.all([
      api.getCompany(),
      api.getPageTexts()
    ])
  } catch (e) {
    console.error(e)
  }
})
</script>

<style scoped>
.contact-page {
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

.contact-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-2xl);
  align-items: start;
}

.contact-info-section {
  position: sticky;
  top: var(--spacing-xl);
}

.info-card {
  background: var(--white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.info-header {
  background: var(--primary-gradient);
  color: var(--white);
  padding: var(--spacing-xl);
  text-align: center;
}

.info-header h3 {
  font-size: var(--text-2xl);
  font-weight: 800;
  margin-bottom: var(--spacing-sm);
}

.company-tagline {
  font-size: var(--text-sm);
  opacity: 0.9;
  font-weight: 500;
}

.info-content {
  padding: var(--spacing-xl) var(--spacing-md);
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing);
  border-radius: var(--radius);
  transition: var(--transition);
}

.info-item:hover {
  background: var(--gray-50);
}

.info-icon {
  width: 48px;
  height: 48px;
  background: var(--primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.info-icon svg {
  width: 24px;
  height: 24px;
  color: var(--white);
}

.info-details {
  flex: 1;
}

.info-details label {
  display: block;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--spacing-sm);
}

.info-value {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
  text-decoration: none;
  transition: var(--transition);
}

a.info-value:hover {
  color: var(--primary);
}

.business-hours {
  padding: var(--spacing-md);
  background: var(--gray-50);
  border-top: 1px solid var(--border);
}

.business-hours h4 {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--spacing);
  text-align: center;
}

.hours-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.hours-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing);
  background: var(--white);
  border-radius: var(--radius);
  font-size: var(--text-sm);
}

.hours-item span:first-child {
  font-weight: 600;
  color: var(--text-primary);
}

.hours-item span:last-child {
  color: var(--text-secondary);
}

.contact-form-section {
  background: var(--white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.form-header {
  background: var(--gray-50);
  padding: var(--spacing-xl);
  border-bottom: 1px solid var(--border);
  text-align: center;
}

.form-header h3 {
  font-size: var(--text-2xl);
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
}

.form-header p {
  color: var(--text-secondary);
  font-size: var(--text-base);
}

.contact-form {
  padding: var(--spacing-xl);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing);
}

.form-group {
  margin-bottom: var(--spacing);
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-sm);
  font-weight: 600;
  font-size: var(--text-sm);
  color: var(--text-primary);
}

.required {
  color: var(--danger);
}

.form-control {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  color: var(--text-primary);
  background: var(--white);
  transition: var(--transition);
}

.form-control:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-control::placeholder {
  color: var(--text-muted);
}

textarea.form-control {
  min-height: 140px;
  resize: vertical;
}

.form-actions {
  text-align: center;
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border);
}

.submit-btn {
  min-width: 200px;
  margin-bottom: var(--spacing);
}

.btn-icon {
  width: 20px;
  height: 20px;
}

.form-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  color: var(--text-muted);
  font-size: var(--text-sm);
  margin: 0;
}

.note-icon {
  width: 16px;
  height: 16px;
  color: var(--primary);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .contact-layout {
    grid-template-columns: 1fr;
    gap: var(--spacing-xl);
  }
  
  .contact-info-section {
    position: static;
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
  
  .form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }
  
  .info-header {
    padding: var(--spacing-md);
  }
  
  .info-content {
    padding: var(--spacing-md);
  }
  
  .contact-form {
    padding: var(--spacing-md);
  }
  
  .form-header {
    padding: var(--spacing-md);
  }
  
  .breadcrumb {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .info-item {
    flex-direction: column;
    text-align: center;
  }
  
  .hours-item {
    flex-direction: column;
    gap: var(--spacing-sm);
    text-align: center;
  }
  
  .form-actions {
    padding-top: var(--spacing);
  }
  
  .submit-btn {
    width: 100%;
  }
}

/* Compact sitemap info bar */
.sitemap-bar {
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  padding: 14px 0;
}

.sitemap-bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.sitemap-bar-text {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #64748b;
}

.sitemap-bar-text strong {
  color: #334155;
  font-weight: 700;
  white-space: nowrap;
}

.sitemap-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  background: #1e293b;
  color: white;
  font-size: 13px;
  font-weight: 600;
  border-radius: 6px;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.2s;
}

.sitemap-btn:hover { background: #0f172a; }

/* Google Maps embed section */
.map-section {
  padding: 50px 0 0;
  background: #f8fafc;
}

.map-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.map-pin-icon {
  width: 28px;
  height: 28px;
  color: #ef4444;
  flex-shrink: 0;
}

.map-header h3 {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.map-embed-wrap {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  line-height: 0;
}

.map-embed-wrap iframe {
  display: block;
  width: 100%;
  height: 420px;
}

/* Placeholder shown when Google Maps URL is not configured */
.map-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: #f8fafc;
  border: 2px dashed #e2e8f0;
  border-radius: 12px;
  text-align: center;
  color: #94a3b8;
  min-height: 200px;
}
.map-placeholder p { font-size: 15px; line-height: 1.7; max-width: 480px; }
.map-placeholder strong { color: #475569; }

/* Compact SEO sitemap link bar */
.sitemap-bar { background: #f1f5f9; border-top: 1px solid #e2e8f0; padding: 12px 0; }
.sitemap-bar-inner { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.sitemap-bar-text { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #64748b; }
.sitemap-bar-text strong { color: #334155; font-weight: 700; white-space: nowrap; }
.sitemap-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; background: #1e293b; color: white;
  font-size: 12px; font-weight: 600; border-radius: 6px;
  text-decoration: none; white-space: nowrap; transition: background 0.2s;
}
.sitemap-btn:hover { background: #0f172a; }

/* Social links section */
.social-links { margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
.social-links h4 { font-size: 15px; font-weight: 600; color: #1e293b; margin: 0 0 12px; }
.social-icons { display: flex; gap: 10px; flex-wrap: wrap; }
.social-icon {
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border-radius: 8px;
  background: #f1f5f9; color: #475569;
  transition: all 0.2s ease;
}
.social-icon:hover { background: #1e40af; color: #fff; transform: translateY(-2px); }
.social-icon svg { width: 20px; height: 20px; }
</style>
