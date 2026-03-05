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
              <label>产品详情（富文本）</label>
              <p class="form-hint">支持文字格式、图片插入、表格、超链接、字体颜色等富文本编辑</p>
              <div ref="quillEditorEl" class="quill-editor-wrap"></div>
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
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import ImageResize from 'quill-resize-image'
Quill.register('modules/imageResize', ImageResize)
import { setupImageGrid, injectGridStyles } from '../../utils/quillImageGrid'

const products = ref([])
const categories = ref([])
const showModal = ref(false)
const editingProduct = ref(null)
const loading = ref(false)
const imageFiles = ref([])
const existingImages = ref([])
const specs = ref([])
const quillEditorEl = ref(null)
let quillInstance = null

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
  showModal.value = true

  // Initialize Quill after modal DOM is rendered
  await nextTick()
    if (quillEditorEl.value) {
    if (quillInstance) {
      quillInstance = null
      quillEditorEl.value.innerHTML = ''
    }
    injectGridStyles()
    quillInstance = new Quill(quillEditorEl.value, {
      theme: 'snow',
      modules: {
        toolbar: {
          container: [
            [{ header: [1, 2, 3, 4, false] }],
            [{ font: [] }, { size: [] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ color: [] }, { background: [] }],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ align: [] }],
            ['link', 'image'],
            ['image-grid-2', 'image-grid-3', 'image-grid-4'],
            ['clean']
          ]
        },
        imageResize: { displaySize: true },
        clipboard: { matchVisual: false }
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
    if (form.detail_content) {
      quillInstance.root.innerHTML = form.detail_content
    }
  }
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
    // Collect Quill content before submit
    if (quillInstance) {
      form.detail_content = quillInstance.root.innerHTML
    }
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
    // Load detail content into Quill if already mounted
    if (quillInstance) quillInstance.root.innerHTML = form.detail_content || ''
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
</style>
