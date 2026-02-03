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
| Cles API (references) | OUI (Secret Manager + doc) |
| Webhooks configures | OUI (documenté) |
| Produits definis | OUI (script export) |
| Prix configures | OUI (script export) |
| Configuration Connect | OUI (documenté) |

**Documentation:** `All_Explains/backup-system/third-party-config-backup.md`

#### PayPal

| Element | Sauvegarde |
|---------|------------|
| Client ID (reference) | OUI (documenté) |
| Webhooks | OUI (documenté) |
| Configuration vendeur | OUI (documenté) |

#### Twilio

| Element | Sauvegarde |
|---------|------------|
| Account SID | OUI (Secret Manager) |
| Auth Token (reference) | OUI (Secret Manager) |
| Numeros telephoniques | OUI (script export) |
| TwiML applications | OUI (script export) |
| Webhooks | OUI (documenté) |

**Script d'export:** Voir `third-party-config-backup.md`

---

### 7. DONNEES SENSIBLES

| Element | Stockage Actuel | Sauvegarde |
|---------|-----------------|------------|
| **Cles API Stripe** | Firebase Secret Manager | OUI (audit mensuel) |
| **Cles API PayPal** | Firebase Secret Manager | OUI (audit mensuel) |
| **Cles API Twilio** | Firebase Secret Manager | OUI (audit mensuel) |
| **Cle chiffrement** | Firebase Secret Manager | OUI (audit mensuel) |
| **SMTP credentials** | Firebase Secret Manager | OUI (audit mensuel) |

**Fonction automatique:** `monthlySecretsConfigBackup` (1er du mois à 02:00)
**Audit manuel:** `triggerSecretsAudit` (callable par admin)

---

### 8. GOOGLE CLOUD PLATFORM

| Service | Element | Sauvegarde |
|---------|---------|------------|
| **Cloud Tasks** | Queues configurees | OUI (script export) |
| **Cloud Scheduler** | Cron jobs | OUI (code versionne) |
| **IAM** | Roles/permissions | OUI (script export) |
| **Service Accounts** | Cles JSON | OUI (documenté) |
| **Secret Manager** | Secrets | OUI (audit mensuel) |
| **Cloud Run** | Services Twilio | OUI (script export) |

**Documentation:** `All_Explains/backup-system/gcp-cloud-tasks-iam-backup.md`
**Script d'export:** `gcp-full-export.sh`

---

### 9. CODE SOURCE

| Repository | Plateforme | Sauvegarde |
|------------|------------|------------|
| **sos-expat-project** | Git local | OUI |
| **Remote origin** | A verifier | A verifier |

**Branches:**
- `main` - Branche principale

---

### 10. FRONTEND (CLOUDFLARE PAGES)

| Element | Sauvegarde |
|---------|------------|
| **Build artifacts** | Non (regenerables) |
| **Configuration Cloudflare** | OUI (documenté) |
| **Variables env (VITE_*)** | OUI (documenté) |

**Documentation:** `All_Explains/backup-system/cloudflare-pages-config.md`

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

### Nouvellement Documenté (2026-02-03)

| Categorie | Elements |
|-----------|----------|
| ✅ Secrets | Audit automatique mensuel (`monthlySecretsConfigBackup`) |
| ✅ GCP Config | Cloud Tasks, IAM, Cloud Run (scripts export) |
| ✅ Integrations | Stripe, PayPal, Twilio (documentation complète) |
| ✅ Cloudflare | Variables env, Build settings, Domaines |

### Tests DR Améliorés

| Test | Statut |
|------|--------|
| ✅ Bucket DR Access | Vérifie existence et accès |
| ✅ Secrets Configuration | Vérifie tous les secrets critiques |

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
- [x] Cloud Tasks - Queues (script export)
- [x] Cloud Scheduler - Via code
- [x] IAM - Roles (script export)
- [x] Service Accounts - Documenté
- [x] Secret Manager - Audit mensuel
- [x] Cloud Run - Script export

### Code Source
- [x] Frontend React
- [x] Firebase Functions
- [x] Configurations build
- [x] Git repository

### Integrations Tierces
- [x] Stripe - Documentation complète + scripts
- [x] PayPal - Documentation complète
- [x] Twilio - Documentation complète + scripts
- [x] Cloudflare Pages - Documentation complète

### Donnees Sensibles
- [x] Cles API - Secret Manager + audit mensuel
- [x] Secrets Functions - Audit automatique
- [x] Configuration DNS - Documenté (Cloudflare)

---

**Document genere:** 2026-01-11
**Mis à jour:** 2026-02-03
**Version:** 2.0

---

## NOUVELLES FONCTIONNALITÉS (v2.0)

### Cloud Functions Ajoutées
- `monthlySecretsConfigBackup` - Audit automatique mensuel des secrets
- `triggerSecretsAudit` - Audit manuel (admin)
- `listSecretsAudits` - Liste des audits
- `getSecretsRestoreGuide` - Guide de restauration

### Tests DR Améliorés
- `testDRBucketAccess` - Vérifie bucket DR existe et accessible
- `testSecretsConfig` - Vérifie secrets critiques configurés

### Documentation Ajoutée
- `third-party-config-backup.md` - Stripe, PayPal, Twilio
- `cloudflare-pages-config.md` - Hosting frontend
- `gcp-cloud-tasks-iam-backup.md` - Configuration GCP
