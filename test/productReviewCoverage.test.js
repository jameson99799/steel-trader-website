import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import Database from 'better-sqlite3'

import { initializeProductReviewSchema } from '../server/services/productReviewSchema.js'
import { createProductReviewStore } from '../server/services/productReviews.js'

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
      name_en TEXT,
      status INTEGER DEFAULT 1
    );
    CREATE TABLE languages (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      status INTEGER DEFAULT 1
    );
    INSERT INTO categories (id, name, name_en, parent_id) VALUES
      (10, 'Coils', 'Coils', 0),
      (11, 'Galvanized', 'Galvanized', 10),
      (20, 'Roofing', 'Roofing', 0);
    INSERT INTO products (id, category_id, name, name_en, status) VALUES
      (1, 11, 'GI Coil', 'GI Coil', 1),
      (2, 10, 'CRC Coil', 'CRC Coil', 1),
      (3, 20, 'Roof Sheet', 'Roof Sheet', 1),
      (4, 10, 'Hidden Product', 'Hidden Product', 0);
    INSERT INTO languages (id, name, code, status) VALUES
      (1, 'English', 'en', 1),
      (2, 'Chinese', 'zh', 1),
      (3, 'Hindi', 'hi', 1);
  `)
  initializeProductReviewSchema(db)
  const insertReview = db.prepare(`
    INSERT INTO product_reviews (
      product_id, author_name, review_date, rating, review_text, status, source
    ) VALUES (?, ?, '2026-01-02', 4.8, ?, ?, 'admin')
  `)
  const reviewIds = [
    insertReview.run(1, 'Buyer A', 'Published A', 'published').lastInsertRowid,
    insertReview.run(1, 'Buyer B', 'Published B', 'published').lastInsertRowid,
    insertReview.run(1, 'Buyer C', 'Pending C', 'pending').lastInsertRowid,
    insertReview.run(1, 'Buyer D', 'Hidden D', 'hidden').lastInsertRowid
  ]
  const insertTranslation = db.prepare(`
    INSERT INTO product_review_translations (
      review_id, language_code, review_text, source_hash
    ) VALUES (?, ?, ?, ?)
  `)
  insertTranslation.run(reviewIds[0], 'zh', '中文 A', 'hash-a')
  insertTranslation.run(reviewIds[0], 'hi', 'हिंदी A', 'hash-a')
  insertTranslation.run(reviewIds[1], 'zh', '中文 B', 'hash-b')

  const store = createProductReviewStore({
    getAll: (sql, params = []) => db.prepare(sql).all(...params),
    getOne: (sql, params = []) => db.prepare(sql).get(...params) || null,
    run: (sql, params = []) => db.prepare(sql).run(...params),
    transaction: fn => db.transaction(fn)()
  })
  return { db, store }
}

test('coverage includes zero-review products and counts statuses without translation multiplication', () => {
  const { db, store } = createFixture()

  const result = store.listCoverage({ categoryId: 10, page: 1, limit: 20 })

  assert.equal(result.total, 2)
  assert.equal(result.targetMinimum, 8)
  assert.deepEqual(result.data.map(row => row.product_id), [2, 1])
  assert.deepEqual(result.data.find(row => row.product_id === 1), {
    product_id: 1,
    product_name_en: 'GI Coil',
    category_id: 11,
    category_name_en: 'Galvanized',
    published_count: 2,
    pending_count: 1,
    hidden_count: 1,
    translation_count: 3,
    needs_attention: true
  })
  assert.deepEqual(result.data.find(row => row.product_id === 2), {
    product_id: 2,
    product_name_en: 'CRC Coil',
    category_id: 10,
    category_name_en: 'Coils',
    published_count: 0,
    pending_count: 0,
    hidden_count: 0,
    translation_count: 0,
    needs_attention: true
  })
  db.close()
})

test('coverage validates pagination and category input before querying', () => {
  const { db, store } = createFixture()
  for (const filters of [
    { page: 0 },
    { limit: 101 },
    { categoryId: 'not-a-number' }
  ]) {
    assert.throws(() => store.listCoverage(filters), /must be/)
  }
  db.close()
})

test('coverage route is authenticated and registered before the admin id route', () => {
  const source = readFileSync('server/routes/product-reviews.js', 'utf8')
  const coverageIndex = source.indexOf("router.get('/admin-coverage', authMiddleware, handlers.listCoverage)")
  const idIndex = source.indexOf("router.get('/admin/:id', authMiddleware, handlers.getAdmin)")
  assert.ok(coverageIndex >= 0)
  assert.ok(idIndex > coverageIndex)
})
