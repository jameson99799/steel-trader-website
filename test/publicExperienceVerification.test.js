import test from 'node:test'
import assert from 'node:assert/strict'

import {
  classifyTemplate,
  discoverSitemapUrls,
  validateSeoDocument,
  verifyHttpUrls,
  verifyViewport
} from '../scripts/verifyPublicExperience.mjs'

function response(body, { status = 200, contentType = 'text/xml' } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: name => name.toLowerCase() === 'content-type' ? contentType : null },
    text: async () => body
  }
}

test('discovers nested sitemap URLs without duplicates', async () => {
  const documents = new Map([
    ['https://example.com/sitemap.xml', '<sitemapindex><sitemap><loc>https://example.com/sitemap-pages.xml</loc></sitemap><sitemap><loc>https://example.com/sitemap-products.xml</loc></sitemap></sitemapindex>'],
    ['https://example.com/sitemap-pages.xml', '<urlset><url><loc>https://example.com/en/about</loc></url><url><loc>https://example.com/en/products/a</loc></url></urlset>'],
    ['https://example.com/sitemap-products.xml', '<urlset><url><loc>https://example.com/en/products/a</loc></url></urlset>']
  ])
  const fakeFetch = async url => response(documents.get(url) || '', { status: documents.has(url) ? 200 : 404 })
  const urls = await discoverSitemapUrls(fakeFetch, 'https://example.com')
  assert.deepEqual(urls, ['https://example.com/en/about', 'https://example.com/en/products/a'])
})

test('rejects cross-origin sitemap entries and malformed sitemap XML', async () => {
  const fakeFetch = async () => response('<urlset><url><loc>https://outside.example/x</loc></url></urlset>')
  await assert.rejects(() => discoverSitemapUrls(fakeFetch, 'https://example.com'), /站点地图包含站外 URL/)

  const malformedFetch = async () => response('<html>not a sitemap</html>', { contentType: 'text/html' })
  await assert.rejects(() => discoverSitemapUrls(malformedFetch, 'https://example.com'), /不是有效的 sitemap/)
})

test('reports missing canonical, hreflang, H1 and invalid JSON-LD', () => {
  const issues = validateSeoDocument({
    html: '<html><head><title>X</title><script type="application/ld+json">{bad}</script></head><body></body></html>',
    url: 'https://example.com/en/about',
    template: 'about'
  })
  assert.deepEqual(issues.map(issue => issue.code), [
    'meta-description-missing', 'canonical-missing', 'hreflang-missing', 'h1-missing', 'jsonld-invalid'
  ])
})

test('accepts complete SEO HTML and classifies representative templates', () => {
  const html = '<html><head><title>About</title><meta name="description" content="About us"><link rel="canonical" href="https://example.com/en/about"><link rel="alternate" hreflang="en" href="https://example.com/en/about"><script type="application/ld+json">{"@type":"Organization"}</script></head><body><h1>About</h1></body></html>'
  assert.deepEqual(validateSeoDocument({ html, url: 'https://example.com/en/about', template: 'about' }), [])
  assert.equal(classifyTemplate('https://example.com/en/products/coil'), 'product-detail')
  assert.equal(classifyTemplate('https://example.com/zh/news/article'), 'news-detail')
  assert.equal(classifyTemplate('https://example.com/en/about'), 'about')
})

test('HTTP verification preserves per-URL status and SEO issues', async () => {
  const good = '<html><head><title>Good</title><meta name="description" content="Good"><link rel="canonical" href="https://example.com/en/about"><link rel="alternate" hreflang="en" href="https://example.com/en/about"></head><body><h1>Good</h1></body></html>'
  const fakeFetch = async url => url.endsWith('/missing')
    ? response('missing', { status: 404, contentType: 'text/plain' })
    : response(good, { contentType: 'text/html' })
  const results = await verifyHttpUrls({
    fetchImpl: fakeFetch,
    urls: ['https://example.com/en/about', 'https://example.com/en/missing'],
    concurrency: 2
  })
  assert.equal(results[0].status, 200)
  assert.deepEqual(results[0].issues, [])
  assert.equal(results[1].status, 404)
  assert.equal(results[1].issues[0].code, 'http-status')
})

test('viewport verification reports overflow, first-party resource failures, page errors and broken main images', async () => {
  const listeners = new Map()
  const page = {
    setViewport: async () => {},
    on: (event, handler) => listeners.set(event, handler),
    goto: async () => {
      listeners.get('pageerror')?.(new Error('render broke'))
      listeners.get('requestfailed')?.({ url: () => 'https://example.com/assets/app.js', failure: () => ({ errorText: 'net::ERR_FAILED' }) })
    },
    evaluate: async () => ({ overflow: true, brokenImages: ['/uploads/broken.jpg'] }),
    close: async () => {}
  }
  const browser = { newPage: async () => page }
  const issues = await verifyViewport({ browser, url: 'https://example.com/en/about', viewport: { name: 'mobile', width: 390, height: 844 } })
  assert.deepEqual(issues.map(issue => issue.code).sort(), ['broken-image', 'horizontal-overflow', 'page-error', 'resource-failed'])
})
