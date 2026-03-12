# RAPPORT D'AUDIT COMPLET — SOS-Expat Firebase Cloud Functions

**Date**: 2026-02-23
**Projet**: sos-urgently-ac307
**Auditeur**: Claude Code (Audit automatise)

---

## RESUME EXECUTIF

Le projet SOS-Expat deploie **~262 Cloud Functions** via un **fichier index.ts monolithique de 6337 lignes** contenant un seul codebase "default". Le probleme critique de saturation des quotas au deploiement est cause par :

1. **Un seul codebase** = toutes les fonctions redeployees a chaque fois
2. **~2200 lignes de code inline** dans index.ts (stripeWebhook seul = 2200 lignes)
3. **Pas de parallelisation par region** — west1 et west3 deployees simultanement
4. **Pas de separation critique/non-critique** dans le processus de deploiement
5. **Bundle de 18.2 MB** charge par chaque instance au cold start

---

## CARTOGRAPHIE DES FUNCTIONS

### Statistiques globales

| Metrique | Valeur |
|----------|--------|
| Lignes dans index.ts | 6 337 |
| Exports nommes (lignes `export`) | 212 |
| Exports via `export *` (4 modules) | 50 |
| **Total Cloud Functions estimees** | **~262** |
| Fonctions inline dans index.ts | 18 (dont stripeWebhook = 2200 lignes) |
| Regions utilisees | 2 (europe-west1, europe-west3) |
| Region planifiee non implementee | europe-west2 |

### Repartition par type

| Type | Nombre | Exemples |
|------|--------|----------|
| onCall (callable HTTPS) | ~120 | Admin, payments, subscriptions, affiliate |
| onRequest (HTTP) | ~15 | Webhooks (Stripe, PayPal, Twilio), Cloud Tasks, SEO |
| Firestore triggers | ~45 | onDocumentCreated/Updated/Deleted, consolidated triggers |
| Scheduled (cron) | ~30 | Backups, cleanup, commissions, monitoring |
| Pub/Sub / Cloud Tasks | ~8 | Payout retry, Telegram queue |
| Constants/Types exports | ~44 | Non-functions (subscription constants, types) |

### Repartition par region

| Region | Fonctions | Usage |
|--------|-----------|-------|
| europe-west1 (Belgique) | ~210 | Core business, admin, affiliate, email, monitoring |
| europe-west3 (Francfort) | ~52 | Twilio webhooks, Stripe webhook, payments, Cloud Tasks |
| europe-west2 (Londres) | 0 | **NON IMPLEMENTEE** (planifiee pour affiliate/marketing) |

### Fonctions CRITIQUES (Tier 1 — ne doivent JAMAIS etre down)

| Fonction | Region | Type | Pourquoi critique |
|----------|--------|------|-------------------|
| `twilioCallWebhook` | west3 | onRequest | Appels entrants Twilio |
| `twilioConferenceWebhook` | west3 | onRequest | Events de conference |
| `twilioAmdTwiml` | west3 | onRequest | Detection machine/humain |
| `twilioGatherResponse` | west3 | onRequest | Capture DTMF |
| `executeCallTask` | west3 | onRequest | Execution appels (Cloud Tasks) |
| `stripeWebhook` | west3 | onRequest | TOUS les events Stripe |
| `paypalWebhook` | west3 | onRequest | Events PayPal |
| `createPaymentIntent` | west3 | onCall | Creation paiements |
| `busySafetyTimeoutTask` | west3 | onRequest | Protection busy status |
| `forceEndCallTask` | west3 | onRequest | Fin forcee d'appels |

---

## AUDIT DES 10 AXES

### AXE 1 — BUNDLE SIZE & IMPORTS (Score: 5/10)

**Problemes identifies** :

| # | Probleme | Criticite | Impact |
|---|----------|-----------|--------|
| 1.1 | **index.ts = 6337 lignes monolithique** | CRITIQUE | Tout le code importe a chaque cold start |
| 1.2 | **stripeWebhook inline = 2200 lignes** | HAUTE | Impossible a maintenir, augmente le bundle |
| 1.3 | **Bundle = 18.2 MB** (index.js) | MOYENNE | Cold start +1-2s |
| 1.4 | **Sourcemap = 29.9 MB** | BASSE | Deploiement +30MB upload |
| 1.5 | Imports desactives avec stubs (ultraLogger, paymentSync, encryption) | INFO | Workaround pour eviter timeout deploy |

**Points positifs** :
- esbuild avec tree-shaking active
- 59 modules externalises (firebase-admin, googleapis, etc.)
- Lazy loading partiel de Sentry et googleapis
- Build rapide (~2-3s avec esbuild)

### AXE 2 — REGIONS & REPARTITION (Score: 4/10)

**Problemes identifies** :

| # | Probleme | Criticite | Impact |
|---|----------|-----------|--------|
| 2.1 | **europe-west2 NON IMPLEMENTEE** | HAUTE | 143 fonctions affiliate surchargent west1 |
| 2.2 | **~210 fonctions sur west1** | HAUTE | Saturation CPU au deploiement |
| 2.3 | Twilio + Stripe + payments sur MEME region (west3) | MOYENNE | Si Stripe sature, Twilio impacte |
| 2.4 | Documentation dit 3 regions, code dit 2 | BASSE | Confusion maintenance |

### AXE 3 — QUOTAS GCP (Score: 3/10)

**Problemes identifies** :

| # | Probleme | Criticite | Impact |
|---|----------|-----------|--------|
| 3.1 | **Concurrent Build CPUs sature a 100%** | CRITIQUE | Deploiement bloque ou ultra-lent |
| 3.2 | **Write requests/min Cloud Run Admin sature** | CRITIQUE | Timeout deploiement |
| 3.3 | **Total CPU allocation 20000 milli-vCPU sature** | HAUTE | Nouvelles instances bloquees |
| 3.4 | 262 fonctions = 262 Cloud Run services | HAUTE | Chaque service = 1 build |
| 3.5 | 3 regions = quotas distincts MAIS builds partages | MOYENNE | Pas d'isolation build par region |

**Note** : Firebase deploie TOUTES les fonctions du codebase meme si une seule a change, car il doit verifier les differences.

### AXE 4 — STRATEGIE DE DEPLOIEMENT (Score: 5/10)

**Problemes identifies** :

| # | Probleme | Criticite | Impact |
|---|----------|-----------|--------|
| 4.1 | **Un seul codebase "default"** | CRITIQUE | Impossible de deployer un sous-ensemble |
| 4.2 | Deploiement all-at-once = 262 services | CRITIQUE | Saturation quotas |
| 4.3 | Scripts de batch existants mais inconsistants | MOYENNE | 6+ scripts differents |
| 4.4 | Pas de blue/green deployment | MOYENNE | Downtime pendant migration |
| 4.5 | Pas de canary deployment | BASSE | Pas de validation progressive |

**Points positifs** :
- Scripts avec retry sur quota errors (180s pause)
- Detection echecs HTTPS/background
- deploy_batch.sh avec batches de 10 + retry intelligent

### AXE 5 — COLD STARTS (Score: 6/10)

**Problemes identifies** :

| # | Probleme | Criticite | Impact |
|---|----------|-----------|--------|
| 5.1 | **minInstances=0 sur la plupart** | HAUTE | Cold starts sur TOUTES les fonctions |
| 5.2 | stripeWebhook a minInstances=1 (OK) | OK | Protege |
| 5.3 | Twilio webhooks a minInstances=0 | MOYENNE | Cold start possible sur appels |
| 5.4 | Bundle 18.2 MB charge a chaque cold start | MOYENNE | +1-2s par cold start |

**Points positifs** :
- CPU fractionnel (0.25) pour reduire consommation
- minInstances=1 restaure sur stripeWebhook (fix recent)

### AXE 6 — MEMOIRE & TIMEOUT (Score: 7/10)

**Configuration type** :

| Config | Valeur | Usage |
|--------|--------|-------|
| emergencyConfig | 256MiB, CPU 0.25, max 3 | Admin callables |
| Call functions | 256-512MiB, CPU 0.25 | Twilio webhooks |
| stripeWebhook | 512MiB, CPU 0.5, max 5 | Stripe events |
| scheduledCleanup | 256MiB, CPU 0.25, max 1 | Cron jobs |

**Analyse** : Configurations raisonnables, pas de gaspillage evident. Le CPU fractionnel (0.25) est une bonne optimisation.

### AXE 7 — FIREBASE.JSON (Score: 3/10)

**Problemes identifies** :

| # | Probleme | Criticite | Impact |
|---|----------|-----------|--------|
| 7.1 | **Un seul codebase "default"** | CRITIQUE | Aucune separation possible |
| 7.2 | Pas de predeploy hooks | MOYENNE | Pas de build automatique |
| 7.3 | Pas de postdeploy hooks (health check) | MOYENNE | Pas de validation post-deploy |
| 7.4 | discoveryTimeout = 300s (5 min) | INFO | Necessaire vu la taille |

### AXE 8 — SECURITE (Score: 9/10)

| # | Constat | Score |
|---|---------|-------|
| 8.1 | Secrets centralises via Firebase Secret Manager | A+ |
| 8.2 | Zero cle API hardcodee | A+ |
| 8.3 | Firestore rules avec escalade bloquee | A |
| 8.4 | Storage rules avec validation de paths | A |
| 8.5 | XSS protection (escapeHtml) | A |
| 8.6 | Idempotency check sur webhooks | A |
| 8.7 | CORS whitelistee | A |

**Excellent** — aucun risque de securite critique identifie.

### AXE 9 — DEPENDANCES (Score: 7/10)

| Dependance | Taille | Necessaire | Note |
|------------|--------|------------|------|
| googleapis | 115 MB | Oui (Google Indexing API) | Lazy-loaded |
| @sparticuz/chromium | 64 MB | Oui (SEO rendering) | Lazy-loaded |
| puppeteer-core | 11 MB | Oui (browser automation) | Lazy-loaded |
| stripe | ~5 MB | Oui | Core business |
| twilio | ~5 MB | Oui | Core business |
| firebase-admin | ~15 MB | Oui | Core |
| zod | ~0.5 MB | Oui (v4) | Validation |

**Toutes les dependances sont utilisees**. Pas de dependance orpheline detectee.

### AXE 10 — RESILIENCE (Score: 4/10)

**Problemes identifies** :

| # | Probleme | Criticite | Impact |
|---|----------|-----------|--------|
| 10.1 | **Pas de rollback automatique** | HAUTE | Deploy rate = services down indefiniment |
| 10.2 | **Pas de health check post-deploy** | HAUTE | Pas de detection automatique de regression |
| 10.3 | **Webhooks down pendant deploy** | CRITIQUE | Paiements et appels perdus |
| 10.4 | DLQ existe pour webhooks (bon) | OK | Events retries par Stripe/PayPal |
| 10.5 | Pas d'alertes pre-deployment | MOYENNE | Pas de validation des quotas avant deploy |

**Points positifs** :
- Dead Letter Queue (DLQ) pour events webhook echoues
- Idempotency check sur stripeWebhook
- Stripe et PayPal retentent automatiquement les webhooks echoues

---

## SCORE DE SANTE GLOBAL

| Axe | Score | Status |
|-----|-------|--------|
| 1. Bundle Size & Imports | 5/10 | Ameliorable |
| 2. Regions & Repartition | 4/10 | A ameliorer |
| 3. Quotas GCP | 3/10 | CRITIQUE |
| 4. Strategie Deploiement | 5/10 | A ameliorer |
| 5. Cold Starts | 6/10 | Acceptable |
| 6. Memoire & Timeout | 7/10 | Bon |
| 7. firebase.json | 3/10 | CRITIQUE |
| 8. Securite | 9/10 | Excellent |
| 9. Dependances | 7/10 | Bon |
| 10. Resilience | 4/10 | A ameliorer |
| **MOYENNE** | **5.3/10** | **A ameliorer** |

---

## TOP 5 ACTIONS LES PLUS IMPACTANTES

1. **Splitter en codebases Firebase** (impact: quotas, deploiement, isolation)
2. **Extraire stripeWebhook dans son propre fichier** (impact: maintenabilite, bundle)
3. **Implementer deploy par batches avec health checks** (impact: zero-downtime)
4. **Ajouter minInstances=1 sur fonctions critiques Twilio** (impact: fiabilite appels)
5. **Implementer rollback automatique** (impact: resilience)

---

## PROBLEMES CLASSES PAR CRITICITE

### P0 — CRITIQUE (a resoudre immediatement)

1. Un seul codebase → saturation quotas au deploiement
2. 262 fonctions deployees simultanement
3. Webhooks (Stripe/Twilio/PayPal) down pendant deploiement
4. Pas de rollback automatique

### P1 — HAUTE (a resoudre cette semaine)

1. europe-west2 non implementee (143 fonctions affiliate)
2. stripeWebhook inline 2200 lignes dans index.ts
3. minInstances=0 sur Twilio webhooks
4. Pas de health check post-deploy
5. Scripts de deploiement inconsistants

### P2 — MOYENNE (a planifier)

1. Bundle 18.2 MB (cold start impacte)
2. Sourcemap 29.9 MB (upload lourd)
3. Stubs desactives (ultraLogger, paymentSync) = code mort
4. Documentation regions obsolete

### P3 — BASSE (nice to have)

1. Monitoring deploiement centralise
2. Dashboard quotas temps reel
3. Canary deployment
4. Blue/green deployment
