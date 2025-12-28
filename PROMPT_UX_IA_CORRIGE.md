# PROMPT CORRIGE : Ameliorations UX Systeme IA SOS-Expat

> **Version corrigee** basee sur l'analyse approfondie du projet par 20 agents IA.
> Les corrections sont marquees avec le tag `[CORRIGE]` ou `[AJOUTE]`.

---

## ARCHITECTURE DU PROJET [AJOUTE]

### Structure Monorepo

Ce projet est un **monorepo** contenant deux applications distinctes :

```
sos-expat-project/
├── sos/                          <- Application principale SOS-Expat (Frontend React)
│   ├── src/
│   │   ├── components/           <- Composants React
│   │   ├── pages/                <- Pages (Dashboard, Subscription, etc.)
│   │   ├── services/             <- Services metier
│   │   ├── hooks/                <- Hooks personnalises
│   │   ├── contexts/             <- Contextes React
│   │   ├── i18n/locales/         <- Fichiers de traduction
│   │   └── types/                <- Types TypeScript
│   └── firebase/functions/       <- Cloud Functions SOS
│
└── Outil-sos-expat/              <- Outil IA Admin (Application separee)
    ├── src/                      <- Frontend Outil
    └── functions/src/            <- Cloud Functions Outil (SSO, quota, etc.)
```

### Regles de nommage des chemins

| Contexte | Prefixe correct |
|----------|-----------------|
| Composants frontend SOS | `sos/src/...` |
| Pages dashboard SOS | `sos/src/pages/Dashboard/...` |
| Services subscription | `sos/src/services/subscription/...` |
| Cloud Functions Outil | `Outil-sos-expat/functions/src/...` |
| Cloud Functions SOS | `sos/firebase/functions/src/...` |

---

## CONTEXTE

Je travaille sur le systeme d'abonnement IA de SOS-Expat. Le systeme actuel permet aux prestataires (avocats et expatries aidants) d'acceder a un outil IA externe via un systeme de quotas et d'abonnements.

### Architecture actuelle :
- **SOS-Expat** (`sos/`) : Gere les abonnements, quotas, paiements Stripe
- **Outil IA** (`Outil-sos-expat/`) : L'outil de chat IA externe accessible via SSO (outil.sos-expat.com)
- **Stack** : React + TypeScript + Firebase + Stripe + Vite

### PORTEE INTERNATIONALE (CRITIQUE)

**9 langues supportees :**
| Code | Langue | Direction |
|------|--------|-----------|
| `fr` | Francais | LTR |
| `en` | Anglais | LTR |
| `es` | Espagnol | LTR |
| `de` | Allemand | LTR |
| `pt` | Portugais | LTR |
| `ru` | Russe | LTR |
| `ar` | Arabe | **RTL** |
| `zh` | Chinois | LTR |
| `hi` | Hindi | LTR |

**197 pays couverts** avec devises locales variees.

### Pages existantes (chemins corriges) [CORRIGE] :
- `sos/src/pages/Dashboard/AiAssistant/Index.tsx` -> Passerelle vers l'Outil IA
- `sos/src/pages/Dashboard/Subscription/Index.tsx` -> Gestion de l'abonnement
- `sos/src/pages/Dashboard/Subscription/Plans.tsx` -> Selection des plans
- `sos/src/pages/Dashboard/Subscription/Success.tsx` -> Confirmation post-paiement

### Configuration Trial actuelle :
- 30 jours d'essai
- 3 appels IA gratuits
- Sans carte de credit

---

## PREREQUIS TECHNIQUES [AJOUTE]

### 1. Audit i18n prealable

Avant de creer de nouveaux fichiers de traduction, verifier la structure existante :

```bash
# Structure actuelle detectee
sos/src/i18n/locales/subscription.json   # Fichier unique detecte
Outil-sos-expat/src/i18n/locales/        # Structure par langue (fr/, en/, ar/)
```

**Action requise** : Harmoniser avec la structure existante ou migrer vers structure par langue.

### 2. Installation RTL pour l'arabe

Le plugin RTL n'est pas installe. Ajouter :

```bash
# Dans sos/
npm install tailwindcss-rtl
```

Modifier `sos/tailwind.config.js` :
```javascript
module.exports = {
  plugins: [
    require('@tailwindcss/forms'),
    require('tailwindcss-animate'),
    require('tailwindcss-rtl'),  // [AJOUTE]
  ],
}
```

### 3. Configuration Google Analytics 4 [AJOUTE]

Le projet n'a pas GA4 configure (seulement Sentry). Pour les analytics subscription :

```bash
npm install @types/gtag.js
```

Ajouter dans `sos/index.html` :
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

---

## COMPOSANTS EXISTANTS A REUTILISER [AJOUTE]

Ces composants existent deja et peuvent etre reutilises :

| Composant | Chemin | Usage |
|-----------|--------|-------|
| `QuotaUsageBar` | `sos/src/components/subscription/QuotaUsageBar.tsx` | Barre de progression quota |
| `PricingTable` | `sos/src/components/subscription/PricingTable.tsx` | Grille des plans |
| `SubscriptionCard` | `sos/src/components/subscription/SubscriptionCard.tsx` | Carte plan actuel |
| `MobileDrawer` | `Outil-sos-expat/src/components/navigation/MobileDrawer.tsx` | Pattern drawer mobile |
| `BottomNavigation` | `Outil-sos-expat/src/components/navigation/BottomNavigation.tsx` | Nav mobile |

### Hooks existants :

| Hook | Chemin | Fonctionnalites |
|------|--------|-----------------|
| `useSubscription` | `sos/src/hooks/useSubscription.ts` | Donnees abonnement |
| `useAiQuota` | `sos/src/hooks/useAiQuota.ts` | Quota IA, canMakeAiCall |
| `useBreakpoint` | `Outil-sos-expat/src/hooks/useMediaQuery.ts` | Detection responsive |
| `useDeviceDetection` | `sos/src/hooks/useDeviceDetection.ts` | Mobile/tablet/desktop |

---

## REGLES INTERNATIONALES OBLIGATOIRES

### 1. Toutes les chaines de texte via i18n
```typescript
// INTERDIT
<p>Votre essai gratuit</p>

// OBLIGATOIRE
<p>{t('subscription.trial.title')}</p>
```

### 2. Structure des fichiers de traduction [CORRIGE]

Adapter a la structure existante du projet :

```
sos/src/i18n/locales/
├── subscription.json      # Si structure fichier unique
└── [langue]/              # OU si structure par langue
    └── subscription.json
```

### 3. Support RTL pour l'arabe
```typescript
// Utiliser les classes Tailwind RTL (apres installation du plugin)
<div className="ml-4 rtl:mr-4 rtl:ml-0">
<div className="text-left rtl:text-right">
<ChevronRight className="rtl:rotate-180" />
```

### 4. Formatage des dates selon la locale
```typescript
const dateStr = new Intl.DateTimeFormat(locale, {
  day: 'numeric',
  month: 'long',
  year: 'numeric'
}).format(date);
```

### 5. Formatage des montants selon la locale et devise
```typescript
const price = new Intl.NumberFormat(locale, {
  style: 'currency',
  currency: userCurrency // EUR, USD, GBP, etc.
}).format(amount);
```

---

## AMELIORATIONS A IMPLEMENTER

### 1. AUTO-ACTIVATION DU TRIAL A L'INSCRIPTION

**Probleme** : Actuellement le prestataire doit manuellement aller sur `/dashboard/subscription` et cliquer "Demarrer l'essai".

**Solution** : Activer automatiquement le trial des l'inscription.

**Fichiers a modifier** [CORRIGE] :
- `sos/src/contexts/AuthContext.tsx` ou le flux d'inscription
- La fonction `startTrial()` existe deja dans `sos/src/services/subscription/subscriptionService.ts` (lignes 208-269)

**Specifications** :
- A la creation du compte prestataire (lawyer ou expat_aidant), appeler `startTrial()` automatiquement
- Les documents `subscriptions/{uid}` et `ai_usage/{uid}` sont deja crees par `startTrial()`
- Logger l'evenement pour analytics

```typescript
// Dans AuthContext.tsx ou le handler d'inscription
import { startTrial } from '../services/subscription/subscriptionService';

const onUserCreated = async (user: User) => {
  if (user.role === 'lawyer' || user.role === 'expat_aidant') {
    await startTrial(user.uid, user.role === 'lawyer' ? 'lawyer' : 'expat_aidant');
    // Logger pour analytics
    trackEvent('trial_started', { provider_type: user.role });
  }
};
```

---

### 2. ONBOARDING GUIDE POST-INSCRIPTION

**Probleme** : Apres activation du trial, l'utilisateur est perdu sans guide.

**Solution** : Creer un wizard d'onboarding en 3-4 etapes.

**Nouveau fichier** [CORRIGE] : `sos/src/components/onboarding/AiOnboardingWizard.tsx`

**Specifications** :
- Modal/Drawer qui s'affiche au premier acces a `/dashboard/ai-assistant`
- Stocker `hasCompletedAiOnboarding: boolean` dans le profil utilisateur Firestore
- Design moderne avec illustrations
- **100% traduisible via i18n**
- **Support RTL pour l'arabe**

**Etapes du wizard** :
```
Etape 1: {t('onboarding.step1.title')} // "Bienvenue sur l'Assistant IA SOS-Expat"
Etape 2: {t('onboarding.step2.title')} // "Votre essai gratuit"
Etape 3: {t('onboarding.step3.title')} // "Comment ca marche"
Etape 4: {t('onboarding.step4.title')} // "Pret a commencer !"
```

**Cles i18n a creer** :
```json
{
  "onboarding": {
    "step1": {
      "title": "Bienvenue sur l'Assistant IA SOS-Expat",
      "description": "Votre nouvel allie pour accompagner vos clients expatries"
    },
    "step2": {
      "title": "Votre essai gratuit",
      "description": "Profitez de {{days}} jours et {{calls}} appels IA offerts",
      "no_credit_card": "Aucune carte bancaire requise"
    },
    "step3": {
      "title": "Comment ca marche",
      "item1": "Vous recevez une demande de booking client",
      "item2": "L'IA analyse la demande et prepare une reponse",
      "item3": "Vous validez et personnalisez avant envoi"
    },
    "step4": {
      "title": "Pret a commencer !",
      "description": "Accedez maintenant a votre outil IA"
    },
    "cta": "Acceder a l'Outil IA",
    "dont_show_again": "Ne plus afficher ce guide",
    "next": "Suivant",
    "previous": "Precedent",
    "skip": "Passer"
  }
}
```

---

### 3. BANNER TRIAL DANS LE HEADER GLOBAL

**Probleme** : L'utilisateur en trial n'a pas de rappel constant de son statut.

**Solution** : Ajouter un banner sticky en haut du dashboard.

**Nouveau fichier** [CORRIGE] : `sos/src/components/common/TrialBanner.tsx`

**Fichier a modifier** [CORRIGE] : `sos/src/components/layout/Header.tsx` (ou DashboardLayout)

**Specifications** :
```typescript
interface TrialBannerProps {
  daysRemaining: number;
  callsRemaining: number;
  onUpgradeClick: () => void;
  locale: string;
}
```

**Affichage conditionnel** :
- Si `isInTrial && trialDaysRemaining <= 7` -> Banner orange
- Si `isInTrial && trialCallsRemaining <= 1` -> Banner orange
- Si `isInTrial && (trialDaysRemaining <= 3 || trialCallsRemaining === 0)` -> Banner rouge urgent

**Cles i18n** :
```json
{
  "trial_banner": {
    "message": "Essai gratuit : {{days}} jours et {{calls}} appels restants",
    "message_urgent": "Votre essai expire demain !",
    "message_expired": "Votre essai est termine",
    "cta": "Voir les plans"
  }
}
```

---

### 4. MODAL "QUOTA EPUISE" AU LIEU DE REDIRECTION BRUTALE

**Probleme confirme** : Dans `sos/src/pages/Dashboard/AiAssistant/Index.tsx` (lignes 213-217), quand l'utilisateur clique "Acceder a l'Outil IA" sans quota, il est redirige directement vers les plans :

```typescript
// Code actuel (PROBLEME)
if (!canMakeAiCall) {
  navigate('/dashboard/subscription/plans');  // Redirection brutale
  return;
}
```

**Solution** : Afficher une modal explicative avec options.

**Nouveau fichier** [CORRIGE] : `sos/src/components/subscription/QuotaExhaustedModal.tsx`

**Fichier a modifier** [CORRIGE] : `sos/src/pages/Dashboard/AiAssistant/Index.tsx`

**Specifications** :
```typescript
interface QuotaExhaustedModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: 'trial_expired' | 'trial_calls_exhausted' | 'quota_exhausted' | 'subscription_expired' | 'payment_failed';
  suggestedPlan?: { tier: string; planId: string };
  onViewPlans: () => void;
  onContactSupport: () => void;
  locale: string;
}
```

**Modification du code existant** :
```typescript
// AVANT (ligne 213-217)
if (!canMakeAiCall) {
  navigate('/dashboard/subscription/plans');
  return;
}

// APRES
if (!canMakeAiCall) {
  setShowQuotaModal(true);  // Afficher la modal
  return;
}
```

**Cles i18n** :
```json
{
  "quota_modal": {
    "trial_expired": {
      "title": "Votre essai est termine",
      "message": "Vos {{days}} jours d'essai sont ecoules. Choisissez un plan pour continuer.",
      "cta": "Voir les plans"
    },
    "trial_calls_exhausted": {
      "title": "Appels gratuits epuises",
      "message": "Vous avez utilise vos {{count}} appels gratuits.",
      "cta": "Choisir un plan"
    },
    "quota_exhausted": {
      "title": "Quota mensuel atteint",
      "message": "Vous avez utilise vos {{count}} appels ce mois.",
      "cta": "Upgrader"
    },
    "contact_support": "Contacter le support"
  }
}
```

---

### 5. SYSTEME DE NOTIFICATIONS PROACTIVES

**Probleme** : Pas de rappels avant expiration du trial ou quota.

**Solution** : Implementer des notifications email + in-app.

#### A) Notifications In-App

**Nouveau fichier** [CORRIGE] : `sos/src/components/notifications/SubscriptionNotifications.tsx`

**Triggers** :
- Trial : J-7, J-3, J-1, J-0
- Quota : 80%, 100%
- Paiement echoue : immediat

#### B) Emails Automatiques (Cloud Functions)

**Nouveau fichier** [CORRIGE] : `sos/firebase/functions/src/subscriptions/subscriptionEmails.ts`

> Note : Le dossier `sos/firebase/functions/src/subscriptions/` existe deja avec `dunning.ts` et `dunning-email-templates.ts`. Integrer les nouveaux templates dans cette structure.

**Templates a creer (EN 9 LANGUES)** :
1. `trial_welcome` -> Envoye a l'activation du trial
2. `trial_expiring_7days` -> J-7
3. `trial_expiring_3days` -> J-3
4. `trial_expiring_tomorrow` -> J-1
5. `trial_expired` -> J-0
6. `quota_80_percent` -> 80% du quota utilise
7. `quota_exhausted` -> 100% du quota
8. `payment_failed` -> Echec de paiement
9. `subscription_renewed` -> Renouvellement reussi

---

### 6. PAGE AI ASSISTANT AMELIOREE

**Probleme confirme** : Le TODO aux lignes 189-196 de `AiAssistant/Index.tsx` :

```typescript
// TODO: Implement API call to Outil to fetch recent conversations
// For now, we'll show a placeholder
setRecentConversations([]);
```

**Fichier a modifier** [CORRIGE] : `sos/src/pages/Dashboard/AiAssistant/Index.tsx`

#### A) Fetch des conversations depuis l'Outil

```typescript
// Remplacer le TODO (lignes 189-196) par :
const fetchRecentConversations = async () => {
  try {
    const token = await user?.getIdToken();
    const response = await fetch(
      `${OUTIL_API_URL}/api/provider/${user.uid}/conversations?limit=5`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    const data = await response.json();
    setRecentConversations(data.conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    setRecentConversations([]);
  }
};
```

#### B) Quick Stats en haut de page

Ajouter des stats rapides utilisant les hooks existants `useAiQuota()` et `useSubscription()`.

---

### 7. AMELIORATION PAGE PLANS

**Fichier a modifier** [CORRIGE] : `sos/src/pages/Dashboard/Subscription/Plans.tsx`

**Ameliorations** :

#### A) Swiper horizontal sur mobile [AJOUTE]

Le projet n'a pas de carousel. Installer et utiliser :

```bash
npm install swiper
```

```typescript
import { Swiper, SwiperSlide } from 'swiper/react';

// Sur mobile, remplacer la grille par un swiper
{isMobile ? (
  <Swiper spaceBetween={16} slidesPerView={1.2}>
    {plans.map(plan => (
      <SwiperSlide key={plan.id}>
        <PlanCard plan={plan} />
      </SwiperSlide>
    ))}
  </Swiper>
) : (
  <PricingTable plans={plans} />
)}
```

#### B) Calculateur de ROI
#### C) Temoignages/Social Proof
#### D) Garantie satisfait ou rembourse

---

### 8. GAMIFICATION & ENGAGEMENT

**Nouveau fichier** [CORRIGE] : `sos/src/components/gamification/AiUsageRewards.tsx`

**Concepts** :
- Badges pour milestones (premier appel, 10 appels, 50 appels)
- Streak de connexion
- Progress bar vers le prochain badge

---

### 9. ANALYTICS & TRACKING [CORRIGE]

**Nouveau fichier** : `sos/src/utils/subscriptionAnalytics.ts`

> **Prerequis** : Configurer GA4 (voir section Prerequis Techniques)

**Evenements a tracker** :
```typescript
// Utiliser gtag ou wrapper
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

export const trackSubscriptionEvent = (
  eventName: string,
  params: Record<string, any>
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }

  // Aussi logger dans l'audit Firestore existant
  // auditLog.log(eventName, params);
};

// Evenements
trackSubscriptionEvent('trial_started', { provider_type: 'lawyer' });
trackSubscriptionEvent('trial_call_made', { calls_remaining: 2 });
trackSubscriptionEvent('plan_viewed', { plan_tier: 'pro', currency: 'EUR' });
trackSubscriptionEvent('checkout_started', { plan_tier: 'pro', amount: 79 });
trackSubscriptionEvent('subscription_created', { plan_tier: 'pro' });
```

---

## RESUME DES FICHIERS A CREER/MODIFIER [CORRIGE]

### Nouveaux fichiers :
```
sos/src/components/onboarding/AiOnboardingWizard.tsx
sos/src/components/common/TrialBanner.tsx
sos/src/components/subscription/QuotaExhaustedModal.tsx
sos/src/components/notifications/SubscriptionNotifications.tsx
sos/src/components/gamification/AiUsageRewards.tsx
sos/src/utils/subscriptionAnalytics.ts
sos/firebase/functions/src/subscriptions/subscriptionEmails.ts
```

### Fichiers a modifier :
```
sos/src/contexts/AuthContext.tsx (auto-activation trial)
sos/src/components/layout/Header.tsx (ou DashboardLayout - trial banner)
sos/src/pages/Dashboard/AiAssistant/Index.tsx (modal + API conversations)
sos/src/pages/Dashboard/Subscription/Plans.tsx (swiper mobile)
sos/tailwind.config.js (plugin RTL)
sos/index.html (script GA4)
```

### Fichiers de traduction a creer/modifier :

Selon la structure existante du projet, ajouter les cles dans :
```
sos/src/i18n/locales/subscription.json  # Enrichir ce fichier
# OU creer dans chaque dossier langue si structure par langue
```

---

## ORDRE DE PRIORITE

1. **P0 - Critique** : Auto-activation trial + Modal quota epuise
2. **P1 - Important** : Trial banner + Notifications email
3. **P2 - Nice-to-have** : Onboarding wizard + Analytics + Swiper mobile
4. **P3 - Future** : Gamification + Calculateur ROI

---

## CHECKLIST PRE-IMPLEMENTATION [AJOUTE]

- [ ] Installer `tailwindcss-rtl` dans `sos/`
- [ ] Configurer GA4 (si analytics requis)
- [ ] Auditer structure i18n existante
- [ ] Verifier que `startTrial()` fonctionne en standalone
- [ ] Tester le flow SSO vers Outil existant
- [ ] Verifier les permissions Firestore pour nouvelles collections

---

## TESTS A EFFECTUER

### Tests fonctionnels
- [ ] Inscription nouveau prestataire -> Trial auto-active
- [ ] Premier acces AI Assistant -> Onboarding affiche
- [ ] Utiliser 3 appels trial -> Modal "appels epuises"
- [ ] Cliquer "Acceder Outil" sans quota -> Modal (pas redirection)
- [ ] Souscrire plan -> Redirection success + confetti

### Tests internationaux (9 langues)
- [ ] **AR** : Layout RTL correct, icones inversees
- [ ] **DE** : Textes longs ne debordent pas
- [ ] **ZH** : Caracteres chinois OK
- [ ] Formatage dates/nombres par locale

---

**Implemente ces ameliorations en respectant l'architecture monorepo existante. Priorite absolue : Support RTL arabe et traductions completes AVANT de merger.**
