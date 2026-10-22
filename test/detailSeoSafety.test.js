import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(
  new URL('../server/index.js', import.meta.url),
  'utf8'
)

const clientSource = fs.readFileSync(
  new URL('../src/views/ProductDetail.vue', import.meta.url),
  'utf8'
)

test('detail SSR does not generate or persist synthetic reviews', () => {
  assert.doesNotMatch(source, /getOrGenerateSeoReviews/)
  assert.doesNotMatch(source, /INSERT INTO seo_reviews/)
})

test('product schema uses the shared review parts (review + aggregateRating) and article schema stays review-free', () => {
  const productBlock = source.slice(
    source.indexOf("'@context': 'https://schema.org', '@type': 'Product'"),
    source.indexOf("jsonLd(productSchema, 'product-jsonld')")
  )
  const articleBlock = source.slice(
    source.indexOf("'@context': 'https://schema.org', '@type': 'Article'"),
    source.indexOf("jsonLd(articleSchema, 'article-jsonld')")
  )

  // Genuine customer reviews: Google requires review AND aggregateRating
  // together. The shared builder emits both from the visible review store.
  assert.match(productBlock, /buildReviewSchemaParts\(publicReviews\)/)
  assert.doesNotMatch(productBlock, /delete\s+productSchema\.aggregateRating/)
  assert.doesNotMatch(articleBlock, /aggregateRating|review:/)
})

test('server and client product schemas emit offers only with a real price and no fabricated policy fields', () => {
  const serverProductBlock = source.slice(
    source.indexOf("'@context': 'https://schema.org', '@type': 'Product'"),
    source.indexOf("jsonLd(productSchema, 'product-jsonld')")
  )
  const clientProductBlock = clientSource.slice(
    clientSource.indexOf("'@type': 'Product'"),
    clientSource.indexOf("document.getElementById('product-jsonld')")
  )

  for (const block of [serverProductBlock, clientProductBlock]) {
    assert.match(block, /'@type': 'Offer'/)
    assert.match(block, /priceCurrency:\s*'USD'/)
    // The offer is gated on a real positive per-product price; no fabricated
    // price/valid-until constants are emitted. Shipping and return policies are
    // built from the admin SEO settings, not hardcoded in the page template.
    assert.doesNotMatch(block, /price:\s*(?:'0'|0\b)/)
    assert.doesNotMatch(block, /priceValidUntil/)
    assert.match(block, /buildProductOfferPolicy\(seoSettings(?:\.value)?\)/)
  }

  assert.match(serverProductBlock, /const productPrice = Number\(product\.price_usd\)/)
  assert.match(serverProductBlock, /if \(Number\.isFinite\(productPrice\) && productPrice > 0\)/)
  assert.match(clientProductBlock, /const productPrice = Number\(p\.price_usd\)/)
  assert.match(serverProductBlock, /buildReviewSchemaParts\(publicReviews\)/)
  assert.match(clientSource, /buildReviewSchemaParts\(publicReviews\.value\)/)
})
