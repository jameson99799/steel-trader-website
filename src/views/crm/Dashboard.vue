<template>
  <div class="crm-page">
    <h1 class="crm-page-title">📈 仪表盘</h1>
    <p class="crm-page-sub">销售概览与快捷入口</p>

    <div class="stats-grid">
      <div class="crm-stat-card" style="--stat-color: var(--crm-primary)">
        <span class="crm-stat-icon">👥</span>
        <div class="crm-stat-num">{{ stats.total }}</div>
        <div class="crm-stat-label">全部客户</div>
      </div>
      <div class="crm-stat-card" style="--stat-color: var(--crm-dev)">
        <span class="crm-stat-icon">🔍</span>
        <div class="crm-stat-num">{{ stats.developing }}</div>
        <div class="crm-stat-label">开发中</div>
      </div>
      <div class="crm-stat-card" style="--stat-color: var(--crm-contact)">
        <span class="crm-stat-icon">💬</span>
        <div class="crm-stat-num">{{ stats.contacting }}</div>
        <div class="crm-stat-label">联系中</div>
      </div>
      <div class="crm-stat-card" style="--stat-color: var(--crm-closed)">
        <span class="crm-stat-icon">🏆</span>
        <div class="crm-stat-num">{{ stats.closed }}</div>
        <div class="crm-stat-label">已成交</div>
      </div>
      <div class="crm-stat-card" style="--stat-color: var(--crm-pool)">
        <span class="crm-stat-icon">🌊</span>
        <div class="crm-stat-num">{{ stats.pool }}</div>
        <div class="crm-stat-label">公海池</div>
      </div>
    </div>

    <div class="crm-card">
      <h2 class="crm-section-title">销售漏斗</h2>
      <div class="funnel-bar" v-if="totalLeads > 0">
        <div class="funnel-seg seg-dev" :style="{ width: pct(stats.developing) }" :title="`开发中 ${stats.developing}`"></div>
        <div class="funnel-seg seg-contact" :style="{ width: pct(stats.contacting) }" :title="`联系中 ${stats.contacting}`"></div>
        <div class="funnel-seg seg-closed" :style="{ width: pct(stats.closed) }" :title="`已成交 ${stats.closed}`"></div>
      </div>
      <div class="crm-empty" v-else><span class="crm-empty-icon">📭</span>暂无客户数据，添加客户后展示漏斗</div>
      <div class="funnel-legend" v-if="totalLeads > 0">
        <span class="legend-item"><i class="dot dot-dev"></i>开发中 {{ stats.developing }}（{{ pct(stats.developing) }}）</span>
        <span class="legend-item"><i class="dot dot-contact"></i>联系中 {{ stats.contacting }}（{{ pct(stats.contacting) }}）</span>
        <span class="legend-item"><i class="dot dot-closed"></i>已成交 {{ stats.closed }}（{{ pct(stats.closed) }}）</span>
      </div>
    </div>

    <div class="quick-actions">
      <h2 class="crm-section-title">快捷操作</h2>
      <div class="action-grid">
        <router-link :to="basePath + '/customers?action=add'" class="crm-card crm-card-hover action-card">
          <span class="action-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg></span>
          <span class="action-text"><strong>添加客户</strong><small>录入新客户资料</small></span>
        </router-link>
        <router-link :to="basePath + '/customers'" class="crm-card crm-card-hover action-card">
          <span class="action-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm14 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          <span class="action-text"><strong>客户列表</strong><small>管理与跟进客户</small></span>
        </router-link>
        <router-link :to="basePath + '/sea-pool'" class="crm-card crm-card-hover action-card">
          <span class="action-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px"><path d="M2 6c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0M2 12c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0M2 18c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" stroke-linecap="round"/></svg></span>
          <span class="action-text"><strong>公海池</strong><small>认领待跟进客户</small></span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import crmApi from '../../api/crm'

const route = useRoute()
const stats = ref({ total: 0, developing: 0, contacting: 0, closed: 0, pool: 0 })

const basePath = computed(() => route.path.startsWith('/crm/sub') ? '/crm/sub' : '/crm')

const totalLeads = computed(() =>
  (Number(stats.value.developing) || 0) + (Number(stats.value.contacting) || 0) + (Number(stats.value.closed) || 0)
)

function pct(n) {
  if (!totalLeads.value) return '0%'
  return Math.round(((Number(n) || 0) / totalLeads.value) * 100) + '%'
}

onMounted(async () => {
  try { stats.value = await crmApi.getStats() } catch (e) { console.error(e) }
})
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}
.funnel-bar {
  display: flex; height: 16px; border-radius: 999px; overflow: hidden;
  background: #eef2f8; margin: 4px 0 12px;
}
.funnel-seg { transition: width .4s; }
.seg-dev { background: var(--crm-dev); }
.seg-contact { background: var(--crm-contact); }
.seg-closed { background: var(--crm-closed); }
.funnel-legend { display: flex; flex-wrap: wrap; gap: 18px; font-size: 12.5px; color: var(--crm-text-2); }
.legend-item { display: inline-flex; align-items: center; gap: 6px; }
.dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.dot-dev { background: var(--crm-dev); }
.dot-contact { background: var(--crm-contact); }
.dot-closed { background: var(--crm-closed); }
.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 14px;
}
.action-card {
  display: flex; align-items: center; gap: 14px;
  padding: 18px 20px; text-decoration: none; color: var(--crm-text);
}
.action-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 46px; height: 46px; border-radius: 12px; flex: none;
  background: var(--crm-primary-soft); color: var(--crm-primary);
}
.action-text { display: flex; flex-direction: column; }
.action-text strong { font-size: 14px; }
.action-text small { color: var(--crm-text-2); font-size: 12px; margin-top: 2px; }
.action-card:hover .action-icon { background: var(--crm-primary); color: #fff; }
</style>
