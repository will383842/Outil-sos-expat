# ANALYSE COMPLÈTE DU SYSTÈME D'AFFILIATION SOS-EXPAT
## VERSION 2 - ENRICHIE

**Date d'analyse :** 26 janvier 2026
**Analysé par :** Claude Opus 4.5
**Version :** 2.0 - Complète avec commissions flexibles

---

## TABLE DES MATIÈRES

1. [Points Manquants Identifiés](#1-points-manquants-identifiés)
2. [Architecture Flexible des Commissions](#2-architecture-flexible-des-commissions)
3. [Frontend Utilisateur - Onglet Tirelire Complet](#3-frontend-utilisateur---onglet-tirelire-complet)
4. [Console Admin - Section Affiliation Complète](#4-console-admin---section-affiliation-complète)
5. [Modèle de Données Enrichi](#5-modèle-de-données-enrichi)
6. [Points Positifs](#6-points-positifs)
7. [Points Négatifs / Lacunes du CDC](#7-points-négatifs--lacunes-du-cdc)
8. [Recommandations Complètes](#8-recommandations-complètes)

---

## 1. POINTS MANQUANTS IDENTIFIÉS

### Ce que le CDC actuel couvre :
- ✅ Code affilié auto-généré à l'inscription
- ✅ Taux de commission figé à vie
- ✅ Tirelire (concept de base)
- ✅ Retrait via Wise
- ✅ Commission sur appels uniquement

### Ce qui MANQUE dans le CDC :

| Élément manquant | Impact | Criticité |
|------------------|--------|-----------|
| **Commissions FIXES** (pas seulement %) | Ne peut pas offrir "5€ par inscription" | 🔴 CRITIQUE |
| **Actions multiples** (inscription, 1er appel, abonnement, widget) | Limité aux appels seulement | 🔴 CRITIQUE |
| **Interface Tirelire complète** | Juste un mockup basique | 🟠 IMPORTANT |
| **Console Admin détaillée** | Manque 80% des fonctionnalités admin | 🔴 CRITIQUE |
| **Historique des transactions** | Pas de détail par commission | 🟠 IMPORTANT |
| **Export et rapports** | Aucun export prévu | 🟠 IMPORTANT |
| **Gestion manuelle par admin** | Pas d'ajustement manuel possible | 🟠 IMPORTANT |
| **Widgets/outils marketing** | Aucun widget de partage | 🟡 SOUHAITABLE |

---

## 2. ARCHITECTURE FLEXIBLE DES COMMISSIONS

### 2.1 Principe : Types de Commissions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TYPES DE COMMISSIONS SUPPORTÉS                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │   POURCENTAGE   │    │     FIXE        │    │    HYBRIDE      │        │
│  │                 │    │                 │    │                 │        │
│  │  75% des frais  │    │  5€ par action  │    │ 3€ + 10% frais  │        │
│  │  de connexion   │    │  (inscription,  │    │                 │        │
│  │                 │    │   1er appel)    │    │                 │        │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Actions Génératrices de Commission

| Action | Type suggéré | Exemple |
|--------|--------------|---------|
| **Inscription filleul** | Fixe | 2€ par inscription validée |
| **1er appel du filleul** | Fixe ou % | 5€ ou 50% frais connexion |
| **Chaque appel suivant** | % | 20% des frais de connexion |
| **Souscription abonnement IA** | Fixe ou % | 10€ ou 15% du 1er mois |
| **Renouvellement abonnement** | % | 5% récurrent |
| **Achat pack spécial** | Fixe | 3€ par pack |
| **Parrainage prestataire validé** | Fixe | 20€ si KYC complété |

### 2.3 Structure de Configuration Admin

```typescript
// Collection: admin_config/affiliate_rules
interface AffiliateRulesConfig {
  // ═══════════════════════════════════════════════════════════════════
  // RÈGLES DE COMMISSION PAR ACTION
  // ═══════════════════════════════════════════════════════════════════

  commissionRules: {
    // Inscription d'un filleul
    referral_signup: {
      enabled: boolean;
      type: 'fixed' | 'percentage' | 'hybrid';
      fixedAmount: number;        // En centimes (500 = 5€)
      percentageRate: number;     // 0.75 = 75%
      baseAmount: number | null;  // Pour hybrid: montant de base
      conditions: {
        requireEmailVerification: boolean;
        minAccountAgeDays: number;
        onlyFirstTime: boolean;   // true = une seule fois par filleul
      };
      description: string;        // "5€ par inscription validée"
    };

    // Premier appel du filleul
    referral_first_call: {
      enabled: boolean;
      type: 'fixed' | 'percentage' | 'hybrid';
      fixedAmount: number;
      percentageRate: number;
      baseAmount: number | null;
      applyTo: 'connection_fee' | 'total_amount';  // Sur quoi calculer le %
      conditions: {
        minCallDuration: number;  // Secondes (120 = 2min)
        providerTypes: ('lawyer' | 'helper')[];
      };
      description: string;
    };

    // Appels récurrents
    referral_recurring_call: {
      enabled: boolean;
      type: 'fixed' | 'percentage' | 'hybrid';
      fixedAmount: number;
      percentageRate: number;
      baseAmount: number | null;
      applyTo: 'connection_fee' | 'total_amount';
      conditions: {
        minCallDuration: number;
        providerTypes: ('lawyer' | 'helper')[];
        maxCallsPerMonth: number; // 0 = illimité
        lifetimeLimit: number;    // 0 = illimité (à vie)
      };
      description: string;
    };

    // Souscription abonnement IA
    referral_subscription: {
      enabled: boolean;
      type: 'fixed' | 'percentage' | 'hybrid';
      fixedAmount: number;
      percentageRate: number;
      baseAmount: number | null;
      applyTo: 'first_month' | 'annual_value';
      conditions: {
        planTypes: string[];      // ['solo', 'multi', 'enterprise']
        onlyFirstSubscription: boolean;
      };
      description: string;
    };

    // Renouvellement récurrent
    referral_subscription_renewal: {
      enabled: boolean;
      type: 'fixed' | 'percentage';
      fixedAmount: number;
      percentageRate: number;
      conditions: {
        maxMonths: number;        // 0 = à vie, 12 = 1 an max
      };
      description: string;
    };

    // Parrainage d'un prestataire (bonus si devient actif)
    referral_provider_validated: {
      enabled: boolean;
      type: 'fixed';
      fixedAmount: number;        // Bonus si prestataire validé KYC
      conditions: {
        requireKYCComplete: boolean;
        requireFirstCall: boolean;
      };
      description: string;
    };
  };

  // ═══════════════════════════════════════════════════════════════════
  // TAUX PAR DÉFAUT (pour nouveaux inscrits)
  // ═══════════════════════════════════════════════════════════════════

  defaultRates: {
    // Taux capturés à l'inscription
    signupBonus: number;          // Fixe en centimes
    callCommissionRate: number;   // % (0.75 = 75%)
    subscriptionRate: number;     // % (0.15 = 15%)
  };

  // ═══════════════════════════════════════════════════════════════════
  // RÈGLES GLOBALES
  // ═══════════════════════════════════════════════════════════════════

  globalSettings: {
    isSystemActive: boolean;
    withdrawalsEnabled: boolean;
    newAffiliatesEnabled: boolean;
    minimumWithdrawal: number;    // Centimes (3000 = 30€)
    holdPeriodHours: number;      // Délai avant dispo (0 = immédiat)
    maxWithdrawalsPerMonth: number;

    // Anti-fraude
    requireEmailVerification: boolean;
    minAccountAgeDays: number;
    maxReferralsPerDay: number;
    blockSameIPReferrals: boolean;
  };

  // ═══════════════════════════════════════════════════════════════════
  // HISTORIQUE DES CHANGEMENTS
  // ═══════════════════════════════════════════════════════════════════

  rateHistory: Array<{
    changedAt: Timestamp;
    changedBy: string;
    changedByEmail: string;
    previousRates: object;
    newRates: object;
    reason: string;
  }>;

  updatedAt: Timestamp;
  updatedBy: string;
}
```

### 2.4 Taux FIGÉ À VIE - Mécanisme

```typescript
// À l'inscription, on CAPTURE les taux actuels dans le profil utilisateur

interface UserAffiliateProfile {
  affiliateCode: string;
  referredBy: string | null;

  // ═══════════════════════════════════════════════════════════════════
  // TAUX PERSONNELS - FIGÉS À L'INSCRIPTION
  // ═══════════════════════════════════════════════════════════════════

  // Ces valeurs sont capturées à l'inscription et NE CHANGENT JAMAIS
  capturedRates: {
    capturedAt: Timestamp;
    signupBonus: number;           // Bonus fixe par inscription filleul
    callCommissionRate: number;    // % sur appels (0.75 = 75%)
    callFixedBonus: number;        // Bonus fixe par appel
    subscriptionRate: number;      // % sur abonnements
    subscriptionFixedBonus: number;
    providerValidationBonus: number;
  };

  // ═══════════════════════════════════════════════════════════════════
  // TIRELIRE
  // ═══════════════════════════════════════════════════════════════════

  // Total historique (ne diminue jamais)
  totalEarned: number;            // Centimes

  // Disponible au retrait
  availableBalance: number;       // Centimes

  // En attente (holdPeriod non écoulé)
  pendingBalance: number;         // Centimes

  // Déjà retiré = totalEarned - availableBalance - pendingBalance

  // ═══════════════════════════════════════════════════════════════════
  // STATISTIQUES
  // ═══════════════════════════════════════════════════════════════════

  stats: {
    totalReferrals: number;       // Nombre de filleuls
    activeReferrals: number;      // Filleuls ayant fait ≥1 action
    totalCommissions: number;     // Nombre de commissions reçues

    // Détail par type
    byType: {
      signup: { count: number; amount: number };
      firstCall: { count: number; amount: number };
      recurringCall: { count: number; amount: number };
      subscription: { count: number; amount: number };
      renewal: { count: number; amount: number };
      providerBonus: { count: number; amount: number };
    };
  };

  // ═══════════════════════════════════════════════════════════════════
  // COORDONNÉES BANCAIRES
  // ═══════════════════════════════════════════════════════════════════

  bankDetails: BankDetails | null;
  pendingPayoutId: string | null;
}
```

---

## 3. FRONTEND UTILISATEUR - ONGLET TIRELIRE COMPLET

### 3.1 Structure des Pages

```
/dashboard
├── /affiliate                    # Page principale affiliation
│   ├── Résumé tirelire
│   ├── Lien de partage
│   └── Stats rapides
│
├── /affiliate/earnings           # Détail des gains
│   ├── Historique commissions
│   ├── Filtres par type/date
│   └── Export CSV
│
├── /affiliate/referrals          # Mes filleuls
│   ├── Liste des filleuls
│   ├── Activité par filleul
│   └── Stats conversion
│
├── /affiliate/withdraw           # Retrait
│   ├── Formulaire retrait
│   ├── Historique retraits
│   └── Statut en cours
│
├── /affiliate/bank-details       # Coordonnées bancaires
│   ├── Formulaire IBAN/etc
│   └── Vérification statut
│
└── /affiliate/tools              # Outils marketing
    ├── Widgets à intégrer
    ├── Bannières
    └── Liens trackés
```

### 3.2 Dashboard Tirelire - Design Complet

```tsx
// src/pages/dashboard/affiliate/AffiliateDashboard.tsx

export default function AffiliateDashboard() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">

      {/* ═══════════════════════════════════════════════════════════════
          HEADER - LIEN DE PARTAGE
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Programme d'Affiliation</h1>
            <p className="text-indigo-200">
              Parrainez vos proches et gagnez des commissions à vie !
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-indigo-200">Votre code</p>
            <p className="text-2xl font-mono font-bold">{user.affiliateCode}</p>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <input
            value={`https://sos-expat.com/signup?ref=${user.affiliateCode}`}
            readOnly
            className="flex-1 px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/50"
          />
          <button className="px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold flex items-center gap-2">
            <Copy size={18} /> Copier le lien
          </button>
          <button className="px-6 py-3 bg-white/20 text-white rounded-lg font-semibold flex items-center gap-2">
            <Share2 size={18} /> Partager
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TIRELIRE PRINCIPALE
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200 overflow-hidden">
        <div className="bg-amber-50 px-6 py-4 border-b border-amber-200">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🐷</span>
            <div>
              <h2 className="text-xl font-bold text-amber-900">Ma Tirelire</h2>
              <p className="text-amber-700 text-sm">Vos gains d'affiliation</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-4 gap-6">
            {/* Total gagné */}
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-gray-500 text-sm mb-1">Total gagné</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(user.totalEarned)}
              </p>
              <p className="text-xs text-gray-400 mt-1">depuis le début</p>
            </div>

            {/* Disponible */}
            <div className="text-center p-4 bg-green-50 rounded-xl border-2 border-green-200">
              <p className="text-green-700 text-sm mb-1 font-medium">Disponible</p>
              <p className="text-4xl font-bold text-green-600">
                {formatCurrency(user.availableBalance)}
              </p>
              <p className="text-xs text-green-500 mt-1">prêt à retirer</p>
            </div>

            {/* En attente */}
            <div className="text-center p-4 bg-orange-50 rounded-xl">
              <p className="text-orange-600 text-sm mb-1">En attente</p>
              <p className="text-3xl font-bold text-orange-500">
                {formatCurrency(user.pendingBalance)}
              </p>
              <p className="text-xs text-orange-400 mt-1">sera dispo dans 24h</p>
            </div>

            {/* Déjà retiré */}
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-gray-500 text-sm mb-1">Déjà retiré</p>
              <p className="text-3xl font-bold text-gray-600">
                {formatCurrency(user.totalEarned - user.availableBalance - user.pendingBalance)}
              </p>
              <p className="text-xs text-gray-400 mt-1">versé sur votre compte</p>
            </div>
          </div>

          {/* Bouton retrait */}
          <div className="mt-6 flex items-center justify-between border-t pt-6">
            <div>
              {user.bankDetails ? (
                <span className="text-green-600 flex items-center gap-2">
                  <CheckCircle size={18} /> Compte bancaire configuré
                </span>
              ) : (
                <Link to="/dashboard/affiliate/bank-details" className="text-blue-600 underline">
                  Configurer mon compte bancaire
                </Link>
              )}
            </div>

            <button
              disabled={user.availableBalance < 3000 || !user.bankDetails || user.pendingPayoutId}
              className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg hover:shadow-xl transition-shadow"
            >
              <Wallet size={24} />
              Retirer {formatCurrency(user.availableBalance)}
            </button>
          </div>

          {user.availableBalance < 3000 && (
            <p className="text-right text-sm text-gray-500 mt-2">
              Minimum de retrait : 30€
            </p>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MES TAUX DE COMMISSION (FIGÉS À VIE)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Percent size={20} className="text-indigo-600" />
          Mes taux de commission
          <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">
            Figés à vie depuis votre inscription
          </span>
        </h3>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-indigo-50 rounded-xl text-center">
            <p className="text-indigo-600 text-sm font-medium">Par inscription</p>
            <p className="text-2xl font-bold text-indigo-700">
              {formatCurrency(user.capturedRates.signupBonus)}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-xl text-center">
            <p className="text-green-600 text-sm font-medium">Sur les appels</p>
            <p className="text-2xl font-bold text-green-700">
              {(user.capturedRates.callCommissionRate * 100).toFixed(0)}%
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl text-center">
            <p className="text-purple-600 text-sm font-medium">Sur abonnements</p>
            <p className="text-2xl font-bold text-purple-700">
              {(user.capturedRates.subscriptionRate * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-4 text-center">
          Ces taux ont été capturés le {formatDate(user.capturedRates.capturedAt)}
          et restent identiques même si les taux généraux changent.
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          STATISTIQUES
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="text-blue-600" />}
          label="Filleuls"
          value={user.stats.totalReferrals}
          subValue={`${user.stats.activeReferrals} actifs`}
        />
        <StatCard
          icon={<Phone className="text-green-600" />}
          label="Appels générés"
          value={user.stats.byType.firstCall.count + user.stats.byType.recurringCall.count}
          subValue={formatCurrency(user.stats.byType.firstCall.amount + user.stats.byType.recurringCall.amount)}
        />
        <StatCard
          icon={<CreditCard className="text-purple-600" />}
          label="Abonnements"
          value={user.stats.byType.subscription.count}
          subValue={formatCurrency(user.stats.byType.subscription.amount)}
        />
        <StatCard
          icon={<TrendingUp className="text-orange-600" />}
          label="Ce mois"
          value={formatCurrency(thisMonthEarnings)}
          subValue={`${thisMonthCommissions} commissions`}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          DERNIÈRES COMMISSIONS
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="font-bold">Dernières commissions</h3>
          <Link to="/dashboard/affiliate/earnings" className="text-indigo-600 text-sm">
            Voir tout →
          </Link>
        </div>

        <div className="divide-y">
          {recentCommissions.map(commission => (
            <div key={commission.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${getTypeColor(commission.type)}`}>
                  {getTypeIcon(commission.type)}
                </div>
                <div>
                  <p className="font-medium">{getTypeLabel(commission.type)}</p>
                  <p className="text-sm text-gray-500">
                    {commission.refereeEmail} • {formatDate(commission.createdAt)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-600">+{formatCurrency(commission.amount)}</p>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(commission.status)}`}>
                  {getStatusLabel(commission.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          NAVIGATION RAPIDE
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-4 gap-4">
        <NavCard to="/dashboard/affiliate/referrals" icon={<Users />} label="Mes filleuls" />
        <NavCard to="/dashboard/affiliate/earnings" icon={<Euro />} label="Historique gains" />
        <NavCard to="/dashboard/affiliate/withdraw" icon={<Wallet />} label="Mes retraits" />
        <NavCard to="/dashboard/affiliate/tools" icon={<Share2 />} label="Outils partage" />
      </div>

    </div>
  );
}
```

### 3.3 Page Historique des Gains

```tsx
// src/pages/dashboard/affiliate/AffiliateEarnings.tsx

export default function AffiliateEarnings() {
  const [filter, setFilter] = useState({
    type: 'all',        // 'all' | 'signup' | 'call' | 'subscription' | etc.
    status: 'all',      // 'all' | 'pending' | 'available' | 'paid'
    dateFrom: null,
    dateTo: null,
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Historique des gains</h1>
        <button className="px-4 py-2 border rounded-lg flex items-center gap-2">
          <Download size={18} /> Exporter CSV
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow p-4 flex gap-4">
        <select
          value={filter.type}
          onChange={e => setFilter({...filter, type: e.target.value})}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">Tous les types</option>
          <option value="signup">Inscriptions</option>
          <option value="first_call">1er appel</option>
          <option value="recurring_call">Appels récurrents</option>
          <option value="subscription">Abonnements</option>
          <option value="renewal">Renouvellements</option>
          <option value="bonus">Bonus</option>
        </select>

        <select
          value={filter.status}
          onChange={e => setFilter({...filter, status: e.target.value})}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="available">Disponible</option>
          <option value="paid">Retiré</option>
          <option value="cancelled">Annulé</option>
        </select>

        <input
          type="date"
          value={filter.dateFrom || ''}
          onChange={e => setFilter({...filter, dateFrom: e.target.value})}
          className="px-4 py-2 border rounded-lg"
          placeholder="Date début"
        />
        <input
          type="date"
          value={filter.dateTo || ''}
          onChange={e => setFilter({...filter, dateTo: e.target.value})}
          className="px-4 py-2 border rounded-lg"
          placeholder="Date fin"
        />
      </div>

      {/* Résumé filtré */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-gray-500 text-sm">Commissions filtrées</p>
          <p className="text-2xl font-bold">{filteredCommissions.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-gray-500 text-sm">Montant total</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(filteredTotal)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-gray-500 text-sm">Moyenne par commission</p>
          <p className="text-2xl font-bold">
            {formatCurrency(filteredTotal / filteredCommissions.length || 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-gray-500 text-sm">Filleuls uniques</p>
          <p className="text-2xl font-bold">{uniqueReferees}</p>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Filleul</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Détail</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Montant</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredCommissions.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{formatDate(c.createdAt)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${getTypeBadge(c.type)}`}>
                    {getTypeLabel(c.type)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">{c.refereeEmail}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{c.description}</td>
                <td className="px-4 py-3 font-semibold text-green-600">
                  +{formatCurrency(c.amount)}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(c.status)}`}>
                    {getStatusLabel(c.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="px-4 py-3 border-t flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {filteredCommissions.length} résultats
          </p>
          <div className="flex gap-2">
            <button className="px-3 py-1 border rounded">Précédent</button>
            <button className="px-3 py-1 border rounded">Suivant</button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 4. CONSOLE ADMIN - SECTION AFFILIATION COMPLÈTE

### 4.1 Structure des Pages Admin

```
/admin
├── /affiliate                        # Dashboard affiliation
│   ├── KPIs globaux
│   ├── Graphiques tendances
│   └── Alertes
│
├── /affiliate/config                 # Configuration
│   ├── Taux par défaut
│   ├── Règles par action
│   ├── Limites et seuils
│   └── Historique modifications
│
├── /affiliate/affiliates             # Liste affiliés
│   ├── Tableau complet
│   ├── Filtres avancés
│   ├── Actions en masse
│   └── Détail par affilié
│
├── /affiliate/commissions            # Toutes les commissions
│   ├── Tableau détaillé
│   ├── Filtres
│   └── Actions (annuler, ajuster)
│
├── /affiliate/payouts                # Retraits
│   ├── En attente de validation
│   ├── En cours (Wise)
│   ├── Historique
│   └── Échoués
│
├── /affiliate/reports                # Rapports
│   ├── Mensuel
│   ├── Par affilié
│   ├── Par action
│   └── Export comptable
│
└── /affiliate/fraud                  # Anti-fraude
    ├── Alertes
    ├── Patterns suspects
    └── Blocages
```

### 4.2 Dashboard Admin Affiliation

```tsx
// src/pages/admin/affiliate/AdminAffiliateDashboard.tsx

export default function AdminAffiliateDashboard() {
  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Affiliation - Dashboard</h1>
        <div className="flex gap-3">
          <select className="px-4 py-2 border rounded-lg">
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="90d">90 derniers jours</option>
            <option value="1y">Cette année</option>
          </select>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
            Exporter rapport
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ALERTES
          ═══════════════════════════════════════════════════════════════ */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="font-bold text-red-800 mb-2">⚠️ Alertes</h3>
          <ul className="space-y-1">
            {alerts.map(alert => (
              <li key={alert.id} className="text-red-700 text-sm">
                • {alert.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          KPIs PRINCIPAUX
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-6 gap-4">
        <KPICard
          label="Affiliés actifs"
          value={stats.activeAffiliates}
          change={stats.activeAffiliatesChange}
          icon={<Users />}
        />
        <KPICard
          label="Nouveaux filleuls"
          value={stats.newReferrals}
          change={stats.newReferralsChange}
          icon={<UserPlus />}
        />
        <KPICard
          label="Commissions créées"
          value={formatCurrency(stats.commissionsCreated)}
          change={stats.commissionsChange}
          icon={<Euro />}
        />
        <KPICard
          label="Commissions payées"
          value={formatCurrency(stats.commissionsPaid)}
          change={stats.paidChange}
          icon={<CheckCircle />}
        />
        <KPICard
          label="Payouts en attente"
          value={stats.pendingPayouts}
          alert={stats.pendingPayouts > 10}
          icon={<Clock />}
        />
        <KPICard
          label="Taux conversion"
          value={`${stats.conversionRate}%`}
          change={stats.conversionChange}
          icon={<TrendingUp />}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          GRAPHIQUES
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-6">
        {/* Évolution commissions */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold mb-4">Commissions générées</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={commissionsChartData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#4F46E5"
                fill="#4F46E5"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition par type */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold mb-4">Répartition par type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={typeBreakdown}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {typeBreakdown.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TOP AFFILIÉS
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="font-bold">Top 10 Affiliés</h3>
          <Link to="/admin/affiliate/affiliates" className="text-indigo-600 text-sm">
            Voir tous →
          </Link>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Affilié</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Code</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Taux</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Filleuls</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Total gagné</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Ce mois</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {topAffiliates.map((affiliate, index) => (
              <tr key={affiliate.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-bold text-gray-400">{index + 1}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{affiliate.name}</p>
                  <p className="text-sm text-gray-500">{affiliate.email}</p>
                </td>
                <td className="px-4 py-3 font-mono text-sm">{affiliate.affiliateCode}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                    {(affiliate.capturedRates.callCommissionRate * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold">{affiliate.stats.totalReferrals}</td>
                <td className="px-4 py-3 font-semibold text-green-600">
                  {formatCurrency(affiliate.totalEarned)}
                </td>
                <td className="px-4 py-3">{formatCurrency(affiliate.thisMonth)}</td>
                <td className="px-4 py-3">
                  <Link
                    to={`/admin/affiliate/affiliates/${affiliate.id}`}
                    className="text-indigo-600 hover:underline"
                  >
                    Détail
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          PAYOUTS EN ATTENTE
          ═══════════════════════════════════════════════════════════════ */}
      {pendingPayouts.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b bg-orange-50">
            <h3 className="font-bold text-orange-800">
              ⏳ {pendingPayouts.length} retrait(s) en attente de traitement
            </h3>
          </div>
          <div className="divide-y">
            {pendingPayouts.slice(0, 5).map(payout => (
              <div key={payout.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{payout.userName}</p>
                  <p className="text-sm text-gray-500">
                    Demandé le {formatDate(payout.requestedAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(payout.amount)}</p>
                  <p className="text-sm text-gray-500">{payout.targetCurrency}</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">
                    Valider
                  </button>
                  <button className="px-4 py-2 border text-gray-700 rounded-lg text-sm">
                    Détail
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-3 border-t bg-gray-50">
            <Link to="/admin/affiliate/payouts" className="text-indigo-600 text-sm">
              Voir tous les retraits →
            </Link>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          NAVIGATION RAPIDE
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-5 gap-4">
        <NavCard to="/admin/affiliate/config" icon={<Settings />} label="Configuration" />
        <NavCard to="/admin/affiliate/affiliates" icon={<Users />} label="Affiliés" />
        <NavCard to="/admin/affiliate/commissions" icon={<Euro />} label="Commissions" />
        <NavCard to="/admin/affiliate/payouts" icon={<Wallet />} label="Retraits" />
        <NavCard to="/admin/affiliate/reports" icon={<FileText />} label="Rapports" />
      </div>
    </div>
  );
}
```

### 4.3 Page Configuration Admin

```tsx
// src/pages/admin/affiliate/AdminAffiliateConfig.tsx

export default function AdminAffiliateConfig() {
  const [config, setConfig] = useState<AffiliateRulesConfig | null>(null);
  const [saving, setSaving] = useState(false);

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Configuration Affiliation</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ACTIVATION GLOBALE
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold mb-4">Activation du système</h2>
        <div className="space-y-4">
          <ToggleSwitch
            label="Système d'affiliation actif"
            description="Active/désactive tout le système d'affiliation"
            checked={config?.globalSettings.isSystemActive}
            onChange={(v) => updateConfig('globalSettings.isSystemActive', v)}
          />
          <ToggleSwitch
            label="Retraits autorisés"
            description="Permet aux affiliés de retirer leurs gains"
            checked={config?.globalSettings.withdrawalsEnabled}
            onChange={(v) => updateConfig('globalSettings.withdrawalsEnabled', v)}
          />
          <ToggleSwitch
            label="Nouveaux affiliés"
            description="Accepte les nouvelles inscriptions d'affiliés"
            checked={config?.globalSettings.newAffiliatesEnabled}
            onChange={(v) => updateConfig('globalSettings.newAffiliatesEnabled', v)}
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TAUX PAR DÉFAUT (NOUVEAUX INSCRITS)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold mb-2">Taux par défaut</h2>
        <p className="text-gray-500 text-sm mb-4">
          ⚠️ Ces taux s'appliquent uniquement aux <strong>nouveaux inscrits</strong>.
          Les affiliés existants conservent leurs taux.
        </p>

        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Bonus par inscription (fixe)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={(config?.defaultRates.signupBonus || 0) / 100}
                onChange={(e) => updateConfig('defaultRates.signupBonus', parseFloat(e.target.value) * 100)}
                className="w-full px-4 py-2 border rounded-lg"
                step="0.5"
              />
              <span className="text-gray-500">€</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Commission sur appels (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={(config?.defaultRates.callCommissionRate || 0) * 100}
                onChange={(e) => updateConfig('defaultRates.callCommissionRate', parseFloat(e.target.value) / 100)}
                className="w-full px-4 py-2 border rounded-lg"
                min="0"
                max="100"
              />
              <span className="text-gray-500">%</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Commission sur abonnements (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={(config?.defaultRates.subscriptionRate || 0) * 100}
                onChange={(e) => updateConfig('defaultRates.subscriptionRate', parseFloat(e.target.value) / 100)}
                className="w-full px-4 py-2 border rounded-lg"
                min="0"
                max="100"
              />
              <span className="text-gray-500">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          RÈGLES PAR ACTION
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold mb-4">Règles par action</h2>

        <div className="space-y-6">
          {/* Inscription filleul */}
          <CommissionRuleEditor
            title="📝 Inscription d'un filleul"
            description="Commission gagnée quand un filleul s'inscrit"
            rule={config?.commissionRules.referral_signup}
            onChange={(r) => updateConfig('commissionRules.referral_signup', r)}
          />

          {/* Premier appel */}
          <CommissionRuleEditor
            title="📞 Premier appel du filleul"
            description="Commission sur le premier appel payant"
            rule={config?.commissionRules.referral_first_call}
            onChange={(r) => updateConfig('commissionRules.referral_first_call', r)}
            showApplyTo
          />

          {/* Appels récurrents */}
          <CommissionRuleEditor
            title="🔄 Appels récurrents"
            description="Commission sur chaque appel après le premier"
            rule={config?.commissionRules.referral_recurring_call}
            onChange={(r) => updateConfig('commissionRules.referral_recurring_call', r)}
            showApplyTo
            showLimits
          />

          {/* Souscription abonnement */}
          <CommissionRuleEditor
            title="⭐ Souscription abonnement IA"
            description="Commission quand le filleul souscrit un abonnement"
            rule={config?.commissionRules.referral_subscription}
            onChange={(r) => updateConfig('commissionRules.referral_subscription', r)}
            showApplyTo
          />

          {/* Renouvellement */}
          <CommissionRuleEditor
            title="♻️ Renouvellement abonnement"
            description="Commission récurrente sur les renouvellements"
            rule={config?.commissionRules.referral_subscription_renewal}
            onChange={(r) => updateConfig('commissionRules.referral_subscription_renewal', r)}
            showDuration
          />

          {/* Bonus prestataire validé */}
          <CommissionRuleEditor
            title="🏆 Prestataire validé"
            description="Bonus si un prestataire parrainé complète son KYC"
            rule={config?.commissionRules.referral_provider_validated}
            onChange={(r) => updateConfig('commissionRules.referral_provider_validated', r)}
            fixedOnly
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          RÈGLES DE RETRAIT
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold mb-4">Règles de retrait</h2>

        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Minimum de retrait</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={(config?.globalSettings.minimumWithdrawal || 0) / 100}
                onChange={(e) => updateConfig('globalSettings.minimumWithdrawal', parseFloat(e.target.value) * 100)}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <span className="text-gray-500">€</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Délai de disponibilité</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={config?.globalSettings.holdPeriodHours || 0}
                onChange={(e) => updateConfig('globalSettings.holdPeriodHours', parseInt(e.target.value))}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <span className="text-gray-500">heures</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">0 = disponible immédiatement</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Max retraits par mois</label>
            <input
              type="number"
              value={config?.globalSettings.maxWithdrawalsPerMonth || 0}
              onChange={(e) => updateConfig('globalSettings.maxWithdrawalsPerMonth', parseInt(e.target.value))}
              className="w-full px-4 py-2 border rounded-lg"
            />
            <p className="text-xs text-gray-400 mt-1">0 = illimité</p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ANTI-FRAUDE
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold mb-4">Anti-fraude</h2>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <ToggleSwitch
              label="Email vérifié obligatoire"
              description="Le filleul doit vérifier son email"
              checked={config?.globalSettings.requireEmailVerification}
              onChange={(v) => updateConfig('globalSettings.requireEmailVerification', v)}
            />
            <ToggleSwitch
              label="Bloquer même IP"
              description="Empêche parrainages depuis la même IP"
              checked={config?.globalSettings.blockSameIPReferrals}
              onChange={(v) => updateConfig('globalSettings.blockSameIPReferrals', v)}
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Âge minimum du compte (jours)</label>
              <input
                type="number"
                value={config?.globalSettings.minAccountAgeDays || 0}
                onChange={(e) => updateConfig('globalSettings.minAccountAgeDays', parseInt(e.target.value))}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Max parrainages par jour</label>
              <input
                type="number"
                value={config?.globalSettings.maxReferralsPerDay || 0}
                onChange={(e) => updateConfig('globalSettings.maxReferralsPerDay', parseInt(e.target.value))}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <p className="text-xs text-gray-400 mt-1">0 = illimité</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          HISTORIQUE DES MODIFICATIONS
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold mb-4">Historique des modifications</h2>

        <div className="space-y-3 max-h-64 overflow-auto">
          {config?.rateHistory?.slice().reverse().map((entry, i) => (
            <div key={i} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 whitespace-nowrap">
                {formatDate(entry.changedAt)}
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  <strong>{entry.changedByEmail}</strong> a modifié les taux
                </p>
                <p className="text-xs text-gray-500 mt-1">{entry.reason}</p>
              </div>
              <button className="text-indigo-600 text-sm">Détail</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Composant pour éditer une règle de commission
function CommissionRuleEditor({
  title,
  description,
  rule,
  onChange,
  showApplyTo = false,
  showLimits = false,
  showDuration = false,
  fixedOnly = false
}) {
  return (
    <div className="border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <ToggleSwitch
          checked={rule?.enabled}
          onChange={(v) => onChange({ ...rule, enabled: v })}
        />
      </div>

      {rule?.enabled && (
        <div className="grid grid-cols-4 gap-4 pt-4 border-t">
          {/* Type de commission */}
          {!fixedOnly && (
            <div>
              <label className="block text-xs font-medium mb-1">Type</label>
              <select
                value={rule.type}
                onChange={(e) => onChange({ ...rule, type: e.target.value })}
                className="w-full px-3 py-2 border rounded text-sm"
              >
                <option value="fixed">Montant fixe</option>
                <option value="percentage">Pourcentage</option>
                <option value="hybrid">Hybride (fixe + %)</option>
              </select>
            </div>
          )}

          {/* Montant fixe */}
          {(rule.type === 'fixed' || rule.type === 'hybrid' || fixedOnly) && (
            <div>
              <label className="block text-xs font-medium mb-1">Montant fixe (€)</label>
              <input
                type="number"
                value={(rule.fixedAmount || 0) / 100}
                onChange={(e) => onChange({ ...rule, fixedAmount: parseFloat(e.target.value) * 100 })}
                className="w-full px-3 py-2 border rounded text-sm"
                step="0.5"
              />
            </div>
          )}

          {/* Pourcentage */}
          {(rule.type === 'percentage' || rule.type === 'hybrid') && !fixedOnly && (
            <div>
              <label className="block text-xs font-medium mb-1">Pourcentage (%)</label>
              <input
                type="number"
                value={(rule.percentageRate || 0) * 100}
                onChange={(e) => onChange({ ...rule, percentageRate: parseFloat(e.target.value) / 100 })}
                className="w-full px-3 py-2 border rounded text-sm"
                min="0"
                max="100"
              />
            </div>
          )}

          {/* Sur quoi appliquer le % */}
          {showApplyTo && rule.type !== 'fixed' && (
            <div>
              <label className="block text-xs font-medium mb-1">Calculé sur</label>
              <select
                value={rule.applyTo}
                onChange={(e) => onChange({ ...rule, applyTo: e.target.value })}
                className="w-full px-3 py-2 border rounded text-sm"
              >
                <option value="connection_fee">Frais de connexion</option>
                <option value="total_amount">Montant total</option>
              </select>
            </div>
          )}

          {/* Limites */}
          {showLimits && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1">Max par mois</label>
                <input
                  type="number"
                  value={rule.conditions?.maxCallsPerMonth || 0}
                  onChange={(e) => onChange({
                    ...rule,
                    conditions: { ...rule.conditions, maxCallsPerMonth: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
                <p className="text-xs text-gray-400">0 = illimité</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Limite à vie</label>
                <input
                  type="number"
                  value={rule.conditions?.lifetimeLimit || 0}
                  onChange={(e) => onChange({
                    ...rule,
                    conditions: { ...rule.conditions, lifetimeLimit: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
                <p className="text-xs text-gray-400">0 = à vie</p>
              </div>
            </>
          )}

          {/* Durée */}
          {showDuration && (
            <div>
              <label className="block text-xs font-medium mb-1">Durée max (mois)</label>
              <input
                type="number"
                value={rule.conditions?.maxMonths || 0}
                onChange={(e) => onChange({
                  ...rule,
                  conditions: { ...rule.conditions, maxMonths: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border rounded text-sm"
              />
              <p className="text-xs text-gray-400">0 = à vie</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 5. MODÈLE DE DONNÉES ENRICHI

### 5.1 Collection `affiliate_commissions` (enrichie)

```typescript
interface AffiliateCommission {
  id: string;

  // ═══════════════════════════════════════════════════════════════════
  // ACTEURS
  // ═══════════════════════════════════════════════════════════════════

  referrerId: string;              // Affilié qui gagne
  referrerEmail: string;           // Snapshot
  refereeId: string;               // Filleul qui génère
  refereeEmail: string;            // Snapshot

  // ═══════════════════════════════════════════════════════════════════
  // TYPE DE COMMISSION
  // ═══════════════════════════════════════════════════════════════════

  type:
    | 'signup'              // Inscription filleul
    | 'first_call'          // 1er appel
    | 'recurring_call'      // Appels suivants
    | 'subscription'        // Souscription abonnement
    | 'renewal'             // Renouvellement
    | 'provider_bonus'      // Bonus prestataire validé
    | 'manual_adjustment';  // Ajustement admin

  // ═══════════════════════════════════════════════════════════════════
  // SOURCE (optionnel selon type)
  // ═══════════════════════════════════════════════════════════════════

  sourceId: string | null;         // ID de la ressource source
  sourceType: 'call_session' | 'payment' | 'subscription' | 'user' | null;

  // Pour les appels
  callSessionId?: string;
  providerType?: 'lawyer' | 'helper';
  callDuration?: number;

  // Pour les paiements
  paymentId?: string;
  paymentSource?: 'stripe' | 'paypal';

  // Pour les abonnements
  subscriptionId?: string;
  planName?: string;

  // ═══════════════════════════════════════════════════════════════════
  // CALCUL
  // ═══════════════════════════════════════════════════════════════════

  calculationType: 'fixed' | 'percentage' | 'hybrid';

  // Si pourcentage
  baseAmount: number | null;       // Montant de base (centimes)
  rateApplied: number | null;      // Taux appliqué (0.75)

  // Si fixe
  fixedAmount: number | null;      // Montant fixe (centimes)

  // Résultat final
  amount: number;                  // Commission finale (centimes)
  currency: 'EUR';

  // Détail calcul (pour audit)
  calculationDetails: string;      // "75% de 35€ = 26.25€" ou "5€ fixe"

  // ═══════════════════════════════════════════════════════════════════
  // STATUT
  // ═══════════════════════════════════════════════════════════════════

  status:
    | 'pending'      // En attente (holdPeriod)
    | 'available'    // Disponible au retrait
    | 'paid'         // Incluse dans un payout
    | 'cancelled';   // Annulée

  availableAt: Timestamp | null;   // Date de disponibilité
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: Timestamp;

  // ═══════════════════════════════════════════════════════════════════
  // PAYOUT
  // ═══════════════════════════════════════════════════════════════════

  payoutId: string | null;
  paidAt: Timestamp | null;

  // ═══════════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════════

  description: string;             // "Commission sur appel avocat"
  adminNotes?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 6. POINTS POSITIFS

| Point | Détail |
|-------|--------|
| **Taux figé à vie ✅** | Le CDC prévoit bien ce mécanisme crucial |
| **Architecture extensible** | Facile d'ajouter de nouveaux types de commissions |
| **Intégration Wise** | Bon choix pour virements internationaux |
| **Transaction atomique** | Prévue pour la cohérence des données |
| **Code affilié auto-généré** | Simplifie l'UX utilisateur |

---

## 7. POINTS NÉGATIFS / LACUNES DU CDC

### 7.1 Lacunes CRITIQUES

| Lacune | Impact | Recommandation |
|--------|--------|----------------|
| **Pas de commissions fixes** | Ne peut pas offrir "5€ par inscription" | Implémenter type `fixed` |
| **Uniquement appels** | Pas de commission sur inscriptions/abonnements | Ajouter types d'actions |
| **Console admin basique** | Manque 80% des fonctionnalités | Interface complète requise |
| **Pas de gestion manuelle** | Admin ne peut pas ajuster | Ajouter `manual_adjustment` |
| **Coordonnées non chiffrées** | IBAN en clair | Implémenter chiffrement |

### 7.2 Lacunes IMPORTANTES

| Lacune | Impact | Recommandation |
|--------|--------|----------------|
| **Pas de délai configurable** | Commission immédiate = risque remboursement | `holdPeriodHours` configurable |
| **Pas de limites** | Un affilié peut spammer | Limites par jour/mois |
| **Pas d'export** | Pas de reporting comptable | Export CSV/PDF |
| **Pas de widgets** | Outils marketing manquants | Bannières, liens trackés |
| **Anti-fraude basique** | Détection insuffisante | Implémenter détection IP/patterns |

---

## 8. RECOMMANDATIONS COMPLÈTES

### 8.1 Architecture Recommandée

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SYSTÈME D'AFFILIATION COMPLET                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BACKEND                                                                    │
│  ├── triggers/                                                              │
│  │   ├── onUserCreate.ts          → Setup affilié + capture taux           │
│  │   ├── onCallCompleted.ts       → Commission appel                       │
│  │   ├── onSubscriptionCreated.ts → Commission abonnement                  │
│  │   └── onSubscriptionRenewed.ts → Commission renouvellement              │
│  │                                                                          │
│  ├── callables/                                                             │
│  │   ├── requestWithdrawal.ts     → Demande retrait                        │
│  │   ├── updateBankDetails.ts     → MAJ coordonnées                        │
│  │   └── admin/                                                             │
│  │       ├── updateConfig.ts      → Modifier config                        │
│  │       ├── adjustCommission.ts  → Ajustement manuel                      │
│  │       ├── processPayouts.ts    → Traiter retraits                       │
│  │       └── exportReports.ts     → Générer rapports                       │
│  │                                                                          │
│  ├── services/                                                              │
│  │   ├── wise/                    → Intégration Wise API                   │
│  │   ├── commission/              → Calcul commissions (fixe/%)            │
│  │   └── fraud/                   → Détection fraude                       │
│  │                                                                          │
│  └── scheduled/                                                             │
│      ├── releaseHeldCommissions   → Libérer commissions après holdPeriod   │
│      └── monthlyReports           → Rapports mensuels                      │
│                                                                             │
│  FRONTEND USER                                                              │
│  ├── /dashboard/affiliate         → Dashboard + Tirelire                   │
│  ├── /dashboard/affiliate/earnings → Historique détaillé                   │
│  ├── /dashboard/affiliate/referrals → Liste filleuls                       │
│  ├── /dashboard/affiliate/withdraw → Retraits                              │
│  ├── /dashboard/affiliate/bank     → Coordonnées bancaires                 │
│  └── /dashboard/affiliate/tools    → Widgets marketing                     │
│                                                                             │
│  FRONTEND ADMIN                                                             │
│  ├── /admin/affiliate             → Dashboard + KPIs                       │
│  ├── /admin/affiliate/config      → Configuration complète                 │
│  ├── /admin/affiliate/affiliates  → Gestion affiliés                       │
│  ├── /admin/affiliate/commissions → Toutes commissions                     │
│  ├── /admin/affiliate/payouts     → Gestion retraits                       │
│  ├── /admin/affiliate/reports     → Rapports et exports                    │
│  └── /admin/affiliate/fraud       → Anti-fraude                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Checklist d'Implémentation

#### Phase 1 : Infrastructure (P0)
- [ ] Créer `affiliate_config/current` avec structure complète
- [ ] Créer interfaces TypeScript enrichies
- [ ] Ajouter champs users avec taux capturés
- [ ] Implémenter chiffrement coordonnées bancaires
- [ ] Créer règles Firestore sécurisées
- [ ] Créer index Firestore

#### Phase 2 : Backend Commissions (P0)
- [ ] Trigger setup affilié à l'inscription
- [ ] Service calcul commission (fixe/pourcentage/hybride)
- [ ] Commission sur inscription filleul
- [ ] Commission sur appels (1er + récurrents)
- [ ] Commission sur abonnements
- [ ] Commission sur renouvellements
- [ ] Gestion holdPeriod

#### Phase 3 : Backend Payouts (P1)
- [ ] Intégration Wise complète
- [ ] Callable demande retrait
- [ ] Webhook Wise
- [ ] Système de retry
- [ ] Alertes admin

#### Phase 4 : Frontend User (P1)
- [ ] Dashboard Tirelire complet
- [ ] Historique gains avec filtres
- [ ] Liste filleuls
- [ ] Formulaire coordonnées bancaires
- [ ] Page retraits
- [ ] Widgets marketing

#### Phase 5 : Console Admin (P1)
- [ ] Dashboard avec KPIs
- [ ] Configuration complète (taux, règles, limites)
- [ ] Gestion affiliés
- [ ] Gestion commissions (ajustements)
- [ ] Gestion payouts
- [ ] Rapports et exports

#### Phase 6 : Anti-fraude (P2)
- [ ] Détection même IP
- [ ] Détection patterns suspects
- [ ] Blocage automatique
- [ ] Dashboard alertes

---

## CONCLUSION

Le CDC actuel est une **bonne base** mais nécessite des enrichissements significatifs :

| Aspect | CDC Actuel | Recommandation |
|--------|------------|----------------|
| Types de commissions | % uniquement | Fixe + % + Hybride |
| Actions couvertes | Appels uniquement | Inscription, appels, abonnements, bonus |
| Frontend User | Mockup basique | 6 pages complètes |
| Console Admin | 1 page basique | 7 pages détaillées |
| Taux figé à vie | ✅ Prévu | ✅ Conserver |
| Configurabilité | Partielle | Tout depuis l'admin |
| Anti-fraude | Absent | Détection multi-critères |

**Verdict : Le système est réalisable avec les enrichissements proposés.**

---

*Document V2 généré le 26 janvier 2026 par Claude Opus 4.5*
