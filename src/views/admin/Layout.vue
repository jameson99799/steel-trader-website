<template>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <div class="sidebar-header">
        <h2>LED Trade</h2>
      </div>
      <nav class="sidebar-nav">
        <router-link to="/admin/dashboard">📊 控制台</router-link>
        <router-link to="/admin/hero">🏠 首页内容</router-link>
        <router-link to="/admin/categories">📁 分类管理</router-link>
        <router-link to="/admin/products">📦 商品管理</router-link>
        <router-link to="/admin/inquiries">
          📬 询盘管理
          <span v-if="unreadCount" class="badge badge-danger">{{ unreadCount }}</span>
        </router-link>
        <router-link to="/admin/company">🏢 公司信息</router-link>
        <router-link to="/admin/pagetexts">📝 页面文字</router-link>
        <router-link to="/admin/news">📰 新闻管理</router-link>
        <router-link to="/admin/seo">🔍 SEO设置</router-link>
        <router-link to="/admin/languages">🌍 语言管理</router-link>
        <router-link to="/admin/translations">🤖 AI翻译</router-link>
        <router-link to="/admin/settings">⚙️ 系统设置</router-link>
      </nav>
      <div class="sidebar-footer">
        <a href="/" target="_blank">🌐 访问前台</a>
        <a href="#" @click.prevent="handleLogout">🚪 退出登录</a>
      </div>
    </aside>
    <main class="admin-main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../api'

const router = useRouter()
const unreadCount = ref(0)

const loadUnreadCount = async () => {
  try {
    const res = await api.getInquiries()
    unreadCount.value = res.unread_count
  } catch (e) {}
}

const handleLogout = () => {
  localStorage.removeItem('token')
  router.push('/admin/login')
}

onMounted(loadUnreadCount)
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
}

.admin-sidebar {
  width: 240px;
  background: var(--dark);
  color: #fff;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #334155;
}

.sidebar-header h2 {
  font-size: 20px;
}

.sidebar-nav {
  flex: 1;
  padding: 20px 0;
}

.sidebar-nav a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  color: #94a3b8;
  transition: all 0.2s;
}

.sidebar-nav a:hover,
.sidebar-nav a.router-link-active {
  background: #334155;
  color: #fff;
}

.sidebar-footer {
  padding: 20px;
  border-top: 1px solid #334155;
}

.sidebar-footer a {
  display: block;
  padding: 8px 0;
  color: #94a3b8;
  font-size: 14px;
}

.sidebar-footer a:hover {
  color: #fff;
}

.admin-main {
  flex: 1;
  background: var(--light);
  padding: 30px;
  overflow-y: auto;
}

.badge {
  margin-left: auto;
}
</style>
