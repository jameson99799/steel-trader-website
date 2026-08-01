import { createHash, randomUUID } from 'node:crypto'

const REVIEW_STATUSES = new Set(['pending', 'published', 'hidden'])
const REVIEW_SOURCES = new Set(['admin', 'admin_import', 'external_api', 'migration'])
const WRITABLE_FIELDS = [
  'product_id',
  'author_name',
  'review_title',
  'review_date',
  'rating',
  'review_text',
  'status',
  'source',
  'external_id',
  'verified_purchase',
  'is_incentivized',
  'incentive_disclosure',
  'import_batch_id'
]

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function positiveInteger(value, label) {
  const number = typeof value === 'string' && /^\d+$/.test(value.trim())
    ? Number(value)
    : value
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new Error(`${label} must be a positive integer`)
  }
  return number
}

function boundedInteger(value, { label, defaultValue, minimum, maximum }) {
  if (value === undefined || value === null || value === '') return defaultValue
  const number = typeof value === 'string' && /^\d+$/.test(value.trim())
    ? Number(value)
    : value
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
    throw new Error(`${label} must be an integer between ${minimum} and ${maximum}`)
  }
  return number
}

function optionalTrimmed(value) {
  if (value === undefined || value === null) return null
  const normalized = String(value).trim()
  return normalized || null
}

function requiredTrimmed(value, label) {
  const normalized = optionalTrimmed(value)
  if (normalized === null) throw new Error(`${label} is required`)
  return normalized
}

function normalizedFlag(value, label) {
  if (value === undefined || value === null || value === false || value === 0 || value === '0') return 0
  if (value === true || value === 1 || value === '1') return 1
  throw new Error(`${label} must be 0 or 1`)
}

function normalizedRating(value) {
  if (value === null || value === undefined || value === '') {
    throw new Error('rating is required')
  }
  const rating = typeof value === 'number' ? value : Number(String(value).trim())
  if (!Number.isFinite(rating) || rating < 1 || rating > 5 || !Number.isInteger(rating * 10)) {
    throw new Error('rating must be between 1 and 5 with at most one decimal place')
  }
  return Math.round(rating * 10) / 10
}

function normalizedStatus(value) {
  if (!REVIEW_STATUSES.has(value)) {
    throw new Error('status must be pending, published, or hidden')
  }
  return value
}

function normalizedSource(value) {
  if (!REVIEW_SOURCES.has(value)) {
    throw new Error('source must be admin, admin_import, external_api, or migration')
  }
  return value
}

export function normalizeReviewDate(value) {
  if (value === undefined || value === null) throw new Error('review date is required')
  const text = String(value).trim()
  let year
  let month
  let day

  const separated = text.match(/^(\d{4})([-/])(\d{1,2})\2(\d{1,2})$/)
  const chinese = text.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/)
  if (separated) {
    year = Number(separated[1])
    month = Number(separated[3])
    day = Number(separated[4])
  } else if (chinese) {
    year = Number(chinese[1])
    month = Number(chinese[2])
    day = Number(chinese[3])
  } else {
    throw new Error('review date has an unsupported format')
  }

  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const monthLengths = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > monthLengths[month - 1]) {
    throw new Error('review date is not a real calendar date')
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function normalizeReviewInput(input, policy = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('review input must be an object')
  }
  const {
    source = 'admin',
    forcedStatus = null,
    requireProduct = true
  } = policy

  const authorName = requiredTrimmed(input.author_name, 'author_name')
  if (Array.from(authorName).length > 100) {
    throw new Error('author_name must contain at most 100 characters')
  }
  const reviewText = requiredTrimmed(input.review_text, 'review_text')
  const reviewTitle = optionalTrimmed(input.review_title)
  const externalId = optionalTrimmed(input.external_id)
  const incentiveDisclosure = optionalTrimmed(input.incentive_disclosure)
  const isIncentivized = normalizedFlag(input.is_incentivized, 'is_incentivized')
  if (isIncentivized && incentiveDisclosure === null) {
    throw new Error('incentive_disclosure is required for an incentivized review')
  }

  let productId = null
  if (requireProduct || (input.product_id !== undefined && input.product_id !== null && input.product_id !== '')) {
    productId = positiveInteger(input.product_id, 'product_id')
  }

  let reviewDate = null
  if (input.review_date !== undefined && input.review_date !== null && String(input.review_date).trim() !== '') {
    reviewDate = normalizeReviewDate(input.review_date)
  }

  const effectiveStatus = forcedStatus === null || forcedStatus === undefined
    ? (input.status ?? 'pending')
    : forcedStatus

  return {
    product_id: productId,
    author_name: authorName,
    review_title: reviewTitle,
    review_date: reviewDate,
    rating: normalizedRating(input.rating),
    review_text: reviewText,
    status: normalizedStatus(effectiveStatus),
    source: normalizedSource(source),
    external_id: externalId,
    verified_purchase: normalizedFlag(input.verified_purchase, 'verified_purchase'),
    is_incentivized: isIncentivized,
    incentive_disclosure: incentiveDisclosure,
    import_batch_id: optionalTrimmed(input.import_batch_id)
  }
}

export function reviewSourceHash(review) {
  return createHash('sha256')
    .update(JSON.stringify([
      review?.review_title ?? '',
      review?.review_text ?? '',
      review?.incentive_disclosure ?? ''
    ]))
    .digest('hex')
}

export function parseBulkReviewText(text) {
  const result = { valid: [], invalid: [], duplicates: [] }
  const seen = new Set()
  const lines = String(text ?? '').split(/\r?\n/)
  const pattern = /^(.*?)\s+-\s+(\d{4}(?:-\d{1,2}-\d{1,2}|\/\d{1,2}\/\d{1,2}|年\d{1,2}月\d{1,2}日))\s+-\s+([^\r\n-]+?)\s+-\s+(.*)$/u

  lines.forEach((raw, index) => {
    const line = index + 1
    if (!raw.trim()) return
    const match = raw.match(pattern)
    if (!match) {
      result.invalid.push({ line, raw, error: 'Invalid review line format' })
      return
    }

    try {
      const normalized = normalizeReviewInput({
        author_name: match[1],
        review_date: match[2],
        rating: match[3],
        review_text: match[4],
        review_title: null,
        status: 'published',
        external_id: null,
        verified_purchase: 0,
        is_incentivized: 0,
        incentive_disclosure: null,
        import_batch_id: null
      }, {
        source: 'admin_import',
        forcedStatus: 'published',
        requireProduct: false
      })
      const row = { line, ...normalized }
      delete row.product_id
      const duplicateKey = JSON.stringify([
        row.author_name,
        row.review_date,
        row.rating,
        row.review_text
      ])
      if (seen.has(duplicateKey)) {
        result.duplicates.push({ line, raw, error: 'Duplicate review in this batch' })
      } else {
        seen.add(duplicateKey)
        result.valid.push(row)
      }
    } catch (error) {
      result.invalid.push({ line, raw, error: error.message })
    }
  })

  return result
}

function placeholders(count) {
  return Array.from({ length: count }, () => '?').join(', ')
}

function categoryScope(categoryId, productAlias = 'p') {
  return {
    cte: `WITH RECURSIVE category_tree(id) AS (
      SELECT id FROM categories WHERE id = ?
      UNION ALL
      SELECT category.id
      FROM categories AS category
      INNER JOIN category_tree AS parent ON category.parent_id = parent.id
    )`,
    condition: `${productAlias}.category_id IN (SELECT id FROM category_tree)`,
    parameter: positiveInteger(categoryId, 'categoryId')
  }
}

function adminFilterParts(filters = {}) {
  const conditions = []
  const parameters = []
  let cte = ''

  if (filters.categoryId !== undefined && filters.categoryId !== null && filters.categoryId !== '') {
    const scope = categoryScope(filters.categoryId)
    cte = scope.cte
    conditions.push(scope.condition)
    parameters.push(scope.parameter)
  }
  if (filters.productId !== undefined && filters.productId !== null && filters.productId !== '') {
    conditions.push('r.product_id = ?')
    parameters.push(positiveInteger(filters.productId, 'productId'))
  }
  if (filters.status !== undefined && filters.status !== null && filters.status !== '') {
    conditions.push('r.status = ?')
    parameters.push(normalizedStatus(filters.status))
  }
  if (filters.source !== undefined && filters.source !== null && filters.source !== '') {
    conditions.push('r.source = ?')
    parameters.push(normalizedSource(filters.source))
  }
  if (filters.q !== undefined && filters.q !== null && String(filters.q).trim() !== '') {
    const query = `%${String(filters.q).trim()}%`
    conditions.push(`(
      r.author_name LIKE ? OR
      r.review_title LIKE ? OR
      r.review_text LIKE ? OR
      r.external_id LIKE ?
    )`)
    parameters.push(query, query, query, query)
  }
  if (filters.dateFrom !== undefined && filters.dateFrom !== null && filters.dateFrom !== '') {
    conditions.push('r.review_date >= ?')
    parameters.push(normalizeReviewDate(filters.dateFrom))
  }
  if (filters.dateTo !== undefined && filters.dateTo !== null && filters.dateTo !== '') {
    conditions.push('r.review_date <= ?')
    parameters.push(normalizeReviewDate(filters.dateTo))
  }

  return {
    cte,
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    parameters
  }
}

export function createProductReviewStore({
  getAll,
  getOne,
  run,
  transaction,
  invalidateCache = () => {}
}) {
  if (![getAll, getOne, run, transaction].every(dependency => typeof dependency === 'function')) {
    throw new Error('product review store requires getAll, getOne, run, and transaction')
  }

  function findReview(id) {
    return getOne('SELECT * FROM product_reviews WHERE id = ?', [positiveInteger(id, 'id')])
  }

  function findExternal(source, externalId) {
    if (externalId === null) return null
    return getOne(
      'SELECT * FROM product_reviews WHERE source = ? AND external_id = ?',
      [source, externalId]
    )
  }

  function insertNormalized(review) {
    const values = WRITABLE_FIELDS.map(field => review[field])
    const result = run(`
      INSERT INTO product_reviews (
        ${WRITABLE_FIELDS.join(', ')}, published_at
      ) VALUES (
        ${placeholders(WRITABLE_FIELDS.length)},
        CASE WHEN ? = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END
      )
    `, [...values, review.status])
    return getOne('SELECT * FROM product_reviews WHERE id = ?', [Number(result.lastInsertRowid)])
  }

  function listAdmin(filters = {}) {
    const page = boundedInteger(filters.page, {
      label: 'page', defaultValue: 1, minimum: 1, maximum: Number.MAX_SAFE_INTEGER
    })
    const limit = boundedInteger(filters.limit, {
      label: 'limit', defaultValue: 20, minimum: 1, maximum: 100
    })
    const { cte, where, parameters } = adminFilterParts(filters)
    const totalRow = getOne(`
      ${cte}
      SELECT COUNT(*) AS total
      FROM product_reviews AS r
      INNER JOIN products AS p ON p.id = r.product_id
      ${where}
    `, parameters)
    const data = getAll(`
      ${cte}
      SELECT
        r.*,
        p.name_en AS product_name_en,
        p.category_id AS category_id,
        c.name_en AS category_name_en
      FROM product_reviews AS r
      INNER JOIN products AS p ON p.id = r.product_id
      LEFT JOIN categories AS c ON c.id = p.category_id
      ${where}
      ORDER BY r.review_date DESC, r.id DESC
      LIMIT ? OFFSET ?
    `, [...parameters, limit, (page - 1) * limit])
    return { data, total: Number(totalRow?.total || 0), page, limit }
  }

  function getById(id) {
    const review = getOne(`
      SELECT
        r.*,
        p.name_en AS product_name_en,
        p.category_id AS category_id,
        c.name_en AS category_name_en
      FROM product_reviews AS r
      INNER JOIN products AS p ON p.id = r.product_id
      LEFT JOIN categories AS c ON c.id = p.category_id
      WHERE r.id = ?
    `, [positiveInteger(id, 'id')])
    if (!review) return null
    review.translations = getAll(`
      SELECT *
      FROM product_review_translations
      WHERE review_id = ?
      ORDER BY language_code
    `, [review.id])
    return review
  }

  function create(input, { source = 'admin', forcedStatus = null } = {}) {
    const review = normalizeReviewInput(input, { source, forcedStatus, requireProduct: true })
    if (!getOne('SELECT id FROM products WHERE id = ?', [review.product_id])) {
      throw new Error('product does not exist')
    }
    const existing = findExternal(review.source, review.external_id)
    if (existing) return { ...getById(existing.id), idempotent: true }

    const created = insertNormalized(review)
    invalidateCache(review.product_id)
    return { ...created, idempotent: false }
  }

  function bulkCreate(productId, rows, { source = 'admin_import', forcedStatus = 'published' } = {}) {
    const normalizedProductId = positiveInteger(productId, 'productId')
    if (!Array.isArray(rows) || rows.length < 1 || rows.length > 200) {
      throw new Error('bulk review rows must contain between 1 and 200 entries')
    }
    if (!getOne('SELECT id FROM products WHERE id = ?', [normalizedProductId])) {
      throw new Error('product does not exist')
    }

    const normalizedRows = rows.map((row, index) => {
      const line = row?.line ?? index + 1
      try {
        return normalizeReviewInput({ ...row, product_id: normalizedProductId }, {
          source,
          forcedStatus,
          requireProduct: true
        })
      } catch (error) {
        throw new Error(`line ${line}: ${error.message}`)
      }
    })
    const importBatchId = randomUUID()
    normalizedRows.forEach(row => {
      row.import_batch_id = importBatchId
    })

    const outcome = transaction(() => {
      const created = []
      const existing = []
      for (const row of normalizedRows) {
        const duplicate = findExternal(row.source, row.external_id)
        if (duplicate) {
          existing.push(duplicate)
        } else {
          created.push(insertNormalized(row))
        }
      }
      return { created, existing }
    })

    if (outcome.created.length) invalidateCache(normalizedProductId)
    return { ...outcome, import_batch_id: importBatchId }
  }

  function update(id, input, { forcedStatus = null } = {}) {
    const reviewId = positiveInteger(id, 'id')
    const existing = findReview(reviewId)
    if (!existing) return null
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new Error('review input must be an object')
    }

    const candidate = { ...existing }
    for (const field of WRITABLE_FIELDS) {
      if (hasOwn(input, field) && !['product_id', 'source', 'external_id'].includes(field)) {
        candidate[field] = input[field]
      }
    }
    candidate.product_id = existing.product_id
    candidate.source = existing.source
    candidate.external_id = existing.external_id
    const normalized = normalizeReviewInput(candidate, {
      source: existing.source,
      forcedStatus,
      requireProduct: true
    })
    const sourceChanged = ['review_title', 'review_text', 'incentive_disclosure']
      .some(field => normalized[field] !== existing[field])

    transaction(() => {
      run(`
        UPDATE product_reviews
        SET
          author_name = ?,
          review_title = ?,
          review_date = ?,
          rating = ?,
          review_text = ?,
          status = ?,
          verified_purchase = ?,
          is_incentivized = ?,
          incentive_disclosure = ?,
          import_batch_id = ?,
          updated_at = CURRENT_TIMESTAMP,
          published_at = CASE
            WHEN ? = 'published' AND status <> 'published' THEN CURRENT_TIMESTAMP
            WHEN ? = 'published' THEN published_at
            ELSE NULL
          END
        WHERE id = ?
      `, [
        normalized.author_name,
        normalized.review_title,
        normalized.review_date,
        normalized.rating,
        normalized.review_text,
        normalized.status,
        normalized.verified_purchase,
        normalized.is_incentivized,
        normalized.incentive_disclosure,
        normalized.import_batch_id,
        normalized.status,
        normalized.status,
        reviewId
      ])
      if (sourceChanged) {
        run('DELETE FROM product_review_translations WHERE review_id = ?', [reviewId])
        run("DELETE FROM translations WHERE content_type = 'product_review' AND content_id = ?", [reviewId])
      }
    })

    invalidateCache(existing.product_id)
    return getById(reviewId)
  }

  function remove(id) {
    const reviewId = positiveInteger(id, 'id')
    const existing = findReview(reviewId)
    if (!existing) return false
    run('DELETE FROM product_reviews WHERE id = ?', [reviewId])
    invalidateCache(existing.product_id)
    return true
  }

  function bulkStatus(ids, status) {
    if (!Array.isArray(ids)) throw new Error('ids must be an array of positive integers')
    const uniqueIds = [...new Set(ids.map(id => positiveInteger(id, 'ids entries')))]
    const normalized = normalizedStatus(status)
    if (!uniqueIds.length) return { updated: 0, productIds: [] }

    const rows = getAll(`
      SELECT id, product_id
      FROM product_reviews
      WHERE id IN (${placeholders(uniqueIds.length)})
      ORDER BY product_id, id
    `, uniqueIds)
    if (!rows.length) return { updated: 0, productIds: [] }
    const existingIds = rows.map(row => row.id)
    const result = run(`
      UPDATE product_reviews
      SET
        status = ?,
        published_at = CASE
          WHEN ? = 'published' THEN COALESCE(published_at, CURRENT_TIMESTAMP)
          ELSE NULL
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders(existingIds.length)})
    `, [normalized, normalized, ...existingIds])
    const productIds = [...new Set(rows.map(row => row.product_id))]
    productIds.forEach(invalidateCache)
    return { updated: result.changes, productIds }
  }

  function publishAll(filters = {}) {
    const hasProduct = filters.productId !== undefined && filters.productId !== null && filters.productId !== ''
    const hasCategory = filters.categoryId !== undefined && filters.categoryId !== null && filters.categoryId !== ''
    if (!hasProduct && !hasCategory) {
      throw new Error('publishAll requires a productId or categoryId scope')
    }
    const scope = adminFilterParts({
      productId: hasProduct ? filters.productId : undefined,
      categoryId: hasCategory ? filters.categoryId : undefined,
      status: 'pending'
    })
    const rows = getAll(`
      ${scope.cte}
      SELECT r.id, r.product_id
      FROM product_reviews AS r
      INNER JOIN products AS p ON p.id = r.product_id
      ${scope.where}
      ORDER BY r.product_id, r.id
    `, scope.parameters)
    if (!rows.length) return { updated: 0, productIds: [] }

    const reviewIds = rows.map(row => row.id)
    const result = run(`
      UPDATE product_reviews
      SET
        status = 'published',
        published_at = COALESCE(published_at, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders(reviewIds.length)})
    `, reviewIds)
    const productIds = [...new Set(rows.map(row => row.product_id))]
    productIds.forEach(invalidateCache)
    return { updated: result.changes, productIds }
  }

  function listPublic({ productId, lang = 'en', page = 1, limit = 10 }) {
    const normalizedProductId = positiveInteger(productId, 'productId')
    const normalizedPage = boundedInteger(page, {
      label: 'page', defaultValue: 1, minimum: 1, maximum: Number.MAX_SAFE_INTEGER
    })
    const normalizedLimit = boundedInteger(limit, {
      label: 'limit', defaultValue: 10, minimum: 1, maximum: Number.MAX_SAFE_INTEGER
    })
    const language = String(lang || 'en').trim().toLowerCase()
    const summaryRow = getOne(`
      SELECT COUNT(*) AS review_count, AVG(rating) AS rating_value
      FROM product_reviews
      WHERE product_id = ? AND status = 'published'
    `, [normalizedProductId])
    const reviewCount = Number(summaryRow?.review_count || 0)
    const summary = {
      ratingValue: reviewCount ? Math.round(Number(summaryRow.rating_value) * 10) / 10 : 0,
      reviewCount
    }

    if (language === 'en') {
      const reviews = getAll(`
        SELECT *
        FROM product_reviews
        WHERE product_id = ? AND status = 'published'
        ORDER BY review_date DESC, id DESC
        LIMIT ? OFFSET ?
      `, [normalizedProductId, normalizedLimit, (normalizedPage - 1) * normalizedLimit])
      return {
        reviews,
        summary,
        pagination: { page: normalizedPage, limit: normalizedLimit, total: reviewCount }
      }
    }

    const translatedRows = getAll(`
      SELECT
        r.*,
        r.review_title AS source_review_title,
        r.review_text AS source_review_text,
        r.incentive_disclosure AS source_incentive_disclosure,
        t.review_title AS translated_review_title,
        t.review_text AS translated_review_text,
        t.incentive_disclosure AS translated_incentive_disclosure,
        t.source_hash AS translation_source_hash
      FROM product_reviews AS r
      INNER JOIN product_review_translations AS t
        ON t.review_id = r.id AND t.language_code = ?
      WHERE r.product_id = ? AND r.status = 'published'
      ORDER BY r.review_date DESC, r.id DESC
    `, [language, normalizedProductId])
    const validRows = translatedRows
      .filter(row => row.translation_source_hash === reviewSourceHash({
        review_title: row.source_review_title,
        review_text: row.source_review_text,
        incentive_disclosure: row.source_incentive_disclosure
      }))
      .map(row => {
        const {
          source_review_title,
          source_review_text,
          source_incentive_disclosure,
          translated_review_title,
          translated_review_text,
          translated_incentive_disclosure,
          translation_source_hash,
          ...publicReview
        } = row
        publicReview.review_title = translated_review_title
        publicReview.review_text = translated_review_text
        publicReview.incentive_disclosure = translated_incentive_disclosure
        return publicReview
      })
    const offset = (normalizedPage - 1) * normalizedLimit
    return {
      reviews: validRows.slice(offset, offset + normalizedLimit),
      summary,
      pagination: { page: normalizedPage, limit: normalizedLimit, total: validRows.length }
    }
  }

  function translationStatus(reviewId) {
    const review = findReview(reviewId)
    if (!review) return []
    const sourceHash = reviewSourceHash(review)
    return getAll(`
      SELECT l.code AS language_code, t.id AS translation_id, t.source_hash
      FROM languages AS l
      LEFT JOIN product_review_translations AS t
        ON t.review_id = ? AND t.language_code = l.code
      WHERE l.status = 1 AND l.code <> 'en'
      ORDER BY l.id
    `, [review.id]).map(row => ({
      language_code: row.language_code,
      translated: row.source_hash === sourceHash,
      stale: row.translation_id !== null && row.translation_id !== undefined && row.source_hash !== sourceHash
    }))
  }

  return {
    listAdmin,
    getById,
    create,
    bulkCreate,
    update,
    remove,
    bulkStatus,
    publishAll,
    listPublic,
    translationStatus
  }
}
