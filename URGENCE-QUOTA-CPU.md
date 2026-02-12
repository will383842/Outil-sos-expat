# 🚨 URGENCE: QUOTA CPU ÉPUISÉ - SOLUTIONS IMMÉDIATES

## ❌ PROBLÈME ACTUEL
- **Quota CPU complètement épuisé en europe-west3**
- **212 services déployés** consomment tout le quota
- **Impossible de démarrer de nouvelles instances**
- **Les appels Twilio ne peuvent PAS se lancer**

## ✅ SOLUTIONS PAR ORDRE DE PRIORITÉ

### **SOLUTION 1: AUGMENTATION QUOTA GCP (2-5 jours)**

**Action requise:**
1. Aller sur https://console.cloud.google.com/iam-admin/quotas?project=sos-urgently-ac307
2. Rechercher "Cloud Run CPU allocation"
3. Filtrer région: europe-west3
4. Cliquer "EDIT QUOTAS"
5. Demander augmentation à **20 CPU** (actuellement ~2-3)
6. Justification: "Production application with 212 microservices needs higher CPU allocation"

**Délai:** 2-5 jours ouvrés
**Impact:** Résout le problème définitivement

---

### **SOLUTION 2: MIGRATION EUROPE-WEST4 (IMMÉDIAT si Docker résolu)**

**Avantage:** Quota dédié, pas de conflit
**Problème précédent:** "Docker image not found in new region"

**Pour tester:**
```bash
# Modifier callRegion.ts
export const CALL_FUNCTIONS_REGION = "europe-west4" as const;
export const PAYMENT_FUNCTIONS_REGION = "europe-west4" as const;

# Déployer
cd sos/firebase
npm run build
firebase deploy --only functions:executeCallTask --project=sos-urgently-ac307
```

Si ça marche, déployer tous les services critiques en europe-west4.

---

### **SOLUTION 3: DÉSACTIVATION TEMPORAIRE DE FONCTIONS (30 MIN)**

**Fonctions à désactiver TEMPORAIREMENT** (non-critiques pour les appels):

```bash
# Telegram (non critique pour appels)
gcloud run services delete telegramoncampaigncreated --region=europe-west3 --project=sos-urgently-ac307 --quiet
gcloud run services delete telegramoncampaignupdated --region=europe-west3 --project=sos-urgently-ac307 --quiet
gcloud run services delete telegramonpaymentreceived --region=europe-west3 --project=sos-urgently-ac307 --quiet
gcloud run services delete telegramonsubscriptioncreated --region=europe-west3 --project=sos-urgently-ac307 --quiet

# Blogger (non critique pour appels)
gcloud run services delete bloggerupdatemonthlyrankings --region=europe-west3 --project=sos-urgently-ac307 --quiet
gcloud run services delete bloggerfinalizemonthlyrankings --region=europe-west3 --project=sos-urgently-ac307 --quiet

# Backup (peut attendre)
gcloud run services delete backupfirebaseauth --region=europe-west3 --project=sos-urgently-ac307 --quiet
gcloud run services delete backupstoragetodr --region=europe-west3 --project=sos-urgently-ac307 --quiet

# Analytics (non critique)
gcloud run services delete aggregateproviderstats --region=europe-west3 --project=sos-urgently-ac307 --quiet
gcloud run services delete backfillproviderstats --region=europe-west3 --project=sos-urgently-ac307 --quiet
```

**Impact:** Libère du quota immédiatement, mais désactive temporairement des features secondaires

**Pour restaurer plus tard:**
```bash
firebase deploy --only functions:telegramOnCampaignCreated,...
```

---

### **SOLUTION 4: REDÉPLOIEMENT MASSIF VERS EUROPE-WEST1**

**Étapes:**
1. Modifier `callRegion.ts` pour mettre europe-west1
2. Redéployer TOUS les services de call/payment
3. Mettre à jour les URLs Twilio webhook

**Problème:** europe-west1 a déjà 360 services, risque d'avoir le même problème

---

## 🎯 RECOMMANDATION IMMÉDIATE

**FAIRE LES DEUX EN PARALLÈLE:**

1. **MAINTENANT:** Désactiver 10-15 fonctions non-critiques (Solution 3)
   → Libère assez de quota pour que les appels fonctionnent

2. **DEMAIN:** Demander augmentation quota GCP (Solution 1)
   → Résout le problème à long terme

---

## 📊 ÉTAT DU QUOTA ACTUEL

```
europe-west3:
- Services déployés: 212
- Quota CPU estimé: ~2-3 CPU
- Consommation: MAXIMALE
- Instances avec minScale > 0: 0 ✅
- Problème: Trop de services, même sans minScale
```

---

## ⚠️ ATTENTION

**NE PAS supprimer ces fonctions (critiques pour appels):**
- executeCallTask
- twiliocallwebhook
- twilioconferencewebhook
- twiliogatherresponse
- twilioAmdTwiml
- createpaymentintent
- providerNoAnswerTwiML
- setProviderAvailableTask

**NE PAS supprimer (critiques pour paiements):**
- stripeWebhook
- paypalWebhook
- createPaymentIntent
- getRecommendedPaymentGateway

---

## 📞 SUPPORT GCP

Si urgent, contacter le support GCP Premium:
- Phone: Vérifier dans console GCP
- Case ID: Mentionner "Production down - CPU quota exceeded"
- Priority: P1 (Critical)
