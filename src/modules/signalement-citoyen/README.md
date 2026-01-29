# Module Signalement Citoyen

Ce module permet aux citoyens de signaler des problèmes dans leur ville (nids de poule, éclairage public défectueux, déchets, etc.).

## 📋 Table des matières

- [Endpoints](#endpoints)
- [DTOs](#dtos)
- [Modèles](#modèles)
- [Authentification](#authentification)
- [Exemples](#exemples)

## 🚀 Endpoints

### 1. Créer un signalement

**POST** `/api/v1/signalement-citoyen`

Crée un nouveau signalement citoyen.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body (multipart/form-data):**
```
titre: Nid de poule sur la route principale
description: Un grand nid de poule situé au milieu de la chaussée, dangereux pour les véhicules
categorieId: c1a2t3e4g5o6r7i8e9-0a1b-2c3d-4e5f-6g7h8i9j0k1l
adresse: Avenue 12, Abidjan, Côte d'Ivoire
latitude: 5.3600
longitude: -4.0083
statut: NOUVEAU
photo: [fichier image]
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
  "photo": "https://example.com/photos/signalement.jpg",
  "statut": "NOUVEAU",
  "citoyenId": "u1s2e3r4-5i6d-7h8e-9r0e-1a2b3c4d5e6f",
  "createdAt": "2026-01-29T10:00:00.000Z",
  "updatedAt": "2026-01-29T10:00:00.000Z"
}
```

### 2. Lister tous les signalements

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

### 3. Récupérer un signalement

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
  "photo": "https://example.com/photos/signalement.jpg",
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

### 4. Mettre à jour un signalement

**PATCH** `/api/v1/signalement-citoyen/:id`

Met à jour les informations d'un signalement. **⚠️ Nécessite les droits administrateur.**

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Body (multipart/form-data):**
```
statut: EN_COURS
validation: true
photo: [nouveau fichier image (optionnel)]
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

### 5. Supprimer un signalement

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
- `photo` (string, optionnel): URL de la photo
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
- `statut` (StatutSignalement)

**Propriétés optionnelles:**
- `photo` (string)
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

### Format accepté
- Types de fichiers: JPEG, PNG, JPG
- Taille maximale: Définie dans la configuration (généralement 5MB)
- Champ: `photo` (multipart/form-data)

### Stockage
Les photos sont stockées dans le dossier `uploads/signalements/` avec un nom unique basé sur le timestamp.

### URL de la photo
La photo est accessible via une URL relative: `/uploads/signalements/{filename}`

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
# Créer un signalement avec photo
curl -X POST https://api.mec-ci.org/api/v1/signalement-citoyen \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "titre=Éclairage public défectueux" \
  -F "description=Les lampadaires de l avenue ne fonctionnent plus" \
  -F "categorieId=cat-uuid" \
  -F "adresse=Avenue 7, Cocody" \
  -F "latitude=5.3600" \
  -F "longitude=-4.0083" \
  -F "statut=NOUVEAU" \
  -F "photo=@/chemin/vers/photo.jpg"

# Récupérer tous les signalements nouveaux
curl -X GET "https://api.mec-ci.org/api/v1/signalement-citoyen?statut=NOUVEAU&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Mettre à jour un signalement (Admin uniquement)
curl -X PATCH https://api.mec-ci.org/api/v1/signalement-citoyen/SIGNALEMENT_ID \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -F "statut=EN_COURS" \
  -F "validation=true"
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

// Créer un signalement avec photo
const formData = new FormData();
formData.append('titre', 'Déchets non ramassés');
formData.append('description', 'Les déchets s accumulent depuis une semaine');
formData.append('categorieId', 'cat-uuid');
formData.append('adresse', 'Rue 12, Marcory');
formData.append('latitude', '5.3200');
formData.append('longitude', '-3.9800');
formData.append('statut', 'NOUVEAU');

// Ajouter la photo depuis un input file
const photoInput = document.querySelector('input[type="file"]');
if (photoInput.files[0]) {
  formData.append('photo', photoInput.files[0]);
}

const signalement = await api.post('/signalement-citoyen', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
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
const updateFormData = new FormData();
updateFormData.append('statut', 'EN_COURS');
updateFormData.append('validation', 'true');

await api.patch(`/signalement-citoyen/${id}`, updateFormData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
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
