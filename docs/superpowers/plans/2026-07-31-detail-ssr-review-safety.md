# 产品与新闻详情页 SSR 安全修复实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移除详情页请求期间自动生成的评价数据，恢复产品和新闻详情直刷，并让部署脚本阻止旧 HTML/JS 或详情页 500 被误报为发布成功。

**Architecture:** 服务端继续在初始 HTML 中生成 Product、Offer、Article、FAQ 和面包屑结构化数据，但评价不再是 SSR 依赖，也不再由页面请求写入数据库。发布验证器以同一组本地和公网地址检查详情页状态，并比较入口 JS 文件名和可访问性。

**Tech Stack:** Node.js 20、Express、SQLite、Vue 3、Vite、Node `node:test`。

## 全局约束

- 不开发新的评价后台或前台组件。
- 不删除或迁移生产数据库中的 `seo_reviews` 历史数据。
- 不修改产品、新闻、翻译和上传文件等业务数据。
- 不输出自动生成、固定编造或页面不可见的评价结构化数据。
- 保留 `ProductDetail.vue` 中已经恢复的 `images` 与 `.thumbnail-btn` 绑定。
- 所有规划、测试说明和交付说明使用中文。

---

### 任务 1：移除详情页自动评价依赖

**Files:**
- Create: `test/detailSeoSafety.test.js`
- Modify: `server/index.js:542-606`
- Modify: `server/index.js:752-810`
- Modify: `server/index.js:925-975`

**Interfaces:**
- Consumes: `jsonLd(object, id)` 以及现有 Product、Offer、Article schema 对象。
- Produces: 不读取或写入 `seo_reviews` 的产品和新闻详情 SSR；Product schema 仍包含 `offers`，Article schema 仍包含标准文章字段。

- [ ] **Step 1: 写入会失败的源码回归测试**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../server/index.js', import.meta.url), 'utf8')

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
```

- [ ] **Step 2: 运行测试并确认按预期失败**

Run: `node --test test/detailSeoSafety.test.js`

Expected: 两个测试因为 `getOrGenerateSeoReviews`、`INSERT INTO seo_reviews`、`aggregateRating` 和 `review` 仍存在而失败。

- [ ] **Step 3: 删除自动评价生成器及产品评价字段**

在 `server/index.js` 中完整删除 `getOrGenerateSeoReviews` 函数；产品 schema 保留下列结构，不增加评价字段：

```js
const persistentPrice = generatePersistentPrice(product.id)
const productSchema = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: pName,
  description: pageDesc.substring(0, 500),
  url: pageCanonical,
  brand: { '@type': 'Brand', name: companyNameTranslated },
  manufacturer: { '@type': orgType, name: companyNameTranslated, url: siteUrl },
  offers: {
    '@type': 'Offer',
    url: pageCanonical,
    priceCurrency: 'USD',
    price: persistentPrice.toString(),
    priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    validFrom: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0],
    itemCondition: 'https://schema.org/NewCondition',
    availability: 'https://schema.org/InStock',
    seller: { '@type': orgType, name: companyName },
    hasMerchantReturnPolicy: productSchemaReturnPolicy,
    shippingDetails: productSchemaShippingDetails
  }
}
```

实现时保留现有内联 `hasMerchantReturnPolicy` 和 `shippingDetails` 对象，不创建上面示意名称的额外变量。

- [ ] **Step 4: 删除 Article 的自动评价字段**

`articleSchema` 保留 `headline`、`description`、`url`、发布日期、修改日期、图片、作者、发布者和 `mainEntityOfPage`，删除 `dbNewsReviews`、`avgNewsRating`、`aggregateRating` 与 `review`。

- [ ] **Step 5: 运行目标测试和现有缩略图测试**

Run: `node --test test/detailSeoSafety.test.js test/productDetailGallery.test.js`

Expected: 4 tests pass，0 tests fail。

- [ ] **Step 6: 提交该独立修复**

```bash
git add server/index.js test/detailSeoSafety.test.js
git commit -m "fix: remove synthetic detail reviews"
```

### 任务 2：增强发布验证器

**Files:**
- Modify: `scripts/verifySeoDelivery.mjs`
- Modify: `test/seoDelivery.test.js`

**Interfaces:**
- Consumes: `verifySeoDelivery({ fetchImpl, localBaseUrl, publicBaseUrl, productPath, newsPath })`。
- Produces: Promise；所有页面、站点地图和入口 JS 均一致可用时 resolve，任一检查失败时抛出包含检查对象名称的 Error。

- [ ] **Step 1: 扩展成功测试所需的模拟响应**

在现有成功测试中使用相同入口文件：

```js
const shell = canonical => `<html><head>
  <link rel="canonical" href="${canonical}">
  <script type="application/ld+json">{"@type":"Thing"}</script>
  <script type="module" src="/assets/index-current.js"></script>
</head><body><main><h1>Page</h1></main></body></html>`

const responses = new Map([
  ['http://local/en/about', new Response(shell('https://www.sunseasteel.com/en/about'))],
  ['http://local/en/products/sample', new Response(shell('https://www.sunseasteel.com/en/products/sample'))],
  ['http://local/en/news/sample', new Response(shell('https://www.sunseasteel.com/en/news/sample'))],
  ['https://public/en/about', new Response(shell('https://www.sunseasteel.com/en/about'))],
  ['https://public/en/products/sample', new Response(shell('https://www.sunseasteel.com/en/products/sample'))],
  ['https://public/en/news/sample', new Response(shell('https://www.sunseasteel.com/en/news/sample'))],
  ['https://public/assets/index-current.js', new Response('console.log("ok")')]
])
```

调用参数增加：

```js
productPath: '/en/products/sample',
newsPath: '/en/news/sample'
```

- [ ] **Step 2: 添加四个失败场景测试**

分别构造并断言：产品详情 HTTP 500、新闻详情 HTTP 500、本地与公网 JS 文件名不同、公网 JS HTTP 404。断言信息必须分别匹配：

```js
/public product detail: HTTP 500/
/public news detail: HTTP 500/
/entry asset differs/
/public entry asset: HTTP 404/
```

- [ ] **Step 3: 运行测试并确认新场景失败**

Run: `node --test test/seoDelivery.test.js`

Expected: 新增场景失败，因为当前验证器尚未请求详情页，也未比较或请求入口 JS。

- [ ] **Step 4: 实现 HTML 和入口资源校验**

在 `scripts/verifySeoDelivery.mjs` 中新增：

```js
function entryAsset(body, label) {
  const match = body.match(/<script\b[^>]*\bsrc=["']([^"']*\/assets\/index-[^"']+\.js)["']/i)
  if (!match) throw new Error(`${label}: entry asset is missing`)
  return match[1]
}

function validateDetail({ body }, label, pathname) {
  if (!/<script\b[^>]*\btype=["']application\/ld\+json["']/i.test(body)) {
    throw new Error(`${label}: server JSON-LD is missing`)
  }
  if (!/<(?:main|article|h1)\b/i.test(body)) {
    throw new Error(`${label}: server-readable detail content is missing`)
  }
  const canonical = [...body.matchAll(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi)][0]?.[1]
  if (!canonical || new URL(canonical).pathname !== pathname) {
    throw new Error(`${label}: canonical does not match ${pathname}`)
  }
}
```

扩展 `verifySeoDelivery` 参数，并通过 `Promise.all` 请求本地/公网 About、产品详情、新闻详情和站点地图。比较本地与公网 About HTML 中的入口文件名；一致后请求 `new URL(publicEntry, publicBaseUrl)`，通过现有 `fetchText` 的非 2xx 处理确保资源可访问。

- [ ] **Step 5: CLI 从本地公开 API 发现有效 slug**

新增只读发现逻辑：

```js
async function discoverPath(fetchImpl, baseUrl, apiPath, routePrefix, label) {
  const response = await fetchImpl(new URL(apiPath, `${baseUrl.replace(/\/+$/, '')}/`), {
    signal: AbortSignal.timeout(15000)
  })
  if (!response.ok) throw new Error(`${label}: HTTP ${response.status}`)
  const payload = await response.json()
  const first = Array.isArray(payload) ? payload[0] : payload.data?.[0]
  if (!first?.slug) throw new Error(`${label}: no published slug found`)
  return `${routePrefix}/${first.slug}`
}
```

`runCli()` 从 `http://127.0.0.1:${port}/api/products?limit=1` 和 `/api/news?limit=1` 获取 slug，然后传入 `verifySeoDelivery`。

- [ ] **Step 6: 运行发布验证测试**

Run: `node --test test/seoDelivery.test.js`

Expected: 所有发布验证测试通过，0 tests fail。

- [ ] **Step 7: 提交发布门禁增强**

```bash
git add scripts/verifySeoDelivery.mjs test/seoDelivery.test.js
git commit -m "test: verify public detail routes and assets"
```

### 任务 3：全量验证、提交计划并发布

**Files:**
- Modify: `docs/superpowers/plans/2026-07-31-detail-ssr-review-safety.md`（只更新复选框状态时使用）

**Interfaces:**
- Consumes: 项目 `npm test`、`npm run build`、Git `main` 分支和 `origin` 远端。
- Produces: 已验证并推送的 GitHub `main`，供服务器执行 `bash server-update.sh`。

- [ ] **Step 1: 运行完整测试**

Run: `npm test`

Expected: 所有测试通过，0 tests fail。

- [ ] **Step 2: 运行生产构建**

Run: `npm run build`

Expected: Vite 输出 `built in ...`，进程退出码为 0；chunk size warning 可记录但不视为失败。

- [ ] **Step 3: 检查改动范围和空白错误**

```bash
git diff --check
git status --short
git log -5 --oneline
```

Expected: `git diff --check` 无输出；状态中只包含本计划相关文件。

- [ ] **Step 4: 提交实施计划**

```bash
git add docs/superpowers/plans/2026-07-31-detail-ssr-review-safety.md
git commit -m "docs: plan safe detail SSR reviews"
```

- [ ] **Step 5: 推送 GitHub**

Run: `git push origin main`

Expected: 远端 `main` 更新到本次最后一个提交。

- [ ] **Step 6: 核对远端提交**

Run: `git ls-remote origin refs/heads/main`

Expected: 远端 SHA 与 `git rev-parse HEAD` 完全一致。
