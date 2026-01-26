# PROMPT POUR IMPLÉMENTER LE SYSTÈME D'AFFILIATION

Copiez tout le contenu ci-dessous et collez-le dans une nouvelle conversation Claude :

---

Je veux implémenter un système d'affiliation complet pour SOS-Expat.

## CONTEXTE TECHNIQUE

- **Projet existant** : Firebase (Firestore, Cloud Functions v2, Auth), React 18, TypeScript
- **Paiements existants** : Stripe (Direct Charges) + PayPal
- **Notifications existantes** : Pipeline `message_events` avec Zoho SMTP, FCM, In-App
- **Console admin existante** : 75+ pages, structure établie dans `src/pages/admin/`
- **9 langues** : FR, EN, ES, DE, PT, RU, AR, HI, ZH

## DESIGN OBLIGATOIRE - STYLE SOS EXPAT

### Stack UI
- **Tailwind CSS** avec classes responsives (sm:, md:, lg:, xl:)
- **Radix UI** pour les composants accessibles (Dialog, Tabs, Select, etc.)
- **Lucide React** pour les icônes
- **Dark mode** : toutes les classes doivent inclure les variantes `dark:`
- **react-intl** pour l'internationalisation (FormattedMessage, useIntl)

### Couleurs et Thème
- Primaire : `bg-red-600` / `hover:bg-red-700` / `text-red-600`
- Cartes : `rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800`
- Texte principal : `text-gray-900 dark:text-white`
- Texte secondaire : `text-gray-600 dark:text-gray-400`
- Background : `bg-gray-50 dark:bg-gray-950`

### Mobile-First Obligatoire (2026 Best Practices)
- **Ordre des breakpoints** : mobile d'abord, puis `sm:`, `md:`, `lg:`, `xl:`
- **Touch targets** : minimum 44x44px pour tous les boutons/liens
- **Padding responsive** : `px-4 py-4 sm:px-6 sm:py-5`
- **Grilles** : `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4`
- **Navigation mobile** : utiliser `MobileBottomNav` et `MobileSideDrawer` existants
- **Texte responsive** : `text-sm sm:text-base` ou `text-lg sm:text-xl`
- **Hide/Show mobile** : `hidden sm:block` ou `block sm:hidden`

### Composants à Réutiliser
```
src/components/ui/card.tsx          - Card, CardHeader, CardTitle, CardContent, CardFooter
src/components/ui/button.tsx        - Button (variants: default, outline, destructive, ghost)
src/components/ui/badge.tsx         - Badge pour statuts
src/components/ui/tabs.tsx          - Tabs navigation
src/components/ui/loader.tsx        - Loader animations
src/components/common/Button.tsx    - Bouton principal existant
src/components/layout/Layout.tsx    - Layout wrapper
src/components/dashboard/MobileBottomNav.tsx
src/components/dashboard/MobileSideDrawer.tsx
```

### Patterns de Page Obligatoires
```tsx
// Structure type d'une page dashboard
<Layout>
  <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          <FormattedMessage id="affiliate.title" />
        </h1>
        <Button className="w-full sm:w-auto">...</Button>
      </div>

      {/* Grille responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        ...
      </div>
    </div>
  </div>
</Layout>
```

### Accessibilité (WCAG 2.1 AA)
- Labels sur tous les inputs (`<label htmlFor>`)
- Aria labels sur les boutons d'action (`aria-label`)
- Focus visible (`focus:ring-2 focus:ring-red-500 focus:ring-offset-2`)
- Contraste suffisant (4.5:1 minimum)
- Rôles sémantiques (article, section, nav)

### Composants Spécifiques à Créer

#### Tirelire Visuelle (Piggy Bank)
```tsx
// Animation de remplissage progressif
// Affichage montant avec compteur animé
// Jauge de progression vers seuil retrait (30€)
// Couleurs : vert si ≥30€, orange si proche, gris si loin
```

#### Stats Cards KPI
```tsx
// Icônes Lucide cohérentes
// Variations de couleur par type (gains=vert, retraits=bleu, filleuls=violet)
// Animations au survol (hover:scale-105)
// Indicateurs tendance (+12% ↑)
```

#### Tables Responsives
```tsx
// Version cards sur mobile (<sm)
// Version table classique sur desktop (sm:)
// Sticky header sur scroll
// Actions avec dropdown menu
```

#### Graphiques (utiliser recharts si déjà installé, sinon Chart.js)
```tsx
// Responsive container
// Tooltips avec détails
// Légendes cliquables
// Couleurs cohérentes avec le thème
```

## DOCUMENTS DE RÉFÉRENCE À LIRE EN PREMIER

Lis ces 3 fichiers dans l'ordre avant de commencer :

1. **CDC_SYSTEME_AFFILIATION_SOS_EXPAT.md** - Cahier des charges original
2. **ANALYSE_SYSTEME_AFFILIATION_V2.md** - Analyse complète avec enrichissements et lacunes identifiées
3. **PLAN_IMPLEMENTATION_AFFILIATION.md** - Plan d'implémentation détaillé avec toutes les tâches

## FONCTIONNALITÉS REQUISES

### Core - Génération Automatique

#### Flux d'inscription avec affiliation :
```
1. Visiteur clique sur lien affilié → ?ref=ABC123
2. Code stocké dans cookie (30j) + localStorage
3. Visiteur navigue, peut quitter et revenir
4. Inscription → trigger onUserCreated :
   - Génère code unique pour le nouvel inscrit (ex: XYZ789)
   - Vérifie si cookie/referredBy existe et non expiré
   - Si oui : lie au parrain (ABC123) + calcule commission inscription
   - Capture les taux actuels → figés à vie dans son profil
5. Le nouvel inscrit a maintenant SON lien affilié : ?ref=XYZ789
```

#### Règles de génération du code :
- **Format** : 6-8 caractères alphanumériques (ex: A3B7X9)
- **Unicité** : vérifié dans Firestore avant attribution
- **Persistance** : ne change JAMAIS (même si l'utilisateur change d'email)
- **Tous les rôles** : clients ET prestataires ont un code

#### Taux figés à vie :
1. **Code affilié auto-généré** à l'inscription (clients ET prestataires)
2. **Commissions FIXES ou POURCENTAGES** (configurable par type d'action)
3. **TAUX FIGÉ À VIE** : les affiliés gardent leurs taux d'inscription même si la config globale change
4. **Tirelire** avec retrait dès 30€/USD via Wise

### Types de commissions (6 actions)
- Inscription d'un filleul (fixe ou %)
- Premier appel du filleul (fixe ou % des frais de connexion)
- Appels récurrents (% avec limite optionnelle)
- Souscription abonnement IA (fixe ou %)
- Renouvellement abonnement (% récurrent, durée max configurable)
- Bonus prestataire validé (fixe si KYC complété)

### Frontend Utilisateur (6 pages)
- Dashboard avec tirelire visuelle
- Historique des gains avec filtres
- Liste des filleuls
- Demande de retrait
- Coordonnées bancaires (IBAN/Sort Code/ABA)
- Outils de partage (lien, code)

### Console Admin (8 pages) - SYSTÈME PROFESSIONNEL

#### 1. Dashboard KPIs (temps réel)
- **Total à verser** (somme de tous les `availableBalance` des affiliés)
- **Payouts en attente** de validation
- **Commissions du jour/semaine/mois**
- **Nouveaux affiliés** et **nouveaux filleuls**
- **Top 10 affiliés** par gains
- **Graphiques** : évolution gains, inscriptions, payouts sur 12 mois
- **Alertes** : fraude détectée, payouts bloqués, erreurs Wise

#### 2. Configuration Complète
- Taux par défaut (capture à l'inscription)
- Règles par action (6 types, activer/désactiver, fixe/%)
- Seuils retrait (minimum, max/mois, délai dispo)
- Attribution window (durée cookie)
- Anti-fraude (limites IP, domaines bloqués, rate limiting)
- Historique des modifications avec audit trail

#### 3. Gestion Affiliés
- Liste paginée avec recherche/filtres
- Statut : actif, suspendu, en alerte
- Actions : suspendre, réactiver, ajuster solde, voir détail
- Export CSV/Excel

#### 4. Détail Affilié
- Profil complet + taux capturés
- Liste de ses filleuls avec activité
- Historique commissions
- Historique retraits
- Actions manuelles (ajouter/retirer crédit, note interne)

#### 5. Gestion Commissions
- Liste toutes commissions (tous affiliés)
- Filtres : statut, type, date, affilié, filleul
- Actions : approuver, annuler, ajuster montant
- Détail calcul (base × taux = montant)

#### 6. Gestion Payouts
- **File d'attente** : demandes en attente de validation
- **En cours** : transferts Wise initiés
- **Historique** : payouts complétés/rejetés
- Actions : valider, rejeter (avec motif), voir reçu Wise
- **Total à payer ce mois**

#### 7. Rapports & Analytics
- Cohorts mensuelles
- Taux conversion par affilié
- LTV des filleuls
- Performance par source (UTM)
- Export PDF/Excel

#### 8. Alertes Fraude
- Inscriptions suspectes à valider
- Affiliés en alerte automatique
- Actions : valider, bloquer, marquer comme faux positif

### Exigence importante
**TOUT doit être configurable depuis la console admin** :
- Taux par défaut (inscription, appels, abonnements)
- Règles par action (activer/désactiver, fixe/%, montants, limites)
- Seuils retrait (minimum, délai disponibilité, max par mois)
- Anti-fraude (vérification email, blocage IP, limites parrainages)

### Métriques Financières Admin (OBLIGATOIRE)

Le dashboard admin DOIT afficher en temps réel :

```
┌─────────────────────────────────────────────────────────────────────┐
│  💰 FINANCES AFFILIATION                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ TOTAL À VERSER   │  │ EN ATTENTE       │  │ VERSÉ CE MOIS    │  │
│  │                  │  │ (demandes)       │  │                  │  │
│  │    12 450 €      │  │    3 200 €       │  │    8 100 €       │  │
│  │   (156 affiliés) │  │   (12 demandes)  │  │   (34 payouts)   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ COMMISSIONS      │  │ COMMISSIONS      │  │ TOTAL DISTRIBUÉ  │  │
│  │ AUJOURD'HUI      │  │ CE MOIS          │  │ (tout temps)     │  │
│  │    245 €         │  │    4 670 €       │  │   89 340 €       │  │
│  │   (23 actions)   │  │   (412 actions)  │  │   (depuis 2024)  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
│  [Voir détail]  [Exporter]  [Valider les payouts en attente]       │
└─────────────────────────────────────────────────────────────────────┘
```

Ces métriques sont calculées en temps réel depuis :
- `users` : somme de tous les `availableBalance`
- `affiliate_payouts` : demandes en attente (status: pending)
- `affiliate_commissions` : historique des commissions

## TRACKING AVANCÉ - POINTS À IMPLÉMENTER

### Attribution & Persistance
| Élément | Implémentation |
|---------|----------------|
| **Cookie + localStorage** | Stocker le code affilié dans les deux (cookie 30 jours + localStorage) |
| **Attribution window** | Configurable depuis admin (défaut: 30 jours). Si l'utilisateur revient après ce délai, pas d'attribution |
| **First-click attribution** | Le PREMIER lien affilié cliqué gagne (pas le dernier) - stocké avec timestamp |
| **Expiration tracking** | Vérifier si le cookie/localStorage n'est pas expiré avant d'attribuer |
| **Cross-device** | Si l'utilisateur se connecte sur un autre appareil avec le même email déjà lié à un référent, on garde le lien |

### UTM Parameters pour Affiliés
```typescript
// L'affilié peut ajouter des UTM à son lien pour tracker ses sources
// https://sos-expat.com/signup?ref=ABC123&utm_source=youtube&utm_campaign=video1

interface AffiliateReferralTracking {
  code: string;
  capturedAt: Timestamp;
  expiresAt: Timestamp;
  source: string | null;      // utm_source
  medium: string | null;      // utm_medium
  campaign: string | null;    // utm_campaign
  landingPage: string;        // URL de la page où le code a été capturé
}
```

### Analytics Avancés (Console Admin)
- **Taux de conversion** par affilié : visiteurs → inscrits → actifs
- **Cohorts** : performance par mois d'inscription
- **Lifetime Value** moyen des filleuls par affilié
- **Top sources** : quelles campagnes UTM performent le mieux
- **Tendances** : graphiques évolution gains/filleuls sur 12 mois
- **Comparaison** : benchmark affilié vs moyenne

### Détection Fraude Avancée
- **Rate limiting** : max 10 inscriptions/heure depuis même IP
- **Device fingerprinting** : détecter même navigateur pour inscriptions multiples
- **Email domain check** : bloquer domaines jetables (configurable)
- **Pattern detection** : alerter si inscriptions anormalement rapides
- **Auto-pause** : désactiver temporairement affilié suspect + alerte admin

## DÉCOUVERTES DES AGENTS - POINTS D'INTÉGRATION

### Système de Paiement (Agent 1)
- **Point d'intégration** : `StripeManager.ts` ligne 577 - ajouter affiliateId en metadata
- **Frais de connexion** : `commissionAmountCents` disponible dans `createPaymentIntent`
- **Webhook** : `subscription/webhooks.ts` - ajouter hook pour commission après `charge.succeeded`
- **Collection existante** : `payments` avec `commissionAmount` pour calculer %

### Console Admin (Agent 2)
- **Menu à modifier** : `src/config/adminMenu.ts` - section affiliation déjà prévue (commentée ligne 469-524)
- **Composants réutilisables** : `KPICard`, `DataTable` avec pagination curseur, `Modal`
- **Pattern export** : Voir `AdminClients.tsx` ligne 490-629 pour CSV
- **Graphiques** : Recharts déjà configuré avec couleurs cohérentes

### Inscription Utilisateur (Agent 3)
- **Capture UTM existante** : `trafficSource.ts` - ajouter `ref` aux paramètres capturés
- **Stockage** : `sos_traffic_source` en localStorage (first-touch) + sessionStorage
- **Formulaires** : `RegisterClient.tsx`, `RegisterExpat.tsx`, `RegisterLawyer.tsx`
- **Pattern** : Utiliser `searchParams.get('ref')` puis stocker dans userData

### Sécurité Firestore (Agent 4)
- **Collections manquantes** : `affiliate_codes`, `referrals` n'ont PAS de règles
- **Pattern existant** : Voir `sos_profiles` ligne 87-124 pour protection champs
- **Méthode** : `.diff().affectedKeys().hasAny([...])` pour bloquer modifications
- **Index requis** : `(userId, isActive, createdAt DESC)`, `(affiliateId, status, createdAt DESC)`

### Notifications (Agent 5)
- **Pipeline existant** : `message_events` collection → `onMessageEventCreate` trigger
- **Templates** : `message_templates/{locale}/items/{eventId}`
- **Routing** : `sos-expat-message-routing.json` - ajouter 4 nouveaux eventIds
- **Pattern** : Voir `paymentNotifications.ts` pour exemple

### Abonnements IA (Agent 6)
- **Détection renouvellement** : `invoice.billing_reason === 'subscription_cycle'`
- **Nouvelle souscription** : `invoice.billing_reason === 'subscription_create'`
- **Hook** : `handleInvoicePaid()` dans `webhooks.ts` ligne 1161
- **Montant** : `invoice.amount_paid / 100` pour EUR

### Dashboard User (Agent 7)
- **Structure** : Tabs via URL `?tab=affiliation`
- **Ajouter** : `"affiliation" | "piggy-bank"` à `TabType` ligne 222
- **Composants** : `DashboardStats`, `QuickActions`, `ProviderEarnings` réutilisables
- **Mobile** : `MobileBottomNav`, `MobileSideDrawer` existants

### Sessions d'Appel (Agent 8)
- **Frais de connexion** : `pricingService.ts` → `connectionFeeAmount`
- **Fin d'appel** : `handleConferenceEnd()` dans `TwilioConferenceWebhook.ts` ligne 298
- **Condition** : Commission seulement si `billingDuration >= 120s` (2 min)
- **Premier appel** : Query `call_sessions` where `status=completed` limit 1

### Configuration Admin (Agent 9)
- **Collection** : `admin_config/{docId}` - ajouter doc `affiliate_config`
- **Audit** : Toujours inclure `updatedAt: serverTimestamp()`, `updatedBy: uid`
- **Pattern** : `merge: true` pour préserver historique
- **Cache** : 5 min avec `clear()` après modifications

### Internationalisation (Agent 10)
- **System** : react-i18next + react-intl (dual system)
- **9 langues** : fr, en, es, de, pt, ru, zh, ar, hi
- **RTL** : Arabe nécessite `dir="rtl"` et classes inversées
- **Fichiers** : `src/locales/{locale}/affiliate.json`

## POINTS CRITIQUES À RÉSOUDRE

| Priorité | Point | Solution | Fichier concerné |
|----------|-------|----------|------------------|
| P0 | Chiffrement coordonnées bancaires | AES-256-CBC, clé dans Secret Manager | `affiliate/utils/encryption.ts` |
| P0 | Protection champs Firestore | `.diff().affectedKeys().hasAny()` | `firestore.rules` |
| P0 | Trigger robuste | `onDocumentCreated` sur `users/{uid}` | `affiliate/triggers/onUserCreated.ts` |
| P0 | Attribution window | Cookie 30j + localStorage | `src/utils/affiliateTracking.ts` |
| P0 | Règles Firestore manquantes | Ajouter `affiliate_codes`, `referrals` | `firestore.rules` |
| P1 | Anti-fraude | Rate limiting, IP check, device fingerprint | `affiliate/utils/fraudDetection.ts` |
| P1 | Commissions flexibles | `type: 'fixed' \| 'percentage' \| 'hybrid'` | `affiliate/types.ts` |
| P1 | UTM tracking | Étendre `trafficSource.ts` | `src/utils/trafficSource.ts` |
| P1 | Index Firestore | 6 nouveaux index composites | `firestore.indexes.json` |
| P2 | Templates notifications | 7 types × 9 langues = 63 templates | `message_templates/` |

## APPROCHE D'IMPLÉMENTATION

Procède **phase par phase** dans l'ordre strict du plan :

### Phase 1 : Infrastructure & Sécurité (2-3h)
- Types TypeScript
- Service de chiffrement
- Collection `affiliate_config` avec structure complète
- Règles Firestore
- Index Firestore

### Phase 2 : Backend Core (4-6h)
- Utilitaires (génération code, calcul commission)
- Trigger setup affilié à l'inscription
- Service de commission générique
- Triggers : appel complété, abonnement créé, renouvellement
- Scheduled : libération commissions après holdPeriod
- Callables user : données, coordonnées bancaires

### Phase 3 : Intégration Wise (2-3h)
- Client API Wise
- Services : recipient, quote, transfer
- Callable demande retrait
- Traitement payout
- Webhook Wise

### Phase 4 : Frontend User (3-4h)
- Hook useAffiliate
- 6 pages dashboard
- Modification inscription (capture code URL)
- Routes et menu

### Phase 5 : Console Admin (4-5h)
- Hook useAffiliateAdmin
- 7 pages admin
- Callables admin
- Routes et menu admin

### Phase 6 : Notifications (1-2h)
- Templates email (7 types x 9 langues)
- Intégration pipeline existant

### Phase 7 : Tests & Finalisation (2-3h)
- Tests manuels scénarios
- Export index.ts
- Déploiement

## INSTRUCTIONS

1. **Commence par lire les 3 fichiers de référence** dans le projet
2. **Démarre par la Phase 1** - ne saute pas d'étapes
3. **Pour chaque fichier créé**, assure-toi qu'il suit les patterns existants du projet
4. **Utilise les collections existantes** quand c'est pertinent (users, message_events, etc.)
5. **Teste chaque phase** avant de passer à la suivante
6. **Demande-moi validation** entre chaque phase si nécessaire

## STRUCTURE DE FICHIERS ATTENDUE

```
sos/firebase/functions/src/affiliate/
├── types.ts
├── utils/
│   ├── encryption.ts           # Chiffrement AES-256 coordonnées bancaires
│   ├── codeGenerator.ts        # Génération codes affiliés uniques
│   ├── commissionCalculator.ts # Calcul commissions (fixe/%, taux figés)
│   └── fraudDetection.ts       # Détection patterns suspects, rate limiting
├── triggers/
│   ├── onUserCreated.ts        # Setup affilié + attribution referrer
│   ├── onCallCompleted.ts      # Commission sur appels
│   ├── onSubscriptionCreated.ts
│   └── onSubscriptionRenewed.ts
├── services/
│   ├── commissionService.ts    # Création/gestion commissions
│   ├── balanceService.ts       # Gestion tirelire
│   └── analyticsService.ts     # Calcul KPIs, cohorts, tendances
├── callables/
│   ├── getAffiliateData.ts
│   ├── updateBankDetails.ts
│   ├── requestWithdrawal.ts
│   └── admin/                  # Callables admin
├── webhooks/
│   └── wiseWebhook.ts          # Statut transferts Wise
└── scheduled/
    ├── releaseHeldCommissions.ts
    └── generateDailyStats.ts   # Stats pour analytics

sos/src/
├── hooks/
│   ├── useAffiliate.ts         # Hook données affilié user
│   ├── useAffiliateAdmin.ts    # Hook admin
│   └── useAffiliateTracking.ts # Hook capture code URL → cookie/localStorage
├── utils/
│   └── affiliateTracking.ts    # Fonctions cookie/localStorage avec expiration
├── pages/dashboard/affiliate/
│   ├── AffiliateDashboard.tsx
│   ├── AffiliateEarnings.tsx
│   ├── AffiliateReferrals.tsx
│   ├── AffiliateWithdraw.tsx
│   ├── AffiliateBankDetails.tsx
│   └── AffiliateTools.tsx      # Outils partage, liens UTM personnalisables
└── pages/admin/affiliate/
    ├── AdminAffiliateDashboard.tsx  # KPIs, graphiques, tendances
    ├── AdminAffiliateConfig.tsx     # Config complète (taux, rules, anti-fraude)
    ├── AdminAffiliateList.tsx       # Liste affiliés avec filtres
    ├── AdminAffiliateDetail.tsx     # Détail affilié + ses filleuls
    ├── AdminAffiliateCommissions.tsx
    ├── AdminAffiliatePayouts.tsx
    ├── AdminAffiliateReports.tsx    # Exports, cohorts, analytics avancés
    └── AdminAffiliateFraudAlerts.tsx # Alertes fraude à valider
```

## VALIDATION INTER-PHASES

Ce prompt unique couvre les 7 phases. Procède ainsi :

1. **Après chaque phase terminée**, propose un résumé des fichiers créés
2. **Demande validation** avant de passer à la phase suivante
3. **Si le contexte devient trop long**, indique "Phase X terminée - continue dans une nouvelle conversation avec : Phase X+1"

## EN CAS DE CONTINUATION

Si tu reprends depuis une phase intermédiaire, précise :
- "Je reprends à la Phase X"
- Lis les fichiers déjà créés dans `sos/firebase/functions/src/affiliate/` et `sos/src/pages/`
- Continue sans refaire les phases précédentes

## INTERNATIONALISATION OBLIGATOIRE - 9 LANGUES

### Langues requises
| Code | Langue | RTL |
|------|--------|-----|
| `fr` | Français | Non |
| `en` | Anglais | Non |
| `es` | Espagnol | Non |
| `de` | Allemand | Non |
| `pt` | Portugais | Non |
| `ru` | Russe | Non |
| `zh` | Chinois | Non |
| `ar` | Arabe | **Oui** |
| `hi` | Hindi | Non |

### Fichiers de traduction à créer/modifier
```
sos/src/locales/
├── fr-fr/affiliate.json
├── en/affiliate.json
├── es-es/affiliate.json
├── de-de/affiliate.json
├── pt-pt/affiliate.json
├── ru-ru/affiliate.json
├── zh-cn/affiliate.json
├── ar-sa/affiliate.json   # RTL
└── hi-in/affiliate.json
```

### Structure des clés de traduction
```json
{
  "affiliate": {
    "menu": {
      "dashboard": "Mon Affiliation",
      "earnings": "Mes Gains",
      "referrals": "Mes Filleuls",
      "withdraw": "Retirer",
      "bankDetails": "Coordonnées Bancaires",
      "tools": "Outils de Partage"
    },
    "dashboard": {
      "title": "Programme d'Affiliation",
      "subtitle": "Parrainez vos proches et gagnez des commissions à vie !",
      "yourCode": "Votre code",
      "copyLink": "Copier le lien",
      "share": "Partager"
    },
    "piggyBank": {
      "title": "Ma Tirelire",
      "totalEarned": "Total gagné",
      "available": "Disponible",
      "pending": "En attente",
      "withdrawn": "Déjà retiré",
      "withdrawButton": "Retirer {{amount}}",
      "minWithdraw": "Minimum de retrait : {{amount}}"
    },
    "earnings": {
      "title": "Historique des Gains",
      "type": "Type",
      "amount": "Montant",
      "status": "Statut",
      "date": "Date",
      "referral": "Filleul"
    },
    "referrals": {
      "title": "Mes Filleuls",
      "name": "Nom",
      "registeredAt": "Inscrit le",
      "activity": "Activité",
      "commissionsGenerated": "Commissions générées"
    },
    "withdraw": {
      "title": "Demande de Retrait",
      "amount": "Montant à retirer",
      "bankAccount": "Compte bancaire",
      "submit": "Demander le retrait",
      "pendingRequest": "Demande en cours de traitement"
    },
    "bankDetails": {
      "title": "Coordonnées Bancaires",
      "iban": "IBAN",
      "bic": "BIC/SWIFT",
      "accountHolder": "Titulaire du compte",
      "save": "Enregistrer"
    },
    "status": {
      "pending": "En attente",
      "available": "Disponible",
      "processing": "En cours",
      "completed": "Complété",
      "failed": "Échoué"
    },
    "notifications": {
      "codeCopied": "Code copié !",
      "linkCopied": "Lien copié !",
      "withdrawRequested": "Demande de retrait envoyée",
      "bankDetailsSaved": "Coordonnées enregistrées"
    }
  }
}
```

### Utilisation dans les composants
```tsx
import { FormattedMessage, useIntl } from 'react-intl';

// Texte simple
<FormattedMessage id="affiliate.dashboard.title" />

// Avec paramètres
<FormattedMessage
  id="affiliate.piggyBank.withdrawButton"
  values={{ amount: formatCurrency(balance) }}
/>

// Dans le code
const intl = useIntl();
const label = intl.formatMessage({ id: 'affiliate.menu.dashboard' });
```

### Support RTL (Arabe)
```tsx
// Détecter RTL
const isRTL = locale === 'ar';

// Appliquer direction
<div dir={isRTL ? 'rtl' : 'ltr'} className={isRTL ? 'text-right' : 'text-left'}>
  ...
</div>
```

---

## WIDGETS AFFILIÉS (PRÉPARATION FUTURE)

### Structure prévue pour les widgets
```typescript
// Chaque utilisateur aura un widget personnalisé avec son lien affilié
interface AffiliateWidget {
  id: string;
  userId: string;
  affiliateCode: string;
  type: 'banner' | 'button' | 'card' | 'popup';
  size: 'small' | 'medium' | 'large';
  style: {
    primaryColor: string;
    textColor: string;
    borderRadius: number;
  };
  tracking: {
    impressions: number;
    clicks: number;
    conversions: number;
  };
  embedCode: string;  // Code à copier/coller
  previewUrl: string;
}
```

### Page outils de partage (AffiliateTools.tsx)
- Lien personnalisé avec UTM builder
- Bannières pré-faites (plusieurs tailles)
- Code d'intégration widget
- QR Code avec lien affilié
- Boutons de partage réseaux sociaux

---

Commence maintenant par lire les fichiers de référence puis démarre la Phase 1.

---

# PROMPT DE VÉRIFICATION FINALE

**À utiliser APRÈS l'implémentation complète pour valider que tout est production-ready.**

Copiez ce prompt dans une nouvelle conversation :

---

## VÉRIFICATION SYSTÈME D'AFFILIATION SOS-EXPAT

Je viens d'implémenter le système d'affiliation. Vérifie que TOUT est correctement implémenté, sans erreurs, sans mocks, et production-ready.

### CHECKLIST DE VÉRIFICATION

#### 1. BACKEND - Cloud Functions
- [ ] Tous les fichiers existent dans `sos/firebase/functions/src/affiliate/`
- [ ] Aucun `console.log` de debug restant (sauf logs structurés)
- [ ] Aucune donnée mockée ou en dur
- [ ] Toutes les fonctions exportées dans `index.ts`
- [ ] Types TypeScript stricts (pas de `any`)
- [ ] Gestion d'erreurs complète (try/catch)
- [ ] Validation des inputs (zod ou manual)
- [ ] Secrets dans Secret Manager (pas en dur)

#### 2. SÉCURITÉ
- [ ] Règles Firestore ajoutées pour toutes les collections
- [ ] Champs sensibles protégés (affiliateCode, balances, capturedRates)
- [ ] Chiffrement AES-256 pour coordonnées bancaires
- [ ] Rate limiting anti-fraude implémenté
- [ ] Validation côté serveur (pas seulement client)

#### 3. FRONTEND USER
- [ ] 6 pages créées dans `sos/src/pages/dashboard/affiliate/`
- [ ] Hook `useAffiliate` fonctionnel
- [ ] Toutes les pages responsive (mobile-first)
- [ ] Dark mode supporté
- [ ] Loading states avec skeletons
- [ ] Error states avec messages utilisateur
- [ ] Aucun texte en dur (tout en i18n)

#### 4. CONSOLE ADMIN
- [ ] 8 pages créées dans `sos/src/pages/admin/affiliate/`
- [ ] Hook `useAffiliateAdmin` fonctionnel
- [ ] Dashboard avec KPIs temps réel
- [ ] Total à verser affiché correctement
- [ ] Export CSV/Excel fonctionnel
- [ ] Filtres et pagination

#### 5. INTERNATIONALISATION
- [ ] 9 fichiers de traduction créés (fr, en, es, de, pt, ru, zh, ar, hi)
- [ ] Toutes les clés traduites (pas de texte manquant)
- [ ] RTL supporté pour l'arabe
- [ ] Formats monétaires localisés

#### 6. INTÉGRATIONS
- [ ] Trigger sur création user fonctionnel
- [ ] Commission sur appels calculée correctement
- [ ] Commission sur abonnements calculée correctement
- [ ] Wise API configurée (sandbox puis prod)
- [ ] Webhooks Wise configurés
- [ ] Notifications email configurées (7 types)

#### 7. TRACKING & ATTRIBUTION
- [ ] Cookie 30 jours + localStorage
- [ ] Attribution window configurable
- [ ] UTM parameters capturés
- [ ] First-click attribution

#### 8. TESTS MANUELS À EFFECTUER
```
1. Inscription avec code affilié
   - Visiter /?ref=TESTCODE
   - Vérifier cookie stocké
   - S'inscrire
   - Vérifier referredBy dans Firestore
   - Vérifier commission créée pour le parrain

2. Génération de code à l'inscription
   - Créer un nouveau compte
   - Vérifier affiliateCode généré (6-8 chars)
   - Vérifier capturedRates figés

3. Commission sur appel
   - Faire un appel test (>2 min)
   - Vérifier commission créée
   - Vérifier calcul correct (% des frais)

4. Demande de retrait
   - Avoir ≥30€ disponible
   - Renseigner coordonnées bancaires
   - Demander retrait
   - Vérifier document affiliate_payouts créé

5. Console admin
   - Voir total à verser
   - Valider un payout
   - Modifier config (taux)
   - Exporter CSV
```

### COMMANDES DE VÉRIFICATION

```bash
# Vérifier compilation TypeScript
cd sos/firebase/functions && npm run build

# Vérifier linting
npm run lint

# Déployer en mode dry-run
firebase deploy --only functions --dry-run

# Vérifier règles Firestore
firebase deploy --only firestore:rules --dry-run

# Vérifier index Firestore
firebase deploy --only firestore:indexes --dry-run
```

### STRUCTURE ATTENDUE - VÉRIFICATION FICHIERS

```bash
# Backend
ls sos/firebase/functions/src/affiliate/
# Doit contenir: types.ts, utils/, triggers/, services/, callables/, webhooks/, scheduled/

# Frontend User
ls sos/src/pages/dashboard/affiliate/
# Doit contenir: AffiliateDashboard.tsx, AffiliateEarnings.tsx, AffiliateReferrals.tsx,
#                AffiliateWithdraw.tsx, AffiliateBankDetails.tsx, AffiliateTools.tsx

# Frontend Admin
ls sos/src/pages/admin/affiliate/
# Doit contenir: AdminAffiliateDashboard.tsx, AdminAffiliateConfig.tsx, AdminAffiliateList.tsx,
#                AdminAffiliateDetail.tsx, AdminAffiliateCommissions.tsx, AdminAffiliatePayouts.tsx,
#                AdminAffiliateReports.tsx, AdminAffiliateFraudAlerts.tsx

# Traductions
ls sos/src/locales/*/affiliate.json
# Doit contenir 9 fichiers (un par langue)
```

### CE QUI NE DOIT PAS EXISTER

- [ ] Aucun `TODO` ou `FIXME` non résolu
- [ ] Aucun `// @ts-ignore` ou `// @ts-nocheck`
- [ ] Aucune fonction vide ou stub
- [ ] Aucun `throw new Error('Not implemented')`
- [ ] Aucune clé API en dur dans le code
- [ ] Aucun `localhost` ou URL de dev
- [ ] Aucun `console.log` de debug

### RAPPORT DE VÉRIFICATION

Après vérification, génère un rapport avec :
1. ✅ Points validés
2. ❌ Points à corriger (avec fichier et ligne)
3. ⚠️ Améliorations suggérées
4. 📊 Score de production-readiness (0-100%)

---

Commence la vérification maintenant.
