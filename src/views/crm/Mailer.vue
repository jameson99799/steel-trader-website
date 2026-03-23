<template>
  <MailerPage />
</template>

<script setup>
/**
 * CRM Mailer Wrapper
 * Patches api.request so the shared Mailer.vue uses CRM auth and paths.
 * Also sets window.__CRM_MAILER = true for CRM-specific UI detection.
 */
import { onMounted, onUnmounted } from 'vue'
import MailerPage from '../admin/Mailer.vue'
import api from '../../api'

let _origRequest = null

onMounted(() => {
  window.__CRM_MAILER = true
  _origRequest = api.request.bind(api)
  
  api.request = async (url, options = {}) => {
    // Intercept both /mailer/* and /email/* calls for CRM auth
    if (url.startsWith('/mailer') || url.startsWith('/email/')) {
      const crmToken = localStorage.getItem('crm_token')
      const headers = { ...(options.headers || {}) }
      if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json'
      }
      if (crmToken) {
        headers['x-crm-token'] = crmToken
      }
      // Route /mailer/* through /crm/mailer/*, /email/* stays as /email/*
      const apiPath = url.startsWith('/mailer') ? `/api/crm${url}` : `/api${url}`
      const response = await fetch(apiPath, { ...options, headers })
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
})

onUnmounted(() => {
  window.__CRM_MAILER = false
  if (_origRequest) api.request = _origRequest
})
</script>
