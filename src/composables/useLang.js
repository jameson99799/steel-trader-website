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
    aboutUs: '关于我们',
    // Products page
    featured: '精选', available: '个产品可选',
    noProductsFound: '未找到产品', noProductsDesc: '请尝试调整搜索或筛选条件',
    viewAllProducts: '查看所有产品',
    // About page
    learnMore: '了解更多关于我们的公司和价值观',
    ourAchievements: '我们的成就', achievementsDesc: '数据证明我们的卓越',
    advantagesPageDesc: '专业品质和服务卓越，涵盖业务运营的每个方面',
    viewProducts: '查看产品',
    // Contact page
    businessHours: '工作时间', followUs: '关注我们',
    monFri: '周一 - 周五', saturday: '周六', sunday: '周日', closed: '休息',
    formIntro: '填写以下表单，我们将在24小时内回复您',
    sending: '发送中...', privacyNote: '我们尊重您的隐私，不会与第三方分享您的信息',
    ourLocation: '我们的位置',
    // News page
    newsUpdates: '新闻动态', newsSubtitle: '最新新闻、产品知识和公司动态',
    readMore: '阅读更多 →', loadingNews: '加载新闻中...',
    noNewsYet: '暂无新闻文章，请稍后再查看！',
    prevPage: '← 上一页', nextPage: '下一页 →',
    pageOf: '页',
    language: '语言',
    // ProductDetail page
    clickToZoom: '点击放大', productDetails: '产品详情', sendEmail: '发送邮件',
    contactOurTeam: '联系我们的团队', needMoreInfo: '需要更多信息？扫码直接联系我们',
    clickToEnlarge: '点击放大', scanQRWeChat: '扫码添加微信',
    backToNews: '← 返回新闻列表', quickView: '快速查看',
    // InquiryModal
    contactInfo: '联系信息', yourRequirements: '您的需求',
    placeholderName: '您的姓名', placeholderPhone: '您的电话号码',
    placeholderCompany: '您的公司名称', placeholderCountry: '您的国家',
    placeholderMessage: '请描述您的钢材需求：产品类型、数量、规格、用途、时间等',
    benefit24h: '24小时内响应', benefitPricing: '价格有竞争力', benefitQuality: '品质保证',
    articleNotFound: '文章未找到',
    inquiryForProduct: '我想咨询以下产品'
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
    aboutUs: 'About Us',
    // Products page
    featured: 'Featured', available: 'products available',
    noProductsFound: 'No products found', noProductsDesc: 'Try adjusting your search or filter to find what you\'re looking for.',
    viewAllProducts: 'View All Products',
    // About page
    learnMore: 'Learn more about our company and values',
    ourAchievements: 'Our Achievements', achievementsDesc: 'Numbers that speak for our excellence',
    advantagesPageDesc: 'Professional quality and service excellence in every aspect of our business operations.',
    viewProducts: 'View Products',
    // Contact page
    businessHours: 'Business Hours', followUs: 'Follow Us',
    monFri: 'Monday - Friday', saturday: 'Saturday', sunday: 'Sunday', closed: 'Closed',
    formIntro: 'Fill out the form below and we\'ll get back to you within 24 hours',
    sending: 'Sending...', privacyNote: 'We respect your privacy and will never share your information with third parties.',
    ourLocation: 'Our Location',
    // News page
    newsUpdates: 'News & Updates', newsSubtitle: 'Latest news, product knowledge and company updates',
    readMore: 'Read more →', loadingNews: 'Loading news...',
    noNewsYet: 'No news articles yet. Check back soon!',
    prevPage: '← Prev', nextPage: 'Next →',
    pageOf: 'Page',
    language: 'Language',
    // ProductDetail page
    clickToZoom: 'Click to zoom', productDetails: 'Product Details', sendEmail: 'Send Email',
    contactOurTeam: 'Contact Our Team', needMoreInfo: 'Need more information? Scan to contact us directly.',
    clickToEnlarge: 'Click to enlarge', scanQRWeChat: 'Scan QR to add on WeChat',
    backToNews: '← Back to News', quickView: 'Quick View',
    // InquiryModal
    contactInfo: 'Contact Information', yourRequirements: 'Your Requirements',
    placeholderName: 'Your full name', placeholderPhone: '+1 (555) 123-4567',
    placeholderCompany: 'Your company name', placeholderCountry: 'Your country',
    placeholderMessage: 'Please describe your steel requirements: product type, quantity, specifications, application, timeline, etc.',
    benefit24h: '24-hour response', benefitPricing: 'Competitive pricing', benefitQuality: 'Quality guarantee',
    articleNotFound: 'Article not found',
    inquiryForProduct: 'I would like to inquire about'
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
