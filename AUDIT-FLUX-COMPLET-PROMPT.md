# AUDIT COMPLET — Inscription, Reservation, Appel Twilio, Paiement, Commissions, Monitoring, Outil IA

> **Version** : 2.0 — 2026-03-18
> **Objectif** : Audit de bout en bout de TOUT le systeme business + monitoring 24/7 — zero bug, zero perte de donnees, zero perte d'argent, ALERTE IMMEDIATE si quoi que ce soit tombe
> **Site** : https://sos-expat.com — 197 pays, 9 langues, 24/7
> **Stack** : Firebase Functions (3 regions) + Twilio + Stripe + PayPal + Wise + Flutterwave + GPT + Claude + Perplexity

---

## TABLE DES MATIERES

1. [Contexte & Architecture](#1-contexte--architecture)
2. [Flux Complet Bout en Bout](#2-flux-complet-bout-en-bout)
3. [Hierarchie des 50 Agents](#3-hierarchie-des-50-agents)
4. [Phase 0 — Protection & Snapshot](#phase-0--protection--snapshot)
5. [Phase 1 — Audit Booking & Frontend](#phase-1--audit-booking--frontend)
6. [Phase 2 — Audit Payment Intent & Checkout](#phase-2--audit-payment-intent--checkout)
7. [Phase 3 — Audit Scheduling & Cloud Tasks](#phase-3--audit-scheduling--cloud-tasks)
8. [Phase 4 — Audit Twilio Appels & IVR](#phase-4--audit-twilio-appels--ivr)
9. [Phase 5 — Audit Conference & Duree](#phase-5--audit-conference--duree)
10. [Phase 6 — Audit Capture Paiement & Post-Call](#phase-6--audit-capture-paiement--post-call)
11. [Phase 7 — Audit Commissions & Affilies](#phase-7--audit-commissions--affilies)
12. [Phase 8 — Audit Retraits & Payouts](#phase-8--audit-retraits--payouts)
13. [Phase 9 — Audit Stripe Webhooks & Securite](#phase-9--audit-stripe-webhooks--securite)
14. [Phase 10 — Audit PayPal Integration](#phase-10--audit-paypal-integration)
15. [Phase 11 — Audit Provider Status & Disponibilite](#phase-11--audit-provider-status--disponibilite)
16. [Phase 12 — Audit Gestion Erreurs & Recovery](#phase-12--audit-gestion-erreurs--recovery)
17. [Phase 13 — Audit Factures & Comptabilite](#phase-13--audit-factures--comptabilite)
18. [Phase 14 — Audit Notifications Multi-Canal](#phase-14--audit-notifications-multi-canal)
19. [Phase 15 — Audit Securite & Encryption](#phase-15--audit-securite--encryption)
20. [Phase 16 — Audit Inscription & Connexion](#phase-16--audit-inscription--connexion)
21. [Phase 17 — Audit Outil IA (GPT/Claude/Perplexity)](#phase-17--audit-outil-ia)
22. [Phase 18 — Audit Subscriptions](#phase-18--audit-subscriptions)
23. [Phase 19 — Audit Monitoring Bot 24/7 & Alertes](#phase-19--audit-monitoring-bot-247--alertes)
24. [Phase 20 — Audit 20 Dependances API Externes](#phase-20--audit-20-dependances-api-externes)
25. [Phase 21 — Audit Firestore Rules, Reviews, Coupons, Backups, Disputes](#phase-21--audit-firestore-rules-reviews-coupons-backups-disputes)
26. [Phase 22 — Cross-Checks & Tests E2E](#phase-22--cross-checks--tests-e2e)
27. [Phase 23 — Plan d'Action](#phase-23--plan-daction)
28. [Regles Absolues](#regles-absolues)

---

## 1. CONTEXTE & ARCHITECTURE

### Architecture 3 Regions

| Region | Localisation | Role | Fonctions |
|--------|-------------|------|-----------|
| **europe-west1** 🇧🇪 | Belgique | Core Business & Admin | ~206 callables : `createAndScheduleCallHTTPS`, admin, KYC, backups |
| **europe-west3** 🇩🇪 | Francfort | Payments + Twilio (TEMPS REEL) | ~252 : `stripeWebhook`, `twilioCallWebhook`, `twilioConferenceWebhook`, triggers Firestore, Cloud Tasks |
| **us-central1** 🇺🇸 | Iowa | Affilies/Marketing | ~201 : commissions, chatters, influenceurs, bloggers, groupAdmins, retraits |

**Firestore** : nam7 (Iowa) — latence optimale depuis us-central1 (~1-5ms), ~100ms depuis EU

### Flux Global (Diagramme)

```
CLIENT                    BACKEND                         TWILIO              STRIPE
  │                          │                              │                   │
  ├─ BookingRequest.tsx ────→│                              │                   │
  │  (collecte infos)        │                              │                   │
  │                          │                              │                   │
  ├─ CallCheckout.tsx ──────→│ createPaymentIntent() ──────→│                   │──→ PaymentIntent
  │  (formulaire paiement)   │ (europe-west3)               │                   │   (capture:manual)
  │                          │                              │                   │
  │  [Client confirme] ─────→│ createAndScheduleCallHTTPS() │                   │
  │                          │ (europe-west1)               │                   │
  │                          │  ├─ Valide auth+data         │                   │
  │                          │  ├─ setProviderBusy()        │                   │
  │                          │  ├─ Cree call_sessions       │                   │
  │                          │  ├─ Cloud Task (4min delay)  │                   │
  │                          │  └─ SMS provider+client      │                   │
  │                          │                              │                   │
  │                    [4 min plus tard]                     │                   │
  │                          │                              │                   │
  │                          │ executeCallTask() ──────────→│ Appel provider    │
  │                          │ (europe-west3, Cloud Tasks)  │ Appel client      │
  │                          │                              │                   │
  │  [Provider repond] ◄─────│◄──── twilioCallWebhook ◄────│ CallStatus events │
  │  [Appuie 1]              │      (europe-west3)          │ DTMF/Gather       │
  │                          │                              │                   │
  │  [Client repond] ◄──────│◄──── twilioCallWebhook ◄────│ CallStatus events │
  │  [Appuie 1]              │                              │                   │
  │                          │                              │                   │
  │  [CONFERENCE] ◄─────────│ TwilioConferenceWebhook ◄───│ Conference events  │
  │  (provider+client)       │ (europe-west3)              │ join/leave/record  │
  │                          │                              │                   │
  │  [Appel termine] ──────→│ handleCallCompleted() ───────│──────────────────→│ Capture payment
  │                          │  ├─ Calcule duree billing    │                   │ (si duree >= 60s)
  │                          │  ├─ Cree factures            │                   │
  │                          │  ├─ Update call_sessions     │                   │
  │                          │  └─ Declenche 7 triggers:    │                   │
  │                          │     ├─ Telegram notification  │                   │
  │                          │     ├─ Chatter commission     │                   │
  │                          │     ├─ Influencer commission  │                   │
  │                          │     ├─ Blogger commission     │                   │
  │                          │     ├─ GroupAdmin commission  │                   │
  │                          │     ├─ Partner commission     │                   │
  │                          │     └─ Affiliate commission   │                   │
  │                          │                              │                   │
  ├─ PaymentSuccess.tsx ◄───│ (Firestore listener)         │                   │
  │  (confirmation+facture)  │                              │                   │
```

### Collections Firestore Cles

| Collection | Cle | Contenu |
|-----------|-----|---------|
| `booking_requests/{id}` | Auto-ID | Demande de reservation (pre-paiement) |
| `call_sessions/{sessionId}` | Generated | Session d'appel complete (status, participants, conference, payment) |
| `payments/{paymentIntentId}` | Stripe PI ID | Enregistrement paiement (status, montants, liens) |
| `sos_profiles/{providerId}` | User UID | Profil prestataire (disponibilite, Stripe account, etc.) |
| `users/{userId}` | User UID | Utilisateur (role, soldes, linked providers) |
| `commissions/{id}` | Auto-ID | Commission affilie (montant, statut, source) |
| `payment_withdrawals/{id}` | Auto-ID | Demande de retrait (status, methode, montant) |
| `invoice_records/{invoiceNumber}` | Sequential | Facture generee (HTML, URL signee) |
| `processed_webhook_events/{key}` | Event key | Idempotence webhooks (evite double-traitement) |
| `admin_config/pricing` | Fixed | Configuration prix (lawyer/expat × EUR/USD) |
| `admin_config/fees` | Fixed | Frais de retrait ($3 fixe) |
| `commission_plans/{planId}` | Plan ID | Plans de commission par role |

### Pricing

| Type | EUR | USD | Duree |
|------|-----|-----|-------|
| **Avocat** | 49€ total (19€ plateforme + 30€ prestataire) | $55 total ($25 + $30) | 20 min |
| **Expat** | 19€ total (9€ plateforme + 10€ prestataire) | $25 total ($15 + $10) | 30 min |

### Fichiers Cles (55 fichiers)

#### Frontend (8)
| Fichier | Role |
|---------|------|
| `src/pages/BookingRequest.tsx` | Formulaire de reservation multi-etapes |
| `src/pages/CallCheckout.tsx` | Paiement Stripe/PayPal |
| `src/pages/PaymentSuccess.tsx` | Confirmation + suivi appel |
| `src/services/booking.ts` | Service booking → Firestore |
| `src/components/payment/PayPalPaymentForm.tsx` | Formulaire PayPal (34K) |
| `src/components/payment/Forms/WithdrawalRequestForm.tsx` | Formulaire retrait |
| `src/components/payment/CommissionsHistoryTab.tsx` | Historique commissions |
| `src/services/pricingService.ts` | Hook usePricingConfig |

#### Backend Core (15)
| Fichier | Region | Role |
|---------|--------|------|
| `createPaymentIntent.ts` | west3 | Cree PaymentIntent Stripe (capture:manual) |
| `createAndScheduleCallFunction.ts` | west1 | Orchestration principale (reserve provider, cree session, Cloud Task) |
| `callScheduler.ts` | — | Cree doc call_sessions |
| `TwilioCallManager.ts` | — | Machine a etats appels (initiate, connect, conference, end) |
| `StripeManager.ts` | — | Gestionnaire Stripe (600+ lignes) |
| `PayPalManager.ts` | — | Gestionnaire PayPal (500+ lignes) |
| `callables/providerStatusManager.ts` | — | Busy/available/offline atomique |
| `services/pricingService.ts` | — | Cache pricing 5min |
| `utils/encryption.ts` | — | AES-256-GCM telephones |
| `lib/stripe.ts` | — | Secrets Stripe centralises |
| `lib/twilio.ts` | — | Client Twilio + circuit breaker |
| `lib/tasks.ts` | — | Cloud Tasks scheduling |
| `utils/paymentSync.ts` | — | Sync payment ↔ call_session |
| `utils/generateInvoice.ts` | — | Generation factures HTML |
| `accounting/accountingService.ts` | — | Ecritures comptables |

#### Webhooks (5)
| Fichier | Region | Role |
|---------|--------|------|
| `Webhooks/stripeWebhookHandler.ts` | west3 | 20+ events Stripe |
| `Webhooks/twilioWebhooks.ts` | west3 | Status appels + Gather/DTMF |
| `Webhooks/TwilioConferenceWebhook.ts` | west3 | Events conference |
| `payment/triggers/webhookWise.ts` | west3 | Statut transferts Wise |
| `payment/triggers/webhookFlutterwave.ts` | west3 | Statut transferts Flutterwave |

#### Triggers Post-Appel (7)
| Fichier | Region | Role |
|---------|--------|------|
| `telegram/triggers/onCallCompleted.ts` | west3 | Notification admin Telegram |
| `chatter/triggers/onCallCompleted.ts` | central1 | Commission chatter |
| `influencer/triggers/onCallCompleted.ts` | central1 | Commission influencer |
| `blogger/triggers/onCallCompleted.ts` | central1 | Commission blogger |
| `groupAdmin/triggers/onCallCompleted.ts` | central1 | Commission groupAdmin |
| `partner/triggers/onCallCompleted.ts` | central1 | Commission partner |
| `affiliate/triggers/onCallCompleted.ts` | central1 | Commission affiliate |

#### Commissions (7)
| Fichier | Role |
|---------|------|
| `unified/commissionCalculator.ts` | Point d'entree unifie |
| `unified/commissionWriter.ts` | Ecriture Firestore |
| `chatter/services/chatterCommissionService.ts` | Calcul chatter |
| `influencer/services/influencerCommissionService.ts` | Calcul influencer |
| `blogger/services/bloggerCommissionService.ts` | Calcul blogger |
| `groupAdmin/services/groupAdminCommissionService.ts` | Calcul groupAdmin |
| `partner/services/partnerCommissionService.ts` | Calcul partner |

#### Retraits (8)
| Fichier | Role |
|---------|------|
| `payment/services/paymentService.ts` | Service retrait principal |
| `payment/services/paymentRouter.ts` | Routage Wise/Flutterwave/Manuel |
| `payment/providers/wiseProvider.ts` | Transferts bancaires |
| `payment/providers/flutterwaveProvider.ts` | Mobile money Afrique |
| `payment/callables/requestWithdrawal.ts` | Callable retrait |
| `payment/callables/admin/approveWithdrawal.ts` | Admin approuve |
| `payment/callables/admin/processWithdrawal.ts` | Admin traite |
| `payment/callables/admin/rejectWithdrawal.ts` | Admin rejette |

#### Crons & Monitoring (5)
| Fichier | Frequence | Role |
|---------|-----------|------|
| `scheduled/checkProviderInactivity.ts` | 15 min | Force release providers bloques busy |
| `scheduled/stuckPaymentsRecovery.ts` | 30 min | Recupere paiements bloques |
| `scheduled/cleanupOrphanedSessions.ts` | Quotidien | Nettoie sessions orphelines |
| `scheduled/stripeReconciliation.ts` | Quotidien | Reconciliation Stripe |
| `monitoring/paymentMonitoring.ts` | — | Metriques paiements |

---

## 2. FLUX COMPLET BOUT EN BOUT

### Etape 1 : Reservation (Frontend)
```
BookingRequest.tsx → booking.ts → Firestore: booking_requests/{id}
Donnees : providerId, serviceType, clientPhone, langues, description
```

### Etape 2 : Paiement (Frontend → Backend)
```
CallCheckout.tsx → createPaymentIntent (callable, west3)
  → Stripe API: PaymentIntent (capture_method: manual)
  → Retourne: clientSecret, paymentIntentId
Client confirme via Stripe Elements ou PayPal
```

### Etape 3 : Scheduling (Backend)
```
createAndScheduleCallHTTPS (callable, west1)
  → Valide auth, data, E164 phones
  → setProviderBusy() (transaction atomique)
  → createCallSession() → call_sessions/{sessionId}
  → Update payments/{PI_ID} avec callSessionId
  → scheduleCallTaskWithIdempotence() → Cloud Task (4 min delay)
  → SMS provider + client
```

### Etape 4 : Execution Appel (Cloud Tasks → Twilio)
```
executeCallTask (HTTP, west3, 4 min apres scheduling)
  → TwilioCallManager.initiateConferenceCall()
  → Twilio API: appel provider + appel client
  → IVR: "Appuyez sur 1 pour etre connecte" (multilingue)
```

### Etape 5 : Conference (Twilio → Backend)
```
twilioCallWebhook (HTTP, west3)
  → ringing → update participant status
  → answered + DTMF 1 → conference
  → TwilioConferenceWebhook
    → participant.joined → both_connected
    → participant.left → calcul duree
    → conference.ended → handleCallCompleted()
```

### Etape 6 : Post-Appel (Backend)
```
handleCallCompleted()
  → duree >= 60s ? → Stripe capture payment
  → duree < 60s ? → void authorization (pas de capture)
  → Cree factures (platform + provider)
  → Update call_sessions.status = 'completed'
  → 7 triggers onCallCompleted → commissions
  → Notifications: Telegram, email, SMS
```

### Etape 7 : Commissions (Backend)
```
7 triggers onCallCompleted (us-central1 + europe-west3)
  → Calcul commission par type (chatter/influencer/blogger/groupAdmin/partner/affiliate)
  → Cree commissions/{id}
  → Incremente soldes (totalEarned, availableBalance)
  → Notifications
```

### Etape 8 : Retraits (Backend)
```
requestWithdrawal (callable)
  → Valide solde >= montant + $3 frais
  → Cree payment_withdrawals/{id}
  → Status: pending → validating → approved → processing → sent → completed
  → Routage: Wise (bank) ou Flutterwave (mobile money)
  → Webhooks retour pour confirmer
```

---

## 3. HIERARCHIE DES 50 AGENTS

### Niveau 0 — Orchestrateur (1)

| # | Agent | Role |
|---|-------|------|
| C0 | **Orchestrateur Flux** | Coordonne les 12 directeurs, consolide, plan final |

### Niveau 1 — Directeurs (12)

| # | Agent | Domaine | Agents |
|---|-------|---------|--------|
| C1 | **Directeur Booking & Frontend** | Reservation, checkout, UI | C13-C17 |
| C2 | **Directeur Paiements** | Stripe, PayPal, intent, capture | C18-C23 |
| C3 | **Directeur Twilio & Appels** | Scheduling, IVR, conference, duree | C24-C30 |
| C4 | **Directeur Commissions** | 7 systemes, calcul, soldes | C31-C36 |
| C5 | **Directeur Retraits & Payouts** | Wise, Flutterwave, workflow admin | C37-C41 |
| C6 | **Directeur Webhooks & Idempotence** | Stripe/Twilio/Wise webhooks, dedup | C42-C46 |
| C7 | **Directeur Erreurs & Recovery** | Edge cases, retry, stuck states | C47-C51 |
| C8 | **Directeur Securite & Comptabilite** | Encryption, audit, factures, GDPR | C52-C56 |
| C9 | **Directeur Inscription & Auth** | Registration, login, OAuth, session | C57-C61 |
| C10 | **Directeur Outil IA** | GPT/Claude/Perplexity, SSO, subscriptions | C62-C69 |
| C11 | **Directeur Monitoring 24/7** | Alertes, soldes, health checks, bot Telegram | C70-C78 |
| C12 | **Directeur API Externes** | 20 dependances, credentials, fallbacks | C79-C82 |

### Niveau 2 — Agents Specialises (44)

#### Sous C1 : Booking & Frontend (5)

| # | Agent | Mission |
|---|-------|---------|
| C9 | **Audit BookingRequest** | Verifier BookingRequest.tsx : validation champs, gestion erreurs, UX multi-etapes, i18n 9 langues, tracking events (Meta/GA4). Verifier que TOUS les champs requis sont envoyes au backend |
| C10 | **Audit CallCheckout** | Verifier CallCheckout.tsx : integration Stripe Elements, PayPal option, calcul montants, detection devise EUR/USD, coupon, affichage commission breakdown. Verifier que createPaymentIntent est appele avec les bons params |
| C11 | **Audit PaymentSuccess** | Verifier PaymentSuccess.tsx : listener Firestore call_sessions, affichage statut temps reel, facture, review modal, tracking conversions (GA4, Meta Pixel, Google Ads, Meta CAPI). Edge case : que se passe-t-il si la page est rechargee ? |
| C12 | **Audit PayPal Form** | Verifier PayPalPaymentForm.tsx (34K) : bouton PayPal, gestion erreurs (15+ codes d'erreur), i18n, montants, deduplication, flow authorize+capture |
| C13 | **Audit Pricing Service** | Verifier pricingService.ts : cache 5min, fallback si admin_config/pricing absent, calcul correct lawyer/expat × EUR/USD, overrides promotionnels, coherence avec backend |

#### Sous C2 : Paiements (6)

| # | Agent | Mission |
|---|-------|---------|
| C14 | **Audit createPaymentIntent** | Verifier `createPaymentIntent.ts` (west3) : auth, validation provider actif/visible, pricing config, calcul montants, capture_method:manual, metadata, deduplication 3min, limites journalieres (500€/600$), coupon discount |
| C15 | **Audit StripeManager** | Verifier `StripeManager.ts` (600+ lignes) : creation PI, refund cascade (5 systemes commissions), Destination Charges, circuit breaker, gestion erreurs Stripe API |
| C16 | **Audit Capture Payment** | Verifier le flow de capture APRES l'appel : (a) Ou exactement est `stripe.paymentIntents.capture()` appele ? (b) Avec quel montant ? (c) Le montant capture = montant autorise ? (d) Que se passe-t-il si la capture echoue ? (e) Le transfer vers le provider (Stripe Connect) est-il cree ? |
| C17 | **Audit Refund Logic** | Verifier les 3 chemins de remboursement : (a) Void (pas de capture, duree < 60s), (b) Refund (apres capture, admin), (c) Dispute. Pour chaque : les commissions sont-elles annulees ? Le solde client est-il restaure ? Les notifications sont-elles envoyees ? |
| C18 | **Audit Stripe Connect** | Verifier le flux Stripe Express : (a) `createExpressAccount()` a l'inscription provider, (b) `checkKycStatus()`, (c) `getOnboardingLink()`, (d) Les transfers vers les comptes providers fonctionnent-ils ? (e) Les payouts automatiques sont-ils actives ? |
| C19 | **Audit Stripe Secrets** | Verifier `lib/stripe.ts` : (a) Pas de cle test en production (P0 security), (b) Secrets via Firebase defineSecret, (c) Webhook secrets pour signature validation, (d) Connect webhook secret separe, (e) Mode live/test bien detecte |

#### Sous C3 : Twilio & Appels (7)

| # | Agent | Mission |
|---|-------|---------|
| C20 | **Audit createAndScheduleCall** | Verifier `createAndScheduleCallFunction.ts` (west1, 90s timeout) : auth, rate limiting, validation E164, provider existence+dispo, setProviderBusy (transaction atomique), createCallSession, Cloud Task scheduling (4min), SMS, sync Telegram Engine. Tester chaque etape avec des donnees reelles |
| C21 | **Audit Cloud Tasks** | Verifier `lib/tasks.ts` : (a) `scheduleCallTaskWithIdempotence()` — deduplication par callSessionId, (b) Queue `call-scheduler-queue` (west3), (c) Delai 240s correct, (d) `scheduleProviderAvailableTask()` — cooldown apres no-answer, (e) `scheduleBusySafetyTimeoutTask()` — force release si stuck |
| C22 | **Audit TwilioCallManager** | Verifier `TwilioCallManager.ts` : (a) `initiateConferenceCall()` — appels simultanees provider+client, (b) TwiML genere correctement (multilingue), (c) `findSessionByCallSid()` — mapping correct, (d) `processAMDResult()` — detection repondeur, (e) Circuit breaker Twilio |
| C23 | **Audit twilioWebhooks** | Verifier `twilioWebhooks.ts` (west3) : (a) Signature Twilio validee, (b) Handler pour CHAQUE CallStatus (ringing, answered, in-progress, completed, failed, busy, no-answer), (c) `handleCallCompleted()` calcule duree correcte, (d) `handleCallFailed()` void payment + release provider, (e) Idempotence via `processed_webhook_events` |
| C24 | **Audit IVR/Gather** | Verifier le flux IVR : (a) Prompt multilingue correct ("Appuyez sur 1..."), (b) `twilioGatherResponse` — digit '1' → conference, (c) Timeout → message + hangup, (d) Repondeur (AMD) → hangup, (e) Le DTMF est-il bien capture sur tous les types de telephones ? |
| C25 | **Audit Conference** | Verifier `TwilioConferenceWebhook.ts` (west3) : (a) conference.started, (b) participant.joined — both_connected detecte, (c) participant.left — calcul duree billing, (d) conference.ended — fin propre, (e) recording.available — enregistrement stocke, (f) La duree billing = duree entre both_connected et first_left |
| C26 | **Audit Duree & Billing** | Verifier le calcul de duree : (a) `billingDuration` = temps ou les DEUX participants sont connectes, (b) MIN_CALL_DURATION = 60 secondes, (c) Si duree < 60s → void (pas de capture), (d) Si duree >= 60s → capture le montant complet (pas au prorata), (e) Le maxDuration (20min avocat, 30min expat) est-il enforce ? |

#### Sous C4 : Commissions (6)

| # | Agent | Mission |
|---|-------|---------|
| C27 | **Audit Commission Calculator** | Verifier `unified/commissionCalculator.ts` : (a) Point d'entree pour tous les calculs, (b) Dispatch vers le bon service par role, (c) Les montants sont corrects par plan |
| C28 | **Audit 7 Triggers onCallCompleted** | Pour CHAQUE trigger (chatter, influencer, blogger, groupAdmin, partner, affiliate, telegram) : (a) Se declenche-t-il bien quand call_sessions.status = 'completed' ? (b) Verifie-t-il la duree minimum ? (c) Verifie-t-il que le provider existe ? (d) Le montant de commission est-il correct ? (e) Le solde est-il incremente atomiquement ? |
| C29 | **Audit Plans de Commission** | Verifier `lib/commissionPlans.ts` + Firestore `commission_plans` : (a) Les taux sont corrects par role, (b) Locked rates a l'inscription (immutables), (c) Differenciation lawyer/expat, (d) N1/N2 pour chatters, (e) Pas de plan orphelin |
| C30 | **Audit Annulation Commissions** | Verifier que lors d'un refund, les 5 systemes sont annules : `cancelChatterCommissions()`, `cancelInfluencerCommissions()`, `cancelBloggerCommissions()`, `cancelGroupAdminCommissions()`, `cancelAffiliateCommissions()`. Verifier que les soldes sont decremented |
| C31 | **Audit Soldes Affilies** | Verifier la coherence des soldes : (a) `totalEarned` = somme de toutes les commissions paid, (b) `availableBalance` = totalEarned - withdrawn - pending, (c) `pendingBalance` = commissions en cours de validation, (d) Pas de solde negatif possible, (e) Transaction atomique pour chaque modification |
| C32 | **Audit Leaderboard & Bonus** | Verifier les bonus de retention et le leaderboard : (a) Bonus $50 au demarrage (locked until $150 earned), (b) Top 3 cross-role, (c) Milestones, (d) Les bonus sont-ils credites correctement ? |

#### Sous C5 : Retraits & Payouts (5)

| # | Agent | Mission |
|---|-------|---------|
| C33 | **Audit requestWithdrawal** | Verifier `requestWithdrawal.ts` : (a) Solde suffisant (montant + $3 frais), (b) Seuil minimum $30, (c) Frais $3 fixe deduit, (d) `totalDebited` = amount + fee, (e) Payment method valide, (f) Document cree dans `payment_withdrawals`, (g) Notification Telegram |
| C34 | **Audit Payment Router** | Verifier `paymentRouter.ts` : (a) Routage correct vers Wise (bank) ou Flutterwave (mobile money), (b) Selection basee sur le pays/methode, (c) Fallback si un provider echoue |
| C35 | **Audit Wise Provider** | Verifier `wiseProvider.ts` : (a) Creation quote (taux de change), (b) Creation recipient (coordonnees bancaires), (c) Creation transfer, (d) Funding transfer, (e) Webhook de confirmation, (f) 44+ pays supportes |
| C36 | **Audit Flutterwave Provider** | Verifier `flutterwaveProvider.ts` : (a) Mobile money Afrique (Senegal, Cote d'Ivoire, Ghana, Kenya, Uganda, Tanzania, Nigeria, Zimbabwe), (b) Devises correctes (XOF, GHS, KES, UGX, TZS, NGN), (c) Webhook de confirmation |
| C37 | **Audit Workflow Admin Retraits** | Verifier le workflow admin : pending → validating → approved → processing → sent → completed. Pour chaque etape : (a) Le callable admin est-il protege (auth admin) ? (b) Les notifications sont-elles envoyees ? (c) L'audit trail est-il cree ? (d) Le remboursement fonctionne-t-il (cancel/reject/fail → solde restaure) ? |

#### Sous C6 : Webhooks & Idempotence (5)

| # | Agent | Mission |
|---|-------|---------|
| C38 | **Audit Stripe Webhook Handler** | Verifier `stripeWebhookHandler.ts` (west3) : (a) Signature validation (webhook secret), (b) Les 20+ events sont-ils tous geres ? (c) Idempotence (pas de double-traitement), (d) payment_intent.succeeded/failed, (e) charge.refunded, (f) charge.dispute.*, (g) account.updated (Connect), (h) Erreurs 500 → Stripe retente → idempotence critique |
| C39 | **Audit Twilio Webhook Security** | Verifier : (a) `validateTwilioWebhookSignature()` sur CHAQUE endpoint, (b) Les URLs de callback sont en HTTPS, (c) Les webhooks sont-ils accessibles publiquement ? (d) Rate limiting sur les endpoints webhook |
| C40 | **Audit Idempotence** | Verifier `processed_webhook_events` : (a) Cle unique par event (format `twilio_{CallSid}_{Status}` ou `stripe_{eventId}`), (b) Transaction Firestore pour check+write atomique, (c) TTL ou cleanup des vieux events, (d) Que se passe-t-il si la transaction echoue ? |
| C41 | **Audit Wise/Flutterwave Webhooks** | Verifier les webhooks de paiement sortant : (a) Signature validation, (b) Status mapping correct, (c) Update payment_withdrawals, (d) Notifications de succes/echec |
| C42 | **Audit PayPal Webhooks** | Verifier le handler PayPal : (a) HMAC signature validation, (b) Events supportes, (c) Mapping vers le flow interne, (d) Idempotence |

#### Sous C7 : Erreurs & Recovery (5)

| # | Agent | Mission |
|---|-------|---------|
| C43 | **Audit No-Answer Provider** | Verifier : (a) Timeout IVR → `providerNoAnswerTwiML`, (b) Payment void (pas capture), (c) Provider release (available, pas offline), (d) SMS client "provider indisponible", (e) Commission annulee, (f) Que se passe-t-il si le provider ne decroche JAMAIS (pas meme le IVR) ? |
| C44 | **Audit No-Answer Client** | Verifier : (a) Client ne repond pas → meme flow que provider no-answer, (b) Payment void, (c) Provider released, (d) Le client est-il re-notifie ? |
| C45 | **Audit Provider Stuck Busy** | Verifier `checkProviderInactivity.ts` (cron 15min) : (a) Detecte les providers busy depuis > X minutes, (b) Force `setProviderAvailable()`, (c) AAA profiles exempts, (d) `scheduleBusySafetyTimeoutTask()` comme backup, (e) Logs pour debug |
| C46 | **Audit Stuck Payments** | Verifier `stuckPaymentsRecovery.ts` (cron 30min) : (a) Detecte les paiements autorises mais jamais captures/void, (b) Si call_session terminee → capture ou void selon duree, (c) Si call_session inexistante → void, (d) Logs + alertes admin |
| C47 | **Audit Sessions Orphelines** | Verifier `cleanupOrphanedSessions.ts` (cron quotidien) : (a) Sessions en status pending/connecting depuis > 24h, (b) Void les paiements associes, (c) Release les providers, (d) Archive les sessions |

#### Sous C8 : Securite & Comptabilite (5)

| # | Agent | Mission |
|---|-------|---------|
| C48 | **Audit Encryption** | Verifier `encryption.ts` : (a) AES-256-GCM pour les telephones, (b) Cle de chiffrement via Firebase Secret, (c) encrypt/decrypt round-trip correct, (d) Les telephones sont-ils TOUJOURS chiffres en base ? (e) Decryption seulement au moment de l'appel Twilio |
| C49 | **Audit Factures** | Verifier `generateInvoice.ts` + trigger `onInvoiceRecordCreated` : (a) Facture platform + facture provider pour chaque appel, (b) HTML genere correctement (multilingue), (c) Stockage Firebase Storage, (d) URL signee 1 an, (e) Numero sequentiel unique, (f) Montants corrects (TTC, HT, TVA si applicable) |
| C50 | **Audit Comptabilite** | Verifier `accountingService.ts` : (a) Ecritures pour chaque paiement recu, (b) Ecritures pour chaque commission, (c) Ecritures pour chaque remboursement, (d) Ecritures pour chaque retrait, (e) Balance coherente |
| C51 | **Audit Reconciliation** | Verifier `stripeReconciliation.ts` (cron quotidien) : (a) Compare les paiements Firestore avec Stripe, (b) Detecte les ecarts, (c) Alerte admin si incoherence, (d) Log les resultats |
| C52 | **Audit GDPR** | Verifier : (a) `gdpr/auditTrail.ts` — traces de chaque action, (b) Droit a l'effacement (suppression donnees), (c) Les enregistrements d'appels sont-ils conserves selon la loi ? (d) Les factures sont-elles conservees selon la loi comptable ? |

### Niveau 3 — Validation (1)

| # | Agent | Mission |
|---|-------|---------|
| C53 | **Validateur Final** | Cross-checks Phase 16, rapport final |

---

## PHASE 0 — Protection & Snapshot

- [ ] Sauvegarder tous les fichiers backend modifies
- [ ] Git branch `audit/flux-complet`
- [ ] Compter en Firestore : booking_requests, call_sessions, payments, commissions, payment_withdrawals
- [ ] Verifier les logs Cloud Functions des 7 derniers jours
- [ ] Verifier Stripe Dashboard : paiements recents, disputes, solde
- [ ] Verifier Twilio Console : appels recents, erreurs, solde
- [ ] NE JAMAIS modifier les webhooks Stripe/Twilio sans tester en staging d'abord
- [ ] NE JAMAIS modifier les calculs de montants sans double-verification
- [ ] NE JAMAIS modifier l'encryption sans backup des cles
- [ ] NE JAMAIS deployer un changement sur west3 (paiements/Twilio) sans test complet

---

## PHASES 1-15 : Audit Detaille

> Chaque phase correspond a un directeur (C1-C8) et ses agents.
> Les agents executent les missions detaillees dans la section 3 ci-dessus.
> Chaque agent produit un rapport avec : ✅ OK, ❌ Bug, ⚠️ Warning

---

## PHASE 16 — Audit Inscription & Connexion

**Agents** : C54-C58 (5 agents)

### C54 — Inscription Client (Email + Google)

**Fichiers** : `src/pages/RegisterClient.tsx`, `src/components/registration/client/ClientRegisterForm.tsx`

- [ ] **Email/password** : le formulaire valide-t-il tous les champs ? (email format, password strength, nom)
- [ ] **Google OAuth** : `signInWithPopup(auth, googleProvider)` fonctionne-t-il ? Popup bloque par certains navigateurs ?
- [ ] **Session persistence** : `setPersistence(browserLocalPersistence)` — l'utilisateur reste connecte apres reload ?
- [ ] **Referral code** : `getUnifiedReferralCode()` capture-t-il le `?ref=CODE` depuis sessionStorage ?
- [ ] **Tracking** : `trackMetaCompleteRegistration()` + `trackGoogleAdsSignUp()` fires au succes ?
- [ ] **Redirect** : apres inscription, ou est redirige le client ? Whitelist `isAllowedRedirect()` ?
- [ ] **Erreurs** : que se passe-t-il si email deja utilise ? Si Google OAuth echoue ? Messages d'erreur i18n ?
- [ ] **WhatsApp Groups** : integration post-inscription — fonctionne-t-elle ?

### C55 — Inscription Provider (Avocat/Expat)

**Fichiers** : `src/pages/RegisterLawyer.tsx`, `src/pages/RegisterExpat.tsx`, `LawyerRegisterForm.tsx`, `ExpatRegisterForm.tsx`

- [ ] **Multi-step wizard** : chaque etape valide-t-elle avant de passer a la suivante ?
- [ ] **Donnees collectees** : nom, email, telephone (E164), pays, specialites, langues, photo, bio
- [ ] **KYC fields** : les champs requis pour Stripe Connect sont-ils collectes ?
- [ ] **Trigger `onProviderCreated`** : (a) Cree automatiquement le compte Stripe Express ? (b) Pour les 46 pays Stripe seulement ? (c) PayPal email store pour les 151+ autres pays ? (d) `isVisible: false` par defaut ? (e) Meta CAPI `trackCAPILead()` fire ?
- [ ] **Slug generation** : `generateMultilingualSlugs()` est-il appele a l'inscription ? Ou plus tard ?
- [ ] **Termes affilies** : `termsAffiliateVersion` + `termsAffiliateType` persistes ?
- [ ] **CGU** : checkbox fusionnee couvre CGU role + terms_affiliate + privacy policy ?

### C56 — Inscription Affilies (Chatter/Blogger/Influencer/GroupAdmin)

**Fichiers** : `registerChatter.ts`, `registerBlogger.ts`, `registerInfluencer.ts`, `registerGroupAdmin.ts`

Pour CHAQUE type :
- [ ] **Codes generes** : `affiliateCodeClient` + `affiliateCodeRecruitment` uniques ?
- [ ] **Activation immediate** : `status: "active"` des l'inscription ?
- [ ] **Bonus $50** : credite dans tirelire (locked until $150 commissions) pour Chatters ?
- [ ] **Telegram link** : `generateTelegramLink()` pour Chatters — fonctionne-t-il ?
- [ ] **Plan de commission** : le bon plan est-il associe (locked rates) ?

### C57 — Login & Auth

**Fichiers** : `src/pages/Login.tsx` (56KB), `src/config/firebase.ts`, `src/pages/PasswordReset.tsx`

- [ ] **Email/password login** : fonctionne-t-il ? Erreurs claires si mauvais mot de passe ?
- [ ] **Google OAuth** : popup, redirect, ou les deux ?
- [ ] **Password reset** : email envoye ? Lien valide ? Page de reset fonctionne ?
- [ ] **Firebase Auth config** : Force Long Polling (HTTP, pas WebSocket) — pour eviter les problemes de proxy/firewall ?
- [ ] **Persistence IndexedDB** : cache offline-first, `persistentMultipleTabManager` — multi-onglet OK ?
- [ ] **Extension error suppression** : `isExtensionBlockedError()` — les extensions navigateur ne cassent pas le login ?
- [ ] **Redirect apres login** : vers le bon dashboard selon le role (client/lawyer/expat/chatter/admin) ?

### C58 — Auth State & Session

- [ ] Le token Firebase Auth est-il rafraichi automatiquement (1h lifetime) ?
- [ ] Que se passe-t-il si le token expire pendant un booking ? (mid-checkout)
- [ ] Les callable functions verifient-elles `request.auth` ? → Si manquant, erreur 'unauthenticated' ?
- [ ] Le logout deconnecte-t-il de TOUTES les tabs (multi-tab support) ?
- [ ] Le `generateOutilToken()` pour l'outil IA : le token custom est-il valide ? (signed par service account Outil)

---

## PHASE 17 — Audit Outil IA (GPT/Claude/Perplexity)

**Agents** : C59-C63 (5 agents)

### C59 — AI Providers

**Fichiers** : `Outil-sos-expat/functions/src/ai/providers/claude.ts`, `openai.ts`, `perplexity.ts`

| Provider | Modele | Usage | Secret |
|----------|--------|-------|--------|
| Claude (Anthropic) | claude-3-5-sonnet | Avocats (raisonnement legal) | ANTHROPIC_API_KEY (Outil) |
| GPT-4o (OpenAI) | gpt-4o | Expats (conseils pratiques) | OPENAI_API_KEY |
| Perplexity | — | Recherche web + citations | PERPLEXITY_API_KEY (Outil) |

- [ ] Les 3 providers repondent-ils ? (tester chaque avec un prompt simple)
- [ ] Les timeouts sont-ils configures ? (30s par defaut — suffisant ?)
- [ ] Les erreurs API sont-elles gerees ? (rate limit, timeout, 500)
- [ ] Les tokens/couts sont-ils trackes ? (combien coute chaque appel IA ?)

### C60 — Hybrid Retry System

**Fichier** : `Outil-sos-expat/functions/src/ai/services/hybrid.ts`

- [ ] Si Claude echoue → fallback vers GPT-4o ? → fallback vers Perplexity ?
- [ ] Le retry est-il configurable ? (nombre de tentatives, delai)
- [ ] Les erreurs de fallback sont-elles loggees ?
- [ ] Si TOUS les providers echouent → quel message l'utilisateur voit-il ?

### C61 — SSO Outil (Token Generation)

**Fichier** : `auth/generateOutilToken.ts`

- [ ] `generateOutilToken(providerUid)` : (a) Verifie la subscription ? (b) Cree un custom token signe par le service account Outil ? (c) Le token est-il valide pour `signInWithCustomToken()` cote Outil ?
- [ ] `syncLinkedProvidersToOutil()` : synchronise les donnees provider vers Outil Firestore
- [ ] Si la subscription a expire → l'acces est-il bloque ?

### C62 — Monitoring Soldes API IA

**MANQUE CRITIQUE** : Il n'y a probablement PAS de monitoring des soldes/credits API IA.

- [ ] **OpenAI** : quel est le solde restant ? Y a-t-il une limite de depense configuree ?
- [ ] **Anthropic** : quel est le solde ? Alerte si < $50 ?
- [ ] **Perplexity** : quel est le solde ?
- [ ] Proposer un cron qui verifie les soldes des 3 providers IA et alerte via Telegram si < seuil
- [ ] Proposer un dashboard admin affichant les couts IA par jour/semaine/mois

### C63 — Qualite Reponses IA

- [ ] Les reponses sont-elles dans la bonne langue ? (9 langues)
- [ ] Les reponses legales (avocats) contiennent-elles un disclaimer ?
- [ ] Les citations Perplexity sont-elles valides ? (liens fonctionnels)
- [ ] Le temps de reponse moyen est-il acceptable ? (< 10s)

---

## PHASE 18 — Audit Subscriptions

**Agents** : C64-C66 (3 agents)

### C64 — Subscription Checkout

**Fichier** : `subscription/checkout.ts`

- [ ] Les tiers sont-ils corrects ? (trial, basic, standard, pro, unlimited)
- [ ] Les prix EUR/USD sont-ils coherents avec Stripe ?
- [ ] Le trial period est-il configurable ?
- [ ] La detection devise par pays fonctionne-t-elle ? (Eurozone → EUR, autres → USD)
- [ ] Les Stripe Price IDs correspondent-ils aux produits dans la console Stripe ?

### C65 — Subscription Webhooks

**Fichier** : `subscription/webhooks.ts` (125KB)

- [ ] `customer.subscription.created` : le doc Firestore est-il cree ?
- [ ] `customer.subscription.updated` : les changements de tier sont-ils refletes ?
- [ ] `customer.subscription.deleted` : l'acces est-il revoque ?
- [ ] `invoice.payment_failed` : l'utilisateur est-il notifie ? Retry automatique Stripe ?
- [ ] `customer.subscription.trial_will_end` : email de rappel ?
- [ ] Dead letter queue (`deadLetterQueue.ts`) : les webhooks echoues sont-ils retraites ?

### C66 — Access Control

**Fichier** : `subscription/accessControl.ts`

- [ ] Les features sont-elles gatees par tier ? (nombre d'appels IA, fonctionnalites)
- [ ] Un provider sans subscription peut-il acceder a l'outil IA ?
- [ ] `billingPortal.ts` : le lien de gestion Stripe fonctionne-t-il ?

---

## PHASE 19 — Audit Monitoring Bot 24/7 & Alertes

> **C'EST LA PHASE LA PLUS CRITIQUE POUR LA PERENNITE DU BUSINESS.**
> Si le systeme tombe et que personne n'est alerte, le chiffre d'affaires tombe a ZERO.

**Agents** : C67-C75 (9 agents)

### C67 — Audit Monitoring Existant

**Fichier** : `monitoring/functionalMonitoring.ts` (1173 lignes)

Le systeme a deja un monitoring. Verifier qu'il FONCTIONNE :

| Check | Frequence | Alerte si... | Fonctionne ? |
|-------|-----------|-------------|-------------|
| Signup funnel | 2x/jour (9h, 18h) | >30% abandon form OU 0 signups avec >10 vues | |
| Booking funnel | 2x/jour | 0 bookings en 48h avec >20 recherches | |
| Form errors | 2x/jour | >5% taux erreur avec ≥5 erreurs | |
| Meta CAPI health | 2x/jour | 0 events CAPI malgre trafic | |
| Provider availability | 2x/jour | <3 providers disponibles | |
| Payment flow | Toutes les 4h | <20% conversion checkout OU 100% echec Stripe/PayPal | |
| Commission pending | 2x/jour | >10 commissions pending >7 jours | |

- [ ] Les crons s'executent-ils ? (verifier Cloud Scheduler)
- [ ] Les alertes sont-elles envoyees ? (verifier collections `functional_alerts`, `system_alerts`)
- [ ] Les notifications arrivent-elles par email ET Telegram ?
- [ ] Le cleanup hebdomadaire fonctionne-t-il ?

### C68 — Monitoring Soldes Services (EXISTE — `serviceAlerts.ts`)

**Le systeme `serviceAlerts.ts` existe DEJA et couvre : Twilio, Stripe, OpenAI, Anthropic, Perplexity**

**Seuils par defaut** : Twilio $50, Stripe €500, OpenAI $20, Anthropic $20, Perplexity $10
**Seuils configurables** via Firestore `service_balance_thresholds/{service}`
**Alertes** : Email + Firestore `admin_notifications` + Telegram Engine (AJOUTE 2026-03-18)

**✅ CORRECTION APPLIQUEE** :
- Frequence : 1×/jour → **6×/jour** (toutes les 4h : 2h,6h,10h,14h,18h,22h Paris)
- Ajout envoi Telegram via `forwardEventToEngine('service-balance-alert')` avec message formate
- Route ajoutee dans Telegram Engine : `POST /api/events/service-balance-alert`
- Handler `serviceBalanceAlert()` dans EventController + `sendRawToMainBot()` dans NotificationService

**A VERIFIER** :
- [ ] Le cron `checkServiceBalances` s'execute-t-il apres deploy ? (verifier Cloud Scheduler)
- [ ] Les seuils dans `service_balance_thresholds` sont-ils configures ? (ou utilise les defaults)
- [ ] Le Telegram Engine recoit-il bien l'event `service-balance-alert` ? (verifier les logs)
- [ ] L'alerte Telegram arrive-t-elle dans le chat admin ?
- [ ] **Circuit breaker Twilio** : `isCircuitOpen()` — seuil = 3 echecs consecutifs, reset apres 15s (P0 FIX). Verifier que le reset fonctionne
- [ ] **Numero Twilio** : le numero est-il actif ? (verifier Twilio console)

### C69 — Monitoring Stripe (COUVERT par serviceAlerts)

- [ ] `getStripeBalance()` callable admin — fonctionne-t-il ?
- [ ] Le seuil Stripe (€500 default) est-il adequat pour couvrir les payouts providers ?
- [ ] **Disputes** : `charge.dispute.created` webhook envoie-t-il une notification Telegram ? (via payout_failed event ?)
- [ ] **Reconciliation** : `stripeReconciliation.ts` fonctionne-t-il quotidiennement ?
- [ ] **Taux d'echec paiements** : `functionalMonitoring.ts` le verifie-t-il ? (oui, payment_flow check toutes les 4h)

### C70 — Monitoring PayPal

- [ ] PayPal n'est PAS dans `serviceAlerts.ts` (pas d'API balance PayPal facilement accessible)
- [ ] `paypalMaintenance.ts` : que fait-il exactement ? Suffisant ?
- [ ] `payout_failed` event vers Telegram Engine : fonctionne-t-il pour les echecs PayPal ?

### C71 — Monitoring API IA (COUVERT par serviceAlerts)

**Le systeme `serviceAlerts.ts` couvre deja OpenAI, Anthropic, Perplexity avec seuils $20/$20/$10**

Callables admin existants : `getOpenAIUsage`, `getPerplexityUsage`, `getAnthropicUsage`

- [ ] Les callables de monitoring IA fonctionnent-ils ? (tester chaque)
- [ ] Les seuils ($20) sont-ils suffisants ? (dependra du volume d'utilisation)
- [ ] Le check de balance fonctionne-t-il reellement pour chaque provider ? (certaines APIs n'exposent pas le solde)
- [ ] Proposer : un health check actif (envoyer un prompt test) en plus du check de solde

### C72 — Monitoring Wise/Flutterwave (Retraits)

- [ ] Wise et Flutterwave ne sont PAS dans `serviceAlerts.ts` — proposer de les ajouter
- [ ] `pendingTransfersMonitor.ts` : fonctionne-t-il ? Alertes envoyees ?
- [ ] `payout_failed` event : couvre-t-il les echecs Wise et Flutterwave ?

### C73 — Monitoring Infrastructure Firebase

- [ ] **Cloud Functions quota** : CPU, memoire, instances — y a-t-il des alertes Google Cloud ?
- [ ] **Firestore quota** : lectures/ecritures/jour — pres de la limite ?
- [ ] **Storage** : espace utilise — alerte si > 80% ?
- [ ] **Cloud Tasks** : la queue `call-scheduler-queue` fonctionne-t-elle ? Pas de tasks stuck ?

### C74 — Bot Telegram Centralise (PROPOSER SI ABSENT)

**Objectif** : UN bot Telegram qui alerte pour TOUS les problemes, avec niveaux de severite.

```
STRUCTURE PROPOSEE :

Bot : @sos_expat_monitoring_bot (ou utiliser @sos_expat_bot existant)
Chat : 7560535072 (admin)

ALERTES PAR CATEGORIE :

🔴 CRITICAL (action immediate requise) :
  - Solde Twilio < $20 (plus d'appels)
  - Stripe webhook 100% echec
  - 0 paiements reussis en 2h (avec trafic)
  - Tous les providers offline
  - Cloud Functions crashent (5xx > 10% en 15min)
  - API IA tous down (outil inutilisable)

🟠 WARNING (investigation requise dans l'heure) :
  - Solde Twilio < $50
  - Taux echec paiements > 5%
  - Provider stuck busy > 30min
  - Retrait echoue (Wise/Flutterwave)
  - API IA partiellement down (1/3 echoue)
  - Dispute Stripe recue
  - Solde API IA < $50

🟡 INFO (a verifier dans la journee) :
  - Nouveau signup provider
  - Paiement recu
  - Retrait traite
  - Rapport quotidien (CA, appels, nouveaux users)
  - Solde quotidien : Twilio, Stripe, Wise, IA

📊 RAPPORT QUOTIDIEN (9h Paris) :
  - CA du jour precedent
  - Nombre d'appels (succes/echec)
  - Nouveaux users (clients/providers/affilies)
  - Soldes : Twilio $X, Stripe $X, Wise $X, OpenAI $X, Claude $X
  - Providers disponibles : X/Y
  - Alertes des 24h
```

- [ ] Ce systeme existe-t-il ? → Partiellement (Telegram Engine gere certaines alertes)
- [ ] Proposer les alertes manquantes et les implementer

### C75 — Uptime Monitoring Externe

- [ ] Y a-t-il un monitoring externe (UptimeRobot, BetterUptime, Pingdom) ?
- [ ] **Si non** : CREER des checks :
  | URL | Frequence | Alerte si... |
  |-----|-----------|-------------|
  | https://sos-expat.com | 1 min | Status != 200 |
  | https://sos-expat.com/fr-fr/ | 5 min | Status != 200 ou body < 1000 chars |
  | Stripe webhook endpoint | 5 min | Status != 200 |
  | Twilio webhook endpoint | 5 min | Status != 200 |
  | Outil IA endpoint | 5 min | Status != 200 |
  | Telegram Engine | 5 min | Status != 200 |
- [ ] Alertes SMS + email + Telegram si down > 2 minutes
- [ ] Status page publique ? (optionnel mais utile)

---

## PHASE 20 — Audit 20 Dependances API Externes

> Le systeme depend de 20+ APIs externes. Si UNE tombe, une partie du business est impactee.

| # | API | Secret | Usage | Impact si down | Monitoring actuel |
|---|-----|--------|-------|---------------|-------------------|
| 1 | **Twilio** | TWILIO_ACCOUNT_SID + AUTH_TOKEN | Appels telephoniques | ❌ ZERO CA | ✅ serviceAlerts (4h) + circuit breaker + getTwilioBalance |
| 2 | **Stripe** | STRIPE_SECRET_KEY | Paiements clients | ❌ ZERO CA | ✅ serviceAlerts (4h) + stripeReconciliation cron |
| 3 | **PayPal** | PAYPAL_CLIENT_ID + SECRET | Paiements alternatifs | ⚠️ CA reduit | ⚠️ paypalMaintenance cron (pas de balance check) |
| 4 | **Wise** | WISE_API_TOKEN | Retraits bancaires | ⚠️ Retraits bloques | ⚠️ pendingTransfersMonitor (pas dans serviceAlerts) |
| 5 | **Flutterwave** | FLUTTERWAVE_SECRET_KEY | Mobile money Afrique | ⚠️ Retraits bloques | ⚠️ webhookFlutterwave (pas dans serviceAlerts) |
| 6 | **OpenAI** | OPENAI_API_KEY | GPT-4o (outil IA) | ⚠️ Outil IA degrade | ✅ serviceAlerts (4h) + getOpenAIUsage |
| 7 | **Anthropic** | ANTHROPIC_API_KEY | Claude (outil IA) | ⚠️ Outil IA degrade | ✅ serviceAlerts (4h) + getAnthropicUsage |
| 8 | **Perplexity** | PERPLEXITY_API_KEY | Recherche web (outil IA) | ⚠️ Outil IA degrade | ✅ serviceAlerts (4h) + getPerplexityUsage |
| 9 | **Firebase Auth** | (intterne) | Authentification | ❌ PERSONNE ne peut se connecter | ❌ AUCUN |
| 10 | **Firestore** | (interne) | Base de donnees | ❌ TOUT tombe | ❌ AUCUN |
| 11 | **Cloud Tasks** | (interne) | Scheduling appels | ❌ Appels non declenches | ❌ AUCUN |
| 12 | **Firebase Storage** | (interne) | Factures, photos | ⚠️ Factures inaccessibles | ❌ AUCUN |
| 13 | **Telegram Bot API** | TELEGRAM_BOT_TOKEN | Notifications admin | ⚠️ Pas d'alertes | ❌ AUCUN |
| 14 | **Zoho Email** | EMAIL_USER + PASS | Emails transactionnels | ⚠️ Pas d'emails | ❌ AUCUN |
| 15 | **Mailwizz** | MAILWIZZ_API_KEY | Email marketing | 🔵 Marketing stoppe | ❌ AUCUN |
| 16 | **Cloudflare** | (interne) | CDN, DNS, Pages | ❌ Site inaccessible | ❌ AUCUN |
| 17 | **Meta CAPI** | META_CAPI_TOKEN | Conversions Facebook | 🔵 Tracking degrade | functionalMonitoring |
| 18 | **Google Ads API** | GOOGLE_ADS_* | Conversions Google | 🔵 Tracking degrade | ❌ AUCUN |
| 19 | **Sentry** | SENTRY_DSN | Error tracking | 🔵 Pas de visibilite erreurs | ❌ AUCUN |
| 20 | **Telegram Engine** | TELEGRAM_ENGINE_URL | Bot Telegram | ⚠️ Pas de notifications | ❌ AUCUN |

**CONSTAT** : Apres correction du 2026-03-18, 8/20 dependances ont un monitoring actif (serviceAlerts toutes les 4h + Telegram). Les 12 autres (Firebase interne, Telegram Bot, Zoho, Cloudflare, etc.) n'ont pas de monitoring automatise.

Pour CHAQUE dependance :
- [ ] La cle/secret est-elle valide et non expiree ?
- [ ] Y a-t-il un monitoring actif ?
- [ ] Si non : CREER un health check avec alerte Telegram
- [ ] Le fallback est-il implemente ? (ex: si Stripe down → message client "reessayez plus tard")

---

## PHASE 21 — Audit Firestore Rules, Reviews, Coupons, Backups, Disputes

**Agents** : C83-C95 (13 agents)

### C83 — Firestore Security Rules

**Fichier** : `sos/firestore.rules`

- [ ] Les champs financiers (role, isApproved, isBanned) sont-ils immutables par les users ?
- [ ] Les `sos_profiles` ne sont visibles que si `isVisible==true` OU owner OU admin ?
- [ ] Les `payments` et `call_sessions` sont-ils restreints aux parties impliquees + admin ?
- [ ] Les `reviews` publiees sont-elles publiques, non publiees reservees a l'auteur/provider/admin ?
- [ ] L'agency_manager peut-il acceder aux profiles de ses `linkedProviderIds` ?
- [ ] Un utilisateur non authentifie peut-il lire/ecrire QUOI QUE CE SOIT ? → doit etre NON
- [ ] Les `commissions` et `payment_withdrawals` sont-elles protegees ?
- [ ] Tester : un client peut-il modifier le champ `amount` d'un payment ? → DOIT echouer

### C84 — Provider Search & Discovery

**Fichiers** : `src/pages/ProviderProfile.tsx`, `multilingualSearch.ts`

- [ ] Comment les clients trouvent-ils un prestataire ? (page de recherche, filtres, matching)
- [ ] Filtres disponibles : specialites, langues, pays, disponibilite, rating
- [ ] Les providers `isVisible=false` sont-ils exclus de la recherche ?
- [ ] Les providers `isActive=false` ou `isBanned=true` sont-ils exclus ?
- [ ] Le slug multilingue fonctionne-t-il pour acceder au profil ?
- [ ] Le statut temps reel (en ligne/occupe/hors ligne) est-il affiche ?

### C85 — Review System

**Fichiers** : `src/components/review/ReviewForm.tsx`, `ReviewModal.tsx`

- [ ] Le formulaire de review s'affiche-t-il apres un appel complete (>60s) ?
- [ ] Rating 1-5 obligatoire + commentaire (1-2000 chars)
- [ ] Les reviews negatives declenchent-elles une alerte Telegram ?
- [ ] Un client peut-il laisser un review sans avoir appele ? → DOIT etre NON
- [ ] Le provider peut-il modifier/supprimer un review ? → NON (toggle isPublic seulement)
- [ ] Le calcul du rating moyen est-il correct ? (moyenne ponderee)

### C86 — Coupon/Promo System

**Fichier** : `functions/src/callables/validateCoupon.ts`

- [ ] Validation serveur : coupon existe, actif, date valide, type de service, montant minimum
- [ ] Limites d'usage : total (`max_uses_total`) + par utilisateur (`max_uses_per_user`)
- [ ] Calcul reduction : fixe OU pourcentage avec cap `maxDiscount`
- [ ] Detection abus : 5 tentatives echouees → alerte securite
- [ ] Le discount est-il correctement applique dans createPaymentIntent ?
- [ ] Le montant facture APRES discount est-il coherent avec le montant Stripe ?

### C87 — 3D Secure / SCA (Paiements EU)

**Fichier** : `createPaymentIntent.ts`

- [ ] Stripe gere-t-il automatiquement SCA pour les cartes EU ?
- [ ] Le statut `requires_action` est-il gere dans CallCheckout.tsx ? (modal 3DS)
- [ ] Apres la verification 3DS, le flow reprend-il correctement ?
- [ ] Les paiements non-EU (pas de SCA) fonctionnent-ils aussi ?

### C88 — Call Recording

**Fichier** : `TwilioCallManager.ts`, `TwilioConferenceWebhook.ts`

- [ ] Les enregistrements sont-ils stockes ? Ou ? (Twilio cloud)
- [ ] `recordingSid` et `recordingUrl` sont-ils persistes dans `call_sessions` ?
- [ ] Politique de retention Twilio : combien de temps ?
- [ ] Acces : seuls owner/provider/admin peuvent ecouter ?
- [ ] RGPD : les participants sont-ils informes de l'enregistrement ? (IVR)

### C89 — SMS Notifications

**Fichier** : `notificationPipeline/providers/sms/sendSms.ts`

- [ ] Sender ID : "SOS-Expat" (alphanumerique) pour la plupart, +447427874305 pour USA/Canada/Chine
- [ ] Rate limiting : 10 SMS/heure par numero, 100/heure global
- [ ] Les SMS sont-ils envoyes pour : booking confirme, appel en cours, paiement recu, retrait traite ?
- [ ] Les SMS internationaux fonctionnent-ils ? (197 pays)
- [ ] Le cout SMS est-il suivi ? (impact sur solde Twilio)

### C90 — Exchange Rates

**Fichier** : `accounting/scheduled/fetchDailyExchangeRates.ts`

- [ ] Cron Lun-Ven 16h CET (apres publication ECB 15h45)
- [ ] Source : ECB (European Central Bank) API
- [ ] Stocke dans `exchange_rates` Firestore
- [ ] Utilise pour : commissions multi-devises, rapports, conversions
- [ ] Que se passe-t-il le weekend ? (dernier taux vendredi utilise)

### C91 — Backup System

**Fichiers** : `scheduled/multiFrequencyBackup.ts`, `scheduled/crossRegionBackup.ts`

- [ ] 3x par jour (3h, 11h, 19h Paris) → RPO max 8h
- [ ] Collections sauvegardees : users, sos_profiles, call_sessions, payments, subscriptions, invoices
- [ ] Retention : 30 jours standard, donnees financieres JAMAIS supprimees (10 ans compliance)
- [ ] Cross-region : copie DR vers west3 ou central1 quotidien 4h
- [ ] Checksums SHA256 : integrite verifiee
- [ ] Restauration : callable admin `restoreCollection.ts` — fonctionne-t-elle ?
- [ ] Les backups s'executent-ils ? (verifier les logs des 7 derniers jours)

### C92 — Provider Approval Workflow

**Fichier** : `admin/profileValidation.ts`

- [ ] Flow : pending → in_review → approved/rejected/changes_requested
- [ ] `approveProfile()` : sets `isApproved=true`, `isVisible=true`, verifie KYC
- [ ] `rejectProfile()` : raison detaillee, notification provider
- [ ] `requestChanges()` : renvoie le provider en mode edition
- [ ] Audit trail : `validation_history` sub-collection
- [ ] Le provider est-il notifie a chaque changement de statut ?

### C93 — Dispute Manager

**Fichier** : `DisputeManager.ts`

- [ ] `charge.dispute.created` → log + notifie provider + admin
- [ ] `charge.dispute.closed` → si perdu : annule TOUTES les commissions (5 systemes)
- [ ] Architecture Direct Charges → disputes sont la responsabilite du provider
- [ ] L'admin est-il alerte immediatement ?
- [ ] Evidence submission : le provider peut-il soumettre des preuves ?

### C94 — Dead Letter Queue

**Fichier** : `scheduled/processDLQ.ts`

- [ ] Cron horaire : retraite les webhooks echoues (Stripe subscriptions, disputes, etc.)
- [ ] Batch de 10 events par run
- [ ] Retry logic avec tracking du nombre de tentatives
- [ ] Cleanup hebdomadaire (garde 30 jours)
- [ ] Admin tools : `adminForceRetryDLQEvent()`, `adminGetDLQStats()`
- [ ] Alerte si le backlog DLQ grandit

### C95 — Notification Pipeline

**Fichier** : `notificationPipeline/routing.ts`

- [ ] 5 canaux : email (Zoho), push (FCM), in-app (Firestore), SMS (Twilio), WhatsApp
- [ ] Strategie : parallele (tous) OU sequentiel (fallback)
- [ ] Rate limiting par event par user
- [ ] Retry : 1-3 tentatives configurables par canal
- [ ] Tracking : `message_deliveries` collection
- [ ] i18n : messages dans 9 langues via `message_templates`
- [ ] Config : `message_routing` Firestore document

---

## PHASE 22 — Cross-Checks & Tests E2E

### Cross-Check 1 : Montants Coherents
```
Pour 10 appels recents dans call_sessions :
  montant call_sessions.payment.amount
  = montant payments/{PI}.amount
  = montant Stripe PaymentIntent (via API)
  = montant facture invoice_records
  Si ECART → bug critique de perte d'argent
```

### Cross-Check 2 : Commissions ↔ Appels
```
Pour 10 appels completed :
  Compter les commissions creees
  Verifier que CHAQUE systeme affilie applicable a cree sa commission
  Verifier que le montant total commissions <= montant total appel
```

### Cross-Check 3 : Soldes Affilies ↔ Commissions
```
Pour 10 affilies (chatters, influencers) :
  availableBalance = SUM(commissions.status='available') - SUM(withdrawals.status='completed')
  Si ECART → bug de solde (critique)
```

### Cross-Check 4 : Providers Stuck Busy
```
Query sos_profiles WHERE availability='busy' AND busySince < (now - 30min) :
  Chaque provider busy depuis > 30min est un BUG
  Verifier que checkProviderInactivity les detecte
```

### Cross-Check 5 : Paiements Orphelins
```
Query payments WHERE status='authorized' AND createdAt < (now - 1h) :
  Chaque PI autorise depuis > 1h sans capture ni void est un LEAK
  Verifier que stuckPaymentsRecovery les detecte
```

### Cross-Check 6 : Refund ↔ Commissions Annulees
```
Pour chaque refund dans les 30 derniers jours :
  Verifier que TOUTES les commissions du call_session sont status='cancelled'
  Si une commission survit au refund → perte d'argent
```

### Cross-Check 7 : Duree Billing ↔ Capture
```
Pour 10 appels completed :
  Si billingDuration < 60s → payment.status devrait etre 'voided' (pas 'captured')
  Si billingDuration >= 60s → payment.status devrait etre 'captured'
  Toute incoherence = bug
```

### Cross-Check 8 : Webhooks Idempotence
```
Query processed_webhook_events :
  Y a-t-il des doublons (meme cle) ?
  Y a-t-il des events sans traitement correspondant dans call_sessions ?
  Le cleanup des vieux events fonctionne-t-il ?
```

### Cross-Check 9 : Factures ↔ Paiements
```
Pour 10 paiements captures :
  Verifier qu'une facture platform ET une facture provider existent
  Verifier que les montants correspondent
  Verifier que les URLs de telechargement fonctionnent
```

### Cross-Check 10 : Retraits ↔ Soldes
```
Pour 5 retraits completed :
  availableBalance AVANT retrait - totalDebited = availableBalance APRES
  Le montant recu par le beneficiaire = amount - fees
  Le webhook Wise/Flutterwave a bien confirme
```

### Cross-Check 11 : Multi-Provider Busy Propagation
```
Pour un provider avec linkedProviderIds + shareBusyStatus=true :
  Quand le provider principal est busy → les linked sont aussi busy ?
  Quand le principal est release → les linked sont release ?
  Transaction atomique sur tous les providers ?
```

### Cross-Check 12 : Encryption Round-Trip
```
Pour 5 providers :
  Lire le telephone chiffre en base
  Dechiffrer avec decryptPhoneNumber()
  Le resultat est-il un numero E164 valide ?
  Le re-chiffrement donne-t-il le meme ciphertext ? (non si IV aleatoire — mais le dechiffrement doit toujours donner le meme plaintext)
```

### Cross-Check 13 : Firestore Rules ↔ Vrais Acces
```
Tester avec un SDK Firebase cote client (ou emulateur) :
  1. User non-authentifie : peut-il lire sos_profiles ? → OUI (publics visibles)
  2. User non-authentifie : peut-il ecrire payments ? → NON
  3. Client authentifie : peut-il modifier son propre role ? → NON
  4. Client authentifie : peut-il lire les commissions d'un autre ? → NON
  5. Provider : peut-il modifier isApproved ? → NON
  6. Admin : peut-il tout faire ? → OUI
```

### Cross-Check 14 : Coupon ↔ Montant Final
```
Pour 3 coupons differents (fixe, %, max cap) :
  1. Appliquer le coupon dans CallCheckout
  2. Verifier que le montant envoye a createPaymentIntent est correct (apres discount)
  3. Verifier que le montant Stripe PI = montant affiche au client
  4. Verifier que la facture reflete le discount
```

### Cross-Check 15 : Review ↔ Rating Moyen
```
Pour 5 providers avec des reviews :
  1. Calculer manuellement la moyenne des ratings
  2. Comparer avec sos_profiles.rating
  3. Si ecart → bug dans le calcul incrementiel
```

### Cross-Check 16 : Backup Integrite
```
Pour le dernier backup :
  1. Verifier que le fichier existe dans Storage
  2. Verifier le checksum SHA256
  3. Verifier que le nombre de documents = nombre actuel en Firestore
  4. Tester une restauration sur un emulateur
```

### Cross-Check 17 : Dispute ↔ Commissions
```
Pour chaque dispute "lost" des 90 derniers jours :
  1. Verifier que TOUTES les commissions du call_session sont annulees
  2. Verifier que le solde des affilies a ete decremente
  3. Si une commission survit → perte d'argent
```

### Cross-Check 18 : Notification Delivery
```
Pour 10 evenements recents (paiement, appel, retrait) :
  1. Verifier dans message_deliveries que les notifications sont envoyees
  2. Pour chaque canal (email, SMS, push, in-app) : statut = delivered ?
  3. Si un canal echoue systematiquement → probleme de credentials ou quota
```

### Cross-Check 19 : Inscription ↔ Trigger ↔ Stripe
```
Pour 5 providers inscrits recemment :
  1. Le trigger onProviderCreated a-t-il fire ?
  2. Un compte Stripe Express a-t-il ete cree ? (stripeAccountId present ?)
  3. Si pays non-Stripe (151+) : paypalEmail present ?
  4. isVisible = false par defaut (en attente d'approbation) ?
```

### Cross-Check 20 : Outil IA ↔ Subscription
```
Pour 5 providers avec subscription :
  1. Le tier dans Firestore correspond-il au tier Stripe ?
  2. generateOutilToken() fonctionne-t-il ? (token valide)
  3. accessControl() autorise-t-il les features du bon tier ?
  4. Si subscription expiree → l'acces est-il bloque ?
```

### Test E2E Complet (Scenario Nominal)
```
1. Client cree un booking (BookingRequest)
2. Client paie via Stripe (CallCheckout → createPaymentIntent)
3. Client confirme (createAndScheduleCallHTTPS)
4. Attendre 4 minutes
5. Provider recoit l'appel, appuie 1
6. Client recoit l'appel, appuie 1
7. Conference demarre
8. Attendre 2 minutes (> 60s minimum)
9. Un participant raccroche
10. Verifier :
    - call_sessions.status = 'completed'
    - payment.status = 'captured'
    - Factures creees (2)
    - Commissions creees (selon affilies)
    - Provider release (available)
    - Notifications envoyees
```

### Test E2E (Scenario Erreur : Provider No-Answer)
```
1-4. Meme que nominal
5. Provider ne repond PAS (timeout 30s)
6. Verifier :
    - call_sessions.status = 'failed' ou 'no_answer'
    - payment.status = 'voided'
    - Provider release (available)
    - AUCUNE commission creee
    - Client notifie
```

### Test E2E (Scenario Erreur : Appel < 60s)
```
1-7. Meme que nominal
8. Raccrocher apres 30 secondes
9. Verifier :
    - call_sessions.status = 'completed' mais billingDuration < 60
    - payment.status = 'voided' (PAS captured)
    - AUCUNE commission
    - Client rembourse
```

---

## PHASE 23 — Plan d'Action

### Priorisation

| P | Type | Description | Impact |
|---|------|-------------|--------|
| P0 | **Perte d'argent** | Montants incoherents, captures incorrectes, commissions survivant aux refunds | Financier direct |
| P0 | **Provider stuck busy** | Ne recoit plus d'appels → perte de revenus | Business critique |
| P0 | **Paiement orphelin** | PI autorise jamais capture/void → argent bloque | Financier |
| P1 | **Webhook non-idempotent** | Double-traitement → double commission/double capture | Financier |
| P1 | **Refund incomplet** | Commission non annulee → perte d'argent | Financier |
| P1 | **Duree mal calculee** | Capture un appel < 60s ou void un appel > 60s | Financier + UX |
| P2 | **Facture manquante** | Pas de facture pour un appel paye | Legal |
| P2 | **Notification manquante** | Provider/client pas prevenu | UX |
| P3 | **Encryption faible** | Telephones mal chiffres | Securite/GDPR |
| P3 | **Audit trail incomplet** | Actions sans trace | Compliance |

---

## REGLES ABSOLUES

1. **JAMAIS modifier les montants** sans double-verification (calcul + test)
2. **JAMAIS desactiver l'idempotence** des webhooks
3. **JAMAIS modifier le chiffrement** sans backup des cles et test round-trip
4. **JAMAIS deployer west3** (paiements/Twilio) sans test E2E complet
5. **JAMAIS modifier setProviderBusy** sans verifier la transaction atomique
6. **JAMAIS supprimer processed_webhook_events** sans comprendre les consequences
7. **TOUJOURS verifier** que les 5 systemes de commission sont annules lors d'un refund
8. **TOUJOURS verifier** que le provider est release apres chaque appel (success ou failure)
9. **TOUJOURS verifier** que les montants Firestore = montants Stripe
10. **JAMAIS capturer un paiement** si la duree billing < 60 secondes
11. **JAMAIS modifier les crons** (checkProviderInactivity, stuckPaymentsRecovery) sans comprendre leur role critique
12. **TOUJOURS tester** les webhooks avec les signatures correctes (pas en mode test sans signature)

---

## FICHIERS CLES — REFERENCE RAPIDE

| # | Fichier | Chemin | Role |
|---|---------|--------|------|
| 1 | BookingRequest | `src/pages/BookingRequest.tsx` | Formulaire reservation |
| 2 | CallCheckout | `src/pages/CallCheckout.tsx` | Paiement Stripe/PayPal |
| 3 | PaymentSuccess | `src/pages/PaymentSuccess.tsx` | Confirmation + suivi |
| 4 | createPaymentIntent | `functions/src/createPaymentIntent.ts` | Cree PI Stripe |
| 5 | createAndScheduleCall | `functions/src/createAndScheduleCallFunction.ts` | Orchestration appel |
| 6 | callScheduler | `functions/src/callScheduler.ts` | Cree call_sessions |
| 7 | TwilioCallManager | `functions/src/TwilioCallManager.ts` | Machine a etats appel |
| 8 | StripeManager | `functions/src/StripeManager.ts` | Gestionnaire Stripe |
| 9 | PayPalManager | `functions/src/PayPalManager.ts` | Gestionnaire PayPal |
| 10 | providerStatusManager | `functions/src/callables/providerStatusManager.ts` | Busy/available |
| 11 | twilioWebhooks | `functions/src/Webhooks/twilioWebhooks.ts` | Callbacks Twilio |
| 12 | TwilioConferenceWebhook | `functions/src/Webhooks/TwilioConferenceWebhook.ts` | Events conference |
| 13 | stripeWebhookHandler | `functions/src/Webhooks/stripeWebhookHandler.ts` | 20+ events Stripe |
| 14 | commissionCalculator | `functions/src/unified/commissionCalculator.ts` | Calcul commissions |
| 15 | commissionWriter | `functions/src/unified/commissionWriter.ts` | Ecriture commissions |
| 16 | paymentService | `functions/src/payment/services/paymentService.ts` | Service retraits |
| 17 | paymentRouter | `functions/src/payment/services/paymentRouter.ts` | Routage Wise/Flutterwave |
| 18 | wiseProvider | `functions/src/payment/providers/wiseProvider.ts` | Transferts bancaires |
| 19 | flutterwaveProvider | `functions/src/payment/providers/flutterwaveProvider.ts` | Mobile money |
| 20 | requestWithdrawal | `functions/src/payment/callables/requestWithdrawal.ts` | Callable retrait |
| 21 | encryption | `functions/src/utils/encryption.ts` | AES-256-GCM |
| 22 | generateInvoice | `functions/src/utils/generateInvoice.ts` | Factures HTML |
| 23 | pricingService | `functions/src/services/pricingService.ts` | Cache pricing |
| 24 | stripe lib | `functions/src/lib/stripe.ts` | Secrets Stripe |
| 25 | twilio lib | `functions/src/lib/twilio.ts` | Client Twilio |
| 26 | tasks lib | `functions/src/lib/tasks.ts` | Cloud Tasks |
| 27 | checkProviderInactivity | `functions/src/scheduled/checkProviderInactivity.ts` | Cron 15min |
| 28 | stuckPaymentsRecovery | `functions/src/scheduled/stuckPaymentsRecovery.ts` | Cron 30min |
| 29 | stripeReconciliation | `functions/src/scheduled/stripeReconciliation.ts` | Cron quotidien |
| 30 | accountingService | `functions/src/accounting/accountingService.ts` | Ecritures comptables |
| 31 | RegisterClient | `src/pages/RegisterClient.tsx` | Inscription client (email+Google) |
| 32 | RegisterLawyer | `src/pages/RegisterLawyer.tsx` | Inscription avocat multi-step |
| 33 | RegisterExpat | `src/pages/RegisterExpat.tsx` | Inscription expat multi-step |
| 34 | Login | `src/pages/Login.tsx` | Login (56KB, email+Google+reset) |
| 35 | firebase.ts | `src/config/firebase.ts` | Firebase Auth config (Long Polling, IndexedDB) |
| 36 | onProviderCreated | `functions/src/triggers/onProviderCreated.ts` | Trigger: cree Stripe Express auto |
| 37 | registerChatter | `functions/src/chatter/callables/registerChatter.ts` | Inscription chatter + codes |
| 38 | generateOutilToken | `functions/src/auth/generateOutilToken.ts` | SSO vers Outil IA |
| 39 | functionalMonitoring | `functions/src/monitoring/functionalMonitoring.ts` | Health checks 2x/jour (1173 lignes) |
| 40 | getTwilioBalance | `functions/src/monitoring/getTwilioBalance.ts` | Callable solde Twilio |
| 41 | secrets.ts | `functions/src/lib/secrets.ts` | 20+ secrets centralises (600+ lignes) |
| 42 | claude.ts (Outil) | `Outil-sos-expat/functions/src/ai/providers/claude.ts` | Provider Claude |
| 43 | openai.ts (Outil) | `Outil-sos-expat/functions/src/ai/providers/openai.ts` | Provider GPT-4o |
| 44 | perplexity.ts (Outil) | `Outil-sos-expat/functions/src/ai/providers/perplexity.ts` | Provider Perplexity |
| 45 | hybrid.ts (Outil) | `Outil-sos-expat/functions/src/ai/services/hybrid.ts` | Fallback chain IA |
| 46 | subscription/checkout | `functions/src/subscription/checkout.ts` | Checkout subscription Stripe |
| 47 | subscription/webhooks | `functions/src/subscription/webhooks.ts` | Webhooks subscription (125KB) |
| 48 | subscription/accessControl | `functions/src/subscription/accessControl.ts` | Feature gates par tier |
| 49 | paymentMonitoring | `functions/src/monitoring/paymentMonitoring.ts` | Metriques paiements |
| 50 | telegramBot | `functions/src/telegram/providers/telegramBot.ts` | Bot Telegram notifications |
| 51 | firestore.rules | `sos/firestore.rules` | Regles securite Firestore |
| 52 | validateCoupon | `functions/src/callables/validateCoupon.ts` | Validation coupons/promos |
| 53 | profileValidation | `functions/src/admin/profileValidation.ts` | Workflow approbation provider |
| 54 | DisputeManager | `functions/src/DisputeManager.ts` | Gestion disputes Stripe |
| 55 | processDLQ | `functions/src/scheduled/processDLQ.ts` | Dead letter queue (cron horaire) |
| 56 | routing.ts | `functions/src/notificationPipeline/routing.ts` | Pipeline notifications 5 canaux |
| 57 | sendSms | `functions/src/notificationPipeline/providers/sms/sendSms.ts` | SMS Twilio (rate limited) |
| 58 | fetchDailyExchangeRates | `functions/src/accounting/scheduled/fetchDailyExchangeRates.ts` | Taux ECB Lun-Ven 16h |
| 59 | multiFrequencyBackup | `functions/src/scheduled/multiFrequencyBackup.ts` | Backup 3x/jour |
| 60 | crossRegionBackup | `functions/src/scheduled/crossRegionBackup.ts` | Backup DR cross-region |
| 61 | escrowMonitoring | `functions/src/scheduled/escrowMonitoring.ts` | Monitoring KYC pending |
| 62 | ReviewForm | `src/components/review/ReviewForm.tsx` | Formulaire avis post-appel |
| 63 | multilingualSearch | `src/utils/multilingualSearch.ts` | Recherche providers multilingue |
| 64 | PayPalPaymentForm | `src/components/payment/PayPalPaymentForm.tsx` | Formulaire PayPal (34KB) |
| 65 | accessControl | `functions/src/subscription/accessControl.ts` | Feature gates par tier IA |
