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

if [ "$EUID" -eq 0 ]; then
  SUDO=""
else
  SUDO="sudo"
fi

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
# ── 3.5. 自动清理多余的历史备份（仅保留最近 5 个）─────────────
info "清理多余的历史备份包 (仅保留最新5个)..."
ls -tp /tmp/steel-trader-db-*.db 2>/dev/null | grep -v '/$' | tail -n +6 | xargs -I {} sudo rm -f -- {} || true
ls -td /tmp/steel-trader-uploads-* 2>/dev/null | tail -n +6 | xargs -I {} sudo rm -rf -- {} || true
ok "陈旧备份瘦身完成"

# ── 4. 拉取最新代码（git reset --hard 不影响 /tmp 备份）────
info "从 GitHub 拉取最新代码..."
git fetch origin
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || git rev-parse --abbrev-ref HEAD)
info "正在重置到 origin/${CURRENT_BRANCH}..."
git reset --hard "origin/${CURRENT_BRANCH}"
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
info "清除旧构建文件..."
# dist/ 可能由 root/Docker 构建，需先修复权限再删除
if [ -d "dist" ]; then
  sudo chown -R "$(whoami):$(whoami)" dist/ 2>/dev/null || true
  rm -rf dist
fi
info "npm run build..."
npm run build 2>&1 | tail -3
# Verify the new build is present
if [ ! -f "dist/index.html" ]; then
  fail "构建失败：dist/index.html 不存在！"
fi
NEW_HASH=$(grep -oP 'index-[A-Za-z0-9_-]+\.js' dist/index.html | head -1)
ok "前端构建完成 (${NEW_HASH})"

# ── 9. 停止 → 启动 PM2（严格顺序：先停，再启动）──────────────
info "停止旧进程..."
pm2 stop led-trade 2>/dev/null || pm2 stop steel-trader 2>/dev/null || true
pm2 delete led-trade 2>/dev/null || pm2 delete steel-trader 2>/dev/null || true
ok "旧进程已清除"

info "创建日志目录..."
mkdir -p logs

info "启动新进程（使用 ecosystem.config.cjs，NODE_ENV=production 已固定）..."
pm2 start ecosystem.config.cjs
pm2 save
ok "PM2 已启动（NODE_ENV=production）"

echo ""
pm2 status

# ── Guarded migration of the setup-generated legacy SPA vhost ──
info "Checking whether the legacy Nginx SPA delivery block needs migration..."
SEO_NGINX_MIGRATED=0
for SEO_NGINX_CONF in \
  /etc/nginx/sites-available/led-trade \
  /etc/nginx/sites-available/steel-trader \
  /www/server/panel/vhost/nginx/sunseasteel.com.conf \
  /www/server/panel/vhost/nginx/www.sunseasteel.com.conf; do
  [ -f "$SEO_NGINX_CONF" ] || continue

  SEO_NGINX_TMP="/tmp/steel-trader-nginx-${TIMESTAMP}.conf"
  $SUDO node scripts/nginxSsrConfig.mjs \
    --input "$SEO_NGINX_CONF" \
    --output "$SEO_NGINX_TMP" \
    --port "${PORT:-3001}"

  if ! $SUDO cmp -s "$SEO_NGINX_CONF" "$SEO_NGINX_TMP"; then
    SEO_NGINX_BACKUP="${SEO_NGINX_CONF}.seo-backup-${TIMESTAMP}"
    $SUDO cp "$SEO_NGINX_CONF" "$SEO_NGINX_BACKUP"
    $SUDO cp "$SEO_NGINX_TMP" "$SEO_NGINX_CONF"

    if ! $SUDO nginx -t; then
      $SUDO cp "$SEO_NGINX_BACKUP" "$SEO_NGINX_CONF"
      $SUDO nginx -t || true
      $SUDO rm -f "$SEO_NGINX_TMP"
      fail "Nginx SEO migration validation failed. Restored: ${SEO_NGINX_BACKUP}"
    fi

    $SUDO systemctl reload nginx 2>/dev/null || $SUDO nginx -s reload
    SEO_NGINX_MIGRATED=1
    ok "Nginx public HTML now routes through Node. Backup: ${SEO_NGINX_BACKUP}"
  fi
  $SUDO rm -f "$SEO_NGINX_TMP"
done

if [ "$SEO_NGINX_MIGRATED" -eq 0 ]; then
  warn "No setup-generated legacy SPA block was changed. Existing panel-managed Nginx files were left untouched."
fi

# ── 10. 智能修复 Nginx 视频上传大小限制 ──────────────
info "检查本站点的大视频上传限制..."
NGINX_UPLOAD_CHANGED=0
for NGINX_CONF in \
  /etc/nginx/sites-available/led-trade \
  /etc/nginx/sites-available/steel-trader \
  /www/server/panel/vhost/nginx/sunseasteel.com.conf \
  /www/server/panel/vhost/nginx/www.sunseasteel.com.conf; do
  if [ -f "$NGINX_CONF" ] && grep -q "client_max_body_size" "$NGINX_CONF"; then
    NGINX_UPLOAD_BACKUP="${NGINX_CONF}.upload-backup-${TIMESTAMP}"
    $SUDO cp "$NGINX_CONF" "$NGINX_UPLOAD_BACKUP"
    $SUDO sed -i -E 's/client_max_body_size[[:space:]]+[0-9]+[A-Za-z]?/client_max_body_size 1024M/g' "$NGINX_CONF"
    if ! $SUDO nginx -t; then
      $SUDO cp "$NGINX_UPLOAD_BACKUP" "$NGINX_CONF"
      $SUDO nginx -t || true
      fail "Nginx upload-limit validation failed. Restored: ${NGINX_UPLOAD_BACKUP}"
    fi
    NGINX_UPLOAD_CHANGED=1
  fi
done
if [ "$NGINX_UPLOAD_CHANGED" -eq 1 ]; then
  $SUDO systemctl reload nginx 2>/dev/null || $SUDO nginx -s reload
  ok "本站点最大支持 1024M 上传；未修改其他网站的 Nginx 配置。"
else
  warn "未找到本站点现有的 client_max_body_size；为避免误改面板配置，本次未自动插入。"
fi

# ── Public delivery gate: fail if Nginx/CDN still serves the generic SPA shell ──
info "验证 Node 与公开域名的 SEO HTML 和子站点地图..."
if ! PUBLIC_SITE_URL="${PUBLIC_SITE_URL:-https://www.sunseasteel.com}" \
  node scripts/verifySeoDelivery.mjs; then
  fail "公开 SEO 交付验证失败。请按 nginx.conf.example 检查当前域名的 location / 代理配置。"
fi
ok "公开 SEO 交付验证通过"

echo ""
echo "============================================================"
ok "🎉 更新完成！$(date '+%H:%M:%S')"
echo "============================================================"
echo ""
echo "查看日志: pm2 logs led-trade --lines 30"
echo "数据库备份: ${DB_BACKUP}"
echo ""
ok "数据库和已上传的图片已完整保留"
