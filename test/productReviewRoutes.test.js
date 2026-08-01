import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const routesUrl = new URL('../server/routes/product-reviews.js', import.meta.url)

async function loadRoutes() {
  try {
    return await import(`${routesUrl.href}?test=${Date.now()}-${Math.random()}`)
  } catch (error) {
    assert.fail(`product review routes are missing or invalid: ${error.message}`)
  }
}

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    }
  }
}

function invoke(handler, { body = {}, params = {}, query = {} } = {}) {
  const response = createResponse()
  handler({ body, params, query }, response)
  return response
}

function createStore(overrides = {}) {
  const calls = []
  const store = {
    listPublic: input => (calls.push(['listPublic', input]), { reviews: [], input }),
    listAdmin: input => (calls.push(['listAdmin', input]), { data: [], ...input }),
    getById: id => (calls.push(['getById', id]), { id: Number(id) }),
    create: (input, policy) => (calls.push(['create', input, policy]), { id: 1, ...input, policy }),
    bulkCreate: (productId, rows, policy) => (calls.push(['bulkCreate', productId, rows, policy]), { created: rows }),
    update: (id, input, policy) => (calls.push(['update', id, input, policy]), { id: Number(id), ...input, policy }),
    remove: id => (calls.push(['remove', id]), true),
    bulkStatus: (ids, status) => (calls.push(['bulkStatus', ids, status]), { updated: ids.length }),
    publishAll: filters => (calls.push(['publishAll', filters]), { updated: 2 }),
    ...overrides
  }
  return { store, calls }
}

test('router exposes the public GET and authenticates every admin write route first', async () => {
  const routes = await loadRoutes()
  const publicRoute = routes.default.stack
    .map(layer => layer.route)
    .find(route => route?.path === '/product/:productId' && route.methods.get)
  assert.ok(publicRoute)

  const expectedWrites = new Map([
    ['post:/admin', true],
    ['post:/admin/parse-import', true],
    ['post:/admin/bulk', true],
    ['put:/admin/:id', true],
    ['delete:/admin/:id', true],
    ['post:/admin/bulk-status', true],
    ['post:/admin/publish-all', true]
  ])
  for (const route of routes.default.stack.map(layer => layer.route).filter(Boolean)) {
    for (const method of Object.keys(route.methods)) {
      const key = `${method}:${route.path}`
      if (!expectedWrites.has(key)) continue
      assert.equal(route.stack[0].name, 'authMiddleware', `${key} must authenticate first`)
      expectedWrites.delete(key)
    }
  }
  assert.deepEqual([...expectedWrites.keys()], [])
})

test('external policy cannot be overridden by request status or source', async () => {
  const { forceExternalReviewPolicy, MAX_REVIEW_BATCH_SIZE } = await loadRoutes()
  assert.equal(MAX_REVIEW_BATCH_SIZE, 200)
  assert.deepEqual(
    forceExternalReviewPolicy({ status: 'published', source: 'admin' }),
    { source: 'external_api', forcedStatus: 'pending' }
  )
})

test('admin handlers pass pagination and policies, parse without writes, and preserve explicit bulk operations', async () => {
  const { createProductReviewHandlers } = await loadRoutes()
  const { store, calls } = createStore()
  let parsedText = ''
  const handlers = createProductReviewHandlers({
    store,
    parseImport: text => {
      parsedText = text
      return { valid: [{ line: 1 }], invalid: [], duplicates: [] }
    }
  })

  assert.equal(invoke(handlers.listPublic, {
    params: { productId: '8' }, query: { lang: 'es', page: '2', limit: '5', ignored: 'x' }
  }).statusCode, 200)
  assert.deepEqual(calls.shift(), ['listPublic', { productId: '8', lang: 'es', page: '2', limit: '5' }])

  const filters = { productId: '8', categoryId: '3', status: 'pending', source: 'admin', q: 'buyer', dateFrom: '2026-01-01', dateTo: '2026-02-01', page: '2', limit: '20' }
  invoke(handlers.listAdmin, { query: filters })
  assert.deepEqual(calls.shift(), ['listAdmin', filters])

  const createResponse = invoke(handlers.createAdmin, { body: { product_id: 8, author_name: 'Buyer' } })
  assert.equal(createResponse.statusCode, 201)
  assert.deepEqual(calls.shift(), ['create', { product_id: 8, author_name: 'Buyer' }, { source: 'admin', forcedStatus: 'published' }])

  const beforeParse = calls.length
  const parseResponse = invoke(handlers.parseImport, { body: { text: 'Buyer - 2026-01-01 - 5 - Genuine' } })
  assert.equal(parseResponse.statusCode, 200)
  assert.equal(parsedText, 'Buyer - 2026-01-01 - 5 - Genuine')
  assert.equal(calls.length, beforeParse)

  invoke(handlers.bulkCreateAdmin, { body: { productId: 8, rows: [{ line: 4, author_name: 'Buyer' }] } })
  assert.deepEqual(calls.shift(), ['bulkCreate', 8, [{ line: 4, author_name: 'Buyer' }], { source: 'admin_import', forcedStatus: 'published' }])

  invoke(handlers.bulkStatus, { body: { ids: [1, 2], status: 'hidden', extra: true } })
  assert.deepEqual(calls.shift(), ['bulkStatus', [1, 2], 'hidden'])

  const publishFilters = { productId: 8, categoryId: 3, status: 'hidden', q: 'ignored-by-domain-scope' }
  invoke(handlers.publishAll, { body: publishFilters })
  assert.deepEqual(calls.shift(), ['publishAll', publishFilters])
})

test('admin details and delete return 404 when the review does not exist', async () => {
  const { createProductReviewHandlers } = await loadRoutes()
  const { store } = createStore({ getById: () => null, remove: () => false })
  const handlers = createProductReviewHandlers({ store })
  assert.equal(invoke(handlers.getAdmin, { params: { id: '404' } }).statusCode, 404)
  assert.equal(invoke(handlers.removeAdmin, { params: { id: '404' } }).statusCode, 404)
})

test('external handlers force pending for create, bulk, and update while returning store idempotency data unchanged', async () => {
  const { createExternalProductReviewHandlers } = await loadRoutes()
  const idempotent = { id: 9, external_id: 'order-9', status: 'pending', idempotent: true }
  const { store, calls } = createStore({ create: (input, policy) => (calls.push(['create', input, policy]), idempotent) })
  const handlers = createExternalProductReviewHandlers({ store })

  const created = invoke(handlers.create, { body: { product_id: 1, status: 'published', source: 'admin', external_id: 'order-9' } })
  assert.equal(created.statusCode, 201)
  assert.equal(created.body, idempotent)
  assert.deepEqual(calls.shift()[2], { source: 'external_api', forcedStatus: 'pending' })

  invoke(handlers.bulkCreate, { body: { productId: 1, rows: [{ line: 1, status: 'published' }] } })
  assert.deepEqual(calls.shift(), ['bulkCreate', 1, [{ line: 1, status: 'published' }], { source: 'external_api', forcedStatus: 'pending' }])

  invoke(handlers.update, { params: { id: '9' }, body: { product_id: 99, source: 'admin', external_id: 'changed', status: 'published' } })
  assert.deepEqual(calls.shift(), ['update', '9', { product_id: 99, source: 'admin', external_id: 'changed', status: 'published' }, { source: 'external_api', forcedStatus: 'pending' }])
})

test('external route registration has CRUD but no publish or status route', async () => {
  const routes = await loadRoutes()
  const { store } = createStore()
  const router = routes.createExternalProductReviewRouter({ store, middleware: function apiKeyMiddleware(req, res, next) { next() } })
  const registeredRoutes = router.stack.map(layer => layer.route).filter(Boolean)
  for (const route of registeredRoutes) {
    assert.equal(route.stack[0].name, 'apiKeyMiddleware')
  }
  const signatures = registeredRoutes.flatMap(route =>
    Object.keys(route.methods).map(method => `${method.toUpperCase()} ${route.path}`)
  )
  assert.deepEqual(signatures, [
    'GET /product-reviews',
    'GET /product-reviews/:id',
    'POST /product-reviews',
    'POST /product-reviews/bulk',
    'PUT /product-reviews/:id',
    'DELETE /product-reviews/:id'
  ])
  assert.ok(signatures.every(signature => !/publish|status/i.test(signature)))
})

test('admin and external batches reject 0 or 201 rows with range details and preserve invalid line numbers', async () => {
  const { createProductReviewHandlers, createExternalProductReviewHandlers } = await loadRoutes()
  const invalidLineStore = createStore({
    bulkCreate: () => { throw new Error('line 7: rating must be between 1 and 5') }
  }).store
  const admin = createProductReviewHandlers({ store: invalidLineStore })
  const external = createExternalProductReviewHandlers({ store: invalidLineStore })

  for (const handler of [admin.bulkCreateAdmin, external.bulkCreate]) {
    for (const rows of [[], Array.from({ length: 201 }, (_, index) => ({ line: index + 1 }))]) {
      const response = invoke(handler, { body: { productId: 1, rows } })
      assert.equal(response.statusCode, 400)
      assert.match(String(response.body.details), /1.{0,20}200/)
    }
    const invalid = invoke(handler, { body: { productId: 1, rows: [{ line: 7 }] } })
    assert.equal(invalid.statusCode, 400)
    assert.match(String(invalid.body.details), /line 7/i)
  }
})

test('legacy seo review compatibility is deprecated, non-random, pending, and uses the product review store', async () => {
  const routes = await loadRoutes()
  const { store, calls } = createStore()
  const handler = routes.createLegacySeoReviewHandler({ store })
  const response = invoke(handler, {
    body: { target_type: 'product', target_id: 4, author_name: 'Real buyer', rating: 4.5, review_text: 'Authentic review', status: 'published' }
  })
  assert.equal(response.statusCode, 201)
  assert.equal(response.body.success, true)
  assert.equal(response.body.deprecated, true)
  assert.equal(response.body.replacement, '/api/external/product-reviews')
  assert.deepEqual(calls.shift(), ['create', {
    product_id: 4,
    author_name: 'Real buyer',
    rating: 4.5,
    review_text: 'Authentic review'
  }, { source: 'external_api', forcedStatus: 'pending' }])

  const externalSource = fs.readFileSync(new URL('../server/routes/external-api.js', import.meta.url), 'utf8')
  assert.doesNotMatch(externalSource, /4\.7\s*\+\s*Math\.random/)
  assert.doesNotMatch(externalSource, /immediately appear in JSON-LD/i)
  assert.match(externalSource, /deprecated/i)
})

test('legacy article seo reviews return a deprecated 400 without writing either review store', async () => {
  const routes = await loadRoutes()
  const { store, calls } = createStore()
  const handler = routes.createLegacySeoReviewHandler({ store })
  const response = invoke(handler, {
    body: { target_type: 'article', target_id: 4, author_name: 'Reader', rating: 4.5, review_text: 'Article feedback' }
  })
  assert.equal(response.statusCode, 400)
  assert.equal(response.body.deprecated, true)
  assert.equal(response.body.replacement, '/api/external/product-reviews')
  assert.match(response.body.error, /product/i)
  assert.deepEqual(calls, [])
})

test('frontend client and server mount expose the exact product review APIs', () => {
  const apiSource = fs.readFileSync(new URL('../src/api/index.js', import.meta.url), 'utf8')
  for (const method of [
    'getPublicProductReviews', 'getAdminProductReviews', 'getAdminProductReview', 'createProductReview',
    'parseProductReviewImport', 'bulkCreateProductReviews', 'updateProductReview', 'deleteProductReview',
    'bulkUpdateProductReviewStatus', 'publishAllPendingProductReviews'
  ]) {
    assert.match(apiSource, new RegExp(`\\b${method}\\s*:`), `${method} is missing`)
  }

  const serverSource = fs.readFileSync(new URL('../server/index.js', import.meta.url), 'utf8')
  assert.match(serverSource, /import productReviewRoutes from ['"]\.\/routes\/product-reviews\.js['"]/)
  assert.match(serverSource, /app\.use\(['"]\/api\/product-reviews['"], productReviewRoutes\)/)
})

test('existing external product and article routes remain registered', async () => {
  const externalModule = await import(`../server/routes/external-api.js?regression=${Date.now()}`)
  const signatures = externalModule.default.stack.map(layer => layer.route).filter(Boolean).flatMap(route =>
    Object.keys(route.methods).map(method => `${method.toUpperCase()} ${route.path}`)
  )
  assert.ok(signatures.includes('GET /products'))
  assert.ok(signatures.includes('POST /products'))
  assert.ok(signatures.includes('GET /news'))
  assert.ok(signatures.includes('POST /news'))
})
