# INVENTAIRE COMPLET DES BACKUPS - SOS EXPAT

**Date:** 2026-01-11
**Projet:** sos-urgently-ac307

---

## INVENTAIRE DETAILLE

### 1. FIREBASE FIRESTORE

#### Collections Critiques (Sauvegardees 3x/jour)

| Collection | Description | Estimation Docs | Sauvegardee |
|------------|-------------|-----------------|-------------|
| `users` | Utilisateurs (clients, providers, admins) | ~500+ | OUI |
| `sos_profiles` | Profils prestataires detailles | ~100+ | OUI |
| `call_sessions` | Sessions d'appel | ~1000+ | OUI |
| `payments` | Transactions de paiement | ~500+ | OUI |
| `subscriptions` | Abonnements IA | ~100+ | OUI |
| `invoices` | Factures generees | ~500+ | OUI |

#### Collections Financieres (Retention Indefinie)

| Collection | Description | Sauvegardee |
|------------|-------------|-------------|
| `payments` | Transactions | OUI |
| `invoices` | Factures | OUI |
| `invoice_records` | Enregistrements factures | OUI |
| `admin_invoices` | Factures admin | OUI |
| `transfers` | Transferts | OUI |
| `pending_transfers` | Transferts en attente | OUI |
| `refunds` | Remboursements | OUI |
| `disputes` | Litiges | OUI |
| `journal_entries` | Ecritures comptables | OUI |
| `tax_filings` | Declarations fiscales | OUI |

#### Collections Secondaires

| Collection | Description | Sauvegardee |
|------------|-------------|-------------|
| `reviews` | Avis utilisateurs | OUI |
| `notifications` | Notifications | OUI |
| `faqs` | FAQ | OUI |
| `help_articles` | Articles d'aide | OUI |
| `legal_documents` | Documents legaux | OUI |
| `country_settings` | Configuration pays | OUI |
| `admin_config` | Configuration admin | OUI |
| `coupons` | Codes promo | OUI |
| `message_events` | Evenements messages | OUI |
| `paypal_orders` | Commandes PayPal | OUI |

#### Collections Systeme

| Collection | Description | Sauvegardee |
|------------|-------------|-------------|
| `system_logs` | Logs systeme | OUI |
| `system_alerts` | Alertes | OUI |
| `backup_errors` | Erreurs backup | OUI |
| `admin_audit_logs` | Audit admin | OUI |
| `backups` | Metadonnees backups | OUI |
| `auth_backups` | Metadonnees Auth | OUI |
| `security_logs` | Logs securite | OUI |
| `quarterly_restore_tests` | Rapports tests | OUI |
| `dr_test_reports` | Rapports DR | OUI |
| `restore_operations` | Operations restauration | OUI |

---

### 2. FIREBASE AUTH

| Element | Description | Sauvegarde |
|---------|-------------|------------|
| **UID** | Identifiant unique | OUI (hebdo) |
| **Email** | Adresse email | OUI |
| **emailVerified** | Statut verification | OUI |
| **displayName** | Nom affiche | OUI |
| **photoURL** | URL photo profil | OUI |
| **phoneNumber** | Numero telephone | OUI |
| **disabled** | Compte desactive | OUI |
| **providerData** | Providers auth | OUI |
| **customClaims** | Claims personnalises | OUI |
| **metadata.creationTime** | Date creation | OUI |
| **metadata.lastSignInTime** | Derniere connexion | OUI |

**Frequence:** Hebdomadaire (Dimanche 03:00)
**Retention:** 90 jours
**Format:** JSON dans Cloud Storage

---

### 3. FIREBASE STORAGE

#### Dossiers Sauvegardes

| Dossier | Contenu | Destination |
|---------|---------|-------------|
| `profilePhotos/` | Photos profil utilisateurs | Bucket DR |
| `profile_photos/` | Photos profil (alt) | Bucket DR |
| `documents/` | Documents KYC | Bucket DR |
| `invoices/` | Factures PDF | Bucket DR |
| `auth_backups/` | Backups Auth JSON | Bucket DR |

#### Dossiers Exclus

| Dossier | Raison |
|---------|--------|
| `registration_temp/` | Fichiers temporaires |
| `temp_profiles/` | Profils temporaires |
| `.cache/` | Cache systeme |

**Frequence:** Quotidienne (05:00)
**Destination:** `sos-expat-backup-dr`

---

### 4. CLOUD FUNCTIONS

| Element | Statut | Sauvegarde |
|---------|--------|------------|
| **Code source** | Versionne Git | OUI (Git) |
| **package.json** | Versionne Git | OUI (Git) |
| **tsconfig.json** | Versionne Git | OUI (Git) |
| **Configuration runtime** | Non versionne | NON |
| **Variables environnement** | Firebase Config | NON |

**Chemin:** `sos/firebase/functions/`

---

### 5. REGLES DE SECURITE

| Fichier | Reference | Sauvegarde |
|---------|-----------|------------|
| `firestore.rules` | firebase.json | **OUI** (1537 lignes dans sos/) |
| `storage.rules` | firebase.json | **OUI** (177 lignes dans sos/) |
| `firestore.indexes.json` | firebase.json | A VERIFIER |

**STATUT:** Les regles sont versionnees dans Git

---

### 6. INTEGRATIONS TIERCES

#### Stripe

| Element | Sauvegarde |
|---------|------------|
| Cles API (references) | NON |
| Webhooks configures | NON |
| Produits definis | NON |
| Prix configures | NON |
| Configuration Connect | NON |

#### PayPal

| Element | Sauvegarde |
|---------|------------|
| Client ID (reference) | NON |
| Webhooks | NON |
| Configuration vendeur | NON |

#### Twilio

| Element | Sauvegarde |
|---------|------------|
| Account SID | NON |
| Auth Token (reference) | NON |
| Numeros telephoniques | NON |
| TwiML applications | NON |
| Webhooks | NON |

---

### 7. DONNEES SENSIBLES

| Element | Stockage Actuel | Sauvegarde |
|---------|-----------------|------------|
| **Cles API Stripe** | Firebase Functions Config | NON |
| **Cles API PayPal** | Firebase Functions Config | NON |
| **Cles API Twilio** | Firebase Functions Config | NON |
| **Cle chiffrement** | Firebase Functions Config | NON |
| **SMTP credentials** | Firebase Functions Config | NON |

---

### 8. GOOGLE CLOUD PLATFORM

| Service | Element | Sauvegarde |
|---------|---------|------------|
| **Cloud Tasks** | Queues configurees | NON |
| **Cloud Scheduler** | Cron jobs | NON (code versionne) |
| **IAM** | Roles/permissions | NON |
| **Service Accounts** | Cles JSON | NON |
| **Billing** | Configuration | NON |

---

### 9. CODE SOURCE

| Repository | Plateforme | Sauvegarde |
|------------|------------|------------|
| **sos-expat-project** | Git local | OUI |
| **Remote origin** | A verifier | A verifier |

**Branches:**
- `main` - Branche principale

---

### 10. FRONTEND (DIGITAL OCEAN)

| Element | Sauvegarde |
|---------|------------|
| **Build artifacts** | Non (regenerables) |
| **Configuration DO** | NON |
| **Variables env DO** | NON |

---

## RESUME INVENTAIRE

### Sauvegarde Complete

| Categorie | Elements |
|-----------|----------|
| Firestore | TOUTES les collections |
| Auth | Utilisateurs + claims |
| Storage | Fichiers critiques |
| Code | Git versionne |

### Sauvegarde Partielle

| Categorie | Manquant |
|-----------|----------|
| Functions | Config runtime |
| Tests | Donnees test |

### Non Sauvegarde

| Categorie | Elements |
|-----------|----------|
| ~~Regles securite~~ | ~~firestore.rules, storage.rules~~ RESOLU |
| Secrets | Cles API tierces (script disponible) |
| GCP Config | Cloud Tasks, IAM |
| Integrations | Stripe, PayPal, Twilio config (template disponible) |

---

## CHECKLIST VERIFICATION

### Firebase
- [x] Firestore - Collections critiques
- [x] Firestore - Collections financieres
- [x] Auth - Utilisateurs
- [x] Auth - Custom claims
- [x] Storage - Photos profil
- [x] Storage - Documents KYC
- [x] Storage - Factures
- [x] Security Rules - Firestore (1537 lignes)
- [x] Security Rules - Storage (177 lignes)
- [ ] Extensions - Si installees

### Google Cloud
- [ ] Cloud Tasks - Queues
- [x] Cloud Scheduler - Via code
- [ ] IAM - Roles
- [ ] Service Accounts - Cles

### Code Source
- [x] Frontend React
- [x] Firebase Functions
- [x] Configurations build
- [x] Git repository

### Integrations Tierces
- [ ] Stripe - Configuration complete
- [ ] PayPal - Configuration complete
- [ ] Twilio - Configuration complete
- [ ] Zoho Mail - Templates

### Donnees Sensibles
- [ ] Cles API
- [ ] Secrets Functions
- [ ] Certificats SSL
- [ ] Configuration DNS

---

**Document genere:** 2026-01-11
**Version:** 1.0
