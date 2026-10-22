import test from 'node:test'
import assert from 'node:assert/strict'

import {
  classifyLivePage,
  inspectLiveHtml,
  languageOfUrl,
  normalizeType
} from '../server/services/liveSeoAudit.js'

const URL_FR_ABOUT = 'https://www.sunseasteel.com/fr/about'

const goodHtml = `<!doctype html>
<html lang="fr">
<head>
  <title>À propos de SUNSEA STEEL | Fabricant de bobines d'acier</title>
  <meta name="description" content="Découvrez SUNSEA STEEL, fabricant et exportateur de bobines d'acier GI, GL, PPGI, PPGL et CRC basé au Shandong, en Chine.">
  <link rel="canonical" href="${URL_FR_ABOUT}">
  <link rel="alternate" hreflang="fr" href="${URL_FR_ABOUT}">
  <link rel="alternate" hreflang="en" href="https://www.sunseasteel.com/en/about">
  <link rel="alternate" hreflang="x-default" href="https://www.sunseasteel.com/en/about">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"AboutPage"}</script>
</head>
<body>
  <main><h1>À propos de nous</h1><p>${'Contenu localisé '.repeat(10)}</p></main>
</body>
</html>`

test('classifies every public page template and language', () => {
  assert.equal(classifyLivePage('https://www.sunseasteel.com/fr'), 'home')
  assert.equal(classifyLivePage('https://www.sunseasteel.com/fr/products'), 'productsList')
  assert.equal(classifyLivePage('https://www.sunseasteel.com/fr/products/category/gi'), 'productCategory')
  assert.equal(classifyLivePage('https://www.sunseasteel.com/fr/products/gi-coil'), 'productDetail')
  assert.equal(classifyLivePage('https://www.sunseasteel.com/fr/news'), 'newsList')
  assert.equal(classifyLivePage('https://www.sunseasteel.com/fr/news/category/cases'), 'newsCategory')
  assert.equal(classifyLivePage('https://www.sunseasteel.com/fr/news/ral-colors'), 'ralColors')
  assert.equal(classifyLivePage('https://www.sunseasteel.com/fr/news/roofing-profiles'), 'roofingProfiles')
  assert.equal(classifyLivePage('https://www.sunseasteel.com/fr/news/futures-price'), 'futuresPrice')
  assert.equal(classifyLivePage('https://www.sunseasteel.com/fr/news/gi-guide'), 'newsDetail')
  assert.equal(languageOfUrl('https://www.sunseasteel.com/fr/about'), 'fr')
  assert.equal(languageOfUrl('https://www.sunseasteel.com/france/about'), 'en')
})

test('normalizes public audit type aliases', () => {
  assert.equal(normalizeType('products'), 'productsList')
  assert.equal(normalizeType('product-detail'), 'productDetail')
  assert.equal(normalizeType('futures-price'), 'futuresPrice')
  assert.equal(normalizeType('unknown-type'), null)
})

test('accepts a complete localized page', () => {
  const page = inspectLiveHtml({
    url: URL_FR_ABOUT,
    status: 200,
    headers: {},
    html: goodHtml,
    expectedStaticLangs: ['en', 'fr']
  })
  assert.deepEqual(page.issues, [])
  assert.equal(page.lang, 'fr')
  assert.equal(page.type, 'about')
  assert.equal(page.hreflangCount, 3)
  assert.ok(page.visibleChars > 50)
})

test('reports noindex, missing metadata, canonical mismatch and language mismatch', () => {
  const page = inspectLiveHtml({
    url: URL_FR_ABOUT,
    status: 200,
    headers: { 'x-robots-tag': 'noindex, follow' },
    html: '<html lang="en"><head><link rel="canonical" href="https://www.sunseasteel.com/en/about"></head><body></body></html>',
    expectedStaticLangs: ['en', 'fr']
  })
  const codes = page.issues.map(issue => issue.code)
  assert.ok(codes.includes('noindex-in-sitemap'))
  assert.ok(codes.includes('title-missing'))
  assert.ok(codes.includes('meta-description-missing'))
  assert.ok(codes.includes('canonical-mismatch'))
  assert.ok(codes.includes('h1-missing'))
  assert.ok(codes.includes('hreflang-missing'))
  assert.ok(codes.includes('html-lang-mismatch'))
})

test('warns when static hreflang coverage is incomplete', () => {
  const page = inspectLiveHtml({
    url: URL_FR_ABOUT,
    status: 200,
    headers: {},
    html: goodHtml,
    expectedStaticLangs: ['en', 'fr', 'es', 'ar']
  })
  assert.ok(page.issues.some(issue => issue.code === 'hreflang-incomplete' && issue.severity === 'warning'))
})
