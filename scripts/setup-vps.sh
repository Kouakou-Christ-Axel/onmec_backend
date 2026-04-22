#!/bin/bash
set -e

# ============================================================
# Setup one-time VPS pour onmec_backend
# À exécuter en tant que l'utilisateur de déploiement (déjà créé)
# Prérequis : utilisateur SSH, nvm + Node 22, PostgreSQL déjà installés
# ============================================================

APP_DIR="/var/www/onmec/backend"
DB_NAME="onmec"
DB_USER="onmec_user"

echo "=== [1/3] Installation de PM2 ==="
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh" || { echo "nvm introuvable"; exit 1; }
pnpm add -g pm2
pm2 startup systemd | tail -1 | bash || true

echo "=== [2/3] Création de la base de données et de l'utilisateur PostgreSQL ==="
if [ -z "${DB_PASSWORD:-}" ]; then
  read -rsp "Mot de passe PostgreSQL pour $DB_USER: " DB_PASSWORD
  echo
fi
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD \$\$$DB_PASSWORD\$\$;"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

echo "=== [3/3] Clone du repository ==="
mkdir -p "$APP_DIR"
git clone https://github.com/TON_ORG/onmec_backend.git "$APP_DIR" || \
  (cd "$APP_DIR" && git pull origin master)

echo ""
echo "=== Instructions manuelles restantes ==="
echo ""
echo "  1. Copier le .env.production sur le VPS :"
echo "     scp .env.production USER@VPS_IP:$APP_DIR/.env.production"
echo ""
echo "  2. Premier déploiement manuel :"
echo "     cd $APP_DIR"
echo "     pnpm install --frozen-lockfile"
echo "     npx prisma migrate deploy"
echo "     npx prisma generate"
echo "     pnpm build"
echo "     pm2 start ecosystem.config.js --env production"
echo "     pm2 save"
echo ""
echo "  3. Ajouter les secrets GitHub (Settings > Secrets > Actions) :"
echo "     SSH_KEY  = clé privée SSH de l'utilisateur de déploiement"
echo "     SSH_USER = nom de l'utilisateur"
echo "     SSH_HOST = IP ou hostname du VPS"
echo ""
echo "=== Setup terminé ==="
