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
    browseArticlesIn: '浏览分类：',
    latestNews: '最新文章',
    ralColorChart: 'RAL 色卡',
    ralColorBtn: 'RAL 色卡',
    ralDesc: '适用于我们彩涂钢卷 (PPGI / PPGL) 的标准 RAL 颜色对照表。',
    ralSearchPlaceholder: '搜索您想要的颜色',
    ralNoResult: '未找到颜色',
    factory: '工厂',
    factoryTour: '工厂之旅',
    factoryDesc: '帮助你更好的了解我们工厂',
    roofingProfilesBtn: '瓦型图库',
    roofingTitle: '屋面瓦型',
    roofingSubtitle: '专业提供钢制屋面板的图纸与技术规格参数',
    roofingProfilesDesc: '发现我们广泛的钢制屋面瓦型及墙面板瓦型选择。',
    allProfiles: '所有瓦型',
    surfaceControls: '表面材质:',
    ralColorControl: 'RAL 颜色:',
    roofing3dRendering: '3D 渲染图',
    roofingProfileDimensions: '尺寸与规格参数',
    roofingSpecsTitle: '规格参数',
    specMaterial: '材质',
    specThickness: '厚度 (TCT)',
    specEffectiveWidth: '有效宽度',
    specOverallWidth: '进料宽度',
    specPitch: '波距',
    specRibHeight: '波高',
    specCoating: '涂层',
    specLength: '长度',
    specApplications: '应用场景',
    roofingTypeCorrugated: '波浪瓦',
    roofingTypeTrapezoidal: '梯形瓦 (彩钢瓦)',
    roofingTypeStandingSeam: '直立锁边 (暗扣瓦)',
    roofingTypeGlazedTile: '琉璃瓦',
    roofingTypeWallPanel: '墙面板',
    surfacePpgi: '彩涂 (PPGI / PPGL)',
    surfaceGi: '镀锌 (Galvanized GI)',
    surfaceGl: '镀铝锌 (Galvalume GL)',
    colorSelectRal: '选择 RAL 颜色',
    colorStandard: '标准颜色',
    colorCustom: '自定义颜色',
    defaultLength: '可定制 (最长 12m)',
    defaultApplications: '屋面、墙面、外墙围护',
    defaultGiMaterial: '镀锌钢卷 (GI)',
    defaultGlMaterial: '镀铝锌钢卷 (GL)',
    defaultPpgiMaterial: '彩涂钢卷 (PPGI/PPGL)',
    defaultGiCoating: 'Z60 – Z275 (镀锌)',
    defaultGlCoating: 'AZ50 – AZ150 (镀铝锌)',
    defaultPpgiCoating: 'PE / SMP / HDP / PVDF',
    futuresPriceBtn: '实时期货价格',
    futuresTitle: '实时期货价格',
    futuresDesc: '钢铁相关期货品种实时行情走势',
    futuresLatest: '最新价',
    futuresChange: '涨跌',
    futuresOpen: '开盘',
    futuresHigh: '最高',
    futuresLow: '最低',
    futuresVol: '成交量',
    futuresKline: 'K线图',
    futuresClose: '关闭',
    futuresDays30: '近30天',
    futuresDays90: '近90天',
    futuresDaysAll: '全部',
    futuresNoData: '暂无数据',
    futuresLoading: '加载期货行情中...',
    futuresEmpty: '暂未配置期货品种，请联系管理员添加',
    futuresTimeNote: '请注意：所有期货价格时间是中国北京时间，所有显示的价格为人民币',
    futuresName: '期货名称',
    futuresCurrentPrice: '今日实时价格',
    futuresPrevClose: '昨日收盘价格',
    futuresChartRealtime: '走势图 (实时)',
    futuresChartDays: '走势图 ({days}日)',
    futuresDailyChange: '当日涨跌',
    futuresLoadingShort: '加载中',
    futuresDateTime: '日期时间',
    futuresCurrentPriceStr: '实时价格',
    futuresChangePct: '涨跌幅',
    futuresOpenStr: '开盘价格',
    futuresCloseStr: '收盘价格',
    futuresHighStr: '最高价格',
    futuresLowStr: '最低价格',
    futuresMinline: '分时',
    futures30d: '30日',
    futures60d: '60日',
    futures100d: '100日',
    futuresPrice: '价格',
    shipTrackBtn: '船舶追踪',
    shipTrackTitle: '船舶实时追踪',
    shipTrackDesc: '实时查询全球船舶位置、航行状态与船舶资料',
    shipSearchPlaceholder: '输入船名 / IMO / MMSI，如 PACIFIC TALENT',
    shipSearchBtn: '查询',
    shipSearching: '搜索中...',
    shipTry: '试试:',
    shipName: '船名',
    shipType: '船型',
    shipIdentification: 'IMO / MMSI',
    shipCallsign: '呼号',
    shipFlag: '船旗',
    shipBuilt: '建造年份',
    shipGt: '总吨位',
    shipDwt: '载重吨',
    shipLoa: '总长',
    shipBeam: '船宽',
    shipStatus: '状态',
    shipSpeed: '航速',
    shipCourse: '航向',
    shipPosition: '位置',
    shipDest: '目的地',
    shipEta: '预计到达',
    shipLastPort: '上一港口',
    shipUpdated: '更新时间',
    shipLivePosition: '实时位置',
    shipLat: '纬度',
    shipLon: '经度',
    shipViewMap: '在 Google 地图查看位置',
    shipStUnderway: '航行中',
    shipStAnchored: '锚泊',
    shipStMoored: '靠泊',
    shipStUnknown: '未知',
    shipLoading: '加载船舶数据中...',
    shipEmpty: '暂未配置船舶，请联系管理员添加',
    shipNoResult: '未找到该船舶，请检查船名或编号',
    shipSearchError: '查询失败，请稍后重试',
    shipNoLive: '暂无实时位置数据',
    shipDemoData: '演示数据',
    shipLiveData: '实时数据',
    shipNotice: '注意：船舶位置数据来自 AIS 公共数据源，未配置 API Key 时展示为演示数据',
    chatTitle: 'SunSea Steel 在线客服',
    chatOnline: '在线',
    chatOffline: '离线',
    chatPlaceholder: '请输入您的消息...',
    chatSend: '发送',
    reviewsKicker: '客户反馈',
    reviewsTitle: '产品评价',
    reviewsPublishedCount: '{count} 条已发布评价',
    reviewsVerifiedPurchase: '已验证购买',
    reviewsIncentivized: '激励评价',
    reviewsLoadMore: '加载更多评价',
    reviewsLoading: '加载中…',
    reviewsLoadError: '评价加载失败，请重试。',
    reviewsRatingAria: '{rating} 分（满分 5 分）'
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
    browseArticlesIn: 'Browse articles in:',
    latestNews: 'Latest News',
    factory: 'Factory',
    factoryTour: 'Factory Tour',
    factoryDesc: 'Explore our modern manufacturing facilities and advanced production lines.',
    ralColorChart: 'RAL Color',
    ralColorBtn: 'RAL Color',
    ralDesc: 'Standard RAL colors available for our prepainted steel coils (PPGI/PPGL).',
    ralSearchPlaceholder: 'Search for your desired color.',
    ralNoResult: 'No colors found',
    roofingProfilesBtn: 'Roofing Profiles',
    roofingTitle: "Roofing Sheet Profiles",
    roofingSubtitle: "Common technical drawings and specifications for our steel roofing panels.",
    roofingProfilesDesc: 'Discover our wide range of corrugated roofing sheet profiles.',
    allProfiles: "All Profiles",
    surfaceControls: "Surface:",
    ralColorControl: "RAL Color:",
    roofing3dRendering: "3D RENDERING",
    roofingProfileDimensions: "PROFILE & DIMENSIONS",
    roofingSpecsTitle: "SPECIFICATIONS",
    specMaterial: "Material",
    specThickness: "Thickness (TCT)",
    specEffectiveWidth: "Effective Width",
    specOverallWidth: "Overall Width",
    specPitch: "Pitch",
    specRibHeight: "Rib Height",
    specCoating: "Coating",
    specLength: "Length",
    specApplications: "Applications",
    roofingTypeCorrugated: "Corrugated",
    roofingTypeTrapezoidal: "Trapezoidal",
    roofingTypeStandingSeam: "Standing Seam",
    roofingTypeGlazedTile: "Glazed Tile",
    roofingTypeWallPanel: "Wall Panel",
    surfacePpgi: "PPGI / PPGL",
    surfaceGi: "GI (Galvanized)",
    surfaceGl: "GL (Galvalume)",
    colorSelectRal: "Select RAL Color",
    colorStandard: "Standard Color",
    colorCustom: "Custom / Preset Color",
    defaultLength: "Customizable (Max. 12m)",
    defaultApplications: "Roofing, Wall Cladding, Siding",
    defaultGiMaterial: "Galvanized Steel (GI)",
    defaultGlMaterial: "Aluminum-Zinc Coated Steel (GL)",
    defaultPpgiMaterial: "Pre-Painted Steel (PPGI/PPGL)",
    defaultGiCoating: "Z60 – Z275 (Galvanized)",
    defaultGlCoating: "AZ50 – AZ150 (Galvalume)",
    defaultPpgiCoating: "PE / SMP / HDP / PVDF",
    futuresPriceBtn: 'Futures Price',
    futuresTitle: 'Live Futures Prices',
    futuresDesc: 'Real-time commodity futures for steel-related products.',
    futuresLatest: 'Latest',
    futuresChange: 'Change',
    futuresOpen: 'Open',
    futuresHigh: 'High',
    futuresLow: 'Low',
    futuresVol: 'Volume',
    futuresKline: 'K-Line',
    futuresClose: 'Close',
    futuresDays30: '30 Days',
    futuresDays90: '90 Days',
    futuresDaysAll: 'All',
    futuresNoData: 'No data available',
    futuresLoading: 'Loading futures data...',
    futuresEmpty: 'No futures varieties configured, please contact administrator.',
    futuresTimeNote: 'Please note: All futures prices are in Beijing Time (CST), and all displayed prices are in CNY.',
    futuresName: 'Futures Name',
    futuresCurrentPrice: 'Current Price',
    futuresPrevClose: 'Previous Close',
    futuresChartRealtime: 'Trend (Real-time)',
    futuresChartDays: 'Trend ({days} Days)',
    futuresDailyChange: 'Daily Change',
    futuresLoadingShort: 'Loading',
    futuresDateTime: 'Date/Time',
    futuresCurrentPriceStr: 'Real-time Price',
    futuresChangePct: 'Change %',
    futuresOpenStr: 'Open Price',
    futuresCloseStr: 'Close Price',
    futuresHighStr: 'High Price',
    futuresLowStr: 'Low Price',
    futuresMinline: 'Intraday',
    futures30d: '30 Days',
    futures60d: '60 Days',
    futures100d: '100 Days',
    futuresPrice: 'Price',
    shipTrackBtn: 'Ship Tracker',
    shipTrackTitle: 'Live Ship Tracker',
    shipTrackDesc: 'Track live vessel positions, navigation status and ship particulars worldwide',
    shipSearchPlaceholder: 'Search by vessel name / IMO / MMSI, e.g. PACIFIC TALENT',
    shipSearchBtn: 'Search',
    shipSearching: 'Searching...',
    shipTry: 'Try:',
    shipName: 'Vessel Name',
    shipType: 'Type',
    shipIdentification: 'IMO / MMSI',
    shipCallsign: 'Call Sign',
    shipFlag: 'Flag',
    shipBuilt: 'Built',
    shipGt: 'Gross Tonnage',
    shipDwt: 'Deadweight',
    shipLoa: 'Length LOA',
    shipBeam: 'Beam',
    shipStatus: 'Status',
    shipSpeed: 'Speed',
    shipCourse: 'Course',
    shipPosition: 'Position',
    shipDest: 'Destination',
    shipEta: 'ETA',
    shipLastPort: 'Last Port',
    shipUpdated: 'Updated',
    shipLivePosition: 'Live Position',
    shipLat: 'Latitude',
    shipLon: 'Longitude',
    shipViewMap: 'View position on Google Maps',
    shipStUnderway: 'Underway',
    shipStAnchored: 'Anchored',
    shipStMoored: 'Moored',
    shipStUnknown: 'Unknown',
    shipLoading: 'Loading vessel data...',
    shipEmpty: 'No vessels configured, please contact administrator.',
    shipNoResult: 'Vessel not found. Please check the name or number.',
    shipSearchError: 'Search failed, please try again later.',
    shipNoLive: 'No live position data available',
    shipDemoData: 'Demo data',
    shipLiveData: 'Live data',
    shipNotice: 'Note: Vessel positions come from public AIS data sources. Demo data is shown when no API key is configured.',
    chatTitle: 'SunSea Steel Support',
    chatOnline: 'Online',
    chatOffline: 'Offline',
    chatPlaceholder: 'Type your message...',
    chatSend: 'Send',
    reviewsKicker: 'Customer feedback',
    reviewsTitle: 'Product Reviews',
    reviewsPublishedCount: '{count} published reviews',
    reviewsVerifiedPurchase: 'Verified purchase',
    reviewsIncentivized: 'Incentivized review',
    reviewsLoadMore: 'Load more reviews',
    reviewsLoading: 'Loading…',
    reviewsLoadError: 'Reviews could not be loaded. Please try again.',
    reviewsRatingAria: '{rating} out of 5 stars'
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
  const setLang = async (newLang, fromRouter = false) => {
    _fromRouter = fromRouter
    lang.value = newLang
    localStorage.setItem('lang', newLang)
    if (!fromRouter) {
      document.cookie = `locale_preference=${encodeURIComponent(newLang)}; Path=/; Max-Age=31536000; SameSite=Lax`
      document.cookie = 'locale_auto_selected=; Path=/; Max-Age=0; SameSite=Lax'
    }

    if (!loadedLangs.has(newLang) && newLang !== 'en' && newLang !== 'zh') {
      await loadUITranslations(newLang)
    }
  }

  const toggleLang = async () => {
    await setLang(lang.value === 'zh' ? 'en' : 'zh')
  }

  const t = (key) => {
    if (dbTranslations[lang.value]?.[key]) {
      return dbTranslations[lang.value][key]
    }
    return builtInTranslations[lang.value]?.[key] || builtInTranslations['en']?.[key] || key
  }

  const localizedValue = (obj, field) => {
    if (!obj) return ''
    const enField = `${field}_en`
    if (lang.value !== 'en') {
      const translatedField = `${field}_${lang.value}`
      if (obj[translatedField]) return obj[translatedField]
      // Fallback for non-English if AI translation is missing:
      // Prefer the base field (usually native Chinese) over English
      return obj[field] || obj[enField] || ''
    }
    // For English: prefer the English field over the base field
    return obj[enField] || obj[field] || ''
  }

  const localizedHtml = (obj, field) => {
    if (!obj) return ''
    const baseHtml = obj[field] || ''
    if (lang.value !== 'en') {
      const translatedField = `${field}_${lang.value}`
      if (obj[translatedField]) {
        // Sync images from base (English) content into translated content.
        // Images are language-independent; only text needs translation.
        return syncImagesFromBase(baseHtml, obj[translatedField])
      }
    }
    return baseHtml
  }

  /**
   * Replace image src values in translatedHtml with those from baseHtml.
   * Handles cases where the translated HTML has fewer images than the base
   * (AI may drop some during translation). Uses positional matching first,
   * then appends any extra base images at the end.
   */
  const syncImagesFromBase = (baseHtml, translatedHtml) => {
    if (!baseHtml || !translatedHtml) return translatedHtml || baseHtml || ''
    // Extract all <img> tags from base HTML (full tag for appending)
    const baseImgs = []
    const baseImgTags = []
    baseHtml.replace(/<img\b[^>]*?src\s*=\s*(["'])([^"']*?)\1[^>]*?\/?>/gi, (fullMatch, q, src) => {
      baseImgs.push(src)
      baseImgTags.push(fullMatch)
    })
    if (!baseImgs.length) return translatedHtml
    
    // Count images in translated HTML
    let translatedImgCount = 0
    translatedHtml.replace(/<img\b[^>]*?src\s*=\s*(["'])[^"']*?\1[^>]*?\/?>/gi, () => { translatedImgCount++ })
    
    // Replace existing img src values positionally
    let idx = 0
    let result = translatedHtml.replace(/<img\b([^>]*?)src\s*=\s*(["'])([^"']*?)\2([^>]*?)\/?>/gi, (match, before, quote, oldSrc, after) => {
      if (idx < baseImgs.length) {
        const newSrc = baseImgs[idx]
        idx++
        const selfClose = match.trimEnd().endsWith('/>') ? ' />' : '>'
        return `<img${before}src=${quote}${newSrc}${quote}${after}${selfClose}`
      }
      idx++
      return match
    })
    
    // If base has MORE images than translated, append the missing ones
    if (idx < baseImgs.length) {
      const missingTags = baseImgTags.slice(idx).join('\n')
      // Try to insert before closing </body> or </div> at the end, or just append
      if (result.includes('</body>')) {
        result = result.replace('</body>', missingTags + '\n</body>')
      } else {
        // Find the last substantial closing tag and insert before it
        const lastDivIdx = result.lastIndexOf('</div>')
        if (lastDivIdx > result.length * 0.8) {
          result = result.slice(0, lastDivIdx) + missingTags + '\n' + result.slice(lastDivIdx)
        } else {
          result += '\n' + missingTags
        }
      }
    }
    
    return result
  }

  // Get language-prefixed path for router-links
  const langPath = (path) => {
    const code = lang.value || 'en'
    const cleanPath = path === '/' ? '' : path
    return `/${code}${cleanPath}`
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
