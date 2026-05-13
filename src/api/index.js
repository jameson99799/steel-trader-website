const BASE_URL = '/api'

const getToken = () => localStorage.getItem('token')

// ─── Cache layer ──────────────────────────────────────────────────────────────
// Public GET endpoints that are safe to cache (non-admin, read-only)
const CACHEABLE = ['/company', '/hero', '/pagetexts', '/categories', '/categories/tree',
  '/languages/active', '/translation/multilingual-status']
const CACHE_TTL = 5 * 60 * 1000  // 5 minutes

function cacheKey(url) { return `_api_cache_${url}` }

// Get current non-English lang for API requests
function getLangParam() {
  const lang = localStorage.getItem('lang')
  return (lang && lang !== 'en') ? lang : ''
}

function appendLang(url) {
  const lang = getLangParam()
  if (!lang) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}lang=${lang}`
}

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

// ─── In-flight request dedup ──────────────────────────────────────────────────
// Prevents the same API call from firing multiple times simultaneously
const inflightRequests = new Map()

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

  const response = await fetch(`${BASE_URL}${url}`, { ...options, headers, signal: options.signal })

  // Auto-redirect to login on 401 (expired/invalid token)
  if (response.status === 401) {
    // Only auto-redirect for admin API calls, not public ones
    const isAdminPage = window.location.pathname.startsWith('/admin')
    if (isAdminPage) {
      localStorage.removeItem('token')
      window.location.href = '/admin/login'
      throw new Error('登录已过期，请重新登录')
    }
  }


  // Parse response — handle HTML error pages gracefully
  let data
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    data = await response.json()
  } else {
    const text = await response.text()
    try {
      data = JSON.parse(text)
    } catch {
      // Server returned non-JSON (HTML error page from nginx, etc.)
      throw new Error(`服务器错误 (${response.status}): ${response.status === 524 ? '翻译超时 (524)：内容过长，AI处理超过了服务器限制，已自动跳过' : response.status === 504 ? '翻译超时，内容可能过长。请稍后重试或减少翻译范围' : response.status === 502 ? '后端服务暂时不可用，请稍后重试' : '服务器返回了非JSON响应，请检查后端服务是否正常运行'}`)
    }
  }

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
  const fullUrl = appendLang(url)

  // Dedup: if this exact request is already in-flight, reuse it
  if (inflightRequests.has(fullUrl)) {
    return inflightRequests.get(fullUrl)
  }

  const cached = readCache(fullUrl)
  if (cached) {
    // Return cached data immediately, refresh in background
    request(fullUrl).then(fresh => writeCache(fullUrl, fresh)).catch(() => { })
    return cached
  }
  // No cache: fetch and cache
  const data = await request(fullUrl)
  writeCache(fullUrl, data)
  return data
}

// ─── API methods ──────────────────────────────────────────────────────────────
export const api = {
  // Base request (for custom endpoints)
  request,
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
    const lang = getLangParam()
    if (lang) params.lang = lang
    const query = new URLSearchParams(params).toString()
    return request(`/products${query ? `?${query}` : ''}`)
  },
  getProduct: (id) => request(appendLang(`/products/${id}`)),
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
    const lang = getLangParam()
    if (lang) params.lang = lang
    const query = new URLSearchParams(params).toString()
    return request(`/news${query ? `?${query}` : ''}`)
  },
  getNewsItem: (slug) => request(appendLang(`/news/${slug}`)),
  createNews: (data) => request('/news', { method: 'POST', body: data }),
  updateNews: (id, data) => request(`/news/${id}`, { method: 'PUT', body: data }),
  deleteNews: (id) => request(`/news/${id}`, { method: 'DELETE' }),

  // News Categories
  getNewsCategories: () => request('/news-categories'),
  createNewsCategory: (data) => request('/news-categories', { method: 'POST', body: JSON.stringify(data) }),
  updateNewsCategory: (id, data) => request(`/news-categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNewsCategory: (id, moveToId) => request(`/news-categories/${id}${moveToId ? `?move_to=${moveToId}` : ''}`, { method: 'DELETE' }),
  moveArticles: (article_ids, category_id) => request('/news-categories/move', { method: 'POST', body: JSON.stringify({ article_ids, category_id }) }),

  // RAL Color Chart
  getRalColors: () => {
    const lang = getLangParam() || 'en'
    return request(`/ral-colors?lang=${lang}`)
  },

  // SEO
  getSeoSettings: () => request('/seo'),
  updateSeoSettings: (data) => request('/seo', { method: 'PUT', body: data }),
  seoAudit: () => request('/seo/audit'),

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
  getTranslationItems: (page) => request('/translation/items', { method: 'POST', body: JSON.stringify({ page }) }),
  runTranslationOne: (lang, content_type, content_id, signal) => request('/translation/run-one', { method: 'POST', body: JSON.stringify({ lang, content_type, content_id }), signal }),
  runTranslationBulk: (lang, items) => request('/translation/run-bulk', { method: 'POST', body: JSON.stringify({ lang, items }) }),
  getTranslationProgress: (lang) => request(`/translation/progress/${lang}`),
  searchUntranslated: (lang, q = '', page = 'all') => request(`/translation/search-untranslated/${lang}?q=${encodeURIComponent(q)}&page=${page}`),
  searchTranslations: (lang, q = '', page = 'all') => request(`/translation/search-translations/${lang}?q=${encodeURIComponent(q)}&page=${page}`),
  replaceTranslation: (id, find_text, replace_text) => request('/translation/replace-translation', { method: 'POST', body: JSON.stringify({ id, find_text, replace_text }) }),
  batchReplace: (lang, find_text, replace_text, content_type = 'all') => request('/translation/batch-replace', { method: 'POST', body: JSON.stringify({ lang, find_text, replace_text, content_type }) }),
  saveTranslationOverride: (data) => {
    // Clear all translation caches when a manual override is saved
    Object.keys(localStorage).filter(k => k.startsWith('_api_cache_')).forEach(k => localStorage.removeItem(k))
    return request('/translation/override', { method: 'POST', body: JSON.stringify(data) })
  },
  getTranslations: (lang) => request(`/translation/${lang}`),

  getItemTranslationStatus: (type, id) => request(`/translation/status/${type}/${id}`),
  getTranslationContent: (lang) => request(`/translation/content/${lang}`),
  getTranslationConcurrency: () => request('/translation/concurrency'),
  setTranslationConcurrency: (c) => request('/translation/concurrency', { method: 'PUT', body: JSON.stringify({ concurrency: c }) }),
  getTranslationStatus: (type) => request(`/translation/translation-status?type=${type}`),
  runSelectiveTranslation: (type, ids, languages) => request('/translation/run-selective', { method: 'POST', body: JSON.stringify({ type, ids, languages }) }),
  auditTranslations: () => request('/translation/audit-translations'),

  // Translation Prompts
  getTranslationPrompts: () => request('/translation/prompts'),
  createTranslationPrompt: (data) => request('/translation/prompts', { method: 'POST', body: JSON.stringify(data) }),
  updateTranslationPrompt: (id, data) => request(`/translation/prompts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTranslationPrompt: (id) => request(`/translation/prompts/${id}`, { method: 'DELETE' }),
  setTranslationPromptDefault: (id) => request(`/translation/prompts/${id}/default`, { method: 'PUT' }),

  // Translation Jobs (background server-side)
  getTranslationJobs: () => request('/translation-jobs'),
  getActiveTranslationJob: () => request('/translation-jobs/active'),
  getTranslationJob: (id) => request(`/translation-jobs/${id}`),
  getTranslationJobLogsSince: (id, logId) => request(`/translation-jobs/${id}/logs-since/${logId}`),
  createTranslationJob: (data) => request('/translation-jobs', { method: 'POST', body: JSON.stringify(data) }),
  abortTranslationJob: (id) => request(`/translation-jobs/${id}/abort`, { method: 'POST' }),
  pauseTranslationJob: (id) => request(`/translation-jobs/${id}/pause`, { method: 'POST' }),
  resumeTranslationJob: (id) => request(`/translation-jobs/${id}/resume`, { method: 'POST' }),
  retryFailedTranslationJob: (id) => request(`/translation-jobs/${id}/retry-failed`, { method: 'POST' }),
  clearTranslationJobLogs: () => request('/translation-jobs/logs', { method: 'DELETE' }),

  // AI Channels
  getAIChannels: () => request('/ai/channels'),
  createAIChannel: (data) => request('/ai/channels', { method: 'POST', body: JSON.stringify(data) }),
  updateAIChannel: (id, data) => request(`/ai/channels/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAIChannel: (id) => request(`/ai/channels/${id}`, { method: 'DELETE' }),
  getAIModels: (id) => request(`/ai/channels/${id}/models`),
  testAIChannel: (id) => request(`/ai/channels/${id}/test`, { method: 'POST' }),
  setAIDefaultChannel: (id) => request(`/ai/channels/${id}/set-default`, { method: 'PUT' }),
  setAIImageDefaultChannel: (id) => request(`/ai/channels/${id}/set-image-default`, { method: 'PUT' }),
  generateProduct: (data) => request('/ai/generate-product', { method: 'POST', body: JSON.stringify(data) }),

  // Roofing Profiles
  getRoofingProfilesPublic: () => cachedGet('/roofing-profiles/public'),
  getRoofingCategoriesPublic: () => cachedGet('/roofing-profiles/categories/public'),
  getRalColors: () => cachedGet('/ral-colors')
}

export default api
