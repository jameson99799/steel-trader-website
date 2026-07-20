import test from 'node:test'
import assert from 'node:assert/strict'
import { createLocaleRedirect } from '../server/middleware/localeRedirect.js'

const run = (req, options = {}) => new Promise(resolve => {
  const cookies = []
  const middleware = createLocaleRedirect({
    getActiveCodes: options.getActiveCodes || (() => new Set(['en', 'zh', 'hi'])),
    resolveCountry: options.resolveCountry || (async () => 'IN')
  })
  const res = {
    cookie: (...args) => {
      cookies.push(args)
      return res
    },
    redirect: (status, url) => resolve({ status, url, cookies })
  }
  middleware(req, res, () => resolve({ next: true, cookies }))
})

test('Indian Google landing rewrites a Chinese product path to Hindi', async () => {
  const result = await run({ method: 'GET', path: '/zh/products/coil', originalUrl: '/zh/products/coil?utm=google', ip: '8.8.8.8', headers: { referer: 'https://www.google.co.in/search?q=coil' }, cookies: {} })
  assert.deepEqual(result, {
    status: 302,
    url: '/hi/products/coil?utm=google',
    cookies: [['locale_auto_selected', '1', { path: '/', sameSite: 'lax', maxAge: 86400000 }]]
  })
})

test('manual preference and non-search traffic are not redirected', async () => {
  assert.deepEqual(await run({ method: 'GET', path: '/zh/products/coil', originalUrl: '/zh/products/coil', ip: '8.8.8.8', headers: {}, cookies: { locale_preference: 'zh' } }), { next: true, cookies: [] })
  assert.deepEqual(await run({ method: 'GET', path: '/zh/products/coil', originalUrl: '/zh/products/coil', ip: '8.8.8.8', headers: { referer: 'https://www.google.com/search?q=coil', cookie: 'locale_preference=zh' } }), { next: true, cookies: [] })
  assert.deepEqual(await run({ method: 'GET', path: '/zh/products/coil', originalUrl: '/zh/products/coil', ip: '8.8.8.8', headers: { referer: 'https://example.com/' }, cookies: {} }), { next: true, cookies: [] })
})

test('lookalike Google and Yahoo domains are not treated as search referrals', async () => {
  for (const referer of ['https://google.com.evil/search?q=coil', 'https://yahoo.co.uk.evil/search?q=coil']) {
    assert.deepEqual(await run({ method: 'GET', path: '/zh/products/coil', originalUrl: '/zh/products/coil', ip: '8.8.8.8', headers: { referer }, cookies: {} }), { next: true, cookies: [] })
  }
})

test('lookalike Yandex domains are not treated as search referrals', async () => {
  assert.deepEqual(await run({ method: 'GET', path: '/zh/products/coil', originalUrl: '/zh/products/coil', ip: '8.8.8.8', headers: { referer: 'https://yandex.ru.evil/search?q=coil' }, cookies: {} }), { next: true, cookies: [] })
})

test('automatic-selection preference and non-public paths are not redirected', async () => {
  const google = { referer: 'https://www.google.com/search?q=coil' }
  assert.deepEqual(await run({ method: 'GET', path: '/zh/products/coil', originalUrl: '/zh/products/coil', ip: '8.8.8.8', headers: google, cookies: { locale_auto_selected: '1' } }), { next: true, cookies: [] })
  assert.deepEqual(await run({ method: 'POST', path: '/zh/products/coil', originalUrl: '/zh/products/coil', ip: '8.8.8.8', headers: google, cookies: {} }), { next: true, cookies: [] })
  assert.deepEqual(await run({ method: 'GET', path: '/zh/assets/app.js', originalUrl: '/zh/assets/app.js', ip: '8.8.8.8', headers: google, cookies: {} }), { next: true, cookies: [] })
  assert.deepEqual(await run({ method: 'GET', path: '/sitemap.xml', originalUrl: '/sitemap.xml', ip: '8.8.8.8', headers: google, cookies: {} }), { next: true, cookies: [] })
})

test('uses req.ip GeoIP resolution and falls back to English for unavailable country languages', async () => {
  let resolvedIp = null
  const result = await run({
    method: 'HEAD',
    path: '/zh/products/coil',
    originalUrl: '/zh/products/coil?source=search',
    ip: '8.8.8.8',
    headers: { referer: 'https://www.bing.com/search?q=coil', 'x-forwarded-for': '1.1.1.1' },
    cookies: {}
  }, {
    getActiveCodes: () => new Set(['en', 'zh']),
    resolveCountry: async ip => {
      resolvedIp = ip
      return { countryCode: 'IN', countryName: 'India' }
    }
  })

  assert.equal(resolvedIp, '8.8.8.8')
  assert.equal(result.status, 302)
  assert.equal(result.url, '/en/products/coil?source=search')
})

test('does not redirect when the detected language is already active or disabled', async () => {
  const google = { referer: 'https://duckduckgo.com/?q=coil' }
  assert.deepEqual(await run({ method: 'GET', path: '/hi/products/coil', originalUrl: '/hi/products/coil', ip: '8.8.8.8', headers: google, cookies: {} }), { next: true, cookies: [] })
  assert.deepEqual(await run({ method: 'GET', path: '/zh/products/coil', originalUrl: '/zh/products/coil', ip: '8.8.8.8', headers: google, cookies: {} }, {
    getActiveCodes: () => new Set(['zh']),
    resolveCountry: async () => 'IN'
  }), { next: true, cookies: [] })
})
