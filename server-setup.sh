#!/bin/bash
# =============================================================
# SunSea Steel Website - One-Click Server Setup
# Tested on: Ubuntu 22.04 LTS (non-root user with sudo)
# Usage: bash server-setup.sh
# =============================================================
set -e

G='\033[0;32m'; Y='\033[1;33m'; B='\033[0;34m'; R='\033[0;31m'; N='\033[0m'
ok()   { echo -e "${G}[OK] $1${N}"; }
info() { echo -e "${B}[..] $1${N}"; }
warn() { echo -e "${Y}[!!] $1${N}"; }
die()  { echo -e "${R}[ERR] $1${N}"; exit 1; }

# ---------- Config (pre-filled) ----------
REPO="https://github.com/jameson99799/steel-trader-website.git"
DIR="/www/wwwroot/steel-trader"
DOMAIN="www.sunseasteel.com"
APP_NAME="led-trade"
PORT=3001
# -----------------------------------------

# Detect root vs sudo
if [ "$EUID" -eq 0 ]; then
  SUDO=""
  warn "Running as root"
else
  SUDO="sudo"
  warn "Running as $(whoami) - using sudo for system commands"
  sudo -n true 2>/dev/null || sudo -v || die "No sudo access. Try: sudo bash server-setup.sh"
fi

echo ""
echo "======================================================"
echo "  SunSea Steel - One-Click Setup"
echo "  Repo   : $REPO"
echo "  Dir    : $DIR"
echo "  Domain : $DOMAIN"
echo "======================================================"
echo ""

# 1. System updates (optional but safe)
info "Updating apt cache..."
$SUDO apt-get update -qq

# 2. Node.js 20 LTS
if ! command -v node &>/dev/null; then
  info "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO bash - >/dev/null
  $SUDO apt-get install -y nodejs
fi
node --version | grep -q "v2" || die "Node.js 20 required. Found: $(node --version 2>/dev/null || echo 'none')"
ok "Node.js $(node --version)"

# 3. Git
if ! command -v git &>/dev/null; then
  info "Installing git..."
  $SUDO apt-get install -y git
fi
ok "Git $(git --version | cut -d' ' -f3)"

# 4. Nginx
if ! command -v nginx &>/dev/null; then
  info "Installing Nginx..."
  $SUDO apt-get install -y nginx
fi
ok "Nginx ready"

# 5. PM2
if ! command -v pm2 &>/dev/null; then
  info "Installing PM2..."
  $SUDO npm install -g pm2 --silent
fi
ok "PM2 $(pm2 --version)"

# 6. Deploy directory
info "Preparing deploy directory..."
$SUDO mkdir -p "$DIR"
$SUDO chown -R "$(whoami)":"$(whoami)" "$DIR"

# 7. Clone or update code
if [ -d "$DIR/.git" ]; then
  info "Updating existing code..."
  cd "$DIR"
  git pull --ff-only || { git fetch origin; git reset --hard origin/master; }
else
  info "Cloning repository..."
  git clone "$REPO" "$DIR"
  cd "$DIR"
fi
ok "Code: $(git log --oneline -1)"

# 8. Install Node dependencies
info "Installing dependencies..."
npm install --silent
ok "Dependencies ready"

# 9. Build frontend
info "Building frontend..."
npm run build
ok "Frontend built (dist/ ready)"

# 10. Create directories
mkdir -p data uploads logs

# 11. Environment file
if [ ! -f .env ]; then
  info "Creating .env..."
  JWT=$(head /dev/urandom | tr -dc 'A-Za-z0-9' | head -c 48)
  cat > .env << ENVEOF
NODE_ENV=production
PORT=${PORT}
JWT_SECRET=${JWT}
ENVEOF
  ok ".env created (JWT auto-generated)"
else
  ok ".env already exists"
fi

# 12. PM2 ecosystem config
cat > ecosystem.config.cjs << ECOEOF
module.exports = {
  apps: [{
    name: '${APP_NAME}',
    script: 'server/index.js',
    cwd: '${DIR}',
    instances: 1,
    exec_mode: 'fork',
    env: { NODE_ENV: 'production', PORT: ${PORT} },
    error_file: '${DIR}/logs/err.log',
    out_file:   '${DIR}/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M'
  }]
}
ECOEOF

# 13. Start/restart PM2
info "Starting PM2 app..."
pm2 delete "$APP_NAME" 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save --force >/dev/null
ok "PM2 app '$APP_NAME' started on port $PORT"

# 14. PM2 startup on reboot
info "Configuring PM2 auto-start..."
if [ "$EUID" -eq 0 ]; then
  pm2 startup systemd >/dev/null 2>&1 || true
else
  # Get the startup command and execute it
  STARTUP_CMD=$(pm2 startup systemd -u "$(whoami)" --hp "$HOME" 2>&1 | grep "sudo" | tail -1)
  if [ -n "$STARTUP_CMD" ]; then
    eval "$STARTUP_CMD" >/dev/null 2>&1 || warn "PM2 startup skipped - run manually if needed"
  fi
  pm2 save --force >/dev/null
fi
ok "PM2 auto-start configured"

# 15. Nginx site config
info "Writing Nginx config..."
$SUDO tee /etc/nginx/sites-available/${APP_NAME} >/dev/null << NGINXEOF
server {
    listen 80;
    server_name ${DOMAIN} sunseasteel.com 43.159.129.164;
    client_max_body_size 20M;

    # Frontend (Vue SPA)
    location / {
        root ${DIR}/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # Hashed assets - long cache
    location /assets/ {
        root ${DIR}/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # API proxy -> Node.js
    location /api/ {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_connect_timeout 30s;
        proxy_read_timeout 300s;
    }

    # Uploads
    location /uploads/ {
        alias ${DIR}/uploads/;
        expires 30d;
        access_log off;
    }

    # Dynamic sitemap
    location = /sitemap.xml {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_set_header Host \$host;
    }
}
NGINXEOF

# Enable site, disable default
$SUDO ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/${APP_NAME}
$SUDO rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

# Test and reload
$SUDO nginx -t || die "Nginx config test failed"
$SUDO systemctl enable nginx >/dev/null 2>&1
$SUDO systemctl reload nginx 2>/dev/null || $SUDO systemctl restart nginx
ok "Nginx configured for $DOMAIN"

# 16. Firewall
$SUDO ufw allow 22/tcp  >/dev/null 2>&1 || true
$SUDO ufw allow 80/tcp  >/dev/null 2>&1 || true
$SUDO ufw allow 443/tcp >/dev/null 2>&1 || true

# Done!
echo ""
echo "======================================================"
echo -e "${G}  All done! Your website is live.${N}"
echo "======================================================"
echo ""
echo "  Visit   : http://43.159.129.164"
echo "  or      : http://${DOMAIN}  (after DNS)"
echo "  Admin   : http://43.159.129.164/admin/login"
echo "  Account : admin / admin123  <-- CHANGE THIS!"
echo ""
echo "  PM2 commands:"
echo "    pm2 status            # running processes"
echo "    pm2 logs ${APP_NAME}  # live logs"
echo "    pm2 restart ${APP_NAME}"
echo ""
echo "  Update code anytime:"
echo "    cd ${DIR} && bash server-update.sh"
echo "======================================================"
