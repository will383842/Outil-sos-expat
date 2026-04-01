# CONTEXTE — Suite et fin de l'optimisation SEO/AEO des fiches prestataires SOS Expat

## CE QUI A ÉTÉ FAIT (ne PAS refaire)

### Session 1 — GSC Fixes
- Sitemap `constants.ts` aligné avec le routeur (ru/ch/hi en translittérations latines)
- `PasswordReset.tsx` → noindex + retiré du sitemap
- 6 pages d'inscription migrées de DOM manipulation → `<Helmet>` (RegisterLawyer, RegisterExpat, RegisterClient, Register, GroupAdminRegister, ChatterRegister)
- Redirects 301 pour anciens slugs dans `_redirects`
- Cloudflare Worker : locale canonicalization (pt-br→pt-pt etc.) + fallback SPA sur SSR 3xx/5xx + `redirect:'manual'`
- ReviewSchema ajouté sur ProviderProfile.tsx (AggregateRating + Reviews individuels)
- Offer schema avec prix (€49 avocat, €19 expat) + availability sur profils
- Meta title/description enrichis : spécialité + langues + pays d'intervention
- BreadcrumbSchema ajouté sur 19+ pages publiques
- FAQPageSchema avec inLanguage sur FAQ.tsx + FAQDetail.tsx + GroupAdminLanding.tsx
- Slugs migrés : 77 profils avec spécialité traduite en 9 langues + previousSlugs pour 301
- Trigger `onProviderCreated` mis à jour avec SPECIALTY_SHORT_SLUGS

### Session 2 — Pages pays dynamiques
- `ProvidersByCountry.tsx` créé — page listing prestataires par pays
- `country-languages.ts` — 209 pays → langues éligibles
- `country-slug-translations.ts` — 247 pays × 9 langues
- Routes : `/avocats/:countrySlug`, `/lawyers/:countrySlug`, etc. dans App.tsx + localeRoutes.ts
- Worker SSR : 16 patterns pour les pages pays
- 27 clés de traduction `providers.*` ajoutées dans les 8 fichiers de langue (en, es, de, pt, ru, ch, ar, hi)

### Session 3 — Sitemaps + Auto-indexing
- Cloud Function `sitemapCountryListings` — 2205 URLs déployée
- `onProfileCreated` + `onProfileUpdated` soumettent les pages pays à Google + IndexNow
- `sitemapHelp` + `sitemapFaq` → minInstances:1 (fix cold start 500)
- Proxy sitemaps dans le Cloudflare Worker (Pages `_redirects` ne proxy pas les URLs externes)
- `robots.txt` + `sitemap.xml` mis à jour avec URLs proxy `sos-expat.com/sitemaps/*.xml`

### Corrections SEO profils (audit 12 problèmes)
- Fix 3+4 : Double AggregateRating + double schema → `includeAggregateRating={false}` sur ReviewSchema
- Fix 6 : og:locale dynamique passé au SEOHead
- Fix 7 : H1 sans code langue brut "fr"
- Fix 9 : Breadcrumbs traduits en 9 langues dans snippetGenerator.ts
- Fix 10 : ratingValue arrondi `.toFixed(1)`
- Fix 11 : Twitter handle unifié `@sosexpat`
- Fix 6b : aiSummary traduit via intl.formatMessage()
- Section "Autres prestataires" ajoutée en bas de chaque profil

---

## CE QUI RESTE À CORRIGER (4 points)

### 🔴 1. Canonical tronqué sur certains profils
**Problème** : Le canonical URL de certains profils (ex: Miguel Lopez) finit par `miguel-lopez-aaa_la` au lieu de l'UID complet → Google indexe une URL 404.
**Cause** : Le fallback dans `ProviderProfile.tsx` (quand `provider.slugs` n'existe pas) utilise `safeNormalize()` qui tronque le nom. Le `slice(0, 60)` du SEO title contamine aussi.
**Fichier** : `sos/src/pages/ProviderProfile.tsx` lignes ~2307-2330 (construction de `canonicalUrl`)
**Fix** : Vérifier que TOUS les profils ont des `slugs` dans Firestore (la migration en a mis à 77/79). Pour le fallback, ne PAS tronquer le shortId. Le canonical doit TOUJOURS être une URL qui fonctionne.

### 🔴 2+5. Meta description EN sur page FR + Version EN pas SSR
**Problème** : Le `index.html` statique a des meta tags EN (description, OG) qui ne sont pas écrasés par React Helmet sur certaines pages. Et le Worker Cloudflare ne matche pas certaines URLs EN pour le SSR.
**Cause** : `index.html` a des meta tags statiques en anglais. Quand Helmet ne les écrase pas (chargement lent, SSR absent), Google voit la version EN.
**Fichiers** : `sos/index.html` (meta statiques), `sos/cloudflare-worker/worker.js` (patterns SSR)
**Fix** : Soit supprimer les meta statiques de `index.html` (risque pour social sharing avant JS), soit les mettre en français (langue par défaut), soit s'assurer que Helmet les écrase toujours via le SSR.

### 🟡 3. Section "Autres prestataires" — filtrage incomplet
**Problème actuel** : La section filtre uniquement par `country` (pays principal) et `type`. Elle devrait aussi filtrer par `operatingCountries` (pays d'intervention) et idéalement par langues parlées communes.
**Fichier** : `sos/src/pages/ProviderProfile.tsx` — le useEffect de `relatedProviders` (vers ligne 1624)
**Fix** : Ajouter une 2e query avec `where("operatingCountries", "array-contains", provider.country)` et fusionner les résultats. Les spécialités dans les cards related doivent être traduites (actuellement codes bruts `rp.specialties.join(', ')`). Les liens doivent utiliser les slugs SEO (`rp.slugs[lang]`) au lieu de `/provider/{id}`.

### 🟡 4. HowTo + Speakable schemas manquants
**Problème** : Les profils prestataires n'ont pas de schema HowTo ("Comment consulter cet avocat en 3 étapes") ni de Speakable (optimisation recherche vocale).
**Fichier** : `sos/src/pages/ProviderProfile.tsx`
**Fix** : Ajouter un schema HowTo avec 3 étapes :
1. "Choisissez votre prestataire" (traduit)
2. "Payez la mise en relation (empreinte bancaire €49/€19)"
3. "Recevez l'appel en moins de 5 minutes"
Et un schema Speakable ciblant les sections clé (nom, spécialité, disponibilité).

---

## FONCTIONNEMENT DU SERVICE (contexte métier)

Le client :
1. Choisit un prestataire (avocat ou expatrié) en fonction de : pays d'intervention, langue, avis, nombre d'appels, spécialités
2. Paie la mise en relation (empreinte bancaire, NON capturée immédiatement) — €49 pour un avocat (20min), €19 pour un expat (30min)
3. Est mis en relation par téléphone en moins de 5 minutes
4. L'appel se déroule
5. Le paiement est capturé OU remboursé instantanément si l'appel n'a pas pu avoir lieu
6. Le client laisse un avis sur le prestataire pour aider les futurs clients

---

## ARCHITECTURE TECHNIQUE

- **Frontend** : React 18 + TypeScript + Vite + Tailwind + react-intl (i18n, 9 langues)
- **Backend** : Firebase Cloud Functions (Node.js, TypeScript)
- **Base de données** : Firestore (`sos_profiles`, `reviews`, etc.)
- **Hébergement frontend** : Cloudflare Pages (auto-deploy sur push main)
- **SSR** : Cloudflare Worker → Firebase Cloud Function `renderForBotsV2` (Puppeteer)
- **SEO** : react-helmet-async, JSON-LD via composants `seo/`, IndexNow + Google Indexing API
- **Routing** : React Router v6 avec système multilingue custom (`localeRoutes.ts`)
- **9 langues** : fr, en, es, de, ru, pt, zh (code interne: ch), ar, hi

## FICHIERS CLÉS

| Fichier | Rôle |
|---------|------|
| `sos/src/pages/ProviderProfile.tsx` | Page profil prestataire (3500+ lignes) — le plus critique |
| `sos/src/utils/snippetGenerator.ts` | Génère JSON-LD (BreadcrumbList, FAQPage) pour les profils |
| `sos/src/components/seo/ReviewSchema.tsx` | Schema Review + AggregateRating |
| `sos/src/components/seo/BreadcrumbSchema.tsx` | Schema BreadcrumbList |
| `sos/src/components/layout/SEOHead.tsx` | Composant SEO head (Helmet) |
| `sos/src/pages/ProvidersByCountry.tsx` | Page listing prestataires par pays |
| `sos/cloudflare-worker/worker.js` | Worker Cloudflare (SSR bot detection, sitemap proxy) |
| `sos/index.html` | HTML statique avec meta tags EN (problème #2) |
| `sos/firebase/functions/src/seo/sitemaps.ts` | Cloud Functions sitemaps dynamiques |
| `sos/firebase/functions/src/seo/autoIndexingTriggers.ts` | Auto-indexing sur création/mise à jour profil |
| `sos/firebase/functions/src/triggers/onProviderCreated.ts` | Trigger inscription (slugs, etc.) |

## DÉPLOIEMENT

- **Frontend** : Push sur `main` → Cloudflare Pages auto-deploy
- **Cloud Functions** : `cd sos/firebase/functions && rm -rf lib && npm run build && firebase deploy --only functions:nomFonction`
- **Worker Cloudflare** : `cd sos/cloudflare-worker && npx wrangler deploy`
- **Firestore rules/indexes** : Aucun changement nécessaire

## ⛔ RÈGLES

- NE PAS modifier les fonctionnalités existantes (appels, paiements, etc.)
- NE PAS casser le prerendering SSR existant
- NE PAS perdre des pages déjà indexées par Google
- Tester avec `npx tsc --noEmit --skipLibCheck` avant chaque commit
- Commit et push après chaque correction
- Toujours vérifier que les profils s'affichent correctement après modification
