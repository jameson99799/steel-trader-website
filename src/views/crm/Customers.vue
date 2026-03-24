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
      <button class="btn btn-sm btn-outline" @click="showSendRecords = true" title="发送记录">📊 发送记录</button>
    </div>

    <!-- Selection Action Bar -->
    <div v-if="selectedIds.length" class="selection-bar">
      <span>已选择 <strong>{{ selectedIds.length }}</strong> 个客户</span>
      <button class="btn btn-sm btn-primary" @click="bulkEmailViaMailer(selectedIds)">📧 发送营销邮件</button>
      <button class="btn btn-sm" style="background:#e0f2fe;color:#0369a1" @click="bulkMoveToPool">🌊 移入公海池</button>
      <button class="btn btn-sm btn-secondary" @click="selectedIds = []; allSelected = false">取消选择</button>
    </div>

    <!-- Customer Table -->
    <div class="table-wrap">
      <table v-if="customers.length">
        <thead>
          <tr>
            <th><input type="checkbox" v-model="allSelected" @change="toggleAll" /></th>
            <th>名字(First)</th>
            <th>姓氏(Last)</th>
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
            <td class="center-cell"><span class="name-cell" @click="$router.push(`/crm/customer/${c.id}`)">{{ c.first_name || c.name }}</span></td>
            <td class="center-cell">{{ c.last_name || '' }}</td>
            <td class="center-cell">
              <span class="company-link" v-if="c.company" @click.stop="openCompanyPanel(c.company)">{{ c.company }}</span>
              <span v-else>-</span>
            </td>
            <td class="center-cell"><span class="country-badge">{{ c.country || '-' }}</span></td>
            <!-- Contact: 2-per-row grid -->
            <td class="contact-cell">
              <div class="contact-grid">
                <span v-for="item in getContactItems(c)" :key="item.label" :title="item.label" :class="item.cls">{{ item.icon }} {{ item.value }}</span>
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
                <button class="btn-sm btn-mail" @click="quickSendEmail(c)" :disabled="!c.email || quickSending === c.id" :title="c.email ? '使用默认模板发送邮件' : '无邮箱'">{{ quickSending === c.id ? '发送中...' : '📧邮件' }}</button>
              </div>
              <div class="action-row">
                <button class="btn-sm btn-inq" @click="$router.push(`/crm/customer/${c.id}?tab=inquiry`)">询盘</button>
                <button class="btn-sm btn-quot" @click="$router.push(`/crm/customer/${c.id}?tab=quotation`)">报价</button>
                <button class="btn-sm btn-follow" @click="$router.push(`/crm/customer/${c.id}?tab=followup`)">跟进</button>
                <button v-if="c.status !== '公海池'" class="btn-sm" style="background:#e0f2fe;color:#0369a1" @click="moveToPool(c)">🌊公海</button>
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
                <label>名字 (First Name) *</label>
                <input v-model="form.first_name" required placeholder="名字" />
              </div>
              <div class="form-group">
                <label>姓氏 (Last Name)</label>
                <input v-model="form.last_name" placeholder="姓氏" />
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
            <div><label>名字</label><span>{{ previewData.first_name || previewData.name }}</span></div>
            <div><label>姓氏</label><span>{{ previewData.last_name || '-' }}</span></div>
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
            <button v-if="companySelectedIds.length" class="btn btn-sm btn-primary" @click="bulkEmailViaMailer(companySelectedIds)">📧 发送营销邮件 ({{ companySelectedIds.length }})</button>
          </div>
          <div v-for="c in companyCustomers" :key="c.id" class="company-card" :class="{ excluded: c._excluded }">
            <input type="checkbox" :value="c.id" v-model="companySelectedIds" :disabled="c._excluded" />
            <div class="cc-name">
              <strong class="name-cell" @click="$router.push(`/crm/customer/${c.id}`)">{{ c.name }}</strong>
              <span class="cc-company">{{ c.company || '-' }}</span>
            </div>
            <div class="cc-contacts">
              <span v-if="c.phone" class="ct-phone" title="电话">📞 {{ c.phone }}</span>
              <span v-if="c.email" class="ct-email" title="邮箱">✉️ {{ c.email }}</span>
              <span v-if="c.whatsapp" class="ct-wa" title="WhatsApp">WA {{ c.whatsapp }}</span>
              <span v-if="c.wechat" class="ct-wx" title="微信">WX {{ c.wechat }}</span>
            </div>
            <div class="cc-meta">
              <span class="country-badge">{{ c.country || '-' }}</span>
              <span :class="['status-badge', getStatusClass(c.status)]">{{ c.status }}</span>
            </div>
            <div class="cc-owner">{{ c.owner_name || '-' }}</div>
            <button class="btn-sm btn-danger" @click="excludeCompanyMatch(c)">✕</button>
          </div>
          <p v-if="!companyCustomers.length" class="empty-msg">没有匹配的关联客户</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showCompanyPanel = false">关闭</button>
        </div>
      </div>
    </div>



    <!-- Send Records Panel -->
    <div v-if="showSendRecords" class="modal-overlay">
      <div class="modal modal-xl">
        <div class="modal-header">
          <h3>📊 邮件发送记录</h3>
          <button class="modal-close" @click="showSendRecords = false">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="!sendRecords.length" class="empty-msg">暂无发送记录</div>
          <table v-else class="records-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>收件人</th>
                <th>主题</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in sendRecords" :key="r.id">
                <td>{{ formatDate(r.sent_at || r.created_at) }}</td>
                <td>{{ r.recipient_email || r.contact_email }}</td>
                <td>{{ r.subject }}</td>
                <td>
                  <span :class="['status-dot', r.status === 'sent' ? 'dot-ok' : 'dot-fail']">
                    {{ r.status === 'sent' ? '✅ 已发送' : '❌ 失败' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showSendRecords = false">关闭</button>
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
const quickSending = ref(null)

const filters = reactive({
  search: '', country: '', status: '', tag: '', start_date: '', end_date: ''
})

const form = reactive({
  first_name: '', last_name: '', company: '', country: '', phone: '', email: '',
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
  if (c.phone) items.push({ icon: '📞', label: '电话', value: c.phone, cls: 'ct-phone' })
  if (c.email) items.push({ icon: '✉️', label: '邮箱', value: c.email, cls: 'ct-email' })
  if (c.whatsapp) items.push({ icon: 'WA', label: 'WhatsApp', value: c.whatsapp, cls: 'ct-wa' })
  if (c.wechat) items.push({ icon: 'WX', label: '微信', value: c.wechat, cls: 'ct-wx' })
  return items
}

function openAddModal() {
  editingId.value = null
  Object.assign(form, { first_name: '', last_name: '', company: '', country: '', phone: '', email: '', whatsapp: '', wechat: '', status: '开发中', tags: [], note: '' })
  showModal.value = true
}

function openEditModal(c) {
  editingId.value = c.id
  Object.assign(form, {
    first_name: c.first_name || c.name || '', last_name: c.last_name || '',
    company: c.company, country: c.country,
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
      first_name: (c.first_name || c.name || '') + ' (复制)', last_name: c.last_name || '',
      company: c.company, country: c.country, phone: c.phone,
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
  bulkEmailViaMailer(companySelectedIds.value)
}

// Email via Mailer: navigate to mailer with pre-selected customer IDs
function bulkEmailViaMailer(ids) {
  if (!ids.length) { alert('请先选择客户'); return }
  router.push(`/crm/mailer?customers=${ids.join(',')}`)
}

// Move to sea pool
async function moveToPool(c) {
  if (!confirm(`确定将 "${c.name || c.first_name || ''}" 移入公海池？`)) return
  try {
    await crmApi.moveToPool(c.id)
    alert('已移入公海池')
    loadCustomers()
  } catch (e) { alert(e.message) }
}
async function bulkMoveToPool() {
  if (!selectedIds.value.length) return
  if (!confirm(`确定将 ${selectedIds.value.length} 位客户移入公海池？`)) return
  try {
    const res = await crmApi.moveToPool(selectedIds.value)
    alert(res.message || '操作完成')
    selectedIds.value = []; allSelected.value = false
    loadCustomers()
  } catch (e) { alert(e.message) }
}

// Send Records
const showSendRecords = ref(false)
const sendRecords = ref([])

async function loadSendRecords() {
  try { sendRecords.value = await crmApi.getSendRecords() } catch (e) { sendRecords.value = [] }
}

async function quickSendEmail(c) {
  if (!c.email) { alert('该客户没有邮箱'); return }
  quickSending.value = c.id
  try {
    const res = await crmApi.request(`/customers/email/quick-send`, {
      method: 'POST', body: JSON.stringify({ customer_id: c.id })
    })
    alert(res.message || '发送完成')
  } catch (e) { alert(e.message || '发送失败') }
  quickSending.value = null
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
.btn-mail { background: #eff6ff; color: #2563eb; }
.btn-mail:disabled { opacity: 0.5; cursor: not-allowed; }
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
.company-card { display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; }
.company-card.excluded { opacity: 0.4; text-decoration: line-through; }
.cc-name { min-width: 120px; }
.cc-name strong { display: block; }
.cc-company { font-size: 11px; color: #94a3b8; }
.cc-contacts { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 10px; font-size: 12px; flex: 1; min-width: 240px; }
.cc-meta { display: flex; gap: 6px; align-items: center; min-width: 130px; }
.cc-owner { font-size: 12px; color: #475569; min-width: 60px; text-align: center; }

/* Contact icon colors */
.ct-phone { color: #2563eb; }
.ct-email { color: #d97706; }
.ct-wa { color: #25D366; font-weight: 600; }
.ct-wx { color: #07C160; font-weight: 600; }

.btn { padding: 9px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-primary { background: #2563eb; color: #fff; }
.btn-primary:hover { background: #1d4ed8; }
.btn-secondary { background: #f1f5f9; color: #334155; }
.btn-outline { background: #fff; border: 1px solid #e2e8f0; color: #334155; }

/* Selection action bar */
.selection-bar { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; margin-bottom: 12px; }
.selection-bar span { font-size: 13px; color: #1e40af; }

/* Email modal */
.modal-xl { width: 1000px; max-width: 95vw; }
.email-recipients { margin-bottom: 14px; }
.email-recipients label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }
.recipient-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.recipient-chip { background: #eff6ff; color: #2563eb; padding: 3px 10px; border-radius: 12px; font-size: 12px; }
.recipient-chip.more { background: #e2e8f0; color: #64748b; }
.rich-editor { min-height: 120px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; line-height: 1.6; overflow-y: auto; max-height: 300px; }
.rich-editor:focus { outline: none; border-color: #2563eb; }

/* Send records table */
.records-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.records-table th { background: #f8fafc; padding: 10px 12px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; text-align: left; }
.records-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
.status-dot { font-size: 12px; }
.dot-ok { color: #059669; }
.dot-fail { color: #dc2626; }
</style>
