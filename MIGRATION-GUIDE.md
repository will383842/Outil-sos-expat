# GUIDE DE MIGRATION — SOS-Expat Firebase Deployment Optimization

**Date**: 2026-02-23
**Objectif**: Passer d'un deploiement monolithique a un deploiement par codebases avec zero-downtime

---

## PRE-REQUIS

- [ ] Acces administrateur au projet Firebase `sos-urgently-ac307`
- [ ] Firebase CLI installe et authentifie (`firebase login`)
- [ ] gcloud CLI installe (pour rollback Cloud Run)
- [ ] Git a jour avec la branche main propre
- [ ] Pas de deploiement en cours

---

## ETAPE 1 : EXTRACTION DU CODE INLINE (Risque: ZERO)

### 1.1 Extraire stripeWebhook

**Quoi** : Deplacer les 2200 lignes du stripeWebhook (lignes 1958-4149 de index.ts) dans un fichier dedie.

**Comment** :
1. Creer `src/webhooks/stripeWebhook.ts`
2. Copier les lignes 1958-4149 de index.ts
3. Ajouter les imports necessaires (Stripe, firebase-admin, secrets, etc.)
4. Dans index.ts, remplacer par : `export { stripeWebhook } from "./webhooks/stripeWebhook";`
5. Build et verifier que ca compile

**Validation** :
- [ ] `npm run build` reussit sans erreur
- [ ] `npm run typecheck` reussit
- [ ] Le bundle genere (`lib/index.js`) exporte toujours `stripeWebhook`

### 1.2 Extraire les autres fonctions inline

Meme processus pour :
- `executeCallTask`, `setProviderAvailableTask`, `busySafetyTimeoutTask` → `src/cloudTasks/callTasks.ts`
- `adminUpdateStatus`, `adminSoftDeleteUser`, `adminBulkUpdateStatus` → `src/admin/userManagement.ts`
- `scheduledCleanup` → `src/scheduled/scheduledCleanup.ts`
- Debug functions → `src/debug/index.ts`
- `generateInvoiceDownloadUrl` → `src/invoices/generateDownloadUrl.ts`
- `createUserDocument` → `src/auth/createUserDocument.ts`

**Validation** :
- [ ] `npm run build` reussit
- [ ] `npm run typecheck` reussit
- [ ] Toutes les fonctions sont toujours exportees

### POINT DE VALIDATION #1
```bash
# Build complet
cd sos/firebase/functions && rm -rf lib && npm run build

# Verifier que toutes les fonctions sont exportees
node -e "const m = require('./lib/index.js'); console.log('Exports:', Object.keys(m).length)"
# Doit afficher ~262
```

---

## ETAPE 2 : AJOUTER minInstances SUR FONCTIONS CRITIQUES (Risque: BAS)

### 2.1 Modifier les configurations

Dans les fichiers source des fonctions critiques, ajouter `minInstances: 1` :

| Fonction | Fichier | Config actuelle | Nouvelle config |
|----------|---------|-----------------|-----------------|
| `twilioCallWebhook` | `src/Webhooks/twilioWebhooks.ts` | minInstances: 0 | **minInstances: 1** |
| `twilioConferenceWebhook` | `src/Webhooks/TwilioConferenceWebhook.ts` | minInstances: 0 | **minInstances: 1** |
| `executeCallTask` | index.ts (inline) | minInstances: 0 | **minInstances: 1** |

Note : `stripeWebhook` a deja minInstances: 1.

### 2.2 Deployer uniquement ces fonctions

```bash
firebase deploy --only functions:twilioCallWebhook,functions:twilioConferenceWebhook,functions:executeCallTask --project sos-urgently-ac307
```

**Validation** :
- [ ] Deploiement reussi sans erreur
- [ ] `./health-check.sh` — tous les checks passent
- [ ] Verifier dans la console GCP que les instances min sont a 1

### COUT ADDITIONNEL
- ~$15-20/mois pour 3 instances min supplementaires
- Eliminne les cold starts sur les appels telephoniques

---

## ETAPE 3 : INSTALLER LES SCRIPTS (Risque: ZERO)

```bash
# Rendre les scripts executables
chmod +x sos/deploy-safe.sh
chmod +x sos/rollback.sh
chmod +x sos/health-check.sh

# Tester le health check
cd sos && ./health-check.sh

# Tester le deploy en dry-run
./deploy-safe.sh all --dry-run

# Tester le rollback en dry-run
./rollback.sh critical
```

**Validation** :
- [ ] `health-check.sh` s'execute et affiche les resultats
- [ ] `deploy-safe.sh --dry-run` s'execute sans erreur
- [ ] `rollback.sh` (sans --confirm) affiche le plan

---

## ETAPE 4 : SPLITTING EN CODEBASES (Risque: MOYEN)

### !! POINT DE NON-RETOUR !!

A partir de cette etape, le projet utilise des codebases multiples.
Revenir en arriere necessite un deploiement complet du codebase "default".

### 4.1 Comprendre le concept

Firebase codebases = plusieurs "groupes" de fonctions dans le meme projet.
Chaque codebase peut etre deploye independamment.

**IMPORTANT** : Avec un seul `source` directory, les codebases partagent le meme code compile.
La separation se fait au niveau des **exports** : chaque codebase a un `index.ts` different
qui n'exporte que ses fonctions.

### 4.2 Architecture proposee (3 codebases)

```
firebase/functions/
  src/
    index-critical.ts    → Codebase "critical" (~15 fonctions)
    index-affiliate.ts   → Codebase "affiliate" (~210 fonctions)
    index.ts             → Codebase "core" (tout le reste ~37 fonctions)
```

### 4.3 Creer les fichiers d'index

**index-critical.ts** : Exporte uniquement les webhooks et Cloud Tasks
```typescript
export { stripeWebhook } from "./webhooks/stripeWebhook";
export { twilioCallWebhook, twilioAmdTwiml, twilioGatherResponse, twilioRecordingWebhook } from "./Webhooks/twilioWebhooks";
export { twilioConferenceWebhook } from "./Webhooks/TwilioConferenceWebhook";
export { providerNoAnswerTwiML } from "./Webhooks/providerNoAnswerTwiML";
export { paypalWebhook } from "./PayPalManager";
export { executeCallTask, setProviderAvailableTask, busySafetyTimeoutTask } from "./cloudTasks/callTasks";
export { forceEndCallTask } from "./runtime/forceEndCallTask";
export { createPaymentIntent } from "./createPaymentIntent";
export { paymentWebhookWise, paymentWebhookFlutterwave } from "./payment";
```

**index-affiliate.ts** : Exporte chatter, influencer, blogger, groupAdmin
(Copier les sections 7 de index.ts.proposed)

### 4.4 Configurer esbuild pour multi-entrypoints

Modifier `esbuild.config.js` pour generer 3 bundles :
```javascript
entryPoints: {
  'index': 'src/index.ts',
  'index-critical': 'src/index-critical.ts',
  'index-affiliate': 'src/index-affiliate.ts',
}
```

### 4.5 Mettre a jour firebase.json

Copier `firebase.json.proposed` vers `firebase.json`.
Ajuster les `main` dans package.json ou creer des sous-dossiers.

### 4.6 Tester localement

```bash
# Build
npm run build

# Verifier les 3 bundles
ls -la lib/index*.js

# Tester avec l'emulateur
firebase emulators:start
```

### POINT DE VALIDATION #2
- [ ] Les 3 bundles se compilent
- [ ] L'emulateur charge les 3 codebases
- [ ] Les fonctions sont accessibles via l'emulateur

### 4.7 Deployer progressivement

```bash
# 1. D'abord le codebase "affiliate" (le moins risque)
firebase deploy --only functions --codebase affiliate --project sos-urgently-ac307

# 2. Verifier que tout fonctionne
./health-check.sh

# 3. Ensuite le codebase "core"
firebase deploy --only functions --codebase core --project sos-urgently-ac307

# 4. Verifier a nouveau
./health-check.sh

# 5. ENFIN le codebase "critical" (le plus sensible)
firebase deploy --only functions --codebase critical --project sos-urgently-ac307

# 6. Health check final
./health-check.sh
```

**Validation** :
- [ ] Codebase "affiliate" deploye sans erreur
- [ ] Codebase "core" deploye sans erreur
- [ ] Codebase "critical" deploye sans erreur
- [ ] `health-check.sh` — tous les checks passent
- [ ] Test d'un appel Twilio reel (ou webhook test)
- [ ] Test d'un paiement Stripe en mode test

---

## ETAPE 5 : IMPLEMENTATION EUROPE-WEST2 (Risque: MOYEN)

### 5.1 Ajouter la constante de region

Dans `src/configs/callRegion.ts` :
```typescript
export const AFFILIATE_FUNCTIONS_REGION = "europe-west2" as const;
```

### 5.2 Configurer les fonctions affiliate

Dans chaque fichier source (chatter, influencer, blogger, groupAdmin),
changer la region des onCall de `europe-west1` a `europe-west2`.

### 5.3 Mettre a jour le frontend

Dans le fichier `.env` du frontend :
```
VITE_FIREBASE_FUNCTIONS_REGION_AFFILIATE=europe-west2
```

Dans `firebase.ts` :
```typescript
export const functionsWest2 = getFunctions(app, "europe-west2");
```

### 5.4 Deployer

```bash
# Deployer uniquement le codebase affiliate
firebase deploy --only functions --codebase affiliate --project sos-urgently-ac307
```

**Validation** :
- [ ] Fonctions affiliate visibles dans la console GCP en europe-west2
- [ ] Frontend connecte aux fonctions west2
- [ ] Test d'inscription chatter/influencer/blogger/groupAdmin

---

## ETAPE 6 : MONITORING POST-MIGRATION

### 6.1 Verifications quotidiennes (premiere semaine)

- [ ] `./health-check.sh` chaque matin
- [ ] Verifier les logs d'erreur : `firebase functions:log --limit 100`
- [ ] Verifier les quotas GCP : Console → API & Services → Quotas
- [ ] Verifier les alertes de billing

### 6.2 Metriques a suivre

| Metrique | Avant | Apres | Cible |
|----------|-------|-------|-------|
| Temps de deploiement | 12h+ | ? | < 30min |
| Downtime webhook | Oui | ? | 0 |
| CPU quota au deploy | 100% | ? | < 50% |
| Cold start Twilio | 1-2s | ? | 0s |
| Erreurs post-deploy | Frequentes | ? | 0 |

### 6.3 En cas de probleme

1. **Webhooks down** → `./rollback.sh critical --confirm`
2. **Erreurs Firebase** → `firebase functions:log --limit 50`
3. **Quota sature** → Attendre 10 min, puis `./deploy-safe.sh critical`
4. **Erreur de build** → `cd firebase/functions && rm -rf lib node_modules && npm ci && npm run build`

---

## RESUME DES RISQUES

| Etape | Risque | Reversible | Temps |
|-------|--------|------------|-------|
| 1. Extraction code inline | ZERO | Oui (git revert) | 2-4h |
| 2. minInstances | BAS | Oui (1 deploy) | 30min |
| 3. Scripts | ZERO | N/A | 15min |
| 4. Splitting codebases | MOYEN | Oui (redeploy "default") | 4-8h |
| 5. Europe-west2 | MOYEN | Oui (changer region back) | 2-4h |
| 6. Monitoring | ZERO | N/A | Continu |

---

## CHECKLIST FINALE

- [ ] Code inline extrait dans des fichiers dedies
- [ ] minInstances=1 sur fonctions Twilio critiques
- [ ] Scripts deploy-safe.sh, rollback.sh, health-check.sh installes
- [ ] firebase.json avec codebases multiples
- [ ] Codebase "critical" isole (~15 fonctions)
- [ ] Codebase "affiliate" isole (~210 fonctions)
- [ ] Europe-west2 operationnel pour affiliate
- [ ] Health checks passes apres chaque deploiement
- [ ] Documentation mise a jour (MEMORY.md)
