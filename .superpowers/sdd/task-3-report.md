# 任务 3 报告：公开、后台与外部评价 API

## RED

- 命令：`node --test test/productReviewRoutes.test.js`
- 结果：10 项中 1 项通过、9 项失败。
- 预期失败原因：`server/routes/product-reviews.js` 尚不存在，且 `src/api/index.js` 与 `server/index.js` 尚无产品评价客户端方法和挂载。
- 已确认不是测试语法或既有路由装载错误；现有外部产品/文章路由的代表性回归在 RED 阶段已通过。
- 在实现前追加了 legacy article 分支回归：新领域仅支持产品，因此该分支必须返回 deprecated 400、提供 replacement，且不得写入新旧评价表。

## GREEN

- 命令：`node --test test/productReviewRoutes.test.js`
- 结果：11/11 通过。
- 覆盖：公开与后台路由、管理员认证顺序、管理员 CRUD/批量/解析/发布参数、外部强制 `external_api + pending`、外部幂等结果透传、批量 1–200 边界与行号、无外部发布路由、deprecated `/seo-reviews`、前端客户端方法、服务挂载、既有外部产品/文章路由回归。

## 定向与全量验证

- `node --test test/productReviewRoutes.test.js test/productReviewCore.test.js test/productReviewSchema.test.js`：31/31 通过。
- `node --check server/routes/product-reviews.js`：通过。
- `node --check server/routes/external-api.js`：通过。
- `node --check server/index.js`：通过。
- `npm.cmd test`：89/89 通过，0 失败、0 跳过。
- `git diff --check`：通过。

## 变更文件

- 新增 `server/routes/product-reviews.js`
- 新增 `test/productReviewRoutes.test.js`
- 修改 `server/routes/external-api.js`
- 修改 `server/index.js`
- 修改 `src/api/index.js`
- 新增 `.superpowers/sdd/task-3-report.md`

## 自审

- 所有管理员写路由的首个中间件均为现有 `authMiddleware`；公开边界只有产品评价 GET。
- 外部路由逐条使用现有 `apiKeyMiddleware`，没有 status、publish 或 bulk-publish 能力。
- 外部新增、批量和编辑统一调用不可覆盖的 pending 策略；不可变字段和 `external_id` 幂等继续由领域 store 保证。
- 管理员解析只调用纯解析函数；批量写入在调用 store 前固定校验 1–200。
- 错误响应不包含堆栈，并过滤 SQL、数据库和约束类内部错误文本。
- 未生成评价、随机评分或自动提分；旧随机评分与立即发布表述已删除。
- 未修改 schema、领域服务、页面、SSR、翻译或依赖。

## 风险与兼容变化

- legacy `POST /api/external/seo-reviews` 的 product 分支现写入受审核的 `product_reviews`，强制 pending，并返回 deprecated/replacement 元数据。
- legacy article 分支无法映射到仅支持产品外键的 Task 2 store。按已确认边界返回明确的 deprecated 400 和 replacement，不再写旧 `seo_reviews`；这是有意的兼容变化，避免扩大 schema/domain 或绕过审核。
- 路由层将领域校验错误统一映射为 400；未知的 SQL/数据库类错误细节会被隐藏，因此生产排障仍应依赖服务端日志与全局监控。
