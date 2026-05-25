import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

// 全局拦截图片右键菜单
document.addEventListener('contextmenu', function(e) {
  if (e.target && e.target.tagName === 'IMG') {
    e.preventDefault()
  }
})
