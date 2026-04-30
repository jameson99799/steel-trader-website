import { createRouter, createWebHistory } from 'vue-router'
import { useLang } from '../composables/useLang'

const publicRoutes = [
  { path: '', name: 'Home', component: () => import('../views/Home.vue') },
  { path: 'products', name: 'Products', component: () => import('../views/Products.vue') },
  { path: 'products/:slug', name: 'ProductDetail', component: () => import('../views/ProductDetail.vue') },
  { path: 'news', name: 'News', component: () => import('../views/News.vue') },
  { path: 'news/category/:catSlug', name: 'NewsCategory', component: () => import('../views/News.vue') },
  { path: 'news/:slug', name: 'NewsDetail', component: () => import('../views/NewsDetail.vue') },
  { path: 'about', name: 'About', component: () => import('../views/About.vue') },
  { path: 'contact', name: 'Contact', component: () => import('../views/Contact.vue') },
  { path: 'ral-colors', name: 'RalColors', component: () => import('../views/RalColors.vue') }
]

const routes = [
  // All public routes require language prefix: /en/products, /es/about, /zh/news, etc.
  {
    path: '/:lang([a-z]{2})',
    component: () => import('../views/Layout.vue'),
    children: publicRoutes
  },
  // Root redirects to /en/ (default language)
  {
    path: '/',
    redirect: () => {
      const saved = localStorage.getItem('lang')
      return `/${saved && /^[a-z]{2}$/.test(saved) ? saved : 'en'}`
    }
  },
  // Legacy paths without lang prefix → redirect to /en/path
  { path: '/products/:slug?', redirect: to => `/en/products${to.params.slug ? '/' + to.params.slug : ''}` },
  { path: '/news/category/:catSlug', redirect: to => `/en/news/category/${to.params.catSlug}` },
  { path: '/news/:slug?', redirect: to => `/en/news${to.params.slug ? '/' + to.params.slug : ''}` },
  { path: '/about', redirect: '/en/about' },
  { path: '/contact', redirect: '/en/contact' },
  { path: '/ral-colors', redirect: '/en/ral-colors' },
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: () => import('../views/admin/Login.vue')
  },
  {
    path: '/admin',
    component: () => import('../views/admin/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      { path: 'dashboard', name: 'Dashboard', component: () => import('../views/admin/Dashboard.vue') },
      { path: 'hero', name: 'AdminHero', component: () => import('../views/admin/Hero.vue') },
      { path: 'categories', name: 'AdminCategories', component: () => import('../views/admin/Categories.vue') },
      { path: 'products', name: 'AdminProducts', component: () => import('../views/admin/Products.vue') },
      { path: 'inquiries', name: 'AdminInquiries', component: () => import('../views/admin/Inquiries.vue') },
      { path: 'company', name: 'AdminCompany', component: () => import('../views/admin/Company.vue') },
      { path: 'pagetexts', name: 'AdminPageTexts', component: () => import('../views/admin/PageTexts.vue') },
      { path: 'news', name: 'AdminNews', component: () => import('../views/admin/News.vue') },
      { path: 'seo', name: 'AdminSeo', component: () => import('../views/admin/Seo.vue') },
      { path: 'languages', name: 'AdminLanguages', component: () => import('../views/admin/Languages.vue') },
      { path: 'translations', name: 'AdminTranslations', component: () => import('../views/admin/Translations.vue') },
      { path: 'email', name: 'AdminEmail', component: () => import('../views/admin/Email.vue') },
      { path: 'google-index', name: 'AdminGoogleIndex', component: () => import('../views/admin/GoogleIndex.vue') },
      { path: 'settings', name: 'AdminSettings', component: () => import('../views/admin/Settings.vue') },
      { path: 'products/ai/:id', name: 'ProductAI', component: () => import('../views/admin/ProductAI.vue') },
      { path: 'ai-settings', name: 'AdminAISettings', component: () => import('../views/admin/AISettings.vue') },
      { path: 'mailer', name: 'AdminMailer', component: () => import('../views/admin/Mailer.vue') },
      { path: 'media', name: 'AdminMedia', component: () => import('../views/admin/MediaLibrary.vue') }
    ]
  },
  // ─── CRM Routes (Admin) ────────────────────────────────────────────────────
  {
    path: '/crm/login',
    name: 'CrmLogin',
    component: () => import('../views/crm/Login.vue')
  },
  {
    path: '/crm',
    component: () => import('../views/crm/Layout.vue'),
    meta: { requiresCrmAuth: true },
    children: [
      { path: '', name: 'CrmDashboard', component: () => import('../views/crm/Dashboard.vue') },
      { path: 'customers', name: 'CrmCustomers', component: () => import('../views/crm/Customers.vue') },
      { path: 'customer/:id', name: 'CrmCustomerDetail', component: () => import('../views/crm/CustomerDetail.vue') },
      { path: 'sea-pool', name: 'CrmSeaPool', component: () => import('../views/crm/SeaPool.vue') },
      { path: 'mailer', name: 'CrmMailer', component: () => import('../views/crm/Mailer.vue') },
      { path: 'users', name: 'CrmUsers', component: () => import('../views/crm/Users.vue') }
    ]
  },
  // ─── CRM Routes (Sub-account) ─────────────────────────────────────────────
  {
    path: '/crm/sub/login',
    name: 'CrmSubLogin',
    component: () => import('../views/crm/Login.vue')
  },
  {
    path: '/crm/sub',
    component: () => import('../views/crm/Layout.vue'),
    meta: { requiresCrmAuth: true },
    children: [
      { path: '', name: 'CrmSubDashboard', component: () => import('../views/crm/Dashboard.vue') },
      { path: 'customers', name: 'CrmSubCustomers', component: () => import('../views/crm/Customers.vue') },
      { path: 'customer/:id', name: 'CrmSubCustomerDetail', component: () => import('../views/crm/CustomerDetail.vue') },
      { path: 'sea-pool', name: 'CrmSubSeaPool', component: () => import('../views/crm/SeaPool.vue') },
      { path: 'mailer', name: 'CrmSubMailer', component: () => import('../views/crm/Mailer.vue') },
      { path: 'users', name: 'CrmSubUsers', component: () => import('../views/crm/Users.vue') }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.beforeEach((to, from, next) => {
  // Handle language from URL prefix
  const langParam = to.params.lang
  if (langParam && /^[a-z]{2}$/.test(langParam)) {
    const { setLang } = useLang()
    setLang(langParam, true)  // true = fromRouter, don't trigger URL change
  }

  // Auth check for admin routes
  if (to.matched.some(record => record.meta.requiresAuth)) {
    const token = localStorage.getItem('token')
    if (!token) {
      next('/admin/login')
    } else {
      next()
    }
  } else if (to.matched.some(record => record.meta.requiresCrmAuth)) {
    // Path-aware CRM token check
    const isSub = to.path.startsWith('/crm/sub')
    const tokenKey = isSub ? 'crm_sub_token' : 'crm_admin_token'
    const crmToken = localStorage.getItem(tokenKey)
    if (!crmToken) {
      next(isSub ? '/crm/sub/login' : '/crm/login')
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router

