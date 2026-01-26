# PROMPT À COPIER-COLLER DANS UNE NOUVELLE SESSION CLAUDE CODE

---

## 🎯 MISSION

Tu es le **Directeur Général d'Audit** supervisant une équipe hiérarchisée de **100 agents IA spécialisés**. Ta mission est de réaliser un audit complet, minutieux et exhaustif du système d'affiliation de la plateforme **SOS Expat**.

**Objectif** : Vérifier que le système d'affiliation est 100% complet, fonctionnel, opérationnel et production-ready, sans aucune donnée mock, uniquement avec des données réelles Firestore.

---

## 📋 ORGANISATION DES 100 AGENTS IA

Organise ton travail en simulant 100 agents répartis ainsi :

### COMMANDEMENT (5 agents)
- **Agent #1** : Général en Chef - Synthèse finale
- **Agent #2** : Général Backend - Supervise 25 agents backend
- **Agent #3** : Général Frontend - Supervise 25 agents frontend
- **Agent #4** : Général Intégration - Supervise 20 agents intégration
- **Agent #5** : Général Qualité - Supervise 25 agents QA/Sécurité

### DIVISIONS (95 agents)
- **Division Backend** (25 agents) : Triggers, Services, Wise, Callable, Scheduled
- **Division Frontend Admin** (25 agents) : Dashboard, Affiliés, Commissions, Payouts, Config, Rapports, Fraude
- **Division Frontend User** (25 agents) : Dashboard, Gains, Filleuls, Retrait, Banque, Outils
- **Division Intégration** (20 agents) : Flux de données, Cohérence, Tracking complet

---

## 📁 FICHIERS À AUDITER

### BACKEND
```
sos/firebase/functions/src/affiliate/
├── index.ts
├── triggers/ (onUserCreated.ts, onCallCompleted.ts, onSubscriptionEvent.ts)
├── services/ (commissionService.ts, commissionCalculator.ts, payoutService.ts, fraudDetectionService.ts)
├── wise/ (wiseClient.ts, wiseRecipientService.ts, wiseQuoteService.ts, wiseTransferService.ts)
├── webhooks/ (wiseWebhook.ts)
├── callable/ (getMyAffiliateData.ts, requestPayout.ts, updateBankDetails.ts, etc.)
├── scheduled/ (releaseHeldCommissions.ts)
└── utils/
```

### FRONTEND ADMIN
```
sos/src/pages/admin/
├── AdminAffiliateDashboard.tsx
├── AdminAffiliatesList.tsx
├── AdminAffiliateDetail.tsx
├── AdminAffiliateConfig.tsx
├── AdminCommissionRules.tsx
├── AdminAffiliateCommissions.tsx
├── AdminAffiliatePayouts.tsx
├── AdminAffiliateReports.tsx
└── AdminAffiliateFraudAlerts.tsx
```

### FRONTEND USER
```
sos/src/pages/Affiliate/
├── AffiliateDashboard.tsx
├── AffiliateEarnings.tsx
├── AffiliateReferrals.tsx
├── AffiliateWithdraw.tsx
├── AffiliateBankDetails.tsx
└── AffiliateTools.tsx
```

### AUTRES FICHIERS CRITIQUES
```
sos/src/types/affiliate.ts
sos/src/hooks/useAffiliate.ts
sos/src/config/adminMenu.ts
sos/src/components/admin/AdminRoutesV2.tsx
sos/src/App.tsx
sos/src/multilingual-system/core/routing/localeRoutes.ts
sos/src/helper/fr.json (traductions affiliate.*)
sos/src/helper/en.json (traductions affiliate.*)
```

---

## 🔍 POINTS DE VÉRIFICATION OBLIGATOIRES

### 1. ABSENCE DE DONNÉES MOCK
```bash
# Exécuter ces recherches
grep -rn "mock\|Mock\|MOCK\|fake\|Fake\|dummy\|hardcoded\|static data" sos/src/pages/admin/Admin*Affiliate*
grep -rn "mock\|Mock\|MOCK\|fake\|Fake\|dummy" sos/src/pages/Affiliate/
grep -rn "mock\|Mock\|MOCK" sos/firebase/functions/src/affiliate/
```
**Critère** : ZÉRO résultat = ✅ OK

### 2. UTILISATION FIRESTORE RÉEL
```bash
grep -rn "getFirestore\|collection\|doc\|getDoc\|getDocs\|setDoc\|updateDoc" sos/src/pages/admin/Admin*Affiliate*
grep -rn "httpsCallable\|getFunctions" sos/src/pages/Affiliate/
```
**Critère** : Tous les composants utilisent Firestore/Functions = ✅ OK

### 3. TYPESCRIPT SANS ERREURS
```bash
cd sos && npx tsc --noEmit 2>&1 | grep -i affiliate
```
**Critère** : ZÉRO erreur TypeScript = ✅ OK

### 4. TRACKING COMPLET - PARCOURS À VALIDER

#### Parcours A : Inscription avec code affilié
1. ✅ URL `?ref=CODE` capturée dans le frontend
2. ✅ Code stocké dans localStorage ou cookie
3. ✅ `onUserCreated.ts` déclenché à la création du user
4. ✅ `referredBy` et `capturedRates` sauvegardés dans Firestore
5. ✅ Commission signup créée si applicable

#### Parcours B : Commission sur appel
1. ✅ `onCallCompleted.ts` déclenché
2. ✅ `commissionCalculator.ts` utilise `capturedRates` (taux gelés)
3. ✅ Commission créée avec statut "pending" (période de rétention)
4. ✅ `releaseHeldCommissions.ts` libère après délai

#### Parcours C : Commission sur abonnement
1. ✅ `onSubscriptionEvent.ts` déclenché par webhook Stripe
2. ✅ Commission calculée avec `capturedRates`
3. ✅ Gestion renewal et cancellation

#### Parcours D : Retrait (Payout)
1. ✅ Vérification seuil minimum
2. ✅ Vérification coordonnées bancaires présentes
3. ✅ Création demande de payout
4. ✅ Approbation admin
5. ✅ Exécution transfert Wise
6. ✅ Webhook Wise met à jour le statut
7. ✅ Restauration solde si échec

### 5. SÉCURITÉ
- ✅ Toutes les fonctions callable vérifient l'authentification
- ✅ Les fonctions admin vérifient `context.auth.token.admin === true`
- ✅ Données bancaires chiffrées
- ✅ Pas de secrets en dur dans le code
- ✅ Pas de `console.log` avec données sensibles

### 6. ROUTES ET NAVIGATION
- ✅ Routes admin dans `AdminRoutesV2.tsx`
- ✅ Menu admin dans `adminMenu.ts`
- ✅ Routes user dans `App.tsx`
- ✅ Routes traduites dans `localeRoutes.ts`

### 7. TRADUCTIONS
- ✅ Clés `affiliate.*` dans fr.json et en.json
- ✅ Clés `admin.menu.affiliate*` dans les fichiers admin.json

---

## 📊 FORMAT DU RAPPORT FINAL

Génère le rapport dans le fichier : **`RAPPORT_AUDIT_AFFILIATION_COMPLET.md`**

### Structure attendue :

```markdown
# RAPPORT D'AUDIT - SYSTÈME AFFILIATION SOS EXPAT
## Date : [DATE]

---

## SCORE GLOBAL

| Catégorie | Score | Statut |
|-----------|-------|--------|
| Backend | /100 | 🟢/🟡/🔴 |
| Frontend Admin | /100 | 🟢/🟡/🔴 |
| Frontend User | /100 | 🟢/🟡/🔴 |
| Intégration/Tracking | /100 | 🟢/🟡/🔴 |
| Sécurité | /100 | 🟢/🟡/🔴 |
| **TOTAL** | **/100** | |

🟢 >85% | 🟡 60-85% | 🔴 <60%

---

## ✅ POINTS POSITIFS
[Liste détaillée des forces du système]

---

## ❌ POINTS NÉGATIFS

### CRITIQUES (🔴 Bloquants)
| Fichier | Ligne | Problème | Solution |
|---------|-------|----------|----------|

### MAJEURS (🟡 À corriger)
| Fichier | Ligne | Problème | Solution |
|---------|-------|----------|----------|

### MINEURS (🟢 Optimisations)
| Fichier | Ligne | Problème | Solution |
|---------|-------|----------|----------|

---

## VÉRIFICATION MOCK VS RÉEL

| Composant | Mock | Firestore Réel | Statut |
|-----------|------|----------------|--------|

---

## VALIDATION TRACKING

| Parcours | Étapes | Validé | Notes |
|----------|--------|--------|-------|

---

## RECOMMANDATIONS

### Priorité 1 (Avant production)
1. ...

### Priorité 2 (Sprint suivant)
1. ...

### Priorité 3 (Backlog)
1. ...

---

## CHECKLIST PRÉ-PRODUCTION

- [ ] WISE_API_KEY dans Secret Manager
- [ ] WISE_WEBHOOK_SECRET configuré
- [ ] Index Firestore créés
- [ ] TypeScript 0 erreurs
- [ ] Tests passent

---

## VERDICT FINAL

🟢 PRODUCTION READY / 🟡 CORRECTIONS REQUISES / 🔴 NON PRÊT

Prochaines étapes :
1. ...
2. ...
3. ...
```

---

## 🚀 INSTRUCTIONS

1. **Lis tous les fichiers** listés ci-dessus
2. **Exécute les commandes** de vérification
3. **Trace les parcours** de tracking complets
4. **Identifie** tous les points positifs et négatifs
5. **Génère le rapport** dans `RAPPORT_AUDIT_AFFILIATION_COMPLET.md`

**IMPORTANT** :
- Sois exhaustif et minutieux
- Chaque agent de ta hiérarchie doit contribuer
- Ne présume rien, vérifie tout dans le code
- Le rapport doit être actionnable avec des solutions concrètes

---

**COMMENCE L'AUDIT MAINTENANT**
