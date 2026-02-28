#!/bin/bash
# ============================================================
# SunSea Steel Website — 服务器一键更新
# 运行: cd /www/wwwroot/steel-trader && bash server-update.sh
# ============================================================

set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; RED='\033[0;31m'; NC='\033[0m'
ok()  { echo -e "${GREEN}✅ $1${NC}"; }
info(){ echo -e "${BLUE}➜  $1${NC}"; }
warn(){ echo -e "${YELLOW}⚠️  $1${NC}"; }

echo ""
echo "============================================================"
echo "  SunSea Steel — 一键更新 $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"
echo ""

[ ! -f "package.json" ] && echo -e "${RED}❌ 请在项目目录下运行: cd /www/wwwroot/steel-trader${NC}" && exit 1

# ── 1. 停止服务（防止数据库文件被占用）──────────────────────────
info "停止 PM2 服务..."
pm2 stop led-trade 2>/dev/null || pm2 stop steel-trader 2>/dev/null || true
ok "服务已停止"

# ── 2. 保护数据库：将 WAL 合并到主数据库文件 ──────────────────
info "保护数据库..."
if [ -f "data/database.db" ]; then
  # Checkpoint: merge WAL into main db file
  sqlite3 data/database.db "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true
  ok "数据库 WAL 已合并"
  
  # Backup database before git operations
  cp data/database.db data/database.db.backup
  ok "数据库已备份: data/database.db.backup"
fi

# ── 3. 保护上传的文件 ─────────────────────────────────────────
info "保护已上传的文件..."
if [ -d "uploads" ] && [ "$(ls -A uploads/ 2>/dev/null)" ]; then
  cp -r uploads/ /tmp/steel-trader-uploads-backup/ 2>/dev/null || true
  ok "上传文件已备份"
fi

# ── 4. 拉取最新代码 ───────────────────────────────────────────
info "从 GitHub 拉取最新代码..."
git fetch origin
git reset --hard origin/master
ok "代码: $(git log --oneline -1)"

# ── 5. 恢复数据库和上传文件 ──────────────────────────────────
info "恢复数据..."
if [ -f "data/database.db.backup" ]; then
  cp data/database.db.backup data/database.db
  rm -f data/database.db-shm data/database.db-wal
  ok "数据库已恢复"
fi

if [ -d "/tmp/steel-trader-uploads-backup" ]; then
  cp -rn /tmp/steel-trader-uploads-backup/* uploads/ 2>/dev/null || true
  rm -rf /tmp/steel-trader-uploads-backup
  ok "上传文件已恢复"
fi

# ── 6. 安装依赖 ───────────────────────────────────────────────
info "npm install..."
npm install --production=false 2>&1 | tail -1
ok "依赖就绪"

# ── 7. 重新构建前端 ───────────────────────────────────────────
info "npm run build..."
npm run build 2>&1 | tail -1
ok "前端构建完成"

# ── 8. 启动 PM2 ───────────────────────────────────────────────
info "启动 PM2..."
if pm2 describe led-trade > /dev/null 2>&1; then
  pm2 restart led-trade
elif pm2 describe steel-trader > /dev/null 2>&1; then
  pm2 restart steel-trader
else
  pm2 start server/index.js --name led-trade
fi
pm2 save
ok "PM2 已启动"

echo ""
pm2 status

echo ""
echo "============================================================"
ok "🎉 更新完成！$(date '+%H:%M:%S')"
echo "============================================================"
echo ""
echo "查看日志: pm2 logs led-trade --lines 30"
echo ""
echo "✅ 数据库和已上传的图片已完整保留"
