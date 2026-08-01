<template>
  <div class="reviews-page">
    <div class="page-header">
      <div>
        <h1>产品评价</h1>
        <p>录入、审核和发布客户提交的真实产品评价。</p>
      </div>
      <button class="btn btn-primary" :disabled="submitting || !selectedProductId" @click="openCreateModal">新增真实评价</button>
    </div>

    <div v-if="errorMessage" class="notice notice-error" role="alert">
      <span>{{ errorMessage }}</span>
      <button type="button" aria-label="关闭错误提示" @click="errorMessage = ''">&times;</button>
    </div>
    <div v-if="successMessage" class="notice notice-success" role="status">{{ successMessage }}</div>

    <section class="card">
      <div class="card-header">
        <div><h2>管理范围</h2><p>先选分类，再选择该分类下的产品。未选产品时不能新增或批量导入。</p></div>
      </div>
      <div class="card-body scope-grid">
        <div class="form-group">
          <label for="review-category">产品分类</label>
          <select id="review-category" v-model="selectedCategoryId" class="form-control">
            <option value="">全部分类</option>
            <option v-for="category in flatCategories" :key="category.id" :value="String(category.id)">
              {{ category.prefix }}{{ category.name_en || category.name || `分类 #${category.id}` }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label for="review-product">产品</label>
          <select id="review-product" v-model="selectedProductId" class="form-control" :disabled="!selectedCategoryId || productsLoading">
            <option value="">{{ productsLoading ? '正在加载产品…' : '分类内全部产品' }}</option>
            <option v-for="product in products" :key="product.id" :value="String(product.id)">
              {{ product.name_en || product.name || `产品 #${product.id}` }}
            </option>
          </select>
        </div>
        <div class="scope-summary"><span>当前范围</span><strong>{{ currentScopeLabel }}</strong></div>
      </div>
    </section>

    <section class="card">
      <div class="card-header"><h2>筛选评价</h2></div>
      <form class="card-body filter-grid" @submit.prevent="applyFilters">
        <div class="form-group">
          <label for="review-status">状态</label>
          <select id="review-status" v-model="filters.status" class="form-control">
            <option value="all">全部状态</option><option value="published">已发布</option>
            <option value="pending">待审核</option><option value="hidden">已隐藏</option>
          </select>
        </div>
        <div class="form-group">
          <label for="review-source">来源</label>
          <select id="review-source" v-model="filters.source" class="form-control">
            <option value="all">全部来源</option><option value="admin">后台录入</option>
            <option value="admin_import">批量导入</option><option value="external_api">外部 API</option>
          </select>
        </div>
        <div class="form-group filter-search">
          <label for="review-query">关键词</label>
          <input id="review-query" v-model.trim="filters.q" class="form-control" placeholder="姓名、标题或评价内容" />
        </div>
        <div class="form-group"><label for="date-from">开始日期</label><input id="date-from" v-model="filters.dateFrom" type="date" class="form-control" /></div>
        <div class="form-group"><label for="date-to">结束日期</label><input id="date-to" v-model="filters.dateTo" type="date" class="form-control" /></div>
        <button class="btn btn-primary" type="submit" :disabled="loading">应用筛选</button>
      </form>
    </section>

    <section class="card">
      <div class="card-body action-row">
        <div class="bulk-actions">
          <strong>已选 {{ selectedReviewIds.length }} 条（仅当前页）</strong>
          <button class="btn btn-success btn-sm" :disabled="!selectedReviewIds.length || actionLoading" @click="bulkUpdateStatus('published')">发布</button>
          <button class="btn btn-warning btn-sm" :disabled="!selectedReviewIds.length || actionLoading" @click="bulkUpdateStatus('pending')">待审核</button>
          <button class="btn btn-secondary btn-sm" :disabled="!selectedReviewIds.length || actionLoading" @click="bulkUpdateStatus('hidden')">隐藏</button>
        </div>
        <button class="btn btn-danger-outline" :disabled="!canPublishScope || actionLoading" :title="canPublishScope ? `发布${currentScopeLabel}中的全部待审核评价` : '请先选择产品或分类范围'" @click="publishAllInScope">当前范围全部发布</button>
      </div>
    </section>

    <section class="card">
      <div class="card-header list-heading">
        <div><h2>评价列表</h2><p>共 {{ total }} 条；外部 API 提交的评价默认保持待审核。</p></div>
        <select v-model.number="limit" class="form-control limit-select" aria-label="每页条数" @change="changeLimit">
          <option :value="10">10 条/页</option><option :value="20">20 条/页</option>
          <option :value="50">50 条/页</option><option :value="100">100 条/页</option>
        </select>
      </div>
      <div v-if="loading" class="state-panel" role="status">正在加载评价…</div>
      <div v-else-if="!reviews.length" class="state-panel">当前范围内暂无评价。</div>
      <div v-else class="table-wrap">
        <table class="table">
          <thead><tr>
            <th><input type="checkbox" :checked="allCurrentPageSelected" aria-label="本页全选或取消本页" @change="toggleCurrentPage" /></th>
            <th>作者 / 日期</th><th>评分</th><th>内容</th><th>来源</th><th>状态</th><th>翻译状态</th><th>操作</th>
          </tr></thead>
          <tbody>
            <tr v-for="review in reviews" :key="review.id">
              <td><input v-model="selectedReviewIds" type="checkbox" :value="review.id" :aria-label="`选择 ${review.author_name} 的评价`" /></td>
              <td>
                <strong>{{ review.author_name }}</strong><small>{{ review.review_date }}</small>
                <span v-if="review.verified_purchase" class="verified-label">已验证购买</span>
                <span v-if="review.is_incentivized" class="incentive-label" :title="review.incentive_disclosure || ''">激励评价</span>
              </td>
              <td>
                <div class="rating-display" :aria-label="`评分 ${formatRating(review.rating)} 分，共 5 分`">
                  <span class="stars" aria-hidden="true"><span class="stars-background">★★★★★</span><span class="stars-fill" :style="{ width: `${ratingPercent(review.rating)}%` }">★★★★★</span></span>
                  <span class="rating-number">{{ formatRating(review.rating) }} / 5</span>
                </div>
              </td>
              <td class="content-cell">
                <strong v-if="review.review_title">{{ review.review_title }}</strong><span>{{ summarize(review.review_text) }}</span>
                <small v-if="review.is_incentivized && review.incentive_disclosure">披露：{{ review.incentive_disclosure }}</small>
              </td>
              <td><span class="source-label">{{ sourceLabel(review.source) }}</span></td>
              <td><span :class="['status-badge', `status-${review.status}`]">{{ statusLabel(review.status) }}</span></td>
              <td>{{ translationLabel(review) }}</td>
              <td><div class="row-actions">
                <button class="btn btn-sm btn-secondary" :disabled="actionLoading" @click="openEditModal(review.id)">编辑</button>
                <button class="btn btn-sm btn-danger" :disabled="actionLoading" @click="deleteReview(review)">删除</button>
              </div></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <button class="btn btn-secondary btn-sm" :disabled="page <= 1 || loading" @click="changePage(page - 1)">上一页</button>
        <span>第 {{ page }} / {{ totalPages }} 页</span>
        <button class="btn btn-secondary btn-sm" :disabled="page >= totalPages || loading" @click="changePage(page + 1)">下一页</button>
      </div>
    </section>

    <section class="card">
      <div class="card-header import-heading">
        <div><h2>批量导入真实评价</h2><p>一行一条，格式：<code>姓名 - 日期（年月日） - 评分（4.7） - 评论内容</code></p></div>
        <span>每批 1–200 条</span>
      </div>
      <div class="card-body">
        <textarea v-model="importText" class="form-control import-textarea" rows="7" placeholder="例如：Alex - 2026-07-18 - 4.7 - Product quality matched the specification." :disabled="!selectedProductId || importLoading" @input="resetImportPreview"></textarea>
        <div class="import-actions">
          <button class="btn btn-secondary" :disabled="!selectedProductId || !importText.trim() || importLoading" @click="previewImport">{{ importLoading ? '正在解析…' : '导入预览' }}</button>
          <button class="btn btn-primary" :disabled="!canImport || importLoading" @click="confirmImport">确认导入 {{ importPreview.valid.length }} 条</button>
        </div>
        <div v-if="hasImportPreview" class="preview-grid">
          <div class="preview-section preview-valid"><h3>有效 {{ importPreview.valid.length }} 条</h3>
            <div v-if="importPreview.valid.length" class="preview-scroll"><div v-for="row in importPreview.valid" :key="`valid-${row.line}`" class="preview-row"><strong>第 {{ row.line }} 行 · {{ row.author_name }}</strong><span>{{ row.review_date }} · {{ formatRating(row.rating) }} / 5 · {{ row.review_text }}</span></div></div><p v-else>没有有效行。</p>
          </div>
          <div class="preview-section preview-invalid"><h3>错误 {{ importPreview.invalid.length }} 条</h3>
            <div v-if="importPreview.invalid.length" class="preview-scroll"><div v-for="row in importPreview.invalid" :key="`invalid-${row.line}`" class="preview-row"><strong>第 {{ row.line }} 行：{{ row.error || row.reason }}</strong><span>{{ row.raw }}</span></div></div><p v-else>无格式或字段错误。</p>
          </div>
          <div class="preview-section preview-duplicate"><h3>重复 {{ importPreview.duplicates.length }} 条</h3>
            <div v-if="importPreview.duplicates.length" class="preview-scroll"><div v-for="row in importPreview.duplicates" :key="`duplicate-${row.line}`" class="preview-row"><strong>第 {{ row.line }} 行：{{ row.error || row.reason }}</strong><span>{{ row.raw }}</span></div></div><p v-else>无批次内重复。</p>
          </div>
        </div>
        <p v-if="importPreview.valid.length > 200" class="validation-message" role="alert">有效评价超过 200 条，请拆分批次后重新预览。</p>
      </div>
    </section>

    <div v-if="showFormModal" class="modal-overlay" @click.self="closeFormModal">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="review-form-title">
        <div class="modal-header"><div><h2 id="review-form-title">{{ editingId ? '编辑评价' : '新增真实评价' }}</h2><p>{{ editingId ? '更新已保存的评价内容。' : `评价将关联到：${selectedProductLabel}` }}</p></div><button type="button" class="modal-close" aria-label="关闭" @click="closeFormModal">&times;</button></div>
        <form @submit.prevent="saveReview">
          <div class="modal-body form-grid">
            <div class="form-group"><label for="form-author">姓名 *</label><input id="form-author" v-model.trim="form.author_name" class="form-control" maxlength="100" required /></div>
            <div class="form-group"><label for="form-date">日期 *</label><input id="form-date" v-model="form.review_date" type="date" class="form-control" required /></div>
            <div class="form-group"><label for="form-rating">评分（1.0–5.0）*</label><input id="form-rating" v-model.number="form.rating" type="number" min="1" max="5" step="0.1" class="form-control" required /></div>
            <div class="form-group"><label for="form-status">状态 *</label><select id="form-status" v-model="form.status" class="form-control"><option value="published">已发布</option><option value="pending">待审核</option><option value="hidden">已隐藏</option></select></div>
            <div class="form-group form-full"><label for="form-title">标题（可选）</label><input id="form-title" v-model.trim="form.review_title" class="form-control" maxlength="200" /></div>
            <div class="form-group form-full"><label for="form-text">评价正文 *</label><textarea id="form-text" v-model.trim="form.review_text" class="form-control" rows="6" required></textarea></div>
            <label class="check-field"><input v-model="form.verified_purchase" type="checkbox" />已验证购买</label>
            <label class="check-field"><input v-model="form.is_incentivized" type="checkbox" />这是激励评价</label>
            <div v-if="form.is_incentivized" class="form-group form-full"><label for="form-disclosure">激励披露 *</label><textarea id="form-disclosure" v-model.trim="form.incentive_disclosure" class="form-control" rows="3" placeholder="如实说明折扣、样品或其他激励。" required></textarea></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" :disabled="submitting" @click="closeFormModal">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting || (!editingId && !selectedProductId)">{{ submitting ? '正在保存…' : '保存评价' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import api from '../../api'

const categoryTree = ref([])
const selectedCategoryId = ref('')
const products = ref([])
const selectedProductId = ref('')
const reviews = ref([])
const filters = reactive({ status: 'all', source: 'all', q: '', dateFrom: '', dateTo: '' })
const selectedReviewIds = ref([])
const form = reactive({
  author_name: '', review_title: '', review_date: '', rating: 5,
  review_text: '', status: 'published', verified_purchase: false,
  is_incentivized: false, incentive_disclosure: ''
})
const importText = ref('')
const importPreview = ref({ valid: [], invalid: [], duplicates: [] })
const loading = ref(false)
const productsLoading = ref(false)
const submitting = ref(false)
const importLoading = ref(false)
const actionLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const showFormModal = ref(false)
const editingId = ref(null)
const page = ref(1)
const limit = ref(20)
const total = ref(0)
let suppressProductWatch = false
let productsRequestSequence = 0
let reviewsRequestSequence = 0

const flatCategories = computed(() => {
  const result = []
  const flatten = (items, prefix = '') => {
    for (const category of items || []) {
      result.push({ ...category, prefix })
      flatten(category.children, `${prefix}— `)
    }
  }
  flatten(categoryTree.value)
  return result
})
const selectedCategoryLabel = computed(() => {
  const item = flatCategories.value.find(category => String(category.id) === String(selectedCategoryId.value))
  return item?.name_en || item?.name || (selectedCategoryId.value ? `分类 #${selectedCategoryId.value}` : '')
})
const selectedProductLabel = computed(() => {
  const item = products.value.find(product => String(product.id) === String(selectedProductId.value))
  return item?.name_en || item?.name || (selectedProductId.value ? `产品 #${selectedProductId.value}` : '')
})
const currentScopeLabel = computed(() => selectedProductId.value
  ? selectedProductLabel.value
  : selectedCategoryId.value ? `${selectedCategoryLabel.value}（含子分类）` : '全站只读范围（不可全部发布）')
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))
const currentPageIds = computed(() => reviews.value.map(review => review.id))
const allCurrentPageSelected = computed(() => currentPageIds.value.length > 0 && currentPageIds.value.every(id => selectedReviewIds.value.includes(id)))
const canPublishScope = computed(() => Boolean(selectedProductId.value || selectedCategoryId.value))
const hasImportPreview = computed(() => importPreview.value.valid.length > 0 || importPreview.value.invalid.length > 0 || importPreview.value.duplicates.length > 0)
const canImport = computed(() => Boolean(selectedProductId.value) && importPreview.value.valid.length > 0 && importPreview.value.valid.length <= 200 && importPreview.value.invalid.length === 0 && importPreview.value.duplicates.length === 0)

const clearSelection = () => { selectedReviewIds.value = [] }
const clearMessages = () => { errorMessage.value = ''; successMessage.value = '' }
const showError = (error, fallback) => { successMessage.value = ''; errorMessage.value = error?.message || fallback }
const showSuccess = message => { errorMessage.value = ''; successMessage.value = message }

const loadCategories = async () => {
  try { categoryTree.value = await api.getAdminCategoryTree() }
  catch (error) { showError(error, '产品分类加载失败，请稍后重试。') }
}
const isLatestProductRequest = (requestId, categorySnapshot) => (
  requestId === productsRequestSequence && categorySnapshot === selectedCategoryId.value
)
const loadProducts = async () => {
  const requestId = ++productsRequestSequence
  const categorySnapshot = selectedCategoryId.value
  if (!categorySnapshot) {
    products.value = []
    productsLoading.value = false
    return
  }
  productsLoading.value = true
  try {
    const response = await api.getAdminProducts({ category_id: categorySnapshot, limit: 500 })
    if (!isLatestProductRequest(requestId, categorySnapshot)) return
    products.value = response?.data || []
  } catch (error) {
    if (!isLatestProductRequest(requestId, categorySnapshot)) return
    products.value = []
    showError(error, '产品加载失败，请稍后重试。')
  } finally {
    if (isLatestProductRequest(requestId, categorySnapshot)) productsLoading.value = false
  }
}
const buildReviewQuery = () => {
  const query = { page: page.value, limit: limit.value }
  if (selectedProductId.value) query.productId = selectedProductId.value
  if (selectedCategoryId.value) query.categoryId = selectedCategoryId.value
  if (filters.status !== 'all') query.status = filters.status
  if (filters.source !== 'all') query.source = filters.source
  for (const key of ['q', 'dateFrom', 'dateTo']) {
    if (String(filters[key] || '').trim()) query[key] = String(filters[key]).trim()
  }
  return query
}
const reviewQueryKey = query => JSON.stringify(query)
const isLatestReviewRequest = (requestId, querySnapshot) => (
  requestId === reviewsRequestSequence && reviewQueryKey(querySnapshot) === reviewQueryKey(buildReviewQuery())
)
const loadReviews = async () => {
  const requestId = ++reviewsRequestSequence
  const querySnapshot = buildReviewQuery()
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await api.getAdminProductReviews(querySnapshot)
    if (!isLatestReviewRequest(requestId, querySnapshot)) return
    reviews.value = response?.data || []
    total.value = Number(response?.total || 0)
    page.value = Number(response?.page || page.value)
  } catch (error) {
    if (!isLatestReviewRequest(requestId, querySnapshot)) return
    reviews.value = []; total.value = 0
    showError(error, '评价加载失败，请稍后重试。')
  } finally {
    if (isLatestReviewRequest(requestId, querySnapshot)) loading.value = false
  }
}

watch(selectedCategoryId, async () => {
  suppressProductWatch = true
  selectedProductId.value = ''
  products.value = []
  reviews.value = []
  total.value = 0
  page.value = 1
  clearSelection()
  resetImport()
  await nextTick()
  suppressProductWatch = false
  await loadProducts()
  await loadReviews()
})
watch(selectedProductId, async () => {
  if (suppressProductWatch) return
  page.value = 1
  clearSelection()
  resetImport()
  await loadReviews()
})
const applyFilters = async () => { page.value = 1; clearSelection(); await loadReviews() }
watch(filters, applyFilters, { deep: true })
const changePage = async nextPage => {
  if (nextPage < 1 || nextPage > totalPages.value || nextPage === page.value) return
  page.value = nextPage
  clearSelection()
  await loadReviews()
}
const changeLimit = async () => { page.value = 1; clearSelection(); await loadReviews() }

const resetForm = () => {
  editingId.value = null
  Object.assign(form, { author_name: '', review_title: '', review_date: '', rating: 5, review_text: '', status: 'published', verified_purchase: false, is_incentivized: false, incentive_disclosure: '' })
}
const openCreateModal = () => {
  if (!selectedProductId.value) { errorMessage.value = '请先选择要关联评价的产品。'; return }
  clearMessages(); resetForm(); showFormModal.value = true
}
const openEditModal = async id => {
  actionLoading.value = true
  clearMessages()
  try {
    const review = await api.getAdminProductReview(id)
    editingId.value = review.id
    Object.assign(form, {
      author_name: review.author_name || '', review_title: review.review_title || '', review_date: review.review_date || '',
      rating: Number(review.rating), review_text: review.review_text || '', status: review.status || 'pending',
      verified_purchase: Boolean(review.verified_purchase), is_incentivized: Boolean(review.is_incentivized), incentive_disclosure: review.incentive_disclosure || ''
    })
    showFormModal.value = true
  } catch (error) { showError(error, '评价详情加载失败。') }
  finally { actionLoading.value = false }
}
const closeFormModal = () => { if (!submitting.value) { showFormModal.value = false; resetForm() } }
const validateForm = () => {
  if (!form.author_name.trim() || !form.review_date || !form.review_text.trim()) { errorMessage.value = '请填写姓名、日期和评价正文。'; return false }
  if (form.author_name.trim().length > 100) { errorMessage.value = '姓名最多 100 个字符。'; return false }
  const rating = Number(form.rating)
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) { errorMessage.value = '评分必须在 1.0 到 5.0 之间。'; return false }
  if (!/^\d(?:\.\d)?$/.test(String(form.rating))) { errorMessage.value = '评分最多保留一位小数。'; return false }
  if (form.is_incentivized && !form.incentive_disclosure.trim()) { errorMessage.value = '激励评价必须填写激励披露。'; return false }
  return true
}
const reviewPayload = () => ({
  ...(!editingId.value ? { product_id: selectedProductId.value } : {}), author_name: form.author_name.trim(),
  review_title: form.review_title.trim() || null, review_date: form.review_date, rating: Number(Number(form.rating).toFixed(1)),
  review_text: form.review_text.trim(), status: form.status, verified_purchase: form.verified_purchase,
  is_incentivized: form.is_incentivized, incentive_disclosure: form.is_incentivized ? form.incentive_disclosure.trim() : null
})
const saveReview = async () => {
  if (!editingId.value && !selectedProductId.value) { errorMessage.value = '请先选择要关联评价的产品。'; return }
  if (!validateForm()) return
  submitting.value = true
  clearMessages()
  try {
    await (editingId.value
      ? api.updateProductReview(editingId.value, reviewPayload())
      : api.createProductReview(reviewPayload()))
    const message = editingId.value ? '评价已更新。' : '真实评价已新增。'
    showFormModal.value = false; resetForm(); clearSelection(); await loadReviews(); showSuccess(message)
  } catch (error) { showError(error, '评价保存失败。') }
  finally { submitting.value = false }
}
const deleteReview = async review => {
  if (!window.confirm(`确定删除 ${review.author_name} 的这条评价吗？此操作无法撤销。`)) return
  actionLoading.value = true; clearMessages()
  try { await api.deleteProductReview(review.id); clearSelection(); await loadReviews(); showSuccess('评价已删除。') }
  catch (error) { showError(error, '评价删除失败。') }
  finally { actionLoading.value = false }
}

const toggleCurrentPage = event => { selectedReviewIds.value = event.target.checked ? [...currentPageIds.value] : [] }
const bulkUpdateStatus = async status => {
  if (!selectedReviewIds.value.length) return
  actionLoading.value = true; clearMessages()
  try {
    await api.bulkUpdateProductReviewStatus({ ids: selectedReviewIds.value, status })
    const count = selectedReviewIds.value.length; clearSelection(); await loadReviews(); showSuccess(`已更新 ${count} 条评价的状态。`)
  } catch (error) { showError(error, '批量状态更新失败。') }
  finally { actionLoading.value = false }
}
const publishAllInScope = async () => {
  if (!canPublishScope.value) { errorMessage.value = '请选择产品或分类，禁止无范围跨站发布。'; return }
  if (!window.confirm(`确定全部发布“${currentScopeLabel.value}”范围内的待审核评价吗？`)) return
  const scope = {}
  if (selectedProductId.value) scope.productId = selectedProductId.value
  else scope.categoryId = selectedCategoryId.value
  if (filters.source !== 'all') scope.source = filters.source
  for (const key of ['q', 'dateFrom', 'dateTo']) if (String(filters[key] || '').trim()) scope[key] = String(filters[key]).trim()
  actionLoading.value = true; clearMessages()
  try {
    const result = await api.publishAllPendingProductReviews(scope)
    clearSelection(); await loadReviews(); showSuccess(`当前范围已发布 ${Number(result?.updated || 0)} 条待审核评价。`)
  } catch (error) { showError(error, '当前范围全部发布失败。') }
  finally { actionLoading.value = false }
}

function resetImportPreview() { importPreview.value = { valid: [], invalid: [], duplicates: [] } }
function resetImport() { importText.value = ''; resetImportPreview() }
const previewImport = async () => {
  if (!selectedProductId.value || !importText.value.trim()) return
  importLoading.value = true; clearMessages()
  try {
    const result = await api.parseProductReviewImport({ text: importText.value })
    importPreview.value = {
      valid: Array.isArray(result?.valid) ? result.valid : [],
      invalid: Array.isArray(result?.invalid) ? result.invalid : [],
      duplicates: Array.isArray(result?.duplicates) ? result.duplicates : []
    }
    if (!hasImportPreview.value) errorMessage.value = '没有解析到可预览的评价行。'
  } catch (error) { resetImportPreview(); showError(error, '导入内容解析失败。') }
  finally { importLoading.value = false }
}
const confirmImport = async () => {
  if (!canImport.value) return
  importLoading.value = true; clearMessages()
  try {
    const count = importPreview.value.valid.length
    await api.bulkCreateProductReviews({ productId: selectedProductId.value, rows: importPreview.value.valid })
    resetImport(); clearSelection(); page.value = 1; await loadReviews(); showSuccess(`已导入 ${count} 条真实评价。`)
  } catch (error) { showError(error, '批量导入失败。') }
  finally { importLoading.value = false }
}

const formatRating = rating => Number(rating || 0).toFixed(1)
const ratingPercent = rating => (Math.min(5, Math.max(0, Number(rating) || 0)) / 5) * 100
const summarize = text => String(text || '').length > 120 ? `${String(text).slice(0, 120)}…` : String(text || '')
const sourceLabel = source => ({ admin: '后台录入', admin_import: '批量导入', external_api: '外部 API' }[source] || source || '-')
const statusLabel = status => ({ published: '已发布', pending: '待审核', hidden: '已隐藏' }[status] || status || '-')
const translationLabel = review => {
  if (review.translation_status != null) return String(review.translation_status)
  if (review.translationStatus != null) return String(review.translationStatus)
  if (Array.isArray(review.translations)) return review.translations.length ? `已有 ${review.translations.length} 个译文` : '未翻译'
  return '-'
}
onMounted(async () => { await Promise.all([loadCategories(), loadReviews()]) })
</script>

<style scoped>
.reviews-page { color: #1e293b; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 22px; }
.page-header h1, .card-header h2, .modal-header h2 { margin: 0; }
.page-header h1 { font-size: 28px; }
.page-header p, .card-header p, .modal-header p { margin: 5px 0 0; color: #64748b; font-size: 13px; }
.card { margin-bottom: 20px; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; box-shadow: 0 1px 4px rgba(15,23,42,.05); }
.card-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 17px 20px; border-bottom: 1px solid #e2e8f0; }
.card-header h2 { font-size: 17px; }
.card-body { padding: 20px; }
.scope-grid { display: grid; grid-template-columns: minmax(200px,1fr) minmax(240px,1.4fr) minmax(180px,.8fr); gap: 16px; align-items: end; }
.scope-summary { display: flex; min-height: 40px; flex-direction: column; justify-content: center; padding: 7px 12px; border-left: 3px solid #3b82f6; border-radius: 6px; background: #eff6ff; }
.scope-summary span { color: #64748b; font-size: 11px; }.scope-summary strong { font-size: 13px; overflow-wrap: anywhere; }
.filter-grid { display: grid; grid-template-columns: 140px 150px minmax(190px,1fr) 160px 160px auto; gap: 12px; align-items: end; }
.form-group { min-width: 0; }.form-group label { display: block; margin-bottom: 6px; color: #475569; font-size: 13px; font-weight: 600; }
.form-control { box-sizing: border-box; width: 100%; padding: 9px 11px; border: 1px solid #cbd5e1; border-radius: 7px; background: #fff; color: #1e293b; font: inherit; font-size: 14px; }
.form-control:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.12); }.form-control:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }
.btn { padding: 9px 15px; border: 0; border-radius: 7px; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; }.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn-primary { background: #2563eb; color: #fff; }.btn-primary:hover:not(:disabled) { background: #1d4ed8; }.btn-secondary { background: #e2e8f0; color: #334155; }
.btn-success { background: #dcfce7; color: #166534; }.btn-warning { background: #fef3c7; color: #92400e; }.btn-danger { background: #fee2e2; color: #b91c1c; }
.btn-danger-outline { border: 1px solid #ef4444; background: #fff; color: #b91c1c; }.btn-sm { padding: 6px 10px; font-size: 12px; }
.action-row,.bulk-actions,.row-actions,.import-actions,.pagination { display: flex; align-items: center; gap: 9px; }.action-row { justify-content: space-between; flex-wrap: wrap; }.bulk-actions { flex-wrap: wrap; }.bulk-actions strong { font-size: 13px; }
.limit-select { width: 112px; }.table-wrap { overflow-x: auto; }.table { width: 100%; min-width: 1080px; border-collapse: collapse; }
.table th,.table td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; font-size: 13px; }.table th { background: #f8fafc; color: #64748b; font-size: 12px; white-space: nowrap; }.table td:first-child,.table th:first-child { padding-left: 20px; }
.table td > strong,.table td > small { display: block; }.table td > small { margin-top: 3px; color: #64748b; }
.verified-label,.incentive-label,.source-label,.status-badge { display: inline-block; margin-top: 4px; padding: 3px 7px; border-radius: 999px; font-size: 10px; white-space: nowrap; }.verified-label { background: #dcfce7; color: #166534; }.incentive-label { background: #fef3c7; color: #92400e; }
.content-cell { max-width: 330px; }.content-cell span,.content-cell small { display: block; margin-top: 3px; line-height: 1.45; overflow-wrap: anywhere; }.content-cell small { color: #92400e; }
.rating-display { display: flex; min-width: 100px; flex-direction: column; gap: 3px; }.stars { position: relative; display: inline-block; width: 85px; color: #d1d5db; font-size: 17px; line-height: 1; letter-spacing: 1px; }.stars-background { display: block; }.stars-fill { position: absolute; inset: 0 auto 0 0; display: block; overflow: hidden; color: #f59e0b; white-space: nowrap; }.rating-number { color: #475569; font-size: 12px; }
.source-label { background: #eef2ff; color: #4338ca; }.status-published { background: #dcfce7; color: #166534; }.status-pending { background: #fef3c7; color: #92400e; }.status-hidden { background: #e2e8f0; color: #475569; }
.state-panel { padding: 46px 20px; background: #f8fafc; color: #64748b; text-align: center; }.pagination { justify-content: center; padding: 16px 20px; color: #475569; font-size: 13px; }
.import-heading > span { padding: 4px 9px; border-radius: 999px; background: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 600; }.import-textarea { min-height: 140px; resize: vertical; font-family: ui-monospace,Consolas,monospace; line-height: 1.6; }.import-actions { margin-top: 12px; }
.preview-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 12px; margin-top: 18px; }.preview-section { min-width: 0; padding: 13px; border: 1px solid #e2e8f0; border-radius: 9px; }.preview-section h3 { margin: 0 0 10px; font-size: 14px; }.preview-section p { margin: 0; color: #64748b; font-size: 12px; }.preview-valid { border-color: #86efac; background: #f0fdf4; }.preview-invalid { border-color: #fca5a5; background: #fef2f2; }.preview-duplicate { border-color: #fcd34d; background: #fffbeb; }
.preview-scroll { max-height: 240px; overflow-y: auto; }.preview-row { padding: 8px 0; border-bottom: 1px solid rgba(100,116,139,.18); overflow-wrap: anywhere; }.preview-row strong,.preview-row span { display: block; font-size: 11px; }.preview-row span { margin-top: 3px; color: #475569; }.validation-message { color: #b91c1c; font-size: 13px; font-weight: 600; }
.notice { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; padding: 11px 14px; border-radius: 8px; font-size: 14px; }.notice button { border: 0; background: transparent; font-size: 20px; cursor: pointer; }.notice-error { border: 1px solid #fecaca; background: #fef2f2; color: #b91c1c; }.notice-success { border: 1px solid #bbf7d0; background: #f0fdf4; color: #166534; }
.modal-overlay { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(15,23,42,.58); }.modal { width: min(760px,100%); max-height: 92vh; overflow-y: auto; border-radius: 13px; background: #fff; box-shadow: 0 20px 50px rgba(15,23,42,.28); }.modal-header,.modal-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 17px 21px; }.modal-header { border-bottom: 1px solid #e2e8f0; }.modal-header h2 { font-size: 19px; }.modal-close { border: 0; background: transparent; color: #64748b; font-size: 26px; cursor: pointer; }.modal-body { padding: 21px; }.modal-footer { justify-content: flex-end; border-top: 1px solid #e2e8f0; }
.form-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 16px; }.form-full { grid-column: 1 / -1; }.check-field { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }code { padding: 2px 5px; border-radius: 4px; background: #f1f5f9; color: #334155; }
@media (max-width: 1180px) { .filter-grid { grid-template-columns: repeat(3,minmax(0,1fr)); }.preview-grid { grid-template-columns: 1fr; } }
@media (max-width: 760px) { .page-header,.card-header { align-items: stretch; flex-direction: column; }.page-header .btn { width: 100%; }.scope-grid,.filter-grid,.form-grid { grid-template-columns: 1fr; }.form-full { grid-column: auto; }.action-row,.bulk-actions,.import-actions { align-items: stretch; flex-direction: column; }.action-row .btn,.bulk-actions .btn { width: 100%; }.limit-select { width: 100%; } }
</style>
