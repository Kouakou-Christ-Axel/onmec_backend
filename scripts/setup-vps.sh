#!/bin/bash
set -e

# Usage: ./setup-vps.sh <repo-url>
# Example: ./setup-vps.sh git@github.com:org/onmec_backend.git

REPO_URL="${1:-}"
APP_DIR="/var/www/onmec/backend"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh" || { echo "nvm introuvable"; exit 1; }

command -v pm2 &>/dev/null || { echo "pm2 introuvable — installe-le avec: npm i -g pm2"; exit 1; }

mkdir -p "$APP_DIR"

if [ ! -d "$APP_DIR/.git" ]; then
  [ -n "$REPO_URL" ] || { echo "Usage: $0 <repo-url>"; exit 1; }
  git clone "$REPO_URL" "$APP_DIR"
fi

mkdir -p "$APP_DIR/logs"

pm2 startup systemd | tail -1 | bash
pm2 save
