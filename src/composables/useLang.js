import { ref, watch } from 'vue'

// Default language is English
const lang = ref(localStorage.getItem('lang') || 'en')

const translations = {
  zh: {
    home: '首页', products: '产品中心', about: '关于我们', contact: '联系我们',
    inquiry: '询盘', sendInquiry: '发送询盘', name: '姓名', email: '邮箱',
    phone: '电话', company: '公司', country: '国家', message: '留言',
    submit: '提交', cancel: '取消', viewMore: '查看更多', allProducts: '全部产品',
    featuredProducts: '推荐产品', productCategories: '产品分类',
    ourAdvantages: '我们的优势', factoryDirect: '工厂直供', qualityAssurance: '品质保证',
    fastDelivery: '快速交货', customService: '定制服务', contactUs: '联系我们',
    getInTouch: '与我们取得联系', address: '地址', specifications: '规格参数',
    description: '产品描述', relatedProducts: '相关产品',
    inquirySuccess: '询盘提交成功，我们会尽快与您联系！', required: '必填',
    yearsExperience: '年行业经验', productModels: '产品型号',
    exportCountries: '出口国家', globalClients: '全球客户',
    news: '新闻中心', newsCenter: '新闻中心',
    whyChooseUs: '为什么选择我们', categories: '产品分类',
    productsCount: '个产品',
    factoryDirectDesc: '源头工厂直供，价格更有竞争力，品质有保障',
    qualityAssuranceDesc: '严格的测试和认证，确保卓越的质量标准',
    fastDeliveryDesc: '高效的物流和全球运输，确保准时交货',
    customServiceDesc: '量身定制的解决方案和专业支持，满足您的特定需求',
    readyToStart: '准备好开始你的项目了吗？',
    getQuote: '联系我们的销售团队以获取最优惠的报价',
    companyLabel: '公司',
    aboutUs: '关于我们'
  },
  en: {
    home: 'Home', products: 'Products', about: 'About Us', contact: 'Contact',
    inquiry: 'Inquiry', sendInquiry: 'Send Inquiry', name: 'Name', email: 'Email',
    phone: 'Phone', company: 'Company', country: 'Country', message: 'Message',
    submit: 'Submit', cancel: 'Cancel', viewMore: 'View More', allProducts: 'All Products',
    featuredProducts: 'Featured Products', productCategories: 'Product Categories',
    ourAdvantages: 'Our Advantages', factoryDirect: 'Factory Direct', qualityAssurance: 'Quality Assurance',
    fastDelivery: 'Fast Delivery', customService: 'Custom Service', contactUs: 'Contact Us',
    getInTouch: 'Get In Touch', address: 'Address', specifications: 'Specifications',
    description: 'Description', relatedProducts: 'Related Products',
    inquirySuccess: 'Inquiry submitted successfully! We will contact you soon.', required: 'Required',
    yearsExperience: 'Years Experience', productModels: 'Product Models',
    exportCountries: 'Export Countries', globalClients: 'Global Clients',
    news: 'News', newsCenter: 'News Center',
    whyChooseUs: 'Why Choose Us', categories: 'Categories',
    productsCount: 'Products',
    factoryDirectDesc: 'Direct from manufacturer with competitive pricing and quality control',
    qualityAssuranceDesc: 'Rigorous testing and certification ensuring premium quality standards',
    fastDeliveryDesc: 'Efficient logistics and worldwide shipping for timely delivery',
    customServiceDesc: 'Tailored solutions and professional support for your specific needs',
    readyToStart: 'Ready to Start Your Project?',
    getQuote: 'Get in touch with our experts for professional solutions',
    companyLabel: 'Company',
    aboutUs: 'About Us'
  }
}

// When language changes, clear all API caches so data is refetched with new lang param
watch(lang, () => {
  // Clear all API caches
  Object.keys(localStorage).filter(k => k.startsWith('_api_cache_')).forEach(k => localStorage.removeItem(k))
  // Clear sessionStorage translation caches
  try { Object.keys(sessionStorage).filter(k => k.startsWith('_trans_')).forEach(k => sessionStorage.removeItem(k)) } catch { }
})

export function useLang() {
  const setLang = (newLang) => {
    lang.value = newLang
    localStorage.setItem('lang', newLang)
  }

  const toggleLang = () => {
    setLang(lang.value === 'zh' ? 'en' : 'zh')
  }

  const t = (key) => {
    return translations[lang.value]?.[key] || translations['en']?.[key] || key
  }

  /**
   * Get localized value for a data object field.
   * 
   * The server injects translated fields as `field_langCode` (e.g. `name_zh`, `description_zh`).
   * This function checks for `field_langCode` first, then falls back to `field_en`, then `field`.
   * 
   * Example: localizedValue(product, 'name')
   *   - If lang='zh' and product.name_zh exists → returns product.name_zh
   *   - Otherwise returns product.name_en or product.name
   */
  const localizedValue = (obj, field) => {
    if (!obj) return ''
    
    // Try translated field first (server-injected): field_langCode
    if (lang.value !== 'en') {
      const translatedField = `${field}_${lang.value}`
      if (obj[translatedField]) return obj[translatedField]
    }
    
    // Fallback to English field or raw field
    const enField = `${field}_en`
    return obj[enField] || obj[field] || ''
  }

  /**
   * Get localized HTML content (detail_content, news content).
   * Similar to localizedValue but for HTML fields without _en suffix.
   */
  const localizedHtml = (obj, field) => {
    if (!obj) return ''
    
    // Try translated field first
    if (lang.value !== 'en') {
      const translatedField = `${field}_${lang.value}`
      if (obj[translatedField]) return obj[translatedField]
    }
    
    // Fallback to original field
    return obj[field] || ''
  }

  const initLang = () => {
    const saved = localStorage.getItem('lang')
    if (saved && saved !== '') {
      lang.value = saved
    } else {
      lang.value = 'en'
    }
  }

  return { lang, setLang, toggleLang, t, localizedValue, localizedHtml, initLang }
}
