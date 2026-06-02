<template>
  <div class="crm-users-page">
    <div class="page-header">
      <h1>⚙️ 账户管理</h1>
      <button class="btn btn-primary" @click="openModal()">➕ 添加子账户</button>
    </div>

    <div class="table-wrap">
      <table v-if="users.length">
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
            <td>{{ u.email || '-' }}</td>
            <td><span :class="['role-badge', u.role]">{{ u.role === 'admin' ? '管理员' : '子账户' }}</span></td>
            <td><span :class="['status-dot', u.status ? 'active' : 'inactive']"></span> {{ u.status ? '启用' : '禁用' }}</td>
            <td>{{ formatDate(u.created_at) }}</td>
            <td>
              <button class="btn-sm btn-edit" @click="openModal(u)">编辑</button>
              <button class="btn-sm btn-danger" @click="handleDelete(u)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editId ? '编辑账户' : '添加子账户' }}</h3>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        <form @submit.prevent="handleSave">
          <div class="modal-body">
            <div class="form-group">
              <label>用户名 *</label>
              <input v-model="form.username" required :disabled="!!editId" />
            </div>
            <div class="form-group">
              <label>{{ editId ? '新密码（留空不修改）' : '密码 *' }}</label>
              <input v-model="form.password" type="password" :required="!editId" />
            </div>
            <div class="form-group">
              <label>显示名称 *</label>
              <input v-model="form.display_name" required placeholder="例如：Jameson" />
            </div>
            <div class="form-group">
              <label>邮箱</label>
              <input v-model="form.email" type="email" />
            </div>
            <div class="form-group">
              <label>角色</label>
              <select v-model="form.role">
                <option value="sub">子账户</option>
                <option value="admin">管理员</option>
              </select>
            </div>
            <div class="form-group">
              <label>状态</label>
              <select v-model="form.status">
                <option :value="1">启用</option>
                <option :value="0">禁用</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showModal = false">取消</button>
            <button type="submit" class="btn btn-primary">{{ editId ? '更新' : '保存' }}</button>
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

function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-' }

onMounted(loadUsers)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header h1 { margin: 0; font-size: 24px; }
.table-wrap { background: #fff; border-radius: 10px; overflow-x: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th { background: #f8fafc; padding: 12px; text-align: left; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; }
td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
.role-badge { padding: 3px 10px; border-radius: 10px; font-size: 12px; font-weight: 600; }
.role-badge.admin { background: #fef3c7; color: #92400e; }
.role-badge.sub { background: #eff6ff; color: #2563eb; }
.status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
.status-dot.active { background: #10b981; }
.status-dot.inactive { background: #ef4444; }
.btn-sm { padding: 4px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 4px; }
.btn-edit { background: #eff6ff; color: #2563eb; }
.btn-danger { background: #fef2f2; color: #dc2626; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; border-radius: 14px; width: 480px; max-width: 92vw; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e2e8f0; }
.modal-header h3 { margin: 0; }
.modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b; }
.modal-body { padding: 24px; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; margin-bottom: 4px; font-size: 13px; font-weight: 600; color: #334155; }
.form-group input, .form-group select { width: 100%; padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid #e2e8f0; }
.btn { padding: 9px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-primary { background: #2563eb; color: #fff; }
.btn-secondary { background: #f1f5f9; color: #334155; }
</style>
