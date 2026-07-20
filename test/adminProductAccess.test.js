import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as productsModule from '../server/routes/products.js'

test('admin product detail route is authenticated and reads the full unfiltered record', () => {
  assert.equal(typeof productsModule.getAdminProductDetail, 'function')

  let observedSql = ''
  let observedParams = []
  const expected = { id: 42, detail_content: '<p>full detail</p>', category_id: 9 }
  const product = productsModule.getAdminProductDetail(42, (sql, params) => {
    observedSql = sql
    observedParams = params
    return expected
  })

  assert.equal(product, expected)
  assert.deepEqual(observedParams, [42])
  assert.match(observedSql, /SELECT p\.\*, c\.name as category_name, c\.name_en as category_name_en/)
  assert.match(observedSql, /WHERE p\.id = \?/)
  assert.doesNotMatch(observedSql, /category_id IN|1=0|is_enabled/)

  const route = productsModule.default.stack
    .map(layer => layer.route)
    .find(candidate => candidate?.path === '/admin/:id' && candidate.methods.get)
  assert.ok(route)
  assert.equal(route.stack[0].name, 'authMiddleware')
})

test('admin API and every admin product-detail caller use the admin endpoint', async () => {
  const storage = new Map([['token', 'test-token']])
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
    key: index => [...storage.keys()][index] ?? null,
    get length() { return storage.size }
  }
  globalThis.window = { location: { pathname: '/admin/products', href: '' } }

  let requestedUrl = ''
  globalThis.fetch = async (url) => {
    requestedUrl = url
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ id: 42 })
    }
  }

  const { api } = await import(`../src/api/index.js?admin-product=${Date.now()}`)
  assert.equal(typeof api.getAdminProduct, 'function')
  await api.getAdminProduct(42)
  assert.match(requestedUrl, /^\/api\/products\/admin\/42\?t=\d+$/)

  const productsSource = fs.readFileSync(new URL('../src/views/admin/Products.vue', import.meta.url), 'utf8')
  const productAiSource = fs.readFileSync(new URL('../src/views/admin/ProductAI.vue', import.meta.url), 'utf8')
  assert.doesNotMatch(productsSource, /api\.getProduct\(/)
  assert.doesNotMatch(productsSource, /fetch\(['"`]\/api\/products\//)
  assert.doesNotMatch(productsSource, /let fullProduct = product/)
  assert.doesNotMatch(productAiSource, /api\.getProduct\(/)
})
