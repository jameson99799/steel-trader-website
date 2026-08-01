# 任务 6 报告：前台多语言评价、SSR 与一致 JSON-LD

## 实现结果

- 新增纯函数 `buildReviewSchemaParts`，由客户端和服务器共同导入；仅将有效、真实的公开评价映射到数字类型的 `aggregateRating` 与 `review`。
- 新增 `ProductReviews.vue`，以文本插值展示完整正文、作者、日期、标题、数字/部分星评分、已验证购买、激励标记与完整披露；加载下一页时保留语言、去重并保护旧请求。
- `ProductDetail.vue` 移除全部固定评价与评分，优先即时消费匹配产品/语言的 SSR 初始评价；产品或语言切换会清空旧评价，并用 token 拒绝旧响应覆盖。
- 产品详情 SSR 调用 `productReviewStore.listPublic({ productId, lang, page: 1, limit: 10 })`；同一 `publicReviews` 用于语义 HTML、初始状态与 Product JSON-LD。
- SSR 评价读取使用独立 `try/catch`；异常固定降级为空评价对象并继续产品详情渲染。评价作者、标题、日期、评分、正文与披露均经过现有 `esc`，初始状态仍使用 `<` 安全序列化。

## TDD 证据

1. 首轮 RED：
   - `node --test test/productReviewSeo.test.js test/detailSeoSafety.test.js test/productReviewCore.test.js`
   - 25 项中 16 通过、9 失败；失败均来自缺失的共享 builder、组件、客户端接线及 SSR 评价接线。
2. 首轮 GREEN：同一命令 25/25 通过。
3. hydration 即时消费回归：先新增断言要求 SSR 产品与评价在支持请求完成前写入，单测按预期失败；最小调整后该定向测试通过。
4. 首次全量：123/124；唯一失败是既有测试要求保留默认 `productReviewRoutes` import 的精确形式。拆分命名 import 后重新全量通过。

## 最终验证

- 定向：25/25 通过。
- `node --check shared/productReviewSeo.js`：通过。
- `node --check server/index.js`：通过。
- `npm.cmd test`：124/124 通过。
- `npm.cmd run build`：通过，745 modules transformed。
- `git diff --check`：通过。

## SSR 降级与安全核对

- `listPublic` 位于产品存在分支的独立 `try/catch`；catch 不抛出、不改 HTTP 状态、不跳过产品 schema/缩略图/正文生成。
- 降级对象为 `{ reviews: [], summary: { ratingValue: 0, reviewCount: 0 }, pagination: { page: 1, limit: 10, total: 0 } }`，共享 builder 返回 `{}`，因此不生成空的评分摘要。
- SSR 可见评价先通过共享 builder 的有效性筛选；可见 article 数与 JSON-LD review 数保持一致。
- 用户可控字段均由 `esc(...)` 输出；JSON-LD 使用 `JSON.stringify(...).replace(/</g, '\\u003c')`，初始状态沿用同样的 `<` 转义，`<script>` 无法闭合脚本或注入 HTML。

## 自审与风险

- 允许文件之外无源码改动；未新增依赖；现有缩略图测试及 detail SEO 安全测试通过。
- 页面在当前语言没有可见评价时完全隐藏评价 section，不伪造星级或摘要。
- 构建仍有项目既有的 `vendor-chart` 大 chunk 与空 `vendor-editor` warning；本任务未改变依赖或 chunk 配置。
- 未引入浏览器端端到端测试；竞态、初始状态复用、SSR 复用/转义/降级由定向源码契约测试覆盖，Vue 生产构建验证组件编译。
