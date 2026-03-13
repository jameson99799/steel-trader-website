<template>
  <div class="mailer-page">
    <h1>📤 批量发邮件</h1>

    <!-- Tabs -->
    <div class="tabs">
      <button :class="['tab', tab === 'templates' && 'active']" @click="tab='templates'">📝 模板</button>
      <button :class="['tab', tab === 'contacts' && 'active']" @click="tab='contacts'">👥 联系人</button>
      <button :class="['tab', tab === 'tasks' && 'active']" @click="tab='tasks'">🚀 发送任务</button>
      <button :class="['tab', tab === 'logs' && 'active']" @click="tab='logs'">📋 发送记录</button>
    </div>

    <!-- ═══ Templates Tab ═══ -->
    <div v-if="tab === 'templates'" class="tab-body">
      <div class="toolbar"><button class="btn btn-primary" @click="openTplEditor()">+ 新建模板</button></div>
      <div v-if="!templates.length" class="empty">暂无模板</div>
      <div v-for="t in templates" :key="t.id" class="list-card">
        <div class="lc-main">
          <strong>{{ t.name }}</strong>
          <span class="lc-sub">主题：{{ t.subject }}</span>
          <span v-if="t.note" class="lc-note">{{ t.note }}</span>
        </div>
        <div class="lc-actions">
          <button class="btn btn-sm btn-outline" @click="openTplEditor(t)">编辑</button>
          <button class="btn btn-sm btn-outline" @click="previewTpl(t)">预览</button>
          <button class="btn btn-sm btn-outline err-btn" @click="deleteTpl(t.id)">删除</button>
        </div>
      </div>
    </div>

    <!-- ═══ Contacts Tab ═══ -->
    <div v-if="tab === 'contacts'" class="tab-body">
      <div class="toolbar">
        <button class="btn btn-primary" @click="openContactEditor()">+ 添加联系人</button>
        <button class="btn btn-outline" @click="showImport = true">📥 批量导入</button>
      </div>
      <div v-if="!contacts.length" class="empty">暂无联系人</div>
      <table v-else class="data-table">
        <thead><tr><th><input type="checkbox" @change="toggleAllContacts" :checked="allContactsSelected" /></th><th>邮箱</th><th>姓名</th><th>公司</th><th>操作</th></tr></thead>
        <tbody><tr v-for="c in contacts" :key="c.id">
          <td><input type="checkbox" v-model="selectedContacts" :value="c.id" /></td>
          <td>{{ c.email }}</td><td>{{ c.name }}</td><td>{{ c.company }}</td>
          <td class="row-actions">
            <button class="btn btn-sm btn-outline" @click="openContactEditor(c)">编辑</button>
            <button class="btn btn-sm btn-outline err-btn" @click="deleteContact(c.id)">删除</button>
          </td>
        </tr></tbody>
      </table>
    </div>

    <!-- ═══ Tasks Tab ═══ -->
    <div v-if="tab === 'tasks'" class="tab-body">
      <div class="toolbar"><button class="btn btn-primary" @click="openTaskCreator">+ 创建发送任务</button></div>
      <div v-if="!tasks.length" class="empty">暂无任务</div>
      <div v-for="t in tasks" :key="t.id" class="list-card">
        <div class="lc-main">
          <strong>{{ t.name || '未命名任务' }}</strong>
          <span class="lc-sub">状态：<span :class="'status-'+t.status">{{ statusLabel(t.status) }}</span> | 进度：{{ t.sent_count }}/{{ t.total_count }}</span>
          <span class="lc-note">{{ new Date(t.created_at).toLocaleString('zh-CN') }}</span>
        </div>
        <div class="lc-actions">
          <button v-if="t.status==='pending'||t.status==='cancelled'" class="btn btn-sm btn-primary" @click="startTask(t.id)">▶ 开始</button>
          <button v-if="t.status==='running'" class="btn btn-sm btn-outline" style="color:#f59e0b" @click="stopTask(t.id)">⏸ 停止</button>
          <button class="btn btn-sm btn-outline" @click="viewLogs(t.id)">查看记录</button>
          <button class="btn btn-sm btn-outline err-btn" @click="deleteTask(t.id)">删除</button>
        </div>
      </div>
    </div>

    <!-- ═══ Logs Tab ═══ -->
    <div v-if="tab === 'logs'" class="tab-body">
      <div class="toolbar">
        <select v-model="logTaskFilter" class="form-control" style="width:250px" @change="loadLogs">
          <option value="">所有记录</option>
          <option v-for="t in tasks" :key="t.id" :value="t.id">{{ t.name || '任务#'+t.id }}</option>
        </select>
      </div>
      <div v-if="!logs.length" class="empty">暂无记录</div>
      <table v-else class="data-table">
        <thead><tr><th>收件人</th><th>主题</th><th>状态</th><th>发送时间</th></tr></thead>
        <tbody><tr v-for="l in logs" :key="l.id">
          <td>{{ l.contact_name ? l.contact_name+' <'+l.contact_email+'>' : l.contact_email }}</td>
          <td>{{ l.subject }}</td>
          <td>
            <span v-if="l.status==='sent' && !l.opened_at" class="check gray">✓✓</span>
            <span v-else-if="l.opened_at" class="check blue">✓✓</span>
            <span v-else-if="l.status==='failed'" class="check red">✗</span>
            <span v-else class="check gray">✓</span>
          </td>
          <td>{{ l.sent_at ? new Date(l.sent_at).toLocaleString('zh-CN') : '-' }}</td>
        </tr></tbody>
      </table>
    </div>

    <!-- ═══ Template Editor Modal ═══ -->
    <div class="modal-overlay" v-if="showTplEditor" @click.self="showTplEditor=false">
      <div class="modal-box modal-lg">
        <h3>{{ editTpl.id ? '编辑模板' : '新建模板' }}</h3>
        <div class="grid grid-2">
          <div class="form-group"><label>模板名称</label><input v-model="editTpl.name" class="form-control" placeholder="如：新产品推介" /></div>
          <div class="form-group"><label>邮件主题</label><input v-model="editTpl.subject" class="form-control" placeholder="支持 {{name}} {{company}} 变量" /></div>
        </div>
        <div class="form-group"><label>备注</label><input v-model="editTpl.note" class="form-control" placeholder="选填" /></div>
        <div class="form-group">
          <label>正文内容</label>
          <div class="editor-toolbar">
            <button @click="edCmd('bold')" title="粗体"><b>B</b></button>
            <button @click="edCmd('italic')" title="斜体"><i>I</i></button>
            <button @click="edCmd('underline')" title="下划线"><u>U</u></button>
            <span class="sep"></span>
            <button @click="edCmd('insertUnorderedList')" title="列表">•列表</button>
            <button @click="edCmd('insertOrderedList')" title="编号列表">1.列表</button>
            <span class="sep"></span>
            <button @click="insertLink" title="超链接">🔗</button>
            <button @click="insertImg" title="插入图片">🖼</button>
            <button @click="insertHr" title="签名分割线">─ 签名线</button>
            <span class="sep"></span>
            <button @click="edCmd('fontSize','5')" title="大字">A+</button>
            <button @click="edCmd('fontSize','2')" title="小字">A-</button>
            <button @click="edCmd('foreColor','#1e40af')" title="蓝色">🔵</button>
            <button @click="edCmd('foreColor','#dc2626')" title="红色">🔴</button>
          </div>
          <div ref="editorRef" class="rich-editor" contenteditable="true" @input="onEditorInput" @paste="onEditorPaste"></div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" @click="saveTpl" :disabled="savingTpl">{{ savingTpl ? '保存中...' : '💾 保存' }}</button>
          <button class="btn btn-outline" @click="showTplEditor=false">取消</button>
        </div>
      </div>
    </div>

    <!-- ═══ Contact Editor Modal ═══ -->
    <div class="modal-overlay" v-if="showContactEditor" @click.self="showContactEditor=false">
      <div class="modal-box">
        <h3>{{ editContact.id ? '编辑联系人' : '添加联系人' }}</h3>
        <div class="form-group"><label>邮箱 *</label><input v-model="editContact.email" class="form-control" type="email" /></div>
        <div class="grid grid-2">
          <div class="form-group"><label>姓名</label><input v-model="editContact.name" class="form-control" /></div>
          <div class="form-group"><label>公司</label><input v-model="editContact.company" class="form-control" /></div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" @click="saveContact">💾 保存</button>
          <button class="btn btn-outline" @click="showContactEditor=false">取消</button>
        </div>
      </div>
    </div>

    <!-- ═══ Import Modal ═══ -->
    <div class="modal-overlay" v-if="showImport" @click.self="showImport=false">
      <div class="modal-box">
        <h3>📥 批量导入联系人</h3>
        <div class="form-group">
          <label>每行一个，格式：邮箱,姓名,公司</label>
          <textarea v-model="importText" class="form-control" rows="8" placeholder="john@example.com,John,ACME Corp&#10;jane@example.com,Jane,XYZ Inc"></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" @click="doImport">导入</button>
          <button class="btn btn-outline" @click="showImport=false">取消</button>
        </div>
      </div>
    </div>

    <!-- ═══ Task Creator Modal ═══ -->
    <div class="modal-overlay" v-if="showTaskCreator" @click.self="showTaskCreator=false">
      <div class="modal-box modal-lg">
        <h3>🚀 创建发送任务</h3>
        <div class="form-group"><label>任务名称</label><input v-model="newTask.name" class="form-control" placeholder="如：3月产品推广" /></div>

        <div class="form-group">
          <label>选择模板（勾选多个则轮流发送）</label>
          <div class="check-list">
            <label v-for="t in templates" :key="t.id" class="check-item">
              <input type="checkbox" v-model="newTask.template_ids" :value="t.id" /> {{ t.name }} — {{ t.subject }}
            </label>
          </div>
        </div>

        <div class="form-group">
          <label>选择联系人</label>
          <div class="check-list" style="max-height:200px">
            <div class="check-item-header">
              <label><input type="checkbox" @change="toggleAllNewTaskContacts" :checked="newTaskAllContactsSel" /> 全选</label>
            </div>
            <label v-for="c in contacts" :key="c.id" class="check-item">
              <input type="checkbox" v-model="newTask.contact_ids" :value="c.id" /> {{ c.email }} {{ c.name ? '('+c.name+')' : '' }}
            </label>
          </div>
        </div>

        <div class="form-group">
          <label>选择发件账号（勾选多个则轮流使用）</label>
          <div class="check-list">
            <label v-for="a in smtpAccounts" :key="a.id" class="check-item">
              <input type="checkbox" v-model="newTask.account_ids" :value="a.id" /> {{ a.name }} ({{ a.smtp_user }})
            </label>
          </div>
        </div>

        <div class="grid grid-2">
          <div class="form-group"><label>最小间隔（秒）</label><input v-model.number="newTask.interval_min" class="form-control" type="number" min="1" /></div>
          <div class="form-group"><label>最大间隔（秒）</label><input v-model.number="newTask.interval_max" class="form-control" type="number" min="1" /></div>
        </div>

        <div class="form-group"><label>抄送（CC，留空则不抄送）</label><input v-model="newTask.cc" class="form-control" placeholder="boss@company.com" /></div>

        <div class="form-group">
          <label class="toggle-label"><input type="checkbox" v-model="newTask.read_receipt" /><span>请求已读回执（Disposition-Notification-To）</span></label>
          <p class="form-hint">对方邮件客户端会提示发送阅读回执，可被用户拒绝</p>
        </div>

        <div class="modal-actions">
          <button class="btn btn-primary" @click="createTask">🚀 创建任务</button>
          <button class="btn btn-outline" @click="showTaskCreator=false">取消</button>
        </div>
      </div>
    </div>

    <!-- ═══ Preview Modal ═══ -->
    <div class="modal-overlay" v-if="showPreview" @click.self="showPreview=false">
      <div class="modal-box modal-lg">
        <h3>📧 模板预览</h3>
        <div class="preview-frame" v-html="previewHtml"></div>
        <div class="modal-actions"><button class="btn btn-outline" @click="showPreview=false">关闭</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import api from '../../api'

const tab = ref('templates')
const templates = ref([])
const contacts = ref([])
const tasks = ref([])
const logs = ref([])
const smtpAccounts = ref([])
const selectedContacts = ref([])
const logTaskFilter = ref('')

// Template editor
const showTplEditor = ref(false)
const editTpl = reactive({ id: null, name: '', subject: '', html_body: '', note: '' })
const editorRef = ref(null)
const savingTpl = ref(false)

// Contact editor
const showContactEditor = ref(false)
const editContact = reactive({ id: null, email: '', name: '', company: '' })

// Import
const showImport = ref(false)
const importText = ref('')

// Task creator
const showTaskCreator = ref(false)
const newTask = reactive({ name: '', template_ids: [], contact_ids: [], account_ids: [], interval_min: 10, interval_max: 120, cc: '', read_receipt: true })

// Preview
const showPreview = ref(false)
const previewHtml = ref('')

const allContactsSelected = computed(() => contacts.value.length > 0 && selectedContacts.value.length === contacts.value.length)
const newTaskAllContactsSel = computed(() => contacts.value.length > 0 && newTask.contact_ids.length === contacts.value.length)

function statusLabel(s) { return { pending: '待发送', running: '发送中', done: '已完成', cancelled: '已取消', failed: '失败' }[s] || s }
function toggleAllContacts(e) { selectedContacts.value = e.target.checked ? contacts.value.map(c => c.id) : [] }
function toggleAllNewTaskContacts(e) { newTask.contact_ids = e.target.checked ? contacts.value.map(c => c.id) : [] }

async function loadAll() {
  const [tpl, ct, tk, accts] = await Promise.all([
    api.request('/mailer/templates'), api.request('/mailer/contacts'),
    api.request('/mailer/tasks'), api.request('/email/accounts')
  ])
  templates.value = tpl || []; contacts.value = ct || []; tasks.value = tk || []; smtpAccounts.value = accts || []
}
async function loadLogs() {
  const q = logTaskFilter.value ? `?task_id=${logTaskFilter.value}` : ''
  logs.value = await api.request('/mailer/logs' + q) || []
}
onMounted(() => { loadAll(); loadLogs() })

// ─── Template ────────────────────────────────────────────────────────────────
function openTplEditor(t) {
  Object.assign(editTpl, t || { id: null, name: '', subject: '', html_body: '', note: '' })
  showTplEditor.value = true
  nextTick(() => { if (editorRef.value) editorRef.value.innerHTML = editTpl.html_body || '' })
}
function onEditorInput() { editTpl.html_body = editorRef.value?.innerHTML || '' }
function onEditorPaste(e) {
  // Allow rich paste by default (like Foxmail)
  setTimeout(() => { editTpl.html_body = editorRef.value?.innerHTML || '' }, 50)
}
function edCmd(cmd, val) { document.execCommand(cmd, false, val || null); editorRef.value?.focus() }
function insertLink() {
  const url = prompt('输入链接地址：', 'https://'); if (url) edCmd('createLink', url)
}
function insertImg() {
  const url = prompt('输入图片URL：', 'https://'); if (url) edCmd('insertImage', url)
}
function insertHr() {
  edCmd('insertHTML', '<hr style="border:none;border-top:1px solid #ccc;margin:16px 0" />')
}
async function saveTpl() {
  savingTpl.value = true
  try {
    if (editTpl.id) {
      await api.request(`/mailer/templates/${editTpl.id}`, { method: 'PUT', body: JSON.stringify(editTpl) })
    } else {
      await api.request('/mailer/templates', { method: 'POST', body: JSON.stringify(editTpl) })
    }
    await loadAll(); showTplEditor.value = false
  } catch (e) { alert('保存失败: ' + e.message) }
  finally { savingTpl.value = false }
}
async function deleteTpl(id) { if (!confirm('确认删除？')) return; await api.request(`/mailer/templates/${id}`, { method: 'DELETE' }); await loadAll() }
function previewTpl(t) { previewHtml.value = t.html_body; showPreview.value = true }

// ─── Contacts ─────────────────────────────────────────────────────────────────
function openContactEditor(c) {
  Object.assign(editContact, c || { id: null, email: '', name: '', company: '' })
  showContactEditor.value = true
}
async function saveContact() {
  try {
    if (editContact.id) {
      await api.request(`/mailer/contacts/${editContact.id}`, { method: 'PUT', body: JSON.stringify(editContact) })
    } else {
      await api.request('/mailer/contacts', { method: 'POST', body: JSON.stringify(editContact) })
    }
    await loadAll(); showContactEditor.value = false
  } catch (e) { alert('保存失败: ' + e.message) }
}
async function deleteContact(id) { if (!confirm('确认删除？')) return; await api.request(`/mailer/contacts/${id}`, { method: 'DELETE' }); await loadAll() }
async function doImport() {
  const lines = importText.value.split('\n').map(l => l.trim()).filter(Boolean)
  if (!lines.length) return
  await api.request('/mailer/contacts/import', { method: 'POST', body: JSON.stringify({ lines }) })
  importText.value = ''; showImport.value = false; await loadAll()
}

// ─── Tasks ─────────────────────────────────────────────────────────────────
function openTaskCreator() {
  Object.assign(newTask, { name: '', template_ids: [], contact_ids: selectedContacts.value.slice(), account_ids: [], interval_min: 10, interval_max: 120, cc: '', read_receipt: true })
  showTaskCreator.value = true
}
async function createTask() {
  if (!newTask.template_ids.length) return alert('请选择至少一个模板')
  if (!newTask.contact_ids.length) return alert('请选择至少一个联系人')
  try {
    await api.request('/mailer/tasks', { method: 'POST', body: JSON.stringify(newTask) })
    showTaskCreator.value = false; await loadAll()
  } catch (e) { alert('创建失败: ' + e.message) }
}
async function startTask(id) { await api.request(`/mailer/tasks/${id}/start`, { method: 'POST' }); await loadAll() }
async function stopTask(id) { await api.request(`/mailer/tasks/${id}/stop`, { method: 'POST' }); await loadAll() }
async function deleteTask(id) { if (!confirm('确认删除？')) return; await api.request(`/mailer/tasks/${id}`, { method: 'DELETE' }); await loadAll() }
function viewLogs(taskId) { logTaskFilter.value = taskId; tab.value = 'logs'; loadLogs() }
</script>

<style scoped>
.mailer-page { padding: 0 }
h1 { font-size: 24px; font-weight: 700; margin-bottom: 24px; color: #1e293b }

/* Tabs */
.tabs { display: flex; gap: 4px; margin-bottom: 20px; background: #f1f5f9; border-radius: 10px; padding: 4px }
.tab { padding: 8px 18px; border: none; background: none; cursor: pointer; border-radius: 8px; font-size: 13px; font-weight: 600; color: #64748b; transition: all 0.15s }
.tab.active { background: #fff; color: #1e293b; box-shadow: 0 1px 3px rgba(0,0,0,0.08) }

.tab-body { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px }
.empty { text-align: center; color: #94a3b8; font-size: 14px; padding: 30px }

/* List cards */
.list-card { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid #f1f5f9 }
.list-card:last-child { border-bottom: none }
.lc-main { display: flex; flex-direction: column; gap: 3px }
.lc-main strong { font-size: 14px; color: #1e293b }
.lc-sub { font-size: 12px; color: #64748b }
.lc-note { font-size: 11px; color: #94a3b8 }
.lc-actions { display: flex; gap: 6px; flex-shrink: 0 }

/* Table */
.data-table { width: 100%; border-collapse: collapse; font-size: 13px }
.data-table th { background: #f8fafc; padding: 10px 12px; text-align: left; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0 }
.data-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9 }
.data-table tbody tr:hover { background: #f8fafc }
.row-actions { display: flex; gap: 6px }

/* Status */
.status-pending { color: #94a3b8 }
.status-running { color: #f59e0b; font-weight: 700 }
.status-done { color: #059669; font-weight: 700 }
.status-cancelled { color: #dc2626 }
.status-failed { color: #dc2626 }

/* Checks (read status) */
.check { font-weight: 700; font-size: 14px; letter-spacing: -2px }
.check.gray { color: #94a3b8 }
.check.blue { color: #3b82f6 }
.check.red { color: #dc2626 }

/* Form */
.grid { display: grid; gap: 14px }
.grid-2 { grid-template-columns: 1fr 1fr }
.form-group { margin-bottom: 12px }
.form-group label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 4px; color: #374151 }
.form-control { width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; box-sizing: border-box }
textarea.form-control { resize: vertical; font-family: inherit }
.form-hint { font-size: 11px; color: #94a3b8; margin: 3px 0 0 }
.toggle-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px }

/* Buttons */
.btn { padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; transition: all 0.15s }
.btn-primary { background: #3b82f6; color: #fff }
.btn-primary:hover { background: #2563eb }
.btn-outline { background: #fff; color: #374151; border: 1px solid #d1d5db }
.btn-outline:hover { background: #f9fafb }
.btn-sm { padding: 5px 12px; font-size: 12px }
.btn:disabled { opacity: 0.5; cursor: not-allowed }
.err-btn { color: #dc2626 !important; border-color: #fca5a5 !important }

/* Rich editor */
.editor-toolbar { display: flex; gap: 2px; flex-wrap: wrap; padding: 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-bottom: none; border-radius: 8px 8px 0 0 }
.editor-toolbar button { padding: 4px 8px; border: 1px solid #e2e8f0; background: #fff; border-radius: 4px; cursor: pointer; font-size: 12px; color: #374151; min-width: 30px }
.editor-toolbar button:hover { background: #eff6ff }
.editor-toolbar .sep { width: 1px; background: #e2e8f0; margin: 0 4px }
.rich-editor { min-height: 250px; max-height: 500px; overflow-y: auto; padding: 14px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; font-size: 14px; line-height: 1.7; outline: none }
.rich-editor:focus { border-color: #93c5fd }
.rich-editor img { max-width: 100%; cursor: pointer }

/* Modals */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000 }
.modal-box { background: #fff; border-radius: 14px; padding: 28px; width: 520px; max-width: 95vw; max-height: 90vh; overflow-y: auto }
.modal-lg { width: 700px }
.modal-box h3 { margin: 0 0 18px; font-size: 18px; font-weight: 700 }
.modal-actions { display: flex; gap: 10px; margin-top: 16px }

/* Check list */
.check-list { max-height: 160px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px }
.check-item { display: flex; align-items: center; gap: 8px; padding: 5px 8px; cursor: pointer; font-size: 13px; border-radius: 4px }
.check-item:hover { background: #f0f4ff }
.check-item-header { padding: 4px 8px; border-bottom: 1px solid #f1f5f9; margin-bottom: 2px }

/* Preview */
.preview-frame { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; max-height: 500px; overflow-y: auto }
</style>
