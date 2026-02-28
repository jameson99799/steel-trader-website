const BASE_URL = '/api'

const getToken = () => localStorage.getItem('token')

// ─── Cache layer ──────────────────────────────────────────────────────────────
// Public GET endpoints that are safe to cache (non-admin, read-only)
const CACHEABLE = ['/company', '/hero', '/pagetexts', '/categories', '/categories/tree',
  '/languages/active', '/translation/multilingual-status']
const CACHE_TTL = 5 * 60 * 1000  // 5 minutes

function cacheKey(url) { return `_api_cache_${url}` }

function readCache(url) {
  try {
    const raw = localStorage.getItem(cacheKey(url))
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts < CACHE_TTL) return data
    localStorage.removeItem(cacheKey(url))
  } catch { }
  return null
}

function writeCache(url, data) {
  try {
    localStorage.setItem(cacheKey(url), JSON.stringify({ data, ts: Date.now() }))
  } catch { }
}

// ─── Base request ─────────────────────────────────────────────────────────────
const request = async (url, options = {}) => {
  const headers = { ...options.headers }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${url}`, { ...options, headers })
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || '请求失败')
  }

  return data
}

/**
 * Cached GET: returns cached data immediately (if available),
 * then fetches fresh data in the background and updates cache.
 * Used for public-facing content endpoints.
 */
async function cachedGet(url) {
  const cached = readCache(url)
  if (cached) {
    // Return cached data immediately, refresh in background
    request(url).then(fresh => writeCache(url, fresh)).catch(() => { })
    return cached
  }
  // No cache: fetch and cache
  const data = await request(url)
  writeCache(url, data)
  return data
}

// ─── API methods ──────────────────────────────────────────────────────────────
export const api = {
  // Auth
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  changePassword: (data) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),

  // Categories
  getCategories: () => cachedGet('/categories'),
  getCategoryTree: () => cachedGet('/categories/tree'),
  createCategory: (data) => request('/categories', { method: 'POST', body: data }),
  updateCategory: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: data }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  // Products (not cached — list changes frequently with filters/search)
  getProducts: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/products${query ? `?${query}` : ''}`)
  },
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (data) => request('/products', { method: 'POST', body: data }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: data }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  // Company — cached (rarely changes)
  getCompany: () => cachedGet('/company'),
  updateCompany: (data) => {
    localStorage.removeItem(cacheKey('/company'))
    return request('/company', { method: 'PUT', body: data })
  },

  // Hero — cached (rarely changes)
  getHero: () => cachedGet('/hero'),
  updateHero: (data) => {
    localStorage.removeItem(cacheKey('/hero'))
    return request('/hero', { method: 'PUT', body: JSON.stringify(data) })
  },

  // Page Texts — cached (rarely changes)
  getPageTexts: () => cachedGet('/pagetexts'),
  updatePageTexts: (data) => {
    localStorage.removeItem(cacheKey('/pagetexts'))
    return request('/pagetexts', { method: 'PUT', body: JSON.stringify(data) })
  },

  // Inquiries
  submitInquiry: (data) => request('/inquiries', { method: 'POST', body: JSON.stringify(data) }),
  getInquiries: () => request('/inquiries'),
  markInquiryRead: (id) => request(`/inquiries/${id}/read`, { method: 'PUT' }),
  deleteInquiry: (id) => request(`/inquiries/${id}`, { method: 'DELETE' }),

  // News
  getNews: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/news${query ? `?${query}` : ''}`)
  },
  getNewsItem: (slug) => request(`/news/${slug}`),
  createNews: (data) => request('/news', { method: 'POST', body: data }),
  updateNews: (id, data) => request(`/news/${id}`, { method: 'PUT', body: data }),
  deleteNews: (id) => request(`/news/${id}`, { method: 'DELETE' }),

  // SEO
  getSeoSettings: () => request('/seo'),
  updateSeoSettings: (data) => request('/seo', { method: 'PUT', body: data }),

  // Upload
  upload: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return request('/upload', { method: 'POST', body: formData })
  },

  // Languages — cached
  getLanguages: () => request('/languages'),
  getActiveLanguages: () => cachedGet('/languages/active'),
  createLanguage: (data) => {
    localStorage.removeItem(cacheKey('/languages/active'))
    return request('/languages', { method: 'POST', body: JSON.stringify(data) })
  },
  updateLanguage: (id, data) => {
    localStorage.removeItem(cacheKey('/languages/active'))
    return request(`/languages/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  },
  deleteLanguage: (id) => {
    localStorage.removeItem(cacheKey('/languages/active'))
    return request(`/languages/${id}`, { method: 'DELETE' })
  },

  // Translation
  getTranslationSettings: () => request('/translation/settings'),
  saveTranslationSettings: (data) => request('/translation/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getMultilingualStatus: () => cachedGet('/translation/multilingual-status'),
  fetchAIModels: (data) => request('/translation/models', { method: 'POST', body: JSON.stringify(data) }),
  runTranslation: (lang) => request(`/translation/run/${lang}`, { method: 'POST' }),
  runTranslationPage: (lang, page) => request('/translation/run', { method: 'POST', body: JSON.stringify({ lang, page }) }),
  getTranslationProgress: (lang) => request(`/translation/progress/${lang}`),
  searchUntranslated: (lang, q = '', page = 'all') => request(`/translation/search-untranslated/${lang}?q=${encodeURIComponent(q)}&page=${page}`),
  saveTranslationOverride: (data) => {
    // Clear all translation caches when a manual override is saved
    Object.keys(localStorage).filter(k => k.startsWith('_api_cache_')).forEach(k => localStorage.removeItem(k))
    return request('/translation/override', { method: 'POST', body: JSON.stringify(data) })
  },
  getTranslations: (lang) => request(`/translation/${lang}`)
}

export default api
