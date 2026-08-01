import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const homeStateModule = await import('../server/services/homeInitialState.js')
  .catch(() => null)
const buildHomeInitialState = homeStateModule?.buildHomeInitialState
const homeClientStateModule = await import('../src/utils/homeInitialState.js')
  .catch(() => null)
const canReuseHomeInitialState = homeClientStateModule?.canReuseHomeInitialState
const createLatestOnlyCommit = homeClientStateModule?.createLatestOnlyCommit
const normalizeLocalizedRefreshResults =
  homeClientStateModule?.normalizeLocalizedRefreshResults

function completeInitialState(lang) {
  return {
    lang,
    hero: { id: 1 },
    featuredProducts: [],
    categories: [],
    pageTexts: { id: 1 },
    company: { id: 1 }
  }
}

const baseRows = {
  hero: {
    id: 1,
    title: 'Base title',
    title_en: 'English title',
    subtitle: 'Base subtitle',
    subtitle_en: 'English subtitle',
    stat1_label: 'Production Lines',
    stat1_label_en: 'Production Lines'
  },
  pageTexts: {
    id: 1,
    categories_subtitle: 'Base category subtitle',
    categories_subtitle_en: 'English category subtitle'
  },
  categories: [
    {
      id: 1,
      parent_id: 0,
      is_enabled: 1,
      name: 'Base category',
      name_en: 'English category'
    }
  ],
  products: [
    {
      id: 10,
      category_id: 1,
      name: 'Base product',
      name_en: 'English product',
      category_name: 'Base category',
      category_name_en: 'English category'
    }
  ]
}

function createReaders() {
  return {
    readOne(sql) {
      if (sql.includes('hero_content')) return structuredClone(baseRows.hero)
      if (sql.includes('page_texts')) return structuredClone(baseRows.pageTexts)
      return null
    },
    readAll(sql) {
      if (sql.includes('FROM categories ORDER BY')) {
        return structuredClone(baseRows.categories)
      }
      if (sql.includes('COUNT(*) as count')) {
        return [{ category_id: 1, count: 1 }]
      }
      if (sql.includes('FROM products p')) {
        return structuredClone(baseRows.products)
      }
      return []
    }
  }
}

function buildFor(lang, translationMap) {
  assert.equal(
    typeof buildHomeInitialState,
    'function',
    'buildHomeInitialState must be implemented'
  )
  return buildHomeInitialState({
    ...createReaders(),
    lang,
    translationMap
  })
}

test('injects database translations into every home content group for any non-English language', () => {
  for (const [lang, words] of Object.entries({
    zh: {
      title: 'Chinese title',
      subtitle: 'Chinese subtitle',
      category: 'Chinese category',
      product: 'Chinese product'
    },
    es: {
      title: 'Spanish title',
      subtitle: 'Spanish subtitle',
      category: 'Spanish category',
      product: 'Spanish product'
    }
  })) {
    const state = buildFor(lang, {
      hero_1: { title: words.title },
      page_text_1: { categories_subtitle: words.subtitle },
      category_1: { name: words.category },
      product_10: { name: words.product }
    })

    assert.equal(state.hero[`title_${lang}`], words.title)
    assert.equal(
      state.pageTexts[`categories_subtitle_${lang}`],
      words.subtitle
    )
    assert.equal(state.categories[0][`name_${lang}`], words.category)
    assert.equal(
      state.featuredProducts[0][`name_${lang}`],
      words.product
    )
    assert.equal(
      state.featuredProducts[0][`category_name_${lang}`],
      words.category
    )
  }
})

test('keeps English source fields unchanged without a translation map', () => {
  const state = buildFor('en', null)
  assert.equal(state.hero.title_en, 'English title')
  assert.equal(state.categories[0].name_en, 'English category')
  assert.equal(state.featuredProducts[0].name_en, 'English product')
})

test('missing translated fields preserve source content instead of creating empty values', () => {
  const state = buildFor('fr', { hero_1: { title: 'French title' } })
  assert.equal(state.hero.title_fr, 'French title')
  assert.equal(state.hero.subtitle_fr, undefined)
  assert.equal(state.hero.subtitle, 'Base subtitle')
  assert.equal(state.categories[0].name, 'Base category')
})

test('server initial state is built through the language-aware home service', () => {
  const serverSource = fs.readFileSync(
    new URL('../server/index.js', import.meta.url),
    'utf8'
  )

  assert.match(
    serverSource,
    /buildHomeInitialState\(\{[\s\S]*?lang,[\s\S]*?translationMap:\s*tMap/
  )
  assert.doesNotMatch(
    serverSource,
    /hero:\s*getOne\('SELECT \* FROM hero_content/
  )
  assert.match(
    serverSource,
    /const initialState = \{[\s\S]*?\blang,/
  )
})

test('reuses initial homepage state when its language matches the current language', () => {
  assert.equal(
    typeof canReuseHomeInitialState,
    'function',
    'canReuseHomeInitialState must be implemented'
  )

  for (const lang of ['hi', 'zh']) {
    assert.equal(canReuseHomeInitialState(completeInitialState(lang), lang), true)
  }
})

test('does not reuse initial homepage state with a different or missing language', () => {
  assert.equal(
    typeof canReuseHomeInitialState,
    'function',
    'canReuseHomeInitialState must be implemented'
  )

  assert.equal(canReuseHomeInitialState(completeInitialState('en'), 'hi'), false)
  assert.equal(canReuseHomeInitialState({}, 'zh'), false)
  assert.equal(canReuseHomeInitialState(null, 'zh'), false)
})

test('does not reuse matching-language initial homepage state when any group is missing', () => {
  assert.equal(
    typeof canReuseHomeInitialState,
    'function',
    'canReuseHomeInitialState must be implemented'
  )

  for (const group of ['hero', 'featuredProducts', 'categories', 'pageTexts', 'company']) {
    const initialState = completeInitialState('zh')
    delete initialState[group]
    assert.equal(canReuseHomeInitialState(initialState, 'zh'), false, group)
  }
})

test('allows only the most recent homepage language refresh to commit', () => {
  assert.equal(
    typeof createLatestOnlyCommit,
    'function',
    'createLatestOnlyCommit must be implemented'
  )

  const commit = createLatestOnlyCommit()
  const firstRefresh = commit.begin()
  const latestRefresh = commit.begin()

  assert.equal(commit.isLatest(firstRefresh), false)
  assert.equal(commit.isLatest(latestRefresh), true)
})

test('normalizes each localized refresh group independently with safe empty fallbacks', () => {
  assert.equal(
    typeof normalizeLocalizedRefreshResults,
    'function',
    'normalizeLocalizedRefreshResults must be implemented'
  )

  const data = normalizeLocalizedRefreshResults([
    { status: 'fulfilled', value: { id: 'hero' } },
    { status: 'rejected', reason: new Error('products unavailable') },
    { status: 'fulfilled', value: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }, { id: 7 }] },
    { status: 'fulfilled', value: { id: 'texts' } },
    { status: 'rejected', reason: new Error('company unavailable') }
  ])

  assert.deepEqual(data.hero, { id: 'hero' })
  assert.deepEqual(data.featuredProducts, [])
  assert.deepEqual(data.categories, [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }])
  assert.deepEqual(data.pageTexts, { id: 'texts' })
  assert.deepEqual(data.company, {})
  assert.equal(data.errors.length, 2)
})

test('home language watcher refreshes every language-sensitive data source', () => {
  const homeSource = fs.readFileSync(
    new URL('../src/views/Home.vue', import.meta.url),
    'utf8'
  )
  const refreshBody = homeSource.match(
    /async function refreshLocalizedPageData\(\)\s*\{([\s\S]*?)\n\}/
  )?.[1] || ''

  assert.match(refreshBody, /clearLocalizedPageData\(\)/)
  assert.match(refreshBody, /Promise\.allSettled\(\[/)
  assert.match(refreshBody, /normalizeLocalizedRefreshResults\(results\)/)
  assert.match(refreshBody, /api\.getHero\(\)/)
  assert.match(
    refreshBody,
    /api\.getProducts\(\{\s*featured:\s*'1',\s*limit:\s*12\s*\}\)/
  )
  assert.match(refreshBody, /api\.getCategoryTree\(\)/)
  assert.match(refreshBody, /api\.getPageTexts\(\)/)
  assert.match(refreshBody, /api\.getCompany\(\)/)
  assert.match(homeSource, /watch\(lang,\s*refreshLocalizedPageData\)/)
  assert.match(
    homeSource,
    /canReuseHomeInitialState\(initialState,\s*lang\.value\)/
  )
  assert.match(homeSource, /refreshCommit\.begin\(\)/)
  assert.match(
    refreshBody,
    /if \(!refreshCommit\.isLatest\(refreshVersion\)\) return/
  )
})
