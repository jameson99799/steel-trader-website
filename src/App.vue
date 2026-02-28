<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useLang } from './composables/useLang'
import api from './api'

const { initLang, localizedValue } = useLang()

const updateFavicon = (faviconUrl) => {
  // 移除现有的 favicon
  const existingFavicon = document.querySelector('link[rel="icon"]')
  if (existingFavicon) {
    existingFavicon.remove()
  }
  
  // 添加新的 favicon
  const link = document.createElement('link')
  link.rel = 'icon'
  link.type = 'image/x-icon'
  link.href = faviconUrl
  document.head.appendChild(link)
}

onMounted(async () => {
  initLang()
  try {
    const company = await api.getCompany()
    if (company) {
      // 设置网站标题
      document.title = localizedValue(company, 'name') || 'LED Trade'
      
      // 设置网站图标
      if (company.favicon) {
        updateFavicon(company.favicon)
      }
    }
  } catch (e) {}
})
</script>
