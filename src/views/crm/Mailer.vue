<template>
  <MailerPage />
</template>

<script setup>
/**
 * CRM Mailer Wrapper
 * Patches api.request SYNCHRONOUSLY during setup (before child mounts)
 * so that admin/Mailer.vue's onMounted → loadAll() uses CRM auth.
 *
 * Vue lifecycle order: parent setup → child setup → child onMounted → parent onMounted
 * By patching here (parent setup), we ensure the child's loadAll() uses CRM token.
 */
import { onUnmounted } from 'vue'
import MailerPage from '../admin/Mailer.vue'
import api from '../../api'
import crmApi from '../../api/crm'

// ─── Patch api.request SYNCHRONOUSLY (before child mounts) ───────────────────
const _origRequest = api.request.bind(api)
window.__CRM_MAILER = true

api.request = async (url, options = {}) => {
  // Intercept /mailer/* and /email/* calls for CRM auth
  if (url.startsWith('/mailer') || url.startsWith('/email/')) {
    const crmToken = crmApi.getToken()
    const headers = { ...(options.headers || {}) }
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }
    if (crmToken) {
      headers['Authorization'] = `Bearer ${crmToken}`
    }
    // Route both /mailer/* and /email/* through CRM auth path
    const apiPath = `/api/crm${url}`
    const response = await fetch(apiPath, { ...options, headers })
    // Handle 401 redirect to CRM login
    if (response.status === 401) {
      crmApi.clearToken()
      const loginPath = window.location.pathname.startsWith('/crm/sub') ? '/crm/sub/login' : '/crm/login'
      window.location.href = loginPath
      throw new Error('登录已过期')
    }
    const contentType = response.headers.get('content-type') || ''
    let data
    if (contentType.includes('application/json')) {
      data = await response.json()
    } else {
      const text = await response.text()
      try { data = JSON.parse(text) } catch { throw new Error('服务器错误') }
    }
    if (!response.ok) throw new Error(data.error || '请求失败')
    return data
  }
  return _origRequest(url, options)
}

// ─── Cleanup on unmount ──────────────────────────────────────────────────────
onUnmounted(() => {
  window.__CRM_MAILER = false
  api.request = _origRequest
})
</script>
