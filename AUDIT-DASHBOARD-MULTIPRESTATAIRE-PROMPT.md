# AUDIT COMPLET — Dashboard Multiprestataire (PWA Agency Manager)

## Contexte

Le **Dashboard Multiprestataire** est une PWA React standalone permettant aux agency managers de superviser leurs prestataires liés (avocats/experts) en temps réel : statuts, booking requests, statistiques de compliance, notifications.

**URL production** : déployé sur Cloudflare Pages (PAS Firebase Hosting)
**Projet Firebase** : `sos-urgently-ac307` (même que SOS Expat principal)
**Firestore** : `nam7` (Iowa, US)

### Stack technique
- React 18.3 + TypeScript 5.6 + Vite 5.4
- Tailwind CSS 3.4 (palette rouge #DC2626)
- Firebase 10.14 (Auth + Firestore, cache offline 50MB IndexedDB)
- TanStack Query v5.59 (configuré mais peu utilisé — listeners onSnapshot préférés)
- React Router v6.28 (nested layouts)
- Recharts 2.13 (graphiques)
- react-i18next 16.5 (9 langues : FR/EN/DE/ES/PT/RU/ZH/AR/JA)
- Lucide React (icônes)
- react-hot-toast (notifications)
- VitePWA 0.20.5 + Workbox 7.1 (Service Worker, offline)

### Taille du projet
~70 fichiers source, ~6 300 lignes de code total

---

## ARCHITECTURE DES 50 AGENTS IA

### Niveau 0 — ORCHESTRATEUR (1 agent)
**Agent #0 : Chef d'orchestre**
- Supervise les 8 directeurs
- Note chaque page/composant (A à F) sur : mobile-first, performance, UX, cohérence, accessibilité
- Verdict final : "Le dashboard est-il parfait ?" OUI/NON + plan correctif priorisé

### Niveau 1 — DIRECTEURS (8 agents)
| Agent | Périmètre | Agents |
|-------|-----------|--------|
| #1 | Layout, Navigation & Responsive | #9, #10, #11, #12 |
| #2 | Pages principales (Dashboard, Requests, Team) | #13, #14, #15, #16 |
| #3 | Statistiques & Graphiques | #17, #18, #19 |
| #4 | Composants UI & Design System | #20, #21, #22, #23 |
| #5 | Performance, PWA & Offline | #24, #25, #26, #27, #28 |
| #6 | Mobile iOS, Android & Tablet | #29, #30, #31, #32, #33 |
| #7 | Données temps réel, Notifications & Fiabilité | #34, #35, #36, #37 |
| #8 | Accessibilité, RTL, Dark Mode, i18n & Non-Régression | #38, #39, #40, #41 |

### Niveau 2 — SPÉCIALISTES (33 agents)

---

## ZONES INTERDITES (NE PAS MODIFIER)

- `sos/firebase/functions/` — Backend SOS Expat (pas dans ce projet)
- Collections Firestore (schéma) — on ne supprime JAMAIS de champs
- Les hooks de données temps réel (`onSnapshot`) — ne pas casser les listeners existants
- Le système d'authentification Firebase Auth — ne pas toucher au flow de login

**Principe** : On peut modifier librement tout le frontend de `Dashboard-multiprestataire/`. Le backend n'est PAS dans ce projet.

---

## ÉQUIPE 1 — LAYOUT, NAVIGATION & RESPONSIVE

### Fichiers
- `src/App.tsx` (98 lignes) — Root router + providers + RTL
- `src/components/layout/AppLayout.tsx` (153 lignes) — Layout maître
- `src/components/layout/Sidebar.tsx` (201 lignes) — Sidebar desktop/mobile
- `src/components/layout/Header.tsx` (126 lignes) — Header avec language selector
- `src/components/layout/BottomNav.tsx` (50 lignes) — Navigation mobile fixe
- `src/index.css` (42 lignes) — Styles globaux + safe areas
- `tailwind.config.js` (26 lignes) — Config couleurs

### Agent #9 : Layout responsive global
**Mission** : Vérifier que le layout est parfaitement mobile-first sur TOUS les breakpoints.
- Le `AppLayout` utilise `lg:` comme breakpoint desktop — cohérent avec le BottomNav `lg:hidden` ?
- Le padding bottom `pb-20 lg:pb-8` compense-t-il parfaitement la hauteur du BottomNav (56px) ?
- Le sidebar mobile : animation slide-in (`-translate-x-full` → `translate-x-0`) — fluide ?
- L'overlay backdrop derrière le sidebar : ferme-t-il le menu au tap ?
- Le sidebar se ferme-t-il automatiquement au changement de route ?
- Le header sticky (`z-30`) : ne masque-t-il pas du contenu au scroll ?
- **Test 320px** : le layout entier fonctionne-t-il sur iPhone SE (320px) sans scroll horizontal ?
- **Test 768px** : le comportement à exactement `lg:` (1024px) — transition propre ?
- **Livrable** : Capture annotée par breakpoint (320, 375, 428, 768, 1024, 1440)

### Agent #10 : BottomNav mobile
**Mission** : Auditer la navigation fixe du bas sur mobile.
- 3 items (Dashboard, Requests, Team) — touch targets ≥ 48px ?
- Le badge compteur sur Requests : visible ? Couleur contrastée (red-500 sur blanc) ?
- La hauteur `h-14` (56px) : conforme Material Design 3 ?
- Safe area bottom (`env(safe-area-inset-bottom)`) : le BottomNav ne se superpose-t-il pas au home indicator iOS ?
- L'item actif (`text-primary-600`) : suffisamment distinct de l'inactif ?
- Le texte sous les icônes : lisible sur petit écran ? `gap-0.5` suffisant ?
- **Manque-t-il des items ?** Stats et Billing ne sont PAS dans le BottomNav — problème de navigation mobile ?
- **Livrable** : Rapport BottomNav + recommandation pour Stats/Billing

### Agent #11 : Header & Language Selector
**Mission** : Auditer le header sur mobile.
- Le titre de page dynamique : taille adaptée sur 320px ? Pas de troncature ?
- Le language selector dropdown : s'ouvre-t-il correctement sur mobile ? `max-h-80 overflow-y-auto` — scrollable ?
- Les 9 langues avec drapeaux emoji : lisibles et cliquables (≥ 44px par item) ?
- Le user info `hidden sm:flex` — sur mobile, aucune indication de qui est connecté ?
- Le bouton logout : visible UNIQUEMENT dans le sidebar sur mobile ? Ou accessible autrement ?
- **Livrable** : Rapport header mobile + recommandations

### Agent #12 : Sidebar desktop & drawer mobile
**Mission** : Auditer la sidebar dans les deux modes.
- **Desktop** (`lg:static`) : largeur fixe ? Ne pousse-t-elle pas le contenu hors écran ?
- **Mobile** (drawer) : le hamburger est-il bien placé et visible ?
- Les NavLink items : `end={item.to === '/'}` pour la route exacte — le Dashboard est-il correctement highlighted ?
- Le badge de pending requests : visible dans le sidebar mobile ET le BottomNav ?
- L'instruction d'installation iOS dans le sidebar : bien formatée ? Pas trop longue ?
- Le logo + branding : cohérent avec le design system SOS Expat ?
- **Livrable** : Comparaison sidebar desktop vs drawer mobile

---

## ÉQUIPE 2 — PAGES PRINCIPALES

### Fichiers
- `src/pages/Dashboard.tsx` (84 lignes) — KPIs + activité
- `src/pages/Requests.tsx` (87 lignes) — Booking requests
- `src/pages/Team.tsx` (111 lignes) — Gestion prestataires
- `src/pages/Login.tsx` (65 lignes) — Connexion
- `src/components/dashboard/StatsCard.tsx` (62 lignes) — Card KPI
- `src/components/dashboard/ActivityFeed.tsx` (112 lignes) — Flux activité
- `src/components/bookings/BookingTabs.tsx` (139 lignes) — Onglets booking
- `src/components/bookings/BookingRequestCard.tsx` (286 lignes) — Card booking
- `src/components/bookings/AiResponsePreview.tsx` (111 lignes) — Réponse IA
- `src/components/team/ProviderList.tsx` (196 lignes) — Liste prestataires
- `src/components/team/ProviderCard.tsx` (117 lignes) — Card prestataire
- `src/components/team/AddProviderModal.tsx` (56 lignes) — Modal ajout

### Agent #13 : Page Dashboard — Mobile UX
**Mission** : Auditer la page d'accueil sur mobile.
- La grille 2 colonnes (`grid-cols-2`) des KPIs : bien dimensionnée sur 320px ? Pas de débordement ?
- `StatsCard` : le scaling icônes (`w-4 sm:w-6`) — lisible sur mobile ?
- Le message d'alerte "nouvelles demandes" (dot pulsant) : visible et engageant ?
- L'`ActivityFeed` (5 derniers providers) : les avatars + indicateur online + temps relatif — lisibles sur mobile ?
- Les quick links : touch targets ≥ 48px ? `active:scale-[0.98]` appliqué ?
- **Le contenu est-il suffisant ?** La page Home semble légère — devrait-on ajouter plus de KPIs ?
- **Livrable** : Rapport UX Dashboard mobile

### Agent #14 : Page Requests — Booking management mobile
**Mission** : Auditer la page des demandes de réservation sur mobile.
- Les 3 compteurs (new, pending, history) en `grid-cols-3` : lisibles sur 320px ? Pas trop serrés ?
- `BookingTabs` : les onglets sont-ils ≥ `min-h-[48px]` ? Le switcher est-il intuitif ?
- `BookingRequestCard` (286 lignes) : **c'est la card la plus complexe** — tout visible sur mobile ?
  - Infos client (nom, email, téléphone, langues)
  - Badge statut (amber/blue/indigo/green/red)
  - Badge "NEW" pulsant (auto-hide après 5 min)
  - Description expandable (>150 chars)
  - AI response preview (collapsible, violet)
  - Boutons action (Respond via SSO, Delete)
- Le bouton "Respond" ouvre l'Outil IA via SSO : `window.open()` — fonctionne sur mobile PWA standalone ?
- Le bouton Delete : confirmation avant suppression ? Pas de suppression accidentelle ?
- **Livrable** : Rapport UX Requests mobile + captures BookingRequestCard

### Agent #15 : Page Team — Gestion prestataires mobile
**Mission** : Auditer la page de gestion d'équipe sur mobile.
- Les 3 stats cards (total, online, active) en `grid-cols-1 sm:grid-cols-3` : empilées sur mobile ?
- `ProviderList` avec table : **la table a un scroll horizontal (`overflow-x-auto`) sur mobile** — est-ce acceptable ou faut-il passer en cards ?
- La barre de recherche + filtre statut : utilisables sur mobile ? Le dropdown ne masque-t-il pas la liste ?
- `ProviderCard` : avatar + online indicator + infos + badges + actions — tout visible sur 320px ?
- Les liens de contact (mailto, tel) : cliquables et fonctionnels sur mobile ?
- `AddProviderModal` : le modal s'affiche-t-il en plein écran sur mobile ou centré flottant ?
- **Livrable** : Rapport UX Team mobile + recommandation table vs cards

### Agent #16 : Page Login — UX connexion mobile
**Mission** : Auditer la page de connexion sur mobile.
- Le `LoginForm` : taille des champs email/password ≥ 44px hauteur (pas de zoom iOS) ?
- Le toggle show/hide password : touch target suffisant ?
- Le message d'erreur : clair et actionnable ?
- Le `safe-top safe-bottom` : les insets sont-ils bien appliqués ?
- Le branding (logo, titre) : bien centré, pas trop grand sur petit écran ?
- Le login fonctionne-t-il en mode PWA standalone (pas de barre d'adresse) ?
- L'`autoComplete` sur email et password : les attributs sont-ils corrects ?
- **Livrable** : Rapport UX Login mobile

---

## ÉQUIPE 3 — STATISTIQUES & GRAPHIQUES

### Fichiers
- `src/pages/Stats.tsx` (277 lignes) — Page stats complète
- `src/components/stats/ComplianceChart.tsx` (84 lignes) — Donut Recharts
- `src/components/stats/CallsChart.tsx` (112 lignes) — Barres empilées
- `src/components/stats/HoursChart.tsx` (100 lignes) — Barres horizontales
- `src/hooks/useProviderStats.ts` (125 lignes) — Fetch stats mensuelles

### Agent #17 : Graphiques Recharts mobile
**Mission** : Les graphiques sont-ils lisibles et utilisables sur mobile ?
- `ComplianceChart` (donut) : taille innerRadius/outerRadius adaptée sur 320px ?
- `CallsChart` (barres empilées) : les labels de providers sont-ils lisibles ? Se chevauchent-ils ?
- `HoursChart` (barres horizontales) : la ligne de référence (target) est-elle visible sur mobile ?
- Les `ResponsiveContainer` Recharts gèrent la taille — mais les tooltips sont-ils utilisables au touch ?
- Les légendes : positionnées où sur mobile ? Ne masquent-elles pas les graphiques ?
- Les couleurs (green #22c55e, red #ef4444) : contrastées suffisamment en light ET dark mode ?
- **Livrable** : Captures graphiques sur 320px + 375px + recommandations

### Agent #18 : Table de stats mobile
**Mission** : La table détaillée des stats est-elle utilisable sur mobile ?
- Colonnes : Provider, Hours, Calls, Missed, Compliance — trop de colonnes pour 320px ?
- Le `overflow-x-auto` : le scroll horizontal est-il évident (indicateur visuel) ?
- Les valeurs numériques : alignées ? Lisibles ?
- Faudrait-il transformer la table en cards sur mobile (comme le fait Team) ?
- Le month selector + CSV export button : positionnés où sur mobile ?
- **Livrable** : Recommandation table responsive vs cards + maquette

### Agent #19 : CSV Export mobile
**Mission** : L'export CSV fonctionne-t-il sur mobile ?
- Le `document.createElement('a').click()` pour télécharger : fonctionne sur iOS Safari ? Android Chrome ?
- Le fichier CSV avec BOM UTF-8 : s'ouvre-t-il correctement dans Excel mobile / Google Sheets ?
- Le bouton d'export : visible et cliquable sur mobile ?
- Le toast de confirmation : visible au-dessus du BottomNav ?
- Les headers CSV sont-ils traduits dans la langue courante ?
- **Livrable** : Test export sur iOS + Android + rapport

---

## ÉQUIPE 4 — COMPOSANTS UI & DESIGN SYSTEM

### Fichiers
- `src/components/ui/Button.tsx` (58 lignes) — Bouton polymorphique
- `src/components/ui/Card.tsx` (58 lignes) — Card wrapper
- `src/components/ui/Modal.tsx` (101 lignes) — Dialog modal
- `src/components/ui/LoadingSpinner.tsx` (21 lignes) — Spinner
- `src/components/ui/StatusBadge.tsx` (95 lignes) — Badges statut
- `src/components/pwa/InstallPrompt.tsx` (183 lignes) — Prompt PWA

### Agent #20 : Audit touch targets — TOUS les composants
**Mission** : Vérifier que chaque élément interactif a un touch target ≥ 48px.
- `Button.tsx` : `min-h-[44px]` sur toutes les tailles (sm, md, lg) — c'est 44px, pas 48px → suffisant ?
- `Modal.tsx` : le bouton close (X) — touch target suffisant dans le coin ?
- `StatusBadge.tsx` : si cliquable, est-ce assez grand ?
- `OnlineIndicator` : le dot `w-3 h-3` (12px) — trop petit pour être interactif ?
- Les liens dans `ProviderCard` (mailto, tel) : espacement suffisant entre eux ?
- Les tabs dans `BookingTabs` : hauteur et espacement entre onglets ?
- Le dropdown language dans Header : items de 44px minimum ?
- **Livrable** : Inventaire touch targets par composant + violations

### Agent #21 : Cohérence design system
**Mission** : Le design est-il cohérent sur toutes les pages ?
- **Palette** : rouge `primary-600` (#DC2626) — utilisé uniformément partout ?
- **Bordures** : `rounded-lg` par défaut, `rounded-xl` pour cards — cohérent ?
- **Ombres** : `shadow-sm` vs `shadow-lg` — hiérarchie visuelle claire ?
- **Typographie** : system font stack — les tailles sont-elles cohérentes entre pages ?
- **Espacement** : `px-3 sm:px-4` partout ou des variations ?
- **Boutons** : les variantes (primary, outline, ghost, danger) sont-elles utilisées correctement ?
- **Comparaison** avec le design SOS Expat principal : même feel ou décalé ?
- **Livrable** : Rapport de cohérence + tokens manquants

### Agent #22 : Modal mobile
**Mission** : Le composant Modal fonctionne-t-il parfaitement sur mobile ?
- Tailles : sm/md/lg/xl — comment s'affiche chaque taille sur 320px ?
- Le modal devrait-il être plein écran sur mobile (bottom sheet pattern) ?
- Le backdrop click-to-close : fonctionne au touch ?
- Le Escape key : non pertinent sur mobile, mais le bouton X est-il accessible ?
- Le body overflow hidden : pas de scroll du contenu derrière le modal ?
- Le `AddProviderModal` spécifiquement : le formulaire d'ajout est-il utilisable sur mobile ?
- **Livrable** : Test modal par taille + recommandation bottom-sheet mobile

### Agent #23 : PWA Install Prompt
**Mission** : Le prompt d'installation PWA est-il optimal ?
- **Android** : le `beforeinstallprompt` est-il capturé et le banner affiché au bon moment ?
- **iOS** : les instructions manuelles (Share → Add to Home Screen) sont-elles claires ?
- Le cooldown de 7 jours (localStorage) : ne spam-t-il pas l'utilisateur ?
- Le prompt dans le sidebar vs dans le `AppLayout` : double affichage ?
- L'expérience installée : le thème (#DC2626) s'applique-t-il à la status bar ?
- Les shortcuts PWA (Team, Stats, Billing) : fonctionnent-ils sur Android/iOS ?
- **Livrable** : Rapport PWA install UX

---

## ÉQUIPE 5 — PERFORMANCE, PWA & OFFLINE

### Fichiers
- `vite.config.ts` (137 lignes) — Build + PWA + chunks
- `index.html` (165 lignes) — HTML shell + meta + splash
- `src/config/firebase.ts` (80 lignes) — Firebase + cache 50MB
- `src/hooks/useInstallPWA.ts` (95 lignes) — PWA detection

### Agent #24 : Bundle analysis
**Mission** : Le bundle est-il optimisé pour le mobile ?
- 3 chunks manuels : `vendor-react`, `vendor-firebase`, `vendor-charts` — tailles ?
- Le code applicatif (~6300 lignes) : combien de KB après minification + gzip ?
- Recharts (~40KB) : chargé sur TOUTES les pages ou lazy-loaded uniquement sur Stats ?
- Lucide React : tree-shaking fonctionne-t-il ? (454 icônes disponibles, combien utilisées ?)
- TanStack Query + DevTools : le DevTools est-il exclu du build production ?
- `react-hot-toast` + `date-fns` : poids dans le bundle ?
- Taille JS totale initiale cible : **< 150KB gzip**
- **Livrable** : Treemap bundle + recommandations

### Agent #25 : Core Web Vitals mobile
**Mission** : Mesurer les performances sur mobile.
- **Pages à mesurer** (Chrome DevTools, Slow 4G, CPU 4x) :

| Page | LCP cible | FCP cible | CLS cible | INP cible |
|------|-----------|-----------|-----------|-----------|
| Login | <1.5s | <0.8s | 0 | <100ms |
| Dashboard | <2s | <1s | <0.05 | <150ms |
| Requests | <2s | <1s | <0.05 | <150ms |
| Team | <2s | <1s | <0.05 | <150ms |
| Stats | <2.5s | <1.2s | <0.1 | <200ms |

- Le `index.html` (165 lignes) : les meta tags, splash screens, critical CSS — impact sur FCP ?
- Les `preconnect` / `dns-prefetch` : configurés pour `firestore.googleapis.com` ?
- Le loading screen HTML (avant React) : smooth transition vers l'app React ?
- **Livrable** : Tableau CWV mesuré + plan d'optimisation

### Agent #26 : Service Worker & Offline
**Mission** : Le dashboard fonctionne-t-il offline ?
- **Workbox runtime caching** :
  - Firebase Storage → CacheFirst 7j → adapté ?
  - Images → CacheFirst 30j → adapté ?
  - Google Fonts → CacheFirst 1an → adapté ?
  - Firestore API → PAS caché par Workbox (géré par le SDK IndexedDB 50MB)
- **Scénarios offline** :
  - L'app démarre-t-elle sans réseau ? (SW + IndexedDB)
  - Les derniers providers sont-ils affichés en cache ?
  - Les bookings récents sont-ils disponibles hors ligne ?
  - Les stats (getDocs) sont-elles en cache ? (Pas de listener, donc peut-être pas)
  - Que voit l'utilisateur offline : erreur ou données stale ?
- Le `skipWaiting: true` : les mises à jour sont-elles silencieuses ?
- Le `cleanupOutdatedCaches: true` : pas de conflit avec les anciennes versions ?
- **Livrable** : Test offline complet + matrice de disponibilité des données

### Agent #27 : Temps de chargement initial (Cold Start)
**Mission** : Mesurer le temps du premier accès au dashboard.
- **Flow** : URL → `index.html` → JS chunks → Firebase Auth check → Firestore fetch → Render
- Le HTML loading screen (`index.html`) : s'affiche-t-il immédiatement ?
- Firebase Auth `onAuthStateChanged` : temps de résolution ?
- Firestore `getDoc(users/{uid})` : latence réseau vers nam7 (Iowa) ?
- Les `onSnapshot` listeners (providers + bookings) : temps de premier snapshot ?
- **Cible** : Dashboard utilisable en **< 3 secondes** sur 4G
- **Livrable** : Timeline cold start + bottlenecks

### Agent #28 : Firestore query optimization
**Mission** : Les requêtes Firestore sont-elles optimales ?
- **Chunking 30 items** : si une agence a 60 providers, ça fait 2 requêtes parallèles — OK ?
- **Booking time window 2h** : `createdAt > twoHoursAgo` — index composite nécessaire ?
- **Real-time listeners** : 2 listeners actifs en permanence (providers + bookings) — consommation Firebase ?
- **Stats one-time fetch** : pourquoi pas un listener aussi ? (économie de reads)
- Le client-side sorting : ajouter un `orderBy` Firestore serait-il plus performant ?
- Le `multi-tab manager` : performance impact avec plusieurs onglets ?
- **Livrable** : Rapport Firestore + recommandations d'index

---

## ÉQUIPE 6 — MOBILE iOS, ANDROID & TABLET

### Agent #29 : iOS Safari — Test complet
**Mission** : Tester le parcours complet sur iOS Safari.
- Le `viewport-fit=cover` et safe areas : notch + Dynamic Island gérés ?
- Les inputs email/password : pas de zoom automatique (<16px) ?
- Le sidebar drawer : smooth transition sur Safari ?
- Le BottomNav : pas de conflit avec le home indicator ?
- Le scroll dans les listes de providers/bookings : `-webkit-overflow-scrolling: touch` ?
- La table Stats en `overflow-x-auto` : scrollable au touch ?
- Le CSV download : le fichier se télécharge-t-il correctement sur Safari iOS ?
- **PWA standalone** : l'app installée fonctionne-t-elle entièrement ? (auth, navigation, données)
- **Livrable** : Checklist iOS (20 points) + bugs

### Agent #30 : Android Chrome — Test complet
**Mission** : Tester le parcours complet sur Android Chrome.
- Touch targets Material Design 3 (48px) : tous conformes ?
- Le bouton back Android : navigation cohérente dans toutes les pages ?
- Le clavier virtuel : ne masque-t-il pas les champs de formulaire ?
- Les notifications browser (`Notification API`) : permission demandée ? Son joué ?
- La PWA installée : icône, splash, thème color (#DC2626) corrects ?
- Le badge de l'app installée (pending requests) : affiché sur l'icône home screen ?
- WebView (Instagram, WhatsApp in-app browser) : l'app fonctionne-t-elle ?
- **Livrable** : Checklist Android (20 points) + bugs

### Agent #31 : Tablet (iPad, Android tablet)
**Mission** : L'expérience tablette est-elle optimale ?
- iPad portrait (810px) : en dessous de `lg:` (1024px) → layout mobile avec sidebar drawer
- iPad landscape (1080px) : au-dessus de `lg:` → layout desktop avec sidebar fixe
- Le breakpoint `lg:` à 1024px est-il le bon pour la transition ? (iPad Pro = 1024px exactement)
- Les graphiques Recharts : bien dimensionnés sur tablette ?
- La table Stats : lisible sans scroll horizontal sur tablette landscape ?
- Le split-view iPad (multitâche) : l'app se comporte-t-elle bien en demi-écran (507px) ?
- **Livrable** : Captures iPad portrait/landscape/split + recommandations

### Agent #32 : Notifications & alertes mobile
**Mission** : Les notifications fonctionnent-elles correctement sur mobile ?
- `useBookingRequests` : Browser Notification API — permission demandée quand ?
- L'audio alert (880Hz + 1100Hz beep via Web Audio API) : se joue-t-il sur mobile ? (iOS bloque l'audio sans interaction)
- `requireInteraction: true` sur les notifications : supporté sur mobile ?
- Le badge `pendingCount` sur le BottomNav : se met-il à jour en temps réel ?
- Les `react-hot-toast` : positionnées au-dessus du BottomNav ? Pas masquées ?
- Le premier chargement : les notifications ne se déclenchent-elles PAS ? (évite le spam)
- **Livrable** : Test notifications iOS + Android + rapport

### Agent #33 : Micro-interactions & feedback tactile
**Mission** : Chaque interaction a-t-elle un feedback immédiat sur mobile ?
- `active:scale-[0.98]` sur les stats cards : appliqué partout ?
- Les boutons : feedback visuel au tap (couleur change, scale) ?
- Le sidebar drawer : animation d'ouverture/fermeture fluide (>55fps) ?
- Le changement d'onglet (BookingTabs) : transition instantanée ou animation ?
- L'expand/collapse de la description booking : animation smooth ?
- L'AI response preview expand : transition fluide ?
- Le "NEW" badge pulsant (`animate-pulse`) : pas trop agressif sur mobile ?
- Les loading spinners : bien centrés et taille adaptée ?
- **Livrable** : Inventaire micro-interactions + gaps

---

## ÉQUIPE 7 — DONNÉES TEMPS RÉEL, NOTIFICATIONS & FIABILITÉ

### Fichiers
- `src/hooks/useAgencyProviders.ts` (111 lignes) — Providers realtime
- `src/hooks/useBookingRequests.ts` (279 lignes) — Bookings realtime + notifications
- `src/hooks/useProviderStats.ts` (125 lignes) — Stats mensuelles
- `src/contexts/AuthContext.tsx` (217 lignes) — Auth + linkedProviderIds
- `src/types/booking.ts` (68 lignes) — Classification bookings
- `src/types/stats.ts` (195 lignes) — Agrégation stats

### Agent #34 : Temps réel providers
**Mission** : Le monitoring des prestataires en temps réel est-il fiable ?
- `onSnapshot` sur `sos_profiles` : le listener survit-il à une perte de réseau temporaire ?
- Le chunking 30 items : si un provider est ajouté/retiré de `linkedProviderIds`, les listeners se réabonnent-ils ?
- Le `normalizeProvider()` : gère-t-il tous les cas de données manquantes (null, undefined, Timestamp vs Date) ?
- L'`onlineCount` et `activeCount` : recalculés à chaque snapshot ? Performance OK pour 50+ providers ?
- Le tri alphabétique côté client : stable entre les re-renders ?
- **Livrable** : Test de fiabilité (réseau instable, ajout/retrait provider) + rapport

### Agent #35 : Temps réel bookings + classification
**Mission** : La gestion des bookings en temps réel est-elle robuste ?
- La fenêtre de 2 heures : les bookings plus anciens disparaissent-ils silencieusement ? L'utilisateur comprend-il pourquoi ?
- La re-classification toutes les 30 secondes (`setInterval`) : le timer est-il nettoyé au unmount ?
- La classification : `new` (<5 min), `active` (5min-1h), `history` (>1h ou complété) — logique correcte ?
- Le `deleteBooking(id)` : suppression Firestore → le listener la détecte-t-il immédiatement ?
- Les notifications browser : dédupliquées ? (pas de notification pour le même booking 2 fois)
- L'audio beep : `new AudioContext()` + `OscillatorNode` — fonctionne-t-il dans tous les navigateurs ?
- Le batch tracking (skip first load) : fonctionne-t-il correctement ?
- **Livrable** : Matrice de fiabilité bookings + edge cases

### Agent #36 : Réponse IA dans les bookings
**Mission** : L'affichage de la réponse IA est-il optimal ?
- `AiResponsePreview` : le contenu IA est-il bien formaté (markdown ? texte brut ?) ?
- Les metadata (model, tokens, timestamp, source) : utiles pour le manager ? Trop techniques ?
- Le bouton "Copier" : fonctionne-t-il sur mobile (`navigator.clipboard.writeText`) ?
- Le `max-h-60` avec scroll : l'utilisateur comprend-il qu'il faut scroller pour voir tout ?
- L'erreur AI (`aiError` field) : affichée clairement quand la génération échoue ?
- Le bouton "Respond" (SSO vers Outil IA) : ouvre la bonne conversation côté Outil ?
- **Livrable** : Rapport UX réponse IA

### Agent #37 : Auth & sécurité
**Mission** : Le flux d'authentification est-il robuste ?
- Le `signInResolvedRef` : empêche-t-il le double fetch sur mobile (iOS Safari double-fire) ?
- La validation de rôle (`agency_manager` | `admin`) : si le rôle change côté Firestore, l'user est-il déconnecté ?
- Le listener `onSnapshot(users/{uid})` pour `linkedProviderIds` : détecte-t-il les changements en temps réel ?
- Le `ProtectedRoute` : que voit l'utilisateur pendant le loading ? Spinner ? Écran blanc ?
- Le `BlockedScreen` : message clair pour les utilisateurs non autorisés ?
- La persistance de session : survivre à un F5 / fermeture d'onglet ?
- **Livrable** : Rapport sécurité + robustesse auth

---

## ÉQUIPE 8 — ACCESSIBILITÉ, RTL, DARK MODE, i18n & NON-RÉGRESSION

### Agent #38 : Accessibilité WCAG 2.1 AA
**Mission** : Le dashboard est-il accessible ?
- Le contraste : rouge `#DC2626` sur blanc — ratio 4.5:1 ? (calculer)
- Les `StatusBadge` couleurs (green, yellow, gray, red) : contrastées sur fond blanc ET dark ?
- Navigation clavier complète : Tab à travers toutes les pages sans souris ?
- Les icônes Lucide : ont-elles des `aria-label` ou `aria-hidden` ?
- Le sidebar mobile : focus trap quand ouvert ?
- Le modal : focus trap + Escape pour fermer ?
- Les graphiques Recharts : accessibles au screen reader ? (alternative textuelle ?)
- Les formulaires (Login, AddProvider) : labels associés aux inputs ? Erreurs annoncées ?
- **Livrable** : Rapport WCAG AA + violations

### Agent #39 : RTL (arabe) & i18n
**Mission** : Le dashboard fonctionne-t-il correctement en arabe et dans les 9 langues ?
- `App.tsx` : `document.documentElement.dir = 'rtl'` quand langue = arabe — appliqué correctement ?
- La sidebar : s'affiche-t-elle à DROITE en RTL ?
- Le BottomNav : les icônes sont-elles dans le bon ordre en RTL ?
- Les icônes directionnelles (flèches) : inversées en RTL ?
- Les badges (position `right-0`) : passent-ils à `left-0` en RTL ?
- Les `margin-left/right` et `padding-left/right` : Tailwind logical properties (`ms-`/`me-`) utilisées ?
- **Toutes les 9 langues** : les traductions sont-elles complètes ? Pas de clés manquantes (`t('key')` affichant la clé brute) ?
- Le japonais (JA) : est une langue ajoutée récemment — toutes les clés sont-elles traduites ?
- **Livrable** : Test RTL + checklist i18n par langue

### Agent #40 : Dark mode
**Mission** : Le dark mode est-il supporté ou nécessaire ?
- **État actuel** : Le dashboard n'a PAS de dark mode explicite (pas de `dark:` classes Tailwind)
- Faut-il ajouter le dark mode ? (les providers utilisent le dashboard la nuit ?)
- Le `prefers-color-scheme: dark` : est-il détecté ? Que se passe-t-il actuellement ?
- Si dark mode ajouté : quels composants doivent être mis à jour ?
- Les graphiques Recharts : auraient-ils besoin de couleurs différentes ?
- **Livrable** : Recommandation dark mode (ajout vs non) + effort estimé

### Agent #41 : Non-régression & qualité
**Mission** : Valider que le dashboard fonctionne correctement.
- `npm run build` (`tsc && vite build`) : compile sans erreur ?
- `npm run lint` : pas d'erreurs ESLint ?
- **Checklist fonctionnelle** :
  1. Login email/password ✅/❌
  2. Dashboard affiche KPIs + activité ✅/❌
  3. Requests affiche les onglets + cards ✅/❌
  4. Nouveau booking → notification browser + son ✅/❌
  5. Badge pendingCount mis à jour en temps réel ✅/❌
  6. Team affiche la liste providers + recherche ✅/❌
  7. AddProviderModal fonctionne ✅/❌
  8. Stats affiche graphiques + table ✅/❌
  9. CSV export télécharge un fichier valide ✅/❌
  10. Language switch fonctionne (9 langues) ✅/❌
  11. Sidebar mobile ouvre/ferme ✅/❌
  12. BottomNav navigue correctement ✅/❌
  13. PWA installable (Android) ✅/❌
  14. PWA instructions iOS affichées ✅/❌
  15. Offline : app démarre avec données en cache ✅/❌
  16. F5/refresh : session maintenue ✅/❌
  17. Responsive 320px : pas de scroll horizontal ✅/❌
  18. Responsive 1440px : layout desktop propre ✅/❌
- **Livrable** : Checklist validée + rapport de qualité

---

## LIVRABLES ORCHESTRATEUR (Agent #0)

1. **Score global** par page (A à F) : Login, Dashboard, Requests, Team, Stats
2. **Score par critère** : Mobile-first, Performance, UX, Design, Accessibilité, PWA
3. **Top 10 corrections** ordonnées par impact
4. **Quick wins** (<30 min) : changements rapides à haut impact
5. **Problèmes structurels** : refactoring nécessaire
6. **Comparaison** avec le design SOS Expat principal : cohérence inter-projets
7. **Verdict final** : "Le dashboard multiprestataire est-il parfait ?" + plan d'action

---

## MÉTRIQUES CIBLES 2026

### Core Web Vitals (Mobile 4G)
| Page | LCP | FCP | CLS | INP | TTFB |
|------|-----|-----|-----|-----|------|
| Login | <1.5s | <0.8s | 0 | <100ms | <0.5s |
| Dashboard | <2s | <1s | <0.05 | <150ms | <0.8s |
| Requests | <2s | <1s | <0.05 | <150ms | <0.8s |
| Team | <2s | <1s | <0.05 | <150ms | <0.8s |
| Stats | <2.5s | <1.2s | <0.1 | <200ms | <1s |

### UX Mobile
| Critère | Cible |
|---------|-------|
| Touch targets | ≥ 48px (Material Design 3) |
| Scroll FPS | ≥ 55fps |
| Cold start | < 3s sur 4G |
| PWA Lighthouse | ≥ 95/100 |
| Offline capability | Données en cache affichées |
| Zéro scroll horizontal | Sur 320px |

### Accessibilité
| Critère | Cible |
|---------|-------|
| WCAG Level | 2.1 AA |
| Contraste texte | ≥ 4.5:1 |
| Navigation clavier | 100% |
| Screen reader | Navigable |
| RTL (arabe) | Layout inversé complet |

---

## CONTRAINTES

- **Langue** : Toujours communiquer en français
- **Projet standalone** : `Dashboard-multiprestataire/` — séparé de SOS Expat et Outil IA
- **Cloudflare Pages** : auto-deploy sur push main (PAS Firebase Hosting)
- **Même Firebase** : projet `sos-urgently-ac307`, Firestore nam7 Iowa
- **Pas de backend propre** : lecture seule Firestore (sauf deleteDoc sur bookings)
- **PWA** : L'app EST une PWA — les optimisations PWA sont critiques
- **react-hot-toast** : PAS `alert()` pour les notifications
- **Rollback** : Commits atomiques, réversible en <5 min
- **Build** : `tsc && vite build` doit compiler sans erreur
