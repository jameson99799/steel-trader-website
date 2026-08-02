# 🔄 SunSea Steel — 网站更新操作手册

> ⚠️ **每次更新前必读此文件，确保数据不丢失！**

---

## 一、更新前必须先做的事（3步，不能跳过）

### 第1步：备份数据库（最重要！）

```bash
cd /www/wwwroot/steel-trader

# 创建带日期戳的备份（绝对安全，放在 /tmp 下不会被 git 覆盖）
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
sqlite3 data/database.db "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true
cp data/database.db /tmp/steel-trader-db-manual-${TIMESTAMP}.db
echo "✅ 数据库已备份到: /tmp/steel-trader-db-manual-${TIMESTAMP}.db"
ls -lah /tmp/steel-trader-db-manual-*.db
```

### 第2步：确认备份有数据（关键！）

```bash
# 检查备份文件的数据条数，必须不为0
sqlite3 /tmp/steel-trader-db-manual-*.db "SELECT 'news:', COUNT(*) FROM news;"
sqlite3 /tmp/steel-trader-db-manual-*.db "SELECT 'products:', COUNT(*) FROM products;"
sqlite3 /tmp/steel-trader-db-manual-*.db "SELECT 'company:', COUNT(*) FROM company;"
```

> 如果输出全是 0，说明当前数据库就是空的，需要先找到正确的备份再继续。

### 第3步：执行更新

```bash
bash server-update.sh
```

---

## 二、更新后验证数据是否正常

```bash
# 确认数据库有数据
sqlite3 /www/wwwroot/steel-trader/data/database.db "SELECT 'news:', COUNT(*) FROM news;"
sqlite3 /www/wwwroot/steel-trader/data/database.db "SELECT 'products:', COUNT(*) FROM products;"

# 查看 PM2 有没有错误
pm2 logs led-trade --lines 20 --nostream
```

---

## 三、数据丢失时的紧急恢复

### 方法1：用最近一次 /tmp 备份恢复

```bash
# 查看所有可用备份
ls -lah /tmp/steel-trader-db-*.db

# 选择最新的有数据的备份（替换下面的日期戳）
pm2 stop led-trade
cp /tmp/steel-trader-db-手动备份文件名.db /www/wwwroot/steel-trader/data/database.db
pm2 restart led-trade
```

### 方法2：用项目内 .backup 文件恢复

```bash
pm2 stop led-trade
cp /www/wwwroot/steel-trader/data/database.db.backup /www/wwwroot/steel-trader/data/database.db
pm2 restart led-trade
```

### 方法3：查看有没有其他地方的备份

```bash
find / -name "*.db" -size +50k 2>/dev/null
find / -name "database.db*" 2>/dev/null
```

---

## 四、为什么会丢数据？（根本原因说明）

| 原因 | 说明 |
|------|------|
| `git reset --hard` | 会强制覆盖所有 git 管理的文件 |
| `.gitignore` 中的 `data/*.db` | 数据库文件虽然被忽略，但如果 git 里有记录过它，reset 后会被清空 |
| 初始化逻辑 | 服务器启动时 `db.js` 会自动创建空表，如果数据库文件被重置，看起来"有文件"但实际内容为空 |

**新版 server-update.sh 已修复此问题**：数据库在 `git reset --hard` 之前备份到 `/tmp`，完全隔离。

---

## 五、推荐备份策略（强烈建议设置）

### 设置每日自动备份（crontab）

```bash
# 编辑定时任务
crontab -e

# 添加以下行（每天凌晨2点自动备份，保留最近7天）
0 2 * * * sqlite3 /www/wwwroot/steel-trader/data/database.db "PRAGMA wal_checkpoint(TRUNCATE);" && cp /www/wwwroot/steel-trader/data/database.db /www/wwwroot/steel-trader/data/database-$(date +\%Y\%m\%d).db && find /www/wwwroot/steel-trader/data -name "database-*.db" -mtime +7 -delete
```

### 查看自动备份

```bash
ls -lah /www/wwwroot/steel-trader/data/database-*.db
```

---

## 六、完整标准更新流程（复制执行）

```bash
# ① 进入项目目录
cd /www/wwwroot/steel-trader

# ② 手动备份数据库
TSBU=$(date '+%Y%m%d_%H%M%S')
sqlite3 data/database.db "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true
cp data/database.db /tmp/steel-trader-db-manual-${TSBU}.db
echo "备份完成: /tmp/steel-trader-db-manual-${TSBU}.db ($(ls -lah /tmp/steel-trader-db-manual-${TSBU}.db | awk '{print $5}'))"

# ③ 确认备份有数据（必须不为0）
sqlite3 /tmp/steel-trader-db-manual-${TSBU}.db "SELECT 'products:', COUNT(*) FROM products; SELECT 'news:', COUNT(*) FROM news;"

# ④ 执行更新
bash server-update.sh

# ⑤ 验证数据正常
sqlite3 data/database.db "SELECT 'products:', COUNT(*) FROM products; SELECT 'news:', COUNT(*) FROM news;"
```

---

## Post-backup deployment verification: catalog, locale and GeoIP

Run these checks after the backup has been verified and `server-update.sh` has finished:

1. Confirm catalog visibility is still enforced. A known hidden product must return HTTP 404 on its public URL, and the public category tree must not include hidden categories/products. Verify both the public product URL and `GET /api/categories` with a known hidden record.
2. Verify that a localized URL stays unchanged regardless of visitor IP, referer, or old locale cookies. For example, request `/zh/products/coil?utm=google` from an India-based connection with a Google referer; it must not issue a locale redirect.
3. Use the language selector to change the page language. Confirm that the URL changes to the selected language prefix and that the selection is retained for later visits.
4. Send a chat message and verify that the new `live_chat_messages` record has the expected `ip`, `country`, `country_code`, and `geo_source` values. Check `pm2 logs led-trade --lines 100 --nostream` for GeoIP, proxy, or application errors.

### Proxy trust reminder

Node trusts exactly its direct Nginx proxy (`trust proxy = 1`). Nginx must continue to send `X-Real-IP`, `X-Forwarded-For`, and `X-Forwarded-Proto`. When Cloudflare is in front, configure current Cloudflare source ranges in Nginx and use `real_ip_header CF-Connecting-IP`; never trust `CF-Connecting-IP` directly in Node.

## SEO/GEO 生产交付检查

公开 HTML、`/sitemap.xml` 以及所有 `sitemap-*.xml` 必须由 Nginx 代理到
`127.0.0.1:3001`。`/assets/` 和 `/uploads/` 仍可由 Nginx 直接提供。
不要在公开 `location /` 中使用 `try_files $uri $uri/ /index.html`，否则 Google
收到的是通用 Vite 页面，服务端生成的 canonical、hreflang、JSON-LD 和正文都不会送达。

`server-update.sh` 会执行以下保护流程：

1. 只识别并迁移旧版 `server-setup.sh` 生成的精确 SPA 配置块；
2. 在原配置旁保存 `.seo-backup-时间戳` 备份；
3. 运行 `nginx -t`，失败时立即恢复备份；
4. 不重写未知或面板自定义的 `location /`；
5. 同时比较本机 Node 和公开域名的 `/en/about` 与
   `/sitemap-products.xml`，若公开域名仍返回通用页面或错误 XML，则更新以非零状态退出。

如果提示未识别面板配置，请把 [nginx.conf.example](./nginx.conf.example)
中的公开 `location /` 代理规则复制到当前域名的 Nginx 站点配置，执行
`nginx -t` 后重载，再重新运行：

```bash
PUBLIC_SITE_URL=https://www.sunseasteel.com node scripts/verifySeoDelivery.mjs
```

验证通过后，在 Google Search Console 中对重要产品/文章 URL 使用“网址检查”，
确认抓取到的 canonical 与 JSON-LD 正确，再提交站点地图并等待 Google 重新抓取。
这些修复能消除技术交付阻碍，但不承诺具体排名位置。

> 💡 **此文件最后更新：2026-03-06**  
> 如有问题，将 `/tmp/steel-trader-db-manual-*.db` 中最新有数据的文件覆盖到 `data/database.db` 即可恢复。

## 产品评价系统部署后验收

继续使用项目既有更新脚本：

```bash
cd /www/wwwroot/steel-trader
bash server-update.sh
```

更新完成后按以下顺序验收：

1. 在后台“产品评价”中选择产品，手动新增一条真实评价；确认姓名、日期、小数评分、正文、验证购买和激励披露能够保存。
2. 使用外部 API 新增一条或 1–200 条批量评价，确认结果固定为 `pending`，然后由管理员多选、全选或批量发布；外部 API 本身不能发布。
3. 在“AI 全站翻译”选择 `reviews` / “产品评价”和目标语言，完成翻译后切换产品详情语言；非英语页不得回退或混入英文及其他语言。
4. 检查公开接口与产品 JSON-LD 使用相同数据：

```bash
curl -s "http://127.0.0.1:3001/api/product-reviews/product/产品ID?lang=en&page=1&limit=10"
curl -s -o /dev/null -w "产品详情 HTTP %{http_code}\n" "http://127.0.0.1:3001/en/products/产品slug"
node scripts/verifySeoDelivery.mjs
```

`verifySeoDelivery.mjs` 会同时检查本地和公开域名的产品详情 SSR、首条可见评价、公开评价 API、`#product-jsonld` 中的 Review/aggregateRating、about、站点地图和构建资源。无评价是合法状态，但出现旧的固定 `Verified Buyer`、`Excellent quality and service.` 或 `reviewCount=89` 会导致验证失败。

如果评价已发布但页面仍显示旧内容，先查看 PM2 日志中的 `[product-reviews] SEO cache invalidation failed` 或 `[product-review-translation] SEO cache invalidation failed` 警告，再重新执行上述交付验证；不要手工清空整个 `seo_render_cache` 表。

## 全站公开体验只读检查（SEO、手机、平板、电脑）

服务器更新成功后运行：

```bash
cd /www/wwwroot/steel-trader
PUBLIC_SITE_URL=https://www.sunseasteel.com npm run verify:public
```

该命令只读取公开网页，不修改数据库。它会递归读取全部站点地图，检查所有公开 URL 的 HTTP 状态、标题、描述、canonical、hreflang、H1 和现有 JSON-LD；随后为每种页面模板选取代表页，在以下三种视口检查横向溢出、页面脚本错误、本站资源失败和主内容坏图：

- 手机：390 × 844
- 平板：820 × 1180
- 电脑：1440 × 900

耗时取决于站点地图 URL 和页面模板数量，通常为数分钟。输出格式为：

```text
URL | ERROR/WARNING 检查代码 | 说明
```

`ERROR` 会让命令以非零状态退出，必须检查；第三方聊天、分析服务等站外资源失败只记为 `WARNING`。若服务器资源有限，可降低 HTTP 并发：

```bash
PUBLIC_VERIFY_CONCURRENCY=3 PUBLIC_SITE_URL=https://www.sunseasteel.com npm run verify:public
```

检查通过表示本次技术交付未发现阻断问题，不代表或承诺 Google 排名。评价覆盖统计只统计后台真实保存的评价，不会自动生成或发布虚构评价。
