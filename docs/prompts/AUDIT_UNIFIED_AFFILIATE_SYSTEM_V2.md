# MEGA-AUDIT : Système d'Affiliation Unifié SOS-Expat — Vérification Complète de Bout en Bout

## CONTEXTE POUR L'IA

Tu es un auditeur senior spécialisé en systèmes d'affiliation et de commissions. Tu dois vérifier de bout en bout le **Système d'Affiliation Unifié** de SOS-Expat qui vient d'être entièrement refactorisé.

### Ce qui a été fait (migration legacy → unifié) :
1. **Ancien système** : 3 codes par rôle (affiliateCodeClient, affiliateCodeRecruitment, affiliateCodeProvider) avec des URLs séparées (`/ref/{role}/CODE`, `/rec/{role}/CODE`, `/prov/{role}/CODE`)
2. **Nouveau système** : 1 seul code unifié (`affiliateCode`) avec 1 seule URL (`/r/CODE`) pour tous les usages (clients, recrutement, prestataires)
3. **4 rôles affiliés** : Chatter, Influencer, Blogger, GroupAdmin — tous unifiés sous le même système
4. **Hiérarchie de plans de commission à 4 niveaux** : lockedRates (figées à l'inscription) > plan individuel > plan par défaut du rôle > catch-all
5. **Commissions à vie** : Les taux sont verrouillés à la date d'inscription et ne changent JAMAIS sauf override admin
6. **Frontend** : Tous les dashboards montrent 1 seul lien unifié au lieu des 3 anciens
7. **Backend** : Triggers consolidés (17 → 3), scheduled functions consolidées (8 → 2)
8. **Legacy supprimé** : 8 fonctions de génération de liens, 2 composants legacy, exports morts nettoyés

### Architecture technique :
- **Frontend** : React + TypeScript + Vite + Tailwind (deploy Cloudflare Pages)
- **Backend** : Firebase Cloud Functions v2 (3 régions : europe-west1, us-central1, europe-west3)
- **Base de données** : Firestore (nam7, Iowa)
- **Chemin projet** : `C:\Users\willi\Documents\Projets\VS_CODE\sos-expat-project\sos\`
- **Functions** : `sos/firebase/functions/src/`
- **Frontend** : `sos/src/`

---

## INSTRUCTIONS D'EXÉCUTION

Lance **50 agents IA** organisés en **7 divisions hiérarchiques**. Chaque division a un **agent chef** qui coordonne ses sous-agents et produit un rapport. À la fin, un **agent synthétiseur** compile tous les rapports en un verdict final.

**IMPORTANT** : Pour chaque vérification, compare systématiquement avec le code Git avant la migration (utilise `git log` et `git diff` pour voir les changements récents). Ne te contente pas de vérifier que le code "a l'air correct" — vérifie qu'il est **fonctionnellement complet et sans régression**.

---

## DIVISION 1 : CODE UNIFIÉ & GÉNÉRATION (7 agents)

### Agent 1.1 — Chef de Division : Cohérence du Code Unifié
Coordonne les agents 1.2 à 1.7 et valide la cohérence globale.

### Agent 1.2 — Générateur de Code Unifié
- Vérifie `firebase/functions/src/unified/codeGenerator.ts`
- Confirme qu'un seul code est généré par user (format sans tirets)
- Vérifie que `isValidUnifiedCode()` et `isLegacyCode()` distinguent correctement les 2 formats
- Teste les edge cases : prénoms avec accents, prénoms courts (1-2 chars), prénoms très longs, caractères spéciaux
- Vérifie la garantie d'unicité (basée UID, 0 lookups Firestore)

### Agent 1.3 — Intégration Register Callables
- Vérifie les 4 fonctions d'inscription :
  - `chatter/callables/registerChatter.ts`
  - `influencer/callables/registerInfluencer.ts`
  - `blogger/callables/registerBlogger.ts`
  - `groupAdmin/callables/registerGroupAdmin.ts`
- Pour chacune : quel code est généré ? L'ancien (3 codes) ou le nouveau (1 code unifié) ?
- Si l'ancien est encore utilisé : est-ce un problème ? Le code unifié est-il aussi généré en parallèle ?
- Vérifie que `affiliateCode` est bien stocké dans le document Firestore du user
- Vérifie que les `lockedRates` sont calculées et stockées à l'inscription

### Agent 1.4 — Résolution de Code (Code Resolver)
- Vérifie `firebase/functions/src/unified/codeResolver.ts`
- Teste que le resolver gère :
  - Codes unifiés (nouveau format)
  - Codes legacy (REC-, PROV-, BLOG-, GROUP-)
  - Codes inexistants (erreur gracieuse)
- Vérifie la backward compatibility pour les liens déjà partagés

### Agent 1.5 — Migration de Code
- Vérifie `firebase/functions/src/unified/codeMigrator.ts`
- Script de migration mass : `migrateAllToUnifiedCodes()`
- Vérifie qu'un user avec 3 anciens codes reçoit bien 1 nouveau code unifié
- Vérifie que les anciens codes restent fonctionnels (backward compat)

### Agent 1.6 — Routes Frontend (Backward Compat)
- Vérifie dans `sos/src/App.tsx` (ou fichier de routing) :
  - La route `/r/:code` existe et fonctionne
  - Les anciennes routes (`/ref/c/`, `/rec/c/`, `/ref/i/`, `/rec/i/`, `/ref/b/`, `/rec/b/`, `/ref/ga/`, `/rec/ga/`, `/prov/c/`, `/prov/i/`, `/prov/b/`, `/prov/ga/`) sont CONSERVÉES pour backward compat
  - Toutes redirigent vers le bon composant de résolution
- Vérifie le composant de résolution des liens : capture-t-il le referral code et le stocke-t-il ?

### Agent 1.7 — Référent Resolver
- Vérifie `firebase/functions/src/unified/referralResolver.ts`
- Ordre de priorité : `referredByUserId` (nouveau) > champs legacy (referredByChatterId, etc.)
- Vérifie `findReferrer()` et `findProviderRecruiter()`
- Teste les cas : user référé par ancien système, user référé par nouveau système, aucun referrer

---

## DIVISION 2 : COMMISSIONS & PLANS (8 agents)

### Agent 2.1 — Chef de Division : Système de Commissions
Coordonne et valide la cohérence du système de commissions.

### Agent 2.2 — Plans de Commission par Défaut
- Vérifie `firebase/functions/src/unified/defaultPlans.ts`
- Les montants par défaut sont-ils corrects ?
  - Lawyer call : $5 (500 cents)
  - Expat call : $3 (300 cents)
  - N1 (filleul direct) : $1 (100 cents)
  - N2 (filleul de filleul) : $0.50 (50 cents)
  - Activation bonus : $5 (500 cents)
  - Provider recruitment : $5 (500 cents)
- Vérifie que la promo actuelle ($10/$10 pour TOUS les appels jusqu'au 31 août 2026) est correctement implémentée
- Les montants sont-ils en **cents USD** partout (pas en dollars) ?

### Agent 2.3 — Hiérarchie 4 Niveaux
- Vérifie `firebase/functions/src/unified/planService.ts`
- Confirme l'ordre de résolution : `lockedRates > plan individuel > plan rôle par défaut > catch-all`
- Teste chaque niveau avec des données fictives
- Vérifie que si `lockedRates.commissionClientCallAmountLawyer = 1000` (promo $10), même si le plan par défaut passe à 500 ($5), le user garde ses $10
- **CRITIQUE** : Les lockedRates sont-elles vraiment immuables sauf override admin explicite ?

### Agent 2.4 — Commissions à Vie (lockedRates)
- Vérifie dans les 4 `register*` callables comment les `lockedRates` sont calculées et stockées
- Vérifie que les lockedRates reflètent les taux **au moment de l'inscription**
- Vérifie qu'il n'existe AUCUN code qui écrase les lockedRates automatiquement (seul l'admin peut modifier via le dashboard admin)
- Vérifie dans les triggers `onCallCompleted` et le système unifié que les lockedRates sont bien lues en priorité
- Simule le scénario : User inscrit pendant la promo ($10/$10), promo terminée ($5/$3), l'user doit toujours recevoir $10/$10

### Agent 2.5 — Modification Individuelle des Commissions
- Vérifie qu'un admin peut modifier les commissions d'un affilié spécifique via la console admin
- Cherche les callables admin : `adminUpdateCommissionPlan`, `adminUpdateLockedRates`, ou similaire
- Vérifie le frontend admin : page de détail d'un affilié avec possibilité de modifier ses taux
- Vérifie que la modification individuelle se répercute immédiatement sur les prochaines commissions
- Vérifie la trace d'audit (qui a modifié quoi, quand)

### Agent 2.6 — Calculateur de Commissions
- Vérifie `firebase/functions/src/unified/commissionCalculator.ts`
- Vérifie `firebase/functions/src/unified/commissionWriter.ts`
- Teste tous les types de commissions :
  - `client_call` (appel client référé) — lawyer vs expat
  - `recruitment_call` (appel d'un filleul N1)
  - `n2_call` (appel d'un filleul N2)
  - `activation_bonus` (bonus inscription)
  - `provider_recruitment` (recrutement prestataire)
  - `subscription` (abonnement récurrent)
- Vérifie la protection anti-double commission (même appel ne génère pas 2 commissions)
- Vérifie la protection anti-self-referral

### Agent 2.7 — Détection de Fraude
- Vérifie `firebase/functions/src/unified/fraudDetector.ts`
- Cas testés :
  - Circular referral (A réfère B qui réfère A)
  - Self-referral (user se réfère lui-même)
  - Appels trop courts (< seuil minimum)
  - Même IP/device pour referrer et referred
  - Volume anormal de commissions
- Compare avec les meilleures pratiques anti-fraude d'affiliation 2026

### Agent 2.8 — Validation & Release des Commissions
- Vérifie `firebase/functions/src/scheduled/consolidatedCommissions.ts`
- Vérifie le flow : pending → validated (après 7 jours) → available (après 24h)
- Vérifie que `consolidatedValidateCommissions` et `consolidatedReleaseCommissions` traitent les 4 rôles
- Vérifie qu'aucune commission n'est perdue dans le pipeline
- Vérifie les imports : les services sous-jacents existent et fonctionnent

---

## DIVISION 3 : TRACKING & ATTRIBUTION (7 agents)

### Agent 3.1 — Chef de Division : Tracking Sans Perte
Coordonne et valide que le tracking est parfait de bout en bout.

### Agent 3.2 — Capture du Referral Code (Frontend)
- Vérifie le composant/hook qui capture le code referral depuis l'URL `/r/CODE`
- Le code est-il stocké en localStorage/sessionStorage/cookie ?
- Durée de vie du cookie/storage (30 jours standard ? 90 jours ?)
- Que se passe-t-il si l'utilisateur visite `/r/CODE1` puis `/r/CODE2` ? (first-touch vs last-touch)
- Le code survit-il à un refresh de page ?
- Le code est-il transmis lors de l'inscription ?
- Le code est-il transmis lors d'un appel (pour attribution client) ?

### Agent 3.3 — Attribution Côté Backend
- Vérifie `firebase/functions/src/unified/handlers/handleUserRegistered.ts`
- Quand un user s'inscrit avec un referral code :
  - Le `referredByUserId` est-il correctement stocké ?
  - Le bonus d'activation est-il créé ?
  - La commission N1/N2 est-elle correctement chaînée ?
- Vérifie le chaînage multi-niveau : Client → Affilié N1 → Affilié N0 (le recruteur de N1 reçoit aussi)

### Agent 3.4 — Attribution des Appels
- Vérifie `firebase/functions/src/unified/handlers/handleCallCompleted.ts`
- Vérifie `firebase/functions/src/triggers/consolidatedOnCallCompleted.ts`
- Quand un appel payant est complété :
  - Le client est-il attribué au bon affilié ?
  - La commission `client_call` est-elle créée pour l'affilié ?
  - La commission `recruitment_call` (N1) est-elle créée pour le recruteur de l'affilié ?
  - La commission `n2_call` (N2) est-elle créée pour le recruteur du recruteur ?
  - Les montants correspondent-ils aux lockedRates de chaque affilié concerné ?
- Vérifie le feature flag : unified enabled vs legacy fallback

### Agent 3.5 — Attribution des Inscriptions Prestataires
- Vérifie `firebase/functions/src/unified/handlers/handleProviderRegistered.ts`
- Quand un prestataire s'inscrit via un lien affilié :
  - La commission `provider_recruitment` est-elle créée ?
  - Le prestataire est-il lié au bon affilié ?
  - Collection `group_admin_recruited_providers` ou équivalent
- Vérifie que les futurs appels de ce prestataire génèrent des commissions récurrentes

### Agent 3.6 — Scénarios de Tracking End-to-End
Simule 5 scénarios complets et vérifie chaque étape :

**Scénario A** : Chatter partage `/r/CODE` → Client clique → Client s'inscrit → Client appelle un avocat → Chatter reçoit commission
**Scénario B** : Influencer partage `/r/CODE` → Autre personne s'inscrit comme Influencer → Nouvel Influencer réfère un client → Client appelle → Influencer original reçoit commission N1
**Scénario C** : Blogger partage `/r/CODE` → Prestataire s'inscrit → Prestataire reçoit des appels → Blogger reçoit commissions récurrentes
**Scénario D** : GroupAdmin partage `/r/CODE` → Autre GroupAdmin s'inscrit → Le nouveau GA réfère des clients → GA original reçoit commissions N2
**Scénario E** : User inscrit pendant la promo ($10/$10) → Promo expire → User continue de recevoir $10/$10 (lockedRates)

### Agent 3.7 — Discount Client
- Vérifie `firebase/functions/src/unified/discountResolver.ts`
- Le `clientDiscountPercent` est-il appliqué correctement ?
- Vérifie que le discount est UNIQUEMENT pour les Influencers (pas les autres rôles)
- Vérifie le callable `resolveDiscountCallable.ts`
- Le discount s'affiche-t-il correctement sur le frontend lors du paiement ?

---

## DIVISION 4 : FRONTEND — DASHBOARDS UTILISATEURS (8 agents)

### Agent 4.1 — Chef de Division : Dashboards Unifiés
Coordonne et valide que tous les dashboards affichent le lien unifié.

### Agent 4.2 — Dashboard Chatter
- Vérifie `sos/src/pages/Chatter/ChatterDashboard.tsx`
- Vérifie `sos/src/components/Chatter/Layout/ChatterDashboardLayout.tsx`
- Vérifie `sos/src/components/Chatter/Layout/StickyAffiliateBar.tsx`
- **CRITIQUE** : Aucun des 3 anciens liens ne doit apparaître. Seul `/r/CODE` doit être visible
- Les montants affichés sont-ils dynamiques (depuis config backend) et non hardcodés ?
- Le bouton copier fonctionne-t-il ?
- Le bouton partager (WhatsApp, Telegram, natif) fonctionne-t-il ?

### Agent 4.3 — Dashboard Influencer
- Vérifie `sos/src/pages/Influencer/InfluencerDashboard.tsx`
- Vérifie `sos/src/pages/Influencer/InfluencerReferrals.tsx`
- Vérifie `sos/src/pages/Influencer/InfluencerPromoTools.tsx`
- **CRITIQUE** : L'onglet "Liens" dans PromoTools doit montrer le lien unifié (pas les 3 anciens via `InfluencerAffiliateLinks`)
- Vérifie que `InfluencerAffiliateLinks` component a bien été supprimé
- L'`InfluencerLevelCard` utilise-t-il des thresholds dynamiques (depuis config) ?
- Le `UnifiedLinkWithEarnings` est-il présent avec les bons montants ?

### Agent 4.4 — Dashboard Blogger
- Vérifie `sos/src/pages/Blogger/BloggerDashboard.tsx`
- Vérifie `sos/src/pages/Blogger/BloggerBloggerRecruitment.tsx`
- Lien unifié affiché ? Montants dynamiques ?
- `UnifiedLinkWithEarnings` présent avec `config` prop ?

### Agent 4.5 — Dashboard GroupAdmin
- Vérifie `sos/src/pages/GroupAdmin/GroupAdminDashboard.tsx`
- Vérifie `sos/src/pages/GroupAdmin/GroupAdminReferrals.tsx`
- Vérifie `sos/src/pages/GroupAdmin/GroupAdminGroupAdminRecruitment.tsx`
- **CRITIQUE** : Le lien de recrutement doit être `/r/CODE` (pas `/group-admin/inscription?ref=CODE`)
- Variables mortes nettoyées ? (`affiliateLink`, `recruitmentLink` supprimés)

### Agent 4.6 — Composant UnifiedLinkWithEarnings
- Vérifie `sos/src/components/unified/UnifiedLinkWithEarnings.tsx`
- L'interface `CommissionConfig` est-elle correcte ?
- La fonction `getClientCallDisplay()` résout-elle lawyer/expat depuis la config ?
- La fonction `getEarningsForRole()` utilise-t-elle la config avec fallbacks `DEFAULTS` ?
- Les 6 pages dashboard passent-elles toutes la prop `config` ?
- Vérifie qu'aucun montant n'est hardcodé dans le composant (tous viennent de `config` ou `DEFAULTS`)

### Agent 4.7 — Hooks Unifiés
- Vérifie les 4 hooks :
  - `sos/src/hooks/useChatter.ts`
  - `sos/src/hooks/useInfluencer.ts`
  - `sos/src/hooks/useBlogger.ts`
  - `sos/src/hooks/useGroupAdmin.ts`
- Pour chacun :
  - `shareUrl` pointe vers `/r/CODE` (pas les anciennes URLs)
  - `clientShareUrl`, `recruitmentShareUrl`, `providerShareUrl` sont des aliases vers `shareUrl`
  - Le code utilisé est `affiliateCode || affiliateCodeClient` (fallback legacy)
  - Pas d'imports morts (`getTranslatedRouteSlug`, `useApp` inutiles, etc.)

### Agent 4.8 — Pages Secondaires
- Vérifie `ChatterTraining.tsx` — les liens affichés sont-ils unifiés ?
- Vérifie `ChatterHowToEarn.tsx` — montants lawyer/expat distincts ? Pas de fallback `|| 300` (utilise `?? 500`) ?
- Vérifie `NewChatterDashboard.tsx` — lien unifié dans les boutons share ?
- Vérifie `MotivationWidget.tsx` — utilise `clientShareUrl` (qui est maintenant `/r/CODE`) ?
- Vérifie que TOUTES les pages qui affichent un lien d'affiliation utilisent le format unifié

---

## DIVISION 5 : CONSOLE D'ADMINISTRATION (8 agents)

### Agent 5.1 — Chef de Division : Admin Unifié
Coordonne et valide que l'admin est complet et centralisé.

### Agent 5.2 — Onglet Admin Unifié des Affiliés
- Cherche dans `sos/src/pages/admin/` un onglet centralisé pour gérer TOUS les affiliés (4 rôles)
- **CRITIQUE** : Le paramétrage des commissions doit être dans UN SEUL onglet, PAS dispersé par rôle
- Vérifie s'il existe :
  - `admin/AffiliateManagement.tsx` ou équivalent
  - Un tableau listant tous les affiliés (chatters + influencers + bloggers + groupAdmins)
  - Un filtre par rôle
  - Un accès rapide au détail de chaque affilié
- Si cet onglet centralisé N'EXISTE PAS : **signaler comme manquant critique**

### Agent 5.3 — Configuration Globale des Plans
- Vérifie les callables admin :
  - `adminUpdateAffiliateConfig` ou similaire
  - `adminUpdateCommissionPlan` ou similaire
- L'admin peut-il modifier les plans par défaut par rôle ?
- L'admin peut-il créer des plans promotionnels temporaires ?
- Les modifications sont-elles auditées (timestamp, adminId) ?
- Vérifie le frontend admin correspondant

### Agent 5.4 — Modification Individuelle d'un Affilié
- Vérifie la page admin de détail d'un affilié (pour chaque rôle) :
  - `admin/ChatterDetail` ou `admin/AffiliateDetail`
  - Peut-on voir les lockedRates de l'affilié ?
  - Peut-on MODIFIER les lockedRates individuellement ?
  - Peut-on voir l'historique des commissions ?
  - Peut-on voir les filleuls (tree de recrutement) ?
- **CRITIQUE** : La modification individuelle doit être possible ET tracée

### Agent 5.5 — Dashboard Admin Global
- Vérifie `firebase/functions/src/unified/callables/adminDashboard.ts`
- Stats globales : nombre d'affiliés, commissions totales, commissions en attente
- Breakdown par rôle
- Graphiques de tendances
- Top affiliés
- Vérifie le frontend correspondant

### Agent 5.6 — Gestion des Withdrawals Admin
- Vérifie les callables admin de paiement :
  - `adminProcessPayoutWise`, `adminProcessPayoutManual`
  - `adminApprovePayout`, `adminRejectPayout`
  - `adminGetPendingPayouts`
- Le flow complet : affilié demande retrait → admin voit dans le dashboard → admin approuve/rejette → paiement envoyé
- Les frais de retrait ($3 fixe) sont-ils correctement appliqués ?
- Le seuil minimum ($30) est-il respecté ?

### Agent 5.7 — Admin Influencer/Blogger/GroupAdmin Detail
- Vérifie les pages admin de détail pour chaque rôle :
  - Les lockedRates sont-elles affichées et éditables ?
  - Les commissions historiques sont-elles visibles ?
  - Le statut (active/suspended/banned) est-il gérable ?
- Compare avec les pages admin Chatter (qui étaient les premières implémentées)

### Agent 5.8 — Audit Trail & Sécurité Admin
- Vérifie que toutes les actions admin sont loguées (Firestore `admin_actions` ou logs)
- Vérifie les règles d'accès : seuls les admins peuvent modifier les plans
- Vérifie qu'un admin ne peut pas se créer un affilié avec des taux abusifs
- Vérifie les validations côté serveur (montants min/max, formats)

---

## DIVISION 6 : BACKEND INTEGRITY (7 agents)

### Agent 6.1 — Chef de Division : Intégrité Backend
Coordonne et valide l'intégrité du backend.

### Agent 6.2 — TypeScript Build
- Lance `npx tsc --noEmit --skipLibCheck` dans `sos/firebase/functions/`
- Lance `npx tsc --noEmit` dans `sos/`
- **ZÉRO nouvelle erreur acceptée** (l'erreur `whatsappGroupClicked` pré-existante est OK)
- Liste toutes les erreurs et leur origine

### Agent 6.3 — Index.ts Exports
- Vérifie `firebase/functions/src/index.ts` :
  - Aucune fonction commentée ne doit être encore importée
  - Les fonctions consolidées sont exportées (`consolidatedOnCallCompleted`, etc.)
  - Les anciennes fonctions individuelles sont bien commentées
  - Compte le nombre total de fonctions exportées
  - Vérifie que le quota Cloud Run n'est pas dépassé (max 249 par région)

### Agent 6.4 — Imports Morts & Dead Code
- Grep récursif pour :
  - Imports de fichiers/modules supprimés
  - Variables déclarées mais jamais utilisées
  - Fonctions exportées mais jamais importées
  - Fichiers `.ts` orphelins (pas importés nulle part)
- Focus sur les modules modifiés : chatter, influencer, blogger, groupAdmin, unified

### Agent 6.5 — Consolidated Triggers
- Vérifie `triggers/consolidatedOnCallCompleted.ts` :
  - Le feature flag unified/legacy fonctionne-t-il ?
  - Quand unified est actif : SEUL le handler unifié s'exécute (pas de double commission)
  - Quand unified n'est pas actif : TOUS les handlers legacy s'exécutent
  - Les imports dynamiques pointent vers des fichiers existants
- Vérifie `triggers/consolidatedOnUserCreated.ts` (s'il existe)
- Vérifie `triggers/consolidatedOnUserUpdated.ts` (s'il existe)

### Agent 6.6 — Scheduled Functions
- Vérifie que les 8 anciennes scheduled sont bien mortes (commentées partout)
- Vérifie que les 2 consolidées fonctionnent (imports valides vers les services)
- Vérifie les autres scheduled actives (monthlyTop3, rankings, challenges, etc.)
- Aucun scheduled ne doit référencer un fichier supprimé

### Agent 6.7 — Types & Interfaces
- Vérifie la cohérence des types entre frontend et backend :
  - `sos/src/types/chatter.ts` — plus de `getChatterAffiliateLink` ?
  - `sos/src/types/influencer.ts` — `levelThresholds`, `commissionClientAmount` ajoutés ?
  - `sos/src/types/blogger.ts` — plus de `getBloggerAffiliateLink` ?
  - `sos/src/types/groupAdmin.ts` — plus de `getGroupAdminAffiliateLink` ?
  - `firebase/functions/src/unified/types.ts` — `minMonthlyEarnings` ajouté ?
- Vérifie que `CommissionConfig` dans `UnifiedLinkWithEarnings` n'a PAS d'index signature `[key: string]: unknown`

---

## DIVISION 7 : BEST PRACTICES & COMPLÉTUDE (5 agents)

### Agent 7.1 — Chef de Division : Standards 2026
Coordonne et compare avec les meilleures pratiques.

### Agent 7.2 — Comparaison Meilleures Pratiques Affiliation 2026
Compare le système SOS-Expat avec les standards de l'industrie :
- [ ] Multi-level attribution (N1, N2) — implémenté ?
- [ ] Cookie/tracking durée de vie (minimum 30 jours, idéal 90 jours)
- [ ] First-touch vs last-touch attribution — quelle politique ?
- [ ] Commissions récurrentes (lifetime value) — implémenté ?
- [ ] Protection anti-fraude (circular referral, self-referral, volume anormal)
- [ ] Hold period avant paiement (7 jours standard) — implémenté ?
- [ ] Seuil minimum de retrait — implémenté ($30) ?
- [ ] Tableau de bord temps réel pour les affiliés
- [ ] Notifications (email, Telegram) lors de nouvelles commissions
- [ ] Support multi-devises (USD actuellement, prévu ?)
- [ ] Programme de tiers (Bronze/Silver/Gold basé sur performance) — InfluencerLevelCard ?
- [ ] Matériel promotionnel (bannières, widgets, QR codes, textes) — InfluencerPromoTools ?
- [ ] API publique pour intégrations tierces ?
- [ ] RGPD/conformité (consentement, droit à l'oubli, export données)

### Agent 7.3 — Scénarios Edge Cases
Vérifie que le système gère correctement :
- User qui s'inscrit sans referral code (pas de commission, pas d'erreur)
- User qui change de rôle (chatter → influencer) — garde-t-il son code ?
- User suspendu/banni — ses filleuls continuent-ils de générer des commissions ?
- User supprimé — que deviennent ses filleuls et commissions en attente ?
- Appel gratuit (montant 0) — pas de commission créée ?
- Appel remboursé — la commission est-elle annulée ?
- Deux users qui se réfèrent mutuellement (circular)
- User qui s'inscrit, ne fait rien pendant 1 an, puis commence à référer — lockedRates toujours valides ?
- Promo expire mais user a des commissions pending de la période promo — montant correct ?

### Agent 7.4 — Performance & Scalabilité
- Le système peut-il gérer 10 000 affiliés actifs ?
- Les queries Firestore ont-elles des index composites nécessaires ?
- Les Cloud Functions ont-elles assez de mémoire/timeout ?
- Les consolidations réduisent-elles bien les cold starts ?
- Y a-t-il des risques de race condition (2 appels simultanés pour le même affilié) ?

### Agent 7.5 — Manques & Recommandations
Liste tout ce qui :
- Manque dans l'implémentation actuelle
- Devrait être amélioré
- Pose un risque de sécurité
- Pourrait causer des pertes de commissions
- N'est pas conforme aux standards RGPD/eIDAS
Classifie par priorité : P0 (bloquant), P1 (important), P2 (nice-to-have)

---

## AGENT SYNTHÉTISEUR FINAL

Compile les 7 rapports de division en un **verdict final** structuré :

### 1. Score Global (sur 100)
- Code unifié & génération : /15
- Commissions & plans : /20
- Tracking & attribution : /20
- Frontend dashboards : /15
- Console admin : /15
- Backend integrity : /10
- Best practices : /5

### 2. Issues Critiques (P0)
Liste numérotée des problèmes bloquants qui doivent être corrigés AVANT mise en production.

### 3. Issues Importantes (P1)
Liste numérotée des problèmes importants à corriger rapidement.

### 4. Améliorations Suggérées (P2)
Liste numérotée des améliorations recommandées.

### 5. Tableau de Conformité
| Fonctionnalité | Statut | Notes |
|---|---|---|
| 1 code unifié | ✅/❌/⚠️ | |
| Backward compat legacy | ✅/❌/⚠️ | |
| lockedRates à vie | ✅/❌/⚠️ | |
| Modification individuelle admin | ✅/❌/⚠️ | |
| Admin centralisé (1 onglet) | ✅/❌/⚠️ | |
| Tracking sans perte | ✅/❌/⚠️ | |
| Anti-fraude | ✅/❌/⚠️ | |
| Multi-level (N1/N2) | ✅/❌/⚠️ | |
| 0 hardcoded values frontend | ✅/❌/⚠️ | |
| TypeScript build clean | ✅/❌/⚠️ | |

### 6. Plan d'Action
Liste ordonnée des actions à prendre, avec estimation de complexité (S/M/L).

---

## NOTES IMPORTANTES POUR L'IA

1. **Ne te contente pas de lire les fichiers** — trace le flux de données de bout en bout
2. **Compare avec git** — utilise `git diff HEAD~20` ou `git log --oneline -30` pour voir les changements récents
3. **Vérifie les 2 builds** — frontend (`sos/`) ET backend (`sos/firebase/functions/`)
4. **Cherche les oublis** — grep pour `affiliateCodeClient`, `affiliateCodeRecruitment`, `affiliateCodeProvider` dans le frontend : il ne devrait plus y avoir d'affichage de ces 3 codes séparés
5. **Vérifie les traductions** — les clés i18n liées aux anciens liens sont-elles mises à jour ?
6. **Le système unifié a un feature flag** — vérifie son état et son impact
7. **Communique toujours en français**
