# Module Signalement Citoyen

Ce module permet aux citoyens de signaler des problèmes dans leur ville (nids de poule, éclairage public défectueux, déchets, etc.).

## 📋 Table des matières

- [Endpoints](#endpoints)
- [DTOs](#dtos)
- [Modèles](#modèles)
- [Authentification](#authentification)
- [Exemples](#exemples)

## 🚀 Endpoints

### 1. Demander une URL présignée pour la photo

**POST** `/api/v1/signalement-citoyen/upload-url`

Génère une clé objet R2 sous `signalements/` et une URL PUT présignée. Le
client envoie ensuite le fichier directement à R2 (aucun octet ne transite
par le backend), puis fournit la clé retournée en `photoKey` à la création ou
à la mise à jour du signalement.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "filename": "photo.jpg",
  "contentType": "image/jpeg"
}
```

**Réponse (201):**
```json
{
  "key": "signalements/1732000000000.jpg",
  "uploadUrl": "https://<bucket>.r2.cloudflarestorage.com/signalements/1732000000000.jpg?X-Amz-...",
  "expiresIn": 300
}
```

Le client fait ensuite un `PUT` direct vers `uploadUrl` avec le fichier
(`Content-Type` identique à celui déclaré ci-dessus).

### 2. Créer un signalement

**POST** `/api/v1/signalement-citoyen`

Crée un nouveau signalement citoyen, à partir d'une `photoKey` déjà uploadée
sur R2 (optionnelle — un signalement peut être créé sans photo).

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "titre": "Nid de poule sur la route principale",
  "description": "Un grand nid de poule situé au milieu de la chaussée, dangereux pour les véhicules",
  "categorieId": "c1a2t3e4g5o6r7i8e9-0a1b-2c3d-4e5f-6g7h8i9j0k1l",
  "adresse": "Avenue 12, Abidjan, Côte d'Ivoire",
  "latitude": 5.3600,
  "longitude": -4.0083,
  "photoKey": "signalements/1732000000000.jpg"
}
```

**Réponse (201):**
```json
{
  "id": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
  "titre": "Nid de poule sur la route principale",
  "description": "Un grand nid de poule situé au milieu de la chaussée, dangereux pour les véhicules",
  "categorieId": "c1a2t3e4g5o6r7i8e9-0a1b-2c3d-4e5f-6g7h8i9j0k1l",
  "validation": false,
  "adresse": "Avenue 12, Abidjan, Côte d'Ivoire",
  "latitude": 5.3600,
  "longitude": -4.0083,
  "photo": "https://cdn.mec-ci.org/signalements/1732000000000.jpg",
  "statut": "NOUVEAU",
  "citoyenId": "u1s2e3r4-5i6d-7h8e-9r0e-1a2b3c4d5e6f",
  "createdAt": "2026-01-29T10:00:00.000Z",
  "updatedAt": "2026-01-29T10:00:00.000Z"
}
```

### 3. Lister tous les signalements

**GET** `/api/v1/signalement-citoyen`

Récupère une liste paginée de signalements avec filtres optionnels.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `titre` (optionnel): Rechercher par titre
- `categorieId` (optionnel): Filtrer par catégorie
- `statut` (optionnel): Filtrer par statut (NOUVEAU, EN_COURS, RESOLU, REJETE)
- `latitude` (optionnel): Filtrer par latitude
- `longitude` (optionnel): Filtrer par longitude
- `citoyenId` (optionnel): Filtrer par citoyen
- `page` (optionnel, défaut: 1): Numéro de page
- `limit` (optionnel, défaut: 10): Nombre d'éléments par page

**Exemple:**
```
GET /api/v1/signalement-citoyen?statut=NOUVEAU&page=1&limit=10
```

**Réponse (200):**
```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
      "titre": "Nid de poule sur la route principale",
      "description": "Un grand nid de poule situé au milieu de la chaussée",
      "categorieId": "c1a2t3e4g5o6r7i8e9-0a1b-2c3d-4e5f-6g7h8i9j0k1l",
      "statut": "NOUVEAU",
      "validation": false,
      "adresse": "Avenue 12, Abidjan",
      "latitude": 5.3600,
      "longitude": -4.0083,
      "createdAt": "2026-01-29T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

### 4. Récupérer un signalement

**GET** `/api/v1/signalement-citoyen/:id`

Récupère les détails d'un signalement spécifique.

**Headers:**
```
Authorization: Bearer {token}
```

**Réponse (200):**
```json
{
  "id": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
  "titre": "Nid de poule sur la route principale",
  "description": "Un grand nid de poule situé au milieu de la chaussée, dangereux pour les véhicules",
  "categorieId": "c1a2t3e4g5o6r7i8e9-0a1b-2c3d-4e5f-6g7h8i9j0k1l",
  "categorie": {
    "id": "c1a2t3e4g5o6r7i8e9-0a1b-2c3d-4e5f-6g7h8i9j0k1l",
    "nom": "Voirie",
    "description": "Problèmes liés à la voirie"
  },
  "validation": false,
  "adresse": "Avenue 12, Abidjan, Côte d'Ivoire",
  "latitude": 5.3600,
  "longitude": -4.0083,
  "photo": "https://cdn.mec-ci.org/signalements/1732000000000.jpg",
  "statut": "NOUVEAU",
  "citoyenId": "u1s2e3r4-5i6d-7h8e-9r0e-1a2b3c4d5e6f",
  "citoyen": {
    "id": "u1s2e3r4-5i6d-7h8e-9r0e-1a2b3c4d5e6f",
    "nom": "Kouassi",
    "prenom": "Jean"
  },
  "createdAt": "2026-01-29T10:00:00.000Z",
  "updatedAt": "2026-01-29T10:00:00.000Z"
}
```

### 5. Mettre à jour un signalement

**PATCH** `/api/v1/signalement-citoyen/:id`

Met à jour les informations d'un signalement, y compris sa photo via une
nouvelle `photoKey` déjà uploadée sur R2. **⚠️ Nécessite les droits administrateur.**

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "statut": "EN_COURS",
  "validation": true,
  "photoKey": "signalements/1732000005000.jpg"
}
```

**Réponse (200):**
```json
{
  "id": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
  "titre": "Nid de poule sur la route principale",
  "statut": "EN_COURS",
  "validation": true,
  "updatedAt": "2026-01-29T11:00:00.000Z"
}
```

### 6. Supprimer un signalement

**DELETE** `/api/v1/signalement-citoyen/:id`

Supprime un signalement (soft delete). **⚠️ Nécessite les droits administrateur.**

**Headers:**
```
Authorization: Bearer {token}
```

**Réponse (200):**
```json
{
  "message": "Signalement supprimé avec succès"
}
```

## 📝 DTOs

### SignalementCitoyenDto

Représente un signalement complet.

**Propriétés:**
- `id` (string): Identifiant unique
- `titre` (string): Titre du signalement
- `description` (string): Description détaillée
- `categorieId` (string): ID de la catégorie
- `categorie` (CategorieSignalementDto, optionnel): Objet catégorie
- `validation` (boolean): Indique si validé
- `adresse` (string): Adresse du lieu
- `latitude` (number): Coordonnée GPS
- `longitude` (number): Coordonnée GPS
- `photo` (string, optionnel): URL publique R2 de la photo (construite côté serveur à partir de la clé stockée)
- `statut` (StatutSignalement): NOUVEAU, EN_COURS, RESOLU, REJETE
- `citoyenId` (string, optionnel): ID du citoyen
- `citoyen` (User, optionnel): Objet utilisateur
- `createdAt` (Date): Date de création
- `updatedAt` (Date): Date de mise à jour
- `deletedAt` (Date, optionnel): Date de suppression

### CreateSignalementCitoyenDto

DTO pour créer un signalement.

**Propriétés requises:**
- `titre` (string)
- `description` (string)
- `categorieId` (string)
- `adresse` (string)
- `latitude` (number)
- `longitude` (number)

**Propriétés optionnelles:**
- `photoKey` (string) - Clé R2 obtenue via POST /signalement-citoyen/upload-url
- `citoyenId` (string) - Automatiquement rempli par le backend

### UpdateSignalementCitoyenDto

DTO pour mettre à jour un signalement. Tous les champs sont optionnels.

**Propriétés:**
- Tous les champs de CreateSignalementCitoyenDto (optionnels)
- `validation` (boolean, optionnel)

### SearchSignalementCitoyenDto

DTO pour la recherche et le filtrage.

**Propriétés (toutes optionnelles):**
- `titre` (string)
- `categorieId` (string)
- `statut` (StatutSignalement)
- `latitude` (number)
- `longitude` (number)
- `citoyenId` (string)
- `page` (number, défaut: 1)
- `limit` (number, défaut: 10)

## 🔐 Authentification

Tous les endpoints nécessitent une authentification via JWT Bearer Token.

**Header requis:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🛡️ Permissions

### Utilisateurs authentifiés (MEMBER)
- ✅ Créer un signalement (POST)
- ✅ Consulter les signalements (GET, GET/:id)
- ❌ Mettre à jour un signalement
- ❌ Supprimer un signalement

### Administrateurs (ADMIN)
- ✅ Toutes les actions ci-dessus
- ✅ Mettre à jour un signalement (PATCH)
- ✅ Valider un signalement
- ✅ Supprimer un signalement (DELETE)

## 📸 Upload de Photos

L'upload se fait en deux temps, en upload direct vers Cloudflare R2 (le
backend ne reçoit jamais les octets du fichier) :

1. `POST /signalement-citoyen/upload-url` avec `{ filename, contentType }`
   retourne une clé objet R2 (`key`) et une URL PUT présignée (`uploadUrl`,
   valable 5 minutes).
2. Le client envoie le fichier directement via `PUT uploadUrl`, avec le même
   `Content-Type` que celui déclaré à l'étape 1.
3. La clé (`key`) est ensuite fournie en `photoKey` à `POST
   /signalement-citoyen` (création) ou `PATCH /signalement-citoyen/:id`
   (remplacement).

### Format accepté
- Types de fichiers: jpg, jpeg, png, gif, webp, heic, heif
- Préfixe de clé: `signalements/` — toute clé fournie sous un autre préfixe
  (celle d'un autre module, par exemple) est rejetée.

### Remplacement
Lors d'une mise à jour avec une nouvelle `photoKey`, l'ancien objet R2 est
supprimé après la sauvegarde en base (best-effort — un signalement
pré-migration dont la valeur stockée n'a pas la forme d'une clé R2 n'est
simplement pas ciblé par la suppression).

### URL de la photo
Le champ `photo` exposé dans les réponses est l'URL publique complète du
bucket R2 (`R2_PUBLIC_URL/<clé>`), pas la clé brute stockée en base.

## 📊 Modèle de données

### Statuts disponibles

- `NOUVEAU`: Nouveau signalement non traité
- `EN_COURS`: Signalement en cours de traitement
- `RESOLU`: Problème résolu
- `REJETE`: Signalement rejeté

### Relations

- Un signalement appartient à une **catégorie**
- Un signalement appartient à un **citoyen** (utilisateur)

## 💡 Exemples d'utilisation

### Exemple avec cURL

```bash
# 1. Demander une URL présignée pour la photo
curl -X POST https://api.mec-ci.org/api/v1/signalement-citoyen/upload-url \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename":"photo.jpg","contentType":"image/jpeg"}'
# -> { "key": "signalements/....jpg", "uploadUrl": "https://...", "expiresIn": 300 }

# 2. Envoyer le fichier directement à R2
curl -X PUT "UPLOAD_URL_RETOURNEE" \
  -H "Content-Type: image/jpeg" \
  --data-binary @/chemin/vers/photo.jpg

# 3. Créer le signalement avec la clé obtenue
curl -X POST https://api.mec-ci.org/api/v1/signalement-citoyen \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "titre": "Éclairage public défectueux",
    "description": "Les lampadaires de l avenue ne fonctionnent plus",
    "categorieId": "cat-uuid",
    "adresse": "Avenue 7, Cocody",
    "latitude": 5.3600,
    "longitude": -4.0083,
    "photoKey": "signalements/....jpg"
  }'

# Récupérer tous les signalements nouveaux
curl -X GET "https://api.mec-ci.org/api/v1/signalement-citoyen?statut=NOUVEAU&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Mettre à jour un signalement (Admin uniquement)
curl -X PATCH https://api.mec-ci.org/api/v1/signalement-citoyen/SIGNALEMENT_ID \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"statut":"EN_COURS","validation":true}'
```

### Exemple avec Axios (JavaScript/TypeScript)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.mec-ci.org/api/v1',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

// 1. Demander une URL présignée, puis envoyer le fichier directement à R2
const photoInput = document.querySelector('input[type="file"]');
const file = photoInput.files[0];
let photoKey;

if (file) {
  const { data: upload } = await api.post('/signalement-citoyen/upload-url', {
    filename: file.name,
    contentType: file.type,
  });
  await fetch(upload.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  photoKey = upload.key;
}

// 2. Créer le signalement avec la clé obtenue
const signalement = await api.post('/signalement-citoyen', {
  titre: 'Déchets non ramassés',
  description: 'Les déchets s accumulent depuis une semaine',
  categorieId: 'cat-uuid',
  adresse: 'Rue 12, Marcory',
  latitude: 5.3200,
  longitude: -3.9800,
  photoKey,
});

// Récupérer avec filtres
const { data } = await api.get('/signalement-citoyen', {
  params: {
    statut: 'NOUVEAU',
    page: 1,
    limit: 10,
  },
});

console.log(data.data); // Liste des signalements
console.log(data.meta); // Informations de pagination

// Mettre à jour (Admin uniquement)
await api.patch(`/signalement-citoyen/${id}`, {
  statut: 'EN_COURS',
  validation: true,
});
```

## 📚 Documentation Swagger

La documentation interactive complète est disponible à :
- **Production**: https://api.mec-ci.org/api/docs
- **Local**: http://localhost:8081/api/docs

## ⚠️ Codes d'erreur

- `200`: Succès
- `201`: Créé avec succès
- `400`: Requête invalide
- `401`: Non authentifié
- `403`: Accès refusé (permissions insuffisantes)
- `404`: Ressource non trouvée
- `500`: Erreur serveur

## 🔧 Validation

Tous les DTOs sont validés automatiquement. Les erreurs de validation retournent un code 400 avec les détails des champs invalides.

**Exemple de réponse d'erreur:**
```json
{
  "statusCode": 400,
  "message": [
    "Le titre doit être une chaîne de caractères",
    "La latitude doit être un nombre"
  ],
  "error": "Bad Request"
}
```
