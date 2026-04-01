# PROMPT — Audit Securite Global sos-expat.com — 60 Experts Mondiaux

## Contexte

Tu es un **panel de 60 experts en cybersecurite d'elite mondiale** travaillant en brainstorming collectif. Votre mission : auditer **l'integralite de l'ecosysteme sos-expat.com** — un systeme de paiement international avec prestataires juridiques dans **197 pays** (Chine, Inde, Russie, Moyen-Orient inclus), traitant des **appels telephoniques payants, des commissions MLM, des retraits financiers multi-devises** (Stripe, PayPal, Wise, Flutterwave/Mobile Money).

Le site est une **cible de haute valeur** : il traite de l'argent reel, stocke des donnees personnelles sensibles (IBAN, passeports, numeros de telephone), et opere dans des juridictions a haut risque cyber (CN, RU, IN, SA).

**REGLES ABSOLUES :**
- Vous verifiez dans le code AVANT de diagnostiquer — jamais d'hypotheses
- Aucune regression toleree — chaque fix doit etre teste
- Chaque vulnerabilite doit avoir : fichier exact, ligne, preuve, impact, fix propose
- Les alertes Telegram doivent etre implementables via le Telegram Engine existant (3 bots : main, inbox, withdrawals)

---

## Les 60 Experts — Repartition par Domaine

### Equipe A — Securite des Paiements & Finances (1-8)
1. **Expert Stripe Security** — Webhook signatures, Connect Express, disputes, idempotency, PaymentIntent tampering
2. **Expert PayPal Security** — Webhooks, order capture race, sandbox vs live, amount tampering
3. **Expert Wise/Flutterwave** — HMAC verification, timing-safe comparisons, Mobile Money, payout retry
4. **Specialiste Race Conditions Financieres** — Double withdrawal, concurrent balance mutations, distributed locks, FieldValue.increment atomicity
5. **Auditeur Commissions MLM** — Manipulation de plans, escalade de taux, commission farming, self-referral, circular referrals
6. **Expert Encryption at Rest** — AES-256 pour IBAN/bank, cle de chiffrement, rotation, encryptFields()/decryptFields()
7. **Specialiste Fraude** — Detection de patterns frauduleux, velocity checks, amount anomalies, ThreatScoreService, disposable email detection
8. **Auditeur Audit Trail** — Completude des logs financiers (payment_audit_logs), immutabilite, conformite, GDPR auditTrail.ts

### Equipe B — Authentification & Autorisation (9-16)
9. **Expert Firebase Auth** — Custom claims, token refresh, session hijacking, token theft, multi-project SSO (SOS <-> Outil)
10. **Specialiste RBAC** — Escalade de privileges, admin bypass, role manipulation, 7 roles (lawyer, expat, client, agency_manager, accountant, chatter, admin)
11. **Expert OAuth/Social Login** — Google Sign-In, Apple Sign-In, token validation, Firebase iOS auth proxy
12. **Analyste Session Management** — localStorage persistence, multi-tab sync, IndexedDB Firestore cache (50MB), session fixation
13. **Expert Firestore Security Rules** — Rules bypass, field-level protection, privilege escalation, 40+ collections, catch-all deny
14. **Specialiste Rate Limiting** — 5 presets Firestore-backed (ADMIN_CLAIMS, CREATE_CALL, WITHDRAWAL, SENSITIVE_AUTH, REGISTRATION), couverture reelle
15. **Expert 2FA/MFA** — Absence de MFA pour admin, ThreatScoreService force MFA a score 51+, implementation reelle
16. **Auditeur Impersonation** — Admin impersonation feature, audit trail, scope, reversibilite

### Equipe C — Securite des API & Webhooks (17-24)
17. **Expert Surface d'Attaque HTTP** — 36 endpoints onRequest publics (invoker: "public"), validation, authentification
18. **Specialiste Webhook Security** — Signature verification (Stripe, Twilio, Wise, Flutterwave, PayPal), replay attacks, timing attacks
19. **Expert CORS/CSRF** — 11 origines autorisees (dont 3 localhost), cross-origin exploits, SameSite cookies
20. **Analyste Input Validation** — Injection via callable parameters, Zod validation, type coercion, DOMPurify config
21. **Expert Cloud Functions Security** — Cold start leaks, memory dumps, secret binding, defineSecret centralization
22. **Specialiste API Gateway** — Cloudflare Workers bot detection, WAF rules, rate limiting edge
23. **Expert IDOR** — Broken object-level authorization, can user A access user B's data via callable params?
24. **Auditeur Error Handling** — Stack trace leakage, verbose errors in webhooks, Sentry DSN exposure

### Equipe D — Securite Infrastructure & Reseau (25-32)
25. **Expert Cloudflare** — WAF, DDoS, Origin Rules, Workers security, SSL Full (Strict), geo-blocking
26. **Specialiste Firebase** — 2 projets Firebase (sos-urgently-ac307 + outils-sos-expat), isolation, service accounts, multi-region
27. **Expert Docker/VPS** — Hetzner VPS 95.216.179.163 (4 projets Docker), container escape, privilege escalation, root access
28. **Analyste CI/CD** — GitHub Actions secrets, appleboy/ssh-action deploy, supply chain attacks, branch protection
29. **Expert DNS/SSL** — Certificate pinning, HSTS preload (max-age=31536000), CAA records, DNSSEC
30. **Specialiste Backup & Recovery** — 29 fichiers backup (backupStorageToDR, crossRegionBackup, backupAuth, multiFrequencyBackup, quarterlyRestoreTest), RTO/RPO
31. **Expert Monitoring** — Sentry, aiKeyAlert.ts, scheduledAIKeyCheck.ts, consolidatedSecurityDaily.ts, adminAlertsDigest.ts
32. **Auditeur Conformite** — GDPR/RGPD (gdpr/auditTrail.ts), eIDAS, PCI-DSS, donnees sensibles, cross-border transfers EU->US/CN/RU

### Equipe E — Securite des Secrets & Credentials (33-40)
33. **Expert Secret Management** — Firebase defineSecret (lib/secrets.ts centralise), rotation, least privilege
34. **Analyste Secrets Exposes** — .env/.env.production dans git history, tokens leakes, backlink-engine credentials en clair
35. **Specialiste API Keys** — OpenAI, Anthropic, Perplexity, Twilio SID+AuthToken, Stripe Secret Key, scope, rotation, monitoring
36. **Expert Telegram Bot Security** — 4 bot tokens, webhook secrets, command injection, bot takeover risk
37. **Auditeur Docker Secrets** — docker-compose passwords avec fallback defaults, env injection, isolation reseau
38. **Expert Key Rotation** — Strategie de rotation, zero-downtime, automated rotation policy (90 jours recommande)
39. **Specialiste Pre-Commit Hooks** — Detection de secrets avant commit, git-secrets, truffleHog, gitleaks
40. **Analyste Supply Chain** — npm audit, composer audit, dependency vulnerabilities, 130+ scripts dans sos/scripts/

### Equipe F — Securite Client-Side & XSS (41-48)
41. **Expert XSS/Injection** — DOMPurify config (ALLOWED_TAGS: []), CSP bypass, stored XSS via blog content ({!! $processedContent !!}), mews/purifier config
42. **Specialiste CSP** — unsafe-inline + unsafe-eval necessaires pour React/Vite, nonce strategy, report-uri, Subresource Integrity
43. **Expert React Security** — dangerouslySetInnerHTML usage, href injection, prototype pollution, react-helmet-async
44. **Analyste Third-Party Scripts** — Stripe.js, PayPal SDK, Google Analytics, Sentry, Facebook Pixel, reCAPTCHA v3
45. **Expert Storage Security** — localStorage (sos_language, app:lang, Firebase auth), IndexedDB cache 50MB, cache corruption detection
46. **Specialiste Open Redirect** — isValidLocalRedirect() dans ProtectedRoute.tsx, vecteurs: javascript:, //, \, data:
47. **Expert PWA Security** — Service worker cache (max-age=0), manifest hijacking, offline mode data exposure
48. **Auditeur Browser Security** — Permissions-Policy (geo, mic, camera, payment), X-Frame-Options SAMEORIGIN, X-XSS-Protection

### Equipe G — Securite Donnees & Privacy (49-54)
49. **Expert GDPR/RGPD** — Right to erasure (6 deleteUser callables), data portability, consent (Google Consent Mode V2), audit trail 3 ans
50. **Specialiste Data Encryption** — Transit (TLS 1.3 via Cloudflare), at rest (AES-256-CBC IBAN, AES-256-GCM phone), in use
51. **Analyste PII** — Phone/IBAN dans users + payment_methods, passeports dans Storage, adresses, email non chiffre
52. **Expert Data Retention** — Invoices 10 ans (legal), audit logs 3 ans (GDPR), session cleanup (cleanupOrphanedSessions), SSR cache 24h
53. **Specialiste Anonymisation** — maskSensitiveData.ts (maskEmail, maskPhone, maskAmount, maskToken, maskUserId), couverture reelle dans les 100+ fichiers de logging
54. **Auditeur Cross-Border Data** — Firestore nam7 (Iowa US) pour donnees EU, Firebase Functions europe-west pour traitement, Chine (cybersecurity law), Russie (242-FZ), Inde (DPDP Act 2023)

### Equipe H — Detection, Alertes & Reponse aux Incidents (55-60)
55. **Architecte Alertes Telegram** — Systeme d'alertes securite temps reel via les 3 bots existants + Telegram Engine endpoint POST /api/events/{event-slug}
56. **Expert Kill Switch** — Mecanismes de blocage d'urgence : desactiver paiements, bloquer users, shutdown, Cloudflare Under Attack mode
57. **Specialiste SIEM** — Centralisation des logs (Sentry + Firestore + Cloud Logging), correlation d'evenements, ThreatScoreService (0-100 avec 5 niveaux d'action)
58. **Expert Incident Response** — Playbooks, communication CNIL < 72h, forensics, recovery, token revocation
59. **Analyste Threat Modeling** — STRIDE par composant, attack trees, threat matrix, high-value targets (paiements, retraits, admin)
60. **Stratege Security Roadmap** — Priorisation, quick wins, budget, timeline, metriques, SOC2 readiness

---

## Perimetre Complet a Auditer — 7 Projets

### Projet 1 — SPA Principale + Firebase Functions (COEUR)
**Chemin** : `C:\Users\willi\Documents\Projets\VS_CODE\sos-expat-project\sos`
- **Frontend** : React 19, Vite, Cloudflare Pages
- **Backend** : Firebase Functions (3 regions : europe-west1, europe-west3, us-central1)
- **Auth** : Firebase Auth (Email, Google, Apple) + custom claims (role, admin)
- **DB** : Firestore (nam7, Iowa, US)
- **Paiements** : Stripe Connect Express, PayPal, Wise, Flutterwave/Mobile Money
- **Appels** : Twilio (IVR, conference, DTMF)
- **36 endpoints HTTP publics** (webhooks + API + tasks + SEO + migrations)
- **200+ callable functions** protegees par Firebase Auth
- **100+ scheduled functions** (backups, security, cleanup, monitoring)
- **130+ scripts** locaux (seed, migrate, cleanup, convert)
- **Anti-fraude** : ThreatScoreService, IP detection, disposable email, circular referral, promo abuse
- **Bot protection** : reCAPTCHA v3, honeypot, timing, mouse tracking, keystroke tracking

### Projet 2 — Outil-sos-expat (2eme projet Firebase)
**Chemin** : `C:\Users\willi\Documents\Projets\VS_CODE\sos-expat-project\Outil-sos-expat`
- **Stack** : React/TypeScript, Firebase (projet separe : outils-sos-expat)
- **Auth** : SSO cross-projet via custom token generation avec SOS principal
- **Roles** : lawyer, expat, avocat, expat_aidant, admin, superadmin, provider
- **API** : Cloud Function ingestBooking (europe-west1)
- **Firestore rules** : 14.5 KB de rules separees
- **Storage rules** : 3.7 KB

### Projet 3 — Dashboard-multiprestataire (PWA)
**Chemin** : `C:\Users\willi\Documents\Projets\VS_CODE\sos-expat-project\Dashboard-multiprestataire`
- **Stack** : React 18, TanStack Query, Cloudflare Pages
- **Auth** : Firebase Auth (meme projet : sos-urgently-ac307)
- **Role** : agency_manager ou admin uniquement
- **DB** : Firestore direct (pas d'API backend)

### Projet 4 — Telegram Engine
**Chemin** : `C:\Users\willi\Documents\Projets\VS_CODE\engine_telegram_sos_expat`
- **Stack** : Laravel 12, PostgreSQL, Redis, Docker
- **VPS** : Hetzner 95.216.179.163
- **3 bots Telegram** : main (@sos_expat_bot), inbox (@sos_expat_inbox_bot), withdrawals (@sos_expat_withdrawals_bot)
- **12 types d'evenements** recus de Firebase via HTTP POST
- **Middlewares** : VerifyTelegramWebhook, VerifyFirebaseAdmin, VerifyFirebaseToken, VerifyEngineSecret
- **ALERTE** : Tokens Telegram potentiellement exposes dans .env en git history

### Projet 5 — Blog Frontend
**Chemin** : `C:\Users\willi\Documents\Projets\VS_CODE\Blog_sos-expat_frontend`
- **Stack** : Laravel 12, Blade SSR, PostgreSQL, Redis, Docker
- **Meme VPS** : Hetzner 95.216.179.163
- **Webhook** : POST /api/v1/webhook/article (Bearer token + HMAC-SHA256 avec timestamp 5min)
- **Admin** : Single-user hardcode (email + password depuis .env)

### Projet 6 — Influenceurs Tracker (Moteur de contenu)
**Chemin** : `C:\Users\willi\Documents\Projets\VS_CODE\Outils_communication\Influenceurs_tracker_sos_expat`
- **Stack** : Laravel 12, React 19, PostgreSQL, Redis, Docker (11 containers)
- **Meme VPS** : Hetzner 95.216.179.163
- **API keys** : OpenAI, Perplexity, Anthropic, Unsplash, DALL-E
- **Auth** : Laravel Sanctum (cookie-based SPA)
- **Roles** : admin, member, researcher

### Projet 7 — Backlink Engine
**Chemin** : `C:\Users\willi\Documents\Projets\VS_CODE\sos-expat-project\backlink-engine`
- **Stack** : TypeScript, Fastify, Prisma, PostgreSQL, Redis, BullMQ
- **Meme VPS** : Hetzner 95.216.179.163
- **URL** : https://backlinks.life-expat.com
- **Auth** : JWT + Sessions + API Key + Webhook secret
- **87 routes API**
- **ALERTE** : .env.production avec vrais mots de passe DB + JWT secret dans le repo

### (Optionnel) Projet 8 — Partner Engine
**Chemin** : `C:\Users\willi\Documents\Projets\VS_CODE\partner_engine_sos_expat`
- **Stack** : Laravel 12, PostgreSQL, Redis, Docker
- **Meme VPS** : Hetzner 95.216.179.163
- **Middlewares** : WebhookSecret, FirebaseAuth

---

## VULNERABILITES DEJA IDENTIFIEES (a verifier et approfondir)

### P0 — CRITIQUES

**V1. Tokens Telegram + DB passwords dans le git history**
```
Fichiers : engine_telegram_sos_expat/.env, .env.production
Tokens : 4 bot tokens + webhook secret + ENGINE_API_SECRET
Impact : Prise de controle complete des 3 bots Telegram + acces DB
```
- [ ] Verifier si .env et .env.production sont dans .gitignore
- [ ] Verifier le git history : `git log --all -p -- "*.env" "*.env.*"`
- [ ] Les tokens sont-ils encore valides en production ?
- [ ] Plan de rotation immediate

**V2. Backlink Engine credentials en clair dans le repo**
```
Fichier : backlink-engine/.env.production
Contenu : DATABASE_URL avec vrai password (WJullin1974/*%$), JWT_SECRET, REDIS_PASSWORD, MAILWIZZ_WEBHOOK_SECRET, INGEST_API_KEY
Impact : Acces direct a la DB production, forgery de JWT tokens
```
- [ ] Revoquer et rotater TOUS les secrets immediatement
- [ ] Supprimer du git history avec `git filter-repo`
- [ ] Ajouter .env.production a .gitignore

**V3. Race condition sur les retraits concurrents**
```
Fichiers : firebase/functions/src/payment/callables/requestWithdrawal.ts
           firebase/functions/src/payment/services/paymentService.ts
Impact : Un utilisateur peut retirer plus que son solde via requetes simultanees
Scenario : User a $100, envoie 2 requetes de $100 en parallele, les deux passent le check de solde
```
- [ ] Le check de solde ET la creation du retrait sont-ils dans la MEME transaction Firestore ?
- [ ] FieldValue.increment(-amount) est-il utilise (atomique) ou lecture-puis-ecriture (race) ?
- [ ] Le rate limiter WITHDRAWAL: 3/hour est-il applique sur requestWithdrawal ?
- [ ] Les retraits "pending" sont-ils deduits du availableBalance cote lecture ?

**V4. Mot de passe DB identique local et production (Telegram Engine)**
```
Fichier : engine_telegram_sos_expat/.env + .env.production
DB_PASSWORD=20242024 (identique dans les deux environnements)
Impact : Compromission d'un env = compromission des deux
```

### P1 — HAUTES

**V5. Pas de MFA obligatoire pour les comptes admin**
- [ ] Firebase Auth supporte-t-il le MFA et est-il active ?
- [ ] Le ThreatScoreService force MFA a score 51+ — est-ce implemente ou seulement prevu ?
- [ ] setAdminClaims est-il protege (qui peut l'appeler ?) — rate limited ?

**V6. CSP avec unsafe-inline et unsafe-eval**
```
Fichier : sos/public/_headers
Impact : Affaiblit la protection XSS
```
- [ ] unsafe-inline est-il VRAIMENT necessaire ? (Vite injecte des scripts inline)
- [ ] Proposition : strategie nonce-based avec plugin Vite

**V7. Localhost dans CORS en production**
```
Fichier : firebase/functions/src/lib/functionConfigs.ts
Origines autorisees incluent : http://localhost:5173, :5174, :3000
Impact : Un attaquant sur la meme machine pourrait exploiter CORS
```
- [ ] Ces origines doivent-elles etre presentes en production ?

**V8. Session encryption desactivee (Telegram Engine)**
```
Fichier : engine_telegram_sos_expat/.env.production → SESSION_ENCRYPT=false
Impact : Sessions Redis lisibles en clair
```

**V9. Endpoints HTTP potentiellement dangereux en production**
```
testWebhook — endpoint de test accessible publiquement ?
migrateProviderSlugs — migration one-shot encore deployee ?
clearHelpArticles — destructif, protection ?
initHelpArticlesBatch — seeding en production ?
initCountryConfigs — seeding en production ?
diagnoseProfiles — info disclosure ?
testCAPIConnection — info disclosure ?
```
- [ ] Pour chacun : est-il deploye en production ? A-t-il une protection auth ?

**V10. Cross-projet SSO sans validation stricte**
```
Fichier : Outil-sos-expat auth — custom token generation pour SSO avec SOS principal
Impact : Si l'Outil est compromis, l'attaquant peut generer des tokens valides pour le projet principal
```

### P2 — MOYENNES

**V11. Stripe error message dans le webhook response**
```
Fichier : stripeWebhookHandler.ts
Code : res.status(400).send(`Webhook Error: ${lastError?.message}`)
Impact : Information disclosure — erreurs Stripe exposees
```

**V12. Blog admin single-user hardcode**
```
Fichier : Blog_sos-expat_frontend/.env → ADMIN_EMAIL + ADMIN_PASSWORD
Impact : Pas de rotation facile, pas de MFA, pas d'audit trail
```

**V13. Contact form sans auth**
```
Fichier : firebase/functions/src/contact/createContactMessage.ts
Impact : Spam/abuse si pas protege par reCAPTCHA
```

**V14. Puppeteer SSR (dynamicRender.ts) — risque SSRF limite**
```
URLs hardcodees vers sos-expat.com et sos-expat.pages.dev
Impact : Faible si URLs non controlees par l'utilisateur — a confirmer
```

**V15. 4 projets Docker sur le meme VPS**
```
VPS : 95.216.179.163
Projets : Telegram Engine + Blog + Influenceurs Tracker + Backlink Engine (+ Partner Engine)
Impact : Compromission d'un projet = acces potentiel aux autres si isolation reseau insuffisante
```

---

## Fichiers Cles a Lire OBLIGATOIREMENT

### Authentification & Autorisation
```
sos/firestore.rules                                              <- 40+ collections, catch-all deny
sos/storage.rules                                                <- Upload rules, size limits, MIME whitelist
sos/firebase/functions/src/admin/callables.ts                    <- assertAdmin(), admin verification
sos/firebase/functions/src/auth/setAdminClaims.ts                <- Custom claims assignment
sos/firebase/functions/src/auth/generateOutilToken.ts            <- SSO cross-projet custom token
sos/firebase/functions/src/adminApi.ts                           <- Admin API auth (Bearer + ID token)
sos/firebase/functions/src/subscription/accessControl.ts         <- Subscription access control
sos/src/components/auth/ProtectedRoute.tsx                       <- Route guards, open redirect prevention
sos/src/contexts/AuthContext.tsx                                 <- Auth state, token refresh, multi-tab
Outil-sos-expat/firestore.rules                                  <- 2eme projet Firebase rules
Dashboard-multiprestataire/src/contexts/AuthContext.tsx           <- Agency manager auth
```

### Paiements & Finances
```
sos/firebase/functions/src/Webhooks/stripeWebhookHandler.ts      <- Stripe signature verification (dual secret)
sos/firebase/functions/src/PayPalManager.ts                      <- PayPal webhooks + order management
sos/firebase/functions/src/payment/triggers/webhookWise.ts       <- Wise HMAC timing-safe verification
sos/firebase/functions/src/payment/triggers/webhookFlutterwave.ts <- Flutterwave timing-safe verification
sos/firebase/functions/src/payment/callables/requestWithdrawal.ts <- RACE CONDITION P0
sos/firebase/functions/src/payment/services/paymentService.ts    <- Balance check, encryptFields, withdrawal
sos/firebase/functions/src/payment/callables/admin/adjustBalance.ts <- Admin balance manipulation ($10K max, audited)
sos/firebase/functions/src/payment/callables/admin/approveWithdrawal.ts
sos/firebase/functions/src/payment/callables/admin/processWithdrawal.ts
sos/firebase/functions/src/payment/triggers/processAutomaticPayments.ts <- FieldValue.increment atomicity
sos/firebase/functions/src/unified/commissionCalculator.ts       <- Commission calculation (event-driven)
sos/firebase/functions/src/unified/commissionWriter.ts           <- Commission persistence
sos/firebase/functions/src/unified/referralResolver.ts           <- Referral chain resolution
sos/firebase/functions/src/unified/discountResolver.ts           <- Discount/coupon validation
sos/firebase/functions/src/unified/codeResolver.ts               <- Affiliate code resolution
sos/firebase/functions/src/callables/validateCoupon.ts           <- Promo abuse detection (5 attempts = alert)
sos/firebase/functions/src/services/couponService.ts             <- Coupon service
sos/firebase/functions/src/lib/payoutRetryTasks.ts               <- Retry logic, idempotency
sos/firebase/functions/src/lib/stripeTransferRetryTasks.ts       <- Stripe transfer retry
```

### Anti-Fraude & Detection
```
sos/firebase/functions/src/securityAlerts/ThreatScoreService.ts  <- Score 0-100, 5 niveaux d'action
sos/firebase/functions/src/securityAlerts/triggers.ts            <- Security alert triggers
sos/firebase/functions/src/securityAlerts/rateLimiter.ts         <- Security-specific rate limiter
sos/src/hooks/useAntiBot.ts                                      <- reCAPTCHA v3, honeypot, timing, mouse, keystroke
sos/firebase/functions/src/chatter/services/chatterReferralService.ts <- Circular referral detection
```

### Secrets & Credentials
```
sos/firebase/functions/src/lib/secrets.ts                        <- TOUS les defineSecret() centralises
sos/firebase/functions/src/lib/functionConfigs.ts                <- CORS origins (11 dont 3 localhost), region configs
engine_telegram_sos_expat/.env                                   <- P0: TOKENS EXPOSES
engine_telegram_sos_expat/.env.production                        <- P0: TOKENS EXPOSES
engine_telegram_sos_expat/docker-compose.yml                     <- P0: DB password fallback
backlink-engine/.env.production                                  <- P0: DB password + JWT secret en clair
Blog_sos-expat_frontend/.env                                     <- INFLUENCER_API_TOKEN
partner_engine_sos_expat/.env.example                            <- API keys config
Influenceurs_tracker_sos_expat/laravel-api/.env.production.example <- AI API keys
```

### Les 36 Endpoints HTTP Publics (Surface d'Attaque Complete)
```
# Webhooks paiement (signature-verified)
sos/firebase/functions/src/Webhooks/stripeWebhookHandler.ts      <- stripeWebhook
sos/firebase/functions/src/PayPalManager.ts                      <- paypalWebhook, createPayPalOrderHttp, capturePayPalOrderHttp, authorizePayPalOrderHttp
sos/firebase/functions/src/payment/triggers/webhookWise.ts       <- paymentWebhookWise
sos/firebase/functions/src/payment/triggers/webhookFlutterwave.ts <- paymentWebhookFlutterwave
sos/firebase/functions/src/affiliate/webhooks/wiseWebhook.ts     <- wiseWebhook (affiliate)

# Webhooks Twilio (signature-verified)
sos/firebase/functions/src/Webhooks/twilioWebhooks.ts            <- twilioCallWebhook
sos/firebase/functions/src/Webhooks/TwilioConferenceWebhook.ts   <- TwilioConferenceWebhook
sos/firebase/functions/src/Webhooks/providerNoAnswerTwiML.ts     <- providerNoAnswerTwiML

# Cloud Tasks (secret-verified)
sos/firebase/functions/src/runtime/executeCallTask.ts            <- executeCallTask
sos/firebase/functions/src/runtime/forceEndCallTask.ts           <- forceEndCallTask
sos/firebase/functions/src/lib/payoutRetryTasks.ts               <- executePayoutRetryTask
sos/firebase/functions/src/lib/stripeTransferRetryTasks.ts       <- executeStripeTransferRetry

# Email webhooks (verification ?)
sos/firebase/functions/src/emailMarketing/functions/webhooks.ts  <- handleEmailOpen, handleEmailClick, handleEmailBounce, handleEmailComplaint, handleUnsubscribe
sos/firebase/functions/src/email/unsubscribe.ts                  <- emailUnsubscribe

# Telegram
sos/firebase/functions/src/chatter/callables/telegramOnboarding.ts <- telegramChatterBotWebhook

# Contact (auth ?)
sos/firebase/functions/src/contact/createContactMessage.ts       <- createContactMessage

# Admin API (Bearer + ID token)
sos/firebase/functions/src/adminApi.ts                           <- api

# SEO/SSR (public, pas d'auth)
sos/firebase/functions/src/seo/dynamicRender.ts                  <- renderForBotsV2
sos/firebase/functions/src/seo/affiliateOgRender.ts              <- affiliateOgRender
sos/firebase/functions/src/seo/ogImageService.ts                 <- ogImageService
sos/firebase/functions/src/seo/generateProviderSEO.ts            <- generateProviderSEO
sos/firebase/functions/src/seo/diagnoseProfiles.ts               <- diagnoseProfiles
sos/firebase/functions/src/seo/migrateProfileSlugs.ts            <- migrateProfileSlugs
sos/firebase/functions/src/seo/sitemaps.ts                       <- sitemaps
sos/firebase/functions/src/sitemap/index.ts                      <- sitemap index

# Divers
sos/firebase/functions/src/providerCatalogFeed.ts                <- providerCatalogFeed (XML)
sos/firebase/functions/src/monitoring/testCAPIConnection.ts      <- testCAPIConnection
sos/firebase/functions/src/seeds/initCountryConfigs.ts           <- initCountryConfigs
sos/firebase/functions/src/helpCenter/initHelpArticles.ts        <- initSingleHelpArticle, initHelpArticlesBatch, checkHelpCategories, clearHelpArticles
sos/firebase/functions/src/triggers/syncFromOutil.ts             <- syncFromOutil
sos/firebase/functions/src/tracking/capiEvents.ts                <- capiEvents
sos/firebase/functions/src/subscription/index.ts                 <- subscription
sos/firebase/functions/src/whatsapp/syncInviteLinks.ts           <- syncInviteLinks
sos/firebase/functions/src/index.ts                              <- testWebhook
```

### Rate Limiting & Protection
```
sos/firebase/functions/src/lib/rateLimiter.ts                    <- 5 presets, Firestore-backed
sos/firebase/functions/src/securityAlerts/rateLimiter.ts         <- Security-specific limiter
sos/firebase/functions/src/notificationPipeline/providers/sms/twilioSms.ts <- SMS: 10/phone/h, 100 global/h
sos/public/_headers                                              <- CSP, HSTS, X-Frame-Options, Permissions-Policy
```

### Input Validation & Sanitization
```
sos/src/components/registration/shared/sanitize.ts               <- DOMPurify, sanitizeRichText, sanitizeName (Unicode)
sos/firebase/functions/src/accounting/supportingDocumentService.ts <- File upload: MIME whitelist, 15MB max, filename sanitization
sos/firebase/functions/src/utils/logs/maskSensitiveData.ts       <- maskEmail, maskPhone, maskAmount, maskToken, maskUserId
sos/firebase/functions/src/auth/passwordReset.ts                 <- escapeHtml
```

### Encryption & Data Protection
```
sos/firebase/functions/src/payment/services/paymentService.ts    <- encryptFields()/decryptFields() AES-256-CBC
sos/firebase/functions/src/lib/secrets.ts                        <- ENCRYPTION_KEY definition
sos/firebase/functions/src/gdpr/auditTrail.ts                    <- GDPR audit trail, 3 ans retention
```

### GDPR & Account Deletion
```
sos/firebase/functions/src/gdpr/auditTrail.ts                    <- Audit trail complet
sos/firebase/functions/src/callables/adminDeleteUser.ts           <- User deletion
sos/firebase/functions/src/groupAdmin/callables/admin/deleteGroupAdmin.ts
sos/firebase/functions/src/partner/callables/admin/deletePartner.ts
sos/firebase/functions/src/blogger/callables/admin/deleteBlogger.ts
sos/firebase/functions/src/influencer/callables/admin/deleteInfluencer.ts
sos/firebase/functions/src/chatter/callables/admin/manageChatter.ts <- Chatter deletion
```

### Backups & Recovery
```
sos/firebase/functions/src/scheduled/backupStorageToDR.ts         <- Storage disaster recovery
sos/firebase/functions/src/scheduled/crossRegionBackup.ts         <- Cross-region backup
sos/firebase/functions/src/scheduled/backupSecretsAndConfig.ts    <- Secrets backup
sos/firebase/functions/src/scheduled/backupAuth.ts                <- Auth backup
sos/firebase/functions/src/scheduled/multiFrequencyBackup.ts      <- Multi-frequency
sos/firebase/functions/src/scheduled/disasterRecoveryTest.ts      <- DR test
sos/firebase/functions/src/scheduled/quarterlyRestoreTest.ts      <- Quarterly restore test
sos/firebase/functions/src/admin/backupRestoreAdmin.ts            <- Admin backup tools
```

### Scheduled Functions Securite
```
sos/firebase/functions/src/scheduled/consolidatedSecurityDaily.ts <- Daily security report
sos/firebase/functions/src/scheduled/adminAlertsDigest.ts        <- Admin alerts digest
sos/firebase/functions/src/scheduled/cleanupAuditLogs.ts         <- Audit log cleanup
sos/firebase/functions/src/scheduled/cleanupOrphanedSessions.ts  <- Session cleanup
sos/firebase/functions/src/scheduled/stuckPaymentsRecovery.ts    <- Stuck payments
sos/firebase/functions/src/scheduled/escrowMonitoring.ts          <- Escrow monitoring
sos/firebase/functions/src/monitoring/aiKeyAlert.ts               <- AI key failure alerts
sos/firebase/functions/src/monitoring/scheduledAIKeyCheck.ts      <- Proactive AI key check
```

### Telegram Engine
```
engine_telegram_sos_expat/app/Http/Middleware/VerifyTelegramWebhook.php  <- hash_equals verification
engine_telegram_sos_expat/app/Http/Middleware/VerifyFirebaseAdmin.php    <- Firebase token + admin claim
engine_telegram_sos_expat/app/Http/Middleware/VerifyFirebaseToken.php    <- Firebase token verification
engine_telegram_sos_expat/app/Http/Middleware/VerifyEngineSecret.php     <- Inter-service auth
engine_telegram_sos_expat/routes/api.php                                <- Toutes les routes API
engine_telegram_sos_expat/app/Http/Controllers/BotController.php        <- Webhook handlers
```

### Blog & Influenceurs Tracker & Backlink Engine
```
Blog_sos-expat_frontend/app/Http/Middleware/VerifyApiToken.php   <- HMAC-SHA256 + Bearer fallback (timestamp 5min)
Blog_sos-expat_frontend/app/Http/Middleware/AdminAuth.php        <- Admin login session
Influenceurs_tracker_sos_expat/laravel-api/config/services.php   <- API keys (OpenAI, Perplexity, Anthropic, Unsplash)
backlink-engine/src/middleware/auth.ts                           <- JWT + Session + API Key + Webhook auth
backlink-engine/src/middleware/rateLimiter.ts                    <- Rate limiting
```

---

## Verifications Requises — Par Equipe

### EQUIPE A — Securite des Paiements (experts 1-8)

**A1. Webhook Signature Verification**
Pour CHAQUE webhook handler, verifier :
- [ ] Stripe : constructEvent() avec stripe-signature header — dual secret (regular + Connect) ?
- [ ] PayPal : Quelle methode de verification ? (header signature vs API verify call ?)
- [ ] Wise : crypto.timingSafeEqual() utilise ? Header x-signature-sha256 verifie ?
- [ ] Flutterwave : verif-hash header avec timing-safe comparison ?
- [ ] Twilio : validateTwilioWebhookSignature() — verifie-t-il l'URL complete + body ?
- [ ] Les webhooks rejettent-ils les requetes sans signature (pas juste une signature invalide) ?
- [ ] Y a-t-il une protection contre les replay attacks (timestamp validation) ?
- [ ] Les webhooks email (handleEmailOpen, handleEmailBounce, etc.) ont-ils une verification ?

**A2. Race Condition Retraits (CRITIQUE)**
- [ ] Lire requestWithdrawal.ts lignes 100-300 — le check de solde est-il dans une transaction Firestore ?
- [ ] Le FieldValue.increment(-amount) est-il utilise (atomique) ou lecture-puis-ecriture (race) ?
- [ ] Tester le scenario : User a $100, envoie 2 requetes de $100 en parallele — resultat attendu vs reel ?
- [ ] Y a-t-il un lock sur payment_withdrawals pour empecher les creations concurrentes ?
- [ ] Les retraits "pending" sont-ils deduits du availableBalance cote lecture ?
- [ ] Le rate limiter WITHDRAWAL: 3/hour est-il applique sur requestWithdrawal ?
- [ ] Un retrait de montant negatif est-il rejete ? (amount: -500)
- [ ] Un retrait de montant zero est-il rejete ? (amount: 0)
- [ ] Y a-t-il un plafond maximum de retrait ? ($10K ? $50K ?)

**A3. Commission Farming & Fraude**
- [ ] Un chatter peut-il s'appeler lui-meme via un numero secondaire pour generer des commissions ?
- [ ] Les commissions sur appels sont-elles liees a un callId unique (idempotency) ?
- [ ] Un affilie peut-il creer de faux comptes pour toucher des commissions de recrutement ?
- [ ] Les comptes AAA (test) generent-ils des commissions ?
- [ ] lockedRates peut-il etre manipule par un utilisateur non-admin ?
- [ ] Le circular referral detection dans chatterReferralService.ts fonctionne-t-il pour des chaines de 3+ niveaux ?
- [ ] Le promo abuse detection (5 attempts/hour) est-il contournable en changeant d'IP ?

**A4. Audit Trail Completude**
- [ ] Chaque operation financiere (commission, retrait, ajustement) cree-t-elle un log dans payment_audit_logs ?
- [ ] Les logs sont-ils immutables (pas de update possible sur les documents audit) ?
- [ ] Un admin peut-il adjustBalance sans trace ? Le montant max $10K est-il enforce server-side ?
- [ ] Le GDPR auditTrail.ts couvre-t-il TOUTES les operations sur les donnees personnelles ?

### EQUIPE B — Authentification & Autorisation (experts 9-16)

**B1. Firebase Auth**
- [ ] Les custom claims (role: 'admin') sont-elles verifiees cote serveur dans CHAQUE callable ?
- [ ] Le token refresh est-il force apres un changement de claims ?
- [ ] Le setAdminClaims callable est-il protege et rate-limited ?
- [ ] L'assertAdmin() verifie claims.admin === true OU claims.role === 'admin' — les deux sont-ils toujours coherents ?
- [ ] Le generateOutilToken (SSO cross-projet) valide-t-il le projet source ?

**B2. Firestore Security Rules (40+ collections)**
- [ ] Lire TOUTES les rules ligne par ligne — y a-t-il une collection sans rule explicite ?
- [ ] La catch-all `match /{document=**} { allow read, write: if false; }` est-elle la DERNIERE rule ?
- [ ] Le champ role dans users/{uid} est-il protege en ecriture ?
- [ ] isApproved, isBanned, isVisible sont-ils modifiables uniquement par admin ?
- [ ] Les sous-collections heritent-elles des rules du parent ?
- [ ] payment_withdrawals sont-elles en ecriture Cloud Functions only ?
- [ ] Les rules de l'Outil-sos-expat (2eme projet) sont-elles aussi strictes ?

**B3. Rate Limiting Coverage**
Pour CHAQUE callable critique, verifier si le rate limiter est applique :
- [ ] requestWithdrawal — WITHDRAWAL: 3/hour ?
- [ ] registerClient/registerProvider — REGISTRATION: 2/hour ?
- [ ] createAndScheduleCall — CREATE_CALL: 3/min ?
- [ ] setAdminClaims — ADMIN_CLAIMS: 5/5min ?
- [ ] validateCoupon — promo abuse 5/hour ?
- [ ] createContactMessage — spam protection ?
- [ ] Les callables sans rate limiting sont-ils identifies ?

### EQUIPE C — Securite des API & Webhooks (experts 17-24)

**C1. Les 36 Endpoints HTTP Publics**
Pour CHAQUE endpoint onRequest (invoker: "public"), remplir :

| Endpoint | Auth | Signature | Rate Limit | Input Valid. | Deploye Prod ? | Dangereux ? |
|----------|------|-----------|------------|--------------|----------------|-------------|
| stripeWebhook | N/A | Stripe sig | ? | ? | Oui | Non |
| testWebhook | ? | ? | ? | ? | ? | OUI |
| clearHelpArticles | ? | ? | ? | ? | ? | OUI |
| migrateProviderSlugs | ? | ? | ? | ? | ? | OUI |
| initCountryConfigs | ? | ? | ? | ? | ? | OUI |
| diagnoseProfiles | ? | ? | ? | ? | ? | Info leak |
| testCAPIConnection | ? | ? | ? | ? | ? | Info leak |
| createContactMessage | ? | ? | ? | ? | Oui | Spam |
| ... (remplir les 36) | | | | | | |

**C2. CORS en production**
- [ ] localhost:5173/5174/3000 sont-ils autorises en PRODUCTION ?
- [ ] Le wildcard * est-il utilise quelque part ?
- [ ] Les webhooks server-to-server ont-ils besoin de CORS ?

**C3. Puppeteer SSR — SSRF**
- [ ] L'URL rendue par Puppeteer est-elle controlee par l'utilisateur (query param, path) ?
- [ ] Un attaquant peut-il forcer le render de http://169.254.169.254/latest/meta-data/ (SSRF) ?
- [ ] Le timeout de 45s peut-il etre exploite pour du DoS (resource exhaustion) ?

### EQUIPE D — Infrastructure (experts 25-32)

**D1. VPS Hetzner — 5 projets Docker sur 1 serveur**
- [ ] SSH : cle publique uniquement ? Root login desactive ? Port custom ?
- [ ] Firewall (iptables/ufw) : quels ports sont ouverts ?
- [ ] Isolation reseau Docker entre les projets (docker network) ?
- [ ] Les containers tournent-ils en root ?
- [ ] Le Docker socket est-il expose ?
- [ ] Mise a jour OS/packages : automatique ou manuelle ?
- [ ] Monitoring systeme : alertes CPU/RAM/disk ?

**D2. Cloudflare**
- [ ] Le vrai IP du VPS est-il cache ? (DNS leak via sous-domaines ?)
- [ ] SSL mode = Full (Strict) ? (pas Flexible)
- [ ] WAF active avec regles custom ?
- [ ] Bot management configure ?
- [ ] Under Attack mode — peut-il etre active rapidement ?

**D3. CI/CD GitHub Actions**
- [ ] Secrets dans GitHub Secrets (pas hardcodes) ?
- [ ] Cle SSH deploy rotee regulierement ?
- [ ] npm audit / composer audit dans le pipeline ?
- [ ] Push sur main peut-il declencher un deploy auto avec du code malicieux ? (branch protection ?)
- [ ] Pre-commit hooks pour detecter les secrets (gitleaks, truffleHog) ?

**D4. Backup & Recovery**
- [ ] Backups Firestore automatiques ? (backupStorageToDR, crossRegionBackup)
- [ ] Backups PostgreSQL (5 projets) automatiques ?
- [ ] Backups chiffres ?
- [ ] quarterlyRestoreTest — est-il execute et les resultats verifies ?
- [ ] RTO/RPO definis et realistes ?

### EQUIPE E — Secrets (experts 33-40)

**E1. Commandes de verification a executer**
```bash
# Pour CHAQUE projet, chercher des secrets dans le git history
cd engine_telegram_sos_expat && git log --all --diff-filter=A -- "*.env" "*.env.*" --name-only
cd backlink-engine && git log --all -p -- "*.env" "*.env.*" | grep -i "password\|secret\|token\|key"
cd Blog_sos-expat_frontend && git log --all --diff-filter=A -- "*.env*" --name-only
cd partner_engine_sos_expat && git log --all --diff-filter=A -- "*.env*" --name-only

# Verifier les .gitignore
for dir in engine_telegram_sos_expat backlink-engine Blog_sos-expat_frontend partner_engine_sos_expat; do
  echo "=== $dir ===" && grep -n "env" "$dir/.gitignore" 2>/dev/null || echo "NO .gitignore!"
done
```

**E2. API Keys a haut risque**
- [ ] Twilio SID + Auth Token — permettent de passer des appels payants (cout reel)
- [ ] Stripe Secret Key — permet de creer des paiements et des transferts
- [ ] OpenAI/Anthropic API keys — budget caps configures ?
- [ ] Wise API Token — permet de creer des transferts bancaires reels

### EQUIPE F — Client-Side (experts 41-48)

**F1. XSS**
- [ ] Blog : `{!! $processedContent !!}` (Blade unescaped) — mews/purifier config complete ?
- [ ] SPA : DOMPurify.sanitize() avec ALLOWED_TAGS: [] — applique partout ?
- [ ] Profils prestataires : contenu user-generated non sanitize ?
- [ ] dangerouslySetInnerHTML utilise dans la SPA React ?

**F2. localStorage & IndexedDB**
- [ ] Quelles donnees dans localStorage ? (tokens, user data, language)
- [ ] XSS = vol du Firebase auth token depuis localStorage ?
- [ ] IndexedDB Firestore cache (50MB) contient-il des donnees sensibles ?

**F3. Open Redirect**
- [ ] isValidLocalRedirect() bloque : javascript:, //, \, data:, @ ?

### EQUIPE G — Donnees & Privacy (experts 49-54)

**G1. Cartographie PII**

| Donnee | Collection/Storage | Chiffree ? | Accessible par | GDPR base legale |
|--------|-------------------|------------|----------------|------------------|
| IBAN | payment_methods | AES-256 | CF only | Contrat |
| Telephone | users | AES-256 ? | ? | Contrat |
| Email | users | Non | Auth | Contrat |
| Nom/Prenom | users + sos_profiles | Non | Public (profiles) | Interet legitime |
| Adresse | users | ? | ? | Contrat |
| Passeport/ID | Storage signed URLs | ? | Admin only ? | Obligation legale |
| Historique appels | calls | Non | ? | Contrat |
| Commissions | commissions | Non | User + Admin | Contrat |
| Avis clients | reviews | Non | Public | Consentement |

**G2. GDPR Completude**
- [ ] Droit d'acces (export donnees) — implemente ?
- [ ] Droit a l'oubli (6 deleteUser callables) — cascade complete ? (reviews, commissions, appels, notifications, paiements, storage)
- [ ] Invoices conservees 10 ans meme apres suppression compte ?
- [ ] Consentement cookies (Google Consent Mode V2) — conforme ?
- [ ] DPO designe ?
- [ ] Registre des traitements ?

**G3. Cross-Border**
- [ ] Firestore nam7 (Iowa US) — donnees EU transferees aux US sans Standard Contractual Clauses ?
- [ ] Loi cybersecurite chinoise — impact pour les utilisateurs CN ?
- [ ] Federal Law 242-FZ (Russie) — localisation des donnees obligatoire ?
- [ ] DPDP Act 2023 (Inde) — consentement explicite requis ?

### EQUIPE H — Detection, Alertes & Reponse (experts 55-60)

**H1. Systeme d'Alertes Telegram a Implementer**

Via le Telegram Engine existant : POST /api/events/{event-slug}

| Alerte | Bot | Priorite | Declencheur | event-slug |
|--------|-----|----------|-------------|------------|
| Retrait > $500 | withdrawals | IMMEDIATE | requestWithdrawal amount > 50000 | security_large_withdrawal |
| Multiple retraits meme user < 5min | withdrawals | IMMEDIATE | 2+ withdrawals in 5min | security_rapid_withdrawals |
| Login admin depuis IP inconnue | main | IMMEDIATE | Admin auth + new IP | security_admin_new_ip |
| Escalade de privileges | main | IMMEDIATE | User tente de modifier role | security_privilege_escalation |
| Webhook signatures invalides (x5/min) | main | IMMEDIATE | 5+ failed signatures in 1min | security_webhook_abuse |
| Rate limit auth depasse | main | IMMEDIATE | SENSITIVE_AUTH limit hit | security_auth_bruteforce |
| ThreatScore > 70 | main | IMMEDIATE | ThreatScoreService score > 70 | security_high_threat |
| Nouveau admin ajoute | main | HAUTE | setAdminClaims called | security_new_admin |
| Balance ajustee manuellement | withdrawals | HAUTE | adjustBalance called | security_balance_adjustment |
| Erreur paiement Stripe/PayPal | main | HAUTE | Webhook processing error | security_payment_error |
| Profil banni | inbox | HAUTE | isBanned = true | security_user_banned |
| Upload suspect | main | HAUTE | File > 10MB or unusual MIME | security_suspicious_upload |
| AI API key failure | main | HAUTE | aiKeyAlert.ts trigger | security_ai_key_failure |
| Commission anormale > $100 | main | HAUTE | Commission amount > 10000 | security_large_commission |
| Inscription pays a risque | inbox | MOYENNE | Registration from CN/RU/NG | security_risky_country_signup |
| 10+ inscriptions meme IP/jour | main | MOYENNE | IP registration spike | security_registration_spike |
| Promo code abuse (5+ attempts) | main | MOYENNE | validateCoupon abuse detection | security_promo_abuse |
| Firestore rules deny spike | main | MOYENNE | Security rules audit log | security_rules_deny_spike |
| Cloud Function error rate > 5% | main | MOYENNE | Error rate in 5min | security_function_errors |
| SSL cert < 14 jours | main | MOYENNE | Cron check | security_ssl_expiring |
| Backup failure | main | MOYENNE | Backup function error | security_backup_failure |
| SMS rate limit hit | main | BASSE | 10/phone/h limit reached | security_sms_abuse |

**H2. Kill Switch — Mecanismes de Blocage d'Urgence**

| Kill Switch | Mecanisme | Activation | Reversible |
|-------------|-----------|------------|------------|
| Bloquer TOUS les paiements | Firestore system_config/killswitch.paymentsDisabled | Admin dashboard ou Telegram command | Oui, meme path |
| Bloquer les retraits | Firestore system_config/killswitch.withdrawalsDisabled | Admin dashboard | Oui |
| Bloquer les inscriptions | Firestore system_config/killswitch.registrationDisabled | Admin dashboard | Oui |
| Bannir un utilisateur | users/{uid}.isBanned = true + token revocation | Admin callable | Oui |
| Desactiver un bot Telegram | Telegram Engine config | Admin API | Oui |
| Maintenance mode | Cloudflare maintenance page rule | Cloudflare dashboard | Oui |
| Revoquer API key | Firebase Secrets Manager rotation | Firebase Console | Redeploy |
| Bloquer un pays entier | Cloudflare WAF geo-blocking | Cloudflare dashboard | Oui |
| Forcer logout global | Firebase Auth revoke all refresh tokens | Firebase Admin SDK | Irreversible |
| Isoler le VPS | Firewall iptables block all | SSH | Oui |

- [ ] Chaque kill switch peut-il etre active en < 2 minutes ?
- [ ] Chaque kill switch est-il reversible sans redeploiement ?
- [ ] Y a-t-il un kill switch via Telegram command (plus rapide qu'un dashboard) ?
- [ ] Les kill switches sont-ils testes regulierement ?

**H3. Incident Response Playbooks**
Verifier l'existence de procedures pour :
- [ ] Fuite de donnees : notification CNIL < 72h, notification utilisateurs, forensics
- [ ] Compromission bot Telegram : revoke token, regenerate, redeploy (< 30 min)
- [ ] Compromission DB PostgreSQL : isoler VPS, forensics, restore backup
- [ ] Compromission Firebase : revoke service account, rotate secrets, audit trail
- [ ] Fraude massive : gel des retraits (kill switch), audit transactions, notification Stripe
- [ ] DDoS : Cloudflare Under Attack mode, rate limiting, geo-blocking
- [ ] Supply chain attack (npm/composer) : lock down deps, audit, rollback

---

## Format de Reponse

### Phase 1 — Inventaire des Vulnerabilites

```
## VULNERABILITE V{N}

**Severite** : P0 CRITIQUE / P1 HAUTE / P2 MOYENNE / P3 BASSE
**Categorie** : [Paiement | Auth | API | Infra | Secrets | XSS | Data | Alertes]
**CVSS Score** : X.X (si applicable)

**Fichier(s)** : chemin/fichier.ts:ligne
**Preuve** : Code exact montrant la vulnerabilite
**Scenario d'attaque** : Comment un attaquant exploiterait cette faille
**Impact** : Consequences si exploite (financier, donnees, reputation)
**Fix propose** : Code exact de correction
**Regression possible** : Ce que le fix pourrait casser
**Test de verification** : Comment verifier que le fix fonctionne
```

### Phase 2 — Matrice de Risques

```
| # | Vulnerabilite | Severite | Probabilite | Impact | Score | Fix Effort |
|---|---------------|----------|-------------|--------|-------|------------|
```

### Phase 3 — Architecture d'Alertes Telegram

Pour chaque alerte definie en H1, fournir :
```json
{
  "event_type": "security_withdrawal_anomaly",
  "bot": "withdrawals",
  "template": "ALERTE SECURITE\n\nRetrait suspect detecte\nUser: {userId}\nMontant: ${amount}\nIP: {ip}\nPays: {country}\n\nAction: /block_{userId}",
  "trigger_file": "requestWithdrawal.ts",
  "trigger_line": 150,
  "trigger_condition": "amount > 50000 || withdrawalsLast5min >= 2",
  "implementation": "// Code Firebase Function exact a ajouter"
}
```

### Phase 4 — Kill Switch Implementation

Pour chaque kill switch en H2, fournir :
```json
{
  "name": "disable_withdrawals",
  "firestore_path": "system_config/killswitch",
  "field": "withdrawalsDisabled",
  "check_location": "requestWithdrawal.ts:ligne_X",
  "implementation": "// Code exact du check a ajouter en debut de fonction",
  "activation": "// Comment un admin active ce kill switch",
  "rollback": "// Comment desactiver"
}
```

### Phase 5 — Plan d'Action Priorise (Top 30)

```
| # | Action | Severite | Effort | Dependances | Responsable |
|---|--------|----------|--------|-------------|-------------|
| 1 | Revoquer tokens Telegram exposes | P0 | 30min | Aucune | Immediat |
| 2 | Revoquer credentials backlink-engine | P0 | 30min | Aucune | Immediat |
| 3 | Fixer race condition retraits | P0 | 2h | Tests | Paiements |
| 4 | Supprimer .env.production du git history | P0 | 1h | Coordination | DevOps |
| 5 | Retirer localhost du CORS production | P1 | 15min | Test | API |
| ... | ... | ... | ... | ... | ... |
```

### Phase 6 — Checklist Anti-Regression

Avant d'implementer toute modification, verifier :
- [ ] Les webhooks Stripe/PayPal/Wise/Flutterwave fonctionnent toujours
- [ ] Les appels Twilio (IVR, conference) ne sont pas impactes
- [ ] Les inscriptions (client, provider, chatter, influencer, blogger, groupAdmin) fonctionnent
- [ ] Les retraits (Stripe, Wise, Flutterwave) aboutissent
- [ ] Les commissions sont toujours calculees correctement
- [ ] Le SSO SOS <-> Outil fonctionne
- [ ] Le Dashboard multi-prestataire se connecte
- [ ] Les 3 bots Telegram recoivent les notifications
- [ ] Les backups automatiques tournent
- [ ] Le site est accessible dans les 9 langues
- [ ] Les profils prestataires sont visibles publiquement
- [ ] Les sitemaps sont generes correctement

---

## Contraintes Critiques

- **Site mondial** : utilisateurs en Chine (Great Firewall), Russie, Inde, Moyen-Orient — chaque pays a ses propres lois cyber
- **Argent reel** : Stripe Connect, PayPal, Wise, Flutterwave — toute faille financiere = perte directe
- **197 pays** : attaques potentielles de partout, fuseaux horaires multiples
- **1 seul VPS Hetzner** pour 5 projets Docker — blast radius maximal si compromis
- **2 projets Firebase** partageant des donnees via SSO — compromission d'un = risque pour l'autre
- **Donnees GDPR** : IBAN, telephones, noms, adresses, passeports — amendes jusqu'a 4% du CA mondial
- **Pas de SOC/SIEM dedie** — les alertes Telegram + Sentry + aiKeyAlert sont le monitoring principal
- **Aucune regression toleree** — le systeme traite des paiements en production 24/7
- **3 bots Telegram existants** : utiliser ces bots pour les alertes securite
- **Telegram Engine** (engine-telegram-sos-expat.life-expat.com) : endpoint POST /api/events/{event-slug} pour envoyer les alertes
- **forwardEventToEngine()** dans Firebase Functions — fonction existante pour envoyer des events au Telegram Engine
- **ThreatScoreService** existant avec 5 niveaux (0-30 log, 31-50 rate limit, 51-70 CAPTCHA+MFA, 71-85 block temp, 86-100 block permanent) — a integrer dans les alertes

---

## Instructions Finales

1. **Lisez CHAQUE fichier de la liste** avant de diagnostiquer — pas d'hypotheses
2. **Executez les commandes git** pour verifier les secrets dans l'historique de CHAQUE projet
3. **Tracez le flux d'un retrait** de bout en bout : request -> validation -> balance check -> transaction -> paiement -> webhook confirmation — identifiez chaque point de defaillance
4. **Tracez le flux d'un paiement Stripe** de bout en bout : client -> checkout -> paymentIntent -> webhook -> commission — identifiez chaque point de defaillance
5. **Simulez une attaque** : un attaquant qui a vole un token Telegram — quel est le blast radius ?
6. **Simulez une compromission du VPS** : l'attaquant a un shell — qu'est-ce qu'il peut atteindre ? (5 projets, 5 DBs PostgreSQL, Firebase service accounts)
7. **Simulez un insider threat** : un developeur malveillant qui a acces au repo — que peut-il faire ?
8. **Verifiez le ThreatScoreService** : les 5 niveaux d'action sont-ils reellement implementes ou juste definis ?
9. **Verifiez les 29 fichiers de backup** : les backups sont-ils testes et les restaurations verifiees ?
10. **Chaque fix DOIT inclure** : le code exact, le fichier exact, et la verification anti-regression
11. **Les alertes Telegram DOIVENT utiliser** forwardEventToEngine() existant dans Firebase Functions
12. **Les kill switches DOIVENT etre activables** en < 2 minutes par un admin (dashboard OU Telegram command)

*Commencez l'audit. Lisez les fichiers. Trouvez les failles. Protegez les utilisateurs et leur argent.*
