<template>
  <MailerPage />
</template>

<script setup>
/**
 * CRM Mailer Wrapper
 * Patches the global api.request to route /mailer/* calls through CRM auth
 * so the shared Mailer.vue component works with CRM tokens.
 */
import { onMounted, onUnmounted } from 'vue'
import MailerPage from '../admin/Mailer.vue'
import api from '../../api'

const CRM_PREFIX = '/crm'
let _origRequest = null

onMounted(() => {
  // Monkey-patch api.request to intercept /mailer/* calls for CRM auth
  _origRequest = api.request.bind(api)
  api.request = async (url, options = {}) => {
    if (url.startsWith('/mailer')) {
      const crmToken = localStorage.getItem('crm_token')
      const headers = { ...(options.headers || {}) }
      if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json'
      }
      if (crmToken) {
        headers['x-crm-token'] = crmToken
      }
      const response = await fetch(`/api${CRM_PREFIX}${url}`, { ...options, headers })
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
    // Non-mailer calls pass through normally
    return _origRequest(url, options)
  }
})

onUnmounted(() => {
  // Restore original request function  
  if (_origRequest) api.request = _origRequest
})
</script>
