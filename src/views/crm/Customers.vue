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
            <td class="center-cell"><span class="name-cell" @click="$router.push(`/crm/customer/${c.id}`)">{{ c.name }}</span></td>
            <td class="center-cell">
              <span class="company-link" v-if="c.company" @click.stop="openCompanyPanel(c.company)">{{ c.company }}</span>
              <span v-else>-</span>
            </td>
            <td class="center-cell"><span class="country-badge">{{ c.country || '-' }}</span></td>
            <!-- Contact: 2-per-row grid -->
            <td class="contact-cell">
              <div class="contact-grid">
                <span v-for="item in getContactItems(c)" :key="item.label" :title="item.label">{{ item.icon }}{{ item.value }}</span>
              </div>
            </td>
            <!-- Merged: status + tags -->
            <td class="center-cell">
              <span :class="['status-badge', getStatusClass(c.status)]">{{ c.status }}</span>
              <div v-if="parseTags(c.tags).length" class="tag-row-inline">
                <span v-for="t in parseTags(c.tags)" :key="t" class="tag-badge">{{ t }}</span>
              </div>
            </td>
            <td class="num-cell">{{ c.inquiry_count || 0 }}</td>
            <td class="num-cell">{{ c.quotation_count || 0 }}</td>
            <td class="date-cell center-cell">{{ formatDate(c.created_at) }}</td>
            <td class="center-cell">
              <span :class="{ 'pool-owner': c.status === '公海池' }">{{ c.owner_name || '-' }}</span>
            </td>
            <td class="action-cell">
              <div class="action-row">
                <button class="btn-sm btn-edit" @click="openEditModal(c)">编辑</button>
                <button class="btn-sm btn-copy" @click="handleCopy(c)">复制</button>
                <button class="btn-sm btn-view" @click="openPreviewModal(c)">预览</button>
              </div>
              <div class="action-row">
                <button class="btn-sm btn-inq" @click="$router.push(`/crm/customer/${c.id}?tab=inquiry`)">询盘</button>
                <button class="btn-sm btn-quot" @click="$router.push(`/crm/customer/${c.id}?tab=quotation`)">报价</button>
                <button class="btn-sm btn-follow" @click="$router.push(`/crm/customer/${c.id}?tab=followup`)">跟进</button>
                <button class="btn-sm btn-danger" @click="handleDelete(c)">删除</button>
              </div>
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
    <div v-if="showModal" class="modal-overlay">
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
              <label>客户备注</label>
              <textarea v-model="form.note" rows="3" placeholder="输入备注信息..."></textarea>
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

    <!-- Preview Modal -->
    <div v-if="showPreview" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>👁️ 客户预览</h3>
          <button class="modal-close" @click="showPreview = false">&times;</button>
        </div>
        <div class="modal-body preview-body">
          <div class="preview-grid">
            <div><label>名称</label><span>{{ previewData.name }}</span></div>
            <div><label>公司</label><span>{{ previewData.company || '-' }}</span></div>
            <div><label>国家</label><span>{{ previewData.country || '-' }}</span></div>
            <div><label>电话</label><span>{{ previewData.phone || '-' }}</span></div>
            <div><label>邮箱</label><span>{{ previewData.email || '-' }}</span></div>
            <div><label>WhatsApp</label><span>{{ previewData.whatsapp || '-' }}</span></div>
            <div><label>微信</label><span>{{ previewData.wechat || '-' }}</span></div>
            <div><label>状态</label><span :class="['status-badge', getStatusClass(previewData.status)]">{{ previewData.status }}</span></div>
          </div>
          <div v-if="previewData.note" class="preview-note">
            <label>备注</label>
            <p>{{ previewData.note }}</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showPreview = false">关闭</button>
          <button class="btn btn-primary" @click="showPreview = false; $router.push(`/crm/customer/${previewData.id}`)">查看详情</button>
        </div>
      </div>
    </div>

    <!-- Company Panel -->
    <div v-if="showCompanyPanel" class="modal-overlay">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>🏢 公司关联: {{ companySearchName }}</h3>
          <button class="modal-close" @click="showCompanyPanel = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="company-toolbar">
            <label><input type="checkbox" v-model="companyAllSelected" @change="toggleCompanyAll" /> 全选</label>
            <button v-if="companySelectedIds.length" class="btn btn-sm btn-primary" @click="sendMailToCompany">📧 发送营销邮件 ({{ companySelectedIds.length }})</button>
          </div>
          <div v-for="c in companyCustomers" :key="c.id" class="company-card" :class="{ excluded: c._excluded }">
            <div class="company-card-left">
              <input type="checkbox" :value="c.id" v-model="companySelectedIds" :disabled="c._excluded" />
              <div class="company-card-info">
                <strong class="name-cell" @click="$router.push(`/crm/customer/${c.id}`)">{{ c.name }}</strong>
                <span v-if="c.email">📧 {{ c.email }}</span>
                <span class="company-sub">{{ c.company || '-' }} · {{ c.country || '-' }}</span>
              </div>
            </div>
            <button class="btn-sm btn-danger" @click="excludeCompanyMatch(c)">✕</button>
          </div>
          <p v-if="!companyCustomers.length" class="empty-msg">没有匹配的关联客户</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showCompanyPanel = false">关闭</button>
        </div>
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

// Preview
const showPreview = ref(false)
const previewData = ref({})

// Company panel
const showCompanyPanel = ref(false)
const companySearchName = ref('')
const companyCustomers = ref([])
const companySelectedIds = ref([])
const companyAllSelected = ref(false)

const filters = reactive({
  search: '', country: '', status: '', tag: '', start_date: '', end_date: ''
})

const form = reactive({
  name: '', company: '', country: '', phone: '', email: '',
  whatsapp: '', wechat: '', status: '开发中', tags: [], note: ''
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

function getContactItems(c) {
  const items = []
  if (c.phone) items.push({ icon: '📞', label: '电话', value: c.phone })
  if (c.email) items.push({ icon: '📧', label: '邮箱', value: c.email })
  if (c.whatsapp) items.push({ icon: '💬', label: 'WhatsApp', value: c.whatsapp })
  if (c.wechat) items.push({ icon: '💬', label: '微信', value: c.wechat })
  return items
}

function openAddModal() {
  editingId.value = null
  Object.assign(form, { name: '', company: '', country: '', phone: '', email: '', whatsapp: '', wechat: '', status: '开发中', tags: [], note: '' })
  showModal.value = true
}

function openEditModal(c) {
  editingId.value = c.id
  Object.assign(form, {
    name: c.name, company: c.company, country: c.country,
    phone: c.phone, email: c.email, whatsapp: c.whatsapp, wechat: c.wechat,
    status: c.status, tags: parseTags(c.tags), note: c.note || ''
  })
  showModal.value = true
}

async function handleSave() {
  try {
    if (editingId.value) await crmApi.updateCustomer(editingId.value, form)
    else await crmApi.createCustomer(form)
    showModal.value = false
    loadCustomers()
  } catch (e) { alert(e.message) }
}

async function handleCopy(c) {
  try {
    await crmApi.createCustomer({
      name: c.name + ' (复制)', company: c.company, country: c.country, phone: c.phone,
      email: c.email, whatsapp: c.whatsapp, wechat: c.wechat,
      status: c.status, tags: parseTags(c.tags), note: c.note || ''
    })
    loadCustomers()
  } catch (e) { alert(e.message) }
}

function openPreviewModal(c) {
  previewData.value = c
  showPreview.value = true
}

async function openCompanyPanel(companyName) {
  companySearchName.value = companyName
  companySelectedIds.value = []
  companyAllSelected.value = false
  try {
    const data = await crmApi.getCustomers({ company_fuzzy: companyName, limit: 200 })
    companyCustomers.value = (data.customers || []).map(c => ({ ...c, _excluded: false }))
  } catch (e) { console.error(e) }
  showCompanyPanel.value = true
}

function toggleCompanyAll() {
  companySelectedIds.value = companyAllSelected.value
    ? companyCustomers.value.filter(c => !c._excluded).map(c => c.id) : []
}

function excludeCompanyMatch(c) {
  c._excluded = true
  companySelectedIds.value = companySelectedIds.value.filter(id => id !== c.id)
}

function sendMailToCompany() {
  alert(`已选择 ${companySelectedIds.value.length} 个客户进行营销邮件（后续阶段实现）`)
}

async function handleDelete(c) {
  if (!confirm(`确定删除客户 "${c.name}"？`)) return
  try { await crmApi.deleteCustomer(c.id); loadCustomers() } catch (e) { alert(e.message) }
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

function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-' }

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
  padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; background: #f8fafc;
}
.filter-input { min-width: 160px; }
.filter-input.date { min-width: 130px; }
.filter-select { min-width: 120px; }

.table-wrap {
  background: #fff; border-radius: 10px; overflow-x: auto;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { background: #f8fafc; padding: 12px 10px; text-align: center; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
td { padding: 10px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.center-cell { text-align: center; }
.name-cell { font-weight: 600; color: #2563eb; cursor: pointer; }
.name-cell:hover { text-decoration: underline; }
.company-link { color: #8b5cf6; cursor: pointer; font-weight: 500; text-decoration: underline dotted; }
.country-badge { background: #eff6ff; color: #2563eb; padding: 2px 8px; border-radius: 10px; font-size: 12px; }
/* Contact: 2-per-row grid */
.contact-cell { min-width: 200px; }
.contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px; font-size: 12px; color: #475569; }
.contact-grid span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }
/* Merged status + tags */
.status-badge { padding: 3px 10px; border-radius: 10px; font-size: 12px; font-weight: 600; display: inline-block; }
.status-dev { background: #fef3c7; color: #92400e; }
.status-contact { background: #ede9fe; color: #5b21b6; }
.status-closed { background: #d1fae5; color: #065f46; }
.status-pool { background: #f1f5f9; color: #64748b; }
.tag-row-inline { margin-top: 4px; display: flex; flex-wrap: wrap; gap: 3px; justify-content: center; }
.tag-badge { background: #f0fdf4; color: #166534; padding: 1px 5px; border-radius: 3px; font-size: 10px; }
.num-cell { text-align: center; font-weight: 600; }
.date-cell { white-space: nowrap; color: #64748b; font-size: 12px; }
.pool-owner { color: #2563eb; }
.pool-row { background: #fafafa; }
/* Action: 2-row layout */
.action-cell { min-width: 240px; }
.action-row { display: flex; gap: 4px; margin-bottom: 4px; }
.action-row:last-child { margin-bottom: 0; }
.btn-sm { padding: 3px 8px; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; white-space: nowrap; }
.btn-edit { background: #eff6ff; color: #2563eb; }
.btn-copy { background: #f0fdf4; color: #15803d; }
.btn-view { background: #fefce8; color: #a16207; }
.btn-inq { background: #fdf2f8; color: #be185d; }
.btn-quot { background: #ecfdf5; color: #059669; }
.btn-follow { background: #f5f3ff; color: #7c3aed; }
.btn-danger { background: #fef2f2; color: #dc2626; }
.btn-sm:hover { opacity: 0.85; }
.empty-msg { text-align: center; padding: 40px; color: #64748b; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 16px; }
.pagination button { padding: 6px 14px; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; background: #fff; }
.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; border-radius: 14px; width: 640px; max-width: 92vw; max-height: 90vh; overflow-y: auto; }
.modal-lg { width: 800px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e2e8f0; }
.modal-header h3 { margin: 0; font-size: 18px; }
.modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b; }
.modal-body { padding: 24px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; margin-bottom: 4px; font-size: 13px; font-weight: 600; color: #334155; }
.form-group input, .form-group select, .form-group textarea {
  width: 100%; padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px; box-sizing: border-box; font-family: inherit;
}
.form-group textarea { resize: vertical; }
.tag-select { display: flex; flex-wrap: wrap; gap: 12px; }
.tag-option { display: flex; align-items: center; gap: 4px; font-size: 13px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid #e2e8f0; }

/* Preview */
.preview-body { padding: 24px; }
.preview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.preview-grid div label { display: block; font-size: 12px; color: #64748b; }
.preview-grid div span { font-size: 14px; font-weight: 600; }
.preview-note { margin-top: 16px; padding: 12px; background: #f8fafc; border-radius: 8px; }
.preview-note label { display: block; font-size: 12px; color: #64748b; margin-bottom: 4px; }
.preview-note p { margin: 0; font-size: 14px; white-space: pre-wrap; }

/* Company panel */
.company-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; }
.company-card { display: flex; justify-content: space-between; align-items: center; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; }
.company-card.excluded { opacity: 0.4; text-decoration: line-through; }
.company-card-left { display: flex; align-items: center; gap: 10px; }
.company-card-info { display: flex; flex-direction: column; gap: 2px; }
.company-card-info span { font-size: 12px; color: #64748b; }
.company-sub { font-size: 11px !important; color: #94a3b8 !important; }

.btn { padding: 9px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-primary { background: #2563eb; color: #fff; }
.btn-primary:hover { background: #1d4ed8; }
.btn-secondary { background: #f1f5f9; color: #334155; }
</style>
