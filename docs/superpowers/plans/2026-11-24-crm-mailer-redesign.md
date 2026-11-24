# CRM 与邮件系统重设计实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按方案 A（品牌一致现代风）重设计 CRM 全部页面与邮件系统，拆分 117KB 的 admin/Mailer.vue，零后端改动、零前台影响。

**Architecture:** 建立共享设计 token 文件 crm.css；先重做 CRM 外壳与页面；再用"机械拆分→套设计"两步法把 admin/Mailer.vue 拆为 src/views/mailer/ 父容器 + 7 个 Tab 子组件 + 独立 HtmlEditor（修复其未作用域化的全局样式泄漏）；保留 crm/Mailer.vue 双端鉴权包装机制与全部 API/数据逻辑。

**Tech Stack:** Vue 3（scoped CSS）、现有 Express + SQLite 后端（只读复用，不修改）、better-sqlite3、现有 crm/mail API。

**Spec:** `docs/superpowers/specs/2026-11-24-crm-mailer-redesign-design.md`（实施者须同时阅读）

## Global Constraints

- 零后端改动：不修改任何 server/ 文件（本计划所有任务禁改 server/）
- 零前台影响：不修改 src/ 下前台组件（SiteHeader/ProductDetail/网站样式文件等）；新样式全部 scoped 或以 `.crm-`/`.mailer-` 前缀类名限定
- 不改路由路径：/crm、/crm/sub、/admin/mailer、/admin/email、/admin/inquiries 保持
- CRM 包装机制不可破坏：crm/Mailer.vue 的 api.request patch 时机（父 setup 内同步）不变；所有子组件调用 `api.request(url, options)` 方法形式，禁止解构导入 request
- Tab 内 `crmIsAdmin` 可见性判断逐字节保留
- 模板/任务/联系人等所有功能行为不变：仅移动代码与改样式
- 每个任务结束 `npm run build` 必须通过；任务 7 结束 `npm test` 全过

## Review Focus

1. **CRM 子账户视角**：子账户登录后不得看到"分配"类控件与他人的客户/SMTP——任务 3、6 各以人工冒烟步骤验证（源码检查点：`crmIsAdmin` 判断逐字节保留）
2. **双端鉴权切换**：从 /crm/mailer 与 /admin/mailer 分别进入邮件系统，请求须分别带 CRM/admin token——任务 4 步骤以浏览器网络面板检查（构建后人工冒烟）
3. **HtmlEditor 全局样式泄漏**：现 admin/Mailer.vue 内未 scoped 的 `<style>`（body/img/hr/a 规则）与图片缩放 IIFE 必须随编辑器移入 shared/HtmlEditor.vue 并加 scoped/容器限定——任务 4 以源码检查点验证
4. **发送任务实时进度**：任务启动/进度轮询/停止在 UI 重排后仍工作——任务 6 冒烟步骤验证
5. **前台与 admin 其他页面零污染**：全局不引入新非 scoped 样式——任务 7 以构建产物抽查（grep dist css 无 `body {` 全局规则新增）

---

### Task 1: 设计 token 文件 + CRM Layout / Login / Dashboard 重做

**Files:**
- Create: `src/styles/crm.css`
- Modify: `src/views/crm/Layout.vue`（整体重写模板+样式，script 逻辑保留）
- Modify: `src/views/crm/Login.vue`（样式重写）
- Modify: `src/views/crm/Dashboard.vue`（重做：统计卡 + 销售漏斗条 + 快捷操作）
- Modify: `src/main.js`（import './styles/crm.css'）

**Interfaces:**
- Consumes: `crmApi.getStats()`（现有，返回 {total, developing, contacting, closed, pool}）
- Produces: crm.css 中的设计 token（CSS 变量：--crm-primary #1e40af、--crm-bg #f6f8fb、--crm-card、--crm-border #e6eaf2、--crm-text #0f172a、--crm-text-2 #64748b、--crm-radius 14px、状态色 --crm-dev/--crm-contact/--crm-closed/--crm-pool/--crm-danger）与基础类（.crm-card、.crm-btn/.crm-btn-primary/.crm-btn-outline/.crm-btn-danger/.crm-btn-sm、.crm-badge、.crm-modal-overlay、.crm-empty），后续所有任务依赖

- [ ] **Step 1: 编写 src/styles/crm.css**——设计 token（:root 不用，写在 .crm-scope 类上避免污染前台；crm/Layout 根元素加 class="crm-scope"，Mailer/Email 页面根元素同理）+ 基础组件类（按钮/卡片/徽章/输入/模态/空状态/表格行卡）。颜色与间距值按 spec 设计系统一节逐字采用。
- [ ] **Step 2: main.js 引入**（`import './styles/crm.css'`，置于 style.css 之后）。
- [ ] **Step 3: 重写 crm/Layout.vue**——保留 script 逻辑（basePath、user、doGlobalSearch、handleLogout、sidebarCollapsed）；模板改为：侧栏（品牌区"SunSea CRM"、分组导航【概览:仪表盘 / 销售:客户管理·公海池 / 营销:邮件系统 / 管理:账户管理(仅 admin，v-if="user?.role === 'admin'" 保留)】、底部用户卡+退出）、顶部栏（搜索+用户徽章）、router-view。根元素加 class="crm-scope"。折叠行为保留。新增移动端 <900px 抽屉样式。
- [ ] **Step 4: 重写 crm/Login.vue 样式**（模板逻辑不动，居中卡片 + 品牌色）。
- [ ] **Step 5: 重写 crm/Dashboard.vue**——统计卡（图标+数字+彩色顶边）+ 销售漏斗条（纯 CSS 比例条：developing→contacting→closed 占比，数据来自 getStats）+ 快捷操作三卡。所有现有 router-link 目标不变。
- [ ] **Step 6: 验证**：`npm run build` 通过；人工访问 /crm（登录后）确认布局生效、admin 后台其他页面与前台首页无样式变化。
- [ ] **Step 7: Commit** `feat(crm): design tokens + new layout, login, dashboard`

### Task 2: Customers 列表 + CustomerDetail 重做

**Files:**
- Modify: `src/views/crm/Customers.vue`（模板+样式重做；script 的数据/筛选/批量/导入导出逻辑保留）
- Modify: `src/views/crm/CustomerDetail.vue`（模板+样式重做；三大时间线数据逻辑保留）

**Interfaces:**
- Consumes: crm.css token 与基础类；crmApi.getCustomers/getCustomer/createCustomer/updateCustomer/deleteCustomer/getInquiries/getQuotations/getFollowups/sendEmail/moveToPool 等现有方法（签名不变）
- Produces: 无新接口

- [ ] **Step 1: 重写 Customers.vue 视图层**——工具栏（搜索/状态筛选/批量操作/新建/导入导出按钮重排）、列表改卡片式行（首字母彩色头像、姓名+公司、国家、邮箱/电话、状态彩色徽章（颜色映射：开发中 --crm-dev、联系中 --crm-contact、已成交 --crm-closed、公海 --crm-pool）、标签 pill、操作按钮）；空状态/加载骨架用 crm.css 类。**所有 v-model、事件处理函数、权限判断逐字节保留。**
- [ ] **Step 2: 重写 CustomerDetail.vue 视图层**——顶部客户信息卡（大头像、姓名/公司/国家、mailto/WhatsApp 链接、标签、状态徽章、操作按钮组：发邮件/快速跟进/编辑/移入公海）；下方 Tab 切换（询盘/报价/跟进）+ 时间轴样式列表（竖线+圆点+日期+条目卡，附件显示保留）；发邮件与快速跟进弹窗套 crm.css 模态样式。**逻辑保留。**
- [ ] **Step 3: 验证**：`npm run build`；人工冒烟：管理员与子账户分别进入客户列表与详情（子账户不得出现"分配"类控件——源自码检查 `crmIsAdmin` 判断未动）。
- [ ] **Step 4: Commit** `feat(crm): redesign customers list & customer detail`

### Task 3: SeaPool（含设置卡片）/ Users / Login 之外的 Users 页

**Files:**
- Modify: `src/views/crm/SeaPool.vue`（重做 + 新增设置卡片）
- Modify: `src/views/crm/Users.vue`（重做）

**Interfaces:**
- Consumes: crmApi.getSeaPool/claimCustomer/moveToPool（现有）；**crmApi.getSettings/updateSettings**（现有 /settings/crm GET/PUT，返回含 sea_pool_days 字段——本任务首次在前台使用）
- Produces: 无新接口

- [ ] **Step 1: SeaPool.vue 重做**——页面说明条、客户卡网格（认领按钮）、**新增设置卡片**：输入框绑定 sea_pool_days，保存调用 crmApi.updateSettings（现有方法；若 crm.js 未导出 getSettings/updateSettings 则补充导出，端点不变）。
- [ ] **Step 2: Users.vue 重做**——表格化列表 + 新建/编辑弹窗套 crm.css（仅 admin 可见的路由守卫逻辑不动）。
- [ ] **Step 3: 验证**：`npm run build`；人工冒烟：公海池认领/移入、设置卡片保存后刷新数值保持。
- [ ] **Step 4: Commit** `feat(crm): redesign sea pool (+settings card) & users`

### Task 4: Mailer 机械拆分（不改样式）

**Files:**
- Create: `src/views/mailer/MailerPage.vue`（由 admin/Mailer.vue 的 script/template 主体迁入）
- Create: `src/views/mailer/tabs/TemplateList.vue`、`tabs/ContactList.vue`、`tabs/TaskList.vue`、`tabs/SendLogList.vue`、`tabs/DailyLogList.vue`、`tabs/AccountList.vue`、`tabs/VariableList.vue`
- Create: `src/views/mailer/shared/HtmlEditor.vue`（迁入富文本/HTML 双编辑器 + 其未 scoped 的全局样式块（改为 scoped 至编辑器容器）+ 图片缩放 IIFE（随组件 mounted/unmounted 挂载卸载））
- Modify: `src/views/admin/Mailer.vue`（改为薄包装：`<MailerPage :is-crm="false" />` 式引入，保留原标题逻辑所需的 isCRM 判断入参）
- Modify: `src/views/crm/Mailer.vue`（改为引入 `../mailer/MailerPage.vue` 而非 admin/Mailer.vue；api.request patch 机制逐字节保留）

**Interfaces:**
- Consumes: admin/Mailer.vue 现有全部状态、方法与 API 调用（/mailer/*、/email/*、/api 内嵌请求），逐字节迁移
- Produces: `MailerPage.vue` 暴露 props：`isCRM: Boolean`（默认 false；标题文案与 crmIsAdmin 判定沿用现有行 744/779 逻辑）；子组件通过 props 接收跨 Tab 共享状态（templates、users、contactGroups、smtpAccounts、crmIsAdmin、isCRM），通过 `emit('refresh')` 类事件请父容器重载数据；跨 Tab 直接方法调用（如任务 Tab 引用模板列表）改由 MailerPage 中转

- [ ] **Step 1: 建 src/views/mailer/MailerPage.vue**——把 admin/Mailer.vue 的 `<script setup>` 全量迁入（含 isCRM/crmIsAdmin 计算、loadAll、全部方法），模板保留 7 个 tab 切换骨架；将每个 tab 的模板块原样剪切到对应 tabs/*.vue 子组件，跨 Tab 共享状态改为 props 下发 + emit 事件回调父容器方法。**此步零样式改动、零逻辑改动。**
- [ ] **Step 2: 迁移 HtmlEditor**——将编辑器模板块、相关 script（含图片缩放 IIFE 改为 onMounted/onUnmounted）与全局 `<style>` 块迁入 shared/HtmlEditor.vue；全局样式改为限定在 `.html-editor-root` 容器内（body/img/hr/a 规则改选择器为 `.html-editor-root img` 等，body 规则删除或限定）；父组件以 v-if+props(v-model html) 使用。
- [ ] **Step 3: admin/Mailer.vue 与 crm/Mailer.vue 改薄包装**——admin 版传 `:is-crm="false"`；crm 版保留原有 patch 代码块逐字节不变，仅替换被引入组件为 MailerPage。
- [ ] **Step 4: 验证**：`npm run build`；人工冒烟（/admin/mailer 与 /crm/mailer 各一遍）：7 个 Tab 均渲染、模板列表加载、联系人列表加载、模板编辑器打开且可视化/代码/预览三态可用（全局样式不再泄漏：检查页面 body 背景/margin 无变化）、账号/变量 Tab 可用。浏览器网络面板确认 /admin/mailer 与 /crm/mailer 的请求分别带对应 token。
- [ ] **Step 5: Commit** `refactor(mailer): mechanical split of admin/Mailer.vue into src/views/mailer/*`

### Task 5: Mailer 套新设计

**Files:**
- Modify: `src/views/mailer/MailerPage.vue` 及 `tabs/*`、`shared/HtmlEditor.vue`（仅模板结构调整与 scoped 样式重写；逻辑不动）

**Interfaces:**
- Consumes: crm.css token 与基础类
- Produces: 无新接口

- [ ] **Step 1: MailerPage 布局重做**——顶部页头 + Tab 改为 pill 式标签条（或左侧二级导航）；每 Tab 统一"工具栏 + 列表卡 + 空状态/骨架"结构。
- [ ] **Step 2: 各 Tab 视觉重做**——TemplateList 卡片（类型/默认徽章/分配徽章沿用现有数据）、ContactList（头像+分组徽章）、TaskList（状态彩色进度条 + 实时进度数字区）、SendLogList/DailyLogList（状态徽章 + 表格卡片化）、AccountList（账号卡 + 测试结果提示）、VariableList（键值卡）。全部套 crm.css 类与 token，禁止新增全局样式。
- [ ] **Step 3: 模态重做**——所有编辑器/确认弹窗统一 crm.css 模态样式（遮罩+圆角卡片+标题栏）。
- [ ] **Step 4: 验证**：`npm run build`；人工冒烟同 Task 4 Step 4 清单。
- [ ] **Step 5: Commit** `feat(mailer): modernize mailer UI on design tokens`

### Task 6: admin Email.vue + admin Inquiries.vue 统一设计

**Files:**
- Modify: `src/views/admin/Email.vue`（样式重写+布局微调，逻辑不动）
- Modify: `src/views/admin/Inquiries.vue`（样式重写，逻辑不动）

**Interfaces:**
- Consumes: crm.css 基础类（以其根元素加 .crm-scope 限定作用域）
- Produces: 无新接口

- [ ] **Step 1: Email.vue 重做**——SMTP 表单/测试按钮/通知设置重排为分区卡片；根元素加 .crm-scope。
- [ ] **Step 2: Inquiries.vue 重做**——列表/详情查看套卡片化；根元素加 .crm-scope。
- [ ] **Step 3: 验证**：`npm run build`；人工冒烟：admin SMTP 账号测试连接、询盘列表打开查看详情。
- [ ] **Step 4: Commit** `feat(admin): unify email & inquiries pages on crm design tokens`

### Task 7: 全量回归验证

**Files:**
- Modify: 仅当回归发现问题时修复对应文件

**Interfaces:**
- Consumes: 前六个任务全部产出
- Produces: 回归结论（交付与否）

- [ ] **Step 1: 自动化**——`npm run build` 通过；`npm test` 全过（274 项）。
- [ ] **Step 2: 泄漏抽查**——`grep -rn "body {" src/views/mailer src/styles/crm.css` 确认无新增非作用域全局规则；构建产物 dist/assets/*.css 抽查无新 `body {` 全局块。
- [ ] **Step 3: CRM 冒烟**——管理员：仪表盘/客户/详情/公海池（认领+设置卡片保存）/邮件系统全 Tab/账户管理；子账户：仅见自己客户、无"分配"控件。
- [ ] **Step 4: 邮件功能冒烟**——创建测试发送任务（收件人填测试邮箱）→ 启动 → 实时进度 → 停止；确认退订链接在测试邮件 HTML 中；发送记录/每日日志更新。
- [ ] **Step 5: 前台与 admin 抽查**——首页/产品页/每日价格页/产品分类页样式无变化；admin 其他页面（Products/News/Seo）样式无变化。
- [ ] **Step 6: Commit（如有修复）** `fix(crm): regression fixes from full sweep`；无修复则跳过。
