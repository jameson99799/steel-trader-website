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
    chatTitle: 'SunSea Steel 在线客服',
    chatOnline: '在线',
    chatOffline: '离线',
    chatPlaceholder: '请输入您的消息...',
    chatSend: '发送',
    homeFaq: '常见问题',
    productLoadError: '抱歉，该产品暂时无法加载。请稍后重试，或浏览我们的全部产品。',
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
    reviewsRatingAria: '{rating} out of 5 stars',
    homeFaq: 'Frequently Asked Questions',
    productLoadError: 'Sorry, this product could not be loaded. Please try again later, or browse our full catalog.'
  },
  // Fixed UI labels for the secondary locales. The DB-driven UI translation
  // system (UI_TEXTS_EN manifest) covers these too, but languages whose UI
  // chunks were generated from an older manifest miss newer keys — these
  // built-ins guarantee template headings (Description / Specifications / …)
  // never fall back to English on localized pages.
  es: {
    home: 'Inicio', products: 'Productos', about: 'Sobre nosotros', contact: 'Contacto', news: 'Noticias',
    description: 'Descripción', specifications: 'Especificaciones', productDetails: 'Detalles del producto',
    relatedProducts: 'Productos relacionados', relatedProductsDesc: 'También puede interesarle estos productos',
    relatedArticles: 'Artículos relacionados', relatedArticlesDesc: 'Más información que puede resultarle útil',
    productCategories: 'Categorías de productos', allProducts: 'Todos los productos', viewMore: 'Ver más',
    contactUs: 'Contáctenos', getInTouch: 'Póngase en contacto', address: 'Dirección',
    sendInquiry: 'Enviar consulta', sendEmail: 'Enviar correo', inquiry: 'Consulta',
    name: 'Nombre', email: 'Correo electrónico', phone: 'Teléfono', message: 'Mensaje',
    submit: 'Enviar', cancel: 'Cancelar', required: 'Obligatorio', company: 'Empresa', country: 'País',
    featured: 'Destacado', viewAllProducts: 'Ver todos los productos', productsCount: 'Productos',
    categories: 'Categorías', latestNews: 'Últimas noticias', contactInfo: 'Información de contacto',
    homeFaq: 'Preguntas frecuentes',
    productLoadError: 'Lo sentimos, este producto no se pudo cargar. Inténtalo de nuevo más tarde o consulta todo nuestro catálogo.',
    reviewsKicker: 'Opiniones de clientes', reviewsTitle: 'Opiniones sobre el producto',
    reviewsPublishedCount: '{count} opiniones publicadas', reviewsVerifiedPurchase: 'Compra verificada',
    reviewsIncentivized: 'Opinión incentivada', reviewsLoadMore: 'Cargar más opiniones',
    reviewsLoading: 'Cargando…', reviewsLoadError: 'No se pudieron cargar las opiniones. Inténtalo de nuevo.',
    reviewsRatingAria: '{rating} de 5 estrellas'
  },
  fr: {
    home: 'Accueil', products: 'Produits', about: 'À propos', contact: 'Contact', news: 'Actualités',
    description: 'Description', specifications: 'Spécifications', productDetails: 'Détails du produit',
    relatedProducts: 'Produits associés', relatedProductsDesc: 'Vous aimerez peut-être aussi ces produits',
    relatedArticles: 'Articles associés', relatedArticlesDesc: "D'autres informations qui pourraient vous être utiles",
    productCategories: 'Catégories de produits', allProducts: 'Tous les produits', viewMore: 'Voir plus',
    contactUs: 'Contactez-nous', getInTouch: 'Entrer en contact', address: 'Adresse',
    sendInquiry: 'Envoyer une demande', sendEmail: 'Envoyer un e-mail', inquiry: 'Demande',
    name: 'Nom', email: 'E-mail', phone: 'Téléphone', message: 'Message',
    submit: 'Envoyer', cancel: 'Annuler', required: 'Obligatoire', company: 'Société', country: 'Pays',
    featured: 'En vedette', viewAllProducts: 'Voir tous les produits', productsCount: 'Produits',
    categories: 'Catégories', latestNews: 'Dernières actualités', contactInfo: 'Coordonnées',
    homeFaq: 'Questions fréquentes',
    productLoadError: 'Désolé, ce produit n\'a pas pu être chargé. Veuillez réessayer plus tard ou consultez tout notre catalogue.',
    reviewsKicker: 'Avis clients', reviewsTitle: 'Avis sur le produit',
    reviewsPublishedCount: '{count} avis publiés', reviewsVerifiedPurchase: 'Achat vérifié',
    reviewsIncentivized: 'Avis incité', reviewsLoadMore: 'Charger plus d’avis',
    reviewsLoading: 'Chargement…', reviewsLoadError: 'Impossible de charger les avis. Veuillez réessayer.',
    reviewsRatingAria: '{rating} sur 5 étoiles'
  },
  ru: {
    home: 'Главная', products: 'Продукция', about: 'О нас', contact: 'Контакты', news: 'Новости',
    description: 'Описание', specifications: 'Характеристики', productDetails: 'Описание продукта',
    relatedProducts: 'Похожая продукция', relatedProductsDesc: 'Вас также может заинтересовать эта продукция',
    relatedArticles: 'Похожие статьи', relatedArticlesDesc: 'Другие полезные материалы',
    productCategories: 'Категории продукции', allProducts: 'Вся продукция', viewMore: 'Подробнее',
    contactUs: 'Связаться с нами', getInTouch: 'Свяжитесь с нами', address: 'Адрес',
    sendInquiry: 'Отправить запрос', sendEmail: 'Отправить письмо', inquiry: 'Запрос',
    name: 'Имя', email: 'Эл. почта', phone: 'Телефон', message: 'Сообщение',
    submit: 'Отправить', cancel: 'Отмена', required: 'Обязательно', company: 'Компания', country: 'Страна',
    featured: 'Рекомендуем', viewAllProducts: 'Смотреть всю продукцию', productsCount: 'товаров',
    categories: 'Категории', latestNews: 'Последние новости', contactInfo: 'Контактная информация',
    homeFaq: 'Часто задаваемые вопросы',
    productLoadError: 'К сожалению, этот продукт не удалось загрузить. Попробуйте позже или просмотрите весь наш каталог.',
    reviewsKicker: 'Отзывы клиентов', reviewsTitle: 'Отзывы о продукте',
    reviewsPublishedCount: '{count} опубликованных отзывов', reviewsVerifiedPurchase: 'Проверенная покупка',
    reviewsIncentivized: 'Стимулированный отзыв', reviewsLoadMore: 'Показать ещё отзывы',
    reviewsLoading: 'Загрузка…', reviewsLoadError: 'Не удалось загрузить отзывы. Попробуйте снова.',
    reviewsRatingAria: '{rating} из 5 звёзд'
  },
  ar: {
    home: 'الرئيسية', products: 'المنتجات', about: 'من نحن', contact: 'اتصل بنا', news: 'الأخبار',
    description: 'الوصف', specifications: 'المواصفات', productDetails: 'تفاصيل المنتج',
    relatedProducts: 'منتجات ذات صلة', relatedProductsDesc: 'قد تهمك هذه المنتجات أيضًا',
    relatedArticles: 'مقالات ذات صلة', relatedArticlesDesc: 'المزيد من المعلومات المفيدة لك',
    productCategories: 'فئات المنتجات', allProducts: 'جميع المنتجات', viewMore: 'عرض المزيد',
    contactUs: 'تواصل معنا', getInTouch: 'تواصل معنا', address: 'العنوان',
    sendInquiry: 'إرسال استفسار', sendEmail: 'إرسال بريد', inquiry: 'استفسار',
    name: 'الاسم', email: 'البريد الإلكتروني', phone: 'الهاتف', message: 'الرسالة',
    submit: 'إرسال', cancel: 'إلغاء', required: 'مطلوب', company: 'الشركة', country: 'الدولة',
    featured: 'مميز', viewAllProducts: 'عرض جميع المنتجات', productsCount: 'منتج',
    categories: 'الفئات', latestNews: 'أحدث الأخبار', contactInfo: 'معلومات الاتصال',
    homeFaq: 'الأسئلة الشائعة',
    productLoadError: 'عذرًا، تعذر تحميل هذا المنتج. حاول مرة أخرى لاحقًا، أو تصفح كتالوجنا الكامل.',
    reviewsKicker: 'آراء العملاء', reviewsTitle: 'تقييمات المنتج',
    reviewsPublishedCount: '{count} تقييم منشور', reviewsVerifiedPurchase: 'شراء موثّق',
    reviewsIncentivized: 'تقييم محفَّز', reviewsLoadMore: 'تحميل المزيد من التقييمات',
    reviewsLoading: 'جارٍ التحميل…', reviewsLoadError: 'تعذر تحميل التقييمات. حاول مرة أخرى.',
    reviewsRatingAria: '{rating} من 5 نجوم'
  },
  pt: {
    home: 'Início', products: 'Produtos', about: 'Sobre nós', contact: 'Contato', news: 'Notícias',
    description: 'Descrição', specifications: 'Especificações', productDetails: 'Detalhes do produto',
    relatedProducts: 'Produtos relacionados', relatedProductsDesc: 'Você também pode se interessar por estes produtos',
    relatedArticles: 'Artigos relacionados', relatedArticlesDesc: 'Mais informações que podem ser úteis',
    productCategories: 'Categorias de produtos', allProducts: 'Todos os produtos', viewMore: 'Ver mais',
    contactUs: 'Fale conosco', getInTouch: 'Entre em contato', address: 'Endereço',
    sendInquiry: 'Enviar consulta', sendEmail: 'Enviar e-mail', inquiry: 'Consulta',
    name: 'Nome', email: 'E-mail', phone: 'Telefone', message: 'Mensagem',
    submit: 'Enviar', cancel: 'Cancelar', required: 'Obrigatório', company: 'Empresa', country: 'País',
    featured: 'Destaque', viewAllProducts: 'Ver todos os produtos', productsCount: 'Produtos',
    categories: 'Categorias', latestNews: 'Últimas notícias', contactInfo: 'Informações de contato',
    homeFaq: 'Perguntas frequentes',
    productLoadError: 'Desculpe, não foi possível carregar este produto. Tente novamente mais tarde ou veja todo o nosso catálogo.',
    reviewsKicker: 'Avaliações de clientes', reviewsTitle: 'Avaliações do produto',
    reviewsPublishedCount: '{count} avaliações publicadas', reviewsVerifiedPurchase: 'Compra verificada',
    reviewsIncentivized: 'Avaliação incentivada', reviewsLoadMore: 'Carregar mais avaliações',
    reviewsLoading: 'Carregando…', reviewsLoadError: 'Não foi possível carregar as avaliações. Tente novamente.',
    reviewsRatingAria: '{rating} de 5 estrelas'
  },
  tr: {
    home: 'Ana Sayfa', products: 'Ürünler', about: 'Hakkımızda', contact: 'İletişim', news: 'Haberler',
    description: 'Açıklama', specifications: 'Özellikler', productDetails: 'Ürün Detayları',
    relatedProducts: 'İlgili Ürünler', relatedProductsDesc: 'Bu ürünler de ilginizi çekebilir',
    relatedArticles: 'İlgili Makaleler', relatedArticlesDesc: 'İşinize yarayabilecek daha fazla bilgi',
    productCategories: 'Ürün Kategorileri', allProducts: 'Tüm Ürünler', viewMore: 'Daha Fazla',
    contactUs: 'Bize Ulaşın', getInTouch: 'İletişime Geçin', address: 'Adres',
    sendInquiry: 'Talep Gönder', sendEmail: 'E-posta Gönder', inquiry: 'Talep',
    name: 'Ad', email: 'E-posta', phone: 'Telefon', message: 'Mesaj',
    submit: 'Gönder', cancel: 'İptal', required: 'Zorunlu', company: 'Şirket', country: 'Ülke',
    featured: 'Öne Çıkan', viewAllProducts: 'Tüm Ürünleri Gör', productsCount: 'Ürün',
    categories: 'Kategoriler', latestNews: 'Son Haberler', contactInfo: 'İletişim Bilgileri',
    homeFaq: 'Sıkça Sorulan Sorular',
    productLoadError: 'Üzgünüz, bu ürün yüklenemedi. Daha sonra tekrar deneyin veya tüm kataloğumuza göz atın.',
    reviewsKicker: 'Müşteri yorumları', reviewsTitle: 'Ürün Yorumları',
    reviewsPublishedCount: '{count} yayınlanmış yorum', reviewsVerifiedPurchase: 'Doğrulanmış alışveriş',
    reviewsIncentivized: 'Teşvikli yorum', reviewsLoadMore: 'Daha fazla yorum yükle',
    reviewsLoading: 'Yükleniyor…', reviewsLoadError: 'Yorumlar yüklenemedi. Lütfen tekrar deneyin.',
    reviewsRatingAria: '5 yıldız üzerinden {rating}'
  },
  hi: {
    home: 'होम', products: 'उत्पाद', about: 'हमारे बारे में', contact: 'संपर्क करें', news: 'समाचार',
    description: 'विवरण', specifications: 'विशिष्टियाँ', productDetails: 'उत्पाद विवरण',
    relatedProducts: 'संबंधित उत्पाद', relatedProductsDesc: 'आपको ये उत्पाद भी रुचिकर हो सकते हैं',
    relatedArticles: 'संबंधित लेख', relatedArticlesDesc: 'आपके लिए उपयोगी अधिक जानकारी',
    productCategories: 'उत्पाद श्रेणियाँ', allProducts: 'सभी उत्पाद', viewMore: 'और देखें',
    contactUs: 'हमसे संपर्क करें', getInTouch: 'संपर्क करें', address: 'पता',
    sendInquiry: 'पूछताछ भेजें', sendEmail: 'ईमेल भेजें', inquiry: 'पूछताछ',
    name: 'नाम', email: 'ईमेल', phone: 'फ़ोन', message: 'संदेश',
    submit: 'भेजें', cancel: 'रद्द करें', required: 'आवश्यक', company: 'कंपनी', country: 'देश',
    featured: 'विशेष', viewAllProducts: 'सभी उत्पाद देखें', productsCount: 'उत्पाद',
    categories: 'श्रेणियाँ', latestNews: 'नवीनतम समाचार', contactInfo: 'संपर्क जानकारी',
    homeFaq: 'अक्सर पूछे जाने वाले प्रश्न',
    productLoadError: 'क्षमा करें, यह उत्पाद लोड नहीं हो सका। कृपया बाद में पुनः प्रयास करें, या हमारा पूरा कैटलॉग देखें।',
    reviewsKicker: 'ग्राहक प्रतिक्रिया', reviewsTitle: 'उत्पाद समीक्षाएँ',
    reviewsPublishedCount: '{count} प्रकाशित समीक्षाएँ', reviewsVerifiedPurchase: 'सत्यापित खरीद',
    reviewsIncentivized: 'प्रोत्साहित समीक्षा', reviewsLoadMore: 'और समीक्षाएँ लोड करें',
    reviewsLoading: 'लोड हो रहा है…', reviewsLoadError: 'समीक्षाएँ लोड नहीं हो सकीं। कृपया पुनः प्रयास करें।',
    reviewsRatingAria: '5 में से {rating} स्टार'
  },
  th: {
    home: 'หน้าแรก', products: 'สินค้า', about: 'เกี่ยวกับเรา', contact: 'ติดต่อเรา', news: 'ข่าวสาร',
    description: 'คำอธิบาย', specifications: 'ข้อกำหนด', productDetails: 'รายละเอียดสินค้า',
    relatedProducts: 'สินค้าที่เกี่ยวข้อง', relatedProductsDesc: 'คุณอาจสนใจสินค้าเหล่านี้',
    relatedArticles: 'บทความที่เกี่ยวข้อง', relatedArticlesDesc: 'ข้อมูลเพิ่มเติมที่อาจเป็นประโยชน์',
    productCategories: 'หมวดหมู่สินค้า', allProducts: 'สินค้าทั้งหมด', viewMore: 'ดูเพิ่มเติม',
    contactUs: 'ติดต่อเรา', getInTouch: 'ติดต่อเรา', address: 'ที่อยู่',
    sendInquiry: 'ส่งคำถาม', sendEmail: 'ส่งอีเมล', inquiry: 'คำถาม',
    name: 'ชื่อ', email: 'อีเมล', phone: 'โทรศัพท์', message: 'ข้อความ',
    submit: 'ส่ง', cancel: 'ยกเลิก', required: 'จำเป็น', company: 'บริษัท', country: 'ประเทศ',
    featured: 'แนะนำ', viewAllProducts: 'ดูสินค้าทั้งหมด', productsCount: 'สินค้า',
    categories: 'หมวดหมู่', latestNews: 'ข่าวล่าสุด', contactInfo: 'ข้อมูลการติดต่อ',
    homeFaq: 'คำถามที่พบบ่อย',
    productLoadError: 'ขออภัย โหลดสินค้านี้ไม่สำเร็จ โปรดลองอีกครั้งภายหลัง หรือดูแคตตาล็อกทั้งหมดของเรา',
    reviewsKicker: 'ความคิดเห็นจากลูกค้า', reviewsTitle: 'รีวิวสินค้า',
    reviewsPublishedCount: '{count} รีวิวที่เผยแพร่', reviewsVerifiedPurchase: 'ซื้อแล้วยืนยันแล้ว',
    reviewsIncentivized: 'รีวิวแบบมีสิ่งจูงใจ', reviewsLoadMore: 'โหลดรีวิวเพิ่มเติม',
    reviewsLoading: 'กำลังโหลด…', reviewsLoadError: 'โหลดรีวิวไม่สำเร็จ โปรดลองอีกครั้ง',
    reviewsRatingAria: '{rating} จาก 5 ดาว'
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

const RTL_LANGS = new Set(['ar', 'fa', 'he', 'ur'])

export function useLang() {
  const setLang = async (newLang, fromRouter = false) => {
    _fromRouter = fromRouter
    lang.value = newLang
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.setAttribute('lang', newLang === 'zh' ? 'zh-CN' : newLang)
      document.documentElement.setAttribute('dir', RTL_LANGS.has(newLang) ? 'rtl' : 'ltr')
    }
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
