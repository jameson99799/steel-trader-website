import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const reviewSeoUrl = new URL('../shared/productReviewSeo.js', import.meta.url)
const detailUrl = new URL('../src/views/ProductDetail.vue', import.meta.url)
const reviewsComponentUrl = new URL('../src/components/ProductReviews.vue', import.meta.url)
const serverUrl = new URL('../server/index.js', import.meta.url)

const readIfPresent = url => fs.existsSync(url) ? fs.readFileSync(url, 'utf8') : ''

async function loadBuilder() {
  assert.ok(fs.existsSync(reviewSeoUrl), 'shared/productReviewSeo.js must exist')
  return (await import(reviewSeoUrl.href)).buildReviewSchemaParts
}

test('buildReviewSchemaParts maps real visible review data without mutating it', async () => {
  const buildReviewSchemaParts = await loadBuilder()
  const input = {
    reviews: [
      {
        id: 11,
        author_name: 'Ana García',
        review_title: 'Proyecto real',
        review_date: '2026-04-03',
        rating: '4.5',
        review_text: 'Texto completo del proyecto.',
        verified_purchase: 1,
        is_incentivized: 1,
        incentive_disclosure: 'Sample supplied for evaluation.'
      }
    ],
    summary: { ratingValue: '4.7', reviewCount: '23' }
  }
  const original = structuredClone(input)

  const result = buildReviewSchemaParts(input)

  assert.deepEqual(input, original)
  assert.deepEqual(result.aggregateRating, {
    '@type': 'AggregateRating',
    ratingValue: 4.7,
    reviewCount: 23,
    bestRating: 5,
    worstRating: 1
  })
  assert.deepEqual(result.review, [{
    '@type': 'Review',
    name: 'Proyecto real',
    author: { '@type': 'Person', name: 'Ana García' },
    datePublished: '2026-04-03',
    reviewRating: { '@type': 'Rating', ratingValue: 4.5, bestRating: 5, worstRating: 1 },
    reviewBody: 'Texto completo del proyecto.'
  }])
  assert.doesNotMatch(JSON.stringify(result), /verified|incentivized|disclosure/i)
})

test('buildReviewSchemaParts returns no review schema for empty or non-positive data', async () => {
  const buildReviewSchemaParts = await loadBuilder()

  for (const input of [
    undefined,
    {},
    { reviews: {}, summary: { ratingValue: 5, reviewCount: 1 } },
    { reviews: [], summary: { ratingValue: 5, reviewCount: 1 } },
    { reviews: [{ author_name: 'Buyer', rating: 5, review_text: 'Real' }], summary: {} },
    { reviews: [{ author_name: 'Buyer', rating: 5, review_text: 'Real' }], summary: { ratingValue: 0, reviewCount: 1 } },
    { reviews: [{ author_name: 'Buyer', rating: 5, review_text: 'Real' }], summary: { ratingValue: 5, reviewCount: 0 } }
  ]) {
    assert.deepEqual(buildReviewSchemaParts(input), {})
  }
})

test('buildReviewSchemaParts filters invalid records and omits blank titles and invalid dates', async () => {
  const buildReviewSchemaParts = await loadBuilder()
  const result = buildReviewSchemaParts({
    reviews: [
      { author_name: '', rating: 5, review_text: 'No author' },
      { author_name: 'No text', rating: 5, review_text: '   ' },
      { author_name: 'Too high', rating: 5.1, review_text: 'Invalid rating' },
      { author_name: 'Not numeric', rating: 'five', review_text: 'Invalid rating' },
      { author_name: 'Visible buyer', review_title: '   ', review_date: 'not-a-date', rating: 3.5, review_text: 'Only visible review' }
    ],
    summary: { ratingValue: 4.2, reviewCount: 9 }
  })

  assert.equal(result.review.length, 1)
  assert.equal(result.review[0].author.name, 'Visible buyer')
  assert.equal(result.review[0].reviewBody, 'Only visible review')
  assert.equal(result.review[0].reviewRating.ratingValue, 3.5)
  assert.ok(!Object.hasOwn(result.review[0], 'name'))
  assert.ok(!Object.hasOwn(result.review[0], 'datePublished'))
  assert.equal(result.aggregateRating.ratingValue, 4.2)
  assert.equal(result.aggregateRating.reviewCount, 9)
})

test('ProductReviews renders authentic text, numeric partial ratings and disclosures as plain text', () => {
  const source = readIfPresent(reviewsComponentUrl)
  assert.ok(source, 'src/components/ProductReviews.vue must exist')
  assert.doesNotMatch(source, /v-html/)
  assert.match(source, /review\.review_text/)
  assert.match(source, /review\.author_name/)
  assert.match(source, /review\.review_title/)
  assert.match(source, /review\.review_date/)
  assert.match(source, /review\.verified_purchase/)
  assert.match(source, /review\.is_incentivized/)
  assert.match(source, /review\.incentive_disclosure/)
  assert.match(source, /aria-label=.*rating/i)
  assert.match(source, /Number\(review\.rating\)/)
  assert.match(source, /summary\.reviewCount/)
})

test('ProductReviews loads and deduplicates the next page for the current product and language', () => {
  const source = readIfPresent(reviewsComponentUrl)
  assert.ok(source, 'src/components/ProductReviews.vue must exist')
  assert.match(source, /getPublicProductReviews\(props\.productId/)
  assert.match(source, /lang:\s*props\.lang/)
  assert.match(source, /page:\s*nextPage/)
  assert.match(source, /localPagination\.total/)
  assert.match(source, /new Set|new Map/)
  assert.match(source, /watch\(\s*\[\(\) => props\.productId, \(\) => props\.lang/)
})

test('ProductDetail consumes matching SSR review state and protects product-language request races', () => {
  const detail = readIfPresent(detailUrl)
  const component = readIfPresent(reviewsComponentUrl)
  assert.match(detail, /import ProductReviews from/)
  assert.match(detail, /import \{ buildReviewSchemaParts \} from ['"]\.\.\/\.\.\/shared\/productReviewSeo\.js['"]/)
  assert.match(detail, /<ProductReviews/)
  assert.match(detail, /getPublicProductReviews\(productId,\s*\{\s*lang:\s*language,\s*page:\s*1,\s*limit:\s*10\s*\}\)/s)
  assert.match(detail, /ssrProductReviews/)
  assert.match(detail, /ssrProductReviewsProductId/)
  assert.match(detail, /ssrProductReviewsLang/)
  assert.match(detail, /reviewRequestToken/)
  assert.match(detail, /watch\(\s*\[\(\) => route\.params\.slug, lang\]/)
  assert.match(detail, /buildReviewSchemaParts\(publicReviews\.value\)/)

  const pageLoad = detail.slice(detail.indexOf('async function loadProductPage'))
  const firstAwait = pageLoad.indexOf('await Promise.all')
  const initialProduct = pageLoad.indexOf('product.value = ssr.ssrProduct')
  const initialReviews = pageLoad.indexOf('consumeInitialPublicReviews')
  assert.ok(initialProduct >= 0 && initialProduct < firstAwait, 'SSR product must render before support requests settle')
  assert.ok(initialReviews >= 0 && initialReviews < firstAwait, 'matching SSR reviews must render before support requests settle')

  const combined = `${detail}\n${component}`
  assert.doesNotMatch(combined, /'5\.0'|'89'|Verified Buyer|Excellent quality and service/)
  assert.doesNotMatch(combined, /Math\.random\(\)/)
})

test('SSR reads one localized first page and reuses it for HTML, state and shared schema', () => {
  const source = readIfPresent(serverUrl)
  assert.match(source, /import \{\s*productReviewStore\s*\} from ['"]\.\/routes\/product-reviews\.js['"]/)
  assert.match(source, /import \{ buildReviewSchemaParts \} from ['"]\.\.\/shared\/productReviewSeo\.js['"]/)
  assert.match(source, /productReviewStore\.listPublic\(\{\s*productId:\s*product\.id,\s*lang,\s*page:\s*1,\s*limit:\s*10\s*\}\)/s)
  assert.match(source, /buildReviewSchemaParts\(publicReviews\)/)
  assert.match(source, /renderPublicReviewsHtml\(publicReviews/)
  assert.match(source, /ssrProductReviews:\s*req\.ssrProductReviews/)
  assert.match(source, /ssrProductReviewsProductId:/)
  assert.match(source, /ssrProductReviewsLang:/)
})

test('SSR review rendering escapes every user-controlled review field and has an isolated fallback', () => {
  const source = readIfPresent(serverUrl)
  const renderStart = source.indexOf('function renderPublicReviewsHtml')
  const renderEnd = source.indexOf('\n      // Helper:', renderStart + 1)
  const renderBlock = source.slice(renderStart, renderEnd > renderStart ? renderEnd : renderStart + 5000)
  assert.ok(renderStart >= 0, 'SSR review renderer must exist')
  for (const field of ['author_name', 'review_title', 'review_date', 'review_text', 'incentive_disclosure']) {
    assert.match(renderBlock, new RegExp(`esc\\(review\\.${field}\\)`), `${field} must pass through esc()`)
  }
  assert.doesNotMatch(renderBlock, /\$\{review\.(?:author_name|review_title|review_date|review_text|incentive_disclosure)\}/)

  const listCall = source.indexOf('productReviewStore.listPublic')
  const productSchema = source.indexOf('const productSchema', listCall)
  const reviewLoadBlock = source.slice(Math.max(0, listCall - 500), productSchema)
  assert.match(reviewLoadBlock, /try\s*\{/)
  assert.match(reviewLoadBlock, /catch\s*\(error\)/)
  assert.match(reviewLoadBlock, /reviews:\s*\[\]/)
  assert.match(reviewLoadBlock, /ratingValue:\s*0/)
  assert.match(reviewLoadBlock, /reviewCount:\s*0/)
})
