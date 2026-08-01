import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

import {
  createExternalProductReviewHandlers,
  createLegacySeoReviewHandler,
  createProductReviewHandlers
} from '../server/routes/product-reviews.js'
import {
  createProductReviewStore,
  normalizeReviewInput,
  reviewSourceHash
} from '../server/services/productReviews.js'

function response() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this }
  }
}

function invoke(handler, { body = {}, params = {}, query = {} } = {}) {
  const res = response()
  handler({ body, params, query }, res)
  return res
}

function createStoreFixture({ rows = [], languages = [] } = {}) {
  const calls = []
  const getAll = (sql, params = []) => {
    calls.push(['getAll', sql, params])
    if (/FROM product_reviews AS r[\s\S]*ORDER BY r\.review_date/.test(sql)) return rows
    if (/FROM languages/.test(sql)) return languages
    if (/FROM product_review_translations/.test(sql)) return []
    if (/SELECT r\.id, r\.product_id/.test(sql)) return [{ id: 9, product_id: 4 }]
    return []
  }
  const getOne = (sql, params = []) => {
    calls.push(['getOne', sql, params])
    if (/COUNT\(\*\)/.test(sql)) return { total: rows.length }
    return null
  }
  const run = (sql, params = []) => (calls.push(['run', sql, params]), { changes: 1, lastInsertRowid: 1 })
  const transaction = callback => callback()
  return { calls, store: createProductReviewStore({ getAll, getOne, run, transaction }) }
}

test('external delete enforces missing, non-external, and external ownership branches', () => {
  for (const fixture of [
    { existing: null, status: 404, removeCalls: 0 },
    { existing: { id: 3, source: 'admin' }, status: 403, removeCalls: 0 },
    { existing: { id: 3, source: 'external_api' }, status: 200, removeCalls: 1 }
  ]) {
    let removeCalls = 0
    const handlers = createExternalProductReviewHandlers({
      store: {
        getById: () => fixture.existing,
        remove: () => { removeCalls += 1; return true }
      }
    })
    const result = invoke(handlers.remove, { params: { id: '3' } })
    assert.equal(result.statusCode, fixture.status)
    assert.equal(removeCalls, fixture.removeCalls)
  }
})

test('publishAll preserves source, q, and date filters while forcing pending status', () => {
  const { store, calls } = createStoreFixture()
  store.publishAll({
    productId: 4,
    status: 'hidden',
    source: 'external_api',
    q: 'buyer',
    dateFrom: '2026-01-02',
    dateTo: '2026-02-03'
  })
  const select = calls.find(call => call[0] === 'getAll' && /SELECT r\.id, r\.product_id/.test(call[1]))
  assert.match(select[1], /r\.status = \?/)
  assert.match(select[1], /r\.source = \?/)
  assert.match(select[1], /r\.review_date >= \?/)
  assert.match(select[1], /r\.review_date <= \?/)
  assert.deepEqual(select[2], [4, 'pending', 'external_api', '%buyer%', '%buyer%', '%buyer%', '%buyer%', '2026-01-02', '2026-02-03'])
})

test('all writes require a real review date and legacy product endpoint never guesses it', () => {
  assert.throws(() => normalizeReviewInput({ product_id: 1, author_name: 'A', rating: 5, review_text: 'Real' }), /review_date/i)
  assert.throws(() => normalizeReviewInput({ product_id: 1, author_name: 'A', review_date: '', rating: 5, review_text: 'Real' }), /review_date/i)

  const calls = []
  const handler = createLegacySeoReviewHandler({ store: { create: input => (calls.push(input), input) } })
  const missing = invoke(handler, { body: { target_type: 'product', target_id: 1, author_name: 'A', rating: 5, review_text: 'Real' } })
  assert.equal(missing.statusCode, 400)
  assert.deepEqual(calls, [])
  const dated = invoke(handler, { body: { target_type: 'product', target_id: 1, author_name: 'A', review_date: '2026/07/02', rating: 5, review_text: 'Real' } })
  assert.equal(dated.statusCode, 201)
  assert.equal(calls[0].review_date, '2026/07/02')

  const schema = fs.readFileSync(new URL('../server/services/productReviewSchema.js', import.meta.url), 'utf8')
  assert.match(schema, /review_date DATE NOT NULL/)
  assert.match(schema, /source_hash TEXT NOT NULL/)
  assert.match(schema, /legacy\.created_at IS NOT NULL/)
  assert.match(schema, /DATE\(legacy\.created_at\) IS NOT NULL/)
})

test('admin bulk accepts only published or pending and forwards the selected forced status', () => {
  const calls = []
  const handlers = createProductReviewHandlers({
    store: { bulkCreate: (...args) => (calls.push(args), { created: 1 }) }
  })
  const row = { author_name: 'A', review_date: '2026-01-01', rating: 5, review_text: 'Real' }
  assert.equal(invoke(handlers.bulkCreateAdmin, { body: { productId: 1, rows: [row] } }).statusCode, 201)
  assert.equal(calls.pop()[2].forcedStatus, 'published')
  assert.equal(invoke(handlers.bulkCreateAdmin, { body: { productId: 1, rows: [row], status: 'pending' } }).statusCode, 201)
  assert.equal(calls.pop()[2].forcedStatus, 'pending')
  for (const status of ['hidden', 'anything']) {
    assert.equal(invoke(handlers.bulkCreateAdmin, { body: { productId: 1, rows: [row], status } }).statusCode, 400)
  }
  const ui = fs.readFileSync(new URL('../src/views/admin/Reviews.vue', import.meta.url), 'utf8')
  assert.match(ui, /importStatus/)
  assert.match(ui, /status:\s*importStatus\.value/)
  assert.match(ui, /importStatus\.value\s*=\s*['"]published['"]/)
})

test('externalId filtering uses an exact parameterized condition', () => {
  const { store, calls } = createStoreFixture()
  store.listAdmin({ externalId: ' order-42 ' })
  const count = calls.find(call => call[0] === 'getOne' && /COUNT\(\*\)/.test(call[1]))
  assert.match(count[1], /r\.external_id = \?/)
  assert.deepEqual(count[2], ['order-42'])
})

test('listAdmin batch-computes current stale and missing translation status without N+1 queries', () => {
  const reviews = [
    { id: 1, review_title: 'One', review_text: 'Body one', incentive_disclosure: null },
    { id: 2, review_title: 'Two', review_text: 'Body two', incentive_disclosure: null }
  ]
  const translations = [
    { review_id: 1, language_code: 'zh', source_hash: reviewSourceHash(reviews[0]) },
    { review_id: 1, language_code: 'es', source_hash: 'stale' },
    { review_id: 2, language_code: 'zh', source_hash: reviewSourceHash(reviews[1]) }
  ]
  const calls = []
  const getAll = (sql, params = []) => {
    calls.push([sql, params])
    if (/FROM product_reviews AS r[\s\S]*ORDER BY r\.review_date/.test(sql)) return reviews
    if (/FROM languages/.test(sql)) return [{ code: 'zh' }, { code: 'es' }]
    if (/FROM product_review_translations/.test(sql)) return translations
    return []
  }
  const store = createProductReviewStore({
    getAll,
    getOne: sql => (/COUNT\(\*\)/.test(sql) ? { total: 2 } : null),
    run: () => ({ changes: 0 }),
    transaction: callback => callback()
  })
  const result = store.listAdmin({ page: 1, limit: 20 })
  assert.deepEqual(result.data.map(row => row.translation_status), [
    { total: 2, current: 1, stale: 1, missing: 0 },
    { total: 2, current: 1, stale: 0, missing: 1 }
  ])
  assert.equal(calls.filter(([sql]) => /FROM languages/.test(sql)).length, 1)
  assert.equal(calls.filter(([sql]) => /FROM product_review_translations/.test(sql)).length, 1)
  const ui = fs.readFileSync(new URL('../src/views/admin/Reviews.vue', import.meta.url), 'utf8')
  assert.match(ui, /未启用目标语言/)
  assert.match(ui, /已翻译/)
  assert.match(ui, /需重翻/)
  assert.match(ui, /未翻译/)
})
