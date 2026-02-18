# 📧 Résumé Exécutif - Systèmes d'Emailing

**Date** : 16 février 2026
**Lecture** : 3 minutes

---

## 🎯 EN BREF

Vous avez **3 systèmes d'emailing complémentaires** :

1. **Backup-Cold** (Archive) : Ancien système MailWizz avec 106 templates et 77 campagnes
2. **Email-Engine** (Prod) : Infrastructure moderne avec 100 IPs et warmup automatique
3. **Backlink-Engine** (Prod) : Outil de prospection avec scraping et auto-enrollment

---

## 📊 COMPARAISON RAPIDE

| Système | Rôle | État | Forces | Faiblesses |
|---------|------|------|--------|------------|
| **Backup-Cold** | Archive | 🟡 Inactif | • UI complète<br>• 106 templates<br>• 77 campagnes | • Monolithe PHP<br>• Port 25 fermé<br>• 2 IPs seulement |
| **Email-Engine** | Infrastructure | 🟢 Prod | • 100 IPs<br>• Warmup auto<br>• Monitoring pro<br>• Multi-tenant | • Pas d'UI<br>• API v2 en cours<br>• Templates à migrer |
| **Backlink-Engine** | Prospection | 🟢 Prod | • Scraping 4 méthodes<br>• Validation avancée<br>• Auto-enrollment<br>• UI React | • 1 use case<br>• Dépend MailWizz |

---

## 🔄 FLUX TYPIQUE

### Prospection Backlinks
```
Backlink-Engine
  ↓ Scrape site
  ↓ Validate email (MX, disposable, role)
  ↓ Enrich (DA, PageRank, langue)
  ↓ Select template (9 langues)
  ↓ Inject MailWizz
MailWizz
  ↓ Trigger campaign
  ↓ Relay :2525
PowerMTA (Email-Engine)
  ↓ Select IP from pool (100)
  ↓ Check warmup quota
  ↓ Sign DKIM
  ↓ Send :25
Internet (Gmail, etc.)
```

### Scraper-Pro → Email-Engine
```
Scraper-Pro (Google Maps, LinkedIn)
  ↓ Webhook POST /api/v2/contacts/ingest
Email-Engine
  ↓ Deduplicate (email hash)
  ↓ Validate (Celery job)
  ↓ Enrich (categorization)
  ↓ Route tenant (SOS-Expat / Ulixai)
  ↓ Select campaign + template
  ↓ Inject MailWizz (multi-instance)
MailWizz → PowerMTA → Internet
```

---

## 🏗️ ARCHITECTURE ACTUELLE

```
┌───────────────────────┐
│ Backup-Cold (Archive) │
│ • 106 templates       │
│ • 77 campagnes        │
│ • Config PowerMTA     │
└───────────────────────┘
         │ Migration partielle
         ↓
┌───────────────────────────────────┐
│ Email-Engine (Hub Infrastructure) │
│ • 100 IPs (50 SOS + 50 Ulixai)    │
│ • Warmup 6 semaines automatique   │
│ • Monitoring (Prometheus+Grafana) │
│ • Multi-tenant + Multi-sources    │
│ • API REST moderne                │
└───────────────────────────────────┘
         ↕ PowerMTA
┌───────────────────────────────────┐
│ Backlink-Engine (Prospection)     │
│ • Scraping + Validation           │
│ • Templates 9 langues             │
│ • Auto-enrollment MailWizz        │
│ • UI React PWA                    │
└───────────────────────────────────┘
```

---

## ✅ CE QUI FONCTIONNE

- ✅ **Infrastructure** : 100 IPs avec warmup automatique (Email-Engine)
- ✅ **Monitoring** : Prometheus + Grafana + Telegram alerts (Email-Engine)
- ✅ **Prospection** : Scraping + validation + auto-enrollment (Backlink-Engine)
- ✅ **Multi-tenant** : SOS-Expat + Ulixai isolés (Email-Engine)
- ✅ **DNS auto** : SPF/DKIM/DMARC validation quotidienne (Email-Engine)
- ✅ **Blacklists** : 9 DNSBLs check toutes les 4h (Email-Engine)

---

## ⚠️ CE QUI MANQUE

- ⚠️ **Templates** : 106 templates backup-cold → Migration API v2 en cours (40%)
- ⚠️ **Campagnes** : 77 autoresponders → Use case CreateCampaign à faire (20%)
- ⚠️ **UI Admin** : Pas d'interface web (seulement API)
- ⚠️ **Bounce handling** : Complet MailWizz → Forward basique scraper-pro
- ⚠️ **Click/Open tracking** : Via MailWizz (pas natif Email-Engine)
- ⚠️ **A/B Testing** : Pas implémenté

---

## 🎯 RECOMMANDATIONS PRIORITAIRES

### Court terme (2-4 semaines)

**1. Terminer API v2 Templates** (2-3 jours)
- Implémenter template rendering
- Migrer 106 templates backup-cold
- Variables support ([FNAME], [EMAIL], etc.)

**2. CreateCampaignUseCase** (3-4 jours)
- CRUD campagnes via API
- Trigger system event-based
- Injection MailWizz automatique

**3. Améliorer Bounce Handling** (2-3 jours)
- Parser types (hard, soft, spam)
- Auto-update contact status
- Forward intelligent scraper-pro

### Moyen terme (3-6 mois)

**4. UI Admin Dashboard** (1-2 semaines)
- React dashboard (IPs, Campaigns, Templates)
- Template WYSIWYG editor
- Stats & analytics

**5. Click/Open Tracking Natif** (3-4 jours)
- Proxy /track/* endpoint
- Pixel 1x1 pour opens
- Redirect liens pour clicks

---

## 🤔 DÉCISIONS À PRENDRE

### Garder MailWizz ou pas ?

**Recommandation** : **Hybride 2026, Full Email-Engine 2027**

**2026 (Hybride)**
- Email-Engine = infrastructure (IPs, warmup, monitoring)
- MailWizz = UI campagnes (segments, A/B test)
- Avantage : Migration progressive, UI existante

**2027 (Full Email-Engine)**
- Tout dans Email-Engine + UI React admin
- Avantage : Stack unifié, contrôle total
- Inconvénient : Développement UI (~2 semaines)

### Fusionner Backlink-Engine dans Email-Engine ?

**Recommandation** : **NON, garder séparé**

**Raisons**
- Séparation concerns (prospection ≠ infrastructure)
- Stack différent OK (TypeScript vs Python)
- Déploiement indépendant
- Outil spécialisé vs plateforme généraliste

---

## 📈 ÉTAT DE MIGRATION

```
Infrastructure (Email-Engine)     100%  ████████████████
Templates (API v2)                 40%  ██████░░░░░░░░░░
Campagnes (Use Cases)              20%  ███░░░░░░░░░░░░░
Bounce Handling                    30%  ████░░░░░░░░░░░░
Tracking                           50%  ████████░░░░░░░░
UI Admin                            0%  ░░░░░░░░░░░░░░░░

GLOBAL                             56%  █████████░░░░░░░
```

---

## 🔑 RÔLES CLAIREMENT DÉFINIS

| Système | Rôle | Utiliser quand |
|---------|------|----------------|
| **Backup-Cold** | Archive de référence | Besoin templates/campagnes existantes |
| **Email-Engine** | Hub infrastructure | Gérer IPs, warmup, monitoring, multi-tenant |
| **Backlink-Engine** | Outil prospection | Scraper sites, valider emails, auto-enroll |

---

## 💡 EN RÉSUMÉ

**Vous avez une architecture hybride fonctionnelle** :

1. **Email-Engine** gère l'infrastructure (100 IPs, warmup, monitoring)
2. **MailWizz** gère les campagnes (UI, segments, tracking)
3. **Backlink-Engine** gère la prospection (scraping, validation, enrollment)
4. **Backup-Cold** reste source de référence (templates/campagnes)

**Prochaines étapes** :
1. Terminer API v2 templates (2-3j)
2. CreateCampaignUseCase (3-4j)
3. Améliorer bounce handling (2-3j)
4. Planifier UI Admin (moyen terme)

**Architecture cible** : Email-Engine devient hub unique (API v2 complète), MailWizz optionnel (UI legacy), Backlink-Engine reste indépendant.

---

**Pour plus de détails, voir** :
- `ANALYSE-COMPARATIVE-SYSTEMES-EMAILING.md` (analyse complète, 9 sections)
- `FLUX-ARCHITECTURE-EMAILING-VISUEL.md` (diagrammes détaillés)

---

**Document créé par Claude Code le 16 février 2026**
