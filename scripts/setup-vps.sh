#!/bin/bash
set -e

# Configure PM2 pour démarrer automatiquement au reboot du serveur

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh" || { echo "nvm introuvable"; exit 1; }

pm2 startup systemd | tail -1 | bash
