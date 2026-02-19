# Audit de Conformite GDPR - SOS Expat

**Date de l'audit** : 19 fevrier 2026
**Version** : 1.0
**Perimetre** : Application SOS Expat (Firebase Functions backend + Frontend React/Vite)
**Auditeur** : Audit automatise du code source

---

## Synthese Executive

L'application SOS Expat dispose de fondations GDPR solides avec un systeme d'audit trail, des fonctions de suppression/export de donnees, un cookie banner granulaire, et du chiffrement des donnees sensibles. Cependant, plusieurs manquements critiques ont ete identifies, notamment le **tracking Meta Pixel sans consentement**, l'**absence d'interface utilisateur pour exercer les droits GDPR**, et l'**absence de DPO designe**.

### Score Global : 58/100 - Partiellement Conforme

| Categorie | Statut | Score |
|-----------|--------|-------|
| Collecte de donnees | Partiellement conforme | 6/10 |
| Consentement | Partiellement conforme | 5/10 |
| Droit a l'effacement (Art. 17) | Conforme | 8/10 |
| Droit a la portabilite (Art. 20) | Partiellement conforme | 5/10 |
| Retention des donnees | Partiellement conforme | 6/10 |
| Politique de confidentialite | Partiellement conforme | 6/10 |
| Tracking et analytics | Non conforme | 3/10 |
| Partage de donnees tiers | Partiellement conforme | 5/10 |
| Securite technique | Conforme | 8/10 |
| Gouvernance et documentation | Non conforme | 3/10 |

---

## 1. Collecte de Donnees Personnelles (PII)

### Statut : PARTIELLEMENT CONFORME

### Ce qui existe

L'application collecte les categories de donnees suivantes dans Firestore :

**Collection `users` - Donnees d'identite :**
- `email`, `emailLower` - Adresse email
- `firstName`, `lastName`, `displayName`, `fullName` - Noms
- `phone`, `phoneNumber`, `phoneCountryCode` - Telephone
- `profilePhoto`, `photoURL` - Photo de profil
- `country`, `residenceCountry`, `currentPresenceCountry` - Localisation
- `languages`, `languagesSpoken` - Langues parlees
- `barNumber`, `lawSchool`, `graduationYear` - Donnees professionnelles (avocats)
- `registrationIP`, `userAgent` - Donnees techniques de connexion
- `fbp`, `fbc`, `metaEventId` - Identifiants Meta/Facebook
- `stripeAccountId`, `stripeCustomerId` - Identifiants Stripe
- `paypalEmail`, `paypalMerchantId` - Identifiants PayPal
- `telegramId`, `telegramUsername` - Identifiants Telegram

**Fichier** : `sos/src/contexts/types.ts` (lignes 24-209)

**Collection `chatters` - Profils affilies :**
- `email`, `firstName`, `lastName`, `phone` - Identite
- `country`, `interventionCountries` - Localisation
- `bio`, `photoUrl` - Profil
- `paymentDetails` - Coordonnees bancaires
- `platforms` - Reseaux sociaux utilises

**Fichier** : `sos/firebase/functions/src/chatter/types.ts` (lignes 185-400)

**Collection `call_sessions` - Sessions d'appel :**
- `clientId`, `providerId` - Identifiants des parties
- Numeros de telephone (chiffres via `encryptPhoneNumber`)
- Metadonnees d'appel (duree, statut, enregistrement)

**Collection `payments` / `invoices` :**
- `clientId`, `providerId` - Identifiants
- `clientName`, `clientEmail`, `providerName`, `providerEmail` - PII en clair
- Montants, methodes de paiement

**Fichier** : `sos/firebase/functions/src/utils/types.ts` (lignes 36-56)

**Collections additionnelles contenant du PII :**
- `sos_profiles` - Profils publics des prestataires
- `kyc_documents` - Documents d'identite (KYC Stripe)
- `chatter_ip_registry` - Adresses IP des affilies
- `notifications` - Messages contenant potentiellement du PII
- `reviews` - Avis contenant noms
- `contact_messages` - Messages de contact avec email/nom/telephone

### Ce qui manque

- **Registre de traitement (ROPA)** : Aucun document formalisant les traitements de donnees, bases legales, finalites, et durees de conservation n'a ete identifie dans le code
- **Minimisation des donnees** : Les `invoices` stockent `clientEmail` et `providerEmail` en clair alors que seuls les IDs seraient suffisants pour le service ; les factures PDF pourraient utiliser des references anonymisees
- **Categorisation des donnees** : Pas de distinction formelle entre donnees necessaires au service, donnees de marketing, et donnees sensibles (au sens GDPR)
- **Donnees `registrationIP` et `userAgent`** stockees directement dans la collection `users` sans justification documentee de base legale

### Priorite : HAUTE

---

## 2. Consentement

### Statut : PARTIELLEMENT CONFORME

### Ce qui existe

**Cookie Banner (CookieBanner.tsx) :**
Le composant de cookie banner est bien implemente avec :
- Consentement granulaire par categorie : `essential`, `analytics`, `performance`, `marketing`
- Boutons "Tout accepter", "Tout refuser", "Personnaliser"
- Stockage dans `localStorage` avec timestamp et version
- Traductions en 9 langues
- Possibilite de rouvrir le banner depuis le footer
- Integration avec GA4 Consent Mode v2 (`updateGA4Consent`)
- Integration avec GTM (`updateConsentFromPreferences`)
- Integration avec Google Ads (`updateGoogleAdsConsent`)
- Integration avec Meta Pixel (`updateMetaPixelNativeConsent`)

**Fichier** : `sos/src/components/common/CookieBanner.tsx`

**Acceptation CGU (Tracking eIDAS/RGPD) :**
Le systeme enregistre la preuve d'acceptation des CGU :
- `termsAccepted`, `termsAcceptedAt`, `termsVersion`
- `paymentTermsAccepted`, `paymentTermsAcceptedAt`
- `termsAcceptanceMeta` : userAgent, language, timestamp, acceptanceMethod, ipAddress

**Fichier** : `sos/src/contexts/types.ts` (lignes 186-200)

**Preferences de consentement serveur :**
- `updateConsentPreferences` callable (backend) enregistre marketing/analytics/thirdParty
- Log dans l'audit trail GDPR a chaque changement de consentement

**Fichier** : `sos/firebase/functions/src/gdpr/auditTrail.ts` (lignes 520-573)

### Ce qui manque

- **Le consentement n'est PAS verifie cote serveur avant d'envoyer des donnees a Meta CAPI** : Les fonctions `trackCAPILead`, `trackCAPIPurchase` ne verifient pas le consentement marketing de l'utilisateur avant d'envoyer ses donnees (email, telephone, IP) a Facebook
- **Pas de lien `updateConsentPreferences` dans l'interface utilisateur** : La callable existe mais aucune page "Gestion de mes preferences" n'est visible dans le frontend pour que l'utilisateur puisse modifier ses consentements (en dehors du cookie banner)
- **Le cookie banner utilise `localStorage`** (cote client uniquement) : Les preferences de consentement ne sont PAS synchronisees avec Firestore pour verification serveur
- **Pas de consentement explicite au marketing par email** : Aucun opt-in separe pour l'envoi d'emails marketing (collection `mail_queue`)

### Priorite : HAUTE

---

## 3. Meta Pixel - Tracking Sans Consentement

### Statut : NON CONFORME

### Ce qui existe (problematique)

Le fichier `metaPixel.ts` contient des commentaires explicites indiquant un tracking deliberement effectue **sans verification du consentement** :

```
// TRACKING SANS CONSENTEMENT - Pour maximiser les donnees de conversion
```

**Preuves dans le code :**

```typescript
// Ligne 164-168 de metaPixel.ts
/**
 * Fonction legacy - TOUJOURS retourne true (tracking sans consentement)
 */

// Ligne 629-630
/**
 * TRACKING SANS CONSENTEMENT - Les donnees sont toujours collectees
 */

// Ligne 784
/**
 * TRACKING SANS CONSENTEMENT - Les donnees sont stockees localement pour CAPI
 */
```

**Fichier** : `sos/src/utils/metaPixel.ts`

La fonction `updateMetaPixelNativeConsent` est bien appelee depuis le CookieBanner, mais elle n'empeche PAS la collecte de donnees :
- `window.__metaMarketingGranted` est mis a jour mais la collecte continue
- Les evenements continuent d'etre envoyes meme si `consent = 'revoke'`
- Les donnees utilisateur (email, telephone, nom, prenom, pays, IP, user agent) sont envoyees a Meta CAPI sans verification

### Donnees envoyees a Meta sans consentement

Via la Meta Conversions API (`metaConversionsApi.ts`) :
- `em` - Email (hashe SHA256)
- `ph` - Telephone (hashe SHA256)
- `fn` - Prenom (hashe SHA256)
- `ln` - Nom (hashe SHA256)
- `ct` - Ville (hashe SHA256)
- `country` - Pays (hashe SHA256)
- `external_id` - ID utilisateur Firebase (hashe SHA256)
- `client_ip_address` - Adresse IP (en clair)
- `client_user_agent` - User Agent (en clair)
- `fbc` - Facebook Click ID (en clair)
- `fbp` - Facebook Browser ID (en clair)

**Fichier** : `sos/firebase/functions/src/metaConversionsApi.ts`

### Impact

Violation directe de l'**Article 6 GDPR** (base legale du traitement) et de l'**Article 7** (conditions du consentement). En l'absence de consentement marketing, le tracking Meta Pixel et l'envoi de donnees personnelles via CAPI sont illegaux dans l'UE.

**Comparaison Google Ads** : Le fichier `googleAds.ts` porte la mention correcte :
```
// TRACKING AVEC CONSENTEMENT - Respecte le GDPR via Consent Mode v2
```

### Ce qui manque

- Verification du consentement marketing AVANT tout envoi de donnees a Meta (frontend et backend)
- Blocage du chargement du script Meta Pixel tant que le consentement marketing n'est pas donne
- Verification serveur du consentement avant appel CAPI dans `createContactMessage.ts`, `createPaymentIntent.ts`, `PayPalManager.ts`

### Priorite : CRITIQUE

---

## 4. Droit a l'Effacement (Article 17)

### Statut : CONFORME

### Ce qui existe

**Systeme de suppression GDPR complet :**

1. **Demande utilisateur** (`requestAccountDeletion`) :
   - Verification d'obligations legales (factures payees)
   - Creation d'une demande dans `gdpr_requests`
   - Log dans l'audit trail
   - Message traduit en 9 langues

2. **Anonymisation des donnees** (`anonymizeUserData`) :
   - Anonymise `users` : email -> `deleted_xxx@anonymized.local`, suppression nom/telephone/adresse
   - Anonymise `chatters` : email, firstName, lastName, phone, bio, photoUrl, paymentDetails
   - Supprime les notifications (non necessaires legalement)
   - Supprime les registres IP (`chatter_ip_registry`)
   - Anonymise la subscription (supprime `stripeCustomerId`)
   - **Supprime le customer Stripe** via l'API (`stripe.customers.del`) - PII supprime chez le tiers
   - **Supprime le compte Firebase Auth** (`admin.auth().deleteUser`)
   - Conserve les commissions/retraits (obligation comptable)

**Fichier** : `sos/firebase/functions/src/gdpr/auditTrail.ts` (lignes 911-1003)

3. **Hard Delete admin** (`hardDeleteProvider`) :
   - Purge GDPR Article 17 pour les prestataires
   - Confirmation explicite (`confirmGdprPurge: true` requis)
   - Suppression de 11 sous-collections (availability_slots, calendar_events, documents, earnings, kyc_documents, etc.)
   - Anonymisation des references dans call_sessions, payments, reviews, disputes, messages

**Fichier** : `sos/firebase/functions/src/admin/providerActions.ts`

4. **Interface admin** (`AdminGdprPurgeModal`) :
   - Modal dedie avec confirmation, checkbox irreversibilite
   - Resume des collections supprimees/anonymisees
   - Traduit en 9 langues

**Fichier** : `sos/src/components/admin/AdminGdprPurgeModal.tsx`

5. **Suppression auto utilisateur** (`deleteUserAccount` dans AuthContext) :
   - L'utilisateur peut supprimer son compte depuis l'interface
   - Supprime `users`, `sos_profiles`, photo de profil, compte Firebase Auth
   - Log d'evenement `account_deleted`

**Fichier** : `sos/src/contexts/AuthContext.tsx` (lignes 2494-2542)

6. **Trigger cascade** (`onUserDeleted`) :
   - Trigger automatique quand un document `users` est supprime
   - Cascade vers `sos_profiles`, `kyc_documents`, `notifications`
   - Log dans `admin_audit_logs`

**Fichier** : `sos/firebase/functions/src/triggers/userCleanupTrigger.ts`

### Ce qui manque

- La suppression utilisateur (`deleteUserAccount` frontend) ne passe PAS par le systeme GDPR (`requestAccountDeletion`) : elle supprime directement les docs Firestore sans creer de demande GDPR, sans anonymiser les references croisees (call_sessions, payments, reviews), et sans supprimer le customer Stripe
- Le delai de 30 jours mentionne dans les traductions n'est pas applique automatiquement (traitement manuel par admin)
- Pas de notification email automatique a l'utilisateur confirmant la suppression effective

### Priorite : MOYENNE

---

## 5. Droit a la Portabilite des Donnees (Article 20)

### Statut : PARTIELLEMENT CONFORME

### Ce qui existe

**Systeme d'export backend complet :**

1. **Demande utilisateur** (`requestDataExport`) :
   - Cree une demande dans `gdpr_requests`
   - Verifie les doublons (une seule demande active a la fois)
   - Message traduit en 9 langues

2. **Collecte des donnees** (`collectUserData`) :
   - Exporte : profile, callSessions, payments, invoices, reviews, messages
   - Exporte chatter : profile, commissions, withdrawals, notifications, quiz_attempts, call_counts, social_likes
   - Sanitization : supprime stripeCustomerId, stripeAccountId, fcmTokens, internalNotes
   - Conversion des Timestamps en ISO strings
   - Format JSON structure

3. **Stockage et livraison** :
   - Fichier JSON sauvegarde dans Firebase Storage (`gdpr_exports/{userId}/{requestId}.json`)
   - URL signee valide 7 jours
   - Log dans l'audit trail

**Fichier** : `sos/firebase/functions/src/gdpr/auditTrail.ts` (lignes 704-734, 833-906)

### Ce qui manque

- **Aucune interface utilisateur** pour demander l'export : La callable `requestDataExport` existe mais n'est appelee nulle part dans le frontend (pas de bouton "Exporter mes donnees" dans les parametres utilisateur)
- **Aucune interface utilisateur** pour consulter l'historique d'acces (`getMyDataAccessHistory` existe en backend mais pas dans le frontend)
- **Format CSV non disponible** : seul le JSON est supporte ; la portabilite implique idealement un format lisible par machine ET par l'utilisateur
- **Donnees sos_profiles non incluses** dans l'export (manque pour les prestataires)
- **Donnees influencer, blogger, groupAdmin non incluses** (seul chatter est couvert)

### Priorite : HAUTE

---

## 6. Retention des Donnees

### Statut : PARTIELLEMENT CONFORME

### Ce qui existe

**Nettoyages automatises :**

1. **Paiements** (`paymentDataCleanup` - toutes les 6h) :
   - Payment locks : TTL 1 heure
   - PayPal orders expirees : marquees apres 24h
   - **Archivage 90 jours** : les paiements anciens sont anonymises (clientId/providerId partiellement masques) et deplaces vers `payments_archive`

**Fichier** : `sos/firebase/functions/src/scheduled/paymentDataCleanup.ts`

2. **Fichiers temporaires** (`cleanupTempStorageFiles` - quotidien) :
   - Fichiers dans `registration_temp/` et `temp_profiles/` : TTL 7 jours
   - Verification de non-reference dans Firestore avant suppression

**Fichier** : `sos/firebase/functions/src/scheduled/cleanupTempStorageFiles.ts`

3. **Sessions orphelines** (`cleanupOrphanedSessions` - toutes les heures) :
   - Sessions pending : timeout 60 min
   - Sessions connecting : timeout 45 min
   - Prestataires busy sans session : timeout 2h

**Fichier** : `sos/firebase/functions/src/scheduled/cleanupOrphanedSessions.ts`

4. **Audit trail GDPR** :
   - Retention configuree a 3 ans (`RETENTION_MS: 3 * 365 * 24 * 60 * 60 * 1000`)

**Fichier** : `sos/firebase/functions/src/gdpr/auditTrail.ts` (ligne 110)

### Ce qui manque

- **Pas de politique de retention formalisee** : aucun document definissant les durees de conservation par type de donnees
- **Pas de suppression automatique des donnees utilisateur inactives** : les comptes inactifs restent indefiniment (la verification d'inactivite dans `checkProviderInactivity` met les providers offline mais ne supprime rien)
- **Les call_sessions ne sont jamais nettoyees** : sessions d'appel anciennes conservees indefiniment avec PII
- **Les `admin_audit_logs` n'ont pas de TTL**
- **Les `notifications` n'ont pas de TTL**
- **Les `contact_messages` n'ont pas de TTL**
- **Les `reviews` n'ont pas de TTL ni d'anonymisation**
- **La constant `RETENTION_MS` de 3 ans est definie** mais aucune scheduled function ne l'utilise pour supprimer les anciens logs

### Priorite : HAUTE

---

## 7. Politique de Confidentialite

### Statut : PARTIELLEMENT CONFORME

### Ce qui existe

**Page Privacy Policy :**
- Disponible en 9 langues (fr, en, es, de, ru, hi, pt, ch, ar)
- Route : `/privacy-policy` (avec alias localisees)
- Sections : Collecte, Protection, Partage, Droits, Contact
- Mentionne les droits GDPR : acces, rectification, effacement, portabilite, opposition
- Contenu editable depuis la console admin (charge depuis Firestore)
- Version 2.2 datee du 16 juin 2025

**Fichier** : `sos/src/pages/PrivacyPolicy.tsx`

**Page Cookies :**
- Route : `/cookies` (avec alias localisees)
- Accessible depuis le cookie banner ("En savoir plus")

**Fichier** : `sos/src/pages/Cookies.tsx`

**Pages CGU separees par role :**
- `/terms-clients` (CGU clients)
- `/terms-lawyers` (CGU avocats)
- `/terms-expats` (CGU expatries)
- `/terms-chatters` (CGU chatters)

### Ce qui manque

- **Pas d'adresse email DPO** : La section "Contact" renvoie vers un "formulaire de contact" generique ; pas d'adresse email dediee (privacy@, dpo@, rgpd@) pour les demandes GDPR
- **Pas de mention du DPO** : Aucun Delegue a la Protection des Donnees n'est mentionne (obligatoire si traitement a grande echelle de donnees sensibles ou monitoring systematique)
- **Pas de mention des sous-traitants** : La politique ne liste pas les services tiers (Firebase/Google Cloud, Stripe, PayPal, Twilio, Meta, Cloudflare, Wise, Flutterwave) avec lesquels les donnees sont partagees
- **Pas de mention des transferts hors UE** : Plusieurs services (Firebase us-central, Meta, PayPal) impliquent des transferts vers les Etats-Unis ; les mecanismes de protection (SCC, decisions d'adequation) ne sont pas documentes
- **Pas de mention de la duree de conservation** par categorie de donnees
- **Pas de mention de la base legale** pour chaque traitement (consentement, execution du contrat, interet legitime, obligation legale)
- **La version (2.2 - juin 2025) est potentiellement obsolete** par rapport aux fonctionnalites actuelles (systeme affiliate, Telegram, groupAdmin ajoutes depuis)

### Priorite : HAUTE

---

## 8. Analytics et Tracking

### Statut : PARTIELLEMENT CONFORME (sauf Meta Pixel : NON CONFORME)

### Ce qui existe

**Google Analytics 4 (ga4.ts) :**
- Verification du consentement via `hasAnalyticsConsent()` avant chaque tracking
- Lecture des preferences de `localStorage` (`cookie_preferences.analytics`)
- Integration Consent Mode v2 via `updateGA4Consent()`
- Script charge dynamiquement apres consentement

**Fichier** : `sos/src/utils/ga4.ts`

**Google Tag Manager (gtm.ts) :**
- Integration Consent Mode v2
- `updateConsentFromPreferences()` synchronise les preferences avec le dataLayer
- Initialisation conditionnelle apres consentement analytics

**Google Ads (googleAds.ts) :**
- Mention explicite : "TRACKING AVEC CONSENTEMENT - Respecte le GDPR via Consent Mode v2"
- `updateGoogleAdsConsent()` appele depuis le cookie banner
- Initialisation conditionnelle apres consentement marketing

**Fichier** : `sos/src/utils/googleAds.ts`

**Meta Pixel (metaPixel.ts) - NON CONFORME :**
- Voir section 3 ci-dessus pour les details
- Tracking effectue SANS verification du consentement
- Donnees PII envoyees a Meta en clair via CAPI sans base legale

**Meta Conversions API (metaConversionsApi.ts) - NON CONFORME :**
- Appele depuis `createContactMessage.ts`, `createPaymentIntent.ts`, `PayPalManager.ts`
- Envoie email, telephone, nom, IP, user agent a Meta
- Aucune verification du consentement cote serveur

### Ce qui manque

- Mise en conformite du tracking Meta Pixel (voir section 3)
- Verification serveur du consentement avant tout envoi CAPI
- Documentation des cookies utilises et leur finalite dans la page Cookies

### Priorite : CRITIQUE (Meta Pixel) / BASSE (GA4, Google Ads - deja conformes)

---

## 9. Partage de Donnees avec des Tiers

### Statut : PARTIELLEMENT CONFORME

### Ce qui existe et ce qui est partage

| Service | Donnees partagees | Base legale | Conforme |
|---------|-------------------|-------------|----------|
| **Twilio** | Numeros de telephone (appels/SMS), metadata d'appel | Execution du contrat | Oui |
| **Stripe** | Email, nom, ID utilisateur, details de paiement | Execution du contrat | Oui |
| **PayPal** | Email PayPal, montants | Execution du contrat | Oui |
| **Meta/Facebook** | Email, telephone, nom, prenom, pays, IP, user agent, ID utilisateur | Consentement (MANQUANT) | NON |
| **Google Analytics** | Donnees de navigation anonymisees | Consentement (OK) | Oui |
| **Google Ads** | Donnees de conversion | Consentement (OK) | Oui |
| **Firebase/GCP** | Toutes les donnees (hebergement) | Sous-traitance | Partiel |
| **Wise** | Coordonnees bancaires, nom, montant | Execution du contrat | Oui |
| **Flutterwave** | Coordonnees Mobile Money, montant | Execution du contrat | Oui |
| **Cloudflare** | Trafic web (headers, IP) | Interet legitime | Partiel |

**Details Twilio :**
Les numeros de telephone sont envoyes a Twilio pour les appels (`twilioClient.calls.create`) et SMS (`twilioClient.messages.create`). Les numeros sont partiellement masques dans les logs (`phoneNumber.substring(0, 6)****`).

**Fichier** : `sos/firebase/functions/src/TwilioCallManager.ts` (ligne 1255)

**Details Stripe :**
Les customers Stripe sont crees avec email, nom, et metadata (providerId, source). En cas de suppression GDPR, le customer Stripe est supprime (`stripe.customers.del`).

**Fichier** : `sos/firebase/functions/src/subscription/checkout.ts` (ligne 277)

**Details coordonnees bancaires :**
Les coordonnees bancaires des affilies sont chiffrees avant stockage (`encryptBankDetails`) et dechiffrees uniquement pour le traitement des paiements.

**Fichier** : `sos/firebase/functions/src/affiliate/callables/updateBankDetails.ts`

### Ce qui manque

- **Pas de contrats de sous-traitance (DPA)** documentes dans le code avec Firebase/GCP, Twilio, Stripe, Cloudflare
- **Pas de clause contractuelle type (SCC)** pour les transferts hors UE (Meta USA, Twilio USA, Stripe USA)
- **Pas d'evaluation d'impact (DPIA)** pour le tracking publicitaire et le profilage des affilies
- **La politique de confidentialite ne liste pas les sous-traitants** et les pays de transfert

### Priorite : HAUTE

---

## 10. Securite Technique

### Statut : CONFORME

### Ce qui existe

**Chiffrement :**
- **AES-256-GCM** pour les donnees sensibles (numeros de telephone, coordonnees bancaires)
- IV aleatoire de 12 octets (standard GCM)
- Auth tag pour verification d'integrite
- Cle stockee dans Firebase Secrets (pas dans le code)
- Support de rotation de cles (`reEncrypt`)
- Fonctions de masquage (`maskPhoneNumber`, `maskBankAccount`)

**Fichier** : `sos/firebase/functions/src/utils/encryption.ts`

**SHA256 hashage pour Meta CAPI :**
- Toutes les donnees PII envoyees a Meta sont hashees en SHA256 avant envoi (email, telephone, nom, etc.)
- Sauf IP et User Agent (conformes au standard CAPI)

**Fichier** : `sos/firebase/functions/src/metaConversionsApi.ts`

**Systeme d'alertes de securite :**
- Detection de menaces : brute force, localisation inhabituelle, paiement suspect, creation de comptes en masse, abus API, injection SQL, XSS
- Scoring de menaces (`ThreatScoreService`)
- Rate limiting
- Niveaux de severite : info, warning, critical, emergency
- Detection de VPN/Tor/Proxy

**Fichier** : `sos/firebase/functions/src/securityAlerts/`

**Audit Trail GDPR :**
- Log de tous les acces aux donnees personnelles
- Log des modifications de profil
- Log des exports et suppressions
- Log des changements de consentement
- Log des acces admin
- Conservation 3 ans

**Fichier** : `sos/firebase/functions/src/gdpr/auditTrail.ts`

**Sauvegardes :**
- Backup multi-frequence (`multiFrequencyBackup`)
- Backup cross-region (`crossRegionBackup`)
- Backup Firebase Auth (`backupAuth`)
- Backup des secrets (`backupSecretsAndConfig`)

### Ce qui manque

- **Pas de chiffrement au repos pour Firestore** : Les donnees dans Firestore sont chiffrees par Google par defaut (encryption at rest via Google Cloud), mais pas avec une cle geree par le client (CMEK)
- **Pas de procedure formelle de notification de violation** de donnees dans les 72h (Art. 33) : le systeme de detection existe mais pas le workflow de notification CNIL/utilisateurs

### Priorite : MOYENNE

---

## 11. Gouvernance et Documentation GDPR

### Statut : NON CONFORME

### Ce qui existe

- Un systeme d'audit trail technique complet (`gdpr_audit_logs`)
- Des fonctions callables pour les demandes GDPR (`gdpr_requests`)
- Une interface admin pour traiter les demandes (`listGDPRRequests`, `processGDPRRequest`)
- Un type `gdprAdequate: boolean` dans les types accounting pour les pays

**Fichier** : `sos/src/types/accounting.ts` (ligne 283-284)

### Ce qui manque

- **Pas de DPO designe** (Article 37) : Obligatoire si traitement systematique a grande echelle
- **Pas de Registre des Traitements (ROPA)** (Article 30) : Obligatoire pour toute entreprise
- **Pas d'Evaluation d'Impact (DPIA)** (Article 35) : Requise pour le tracking publicitaire, le profilage des affilies, et le traitement de donnees a grande echelle
- **Pas de procedure de notification de violation** (Article 33/34) : Workflow de notification CNIL en 72h et notification aux personnes concernees
- **Pas de formation GDPR documentee** pour les administrateurs
- **Pas de politique de confidentialite interne** (pour les employes/admins)

### Priorite : HAUTE

---

## Plan d'Action Recommande

### Phase 1 - Corrections Critiques (0-2 semaines)

| # | Action | Article GDPR | Priorite |
|---|--------|--------------|----------|
| 1 | **Corriger le tracking Meta Pixel** : Conditionner TOUT le tracking (frontend + CAPI backend) au consentement marketing de l'utilisateur | Art. 6, 7 | CRITIQUE |
| 2 | **Verifier le consentement serveur avant CAPI** : Lire `users/{uid}/preferences.consents.marketing` avant tout appel `trackCAPILead`/`trackCAPIPurchase` | Art. 6, 7 | CRITIQUE |
| 3 | **Synchroniser le consentement** : Ecrire les preferences cookie dans Firestore (pas seulement localStorage) pour verification serveur | Art. 7 | CRITIQUE |

### Phase 2 - Corrections Hautes (2-4 semaines)

| # | Action | Article GDPR | Priorite |
|---|--------|--------------|----------|
| 4 | **Creer l'interface utilisateur GDPR** : Page "Mes Donnees" avec boutons Export, Suppression, Historique d'acces, Modification du consentement | Art. 12-22 | HAUTE |
| 5 | **Rediger le Registre des Traitements (ROPA)** : Documenter chaque traitement, base legale, finalite, duree, destinataires | Art. 30 | HAUTE |
| 6 | **Mettre a jour la politique de confidentialite** : Ajouter sous-traitants, bases legales, durees, transferts hors UE, DPO | Art. 13, 14 | HAUTE |
| 7 | **Implementer les TTL manquants** : call_sessions (2 ans), notifications (1 an), contact_messages (1 an), admin_audit_logs (5 ans) | Art. 5(1)(e) | HAUTE |
| 8 | **Designe un DPO** ou documenter pourquoi ce n'est pas requis | Art. 37 | HAUTE |
| 9 | **Unifier la suppression de compte** : Faire passer `deleteUserAccount` (frontend) par `requestAccountDeletion` (backend GDPR) pour garantir l'anonymisation complete | Art. 17 | HAUTE |

### Phase 3 - Ameliorations Moyennes (1-2 mois)

| # | Action | Article GDPR | Priorite |
|---|--------|--------------|----------|
| 10 | **Rediger les DPA** avec chaque sous-traitant (ou verifier leur existence) | Art. 28 | MOYENNE |
| 11 | **Documenter les SCC/mecanismes de transfert** pour chaque transfert hors UE | Art. 46 | MOYENNE |
| 12 | **Realiser une DPIA** pour le tracking publicitaire et le systeme d'affiliation | Art. 35 | MOYENNE |
| 13 | **Creer une procedure de notification de violation** : Workflow, templates, delais, contacts CNIL | Art. 33, 34 | MOYENNE |
| 14 | **Ajouter l'export au format CSV** en plus du JSON | Art. 20 | MOYENNE |
| 15 | **Couvrir toutes les collections dans l'export** : ajouter sos_profiles, influencer, blogger, groupAdmin | Art. 20 | MOYENNE |
| 16 | **Implementer le nettoyage automatique de l'audit trail** (utiliser la constante `RETENTION_MS` de 3 ans) | Art. 5(1)(e) | MOYENNE |

### Phase 4 - Bonnes Pratiques (2-3 mois)

| # | Action | Article GDPR | Priorite |
|---|--------|--------------|----------|
| 17 | Minimiser les PII dans les invoices (utiliser des references au lieu d'email/nom en clair) | Art. 5(1)(c) | BASSE |
| 18 | Evaluer CMEK (Customer-Managed Encryption Keys) pour Firestore | Art. 32 | BASSE |
| 19 | Ajouter un opt-in explicite pour les emails marketing | Art. 6, 7 | BASSE |
| 20 | Documenter la formation GDPR pour les administrateurs | Responsabilite | BASSE |

---

## Annexe : Fichiers Cles Audites

| Fichier | Role GDPR |
|---------|-----------|
| `sos/firebase/functions/src/gdpr/auditTrail.ts` | Systeme central GDPR (audit, export, suppression, consentement) |
| `sos/firebase/functions/src/admin/providerActions.ts` | Hard delete / GDPR purge admin |
| `sos/firebase/functions/src/triggers/userCleanupTrigger.ts` | Cascade de suppression automatique |
| `sos/firebase/functions/src/utils/encryption.ts` | Chiffrement AES-256-GCM |
| `sos/firebase/functions/src/metaConversionsApi.ts` | Envoi de PII a Meta (problematique) |
| `sos/firebase/functions/src/scheduled/paymentDataCleanup.ts` | Archivage/nettoyage des paiements |
| `sos/firebase/functions/src/scheduled/cleanupTempStorageFiles.ts` | Nettoyage stockage temporaire |
| `sos/firebase/functions/src/securityAlerts/` | Detection de menaces et alertes |
| `sos/src/components/common/CookieBanner.tsx` | Banniere de consentement cookies |
| `sos/src/utils/metaPixel.ts` | Tracking Meta Pixel (NON CONFORME) |
| `sos/src/utils/ga4.ts` | Google Analytics 4 (conforme) |
| `sos/src/utils/googleAds.ts` | Google Ads (conforme) |
| `sos/src/pages/PrivacyPolicy.tsx` | Politique de confidentialite |
| `sos/src/pages/Cookies.tsx` | Politique cookies |
| `sos/src/contexts/types.ts` | Definition des types PII utilisateur |
| `sos/src/contexts/AuthContext.tsx` | Suppression de compte utilisateur |
| `sos/src/components/admin/AdminGdprPurgeModal.tsx` | Interface admin de purge GDPR |
| `sos/firebase/functions/src/chatter/types.ts` | Types PII des affilies |

---

## Conclusion

SOS Expat a investi significativement dans l'infrastructure GDPR (audit trail, systeme d'export/suppression, chiffrement, cookie banner granulaire). Cependant, **le probleme le plus critique est le tracking Meta Pixel effectue deliberement sans consentement**, qui constitue une violation directe du GDPR et expose l'entreprise a des sanctions pouvant atteindre 4% du chiffre d'affaires annuel ou 20 millions d'euros.

Les corrections de Phase 1 (Meta Pixel + synchronisation du consentement) doivent etre traitees en urgence. Les lacunes de gouvernance (DPO, ROPA, DPIA) et l'absence d'interface utilisateur pour exercer les droits GDPR sont les priorites suivantes.
