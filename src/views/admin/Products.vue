<template>
  <div class="products-page">
    <div class="page-header">
      <h1>商品管理</h1>
      <button class="btn btn-primary" @click="openModal()">添加商品</button>
    </div>

    <div class="card">
      <div class="card-body">
        <table class="table" v-if="products.length">
          <thead>
            <tr>
              <th>图片</th>
              <th>名称</th>
              <th>分类</th>
              <th>推荐</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in products" :key="product.id">
              <td>
                <img :src="product.images?.split(',')[0] || '/placeholder.svg'" class="product-thumb" />
              </td>
              <td>{{ product.name }}</td>
              <td>{{ product.category_name || '-' }}</td>
              <td>
                <span :class="['badge', product.is_featured ? 'badge-success' : 'badge-secondary']">
                  {{ product.is_featured ? '是' : '否' }}
                </span>
              </td>
              <td>
                <span :class="['badge', product.status ? 'badge-success' : 'badge-warning']">
                  {{ product.status ? '上架' : '下架' }}
                </span>
              </td>
              <td>
                <button class="btn btn-sm btn-secondary" @click="openModal(product)">编辑</button>
                <button class="btn btn-sm btn-outline" @click="duplicateProduct(product)" style="color:#0077b5;border-color:#0077b5;">复制</button>
                <button class="btn btn-sm btn-danger" @click="handleDelete(product)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="text-center" style="color: var(--secondary);">暂无商品</p>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal" style="max-width: 800px;">
        <div class="modal-header">
          <h3>{{ editingProduct ? '编辑商品' : '添加商品' }}</h3>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        <form @submit.prevent="handleSubmit">
          <div class="modal-body">
            <div class="grid grid-2">
              <div class="form-group">
                <label>商品名称（中文）*</label>
                <input v-model="form.name" type="text" class="form-control" required />
              </div>
              <div class="form-group">
                <label>商品名称（英文）</label>
                <input v-model="form.name_en" type="text" class="form-control" />
              </div>
            </div>
            <div class="form-group">
              <label>所属分类</label>
              <select v-model="form.category_id" class="form-control">
                <option :value="null">请选择</option>
                <option v-for="cat in flatCategories" :key="cat.id" :value="cat.id">
                  {{ cat.prefix }}{{ cat.name }}
                </option>
              </select>
            </div>
            <div class="grid grid-2">
              <div class="form-group">
                <label>商品描述（中文）</label>
                <textarea v-model="form.description" class="form-control"></textarea>
              </div>
              <div class="form-group">
                <label>商品描述（英文）</label>
                <textarea v-model="form.description_en" class="form-control"></textarea>
              </div>
            </div>
            <div class="form-group">
              <label>规格参数</label>
              <div v-for="(spec, index) in specs" :key="index" class="spec-row">
                <input v-model="spec.name" placeholder="参数名" class="form-control" />
                <input v-model="spec.value" placeholder="参数值" class="form-control" />
                <button type="button" class="btn btn-sm btn-danger" @click="specs.splice(index, 1)">删除</button>
              </div>
              <button type="button" class="btn btn-sm btn-secondary" @click="specs.push({ name: '', value: '' })">添加规格</button>
            </div>
            <div class="form-group">
              <label>商品图片</label>
              <p class="form-hint">建议尺寸：800×800px，JPG/PNG格式，支持多图上传（最多10张）</p>
              <input type="file" multiple @change="handleFileChange" accept="image/*" />
              <div class="image-preview" v-if="existingImages.length">
                <p class="form-hint">拖动图片可排序；第一张为主图（⭐点击设为主图）</p>
                <div
                  v-for="(img, index) in existingImages"
                  :key="img"
                  class="preview-item"
                  draggable="true"
                  @dragstart="dragStart(index)"
                  @dragover.prevent
                  @drop="dragDrop(index)"
                  :class="{ 'is-main': index === 0 }"
                >
                  <img :src="img" />
                  <span v-if="index === 0" class="main-badge">主图</span>
                  <button type="button" class="btn-main" @click="setMain(index)" :title="'设为主图'">⭐</button>
                  <button type="button" class="btn-del" @click="existingImages.splice(index, 1)">×</button>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label>产品详情（HTML源代码）</label>
              <p class="form-hint">直接粘贴 HTML 代码，支持完整的 HTML 标签、图片、表格、样式等</p>

              <div class="editor-mode-bar">
                <div class="mode-tabs">
                  <span :class="['mode-tab', !htmlPreview ? 'active' : '']" @click="htmlPreview = false">📝 HTML代码</span>
                  <span :class="['mode-tab', htmlPreview ? 'active' : '']" @click="htmlPreview = true">👁 预览</span>
                </div>
                <button type="button" class="fullscreen-btn" @click="prodFullscreen = !prodFullscreen">
                  {{ prodFullscreen ? '✕ 退出全屏' : '⛶ 全屏' }}
                </button>
              </div>

              <div :class="['editor-wrap', prodFullscreen ? 'is-fullscreen' : '']">
                <textarea
                  v-if="!htmlPreview"
                  v-model="form.detail_content"
                  class="html-editor"
                  placeholder='<div>\n  <h2>产品特点</h2>\n  <p>在此处粘贴您的 HTML 内容...</p>\n  <img src="/uploads/xxx.jpg" />\n</div>'
                  spellcheck="false"
                ></textarea>
                <div v-else class="html-preview" v-html="form.detail_content"></div>
              </div>
            </div>
            <div class="grid grid-3">
              <div class="form-group">
                <label>首页推荐</label>
                <select v-model="form.is_featured" class="form-control">
                  <option :value="0">否</option>
                  <option :value="1">是</option>
                </select>
              </div>
              <div class="form-group">
                <label>状态</label>
                <select v-model="form.status" class="form-control">
                  <option :value="1">上架</option>
                  <option :value="0">下架</option>
                </select>
              </div>
              <div class="form-group">
                <label>排序</label>
                <input v-model="form.sort_order" type="number" class="form-control" />
              </div>
            </div>

            <!-- SEO Settings Section -->
            <div class="seo-section">
              <h4 class="seo-section-title">🔍 SEO设置（可选）</h4>
              <div class="form-group">
                <label>SEO标题 <span class="hint">留空则使用商品名称</span></label>
                <input v-model="form.seo_title" type="text" class="form-control" placeholder="例：LED Strip Lights - High Quality LED Manufacturer" />
              </div>
              <div class="form-group">
                <label>SEO描述 <span class="hint">建议150字符以内</span></label>
                <textarea v-model="form.seo_description" class="form-control" rows="2" placeholder="对这个商品的简短描述，显示在Google搜索结果中"></textarea>
                <small>{{ (form.seo_description||'').length }}/160</small>
              </div>
              <div class="form-group">
                <label>SEO关键词</label>
                <input v-model="form.seo_keywords" type="text" class="form-control" placeholder="关键词1, 关键词2, 关键词3" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showModal = false">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="loading">保存</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import api from '../../api'

const products = ref([])
const categories = ref([])
const showModal = ref(false)
const editingProduct = ref(null)
const loading = ref(false)
const imageFiles = ref([])
const existingImages = ref([])
const specs = ref([])
const prodFullscreen = ref(false)
const htmlPreview = ref(false)

const form = reactive({
  name: '',
  name_en: '',
  category_id: null,
  description: '',
  description_en: '',
  detail_content: '',
  is_featured: 0,
  status: 1,
  sort_order: 0,
  seo_title: '',
  seo_description: '',
  seo_keywords: ''
})

const flatCategories = computed(() => {
  const result = []
  const flatten = (cats, prefix = '') => {
    cats.forEach(cat => {
      result.push({ ...cat, prefix })
      if (cat.children?.length) {
        flatten(cat.children, prefix + '-- ')
      }
    })
  }
  flatten(categories.value)
  return result
})

const loadProducts = async () => {
  try {
    const res = await api.getProducts({ limit: 100 })
    products.value = res.data
  } catch (e) {
    console.error(e)
  }
}

const loadCategories = async () => {
  try {
    categories.value = await api.getCategoryTree()
  } catch (e) {
    console.error(e)
  }
}

const openModal = async (product = null) => {
  editingProduct.value = product
  form.name = product?.name || ''
  form.name_en = product?.name_en || ''
  form.category_id = product?.category_id || null
  form.description = product?.description || ''
  form.description_en = product?.description_en || ''
  form.detail_content = product?.detail_content || ''
  form.is_featured = product?.is_featured || 0
  form.status = product?.status ?? 1
  form.sort_order = product?.sort_order || 0
  form.seo_title = product?.seo_title || ''
  form.seo_description = product?.seo_description || ''
  form.seo_keywords = product?.seo_keywords || ''
  existingImages.value = product?.images?.split(',').filter(Boolean) || []
  specs.value = product?.specs ? JSON.parse(product.specs) : []
  imageFiles.value = []
  
  // Reset editor state
  prodFullscreen.value = false
  htmlPreview.value = false

  showModal.value = true
}

let dragIndex = -1
const dragStart = (index) => { dragIndex = index }
const dragDrop = (toIndex) => {
  if (dragIndex < 0 || dragIndex === toIndex) return
  const arr = [...existingImages.value]
  const [moved] = arr.splice(dragIndex, 1)
  arr.splice(toIndex, 0, moved)
  existingImages.value = arr
  dragIndex = -1
}
const setMain = (index) => {
  if (index === 0) return
  const arr = [...existingImages.value]
  const [img] = arr.splice(index, 1)
  arr.unshift(img)
  existingImages.value = arr
}

const handleFileChange = (e) => {
  imageFiles.value = Array.from(e.target.files)
}

const handleSubmit = async () => {
  loading.value = true
  try {
    const formData = new FormData()
    formData.append('name', form.name)
    formData.append('name_en', form.name_en)
    formData.append('category_id', form.category_id || '')
    formData.append('description', form.description)
    formData.append('description_en', form.description_en)
    formData.append('detail_content', form.detail_content || '')
    formData.append('specs', JSON.stringify(specs.value.filter(s => s.name && s.value)))
    formData.append('is_featured', form.is_featured)
    formData.append('status', form.status)
    formData.append('sort_order', form.sort_order)
    formData.append('seo_title', form.seo_title || '')
    formData.append('seo_description', form.seo_description || '')
    formData.append('seo_keywords', form.seo_keywords || '')
    formData.append('existing_images', existingImages.value.join(','))
    
    imageFiles.value.forEach(file => {
      formData.append('images', file)
    })

    if (editingProduct.value) {
      await api.updateProduct(editingProduct.value.id, formData)
    } else {
      await api.createProduct(formData)
    }
    showModal.value = false
    await loadProducts()
  } catch (e) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

const handleDelete = async (product) => {
  if (!confirm(`确定删除商品"${product.name}"吗？`)) return
  try {
    await api.deleteProduct(product.id)
    await loadProducts()
  } catch (e) {
    alert(e.message)
  }
}

async function duplicateProduct(product) {
  if (!confirm(`复制产品「${product.name}」？`)) return
  try {
    const original = await api.getProduct(product.id)
    // Open the modal pre-filled with the original's data, ready to save as new
    openModal(null)  // reset first
    await new Promise(r => setTimeout(r, 50))
    form.name = original.name + ' (副本)'
    form.name_en = (original.name_en || '') + ' (Copy)'
    form.category_id = original.category_id
    form.description = original.description || ''
    form.description_en = original.description_en || ''
    form.detail_content = original.detail_content || ''
    form.is_featured = original.is_featured || 0
    form.status = original.status !== undefined ? original.status : 1
    form.sort_order = original.sort_order || 0
    form.seo_title = original.seo_title || ''
    form.seo_description = original.seo_description || ''
    form.seo_keywords = original.seo_keywords || ''
    existingImages.value = original.images ? original.images.split(',').filter(Boolean) : []
    specs.value = original.specs ? JSON.parse(original.specs) : []
  } catch(e) { alert('复制失败: ' + e.message) }
}

onMounted(() => {
  loadProducts()
  loadCategories()
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.product-thumb {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
}

.spec-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.spec-row .form-control {
  flex: 1;
}

.image-preview {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.preview-item {
  position: relative;
  width: 90px;
  height: 90px;
  border: 2px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  cursor: grab;
  transition: border-color 0.2s;
}

.preview-item.is-main {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(37,99,235,0.2);
}

.preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.preview-item .main-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--primary);
  color: white;
  font-size: 10px;
  text-align: center;
  padding: 2px;
}

.preview-item .btn-del,
.preview-item .btn-main {
  position: absolute;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-item .btn-del {
  top: 2px; right: 2px;
  width: 18px; height: 18px;
  background: rgba(220,38,38,0.85);
  color: white; font-size: 13px;
}

.preview-item .btn-main {
  top: 2px; left: 2px;
  width: 18px; height: 18px;
  background: rgba(255,255,255,0.9);
  font-size: 10px;
}

.badge-secondary {
  background: #e2e8f0;
  color: #64748b;
}

.form-hint {
  font-size: 12px;
  color: var(--secondary);
  margin: 4px 0 8px;
}

.quill-editor-wrap {
  border: 1px solid var(--border);
  border-radius: 4px;
  background: #fff;
  display: flex;
  flex-direction: column;
}

/* Sticky toolbar */
:deep(.ql-toolbar) {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  border-radius: 4px 4px 0 0;
  border-bottom: 1px solid var(--border);
}

:deep(.ql-container) {
  border-radius: 0 0 4px 4px;
  min-height: 200px;
  max-height: 60vh;
  overflow-y: auto;
  font-size: 14px;
}

/* Images and tables inside the admin editor */
:deep(.ql-editor) img {
  max-width: 100%;
  height: auto;
}

:deep(.ql-editor) table,
:deep(.ql-editor) td,
:deep(.ql-editor) th {
  border: 1px solid #d1d5db;
  border-collapse: collapse;
  padding: 6px 10px;
}

/* SEO section within product modal */
.seo-section {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
}

.seo-section-title {
  font-size: 14px;
  font-weight: 700;
  color: #475569;
  margin: 0 0 14px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #e2e8f0;
}

.seo-section .form-group { margin-bottom: 12px; }
.seo-section .form-group:last-child { margin-bottom: 0; }

.hint {
  font-weight: 400;
  font-size: 11px;
  color: #94a3b8;
  margin-left: 6px;
}

.seo-section small { font-size: 11px; color: #94a3b8; }

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

.editor-wrap.is-fullscreen .quill-editor-wrap,
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

/* HTML source code editor */
.html-editor {
  width: 100%; min-height: 400px; padding: 16px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px; line-height: 1.7;
  background: #1e293b; color: #e2e8f0;
  border: none; border-radius: 0 0 8px 8px;
  resize: vertical; outline: none;
  tab-size: 2; white-space: pre-wrap;
  box-sizing: border-box;
}
.html-editor::placeholder { color: #64748b; }
.html-preview {
  min-height: 400px; padding: 20px;
  background: #fff; border: 1px solid #e2e8f0;
  border-radius: 0 0 8px 8px;
  line-height: 1.8; font-size: 15px;
  overflow-y: auto;
}
.html-preview img { max-width: 100%; height: auto; border-radius: 6px; }
.html-preview table { border-collapse: collapse; width: 100%; }
.html-preview table td, .html-preview table th { border: 1px solid #e2e8f0; padding: 8px 12px; }

.is-fullscreen .html-editor,
.is-fullscreen .html-preview { min-height: calc(100vh - 60px); }
</style>
