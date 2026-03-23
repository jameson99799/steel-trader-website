<template>
  <div class="sea-pool">
    <h1>🌊 公海池</h1>
    <p class="subtitle">超过 {{ settings.sea_pool_days }} 天未活动的客户会自动进入公海池，所有子账户均可申领。</p>

    <div class="pool-groups" v-if="grouped.length">
      <div v-for="g in grouped" :key="g.country" class="country-group">
        <h2 class="country-title">🌍 {{ g.country || '未分类' }} <span class="count">({{ g.customers.length }})</span></h2>
        <div class="pool-cards">
          <div v-for="c in g.customers" :key="c.id" class="pool-card">
            <div class="card-top">
              <strong>{{ c.name }}</strong>
              <span class="pool-count" v-if="c.sea_pool_count">第{{ c.sea_pool_count }}次</span>
            </div>
            <div class="card-info">
              <span v-if="c.company">🏢 {{ c.company }}</span>
              <span v-if="c.email">📧 {{ c.email }}</span>
              <span v-if="c.whatsapp">💬 {{ c.whatsapp }}</span>
            </div>
            <div class="card-stats">
              <span>询盘 {{ c.inquiry_count || 0 }}</span>
              <span>报价 {{ c.quotation_count || 0 }}</span>
              <span v-if="c.owner_name" class="prev-owner">原: {{ c.owner_name }}</span>
            </div>
            <button class="btn btn-claim" @click="handleClaim(c)">🙋 申领客户</button>
          </div>
        </div>
      </div>
    </div>
    <p v-else class="empty">公海池暂无客户</p>

    <!-- Admin settings -->
    <div v-if="isAdmin" class="settings-panel">
      <h3>⚙️ 公海池设置</h3>
      <div class="setting-row">
        <label>自动进入公海池天数</label>
        <input v-model.number="settings.sea_pool_days" type="number" min="1" />
        <button class="btn btn-primary" @click="saveSettings">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import crmApi from '../../api/crm'

const customers = ref([])
const settings = ref({ sea_pool_days: 30 })
const isAdmin = computed(() => {
  try { return JSON.parse(localStorage.getItem('crm_user') || '{}').role === 'admin' } catch { return false }
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

async function load() {
  try {
    customers.value = await crmApi.getSeaPool()
    settings.value = await crmApi.getSettings()
  } catch (e) { console.error(e) }
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
h1 { margin: 0 0 4px; font-size: 24px; color: #0f172a; }
.subtitle { color: #64748b; font-size: 14px; margin: 0 0 24px; }
.country-group { margin-bottom: 28px; }
.country-title { font-size: 18px; color: #1e293b; margin: 0 0 12px; }
.count { font-size: 14px; color: #94a3b8; font-weight: 400; }
.pool-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.pool-card {
  background: #fff; border-radius: 12px; padding: 18px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;
}
.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.card-top strong { font-size: 15px; color: #0f172a; }
.pool-count { font-size: 11px; background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 10px; }
.card-info { display: flex; flex-direction: column; gap: 3px; font-size: 13px; color: #475569; margin-bottom: 8px; }
.card-stats { display: flex; gap: 12px; font-size: 12px; color: #64748b; margin-bottom: 12px; }
.prev-owner { color: #2563eb; }
.btn-claim {
  width: 100%; padding: 8px; border: none; border-radius: 8px; cursor: pointer;
  background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; font-size: 13px; font-weight: 600;
}
.btn-claim:hover { opacity: 0.9; }
.empty { color: #94a3b8; text-align: center; padding: 40px; }

.settings-panel {
  background: #fff; border-radius: 12px; padding: 20px; margin-top: 32px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;
}
.settings-panel h3 { margin: 0 0 12px; font-size: 16px; }
.setting-row { display: flex; align-items: center; gap: 12px; }
.setting-row label { font-size: 14px; font-weight: 600; }
.setting-row input { width: 80px; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px; }
.btn { padding: 8px 18px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; }
.btn-primary { background: #2563eb; color: #fff; }
</style>
