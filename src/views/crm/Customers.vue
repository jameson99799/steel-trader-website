<template>
  <div class="crm-page crm-customers">
    <div class="crm-between page-head">
      <div>
        <h1 class="crm-page-title">👥 客户管理</h1>
        <p class="crm-page-sub">共 {{ total }} 位客户 · 点击姓名进入详情，点击联系方式复制</p>
      </div>
      <div class="crm-flex">
        <button class="crm-btn crm-btn-outline" @click="exportZip" :disabled="exportingZip" title="导出完整CRM离线系统（ZIP包含所有数据+图片）">{{ exportingZip ? '导出中…' : '📤 导出ZIP' }}</button>
        <button class="crm-btn crm-btn-outline" @click="$refs.importFileInput.click()" title="导入JSON或ZIP数据">📥 导入</button>
        <input type="file" ref="importFileInput" accept=".json,.zip" style="display:none" @change="handleImport" />
        <button class="crm-btn crm-btn-primary" @click="openAddModal">＋ 添加客户</button>
      </div>
    </div>

    <!-- Filters -->
    <div class="crm-card filter-bar">
      <input v-model="filters.search" type="text" placeholder="搜索客户…" @input="debouncedLoad" class="crm-input filter-search" />
      <select v-model="filters.country" @change="loadCustomers" class="crm-select">
        <option value="">全部国家</option>
        <option v-for="c in countries" :key="c" :value="c">{{ c }}</option>
      </select>
      <select v-model="filters.status" @change="loadCustomers" class="crm-select">
        <option value="">全部状态</option>
        <option value="开发中">开发中</option>
        <option value="联系中">联系中</option>
        <option value="已成交">已成交</option>
        <option value="公海池">公海池</option>
      </select>
      <select v-model="filters.tag" @change="loadCustomers" class="crm-select">
        <option value="">全部标签</option>
        <option value="询盘客户">询盘客户</option>
        <option value="开发客户">开发客户</option>
        <option value="重点客户">重点客户</option>
        <option value="成交客户">成交客户</option>
      </select>
      <input v-model="filters.start_date" type="date" @change="loadCustomers" class="crm-input date" />
      <input v-model="filters.end_date" type="date" @change="loadCustomers" class="crm-input date" />
      <select v-model="filters.owner_id" @change="loadCustomers" class="crm-select" v-if="crmUsers.length">
        <option value="">全部负责人</option>
        <option v-for="u in crmUsers" :key="u.id" :value="u.id">{{ u.display_name }}</option>
      </select>
      <button class="crm-btn crm-btn-outline crm-btn-sm" @click="loadSendRecords(); showSendRecords = true" title="发送记录">📊 发送记录</button>
    </div>

    <!-- Selection Action Bar -->
    <div v-if="selectedIds.length" class="crm-card selection-bar">
      <span class="crm-small">已选择 <strong>{{ selectedIds.length }}</strong> 个客户</span>
      <button class="crm-btn crm-btn-primary crm-btn-sm" @click="bulkEmailViaMailer(selectedIds)">📧 发送营销邮件</button>
      <button class="crm-btn crm-btn-outline crm-btn-sm" @click="bulkMoveToPool">🌊 移入公海池</button>
      <select v-model="assignTargetUser" class="crm-select" style="min-width:130px" v-if="crmUsers.length">
        <option value="">👤 分配给…</option>
        <option v-for="u in crmUsers" :key="u.id" :value="u.id">{{ u.display_name }}</option>
      </select>
      <button v-if="assignTargetUser" class="crm-btn crm-btn-outline crm-btn-sm" style="color:var(--crm-success);border-color:#a7f3d0" @click="bulkAssign">✅ 确认分配</button>
      <button class="crm-btn crm-btn-ghost crm-btn-sm" @click="selectedIds = []; allSelected = false">取消选择</button>
    </div>

    <!-- Customer card list -->
    <div class="customer-list" v-if="customers.length">
      <div class="list-head crm-small">
        <label class="head-check"><input type="checkbox" v-model="allSelected" @change="toggleAll" /> 全选</label>
        <span class="col-name">客户</span>
        <span class="col-country">国家</span>
        <span class="col-contact">联系方式</span>
        <span class="col-status">状态 / 标签</span>
        <span class="col-counts">询盘 / 报价</span>
        <span class="col-owner">负责人</span>
        <span class="col-actions">操作</span>
      </div>
      <div v-for="c in customers" :key="c.id" class="crm-card crm-card-hover customer-row" :class="{ 'pool-row': c.status === '公海池' }">
        <label class="row-check"><input type="checkbox" :value="c.id" v-model="selectedIds" /></label>

        <div class="col-name">
          <span class="crm-avatar" :style="{ background: avatarColor(c) }">{{ (c.first_name || c.name || 'U').charAt(0).toUpperCase() }}</span>
          <span class="name-cell" @click="$router.push(`${basePath}/customer/${c.id}`)">{{ c.first_name || c.name }} <em v-if="c.last_name">{{ c.last_name }}</em></span>
        </div>
        <div class="col-country">
          <span class="crm-pill" v-if="c.company" @click.stop="openCompanyPanel(c.company)" title="查看关联客户">{{ c.company }}</span>
          <span class="crm-pill" v-else>{{ c.country || '—' }}</span>
        </div>
        <div class="col-contact">
          <span v-for="item in getContactItems(c)" :key="item.label" :title="'点击复制 ' + item.label" :class="['ct-item', item.cls]" @click="copyContact(item.value, $event)">
            <em class="ct-icon">{{ item.icon }}</em><span class="ct-val">{{ item.value }}</span>
          </span>
        </div>
        <div class="col-status">
          <span :class="['crm-badge', statusBadge(c.status)]">{{ c.status }}</span>
          <span v-for="t in parseTags(c.tags)" :key="t" class="crm-pill">{{ t }}</span>
        </div>
        <div class="col-counts">
          <span class="count-pill" title="询盘">{{ c.inquiry_count || 0 }}</span>
          <span class="count-pill" title="报价">{{ c.quotation_count || 0 }}</span>
          <span class="crm-small crm-muted">{{ formatDate(c.created_at) }}</span>
        </div>
        <div class="col-owner crm-small">
          <span :class="{ 'pool-owner': c.status === '公海池' }">{{ c.owner_name || '—' }}</span>
        </div>
        <div class="col-actions">
          <div class="action-row">
            <button class="crm-btn crm-btn-outline crm-btn-sm" @click="openEditModal(c)">编辑</button>
            <button class="crm-btn crm-btn-outline crm-btn-sm" @click="handleCopy(c)">复制</button>
            <button class="crm-btn crm-btn-outline crm-btn-sm" @click="openPreviewModal(c)">预览</button>
            <button class="crm-btn crm-btn-outline crm-btn-sm" @click="quickSendEmail(c)" :disabled="!c.email || quickSending === c.id" :title="c.email ? '使用默认模板发送邮件' : '无邮箱'">{{ quickSending === c.id ? '发送中…' : '📧 邮件' }}</button>
          </div>
          <div class="action-row">
            <button class="crm-btn crm-btn-ghost crm-btn-sm" @click="$router.push(`${basePath}/customer/${c.id}?tab=inquiry`)">询盘</button>
            <button class="crm-btn crm-btn-ghost crm-btn-sm" @click="$router.push(`${basePath}/customer/${c.id}?tab=quotation`)">报价</button>
            <button class="crm-btn crm-btn-ghost crm-btn-sm" @click="$router.push(`${basePath}/customer/${c.id}?tab=followup`)">跟进</button>
            <button v-if="c.status !== '公海池'" class="crm-btn crm-btn-ghost crm-btn-sm" @click="moveToPool(c)">🌊 公海</button>
            <button class="crm-btn crm-btn-danger crm-btn-sm" @click="handleDelete(c)">删除</button>
          </div>
        </div>
      </div>
    </div>
    <div class="crm-empty" v-else><span class="crm-empty-icon">👥</span>暂无客户数据</div>

    <!-- Pagination -->
    <div class="pagination" v-if="totalPages > 1">
      <button class="crm-btn crm-btn-outline crm-btn-sm" :disabled="page <= 1" @click="page--; loadCustomers()">上一页</button>
      <span class="crm-small crm-muted">{{ page }} / {{ totalPages }}</span>
      <button class="crm-btn crm-btn-outline crm-btn-sm" :disabled="page >= totalPages" @click="page++; loadCustomers()">下一页</button>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showModal" class="crm-modal-overlay" @click.self="showModal = false">
      <div class="crm-modal">
        <div class="crm-modal-head">
          <h3>{{ editingId ? '编辑客户' : '添加客户' }}</h3>
          <button class="crm-modal-close" @click="showModal = false">&times;</button>
        </div>
        <form @submit.prevent="handleSave">
          <div class="crm-modal-body">
            <div class="form-grid">
              <div class="crm-field">
                <label>名字 (First Name) *</label>
                <input class="crm-input" v-model="form.first_name" required placeholder="名字" />
              </div>
              <div class="crm-field">
                <label>姓氏 (Last Name)</label>
                <input class="crm-input" v-model="form.last_name" placeholder="姓氏" />
              </div>
              <div class="crm-field">
                <label>公司</label>
                <input class="crm-input" v-model="form.company" />
              </div>
              <div class="crm-field">
                <label>国家</label>
                <input class="crm-input" v-model="form.country" />
              </div>
              <div class="crm-field">
                <label>电话</label>
                <input class="crm-input" v-model="form.phone" />
              </div>
              <div class="crm-field">
                <label>邮箱</label>
                <input class="crm-input" v-model="form.email" type="email" />
              </div>
              <div class="crm-field">
                <label>WhatsApp</label>
                <input class="crm-input" v-model="form.whatsapp" />
              </div>
              <div class="crm-field">
                <label>微信</label>
                <input class="crm-input" v-model="form.wechat" />
              </div>
              <div class="crm-field">
                <label>状态</label>
                <select class="crm-select" v-model="form.status">
                  <option value="开发中">开发中</option>
                  <option value="联系中">联系中</option>
                  <option value="已成交">已成交</option>
                </select>
              </div>
            </div>
            <div class="crm-field">
              <label>客户备注</label>
              <textarea class="crm-textarea" v-model="form.note" rows="3" placeholder="输入备注信息…"></textarea>
            </div>
            <div class="crm-field">
              <label>标签</label>
              <div class="tag-select">
                <label v-for="t in allTags" :key="t" class="tag-option">
                  <input type="checkbox" :value="t" v-model="form.tags" /> {{ t }}
                </label>
              </div>
            </div>
          </div>
          <div class="crm-modal-foot">
            <button type="button" class="crm-btn crm-btn-outline" @click="showModal = false">取消</button>
            <button type="submit" class="crm-btn crm-btn-primary">{{ editingId ? '更新' : '保存' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Preview Modal -->
    <div v-if="showPreview" class="crm-modal-overlay" @click.self="showPreview = false">
      <div class="crm-modal">
        <div class="crm-modal-head">
          <h3>👁️ 客户预览</h3>
          <button class="crm-modal-close" @click="showPreview = false">&times;</button>
        </div>
        <div class="crm-modal-body preview-body">
          <div class="preview-grid">
            <div><label>名字</label><span>{{ previewData.first_name || previewData.name }}</span></div>
            <div><label>姓氏</label><span>{{ previewData.last_name || '—' }}</span></div>
            <div><label>公司</label><span>{{ previewData.company || '—' }}</span></div>
            <div><label>国家</label><span>{{ previewData.country || '—' }}</span></div>
            <div><label>电话</label><span>{{ previewData.phone || '—' }}</span></div>
            <div><label>邮箱</label><span>{{ previewData.email || '—' }}</span></div>
            <div><label>WhatsApp</label><span>{{ previewData.whatsapp || '—' }}</span></div>
            <div><label>微信</label><span>{{ previewData.wechat || '—' }}</span></div>
            <div><label>状态</label><span :class="['crm-badge', statusBadge(previewData.status)]">{{ previewData.status }}</span></div>
          </div>
          <div v-if="previewData.note" class="preview-note">
            <label>备注</label>
            <p>{{ previewData.note }}</p>
          </div>
        </div>
        <div class="crm-modal-foot">
          <button class="crm-btn crm-btn-outline" @click="showPreview = false">关闭</button>
          <button class="crm-btn crm-btn-primary" @click="showPreview = false; $router.push(`${basePath}/customer/${previewData.id}`)">查看详情</button>
        </div>
      </div>
    </div>

    <!-- Company Panel -->
    <div v-if="showCompanyPanel" class="crm-modal-overlay" @click.self="showCompanyPanel = false">
      <div class="crm-modal" style="width:720px">
        <div class="crm-modal-head">
          <h3>🏢 公司关联: {{ companySearchName }}</h3>
          <button class="crm-modal-close" @click="showCompanyPanel = false">&times;</button>
        </div>
        <div class="crm-modal-body">
          <div class="company-toolbar">
            <label><input type="checkbox" v-model="companyAllSelected" @change="toggleCompanyAll" /> 全选</label>
            <button v-if="companySelectedIds.length" class="crm-btn crm-btn-primary crm-btn-sm" @click="bulkEmailViaMailer(companySelectedIds)">📧 发送营销邮件 ({{ companySelectedIds.length }})</button>
          </div>
          <div v-for="c in companyCustomers" :key="c.id" class="company-card" :class="{ excluded: c._excluded }">
            <input type="checkbox" :value="c.id" v-model="companySelectedIds" :disabled="c._excluded" />
            <div class="cc-name">
              <strong class="name-cell" @click="$router.push(`${basePath}/customer/${c.id}`)">{{ c.name }}</strong>
              <span class="cc-company">{{ c.company || '—' }}</span>
            </div>
            <div class="cc-contacts">
              <span v-if="c.phone" class="ct-phone" title="电话">📞 {{ c.phone }}</span>
              <span v-if="c.email" class="ct-email" title="邮箱">✉️ {{ c.email }}</span>
              <span v-if="c.whatsapp" class="ct-wa" title="WhatsApp">WA {{ c.whatsapp }}</span>
              <span v-if="c.wechat" class="ct-wx" title="微信">WX {{ c.wechat }}</span>
            </div>
            <div class="cc-meta">
              <span class="crm-pill">{{ c.country || '—' }}</span>
              <span :class="['crm-badge', statusBadge(c.status)]">{{ c.status }}</span>
            </div>
            <div class="cc-owner">{{ c.owner_name || '—' }}</div>
            <button class="crm-btn crm-btn-danger crm-btn-sm" @click="excludeCompanyMatch(c)">✕</button>
          </div>
          <div class="crm-empty" v-if="!companyCustomers.length"><span class="crm-empty-icon">🏢</span>没有匹配的关联客户</div>
        </div>
        <div class="crm-modal-foot">
          <button class="crm-btn crm-btn-outline" @click="showCompanyPanel = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- Send Records Panel -->
    <div v-if="showSendRecords" class="crm-modal-overlay" @click.self="showSendRecords = false">
      <div class="crm-modal" style="width:95vw;max-width:1100px">
        <div class="crm-modal-head">
          <h3>📊 邮件发送记录</h3>
          <button class="crm-modal-close" @click="showSendRecords = false">&times;</button>
        </div>
        <div class="crm-modal-body">
          <div class="crm-empty" v-if="!sendRecords.length"><span class="crm-empty-icon">📭</span>暂无发送记录</div>
          <table v-else class="records-table">
            <thead>
              <tr>
                <th><input type="checkbox" @change="toggleAllRecords" :checked="allRecordsSelected" /></th>
                <th>时间</th>
                <th>收件人</th>
                <th>主题</th>
                <th>任务</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in sendRecords" :key="r.id">
                <td><input type="checkbox" v-model="selectedRecordIds" :value="r.id" /></td>
                <td class="nowrap">{{ formatDateTime(r.sent_at || r.created_at) }}</td>
                <td>{{ r.recipient_email || r.contact_email }}</td>
                <td>{{ r.subject }}</td>
                <td><span v-if="r.task_name" class="crm-pill">{{ r.task_name }}</span></td>
                <td>
                  <span :class="['crm-badge', r.status === 'sent' ? 'crm-badge-closed' : 'crm-badge-danger']">
                    {{ r.status === 'sent' ? '✅ 已发送' : '❌ 失败' }}
                  </span>
                </td>
                <td>
                  <button v-if="r.status === 'sent'" class="crm-btn crm-btn-outline crm-btn-sm" @click="followUpRecord(r)">🔄 跟进</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="crm-modal-foot">
          <button v-if="selectedRecordIds.length" class="crm-btn crm-btn-danger crm-btn-sm" style="margin-right:auto" @click="bulkDeleteRecords">🗑️ 删除选中 ({{ selectedRecordIds.length }})</button>
          <button class="crm-btn crm-btn-outline" @click="showSendRecords = false">关闭</button>
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
const basePath = computed(() => route.path.startsWith('/crm/sub') ? '/crm/sub' : '/crm')
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
  search: '', country: '', status: '', tag: '', start_date: '', end_date: '', owner_id: ''
})
const crmUsers = ref([])
const assignTargetUser = ref('')

const form = reactive({
  first_name: '', last_name: '', company: '', country: '', phone: '', email: '',
  whatsapp: '', wechat: '', status: '开发中', tags: [], note: ''
})

const totalPages = computed(() => Math.ceil(total.value / limit))

// New-card-view helpers (presentation only)
const AVATAR_COLORS = ['#1e40af', '#0e7490', '#7c3aed', '#b45309', '#047857', '#be185d']
function avatarColor(c) {
  const key = (c?.name || '') + (c?.id || '')
  let h = 0
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
function statusBadge(status) {
  const map = {
    '开发中': 'crm-badge-dev',
    '联系中': 'crm-badge-contact',
    '已成交': 'crm-badge-closed',
    '公海池': 'crm-badge-pool'
  }
  return map[status] || 'crm-badge-pool'
}

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
    if (filters.owner_id) params.owner_id = filters.owner_id

    const data = await crmApi.getCustomers(params)
    customers.value = data.customers || []
    total.value = data.total || 0
    if (data.countries) countries.value = data.countries
    if (data.users) crmUsers.value = data.users
  } catch (e) { console.error(e) }
}

async function bulkAssign() {
  if (!selectedIds.value.length || !assignTargetUser.value) return
  try {
    await crmApi.request(`/customers/bulk-assign`, {
      method: 'POST',
      body: JSON.stringify({ ids: selectedIds.value, owner_id: assignTargetUser.value })
    })
    const user = crmUsers.value.find(u => u.id === assignTargetUser.value)
    alert(`✅ 已分配 ${selectedIds.value.length} 个客户给 ${user?.display_name || ''}`)
    selectedIds.value = []; allSelected.value = false; assignTargetUser.value = ''
    loadCustomers()
  } catch (e) { alert('分配失败: ' + e.message) }
}

function getContactItems(c) {
  const items = []
  if (c.phone) items.push({ icon: '📞', label: '电话', value: c.phone, cls: 'ct-phone' })
  if (c.email) items.push({ icon: '✉️', label: '邮箱', value: c.email, cls: 'ct-email' })
  if (c.whatsapp) items.push({ icon: 'WA', label: 'WhatsApp', value: c.whatsapp, cls: 'ct-wa' })
  if (c.wechat) items.push({ icon: 'WX', label: '微信', value: c.wechat, cls: 'ct-wx' })
  return items
}
function copyContact(val, e) {
  navigator.clipboard.writeText(val).then(() => {
    const el = e.currentTarget
    el.classList.add('ct-copied')
    setTimeout(() => el.classList.remove('ct-copied'), 1200)
  }).catch(() => {})
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
  companyCustomers.value = []
  companySelectedIds.value = []
  companyAllSelected.value = false
  showCompanyPanel.value = true
  try {
    const res = await crmApi.request(`/customers?limit=500&search=${encodeURIComponent(companyName)}`)
    const all = (res.customers || []).filter(x => (x.company || '').toLowerCase() === String(companyName).toLowerCase())
    companyCustomers.value = all.map(x => ({ ...x, _excluded: false }))
  } catch (e) { console.error(e) }
}
function toggleCompanyAll() {
  const selectable = companyCustomers.value.filter(c => !c._excluded)
  if (companySelectedIds.value.length >= selectable.length) companySelectedIds.value = []
  else companySelectedIds.value = selectable.map(c => c.id)
}
function excludeCompanyMatch(c) {
  c._excluded = true
  companySelectedIds.value = companySelectedIds.value.filter(id => id !== c.id)
}

async function moveToPool(c) {
  if (!confirm(`确认将客户「${c.name}」移入公海池？`)) return
  try {
    await crmApi.moveToPool(c.id)
    loadCustomers()
  } catch (e) { alert(e.message) }
}

async function handleDelete(c) {
  if (!confirm(`确认删除客户「${c.name}」？此操作不可恢复。`)) return
  try {
    await crmApi.deleteCustomer(c.id)
    loadCustomers()
  } catch (e) { alert(e.message) }
}

async function quickSendEmail(c) {
  if (!c.email || quickSending.value) return
  quickSending.value = c.id
  try {
    await crmApi.request('/customers/email/quick-send', {
      method: 'POST',
      body: JSON.stringify({ customer_id: c.id })
    })
    alert('✅ 邮件已发送')
    loadSendRecords()
  } catch (e) { alert('发送失败: ' + e.message) }
  finally { quickSending.value = null }
}

// ─── Send records ─────────────────────────────
const showSendRecords = ref(false)
const sendRecords = ref([])
const selectedRecordIds = ref([])
const allRecordsSelected = computed(() => sendRecords.value.length > 0 && selectedRecordIds.value.length === sendRecords.value.length)

function toggleAllRecords() {
  if (allRecordsSelected.value) selectedRecordIds.value = []
  else selectedRecordIds.value = sendRecords.value.map(r => r.id)
}

function formatDateTime(s) {
  if (!s) return '-'
  return new Date(s).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

async function loadSendRecords() {
  try {
    const res = await crmApi.request('/customers/email/records?page=1&limit=200')
    sendRecords.value = res.records || res || []
  } catch (e) { console.error(e) }
}

async function bulkDeleteRecords() {
  if (!selectedRecordIds.value.length) return
  if (!confirm(`确认删除 ${selectedRecordIds.value.length} 条发送记录？`)) return
  try {
    await crmApi.request('/customers/email/records/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids: selectedRecordIds.value })
    })
    selectedRecordIds.value = []
    loadSendRecords()
  } catch (e) { alert(e.message) }
}

async function followUpRecord(r) {
  try {
    await crmApi.request('/customers/email/quick-followup', {
      method: 'POST',
      body: JSON.stringify({ record_id: r.id })
    })
    alert('✅ 已使用跟进模板发送')
    loadSendRecords()
  } catch (e) { alert('跟进失败: ' + e.message) }
}

function formatDate(s) {
  if (!s) return '-'
  return new Date(s).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function parseTags(json) {
  try { return JSON.parse(json || '[]') } catch (e) { return [] }
}

function toggleAll() {
  if (allSelected.value) selectedIds.value = customers.value.map(c => c.id)
  else selectedIds.value = []
}

async function exportZip() {
  if (exportingZip.value) return
  exportingZip.value = true
  try {
    const res = await crmApi.request('/customers/export/zip')
    if (res?.download_url) {
      window.open(res.download_url)
      alert('✅ 导出完成，开始下载')
    } else {
      alert('导出完成')
    }
  } catch (e) { alert('导出失败: ' + e.message) }
  finally { exportingZip.value = false }
}

const exportingZip = ref(false)
const importFileInput = ref(null)

async function handleImport(e) {
  const file = e.target.files[0]
  if (!file) return
  try {
    const token = localStorage.getItem('crm_token') || localStorage.getItem('token')
    if (file.name.endsWith('.zip')) {
      // ZIP import
      if (!confirm('将导入ZIP包中的所有数据和图片，重复客户将自动合并。\n\n是否继续？')) {
        if (importFileInput.value) importFileInput.value.value = ''
        return
      }
      const buffer = await file.arrayBuffer()
      const res = await fetch('/api/crm/customers/import/zip', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
        body: buffer
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '导入失败')
      alert(`✅ ${data.message}`)
      loadCustomers()
    } else {
      // JSON import (existing logic)
      const text = await file.text()
      let data
      if (file.name.endsWith('.json')) {
        data = JSON.parse(text)
      } else {
        const startTag = '<' + 'script id="crmData"'
        const match = text.match(new RegExp(startTag + '[^>]*>([\\s\\S]*?)<\\/script>'))
        data = JSON.parse(match ? match[1] : text)
      }
      const res = await crmApi.request('/customers/import', {
        method: 'POST',
        body: JSON.stringify(data)
      })
      alert(`✅ ${res.message || '导入完成'}`)
      loadCustomers()
    }
  } catch (err) {
    alert('导入失败: ' + err.message)
  } finally {
    if (importFileInput.value) importFileInput.value.value = ''
  }
}

// watch for route query search (from Layout global search)
watch(() => route.query.search, (val) => {
  if (val !== undefined && val !== null && val !== '') {
    filters.search = val
    debouncedLoad()
  }
})

onMounted(() => {
  if (route.query.search) {
    filters.search = route.query.search
  }
  if (route.query.action === 'add') {
    openAddModal()
    router.replace({ query: {} })
  }
  loadCustomers()
  loadSendRecords()
})

watch(() => route.query.tab, () => {})
watch(selectedIds, (val) => {
  if (!val.length) allSelected.value = false
  else if (val.length === customers.value.length) allSelected.value = true
})

async function bulkMoveToPool() {
  if (!selectedIds.value.length) return
  if (!confirm(`确认将 ${selectedIds.value.length} 个客户移入公海池？`)) return
  try {
    await crmApi.request('/customers/pool/move', {
      method: 'POST',
      body: JSON.stringify({ ids: selectedIds.value })
    })
    alert('✅ 已移入公海池')
    selectedIds.value = []; allSelected.value = false
    loadCustomers()
  } catch (e) { alert(e.message) }
}

async function bulkEmailViaMailer(ids) {
  // Navigate to mailer with preselected customer ids via sessionStorage bridge
  try {
    sessionStorage.setItem('crm_mailer_recipients', JSON.stringify(ids))
    router.push(basePath.value + '/mailer')
  } catch (e) { alert('跳转失败: ' + e.message) }
}
</script>

<style scoped>
.page-head { margin-bottom: 16px; }
.filter-bar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; padding: 14px 16px; margin-bottom: 14px; }
.filter-search { min-width: 200px; flex: 1; max-width: 300px; }
.date { min-width: 130px; }

.selection-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; padding: 12px 16px; margin-bottom: 14px; border-left: 3px solid var(--crm-primary); }

.customer-list { display: flex; flex-direction: column; gap: 10px; }
.list-head {
  display: grid;
  grid-template-columns: 52px 1.4fr 0.9fr 1.6fr 1.2fr 1fr 0.8fr auto;
  gap: 12px; align-items: center;
  padding: 0 18px; color: var(--crm-text-3); font-weight: 600;
}
.head-check { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
.customer-row {
  display: grid;
  grid-template-columns: 52px 1.4fr 0.9fr 1.6fr 1.2fr 1fr 0.8fr auto;
  gap: 12px; align-items: center;
  padding: 14px 18px;
}
.customer-row.pool-row { background: #fafbfd; }
.customer-row.pool-row .name-cell { color: var(--crm-text-3); }
.row-check { display: flex; align-items: center; }
.col-name { display: flex; align-items: center; gap: 10px; min-width: 0; }
.name-cell { font-weight: 700; color: var(--crm-text); cursor: pointer; display: inline-flex; gap: 4px; align-items: baseline; min-width: 0; }
.name-cell em { font-weight: 500; color: var(--crm-text-2); font-style: normal; font-size: 12px; }
.name-cell:hover { color: var(--crm-primary); }
.col-country .crm-pill { cursor: pointer; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-country .crm-pill:hover { background: var(--crm-primary-soft); color: var(--crm-primary); }
.col-contact { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.ct-item { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--crm-text-2); cursor: pointer; min-width: 0; }
.ct-item:hover { color: var(--crm-primary); }
.ct-item.ct-copied { color: var(--crm-success); }
.ct-val { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ct-icon { font-style: normal; flex: none; width: 20px; text-align: center; font-size: 11px; }
.col-status { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.col-counts { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.count-pill {
  min-width: 26px; text-align: center;
  background: #f1f5f9; color: var(--crm-text);
  border-radius: 6px; padding: 1px 7px; font-size: 12px; font-weight: 600;
}
.col-owner { white-space: nowrap; }
.pool-owner { color: var(--crm-text-3); font-style: italic; }
.col-actions { display: flex; flex-direction: column; gap: 5px; }
.action-row { display: flex; gap: 5px; flex-wrap: wrap; justify-content: flex-end; }

.pagination { display: flex; align-items: center; gap: 12px; justify-content: center; margin-top: 18px; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
.tag-select { display: flex; gap: 14px; flex-wrap: wrap; }
.tag-option { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; color: var(--crm-text); cursor: pointer; }

.preview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; }
.preview-grid label, .preview-note label { display: block; font-size: 11px; color: var(--crm-text-3); font-weight: 600; margin-bottom: 2px; }
.preview-grid span { font-size: 13px; color: var(--crm-text); }
.preview-note { margin-top: 14px; padding: 10px 14px; background: var(--crm-bg); border-radius: var(--crm-radius-sm); }
.preview-note p { margin: 0; font-size: 13px; color: var(--crm-text-2); }

.company-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; font-size: 13px; }
.company-card {
  display: flex; align-items: center; gap: 14px;
  padding: 10px 14px; border: 1px solid var(--crm-border); border-radius: var(--crm-radius-sm);
  margin-bottom: 8px; font-size: 12.5px;
}
.company-card.excluded { opacity: 0.4; }
.cc-name { display: flex; flex-direction: column; min-width: 140px; }
.cc-company { color: var(--crm-text-3); font-size: 11px; }
.cc-contacts { display: flex; gap: 10px; flex-wrap: wrap; flex: 1; }
.cc-meta { display: flex; gap: 6px; align-items: center; }
.cc-owner { color: var(--crm-text-3); min-width: 60px; }

.records-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.records-table th, .records-table td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--crm-border); }
.records-table th { color: var(--crm-text-3); font-size: 11px; font-weight: 700; background: var(--crm-bg); position: sticky; top: 0; }
.records-table .nowrap { white-space: nowrap; }

@media (max-width: 1100px) {
  .list-head { display: none; }
  .customer-row { grid-template-columns: 40px 1fr; grid-auto-flow: row; gap: 8px; }
  .col-contact, .col-status, .col-counts, .col-owner, .col-actions { grid-column: 2; }
  .col-actions .action-row { justify-content: flex-start; }
}
</style>
