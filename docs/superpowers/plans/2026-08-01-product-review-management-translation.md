# 产品评价管理、翻译与 SEO/GEO 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立按产品独立归属、可审核、可批量导入、可通过 API 管理并可随页面语言翻译显示的真实产品评价系统，同时让页面可见评价、SSR HTML 和 Product JSON-LD 保持一致。

**Architecture:** 使用 `product_reviews` 保存不可翻译的评价事实和英文原文，使用 `product_review_translations` 保存目标语言内容；领域服务集中完成校验、解析、事务、审核和语言过滤。后台和外部 API 复用同一领域服务但执行不同发布策略，翻译系统通过新增 `reviews` 收集器写入翻译表，产品详情的客户端和服务端共同使用纯函数生成评价摘要与 JSON-LD。

**Tech Stack:** Node.js 20、Express 4、Vue 3 Composition API、SQLite/better-sqlite3、Node.js Test Runner、Vite 5、Schema.org Product/Review/AggregateRating。

## 全局约束

- 只录入、导入、审核和翻译真实评价；不生成、不伪造、也不自动提高评分。
- 外部 API 新增和编辑后的评价固定为 `pending`，外部 API 不提供发布能力。
- 后台手动新增和确认后的后台批量导入默认 `published`，管理员可改为 `pending`。
- 评分允许 1.0–5.0，最多一位小数；无效评分必须返回错误，禁止随机替换。
- 英文原文只存主表；非英文页面只显示当前语言的有效翻译，不回退到其他语言。
- `Product.review` 只包含当前页面真实可见的已发布评价；`aggregateRating` 只根据已发布评价计算。
- 评价读取、翻译或缓存清理失败不得让产品详情返回 HTTP 500。
- Google AI Overviews/AI Mode 不使用特殊 GEO Schema；以可索引文本、内部可发现性和结构化数据与可见内容一致为准。
- 不增加新的运行时依赖；沿用现有 `node --test`、Express、better-sqlite3 和 Vue 组件体系。
- 所有生产代码必须先有能够正确失败的自动化测试。

## 文件结构

- `server/services/productReviewSchema.js`：创建新表、索引和幂等旧数据迁移。
- `server/services/productReviews.js`：日期/评分校验、批量解析、内容指纹、事务 CRUD、审核、语言过滤和统计。
- `server/services/productReviewTranslation.js`：把通用翻译记录同步到评价翻译表并判断翻译是否有效。
- `shared/productReviewSeo.js`：浏览器和服务器均可调用的纯 JSON-LD 构建函数。
- `server/routes/product-reviews.js`：公共读取和管理员评价 API。
- `src/views/admin/Reviews.vue`：独立评价后台、单条表单、导入预览和批量审核。
- `src/components/ProductReviews.vue`：产品详情可见评价区。
- `test/productReviewSchema.test.js`、`test/productReviewCore.test.js`、`test/productReviewRoutes.test.js`、`test/productReviewTranslation.test.js`、`test/productReviewSeo.test.js`：分层回归测试。

---

### Task 1：建立数据库结构和可重复旧数据迁移

**Files:**
- Create: `server/services/productReviewSchema.js`
- Create: `test/productReviewSchema.test.js`
- Modify: `server/db.js:17-27,327-338,1770-1777,1783-1805,1909`

**Interfaces:**
- Consumes: `better-sqlite3` 的 `db.exec()`、`db.prepare()` 和 `db.transaction()`。
- Produces: `initializeProductReviewSchema(db)`；`transaction(fn)` 数据库包装器。

- [ ] **Step 1: 写数据库失败测试**

创建 `test/productReviewSchema.test.js`：

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
const schemaModule = await import('../server/services/productReviewSchema.js').catch(() => ({}))
const initializeProductReviewSchema = schemaModule.initializeProductReviewSchema

function createDb() {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE products (id INTEGER PRIMARY KEY, name_en TEXT);
    CREATE TABLE seo_reviews (
      id INTEGER PRIMARY KEY, target_type TEXT, target_id INTEGER,
      author_name TEXT, rating REAL, review_text TEXT, created_at TEXT
    );
  `)
  return db
}

test('creates normalized review and translation tables with enforced constraints', () => {
  assert.equal(typeof initializeProductReviewSchema, 'function', '必须实现数据库初始化函数')
  const db = createDb()
  initializeProductReviewSchema(db)
  const reviewColumns = db.pragma('table_info(product_reviews)').map(row => row.name)
  const translationColumns = db.pragma('table_info(product_review_translations)').map(row => row.name)
  assert.deepEqual(reviewColumns, [
    'id', 'product_id', 'author_name', 'review_title', 'review_date', 'rating',
    'review_text', 'status', 'source', 'external_id', 'verified_purchase',
    'is_incentivized', 'incentive_disclosure', 'import_batch_id',
    'created_at', 'updated_at', 'published_at'
  ])
  assert.deepEqual(translationColumns, [
    'id', 'review_id', 'language_code', 'review_title', 'review_text',
    'incentive_disclosure', 'source_hash', 'created_at', 'updated_at'
  ])
})

test('migrates product seo reviews once as pending records', () => {
  const db = createDb()
  db.prepare('INSERT INTO products (id, name_en) VALUES (1, ?)').run('GI Coil')
  db.prepare(`INSERT INTO seo_reviews
    (id,target_type,target_id,author_name,rating,review_text,created_at)
    VALUES (7,'product',1,'Alex',4.8,'Consistent coating','2026-07-01')`).run()

  initializeProductReviewSchema(db)
  initializeProductReviewSchema(db)

  const rows = db.prepare('SELECT * FROM product_reviews').all()
  assert.equal(rows.length, 1)
  assert.equal(rows[0].status, 'pending')
  assert.equal(rows[0].source, 'migration')
  assert.equal(rows[0].external_id, 'seo_reviews:7')
})
```

- [ ] **Step 2: 运行测试并确认正确失败**

Run: `node --test test/productReviewSchema.test.js`

Expected: FAIL，原因是 `productReviewSchema.js` 尚不存在或未导出初始化函数。

- [ ] **Step 3: 实现表结构、索引和迁移**

创建 `server/services/productReviewSchema.js`，实现以下结构；迁移使用 `INSERT OR IGNORE` 和 `external_id='seo_reviews:' || id` 保证幂等：

```js
export function initializeProductReviewSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      author_name TEXT NOT NULL CHECK(length(trim(author_name)) BETWEEN 1 AND 100),
      review_title TEXT,
      review_date TEXT NOT NULL,
      rating REAL NOT NULL CHECK(rating >= 1 AND rating <= 5),
      review_text TEXT NOT NULL CHECK(length(trim(review_text)) > 0),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','hidden')),
      source TEXT NOT NULL CHECK(source IN ('admin','admin_import','external_api','migration')),
      external_id TEXT,
      verified_purchase INTEGER NOT NULL DEFAULT 0 CHECK(verified_purchase IN (0,1)),
      is_incentivized INTEGER NOT NULL DEFAULT 0 CHECK(is_incentivized IN (0,1)),
      incentive_disclosure TEXT,
      import_batch_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      published_at TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_product_reviews_external
      ON product_reviews(source, external_id) WHERE external_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_product_reviews_product_status_date
      ON product_reviews(product_id, status, review_date DESC);
    CREATE INDEX IF NOT EXISTS idx_product_reviews_status ON product_reviews(status);
    CREATE INDEX IF NOT EXISTS idx_product_reviews_batch ON product_reviews(import_batch_id);

    CREATE TABLE IF NOT EXISTS product_review_translations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_id INTEGER NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
      language_code TEXT NOT NULL CHECK(language_code <> 'en'),
      review_title TEXT,
      review_text TEXT NOT NULL,
      incentive_disclosure TEXT,
      source_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(review_id, language_code)
    );
  `)

  const hasLegacy = db.prepare(
    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='seo_reviews'"
  ).get()
  if (!hasLegacy) return

  db.exec(`
    INSERT OR IGNORE INTO product_reviews (
      product_id, author_name, review_date, rating, review_text, status,
      source, external_id, created_at, updated_at
    )
    SELECT s.target_id, trim(s.author_name), substr(COALESCE(s.created_at,CURRENT_TIMESTAMP),1,10),
      round(s.rating,1),
      trim(s.review_text), 'pending', 'migration', 'seo_reviews:' || s.id,
      COALESCE(s.created_at,CURRENT_TIMESTAMP), CURRENT_TIMESTAMP
    FROM seo_reviews s JOIN products p ON p.id=s.target_id
    WHERE s.target_type='product' AND s.rating BETWEEN 1 AND 5
      AND round(s.rating,1)=s.rating AND length(trim(s.author_name)) BETWEEN 1 AND 100
      AND length(trim(s.review_text)) > 0;
  `)
}
```

在 `server/db.js` 的 `initDb()` 创建完 `products` 后调用 `initializeProductReviewSchema(db)`，删除旧的动态评价表创建注释所暗示的自动 JSON-LD 用途但保留旧表以便迁移。增加：

```js
function transaction(fn) {
  return db.transaction(fn)()
}

export {
  initDb, getAll, getOne, run, transaction, saveDb, closeDb,
  backupDb, findFuzzyBySlug
}
```

- [ ] **Step 4: 验证测试和语法**

Run: `node --test test/productReviewSchema.test.js`

Run: `node --check server/services/productReviewSchema.js`

Run: `node --check server/db.js`

Expected: 目标测试全部 PASS，语法检查退出码 0。

- [ ] **Step 5: 提交数据库层**

```bash
git add server/db.js server/services/productReviewSchema.js test/productReviewSchema.test.js
git commit -m "feat: add normalized product review storage"
```

---

### Task 2：实现评价校验、批量解析和领域存储

**Files:**
- Create: `server/services/productReviews.js`
- Create: `test/productReviewCore.test.js`

**Interfaces:**
- Consumes: `{ getAll, getOne, run, transaction }` 数据库依赖。
- Produces: `normalizeReviewInput(input, policy)`、`parseBulkReviewText(text)`、`reviewSourceHash(review)`、`createProductReviewStore(dbApi)`。

- [ ] **Step 1: 写解析、校验和存储失败测试**

创建 `test/productReviewCore.test.js`，至少包含：

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { initializeProductReviewSchema } from '../server/services/productReviewSchema.js'
const reviewModule = await import('../server/services/productReviews.js').catch(() => ({}))
const { normalizeReviewInput, parseBulkReviewText, createProductReviewStore } = reviewModule

test('parses supported dates and preserves hyphens in review text', () => {
  assert.equal(typeof parseBulkReviewText, 'function', '必须实现批量解析函数')
  const result = parseBulkReviewText([
    'John Smith - 2026-07-18 - 4.7 - On-time delivery - good packaging',
    'Maria Garcia - 2026年7月20日 - 5.0 - Consistent surface finish'
  ].join('\n'))
  assert.equal(result.valid.length, 2)
  assert.equal(result.valid[0].review_date, '2026-07-18')
  assert.equal(result.valid[0].review_text, 'On-time delivery - good packaging')
  assert.equal(result.valid[1].review_date, '2026-07-20')
})

test('rejects rather than modifies out-of-range ratings', () => {
  assert.throws(
    () => normalizeReviewInput({ author_name: 'A', review_date: '2026-07-18', rating: 7, review_text: 'Real text' }),
    /评分必须在 1\.0 到 5\.0 之间/
  )
})

test('external create is pending and repeated external id is idempotent', () => {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  db.exec('CREATE TABLE products (id INTEGER PRIMARY KEY, name_en TEXT); INSERT INTO products VALUES (1,\'GI Coil\');')
  initializeProductReviewSchema(db)
  const store = createProductReviewStore({
    getAll: (sql, params=[]) => db.prepare(sql).all(...params),
    getOne: (sql, params=[]) => db.prepare(sql).get(...params) || null,
    run: (sql, params=[]) => db.prepare(sql).run(...params),
    transaction: fn => db.transaction(fn)()
  })
  const input = {
    product_id: 1, author_name: 'Alex', review_date: '2026-07-01',
    rating: 4.8, review_text: 'Consistent coating', external_id: 'crm-88'
  }
  const first = store.create(input, { source: 'external_api', forcedStatus: 'pending' })
  const second = store.create(input, { source: 'external_api', forcedStatus: 'pending' })
  assert.equal(first.id, second.id)
  assert.equal(db.prepare('SELECT COUNT(*) c FROM product_reviews').get().c, 1)
})
```

再覆盖：空姓名、超过 100 字符姓名、无效日期、两位小数、空正文、激励评价无披露、批次内重复、事务回滚、英文变更清除旧翻译、批量状态和按筛选全部发布。

- [ ] **Step 2: 运行测试并确认正确失败**

Run: `node --test test/productReviewCore.test.js`

Expected: FAIL，原因是 `productReviews.js` 尚不存在或导出缺失。

- [ ] **Step 3: 实现领域服务**

`server/services/productReviews.js` 使用以下稳定接口：

```js
import crypto from 'node:crypto'

const STATUSES = new Set(['pending', 'published', 'hidden'])
const SOURCES = new Set(['admin', 'admin_import', 'external_api', 'migration'])

export function reviewSourceHash(review) {
  return crypto.createHash('sha256').update(JSON.stringify([
    review.review_title || '', review.review_text || '',
    review.incentive_disclosure || ''
  ])).digest('hex')
}

export function normalizeReviewInput(input, {
  source = 'admin', forcedStatus = null, requireProduct = true
} = {}) {
  const author = String(input.author_name || '').trim()
  const text = String(input.review_text || '').trim()
  const rating = Number(input.rating)
  const date = normalizeReviewDate(input.review_date)
  if (!author || author.length > 100) throw new Error('评价姓名必须为 1 到 100 个字符')
  if (!Number.isFinite(rating) || rating < 1 || rating > 5 || Math.round(rating * 10) !== rating * 10) {
    throw new Error('评分必须在 1.0 到 5.0 之间且最多一位小数')
  }
  if (!text) throw new Error('评论内容不能为空')
  if (requireProduct && !Number.isInteger(Number(input.product_id))) throw new Error('必须选择有效产品')
  if (!SOURCES.has(source)) throw new Error('评价来源无效')
  const status = forcedStatus || input.status || 'published'
  if (!STATUSES.has(status)) throw new Error('评价状态无效')
  const incentivized = input.is_incentivized ? 1 : 0
  const disclosure = String(input.incentive_disclosure || '').trim()
  if (incentivized && !disclosure) throw new Error('激励评价必须填写披露说明')
  return {
    product_id: Number(input.product_id), author_name: author,
    review_title: String(input.review_title || '').trim() || null,
    review_date: date, rating: Number(rating.toFixed(1)), review_text: text,
    status, source, external_id: input.external_id ? String(input.external_id).trim() : null,
    verified_purchase: input.verified_purchase ? 1 : 0,
    is_incentivized: incentivized, incentive_disclosure: disclosure || null,
    import_batch_id: input.import_batch_id || null
  }
}

export function normalizeReviewDate(value) {
  const raw = String(value || '').trim()
  const match = raw.match(/^(\d{4})(?:-(\d{1,2})-(\d{1,2})|\/(\d{1,2})\/(\d{1,2})|年(\d{1,2})月(\d{1,2})日)$/)
  if (!match) throw new Error('日期必须使用 YYYY-MM-DD、YYYY/MM/DD 或 YYYY年MM月DD日')
  const year = Number(match[1])
  const month = Number(match[2] || match[4] || match[6])
  const day = Number(match[3] || match[5] || match[7])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error('日期不是有效日历日期')
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function parseBulkReviewText(text) {
  const valid = []
  const invalid = []
  const duplicates = []
  const seen = new Set()
  const pattern = /^\s*(.*?)\s+-\s+(\d{4}(?:-\d{1,2}-\d{1,2}|\/\d{1,2}\/\d{1,2}|年\d{1,2}月\d{1,2}日))\s+-\s+([0-9]+(?:\.[0-9]+)?)\s+-\s+(.+?)\s*$/
  String(text || '').split(/\r?\n/).forEach((raw, index) => {
    if (!raw.trim()) return
    const line = index + 1
    const match = raw.match(pattern)
    if (!match) {
      invalid.push({ line, raw, error: '格式必须为：姓名 - 日期 - 评分 - 评论内容' })
      return
    }
    try {
      const item = normalizeReviewInput({
        product_id: 1,
        author_name: match[1],
        review_date: match[2],
        rating: Number(match[3]),
        review_text: match[4]
      }, { requireProduct: false, source: 'admin_import', forcedStatus: 'published' })
      delete item.product_id
      const key = JSON.stringify([item.author_name, item.review_date, item.rating, item.review_text])
      if (seen.has(key)) duplicates.push({ line, raw, error: '与本批次其他行重复' })
      else { seen.add(key); valid.push({ line, ...item }) }
    } catch (error) {
      invalid.push({ line, raw, error: error.message })
    }
  })
  return { valid, invalid, duplicates }
}
```

`createProductReviewStore({ getAll, getOne, run, transaction, invalidateCache })` 必须返回以下同名方法：`listAdmin(filters)`、`getById(id)`、`create(input, policy)`、`bulkCreate(productId, rows, policy)`、`update(id, input, policy)`、`remove(id)`、`bulkStatus(ids, status)`、`publishAll(filters)`、`listPublic({ productId, lang, page, limit })` 和 `translationStatus(reviewId)`。批量写入包在 `transaction()` 中；`external_id` 冲突返回已有记录；英文内容变化时删除该评价的 `product_review_translations` 和 `content_type='product_review'` 的通用翻译；`listPublic` 对英语读主表，对非英语要求 `source_hash === reviewSourceHash(currentReview)`。

- [ ] **Step 4: 运行目标测试并检查语法**

Run: `node --test test/productReviewCore.test.js`

Run: `node --check server/services/productReviews.js`

Expected: 全部目标测试 PASS，语法检查退出码 0。

- [ ] **Step 5: 提交领域层**

```bash
git add server/services/productReviews.js test/productReviewCore.test.js
git commit -m "feat: add product review validation and workflows"
```

---

### Task 3：增加公共、管理员和外部评价 API

**Files:**
- Create: `server/routes/product-reviews.js`
- Create: `test/productReviewRoutes.test.js`
- Modify: `server/index.js:23-58,440-485`
- Modify: `server/routes/external-api.js:107-118,247-274,448-488,920-1210`
- Modify: `src/api/index.js:191-207,302-349`

**Interfaces:**
- Consumes: `createProductReviewStore()`、管理员 `authMiddleware`、现有 `apiKeyMiddleware`。
- Produces: `/api/product-reviews/product/:productId`、`/api/product-reviews/admin/*`、`/api/external/product-reviews/*`。

- [ ] **Step 1: 写路由策略失败测试**

创建 `test/productReviewRoutes.test.js`：

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const routeModule = await import('../server/routes/product-reviews.js').catch(() => ({}))
const reviewRouter = routeModule.default
const forceExternalReviewPolicy = routeModule.forceExternalReviewPolicy

test('external policy always forces pending status', () => {
  assert.equal(typeof forceExternalReviewPolicy, 'function', '必须实现外部待审核策略')
  assert.deepEqual(forceExternalReviewPolicy({ status: 'published' }), {
    source: 'external_api', forcedStatus: 'pending'
  })
})

test('admin write routes require authentication and public route is read only', () => {
  assert.ok(reviewRouter?.stack, '必须创建产品评价路由')
  const routes = reviewRouter.stack.map(layer => layer.route).filter(Boolean)
  const adminWrites = routes.filter(route => route.path.startsWith('/admin') &&
    (route.methods.post || route.methods.put || route.methods.delete))
  assert.ok(adminWrites.length >= 6)
  for (const route of adminWrites) assert.equal(route.stack[0].name, 'authMiddleware')
  const publicRoute = routes.find(route => route.path === '/product/:productId' && route.methods.get)
  assert.ok(publicRoute)
})

test('legacy external seo endpoint no longer randomizes ratings or publishes immediately', () => {
  const source = fs.readFileSync(new URL('../server/routes/external-api.js', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /4\.7\s*\+\s*Math\.random/)
  assert.doesNotMatch(source, /immediately appear in JSON-LD/)
  assert.match(source, /deprecated/i)
})
```

再以注入的内存 store 调用导出的 handler，覆盖管理员默认发布、外部新增/批量新增强制待审核、外部编辑后重审、批量错误行号、分页查询、删除和外部无发布路由。

- [ ] **Step 2: 运行测试并确认策略缺失**

Run: `node --test test/productReviewRoutes.test.js`

Expected: FAIL，因为评价路由和外部强制待审核策略尚不存在。

- [ ] **Step 3: 实现路由和 API 客户端**

`server/routes/product-reviews.js` 导出默认 router 和以下纯策略：

```js
export function forceExternalReviewPolicy() {
  return { source: 'external_api', forcedStatus: 'pending' }
}

router.get('/product/:productId', publicListHandler)
router.get('/admin', authMiddleware, adminListHandler)
router.get('/admin/:id', authMiddleware, adminDetailHandler)
router.post('/admin', authMiddleware, adminCreateHandler)
router.post('/admin/parse-import', authMiddleware, parseImportHandler)
router.post('/admin/bulk', authMiddleware, adminBulkHandler)
router.put('/admin/:id', authMiddleware, adminUpdateHandler)
router.delete('/admin/:id', authMiddleware, adminDeleteHandler)
router.post('/admin/bulk-status', authMiddleware, bulkStatusHandler)
router.post('/admin/publish-all', authMiddleware, publishAllHandler)
```

在 `server/index.js` 使用：

```js
import productReviewRoutes from './routes/product-reviews.js'
app.use('/api/product-reviews', productReviewRoutes)
```

在 `external-api.js` 增加 `GET/POST/PUT/DELETE /product-reviews` 和 `POST /product-reviews/bulk`，所有写入调用领域服务并强制 `pending`；旧 `POST /seo-reviews` 调用同一新增函数并返回：

```js
res.status(201).json({
  success: true,
  data: review,
  deprecated: true,
  replacement: '/api/external/product-reviews'
})
```

单次批量导入常量固定为 `MAX_REVIEW_BATCH_SIZE = 200`；空数组或超过 200 条返回 HTTP 400，并在 `details` 中说明允许范围。管理员和外部批量接口都使用同一限制，外部路由继续受现有全局限流与 `X-API-Key` 保护。

在现有外部接口文档页面增加字段、状态、分页、幂等和示例。`src/api/index.js` 增加 `getPublicProductReviews` 和全部管理员评价方法，所有写方法使用现有 `request()`。

客户端方法名和请求契约固定为：

```js
getPublicProductReviews: (productId, params = {}) => request(`/product-reviews/product/${productId}?${new URLSearchParams(params)}`),
getAdminProductReviews: (params = {}) => request(`/product-reviews/admin?${new URLSearchParams(params)}`),
getAdminProductReview: id => request(`/product-reviews/admin/${id}`),
createProductReview: data => request('/product-reviews/admin', { method: 'POST', body: JSON.stringify(data) }),
parseProductReviewImport: data => request('/product-reviews/admin/parse-import', { method: 'POST', body: JSON.stringify(data) }),
bulkCreateProductReviews: data => request('/product-reviews/admin/bulk', { method: 'POST', body: JSON.stringify(data) }),
updateProductReview: (id, data) => request(`/product-reviews/admin/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
deleteProductReview: id => request(`/product-reviews/admin/${id}`, { method: 'DELETE' }),
bulkUpdateProductReviewStatus: data => request('/product-reviews/admin/bulk-status', { method: 'POST', body: JSON.stringify(data) }),
publishAllPendingProductReviews: data => request('/product-reviews/admin/publish-all', { method: 'POST', body: JSON.stringify(data) })
```

- [ ] **Step 4: 运行路由和完整服务端测试**

Run: `node --test test/productReviewRoutes.test.js test/productReviewCore.test.js test/productReviewSchema.test.js`

Run: `node --check server/routes/product-reviews.js`

Run: `node --check server/routes/external-api.js`

Run: `node --check server/index.js`

Expected: 目标测试全部 PASS，四项语法检查退出码 0。

- [ ] **Step 5: 提交 API 层**

```bash
git add server/index.js server/routes/product-reviews.js server/routes/external-api.js src/api/index.js test/productReviewRoutes.test.js
git commit -m "feat: add moderated product review APIs"
```

---

### Task 4：把产品评价接入 AI 全站翻译

**Files:**
- Create: `server/services/productReviewTranslation.js`
- Create: `test/productReviewTranslation.test.js`
- Modify: `server/routes/translation.js:367-428,899-914,1233-1280,1496-1501,1788-1792`
- Modify: `server/routes/translation-jobs.js:108-126,192-203`
- Modify: `src/views/admin/Translations.vue:349-358,887-889`

**Interfaces:**
- Consumes: 通用 `translations` 表、`upsertTranslation()` 和 `product_reviews`。
- Produces: `collectProductReviews()`、`syncProductReviewTranslation({ reviewId, lang, getOne, run })`、翻译范围键 `reviews`、内容类型 `product_review`。

- [ ] **Step 1: 写翻译收集和同步失败测试**

创建 `test/productReviewTranslation.test.js`：

```js
import test from 'node:test'
import assert from 'node:assert/strict'
const translationModule = await import('../server/services/productReviewTranslation.js').catch(() => ({}))
const { collectProductReviews, syncProductReviewTranslation } = translationModule

test('collects only published English review fields', () => {
  assert.equal(typeof collectProductReviews, 'function', '必须实现评价翻译收集器')
  const items = collectProductReviews(() => [
    { id: 1, product_id: 9, author_name: 'A', status: 'published', review_title: 'Title', review_text: 'Body', incentive_disclosure: null },
    { id: 2, product_id: 9, author_name: 'B', status: 'pending', review_title: null, review_text: 'Hidden', incentive_disclosure: null }
  ])
  assert.deepEqual(items.map(item => [item.type, item.id, item.field]), [
    ['product_review', 1, 'review_title'],
    ['product_review', 1, 'review_text']
  ])
})

test('syncs a translation only when every current source field has a translation', () => {
  const writes = []
  const result = syncProductReviewTranslation({
    reviewId: 1,
    lang: 'es',
    getOne: sql => sql.includes('FROM product_reviews')
      ? { id: 1, review_title: 'Good', review_text: 'On time', incentive_disclosure: null }
      : null,
    getAll: () => [
      { content_field: 'review_title', original_text: 'Good', translated_text: 'Bueno' },
      { content_field: 'review_text', original_text: 'On time', translated_text: 'A tiempo' }
    ],
    run: (sql, params) => writes.push({ sql, params })
  })
  assert.equal(result.synced, true)
  assert.equal(writes.length, 1)
})
```

再覆盖英文正文改变后旧 `original_text` 不匹配时不发布翻译、激励披露必译、英语目标跳过、待审核评价不收集。

- [ ] **Step 2: 运行测试并确认缺少评价翻译适配器**

Run: `node --test test/productReviewTranslation.test.js`

Expected: FAIL，因为 `productReviewTranslation.js` 尚不存在。

- [ ] **Step 3: 实现翻译适配并接入所有任务入口**

创建 `server/services/productReviewTranslation.js`：

```js
import { reviewSourceHash } from './productReviews.js'

export function collectProductReviews(readAll) {
  const rows = readAll(`SELECT id, product_id, author_name, review_title,
    review_text, incentive_disclosure FROM product_reviews
    WHERE status='published' ORDER BY id`)
  const items = []
  for (const row of rows) {
    const itemName = `${row.author_name} / Product #${row.product_id}`
    if (row.review_title) items.push({ type: 'product_review', id: row.id, field: 'review_title', text: row.review_title, itemName })
    items.push({ type: 'product_review', id: row.id, field: 'review_text', text: row.review_text, itemName })
    if (row.incentive_disclosure) items.push({ type: 'product_review', id: row.id, field: 'incentive_disclosure', text: row.incentive_disclosure, itemName })
  }
  return items
}

export function syncProductReviewTranslation({ reviewId, lang, getOne, getAll, run }) {
  if (!lang || lang === 'en') return { synced: false, reason: 'english-source' }
  const review = getOne(`SELECT id, review_title, review_text, incentive_disclosure
    FROM product_reviews WHERE id=? AND status='published'`, [reviewId])
  if (!review) return { synced: false, reason: 'review-unavailable' }
  const rows = getAll(`SELECT content_field, original_text, translated_text
    FROM translations WHERE language_code=? AND content_type='product_review' AND content_id=?`, [lang, reviewId])
  const byField = new Map(rows.map(row => [row.content_field, row]))
  const requiredFields = ['review_text']
  if (review.review_title) requiredFields.push('review_title')
  if (review.incentive_disclosure) requiredFields.push('incentive_disclosure')
  const current = requiredFields.every(field => {
    const row = byField.get(field)
    return row && row.original_text === review[field] && String(row.translated_text || '').trim()
  })
  if (!current) {
    run('DELETE FROM product_review_translations WHERE review_id=? AND language_code=?', [reviewId, lang])
    return { synced: false, reason: 'translation-incomplete' }
  }
  run(`INSERT INTO product_review_translations
    (review_id,language_code,review_title,review_text,incentive_disclosure,source_hash,updated_at)
    VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(review_id,language_code) DO UPDATE SET
      review_title=excluded.review_title, review_text=excluded.review_text,
      incentive_disclosure=excluded.incentive_disclosure,
      source_hash=excluded.source_hash, updated_at=CURRENT_TIMESTAMP`, [
    reviewId, lang, byField.get('review_title')?.translated_text || null,
    byField.get('review_text').translated_text,
    byField.get('incentive_disclosure')?.translated_text || null,
    reviewSourceHash(review)
  ])
  return { synced: true }
}
```

在 `translation.js` 的 `PAGES` 增加 `reviews: () => collectProductReviews(getAll)`，全部 `TYPE_TO_PAGE` 映射增加 `product_review: 'reviews'`，`upsertTranslation()` 在写入 `product_review` 字段后调用同步函数。`translation-jobs.js` 的类型映射同步增加该类型。`Translations.vue` 的 `allPages` 和 `pageLabels` 增加：

```js
const allPages = [
  'products', 'reviews', 'news', 'company', 'page_texts', 'categories',
  'hero', 'ui_texts_static', 'ral_colors', 'roofing_categories',
  'factory', 'futures', 'chat'
]
const pageLabels = {
  products: '产品', reviews: '⭐ 产品评价', news: '新闻', company: '公司信息',
  page_texts: '页面文字', categories: '产品分类', hero: 'Hero区域',
  ui_texts_static: 'UI静态文字', ral_colors: '🎨 RAL颜色',
  roofing_categories: '🏠 瓦型分组', factory: '🏭 工厂展示',
  futures: '📊 期货行情', chat: '💬 在线客服'
}
```

- [ ] **Step 4: 验证翻译测试和既有翻译路由语法**

Run: `node --test test/productReviewTranslation.test.js test/productReviewCore.test.js`

Run: `node --check server/services/productReviewTranslation.js`

Run: `node --check server/routes/translation.js`

Run: `node --check server/routes/translation-jobs.js`

Expected: 目标测试全部 PASS，三项语法检查退出码 0。

- [ ] **Step 5: 提交翻译集成**

```bash
git add server/services/productReviewTranslation.js server/routes/translation.js server/routes/translation-jobs.js src/views/admin/Translations.vue test/productReviewTranslation.test.js
git commit -m "feat: translate published product reviews"
```

---

### Task 5：实现独立的后台产品评价管理页面

**Files:**
- Create: `src/views/admin/Reviews.vue`
- Create: `test/productReviewAdminUi.test.js`
- Modify: `src/router/index.js:74-97`
- Modify: `src/views/admin/Layout.vue:7-31`

**Interfaces:**
- Consumes: `api.getAdminCategoryTree()`、`api.getAdminProducts()` 和任务 3 的管理员评价 API。
- Produces: `/admin/reviews` 页面，支持产品分组筛选、单条 CRUD、导入预览、多选和全选发布。

- [ ] **Step 1: 写后台界面契约失败测试**

创建 `test/productReviewAdminUi.test.js`：

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const routerSource = fs.readFileSync(new URL('../src/router/index.js', import.meta.url), 'utf8')
const layoutSource = fs.readFileSync(new URL('../src/views/admin/Layout.vue', import.meta.url), 'utf8')
const reviewUrl = new URL('../src/views/admin/Reviews.vue', import.meta.url)
const reviewSource = fs.existsSync(reviewUrl) ? fs.readFileSync(reviewUrl, 'utf8') : ''

test('registers a dedicated authenticated review page', () => {
  assert.ok(fs.existsSync(reviewUrl), '必须创建独立评价后台页面')
  assert.match(routerSource, /path:\s*'reviews'[\s\S]*?admin\/Reviews\.vue/)
  assert.match(layoutSource, /to="\/admin\/reviews"/)
})

test('review page contains product grouping, import preview and bulk moderation controls', () => {
  assert.match(reviewSource, /getAdminCategoryTree/)
  assert.match(reviewSource, /getAdminProducts/)
  assert.match(reviewSource, /parseProductReviewImport/)
  assert.match(reviewSource, /bulkUpdateProductReviewStatus/)
  assert.match(reviewSource, /publishAllPendingProductReviews/)
  assert.match(reviewSource, /v-model="selectedReviewIds"/)
  assert.match(reviewSource, /导入预览/)
})
```

- [ ] **Step 2: 运行测试并确认后台页面不存在**

Run: `node --test test/productReviewAdminUi.test.js`

Expected: FAIL，因为 `Reviews.vue` 和对应路由尚不存在。

- [ ] **Step 3: 实现后台页面**

`Reviews.vue` 使用 Composition API，状态至少包括：

```js
const categoryTree = ref([])
const selectedCategoryId = ref('')
const products = ref([])
const selectedProductId = ref('')
const reviews = ref([])
const filters = reactive({ status: 'all', source: 'all', q: '', dateFrom: '', dateTo: '' })
const selectedReviewIds = ref([])
const form = reactive({
  author_name: '', review_title: '', review_date: '', rating: 5,
  review_text: '', status: 'published', verified_purchase: false,
  is_incentivized: false, incentive_disclosure: ''
})
const importText = ref('')
const importPreview = ref({ valid: [], invalid: [], duplicates: [] })
```

产品分组变化时调用 `getAdminProducts({ category_id, limit: 500 })`；产品变化后加载评价。导入必须先调用 `parseProductReviewImport()` 显示逐行预览，只有 `invalid.length===0` 时才允许确认。评分组件用五个背景星和百分比覆盖层显示 `rating / 5 * 100%`，同时显示数值。批量发布分别提交明确 ID 列表和当前产品/筛选条件；删除及全部发布二次确认。

在 router 增加：

```js
{ path: 'reviews', name: 'AdminReviews', component: () => import('../views/admin/Reviews.vue') }
```

在后台侧边栏商品管理后增加：

```html
<router-link to="/admin/reviews">⭐ 产品评价</router-link>
```

- [ ] **Step 4: 运行 UI 契约测试和生产构建**

Run: `node --test test/productReviewAdminUi.test.js`

Run: `npm run build`

Expected: UI 契约测试 PASS；Vite 构建成功，允许项目已有 chunk-size 警告，不允许模板或编译错误。

- [ ] **Step 5: 提交后台页面**

```bash
git add src/views/admin/Reviews.vue src/router/index.js src/views/admin/Layout.vue test/productReviewAdminUi.test.js
git commit -m "feat: add product review admin workflow"
```

---

### Task 6：实现多语言可见评价、SSR 和一致的 JSON-LD

**Files:**
- Create: `shared/productReviewSeo.js`
- Create: `src/components/ProductReviews.vue`
- Create: `test/productReviewSeo.test.js`
- Modify: `src/views/ProductDetail.vue:1-200,500-652`
- Modify: `server/index.js:659-780,1280-1330`
- Modify: `test/detailSeoSafety.test.js`

**Interfaces:**
- Consumes: `store.listPublic({ productId, lang, page, limit })` 返回 `{ reviews, summary, pagination }`。
- Produces: `buildReviewSchemaParts({ reviews, summary })`、当前语言评价组件、首屏评价 HTML、Product JSON-LD 的 `review` 和 `aggregateRating`。

- [ ] **Step 1: 写 SEO/GEO 一致性失败测试**

创建 `test/productReviewSeo.test.js`：

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const seoModule = await import('../shared/productReviewSeo.js').catch(() => ({}))
const buildReviewSchemaParts = seoModule.buildReviewSchemaParts

test('builds review schema only from visible reviews and shared published summary', () => {
  assert.equal(typeof buildReviewSchemaParts, 'function', '必须实现共享评价 Schema 构建函数')
  const parts = buildReviewSchemaParts({
    reviews: [{
      author_name: 'Alex', review_title: 'Reliable supply', review_date: '2026-07-01',
      rating: 4.8, review_text: 'Consistent coating', verified_purchase: 1,
      is_incentivized: 0, incentive_disclosure: null
    }],
    summary: { ratingValue: 4.8, reviewCount: 12 }
  })
  assert.equal(parts.aggregateRating.reviewCount, 12)
  assert.equal(parts.review.length, 1)
  assert.equal(parts.review[0].author.name, 'Alex')
  assert.equal(parts.review[0].reviewRating.ratingValue, 4.8)
  assert.equal(parts.review[0].reviewBody, 'Consistent coating')
})

test('omits all review schema when no review is visible', () => {
  assert.deepEqual(buildReviewSchemaParts({ reviews: [], summary: { ratingValue: 0, reviewCount: 0 } }), {})
})

test('removes fixed client reviews and renders visible review text without v-html', () => {
  const detail = fs.readFileSync(new URL('../src/views/ProductDetail.vue', import.meta.url), 'utf8')
  const component = fs.readFileSync(new URL('../src/components/ProductReviews.vue', import.meta.url), 'utf8')
  assert.doesNotMatch(detail, /Verified Buyer|reviewCount': '89|Excellent quality and service/)
  assert.doesNotMatch(component, /v-html/)
  assert.match(component, /review\.review_text/)
})
```

扩展 `detailSeoSafety.test.js`：服务器 Product schema 只有在获取到已发布可见评价时才展开 `buildReviewSchemaParts`；读取异常由 `try/catch` 降级，产品路由仍返回页面。

- [ ] **Step 2: 运行测试并确认当前固定评价导致失败**

Run: `node --test test/productReviewSeo.test.js test/detailSeoSafety.test.js`

Expected: FAIL，原因包括共享构建函数/组件不存在，以及 `ProductDetail.vue` 仍含固定评价。

- [ ] **Step 3: 实现共享 JSON-LD、可见组件和 SSR**

创建 `shared/productReviewSeo.js`：

```js
export function buildReviewSchemaParts({ reviews = [], summary = {} } = {}) {
  if (!reviews.length || !Number(summary.reviewCount) || !Number(summary.ratingValue)) return {}
  return {
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: Number(summary.ratingValue),
      reviewCount: Number(summary.reviewCount),
      bestRating: 5,
      worstRating: 1
    },
    review: reviews.map(item => ({
      '@type': 'Review',
      ...(item.review_title ? { name: item.review_title } : {}),
      author: { '@type': 'Person', name: item.author_name },
      datePublished: item.review_date,
      reviewRating: {
        '@type': 'Rating', ratingValue: Number(item.rating), bestRating: 5, worstRating: 1
      },
      reviewBody: item.review_text
    }))
  }
}
```

`ProductReviews.vue` 接收 `reviews`、`summary`、`pagination`，用普通文本插值显示作者、日期、评分、正文、验证购买和激励披露，提供“加载更多”。`ProductDetail.vue` 在产品加载完成后调用当前语言公共接口，并在模板中渲染组件；移除固定评价块。客户端更新 `product-jsonld` 时展开同一个 `buildReviewSchemaParts()`，不得自行编造数量或正文。

服务器产品详情中同步读取首屏 10 条当前语言可见评价，生成语义 HTML 并加入 `ssrContent`，同时：

```js
const reviewParts = buildReviewSchemaParts(publicReviews)
Object.assign(productSchema, reviewParts)
```

读取评价放在独立 `try/catch` 中；错误时 `publicReviews={ reviews: [], summary: { ratingValue: 0, reviewCount: 0 } }`。初始状态增加当前产品的评价数据，避免 hydration 再请求一次。非英语查询只返回 source hash 有效的目标语言评价。

- [ ] **Step 4: 运行 SEO 测试、完整测试和构建**

Run: `node --test test/productReviewSeo.test.js test/detailSeoSafety.test.js test/productReviewCore.test.js`

Run: `npm test`

Run: `npm run build`

Expected: 目标测试和完整测试 0 FAIL；生产构建成功；无固定评价字符串。

- [ ] **Step 5: 提交前台和 SEO/GEO 集成**

```bash
git add shared/productReviewSeo.js src/components/ProductReviews.vue src/views/ProductDetail.vue server/index.js test/productReviewSeo.test.js test/detailSeoSafety.test.js
git commit -m "feat: deliver visible localized product reviews"
```

---

### Task 7：缓存失效、接口文档和部署验证

**Files:**
- Create: `test/productReviewDelivery.test.js`
- Modify: `server/services/productReviews.js`
- Modify: `server/routes/product-reviews.js`
- Modify: `server/routes/external-api.js`
- Modify: `scripts/verifySeoDelivery.mjs`
- Modify: `TRANSLATION_SYSTEM_GUIDE.md`
- Modify: `UPDATE-GUIDE.md`

**Interfaces:**
- Consumes: 评价写操作、翻译同步、`seo_render_cache` 和公开产品详情验证器。
- Produces: `invalidateProductReviewSeoCache(productId, lang?)`、评价 API 文档、自动化 SEO/GEO 交付门禁。

- [ ] **Step 1: 写缓存和交付失败测试**

创建 `test/productReviewDelivery.test.js`：

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('every review mutation invalidates product SEO render cache', () => {
  const service = fs.readFileSync(new URL('../server/services/productReviews.js', import.meta.url), 'utf8')
  assert.match(service, /invalidateProductReviewSeoCache/)
  for (const operation of ['create', 'bulkCreate', 'update', 'remove', 'bulkStatus', 'publishAll']) {
    const body = service.match(new RegExp(`${operation}\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\n\\s*\\}`))?.[1] || ''
    assert.match(body, /invalidateProductReviewSeoCache/, operation)
  }
})

test('delivery verification checks visible reviews and JSON-LD parity when reviews exist', () => {
  const verifier = fs.readFileSync(new URL('../scripts/verifySeoDelivery.mjs', import.meta.url), 'utf8')
  assert.match(verifier, /product-jsonld/)
  assert.match(verifier, /aggregateRating/)
  assert.match(verifier, /reviewBody/)
  assert.match(verifier, /visible review/i)
})
```

- [ ] **Step 2: 运行测试并确认缓存/交付门禁缺失**

Run: `node --test test/productReviewDelivery.test.js`

Expected: FAIL，原因是评价写操作尚未统一清缓存，交付验证尚未核对可见评价。

- [ ] **Step 3: 实现缓存失效、文档和验证器**

在领域服务注入 `invalidateProductReviewSeoCache(productId, lang)`；默认实现删除 `seo_render_cache` 中匹配 `/products/<slug>` 的所有语言 URL，翻译完成时只删除目标语言 URL。所有新增、编辑、删除、状态和翻译同步成功后调用；清缓存失败只记录警告，不回滚已成功的评价写入。

扩展 `verifySeoDelivery.mjs`，新增并调用以下一致性检查函数：

```js
export function verifyProductReviewParity({ html, productSchema, payload }) {
  if (!payload.reviews.length) {
    if (/Verified Buyer|Excellent quality and service\.|"reviewCount"\s*:\s*"?89/.test(html)) {
      throw new Error('Legacy fixed review content remains in product HTML')
    }
    return
  }
  const visible = payload.reviews[0]
  const schemaReview = productSchema.review?.[0]
  if (!html.includes(escapeHtml(visible.review_text))) throw new Error('Visible review text is missing from SSR HTML')
  if (schemaReview?.author?.name !== visible.author_name) throw new Error('Review author differs between page and JSON-LD')
  if (schemaReview?.datePublished !== visible.review_date) throw new Error('Review date differs between page and JSON-LD')
  if (Number(schemaReview?.reviewRating?.ratingValue) !== Number(visible.rating)) throw new Error('Review rating differs between page and JSON-LD')
  if (schemaReview?.reviewBody !== visible.review_text) throw new Error('Review body differs between page and JSON-LD')
  if (Number(productSchema.aggregateRating?.reviewCount) !== Number(payload.summary.reviewCount)) throw new Error('Review count differs between API and JSON-LD')
  if (Number(productSchema.aggregateRating?.ratingValue) !== Number(payload.summary.ratingValue)) throw new Error('Average rating differs between API and JSON-LD')
}
```

更新外部 API 文档和 `TRANSLATION_SYSTEM_GUIDE.md`，写明 `reviews` 范围、外部新增固定待审核、批量上限、幂等 `external_id`、三种日期格式和发布流程。`UPDATE-GUIDE.md` 增加部署后管理员/API/翻译/产品详情验收命令。

- [ ] **Step 4: 执行最终验证矩阵**

Run: `npm test`

Run: `Get-ChildItem server -Recurse -File -Include *.js | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE -ne 0) { throw "Syntax failed: $($_.FullName)" } }`

Run: `npm run build`

Run: `git diff --check`

Expected: 所有测试 0 FAIL；全部服务端 JS 语法通过；Vite 构建成功；差异检查无输出。

- [ ] **Step 5: 提交交付门禁和文档**

```bash
git add server/services/productReviews.js server/routes/product-reviews.js server/routes/external-api.js scripts/verifySeoDelivery.mjs TRANSLATION_SYSTEM_GUIDE.md UPDATE-GUIDE.md test/productReviewDelivery.test.js
git commit -m "test: verify product review SEO delivery"
```

---

### Task 8：最终审查、GitHub 推送和服务器更新交接

**Files:**
- Verify: 本计划中全部新增和修改文件
- Verify: `docs/superpowers/specs/2026-08-01-product-review-management-translation-design.md`
- Verify: `docs/superpowers/plans/2026-08-01-product-review-management-translation.md`

**Interfaces:**
- Consumes: 任务 1–7 的提交和验证结果。
- Produces: 可部署的 `main`、远端 SHA 一致性证据和中文服务器验收步骤。

- [ ] **Step 1: 按设计逐项检查实现范围**

Run:

```powershell
$patterns = @(
  'Math.random', 'Verified Buyer', "reviewCount': '89", 'Excellent quality and service.'
)
$files = Get-ChildItem server,src,shared -Recurse -File -Include *.js,*.vue
foreach ($pattern in $patterns) {
  $hits = $files | Select-String -SimpleMatch $pattern
  if ($hits) { $hits; throw "Unsafe review pattern remains: $pattern" }
}
```

Expected: 无危险固定评价或随机评分残留。

- [ ] **Step 2: 重新运行完整测试与生产构建**

Run: `npm test`

Run: `npm run build`

Run: `git diff --check`

Expected: 0 FAIL；构建退出码 0；差异检查无输出。

- [ ] **Step 3: 检查提交和工作区**

Run: `git status --short --branch`

Run: `git log -10 --oneline --decorate`

Run: `git show --check --stat --oneline HEAD`

Expected: 只有计划中明确的文件；提交顺序对应数据库、领域、API、翻译、后台、前台和交付验证。

- [ ] **Step 4: 推送 GitHub main 并核对 SHA**

Run: `git push git@github.com:jameson99799/steel-trader-website.git main:main`

Run:

```powershell
$localSha = git rev-parse HEAD
$remoteSha = (git ls-remote git@github.com:jameson99799/steel-trader-website.git refs/heads/main -split "`t")[0]
if ($localSha -ne $remoteSha) { throw 'GitHub main 与本地 HEAD 不一致' }
```

Expected: GitHub `main` SHA 与本地 `HEAD` 完全一致；禁止强制推送。

- [ ] **Step 5: 服务器部署与验收**

服务器运行：

```bash
cd /www/wwwroot/steel-trader
bash server-update.sh
```

部署后验证：

```bash
pm2 list
node scripts/verifySeoDelivery.mjs
curl -s -o /dev/null -w "产品详情 HTTP %{http_code}\n" \
  "http://127.0.0.1:3001/en/products/galvanized-steel-coil-hot-dip-gi-coil-z40-z275"
```

Expected: PM2 只有 ubuntu 用户的一份 `led-trade` 进程；产品详情 HTTP 200；SEO 验证通过。随后在后台录入一条真实评价、翻译到一个目标语言，检查英语页和目标语言页只显示各自语言，最后用 Google Rich Results Test 验证 Product/Review 结构化数据；Google 是否展示富媒体结果不作保证。
