# =============================================================================
# GUIDE D'INSTALLATION — Outil SOS Expat
# =============================================================================

## 1. PRÉREQUIS

Avant de commencer, assurez-vous d'avoir :
- Node.js 18+ installé
- Firebase CLI installé (`npm install -g firebase-tools`)
- Un projet Firebase créé ("Outils SOS Expat")
- Une clé API OpenAI

## 2. CONFIGURATION FIREBASE

### 2.1 Connexion Firebase

```bash
# Se connecter à Firebase
firebase login

# Sélectionner le projet
firebase use outils-sos-expat
```

### 2.2 Configurer les secrets

```bash
# Clé API OpenAI (OBLIGATOIRE pour l'IA)
firebase functions:secrets:set OPENAI_API_KEY
# Entrez votre clé OpenAI quand demandé

# Clé API pour la plateforme SOS-Expat (pour le webhook)
firebase functions:secrets:set SOS_PLATFORM_API_KEY
# Générez une clé sécurisée (ex: openssl rand -hex 32)

# Clé admin (pour les opérations d'administration)
firebase functions:secrets:set ADMIN_API_KEY
# Générez une autre clé sécurisée
```

### 2.3 Déployer les Cloud Functions

```bash
cd functions
npm install
npm run build
cd ..

# Déployer les fonctions
firebase deploy --only functions
```

### 2.4 Déployer les règles Firestore

```bash
firebase deploy --only firestore:rules
```

## 3. CRÉER LE PREMIER ADMINISTRATEUR

### Option A : Via la console Firebase

1. Allez sur https://console.firebase.google.com
2. Sélectionnez le projet "Outils SOS Expat"
3. Authentication > Users > Ajouter un utilisateur
4. Créez l'utilisateur avec l'email admin (williamsjullin@gmail.com)

### Option B : L'utilisateur existe déjà

Si l'utilisateur est déjà créé (comme sur vos screenshots), notez son UID :
- UID de williamsjullin@gmail.com : `5ITY3iPh16Z7gHlrzr7XzrY4pGE2`

### Attribuer le rôle admin

Utilisez la Cloud Function `setRole` :

```bash
# Remplacez <ADMIN_API_KEY> par la clé que vous avez configurée
# Remplacez <UID> par l'UID de l'utilisateur

curl -X POST \
  https://europe-west1-outils-sos-expat.cloudfunctions.net/setRole \
  -H "Content-Type: application/json" \
  -H "x-api-key: <ADMIN_API_KEY>" \
  -d '{"uid": "5ITY3iPh16Z7gHlrzr7XzrY4pGE2", "role": "admin"}'
```

## 4. INITIALISER FIRESTORE

Créez les collections de base dans la console Firebase (Firestore Database) :

### Collection : `config`
Document : `ai`
```json
{
  "enabled": true,
  "replyOnBookingCreated": true,
  "replyOnUserMessage": true,
  "model": "gpt-4o-mini",
  "temperature": 0.3,
  "maxOutputTokens": 1500,
  "systemPrompt": "Tu es un assistant juridique expert pour SOS Expat..."
}
```

### Collection : `countryConfigs`
Ajoutez les pays supportés (exemple) :
```json
// Document ID: FR
{
  "code": "FR",
  "name": "France",
  "active": true
}

// Document ID: TH
{
  "code": "TH",
  "name": "Thaïlande",
  "active": true
}
```

## 5. CONNEXION AVEC SOS-EXPAT.COM (Laravel)

### 5.1 Webhook pour recevoir les bookings

Quand un booking est créé sur SOS-Expat, envoyez-le vers l'outil :

**URL du webhook :**
```
POST https://europe-west1-outils-sos-expat.cloudfunctions.net/ingestBooking
```

**Headers :**
```
Content-Type: application/json
x-api-key: <SOS_PLATFORM_API_KEY>
```

**Body (JSON) :**
```json
{
  "title": "Titre de la demande",
  "description": "Description détaillée...",
  "status": "pending",
  "priority": "medium",
  
  "clientName": "Jean Dupont",
  "clientFirstName": "Jean",
  "clientLastName": "Dupont",
  "clientPhone": "+33612345678",
  "clientWhatsapp": "+33612345678",
  "clientCurrentCountry": "Thaïlande",
  "clientNationality": "Française",
  "clientLanguages": ["fr", "en"],
  
  "providerId": "abc123",
  "providerName": "Maître Martin",
  "providerType": "lawyer",
  "providerCountry": "Thaïlande",
  "providerEmail": "avocat@example.com",
  "providerPhone": "+66812345678",
  
  "serviceType": "lawyer_call",
  "price": 49,
  "duration": 20
}
```

### 5.2 Code Laravel exemple

```php
// Dans votre controller Laravel après création d'un booking

use Illuminate\Support\Facades\Http;

$response = Http::withHeaders([
    'x-api-key' => config('services.sos_tool.api_key'),
])->post('https://europe-west1-outils-sos-expat.cloudfunctions.net/ingestBooking', [
    'title' => $booking->title,
    'description' => $booking->description,
    'status' => 'pending',
    // ... autres champs
]);

if ($response->successful()) {
    $toolBookingId = $response->json('id');
    // Sauvegarder l'ID pour référence
}
```

## 6. DÉPLOYER L'APPLICATION WEB

```bash
# Installer les dépendances
npm install

# Build de production
npm run build

# Déployer sur Firebase Hosting
firebase deploy --only hosting
```

## 7. TESTER

1. Connectez-vous à l'outil avec le compte admin
2. Allez dans Paramètres > IA pour vérifier la configuration
3. Créez un booking de test
4. Vérifiez que l'IA génère une réponse automatique

## 8. URLS IMPORTANTES

- **Application** : https://outils-sos-expat.web.app (après déploiement)
- **Console Firebase** : https://console.firebase.google.com/project/outils-sos-expat
- **Cloud Functions** : https://console.cloud.google.com/functions?project=outils-sos-expat

## 9. DÉPANNAGE

### L'IA ne répond pas
- Vérifiez que OPENAI_API_KEY est bien configurée
- Vérifiez les logs des fonctions dans la console GCP
- Vérifiez que `config/ai.enabled` est `true`

### Erreur d'authentification
- Vérifiez que l'utilisateur a le rôle `admin` dans ses custom claims
- Utilisez la fonction `setRole` pour réattribuer le rôle

### Les bookings n'arrivent pas
- Vérifiez que SOS_PLATFORM_API_KEY est correcte
- Vérifiez les logs de la fonction `ingestBooking`

---

Pour toute question, contactez l'équipe technique.
