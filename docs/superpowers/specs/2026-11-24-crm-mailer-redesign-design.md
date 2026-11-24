# CRM 与邮件系统重设计 — 设计文档

日期：2026-11-24
状态：待批准（approach A 已由用户选定）

## 意图与原因

现有 CRM（/crm、/crm/sub）和邮件系统功能完整但界面陈旧：admin/Mailer.vue 是 117KB 单文件 7 个标签页堆在一个组件里，CRM 页面样式是早期手写 CSS，与网站品牌不统一。用户要求：**重新设计并美化、现代化，保证所有功能正常运行，不能影响前台和后台其他功能**。

## 目标 / 非目标 / 反目标

**目标**
1. CRM 全部页面 + 邮件系统全部页面视觉现代化，与网站品牌（#1e40af 深蓝）一致
2. admin/Mailer.vue 拆分为可维护的子组件（行为不变）
3. 所有现有功能、API 端点、数据表、双套鉴权完全不变且可用
4. admin/Email.vue（站点通知 SMTP 设置）与 admin/Inquiries.vue 顺带统一设计语言

**非目标**
- 不新增业务功能（销售看板、邮件打开追踪等留作后续迭代）
- 不改任何后端 API 路由、SQL、数据表结构
- 不改前台（访客侧）任何页面
- 不改 admin 其他页面（Categories/Products/News/Seo 等）
- 不改 CRM 登录流程与令牌机制

**反目标（出现即失败）**
- 任何 CRM/邮件功能回归（发送、进度、退订、导入导出、权限隔离）
- 前台页面受影响
- 因拆分引入的运行时报错

## 约束

- 双端复用：`crm/Mailer.vue` 是 `admin/Mailer.vue` 的包装（setup 时同步 patch `api.request`，将 /mailer/* 与 /email/* 请求切换为 CRM JWT）。**拆分后必须保留此机制**：wrapper 引入新的父组件，patch 时机不变（父 setup 先于子 onMounted）。
- 双鉴权：`dualAuthMiddleware` 接受 admin 或 CRM JWT；前端两套 token 存储（localStorage: token / crm_token 等，见 api/crm.js 与 crm/Mailer.vue patch）。
- 权限可见性：管理员看全部，子账户按 owner_id + assigned_users 过滤（canAccessCustomer / canAccessAssignedResource / accessibleSmtpAccounts）。UI 上的"分配"控件必须继续按现有条件渲染（crmIsAdmin 等）。
- 邮件发送为长任务：activeTasks/taskProgress 内存态 + 轮询（/tasks/realtime、/progress）；重设计不得改变轮询数据结构。
- 发送中模板变量 {{name}}/{{company}}/{{first_name}}/{{last_name}}、退订链接（applyUnsubscribe）、抑制列表（mail_suppressions）逻辑不动。

## 方案（已选定 A）

- **A. 品牌一致现代风（选定）**：设计 token + 布局重构 + 组件拆分，业务逻辑零改动。优点：风险最低、交付快、与网站品牌统一。缺点：不含深色模式与新功能。
- B. 深色 SaaS 风（否）：与浅色 admin 割裂，富文本/邮件预览需额外适配。
- C. 前后端大重构（否）：工作量 3-5 倍，与"保证功能正常"冲突。

## 设计系统（Design Tokens）

```
主色     --crm-primary: #1e40af   （与网站一致）
主色hover #1d4ed8
背景     --crm-bg: #f6f8fb
卡片     #ffffff, border #e6eaf2, radius 14px, shadow 0 1px 2px rgba(15,23,42,.06)
文字     主 #0f172a / 次 #64748b / 弱 #94a3b8
侧栏     深蓝渐变 #0b1f4b→#14306e，激活项白色 8% 底+左侧 3px 主色条
状态色   开发中 #f59e0b / 联系中 #8b5cf6 / 已成交 #10b981 / 公海 #64748b / 危险 #dc2626
成功/警告 #10b981 / #f59e0b
字体     与网站一致 -apple-system 系；标题 700，正文 400
间距     4 的倍数；页面内边距 24px；卡片内 20px
按钮     primary(实心主色)/outline(白底细边)/ghost(无边)/danger(红)，统一高度 36px、sm 30px
```

共享样式文件：`src/styles/crm.css`（token + 基础组件类），被 crm/Layout.vue、admin/Mailer.vue 子组件、Email.vue 引入。admin 后台与 CRM 各自独立作用域（scoped + 前缀），不污染网站前台样式。

## 页面设计

### CRM Layout（src/views/crm/Layout.vue）
- 侧栏：顶部品牌区（"SunSea CRM" + 小Logo）、导航分组（"概览"：仪表盘；"销售"：客户管理/公海池；"营销"：邮件系统；"管理"：账户管理[仅admin]）、底部用户卡+退出。折叠按钮保留。
- 顶部栏：全局搜索框（回车跳客户列表）+ 右侧当前用户徽章。
- 移动端（<900px）：侧栏抽屉化。

### Dashboard
- 5 统计卡（图标+数字+标签+彩色顶边），加"较上月"不做（无数据源，留待后端迭代）
- 新增**销售漏斗**条（开发中→联系中→已成交 比例条，纯 CSS，数据来自现有 /stats/overview）
- 快捷操作三卡改图标化卡片

### Customers 列表
- 工具栏一行：搜索、状态筛选、批量操作、新建、导入导出（现有功能不动）
- 列表：卡片式行（首字母彩色头像、姓名+公司、国家、邮箱/电话、状态彩色徽章、标签 pill、最近活动时间、行尾操作按钮）
- 空状态与加载骨架

### CustomerDetail
- 顶部客户卡：大头像、姓名/公司/国家、联系方式行（mailto/wa 链接）、标签、状态徽章、右侧操作（发邮件/快速跟进/编辑/移入公海）
- 下方三 Tab：询盘 / 报价 / 跟进 —— 时间轴样式（左侧竖线+圆点+日期），条目卡片含附件缩略
- 邮件发送弹窗、快速跟进弹窗样式统一

### SeaPool / Users / Login
- SeaPool：说明条 + 客户卡网格 + 认领按钮（现有逻辑），**并新增一个小设置卡片**：修改"自动入池天数"（读写现有 /settings/crm 接口——用户已确认补上此 UI）
- Users：表格化 + 新建/编辑弹窗统一
- Login：统一 token

注：`src/views/crm/Email.vue` 是无路由的孤儿文件，本次不碰；`server/routes/crm-mailer.js` 为死代码（未挂载路由），不动。

### 邮件系统拆分（admin/Mailer.vue → src/views/mailer/）

拆分原则：**先机械拆分（不改任何逻辑），再套设计**。两步各自 build+冒烟。

```
src/views/mailer/
  MailerPage.vue        ← 父容器：tab 状态、跨 Tab 共享状态、CRM 兼容入口
  tabs/TemplateList.vue tabs/ContactList.vue tabs/TaskList.vue
  tabs/SendLogList.vue  tabs/DailyLogList.vue tabs/AccountList.vue tabs/VariableList.vue
  shared/HtmlEditor.vue（现富文本/HTML双编辑器，连同其未加作用域的全局样式块
                        与图片缩放 IIFE 一起移入并改为 scoped——修复现存样式泄漏）
```

- 编辑器/弹窗（模板编辑、联系人编辑、任务编辑、发件账号编辑等）**保留在 MailerPage 内**，不做 props/emit 往返拆出——机械拆分阶段风险最小；视觉阶段在原位重设计
- 跨 Tab 共享状态（smtp 账号列表、crmUsers（含于 /mailer/templates 响应）、templates、contactGroups、crmIsAdmin、isCRM）由 MailerPage 持有并 provide/props 下发；各子组件一律通过 `api.request(...)` 方法调用（不可解构导入 request，否则捕获的是 patch 前的函数）
- Tab 内的 `crmIsAdmin` 可见性判断保持逐字节不变
- 所有 api 调用路径不变（仍走 api.request → wrapper patch）
- 视觉：Tab 改为左侧二级导航（在邮件系统页内）或顶部 pill 标签 + 每页统一工具栏/列表卡/模态

### admin/Email.vue、admin/Inquiries.vue
- 仅套设计 token 与布局美化，逻辑不动

## 实施顺序（每步可独立验证）

1. 建 crm.css 设计 token + CRM Layout/Dashboard/Login 重做
2. Customers 列表 + CustomerDetail 重做
3. SeaPool/Users/Settings
4. Mailer 机械拆分（不改样式，build+全功能冒烟）
5. Mailer 套新设计
6. Email.vue / Inquiries.vue 统一
7. 全量回归：build、测试套件、CRM 双端登录冒烟、前台抽查

## 验证清单（builder 必须执行）

- `npm run build` 通过；`npm test` 全过（274 项，测试只检查服务端文件，拆分不影响）
- CRM 管理员登录：仪表盘数字非 0、客户列表/详情/公海池可用、全局搜索可用
- CRM 子账户登录：只能看到自己的客户；"分配"类控件不出现
- 邮件系统：模板新建/编辑/复制/删除/设默认；联系人增删分组导入；**创建发送任务→启动→实时进度可见→停止**（可发往测试地址）；发送记录与每日日志有数据；发件账号增改测；变量增改
- 退订链接出现在测试邮件底部
- 前台首页/产品页/每日价格页抽查无样式污染（重点：HtmlEditor 旧全局样式已作用域化）
- admin 后台其他页面抽查无样式污染

## 留给 builder 的细节

具体字号/间距微调、图标选用（emoji 保留或换 SVG 由 builder 按一致性定）、空状态文案措辞。

## Builder 检查结论（已并入文档）

- 双端复用机制验证成立：子组件必须调用 `api.request(...)` 方法，禁止解构导入
- 跨 Tab 共享状态清单补入 crmIsAdmin / isCRM
- 修正：crm-mailer.js 为死代码（未挂载）不动；crm/Email.vue 孤儿文件不碰
- 决定：编辑器/弹窗保留在 MailerPage 原位，仅拆 tabs + HtmlEditor（机械拆分风险最小）
- 新增：SeaPool 页补设置卡片（用户已确认，仅用现有接口）
