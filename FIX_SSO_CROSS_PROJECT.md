# FIX SSO Cross-Project : Outil IA ne recevait pas les conversations

## Problème Identifié

**Symptôme :** Le dashboard de l'Outil IA n'affichait aucune conversation alors que les données existaient dans Firestore.

**Cause Racine :**
1. Le token SSO était signé par le service account de SOS (`sos-urgently-ac307`)
2. Mais `signInWithCustomToken()` de l'Outil (`outils-sos-expat`) ne pouvait pas valider ce token
3. Résultat : l'utilisateur n'était JAMAIS authentifié dans l'Outil Firebase Auth
4. Donc `activeProvider` était null → aucune conversation visible

## Diagnostic Effectué

```
# Backend : TOUT EST CORRECT
✅ Provider "Julien Valentine" existe (DfDbWASBaeaVEZrqg6Wlcd3zpYX2)
✅ 10 conversations avec le bon providerId
✅ User document avec subscriptionStatus: "active"
✅ Index Firestore existe
✅ Règles Firestore correctes

# Frontend : PROBLÈME
❌ Firebase Auth de l'Outil ne contient PAS l'utilisateur
❌ signInWithCustomToken() échoue silencieusement
```

## Solution Appliquée

Fichier modifié : `sos/firebase/functions/src/auth/generateOutilToken.ts`

- Ajout du secret `OUTIL_SERVICE_ACCOUNT_KEY` contenant le JSON du service account de l'Outil
- Création d'une instance Firebase Admin dédiée pour l'Outil (`outil-sso`)
- Utilisation de `outilAuth.createCustomToken()` au lieu de `auth.createCustomToken()`

## Étapes de Configuration

### 1. Créer un Service Account dans l'Outil

```bash
# Dans la console Google Cloud du projet outils-sos-expat :
# 1. Aller sur IAM & Admin > Service Accounts
# 2. Créer un nouveau service account :
#    - Nom : "sso-token-generator"
#    - ID : "sso-token-generator"
# 3. Accorder le rôle "Firebase Authentication Admin"
# 4. Générer une clé JSON et la télécharger
```

### 2. Créer le Secret dans SOS

```bash
cd sos/firebase/functions

# Créer le secret (coller tout le contenu JSON quand demandé)
firebase functions:secrets:set OUTIL_SERVICE_ACCOUNT_KEY --project sos-urgently-ac307

# Vérifier que le secret existe
firebase functions:secrets:list --project sos-urgently-ac307
```

### 3. Déployer la Fonction

```bash
cd sos

# Déployer uniquement generateOutilToken
firebase deploy --only functions:generateOutilToken --project sos-urgently-ac307
```

### 4. Tester le SSO

1. Se connecter à sos-expat.com avec le compte julienvalentine1@gmail.com
2. Cliquer sur "Assistant IA" dans le menu
3. L'Outil devrait s'ouvrir avec les conversations visibles

## Workflow Complet de l'Outil IA

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WORKFLOW COMPLET                                   │
└─────────────────────────────────────────────────────────────────────────────┘

1. RÉSERVATION CLIENT (SOS → Outil)
   ────────────────────────────────
   Client paye sur SOS
        │
        ▼
   createAndScheduleCallHTTPS()
        │
        ├──► syncCallSessionToOutil() ──► POST /ingestBooking (Outil)
        │                                        │
        │                                        ▼
        │                               bookings/{id} créé dans Outil
        │                                        │
        │                                        ▼
        │                               aiOnBookingCreated (trigger)
        │                                        │
        │                                        ▼
        │                               conversations/{id} créé
        │                               + message IA auto-généré
        │
        └──► scheduleCallTask() ──► Cloud Tasks ──► Twilio call

2. SSO PRESTATAIRE (SOS → Outil)
   ─────────────────────────────
   Provider clique "Assistant IA" sur SOS
        │
        ▼
   generateOutilToken() [SOS Cloud Function]
        │
        ├──► Vérifie abonnement/accès
        │
        └──► outilAuth.createCustomToken(uid) [signé par Outil SA]
                    │
                    ▼
              Token retourné à SOS frontend
                    │
                    ▼
              Redirect vers Outil: /auth?token=xxx
                    │
                    ▼
              AuthSSO.tsx: signInWithCustomToken(token)
                    │
                    ▼
              User créé dans Outil Firebase Auth
                    │
                    ▼
              UnifiedUserContext: trouve provider par UID
                    │
                    ▼
              ProviderHome: query conversations WHERE providerId == activeProvider.id
                    │
                    ▼
              Conversations affichées ✅

3. SYNC PROVIDER (SOS → Outil)
   ──────────────────────────
   Provider créé/modifié sur SOS
        │
        ▼
   syncSosProfilesToOutil (trigger)
        │
        └──► POST /syncProvider (Outil)
                    │
                    ▼
              providers/{uid} créé/mis à jour
              users/{uid} créé/mis à jour

4. SYNC ACCÈS IA (SOS → Outil)
   ────────────────────────────
   Admin active forcedAIAccess sur SOS
        │
        ▼
   onUserAccessUpdated (trigger)
        │
        └──► POST /syncProvider avec forcedAIAccess
```

## Vérifications Post-Déploiement

```bash
# 1. Vérifier le secret
firebase functions:secrets:access OUTIL_SERVICE_ACCOUNT_KEY --project sos-urgently-ac307

# 2. Vérifier les logs après un test SSO
gcloud functions logs read generateOutilToken --project sos-urgently-ac307 --limit 10

# 3. Vérifier que l'utilisateur est créé dans Outil Auth
# (Utiliser la console Firebase de outils-sos-expat > Authentication)
```
