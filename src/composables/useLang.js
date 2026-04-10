import { ref, watch, reactive } from 'vue'

const lang = ref(localStorage.getItem('lang') || 'en')

const builtInTranslations = {
  zh: {
    home: '首页', products: '产品中心', about: '关于我们', contact: '联系我们',
    inquiry: '询盘', sendInquiry: '发送询盘', name: '姓名', email: '邮箱',
    phone: '电话', company: '公司', country: '国家', message: '留言',
    submit: '提交', cancel: '取消', viewMore: '查看更多', allProducts: '全部产品',
    featuredProducts: '推荐产品', productCategories: '产品分类',
    ourAdvantages: '我们的优势', factoryDirect: '工厂直供', qualityAssurance: '品质保证',
    fastDelivery: '快速交货', customService: '定制服务', contactUs: '联系我们',
    getInTouch: '与我们取得联系', address: '地址', specifications: '规格参数',
    description: '产品描述', relatedProducts: '相关产品', relatedProductsDesc: '您可能还对这些产品感兴趣',
    relatedArticles: '相关文章', relatedArticlesDesc: '您可能感兴趣的更多资讯',
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
    companyLabel: '公司', aboutUs: '关于我们',
    featured: '精选', available: '个产品可选',
    noProductsFound: '未找到产品', noProductsDesc: '请尝试调整搜索或筛选条件',
    viewAllProducts: '查看所有产品',
    learnMore: '了解更多关于我们的公司和价值观',
    ourAchievements: '我们的成就', achievementsDesc: '数据证明我们的卓越',
    advantagesPageDesc: '专业品质和服务卓越，涵盖业务运营的每个方面',
    viewProducts: '查看产品',
    businessHours: '工作时间', followUs: '关注我们',
    monFri: '周一 - 周五', saturday: '周六', sunday: '周日', closed: '休息',
    formIntro: '填写以下表单，我们将在24小时内回复您',
    sending: '发送中...', privacyNote: '我们尊重您的隐私，不会与第三方分享您的信息',
    ourLocation: '我们的位置',
    newsUpdates: '新闻动态', newsSubtitle: '最新新闻、产品知识和公司动态',
    readMore: '阅读更多 →', loadingNews: '加载新闻中...',
    noNewsYet: '暂无新闻文章，请稍后再查看！',
    prevPage: '← 上一页', nextPage: '下一页 →', pageOf: '页', language: '语言',
    clickToZoom: '点击放大', productDetails: '产品详情', sendEmail: '发送邮件',
    contactOurTeam: '联系我们的团队', needMoreInfo: '需要更多信息？扫码直接联系我们',
    clickToEnlarge: '点击放大', scanQRWeChat: '扫码添加微信',
    backToNews: '← 返回新闻列表', quickView: '快速查看',
    contactInfo: '联系信息', yourRequirements: '您的需求',
    placeholderName: '您的姓名', placeholderPhone: '您的电话号码',
    placeholderCompany: '您的公司名称', placeholderCountry: '您的国家',
    placeholderMessage: '请描述您的钢材需求：产品类型、数量、规格、用途、时间等',
    benefit24h: '24小时内响应', benefitPricing: '价格有竞争力', benefitQuality: '品质保证',
    articleNotFound: '文章未找到',
    inquiryForProduct: '我想咨询以下产品',
    browseArticlesIn: '浏览分类：'
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
    description: 'Description', relatedProducts: 'Related Products', relatedProductsDesc: 'You may also be interested in these products',
    relatedArticles: 'Related Articles', relatedArticlesDesc: 'More insights you might find useful',
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
    companyLabel: 'Company', aboutUs: 'About Us',
    featured: 'Featured', available: 'products available',
    noProductsFound: 'No products found',
    noProductsDesc: "Try adjusting your search or filter to find what you're looking for.",
    viewAllProducts: 'View All Products',
    learnMore: 'Learn more about our company and values',
    ourAchievements: 'Our Achievements', achievementsDesc: 'Numbers that speak for our excellence',
    advantagesPageDesc: 'Professional quality and service excellence in every aspect of our business operations.',
    viewProducts: 'View Products',
    businessHours: 'Business Hours', followUs: 'Follow Us',
    monFri: 'Monday - Friday', saturday: 'Saturday', sunday: 'Sunday', closed: 'Closed',
    formIntro: "Fill out the form below and we'll get back to you within 24 hours",
    sending: 'Sending...',
    privacyNote: 'We respect your privacy and will never share your information with third parties.',
    ourLocation: 'Our Location',
    newsUpdates: 'News & Updates', newsSubtitle: 'Latest news, product knowledge and company updates',
    readMore: 'Read more →', loadingNews: 'Loading news...',
    noNewsYet: 'No news articles yet. Check back soon!',
    prevPage: '← Prev', nextPage: 'Next →', pageOf: 'Page', language: 'Language',
    clickToZoom: 'Click to zoom', productDetails: 'Product Details', sendEmail: 'Send Email',
    contactOurTeam: 'Contact Our Team', needMoreInfo: 'Need more information? Scan to contact us directly.',
    clickToEnlarge: 'Click to enlarge', scanQRWeChat: 'Scan QR to add on WeChat',
    backToNews: '← Back to News', quickView: 'Quick View',
    contactInfo: 'Contact Information', yourRequirements: 'Your Requirements',
    placeholderName: 'Your full name', placeholderPhone: '+1 (555) 123-4567',
    placeholderCompany: 'Your company name', placeholderCountry: 'Your country',
    placeholderMessage: 'Please describe your steel requirements: product type, quantity, specifications, application, timeline, etc.',
    benefit24h: '24-hour response', benefitPricing: 'Competitive pricing', benefitQuality: 'Quality guarantee',
    articleNotFound: 'Article not found',
    inquiryForProduct: 'I would like to inquire about',
    browseArticlesIn: 'Browse articles in:'
  }
}

const dbTranslations = reactive({})
let loadedLangs = new Set(['en', 'zh'])

async function loadUITranslations(langCode) {
  if (loadedLangs.has(langCode)) return
  try {
    const BASE_URL = (import.meta.env.VITE_API_BASE || '') + '/api'
    const res = await fetch(`${BASE_URL}/translation/ui-texts/${langCode}`)
    if (res.ok) {
      const data = await res.json()
      if (Object.keys(data).length > 0) {
        dbTranslations[langCode] = data
      }
    }
  } catch (e) {
    console.warn('Failed to load UI translations for', langCode, e)
  }
  loadedLangs.add(langCode)
}

let _router = null
let _fromRouter = false

watch(lang, (newLang) => {
  Object.keys(localStorage).filter(k => k.startsWith('_api_cache_')).forEach(k => localStorage.removeItem(k))
  try { Object.keys(sessionStorage).filter(k => k.startsWith('_trans_')).forEach(k => sessionStorage.removeItem(k)) } catch { }
  if (!loadedLangs.has(newLang)) {
    loadUITranslations(newLang)
  }
  // Sync URL with language (only if not triggered by router itself)
  if (!_fromRouter && _router) {
    const currentPath = _router.currentRoute.value.path
    // Don't sync admin routes
    if (!currentPath.startsWith('/admin')) {
      // Remove existing lang prefix
      const pathWithoutLang = currentPath.replace(/^\/[a-z]{2}(\/|$)/, '/')
      // ALL languages get prefix, including English — best for SEO consistency
      const newPath = `/${newLang}${pathWithoutLang === '/' ? '' : pathWithoutLang}`
      if (newPath !== currentPath) {
        _router.replace(newPath)
      }
    }
  }
  _fromRouter = false
})

export function useLang() {
  const setLang = (newLang, fromRouter = false) => {
    _fromRouter = fromRouter
    lang.value = newLang
    localStorage.setItem('lang', newLang)
    if (!loadedLangs.has(newLang)) {
      loadUITranslations(newLang)
    }
  }

  const toggleLang = () => {
    setLang(lang.value === 'zh' ? 'en' : 'zh')
  }

  const t = (key) => {
    if (dbTranslations[lang.value]?.[key]) {
      return dbTranslations[lang.value][key]
    }
    return builtInTranslations[lang.value]?.[key] || builtInTranslations['en']?.[key] || key
  }

  const localizedValue = (obj, field) => {
    if (!obj) return ''
    if (lang.value !== 'en') {
      const translatedField = `${field}_${lang.value}`
      if (obj[translatedField]) return obj[translatedField]
    }
    const enField = `${field}_en`
    return obj[enField] || obj[field] || ''
  }

  const localizedHtml = (obj, field) => {
    if (!obj) return ''
    if (lang.value !== 'en') {
      const translatedField = `${field}_${lang.value}`
      if (obj[translatedField]) return obj[translatedField]
    }
    return obj[field] || ''
  }

  // Get language-prefixed path for router-links
  const langPath = (path) => {
    if (lang.value === 'en') return path
    return `/${lang.value}${path}`
  }

  const initLang = () => {
    const saved = localStorage.getItem('lang')
    if (saved && saved !== '') {
      lang.value = saved
      if (!loadedLangs.has(saved)) {
        loadUITranslations(saved)
      }
    } else {
      lang.value = 'en'
    }
  }

  const setRouter = (router) => {
    _router = router
  }

  return { lang, setLang, toggleLang, t, localizedValue, localizedHtml, langPath, initLang, setRouter }
}
