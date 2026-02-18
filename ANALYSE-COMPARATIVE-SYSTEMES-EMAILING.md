# 📧 Analyse Comparative - Systèmes d'Emailing SOS Expat

**Date** : 16 février 2026
**Auteur** : Claude Code
**Statut** : ✅ ANALYSE COMPLÈTE

---

## 📋 TABLE DES MATIÈRES

1. [Vue d'ensemble](#1-vue-densemble)
2. [Backup-Cold : L'ancien système](#2-backup-cold--lancien-système)
3. [Email-Engine : Le nouveau système](#3-email-engine--le-nouveau-système)
4. [Backlink-Engine : Le système de prospection](#4-backlink-engine--le-système-de-prospection)
5. [Comparaison détaillée](#5-comparaison-détaillée)
6. [Rôles et interactions](#6-rôles-et-interactions)
7. [Migration et coexistence](#7-migration-et-coexistence)
8. [Recommandations](#8-recommandations)

---

## 1. VUE D'ENSEMBLE

### 1.1 Les trois systèmes identifiés

| Système | Emplacement | Statut | Objectif principal |
|---------|-------------|--------|-------------------|
| **Backup-Cold** | `Outils d'emailing/backup-cold/` | 🟡 Backup/Archivé | Système legacy MailWizz + PowerMTA |
| **Email-Engine** | `../email-engine/` | 🟢 Production Active | Infrastructure PowerMTA + API moderne |
| **Backlink-Engine** | `backlink-engine/` | 🟢 Production Active | Prospection backlinks + outreach |

### 1.2 Écosystème complet

```
┌─────────────────────────────────────────────────────────────────┐
│                    ÉCOSYSTÈME EMAILING SOS EXPAT                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  BACKUP-COLD (Archive - Outils d'emailing/backup-cold/)        │
│  ────────────────────────────────────────────────────────────   │
│  • MailWizz 2.2.11 (plateforme marketing)                      │
│  • PowerMTA 5.0r9 (SMTP)                                        │
│  • Base MySQL (campagnes, templates, listes)                   │
│  • 77 campagnes autoresponder                                   │
│  • 106 templates HTML (transactional + campaigns)              │
│  • 2 IPs (Contabo - anciennes)                                 │
│  • État : BACKUP INACTIF (port 25 fermé)                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    [MIGRATION PARTIELLE]
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  EMAIL-ENGINE (Production - ../email-engine/)                   │
│  ────────────────────────────────────────────────────────────   │
│  • FastAPI + PostgreSQL 15 + Redis 7                           │
│  • PowerMTA (nouveau serveur)                                   │
│  • Architecture Enterprise Multi-Tenant                         │
│  • 2 Tenants : SOS-Expat + Ulixai                              │
│  • 100 IPs rotatifs (50 par tenant)                            │
│  • Warmup automatique 6 semaines                                │
│  • Monitoring : Prometheus + Grafana                            │
│  • Rôle : INFRASTRUCTURE EMAIL (IP management, DNS, warmup)     │
│  • État : PRODUCTION ACTIVE                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↑
                    [Utilise PowerMTA]
                              ↑
┌─────────────────────────────────────────────────────────────────┐
│  BACKLINK-ENGINE (Production - backlink-engine/)                │
│  ────────────────────────────────────────────────────────────   │
│  • TypeScript + Fastify + Prisma + PostgreSQL                  │
│  • Prospection backlinks automatisée                            │
│  • Email scraping + validation                                  │
│  • MailWizz client (injection prospects)                        │
│  • Templates intelligents (9 langues)                           │
│  • Rôle : PROSPECTION + OUTREACH BACKLINKS                      │
│  • État : PRODUCTION ACTIVE                                     │
└─────────────────────────────────────────────────────────────────┘

[Sources externes]
  ↓ Webhooks/API
┌─────────────────────────────────────────────────────────────────┐
│  • Scraper-Pro (Google Maps, LinkedIn, Facebook)               │
│  • Import CSV manuel                                            │
│  • API externe                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. BACKUP-COLD : L'ANCIEN SYSTÈME

### 2.1 Vue d'ensemble

**Localisation** : `Outils d'emailing/backup-cold/`
**Date backup** : 26-27 novembre 2025
**Statut** : 🟡 Archive/Backup (serveur Contabo éteint)

### 2.2 Architecture technique

#### Stack technologique
- **MailWizz 2.2.11** : Plateforme d'email marketing (PHP)
- **PowerMTA 5.0r9** : SMTP sending (C++)
- **MariaDB/MySQL** : Base de données
- **Nginx** : Web server
- **Rocky Linux 9** : OS

#### Composants
```
backup-cold/
├── mailwizz.zip (144 MB)           # Application complète
├── mailapp-reference.sql (1.2 MB)  # Base de données
├── rpm-install-pmta-5.zip (119 MB) # PowerMTA installeur
├── pmta-etc/                       # Config PowerMTA
│   └── config                      # SMTP listeners, virtual MTAs
├── pmta-dkim/                      # Clés DKIM
│   └── mail/ulixai-expat.com/dkim.pem
├── templates-import.sql (9 MB)     # 106 templates HTML
├── autoresponders-campaigns.sql    # 77 campagnes
├── autoresponders-import.sql       # Segments + triggers
├── fix-all-templates.sql          # Liaison templates/campagnes
└── ACTIVATION-FINALE.sh           # Script d'activation
```

### 2.3 Fonctionnalités

#### Email Marketing
- **77 Campagnes Autoresponder** :
  - Nurture Profile (7 langues)
  - Nurture Login Client (7 langues)
  - Nurture Login Provider (7 langues)
  - Nurture KYC (7 langues)
  - Nurture PayPal (7 langues)
  - Nurture Offline (7 langues)
  - Engagement sequences (multiple)

- **106 Templates HTML** :
  - 54 Transactional (TR_)
  - 46 Campaigns (CA_)
  - 6 Newsletter (NL_)
  - Cibles : Client (CLI) + Provider (PRO)

#### Gestion des IPs
- **2 IPs Contabo** :
  - `178.18.243.7` (mailul.ulixai-expat.com)
  - `84.247.168.78` (mailsos.ulixai-expat.com)
- Virtual MTAs PowerMTA (pmta-vmta0, pmta-vmta1)
- Warmup manuel via MailWizz

#### MailWizz Features
- Listes d'abonnés segmentées
- Bounce handling automatique
- Click/Open tracking
- A/B testing
- Cron jobs (send-campaigns, process-bounces, etc.)

### 2.4 Forces

✅ **Interface complète** : UI web pour gérer campagnes/templates
✅ **Campagnes configurées** : 77 autoresponders prêts à l'emploi
✅ **Templates nombreux** : 106 emails professionnels
✅ **Système éprouvé** : MailWizz + PowerMTA = combinaison standard
✅ **Segments avancés** : Segmentation par langue, statut, comportement

### 2.5 Faiblesses

❌ **Architecture monolithique** : MailWizz est une app PHP lourde
❌ **Pas de multi-tenant natif** : Un seul client par instance
❌ **Scalabilité limitée** : Difficile de gérer 100+ IPs
❌ **Warmup manuel** : Pas d'automatisation intelligente
❌ **Pas d'API moderne** : API REST basique de MailWizz
❌ **Monitoring basique** : Pas de Prometheus/Grafana
❌ **État actuel** : Serveur éteint, port 25 fermé

---

## 3. EMAIL-ENGINE : LE NOUVEAU SYSTÈME

### 3.1 Vue d'ensemble

**Localisation** : `../email-engine/`
**Création** : Février 2026
**Statut** : 🟢 Production Active

### 3.2 Architecture technique

#### Stack technologique
- **FastAPI** : API REST moderne (Python 3.11+)
- **PostgreSQL 15** : Base de données principale
- **Redis 7** : Rate limiting + caching
- **PowerMTA** : SMTP sending (partagé)
- **Alembic** : Migrations de base de données
- **APScheduler** : Jobs asynchrones
- **Prometheus + Grafana** : Monitoring
- **Nginx** : Reverse proxy + SSL

#### Architecture Clean
```
email-engine/
├── app/                            # API v1 (Legacy)
│   ├── api/routes/                 # IPs, domains, warmup, health
│   ├── services/                   # Business logic
│   ├── scheduler/                  # Background jobs
│   └── models.py                   # SQLAlchemy models
│
├── src/                            # Clean Architecture (NEW)
│   ├── domain/                     # Entities, Value Objects
│   │   ├── entities/               # Contact, Campaign
│   │   ├── value_objects/          # Email, Language, TagSlug
│   │   ├── services/               # TemplateSelector, ContactValidator
│   │   └── repositories/           # Interfaces
│   │
│   ├── application/                # Use Cases
│   │   └── use_cases/              # IngestContactsUseCase
│   │
│   ├── infrastructure/             # Implementations
│   │   ├── repositories/           # SQLAlchemy repos
│   │   ├── external/               # MailWizz, PowerMTA
│   │   └── jobs/                   # Celery tasks
│   │
│   └── presentation/               # API v2
│       └── api/                    # Contacts, Templates endpoints
│
├── alembic/                        # Database migrations
│   └── versions/
│       ├── 001_initial.py          # IPs, domains, warmup
│       ├── 002_add_auth_and_audit.py  # Auth + RBAC
│       └── 003_enterprise_multi_tenant.py  # 9 tables enterprise
│
├── monitoring/                     # Prometheus + Grafana
│   ├── docker-compose.yml
│   ├── prometheus.yml
│   ├── grafana/dashboards/
│   └── alertmanager/
│
├── deploy/                         # Production deployment
│   ├── systemd/email-engine.service
│   ├── nginx/email-engine.conf
│   └── install.sh
│
└── docs/                           # Documentation complète
```

### 3.3 Base de données (11 tables principales)

#### Tables Core
1. **users** : Authentification JWT + RBAC
2. **audit_logs** : Audit trail (compliance)
3. **ips** : 100 IPs rotatifs avec tenant_id
4. **domains** : 100 domaines avec tenant_id
5. **warmup_plans** : Plans de warmup 6 semaines
6. **blacklist_checks** : Vérifications 9 DNS blacklists

#### Tables Enterprise (nouvelles)
7. **tenants** : SOS-Expat, Ulixai (isolation complète)
8. **data_sources** : Scraper-Pro, Backlink, CSV, API
9. **contacts** : Contacts multi-sources avec tags
10. **campaigns** : Campagnes par source + tenant
11. **email_templates** : Templates intelligents (langue + catégorie)
12. **tags** : Hiérarchie TYPE/SECTOR/QUALITY/GEOGRAPHY
13. **contact_tags** : Many-to-many contacts ↔ tags
14. **contact_events** : Timeline (IMPORTED, VALIDATED, SENT, etc.)
15. **mailwizz_instances** : Configuration multi-instance

### 3.4 Fonctionnalités

#### 🎯 Gestion IP Enterprise
- **100 IPs rotatifs** (50 SOS-Expat + 50 Ulixai)
- **State Machine** : ACTIVE → RETIRING → RESTING → WARMING → ACTIVE
- **Warmup 6 semaines** : Quotas progressifs (100→50K emails/jour)
- **Safety checks** : Bounce rate > 5% = quarantine
- **Auto-rotation mensuelle** : Prévention burnout

#### 🔍 Monitoring & Alerting
- **9 DNS Blacklists** : Vérification toutes les 4h
- **Prometheus metrics** : 13 gauges (IP status, queue size, etc.)
- **Grafana dashboards** : Visualisation temps réel
- **Telegram alerts** : Alertes critiques instantanées
- **Health checks** : PowerMTA, disk, RAM (5 min)

#### 🔐 Security
- **JWT Authentication** : Access + refresh tokens
- **RBAC** : Admin / User roles
- **API Key rotation** : Support multi-clés
- **Audit logging** : Toutes actions tracées (compliance)
- **Rate limiting** : Redis-based (100 req/min)

#### 🚀 API REST
- `/api/v1/ips` : CRUD IPs
- `/api/v1/domains` : CRUD domains
- `/api/v1/warmup/*` : Warmup management
- `/api/v1/blacklists/*` : Blacklist checks
- `/api/v1/webhooks/pmta-bounce` : Bounce receiver
- `/api/v2/contacts` : Multi-source ingestion
- `/api/v2/templates` : Template management

#### ⚙️ Scheduled Jobs
| Job | Fréquence | Description |
|-----|-----------|-------------|
| Health Check | 5 min | PowerMTA, disk, RAM |
| Blacklist Check | 4h | 9 DNS blacklists |
| Warmup Daily | 00:00 UTC | Phase advancement |
| **Sync Warmup Quotas** | 1h | Sync to MailWizz |
| Monthly Rotation | 1st 03:00 UTC | IP rotation |
| DNS Validation | 06:00 UTC | SPF/DKIM/DMARC/PTR |
| Metrics Update | 1 min | Prometheus |

### 3.5 Architecture Multi-Tenant

#### 2 Tenants isolés
```sql
-- Tenant SOS-Expat
{
  "id": 1,
  "name": "SOS-Expat",
  "slug": "sos-expat",
  "mailwizz_instances": [
    {
      "api_url": "https://mail.sos-expat.com/api",
      "default_list_uid": "ab12cd34"
    }
  ],
  "ip_pool": ["IP_1", "IP_2", ..., "IP_50"],
  "domain_pool": ["domain1.sos-expat.com", ...]
}

-- Tenant Ulixai
{
  "id": 2,
  "name": "Ulixai",
  "slug": "ulixai",
  "mailwizz_instances": [
    {
      "api_url": "https://mail.ulixai-expat.com/api",
      "default_list_uid": "xy56zw78"
    }
  ],
  "ip_pool": ["IP_51", "IP_52", ..., "IP_100"],
  "domain_pool": ["domain1.ulixai-expat.com", ...]
}
```

#### Multi-Sources de données
- **Scraper-Pro** : Google Maps, LinkedIn, Facebook
- **Backlink Engine** : Prospects backlinks
- **CSV Import** : Import manuel/Excel
- **API externe** : Intégrations tierces

### 3.6 Forces

✅ **Architecture moderne** : FastAPI + Clean Architecture
✅ **Scalable** : Multi-tenant, 100 IPs faciles à gérer
✅ **Warmup automatique** : Intelligence + safety checks
✅ **Monitoring pro** : Prometheus + Grafana + Telegram
✅ **API REST complète** : Swagger docs, JWT, RBAC
✅ **Multi-sources** : Centralisateur de données
✅ **Production-ready** : Tests, CI/CD, systemd, nginx
✅ **Clean Architecture** : Maintenabilité, testabilité

### 3.7 Faiblesses (actuelles)

⚠️ **Pas d'UI web** : Seulement API (vs MailWizz GUI)
⚠️ **Template management partiel** : API v2 en cours
⚠️ **Campaign creation** : Use case à compléter
⚠️ **Bounce forwarding** : Intégration scraper-pro basique
⚠️ **Documentation** : Incomplète pour certaines features

---

## 4. BACKLINK-ENGINE : LE SYSTÈME DE PROSPECTION

### 4.1 Vue d'ensemble

**Localisation** : `backlink-engine/`
**Création** : Février 2026
**Statut** : 🟢 Production Active (https://backlinks.life-expat.com)

### 4.2 Architecture technique

#### Stack technologique
- **TypeScript** : Langage principal
- **Fastify 5.0** : API REST (haute performance)
- **Prisma 5.22** : ORM (PostgreSQL)
- **BullMQ** : Jobs asynchrones (Redis)
- **Cheerio** : Scraping HTML
- **React 18** : Frontend (Vite + TanStack Query)

#### Composants
```
backlink-engine/
├── src/
│   ├── config/
│   │   └── mailwizz.ts             # Config MailWizz
│   │
│   ├── services/
│   │   ├── email/
│   │   │   └── emailValidator.ts   # Validation MX, role, disposable
│   │   ├── scraping/
│   │   │   └── emailScraper.ts     # Scraping emails + noms
│   │   ├── outreach/
│   │   │   └── mailwizzClient.ts   # API client MailWizz
│   │   └── mailwizz/               # Intégration complète
│   │
│   ├── llm/prompts/
│   │   └── personalizeEmail.ts     # Personnalisation IA
│   │
│   └── workers/                    # BullMQ jobs
│       ├── enrichmentWorker.ts     # Auto-enrichissement
│       └── campaignWorker.ts       # Auto-enrollment
│
├── prisma/
│   └── schema.prisma               # Models (Prospect, Backlink, Campaign)
│
└── frontend/                       # React PWA
    ├── src/pages/                  # 23 pages
    └── src/hooks/                  # API hooks
```

### 4.3 Fonctionnalités

#### 📧 Email Scraping & Validation
```typescript
// Email scraper - 4 méthodes
1. mailto: links                    // Confiance : HIGH
2. Plain text emails                // Confiance : MEDIUM
3. Emails in HTML source            // Confiance : MEDIUM
4. Obfuscated (name [at] domain)   // Confiance : LOW

// Validation avancée
- MX records check
- Disposable domain detection (100+ providers)
- Role-based detection (info@, contact@, etc.)
- Free provider detection (Gmail, Yahoo, etc.)
- Extraction firstName/lastName du contexte HTML
```

#### 🎯 Auto-Enrollment MailWizz
```typescript
// Workflow complet
1. Prospect scraped → emailScraper.ts
2. Validation → emailValidator.ts
3. Enrichment → enrichmentWorker.ts (score, DA, PageRank)
4. Template selection → getBestTemplate(language, category)
5. Injection MailWizz → mailwizzClient.createSubscriber()
6. Suivi → Campaign events (sent, opened, clicked)
```

#### 🌍 Templates Intelligents (9 langues)
- **FR** : 6 templates (general + blogger, media, influencer, association, corporate)
- **EN** : 3 templates (general + blogger, influencer)
- **Fallback 3 niveaux** :
  1. Category + Language
  2. Language general
  3. EN general

#### 🏷️ Tag System
- **TYPE** : BLOG, MEDIA, INFLUENCER, ASSOCIATION, CORPORATE
- **SECTOR** : EXPAT, LEGAL, INSURANCE, TRAVEL
- **QUALITY** : HIGH_DA (>50), MEDIUM_DA (30-50), LOW_DA (<30)
- **GEOGRAPHY** : FRANCE, EUROPE, WORLDWIDE

### 4.4 Intégration MailWizz

#### MailWizzClient (REST API)
```typescript
class MailWizzClient {
  // Create subscriber with custom fields
  async createSubscriber(listUid: string, data: {
    email: string;
    fname?: string;
    BLOG_NAME: string;
    BLOG_URL: string;
    COUNTRY: string;
    LANGUAGE: string;
    PERSONALIZED_LINE: string;
    PROSPECT_ID: string;
    CAMPAIGN_REF: string;
  }): Promise<{ subscriberUid: string }>

  // Search by email
  async searchSubscriber(listUid: string, email: string)

  // Unsubscribe
  async unsubscribeSubscriber(listUid: string, subscriberUid: string)

  // Update fields
  async updateSubscriber(listUid: string, subscriberUid: string, data)
}
```

### 4.5 Forces

✅ **Scraping intelligent** : Email + nom + contexte
✅ **Validation avancée** : MX + disposable + role + free
✅ **Auto-enrollment** : Zéro intervention manuelle
✅ **Templates multilingues** : 9 langues + fallback
✅ **Tag-based segmentation** : Hiérarchie complète
✅ **IA classification** : OpenAI détermine intention réponses
✅ **Production-ready** : Hetzner VPS, Docker, monitoring

### 4.6 Faiblesses

⚠️ **Dépendance MailWizz** : Pas d'envoi direct PowerMTA
⚠️ **Contact form detection only** : Pas d'auto-fill (besoin Puppeteer)
⚠️ **Templates hardcodés** : Gérés en base, pas UI admin
⚠️ **i18n partiel** : Frontend ~50% français hardcodé

---

## 5. COMPARAISON DÉTAILLÉE

### 5.1 Tableau comparatif global

| Critère | Backup-Cold | Email-Engine | Backlink-Engine |
|---------|-------------|--------------|-----------------|
| **Statut** | 🟡 Archive | 🟢 Prod Active | 🟢 Prod Active |
| **Langage** | PHP | Python | TypeScript |
| **Framework** | MailWizz (Laravel-like) | FastAPI | Fastify |
| **Base de données** | MySQL | PostgreSQL | PostgreSQL |
| **Architecture** | Monolithique | Clean Architecture | Services + Workers |
| **Multi-tenant** | ❌ Non | ✅ Oui (2 tenants) | ❌ Non (single purpose) |
| **IPs gérées** | 2 IPs | 100 IPs | 0 (utilise MailWizz) |
| **Warmup** | ⚠️ Manuel | ✅ Automatique 6 semaines | N/A |
| **Monitoring** | ❌ Basique | ✅ Prometheus + Grafana | ⚠️ Logs basiques |
| **API** | ⚠️ REST basique | ✅ REST moderne (Swagger) | ✅ REST moderne |
| **UI Web** | ✅ MailWizz GUI complète | ❌ API only | ✅ React PWA |
| **Templates** | ✅ 106 templates | ⚠️ API v2 en cours | ✅ 9 templates multilingues |
| **Campagnes** | ✅ 77 autoresponders | ⚠️ Use case en cours | ✅ Auto-enrollment |
| **Email Scraping** | ❌ Non | ❌ Non | ✅ Oui (4 méthodes) |
| **Email Validation** | ⚠️ MailWizz basique | ❌ Non | ✅ Oui (MX + advanced) |
| **Bounce Handling** | ✅ Oui (MailWizz) | ⚠️ Forward scraper-pro | ⚠️ Via MailWizz |
| **Click/Open Tracking** | ✅ Oui (MailWizz) | ⚠️ Via MailWizz | ⚠️ Via MailWizz |
| **A/B Testing** | ✅ Oui (MailWizz) | ❌ Non | ❌ Non |
| **Segmentation** | ✅ Oui (MailWizz) | ⚠️ Tags en cours | ✅ Oui (tags) |
| **CI/CD** | ❌ Non | ✅ GitHub Actions | ✅ GitHub Actions |
| **Tests** | ❌ Non | ✅ Pytest | ❌ Non |
| **Documentation** | ⚠️ Plan migration | ✅ Complète | ✅ Complète |

### 5.2 Comparaison fonctionnelle

#### Gestion des IPs

| Feature | Backup-Cold | Email-Engine | Backlink-Engine |
|---------|-------------|--------------|-----------------|
| Nombre IPs | 2 | 100 | 0 |
| Rotation | ❌ Manuelle | ✅ Auto (mensuelle) | N/A |
| Warmup | ⚠️ MailWizz limité | ✅ 6 semaines auto | N/A |
| State Machine | ❌ Non | ✅ 5 états | N/A |
| Blacklist Check | ❌ Manuel | ✅ Auto 4h (9 DNSBLs) | N/A |
| DNS Validation | ⚠️ Manuel | ✅ Auto daily (SPF/DKIM/DMARC) | N/A |

#### Email Sending

| Feature | Backup-Cold | Email-Engine | Backlink-Engine |
|---------|-------------|--------------|-----------------|
| SMTP Engine | PowerMTA 5.0r9 | PowerMTA (nouveau) | Via MailWizz |
| Virtual MTAs | ✅ 2 VMTAs | ✅ Multi VMTAs | N/A |
| Rate Limiting | ⚠️ MailWizz | ✅ Warmup quotas | ⚠️ MailWizz |
| Bounce Handling | ✅ MailWizz | ⚠️ Forward scraper-pro | ⚠️ MailWizz |
| DKIM Signing | ✅ PowerMTA | ✅ PowerMTA | ✅ Via MailWizz |

#### Templates & Campaigns

| Feature | Backup-Cold | Email-Engine | Backlink-Engine |
|---------|-------------|--------------|-----------------|
| Templates count | 106 (FR) | API v2 (en cours) | 9 (FR+EN) |
| Langues | 7 (FR, EN, ES, DE, PT, AR, ZH) | 9 (+ HI, RU) | 9 |
| UI Editor | ✅ MailWizz WYSIWYG | ❌ Non | ❌ Non |
| Campagnes | 77 autoresponders | Use case en cours | Auto-enrollment |
| Segments | ✅ MailWizz avancés | ⚠️ Tags en cours | ✅ Tags hiérarchiques |
| A/B Testing | ✅ MailWizz | ❌ Non | ❌ Non |
| Personnalisation | ✅ MailWizz variables | ⚠️ En cours | ✅ Variables + IA |

#### Data Sources

| Source | Backup-Cold | Email-Engine | Backlink-Engine |
|--------|-------------|--------------|-----------------|
| Scraper-Pro | ❌ | ✅ API webhook | ❌ |
| Backlink Engine | ❌ | ✅ API webhook | ✅ (natif) |
| CSV Import | ✅ MailWizz | ✅ API v2 | ✅ UI import |
| API externe | ⚠️ MailWizz API | ✅ REST API | ✅ REST API |
| Email Scraping | ❌ | ❌ | ✅ 4 méthodes |

### 5.3 Comparaison technique

#### Base de données

**Backup-Cold (MySQL)**
```sql
-- Tables MailWizz (150+ tables)
mw_campaign                 -- Campagnes (77 rows)
mw_campaign_template        -- Templates HTML
mw_customer_email_template  -- 106 templates
mw_list                     -- Listes d'abonnés
mw_list_subscriber          -- Contacts
mw_list_segment             -- Segments
mw_delivery_server          -- Serveurs SMTP
mw_bounce_server            -- Serveurs bounce
```

**Email-Engine (PostgreSQL)**
```sql
-- Tables Custom (15 tables)
users, audit_logs           -- Auth + compliance
ips, domains                -- Infrastructure (100 rows each)
warmup_plans                -- Warmup 6 semaines
blacklist_checks            -- 9 DNSBLs
tenants                     -- Multi-tenant (2 rows)
data_sources                -- Scraper-Pro, Backlink, CSV
contacts                    -- Multi-source contacts
campaigns                   -- Par source + tenant
email_templates             -- Intelligent selection
tags, contact_tags          -- Segmentation
contact_events              -- Timeline
mailwizz_instances          -- Multi-instance config
```

**Backlink-Engine (PostgreSQL)**
```sql
-- Tables Prisma
Prospect                    -- Sites prospectés
Backlink                    -- Backlinks obtenus
Campaign                    -- Campagnes outreach
EmailEvent                  -- Tracking (sent, opened, clicked)
Tag                         -- Hierarchical tags
ProspectTag                 -- Many-to-many
ContactForm                 -- Forms détectés
MessageTemplate             -- 9 templates
```

#### API Endpoints

**Backup-Cold (MailWizz API)**
```
GET  /api/lists
GET  /api/lists/{uid}/subscribers
POST /api/lists/{uid}/subscribers
GET  /api/campaigns
POST /api/campaigns
```

**Email-Engine (FastAPI)**
```
# Auth
POST /api/v1/auth/login
POST /api/v1/auth/refresh

# Infrastructure
GET  /api/v1/ips
POST /api/v1/ips
GET  /api/v1/domains
POST /api/v1/domains
GET  /api/v1/warmup/plans
POST /api/v1/warmup/plans

# Monitoring
GET  /api/v1/blacklists/check
GET  /health
GET  /metrics

# Enterprise (v2)
POST /api/v2/contacts/ingest
GET  /api/v2/templates
POST /api/v2/templates
```

**Backlink-Engine (Fastify)**
```
# Prospects
GET  /api/prospects
POST /api/prospects
GET  /api/prospects/:id/enrich

# Campaigns
GET  /api/campaigns
POST /api/campaigns/:id/enroll

# Templates
GET  /api/message-templates/:language
PUT  /api/message-templates/:language

# Admin
POST /api/admin/prospects/import-csv
GET  /api/admin/tags
```

---

## 6. RÔLES ET INTERACTIONS

### 6.1 Rôles clairement définis

```
┌─────────────────────────────────────────────────────────┐
│  BACKUP-COLD                                            │
│  Rôle : ARCHIVE / RÉFÉRENCE                             │
│  ───────────────────────────────────────────────────    │
│  • Base historique de 77 campagnes                      │
│  • 106 templates HTML professionnels                    │
│  • Configuration PowerMTA de référence                  │
│  • Segments et triggers éprouvés                        │
│  • Source pour migration vers nouveaux systèmes         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  EMAIL-ENGINE                                           │
│  Rôle : INFRASTRUCTURE EMAIL CENTRALE                   │
│  ───────────────────────────────────────────────────    │
│  • Gestion de 100 IPs rotatifs (2 tenants)             │
│  • Warmup automatique 6 semaines                        │
│  • Monitoring : Blacklists, DNS, health                 │
│  • Multi-tenant : SOS-Expat + Ulixai                    │
│  • Hub de données multi-sources                         │
│  • Routing vers instances MailWizz                      │
│  • API REST moderne pour tous les services             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  BACKLINK-ENGINE                                        │
│  Rôle : PROSPECTION & OUTREACH BACKLINKS               │
│  ───────────────────────────────────────────────────    │
│  • Scraping de prospects (blogs, médias, influenceurs) │
│  • Validation emails avancée                            │
│  • Auto-enrollment dans MailWizz                        │
│  • Templates multilingues intelligents                  │
│  • Tag-based segmentation                               │
│  • Suivi backlinks obtenus                              │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Flux de données

#### Scénario 1 : Prospection Backlinks

```
┌──────────────────┐
│ Backlink-Engine  │
│                  │
│ 1. Scrape site   │───┐
│ 2. Extract email │   │
│ 3. Validate MX   │   │
│ 4. Enrich (DA)   │   │
└──────────────────┘   │
                       │
                       ↓ API POST /subscribers
                   ┌──────────────────┐
                   │    MailWizz      │
                   │  (SOS-Expat ou   │
                   │     Ulixai)      │
                   │                  │
                   │ 1. Receive sub   │
                   │ 2. Apply segment │
                   │ 3. Trigger camp  │
                   └──────────────────┘
                       │
                       ↓ SMTP relay :2525
                   ┌──────────────────┐
                   │    PowerMTA      │
                   │  (Email-Engine)  │
                   │                  │
                   │ 1. Get quota     │
                   │ 2. Select IP     │
                   │ 3. Sign DKIM     │
                   │ 4. Send :25      │
                   └──────────────────┘
```

#### Scénario 2 : Scraper-Pro → Email-Engine

```
┌──────────────────┐
│  Scraper-Pro     │
│  (Google Maps,   │
│   LinkedIn, FB)  │
│                  │
│ 1. Scrape data   │
│ 2. Webhook POST  │
└──────────────────┘
        │
        ↓ POST /api/v2/contacts/ingest
┌──────────────────┐
│  Email-Engine    │
│                  │
│ 1. Receive batch │
│ 2. Deduplicate   │
│ 3. Validate      │
│ 4. Enrich        │
│ 5. Route tenant  │
└──────────────────┘
        │
        ↓ API injection
┌──────────────────┐
│    MailWizz      │
│  (instance auto- │
│   selected)      │
│                  │
│ 1. Add to list   │
│ 2. Trigger camp  │
└──────────────────┘
```

#### Scénario 3 : Campagne Transactionnelle SOS-Expat

```
┌──────────────────┐
│  SOS Expat App   │
│  (Firebase)      │
│                  │
│ Event: User      │
│ registered       │
└──────────────────┘
        │
        ↓ Cloud Function
┌──────────────────┐
│  Firebase        │
│  Functions       │
│                  │
│ trigger:         │
│ sendWelcomeEmail │
└──────────────────┘
        │
        ↓ SMTP direct ou MailWizz API
┌──────────────────┐
│    MailWizz      │
│  (SOS-Expat)     │
│                  │
│ Template:        │
│ TR_CLI_welcome   │
└──────────────────┘
        │
        ↓ PowerMTA
┌──────────────────┐
│  Email-Engine    │
│  (PowerMTA)      │
│                  │
│ Use: SOS-Expat   │
│ tenant IPs       │
└──────────────────┘
```

### 6.3 Matrice d'interactions

| Action | Backup-Cold | Email-Engine | Backlink-Engine |
|--------|-------------|--------------|-----------------|
| **Scraping emails** | ❌ | ❌ | ✅ Exécute |
| **Validation emails** | ⚠️ MailWizz basique | ❌ | ✅ Exécute |
| **Stockage contacts** | ✅ MySQL lists | ✅ PostgreSQL contacts | ✅ PostgreSQL prospects |
| **Template selection** | ✅ MailWizz UI | ⚠️ API v2 | ✅ getBestTemplate() |
| **Campaign creation** | ✅ MailWizz UI | ⚠️ Use case en cours | ✅ Auto-enrollment |
| **MailWizz injection** | N/A (natif) | ✅ API multi-instance | ✅ API client |
| **PowerMTA config** | ✅ Fichier config | ✅ Génération auto | ❌ |
| **IP warmup** | ⚠️ Manuel | ✅ Auto 6 semaines | N/A |
| **Blacklist check** | ❌ | ✅ Auto 4h | ❌ |
| **DNS validation** | ⚠️ Manuel | ✅ Auto daily | ❌ |
| **Bounce handling** | ✅ MailWizz | ⚠️ Forward scraper-pro | ⚠️ Via MailWizz |
| **Click/Open track** | ✅ MailWizz | ⚠️ Via MailWizz | ⚠️ Via MailWizz |
| **Monitoring** | ❌ | ✅ Prometheus + Grafana | ⚠️ Logs |

---

## 7. MIGRATION ET COEXISTENCE

### 7.1 État actuel de migration

#### Ce qui a été migré

✅ **Infrastructure IP/Domain**
- 2 IPs → 100 IPs rotatifs
- 2 domaines → 100 domaines
- Warmup manuel → Warmup auto 6 semaines
- Blacklist check manuel → Auto 4h

✅ **PowerMTA**
- Config monolithique → Génération dynamique
- 2 Virtual MTAs → Multi VMTAs par tenant
- DKIM statique → DKIM par domaine

✅ **Monitoring**
- Logs PowerMTA → Prometheus + Grafana
- Pas d'alertes → Telegram alerts

✅ **Architecture**
- Monolithe PHP → Clean Architecture Python
- Single tenant → Multi-tenant (2)

#### Ce qui n'a PAS été migré

❌ **Templates** : 106 templates backup-cold → API v2 en cours
❌ **Campagnes** : 77 autoresponders → Use case en cours
❌ **UI Web** : MailWizz GUI → API only (pas d'UI)
❌ **Bounce handling** : Complet MailWizz → Forward basique
❌ **Click/Open tracking** : Natif MailWizz → Via MailWizz
❌ **A/B Testing** : Natif MailWizz → Non implémenté
❌ **Segments avancés** : MailWizz → Tags en cours

### 7.2 Coexistence actuelle

```
┌────────────────────────────────────────────────────────────┐
│                    ÉTAT ACTUEL (2026-02-16)                │
└────────────────────────────────────────────────────────────┘

BACKUP-COLD (Inactive)
  └─ mailwizz.zip (144 MB)
  └─ mailapp-reference.sql (1.2 MB)
  └─ 106 templates HTML (référence)
  └─ 77 campagnes autoresponder (référence)
  └─ PowerMTA config (référence DKIM/virtual MTAs)

EMAIL-ENGINE (Production)
  ├─ API v1 : IPs, domains, warmup, blacklists ✅
  ├─ API v2 : contacts, templates (en cours) ⚠️
  ├─ PowerMTA : Nouveau serveur + 100 IPs ✅
  ├─ Monitoring : Prometheus + Grafana + Telegram ✅
  └─ Multi-tenant : SOS-Expat + Ulixai ✅

BACKLINK-ENGINE (Production)
  ├─ Scraping + validation ✅
  ├─ Auto-enrollment MailWizz ✅
  ├─ Templates multilingues (9) ✅
  ├─ Tag-based segmentation ✅
  └─ UI React PWA ✅

MAILWIZZ (Production)
  ├─ Instance SOS-Expat (mail.sos-expat.com)
  ├─ Instance Ulixai (mail.ulixai-expat.com)
  ├─ Campagnes importées de backup-cold
  ├─ Templates importés de backup-cold
  └─ Relay vers PowerMTA d'Email-Engine
```

### 7.3 Plan de migration complet

#### Phase 1 : Infrastructure (✅ TERMINÉE)
- [x] Email-Engine déployé en production
- [x] 100 IPs configurées (50 par tenant)
- [x] 100 domaines configurés (50 par tenant)
- [x] PowerMTA nouveau serveur opérationnel
- [x] DNS configurés (SPF, DKIM, DMARC, PTR)
- [x] Monitoring Prometheus + Grafana
- [x] Alertes Telegram
- [x] Warmup automatique 6 semaines

#### Phase 2 : Templates (⚠️ EN COURS)
- [x] API v2 templates (GET, POST, PUT, DELETE)
- [ ] Migration 106 templates backup-cold → PostgreSQL
- [ ] Template rendering engine
- [ ] Variables support ([FNAME], [EMAIL], etc.)
- [ ] Multi-langue selection (9 langues)
- [ ] Preview API endpoint

#### Phase 3 : Campagnes (🔜 À FAIRE)
- [ ] Use Case: CreateCampaignUseCase
- [ ] Use Case: ScheduleCampaignUseCase
- [ ] Migration 77 autoresponders → PostgreSQL
- [ ] Trigger system (event-based)
- [ ] Segments → Tags mapping
- [ ] A/B testing support

#### Phase 4 : Bounce & Tracking (🔜 À FAIRE)
- [ ] Bounce parser complet (types, codes)
- [ ] Intégration scraper-pro améliorée
- [ ] Click tracking natif (alternative MailWizz)
- [ ] Open tracking natif (alternative MailWizz)
- [ ] Unsubscribe management

#### Phase 5 : UI Web (🔜 OPTIONNEL)
- [ ] React Admin Dashboard
- [ ] Template WYSIWYG editor
- [ ] Campaign builder UI
- [ ] Stats & analytics pages
- [ ] User management UI

---

## 8. RECOMMANDATIONS

### 8.1 Recommandations immédiates

#### 🔴 PRIORITÉ HAUTE

**1. Terminer migration templates**
```
Action: Compléter API v2 templates
  - Implémenter template rendering
  - Migrer 106 templates backup-cold
  - Ajouter variables support
  - Tester avec MailWizz injection

Bénéfice: Centraliser templates dans Email-Engine
Timeline: 2-3 jours
```

**2. Implémenter CreateCampaignUseCase**
```
Action: Use case création campagnes
  - CRUD campagnes
  - Trigger system (event-based)
  - Mapping segments → tags
  - Injection MailWizz auto

Bénéfice: Auto-création campagnes depuis API
Timeline: 3-4 jours
```

**3. Documenter architecture actuelle**
```
Action: Documentation complète
  - Architecture diagram (Mermaid)
  - API documentation (Swagger)
  - Deployment guide
  - Troubleshooting guide

Bénéfice: Onboarding rapide, maintenance facilitée
Timeline: 1-2 jours
```

#### 🟡 PRIORITÉ MOYENNE

**4. Améliorer bounce handling**
```
Action: Parser bounces complet
  - Parser types (hard, soft, spam, etc.)
  - Parser codes SMTP
  - Auto-update contact status
  - Forward intelligent à scraper-pro

Bénéfice: Meilleur taux délivrabilité
Timeline: 2-3 jours
```

**5. Click/Open tracking natif**
```
Action: Alternative à MailWizz tracking
  - Proxy /track/* endpoint
  - Pixel transparent 1x1 pour opens
  - Redirect liens pour clicks
  - Stockage events dans PostgreSQL

Bénéfice: Moins de dépendance MailWizz
Timeline: 3-4 jours
```

**6. UI Admin Dashboard**
```
Action: React admin dashboard
  - Pages : IPs, Domains, Campaigns, Templates
  - Stats & analytics
  - Template editor WYSIWYG
  - User management

Bénéfice: Facilité d'utilisation, moins CLI
Timeline: 1-2 semaines
```

#### 🟢 PRIORITÉ BASSE

**7. A/B Testing**
```
Action: Implémenter A/B testing
  - Split variants (50/50, 60/40, etc.)
  - Tracking performance par variant
  - Winner auto-selection

Bénéfice: Optimisation campagnes
Timeline: 3-4 jours
```

**8. Intégration Backlink-Engine native**
```
Action: Connecter directement Backlink → Email-Engine
  - Bypass MailWizz pour prospects
  - Injection directe via API v2
  - Template selection via Email-Engine

Bénéfice: Simplification architecture
Timeline: 2-3 jours
```

### 8.2 Architecture cible recommandée

```
┌────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE CIBLE                       │
│                     (À 3-6 mois)                            │
└────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │  EMAIL-ENGINE   │
                    │  (HUB CENTRAL)  │
                    │                 │
                    │  • 100 IPs      │
                    │  • 2 Tenants    │
                    │  • Multi-source │
                    │  • Templates    │
                    │  • Campaigns    │
                    │  • Tracking     │
                    └─────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ↓                 ↓                 ↓
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Backlink-Engine │ │  Scraper-Pro    │ │    CSV Import   │
│                 │ │                 │ │                 │
│ → API v2        │ │ → Webhook       │ │ → UI Upload     │
│   contacts      │ │   contacts      │ │   contacts      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
                            ↓
                    ┌─────────────────┐
                    │    PowerMTA     │
                    │  (SMTP Direct)  │
                    │                 │
                    │  • 100 IPs      │
                    │  • DKIM sign    │
                    │  • Rate limit   │
                    └─────────────────┘
                            │
                            ↓ Port 25
                    ┌─────────────────┐
                    │   Internet      │
                    │   (Gmail, etc.) │
                    └─────────────────┘

    ┌─────────────────┐
    │   MailWizz      │  ← OPTIONNEL (pour UI seulement)
    │   (Legacy UI)   │
    │                 │
    │  • Campagnes    │
    │  • Templates    │
    │  • Segments     │
    └─────────────────┘
```

### 8.3 Décisions à prendre

#### 🤔 Garder MailWizz ou pas ?

**Option A : Garder MailWizz (Hybride)**
```
✅ Avantages:
  - UI web déjà fonctionnelle
  - Features riches (A/B test, segments avancés)
  - Équipe habituée à l'outil
  - Migration progressive possible

❌ Inconvénients:
  - Dépendance à PHP/Laravel
  - Maintenance 2 systèmes
  - Complexité architecture
  - Moins de contrôle total
```

**Option B : Remplacer MailWizz (Full Email-Engine)**
```
✅ Avantages:
  - Architecture unifiée (Python/FastAPI)
  - Contrôle total fonctionnalités
  - Scalabilité maximale
  - Stack moderne (PostgreSQL, Redis)

❌ Inconvénients:
  - Développement UI Admin (~2 semaines)
  - Migration complète features (~1 mois)
  - Risque bugs initiaux
  - Formation équipe nécessaire
```

**Recommandation** : **Option A (Hybride) pour 2026**, puis **Option B en 2027**
- 2026 : Email-Engine = infrastructure (IPs, warmup, monitoring) + MailWizz = UI campagnes
- 2027 : Migration complète vers Email-Engine + UI React

#### 🤔 Intégrer Backlink-Engine dans Email-Engine ?

**Option A : Garder séparé**
```
✅ Avantages:
  - Séparation concerns (prospection ≠ infrastructure)
  - Déploiement indépendant
  - Stack différent OK (TypeScript vs Python)

❌ Inconvénients:
  - Duplication code (email validation, MailWizz client)
  - 2 bases PostgreSQL séparées
```

**Option B : Fusionner**
```
✅ Avantages:
  - Code unifié
  - Base unique
  - API v2 complète

❌ Inconvénients:
  - Migration TypeScript → Python
  - Perte UI React existante
  - Mélange responsabilités
```

**Recommandation** : **Option A (Garder séparé)**
- Backlink-Engine = outil spécialisé prospection
- Email-Engine = infrastructure généraliste
- Communication via API REST

---

## 9. RÉSUMÉ EXÉCUTIF

### 9.1 Synthèse des systèmes

| Système | Rôle | Statut | Action |
|---------|------|--------|--------|
| **Backup-Cold** | Archive/Référence | 🟡 Inactif | Conserver comme source templates/campagnes |
| **Email-Engine** | Infrastructure centrale | 🟢 Prod Active | Compléter API v2 (templates + campaigns) |
| **Backlink-Engine** | Prospection backlinks | 🟢 Prod Active | Continuer développement indépendant |

### 9.2 Différences clés

#### Backup-Cold
- Système **complet mais monolithique**
- UI **riche** mais architecture **PHP legacy**
- 106 templates + 77 campagnes **éprouvés**
- État : **Archive de référence**

#### Email-Engine
- **Infrastructure moderne** (FastAPI + PostgreSQL)
- **Multi-tenant** (2 tenants isolés)
- **100 IPs** avec warmup automatique 6 semaines
- **Monitoring pro** (Prometheus + Grafana + Telegram)
- État : **Prod active, API v2 en cours**

#### Backlink-Engine
- **Prospection spécialisée** (scraping + validation)
- **Auto-enrollment** MailWizz intelligent
- **Templates multilingues** (9 langues)
- **UI React** moderne
- État : **Prod active, fonctionnel**

### 9.3 Recommandations finales

#### Court terme (2-4 semaines)
1. ✅ **Terminer API v2 templates** (2-3j)
2. ✅ **Implémenter CreateCampaignUseCase** (3-4j)
3. ✅ **Améliorer bounce handling** (2-3j)
4. ✅ **Documenter architecture complète** (1-2j)

#### Moyen terme (3-6 mois)
5. ✅ **Click/Open tracking natif** (3-4j)
6. ✅ **UI Admin Dashboard React** (1-2 semaines)
7. ✅ **A/B Testing** (3-4j)
8. ✅ **Intégration Backlink native** (2-3j)

#### Long terme (6-12 mois)
9. 🔮 **Migration complète de MailWizz** vers Email-Engine (optionnel)
10. 🔮 **AI-powered campaign optimization**
11. 🔮 **Multi-region PowerMTA** (EU + US + ASIA)

### 9.4 Conclusion

Vous disposez de **3 systèmes complémentaires** :

1. **Backup-Cold** : Archive précieuse de 106 templates et 77 campagnes éprouvées
2. **Email-Engine** : Infrastructure moderne scalable (100 IPs, multi-tenant, monitoring pro)
3. **Backlink-Engine** : Outil de prospection intelligent avec auto-enrollment

**Architecture actuelle** : Hybride fonctionnelle
- Email-Engine gère **l'infrastructure** (IPs, warmup, monitoring)
- MailWizz gère **les campagnes** (UI, segments, A/B test)
- Backlink-Engine gère **la prospection** (scraping, validation, outreach)

**Architecture cible** : Centralisation progressive
- Email-Engine devient le **hub unique** (API v2 complète)
- MailWizz optionnel (UI legacy)
- Backlink-Engine reste **indépendant** (outil spécialisé)

---

**Document créé par Claude Code le 16 février 2026**
**Version** : 1.0.0
**Statut** : ✅ Analyse complète
