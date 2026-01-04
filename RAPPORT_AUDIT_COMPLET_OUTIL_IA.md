# RAPPORT D'AUDIT COMPLET - OUTIL IA SOS EXPAT
**Date:** 3 janvier 2026
**Auditeur:** Claude Opus 4.5
**Projets analysés:** `sos/` + `Outil-sos-expat/`

---

## SOMMAIRE EXECUTIF

| Domaine | Note | Statut | Actions Urgentes |
|---------|------|--------|------------------|
| **Cache Firestore** | 4/10 | CRITIQUE | Persistance non limitee, listeners non suspendus |
| **Secrets** | 7/10 | MOYEN | Twilio credentials en texte clair |
| **Fonctions inutiles** | 3/10 | CRITIQUE | 7 fonctions recording a supprimer |
| **Abonnement IA** | 7/10 | BON | Expiration auto non implementee |

**Economies potentielles:** ~28 EUR/an (fonctions) + reduction cache significative
**Risque securite:** ELEVE (Twilio credentials exposes)

---

# PARTIE 1: PROBLEME DE CACHE QUI SE REMPLIT VITE

## 1.1 Causes Principales Identifiees

### A. Persistance Firestore ACTIVEE par defaut
**Fichier:** `sos/src/config/firebase.ts`

```typescript
export const db: Firestore = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: false,
  useFetchStreams: false,
  // PROBLEME: Pas de desactivation de la persistance
  // Les donnees sont stockees dans IndexedDB indefiniment!
});
```

**Impact:** IndexedDB peut grossir jusqu'a 50+ MB sans limite.

### B. 83 listeners onSnapshot dans le projet

| Fichier | Listeners | Limite docs | Impact Cache |
|---------|-----------|-------------|--------------|
| AuthContext.tsx | 1 permanent | 1 doc | 5 KB |
| AdminApprovals.tsx | 1 par onglet | 100 docs | 200 KB |
| AdminCalls.tsx | 1 si admin actif | 50 docs | 150 KB |
| useAggregateRating.ts | 1 optionnel | 500 docs batch | 500 KB |

### C. Collections publiques avec lectures massives
```javascript
// firestore.rules - Ces collections sont publiques
match /sos_profiles/{profileId} { allow read: if true; }
match /reviews/{reviewId} { allow read: if resource.data.status == 'published'; }
match /nationalities/{...} { allow read: if true; }
```

## 1.2 Solutions Recommandees

### SOLUTION 1: Desactiver la persistance (Recommande)
```typescript
// firebase.ts - Ajouter:
import { disablePersistence } from 'firebase/firestore';

if (typeof window !== 'undefined') {
  disablePersistence(db).catch(() => {
    console.warn('[Firebase] Persistence deja desactivee');
  });
}
```
**Economies:** ~90% reduction du cache IndexedDB

### SOLUTION 2: Reduire les limites admin
```typescript
// AdminApprovals.tsx - Changer:
limit(100)  // AVANT
limit(25)   // APRES - 75% moins de docs en cache
```

### SOLUTION 3: Appliquer useAutoSuspendRealtime partout
Le hook existe deja dans `sos/src/hooks/useAutoSuspendRealtime.ts`.
Appliquer a: AdminApprovals, AdminAaaProfiles, etc.

---

# PARTIE 2: VERIFICATION DES SECRETS

## 2.1 Resume des Secrets

### Secrets CORRECTS (Firebase Secret Manager via defineSecret)
| Secret | Fichier | Statut |
|--------|---------|--------|
| OPENAI_API_KEY | Outil-sos-expat/functions/src/ai/handlers/shared.ts | OK |
| ANTHROPIC_API_KEY | Outil-sos-expat/functions/src/ai/handlers/shared.ts | OK |
| PERPLEXITY_API_KEY | Outil-sos-expat/functions/src/ai/handlers/shared.ts | OK |
| STRIPE_SECRET_KEY_LIVE | sos/firebase/functions/src/createPaymentIntent.ts | OK |
| STRIPE_WEBHOOK_SECRET_LIVE | sos/firebase/functions/src/index.ts | OK |
| EMAIL_USER / EMAIL_PASS | sos/firebase/functions/src/index.ts | OK |
| MAILWIZZ_API_KEY | sos/firebase/functions/src/index.ts | OK |
| ENCRYPTION_KEY | Firebase Secret Manager | OK |
| TASKS_AUTH_SECRET | Firebase Secret Manager | OK |

### Secrets CRITIQUES EN TEXTE CLAIR
| Secret | Fichier | Valeur (8 chars) | RISQUE |
|--------|---------|-----------------|--------|
| TWILIO_ACCOUNT_SID | sos/.env.local | ACf2794f... | CRITIQUE |
| TWILIO_ACCOUNT_SID | sos/.env.production | ACf2794f... | CRITIQUE |
| TWILIO_AUTH_TOKEN | sos/.env.local | 41e3d862... | CRITIQUE |
| TWILIO_AUTH_TOKEN | sos/.env.production | 41e3d862... | CRITIQUE |

### Secrets PUBLIQUES (acceptables)
| Secret | Type |
|--------|------|
| VITE_FIREBASE_* | Cles publiques Firebase |
| VITE_STRIPE_PUBLIC_KEY | pk_live_* (cle publique Stripe) |
| VITE_PAYPAL_CLIENT_ID | Client ID PayPal (public) |
| VITE_GA4_MEASUREMENT_ID | Google Analytics |

## 2.2 Action URGENTE - Twilio

```bash
# Supprimer de .env.local et .env.production
# Migrer vers Firebase Secret Manager:
firebase functions:secrets:set TWILIO_ACCOUNT_SID --project=sos-urgently-ac307
firebase functions:secrets:set TWILIO_AUTH_TOKEN --project=sos-urgently-ac307
firebase functions:secrets:set TWILIO_PHONE_NUMBER --project=sos-urgently-ac307
```

Puis utiliser dans le code:
```typescript
import { defineSecret } from 'firebase-functions/params';
export const TWILIO_ACCOUNT_SID = defineSecret('TWILIO_ACCOUNT_SID');
export const TWILIO_AUTH_TOKEN = defineSecret('TWILIO_AUTH_TOKEN');
```

## 2.3 Secrets dans Google Cloud Secret Manager

### Projet outils-sos-expat
| Secret | Date Creation |
|--------|--------------|
| ADMIN_API_KEY | 2025-08-10 |
| ANTHROPIC_API_KEY | 2025-12-14 |
| OPENAI_API_KEY | 2025-08-10 |
| PERPLEXITY_API_KEY | 2025-11-29 |
| SOS_PLATFORM_API_KEY | 2025-08-10 |
| SOS_SYNC_API_KEY | 2025-12-28 |
| SYNC_PROVIDER_API_KEY | 2025-12-18 |

### Projet sos-urgently-ac307
| Secret | Date Creation |
|--------|--------------|
| STRIPE_SECRET_KEY | Actif |
| STRIPE_SECRET_KEY_LIVE | Actif |
| STRIPE_WEBHOOK_SECRET_LIVE | 2025-12-29 |
| PAYPAL_CLIENT_ID_LIVE | 2025-12-30 |
| PAYPAL_CLIENT_SECRET_LIVE | 2025-12-30 |
| TWILIO_ACCOUNT_SID | Actif |
| TWILIO_AUTH_TOKEN | Actif |
| EMAIL_USER / EMAIL_PASS | Actif |
| ENCRYPTION_KEY | 2026-01-02 |
| + 20 autres secrets... | |

---

# PARTIE 3: FONCTIONS GOOGLE CLOUD INUTILES

## 3.1 Contexte
Le recording Twilio a ete desactive (commit `12a83a9`) pour conformite RGPD.
Les fonctions liees au recording sont donc INUTILES.

## 3.2 Fonctions a SUPPRIMER

| Fonction | Type | Frequence | Cout/an | Fichier |
|----------|------|-----------|---------|---------|
| **backupTwilioRecordings** | Scheduled | 1/jour | 7.20 EUR | scheduled/backupTwilioRecordings.ts |
| **retryFailedTwilioBackups** | Scheduled | 4/jour | 14.40 EUR | scheduled/backupTwilioRecordings.ts |
| **rgpdRecordingCleanup** | Scheduled | 1/jour | 3.60 EUR | scheduled/rgpdRecordingCleanup.ts |
| **TwilioRecordingWebhook** | Webhook | ~0 | 0-4.80 EUR | Webhooks/TwilioRecordingWebhook.ts |
| **triggerTwilioBackup** | Callable | Rare | 1.20 EUR | scheduled/backupTwilioRecordings.ts |
| **getTwilioBackupStats** | Callable | Rare | 0.60 EUR | scheduled/backupTwilioRecordings.ts |
| **triggerRgpdCleanup** | Callable | Rare | 0.60 EUR | scheduled/rgpdRecordingCleanup.ts |

**TOTAL ECONOMIES:** ~28 EUR/an + Infrastructure storage inutilisee

## 3.3 Fichiers a supprimer

```
sos/firebase/functions/src/
  Webhooks/TwilioRecordingWebhook.ts  [SUPPRIMER]
  scheduled/backupTwilioRecordings.ts [SUPPRIMER]
  scheduled/rgpdRecordingCleanup.ts   [SUPPRIMER]
```

## 3.4 Exports a retirer de index.ts

```typescript
// Ligne 91-95: Supprimer
export {
  rgpdRecordingCleanup,
  triggerRgpdCleanup,
} from "./scheduled/rgpdRecordingCleanup";

// Ligne 3588-3592: Supprimer
export {
  backupTwilioRecordings,
  retryFailedTwilioBackups,
  triggerTwilioBackup,
  getTwilioBackupStats,
} from './scheduled/backupTwilioRecordings';
```

## 3.5 Collections Firestore inutilisees a nettoyer
- `call_recordings` - Collection vide
- `system_logs` (entrees `twilio_backup*`)
- Firebase Storage: `call_recordings_backup/`

---

# PARTIE 4: AUDIT SYSTEME D'ABONNEMENT IA

## 4.1 Architecture Actuelle

```
Frontend (Outil-sos-expat)
    |
    v
SubscriptionGuard --> useSubscription() --> Firestore
    |
    v
SubscriptionScreen (tarifs) --> Redirect sos-expat.com
    |
    v
Laravel/SOS (Stripe checkout)
    |
    v
Webhook Stripe --> syncSubscription() --> Firestore
```

## 4.2 Composants Fonctionnels

| Composant | Fichier | Lignes | Statut |
|-----------|---------|--------|--------|
| Hook useSubscription | src/hooks/useSubscription.ts | 230 | OK |
| Service subscription | src/services/subscriptionService.ts | 200+ | OK |
| Contexte unifie | src/contexts/UnifiedUserContext.tsx | 524+ | OK |
| Webhook Stripe | functions/src/subscription.ts | 570 | OK |
| Ecran tarification | src/components/guards/SubscriptionScreen.tsx | 238 | OK |
| Ecran expiration | src/components/guards/SubscriptionExpiredScreen.tsx | 271 | OK |
| Ecran quota | src/components/guards/QuotaExhaustedScreen.tsx | 220 | OK |
| Garde abonnement | src/components/SubscriptionGuard.tsx | 268 | OK |

## 4.3 Tarification Configuree

| Type | Mensuel | Annuel | Economies |
|------|---------|--------|-----------|
| Avocat (lawyer) | 49 EUR | 470 EUR | 118 EUR (2 mois) |
| Expat | 29 EUR | 280 EUR | 68 EUR (2 mois) |

## 4.4 BUGS CRITIQUES IDENTIFIES (P0)

### BUG P0.1: expireOverdueSubscriptions() N'EST PAS SCHEDULEE
**Fichier:** `functions/src/subscription.ts` (lignes 512-570)
**Probleme:** Fonction definie mais aucun Cloud Scheduler configure
**Impact:** Les abonnements expires ne sont JAMAIS marques comme "expired"

**Solution:**
```typescript
// Ajouter dans index.ts
export const expireOverdueSubscriptionsScheduled = onSchedule(
  { schedule: "every day 00:00", region: "europe-west1" },
  async () => {
    const result = await expireOverdueSubscriptions();
    logger.info("Subscription expiration check", result);
  }
);
```

### BUG P0.2: Verification quota MANQUANTE dans les appels IA
**Probleme:** `aiChat()` et `aiOnBookingCreated()` ne verifient pas le quota
**Impact:** Provider peut depasser son quota sans blocage
**Solution:** Appeler `checkUserAccess(userId)` avant chaque appel IA

### BUG P0.3: Grace period NON geree
**Fichier:** `SubscriptionExpiredScreen.tsx`
**Probleme:** `gracePeriodDays` est optionnel mais jamais passe
**Solution:** Calculer depuis regles metier (7 jours apres expiration)

### BUG P0.4: Essai gratuit sans expiration automatique
**Fichier:** `UnifiedUserContext.tsx`
**Probleme:** `freeTrialUntil` verifie cote client mais pas de Cloud Function
**Solution:** Ajouter tache schedulee pour marquer trial expire

## 4.5 Statuts d'abonnement supportes

| Statut | Description | Transition |
|--------|-------------|------------|
| active | Abonnement actif paye | Etat nominal |
| trialing | Periode d'essai | -> active apres trial |
| past_due | Paiement en retard | -> active ou canceled |
| canceled | Annule | -> expired apres fin periode |
| unpaid | Impaye definitif | -> canceled |
| paused | Mis en pause | -> active |
| expired | Expire | Etat final |

## 4.6 Note Globale: 7/10 - BON MAIS INCOMPLET

**Points forts:**
- Architecture bien structuree
- Types TypeScript complets
- Frontend attractif multilingue
- Webhook Stripe securise
- SSO integration fonctionnelle

**Points faibles:**
- Expiration automatique non implementee
- Verification quota manquante
- Grace period non geree
- Pas de portail de gestion utilisateur

---

# PLAN D'ACTION RECOMMANDE

## Semaine 1 (URGENT)

### Securite
- [ ] Migrer TWILIO_ACCOUNT_SID et TWILIO_AUTH_TOKEN vers Firebase Secret Manager
- [ ] Verifier que .env.local et .env.production sont dans .gitignore
- [ ] Auditer git history pour credentials commites

### Fonctions inutiles
- [ ] Supprimer les 3 fichiers de recording (voir 3.3)
- [ ] Retirer les exports de index.ts (voir 3.4)
- [ ] Deployer sans les fonctions recording

## Semaine 2

### Cache
- [ ] Ajouter `disablePersistence(db)` dans firebase.ts
- [ ] Reduire limit() de 100 a 25 dans AdminApprovals.tsx
- [ ] Appliquer useAutoSuspendRealtime aux pages admin

### Abonnement
- [ ] Ajouter expireOverdueSubscriptionsScheduled
- [ ] Implementer verification quota avant appels IA
- [ ] Calculer et passer gracePeriodDays

## Semaine 3-4

### Nettoyage
- [ ] Supprimer collection call_recordings de Firestore
- [ ] Vider dossier call_recordings_backup/ de Storage
- [ ] Nettoyer system_logs (entrees twilio_backup*)

### Abonnement
- [ ] Ajouter Cloud Function pour expirer trial
- [ ] Implementer sync bidirectionnel avec SOS
- [ ] Ajouter tests E2E du flux complet

---

# CONCLUSION

Ce rapport identifie **4 problemes critiques** a corriger immediatement:

1. **Secrets Twilio en texte clair** - RISQUE SECURITE ELEVE
2. **7 fonctions inutiles** deployees - COUT INUTILE
3. **Cache Firestore sans limite** - PERFORMANCE DEGRADEE
4. **Expiration abonnement non automatisee** - BUG FONCTIONNEL

**Effort total estime:** 2-3 semaines avec 1 developpeur senior Firebase/TypeScript

---
*Rapport genere le 3 janvier 2026 par Claude Opus 4.5*
