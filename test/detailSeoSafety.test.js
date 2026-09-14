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

test('product schema claims no reviews/ratings and article schema stays review-free', () => {
  const productBlock = source.slice(
    source.indexOf("'@context': 'https://schema.org', '@type': 'Product'"),
    source.indexOf("jsonLd(productSchema, 'product-jsonld')")
  )
  const articleBlock = source.slice(
    source.indexOf("'@context': 'https://schema.org', '@type': 'Article'"),
    source.indexOf("jsonLd(articleSchema, 'article-jsonld')")
  )

  // Reviews stay visible on the page, but the Product JSON-LD must not attach
  // review/aggregateRating parts: review without aggregateRating fails Google
  // validation, and an aggregate of admin-seeded reviews is self-serving.
  assert.doesNotMatch(productBlock, /buildReviewSchemaParts/)
  assert.doesNotMatch(productBlock, /aggregateRating\s*:|review\s*:/)
  assert.doesNotMatch(articleBlock, /aggregateRating|review:/)
})

test('server and client product schemas omit offers and never fabricate prices or ratings', () => {
  const serverProductBlock = source.slice(
    source.indexOf("'@context': 'https://schema.org', '@type': 'Product'"),
    source.indexOf("jsonLd(productSchema, 'product-jsonld')")
  )
  const clientProductBlock = clientSource.slice(
    clientSource.indexOf("'@type': 'Product'"),
    clientSource.indexOf("document.getElementById('product-jsonld')")
  )

  for (const block of [serverProductBlock, clientProductBlock]) {
    // No offers at all: an Offer without a real price fails Google validation.
    assert.doesNotMatch(block, /'@type': 'Offer'|\boffers\s*:/)
    assert.doesNotMatch(block, /price:\s|priceValidUntil|shippingDetails|hasMerchantReturnPolicy/)
    assert.doesNotMatch(block, /aggregateRating:|review:\s*\{/)
  }

  assert.doesNotMatch(serverProductBlock, /buildReviewSchemaParts/)
  assert.doesNotMatch(clientSource, /buildReviewSchemaParts/)
})
