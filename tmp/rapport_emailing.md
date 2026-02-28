# RAPPORT D'AUDIT EMAILING - SOS-EXPAT
**Date**: 28 février 2026
**Scope**: Système complet d'emailing (transactionnel, marketing, drip, délivrabilité, RGPD)
**Score Global**: 65/100 — Partiellement Conforme

---

## TABLE DES MATIÈRES
1. [Architecture réelle](#1-architecture-réelle)
2. [Couverture par rôle et événement](#2-couverture-par-rôle-et-événement)
3. [MailWizz & drip campaigns](#3-mailwizz--drip-campaigns)
4. [Délivrabilité](#4-délivrabilité)
5. [Bounces & plaintes](#5-bounces--plaintes)
6. [RGPD & désabonnement](#6-rgpd--désabonnement)
7. [Templates](#7-templates)
8. [Problèmes par priorité](#8-problèmes-par-priorité)
9. [Checklist manuelle](#9-checklist-manuelle)

---

## 1. ARCHITECTURE RÉELLE

### 1.1 Services utilisés

| Service | Rôle | Configuration |
|---------|------|---------------|
| **Zoho SMTP** (smtp.zoho.eu:465) | Emails transactionnels | Via nodemailer, TLS, timeouts 10s/30s |
| **MailWizz** (mail.sos-expat.com) | Marketing automation | API REST, 99 autoresponders, 61 custom fields |
| **Firebase Secret Manager** | Credentials | EMAIL_USER, EMAIL_PASS, MAILWIZZ_API_KEY, MAILWIZZ_WEBHOOK_SECRET |
| **Notification Pipeline** | Dispatch multi-canal | email + SMS (Twilio) + push (FCM) + in-app + Telegram |

### 1.2 Flux d'envoi

```
                    ┌──────────────────────────────────────────┐
                    │           SOURCES D'ÉVÉNEMENTS           │
                    ├──────────────┬───────────┬───────────────┤
                    │  Triggers    │ Callables │   Scheduled   │
                    │  Firestore   │  (users)  │   (crons)     │
                    └──────┬───────┴─────┬─────┴───────┬───────┘
                           │             │             │
                    ┌──────▼─────────────▼─────────────▼───────┐
                    │          NOTIFICATION PIPELINE            │
                    │   message_events → worker.ts → routing   │
                    └──────┬───────┬───────┬───────┬───────────┘
                           │       │       │       │
                    ┌──────▼──┐ ┌──▼───┐ ┌─▼──┐ ┌──▼────┐
                    │  Zoho   │ │ FCM  │ │SMS │ │In-App │
                    │  SMTP   │ │ Push │ │Twil│ │Firestr│
                    └─────────┘ └──────┘ └────┘ └───────┘

  DIRECT (bypass pipeline):
  ─ sendZoho() → passwordReset, withdrawalFailed, contactReply, criticalAlerts
  ─ MailWizz API → autoresponders, transactional templates
  ─ Telegram Bot → drip chatters, withdrawal confirmations
```

### 1.3 Fichiers clés

| Fichier | Rôle |
|---------|------|
| `notificationPipeline/providers/email/zohoSmtp.ts` | Envoi SMTP Zoho (20 lignes) |
| `notificationPipeline/worker.ts` | Dispatcher multi-canal (~360 lignes) |
| `notificationPipeline/routing.ts` | Config routage par événement |
| `notificationPipeline/templates.ts` | Templates Firestore + fallback EN |
| `emailMarketing/utils/mailwizz.ts` | Client API MailWizz (487 lignes) |
| `emailMarketing/utils/autoresponderConfig.ts` | 11 autoresponders × 9 langues (638 lignes) |
| `emailMarketing/utils/fieldMapper.ts` | 61 custom fields MailWizz |
| `emailMarketing/functions/webhooks.ts` | 5 webhooks MailWizz |
| `emailMarketing/functions/*.ts` | 14 fonctions lifecycle/transactionnel |
| `lib/secrets.ts` | Secrets centralisés (EMAIL_USER, EMAIL_PASS) |
| `subscription/emailNotifications.ts` | 11 types emails subscription (872 lignes) |
| `subscriptions/dunning.ts` | 4 emails de relance paiement |
| `auth/passwordReset.ts` | Reset password (9 langues) |
| `paypal/emailVerification.ts` | Vérification PayPal (6-digit code, 9 langues) |

---

## 2. COUVERTURE PAR RÔLE ET ÉVÉNEMENT

### 2.1 Emails transactionnels

| Email | Service | Régions | Langues | Statut |
|-------|---------|---------|---------|--------|
| Password Reset | Zoho direct | europe-west1 | 9 | ✅ ACTIF |
| PayPal Verification (code 6 digits) | Zoho direct | europe-west1 | 9 | ✅ ACTIF |
| Withdrawal Failed | Zoho direct + Telegram | europe-west3 | 1 (FR) | ⚠️ PAS MULTILINGUE |
| Contact Reply (admin → user) | Zoho direct | europe-west1 | 1 | ✅ ACTIF |
| Invoice | Pipeline | europe-west3 | 9 | ✅ ACTIF |
| Critical Alerts (→ admin) | Zoho direct | europe-west3 | 1 | ✅ ACTIF |

### 2.2 Emails subscription (via pipeline)

| Type | Template ID | Priorité |
|------|------------|----------|
| Bienvenue abonnement | `subscription.welcome` | high |
| Renouvellement | `subscription.renewed` | normal |
| Alerte quota 80% | `subscription.quota_80` | normal |
| Quota épuisé | `subscription.quota_exhausted` | high |
| Paiement échoué | `subscription.payment_failed` | high |
| Paiement échoué final | `subscription.payment_failed_final` | high |
| Annulation | `subscription.canceled` | high |
| Fin d'essai (J-3) | `subscription.trial_ending` | high |
| Expiration | `subscription.expired` | high |
| Upgrade | `subscription.upgraded` | normal |
| Downgrade planifié | `subscription.downgrade_scheduled` | normal |
| Réactivation | `subscription.reactivated` | high |
| Suspension | `subscription.account_suspended` | high |

### 2.3 Emails dunning (relance paiement)

| Jour | Type | Template MailWizz |
|------|------|-------------------|
| J+1 | Payment Failed | `TR_PRV_dunning-payment-failed_{LANG}` |
| J+3 | Action Required | `TR_PRV_dunning-action-required_{LANG}` |
| J+5 | Final Attempt | `TR_PRV_dunning-final-attempt_{LANG}` |
| J+7 | Account Suspended | `TR_PRV_dunning-account-suspended_{LANG}` |

### 2.4 Emails welcome par rôle

| Rôle | Email welcome | Fichier | Canal |
|------|--------------|---------|-------|
| **Chatter** | ✅ HTML inline | `chatter/triggers/onChatterCreated.ts:99-142` | Zoho + in-app |
| **Blogger** | ✅ HTML inline | `blogger/triggers/onBloggerCreated.ts:96-136` | Zoho |
| **GroupAdmin** | ✅ HTML inline | `groupAdmin/triggers/onGroupAdminCreated.ts:90+` | Zoho |
| **Influencer** | ⚠️ Notification seulement | `influencer/triggers/onInfluencerCreated.ts` | In-app |
| **Provider (abonné)** | ✅ Via pipeline | `subscription/emailNotifications.ts` | Pipeline |
| **Client** | ❌ Aucun | - | - |

### 2.5 Emails MailWizz lifecycle

| Événement | Fonction | Actions MailWizz |
|-----------|----------|------------------|
| Inscription user | `handleUserRegistration` | Créer subscriber, welcome email |
| Profil complété | `handleProfileCompleted` | Update PROFILE_STATUS, stop nurture-profile |
| Premier login | `handleUserLogin` | Update LAST_LOGIN, stop welcome |
| Passage online | `handleProviderOnlineStatus` | Update IS_ONLINE, stop nurture-offline |
| KYC validé | `handleKYCVerification` | Update KYC_STATUS, stop nurture-kyc |
| PayPal configuré | `handlePayPalConfiguration` | Update PAYPAL_STATUS, stop nurture-paypal |
| Appel terminé | `handleCallCompleted` | Increment TOTAL_CALLS, emails aux 2 parties |
| Paiement reçu/échoué | `handlePayment*` | Récépissé ou notification échec |
| Inactivité 30j+ | `detectInactiveUsers` | Email réactivation (cron 04:00) |
| Stop autoresponders | `stopAutoresponders` | Monitoring quotidien (cron 08:00) |

### 2.6 Événements SANS email (lacunes)

| Événement | Impact | Priorité |
|-----------|--------|----------|
| **Inscription client** | Pas de welcome email client | P2 |
| **Premier appel (provider)** | Pas d'email de félicitation | P3 |
| **Commission créée** | Notification in-app seulement | P3 |
| **Influencer welcome** | Notification in-app, pas d'email | P2 |

---

## 3. MAILWIZZ & DRIP CAMPAIGNS

### 3.1 Configuration MailWizz

| Paramètre | Valeur |
|-----------|--------|
| URL API | `https://mail.sos-expat.com/api/index.php` |
| List UID | `yl089ehqpgb96` |
| Customer ID | `1` |
| API Key | Firebase Secret Manager (`MAILWIZZ_API_KEY`) |
| Webhook Secret | Firebase Secret Manager (`MAILWIZZ_WEBHOOK_SECRET`) |

### 3.2 Autoresponders (11 types × 9 langues = 99 séquences)

| Type | Objectif | Jours | Emails | Condition d'arrêt |
|------|----------|-------|--------|-------------------|
| `nurture-profile` | Compléter profil | 1,3,7,14 | 4 | PROFILE_STATUS = "profile_complete" |
| `nurture-no-calls` | Premier appel | 2,5,10 | 3 | TOTAL_CALLS > 0 |
| `nurture-login-clients` | Login client | 1,3,7,14 | 4 | ACTIVITY_STATUS = "active" |
| `nurture-login-providers` | Login provider | 1,3,7,14 | 4 | ACTIVITY_STATUS = "active" |
| `nurture-kyc` | KYC vérification | 1,3,7,14 | 4 | KYC_STATUS = "verified" |
| `nurture-offline` | Passer online | 1,3,5,7,10 | 5 | IS_ONLINE = "online" |
| `nurture-paypal` | Setup PayPal | 1,4,8 | 3 | PAYPAL_STATUS = "paypal_ok" |
| `nurture-action` | Inciter action client | 1,3,7,14 | 4 | TOTAL_CALLS > 0 |
| `reactivation-clients` | Réengager clients | 1,3,7,14,21 | 5 | ACTIVITY_STATUS = "active" |
| `reactivation-providers` | Réengager providers | 1,5,10 | 3 | ACTIVITY_STATUS = "active" |
| `request-review` | Demander avis | 1,3,7,14 | 4 | HAS_LEFT_REVIEW = "true" |

### 3.3 Chatter Drip (Telegram, pas email)

- **62 messages motivationnels sur 90 jours**
- **Canal : Telegram** (pas Zoho/MailWizz)
- **Cron** : quotidien à 10:00 Europe/Paris
- **9 langues** : FR, EN, ES, DE, PT, RU, ZH, HI, AR
- **Fichier** : `chatter/data/chatterDripMessages.ts` (922 lignes)
- **Admin** : `chatter_sendDripMessage`, `chatter_getDripStats`, `chatter_previewDripMessage`

### 3.4 Webhooks MailWizz (5 handlers)

| Webhook | Événement | Actions | Sécurité |
|---------|-----------|---------|----------|
| `handleEmailOpen` | campaign.open | Log email_events + GA4 | Timing-safe HMAC |
| `handleEmailClick` | campaign.click | Log + détection Trustpilot | Timing-safe HMAC |
| `handleEmailBounce` | bounce | Hard: emailBounced=true, stop autoresponders | Timing-safe HMAC |
| `handleEmailComplaint` | complaint | emailComplaint=true, unsubscribe, stop all | Timing-safe HMAC |
| `handleUnsubscribe` | subscriber.unsubscribe | unsubscribed=true, stop all | Timing-safe HMAC |

### 3.5 Custom Fields MailWizz (61 champs mappés)

Catégories : Base (3), User Info (20), Payment (4), Statistics (10), URLs (9), Dynamic (14), Dates (3), Gamification (5), Referral (2), Other (4+)

### 3.6 État MailWizz : ✅ Phase 1 complète (14/14 fonctions + 5/5 webhooks)

---

## 4. DÉLIVRABILITÉ

### 4.1 Configuration DNS (SPF/DKIM/DMARC)

| Élément | Statut | Commentaire |
|---------|--------|-------------|
| **SPF** | ❓ NON VÉRIFIÉ | Aucune référence dans le code. À vérifier dans DNS |
| **DKIM** | ❓ NON VÉRIFIÉ | Zoho génère un DKIM — à vérifier dans DNS |
| **DMARC** | ❓ NON VÉRIFIÉ | Aucune politique documentée |
| **Domaine d'envoi** | `EMAIL_USER` (secret) | Probablement @sos-expat.com ou @zoho.eu |

### 4.2 Rate Limiting

| Mécanisme | Statut | Détails |
|-----------|--------|---------|
| Pipeline rate limiting | ⚠️ DÉSACTIVÉ | `rateLimitH: 0` par défaut dans routing.ts |
| PayPal verification | ✅ ACTIF | 5 codes/heure, cooldown 60s, 3 tentatives max |
| SMS allowlist | ✅ ACTIF | Seulement 2 events autorisés (booking_paid, call_cancelled) |
| Batch processing | ❌ ABSENT | Pas de file d'attente, envoi immédiat |
| IP warmup | ❌ ABSENT | Pas de mécanisme de warmup |

### 4.3 Retry & Fiabilité

| Paramètre | Valeur |
|-----------|--------|
| Retries email | 1 (configurable par événement) |
| Connection timeout | 10s |
| Socket timeout | 30s |
| Queue de retry | ❌ Absente (pas de CloudTask pour email) |
| Dead Letter Queue | ❌ Pas pour les emails |

### 4.4 Risques de délivrabilité

1. **IP partagée Zoho** — Réputation dépend des autres utilisateurs Zoho
2. **Pas de warmup** — Risque de spam filter pour les nouveaux domaines
3. **Pas de rate limiting actif** — Risque de flooding accidentel
4. **Pas de retry queue** — Les emails échoués sont perdus après 1 retry

---

## 5. BOUNCES & PLAINTES

### 5.1 Traitement des bounces

| Type | Traitement | Collection |
|------|-----------|------------|
| **Hard bounce** | `emailBounced=true`, `emailStatus="invalid"`, stop autoresponders | `email_events` |
| **Soft bounce** | Log seulement (pas d'action) | `email_events` |
| **Complaint** | `emailComplaint=true`, `unsubscribed=true`, unsubscribe MailWizz, stop all | `email_events` |

### 5.2 Champs Firestore créés

```typescript
// Collection: users/{userId}
emailBounced: boolean       // true si hard bounce
emailBouncedAt: Timestamp   // date du bounce
emailStatus: "invalid"      // statut de l'email
emailComplaint: boolean     // true si plainte spam
emailComplaintAt: Timestamp // date de la plainte
unsubscribed: boolean       // true si désabonné
unsubscribedAt: Timestamp   // date de désabonnement
```

### 5.3 Lacunes bounces

| Problème | Impact | Priorité |
|----------|--------|----------|
| Pas de suppression liste MailWizz après hard bounce | L'adresse reste dans la liste (seuls autoresponders stoppés) | P2 |
| Pas de dashboard admin bounces | Aucune visibilité admin sur les emails invalides | P2 |
| Soft bounces ignorés | Pas de retry ni de tracking | P3 |
| Pas de vérification `emailBounced` avant envoi direct | `sendZoho()` ne check pas le statut | **P1** |
| Pas de notification admin sur complaints | Les plaintes spam ne génèrent pas d'alerte | P2 |

---

## 6. RGPD & DÉSABONNEMENT

### 6.1 État du système RGPD

| Fonctionnalité | Backend | Frontend | Statut |
|----------------|---------|----------|--------|
| Export données (Art. 20) | ✅ `requestDataExport()` | ✅ DashboardGDPR.tsx | ⚠️ Export incomplet* |
| Suppression compte (Art. 17) | ✅ `requestAccountDeletion()` | ✅ DashboardGDPR.tsx | ✅ OK |
| Historique accès (Art. 15) | ✅ `getMyDataAccessHistory()` | ✅ DashboardGDPR.tsx | ✅ OK |
| Audit trail | ✅ `gdpr_audit_logs` (3 ans) | - | ✅ OK |
| Consentement marketing | ✅ `updateConsentPreferences()` | ❌ Pas d'UI | **❌ NON APPLIQUÉ** |
| Désabonnement email | ✅ Webhook MailWizz | ❌ Pas de page `/unsubscribe` | **❌ INCOMPLET** |
| Préférences notification | ⚠️ `notificationPreferences` partiel | ❌ Pas d'UI | **❌ ABSENT** |

*Export incomplet : manquent `sos_profiles`, données influencer/blogger/groupAdmin, données affiliate

### 6.2 Problèmes RGPD CRITIQUES

#### P1-RGPD-01 : Pas de vérification du consentement avant envoi marketing
```
AUCUN middleware ne vérifie users.preferences.consents.marketing avant d'envoyer un email.
Le champ existe en Firestore (updateConsentPreferences) mais n'est JAMAIS lu par :
- notificationPipeline/worker.ts
- emailMarketing/functions/*.ts
- sendZoho() direct
```
**Violation** : RGPD Articles 6 et 7

#### P1-RGPD-02 : Pas de lien de désabonnement dans les emails
```
Les emails envoyés directement via sendZoho() (passwordReset, withdrawalFailed, contactReply)
ne contiennent PAS de lien unsubscribe one-click.
Seuls les emails via MailWizz ont un lien (géré par MailWizz).
```
**Violation** : CAN-SPAM, CASL, RGPD

#### P1-RGPD-03 : Pas de page frontend `/unsubscribe`
```
Aucune route /unsubscribe ou /preferences dans le frontend.
L'utilisateur ne peut se désabonner QUE via le lien MailWizz (externalisé).
```

### 6.3 Notification Preferences (partiel)

```typescript
// Fichier: subscription/emailNotifications.ts
notificationPreferences?: {
  email?: boolean;                // Toggle général
  subscriptionEmails?: boolean;   // Spécifique abonnement
}

// Logique: si email=false OU subscriptionEmails=false → pas d'envoi
// MAIS: seulement vérifié pour les emails subscription, PAS pour le marketing
```

### 6.4 Consentement (backend existe, frontend absent)

```typescript
// Fichier: gdpr/auditTrail.ts
users.preferences.consents = {
  marketing: boolean,    // Consentement marketing
  analytics: boolean,    // Consentement analytics
  thirdParty: boolean,   // Consentement tiers
  // + timestamp + version (2.0)
}
```

---

## 7. TEMPLATES

### 7.1 Templates par type

| Type | Stockage | Langues | Exemples |
|------|----------|---------|----------|
| **Inline HTML** (triggers) | Code TypeScript hardcodé | 1 (FR) sauf passwordReset (9) | Welcome chatter/blogger/groupAdmin, withdrawal failed |
| **Firestore templates** | `message_templates/{lang}/items/{id}` | 9 | PayPal welcome, subscription lifecycle |
| **MailWizz templates** | MailWizz dashboard | 9 | Naming: `TR_PRO_<slug>_<LANG>` |
| **Seeds** | `seeds/*.ts` → Firestore | 9 | paypalWelcomeTemplates, kycReminder, unclaimedFunds |

### 7.2 Problèmes templates

| Problème | Fichier | Priorité |
|----------|--------|----------|
| Withdrawal failed email en FR uniquement | `onWithdrawalStatusChanged.ts:188-207` | P2 |
| Welcome chatter en FR uniquement | `onChatterCreated.ts:99-142` | P2 |
| Welcome blogger en FR uniquement | `onBloggerCreated.ts:96-136` | P2 |
| Welcome groupAdmin en FR uniquement | `onGroupAdminCreated.ts:90+` | P2 |
| Pas de template influencer welcome | `onInfluencerCreated.ts` | P2 |
| Templates inline pas maintenables | Hardcodé dans 4+ fichiers | P3 |

### 7.3 Variables injectées

| Template | Variables |
|----------|----------|
| Password Reset | `resetLink`, `firstName` |
| PayPal Verification | `code` (6 digits), `email` |
| Withdrawal Failed | `amount`, `provider`, `errorReason` |
| Subscription Welcome | `firstName`, `planName`, `aiCallsLimit`, `price`, `currency`, `dashboardUrl` |
| MailWizz (61 champs) | EMAIL, FNAME, LNAME, ROLE, TOTAL_CALLS, TOTAL_EARNINGS, etc. |

---

## 8. PROBLÈMES PAR PRIORITÉ

### P1 — CRITIQUE (à corriger immédiatement)

| # | Problème | Fichier | Action |
|---|----------|---------|--------|
| P1-01 | **Pas de vérification consentement marketing avant envoi** | `worker.ts`, `emailMarketing/functions/*` | Ajouter helper `canSendEmail(uid, eventId)` qui vérifie `consents.marketing`, `emailBounced`, `unsubscribed` |
| P1-02 | **Pas de lien unsubscribe dans les emails directs** | `zohoSmtp.ts`, inline templates | Ajouter header `List-Unsubscribe` + lien dans le footer HTML |
| P1-03 | **sendZoho() ne vérifie pas `emailBounced`** | `zohoSmtp.ts` | Wrapper qui check `emailStatus !== "invalid"` avant envoi |
| P1-04 | **Pas de page frontend unsubscribe** | Frontend | Créer route `/unsubscribe/:token` |

### P2 — HAUTE (1-2 semaines)

| # | Problème | Action |
|---|----------|--------|
| P2-01 | Templates welcome non multilingues (4 rôles) | Migrer les 4 templates inline vers Firestore multilingue |
| P2-02 | Withdrawal failed email FR uniquement | Ajouter 8 langues manquantes |
| P2-03 | Pas d'email welcome influencer | Créer template + envoi dans `onInfluencerCreated.ts` |
| P2-04 | Pas d'email welcome client | Créer template + trigger dans `handleUserRegistration` |
| P2-05 | Hard bounce: pas de suppression liste MailWizz | Appeler `deleteSubscriber()` au lieu de seulement `stopAutoresponders()` |
| P2-06 | Pas de dashboard admin bounces/complaints | Créer page `/admin/email-health` |
| P2-07 | Export RGPD incomplet | Ajouter sos_profiles, influencer, blogger, groupAdmin |
| P2-08 | Pas d'UI préférences consentement marketing | Ajouter dans DashboardGDPR.tsx |

### P3 — MOYENNE (1-2 mois)

| # | Problème | Action |
|---|----------|--------|
| P3-01 | Rate limiting email désactivé | Activer `rateLimitH` dans `message_routing/config` |
| P3-02 | Pas de retry queue pour emails | Implémenter CloudTask-based retry |
| P3-03 | Pas de monitoring délivrabilité | Dashboard taux d'ouverture/bounce/complaint |
| P3-04 | Templates inline pas maintenables | Migrer vers Firestore templates |
| P3-05 | Pas de DPA documenté | Lister sous-traitants (Firebase, Stripe, MailWizz, Zoho, Twilio, Wise) |
| P3-06 | Pas de procédure violation données | Documenter process Art. 33/34 |
| P3-07 | Soft bounces ignorés | Tracker et réagir après 3 soft bounces |
| P3-08 | Legacy `serveremails/` non supprimé | Archiver ou supprimer |
| P3-09 | Préférences notification granulaires | Opt-out par type d'événement |

---

## 9. CHECKLIST MANUELLE (Actions hors code)

### DNS & Délivrabilité
- [ ] **Vérifier SPF** : `dig TXT sos-expat.com` — doit inclure `include:zoho.eu`
- [ ] **Vérifier DKIM** : `dig TXT zmail._domainkey.sos-expat.com` — clé Zoho
- [ ] **Vérifier DMARC** : `dig TXT _dmarc.sos-expat.com` — `v=DMARC1; p=quarantine`
- [ ] **Tester avec mail-tester.com** : Envoyer un email test et vérifier score (objectif ≥ 8/10)
- [ ] **Vérifier blacklists** : mxtoolbox.com/blacklists.aspx

### MailWizz Dashboard
- [ ] **Vérifier les 99 autoresponders** sont actifs dans MailWizz
- [ ] **Vérifier la liste** `yl089ehqpgb96` est active et configurée
- [ ] **Vérifier les templates** `TR_PRO_*` et `TR_CLI_*` existent pour les 9 langues
- [ ] **Vérifier les webhooks** sont configurés vers les bons endpoints Cloud Functions
- [ ] **Vérifier le quota d'envoi** MailWizz (limites/heure)
- [ ] **Vérifier les logs d'envoi** pour bounces/complaints récents

### Firebase Secrets
- [ ] **Vérifier EMAIL_USER** est défini : `gcloud secrets versions access latest --secret=EMAIL_USER --project=sos-urgently-ac307`
- [ ] **Vérifier EMAIL_PASS** est défini
- [ ] **Vérifier MAILWIZZ_API_KEY** est défini
- [ ] **Vérifier MAILWIZZ_WEBHOOK_SECRET** est défini

### Zoho Account
- [ ] **Vérifier le plan Zoho Mail** (limites d'envoi quotidiennes)
- [ ] **Vérifier les logs d'envoi** dans Zoho Admin
- [ ] **Vérifier l'adresse d'envoi** correspond au domaine avec DKIM

### Tests Fonctionnels
- [ ] **Envoyer un email test** via `test-mailwizz.js` : `node scripts/test-mailwizz.js`
- [ ] **Tester password reset** : déclencher et vérifier réception
- [ ] **Tester inscription chatter** : vérifier welcome email
- [ ] **Tester retrait échoué** : vérifier email + Telegram
- [ ] **Tester unsubscribe MailWizz** : cliquer le lien et vérifier `unsubscribed=true` en Firestore

### RGPD
- [ ] **Mettre à jour Politique de Confidentialité** avec sous-traitants
- [ ] **Créer email DPO** : privacy@sos-expat.com ou dpo@sos-expat.com
- [ ] **Documenter les DPA** avec chaque sous-traitant (Firebase/Google, Stripe, MailWizz, Zoho, Twilio, Wise, Flutterwave)
- [ ] **Tester export données** : déclencher et vérifier le ZIP généré inclut toutes les collections

---

## ANNEXE : Résumé des collections Firestore liées aux emails

| Collection | Rôle |
|------------|------|
| `message_events` | File d'attente notifications (email, SMS, push, in-app) |
| `message_deliveries` | Historique de livraison (status: queued/sent/delivered/failed) |
| `message_routing/config` | Configuration routage par événement |
| `message_templates/{lang}/items/{id}` | Templates multilingues |
| `email_logs` | Logs d'envoi email (status, error, timestamps) |
| `email_events` | Événements MailWizz (opens, clicks, bounces, complaints) |
| `paypal_verification_codes` | Codes PayPal (expiry 10min, max 3 attempts) |
| `paypal_verification_logs` | Audit vérification PayPal |
| `gdpr_audit_logs` | Trail RGPD (rétention 3 ans) |
| `users/{uid}.notificationPreferences` | Préférences notification utilisateur |
| `users/{uid}.preferences.consents` | Consentement marketing/analytics/tiers |

---

*Rapport généré automatiquement — Audit Claude Code — 28/02/2026*
