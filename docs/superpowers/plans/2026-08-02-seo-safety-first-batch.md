# 第一批 SEO 安全修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变产品、新闻、媒体、询价、评价和翻译业务数据的前提下，修复分类站点地图、产品结构化数据、手机版缩略图和旧品牌 AI 说明。

**Architecture:** 分类站点地图把与数据库结构相关的 SQL 提取为可在内存数据库验证的常量；产品 SSR 和客户端同时移除不真实的 `offers`；缩略图使用纯函数计算容器滚动目标；`llms` 默认值和旧默认迁移集中到独立服务，并且只替换精确匹配的历史系统默认文本。每一项均采用 RED-GREEN 测试循环并独立提交。

**Tech Stack:** Node.js 20、Express 4、better-sqlite3、Vue 3 Composition API、Vite 5、Node.js 内置测试运行器。

## Global Constraints

- 不删除、不重建、不清空 `data/database.db`，不修改产品、新闻、媒体、评价及翻译表的数据结构。
- 不改变询价、邮件、WhatsApp、产品展示、评价审核、评价翻译及后台管理功能。
- Product JSON-LD 保留真实公开 `Review` 与 `AggregateRating`，但不得输出虚构价格、运费或退货承诺。
- `llms` 迁移只替换精确匹配的历史 LED Trade 系统默认文本；任何管理员自定义内容必须原样保留。
- 每项生产代码修改前必须先运行新增测试并确认因目标缺陷而失败。
- 每项修复独立提交；完整测试或生产构建失败时停止，不进入下一批优化。

---

### Task 1: 修复分类站点地图的数据库兼容性

**Files:**
- Create: `server/services/sitemapCategoryQueries.js`
- Create: `test/sitemapCategoryQueries.test.js`
- Modify: `server/routes/sitemap.js:1-2, 97, 181, 199`

**Interfaces:**
- Produces: `CATEGORY_INDEX_LASTMOD_QUERY`、`PRODUCT_CATEGORY_SITEMAP_QUERY`、`NEWS_CATEGORY_SITEMAP_QUERY` 三个只读 SQL 字符串。
- Consumes: `server/routes/sitemap.js` 通过 `getOne`/`getAll` 执行上述查询。

- [ ] **Step 1: 写入能够复现当前 SQL 错误的测试**

创建 `test/sitemapCategoryQueries.test.js`：

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import {
  CATEGORY_INDEX_LASTMOD_QUERY,
  PRODUCT_CATEGORY_SITEMAP_QUERY,
  NEWS_CATEGORY_SITEMAP_QUERY
} from '../server/services/sitemapCategoryQueries.js'

function createCategoryDatabase() {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE categories (
      id INTEGER PRIMARY KEY,
      slug TEXT,
      name_en TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE news_categories (
      id INTEGER PRIMARY KEY,
      slug TEXT,
      name_en TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
  db.prepare('INSERT INTO categories (id, slug, name_en, created_at) VALUES (1, ?, ?, ?)')
    .run('steel-coil', 'Steel Coil', '2026-07-20 12:00:00')
  db.prepare('INSERT INTO news_categories (id, slug, name_en, created_at) VALUES (1, ?, ?, ?)')
    .run('guides', 'Guides', '2026-07-21 12:00:00')
  return db
}

test('category sitemap queries work with the deployed created_at-only schemas', () => {
  const db = createCategoryDatabase()
  try {
    assert.equal(db.prepare(CATEGORY_INDEX_LASTMOD_QUERY).get().d, '2026-07-20 12:00:00')
    assert.equal(db.prepare(PRODUCT_CATEGORY_SITEMAP_QUERY).all()[0].lastmod_date, '2026-07-20 12:00:00')
    assert.equal(db.prepare(NEWS_CATEGORY_SITEMAP_QUERY).all()[0].lastmod_date, '2026-07-21 12:00:00')
  } finally {
    db.close()
  }
})

test('category sitemap queries never require an updated_at column', () => {
  for (const query of [
    CATEGORY_INDEX_LASTMOD_QUERY,
    PRODUCT_CATEGORY_SITEMAP_QUERY,
    NEWS_CATEGORY_SITEMAP_QUERY
  ]) {
    assert.doesNotMatch(query, /updated_at/i)
  }
})
```

- [ ] **Step 2: 运行目标测试并确认 RED**

Run:

```powershell
node --test test/sitemapCategoryQueries.test.js
```

Expected: FAIL，错误为无法导入 `server/services/sitemapCategoryQueries.js`。

- [ ] **Step 3: 创建查询常量并接入站点地图路由**

创建 `server/services/sitemapCategoryQueries.js`：

```js
export const CATEGORY_INDEX_LASTMOD_QUERY = `
  SELECT created_at AS d
  FROM categories
  ORDER BY created_at DESC
  LIMIT 1
`

export const PRODUCT_CATEGORY_SITEMAP_QUERY = `
  SELECT id, slug, name_en, created_at AS lastmod_date
  FROM categories
  ORDER BY sort_order, id
`

export const NEWS_CATEGORY_SITEMAP_QUERY = `
  SELECT id, slug, name_en, created_at AS lastmod_date
  FROM news_categories
  ORDER BY sort_order, id
`
```

在 `server/routes/sitemap.js` 导入三个常量，并分别替换第 97、181、199 行的内联查询。产品和新闻内容表原有 `COALESCE(updated_at, created_at)` 保持不变。

- [ ] **Step 4: 运行目标测试并确认 GREEN**

Run:

```powershell
node --test test/sitemapCategoryQueries.test.js
```

Expected: 2 个测试通过，`fail 0`。

- [ ] **Step 5: 检查并提交这一项**

Run:

```powershell
git diff --check
git diff -- server/services/sitemapCategoryQueries.js server/routes/sitemap.js test/sitemapCategoryQueries.test.js
git add server/services/sitemapCategoryQueries.js server/routes/sitemap.js test/sitemapCategoryQueries.test.js
git commit -m "fix: restore category sitemap delivery"
```

Expected: 差异只包含三个只读查询、路由接入和回归测试。

---

### Task 2: 删除不真实的产品 Offer 并保留评价摘要

**Files:**
- Modify: `server/index.js:585-590, 743-798`
- Modify: `src/views/ProductDetail.vue:564-614`
- Modify: `test/detailSeoSafety.test.js`

**Interfaces:**
- Consumes: `buildReviewSchemaParts(publicReviews)` 和 `buildReviewSchemaParts(publicReviews.value)`。
- Produces: 服务端与客户端一致的 `Product` JSON-LD，不含 `offers`，仍可包含真实 `review` 和 `aggregateRating`。

- [ ] **Step 1: 先把结构化数据安全测试改成新的合规要求**

在 `test/detailSeoSafety.test.js` 中读取 `server/index.js` 和 `src/views/ProductDetail.vue`，将现有 `assert.match(productBlock, /offers:/)` 改为：

```js
test('server and client product schemas omit unsupported commercial claims', () => {
  const serverProductBlock = source.slice(
    source.indexOf("'@context': 'https://schema.org', '@type': 'Product'"),
    source.indexOf("jsonLd(productSchema, 'product-jsonld')")
  )
  const clientSource = fs.readFileSync(
    new URL('../src/views/ProductDetail.vue', import.meta.url),
    'utf8'
  )
  const clientProductBlock = clientSource.slice(
    clientSource.indexOf("'@type': 'Product'"),
    clientSource.indexOf('Object.assign(productSchema, buildReviewSchemaParts')
  )

  for (const block of [serverProductBlock, clientProductBlock]) {
    assert.doesNotMatch(block, /\boffers\s*:/)
    assert.doesNotMatch(block, /priceCurrency|priceValidUntil|shippingDetails|hasMerchantReturnPolicy/)
  }

  assert.match(serverProductBlock, /buildReviewSchemaParts\(publicReviews\)/)
  assert.match(clientSource, /buildReviewSchemaParts\(publicReviews\.value\)/)
})
```

保留“不生成或写入合成评价”以及“文章结构化数据不包含评价”的已有测试。

- [ ] **Step 2: 运行测试并确认 RED**

Run:

```powershell
node --test test/detailSeoSafety.test.js
```

Expected: FAIL，失败内容指出服务端和客户端 Product schema 仍包含 `offers` 或价格/运费/退货字段。

- [ ] **Step 3: 做最小实现**

在 `server/index.js` 的 `productSchema` 中删除整个 `offers` 对象，同时删除仅为该对象计算的 `persistentPrice` 局部变量。如果 `generatePersistentPrice` 已无引用，删除该函数。

在 `src/views/ProductDetail.vue` 的 `productSchema` 中删除整个 `offers` 对象。两端都保留：

```js
Object.assign(productSchema, buildReviewSchemaParts(publicReviews))
```

客户端对应保留：

```js
Object.assign(productSchema, buildReviewSchemaParts(publicReviews.value))
```

- [ ] **Step 4: 运行结构化数据相关测试并确认 GREEN**

Run:

```powershell
node --test test/detailSeoSafety.test.js test/productReviewSeo.test.js test/productReviewDelivery.test.js
```

Expected: 所有测试通过，`fail 0`。

- [ ] **Step 5: 检查并提交这一项**

Run:

```powershell
git diff --check
git diff -- server/index.js src/views/ProductDetail.vue test/detailSeoSafety.test.js
git add server/index.js src/views/ProductDetail.vue test/detailSeoSafety.test.js
git commit -m "fix: remove unsupported product offers"
```

Expected: 页面模板和业务按钮没有变化，差异只删除 Product JSON-LD 中不真实的交易字段并更新测试。

---

### Task 3: 修复手机版活动缩略图定位

**Files:**
- Create: `src/utils/thumbnailScroll.js`
- Create: `test/thumbnailScroll.test.js`
- Modify: `src/views/ProductDetail.vue:50-57, 434-466, 1520-1522`
- Modify: `test/productDetailGallery.test.js`

**Interfaces:**
- Produces: `getCenteredThumbnailScrollLeft({ scrollLeft, clientWidth, scrollWidth, itemLeft, itemWidth }): number`。
- Consumes: `ProductDetail.vue` 在活动项超出横向可视区时调用该函数，并通过容器 `scrollTo` 滚动。

- [ ] **Step 1: 为滚动计算写纯函数失败测试**

创建 `test/thumbnailScroll.test.js`：

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { getCenteredThumbnailScrollLeft } from '../src/utils/thumbnailScroll.js'

test('centers an offscreen thumbnail inside the scroll container', () => {
  assert.equal(getCenteredThumbnailScrollLeft({
    scrollLeft: 0,
    clientWidth: 358,
    scrollWidth: 760,
    itemLeft: 456,
    itemWidth: 60
  }), 307)
})

test('clamps the first and last thumbnail to valid scroll bounds', () => {
  assert.equal(getCenteredThumbnailScrollLeft({
    scrollLeft: 100,
    clientWidth: 358,
    scrollWidth: 760,
    itemLeft: -100,
    itemWidth: 60
  }), 0)
  assert.equal(getCenteredThumbnailScrollLeft({
    scrollLeft: 350,
    clientWidth: 358,
    scrollWidth: 760,
    itemLeft: 350,
    itemWidth: 60
  }), 402)
})
```

- [ ] **Step 2: 扩展组件回归测试并确认 RED**

把 `test/productDetailGallery.test.js` 中依赖 `button.scrollIntoView` 的断言替换为：

```js
assert.match(source, /getCenteredThumbnailScrollLeft/)
assert.match(source, /container\.scrollTo\(\{[\s\S]*?left:[\s\S]*?behavior: 'smooth'/)
assert.doesNotMatch(source, /button\.scrollIntoView/)
assert.match(source, /@media \(max-width: 640px\)[\s\S]*?\.thumbnails\s*\{[\s\S]*?justify-content: flex-start/)
```

Run:

```powershell
node --test test/thumbnailScroll.test.js test/productDetailGallery.test.js
```

Expected: FAIL，纯函数文件不存在，现有组件仍使用 `scrollIntoView` 和手机端居中布局。

- [ ] **Step 3: 实现滚动计算纯函数**

创建 `src/utils/thumbnailScroll.js`：

```js
export function getCenteredThumbnailScrollLeft({
  scrollLeft,
  clientWidth,
  scrollWidth,
  itemLeft,
  itemWidth
}) {
  const maxScrollLeft = Math.max(0, scrollWidth - clientWidth)
  const target = scrollLeft + itemLeft - ((clientWidth - itemWidth) / 2)
  return Math.min(maxScrollLeft, Math.max(0, Math.round(target)))
}
```

- [ ] **Step 4: 在产品组件中接入容器级滚动**

导入 `getCenteredThumbnailScrollLeft`。在 `centerActiveThumbnail` 中保留 `nextTick` 和可视区判断，目标值按以下方式计算：

```js
const left = getCenteredThumbnailScrollLeft({
  scrollLeft: container.scrollLeft,
  clientWidth: container.clientWidth,
  scrollWidth: container.scrollWidth,
  itemLeft: buttonRect.left - containerRect.left,
  itemWidth: buttonRect.width
})

container.scrollTo({ left, behavior: 'smooth' })
```

将手机断点 `.thumbnails` 改为 `justify-content: flex-start`。缩略图按钮增加：

```vue
:aria-current="currentImage === img ? 'true' : undefined"
:aria-label="`${localizedValue(product, 'name')} - ${index + 1}`"
```

- [ ] **Step 5: 运行目标测试并确认 GREEN**

Run:

```powershell
node --test test/thumbnailScroll.test.js test/productDetailGallery.test.js
```

Expected: 纯函数和图库测试全部通过，`fail 0`。

- [ ] **Step 6: 检查并提交这一项**

Run:

```powershell
git diff --check
git diff -- src/utils/thumbnailScroll.js src/views/ProductDetail.vue test/thumbnailScroll.test.js test/productDetailGallery.test.js
git add src/utils/thumbnailScroll.js src/views/ProductDetail.vue test/thumbnailScroll.test.js test/productDetailGallery.test.js
git commit -m "fix: keep mobile thumbnails in view"
```

Expected: 产品图片来源、图片顺序、视频支持和桌面/平板样式未改变。

---

### Task 4: 安全迁移旧品牌 llms 默认内容

**Files:**
- Create: `server/services/seoDefaults.js`
- Create: `test/seoDefaults.test.js`
- Modify: `server/db.js:6-7, 1391-1411`

**Interfaces:**
- Produces: `DEFAULT_LLMS_TXT`、`DEFAULT_LLMS_FULL_TXT`、`migrateLegacyLlmsDefaults(db)`。
- Consumes: `server/db.js` 在创建或发现 `seo_settings` 后调用迁移函数。

- [ ] **Step 1: 写入默认值和迁移保护测试**

创建 `test/seoDefaults.test.js`，使用 `better-sqlite3` 内存数据库创建只含 `id`、`llms_txt`、`llms_full_txt` 的 `seo_settings` 表，测试三种情况：

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import {
  DEFAULT_LLMS_TXT,
  DEFAULT_LLMS_FULL_TXT,
  LEGACY_LLMS_TXT,
  LEGACY_LLMS_FULL_TXT,
  migrateLegacyLlmsDefaults
} from '../server/services/seoDefaults.js'

function databaseWith(txt, full) {
  const db = new Database(':memory:')
  db.exec('CREATE TABLE seo_settings (id INTEGER PRIMARY KEY, llms_txt TEXT, llms_full_txt TEXT)')
  db.prepare('INSERT INTO seo_settings (id, llms_txt, llms_full_txt) VALUES (1, ?, ?)').run(txt, full)
  return db
}

test('SUNSEA defaults contain no legacy LED Trade identity', () => {
  assert.match(DEFAULT_LLMS_TXT, /^# SUNSEA STEEL/)
  assert.match(DEFAULT_LLMS_FULL_TXT, /^# SUNSEA STEEL/)
  assert.doesNotMatch(DEFAULT_LLMS_TXT + DEFAULT_LLMS_FULL_TXT, /LED Trade/i)
})

test('legacy system defaults migrate to SUNSEA defaults', () => {
  const db = databaseWith(LEGACY_LLMS_TXT, LEGACY_LLMS_FULL_TXT)
  try {
    migrateLegacyLlmsDefaults(db)
    const row = db.prepare('SELECT llms_txt, llms_full_txt FROM seo_settings WHERE id = 1').get()
    assert.equal(row.llms_txt, DEFAULT_LLMS_TXT)
    assert.equal(row.llms_full_txt, DEFAULT_LLMS_FULL_TXT)
  } finally {
    db.close()
  }
})

test('administrator custom llms content is preserved byte-for-byte', () => {
  const customTxt = '# Custom AI guide\nDo not replace this text.'
  const customFull = '# Custom full guide\nCompany-approved content.'
  const db = databaseWith(customTxt, customFull)
  try {
    migrateLegacyLlmsDefaults(db)
    const row = db.prepare('SELECT llms_txt, llms_full_txt FROM seo_settings WHERE id = 1').get()
    assert.deepEqual(row, { llms_txt: customTxt, llms_full_txt: customFull })
  } finally {
    db.close()
  }
})
```

- [ ] **Step 2: 运行测试并确认 RED**

Run:

```powershell
node --test test/seoDefaults.test.js
```

Expected: FAIL，错误为无法导入 `server/services/seoDefaults.js`。

- [ ] **Step 3: 实现默认文本与精确迁移**

`server/services/seoDefaults.js` 定义历史默认常量、新的 SUNSEA STEEL 默认文本，并实现：

```js
export function migrateLegacyLlmsDefaults(db) {
  const row = db.prepare('SELECT llms_txt, llms_full_txt FROM seo_settings WHERE id = 1').get()
  if (!row) return { updated: false }

  const nextTxt = !row.llms_txt || row.llms_txt.trim() === LEGACY_LLMS_TXT.trim()
    ? DEFAULT_LLMS_TXT
    : row.llms_txt
  const nextFull = !row.llms_full_txt || row.llms_full_txt.trim() === LEGACY_LLMS_FULL_TXT.trim()
    ? DEFAULT_LLMS_FULL_TXT
    : row.llms_full_txt

  if (nextTxt === row.llms_txt && nextFull === row.llms_full_txt) return { updated: false }
  db.prepare('UPDATE seo_settings SET llms_txt = ?, llms_full_txt = ? WHERE id = 1')
    .run(nextTxt, nextFull)
  return { updated: true }
}
```

新默认文本包括 SUNSEA STEEL 公司名称、镀锌/镀铝锌/彩涂/冷轧钢卷产品范围，以及 `/en/products`、`/en/about`、`/en/factory`、`/en/news`、`/en/contact` 的绝对 HTTPS 链接；不添加未经数据库和公开页面证实的数字或认证。

- [ ] **Step 4: 在数据库初始化中使用统一默认值**

`server/db.js` 导入新服务。空数据库首次写入时使用 `DEFAULT_LLMS_TXT` 与 `DEFAULT_LLMS_FULL_TXT`；已有记录时调用 `migrateLegacyLlmsDefaults(db)`。删除原有重复的 LED Trade 文本和“空值写入旧品牌”的分支。

- [ ] **Step 5: 运行目标测试并确认 GREEN**

Run:

```powershell
node --test test/seoDefaults.test.js
```

Expected: 3 个测试通过，`fail 0`。

- [ ] **Step 6: 检查并提交这一项**

Run:

```powershell
git diff --check
git diff -- server/services/seoDefaults.js server/db.js test/seoDefaults.test.js
git add server/services/seoDefaults.js server/db.js test/seoDefaults.test.js
git commit -m "fix: migrate legacy AI brand defaults"
```

Expected: 迁移只涉及 `seo_settings.id = 1` 的两个 AI 文本字段，测试证明自定义内容不被覆盖。

---

### Task 5: 完整回归、生产构建和交付验证

**Files:**
- Verify: `server/routes/sitemap.js`
- Verify: `server/index.js`
- Verify: `server/db.js`
- Verify: `src/views/ProductDetail.vue`
- Verify: `scripts/verifySeoDelivery.mjs`

**Interfaces:**
- Consumes: 前四项已提交的实现。
- Produces: 可部署的第一批安全修复提交集合与验证记录。

- [ ] **Step 1: 运行完整自动化测试**

Run:

```powershell
npm test
```

Expected: 所有测试通过，`fail 0`。

- [ ] **Step 2: 检查服务端 JavaScript 语法**

Run:

```powershell
$files = Get-ChildItem server -Recurse -File -Include *.js | ForEach-Object { $_.FullName }
foreach ($file in $files) {
  node --check $file
  if ($LASTEXITCODE -ne 0) { throw "Syntax check failed: $file" }
}
```

Expected: 每个文件退出码均为 0。

- [ ] **Step 3: 运行生产构建**

Run:

```powershell
npm run build
```

Expected: Vite 构建成功并退出 0；允许已有的 chunk size 提示，不允许构建错误。

- [ ] **Step 4: 在数据库副本上验证初始化与迁移**

先用 SQLite `.backup` 或文件复制创建临时数据库副本，再在副本上运行初始化迁移和 `PRAGMA integrity_check`。绝不将测试迁移直接运行在工作区正式数据库上。

Expected: `integrity_check` 返回 `ok`；核心表数量不变；自定义 `llms` 测试记录不被覆盖。

- [ ] **Step 5: 本地生产模式回归关键 URL**

使用非生产数据副本和非占用端口启动服务，验证：

```text
/sitemap.xml
/sitemap-categories.xml
/en/products/<existing-slug>
/llms.txt
/llms-full.txt
```

Expected: 五个 URL 均返回 200；分类站点地图是合法 XML；产品详情刷新成功；Product JSON-LD 无 `offers`；评价摘要仍与可见评价一致；两个 AI 文本文件不含 LED Trade。

- [ ] **Step 6: 进行手机、平板和桌面图库回归**

使用 Chromium 分别以 390×844、820×1180、1440×900 打开同一产品详情，连续点击下一张并检查每个活动缩略图矩形均在容器左右边界内。

Expected: 三种视口均无页面级横向溢出；手机前几张缩略图不再位于负坐标；图片、视频和循环切换正常。

- [ ] **Step 7: 最终差异和提交范围审计**

Run:

```powershell
git diff --check HEAD~4..HEAD
git status --short
git log -5 --oneline
```

Expected: 工作区干净；最近四个实现提交分别对应四项修复，没有数据库、上传文件、构建产物或无关文件进入提交。

- [ ] **Step 8: 推送前报告验证结果**

向用户报告测试数量、构建结果、关键 URL 和三端回归结果；只有用户既有的“直接推送到 GitHub”授权仍有效且当前分支确认无误时，才把 `main` 推送到 `origin/main`。
