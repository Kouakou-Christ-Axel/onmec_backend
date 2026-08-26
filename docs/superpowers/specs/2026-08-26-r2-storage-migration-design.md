# Migration du stockage de fichiers vers Cloudflare R2

Date : 2026-08-26
Branche : `feat/r2-storage-migration`

## Contexte

Tous les uploads (actualités, avatars, librairie, signalements citoyens) sont
aujourd'hui écrits sur le disque local du serveur (`multer diskStorage`) et
servis en statique depuis `/uploads` (`main.ts`). Les variables `AWS_S3_*`
présentes dans `.env.example` ne sont référencées nulle part dans `src/` —
config morte à retirer.

Objectif : migrer le stockage vers un bucket Cloudflare R2 déjà créé, exposé
via un domaine personnalisé (ex: `cdn.mec-ci.org`), avec upload **direct
client → R2** par URL présignée (le backend ne reçoit plus les octets des
fichiers).

## Périmètre

Les 4 flux d'upload existants :
- Actualités (image de couverture + images du contenu éditeur)
- Avatars utilisateurs
- Librairie (document PDF + couverture optionnelle)
- Signalements citoyens (photo)

Fichiers déjà présents dans `./uploads` : migrés vers R2 par un script
one-off (pas au démarrage de l'app).

## Décisions actées en discussion

- **Upload direct par URL présignée**, partout, y compris pour les images.
- **Compression sharp abandonnée** pour ces 4 flux (le backend ne voit plus
  les octets) : les images sont stockées à leur poids d'origine. Compromis
  accepté sciemment (vs. un aller-retour de recompression qui annulerait le
  gain de bande passante recherché).
- **Domaine personnalisé** sur le bucket R2 pour l'accès public (pas de
  `pub-xxxx.r2.dev`, pas d'URL signées de lecture).
- **Pas de vérification `HeadObject`** avant sauvegarde en base : une clé
  jamais uploadée casserait l'affichage (404 sur l'image), pas la création de
  la ressource. Choix par défaut pour rester simple ; à durcir plus tard si
  besoin (cf. Suivi).
- **`/uploads` statique reste servi par `main.ts`** après cette migration —
  il ne doit être retiré qu'une fois le script de migration exécuté avec de
  vraies credentials R2 et vérifié en production. Cette révision ne le
  supprime pas.
- Credentials R2 pas encore disponibles : les variables d'env sont ajoutées
  vides, comme Firebase/Twilio/Resend. L'app démarre sans elles ; seuls les
  nouveaux endpoints d'upload échouent tant qu'elles sont absentes.

## Nouveau contrat API

Chaque ressource expose un endpoint de demande d'URL présignée, puis
référence la **clé objet R2** (pas un fichier) dans son `create`/`update`.

### 1. Demande d'URL présignée

```
POST /actualites/upload-image        (endpoint existant, change de comportement)
POST /librairie/upload-url           (nouveau)
POST /users/avatar/upload-url        (nouveau)
POST /signalement-citoyen/upload-url (nouveau)
```

Body : `{ filename: string, contentType: string }`.

Le backend :
1. Valide `contentType`/l'extension contre la liste autorisée du flux
   concerné (images : jpg/jpeg/png/gif/webp/heic/heif, cf.
   `GenerateConfigService.ALLOWED_IMAGE_EXT` ; librairie `fichiers` : PDF
   uniquement, `application/pdf`, comme validé aujourd'hui par
   `UploadValidationPipe` ; librairie `covers` : jpg/jpeg/png/webp).
2. Génère une clé objet côté serveur (jamais fournie par le client), sous le
   même préfixe de dossier que l'organisation actuelle de `/uploads` :
   `actualites/`, `actualites/contenu/`, `users-avatar/`, `librairie/<id ou
   uuid>/`, `signalements/`. Réutilise `GenerateDataService.generateSecureImageName`
   pour le nom de fichier, comme aujourd'hui.
3. Retourne `{ key, uploadUrl, expiresIn }` — `uploadUrl` est une URL PUT
   présignée (`@aws-sdk/s3-request-presigner`, `PutObjectCommand`, expiration
   courte, ex. 5 min), avec le `ContentType` figé dans la signature (le PUT
   échoue si le client envoie un `Content-Type` différent).

Le client fait ensuite un `PUT` direct vers `uploadUrl` avec le fichier —
aucun appel au backend pour ce transfert.

### 2. Finalisation

- **Éditeur de contenu actualités** (`upload-image`) : pas de finalisation
  séparée. Une fois le `PUT` réussi, le client construit l'URL publique
  lui-même (`R2_PUBLIC_URL/key`) pour l'insérer dans le contenu riche —
  identique au comportement actuel qui retournait déjà `{ url }`
  immédiatement après upload.
- **`create`/`update`** des 4 ressources : le body passe de
  `multipart/form-data` à `application/json`. Le champ fichier est remplacé
  par un champ clé :
  - Actualités : `imageKey?: string` (au lieu du champ fichier `image`)
  - Users : `avatarKey?: string`
  - Librairie : `fichierKey: string` (requis à la création, comme
    aujourd'hui), `coverKey?: string`
  - Signalement citoyen : `photoKey?: string`

  `FileInterceptor`/`FileFieldsInterceptor`/`FilesInterceptor` sont retirés
  de ces routes ; `@ApiConsumes('multipart/form-data')` et `@ApiBody` avec
  `format: binary` sont mis à jour en conséquence dans Swagger.

### 3. Remplacement / suppression

Quand un `update` fournit une nouvelle clé pour un champ qui en avait déjà
une, l'ancien objet R2 est supprimé (`R2StorageService.delete(oldKey)`) après
la sauvegarde réussie en base — même logique que les `fs.unlink`/écritures en
place actuelles, transposée à R2.

## `R2StorageService`

Nouveau service dans `src/common/services/r2-storage.service.ts`, exporté
par `CommonModule` (comme `GenerateDataService`/`HashService`).

```ts
class R2StorageService {
  isConfigured(): boolean; // R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME tous présents
  getUploadUrl(key: string, contentType: string, expiresIn?: number): Promise<string>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string; // `${R2_PUBLIC_URL}/${key}`, sans double slash
}
```

- Client `S3Client` de `@aws-sdk/client-s3`, endpoint
  `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, `region: 'auto'`.
- Si non configuré : `getUploadUrl`/`delete` lèvent une
  `ServiceUnavailableException` ("Stockage R2 non configuré") — le module
  démarre quand même, seuls les endpoints d'upload échouent (même pattern
  que `NotificationModule` pour Firebase).
- Dépendances à ajouter : `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`.

## Variables d'environnement

Dans `.env.example`, remplacer le bloc `# AWS S3` (mort, aucune référence
dans `src/`) par :

```
# CLOUDFLARE R2 (stockage fichiers)
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
R2_PUBLIC_URL=""   # domaine personnalise connecte au bucket, ex: https://cdn.mec-ci.org
```

Non ajoutées à `EnvironmentVariables`/`validateEnv` (pas de validation
bloquante au démarrage), suivant le même principe que Firebase/Twilio/Resend.

## Code supprimé

Une fois tous les modules migrés (dernière passe) :
- `GenerateConfigService` (`generate-config.service.ts`) — plus aucun
  appelant après migration des 4 modules (ni `generateConfigSingleImageUpload`,
  ni `compressImages`). Retiré de `common.module.ts`.
- `UploadValidationPipe` — plus utilisé une fois la librairie migrée (seul
  appelant).
- **Ne pas retirer** le `useStaticAssets(uploadsPath, { prefix: '/uploads' })`
  de `main.ts` dans cette révision (cf. Décisions actées).

## Script de migration des fichiers existants

`scripts/migrate-uploads-to-r2.ts`, exécuté manuellement via `ts-node` (pas
au démarrage, pas en CI) :
1. Parcourt `./uploads` récursivement (hors `./uploads/tmp`).
2. Pour chaque fichier, upload vers R2 sous la même clé relative (celle
   utilisée aujourd'hui après le préfixe `/uploads/`).
3. Met à jour en base les colonnes concernées (`imageUrl`/`coverImage` sur
   Actualite, avatar sur User, `fileUrl`/`coverImage` sur Document,
   `photo`/équivalent sur SignalementCitoyen) en retirant le préfixe
   `/uploads/` pour ne garder que la clé.
4. Log un rapport (fichiers migrés / échoués) en console. N'efface rien sur
   le disque local ni en base en cas d'échec partiel — reprise manuelle
   possible en relançant (idempotent : un upload vers une clé existante
   écrase silencieusement le même contenu, sans risque).

## Découpage de l'implémentation (passes séquentielles)

1. **Fondation** : dépendances, `R2StorageService`, variables d'env,
   nettoyage `.env.example`. Rien ne casse encore — les 4 modules
   continuent de fonctionner en local comme avant.
2. **Actualités** : nouveau contrat sur `upload-image`/`create`/`update`,
   `actualite.service.ts` (`mapImageUrl`, `buildContentImageUrl`),
   `actualites.service.spec.ts` mis à jour.
3. **Avatars utilisateurs** : même pattern.
4. **Librairie** : `fichiers` + `covers`, `GET /librairie/:id/file` redirige
   (302) vers `R2_PUBLIC_URL/key` au lieu de streamer depuis le disque local.
5. **Signalements citoyens** : même pattern, `README.md` du module mis à
   jour (il documente l'ancien schéma d'URL `/uploads/signalements/...`).
6. **Nettoyage + script de migration + vérification** : suppression du code
   mort (`GenerateConfigService`, `UploadValidationPipe`), écriture du script
   de migration, `npm run build` + suite de tests pour confirmer que tout
   compile et passe.

## Suivi (hors périmètre de cette révision)

- Vérification `HeadObject` avant sauvegarde en base, si des clés orphelines
  posent problème en pratique.
- Retrait du service statique `/uploads` dans `main.ts`, après exécution
  vérifiée du script de migration en production.
- Adaptation des clients (web admin, mobile) au nouveau contrat JSON en 2
  étapes — hors périmètre backend, à coordonner séparément.
