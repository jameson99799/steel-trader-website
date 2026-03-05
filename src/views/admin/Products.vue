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

              <!-- Editor mode bar -->
              <div class="editor-mode-bar">
                <div class="mode-tabs">
                  <button type="button" :class="['mode-tab', prodEditorMode === 'quill' ? 'active' : '']" @click="switchProdMode('quill')">
                    ✏️ 富文本编辑器
                  </button>
                  <button type="button" :class="['mode-tab', prodEditorMode === 'block' ? 'active' : '']" @click="switchProdMode('block')">
                    🔷 简洁编辑器
                  </button>
                </div>
                <button type="button" class="fullscreen-btn" @click="prodFullscreen = !prodFullscreen">
                  {{ prodFullscreen ? '✕ 退出全屏' : '⛶ 全屏' }}
                </button>
              </div>

              <!-- Quill editor -->
              <div v-show="prodEditorMode === 'quill'" :class="['editor-wrap', prodFullscreen ? 'is-fullscreen' : '']">
                <div ref="quillEditorEl" class="quill-editor-wrap"></div>
              </div>

              <!-- Block editor -->
              <div v-show="prodEditorMode === 'block'" :class="['editor-wrap', prodFullscreen ? 'is-fullscreen' : '']">
                <div class="block-editor">
                  <div v-for="(block, i) in prodBlocks" :key="block.id" class="block-row" @click="prodActiveBlock = i">
                    <div v-if="block.type === 'h1'" class="block-controls-row">
                      <div class="block-handle">⋮⋮</div>
                      <input v-model="block.content" placeholder="标题 H1" class="block-input block-h1" />
                      <button type="button" class="block-del" @click.stop="prodBlocks.splice(i, 1)">×</button>
                    </div>
                    <div v-else-if="block.type === 'h2'" class="block-controls-row">
                      <div class="block-handle">⋮⋮</div>
                      <input v-model="block.content" placeholder="小标题 H2" class="block-input block-h2" />
                      <button type="button" class="block-del" @click.stop="prodBlocks.splice(i, 1)">×</button>
                    </div>
                    <div v-else-if="block.type === 'p'" class="block-controls-row">
                      <div class="block-handle">⋮⋮</div>
                      <textarea v-model="block.content" placeholder="正文段落..." class="block-input block-p" rows="3" @input="autoResizeProd($event)" />
                      <button type="button" class="block-del" @click.stop="prodBlocks.splice(i, 1)">×</button>
                    </div>
                    <div v-else-if="block.type === 'quote'" class="block-controls-row">
                      <div class="block-handle">⋮⋮</div>
                      <textarea v-model="block.content" placeholder="引用文字..." class="block-input block-quote" rows="2" />
                      <button type="button" class="block-del" @click.stop="prodBlocks.splice(i, 1)">×</button>
                    </div>
                    <div v-else-if="block.type === 'hr'" class="block-controls-row">
                      <div class="block-handle">⋮⋮</div>
                      <hr class="block-hr" />
                      <button type="button" class="block-del" @click.stop="prodBlocks.splice(i, 1)">×</button>
                    </div>
                    <div v-else-if="block.type === 'image'" class="block-controls-row block-image-row">
                      <div class="block-handle">⋮⋮</div>
                      <div class="block-image-wrap">
                        <img :src="block.src" class="block-img" />
                        <div class="block-img-caption-wrap">
                          <input v-model="block.caption" placeholder="图片描述（点击添加）" class="block-caption-input" />
                        </div>
                      </div>
                      <button type="button" class="block-del" @click.stop="prodBlocks.splice(i, 1)">×</button>
                    </div>
                  </div>
                  <div class="add-block-row">
                    <button type="button" @click="addProdBlock('p')" class="add-block-btn">&para; 段落</button>
                    <button type="button" @click="addProdBlock('h1')" class="add-block-btn">H1 大标题</button>
                    <button type="button" @click="addProdBlock('h2')" class="add-block-btn">H2 小标题</button>
                    <button type="button" @click="addProdBlock('quote')" class="add-block-btn">“ 引用</button>
                    <button type="button" @click="addProdBlock('hr')" class="add-block-btn">— 分割线</button>
                    <button type="button" @click="addProdBlockImage()" class="add-block-btn">🖼️ 图片</button>
                  </div>
                </div>
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

// Block editor state for Products
const prodEditorMode = ref('quill')
const prodFullscreen = ref(false)
const prodActiveBlock = ref(-1)
let prodBlockIdSeq = 0
const prodBlocks = ref([])

function makeProdBlock(type, content = '', extra = {}) {
  return { id: ++prodBlockIdSeq, type, content, ...extra }
}
function addProdBlock(type) {
  prodBlocks.value.push(makeProdBlock(type))
}
async function addProdBlockImage() {
  const input = document.createElement('input')
  input.type = 'file'; input.accept = 'image/*'; input.click()
  input.onchange = async () => {
    const file = input.files[0]; if (!file) return
    try {
      const res = await api.upload(file)
      prodBlocks.value.push({ id: ++prodBlockIdSeq, type: 'image', src: res.url, caption: '' })
    } catch(e) { alert('图片上传失败: ' + e.message) }
  }
}
function autoResizeProd(e) {
  const el = e.target; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'
}
function prodBlocksToHtml(bks) {
  return bks.map(b => {
    if (b.type === 'h1') return `<h1>${b.content}</h1>`
    if (b.type === 'h2') return `<h2>${b.content}</h2>`
    if (b.type === 'p') return `<p>${b.content.replace(/\n/g, '<br>')}</p>`
    if (b.type === 'quote') return `<blockquote>${b.content}</blockquote>`
    if (b.type === 'hr') return `<hr>`
    if (b.type === 'image') {
      const cap = b.caption ? `<figcaption style="text-align:center;color:#666;font-size:13px;margin-top:4px;">${b.caption}</figcaption>` : ''
      return `<figure style="text-align:center;margin:16px 0;"><img src="${b.src}" style="max-width:100%;height:auto;"/>${cap}</figure>`
    }
    return ''
  }).join('\n')
}
function parseProdBlocksFromHtml(html) {
  if (!html) return []
  const div = document.createElement('div'); div.innerHTML = html
  const result = []
  div.childNodes.forEach(node => {
    if (node.nodeType !== 1) return
    const tag = node.tagName.toLowerCase()
    if (tag === 'h1') result.push(makeProdBlock('h1', node.textContent))
    else if (tag === 'h2') result.push(makeProdBlock('h2', node.textContent))
    else if (tag === 'p') result.push(makeProdBlock('p', node.textContent))
    else if (tag === 'blockquote') result.push(makeProdBlock('quote', node.textContent))
    else if (tag === 'hr') result.push(makeProdBlock('hr'))
    else if (tag === 'figure') {
      const img = node.querySelector('img')
      const cap = node.querySelector('figcaption')
      if (img) result.push({ id: ++prodBlockIdSeq, type: 'image', src: img.src, caption: cap?.textContent || '' })
    } else result.push(makeProdBlock('p', node.textContent))
  })
  return result.length ? result : [makeProdBlock('p')]
}
function switchProdMode(mode) {
  if (mode === prodEditorMode.value) return
  if (prodEditorMode.value === 'quill' && mode === 'block') {
    const html = quillInstance ? quillInstance.root.innerHTML : (form.detail_content || '')
    prodBlocks.value = parseProdBlocksFromHtml(html)
  } else if (prodEditorMode.value === 'block' && mode === 'quill') {
    const html = prodBlocksToHtml(prodBlocks.value)
    form.detail_content = html
    if (quillInstance) quillInstance.root.innerHTML = html
  }
  prodEditorMode.value = mode
}


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
  
  // Reset block editor state
  prodEditorMode.value = 'quill'
  prodFullscreen.value = false
  prodBlocks.value = []

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
            [{ color: [] }, { background: [false, 'transparent', '#000000', '#e60000', '#ff9900', '#ffff00', '#008a00', '#0066cc', '#9933ff', '#ffffff', '#facccc', '#ffebcc', '#ffffcc', '#cce8cc', '#cce0f5', '#ebd6ff', '#bbbbbb', '#f06666', '#ffc266', '#ffff66', '#66b966', '#66a3e0', '#c285ff', '#888888', '#a10000', '#b26b00', '#b2b200', '#006100', '#0047b2', '#6b24b2', '#444444', '#5c0000', '#663d00', '#666600', '#003700', '#002966', '#3d1466'] }],
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
    // Collect content before submit
    if (prodEditorMode.value === 'quill') {
      form.detail_content = quillInstance ? quillInstance.root.innerHTML : (form.detail_content || '')
    } else {
      form.detail_content = prodBlocksToHtml(prodBlocks.value)
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
</style>
