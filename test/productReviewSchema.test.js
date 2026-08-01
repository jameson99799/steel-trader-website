import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import Database from 'better-sqlite3'
import { initializeProductReviewSchema } from '../server/services/productReviewSchema.js'

const productReviewColumns = [
  'id', 'product_id', 'author_name', 'review_title', 'review_date', 'rating',
  'review_text', 'status', 'source', 'external_id', 'verified_purchase',
  'is_incentivized', 'incentive_disclosure', 'import_batch_id', 'created_at',
  'updated_at', 'published_at'
]

const translationColumns = [
  'id', 'review_id', 'language_code', 'review_title', 'review_text',
  'incentive_disclosure', 'source_hash', 'created_at', 'updated_at'
]

function createDb({ legacy = false } = {}) {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  db.exec('CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL)')

  if (legacy) {
    db.exec(`
      CREATE TABLE seo_reviews (
        id INTEGER PRIMARY KEY,
        target_type TEXT NOT NULL,
        target_id INTEGER NOT NULL,
        author_name TEXT NOT NULL,
        rating REAL,
        review_text TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  return db
}

function insertReview(db, values = {}) {
  const review = {
    product_id: 1,
    author_name: 'Valid customer',
    review_date: '2026-01-02',
    rating: 4.5,
    review_text: 'A real customer review.',
    status: null,
    source: null,
    external_id: null,
    ...values
  }
  return db.prepare(`
    INSERT INTO product_reviews (product_id, author_name, review_date, rating, review_text, status, source, external_id)
    VALUES (@product_id, @author_name, @review_date, @rating, @review_text, COALESCE(@status, 'pending'), COALESCE(@source, 'admin'), @external_id)
  `).run(review)
}

test('creates normalized review tables with the required column order and indexes', () => {
  const db = createDb()
  initializeProductReviewSchema(db)

  assert.deepEqual(
    db.prepare('PRAGMA table_info(product_reviews)').all().map(column => column.name),
    productReviewColumns
  )
  assert.deepEqual(
    db.prepare('PRAGMA table_info(product_review_translations)').all().map(column => column.name),
    translationColumns
  )
  const reviewInfo = db.prepare('PRAGMA table_info(product_reviews)').all()
  const translationInfo = db.prepare('PRAGMA table_info(product_review_translations)').all()
  assert.equal(reviewInfo.find(column => column.name === 'review_date').notnull, 1)
  assert.equal(translationInfo.find(column => column.name === 'source_hash').notnull, 1)

  const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type = 'index'").all().map(row => row.name)
  assert.ok(indexes.includes('idx_product_reviews_product_status_date'))
  assert.ok(indexes.includes('idx_product_reviews_status'))
  assert.ok(indexes.includes('idx_product_reviews_import_batch'))
  assert.ok(indexes.includes('idx_product_reviews_source_external_id'))
})

test('enforces review status, rating, author, source, and source external-id constraints', () => {
  const db = createDb()
  db.prepare('INSERT INTO products (id, name) VALUES (1, ?)').run('Product')
  initializeProductReviewSchema(db)

  assert.throws(() => insertReview(db, { status: 'rejected' }), /CHECK constraint failed/)
  assert.throws(() => insertReview(db, { rating: 0.9 }), /CHECK constraint failed/)
  assert.throws(() => insertReview(db, { rating: 5.1 }), /CHECK constraint failed/)
  assert.throws(() => insertReview(db, { author_name: '   ' }), /CHECK constraint failed/)
  assert.throws(() => insertReview(db, { author_name: 'a'.repeat(101) }), /CHECK constraint failed/)
  assert.throws(() => insertReview(db, { source: 'script' }), /CHECK constraint failed/)

  insertReview(db, { source: 'migration', external_id: 'seo_reviews:1' })
  assert.throws(
    () => insertReview(db, { source: 'migration', external_id: 'seo_reviews:1' }),
    /UNIQUE constraint failed/
  )

  insertReview(db, { source: 'external_api', external_id: '' })
  assert.throws(
    () => insertReview(db, { source: 'external_api', external_id: '' }),
    /UNIQUE constraint failed/
  )
})

test('enforces translation language, uniqueness, and cascading foreign keys', () => {
  const db = createDb()
  db.prepare('INSERT INTO products (id, name) VALUES (1, ?)').run('Product')
  initializeProductReviewSchema(db)
  const reviewId = insertReview(db).lastInsertRowid

  const insertTranslation = db.prepare(`
    INSERT INTO product_review_translations (review_id, language_code, review_text, source_hash)
    VALUES (?, ?, ?, 'hash')
  `)
  assert.throws(() => insertTranslation.run(reviewId, 'en', 'English'), /CHECK constraint failed/)
  insertTranslation.run(reviewId, 'es', 'Spanish')
  assert.throws(() => insertTranslation.run(reviewId, 'es', 'Duplicate'), /UNIQUE constraint failed/)

  db.prepare('DELETE FROM products WHERE id = 1').run()
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM product_reviews').get().count, 0)
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM product_review_translations').get().count, 0)
})

test('migrates only valid legacy product reviews to pending migration records idempotently', () => {
  const db = createDb({ legacy: true })
  db.prepare('INSERT INTO products (id, name) VALUES (1, ?)').run('Product')
  const insertLegacy = db.prepare(`
    INSERT INTO seo_reviews (id, target_type, target_id, author_name, rating, review_text, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  insertLegacy.run(1, 'product', 1, ' Real buyer ', 4.5, '  Solid material. ', '2026-01-02 03:04:05')
  insertLegacy.run(2, 'article', 1, 'Article buyer', 4.5, 'Article review', '2026-01-02 03:04:05')
  insertLegacy.run(3, 'product', 999, 'Missing product', 4.5, 'Missing product review', '2026-01-02 03:04:05')
  insertLegacy.run(4, 'product', 1, 'Invalid rating', 5.5, 'Invalid rating review', '2026-01-02 03:04:05')
  insertLegacy.run(5, 'product', 1, 'Precise rating', 4.55, 'Precise rating review', '2026-01-02 03:04:05')
  insertLegacy.run(6, 'product', 1, '   ', 4.5, 'Blank author review', '2026-01-02 03:04:05')
  insertLegacy.run(7, 'product', 1, 'Blank text', 4.5, '   ', '2026-01-02 03:04:05')
  insertLegacy.run(8, 'product', 1, 'Missing date', 4.5, 'Must be skipped', null)
  insertLegacy.run(9, 'product', 1, 'Invalid date', 4.5, 'Must be skipped', 'not-a-date')

  initializeProductReviewSchema(db)
  initializeProductReviewSchema(db)

  assert.deepEqual(db.prepare(`
    SELECT product_id, author_name, review_date, rating, review_text, status, source, external_id
    FROM product_reviews
  `).all(), [{
    product_id: 1,
    author_name: 'Real buyer',
    review_date: '2026-01-02',
    rating: 4.5,
    review_text: 'Solid material.',
    status: 'pending',
    source: 'migration',
    external_id: 'seo_reviews:1'
  }])
})

test('db module initializes the schema after products and exports the transaction wrapper', () => {
  const source = fs.readFileSync(new URL('../server/db.js', import.meta.url), 'utf8')
  const productsIndex = source.indexOf('CREATE TABLE IF NOT EXISTS products')
  const initializerIndex = source.indexOf('initializeProductReviewSchema(db)')

  assert.ok(productsIndex >= 0)
  assert.ok(initializerIndex > productsIndex)
  assert.match(source, /function transaction\(fn\)\s*\{\s*return db\.transaction\(fn\)\(\)\s*\}/)
  assert.match(source, /export \{[^}]*transaction[^}]*\}/)
})
