# PLAN D'ARCHITECTURE OPTIMISE
# Scraping + Envoi Email Massif (Isole + API vers SOS-Expat/Ulixai)

## Contexte

2 systemes a construire, isoles, raccordes par API REST :
- **Systeme Scraping** : Python/Scrapy, collecte et validation contacts
- **Systeme Email** : PowerMTA + MailWizz, envoi massif 500-2000/jour Phase 1

Tout a commander (aucun serveur existant).

---

## 1. ARCHITECTURE CIBLE OPTIMISEE

### Principe : 2 serveurs au lieu de 4

```
SERVEUR 1 - VDS Contabo S (30EUR/mois)
  IPs : 5 dediees incluses
  OS : Ubuntu 22.04
  ├── PowerMTA (envoi email)
  ├── PostgreSQL (scraper DB)
  ├── Redis (cache + queues)
  └── Scraper Python (cron jobs)

SERVEUR 2 - VPS Contabo M (10EUR/mois)
  IP : 1 partagee
  OS : Ubuntu 22.04
  ├── MailWizz (dashboard email + API)
  ├── Streamlit (dashboard scraper)
  ├── Nginx (reverse proxy + SSL)
  └── Grafana Agent (monitoring)

          ┌──────────────────────┐
          │   SOS-EXPAT.COM      │
          │   (Firebase/Vite)    │
          │                      │
          │   ← API REST ←      │
          └──────────┬───────────┘
                     │
    ┌────────────────┼────────────────┐
    │     SYSTEME SCRAPING + EMAIL    │
    │          (VDS + VPS)            │
    │                                 │
    │  Scraper → Validation → Email   │
    │                                 │
    └────────────────┼────────────────┘
                     │
          ┌──────────┴───────────┐
          │   ULIXAI.COM         │
          │   (a definir)        │
          │                      │
          │   ← API REST ←      │
          └──────────────────────┘
```

### Pourquoi cette repartition ?

| Composant | Serveur | Raison |
|-----------|---------|--------|
| PowerMTA | VDS | Port 25, IPs dediees, PTR configurable |
| PostgreSQL | VDS | Proche du scraper, pas de latence reseau |
| Redis | VDS | Cache scraper, idem |
| Scraper | VDS | Proche de la DB, ressources CPU pour parsing |
| MailWizz | VPS | Dashboard web leger, pas besoin d'IPs dediees |
| Streamlit | VPS | Dashboard leger |
| Grafana | VPS | Monitoring centralise des 2 serveurs |

---

## 2. BUDGET OPTIMISE PHASE 1

### Infrastructure mensuelle

| Poste | Detail | Cout/mois |
|-------|--------|-----------|
| VDS Contabo S | 4 vCPU, 12GB RAM, 200GB SSD, 5 IPs | 30EUR |
| VPS Contabo M | 4 vCPU, 8GB RAM, 200GB SSD | 10EUR |
| PowerMTA licence | 1 licence (couvre 5 IPs) | 200EUR |
| Domaines jetables (3) | cold-outreach-X.com | 2.50EUR |
| Proxies datacenter | 20 IPs Oxylabs/BrightData | 50EUR |
| **TOTAL** | | **292.50EUR/mois** |

### Economies vs plan original

- Plan original : VPS scraper (50EUR) + VPS MailWizz (10EUR) + VDS PowerMTA (30EUR) + proxies residentiels (200EUR) = **~490EUR/mois**
- Plan optimise : **292.50EUR/mois** = **-40% de cout**

### Comment on economise :

1. **Scraper sur le VDS** (pas un VPS dedie) : le VDS a assez de RAM/CPU pour tout
2. **Proxies datacenter seulement** (50EUR vs 200EUR) : on drop LinkedIn/Facebook/Instagram spiders qui necessitent des proxies residentiels chers
3. **1 seule licence PowerMTA** : couvre toutes les IPs d'un VDS
4. **PostgreSQL + Redis sur VDS** : pas de serveur DB separe

---

## 3. RACCORDEMENT API REST

### Architecture API entre les systemes

```
┌─────────────────────────────────────────────────────────┐
│              SYSTEME SCRAPING + EMAIL                     │
│                                                          │
│  API REST exposee (Nginx + auth HMAC)                    │
│  Base URL: https://api.scraper.sos-tools.com             │
│                                                          │
│  ENDPOINTS:                                              │
│                                                          │
│  POST /api/v1/contacts/import                            │
│    → Importer contacts depuis SOS-Expat/Ulixai           │
│    → Body: {email, name, category, platform, tags}       │
│                                                          │
│  GET  /api/v1/contacts/stats                             │
│    → Stats scraping (nb contacts, taux validation...)    │
│                                                          │
│  POST /api/v1/campaigns/create                           │
│    → Creer campagne email depuis SOS-Expat/Ulixai        │
│    → Body: {list_id, template, subject, from_name}       │
│                                                          │
│  GET  /api/v1/campaigns/{id}/stats                       │
│    → Stats campagne (opens, clicks, bounces)             │
│                                                          │
│  POST /api/v1/scraping/jobs                              │
│    → Lancer un job de scraping                           │
│    → Body: {source_type, config, category, platform}     │
│                                                          │
│  GET  /api/v1/scraping/jobs/{id}/status                  │
│    → Status d'un job en cours                            │
│                                                          │
│  WEBHOOKS (sortants vers SOS-Expat/Ulixai):              │
│                                                          │
│  POST → sos-expat.com/api/webhook/email-events           │
│    → Notifier bounces, opens, clicks, unsubscribes       │
│                                                          │
│  POST → ulixai.com/api/webhook/email-events              │
│    → Idem pour Ulixai                                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Securite API

```python
# Authentification HMAC-SHA256 (meme pattern que Engines-Pro)
# Header: X-API-Key + X-Signature + X-Timestamp

import hmac, hashlib, time

def verify_request(api_key, secret, signature, timestamp, body):
    # Rejeter si timestamp > 5 min
    if abs(time.time() - int(timestamp)) > 300:
        return False

    # Recalculer signature
    message = f"{timestamp}.{body}"
    expected = hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected)
```

### Cote SOS-Expat (Firebase Functions)

```typescript
// Nouvelle Cloud Function pour recevoir les webhooks email
// sos/firebase/functions/src/webhooks/emailEventsWebhook.ts

export const emailEventsWebhook = onRequest(async (req, res) => {
  // Verifier signature HMAC
  const isValid = verifyHMAC(req);
  if (!isValid) return res.status(401).send('Unauthorized');

  const { event_type, email, campaign_id, metadata } = req.body;

  switch (event_type) {
    case 'bounce':
      // Mettre a jour le contact dans Firestore
      await markContactBounced(email);
      break;
    case 'open':
      await logEmailOpen(email, campaign_id);
      break;
    case 'click':
      await logEmailClick(email, campaign_id, metadata.url);
      break;
    case 'unsubscribe':
      await handleUnsubscribe(email);
      break;
  }

  res.status(200).send('OK');
});
```

---

## 4. STACK TECHNIQUE OPTIMISE

### Scraper (Python)

```
scraper-pro/
├── docker-compose.yml        # PostgreSQL + Redis + Scraper
├── .env                      # Secrets
├── requirements.txt          # Deps Python
│
├── scraper/
│   ├── spiders/
│   │   ├── google_search_spider.py    # Phase 1
│   │   ├── google_maps_spider.py      # Phase 1
│   │   └── generic_url_spider.py      # Phase 1 (PRIORITAIRE)
│   │
│   ├── modules/
│   │   ├── validator.py               # Email/phone validation
│   │   ├── categorizer.py             # Routing SOS-Expat/Ulixai
│   │   └── router.py                  # MailWizz list mapping
│   │
│   ├── integrations/
│   │   ├── mailwizz_client.py         # API MailWizz
│   │   └── webhook_sender.py          # Webhooks vers SOS-Expat/Ulixai
│   │
│   ├── api/                           # API REST (FastAPI)
│   │   ├── main.py                    # App FastAPI
│   │   ├── auth.py                    # HMAC auth middleware
│   │   ├── routes/
│   │   │   ├── contacts.py
│   │   │   ├── campaigns.py
│   │   │   └── scraping.py
│   │   └── schemas.py                 # Pydantic models
│   │
│   ├── jobs/
│   │   ├── process_contacts.py        # Cron validation
│   │   └── sync_to_mailwizz.py        # Cron injection MailWizz
│   │
│   └── utils/
│       ├── proxy_manager.py           # Rotation proxies
│       ├── cache_manager.py           # Redis anti-doublons
│       └── url_normalizer.py          # Dedup URLs
│
├── config/
│   ├── mailwizz_routing.json          # Mapping categories → listes
│   └── proxy_config.json              # Config proxies
│
├── db/
│   └── init.sql                       # Schema PostgreSQL
│
└── dashboard/
    └── app.py                         # Streamlit dashboard
```

### Choix techniques justifies

| Choix | Alternative | Pourquoi |
|-------|-------------|----------|
| **FastAPI** (API) | Flask, Django | Async, auto-docs OpenAPI, Pydantic validation, ultra-rapide |
| **PostgreSQL** (DB) | MySQL | JSON natif, JSONB indexable, meilleures perfs scraping |
| **Redis** (cache) | Memcached | Structures avancees (sets pour dedup, sorted sets pour queues) |
| **Scrapy** (spider) | BeautifulSoup, Selenium | Framework complet, middlewares, pipelines, async natif |
| **Docker Compose** | Install bare-metal | Reproductible, isolation, facile backup/restore |

---

## 5. SPIDERS PHASE 1 (3 seulement)

### Pourquoi 3 au lieu de 9

| Spider original | Garde? | Raison |
|----------------|--------|--------|
| Google Search | OUI | Source #1, pas de protection anti-bot forte |
| Google Maps | OUI | Excellent pour avocats/assureurs locaux |
| URLs custom | OUI | Flexible, zero risque legal |
| LinkedIn | NON | ToS violation, proxies residentiels chers, risque ban |
| Facebook | NON | Idem, API Graph limitee |
| Instagram | NON | Idem, API limitee |
| YouTube | NON | Peu de contacts email extractibles |
| Forums | PHASE 2 | Utile mais pas prioritaire |
| Annuaires | PHASE 2 | Utile mais pas prioritaire |

**Economie proxies** : 3 spiders simples = proxies datacenter 50EUR (vs 200EUR residentiels)

---

## 6. FEEDBACK LOOP (CRITIQUE)

### Bounces MailWizz → Scraper DB

```
MailWizz detecte bounce
    ↓
Webhook MailWizz → API scraper
    ↓
POST /api/v1/contacts/bounce-feedback
{
  "email": "john@example.com",
  "bounce_type": "hard",  // hard | soft | spam_complaint
  "campaign_id": "abc123"
}
    ↓
Scraper DB :
  validated_contacts.status = 'bounced'
  + blacklist domaine si bounce_rate > 10%
    ↓
Webhook → SOS-Expat / Ulixai
  "Ce contact a bounce, ne plus utiliser"
```

### Pourquoi c'est critique

Sans feedback loop :
- Le scraper continue d'envoyer des emails invalides
- Les IPs se degradent
- Les bounces s'accumulent
- PowerMTA blackliste

Avec feedback loop :
- Email bounce → marque invalide en DB
- Domaine avec >10% bounces → blackliste auto
- Qualite des listes s'ameliore avec le temps
- IPs restent propres

---

## 7. PLAN D'IMPLEMENTATION OPTIMISE

### Phase 1 - Semaine 1 : Infrastructure

```
JOUR 1 :
[ ] Commander VDS Contabo S (30EUR/mois, 5 IPs)
[ ] Commander VPS Contabo M (10EUR/mois)
[ ] Acheter 3 domaines cold-outreach-X.com (~10EUR/an chacun)
[ ] Acheter licence PowerMTA

JOUR 2 :
[ ] Configurer VDS : Ubuntu 22.04, Docker, Docker Compose
[ ] Configurer VPS : Ubuntu 22.04, Nginx, Certbot
[ ] Configurer DNS pour les 3 domaines cold
[ ] Configurer DNS sous-domaines trans.mail-ulixai.com + news.sos-expat.com

JOUR 3 :
[ ] Installer PostgreSQL + Redis sur VDS (Docker)
[ ] Executer init.sql (schema DB)
[ ] Installer MailWizz sur VPS
[ ] Configurer SSL (Let's Encrypt)

JOUR 4 :
[ ] Installer PowerMTA sur VDS
[ ] Generer DKIM pour chaque domaine
[ ] Configurer PTR pour les 5 IPs
[ ] Configurer SPF/DMARC DNS

JOUR 5 :
[ ] Connecter MailWizz → PowerMTA (delivery servers)
[ ] Tester envoi email (mail-tester.com > 9/10)
[ ] Configurer monitoring (Grafana Cloud gratuit + alertes Telegram)
```

### Phase 2 - Semaine 2-3 : Scraper MVP

```
SEMAINE 2 :
[ ] Creer projet Python (requirements.txt, docker-compose.yml)
[ ] Implementer generic_url_spider.py (PRIORITAIRE)
[ ] Implementer validator.py (email regex + DNS MX)
[ ] Implementer categorizer.py + router.py
[ ] Implementer process_contacts.py (cron job)
[ ] Tester pipeline : URLs → scrape → validation → PostgreSQL

SEMAINE 3 :
[ ] Implementer mailwizz_client.py
[ ] Implementer sync_to_mailwizz.py (cron job)
[ ] Implementer FastAPI (3 routes essentielles)
[ ] Implementer google_search_spider.py
[ ] Implementer google_maps_spider.py
[ ] Configurer cron jobs sur VDS
[ ] Test end-to-end : scrape → validation → MailWizz → PowerMTA → email
```

### Phase 3 - Semaine 4 : Integration + Dashboard

```
[ ] Implementer webhook_sender.py (events → SOS-Expat/Ulixai)
[ ] Implementer bounce feedback loop (MailWizz → scraper DB)
[ ] Dashboard Streamlit basique (creation jobs, stats)
[ ] Tests de charge (500 puis 1000 puis 2000 emails)
[ ] Documentation API pour equipe SOS-Expat/Ulixai
```

### Phase 4 - Semaine 5-10 : Warm-up + Production

```
SEMAINE 5-6 :
[ ] Warm-up IPs (plan 6 semaines, volumes progressifs)
[ ] Monitoring quotidien (bounces, spam rate, blacklists)

SEMAINE 7-10 :
[ ] Montee en charge progressive
[ ] Ajuster quotas PowerMTA selon resultats
[ ] Ajouter spiders Phase 2 si besoin (forums, annuaires)
```

---

## 8. FICHIERS A CREER (20 fichiers au lieu de 30)

| # | Fichier | Priorite | Semaine |
|---|---------|----------|---------|
| 1 | `docker-compose.yml` | CRITIQUE | 1 |
| 2 | `requirements.txt` | CRITIQUE | 1 |
| 3 | `db/init.sql` | CRITIQUE | 1 |
| 4 | `.env` | CRITIQUE | 1 |
| 5 | `scraper/spiders/generic_url_spider.py` | CRITIQUE | 2 |
| 6 | `scraper/modules/validator.py` | CRITIQUE | 2 |
| 7 | `scraper/modules/categorizer.py` | CRITIQUE | 2 |
| 8 | `scraper/modules/router.py` | CRITIQUE | 2 |
| 9 | `scraper/jobs/process_contacts.py` | CRITIQUE | 2 |
| 10 | `scraper/integrations/mailwizz_client.py` | HAUTE | 3 |
| 11 | `scraper/jobs/sync_to_mailwizz.py` | HAUTE | 3 |
| 12 | `config/mailwizz_routing.json` | HAUTE | 3 |
| 13 | `scraper/api/main.py` | HAUTE | 3 |
| 14 | `scraper/api/auth.py` | HAUTE | 3 |
| 15 | `scraper/api/routes/contacts.py` | HAUTE | 3 |
| 16 | `scraper/spiders/google_search_spider.py` | MOYENNE | 3 |
| 17 | `scraper/spiders/google_maps_spider.py` | MOYENNE | 3 |
| 18 | `scraper/utils/proxy_manager.py` | MOYENNE | 3 |
| 19 | `scraper/integrations/webhook_sender.py` | MOYENNE | 4 |
| 20 | `dashboard/app.py` | BASSE | 4 |

---

## 9. POINTS D'OPTIMISATION CLES

### 9.1 Proxies : datacenter seulement en Phase 1

- 20 IPs datacenter a 50EUR/mois
- Suffisant pour Google Search + Maps + URLs custom
- Ajouter residentiels SEULEMENT si on ajoute LinkedIn/Facebook plus tard

### 9.2 Pas de SMTP check pour validation email

- DNS MX check suffit (gratuit, rapide, pas de risque blacklist)
- SMTP check = comportement de spammer, IP du scraper serait blacklistee
- Alternative : utiliser un service tiers (ZeroBounce, NeverBounce) a 0.003EUR/email SI necessaire

### 9.3 FastAPI au lieu de Streamlit pour l'API

- Streamlit = dashboard visuel seulement
- FastAPI = API REST performante pour le raccordement SOS-Expat/Ulixai
- Les deux cohabitent sur le meme VPS

### 9.4 Docker Compose pour tout sauf PowerMTA

- PostgreSQL, Redis, Scraper, FastAPI = conteneurs Docker
- PowerMTA = install bare-metal (besoin d'acces direct aux IPs)
- MailWizz = install bare-metal (PHP/Apache traditionnel)

### 9.5 Un seul PostgreSQL, pas MySQL + PostgreSQL

- PostgreSQL pour TOUT (scraper DB + si besoin stockage additionnel)
- MailWizz utilise son propre MySQL (installe avec MailWizz, pas modifiable)
- Pas de duplication : le scraper ne touche pas la DB MailWizz, il passe par l'API

---

## 10. BUDGET RECAPITULATIF

### Phase 1 (Mois 1-3) : 500-2000 emails/jour

| Poste | Mensuel | Annuel |
|-------|---------|--------|
| VDS Contabo S (5 IPs) | 30EUR | 360EUR |
| VPS Contabo M | 10EUR | 120EUR |
| PowerMTA licence | 200EUR | 2,400EUR |
| Domaines cold (3) | 2.50EUR | 30EUR |
| Proxies datacenter (20) | 50EUR | 600EUR |
| Monitoring (Grafana free) | 0EUR | 0EUR |
| **TOTAL** | **292.50EUR** | **3,510EUR** |

### Phase 2 (Mois 4-9) : 2000-10000 emails/jour

| Poste | Mensuel |
|-------|---------|
| VDS Contabo M upgrade (10 IPs) | 60EUR |
| VPS Contabo M (inchange) | 10EUR |
| VDS Backup (3 IPs) | 30EUR |
| PowerMTA licence (meme) | 200EUR |
| Domaines cold (8) | 6.70EUR |
| Proxies datacenter (30) | 75EUR |
| **TOTAL** | **381.70EUR** |

### Comparaison avec solutions SaaS

| Volume/jour | Notre systeme | SendGrid | Mailgun | Economie |
|-------------|---------------|----------|---------|----------|
| 2,000 | 292EUR | 350EUR | 380EUR | -20% |
| 10,000 | 382EUR | 550EUR | 600EUR | -36% |
| 50,000 | ~600EUR | 1,200EUR | 1,300EUR | -54% |

Plus on scale, plus l'ecart se creuse en notre faveur.

---

## 11. RISQUES ET MITIGATIONS

| Risque | Probabilite | Impact | Mitigation |
|--------|-------------|--------|------------|
| IP blacklistee | Haute | Moyen | 2 IPs standby, rotation auto, warm-up strict |
| MailWizz discontinue | Moyenne | Moyen | Migration vers Mautic/Listmonk si necessaire |
| Google bloque scraper | Moyenne | Faible | Proxies + rate limiting + UserAgent rotation |
| Bounce rate eleve | Moyenne | Haut | Validation DNS MX stricte + feedback loop |
| VDS down | Faible | Haut | VDS backup Phase 2, backups quotidiens |
| RGPD plainte | Faible | Haut | Lien unsubscribe, base legale "interet legitime B2B" |

---

## RESUME : DECISIONS A VALIDER

1. **2 serveurs** : VDS Contabo S (30EUR) + VPS Contabo M (10EUR)
2. **PowerMTA** : licence 200EUR/mois (choisi par l'utilisateur)
3. **3 spiders Phase 1** : Google Search + Google Maps + URLs custom
4. **Proxies datacenter** : 50EUR/mois (pas residentiels)
5. **API REST FastAPI** : raccordement SOS-Expat/Ulixai par webhooks HMAC
6. **Pas de SMTP check** : validation DNS MX seulement
7. **20 fichiers** a implementer (pas 30)
8. **4 semaines** d'implementation + 6 semaines warm-up
9. **Budget Phase 1** : 292.50EUR/mois
