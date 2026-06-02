#!/bin/bash
# =============================================================
# SunSea Steel - Docker One-Click Update
# Usage: cd /www/wwwroot/steel-trader && bash docker-update.sh
# =============================================================
set -e

G='\033[0;32m'; B='\033[0;34m'; Y='\033[1;33m'; N='\033[0m'
ok()   { echo -e "${G}[OK] $1${N}"; }
info() { echo -e "${B}[..] $1${N}"; }
warn() { echo -e "${Y}[!!] $1${N}"; }

[ "$EUID" -eq 0 ] && SUDO="" || SUDO="sudo"

echo ""
echo "======================================================"
echo "  SunSea Steel - Docker Update  $(date '+%Y-%m-%d %H:%M')"
echo "======================================================"
echo ""

[ ! -f "docker-compose.yml" ] && echo "Run from project directory!" && exit 1

# 1. Pull latest code
info "Pulling latest code from GitHub..."
git fetch origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "unknown")
if [ "$LOCAL" = "$REMOTE" ]; then
  warn "Already up to date. Force rebuild? (y/n)"
  read -r -n1 REPLY; echo
  [[ ! $REPLY =~ ^[Yy]$ ]] && echo "Cancelled." && exit 0
fi
git pull
ok "Code: $(git log --oneline -1)"

# 2. Rebuild and restart (zero-downtime: build new, then swap)
info "Rebuilding Docker image..."
$SUDO docker compose build --no-cache

info "Restarting containers..."
$SUDO docker compose up -d --remove-orphans

# 3. Clean up old images
$SUDO docker image prune -f >/dev/null 2>&1
ok "Old images cleaned up"

# 4. Status
echo ""
$SUDO docker compose ps
echo ""
echo "======================================================"
ok "Update complete!  $(date '+%H:%M:%S')"
echo "======================================================"
echo ""
echo "Live logs: docker compose logs -f"
