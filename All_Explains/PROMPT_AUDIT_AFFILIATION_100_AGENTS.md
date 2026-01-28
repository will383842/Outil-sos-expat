# 🔍 PROMPT D'AUDIT COMPLET - SYSTÈME D'AFFILIATION SOS EXPAT
## Mission : Vérification Exhaustive par 100 Agents IA Hiérarchisés

---

## 📋 CONTEXTE

Tu es le **Directeur Général d'Audit** supervisant une équipe de **100 agents IA spécialisés** organisés en hiérarchie militaire. Ta mission est de réaliser un audit complet, minutieux et exhaustif du système d'affiliation de la plateforme **SOS Expat**.

**Plateforme** : SOS Expat - Mise en relation avocats/expatriés dans 197 pays, 9 langues
**Stack technique** : React/TypeScript (Frontend), Firebase Functions (Backend), Firestore (DB), Wise API (Paiements)
**Chemin du projet** : `C:\Users\willi\Documents\Projets\VS_CODE\sos-expat-project`

---

## 🎖️ STRUCTURE HIÉRARCHIQUE DES 100 AGENTS

### NIVEAU 1 : COMMANDEMENT (5 Agents)
```
┌─────────────────────────────────────────────────────────────────┐
│  🎖️ GÉNÉRAL EN CHEF (Agent #1) - Directeur d'Audit Global      │
│     └── Supervise l'ensemble, synthèse finale, décisions       │
├─────────────────────────────────────────────────────────────────┤
│  ⭐ GÉNÉRAL BACKEND (Agent #2)        │  ⭐ GÉNÉRAL FRONTEND (Agent #3)  │
│     └── 25 agents backend             │     └── 25 agents frontend       │
├─────────────────────────────────────────────────────────────────┤
│  ⭐ GÉNÉRAL INTÉGRATION (Agent #4)    │  ⭐ GÉNÉRAL QUALITÉ (Agent #5)   │
│     └── 20 agents intégration         │     └── 25 agents QA/Sécurité    │
└─────────────────────────────────────────────────────────────────┘
```

### NIVEAU 2 : COLONELS (10 Agents - #6 à #15)
- **Colonel Backend Firebase** (#6) - 5 lieutenants
- **Colonel Backend Wise** (#7) - 5 lieutenants
- **Colonel Backend Commissions** (#8) - 5 lieutenants
- **Colonel Frontend Admin** (#9) - 6 lieutenants
- **Colonel Frontend User** (#10) - 6 lieutenants
- **Colonel Intégration Données** (#11) - 5 lieutenants
- **Colonel Intégration API** (#12) - 5 lieutenants
- **Colonel Sécurité** (#13) - 6 lieutenants
- **Colonel Performance** (#14) - 6 lieutenants
- **Colonel Conformité** (#15) - 6 lieutenants

### NIVEAU 3 : LIEUTENANTS (25 Agents - #16 à #40)
Chaque lieutenant supervise 2-3 soldats spécialistes

### NIVEAU 4 : SOLDATS SPÉCIALISTES (60 Agents - #41 à #100)
Agents d'exécution pour les vérifications détaillées

---

## 📁 FICHIERS À AUDITER

### BACKEND (Firebase Functions)
```
sos/firebase/functions/src/affiliate/
├── index.ts                           # Exports principaux
├── triggers/
│   ├── onUserCreated.ts              # Capture des taux à l'inscription
│   ├── onCallCompleted.ts            # Commissions sur appels
│   └── onSubscriptionEvent.ts        # Commissions sur abonnements
├── services/
│   ├── commissionService.ts          # Logique de création des commissions
│   ├── commissionCalculator.ts       # Calcul des montants (capturedRates)
│   ├── payoutService.ts              # Gestion des demandes de paiement
│   └── fraudDetectionService.ts      # Détection de fraude
├── wise/
│   ├── wiseClient.ts                 # Client API Wise
│   ├── wiseRecipientService.ts       # Gestion des bénéficiaires
│   ├── wiseQuoteService.ts           # Devis de transfert
│   └── wiseTransferService.ts        # Exécution des transferts
├── webhooks/
│   └── wiseWebhook.ts                # Réception webhooks Wise
├── callable/
│   ├── getMyAffiliateData.ts         # Données affilié (user)
│   ├── requestPayout.ts              # Demande de retrait
│   ├── updateBankDetails.ts          # Mise à jour coordonnées bancaires
│   ├── getAffiliateConfig.ts         # Config globale (admin)
│   ├── updateAffiliateConfig.ts      # Mise à jour config (admin)
│   ├── getAffiliatesList.ts          # Liste affiliés (admin)
│   ├── getAffiliateDetail.ts         # Détail affilié (admin)
│   ├── updateAffiliateStatus.ts      # Suspension/réactivation (admin)
│   ├── getPayoutsList.ts             # Liste payouts (admin)
│   ├── processPayoutAction.ts        # Actions sur payouts (admin)
│   └── manualCommissionAdjustment.ts # Ajustement manuel (admin)
├── scheduled/
│   └── releaseHeldCommissions.ts     # Libération commissions en attente
└── utils/
    ├── affiliateCodeGenerator.ts     # Génération codes affiliés
    └── validators.ts                 # Validations
```

### FRONTEND - Pages Admin
```
sos/src/pages/admin/
├── AdminAffiliateDashboard.tsx       # Dashboard KPIs
├── AdminAffiliatesList.tsx           # Liste des affiliés
├── AdminAffiliateDetail.tsx          # Détail d'un affilié
├── AdminAffiliateConfig.tsx          # Configuration globale
├── AdminCommissionRules.tsx          # Règles de commission
├── AdminAffiliateCommissions.tsx     # Gestion des commissions
├── AdminAffiliatePayouts.tsx         # Gestion des payouts
├── AdminAffiliateReports.tsx         # Rapports & Analytics
└── AdminAffiliateFraudAlerts.tsx     # Alertes fraude
```

### FRONTEND - Pages Utilisateur
```
sos/src/pages/Affiliate/
├── AffiliateDashboard.tsx            # Dashboard affilié
├── AffiliateEarnings.tsx             # Historique gains
├── AffiliateReferrals.tsx            # Liste filleuls
├── AffiliateWithdraw.tsx             # Demande retrait
├── AffiliateBankDetails.tsx          # Coordonnées bancaires
├── AffiliateTools.tsx                # Outils marketing (UTM, QR)
└── index.ts                          # Barrel exports
```

### TYPES & HOOKS
```
sos/src/types/affiliate.ts            # Types TypeScript
sos/src/hooks/useAffiliate.ts         # Hook données affilié
```

### CONFIGURATION & ROUTES
```
sos/src/config/adminMenu.ts           # Menu admin
sos/src/components/admin/AdminRoutesV2.tsx  # Routes admin
sos/src/App.tsx                       # Routes principales
sos/src/multilingual-system/core/routing/localeRoutes.ts  # Routes traduites
```

### TRADUCTIONS
```
sos/src/helper/fr.json                # Français
sos/src/helper/en.json                # Anglais
sos/src/locales/*/admin.json          # 9 langues admin
```

---

## 🎯 MISSIONS PAR DIVISION

### 🔷 DIVISION BACKEND (25 Agents)

#### Mission B1 : Triggers Firebase (Agents #41-45)
```
VÉRIFIER :
□ onUserCreated.ts capture correctement les taux (capturedRates)
□ Les champs affiliateCode, referredBy sont créés
□ Le bonus d'inscription est créé si referredBy existe
□ onCallCompleted.ts génère les commissions correctement
□ onSubscriptionEvent.ts gère tous les événements Stripe
□ Les commissions sont créées avec le bon statut (pending/held)
□ Aucune donnée mock, tout utilise Firestore réel
```

#### Mission B2 : Services de Commission (Agents #46-50)
```
VÉRIFIER :
□ commissionService.ts appelle commissionCalculator.ts
□ commissionCalculator.ts utilise getEffectiveRate() avec capturedRates
□ Les taux gelés à l'inscription sont bien utilisés (pas les taux actuels)
□ Le calcul fixed/percentage/hybrid est correct
□ payoutService.ts vérifie le solde minimum
□ payoutService.ts vérifie hasBankDetails
□ fraudDetectionService.ts détecte les patterns suspects
```

#### Mission B3 : Intégration Wise (Agents #51-55)
```
VÉRIFIER :
□ wiseClient.ts gère l'authentification API
□ wiseRecipientService.ts crée les bénéficiaires correctement
□ wiseQuoteService.ts obtient les devis de transfert
□ wiseTransferService.ts exécute les transferts
□ wiseWebhook.ts traite tous les états (outgoing_payment_sent, cancelled, etc.)
□ Le webhook restaure le solde en cas d'échec
□ Les secrets sont dans Secret Manager (pas en dur)
```

#### Mission B4 : Fonctions Callable (Agents #56-60)
```
VÉRIFIER :
□ Toutes les fonctions vérifient l'authentification
□ Les fonctions admin vérifient le rôle admin
□ getMyAffiliateData retourne les vraies données Firestore
□ requestPayout vérifie toutes les conditions
□ updateBankDetails chiffre les données sensibles
□ Les fonctions admin retournent des données paginées
□ Aucun console.log avec données sensibles en production
```

#### Mission B5 : Scheduled Functions (Agents #61-65)
```
VÉRIFIER :
□ releaseHeldCommissions.ts libère après la période de rétention
□ La période de rétention est configurable
□ Les commissions passent de "pending" à "available"
□ Le cron est configuré correctement
□ Les logs sont informatifs mais pas verbeux
```

---

### 🔶 DIVISION FRONTEND ADMIN (25 Agents)

#### Mission F1 : Dashboard Admin (Agents #66-70)
```
VÉRIFIER :
□ AdminAffiliateDashboard.tsx affiche les vrais KPIs
□ Les graphiques utilisent des données Firestore réelles
□ Les alertes affichent les vrais problèmes
□ Top 10 affiliés basé sur données réelles
□ Navigation vers les autres pages fonctionne
□ Pas de données mockées ou statiques
```

#### Mission F2 : Gestion Affiliés (Agents #71-75)
```
VÉRIFIER :
□ AdminAffiliatesList.tsx charge les affiliés depuis Firestore
□ La pagination fonctionne
□ Les filtres (statut, recherche) fonctionnent
□ AdminAffiliateDetail.tsx affiche toutes les infos
□ Les actions (suspendre, réactiver, signaler) fonctionnent
□ L'historique des commissions est affiché
```

#### Mission F3 : Gestion Commissions & Payouts (Agents #76-80)
```
VÉRIFIER :
□ AdminAffiliateCommissions.tsx liste toutes les commissions
□ Filtres par statut, type, date fonctionnent
□ Actions annuler/ajuster fonctionnent
□ AdminAffiliatePayouts.tsx liste tous les payouts
□ Actions approuver/rejeter/envoyer via Wise fonctionnent
□ Le statut Wise est affiché si disponible
```

#### Mission F4 : Configuration & Règles (Agents #81-85)
```
VÉRIFIER :
□ AdminAffiliateConfig.tsx charge la config depuis Firestore
□ Les modifications sont sauvegardées
□ L'historique des changements est enregistré
□ AdminCommissionRules.tsx permet de configurer chaque action
□ Les types fixed/percentage/hybrid fonctionnent
□ La validation des formulaires est correcte
```

#### Mission F5 : Rapports & Fraude (Agents #86-90)
```
VÉRIFIER :
□ AdminAffiliateReports.tsx génère des rapports réels
□ L'export CSV fonctionne
□ Les graphiques sont corrects
□ AdminAffiliateFraudAlerts.tsx liste les vraies alertes
□ Les actions valider/ignorer/bloquer fonctionnent
□ Les affiliés flaggés sont visibles
```

---

### 🔷 DIVISION FRONTEND USER (25 Agents)

#### Mission U1 : Dashboard Affilié (Agents #91-93)
```
VÉRIFIER :
□ AffiliateDashboard.tsx affiche les vraies stats
□ Le solde disponible est correct
□ Le lien de parrainage fonctionne
□ Les taux capturés sont affichés
□ La tirelire montre le bon montant
```

#### Mission U2 : Gains & Filleuls (Agents #94-96)
```
VÉRIFIER :
□ AffiliateEarnings.tsx liste les vraies commissions
□ Les filtres fonctionnent
□ AffiliateReferrals.tsx liste les vrais filleuls
□ Les stats par filleul sont correctes
```

#### Mission U3 : Retrait & Banque (Agents #97-99)
```
VÉRIFIER :
□ AffiliateWithdraw.tsx vérifie le seuil minimum
□ La demande de retrait appelle requestPayout
□ AffiliateBankDetails.tsx sauvegarde les coordonnées
□ Les types de compte (IBAN, UK, US) fonctionnent
□ Les données sont chiffrées avant stockage
```

#### Mission U4 : Outils Marketing (Agent #100)
```
VÉRIFIER :
□ AffiliateTools.tsx génère des liens UTM valides
□ Le QR code se génère correctement
□ Le partage social fonctionne
□ Les templates de campagne fonctionnent
```

---

### 🔶 DIVISION INTÉGRATION (20 Agents)

#### Mission I1 : Flux de Données Complet
```
TRACER LE PARCOURS COMPLET :
1. Inscription avec code affilié
   □ URL avec ?ref=CODE capturé
   □ Code stocké en localStorage/cookie
   □ onUserCreated déclenché
   □ referredBy et capturedRates créés
   □ Commission signup créée si applicable

2. Premier appel
   □ Appel complété
   □ onCallCompleted déclenché
   □ Commission calculée avec capturedRates
   □ Commission créée en "pending" (période de rétention)

3. Abonnement
   □ Paiement Stripe réussi
   □ onSubscriptionEvent déclenché
   □ Commission subscription créée

4. Retrait
   □ Seuil minimum atteint
   □ Coordonnées bancaires présentes
   □ Demande de retrait créée
   □ Admin approuve
   □ Transfert Wise exécuté
   □ Webhook Wise reçu
   □ Statut mis à jour
```

#### Mission I2 : Cohérence des Données
```
VÉRIFIER :
□ Les montants en cents partout (backend & frontend)
□ Les timestamps sont des Firestore Timestamps
□ Les IDs sont cohérents entre collections
□ Les références croisées sont valides
□ Pas de données orphelines
```

---

### 🔷 DIVISION QUALITÉ & SÉCURITÉ (25 Agents)

#### Mission Q1 : Sécurité
```
VÉRIFIER :
□ Authentification requise sur toutes les fonctions
□ Rôle admin vérifié pour fonctions admin
□ Données bancaires chiffrées (AES-256)
□ Pas de secrets en dur dans le code
□ Pas de console.log avec données sensibles
□ XSS prévenu dans les inputs
□ CSRF tokens si applicable
□ Rate limiting sur les API
```

#### Mission Q2 : Performance
```
VÉRIFIER :
□ Requêtes Firestore optimisées (index)
□ Pagination implémentée
□ Lazy loading des composants
□ Pas de re-renders inutiles
□ Bundle size raisonnable
```

#### Mission Q3 : Scalabilité
```
VÉRIFIER :
□ Architecture supporte 10K+ affiliés
□ Requêtes paginées
□ Pas de queries sur toute la collection
□ Webhooks idempotents
□ Transactions pour opérations critiques
```

#### Mission Q4 : Conformité
```
VÉRIFIER :
□ RGPD : données personnelles protégées
□ Droit à l'oubli possible
□ Logs d'audit présents
□ Conditions d'utilisation affiliation
```

---

## 📊 FORMAT DU RAPPORT FINAL

Le rapport doit être généré dans le fichier :
`RAPPORT_AUDIT_AFFILIATION_COMPLET.md`

### Structure du Rapport :

```markdown
# 📋 RAPPORT D'AUDIT COMPLET - SYSTÈME D'AFFILIATION SOS EXPAT
## Date : [DATE]
## Version : 1.0

---

## 📈 SCORE GLOBAL DE PRODUCTION-READINESS

| Catégorie | Score | Statut |
|-----------|-------|--------|
| Backend | XX/100 | 🟢/🟡/🔴 |
| Frontend Admin | XX/100 | 🟢/🟡/🔴 |
| Frontend User | XX/100 | 🟢/🟡/🔴 |
| Intégration | XX/100 | 🟢/🟡/🔴 |
| Sécurité | XX/100 | 🟢/🟡/🔴 |
| Performance | XX/100 | 🟢/🟡/🔴 |
| **TOTAL** | **XX/100** | **🟢/🟡/🔴** |

🟢 = Production Ready (>85%)
🟡 = Améliorations nécessaires (60-85%)
🔴 = Bloquant (< 60%)

---

## ✅ POINTS POSITIFS (Forces du système)

### Backend
1. [Point positif 1]
2. [Point positif 2]
...

### Frontend
1. [Point positif 1]
2. [Point positif 2]
...

### Sécurité
1. [Point positif 1]
...

---

## ❌ POINTS NÉGATIFS (Problèmes identifiés)

### 🔴 CRITIQUES (Bloquants pour production)
| # | Fichier | Ligne | Problème | Impact |
|---|---------|-------|----------|--------|
| 1 | xxx.ts | 123 | Description | Critique |
...

### 🟡 MAJEURS (À corriger rapidement)
| # | Fichier | Ligne | Problème | Impact |
|---|---------|-------|----------|--------|
| 1 | xxx.ts | 123 | Description | Majeur |
...

### 🟢 MINEURS (Améliorations suggérées)
| # | Fichier | Ligne | Problème | Impact |
|---|---------|-------|----------|--------|
| 1 | xxx.ts | 123 | Description | Mineur |
...

---

## 🔍 VÉRIFICATION DONNÉES MOCK vs RÉELLES

| Composant | Mock Détecté | Données Réelles | Statut |
|-----------|--------------|-----------------|--------|
| AdminAffiliateDashboard | ❌ Non | ✅ Firestore | 🟢 OK |
| AdminAffiliatesList | ❌ Non | ✅ Firestore | 🟢 OK |
...

---

## 🔗 VÉRIFICATION DU TRACKING COMPLET

### Parcours Inscription Affilié
| Étape | Implémenté | Testé | Statut |
|-------|------------|-------|--------|
| Capture ref URL | ✅ | ⬜ | 🟢 |
| Storage localStorage | ✅ | ⬜ | 🟢 |
| Trigger onUserCreated | ✅ | ⬜ | 🟢 |
| capturedRates sauvé | ✅ | ⬜ | 🟢 |
| Commission signup | ✅ | ⬜ | 🟢 |

### Parcours Commission Appel
| Étape | Implémenté | Testé | Statut |
|-------|------------|-------|--------|
| Trigger onCallCompleted | ✅ | ⬜ | 🟢 |
| Calcul avec capturedRates | ✅ | ⬜ | 🟢 |
| Commission créée | ✅ | ⬜ | 🟢 |
| Période rétention | ✅ | ⬜ | 🟢 |

### Parcours Payout
| Étape | Implémenté | Testé | Statut |
|-------|------------|-------|--------|
| Vérification seuil | ✅ | ⬜ | 🟢 |
| Vérification banque | ✅ | ⬜ | 🟢 |
| Création payout | ✅ | ⬜ | 🟢 |
| Approbation admin | ✅ | ⬜ | 🟢 |
| Transfert Wise | ✅ | ⬜ | 🟢 |
| Webhook status | ✅ | ⬜ | 🟢 |

---

## 🚀 RECOMMANDATIONS D'AMÉLIORATION

### Priorité 1 - Critiques (Avant mise en production)
1. **[Titre]**
   - Problème : [Description]
   - Solution : [Code ou explication]
   - Fichier : [path/to/file.ts:ligne]

### Priorité 2 - Importantes (Sprint suivant)
1. **[Titre]**
   - Problème : [Description]
   - Solution : [Code ou explication]
   - Fichier : [path/to/file.ts:ligne]

### Priorité 3 - Optimisations (Backlog)
1. **[Titre]**
   - Problème : [Description]
   - Solution : [Code ou explication]
   - Fichier : [path/to/file.ts:ligne]

---

## 📋 CHECKLIST FINALE PRÉ-PRODUCTION

### Configuration
- [ ] WISE_API_KEY configuré dans Secret Manager
- [ ] WISE_WEBHOOK_SECRET configuré
- [ ] WISE_PROFILE_ID configuré
- [ ] Environment variables vérifiées

### Base de données
- [ ] Index Firestore créés
- [ ] Rules Firestore configurées
- [ ] Collection affiliate_config initialisée

### Tests
- [ ] Tests unitaires passent
- [ ] Tests d'intégration passent
- [ ] Test E2E parcours complet

### Monitoring
- [ ] Alertes configurées
- [ ] Logs structurés
- [ ] Dashboard monitoring

---

## 📊 MÉTRIQUES DE SCALABILITÉ

| Métrique | Valeur Actuelle | Cible | Statut |
|----------|-----------------|-------|--------|
| Affiliés supportés | X | 10K+ | 🟢 |
| Commissions/jour | X | 1K+ | 🟢 |
| Payouts/mois | X | 500+ | 🟢 |
| Temps réponse API | Xms | <500ms | 🟢 |

---

## 🏁 CONCLUSION

[Résumé exécutif de l'audit]

**Verdict final** : 🟢 PRODUCTION READY / 🟡 CORRECTIONS REQUISES / 🔴 NON PRÊT

**Prochaines étapes** :
1. [Action 1]
2. [Action 2]
3. [Action 3]

---

*Rapport généré par l'équipe de 100 Agents IA*
*Sous la supervision du Général en Chef d'Audit*
```

---

## 🚀 INSTRUCTIONS D'EXÉCUTION

1. **Lire ce prompt en entier** avant de commencer
2. **Organiser les agents** selon la hiérarchie définie
3. **Exécuter les missions** dans l'ordre des divisions
4. **Chaque agent rapporte** à son supérieur hiérarchique
5. **Le Général en Chef** compile le rapport final
6. **Générer le fichier** `RAPPORT_AUDIT_AFFILIATION_COMPLET.md`

### Commandes pour l'audit :

```bash
# Vérifier les imports/exports
grep -r "export" sos/firebase/functions/src/affiliate/

# Chercher les mocks
grep -rn "mock\|Mock\|MOCK\|fake\|Fake\|dummy" sos/src/pages/admin/Admin*Affiliate*
grep -rn "mock\|Mock\|MOCK\|fake\|Fake\|dummy" sos/src/pages/Affiliate/

# Vérifier les appels Firestore
grep -rn "getFirestore\|collection\|doc\|getDoc\|getDocs" sos/src/pages/admin/Admin*Affiliate*

# Chercher les TODO/FIXME
grep -rn "TODO\|FIXME\|XXX\|HACK" sos/firebase/functions/src/affiliate/
grep -rn "TODO\|FIXME\|XXX\|HACK" sos/src/pages/admin/Admin*Affiliate*

# Vérifier TypeScript
cd sos && npx tsc --noEmit 2>&1 | grep -i affiliate

# Chercher les console.log en production
grep -rn "console.log\|console.error" sos/firebase/functions/src/affiliate/
```

---

## ⚠️ CRITÈRES DE SUCCÈS

L'audit est considéré comme **RÉUSSI** si :

1. ✅ Score global ≥ 85%
2. ✅ Aucun problème critique (🔴)
3. ✅ Moins de 5 problèmes majeurs (🟡)
4. ✅ Aucune donnée mock détectée
5. ✅ Tous les parcours de tracking validés
6. ✅ Sécurité validée
7. ✅ TypeScript sans erreurs

---

**FIN DU PROMPT D'AUDIT**

*Exécute maintenant cet audit complet et génère le rapport dans `RAPPORT_AUDIT_AFFILIATION_COMPLET.md`*
