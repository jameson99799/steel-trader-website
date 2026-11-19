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

test('product pages link to the daily price board and emit no offers', () => {
  const serverProductBlock = source.slice(
    source.indexOf("'@context': 'https://schema.org', '@type': 'Product'"),
    source.indexOf("jsonLd(productSchema, 'product-jsonld')")
  )
  const clientProductBlock = clientSource.slice(
    clientSource.indexOf("'@type': 'Product'"),
    clientSource.indexOf("document.getElementById('product-jsonld')")
  )

  // The price lives on the daily price board; the product page links to it
  // instead of displaying a static number. Google requires offers.price to
  // match visibly displayed prices — with no visible price, no offers are
  // emitted and no offer policy fields can leak into the schema.
  for (const block of [serverProductBlock, clientProductBlock]) {
    assert.doesNotMatch(block, /'@type': 'Offer'/)
    assert.doesNotMatch(block, /buildProductOfferPolicy/)
    assert.doesNotMatch(block, /priceValidUntil/)
  }

  // The click-through to the daily price board exists in both the SSR markup
  // and the client page, and the review parts stay shared with the visible set
  assert.match(source, /news\/daily-price/)
  assert.match(clientSource, /news\/daily-price/)
  assert.match(source, /buildReviewSchemaParts\(publicReviews\)/)
  assert.match(clientSource, /buildReviewSchemaParts\(publicReviews\.value\)/)
})
