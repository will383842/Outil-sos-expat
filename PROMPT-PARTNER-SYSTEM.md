# PROMPT MASTER — Système Partenaire Complet SOS-Expat

> **Objectif** : Créer un système "Partner" (Partenaire) complet de bout en bout — backend, frontend, admin — pour permettre à SOS-Expat de gérer des partenariats avec des sites web (expat.com, etc.) qui génèrent du trafic et des appels via un lien affilié, et perçoivent des commissions.

---

## CONTEXTE PROJET

### Architecture Existante

- **Stack** : React 18 + TypeScript + Vite (frontend), Firebase Functions (backend), Firestore (DB), Cloudflare Pages (hosting frontend)
- **Firebase Project** : `sos-urgently-ac307`
- **3 régions Cloud Functions** :
  - `europe-west1` (Belgique) — APIs publiques frontend, callables admin (~206 fonctions)
  - `us-central1` (Iowa) — Affiliate/Marketing callables (~201 fonctions) — **LATENCE FIRESTORE OPTIMALE** (Firestore est en nam7/Iowa)
  - `europe-west3` (Francfort) — Payments, Twilio, triggers Firestore, crons (~252 fonctions)
- **Firestore** : Région `nam7` (Iowa, US)
- **Frontend** : Cloudflare Pages, auto-deploy via GitHub push sur `main`
- **i18n** : 9 langues (fr, en, es, de, ru, hi, pt, ch, ar) via `react-intl` (FormattedMessage/useIntl). Les fichiers de traduction sont dans `sos/src/helper/{lang}.json`. Le système multilingue de routes est dans `sos/src/multilingual-system/core/routing/localeRoutes.ts`. ATTENTION: Chinese = `ch` (pas `zh`).
- **UI** : Tailwind CSS, Lucide icons, react-hot-toast (JAMAIS alert())
- **Auth** : Firebase Auth (email/password + Google)
- **Paiement retraits** : Wise (bank_transfer international) + Flutterwave (mobile_money Afrique). **PAS** Stripe/PayPal pour les payouts affiliés.
- **Email** : MailWizz (transactional via API) + Zoho SMTP (emails bienvenue via `sendZoho()` + `generateWelcomeEmail()`)

### Rôles Existants

```typescript
type UserRole = "client" | "lawyer" | "expat" | "admin" | "chatter" | "influencer" | "blogger" | "groupAdmin";
```

Il faut ajouter le rôle `"partner"`.

### 4 Systèmes Affiliés Existants (à utiliser comme modèle)

Le système Partner doit suivre **exactement** les mêmes patterns que les systèmes existants (Blogger, Influencer, Chatter, GroupAdmin), avec les simplifications suivantes :
- **PAS d'inscription publique** — seul l'admin crée les comptes partenaires
- **PAS de quiz, formation, gamification avancée**
- **PAS de recrutement d'autres partenaires** (pas de multi-niveau)
- **Commission custom par partenaire** (négociable, pas un taux fixe global)
- **Dashboard épuré** : stats, commissions, widgets, profil, retraits

### Langues supportées

```typescript
type SupportedPartnerLanguage = "fr" | "en" | "es" | "de" | "pt" | "ar" | "ch" | "ru" | "hi";
// 9 langues. ATTENTION: Chinese = "ch" dans ce projet (fichier ch.json)
```

---

## PHASE 1 — BACKEND (Firebase Functions)

### 1.1 Types TypeScript

**Créer** : `sos/firebase/functions/src/partner/types.ts`

```typescript
// ============================================================
// ENUMS (OBLIGATOIRES — définir en début de fichier)
// ============================================================

export type SupportedPartnerLanguage = "fr" | "en" | "es" | "de" | "pt" | "ar" | "ch" | "ru" | "hi";

export type PartnerCategory =
  | "expatriation"      // Sites d'expatriation (expat.com, etc.)
  | "travel"            // Sites de voyage
  | "legal"             // Sites juridiques
  | "finance"           // Sites finance/banque
  | "insurance"         // Assurances
  | "relocation"        // Services de relocalisation
  | "education"         // Éducation internationale
  | "media"             // Médias/presse
  | "association"       // Associations d'expatriés
  | "corporate"         // Entreprises (mobilité internationale)
  | "other";

export type PartnerTrafficTier =
  | "lt10k"             // < 10K visiteurs/mois
  | "10k-50k"
  | "50k-100k"
  | "100k-500k"
  | "500k-1m"
  | "gt1m";             // > 1M visiteurs/mois

export type PartnerCommissionStatus = "pending" | "validated" | "available" | "paid" | "cancelled";

export type PartnerNotificationType =
  | "system_announcement"
  | "commission_earned"
  | "commission_available"
  | "withdrawal_approved"
  | "withdrawal_completed"
  | "withdrawal_rejected"
  | "withdrawal_failed";

// ============================================================
// INTERFACES PRINCIPALES
// ============================================================

// Interface Partner (document Firestore partners/{uid})
export interface Partner {
  // IDENTITÉ
  id: string;                           // UID Firebase Auth
  email: string;                        // Unique, lowercase
  firstName: string;                    // Prénom du contact
  lastName: string;                     // Nom du contact
  phone?: string;
  photoUrl?: string;
  country: string;                      // ISO 2-letter
  language: SupportedPartnerLanguage;

  // SITE PARTENAIRE (spécifique Partner)
  websiteUrl: string;                   // URL du site partenaire (ex: https://www.expat.com)
  websiteName: string;                  // Nom affiché (ex: "Expat.com")
  websiteDescription?: string;          // Description courte
  websiteCategory: PartnerCategory;     // Catégorie du site
  websiteTraffic?: PartnerTrafficTier;  // Estimation trafic mensuel
  websiteLogo?: string;                 // URL logo du partenaire (Storage)

  // STATUT
  status: "active" | "suspended" | "banned";
  isVisible: boolean;                   // Visible sur la page publique "Nos partenaires"
  adminNotes?: string;
  suspensionReason?: string;

  // CODE AFFILIÉ (un seul, pas de recruitment)
  affiliateCode: string;                // Ex: "EXPATCOM", "FEMMEXPAT" — unique, uppercase
  affiliateLink: string;                // URL complète: https://sos-expat.com?ref=EXPATCOM

  // COMMISSIONS CUSTOM (négociées par partenaire)
  commissionConfig: PartnerCommissionConfig;

  // BALANCES (en cents USD)
  totalEarned: number;
  availableBalance: number;
  pendingBalance: number;
  validatedBalance: number;
  totalWithdrawn: number;

  // STATS
  totalClicks: number;                  // Total clics sur le lien
  totalClients: number;                 // Clients uniques référés
  totalCalls: number;                   // Appels payés générés
  totalCommissions: number;             // Nombre de commissions
  conversionRate: number;               // totalCalls / totalClicks (%)
  currentMonthStats: {
    clicks: number;
    clients: number;
    calls: number;
    earnings: number;
    month: string;                      // "YYYY-MM"
  };

  // PAIEMENT — UTILISE LE SYSTÈME CENTRALISÉ (payment/types)
  // Méthodes supportées: 'wise' | 'flutterwave' (PAS Stripe/PayPal pour payouts)
  preferredPaymentMethod: "wise" | "bank_transfer" | "mobile_money" | null;
  paymentMethodId?: string;             // Référence dans payment_methods/{id}
  pendingWithdrawalId: string | null;

  // CONTACT (pour relation commerciale)
  contactName?: string;                 // Si différent du titulaire du compte
  contactEmail?: string;
  contactPhone?: string;
  companyName?: string;                 // Raison sociale
  companyAddress?: string;
  vatNumber?: string;                   // Numéro TVA (si applicable)

  // CONTRAT
  contractStartDate: Timestamp;
  contractEndDate?: Timestamp | null;   // null = durée indéterminée
  contractNotes?: string;

  // TIMESTAMPS
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp | null;
  createdBy: string;                    // Admin UID qui a créé le compte

  // CGU/GDPR — COMPLET (conformité eIDAS + GDPR mondial)
  termsAccepted: boolean;
  termsAcceptedAt: string;              // ISO timestamp
  termsVersion: string;
  termsType: string;                    // "terms_partner"
  termsAffiliateVersion?: string;       // "1.0"
  termsAffiliateType?: string;          // "terms_affiliate"
  termsAcceptanceMeta?: {
    userAgent?: string;
    language?: string;
    timestamp?: number;
    acceptanceMethod?: string;          // "admin_created" pour Partner
    ipHash?: string;
  };
  registrationIpHash?: string;          // Fraud detection (hash SHA-256, JAMAIS l'IP brute — GDPR)
}

// Candidature partenaire (document partner_applications/{id})
export interface PartnerApplication {
  id: string;
  status: "pending" | "contacted" | "accepted" | "rejected";

  // Infos du candidat
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country: string;
  language: SupportedPartnerLanguage;

  // Site web
  websiteUrl: string;
  websiteName: string;
  websiteCategory: PartnerCategory;
  websiteTraffic?: PartnerTrafficTier;
  websiteDescription?: string;

  // Message libre
  message?: string;

  // Admin
  adminNotes?: string;
  reviewedBy?: string;            // Admin UID
  reviewedAt?: Timestamp;
  convertedToPartnerId?: string;  // Lien vers partners/{uid} si accepté

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  ipHash?: string;                // SHA-256, JAMAIS l'IP brute (GDPR)
  userAgent?: string;
}

export interface PartnerCommissionConfig {
  // Commissions par appel (en cents USD)
  commissionPerCallLawyer: number;      // Ex: 800 ($8) — négociable
  commissionPerCallExpat: number;       // Ex: 500 ($5) — négociable

  // OU taux en pourcentage (alternatif)
  usePercentage: boolean;               // false = montant fixe, true = pourcentage
  commissionPercentage?: number;        // Ex: 15 (15% du prix de l'appel)

  // Validation
  holdPeriodDays: number;               // Jours avant validation (défaut: 7)
  releaseDelayHours: number;            // Heures après validation (défaut: 24)
  minimumCallDuration: number;          // Secondes minimum (défaut: 60)
}

// Commission (document partner_commissions/{id})
export interface PartnerCommission {
  id: string;
  partnerId: string;
  partnerCode: string;                  // AUDIT: code affilié source
  partnerEmail: string;                 // AUDIT: email partenaire
  type: "client_referral" | "manual_adjustment";
  sourceId: string | null;              // call_session ID
  sourceType: "call_session" | null;
  sourceDetails?: {
    clientId?: string;
    clientEmail?: string;
    callSessionId?: string;
    callDuration?: number;
    connectionFee?: number;
    providerId?: string;
    providerType?: "lawyer" | "expat";
  };
  amount: number;                       // cents (calculé selon commissionConfig)
  currency: "USD";
  description: string;
  status: PartnerCommissionStatus;
  validatedAt: Timestamp | null;
  availableAt: Timestamp | null;
  // AUDIT TRAIL (obligatoire pour litiges)
  cancellationReason?: string;
  cancelledBy?: string;                 // Admin UID
  cancelledAt?: Timestamp;
  adminNotes?: string;
  withdrawalId: string | null;
  paidAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Notification (document partner_notifications/{id})
export interface PartnerNotification {
  id: string;
  partnerId: string;
  type: PartnerNotificationType;
  title: string;
  titleTranslations?: Record<string, string>;    // 9 langues
  message: string;
  messageTranslations?: Record<string, string>;  // 9 langues
  data?: Record<string, unknown>;
  actionUrl?: string;
  isRead: boolean;
  createdAt: Timestamp;
  readAt?: Timestamp;
}

// Click tracking (document partner_affiliate_clicks/{id})
export interface PartnerAffiliateClick {
  id: string;
  partnerId: string;
  partnerCode: string;
  clickedAt: Timestamp;
  converted: boolean;
  convertedAt?: Timestamp;
  convertedUserId?: string;
  userAgent?: string;
  referrerUrl?: string;
  landingPage?: string;
  ipHash?: string;                      // Hash SHA-256 pour dédupliquer, JAMAIS l'IP brute (GDPR)
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

// Config globale (document partner_config/current)
export interface PartnerConfig {
  id: string;                              // "partner_config"
  isSystemActive: boolean;
  withdrawalsEnabled: boolean;
  minimumWithdrawalAmount: number;         // 3000 ($30)
  defaultCommissionPerCallLawyer: number;  // 500 ($5)
  defaultCommissionPerCallExpat: number;   // 300 ($3)
  defaultHoldPeriodDays: number;           // 7
  defaultReleaseDelayHours: number;        // 24
  defaultMinimumCallDuration: number;      // 60
  attributionWindowDays: number;           // 30
  isPartnerListingPageVisible: boolean;    // Toggle visibilité page publique "Nos partenaires"
  isPartnerFooterLinkVisible: boolean;     // Toggle visibilité lien footer
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Widget promo (document partner_promo_widgets/{id})
export interface PartnerPromoWidget {
  id: string;
  name: string;
  nameTranslations?: Record<string, string>;
  description?: string;
  descriptionTranslations?: Record<string, string>;
  type: "button" | "banner";
  dimension: string;                       // "728x90", "300x250", "160x600", "custom"
  customWidth?: number;
  customHeight?: number;
  buttonText?: string;
  buttonTextTranslations?: Record<string, string>;
  imageUrl?: string;
  altText?: string;
  altTextTranslations?: Record<string, string>;
  style?: Record<string, string>;          // CSS inline properties
  // Template HTML — PLACEHOLDER: {{AFFILIATE_LINK}} (remplacé par le lien du partenaire)
  htmlTemplate: string;
  trackingId: string;
  utmSource: string;                       // "partner"
  utmMedium: string;                       // "widget"
  utmCampaign: string;                     // "promo"
  isActive: boolean;
  order: number;
  views: number;
  clicks: number;
  conversions: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

// Dashboard response
export interface GetPartnerDashboardResponse {
  partner: Partner;
  recentCommissions: PartnerCommission[];
  recentClicks: { date: string; count: number }[];
  monthlyStats: {
    month: string;
    clicks: number;
    clients: number;
    calls: number;
    earnings: number;
  }[];
  notifications: PartnerNotification[];
}
```

### 1.2 Collections Firestore

```
partners/{uid}                          — Profil partenaire (PRIMARY)
partner_commissions/{commissionId}      — Commissions gagnées
partner_affiliate_clicks/{clickId}      — Tracking clics
partner_notifications/{notificationId}  — Notifications (décentralisé, comme les autres rôles)
partner_promo_widgets/{widgetId}        — Widgets HTML (bannières/boutons)
partner_config/current                  — Configuration globale (dont isPartnerListingPageVisible et isPartnerFooterLinkVisible)
partner_applications/{applicationId}    — Candidatures reçues via formulaire public
partner_monthly_stats/{YYYY-MM}         — Stats mensuelles agrégées
```

**IMPORTANT — RETRAITS** : Les retraits utilisent la collection **CENTRALISÉE** `payment_withdrawals` (PAS de collection `partner_withdrawals` séparée). Ajouter `'partner'` à `PaymentUserType` dans `payment/types/index.ts`.

### 1.3 Indexes Firestore requis

```
partner_commissions: (partnerId ASC, createdAt DESC)
partner_affiliate_clicks: (partnerCode ASC, converted ASC)
partners: (status ASC, isVisible ASC)
partner_notifications: (partnerId ASC, isRead ASC, createdAt DESC)
partner_applications: (status ASC, createdAt DESC)
```

### 1.4 Callables à Créer

**Région : `us-central1`** (latence Firestore optimale, même que les autres affiliés)

| Callable | Description | Accès |
|----------|-------------|-------|
| `createPartner` | Crée un compte partenaire (Firebase Auth + Firestore) | Admin only |
| `updatePartner` | Met à jour les infos du partenaire | Admin only |
| `deletePartner` | Désactive/supprime un partenaire | Admin only |
| `getPartnerDashboard` | Données dashboard (stats, commissions récentes) | Partner (self) |
| `updatePartnerProfile` | Modifie email, mot de passe, infos contact, paiement | Partner (self) |
| `getPartnerCommissions` | Liste paginée des commissions avec filtres | Partner (self) |
| `getPartnerClicks` | Stats de clics avec graphique | Partner (self) |
| `partnerRequestWithdrawal` | Demande de retrait (délègue au système centralisé `paymentService`) | Partner (self) |
| `getPartnerWidgets` | Liste des widgets disponibles | Partner (self) |
| `getPartnerNotifications` | Notifications paginées | Partner (self) |
| `markPartnerNotificationRead` | Marquer notification comme lue | Partner (self) |
| `trackPartnerClick` | Tracking d'un clic (appelé depuis le frontend) | Public (rate limited) |
| `admin_partnersList` | Liste/recherche/filtre partenaires | Admin only |
| `admin_partnerDetail` | Détail complet d'un partenaire | Admin only |
| `admin_updatePartnerConfig` | Met à jour la config globale (dont `isPartnerListingPageVisible` et `isPartnerFooterLinkVisible`) | Admin only |
| `admin_updatePartnerCommissionConfig` | Met à jour les commissions d'un partenaire spécifique | Admin only |
| `admin_togglePartnerVisibility` | Toggle visibilité page publique | Admin only |
| `admin_togglePartnerStatus` | Active/suspend/ban un partenaire | Admin only |
| `admin_issueManualCommission` | Commission manuelle (ajustement) | Admin only |
| `admin_getPartnerStats` | Stats globales du programme partenaire | Admin only |
| `admin_managePartnerWidgets` | CRUD widgets promo | Admin only |
| `submitPartnerApplication` | Soumet une candidature partenaire (formulaire public) | Public (rate limited: 3/heure par IP) |
| `admin_partnerApplicationsList` | Liste candidatures avec filtres (pending, contacted, etc.) | Admin only |
| `admin_updatePartnerApplication` | Change statut candidature + notes admin | Admin only |
| `admin_convertApplicationToPartner` | Crée le partenaire à partir d'une candidature acceptée (pré-remplit createPartner) | Admin only |

### 1.5 Callable `createPartner` — Création de compte par l'admin

**IMPORTANT** : Firebase Admin SDK est déjà utilisé dans le projet (`restoreFirebaseAuth.ts`, `setAdminClaims.ts`). Suivre ces patterns exactement.

```typescript
// Input
interface CreatePartnerInput {
  email: string;                  // Sera l'email Firebase Auth (PAS de mot de passe — envoi lien reset)
  firstName: string;
  lastName: string;
  phone?: string;
  country: string;
  language: SupportedPartnerLanguage;
  websiteUrl: string;
  websiteName: string;
  websiteDescription?: string;
  websiteCategory: PartnerCategory;
  websiteTraffic?: PartnerTrafficTier;
  affiliateCode: string;          // Choisi par l'admin (ex: "EXPATCOM")
  commissionPerCallLawyer: number;
  commissionPerCallExpat: number;
  usePercentage?: boolean;
  commissionPercentage?: number;
  contractNotes?: string;
  contactName?: string;
  contactEmail?: string;
  companyName?: string;
  vatNumber?: string;
  sendCredentials?: boolean;      // Envoyer email avec lien de création de mot de passe
}

// Flow EXACT (suivre le pattern de restoreFirebaseAuth.ts + setAdminClaims.ts)
1. assertAdmin(request) — Vérifier que l'appelant est admin
2. Valider tous les champs (email format, affiliateCode uppercase alphanum 3-20 chars)
3. Vérifier unicité email cross-collection (users, chatters, bloggers, influencers, group_admins, partners)
4. Vérifier unicité affiliateCode (cross-collection — tous les affiliate codes de tous les rôles)
5. Vérifier unicité websiteUrl dans partners
6. Créer le user Firebase Auth SANS mot de passe :
   const userRecord = await getAuth().createUser({
     email: normalizedEmail,
     emailVerified: false,
     disabled: false,
     displayName: `${firstName} ${lastName}`,
   });
7. Définir custom claims immédiatement :
   await getAuth().setCustomUserClaims(userRecord.uid, { role: "partner" });
8. Créer users/{uid} avec role: "partner" (déclenche aussi syncRoleClaims trigger)
9. Créer partners/{uid} avec toutes les données
10. Créer partner_config/current si n'existe pas (avec défauts)
11. Si sendCredentials: Générer lien de reset password + envoyer email :
    const resetLink = await getAuth().generatePasswordResetLink(normalizedEmail);
    await sendZoho(email, subject, html, text); // Email bienvenue avec resetLink
12. Créer partner_notifications/{id} (welcome)
13. Log d'audit dans admin_audit_logs
14. Retourner { success, partnerId, affiliateCode, affiliateLink, resetLink? }
```

**Gestion d'erreurs Firebase Auth** :
- `auth/email-already-exists` → HttpsError("already-exists")
- `auth/invalid-email` → HttpsError("invalid-argument")
- `auth/uid-already-exists` → HttpsError("already-exists")

### 1.6 Callable `submitPartnerApplication` — Formulaire candidature public

**Fichier** : `sos/firebase/functions/src/partner/callables/submitPartnerApplication.ts`
**Région** : `us-central1`
**Accès** : Public (PAS besoin d'être connecté) — **rate limited : 3/heure par IP hash**

```typescript
// Input
interface SubmitPartnerApplicationInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country: string;
  language: SupportedPartnerLanguage;
  websiteUrl: string;
  websiteName: string;
  websiteCategory: PartnerCategory;
  websiteTraffic?: PartnerTrafficTier;
  websiteDescription?: string;      // Max 500 chars
  message?: string;                  // Message libre, max 1000 chars
}

// Flow
1. Rate limiting par IP hash (3 soumissions/heure — anti-spam)
2. Valider tous les champs (email format, websiteUrl format https://, longueurs max)
3. Sanitiser les champs texte (XSS: pas de HTML/scripts dans message/description)
4. Vérifier que l'email n'a pas déjà une candidature pending/contacted
5. Vérifier que le websiteUrl n'a pas déjà une candidature pending/contacted
6. Créer partner_applications/{id} avec status: "pending"
7. Créer une notification admin dans admin_notifications/{id} :
   { type: "partner_application", title: "Nouvelle candidature partenaire", body: "${websiteName} (${email})", data: { applicationId }, isRead: false }
8. Envoyer un email de confirmation au candidat (sendZoho — template simple "Merci, nous reviendrons vers vous")
9. Retourner { success: true, applicationId }
```

**SÉCURITÉ** : C'est un callable PUBLIC — attention au spam. Rate limiting + validation stricte + sanitisation obligatoires.

### 1.6b Admin Callables pour les candidatures

**Fichier** : `sos/firebase/functions/src/partner/callables/adminPartnerApplications.ts`

```typescript
// admin_partnerApplicationsList
// - Filtre: status (pending | contacted | accepted | rejected | all)
// - Tri: createdAt DESC
// - Pagination: limit + startAfter
// - Retourne: { applications: PartnerApplication[], total: number, hasMore: boolean }

// admin_updatePartnerApplication
// Input: { applicationId, status, adminNotes? }
// - Change le statut (pending → contacted → accepted/rejected)
// - Ajoute reviewedBy + reviewedAt
// - Si status = "contacted" : envoie email au candidat ("Votre candidature est en cours d'examen")
// - Si status = "rejected" : envoie email poli de refus
// - Log audit

// admin_convertApplicationToPartner
// Input: { applicationId, affiliateCode, commissionPerCallLawyer, commissionPerCallExpat, ... }
// - Vérifie que la candidature est en status "accepted"
// - Appelle internalement la logique de createPartner (pré-rempli avec les données de la candidature)
// - Met à jour partner_applications/{id}.convertedToPartnerId = partnerId
// - Met à jour partner_applications/{id}.status = "accepted"
// - Retourne le même résultat que createPartner
```

### 1.7 Trigger `onCallCompleted` pour Partner

**CRITIQUE** : Le projet utilise un **trigger consolidé** dans `sos/firebase/functions/src/triggers/consolidatedOnCallCompleted.ts` qui appelle 5 handlers via dynamic imports. Il faut ajouter un **6ème handler** pour Partner.

**Fichier à MODIFIER** : `sos/firebase/functions/src/triggers/consolidatedOnCallCompleted.ts`

Ajouter après le handler affiliate (handler 5), avant le logging final :

```typescript
// 6. Partner handler
try {
  const { handleCallCompleted: partnerHandler } = await import(
    "../partner/triggers/onCallCompleted"
  );
  await partnerHandler(event);
  results.partner = "ok";
} catch (error) {
  results.partner = `error: ${error instanceof Error ? error.message : String(error)}`;
  logger.error("[consolidatedOnCallCompleted] Partner handler failed", {
    sessionId,
    error,
  });
}
```

**Fichier à CRÉER** : `sos/firebase/functions/src/partner/triggers/onCallCompleted.ts`

```typescript
// Export handleCallCompleted(event) — même signature que les autres handlers
// Flow:
1. Récupérer before/after data du call_session
2. Vérifier transition: was NOT paid AND now isPaid = true
3. Récupérer le client (users/{clientId})
4. Vérifier si le client a été référé par un partenaire :
   - Chercher users/{clientId}.partnerReferredBy (partnerCode)
   - OU chercher dans partner_affiliate_clicks (partnerCode + convertedUserId)
5. Si oui, récupérer le partner (partners/{partnerId})
6. Vérifier: partner.status === "active"
7. Vérifier: call duration >= partner.commissionConfig.minimumCallDuration (défaut 60s)
8. Vérifier: pas de doublon (même sourceId + partnerId + type)
9. Calculer le montant:
   - Si usePercentage: amount = callPrice * commissionPercentage / 100
   - Sinon: amount = commissionPerCallLawyer ou commissionPerCallExpat
10. Créer partner_commissions/{id} avec status: "pending"
11. Incrémenter partner balances (pendingBalance += amount) via transaction atomique
12. Incrémenter partner stats (totalCalls, totalCommissions, etc.)
13. Créer partner_notifications/{id} type "commission_earned"
```

### 1.7 Trigger `onPartnerCreated`

**Région : `europe-west3`** (comme les autres triggers)

```typescript
// Écoute: partners/{partnerId} (onDocumentCreated)
// Suivre EXACTEMENT le pattern de onBloggerCreated.ts / onGroupAdminCreated.ts
// Actions:
1. Créer notification welcome dans partner_notifications (multilingue, 9 langues)
2. Envoyer email bienvenue via sendZoho() + generateWelcomeEmail("partner", firstName, lang)
   → Ajouter le rôle "partner" dans welcomeTemplates.ts
3. Tracker analytics: analytics_events collection
```

### 1.8 Scheduled Functions (Crons)

Suivre le pattern de `consolidatedDailyEmails.ts` — utiliser `onSchedule` de `firebase-functions/v2/scheduler`.

```typescript
// 1. releasePartnerPendingCommissions — Toutes les heures
//    Commissions "pending" dont holdPeriod expiré → "validated"
//    Commissions "validated" dont releaseDelay expiré → "available"
//    Incrémenter availableBalance, décrémenter pendingBalance/validatedBalance

// 2. updatePartnerMonthlyStats — Tous les jours à 2h
//    Agrège les stats du mois en cours dans partner_monthly_stats/{YYYY-MM}
```

### 1.9 Système de retrait — Intégration au système centralisé

**IMPORTANT** : Le système de retrait est **CENTRALISÉ** dans `payment/services/paymentService.ts`. Collection : `payment_withdrawals`. Ne PAS créer de collection séparée.

**Modifications requises** :

1. **`payment/types/index.ts`** — Ajouter `'partner'` :
```typescript
export type PaymentUserType = 'chatter' | 'influencer' | 'blogger' | 'group_admin' | 'affiliate' | 'partner';
```

2. **`partnerRequestWithdrawal` callable** — Convertir les données Partner → types centralisés, puis appeler `paymentService.createWithdrawalRequest()` :
   - Utiliser `convertToPaymentMethodDetails()` (comme BloggerRequestWithdrawal)
   - Frais : $3 fixe (lus depuis `admin_config/fees` via `feeCalculationService.ts`)
   - Minimum : $30 (3000 cents)
   - `totalDebited = amount + withdrawalFee`
   - Déduire `totalDebited` du `availableBalance` du partenaire
   - Méthodes supportées : `wise` (bank_transfer) + `flutterwave` (mobile_money)

3. **Refund paths** : cancel/reject/fail → rembourser `totalDebited` (pas juste `amount`)

4. **CRITIQUE — 7 fichiers payment à modifier pour supporter `'partner'`** :

   Le système de paiement a des fonctions `getUserCollectionName()` et `getUserType()` hardcodées qui ne connaissent PAS `partner`. Sans ces modifications, les partenaires ne pourront **NI enregistrer un moyen de paiement, NI retirer, NI voir leur historique**.

   | Fichier | Fonction à modifier | Ajout requis |
   |---------|---------------------|--------------|
   | `payment/types/index.ts` | `PaymentUserType` | Ajouter `'partner'` au type union |
   | `payment/services/paymentService.ts:1567` | `getUserCollectionName()` | Ajouter `case 'partner': return 'partners';` |
   | `payment/triggers/onWithdrawalStatusChanged.ts:429` | `getUserCollection()` | Ajouter `case 'partner': return 'partners';` (le default marche par hasard mais est fragile) |
   | `payment/callables/admin/rejectWithdrawal.ts:59` | `getUserCollectionName()` | Ajouter `case 'partner': return 'partners';` (sinon CRASH au rejet) |
   | `payment/callables/requestWithdrawal.ts:52` | `getUserTypeAndProfile()` | Ajouter bloc `// Check partners` qui lit `partners/{userId}` |
   | `payment/callables/savePaymentMethod.ts:52` | `getUserType()` | Ajouter bloc `// Check partners` qui lit `partners/{userId}` |
   | `payment/callables/getPaymentMethods.ts:43` | `getUserType()` | Ajouter bloc `// Check partners` |
   | `payment/callables/getWithdrawalHistory.ts:46` | `getUserType()` | Ajouter bloc `// Check partners` |

   **Pattern à suivre** (pour chaque `getUserType`/`getUserTypeAndProfile`) :
   ```typescript
   // Check partners
   const partnerDoc = await db.collection('partners').doc(userId).get();
   if (partnerDoc.exists && partnerDoc.data()?.status === 'active') {
     return 'partner'; // ou { userType: 'partner', email: ..., displayName: ..., status: ... }
   }
   ```

### 1.10 Intégration dans le système existant

**Fichiers à modifier** :

1. **`sos/firebase/functions/src/index.ts`** — Exporter les nouvelles fonctions partner
2. **`sos/firebase/functions/src/functionConfigs.ts`** — Ajouter configs (voir ci-dessous)
3. **`sos/firebase/functions/src/triggers/consolidatedOnCallCompleted.ts`** — Ajouter 6ème handler partner
4. **`sos/firebase/functions/src/payment/types/index.ts`** — Ajouter `'partner'` à `PaymentUserType`
5. **`sos/firebase/functions/src/auth/syncRoleClaims.ts`** — S'assurer que `"partner"` est dans la liste `validRoles`
6. **`sos/firebase/functions/src/emailMarketing/welcomeTemplates.ts`** — Ajouter rôle "partner" + 11 traductions

**Champ à ajouter dans `users/{uid}`** (pour clients référés par un partenaire) :
```typescript
partnerReferredBy?: string;      // partnerCode
partnerReferredById?: string;    // partnerId (UID)
partnerReferredAt?: Timestamp;
```

### 1.11 Configuration des fonctions

```typescript
// Dans functionConfigs.ts — SUIVRE LE PATTERN de affiliateAdminConfig
export const partnerConfig = {
  region: "us-central1" as const,
  memory: "256MiB" as const,
  cpu: 0.083,
  maxInstances: 1,          // PAS 2 — quota us-central1 à 80%
  minInstances: 0,
  concurrency: 1,           // cpu < 1 requires concurrency = 1
  cors: ALLOWED_ORIGINS,
};

export const partnerAdminConfig = {
  region: "us-central1" as const,
  memory: "256MiB" as const,
  cpu: 0.083,
  maxInstances: 1,
  minInstances: 0,
  concurrency: 1,
  cors: ALLOWED_ORIGINS,
};

// Les triggers utilisent les valeurs INLINE dans onDocumentCreated/onDocumentUpdated
// (pas de config séparée, comme les autres triggers du projet)
```

### 1.12 Intégration du tracking referral (frontend → backend)

**Système existant** : `sos/src/utils/referralStorage.ts` capture `?ref=CODE` en localStorage avec expiration 30 jours.

**Modifications requises** :

1. **`referralStorage.ts`** — Ajouter `'partner'` au type `ActorType` :
```typescript
export type ActorType = 'client' | 'influencer' | 'chatter' | 'blogger' | 'groupAdmin' | 'partner';
```

2. **Frontend (RegisterClient / ClientRegisterForm)** — Quand un visiteur arrive avec `?ref=EXPATCOM`, le code est stocké en localStorage. À l'inscription, il est envoyé comme `pendingReferralCode`.

3. **Backend (`affiliate/triggers/onUserCreated.ts`)** — Le `resolveAffiliateCode()` doit aussi chercher dans `partners` collection. Si trouvé, écrire `partnerReferredBy` et `partnerReferredById` dans `users/{clientId}`.

### 1.13 Modifications CRITIQUES de `codeGenerator.ts`

**Fichier** : `sos/firebase/functions/src/affiliate/utils/codeGenerator.ts`

**PROBLÈME** : `resolveAffiliateCode()` et `isCodeTaken()` ne cherchent PAS dans la collection `partners`. Sans ces modifications, le tracking partenaire est **cassé** — les codes partenaires ne seront jamais résolus et des collisions de codes sont possibles.

#### Modification 1 : `resolveAffiliateCode()` — Ajouter 4ème recherche

```typescript
// APRÈS les 3 recherches existantes (users.affiliateCode, users.affiliateCodeClient, users.affiliateCodeRecruitment),
// AJOUTER cette 4ème recherche :

// 4. Fourth try: partners.affiliateCode
const partnerSnap = await db.collection("partners")
  .where("affiliateCode", "==", normalizedCode)
  .where("status", "==", "active")
  .limit(1)
  .get();

if (!partnerSnap.empty) {
  const partnerDoc = partnerSnap.docs[0];
  const partnerData = partnerDoc.data();
  return {
    userId: partnerDoc.id,
    email: partnerData.email || "",
    actorType: "partner",
  };
}
```

#### Modification 2 : `isCodeTaken()` — Vérifier aussi `partners`

```typescript
// APRÈS les vérifications existantes (users.affiliateCode + affiliate_codes),
// AJOUTER :

// Check partners collection
const partnerSnap = await db.collection("partners")
  .where("affiliateCode", "==", normalizedCode)
  .limit(1)
  .get();

if (!partnerSnap.empty) return true;
```

#### Modification 3 : Validation de longueur pour partenaires

La validation actuelle accepte 6-8 caractères. Les codes partenaires doivent accepter **3-20 caractères** (ex: "VIE", "EXPATCOM", "FEMMEXPAT"). Modifier la validation dans `createPartner.ts` pour utiliser sa propre regex : `/^[A-Z0-9]{3,20}$/` (ne PAS modifier la validation 6-8 des autres rôles).

---

## PHASE 2 — FRONTEND PARTNER DASHBOARD

### 2.1 Structure des fichiers

```
sos/src/pages/Partner/
├── PartnerDashboard.tsx              — Dashboard principal (stats, graphiques, résumé)
├── PartnerEarnings.tsx               — Historique commissions (tableau, filtres, export CSV BOM)
├── PartnerClicks.tsx                 — Stats de clics (graphique Recharts, tableau, conversion)
├── PartnerWidgets.tsx                — Widgets promo (bannières, boutons, code à copier)
├── PartnerProfile.tsx                — Profil (modifier infos contact, site, paiement, mot de passe)
├── PartnerPayments.tsx               — Gestion retraits (demander, historique, statuts)
├── PartnerSuspended.tsx              — Page affichée si compte suspendu

sos/src/components/Partner/
├── Layout/
│   └── PartnerDashboardLayout.tsx    — Layout avec sidebar (couleur: blue-600/indigo-700) + mobile nav
├── Cards/
│   ├── PartnerBalanceCard.tsx
│   ├── PartnerStatsCard.tsx
│   ├── PartnerEarningsChart.tsx      — Recharts
│   ├── PartnerClicksChart.tsx        — Recharts
│   └── PartnerRecentCommissions.tsx
└── index.ts

sos/src/hooks/
└── usePartner.ts                     — Hook centralisé
```

### 2.2 Routes à ajouter dans App.tsx

**IMPORTANT** : Les paths sont en **français** (comme les autres rôles affiliés). Pas de route d'inscription (comptes créés par admin).

```typescript
// Lazy imports — AJOUTER après les imports GroupAdmin (~ligne 215)
const PartnerDashboard = lazy(() => import('./pages/Partner/PartnerDashboard'));
const PartnerEarnings = lazy(() => import('./pages/Partner/PartnerEarnings'));
const PartnerClicks = lazy(() => import('./pages/Partner/PartnerClicks'));
const PartnerWidgets = lazy(() => import('./pages/Partner/PartnerWidgets'));
const PartnerProfile = lazy(() => import('./pages/Partner/PartnerProfile'));
const PartnerPayments = lazy(() => import('./pages/Partner/PartnerPayments'));
const PartnerSuspended = lazy(() => import('./pages/Partner/PartnerSuspended'));
const PartnerLanding = lazy(() => import('./pages/Partners/PartnerLanding'));
const PartnersPage = lazy(() => import('./pages/Partners/PartnersPage'));

// Routes PUBLIQUES — dans routeConfigs (~ligne 342)
{ path: "/devenir-partenaire", component: PartnerLanding, translated: "partner-landing" },
{ path: "/partenaires", component: PartnersPage, translated: "partners-page" },

// Routes PROTÉGÉES — dans protectedUserRoutes (~ligne 462)
{ path: "/partner/tableau-de-bord", component: PartnerDashboard, protected: true, role: 'partner', translated: "partner-dashboard" },
{ path: "/partner/gains", component: PartnerEarnings, protected: true, role: 'partner', translated: "partner-earnings" },
{ path: "/partner/statistiques", component: PartnerClicks, protected: true, role: 'partner', translated: "partner-clicks" },
{ path: "/partner/widgets", component: PartnerWidgets, protected: true, role: 'partner', translated: "partner-widgets" },
{ path: "/partner/profil", component: PartnerProfile, protected: true, role: 'partner', translated: "partner-profile" },
{ path: "/partner/paiements", component: PartnerPayments, protected: true, role: 'partner', translated: "partner-payments" },
```

### 2.3 Ajouts dans localeRoutes.ts

**OBLIGATOIRE** : Ajouter les clés `RouteKey` et les traductions dans `sos/src/multilingual-system/core/routing/localeRoutes.ts`.

Ajouter au type `RouteKey` :
```typescript
| "partner-landing" | "partners-page" | "partner-dashboard" | "partner-earnings"
| "partner-clicks" | "partner-widgets" | "partner-profile" | "partner-payments"
```

Ajouter dans `ROUTE_TRANSLATIONS` les traductions pour les 9 langues (fr, en, es, de, ru, pt, ch, hi, ar).

### 2.4 Redirect post-login

**Modifier** `sos/src/pages/Login.tsx` (~ligne 754) — ajouter :
```typescript
} else if (user.role === "partner") {
  defaultDashboard = "/partner/tableau-de-bord";
```

### 2.5 Hook `usePartner`

Suivre exactement le pattern de `useBlogger.ts` :
```typescript
export const usePartner = () => {
  return {
    partner: Partner | null,
    dashboardData: GetPartnerDashboardResponse | null,
    commissions: PartnerCommission[],
    notifications: PartnerNotification[],
    isLoading: boolean,
    error: string | null,
    isPartner: boolean,
    affiliateLink: string,
    totalBalance: number,
    canWithdraw: boolean,                 // availableBalance >= $30
    requestWithdrawal, updateProfile, changePassword,
    markNotificationRead, markAllNotificationsRead, unreadNotificationsCount,
  };
};
```

### 2.6 PartnerWidgets — Placeholder template

**IMPORTANT** : Utiliser `{{AFFILIATE_LINK}}` comme placeholder (comme BloggerWidgets.tsx). PAS `{{affiliateUrl}}` ni `{{affiliateCode}}`.

Le frontend remplace :
```typescript
widget.htmlTemplate.replace(/\{\{AFFILIATE_LINK\}\}/g, partner.affiliateLink)
```

Les widgets sont chargés depuis Firestore directement (pas via callable) :
```typescript
const q = query(collection(db, 'partner_promo_widgets'), where('isActive', '==', true));
```

---

## PHASE 3 — CONSOLE D'ADMINISTRATION

### 3.1 Structure des fichiers admin

```
sos/src/pages/admin/Partners/
├── AdminPartnersList.tsx             — Liste (tableau, filtres, recherche)
├── AdminPartnerDetail.tsx            — Détail avec onglets (vue d'ensemble, commissions, clics, retraits, config)
├── AdminPartnerCreate.tsx            — Formulaire de création
├── AdminPartnersPayments.tsx         — Gestion des retraits (approuver/rejeter)
├── AdminPartnersConfig.tsx           — Configuration globale (dont toggles visibilité)
├── AdminPartnersWidgets.tsx          — CRUD widgets promo
├── AdminPartnersStats.tsx            — Vue d'ensemble du programme
├── AdminPartnerApplications.tsx     — Candidatures reçues (tableau, filtres, actions)
```

### 3.2 Routes admin dans AdminRoutesV2.tsx

Ajouter après les routes Blogger, avant GroupAdmins. Chaque route wrappée dans `<Suspense fallback={<LoadingSpinner />}>`.

```typescript
{/* PARTNERS */}
<Route path="partners" element={<Suspense fallback={<LoadingSpinner />}><AdminPartnersList /></Suspense>} />
<Route path="partners/create" element={<Suspense fallback={<LoadingSpinner />}><AdminPartnerCreate /></Suspense>} />
<Route path="partners/:partnerId" element={<Suspense fallback={<LoadingSpinner />}><AdminPartnerDetail /></Suspense>} />
<Route path="partners/payments" element={<Suspense fallback={<LoadingSpinner />}><AdminPartnersPayments /></Suspense>} />
<Route path="partners/config" element={<Suspense fallback={<LoadingSpinner />}><AdminPartnersConfig /></Suspense>} />
<Route path="partners/widgets" element={<Suspense fallback={<LoadingSpinner />}><AdminPartnersWidgets /></Suspense>} />
<Route path="partners/stats" element={<Suspense fallback={<LoadingSpinner />}><AdminPartnersStats /></Suspense>} />
<Route path="partners/applications" element={<Suspense fallback={<LoadingSpinner />}><AdminPartnerApplications /></Suspense>} />
```

### 3.3 Menu admin dans adminMenu.ts

Suivre le pattern exact des autres rôles. Icônes = Lucide (`Handshake`, `Users`, `Wallet`, `Settings`, etc.)

```typescript
{
  id: "partners",
  labelKey: "admin.menu.partners",
  icon: Handshake,
  descriptionKey: "admin.menu.partners.description",
  children: [
    { id: "partners-list", labelKey: "admin.menu.partnersList", path: "/admin/partners", icon: Users },
    { id: "partners-applications", labelKey: "admin.menu.partnersApplications", path: "/admin/partners/applications", icon: Inbox, badge: "dynamic" },
    { id: "partners-create", labelKey: "admin.menu.partnersCreate", path: "/admin/partners/create", icon: UserPlus },
    { id: "partners-payments", labelKey: "admin.menu.partnersPayments", path: "/admin/partners/payments", icon: Wallet },
    { id: "partners-widgets", labelKey: "admin.menu.partnersWidgets", path: "/admin/partners/widgets", icon: Code },
    { id: "partners-config", labelKey: "admin.menu.partnersConfig", path: "/admin/partners/config", icon: Settings },
    { id: "partners-stats", labelKey: "admin.menu.partnersStats", path: "/admin/partners/stats", icon: TrendingUp },
  ],
}
```

### 3.4 AdminPartnerCreate — Formulaire de création

**Sections** :

1. **Identifiants** — Email *, Checkbox "Envoyer lien de création de mot de passe par email"
2. **Contact** — Prénom *, Nom *, Téléphone, Pays *, Langue *
3. **Site partenaire** — URL *, Nom *, Description, Catégorie * (dropdown), Trafic (dropdown), Logo (upload)
4. **Code affilié** — Code * (uppercase, auto-suggestion, vérification unicité temps réel), Preview lien
5. **Commissions** — Toggle fixe/pourcentage, montants, hold period, release delay
6. **Contrat** — Date début, Date fin (optionnel), Notes
7. **Contact commercial** (optionnel) — Nom, Email, Raison sociale, TVA

**Action** : "Créer le partenaire" → appelle `createPartner` → affiche récap avec code, lien, et confirmation email envoyé

### 3.5 AdminPartnersConfig — Configuration globale

Inclure les **2 toggles de visibilité** :
- `isPartnerListingPageVisible` — Afficher/masquer la page publique "/partenaires"
- `isPartnerFooterLinkVisible` — Afficher/masquer le lien "Nos partenaires" dans le footer du site

Plus tous les paramètres globaux : commissions par défaut, hold period, minimum retrait, attributionWindowDays, etc.

Suivre le pattern de `AdminBloggersConfig.tsx` (formulaire avec toggles, inputs numériques, bouton save).

### 3.6 AdminPartnerApplications — Gestion des candidatures

**Fichier** : `sos/src/pages/admin/Partners/AdminPartnerApplications.tsx`

**Contenu** :
- **Badge dynamique** dans le menu : nombre de candidatures `pending` (query Firestore `where("status", "==", "pending")`)
- **Tableau** avec colonnes : Date, Nom, Email, Site web, Catégorie, Trafic, Statut, Actions
- **Filtres** : Statut (pending, contacted, accepted, rejected, all), recherche texte
- **Actions par ligne** :
  - `pending` → Boutons : "Marquer comme contacté" | "Rejeter"
  - `contacted` → Boutons : "Accepter" | "Rejeter"
  - `accepted` → Bouton : "Créer le compte partenaire" (ouvre AdminPartnerCreate pré-rempli avec les données de la candidature)
  - `rejected` → Badge grisé, pas d'action
- **Drawer détail** (clic sur la ligne) : affiche toutes les infos + message + notes admin éditables
- **Email automatique** : changement de statut envoie un email au candidat (confirmation contacté / refus poli)
- **Conversion** : Le bouton "Créer le compte partenaire" navigue vers `/admin/partners/create?fromApplication={applicationId}` avec les champs pré-remplis. Après création réussie, la candidature est automatiquement mise à jour (`convertedToPartnerId`, `status: "accepted"`)

### 3.7 AdminPartnerDetail — Onglets

1. **Vue d'ensemble** : infos, stats résumées, graphique revenus 12 mois, soldes, actions (modifier statut/commissions)
2. **Commissions** : tableau paginé, filtres, export CSV
3. **Clics** : graphique clics + conversions, tableau détaillé
4. **Retraits** : historique, actions approuver/rejeter
5. **Configuration** : modifier commissions, infos site, contrat, notes admin

Couleur thème admin Partner : **cyan/blue** (distinct de purple=Bloggers).

---

## PHASE 4 — PAGES PUBLIQUES

### 4.1 Page "Nos Partenaires de Confiance"

**Route** : `/partenaires` (publique)
**Fichier** : `sos/src/pages/Partners/PartnersPage.tsx`

**CONDITIONNEL** : Cette page ne s'affiche que si `partner_config/current.isPartnerListingPageVisible === true`. Sinon, redirect vers home ou afficher page vide.

**Contenu** :
- Hero : "Nos Partenaires de Confiance" + sous-titre
- Grille de partenaires (isVisible: true) : Logo, Nom, Description, Catégorie (badge), Lien vers le site
- Section "Devenir partenaire" avec CTA
- SEO : title, meta description, structured data (Organization schema)

### 4.2 Lien dans le Footer

**CONDITIONNEL** : Le lien "Nos partenaires" dans le footer ne s'affiche que si `partner_config/current.isPartnerFooterLinkVisible === true`.

**Fichier à modifier** : Le composant Footer du site (`sos/src/components/layout/Footer.tsx` ou équivalent). Ajouter :
```typescript
// Lire partner_config/current.isPartnerFooterLinkVisible depuis Firestore (ou via un context/hook)
{isPartnerFooterLinkVisible && (
  <Link to="/partenaires">
    <FormattedMessage id="footer.partners" defaultMessage="Nos partenaires" />
  </Link>
)}
```

**Stratégie de chargement** : Pour éviter un appel Firestore sur chaque page, stocker la valeur dans un AppContext/hook global qui charge les configs au démarrage de l'app, ou utiliser un cache localStorage avec TTL de 1h.

### 4.3 Landing Page Partenaire

**Route** : `/devenir-partenaire` (publique)
**Fichier** : `sos/src/pages/Partners/PartnerLanding.tsx`

**Contenu** :
- Hero : "Monétisez votre audience d'expatriés" + CTA "Devenir partenaire" (scroll vers formulaire)
- Section "Comment ça marche" (4 étapes)
- Section "Pourquoi devenir partenaire" (avantages)
- Section "Ils nous font confiance" (logos partenaires visibles)
- FAQ
- **Formulaire de candidature** (section `id="apply"` pour le scroll) :
  - Champs : Prénom*, Nom*, Email*, Téléphone, Pays* (select), Langue*, URL du site*, Nom du site*, Catégorie* (select PartnerCategory), Trafic estimé (select PartnerTrafficTier), Description du site (textarea max 500), Message (textarea max 1000)
  - CTA : "Envoyer ma candidature"
  - Appelle `submitPartnerApplication` (callable public, rate limited)
  - Après succès : message de confirmation "Merci ! Nous vous recontacterons dans les 48h."
  - Pas de toast — afficher un état de succès dans le formulaire (remplace les champs)
  - Validation frontend + backend (email format, URL https://, champs requis)

**PAS de bouton "S'inscrire"** — l'admin crée les comptes manuellement après réception et examen de la candidature.

---

## PHASE 5 — TRADUCTIONS i18n

### 5.1 Système de traduction

Le projet utilise `react-intl` (FormattedMessage / useIntl). Les fichiers de traduction sont dans `sos/src/helper/{lang}.json`.

**Convention de nommage** : `dot.notation.camelCase` (pas de tirets, pas d'underscores)

**Patterns existants** :
- Rôle frontend : `{role}.{section}.{subsection}` (ex: `blogger.menu.dashboard`)
- Admin : `admin.{roles}.{section}` (ex: `admin.bloggers.config.title`)
- Colonnes admin : `admin.{roles}.col.{field}` (ex: `admin.bloggers.col.earnings`)
- Filtres admin : `admin.{roles}.filter.{value}` (ex: `admin.bloggers.filter.active`)

### 5.2 Clés à créer

Toutes les clés doivent être traduites dans les **9 fichiers** :
- `sos/src/helper/fr.json`, `en.json`, `es.json`, `de.json`, `ru.json`, `hi.json`, `pt.json`, `ch.json`, `ar.json`

```json
{
  "partner.menu.dashboard": "Tableau de bord",
  "partner.menu.earnings": "Mes gains",
  "partner.menu.clicks": "Statistiques",
  "partner.menu.widgets": "Widgets",
  "partner.menu.profile": "Mon profil",
  "partner.menu.payments": "Paiements",

  "partner.dashboard.title": "Tableau de bord Partenaire",
  "partner.dashboard.welcome": "Bonjour {firstName}, voici vos performances",
  "partner.dashboard.balance": "Solde disponible",
  "partner.dashboard.clicks": "Clics ce mois",
  "partner.dashboard.calls": "Appels générés",
  "partner.dashboard.conversion": "Taux de conversion",
  "partner.dashboard.recentCommissions": "Dernières commissions",
  "partner.dashboard.viewAll": "Voir tout",
  "partner.dashboard.affiliateLink": "Votre lien affilié",
  "partner.dashboard.copyLink": "Copier le lien",
  "partner.dashboard.linkCopied": "Lien copié !",

  "partner.earnings.title": "Historique des commissions",
  "partner.earnings.filter.all": "Toutes",
  "partner.earnings.filter.pending": "En attente",
  "partner.earnings.filter.available": "Disponibles",
  "partner.earnings.filter.paid": "Payées",
  "partner.earnings.export": "Exporter CSV",
  "partner.earnings.noData": "Aucune commission pour le moment",

  "partner.clicks.title": "Statistiques de clics",
  "partner.clicks.total": "Total clics",
  "partner.clicks.conversions": "Conversions",
  "partner.clicks.rate": "Taux de conversion",
  "partner.clicks.period.30d": "30 jours",
  "partner.clicks.period.6m": "6 mois",
  "partner.clicks.period.12m": "12 mois",

  "partner.widgets.title": "Widgets promotionnels",
  "partner.widgets.description": "Intégrez ces widgets sur votre site pour promouvoir SOS-Expat",
  "partner.widgets.copyCode": "Copier le code",
  "partner.widgets.codeCopied": "Code copié !",
  "partner.widgets.preview": "Aperçu",
  "partner.widgets.noWidgets": "Aucun widget disponible",

  "partner.profile.title": "Mon profil",
  "partner.profile.personalInfo": "Informations personnelles",
  "partner.profile.websiteInfo": "Informations du site",
  "partner.profile.contactInfo": "Contact commercial",
  "partner.profile.paymentInfo": "Informations de paiement",
  "partner.profile.changePassword": "Changer le mot de passe",
  "partner.profile.saved": "Profil mis à jour",

  "partner.payments.title": "Paiements & Retraits",
  "partner.payments.available": "Solde disponible",
  "partner.payments.withdraw": "Demander un retrait",
  "partner.payments.minimum": "Minimum {amount}",
  "partner.payments.fee": "Frais de retrait : {amount}",
  "partner.payments.history": "Historique des retraits",
  "partner.payments.status.pending": "En attente",
  "partner.payments.status.approved": "Approuvé",
  "partner.payments.status.processing": "En cours",
  "partner.payments.status.completed": "Complété",
  "partner.payments.status.failed": "Échoué",
  "partner.payments.withdrawAll": "Tout retirer",

  "partner.suspended.title": "Compte suspendu",
  "partner.suspended.message": "Votre compte partenaire a été suspendu. Contactez-nous pour plus d'informations.",

  "partner.landing.hero.title": "Monétisez votre audience d'expatriés",
  "partner.landing.hero.subtitle": "Devenez partenaire SOS-Expat et percevez une commission sur chaque appel généré depuis votre site",
  "partner.landing.hero.cta": "Nous contacter",
  "partner.landing.howItWorks.title": "Comment ça marche",
  "partner.landing.howItWorks.step1": "On crée votre compte partenaire",
  "partner.landing.howItWorks.step2": "Vous intégrez notre widget sur votre site",
  "partner.landing.howItWorks.step3": "Vos visiteurs accèdent à nos services",
  "partner.landing.howItWorks.step4": "Vous percevez une commission sur chaque appel",
  "partner.landing.why.title": "Pourquoi devenir partenaire",
  "partner.landing.trusted.title": "Ils nous font confiance",
  "partner.landing.faq.title": "Questions fréquentes",
  "partner.landing.cta.title": "Prêt à devenir partenaire ?",
  "partner.landing.apply.title": "Envoyer ma candidature",
  "partner.landing.apply.subtitle": "Remplissez le formulaire ci-dessous, nous vous recontacterons dans les 48h",
  "partner.landing.apply.submit": "Envoyer ma candidature",
  "partner.landing.apply.success": "Merci ! Votre candidature a bien été envoyée. Nous vous recontacterons dans les 48h.",
  "partner.landing.apply.websiteUrl": "URL de votre site",
  "partner.landing.apply.websiteName": "Nom de votre site",
  "partner.landing.apply.websiteCategory": "Catégorie",
  "partner.landing.apply.websiteTraffic": "Trafic mensuel estimé",
  "partner.landing.apply.websiteDescription": "Description de votre site",
  "partner.landing.apply.message": "Message (optionnel)",
  "partner.landing.apply.messagePlaceholder": "Décrivez votre projet de partenariat, vos attentes...",

  "partners.page.title": "Nos Partenaires de Confiance",
  "partners.page.subtitle": "Des sites de référence qui recommandent nos services d'assistance aux expatriés",
  "partners.page.become": "Devenir partenaire",
  "partners.page.visit": "Visiter le site",

  "footer.partners": "Nos partenaires",

  "admin.menu.partners": "Partenaires",
  "admin.menu.partners.description": "Gestion des partenaires commerciaux",
  "admin.menu.partnersList": "Liste des partenaires",
  "admin.menu.partnersCreate": "Nouveau partenaire",
  "admin.menu.partnersPayments": "Paiements",
  "admin.menu.partnersWidgets": "Widgets",
  "admin.menu.partnersConfig": "Configuration",
  "admin.menu.partnersStats": "Statistiques",
  "admin.menu.partnersApplications": "Candidatures",

  "admin.partners.title": "Gestion Partenaires",
  "admin.partners.subtitle": "Gérer les partenaires et leurs revenus",
  "admin.partners.config.title": "Configuration",
  "admin.partners.config.subtitle": "Paramètres du programme partenaire",
  "admin.partners.config.footerLinkVisible": "Lien partenaires dans le footer",
  "admin.partners.config.listingPageVisible": "Page publique partenaires visible",
  "admin.partners.payments.title": "Paiements Partenaires",
  "admin.partners.payments.subtitle": "Gérer les retraits des partenaires",
  "admin.partners.widgets.title": "Widgets Promo",
  "admin.partners.widgets.subtitle": "Gérer les widgets promotionnels",
  "admin.partners.stats.title": "Statistiques Programme",
  "admin.partners.stats.subtitle": "Vue d'ensemble du programme partenaire",

  "admin.partners.col.logo": "Logo",
  "admin.partners.col.website": "Site",
  "admin.partners.col.code": "Code",
  "admin.partners.col.status": "Statut",
  "admin.partners.col.clicks": "Clics (mois)",
  "admin.partners.col.calls": "Appels (mois)",
  "admin.partners.col.earnings": "Revenus (mois)",
  "admin.partners.col.conversion": "Conversion",

  "admin.partners.filter.all": "Tous",
  "admin.partners.filter.active": "Actifs",
  "admin.partners.filter.suspended": "Suspendus",
  "admin.partners.filter.banned": "Bannis",
  "admin.partners.search": "Rechercher un partenaire...",

  "admin.partners.applications.title": "Candidatures Partenaires",
  "admin.partners.applications.subtitle": "Gérer les demandes de partenariat reçues",
  "admin.partners.applications.col.date": "Date",
  "admin.partners.applications.col.name": "Nom",
  "admin.partners.applications.col.email": "Email",
  "admin.partners.applications.col.website": "Site web",
  "admin.partners.applications.col.category": "Catégorie",
  "admin.partners.applications.col.traffic": "Trafic",
  "admin.partners.applications.col.status": "Statut",
  "admin.partners.applications.col.actions": "Actions",
  "admin.partners.applications.status.pending": "En attente",
  "admin.partners.applications.status.contacted": "Contacté",
  "admin.partners.applications.status.accepted": "Accepté",
  "admin.partners.applications.status.rejected": "Refusé",
  "admin.partners.applications.action.contact": "Marquer contacté",
  "admin.partners.applications.action.accept": "Accepter",
  "admin.partners.applications.action.reject": "Rejeter",
  "admin.partners.applications.action.createAccount": "Créer le compte partenaire",
  "admin.partners.applications.empty": "Aucune candidature",
  "admin.partners.applications.notes": "Notes admin",
  "admin.partners.empty": "Aucun partenaire trouvé",
  "admin.partners.export": "Exporter",

  "admin.partners.form.email": "Email",
  "admin.partners.form.sendCredentials": "Envoyer le lien de création de mot de passe par email",
  "admin.partners.form.websiteUrl": "URL du site",
  "admin.partners.form.websiteName": "Nom du site",
  "admin.partners.form.websiteDescription": "Description du site",
  "admin.partners.form.websiteCategory": "Catégorie",
  "admin.partners.form.websiteTraffic": "Trafic estimé",
  "admin.partners.form.affiliateCode": "Code affilié",
  "admin.partners.form.commission": "Commission par appel",
  "admin.partners.form.commissionLawyer": "Appel avocat",
  "admin.partners.form.commissionExpat": "Appel expatrié",
  "admin.partners.form.usePercentage": "Mode pourcentage",
  "admin.partners.form.success": "Partenaire créé avec succès",
  "admin.partners.form.error": "Erreur lors de la création",

  "admin.partners.detail.overview": "Vue d'ensemble",
  "admin.partners.detail.commissions": "Commissions",
  "admin.partners.detail.clicks": "Clics",
  "admin.partners.detail.withdrawals": "Retraits",
  "admin.partners.detail.settings": "Configuration",

  "admin.partners.stats.active": "Actifs",
  "admin.partners.stats.earnings": "Gains totaux",
  "admin.partners.stats.newMonth": "Nouveaux ce mois",
  "admin.partners.stats.totalClicks": "Total clics"
}
```

---

## PHASE 6 — MODIFICATIONS SYSTÈME EXISTANT (RÉCAPITULATIF)

### 6.1 Backend

| Fichier | Modification |
|---------|-------------|
| `functions/src/index.ts` | Exporter fonctions partner |
| `functions/src/functionConfigs.ts` | Ajouter `partnerConfig` + `partnerAdminConfig` |
| `functions/src/triggers/consolidatedOnCallCompleted.ts` | Ajouter 6ème handler partner |
| `functions/src/payment/types/index.ts` | Ajouter `'partner'` à `PaymentUserType` |
| `functions/src/auth/syncRoleClaims.ts` | Ajouter `"partner"` à `validRoles` |
| `functions/src/emailMarketing/welcomeTemplates.ts` | Ajouter rôle "partner" + traductions |
| `functions/src/affiliate/utils/codeGenerator.ts` | **CRITIQUE** : Ajouter recherche `partners` dans `resolveAffiliateCode()` (4ème query) + `isCodeTaken()` (voir section 1.13) |
| `functions/src/affiliate/triggers/onUserCreated.ts` | Ajouter résolution code partner |
| `functions/src/payment/services/paymentService.ts` | **CRITIQUE** : Ajouter `case 'partner': return 'partners'` dans `getUserCollectionName()` (ligne ~1567) |
| `functions/src/payment/triggers/onWithdrawalStatusChanged.ts` | Ajouter `case 'partner': return 'partners'` dans `getUserCollection()` (ligne ~429) |
| `functions/src/payment/callables/admin/rejectWithdrawal.ts` | Ajouter `case 'partner': return 'partners'` dans `getUserCollectionName()` (ligne ~59) |
| `functions/src/payment/callables/requestWithdrawal.ts` | Ajouter bloc `// Check partners` dans `getUserTypeAndProfile()` (ligne ~52) |
| `functions/src/payment/callables/savePaymentMethod.ts` | Ajouter bloc `// Check partners` dans `getUserType()` (ligne ~52) |
| `functions/src/payment/callables/getPaymentMethods.ts` | Ajouter bloc `// Check partners` dans `getUserType()` (ligne ~43) |
| `functions/src/payment/callables/getWithdrawalHistory.ts` | Ajouter bloc `// Check partners` dans `getUserType()` (ligne ~46) |

### 6.2 Frontend

| Fichier | Modification |
|---------|-------------|
| `src/contexts/types.ts` | Ajouter `"partner"` à `UserRole` |
| `src/App.tsx` | Ajouter lazy imports + routes publiques + routes protégées |
| `src/pages/Login.tsx` | Ajouter redirect post-login partner |
| `src/multilingual-system/core/routing/localeRoutes.ts` | Ajouter RouteKey + traductions routes |
| `src/utils/referralStorage.ts` | Ajouter `'partner'` à `ActorType` |
| `src/components/admin/AdminRoutesV2.tsx` | Ajouter routes admin partner |
| `src/config/adminMenu.ts` | Ajouter section menu Partenaires |
| `src/components/layout/Footer.tsx` | Ajouter lien conditionnel "Nos partenaires" |
| `src/helper/fr.json` (+ 8 autres) | Ajouter toutes les clés i18n |

---

## PHASE 7 — SÉCURITÉ & BONNES PRATIQUES

- **Email** : format valide + unicité cross-collection
- **affiliateCode** : uppercase, alphanum, 3-20 chars, unicité cross-collection
- **websiteUrl** : format URL valide (https://), unicité dans partners
- **Commissions** : montants > 0, ≤ prix de l'appel
- **Retraits** : availableBalance >= amount + fee, pas de retrait concurrent
- **Anti-fraude** : durée d'appel min 60s, dédoublonnage commissions, hold period 7j, hash IP (JAMAIS IP brute — GDPR), rate limiting clicks
- **GDPR / Protection des données (couverture mondiale)** : Conformité GDPR (EU), CCPA (Californie), LGPD (Brésil), POPIA (Afrique du Sud) — pas d'IP brute (hash uniquement), données bancaires chiffrées en transit, droit de suppression/portabilité, minimisation des données, consentement explicite tracké
- **CGU / eIDAS** : termsAccepted, termsAcceptedAt, termsVersion, termsType, termsAcceptanceMeta (preuve légale d'acceptation conforme eIDAS)
- **XSS** : Pas de `dangerouslySetInnerHTML` sans sanitisation sur les templates widgets

---

## PHASE 8 — DÉPLOIEMENT

### Backend
```bash
cd sos/firebase/functions
rm -rf lib
npm run build    # avec --skipLibCheck
firebase deploy --only functions
```

### Frontend
Push sur `main` → Cloudflare Pages auto-deploy.

### Firestore
- Créer `partner_config/current` avec les défauts
- Créer les indexes composites (voir section 1.3)

### MailWizz
- Créer templates : `TR_PARTNER_welcome_{LANG}` pour les 9 langues
- Naming MailWizz : `transactional-partner-welcome [FR]`, `[EN]`, etc.

---

## RÉCAPITULATIF COMPLET DES FICHIERS

### À CRÉER — Backend

```
sos/firebase/functions/src/partner/
├── types.ts
├── index.ts                                    — Export toutes fonctions
├── callables/
│   ├── createPartner.ts
│   ├── updatePartner.ts
│   ├── deletePartner.ts
│   ├── getPartnerDashboard.ts
│   ├── updatePartnerProfile.ts
│   ├── getPartnerCommissions.ts
│   ├── getPartnerClicks.ts
│   ├── partnerRequestWithdrawal.ts
│   ├── getPartnerWidgets.ts
│   ├── getPartnerNotifications.ts
│   ├── markPartnerNotificationRead.ts
│   ├── trackPartnerClick.ts
│   ├── submitPartnerApplication.ts          — Formulaire candidature public (rate limited)
│   └── admin/
│       ├── index.ts
│       ├── partnersList.ts
│       ├── partnerDetail.ts
│       ├── updatePartnerConfig.ts
│       ├── updatePartnerCommissionConfig.ts
│       ├── togglePartnerVisibility.ts
│       ├── togglePartnerStatus.ts
│       ├── issueManualCommission.ts
│       ├── getPartnerStats.ts
│       ├── managePartnerWidgets.ts
│       ├── partnerApplicationsList.ts
│       ├── updatePartnerApplication.ts
│       └── convertApplicationToPartner.ts
├── triggers/
│   ├── index.ts
│   ├── onCallCompleted.ts                      — Handler pour consolidated trigger
│   └── onPartnerCreated.ts
├── services/
│   ├── partnerCommissionService.ts
│   └── partnerConfigService.ts                 — Cache config 5min TTL
├── scheduled/
│   ├── releasePartnerPendingCommissions.ts
│   └── updatePartnerMonthlyStats.ts
└── utils/
    └── partnerValidation.ts
```

### À CRÉER — Frontend

```
sos/src/pages/Partner/
├── PartnerDashboard.tsx
├── PartnerEarnings.tsx
├── PartnerClicks.tsx
├── PartnerWidgets.tsx
├── PartnerProfile.tsx
├── PartnerPayments.tsx
└── PartnerSuspended.tsx

sos/src/pages/Partners/
├── PartnersPage.tsx                            — Page publique "Nos Partenaires"
└── PartnerLanding.tsx                          — Landing "Devenir Partenaire"

sos/src/components/Partner/
├── Layout/
│   └── PartnerDashboardLayout.tsx
├── Cards/
│   ├── PartnerBalanceCard.tsx
│   ├── PartnerStatsCard.tsx
│   ├── PartnerEarningsChart.tsx
│   ├── PartnerClicksChart.tsx
│   └── PartnerRecentCommissions.tsx
└── index.ts

sos/src/hooks/
└── usePartner.ts

sos/src/pages/admin/Partners/
├── AdminPartnersList.tsx
├── AdminPartnerDetail.tsx
├── AdminPartnerCreate.tsx
├── AdminPartnersPayments.tsx
├── AdminPartnersConfig.tsx
├── AdminPartnersWidgets.tsx
├── AdminPartnersStats.tsx
└── AdminPartnerApplications.tsx
```

### Fichiers existants à MODIFIER

```
sos/firebase/functions/src/index.ts
sos/firebase/functions/src/functionConfigs.ts
sos/firebase/functions/src/triggers/consolidatedOnCallCompleted.ts
sos/firebase/functions/src/payment/types/index.ts
sos/firebase/functions/src/auth/syncRoleClaims.ts
sos/firebase/functions/src/emailMarketing/welcomeTemplates.ts
sos/firebase/functions/src/affiliate/triggers/onUserCreated.ts
sos/firebase/functions/src/affiliate/utils/codeGenerator.ts
sos/firebase/functions/src/payment/services/paymentService.ts
sos/firebase/functions/src/payment/triggers/onWithdrawalStatusChanged.ts
sos/firebase/functions/src/payment/callables/admin/rejectWithdrawal.ts
sos/firebase/functions/src/payment/callables/requestWithdrawal.ts
sos/firebase/functions/src/payment/callables/savePaymentMethod.ts
sos/firebase/functions/src/payment/callables/getPaymentMethods.ts
sos/firebase/functions/src/payment/callables/getWithdrawalHistory.ts
sos/src/contexts/types.ts
sos/src/App.tsx
sos/src/pages/Login.tsx
sos/src/multilingual-system/core/routing/localeRoutes.ts
sos/src/utils/referralStorage.ts
sos/src/components/admin/AdminRoutesV2.tsx
sos/src/config/adminMenu.ts
sos/src/components/layout/Footer.tsx
sos/src/helper/fr.json (+ en.json, es.json, de.json, ru.json, hi.json, pt.json, ch.json, ar.json)
```

---

## ORDRE D'IMPLÉMENTATION RECOMMANDÉ

1. **Backend types** → `partner/types.ts`
2. **Backend config** → `functionConfigs.ts` + `partnerConfigService.ts`
3. **Backend callable** → `createPartner.ts` (+ modification `syncRoleClaims.ts`)
4. **Backend trigger** → `onPartnerCreated.ts` (+ modification `welcomeTemplates.ts`)
5. **Backend trigger** → `onCallCompleted.ts` (+ modification `consolidatedOnCallCompleted.ts`)
6. **Backend callables** → Dashboard, commissions, clics, widgets, notifications
7. **Backend retrait** → `partnerRequestWithdrawal.ts` (+ modification **8 fichiers payment** : types, paymentService, onWithdrawalStatusChanged, rejectWithdrawal, requestWithdrawal, savePaymentMethod, getPaymentMethods, getWithdrawalHistory)
8. **Backend admin** → Toutes les callables admin (dont candidatures : partnerApplicationsList, updatePartnerApplication, convertApplicationToPartner)
9. **Backend crons** → Release commissions, stats mensuelles
10. **Backend export** → `partner/index.ts` + `index.ts` principal
11. **Frontend types** → Ajouter "partner" à UserRole + referralStorage
12. **Frontend hook** → `usePartner.ts`
13. **Frontend layout** → `PartnerDashboardLayout.tsx`
14. **Frontend pages** → Dashboard, Earnings, Clicks, Widgets, Profile, Payments
15. **Frontend admin** → Create, List, Detail, Payments, Config, Widgets, Stats
16. **Frontend public** → PartnersPage, PartnerLanding, Footer link conditionnel
17. **Frontend routing** → App.tsx, Login.tsx, localeRoutes.ts, AdminRoutesV2, adminMenu
18. **i18n** → Toutes les traductions (9 fichiers de langue)
19. **Tests & déploiement**

---

## CONTRAINTES TECHNIQUES

1. **TypeScript strict** — `.ts`/`.tsx`, pas de `any` sauf nécessité
2. **Build** — `npm run build` avec `--skipLibCheck`
3. **toast()** de `react-hot-toast` — JAMAIS `alert()`
4. **Lucide icons** — Pour toutes les icônes
5. **Tailwind** — Pour tout le styling
6. **FormattedMessage / useIntl** — Pour tous les textes (react-intl)
7. **Recharts** — Pour les graphiques
8. **CSV export** — Avec BOM (`\uFEFF`) pour Excel UTF-8
9. **Firestore transactions** — Pour opérations atomiques (balances, commissions)
10. **firebase-admin** — Pour créer utilisateurs Auth (createPartner)
11. **Regions** — Callables `us-central1`, triggers `europe-west3`
12. **Concurrency** — `concurrency: 1` pour fonctions avec `cpu < 1`
13. **maxInstances: 1** — Quota us-central1 à 80%
14. **Widget placeholder** — `{{AFFILIATE_LINK}}` (PAS `{{affiliateUrl}}`)
15. **Retraits** — Système centralisé `payment_withdrawals`, méthodes Wise + Flutterwave uniquement
16. **Langues** — 9 langues (fr, en, es, de, pt, ar, ch, ru, hi). Chinese = `ch` (fichier `ch.json`)
17. **date-fns** — Pour le formatage des dates
