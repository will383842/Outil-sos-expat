# Rapport d'Analyse Complet - Migration SOS-Expat vers Next.js
## Analyse par 50 Agents IA Parallèles

**Date de génération :** 3 Janvier 2026
**Version :** 1.0
**Projet :** SOS-Expat.com - Plateforme d'assistance juridique pour expatriés

---

## 1. Résumé Exécutif

### 1.1 Statistiques Globales du Projet

| Métrique | Valeur |
|----------|--------|
| **Fichiers TypeScript/TSX** | ~250+ fichiers |
| **Pages publiques** | ~45 pages |
| **Pages admin** | ~55 pages |
| **Composants partagés** | ~85 composants |
| **Hooks personnalisés** | 19 hooks |
| **Langues supportées** | 9 (fr, en, es, de, pt, ru, zh, ar, hi) |
| **Pays couverts** | 197 pays |
| **APIs Browser détectées** | 600+ occurrences |
| **Schemas JSON-LD** | 9 types |
| **Cloud Functions** | 50+ fonctions |

### 1.2 Complexité de Migration : **ÉLEVÉE**

**Raisons principales :**
- 600+ utilisations d'APIs browser (window, localStorage, navigator, document)
- Système multilingue sophistiqué avec 38 routes traduites en 9 langues
- Firebase Client SDK utilisé intensivement (Auth, Firestore, Storage)
- PWA complète avec Service Worker
- Deux gateways de paiement (Stripe + PayPal)
- Système SEO déjà très complet à préserver

### 1.3 Points Forts Existants

- **SEO très avancé** : 9 types de schemas JSON-LD, hreflang complet, sitemap dynamique
- **Multilingue complet** : 38 slugs traduits, 142+ combinaisons locale/pays
- **robots.txt optimisé** : Configuration pour 20+ bots (Google, IA conversationnelles)
- **Architecture modulaire** : Hooks, contexts, services bien séparés

---

## 2. Architecture Actuelle

### 2.1 Stack Technique

```
Frontend:
├── React 18.3.1 + React Router 6.30.1
├── TypeScript 5.9.2
├── Vite 5.4.2 (build tool)
├── Tailwind CSS 3.4.1 + Emotion
├── Material-UI 7.2.0 (admin)
├── Headless UI + Radix UI
└── react-intl (i18n)

Backend:
├── Firebase 12.3.0
│   ├── Authentication
│   ├── Firestore
│   ├── Storage
│   └── Cloud Functions
├── Stripe Connect
└── PayPal Commerce Platform

Infrastructure:
├── Digital Ocean App Platform (cible)
├── Firebase Hosting (actuel)
└── PWA avec Service Worker
```

### 2.2 Structure des Dossiers

```
sos/
├── src/
│   ├── pages/                  # ~100 pages React
│   │   ├── admin/              # ~55 pages admin (MUI)
│   │   ├── Dashboard/          # Pages tableau de bord
│   │   └── *.tsx               # Pages publiques
│   ├── components/             # ~85 composants
│   │   ├── layout/             # Header, Footer, Layout
│   │   ├── seo/                # 6 composants schemas
│   │   ├── payment/            # Stripe, PayPal
│   │   ├── common/             # Modal, Button, etc.
│   │   └── ...
│   ├── hooks/                  # 19 hooks personnalisés
│   ├── contexts/               # Auth, App, PayPal
│   ├── helper/                 # 9 fichiers JSON de traduction
│   ├── multilingual-system/    # Routing multilingue
│   ├── utils/                  # Services utilitaires
│   └── firebase/               # Config Firebase client
├── firebase/
│   └── functions/src/          # 50+ Cloud Functions
├── public/                     # Assets statiques
└── dist/                       # Build de production
```

---

## 3. Analyse SEO Existante

### 3.1 Composants SEO Trouvés

| Composant | Fichier | Rôle |
|-----------|---------|------|
| **SEOHead** | `components/layout/SEOHead.tsx` | Meta tags, OG, Twitter Cards |
| **OrganizationSchema** | `components/seo/OrganizationSchema.tsx` | Schema Organization |
| **ReviewSchema** | `components/seo/ReviewSchema.tsx` | Reviews + AggregateRating |
| **LocalBusinessSchema** | `components/seo/LocalBusinessSchema.tsx` | Business local |
| **ProfessionalServiceSchema** | `components/seo/ProfessionalServiceSchema.tsx` | Profils prestataires |
| **BreadcrumbSchema** | `components/seo/BreadcrumbSchema.tsx` | Fil d'Ariane |
| **HreflangLinks** | `multilingual-system/components/HrefLang/` | Liens alternatifs |

### 3.2 Schemas JSON-LD Identifiés (9 types)

1. **Organization** - Informations entreprise SOS-Expat
2. **WebSite** - Avec SearchAction pour site search
3. **LocalBusiness/ProfessionalService** - Pour les prestataires
4. **Review + AggregateRating** - Notes et avis (4.9/5, 127+ avis)
5. **FAQPage** - Questions/réponses structurées
6. **HowTo** - Guide étape par étape
7. **BreadcrumbList** - Navigation hiérarchique
8. **Person/Attorney** - Profils avocats/experts
9. **Service** - Offres de services

### 3.3 Système Hreflang

**Fichiers clés :**
- `HreflangLinks.tsx` - Génération des liens alternatifs
- `HrefLangConstants.ts` - Configuration des langues

**Langues supportées avec codes :**
| Langue | Code | URL Pattern |
|--------|------|-------------|
| Français | fr-FR | `/fr-fr/...` |
| Anglais | en-US | `/en-us/...` |
| Espagnol | es-ES | `/es-es/...` |
| Allemand | de-DE | `/de-de/...` |
| Portugais | pt-PT | `/pt-pt/...` |
| Russe | ru-RU | `/ru-ru/...` |
| Chinois | zh-CN | `/zh-cn/...` |
| Hindi | hi-IN | `/hi-in/...` |
| Arabe | ar-SA | `/ar-sa/...` |

### 3.4 Robots.txt - Configuration Actuelle

**Points forts :**
- ✅ Crawl-delay 0 pour Googlebot
- ✅ Bots IA autorisés (GPTBot, ClaudeBot, PerplexityBot)
- ✅ 5 sitemaps référencés
- ✅ Blocage des scrapers agressifs (SemrushBot, AhrefsBot)
- ✅ Support IndexNow

**Pages bloquées :**
- `/dashboard`, `/admin`, `/api/`, `/call-checkout`, `/payment-success`

### 3.5 Sitemaps Existants

1. `sitemap.xml` - Principal
2. `sitemap-static.xml` - Pages statiques
3. `sitemapProfiles` - Cloud Function dynamique
4. `sitemapBlog` - Articles de blog
5. `sitemapLanding` - Landing pages

---

## 4. Système Multilingue

### 4.1 Configuration i18n

**Bibliothèque :** react-intl (^7.1.11)

**Fichiers de traduction :**
```
src/helper/
├── fr.json      # Français (~1500+ clés)
├── en.json      # Anglais
├── es.json      # Espagnol
├── de.json      # Allemand
├── pt.json      # Portugais
├── ru.json      # Russe
├── ch.json      # Chinois (simplifié)
├── ar.json      # Arabe (RTL)
└── hi.json      # Hindi
```

### 4.2 Slugs Traduits (38 routes)

| Route Key | Français | Anglais | Espagnol |
|-----------|----------|---------|----------|
| lawyer | `/avocat` | `/lawyers` | `/abogados` |
| expat | `/expatrie` | `/expats` | `/expatriados` |
| pricing | `/tarifs` | `/pricing` | `/precios` |
| contact | `/contact` | `/contact` | `/contacto` |
| how-it-works | `/comment-ca-marche` | `/how-it-works` | `/como-funciona` |
| faq | `/faq` | `/faq` | `/preguntas-frecuentes` |
| help-center | `/centre-aide` | `/help-center` | `/centro-ayuda` |
| testimonials | `/temoignages` | `/testimonials` | `/testimonios` |
| providers | `/prestataires` | `/providers` | `/proveedores` |
| dashboard | `/tableau-de-bord` | `/dashboard` | `/panel` |
| login | `/connexion` | `/login` | `/iniciar-sesion` |
| register | `/inscription` | `/register` | `/registro` |

**Total combinaisons :** 142+ locales (langue-pays)

### 4.3 Support RTL (Arabe)

**Configuration détectée :**
- `document.documentElement.dir = 'rtl'`
- Classes CSS `.rtl` ajoutées dynamiquement
- Fichiers de traduction complets en arabe

---

## 5. Points de Friction SSR

### 5.1 Résumé des APIs Browser

| API | Occurrences | Criticité |
|-----|-------------|-----------|
| `window.*` | ~400+ | CRITIQUE |
| `localStorage` | ~120+ | HAUTE |
| `sessionStorage` | ~120+ | HAUTE |
| `navigator.*` | ~80+ | MOYENNE |
| `document.*` | ~105+ | HAUTE |

### 5.2 Détail `window` (400+ occurrences)

**Catégories principales :**

| Usage | Fichiers | Criticité SSR |
|-------|----------|---------------|
| `window.location.*` | 25+ fichiers | BLOQUANT |
| `window.scrollTo()` | 15+ fichiers | BLOQUANT |
| `window.addEventListener()` | 20+ fichiers | BLOQUANT |
| `window.localStorage` | 40+ fichiers | BLOQUANT |
| `window.innerWidth/Height` | 10+ fichiers | ADAPTABLE |
| `window.matchMedia()` | 8+ fichiers | ADAPTABLE |
| `window.gtag()` | GA4 analytics | ADAPTABLE |

**Fichiers les plus impactés :**
1. `Header.tsx` - Scroll listeners + navigation
2. `AuthContext.tsx` - Storage + location
3. `CallCheckout.tsx` - 30+ occurrences window.location.origin
4. `App.tsx` - Confirm + reload + scroll
5. `networkResilience.ts` - Remplacement global fetch

### 5.3 Détail `localStorage` (120+ occurrences)

**Clés principales :**
- `app:lang` / `sos_language` - Langue utilisateur
- `preferredCurrency` - Devise préférée (EUR/USD)
- `cookie_consent` / `cookie_preferences` - GDPR
- `admin_lang` - Langue admin
- `incomingCallVolume` - Préférences audio
- `admin.*.colOrder` - Layout colonnes tables

### 5.4 Détail `sessionStorage` (120+ occurrences)

**Clés principales :**
- `selectedProvider` - Provider sélectionné (10+ fichiers)
- `selectedCurrency` - Devise de paiement
- `activePromoCode` - Code promo actif
- `bookingRequest` - Données de réservation
- `googleAuthRedirect` - Redirection post-auth
- `wizardFilters` - Filtres SOS Call

### 5.5 Détail `navigator` (80+ occurrences)

| API | Fichiers | Usage |
|-----|----------|-------|
| `navigator.serviceWorker` | 7 fichiers | CRITIQUE - PWA |
| `navigator.language` | 15+ fichiers | Détection langue |
| `navigator.userAgent` | 22+ fichiers | Détection device |
| `navigator.share()` | 17+ fichiers | Web Share API |
| `navigator.clipboard` | 10+ fichiers | Copier/coller |
| `navigator.onLine` | 5 fichiers | Status réseau |

### 5.6 Hooks Non-SSR Compatible

| Hook | Raison |
|------|--------|
| `usePWAInstall` | beforeinstallprompt event |
| `useBadging` | navigator.setAppBadge() |
| `useWebShare` | navigator.share() |
| `useFCM` | Service Worker + Notifications |
| `useIncomingCallSound` | Web Audio API |
| `useProviderActivityTracker` | DOM events |
| `useProviderReminderSystem` | localStorage + timers |
| `useLocalizedRedirect` | useNavigate() (React Router) |

### 5.7 Hooks SSR-Compatible

| Hook | Notes |
|------|-------|
| `useDeviceDetection` | ✅ Mobile-first init avec guards |
| `usePriceTracing` | ✅ Pure function |
| `useSnippetGenerator` | ✅ Pure computation |
| `useAggregateRating` | ✅ Cache SSR-safe |
| `usePaymentGateway` | ✅ Cache Map avec fallback |

---

## 6. Classification des Pages

### 6.1 Pages Publiques (Priorité SEO) - ~45 pages

**Pages Statiques :**
- `Home.tsx` - Page d'accueil
- `Pricing.tsx` - Tarifs
- `Contact.tsx` - Contact
- `HowItWorks.tsx` - Comment ça marche
- `FAQ.tsx` / `FAQDetail.tsx` - FAQ
- `HelpCenter.tsx` / `HelpArticle.tsx` - Centre d'aide
- `Testimonials.tsx` / `TestimonialDetail.tsx` - Témoignages
- `PrivacyPolicy.tsx` - Politique de confidentialité
- `Cookies.tsx` - Politique cookies
- `TermsClients.tsx` / `TermsExpats.tsx` / `TermsLawyers.tsx` - CGU

**Pages Dynamiques (profils) :**
- `Providers.tsx` - Liste des prestataires
- `ProviderProfile.tsx` - Profil individuel
- `SOSCall.tsx` - Wizard SOS Call

**Pages d'authentification :**
- `Login.tsx` - Connexion
- `Register.tsx` / `RegisterExpat.tsx` / `RegisterLawyer.tsx` / `RegisterClient.tsx` - Inscription
- `PasswordReset.tsx` - Réinitialisation mot de passe

### 6.2 Pages Protégées (Client-Side Only) - ~20 pages

- `Dashboard.tsx` - Tableau de bord
- `DashboardMessages.tsx` - Messagerie
- `DashboardReviews.tsx` - Avis
- `Dashboard/AiAssistant/` - Assistant IA
- `Dashboard/Subscription/` - Gestion abonnement
- `BookingRequest.tsx` - Demande de réservation
- `CallCheckout.tsx` - Paiement appel
- `PaymentSuccess.tsx` - Confirmation paiement

### 6.3 Pages Admin (Client-Side Only) - ~55 pages

Toutes les pages dans `src/pages/admin/` :
- `AdminDashboard.tsx`
- `AdminPayments.tsx`
- `AdminCalls.tsx`
- `AdminClients.tsx`
- `AdminLawyers.tsx`
- `AdminExpats.tsx`
- `AdminReviews.tsx`
- `AdminFAQs.tsx`
- `AdminHelpCenter.tsx`
- ... (50+ pages)

---

## 7. Intégration Firebase

### 7.1 Configuration Client

**Fichier :** `src/config/firebase.ts`

**Services utilisés :**
- `getAuth()` - Authentication
- `getFirestore()` - Base de données
- `getStorage()` - Fichiers
- `getFunctions()` - Cloud Functions
- `getMessaging()` - Push notifications

### 7.2 Collections Firestore Principales

| Collection | Usage | Accès public |
|------------|-------|--------------|
| `users` | Profils utilisateurs | Non |
| `sos_profiles` | Profils prestataires | Partiel (profil public) |
| `call_sessions` | Sessions d'appel | Non |
| `reviews` | Avis clients | Oui (lecture) |
| `faqs` | Questions FAQ | Oui |
| `help_articles` | Articles aide | Oui |
| `testimonials` | Témoignages | Oui |
| `legal_documents` | Docs légaux | Oui |
| `country_settings` | Config pays | Oui |
| `faq_translations_cache` | Cache traductions | Oui |

### 7.3 Cloud Functions (50+)

**Catégories :**
- **Auth** : `createUserProfile`, `validateEmail`
- **Payments** : `createPaymentIntent`, `stripeWebhook`, `paypalWebhook`
- **Calls** : `createAndScheduleCall`, `initiateCall`
- **Notifications** : `sendPushNotification`, `sendEmailNotification`
- **SEO** : `sitemapProfiles`, `sitemapBlog`, `sitemapLanding`
- **Admin** : `adminGetUsers`, `adminUpdateSettings`

---

## 8. Intégrations Tierces

### 8.1 Stripe

**Packages :**
- `@stripe/stripe-js` (^7.9.0)
- `@stripe/react-stripe-js` (^3.10.0)
- `@stripe/react-connect-js` (^3.3.30)

**Fonctionnalités :**
- Stripe Elements pour formulaire de paiement
- Stripe Connect pour les prestataires
- Webhooks pour événements de paiement
- Gestion des abonnements

### 8.2 PayPal

**Package :** `@paypal/react-paypal-js` (^8.9.2)

**Architecture :**
- Flux Direct (avec Merchant ID) - Split automatique
- Flux Simple (email PayPal) - Payout manuel
- 83 pays PayPal-only
- Webhooks pour disputes et captures

### 8.3 Analytics

**Google Analytics 4 :**
- `window.gtag()` pour tracking
- Consent Mode v2 pour GDPR
- Events personnalisés

**Google Tag Manager :**
- `dataLayer.push()` pour événements

### 8.4 PWA

**Manifest :** `public/manifest.webmanifest`

**Service Worker :**
- Cache stratégies (Workbox)
- Offline support
- Push notifications (FCM)

---

## 9. Plan de Migration Détaillé

### Phase 1 : Setup (Fondation)

**Tâches :**
1. Créer projet Next.js 14+ avec App Router
2. Configurer TypeScript identique
3. Migrer configuration Tailwind
4. Setup Firebase Admin SDK pour SSR
5. Configurer variables d'environnement
6. Setup middleware de détection locale

**Structure cible :**
```
app/
├── [locale]/
│   ├── layout.tsx
│   ├── page.tsx (Home)
│   ├── (public)/              # Routes publiques SSR/SSG
│   │   ├── tarifs/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── faq/page.tsx
│   │   └── ...
│   ├── (protected)/           # Routes client-side
│   │   ├── dashboard/
│   │   └── ...
│   └── (admin)/               # Routes admin client-side
│       └── admin/
├── api/                       # API Routes
└── sitemap.ts                 # Sitemap dynamique
```

### Phase 2 : Pages Statiques SSG

**Pages à migrer :**
- [ ] Home (/) - SSG
- [ ] Pricing (/tarifs) - SSG + ISR 1h
- [ ] Contact (/contact) - SSG
- [ ] How It Works (/comment-ca-marche) - SSG
- [ ] FAQ (/faq) - SSG + ISR 1h
- [ ] Help Center (/centre-aide) - SSG + ISR 1h
- [ ] Testimonials (/temoignages) - SSG + ISR 1h
- [ ] Pages légales - SSG

**Stratégie de rendu :**
```typescript
// Static pages
export const dynamic = 'force-static';

// Pages avec ISR
export const revalidate = 3600; // 1 heure
```

### Phase 3 : Pages Dynamiques SSR/ISR

**Pages à migrer :**
- [ ] Providers List (/prestataires) - ISR 5min
- [ ] Provider Profile (/prestataire/[slug]) - ISR 1min
- [ ] FAQ Detail (/faq/[slug]) - ISR 1h
- [ ] Help Article (/article/[slug]) - ISR 1h
- [ ] Testimonial Detail (/temoignage/[slug]) - ISR 1h

**Stratégie de rendu :**
```typescript
// Liste prestataires
export const revalidate = 300; // 5 minutes

// Profil individuel
export const revalidate = 60; // 1 minute
```

### Phase 4 : Pages Protégées (Client-Side)

**Approche :**
```typescript
'use client';
// Tout le code reste identique
// Juste wrapper avec 'use client'
```

**Pages concernées :**
- [ ] Dashboard et sous-pages
- [ ] Booking Request
- [ ] Call Checkout
- [ ] Payment Success

### Phase 5 : Admin (Client-Side)

**Approche identique à Phase 4**

Toutes les pages admin restent en client-side avec MUI.

### Phase 6 : SEO Final

**Tâches :**
- [ ] Migrer SEOHead vers Metadata API
- [ ] Adapter les schemas JSON-LD
- [ ] Configurer generateStaticParams pour slugs
- [ ] Créer sitemap.ts dynamique
- [ ] Créer robots.ts
- [ ] Tester hreflang dans toutes les langues
- [ ] Valider avec Google Rich Results Test

---

## 10. Éléments Réutilisables

### 10.1 Composants à Copier Tel Quel

- Tous les composants UI (Button, Card, Modal, etc.)
- Composants de formulaire
- Composants payment (avec 'use client')
- Composants admin (avec 'use client')

### 10.2 Composants à Adapter

| Composant | Adaptation nécessaire |
|-----------|----------------------|
| `SEOHead.tsx` | → Metadata API Next.js |
| `HreflangLinks.tsx` | → generateMetadata() |
| `Layout.tsx` | → layout.tsx Next.js |
| `Header.tsx` | → Guards SSR pour scroll |
| `Footer.tsx` | → Guards SSR pour scroll |

### 10.3 Hooks à Wrapper

```typescript
// Créer un wrapper SSR-safe
export function useSafeLocalStorage(key: string, defaultValue: string) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setValue(localStorage.getItem(key) ?? defaultValue);
    }
  }, [key, defaultValue]);

  return [value, setValue];
}
```

---

## 11. Risques et Mitigations

### 11.1 Risques Techniques

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Hydratation mismatch | Haute | Moyen | Tests systématiques |
| Perte de données localStorage | Moyenne | Faible | Fallbacks côté serveur |
| Performance dégradée | Basse | Moyen | Profiling continu |
| Firebase Auth SSR | Haute | Haute | Firebase Admin SDK |
| Stripe/PayPal SSR | Basse | Moyen | Client-side only |

### 11.2 Risques Business

| Risque | Mitigation |
|--------|------------|
| Downtime lors du déploiement | Blue-green deployment |
| Perte de référencement temporaire | Redirections 301 |
| Régression fonctionnelle | Tests E2E complets |

---

## 12. Checklist de Migration

### Setup Initial
- [ ] Créer projet Next.js 14+
- [ ] Configurer TypeScript
- [ ] Migrer Tailwind config
- [ ] Configurer Emotion pour MUI
- [ ] Setup Firebase Admin SDK
- [ ] Configurer variables d'environnement
- [ ] Setup middleware i18n

### Migration Pages Publiques
- [ ] Home (/)
- [ ] Pricing (/tarifs)
- [ ] Contact (/contact)
- [ ] How It Works
- [ ] FAQ + FAQ Detail
- [ ] Help Center + Articles
- [ ] Testimonials + Detail
- [ ] Privacy Policy
- [ ] Cookies
- [ ] Terms (3 versions)
- [ ] Login
- [ ] Register (4 versions)
- [ ] Password Reset
- [ ] Providers List
- [ ] Provider Profile
- [ ] SOS Call

### Migration Pages Protégées
- [ ] Dashboard + sous-pages
- [ ] Booking Request
- [ ] Call Checkout
- [ ] Payment Success

### Migration Admin
- [ ] Toutes les 55+ pages admin

### SEO
- [ ] Metadata API setup
- [ ] Schemas JSON-LD migrés
- [ ] Hreflang configuré
- [ ] sitemap.ts créé
- [ ] robots.ts créé
- [ ] Open Graph images
- [ ] Twitter Cards

### Tests
- [ ] Tests E2E pages publiques
- [ ] Tests E2E checkout
- [ ] Tests E2E admin
- [ ] Validation Lighthouse
- [ ] Validation Rich Results
- [ ] Validation hreflang
- [ ] Tests multi-langue

### Déploiement
- [ ] Configuration Digital Ocean
- [ ] Redirections 301
- [ ] DNS switch
- [ ] Monitoring post-deploy

---

## 13. Décisions à Prendre

### 13.1 Questions pour Validation

1. **Hébergement** : Confirmer Digital Ocean App Platform vs Vercel ?
2. **Firebase Admin** : Compte de service existant ?
3. **Redirections** : Mapping des anciennes URLs ?
4. **Feature flags** : Déploiement progressif souhaité ?
5. **PWA** : Conserver ou simplifier après migration ?

### 13.2 Priorités Suggérées

1. **P0** : Pages statiques SEO-critiques (Home, Pricing, FAQ)
2. **P1** : Profils prestataires (SEO important)
3. **P2** : Dashboard utilisateur
4. **P3** : Admin (peut rester SPA temporairement)

---

## 14. Conclusion

La migration vers Next.js est **faisable** mais nécessite une attention particulière sur :

1. **600+ APIs browser** à protéger avec guards SSR
2. **Système multilingue sophistiqué** à préserver
3. **SEO existant très complet** à migrer soigneusement
4. **Firebase Auth** nécessite adaptation pour SSR

**Recommandation :** Migration progressive en 6 phases sur 2-3 semaines, avec validation SEO à chaque étape.

---

## 15. Validation et Décisions Finales

**Statut :** Validation du rapport OK. Excellent travail d'analyse.

### 15.1 Réponses aux questions :

1. **Hébergement** : Digital Ocean App Platform (confirmé)
2. **Firebase Admin** : Je vais créer le compte de service Firebase
3. **Redirections 301** : Aucune redirection nécessaire - on garde EXACTEMENT le même pattern d'URLs avec locale-pays : `/fr-fr/`, `/en-us/`, `/es-es/`, `/de-de/`, `/pt-pt/`, `/ru-ru/`, `/zh-cn/`, `/ar-sa/`, `/hi-in/`
4. **Feature flags** : Non, switch complet
5. **PWA** : Conserver avec next-pwa

### 15.2 Pattern d'URLs à respecter IMPÉRATIVEMENT :

Le pattern actuel `[langue]-[pays]` doit être conservé tel quel :
- `/fr-fr/avocat/jean-dupont`
- `/en-us/lawyers/jean-dupont`
- `/es-es/abogados/jean-dupont`
- etc.

Le middleware doit gérer ce format `xx-xx` et non pas `xx` simple.

### 15.3 Priorités confirmées :

- **P0** : Pages statiques SEO (Home, Pricing, FAQ, Contact, How It Works, pages légales)
- **P1** : Profils prestataires + liste prestataires
- **P2** : Dashboard utilisateur
- **P3** : Admin

### 15.4 Instructions supplémentaires :

- Réutiliser au maximum les composants SEO existants (schemas, hreflang)
- Ne pas recréer ce qui existe déjà, juste adapter
- Conserver les 38 slugs traduits existants
- Préserver le support RTL pour l'arabe (ar-sa)
- Garder les 142+ combinaisons locale/pays

### 15.5 Prochaine étape :

Phase 1 (Setup) - Génération du projet Next.js et validation de la structure avant de continuer.

---

*Rapport généré automatiquement par analyse de 50 agents IA parallèles*
*© 2026 SOS-Expat.com - Analyse Migration Next.js*
