# CAHIER DES CHARGES COMPLET
## Backlink Engine — Moteur d'Acquisition de Backlinks
### Dossier: sos-expat-project/backlink-engine/ | URL: backlinks-sos-expat.com

---

## 1. VISION & OBJECTIFS

### 1.1 Objectif principal
Construire un **centralisateur** d'acquisition de backlinks capable de :
- Recevoir des prospects de **3 sources** : saisie manuelle, import CSV, et **outil de scraping externe** (via API)
- Dedupliquer automatiquement au niveau domaine (JAMAIS recontacter un domaine deja contacte)
- Pousser les contacts vers **MailWizz** (API directe) avec **tags automatiques** + lancement de campagne
- Categoriser automatiquement les reponses via IA (Claude)
- Suivre les prospects contactes par email ET par formulaire
- Verifier les backlinks obtenus (crawler hebdomadaire)
- Scorer la qualite des prospects

### 1.2 Architecture

```
┌──────────────────────┐
│  OUTIL SCRAPING      │   API REST
│  (projet separe,     │   POST /api/ingest
│   domaines/IPs       │ ──────────────────┐
│   differents)        │                   │
└──────────────────────┘                   │
                                           ▼
┌──────────────────────┐         ┌─────────────────────────┐         ┌─────────────────────────┐
│  SAISIE MANUELLE     │         │   BACKLINK ENGINE       │  API    │  MAILWIZZ + POWERMTA    │
│  (operateur)         │ ──────→ │   backlinks-sos-expat   │ ──────→ │  (deja installe,        │
│  - Ajout rapide URL  │         │   .com                  │         │   ses propres domaines  │
│  - Import CSV        │         │                         │ ←────── │   et IPs rotatives)     │
└──────────────────────┘         │  CENTRALISATEUR :       │ webhooks│                         │
                                 │  - Dedup domaine auto   │         │  - Envoi emails         │
                                 │  - Tags auto MailWizz   │         │  - Sequences auto       │
                                 │  - Pipeline + tracking  │         │  - Bounce/unsub         │
                                 │  - Scoring (APIs free)  │         │  - Deliverabilite       │
                                 │  - Categorisation IA    │         │                         │
                                 │  - Verif backlinks      │         │  ⚠️ Domaines/IPs       │
                                 │  - Suivi formulaires    │         │  SEPAREES de sos-expat  │
                                 │  - Reporting            │         │  = ZERO risque          │
                                 └─────────────────────────┘         └─────────────────────────┘
```

**3 sources d'entree → 1 seul centralisateur → 1 seule sortie (MailWizz)**

### 1.3 Contraintes absolues
- **ZERO cout** : aucun outil payant (pas Ahrefs, Hunter.io, SEMrush, etc.)
- **Centralisateur** : le Backlink Engine ne scrape PAS, il recoit des donnees de 3 sources
- **Projet separe** : sa propre base de donnees PostgreSQL, son propre backend
- **Connexion SOS-Expat** : via API REST, branchement ulterieur
- **MailWizz = integration directe** : le Backlink Engine pousse les contacts via l'API MailWizz
- **Tags automatiques** : chaque subscriber MailWizz recoit des tags (source, tier, langue, pays, score, campagne)
- **Opt-out / unsub** : gere par MailWizz (lien desabo dans chaque email)
- **Dedup au domaine** : un domaine deja contacte ne sera PLUS JAMAIS recontacte automatiquement

### 1.4 Approche par tiers (PAS 197 pays en meme temps)

| Tier | Pays | Langues | Timeline | % valeur backlinks |
|------|------|---------|----------|--------------------|
| **T1** | 15-20 pays (US, UK, FR, DE, ES, AU, BR, IN, NL, IT, MX, BE, CH, PT, IE, AR, CO) | FR, EN, ES, DE, PT | Mois 1-3 | ~80% |
| **T2** | 20-30 pays (RU, TR, PL, CZ, RO, UAE, SA, ZA, NG, KE, PH, MY, SG, CL, PE, MA, TN, EG, TH, ID, VN) | + RU, AR, ajout progressif | Mois 4-8 | ~15% |
| **T3** | 30-40 pays (reste Afrique, Amerique centrale, Caraibes, Europe Est, Asie centrale) | Existantes | Mois 9-12 | ~4% |
| **T4** | 80-100+ pays restants | Existantes + EN fallback | Opportuniste | ~1% |

**Regle** : on ne lance JAMAIS l'outreach dans un nouveau tier avant que le precedent soit stable.

---

## 2. STACK TECHNIQUE (100% GRATUIT)

### 2.1 Backend
- **Runtime** : Node.js 20+ (TypeScript)
- **Framework** : Fastify (API REST) ou Express
- **ORM** : Prisma (PostgreSQL)
- **Job Queue** : BullMQ + Redis (jobs asynchrones : verification backlinks, categorisation, reporting)
- **HTTP Client** : fetch natif Node 20+ (pour verification backlinks, scoring APIs)
- **HTML Parser** : cheerio (pour verification backlinks — parsing HTML leger, PAS de navigateur headless)
- **LLM** : Claude API (deja disponible) pour categorisation reponses + personnalisation

### 2.2 Base de donnees
- **PostgreSQL 16** (gratuit, open-source)
- **Redis** (pour BullMQ + cache)
- Hebergement : VPS existant ou Supabase free tier (500MB)

### 2.3 Frontend
- **React 18 + TypeScript + Vite + Tailwind**
- Dashboard unique pour piloter tout le systeme
- Pas de framework lourd — SPA simple

### 2.4 Integrations

```
BACKLINK ENGINE (ce projet)
    │
    ├── Claude API .............. categorisation reponses, personnalisation, detection langue
    ├── Open PageRank API ....... scoring gratuit
    ├── Moz Free API ........... DA gratuit (10K req/mois)
    ├── Google Safe Browsing .... detection sites malveillants
    │
    └── MAILWIZZ (API directe) :
         │
         ├── Backlink Engine → MailWizz :
         │     POST /api/lists/subscribers ....... creer un subscriber avec custom fields
         │     PUT  /api/lists/subscribers/:uid .. mettre a jour un subscriber
         │     POST /api/campaigns ............... creer/lancer une campagne
         │     GET  /api/lists/subscribers ........ verifier si subscriber existe
         │     DELETE /api/lists/subscribers/:uid . supprimer (unsub)
         │
         │     Custom fields envoyes par subscriber :
         │       - BLOG_NAME, BLOG_URL, COUNTRY, LANGUAGE
         │       - PERSONALIZED_LINE, RECENT_POST_TITLE
         │       - PROSPECT_ID, CAMPAIGN_REF
         │
         │     Tags appliques AUTOMATIQUEMENT :
         │
         │       Source (d'ou vient le prospect) :
         │       - source:manual          → saisi par l'ops
         │       - source:scraper         → recu de l'outil de scraping
         │       - source:csv_import      → importe via CSV
         │
         │       Tier & geographie :
         │       - tier:1, tier:2, tier:3, tier:4
         │       - lang:fr, lang:en, lang:de, lang:es, lang:pt, lang:ru, lang:ar, lang:zh, lang:hi
         │       - country:FR, country:US, country:DE, etc. (ISO 3166-1 alpha-2)
         │
         │       Qualite :
         │       - score:high             → score >= 70
         │       - score:medium           → score 40-69
         │       - score:low              → score < 40
         │       - da:high                → Moz DA >= 40
         │       - da:medium              → Moz DA 15-39
         │       - da:low                 → Moz DA < 15
         │
         │       Campagne :
         │       - campaign:{campaign_id} → ID de la campagne Backlink Engine
         │       - asset:{asset_slug}     → si outreach lie a un asset linkable
         │
         │       Lifecycle (mis a jour via webhook) :
         │       - status:contacted       → email envoye
         │       - status:opened          → email ouvert
         │       - status:replied         → a repondu
         │       - status:interested      → reponse positive (LLM)
         │       - status:won             → backlink obtenu
         │
         │       Recontact :
         │       - recontact:1, recontact:2, etc. → nombre de fois recontacte
         │
         └── MailWizz → Backlink Engine (webhooks) :
               POST /webhooks/mailwizz ......... evenement unifie
               {
                 event: 'sent' | 'opened' | 'bounced' | 'replied' | 'unsub' | 'complained',
                 subscriber_uid: string,
                 campaign_uid: string,
                 list_uid: string,
                 timestamp: string,
                 // Champs selon event :
                 bounce_type?: 'hard' | 'soft',
                 reply_text?: string
               }
```

**IMPORTANT** :
- Le Backlink Engine appelle **directement l'API REST de MailWizz** (pas d'intermediaire)
- MailWizz gere : envoi, sequences (autoresponders), deliverabilite, bounce, unsub
- PowerMTA est derriere MailWizz (transparent pour le Backlink Engine)
- Les domaines/IPs d'envoi sont ceux de MailWizz → **ZERO risque pour sos-expat.com**
- Les autoresponders MailWizz gerent la sequence J0 / J+3 / J+10 automatiquement

### 2.5 Pas de services payants — alternatives gratuites

| Besoin | Service payant evite | Alternative gratuite |
|--------|---------------------|---------------------|
| Decouverte prospects | SerpAPI ($50/mois) | **3 sources** : saisie manuelle + import CSV + outil scraping externe (API) |
| Decouverte emails | Hunter.io ($50/mois) | **Saisie manuelle** ou fourni par l'outil scraping externe |
| Metriques SEO (DA/DR) | Ahrefs ($99/mois) | **Moz Free API** (10K requetes/mois) + **Open PageRank API** (gratuit) |
| Monitoring backlinks | Ahrefs | **Crawler leger** (cheerio + fetch, verifie les pages WON chaque semaine) |
| Spam score | Moz ($99/mois) | **Google Safe Browsing API** (gratuit) + **Spamhaus DNSBL** (gratuit) |
| Detection langue | API payante | **franc** (npm, gratuit) ou **Claude API** (deja paye) |
| Categorisation reponses | Outil payant | **Claude API** (deja paye) |
| Envoi emails | SendGrid, Mailgun | **MailWizz + PowerMTA** (deja installe, API directe) |

---

## 3. SCHEMA BASE DE DONNEES (PostgreSQL)

### 3.1 Tables principales

```sql
-- ==========================================
-- PROSPECTS (niveau domaine)
-- ==========================================
CREATE TABLE prospects (
    id              SERIAL PRIMARY KEY,
    domain          VARCHAR(255) UNIQUE NOT NULL,
    -- Source d'ingestion
    source          VARCHAR(20) NOT NULL DEFAULT 'manual', -- 'manual', 'csv_import', 'scraper'
    -- Metadonnees
    language        VARCHAR(10),          -- 'fr', 'en', 'es', 'de', 'pt', 'ru', 'zh', 'hi', 'ar'
    country         VARCHAR(3),           -- ISO 3166-1 alpha-3
    tier            SMALLINT DEFAULT 1,   -- 1, 2, 3, 4
    -- Qualite (calculee automatiquement, GRATUIT)
    score           SMALLINT DEFAULT 0,   -- 0-100 (composite)
    moz_da          SMALLINT,             -- Domain Authority via Moz Free API
    open_pagerank   DECIMAL(3,1),         -- via Open PageRank API (gratuit)
    spam_score      SMALLINT DEFAULT 0,   -- 0-100 (calcule custom)
    has_real_traffic BOOLEAN DEFAULT FALSE,-- estime via analyse contenu
    is_pbn          BOOLEAN DEFAULT FALSE,-- detection PBN custom
    -- Voisinage de liens (POINT 15)
    link_neighborhood_score SMALLINT,     -- 0-100, analyse des liens sortants
    outbound_categories     JSONB,        -- {"tech": 5, "casino": 0, "adult": 0, ...}
    -- Contact alternatif
    contact_form_url TEXT,                -- URL du formulaire de contact (si pas d'email)
    -- Pipeline
    status          VARCHAR(30) NOT NULL DEFAULT 'NEW',
    -- NEW | ENRICHING | READY_TO_CONTACT | CONTACTED_EMAIL | CONTACTED_MANUAL
    -- FOLLOWUP_DUE | REPLIED | NEGOTIATING | WON | LINK_PENDING
    -- LINK_VERIFIED | LINK_LOST | RE_CONTACTED | LOST | DO_NOT_CONTACT
    -- Suivi
    first_contacted_at  TIMESTAMPTZ,
    last_contacted_at   TIMESTAMPTZ,
    next_followup_at    TIMESTAMPTZ,
    -- Timestamps
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    -- Indexes
    CONSTRAINT chk_status CHECK (status IN (
        'NEW','ENRICHING','READY_TO_CONTACT','CONTACTED_EMAIL','CONTACTED_MANUAL',
        'FOLLOWUP_DUE','REPLIED','NEGOTIATING','WON','LINK_PENDING',
        'LINK_VERIFIED','LINK_LOST','RE_CONTACTED','LOST','DO_NOT_CONTACT'
    ))
);

CREATE INDEX idx_prospects_status ON prospects(status);
CREATE INDEX idx_prospects_country ON prospects(country);
CREATE INDEX idx_prospects_language ON prospects(language);
CREATE INDEX idx_prospects_tier ON prospects(tier);
CREATE INDEX idx_prospects_score ON prospects(score DESC);
CREATE INDEX idx_prospects_next_followup ON prospects(next_followup_at) WHERE next_followup_at IS NOT NULL;

-- ==========================================
-- SOURCES URLs (pages d'articles reperees)
-- ==========================================
CREATE TABLE source_urls (
    id              SERIAL PRIMARY KEY,
    prospect_id     INTEGER NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    url             TEXT NOT NULL,
    url_normalized  TEXT NOT NULL,        -- sans UTM, sans #, slash final homogene
    canonical_url   TEXT,                 -- si detecte
    title           VARCHAR(500),
    meta_description TEXT,
    discovered_via  VARCHAR(30) DEFAULT 'manual', -- toujours 'manual' (pas de scraping)
    notes           TEXT,                 -- notes libres de l'operateur
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(url_normalized)
);

CREATE INDEX idx_source_urls_prospect ON source_urls(prospect_id);

-- ==========================================
-- CONTACTS (emails lies a un prospect)
-- ==========================================
CREATE TABLE contacts (
    id              SERIAL PRIMARY KEY,
    prospect_id     INTEGER NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    email_normalized VARCHAR(255) NOT NULL, -- lowercase, trim
    name            VARCHAR(255),
    role            VARCHAR(20) DEFAULT 'unknown', -- 'editor', 'author', 'owner', 'unknown'
    -- Statut email
    email_status    VARCHAR(20) DEFAULT 'unverified', -- 'unverified', 'valid', 'invalid', 'catch_all', 'bounce', 'unsub'
    -- Decouverte
    discovered_via  VARCHAR(30) DEFAULT 'manual', -- toujours 'manual' (saisie humaine)
    -- Conformite
    opted_out       BOOLEAN DEFAULT FALSE,
    opted_out_at    TIMESTAMPTZ,
    -- Timestamps
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(email_normalized)
);

CREATE INDEX idx_contacts_prospect ON contacts(prospect_id);
CREATE INDEX idx_contacts_email ON contacts(email_normalized);
CREATE INDEX idx_contacts_status ON contacts(email_status);

-- ==========================================
-- CAMPAGNES (sequences email via MailWizz)
-- ==========================================
CREATE TABLE campaigns (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    language        VARCHAR(10) NOT NULL,
    target_tier     SMALLINT,
    target_country  VARCHAR(3),
    -- Sequence
    sequence_config JSONB NOT NULL,
    -- [
    --   {"step": 1, "delay_days": 0, "subject": "...", "body_template": "...", "mailwizz_campaign_uid": "..."},
    --   {"step": 2, "delay_days": 3, "subject": "...", "body_template": "...", "mailwizz_campaign_uid": "..."},
    --   {"step": 3, "delay_days": 10, "subject": "...", "body_template": "...", "mailwizz_campaign_uid": "..."}
    -- ]
    -- Regles d'arret
    stop_on_reply   BOOLEAN DEFAULT TRUE,
    stop_on_unsub   BOOLEAN DEFAULT TRUE,
    stop_on_bounce  BOOLEAN DEFAULT TRUE,
    -- Stats
    total_enrolled  INTEGER DEFAULT 0,
    total_replied   INTEGER DEFAULT 0,
    total_won       INTEGER DEFAULT 0,
    -- Statut
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ENROLLMENTS (inscription d'un contact a une campagne)
-- ==========================================
CREATE TABLE enrollments (
    id              SERIAL PRIMARY KEY,
    contact_id      INTEGER NOT NULL REFERENCES contacts(id),
    campaign_id     INTEGER NOT NULL REFERENCES campaigns(id),
    prospect_id     INTEGER NOT NULL REFERENCES prospects(id),
    -- Progression
    current_step    SMALLINT DEFAULT 0,   -- 0 = pas encore envoye, 1 = J0 envoye, etc.
    -- MailWizz
    mailwizz_subscriber_uid VARCHAR(100),  -- UID du subscriber dans MailWizz
    mailwizz_list_uid       VARCHAR(100),  -- UID de la liste MailWizz
    campaign_ref            VARCHAR(100),  -- Reference unique pour matcher les webhooks
    -- Statut
    status          VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'completed', 'stopped_reply', 'stopped_bounce', 'stopped_unsub'
    stopped_reason  TEXT,
    -- Timestamps
    enrolled_at     TIMESTAMPTZ DEFAULT NOW(),
    last_sent_at    TIMESTAMPTZ,
    next_send_at    TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    UNIQUE(contact_id, campaign_id)
);

CREATE INDEX idx_enrollments_next_send ON enrollments(next_send_at) WHERE status = 'active';
CREATE INDEX idx_enrollments_prospect ON enrollments(prospect_id);

-- ==========================================
-- EVENEMENTS (timeline non supprimable)
-- ==========================================
CREATE TABLE events (
    id              SERIAL PRIMARY KEY,
    prospect_id     INTEGER NOT NULL REFERENCES prospects(id),
    contact_id      INTEGER REFERENCES contacts(id),
    enrollment_id   INTEGER REFERENCES enrollments(id),
    -- Evenement
    event_type      VARCHAR(30) NOT NULL,
    -- 'url_added', 'dedup_detected', 'email_discovered', 'email_verified',
    -- 'enrolled_campaign', 'email_sent', 'email_opened', 'email_clicked',
    -- 'reply_received', 'reply_categorized', 'bounce', 'unsub',
    -- 'contacted_form', 'status_changed', 'note_added',
    -- 'backlink_added', 'backlink_verified', 'backlink_lost',
    -- 'score_updated', 'enrichment_completed', 'neighborhood_analyzed'
    event_source    VARCHAR(20) NOT NULL, -- 'system', 'mailwizz', 'user', 'llm', 'crawler'
    user_id         INTEGER,              -- si action humaine
    -- Contenu
    data            JSONB,                -- contenu flexible selon le type
    -- ex: {"from_status": "NEW", "to_status": "CONTACTED_EMAIL"}
    -- ex: {"reply_text": "...", "llm_category": "INTERESTED", "confidence": 0.95}
    -- ex: {"backlink_url": "...", "anchor": "...", "is_dofollow": true}
    created_at      TIMESTAMPTZ DEFAULT NOW()
    -- PAS DE DELETE, PAS DE UPDATE — append-only
);

CREATE INDEX idx_events_prospect ON events(prospect_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_created ON events(created_at DESC);

-- ==========================================
-- BACKLINKS (liens obtenus)
-- ==========================================
CREATE TABLE backlinks (
    id              SERIAL PRIMARY KEY,
    prospect_id     INTEGER NOT NULL REFERENCES prospects(id),
    source_url_id   INTEGER REFERENCES source_urls(id),
    -- Le lien
    page_url        TEXT NOT NULL,         -- URL de la page qui contient le lien
    target_url      TEXT NOT NULL,         -- URL cible sur SOS-Expat (ou autre)
    anchor_text     VARCHAR(500),
    link_type       VARCHAR(20) DEFAULT 'dofollow', -- 'dofollow', 'nofollow', 'sponsored', 'ugc'
    -- Verification
    is_verified     BOOLEAN DEFAULT FALSE,
    last_verified_at TIMESTAMPTZ,
    is_live         BOOLEAN DEFAULT TRUE,  -- passe a false si le lien disparait
    lost_at         TIMESTAMPTZ,
    -- Widget / integration
    has_widget      BOOLEAN DEFAULT FALSE,
    has_badge       BOOLEAN DEFAULT FALSE,
    -- Timestamps
    first_detected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_backlinks_prospect ON backlinks(prospect_id);
CREATE INDEX idx_backlinks_live ON backlinks(is_live) WHERE is_live = TRUE;
CREATE INDEX idx_backlinks_type ON backlinks(link_type);

-- ==========================================
-- LINKABLE ASSETS (contenu "linkable" — POINT 10)
-- ==========================================
CREATE TABLE linkable_assets (
    id              SERIAL PRIMARY KEY,
    -- Contenu
    title           VARCHAR(500) NOT NULL,
    slug            VARCHAR(255) NOT NULL UNIQUE,
    asset_type      VARCHAR(30) NOT NULL,
    -- 'data_index'        = Index/classement (ex: "Expat Emergency Index 2026")
    -- 'interactive_tool'  = Outil interactif (ex: "Calculateur de risque")
    -- 'database'          = Base de donnees (ex: "Numeros d'urgence mondiaux")
    -- 'infographic'       = Infographie par pays
    -- 'guide'             = Guide long-form (3000+ mots)
    -- 'report'            = Rapport annuel avec donnees originales
    -- 'case_study'        = Etude de cas
    url             TEXT NOT NULL,         -- URL sur SOS-Expat
    description     TEXT,
    -- Multilingue
    available_languages JSONB DEFAULT '["fr","en"]',
    -- Tracking
    total_backlinks INTEGER DEFAULT 0,    -- combien de backlinks pointent vers cet asset
    total_mentions  INTEGER DEFAULT 0,    -- mentions sans lien (reclamation possible)
    -- Statut
    is_published    BOOLEAN DEFAULT FALSE,
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- OUTREACH TEMPLATES (templates d'email par langue/culture)
-- ==========================================
CREATE TABLE outreach_templates (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    language        VARCHAR(10) NOT NULL,
    purpose         VARCHAR(30) NOT NULL,
    -- 'initial_outreach', 'followup_1', 'followup_2', 'breakup',
    -- 'link_lost_recovery', 'form_contact', 'content_collaboration'
    -- Contenu
    subject         TEXT NOT NULL,
    body            TEXT NOT NULL,         -- supporte {{variables}}
    -- Variables disponibles:
    -- {{blogger_name}}, {{blog_name}}, {{blog_url}}, {{recent_post_title}},
    -- {{recent_post_url}}, {{personalized_line}}, {{country}}, {{asset_title}},
    -- {{asset_url}}, {{unsubscribe_link}}
    -- Adaptation culturelle
    formality_level VARCHAR(10) DEFAULT 'formal', -- 'formal', 'semi_formal', 'casual'
    cultural_notes  TEXT,                  -- ex: "Utiliser 'vous', jamais 'tu'"
    -- Performance
    times_used      INTEGER DEFAULT 0,
    reply_rate      DECIMAL(5,2),          -- % de reponses
    -- Statut
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- SUPPRESSION LIST (opt-out global)
-- ==========================================
CREATE TABLE suppression_list (
    id              SERIAL PRIMARY KEY,
    email_normalized VARCHAR(255) NOT NULL UNIQUE,
    reason          VARCHAR(30) NOT NULL,  -- 'unsub', 'bounce_hard', 'complaint', 'manual'
    source          VARCHAR(30),           -- 'mailwizz', 'user', 'system'
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suppression_email ON suppression_list(email_normalized);

-- ==========================================
-- USERS (operateurs du systeme)
-- ==========================================
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'ops', -- 'admin', 'ops', 'readonly'
    password_hash   VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. MODULES DU SYSTEME

### 4.1 MODULE : Ingestion de prospects (3 sources → 1 centralisateur)

Le Backlink Engine recoit des prospects de **3 sources**. Toutes passent par le meme pipeline de dedup/enrichissement/scoring.

```
SOURCE 1 : Saisie manuelle (ops dans le dashboard)
SOURCE 2 : Import CSV (ops uploade un fichier)
SOURCE 3 : Outil scraping externe (API POST /api/ingest)
                    │
                    ▼
            ┌── PIPELINE COMMUN ──┐
            │  1. Normalisation    │
            │  2. Dedup domaine    │
            │  3. Enrichissement   │
            │  4. Scoring          │
            │  5. Tags auto        │
            └──────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
  Si email present        Si formulaire uniquement
  → Push MailWizz         → Suivi manuel
  → Tags auto             → Relances manuelles
  → Sequence auto
```

#### 4.1.1 SOURCE 1 : Saisie manuelle (ops dans le dashboard)

L'operateur saisit tout d'un coup dans un seul formulaire :

```
┌─────────────────────────────────────────────────────┐
│  AJOUT RAPIDE                                        │
│                                                      │
│  URL *:          [ https://expat-blog.com/article  ] │
│  Email:          [ marie@expat-blog.com            ] │  ← si trouve
│  Nom contact:    [ Marie Dupont                     ] │
│  URL formulaire: [ https://expat-blog.com/contact  ] │  ← si pas d'email
│  Notes:          [ Blog actif, bon contenu          ] │
│                                                      │
│  (Langue et pays detectes auto par le TLD)           │
│                                                      │
│  ── APERCU DU SITE (fetch auto page Contact) ──────  │
│  Le systeme affiche le contenu de la page Contact    │
│  du domaine pour aider l'ops a trouver l'email       │
│  sans quitter le dashboard.                          │
│                                                      │
│           [ AJOUTER ]                                │
└─────────────────────────────────────────────────────┘
```

Le systeme :
1. **Normalise l'URL** (supprime UTM, www, trailing slash, force HTTPS)
2. **Extrait le domaine** : `expat-blog.com`
3. **Fetch apercu** : recupère la page Contact/About du domaine et l'affiche (aide l'ops a trouver l'email)
4. **Verifie la dedup** :
   - URL normalisee deja en base ? → REJET + affiche la fiche existante
   - Domaine deja en base ? → AJOUT de la source_url uniquement (pas de recontact si deja contacte)
5. **Si nouveau domaine** : cree le prospect + le contact (si email saisi)
6. **Detecte auto** langue (TLD) et pays (TLD)
7. **Lance enrichissement** : Open PageRank + Moz DA + Google Safe Browsing
8. **Tag auto** : `source:manual`

#### 4.1.2 SOURCE 2 : Import CSV (fichier ou multi-lignes)

L'operateur uploade un CSV avec colonnes URL + email + nom :

```csv
url;email;name;notes
https://blog1.com/article;marie@blog1.com;Marie;Blog actif
https://blog2.fr/expat;info@blog2.fr;;Formulaire aussi dispo
https://travel-blog.de/leben;;;Pas d'email trouvé
```

OU colle une liste simple (une URL par ligne, sans email) :

```
https://blog1.com/article
https://blog2.fr/expat-france
https://travel-blog.de/auswandern
```

Le systeme :
1. Parse chaque ligne (detecte auto si CSV avec separateur ou liste simple)
2. Normalise + dedup chaque URL
3. Affiche un rapport : X nouveaux / Y doublons / Z erreurs
4. L'operateur valide l'import
5. **Tag auto** : `source:csv_import`

#### 4.1.3 SOURCE 3 : Outil de scraping externe (API)

L'outil de scraping (projet separe, domaines/IPs differents) envoie des prospects via API :

```typescript
// POST /api/ingest (endpoint du Backlink Engine)
// Authentification : API key dans le header X-Api-Key
{
    prospects: [
        {
            url: "https://expat-blog.com/vivre-a-paris",
            email: "marie@expat-blog.com",      // optionnel
            name: "Marie Dupont",                // optionnel
            language: "fr",                      // optionnel
            country: "FR",                       // optionnel
            contact_form_url: "https://expat-blog.com/contact",  // optionnel
            meta: {                              // optionnel, donnees brutes du scraper
                title: "Blog Expat Paris",
                description: "Vivre à Paris en tant qu'expat",
                source_query: "blog expat france",  // la requete Google qui l'a trouve
            }
        },
        // ... jusqu'a 100 prospects par requete
    ]
}

// Reponse :
{
    total: 100,
    created: 67,           // nouveaux prospects crees
    duplicates: 28,        // domaines deja en base (pas de recontact)
    errors: 5,             // URLs invalides
    details: [
        { url: "...", status: "created", prospect_id: 1234 },
        { url: "...", status: "duplicate", existing_prospect_id: 567, existing_status: "CONTACTED_EMAIL" },
        { url: "...", status: "error", reason: "invalid_url" },
    ]
}
```

Le systeme applique **exactement le meme pipeline** que la saisie manuelle :
1. Normalise chaque URL
2. Dedup domaine (rejette si deja en base)
3. Cree prospect + contact (si email fourni)
4. Detecte langue/pays (si non fourni par le scraper)
5. Lance enrichissement auto
6. **Tag auto** : `source:scraper`

**Securite** : l'API /api/ingest est protegee par API key. Seul l'outil scraping la possede.

#### 4.1.4 Champs par prospect

| Champ | Obligatoire | Saisie manuelle | Import CSV | API scraper |
|-------|-------------|-----------------|------------|-------------|
| URL | Oui | Oui | Oui | Oui |
| Email | Non | Oui | Oui | Oui |
| Nom contact | Non | Oui | Oui | Oui |
| Langue | Non (auto TLD) | Oui | Non | Oui |
| Pays | Non (auto TLD) | Oui | Non | Oui |
| Tier | Non (auto pays) | Non | Non | Non |
| URL formulaire | Non | Oui | Non | Oui |
| Notes | Non | Oui | Oui | Non |
| Meta scraper | Non | Non | Non | Oui |

#### 4.1.5 Regles communes aux 3 sources

**Gate dans le pipeline :**
```
NEW → SI email saisi OU contact_form_url saisi
        → READY_TO_CONTACT
    → SINON
        → reste en NEW (l'ops doit trouver un moyen de contact)
```

**REGLE FONDAMENTALE : MailWizz uniquement si email**
```
Prospect a un email ?
  → OUI : peut etre envoye a MailWizz (cree subscriber + tags auto + lance autoresponder)
  → NON : PAS d'envoi a MailWizz. Contact uniquement via formulaire (suivi manuel)
```

On n'envoie JAMAIS un prospect sans email a MailWizz. C'est impossible techniquement (MailWizz a besoin d'un email pour creer un subscriber).

**Dedup identique** : que le prospect vienne du scraper ou de la saisie manuelle, le domaine est verifie de la meme facon. Un domaine deja en base ne sera PLUS JAMAIS ajoute comme nouveau prospect.

---

### 4.2 MODULE : Deduplication (repris du cahier original, ameliore)

#### 4.3.1 Normalisation URL

```typescript
function normalizeUrl(rawUrl: string): string {
    const url = new URL(rawUrl);
    // 1. Forcer HTTPS
    url.protocol = 'https:';
    // 2. Supprimer www.
    url.hostname = url.hostname.replace(/^www\./, '');
    // 3. Supprimer parametres UTM
    ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'].forEach(p =>
        url.searchParams.delete(p)
    );
    // 4. Supprimer fragment (#)
    url.hash = '';
    // 5. Supprimer trailing slash sauf racine
    let path = url.pathname.replace(/\/+$/, '') || '/';
    url.pathname = path;
    // 6. Lowercase
    return url.toString().toLowerCase();
}
```

#### 4.3.2 Regles anti-doublons

1. **URL normalisee** existe → rejet, lien vers fiche existante
2. **Canonical URL** (si renseignee manuellement ou detectee via fetch simple) existe → rejet
3. **Domaine deja en base** :
   - Si statut avance (CONTACTED+) → ajout source_url uniquement, PAS de recontact
   - Si statut NEW/ENRICHING → mise a jour metadonnees
4. **Email dans suppression_list** → DO_NOT_CONTACT automatique

---

### 4.3 MODULE : Enrichissement (semi-automatique)

L'enrichissement combine des **appels API gratuits** (automatiques) et des **informations saisies manuellement**.

#### 4.4.1 Enrichissement automatique (API gratuites, PAS de scraping)

Quand un prospect est cree, un job BullMQ lance :

```
1. Score qualite via APIs gratuites
   → Open PageRank API (gratuit, bulk lookup) → open_pagerank
   → Moz Free API (DA, 10K requetes/mois) → moz_da
   → Google Safe Browsing API → detection site malveillant

2. Detection langue automatique (si non saisie)
   → TLD (.fr → fr, .de → de, .co.uk → en, .com.br → pt)
   → Si .com/.org → franc (npm) sur le domaine ou Claude API

3. Detection pays automatique (si non saisi)
   → TLD (.fr → FR, .de → DE, .co.uk → GB)
   → Si .com/.org → reste vide, l'ops complete manuellement

4. Calcul score composite (section 9)
   → Combine PageRank + Moz DA + tier + voisinage (si renseigne)
```

#### 4.4.2 Enrichissement manuel (saisie par l'operateur)

L'operateur peut completer/corriger sur la fiche prospect :
- Email, nom du contact
- Langue et pays (si non detectes automatiquement)
- URL du formulaire de contact (si pas d'email)
- Notes libres
- Voisinage de liens (score manuel apres inspection du blog)
- Flag PBN (si l'ops detecte un reseau de blogs)

---

### 4.4 MODULE : Outreach via MailWizz (API directe)

#### 4.5.1 Architecture (integration directe MailWizz)

Le Backlink Engine appelle **directement l'API REST de MailWizz**. Pas d'intermediaire.

```
BACKLINK ENGINE                          MAILWIZZ + POWERMTA
┌────────────────┐                       ┌─────────────────────────┐
│                │  API REST MailWizz    │                         │
│  Prepare :     │ ───────────────────→  │  Recoit le subscriber   │
│  - subscriber  │  POST /subscribers    │  avec custom fields +   │
│  - custom fields│                      │  tags                   │
│  - tags        │                       │  L'autoresponder gere   │
│                │                       │  la sequence J0/J+3/J+10│
│                │                       │  PowerMTA envoie        │
│                │                       │                         │
│  Recoit :      │  POST /webhooks/      │  Pousse les evenements: │
│  - sent        │  mailwizz             │  sent, opened, bounced, │
│  - replied     │ ←───────────────────  │  replied, unsub,        │
│  - bounced     │                       │  complained             │
│  - unsub       │                       │                         │
└────────────────┘                       └─────────────────────────┘
```

**Pre-requis dans MailWizz :**
- 1 liste par langue (ex: `backlinks-fr`, `backlinks-en`, `backlinks-de`, etc.)
- Custom fields sur chaque liste : `BLOG_NAME`, `BLOG_URL`, `COUNTRY`, `PERSONALIZED_LINE`, `RECENT_POST_TITLE`, `PROSPECT_ID`, `CAMPAIGN_REF`
- 1 autoresponder par liste (sequence J0 / J+3 / J+10 avec les templates)
- Webhook configure pour pousser les evenements vers `backlinks-sos-expat.com/webhooks/mailwizz`

#### 4.5.2 Flux d'enrollment (Backlink Engine → MailWizz)

```typescript
async function enrollProspect(prospectId: number, campaignId: number) {
    const prospect = await db.prospects.findById(prospectId);
    const contact = await db.contacts.findBestForProspect(prospectId);
    const campaign = await db.campaigns.findById(campaignId);

    // 1. Verifier suppression list locale
    if (await isInSuppressionList(contact.email)) {
        await updateProspectStatus(prospectId, 'DO_NOT_CONTACT');
        return;
    }

    // 2. Verifier si le subscriber existe deja dans MailWizz
    const existingSubscriber = await mailwizzApi.searchSubscriber(
        campaign.mailwizz_list_uid, contact.email
    );
    if (existingSubscriber) {
        // Deja dans MailWizz → ne pas re-enroller
        await createEvent(prospectId, 'dedup_detected', 'system', {
            reason: 'subscriber_already_in_mailwizz',
            mailwizz_subscriber_uid: existingSubscriber.subscriber_uid,
        });
        return;
    }

    // 3. Generer ligne personnalisee via Claude API
    const personalizedLine = await generatePersonalizedLine(
        prospect.language, prospect.domain
    );

    // 4. Creer le subscriber dans MailWizz avec custom fields + tags
    const campaignRef = `be-${prospect.id}-${campaign.id}-${Date.now()}`;
    const subscriberResult = await mailwizzApi.createSubscriber({
        list_uid: campaign.mailwizz_list_uid,  // Liste par langue
        email: contact.email,
        fname: contact.name || '',
        // Custom fields
        BLOG_NAME: prospect.domain,
        BLOG_URL: `https://${prospect.domain}`,
        COUNTRY: prospect.country || '',
        PERSONALIZED_LINE: personalizedLine,
        RECENT_POST_TITLE: '',  // Rempli manuellement par l'ops si disponible
        PROSPECT_ID: String(prospect.id),
        CAMPAIGN_REF: campaignRef,
    });

    // 5. Ajouter les tags au subscriber
    await mailwizzApi.addTags(subscriberResult.subscriber_uid, [
        `tier:${prospect.tier}`,
        `lang:${prospect.language}`,
        `country:${prospect.country}`,
        `campaign:${campaign.id}`,
    ]);

    // 6. Creer enrollment en base locale
    await db.enrollments.create({
        contact_id: contact.id,
        campaign_id: campaign.id,
        prospect_id: prospectId,
        mailwizz_subscriber_uid: subscriberResult.subscriber_uid,
        mailwizz_list_uid: campaign.mailwizz_list_uid,
        campaign_ref: campaignRef,
        status: 'active',
        current_step: 0,
    });

    // 7. Mettre a jour statut prospect
    await updateProspectStatus(prospectId, 'CONTACTED_EMAIL');

    // 8. Logger evenement
    await createEvent(prospectId, 'enrolled_campaign', 'system', {
        campaign_id: campaign.id,
        campaign_ref: campaignRef,
        contact_email: contact.email,
        personalized_line: personalizedLine,
        mailwizz_subscriber_uid: subscriberResult.subscriber_uid,
    });
}
```

**Note** : L'autoresponder MailWizz gere automatiquement l'envoi de la sequence J0 / J+3 / J+10. Le Backlink Engine n'a pas besoin de re-appeler MailWizz pour les followups.

#### 4.5.3 Client API MailWizz

```typescript
// src/services/outreach/mailwizzClient.ts
class MailWizzClient {
    private baseUrl: string;  // URL de l'API MailWizz (ex: https://mail.mondomaine.com/api)
    private apiKey: string;   // Cle API MailWizz

    // Creer un subscriber dans une liste
    async createSubscriber(data: {
        list_uid: string;
        email: string;
        fname?: string;
        [customField: string]: string | undefined;
    }): Promise<{ subscriber_uid: string }> {
        const response = await fetch(
            `${this.baseUrl}/lists/${data.list_uid}/subscribers`,
            {
                method: 'POST',
                headers: {
                    'X-Api-Key': this.apiKey,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(data),
            }
        );
        const result = await response.json();
        return { subscriber_uid: result.data.record.subscriber_uid };
    }

    // Rechercher un subscriber par email
    async searchSubscriber(listUid: string, email: string): Promise<any | null> {
        const response = await fetch(
            `${this.baseUrl}/lists/${listUid}/subscribers/search-by-email?EMAIL=${encodeURIComponent(email)}`,
            { headers: { 'X-Api-Key': this.apiKey } }
        );
        const result = await response.json();
        return result.data?.record || null;
    }

    // Desabonner un subscriber
    async unsubscribe(listUid: string, subscriberUid: string): Promise<void> {
        await fetch(
            `${this.baseUrl}/lists/${listUid}/subscribers/${subscriberUid}`,
            {
                method: 'PUT',
                headers: {
                    'X-Api-Key': this.apiKey,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({ status: 'unsubscribed' }),
            }
        );
    }

    // Ajouter des tags a un subscriber (si extension tags installee)
    async addTags(subscriberUid: string, tags: string[]): Promise<void> {
        // Implementation depend de la version MailWizz / extensions installees
        // Alternative : utiliser un custom field TAG avec valeurs concatenees
    }
}
```

#### 4.5.4 Webhook handler (recoit les evenements de MailWizz)

```typescript
// POST /webhooks/mailwizz
async function handleMailWizzWebhook(event: MailWizzWebhookEvent) {
    // 1. Extraire le CAMPAIGN_REF du subscriber (custom field)
    const campaignRef = event.subscriber?.CAMPAIGN_REF;
    if (!campaignRef) return; // Subscriber pas gere par le Backlink Engine

    // 2. Trouver l'enrollment correspondant
    const enrollment = await db.enrollments.findByCampaignRef(campaignRef);
    if (!enrollment) return;

    const prospect = await db.prospects.findById(enrollment.prospect_id);

    // 3. Logger l'evenement
    await createEvent(prospect.id, `email_${event.event}`, 'mailwizz', {
        campaign_ref: campaignRef,
        subscriber_uid: event.subscriber_uid,
        ...event,
    });

    // 4. Actions selon le type
    switch (event.event) {
        case 'sent':
            await db.enrollments.update(enrollment.id, {
                current_step: enrollment.current_step + 1,
                last_sent_at: new Date(event.timestamp),
            });
            break;

        case 'bounced':
            await db.enrollments.update(enrollment.id, { status: 'stopped_bounce' });
            await db.contacts.update(enrollment.contact_id, {
                email_status: event.bounce_type === 'hard' ? 'invalid' : 'bounce',
            });
            if (event.bounce_type === 'hard') {
                await addToLocalSuppression(event.subscriber_email, 'bounce_hard');
            }
            break;

        case 'replied':
            // MailWizz ne pousse pas nativement les replies → 2 options :
            // Option A : IMAP monitor dans le Backlink Engine (scan inbox dediee)
            // Option B : Extension MailWizz qui detecte les replies
            await db.enrollments.update(enrollment.id, { status: 'stopped_reply' });
            // Categoriser la reponse via LLM (module 4.6)
            await categorizeReply(prospect.id, enrollment.id, event.reply_text);
            break;

        case 'unsub':
            await db.enrollments.update(enrollment.id, { status: 'stopped_unsub' });
            await addToLocalSuppression(event.subscriber_email, 'unsub');
            await updateProspectStatus(prospect.id, 'DO_NOT_CONTACT');
            break;

        case 'complained':
            await addToLocalSuppression(event.subscriber_email, 'complaint');
            await updateProspectStatus(prospect.id, 'DO_NOT_CONTACT');
            break;
    }
}
```

**Note sur les replies** : MailWizz ne detecte pas nativement les reponses. 2 solutions :
1. **IMAP monitor** : le Backlink Engine scanne une boite email dediee (ex: `outreach@mondomaine.com`) toutes les 5 minutes
2. **Extension MailWizz** : si une extension reply-tracking est installee, elle peut pousser un webhook

Dans les deux cas, le texte de la reponse arrive au module 4.6 pour categorisation par Claude.

#### 4.5.5 Sequences par culture (POINT 4 — adaptation regionale)

| Langue | Sequence | Horaire optimal | Notes culturelles |
|--------|----------|-----------------|-------------------|
| **FR** | J0 / J+3 / J+10 | Mar-Jeu, 9h-11h CET | Vouvoiement obligatoire. Pas en aout. |
| **EN** | J0 / J+3 / J+10 | Mar-Mer, 10h-13h local | Direct, value-prop en premier. Differencier US/UK. |
| **DE** | J0 / J+5 / J+14 | Mar-Jeu, 9h-10h CET | Tres formel (Herr/Frau). Titres academiques. |
| **ES** | J0 / J+3 / J+10 | Mar-Jeu, 10h-12h local | Chaleureux. Differencier Espagne/LATAM (usted vs vos). |
| **PT** | J0 / J+3 / J+10 | Mar-Mer, 10h-12h local | Informel au Bresil, formel au Portugal. 2 sets de templates. |
| **RU** | J0 / J+2 / J+7 | Mar-Jeu, 10h-12h MSK | Direct et formel. Telegram souvent plus efficace. |
| **AR** | J0 / J+4 / J+11 | Dim-Jeu, 10h-12h local | Salutations elaborees. Eviter vendredi-samedi. Pause Ramadan. |
| **ZH** | J0 / J+5 / J+14 | Mar-Jeu, 10h-11h CST | Formel, hierarchique. Email peu efficace → WeChat prefere. |
| **HI** | J0 / J+3 / J+10 | Mar-Jeu, 10h-12h IST | Ton chaleureux et personnel. |

---

### 4.5 MODULE : Categorisation automatique des reponses (POINT 7 — LLM)

#### 4.6.1 Architecture

```
Detection de reponse :
    → Option A : IMAP monitor dans le Backlink Engine (scan boite dediee toutes les 5 min)
    → Option B : Webhook MailWizz (si extension reply-tracking installee)

Dans les 2 cas :
    → Le Backlink Engine recoit le texte de la reponse
    → Envoie a Claude API pour categorisation
    → Applique l'action automatique
    → Logge l'evenement
```

#### 4.6.2 Prompt de categorisation (Claude API)

```typescript
const CATEGORIZATION_PROMPT = `
Tu es un assistant qui categorise les reponses a des emails d'outreach pour obtenir des backlinks.

Analyse cet email de reponse et classe-le dans UNE des categories suivantes :

1. INTERESTED — Le blogueur est interesse, veut discuter, demande des details
2. NOT_INTERESTED — Refus poli ou direct, pas interesse
3. ASKING_PRICE — Demande combien on paie, veut negocier un tarif
4. ASKING_QUESTIONS — Questions sur le partenariat, veut plus d'infos
5. ALREADY_LINKED — Dit qu'il a deja un lien ou article sur le sujet
6. OUT_OF_OFFICE — Reponse automatique d'absence
7. BOUNCE — Message d'erreur de livraison
8. UNSUBSCRIBE — Demande explicite de ne plus etre contacte
9. SPAM — Reponse non pertinente, spam
10. OTHER — Ne rentre dans aucune categorie

Reponds UNIQUEMENT en JSON :
{
    "category": "INTERESTED",
    "confidence": 0.95,
    "summary": "Le blogueur est interesse et demande un brief pour un article invite",
    "suggested_action": "Repondre avec un brief de contenu",
    "requires_human": false
}

Email de reponse a analyser :
---
{reply_content}
---
`;
```

#### 4.6.3 Actions automatiques par categorie

| Categorie | Action auto | Statut prospect | Intervention humaine |
|-----------|-------------|-----------------|---------------------|
| INTERESTED | Stopper sequence, notifier ops | → NEGOTIATING | Oui, repondre manuellement |
| NOT_INTERESTED | Stopper sequence | → LOST | Non |
| ASKING_PRICE | Stopper sequence, notifier ops | → NEGOTIATING | Oui, negocier |
| ASKING_QUESTIONS | Stopper sequence, notifier ops | → REPLIED | Oui, repondre |
| ALREADY_LINKED | Stopper sequence, verifier le lien | → verifier backlink | Semi-auto |
| OUT_OF_OFFICE | Reporter le prochain email de +7 jours | Pas de changement | Non |
| BOUNCE | Marquer email invalide | Rechercher autre email | Non |
| UNSUBSCRIBE | Stopper sequence, ajouter suppression list | → DO_NOT_CONTACT | Non |
| SPAM | Ignorer | Pas de changement | Non |
| OTHER | Notifier ops pour classification manuelle | Pas de changement | Oui |

#### 4.6.4 Securite : seuil de confiance

- Si `confidence >= 0.85` → action automatique
- Si `confidence < 0.85` → flag pour review humain
- Toutes les categorisations sont loggees dans `events` avec le texte original et la reponse LLM

---

### 4.6 MODULE : Verification des backlinks (crawler custom)

#### 4.7.1 Job hebdomadaire

```typescript
// Cron: chaque dimanche a 2h du matin
async function verifyAllBacklinks() {
    const backlinks = await db.backlinks.findAll({ where: { is_live: true } });

    for (const backlink of backlinks) {
        const result = await verifyBacklink(backlink);

        if (result.status === 'found') {
            await db.backlinks.update(backlink.id, {
                is_verified: true,
                last_verified_at: new Date(),
                // Mettre a jour si l'ancre ou le type a change
                anchor_text: result.anchor,
                link_type: result.relAttribute,
            });
        } else if (result.status === 'not_found') {
            await db.backlinks.update(backlink.id, {
                is_live: false,
                lost_at: new Date(),
            });
            // Changer statut prospect
            await updateProspectStatus(backlink.prospect_id, 'LINK_LOST');
            // Logger
            await createEvent(backlink.prospect_id, 'backlink_lost', 'crawler', {
                page_url: backlink.page_url,
                last_verified: backlink.last_verified_at,
            });
            // Ajouter tache: "Recontacter pour recuperer le lien"
        }
    }
}

async function verifyBacklink(backlink: Backlink): Promise<VerificationResult> {
    const html = await fetchPage(backlink.page_url);
    if (!html) return { status: 'page_unreachable' };

    const $ = cheerio.load(html);
    const links = $('a[href]');

    for (const link of links) {
        const href = $(link).attr('href');
        const rel = $(link).attr('rel') || '';
        const anchor = $(link).text().trim();

        // Matcher avec l'URL cible (fuzzy: avec/sans www, http/https, trailing slash)
        if (urlMatchesTarget(href, backlink.target_url)) {
            // Verifier que le lien n'est pas cache
            const style = $(link).attr('style') || '';
            const isHidden = style.includes('display:none') ||
                            style.includes('visibility:hidden') ||
                            style.includes('font-size:0');

            return {
                status: isHidden ? 'hidden' : 'found',
                anchor,
                relAttribute: rel.includes('nofollow') ? 'nofollow' :
                             rel.includes('sponsored') ? 'sponsored' :
                             rel.includes('ugc') ? 'ugc' : 'dofollow',
            };
        }
    }

    return { status: 'not_found' };
}
```

---

### 4.7 MODULE : Analyse du voisinage de liens (POINT 15)

#### 4.8.1 Objectif

Determiner si un blog est "propre" en analysant les sites vers lesquels il pointe. Si un blog lie massivement vers des casinos, pharma, ou adult → le backlink peut NUIRE au SEO de SOS-Expat.

#### 4.8.2 Implementation (assist automatique + validation ops)

Le systeme fait un **pre-analyse automatique** (fetch homepage + extraction liens sortants) et l'operateur **valide ou corrige**.

**Etape 1 — Analyse auto (a la creation du prospect) :**

```typescript
async function preAnalyzeNeighborhood(domain: string): Promise<PreAnalysisResult> {
    // 1. Fetch la homepage (fetch simple, PAS de navigateur headless)
    const html = await fetch(`https://${domain}`).then(r => r.text());
    const $ = cheerio.load(html);

    // 2. Extraire tous les liens sortants
    const outboundLinks: string[] = [];
    $('a[href^="http"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && !href.includes(domain)) {
            outboundLinks.push(new URL(href).hostname);
        }
    });

    // 3. Compter par domaine + categoriser via heuristiques
    const domainCounts = countByDomain(outboundLinks);
    const flags: Record<string, string[]> = { suspect: [], clean: [] };
    for (const d of Object.keys(domainCounts)) {
        if (/casino|poker|slots|bet|gambl/i.test(d)) flags.suspect.push(d);
        else if (/pharma|pills|viagra|cialis/i.test(d)) flags.suspect.push(d);
        else if (/porn|xxx|adult|nsfw/i.test(d)) flags.suspect.push(d);
        else if (/payday|loan|cash-advance/i.test(d)) flags.suspect.push(d);
        else flags.clean.push(d);
    }

    // 4. Google Safe Browsing API
    const safeBrowsingResult = await checkGoogleSafeBrowsing(domain);

    // 5. Calculer score suggere
    const toxicRatio = flags.suspect.length / Math.max(1, outboundLinks.length);
    const suggestedScore = Math.round(Math.max(0, 100 - (toxicRatio * 500)));

    return { outboundLinks, domainCounts, flags, safeBrowsingResult, suggestedScore };
}
```

**Etape 2 — Affichage dans la fiche prospect :**

```
┌─ VOISINAGE DE LIENS : expat-blog.com ──────────────────────┐
│                                                              │
│  Liens sortants detectes (homepage) : 23 liens, 15 domaines │
│                                                              │
│  ✅ lemonde.fr (3x)                                         │
│  ✅ booking.com (2x)                                        │
│  ✅ france-diplomatie.gouv.fr (1x)                          │
│  ✅ expatica.com (2x)                                       │
│  ⚠️ casino-bonus-online.com (1x) ← SUSPECT                 │
│  ... +10 autres (tous clean)                                │
│                                                              │
│  Google Safe Browsing : ✅ Aucune menace detectee            │
│                                                              │
│  Score suggere : 85/100                                      │
│  [ ✅ Accepter 85 ]  [ Modifier : [___] ]  [ Flag PBN ]    │
└──────────────────────────────────────────────────────────────┘
```

L'ops valide en 1 clic ou ajuste. 10 secondes au lieu de 5 minutes.

#### 4.8.3 Regles d'action

| Score voisinage (saisi par l'ops) | Action |
|-----------------------------------|--------|
| 80-100 | Excellent — priorite haute pour outreach |
| 50-79 | Acceptable — outreach normal |
| 30-49 | Douteux — review supplementaire avant outreach |
| 0-29 | Toxique — DO_NOT_CONTACT automatique, flag is_pbn |

**Si non renseigne** : le score voisinage est `null` et n'impacte pas le score composite. L'ops peut contacter le prospect sans avoir fait l'analyse voisinage (mais c'est recommande pour les T1).

---

### 4.8 MODULE : Contenu "Linkable" (POINT 10)

Ce module ne genere pas le contenu lui-meme (c'est fait cote SOS-Expat) mais **gere le tracking et l'outreach lie aux assets**.

#### 4.9.1 Assets a creer sur SOS-Expat (gratuit, juste du travail)

| # | Asset | Type | Pages cibles | Effort dev |
|---|-------|------|-------------|------------|
| 1 | **Index de Securite Expat par Pays** | data_index | /safety-index | 2-3 jours |
| 2 | **Base de Numeros d'Urgence Mondiaux** | database | /emergency-numbers/{country} | 2-3 jours |
| 3 | **Calculateur de Risque Expat** | interactive_tool | /risk-calculator | 3-5 jours |
| 4 | **Guide Urgence Expat par Pays** | guide | /guides/{country} | 1-2 jours/pays |
| 5 | **Infographies par Pays** | infographic | /infographics/{country} | 1 jour/pays |

#### 4.9.2 Outreach specifique aux assets

Quand un asset est publie, l'operateur :
1. Identifie manuellement les blogs pertinents (recherche Google manuelle)
2. Les ajoute dans le systeme avec le tag `asset:{asset_id}`
3. Utilise des templates d'outreach specifiques a l'asset :
   "J'ai vu votre article sur [sujet]. Nous avons publie [asset] qui pourrait etre utile pour vos lecteurs."
4. Enrole les prospects dans une campagne dediee a l'asset

#### 4.9.3 Reclamation de mentions

Processus **manuel** (l'ops recherche sur Google) :
1. L'ops recherche manuellement : `"SOS-Expat" -site:sos-expat.com`
2. Pour chaque resultat : l'ops verifie si un lien existe vers sos-expat.com
3. Si mention SANS lien → l'ops ajoute le prospect dans le systeme + outreach de reclamation :
   "Merci d'avoir mentionne SOS-Expat ! Pourriez-vous ajouter un lien vers [URL] ?"

---

### 4.9 MODULE : Suivi via formulaires web

Pour les prospects sans email mais avec un formulaire de contact :

1. L'operateur clique "Contacter via formulaire" sur la fiche prospect
2. Le systeme affiche :
   ```
   ┌─ CONTACT VIA FORMULAIRE ─────────────────────────────────┐
   │                                                           │
   │  Formulaire : https://expat-blog.com/contact             │
   │  [ Ouvrir dans un nouvel onglet ]                        │
   │                                                           │
   │  ── MESSAGE PRE-REMPLI (copier en 1 clic) ────────────── │
   │  Bonjour Marie,                                          │
   │                                                           │
   │  J'ai decouvert votre blog expat-blog.com et             │
   │  particulierement votre article sur la vie a Paris...     │
   │                                                           │
   │  [ Copier le message ]                                   │
   │                                                           │
   │  ── CONFIRMER L'ENVOI ─────────────────────────────────── │
   │  [ ✅ Envoye ]  [ ❌ Pas envoye (formulaire HS) ]       │
   └───────────────────────────────────────────────────────────┘
   ```
3. L'ops copie en 1 clic, colle dans le formulaire, envoie
4. Clique "Envoye" → evenement `contacted_form` loggue → statut = `CONTACTED_MANUAL`
5. **Relances automatiques** :
   - J+7 : le dashboard affiche "Relancer expat-blog.com (formulaire, 7 jours sans reponse)"
   - J+14 : 2eme relance suggeree
   - J+21 : derniere relance, ensuite → `LOST`
6. Si l'ops n'a pas confirme l'envoi apres 24h → rappel dans le dashboard

---

### 4.10 MODULE : Preview email avant envoi a MailWizz

Avant d'envoyer un prospect a MailWizz, l'ops VOIT l'email qui sera envoye :

```
┌─ PREVIEW AVANT ENVOI ─────────────────────────────────────────┐
│                                                                │
│  Prospect : expat-blog.com (Marie Dupont)                     │
│  Campagne : Outreach FR T1                                    │
│  Liste MailWizz : backlinks-fr                                │
│                                                                │
│  ── EMAIL J0 (envoye immediatement) ──────────────────────── │
│                                                                │
│  A : marie@expat-blog.com                                     │
│  Objet : Collaboration avec SOS-Expat — urgences expatries    │
│                                                                │
│  Bonjour Marie,                                                │
│                                                                │
│  J'ai decouvert votre blog expat-blog.com et j'ai             │
│  particulierement apprecie votre approche pratique sur         │
│  la vie a Paris pour les expatries.                            │
│  [ligne personnalisee par Claude]                              │
│                                                                │
│  Nous avons cree un Index de Securite Expat qui classe         │
│  les pays par niveau de risque pour les expatries...           │
│                                                                │
│  ── TAGS MAILWIZZ (automatiques) ───────────────────────────  │
│  source:manual  tier:1  lang:fr  country:FR                   │
│  score:high  da:medium  campaign:12                           │
│                                                                │
│  [ ✅ Envoyer a MailWizz ]  [ ✏️ Modifier ]  [ ❌ Annuler ]  │
└────────────────────────────────────────────────────────────────┘
```

L'ops voit exactement :
- Le texte final avec les variables remplacees
- Les tags qui seront appliques
- La liste MailWizz cible
- Il peut modifier avant d'envoyer ou annuler

---

### 4.11 MODULE : Recontact intelligent des LOST

Les prospects en statut `LOST` (refus, pas de reponse) peuvent etre recontactes apres un delai.

**Regle** : apres 6 mois, le systeme suggere de recontacter les LOST avec un bon score :

```
┌─ SUGGESTIONS RECONTACT ────────────────────────────────────────┐
│                                                                 │
│  38 prospects LOST depuis plus de 6 mois                       │
│  Filtre : score >= 60, Tier 1 uniquement                      │
│                                                                 │
│  expat-blog.com      DA:35  Score:72  LOST depuis 8 mois      │
│  travel-france.com   DA:42  Score:68  LOST depuis 7 mois      │
│  paris-expat.fr      DA:28  Score:65  LOST depuis 6 mois      │
│  ...                                                            │
│                                                                 │
│  [ Recontacter les selectionnes ]  → statut = RE_CONTACTED    │
│  [ Ignorer pour 6 mois de plus ]                               │
└─────────────────────────────────────────────────────────────────┘
```

**Conditions pour recontacter :**
- Statut = `LOST` (pas `DO_NOT_CONTACT`)
- Delai >= 6 mois depuis le dernier contact
- Score >= seuil configurable (default 50)
- L'ops valide manuellement (jamais automatique)

**Apres recontact :**
- Nouveau subscriber dans MailWizz (campagne differente, templates differents)
- Tag `recontact:1` (puis `recontact:2` si 2eme recontact)
- Statut → `RE_CONTACTED`
- Si 2eme recontact sans reponse → `LOST` definitif (pas de 3eme tentative)

---

### 4.12 MODULE : Tableau de bord quotidien

#### Vue "A faire aujourd'hui"

```
┌─────────────────────────────────────────────────┐
│  AUJOURD'HUI — 15 Jan 2026                      │
├─────────────────────────────────────────────────┤
│                                                  │
│  🔴 URGENT                                       │
│  ├── 12 replies non traitees                     │
│  ├── 3 bounces a corriger                        │
│  └── 2 backlinks perdus a recuperer              │
│                                                  │
│  🟡 A FAIRE                                      │
│  ├── 45 relances dues (J+3 ou J+10)             │
│  ├── 8 prospects sans email (trouver contact)     │
│  └── 15 formulaires a remplir                    │
│                                                  │
│  🟢 OPPORTUNITES                                 │
│  ├── 23 prospects chauds (score > 70, T1)        │
│  ├── 5 prospects score > 80 sans contact          │
│  └── 38 LOST recontactables (> 6 mois)           │
│                                                  │
│  📊 STATS DU JOUR                                │
│  ├── Prospects ajoutes: 47 (manual:20 csv:12 scraper:15) │
│  ├── Envoyes a MailWizz: 89                      │
│  ├── Replies recues: 14                          │
│  ├── Backlinks gagnes: 3                         │
│  ├── Formulaires contactes: 12                   │
│  └── Score moyen prospects: 62                   │
│                                                  │
└─────────────────────────────────────────────────┘
```

#### Vues supplementaires

1. **Pipeline** : vue Kanban des prospects par statut
2. **Par pays** : filtrage par pays/langue/tier
3. **Par source** : filtrage manual / csv_import / scraper — voir la productivite de chaque source
4. **Campagnes** : stats par campagne (enrolled, sent, replied, won)
5. **Backlinks** : liste de tous les liens obtenus, statut verification
6. **Assets** : performance de chaque contenu linkable
7. **Ingestion** : historique API scraper (requetes, volumes, doublons, erreurs)
8. **Recontact** : prospects LOST recontactables (> 6 mois, score > seuil)

---

## 5. JOBS CRON (BullMQ)

| Job | Frequence | Description |
|-----|-----------|-------------|
| `enrich:auto-score` | Continu | Enrichir les nouveaux prospects (Open PageRank, Moz DA, Safe Browsing) |
| `outreach:process-webhooks` | Temps reel | Recevoir et traiter les webhooks de MailWizz (event-driven) |
| `outreach:retry-failed` | Toutes les heures | Retenter les appels API vers MailWizz qui ont echoue |
| `outreach:imap-monitor` | Toutes les 5 min | Scanner boite email dediee pour detecter les replies |
| `verify:check-backlinks` | 1x/semaine | Verifier tous les backlinks WON (cheerio + fetch) |
| `verify:check-link-loss` | 1x/semaine | Detecter les backlinks disparus |
| `reporting:daily-stats` | 1x/jour a 23h59 | Generer stats quotidiennes |

**Note** : Pas de jobs de discovery/scraping. Toute la saisie de prospects est 100% manuelle.

---

## 6. API REST (pour connexion future avec SOS-Expat)

### 6.1 Endpoints principaux

```
AUTH
  POST   /api/auth/login
  POST   /api/auth/logout

PROSPECTS
  GET    /api/prospects                    — Liste avec filtres (status, country, language, tier, score)
  GET    /api/prospects/:id                — Fiche complete
  POST   /api/prospects                    — Ajout manuel (URL + email optionnel)
  PUT    /api/prospects/:id                — Mise a jour
  GET    /api/prospects/:id/timeline       — Journal d'evenements
  GET    /api/prospects/:id/backlinks      — Backlinks obtenus
  POST   /api/prospects/bulk               — Import CSV (URL;email;nom;notes)

INGESTION (pour l'outil scraping externe)
  POST   /api/ingest                       — Recoit jusqu'a 100 prospects/requete (API key obligatoire)
  GET    /api/ingest/stats                  — Stats d'ingestion (total recu, crees, doublons, par jour)

CONTACTS
  GET    /api/contacts                     — Liste
  POST   /api/contacts                     — Ajout
  PUT    /api/contacts/:id                 — Mise a jour
  DELETE /api/contacts/:id                 — Supprimer

CAMPAIGNS
  GET    /api/campaigns                    — Liste
  POST   /api/campaigns                    — Creation
  PUT    /api/campaigns/:id                — Mise a jour
  POST   /api/campaigns/:id/enroll         — Enroler un prospect
  GET    /api/campaigns/:id/stats          — Statistiques

BACKLINKS
  GET    /api/backlinks                    — Liste (avec filtres)
  POST   /api/backlinks                    — Ajout manuel
  PUT    /api/backlinks/:id                — Mise a jour
  POST   /api/backlinks/verify-all         — Lancer verification manuelle

LINKABLE ASSETS
  GET    /api/assets                        — Liste
  POST   /api/assets                        — Creer
  PUT    /api/assets/:id                    — Mise a jour
  GET    /api/assets/:id/backlinks          — Backlinks vers cet asset

DASHBOARD
  GET    /api/dashboard/today               — Vue "A faire aujourd'hui"
  GET    /api/dashboard/stats               — KPIs globaux
  GET    /api/dashboard/pipeline            — Counts par statut

SUPPRESSION
  GET    /api/suppression                   — Liste
  POST   /api/suppression                   — Ajouter (opt-out)
  DELETE /api/suppression/:id               — Retirer

TEMPLATES
  GET    /api/templates                     — Liste
  POST   /api/templates                     — Creer
  PUT    /api/templates/:id                 — Mise a jour

WEBHOOKS (recoit de MailWizz)
  POST   /webhooks/mailwizz                 — Evenements MailWizz (sent, opened, bounced, unsub, complained)

WEBHOOKS (envoie vers SOS-Expat, futur)
  POST   /api/webhooks/backlink-won         — Notifier SOS-Expat quand un backlink est gagne
  POST   /api/webhooks/prospect-status      — Notifier SOS-Expat d'un changement de statut
```

---

## 7. GESTION OPT-OUT (simple)

La conformite email (desabo, headers, adresse physique) est geree par **MailWizz** (lien desabo dans chaque email), PAS par le Backlink Engine.

Le Backlink Engine gere uniquement une **suppression list locale** :
- Si un webhook `unsub` ou `complained` arrive de MailWizz → email ajoute a `suppression_list`
- Avant chaque enrollment → check contre `suppression_list` + check si subscriber existe deja dans MailWizz
- Un email dans la suppression list ne sera PLUS JAMAIS contacte

C'est tout. Simple et efficace.

---

## 8. ECRANS A LIVRER (checklist dev)

| # | Ecran | Description | Priorite |
|---|-------|-------------|----------|
| 1 | **Login** | Auth simple (email/password) | P0 |
| 2 | **Dashboard** | Vue "A faire aujourd'hui" + KPIs | P0 |
| 3 | **Ajout rapide URL** | Champ unique, parsing auto URL+email, reset instant | P0 |
| 4 | **Liste prospects** | Tableau filtrable (status, pays, langue, tier, score) | P0 |
| 5 | **Fiche prospect** | Toutes les infos + timeline + backlinks + contacts | P0 |
| 6 | **Pipeline Kanban** | Vue drag-and-drop par statut | P1 |
| 7 | **Campagnes** | Liste + creation + stats + enrollment | P0 |
| 8 | **Templates** | Editeur de templates par langue | P0 |
| 9 | **Backlinks** | Liste + verification + filtres (dofollow, live, etc.) | P0 |
| 10 | **Import en masse** | Import CSV/multi-lignes + rapport dedup | P1 |
| 11 | **Linkable Assets** | Gestion des contenus linkables + tracking | P1 |
| 12 | **Replies** | Inbox des reponses categorisees par LLM | P0 |
| 13 | **Suppression List** | Gestion opt-out | P0 |
| 14 | **Parametres** | Config MailWizz API, IMAP, seuils de score | P1 |
| 15 | **Reporting** | Graphiques : backlinks/mois, pipeline funnel, reply rate | P1 |

---

## 9. SCORING COMPOSITE (calcule automatiquement, GRATUIT)

```typescript
function calculateProspectScore(prospect: Prospect): number {
    let score = 0;

    // 1. Autorite du domaine (40 points max)
    // Open PageRank (0-10) → normalise sur 40
    if (prospect.open_pagerank) {
        score += Math.min(40, prospect.open_pagerank * 4);
    }
    // Alternative: Moz DA (0-100) → normalise sur 40
    else if (prospect.moz_da) {
        score += Math.min(40, prospect.moz_da * 0.4);
    }

    // 2. Voisinage de liens (20 points max) — POINT 15
    if (prospect.link_neighborhood_score) {
        score += Math.min(20, prospect.link_neighborhood_score * 0.2);
    }

    // 3. Pertinence (15 points max)
    // Contenu lie a l'expatriation/voyage/urgence ?
    // Calcule lors de l'enrichissement via analyse de contenu
    if (prospect.relevance_score) {
        score += Math.min(15, prospect.relevance_score * 0.15);
    }

    // 4. Activite du blog (10 points max)
    // Articles recents ? Publication reguliere ?
    if (prospect.last_post_date) {
        const daysSincePost = daysBetween(prospect.last_post_date, new Date());
        if (daysSincePost < 30) score += 10;
        else if (daysSincePost < 90) score += 7;
        else if (daysSincePost < 180) score += 3;
        // > 180 jours → 0 points
    }

    // 5. Presence reseaux sociaux (5 points max)
    if (prospect.has_twitter) score += 1;
    if (prospect.has_linkedin) score += 1;
    if (prospect.has_instagram) score += 1;
    if (prospect.has_youtube) score += 1;
    if (prospect.has_facebook) score += 1;

    // 6. Facteur tier (10 points max)
    // Tier 1 = bonus, on veut prioriser les marches a forte valeur
    if (prospect.tier === 1) score += 10;
    else if (prospect.tier === 2) score += 5;
    else if (prospect.tier === 3) score += 2;

    return Math.min(100, Math.round(score));
}
```

---

## 10. CRITERES D'ACCEPTATION (GO / NO-GO)

### MVP (Mois 1-2)

| # | Critere | Description |
|---|---------|-------------|
| 1 | Ajout 1000 URLs sans doublons | Dedup fonctionne a 100% |
| 2 | Import en masse (CSV/multi-lignes) | Rapport dedup clair |
| 3 | Aucun recontact d'un domaine deja contacte | Anti-doublon au niveau domaine |
| 4 | Historique visible et complet | Timeline non supprimable |
| 5 | Integration MailWizz fonctionnelle | Push subscribers + tags + webhooks |
| 6 | Categorisation reponses par LLM | >85% de precision |
| 7 | Suivi formulaires de contact | Statut CONTACTED_MANUAL + relances |
| 8 | Vue "A faire aujourd'hui" exploitable | Dashboard operationnel |
| 9 | Backlinks tracables et verifiables | Crawler hebdomadaire fonctionne |
| 10 | Suppression list | Opt-out automatique via webhook MailWizz |
| 11 | API REST documentee | Pour connexion SOS-Expat future |

### V2 (Mois 3-4)

| # | Critere |
|---|---------|
| 1 | Reclamation de mentions (processus manuel assiste) |
| 2 | Templates adaptes par culture (9 sets) |
| 3 | Reporting avance (graphiques, export CSV) |
| 4 | Gestion des linkable assets |
| 5 | Kanban pipeline drag-and-drop |

---

## 11. STRUCTURE DU PROJET

Emplacement : `sos-expat-project/backlink-engine/` (a la racine du monorepo, 100% independant)
URL de production : `backlinks-sos-expat.com`

```
sos-expat-project/
├── sos/                            # App SOS-Expat (existante, on n'y touche PAS)
├── Outil-sos-expat/                # Outil provider IA (existant)
├── Dashboard-multiprestataire/     # Dashboard multi-provider (existant)
│
└── backlink-engine/                # ← NOUVEAU, 100% independant
    ├── README.md
    ├── docker-compose.yml          # PostgreSQL + Redis + app
    ├── package.json
    ├── tsconfig.json
    ├── .env.example                # Variables d'environnement (MailWizz API, Claude API, etc.)
    ├── prisma/
    │   ├── schema.prisma           # Schema DB Prisma
    │   └── migrations/
    ├── src/
    │   ├── index.ts                # Entry point Fastify
    │   ├── config/
    │   │   ├── database.ts
    │   │   ├── redis.ts
    │   │   ├── mailwizz.ts         # Config API MailWizz (URL, API key, list UIDs)
    │   │   └── constants.ts
    │   ├── api/
    │   │   ├── routes/
    │   │   │   ├── prospects.ts     # CRUD + ajout rapide + import CSV
    │   │   │   ├── ingest.ts        # POST /api/ingest (recoit de l'outil scraping)
    │   │   │   ├── contacts.ts
    │   │   │   ├── campaigns.ts
    │   │   │   ├── backlinks.ts
    │   │   │   ├── assets.ts
    │   │   │   ├── templates.ts
    │   │   │   ├── dashboard.ts
    │   │   │   ├── suppression.ts
    │   │   │   ├── webhooks.ts      # POST /webhooks/mailwizz
    │   │   │   └── auth.ts
    │   │   └── middleware/
    │   │       ├── auth.ts
    │   │       └── rateLimit.ts
    │   ├── services/
    │   │   ├── ingestion/
    │   │   │   ├── ingestService.ts      # Pipeline commun (dedup + enrichissement + tags)
    │   │   │   ├── csvParser.ts          # Parse CSV (URL;email;nom;notes)
    │   │   │   └── sitePreview.ts        # Fetch page Contact/About pour apercu
    │   │   ├── enrichment/
    │   │   │   ├── languageDetector.ts   # Detection langue via TLD + franc
    │   │   │   ├── countryDetector.ts    # Detection pays via TLD
    │   │   │   ├── neighborhoodPreAnalyzer.ts  # Fetch homepage + extraction liens sortants
    │   │   │   └── scoreCalculator.ts    # Score composite (PageRank + Moz + tier)
    │   │   ├── outreach/
    │   │   │   ├── mailwizzClient.ts     # Client API REST MailWizz (direct)
    │   │   │   ├── enrollmentManager.ts  # Logique d'enrollment prospect → MailWizz
    │   │   │   ├── webhookHandler.ts     # Traitement webhooks MailWizz
    │   │   │   ├── imapMonitor.ts        # Scan boite email dediee pour replies
    │   │   │   └── replyCategorizer.ts   # Categorise via Claude API
    │   │   ├── verification/
    │   │   │   ├── backlinkVerifier.ts   # Verifie backlinks (cheerio + fetch)
    │   │   │   └── linkLossDetector.ts   # Detecte backlinks disparus
    │   │   ├── dedup/
    │   │   │   └── deduplicator.ts       # Dedup URL + canonical + domaine
    │   │   ├── safety/
    │   │   │   └── domainChecker.ts      # Google Safe Browsing + Spamhaus + heuristiques
    │   │   └── suppression/
    │   │       └── suppressionManager.ts # Gestion opt-out locale
    │   ├── jobs/
    │   │   ├── queue.ts                  # BullMQ setup
    │   │   ├── workers/
    │   │   │   ├── enrichmentWorker.ts   # Score via APIs gratuites
    │   │   │   ├── outreachWorker.ts     # Retry MailWizz API calls
    │   │   │   ├── replyWorker.ts        # IMAP monitor + categorisation LLM
    │   │   │   ├── verificationWorker.ts # Verification backlinks hebdo
    │   │   │   └── reportingWorker.ts    # Stats quotidiennes
    │   │   └── schedulers/
    │   │       └── cronScheduler.ts
    │   ├── llm/
    │   │   ├── claudeClient.ts
    │   │   ├── prompts/
    │   │   │   ├── categorizeReply.ts
    │   │   │   ├── personalizeEmail.ts
    │   │   │   └── detectLanguage.ts
    │   │   └── types.ts
    │   └── utils/
    │       ├── urlNormalizer.ts
    │       └── logger.ts
    ├── frontend/
    │   ├── package.json
    │   ├── vite.config.ts
    │   ├── tailwind.config.js
    │   ├── src/
    │   │   ├── App.tsx
    │   │   ├── pages/
    │   │   │   ├── Dashboard.tsx
    │   │   │   ├── Prospects.tsx
    │   │   │   ├── ProspectDetail.tsx
    │   │   │   ├── QuickAdd.tsx          # Ajout rapide URL + email + apercu site
    │   │   │   ├── BulkImport.tsx        # Import CSV (URL;email;nom;notes)
    │   │   │   ├── EnrollPreview.tsx     # Preview email avant envoi a MailWizz
    │   │   │   ├── RecontactSuggestions.tsx  # Prospects LOST recontactables
    │   │   │   ├── Campaigns.tsx
    │   │   │   ├── Templates.tsx
    │   │   │   ├── Backlinks.tsx
    │   │   │   ├── Assets.tsx
    │   │   │   ├── Replies.tsx
    │   │   │   ├── Suppression.tsx
    │   │   │   ├── Settings.tsx
    │   │   │   └── Reports.tsx
    │   │   ├── components/
    │   │   │   ├── ProspectTimeline.tsx
    │   │   │   ├── PipelineKanban.tsx
    │   │   │   ├── ScoreBadge.tsx
    │   │   │   ├── DedupAlert.tsx        # Alerte dedup au niveau domaine
    │   │   │   └── StatsCards.tsx
    │   │   ├── hooks/
    │   │   ├── services/
    │   │   │   └── api.ts
    │   │   └── types/
    │   └── index.html
    └── data/
        └── toxic-domains/
            ├── casino.txt           # Liste de domaines casino connus
            ├── adult.txt
            ├── pharma.txt
            └── payday.txt
```

---

## 12. DEPLOIEMENT

**URL** : `backlinks-sos-expat.com`

### Option 1 : VPS unique (recommande pour demarrer)
- **VPS** : 4 CPU, 8GB RAM, 100GB SSD (Hetzner ~15EUR/mois, OVH ~20EUR/mois)
- **Docker Compose** : PostgreSQL + Redis + Backend Node + Frontend
- **Reverse proxy** : Caddy (HTTPS automatique, gratuit)
- **DNS** : `backlinks-sos-expat.com` → IP du VPS
- **MailWizz + PowerMTA** : deja installes sur un VPS separe (leur propre infra)

### Option 2 : Free tiers
- **Supabase** : PostgreSQL gratuit (500MB, suffisant pour demarrer)
- **Railway** ou **Render** : Backend gratuit (limites de RAM)
- **Cloudflare Pages** : Frontend sur `backlinks-sos-expat.com` (gratuit)
- **Upstash** : Redis gratuit (10K commandes/jour)

---

## 13. ESTIMATION EFFORT DE DEVELOPPEMENT

| Module | Complexite | Temps estime |
|--------|-----------|-------------|
| Schema DB + Prisma | Simple | 1-2 jours |
| API REST (CRUD prospects, contacts, etc.) | Moyen | 3-5 jours |
| Dedup + normalisation URL | Simple | 1 jour |
| Import en masse (CSV/multi-lignes) | Simple | 1 jour |
| Enrichissement auto (PageRank, Moz DA, Safe Browsing) | Simple | 1-2 jours |
| Detection langue/pays (TLD + franc) | Simple | 1 jour |
| Integration MailWizz (API directe) | Moyen | 2-3 jours |
| IMAP reply monitor | Moyen | 1-2 jours |
| Categorisation LLM (Claude) | Simple | 1-2 jours |
| Verification backlinks (cheerio + fetch) | Moyen | 2-3 jours |
| Jobs BullMQ (tous les workers) | Simple | 1-2 jours |
| Frontend Dashboard | Moyen | 5-7 jours |
| Frontend Prospects + Fiche + QuickAdd | Moyen | 3-5 jours |
| Frontend Campagnes + Templates | Moyen | 2-3 jours |
| Frontend Backlinks + Replies | Simple | 2-3 jours |
| Frontend Assets + Reports | Simple | 2-3 jours |
| Auth + Suppression list | Simple | 1-2 jours |
| **TOTAL MVP** | | **~28-42 jours** |

**Note** : L'effort est reduit par rapport a un systeme avec scraping car :
- Pas de Google scraping (Puppeteer, anti-detection, proxies, etc.)
- Pas de email discovery (scraping pages Contact/About)
- Pas de verification SMTP custom
- Pas de jobs de discovery automatique
- Integration MailWizz directe (pas d'intermediaire a developper)

---

## 14. RESUME

Ce systeme est :
- **Centralisateur** : recoit des prospects de 3 sources (manuel, CSV, outil scraping externe via API)
- **100% gratuit** en outils externes (APIs gratuites, LLM existant, MailWizz deja installe)
- **Standalone** : projet separe, connectable a SOS-Expat via API REST
- **Scalable** : PostgreSQL + BullMQ + architecture modulaire
- **Intelligent** : LLM pour categorisation + personnalisation, scoring automatique via APIs gratuites
- **MailWizz direct** : push subscribers avec custom fields + **tags automatiques complets** (source, tier, langue, pays, score, DA, campagne, lifecycle, recontact)
- **Anti-doublons** : dedup 3 niveaux (URL, canonical, domaine) — JAMAIS recontacter un domaine deja contacte, que le prospect vienne du scraper ou de la saisie manuelle
- **Suivi complet** : email (via MailWizz) ET formulaires (suivi manuel avec relances J+7/J+14)
- **Preview avant envoi** : l'ops voit l'email final avant de pousser a MailWizz
- **Recontact intelligent** : suggestions automatiques pour les LOST > 6 mois avec bon score
- **Voisinage assiste** : fetch auto des liens sortants de la homepage, validation en 1 clic par l'ops
- **Apercu site** : la page Contact du domaine s'affiche dans le dashboard (aide l'ops a trouver l'email)
- **Opt-out** : suppression list locale, synchronisee avec MailWizz
- **Pragmatique** : approche par tiers (80% de la valeur dans 20 pays)
- **Mesurable** : verification de backlinks, detection de perte, KPIs complets par source
- **ZERO risque pour sos-expat.com** : emails envoyes par les domaines/IPs de MailWizz/PowerMTA

Les 5 points prioritaires sont couverts :
- **Point 4** (Tiers pays) → Section 1.4 + sequences culturelles (4.5.5)
- **Point 7** (Categorisation IA) → Section 4.6 complete
- **Point 10** (Contenu linkable) → Section 4.9 + table linkable_assets
- **Point 12** (PostgreSQL) → Section 3 complete
- **Point 15** (Voisinage liens) → Section 4.8 complete (assist auto + validation ops)
