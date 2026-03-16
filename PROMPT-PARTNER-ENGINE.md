# PROMPT — Partner Engine (Laravel)

> Ce prompt est à donner à Claude Code pour créer le projet `partner-engine` de zéro.
> Il contient TOUTE l'architecture, les specs, les tables, les endpoints, le Docker, le CI/CD.

---

## CONTEXTE GLOBAL

Tu dois créer un **Partner Engine** — un service Laravel indépendant qui gère le système d'abonnés partenaires pour SOS-Expat.

### Qu'est-ce que SOS-Expat ?
SOS-Expat est une plateforme qui met en relation téléphonique des expatriés avec des avocats et des expatriés aidants dans 197 pays, en 9 langues, 24/7. Les appels sont payants (49€ avocat, 19€ expat helper).

### Qu'est-ce qu'un Partenaire ?
Un partenaire est une **entreprise, ambassade, consulat, association, agence immobilière, banque, assurance, cabinet de relocation, etc.** qui a signé un accord commercial avec SOS-Expat. Chaque accord est **négocié au cas par cas** (commissions, réductions, durée, limites).

### Pourquoi un Engine séparé ?
- Le backend principal (Firebase Functions) a déjà 650+ fonctions et 80% du quota CPU
- Les relations partenaire ↔ abonnés ↔ activité nécessitent une **base relationnelle** (PostgreSQL), pas Firestore
- Les imports CSV de 50K+ abonnés nécessitent des **queue workers** sans timeout
- Pattern déjà utilisé avec succès : `engine_telegram_sos_expat` (même stack, même VPS)

---

## ARCHITECTURE EXISTANTE (à connaître)

### Projets existants
- **SOS-Expat Frontend** : Vite + React + TypeScript, déployé sur Cloudflare Pages via GitHub auto-deploy
- **Firebase Functions** : 650+ Cloud Functions réparties sur 3 régions (europe-west1, us-central1, europe-west3)
- **Firestore** : Base NoSQL principale (region nam7, Iowa)
- **Telegram Engine** : Laravel 12 sur Hetzner VPS (`engine-telegram-sos-expat.life-expat.com`) — même pattern que ce qu'on crée

### Collections Firestore existantes (pertinentes)
- `partners/{partnerId}` — profil partenaire (affiliateCode, commissionConfig, discountConfig, status, websiteName, etc.)
- `partner_applications/{id}` — candidatures partenaires (formulaire landing page)
- `partner_commissions/{id}` — commissions générées par les appels
- `partner_affiliate_clicks/{id}` — clics sur les liens affiliés
- `partner_subscribers/{id}` — **À CRÉER côté Firebase** (miroir minimal pour les rules Firestore)
- `users/{uid}` — tous les utilisateurs SOS-Expat (clients, avocats, expats, affiliés)
- `call_sessions/{id}` — sessions d'appels (isPaid, duration, providerType, etc.)

### Firebase → Partner Engine : Communication
Le frontend React appelle **directement** l'API du Partner Engine (comme il le fait déjà avec le Telegram Engine). Firebase envoie des **webhooks** au Partner Engine quand des événements se produisent (appel complété, paiement, inscription).

### Authentification
- Les partenaires se connectent via **Firebase Auth** sur le frontend SOS-Expat
- Le frontend envoie le **Firebase ID Token** dans le header `Authorization: Bearer {token}`
- Le Partner Engine **vérifie le token** via Firebase Admin SDK PHP
- Le Partner Engine vérifie que l'utilisateur a le rôle `partner` dans Firestore

### VPS Hetzner existant
- **IP** : `95.216.179.163`
- **OS** : Ubuntu 22.04
- **Projets existants** : Telegram Engine dans `/opt/engine-telegram/`
- **Le Partner Engine ira dans** : `/opt/partner-engine/`
- **Domaine** : `partner-engine.life-expat.com` (à configurer dans Cloudflare DNS → proxy vers VPS)

---

## SPECS FONCTIONNELLES

### 1. Gestion des accords commerciaux (Agreements)

Chaque partenaire a un **accord commercial** configurable :

```
Agreement {
  partner_id          -- lien vers le partenaire Firebase
  name                -- "Accord ReloFrance 2026"
  status              -- draft | active | paused | expired

  // Réductions pour les abonnés
  discount_type       -- 'fixed' | 'percent' | 'none'
  discount_value      -- montant en cents ou pourcentage (ex: 500 = $5, ou 10 = 10%)
  discount_max_cents  -- plafond en cents (si percent, pour éviter des réductions trop élevées)
  discount_label      -- "Réduction ReloFrance" (affiché au client)

  // Commissions pour le partenaire
  commission_per_call_lawyer  -- cents (ex: 500 = $5 par appel avocat)
  commission_per_call_expat   -- cents (ex: 300 = $3 par appel expat)
  commission_type             -- 'fixed' | 'percent'
  commission_percent          -- si percent (ex: 10 = 10% du prix de l'appel)

  // Limites
  max_subscribers     -- nombre max d'abonnés (null = illimité)
  max_calls_per_subscriber -- appels max par abonné (null = illimité)

  // Durée
  starts_at           -- date de début
  expires_at          -- date d'expiration (null = illimité)

  // Metadata
  notes               -- notes internes admin
  created_at
  updated_at
}
```

### 2. Gestion des abonnés (Subscribers)

Le partenaire peut **importer ses abonnés** via CSV ou les ajouter manuellement.

```
Subscriber {
  id
  partner_id          -- FK vers partner
  agreement_id        -- FK vers l'accord applicable

  // Identité
  email               -- unique par partenaire
  first_name
  last_name
  phone               -- optionnel
  country             -- ISO 2 chars
  language            -- fr, en, es, etc.

  // Lien SOS-Expat
  firebase_uid        -- null tant que pas inscrit, rempli après inscription
  affiliate_code      -- code affilié SOS-Expat (généré à l'inscription)

  // Statut
  status              -- invited | registered | active | suspended | expired
  invited_at          -- date d'envoi de l'invitation
  registered_at       -- date d'inscription sur SOS-Expat
  last_activity_at    -- dernier appel ou clic

  // Activité
  total_calls         -- nombre d'appels effectués
  total_spent_cents   -- montant total dépensé
  total_discount_cents -- montant total des réductions obtenues

  // Metadata
  tags                -- JSON array ["vip", "premium"]
  custom_fields       -- JSON object (champs libres)
  created_at
  updated_at
}
```

### 3. Import CSV

Le partenaire uploade un fichier CSV avec les colonnes :
```
email, first_name, last_name, phone, country, language, tags
```

Le système :
1. Valide chaque ligne (email format, pays valide, langue valide)
2. Déduplique (ignore les emails déjà importés pour ce partenaire)
3. Crée les `Subscriber` avec statut `invited`
4. Envoie les emails d'invitation en **queue** (pas de timeout)
5. Retourne un rapport : `{imported: 450, duplicates: 23, errors: 7, errorDetails: [...]}`

### 4. Invitation par email

Quand un abonné est importé, il reçoit un email personnalisé :
- Template configurable par partenaire (ou template par défaut)
- Contient un **lien d'inscription unique** : `https://www.sos-expat.com/inscription?partner={partnerId}&subscriber={subscriberId}&token={inviteToken}`
- Le lien pré-remplit l'inscription et lie automatiquement l'abonné au partenaire
- La réduction négociée s'applique automatiquement à ses appels

### 5. Tracking d'activité

Quand un événement se produit côté Firebase, un **webhook** est envoyé au Partner Engine :

```
POST /api/webhooks/call-completed
{
  "callSessionId": "xxx",
  "clientUid": "yyy",
  "providerType": "lawyer",
  "duration": 1200,
  "amountPaidCents": 5500,
  "discountAppliedCents": 500,
  "partnerReferredBy": "partnerId",
  "subscriberId": "zzz"  // si le client est un abonné identifié
}
```

Le Partner Engine :
1. Met à jour l'activité du subscriber (total_calls++, total_spent, last_activity_at)
2. Enregistre l'événement dans `subscriber_activities`
3. Calcule la commission selon l'accord commercial actif
4. **Écrit la commission dans Firebase** `partner_commissions/{id}` (pour alimenter le solde du partenaire)
5. **Met à jour le solde** dans Firebase `partners/{partnerId}` (pendingBalance, totalEarned)
6. Met à jour les stats agrégées dans PostgreSQL

### 5b. CRITIQUE — Système de paiement & commissions

Le partenaire a **2 sources de revenus** qui alimentent le **même solde** dans Firebase :

```
Source 1 : LIEN AFFILIÉ (système existant, géré par Firebase)
───────────────────────────────────────────────────────────
Quelqu'un clique le lien affilié du partenaire
→ Appelle un avocat/expat helper
→ Firebase trigger onCallCompleted crée une partner_commission
→ Cycle : pending → validated → available
→ Partenaire retire via partnerRequestWithdrawal (existant)

Source 2 : ABONNÉS (nouveau système, géré par Partner Engine)
───────────────────────────────────────────────────────────
Un abonné importé par le partenaire fait un appel
→ Firebase webhook → Partner Engine
→ Partner Engine calcule la commission selon l'accord
→ Partner Engine ÉCRIT dans Firebase :
  • partner_commissions/{id} (nouveau doc avec source="subscriber")
  • partners/{partnerId}.pendingBalance += commission
  • partners/{partnerId}.totalEarned += commission
→ Le cron Firebase existant (releasePartnerPendingCommissions) gère le cycle
  pending → validated → available (même délais que les commissions affilié)
→ Partenaire retire via partnerRequestWithdrawal (existant, inchangé)
```

**IMPORTANT** : Le Partner Engine n'a PAS son propre système de retrait. Il écrit les commissions dans Firebase et le système existant fait le reste. Un seul solde, un seul dashboard de retrait, un seul flux de paiement.

**Document `partner_commissions` créé par le Partner Engine** :
```
{
  id: string (auto-generated)
  partnerId: string (Firebase UID)
  type: "subscriber_call"                    // vs "affiliate_call" pour les commissions affilié
  source: "partner_engine"                   // vs "firebase" pour les commissions affilié
  status: "pending"                          // cycle géré par le cron Firebase existant

  // Infos abonné
  subscriberId: number                       // ID PostgreSQL du subscriber
  subscriberEmail: string
  subscriberName: string

  // Infos appel
  callSessionId: string
  providerType: "lawyer" | "expat"
  callDurationSeconds: number
  amountPaidByClientCents: number
  discountAppliedCents: number

  // Commission
  commissionAmountCents: number              // montant calculé selon l'accord
  commissionType: "fixed" | "percent"
  agreementId: number                        // ID PostgreSQL de l'accord
  agreementName: string

  // Timestamps
  callCompletedAt: Timestamp
  createdAt: Timestamp
  holdUntil: Timestamp                       // basé sur holdPeriodDays de l'accord ou config globale

  // Anti-fraude
  isIdempotent: true                         // flag pour éviter les doublons
  idempotencyKey: string                     // SHA256(callSessionId + partnerId + "subscriber")
}
```

**Calcul de la commission** :
```
Si accord.commission_type == "fixed" :
  commission = accord.commission_per_call_lawyer   (si providerType == "lawyer")
  commission = accord.commission_per_call_expat    (si providerType == "expat")

Si accord.commission_type == "percent" :
  commission = amountPaidByClientCents * (accord.commission_percent / 100)
  commission = min(commission, plafond éventuel)
```

### 5c. Dashboard partenaire — Vue unifiée des revenus

Le dashboard partenaire existant (Firebase) affiche déjà :
- `totalEarned` — total gagné (affilié + abonnés)
- `availableBalance` — disponible pour retrait
- `pendingBalance` — en cours de validation
- `totalWithdrawn` — déjà retiré

Le Partner Engine ajoute un **détail par source** via son API :
- `GET /api/partner/earnings/breakdown` → `{ affiliate: { total, thisMonth }, subscribers: { total, thisMonth, byAgreement: [...] } }`
- Le frontend enrichit le dashboard existant avec un onglet "Détail par source"

### 5d. Retrait — Rien à changer

Le système de retrait (`partnerRequestWithdrawal`) fonctionne déjà :
- Vérifie `availableBalance >= amount + fees`
- Déduit du solde
- Crée un `payment_withdrawals` doc
- Envoie confirmation Telegram
- Admin traite le paiement (Wise, PayPal, Mobile Money, virement)

**Aucune modification nécessaire** — les commissions abonnés sont déjà dans le même solde.

### 6. Dashboard Partenaire (API)

Le partenaire accède à son dashboard via le frontend SOS-Expat qui appelle l'API :

**Endpoints partenaire** (auth requise, role=partner) :
- `GET /api/partner/dashboard` — stats globales (abonnés, appels, revenus, conversions)
- `GET /api/partner/subscribers` — liste paginée avec filtres (status, search, tags)
- `GET /api/partner/subscribers/{id}` — détail d'un abonné + son activité
- `POST /api/partner/subscribers/import` — upload CSV
- `POST /api/partner/subscribers` — ajout manuel d'un abonné
- `PUT /api/partner/subscribers/{id}` — modifier un abonné
- `DELETE /api/partner/subscribers/{id}` — supprimer un abonné
- `POST /api/partner/subscribers/{id}/resend-invitation` — renvoyer l'email d'invitation
- `GET /api/partner/subscribers/export` — export CSV
- `GET /api/partner/agreement` — voir l'accord commercial actif
- `GET /api/partner/activity` — timeline d'activité récente (appels, inscriptions)
- `GET /api/partner/stats` — stats détaillées (par mois, par abonné, conversion rates)
- `GET /api/partner/earnings/breakdown` — détail revenus par source (affilié vs abonnés vs par accord)

### 7. Dashboard Abonné (API)

L'abonné (qui est un utilisateur SOS-Expat classique) voit un **mini-dashboard** :

**Endpoints abonné** (auth requise, le user est lié à un subscriber) :
- `GET /api/subscriber/me` — son profil abonné, réduction active, lien affilié
- `GET /api/subscriber/activity` — son historique d'appels et réductions obtenues

### 8. Admin Console (API)

L'admin SOS-Expat gère tout :

**Endpoints admin** (auth requise, role=admin) :
- `GET /api/admin/partners` — liste de tous les partenaires avec stats
- `GET /api/admin/partners/{id}` — détail partenaire + accord + abonnés
- `POST /api/admin/partners/{id}/agreements` — créer un accord commercial
- `PUT /api/admin/partners/{id}/agreements/{agreementId}` — modifier un accord
- `GET /api/admin/partners/{id}/subscribers` — abonnés d'un partenaire
- `GET /api/admin/partners/{id}/activity` — activité d'un partenaire
- `GET /api/admin/stats` — stats globales du programme partenaire
- `POST /api/admin/partners/{id}/subscribers/import` — import admin pour un partenaire
- `DELETE /api/admin/partners/{id}/subscribers/bulk` — suppression en masse

### 9. Gestion d'expiration des accords

**Cron Laravel (quotidien à 3h UTC)** :
1. Chercher les accords avec `status=active` ET `expires_at < now()`
2. Passer leur statut à `expired`
3. Passer tous les subscribers liés à `status=expired`
4. Mettre à jour les docs Firestore `partner_subscribers` correspondants (`status=expired`)
5. Envoyer une notification au partenaire (email + Telegram si connecté)

### 10. Transitions de statut des abonnés

```
invited → registered (webhook subscriber-registered)
registered → active (après le 1er appel complété)
active → suspended (action admin ou partenaire)
active → expired (accord expiré)
suspended → active (réactivation admin ou partenaire)
```

### 11. Abonné multi-partenaire

Un même email/utilisateur PEUT être abonné de **plusieurs** partenaires (ex: un expat qui est client d'une agence immo ET assuré chez un assureur partenaire). La contrainte `UNIQUE(partner_firebase_id, email)` le permet.

Lors d'un appel, si le client est abonné de plusieurs partenaires, la **meilleure réduction** s'applique. Les commissions sont attribuées au partenaire dont le lien affilié a été utilisé (attribution classique).

### 12. Health check & monitoring

```
GET /api/health → { status: "ok", version: "1.0.0", database: "connected", redis: "connected", timestamp: "..." }
```

Endpoint public, pas d'auth, utilisé par le monitoring VPS.

### 13. Firestore credentials pour Docker

Le fichier `firebase-credentials.json` (service account) doit être :
1. Téléchargé depuis Firebase Console → Paramètres du projet → Comptes de service → Générer une nouvelle clé privée
2. Copié dans `/opt/partner-engine/firebase-credentials.json` sur le VPS
3. Monté dans Docker via volume : `- ./firebase-credentials.json:/app/firebase-credentials.json:ro`
4. **NE JAMAIS commiter dans Git** — ajouté au `.gitignore`

### 14. Endpoints admin manquants

En plus de ceux listés en section 8 :
- `GET /api/admin/partners/{id}/agreements/{agreementId}` — détail d'un accord
- `DELETE /api/admin/partners/{id}/agreements/{agreementId}` — supprimer un accord (soft delete si subscribers liés)
- `POST /api/admin/partners/{id}/agreements/{agreementId}/renew` — renouveler un accord (copie avec nouvelles dates)
- `PUT /api/admin/partners/{id}/subscribers/{subscriberId}` — modifier un abonné
- `POST /api/admin/partners/{id}/subscribers/{subscriberId}/suspend` — suspendre un abonné
- `POST /api/admin/partners/{id}/subscribers/{subscriberId}/reactivate` — réactiver un abonné
- `GET /api/admin/csv-imports` — historique des imports CSV
- `GET /api/admin/csv-imports/{id}` — détail d'un import (erreurs, lignes importées)
- `GET /api/admin/partners/{id}/email-templates` — templates email du partenaire
- `PUT /api/admin/partners/{id}/email-templates/{type}` — créer/modifier un template
- `DELETE /api/admin/partners/{id}/email-templates/{type}` — supprimer (revenir au template par défaut)
- `GET /api/admin/partners/{id}/audit-log` — historique des actions sur ce partenaire
- `GET /api/admin/audit-log` — audit log global (filtrable par acteur, action, ressource, période)

### 15. Frontend SOS-Expat — Pages à créer/modifier

Le Partner Engine est une **API** — il faut aussi créer les pages frontend dans SOS-Expat :

**Dashboard partenaire (existant, à enrichir)** :
- `sos/src/pages/Partner/PartnerDashboard.tsx` — ajouter un onglet "Mes abonnés" qui appelle l'API Partner Engine
- `sos/src/pages/Partner/PartnerSubscribers.tsx` — **NOUVEAU** : liste des abonnés, import CSV, stats par abonné
- `sos/src/pages/Partner/PartnerAgreement.tsx` — **NOUVEAU** : voir l'accord commercial actif, historique

**Mini-dashboard abonné** :
- `sos/src/pages/Subscriber/SubscriberDashboard.tsx` — **NOUVEAU** : réduction active, lien affilié, historique appels
- Accessible uniquement si le user est lié à un `partner_subscribers` doc dans Firestore

**Console admin (existant, à enrichir)** :
- `sos/src/pages/admin/Partners/AdminPartnerAgreements.tsx` — **NOUVEAU** : CRUD accords commerciaux
- `sos/src/pages/admin/Partners/AdminPartnerSubscribers.tsx` — **NOUVEAU** : vue abonnés d'un partenaire, import admin

**Route frontend** :
- `/partner/abonnes` → PartnerSubscribers (protected, role: partner)
- `/partner/accord` → PartnerAgreement (protected, role: partner)
- `/abonne/tableau-de-bord` → SubscriberDashboard (protected, user lié à un subscriber)

**Config frontend** :
- Variable d'environnement : `VITE_PARTNER_ENGINE_URL=https://partner-engine.life-expat.com`
- Service HTTP : `src/services/partnerEngineApi.ts` (axios/fetch avec Firebase token auto-injecté)

### 16. Firestore security rules pour `partner_subscribers`

Côté Firebase, ajouter les rules pour la nouvelle collection :
```
match /partner_subscribers/{docId} {
  // Lecture : le user lié (pour voir sa réduction) + admin + Cloud Functions (call pricing)
  allow read: if isAuthenticated() && (
    resource.data.firebaseUid == request.auth.uid || isAdmin()
  );
  // Écriture : uniquement via service account (Partner Engine écrit via Admin SDK)
  allow write: if false;  // Partner Engine utilise le service account (bypass rules)
}
```

### 17. Statut d'accord "paused" — comportement

Quand un accord est mis en pause (`status=paused`) :
- Les abonnés **gardent leur statut** actuel (pas de changement)
- Les **réductions cessent** de s'appliquer (Firebase vérifie `agreement.status == 'active'` avant d'appliquer)
- Les **commissions cessent** d'être créées (Partner Engine vérifie le statut de l'accord dans le webhook call-completed)
- Le partenaire peut **toujours voir** ses abonnés et stats dans son dashboard
- L'admin peut reprendre l'accord (`status=active`) à tout moment
- **Sync Firestore** : les docs `partner_subscribers` sont mis à jour avec un flag `agreementPaused: true`

### 18. Notifications Telegram pour les événements partenaires

Le Partner Engine envoie des webhooks au **Telegram Engine** existant pour notifier l'admin :

```
POST https://engine-telegram-sos-expat.life-expat.com/api/events/partner-subscriber-registered
POST https://engine-telegram-sos-expat.life-expat.com/api/events/partner-csv-imported
POST https://engine-telegram-sos-expat.life-expat.com/api/events/partner-agreement-expiring
POST https://engine-telegram-sos-expat.life-expat.com/api/events/partner-subscriber-first-call
```

Variable d'environnement :
```
TELEGRAM_ENGINE_URL=https://engine-telegram-sos-expat.life-expat.com
TELEGRAM_ENGINE_API_KEY=... (même clé que Firebase utilise)
```

Le Telegram Engine route ces événements vers le bot `@sos_expat_inbox_bot` (chat_id admin: `7560535072`).

### 19. Coexistence lien affilié classique et abonnés

Un partenaire a **2 canaux de conversion** qui fonctionnent en parallèle :

```
Canal 1 : LIEN AFFILIÉ (existant)
─────────────────────────────────
Le partenaire partage son lien : sos-expat.com/?ref=PARTNER-ABC
N'importe qui peut cliquer → appeler → le partenaire touche sa commission Firebase
Réduction : celle configurée dans partners/{id}.discountConfig (Firebase)
Commission : celle configurée dans partners/{id}.commissionConfig (Firebase)

Canal 2 : ABONNÉS NOMINATIFS (nouveau, Partner Engine)
──────────────────────────────────────────────────────
Le partenaire importe ses clients → ils reçoivent une invitation
L'abonné s'inscrit avec un inviteToken → son compte est lié au partenaire
Quand l'abonné appelle (avec ou sans le lien affilié) → le Partner Engine le détecte
Réduction : celle de l'accord commercial (PostgreSQL, peut être différente du lien affilié)
Commission : celle de l'accord commercial (PostgreSQL, peut être différente du lien affilié)
```

**Priorité en cas de conflit** (même client, même appel, lien affilié + abonné) :
1. Si l'abonné utilise le lien affilié du partenaire → **commission abonné** (accord commercial, plus avantageux en général)
2. Si l'abonné N'utilise PAS le lien affilié → **commission abonné quand même** (c'est le principe de la liste nominative)
3. Si un non-abonné utilise le lien affilié → **commission affilié classique** (système Firebase existant)
4. **Jamais de double commission** pour le même appel — le Partner Engine vérifie `call_session_id` unique

### 20. Inscription avec token d'invitation

Quand un abonné clique sur le lien d'invitation :
`https://www.sos-expat.com/inscription?partnerInviteToken=abc123`

Le frontend SOS-Expat :
1. Détecte le `partnerInviteToken` dans l'URL
2. Le stocke en localStorage/sessionStorage
3. Après inscription Firebase Auth, l'inclut dans le doc `users/{uid}` : `{ partnerInviteToken: "abc123" }`
4. Le trigger Firebase `onDocumentCreated("users/{userId}")` détecte le token et envoie le webhook au Partner Engine
5. Le Partner Engine met à jour le subscriber : `status=registered`, `firebase_uid=xxx`
6. Le Partner Engine met à jour le doc Firestore `partner_subscribers/{inviteToken}` : `firebaseUid=xxx`, `status=registered`

---

## SPECS TECHNIQUES

### Stack

```
- PHP 8.2+
- Laravel 12
- PostgreSQL 16
- Redis 7
- Docker Compose
- kreait/firebase-php          # Firebase Admin SDK (auth token verification + Firestore read/write)
- maatwebsite/laravel-excel    # Import/Export CSV/Excel
- predis/predis                # Redis client pour queues et cache
- Laravel Queues (Redis driver) pour les imports CSV et emails
- Laravel Scheduler pour les crons
- Laravel Rate Limiting (built-in) sur tous les endpoints
```

### Structure Docker Compose

```yaml
services:
  pe-app:        # Laravel app (PHP-FPM)
    volumes:
      - .:/app
      - ./firebase-credentials.json:/app/firebase-credentials.json:ro
  pe-queue:      # Queue worker (imports, emails) — même image que pe-app
    command: php artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
    volumes:
      - .:/app
      - ./firebase-credentials.json:/app/firebase-credentials.json:ro
  pe-scheduler:  # Laravel scheduler (cron) — même image que pe-app
    command: sh -c "while true; do php artisan schedule:run --verbose --no-interaction; sleep 60; done"
  pe-nginx:      # Reverse proxy → pe-app:9000
  pe-postgres:   # PostgreSQL 16
    volumes:
      - pe-pgdata:/var/lib/postgresql/data
  pe-redis:      # Redis 7

volumes:
  pe-pgdata:     # Persistance PostgreSQL
```

Ports :
- `pe-nginx` : exposé sur port `8082` (le Telegram Engine utilise `8081`)
- Nginx VPS fait le reverse proxy `partner-engine.life-expat.com` → `localhost:8082`
- `pe-postgres` : port `5433` exposé (5432 est peut-être déjà pris par le Telegram Engine)

### Tables PostgreSQL

```sql
-- Accords commerciaux (1 par partenaire, ou plusieurs si renouvellement)
CREATE TABLE agreements (
    id BIGSERIAL PRIMARY KEY,
    partner_firebase_id VARCHAR(128) NOT NULL,  -- UID Firebase du partenaire
    partner_name VARCHAR(255),                  -- dénormalisé pour affichage
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft|active|paused|expired

    discount_type VARCHAR(20) NOT NULL DEFAULT 'none', -- none|fixed|percent
    discount_value INTEGER NOT NULL DEFAULT 0,
    discount_max_cents INTEGER,
    discount_label VARCHAR(255),

    commission_per_call_lawyer INTEGER NOT NULL DEFAULT 500,
    commission_per_call_expat INTEGER NOT NULL DEFAULT 300,
    commission_type VARCHAR(20) NOT NULL DEFAULT 'fixed', -- fixed|percent
    commission_percent DECIMAL(5,2),

    max_subscribers INTEGER,
    max_calls_per_subscriber INTEGER,

    starts_at TIMESTAMP,
    expires_at TIMESTAMP,
    notes TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Abonnés partenaires
CREATE TABLE subscribers (
    id BIGSERIAL PRIMARY KEY,
    partner_firebase_id VARCHAR(128) NOT NULL,
    agreement_id BIGINT REFERENCES agreements(id) ON DELETE SET NULL,

    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    country VARCHAR(2),
    language VARCHAR(5) DEFAULT 'fr',

    firebase_uid VARCHAR(128),         -- null = pas encore inscrit
    affiliate_code VARCHAR(50),        -- code affilié SOS-Expat
    invite_token VARCHAR(64) UNIQUE,   -- token d'invitation unique

    status VARCHAR(20) NOT NULL DEFAULT 'invited', -- invited|registered|active|suspended|expired
    invited_at TIMESTAMP,
    registered_at TIMESTAMP,
    last_activity_at TIMESTAMP,

    total_calls INTEGER NOT NULL DEFAULT 0,
    total_spent_cents BIGINT NOT NULL DEFAULT 0,
    total_discount_cents BIGINT NOT NULL DEFAULT 0,

    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE(partner_firebase_id, email)  -- un abonné unique par partenaire
);

-- Activité des abonnés (log immuable)
CREATE TABLE subscriber_activities (
    id BIGSERIAL PRIMARY KEY,
    subscriber_id BIGINT NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
    partner_firebase_id VARCHAR(128) NOT NULL,

    type VARCHAR(50) NOT NULL,  -- call_completed|registered|invitation_sent|invitation_clicked|discount_applied

    -- Données spécifiques à l'événement
    call_session_id VARCHAR(128),
    provider_type VARCHAR(20),        -- lawyer|expat
    call_duration_seconds INTEGER,
    amount_paid_cents INTEGER,
    discount_applied_cents INTEGER,
    commission_earned_cents INTEGER,

    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Imports CSV (tracking des uploads)
CREATE TABLE csv_imports (
    id BIGSERIAL PRIMARY KEY,
    partner_firebase_id VARCHAR(128) NOT NULL,
    uploaded_by VARCHAR(128) NOT NULL,  -- UID de celui qui a uploadé (partner ou admin)

    filename VARCHAR(255),
    total_rows INTEGER NOT NULL DEFAULT 0,
    imported INTEGER NOT NULL DEFAULT 0,
    duplicates INTEGER NOT NULL DEFAULT 0,
    errors INTEGER NOT NULL DEFAULT 0,
    error_details JSONB DEFAULT '[]',

    status VARCHAR(20) NOT NULL DEFAULT 'processing', -- processing|completed|failed

    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Stats agrégées mensuelles (pour performance)
CREATE TABLE partner_monthly_stats (
    id BIGSERIAL PRIMARY KEY,
    partner_firebase_id VARCHAR(128) NOT NULL,
    month VARCHAR(7) NOT NULL,  -- "2026-03"

    total_subscribers INTEGER NOT NULL DEFAULT 0,
    new_subscribers INTEGER NOT NULL DEFAULT 0,
    active_subscribers INTEGER NOT NULL DEFAULT 0,
    total_calls INTEGER NOT NULL DEFAULT 0,
    total_revenue_cents BIGINT NOT NULL DEFAULT 0,
    total_commissions_cents BIGINT NOT NULL DEFAULT 0,
    total_discounts_cents BIGINT NOT NULL DEFAULT 0,
    conversion_rate DECIMAL(5,2) NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE(partner_firebase_id, month)
);

-- Templates email personnalisés par partenaire (optionnel, override du template par défaut)
CREATE TABLE email_templates (
    id BIGSERIAL PRIMARY KEY,
    partner_firebase_id VARCHAR(128) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'invitation', -- invitation | reminder | expiration
    subject VARCHAR(500) NOT NULL,
    body_html TEXT NOT NULL,                         -- HTML avec variables {firstName}, {partnerName}, {discountLabel}, {invitationLink}
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(partner_firebase_id, type)
);

-- Audit log (traçabilité actions sensibles)
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_firebase_id VARCHAR(128) NOT NULL, -- qui a fait l'action
    actor_role VARCHAR(20) NOT NULL,         -- admin | partner
    action VARCHAR(100) NOT NULL,            -- agreement.created | subscriber.imported | subscriber.suspended | ...
    resource_type VARCHAR(50),               -- agreement | subscriber | csv_import
    resource_id BIGINT,
    details JSONB DEFAULT '{}',              -- données avant/après, contexte
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- IMPORTANT : Ajouter soft deletes aux tables principales
-- Laravel gère ça via SoftDeletes trait + colonne deleted_at
ALTER TABLE agreements ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE subscribers ADD COLUMN deleted_at TIMESTAMP;

-- Index
CREATE INDEX idx_subscribers_partner ON subscribers(partner_firebase_id);
CREATE INDEX idx_subscribers_email ON subscribers(email);
CREATE INDEX idx_subscribers_firebase_uid ON subscribers(firebase_uid);
CREATE INDEX idx_subscribers_status ON subscribers(status);
CREATE INDEX idx_subscribers_invite_token ON subscribers(invite_token);
CREATE INDEX idx_activities_subscriber ON subscriber_activities(subscriber_id);
CREATE INDEX idx_activities_partner ON subscriber_activities(partner_firebase_id);
CREATE INDEX idx_activities_created ON subscriber_activities(created_at);
CREATE INDEX idx_agreements_partner ON agreements(partner_firebase_id);
CREATE INDEX idx_monthly_stats_partner ON partner_monthly_stats(partner_firebase_id);
CREATE INDEX idx_email_templates_partner ON email_templates(partner_firebase_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_firebase_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_subscribers_deleted ON subscribers(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_agreements_deleted ON agreements(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_agreements_expires ON agreements(expires_at) WHERE status = 'active' AND expires_at IS NOT NULL;
```

### Middleware d'authentification

```php
// Middleware FirebaseAuth
// 1. Extraire le Bearer token du header Authorization
// 2. Vérifier le token via Google API (firebase/php-jwt ou appel HTTP à https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo)
// 3. Extraire uid, email du token décodé
// 4. Pour les routes partner : vérifier que le user a un doc partners/{uid} actif dans Firestore
// 5. Pour les routes admin : vérifier que le user a role=admin dans users/{uid}
// 6. Pour les routes subscriber : vérifier que le user est lié à un subscriber via firebase_uid
```

### PROBLÈME CRITIQUE : Comment Firebase applique-t-il la réduction ?

Le pricing des appels est géré côté **Firebase** (pas côté Partner Engine). Firebase doit savoir en temps réel si un client est un abonné partenaire et quelle réduction appliquer.

**Solution : Sync bidirectionnelle via Firestore `partner_subscribers`**

Le Partner Engine **écrit** dans Firestore une collection miroir `partner_subscribers/{inviteToken}` contenant uniquement :
```
{
  partnerFirebaseId: string
  subscriberEmail: string
  firebaseUid: string | null       // rempli après inscription
  discountType: 'fixed' | 'percent' | 'none'
  discountValue: number            // cents ou pourcentage
  discountMaxCents: number | null
  discountLabel: string
  agreementId: number
  status: 'invited' | 'registered' | 'active' | 'expired'
  agreementPaused: boolean          // true si l'accord est en pause → réductions/commissions désactivées
  expiresAt: Timestamp | null
}
```

Firebase lit cette collection au moment du call setup pour appliquer la réduction. Le Partner Engine est la **source de vérité** (PostgreSQL), Firestore n'est qu'un **cache de lecture**.

**Quand le Partner Engine écrit dans Firestore :**
- À l'import CSV (création subscriber → écriture `partner_subscribers/{inviteToken}`)
- À l'inscription (mise à jour `firebaseUid` + `status=registered`)
- À l'expiration d'un accord (mise à jour `status=expired`)
- À la suppression d'un subscriber (suppression du doc Firestore)

**Package PHP requis** : `kreait/firebase-php` (déjà listé) — permet écriture Firestore depuis Laravel.

### Webhooks Firebase → Partner Engine

Côté Firebase, ajouter **2 Cloud Functions** :

```typescript
// 1. sos/firebase/functions/src/partner/triggers/forwardCallToPartnerEngine.ts
// Trigger: onDocumentUpdated("call_sessions/{sessionId}")
// Condition: isPaid changed to true AND client has a doc in partner_subscribers (via firebase_uid lookup)
// Action: POST to partner-engine.life-expat.com/api/webhooks/call-completed

// 2. sos/firebase/functions/src/partner/triggers/forwardRegistrationToPartnerEngine.ts
// Trigger: onDocumentCreated("users/{userId}")
// Condition: user doc has partnerInviteToken or partnerSubscriberId in metadata
// Action: POST to partner-engine.life-expat.com/api/webhooks/subscriber-registered
```

Secret Firebase : `PARTNER_ENGINE_URL` = `https://partner-engine.life-expat.com`
Secret Firebase : `PARTNER_ENGINE_API_KEY` = clé secrète partagée (header X-Engine-Secret)

### Webhook côté Partner Engine

```php
// POST /api/webhooks/call-completed
// Header: X-Engine-Secret: {shared_secret}
// Body: { callSessionId, clientUid, providerType, duration, amountPaidCents, discountAppliedCents }
//
// 1. Vérifier X-Engine-Secret
// 2. Chercher le subscriber par firebase_uid = clientUid
// 3. Si trouvé : mettre à jour activité, stats, créer subscriber_activity
// 4. Si pas trouvé : ignorer (le client n'est pas un abonné partenaire)
```

### Webhook d'inscription

Quand un abonné invité s'inscrit sur SOS-Expat, Firebase envoie :

```
POST /api/webhooks/subscriber-registered
{
  "firebaseUid": "xxx",
  "email": "jean@email.com",
  "inviteToken": "abc123"  // ou subscriberId
}
```

Le Partner Engine met à jour : `status=registered`, `firebase_uid=xxx`, `registered_at=now`

### Email d'invitation (template)

Utiliser Laravel Mail avec queue. Template par défaut :

```
Sujet : {partnerName} vous offre un accès privilégié à SOS-Expat

Bonjour {firstName},

{partnerName} a négocié un accès privilégié à SOS-Expat pour vous.

Vous bénéficiez de :
✅ {discountLabel} sur chaque consultation
✅ Accès à des avocats et experts expatriation dans 197 pays
✅ Disponible 24/7 en 9 langues

👉 Activez votre accès : {invitationLink}

Ce lien est personnel et réservé aux membres de {partnerName}.
```

### CI/CD (GitHub Actions)

Même pattern que le Telegram Engine :

```yaml
name: Deploy Partner Engine
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: 95.216.179.163
          username: root
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/partner-engine
            git pull origin main
            docker compose exec pe-app composer install --no-dev --optimize-autoloader
            docker compose exec pe-app php artisan migrate --force
            docker compose exec pe-app php artisan config:cache
            docker compose exec pe-app php artisan route:cache
            docker compose restart pe-queue
```

### Variables d'environnement (.env)

```env
APP_NAME="SOS-Expat Partner Engine"
APP_ENV=production
APP_KEY=base64:...
APP_URL=https://partner-engine.life-expat.com

DB_CONNECTION=pgsql
DB_HOST=pe-postgres
DB_PORT=5432
DB_DATABASE=partner_engine
DB_USERNAME=partner
DB_PASSWORD=...

REDIS_HOST=pe-redis
REDIS_PORT=6379

QUEUE_CONNECTION=redis

# Firebase
FIREBASE_PROJECT_ID=sos-urgently-ac307
FIREBASE_CREDENTIALS_PATH=/app/firebase-credentials.json

# Sécurité webhook
ENGINE_API_KEY=...  (clé secrète partagée avec Firebase)

# Email (Zoho SMTP — même que le reste de SOS-Expat)
MAIL_MAILER=smtp
MAIL_HOST=smtppro.zoho.eu
MAIL_PORT=465
MAIL_USERNAME=noreply@sos-expat.com
MAIL_PASSWORD=...
MAIL_ENCRYPTION=ssl
MAIL_FROM_ADDRESS=noreply@sos-expat.com
MAIL_FROM_NAME="SOS-Expat"

# Frontend URL (pour les liens d'invitation)
FRONTEND_URL=https://www.sos-expat.com

# Telegram Engine (notifications admin)
TELEGRAM_ENGINE_URL=https://engine-telegram-sos-expat.life-expat.com
TELEGRAM_ENGINE_API_KEY=...

# CORS
CORS_ALLOWED_ORIGINS=https://www.sos-expat.com,https://sos-expat.com
```

### Nginx VPS config

Ajouter dans `/etc/nginx/sites-enabled/partner-engine.conf` :

```nginx
server {
    listen 443 ssl http2;
    server_name partner-engine.life-expat.com;

    ssl_certificate /etc/letsencrypt/live/partner-engine.life-expat.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/partner-engine.life-expat.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8082;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## PRIORITÉS (MVP → Production)

### Phase 1 — Infrastructure (demi-journée)
1. Setup Laravel 12 + Docker Compose (6 containers)
2. Dockerfile (PHP 8.2-FPM + extensions pgsql, redis, gd, zip)
3. PostgreSQL 16 + Redis 7 configurés
4. Migrations (5 tables : agreements, subscribers, subscriber_activities, csv_imports, partner_monthly_stats)
5. `GET /api/health` — health check
6. Déploiement initial sur VPS Hetzner
7. Nginx VPS config + SSL Let's Encrypt
8. CI/CD GitHub Actions

### Phase 2 — Auth & Webhooks (demi-journée)
1. Middleware `FirebaseAuth` (vérification token + rôle)
2. Middleware `WebhookAuth` (vérification X-Engine-Secret)
3. `POST /api/webhooks/call-completed` — tracking appels
4. `POST /api/webhooks/subscriber-registered` — inscription abonné

### Phase 3 — CRUD Backend (1 jour)
1. CRUD Agreements (admin) — create, read, update, delete, renew
2. CRUD Subscribers (partner + admin) — create, read, update, delete, suspend, reactivate
3. Import CSV avec **queue worker** (job ProcessCsvImport)
4. Export CSV
5. Sync Firestore : écriture `partner_subscribers/{inviteToken}` à chaque create/update/delete subscriber
6. Validation stricte de tous les inputs

### Phase 4 — API Dashboard (1 jour)
1. `GET /api/partner/dashboard` — stats agrégées
2. `GET /api/partner/subscribers` — liste paginée avec filtres (status, search, tags)
3. `GET /api/partner/subscribers/{id}` — détail + activité
4. `GET /api/partner/activity` — timeline récente
5. `GET /api/partner/stats` — graphiques mensuels
6. `GET /api/partner/agreement` — accord actif
7. `GET /api/subscriber/me` — profil abonné
8. `GET /api/subscriber/activity` — historique appels/réductions

### Phase 5 — Admin API (1 jour)
1. Tous les endpoints admin (section 8 + section 14 du prompt)
2. Stats globales programme partenaire
3. Historique imports CSV

### Phase 6 — Emails & Crons (demi-journée)
1. Email d'invitation (job SendSubscriberInvitation, template Blade, queue)
2. `POST /api/partner/subscribers/{id}/resend-invitation`
3. Cron quotidien : expiration des accords (statut → expired, sync Firestore)
4. Cron quotidien : agrégation stats mensuelles (partner_monthly_stats)

### Phase 7 — Firebase side (à faire dans le projet SOS-Expat, pas ici)
1. Cloud Function `forwardCallToPartnerEngine` (trigger onCallCompleted)
2. Cloud Function `forwardRegistrationToPartnerEngine` (trigger onUserCreated)
3. Logique de réduction : lire `partner_subscribers` dans le call pricing
4. Frontend : page d'inscription avec détection `partnerInviteToken`
5. Frontend : `PartnerSubscribers.tsx` (nouvelle page dashboard partenaire)
6. Frontend : `PartnerAgreement.tsx` (nouvelle page dashboard partenaire)
7. Frontend : `SubscriberDashboard.tsx` (mini-dashboard abonné)
8. Frontend : console admin → onglets accords et abonnés par partenaire
9. Frontend : service HTTP `partnerEngineApi.ts`

---

## COMMANDES DE DÉMARRAGE

```bash
# Créer le repo
mkdir /c/Users/willi/Documents/Projets/VS_CODE/partner_engine_sos_expat
cd /c/Users/willi/Documents/Projets/VS_CODE/partner_engine_sos_expat

# Init Laravel
composer create-project laravel/laravel .

# Packages nécessaires
composer require kreait/firebase-php       # Firebase Admin SDK (auth + Firestore)
composer require maatwebsite/laravel-excel  # Import/Export CSV/Excel
composer require predis/predis             # Redis client

# Créer le repo GitHub
gh repo create will383842/partner-engine-sos-expat --private --source=. --push
```

## STRUCTURE LARAVEL ATTENDUE

```
app/
├── Http/
│   ├── Controllers/
│   │   ├── Partner/
│   │   │   ├── DashboardController.php
│   │   │   ├── SubscriberController.php
│   │   │   ├── AgreementController.php
│   │   │   ├── ActivityController.php
│   │   │   └── StatsController.php
│   │   ├── Subscriber/
│   │   │   └── SubscriberSelfController.php
│   │   ├── Admin/
│   │   │   ├── PartnerAdminController.php
│   │   │   ├── AgreementAdminController.php
│   │   │   ├── SubscriberAdminController.php
│   │   │   ├── CsvImportAdminController.php
│   │   │   └── StatsAdminController.php
│   │   └── Webhook/
│   │       └── WebhookController.php
│   ├── Middleware/
│   │   ├── FirebaseAuth.php         # Vérifie token Firebase + extrait uid/role
│   │   ├── RequirePartner.php       # Vérifie role=partner
│   │   ├── RequireAdmin.php         # Vérifie role=admin
│   │   ├── RequireSubscriber.php    # Vérifie user lié à un subscriber
│   │   └── WebhookSecret.php        # Vérifie X-Engine-Secret
│   └── Requests/
│       ├── CreateSubscriberRequest.php
│       ├── ImportCsvRequest.php
│       └── CreateAgreementRequest.php
├── Models/
│   ├── Agreement.php              # SoftDeletes, relations: subscribers, partner_monthly_stats
│   ├── Subscriber.php             # SoftDeletes, relations: agreement, activities
│   ├── SubscriberActivity.php     # Immutable log
│   ├── CsvImport.php
│   ├── PartnerMonthlyStat.php
│   ├── EmailTemplate.php
│   └── AuditLog.php
├── Jobs/
│   ├── ProcessCsvImport.php         # Import CSV en background (queue: default)
│   ├── SendSubscriberInvitation.php # Email d'invitation (queue: default)
│   ├── SyncSubscriberToFirestore.php # Écriture Firestore (queue: high)
│   └── ExpireAgreements.php         # Expiration des accords (queue: high)
├── Services/
│   ├── FirebaseService.php          # Auth token verification + Firestore read/write
│   ├── SubscriberService.php        # Business logic subscribers
│   ├── AgreementService.php         # Business logic accords
│   ├── StatsService.php             # Agrégation stats
│   └── AuditService.php             # Logging actions sensibles
├── Mail/
│   ├── SubscriberInvitation.php     # Template email d'invitation
│   └── AgreementExpiring.php        # Notification expiration accord
├── Console/
│   └── Commands/
│       ├── ExpireAgreementsCommand.php   # php artisan agreements:expire (quotidien 3h UTC)
│       ├── AggregateMonthlyStats.php     # php artisan stats:aggregate (quotidien 2h UTC)
│       └── CheckFailedJobs.php           # php artisan jobs:check-failed (quotidien, alerte si > 0)
└── Observers/
    ├── AgreementObserver.php        # Audit log auto sur create/update/delete
    └── SubscriberObserver.php       # Audit log auto + sync Firestore
```

---

## CONSOLE ADMIN — SPECS UX/UI DÉTAILLÉES

La console admin est l'outil le plus important. Elle doit être **intuitive, professionnelle, et scalable**. Le design doit suivre le système de design SOS-Expat existant (glassmorphism, dark mode support, Tailwind CSS).

**IMPORTANT** : La console admin est dans le frontend SOS-Expat (React), PAS dans le Partner Engine. Le Partner Engine fournit uniquement l'API. Les pages admin appellent l'API Partner Engine via `partnerEngineApi.ts`.

### Page 1 : Vue globale programme partenaire (`/admin/partners/programme`)

**Header** : Titre "Programme Partenaire" + badge avec nombre de partenaires actifs

**4 KPI cards en haut** (temps réel depuis `GET /api/admin/stats`) :
- Partenaires actifs (nombre + variation mensuelle)
- Abonnés totaux (tous partenaires confondus)
- Appels ce mois (via abonnés partenaires)
- Revenus générés ce mois (commissions totales)

**Graphique** : Évolution mensuelle des 3 métriques sur 12 mois (ligne + barres)

**Table "Top 10 partenaires"** : Nom, Abonnés, Appels ce mois, Revenus, Conversion rate — cliquable vers le détail

### Page 2 : Détail partenaire (`/admin/partners/{id}/subscribers`)

C'est la page la plus importante — l'admin y gère tout pour un partenaire spécifique.

**Header** : Logo/nom du partenaire + statut (badge vert/orange/rouge) + boutons actions (Suspendre, Modifier, Supprimer)

**5 onglets** :

**Onglet "Accord commercial"** :
- Formulaire éditable inline : discount_type, discount_value, commission rates, limites, dates, notes
- Historique des accords précédents (timeline)
- Bouton "Renouveler l'accord" (copie + nouvelles dates)
- Indicateurs visuels : jauges (subscribers utilisés / max), barre de progression (durée restante)

**Onglet "Abonnés"** :
- Barre d'actions : Bouton "Import CSV" + "Ajouter manuellement" + "Exporter CSV"
- Filtres : status (invited/registered/active/suspended/expired), recherche texte, tags
- Table paginée : Email, Nom, Statut (badge couleur), Inscrit le, Dernier appel, Total appels, Réduction utilisée
- Actions par ligne : Voir détail, Suspendre, Réactiver, Renvoyer invitation, Supprimer
- Sélection multiple + actions groupées (suspendre en masse, supprimer en masse, renvoyer invitations)
- **Import CSV** : Modal avec drag & drop, preview des 5 premières lignes, mapping colonnes, bouton "Importer"
- **Rapport d'import** : Après import, afficher succès/erreurs/doublons en vert/rouge/orange

**Onglet "Activité"** :
- Timeline chronologique des événements récents (appels, inscriptions, réductions appliquées)
- Filtres par type d'événement et période
- Chaque événement affiche : date, type (icône), abonné concerné, montant, détails

**Onglet "Statistiques"** :
- Période sélectionnable (7j, 30j, 6m, 12m, tout)
- Graphiques : appels/jour, inscriptions/jour, revenus/mois, taux de conversion
- Tableau : stats par abonné (top performers)

**Onglet "Configuration"** :
- Lien affilié du partenaire (copie en 1 clic)
- Code promo / QR code
- Template email personnalisé (si override)
- Webhooks configurés (URLs callback du partenaire, si applicable)

### Page 3 : Historique imports CSV (`/admin/partners/imports`)

- Table : Date, Partenaire, Fichier, Total lignes, Importés, Doublons, Erreurs, Statut
- Cliquable pour voir le détail des erreurs

### Composants UI réutilisables

- `<StatusBadge status="active" />` — vert pour active, orange pour invited, bleu pour registered, rouge pour suspended, gris pour expired
- `<KPICard title="" value="" change="" icon="" />` — carte stat avec icône et variation
- `<CsvImportModal />` — modal drag & drop + preview + mapping
- `<SubscriberActivityTimeline events={[]} />` — timeline verticale
- `<AgreementForm agreement={} onSave={} />` — formulaire accord commercial
- `<ConfirmDialog />` — confirmation destructive (suspend, delete)

### Design system

- **Dark mode** : supporté (Tailwind `dark:` classes)
- **Glassmorphism** : `bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20`
- **Couleur accent** : cyan-500 / blue-500 (cohérent avec la landing page partenaire)
- **Table** : alternance `hover:bg-gray-50 dark:hover:bg-white/5`, headers sticky
- **Formulaires** : inputs avec labels clairs, validation en temps réel, messages d'erreur inline
- **Responsive** : mobile-first, mais ces pages admin sont principalement desktop (min-width 1024px)
- **Loading states** : skeletons (pas de spinners plein écran)
- **Empty states** : illustrations + CTA ("Aucun abonné — Importez votre premier fichier CSV")
- **Toasts** : `react-hot-toast` pour feedback actions (succès, erreurs)

---

## SCALABILITÉ

### Base de données
- **Index composites** : tous les patterns de requête courants sont indexés
- **Partitioning** : si `subscriber_activities` dépasse 10M lignes, partitionner par mois (`PARTITION BY RANGE (created_at)`)
- **Connection pooling** : Laravel utilise les connexions persistantes PostgreSQL par défaut
- **Read replicas** : le VPS Hetzner supporte un second PostgreSQL en lecture si nécessaire

### Queue workers
- **Concurrency** : `pe-queue` peut être scalé à N workers via `docker compose up --scale pe-queue=3`
- **Priorités** : 2 queues — `high` (webhooks, sync Firestore) et `default` (imports CSV, emails)
- **Dead letter** : les jobs échoués 3x vont dans `failed_jobs` — alerter via cron quotidien
- **Horizon** (optionnel phase 2) : dashboard Laravel Horizon pour monitorer les queues

### Cache
- **Redis cache** : config partenaire cachée 5 min, stats cachées 1 min
- **Cache invalidation** : clé `partner:{id}:agreement` invalidée à chaque update
- **Rate limiting** : Redis-backed, distribué

### Monitoring
- **Health check** : `GET /api/health` vérifie DB + Redis + Firestore connectivity
- **Structured logs** : JSON format, parseable par Grafana/Loki si déployé plus tard
- **Error tracking** : Sentry PHP SDK (optionnel, à ajouter si budget)
- **Métriques** : endpoint `/api/metrics` (admin-only) retournant queue size, DB connections, cache hit rate

### Sécurité avancée
- **CSRF** : désactivé pour API (stateless, JWT-based)
- **CORS** : whitelisted origins uniquement
- **SQL injection** : Eloquent ORM (parameterized queries)
- **XSS** : pas de rendu HTML côté API (JSON only)
- **File upload** : validation MIME type, max 10MB, extension whitelist (.csv, .xlsx)
- **Secrets** : jamais en clair dans le code, toujours via `.env` ou Docker secrets
- **Audit log** : table `audit_logs` (optionnel phase 2) pour tracer toutes les actions admin sensibles

---

## IMPORTANT — RÈGLES À SUIVRE

1. **Toujours communiquer en français** avec l'utilisateur
2. **Pas de Firebase Functions** — tout dans Laravel (sauf les 2 webhooks triggers côté Firebase, à faire dans un second temps)
3. **PostgreSQL = source de vérité** — Firestore `partner_subscribers` est un **cache de lecture** synchronisé par le Partner Engine
4. **Écriture Firestore** autorisée pour 3 collections uniquement (via `kreait/firebase-php`) :
   - `partner_subscribers/{inviteToken}` — sync statut/réduction des abonnés
   - `partner_commissions/{id}` — créer les commissions issues des appels abonnés
   - `partners/{partnerId}` — mettre à jour `pendingBalance` et `totalEarned` (incrément atomique)
   - JAMAIS écrire dans `users`, `call_sessions`, ou toute autre collection
5. **Queue workers** pour tout ce qui est long (imports CSV, emails d'invitation, sync Firestore, agrégation stats)
6. **Docker Compose** obligatoire — même pattern que engine_telegram_sos_expat
7. **API RESTful** — JSON, pagination cursor-based (pas offset), filtres query params
8. **Tests** — au minimum les endpoints critiques (webhooks, import CSV, auth middleware)
9. **Pas d'over-engineering** — MVP d'abord, on itère ensuite
10. **Sécurité** — rate limiting sur tous les endpoints (60/min partner, 120/min admin, 10/min webhooks), validation stricte, CORS configuré
11. **Logs** — Laravel Log avec contexte structuré (partner_id, subscriber_id, agreement_id) pour debug production
12. **Idempotence** — les webhooks doivent être idempotents (même événement reçu 2x = même résultat). Utiliser `call_session_id` comme clé de déduplication.
13. **Soft deletes** — sur agreements et subscribers (ne jamais perdre l'historique d'activité)
14. **Timezone** — toutes les dates en UTC dans PostgreSQL, conversion côté frontend
