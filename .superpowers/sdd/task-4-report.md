# 任务 4 报告：已发布产品评价翻译

## 实现摘要

- 新增 `collectProductReviews(readAll)`，仅收集按 id 排序的 published 评价及当前非空的英文标题、必有正文和非空激励披露。
- 新增 `syncProductReviewTranslation(...)`，只在所有当前非空英文字段都有精确 `original_text` 匹配且非空译文时 UPSERT 公开译文，并使用 `reviewSourceHash(review)`。
- 评价不可用、字段缺失、译文为空或源文过期时，立即删除该 `review_id + language_code` 的公开译文。
- 当可选英文字段改为空时，公开译文对应列同步为 NULL，不复用旧译文。
- 管理端新增 `reviews` / `⭐ 产品评价` 翻译范围。

## TDD 记录

### RED

1. 先新建 `test/productReviewTranslation.test.js`，未创建生产模块。
2. 运行 `node --test test/productReviewTranslation.test.js`。
3. 结果：exit 1，预期失败为 `ERR_MODULE_NOT_FOUND: server/services/productReviewTranslation.js`。

### GREEN

1. 实现纯服务后，7 个服务行为测试通过，4 个未接线测试仍按预期失败。
2. 完成路由、后台任务、语言删除和管理页接线后，`node --test test/productReviewTranslation.test.js` 通过 11/11。
3. 范围自审发现 `/run-selective` 仍有旧类型白名单；先增加失败接线测试（10/11），再允许 `product_review` 后恢复 11/11。
4. 定向回归 `node --test test/productReviewTranslation.test.js test/productReviewCore.test.js` 通过 26/26。

## 翻译入口审计

### 共用写入路径

`translation.js` 中下列入口最终调用共用 `upsertTranslation()`，因此 `product_review` 字段每次成功写入后都会执行同步器：

- `translateBatch()` 的编号文本、JSON fallback 和 HTML 路径；
- `/run-bulk`；
- `/run-one` 与 `/run`；
- `/run-selective`；
- `executeTranslationTask()` / `processTranslationQueue()` 旧后台队列；
- `/batch-start` 创建的队列任务；
- `translation-jobs.js` 的普通、精确指定、恢复和重试任务（均复用 `translateBatch()`）；
- `/override` 手工保存。

共用 upsert 的冲突 UPDATE 现在同时刷新 `original_text` 与 `translated_text`，避免源评价变更后重译仍被判定为 stale。

### 独立直接写入路径

- `/replace-translation`：直接 UPDATE 后，如果是 `product_review`，使用该记录的 `content_id + language_code` 同步。
- `/batch-replace`：查询保留 `language_code/content_type/content_id`，每条直接 UPDATE 后同步评价公开译文。
- `/sync-images` 两条直接 UPDATE 只查询 `product` 和 `news` 的 HTML 字段，不可写入 `product_review`。

### 删除路径

- `languages.js` 删除非英语语言时，在删除该语言的通用 `translations` 后，同步删除该 `language_code` 的 `product_review_translations`。
- 评价领域服务原有的英文源字段修改/评价删除路径已同时删除通用与公开评价译文，本任务未改动该领域服务。

## 验证

- `node --test test/productReviewTranslation.test.js test/productReviewCore.test.js`：27/27 通过。
- `node --check server/services/productReviewTranslation.js`：exit 0。
- `node --check server/routes/translation.js`：exit 0。
- `node --check server/routes/translation-jobs.js`：exit 0。
- `node --check server/routes/languages.js`：exit 0。
- `npm.cmd test`：104/104 通过，0 失败。0 跳过。

## 自审与风险

- SQL 中的 review id、language code 和译文值全部参数化；收集查询的 published 状态是固定常量。
- `product_review -> reviews` 已加入 `translation.js` 全部 4 套类型映射和 `translation-jobs.js` 全部 2 套映射。
- 非英语公开读取仍只使用带当前 `source_hash` 的 `product_review_translations`，本实现不创建任何回退英文的路径。
- 通用翻译写入和公开评价译文同步是连续的两次数据库操作，不在单一显式事务中。如果第二次操作遇到数据库错误，通用译文可能已写入而公开表未更新；此时公开读取仍会用 `source_hash` 拒绝过期记录，且下次任一评价字段写入会重试同步。
- 未生成、修改或填充任何虚构评价或虚假译文；测试数据仅存在于内存 SQLite fixture。

## 门禁修复：重复手工覆盖

- 问题：`POST /override` 原先复用 AI `upsertTranslation()`，而 AI 冲突 UPDATE 故意限定 `is_manual=0`。因此同 key 已是 `is_manual=1` 时，第二次手工保存是 0-row no-op，却返回 Saved 并保留旧公开译文。
- RED：先增加真实内存 SQLite 回归，连续两次保存同一 `product_review/review_title`。`node --test test/productReviewTranslation.test.js` 为 10/12，新行为用例因 `saveManualTranslation is not a function` 失败，路由接线用例因仍调用 AI upsert 失败。
- GREEN：新增可注入 `saveManualTranslation(...)`。它先显式 UPDATE `original_text/translated_text/is_manual=1/updated_at`，不限制旧 `is_manual`；仅在 0 行更新时 INSERT。`product_review` 保存后调用同步器，公开表获得第二次译文和当前 `reviewSourceHash`。定向测试恢复 12/12。
- 边界：AI `upsertTranslation()` 仍保持 `is_manual=0` 条件，不会覆盖人工审定译文；显式手工保存对所有 `content_type` 使用同一 UPDATE-or-INSERT 语义，仅评价类型需要额外公开表同步。
