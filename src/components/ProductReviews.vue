<template>
  <section v-if="localReviews.length" class="product-reviews" aria-labelledby="product-reviews-title">
    <div class="reviews-heading">
      <div>
        <p class="reviews-kicker">{{ t('reviewsKicker') }}</p>
        <h2 id="product-reviews-title">{{ t('reviewsTitle') }}</h2>
      </div>
      <div class="reviews-summary">
        <strong>{{ Number(summary.ratingValue) }}</strong>
        <span aria-hidden="true">/ 5</span>
        <span>{{ formatProductReviewUiText(t('reviewsPublishedCount'), { count: summary.reviewCount }) }}</span>
      </div>
    </div>

    <div class="review-list">
      <article v-for="review in localReviews" :key="reviewKey(review)" class="review-card">
        <header class="review-header">
          <div>
            <h3 v-if="review.review_title">{{ review.review_title }}</h3>
            <p class="review-author">{{ review.author_name }}</p>
          </div>
          <time v-if="review.review_date" :datetime="review.review_date">{{ review.review_date }}</time>
        </header>

        <div class="review-rating" :aria-label="formatProductReviewUiText(t('reviewsRatingAria'), { rating: Number(review.rating) })">
          <span class="numeric-rating">{{ Number(review.rating) }} / 5</span>
          <span class="stars" aria-hidden="true">
            <span class="stars-empty">★★★★★</span>
            <span class="stars-filled" :style="{ width: `${ratingPercent(review.rating)}%` }">★★★★★</span>
          </span>
        </div>

        <p class="review-body">{{ review.review_text }}</p>

        <div v-if="review.verified_purchase || review.is_incentivized" class="review-badges">
          <span v-if="review.verified_purchase" class="review-badge">{{ t('reviewsVerifiedPurchase') }}</span>
          <span v-if="review.is_incentivized" class="review-badge review-badge-incentive">{{ t('reviewsIncentivized') }}</span>
        </div>
        <p v-if="review.is_incentivized && review.incentive_disclosure" class="review-disclosure">
          {{ review.incentive_disclosure }}
        </p>
      </article>
    </div>

    <p v-if="loadError" class="review-error" role="status">{{ loadError }}</p>
    <button
      v-if="localPagination.total > localReviews.length"
      class="btn btn-outline load-more-reviews"
      type="button"
      :disabled="loadingMore"
      @click="loadMore"
    >
      {{ loadingMore ? t('reviewsLoading') : t('reviewsLoadMore') }}
    </button>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'
import api from '../api'
import { useLang } from '../composables/useLang'
import { formatProductReviewUiText } from '../../shared/productReviewSeo.js'

const { t } = useLang()

const props = defineProps({
  productId: { type: [Number, String], required: true },
  lang: { type: String, required: true },
  reviews: { type: Array, default: () => [] },
  summary: { type: Object, default: () => ({ ratingValue: 0, reviewCount: 0 }) },
  pagination: { type: Object, default: () => ({ page: 1, limit: 10, total: 0 }) }
})
const emit = defineEmits(['reviews-updated'])

const localReviews = ref([...props.reviews])
const localPagination = ref({ ...props.pagination })
const loadingMore = ref(false)
const loadError = ref('')
let loadToken = 0

function resetFromProps() {
  loadToken += 1
  localReviews.value = [...props.reviews]
  localPagination.value = { ...props.pagination }
  loadingMore.value = false
  loadError.value = ''
}

watch([() => props.productId, () => props.lang, () => props.reviews, () => props.pagination], resetFromProps)

function reviewKey(review) {
  return review.id ?? [review.author_name, review.review_date, review.review_text].join('|')
}

function ratingPercent(rating) {
  return Math.max(0, Math.min(100, Number(reviewRating(rating)) * 20))
}

function reviewRating(rating) {
  const value = Number(rating)
  return Number.isFinite(value) ? value : 0
}

async function loadMore() {
  if (loadingMore.value || localPagination.value.total <= localReviews.value.length) return

  const nextPage = Number(localPagination.value.page || 1) + 1
  const requestToken = ++loadToken
  const requestKey = `${props.productId}:${props.lang}`
  loadingMore.value = true
  loadError.value = ''

  try {
    const result = await api.getPublicProductReviews(props.productId, {
      lang: props.lang,
      page: nextPage,
      limit: Number(localPagination.value.limit || 10)
    })
    if (requestToken !== loadToken || requestKey !== `${props.productId}:${props.lang}`) return

    const deduplicated = new Map(localReviews.value.map(review => [reviewKey(review), review]))
    for (const review of result.reviews || []) deduplicated.set(reviewKey(review), review)
    const nextPublicReviews = {
      reviews: [...deduplicated.values()],
      summary: result.summary || props.summary,
      pagination: { ...localPagination.value, ...(result.pagination || {}), page: nextPage }
    }
    localReviews.value = nextPublicReviews.reviews
    localPagination.value = nextPublicReviews.pagination
    emit('reviews-updated', nextPublicReviews, { productId: props.productId, lang: props.lang })
  } catch (error) {
    if (requestToken === loadToken) loadError.value = t('reviewsLoadError')
  } finally {
    if (requestToken === loadToken) loadingMore.value = false
  }
}
</script>

<style scoped>
.product-reviews {
  margin-top: var(--spacing-2xl);
  padding: var(--spacing-xl);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--white);
}

.reviews-heading,
.review-header {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing);
}

.reviews-heading {
  align-items: end;
  margin-bottom: var(--spacing-lg);
}

.reviews-kicker,
.review-author,
.review-header time,
.reviews-summary span {
  color: var(--text-secondary);
}

.reviews-kicker {
  margin: 0 0 var(--spacing-xs);
  font-size: var(--text-sm);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.reviews-heading h2,
.review-header h3,
.review-author,
.review-body,
.review-disclosure {
  margin: 0;
}

.reviews-summary {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-xs);
}

.reviews-summary strong {
  font-size: var(--text-2xl);
}

.review-list {
  display: grid;
  gap: var(--spacing);
}

.review-card {
  padding: var(--spacing-lg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--gray-50);
}

.review-header time,
.review-author,
.review-disclosure,
.review-error {
  font-size: var(--text-sm);
}

.review-rating {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin: var(--spacing-sm) 0;
}

.numeric-rating {
  font-weight: 700;
}

.stars {
  position: relative;
  display: inline-block;
  color: #cbd5e1;
  line-height: 1;
}

.stars-filled {
  position: absolute;
  inset: 0 auto 0 0;
  overflow: hidden;
  color: #f59e0b;
  white-space: nowrap;
}

.review-body {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.review-badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  margin-top: var(--spacing);
}

.review-badge {
  padding: 3px 8px;
  border-radius: 999px;
  background: #dcfce7;
  color: #166534;
  font-size: var(--text-xs);
  font-weight: 700;
}

.review-badge-incentive {
  background: #fef3c7;
  color: #92400e;
}

.review-disclosure,
.review-error {
  margin-top: var(--spacing-sm);
}

.review-disclosure {
  color: var(--text-secondary);
  font-style: italic;
}

.review-error {
  color: #b91c1c;
}

.load-more-reviews {
  margin-top: var(--spacing-lg);
}

@media (max-width: 640px) {
  .product-reviews {
    padding: var(--spacing);
  }

  .reviews-heading,
  .review-header,
  .reviews-summary {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
