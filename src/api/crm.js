// CRM API module — path-aware token keys
// Admin (/crm/*) uses 'crm_admin_token', Sub-account (/crm/sub/*) uses 'crm_sub_token'

function getTokenKey() {
  return window.location.pathname.startsWith('/crm/sub') ? 'crm_sub_token' : 'crm_admin_token'
}
function getUserKey() {
  return window.location.pathname.startsWith('/crm/sub') ? 'crm_sub_user' : 'crm_admin_user'
}

function getToken() {
  return localStorage.getItem(getTokenKey())
}

async function request(url, options = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`/api/crm${url}`, { ...options, headers })
  if (res.status === 401 && !url.startsWith('/auth/login')) {
    localStorage.removeItem(getTokenKey())
    const loginPath = window.location.pathname.startsWith('/crm/sub') ? '/crm/sub/login' : '/crm/login'
    window.location.href = loginPath
    throw new Error('登录已过期')
  }
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '请求失败')
  return data
}

export default {
  // Base request (for custom endpoints)
  request,
  // Auth - login uses raw fetch to avoid redirect on 401
  login: async (credentials) => {
    const res = await fetch('/api/crm/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '登录失败')
    return data
  },
  getMe: () => request('/auth/me'),
  changePassword: (data) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),

  // Token management
  setToken(token) { localStorage.setItem(getTokenKey(), token) },
  getToken,
  clearToken() { localStorage.removeItem(getTokenKey()) },
  isLoggedIn() { return !!getToken() },
  getTokenKey,
  getUserKey,

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
  moveToPool: (ids) => request('/customers/pool/move', { method: 'POST', body: JSON.stringify({ customer_ids: Array.isArray(ids) ? ids : [ids] }) }),

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

  // Email
  sendEmail: (data) => request('/customers/email/send', { method: 'POST', body: JSON.stringify(data) }),

  // Export
  exportAll: () => request('/customers/export/all'),

  // Email records
  getSendRecords: () => request('/customers/email/records'),

  // ─── CRM Mailer ──────────────────────────────────────
  mailer: {
    getAccounts: () => request('/mailer/accounts'),
    addAccount: (data) => request('/mailer/accounts', { method: 'POST', body: JSON.stringify(data) }),
    updateAccount: (id, data) => request(`/mailer/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteAccount: (id) => request(`/mailer/accounts/${id}`, { method: 'DELETE' }),
    testAccount: (id) => request(`/mailer/accounts/${id}/test`, { method: 'POST' }),
    getTemplates: () => request('/mailer/templates'),
    addTemplate: (data) => request('/mailer/templates', { method: 'POST', body: JSON.stringify(data) }),
    updateTemplate: (id, data) => request(`/mailer/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteTemplate: (id) => request(`/mailer/templates/${id}`, { method: 'DELETE' }),
    send: (data) => request('/mailer/send', { method: 'POST', body: JSON.stringify(data) }),
    getProgress: () => request('/mailer/progress'),
    stopTask: (id) => request(`/mailer/stop/${id}`, { method: 'POST' }),
    getRecords: () => request('/mailer/records'),
    deleteRecord: (id) => request(`/mailer/records/${id}`, { method: 'DELETE' }),
  },

  // Upload — auto-detect image vs file
  upload: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const token = getToken()
    const isImage = file.type?.startsWith('image/')
    const url = isImage ? '/api/upload' : '/api/upload/file'
    const res = await fetch(url, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || '上传失败')
    }
    return res.json()
  }
}
