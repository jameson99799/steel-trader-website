import { createRouter, createWebHistory } from 'vue-router'
import { useLang } from '../composables/useLang'

import Home from '../views/Home.vue'
import Layout from '../views/Layout.vue'
import Products from '../views/Products.vue'
import ProductDetail from '../views/ProductDetail.vue'
import News from '../views/News.vue'
import NewsDetail from '../views/NewsDetail.vue'
import About from '../views/About.vue'
import Contact from '../views/Contact.vue'
import Factory from '../views/Factory.vue'

const publicRoutes = [
  { path: '', name: 'Home', component: Home },
  { path: 'products', name: 'Products', component: Products },
  { path: 'products/category/:catSlug', name: 'ProductsCategory', component: Products },
  { path: 'products/:slug', name: 'ProductDetail', component: ProductDetail },
  { path: 'news', name: 'News', component: News },
  { path: 'news/category/:catSlug', name: 'NewsCategory', component: News },
  { path: 'news/ral-colors', name: 'NewsRalColors', component: News },
  { path: 'news/roofing-profiles', name: 'NewsRoofingProfiles', component: News },
  { path: 'news/futures-price', name: 'NewsFuturesPrice', component: News },
  { path: 'news/ship-tracker', name: 'NewsShipTracker', component: News },
  { path: 'news/:slug', name: 'NewsDetail', component: NewsDetail },
  { path: 'about', name: 'About', component: About },
  { path: 'contact', name: 'Contact', component: Contact },
  { path: 'factory', name: 'Factory', component: Factory },
  { path: 'ral-colors', name: 'RalColors', redirect: to => `/${to.params.lang || 'en'}/news/ral-colors` },
  { path: 'roofing-profiles', name: 'RoofingProfiles', redirect: to => `/${to.params.lang || 'en'}/news/roofing-profiles` },
  { path: ':pathMatch(.*)*', name: 'NotFound', component: () => import('../views/NotFound.vue') }
]

const routes = [
  // All public routes require language prefix: /en/products, /es/about, /zh/news, etc.
  {
    path: '/:lang([a-z]{2})',
    component: Layout,
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
  { path: '/products/category/:catSlug', redirect: to => `/en/products/category/${to.params.catSlug}` },
  { path: '/products/:slug?', redirect: to => `/en/products${to.params.slug ? '/' + to.params.slug : ''}` },
  { path: '/news/category/:catSlug', redirect: to => `/en/news/category/${to.params.catSlug}` },
  { path: '/news/:slug?', redirect: to => `/en/news${to.params.slug ? '/' + to.params.slug : ''}` },
  { path: '/about', redirect: '/en/about' },
  { path: '/contact', redirect: '/en/contact' },
  { path: '/factory', redirect: '/en/factory' },
  { path: '/ral-colors', redirect: '/en/news/ral-colors' },
  { path: '/roofing-profiles', redirect: '/en/news/roofing-profiles' },
  { path: '/:pathMatch(.*)*', component: () => import('../views/NotFound.vue') },
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: () => import('../views/admin/Login.vue')
  },
  {
    path: '/admin/mobile-chat',
    name: 'AdminMobileChat',
    component: () => import('../views/admin/MobileChat.vue'),
    meta: { requiresAuth: true }
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
      { path: 'reviews', name: 'AdminReviews', component: () => import('../views/admin/Reviews.vue') },
      { path: 'inquiries', name: 'AdminInquiries', component: () => import('../views/admin/Inquiries.vue') },
      { path: 'company', name: 'AdminCompany', component: () => import('../views/admin/Company.vue') },
      { path: 'factory', name: 'AdminFactory', component: () => import('../views/admin/Factory.vue') },
      { path: 'pagetexts', name: 'AdminPageTexts', component: () => import('../views/admin/PageTexts.vue') },
      { path: 'roofing-profiles', name: 'AdminRoofingProfiles', component: () => import('../views/admin/RoofingProfiles.vue') },
      { path: 'news', name: 'AdminNews', component: () => import('../views/admin/News.vue') },
      { path: 'seo', name: 'AdminSeo', component: () => import('../views/admin/Seo.vue') },
      { path: 'languages', name: 'AdminLanguages', component: () => import('../views/admin/Languages.vue') },
      { path: 'translations', name: 'AdminTranslations', component: () => import('../views/admin/Translations.vue') },
      { path: 'email', name: 'AdminEmail', component: () => import('../views/admin/Email.vue') },
      { path: 'google-index', name: 'AdminGoogleIndex', component: () => import('../views/admin/GoogleIndex.vue') },
      { path: 'settings', name: 'AdminSettings', component: () => import('../views/admin/Settings.vue') },
      { path: 'products/ai/:id', name: 'ProductAI', component: () => import('../views/admin/ProductAI.vue') },
      { path: 'mailer', name: 'AdminMailer', component: () => import('../views/admin/Mailer.vue') },
      { path: 'chat', name: 'AdminChat', component: () => import('../views/admin/ChatSettings.vue') },
      { path: 'media', name: 'AdminMedia', component: () => import('../views/admin/MediaLibrary.vue') },
      { path: 'futures', name: 'AdminFutures', component: () => import('../views/admin/Futures.vue') },
      { path: 'ships', name: 'AdminShips', component: () => import('../views/admin/Ships.vue') }
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
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const id = to.hash.slice(1);
          const el = document.getElementById(id) || document.getElementById(decodeURIComponent(id));
          if (el) {
            resolve({
              el: to.hash,
              top: 90,
              behavior: 'smooth'
            })
          } else {
            resolve({ top: 0 })
          }
        }, 50)
      })
    }
    return new Promise((resolve) => {
      // Delay scrolling until after browser paints to prevent Forced Synchronous Layout
      setTimeout(() => {
        resolve({ top: 0 })
      }, 10) // 10ms is enough to let the rendering pipeline flush
    })
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
      if (to.fullPath && to.fullPath !== '/admin' && to.fullPath !== '/admin/' && to.fullPath !== '/admin/dashboard') {
        next({ path: '/admin/login', query: { redirect: to.fullPath } })
      } else {
        next('/admin/login')
      }
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

router.afterEach((to) => {
  const { t, localizedValue } = useLang()
  const company = window.__INITIAL_STATE__?.company
  const baseTitle = company ? (localizedValue(company, 'name') || 'SunSea Steel') : 'SunSea Steel'
  
  // Update document title for static routes (Detail pages handle their own title)
  const nameMap = {
    'Home': '',
    'Products': t('products'),
    'ProductsCategory': t('products'),
    'News': t('news'),
    'NewsCategory': t('news'),
    'NewsRalColors': t('ralColorChart'),
    'NewsRoofingProfiles': t('roofingTitle'),
    'NewsFuturesPrice': t('futuresTitle'),
    'NewsShipTracker': t('shipTrackTitle'),
    'About': t('aboutUs'),
    'Contact': t('contactUs'),
    'Factory': t('factoryTour'),
    'RalColors': t('ralColorChart'),
    'RoofingProfiles': t('roofingTitle')
  }

  if (to.name in nameMap) {
    const section = nameMap[to.name]
    // If it's home, preserve the SSR title if it's the very first load, 
    // but Vue's afterEach might trigger. Just use baseTitle for home navigation.
    if (!section && to.name === 'Home') {
       // Only overwrite if it's not the initial page load to preserve SSR keyword title
       if (window.__APP_MOUNTED__) {
         document.title = baseTitle
       }
    } else {
      document.title = `${section} | ${baseTitle}`
    }
  }
})

export default router

