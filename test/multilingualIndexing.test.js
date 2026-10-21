import test from 'node:test'
import assert from 'node:assert/strict'

import {
  PRIMARY_CONTENT_LANGS,
  SECONDARY_INDEX_LANGS,
  getRouteIndexableLangs,
  indexableLangs
} from '../server/services/indexingPolicy.js'
import { getSeoCopy, getStaticPageCopy, getHomeLabels } from '../server/services/seoContent.js'

const ALL_LANGS = ['en', 'zh', 'ru', 'fr', 'es', 'ar', 'hi', 'th', 'tr', 'pt']
const ROUTE_TYPES = [
  'home',
  'productsList',
  'newsList',
  'productCategory',
  'newsCategory',
  'about',
  'contact',
  'factory',
  'staticNews'
]

test('all enabled secondary languages are route-indexable', () => {
  for (const code of ALL_LANGS) {
    assert.ok(
      PRIMARY_CONTENT_LANGS.includes(code) || SECONDARY_INDEX_LANGS.includes(code),
      `${code} is neither primary nor secondary indexable`
    )
  }

  for (const routeType of ROUTE_TYPES) {
    const langs = getRouteIndexableLangs(routeType)
    for (const code of ALL_LANGS) {
      assert.ok(langs.has(code), `${routeType} must include ${code}`)
    }
  }
})

test('indexableLangs keeps only languages that are currently enabled', () => {
  const filtered = indexableLangs(
    [{ code: 'en' }, { code: 'fr' }, { code: 'de' }],
    getRouteIndexableLangs('home')
  )
  assert.deepEqual(filtered.map(l => l.code), ['en', 'fr'])
})

test('listing page copy is localized for every supported language', () => {
  const en = getSeoCopy('en')
  for (const code of ALL_LANGS) {
    const copy = getSeoCopy(code)
    for (const page of ['products', 'news', 'productCategory', 'newsCategory']) {
      assert.ok(copy[page].title, `${code} ${page} title missing`)
      assert.ok(copy[page].desc, `${code} ${page} desc missing`)
    }
    if (code !== 'en') {
      assert.notEqual(copy.products.h1, en.products.h1, `${code} products h1 is not localized`)
      assert.notEqual(copy.news.h1, en.news.h1, `${code} news h1 is not localized`)
    }
  }
})

test('static page SEO title and description are localized for every supported language', () => {
  const en = getStaticPageCopy('en')
  const pages = ['about', 'contact', 'factory', 'ralColors', 'roofingProfiles', 'futuresPrice']
  for (const code of ALL_LANGS) {
    const copy = getStaticPageCopy(code)
    for (const page of pages) {
      assert.ok(copy[page].title, `${code} ${page} title missing`)
      assert.ok(copy[page].desc, `${code} ${page} desc missing`)
      if (code !== 'en') {
        assert.notEqual(copy[page].title, en[page].title, `${code} ${page} title is not localized`)
        assert.notEqual(copy[page].desc, en[page].desc, `${code} ${page} desc is not localized`)
      }
    }
  }
})

test('homepage section labels are localized for every supported language', () => {
  const en = getHomeLabels('en')
  for (const code of ALL_LANGS) {
    const labels = getHomeLabels(code)
    assert.ok(labels.categories, `${code} categories label missing`)
    assert.ok(labels.products, `${code} products label missing`)
    assert.ok(labels.quickLinks, `${code} quickLinks label missing`)
    assert.ok(labels.faq, `${code} faq label missing`)
    if (code !== 'en') {
      assert.notEqual(labels.categories, en.categories, `${code} categories label is not localized`)
    }
  }
})
