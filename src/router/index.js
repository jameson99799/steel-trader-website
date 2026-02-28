import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    children: [
      { path: '', name: 'Home', component: () => import('../views/Home.vue') },
      { path: 'products', name: 'Products', component: () => import('../views/Products.vue') },
      { path: 'products/:id', name: 'ProductDetail', component: () => import('../views/ProductDetail.vue') },
      { path: 'news', name: 'News', component: () => import('../views/News.vue') },
      { path: 'news/:slug', name: 'NewsDetail', component: () => import('../views/NewsDetail.vue') },
      { path: 'about', name: 'About', component: () => import('../views/About.vue') },
      { path: 'contact', name: 'Contact', component: () => import('../views/Contact.vue') }
    ]
  },
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
      { path: 'settings', name: 'AdminSettings', component: () => import('../views/admin/Settings.vue') }
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
  if (to.matched.some(record => record.meta.requiresAuth)) {
    const token = localStorage.getItem('token')
    if (!token) {
      next('/admin/login')
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
