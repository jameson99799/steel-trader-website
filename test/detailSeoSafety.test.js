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

test('product schema adds only shared public review parts and article schema stays review-free', () => {
  const productBlock = source.slice(
    source.indexOf("'@context': 'https://schema.org', '@type': 'Product'"),
    source.indexOf("jsonLd(productSchema, 'product-jsonld')")
  )
  const articleBlock = source.slice(
    source.indexOf("'@context': 'https://schema.org', '@type': 'Article'"),
    source.indexOf("jsonLd(articleSchema, 'article-jsonld')")
  )

  assert.match(productBlock, /buildReviewSchemaParts\(publicReviews\)/)
  assert.doesNotMatch(productBlock, /aggregateRating\s*:|review\s*:/)
  assert.doesNotMatch(articleBlock, /aggregateRating|review:/)
})

test('server and client product schemas add offers without fabricated prices or ratings', () => {
  const serverProductBlock = source.slice(
    source.indexOf("'@context': 'https://schema.org', '@type': 'Product'"),
    source.indexOf("jsonLd(productSchema, 'product-jsonld')")
  )
  const clientProductBlock = clientSource.slice(
    clientSource.indexOf("'@type': 'Product'"),
    clientSource.indexOf('Object.assign(productSchema, buildReviewSchemaParts')
  )

  for (const block of [serverProductBlock, clientProductBlock]) {
    assert.match(block, /\boffers\s*:\s*\{[\s\S]*?'@type': 'Offer'/)
    assert.doesNotMatch(block, /price:\s|priceValidUntil|shippingDetails|hasMerchantReturnPolicy/)
    assert.doesNotMatch(block, /aggregateRating:|review:\s*\{/)
  }

  assert.match(serverProductBlock, /buildReviewSchemaParts\(publicReviews\)/)
  assert.match(clientSource, /buildReviewSchemaParts\(publicReviews\.value\)/)
})
