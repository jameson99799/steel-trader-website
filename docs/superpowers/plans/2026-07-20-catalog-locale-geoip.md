# 分类可见性、语言落地和客服 IP 识别 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为产品分类增加安全的前台隐藏开关，并让首次搜索落地按可信国家识别选择语言，同时改进客服 IP 识别。

**Architecture:** `catalogVisibility` 是所有公开分类/产品输出共用的可见性服务；`geoip` 只使用 Express 已解析的 `req.ip`，并为聊天和语言中间件提供缓存后的 ISO 国家码。语言中间件仅对首次外部搜索落地发出一次 302，前端手动选择会写入优先级更高的 cookie。

**Tech Stack:** Node.js ESM、Express、better-sqlite3、Vue 3、Node `node:test`、Vite。

## Global Constraints

- 不得提交 `data/database.db`、任何 `*.db`、GeoIP 文件或 API 密钥。
- 既有分类迁移后默认 `is_enabled = 1`；关闭父分类不修改子分类记录。
- 产品、分类、SSR、sitemap 和客服快捷链接均复用同一可见性规则。
- 自动语言跳转仅限首次外部搜索落地，使用 HTTP 302；手动语言选择和已有 cookie 永远优先。
- 只使用可信反向代理解析后的 `req.ip`，不直接信任 `X-Forwarded-For` 或 `CF-Connecting-IP`。
- GeoIP 失败不得中断页面、产品接口或聊天发送；语言回退英文。

---

## File structure

- Create `server/services/catalogVisibility.js`: 分类祖先链可见性、公开树与产品 SQL 条件。
- Create `server/services/geoip.js`: IP 规范化、私网过滤、带超时缓存的国家查询和国家语言映射。
- Create `server/middleware/localeRedirect.js`: 搜索落地 302 决策。
- Create `test/catalogVisibility.test.js`, `test/geoip.test.js`, `test/localeRedirect.test.js`: 独立的 Node 测试。
- Modify `server/db.js`, `server/routes/categories.js`, `server/routes/products.js`, `server/routes/chat.js`, `server/routes/sitemap.js`, `server/index.js`: 数据库与全部公开输出接入。
- Modify `src/views/admin/Categories.vue`, `src/api/index.js`, `src/composables/useLang.js`: 后台开关、缓存清理和手动语言 cookie。
- Modify `package.json`, `nginx.conf.example`, `UPDATE-GUIDE.md`: 测试命令与部署说明。

### Task 1: 分类可见性服务、迁移和公开输出

**Files:**
- Create: `server/services/catalogVisibility.js`
- Create: `test/catalogVisibility.test.js`
- Modify: `package.json`, `server/db.js`, `server/routes/categories.js`, `server/routes/products.js`, `server/routes/sitemap.js`, `server/index.js`, `server/routes/chat.js`, `src/views/admin/Categories.vue`, `src/api/index.js`

**Interfaces:**
- Produces: `getVisibleCategoryIds(categories): Set<number>`、`buildPublicCategoryTree(categories, productCounts): Category[]`、`visibleProductWhere(alias, ids): { clause, params }`。
- Consumes: `categories` 的 `id,parent_id,is_enabled` 与 `products.category_id,status`。

- [ ] **Step 1: 写失败测试**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { getVisibleCategoryIds, buildPublicCategoryTree, visibleProductWhere } from '../server/services/catalogVisibility.js'

const rows = [
  { id: 1, parent_id: 0, is_enabled: 1 },
  { id: 2, parent_id: 1, is_enabled: 0 },
  { id: 3, parent_id: 2, is_enabled: 1 },
  { id: 4, parent_id: 1, is_enabled: 1 }
]
test('disabled parents hide descendants without changing child state', () => {
  assert.deepEqual([...getVisibleCategoryIds(rows)], [1, 4])
})
test('public tree prunes hidden and empty branches', () => {
  assert.deepEqual(buildPublicCategoryTree(rows, new Map([[4, 2]])), [
    { id: 1, parent_id: 0, is_enabled: 1, product_count: 0, children: [
      { id: 4, parent_id: 1, is_enabled: 1, product_count: 2, children: [] }
    ] }
  ])
})
test('no visible categories cannot expose products', () => {
  assert.deepEqual(visibleProductWhere('p', new Set()), { clause: ' AND 1=0', params: [] })
})
```

- [ ] **Step 2: 运行并确认失败**

Run: `node --test test/catalogVisibility.test.js`  
Expected: FAIL，模块尚未创建。

- [ ] **Step 3: 实现最小服务和迁移**

```js
export function getVisibleCategoryIds(categories) {
  const byId = new Map(categories.map(c => [Number(c.id), c]))
  const memo = new Map()
  const visible = (id, path = new Set()) => {
    if (memo.has(id)) return memo.get(id)
    const cat = byId.get(Number(id))
    if (!cat || Number(cat.is_enabled) !== 1 || path.has(id)) return false
    const result = !cat.parent_id || visible(Number(cat.parent_id), new Set([...path, id]))
    memo.set(id, result)
    return result
  }
  return new Set(categories.filter(c => visible(Number(c.id))).map(c => Number(c.id)))
}
export function visibleProductWhere(alias, ids) {
  const values = [...ids]
  return values.length
    ? { clause: ` AND ${alias}.category_id IN (${values.map(() => '?').join(',')})`, params: values }
    : { clause: ' AND 1=0', params: [] }
}
```

在 `db.js` 的 categories 建表迁移段加入 `ALTER TABLE categories ADD COLUMN is_enabled INTEGER NOT NULL DEFAULT 1` 的幂等 try/catch 和 `idx_categories_parent_enabled`。`buildPublicCategoryTree` 只保留可见分类，递归构造 `children`，并过滤 `product_count === 0 && children.length === 0` 的节点。`package.json` 增加 `"test": "node --test"`。

- [ ] **Step 4: 接入全部消费者**

`categories.js` 的公开 `/tree` 使用 `buildPublicCategoryTree`；新增认证 `/admin/tree` 返回完整树。PUT 通过 `is_enabled === undefined ? oldValue : Number(is_enabled) ? 1 : 0` 更新开关。`products.js` 的列表、`/public/all`、详情和模糊 slug 回退都附加 `visibleProductWhere('p', visibleIds)`；隐藏产品返回既有 404。`index.js` 的产品详情、相关推荐、产品页、首页、特色产品和 initial state 查询附加同一条件；不可见分类页标记 404。`sitemap.js` 和 chat 页面快捷分类使用同一 ID 集合。

后台树每行加入：

```vue
<label class="visibility-toggle">
  <input type="checkbox" :checked="!!cat.is_enabled" @change="toggleVisibility(cat, $event.target.checked)" />
  <span>{{ cat.is_enabled ? '前台显示' : '前台隐藏' }}</span>
</label>
```

`toggleVisibility` 用 `FormData` 调用 `api.updateCategory` 后重新加载认证树；`api.updateCategory` 删除所有 `_api_cache_` 中包含 `/categories` 的键。

- [ ] **Step 5: 验证并提交**

Run: `npm test -- --test-name-pattern="disabled|public tree|no visible"`  
Expected: PASS，3 个测试通过。  
Run: `npm run build`  
Expected: PASS。  
Run: `Get-ChildItem server -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }`  
Expected: PASS。

```bash
git add package.json server/db.js server/services/catalogVisibility.js server/routes/categories.js server/routes/products.js server/routes/sitemap.js server/routes/chat.js server/index.js src/views/admin/Categories.vue src/api/index.js test/catalogVisibility.test.js
git commit -m "feat: add public category visibility controls"
```

### Task 2: 共享可信 GeoIP 和客服接入

**Files:**
- Create: `server/services/geoip.js`, `test/geoip.test.js`
- Modify: `server/db.js`, `server/routes/chat.js`, `src/views/admin/ChatSettings.vue`

**Interfaces:**
- Produces: `getClientIp(req): string | null`、`isPublicIp(ip): boolean`、`createGeoIpService(options).resolve(ip): Promise<{ countryCode, countryName, source } | null>`、`languageForCountry(code, activeCodes): string`。
- Consumes: Express `req.ip`，并把 ISO 国家码写入聊天消息。

- [ ] **Step 1: 写失败测试**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { getClientIp, isPublicIp, createGeoIpService, languageForCountry } from '../server/services/geoip.js'

test('uses req.ip instead of a forged forwarded header', () => {
  assert.equal(getClientIp({ ip: '8.8.8.8', headers: { 'x-forwarded-for': '1.1.1.1' } }), '8.8.8.8')
})
test('rejects private addresses and supports public IPv6', () => {
  assert.equal(isPublicIp('10.0.0.1'), false)
  assert.equal(isPublicIp('2001:4860:4860::8888'), true)
})
test('caches fallback lookup and maps India to Hindi', async () => {
  let fallbackCalls = 0
  const geo = createGeoIpService({ lookupPrimary: async () => null, lookupFallback: async () => { fallbackCalls++; return { countryCode: 'IN', countryName: 'India' } } })
  assert.equal((await geo.resolve('8.8.8.8')).countryCode, 'IN')
  await geo.resolve('8.8.8.8')
  assert.equal(fallbackCalls, 1)
  assert.equal(languageForCountry('IN', new Set(['en', 'hi'])), 'hi')
  assert.equal(languageForCountry('JP', new Set(['en', 'hi'])), 'en')
})
```

- [ ] **Step 2: 运行并确认失败**

Run: `node --test test/geoip.test.js`  
Expected: FAIL，模块尚未创建。

- [ ] **Step 3: 实现服务和聊天持久化**

`geoip.js` 只从 `req.ip` 读取地址，使用 `node:net` 的 `isIP` 验证，剥离 `::ffff:`，拒绝 loopback、RFC1918、`100.64.0.0/10`、link-local、文档网段、IPv6 ULA 和 link-local。缓存成功 24 小时、失败 10 分钟，同一 IP 并发请求共享 Promise。两个上游都必须经 `AbortSignal.timeout(1200)`，只接受两位 ISO 国家码，并吞掉网络异常。映射至少包含 `IN: hi`、`CN: zh`、`ES: es`、`FR: fr`、`RU: ru`、`TH: th`、`TR: tr`、`PT/BR: pt` 和阿拉伯国家到 `ar`，目标未启用时返回 `en`。

`db.js` 为 `live_chat_messages` 增加 `country_code TEXT`、`geo_source TEXT`、`geo_resolved_at DATETIME` 及 IP 索引。删除 chat.js 的 `fetchGeoIP`、`lookupGeoIP`、直接解析 `cf-connecting-ip`/`x-forwarded-for` 和公开 `/debug-ip`。`/send` 先写入消息并立即响应；后台异步解析成功后参数化更新同 visitor、同 IP 的空地理字段。失败仍保留消息且国家为空。后台 UI 显示 `country || country_code || '未知国家'`。

- [ ] **Step 4: 验证并提交**

Run: `npm test -- --test-name-pattern="forged|private|caches"`  
Expected: PASS。  
Run: `node --check server/services/geoip.js; node --check server/routes/chat.js`  
Expected: PASS。

```bash
git add server/db.js server/services/geoip.js server/routes/chat.js src/views/admin/ChatSettings.vue test/geoip.test.js
git commit -m "fix: use shared trusted geoip for live chat"
```

### Task 3: 首次搜索落地语言中间件、部署说明与全量验证

**Files:**
- Create: `server/middleware/localeRedirect.js`, `test/localeRedirect.test.js`
- Modify: `server/index.js`, `src/composables/useLang.js`, `nginx.conf.example`, `UPDATE-GUIDE.md`

**Interfaces:**
- Consumes: Task 2 `getClientIp`、GeoIP `resolve`、`languageForCountry`。
- Produces: `createLocaleRedirect({ getActiveCodes, resolveCountry })` Express middleware。

- [ ] **Step 1: 写失败测试**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { createLocaleRedirect } from '../server/middleware/localeRedirect.js'

const run = req => new Promise(resolve => {
  const middleware = createLocaleRedirect({ getActiveCodes: () => new Set(['en', 'zh', 'hi']), resolveCountry: async () => 'IN' })
  const res = { cookie: () => res, redirect: (status, url) => resolve({ status, url }) }
  middleware(req, res, () => resolve({ next: true }))
})
test('Indian Google landing rewrites a Chinese product path to Hindi', async () => {
  assert.deepEqual(await run({ method: 'GET', path: '/zh/products/coil', originalUrl: '/zh/products/coil?utm=google', ip: '8.8.8.8', headers: { referer: 'https://www.google.co.in/search?q=coil' }, cookies: {} }), { status: 302, url: '/hi/products/coil?utm=google' })
})
test('manual preference and non-search traffic are not redirected', async () => {
  assert.deepEqual(await run({ method: 'GET', path: '/zh/products/coil', originalUrl: '/zh/products/coil', ip: '8.8.8.8', headers: {}, cookies: { locale_preference: 'zh' } }), { next: true })
})
```

- [ ] **Step 2: 运行并确认失败**

Run: `node --test test/localeRedirect.test.js`  
Expected: FAIL，模块尚未创建。

- [ ] **Step 3: 实现中间件、偏好 cookie 和配置说明**

中间件只处理 GET/HEAD 和带两位语言前缀的公开页面，跳过 `/api/`、`/admin`、`/crm`、`/uploads`、`/assets`、sitemap、health。存在 `locale_preference` 或 `locale_auto_selected` 时调用 `next()`。仅当 Referer 主机是 `google.`、`bing.`、`yahoo.`、`baidu.`、`yandex.` 或 `duckduckgo.` 才查询国家；目标语言等于当前语言或未启用时不跳转。其余情况设置 `locale_auto_selected=1; Path=/; SameSite=Lax; Max-Age=86400` 并对替换语言前缀后的 `originalUrl` 执行 302。

在 `useLang.js` 的 `setLang` 添加：

```js
document.cookie = `locale_preference=${encodeURIComponent(newLang)}; Path=/; Max-Age=31536000; SameSite=Lax`
document.cookie = 'locale_auto_selected=; Path=/; Max-Age=0; SameSite=Lax'
```

在 `index.js` 现有语言规范化中间件之前注册 locale middleware，保留 `app.set('trust proxy', 1)` 与 302，绝不基于 User-Agent 区分爬虫。`nginx.conf.example` 说明 Node 仅信任直接 Nginx；如使用 Cloudflare，必须由 Nginx 的官方 `set_real_ip_from` 列表处理 `CF-Connecting-IP`，不能传给 Node 直接信任。`UPDATE-GUIDE.md` 增加数据库备份后验证：关闭分类产品 404、公开 tree 无空项、印度 Google 首次落地 `/hi`、无映射 `/en`、聊天 IP/国家和 PM2 日志。

- [ ] **Step 4: 全量验证并提交**

Run: `npm test`  
Expected: 所有测试 PASS。  
Run: `Get-ChildItem server -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }`  
Expected: PASS。  
Run: `npm run build`  
Expected: PASS。  
Run: `git diff --check`  
Expected: 无输出。  
Run: `git status --short`  
Expected: 不含数据库、密钥、上传文件或构建产物。

```bash
git add server/index.js server/middleware/localeRedirect.js src/composables/useLang.js nginx.conf.example UPDATE-GUIDE.md test/localeRedirect.test.js
git commit -m "feat: localize first search landings by country"
```
