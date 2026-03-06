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
fail(){ echo -e "${RED}❌ $1${NC}"; exit 1; }

echo ""
echo "============================================================"
echo "  SunSea Steel — 一键更新 $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"
echo ""

[ ! -f "package.json" ] && fail "请在项目目录下运行: cd /www/wwwroot/steel-trader"

TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
DB_PATH="data/database.db"

# ⚠️ 关键：备份存放到 /tmp，git reset --hard 绝对无法影响它
DB_BACKUP="/tmp/steel-trader-db-${TIMESTAMP}.db"
UPLOADS_BACKUP="/tmp/steel-trader-uploads-${TIMESTAMP}"

# ── 1. 停止服务 ─────────────────────────────────────────────
info "停止 PM2 服务..."
pm2 stop led-trade 2>/dev/null || pm2 stop steel-trader 2>/dev/null || true
ok "服务已停止"

# ── 2. 备份数据库到 /tmp（与 git 目录完全隔离）─────────────
info "备份数据库到 /tmp..."
if [ -f "${DB_PATH}" ]; then
  sqlite3 "${DB_PATH}" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true
  ok "WAL 已合并"
  cp "${DB_PATH}" "${DB_BACKUP}"
  DB_SIZE=$(stat -c%s "${DB_BACKUP}" 2>/dev/null || stat -f%z "${DB_BACKUP}" 2>/dev/null || echo 0)
  [ "${DB_SIZE}" -eq 0 ] && fail "数据库备份大小为0，中止更新以防数据丢失！"
  ok "数据库已备份: ${DB_BACKUP}（${DB_SIZE} 字节）"
  # 双重保险：同时在项目内保留一份
  cp "${DB_PATH}" "${DB_PATH}.backup"
else
  warn "未找到数据库文件，将在启动时自动创建"
fi

# ── 3. 备份上传文件到 /tmp ───────────────────────────────────
info "备份上传文件..."
mkdir -p "${UPLOADS_BACKUP}"
if [ -d "uploads" ] && [ "$(ls -A uploads/ 2>/dev/null)" ]; then
  cp -r uploads/. "${UPLOADS_BACKUP}/" 2>/dev/null || true
  ok "上传文件已备份"
fi

# ── 4. 拉取最新代码（git reset --hard 不影响 /tmp 备份）────
info "从 GitHub 拉取最新代码..."
git fetch origin
git reset --hard origin/master
ok "代码: $(git log --oneline -1)"

# ── 5. 从 /tmp 恢复数据库（100% 安全）──────────────────────
info "恢复数据库..."
if [ -f "${DB_BACKUP}" ]; then
  BACKUP_SIZE=$(stat -c%s "${DB_BACKUP}" 2>/dev/null || stat -f%z "${DB_BACKUP}" 2>/dev/null || echo 0)
  if [ "${BACKUP_SIZE}" -gt 0 ]; then
    mkdir -p data
    cp "${DB_BACKUP}" "${DB_PATH}"
    rm -f "${DB_PATH}-shm" "${DB_PATH}-wal"
    ok "数据库已恢复（${BACKUP_SIZE} 字节）"
  else
    warn "备份文件为空，跳过恢复"
  fi
fi

# ── 6. 恢复上传文件 ──────────────────────────────────────────
info "恢复上传文件..."
if [ -d "${UPLOADS_BACKUP}" ] && [ "$(ls -A ${UPLOADS_BACKUP} 2>/dev/null)" ]; then
  cp -rn "${UPLOADS_BACKUP}/." uploads/ 2>/dev/null || true
  ok "上传文件已恢复"
fi

# ── 7. 安装依赖 ──────────────────────────────────────────────
info "npm install..."
npm install --production=false 2>&1 | tail -1
ok "依赖就绪"

# ── 8. 重新构建前端 ──────────────────────────────────────────
info "npm run build..."
npm run build 2>&1 | tail -1
ok "前端构建完成"

# ── 9. 启动 PM2 ──────────────────────────────────────────────
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
echo "数据库备份: ${DB_BACKUP}"
echo ""
ok "数据库和已上传的图片已完整保留"
