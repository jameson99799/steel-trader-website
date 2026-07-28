import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getSeoResponsePolicy,
  publicHtmlCacheControl,
  renderSeoDocument,
  renderSeoErrorPage
} from '../server/services/seoDocument.js'

const shell = `<!doctype html>
<html lang="en">
<head>
  <title>Generic</title>
  <meta name="description" content="Generic description">
  <meta name="keywords" content="generic">
  <meta name="robots" content="index, follow">
  <meta http-equiv="Cache-Control" content="no-store">
  <meta http-equiv="Pragma" content="no-cache">
  <link rel="canonical" href="https://www.sunseasteel.com/">
  <link rel="alternate" hreflang="en" href="https://www.sunseasteel.com/en">
  <meta property="og:title" content="Generic">
  <meta name="twitter:card" content="summary">
  <script type="application/ld+json">{"@type":"WebSite"}</script>
  <script>window.__INITIAL_STATE__={"generic":true}</script>
</head>
<body><div id="app"></div></body>
</html>`

test('normalizes route SEO into exactly one managed metadata set', () => {
  const html = renderSeoDocument({
    html: shell,
    lang: 'zh',
    title: '镀铝锌钢卷',
    description: '产品描述',
    keywords: '镀铝锌',
    canonical: 'https://www.sunseasteel.com/zh/products/gl',
    robots: 'index, follow',
    metaHtml: [
      '<meta property="og:title" content="镀铝锌钢卷">',
      '<link rel="alternate" hreflang="zh" href="https://www.sunseasteel.com/zh/products/gl">'
    ].join('\n'),
    schemaHtml: '<script type="application/ld+json" id="product-jsonld">{"@type":"Product"}</script>',
    stateHtml: '<script>window.__INITIAL_STATE__={}</script>'
  })

  assert.match(html, /<html lang="zh">/)
  assert.match(html, /<title>镀铝锌钢卷<\/title>/)
  assert.equal((html.match(/name="description"/g) || []).length, 1)
  assert.equal((html.match(/name="keywords"/g) || []).length, 1)
  assert.equal((html.match(/name="robots"/g) || []).length, 1)
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1)
  assert.equal((html.match(/property="og:title"/g) || []).length, 1)
  assert.equal((html.match(/type="application\/ld\+json"/g) || []).length, 1)
  assert.equal((html.match(/window\.__INITIAL_STATE__/g) || []).length, 1)
  assert.doesNotMatch(html, /http-equiv="(?:Cache-Control|Pragma|Expires)"/i)
})

test('escapes metadata values before inserting them into the document', () => {
  const html = renderSeoDocument({
    html: shell,
    lang: 'en"><script>alert(1)</script>',
    title: '<unsafe>',
    description: '"quoted" & unsafe',
    keywords: '<steel>',
    canonical: 'https://example.com/?a=1&b="2"',
    robots: 'noindex, nofollow'
  })

  assert.doesNotMatch(html, /<title><unsafe><\/title>/)
  assert.match(html, /<title>&lt;unsafe&gt;<\/title>/)
  assert.match(html, /content="&quot;quoted&quot; &amp; unsafe"/)
  assert.match(html, /href="https:\/\/example\.com\/\?a=1&amp;b=&quot;2&quot;"/)
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/)
})

test('uses revalidation caching and emits a non-indexable error document', () => {
  assert.equal(
    publicHtmlCacheControl,
    'public, max-age=0, must-revalidate, s-maxage=300, stale-while-revalidate=60'
  )

  const html = renderSeoErrorPage()
  assert.match(html, /name="robots" content="noindex, nofollow"/)
  assert.doesNotMatch(html, /rel="canonical"/)
  assert.match(html, /<title>Server Error<\/title>/)
})

test('keeps private and not-found documents out of shared caches and search', () => {
  assert.deepEqual(getSeoResponsePolicy({ isPrivateRoute: true, isNotFound: false }), {
    cacheControl: 'no-store',
    robots: 'noindex, nofollow'
  })
  assert.deepEqual(getSeoResponsePolicy({ isPrivateRoute: false, isNotFound: true }), {
    cacheControl: 'no-store',
    robots: 'noindex, follow'
  })
  assert.deepEqual(getSeoResponsePolicy({ isPrivateRoute: false, isNotFound: false }), {
    cacheControl: publicHtmlCacheControl,
    robots: 'index, follow'
  })
})
