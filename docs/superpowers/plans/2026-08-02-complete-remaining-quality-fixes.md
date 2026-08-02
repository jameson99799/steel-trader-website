# 剩余质量问题完整修复实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 在不改写现有业务数据的前提下，补齐翻译队列表、favicon 兜底、ECharts 按需构建、真实评价覆盖统计和全站三视口自动检查。

**架构：** 数据库和 favicon 逻辑分别抽成小型服务并由现有启动流程调用；评价覆盖沿用现有 product review store/route/api/admin 分层；全站检查作为只读脚本独立运行。所有行为变化均使用 Node 原生测试先证明失败再实现。

**技术栈：** Node.js 20、Express、better-sqlite3、Vue 3、Vite 5、ECharts 6、Puppeteer 24、Sharp、Node `node:test`。

## 全局约束

- 不删除或重建正式数据库，不删除任何产品、新闻、媒体、翻译或评价记录。
- 数据库迁移必须幂等；已有 `translation_tasks` 表和记录必须原样保留。
- 评价覆盖统计只读，不生成、补齐或发布虚构评价。
- 同一评价的多语言翻译不重复计入产品评价总数。
- favicon 后台配置优先，静态品牌图标只作兜底。
- 自动检查不得写入网站或数据库。
- 所有计划、进度和交付说明使用中文。

---

### 任务 1：补齐翻译任务表迁移

**文件：**
- 新建：`server/services/translationTaskSchema.js`
- 修改：`server/db.js`
- 新建测试：`test/translationTaskSchema.test.js`

**接口：**
- 产出：`initializeTranslationTaskSchema(db)`，接收 better-sqlite3 数据库实例，无返回值。
- 依赖：只使用传入实例的 `exec`/`prepare`，不打开文件数据库。

- [ ] **步骤 1：先写失败测试**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { initializeTranslationTaskSchema } from '../server/services/translationTaskSchema.js'

test('creates the translation queue schema required by the worker', () => {
  const db = new Database(':memory:')
  initializeTranslationTaskSchema(db)
  const columns = db.prepare('PRAGMA table_info(translation_tasks)').all().map(row => row.name)
  assert.deepEqual(columns, [
    'id', 'target_lang', 'item_type', 'item_id', 'item_name', 'status',
    'retry_count', 'error_message', 'created_at', 'updated_at'
  ])
  db.close()
})

test('is idempotent and preserves existing queue rows', () => {
  const db = new Database(':memory:')
  initializeTranslationTaskSchema(db)
  db.prepare(`INSERT INTO translation_tasks
    (target_lang, item_type, item_id, item_name) VALUES ('zh', 'news', 7, 'News 7')`).run()
  initializeTranslationTaskSchema(db)
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM translation_tasks').get().count, 1)
  db.close()
})
```

- [ ] **步骤 2：运行测试并确认 RED**

运行：`node --test test/translationTaskSchema.test.js`

预期：因模块不存在或表结构不存在而失败。

- [ ] **步骤 3：实现最小迁移并接入数据库初始化**

```js
export function initializeTranslationTaskSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS translation_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_lang TEXT NOT NULL,
      item_type TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      item_name TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_translation_tasks_status_id
      ON translation_tasks(status, id);
    CREATE INDEX IF NOT EXISTS idx_translation_tasks_target_item
      ON translation_tasks(target_lang, item_type, item_id);
  `)
}
```

在 `server/db.js` 的翻译表初始化位置调用 `initializeTranslationTaskSchema(db)`。

- [ ] **步骤 4：运行目标测试和数据库相关测试**

运行：`node --test test/translationTaskSchema.test.js test/productReviewSchema.test.js`

预期：全部通过，重复初始化后记录仍存在。

- [ ] **步骤 5：提交**

```bash
git add server/services/translationTaskSchema.js server/db.js test/translationTaskSchema.test.js
git commit -m "fix: initialize translation task queue"
```

---

### 任务 2：增加确定性 favicon 兜底

**文件：**
- 新建：`server/services/favicon.js`
- 修改：`server/index.js`
- 新建：`public/favicon.ico`
- 新建：`public/favicon-16.png`
- 新建：`public/favicon-32.png`
- 新建：`public/favicon-192.png`
- 新建：`public/apple-touch-icon.png`
- 新建测试：`test/faviconDelivery.test.js`

**接口：**
- 产出：`FAVICON_SIZES`、`resolveFaviconSource({ company, projectRoot, filename, exists })` 和 `createFaviconHandler(dependencies)`。
- 数据流：后台 favicon → 后台 logo → 对应 `public` 静态品牌文件；不扫描任意上传文件。

- [ ] **步骤 1：写失败测试**

```js
test('uses the packaged brand icon when company assets are unavailable', () => {
  const source = resolveFaviconSource({
    company: { favicon: '', logo: '' },
    projectRoot: '/app',
    filename: 'favicon-32.png',
    exists: value => value === '/app/public/favicon-32.png'
  })
  assert.equal(source, '/app/public/favicon-32.png')
})

test('prefers the configured company favicon over the packaged fallback', () => {
  const source = resolveFaviconSource({
    company: { favicon: '/uploads/brand.png', logo: '/uploads/logo.png' },
    projectRoot: '/app',
    filename: 'favicon.ico',
    exists: value => value === '/app/uploads/brand.png'
  })
  assert.equal(source, '/app/uploads/brand.png')
})
```

- [ ] **步骤 2：运行测试并确认 RED**

运行：`node --test test/faviconDelivery.test.js`

预期：因 favicon 服务模块不存在而失败。

- [ ] **步骤 3：下载当前正式品牌图标并生成固定尺寸资源**

使用 `https://www.sunseasteel.com/favicon-192.png` 作为用户自有品牌源图，通过 Sharp 生成 16、32、180、192 像素 PNG 和 32 像素 ICO 兼容文件；逐个使用 Sharp metadata 验证 1:1 尺寸。

- [ ] **步骤 4：实现 favicon 服务并替换内联路由**

`resolveFaviconSource` 必须只接受项目根目录内的 `/uploads/` 配置路径，找不到时回退到 `public/<filename>`。处理器保持 `Cache-Control: public, max-age=86400`，PNG 路径返回 `image/png`，ICO 路径返回 `image/x-icon`。

- [ ] **步骤 5：运行目标测试与静态资源验证**

运行：`node --test test/faviconDelivery.test.js`

运行：`node -e "const sharp=require('sharp'); Promise.all(['favicon-16.png','favicon-32.png','favicon-192.png','apple-touch-icon.png'].map(async f=>console.log(f,await sharp('public/'+f).metadata())))"`

预期：测试通过；尺寸分别为 16、32、192、180，均为正方形。

- [ ] **步骤 6：提交**

```bash
git add server/services/favicon.js server/index.js public/favicon.ico public/favicon-16.png public/favicon-32.png public/favicon-192.png public/apple-touch-icon.png test/faviconDelivery.test.js
git commit -m "fix: provide stable favicon fallback"
```

---

### 任务 3：ECharts 按需注册和分包

**文件：**
- 修改：`src/views/FuturesPrice.vue`
- 修改：`vite.config.js`
- 新建测试：`test/echartsBundle.test.js`

**接口：**
- 页面继续使用本地名称 `echarts`，但该对象由 `use([LineChart, CandlestickChart, GridComponent, TooltipComponent, AxisPointerComponent, MarkLineComponent, DataZoomComponent, CanvasRenderer])` 注册后的核心 API 提供。

- [ ] **步骤 1：写失败的静态约束测试**

```js
test('futures page uses ECharts core modules instead of the full package', () => {
  const source = readFileSync('src/views/FuturesPrice.vue', 'utf8')
  assert.doesNotMatch(source, /import \* as echarts from ['"]echarts['"]/)
  for (const token of [
    "from 'echarts/core'", "from 'echarts/charts'", "from 'echarts/components'",
    "from 'echarts/renderers'", 'LineChart', 'CandlestickChart', 'CanvasRenderer'
  ]) assert.match(source, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
})

test('vite does not force the complete echarts package into vendor-chart', () => {
  const source = readFileSync('vite.config.js', 'utf8')
  assert.doesNotMatch(source, /['"]vendor-chart['"]\s*:\s*\[['"]echarts['"]\]/)
})
```

- [ ] **步骤 2：运行测试并确认 RED**

运行：`node --test test/echartsBundle.test.js`

预期：命中完整包导入和固定 `vendor-chart` 配置而失败。

- [ ] **步骤 3：实现按需注册**

在 `FuturesPrice.vue` 注册页面当前用到的折线图、K 线图、网格、提示框、坐标轴指示器、标记线、数据缩放和 Canvas 渲染器；保留 `echarts.graphic.LinearGradient`、`init`、`getInstanceByDom` 调用方式。

从 `vite.config.js` 移除完整 `echarts` 的固定 manual chunk，保留 Vue 和编辑器分包。

- [ ] **步骤 4：运行测试和生产构建**

运行：`node --test test/echartsBundle.test.js`

运行：`npm run build`

预期：测试和构建通过；不再生成约 1.1MB 的完整 `vendor-chart` 包，期货页面仍为异步页面块。

- [ ] **步骤 5：提交**

```bash
git add src/views/FuturesPrice.vue vite.config.js test/echartsBundle.test.js
git commit -m "perf: load only required echarts modules"
```

---

### 任务 4：后台真实评价覆盖统计

**文件：**
- 修改：`server/services/productReviews.js`
- 修改：`server/routes/product-reviews.js`
- 修改：`src/api/index.js`
- 修改：`src/views/admin/Reviews.vue`
- 新建测试：`test/productReviewCoverage.test.js`
- 修改测试：`test/productReviewAdminUi.test.js`

**接口：**
- Store：`listCoverage({ categoryId, page, limit }) -> { data, total, page, limit, targetMinimum: 8 }`
- Route：`GET /api/product-reviews/admin-coverage?categoryId=&page=&limit=`，必须经过 `authMiddleware`。
- API：`getProductReviewCoverage(params)`。
- 每行字段：`product_id`、`product_name_en`、`category_id`、`category_name_en`、`published_count`、`pending_count`、`hidden_count`、`translation_count`、`needs_attention`。

- [ ] **步骤 1：写 Store 和路由失败测试**

测试 SQL 必须从 `products` 左连接 `product_reviews`，保证零评价产品也出现；翻译数量从 `product_review_translations` 单独聚合，避免连接乘法导致评价重复计数。

```js
test('coverage includes products with zero reviews and counts statuses independently', () => {
  const result = store.listCoverage({ categoryId: 3, page: 1, limit: 20 })
  assert.equal(result.targetMinimum, 8)
  assert.equal(result.data[0].published_count, 0)
  assert.equal(result.data[0].needs_attention, true)
})
```

路由测试确认 `/admin-coverage` 注册在 `/admin/:id` 之前，避免被当作评价 ID。

- [ ] **步骤 2：运行目标测试并确认 RED**

运行：`node --test test/productReviewCoverage.test.js test/productReviewRoutes.test.js`

预期：因 `listCoverage` 和路由不存在而失败。

- [ ] **步骤 3：实现只读聚合和受保护路由**

使用两个预聚合子查询：评价状态按 `product_id` 聚合；翻译按评价所属产品聚合。产品总数与数据查询使用相同的产品状态和分类条件。`categoryId` 必须是正整数，`limit` 限制为 1–100。

- [ ] **步骤 4：写后台 UI 失败测试**

断言 `Reviews.vue` 包含“评价覆盖”、`published_count`、`pending_count`、`translation_count`、`needs_attention` 和 `getProductReviewCoverage`，并包含加载、空状态和错误状态。

- [ ] **步骤 5：实现 API 与覆盖表格**

评价页在管理范围下方显示覆盖卡片；分类变化时刷新覆盖统计；表格明确标记“已发布少于 8 条”，并提供选择该产品后进入现有评价列表的按钮。覆盖加载失败只显示局部错误，不阻断评价管理。

- [ ] **步骤 6：运行评价全套测试**

运行：`node --test test/productReviewCoverage.test.js test/productReviewAdminUi.test.js test/productReviewCore.test.js test/productReviewRoutes.test.js test/productReviewTranslation.test.js test/productReviewSeo.test.js`

预期：全部通过，现有审核、翻译和 SEO 交付行为无回归。

- [ ] **步骤 7：提交**

```bash
git add server/services/productReviews.js server/routes/product-reviews.js src/api/index.js src/views/admin/Reviews.vue test/productReviewCoverage.test.js test/productReviewAdminUi.test.js
git commit -m "feat: report authentic review coverage"
```

---

### 任务 5：新增全站 SEO 和三视口只读检查

**文件：**
- 新建：`scripts/verifyPublicExperience.mjs`
- 新建测试：`test/publicExperienceVerification.test.js`
- 修改：`package.json`
- 修改：`UPDATE-GUIDE.md`

**接口：**
- `discoverSitemapUrls(fetchImpl, baseUrl) -> Promise<string[]>`
- `validateSeoDocument({ html, url, template }) -> string[]`
- `verifyHttpUrls({ fetchImpl, urls, concurrency }) -> Promise<Result[]>`
- `verifyViewport({ browser, url, viewport }) -> Promise<Issue[]>`
- CLI：`PUBLIC_SITE_URL=https://www.sunseasteel.com npm run verify:public`。

- [ ] **步骤 1：写失败的纯函数测试**

```js
test('discovers nested sitemap URLs without duplicates', async () => {
  const urls = await discoverSitemapUrls(fakeFetch, 'https://example.com')
  assert.deepEqual(urls, ['https://example.com/en/about', 'https://example.com/en/products/a'])
})

test('reports missing canonical, hreflang, H1 and invalid JSON-LD', () => {
  const issues = validateSeoDocument({ html: '<html><head><title>X</title></head><body></body></html>', url: 'https://example.com/en/about', template: 'about' })
  assert.deepEqual(issues.map(issue => issue.code), [
    'meta-description-missing', 'canonical-missing', 'hreflang-missing', 'h1-missing'
  ])
})
```

- [ ] **步骤 2：运行测试并确认 RED**

运行：`node --test test/publicExperienceVerification.test.js`

预期：因验证模块不存在而失败。

- [ ] **步骤 3：实现站点地图、HTTP 和 SEO 文档检查**

脚本必须递归处理 sitemap index 和 urlset、去重 URL、默认并发 6，并输出 `URL | 检查代码 | 说明`。JSON-LD 只要求现有脚本类型的内容能解析，不要求每种模板都有 Product schema。

- [ ] **步骤 4：实现三视口模板检查**

从全部 URL 中为每种页面模板选择一个代表 URL，使用 390×844、820×1180、1440×900。检查：

```js
document.documentElement.scrollWidth <= window.innerWidth + 1
```

同时收集 `pageerror`、资源加载失败和主要内容图片 `naturalWidth === 0`。第三方聊天、分析或浏览器扩展错误列为 warning，不阻断；本站脚本、CSS和图片失败列为 error。

- [ ] **步骤 5：增加命令和中文更新说明**

`package.json` 增加：

```json
"verify:public": "node scripts/verifyPublicExperience.mjs"
```

`UPDATE-GUIDE.md` 增加更新后的只读验证命令、预计耗时和失败输出说明。

- [ ] **步骤 6：运行测试和本地代表模板检查**

运行：`node --test test/publicExperienceVerification.test.js`

运行：`PUBLIC_SITE_URL=http://127.0.0.1:3001 npm run verify:public`

预期：测试通过；脚本对本地公开页面输出汇总且不写入数据库。

- [ ] **步骤 7：提交**

```bash
git add scripts/verifyPublicExperience.mjs test/publicExperienceVerification.test.js package.json UPDATE-GUIDE.md
git commit -m "test: add public experience verification"
```

---

### 任务 6：完整验证、数据库副本检查与发布

**文件：**
- 只验证前述改动；如发现问题，回到对应任务按 RED–GREEN 修复。

- [ ] **步骤 1：运行完整自动测试**

运行：`npm test`

预期：全部测试通过，失败数为 0。

- [ ] **步骤 2：检查服务器 JavaScript 语法**

对 `server` 下全部 `.js` 文件执行 `node --check`。

预期：全部退出码为 0。

- [ ] **步骤 3：运行生产构建并记录产物大小**

运行：`npm run build`

预期：构建退出码为 0；不再出现约 1.1MB 的完整 ECharts 公共块。

- [ ] **步骤 4：在数据库副本上验证迁移安全**

使用 better-sqlite3 在线 backup 创建临时副本；记录迁移前后的 `products`、`media`、`news`、`translations`、`product_reviews` 数量；运行迁移两次；确认 `PRAGMA integrity_check` 为 `ok`、`PRAGMA foreign_key_check` 无记录且核心数量不变。

- [ ] **步骤 5：运行本地服务和三视口验证**

使用临时数据库和非默认端口启动生产服务，依次验证 favicon、全部站点地图、公开 URL、SEO 文档和三视口模板；结束后停止临时服务。

- [ ] **步骤 6：运行正式域名只读验证**

运行：`PUBLIC_SITE_URL=https://www.sunseasteel.com npm run verify:public`

正式服务器尚未更新时，只记录旧版本差异；不得把“尚未部署”误报为代码失败。

- [ ] **步骤 7：检查差异并推送**

运行：`git diff --check`、`git status -sb`、`git log --oneline origin/main..HEAD`。

确认只包含本计划文件后，将工作分支快进合并到 `main`，再次运行完整测试和构建，再执行 `git push origin main`，最后使用 `git ls-remote origin refs/heads/main` 核对远程哈希。
