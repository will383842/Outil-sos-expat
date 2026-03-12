# PLAN D'ACTION — Resolution Deploiement Firebase SOS-Expat

**Date**: 2026-02-23
**Objectif**: Zero-downtime deployment avec isolation des services critiques

---

## PRIORITE 1 — SPLITTING EN CODEBASES (Impact: MAXIMAL)

### Pourquoi c'est la solution #1

Firebase supporte les **codebases multiples** dans firebase.json. Chaque codebase :
- A son propre `source` directory et `package.json`
- Est deploye **independamment** des autres
- Ne sature pas les quotas des autres codebases
- Peut avoir son propre runtime et configuration

### Plan de splitting propose

| Codebase | Fonctions | Region | Fichier d'entree |
|----------|-----------|--------|-------------------|
| **critical** | Twilio webhooks (9) + Stripe webhook (1) + PayPal webhook (1) + Cloud Tasks (4) | west3 | `src/critical/index.ts` |
| **payments** | Payment callables (27) + payment triggers (3) + payout tasks (5) | west3 | `src/payments/index.ts` |
| **admin** | Admin callables (14) + provider actions (15) + backup/restore (11) + validation (9) | west1 | `src/admin-codebase/index.ts` |
| **affiliate** | Chatter (65) + Influencer (45) + Blogger (50) + GroupAdmin (50) + commissions (2) | west1→west2 | `src/affiliate/index.ts` |
| **triggers** | Consolidated triggers (3) + individual triggers (15) + SEO triggers (10) | west1/west3 | `src/triggers-codebase/index.ts` |
| **scheduled** | Cron jobs (30) + monitoring (15) + cleanup (5) | west1 | `src/scheduled-codebase/index.ts` |
| **notifications** | Notification pipeline (1) + email marketing (15) + Telegram (25) | west1 | `src/notifications/index.ts` |
| **api** | Auth (4) + subscription (25) + SEO endpoints (10) + misc callables (30) | west1 | `src/api/index.ts` |

### Risques

| Risque | Mitigation |
|--------|------------|
| Imports croises entre codebases | Shared library dans `src/lib/` |
| Secrets partages | Chaque codebase declare ses propres secrets |
| Duplication de code | `src/shared/` avec utilitaires communs |
| Rollback partiel impossible | Versionner chaque codebase independamment |

### Alternative SIMPLIFIEE (recommandee pour debut)

Au lieu de 8 codebases, commencer par **3** :

| Codebase | Contenu | Quand deployer |
|----------|---------|----------------|
| **critical** | Twilio + Stripe + PayPal + Cloud Tasks (~15 fonctions) | Rarement, avec precautions maximales |
| **affiliate** | Chatter + Influencer + Blogger + GroupAdmin (~210 fonctions) | Frequemment, sans risque |
| **core** | Tout le reste (~37 fonctions) | Moderement |

---

## PRIORITE 2 — DEPLOIEMENT PAR BATCHES AVEC HEALTH CHECK

### Strategie

1. **Pre-deploy** : Verifier sante des services critiques
2. **Deploy affiliate** en premier (non-critique)
3. **Attendre 60s** + verifier quotas
4. **Deploy core**
5. **Attendre 60s** + verifier quotas
6. **Deploy critical** en DERNIER, une fonction a la fois
7. **Post-deploy** : Health check complet

### Script : `deploy-safe.sh` (voir livrable)

---

## PRIORITE 3 — EXTRACTION DU STRIPE WEBHOOK

### Probleme actuel

Le `stripeWebhook` occupe les lignes 1958-4149 de index.ts = **2200 lignes inline**.
C'est impossible a maintenir et augmente inutilement le bundle pour toutes les fonctions.

### Solution

Extraire dans `src/webhooks/stripeWebhook.ts` et re-exporter :
```typescript
// index.ts (apres extraction)
export { stripeWebhook } from './webhooks/stripeWebhook';
```

### Impact
- Meilleure maintenabilite
- Possibilite de mettre dans le codebase "critical"
- Reduction de la taille d'index.ts de 35%

---

## PRIORITE 4 — MININSTANCES SUR FONCTIONS CRITIQUES

### Configuration recommandee

| Fonction | minInstances actuel | Recommande | Cout/mois |
|----------|---------------------|------------|-----------|
| stripeWebhook | 1 | 1 | ~$5 |
| twilioCallWebhook | 0 | 1 | ~$5 |
| twilioConferenceWebhook | 0 | 1 | ~$5 |
| executeCallTask | 0 | 1 | ~$5 |
| **Total** | | | **~$20/mois** |

### Justification
Un cold start sur un webhook Twilio = appel perdu = client insatisfait.
$20/mois est negligeable vs le cout d'un appel rate.

---

## PRIORITE 5 — IMPLEMENTATION EUROPE-WEST2

### Plan

1. Ajouter `AFFILIATE_FUNCTIONS_REGION = "europe-west2"` dans `callRegion.ts`
2. Configurer les fonctions affiliate (chatter, influencer, blogger, groupAdmin) sur west2
3. Mettre a jour le frontend (.env + firebase.ts) pour pointer vers west2
4. Deployer progressivement (1 module a la fois)

### Impact
- Reduit la charge de west1 de 210 → ~70 fonctions
- Isole le marketing/affiliate qui peut avoir des pics de trafic
- Protege les fonctions core business

---

## PRIORITE 6 — HEALTH CHECK & ROLLBACK

### Health check automatique
Verifier apres chaque deploiement :
- Stripe webhook repond (HTTP 200)
- Twilio webhooks repondent
- Cloud Tasks queue active
- Pas d'erreurs dans les logs (derniere minute)

### Rollback
- `firebase functions:delete` + redeploy version precedente
- Script `rollback.sh` avec versioning automatique

---

## CALENDRIER DE MISE EN OEUVRE

| Semaine | Action | Risque | Duree |
|---------|--------|--------|-------|
| S1 | Extraire stripeWebhook en fichier separe | ZERO | 2h |
| S1 | Ajouter minInstances=1 sur Twilio webhooks | ZERO | 30min |
| S1 | Creer deploy-safe.sh avec health checks | ZERO | 3h |
| S2 | Splitter index.ts en 3 codebases (critical/affiliate/core) | MOYEN | 8h |
| S2 | Mettre a jour firebase.json | MOYEN | 1h |
| S2 | Tester deploiement par codebase sur emulateur | ZERO | 2h |
| S3 | Deployer codebase "affiliate" seul (test prod) | BAS | 1h |
| S3 | Deployer codebase "core" (test prod) | BAS | 1h |
| S3 | Deployer codebase "critical" (test prod) | MOYEN | 2h |
| S4 | Implementer europe-west2 pour affiliate | MOYEN | 4h |
| S4 | Health check + rollback automatiques | BAS | 3h |

---

## POINTS DE NON-RETOUR

1. **Splitting en codebases** : Une fois deploye avec des codebases separees, revenir a un seul codebase necessite un deploiement complet
2. **Migration west2** : Les URLs Twilio/Stripe sont configurees par region — changer de region = mettre a jour les dashboards externes
3. **minInstances** : Ajouter minInstances augmente les couts mensuels (mais reversible en 1 deploy)

---

## METRIQUES DE SUCCES

| Metrique | Avant | Objectif |
|----------|-------|----------|
| Temps de deploiement total | 12h+ (147 batches) | < 30min |
| Downtime webhook pendant deploy | Oui | ZERO |
| Quotas CPU au deploy | 100% sature | < 50% |
| Cold start Twilio webhook | 1-2s possible | 0s (minInstances=1) |
| Nombre de fonctions par deploy | 262 | 15-210 (par codebase) |
