#!/bin/bash
set -e

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh" || { echo "nvm introuvable"; exit 1; }

command -v pm2 &>/dev/null || { echo "pm2 introuvable — installe-le avec: npm i -g pm2"; exit 1; }

APP_DIR="/var/www/onmec/backend"

[ -d "$APP_DIR" ] || { echo "Répertoire app introuvable: $APP_DIR"; exit 1; }

mkdir -p "$APP_DIR/logs"

pm2 startup systemd | tail -1 | bash
pm2 save
