import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

function readSource(relativePath) {
  const url = new URL(relativePath, import.meta.url)
  return fs.existsSync(url) ? fs.readFileSync(url, 'utf8') : ''
}

const reviews = readSource('../src/views/admin/Reviews.vue')
const router = readSource('../src/router/index.js')
const layout = readSource('../src/views/admin/Layout.vue')

function section(start, end) {
  return reviews.slice(reviews.indexOf(start), reviews.indexOf(end))
}

function occurrenceCount(source, pattern) {
  return [...source.matchAll(pattern)].length
}

test('admin reviews has an independent route and nearby sidebar entry', () => {
  assert.match(router, /path:\s*['"]reviews['"][\s\S]*?name:\s*['"]AdminReviews['"][\s\S]*?admin\/Reviews\.vue/)
  assert.match(layout, /router-link\s+to="\/admin\/reviews"[^>]*>[^<]*产品评价/)
})

test('review page owns the required category, product, filter, selection, form, and import state', () => {
  assert.match(reviews, /const categoryTree = ref\(\[\]\)/)
  assert.match(reviews, /const selectedCategoryId = ref\(['"]['"]\)/)
  assert.match(reviews, /const products = ref\(\[\]\)/)
  assert.match(reviews, /const selectedProductId = ref\(['"]['"]\)/)
  assert.match(reviews, /const reviews = ref\(\[\]\)/)
  assert.match(reviews, /const filters = reactive\(\{\s*status:\s*['"]all['"],\s*source:\s*['"]all['"],\s*q:\s*['"]['"],\s*dateFrom:\s*['"]['"],\s*dateTo:\s*['"]['"]\s*\}\)/)
  assert.match(reviews, /const selectedReviewIds = ref\(\[\]\)/)
  assert.match(reviews, /const importPreview = ref\(\{\s*valid:\s*\[\],\s*invalid:\s*\[\],\s*duplicates:\s*\[\]\s*\}\)/)
  assert.match(reviews, /is_incentivized:\s*false[\s\S]*?incentive_disclosure:\s*['"]['"]/)
})

test('category and product changes use linked APIs and reset stale rows and selection', () => {
  assert.match(reviews, /api\.getAdminCategoryTree\(\)/)
  assert.match(reviews, /api\.getAdminProducts\(\{\s*category_id:\s*categorySnapshot,\s*limit:\s*500\s*\}\)/)
  assert.match(reviews, /watch\(selectedCategoryId[\s\S]*?selectedProductId\.value\s*=\s*['"]["'][\s\S]*?reviews\.value\s*=\s*\[\][\s\S]*?clearSelection\(\)/)
  assert.match(reviews, /watch\(selectedProductId[\s\S]*?clearSelection\(\)[\s\S]*?loadReviews\(\)/)
})

test('list query sends only valued scopes and filters and resets selection on filter or page changes', () => {
  assert.match(reviews, /api\.getAdminProductReviews\(querySnapshot\)/)
  assert.match(reviews, /if \(selectedProductId\.value\) query\.productId = selectedProductId\.value/)
  assert.match(reviews, /if \(selectedCategoryId\.value\) query\.categoryId = selectedCategoryId\.value/)
  assert.match(reviews, /if \(filters\.status !== ['"]all['"]\) query\.status = filters\.status/)
  assert.match(reviews, /if \(filters\.source !== ['"]all['"]\) query\.source = filters\.source/)
  assert.match(reviews, /for \(const key of \[['"]q['"], ['"]dateFrom['"], ['"]dateTo['"]\]\)/)
  assert.match(reviews, /const changePage[\s\S]*?clearSelection\(\)[\s\S]*?loadReviews\(\)/)
  assert.match(reviews, /const applyFilters[\s\S]*?page\.value = 1[\s\S]*?clearSelection\(\)/)
})

test('single review workflow calls create, detail, update, and delete APIs with confirmation', () => {
  for (const method of ['getAdminProductReview', 'createProductReview', 'updateProductReview', 'deleteProductReview']) {
    assert.match(reviews, new RegExp(`api\\.${method}\\(`))
  }
  assert.match(reviews, /if \(!window\.confirm\([^)]*删除/)
  assert.match(reviews, /editingId\.value\s*\?\s*api\.updateProductReview[\s\S]*?:\s*api\.createProductReview/)
  assert.match(reviews, /:disabled="[^\"]*!selectedProductId/)
})

test('server import preview separates valid, invalid, and duplicate rows and enforces 1 to 200 clean rows', () => {
  assert.match(reviews, /api\.parseProductReviewImport\(\{\s*text:\s*importText\.value\s*\}\)/)
  assert.match(reviews, /importPreview\.value\s*=\s*\{[\s\S]*?valid:[\s\S]*?invalid:[\s\S]*?duplicates:/)
  assert.match(reviews, /v-for="row in importPreview\.invalid"[\s\S]*?row\.line[\s\S]*?row\.(?:error|reason)/)
  assert.match(reviews, /v-for="row in importPreview\.duplicates"[\s\S]*?row\.line[\s\S]*?row\.(?:error|reason)/)
  assert.match(reviews, /importPreview\.value\.valid\.length\s*<=\s*200/)
  assert.match(reviews, /api\.bulkCreateProductReviews\(\{\s*productId:\s*selectedProductId\.value,\s*rows:\s*importPreview\.value\.valid,\s*status:\s*importStatus\.value\s*\}\)/)
  assert.match(reviews, /姓名\s*-\s*日期（年月日）\s*-\s*评分（4\.7）\s*-\s*评论内容/)
})

test('selection is explicit and current-page-only while bulk status supports all moderation states', () => {
  assert.match(reviews, /const currentPageIds = computed\(\(\) => reviews\.value\.map/)
  assert.match(reviews, /const toggleCurrentPage[\s\S]*?currentPageIds\.value/)
  assert.match(reviews, /v-model="selectedReviewIds"/)
  assert.match(reviews, /api\.bulkUpdateProductReviewStatus\(\{\s*ids:\s*selectedReviewIds\.value,\s*status\s*\}\)/)
  for (const status of ['published', 'hidden', 'pending']) {
    assert.match(reviews, new RegExp(`bulkUpdateStatus\\('${status}'\\)`))
  }
})

test('publish-all requires product or category scope and uses a destructive confirmation', () => {
  assert.match(reviews, /const canPublishScope = computed\(\(\) => Boolean\(selectedProductId\.value \|\| selectedCategoryId\.value\)\)/)
  assert.match(reviews, /if \(!canPublishScope\.value\)[\s\S]*?return/)
  assert.match(reviews, /if \(!window\.confirm\([^)]*全部发布/)
  assert.match(reviews, /api\.publishAllPendingProductReviews\(scope\)/)
  assert.match(reviews, /if \(selectedProductId\.value\) scope\.productId = selectedProductId\.value[\s\S]*?else scope\.categoryId = selectedCategoryId\.value/)
})

test('decimal rating has proportional partial stars, readable value, and no fake-review generator', () => {
  assert.match(reviews, /:style="\{ width: `\$\{ratingPercent\(review\.rating\)\}%` \}"/)
  assert.match(reviews, /:aria-label="`评分 \$\{formatRating\(review\.rating\)\} 分，共 5 分`"/)
  assert.match(reviews, /\{\{ formatRating\(review\.rating\) \}\}\s*\/\s*5/)
  assert.match(reviews, /Math\.min\(5, Math\.max\(0, Number\(rating\)/)
  assert.doesNotMatch(reviews, /Math\.random|自动生成评价|生成虚假评价|补齐评价数量/)
})

test('incentivized reviews require disclosure and UI exposes loading, success, error, and pagination states', () => {
  assert.match(reviews, /if \(form\.is_incentivized && !form\.incentive_disclosure\.trim\(\)\)/)
  assert.match(reviews, /v-if="form\.is_incentivized"[\s\S]*?incentive_disclosure/)
  assert.match(reviews, /v-if="loading"[^>]*role="status"/)
  assert.match(reviews, /v-if="errorMessage"[^>]*role="alert"/)
  assert.match(reviews, /v-if="successMessage"[^>]*role="status"/)
  assert.match(reviews, /第 \{\{ page \}\} \/ \{\{ totalPages \}\} 页/)
  assert.match(reviews, /:disabled="page <= 1 \|\| loading"/)
  assert.match(reviews, /:disabled="page >= totalPages \|\| loading"/)
})

test('product and review loaders independently ignore stale success, failure, and finally writes', () => {
  const productLoader = section('const loadProducts', 'const buildReviewQuery')
  const reviewLoader = section('const loadReviews', 'watch(selectedCategoryId')

  assert.match(reviews, /let productsRequestSequence = 0/)
  assert.match(reviews, /let reviewsRequestSequence = 0/)

  assert.match(productLoader, /const requestId = \+\+productsRequestSequence/)
  assert.match(productLoader, /const categorySnapshot = selectedCategoryId\.value/)
  assert.match(productLoader, /api\.getAdminProducts\(\{ category_id: categorySnapshot, limit: 500 \}\)/)
  assert.ok(occurrenceCount(productLoader, /isLatestProductRequest\(requestId, categorySnapshot\)/g) >= 3)
  assert.match(productLoader, /catch \(error\) \{[\s\S]*?if \(!isLatestProductRequest\(requestId, categorySnapshot\)\) return[\s\S]*?showError/)
  assert.match(productLoader, /finally \{[\s\S]*?if \(isLatestProductRequest\(requestId, categorySnapshot\)\) productsLoading\.value = false/)

  assert.match(reviewLoader, /const requestId = \+\+reviewsRequestSequence/)
  assert.match(reviewLoader, /const querySnapshot = buildReviewQuery\(\)/)
  assert.match(reviewLoader, /api\.getAdminProductReviews\(querySnapshot\)/)
  assert.ok(occurrenceCount(reviewLoader, /isLatestReviewRequest\(requestId, querySnapshot\)/g) >= 3)
  assert.match(reviewLoader, /catch \(error\) \{[\s\S]*?if \(!isLatestReviewRequest\(requestId, querySnapshot\)\) return[\s\S]*?showError/)
  assert.match(reviewLoader, /finally \{[\s\S]*?if \(isLatestReviewRequest\(requestId, querySnapshot\)\) loading\.value = false/)

  assert.match(reviews, /watch\(filters, applyFilters, \{ deep: true \}\)/)
})

test('manual review validation matches author and decimal-rating domain limits', () => {
  assert.match(reviews, /v-model\.trim="form\.author_name"[^>]*maxlength="100"/)
  assert.doesNotMatch(reviews, /v-model\.trim="form\.author_name"[^>]*maxlength="120"/)
  assert.match(reviews, /form\.author_name\.trim\(\)\.length > 100/)
  assert.match(reviews, /!\/\^\\d\(\?:\\\.\\d\)\?\$\/\.test\(String\(form\.rating\)\)/)
  assert.match(reviews, /评分最多保留一位小数/)
})
