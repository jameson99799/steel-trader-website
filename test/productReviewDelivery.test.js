import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as reviewDomain from '../server/services/productReviews.js'
import { syncProductReviewTranslation } from '../server/services/productReviewTranslation.js'
import * as delivery from '../scripts/verifySeoDelivery.mjs'

const PRODUCT_ID = 7
const PRODUCT_SLUG = 'gl-steel-coil'

function reviewPayload(overrides = {}) {
  return {
    reviews: [{
      id: 101,
      product_id: PRODUCT_ID,
      author_name: 'A & B Buyer',
      review_date: '2026-07-20',
      rating: 4.7,
      review_text: 'Strong <coating> & careful packing.',
      status: 'published',
      source: 'admin',
      external_id: null,
      import_batch_id: null,
      published_at: '2026-07-21 08:00:00',
      created_at: '2026-07-20 08:00:00',
      updated_at: '2026-07-21 08:00:00',
      ...overrides
    }],
    summary: { reviewCount: 12, ratingValue: 4.6 },
    pagination: { page: 1, limit: 10, total: 1 }
  }
}

function productSchema(overrides = {}) {
  const payload = reviewPayload()
  return {
    '@type': 'Product',
    review: [{
      author: { '@type': 'Person', name: payload.reviews[0].author_name },
      datePublished: payload.reviews[0].review_date,
      reviewRating: { ratingValue: payload.reviews[0].rating, bestRating: 5, worstRating: 1 },
      reviewBody: payload.reviews[0].review_text
    }],
    aggregateRating: { reviewCount: 12, ratingValue: 4.6 },
    ...overrides
  }
}

function productHtml(schema = productSchema()) {
  return `<html><head><link rel="canonical" href="https://www.sunseasteel.com/en/products/${PRODUCT_SLUG}"><script id="product-jsonld" type="application/ld+json">${JSON.stringify(schema)}</script><script type="module" src="/assets/index-current.js"></script></head><body><main><h1>Product</h1><article>A &amp; B Buyer 2026-07-20 4.7 Strong &lt;coating&gt; &amp; careful packing.</article></main></body></html>`
}

test('cache invalidator deletes only the exact product across path and absolute URL variants', () => {
  assert.equal(typeof reviewDomain.createProductReviewSeoCacheInvalidator, 'function')
  const rows = [
    '/en/products/gl-steel-coil',
    '/zh/products/gl-steel-coil/',
    'https://www.sunseasteel.com/hi/products/gl-steel-coil?seo=1',
    '/en/products/gl-steel-coil-longer',
    '/en/products/gl-steel-coil/child',
    '/en/news/gl-steel-coil'
  ]
  const deleted = []
  const invalidate = reviewDomain.createProductReviewSeoCacheInvalidator({
    getOne: (sql, params) => {
      assert.match(sql, /SELECT\s+slug\s+FROM\s+products/i)
      assert.deepEqual(params, [PRODUCT_ID])
      return { slug: PRODUCT_SLUG }
    },
    getAll: () => rows.map(url => ({ url })),
    run: (sql, params) => {
      assert.match(sql, /DELETE FROM seo_render_cache WHERE url = \?/)
      assert.equal(params.length, 1)
      deleted.push(params[0])
      return { changes: 1 }
    }
  })

  const result = invalidate(PRODUCT_ID)
  assert.equal(result.deleted, 3)
  assert.deepEqual(deleted, rows.slice(0, 3))
})

test('cache invalidator targets one language and safely ignores a missing product', () => {
  assert.equal(typeof reviewDomain.createProductReviewSeoCacheInvalidator, 'function')
  const rows = [
    '/en/products/gl-steel-coil',
    '/fr/products/gl-steel-coil/',
    'https://example.com/fr/products/gl-steel-coil?x=1',
    '/fr/products/gl-steel-coil-longer'
  ]
  const deleted = []
  const invalidate = reviewDomain.createProductReviewSeoCacheInvalidator({
    getOne: (_sql, [id]) => id === PRODUCT_ID ? { slug: PRODUCT_SLUG } : null,
    getAll: () => rows.map(url => ({ url })),
    run: (_sql, [url]) => { deleted.push(url); return { changes: 1 } }
  })

  assert.equal(invalidate(PRODUCT_ID, 'fr').deleted, 2)
  assert.deepEqual(deleted, rows.slice(1, 3))
  assert.deepEqual(invalidate(999, 'fr'), { deleted: 0, reason: 'product-not-found' })
})

test('review writes survive synchronous and asynchronous cache invalidation failures', async () => {
  const warnings = []
  let inserted = false
  const base = {
    getAll: () => [],
    getOne(sql) {
      if (/FROM products WHERE id/.test(sql)) return { id: PRODUCT_ID }
      if (/source = \? AND external_id/.test(sql)) return null
      if (/SELECT \* FROM product_reviews WHERE id/.test(sql) && inserted) {
        return { id: 1, product_id: PRODUCT_ID, author_name: 'Buyer', review_title: null, review_date: '2026-07-20', rating: 4.7, review_text: 'Real use.', status: 'pending', source: 'external_api', external_id: null, verified_purchase: 0, is_incentivized: 0, incentive_disclosure: null, import_batch_id: null }
      }
      return null
    },
    run(sql) { if (/INSERT INTO product_reviews/.test(sql)) inserted = true; return { lastInsertRowid: 1, changes: 1 } },
    transaction: callback => callback(),
    logger: { warn: message => warnings.push(String(message)) }
  }
  const input = { product_id: PRODUCT_ID, author_name: 'Buyer', review_date: '2026-07-20', rating: 4.7, review_text: 'Real use.' }

  const syncStore = reviewDomain.createProductReviewStore({ ...base, invalidateCache: () => { throw new Error('sync cache failed') } })
  assert.doesNotThrow(() => syncStore.create(input, { source: 'external_api', forcedStatus: 'pending' }))

  inserted = false
  const asyncStore = reviewDomain.createProductReviewStore({ ...base, invalidateCache: () => Promise.reject(new Error('async cache failed')) })
  assert.doesNotThrow(() => asyncStore.create(input, { source: 'external_api', forcedStatus: 'pending' }))
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(warnings.length, 2)
  assert.match(warnings.join('\n'), /cache.*failed/i)
})

test('translation upsert and stale deletion invalidate only the target language', () => {
  const invalidated = []
  const review = { id: 9, product_id: PRODUCT_ID, status: 'published', review_title: null, review_text: 'English body', incentive_disclosure: null }
  const translations = [{ content_field: 'review_text', original_text: 'English body', translated_text: 'Corps français' }]
  const run = sql => ({ changes: /DELETE FROM product_review_translations/.test(sql) ? 1 : 1 })
  const synced = syncProductReviewTranslation({
    reviewId: 9,
    lang: 'fr',
    getOne: () => review,
    getAll: () => translations,
    run,
    invalidateCache: (productId, lang) => invalidated.push([productId, lang])
  })
  assert.equal(synced.synced, true)
  assert.deepEqual(invalidated, [[PRODUCT_ID, 'fr']])

  invalidated.length = 0
  const removed = syncProductReviewTranslation({
    reviewId: 9,
    lang: 'fr',
    getOne: () => review,
    getAll: () => [],
    run,
    invalidateCache: (productId, lang) => invalidated.push([productId, lang])
  })
  assert.equal(removed.synced, false)
  assert.deepEqual(invalidated, [[PRODUCT_ID, 'fr']])

  invalidated.length = 0
  syncProductReviewTranslation({ reviewId: 9, lang: 'en', getOne: () => review, getAll: () => translations, run, invalidateCache: (...args) => invalidated.push(args) })
  assert.deepEqual(invalidated, [])
})

test('review parity accepts matching visible SSR, Product JSON-LD, and API data', () => {
  assert.equal(typeof delivery.verifyProductReviewParity, 'function')
  assert.doesNotThrow(() => delivery.verifyProductReviewParity({
    html: productHtml(),
    productSchema: productSchema(),
    payload: reviewPayload()
  }))
})

test('review parity accepts an empty payload but rejects legacy fixed review content', () => {
  assert.doesNotThrow(() => delivery.verifyProductReviewParity({ html: '<main>No reviews</main>', productSchema: { '@type': 'Product' }, payload: { reviews: [], summary: { reviewCount: 0, ratingValue: 0 } } }))
  for (const legacy of ['Verified Buyer', 'Excellent quality and service.', '"reviewCount":89']) {
    assert.throws(() => delivery.verifyProductReviewParity({ html: legacy, productSchema: { '@type': 'Product' }, payload: { reviews: [], summary: { reviewCount: 0, ratingValue: 0 } } }), /legacy|fixed/i)
  }
})

test('review parity reports missing SSR fields, schema field drift, and aggregate drift', () => {
  const payload = reviewPayload()
  assert.throws(() => delivery.verifyProductReviewParity({ html: productHtml().replace('Strong &lt;coating&gt; &amp; careful packing.', ''), productSchema: productSchema(), payload }), /text|body/i)
  assert.throws(() => delivery.verifyProductReviewParity({ html: productHtml(), productSchema: productSchema({ review: [{ ...productSchema().review[0], author: { name: 'Wrong' } }] }), payload }), /author/i)
  assert.throws(() => delivery.verifyProductReviewParity({ html: productHtml(), productSchema: productSchema({ review: [{ ...productSchema().review[0], datePublished: '2020-01-01' }] }), payload }), /date/i)
  assert.throws(() => delivery.verifyProductReviewParity({ html: productHtml(), productSchema: productSchema({ review: [{ ...productSchema().review[0], reviewRating: { ratingValue: 5 } }] }), payload }), /rating/i)
  assert.throws(() => delivery.verifyProductReviewParity({ html: productHtml(), productSchema: productSchema({ review: [{ ...productSchema().review[0], reviewBody: 'Wrong' }] }), payload }), /body/i)
  assert.throws(() => delivery.verifyProductReviewParity({ html: productHtml(), productSchema: productSchema({ aggregateRating: { reviewCount: 11, ratingValue: 4.6 } }), payload }), /count/i)
  assert.throws(() => delivery.verifyProductReviewParity({ html: productHtml(), productSchema: productSchema({ aggregateRating: { reviewCount: 12, ratingValue: 4.5 } }), payload }), /average|ratingValue/i)
})

test('delivery verifier requests the review API and validates both local and public product HTML', async () => {
  const requested = []
  const fetchImpl = async input => {
    const url = new URL(String(input))
    requested.push(`${url.origin}${url.pathname}`)
    if (url.pathname === '/sitemap-products.xml') return new Response('<?xml version="1.0"?><urlset></urlset>', { headers: { 'content-type': 'application/xml' } })
    if (url.pathname === '/assets/index-current.js') return new Response('ok')
    if (url.pathname === `/api/product-reviews/product/${PRODUCT_ID}`) return new Response(JSON.stringify(reviewPayload()), { headers: { 'content-type': 'application/json' } })
    if (url.pathname === `/en/products/${PRODUCT_SLUG}`) return new Response(productHtml(), { headers: { 'content-type': 'text/html' } })
    const about = `<html><head><link rel="canonical" href="https://www.sunseasteel.com/en/about"><script type="application/ld+json">{}</script><script type="module" src="/assets/index-current.js"></script></head><body><main>About</main></body></html>`
    return new Response(about, { headers: { 'content-type': 'text/html' } })
  }

  await delivery.verifySeoDelivery({
    fetchImpl,
    localBaseUrl: 'http://local',
    publicBaseUrl: 'https://public',
    productPath: `/en/products/${PRODUCT_SLUG}`,
    productId: PRODUCT_ID
  })
  assert.ok(requested.includes(`http://local/api/product-reviews/product/${PRODUCT_ID}`))
  assert.ok(requested.includes(`https://public/api/product-reviews/product/${PRODUCT_ID}`))
  assert.ok(requested.includes(`http://local/en/products/${PRODUCT_SLUG}`))
  assert.ok(requested.includes(`https://public/en/products/${PRODUCT_SLUG}`))
})

test('delivery verifier fails when the public product review API is unavailable', async () => {
  const fetchImpl = async input => {
    const url = new URL(String(input))
    if (url.pathname === '/sitemap-products.xml') return new Response('<?xml version="1.0"?><urlset></urlset>', { headers: { 'content-type': 'application/xml' } })
    if (url.pathname === '/assets/index-current.js') return new Response('ok')
    if (url.pathname === `/api/product-reviews/product/${PRODUCT_ID}`) {
      if (url.origin === 'https://public') return new Response('Not Found', { status: 404 })
      return new Response(JSON.stringify(reviewPayload()), { headers: { 'content-type': 'application/json' } })
    }
    if (url.pathname === `/en/products/${PRODUCT_SLUG}`) return new Response(productHtml(), { headers: { 'content-type': 'text/html' } })
    const about = `<html><head><link rel="canonical" href="https://www.sunseasteel.com/en/about"><script type="application/ld+json">{}</script><script type="module" src="/assets/index-current.js"></script></head><body><main>About</main></body></html>`
    return new Response(about, { headers: { 'content-type': 'text/html' } })
  }

  await assert.rejects(delivery.verifySeoDelivery({
    fetchImpl,
    localBaseUrl: 'http://local',
    publicBaseUrl: 'https://public',
    productPath: `/en/products/${PRODUCT_SLUG}`,
    productId: PRODUCT_ID
  }), /public product reviews.*HTTP 404/i)
})

test('delivery verifier rejects local and public review payload drift even when both HTML pages match local data', async () => {
  const publicPayload = reviewPayload({ review_text: 'Different public API body.' })
  publicPayload.summary = { reviewCount: 13, ratingValue: 4.5 }
  const fetchImpl = async input => {
    const url = new URL(String(input))
    if (url.pathname === '/sitemap-products.xml') return new Response('<?xml version="1.0"?><urlset></urlset>', { headers: { 'content-type': 'application/xml' } })
    if (url.pathname === '/assets/index-current.js') return new Response('ok')
    if (url.pathname === `/api/product-reviews/product/${PRODUCT_ID}`) {
      const payload = url.origin === 'https://public' ? publicPayload : reviewPayload()
      return new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } })
    }
    if (url.pathname === `/en/products/${PRODUCT_SLUG}`) return new Response(productHtml(), { headers: { 'content-type': 'text/html' } })
    const about = `<html><head><link rel="canonical" href="https://www.sunseasteel.com/en/about"><script type="application/ld+json">{}</script><script type="module" src="/assets/index-current.js"></script></head><body><main>About</main></body></html>`
    return new Response(about, { headers: { 'content-type': 'text/html' } })
  }

  await assert.rejects(delivery.verifySeoDelivery({
    fetchImpl,
    localBaseUrl: 'http://local',
    publicBaseUrl: 'https://public',
    productPath: `/en/products/${PRODUCT_SLUG}`,
    productId: PRODUCT_ID
  }), /local.*public.*review payload|review payload.*differ/i)
})

for (const [label, mutate] of [
  ['id', payload => { payload.reviews[0].id = 999 }],
  ['product_id', payload => { payload.reviews[0].product_id = 999 }],
  ['status', payload => { payload.reviews[0].status = 'hidden' }],
  ['pagination.total', payload => { payload.pagination.total = 2 }]
]) {
  test(`payload parity rejects ${label} drift`, () => {
    const localPayload = reviewPayload()
    const publicPayload = structuredClone(localPayload)
    mutate(publicPayload)
    assert.throws(
      () => delivery.verifyProductReviewPayloadParity(localPayload, publicPayload),
      /local.*public.*review payload.*differ/i
    )
  })
}

test('payload parity is review-array order sensitive without sorting or deleting fields', () => {
  const first = reviewPayload().reviews[0]
  const second = { ...first, id: 102 }
  const localPayload = {
    ...reviewPayload(),
    reviews: [first, second],
    pagination: { page: 1, limit: 10, total: 2 }
  }
  const publicPayload = { ...structuredClone(localPayload), reviews: [second, first] }
  assert.throws(
    () => delivery.verifyProductReviewPayloadParity(localPayload, publicPayload),
    /local.*public.*review payload.*differ/i
  )
})

test('CLI product discovery preserves readiness retries while returning both id and slug', async () => {
  assert.equal(typeof delivery.discoverItem, 'function')
  let attempts = 0
  const item = await delivery.discoverItem(
    async () => {
      attempts += 1
      if (attempts < 2) throw new TypeError('not ready')
      return new Response(JSON.stringify({ data: [{ id: PRODUCT_ID, slug: PRODUCT_SLUG }] }), {
        headers: { 'content-type': 'application/json' }
      })
    },
    'http://local',
    '/api/products?limit=1',
    'local product discovery',
    { attempts: 2, intervalMs: 0, waitImpl: async () => {} }
  )
  assert.deepEqual(item, { id: PRODUCT_ID, slug: PRODUCT_SLUG })
  assert.equal(attempts, 2)
})

test('production wiring and docs include the review delivery contract', () => {
  const route = fs.readFileSync(new URL('../server/routes/product-reviews.js', import.meta.url), 'utf8')
  const external = fs.readFileSync(new URL('../server/routes/external-api.js', import.meta.url), 'utf8')
  const translationGuide = fs.readFileSync(new URL('../TRANSLATION_SYSTEM_GUIDE.md', import.meta.url), 'utf8')
  const updateGuide = fs.readFileSync(new URL('../UPDATE-GUIDE.md', import.meta.url), 'utf8')
  assert.match(route, /createProductReviewSeoCacheInvalidator/)
  assert.match(route, /invalidateCache\s*:/)
  for (const token of ['pending', '200', 'external_id', 'YYYY-MM-DD', 'YYYY/MM/DD', 'YYYY年M月D日', '/product-reviews']) assert.match(external, new RegExp(token.replace(/[/-]/g, '\\$&')))
  assert.match(translationGuide, /reviews/i)
  assert.match(translationGuide, /产品评价/)
  assert.match(updateGuide, /server-update\.sh/)
  assert.match(updateGuide, /verifySeoDelivery\.mjs/)
  assert.match(updateGuide, /批量发布|管理员发布/)
})
