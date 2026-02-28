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

# ── 1. 拉取最新代码（强制覆盖，不影响数据库和uploads）──────────
info "从 GitHub 拉取最新代码..."
git fetch origin
git reset --hard origin/master
ok "代码: $(git log --oneline -1)"

# ── 2. 安装依赖 ───────────────────────────────────────────────
info "npm install..."
npm install --production=false
ok "依赖就绪"

# ── 3. 重新构建前端 ───────────────────────────────────────────
info "npm run build..."
npm run build
ok "前端构建完成"

# ── 4. 重启 PM2 ───────────────────────────────────────────────
info "重启 PM2..."
# Try both possible PM2 process names
if pm2 describe led-trade > /dev/null 2>&1; then
  pm2 restart led-trade
  ok "PM2 进程 led-trade 已重启"
elif pm2 describe steel-trader > /dev/null 2>&1; then
  pm2 restart steel-trader
  ok "PM2 进程 steel-trader 已重启"
else
  # No existing process, start new one
  pm2 start server/index.js --name led-trade --node-args="--experimental-specifier-resolution=node"
  ok "PM2 进程 led-trade 已启动"
fi
pm2 save

echo ""
pm2 status

echo ""
echo "============================================================"
ok "🎉 更新完成！$(date '+%H:%M:%S')"
echo "============================================================"
echo ""
echo "查看日志: pm2 logs led-trade --lines 30"
echo ""
echo "⚠️  注意: 数据库和已上传的图片不受更新影响，会自动保留"
