# 🚀 Guide de Déploiement - Outil SOS-Expat

## Prérequis

- Node.js 18+ installé
- Firebase CLI installé (`npm install -g firebase-tools`)
- Compte Firebase avec projet "outils-sos-expat"
- Clé API OpenAI (déjà incluse dans ce package)

---

## 📁 Structure du projet

```
Outil-sos-expat-main/
├── .env.local              # Clés Firebase + OpenAI (NE PAS PARTAGER)
├── functions/
│   ├── .env                # Clé OpenAI pour Cloud Functions
│   └── src/
│       ├── ai.ts           # IA avec prompts avocat/expert
│       ├── auth.ts         # Auto-admin
│       └── index.ts        # Webhook ingestBooking
├── src/                    # Code frontend React
├── firestore.rules         # Règles Firestore (permissives)
└── storage.rules           # Règles Storage (permissives)
```

---

## 🔧 Installation

### 1. Installer les dépendances

```bash
# À la racine du projet
npm install

# Dans le dossier functions
cd functions
npm install
cd ..
```

### 2. Se connecter à Firebase

```bash
firebase login
firebase use outils-sos-expat
```

### 3. Configurer les secrets Firebase (IMPORTANT !)

```bash
# Clé OpenAI (obligatoire pour l'IA)
firebase functions:secrets:set OPENAI_API_KEY
# Colle ta clé OpenAI quand demandé (commence par sk-...)

# Clé API pour le webhook (crée ta propre clé secrète)
firebase functions:secrets:set SOS_PLATFORM_API_KEY
# Exemple : sos-expat-webhook-secret-2024
```

---

## 🚀 Déploiement

### Déployer TOUT en une commande

```bash
npm run build
firebase deploy
```

### Ou déployer par partie

```bash
# Frontend uniquement
firebase deploy --only hosting

# Cloud Functions uniquement
firebase deploy --only functions

# Règles Firestore uniquement
firebase deploy --only firestore:rules

# Règles Storage uniquement
firebase deploy --only storage
```

---

## ✅ Vérifications post-déploiement

### 1. Tester l'accès admin

1. Va sur https://outils-sos-expat.web.app
2. Connecte-toi avec **williamsjullin@gmail.com**
3. Tu dois avoir accès à l'interface admin

### 2. Vérifier les Cloud Functions

```bash
firebase functions:list
```

Tu dois voir :
- `aiOnBookingCreated` - Analyse IA automatique
- `aiOnProviderMessage` - Réponse IA aux messages
- `aiChat` - Chat IA en direct
- `ingestBooking` - Webhook SOS-Expat
- `onUserCreate` - Auto-admin
- `initAdmin` - Initialisation admin manuelle

### 3. Tester l'IA

1. Crée un booking test dans Firestore
2. Vérifie que l'IA génère une réponse automatiquement

---

## 🔑 Clés configurées

| Clé | Valeur | Usage |
|-----|--------|-------|
| Firebase | Incluse dans .env.local | Frontend |
| OpenAI | Incluse dans .env.local et functions/.env | IA |
| SOS_PLATFORM_API_KEY | À définir | Webhook Laravel |

---

## 🌐 URLs

| Service | URL |
|---------|-----|
| **Frontend** | https://outils-sos-expat.web.app |
| **Webhook** | https://europe-west1-outils-sos-expat.cloudfunctions.net/ingestBooking |
| **Firebase Console** | https://console.firebase.google.com/project/outils-sos-expat |

---

## 📞 Configuration du Webhook (côté Laravel)

Depuis SOS-Expat.com (Laravel), envoie les demandes vers :

```
POST https://europe-west1-outils-sos-expat.cloudfunctions.net/ingestBooking
Headers:
  Content-Type: application/json
  x-api-key: [ta-clé-SOS_PLATFORM_API_KEY]

Body:
{
  "clientFirstName": "Jean",
  "clientLastName": "Dupont",
  "clientEmail": "jean@example.com",
  "clientPhone": "+33612345678",
  "clientCurrentCountry": "Thailand",
  "title": "Visa expiré - que faire ?",
  "description": "Mon visa expire dans 3 jours...",
  "providerType": "lawyer",  // ou "expat"
  "providerId": "xxx"
}
```

---

## 🆘 Dépannage

### L'IA ne répond pas ?

1. Vérifie que OPENAI_API_KEY est configuré :
   ```bash
   firebase functions:secrets:access OPENAI_API_KEY
   ```

2. Vérifie les logs :
   ```bash
   firebase functions:log --only aiOnBookingCreated
   ```

### Erreur 401 sur le webhook ?

Vérifie que SOS_PLATFORM_API_KEY est configuré et que Laravel envoie le bon header `x-api-key`.

### L'admin ne s'affiche pas ?

1. Vérifie que tu es connecté avec williamsjullin@gmail.com
2. Vérifie le document `users/{uid}` dans Firestore (role: "admin")

---

## 📧 Support

Williams - williamsjullin@gmail.com
