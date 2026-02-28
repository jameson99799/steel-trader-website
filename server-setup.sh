#!/bin/bash
# ============================================================
# LED Trade Website — 服务器一键安装脚本
# 针对: www.sunseasteel.com (43.159.129.164)
# 运行: bash server-setup.sh
# ============================================================

set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; RED='\033[0;31m'; NC='\033[0m'
ok()  { echo -e "${GREEN}✅ $1${NC}"; }
info(){ echo -e "${BLUE}➜  $1${NC}"; }
warn(){ echo -e "${YELLOW}⚠️  $1${NC}"; }
err() { echo -e "${RED}❌ $1${NC}"; exit 1; }

# ─── 配置（已预填）────────────────────────────────────────────
GITHUB_REPO="https://github.com/jameson99799/steel-trader-website.git"
DEPLOY_DIR="/www/wwwroot/steel-trader"
DOMAIN="www.sunseasteel.com"
# ─────────────────────────────────────────────────────────────

echo ""
echo "============================================================"
echo "  SunSea Steel Website — 服务器一键安装"
echo "  域名: $DOMAIN"
echo "  目录: $DEPLOY_DIR"
echo "  仓库: $GITHUB_REPO"
echo "============================================================"
echo ""

# ── 1. 检测系统并安装 Node.js 20 LTS ─────────────────────────
if ! command -v node &>/dev/null || [[ $(node -e "process.exit(process.version.slice(1).split('.')[0] < 18 ? 1 : 0)" 2>/dev/null; echo $?) == "1" ]]; then
  info "安装 Node.js 20 LTS..."
  if command -v apt-get &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  elif command -v yum &>/dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs
  else
    err "不支持的系统，请手动安装 Node.js 20"
  fi
fi
ok "Node.js $(node --version)"

# ── 2. 安装 Git ───────────────────────────────────────────────
if ! command -v git &>/dev/null; then
  command -v apt-get &>/dev/null && apt-get install -y git || yum install -y git
fi
ok "Git 就绪"

# ── 3. 安装 PM2 ───────────────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
  info "安装 PM2..."
  npm install -g pm2
fi
ok "PM2 $(pm2 --version)"

# ── 4. 克隆代码 ───────────────────────────────────────────────
mkdir -p "$(dirname "$DEPLOY_DIR")"
if [ -d "$DEPLOY_DIR/.git" ]; then
  info "更新现有仓库..."
  cd "$DEPLOY_DIR"
  git pull
else
  info "克隆仓库..."
  git clone "$GITHUB_REPO" "$DEPLOY_DIR"
  cd "$DEPLOY_DIR"
fi
ok "代码就绪: $(git log --oneline -1)"

# ── 5. 安装依赖 ───────────────────────────────────────────────
info "npm install..."
npm install
ok "依赖安装完成"

# ── 6. 构建前端 ───────────────────────────────────────────────
info "npm run build..."
npm run build
ok "前端构建完成"

# ── 7. 目录和环境变量 ─────────────────────────────────────────
mkdir -p data uploads logs
if [ ! -f .env ]; then
  JWT_SEC=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 48)
  cat > .env << ENVEOF
NODE_ENV=production
PORT=3001
JWT_SECRET=${JWT_SEC}
ENVEOF
  ok ".env 已创建（JWT_SECRET 随机生成）"
else
  ok ".env 已存在"
fi

# ── 8. PM2 启动 ───────────────────────────────────────────────
info "启动 PM2..."
pm2 delete steel-trader 2>/dev/null || true
# 更新 ecosystem 使用 steel-trader 名称
cat > ecosystem.config.cjs << 'ECOEOF'
module.exports = {
  apps: [{
    name: 'steel-trader',
    script: 'server/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: { NODE_ENV: 'production', PORT: 3001 },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M'
  }]
}
ECOEOF
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup 2>/dev/null || true
ok "PM2 已启动"

# ── 9. 安装并配置 Nginx ──────────────────────────────────────
if ! command -v nginx &>/dev/null; then
  info "安装 Nginx..."
  command -v apt-get &>/dev/null && apt-get install -y nginx || yum install -y nginx
fi

info "配置 Nginx..."
NGINX_DIR="/etc/nginx"
# 检测 Nginx 配置路径 (CentOS 无 sites-available)
if [ -d "$NGINX_DIR/sites-available" ]; then
  CONF_FILE="$NGINX_DIR/sites-available/steel-trader"
  ln -sf "$CONF_FILE" "$NGINX_DIR/sites-enabled/steel-trader" 2>/dev/null || true
  rm -f "$NGINX_DIR/sites-enabled/default" 2>/dev/null || true
else
  CONF_FILE="$NGINX_DIR/conf.d/steel-trader.conf"
fi

cat > "$CONF_FILE" << NGINXEOF
server {
    listen 80;
    server_name ${DOMAIN} sunseasteel.com 43.159.129.164;
    client_max_body_size 20M;

    # 前端静态文件
    location / {
        root ${DEPLOY_DIR}/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # 带缓存的静态资源
    location /assets/ {
        root ${DEPLOY_DIR}/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 300s;
        proxy_connect_timeout 30s;
    }

    # 上传文件
    location /uploads/ {
        alias ${DEPLOY_DIR}/uploads/;
        expires 30d;
    }

    # Sitemap (Node 生成)
    location = /sitemap.xml {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host \$host;
    }
}
NGINXEOF

nginx -t && (service nginx reload 2>/dev/null || systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null)
ok "Nginx 配置完成"

# ── 10. 防火墙 ────────────────────────────────────────────────
ufw allow 80/tcp 2>/dev/null || firewall-cmd --permanent --add-port=80/tcp 2>/dev/null || true
ufw allow 443/tcp 2>/dev/null || firewall-cmd --permanent --add-port=443/tcp 2>/dev/null || true

# ── 完成 ──────────────────────────────────────────────────────
echo ""
echo "============================================================"
echo -e "${GREEN}🎉 部署完成！${NC}"
echo "============================================================"
echo ""
echo -e "${GREEN}  🌐 网站地址:   http://${DOMAIN}${NC}"
echo -e "${GREEN}  🔧 后台地址:   http://${DOMAIN}/admin/login${NC}"
echo -e "${GREEN}  👤 默认账号:   admin / admin123${NC}"
echo -e "${YELLOW}  ⚠️  请立即登录后修改密码！${NC}"
echo ""
echo "常用命令:"
echo "  pm2 logs steel-trader       # 查看日志"
echo "  pm2 restart steel-trader    # 重启服务"
echo "  pm2 status                  # 查看状态"
echo ""
echo "一键更新: cd ${DEPLOY_DIR} && bash server-update.sh"
echo ""
