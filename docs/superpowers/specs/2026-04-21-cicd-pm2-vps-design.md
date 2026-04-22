# CI/CD PM2 VPS Implementation Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remplacer le déploiement Docker par un pipeline CI/CD GitHub Actions qui déploie directement sur un VPS avec PM2 et PostgreSQL installé localement.

**Architecture:**
```
GitHub (master) → GitHub Actions CI → SSH Deploy → VPS
                                                     ├── NestJS (PM2 cluster)
                                                     └── PostgreSQL 15 (local)
```

**Tech Stack:** GitHub Actions, PM2, Node.js 22 (nvm), pnpm, PostgreSQL 15, NestJS, Prisma 7

---

## Section 1 — Base de données

PostgreSQL est installé directement sur le VPS (pas de pooler externe). Puisque la connexion est locale (`localhost:5432`), `DATABASE_URL` et `DIRECT_URL` pointent sur la même connexion directe. Prisma peut faire les migrations et le runtime sans distinction.

```
DATABASE_URL=postgresql://onmec_user:PASSWORD@localhost:5432/onmec
DIRECT_URL=postgresql://onmec_user:PASSWORD@localhost:5432/onmec
```

## Section 2 — Pipeline GitHub Actions

### Job `ci` — sur toutes les branches et PRs

1. Checkout code (`actions/checkout@v4`)
2. Setup pnpm (`pnpm/action-setup@v4`)
3. Setup Node.js 22 avec cache pnpm (`actions/setup-node@v4`)
4. `pnpm install --frozen-lockfile`
5. `npx prisma generate`
6. `npx tsc --noEmit`
7. `pnpm test`

### Job `deploy` — uniquement sur push `master`, après `ci` vert

Via SSH sur le VPS :
1. `git pull origin master`
2. `pnpm install --frozen-lockfile`
3. `npx prisma generate`
4. `npx prisma migrate deploy` ← commande production (pas `migrate dev`)
5. `pnpm build`
6. `pm2 reload ecosystem.config.js --env production`

**Secrets GitHub requis :**
- `SSH_KEY` — clé privée SSH
- `SSH_USER` — utilisateur VPS
- `SSH_HOST` — IP ou hostname du VPS

## Section 3 — PM2 (`ecosystem.config.js`)

Fichier à la racine du projet :
- **name** : `onmec-api`
- **script** : `dist/main.js`
- **exec_mode** : `cluster`
- **instances** : `max` (utilise tous les cores CPU)
- **env_production** : `NODE_ENV=production`, `PORT=8081`
- **error_file** : `./logs/error.log`
- **out_file** : `./logs/out.log`
- **max_memory_restart** : `500M`

## Section 4 — Script setup VPS (`scripts/setup-vps.sh`)

Script documentant l'installation initiale one-time sur le VPS :
1. Installer Node.js 22 via nvm
2. Activer pnpm via corepack
3. Installer PM2 globalement et configurer le démarrage automatique (`pm2 startup`)
4. Installer PostgreSQL 15 via apt
5. Créer la base de données et l'utilisateur dédié
6. Créer le répertoire de l'app, cloner le repo
7. Copier le `.env.production` manuellement
8. Premier déploiement manuel : `pnpm install`, `prisma migrate deploy`, `pnpm build`, `pm2 start`

## Section 5 — Fichiers modifiés / créés

| Fichier | Action |
|---|---|
| `.github/workflows/deploy.yml` | Réécriture complète |
| `ecosystem.config.js` | Nouveau |
| `scripts/setup-vps.sh` | Nouveau (documentation setup one-time) |
| `Dockerfile` + `docker-compose.yml` | Conservés pour dev local uniquement |
| `init.sh` | Inchangé (utilisé uniquement en Docker local) |

## Notes Prisma

- `prisma migrate deploy` compare les migrations appliquées à l'historique sans modifier le schéma — c'est la commande pour la production.
- `prisma migrate dev` est réservé au développement local (détecte les drifts, peut reset).
- Le advisory locking de Prisma (timeout 10s) protège contre les migrations concurrentes en cas de déploiements simultanés.
- `DIRECT_URL` est requis pour les migrations car le Schema Engine ne supporte pas le connection pooling — ici c'est la même URL car pas de pooler.
