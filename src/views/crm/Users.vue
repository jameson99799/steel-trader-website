<template>
  <div class="crm-page crm-users-page">
    <div class="crm-between page-head">
      <div>
        <h1 class="crm-page-title">⚙️ 账户管理</h1>
        <p class="crm-page-sub">CRM 子账户与管理员</p>
      </div>
      <button class="crm-btn crm-btn-primary" @click="openModal()">＋ 添加子账户</button>
    </div>

    <div class="crm-card" style="padding:0;overflow-x:auto" v-if="users.length">
      <table class="users-table">
        <thead>
          <tr>
            <th>用户名</th>
            <th>显示名称</th>
            <th>邮箱</th>
            <th>角色</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td><strong>{{ u.username }}</strong></td>
            <td>{{ u.display_name }}</td>
            <td>{{ u.email || '—' }}</td>
            <td><span :class="['crm-badge', u.role === 'admin' ? 'crm-badge-dev' : 'crm-badge-info']">{{ u.role === 'admin' ? '管理员' : '子账户' }}</span></td>
            <td>
              <span class="status-line" :class="u.status ? 'on' : 'off'">
                <i class="dot"></i>{{ u.status ? '启用' : '禁用' }}
              </span>
            </td>
            <td class="crm-small crm-muted">{{ formatDate(u.created_at) }}</td>
            <td>
              <button class="crm-btn crm-btn-outline crm-btn-sm" @click="openModal(u)">编辑</button>
              <button class="crm-btn crm-btn-danger crm-btn-sm" @click="handleDelete(u)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="crm-card crm-empty" v-else><span class="crm-empty-icon">⚙️</span>暂无账户</div>

    <!-- Modal -->
    <div v-if="showModal" class="crm-modal-overlay" @click.self="showModal = false">
      <div class="crm-modal">
        <div class="crm-modal-head">
          <h3>{{ editId ? '编辑账户' : '添加子账户' }}</h3>
          <button class="crm-modal-close" @click="showModal = false">&times;</button>
        </div>
        <form @submit.prevent="handleSave">
          <div class="crm-modal-body">
            <div class="crm-field">
              <label>用户名 *</label>
              <input class="crm-input" v-model="form.username" required :disabled="!!editId" />
            </div>
            <div class="crm-field">
              <label>{{ editId ? '新密码（留空不修改）' : '密码 *' }}</label>
              <input class="crm-input" v-model="form.password" type="password" :required="!editId" />
            </div>
            <div class="crm-field">
              <label>显示名称 *</label>
              <input class="crm-input" v-model="form.display_name" required placeholder="例如：Jameson" />
            </div>
            <div class="crm-field">
              <label>邮箱</label>
              <input class="crm-input" v-model="form.email" type="email" />
            </div>
            <div class="crm-field">
              <label>角色</label>
              <select class="crm-select" v-model="form.role">
                <option value="sub">子账户</option>
                <option value="admin">管理员</option>
              </select>
            </div>
            <div class="crm-field">
              <label>状态</label>
              <select class="crm-select" v-model="form.status">
                <option :value="1">启用</option>
                <option :value="0">禁用</option>
              </select>
            </div>
          </div>
          <div class="crm-modal-foot">
            <button type="button" class="crm-btn crm-btn-outline" @click="showModal = false">取消</button>
            <button type="submit" class="crm-btn crm-btn-primary">{{ editId ? '更新' : '保存' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import crmApi from '../../api/crm'

const users = ref([])
const showModal = ref(false)
const editId = ref(null)
const form = reactive({ username: '', password: '', display_name: '', email: '', role: 'sub', status: 1 })

async function loadUsers() {
  try {
    // Use admin token for this endpoint
    const token = localStorage.getItem('token') || crmApi.getToken()
    const res = await fetch('/api/crm/users', { headers: { 'Authorization': `Bearer ${token}` } })
    users.value = await res.json()
  } catch (e) { console.error(e) }
}

function openModal(u) {
  editId.value = u?.id || null
  form.username = u?.username || ''
  form.password = ''
  form.display_name = u?.display_name || ''
  form.email = u?.email || ''
  form.role = u?.role || 'sub'
  form.status = u?.status ?? 1
  showModal.value = true
}

async function handleSave() {
  try {
    const token = localStorage.getItem('token') || crmApi.getToken()
    const body = { ...form }
    if (!body.password) delete body.password
    const url = editId.value ? `/api/crm/users/${editId.value}` : '/api/crm/users'
    const res = await fetch(url, {
      method: editId.value ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    showModal.value = false
    loadUsers()
  } catch (e) { alert(e.message) }
}

async function handleDelete(u) {
  if (!confirm(`确定删除账户 "${u.display_name}"？其客户将变为无主。`)) return
  try {
    const token = localStorage.getItem('token') || crmApi.getToken()
    await fetch(`/api/crm/users/${u.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
    loadUsers()
  } catch (e) { alert(e.message) }
}

function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '—' }

onMounted(loadUsers)
</script>

<style scoped>
.users-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.users-table th { text-align: left; padding: 12px 16px; color: var(--crm-text-3); font-size: 11px; font-weight: 700; background: var(--crm-bg); border-bottom: 1px solid var(--crm-border); white-space: nowrap; }
.users-table td { padding: 12px 16px; border-bottom: 1px solid var(--crm-border); }
.users-table tr:last-child td { border-bottom: none; }
.status-line { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; }
.status-line .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.status-line.on .dot { background: var(--crm-success); }
.status-line.off .dot { background: var(--crm-danger); }
.status-line.off { color: var(--crm-danger); }
</style>
