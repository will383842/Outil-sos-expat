# AUDIT MOBILE-FIRST — Dashboard Outil IA Prestataires

## Contexte

Le Dashboard Outil IA est réparti sur **2 projets** :

1. **Page d'entrée** (SOS Expat main app) : `sos/src/pages/Dashboard/AiAssistant/` — Gateway vers l'Outil IA avec quota, subscription, SSO
2. **Outil IA complet** (projet séparé) : `Outil-sos-expat/` — Dashboard prestataire avec chat IA, bookings, conversations, admin

**Stack commune** : React 18, TypeScript, Tailwind CSS, Firebase, Vite
**Outil IA spécifique** : shadcn/ui (Radix), TanStack Query, i18next, Sentry, PWA (Workbox)

**URL production** : `https://ia.sos-expat.com`
**Accès** : SSO depuis SOS Expat → `generateOutilToken()` → redirect avec token

---

## ARCHITECTURE DES 50 AGENTS IA

### Niveau 0 — ORCHESTRATEUR (1 agent)
**Agent #0 : Chef d'orchestre Mobile-First**
- Supervise les 8 directeurs
- Consolide avec notation mobile-first par composant (A/B/C/D/F)
- Produit le verdict final : "Le dashboard est-il parfaitement mobile-first ? OUI/NON + plan correctif"

### Niveau 1 — DIRECTEURS (8 agents)
| Agent | Périmètre | Agents sous supervision |
|-------|-----------|------------------------|
| #1 | Page Gateway AiAssistant (SOS main) | #9, #10, #11 |
| #2 | Layout & Navigation Outil IA | #12, #13, #14, #15 |
| #3 | Pages Dashboard Provider | #16, #17, #18, #19 |
| #4 | Chat IA & Conversations | #20, #21, #22, #23 |
| #5 | Admin Dashboard (mobile) | #24, #25, #26 |
| #6 | Performance & PWA | #27, #28, #29, #30, #31 |
| #7 | Touch UX, Gestures & Interactions | #32, #33, #34, #35, #36 |
| #8 | Accessibilité, RTL, Dark Mode & Non-Régression | #37, #38, #39, #40 |

### Niveau 2 — SPÉCIALISTES (32 agents, #9 à #40)
Détaillés ci-dessous.

---

## RÈGLE ABSOLUE — DÉFINITION "MOBILE-FIRST PARFAIT"

Un dashboard mobile-first parfait en 2026 signifie :

1. **Conçu pour mobile D'ABORD** — Le CSS de base est mobile, les breakpoints AJOUTENT pour desktop (pas l'inverse)
2. **Touch targets ≥ 48px** partout (Material Design 3 / WCAG AAA)
3. **Temps de chargement < 2s** sur 4G mobile
4. **Zéro scroll horizontal** sur 320px (iPhone SE)
5. **Navigation thumb-friendly** — Les actions principales sont en bas de l'écran (zone de pouce)
6. **Pas de hover-only interactions** — Tout ce qui est accessible au hover DOIT être accessible au tap
7. **Feedback tactile** sur CHAQUE interaction (animation, changement de couleur, scale)
8. **Offline-capable** — Le dashboard affiche les données en cache même sans réseau
9. **PWA installable** — L'expérience installée est identique au natif
10. **Dark mode natif** — Suit les préférences système automatiquement

---

## ZONES INTERDITES (NE PAS MODIFIER)

- `Outil-sos-expat/functions/src/ai/` — Moteur IA backend (prompts, providers, handlers)
- `Outil-sos-expat/functions/src/security.ts` — Sécurité backend
- `sos/firebase/functions/` — Backend SOS Expat (sauf sync Outil)
- Les collections Firestore existantes (schéma)
- Les endpoints d'API existants

---

## ÉQUIPE 1 — PAGE GATEWAY AIASSISTANT (SOS Main App)

### Fichiers
- `sos/src/pages/Dashboard/AiAssistant/AiAssistantPageV2.tsx` (1031 lignes)
- `sos/src/pages/Dashboard/AiAssistant/components/MobileLayout.tsx` (620 lignes)
- `sos/src/pages/Dashboard/AiAssistant/components/Header.tsx`
- `sos/src/pages/Dashboard/AiAssistant/components/Card.tsx`
- `sos/src/pages/Dashboard/AiAssistant/components/ProviderSelector.tsx` (348 lignes)
- `sos/src/pages/Dashboard/AiAssistant/components/QuotaVisualization.tsx`
- `sos/src/pages/Dashboard/AiAssistant/hooks/useMediaQuery.ts` (414 lignes)
- `sos/src/pages/Dashboard/AiAssistant/styles/mobile.css` (845 lignes)
- `sos/src/pages/Dashboard/AiAssistant/styles/tokens.css` (313 lignes)

### Agent #9 : Layout mobile de la page Gateway
**Mission** : Vérifier que la page AiAssistantPageV2 est parfaitement mobile-first.
- La grille `grid-cols-1 lg:grid-cols-3` — est-ce bien mobile-first (1 col par défaut, 3 cols en desktop) ?
- Le Hero CTA (gradient indigo→purple) : bouton "Accès à l'Outil IA" — taille suffisante sur mobile ? (≥ 48px hauteur)
- Les 3 stats cards (Calls, Quota, Trial) : empilées verticalement sur mobile ? Lisibles sur 320px ?
- Le ProviderSelector (348 lignes) : dropdown natif ou custom ? Fonctionne-t-il bien au touch ?
- Le QuotaVisualization : progress bar visible et compréhensible sur petit écran ?
- Les badges de statut (Trial, Active, No Access) : lisibles sur mobile ?
- **Test critique** : Le bouton "Accès à l'Outil IA" est-il dans la zone de pouce (bas de l'écran) sur mobile ?
- **Livrable** : Capture mobile annotée + liste des ajustements

### Agent #10 : MobileLayout.tsx — Audit des composants mobile
**Mission** : Auditer les 5 sous-composants du MobileLayout (620 lignes).
- **BottomSheet** : Le drag-to-dismiss fonctionne-t-il sur iOS Safari et Android Chrome ?
- **PullToRefresh** : Le geste pull-to-refresh ne conflit-il pas avec le scroll natif du navigateur ?
- **FloatingActionButton** : Position fixe, taille 56×56px — ne cache-t-il pas du contenu important ?
- **MobileHeader** : Le sticky header qui se cache au scroll-down — le seuil de déclenchement est-il bon ?
- **CollapsibleSection** : Auto-expand sur desktop, collapse sur mobile — transition fluide ?
- Le `MobileLayoutContext` fournit `isMobile/isTablet/isDesktop` — correspond-il aux breakpoints Tailwind ?
- **Livrable** : Rapport composant par composant avec note A/B/C/D/F

### Agent #11 : SSO flow mobile — De SOS Expat vers Outil IA
**Mission** : Tester le flux SSO complet sur mobile.
- Le clic sur "Accès à l'Outil IA" → `generateOutilToken()` → ouverture nouvelle fenêtre
- **Problème potentiel** : `window.open()` est bloqué par les popup blockers sur mobile
- Le fallback `link.click()` fonctionne-t-il sur iOS Safari / Android Chrome ?
- Le redirect vers `ia.sos-expat.com/auth?token=...` charge-t-il rapidement sur mobile ?
- Si le provider a plusieurs comptes liés (`asProviderId`) : le sélecteur fonctionne-t-il au touch ?
- **Livrable** : Test SSO mobile sur 3 navigateurs (Safari, Chrome, Samsung Browser) avec temps mesurés

---

## ÉQUIPE 2 — LAYOUT & NAVIGATION OUTIL IA

### Fichiers
- `Outil-sos-expat/src/App.tsx` — Routing principal
- `Outil-sos-expat/src/dashboard/AppDashboard.tsx` — Layout dashboard provider
- `Outil-sos-expat/src/components/Layout/MobileLayout.tsx`
- `Outil-sos-expat/src/components/navigation/BottomNavigation.tsx`
- `Outil-sos-expat/src/components/navigation/MobileDrawer.tsx`
- `Outil-sos-expat/src/dashboard/components/ProviderSidebar.tsx`
- `Outil-sos-expat/src/components/ProviderSwitcher.tsx`
- `Outil-sos-expat/src/hooks/useMediaQuery.ts`

### Agent #12 : Navigation mobile — BottomNavigation vs Sidebar
**Mission** : Auditer la navigation mobile du dashboard provider.
- Le `ProviderSidebar` est caché sur mobile → remplacé par quoi ? `BottomNavigation` ? `MobileDrawer` ?
- La `BottomNavigation` : quels items ? Taille des icônes ? Touch targets ≥ 48px ?
- Le `MobileDrawer` (hamburger) : animation slide-in ? Overlay semi-transparent ? Fermeture au swipe/tap-outside ?
- Navigation thumb-friendly : les actions les plus fréquentes (Chat IA, Bookings, Home) sont-elles en bas ?
- Le `ProviderSwitcher` : fonctionne-t-il correctement sur mobile pour changer de compte ?
- Y a-t-il un indicateur de notifications (badge) sur les items de navigation mobile ?
- **Livrable** : Schéma de navigation mobile + recommandations Material Design 3

### Agent #13 : Mobile header — Sticky, hide-on-scroll, safe areas
**Mission** : Auditer le header mobile de l'Outil IA.
- Le header est-il sticky ? Se cache-t-il au scroll down (comme la page Gateway) ?
- Safe area top (`env(safe-area-inset-top)`) : le header ne se superpose-t-il pas à la barre d'état iOS ?
- Le logo + provider switcher dans le header : lisibles et cliquables sur 320px ?
- La hauteur du header : ne prend-elle pas trop de place sur mobile (max 56px recommandé) ?
- Le header en mode PWA standalone : adapté à l'absence de barre d'adresse ?
- **Livrable** : Mesures du header + captures comparatives (Safari iOS, Chrome Android, PWA)

### Agent #14 : Routing & transitions de pages
**Mission** : Auditer les transitions entre les pages du dashboard.
- Routes : `/dashboard/` (Home), `/dashboard/conversations`, `/dashboard/conversations/:id`
- Les pages sont lazy-loaded (`React.lazy`) — y a-t-il un skeleton/spinner visible pendant le chargement ?
- La transition entre les pages : animation de slide/fade ou cut brutal ?
- Le bouton "Retour" du navigateur : fonctionne-t-il correctement dans le wizard de conversation ?
- Le `ProtectedRoute` : que voit le user si le token SSO expire mid-session ?
- **Livrable** : Carte des transitions + temps de chargement par page sur mobile

### Agent #15 : Tablet layout — iPad & Android tablets
**Mission** : Auditer l'expérience sur tablette.
- Le dashboard utilise-t-il un layout intermédiaire entre mobile et desktop ?
- iPad portrait (810px) : sidebar visible ou hamburger ?
- iPad landscape (1080px) : layout 2 colonnes ou pleine largeur ?
- Les cards et grilles : bien dimensionnées sur tablette ?
- Le chat IA : layout split-view (liste + conversation) disponible sur tablette ?
- **Livrable** : Captures iPad portrait + landscape + recommandations

---

## ÉQUIPE 3 — PAGES DASHBOARD PROVIDER

### Fichiers
- `Outil-sos-expat/src/dashboard/pages/ProviderHome.tsx`
- `Outil-sos-expat/src/dashboard/pages/ConversationHistory.tsx`
- `Outil-sos-expat/src/dashboard/pages/ConversationDetail.tsx`
- `Outil-sos-expat/src/components/dashboard/StatsGrid.tsx`
- `Outil-sos-expat/src/components/dashboard/RecentBookings.tsx`
- `Outil-sos-expat/src/components/dashboard/QuickActions.tsx`
- `Outil-sos-expat/src/components/dashboard/ActivityChart.tsx`
- `Outil-sos-expat/src/components/bookings/BookingCard.tsx`
- `Outil-sos-expat/src/components/bookings/BookingFilters.tsx`
- `Outil-sos-expat/src/components/bookings/ClientInfoPanel.tsx`
- `Outil-sos-expat/src/components/skeletons/`

### Agent #16 : ProviderHome — Dashboard principal mobile
**Mission** : Auditer la page d'accueil du dashboard provider sur mobile.
- `StatsGrid` : les KPI cards s'empilent-elles sur 1 colonne sur mobile ? Lisibles sur 320px ?
- `RecentBookings` : les cards booking sont-elles touch-friendly ? Swipeable ?
- `QuickActions` : les boutons d'actions rapides sont-ils dans la zone de pouce ?
- `ActivityChart` (Recharts) : le graphique est-il lisible sur 320px ? Les labels se chevauchent-ils ?
- `SecondaryStatsGrid` : pas trop chargé sur mobile ?
- Le scroll vertical est-il fluide ou y a-t-il des saccades (jank) ?
- Les skeleton loaders (`DashboardSkeleton.tsx`) s'affichent-ils correctement pendant le chargement ?
- **Livrable** : Rapport UX mobile page Home + métriques de scroll performance

### Agent #17 : ConversationHistory — Liste des conversations mobile
**Mission** : Auditer la liste des conversations sur mobile.
- Les `conversation-card` (composant ui) : hauteur, padding, informations affichées — tout visible sur mobile ?
- Les filtres de conversation (`BookingFilters.tsx`) : dropdown ou chips ? Utilisables au touch ?
- La pagination (`usePagination.ts`) : infinite scroll ou boutons page suivante ?
- Le search (`useSearch.ts`) : barre de recherche sticky en haut ? Clavier ne cache pas les résultats ?
- `empty-state.tsx` : le message "aucune conversation" est-il engageant et bien centré sur mobile ?
- **Livrable** : Capture mobile + rapport UX liste conversations

### Agent #18 : ConversationDetail — Vue détail conversation mobile
**Mission** : Auditer la vue détaillée d'une conversation sur mobile.
- Le header de conversation : nom du client, statut, bouton retour — tout sur une ligne sur 320px ?
- Le `ClientInfoPanel.tsx` : les infos client (pays, langue, description) — collapsible sur mobile ?
- Les `StatusActions.tsx` : les boutons d'action (répondre, fermer, transférer) — zone de pouce ?
- L'historique des messages : scroll fluide ? Les messages longs wrappent-ils correctement ?
- Le lien vers le chat IA : visible et accessible sur mobile ?
- **Livrable** : Rapport UX détail conversation mobile

### Agent #19 : BookingCard — Card booking mobile
**Mission** : Auditer le composant BookingCard sur tous les devices.
- Taille de la card sur mobile : padding, font-size, informations prioritaires
- Les badges de statut (pending, active, completed) : couleurs contrastées sur mobile ?
- Le bouton d'action principal sur la card : touch target ≥ 48px ?
- L'overflow de texte (titre long, description) : ellipsis ou wrap ?
- `BookingCardSkeleton.tsx` : le skeleton a-t-il la même taille que la vraie card (pas de CLS) ?
- **Livrable** : Comparaison card mobile/desktop + recommandations

---

## ÉQUIPE 4 — CHAT IA & CONVERSATIONS

### Fichiers
- `Outil-sos-expat/src/components/Chat/AIChat.tsx` — Chat principal
- `Outil-sos-expat/src/components/Chat/ChatInput.tsx`
- `Outil-sos-expat/src/components/Chat/ChatMessage.tsx`
- `Outil-sos-expat/src/components/Chat/GPTChatBox.tsx`
- `Outil-sos-expat/src/hooks/useStreamingChat.ts`

### Agent #20 : Chat IA mobile — Layout & scroll
**Mission** : Auditer l'interface de chat IA sur mobile (page la PLUS utilisée par les providers).
- **Layout** : Le chat occupe-t-il 100vh sur mobile ? Pas de scroll body parasite ?
- **Messages** : Les bulles de chat sont-elles bien dimensionnées sur 320px ?
- **Auto-scroll** : Le chat scrolle-t-il automatiquement vers le dernier message ?
- **Streaming** : Pendant que l'IA génère (`useStreamingChat.ts`), le texte apparaît-il en temps réel sans saccade ?
- **Code blocks** : Si l'IA renvoie du code ou des listes, le formatage est-il lisible sur mobile ?
- **Long messages** : Les réponses longues de l'IA (paragraphes juridiques) : lisibles ? Pas de scroll horizontal ?
- **Livrable** : Rapport UX chat mobile + vidéo/captures du streaming

### Agent #21 : ChatInput — Saisie mobile
**Mission** : Auditer la zone de saisie du chat sur mobile.
- **Position** : Le `ChatInput` est-il fixé en bas (sticky bottom) ? Ne disparaît-il pas sous le clavier ?
- **Clavier iOS** : Le `visualViewport` resize est-il géré ? Le chat ne se compresse-t-il pas ?
- **Clavier Android** : Le `window.resize` ajuste-t-il la hauteur du chat ?
- **Textarea auto-grow** : Le champ de texte grandit-il avec le contenu (max 4 lignes) ?
- **Bouton envoi** : Touch target ≥ 48px ? Feedback visuel au tap (scale/couleur) ?
- **Placeholder** : Texte indicatif clair et pas trop long pour mobile ?
- **Dictée vocale** : Le bouton micro du clavier iOS/Android fonctionne-t-il ?
- **Livrable** : Test sur iOS Safari + Android Chrome avec captures clavier visible

### Agent #22 : ChatMessage — Bulles de message mobile
**Mission** : Auditer le rendu des messages dans le chat.
- **Bulles IA** : Couleur/style différent des bulles utilisateur ? Clairement distinguables ?
- **Markdown** : Les réponses IA en markdown (gras, listes, liens) sont-elles rendues correctement ?
- **Liens** : Les liens dans les messages sont-ils cliquables et ouvrent-ils dans un nouvel onglet ?
- **Copier** : Le long-press pour copier un message fonctionne-t-il sur mobile ?
- **Timestamps** : Les heures sont-elles affichées ? Lisibles ? Pas trop de place ?
- **Livrable** : Rapport rendu messages mobile

### Agent #23 : Chat — Performance streaming & offline
**Mission** : Auditer la performance du chat sur mobile.
- **Streaming latency** : Temps entre l'envoi du message et le premier token de la réponse IA
- **Rendu streaming** : Le re-render à chaque token cause-t-il du jank ? (React Profiler)
- **Offline** : Que voit le provider si le réseau coupe pendant le streaming ?
- **Retry** : Si la requête échoue, y a-t-il un bouton "Réessayer" ?
- **Rate limiting** : Le `rateLimiter.ts` backend — l'erreur est-elle affichée clairement sur mobile ?
- **Livrable** : Métriques streaming + rapport offline

---

## ÉQUIPE 5 — ADMIN DASHBOARD (Mobile)

### Fichiers
- `Outil-sos-expat/src/admin/AppAdmin.tsx`
- `Outil-sos-expat/src/admin/components/AdminSidebar.tsx`
- `Outil-sos-expat/src/admin/pages/*.tsx` (12 pages)
- `Outil-sos-expat/src/admin/components/Charts.tsx`

### Agent #24 : Admin layout mobile
**Mission** : Le dashboard admin est-il utilisable sur mobile ?
- L'`AdminSidebar` (slate-900) : caché sur mobile → hamburger ? Bottom nav ?
- Les 12 pages admin : accessibles depuis la navigation mobile ?
- Le language selector : fonctionne-t-il en mobile ?
- Les tables de données (Providers, Users, Dossiers) : scrollables horizontalement ou responsive ?
- **Livrable** : Verdict "admin mobile-ready" OUI/NON + captures

### Agent #25 : Pages admin data-heavy (tables, listes)
**Mission** : Auditer les pages admin avec beaucoup de données sur mobile.
- `Prestataires.tsx` : la liste des providers — cards ou table ? Filtrable sur mobile ?
- `Dossiers.tsx` : la liste des dossiers — lisible sur 320px ?
- `DossierDetail.tsx` : la vue détaillée — pas trop chargée sur mobile ?
- `Utilisateurs.tsx` : la gestion des users — fonctionnelle sur mobile ?
- `AuditLogs.tsx` : les logs — scrollable ou paginé sur mobile ?
- `Analytics.tsx` + `Charts.tsx` : les graphiques Recharts — lisibles sur petit écran ?
- **Livrable** : Rapport par page admin + recommandation (responsive table vs cards)

### Agent #26 : Admin forms & modals mobile
**Mission** : Auditer les formulaires et modals admin sur mobile.
- `AddProviderModal.tsx` : le modal d'ajout de provider — plein écran sur mobile ?
- `AIConfig.tsx` : les paramètres IA — formulaire lisible sur mobile ?
- `TelegramConfig.tsx` + `TelegramTemplateEditor.tsx` : éditeur de templates — utilisable au touch ?
- `Parametres.tsx` : les paramètres système — switch/toggles ≥ 48px ?
- `ExportButton.tsx` : le bouton d'export — fonctionne-t-il sur mobile (téléchargement fichier) ?
- **Livrable** : Rapport formulaires admin mobile

---

## ÉQUIPE 6 — PERFORMANCE & PWA

### Fichiers
- `Outil-sos-expat/vite.config.ts` — Build + PWA config
- `Outil-sos-expat/src/services/WebVitalsService.ts`
- `Outil-sos-expat/src/services/init/pwa.ts`
- `Outil-sos-expat/src/services/init/monitoring.ts`
- `Outil-sos-expat/public/offline.html`
- `Outil-sos-expat/public/_headers`
- `Outil-sos-expat/index.html`
- `Outil-sos-expat/tailwind.config.js`

### Agent #27 : PWA — Audit complet
**Mission** : L'Outil IA est-il une PWA parfaitement mobile ?
- Le `vite-plugin-pwa` avec `registerType: "autoUpdate"` — les mises à jour sont-elles silencieuses ?
- Les 12 icônes d'app (48x48 → 512x512) : toutes présentes et maskable ?
- Les 8 splash screens iOS : couvrent-ils tous les appareils actuels (iPhone 15, 16) ?
- L'installation PWA : le prompt d'installation s'affiche-t-il sur mobile ?
- En mode standalone : la barre d'adresse est-elle cachée ? Le thème color (#DC2626) s'applique-t-il ?
- Les shortcuts PWA (Dashboard, AI Assistant, Dossiers) : fonctionnent-ils sur iOS et Android ?
- Le Share Target API : le provider peut-il partager un document vers l'Outil IA ?
- **Livrable** : Checklist PWA (Lighthouse PWA audit) + captures installée

### Agent #28 : Service Worker & Offline
**Mission** : L'Outil IA fonctionne-t-il hors connexion ?
- **Caching strategy** :
  - Firebase Storage → CacheFirst (7 jours) — OK ?
  - Images → CacheFirst (30 jours) — OK ?
  - Firestore API → NetworkFirst (3s timeout, 5min cache) — que voit le provider offline ?
  - Google Fonts → CacheFirst (1 an) — OK
- L'`offline.html` : s'affiche-t-il quand le réseau est coupé ? Design mobile-first ?
- Les données en cache : le dashboard affiche-t-il les dernières données connues (TanStack Query) ?
- Le chat IA offline : message d'erreur clair "Pas de connexion" ?
- Le retour en ligne : les données se rafraîchissent-elles automatiquement ?
- **Livrable** : Test offline complet + rapport cache strategy

### Agent #29 : Bundle size & code splitting mobile
**Mission** : Le bundle est-il optimisé pour le chargement mobile ?
- Taille totale du JS initial (avant lazy loading) — cible < 200KB gzip
- Les 12 pages admin sont-elles TOUTES lazy-loaded ? (Pas chargées si le provider n'est pas admin)
- Les dépendances lourdes (Sentry ~50KB, Recharts ~40KB) : lazy-loaded ou dans le bundle initial ?
- Le `vendor-firebase` chunk : taille ? Partagé entre les pages ?
- Les icônes `lucide-react` (454 icônes disponibles) : tree-shaking fonctionne-t-il ?
- Le TanStack Query devtools : exclu du build production ?
- **Livrable** : Bundle analysis avec treemap + recommandations

### Agent #30 : Core Web Vitals mobile
**Mission** : Mesurer les Core Web Vitals sur mobile pour CHAQUE page.
- `WebVitalsService.ts` : que mesure-t-il ? Envoie-t-il à GA4/Sentry ?
- Mesurer LCP, FCP, CLS, INP, TTFB sur :
  - Page SSO Auth (première page après redirect)
  - Provider Home
  - Conversation History
  - Conversation Detail / Chat
  - Admin Dashboard (si accessible)
- **Conditions** : Chrome DevTools, Slow 4G, CPU 4x slowdown
- Le `<link rel="preconnect">` et `<link rel="dns-prefetch">` : configurés pour Firebase, Sentry ?
- Les fonts : preloaded ou lazy-loaded ?
- **Livrable** : Tableau CWV par page + plan d'optimisation

### Agent #31 : Temps de chargement initial (Cold Start)
**Mission** : Mesurer le temps entre le clic SSO et le dashboard utilisable.
- **Flow complet à chronométrer** :
  1. Clic "Accès à l'Outil IA" sur SOS Expat
  2. `generateOutilToken()` — temps de la Cloud Function
  3. Redirect vers `ia.sos-expat.com/auth?token=...`
  4. Vérification du token (`AuthSSO.tsx`)
  5. Chargement du dashboard provider
  6. Affichage des données (bookings, stats, quota)
- Temps total cible : **< 3 secondes** sur 4G
- Le deferred init (`src/services/init/`) : monitoring, PWA, theme — retardent-ils le FCP ?
- **Livrable** : Timeline complète du cold start + bottlenecks

---

## ÉQUIPE 7 — TOUCH UX, GESTURES & INTERACTIONS

### Agent #32 : Touch targets — Audit exhaustif
**Mission** : Vérifier que CHAQUE élément interactif a un touch target ≥ 48px.
- **Fichiers UI à auditer** (27 composants `Outil-sos-expat/src/components/ui/`) :
  - `button.tsx` : hauteur minimum ? Padding ?
  - `switch.tsx` : taille du toggle ? Zone de tap ?
  - `tabs.tsx` : hauteur des onglets ? Espacement entre onglets ?
  - `dropdown-menu.tsx` : hauteur des items du menu ?
  - `dialog.tsx` : bouton fermer (X) — touch target ?
  - `input.tsx` / `textarea.tsx` : hauteur des champs ? (≥ 44px pour éviter zoom iOS)
  - `badge.tsx` : si cliquable, touch target suffisant ?
- Le composant `touch-target.tsx` existe — est-il utilisé PARTOUT ?
- **Livrable** : Audit touch target par composant UI + violations

### Agent #33 : Gestures & swipe
**Mission** : Auditer les gestes tactiles sur mobile.
- Le `BottomSheet` (MobileLayout) : swipe-down pour fermer — fluide sur iOS et Android ?
- Le `PullToRefresh` : geste intuitif ? Pas de conflit avec le overscroll natif ?
- Le `MobileDrawer` : swipe-right pour fermer ? Ou seulement tap overlay ?
- Les cards booking : sont-elles swipeable (swipe-left pour actions rapides) ?
- Les conversations : swipe pour naviguer entre les messages ?
- Les onglets (`tabs.tsx`) : swipeable horizontalement ?
- **Livrable** : Carte des gestures disponibles + manquantes

### Agent #34 : Micro-interactions & feedback visuel
**Mission** : Chaque interaction a-t-elle un feedback immédiat ?
- **Boutons** : `active:scale-98` ou équivalent sur TOUS les boutons ?
- **Cards interactives** (`variant="interactive"`) : `active:scale-[0.98]` — ressenti naturel ?
- **Navigation** : le changement de page a-t-il une animation (fade, slide) ?
- **Loading states** :
  - Les skeletons (`BookingCardSkeleton`, `DashboardSkeleton`, `StatCardSkeleton`) — corrects ?
  - Le `loading-spinner.tsx` : taille et position sur mobile ?
- **Toast notifications** (`react-hot-toast`) : positionnées au-dessus de la bottom nav ?
- **FAB pulse** (`fabPulse` animation) : attire-t-il l'attention sans être agaçant ?
- **Livrable** : Inventaire des micro-interactions + gaps

### Agent #35 : Keyboard mobile & form UX
**Mission** : Auditer l'expérience de saisie sur mobile.
- Les `input.tsx` et `textarea.tsx` : `autocomplete` correct ? `inputMode` correct (email, tel, text) ?
- Le `ChatInput` : `enterkeyhint="send"` pour que le clavier affiche "Envoyer" ?
- Les filtres de recherche : `inputMode="search"` pour afficher la loupe sur le clavier ?
- Le clavier iOS ne masque-t-il jamais un champ important ?
- Le `react-hook-form` + `zod` : les erreurs de validation s'affichent-elles sous le champ (pas au-dessus, masqué par le clavier) ?
- Le `LanguageSelector` : dropdown natif (`<select>`) sur mobile ou custom ? (Natif = meilleur UX mobile)
- **Livrable** : Rapport saisie mobile

### Agent #36 : Scroll performance & janks
**Mission** : Le scroll est-il fluide sur toutes les pages sur mobile.
- Le `will-change: transform` et `overscroll-behavior: contain` dans mobile.css — bien appliqués ?
- Les passive event listeners : configurés pour le scroll ?
- Le `RequestAnimationFrame` debouncing dans MobileLayout : fonctionne-t-il ?
- Le `prefers-reduced-motion` : les animations sont-elles désactivées quand demandé ?
- Les charts Recharts (ActivityChart) : causent-ils du jank au scroll ?
- Le long scrolling sur ConversationHistory : virtualisé (react-virtualized) ou DOM complet ?
- **Livrable** : FPS mesuré au scroll par page + optimisations

---

## ÉQUIPE 8 — ACCESSIBILITÉ, RTL, DARK MODE & NON-RÉGRESSION

### Fichiers
- `Outil-sos-expat/src/pages/Dashboard/AiAssistant/accessibility/index.ts` (597 lignes)
- `Outil-sos-expat/src/components/Layout/ThemeToggle.tsx`
- `Outil-sos-expat/src/services/init/theme.ts`
- `Outil-sos-expat/src/styles/design-tokens.css` (variables dark mode)
- `Outil-sos-expat/src/i18n/locales/ar/` (arabe)

### Agent #37 : Dark mode mobile — Audit complet
**Mission** : Le dark mode fonctionne-t-il parfaitement sur mobile ?
- Le `ThemeToggle.tsx` : bascule-t-il entre light/dark ? Suit-il `prefers-color-scheme` automatiquement ?
- Les CSS variables dans `design-tokens.css` : toutes les couleurs ont-elles un équivalent dark ?
- Les cards (`Card.tsx` 5 variants) : glassmorphism en dark mode — lisible ?
- Le chat IA : les bulles de message — contraste suffisant en dark mode ?
- Les graphiques Recharts : couleurs adaptées au dark mode ?
- Les images/icônes : visibles en dark mode (pas de fond blanc autour) ?
- Les composants shadcn/ui (27 fichiers) : tous compatibles dark mode ?
- La transition light→dark : animation fluide ou flash ?
- **Livrable** : Audit dark mode composant par composant

### Agent #38 : RTL (arabe) — Layout mobile
**Mission** : Le dashboard fonctionne-t-il en arabe (RTL) sur mobile ?
- `dir="rtl"` appliqué sur `<html>` quand la langue est arabe ?
- La navigation mobile : bottom nav + drawer inversés en RTL ?
- Le chat IA : les bulles utilisateur/IA sont-elles inversées (utilisateur à gauche, IA à droite) ?
- Les icônes directionnelles (flèches, chevrons) : inversées ?
- Les `margin-left` / `padding-right` : remplacés par logical properties (`ms-`, `me-`, `ps-`, `pe-`) ?
- Les progress bars et quota bars : direction inversée ?
- Les cards avec `border-left` colored (status variant) : `border-right` en RTL ?
- **Livrable** : Captures RTL mobile + liste des bugs

### Agent #39 : Accessibilité WCAG 2.1 AA mobile
**Mission** : Le dashboard est-il accessible sur mobile ?
- La bibliothèque a11y (597 lignes) existe — est-elle UTILISÉE dans tous les composants ?
- `useFocusTrap()` : utilisé dans les modals et bottom sheets ?
- `useFocusRestore()` : le focus revient-il au bon endroit après fermeture d'un modal ?
- `useAnnouncer()` : les changements de page sont-ils annoncés au screen reader ?
- `SkipLink.tsx` : visible au focus ? Fonctionnel ?
- `LiveRegion.tsx` : utilisé pour les notifications de chat (nouveau message) ?
- `VisuallyHidden.tsx` : les textes SR-only sont-ils sur tous les boutons icône-seule ?
- Le contraste : `meetsContrastRequirement()` vérifie-t-il les couleurs du dark mode aussi ?
- VoiceOver (iOS) + TalkBack (Android) : navigation complète possible ?
- **Livrable** : Rapport WCAG AA + violations + correctifs

### Agent #40 : Non-régression & tests
**Mission** : Valider que tout fonctionne après les modifications.
- Les tests existants passent-ils ?
  - `GPTChatBox.test.tsx`
  - `BlockedScreen.test.tsx`
  - `ProtectedRoute.test.tsx`
  - `useFirestoreQuery.test.tsx`
  - `queryClient.test.ts`
  - `toast.test.ts`
  - `formatDate.test.ts`
- Le `npm run build` compile-t-il sans erreur TypeScript ?
- Le `vitest` (`vitest.config.ts`) : tous les tests passent ?
- **Checklist fonctionnelle** :
  1. SSO login depuis SOS Expat → Outil IA ✅/❌
  2. Page Home affiche stats + bookings récents ✅/❌
  3. Liste conversations visible et filtrable ✅/❌
  4. Détail conversation avec chat IA fonctionnel ✅/❌
  5. Streaming IA en temps réel ✅/❌
  6. Provider switcher fonctionne ✅/❌
  7. Dark mode toggle ✅/❌
  8. PWA installable ✅/❌
  9. Offline fallback affiché ✅/❌
  10. Navigation bottom bar fonctionne ✅/❌
  11. Bottom sheet ouverture/fermeture ✅/❌
  12. Pull-to-refresh ✅/❌
- **Livrable** : Checklist validée + rapport

---

## LIVRABLES ORCHESTRATEUR (Agent #0)

1. **Score mobile-first global** : Note par page (A à F) + note globale
2. **Top 10 corrections critiques** ordonnées par impact UX
3. **Quick wins** : Changements <30 min à haut impact mobile
4. **Problèmes structurels** : Ce qui nécessite un refactoring plus profond
5. **Comparaison avec standards 2026** : Apple HIG, Material Design 3, WCAG 2.2
6. **Verdict final** : "Le dashboard est-il parfaitement mobile-first ?" — OUI / NON / PARTIELLEMENT + plan d'action

---

## MÉTRIQUES CIBLES MOBILE-FIRST 2026

### Core Web Vitals (Mobile 4G)
| Page | LCP | FCP | CLS | INP | TTFB |
|------|-----|-----|-----|-----|------|
| Auth SSO | <1.5s | <0.8s | 0 | <100ms | <0.5s |
| Provider Home | <2s | <1s | <0.05 | <150ms | <0.8s |
| Conversation History | <2s | <1s | <0.05 | <150ms | <0.8s |
| Chat IA | <1.5s | <0.8s | <0.02 | <100ms | <0.5s |
| Admin Dashboard | <2.5s | <1.2s | <0.1 | <200ms | <1s |

### Touch & UX
| Critère | Cible |
|---------|-------|
| Touch targets | ≥ 48px (Material Design 3) |
| Scroll FPS | ≥ 55fps constant |
| Animation FPS | ≥ 58fps |
| Cold start (SSO → dashboard) | < 3s sur 4G |
| Chat first token | < 1s après envoi |
| Offline capability | Données en cache affichées |
| PWA Lighthouse score | ≥ 95/100 |

### Accessibilité
| Critère | Cible |
|---------|-------|
| WCAG Level | 2.1 AA minimum |
| Contraste texte | ≥ 4.5:1 |
| Contraste grands textes | ≥ 3:1 |
| Navigation clavier | 100% |
| Screen reader | 100% navigable |
| RTL (arabe) | Layout complet inversé |

---

## INSTRUCTIONS D'EXÉCUTION

### Phase 1 — Baseline
- Agent #30 mesure les CWV actuels de chaque page (AVANT modifications)
- Agent #31 mesure le cold start SSO actuel

### Phase 2 — Audit parallèle
- Les 8 directeurs lancent leurs agents en parallèle
- Chaque agent produit son livrable avec note A/B/C/D/F

### Phase 3 — Consolidation
- Les directeurs compilent les résultats
- L'orchestrateur produit le score global et le plan d'action

### Phase 4 — Validation post-corrections
- Agent #30 re-mesure les CWV (comparaison baseline)
- Agent #40 exécute la checklist de non-régression
- L'orchestrateur valide que TOUTES les métriques sont améliorées

### Format de sortie
- Markdown structuré
- Chaque page notée A (parfait) → F (cassé) en mobile-first
- Screenshots annotés pour chaque problème identifié

---

## CONTRAINTES

- **Langue** : Toujours communiquer en français
- **2 projets** : SOS Expat main (`sos/`) + Outil IA (`Outil-sos-expat/`)
- **PWA** : L'Outil IA EST une PWA — les optimisations PWA sont critiques
- **shadcn/ui** : Les composants UI sont basés sur Radix — ne pas remplacer par un autre framework
- **i18n** : 9 langues via i18next (pas react-intl comme SOS main)
- **Dark mode** : Support existant — doit être parfait
- **Rollback** : Commits atomiques, chaque modification réversible en <5 min
- **Tests** : `npm run build` + `vitest` doivent passer après chaque modification
