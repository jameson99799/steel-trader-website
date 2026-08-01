import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import Database from 'better-sqlite3'
import { initializeProductReviewSchema } from '../server/services/productReviewSchema.js'
import {
  createProductReviewStore,
  normalizeReviewDate,
  normalizeReviewInput,
  parseBulkReviewText,
  reviewSourceHash
} from '../server/services/productReviews.js'

function createFixture() {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      name_en TEXT,
      parent_id INTEGER DEFAULT 0
    );
    CREATE TABLE products (
      id INTEGER PRIMARY KEY,
      category_id INTEGER,
      name TEXT NOT NULL,
      name_en TEXT
    );
    CREATE TABLE languages (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      status INTEGER DEFAULT 1
    );
    CREATE TABLE translations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      language_code TEXT NOT NULL,
      content_type TEXT NOT NULL,
      content_id INTEGER,
      content_field TEXT NOT NULL,
      original_text TEXT,
      translated_text TEXT
    );

    INSERT INTO categories (id, name, name_en, parent_id) VALUES
      (10, 'Root', 'Root', 0),
      (11, 'Child', 'Child', 10),
      (12, 'Grandchild', 'Grandchild', 11),
      (20, 'Other', 'Other', 0);
    INSERT INTO products (id, category_id, name, name_en) VALUES
      (1, 11, 'Panel', 'Panel'),
      (2, 12, 'Floodlight', 'Floodlight'),
      (3, 20, 'Strip', 'Strip');
    INSERT INTO languages (id, name, code, status) VALUES
      (1, 'English', 'en', 1),
      (2, 'Spanish', 'es', 1),
      (3, 'French', 'fr', 1),
      (4, 'Chinese', 'zh', 1),
      (5, 'German', 'de', 0);
  `)
  initializeProductReviewSchema(db)

  const invalidated = []
  const operations = []
  const store = createProductReviewStore({
    getAll(sql, params = []) {
      operations.push({ type: 'getAll', sql, inTransaction: db.inTransaction })
      return db.prepare(sql).all(...params)
    },
    getOne(sql, params = []) {
      operations.push({ type: 'getOne', sql, inTransaction: db.inTransaction })
      return db.prepare(sql).get(...params) || null
    },
    run(sql, params = []) {
      operations.push({ type: 'run', sql, inTransaction: db.inTransaction })
      const result = db.prepare(sql).run(...params)
      return { lastInsertRowid: result.lastInsertRowid, changes: result.changes }
    },
    transaction(fn) {
      operations.push({ type: 'transaction-start', inTransaction: db.inTransaction })
      const result = db.transaction(() => {
        operations.push({ type: 'transaction-callback', inTransaction: db.inTransaction })
        return fn()
      })()
      operations.push({ type: 'transaction-end', inTransaction: db.inTransaction })
      return result
    },
    invalidateCache(productId) {
      operations.push({ type: 'invalidateCache', productId, inTransaction: db.inTransaction })
      invalidated.push(productId)
    }
  })

  return { db, store, invalidated, operations }
}

function assertSelectionAndUpdateAreAtomic(operations, selectFragment) {
  const selectIndex = operations.findIndex(operation =>
    operation.type === 'getAll' && operation.sql.includes(selectFragment)
  )
  const updateIndex = operations.findIndex(operation =>
    operation.type === 'run' && operation.sql.includes('UPDATE product_reviews')
  )
  const transactionEndIndex = operations.findIndex(operation => operation.type === 'transaction-end')
  const invalidationIndexes = operations
    .map((operation, index) => operation.type === 'invalidateCache' ? index : -1)
    .filter(index => index >= 0)

  assert.ok(selectIndex >= 0, 'expected the real target-selection query to execute')
  assert.ok(updateIndex > selectIndex, 'expected the real update after target selection')
  assert.equal(operations[selectIndex].inTransaction, true)
  assert.equal(operations[updateIndex].inTransaction, true)
  assert.ok(transactionEndIndex > updateIndex, 'expected the update to finish before transaction commit')
  assert.ok(invalidationIndexes.length > 0, 'expected cache invalidation after the mutation')
  for (const index of invalidationIndexes) {
    assert.ok(index > transactionEndIndex, 'cache invalidation must run after transaction commit')
    assert.equal(operations[index].inTransaction, false)
  }
}

function reviewInput(overrides = {}) {
  return {
    product_id: 1,
    author_name: 'Real Buyer',
    review_title: 'Solid panel',
    review_date: '2026-01-02',
    rating: 4.7,
    review_text: 'Installed on a real project.',
    status: 'published',
    external_id: null,
    verified_purchase: 0,
    is_incentivized: 0,
    incentive_disclosure: null,
    ...overrides
  }
}

test('normalizes all accepted calendar date formats and rejects impossible dates', () => {
  assert.equal(normalizeReviewDate('2026-1-2'), '2026-01-02')
  assert.equal(normalizeReviewDate('2026/01/2'), '2026-01-02')
  assert.equal(normalizeReviewDate('2024年2月29日'), '2024-02-29')
  assert.throws(() => normalizeReviewDate('2026-02-29'), /date/i)
  assert.throws(() => normalizeReviewDate('2026-02-30'), /date/i)
  assert.throws(() => normalizeReviewDate(''), /date/i)
  assert.throws(() => normalizeReviewDate('02-01-2026'), /date/i)
})

test('normalizes writable input, trims text, enforces policy, and preserves valid rating precision', () => {
  const input = reviewInput({
    author_name: '  Real Buyer  ',
    review_title: '   ',
    review_text: '  Authentic experience.  ',
    rating: '4.7',
    status: 'published',
    source: 'migration',
    external_id: ' order-8 ',
    verified_purchase: true,
    is_incentivized: '0'
  })
  const original = structuredClone(input)
  const normalized = normalizeReviewInput(input, {
    source: 'external_api',
    forcedStatus: 'pending',
    requireProduct: true
  })

  assert.deepEqual(normalized, {
    product_id: 1,
    author_name: 'Real Buyer',
    review_title: null,
    review_date: '2026-01-02',
    rating: 4.7,
    review_text: 'Authentic experience.',
    status: 'pending',
    source: 'external_api',
    external_id: 'order-8',
    verified_purchase: 1,
    is_incentivized: 0,
    incentive_disclosure: null,
    import_batch_id: null
  })
  assert.deepEqual(input, original)
  assert.deepEqual(
    [1, 4.7, 5].map(rating => normalizeReviewInput(reviewInput({ rating })).rating),
    [1, 4.7, 5]
  )
})

test('rejects invalid ratings, names, products, statuses, sources, and incentive disclosures without mutation', () => {
  for (const rating of [0, 5.1, 4.75, Number.NaN]) {
    const input = reviewInput({ rating })
    const original = structuredClone(input)
    assert.throws(() => normalizeReviewInput(input), /rating/i)
    assert.deepEqual(input, original)
  }
  assert.throws(() => normalizeReviewInput(reviewInput({ author_name: ' ' })), /author/i)
  assert.throws(() => normalizeReviewInput(reviewInput({ author_name: 'a'.repeat(101) })), /author/i)
  assert.throws(() => normalizeReviewInput(reviewInput({ review_text: ' ' })), /review.text/i)
  assert.throws(() => normalizeReviewInput(reviewInput({ product_id: 0 })), /product/i)
  assert.throws(() => normalizeReviewInput(reviewInput({ status: 'approved' })), /status/i)
  assert.throws(
    () => normalizeReviewInput(reviewInput(), { source: 'script', forcedStatus: null, requireProduct: true }),
    /source/i
  )
  assert.throws(
    () => normalizeReviewInput(reviewInput({ is_incentivized: 1, incentive_disclosure: ' ' })),
    /disclosure/i
  )
})

test('hashes the fixed English source field tuple with SHA-256', () => {
  const review = { review_title: null, review_text: 'Actual review', incentive_disclosure: null }
  const expected = createHash('sha256')
    .update(JSON.stringify(['', 'Actual review', '']))
    .digest('hex')
  assert.equal(reviewSourceHash(review), expected)
  assert.match(reviewSourceHash(review), /^[a-f0-9]{64}$/)
})

test('parses bulk text by date and rating positions while preserving body hyphens', () => {
  const parsed = parseBulkReviewText(`

Alice - 2026-1-2 - 4.7 - Works - even in rain
Bob - 2026/3/4 - 5 - Excellent
陈买家 - 2024年2月29日 - 4 - 确实安装使用
Broken line
Cara - 2026-02-30 - 5 - Impossible date
Dan - 2026-03-02 - 4.75 - Too precise
Alice - 2026-1-2 - 4.7 - Works - even in rain
  `)

  assert.equal(parsed.valid.length, 3)
  assert.equal(parsed.valid[0].line, 3)
  assert.equal(parsed.valid[0].review_text, 'Works - even in rain')
  assert.deepEqual(
    parsed.valid.map(({ author_name, review_date, rating }) => ({ author_name, review_date, rating })),
    [
      { author_name: 'Alice', review_date: '2026-01-02', rating: 4.7 },
      { author_name: 'Bob', review_date: '2026-03-04', rating: 5 },
      { author_name: '陈买家', review_date: '2024-02-29', rating: 4 }
    ]
  )
  assert.deepEqual(parsed.invalid.map(item => item.line), [6, 7, 8])
  assert.equal(parsed.duplicates.length, 1)
  assert.equal(parsed.duplicates[0].line, 9)
  assert.match(parsed.duplicates[0].error, /duplicate/i)
  assert.deepEqual(Object.keys(parsed.valid[0]), [
    'line', 'author_name', 'review_title', 'review_date', 'rating', 'review_text',
    'status', 'source', 'external_id', 'verified_purchase', 'is_incentivized',
    'incentive_disclosure', 'import_batch_id'
  ])
})

test('create validates product existence, honors forced status/source, and is idempotent by source external id', () => {
  const { db, store, invalidated } = createFixture()
  assert.throws(() => store.create(reviewInput({ product_id: 999 })), /product/i)

  const created = store.create(
    reviewInput({ external_id: ' ext-1 ', status: 'published', source: 'migration' }),
    { source: 'external_api', forcedStatus: 'pending' }
  )
  assert.equal(created.idempotent, false)
  assert.equal(created.status, 'pending')
  assert.equal(created.source, 'external_api')
  assert.equal(created.external_id, 'ext-1')
  assert.equal(created.published_at, null)
  assert.deepEqual(invalidated, [1])

  const existing = store.create(
    reviewInput({ author_name: 'Changed', external_id: 'ext-1' }),
    { source: 'external_api', forcedStatus: 'pending' }
  )
  assert.equal(existing.id, created.id)
  assert.equal(existing.idempotent, true)
  assert.equal(existing.author_name, 'Real Buyer')
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM product_reviews').get().count, 1)
  assert.deepEqual(invalidated, [1])
})

test('bulkCreate validates the entire batch before one transactional write and shares a batch id', () => {
  const { db, store, invalidated } = createFixture()
  const rows = [
    { ...reviewInput({ product_id: undefined, author_name: 'One', external_id: 'bulk-1' }), line: 4 },
    { ...reviewInput({ product_id: undefined, author_name: 'Two', external_id: 'bulk-2' }), line: 5 }
  ]
  const result = store.bulkCreate(1, rows)
  assert.equal(result.created.length, 2)
  assert.equal(result.existing.length, 0)
  assert.match(result.import_batch_id, /^[0-9a-f-]{36}$/i)
  assert.deepEqual(new Set(result.created.map(row => row.import_batch_id)), new Set([result.import_batch_id]))
  assert.deepEqual(invalidated, [1])

  const before = db.prepare('SELECT COUNT(*) AS count FROM product_reviews').get().count
  assert.throws(
    () => store.bulkCreate(1, [
      { ...reviewInput({ product_id: undefined, author_name: 'Valid' }), line: 8 },
      { ...reviewInput({ product_id: undefined, rating: 4.75 }), line: 9 }
    ]),
    /line 9.*rating/i
  )
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM product_reviews').get().count, before)

  const repeated = store.bulkCreate(1, [
    { ...reviewInput({ product_id: undefined, author_name: 'Ignored', external_id: 'bulk-1' }), line: 1 }
  ])
  assert.equal(repeated.created.length, 0)
  assert.equal(repeated.existing[0].id, result.created[0].id)
  assert.deepEqual(invalidated, [1])

  assert.throws(() => store.bulkCreate(1, []), /1.*200/)
  assert.throws(
    () => store.bulkCreate(1, Array.from({ length: 201 }, (_, index) => ({
      ...reviewInput({ product_id: undefined, author_name: `Buyer ${index}` }),
      line: index + 1
    }))),
    /1.*200/
  )

  const upperLimitFixture = createFixture()
  const upperLimit = upperLimitFixture.store.bulkCreate(1, Array.from({ length: 200 }, (_, index) => ({
    ...reviewInput({ product_id: undefined, author_name: `Upper Limit Buyer ${index}` }),
    line: index + 1
  })))
  assert.equal(upperLimit.created.length, 200)
  assert.equal(upperLimitFixture.db.prepare('SELECT COUNT(*) AS count FROM product_reviews').get().count, 200)
})

test('update preserves immutable fields and translations unless an English source field changes', () => {
  const { db, store, invalidated } = createFixture()
  const original = store.create(reviewInput({ external_id: 'stable-id' }), { source: 'admin' })
  const sourceHash = reviewSourceHash(original)
  db.prepare(`
    INSERT INTO product_review_translations
      (review_id, language_code, review_title, review_text, source_hash)
    VALUES (?, 'es', ?, ?, ?)
  `).run(original.id, 'Panel sólido', 'Uso real', sourceHash)
  db.prepare(`
    INSERT INTO translations (language_code, content_type, content_id, content_field, translated_text)
    VALUES ('es', 'product_review', ?, 'review_text', 'Uso real')
  `).run(original.id)

  const metadataOnly = store.update(original.id, {
    product_id: 3,
    source: 'migration',
    external_id: 'changed-id',
    verified_purchase: 1
  })
  assert.equal(metadataOnly.product_id, 1)
  assert.equal(metadataOnly.source, 'admin')
  assert.equal(metadataOnly.external_id, 'stable-id')
  assert.equal(metadataOnly.verified_purchase, 1)
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM product_review_translations').get().count, 1)
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM translations WHERE content_type='product_review'").get().count, 1)

  const changed = store.update(original.id, { review_text: 'Updated authentic review.' })
  assert.equal(changed.review_text, 'Updated authentic review.')
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM product_review_translations').get().count, 0)
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM translations WHERE content_type='product_review'").get().count, 0)
  assert.deepEqual(invalidated, [1, 1, 1])
  assert.equal(store.update(999, { review_text: 'Missing' }), null)
})

test('update applies publication timestamp transitions and refuses invalid ratings without modifying the row', () => {
  const { db, store } = createFixture()
  const created = store.create(reviewInput({ status: 'pending' }), { forcedStatus: 'pending' })
  const published = store.update(created.id, { status: 'published' })
  assert.ok(published.published_at)
  const firstPublishedAt = published.published_at
  const stillPublished = store.update(created.id, { author_name: 'Renamed' })
  assert.equal(stillPublished.published_at, firstPublishedAt)
  const hidden = store.update(created.id, { status: 'hidden' })
  assert.equal(hidden.published_at, null)

  const before = db.prepare('SELECT rating FROM product_reviews WHERE id = ?').get(created.id).rating
  assert.throws(() => store.update(created.id, { rating: 4.75 }), /rating/i)
  assert.equal(db.prepare('SELECT rating FROM product_reviews WHERE id = ?').get(created.id).rating, before)
})

test('bulkStatus atomically selects and updates only explicit unique ids before cache invalidation', () => {
  const { store, invalidated, operations } = createFixture()
  const first = store.create(reviewInput({ product_id: 1, status: 'pending' }), { forcedStatus: 'pending' })
  const second = store.create(reviewInput({ product_id: 3, author_name: 'Other', status: 'pending' }), { forcedStatus: 'pending' })
  const untouched = store.create(reviewInput({ product_id: 2, author_name: 'Untouched', status: 'pending' }), { forcedStatus: 'pending' })
  invalidated.length = 0
  operations.length = 0

  const result = store.bulkStatus([first.id, second.id, first.id, 999], 'published')
  assert.equal(result.updated, 2)
  assert.deepEqual(result.productIds, [1, 3])
  assertSelectionAndUpdateAreAtomic(operations, 'WHERE id IN')
  assert.equal(store.getById(first.id).status, 'published')
  assert.ok(store.getById(first.id).published_at)
  assert.equal(store.getById(second.id).status, 'published')
  assert.equal(store.getById(untouched.id).status, 'pending')
  assert.deepEqual(invalidated, [1, 3])
  assert.throws(() => store.bulkStatus([first.id, 0], 'hidden'), /positive integer/i)
  assert.throws(() => store.bulkStatus([first.id], 'approved'), /status/i)
})

test('publishAll atomically selects scoped pending rows and updates before cache invalidation', () => {
  const { store, invalidated, operations } = createFixture()
  const rootChild = store.create(reviewInput({ product_id: 1 }), { forcedStatus: 'pending' })
  const grandchild = store.create(reviewInput({ product_id: 2, author_name: 'Grandchild buyer' }), { forcedStatus: 'pending' })
  const other = store.create(reviewInput({ product_id: 3, author_name: 'Other buyer' }), { forcedStatus: 'pending' })
  invalidated.length = 0
  operations.length = 0

  assert.throws(() => store.publishAll({}), /productId.*categoryId|scope/i)
  const result = store.publishAll({ categoryId: 10 })
  assert.equal(result.updated, 2)
  assert.deepEqual(result.productIds, [1, 2])
  assertSelectionAndUpdateAreAtomic(operations, "r.status = ?")
  assert.equal(store.getById(rootChild.id).status, 'published')
  assert.equal(store.getById(grandchild.id).status, 'published')
  assert.equal(store.getById(other.id).status, 'pending')
  assert.deepEqual(invalidated, [1, 2])

  assert.equal(store.remove(999), false)
  assert.equal(store.remove(other.id), true)
  assert.equal(store.getById(other.id), null)
  assert.deepEqual(invalidated, [1, 2, 3])
})

test('listAdmin paginates and filters by fields, dates, and a recursive category subtree', () => {
  const { store } = createFixture()
  store.create(reviewInput({ product_id: 1, author_name: 'Alpha Buyer', review_date: '2026-03-01', external_id: 'order-alpha' }))
  store.create(reviewInput({ product_id: 2, author_name: 'Beta Buyer', review_date: '2026-03-02', status: 'hidden' }), { forcedStatus: 'hidden', source: 'admin_import' })
  store.create(reviewInput({ product_id: 3, author_name: 'Gamma Buyer', review_date: '2026-03-03', review_text: 'Search needle' }))

  const subtree = store.listAdmin({ categoryId: 10, page: 1, limit: 1 })
  assert.equal(subtree.total, 2)
  assert.equal(subtree.page, 1)
  assert.equal(subtree.limit, 1)
  assert.equal(subtree.data[0].author_name, 'Beta Buyer')
  assert.equal(subtree.data[0].product_name_en, 'Floodlight')
  assert.equal(subtree.data[0].category_name_en, 'Grandchild')

  const filtered = store.listAdmin({
    productId: 1,
    status: 'published',
    source: 'admin',
    q: 'alpha',
    dateFrom: '2026/3/1',
    dateTo: '2026年3月1日'
  })
  assert.equal(filtered.total, 1)
  assert.equal(filtered.data[0].external_id, 'order-alpha')
  assert.throws(() => store.listAdmin({ page: 0 }), /page/i)
  assert.throws(() => store.listAdmin({ limit: 101 }), /limit/i)
})

test('getById returns product context and translations', () => {
  const { db, store } = createFixture()
  const created = store.create(reviewInput())
  db.prepare(`
    INSERT INTO product_review_translations (review_id, language_code, review_text, source_hash)
    VALUES (?, 'es', 'Texto', ?)
  `).run(created.id, reviewSourceHash(created))
  const found = store.getById(created.id)
  assert.equal(found.product_name_en, 'Panel')
  assert.equal(found.category_id, 11)
  assert.equal(found.translations.length, 1)
  assert.equal(found.translations[0].language_code, 'es')
  assert.equal(store.getById(999), null)
})

test('listPublic exposes English or only current non-English valid translations with global summary', () => {
  const { db, store } = createFixture()
  const first = store.create(reviewInput({ author_name: 'One', rating: 5, review_text: 'English one' }))
  const second = store.create(reviewInput({ author_name: 'Two', rating: 4, review_text: 'English two' }))
  const third = store.create(reviewInput({ author_name: 'Three', rating: 3, review_text: 'English three' }))
  store.create(reviewInput({ author_name: 'Pending', rating: 1 }), { forcedStatus: 'pending' })

  db.prepare(`
    INSERT INTO product_review_translations
      (review_id, language_code, review_title, review_text, incentive_disclosure, source_hash)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(first.id, 'es', 'Uno', 'Español vigente', null, reviewSourceHash(first))
  db.prepare(`
    INSERT INTO product_review_translations
      (review_id, language_code, review_title, review_text, incentive_disclosure, source_hash)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(second.id, 'es', 'Dos', 'Español obsoleto', null, 'stale-hash')
  db.prepare(`
    INSERT INTO product_review_translations
      (review_id, language_code, review_title, review_text, incentive_disclosure, source_hash)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(third.id, 'fr', 'Trois', 'Français seulement', null, reviewSourceHash(third))

  const english = store.listPublic({ productId: 1, lang: 'en', page: 1, limit: 2 })
  assert.deepEqual(english.summary, { ratingValue: 4, reviewCount: 3 })
  assert.deepEqual(english.pagination, { page: 1, limit: 2, total: 3 })
  assert.equal(english.reviews.length, 2)
  assert.equal(english.reviews[0].review_text, 'English three')

  const spanish = store.listPublic({ productId: 1, lang: 'es' })
  assert.deepEqual(spanish.summary, { ratingValue: 4, reviewCount: 3 })
  assert.deepEqual(spanish.pagination, { page: 1, limit: 10, total: 1 })
  assert.equal(spanish.reviews.length, 1)
  assert.equal(spanish.reviews[0].review_text, 'Español vigente')
  assert.equal(spanish.reviews[0].review_title, 'Uno')
  assert.ok(!Object.values(spanish.reviews[0]).includes('English one'))

  const chinese = store.listPublic({ productId: 1, lang: 'zh' })
  assert.equal(chinese.reviews.length, 0)
  assert.equal(chinese.pagination.total, 0)
  assert.deepEqual(chinese.summary, { ratingValue: 4, reviewCount: 3 })

  assert.doesNotThrow(() => store.listPublic({ productId: 1, lang: 'en', limit: 101 }))
})

test('translationStatus reports current, stale, and missing active non-English languages', () => {
  const { db, store } = createFixture()
  const review = store.create(reviewInput())
  db.prepare(`
    INSERT INTO product_review_translations (review_id, language_code, review_text, source_hash)
    VALUES (?, 'es', 'Actual', ?), (?, 'fr', 'Ancien', NULL)
  `).run(review.id, reviewSourceHash(review), review.id)

  assert.deepEqual(store.translationStatus(review.id), [
    { language_code: 'es', translated: true, stale: false },
    { language_code: 'fr', translated: false, stale: true },
    { language_code: 'zh', translated: false, stale: false }
  ])
})
