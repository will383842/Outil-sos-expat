# RAPPORT D'AUDIT COMPLET - INFRASTRUCTURE GOOGLE CLOUD / FIREBASE
## Projet: SOS-Expat Platform
## Date: 2024-12-30
## Objectif: Réduction des coûts de 40-60%

---

# TABLE DES MATIÈRES

1. [Vue d'Ensemble](#1-vue-densemble)
2. [Firestore Database](#2-firestore-database)
3. [Cloud Functions](#3-cloud-functions)
4. [Cloud Storage](#4-cloud-storage)
5. [APIs Externes](#5-apis-externes)
6. [Hosting & Performance](#6-hosting--performance)
7. [Synthèse des Optimisations](#7-synthèse-des-optimisations)
8. [Plan d'Action Priorisé](#8-plan-daction-priorisé)

---

# 1. VUE D'ENSEMBLE

## 1.1 Architecture du Projet

```
SOS-Expat Platform
├── Frontend (Vite + React + TypeScript)
│   ├── 150+ composants TSX
│   ├── 68 collections Firestore
│   └── 40+ listeners temps réel
├── Backend (Firebase Cloud Functions v2)
│   ├── 150+ Cloud Functions
│   ├── 30+ Scheduled Tasks
│   └── Region: europe-west1
├── Services Externes
│   ├── Twilio (VoIP calls)
│   ├── Stripe (Payments)
│   ├── PayPal (Alternative payments)
│   └── Translation APIs (MyMemory, LibreTranslate)
└── Infrastructure
    ├── Firebase Hosting (CDN + Cache)
    ├── Firebase Storage
    └── Firebase Authentication
```

## 1.2 Fichiers de Configuration Clés

| Fichier | Chemin | Description |
|---------|--------|-------------|
| firebase.json | `/sos/firebase.json` | Config hosting, rewrites, cache |
| firestore.rules | `/sos/firestore.rules` | Règles de sécurité (669 lignes) |
| firestore.indexes.json | `/sos/firestore.indexes.json` | 85+ index composites |
| storage.rules | `/sos/storage.rules` | Règles Storage |
| package.json | `/sos/package.json` | Dépendances frontend |
| functions/package.json | `/sos/firebase/functions/package.json` | Dépendances backend |

---

# 2. FIRESTORE DATABASE

## 2.1 Structure des Collections (68 total)

### Collections Principales par Domaine

#### Utilisateurs & Profils (4 collections)
| Collection | Index | Accès | Usage |
|-----------|-------|-------|-------|
| `users` | 5 | Authentifié | Données utilisateur |
| `sos_profiles` | 13 | Public read | Profils providers |
| `sos_profiles/reviews` | - | Public | Avis sous-collection |
| `providers_translations` | - | Owner/Admin | Traductions IA |

#### Appels & Sessions (4 collections)
| Collection | Index | Usage |
|-----------|-------|-------|
| `calls` | 5 | Historique appels |
| `call_sessions` | 11 | Sessions actives |
| `call_logs` | - | Logs techniques |
| `call_recordings` | - | Enregistrements |

#### Paiements & Finances (14 collections)
| Collection | Index | Usage |
|-----------|-------|-------|
| `payments` | 15+ | Transactions |
| `refunds` | 2 | Remboursements |
| `transfers` | 2 | Virements providers |
| `pending_transfers` | 2 | Virements en attente |
| `disputes` | 2 | Litiges Stripe/PayPal |
| `invoices` | - | Factures |
| `invoice_records` | 2 | Registre factures |
| `coupons` | 1 | Codes promo |
| `coupon_usages` | 2 | Usage coupons |

#### PayPal (8 collections)
| Collection | Usage |
|-----------|-------|
| `paypal_orders` | Commandes PayPal |
| `paypal_referrals` | Onboarding merchants |
| `paypal_webhook_events` | Events webhooks |
| `paypal_payouts` | Payouts |
| `paypal_payouts_failed` | Échecs |
| `paypal_reminder_queue` | Rappels |
| `paypal_account_logs` | Logs comptes |
| `paypal_reminders_log` | Logs rappels |

#### Notifications (6 collections)
| Collection | Usage |
|-----------|-------|
| `notifications` | Notifications utilisateur |
| `inapp_notifications` | Notifications in-app |
| `fcm_tokens` | Tokens FCM |
| `message_events` | Événements messages |
| `message_deliveries` | Livraisons |
| `notification_logs` | Logs |

#### Abonnements & IA (5 collections)
| Collection | Index | Usage |
|-----------|-------|-------|
| `subscriptions` | 3 | Abonnements Stripe |
| `subscription_plans` | - | Plans disponibles |
| `ai_usage` | 1 | Usage quotas IA |
| `ai_call_logs` | - | Logs appels IA |
| `subscription_logs` | 1 | Logs subscriptions |

#### Content & Documents (7 collections)
| Collection | Index | Usage |
|-----------|-------|-------|
| `documents` | 2 | Documents utilisateur |
| `faqs` | - | FAQ publiques |
| `help_articles` | 1 | Articles aide |
| `help_categories` | - | Catégories aide |
| `legal_documents` | 1 | Documents légaux |
| `landing_pages` | - | Pages landing |
| `helpCenter` | - | Centre d'aide |

#### Avis (2 collections)
| Collection | Index | Usage |
|-----------|-------|-------|
| `reviews` | 8 | Avis publics |
| `review_reports` | - | Signalements |

#### Admin & Audit (9 collections)
| Collection | Usage |
|-----------|-------|
| `auditLogs` | Logs audit |
| `admin_audit_logs` | Audit admin |
| `audit_logs` | Audit technique |
| `admin_alerts` | Alertes admin |
| `technical_alerts` | Alertes techniques |
| `config` | Configuration |
| `settings` | Paramètres |
| `admin_config` | Config admin |
| `admin_actions_log` | Actions admin |

#### Analytics (7 collections)
| Collection | Index | Usage |
|-----------|-------|-------|
| `analytics` | 1 | Analytics généraux |
| `analytics_language_mismatches` | - | Erreurs langue |
| `analytics_user_actions` | - | Actions utilisateur |
| `analytics_conversions` | - | Conversions |
| `analytics_errors` | 1 | Erreurs |
| `analytics_performance` | - | Performance |
| `analytics_counters` | - | Compteurs |

## 2.2 Index Composites (85+)

### Collections les Plus Indexées
| Collection | Nombre d'Index | Observation |
|-----------|----------------|-------------|
| `payments` | 15+ | Requêtes financières complexes |
| `sos_profiles` | 13 | Recherche prestataires |
| `call_sessions` | 11 | Historique appels |
| `reviews` | 8 | Tri/filtrage avis |
| `users` | 5 | Filtrage utilisateurs |
| `calls` | 5 | Historique |

**RECOMMANDATION**: Auditer les index pour identifier ceux non utilisés. Chaque index = coût stockage.

## 2.3 PROBLÈMES CRITIQUES - Opérations de Lecture

### P0 - CRITIQUE: Collection Complète Sans Limit

**Fichier**: `sos/firebase/functions/src/seo/sitemaps.ts:137`
```typescript
// PROBLÈME: Lit TOUTE la collection à chaque appel
const articlesSnap = await db.collection('help_articles').get();
```

**Impact**:
- Chaque génération de sitemap = N lectures (N = nombre d'articles)
- Si 500 articles et sitemap appelé 100x/jour = 50,000 lectures/jour
- **Coût**: ~$0.03/jour = $1/mois juste pour cette ligne

**Solution**:
```typescript
const articlesSnap = await db.collection('help_articles')
  .where('isPublished', '==', true)
  .orderBy('updatedAt', 'desc')
  .limit(1000)
  .get();
```

### P0 - CRITIQUE: 4 Listeners Simultanés

**Fichier**: `sos/src/services/subscriptionService.ts:881-941`

```typescript
// Lignes 881, 901, 920, 941 - 4 onSnapshot simultanés!
onSnapshot(subRef, async (snapshot) => {...});      // subscription
onSnapshot(subAltRef, async (snapshot) => {...});   // subscription alt
onSnapshot(usageRef, async (snapshot) => {...});    // ai_usage
onSnapshot(invoicesQuery, async (snapshot) => {...}); // invoices
```

**Impact**:
- Chaque modification = 4 lectures facturées
- Si utilisateur modifie 10 champs = 40 lectures
- **Multiplication par 4 des coûts Firestore temps réel**

**Solution**: Agrégation en un seul listener ou polling périodique.

### P1 - Collections Sans Limit

| Fichier | Ligne | Collection | Solution |
|---------|-------|------------|----------|
| `helpCenter.ts` | 240 | `help_categories` | Ajouter limit(100) |
| `helpCenter.ts` | 245 | `help_articles` | Ajouter limit(500) |
| `legalDocumentsMigration.ts` | 35 | `legal_documents` | Ajouter limit(100) |

## 2.4 PROBLÈMES - Opérations d'Écriture

### Promise.all + deleteDoc (Non-Batché)

**Fichiers affectés**:
- `AdminReviews.tsx:760`
- `AdminLawyers.tsx:1790`
- `AdminClients.tsx:1147`
- `helpCenter.ts:241-246`

```typescript
// PROBLÈME: Pas de batch, risque dépassement limite
await Promise.all(Array.from(selectedIds).map((id) =>
  deleteDoc(doc(db, 'reviews', id))
));
```

**Solution**:
```typescript
const batch = writeBatch(db);
for (const id of selectedIds) {
  batch.delete(doc(db, 'reviews', id));
}
await batch.commit();
```

---

# 3. CLOUD FUNCTIONS

## 3.1 Inventaire Global

| Type | Nombre | Pourcentage |
|------|--------|-------------|
| Callable (onCall) | ~80 | 53% |
| HTTP (onRequest) | ~25 | 17% |
| Firestore Triggers | ~30 | 20% |
| Scheduled Tasks | ~25 | 10% |
| **TOTAL** | **~160** | 100% |

## 3.2 Scheduled Functions - ANALYSE CRITIQUE

### Fréquences Actuelles vs Recommandées

| Function | Actuel | Invoc./jour | Recommandé | Économie |
|----------|--------|-------------|------------|----------|
| `processWebhookDLQ` | 5 min | 288 | 30 min | -83% |
| `runSystemHealthCheck` | 15 min | 96 | 1h | -75% |
| `checkProviderInactivity` | 30 min | 48 | 2h | -75% |
| `scheduledSitemapPing` | 1h | 24 | 6h | -75% |
| `stopAutoresponders` | 1h | 24 | 4h | -75% |
| `processDunningQueue` | 1h | 24 | 4h | -75% |
| **TOTAL** | - | **~500** | - | **~100** |

### Fichiers à Modifier

1. **`scheduled/processDLQ.ts`** - Ligne schedule
2. **`monitoring/criticalAlerts.ts`** - runSystemHealthCheck
3. **`scheduled/checkProviderInactivity.ts`** - schedule

## 3.3 Configuration Mémoire/CPU

### Configuration Actuelle (productionConfigs.ts)

```typescript
{
  memory: "1GiB",
  maxInstances: 20,
  minInstances: 3,  // COÛTEUX!
}
```

**Problème**: `minInstances: 3` garde 3 instances warm 24/7
- Coût: ~$50-100/mois par instance warm
- **Total**: 150-300$/mois

**Solution**: Mettre minInstances: 0 sauf pour fonctions critiques (stripeWebhook).

### Configurations par Niveau de Charge

| Type | Memory | CPU | maxInstances | minInstances |
|------|--------|-----|--------------|--------------|
| Emergency | 256MiB | 0.25 | 3 | 0 |
| Standard | 256MiB | 0.25 | 10 | 0 |
| Heavy | 512MiB | 0.5 | 20 | 0 |
| Critical (payments) | 512MiB | 0.5 | 20 | 1 |

## 3.4 Functions Critiques (P0)

| Function | Type | Criticité | minInstances Recommandé |
|----------|------|-----------|-------------------------|
| `stripeWebhook` | HTTP | CRITIQUE | 1 |
| `executeCallTask` | HTTP | CRITIQUE | 0 (Cloud Tasks gère retry) |
| `onMessageEventCreate` | Trigger | HAUTE | 0 |
| `createAndScheduleCallHTTPS` | Callable | HAUTE | 0 |

---

# 4. CLOUD STORAGE

## 4.1 Buckets Identifiés

| Path | Usage | Règles |
|------|-------|--------|
| `profilePhotos/{userId}/*` | Photos profil | Public read, owner write |
| `profile_photos/{userId}/*` | Photos (legacy) | Public read, owner write |
| `registration_temp/*` | Upload temporaire | Auth required (P0 fix) |
| `temp_profiles/*` | Profils temporaires | Auth required (P0 fix) |
| `documents/{userId}/*` | Documents KYC | Owner/admin only |
| `invoices/{type}/{year}/{month}/*` | Factures PDF | Auth required |
| `backups/*` | Backups | Admin only |

## 4.2 Règles de Sécurité Appliquées

**Limites de Taille**:
- Images: 15 MB max
- Factures PDF: 5 MB max

**Types Acceptés**:
- Images: jpeg, png, webp
- Documents: pdf, doc, docx

**Fixes P0 Implémentés**:
- `registration_temp`: isAuthenticated() ajouté
- `temp_profiles`: isAuthenticated() ajouté
- `profile_photos`: Ownership check pour delete

---

# 5. APIS EXTERNES

## 5.1 Twilio (VoIP)

**Fichier principal**: `TwilioCallManager.ts`

| Opération | Ligne | Coût Estimé |
|-----------|-------|-------------|
| Créer appel | 773 | 0.50-2€/appel |
| Mise à jour appel | 1065 | Inclus |
| Annulation | 1783 | Inclus |
| Enregistrement | - | 0.01€/min |

**Estimation mensuelle**: 1,500 - 30,000€ (selon volume)

## 5.2 Stripe

**Fichier principal**: `StripeManager.ts`

| Opération | Ligne | Commission |
|-----------|-------|------------|
| createPaymentIntent | 433-448 | 1.4% + 0.35€ |
| capturePayment | 614-618 | Inclus |
| refundPayment | 726-805 | Frais perdus |
| Transfer manuel | 979 | 0.25€ |

**Estimation mensuelle**: 2,000 - 10,000€

## 5.3 PayPal

**Fichier principal**: `PayPalManager.ts`

| Opération | Ligne | Commission |
|-----------|-------|------------|
| createOrder | 399-621 | 2.49% + 0.49€ |
| captureOrder | 637-797 | Inclus |
| createPayout | 938-1045 | Variable |
| Webhooks | 1465-1794 | - |

**Estimation mensuelle**: 400 - 2,000€ (10-20% des transactions)

## 5.4 Translation APIs

**Fichier**: `providerTranslationService.ts`

| API | Endpoint | Coût |
|-----|----------|------|
| MyMemory | api.mymemory.translated.net | Gratuit (10k/jour) |
| LibreTranslate | libretranslate.de | Gratuit |
| Google (unofficial) | translate.googleapis.com | Gratuit (risqué) |

**Estimation mensuelle**: 0€

---

# 6. HOSTING & PERFORMANCE

## 6.1 Configuration Cache (firebase.json)

### Headers Cache Actuels

| Type | Cache-Control | Durée |
|------|---------------|-------|
| JS/CSS/Assets | `public, max-age=31536000, immutable` | 1 an |
| HTML | `no-cache, no-store, must-revalidate` | 0 |
| Sitemaps | `public, max-age=3600` | 1h |

**Status**: OPTIMAL

## 6.2 Rewrites vers Cloud Functions

| Route | Function | Coût/Appel |
|-------|----------|------------|
| `/api/**` | `api` | $0.0000004 |
| `/stripe-webhook` | `stripeWebhook` | $0.0000004 |
| `/sitemap-landing.xml` | `sitemapLanding` | $0.0000004 |
| `/sitemap-profiles.xml` | `sitemapProfiles` | $0.0000004 |
| `/sitemap-blog.xml` | `sitemapBlog` | $0.0000004 |

**Recommandation**: Générer sitemaps statiquement au build.

## 6.3 Bundle Analysis

### Dépendances Lourdes

| Package | Taille Gzipée | Usage | Action |
|---------|---------------|-------|--------|
| Recharts | 150-200 KB | 1 page admin | Lazy load |
| Firebase | 100-150 KB | Core | Tree-shake |
| Date-fns + locales | 30-40 KB | 4 fichiers | Lazy locales |
| @mui/material | 80-120 KB | UI | Verify imports |
| Stripe | 50-80 KB | Payment | Garder |
| html2canvas | 100-150 KB | UserInvoices | Déjà lazy |
| jsPDF | 100-150 KB | Factures | Déjà lazy |

### Configuration Vite Actuelle

```javascript
// vite.config.js:112 - DÉSACTIVÉ!
manualChunks(id) {
  // Tout dans vendor - non optimal
  if (id.includes('node_modules')) {
    return 'vendor';
  }
}
```

**Recommandation**:
```javascript
manualChunks(id) {
  if (id.includes('react/')) return 'react-vendor';
  if (id.includes('firebase/')) return 'firebase-vendor';
  if (id.includes('date-fns/')) return 'date-vendor';
  if (id.includes('recharts/')) return 'recharts-vendor';
  if (id.includes('node_modules')) return 'vendor';
}
```

---

# 7. SYNTHÈSE DES OPTIMISATIONS

## 7.1 Matrice Impact/Effort

```
                    EFFORT FAIBLE ←───────────────→ EFFORT ÉLEVÉ
                         │                              │
    ┌────────────────────┼──────────────────────────────┼
    │  QUICK WINS        │                              │
    │                    │                              │
    │  • Réduire         │  • Refactorer                │
I   │    scheduled       │    subscriptionService       │
M   │    fréquences      │    (4 listeners → 1)        │
P   │                    │                              │
A   │  • Supprimer       │  • Migration sitemaps        │
C   │    minInstances    │    statiques                 │
T   │                    │                              │
    │  • Ajouter limit() │  • Audit complet index       │
É   │    sitemaps.ts     │                              │
L   │                    │                              │
E   │  • Lazy load       │                              │
V   │    Recharts        │                              │
É   │                    │                              │
    │  • Réactiver       │                              │
    │    manual chunks   │                              │
    ├────────────────────┼──────────────────────────────┤
    │  LOW PRIORITY      │  LONG TERM                   │
    │                    │                              │
I   │  • Batch writes    │  • Refonte architecture      │
M   │    admin pages     │    collections               │
P   │                    │                              │
A   │  • Dynamic         │  • Migration vers            │
C   │    date-fns        │    Firestore bundles         │
T   │    locales         │                              │
    │                    │                              │
F   │                    │                              │
A   │                    │                              │
I   │                    │                              │
B   │                    │                              │
L   │                    │                              │
E   └────────────────────┴──────────────────────────────┘
```

## 7.2 Estimation des Économies

### Par Catégorie

| Catégorie | Économie Estimée | Confiance |
|-----------|------------------|-----------|
| Scheduled Functions (-80% invocations) | 30-50€/mois | Haute |
| minInstances (3→0) | 150-300€/mois | Haute |
| Firestore reads optimization | 50-100€/mois | Moyenne |
| Sitemaps statiques | 5-10€/mois | Haute |
| Bundle optimization | Indirect (UX) | Moyenne |
| **TOTAL** | **235-460€/mois** | - |

### En Pourcentage

Si facture actuelle ~1000€/mois:
- **Économie**: 23-46%
- **Objectif 40-60%**: Partiellement atteint

Pour atteindre 40-60%, actions supplémentaires nécessaires:
- Audit complet des index Firestore
- Optimisation des queries côté client
- Review des triggers Firestore (potentiel de réduction)

---

# 8. PLAN D'ACTION PRIORISÉ

## Phase 1 - Semaine 1 (QUICK WINS)

### Jour 1-2: Scheduled Functions
- [ ] `scheduled/processDLQ.ts` - schedule 5min → 30min
- [ ] `monitoring/criticalAlerts.ts` - schedule 15min → 1h
- [ ] `scheduled/checkProviderInactivity.ts` - schedule 30min → 2h

### Jour 3: Cloud Functions Config
- [ ] `productionConfigs.ts` - minInstances: 3 → 0
- [ ] Garder minInstances: 1 uniquement pour stripeWebhook

### Jour 4: Firestore Critical
- [ ] `seo/sitemaps.ts:137` - Ajouter limit(1000)
- [ ] `helpCenter.ts:240-245` - Ajouter limit()

### Jour 5: Build Config
- [ ] `vite.config.js` - Réactiver manual chunks

## Phase 2 - Semaines 2-3

### Firestore Refactoring
- [ ] `subscriptionService.ts` - Réduire 4 listeners → 1 agrégé
- [ ] Admin pages - Implémenter batch writes

### Bundle Optimization
- [ ] `FinancialAnalytics.tsx` - Lazy load Recharts
- [ ] `localeFormatters.ts` - Dynamic locale loading

## Phase 3 - Semaines 4-6

### Infrastructure
- [ ] Migration sitemaps vers génération statique (build time)
- [ ] Audit et suppression index Firestore inutilisés
- [ ] Implémentation response caching sur API endpoints

## Phase 4 - Mois 2-3

### Monitoring
- [ ] Mise en place dashboards coûts Google Cloud
- [ ] Alertes sur dépassement budgets
- [ ] Review mensuelle des métriques

---

# ANNEXES

## A. Fichiers Critiques par Priorité

### P0 (Modifier immédiatement)
1. `sos/firebase/functions/src/seo/sitemaps.ts:137`
2. `sos/src/services/subscriptionService.ts:881-941`
3. `sos/firebase/functions/src/scheduled/processDLQ.ts`
4. `sos/firebase/functions/src/monitoring/criticalAlerts.ts`
5. `sos/firebase/functions/src/config/productionConfigs.ts`

### P1 (Modifier cette semaine)
6. `sos/vite.config.js:112`
7. `sos/src/services/helpCenter.ts:240-245`
8. `sos/src/pages/admin/AdminReviews.tsx:760`

### P2 (Modifier ce mois)
9. `sos/src/components/admin/FinancialAnalytics.tsx`
10. `sos/src/utils/localeFormatters.ts`

## B. Commandes de Monitoring

```bash
# Voir invocations Cloud Functions (dernière heure)
gcloud functions logs read --limit=100 --region=europe-west1

# Voir coûts Firestore
gcloud firestore indexes composite list

# Analyser bundle
npm run analyze
```

## C. Liens Utiles

- [Firebase Pricing Calculator](https://firebase.google.com/pricing)
- [Cloud Functions Pricing](https://cloud.google.com/functions/pricing)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)

---

**FIN DU RAPPORT**

**Généré le**: 2024-12-30
**Analysé par**: Audit automatique 30 agents
**Scope**: READ-ONLY - Aucune modification du code effectuée
**Prochaine révision recommandée**: 2025-03-30 (trimestrielle)
