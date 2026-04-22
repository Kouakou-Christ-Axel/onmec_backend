#!/bin/bash
set -e

# ============================================================
# Setup one-time VPS pour onmec_backend
# À exécuter une seule fois en tant que root ou avec sudo
# Ubuntu 22.04 / 24.04
# ============================================================

APP_USER="onmec"
APP_DIR="/home/$APP_USER/onmec_backend"
DB_NAME="onmec"
DB_USER="onmec_user"
NODE_VERSION="22"

echo "=== [1/7] Création de l'utilisateur applicatif ==="
id -u "$APP_USER" &>/dev/null || useradd -m -s /bin/bash "$APP_USER"

echo "=== [2/7] Installation de Node.js $NODE_VERSION via nvm ==="
su - "$APP_USER" -c "
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR=\"\$HOME/.nvm\"
  source \"\$NVM_DIR/nvm.sh\"
  nvm install $NODE_VERSION
  nvm alias default $NODE_VERSION
  corepack enable
  corepack prepare pnpm@latest --activate
"

echo "=== [3/7] Installation de PM2 ==="
su - "$APP_USER" -c "
  export NVM_DIR=\"\$HOME/.nvm\"
  source \"\$NVM_DIR/nvm.sh\"
  pnpm add -g pm2
  pm2 startup systemd -u $APP_USER --hp /home/$APP_USER | tail -1 | bash || true
"

echo "=== [4/7] Installation de PostgreSQL 15 ==="
apt-get update -q
apt-get install -y postgresql-15 postgresql-client-15

echo "=== [5/7] Création de la base de données et de l'utilisateur ==="
if [ -z "${DB_PASSWORD:-}" ]; then
  read -rsp "Mot de passe PostgreSQL pour $DB_USER: " DB_PASSWORD
  echo
fi
su - postgres -c "
  psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'\" | grep -q 1 || \
    psql -c \"CREATE USER $DB_USER WITH PASSWORD \\\$\\\$$DB_PASSWORD\\\$\\\$;\"
  psql -tc \"SELECT 1 FROM pg_database WHERE datname='$DB_NAME'\" | grep -q 1 || \
    psql -c \"CREATE DATABASE $DB_NAME OWNER $DB_USER;\"
"

echo "=== [6/7] Clone du repository ==="
su - "$APP_USER" -c "
  mkdir -p $APP_DIR
  git clone https://github.com/TON_ORG/onmec_backend.git $APP_DIR || \
    (cd $APP_DIR && git pull origin master)
"

echo "=== [7/7] Instructions manuelles restantes ==="
echo ""
echo "  1. Copier le fichier .env.production sur le VPS :"
echo "     scp .env.production $APP_USER@VPS_IP:$APP_DIR/.env.production"
echo ""
echo "  2. Premier déploiement manuel :"
echo "     su - $APP_USER"
echo "     cd $APP_DIR"
echo "     source ~/.nvm/nvm.sh"
echo "     pnpm install --frozen-lockfile"
echo "     npx prisma generate"
echo "     npx prisma migrate deploy"
echo "     pnpm build"
echo "     pm2 start ecosystem.config.js --env production"
echo "     pm2 save"
echo ""
echo "  3. Ajouter les secrets GitHub (Settings > Secrets > Actions) :"
echo "     SSH_KEY  = clé privée SSH de l'utilisateur $APP_USER"
echo "     SSH_USER = $APP_USER"
echo "     SSH_HOST = IP ou hostname du VPS"
echo ""
echo "=== Setup terminé ==="
