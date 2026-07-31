import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(
  new URL('../server/index.js', import.meta.url),
  'utf8'
)

test('detail SSR does not generate or persist synthetic reviews', () => {
  assert.doesNotMatch(source, /getOrGenerateSeoReviews/)
  assert.doesNotMatch(source, /INSERT INTO seo_reviews/)
})

test('product and article schemas do not publish synthetic review fields', () => {
  const productBlock = source.slice(
    source.indexOf("'@context': 'https://schema.org', '@type': 'Product'"),
    source.indexOf("jsonLd(productSchema, 'product-jsonld')")
  )
  const articleBlock = source.slice(
    source.indexOf("'@context': 'https://schema.org', '@type': 'Article'"),
    source.indexOf("jsonLd(articleSchema, 'article-jsonld')")
  )

  assert.match(productBlock, /offers:/)
  assert.doesNotMatch(productBlock, /aggregateRating|review:/)
  assert.doesNotMatch(articleBlock, /aggregateRating|review:/)
})
