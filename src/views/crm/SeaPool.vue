<template>
  <div class="crm-page sea-pool">
    <h1 class="crm-page-title">🌊 公海池</h1>
    <p class="crm-page-sub" v-if="settings">超过 {{ settings.sea_pool_days }} 天未活动的客户会自动进入公海池，所有子账户均可申领。</p>

    <div class="pool-groups" v-if="grouped.length">
      <div v-for="g in grouped" :key="g.country" class="country-group">
        <h2 class="country-title">🌍 {{ g.country || '未分类' }} <span class="crm-small crm-muted">({{ g.customers.length }})</span></h2>
        <div class="pool-cards">
          <div v-for="c in g.customers" :key="c.id" class="crm-card crm-card-hover pool-card">
            <div class="card-top">
              <span class="crm-avatar" :style="{ background: avatarColor(c), width: '34px', height: '34px', fontSize: '14px' }">{{ (c.name || 'U').charAt(0).toUpperCase() }}</span>
              <strong class="card-name">{{ c.name }}</strong>
              <span class="crm-badge crm-badge-dev" v-if="c.sea_pool_count">第{{ c.sea_pool_count }}次</span>
            </div>
            <div class="card-info">
              <span v-if="c.company">🏢 {{ c.company }}</span>
              <span v-if="c.email">📧 {{ c.email }}</span>
              <span v-if="c.whatsapp">💬 {{ c.whatsapp }}</span>
            </div>
            <div class="card-stats">
              <span class="count-pill" title="询盘">{{ c.inquiry_count || 0 }} 询盘</span>
              <span class="count-pill" title="报价">{{ c.quotation_count || 0 }} 报价</span>
              <span v-if="c.owner_name" class="crm-small prev-owner">原: {{ c.owner_name }}</span>
            </div>
            <button class="crm-btn crm-btn-primary crm-btn-block" @click="handleClaim(c)">🙋 申领客户</button>
          </div>
        </div>
      </div>
    </div>
    <div class="crm-card crm-empty" v-else><span class="crm-empty-icon">🌊</span>公海池暂无客户</div>

    <!-- Admin settings -->
    <div v-if="isAdmin" class="crm-card settings-panel">
      <h2 class="crm-section-title">⚙️ 公海池设置</h2>
      <div class="setting-row">
        <label>自动进入公海池天数</label>
        <input class="crm-input" style="width:90px" v-model.number="settings.sea_pool_days" type="number" min="1" />
        <button class="crm-btn crm-btn-primary crm-btn-sm" @click="saveSettings">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import crmApi from '../../api/crm'

const customers = ref([])
const settings = ref(null)
const isAdmin = computed(() => {
  try {
    const key = window.location.pathname.startsWith('/crm/sub') ? 'crm_sub_user' : 'crm_admin_user'
    return JSON.parse(localStorage.getItem(key) || '{}').role === 'admin'
  } catch { return false }
})

const grouped = computed(() => {
  const map = {}
  customers.value.forEach(c => {
    const k = c.country || ''
    if (!map[k]) map[k] = { country: k, customers: [] }
    map[k].customers.push(c)
  })
  return Object.values(map).sort((a, b) => a.country.localeCompare(b.country))
})

const AVATAR_COLORS = ['#1e40af', '#0e7490', '#7c3aed', '#b45309', '#047857', '#be185d']
function avatarColor(c) {
  const key = (c?.name || '') + (c?.id || '')
  let h = 0
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

async function load() {
  try {
    const s = await crmApi.getSettings()
    settings.value = s || { sea_pool_days: 30 }
    customers.value = await crmApi.getSeaPool()
  } catch (e) { console.error(e); if (!settings.value) settings.value = { sea_pool_days: 30 } }
}

async function handleClaim(c) {
  if (!confirm(`确定申领客户 "${c.name}"？`)) return
  try {
    await crmApi.claimCustomer(c.id)
    alert('申领成功！')
    load()
  } catch (e) { alert(e.message) }
}

async function saveSettings() {
  try {
    const res = await crmApi.updateSettings(settings.value)
    alert(`设置已保存。${res.moved_to_pool ? `已有 ${res.moved_to_pool} 个客户自动进入公海池。` : ''}`)
    load()
  } catch (e) { alert(e.message) }
}

onMounted(load)
</script>

<style scoped>
.country-group { margin-bottom: 26px; }
.country-title { font-size: 16px; color: var(--crm-text); margin: 0 0 12px; font-weight: 700; }
.pool-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.pool-card { display: flex; flex-direction: column; gap: 8px; }
.card-top { display: flex; align-items: center; gap: 10px; }
.card-name { font-size: 14.5px; color: var(--crm-text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-info { display: flex; flex-direction: column; gap: 3px; font-size: 12.5px; color: var(--crm-text-2); }
.card-stats { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.count-pill {
  min-width: 20px; text-align: center;
  background: #f1f5f9; color: var(--crm-text);
  border-radius: 6px; padding: 1px 8px; font-size: 11.5px; font-weight: 600;
}
.prev-owner { color: var(--crm-primary); }
.settings-panel { margin-top: 26px; }
.setting-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.setting-row label { font-size: 13px; font-weight: 600; color: var(--crm-text); }
</style>
