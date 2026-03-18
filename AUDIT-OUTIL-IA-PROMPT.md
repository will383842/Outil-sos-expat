# AUDIT COMPLET — Outil IA (ia.sos-expat.com) — GPT-4o / Claude 3.5 / Perplexity

> **Version** : 1.0 — 2026-03-18
> **Objectif** : Audit de bout en bout de l'outil IA pour prestataires — zero bug, reponses fiables, couts maitrises
> **URL** : https://ia.sos-expat.com
> **Projet Firebase** : `outils-sos-expat` (SEPARE de `sos-urgently-ac307`)
> **IMPORTANT** : L'outil IA ne gere PAS les abonnements. C'est SOS-Expat qui gere les abonnements et donne/retire l'acces via `forcedAccess` ou `subscriptionStatus`. L'outil verifie seulement si l'acces est autorise.

---

## TABLE DES MATIERES

1. [Architecture & Stack](#1-architecture--stack)
2. [Hierarchie des 40 Agents](#2-hierarchie-des-40-agents)
3. [Phase 0 — Protection & Snapshot](#phase-0--protection--snapshot)
4. [Phase 1 — Audit SSO & Authentification](#phase-1--audit-sso--authentification)
5. [Phase 2 — Audit AI Providers (GPT/Claude/Perplexity)](#phase-2--audit-ai-providers)
6. [Phase 3 — Audit Hybrid Service & Fallback](#phase-3--audit-hybrid-service--fallback)
7. [Phase 4 — Audit Chat & Conversations](#phase-4--audit-chat--conversations)
8. [Phase 5 — Audit Webhooks SOS → Outil](#phase-5--audit-webhooks-sos--outil)
9. [Phase 6 — Audit System Prompts & Qualite Reponses](#phase-6--audit-system-prompts--qualite-reponses)
10. [Phase 7 — Audit Streaming (SSE)](#phase-7--audit-streaming-sse)
11. [Phase 8 — Audit Content Moderation](#phase-8--audit-content-moderation)
12. [Phase 9 — Audit Rate Limiting & Quotas](#phase-9--audit-rate-limiting--quotas)
13. [Phase 10 — Audit Access Control & Verification Acces](#phase-10--audit-access-control)
14. [Phase 11 — Audit Multi-Dashboard Integration](#phase-11--audit-multi-dashboard-integration)
15. [Phase 12 — Audit Frontend & UX](#phase-12--audit-frontend--ux)
16. [Phase 13 — Audit Couts & Usage IA](#phase-13--audit-couts--usage-ia)
17. [Phase 14 — Audit Securite](#phase-14--audit-securite)
18. [Phase 15 — Audit Monitoring & Observabilite](#phase-15--audit-monitoring--observabilite)
19. [Phase 16 — Audit Multi-Langue (9 langues)](#phase-16--audit-multi-langue)
20. [Phase 17 — Audit Performance & Fiabilite](#phase-17--audit-performance--fiabilite)
21. [Phase 18 — Cross-Checks & Tests E2E](#phase-18--cross-checks--tests-e2e)
22. [Phase 19 — Audit Qualite Reponses IA & Bug "Meme Reponse"](#phase-19--audit-qualite-reponses-ia--bug-meme-reponse-bug-signale)
23. [Phase 20 — Plan d'Action](#phase-20--plan-daction)
24. [Regles Absolues](#regles-absolues)

---

## 1. ARCHITECTURE & STACK

### Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind + Radix UI |
| Backend | Firebase Cloud Functions Node.js 20 |
| Database | Firestore (projet `outils-sos-expat`) |
| Auth | Firebase Auth Custom Token SSO (depuis SOS-Expat) |
| AI | GPT-4o (OpenAI) + Claude 3.5 Sonnet (Anthropic) + Sonar Pro (Perplexity) |
| Cache | Upstash Redis (rate limiting) |
| Monitoring | Sentry (@sentry/react + @sentry/node) |
| PWA | Workbox + vite-plugin-pwa |
| i18n | i18next (9 langues) |
| Region | europe-west1 (Belgique) |
| Hosting | Firebase Hosting → ia.sos-expat.com |

### Flux Principal

```
SOS-Expat (sos-urgently-ac307)
  │
  ├─ Client reserve un appel → createAndScheduleCallFunction
  │   ↓
  │   POST /ingestBooking (API key: SOS_PLATFORM_API_KEY)
  │   ↓
  Outil IA (outils-sos-expat)
  │   ├─ Cree bookings/{id} dans Firestore
  │   ├─ Auto-cree providers/{providerId} si absent
  │   └─ TRIGGER aiOnBookingCreated
  │       ├─ Genere system prompt (avocat OU expat)
  │       ├─ Appelle Hybrid Service (Claude/GPT/Perplexity)
  │       ├─ Sauvegarde la reponse IA comme premier message
  │       └─ Set aiProcessed: true
  │
  ├─ Provider accede a l'outil via SSO
  │   ↓
  │   SOS genere Custom Token → redirect ia.sos-expat.com/auth?token=XXX
  │   ↓
  │   AuthSSO.tsx → signInWithCustomToken → redirect /dashboard
  │   ↓
  │   Provider voit ses conversations + reponse IA pre-generee
  │   ↓
  │   Provider envoie des messages → POST /aiChat ou GET /aiChatStream
  │   ↓
  │   Hybrid Service route vers le bon AI provider
  │   ↓
  │   Reponse + citations + disclaimers
  │
  └─ Appel termine → POST /updateBookingStatus
      → Met a jour le status du booking
```

### Routing AI par Type de Provider

| Type Provider | AI Principal | Fallback 1 | Fallback 2 | Raison |
|--------------|-------------|------------|------------|--------|
| **Avocat** | Claude 3.5 Sonnet | GPT-4o | Perplexity | Meilleur raisonnement legal |
| **Expat** | GPT-4o | Claude 3.5 | Perplexity | Conseils pratiques |
| **Question factuelle** | Perplexity Sonar Pro | GPT-4o | Claude | Recherche web + citations |

### Configuration AI

| Parametre | GPT-4o | Claude 3.5 | Perplexity |
|-----------|--------|------------|------------|
| Modele | gpt-4o | claude-3-5-sonnet-20241022 | sonar-pro |
| Temperature | 0.3 | 0.25 | 0.2 |
| Max Tokens | 4000 | 4000 | 2500 |
| Timeout | 25s | 25s | 25s |
| Retries | 2 | 2 | 2 |
| Circuit Breaker | 3 echecs → 60s pause | idem | idem |

### Collections Firestore

| Collection | Contenu |
|-----------|---------|
| `users/{uid}` | Role, email, subscriptionStatus, forcedAIAccess, linkedProviderIds |
| `providers/{providerId}` | Type, country, aiCallsUsed, aiCallsLimit, subscriptionStatus |
| `bookings/{bookingId}` | Client info, description, status, aiProcessed, providerId |
| `conversations/{convId}` | ProviderId, bookingContext, status, messagesCount, summary |
| `conversations/{convId}/messages/{msgId}` | Role, content, model, provider, citations, moderation |
| `subscriptions/{subId}` | Status, tier, stripeId, aiCallsLimit |
| `settings/ai` | Toggles, model configs, system prompts |
| `auditLogs/{logId}` | Action, resourceId, userId, ip, timestamp |

### Fichiers Cles (40 fichiers)

| # | Fichier | Chemin | Role |
|---|---------|--------|------|
| 1 | index.ts | `functions/src/index.ts` | 30+ exports (callables, triggers, crons) |
| 2 | chat.ts | `functions/src/ai/handlers/chat.ts` | POST /aiChat handler |
| 3 | chatStream.ts | `functions/src/ai/handlers/chatStream.ts` | SSE streaming handler |
| 4 | bookingCreated.ts | `functions/src/ai/handlers/bookingCreated.ts` | Trigger auto-reponse booking |
| 5 | providerMessage.ts | `functions/src/ai/handlers/providerMessage.ts` | Trigger message provider |
| 6 | hybrid.ts | `functions/src/ai/services/hybrid.ts` | Orchestration multi-LLM |
| 7 | retry.ts | `functions/src/ai/services/retry.ts` | Retry + circuit breaker |
| 8 | claude.ts | `functions/src/ai/providers/claude.ts` | Provider Anthropic |
| 9 | openai.ts | `functions/src/ai/providers/openai.ts` | Provider OpenAI |
| 10 | perplexity.ts | `functions/src/ai/providers/perplexity.ts` | Provider Perplexity + web search |
| 11 | config.ts | `functions/src/ai/core/config.ts` | Configuration AI (timeouts, models) |
| 12 | lawyer.ts | `functions/src/ai/prompts/lawyer.ts` | System prompt avocats |
| 13 | expert.ts | `functions/src/ai/prompts/expert.ts` | System prompt expats |
| 14 | ingestBooking.ts | `functions/src/webhooks/ingestBooking.ts` | Webhook SOS → Outil |
| 15 | updateBookingStatus.ts | `functions/src/webhooks/updateBookingStatus.ts` | Webhook status update |
| 16 | rateLimiter.ts | `functions/src/rateLimiter.ts` | Rate limiting Redis |
| 17 | moderation.ts | `functions/src/moderation.ts` | Content moderation OpenAI |
| 18 | security.ts | `functions/src/security.ts` | API key, CORS, sanitization |
| 19 | AuthSSO.tsx | `src/pages/AuthSSO.tsx` | SSO custom token login |
| 20 | AIChat.tsx | `src/components/Chat/AIChat.tsx` | Chat UI component |
| 21 | ChatInput.tsx | `src/components/Chat/ChatInput.tsx` | Input message |
| 22 | ChatMessage.tsx | `src/components/Chat/ChatMessage.tsx` | Message display |
| 23 | GPTChatBox.tsx | `src/components/Chat/GPTChatBox.tsx` | Chat container |
| 24 | ProtectedRoute.tsx | `src/components/guards/ProtectedRoute.tsx` | Auth guard |
| 25 | BlockedScreen.tsx | `src/components/guards/BlockedScreen.tsx` | Access denied UI |
| 26 | firestore.rules | `firestore.rules` | 376 lignes de regles securite |
| 27 | App.tsx | `src/App.tsx` | Routes + error boundary |
| 28 | subscription.ts | `functions/src/subscription.ts` | Sync subscription SOS → Outil |
| 29 | scheduled.ts | `functions/src/scheduled.ts` | Crons (cleanup, quota reset) |
| 30 | multiDashboard.ts | `functions/src/multiDashboard.ts` | Integration multi-prestataire |

---

## 2. HIERARCHIE DES 40 AGENTS

### Niveau 0 (1)
| # | Agent | Role |
|---|-------|------|
| E0 | **Orchestrateur Outil IA** | Coordonne 8 directeurs, synthese finale |

### Niveau 1 — Directeurs (8)
| # | Agent | Domaine | Agents |
|---|-------|---------|--------|
| E1 | **Directeur Auth & SSO** | Custom token, session, acces | E9-E12 |
| E2 | **Directeur AI Providers** | GPT, Claude, Perplexity, hybrid, retry | E13-E18 |
| E3 | **Directeur Chat & Conversations** | Chat handler, streaming, historique | E19-E23 |
| E4 | **Directeur Webhooks & Sync** | ingestBooking, updateStatus, sync provider | E24-E27 |
| E5 | **Directeur Securite & Moderation** | Rate limit, content moderation, CORS, XSS | E28-E31 |
| E6 | **Directeur Frontend & UX** | React, i18n, PWA, responsive | E32-E35 |
| E7 | **Directeur Couts & Performance** | Tokens, latence, quotas, circuit breaker | E36-E39 |
| E8 | **Directeur Multi-Dashboard** | SSO multi-prestataire, conversations croisees | E40-E42 |

### Niveau 2 — Agents (34)

#### Sous E1 : Auth & SSO (4)
| # | Mission |
|---|---------|
| E9 | **Audit SSO Custom Token** : Verifier le flow complet SOS → generateOutilToken → redirect → signInWithCustomToken → claims (role, providerType, subscriptionStatus, forcedAccess). Le token expire-t-il apres 1h ? L'URL est-elle nettoyee apres auth ? |
| E10 | **Audit Firestore Rules** : Lire les 376 lignes de firestore.rules. Verifier que : un provider ne peut PAS lire les bookings d'un autre, un user sans subscription ne peut PAS acceder aux conversations, un admin peut tout faire, les champs sensibles sont proteges |
| E11 | **Audit Session Management** : Le token Firebase Auth est-il rafraichi automatiquement ? Que se passe-t-il si le token expire pendant un chat ? Le provider est-il deconnecte ? Error handling ? |
| E12 | **Audit Verification Acces** : L'outil verifie-t-il TOUJOURS que le provider a acces (forcedAccess OU subscriptionStatus=active) AVANT chaque appel AI ? Pas seulement au login mais A CHAQUE requete ? |

#### Sous E2 : AI Providers (6)
| # | Mission |
|---|---------|
| E13 | **Audit OpenAI (GPT-4o)** : Verifier openai.ts — API key valide ? Modele gpt-4o correct ? Temperature 0.3 ? Max tokens 4000 ? Timeout 25s ? Error handling (rate limit 429, timeout, 500) ? Format messages correct ? |
| E14 | **Audit Anthropic (Claude)** : Verifier claude.ts — API key sk-ant-* ? Modele claude-3-5-sonnet-20241022 ? System prompt SEPARE du messages array ? API version 2023-06-01 ? Temperature 0.25 ? |
| E15 | **Audit Perplexity** : Verifier perplexity.ts — API key pplx-* ? Modele sonar-pro ? return_citations: true ? isFactualQuestion() detecte-t-il correctement les questions factuelles vs conversationnelles ? Domain filtering ? |
| E16 | **Audit Hybrid Service** : Verifier hybrid.ts — Routing correct (avocat→Claude, expat→GPT, factuel→Perplexity) ? Fallback chain fonctionne ? Source confidence scoring (officiel/non-officiel) ? Disclaimers ajoutes ? |
| E17 | **Audit Retry & Circuit Breaker** : Verifier retry.ts — Exponential backoff (500ms → 750ms → 1125ms) ? Jitter ±10% ? Circuit breaker (3 echecs → OPEN 60s → HALF_OPEN) ? Recovery automatique ? |
| E18 | **Audit Provider Health** : Les 3 providers repondent-ils actuellement ? Tester chaque avec un prompt simple. Mesurer le temps de reponse. Verifier les soldes/credits API |

#### Sous E3 : Chat & Conversations (5)
| # | Mission |
|---|---------|
| E19 | **Audit aiChat Handler** : Verifier chat.ts — Auth (Bearer OU API key) ? Rate limit ? Subscription check ? Create/load conversation ? Save user message ? Call AI ? Moderate output ? Save response ? Increment quota ? |
| E20 | **Audit Streaming SSE** : Verifier chatStream.ts — Events (start, chunk, progress, done, warning, error) ? Le streaming fonctionne-t-il reellement en prod ? Les chunks arrivent-ils progressivement ? Timeout SSE ? |
| E21 | **Audit Historique Conversations** : Verifier — Les 100 derniers messages sont-ils gardes ? Les 3 premiers (contexte booking) sont-ils toujours preserves ? Le summary automatique a 80+ messages fonctionne-t-il ? |
| E22 | **Audit Auto-Reponse Booking** : Verifier bookingCreated.ts — Le trigger onCreate fire-t-il ? La reponse IA est-elle generee ? aiProcessed est-il mis a true ? Le provider voit-il la reponse pre-generee quand il ouvre l'outil ? |
| E23 | **Audit Conversation Archiving** : Les vieilles conversations sont-elles archivees ? Le cron cleanupOldConversations fonctionne-t-il ? Les donnees sont-elles conservees assez longtemps ? |

#### Sous E4 : Webhooks & Sync (4)
| # | Mission |
|---|---------|
| E24 | **Audit ingestBooking** : Verifier — API key verification ? CORS whitelist ? Rate limit (100/min) ? Zod validation ? Subscription check ? Auto-create provider ? Booking doc cree ? Audit log ? Timing (processingTimeMs) ? |
| E25 | **Audit updateBookingStatus** : Verifier — Memes securites que ingestBooking ? Status valides (pending/in_progress/completed/cancelled) ? Fields mis a jour (completedAt, callDuration, cancelReason) ? |
| E26 | **Audit syncProvider** : Verifier — SOS-Expat envoie-t-il les mises a jour provider (nom, email, type, pays, status) ? L'outil les recoit-il ? La sync est-elle bidirectionnelle ou unidirectionnelle ? |
| E27 | **Audit Sync Subscription** : Verifier subscription.ts — Comment SOS-Expat communique-t-il le statut d'abonnement a l'outil ? Webhook ? Direct Firestore read via service account ? Le champ subscriptionStatus est-il toujours a jour ? |

#### Sous E5 : Securite & Moderation (4)
| # | Mission |
|---|---------|
| E28 | **Audit Rate Limiting** : Verifier rateLimiter.ts — Token bucket per IP/user ? Redis Upstash ? Limites : webhook 100/min, chat 30/min ? Headers X-RateLimit-* retournes ? |
| E29 | **Audit Content Moderation** : Verifier moderation.ts — Input modere AVANT envoi a l'IA ? Output modere APRES reponse IA ? OpenAI Moderation API ? Categories (violence, hate, self-harm, sexual) ? Warning affiche si flagge ? |
| E30 | **Audit Securite API** : Verifier security.ts — API key verification ? CORS whitelist (sos-expat.com, ia.sos-expat.com, multi.sos-expat.com) ? Content-Type validation ? Payload size limit (10MB) ? XSS sanitization ? Prompt injection prevention ? |
| E31 | **Audit Firestore Security Rules** : 376 lignes — Tester : un provider peut-il lire les bookings d'un autre ? Un non-subscriber peut-il acceder au chat ? Un user peut-il modifier son role ? Catch-all = deny ? |

#### Sous E6 : Frontend & UX (4)
| # | Mission |
|---|---------|
| E32 | **Audit Chat UI** : Verifier AIChat.tsx, ChatInput.tsx, ChatMessage.tsx — Le chat fonctionne-t-il ? Les messages s'affichent-ils correctement ? Le streaming (chunks) est-il fluide ? Les citations sont-elles cliquables ? Les disclaimers sont-ils visibles ? |
| E33 | **Audit PWA** : L'outil est-il installable sur mobile ? Fonctionne-t-il offline (au moins la navigation) ? Le service worker cache-t-il correctement ? |
| E34 | **Audit Responsive** : L'outil fonctionne-t-il sur mobile ? Tablette ? Desktop ? Le chat est-il utilisable sur petit ecran ? BottomNavigation fonctionne-t-elle ? |
| E35 | **Audit i18n (9 langues)** : Les traductions sont-elles completes pour FR, EN, ES, DE, PT, RU, HI, AR, ZH ? Pas de cles manquantes ? L'arabe (RTL) s'affiche-t-il correctement ? |

#### Sous E7 : Couts & Performance (4)
| # | Mission |
|---|---------|
| E36 | **Audit Couts API IA** : Calculer le cout mensuel estime : (a) GPT-4o : $2.50/1M input + $10/1M output, (b) Claude : $3/1M input + $15/1M output, (c) Perplexity : $3/1M input + $15/1M output. Combien de requetes/jour ? Cout total ? Budget respecte ? |
| E37 | **Audit Quotas Provider** : Verifier — aiCallsUsed vs aiCallsLimit ? Le cron monthlyQuotaReset fonctionne-t-il ? Un provider sans quota restant est-il bloque ? Le message d'erreur est-il clair ? |
| E38 | **Audit Latence** : Mesurer le temps de reponse pour 10 requetes : (a) GPT-4o moyen ? (b) Claude moyen ? (c) Perplexity moyen ? Objectif < 5s pour 95%. Si > 10s → probleme |
| E39 | **Audit Circuit Breaker** : Tester — Si un provider est down, le fallback prend-il le relais en < 2s ? Le circuit se referme-t-il apres 60s ? Le HALF_OPEN teste-t-il correctement la recovery ? |

#### Sous E8 : Multi-Dashboard (3)
| # | Mission |
|---|---------|
| E40 | **Audit SSO Multi-Dashboard** : Verifier generateMultiDashboardOutilToken — Session token (mds_*) OU Firebase ID token ? Claims corrects (multiDashboardAccess, providerType) ? Le token genere fonctionne-t-il sur ia.sos-expat.com/auth ? |
| E41 | **Audit Data Multi-Dashboard** : Verifier getMultiDashboardData — Retourne-t-il les bons bookings pour le provider ? Les conversations sont-elles accessibles ? Le provider peut-il voir les bookings d'un AUTRE provider ? (doit etre NON) |
| E42 | **Audit AI via Multi-Dashboard** : Verifier generateMultiDashboardAiResponse + sendMultiDashboardMessage — Le message est-il envoye ? La reponse IA est-elle generee ? Le provider voit-il la conversation en temps reel ? |

---

## PHASE SUPPLEMENTAIRE — Fichiers NON Couverts dans les Phases Principales

> **Ces fichiers existent mais ne sont pas specifiquement audites dans les phases ci-dessus. L'audit doit les couvrir aussi.**

### Backend — Services Cache & Redis (5 fichiers)
| Fichier | Role | A verifier |
|---------|------|-----------|
| `functions/src/services/cache/RedisClient.ts` | Client Redis Upstash | Connexion fonctionne ? Timeout ? Fallback si Redis down ? |
| `functions/src/services/cache/CacheService.ts` | Cache generique | TTL correct ? Invalidation ? |
| `functions/src/services/cache/QuotaService.ts` | Gestion quotas AI par provider | Incrementation atomique ? monthlyReset ? |
| `functions/src/services/cache/RateLimiterService.ts` | Rate limiter avance | Token bucket ? Per-IP et per-user ? |
| `functions/src/services/cache/index.ts` | Exports | Tous les services exportes ? |

### Backend — Services Monitoring (7 fichiers)
| Fichier | Role | A verifier |
|---------|------|-----------|
| `functions/src/services/monitoring/AlertingService.ts` | Envoi alertes (email, Telegram ?) | Alertes envoyees en cas d'erreur AI ? |
| `functions/src/services/monitoring/AnalyticsService.ts` | Tracking usage AI | Tokens comptes ? Couts calcules ? |
| `functions/src/services/monitoring/ErrorTracker.ts` | Tracking erreurs | Sentry integration ? |
| `functions/src/services/monitoring/FirestoreMonitor.ts` | Monitoring lectures/ecritures | Quotas Firestore ? |
| `functions/src/services/monitoring/FunctionMonitor.ts` | Monitoring Cloud Functions | Latence, erreurs, cold starts ? |
| `functions/src/services/monitoring/MetricsService.ts` | Metriques custom | Quelles metriques ? |
| `functions/src/services/monitoring/RedisMonitor.ts` | Monitoring Redis | Connexion, latence, hits/misses ? |

### Backend — AI Core & Utils
| Fichier | Role | A verifier |
|---------|------|-----------|
| `functions/src/ai/core/types.ts` | Types TypeScript partages | Coherent avec les providers ? |
| `functions/src/ai/providers/base.ts` | Classe abstraite BaseLLMProvider | Interface correcte ? Methodes requises ? |
| `functions/src/ai/prompts/templates.ts` | Templates de prompts additionnels | Quels templates ? Utilises ou pas ? |
| `functions/src/ai/handlers/shared.ts` | Utilitaires partages handlers | Auth verification ? Logging ? |
| `functions/src/ai/services/utils.ts` | Utilitaires AI | Token counting ? Cost estimation ? |

### Backend — Sync & Data
| Fichier | Role | A verifier |
|---------|------|-----------|
| `functions/src/syncProvidersToSos.ts` | Sync INVERSE Outil → SOS-Expat | Que sync-t-il ? Quand ? Fonctionne ? |
| `functions/src/data/countries.ts` | Donnees 197 pays | Complet ? Utilise pour quoi ? |
| `functions/src/validation.ts` | Schemas Zod | Tous les schemas valident correctement ? |
| `functions/src/auth.ts` | Auth helpers | Token verification ? Custom claims ? |
| `functions/src/sentry.ts` | Config Sentry backend | DSN correct ? Sampling rate ? |
| `functions/src/backfill.ts` | Migration/backfill donnees | A ete execute ? Idempotent ? |
| `functions/src/monitoring.ts` | Module monitoring principal | Que monitore-t-il ? Alertes ? |

### Frontend — Hooks Critiques
| Fichier | Role | A verifier |
|---------|------|-----------|
| `src/hooks/useStreamingChat.ts` | Hook SSE pour chat streaming | EventSource correct ? Reconnection auto ? Error handling ? Memory leaks ? |
| `src/hooks/useProvider.ts` | Context provider courant | Multi-provider switch ? Donnees a jour ? |
| `src/hooks/useUnreadMessages.ts` | Notifications messages non lus | Listener Firestore ? Performance ? |
| `src/hooks/useCountryConfig.ts` | Config par pays (197) | Donnees completes ? |
| `src/hooks/useAuthUser.ts` | User auth state | Token refresh ? Claims ? |
| `src/hooks/useFirestoreQuery.ts` | Wrapper TanStack Query + Firestore | Cache ? Invalidation ? |

### Frontend — Panel Admin (10+ pages)
| Fichier | Role | A verifier |
|---------|------|-----------|
| `src/admin/pages/AIConfig.tsx` | Configuration IA (admin) | Peut-on modifier les modeles, temperature, prompts ? |
| `src/admin/pages/Analytics.tsx` | Dashboard analytics | Donnees d'usage AI ? Couts ? |
| `src/admin/pages/AuditLogs.tsx` | Logs d'audit | Consultables ? Filtres ? |
| `src/admin/pages/Dossiers.tsx` | Liste des bookings | Filtres, recherche, pagination ? |
| `src/admin/pages/DossierDetail.tsx` | Detail booking + conversation | Conversation visible ? Messages moderes ? |
| `src/admin/pages/Prestataires.tsx` | Liste providers | Status, quotas, acces AI ? |
| `src/admin/pages/TelegramConfig.tsx` | Config Telegram | Alertes configurees ? |
| `src/admin/pages/MultiPrestataires.tsx` | Gestion multi-prestataires | Linking, switching ? |
| `src/admin/sections/AISettings.tsx` | Settings AI inline | Temperature, model, toggles ? |

### Frontend — Services & Lib
| Fichier | Role | A verifier |
|---------|------|-----------|
| `src/services/functionsClient.ts` | Client API pour appeler Cloud Functions | URL correcte ? Region ? Error handling ? |
| `src/lib/firebase.ts` | Config Firebase Outil (outils-sos-expat) | API keys correctes ? Projet correct ? |
| `src/lib/aiSettingsService.ts` | Lecture/ecriture settings AI | Sync avec Firestore ? |
| `src/lib/sentry.ts` | Sentry frontend | DSN, sampling, replays ? |
| `src/components/ProviderSwitcher.tsx` | Switch entre providers (multi-provider) | Fonctionne ? Met a jour le contexte ? |

---

## PHASE 0 — Protection & Snapshot

- [ ] Sauvegarder les fichiers cles (hybrid.ts, chat.ts, config.ts, security.ts)
- [ ] Git branch `audit/outil-ia`
- [ ] Compter en Firestore : bookings, conversations, providers, messages
- [ ] Verifier les soldes API : OpenAI, Anthropic, Perplexity
- [ ] Tester le health endpoint : GET /health → version 5.1.0 ?
- [ ] NE JAMAIS modifier les system prompts sans validation par un humain
- [ ] NE JAMAIS modifier les credentials API sans backup
- [ ] NE JAMAIS desactiver la content moderation

---

## PHASES 1-17 : Les agents executent les missions detaillees dans la section 2.

> Chaque agent produit un rapport : ✅ OK, ❌ Bug, ⚠️ Warning

---

## PHASE 18 — Cross-Checks & Tests E2E

### Cross-Check 1 : Booking SOS → Outil → AI Response
```
1. Creer un booking test via SOS-Expat (ou curl POST /ingestBooking)
2. Verifier que le booking apparait dans Firestore Outil
3. Verifier que aiOnBookingCreated fire
4. Verifier qu'une conversation est creee avec un premier message IA
5. Verifier que le provider voit la conversation dans l'outil
```

### Cross-Check 2 : Chat Request → AI → Response → Save
```
1. Envoyer un message chat (POST /aiChat)
2. Verifier que le message user est sauve dans Firestore
3. Verifier que l'AI repond (model + provider dans la reponse)
4. Verifier que la reponse AI est sauvee dans Firestore
5. Verifier que aiCallsUsed est incremente
```

### Cross-Check 3 : Avocat → Claude, Expat → GPT
```
Pour 5 bookings avocat :
  Verifier que le provider dans la reponse = "claude"
Pour 5 bookings expat :
  Verifier que le provider dans la reponse = "gpt"
Si incoherent → bug dans le routing hybrid.ts
```

### Cross-Check 4 : Fallback Chain
```
1. Simuler un echec Claude (mauvaise API key temporaire)
2. Envoyer un message pour un avocat
3. Verifier que le fallback GPT-4o est utilise (fallbackUsed: true)
4. Restaurer la bonne API key
```

### Cross-Check 5 : Quota Enforcement
```
1. Trouver un provider avec aiCallsLimit = 10
2. Envoyer 10 messages
3. Le 11eme doit etre rejete avec erreur quota
4. Verifier que le message d'erreur est clair et traduit
```

### Cross-Check 6 : SSO End-to-End
```
1. Depuis SOS-Expat, cliquer "Outil IA" pour un provider
2. generateOutilToken est appele
3. Redirect vers ia.sos-expat.com/auth?token=XXX
4. AuthSSO.tsx recoit le token, signInWithCustomToken
5. Le provider est connecte avec le bon role et le bon providerType
6. L'URL est nettoyee (token supprime)
7. Le provider accede a /dashboard
```

### Cross-Check 7 : Content Moderation
```
1. Envoyer un message violent/haineux via /aiChat
2. Verifier que le message est flagge AVANT envoi a l'IA (input moderation)
3. Verifier la reponse de l'IA : est-elle moderee ? (output moderation)
4. Verifier que la conversation est marquee hasFlaggedContent: true
```

### Cross-Check 8 : Subscription Check
```
1. Trouver un provider avec subscriptionStatus: 'inactive' et forcedAccess: false
2. Tenter un /aiChat → doit retourner 403
3. Mettre forcedAccess: true → /aiChat fonctionne
4. Remettre forcedAccess: false, mettre subscriptionStatus: 'active' → /aiChat fonctionne
```

### Cross-Check 9 : Perplexity Web Search
```
1. Envoyer une question factuelle : "Quelles sont les conditions de visa pour la Thailande en 2026 ?"
2. Verifier que searchPerformed: true
3. Verifier que citations[] contient des URLs valides
4. Verifier le source confidence scoring (officiel/non-officiel)
5. Envoyer "Bonjour, comment allez-vous ?"
6. Verifier que searchPerformed: false (isFactualQuestion rejette)
```

### Cross-Check 10 : Couts vs Usage
```
Pour les 30 derniers jours :
  1. Compter les messages dans Firestore (par provider: gpt/claude/perplexity)
  2. Estimer les tokens (messages × ~500 tokens moyen)
  3. Calculer le cout estime
  4. Comparer avec la facture OpenAI/Anthropic/Perplexity
  5. Ecart < 20% → OK, Ecart > 50% → investigation
```

### Cross-Check 11 : Multi-langue Reponses
```
Pour 3 providers (FR, EN, ES) :
  1. Envoyer le meme message dans chaque langue
  2. Verifier que la reponse IA est dans la MEME langue que la question
  3. Verifier que les disclaimers sont traduits
  4. Verifier que les citations sont pertinentes pour le pays
```

### Cross-Check 12 : updateBookingStatus
```
1. Creer un booking test
2. POST /updateBookingStatus avec status: "completed", duration: 300
3. Verifier que le booking Firestore est mis a jour
4. Verifier completedAt, callDuration
5. La conversation reste accessible apres completion ?
```

### Cross-Check 13 : Redis Health
```
1. Tester la connexion Upstash Redis (RedisClient.ts)
2. Si Redis down → le rate limiter fonctionne-t-il en fallback (in-memory) ?
3. Le QuotaService fonctionne-t-il sans Redis ?
4. Mesurer la latence Redis (objectif < 5ms)
```

### Cross-Check 14 : Monitoring Services
```
Pour chaque service monitoring (7 fichiers) :
  1. Le service est-il initialise au demarrage ?
  2. Collecte-t-il des metriques ?
  3. Les alertes sont-elles envoyees (email, Telegram) ?
  4. Les metriques sont-elles consultables dans le panel admin (Analytics.tsx) ?
```

### Cross-Check 15 : Admin Panel Fonctionnel
```
1. Se connecter en tant qu'admin sur ia.sos-expat.com/admin
2. Verifier chaque page admin :
   a. Dashboard → stats affichees (bookings, conversations, AI calls) ?
   b. AIConfig → peut modifier temperature, model, toggles ?
   c. Analytics → graphiques d'usage AI, couts ?
   d. AuditLogs → logs consultables, filtrables ?
   e. Dossiers → bookings listees, detail accessible ?
   f. Prestataires → providers avec quotas, status ?
   g. TelegramConfig → configuration des alertes ?
3. Les modifications admin sont-elles appliquees immediatement ?
```

### Cross-Check 16 : Provider Switcher (Multi-Provider)
```
Pour un account owner avec 3 linked providers :
  1. SSO vers l'outil IA
  2. ProviderSwitcher affiche les 3 providers ?
  3. Switcher vers provider #2 → les bookings changent ?
  4. Les conversations du provider #2 s'affichent ?
  5. L'AI utilise le bon providerType (lawyer/expat) du provider switche ?
```

### Cross-Check 17 : Sync Inverse Outil → SOS
```
1. Verifier syncProvidersToSos.ts
2. Quand un provider est modifie dans l'outil → SOS-Expat est-il mis a jour ?
3. Quels champs sont synces ? (nom, email, status ?)
4. La sync est-elle bidirectionnelle ou unidirectionnelle ?
5. Y a-t-il des conflits possibles si les deux systemes modifient en meme temps ?
```

### Cross-Check 18 : Countries Data (197 pays)
```
1. Verifier data/countries.ts : 197 pays ?
2. Le system prompt inclut-il le pays du client pour contextualiser la reponse ?
3. Pour un booking en Thailande → l'IA parle-t-elle de la loi thailandaise (pas francaise) ?
4. Pour un booking au Senegal → les references sont-elles africaines ?
5. useCountryConfig.ts → les configs par pays sont-elles utilisees dans l'UI ?
```

### Cross-Check 19 : Error Recovery Complet
```
Tester chaque scenario d'erreur :
  1. API key OpenAI invalide → fallback Claude fonctionne ?
  2. API key Anthropic invalide → fallback GPT fonctionne ?
  3. Les 3 API keys invalides → message d'erreur clair a l'utilisateur ?
  4. Redis down → rate limiter en fallback in-memory ?
  5. Firestore down → l'outil affiche-t-il une page d'erreur propre ?
  6. Timeout AI (>25s) → retry automatique ? Message "veuillez patienter" ?
  7. Moderation flagge un message → le provider voit-il un warning clair ?
```

### Cross-Check 20 : Streaming Chat E2E
```
1. Ouvrir une conversation dans l'outil
2. Envoyer un message
3. Verifier dans Network tab : EventSource SSE connecte ?
4. Les chunks arrivent-ils progressivement ? (pas tout d'un coup)
5. Le texte s'affiche-t-il en temps reel dans le ChatMessage ?
6. Les events progress s'affichent-ils (initializing → analyzing → generating) ?
7. L'event done termine-t-il le streaming proprement ?
8. Si erreur pendant le stream → l'event error est-il envoye ? Le UI l'affiche ?
9. useStreamingChat.ts : gere-t-il la reconnection ? Memory leaks ? Cleanup ?
```

### Test E2E Complet — Scenario Avocat
```
1. SOS-Expat : client reserve un appel avec un avocat en Thailande
2. SOS-Expat : POST /ingestBooking → Outil recoit le booking
3. Outil : aiOnBookingCreated → Claude genere une analyse legale
4. VERIFIER : booking en Firestore, conversation creee, premier message AI present
5. VERIFIER : provider notifications (unread messages)
6. Provider : ouvre ia.sos-expat.com via SSO
7. VERIFIER : AuthSSO recoit token, signInWithCustomToken, redirect /dashboard
8. Provider : voit la conversation avec l'analyse pre-generee
9. VERIFIER : le message AI mentionne la Thailande (pas un pays generique)
10. Provider : pose une question factuelle ("Quels sont les documents pour un visa retirement?")
11. VERIFIER : Perplexity fait une recherche web (searchPerformed: true)
12. VERIFIER : citations officielles presentes (URLs .go.th ou .mfa.go.th)
13. VERIFIER : source confidence = high (site officiel detecte)
14. Provider : demande un avis legal ("Mon client risque-t-il une expulsion?")
15. VERIFIER : Claude repond (provider: "claude") avec raisonnement legal
16. VERIFIER : disclaimer legal present dans la reponse
17. Provider : envoie 30 messages supplementaires
18. VERIFIER : l'historique garde les 3 premiers + les 27 derniers
19. VERIFIER : aiCallsUsed incremente de ~30
20. SOS-Expat : appel termine → POST /updateBookingStatus (completed, duration: 1200)
21. VERIFIER : booking status = completed, callDuration = 1200
22. Provider : la conversation reste accessible apres completion
```

### Test E2E Complet — Scenario Expat
```
1. SOS-Expat : client reserve avec un expert expat au Senegal
2. POST /ingestBooking → Outil recoit
3. aiOnBookingCreated → GPT-4o genere des conseils pratiques (PAS Claude)
4. VERIFIER : provider dans la reponse = "gpt" (pas "claude")
5. VERIFIER : le message mentionne le Senegal
6. Provider : pose une question ("Comment ouvrir un compte bancaire au Senegal?")
7. VERIFIER : GPT-4o repond avec des etapes pratiques
8. Provider : pose une question factuelle ("Quel est le salaire minimum au Senegal en 2026?")
9. VERIFIER : Perplexity prend le relais (searchPerformed: true)
10. VERIFIER : citations web presentes
```

### Test E2E — Scenario Erreur / Edge Cases
```
1. Provider sans acces (subscriptionStatus: inactive, forcedAccess: false)
   → POST /aiChat doit retourner 403
   → L'UI affiche BlockedScreen.tsx
2. Provider depasse son quota (aiCallsUsed >= aiCallsLimit)
   → POST /aiChat doit retourner 429 ou erreur quota
   → Message clair dans l'UI
3. Message violent envoye par le provider
   → Content moderation flagge l'input
   → L'AI ne recoit PAS le message violent
   → Warning affiche dans le chat
4. Tous les AI providers down
   → Circuit breakers OPEN pour les 3
   → Message d'erreur clair : "Service IA temporairement indisponible"
5. SSO avec token expire (>1h)
   → signInWithCustomToken echoue
   → Redirect vers SOS-Expat pour re-generer
```

---

## PHASE 19 — Audit Qualite Reponses IA & Bug "Meme Reponse" (BUG SIGNALE)

> **BUG SIGNALE PAR L'UTILISATEUR** : L'outil IA semble ne pas repondre directement aux nouvelles interactions du prestataire. Il regenere toujours la meme reponse (ou similaire) que celle initialement faite lors de la creation du booking.

### 19A — Investigation du Bug "Meme Reponse"

**2 chemins coexistent pour generer une reponse IA :**

```
CHEMIN 1 : aiChat (POST /aiChat) — appele par le frontend quand le provider tape un message
  → Charge l'historique (buildConversationHistory)
  → Ajoute le message du provider a l'historique
  → Appelle service.chat(history, providerType, context)
  → L'IA recoit TOUT l'historique + le nouveau message → reponse contextuelle ✅

CHEMIN 2 : aiOnProviderMessage (trigger Firestore) — se declenche quand un message est cree
  → Detecte un nouveau doc dans conversations/{convId}/messages/{msgId}
  → Si role === "user" et pas "processed" → genere une reponse IA

PROBLEME POTENTIEL : DOUBLE REPONSE
  Quand le provider envoie un message :
    1. Le frontend appelle POST /aiChat
    2. aiChat sauve le message dans Firestore (conversations/{convId}/messages/{newId})
    3. aiChat appelle l'IA → genere la reponse → la sauve
    4. MAIS : la creation du message en etape 2 DECLENCHE aiOnProviderMessage
    5. aiOnProviderMessage detecte le message "user" non-processed
    6. aiOnProviderMessage genere UNE DEUXIEME reponse (potentiellement similaire a la premiere auto-generee)

  RESULTAT :
    - Le provider recoit 2 reponses au lieu de 1
    - La deuxieme reponse (du trigger) peut sembler "repetitive" car elle n'a pas le meme contexte
    - OU : la reponse du trigger ecrase la reponse de aiChat
```

**VERIFICATIONS IMMEDIATES :**
- [ ] Quand un provider envoie un message, combien de reponses AI apparaissent ? (1 ou 2 ?)
- [ ] Le trigger `aiOnProviderMessage` fire-t-il AUSSI quand `aiChat` sauve un message ?
- [ ] Le champ `source` du message sauve par aiChat est-il "user" ? → Si oui, le trigger le traite
- [ ] Le champ `processed` est-il mis a `true` AVANT que le trigger ne fire ?
- [ ] Y a-t-il un mecanisme de deduplication entre aiChat et aiOnProviderMessage ?

**SOLUTIONS POSSIBLES :**
```
OPTION A : aiChat marque le message comme source="provider_via_api" (pas "user")
  → Le trigger ignore les messages source !== "user"
  → Seul aiChat genere la reponse

OPTION B : aiChat met processed=true sur le message sauve
  → Le trigger voit processed=true → skip

OPTION C : Desactiver aiOnProviderMessage (replyOnUserMessage=false dans settings)
  → Seul aiChat gere les reponses
  → Le trigger ne sert qu'aux messages crees depuis d'autres sources (webhook, admin)

OPTION D : Le trigger verifie si une reponse AI existe deja pour ce message (dedup)
  → Avant de generer, cherche un message "assistant" avec createdAt > user message
  → Si existe → skip
```

- [ ] Verifier dans les settings AI : `replyOnUserMessage` est-il `true` ? → Si oui, le trigger est actif
- [ ] Verifier les logs Cloud Functions : aiOnProviderMessage fire-t-il apres chaque aiChat ?
- [ ] **FIX RECOMMANDE** : Option B ou C (le plus simple et le plus sur)

### 19B — Audit Qualite des Reponses IA Initiales (Booking Created)

**La premiere reponse IA generee par `aiOnBookingCreated` doit etre de HAUTE QUALITE.**

Pour 10 bookings reels, verifier :
- [ ] La reponse mentionne-t-elle le NOM du client ? (personnalisation)
- [ ] La reponse mentionne-t-elle le PAYS du client ? (contextualisation juridique/pratique)
- [ ] La reponse mentionne-t-elle le SUJET de la demande ? (titre + description du booking)
- [ ] Pour un avocat : la reponse contient-elle un raisonnement juridique structure ?
- [ ] Pour un avocat : un disclaimer legal est-il present ?
- [ ] Pour un expat : la reponse contient-elle des etapes pratiques ?
- [ ] La reponse est-elle dans la bonne LANGUE ? (langue du provider, pas du client)
- [ ] La reponse fait-elle reference a la legislation du BON PAYS ? (pas generique)
- [ ] La reponse est-elle suffisamment longue (>500 mots) et detaillee ?
- [ ] Les citations/sources sont-elles presentes si pertinentes ?

### 19C — Audit Qualite des Reponses Conversationnelles (Chat)

Pour 5 conversations avec 5+ messages, verifier :
- [ ] L'IA se souvient-elle du contexte initial (booking) tout au long de la conversation ?
- [ ] L'IA repond-elle SPECIFIQUEMENT a la question posee (pas une reponse generique) ?
- [ ] L'IA utilise-t-elle les informations des messages precedents ?
- [ ] Si le provider demande des precisions, l'IA approfondit-elle (pas de repetition) ?
- [ ] Si le provider change de sujet, l'IA suit-elle le nouveau sujet ?
- [ ] Les reponses sont-elles de plus en plus precises au fur et a mesure ?
- [ ] Il n'y a PAS de "hallucination" evidente (fausses lois, faux chiffres) ?

### 19D — Audit System Prompts (Qualite & Precision)

**Fichiers** : `functions/src/ai/prompts/lawyer.ts`, `expert.ts`

Pour le prompt AVOCAT :
- [ ] Le prompt demande-t-il de citer les lois applicables ?
- [ ] Le prompt specifie-t-il de contextualiser par pays ?
- [ ] Le prompt inclut-il un disclaimer obligatoire ?
- [ ] Le prompt demande-t-il un raisonnement structure (analyse → conclusion → recommandation) ?
- [ ] Le prompt interdit-il les conseils definitifs sans verification (l'IA n'est pas un avocat) ?

Pour le prompt EXPAT :
- [ ] Le prompt demande-t-il des etapes pratiques et actionnables ?
- [ ] Le prompt specifie-t-il de donner des liens/ressources officiels ?
- [ ] Le prompt demande-t-il de contextualiser par pays et nationalite ?
- [ ] Le prompt est-il dans le bon ton (encourageant, pratique, empathique) ?

### 19E — Audit Routing Perplexity (Questions Factuelles)

**Fichier** : `functions/src/ai/providers/perplexity.ts` → `isFactualQuestion()`

- [ ] La detection de questions factuelles fonctionne-t-elle ?
- [ ] "Quelles sont les conditions de visa pour la Thailande ?" → Perplexity ? ✅
- [ ] "Bonjour" → PAS Perplexity ? ✅
- [ ] "Quel est le delai pour obtenir un titre de sejour en France ?" → Perplexity ? ✅
- [ ] "Merci pour votre aide" → PAS Perplexity ? ✅
- [ ] Les citations retournees sont-elles des sites OFFICIELS (.gov, .gouv) ?
- [ ] Le source confidence scoring distingue-t-il les sources officielles des blogs ?

---

## PHASE 20 — Plan d'Action

### Priorisation

| P | Type | Description |
|---|------|-------------|
| P0 | **Acces non verifie** | Si l'outil ne verifie pas la subscription a CHAQUE requete → acces gratuit |
| P0 | **API key expiree** | Si une cle IA expire → tout le systeme tombe |
| P0 | **Circuit breaker bloque** | Si le CB reste OPEN indefiniment → zero reponses IA |
| P1 | **Content moderation bypassee** | Reponses violentes/illegales non filtrees |
| P1 | **Quota non enforce** | Provider depasse son quota → couts imprevus |
| P1 | **SSO token non nettoye** | Token dans l'URL historique → risque securite |
| P2 | **Streaming SSE lent** | UX degradee mais pas bloquante |
| P2 | **Traductions incompletes** | Cles i18n manquantes dans certaines langues |
| P3 | **PWA offline** | Fonctionnel mais pas critique |

---

## REGLES ABSOLUES

1. **JAMAIS modifier un system prompt** sans validation humaine (avocat reel pour le prompt legal)
2. **JAMAIS desactiver** la content moderation (OpenAI Moderation API)
3. **JAMAIS exposer** une API key dans le code ou les logs
4. **JAMAIS permettre** un acces sans verification subscription/forcedAccess
5. **TOUJOURS verifier** que le circuit breaker se referme (pas de blocage permanent)
6. **TOUJOURS logger** les erreurs AI avec le model, provider, et temps de reponse
7. **TOUJOURS respecter** les quotas provider (aiCallsUsed < aiCallsLimit)
8. **JAMAIS envoyer** de donnees personnelles non-sanitisees aux AI providers
9. **TOUJOURS tester** les 3 providers (GPT, Claude, Perplexity) apres chaque deploy
10. **JAMAIS deployer** sans verifier que le health endpoint repond correctement

---

## FICHIERS CLES — REFERENCE RAPIDE

| # | Fichier | Chemin complet (depuis Outil-sos-expat/) |
|---|---------|------------------------------------------|
| 1 | index.ts | `functions/src/index.ts` |
| 2 | chat.ts | `functions/src/ai/handlers/chat.ts` |
| 3 | chatStream.ts | `functions/src/ai/handlers/chatStream.ts` |
| 4 | bookingCreated.ts | `functions/src/ai/handlers/bookingCreated.ts` |
| 5 | hybrid.ts | `functions/src/ai/services/hybrid.ts` |
| 6 | retry.ts | `functions/src/ai/services/retry.ts` |
| 7 | claude.ts | `functions/src/ai/providers/claude.ts` |
| 8 | openai.ts | `functions/src/ai/providers/openai.ts` |
| 9 | perplexity.ts | `functions/src/ai/providers/perplexity.ts` |
| 10 | config.ts | `functions/src/ai/core/config.ts` |
| 11 | lawyer.ts | `functions/src/ai/prompts/lawyer.ts` |
| 12 | expert.ts | `functions/src/ai/prompts/expert.ts` |
| 13 | ingestBooking | `functions/src/webhooks/ingestBooking.ts` |
| 14 | updateBookingStatus | `functions/src/webhooks/updateBookingStatus.ts` |
| 15 | rateLimiter.ts | `functions/src/rateLimiter.ts` |
| 16 | moderation.ts | `functions/src/moderation.ts` |
| 17 | security.ts | `functions/src/security.ts` |
| 18 | subscription.ts | `functions/src/subscription.ts` |
| 19 | multiDashboard.ts | `functions/src/multiDashboard.ts` |
| 20 | scheduled.ts | `functions/src/scheduled.ts` |
| 21 | AuthSSO.tsx | `src/pages/AuthSSO.tsx` |
| 22 | AIChat.tsx | `src/components/Chat/AIChat.tsx` |
| 23 | ChatMessage.tsx | `src/components/Chat/ChatMessage.tsx` |
| 24 | ProtectedRoute.tsx | `src/components/guards/ProtectedRoute.tsx` |
| 25 | BlockedScreen.tsx | `src/components/guards/BlockedScreen.tsx` |
| 26 | firestore.rules | `firestore.rules` |
| 27 | App.tsx | `src/App.tsx` |
| 28 | ConversationHistory | `src/pages/provider/ConversationHistory.tsx` |
| 29 | ConversationDetail | `src/pages/provider/ConversationDetail.tsx` |
| 30 | ProviderHome | `src/pages/provider/ProviderHome.tsx` |
