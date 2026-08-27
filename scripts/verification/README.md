# Vérifications fonctionnelles

Deux scripts qui interrogent l'API démarrée et vérifient les garanties de
sécurité et de contrôle d'accès des modules **authentification** et
**actualités**. Ils ne remplacent pas les tests unitaires : ils vérifient le
comportement de bout en bout, guards et base de données compris — ce que les
specs, dont les dépendances Prisma sont mockées, ne peuvent pas couvrir.

## Prérequis

- L'API démarrée sur `http://localhost:8081`
- La base amorcée en développement : `pnpm db:seed`
- Python 3 (bibliothèque standard uniquement)

Les identifiants attendus sont ceux du seed. Le mot de passe back-office est
celui de `SEED_ADMIN_PASSWORD` : ajuster la constante en tête de script s'il
diffère.

## Exécution

```bash
python scripts/verification/verify-auth.py
python scripts/verification/verify-actualites.py
python scripts/verification/verify-engagement.py
python scripts/verification/verify-notifications.py
```

Code de sortie 0 si toutes les vérifications passent.

## Ce qui est vérifié

**`verify-auth.py`** — 39 vérifications : forme du JWT (type, rôle,
expiration), cloisonnement entre les trois rôles back-office et les membres,
refus d'auto-promotion, absence de `password` et `otpSecret` dans les réponses,
suspension effective sur un token déjà émis, cloisonnement des OTP entre
vérification d'email et réinitialisation, rate limiting, politique de mot de
passe, et uniformité des réponses d'échec de connexion (anti-énumération).

**`verify-engagement.py`** — 15 vérifications : idempotence du toggle de
like (aucune erreur serveur sur une rafale), attribution de points dérivée des
actions réelles, non-refarmabilité (unliker puis reliker ne recrédite pas),
plafond quotidien des commentaires, obligation du `userId` sur l'ajustement
back-office, et refus de l'auto-attribution par un membre.

**`verify-notifications.py`** — 34 vérifications : fermeture des trois
endpoints d'envoi de push (ouverts à Internet auparavant), rattachement des
appareils au compte déduit du jeton, fil in-app (pagination, compteur de non
lues, marquage, cloisonnement entre membres) et les quatre déclencheurs —
publication d'actualité *diffusée une seule fois* malgré un `publier`
idempotent et un cycle dépublier/republier, changement de statut d'un
signalement, commentaire d'un tiers sur son signalement, masquage d'un
commentaire. Firebase n'étant pas joignable en développement, ce script vérifie
aussi implicitement que le fil est écrit même quand la push échoue.

**`verify-actualites.py`** — 58 vérifications : restriction de la rédaction aux
rôles éditoriaux, invisibilité des brouillons pour le public *et* pour le
module engagement, prévisualisation back-office, publication et dépublication,
recherche plein texte multi-mots, bornes de pagination, filtre `hasImage`,
survie des likes à une suppression, rejet des uploads non conformes,
classement éditorial (catégorie obligatoire à la rédaction, déduplication des
tags par slug, filtres `?categorie=` et `?tags=`, remplacement et non cumul des
tags au PATCH) et cloisonnement de la gestion des catégories.

## Limite connue

Le rate limiting s'applique aussi à ces scripts. Deux exécutions rapprochées de
`verify-auth.py` font échouer les vérifications qui consomment
`/auth/forgot-password` (3 par quart d'heure) et `/auth/register` (3 par heure).
Attendre la fenêtre entre deux exécutions complètes.

`verify-engagement.py` est en revanche rejouable : le plafond quotidien étant
justement ce qu'il vérifie, ses assertions portent sur le gain d'une rafale et
non sur un total absolu, et restent donc valides sur un membre déjà crédité
dans la journée.
