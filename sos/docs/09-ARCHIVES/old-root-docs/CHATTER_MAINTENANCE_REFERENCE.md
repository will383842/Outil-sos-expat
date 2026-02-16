# Référence de Maintenance - Routes Chatter

**Document de référence pour toute maintenance future du système Chatter**

---

## 1. STRUCTURE DE FICHIERS

### Composants (13 fichiers):
```
sos/src/pages/Chatter/
├── ChatterLanding.tsx                 [PUBLIC]   /devenir-chatter
├── ChatterLandingOld.tsx              [PUBLIC]   /devenir-chatter-old (backup)
├── ChatterRegister.tsx                [PUBLIC]   /chatter/inscription
├── ChatterTelegramOnboarding.tsx      [PROTECTED] /chatter/telegram
├── ChatterDashboard.tsx               [PROTECTED] /chatter/tableau-de-bord
├── ChatterLeaderboard.tsx             [PROTECTED] /chatter/classement
├── ChatterPayments.tsx                [PROTECTED] /chatter/paiements
├── ChatterSuspended.tsx               [PROTECTED] /chatter/suspendu
├── ChatterPosts.tsx                   [PROTECTED] /chatter/posts
├── ChatterTraining.tsx                [PROTECTED] /chatter/formation
├── ChatterReferrals.tsx               [PROTECTED] /chatter/filleuls
├── ChatterReferralEarnings.tsx        [PROTECTED] /chatter/gains-parrainage
└── ChatterRefer.tsx                   [PROTECTED] /chatter/parrainer
```

### Configuration des Routes:
```
sos/src/App.tsx
├── Lignes 143-156:   Lazy imports des composants
└── Lignes 360-371:   Configuration dans protectedUserRoutes[]

sos/src/multilingual-system/core/routing/localeRoutes.ts
├── Lignes 883-1059:  RouteKey type definition + ROUTE_TRANSLATIONS
└── RouteKey values:  13 clés actives + 4 orphelines (à nettoyer)
```

### Traductions (9 fichiers):
```
sos/src/helper/
├── en.json   [ANGLAIS]    admin.chatterConfig.* keys
├── fr.json   [FRANÇAIS]   admin.chatterConfig.* keys
├── es.json   [ESPAGNOL]   admin.chatterConfig.* keys
├── de.json   [ALLEMAND]   admin.chatterConfig.* keys
├── ru.json   [RUSSE]      admin.chatterConfig.* keys
├── pt.json   [PORTUGAIS]  admin.chatterConfig.* keys
├── ch.json   [CHINOIS]    admin.chatterConfig.* keys
├── hi.json   [HINDI]      admin.chatterConfig.* keys
└── ar.json   [ARABE]      admin.chatterConfig.* keys
```

---

## 2. FLUXES ET DÉPENDANCES

### Flux d'Inscription Standard:
```
ChatterLanding (public)
    ↓ import { useReferralCapture } from './hooks/useAffiliate'
    ↓ useReferralCapture() capture ?ref= params
    ↓ localStorage: referralCode + tracking data
    ↓
ChatterRegister (public)
    ↓ import { ChatterRegisterForm } from './components'
    ↓ registerChatter(email, password, country)
    ├── Creates user.doc with role='chatter'
    ├── Generates affiliateCodeClient
    ├── Generates affiliateCodeRecruitment
    ├── Credits $50 bonus (locked until $150 commissions)
    └── Sets status='active' (IMMEDIATE, no email verification)
    ↓
ChatterTelegramOnboarding (protected)
    ↓ import { generateTelegramLink } from 'firebase/functions'
    ↓ Deep link with code stored in telegram_onboarding_links/{code}
    ↓ Webhook captures real telegram_id
    ↓ skipTelegramOnboarding() optional
    ↓
ChatterDashboard (protected)
    ↓ Access to other routes based on permissions
```

### Hiérarchie de Routes:
```
/:locale/devenir-chatter (landing)
/:locale/chatter/inscription (register)
/:locale/chatter/telegram (onboarding)
/:locale/chatter/tableau-de-bord (dashboard)
/:locale/chatter/classement (leaderboard)
/:locale/chatter/paiements (payments)
/:locale/chatter/suspendu (suspended)
/:locale/chatter/posts (posts)
/:locale/chatter/formation (training)
/:locale/chatter/filleuls (referrals)
/:locale/chatter/gains-parrainage (earnings)
/:locale/chatter/parrainer (refer)
```

---

## 3. CHECKLIST D'AJOUT DE NOUVELLE ROUTE

Si vous devez ajouter une nouvelle route Chatter:

### Étape 1: Créer le composant
```typescript
// sos/src/pages/Chatter/ChatterNewFeature.tsx
import React from 'react';

const ChatterNewFeature: React.FC = () => {
  return <div>New feature</div>;
};

export default ChatterNewFeature;
```

### Étape 2: Importer dans App.tsx
```typescript
// Ligne 156 (après ChatterRefer)
const ChatterNewFeature = lazy(() => import('./pages/Chatter/ChatterNewFeature'));
```

### Étape 3: Ajouter route config
```typescript
// protectedUserRoutes[] array
{
  path: "/chatter/nouvelle-route",
  component: ChatterNewFeature,
  protected: true,
  role: 'chatter',
  translated: "chatter-new-feature"  // NEW KEY
}
```

### Étape 4: Ajouter traductions
```typescript
// localeRoutes.ts - RouteKey type
| "chatter-new-feature"  // /chatter/nouvelle-route

// localeRoutes.ts - ROUTE_TRANSLATIONS
"chatter-new-feature": {
  fr: "chatter/nouvelle-route",
  en: "chatter/new-feature",
  es: "chatter/nueva-caracteristica",
  de: "chatter/neue-funktion",
  ru: "chatter/novaya-funkciya",
  pt: "chatter/novo-recurso",
  ch: "chatter/xin-gongneng",
  hi: "chatter/naya-feature",
  ar: "مسوق/ميزة-جديدة",
}
```

### Étape 5: Ajouter clés i18n (si besoin)
```typescript
// en.json / fr.json / etc.
"page.chatter.newFeature.title": "New Feature"
"page.chatter.newFeature.description": "..."
```

---

## 4. MAPPINGS DE CLÉS

### Route Keys Actifs:
```
chatter-landing              → /devenir-chatter
chatter-register            → /chatter/inscription
chatter-telegram            → /chatter/telegram
chatter-dashboard           → /chatter/tableau-de-bord
chatter-leaderboard         → /chatter/classement
chatter-payments            → /chatter/paiements
chatter-suspended           → /chatter/suspendu
chatter-posts               → /chatter/posts
chatter-training            → /chatter/formation
chatter-referrals           → /chatter/filleuls
chatter-referral-earnings   → /chatter/gains-parrainage
chatter-refer               → /chatter/parrainer
```

### Clés Orphelines (à nettoyer):
```
chatter-presentation        → /chatter/presentation       [SUPPRIMÉE]
chatter-quiz               → /chatter/quiz               [SUPPRIMÉE]
chatter-country-selection  → /chatter/pays               [NON UTILISÉE]
chatter-zoom               → /chatter/zoom               [NON UTILISÉE]
```

---

## 5. PROTECTION ET RÔLES

### Logique de Protection:
```typescript
// App.tsx line 805
<ProtectedRoute allowedRoles={role}>
  <Component />
</ProtectedRoute>

// ProtectedRoute vérifie:
// 1. user est authentifié
// 2. user.role === 'chatter' (ou autre rôle spécifié)
// 3. user n'a pas d'autres rôles (mutuelle exclusion)
```

### Rôles Mutuellement Exclusifs:
```
Une personne = EXACTEMENT UN RÔLE:
  - chatter
  - influencer
  - blogger
  - groupAdmin
  - client
  - lawyer
  - expat

ChatterRegister vérifie que user n'a pas déjà un autre rôle.
```

---

## 6. TRADUCTIONS MULTILINGUES

### Langues Supportées:
```
FR (Français)         fr-fr, fr-be, fr-ca, fr-ch, fr-ma
EN (Anglais)          en-us, en-gb, en-au, en-ca
ES (Espagnol)         es-es, es-mx, es-ar
DE (Allemand)         de-de, de-at, de-ch
RU (Russe)            ru-ru
PT (Portugais)        pt-br, pt-pt
CH (Chinois)          zh-cn, zh-tw (URL: zh)
HI (Hindi)            hi-in
AR (Arabe)            ar-sa, ar-ae
```

### Format de Traduction:
```typescript
// localeRoutes.ts format:
"chatter-xyz": {
  fr: "chatter/xyz",           // French slug
  en: "chatter/xyz",           // English slug
  es: "chatter/xyz",           // Spanish slug
  // ... 9 langues total
}

// App.tsx utilise getLocaleString(language) pour prefix:
// Résultat: /fr-fr/chatter/xyz, /en-us/chatter/xyz, etc.
```

---

## 7. DÉSACTIVATION DE ROUTES

### Processus de Suppression Sécurisée:

#### Étape 1: Commenter dans App.tsx
```typescript
// Commentaire avec raison et date
// DISABLED 2026-02-06: Quiz route supprimée (40% drop-off utilisateur)
// { path: "/chatter/quiz", component: ChatterQuiz, ... }
```

#### Étape 2: Laisser traductions (temporaire)
```typescript
// Les traductions restent dans localeRoutes.ts pour:
// - Reverse lookup si nécessaire
// - Documentation historique
// - Récupération rapide si réactivation
```

#### Étape 3: Nettoyage (quand certain)
```typescript
// Après quelques mois, supprimer les traductions orphelines
// Voir CHATTER_CLEANUP_ACTION_PLAN.md
```

---

## 8. PATTERNS COURANTS

### Récupérer la locale en component:
```typescript
import { useApp } from '@/contexts/AppContext';
import { getLocaleString } from '@/multilingual-system';

const MyComponent = () => {
  const { language } = useApp();
  const localePrefix = getLocaleString(language);
  // Utiliser localePrefix pour navigations
};
```

### Générer lien traduit:
```typescript
import { getTranslatedRoutePath } from '@/multilingual-system';

const link = getTranslatedRoutePath('chatter-dashboard', 'fr');
// Retourne: chatter/tableau-de-bord (pour route /fr-fr/chatter/tableau-de-bord)
```

### Récupérer route key depuis slug:
```typescript
import { getRouteKeyFromSlug } from '@/multilingual-system';

const key = getRouteKeyFromSlug('tableau-de-bord');
// Retourne: 'chatter-dashboard'
```

---

## 9. TESTS DE VALIDATION

### Vérifier les routes:
```bash
# Vérifier tous les composants existent
find sos/src/pages/Chatter -name "*.tsx" | wc -l
# Attend: 13

# Vérifier App.tsx imports
grep "ChatterRefer\|ChatterPayments\|ChatterDashboard" sos/src/App.tsx | wc -l
# Attend: 13+

# Vérifier traductions
grep -c '"chatter-' sos/src/multilingual-system/core/routing/localeRoutes.ts
# Attend: ~17 (13 actives + 4 orphelines)

# Vérifier fichiers i18n
grep -c "admin.chatterConfig" sos/src/helper/en.json
# Attend: >20
```

### Test manuel:
```bash
# Compiler
npm run build

# Tester routes
# 1. Aller à /fr-fr/devenir-chatter → ChatterLanding
# 2. Aller à /en-us/chatter/inscription → ChatterRegister
# 3. Se connecter, aller à /fr-fr/chatter/tableau-de-bord → ChatterDashboard
# 4. Tester changer langue: /es-es/chatter/parrainer → slug traduit
```

---

## 10. ALERTES ET ERREURS COURANTS

### Erreur: Route 404
```
Cause possible: Chemin pas traduit dans localeRoutes.ts
Solution: Vérifier RouteKey dans App.tsx + définition dans ROUTE_TRANSLATIONS
```

### Erreur: Traduction manquante
```
Cause possible: Langue pas dans ROUTE_TRANSLATIONS
Solution: Ajouter la langue à la définition (9 langues requises)
```

### Erreur: Protected route sans auth
```
Cause possible: Rôle non appliqué correctement
Solution: Vérifier role: 'chatter' dans protectedUserRoutes
```

### Erreur: Composant importé mais non trouvé
```
Cause possible: Typo dans import lazy()
Solution: Vérifier exact path: ./pages/Chatter/ChatterXyz
```

---

## 11. COMMITS GIT STANDARDS

### Ajouter nouvelle route:
```bash
git commit -m "feat(chatter): add new-feature route

- Add ChatterNewFeature component
- Add route /chatter/nouvelle-route
- Add translations for 9 languages
- Add i18n keys for new feature

Also updates:
- App.tsx (lazy import + route config)
- localeRoutes.ts (RouteKey + ROUTE_TRANSLATIONS)
- helper/*.json (chatter translations)"
```

### Fixer traductions:
```bash
git commit -m "fix(chatter): update translations for xyz route

- Fix missing Spanish translation
- Update German wording
- Sync with other routes"
```

### Nettoyer traductions orphelines:
```bash
git commit -m "chore: remove orphaned Chatter route translations

- Remove chatter-presentation (suppressed due to drop-off)
- Remove chatter-quiz (suppressed due to drop-off)
- Remove chatter-country-selection (never implemented)
- Remove chatter-zoom (never implemented)

No impact on live routes or user experience."
```

---

## 12. CONTACT & ESCALADE

### Équipe responsable:
- Frontend: Routes, composants, protection
- i18n: Traductions multilingues
- Backend: Telegram onboarding, activation, codes
- DevOps: Deployment, Firebase Functions

### Où demander aide:
- Routes: Frontend lead
- Traductions: i18n coordinator
- Auth/Protection: Security team
- Backend logic: Backend lead

---

## 13. HISTORIQUE DES CHANGEMENTS

### 2026-02-06: Simplification flux inscription
- Suppression: presentation et quiz routes
- Raison: Quiz causait 40% drop-off utilisateur
- Changement: Landing → Register → Telegram → Dashboard
- Activation: IMMÉDIATE (status="active")
- Codes: Générés automatiquement à l'inscription

### 2026-02-13: Audit complet
- Vérification: 100% cohérence et couverture multilingue
- Identification: 4 traductions orphelines
- Recommandation: Nettoyage localeRoutes.ts

---

**Document maintenu et mis à jour régulièrement.**
**Version: 1.0**
**Dernier update: 2026-02-13**
