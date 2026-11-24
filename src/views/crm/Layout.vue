<template>
  <div class="crm-layout crm-scope" :class="{ collapsed: sidebarCollapsed, 'drawer-open': drawerOpen }">
    <div class="drawer-mask" v-if="drawerOpen" @click="drawerOpen = false"></div>
    <aside class="crm-sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <span class="sidebar-logo">S</span>
        <span v-if="!sidebarCollapsed" class="sidebar-title">SunSea CRM</span>
        <button class="collapse-btn" :title="sidebarCollapsed ? '展开' : '折叠'" @click="sidebarCollapsed = !sidebarCollapsed">
          <svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px"><path fill-rule="evenodd" v-if="!sidebarCollapsed" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/><path fill-rule="evenodd" v-else d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
        </button>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-group" v-if="!sidebarCollapsed">概览</div>
        <router-link :to="basePath" class="nav-item" exact-active-class="active">
          <span class="nav-icon">📈</span><span v-if="!sidebarCollapsed" class="nav-label">仪表盘</span>
        </router-link>
        <div class="nav-group" v-if="!sidebarCollapsed">销售</div>
        <router-link :to="basePath+'/customers'" class="nav-item" active-class="active">
          <span class="nav-icon">👥</span><span v-if="!sidebarCollapsed" class="nav-label">客户管理</span>
        </router-link>
        <router-link :to="basePath+'/sea-pool'" class="nav-item" active-class="active">
          <span class="nav-icon">🌊</span><span v-if="!sidebarCollapsed" class="nav-label">公海池</span>
        </router-link>
        <div class="nav-group" v-if="!sidebarCollapsed">营销</div>
        <router-link :to="basePath+'/mailer'" class="nav-item" active-class="active">
          <span class="nav-icon">📧</span><span v-if="!sidebarCollapsed" class="nav-label">邮件系统</span>
        </router-link>
        <template v-if="user?.role === 'admin'">
          <div class="nav-group" v-if="!sidebarCollapsed">管理</div>
          <router-link :to="basePath+'/users'" class="nav-item" active-class="active">
            <span class="nav-icon">⚙️</span><span v-if="!sidebarCollapsed" class="nav-label">账户管理</span>
          </router-link>
        </template>
      </nav>
      <div class="sidebar-footer">
        <div class="user-info" v-if="!sidebarCollapsed">
          <span class="crm-avatar footer-avatar" :style="{ background: avatarColor }">{{ avatarInitial }}</span>
          <div class="user-meta">
            <div class="user-name">{{ user?.display_name || user?.username }}</div>
            <div class="user-role">{{ user?.role === 'admin' ? '管理员' : '子账户' }}</div>
          </div>
        </div>
        <button class="logout-btn" @click="handleLogout">
          <svg viewBox="0 0 20 20" fill="currentColor" style="width:15px;height:15px"><path fill-rule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H14a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
          <span v-if="!sidebarCollapsed">退出登录</span>
        </button>
      </div>
    </aside>
    <main class="crm-main">
      <header class="crm-topbar">
        <button class="drawer-toggle" @click="drawerOpen = true" aria-label="打开菜单">
          <svg viewBox="0 0 20 20" fill="currentColor" style="width:20px;height:20px"><path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
        </button>
        <div class="search-box">
          <svg class="search-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg>
          <input v-model="globalSearch" type="text" placeholder="搜索客户、询盘、报价…" @keyup.enter="doGlobalSearch" />
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import crmApi from '../../api/crm'

const router = useRouter()
const route = useRoute()
const sidebarCollapsed = ref(false)
const drawerOpen = ref(false)
const globalSearch = ref('')

// Initialize synchronously to prevent layout flicker
let initialUser = {}
try {
  const userKey = crmApi.getUserKey()
  initialUser = JSON.parse(localStorage.getItem(userKey) || '{}')
} catch (e) {}
const user = ref(initialUser)

const basePath = computed(() => {
  return route.path.startsWith('/crm/sub') ? '/crm/sub' : '/crm'
})

const displayName = computed(() => user.value?.display_name || user.value?.username || '')
const avatarInitial = computed(() => (displayName.value || 'U').charAt(0).toUpperCase())
const avatarColor = computed(() => {
  const palette = ['#1e40af', '#0e7490', '#7c3aed', '#b45309', '#047857', '#be185d']
  let h = 0
  for (const ch of displayName.value) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return palette[h % palette.length]
})

// Route change closes the mobile drawer
router.afterEach(() => { drawerOpen.value = false })

// Close drawer on desktop resize
function onResize() { if (window.innerWidth >= 900) drawerOpen.value = false }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

function handleLogout() {
  crmApi.clearToken()
  localStorage.removeItem(crmApi.getUserKey())
  const loginPath = basePath.value === '/crm/sub' ? '/crm/sub/login' : '/crm/login'
  router.push(loginPath)
}

function doGlobalSearch() {
  if (globalSearch.value.trim()) {
    router.push({ path: basePath.value + '/customers', query: { search: globalSearch.value.trim() } })
    drawerOpen.value = false
  }
}
</script>

<style scoped>
.crm-layout {
  display: flex;
  min-height: 100vh;
}
.crm-sidebar {
  width: 240px;
  background: linear-gradient(180deg, #0b1f4b 0%, #14306e 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: 200;
  transition: width 0.25s, transform 0.25s;
}
.crm-sidebar.collapsed { width: 64px; }
.sidebar-header {
  padding: 18px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.sidebar-logo {
  display: inline-flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: 10px; flex: none;
  background: var(--crm-primary);
  color: #fff; font-weight: 800; font-size: 16px;
  box-shadow: 0 2px 8px rgba(30,64,175,0.45);
}
.sidebar-title { font-size: 16px; font-weight: 700; white-space: nowrap; letter-spacing: .01em; }
.collapse-btn {
  margin-left: auto;
  background: none; border: none;
  color: rgba(255,255,255,0.55);
  cursor: pointer; font-size: 14px;
  padding: 4px; border-radius: 6px;
  display: inline-flex;
}
.collapse-btn:hover { color: #fff; background: rgba(255,255,255,0.08); }
.sidebar-nav {
  flex: 1;
  padding: 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow-y: auto;
}
.nav-group {
  font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
  color: rgba(255,255,255,0.38);
  padding: 14px 10px 5px;
  white-space: nowrap;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  border-radius: 9px;
  color: rgba(255,255,255,0.62);
  text-decoration: none;
  font-size: 13.5px; font-weight: 500;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
  position: relative;
}
.nav-item:hover { background: rgba(255,255,255,0.07); color: #fff; }
.nav-item.active { background: rgba(255,255,255,0.1); color: #fff; }
.nav-item.active::before {
  content: ''; position: absolute; left: -10px; top: 7px; bottom: 7px;
  width: 3px; border-radius: 3px; background: #60a5fa;
}
.nav-icon { font-size: 16px; width: 20px; text-align: center; flex: none; }
.sidebar-footer {
  padding: 14px;
  border-top: 1px solid rgba(255,255,255,0.08);
}
.user-info { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.footer-avatar { width: 32px; height: 32px; font-size: 13px; }
.user-meta { min-width: 0; }
.user-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-role { font-size: 11px; color: rgba(255,255,255,0.5); }
.logout-btn {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: 100%;
  padding: 8px;
  background: rgba(239,68,68,0.14);
  color: #fca5a5;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12.5px; font-weight: 600;
  transition: background 0.15s;
}
.logout-btn:hover { background: rgba(239,68,68,0.26); color: #fecaca; }
.crm-main {
  flex: 1;
  margin-left: 240px;
  transition: margin-left 0.25s;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.crm-sidebar.collapsed ~ .crm-main { margin-left: 64px; }
.crm-topbar {
  height: 58px;
  background: var(--crm-card);
  border-bottom: 1px solid var(--crm-border);
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 14px;
  position: sticky; top: 0; z-index: 90;
}
.drawer-toggle {
  display: none;
  background: none; border: none; cursor: pointer;
  color: var(--crm-text-2); padding: 6px; border-radius: 8px;
}
.drawer-toggle:hover { background: var(--crm-bg); }
.search-box { flex: 1; max-width: 460px; position: relative; }
.search-icon {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  width: 15px; height: 15px; color: var(--crm-text-3); pointer-events: none;
}
.search-box input {
  width: 100%;
  padding: 9px 14px 9px 36px;
  border: 1px solid var(--crm-border);
  border-radius: var(--crm-radius-sm);
  font-size: 13px;
  background: var(--crm-bg);
  color: var(--crm-text);
  box-sizing: border-box;
  font-family: inherit;
  transition: border-color .15s, background .15s;
}
.search-box input:focus { outline: none; border-color: var(--crm-primary); background: #fff; box-shadow: 0 0 0 3px rgba(30,64,175,.08); }
.user-badge {
  background: var(--crm-primary-soft);
  color: var(--crm-primary);
  padding: 5px 14px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
}
.crm-content { flex: 1; padding: 24px; overflow-y: auto; }
.drawer-mask {
  display: none;
  position: fixed; inset: 0; z-index: 190;
  background: rgba(15,23,42,0.5);
}

@media (max-width: 899px) {
  .crm-sidebar { transform: translateX(-100%); width: 240px !important; box-shadow: 24px 0 48px rgba(15,23,42,0.35); }
  .crm-layout.drawer-open .crm-sidebar { transform: translateX(0); }
  .drawer-mask { display: block; }
  .crm-main { margin-left: 0 !important; }
  .drawer-toggle { display: inline-flex; }
  .collapse-btn { display: none; }
  .sidebar-title, .nav-label, .user-meta, .logout-btn span { display: inline !important; }
  .crm-content { padding: 16px; }
}
</style>
