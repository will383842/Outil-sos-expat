# RAPPORT AUDIT COMPLET — SYSTÈME D'ABONNEMENTS IA SOS-EXPAT

**Date :** 2026-02-28
**Auditeur :** Claude Opus 4.6 — 30 agents spécialisés
**Périmètre :** De bout en bout : page tarifs → paiement → Stripe → webhooks → Firestore → accès IA

---

## Section 1 — MATRICE DES INCOHÉRENCES

### 1.1 Plans définis (source de vérité : Firestore `subscription_plans/{planId}`)

#### Lawyer Plans

| Plan ID | Tier | EUR/mois | USD/mois | EUR/an (-20%) | USD/an (-20%) | Appels IA/mois |
|---------|------|----------|----------|---------------|---------------|----------------|
| `lawyer_basic` | basic | 14€ | 19$ | 134,40€ | 182,40$ | 5 |
| `lawyer_standard` | standard | 39€ | 49$ | 374,40€ | 470,40$ | 15 |
| `lawyer_pro` | pro | 69€ | 79$ | 662,40€ | 758,40$ | 30 |
| `lawyer_unlimited` | unlimited | 119€ | 139$ | 1142,40€ | 1334,40$ | illimité (fair use 500) |

#### Expat Aidant Plans

| Plan ID | Tier | EUR/mois | USD/mois | EUR/an (-20%) | USD/an (-20%) | Appels IA/mois |
|---------|------|----------|----------|---------------|---------------|----------------|
| `expat_aidant_basic` | basic | 9€ | 9$ | 86,40€ | 86,40$ | 5 |
| `expat_aidant_standard` | standard | 14€ | 17$ | 134,40€ | 163,20$ | 15 |
| `expat_aidant_pro` | pro | 24€ | 29$ | 230,40€ | 278,40$ | 30 |
| `expat_aidant_unlimited` | unlimited | 39€ | 49$ | 374,40€ | 470,40$ | illimité (fair use 500) |

### 1.2 Incohérences prix

| # | Lieu | Problème | Impact | Sévérité |
|---|------|----------|--------|----------|
| I1 | `Plans.tsx` ligne 83-86 | **`billingPeriod` NON TRANSMIS** à `createSubscription()` | Toute souscription annuelle est créée comme mensuelle | 🔴 CRITIQUE |
| I2 | `CheckoutForm` ligne 150 | Affiche toujours `pricing[currency]` (mensuel) même si annuel sélectionné | Prix affiché ≠ prix facturé | 🔴 CRITIQUE |
| I3 | `CheckoutForm` ligne 162-163 | Label "Total mensuel" fixe, ne change pas en mode annuel | UX trompeuse | 🟡 MAJEUR |
| I4 | `index.ts` ligne 630 | CF cherche dans `providers/{uid}` au lieu de `sos_profiles/{uid}` | Peut bloquer la souscription si le doc n'existe pas dans `providers/` | 🟡 MAJEUR |
| I5 | `webhooks.ts` ligne 774 | `handleSubscriptionUpdated` ne recalcule pas `billingPeriod` | Après upgrade mensuel→annuel, `billingPeriod` reste "monthly" en Firestore | 🟡 MAJEUR |
| I6 | `constants.ts` vs `subscription.ts` | Trial: `durationDays=0` backend vs `durationDays=30` frontend | Comportement trial incohérent selon le fallback utilisé | 🟠 MOYEN |
| I7 | `dunning.ts` | `aiCallsUsed: 0` au lieu de `currentPeriodCalls: 0` | Reset quota échoue silencieusement après récupération dunning | 🟡 MAJEUR |
| I8 | `ChoosePlan.tsx`, `MySubscription.tsx`, `SubscriptionSuccess.tsx` | 3 fichiers morts (~1500 lignes) non routés dans App.tsx | Code mort, maintenance inutile | 🟢 MINEUR |
| I9 | `subscriptionService.ts` | `startTrial()` écrit directement en Firestore côté client | Faille de sécurité si rules non verrouillées | 🟠 MOYEN |

---

## Section 2 — CARTOGRAPHIE DU FLUX AVEC POINTS DE RUPTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FLUX ACTIF (Plans.tsx)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PAGE TARIFS (PricingTable.tsx)                                             │
│  ✅ Toggle mensuel/annuel fonctionne                                       │
│  ✅ Prix calculés correctement (mensuel OU équivalent mensuel annuel)      │
│  ✅ billingPeriod passé à onSelectPlan(plan, billingPeriod)                │
│  ─────────────────────────────────────────────────────────────────────────  │
│                              │                                              │
│                              ▼                                              │
│  PLANS PAGE (Plans.tsx handleSelectPlan)                                    │
│  ✅ selectedBillingPeriod stocké en state (ligne 432)                      │
│  ✅ getDisplayPrice() calcule le bon montant annuel (ligne 442-449)        │
│  ❌ BUG P1: stripeOptions.amount utilise getDisplayPrice() mais...         │
│  ─────────────────────────────────────────────────────────────────────────  │
│                              │                                              │
│                              ▼                                              │
│  CHECKOUT FORM (Plans.tsx CheckoutForm)                                    │
│  ❌ BUG P2: Affiche TOUJOURS pricing[currency] (mensuel) ligne 150       │
│  ❌ BUG P3: Label fixe "Total mensuel" (ligne 162)                        │
│  ❌ BUG P4: billingPeriod N'EST PAS passé en prop à CheckoutForm          │
│  ─────────────────────────────────────────────────────────────────────────  │
│                              │                                              │
│                              ▼                                              │
│  createSubscription() (subscriptionService.ts)                             │
│  ❌ BUG CRITIQUE: Appel { planId, currency } — PAS de billingPeriod       │
│  ─────────────────────────────────────────────────────────────────────────  │
│                              │                                              │
│                              ▼                                              │
│  CF subscriptionCreate (index.ts:594)                                      │
│  ⚠️  billingPeriod = data.billingPeriod || 'monthly' (défaut!)             │
│  → Frontend ne l'envoie jamais → TOUJOURS 'monthly'                       │
│  ❌ Cherche dans providers/{uid} au lieu de sos_profiles/{uid}             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                              │                                              │
│                              ▼                                              │
│  STRIPE subscriptions.create                                                │
│  → Utilise TOUJOURS stripePriceId[currency] (mensuel)                     │
│  → stripePriceIdAnnual[currency] JAMAIS utilisé via ce flux               │
│  ─────────────────────────────────────────────────────────────────────────  │
│                              │                                              │
│                              ▼                                              │
│  WEBHOOK customer.subscription.created (webhooks.ts)                       │
│  ✅ Extrait billingPeriod depuis price.recurring.interval                  │
│  ✅ Stocke en Firestore subscriptions/{uid}                               │
│  → Mais billingPeriod = 'monthly' car le prix Stripe EST mensuel          │
│  ─────────────────────────────────────────────────────────────────────────  │
│                              │                                              │
│                              ▼                                              │
│  FIRESTORE subscriptions/{uid}                                             │
│  ✅ aiAccessEnabled = true                                                 │
│  ✅ billingPeriod = 'monthly' (correct pour le prix réellement facturé)   │
│  ❌ Mais le provider pensait souscrire à l'annuel !                       │
│  ─────────────────────────────────────────────────────────────────────────  │
│                              │                                              │
│                              ▼                                              │
│  ACCÈS IA (accessControl.ts)                                               │
│  ✅ checkAiAccess fonctionne correctement                                  │
│  ✅ incrementAiUsage fonctionne correctement                               │
│  ✅ Quotas respectés par tier                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

RÉSUMÉ: Le provider choisit "annuel" → voit le prix annuel sur la grille →
         le checkout affiche le prix MENSUEL → la CF crée un abonnement MENSUEL
         → Stripe facture au MENSUEL → le provider est surpris à la facture suivante.

SECOND BUG: handleSubscriptionUpdated ne met PAS à jour billingPeriod.
         Si un admin fait un changement de plan mensuel→annuel via Stripe Dashboard,
         billingPeriod reste "monthly" en Firestore.
```

---

## Section 3 — CORRECTIONS STRIPE (Dashboard)

### 3.1 Vérifications à faire dans Stripe Dashboard

1. **Aller dans Products** → Vérifier que chaque plan a DEUX Prices :
   - Un Price avec `interval: month` (mensuel)
   - Un Price avec `interval: year` (annuel)
   - Pour chaque devise (EUR + USD) = 4 Prices par produit

2. **Vérifier les montants** :
   - Prix annuel = prix mensuel × 12 × 0.80 (remise 20%)
   - En centimes Stripe : ex. lawyer_pro EUR mensuel = 6900, annuel = 66240

3. **Vérifier que les Price IDs** stockés dans Firestore `subscription_plans/{planId}` correspondent :
   ```
   subscription_plans/lawyer_pro:
     stripePriceId:       { EUR: "price_xxx_monthly_eur", USD: "price_xxx_monthly_usd" }
     stripePriceIdAnnual: { EUR: "price_xxx_annual_eur",  USD: "price_xxx_annual_usd" }
   ```

4. **Si des Price IDs annuels manquent** : utiliser la CF admin `syncSubscriptionPlansToStripe` qui les crée automatiquement.

### 3.2 Commande de vérification

```bash
# Lister tous les produits Stripe avec leurs prix
stripe products list --limit=20 --expand data.default_price

# Lister les prix d'un produit spécifique
stripe prices list --product=prod_XXXXX --limit=10
```

---

## Section 4 — CORRECTIONS FRONTEND

### 4.1 BUG CRITIQUE — `billingPeriod` non transmis (Plans.tsx)

**Fichier :** `sos/src/pages/Dashboard/Subscription/Plans.tsx`
**Ligne :** 83-86

```typescript
// ❌ AVANT (BUG)
const result = await createSubscription({
  planId: selectedPlan.id,
  currency
});

// ✅ APRÈS (FIX)
const result = await createSubscription({
  planId: selectedPlan.id,
  currency,
  billingPeriod: selectedBillingPeriod  // ← AJOUT CRITIQUE
});
```

### 4.2 BUG — CheckoutForm affiche toujours le prix mensuel

**Fichier :** `sos/src/pages/Dashboard/Subscription/Plans.tsx`
**Ligne :** 42-49, 138-166

Le `CheckoutForm` ne reçoit pas `billingPeriod` en prop et affiche toujours `selectedPlan.pricing[currency]` (mensuel).

```typescript
// ❌ AVANT
interface CheckoutFormProps {
  selectedPlan: SubscriptionPlan;
  currency: Currency;
  onSuccess: () => void;
  onCancel: () => void;
  locale: SupportedLanguage;
  successUrl: string;
}

// ✅ APRÈS — Ajouter billingPeriod
interface CheckoutFormProps {
  selectedPlan: SubscriptionPlan;
  currency: Currency;
  billingPeriod: BillingPeriod;      // ← AJOUT
  onSuccess: () => void;
  onCancel: () => void;
  locale: SupportedLanguage;
  successUrl: string;
}
```

```typescript
// ❌ AVANT (lignes 149-163)
<span className="font-semibold text-gray-900">
  {formatPrice(selectedPlan.pricing[currency])}{intl.formatMessage({ id: 'subscription.plans.perMonth' })}
</span>
// ...
<span>{intl.formatMessage({ id: 'subscription.checkout.monthlyTotal' })}</span>
<span className="text-lg">{formatPrice(selectedPlan.pricing[currency])}</span>

// ✅ APRÈS — Afficher le bon prix selon billingPeriod
const displayPrice = billingPeriod === 'yearly'
  ? (selectedPlan.annualPricing?.[currency]
     ?? selectedPlan.pricing[currency] * 12 * (1 - (selectedPlan.annualDiscountPercent || 20) / 100))
  : selectedPlan.pricing[currency];

const periodLabel = billingPeriod === 'yearly'
  ? intl.formatMessage({ id: 'subscription.plans.perYear' })
  : intl.formatMessage({ id: 'subscription.plans.perMonth' });

// Dans le JSX :
<span className="font-semibold text-gray-900">
  {formatPrice(displayPrice)}{periodLabel}
</span>
// ...
<span>{billingPeriod === 'yearly'
  ? intl.formatMessage({ id: 'subscription.checkout.yearlyTotal' })
  : intl.formatMessage({ id: 'subscription.checkout.monthlyTotal' })}</span>
<span className="text-lg">{formatPrice(displayPrice)}</span>
```

Et dans l'appel à `<CheckoutForm>` (ligne 530) :

```typescript
// ❌ AVANT
<CheckoutForm
  selectedPlan={selectedPlan}
  currency={selectedCurrency}
  onSuccess={handleSuccess}
  onCancel={() => setShowCheckout(false)}
  locale={locale}
  successUrl={...}
/>

// ✅ APRÈS
<CheckoutForm
  selectedPlan={selectedPlan}
  currency={selectedCurrency}
  billingPeriod={selectedBillingPeriod}    // ← AJOUT
  onSuccess={handleSuccess}
  onCancel={() => setShowCheckout(false)}
  locale={locale}
  successUrl={...}
/>
```

### 4.3 BUG — stripeOptions.amount incohérent

**Fichier :** `sos/src/pages/Dashboard/Subscription/Plans.tsx`
**Ligne :** 452-465

`stripeOptions.amount` utilise `getDisplayPrice()` qui est correct pour l'affichage, MAIS ce montant doit correspondre exactement au Price Stripe côté backend. Stripe Elements vérifie la cohérence amount/currency — si le montant frontend ≠ montant du Price backend, le paiement échouera.

```typescript
// Note: stripeOptions.amount est utilisé pour l'affichage du PaymentElement,
// le montant réel facturé est celui du Stripe Price ID côté backend.
// Il faut que les deux soient cohérents.
```

### 4.4 Nettoyage code mort

**Fichiers à supprimer** (non routés, jamais chargés) :
- `sos/src/pages/Dashboard/ChoosePlan.tsx` (~380 lignes)
- `sos/src/pages/Dashboard/MySubscription.tsx` (~350 lignes)
- `sos/src/pages/Dashboard/SubscriptionSuccess.tsx` (~200 lignes)
- `sos/src/config/subscriptionRoutes.tsx` (~100 lignes, non importé)

**Hook inutilisé** :
- `sos/src/hooks/useSubscriptionPlans.ts` — aucune page active ne l'utilise

**Console.log à retirer** :
- `sos/src/hooks/useSubscription.ts` lignes 166-175
- `sos/src/pages/Dashboard/Subscription/Index.tsx` lignes 222-225, 258-268, 368-369, 412-413, 479-485

---

## Section 5 — CORRECTIONS BACKEND

### 5.1 BUG — Collection `providers` inexistante

**Fichier :** `sos/firebase/functions/src/subscription/index.ts`
**Ligne :** 630-633

```typescript
// ❌ AVANT — Cherche uniquement dans providers/
const providerDoc = await getDb().doc(`providers/${providerId}`).get();
if (!providerDoc.exists) {
  throw new HttpsError('not-found', 'Provider not found');
}

// ✅ APRÈS — Cascade sos_profiles → users → providers (comme checkout.ts)
let providerDoc = await getDb().doc(`sos_profiles/${providerId}`).get();
if (!providerDoc.exists) {
  providerDoc = await getDb().doc(`users/${providerId}`).get();
}
if (!providerDoc.exists) {
  providerDoc = await getDb().doc(`providers/${providerId}`).get();
}
if (!providerDoc.exists) {
  throw new HttpsError('not-found', 'Provider not found');
}
```

### 5.2 BUG — `billingPeriod` non mis à jour dans webhooks

**Fichier :** `sos/firebase/functions/src/subscription/webhooks.ts`
**Ligne :** 774 (dans `handleSubscriptionUpdated`)

```typescript
// ❌ AVANT — billingPeriod absent des updates
const updates: Record<string, unknown> = {
  status: newStatus,
  stripePriceId: priceId,
  currency: subscription.currency?.toUpperCase() || previousState?.currency || 'EUR',
  // ... pas de billingPeriod
};

// ✅ APRÈS — Ajouter billingPeriod recalculé depuis Stripe
const priceInterval = subscription.items.data[0]?.price.recurring?.interval;
const newBillingPeriod = priceInterval === 'year' ? 'yearly' : 'monthly';

const updates: Record<string, unknown> = {
  status: newStatus,
  stripePriceId: priceId,
  billingPeriod: newBillingPeriod,    // ← AJOUT CRITIQUE
  currency: subscription.currency?.toUpperCase() || previousState?.currency || 'EUR',
  // ... reste identique
};
```

### 5.3 BUG — `createSubscription` metadata incomplète

**Fichier :** `sos/firebase/functions/src/subscription/index.ts`
**Ligne :** 725-729

```typescript
// ❌ AVANT — billingPeriod absent des metadata Stripe
metadata: {
  providerId,
  planId,
  providerType: plan.providerType
}

// ✅ APRÈS — Ajouter billingPeriod pour traçabilité
metadata: {
  providerId,
  planId,
  providerType: plan.providerType,
  billingPeriod,      // ← AJOUT
  currency            // ← AJOUT (utile pour debug)
}
```

### 5.4 BUG — Dunning reset mauvais champ

**Fichier :** `sos/firebase/functions/src/subscriptions/dunning.ts`

```typescript
// ❌ AVANT — champ inexistant
aiCallsUsed: 0

// ✅ APRÈS — bon champ
currentPeriodCalls: 0
```

### 5.5 INCOHÉRENCE — Trial duration fallback

**Fichier :** `sos/firebase/functions/src/subscription/constants.ts`
```typescript
// Backend: DEFAULT_TRIAL_CONFIG.durationDays = 0
```

**Fichier :** `sos/src/types/subscription.ts`
```typescript
// Frontend: DEFAULT_TRIAL_CONFIG.durationDays = 30
```

**Décision requise** : harmoniser sur une seule valeur. Si le trial est géré via Firestore `settings/subscription`, les deux fallbacks doivent être identiques.

---

## Section 6 — CORRECTIONS FIRESTORE

### 6.1 Structure standardisée `subscriptions/{providerId}`

```typescript
interface SubscriptionDocument {
  // Identité
  providerId: string;
  providerType: 'lawyer' | 'expat_aidant';

  // Plan
  planId: string;                    // ex: 'lawyer_pro'
  tier: SubscriptionTier;            // 'trial' | 'basic' | 'standard' | 'pro' | 'unlimited'

  // Facturation — CRITIQUE
  billingPeriod: 'monthly' | 'yearly';  // ← DOIT TOUJOURS ÊTRE PRÉSENT ET CORRECT
  currency: 'EUR' | 'USD';
  currentPeriodAmount: number;          // Montant réel de la période en cours

  // Stripe
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;               // Price ID Stripe actif

  // Statut
  status: SubscriptionStatus;
  aiAccessEnabled: boolean;
  aiCallsLimit: number;                 // -1 = illimité

  // Période
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  cancelAtPeriodEnd: boolean;
  canceledAt: Timestamp | null;

  // Trial
  trialStartedAt: Timestamp | null;
  trialEndsAt: Timestamp | null;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 6.2 Vérification des documents existants

Script de vérification à exécuter :
```typescript
// Vérifier que tous les abonnements actifs ont billingPeriod correct
const subs = await db.collection('subscriptions')
  .where('status', 'in', ['active', 'trialing', 'past_due'])
  .get();

for (const doc of subs.docs) {
  const data = doc.data();
  if (!data.billingPeriod) {
    console.warn(`MISSING billingPeriod: ${doc.id}`);
    // Récupérer depuis Stripe pour corriger
    const stripeSub = await stripe.subscriptions.retrieve(data.stripeSubscriptionId);
    const interval = stripeSub.items.data[0]?.price.recurring?.interval;
    await doc.ref.update({
      billingPeriod: interval === 'year' ? 'yearly' : 'monthly'
    });
  }
}
```

---

## Section 7 — PLAN DE TEST DE VALIDATION

### TEST 1 — Souscription mensuelle basique

1. Naviguer vers `/dashboard/subscription/plans`
2. Toggle sur **"Mensuel"**
3. Sélectionner le plan **Basic** (14€ EUR ou 19$ USD)
4. **Vérifier** : le résumé de commande affiche le prix mensuel
5. Payer avec carte test `4242 4242 4242 4242`
6. **Vérifier Stripe Dashboard** : subscription `interval=month`, `amount=1400` (EUR) ou `1900` (USD)
7. **Vérifier Firestore** `subscriptions/{uid}` : `billingPeriod='monthly'`, `status='active'`
8. **Vérifier** : accès IA activé (`aiAccessEnabled=true`)

### TEST 2 — Souscription annuelle Pro

1. Naviguer vers `/dashboard/subscription/plans`
2. Toggle sur **"Annuel"** (badge -20%)
3. Sélectionner le plan **Pro** (662,40€/an EUR)
4. **Vérifier** : le résumé affiche 662,40€/an (ou 55,20€/mois équivalent)
5. Payer avec carte test
6. **Vérifier Stripe** : `interval=year`, `amount=66240` (EUR)
7. **Vérifier Firestore** : `billingPeriod='yearly'`, `currentPeriodEnd` = +1 an
8. **Vérifier** : accès IA activé, `aiCallsLimit=30`

### TEST 3 — Upgrade mensuel → annuel

1. Depuis un abonnement mensuel Basic actif
2. Naviguer vers les plans, toggle "Annuel", sélectionner Pro annuel
3. **Vérifier** : proratisation correcte dans Stripe (crédit période restante)
4. **Vérifier Firestore** : `billingPeriod='yearly'`, `tier='pro'` mis à jour
5. **Vérifier** : `currentPeriodEnd` = +1 an depuis maintenant

### TEST 4 — Annulation plan annuel

1. Depuis un abonnement annuel Pro actif
2. Cliquer "Annuler l'abonnement"
3. **Vérifier Stripe** : `cancel_at_period_end=true`
4. **Vérifier Firestore** : `cancelAtPeriodEnd=true`, `status` reste `active`
5. **Vérifier** : accès IA maintenu jusqu'à `currentPeriodEnd`
6. Après `currentPeriodEnd` : `status='cancelled'`, `aiAccessEnabled=false`

### TEST 5 — Échec de paiement + dunning

1. Créer un abonnement mensuel avec carte `4000 0000 0000 0341` (échec futur)
2. Attendre le renouvellement (ou simuler via Stripe Dashboard > Clocks)
3. **Vérifier** : `status='past_due'`, email de relance envoyé
4. **Vérifier** : accès IA maintenu pendant 7 jours (grace period)
5. Après 7 jours : `status='suspended'`, `aiAccessEnabled=false`
6. Mettre à jour la carte → **Vérifier** : `status='active'`, accès restauré

---

## SYNTHÈSE EXÉCUTIVE

### Bugs critiques (à corriger immédiatement)

| # | Bug | Impact | Fichier | Ligne |
|---|-----|--------|---------|-------|
| 🔴 1 | `billingPeriod` non transmis au backend | **Tous les abonnements annuels sont facturés mensuellement** | `Plans.tsx` | 83-86 |
| 🔴 2 | CheckoutForm affiche toujours le prix mensuel | Prix affiché ≠ prix facturé | `Plans.tsx` | 150, 163 |
| 🟡 3 | CF cherche `providers/` au lieu de `sos_profiles/` | Souscription peut échouer pour certains providers | `index.ts` | 630 |
| 🟡 4 | `billingPeriod` non recalculé dans webhooks update | État Firestore incohérent après upgrade/downgrade | `webhooks.ts` | 774 |
| 🟡 5 | Dunning reset mauvais champ Firestore | Quota non resettée après récupération paiement | `dunning.ts` | — |

### Ordre de correction recommandé

1. **Plans.tsx** : passer `billingPeriod` à `createSubscription()` (fix immédiat, 1 ligne)
2. **Plans.tsx** : ajouter `billingPeriod` prop à `CheckoutForm`, afficher le bon prix
3. **index.ts** : aligner la cascade de lookup provider (sos_profiles → users → providers)
4. **webhooks.ts** : recalculer `billingPeriod` dans `handleSubscriptionUpdated`
5. **index.ts** : ajouter `billingPeriod` et `currency` dans les metadata Stripe
6. **dunning.ts** : corriger le nom du champ `currentPeriodCalls`
7. Nettoyer le code mort (3 pages, 1 hook, 1 config)
8. Retirer les console.log de debug en production
