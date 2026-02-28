<template>
  <div class="product-detail" v-if="product">
    <!-- Breadcrumb -->
    <div class="breadcrumb-section">
      <div class="container">
        <nav class="breadcrumb">
          <router-link to="/" class="breadcrumb-link">{{ t('home') }}</router-link>
          <svg class="breadcrumb-separator" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
          <router-link to="/products" class="breadcrumb-link">{{ t('products') }}</router-link>
          <svg class="breadcrumb-separator" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
          <span class="breadcrumb-current">{{ localizedValue(product, 'name') }}</span>
        </nav>
      </div>
    </div>

    <!-- Product Content -->
    <div class="product-content">
      <div class="container">
        <div class="product-layout">
          <!-- Images -->
          <div class="product-images">
            <div class="main-image-container">
              <div class="main-image">
                <img :src="currentImage" :alt="localizedValue(product, 'name')" />
                <div class="image-zoom-hint">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 9a2 2 0 114 0 2 2 0 01-4 0z" />
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a4 4 0 00-3.446 6.032l-2.261 2.26a1 1 0 101.414 1.415l2.261-2.261A4 4 0 1011 5z" clip-rule="evenodd" />
                  </svg>
                  <span>Click to zoom</span>
                </div>
                <!-- Image nav arrows -->
                <button v-if="images.length > 1" class="img-nav img-nav-prev" @click.stop="prevImage" aria-label="Previous image">
                  <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                </button>
                <button v-if="images.length > 1" class="img-nav img-nav-next" @click.stop="nextImage" aria-label="Next image">
                  <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
                </button>
              </div>
              <div class="product-badges">
                <span v-if="product.is_featured" class="badge badge-featured">Featured</span>
                <span class="badge badge-category">{{ localizedValue(product, 'category_name') }}</span>
              </div>
            </div>
            <div class="thumbnails" v-if="images.length > 1">
              <button 
                v-for="(img, index) in images" 
                :key="index"
                :class="['thumbnail-btn', { active: currentImage === img }]"
                @click="currentImage = img"
              >
                <img :src="img" :alt="`Product image ${index + 1}`" />
              </button>
            </div>
          </div>

          <!-- Info -->
          <div class="product-info">
            <div class="product-header">
              <h1 class="product-title">{{ localizedValue(product, 'name') }}</h1>
              <div class="product-meta">
                <span class="product-id">ID: {{ product.id }}</span>
              </div>
            </div>
            
            <div class="product-sections">
              <div class="section description-section" v-if="localizedValue(product, 'description')">
                <div class="section-header">
                  <svg class="section-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                  </svg>
                  <h3>{{ t('description') }}</h3>
                </div>
                <div class="section-content">
                  <p class="description-text">{{ localizedValue(product, 'description') }}</p>
                </div>
              </div>

              <div class="section specs-section" v-if="specs.length">
                <div class="section-header">
                  <svg class="section-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
                  </svg>
                  <h3>{{ t('specifications') }}</h3>
                </div>
                <div class="section-content">
                  <div class="specs-table">
                    <div v-for="(spec, index) in specs" :key="index" class="spec-row">
                      <div class="spec-label">{{ spec.name }}</div>
                      <div class="spec-value">{{ spec.value }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="section action-section">
                <div class="action-buttons">
                  <button class="btn btn-primary btn-lg inquiry-btn" @click="showInquiry = true">
                    <svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor" style="width:18px;height:18px;">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    {{ t('sendInquiry') }}
                  </button>
                  <button class="btn btn-outline email-btn" @click="sendEmail">
                    <svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor" style="width:18px;height:18px;">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    Send Email
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Sticky Contact Panel (right column) -->
          <div class="contact-panel">
            <div class="contact-panel-inner">
              <h3 class="panel-title">{{ pageTexts?.inquiry_panel_title || 'Contact Our Team' }}</h3>
              <p class="panel-subtitle">Need more information? Scan to contact us directly.</p>

              <!-- WhatsApp QR -->
              <div class="qr-block" v-if="company?.whatsapp_qr || company?.whatsapp">
                <div class="qr-header">
                  <svg class="qr-icon wa-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                  </svg>
                  <span>WhatsApp</span>
                </div>
                <div class="qr-image-wrap" v-if="company?.whatsapp_qr" @click="openLightbox(company.whatsapp_qr)">
                  <img :src="company.whatsapp_qr" alt="WhatsApp QR Code" class="qr-img" />
                  <div class="qr-hint">Click to enlarge</div>
                </div>
                <a v-if="company?.whatsapp" :href="`https://wa.me/${company.whatsapp.replace(/[^0-9]/g, '')}`" class="qr-link wa-link" target="_blank" rel="noopener">
                  WhatsApp: {{ company.whatsapp }}
                </a>
              </div>

              <!-- Divider -->
              <div class="qr-divider" v-if="(company?.whatsapp_qr || company?.whatsapp) && (company?.wechat_qr || company?.wechat)"></div>

              <!-- WeChat QR -->
              <div class="qr-block" v-if="company?.wechat_qr || company?.wechat">
                <div class="qr-header">
                  <svg class="qr-icon wc-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.295.295a.328.328 0 00.168-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.603-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.83 6.22.836 2.498 3.499 4.148 6.386 4.148.801 0 1.536-.107 2.24-.313a.647.647 0 01.527.082l1.396.82a.25.25 0 00.377-.296l-.286-1.094a.44.44 0 01.16-.497c1.348-1.194 2.203-2.976 2.203-4.876-.001-3.543-2.718-5.98-5.893-5.98zm-2.904 3.137c.472 0 .857.385.857.857s-.385.857-.857.857a.857.857 0 010-1.714zm5.654 0c.472 0 .857.385.857.857s-.385.857-.857.857a.857.857 0 010-1.714z"/>
                  </svg>
                  <span>WeChat</span>
                </div>
                <div class="qr-image-wrap" v-if="company?.wechat_qr" @click="openLightbox(company.wechat_qr)">
                  <img :src="company.wechat_qr" alt="WeChat QR Code" class="qr-img" />
                  <div class="qr-hint">Click to enlarge</div>
                </div>
                <div class="qr-num-box" v-if="company?.wechat || company?.wechat_qr">
                  <span v-if="company?.wechat" class="qr-link wc-link" @click="copyToClipboard(company.wechat)" style="cursor:pointer;" title="Click to copy">
                    WeChat: {{ company.wechat }}
                  </span>
                  <span v-else class="qr-scan-hint">Scan QR to add on WeChat</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Full-width Rich Text Details Section -->
        <div class="detail-content-section" v-if="product.detail_content">
          <div class="detail-header">
            <svg class="detail-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
            </svg>
            <h2>Product Details</h2>
          </div>
          <div class="detail-content ql-snow">
            <div class="ql-editor" v-html="product.detail_content"></div>
          </div>
        </div>

        <!-- Product Categories Section -->
        <div class="categories-section" v-if="allCategories.length">
          <div class="section-hdr">
            <h2>Product Categories</h2>
            <p>{{ pageTexts?.categories_subtitle || 'Explore our comprehensive range of LED products' }}</p>
          </div>
          <div class="categories-grid">
            <router-link
              v-for="cat in allCategories"
              :key="cat.id"
              :to="`/products?category_id=${cat.id}`"
              class="cat-card"
            >
              <div class="cat-image" v-if="cat.image">
                <img :src="cat.image" :alt="localizedValue(cat, 'name')" />
              </div>
              <div class="cat-image cat-image-placeholder" v-else>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>
              </div>
              <div class="cat-info">
                <h3>{{ localizedValue(cat, 'name') }}</h3>
                <span v-if="cat.product_count" class="cat-count">{{ cat.product_count }} products</span>
              </div>
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- Fixed Right Contact Panel -->
    <div class="fixed-contact-panel" v-if="company && (company.whatsapp || company.wechat)">
      <div class="fcp-inner">
        <div class="fcp-title">{{ pageTexts?.inquiry_panel_title || 'Contact Us' }}</div>

        <!-- WhatsApp -->
        <div class="fcp-block" v-if="company.whatsapp">
          <div class="fcp-qr-pop" v-if="company.whatsapp_qr">
            <img :src="company.whatsapp_qr" alt="WhatsApp QR" @click="openLightbox(company.whatsapp_qr)" />
          </div>
          <a :href="`https://wa.me/${company.whatsapp.replace(/[^0-9]/g, '')}`" target="_blank" class="fcp-link fcp-wa">
            <svg class="fcp-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
            </svg>
            <div class="fcp-num">
              <span>WhatsApp</span>
              <strong>{{ company.whatsapp }}</strong>
            </div>
          </a>
        </div>

        <!-- WeChat -->
        <div class="fcp-block" v-if="company.wechat">
          <div class="fcp-qr-pop" v-if="company.wechat_qr">
            <img :src="company.wechat_qr" alt="WeChat QR" @click="openLightbox(company.wechat_qr)" />
          </div>
          <div class="fcp-link fcp-wc">
            <svg class="fcp-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.295.295a.328.328 0 00.168-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.603-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.83 6.22.836 2.498 3.499 4.148 6.386 4.148.801 0 1.536-.107 2.24-.313a.647.647 0 01.527.082l1.396.82a.25.25 0 00.377-.296l-.286-1.094a.44.44 0 01.16-.497c1.348-1.194 2.203-2.976 2.203-4.876-.001-3.543-2.718-5.98-5.893-5.98zm-2.904 3.137c.472 0 .857.385.857.857s-.385.857-.857.857a.857.857 0 010-1.714zm5.654 0c.472 0 .857.385.857.857s-.385.857-.857.857a.857.857 0 010-1.714z"/>
            </svg>
            <div class="fcp-num">
              <span>WeChat</span>
              <strong>{{ company.wechat }}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>

    <InquiryModal 
      v-if="showInquiry" 
      :product-id="product.id"
      @close="showInquiry = false"
    />

    <!-- QR Lightbox -->
    <div class="lightbox" v-if="lightboxImg" @click="lightboxImg = null">
      <div class="lightbox-inner" @click.stop>
        <img :src="lightboxImg" alt="QR Code" />
        <button class="lightbox-close" @click="lightboxImg = null">&times;</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useLang } from '../composables/useLang'
import api from '../api'
import InquiryModal from '../components/InquiryModal.vue'

const route = useRoute()
const { t, localizedValue } = useLang()

const product = ref(null)
const currentImage = ref('')
const showInquiry = ref(false)
const company = ref(null)
const pageTexts = ref(null)
const lightboxImg = ref(null)
const allCategories = ref([])

const images = computed(() => {
  if (!product.value?.images) return []
  return product.value.images.split(',').filter(Boolean)
})

const specs = computed(() => {
  if (!product.value?.specs) return []
  try {
    return JSON.parse(product.value.specs)
  } catch {
    return []
  }
})

const currentImageIndex = computed(() => {
  return images.value.indexOf(currentImage.value)
})

const prevImage = () => {
  const idx = currentImageIndex.value
  currentImage.value = images.value[(idx - 1 + images.value.length) % images.value.length]
}

const nextImage = () => {
  const idx = currentImageIndex.value
  currentImage.value = images.value[(idx + 1) % images.value.length]
}

const openLightbox = (src) => {
  lightboxImg.value = src
}

const sendEmail = () => {
  const email = company.value?.email || ''
  const productName = localizedValue(product.value, 'name') || ''
  window.open(`mailto:${email}?subject=Product Inquiry: ${productName}&body=Hi, I am interested in your product: ${productName}%0A%0APlease provide more information.`)
}

const copyToClipboard = (text) => {
  if (!text) return
  const done = () => alert('Number copied to clipboard: ' + text)
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(done).catch(() => {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      done()
    })
  } else {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    done()
  }
}

onMounted(async () => {
  try {
    product.value = await api.getProduct(route.params.id)
    if (images.value.length) {
      currentImage.value = images.value[0]
    }
    const [comp, texts, cats] = await Promise.all([
      api.getCompany(),
      api.getPageTexts(),
      api.getCategories()
    ])
    company.value = comp
    pageTexts.value = texts
    allCategories.value = cats || []
  } catch (e) {
    console.error(e)
  }
})
</script>

<style scoped>
/* Import Quill snow theme for detail content rendering */
@import 'quill/dist/quill.snow.css';

.product-detail {
  min-height: 100vh;
  background: var(--gray-50);
}

.breadcrumb-section {
  background: var(--white);
  border-bottom: 1px solid var(--border);
  padding: var(--spacing) 0;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
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
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-content {
  padding: var(--spacing-xl) 0;
}

.product-layout {
  display: grid;
  grid-template-columns: 1fr 1fr 280px;
  gap: var(--spacing-xl);
  align-items: start;
}

/* ======= IMAGES COLUMN ======= */
.product-images {
  position: sticky;
  top: calc(var(--spacing-xl) + 80px);
}

.main-image-container {
  position: relative;
  margin-bottom: var(--spacing-md);
}

.main-image {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--white);
  box-shadow: var(--shadow-lg);
  cursor: zoom-in;
  transition: var(--transition);
}

.main-image:hover {
  box-shadow: var(--shadow-xl);
}

.main-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: var(--transition-slow);
}

.main-image:hover img {
  transform: scale(1.05);
}

.image-zoom-hint {
  position: absolute;
  bottom: var(--spacing);
  right: var(--spacing);
  background: rgba(0, 0, 0, 0.7);
  color: var(--white);
  padding: var(--spacing-sm) var(--spacing);
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--text-xs);
  opacity: 0;
  transition: var(--transition);
  pointer-events: none;
}

.main-image:hover .image-zoom-hint {
  opacity: 1;
}

.image-zoom-hint svg {
  width: 16px;
  height: 16px;
}

/* Image Nav Arrows */
.img-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.75);
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 5;
  transition: background 0.2s, opacity 0.2s;
  opacity: 0;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.main-image:hover .img-nav {
  opacity: 1;
}

.img-nav:hover {
  background: rgba(255,255,255,0.95);
}

.img-nav svg {
  width: 22px;
  height: 22px;
  color: var(--gray-800);
}

.img-nav-prev { left: 10px; }
.img-nav-next { right: 10px; }

.product-badges {
  position: absolute;
  top: var(--spacing);
  left: var(--spacing);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.badge-featured {
  background: var(--accent);
  color: var(--white);
}

.badge-category {
  background: var(--primary);
  color: var(--white);
}

.thumbnails {
  display: flex;
  gap: var(--spacing);
  overflow-x: auto;
  padding: var(--spacing-sm) 0;
}

.thumbnail-btn {
  flex-shrink: 0;
  width: 80px;
  height: 80px;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--white);
  cursor: pointer;
  transition: var(--transition);
  padding: 0;
}

.thumbnail-btn:hover {
  border-color: var(--primary-light);
  box-shadow: var(--shadow);
}

.thumbnail-btn.active {
  border-color: var(--primary);
  box-shadow: var(--shadow-md);
}

.thumbnail-btn img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ======= INFO COLUMN ======= */
.product-info {
  background: var(--white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.product-header {
  padding: var(--spacing-xl) var(--spacing-xl) var(--spacing-md);
  border-bottom: 1px solid var(--border);
}

.product-title {
  font-size: var(--text-4xl);
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
  line-height: var(--leading-tight);
}

.product-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing);
}

.product-id {
  color: var(--text-muted);
  font-size: var(--text-sm);
  font-weight: 600;
  background: var(--gray-100);
  padding: 4px 12px;
  border-radius: var(--radius);
}

.product-sections {
  padding: var(--spacing-md);
}

.section {
  margin-bottom: var(--spacing-xl);
}

.section:last-child {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--spacing);
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing);
  border-bottom: 1px solid var(--border);
}

.section-icon {
  width: 24px;
  height: 24px;
  color: var(--primary);
}

.section-header h3 {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.section-content {
  padding-left: 40px;
}

.description-text {
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
  font-size: var(--text-lg);
}

.specs-table {
  background: var(--gray-50);
  border-radius: var(--radius);
  overflow: hidden;
}

.spec-row {
  display: grid;
  grid-template-columns: 1fr 2fr;
  border-bottom: 1px solid var(--border);
}

.spec-row:last-child {
  border-bottom: none;
}

.spec-label {
  padding: var(--spacing) var(--spacing-md);
  background: var(--white);
  font-weight: 600;
  color: var(--text-primary);
  border-right: 1px solid var(--border);
}

.spec-value {
  padding: var(--spacing) var(--spacing-md);
  color: var(--text-secondary);
}

.action-section .section-content {
  padding-left: 0;
}

.action-buttons {
  display: flex;
  gap: var(--spacing);
  flex-wrap: wrap;
}

.inquiry-btn {
  flex: 1;
  min-width: 140px;
}

.email-btn {
  flex-shrink: 0;
}

.btn-icon {
  width: 20px;
  height: 20px;
}

/* ======= CONTACT PANEL (RIGHT STICKY COLUMN) ======= */
.contact-panel {
  position: sticky;
  top: calc(var(--spacing-xl) + 80px);
  align-self: start;
}

.contact-panel-inner {
  background: var(--white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-lg);
  border: 1px solid var(--border);
}

.panel-title {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--spacing-sm) 0;
  text-align: center;
}

.panel-subtitle {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  text-align: center;
  margin: 0 0 var(--spacing-md) 0;
  line-height: 1.5;
}

.qr-block {
  margin-bottom: var(--spacing-md);
}

.qr-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: var(--text-base);
  margin-bottom: var(--spacing-sm);
}

.qr-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.wa-icon { color: #25D366; }
.wc-icon { color: #07C160; }

.qr-image-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius);
  overflow: hidden;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--gray-50);
  margin-bottom: 8px;
}

.qr-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.2s;
}

.qr-image-wrap:hover .qr-img {
  transform: scale(1.03);
}

.qr-hint {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0,0,0,0.6);
  color: #fff;
  text-align: center;
  font-size: 12px;
  padding: 5px;
  opacity: 0;
  transition: opacity 0.2s;
}

.qr-image-wrap:hover .qr-hint {
  opacity: 1;
}

.qr-link {
  display: block;
  text-align: center;
  font-weight: 600;
  font-size: var(--text-sm);
  text-decoration: none;
  padding: 6px;
  border-radius: var(--radius);
}

.wa-link {
  color: #25D366;
  background: rgba(37, 211, 102, 0.08);
}

.wa-link:hover { background: rgba(37, 211, 102, 0.16); }

.wc-link {
  color: #07C160;
  background: rgba(7, 193, 96, 0.08);
}

.qr-divider {
  height: 1px;
  background: var(--border);
  margin: var(--spacing-md) 0;
}

/* ======= FULL-WIDTH DETAIL CONTENT ======= */
.detail-content-section {
  margin-top: var(--spacing-2xl);
  background: var(--white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: var(--spacing);
  padding: var(--spacing-lg) var(--spacing-xl);
  border-bottom: 1px solid var(--border);
}

.detail-icon {
  width: 28px;
  height: 28px;
  color: var(--primary);
}

.detail-header h2 {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.detail-content {
  padding: var(--spacing-xl);
}

/* Override Quill editor styles for display-only mode */
.detail-content.ql-snow .ql-editor {
  padding: 0;
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--text-secondary);
}

/* ======= LIGHTBOX ======= */
.lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(4px);
}

.lightbox-inner {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  cursor: default;
}

.lightbox-inner img {
  max-width: 80vw;
  max-height: 80vh;
  border-radius: var(--radius-lg);
  object-fit: contain;
  box-shadow: 0 0 60px rgba(0,0,0,0.5);
}

.lightbox-close {
  position: absolute;
  top: -16px;
  right: -16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--white);
  border: none;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-md);
  color: var(--text-primary);
  transition: var(--transition);
}

.lightbox-close:hover {
  background: var(--gray-100);
  transform: scale(1.1);
}

/* ======= RESPONSIVE ======= */
@media (max-width: 1200px) {
  .product-layout {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
  }
  
  .contact-panel {
    grid-column: 1 / -1;
    position: static;
  }
  
  .contact-panel-inner {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-xl);
  }
  
  .panel-title, .panel-subtitle {
    grid-column: 1 / -1;
  }
}

@media (max-width: 1024px) {
  .product-layout {
    grid-template-columns: 1fr;
    gap: var(--spacing-xl);
  }
  
  .product-images {
    position: static;
  }
  
  .main-image-container {
    max-width: 600px;
    margin: 0 auto var(--spacing-md);
  }

  .contact-panel {
    position: static;
    grid-column: auto;
  }

  .contact-panel-inner {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-xl);
    align-items: start;
  }

  .panel-title, .panel-subtitle {
    grid-column: 1 / -1;
  }
}

@media (max-width: 768px) {
  .product-content {
    padding: var(--spacing-md) 0;
  }
  
  .product-title {
    font-size: var(--text-3xl);
  }
  
  .product-header {
    padding: var(--spacing-md);
  }
  
  .section-content {
    padding-left: 0;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .contact-methods {
    flex-direction: column;
    gap: var(--spacing);
  }
  
  .spec-row {
    grid-template-columns: 1fr;
  }
  
  .spec-label {
    border-right: none;
    border-bottom: 1px solid var(--border);
  }

  .contact-panel-inner {
    grid-template-columns: 1fr;
  }

  .img-nav {
    opacity: 1;
  }
}

@media (max-width: 640px) {
  .breadcrumb-current {
    max-width: 150px;
  }
  
  .thumbnails {
    justify-content: center;
  }
  
  .thumbnail-btn {
    width: 60px;
    height: 60px;
  }
}
/* ===========================
   Fixed Contact Panel (Product Detail)
=========================== */
.fixed-contact-panel {
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1000;
}

.fcp-inner {
  background: white;
  border-radius: 12px 0 0 12px;
  box-shadow: -4px 0 24px rgba(0,0,0,0.14);
  padding: 16px 14px;
  min-width: 190px;
  max-width: 210px;
}

.fcp-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin-bottom: 12px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 8px;
}

.fcp-block {
  position: relative;
  margin-bottom: 10px;
}

.fcp-block:last-child { margin-bottom: 0; }

.fcp-qr-pop {
  position: absolute;
  right: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
  background: white;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.18);
  padding: 10px;
  opacity: 0;
  pointer-events: none;
  transition: all 0.25s;
  white-space: nowrap;
}

.fcp-block:hover .fcp-qr-pop {
  opacity: 1;
  pointer-events: all;
}

.fcp-qr-pop img {
  width: 130px;
  height: 130px;
  object-fit: contain;
  display: block;
  cursor: zoom-in;
  border-radius: 6px;
}

.fcp-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  text-decoration: none;
  background: var(--gray-50);
  transition: background 0.2s;
  cursor: pointer;
}

.fcp-link:hover { background: var(--gray-100); }
.fcp-wa { background: #f0fdf4; }
.fcp-wa:hover { background: #dcfce7; }
.fcp-wc { background: #f0fdf4; }
.fcp-wc:hover { background: #dcfce7; }

.fcp-icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  color: #25D366;
}

.fcp-num {
  display: flex;
  flex-direction: column;
}

.fcp-num span {
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1;
}

.fcp-num strong {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 700;
  line-height: 1.4;
}

/* ===========================
   Categories Section (Product Detail Bottom)
=========================== */
.categories-section {
  margin-top: var(--spacing-2xl);
  padding-top: var(--spacing-2xl);
  border-top: 2px solid var(--border);
}

.section-hdr {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.section-hdr h2 {
  font-size: var(--text-4xl);
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
}

.section-hdr p {
  color: var(--text-secondary);
  font-size: var(--text-lg);
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-xl);
}

.cat-card {
  background: var(--white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
  text-decoration: none;
  transition: var(--transition);
  display: flex;
  flex-direction: column;
}

.cat-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-xl);
}

.cat-image {
  height: 140px;
  overflow: hidden;
}

.cat-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s;
}

.cat-card:hover .cat-image img { transform: scale(1.08); }

.cat-image-placeholder {
  background: var(--gray-100);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cat-image-placeholder svg {
  width: 36px;
  height: 36px;
  color: var(--text-muted);
}

.cat-info {
  padding: var(--spacing) var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.cat-info h3 {
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

.cat-count {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

@media (max-width: 1024px) {
  .categories-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 768px) {
  .fixed-contact-panel { display: none; }
  .categories-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 480px) {
  .categories-grid { grid-template-columns: 1fr; }
}
</style>
