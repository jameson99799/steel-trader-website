<template>
  <div class="crm-layout">
    <aside class="crm-sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <span class="sidebar-logo">📊</span>
        <span v-if="!sidebarCollapsed" class="sidebar-title">SunSea CRM</span>
        <button class="collapse-btn" @click="sidebarCollapsed = !sidebarCollapsed">{{ sidebarCollapsed ? '→' : '←' }}</button>
      </div>
      <nav class="sidebar-nav">
        <router-link to="/crm" class="nav-item" exact-active-class="active">
          <span class="nav-icon">📈</span><span v-if="!sidebarCollapsed" class="nav-label">仪表盘</span>
        </router-link>
        <router-link to="/crm/customers" class="nav-item" active-class="active">
          <span class="nav-icon">👥</span><span v-if="!sidebarCollapsed" class="nav-label">客户管理</span>
        </router-link>
        <router-link to="/crm/sea-pool" class="nav-item" active-class="active">
          <span class="nav-icon">🌊</span><span v-if="!sidebarCollapsed" class="nav-label">公海池</span>
        </router-link>
        <router-link v-if="user?.role === 'admin'" to="/crm/users" class="nav-item" active-class="active">
          <span class="nav-icon">⚙️</span><span v-if="!sidebarCollapsed" class="nav-label">账户管理</span>
        </router-link>
      </nav>
      <div class="sidebar-footer">
        <div class="user-info" v-if="!sidebarCollapsed">
          <div class="user-name">{{ user?.display_name || user?.username }}</div>
          <div class="user-role">{{ user?.role === 'admin' ? '管理员' : '子账户' }}</div>
        </div>
        <button class="logout-btn" @click="handleLogout">{{ sidebarCollapsed ? '🚪' : '退出登录' }}</button>
      </div>
    </aside>
    <main class="crm-main">
      <header class="crm-topbar">
        <div class="search-box">
          <input v-model="globalSearch" type="text" placeholder="🔍 搜索客户、询盘、报价..." @keyup.enter="doGlobalSearch" />
        </div>
        <div class="topbar-right">
          <span class="user-badge">{{ user?.display_name }}</span>
        </div>
      </header>
      <div class="crm-content">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import crmApi from '../../api/crm'

const router = useRouter()
const sidebarCollapsed = ref(false)
const globalSearch = ref('')
const user = ref(null)

onMounted(() => {
  try {
    user.value = JSON.parse(localStorage.getItem('crm_user') || '{}')
  } catch (e) { user.value = {} }
})

function handleLogout() {
  crmApi.clearToken()
  localStorage.removeItem('crm_user')
  router.push('/crm/login')
}

function doGlobalSearch() {
  if (globalSearch.value.trim()) {
    router.push({ path: '/crm/customers', query: { search: globalSearch.value.trim() } })
  }
}
</script>

<style scoped>
.crm-layout {
  display: flex;
  min-height: 100vh;
  background: #f1f5f9;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.crm-sidebar {
  width: 240px;
  background: linear-gradient(180deg, #0f172a, #1e293b);
  color: #fff;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
}
.crm-sidebar.collapsed { width: 64px; }
.sidebar-header {
  padding: 20px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.sidebar-logo { font-size: 24px; }
.sidebar-title { font-size: 18px; font-weight: 700; white-space: nowrap; }
.collapse-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 16px;
}
.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  color: #94a3b8;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s;
  white-space: nowrap;
}
.nav-item:hover { background: rgba(255,255,255,0.08); color: #fff; }
.nav-item.active { background: rgba(37,99,235,0.2); color: #60a5fa; }
.nav-icon { font-size: 18px; }
.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(255,255,255,0.1);
}
.user-info { margin-bottom: 10px; }
.user-name { font-size: 14px; font-weight: 600; }
.user-role { font-size: 12px; color: #64748b; }
.logout-btn {
  width: 100%;
  padding: 8px;
  background: rgba(239,68,68,0.15);
  color: #f87171;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.logout-btn:hover { background: rgba(239,68,68,0.25); }
.crm-main {
  flex: 1;
  margin-left: 240px;
  transition: margin-left 0.3s;
  display: flex;
  flex-direction: column;
}
.crm-sidebar.collapsed ~ .crm-main { margin-left: 64px; }
.crm-topbar {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.search-box { flex: 1; max-width: 480px; }
.search-box input {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: #f8fafc;
  box-sizing: border-box;
}
.search-box input:focus { outline: none; border-color: #2563eb; background: #fff; }
.user-badge {
  background: #eff6ff;
  color: #2563eb;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}
.crm-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}
</style>
