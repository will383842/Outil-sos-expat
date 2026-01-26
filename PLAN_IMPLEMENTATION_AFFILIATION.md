# PLAN D'IMPLÉMENTATION COMPLET
# SYSTÈME D'AFFILIATION SOS-EXPAT

**Date :** 26 janvier 2026
**Statut :** Prêt pour implémentation
**Complexité :** MOYENNE-HAUTE
**Estimation :** 3-5 jours de travail intensif avec Claude

---

## ESTIMATION TEMPS & COMPLEXITÉ

### Complexité du Projet

| Aspect | Niveau | Justification |
|--------|--------|---------------|
| Backend (Cloud Functions) | 🟠 MOYEN-HAUT | 15-20 fonctions à créer, intégration Wise |
| Base de données | 🟢 MOYEN | 3 nouvelles collections, modification users |
| Frontend User | 🟢 MOYEN | 6 pages, composants réutilisables |
| Frontend Admin | 🟠 MOYEN-HAUT | 7 pages complexes avec graphiques |
| Intégration Wise | 🟠 MOYEN | API externe, webhooks |
| Sécurité | 🔴 CRITIQUE | Chiffrement, règles Firestore, anti-fraude |

### Estimation Temps

| Phase | Durée estimée |
|-------|---------------|
| Phase 1 : Infrastructure & Sécurité | 2-3 heures |
| Phase 2 : Backend Core | 4-6 heures |
| Phase 3 : Intégration Wise | 2-3 heures |
| Phase 4 : Frontend User | 3-4 heures |
| Phase 5 : Console Admin | 4-5 heures |
| Phase 6 : Notifications | 1-2 heures |
| Phase 7 : Tests & Finalisation | 2-3 heures |
| **TOTAL** | **18-26 heures** |

**En sessions avec Claude :** 3-5 jours (sessions de 4-6h)

### Verdict : Projet MOYEN-LOURD

- Ce n'est **PAS un petit projet** - c'est un module complet
- Beaucoup de fichiers à créer (40+)
- Intégration avec système existant complexe
- Mais **architecture bien définie** = implémentation structurée

---

## POINTS CRITIQUES À RÉSOUDRE EN PREMIER

### P0 - BLOQUANTS (à faire en premier)

| # | Point Critique | Impact | Solution |
|---|----------------|--------|----------|
| 1 | **Chiffrement coordonnées bancaires** | Sécurité RGPD | Créer service encryption AES-256 |
| 2 | **Protection champs Firestore** | Fraude possible | Ajouter dans firestore.rules |
| 3 | **Trigger robuste** | Race condition | Utiliser onDocumentCreated pas Auth trigger |
| 4 | **Structure config admin** | Tout doit être configurable | Collection affiliate_config complète |

### P1 - IMPORTANTS

| # | Point Critique | Impact | Solution |
|---|----------------|--------|----------|
| 5 | Commissions fixes + pourcentages | Flexibilité | Type enum dans commission |
| 6 | Multi-actions (pas que appels) | Couverture | Triggers sur inscriptions, abonnements |
| 7 | Anti-fraude basique | Abus | Détection IP, patterns |
| 8 | Taux figé à vie | Business rule | capturedRates dans user |

---

## PHASE 1 : INFRASTRUCTURE & SÉCURITÉ
**Durée estimée : 2-3 heures**

### 1.1 Types TypeScript

**Fichiers à créer :**
```
sos/firebase/functions/src/affiliate/types.ts
sos/src/types/affiliate.ts
```

**Tâches :**
- [ ] Interface `AffiliateConfig` (config admin)
- [ ] Interface `AffiliateCommission` (commissions)
- [ ] Interface `AffiliatePayout` (retraits)
- [ ] Interface `UserAffiliateFields` (champs user)
- [ ] Interface `CommissionRule` (règles par action)
- [ ] Types enum : CommissionType, CommissionStatus, PayoutStatus

### 1.2 Service de Chiffrement

**Fichier à créer :**
```
sos/firebase/functions/src/affiliate/utils/encryption.ts
```

**Tâches :**
- [ ] Fonction `encrypt(text: string): string`
- [ ] Fonction `decrypt(text: string): string`
- [ ] Utilisation AES-256-CBC
- [ ] Clé dans Firebase Secret Manager

### 1.3 Collection affiliate_config

**Firestore :**
```
Collection: affiliate_config
Document: current
```

**Tâches :**
- [ ] Structure complète avec tous les paramètres configurables
- [ ] Taux par défaut (inscription, appels, abonnements)
- [ ] Règles par action (6 types)
- [ ] Paramètres retrait (minimum, délai, limites)
- [ ] Paramètres anti-fraude
- [ ] Historique des modifications

### 1.4 Règles Firestore

**Fichier à modifier :**
```
sos/firestore.rules
```

**Tâches :**
- [ ] Règles pour `affiliate_config` (admin only write, authenticated read)
- [ ] Règles pour `affiliate_commissions` (owner read, CF write)
- [ ] Règles pour `affiliate_payouts` (owner read, CF write)
- [ ] Protection champs users (affiliateCode, referredBy, capturedRates, balances)

### 1.5 Index Firestore

**Fichier à modifier :**
```
sos/firebase/firestore.indexes.json
```

**Tâches :**
- [ ] Index `affiliate_commissions` : referrerId + status + createdAt
- [ ] Index `affiliate_commissions` : referrerId + type + createdAt
- [ ] Index `affiliate_commissions` : refereeId + createdAt
- [ ] Index `affiliate_payouts` : userId + requestedAt
- [ ] Index `affiliate_payouts` : status + requestedAt
- [ ] Index `users` : referredBy + createdAt

---

## PHASE 2 : BACKEND CORE
**Durée estimée : 4-6 heures**

### 2.1 Utilitaires

**Fichier à créer :**
```
sos/firebase/functions/src/affiliate/utils/index.ts
```

**Tâches :**
- [ ] `generateAffiliateCode(email, firstName)` - Génère code unique
- [ ] `resolveAffiliateCode(code)` - Résout code → userId
- [ ] `getAffiliateConfig()` - Récupère config (avec cache)
- [ ] `formatAmount(cents, currency)` - Formatte montant
- [ ] `calculateCommission(rule, baseAmount)` - Calcule commission (fixe/%)

### 2.2 Trigger Setup Affilié

**Fichier à créer :**
```
sos/firebase/functions/src/affiliate/triggers/onUserCreated.ts
```

**Tâches :**
- [ ] Trigger `onDocumentCreated` sur `users/{uid}`
- [ ] Générer code affilié unique
- [ ] Résoudre parrain si `pendingReferralCode`
- [ ] Capturer taux actuels (figés à vie)
- [ ] Initialiser balances à 0
- [ ] Incrémenter `referralCount` du parrain
- [ ] Créer commission "signup" si activée
- [ ] Notifier le parrain

### 2.3 Service de Commission

**Fichier à créer :**
```
sos/firebase/functions/src/affiliate/services/commissionService.ts
```

**Tâches :**
- [ ] `createCommission(type, referrerId, refereeId, sourceData)` - Création générique
- [ ] Support types : signup, first_call, recurring_call, subscription, renewal, provider_bonus
- [ ] Calcul fixe / pourcentage / hybride
- [ ] Gestion holdPeriod (pending → available)
- [ ] Transaction atomique (commission + balance update)
- [ ] Anti-doublon (vérification sourceId)

### 2.4 Trigger Commission Appel

**Fichier à créer :**
```
sos/firebase/functions/src/affiliate/triggers/onCallCompleted.ts
```

**Tâches :**
- [ ] Trigger sur mise à jour `call_sessions` (status = completed)
- [ ] Vérifier durée ≥ minCallDuration
- [ ] Récupérer client → referredBy
- [ ] Distinguer 1er appel vs récurrent
- [ ] Appeler `createCommission()`

**Fichier à modifier :**
```
sos/firebase/functions/src/index.ts
```

**Tâches :**
- [ ] Exporter le nouveau trigger

### 2.5 Trigger Commission Abonnement

**Fichier à créer :**
```
sos/firebase/functions/src/affiliate/triggers/onSubscriptionCreated.ts
```

**Tâches :**
- [ ] Trigger sur création `subscriptions`
- [ ] Vérifier si filleul a un parrain
- [ ] Créer commission "subscription"

### 2.6 Trigger Commission Renouvellement

**Fichier à créer :**
```
sos/firebase/functions/src/affiliate/triggers/onSubscriptionRenewed.ts
```

**Tâches :**
- [ ] Trigger sur webhook Stripe `invoice.payment_succeeded`
- [ ] Vérifier si renouvellement (pas première facture)
- [ ] Vérifier limite durée (maxMonths)
- [ ] Créer commission "renewal"

### 2.7 Scheduled : Libération Commissions

**Fichier à créer :**
```
sos/firebase/functions/src/affiliate/scheduled/releaseHeldCommissions.ts
```

**Tâches :**
- [ ] Scheduled function (toutes les heures)
- [ ] Query commissions status=pending où availableAt < now
- [ ] Passer en status=available
- [ ] Mettre à jour availableBalance user

### 2.8 Callable : Données Utilisateur

**Fichier à créer :**
```
sos/firebase/functions/src/affiliate/callables/getMyAffiliateData.ts
```

**Tâches :**
- [ ] Retourner données affilié de l'utilisateur connecté
- [ ] Stats, balances, taux capturés
- [ ] Liste dernières commissions
- [ ] Statut payout en cours

### 2.9 Callable : Mise à jour Coordonnées Bancaires

**Fichier à créer :**
```
sos/firebase/functions/src/affiliate/callables/updateBankDetails.ts
```

**Tâches :**
- [ ] Validation des coordonnées (IBAN, Sort Code, ABA)
- [ ] Chiffrement avant stockage
- [ ] Mise à jour document user

---

## PHASE 3 : INTÉGRATION WISE
**Durée estimée : 2-3 heures**

### 3.1 Client API Wise

**Fichier à créer :**
```
sos/firebase/functions/src/affiliate/services/wise/client.ts
```

**Tâches :**
- [ ] Configuration axios avec token
- [ ] Gestion sandbox/production
- [ ] Profile ID depuis config

### 3.2 Service Wise

**Fichiers à créer :**
```
sos/firebase/functions/src/affiliate/services/wise/recipient.ts
sos/firebase/functions/src/affiliate/services/wise/quote.ts
sos/firebase/functions/src/affiliate/services/wise/transfer.ts
```

**Tâches :**
- [ ] `createRecipient(bankDetails)` - Créer bénéficiaire
- [ ] `createQuote(amount, sourceCurrency, targetCurrency)` - Devis
- [ ] `createTransfer(quoteId, recipientId, reference)` - Transfert
- [ ] `fundTransfer(transferId)` - Financer depuis balance

### 3.3 Callable : Demande de Retrait

**Fichier à créer :**
```
sos/firebase/functions/src/affiliate/callables/requestWithdrawal.ts
```

**Tâches :**
- [ ] Vérifier authentification
- [ ] Vérifier balance ≥ minimum
- [ ] Vérifier coordonnées bancaires présentes
- [ ] Vérifier pas de payout en cours
- [ ] Transaction : créer payout + marquer commissions + MAJ user
- [ ] Déclencher traitement Wise async

### 3.4 Traitement Payout Wise

**Fichier à créer :**
```
sos/firebase/functions/src/affiliate/services/processWisePayout.ts
```

**Tâches :**
- [ ] Récupérer payout et user
- [ ] Déchiffrer coordonnées bancaires
- [ ] Créer recipient Wise
- [ ] Créer quote
- [ ] Créer et financer transfer
- [ ] Mettre à jour payout (wiseTransferId, status)
- [ ] Gestion erreurs → restaurer commissions

### 3.5 Webhook Wise

**Fichier à créer :**
```
sos/firebase/functions/src/affiliate/webhooks/wiseWebhook.ts
```

**Tâches :**
- [ ] Endpoint HTTP POST
- [ ] Vérification signature (TODO)
- [ ] Gestion event `transfers#state-change`
- [ ] Status `outgoing_payment_sent` → payout paid
- [ ] Status `cancelled`/`funds_refunded` → restaurer commissions

---

## PHASE 4 : FRONTEND UTILISATEUR
**Durée estimée : 3-4 heures**

### 4.1 Hook useAffiliate

**Fichier à créer :**
```
sos/src/hooks/useAffiliate.ts
```

**Tâches :**
- [ ] Récupérer données affilié temps réel
- [ ] Récupérer commissions
- [ ] Récupérer payouts
- [ ] Fonctions : requestWithdrawal, updateBankDetails

### 4.2 Page Dashboard Affiliation

**Fichier à créer :**
```
sos/src/pages/dashboard/affiliate/AffiliateDashboard.tsx
```

**Tâches :**
- [ ] Header avec lien de partage + bouton copier
- [ ] Tirelire visuelle (total, disponible, en attente, retiré)
- [ ] Bouton retrait (conditionnel)
- [ ] Mes taux de commission (figés à vie)
- [ ] Stats rapides (filleuls, commissions, ce mois)
- [ ] Dernières commissions
- [ ] Navigation vers sous-pages

### 4.3 Page Historique des Gains

**Fichier à créer :**
```
sos/src/pages/dashboard/affiliate/AffiliateEarnings.tsx
```

**Tâches :**
- [ ] Filtres (type, status, dates)
- [ ] Résumé filtré
- [ ] Tableau détaillé avec pagination
- [ ] Export CSV

### 4.4 Page Mes Filleuls

**Fichier à créer :**
```
sos/src/pages/dashboard/affiliate/AffiliateReferrals.tsx
```

**Tâches :**
- [ ] Liste des filleuls
- [ ] Activité par filleul (appels, abonnements)
- [ ] Date inscription
- [ ] Gains générés par filleul

### 4.5 Page Retraits

**Fichier à créer :**
```
sos/src/pages/dashboard/affiliate/AffiliateWithdraw.tsx
```

**Tâches :**
- [ ] Formulaire de demande de retrait
- [ ] Affichage payout en cours
- [ ] Historique des retraits
- [ ] Statuts (pending, processing, completed, paid, failed)

### 4.6 Page Coordonnées Bancaires

**Fichier à créer :**
```
sos/src/pages/dashboard/affiliate/AffiliateBankDetails.tsx
```

**Tâches :**
- [ ] Formulaire multi-type (IBAN, Sort Code, ABA)
- [ ] Validation côté client
- [ ] Affichage coordonnées masquées si existantes
- [ ] Statut vérification

### 4.7 Modification Inscription

**Fichier à modifier :**
```
sos/src/pages/auth/SignUp.tsx (ou équivalent)
```

**Tâches :**
- [ ] Capturer `?ref=` ou `?code=` depuis URL
- [ ] Stocker dans localStorage
- [ ] Passer `pendingReferralCode` à la création user
- [ ] Afficher message si parrainé

### 4.8 Ajout Routes

**Fichier à modifier :**
```
sos/src/App.tsx ou routes config
```

**Tâches :**
- [ ] Route `/dashboard/affiliate`
- [ ] Route `/dashboard/affiliate/earnings`
- [ ] Route `/dashboard/affiliate/referrals`
- [ ] Route `/dashboard/affiliate/withdraw`
- [ ] Route `/dashboard/affiliate/bank`

### 4.9 Ajout Menu Dashboard

**Fichier à modifier :**
```
sos/src/components/dashboard/DashboardSidebar.tsx (ou équivalent)
```

**Tâches :**
- [ ] Ajouter entrée "Affiliation" / "Tirelire"
- [ ] Icône appropriée
- [ ] Badge si gains disponibles

---

## PHASE 5 : CONSOLE ADMIN
**Durée estimée : 4-5 heures**

### 5.1 Hook useAffiliateAdmin

**Fichier à créer :**
```
sos/src/hooks/useAffiliateAdmin.ts
```

**Tâches :**
- [ ] Récupérer config
- [ ] Récupérer stats globales
- [ ] Récupérer liste affiliés
- [ ] Récupérer commissions
- [ ] Récupérer payouts
- [ ] Fonctions admin (updateConfig, adjustCommission, etc.)

### 5.2 Page Dashboard Admin

**Fichier à créer :**
```
sos/src/pages/admin/affiliate/AdminAffiliateDashboard.tsx
```

**Tâches :**
- [ ] KPIs (affiliés actifs, commissions, payouts, conversion)
- [ ] Alertes (payouts en attente, fraude)
- [ ] Graphiques (évolution commissions, répartition par type)
- [ ] Top 10 affiliés
- [ ] Payouts en attente de traitement
- [ ] Navigation rapide

### 5.3 Page Configuration Admin

**Fichier à créer :**
```
sos/src/pages/admin/affiliate/AdminAffiliateConfig.tsx
```

**Tâches :**
- [ ] Toggle activation système
- [ ] Taux par défaut (inscription, appels, abonnements)
- [ ] Règles par action (6 types) avec éditeur
- [ ] Paramètres retrait (minimum, délai, limites)
- [ ] Paramètres anti-fraude
- [ ] Historique modifications
- [ ] Bouton sauvegarder

### 5.4 Page Gestion Affiliés

**Fichier à créer :**
```
sos/src/pages/admin/affiliate/AdminAffiliateList.tsx
```

**Tâches :**
- [ ] Tableau complet (nom, code, taux, filleuls, gains)
- [ ] Filtres (actifs, inactifs, par période)
- [ ] Recherche
- [ ] Actions : voir détail, bloquer, ajuster taux
- [ ] Export CSV

### 5.5 Page Détail Affilié

**Fichier à créer :**
```
sos/src/pages/admin/affiliate/AdminAffiliateDetail.tsx
```

**Tâches :**
- [ ] Infos affilié
- [ ] Taux capturés
- [ ] Liste filleuls
- [ ] Historique commissions
- [ ] Historique payouts
- [ ] Actions admin (ajuster, bloquer)

### 5.6 Page Gestion Commissions

**Fichier à créer :**
```
sos/src/pages/admin/affiliate/AdminAffiliateCommissions.tsx
```

**Tâches :**
- [ ] Tableau toutes commissions
- [ ] Filtres (type, status, affilié, période)
- [ ] Actions : annuler, ajuster montant
- [ ] Création manuelle (manual_adjustment)

### 5.7 Page Gestion Payouts

**Fichier à créer :**
```
sos/src/pages/admin/affiliate/AdminAffiliatePayouts.tsx
```

**Tâches :**
- [ ] Onglets : En attente, En cours, Complétés, Échoués
- [ ] Actions : Valider, Rejeter, Relancer
- [ ] Détail Wise (transferId, status)
- [ ] Historique complet

### 5.8 Page Rapports

**Fichier à créer :**
```
sos/src/pages/admin/affiliate/AdminAffiliateReports.tsx
```

**Tâches :**
- [ ] Rapport mensuel
- [ ] Rapport par affilié
- [ ] Rapport par type de commission
- [ ] Export PDF/CSV
- [ ] Export comptable

### 5.9 Callables Admin

**Fichiers à créer :**
```
sos/firebase/functions/src/affiliate/callables/admin/updateConfig.ts
sos/firebase/functions/src/affiliate/callables/admin/adjustCommission.ts
sos/firebase/functions/src/affiliate/callables/admin/cancelCommission.ts
sos/firebase/functions/src/affiliate/callables/admin/processPayoutManually.ts
sos/firebase/functions/src/affiliate/callables/admin/rejectPayout.ts
sos/firebase/functions/src/affiliate/callables/admin/getGlobalStats.ts
```

**Tâches :**
- [ ] Vérification rôle admin
- [ ] Logique métier
- [ ] Logging audit

### 5.10 Ajout Menu Admin

**Fichier à modifier :**
```
sos/src/config/adminMenu.ts
```

**Tâches :**
- [ ] Section "Affiliation" avec sous-menu
- [ ] Dashboard, Config, Affiliés, Commissions, Payouts, Rapports

### 5.11 Ajout Routes Admin

**Fichier à modifier :**
```
sos/src/components/admin/AdminRoutesV2.tsx
```

**Tâches :**
- [ ] Routes pour les 7 pages admin affiliation

---

## PHASE 6 : NOTIFICATIONS
**Durée estimée : 1-2 heures**

### 6.1 Templates Email

**Collection Firestore :**
```
message_templates/{lang}/items/affiliate_*
```

**Templates à créer (x9 langues) :**
- [ ] `affiliate_new_referral` - Nouveau filleul inscrit
- [ ] `affiliate_commission_earned` - Commission gagnée
- [ ] `affiliate_payout_requested` - Demande retrait reçue
- [ ] `affiliate_payout_processing` - Retrait en cours
- [ ] `affiliate_payout_completed` - Retrait envoyé
- [ ] `affiliate_payout_received` - Fonds reçus
- [ ] `affiliate_payout_failed` - Échec retrait

### 6.2 Intégration Pipeline

**Fichiers à modifier :**
```
sos/firebase/functions/src/notificationPipeline/routing.ts (si nécessaire)
```

**Tâches :**
- [ ] Ajouter routing pour events affiliate_*
- [ ] Canaux : email, push, in_app

### 6.3 Envoi Notifications

**Vérifier dans chaque trigger/callable :**
- [ ] onUserCreated → notifier parrain
- [ ] createCommission → notifier affilié
- [ ] requestWithdrawal → notifier affilié
- [ ] processWisePayout → notifier affilié
- [ ] wiseWebhook → notifier affilié

---

## PHASE 7 : TESTS & FINALISATION
**Durée estimée : 2-3 heures**

### 7.1 Tests Manuels

**Scénarios à tester :**
- [ ] Inscription avec code parrainage
- [ ] Inscription sans code
- [ ] Génération code unique
- [ ] Commission sur 1er appel
- [ ] Commission sur appel récurrent
- [ ] Commission sur abonnement
- [ ] Demande de retrait
- [ ] Traitement Wise (sandbox)
- [ ] Webhook Wise
- [ ] Console admin : modification config
- [ ] Console admin : ajustement commission

### 7.2 Export Index

**Fichier à modifier :**
```
sos/firebase/functions/src/index.ts
```

**Tâches :**
- [ ] Exporter tous les triggers
- [ ] Exporter tous les callables
- [ ] Exporter webhook Wise
- [ ] Exporter scheduled functions

### 7.3 Déploiement

**Tâches :**
- [ ] Déployer Firestore rules
- [ ] Déployer Firestore indexes
- [ ] Déployer Cloud Functions
- [ ] Créer document `affiliate_config/current` avec valeurs par défaut
- [ ] Configurer secrets Wise dans Firebase
- [ ] Tester en staging
- [ ] Déployer en production

### 7.4 Documentation

**Tâches :**
- [ ] Documenter les endpoints API
- [ ] Documenter la configuration admin
- [ ] Guide utilisateur (comment parrainer)

---

## DÉPENDANCES ENTRE TÂCHES

```
PHASE 1 (Infrastructure)
    │
    ├── 1.1 Types ──────────────────┐
    ├── 1.2 Chiffrement ────────────┤
    ├── 1.3 Config Firestore ───────┼──► PHASE 2 (Backend)
    ├── 1.4 Rules Firestore ────────┤
    └── 1.5 Index Firestore ────────┘
                                    │
                                    ▼
PHASE 2 (Backend Core)
    │
    ├── 2.1 Utils ──────────────────┐
    ├── 2.2 Trigger User ───────────┤
    ├── 2.3 Service Commission ─────┼──► PHASE 3 (Wise)
    ├── 2.4-2.6 Triggers ───────────┤         │
    └── 2.7-2.9 Callables ──────────┘         │
                                              │
                                              ▼
PHASE 3 (Wise) ◄────────────────────► PHASE 4 (Frontend User)
    │                                         │
    │                                         ▼
    └──────────────────────────────► PHASE 5 (Admin)
                                              │
                                              ▼
                                    PHASE 6 (Notifications)
                                              │
                                              ▼
                                    PHASE 7 (Tests)
```

---

## FICHIERS À CRÉER (RÉSUMÉ)

### Backend (25 fichiers)

```
sos/firebase/functions/src/affiliate/
├── types.ts
├── utils/
│   ├── index.ts
│   └── encryption.ts
├── triggers/
│   ├── onUserCreated.ts
│   ├── onCallCompleted.ts
│   ├── onSubscriptionCreated.ts
│   └── onSubscriptionRenewed.ts
├── services/
│   ├── commissionService.ts
│   ├── processWisePayout.ts
│   └── wise/
│       ├── client.ts
│       ├── recipient.ts
│       ├── quote.ts
│       └── transfer.ts
├── callables/
│   ├── getMyAffiliateData.ts
│   ├── updateBankDetails.ts
│   ├── requestWithdrawal.ts
│   └── admin/
│       ├── updateConfig.ts
│       ├── adjustCommission.ts
│       ├── cancelCommission.ts
│       ├── processPayoutManually.ts
│       ├── rejectPayout.ts
│       └── getGlobalStats.ts
├── webhooks/
│   └── wiseWebhook.ts
└── scheduled/
    └── releaseHeldCommissions.ts
```

### Frontend User (7 fichiers)

```
sos/src/
├── hooks/
│   └── useAffiliate.ts
├── types/
│   └── affiliate.ts
└── pages/dashboard/affiliate/
    ├── AffiliateDashboard.tsx
    ├── AffiliateEarnings.tsx
    ├── AffiliateReferrals.tsx
    ├── AffiliateWithdraw.tsx
    └── AffiliateBankDetails.tsx
```

### Frontend Admin (8 fichiers)

```
sos/src/
├── hooks/
│   └── useAffiliateAdmin.ts
└── pages/admin/affiliate/
    ├── AdminAffiliateDashboard.tsx
    ├── AdminAffiliateConfig.tsx
    ├── AdminAffiliateList.tsx
    ├── AdminAffiliateDetail.tsx
    ├── AdminAffiliateCommissions.tsx
    ├── AdminAffiliatePayouts.tsx
    └── AdminAffiliateReports.tsx
```

### Fichiers à Modifier (6 fichiers)

```
sos/firestore.rules
sos/firebase/firestore.indexes.json
sos/firebase/functions/src/index.ts
sos/src/pages/auth/SignUp.tsx
sos/src/config/adminMenu.ts
sos/src/components/admin/AdminRoutesV2.tsx
```

**TOTAL : ~46 fichiers**

---

## PROMPT POUR NOUVELLE CONVERSATION

Copiez ce prompt pour démarrer l'implémentation :

---

```
Je veux implémenter un système d'affiliation complet pour SOS-Expat.

CONTEXTE :
- Projet existant : Firebase (Firestore, Cloud Functions, Auth), React, TypeScript
- Paiements existants : Stripe + PayPal
- Notifications existantes : pipeline message_events

DOCUMENTS DE RÉFÉRENCE À LIRE :
1. CDC_SYSTEME_AFFILIATION_SOS_EXPAT.md - Cahier des charges original
2. ANALYSE_SYSTEME_AFFILIATION_V2.md - Analyse complète avec enrichissements
3. PLAN_IMPLEMENTATION_AFFILIATION.md - Plan d'implémentation détaillé

FONCTIONNALITÉS REQUISES :
1. Code affilié auto-généré à l'inscription (clients ET prestataires)
2. Commissions FIXES ou POURCENTAGES (configurable par action)
3. Actions : inscription filleul, 1er appel, appels récurrents, abonnement, renouvellement, bonus prestataire
4. TAUX FIGÉ À VIE : les affiliés gardent leurs taux même si la config change
5. Tirelire avec retrait dès 30€ via Wise
6. Frontend : 6 pages dashboard user (tirelire, gains, filleuls, retraits, banque)
7. Console admin : 7 pages (dashboard, config, affiliés, commissions, payouts, rapports)
8. TOUT configurable depuis l'admin (taux, règles, limites, anti-fraude)

POINTS CRITIQUES À RÉSOUDRE :
1. Chiffrement coordonnées bancaires (AES-256)
2. Protection champs Firestore (affiliateCode, balances, capturedRates)
3. Trigger robuste (onDocumentCreated pas Auth trigger)
4. Anti-fraude basique (IP, patterns)

APPROCHE :
Procède phase par phase dans l'ordre du plan :
- Phase 1 : Infrastructure & Sécurité
- Phase 2 : Backend Core
- Phase 3 : Intégration Wise
- Phase 4 : Frontend User
- Phase 5 : Console Admin
- Phase 6 : Notifications
- Phase 7 : Tests

Commence par lire les 3 fichiers de référence, puis démarre par la Phase 1.
Pour chaque phase, crée les fichiers dans l'ordre indiqué.
```

---

*Plan d'implémentation généré le 26 janvier 2026*
