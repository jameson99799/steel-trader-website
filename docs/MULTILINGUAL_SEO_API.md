# 多语言 SEO 与收录 API 指南

本文档面向 AI 系统和开发者，说明如何通过 API 控制每种语言的 SEO 文案、翻译、收录状态，并运行全站多语言 SEO 审计。

Base URL:

- 管理端 API: `https://www.sunseasteel.com/api`（需要管理员 `Authorization: Bearer <token>`）
- 外部 API: `https://www.sunseasteel.com/api/external`（需要 `X-API-Key: ext_xxx`）

---

## 一、11 组 SEO 文案是什么

每种语言有 11 组 `title` + `description`，分别对应 11 类页面：

| page_key | 页面 |
|---|---|
| `home` | 首页 |
| `about` | About Us |
| `contact` | Contact |
| `factory` | Factory |
| `ralColors` | RAL 色卡 |
| `roofingProfiles` | 屋面型材 |
| `futuresPrice` | 期货价格 |
| `products` | 产品列表 |
| `news` | 新闻列表 |
| `productCategory` | 产品分类页 |
| `newsCategory` | 新闻分类页 |

它们直接用于：

- `<title>`
- `<meta name="description">`
- Open Graph / Twitter Card 标题和描述

可以使用 `{company}` 和 `{category}` 占位符：

```json
{
  "page_key": "productCategory",
  "title": "{category} - Fabricant et Exportateur | {company}",
  "description": "Découvrez tous les produits {category} de {company}. Prix FOB compétitifs et expédition mondiale."
}
```

---

## 二、AI 翻译时自动生成 SEO 文案

翻译范围（scope）新增：

```text
language_seo_copy
```

在后台「翻译管理」或外部 API 启动翻译任务时，选择/传入该 scope，就会为每种目标语言生成 11 组 SEO 文案。

### 2.1 翻译任务自动生成

外部 API：

```http
POST /api/external/translations
X-API-Key: ext_xxx
Content-Type: application/json

{
  "lang": "fr",
  "pages": ["ui_texts_static", "company", "page_texts", "products", "news", "language_seo_copy"],
  "concurrency": 3
}
```

管理端：

```http
POST /api/translation-jobs
Authorization: Bearer <admin-token>

{
  "lang": "fr",
  "pages": ["ui_texts_static", "company", "page_texts", "products", "news", "language_seo_copy"]
}
```

### 2.2 只生成 SEO 文案（推荐，带 SEO 规则）

```http
POST /api/external/languages/fr/seo-copy/generate
X-API-Key: ext_xxx
```

管理端：

```http
POST /api/languages/fr/seo-copy/generate
Authorization: Bearer <admin-token>
```

该接口使用当前配置的 AI 渠道，并应用专门的 SEO 提示词：

- title 尽量控制在 60 字符以内
- description 120–160 字符
- 保留 `{company}` / `{category}` 占位符
- 不输出引号、标题前缀或解释
- 除 GI/GL/PPGI/PPGL/CRC/RAL 等行业缩写外，不混入英文

手工修改过的行会写入 `is_manual=1`，后续 AI 生成不会覆盖。

---

## 三、读取和修改 SEO 文案

### 3.1 读取

```http
GET /api/external/languages/fr/seo-copy
X-API-Key: ext_xxx
```

响应：

```json
{
  "language_code": "fr",
  "rows": [
    {
      "page_key": "home",
      "title": "Fournisseur de bobines d'acier GI/GL/PPGI/PPGL & CRC | SUNSEA STEEL",
      "description": "...",
      "is_manual": 0
    }
  ]
}
```

### 3.2 修改

```http
PUT /api/external/languages/fr/seo-copy
X-API-Key: ext_xxx
Content-Type: application/json

{
  "rows": [
    { "page_key": "home", "title": "...", "description": "..." },
    { "page_key": "about", "title": "...", "description": "..." }
  ]
}
```

管理端对应：

```http
PUT /api/languages/fr/seo-copy
Authorization: Bearer <admin-token>
```

规则：

- 只允许 `home`、`about`、`contact`、`factory`、`ralColors`、`roofingProfiles`、`futuresPrice`、`products`、`news`、`productCategory`、`newsCategory`
- 已开启 SEO 收录的语言，不允许把任一字段保存为空；会返回 400 和 `missingSeoCopy`
- 保存成功后 `is_manual=1`

---

## 四、开启/关闭某个语言的 SEO 收录

```http
PUT /api/external/languages/fr/seo-ready
X-API-Key: ext_xxx
Content-Type: application/json

{ "seo_index_ready": 1 }
```

管理端：

```http
PUT /api/languages/:id
Authorization: Bearer <admin-token>

{ "seo_index_ready": 1 }
```

开启前会校验：

1. 11 组 SEO 文案是否完整
2. 关键 UI 译文是否完整
3. 公司简介/优势是否翻译
4. Contact 页面文案是否翻译

缺少任何一项会返回 400，例如：

```json
{
  "error": "SEO收录未就绪: SEO文案缺少: home；UI译文缺少: about, contactUs；公司简介缺少: description",
  "missingSeoCopy": ["home"],
  "missingUiTexts": ["about", "contactUs"],
  "missingCompanyFields": ["description"],
  "missingPageTexts": []
}
```

开启后：

- 该语言所有公开页面输出 `index, follow`
- 进入 `sitemap-static.xml`、`sitemap-categories.xml`
- 产品/文章详情按单条翻译完整性进入产品/新闻 sitemap
- hreflang 自动包含该语言

关闭后：

- 该语言所有页面变为 `noindex, follow`
- 从 sitemap/hreflang 中移除
- 不会删除已有翻译和 SEO 文案

`en` 和 `zh` 始终视为就绪，不能被关闭。

---

## 五、多语言 SEO 全面审计

```http
GET /api/external/seo/audit
X-API-Key: ext_xxx
```

只看一种语言：

```http
GET /api/external/seo/audit?lang=fr
```

管理端：

```http
GET /api/seo/audit/multilingual
Authorization: Bearer <admin-token>
```

返回内容包括：

- `summary`: 语言总数、已就绪/未就绪数量、混合语言风险数量、产品/新闻/分类总数、可收录页面总数
- 每种语言：
  - `indexable`: 是否已开启收录
  - `score`: 0–100 完整度
  - `seo_copy`: 11 组文案完成情况 + 缺失 page_key
  - `ui_texts`: 缺失的 UI 译文 key
  - `company`: 缺失的公司简介字段
  - `page_texts`: 缺失的 Contact 页面文案
  - `products`: 总数、已完整翻译数、缺失数、缺失示例
  - `news`: 同上
  - `categories` / `news_categories`: 分类名称翻译情况
  - `mixed_language_risk`: 是否存在中英混杂风险
  - `indexable_pages`: 该语言当前可被 Google 收录的页面估算
  - `issues`: 可直接阅读的问题列表

典型问题示例：

- `未开启 SEO 收录：该语言所有页面为 noindex，不进入 sitemap/hreflang`
- `SEO 文案缺少 1 组：home`
- `UI 译文缺少 8 项，页面按钮/标题可能中英混杂`
- `3 个产品缺少完整 name+description 译文，对应详情页不会 index`
- `4 篇文章缺少完整 title+content 译文`
- `2 个产品分类缺少名称译文，分类页标题可能中英混杂`

---

## 六、翻译任务控制

### 6.1 查看可用翻译范围

```http
GET /api/external/translations/scopes
X-API-Key: ext_xxx
```

返回中包含：

```text
products, reviews, news, news_categories, company, page_texts, home_seo,
home_faq, categories, hero, ui_texts_static, ral_colors, roofing_categories,
factory, futures, language_seo_copy, chat
```

### 6.2 启动翻译

```http
POST /api/external/translations
X-API-Key: ext_xxx
Content-Type: application/json

{
  "lang": "fr",
  "pages": ["products", "news", "language_seo_copy"],
  "concurrency": 3,
  "skipTranslated": true
}
```

响应：

```json
{ "jobId": 12, "message": "后台翻译任务已启动" }
```

同一时间只允许一个后台翻译任务；已有任务运行时返回 409 和 `activeJobId`。

### 6.3 查询任务状态

```http
GET /api/external/translations/12
X-API-Key: ext_xxx
```

返回：

```json
{
  "id": 12,
  "status": "running",
  "target_lang": "fr",
  "pages": "[\"products\",\"news\",\"language_seo_copy\"]",
  "total_items": 120,
  "done_items": 45,
  "ok_items": 45,
  "error_items": 0,
  "failed_items": "[]",
  "created_at": "...",
  "updated_at": "...",
  "finished_at": null
}
```

---

## 七、推荐 AI 操作顺序

1. `GET /api/external/seo/audit` 查看所有语言缺口
2. `POST /api/external/translations`，为缺失语言运行：
   - `ui_texts_static`
   - `company`
   - `page_texts`
   - `categories`
   - `news_categories`
   - `products`
   - `news`
   - `language_seo_copy`
3. `GET /api/external/languages/:code/seo-copy` 检查 11 组文案
4. 必要时 `PUT /api/external/languages/:code/seo-copy` 手工修正
5. `PUT /api/external/languages/:code/seo-ready` 开启收录
6. 再次 `GET /api/external/seo/audit?lang=:code` 确认 `score=100`、`mixed_language_risk=false`
7. 在 Google Search Console 提交 `https://www.sunseasteel.com/sitemap.xml`

---

## 八、线上 HTML 逐页检查

前面 `/seo/audit` 检查数据库层面的文案和翻译完整性；这个接口会真正抓取线上 sitemap 中的页面 HTML（使用 Googlebot UA），逐页检查：

- HTTP 状态
- 是否被 `noindex`
- `<title>` 是否存在、长度是否合理
- `<meta name="description">` 是否存在、长度是否合理
- canonical 是否自引用
- hreflang 是否存在、是否包含当前语言、是否包含 `x-default`
- 静态页 hreflang 数量是否覆盖所有已就绪语言
- `<html lang>` 是否正确
- 阿拉伯语是否 `dir="rtl"`
- H1 是否存在
- JSON-LD 是否可解析
- 可见正文是否过短
- 可选：非英语页面 title/H1 是否与英文版完全相同（疑似英文回退）

### 8.1 外部 API

```http
GET /api/external/seo/audit/live
X-API-Key: ext_xxx
```

查询参数：

| 参数 | 说明 |
|---|---|
| `lang` | 可选，两位语言代码，如 `fr` |
| `type` | 可选，页面类型：`home`、`products`、`productDetail`、`productCategory`、`news`、`newsDetail`、`newsCategory`、`about`、`contact`、`factory`、`ralColors`、`roofingProfiles`、`futuresPrice` |
| `offset` | 默认 0 |
| `limit` | 1–100，默认 30 |
| `concurrency` | 1–8，默认 4 |
| `compare_english` | `1` 时额外对比英文版 title/H1，检测英文回退 |

示例：

```http
GET /api/external/seo/audit/live?lang=fr&type=about&limit=10&compare_english=1
```

响应：

```json
{
  "base_url": "https://www.sunseasteel.com",
  "total": 9,
  "offset": 0,
  "limit": 10,
  "checked": 9,
  "next_offset": 9,
  "has_more": false,
  "partial": false,
  "summary": {
    "passed": 8,
    "with_warnings": 1,
    "with_errors": 0,
    "errors": 0,
    "warnings": 1,
    "issue_counts": { "meta-description-length": 1 }
  },
  "pages": [
    {
      "url": "https://www.sunseasteel.com/fr/about",
      "status": 200,
      "lang": "fr",
      "type": "about",
      "title": "...",
      "descriptionLength": 141,
      "canonical": "https://www.sunseasteel.com/fr/about",
      "hreflangCount": 11,
      "htmlLang": "fr",
      "h1": "...",
      "visibleChars": 461,
      "issues": []
    }
  ]
}
```

管理端：

```http
GET /api/seo/audit/live?lang=fr&limit=10
Authorization: Bearer <admin-token>
```

说明：

- 默认每次只检查 30 页，避免请求过慢；用 `offset` 翻页。
- 单次最多 100 页，超过 45 秒会返回已完成部分，`partial=true`。
- `next_offset` 可直接作为下一次请求的 `offset`。
- `compare_english=1` 会额外请求英文版页面，耗时约翻倍。

---

## 九、认证与安全

- 管理端：`Authorization: Bearer <admin-token>`
- 外部 API：`X-API-Key: ext_xxx`
- 外部 API 有速率限制；返回 429 时等待窗口重置
- 如遇 Cloudflare 403 / 1010，请携带浏览器风格请求头：
  - `User-Agent`
  - `Origin: https://www.sunseasteel.com`
  - `Referer: https://www.sunseasteel.com/`
