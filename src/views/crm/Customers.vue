<template>
  <div class="crm-customers">
    <div class="page-header">
      <h1>👥 客户管理</h1>
      <button class="btn btn-primary" @click="openAddModal">➕ 添加客户</button>
    </div>

    <!-- Filters -->
    <div class="filter-bar">
      <input v-model="filters.search" type="text" placeholder="搜索客户..." @input="debouncedLoad" class="filter-input" />
      <select v-model="filters.country" @change="loadCustomers" class="filter-select">
        <option value="">全部国家</option>
        <option v-for="c in countries" :key="c" :value="c">{{ c }}</option>
      </select>
      <select v-model="filters.status" @change="loadCustomers" class="filter-select">
        <option value="">全部状态</option>
        <option value="开发中">开发中</option>
        <option value="联系中">联系中</option>
        <option value="已成交">已成交</option>
        <option value="公海池">公海池</option>
      </select>
      <select v-model="filters.tag" @change="loadCustomers" class="filter-select">
        <option value="">全部标签</option>
        <option value="询盘客户">询盘客户</option>
        <option value="开发客户">开发客户</option>
        <option value="重点客户">重点客户</option>
        <option value="成交客户">成交客户</option>
      </select>
      <input v-model="filters.start_date" type="date" @change="loadCustomers" class="filter-input date" />
      <input v-model="filters.end_date" type="date" @change="loadCustomers" class="filter-input date" />
    </div>

    <!-- Customer Table -->
    <div class="table-wrap">
      <table v-if="customers.length">
        <thead>
          <tr>
            <th><input type="checkbox" v-model="allSelected" @change="toggleAll" /></th>
            <th>客户名称</th>
            <th>公司</th>
            <th>国家</th>
            <th>联系方式</th>
            <th>状态</th>
            <th>标签</th>
            <th>询盘</th>
            <th>报价</th>
            <th>添加时间</th>
            <th>负责人</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in customers" :key="c.id" :class="{ 'pool-row': c.status === '公海池' }">
            <td><input type="checkbox" :value="c.id" v-model="selectedIds" /></td>
            <td class="name-cell" @click="$router.push(`/crm/customer/${c.id}`)">{{ c.name }}</td>
            <td>{{ c.company || '-' }}</td>
            <td><span class="country-badge">{{ c.country || '-' }}</span></td>
            <td class="contact-cell">
              <span v-if="c.email" title="Email">📧{{ c.email }}</span>
              <span v-if="c.whatsapp" title="WhatsApp">💬{{ c.whatsapp }}</span>
            </td>
            <td>
              <span :class="['status-badge', getStatusClass(c.status)]">{{ c.status }}</span>
            </td>
            <td>
              <span v-for="t in parseTags(c.tags)" :key="t" class="tag-badge">{{ t }}</span>
            </td>
            <td class="num-cell">{{ c.inquiry_count || 0 }}</td>
            <td class="num-cell">{{ c.quotation_count || 0 }}</td>
            <td class="date-cell">{{ formatDate(c.created_at) }}</td>
            <td>
              <span :class="{ 'pool-owner': c.status === '公海池' }">{{ c.owner_name || '-' }}</span>
            </td>
            <td class="action-cell">
              <button class="btn-sm btn-edit" @click="openEditModal(c)">编辑</button>
              <button class="btn-sm btn-danger" @click="handleDelete(c)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-msg">暂无客户数据</p>
    </div>

    <!-- Pagination -->
    <div class="pagination" v-if="totalPages > 1">
      <button :disabled="page <= 1" @click="page--; loadCustomers()">上一页</button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button :disabled="page >= totalPages" @click="page++; loadCustomers()">下一页</button>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingId ? '编辑客户' : '添加客户' }}</h3>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        <form @submit.prevent="handleSave">
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group">
                <label>客户名称 *</label>
                <input v-model="form.name" required />
              </div>
              <div class="form-group">
                <label>公司</label>
                <input v-model="form.company" />
              </div>
              <div class="form-group">
                <label>国家</label>
                <input v-model="form.country" />
              </div>
              <div class="form-group">
                <label>电话</label>
                <input v-model="form.phone" />
              </div>
              <div class="form-group">
                <label>邮箱</label>
                <input v-model="form.email" type="email" />
              </div>
              <div class="form-group">
                <label>WhatsApp</label>
                <input v-model="form.whatsapp" />
              </div>
              <div class="form-group">
                <label>微信</label>
                <input v-model="form.wechat" />
              </div>
              <div class="form-group">
                <label>状态</label>
                <select v-model="form.status">
                  <option value="开发中">开发中</option>
                  <option value="联系中">联系中</option>
                  <option value="已成交">已成交</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>标签</label>
              <div class="tag-select">
                <label v-for="t in allTags" :key="t" class="tag-option">
                  <input type="checkbox" :value="t" v-model="form.tags" /> {{ t }}
                </label>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showModal = false">取消</button>
            <button type="submit" class="btn btn-primary">{{ editingId ? '更新' : '保存' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import crmApi from '../../api/crm'

const route = useRoute()
const router = useRouter()
const customers = ref([])
const countries = ref([])
const page = ref(1)
const total = ref(0)
const limit = 50
const showModal = ref(false)
const editingId = ref(null)
const selectedIds = ref([])
const allSelected = ref(false)
const allTags = ['询盘客户', '开发客户', '重点客户', '成交客户']

const filters = reactive({
  search: '', country: '', status: '', tag: '', start_date: '', end_date: ''
})

const form = reactive({
  name: '', company: '', country: '', phone: '', email: '',
  whatsapp: '', wechat: '', status: '开发中', tags: []
})

const totalPages = computed(() => Math.ceil(total.value / limit))

let debounceTimer
function debouncedLoad() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { page.value = 1; loadCustomers() }, 300)
}

async function loadCustomers() {
  try {
    const params = { page: page.value, limit }
    if (filters.search) params.search = filters.search
    if (filters.country) params.country = filters.country
    if (filters.status) params.status = filters.status
    if (filters.tag) params.tag = filters.tag
    if (filters.start_date) params.start_date = filters.start_date
    if (filters.end_date) params.end_date = filters.end_date

    const data = await crmApi.getCustomers(params)
    customers.value = data.customers || []
    total.value = data.total || 0
    if (data.countries) countries.value = data.countries
  } catch (e) { console.error(e) }
}

function openAddModal() {
  editingId.value = null
  Object.assign(form, { name: '', company: '', country: '', phone: '', email: '', whatsapp: '', wechat: '', status: '开发中', tags: [] })
  showModal.value = true
}

function openEditModal(c) {
  editingId.value = c.id
  Object.assign(form, {
    name: c.name, company: c.company, country: c.country,
    phone: c.phone, email: c.email, whatsapp: c.whatsapp, wechat: c.wechat,
    status: c.status, tags: parseTags(c.tags)
  })
  showModal.value = true
}

async function handleSave() {
  try {
    if (editingId.value) {
      await crmApi.updateCustomer(editingId.value, form)
    } else {
      await crmApi.createCustomer(form)
    }
    showModal.value = false
    loadCustomers()
  } catch (e) { alert(e.message) }
}

async function handleDelete(c) {
  if (!confirm(`确定删除客户 "${c.name}"？此操作将同时删除其所有询盘和报价记录。`)) return
  try {
    await crmApi.deleteCustomer(c.id)
    loadCustomers()
  } catch (e) { alert(e.message) }
}

function toggleAll() {
  selectedIds.value = allSelected.value ? customers.value.map(c => c.id) : []
}

function parseTags(tags) {
  if (Array.isArray(tags)) return tags
  try { return JSON.parse(tags || '[]') } catch (e) { return [] }
}

function getStatusClass(s) {
  return { '开发中': 'status-dev', '联系中': 'status-contact', '已成交': 'status-closed', '公海池': 'status-pool' }[s] || ''
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('zh-CN')
}

onMounted(() => {
  if (route.query.search) filters.search = route.query.search
  if (route.query.action === 'add') { loadCustomers(); openAddModal(); return }
  loadCustomers()
})

watch(() => route.query.search, (v) => { if (v) { filters.search = v; loadCustomers() } })
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header h1 { margin: 0; font-size: 24px; color: #0f172a; }
.filter-bar {
  display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px;
  background: #fff; padding: 16px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.filter-input, .filter-select {
  padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px;
  background: #f8fafc;
}
.filter-input { min-width: 160px; }
.filter-input.date { min-width: 130px; }
.filter-select { min-width: 120px; }
.filter-input:focus, .filter-select:focus { outline: none; border-color: #2563eb; }

.table-wrap {
  background: #fff; border-radius: 10px; overflow-x: auto;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { background: #f8fafc; padding: 12px 10px; text-align: left; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
td { padding: 10px; border-bottom: 1px solid #f1f5f9; }
.name-cell { font-weight: 600; color: #2563eb; cursor: pointer; }
.name-cell:hover { text-decoration: underline; }
.country-badge { background: #eff6ff; color: #2563eb; padding: 2px 8px; border-radius: 10px; font-size: 12px; }
.contact-cell { display: flex; flex-direction: column; gap: 2px; font-size: 12px; }
.status-badge { padding: 3px 10px; border-radius: 10px; font-size: 12px; font-weight: 600; }
.status-dev { background: #fef3c7; color: #92400e; }
.status-contact { background: #ede9fe; color: #5b21b6; }
.status-closed { background: #d1fae5; color: #065f46; }
.status-pool { background: #f1f5f9; color: #64748b; }
.tag-badge { background: #f0fdf4; color: #166534; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-right: 4px; }
.num-cell { text-align: center; font-weight: 600; }
.date-cell { white-space: nowrap; color: #64748b; font-size: 12px; }
.pool-owner { color: #2563eb; }
.pool-row { background: #fafafa; }
.action-cell { white-space: nowrap; }
.btn-sm { padding: 4px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 4px; }
.btn-edit { background: #eff6ff; color: #2563eb; }
.btn-danger { background: #fef2f2; color: #dc2626; }
.btn-sm:hover { opacity: 0.85; }
.empty-msg { text-align: center; padding: 40px; color: #64748b; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 16px; }
.pagination button { padding: 6px 14px; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; background: #fff; }
.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; border-radius: 14px; width: 640px; max-width: 92vw; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e2e8f0; }
.modal-header h3 { margin: 0; font-size: 18px; }
.modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b; }
.modal-body { padding: 24px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; margin-bottom: 4px; font-size: 13px; font-weight: 600; color: #334155; }
.form-group input, .form-group select {
  width: 100%; padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px; box-sizing: border-box;
}
.form-group input:focus, .form-group select:focus { outline: none; border-color: #2563eb; }
.tag-select { display: flex; flex-wrap: wrap; gap: 12px; }
.tag-option { display: flex; align-items: center; gap: 4px; font-size: 13px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid #e2e8f0; }

.btn { padding: 9px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-primary { background: #2563eb; color: #fff; }
.btn-primary:hover { background: #1d4ed8; }
.btn-secondary { background: #f1f5f9; color: #334155; }
</style>
