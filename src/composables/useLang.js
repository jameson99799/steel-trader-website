import { ref } from 'vue'

// Default language is English — highest priority
// localStorage overrides if user has explicitly picked something else
const lang = ref(localStorage.getItem('lang') || 'en')

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

  // English is the primary content language.
  // _en fields are always preferred. If the chosen lang has a translation in the
  // translations table it will be applied by the page-level layer. Otherwise shows _en.
  const localizedValue = (obj, field) => {
    if (!obj) return ''
    const enField = `${field}_en`
    // English: prefer _en field
    if (lang.value === 'en') {
      return obj[enField] || obj[field] || ''
    }
    // Other languages: prefer _en over Chinese (zh field) for foreign visitors
    // The page rendering layer should apply DB translations on top of this
    return obj[enField] || obj[field] || ''
  }

  const initLang = () => {
    const saved = localStorage.getItem('lang')
    // Only restore saved lang if it's a known value
    if (saved && saved !== '') {
      lang.value = saved
    } else {
      lang.value = 'en'
    }
  }

  return { lang, setLang, toggleLang, t, localizedValue, initLang }
}
