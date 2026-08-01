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

export function buildReviewSchemaParts({ reviews = [], summary = {} } = {}) {
  const ratingValue = positiveNumber(summary?.ratingValue)
  const reviewCount = positiveNumber(summary?.reviewCount)
  if (!Array.isArray(reviews) || reviews.length === 0 || ratingValue === null || reviewCount === null) {
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
