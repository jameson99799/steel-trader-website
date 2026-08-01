# 产品评价管理、审核、翻译与 SEO/GEO 交付设计

## 背景

网站现有 `seo_reviews` 只有产品/文章 ID、姓名、评分、正文和创建时间，缺少审核状态、来源、翻译、批次、外部幂等编号和完整的管理接口。旧的外部接口还会把无效评分随机改成 4.7–5.0，无法保证评价真实性。与此同时，浏览器端产品 JSON-LD 仍硬编码 `5.0 / 89 / Verified Buyer`，服务器端则已经停止输出自动评价，造成前后端 SEO 数据不一致。

本次建设独立的产品评价系统。系统用于录入、导入、审核、发布和翻译真实客户评价；不生成、不伪造、也不自动提高评分。

## 目标

1. 后台可以按产品分组筛选产品，并管理每个产品自己的评价。
2. 支持单条新增、编辑、删除、隐藏、发布，以及多选、当前页全选和全部待审核评价批量发布。
3. 支持一行一条的文本批量导入、格式识别、错误提示和写入前预览。
4. 对外 API 支持查询、单条新增、批量新增、编辑和删除；API 导入内容一律为待审核，不能通过请求参数直接发布。
5. AI 全站翻译增加“产品评价”范围，把英文评价标题和正文翻译到指定语言。
6. 产品详情按当前语言显示已发布且具有该语言正文的评价；英语页面显示英文原文，非英语页面不得混入其他语言。
7. 服务端首屏 HTML、页面可见评价和 Product JSON-LD 使用同一数据源，符合 Google 评价摘要政策。
8. 评价以可抓取的语义文本呈现，服务于传统搜索、Google AI Overviews/AI Mode 及其他能够读取页面正文和结构化数据的系统。

## 非目标

- 不使用 AI 批量编写或伪造买家评价。
- 不把企业自行编写的宣传文案伪装成客户体验。
- 不为 GEO 增加 Google 未支持的专用 Schema、`llms.txt` 或其他虚构标记。
- 不让未审核、已隐藏或缺少目标语言翻译的评价出现在对应语言页面或 JSON-LD 中。
- 本期不开放前台访客直接提交评价；后续可以在独立项目中增加防垃圾和身份验证后再开放。

## 方案选择

采用“评价主表 + 评价翻译表”的规范化方案：

- 姓名、日期、评分、来源、审核状态和产品关系只存一份。
- 英文标题/正文保存在主表；各语言标题/正文保存在翻译表。
- 同一评价的评分和状态在各语言间天然同步，不同产品之间完全隔离。
- 翻译记录可以独立查询、重翻和审计，不需要复制完整评价行。

不采用每种语言复制完整评价的方案，因为修改评分或状态时容易不同步；不采用单行 JSON 保存全部翻译的方案，因为不利于查询、唯一约束、翻译任务和后台维护。

## 数据模型

### `product_reviews`

字段：

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `product_id INTEGER NOT NULL`
- `author_name TEXT NOT NULL`，去除首尾空格，最长 100 个字符
- `review_title TEXT`，可选英文标题
- `review_date TEXT NOT NULL`，统一保存为 `YYYY-MM-DD`
- `rating REAL NOT NULL`，允许 1.0–5.0，最多一位小数，禁止自动纠正或随机替换
- `review_text TEXT NOT NULL`，英文原文
- `status TEXT NOT NULL DEFAULT 'pending'`，仅允许 `pending`、`published`、`hidden`
- `source TEXT NOT NULL`，仅允许 `admin`、`admin_import`、`external_api`、`migration`
- `external_id TEXT`，外部系统的幂等编号
- `verified_purchase INTEGER NOT NULL DEFAULT 0`
- `is_incentivized INTEGER NOT NULL DEFAULT 0`
- `incentive_disclosure TEXT`，激励评价为真时必须填写并在页面显著显示
- `import_batch_id TEXT`，批量导入批次编号
- `created_at`、`updated_at`、`published_at`

约束和索引：

- 产品必须存在。
- `external_api + external_id` 唯一，重复请求返回已有记录，不重复写入。
- 为 `product_id + status + review_date`、`status` 和 `import_batch_id` 建索引。
- 删除产品时级联删除评价；删除评价时级联删除翻译。

### `product_review_translations`

字段：

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `review_id INTEGER NOT NULL`
- `language_code TEXT NOT NULL`
- `review_title TEXT`
- `review_text TEXT NOT NULL`
- `incentive_disclosure TEXT`，激励评价披露说明的目标语言翻译
- `source_hash TEXT NOT NULL`，记录生成翻译时英文标题、正文和披露说明的内容指纹
- `created_at`、`updated_at`

约束：

- `review_id + language_code` 唯一。
- `language_code` 不能为 `en`，英文原文只保存在主表。

### 旧数据迁移

- 现有 `seo_reviews` 中 `target_type='product'` 的记录只迁移为 `pending`，来源标记为 `migration`，不会自动公开。
- 文章评价不迁入产品评价系统，也不重新加入 Article JSON-LD。
- 迁移必须可重复执行且不会产生重复数据。

## 后台评价页面

新增 `/admin/reviews` 和侧边栏“⭐ 产品评价”。页面包含四个区域：

1. **产品选择**：先选择产品分组/分类，再加载该分组及子分组下的产品；支持按产品名称搜索。
2. **评价列表**：按状态、来源、日期和关键字筛选，显示姓名、日期、数值评分、部分星视觉、语言翻译状态和来源。
3. **单条表单**：产品、姓名、日期、评分、可选标题、正文、已验证购买、激励评价和披露说明。
4. **批量导入**：输入、解析预览、逐行校验、有效/无效统计、确认导入。

列表操作包括：

- 编辑、删除、发布、隐藏、恢复待审核。
- 多选、当前页全选、筛选结果中的全部待审核评价一键发布。
- 批量操作提交前显示实际数量并二次确认。
- “全部发布”只影响当前筛选产品范围内的待审核评价，避免跨产品误操作。

后台手动单条新增和确认后的后台批量导入默认直接发布；管理员可以在保存前改为待审核。外部 API 导入固定为待审核。

## 批量文本格式与解析

标准格式：

```text
姓名 - 日期 - 评分 - 评论内容
John Smith - 2026-07-18 - 4.7 - The coating quality was consistent and delivery was on time.
Maria Garcia - 2026年7月20日 - 5.0 - Good surface finish and careful packaging.
```

解析规则：

- 一行一条，忽略空行。
- 支持 `YYYY-MM-DD`、`YYYY/MM/DD` 和 `YYYY年MM月DD日`，最终规范化为 `YYYY-MM-DD`。
- 使用日期和评分位置识别分隔符，评论正文中的连字符不再拆分字段。
- 评分允许 1–5 和一位小数；显示层用 5 星制的部分填充表示小数，JSON-LD 保留原始小数。
- 姓名、日期、评分、正文为必填；标题不在文本格式中，保持为空。
- 预览按行显示解析结果、错误原因和重复提示；只有确认后才使用事务写入。
- 同一批次内完全相同的产品、姓名、日期、评分和正文视为重复并跳过。

## 管理 API

新增受管理员登录鉴权保护的 `/api/product-reviews/admin`：

- `GET /`：分页、产品、分类、状态、来源、日期和关键字筛选。
- `GET /:id`：读取单条及翻译状态。
- `POST /`：新增单条，后台默认 `published`。
- `POST /parse-import`：只解析和校验，不写库。
- `POST /bulk`：确认后事务导入。
- `PUT /:id`：编辑公共数据和英文原文；英文正文变更后标记已有翻译为待重翻。
- `DELETE /:id`：删除评价及翻译。
- `POST /bulk-status`：对明确 ID 列表批量发布/隐藏/恢复待审核。
- `POST /publish-all`：按产品和筛选条件发布全部待审核评价。

所有写操作校验产品、日期、评分、状态和激励披露。返回结构统一为 `{ success, data, error, details }`，批量错误包含输入行号。

## 对外 API

继续使用现有 `X-API-Key`，扩展 `/api/external/product-reviews`：

- `GET /`：分页查询，可按产品、状态、日期和外部编号筛选。
- `GET /:id`：获取单条评价和已有翻译。
- `POST /`：新增单条，服务器强制写为 `pending`。
- `POST /bulk`：事务批量新增，所有记录强制为 `pending`。
- `PUT /:id`：编辑评价，编辑后重置为 `pending`，并使旧翻译失效。
- `DELETE /:id`：删除评价。

原 `/api/external/seo-reviews` 暂时作为兼容入口，转到相同的新增逻辑并返回弃用提示；删除随机 4.7–5.0 评分行为。外部 API 不提供发布接口，也不接受 `status=published`。

接口补充：

- 复用已有 `GET /api/external/products` 获取产品。
- 增加公开接口文档、请求/响应示例、字段约束、错误码和幂等说明。
- 对写接口使用现有限流并限制单批数量，避免超大请求阻塞 SQLite。
- 管理员发布、隐藏和删除后清除对应产品所有语言的 SEO 渲染缓存。

## AI 全站翻译

在 `PAGES` 中新增 `reviews` 收集器，后台翻译范围新增“产品评价”。

- 收集对象仅限 `published` 的英文评价。
- 翻译类型使用 `product_review`，`content_id` 为评价 ID。
- 可翻译字段为 `review_title`、`review_text` 和激励披露说明；姓名、日期、评分、来源、披露状态不翻译。
- 翻译成功后写入 `product_review_translations`，同时保留通用 `translations` 记录供翻译审计和重试。
- 选择某个目标语言和“产品评价”后，后台任务自动翻译该语言尚未翻译或已失效的评价。
- 英文标题、正文或披露说明修改后，`source_hash` 不再匹配，对应翻译不会继续用于页面，直到重翻成功。
- 翻译完成后清除受影响产品对应语言的 SEO 缓存。

## 公共接口和多语言展示

新增 `GET /api/product-reviews/product/:productId?lang=xx&page=1&limit=10`：

- 只返回 `published` 评价。
- 英语返回主表英文原文。
- 非英语只返回具有对应有效翻译的评价，绝不回退成中文、英文或另一语言。
- 返回当前语言可显示的评价列表，以及该产品全部已发布评分计算得到的平均分和总数。
- 平均分由数据库实时计算并统一四舍五入到一位小数，不保存可漂移的冗余统计值。

产品详情新增可见评价区：

- 使用语义化标题、评分摘要、评价列表、作者、日期、评分和正文。
- 激励评价显示披露说明；已验证购买只在真实记录为真时显示。
- 分页或“加载更多”不改变首屏中已经可见评价的结构化数据一致性。
- 没有任何可显示评价时不渲染空的评价 JSON-LD。

## Google SEO 和 GEO 交付

Google 要求评价基于真实体验，禁止虚假或未披露的激励评价；结构化数据必须与页面可见内容一致。因此：

- 只把已发布且当前语言页面可见的评价加入 `Product.review`。
- `aggregateRating.ratingValue` 和 `reviewCount` 只基于已发布评价计算。
- Review 输出 `author`、`datePublished`、`reviewRating.ratingValue`、`bestRating=5`、`worstRating=1`、`reviewBody`，可选标题使用 `name`。
- 删除浏览器端硬编码的 `5.0 / 89 / Verified Buyer`，浏览器端和服务器端调用同一评价序列化函数。
- 服务端 SSR 在首个响应中输出评价正文、评分摘要和 Product JSON-LD；评价读取失败时省略评价增强信息，但产品页面仍返回 HTTP 200。
- 每个语言 URL 只输出该语言的可见评价正文，`html lang`、canonical、hreflang 和产品语言保持一致。
- 评价更新、翻译、发布、隐藏或删除后清除动态 SEO 缓存，防止旧结构化数据继续暴露。
- 自动测试校验页面可见评价和 JSON-LD 的作者、日期、评分、正文及数量一致。

Google 对 AI Overviews/AI Mode 没有额外技术要求，也不需要特殊 Schema。所谓 GEO 在本系统中的实现是：确保页面可索引、重要内容为可抓取文本、内部产品链接可发现、结构化数据与可见文本一致，并提供真实、清晰、按产品归属的评价内容。

参考：

- Google Review snippet structured data：https://developers.google.com/search/docs/appearance/structured-data/review-snippet
- Google Product structured data：https://developers.google.com/search/docs/appearance/structured-data/product
- Google General structured data guidelines：https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- Google AI features and your website：https://developers.google.com/search/docs/appearance/ai-features

## 安全和数据完整性

- 所有文本输出进行 HTML 转义，前端不使用 `v-html` 渲染评价正文。
- 外部 API 密钥只通过请求头传递，不写入日志或响应。
- 批量导入使用事务；失败时整批回滚，解析预览不写数据库。
- API 的产品 ID 必须存在；禁止调用方提交任意 `target_type`。
- 记录来源、外部编号、创建和修改时间，保留可追溯性。
- 删除、批量发布和全部发布需要明确范围，后台二次确认。

## 测试策略

严格测试先行，覆盖：

1. 数据库迁移、约束、幂等和级联删除。
2. 批量解析的三种日期、正文连字符、小数评分、空字段、越界评分和重复行。
3. 管理 API 的筛选、单条 CRUD、事务批量导入、多选发布和按筛选全部发布。
4. 外部 API 强制待审核、无发布入口、幂等、编辑后重审和权限验证。
5. 翻译收集、写入、失效、重翻和非英语无回退。
6. 公共 API 只返回已发布且语言匹配的评价。
7. 产品页可见评价、SSR HTML 和 JSON-LD 完全一致；无评价或读取失败时不输出评价字段且页面保持 HTTP 200。
8. 移除所有固定评价和随机高评分代码。
9. 全部自动化测试、服务端语法检查、生产构建和 SEO 交付验证。

## 验收标准

- 后台能够按产品分组选择产品并完成单条评价全生命周期管理。
- 批量文本可以预览、定位错误、确认后一次性导入。
- 外部 API 可查询、新增、批量新增、编辑和删除，新增/编辑后均为待审核。
- 后台可以多选、全选并批量发布，API 不能发布。
- AI 全站翻译出现“产品评价”范围，翻译后对应语言页面显示对应语言正文。
- 同一产品各语言共享评分、日期、姓名和发布状态；不同产品不共享评价。
- 产品页面只显示真实已发布评价，JSON-LD 与可见内容一致。
- 没有目标语言翻译时不会出现中英或其他语言混杂。
- 产品详情直刷返回 HTTP 200，评价模块故障不能拖垮页面。
- Google Rich Results Test 不再出现固定评价造成的数据不一致问题；是否最终展示富媒体结果仍由 Google 决定。
