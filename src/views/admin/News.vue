<template>
  <div class="admin-page">
    <div class="page-header">
      <h2>📰 新闻管理</h2>
      <button class="btn btn-primary" @click="openCreate">+ 新建文章</button>
    </div>

    <div class="news-list">
      <table class="data-table" v-if="newsList.length">
        <thead>
          <tr>
            <th>封面</th><th>标题</th><th>状态</th><th>排序</th><th>创建时间</th><th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in newsList" :key="item.id">
            <td><img v-if="item.cover_image" :src="item.cover_image" class="thumb" /></td>
            <td>
              <div class="title-wrap">{{ item.title }}</div>
              <div class="title-en">{{ item.title_en }}</div>
            </td>
            <td><span :class="['status-badge', item.status ? 'active' : 'inactive']">{{ item.status ? '已发布' : '草稿' }}</span></td>
            <td>{{ item.sort_order }}</td>
            <td>{{ item.created_at?.substring(0,10) }}</td>
            <td class="actions">
              <button class="btn btn-sm btn-outline" @click="openEdit(item)">编辑</button>
              <button class="btn btn-sm btn-danger" @click="deleteItem(item.id)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">暂无文章，点击"新建文章"开始创建</div>
    </div>

    <!-- Modal -->
    <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
      <div class="modal-wrap">
        <div class="modal-header">
          <h3>{{ editId ? '编辑文章' : '新建文章' }}</h3>
          <button class="modal-close" @click="showModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-tabs">
            <button :class="['tab', activeTab === 'basic' ? 'active' : '']" @click="activeTab = 'basic'">基本信息</button>
            <button :class="['tab', activeTab === 'content' ? 'active' : '']" @click="activeTab = 'content'">文章内容</button>
            <button :class="['tab', activeTab === 'seo' ? 'active' : '']" @click="activeTab = 'seo'">SEO设置</button>
          </div>

          <!-- Basic Tab -->
          <div v-show="activeTab === 'basic'" class="tab-content">
            <div class="form-group">
              <label>标题（中文）<span class="req">*</span></label>
              <input v-model="form.title" class="form-control" placeholder="文章标题" />
            </div>
            <div class="form-group">
              <label>标题（英文）</label>
              <input v-model="form.title_en" class="form-control" placeholder="Article title in English" />
            </div>
            <div class="form-group">
              <label>摘要（中文）</label>
              <textarea v-model="form.summary" class="form-control" rows="3" placeholder="文章简介"></textarea>
            </div>
            <div class="form-group">
              <label>摘要（英文）</label>
              <textarea v-model="form.summary_en" class="form-control" rows="3" placeholder="Article summary in English"></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>封面图片</label>
                <input type="file" @change="handleCoverUpload" accept="image/*" class="form-control" />
                <img v-if="form.cover_preview" :src="form.cover_preview" class="preview-img" />
              </div>
              <div class="form-group">
                <label>发布状态</label>
                <select v-model="form.status" class="form-control">
                  <option :value="1">已发布</option>
                  <option :value="0">草稿</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>排序（数字越小越靠前）</label>
              <input v-model.number="form.sort_order" type="number" class="form-control" />
            </div>
          </div>


          <!-- Content Tab -->
          <div v-show="activeTab === 'content'" class="tab-content">
            <p class="form-hint">支持粘贴 HTML 代码、可视化编辑、点击图片替换、上传图片</p>
            <div class="editor-mode-bar">
              <div class="mode-tabs">
                <span :class="['mode-tab', newsEditorMode === 'visual' ? 'active' : '']" @click="switchNewsMode('visual')">✏️ 可视化编辑</span>
                <span :class="['mode-tab', newsEditorMode === 'html' ? 'active' : '']" @click="switchNewsMode('html')">📝 HTML代码</span>
                <span :class="['mode-tab', newsEditorMode === 'preview' ? 'active' : '']" @click="switchNewsMode('preview')">👁 预览</span>
              </div>
              <div class="editor-actions">
                <button type="button" class="editor-btn" @click="insertNewsImage">📷 插入图片</button>
                <button type="button" class="fullscreen-btn" @click="isFullscreen = !isFullscreen">
                  {{ isFullscreen ? '✕ 退出全屏' : '⛶ 全屏' }}
                </button>
              </div>
            </div>

            <div :class="['editor-wrap', isFullscreen ? 'is-fullscreen' : '']">
              <textarea
                v-if="newsEditorMode === 'html'"
                v-model="form.content"
                class="html-editor"
                placeholder="<div>&#10;  <h2>文章内容</h2>&#10;  <p>在此处粘贴 HTML 内容...</p>&#10;</div>"
                spellcheck="false"
              ></textarea>
              <div
                v-else-if="newsEditorMode === 'visual'"
                ref="newsVisualEl"
                class="visual-editor"
                contenteditable="true"
                @input="onNewsVisualInput"
                @click="onNewsVisualClick"
                @paste="onNewsVisualPaste"
              ></div>
              <div v-else class="html-preview" v-html="form.content"></div>
            </div>
            <input type="file" ref="newsImgInput" accept="image/*" style="display:none" @change="handleNewsImgUpload" />
          </div>

          <!-- SEO Tab -->
          <div v-show="activeTab === 'seo'" class="tab-content">
            <div class="form-group">
              <label>SEO标题</label>
              <input v-model="form.seo_title" class="form-control" placeholder="页面SEO标题，留空则使用文章标题" />
            </div>
            <div class="form-group">
              <label>SEO描述</label>
              <textarea v-model="form.seo_description" class="form-control" rows="3" placeholder="页面meta description（150字以内效果最佳）"></textarea>
              <small>{{ (form.seo_description || '').length }}/160 字符</small>
            </div>
            <div class="form-group">
              <label>SEO关键词</label>
              <input v-model="form.seo_keywords" class="form-control" placeholder="关键词1, 关键词2, 关键词3" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showModal = false">取消</button>
          <button class="btn btn-primary" @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存文章' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import api from '../../api'

const newsList = ref([])
const showModal = ref(false)
const editId = ref(null)
const saving = ref(false)
const activeTab = ref('basic')
const isFullscreen = ref(false)

// ─── Editor state ────────────────────────────────────────────────────────────
const newsEditorMode = ref('visual')
const newsVisualEl = ref(null)
const newsImgInput = ref(null)
let newsReplacingImg = null

const form = ref({
  title: '', title_en: '',
  summary: '', summary_en: '',
  cover_image: null, cover_preview: null,
  status: 1, sort_order: 0,
  seo_title: '', seo_description: '', seo_keywords: '',
  content: ''
})

async function loadNews() {
  try {
    const res = await api.getNews({ status: 'all', limit: 100 })
    newsList.value = res.data
  } catch(e) { console.error(e) }
}

// ─── Visual editor helpers ────────────────────────────────────────────────────
function syncNewsToVisual() {
  if (newsVisualEl.value) {
    newsVisualEl.value.innerHTML = form.value.content || '<p>在此处编辑文章内容，或切换到 HTML 代码模式粘贴 HTML...</p>'
  }
}

function syncNewsFromVisual() {
  if (newsVisualEl.value) {
    form.value.content = newsVisualEl.value.innerHTML
  }
}

async function switchNewsMode(mode) {
  if (newsEditorMode.value === 'visual') syncNewsFromVisual()
  newsEditorMode.value = mode
  if (mode === 'visual') {
    await nextTick()
    syncNewsToVisual()
  }
}

function onNewsVisualInput() { syncNewsFromVisual() }

function onNewsVisualClick(e) {
  const img = e.target.closest('img')
  if (img) {
    e.preventDefault()
    newsVisualEl.value.querySelectorAll('img').forEach(i => i.style.outline = '')
    img.style.outline = '3px solid #3b82f6'
    newsReplacingImg = img
    newsImgInput.value?.click()
  }
}

async function onNewsVisualPaste(e) {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      if (file) {
        try {
          const res = await api.upload(file)
          document.execCommand('insertImage', false, res.url)
          syncNewsFromVisual()
        } catch (err) { alert('图片上传失败: ' + err.message) }
      }
      return
    }
  }
  setTimeout(() => syncNewsFromVisual(), 50)
}

function insertNewsImage() {
  newsReplacingImg = null
  newsImgInput.value?.click()
}

async function handleNewsImgUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const res = await api.upload(file)
    if (newsReplacingImg) {
      newsReplacingImg.src = res.url
      newsReplacingImg.style.outline = ''
      newsReplacingImg = null
      syncNewsFromVisual()
    } else if (newsEditorMode.value === 'visual' && newsVisualEl.value) {
      newsVisualEl.value.focus()
      document.execCommand('insertImage', false, res.url)
      syncNewsFromVisual()
    } else {
      form.value.content = (form.value.content || '') + `\n<img src="${res.url}" style="max-width:100%" />\n`
    }
  } catch (err) { alert('图片上传失败: ' + err.message) }
  if (newsImgInput.value) newsImgInput.value.value = ''
}

// ─── Modal open/close ─────────────────────────────────────────────────────────
async function openCreate() {
  editId.value = null
  form.value = { title: '', title_en: '', summary: '', summary_en: '', cover_image: null, cover_preview: null, status: 1, sort_order: 0, seo_title: '', seo_description: '', seo_keywords: '', content: '' }
  activeTab.value = 'basic'
  newsEditorMode.value = 'visual'
  newsReplacingImg = null
  isFullscreen.value = false
  showModal.value = true
}

async function openEdit(item) {
  editId.value = item.id
  form.value = {
    title: item.title || '', title_en: item.title_en || '',
    summary: item.summary || '', summary_en: item.summary_en || '',
    cover_image: null, cover_preview: item.cover_image || null,
    status: item.status ?? 1, sort_order: item.sort_order || 0,
    seo_title: item.seo_title || '', seo_description: item.seo_description || '',
    seo_keywords: item.seo_keywords || '', content: item.content || ''
  }
  activeTab.value = 'basic'
  newsEditorMode.value = 'visual'
  newsReplacingImg = null
  isFullscreen.value = false
  showModal.value = true
}

function handleCoverUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  form.value.cover_image = file
  form.value.cover_preview = URL.createObjectURL(file)
}

async function save() {
  if (!form.value.title) return alert('请填写文章标题')
  // Sync from visual editor if currently in that mode
  if (newsEditorMode.value === 'visual') syncNewsFromVisual()
  saving.value = true
  try {
    const fd = new FormData()
    fd.append('title', form.value.title)
    fd.append('title_en', form.value.title_en || '')
    fd.append('summary', form.value.summary || '')
    fd.append('summary_en', form.value.summary_en || '')
    fd.append('content', form.value.content || '')
    fd.append('status', form.value.status)
    fd.append('sort_order', form.value.sort_order)
    fd.append('seo_title', form.value.seo_title || '')
    fd.append('seo_description', form.value.seo_description || '')
    fd.append('seo_keywords', form.value.seo_keywords || '')
    if (form.value.cover_image) fd.append('cover_image', form.value.cover_image)

    if (editId.value) {
      await api.updateNews(editId.value, fd)
    } else {
      await api.createNews(fd)
    }
    showModal.value = false
    await loadNews()
  } catch(e) { alert(e.message) }
  saving.value = false
}

async function deleteItem(id) {
  if (!confirm('确认删除这篇文章吗？')) return
  await api.deleteNews(id)
  await loadNews()
}

onMounted(loadNews)
</script>

<style scoped>
.admin-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h2 { font-size: 22px; font-weight: 700; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border); font-size: 14px; }
.data-table th { background: var(--gray-50); font-weight: 600; }
.thumb { width: 60px; height: 40px; object-fit: cover; border-radius: 4px; }
.title-wrap { font-weight: 600; color: var(--text-primary); }
.title-en { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.status-badge { padding: 3px 8px; border-radius: 99px; font-size: 12px; font-weight: 600; }
.active { background: #dcfce7; color: #15803d; }
.inactive { background: var(--gray-100); color: var(--text-muted); }
.actions { display: flex; gap: 8px; }
.empty { text-align: center; padding: 40px; color: var(--text-muted); }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-wrap { background: white; border-radius: 12px; width: 100%; max-width: 860px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; }
.modal-header { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
.modal-header h3 { font-size: 18px; font-weight: 700; }
.modal-close { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--text-muted); }
.modal-body { padding: 24px; overflow-y: auto; flex: 1; }
.modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; gap: 12px; justify-content: flex-end; }

.form-tabs { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 2px solid var(--border); }
.tab { padding: 8px 18px; border: none; background: none; cursor: pointer; font-weight: 600; color: var(--text-muted); border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
.tab.active { color: var(--primary); border-bottom-color: var(--primary); }

.tab-content { min-height: 300px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-weight: 600; font-size: 14px; margin-bottom: 6px; color: var(--text-primary); }
.form-group small { color: var(--text-muted); font-size: 12px; }
.form-control { width: 100%; padding: 10px 12px; border: 2px solid var(--border); border-radius: 6px; font-size: 14px; box-sizing: border-box; }
.form-control:focus { outline: none; border-color: var(--primary); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.req { color: red; }
.preview-img { width: 100%; max-height: 140px; object-fit: cover; margin-top: 8px; border-radius: 6px; }

/* Quill wrapper */
.quill-wrap { min-height: 280px; }
:deep(.ql-container) { min-height: 240px; font-size: 15px; }

/* ── Editor mode bar ──────────────────────────────────────── */
.editor-mode-bar {
  display: flex; align-items: center; justify-content: space-between;
  background: #f8fafc; border: 1px solid var(--border);
  border-radius: 8px 8px 0 0; padding: 8px 12px;
  margin-bottom: 0;
}

.mode-tabs { display: flex; gap: 4px; }
.mode-tab {
  padding: 6px 14px; border: none; background: transparent;
  border-radius: 6px; font-size: 13px; font-weight: 600;
  cursor: pointer; color: var(--text-muted); transition: all 0.18s;
}
.mode-tab.active { background: white; color: var(--primary); box-shadow: 0 1px 4px rgba(0,0,0,.1); }

.fullscreen-btn {
  padding: 5px 12px; border: 1.5px solid var(--border); border-radius: 6px;
  background: white; font-size: 12px; font-weight: 600;
  cursor: pointer; color: var(--text-muted); transition: all 0.18s;
}
.fullscreen-btn:hover { border-color: var(--primary); color: var(--primary); }

/* ── Editor wrap — normal and fullscreen ─────────────────── */
.editor-wrap { border: 1px solid var(--border); border-top: none; border-radius: 0 0 8px 8px; }

.editor-wrap.is-fullscreen {
  position: fixed; inset: 0; z-index: 99999;
  border-radius: 0; border: none;
  display: flex; flex-direction: column;
  background: white; padding: 20px;
  overflow-y: auto;
}

.editor-wrap.is-fullscreen .quill-wrap,
.editor-wrap.is-fullscreen .block-editor {
  flex: 1; height: calc(100vh - 100px);
}

.editor-wrap.is-fullscreen :deep(.ql-container) {
  max-height: none; height: 100%;
}

/* ── Block editor ─────────────────────────────────────────── */
.block-editor {
  padding: 16px; min-height: 400px;
  display: flex; flex-direction: column; gap: 8px;
}

.block-row { position: relative; }

.block-controls-row {
  display: flex; align-items: flex-start; gap: 8px;
}

.block-handle {
  flex-shrink: 0; width: 20px; padding-top: 10px;
  color: #cbd5e1; cursor: grab; font-size: 12px;
  letter-spacing: -3px; user-select: none;
}

.block-del {
  flex-shrink: 0; width: 26px; height: 26px; margin-top: 6px;
  background: none; border: 1px solid #e5e7eb; border-radius: 50%;
  cursor: pointer; color: #94a3b8; font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s; flex-shrink: 0;
}
.block-del:hover { background: #fee2e2; border-color: #ef4444; color: #ef4444; }

.block-input {
  flex: 1; border: none; outline: none; resize: none;
  font-family: inherit; width: 100%;
  padding: 8px 0; background: transparent;
  border-bottom: 1px solid transparent;
  transition: border-color 0.15s;
}
.block-input:focus { border-bottom-color: var(--primary); }

.block-h1 { font-size: 26px; font-weight: 700; color: #0f172a; }
.block-h2 { font-size: 20px; font-weight: 700; color: #1e293b; }
.block-p { font-size: 16px; line-height: 1.7; color: #374151; }
.block-quote {
  font-size: 16px; line-height: 1.6; color: #475569;
  padding-left: 16px; border-left: 4px solid #0077b5;
  font-style: italic;
}
.block-hr { flex: 1; height: 2px; background: #e5e7eb; border: none; margin-top: 12px; }

/* Image block */
.block-image-row { flex-direction: column; padding: 8px 0; }
.block-image-wrap { width: 100%; display: flex; flex-direction: column; align-items: center; }
.block-img { max-width: 100%; max-height: 400px; object-fit: contain; border-radius: 6px; }
.block-img-caption-wrap { width: 100%; text-align: center; margin-top: 6px; }
.block-caption-input {
  text-align: center; border: none; border-bottom: 1px dashed #cbd5e1;
  outline: none; font-size: 13px; color: #64748b; width: 60%;
  padding: 4px 0; background: transparent;
}
.block-caption-input:focus { border-bottom-color: var(--primary); }
.block-caption-input::placeholder { color: #cbd5e1; }

/* Add block row */
.add-block-row {
  display: flex; flex-wrap: wrap; gap: 8px;
  padding: 12px 0; border-top: 1px dashed #e2e8f0; margin-top: 8px;
}
.add-block-btn {
  padding: 6px 14px; border: 1.5px dashed #cbd5e1; border-radius: 20px;
  background: transparent; font-size: 13px; color: #64748b;
  cursor: pointer; transition: all 0.15s; font-weight: 500;
}
.add-block-btn:hover { border-color: #0077b5; color: #0077b5; background: #eff8ff; }


/* Sticky Quill toolbar — stays at top of modal body when scrolling */
:deep(.ql-toolbar.ql-snow) {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  border-bottom: 2px solid #e5e7eb;
  border-top: none;
  border-left: none;
  border-right: none;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
}

/* Image grid buttons labels */
:deep(.ql-image-grid-2::before) { content: '2⊞'; font-size: 13px; font-weight: 700; }
:deep(.ql-image-grid-3::before) { content: '3⊞'; font-size: 13px; font-weight: 700; }
:deep(.ql-image-grid-4::before) { content: '4⊞'; font-size: 13px; font-weight: 700; }
:deep(.ql-image-grid-2),
:deep(.ql-image-grid-3),
:deep(.ql-image-grid-4) {
  width: auto !important;
  padding: 2px 6px !important;
  border-radius: 4px;
  background: #f0f4ff;
  color: #3b82f6 !important;
  font-weight: 700;
  margin: 0 1px;
}
:deep(.ql-image-grid-2:hover),
:deep(.ql-image-grid-3:hover),
:deep(.ql-image-grid-4:hover) { background: #3b82f6; color: white !important; }

/* Images auto-fit container */
:deep(.ql-editor) img {
  max-width: 100%;
  height: auto;
}

/* Tables display with borders */
:deep(.ql-editor) table,
:deep(.ql-editor) td,
:deep(.ql-editor) th {
  border: 1px solid #d1d5db;
  border-collapse: collapse;
  padding: 6px 10px;
}

/* Limit editor height so toolbar stays visible */
:deep(.ql-container) {
  max-height: 60vh;
  overflow-y: auto;
}

.btn { padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; border: none; font-size: 14px; transition: all 0.2s; }
.btn-primary { background: var(--primary); color: white; }
.btn-outline { background: white; color: var(--primary); border: 2px solid var(--primary); }
.btn-danger { background: white; color: var(--danger); border: 2px solid var(--danger); }
.btn-sm { padding: 5px 10px; font-size: 12px; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
