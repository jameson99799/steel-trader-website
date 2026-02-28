const BASE_URL = '/api'

const getToken = () => localStorage.getItem('token')

const request = async (url, options = {}) => {
  const headers = {
    ...options.headers
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || '请求失败')
  }

  return data
}

export const api = {
  // Auth
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  changePassword: (data) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),

  // Categories
  getCategories: () => request('/categories'),
  getCategoryTree: () => request('/categories/tree'),
  createCategory: (data) => request('/categories', { method: 'POST', body: data }),
  updateCategory: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: data }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  // Products
  getProducts: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/products${query ? `?${query}` : ''}`)
  },
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (data) => request('/products', { method: 'POST', body: data }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: data }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  // Company
  getCompany: () => request('/company'),
  updateCompany: (data) => request('/company', { method: 'PUT', body: data }),

  // Hero
  getHero: () => request('/hero'),
  updateHero: (data) => request('/hero', { method: 'PUT', body: JSON.stringify(data) }),

  // Page Texts
  getPageTexts: () => request('/pagetexts'),
  updatePageTexts: (data) => request('/pagetexts', { method: 'PUT', body: JSON.stringify(data) }),

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

  // Languages
  getLanguages: () => request('/languages'),
  getActiveLanguages: () => request('/languages/active'),
  createLanguage: (data) => request('/languages', { method: 'POST', body: JSON.stringify(data) }),
  updateLanguage: (id, data) => request(`/languages/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLanguage: (id) => request(`/languages/${id}`, { method: 'DELETE' }),

  // Translation
  getTranslationSettings: () => request('/translation/settings'),
  saveTranslationSettings: (data) => request('/translation/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getMultilingualStatus: () => request('/translation/multilingual-status'),
  fetchAIModels: (data) => request('/translation/models', { method: 'POST', body: JSON.stringify(data) }),
  runTranslation: (lang) => request(`/translation/run/${lang}`, { method: 'POST' }),
  runTranslationPage: (lang, page) => request('/translation/run', { method: 'POST', body: JSON.stringify({ lang, page }) }),
  getTranslationProgress: (lang) => request(`/translation/progress/${lang}`),
  searchUntranslated: (lang, q = '', page = 'all') => request(`/translation/search-untranslated/${lang}?q=${encodeURIComponent(q)}&page=${page}`),
  saveTranslationOverride: (data) => request('/translation/override', { method: 'POST', body: JSON.stringify(data) }),
  getTranslations: (lang) => request(`/translation/${lang}`)
}

export default api
