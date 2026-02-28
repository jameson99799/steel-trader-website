<template>
  <footer class="site-footer">
    <div class="footer-main">
      <div class="container">
        <div class="footer-content">
          <div class="footer-brand">
            <div class="brand-logo">
              <div class="logo-image-wrap" v-if="company?.logo">
                <img :src="company.logo" :alt="localizedValue(company, 'name')" />
              </div>
              <div class="brand-text">
                <h3 class="brand-name">{{ localizedValue(company, 'name') || 'LED Trade' }}</h3>
                <p class="brand-tagline">{{ pageTexts?.logo_subtitle || 'Professional LED Solutions' }}</p>
              </div>
            </div>
            <p class="brand-desc">
              {{ localizedValue(company, 'description')?.substring(0, 120) }}...
            </p>
            <div class="social-links">
              <!-- WhatsApp -->
              <a v-if="company?.whatsapp" :href="`https://wa.me/${company.whatsapp.replace(/[^0-9]/g, '')}`" class="social-link social-whatsapp" target="_blank" rel="noopener" title="WhatsApp">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                </svg>
              </a>
              <!-- Facebook -->
              <a v-if="company?.facebook" :href="company.facebook" class="social-link social-facebook" target="_blank" rel="noopener" title="Facebook">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <!-- LinkedIn -->
              <a v-if="company?.linkedin" :href="company.linkedin" class="social-link social-linkedin" target="_blank" rel="noopener" title="LinkedIn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <!-- Instagram -->
              <a v-if="company?.instagram" :href="company.instagram" class="social-link social-instagram" target="_blank" rel="noopener" title="Instagram">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </a>
              <!-- TikTok -->
              <a v-if="company?.tiktok" :href="company.tiktok" class="social-link social-tiktok" target="_blank" rel="noopener" title="TikTok">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                </svg>
              </a>
              <!-- X / Twitter -->
              <a v-if="company?.twitter" :href="company.twitter" class="social-link social-x" target="_blank" rel="noopener" title="X (Twitter)">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>
          
          <div class="footer-links">
            <div class="link-group">
              <h4 class="link-title">{{ t('products') }}</h4>
              <ul class="link-list">
                <li v-for="cat in categories" :key="cat.id">
                  <router-link :to="`/products?category=${cat.id}`" class="footer-link">
                    {{ localizedValue(cat, 'name') }}
                  </router-link>
                </li>
              </ul>
            </div>
            
            <div class="link-group">
              <h4 class="link-title">Company</h4>
              <ul class="link-list">
                <li><router-link to="/about" class="footer-link">{{ t('about') }}</router-link></li>
                <li><router-link to="/products" class="footer-link">{{ t('products') }}</router-link></li>
                <li><router-link to="/contact" class="footer-link">{{ t('contact') }}</router-link></li>
              </ul>
            </div>
            
            <div class="link-group">
              <h4 class="link-title">{{ t('contactUs') }}</h4>
              <ul class="contact-list">
                <li v-if="company?.email" class="contact-item">
                  <svg class="contact-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <a :href="`mailto:${company.email}`" class="contact-link">{{ company.email }}</a>
                </li>
                <li v-if="company?.phone" class="contact-item">
                  <svg class="contact-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  <a :href="`tel:${company.phone}`" class="contact-link">{{ company.phone }}</a>
                </li>
                <li v-if="company?.whatsapp" class="contact-item">
                  <svg class="contact-icon whatsapp-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                  </svg>
                  <a :href="`https://wa.me/${company.whatsapp.replace(/[^0-9]/g, '')}`" class="contact-link whatsapp-link" target="_blank" rel="noopener">{{ company.whatsapp }}</a>
                </li>
                <li v-if="localizedValue(company, 'address')" class="contact-item">
                  <svg class="contact-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                  </svg>
                  <span class="contact-text">{{ localizedValue(company, 'address') }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="footer-bottom">
      <div class="container">
        <div class="footer-bottom-content">
          <p class="copyright">
            &copy; {{ new Date().getFullYear() }} {{ localizedValue(company, 'name') || 'LED Trade' }}. All rights reserved.
          </p>
          <div class="footer-nav">
            <a href="#" class="footer-nav-link">Privacy Policy</a>
            <a href="#" class="footer-nav-link">Terms of Service</a>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useLang } from '../composables/useLang'
import api from '../api'

const { t, localizedValue } = useLang()
const company = ref(null)
const categories = ref([])
const pageTexts = ref(null)

onMounted(async () => {
  try {
    company.value = await api.getCompany()
    const tree = await api.getCategoryTree()
    categories.value = tree.slice(0, 5)
    pageTexts.value = await api.getPageTexts()
  } catch (e) {}
})
</script>

<style scoped>
.site-footer {
  background: var(--gray-900);
  color: var(--white);
  margin-top: var(--spacing-2xl);
}

.footer-main {
  padding: var(--spacing-2xl) 0;
}

.footer-content {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: var(--spacing-2xl);
}

.footer-brand {
  max-width: 400px;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: var(--spacing);
  margin-bottom: var(--spacing-md);
}

.logo-image-wrap {
  width: 56px;
  height: 56px;
  border-radius: var(--radius);
  overflow: hidden;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  flex-shrink: 0;
}

.logo-image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.brand-name {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--white);
  margin: 0 0 4px 0;
}

.brand-tagline {
  font-size: var(--text-sm);
  color: var(--gray-400);
  margin: 0;
  font-weight: 500;
}

.brand-desc {
  color: var(--gray-300);
  line-height: var(--leading-relaxed);
  margin-bottom: var(--spacing-md);
}

.social-links {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.social-link {
  width: 40px;
  height: 40px;
  background: var(--gray-800);
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gray-400);
  transition: var(--transition);
  text-decoration: none;
}

.social-link:hover {
  transform: translateY(-2px);
  color: var(--white);
}

.social-link svg {
  width: 20px;
  height: 20px;
}

.social-whatsapp:hover { background: #25D366; }
.social-facebook:hover { background: #1877F2; }
.social-linkedin:hover { background: #0A66C2; }
.social-instagram:hover { background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); }
.social-tiktok:hover { background: #000000; }
.social-x:hover { background: #000000; }

.footer-links {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-xl);
}

.link-group {
  min-width: 0;
}

.link-title {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--white);
  margin-bottom: var(--spacing);
}

.link-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.link-list li {
  margin-bottom: var(--spacing-sm);
}

.footer-link {
  color: var(--gray-300);
  font-size: var(--text-sm);
  transition: var(--transition);
  display: block;
  padding: 4px 0;
}

.footer-link:hover {
  color: var(--primary-light);
  padding-left: 8px;
}

.contact-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.contact-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing);
  color: var(--gray-300);
  font-size: var(--text-sm);
}

.contact-icon {
  width: 16px;
  height: 16px;
  color: var(--primary-light);
  flex-shrink: 0;
  margin-top: 2px;
}

.whatsapp-icon {
  color: #25D366;
}

.contact-link {
  color: var(--gray-300);
  transition: var(--transition);
  text-decoration: none;
}

.contact-link:hover {
  color: var(--primary-light);
}

.whatsapp-link:hover {
  color: #4ade80;
}

.contact-text {
  line-height: var(--leading-relaxed);
}

.footer-bottom {
  background: var(--gray-800);
  padding: var(--spacing-md) 0;
  border-top: 1px solid var(--gray-700);
}

.footer-bottom-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing);
}

.copyright {
  color: var(--gray-400);
  font-size: var(--text-sm);
  margin: 0;
}

.footer-nav {
  display: flex;
  gap: var(--spacing-md);
}

.footer-nav-link {
  color: var(--gray-400);
  font-size: var(--text-sm);
  transition: var(--transition);
}

.footer-nav-link:hover {
  color: var(--gray-200);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .footer-content {
    grid-template-columns: 1fr;
    gap: var(--spacing-xl);
  }
  
  .footer-links {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .footer-main {
    padding: var(--spacing-xl) 0;
  }
  
  .footer-links {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }
  
  .footer-bottom-content {
    flex-direction: column;
    text-align: center;
    gap: var(--spacing-sm);
  }
  
  .footer-nav {
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .brand-logo {
    flex-direction: column;
    text-align: center;
    gap: var(--spacing-sm);
  }
  
  .social-links {
    justify-content: center;
  }
}
</style>
