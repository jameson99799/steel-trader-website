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
            <div class="form-group">
              <label>文章正文（支持富文本编辑）</label>
              <div class="quill-wrap" ref="quillEl"></div>
            </div>
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
import { ref, onMounted, nextTick, watch } from 'vue'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import ImageResize from 'quill-resize-image'
Quill.register('modules/imageResize', ImageResize)
import { setupImageGrid, injectGridStyles } from '../../utils/quillImageGrid'
import api from '../../api'

const newsList = ref([])
const showModal = ref(false)
const editId = ref(null)
const saving = ref(false)
const activeTab = ref('basic')
const quillEl = ref(null)
let quillInstance = null

const form = ref({
  title: '', title_en: '',
  summary: '', summary_en: '',
  cover_image: null, cover_preview: null,
  status: 1, sort_order: 0,
  seo_title: '', seo_description: '', seo_keywords: ''
})

async function loadNews() {
  try {
    const res = await api.getNews({ status: 'all', limit: 100 })
    newsList.value = res.data
  } catch(e) { console.error(e) }
}

// Watch activeTab: when user switches to content tab, mount Quill in the now-visible div
watch(activeTab, async (tab) => {
  if (tab === 'content') {
    await nextTick()
    if (!quillEl.value) return
    if (!quillInstance) {
      injectGridStyles()
      quillInstance = new Quill(quillEl.value, {
        theme: 'snow',
        modules: {
          toolbar: {
            container: [
              [{ header: [1, 2, 3, false] }],
              ['bold', 'italic', 'underline', 'strike'],
              [{ color: [] }, { background: [] }],
              [{ list: 'ordered' }, { list: 'bullet' }],
              [{ align: [] }],
              ['link', 'image', 'video'],
              ['blockquote', 'code-block'],
              ['image-grid-2', 'image-grid-3', 'image-grid-4'],
              ['clean']
            ]
          },
          imageResize: { displaySize: true }
        }
      })
      setupImageGrid(quillInstance)
      // Custom image upload handler — uploads to server instead of base64/URL prompt
      const toolbar = quillInstance.getModule('toolbar')
      toolbar.addHandler('image', () => {
        const input = document.createElement('input')
        input.setAttribute('type', 'file')
        input.setAttribute('accept', 'image/*')
        input.click()
        input.onchange = async () => {
          const file = input.files[0]
          if (!file) return
          try {
            const res = await api.upload(file)
            const range = quillInstance.getSelection(true)
            quillInstance.insertEmbed(range.index, 'image', res.url)
            quillInstance.setSelection(range.index + 1)
          } catch (e) {
            alert('图片上传失败: ' + e.message)
          }
        }
      })
    }
    // Set content from form
    const currentContent = form.value.content || ''
    if (quillInstance.root.innerHTML !== currentContent) {
      quillInstance.root.innerHTML = currentContent
    }
  }
})

function destroyQuill() {
  // Reset Quill when modal closes so it re-mounts fresh on next open
  quillInstance = null
  if (quillEl.value) quillEl.value.innerHTML = ''
}

function openCreate() {
  editId.value = null
  form.value = { title: '', title_en: '', summary: '', summary_en: '', cover_image: null, cover_preview: null, status: 1, sort_order: 0, seo_title: '', seo_description: '', seo_keywords: '', content: '' }
  activeTab.value = 'basic'
  destroyQuill()
  showModal.value = true
}

function openEdit(item) {
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
  destroyQuill()
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
  saving.value = true
  try {
    const content = quillInstance ? quillInstance.root.innerHTML : (form.value.content || '')
    const fd = new FormData()
    fd.append('title', form.value.title)
    fd.append('title_en', form.value.title_en || '')
    fd.append('summary', form.value.summary || '')
    fd.append('summary_en', form.value.summary_en || '')
    fd.append('content', content)
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

.btn { padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; border: none; font-size: 14px; transition: all 0.2s; }
.btn-primary { background: var(--primary); color: white; }
.btn-outline { background: white; color: var(--primary); border: 2px solid var(--primary); }
.btn-danger { background: white; color: var(--danger); border: 2px solid var(--danger); }
.btn-sm { padding: 5px 10px; font-size: 12px; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
