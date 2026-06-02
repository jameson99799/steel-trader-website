<template>
  <div class="crm-dashboard">
    <h1 class="page-title">📈 仪表盘</h1>
    <div class="stats-grid">
      <div class="stat-card total"><div class="stat-num">{{ stats.total }}</div><div class="stat-label">全部客户</div></div>
      <div class="stat-card dev"><div class="stat-num">{{ stats.developing }}</div><div class="stat-label">开发中</div></div>
      <div class="stat-card contact"><div class="stat-num">{{ stats.contacting }}</div><div class="stat-label">联系中</div></div>
      <div class="stat-card closed"><div class="stat-num">{{ stats.closed }}</div><div class="stat-label">已成交</div></div>
      <div class="stat-card pool"><div class="stat-num">{{ stats.pool }}</div><div class="stat-label">公海池</div></div>
    </div>
    <div class="quick-actions">
      <h2>快捷操作</h2>
      <div class="action-grid">
        <router-link to="/crm/customers?action=add" class="action-card">
          <span class="action-icon">➕</span><span>添加客户</span>
        </router-link>
        <router-link to="/crm/customers" class="action-card">
          <span class="action-icon">👥</span><span>客户列表</span>
        </router-link>
        <router-link to="/crm/sea-pool" class="action-card">
          <span class="action-icon">🌊</span><span>公海池</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import crmApi from '../../api/crm'

const stats = ref({ total: 0, developing: 0, contacting: 0, closed: 0, pool: 0 })

onMounted(async () => {
  try { stats.value = await crmApi.getStats() } catch (e) { console.error(e) }
})
</script>

<style scoped>
.page-title { margin: 0 0 24px; font-size: 24px; color: #0f172a; }
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}
.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  border-left: 4px solid #e2e8f0;
}
.stat-card.total { border-left-color: #2563eb; }
.stat-card.dev { border-left-color: #f59e0b; }
.stat-card.contact { border-left-color: #8b5cf6; }
.stat-card.closed { border-left-color: #10b981; }
.stat-card.pool { border-left-color: #6b7280; }
.stat-num { font-size: 32px; font-weight: 700; color: #0f172a; }
.stat-label { font-size: 14px; color: #64748b; margin-top: 4px; }
h2 { font-size: 18px; color: #0f172a; margin: 0 0 16px; }
.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}
.action-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  text-decoration: none;
  color: #334155;
  font-weight: 600;
  transition: all 0.2s;
}
.action-card:hover { border-color: #2563eb; background: #eff6ff; color: #2563eb; }
.action-icon { font-size: 24px; }
</style>
