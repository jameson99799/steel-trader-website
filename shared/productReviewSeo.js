function positiveNumber(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

function reviewRating(value) {
  const number = positiveNumber(value)
  return number !== null && number >= 1 && number <= 5 ? number : null
}

function nonEmptyText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function validDate(value) {
  if (!nonEmptyText(value) || Number.isNaN(Date.parse(value))) return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return true

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
}

export const PRODUCT_REVIEW_UI_TEXT_EN = Object.freeze({
  reviewsKicker: 'Customer feedback',
  reviewsTitle: 'Product Reviews',
  reviewsPublishedCount: '{count} published reviews',
  reviewsVerifiedPurchase: 'Verified purchase',
  reviewsIncentivized: 'Incentivized review',
  reviewsLoadMore: 'Load more reviews',
  reviewsLoading: 'Loading…',
  reviewsLoadError: 'Reviews could not be loaded. Please try again.',
  reviewsRatingAria: '{rating} out of 5 stars'
})

export const PRODUCT_REVIEW_UI_TEXT_ZH = Object.freeze({
  reviewsKicker: '客户反馈',
  reviewsTitle: '产品评价',
  reviewsPublishedCount: '{count} 条已发布评价',
  reviewsVerifiedPurchase: '已验证购买',
  reviewsIncentivized: '激励评价',
  reviewsLoadMore: '加载更多评价',
  reviewsLoading: '加载中…',
  reviewsLoadError: '评价加载失败，请重试。',
  reviewsRatingAria: '{rating} 分（满分 5 分）'
})

export function buildProductReviewUiLabels({ lang = 'en', translations = {} } = {}) {
  const fallback = lang === 'zh' ? PRODUCT_REVIEW_UI_TEXT_ZH : PRODUCT_REVIEW_UI_TEXT_EN
  const source = translations && typeof translations === 'object' ? translations : {}
  return Object.fromEntries(Object.keys(PRODUCT_REVIEW_UI_TEXT_EN).map(key => [
    key,
    nonEmptyText(source[key]) ? source[key] : fallback[key]
  ]))
}

export function formatProductReviewUiText(template, values = {}) {
  return String(template || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) =>
    Object.hasOwn(values, key) ? String(values[key]) : match
  )
}

export function isMatchingProductReviewContext(incoming = {}, current = {}) {
  const generation = incoming?.generation
  const currentGeneration = current?.generation
  const productId = incoming?.productId == null ? '' : String(incoming.productId)
  const currentProductId = current?.productId == null ? '' : String(current.productId)

  return Number.isInteger(generation) && generation > 0 && generation === currentGeneration &&
    nonEmptyText(incoming?.slug) && incoming.slug === current?.slug &&
    nonEmptyText(incoming?.lang) && incoming.lang === current?.lang &&
    productId.length > 0 && productId === currentProductId
}

export function buildReviewSchemaParts({ reviews = [], summary = {} } = {}) {
  const ratingValue = positiveNumber(summary?.ratingValue)
  const reviewCount = positiveNumber(summary?.reviewCount)
  if (!Array.isArray(reviews) || reviews.length === 0 ||
      ratingValue === null || ratingValue > 5 ||
      reviewCount === null || !Number.isInteger(reviewCount)) {
    return {}
  }

  const visibleReviews = reviews.flatMap(review => {
    const rating = reviewRating(review?.rating)
    if (!nonEmptyText(review?.author_name) || !nonEmptyText(review?.review_text) || rating === null) {
      return []
    }

    const schemaReview = {
      '@type': 'Review',
      author: { '@type': 'Person', name: review.author_name },
      reviewRating: { '@type': 'Rating', ratingValue: rating, bestRating: 5, worstRating: 1 },
      reviewBody: review.review_text
    }
    if (nonEmptyText(review.review_title)) schemaReview.name = review.review_title
    if (validDate(review.review_date)) schemaReview.datePublished = review.review_date
    return [schemaReview]
  })

  if (visibleReviews.length === 0) return {}

  return {
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue,
      reviewCount,
      bestRating: 5,
      worstRating: 1
    },
    review: visibleReviews
  }
}
