# 🚨 GUIDE DE RÉCUPÉRATION COMPLÈTE - SOS EXPAT

## Table des matières

1. [Vue d'ensemble du système](#1-vue-densemble-du-système)
2. [Inventaire des composants](#2-inventaire-des-composants)
3. [Procédure d'urgence (Quick Start)](#3-procédure-durgence-quick-start)
4. [Récupération du code source](#4-récupération-du-code-source)
5. [Récupération de la base de données Firestore](#5-récupération-de-la-base-de-données-firestore)
6. [Récupération des utilisateurs Firebase Auth](#6-récupération-des-utilisateurs-firebase-auth)
7. [Récupération des fichiers Storage](#7-récupération-des-fichiers-storage)
8. [Récupération des Cloud Functions](#8-récupération-des-cloud-functions)
9. [Récupération de la configuration](#9-récupération-de-la-configuration)
10. [Récupération des enregistrements Twilio](#10-récupération-des-enregistrements-twilio)
11. [Données Stripe (externes)](#11-données-stripe-externes)
12. [Vérification post-récupération](#12-vérification-post-récupération)
13. [Contacts et escalade](#13-contacts-et-escalade)
14. [Annexes](#annexes)

---

## 1. Vue d'ensemble du système

### Architecture globale

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SOS EXPAT PLATFORM                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Frontend   │  │  Firestore   │  │   Storage    │  │  Functions   │ │
│  │  (React/TS)  │  │  (Database)  │  │  (Files)     │  │  (Backend)   │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                 │                  │         │
│         └─────────────────┼─────────────────┼──────────────────┘         │
│                           │                 │                            │
│                    ┌──────┴─────────────────┴──────┐                    │
│                    │      Firebase Project          │                    │
│                    │   sos-urgently-ac307           │                    │
│                    └────────────────────────────────┘                    │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │    Stripe    │  │    Twilio    │  │   GitHub     │                   │
│  │  (Paiements) │  │   (Appels)   │  │ (Code source)│                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Objectifs de récupération

| Métrique | Objectif | Actuel |
|----------|----------|--------|
| **RPO** (Recovery Point Objective) | 8 heures max | 8h (backups 3x/jour) |
| **RTO** (Recovery Time Objective) | 4 heures max | ~2-4h |

### Fréquence des sauvegardes

| Composant | Fréquence | Rétention | Destination |
|-----------|-----------|-----------|-------------|
| **Firestore** | 3x/jour (3h, 11h, 19h) | 90 jours | GCS + DR bucket |
| **Firebase Auth** | Hebdomadaire | 90 jours | GCS |
| **Storage** | Continu (versioning) | 90 jours | GCS |
| **Twilio Recordings** | Quotidien | 30 jours | GCS |
| **Code source** | Continu (Git) | Illimité | GitHub |

---

## 2. Inventaire des composants

### Composants critiques (Priorité 1)

| Composant | Localisation | Sauvegarde | Temps restauration |
|-----------|--------------|------------|-------------------|
| Code source | GitHub | ✅ Automatique | 5 min |
| Firestore | Firebase | ✅ 3x/jour | 10-30 min |
| Firebase Auth | Firebase | ✅ Hebdo | 1-2h |
| Cloud Functions | GitHub + Firebase | ✅ Git | 10-15 min |

### Composants importants (Priorité 2)

| Composant | Localisation | Sauvegarde | Temps restauration |
|-----------|--------------|------------|-------------------|
| Firebase Storage | GCS | ✅ Versioning | Immédiat |
| Configuration Firebase | Git | ✅ Versionné | 5 min |
| Règles Firestore/Storage | Git | ✅ Versionné | 2 min |

### Services externes (Priorité 3)

| Service | Conservation données | Restauration |
|---------|---------------------|--------------|
| Stripe | Illimitée | Dashboard/API |
| Twilio | 30 jours (nous sauvegardons) | Depuis notre GCS |
| SendGrid | 7 jours logs | Non applicable |

---

## 3. Procédure d'urgence (Quick Start)

### ⚡ En cas d'incident majeur - Suivre ces étapes dans l'ordre :

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ÉTAPE 1: ÉVALUATION (5 min)                                            │
│  □ Identifier la nature de l'incident (hack, erreur, panne)            │
│  □ Déterminer les composants affectés                                   │
│  □ Notifier l'équipe technique                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  ÉTAPE 2: ISOLATION (10 min)                                            │
│  □ Si hack: Désactiver l'accès public (firebase hosting:disable)        │
│  □ Révoquer les tokens compromis si nécessaire                          │
│  □ Changer les secrets Firebase si compromis                            │
├─────────────────────────────────────────────────────────────────────────┤
│  ÉTAPE 3: RESTAURATION (1-4h selon gravité)                            │
│  □ Restaurer Firestore depuis le dernier backup                        │
│  □ Restaurer Auth si utilisateurs affectés                              │
│  □ Redéployer les Cloud Functions                                       │
│  □ Vérifier le Storage                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  ÉTAPE 4: VÉRIFICATION (30 min)                                         │
│  □ Tester les fonctionnalités critiques                                │
│  □ Vérifier les paiements Stripe                                        │
│  □ Tester les appels Twilio                                             │
│  □ Vérifier les logs d'erreur                                           │
├─────────────────────────────────────────────────────────────────────────┤
│  ÉTAPE 5: COMMUNICATION                                                 │
│  □ Informer les utilisateurs si nécessaire                             │
│  □ Documenter l'incident                                                │
│  □ Planifier le post-mortem                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Récupération du code source

### 4.1 Cloner le repository

```bash
# Cloner depuis GitHub
git clone https://github.com/will383842/sos-expat-project.git

# Ou si le remote est inaccessible, utiliser une copie locale
# Le code est aussi sur votre machine locale
```

### 4.2 Installer les dépendances

```bash
# Frontend (sos/)
cd sos-expat-project/sos
npm install

# Cloud Functions
cd firebase/functions
npm install
```

### 4.3 Vérifier le code

```bash
# Build du frontend
npm run build

# Build des functions
cd firebase/functions
npm run build
```

### 4.4 Fichiers critiques versionnés

```
sos-expat-project/
├── sos/
│   ├── src/                    # Code source React
│   ├── firebase.json           # Configuration Firebase
│   ├── firestore.rules         # Règles de sécurité Firestore
│   ├── storage.rules           # Règles de sécurité Storage
│   ├── firestore.indexes.json  # Index Firestore
│   └── firebase/functions/     # Cloud Functions
├── docs/
│   └── DISASTER_RECOVERY.md    # Documentation DR
└── scripts/
    └── enable-storage-versioning.sh  # Scripts utilitaires
```

---

## 5. Récupération de la base de données Firestore

### 5.1 Lister les backups disponibles

```bash
# Via Firebase Console
# https://console.firebase.google.com/project/sos-urgently-ac307/firestore/backups

# Ou via gcloud
gsutil ls gs://sos-urgently-ac307.firebasestorage.app/scheduled-backups/

# Ou via Cloud Functions (depuis l'admin)
firebase functions:call listAvailableBackups --region=europe-west1
```

### 5.2 Restauration complète

```bash
# 1. Identifier le backup à restaurer
BACKUP_PATH="gs://sos-urgently-ac307.firebasestorage.app/scheduled-backups/morning/backup-1735689600000"

# 2. Restaurer (ATTENTION: écrase les données actuelles)
gcloud firestore import $BACKUP_PATH \
  --project=sos-urgently-ac307 \
  --async

# 3. Suivre la progression
gcloud firestore operations list --project=sos-urgently-ac307
```

### 5.3 Restauration sélective d'une collection

```bash
# Via Cloud Function admin
firebase functions:call importCollectionFromBackup \
  --region=europe-west1 \
  --data '{
    "backupId": "BACKUP_ID",
    "collectionIds": ["users", "payments"],
    "dryRun": true
  }'

# Si le dry-run est OK, relancer avec dryRun: false
```

### 5.4 Vérification post-restauration

```bash
# Vérifier le nombre de documents
firebase functions:call verifyCollectionIntegrity \
  --region=europe-west1 \
  --data '{"collectionId": "users"}'

# Ou manuellement
gcloud firestore export gs://temp-verification-bucket \
  --collection-ids=users \
  --project=sos-urgently-ac307
```

### 5.5 Collections critiques à vérifier

| Collection | Description | Minimum attendu |
|------------|-------------|-----------------|
| `users` | Utilisateurs | 100+ |
| `sos_profiles` | Profils providers | 10+ |
| `payments` | Paiements | Vérifier derniers 7 jours |
| `subscriptions` | Abonnements | 10+ |
| `call_sessions` | Sessions d'appel | Vérifier dernières 24h |
| `invoices` | Factures | Vérifier dernier mois |

---

## 6. Récupération des utilisateurs Firebase Auth

### 6.1 Lister les backups Auth disponibles

```bash
# Via Cloud Function
firebase functions:call listAuthBackups --region=europe-west1

# Ou directement dans Storage
gsutil ls gs://sos-urgently-ac307.firebasestorage.app/auth_backups/
```

### 6.2 Valider un backup avant restauration

```bash
# Analyser le contenu sans créer d'utilisateurs
firebase functions:call validateAuthBackup \
  --region=europe-west1 \
  --data '{"backupId": "auth_backup_2025-01-01"}'
```

### 6.3 Restauration complète des utilisateurs

```bash
# Restaurer tous les utilisateurs (skip ceux qui existent déjà)
firebase functions:call restoreFirebaseAuth \
  --region=europe-west1 \
  --data '{
    "backupId": "auth_backup_2025-01-01",
    "options": {
      "dryRun": false,
      "skipExisting": true,
      "restoreCustomClaims": true
    }
  }'
```

### 6.4 Restauration d'un utilisateur spécifique

```bash
firebase functions:call restoreSingleUser \
  --region=europe-west1 \
  --data '{
    "backupId": "auth_backup_2025-01-01",
    "uid": "USER_UID_HERE",
    "force": false
  }'
```

### ⚠️ LIMITATIONS IMPORTANTES

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ATTENTION - LIMITATIONS DE RESTAURATION AUTH                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ❌ Les MOTS DE PASSE ne peuvent PAS être restaurés                     │
│     → Les utilisateurs devront réinitialiser leur mot de passe          │
│                                                                          │
│  ❌ Les TOKENS DE SESSION seront invalidés                              │
│     → Les utilisateurs devront se reconnecter                           │
│                                                                          │
│  ❌ Les LIENS OAUTH (Google, etc.) seront perdus                        │
│     → Les utilisateurs devront re-lier leurs comptes                    │
│                                                                          │
│  ✅ Les CUSTOM CLAIMS (rôles) peuvent être restaurés                    │
│  ✅ Les MÉTADONNÉES utilisateur sont conservées                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.5 Envoyer un email de reset password en masse

Après restauration, envoyer un email à tous les utilisateurs :

```javascript
// Script à exécuter une fois
const admin = require('firebase-admin');
admin.initializeApp();

async function sendPasswordResetToAll() {
  const users = await admin.auth().listUsers();

  for (const user of users.users) {
    if (user.email) {
      try {
        await admin.auth().generatePasswordResetLink(user.email);
        // Envoyer l'email via SendGrid/Nodemailer
        console.log(`Reset email sent to ${user.email}`);
      } catch (e) {
        console.error(`Failed for ${user.email}:`, e.message);
      }
    }
  }
}
```

---

## 7. Récupération des fichiers Storage

### 7.1 Le versioning est activé

```bash
# Vérifier que le versioning est actif
gcloud storage buckets describe gs://sos-urgently-ac307.firebasestorage.app \
  --format="value(versioning.enabled)"
```

### 7.2 Lister les versions d'un fichier

```bash
# Lister toutes les versions d'un fichier
gsutil ls -a gs://sos-urgently-ac307.firebasestorage.app/profilePhotos/USER_ID/photo.jpg

# Résultat:
# gs://bucket/profilePhotos/USER_ID/photo.jpg#1234567890000
# gs://bucket/profilePhotos/USER_ID/photo.jpg#1234567891000 (current)
```

### 7.3 Restaurer une version précédente

```bash
# Copier une ancienne version vers le fichier actuel
gsutil cp \
  "gs://sos-urgently-ac307.firebasestorage.app/profilePhotos/USER_ID/photo.jpg#1234567890000" \
  "gs://sos-urgently-ac307.firebasestorage.app/profilePhotos/USER_ID/photo.jpg"
```

### 7.4 Restaurer un fichier supprimé

```bash
# Les fichiers supprimés sont conservés comme versions "non-live"
# Lister les versions (y compris supprimées)
gsutil ls -a gs://sos-urgently-ac307.firebasestorage.app/deleted/file.pdf

# Restaurer
gsutil cp \
  "gs://bucket/deleted/file.pdf#generation" \
  "gs://bucket/restored/file.pdf"
```

### 7.5 Restaurer un dossier entier depuis le bucket DR

```bash
# Si le bucket principal est compromis, utiliser le bucket DR
gsutil -m cp -r \
  gs://sos-expat-backup-dr/scheduled-backups/ \
  gs://sos-urgently-ac307.firebasestorage.app/scheduled-backups/
```

---

## 8. Récupération des Cloud Functions

### 8.1 Redéployer depuis Git

```bash
# 1. S'assurer d'être sur la bonne branche
cd sos-expat-project/sos
git checkout main
git pull origin main

# 2. Installer les dépendances
cd firebase/functions
npm ci

# 3. Build
npm run build

# 4. Déployer
firebase deploy --only functions
```

### 8.2 Déployer une fonction spécifique

```bash
# Déployer seulement certaines fonctions
firebase deploy --only functions:createPaymentIntent,functions:scheduledBackup
```

### 8.3 Vérifier les fonctions déployées

```bash
# Lister les fonctions
firebase functions:list

# Voir les logs
firebase functions:log --only createPaymentIntent
```

### 8.4 Secrets à reconfigurer

Si les secrets sont perdus, les recréer :

```bash
# Lister les secrets existants
firebase functions:secrets:list

# Recréer les secrets
firebase functions:secrets:set EMAIL_USER
firebase functions:secrets:set EMAIL_PASS
firebase functions:secrets:set TWILIO_ACCOUNT_SID
firebase functions:secrets:set TWILIO_AUTH_TOKEN
firebase functions:secrets:set STRIPE_SECRET_KEY_LIVE
```

---

## 9. Récupération de la configuration

### 9.1 Fichiers de configuration (tous versionnés dans Git)

```
sos/
├── firebase.json          # Configuration principale
├── .firebaserc           # Alias de projet
├── firestore.rules       # Règles Firestore
├── firestore.indexes.json # Index Firestore
└── storage.rules         # Règles Storage
```

### 9.2 Redéployer les règles et index

```bash
# Déployer les règles Firestore
firebase deploy --only firestore:rules

# Déployer les index Firestore
firebase deploy --only firestore:indexes

# Déployer les règles Storage
firebase deploy --only storage
```

### 9.3 Vérifier la configuration

```bash
# Afficher la configuration actuelle
firebase projects:describe sos-urgently-ac307

# Vérifier les règles actives
firebase firestore:rules:get
```

---

## 10. Récupération des enregistrements Twilio

### 10.1 Structure des backups

```
gs://sos-urgently-ac307.firebasestorage.app/call_recordings_backup/
└── 2025/
    └── 01/
        └── 01/
            ├── RE_abc123.mp3
            ├── RE_def456.mp3
            └── ...
```

### 10.2 Télécharger un enregistrement

```bash
# Via gsutil
gsutil cp \
  gs://sos-urgently-ac307.firebasestorage.app/call_recordings_backup/2025/01/01/RE_abc123.mp3 \
  ./recordings/

# Ou récupérer l'URL signée depuis Firestore
# Collection: call_recordings
# Champ: backupUrl
```

### 10.3 Vérifier le statut des backups

```bash
firebase functions:call getTwilioBackupStats --region=europe-west1
```

---

## 11. Données Stripe (externes)

### 11.1 Stripe conserve tout l'historique

Stripe ne nécessite pas de backup car les données sont conservées indéfiniment.

### 11.2 Accéder aux données Stripe

```bash
# Dashboard
# https://dashboard.stripe.com

# API - Lister les paiements
curl https://api.stripe.com/v1/charges \
  -u sk_live_XXXX: \
  -d limit=100

# API - Récupérer un paiement spécifique
curl https://api.stripe.com/v1/charges/ch_xxx \
  -u sk_live_XXXX:
```

### 11.3 Resynchroniser Stripe ↔ Firestore

Si les données Firestore sont désynchronisées avec Stripe :

```bash
# Utiliser le webhook replay
# Dashboard Stripe → Developers → Webhooks → Resend events

# Ou déclencher une sync manuelle
firebase functions:call syncStripeData --region=europe-west1
```

---

## 12. Vérification post-récupération

### 12.1 Checklist de vérification

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CHECKLIST POST-RÉCUPÉRATION                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  BASE DE DONNÉES                                                        │
│  □ Vérifier le nombre de documents dans collections critiques          │
│  □ Vérifier les 10 derniers paiements                                  │
│  □ Vérifier les abonnements actifs                                      │
│  □ Vérifier les sessions d'appel récentes                               │
│                                                                          │
│  AUTHENTIFICATION                                                       │
│  □ Tester la connexion d'un utilisateur                                │
│  □ Vérifier les rôles admin                                             │
│  □ Tester la création de compte                                         │
│                                                                          │
│  CLOUD FUNCTIONS                                                        │
│  □ Vérifier que les fonctions sont déployées                           │
│  □ Tester createPaymentIntent                                           │
│  □ Vérifier les logs d'erreur                                           │
│                                                                          │
│  INTÉGRATIONS                                                           │
│  □ Tester un paiement Stripe (mode test)                               │
│  □ Tester un appel Twilio (si applicable)                              │
│  □ Vérifier les webhooks                                                │
│                                                                          │
│  FRONTEND                                                               │
│  □ Vérifier que le site charge correctement                            │
│  □ Tester la navigation                                                 │
│  □ Vérifier les images/fichiers                                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 12.2 Exécuter le test DR automatique

```bash
# Lancer un test DR manuel
firebase functions:call runDRTestManual --region=europe-west1

# Ou lancer le test de restauration
firebase functions:call runRestoreTestManual --region=europe-west1
```

### 12.3 Vérifier les logs

```bash
# Logs Firebase Functions
firebase functions:log --only scheduledBackup

# Logs dans Firestore
# Collection: system_logs
# Filtrer par type: "firestore_backup" ou "auth_backup"
```

---

## 13. Contacts et escalade

### 13.1 Équipe technique

| Rôle | Contact | Disponibilité |
|------|---------|---------------|
| CTO / Lead Dev | À remplir | 24/7 si urgence |
| DevOps | À remplir | Heures ouvrées |

### 13.2 Support externe

| Service | Contact | Temps de réponse |
|---------|---------|------------------|
| Firebase Support | https://firebase.google.com/support | 4-24h |
| Stripe Support | https://support.stripe.com | 24h |
| Twilio Support | https://support.twilio.com | 24h |

### 13.3 Niveaux d'escalade

```
Niveau 1 (0-15 min)   → Équipe technique on-call
Niveau 2 (15-30 min)  → CTO
Niveau 3 (30+ min)    → Support Firebase/GCP
```

---

## Annexes

### A. Commandes utiles

```bash
# === FIREBASE ===
firebase login
firebase use sos-urgently-ac307
firebase deploy --only functions
firebase functions:log

# === GCLOUD ===
gcloud auth login
gcloud config set project sos-urgently-ac307
gcloud firestore import/export
gcloud storage buckets describe

# === GSUTIL ===
gsutil ls gs://bucket/
gsutil cp gs://source gs://dest
gsutil -m cp -r  # Copie récursive parallèle
```

### B. URLs importantes

| Service | URL |
|---------|-----|
| Firebase Console | https://console.firebase.google.com/project/sos-urgently-ac307 |
| GCP Console | https://console.cloud.google.com/home/dashboard?project=sos-urgently-ac307 |
| Stripe Dashboard | https://dashboard.stripe.com |
| Twilio Console | https://console.twilio.com |
| GitHub Repository | https://github.com/will383842/sos-expat-project |

### C. Structure des buckets

```
gs://sos-urgently-ac307.firebasestorage.app/
├── scheduled-backups/
│   ├── morning/backup-{timestamp}/      # Backup 3h
│   ├── midday/backup-{timestamp}/       # Backup 11h
│   └── evening/backup-{timestamp}/      # Backup 19h
├── manual-backups/
│   └── backup-{timestamp}/              # Backups manuels
├── auth_backups/
│   └── auth_backup_{date}.json          # Backups Auth hebdo
├── call_recordings_backup/
│   └── {year}/{month}/{day}/            # Enregistrements Twilio
├── profilePhotos/
│   └── {userId}/                        # Photos de profil
├── documents/
│   └── {userId}/                        # Documents utilisateurs
└── invoices/
    └── {type}/{year}/{month}/           # Factures

gs://sos-expat-backup-dr/                # Bucket DR (europe-west3)
├── scheduled-backups/                    # Copie cross-région
├── manual-backups/
└── auth_backups/
```

### D. Template de post-mortem

```markdown
## Incident Report - [DATE]

### Résumé
- **Durée**: X heures Y minutes
- **Impact**: X utilisateurs affectés
- **Sévérité**: Critical/High/Medium/Low

### Timeline
- HH:MM - Détection de l'incident
- HH:MM - Actions prises
- HH:MM - Résolution

### Cause racine
[Description détaillée]

### Impact
- Utilisateurs affectés: X
- Transactions impactées: X
- Perte de données: Oui/Non (détails)

### Actions correctives
1. [Action immédiate]
2. [Action court terme]
3. [Action long terme]

### Leçons apprises
- [Point 1]
- [Point 2]
```

---

## Historique des versions

| Version | Date | Auteur | Modifications |
|---------|------|--------|---------------|
| 1.0 | 2024-12 | Équipe | Version initiale |
| 2.0 | 2025-01 | Claude AI | Ajout multi-frequency backup, cross-region, tests trimestriels |

---

*Dernière mise à jour: Janvier 2025*
*Version: 2.0*
