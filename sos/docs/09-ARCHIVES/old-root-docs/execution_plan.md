# PLAN D'EXÉCUTION — DÉPLOIEMENT FIREBASE SOS-EXPAT

## Date: 2026-02-23
## Projet: sos-urgently-ac307

---

## ÉTAT ACTUEL
- **734 fonctions déployées** en production
- **7 fonctions réelles à déployer** (toutes dans monitoring/functionalMonitoring.ts)
- **32 exports auxiliaires** dans le bundle (PAS des Cloud Functions — nettoyage recommandé)
- **2 fonctions zombies** en prod (calculateTax, checkReverseCharge — pas urgentes)
- **0 conflit de type** détecté
- **Build : OK** (0 erreurs TypeScript)

---

## ÉTAPE 1 — DÉPLOIEMENT DES 7 FONCTIONS MANQUANTES

### Lot 1 : europe-west1 (4 callables)
```bash
cd sos/firebase && firebase deploy --only functions:getFunctionalAlerts,functions:getFunctionalHealthSummary,functions:resolveFunctionalAlert,functions:triggerFunctionalCheck --project sos-urgently-ac307
```

### Lot 2 : europe-west3 (3 scheduled) — après 90s de pause
```bash
cd sos/firebase && firebase deploy --only functions:cleanupFunctionalData,functions:runCriticalFunctionalCheck,functions:runFunctionalHealthCheck --project sos-urgently-ac307
```

---

## ÉTAPE 2 — NETTOYAGE DES EXPORTS AUXILIAIRES (RECOMMANDÉ)

Les 32 fonctions auxiliaires suivantes sont exportées dans `index.ts` mais ne sont PAS des Cloud Functions.
Firebase CLI les ignore au déploiement, mais elles alourdissent le bundle (17.4 MB).

### Fonctions à retirer de index.ts :
- awardBloggerRecruitmentCommission
- checkBloggerClientReferral
- checkBloggerProviderRecruitment
- cleanupExpiredVatCache
- deactivateExpiredRecruitments
- getPendingTransfersStats
- getUrlIndexingStatus
- handleInvoicePaid, handleInvoicePaymentFailed
- handleSubscriptionCreated, handleSubscriptionDeleted, handleSubscriptionUpdated
- handleTrialWillEnd
- initializeInfluencerConfig
- invalidateCache, invalidateVatCache
- logAdminAction, logServiceConnection
- onPayPalConnected
- pingCustomSitemap, pingSitemap
- processPendingTransfersForProvider
- retryFailedTransfersForProvider
- sendPaymentNotifications (à vérifier)
- stopAutorespondersForUser
- submitBatchToGoogleIndexing, submitSingleUrl, submitToGoogleIndexing, submitToIndexNow
- validateFullVatNumber, validateMultipleVatNumbers, validateVatNumber
- webhookHandlers

**Action** : Retirer ces exports de `index.ts` puis rebuild.

---

## ÉTAPE 3 — SUPPRESSION DES ZOMBIES (OPTIONNEL)

```bash
firebase functions:delete calculateTax --region europe-west1 --project sos-urgently-ac307 --force
firebase functions:delete checkReverseCharge --region europe-west1 --project sos-urgently-ac307 --force
```

---

## ÉTAPE 4 — VÉRIFICATION POST-DÉPLOIEMENT

1. `firebase functions:list --project sos-urgently-ac307` — vérifier que les 7 nouvelles fonctions sont ACTIVE
2. Vérifier fonctions critiques :
   - executeCallTask ✓
   - stripeWebhook ✓
   - paypalWebhook ✓
   - twilioCallWebhook ✓
   - twilioConferenceWebhook ✓
   - createPaymentIntent ✓
   - morningBackup ✓

---

## ESTIMATION
- Durée totale : ~5 minutes (2 lots de déploiement + vérification)
- Risque : **TRÈS FAIBLE** — aucune suppression nécessaire, aucun conflit de type
- Les fonctions critiques ne sont PAS touchées

---

## RÉSUMÉ
La situation est beaucoup plus saine que prévu :
- 734/741 fonctions cibles sont déjà déployées (99%)
- Seulement 7 nouvelles fonctions à ajouter (monitoring)
- Aucun conflit bloquant
- Le problème `chatterNotifyTeamMemberActivated` est DÉJÀ RÉSOLU
