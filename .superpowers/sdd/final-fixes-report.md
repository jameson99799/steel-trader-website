# 产品评价系统合并前修复报告

## 修复范围

本次仅实施最终独立审查确认的 6 项 Important：

1. 外部 DELETE 的评价来源所有权边界。
2. `publishAll` 完整保留当前筛选条件。
3. 评价日期与翻译 source hash 的强约束。
4. 后台批量导入可选择“直接发布”或“待审核”。
5. `externalId` 精确参数化筛选。
6. 后台列表批量计算真实翻译状态，避免 N+1。

## 根因与实现

### 1. 外部 DELETE 所有权

根因：外部 DELETE 直接调用 `store.remove()`，没有像外部 PUT 一样先检查评价来源。

修复：先通过 `getById()` 读取评价；不存在返回 404，非 `external_api` 返回 403，只有外部评价才执行删除。403 复用“只能通过外部 API 修改外部评价”的通用文案，未限定为 update。外部 API 文档同步注明该边界。

### 2. publishAll 筛选

根因：服务只向 `adminFilterParts()` 传入产品/分类和固定 pending，丢失 UI 已提交的来源、关键词和日期范围。

修复：继续强制服务端 `status='pending'`，同时传入 `source`、`q`、`dateFrom`、`dateTo`。客户端传入的 status 不参与覆盖。

### 3. 日期与 source hash 完整性

根因：领域归一化允许 `review_date=null`；legacy 产品兼容路由没有转发日期；fresh DDL 两个字段可空；legacy 迁移未排除空或不可解析日期。

修复：

- 所有创建、批量创建和更新经过 `normalizeReviewInput()` 时都必须提供真实日期，并规范化为 `YYYY-MM-DD`。
- legacy 产品入口缺日期直接 400，不猜测、不补当前日期；有日期则原样转交领域层规范化。
- fresh schema 将 `product_reviews.review_date` 和 `product_review_translations.source_hash` 声明为 `NOT NULL`。
- legacy 迁移增加 `created_at IS NOT NULL` 与 `DATE(created_at) IS NOT NULL`，空日期和无效日期均跳过。

说明：上述 NOT NULL 是新建评价表时的 DDL 约束。本评价功能尚未合并部署，因此正式服务器首次部署会按该强约束创建表；本次没有对既有业务表执行破坏性重建。

### 4. 后台批量导入状态

根因：管理 handler 固定传入 `published`，UI 没有状态选择。

修复：导入确认按钮旁增加“导入后状态”，默认直接发布，可选待审核；请求携带 status。服务端仅接受 `published|pending`，缺省为 published，hidden 或其他值返回 400。切换产品/完成导入等调用 `resetImport()` 时恢复默认 published。

### 5. externalId 精确筛选

根因：文档列出了 `externalId`，但 `adminFilterParts()` 没有实现。

修复：非空值去首尾空格后加入 `r.external_id = ?`，值仅通过参数数组绑定，不使用 LIKE 或字符串拼接。

### 6. 后台真实翻译状态

根因：`listAdmin()` 只返回评价行，UI 对对象直接 `String()`，无法区分 current/stale/missing；逐条调用现有 `translationStatus()` 又会产生 N+1。

修复：列表页评价查询后，一次读取启用的非英语语言，一次按当前页所有 review id 批量读取翻译。用英文标题、正文和披露字段的当前 hash 计算每条评价的：

- `translation_status: { total, current, stale, missing }`
- `translation_languages: [{ language_code, status }]`

UI 显示“x/y 已翻译 · n 需重翻 · n 未翻译”；没有启用目标语言时显示“未启用目标语言”。单条 GET 原有 `translations` 行为未修改。

## RED 证据

新增 `test/productReviewFinalFixes.test.js` 后、修改生产代码前运行：

```powershell
node --test test/productReviewFinalFixes.test.js
```

结果：6 项测试、0 通过、6 失败（exit 1）。每项分别命中对应缺陷：

- 外部缺失评价错误返回 200 而非 404。
- publishAll SQL 缺少 source/q/date 条件。
- 缺失日期未抛错。
- pending 导入仍被强制 published。
- externalId 没有生成精确 SQL 条件。
- listAdmin 的 `translation_status` 为 undefined。

## GREEN 证据

实现后运行相关矩阵：

```powershell
node --test test/productReviewFinalFixes.test.js test/productReviewCore.test.js test/productReviewRoutes.test.js test/productReviewSchema.test.js test/productReviewAdminUi.test.js
```

结果：52/52 通过（exit 0）。其中 schema 测试通过 PRAGMA 验证两个 fresh DDL 字段的 NOT NULL，并用真实 SQLite 数据验证 legacy null/invalid 日期不会迁移。

## 最终验证

- `npm.cmd test`：152/152 通过，0 失败（exit 0）。
- 所有 `server/**/*.js` 执行 `node --check`：通过（exit 0）。
- `node --check scripts/verifySeoDelivery.mjs`：通过（exit 0）。
- `node --check shared/productReviewSeo.js`：通过（exit 0）。
- `npm.cmd run build`：745 modules transformed，`built in 12.48s`（exit 0）；仅保留项目已有的 chunk size warning。首次沙箱内执行因 esbuild 无权遍历工作树父目录失败，获批在沙箱外原命令重跑后通过。
- `git diff --check`：通过（exit 0），仅显示 Windows LF/CRLF 提示，无 whitespace error。
