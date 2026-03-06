# SunSea Steel 网站 — 项目开发规范与安全手册

> ⚠️ **每次修改代码前务必阅读本文件，确保遵守所有规范，保护线上数据安全！**
> 最后更新：2026-03-06

---

## 一、服务器信息

| 项目 | 值 |
|------|-----|
| 域名 | www.sunseasteel.com |
| 服务器 | Ubuntu（腾讯云） |
| 项目路径 | `/www/wwwroot/steel-trader` |
| 进程管理 | PM2 (`led-trade`) |
| Node 端口 | 3001 |
| 数据库 | SQLite (`data/database.db`) |
| GitHub | `jameson99799/steel-trader-website` (master) |

---

## 二、⚠️ 数据保护规则（最高优先级）

### 绝对禁止

1. **禁止** 在 `git commit` 中包含 `data/database.db` 文件
2. **禁止** 直接在服务器上执行 `git reset --hard` 而不先备份数据库
3. **禁止** 修改 `.gitignore` 中 `data/*.db` 的忽略规则
4. **禁止** 在 `db.js` 的 `initDb()` 中使用 `DROP TABLE`
5. **禁止** 把数据库备份放在 git 管理的目录内（必须放 `/tmp`）

### 必须遵守

1. **每次 `git push` 前**：确认 `git status` 中不包含 `data/database.db`
2. **服务器更新时**：必须按照 `UPDATE-GUIDE.md` 步骤操作
3. **修改 server 文件时**：先在本地测试 `npm run build` 通过再推送
4. **新增 server route 时**：检查 `import` 路径是否正确（见第五节错误记录）

---

## 三、服务器更新标准流程

```bash
cd /www/wwwroot/steel-trader

# ① 停止服务
pm2 stop led-trade

# ② 备份数据库到 /tmp（必须！）
TSBU=$(date '+%Y%m%d_%H%M%S')
sqlite3 data/database.db "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true
cp data/database.db /tmp/steel-trader-db-manual-${TSBU}.db
echo "备份: /tmp/steel-trader-db-manual-${TSBU}.db"

# ③ 确认备份有数据（不为0才继续！）
sqlite3 /tmp/steel-trader-db-manual-${TSBU}.db "SELECT 'products:', COUNT(*) FROM products; SELECT 'news:', COUNT(*) FROM news;"

# ④ 拉取代码
git fetch origin
git reset --hard origin/master

# ⑤ 恢复数据库
cp /tmp/steel-trader-db-manual-${TSBU}.db data/database.db
rm -f data/database.db-shm data/database.db-wal

# ⑥ 恢复上传文件（如有备份）
# cp -rn /tmp/steel-trader-uploads-backup/. uploads/ 2>/dev/null || true

# ⑦ 安装依赖 + 构建
npm install --production=false
npm run build

# ⑧ 启动服务
pm2 restart led-trade

# ⑨ 验证
pm2 logs led-trade --lines 10 --nostream
sqlite3 data/database.db "SELECT 'products:', COUNT(*) FROM products; SELECT 'news:', COUNT(*) FROM news;"
```

---

## 四、用户功能需求清单

### 已完成 ✅

| 编号 | 需求 | 状态 |
|------|------|------|
| 1 | 富文本框图片点击后添加标题（居中显示在图片下方） | ✅ 使用 FigureBlot |
| 2 | 文字背景增加透明/无背景选项 | ✅ 背景色列表含 transparent |
| 3 | 图片缩放功能（四角拖动） | ✅ quill-resize-image |
| 4 | News 富文本框全屏编辑按钮 | ✅ |
| 5 | 删除"简洁编辑器"（block editor）| ✅ 已从 News.vue 和 Products.vue 完全删除 |
| 6 | 产品详情富文本框和 News 富文本框完全同步 | ✅ 工具栏、功能、代码完全一致 |
| 7 | 产品详情页图片和文字间距缩小 | ✅ gap: 8px |
| 8 | 产品详情页图片容器大小与图片匹配（去除多余空白）| ✅ 移除 aspect-ratio:1 |
| 9 | 前台图片显示与后台一致（大小、位置）| ✅ inline-block + font-size:0 技巧 |
| 10 | News 详情页添加产品分类 | ✅ |
| 11 | About Us 公司简介支持换行显示 | ✅ white-space: pre-wrap |
| 12 | About Us 图片粘性滚动（跟随文字滚动）| ✅ position: sticky |
| 13 | Send Inquiry 弹窗副标题后台可修改 | ✅ 移出 v-if 限制，支持中英文 |
| 14 | SSL 证书后台上传功能 | ✅ 系统设置页面 |

### 需求实现规则

- 修改 News.vue 的富文本框 → **Products.vue 必须同步修改**
- 修改 Products.vue 的富文本框 → **News.vue 必须同步修改**
- 两个编辑器的 Quill 配置（toolbar、modules、image handler）**必须完全一致**
- 前台显示样式 → ProductDetail.vue 和 NewsDetail.vue 的 CSS **必须同步**

---

## 五、历史 Bug 记录（避免重犯）

### Bug 1：News 保存报错 "content is not defined"
- **原因**：`News.vue` `save()` 中 `fd.append('content', content)` 使用了未定义变量
- **修复**：改为 `fd.append('content', form.value.content || '')`
- **教训**：重构代码时必须检查所有变量引用

### Bug 2：ssl.js 导入错误导致服务器崩溃
- **原因**：`import { authMiddleware } from './auth.js'` 路径错误
- **正确**：`import { authMiddleware } from '../middleware/auth.js'`
- **教训**：新增 server route 时，检查其他 route 的 import 路径作为参考

### Bug 3：服务器更新后数据库数据丢失
- **原因**：`git reset --hard` 前备份存在 git 目录内，可能被覆盖
- **修复**：backup 改存到 `/tmp`，与 git 目录完全隔离
- **教训**：任何备份文件必须存在 git 管理范围之外

### Bug 4：产品详情图片容器比图片大
- **原因**：`.main-image` 设置了 `aspect-ratio: 1` 强制正方形
- **修复**：移除 aspect-ratio，改为 height: auto
- **教训**：图片容器不要固定宽高比

### Bug 5：询盘弹窗副标题无法修改
- **原因**：输入框被 `v-if="contactPanelOn"` 条件隐藏
- **修复**：将输入框移到条件外，始终显示
- **教训**：后台可编辑字段不应依赖其他开关的显隐状态

---

## 六、技术架构要点

### 项目结构

```
steel-trader/
├── server/
│   ├── index.js          # 主入口
│   ├── db.js             # SQLite 数据库（better-sqlite3）
│   ├── middleware/
│   │   └── auth.js       # JWT 认证中间件（authMiddleware 在这里）
│   └── routes/           # API 路由
│       ├── auth.js       # 登录/改密码
│       ├── products.js   # 产品 CRUD
│       ├── news.js       # 新闻 CRUD
│       ├── company.js    # 公司信息
│       ├── pagetexts.js  # 页面文字管理
│       ├── ssl.js        # SSL 证书管理
│       └── ...
├── src/
│   ├── views/admin/      # 后台页面
│   │   ├── Products.vue  # ← 富文本框必须和 News.vue 同步！
│   │   ├── News.vue      # ← 富文本框必须和 Products.vue 同步！
│   │   ├── PageTexts.vue # 页面文字管理
│   │   └── Settings.vue  # 系统设置（含 SSL 上传）
│   ├── views/            # 前台页面
│   │   ├── ProductDetail.vue  # ← 图片/富文本 CSS 必须和 NewsDetail 同步！
│   │   ├── NewsDetail.vue     # ← 图片/富文本 CSS 必须和 ProductDetail 同步！
│   │   └── About.vue          # 公司简介（sticky image + pre-wrap）
│   ├── components/
│   │   └── InquiryModal.vue   # 询盘弹窗（读取 pageTexts 配置）
│   └── utils/
│       ├── quillImageBlot.js  # 自定义图片+标题 Blot
│       └── quillImageGrid.js  # 图片网格功能
├── data/
│   └── database.db       # ← 绝对不能提交到 git！
├── uploads/              # 上传的图片文件
├── UPDATE-GUIDE.md       # 服务器更新操作手册
└── server-update.sh      # 一键更新脚本
```

### 关键 import 路径（新增 route 时参考）

```javascript
// 在 server/routes/ 目录下的文件中：
import { authMiddleware } from '../middleware/auth.js'  // ✅ 正确
import { getOne, run } from '../db.js'                  // ✅ 正确

// ❌ 错误示例（会导致服务器崩溃！）：
import { authMiddleware } from './auth.js'  // ← 这是同目录下的 auth route，不是 middleware！
```

---

## 七、紧急恢复命令速查

```bash
# 数据库紧急恢复
pm2 stop led-trade
cp /tmp/steel-trader-db-manual-最新日期.db /www/wwwroot/steel-trader/data/database.db
pm2 restart led-trade

# 查看所有可用备份
ls -lah /tmp/steel-trader-db-*.db

# 查看服务器错误日志
pm2 logs led-trade --lines 30 --nostream

# 检查数据库内容
sqlite3 /www/wwwroot/steel-trader/data/database.db "SELECT 'news:', COUNT(*) FROM news; SELECT 'products:', COUNT(*) FROM products;"
```

---

> 📌 **开发者须知**：修改本项目的任何代码前，请先阅读本文件第二、四、五节。
> 推送到 GitHub 后，按照第三节步骤通知用户更新服务器，绝对不能跳过数据备份步骤。
