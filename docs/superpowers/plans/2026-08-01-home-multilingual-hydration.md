# 主页多语言首屏数据修复实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让所有已启用语言的主页在直接刷新和站内切换语言时，都正确显示数据库翻译，同时保留现有服务端首屏注入性能。

**Architecture:** 新增一个可独立测试的服务端主页状态构建函数，集中查询 Hero、页面文字、推荐产品和分类，并使用当前语言的翻译映射写入动态语言字段。`server/index.js` 使用该函数生成 `window.__INITIAL_STATE__`；`Home.vue` 在语言变化时并行刷新全部语言相关数据。

**Tech Stack:** Node.js 20、Express、Vue 3 Composition API、SQLite/better-sqlite3、Node.js Test Runner、Vite。

## 全局约束

- 支持所有已启用语言代码，不硬编码中文逻辑。
- 英语继续使用现有英文字段，不要求翻译映射。
- 翻译缺失时保留现有基础字段回退，不生成空内容。
- 保留服务端首屏注入、产品可见性过滤和分类树剪枝。
- 不修改数据库结构、后台翻译流程或主页视觉样式。
- 所有生产代码修改必须先有能够复现问题的失败测试。

---

### 任务 1：构建语言感知的主页首屏状态

**Files:**
- Create: `server/services/homeInitialState.js`
- Create: `test/homeMultilingualState.test.js`
- Modify: `server/index.js:13-22,1295-1317`

**Interfaces:**
- Consumes: `buildPublicCategoryTree(categories, productCounts)`、`getVisibleCategoryIds(categories)`、`visibleProductWhere(alias, ids)` 和现有 `translateHero()`、`translatePageTexts()`、`translateProduct()`、`translateCategory()`。
- Produces: `buildHomeInitialState({ readOne, readAll, lang, translationMap }) -> { hero, pageTexts, featuredProducts, categories }`。

- [ ] **Step 1: 写服务端失败测试**

创建 `test/homeMultilingualState.test.js`，使用真实翻译辅助函数和内存中的数据库读取替身，覆盖中文、另一种非英语语言、英语以及缺失字段回退：

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { buildHomeInitialState } from '../server/services/homeInitialState.js'

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
    { id: 1, parent_id: 0, is_enabled: 1, name: 'Base category', name_en: 'English category' }
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
      if (sql.includes('FROM categories ORDER BY')) return structuredClone(baseRows.categories)
      if (sql.includes('COUNT(*) as count')) return [{ category_id: 1, count: 1 }]
      if (sql.includes('FROM products p')) return structuredClone(baseRows.products)
      return []
    }
  }
}

function buildFor(lang, translationMap) {
  return buildHomeInitialState({ ...createReaders(), lang, translationMap })
}

test('injects database translations into every home content group for any non-English language', () => {
  for (const [lang, words] of Object.entries({
    zh: { title: '中文标题', subtitle: '中文副标题', category: '中文分类', product: '中文产品' },
    es: { title: 'Título', subtitle: 'Subtítulo', category: 'Categoría', product: 'Producto' }
  })) {
    const state = buildFor(lang, {
      hero_1: { title: words.title },
      page_text_1: { categories_subtitle: words.subtitle },
      category_1: { name: words.category },
      product_10: { name: words.product }
    })

    assert.equal(state.hero[`title_${lang}`], words.title)
    assert.equal(state.pageTexts[`categories_subtitle_${lang}`], words.subtitle)
    assert.equal(state.categories[0][`name_${lang}`], words.category)
    assert.equal(state.featuredProducts[0][`name_${lang}`], words.product)
    assert.equal(state.featuredProducts[0][`category_name_${lang}`], words.category)
  }
})

test('keeps English source fields unchanged without a translation map', () => {
  const state = buildFor('en', null)
  assert.equal(state.hero.title_en, 'English title')
  assert.equal(state.categories[0].name_en, 'English category')
  assert.equal(state.featuredProducts[0].name_en, 'English product')
})

test('missing translated fields preserve source content instead of creating empty values', () => {
  const state = buildFor('fr', { hero_1: { title: 'Titre' } })
  assert.equal(state.hero.title_fr, 'Titre')
  assert.equal(state.hero.subtitle_fr, undefined)
  assert.equal(state.hero.subtitle, 'Base subtitle')
  assert.equal(state.categories[0].name, 'Base category')
})

test('server initial state is built through the language-aware home service', () => {
  const serverSource = fs.readFileSync(new URL('../server/index.js', import.meta.url), 'utf8')
  assert.match(serverSource, /buildHomeInitialState\(\{[\s\S]*?lang,[\s\S]*?translationMap:\s*tMap/)
  assert.doesNotMatch(serverSource, /hero:\s*getOne\('SELECT \* FROM hero_content/)
})
```

- [ ] **Step 2: 运行测试并确认正确失败**

Run: `node --test test/homeMultilingualState.test.js`

Expected: FAIL，原因是 `server/services/homeInitialState.js` 尚不存在或 `buildHomeInitialState` 尚未导出。

- [ ] **Step 3: 实现最小服务端构建函数**

创建 `server/services/homeInitialState.js`：

```js
import {
  buildPublicCategoryTree,
  getVisibleCategoryIds,
  visibleProductWhere
} from './catalogVisibility.js'
import {
  translateCategory,
  translateHero,
  translatePageTexts,
  translateProduct
} from '../helpers/translate.js'

function translateCategoryTree(nodes, translationMap, lang) {
  for (const node of nodes) {
    translateCategory(node, translationMap, lang)
    translateCategoryTree(node.children || [], translationMap, lang)
  }
}

export function buildHomeInitialState({
  readOne,
  readAll,
  lang = 'en',
  translationMap = null
}) {
  const hero = readOne('SELECT * FROM hero_content WHERE id = 1') || {}
  const pageTexts = readOne('SELECT * FROM page_texts WHERE id = 1') || {}
  let featuredProducts = []
  let categories = []

  try {
    const rawCategories = readAll('SELECT * FROM categories ORDER BY sort_order, id') || []
    const visibleCategoryIds = getVisibleCategoryIds(rawCategories)
    const visibility = visibleProductWhere('p', visibleCategoryIds)
    featuredProducts = readAll(
      `SELECT p.id, p.name, p.name_en, p.slug, p.category_id, p.images, p.description, p.description_en, p.is_featured, p.status, p.sort_order, c.name as category_name, c.name_en as category_name_en FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_featured = 1 AND p.status = 1${visibility.clause} ORDER BY p.sort_order DESC, p.id DESC LIMIT 12`,
      visibility.params
    ) || []
    const counts = readAll(
      'SELECT category_id, COUNT(*) as count FROM products WHERE status = 1 GROUP BY category_id'
    ) || []
    const countMap = new Map(counts.map(row => [row.category_id, row.count]))
    categories = buildPublicCategoryTree(rawCategories, countMap).slice(0, 6)
  } catch {
    featuredProducts = []
    categories = []
  }

  if (lang !== 'en' && translationMap) {
    translateHero(hero, translationMap, lang)
    translatePageTexts(pageTexts, translationMap, lang)
    featuredProducts.forEach(product => translateProduct(product, translationMap, lang))
    translateCategoryTree(categories, translationMap, lang)
  }

  return { hero, pageTexts, featuredProducts, categories }
}
```

在 `server/index.js` 导入 `buildHomeInitialState`，删除内联 `ssrFeaturedProducts`/`ssrCategories` 查询，并改为：

```js
const homeInitialState = buildHomeInitialState({
  readOne: getOne,
  readAll: getAll,
  lang,
  translationMap: tMap
})

const initialState = {
  hero: homeInitialState.hero,
  company: lightweightCompany,
  pageTexts: homeInitialState.pageTexts,
  // existing fields remain unchanged
  featuredProducts: homeInitialState.featuredProducts,
  categories: homeInitialState.categories
}
```

- [ ] **Step 4: 运行目标测试并确认通过**

Run: `node --test test/homeMultilingualState.test.js`

Expected: 4 tests PASS，0 FAIL。

- [ ] **Step 5: 检查服务端语法并提交**

Run: `node --check server/services/homeInitialState.js`

Run: `node --check server/index.js`

Expected: 两条命令均以退出码 0 完成。

Commit:

```bash
git add server/services/homeInitialState.js server/index.js test/homeMultilingualState.test.js
git commit -m "fix: translate multilingual home initial state"
```

---

### 任务 2：切换语言时刷新全部主页数据

**Files:**
- Modify: `test/homeMultilingualState.test.js`
- Modify: `src/views/Home.vue:338-371`

**Interfaces:**
- Consumes: `api.getHero()`、`api.getProducts({ featured: '1', limit: 12 })`、`api.getCategoryTree()`、`api.getPageTexts()`、`api.getCompany()`。
- Produces: `refreshLocalizedPageData()`，成功时一次更新五组主页状态；失败时保留当前状态并记录错误。

- [ ] **Step 1: 增加前端语言切换失败测试**

在 `test/homeMultilingualState.test.js` 追加：

```js
test('home language watcher refreshes every language-sensitive data source', () => {
  const homeSource = fs.readFileSync(new URL('../src/views/Home.vue', import.meta.url), 'utf8')
  const refreshBody = homeSource.match(/async function refreshLocalizedPageData\(\)\s*\{([\s\S]*?)\n\}/)?.[1] || ''

  assert.match(refreshBody, /api\.getHero\(\)/)
  assert.match(refreshBody, /api\.getProducts\(\{\s*featured:\s*'1',\s*limit:\s*12\s*\}\)/)
  assert.match(refreshBody, /api\.getCategoryTree\(\)/)
  assert.match(refreshBody, /api\.getPageTexts\(\)/)
  assert.match(refreshBody, /api\.getCompany\(\)/)
  assert.match(homeSource, /watch\(lang,\s*refreshLocalizedPageData\)/)
})
```

- [ ] **Step 2: 运行测试并确认因旧监听器而失败**

Run: `node --test test/homeMultilingualState.test.js`

Expected: 新测试 FAIL，因为当前 `watch(lang, ...)` 只调用 `api.getHero()`。

- [ ] **Step 3: 实现统一语言刷新函数**

在 `src/views/Home.vue` 保留首次加载的条件逻辑，并把现有 Hero 专用监听替换为：

```js
async function refreshLocalizedPageData() {
  try {
    const [
      heroResult,
      productsResult,
      categoryTree,
      pageTextResult,
      companyResult
    ] = await Promise.all([
      api.getHero(),
      api.getProducts({ featured: '1', limit: 12 }),
      api.getCategoryTree(),
      api.getPageTexts(),
      api.getCompany()
    ])

    hero.value = heroResult
    featuredProducts.value = productsResult.data || []
    categories.value = (categoryTree || []).slice(0, 6)
    pageTexts.value = pageTextResult || {}
    company.value = companyResult || {}
  } catch (error) {
    console.error('Failed to refresh localized home data', error)
  }
}

watch(lang, refreshLocalizedPageData)
```

- [ ] **Step 4: 运行目标测试并确认通过**

Run: `node --test test/homeMultilingualState.test.js`

Expected: 5 tests PASS，0 FAIL。

- [ ] **Step 5: 构建前端并提交**

Run: `npm run build`

Expected: Vite 构建成功；允许保留项目已有的 chunk-size 警告，不允许出现编译错误。

Commit:

```bash
git add src/views/Home.vue test/homeMultilingualState.test.js
git commit -m "fix: refresh all localized home content"
```

---

### 任务 3：完整回归与多语言交付验证

**Files:**
- Verify: `server/services/homeInitialState.js`
- Verify: `server/index.js`
- Verify: `src/views/Home.vue`
- Verify: `test/homeMultilingualState.test.js`

**Interfaces:**
- Consumes: 任务 1 的语言感知首屏状态和任务 2 的统一语言刷新函数。
- Produces: 可安全部署的 Git 提交和远端 `main` 一致性证明。

- [ ] **Step 1: 运行完整自动化测试**

Run: `npm test`

Expected: 全部测试 PASS，0 FAIL。

- [ ] **Step 2: 运行生产构建与差异检查**

Run: `npm run build`

Run: `git diff --check`

Expected: 构建成功；`git diff --check` 无输出。

- [ ] **Step 3: 验证至少三种语言的数据契约**

Run: `node --test test/homeMultilingualState.test.js`

Expected: 中文和西班牙语均写入各自动态字段，英语保持原字段，缺失翻译不会产生空值，前端监听覆盖五组数据。

- [ ] **Step 4: 审查最终提交范围**

Run: `git status --short`

Run: `git log -5 --oneline`

Run: `git show --check --stat --oneline HEAD`

Expected: 工作区干净；提交只包含设计、计划、主页多语言服务、主页调用与回归测试。

- [ ] **Step 5: 推送并核对 GitHub main**

Run: `git push origin main`

Run:

```powershell
$localSha = git rev-parse HEAD
$remoteSha = (git ls-remote origin refs/heads/main -split "`t")[0]
if ($localSha -ne $remoteSha) { throw 'Remote main does not match local HEAD.' }
```

Expected: `origin/main` 与本地 `HEAD` 完全一致。
