# 任务 5 报告：后台产品评价管理页

## 实现范围

- 新增 `/admin/reviews` 独立路由和后台侧栏入口。
- 新增分类/产品联动范围、服务端筛选、分页和明确的当前页选择。
- 新增真实评价单条创建、详情读取、编辑、删除，以及发布/隐藏/待审核批量状态操作。
- 新增服务端批量文本解析预览；有效、错误、重复分区显示原行号和原因，仅允许 1–200 条且零错误、零重复时确认导入。
- 新增当前产品或当前分类范围内的全部待审核发布；无范围禁用并在方法内再次拦截，删除与范围发布均二次确认。
- 评分使用五颗星背景和百分比覆盖层显示部分星，同时保留一位小数、数值文本与 `aria-label`。
- 新增激励评价披露条件校验；页面没有评价生成、随机评分或补量入口。

## TDD 证据

### RED

先创建 `test/productReviewAdminUi.test.js`，再运行：

```text
node --test test/productReviewAdminUi.test.js
tests 10, pass 0, fail 10
```

失败原因均为预期的缺失功能：无 `Reviews.vue`、无独立路由和侧栏入口。

### GREEN

实现后运行：

```text
node --test test/productReviewAdminUi.test.js
tests 10, pass 10, fail 0
```

## 全量验证

```text
npm.cmd test
tests 114, pass 114, fail 0
```

首次恢复依赖时使用了 `--ignore-scripts`，导致已有 `better-sqlite3` 原生绑定缺失；运行 `npm.cmd rebuild better-sqlite3` 后重新执行全量测试通过。这是隔离工作树依赖环境问题，不涉及产品代码修改。

## 构建验证

```text
npm.cmd run build
vite v5.4.21
742 modules transformed
built successfully
```

仅出现 brief 允许的既有 empty editor chunk 和大 chunk 警告，没有 Vue、模板或 JavaScript 编译错误。

## 自审

- 修改范围仅包含 brief 允许的路由、后台 Layout、新页面、契约测试和本报告。
- 列表查询只发送有值的范围/筛选参数；`all` 不发送，页码和每页数量始终明确。
- 分类、产品、筛选、分页变化均清空当前页选择；表头复选框只操作当前响应中的 ID。
- 新增和导入要求明确产品；范围全部发布要求产品或分类，客户端禁用与方法守卫双重防护。
- 导入预览只调用 `parseProductReviewImport`，没有本地解析或直接写库。
- 所有异步入口用 loading/disabled 防重复，错误和成功在页面内可见。

## 风险

- 项目没有 Vue 组件测试运行器，本任务依 brief 使用源码契约测试配合真实 Vite SFC 编译；复杂浏览器交互仍建议集成后做一次人工后台冒烟。
- 翻译状态列兼容接口可能提供的 `translation_status`、`translationStatus` 或详情 `translations`；当前列表接口未提供时显示 `-`。

## 门禁修复：异步请求竞态

- 根因：产品和评价 loader 在 `await` 后无请求身份与输入快照校验，较早请求的成功、异常或 `finally` 可以覆盖较新的分类、产品、筛选、分页及 loading/error 状态。
- RED：扩展定向契约测试到 12 项；首次运行 10 项通过、2 项按预期失败，分别缺少 stale-request 防护和姓名/评分边界。
- GREEN：产品与评价使用两套独立递增 sequence。产品请求保存分类快照；评价请求保存完整查询快照。响应、异常和 `finally` 仅在 sequence 最新且当前输入仍匹配时写状态；空分类调用也先递增 sequence，使在途产品请求失效。
- 筛选字段快速变化会触发新列表请求、清空当前页选择，并由 sequence 保证仅最后一个请求可提交结果。
- 姓名字段和客户端校验统一为领域上限 100 个字符；评分显式限制最多一位小数，`4.75` 会在提交前显示错误。
