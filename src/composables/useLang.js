import { ref, watch } from 'vue'
import api from '../api'

// Default language is English — highest priority
// localStorage overrides if user has explicitly picked something else
const lang = ref(localStorage.getItem('lang') || 'en')

// Global translations cache — loaded from backend translations table
const translationsMap = ref({})
let loadingPromise = null

const translations = {
  zh: {
    home: '首页',
    products: '产品中心',
    about: '关于我们',
    contact: '联系我们',
    inquiry: '询盘',
    sendInquiry: '发送询盘',
    name: '姓名',
    email: '邮箱',
    phone: '电话',
    company: '公司',
    country: '国家',
    message: '留言',
    submit: '提交',
    cancel: '取消',
    viewMore: '查看更多',
    allProducts: '全部产品',
    featuredProducts: '推荐产品',
    productCategories: '产品分类',
    ourAdvantages: '我们的优势',
    factoryDirect: '工厂直供',
    qualityAssurance: '品质保证',
    fastDelivery: '快速交货',
    customService: '定制服务',
    contactUs: '联系我们',
    getInTouch: '与我们取得联系',
    address: '地址',
    specifications: '规格参数',
    description: '产品描述',
    relatedProducts: '相关产品',
    inquirySuccess: '询盘提交成功，我们会尽快与您联系！',
    required: '必填',
    yearsExperience: '年行业经验',
    productModels: '产品型号',
    exportCountries: '出口国家',
    globalClients: '全球客户'
  },
  en: {
    home: 'Home',
    products: 'Products',
    about: 'About Us',
    contact: 'Contact',
    inquiry: 'Inquiry',
    sendInquiry: 'Send Inquiry',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    company: 'Company',
    country: 'Country',
    message: 'Message',
    submit: 'Submit',
    cancel: 'Cancel',
    viewMore: 'View More',
    allProducts: 'All Products',
    featuredProducts: 'Featured Products',
    productCategories: 'Product Categories',
    ourAdvantages: 'Our Advantages',
    factoryDirect: 'Factory Direct',
    qualityAssurance: 'Quality Assurance',
    fastDelivery: 'Fast Delivery',
    customService: 'Custom Service',
    contactUs: 'Contact Us',
    getInTouch: 'Get In Touch',
    address: 'Address',
    specifications: 'Specifications',
    description: 'Description',
    relatedProducts: 'Related Products',
    inquirySuccess: 'Inquiry submitted successfully! We will contact you soon.',
    required: 'Required',
    yearsExperience: 'Years Experience',
    productModels: 'Product Models',
    exportCountries: 'Export Countries',
    globalClients: 'Global Clients'
  }
}

// Load translations from backend when language changes
async function loadTranslations(langCode) {
  if (langCode === 'en') {
    translationsMap.value = {}
    return
  }
  // Use cache from sessionStorage for performance
  const cacheKey = `_trans_${langCode}`
  try {
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      const { data, ts } = JSON.parse(cached)
      if (Date.now() - ts < 5 * 60 * 1000) {
        translationsMap.value = data
        // Refresh in background
        api.getTranslationContent(langCode).then(fresh => {
          translationsMap.value = fresh
          sessionStorage.setItem(cacheKey, JSON.stringify({ data: fresh, ts: Date.now() }))
        }).catch(() => { })
        return
      }
    }
  } catch { }
  try {
    const data = await api.getTranslationContent(langCode)
    translationsMap.value = data
    try { sessionStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() })) } catch { }
  } catch (e) {
    console.warn('Failed to load translations:', e)
    translationsMap.value = {}
  }
}

// Watch language changes and load translations
watch(lang, (newLang) => {
  loadTranslations(newLang)
})

// Initial load
if (lang.value !== 'en') {
  loadTranslations(lang.value)
}

export function useLang() {
  const setLang = (newLang) => {
    lang.value = newLang
    localStorage.setItem('lang', newLang)
  }

  const toggleLang = () => {
    setLang(lang.value === 'zh' ? 'en' : 'zh')
  }

  const t = (key) => {
    // Always fall back to English if current lang key is missing
    return translations[lang.value]?.[key] || translations['en']?.[key] || key
  }

  /**
   * Get localized value for a data object field.
   * When lang is 'en', returns _en field.
   * When lang is other (e.g. 'es', 'ar'), looks up translation from translationsMap.
   * translationsMap format: { "product_123": { "name": "Translated name", ... }, ... }
   */
  const localizedValue = (obj, field) => {
    if (!obj) return ''
    const enField = `${field}_en`
    const enValue = obj[enField] || obj[field] || ''

    // English: always use _en field
    if (lang.value === 'en') return enValue

    // Other languages: check translationsMap
    if (obj.id != null) {
      // Determine content type from object shape
      let contentType = ''
      if (obj.detail_content !== undefined || obj.is_featured !== undefined) contentType = 'product'
      else if (obj.slug !== undefined && obj.title_en !== undefined) contentType = 'news'
      else if (obj.whatsapp !== undefined || obj.about_image !== undefined) contentType = 'company'
      else if (obj.product_count !== undefined) contentType = 'category'
      else if (obj.stat1_num !== undefined) contentType = 'hero'
      else if (obj.featured_subtitle !== undefined) contentType = 'page_text'

      if (contentType) {
        const key = `${contentType}_${obj.id}`
        const t = translationsMap.value?.[key]
        if (t?.[field]) return t[field]
      }
    }

    // Fallback to _en value
    return enValue
  }

  /**
   * Get translated HTML content (detail_content or news content).
   * Returns translated HTML if available, otherwise original.
   */
  const localizedHtml = (obj, field) => {
    if (!obj) return ''
    const original = obj[field] || ''

    if (lang.value === 'en') return original

    if (obj.id != null) {
      let contentType = ''
      if (obj.detail_content !== undefined || obj.is_featured !== undefined) contentType = 'product'
      else if (obj.slug !== undefined && (obj.content !== undefined || obj.title_en !== undefined)) contentType = 'news'

      if (contentType) {
        const key = `${contentType}_${obj.id}`
        const t = translationsMap.value?.[key]
        if (t?.[field]) return t[field]
      }
    }

    return original
  }

  const initLang = () => {
    const saved = localStorage.getItem('lang')
    if (saved && saved !== '') {
      lang.value = saved
    } else {
      lang.value = 'en'
    }
  }

  return { lang, setLang, toggleLang, t, localizedValue, localizedHtml, initLang, translationsMap }
}
