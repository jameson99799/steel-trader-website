// CRM API module
const CRM_TOKEN_KEY = 'crm_token'

function getToken() {
  return localStorage.getItem(CRM_TOKEN_KEY)
}

async function request(url, options = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`/api/crm${url}`, { ...options, headers })
  if (res.status === 401) {
    localStorage.removeItem(CRM_TOKEN_KEY)
    window.location.href = '/crm/login'
    throw new Error('登录已过期')
  }
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '请求失败')
  return data
}

export default {
  // Auth
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),
  changePassword: (data) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),

  // Token management
  setToken(token) { localStorage.setItem(CRM_TOKEN_KEY, token) },
  getToken,
  clearToken() { localStorage.removeItem(CRM_TOKEN_KEY) },
  isLoggedIn() { return !!getToken() },

  // CRM Users (admin)
  getUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  // Customers
  getCustomers: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/customers?${qs}`)
  },
  getCustomer: (id) => request(`/customers/${id}`),
  createCustomer: (data) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id, data) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id) => request(`/customers/${id}`, { method: 'DELETE' }),

  // Stats
  getStats: () => request('/customers/stats/overview'),

  // Sea Pool
  getSeaPool: () => request('/customers/pool/sea'),
  claimCustomer: (id) => request(`/customers/pool/claim/${id}`, { method: 'POST' }),

  // Settings
  getSettings: () => request('/customers/settings/crm'),
  updateSettings: (data) => request('/customers/settings/crm', { method: 'PUT', body: JSON.stringify(data) }),

  // Global search
  globalSearch: (params) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/customers/search/global?${qs}`)
  },

  // Inquiries
  getInquiries: (customerId) => request(`/customers/${customerId}/inquiries`),
  createInquiry: (customerId, data) => request(`/customers/${customerId}/inquiries`, { method: 'POST', body: JSON.stringify(data) }),
  updateInquiry: (id, data) => request(`/customers/inquiries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInquiry: (id) => request(`/customers/inquiries/${id}`, { method: 'DELETE' }),

  // Quotations
  getQuotations: (customerId) => request(`/customers/${customerId}/quotations`),
  createQuotation: (customerId, data) => request(`/customers/${customerId}/quotations`, { method: 'POST', body: JSON.stringify(data) }),
  updateQuotation: (id, data) => request(`/customers/quotations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuotation: (id) => request(`/customers/quotations/${id}`, { method: 'DELETE' }),

  // Followups
  getFollowups: (customerId) => request(`/customers/${customerId}/followups`),
  createFollowup: (customerId, data) => request(`/customers/${customerId}/followups`, { method: 'POST', body: JSON.stringify(data) }),
  updateFollowup: (id, data) => request(`/customers/followups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFollowup: (id) => request(`/customers/followups/${id}`, { method: 'DELETE' }),

  // Upload (reuse existing upload endpoint)
  upload: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const token = getToken()
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData
    })
    if (!res.ok) throw new Error('上传失败')
    return res.json()
  }
}
