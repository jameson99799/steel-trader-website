#!/bin/bash
# =============================================================
# SunSea Steel - Docker One-Click Setup
# Tested on: Ubuntu 22.04 LTS
# Usage: bash docker-setup.sh
# =============================================================
set -e

G='\033[0;32m'; Y='\033[1;33m'; B='\033[0;34m'; R='\033[0;31m'; N='\033[0m'
ok()   { echo -e "${G}[OK] $1${N}"; }
info() { echo -e "${B}[..] $1${N}"; }
warn() { echo -e "${Y}[!!] $1${N}"; }
die()  { echo -e "${R}[ERR] $1${N}"; exit 1; }

REPO="https://github.com/jameson99799/steel-trader-website.git"
DIR="/www/wwwroot/steel-trader"
DOMAIN="www.sunseasteel.com"

# Sudo detection
[ "$EUID" -eq 0 ] && SUDO="" || SUDO="sudo"
[ "$SUDO" = "sudo" ] && { sudo -v 2>/dev/null || die "No sudo access"; }

echo ""
echo "======================================================"
echo "  SunSea Steel - Docker One-Click Setup"
echo "  Domain : $DOMAIN"
echo "======================================================"
echo ""

# 1. Install Docker
if ! command -v docker &>/dev/null; then
  info "Installing Docker..."
  curl -fsSL https://get.docker.com | $SUDO sh
  $SUDO usermod -aG docker "$(whoami)"
  warn "Docker installed. If this is first run, log out and back in for group permissions."
  warn "Then re-run this script. Or prefix commands with: sudo"
fi
ok "Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"

# 2. Install Docker Compose plugin
if ! docker compose version &>/dev/null 2>&1; then
  info "Installing Docker Compose plugin..."
  $SUDO apt-get install -y docker-compose-plugin 2>/dev/null || \
  $SUDO curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && \
  $SUDO chmod +x /usr/local/bin/docker-compose
fi
ok "Docker Compose ready"

# 3. Install Git
if ! command -v git &>/dev/null; then
  $SUDO apt-get install -y git
fi
ok "Git ready"

# 4. Clone or update code
$SUDO mkdir -p "$DIR"
$SUDO chown -R "$(whoami)":"$(whoami)" "$DIR"
if [ -d "$DIR/.git" ]; then
  info "Updating existing code..."
  cd "$DIR" && git pull
else
  info "Cloning repository..."
  git clone "$REPO" "$DIR"
  cd "$DIR"
fi
ok "Code: $(git log --oneline -1)"

# 5. Create persistent directories
mkdir -p data uploads logs

# 6. Create .env
if [ ! -f .env ]; then
  JWT=$(head /dev/urandom | tr -dc 'A-Za-z0-9' | head -c 48)
  cat > .env << ENVEOF
JWT_SECRET=${JWT}
ENVEOF
  ok ".env created (JWT auto-generated)"
else
  ok ".env exists"
fi

# 7. Build and start containers
info "Building Docker image (this takes 2-3 minutes first time)..."
$SUDO docker compose up -d --build
ok "Containers started"

# 8. Wait for health check
info "Waiting for app to be ready..."
sleep 8
$SUDO docker compose ps

# 9. Firewall
$SUDO ufw allow 22/tcp  2>/dev/null || true
$SUDO ufw allow 80/tcp  2>/dev/null || true
$SUDO ufw allow 443/tcp 2>/dev/null || true

# Done
echo ""
echo "======================================================"
echo -e "${G}  Docker setup complete!${N}"
echo "======================================================"
echo ""
echo "  Visit   : http://43.159.129.164"
echo "  or      : http://${DOMAIN}  (after DNS setup)"
echo "  Admin   : http://43.159.129.164/admin/login"
echo "  Account : admin / admin123  <-- CHANGE THIS!"
echo ""
echo "  Docker commands:"
echo "    docker compose ps              # container status"
echo "    docker compose logs -f         # live logs"
echo "    docker compose restart         # restart all"
echo "    docker compose down            # stop all"
echo ""
echo "  Update anytime:"
echo "    cd ${DIR} && bash docker-update.sh"
echo "======================================================"
