import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

import {
  PRIMARY_CONTENT_LANGS,
  SECONDARY_INDEX_LANGS,
  getRouteIndexableLangs,
  indexableLangs
} from '../server/services/indexingPolicy.js'
import {
  SEO_PAGE_KEYS,
  SUPPORTED_SEO_LANGS,
  getBuiltInSeoCopyRows,
  getSeoCopy,
  getStaticPageCopy,
  getHomeLabels
} from '../server/services/seoContent.js'
import { resolveUiText } from '../server/services/uiText.js'
import {
  findMissingKeys,
  findMissingSeoCopyRows,
  getRequiredUiTextKeys
} from '../server/services/languageSeoReadiness.js'

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

test('UI text lookup resolves the futures translation group as well as ui_text', () => {
  const map = {
    ui_text_static: { about: 'À propos de nous' },
    futures_static: { futuresTitle: 'Prix des futures en temps réel' }
  }
  assert.equal(resolveUiText(map, 'futuresTitle', 'Live Futures Prices'), 'Prix des futures en temps réel')
  assert.equal(resolveUiText(map, 'about', 'About Us'), 'À propos de nous')
  assert.equal(resolveUiText(map, 'missing', 'Fallback'), 'Fallback')
  assert.equal(resolveUiText(null, 'futuresTitle', 'Fallback'), 'Fallback')
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

test('database-backed ready languages drive route indexing', () => {
  const ready = getRouteIndexableLangs('home', ['fr', 'de'])
  for (const code of ['en', 'zh', 'fr', 'de']) assert.ok(ready.has(code))

  const notReady = getRouteIndexableLangs('home', [])
  assert.ok(notReady.has('en'))
  assert.ok(notReady.has('zh'))
  assert.ok(!notReady.has('fr'))

  const filtered = indexableLangs(
    [{ code: 'en' }, { code: 'fr' }, { code: 'de' }],
    ready
  )
  assert.deepEqual(filtered.map(l => l.code), ['en', 'fr', 'de'])
})

test('database SEO copy overrides replace built-in titles and descriptions', () => {
  const listing = getSeoCopy('fr', { products: { title: 'Custom title', desc: 'Custom desc' } })
  assert.equal(listing.products.title, 'Custom title')
  assert.equal(listing.products.desc, 'Custom desc')

  const staticPage = getStaticPageCopy('fr', { about: { title: 'Custom about', description: 'Custom about desc' } })
  assert.equal(staticPage.about.title, 'Custom about')
  assert.equal(staticPage.about.desc, 'Custom about desc')
})

test('built-in SEO copy covers every managed page except home', () => {
  const expectedKeys = SEO_PAGE_KEYS.filter(key => key !== 'home').sort()
  for (const code of SUPPORTED_SEO_LANGS) {
    const rows = getBuiltInSeoCopyRows(code)
    assert.deepEqual(rows.map(row => row.page_key).sort(), expectedKeys)
    for (const row of rows) {
      assert.ok(row.title, `${code} ${row.page_key} title missing`)
      assert.ok(row.description, `${code} ${row.page_key} description missing`)
    }
  }
})

test('readiness helpers report missing SEO pages and UI keys', () => {
  assert.deepEqual(
    findMissingSeoCopyRows([{ page_key: 'about', title: 'A', description: 'B' }], ['about', 'contact']),
    ['contact']
  )
  assert.deepEqual(findMissingKeys([{ content_field: 'a' }], ['a', 'b']), ['b'])
})

test('new languages use UI translations for homepage labels', () => {
  const labels = getHomeLabels('de', {
    homeCategories: 'Hauptkategorien',
    homeProducts: 'Hauptprodukte',
    homeQuickLinks: 'Schnellzugriff',
    homeFaq: 'Häufige Fragen',
    allProducts: 'Alle Produkte',
    news: 'Nachrichten',
    contactUs: 'Kontakt',
    about: 'Über uns'
  })
  assert.equal(labels.categories, 'Hauptkategorien')
  assert.equal(labels.products, 'Hauptprodukte')
  assert.equal(labels.quickLinks, 'Schnellzugriff')
  assert.equal(labels.faq, 'Häufige Fragen')
})

test('built-in languages do not require the new home UI keys, new languages do', () => {
  assert.ok(!getRequiredUiTextKeys('fr').includes('homeCategories'))
  assert.ok(getRequiredUiTextKeys('de').includes('homeCategories'))
  assert.ok(getRequiredUiTextKeys('de').includes('homeFaq'))
})

test('translation pipeline registers the SEO copy scope and persistence path', () => {
  const source = fs.readFileSync(
    new URL('../server/routes/translation.js', import.meta.url),
    'utf8'
  )
  assert.match(source, /language_seo_copy: \(\) => collectLanguageSeoCopy\(\)/)
  assert.match(source, /type === 'language_seo_copy'/)
  assert.match(source, /INSERT INTO language_seo_copy/)
})

test('external API exposes language SEO, readiness, audit and translation endpoints', () => {
  const source = fs.readFileSync(
    new URL('../server/routes/external-api.js', import.meta.url),
    'utf8'
  )
  for (const path of [
    "'/languages'",
    "'/languages/:code/seo-copy'",
    "'/languages/:code/seo-copy/generate'",
    "'/languages/:code/seo-ready'",
    "'/seo/audit'",
    "'/seo/audit/live'",
    "'/translations/scopes'",
    "router.post('/translations'"
  ]) {
    assert.ok(source.includes(path), `${path} missing from external API`)
  }
})
