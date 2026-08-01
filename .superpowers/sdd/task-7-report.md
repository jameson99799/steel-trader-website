# 任务 7 执行报告：评价缓存失效、接口文档与线上交付验证

## RED

- 新建 `test/productReviewDelivery.test.js`，首次执行结果：9 tests，0 pass，9 fail。
- 失败原因均为预期缺口：没有真实缓存失效工厂、Store 未隔离同步/异步失效错误、翻译同步未按目标语言清缓存、没有 `verifyProductReviewParity`、交付验证未请求评价 API、生产路由未注入真实失效器、文档未覆盖评价接口。
- 自审 CLI 时另加“产品发现保留重试且返回 id/slug”用例；首次结果 1 fail，原因是 `discoverItem` 尚不存在。

## GREEN 与实现边界

- `createProductReviewSeoCacheInvalidator` 先按参数绑定查询产品 slug，再读取缓存键并在 JS 中解析 URL pathname，最后仅以 `DELETE ... WHERE url = ?` 删除完全匹配的键。
- 匹配兼容路径/绝对 URL、query 和结尾斜杠；明确拒绝相同 slug 前缀、子路径及 news 路径，未使用全表删除。
- `create`、`bulkCreate`、`update`、`remove`、`bulkStatus`、`publishAll` 继续在写入/事务提交后失效；幂等且未新增的 bulk/create 不额外失效。
- 生产 `productReviewStore` 显式注入真实 invalidator，并注册共享 invalidator 供评价翻译同步使用。
- Store 与翻译同步均捕获同步异常和 Promise rejection，只记录带 product/lang 的警告，不改变已经成功的写入结果。
- 翻译 upsert 只失效对应产品/目标语言；删除不完整或不可公开的旧译文时，仅在确实删除后失效该语言；英语源不清缓存。
- `verifyProductReviewParity` 检查无评价时的三类旧硬编码；有评价时检查首条作者、日期、数值评分、HTML 转义正文、Review JSON-LD 与 aggregateRating/API summary 一致。
- CLI 从产品发现结果保留 `id + slug`，带原有 readiness retry，实际请求英语评价公开 API，并对 local/public 两份产品 HTML 都执行 Product JSON-LD parity。
- `/api/external/docs` 已覆盖 CRUD/bulk、pending 审核、1-200、external_id 幂等、三种日期、小数评分、API key/限流、管理员发布与旧 `/seo-reviews` 行为。
- 翻译与更新指南已补充 reviews 分组、多语言不回退、源文失效、缓存清理和部署后验收命令。

## 验证证据

- 指定矩阵：64 tests，64 pass，0 fail。
- `npm.cmd test`：139 tests，139 pass，0 fail。
- 全部 `server/**/*.js` 执行 `node --check`：通过。
- `node --check scripts/verifySeoDelivery.mjs`：通过。
- `npm.cmd run build`：首次在沙箱内因 esbuild 无权读取工作树上层目录失败；以同一命令在获准的非沙箱环境重跑成功，Vite 5.4.21 转换 745 modules，构建完成。仅有既有的大 chunk 和空 editor chunk 提示。
- `git diff --check`：通过，仅显示 Git 的 LF/CRLF 工作区提示，没有空白错误。

## 自审与风险

- 缓存删除是精确键删除，不会误删同前缀产品；代价是失效时扫描 `seo_render_cache` 的 URL 列。该缓存为短期爬虫渲染缓存，当前方案优先保证正确性和 SQLite 参数安全。
- 线上交付 CLI 需要本地 Node 服务和公开域名均可访问；无评价是合法结果，有评价时任一可见 HTML/JSON-LD/API 漂移都会使部署门禁失败。
- 本任务没有改前台组件、schema、管理后台或依赖。
