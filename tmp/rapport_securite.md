# RAPPORT D'AUDIT SECURITE APPLICATIVE — SOS-EXPAT
**Date**: 2026-02-28
**Auditeur**: Claude Opus 4.6
**Scope**: Firestore Rules, Cloud Functions (auth, rate limiting, secrets), Storage Rules, Input Validation

---

## RESUME EXECUTIF

L'application SOS-Expat présente une **posture de sécurité solide**. Les règles Firestore sont bien structurées (~150 collections auditées), les données financières sont correctement protégées en écriture (Cloud Functions uniquement), et les fonctions critiques (paiements, inscriptions) disposent d'authentification et de rate limiting.

**1 vulnérabilité P0** a été identifiée et **corrigée** (rate limit sur `sendCustomPasswordResetEmail`). Le reste est du P2/P3 — améliorations mineures, aucune urgence.

### Statistiques
| Catégorie | Total | Sécurisé | Problèmes |
|-----------|-------|----------|-----------|
| Collections Firestore | ~150 | ~148 | 2 (mineurs, P3) |
| Fonctions onCall | ~468 | ~468 | 0 (les fonctions sans auth sont intentionnellement publiques) |
| Fonctions onRequest | ~55 | ~53 | 2 (P2, mineurs) |
| setCustomUserClaims | 12 | 12 | 0 |
| Rate limiting critique | 15 | 15 | 0 (P0 corrigé) |

---

## PHASE 1 — FIRESTORE SECURITY RULES

### 1.1 Analyse des Helper Functions

| Fonction | Verdict |
|----------|---------|
| `isAuthenticated()` | OK — vérifie `request.auth != null` |
| `isAdmin()` | OK — double check (custom claims + Firestore doc) |
| `isDev()` | OK — **hardcodé `return false`** en production |
| `isOwner(userId)` | OK — vérifie `request.auth.uid == userId` |
| `isFinanceAdmin()` / `isSuperAdmin()` | OK — alias vers `isAdmin()` |
| `isAgencyManager()` | OK — vérifie Firestore doc |
| `hasAgencyAccessToProvider()` | OK — vérifie rôle + `linkedProviderIds` |

### 1.2 Collections par catégorie

#### Collections UTILISATEURS — Bien protégées
| Collection | Lecture | Écriture | Champs protégés | Verdict |
|------------|--------|----------|-----------------|---------|
| `users/{userId}` | Authentifié | Owner (champs limités) ou Admin | role, isApproved, isBanned, balances, affiliateCode, stripeCustomerId, linkedProviderIds, shareBusyStatus | **OK** |
| `sos_profiles/{profileId}` | isVisible OU owner OU admin OU agency | Owner (champs limités) ou Admin | stripeAccountId, paypalMerchantId, totalEarnings, payoutMode, isAAA, isFeatured | **OK** |
| `chatters/{id}` | Owner ou Admin | Owner (champs limités) | status, level, codes, balances, stats, badges, ranks | **OK** |
| `influencers/{id}` | Owner ou Admin | Owner (champs limités) | status, codes, balances, stats, ranks, adminNotes | **OK** |
| `bloggers/{id}` | Owner ou Admin | Owner (champs limités) | Idem influencers | **OK** |
| `group_admins/{id}` | Owner ou Admin | Owner (champs limités) | Idem + isGroupVerified, suspensionReason | **OK** |

#### Collections FINANCIERES — Excellente protection
| Collection | Lecture | Écriture client | Verdict |
|------------|--------|-----------------|---------|
| `payments/{id}` | Participants ou Admin | `allow create: if false` | **OK** |
| `refunds/{id}` | Participants ou Admin | `allow write: if false` | **OK** |
| `payouts/{id}` | Owner ou Admin | `allow write: if false` | **OK** |
| `transfers/{id}` | Owner ou Admin | `allow write: if false` | **OK** |
| `affiliate_commissions/{id}` | Owner ou Admin | `allow write: if false` | **OK** |
| `chatter_commissions/{id}` | Owner ou Admin | `allow write: if false` | **OK** |
| `payment_withdrawals/{id}` | Owner ou Admin | `allow write: if false` | **OK** |
| `journal_entries/{id}` | FinanceAdmin | `allow create: if false`, update DRAFT→POSTED only | **OK** |

**Verdict**: Aucun utilisateur ne peut modifier directement son solde, ses commissions, ou créer de faux paiements. Tout passe par Cloud Functions (Admin SDK).

#### Collections à LECTURE PUBLIQUE (intentionnel)
| Collection | Justification | Écriture | Verdict |
|------------|--------------|----------|---------|
| `helpCenter/{id}` | Articles d'aide publics | Admin only | OK |
| `help_categories/{id}` | Catégories d'aide | Admin only | OK |
| `help_articles/{id}` | SEO sitemaps | Admin only | OK |
| `landing_pages/{id}` | SEO sitemaps | Admin only | OK |
| `subscription_plans/{id}` | Affichage des prix | Admin only | OK |
| `legal_documents/{id}` | Pages légales (CGU) | Admin only | OK |
| `country_settings/{id}` | Pays activés (frontend) | Admin only | OK |
| `country_fiscal_configs/{id}` | Prix TTC publics | Admin only | OK |
| `country_landing_configs/{id}` | Landing pages | Admin only | OK |
| `faq_translations_cache/{id}` | FAQ traduites | Admin only | OK |
| `user_feedback/{id}` | Formulaire feedback | Validé (email, type, description) | OK |
| `chatter_early_adopter_counters/{id}` | Places restantes (landing) | CF only | OK |

#### Collections WRITE-ONLY pour analytics (create par authentifié, pas d'update/delete)
| Collection | Risque | Verdict |
|------------|--------|---------|
| `logs/{id}` | Spam de logs par utilisateur authentifié | **P3** — Faible impact, coût Firestore minimal |
| `error_logs/{id}` | Idem | **P3** |
| `performance_metrics/{id}` | Idem | **P3** |
| `analytics_events/{id}` | Idem | **P3** |
| `analytics_*` (5 collections) | Idem | **P3** |
| `call_logs/{id}` | Idem | **P3** |
| `review_reports/{id}` | Idem | **P3** |

**Note**: Ces collections permettent à tout utilisateur authentifié de créer des documents sans limite. Le risque est un "denial-of-wallet" (coût Firestore) mais l'impact est très faible car les documents sont petits et le rate est limité par la latence réseau. **Aucune action requise**.

### 1.3 Collections avec problèmes mineurs

**Aucune collection Firestore n'est dangereusement ouverte.** Les 2 points d'attention sont:

| ID | Collection | Problème | Sévérité | Impact UX |
|----|-----------|----------|----------|-----------|
| FR-01 | `ad_conversions/{id}` | Create ouvert à tout authentifié avec validation minimale. Un utilisateur malveillant pourrait polluer les données analytics. | **P3** | Aucun |
| FR-02 | `user_feedback/{id}` | Create ouvert **sans authentification** (voulu pour visitors). Un bot pourrait spammer. | **P3** | Aucun — validation email+type+description suffit |

---

## PHASE 2 — AUTHENTIFICATION ET AUTORISATION

### 2.1 Fonctions onCall sans authentification

Après analyse approfondie, les fonctions sans auth sont **toutes intentionnellement publiques** :

| Fichier | Fonction | Justification |
|---------|----------|---------------|
| `blogger/callables/public/bloggerDirectory.ts` | `getBloggerDirectory` | Répertoire public |
| `chatter/callables/public/chatterDirectory.ts` | `getChatterDirectory` | Répertoire public |
| `groupAdmin/callables/public/groupAdminDirectory.ts` | `getGroupAdminDirectory` | Répertoire public |
| `influencer/callables/public/influencerDirectory.ts` | `getInfluencerDirectory` | Répertoire public |
| `PayPalManager.ts` | `getRecommendedPaymentGateway` | Utilitaire (retourne gateway par pays) |
| `tax/calculateTax.ts` | `validateVAT` | Validation TVA publique |
| `tax/vatCallables.ts` | `validateVat`, `checkReverseCharge` | Validation TVA publique |
| `feedback/index.ts` | `submitFeedback` | Formulaire accessible à tous (rate limité par email) |
| `auth/passwordReset.ts` | `sendCustomPasswordResetEmail` | Password reset (utilisateur non connecté). **Rate limité par email — CORRIGE** |
| `translation/translateProvider.ts` | `translateProvider` | Traduction de profils pour visiteurs non connectés. Cache OpenAI + `maxInstances:10` limitent l'abus. |
| `translation/updateProviderTranslation.ts` | `updateProviderTranslation` | Met à jour les traductions existantes. Protégé par les rules Firestore sur `providers_translations` (owner ou admin uniquement). |

### 2.2 Fonctions onRequest — Points d'attention mineurs

| ID | Sévérité | Fichier | Fonction | Risque | Impact UX |
|----|----------|---------|----------|--------|-----------|
| AUTH-01 | **P2** | `monitoring/testCAPIConnection.ts:43` | `testCAPIConnection` | Aucune auth. Peut envoyer des événements test à Meta CAPI. Pollution données. | Aucun |
| AUTH-02 | **P2** | `chatter/messageTemplates.ts:724` | `initializeMessageTemplates` (v1) | Bypass auth si `ADMIN_INIT_SECRET` non définie. Fonction d'init one-shot, rarement appelée. | Aucun |

### 2.3 Escalade de privilèges — `setCustomUserClaims`

**12 utilisations analysées, TOUTES correctement protégées:**
- `auth/setAdminClaims.ts` — email whitelist Firestore + rate limit
- `triggers/syncRoleClaims.ts` — Firestore trigger (pas callable)
- `admin/backupRestoreAdmin.ts` — `isAdmin()` check
- `admin/restoreUserRoles.ts` — `request.auth` + admin role

**Verdict: Aucune vulnérabilité d'escalade de privilèges.**

### 2.4 Ownership checks — Contournement de propriété

| ID | Sévérité | Fichier | Détail |
|----|----------|---------|--------|
| OWN-01 | **P3** | `monitoring/connectionLogs.ts:398` | `logConnection`: `userId = data.userId || auth?.uid` — spoofing possible dans les logs. Impact: informatif uniquement. |
| OWN-02 | **P3** | `feedback/index.ts:201` | `submitFeedback`: `userId = data.userId || request.auth?.uid` — spoofing userId dans feedbacks. Impact: aucune conséquence financière. |

---

## PHASE 3 — RATE LIMITING

### 3.1 Système de rate limiting existant

**Infrastructure solide**: `lib/rateLimiter.ts` avec Firestore-backed rate limiting.

| Preset | Limite | Usage |
|--------|--------|-------|
| `ADMIN_CLAIMS` | 5 req / 5 min | setAdminClaims |
| `CREATE_CALL` | 3 req / min | createAndScheduleCall |
| `WITHDRAWAL` | 3 req / heure | Tous les retraits |
| `SENSITIVE_AUTH` | 10 req / 15 min | Auth sensible |
| `REGISTRATION` | 2 req / heure | Toutes les inscriptions |

### 3.2 Fonctions critiques AVEC rate limiting

| Fonction | Limite | Source |
|----------|--------|--------|
| `createAndScheduleCallHTTPS` | 3/min (centralisé) | `rateLimiter.ts` |
| `registerChatter/Blogger/Influencer/GroupAdmin` | 2/h (centralisé) | `rateLimiter.ts` |
| `requestWithdrawal` (chatter, influencer, payment, affiliate) | 3/h (centralisé) | `rateLimiter.ts` |
| `createPaymentIntent` | Maison (Firestore) | Propre implémentation |
| `sendPayPalVerificationCode` | MAX_CODES_PER_HOUR (Firestore) | Propre implémentation |
| `createSubscription` | In-memory | Propre implémentation |
| `createCheckoutSession` | Firestore | Propre implémentation |
| `submitFeedback` | 5/h par email | Propre implémentation |
| `sendCustomPasswordResetEmail` | **3/h par email** | **CORRIGE 2026-02-28** — Firestore rate limit inline |

### 3.3 Points d'attention mineurs (sans rate limit centralisé)

| ID | Sévérité | Fichier | Fonction | Analyse |
|----|----------|---------|----------|---------|
| RL-01 | **P3** | `blogger/callables/requestWithdrawal.ts:134` | `bloggerRequestWithdrawal` | Auth présente. La logique métier vérifie le solde — impossible de créer des retraits fantômes. Le pire cas est du bruit (demandes rejetées). |
| RL-02 | **P3** | `groupAdmin/callables/requestWithdrawal.ts:99` | `requestGroupAdminWithdrawal` | Idem. Auth + vérification solde suffisent. |
| RL-03 | **P2** | `monitoring/testCAPIConnection.ts:43` | `testCAPIConnection` | Pas d'auth + pas de rate limit. Pollution Meta CAPI possible mais impact faible. |

---

## PHASE 4 — SECRETS ET DONNÉES SENSIBLES

### 4.1 Secrets dans les logs

| ID | Sévérité | Fichier | Problème |
|----|----------|---------|----------|
| SEC-01 | **P2** | `PayPalManager.ts:2776` | `console.log('[PAYPAL DEBUG] Request body:', JSON.stringify(req.body))` — body PayPal complet loggé (PII). Cloud Logging est restreint aux admins GCP, pas d'exposition externe. À nettoyer proprement. |
| SEC-02 | **P2** | `emailMarketing/functions/webhooks.ts:113,212,299` | Emails complets loggés en clair (`Email opened: ${email}`). |
| SEC-03 | **P3** | `utils/ultraDebugLogger.ts:227` | Logger générique qui logge `data` sans masquage. Dépend de ce qui est passé. |
| SEC-04 | **P3** | `lib/secrets.ts` (multiples lignes) | Noms des secrets loggés (pas les valeurs). Information disclosure mineure. |
| SEC-05 | **P3** | `lib/tasks.ts:250` | Longueur du secret auth loggée. |

### 4.2 Secrets hardcodés

**Aucun secret réel hardcodé trouvé.** Points vérifiés:
- Pas de `sk_live_*`, `whsec_*`, `AC[hex]{32}` dans le code
- `index.minimal.ts` contient des stubs `"sk_live_XXX"` (valeur placeholder, pas une vraie clé)
- Tests utilisent des clés fictives (`sk_test_123456789abcdef`)
- Emails admin en fallback dans `setAdminClaims.ts` (semi-public, risque accepté)

### 4.3 Variables d'environnement frontend

**Aucune clé secrète dans les variables `VITE_*`.** Toutes les clés frontend sont publiques par design:
- `VITE_FIREBASE_API_KEY` — publique par design Firebase
- `VITE_STRIPE_PUBLIC_KEY` — `pk_*` (publishable key)
- `VITE_PAYPAL_CLIENT_ID` — ID client public
- Fichiers `.env` non trackés par git (`.gitignore` correct)

### 4.4 Réponses API sensibles

| ID | Sévérité | Détail |
|----|----------|--------|
| SEC-06 | **INFO** | `getAccountSession.ts:194` retourne `clientSecret` Stripe — **comportement attendu** par l'API Stripe |
| SEC-07 | **P3** | `validateDashboardPassword.ts:192` retourne token en JSON body — HttpOnly cookie serait plus sécurisé, mais dashboard protégé par mot de passe + rate limit |

---

## PHASE 5 — VALIDATION DES ENTRÉES

### 5.1 Fonctions critiques — Validation correcte

| Fonction | Validations | Verdict |
|----------|-------------|---------|
| `registerChatter` | Auth, rate limit, firstName/lastName (2-50), email regex, phone (8-15), country (2 chars), language whitelist, bio max 1000, platforms whitelist, fraud detection | **Excellent** |
| `registerInfluencer` | Même niveau que registerChatter | **Excellent** |
| `registerBlogger` | Auth, rate limit, validation complète | **Bon** |
| `registerGroupAdmin` | Auth, rate limit, validation complète + groupUrl | **Bon** |
| `requestWithdrawal` (payment) | Auth, rate limit, amount (number, positive, not NaN), paymentMethodId, status check, telegram check | **Excellent** |
| `createPaymentIntent` | Auth, rate limit, montant, doublons, validation métier | **Excellent** |
| `createBooking` | Auth, providerId, serviceType, status="pending", ownership | **Bon** |

### 5.2 Point d'attention

| ID | Sévérité | Détail |
|----|----------|--------|
| VAL-01 | **P3** | Pas de schéma Zod/Joi formel — validations manuelles `if (!field)`. Fonctionnel mais plus fragile qu'un schéma déclaratif. Recommandation optionnelle: adopter Zod progressivement pour les callables critiques. |

---

## PHASE 6 — STORAGE RULES

### 6.1 Règles correctes

| Path | Lecture | Écriture | Verdict |
|------|--------|----------|---------|
| `profilePhotos/{userId}/{fileName}` | Authentifié | Owner + image + <15MB | **OK** |
| `profile_photos/{userId}/{fileName}` | Authentifié | Owner + image + <15MB | **OK** |
| `documents/{userId}/{fileName}` | Owner ou Admin | Owner + document type + <15MB | **OK** |
| `invoices/{type}/{year}/{month}/{fileName}` | Authentifié + validation type/date | Authentifié + PDF + <5MB | **OK** |
| `influencer/blogger/chatter/group_admin_photos/{userId}` | Public | Owner + image + <15MB | **OK** (répertoires publics) |
| `backups/{fileName}` | Admin | Admin | **OK** |
| Catch-all `/{allPaths=**}` | `if false` | `if false` | **OK** |

### 6.2 Points d'attention Storage

| ID | Sévérité | Path | Problème | Analyse |
|----|----------|------|----------|---------|
| STOR-01 | **P2** | `profile_photos/{fileName}` (sans userId) | Write ouvert à tout authentifié. | **Intentionnel** — commentaire: "Admin can upload profile photos directly (for AAA profiles management)". Path utilisé pour la gestion admin des profils AAA. |
| STOR-02 | **INFO** | `registration_temp/{fileName}` | Upload anonyme (images, 5MB max). Nettoyage 24h par Cloud Function. | **Intentionnel** — nécessaire pour registration avant auth. |
| STOR-03 | **INFO** | `temp_profiles/{fileName}` | Idem registration_temp. | **Intentionnel** |
| STOR-04 | **P2** | `disputes/{disputeId}/evidence/{fileName}` | Write ouvert à tout authentifié (read vérifie ownership, mais pas write). | Risque faible — un utilisateur malveillant pourrait ajouter des fichiers dans un dispute qui n'est pas le sien, mais les fichiers sont des images limitées à 15MB et seuls les admins gèrent les disputes. |
| STOR-05 | **INFO** | `feedback_screenshots/{fileName}` | Upload anonyme (images, 5MB). Read admin-only. | **Intentionnel** — formulaire feedback public |

---

## PHASE 7 — URLS HTTP ET HEADERS

### 7.1 URLs HTTP non sécurisées

| ID | Sévérité | Fichier | URL | Risque |
|----|----------|---------|-----|--------|
| HTTP-01 | **P3** | `twilioWebhooks.ts:1860,2085` | `http://twimlets.com/holdmusic?Bucket=...` | Domaine Twilio, MITM théorique sur audio d'attente. Vérifier si `https://` disponible. |
| HTTP-02 | **P3** | `monitoring/connectionLogs.ts:33` | `http://ip-api.com/json` | IPs envoyées en HTTP clair. Service gratuit ip-api.com ne supporte pas HTTPS (version pro payante requise). |

### 7.2 Headers de sécurité

Le projet utilise **Cloudflare Pages** (pas Firebase Hosting), donc les headers de sécurité sont gérés au niveau Cloudflare:
- **HSTS**: Activé par défaut sur Cloudflare
- **X-Frame-Options**: À vérifier dans la config Cloudflare
- **CSP**: À vérifier dans `_headers` ou `_redirects` de Cloudflare Pages

**Recommandation optionnelle**: Ajouter un fichier `sos/public/_headers` pour Cloudflare Pages avec les headers manquants.

---

## CORRECTIFS APPLIQUES

### P0 — CORRIGE le 2026-02-28

| ID | Problème | Correction appliquée | Fichier modifié |
|----|----------|---------------------|-----------------|
| **RL-PWD** | `sendCustomPasswordResetEmail`: pas de rate limit. Spam SMTP illimité → risque blacklisting du domaine Zoho. | Rate limit par email (3 req/heure) via collection `rate_limits`. Quand la limite est atteinte, retourne `{ success: true }` silencieusement (ne révèle pas le rate limiting à un attaquant). | `auth/passwordReset.ts` |

---

## TABLEAU RECAPITULATIF — PAR PRIORITE

### P2 — MOYENNE (améliorations optionnelles, aucune urgence)

| ID | Problème | Correction suggérée | Impact UX |
|----|----------|---------------------|-----------|
| AUTH-01 | `testCAPIConnection`: pas d'auth. | Ajouter vérification admin ou supprimer si outil de debug. | Aucun |
| AUTH-02 | `initializeMessageTemplates`: bypass auth si secret non défini. | Changer `if (adminSecret && ...)` en `if (!adminSecret \|\| ...)`. Fonction d'init one-shot. | Aucun |
| STOR-04 | `disputes/.../evidence`: write sans vérification d'appartenance. | Ajouter check ownership dans storage rules. | Aucun |
| SEC-01 | PayPal body complet loggé (PII dans Cloud Logging). | Masquer le body: ne loguer que `orderId` et `status`. | Aucun |
| SEC-02 | Emails complets dans logs webhooks email marketing. | Masquer: `${email.substring(0, 3)}***@${domain}`. | Aucun |

### P3 — FAIBLE (amélioration continue, non prioritaire)

| ID | Problème | Correction suggérée | Impact UX |
|----|----------|---------------------|-----------|
| OWN-01 | `logConnection`: userId spoofable dans les logs. | Forcer `userId = request.auth?.uid`. | Aucun |
| OWN-02 | `submitFeedback`: userId spoofable dans feedbacks. | Forcer `userId = request.auth?.uid`. | Aucun |
| SEC-03 | UltraDebugLogger sans filtrage. | Réduire verbosité en production. | Aucun |
| SEC-04 | Noms de secrets dans les logs. | Réduire verbosité en production. | Aucun |
| HTTP-01 | Twilio hold music via HTTP. | Changer en `https://` si disponible. | Aucun |
| HTTP-02 | IP geolocation via HTTP. | Considérer un service HTTPS. | Aucun |
| VAL-01 | Pas de schéma Zod formel. | Adopter Zod progressivement. | Aucun |

---

## POINTS FORTS DE L'APPLICATION

1. **Architecture financière blindée**: Toutes les collections financières (payments, commissions, withdrawals, transfers, balances) sont en `allow write: if false` côté client → Cloud Functions uniquement.

2. **Protection anti-escalade de privilèges**: Les champs `role`, `isApproved`, `isBanned`, `affiliateCode`, `totalEarned`, `availableBalance` sont explicitement exclus des modifications utilisateur dans les règles Firestore.

3. **Rate limiting centralisé**: Infrastructure Firestore-backed avec presets bien calibrés (3 appels/min, 2 inscriptions/h, 3 retraits/h).

4. **Gestion des secrets**: `lib/secrets.ts` utilise `defineSecret()` de Firebase — aucun secret hardcodé, pas de secrets dans les variables frontend.

5. **Idempotence**: `call_execution_locks`, `processed_stripe_events`, `processed_webhook_events` — les doubles appels sont gérés.

6. **Fraud detection**: Système complet avec `threat_scores`, `fraud_patterns`, `blocked_entities`, `chatter_fraud_alerts`, `chatter_ip_registry`.

7. **Catch-all deny**: Storage rules se terminent par `allow read, write: if false` pour tout path non explicitement autorisé.

8. **Double vérification admin**: Custom claims Firebase Auth + fallback document Firestore.

9. **Audit trail immutable**: `journal_entries`, `audit_logs`, `admin_audit_logs`, `connection_logs` tous en `allow delete: if false`.

10. **CORS configuré**: Whitelist `ALLOWED_ORIGINS` sur les fonctions onCall.

---

## MESURES NON RECOMMANDÉES (friction UX)

Les mesures suivantes sont souvent recommandées mais **ne sont pas proposées** car elles ajouteraient de la friction utilisateur:

| Mesure | Pourquoi non recommandée | Alternative transparente déjà en place |
|--------|-------------------------|---------------------------------------|
| CAPTCHA sur login | Friction majeure sur chaque connexion | Rate limiting par IP/email déjà en place |
| 2FA obligatoire | Barrière à l'inscription, drop-off élevé | Custom claims + rôles côté serveur |
| Re-confirmation mot de passe pour actions sensibles | Friction sur les retraits/modifications | Rate limiting + ownership checks |
| Email de vérification bloquant | Empêche l'utilisation immédiate | Vérification post-inscription non bloquante |
| CAPTCHA sur formulaire contact | Bloque les vrais utilisateurs | Rate limit IP + validation champs (déjà en place) |

---

*Rapport généré le 2026-02-28 par Claude Opus 4.6*
*Correctif P0 appliqué : rate limit sur `sendCustomPasswordResetEmail` (`auth/passwordReset.ts`)*
