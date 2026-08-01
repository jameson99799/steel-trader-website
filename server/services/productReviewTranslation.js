import { reviewSourceHash } from './productReviews.js'

const OPTIONAL_FIELDS = ['review_title', 'incentive_disclosure']

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export function collectProductReviews(readAll) {
  const reviews = readAll(`
    SELECT id, product_id, author_name, review_title, review_text, incentive_disclosure
    FROM product_reviews
    WHERE status = 'published'
    ORDER BY id
  `)
  const items = []

  for (const review of reviews) {
    const itemName = `${review.author_name} / Product #${review.product_id}`
    const addField = (field, text) => {
      items.push({
        type: 'product_review',
        content_type: 'product_review',
        id: review.id,
        field,
        text,
        itemName
      })
    }

    if (hasText(review.review_title)) addField('review_title', review.review_title)
    addField('review_text', review.review_text)
    if (hasText(review.incentive_disclosure)) {
      addField('incentive_disclosure', review.incentive_disclosure)
    }
  }

  return items
}

export function saveManualTranslation({
  lang,
  type,
  id,
  field,
  original,
  translated,
  getOne,
  getAll,
  run
}) {
  const contentId = id || null
  const updated = run(`
    UPDATE translations
    SET original_text = ?,
        translated_text = ?,
        is_manual = 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE language_code = ?
      AND content_type = ?
      AND content_id IS ?
      AND content_field = ?
  `, [original, translated, lang, type, contentId, field])

  if (!updated?.changes) {
    run(`
      INSERT INTO translations
        (language_code, content_type, content_id, content_field, original_text, translated_text, is_manual)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [lang, type, contentId, field, original, translated])
  }

  if (type === 'product_review') {
    syncProductReviewTranslation({ reviewId: contentId, lang, getOne, getAll, run })
  }

  return { saved: true }
}

export function syncProductReviewTranslation({ reviewId, lang, getOne, getAll, run }) {
  if (!lang || lang === 'en') {
    return { synced: false, reason: 'english-source' }
  }

  const removePublishedTranslation = () => {
    if (reviewId === null || reviewId === undefined || reviewId === '') return
    run(
      'DELETE FROM product_review_translations WHERE review_id = ? AND language_code = ?',
      [reviewId, lang]
    )
  }

  const review = getOne(`
    SELECT id, review_title, review_text, incentive_disclosure
    FROM product_reviews
    WHERE id = ? AND status = 'published'
  `, [reviewId])

  if (!review) {
    removePublishedTranslation()
    return { synced: false, reason: 'review-unavailable' }
  }

  const translations = getAll(`
    SELECT content_field, original_text, translated_text
    FROM translations
    WHERE language_code = ?
      AND content_type = 'product_review'
      AND content_id = ?
  `, [lang, reviewId])
  const byField = new Map(translations.map(translation => [translation.content_field, translation]))
  const requiredFields = ['review_text', ...OPTIONAL_FIELDS.filter(field => hasText(review[field]))]
  const complete = requiredFields.every(field => {
    const translation = byField.get(field)
    return translation &&
      translation.original_text === review[field] &&
      hasText(translation.translated_text)
  })

  if (!complete) {
    removePublishedTranslation()
    return { synced: false, reason: 'translation-incomplete' }
  }

  const translatedValue = field => hasText(review[field])
    ? byField.get(field).translated_text.trim()
    : null

  run(`
    INSERT INTO product_review_translations
      (review_id, language_code, review_title, review_text, incentive_disclosure, source_hash)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(review_id, language_code) DO UPDATE SET
      review_title = excluded.review_title,
      review_text = excluded.review_text,
      incentive_disclosure = excluded.incentive_disclosure,
      source_hash = excluded.source_hash,
      updated_at = CURRENT_TIMESTAMP
  `, [
    reviewId,
    lang,
    translatedValue('review_title'),
    translatedValue('review_text'),
    translatedValue('incentive_disclosure'),
    reviewSourceHash(review)
  ])

  return { synced: true }
}
