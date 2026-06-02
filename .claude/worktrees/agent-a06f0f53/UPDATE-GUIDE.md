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

> 💡 **此文件最后更新：2026-03-06**  
> 如有问题，将 `/tmp/steel-trader-db-manual-*.db` 中最新有数据的文件覆盖到 `data/database.db` 即可恢复。
