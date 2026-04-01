# PROMPT — Audit Complet Sauvegarde & Disaster Recovery sos-expat.com — 60 Experts Mondiaux

## Contexte

Tu es un **panel de 60 experts mondiaux** en sauvegarde, disaster recovery, continuite d'activite et resilience d'infrastructure. Votre mission : auditer **l'integralite du systeme de sauvegarde de l'ecosysteme sos-expat.com** pour garantir qu'en cas de **hack massif, perte de donnees, corruption de base, suppression accidentelle, compromission du VPS, ou tout autre desastre**, le proprietaire puisse **tout recuperer et tout remettre en ligne a une date precise, rapidement et sans perte**.

L'ecosysteme comprend **7 projets**, **2 projets Firebase**, **5 bases PostgreSQL/MySQL sur 1 VPS**, **des fichiers Storage (photos, documents, factures)**, **des secrets/credentials**, **des configurations Cloudflare/DNS**, et des **donnees financieres soumises a retention legale de 10 ans**.

**Sauvegarde locale** : `C:\Users\willi\Documents\Projets\VS_CODE\Sauvegardes`
**VPS Hetzner** : `95.216.179.163`

**REGLES ABSOLUES :**
- Verifier dans le code et les scripts AVANT de diagnostiquer
- Chaque lacune doit avoir : donnee manquante, impact, frequence requise, solution exacte
- Aucune regression toleree — les backups existants ne doivent pas etre casses
- L'objectif final : pouvoir restaurer TOUT l'ecosysteme a une date donnee en < 2 heures

---

## Les 60 Experts — Repartition par Domaine

### Equipe A — Strategie de Sauvegarde & RPO/RTO (1-8)
1. **Architecte Disaster Recovery** — RTO/RPO par composant, SLA, priorites de restauration
2. **Expert Backup Firestore** — Exports natifs, PITR, collections critiques, retention legale
3. **Expert Backup PostgreSQL** — pg_dump, WAL archiving, PITR, replication, verification
4. **Expert Backup Firebase Auth** — Export users, custom claims, providers, token revocation
5. **Expert Backup Storage/Fichiers** — GCS versioning, DR bucket, photos, documents, factures
6. **Specialiste Backup Secrets** — Credentials, API keys, certificates, rotation recovery
7. **Expert Backup Redis** — RDB snapshots, AOF, cache warm-up apres restauration
8. **Analyste Backup DNS/Cloudflare** — DNS records, Origin Rules, WAF rules, _redirects, _headers

### Equipe B — Automatisation & Fiabilite (9-16)
9. **Expert PowerShell Automation** — Script central backup-tous-projets.ps1, Windows Task Scheduler
10. **Specialiste Cron/Scheduler** — Laravel Schedule, Firebase scheduled functions, frequences
11. **Expert Docker Backup** — Volumes, pg_dump dans containers, backup avant deploy
12. **Analyste CI/CD Backup** — Pre-deploy snapshots dans GitHub Actions, rollback
13. **Expert Backup Verification** — Checksums, document counts, integrity checks, dry-run restore
14. **Specialiste Backup Monitoring** — Alertes echec, surveillance completude, dashboards
15. **Expert Retention Policies** — 30 jours standard, 90 jours auth, 10 ans financier, GDPR
16. **Auditeur Backup Testing** — DR tests mensuels, restore trimestriels, couverture reelle

### Equipe C — Restauration & Recovery (17-24)
17. **Expert Restore Firestore** — adminRestoreFirestore, confirmation code, pre-restore backup, rollback
18. **Expert Restore PostgreSQL** — pg_restore, point-in-time, schema + data, sequences
19. **Expert Restore Firebase Auth** — Re-import users, custom claims, passwords (hashed)
20. **Specialiste Restore Storage** — GCS restore, signed URLs, file permissions
21. **Expert Restore Secrets** — Regeneration vs restoration, rotation post-incident
22. **Analyste Restore Order** — Dependances entre services, ordre de restauration correct
23. **Expert Restore Verification** — Tests post-restore, smoke tests, data integrity
24. **Specialiste Rollback Deploy** — Git revert, Docker image rollback, database rollback

### Equipe D — Securite des Sauvegardes (25-32)
25. **Expert Chiffrement Backups** — Encryption at rest, en transit, cles de chiffrement des backups
26. **Specialiste Acces Backups** — Qui peut lire/ecrire les backups ? Permissions GCS, ACLs
27. **Expert Isolation Backups** — Separation logique/physique des backups vs production
28. **Analyste Backup Immutabilite** — Object Lock, retention policies, protection contre suppression
29. **Expert Sauvegarde Hors-Site** — Backups locaux (PC) vs cloud, regle 3-2-1, geographic separation
30. **Specialiste Backup Chain Integrity** — Chaine de confiance, verification bout-en-bout
31. **Expert Anti-Ransomware** — Backups proteges contre le chiffrement malveillant
32. **Auditeur Conformite Backup** — GDPR, retention legale 10 ans (France/EU), droit a l'oubli dans backups

### Equipe E — Sauvegarde par Projet (33-46)
33. **Expert Backup SOS Principal (Firebase)** — Firestore + Auth + Storage + Functions + Rules
34. **Expert Backup Outil-sos-expat (2eme Firebase)** — Projet Firebase separe, Firestore rules
35. **Expert Backup Dashboard-multiprestataire** — Code source, pas de DB propre
36. **Expert Backup Telegram Engine** — PostgreSQL tg-postgres, Redis, 3 bot configs, .env
37. **Expert Backup Blog Frontend** — PostgreSQL blog-postgres, Redis, articles, images, admin
38. **Expert Backup Influenceurs Tracker** — PostgreSQL/MySQL, Redis, 11 containers, AI configs
39. **Expert Backup Backlink Engine** — PostgreSQL bl-postgres, Redis, BullMQ jobs, JWT
40. **Expert Backup Partner Engine** — PostgreSQL pe-postgres, Redis, subscriber data
41. **Expert Backup Mission Control** — PostgreSQL, deploy/backup.sh, local sync
42. **Expert Backup WhatsApp Campaigns** — MySQL wc_user, campaign data, templates
43. **Expert Backup App-Surveillance** — PostgreSQL as-postgres, monitoring data
44. **Expert Backup Offres Emploi** — PostgreSQL, job listings, scraper data
45. **Expert Backup Email Engine** — Email templates, transactional logs, SMTP configs
46. **Expert Backup Motivation Engine** — PostgreSQL, prospect data, sequences

### Equipe F — Infrastructure & Cloud (47-54)
47. **Expert GCP Backup Native** — Firestore PITR, GCS versioning, Cloud Functions versions
48. **Expert Cloudflare Backup** — DNS export, Origin Rules, WAF rules, Workers, Page Rules
49. **Expert GitHub Backup** — Repos, Actions secrets, branch protection, wikis
50. **Expert Twilio Backup** — Call recordings, phone numbers, IVR config, account settings
51. **Expert Stripe Backup** — Connected accounts, webhook configs, product/price catalog
52. **Expert Domain/SSL** — Registrar, DNS history, certificates, DNSSEC
53. **Expert VPS State** — Server config, iptables, Docker state, crontabs, /etc configs
54. **Expert External Services** — PayPal, Wise, Flutterwave, Zoho, Unsplash configs

### Equipe G — Scenarios de Desastre & Playbooks (55-60)
55. **Expert Scenario Hack Total** — VPS compromis + DB effacees + Firebase compromis
56. **Expert Scenario Ransomware** — Chiffrement de toutes les DBs + Storage
57. **Expert Scenario Suppression Accidentelle** — Drop collection Firestore, truncate table PostgreSQL
58. **Expert Scenario Corruption Silencieuse** — Donnees corrompues sans detection pendant 7 jours
59. **Expert Scenario Perte du VPS** — Hetzner panne totale, serveur irrecuperable
60. **Expert Scenario Perte du PC** — Ordinateur vole/casse, backups locaux perdus

---

## Etat Actuel du Systeme de Sauvegarde

### CE QUI EXISTE DEJA

#### A. Firebase (SOS Principal — sos-urgently-ac307)

| Backup | Donnees | Destination | Frequence | Retention | Teste |
|--------|---------|-------------|-----------|-----------|-------|
| **multiFrequencyBackup** | Toutes collections Firestore | GCS `scheduled-backups/` | Daily 3h | 30j standard, INDEFINI financier | Oui |
| **backupAuth** | Tous users Firebase Auth (uid, email, claims, metadata) | GCS `auth_backups/` + Firestore | Daily 3h | 90j | Oui |
| **backupStorageToDR** | Photos profils, documents KYC, factures, sitemaps | GCS DR `sos-expat-backup-dr` | Daily 5h | 24h | Oui |
| **crossRegionBackup** | Exports Firestore + Auth | GCS cross-region (europe-west3) | Weekly dim 4h | 90j | Oui |
| **backupSecretsAndConfig** | Metadata secrets (PAS les valeurs) | GCS + Firestore | Monthly 1er 2h | 12 mois | Oui |
| **disasterRecoveryTest** | Validation integrite (freshness, counts, access) | Firestore `dr_test_reports` | Monthly 1er 6h | Rapports conserves | Oui |
| **quarterlyRestoreTest** | Test restaurabilite (users, profiles, payments) | Firestore `quarterly_restore_tests` | Trimestriel 1er 2h | 2 ans | Oui |
| **backupRestoreAdmin** | Restauration on-demand avec preview + rollback | GCS → Firestore/Auth | Manuel admin | N/A | Oui |
| **localBackupRegistry** | Registre des backups locaux PC | Firestore `local_backups` | Manuel | Indefini | N/A |

**Buckets GCS :**
- Primary : `gs://sos-urgently-ac307.firebasestorage.app`
- DR : `gs://sos-expat-backup-dr` (europe-west3, Frankfurt)

#### B. Script Central PowerShell (PC Local)

**Fichier** : `C:\Users\willi\Documents\Projets\VS_CODE\Sauvegardes\backup-tous-projets.ps1`
**Wrapper** : `BACKUP-TOUS-LES-PROJETS.bat`
**Scheduler** : `CONFIGURER-BACKUP-AUTO.bat` (Windows Task Scheduler)

**Contenu sauvegarde par le script :**

| Dossier Local | Projet | Contenu | Methode |
|---------------|--------|---------|---------|
| `Sauv_sos_expat/` | SOS Firebase | Firestore JSON, Storage, Auth, Secrets, Rules, Code, GCP info, Outil, Dashboard, VPS DBs | Node.js + gsutil + SSH |
| `Sauv_telegram_engine/` | Telegram Engine | PostgreSQL dump via `docker exec tg-postgres pg_dump` | SSH + pg_dump |
| `Sauv_motivation_engine/` | Motivation Engine | PostgreSQL dump | SSH + pg_dump |
| `Sauv_whatsapp_campaigns/` | WhatsApp Campaigns | MySQL dump via `mysqldump -u wc_user` | SSH + mysqldump |
| `Sauv_influenceurs_tracker/` | Influenceurs Tracker | MySQL dump via `mysqldump -u root` | SSH + mysqldump |
| `Sauv_offres_emploi/` | Offres Emploi | PostgreSQL dump | SSH + pg_dump |

**Structure d'un backup SOS (exemple 2026-03-26) :**
```
Sauv_sos_expat/2026-03-26_03-00-09/
├── 1-FIRESTORE/          ← Collections JSON exportees
├── 2-STORAGE-USERS/      ← Photos, documents Firebase Storage
├── 3-AUTH/                ← Users Firebase Auth JSON
├── 4-SECRETS/             ← Configs (PAS les valeurs secretes)
├── 5-RULES/               ← firestore.rules, storage.rules, indexes
├── 6-CODE/                ← Code source functions
├── 7-GCP-BACKUP-INFO/    ← Metadata GCP
├── 8-OUTIL-SOS-EXPAT/    ← 2eme projet Firebase
├── 9-DASHBOARD-MULTIPRESTATAIRE/ ← Dashboard
├── 10-VPS-DATABASES/     ← Dumps PostgreSQL/MySQL du VPS
├── backup.log            ← Log d'execution
└── README.md             ← Documentation
```

**Frequence** : ~Daily (03h UTC)
**Retention** : 30 jours (auto-cleanup)
**Derniere execution** : 2026-03-26

#### C. Backups Specifiques par Projet VPS

| Projet | Script Backup | Methode | Frequence | Retention |
|--------|--------------|---------|-----------|-----------|
| Blog Frontend | `/scripts/backup.sh` | pg_dump gzip | Via scheduler container | 30j |
| Mission Control | `/deploy/backup.sh` + `/scripts/backup-to-local.sh` | pg_dump custom + SCP local | Daily 3h + local sync | 30j |
| Telegram Engine | Via script central PS1 | pg_dump via Docker exec | Daily (central) | 30j |
| WhatsApp Campaigns | Via script central PS1 | mysqldump via SSH | Daily (central) | 30j |
| Influenceurs Tracker | Via script central PS1 | mysqldump via SSH | Daily (central) | 30j |
| Offres Emploi | Via script central PS1 | pg_dump via SSH | Daily (central) | 30j |
| Motivation Engine | Via script central PS1 | pg_dump via SSH | Daily (central) | 30j |

### CE QUI MANQUE (LACUNES IDENTIFIEES)

| # | Lacune | Projet | Impact | Severite |
|---|--------|--------|--------|----------|
| 1 | **Backlink Engine — AUCUN backup PostgreSQL** | backlink-engine | Perte totale des prospects, templates, campagnes, stats | P0 CRITIQUE |
| 2 | **Partner Engine — AUCUN backup PostgreSQL** | partner_engine | Perte totale des partenaires, subscribers, agreements | P0 CRITIQUE |
| 3 | **App-Surveillance — AUCUN backup PostgreSQL** | app-surveillance | Perte des donnees de monitoring | P1 HAUTE |
| 4 | **Outil-sos-expat — Pas de backup Firestore dedie** | Outil-sos-expat | 2eme projet Firebase potentiellement non sauvegarde | P1 HAUTE |
| 5 | **Pas de backup pre-deploy dans les CI/CD** | Tous projets VPS | Migration ratee = perte de donnees sans rollback | P1 HAUTE |
| 6 | **Backups locaux sur 1 seul PC** | Sauvegardes/ | PC vole/casse = perte de tous les backups locaux | P1 HAUTE |
| 7 | **Pas de backup Cloudflare** | SOS principal | Perte DNS, Origin Rules, WAF rules, _headers | P2 MOYENNE |
| 8 | **Pas de backup Redis (tous projets)** | Tous | Perte cache, sessions, queues BullMQ | P2 MOYENNE |
| 9 | **Secrets backup = metadata seulement** | SOS Firebase | Les VRAIES valeurs des secrets ne sont pas sauvegardees | P2 MOYENNE |
| 10 | **backupStorageToDR retention = 24h** | SOS Firebase | Fichier supprime il y a 25h = irrecuperable | P2 MOYENNE |
| 11 | **RPO passe de 8h a 24h** | Firestore | Backup midday+evening desactives pour economiser | P2 MOYENNE |
| 12 | **Pas de backup GitHub Actions secrets** | Tous | Perte des secrets GitHub = deploy impossible | P2 MOYENNE |
| 13 | **Pas de verification automatique des backups locaux** | Sauvegardes/ | Backup corrompu non detecte | P2 MOYENNE |
| 14 | **Pas de backup Twilio config** (phone numbers, IVR) | SOS | Perte numero = clients ne peuvent plus appeler | P2 MOYENNE |
| 15 | **Pas de backup Stripe Connected Accounts** | SOS | Reconfiguration manuelle de chaque prestataire | P3 BASSE |

---

## Fichiers Cles a Lire OBLIGATOIREMENT

### Scripts de Backup
```
Sauvegardes/backup-tous-projets.ps1                              ← Script central (18KB) — LIRE EN ENTIER
Sauvegardes/CONFIGURER-BACKUP-AUTO.bat                           ← Configuration Windows Task Scheduler
sos/scripts/backup/backup-firebase.ps1                           ← Backup Firebase complet
sos/scripts/backup/auto-backup-smart.ps1                         ← Backup incremental intelligent
sos/scripts/backup/VERIFIER-BACKUP-SYSTEME.ps1                   ← Script de verification
Blog_sos-expat_frontend/scripts/backup.sh                        ← Backup PostgreSQL blog (dans container)
Outils_communication/Mission_control_sos-expat/deploy/backup.sh  ← Backup Mission Control
Outils_communication/Mission_control_sos-expat/scripts/backup-to-local.sh ← Sync local
```

### Fonctions Cloud de Backup
```
sos/firebase/functions/src/scheduled/multiFrequencyBackup.ts     ← Backup principal Firestore (daily 3h)
sos/firebase/functions/src/scheduled/backupAuth.ts               ← Backup Auth (daily 3h)
sos/firebase/functions/src/scheduled/backupStorageToDR.ts        ← DR Storage (daily 5h)
sos/firebase/functions/src/scheduled/crossRegionBackup.ts        ← Cross-region (weekly dim 4h)
sos/firebase/functions/src/scheduled/backupSecretsAndConfig.ts   ← Secrets metadata (monthly 1er 2h)
sos/firebase/functions/src/scheduled/disasterRecoveryTest.ts     ← DR test mensuel (1er 6h)
sos/firebase/functions/src/scheduled/quarterlyRestoreTest.ts     ← Test restore trimestriel (1er 2h)
sos/firebase/functions/src/admin/backupRestoreAdmin.ts           ← Admin restore (manuel)
sos/firebase/functions/src/admin/localBackupRegistry.ts          ← Registre backups locaux
```

### CI/CD Workflows (pas de backup pre-deploy)
```
sos-expat-project/.github/workflows/deploy-functions.yml          ← Firebase deploy (NO backup step)
Blog_sos-expat_frontend/.github/workflows/deploy.yml              ← Blog deploy SSH (NO backup step)
engine_telegram_sos_expat/.github/workflows/deploy.yml            ← Telegram deploy SSH (NO backup step)
partner_engine_sos_expat/.github/workflows/deploy.yml             ← Partner deploy SSH (NO backup step)
app-surveillance/.github/workflows/deploy.yml                     ← AppSurv deploy SSH (NO backup step)
```

### Docker Compose (containers DB)
```
engine_telegram_sos_expat/docker-compose.yml                      ← tg-postgres, tg-redis
Blog_sos-expat_frontend/docker-compose.yml                        ← blog-postgres, blog-redis
backlink-engine/docker-compose.yml                                ← bl-postgres, bl-redis
partner_engine_sos_expat/docker-compose.yml                       ← pe-postgres, pe-redis
app-surveillance/docker-compose.yml                               ← as-postgres
```

### Documentation Existante
```
sos/docs/06-OPERATIONS/BACKUP.md                                  ← Documentation backup (si existe)
sos/docs/06-OPERATIONS/DISASTER_RECOVERY.md                       ← DR procedures (si existe)
```

---

## Verifications Requises — Par Equipe

### EQUIPE A — Strategie RPO/RTO (experts 1-8)

**A1. Inventaire RPO/RTO Actuel**

Pour CHAQUE composant, calculer le RPO et RTO reels :

| Composant | RPO Actuel | RPO Cible | RTO Actuel | RTO Cible | Ecart |
|-----------|-----------|-----------|-----------|-----------|-------|
| Firestore (collections standard) | 24h (1 backup/jour) | 8h | ~1h (admin restore) | 1h | RPO trop long |
| Firestore (collections financieres) | 24h | 1h | ~1h | 1h | RPO trop long |
| Firebase Auth | 24h | 24h | ~30min | 30min | OK |
| Firebase Storage (photos, docs) | 24h (DR bucket) | 24h | ~2h | 2h | OK |
| PostgreSQL Telegram Engine | 24h (central script) | 24h | ~30min | 30min | OK |
| PostgreSQL Blog | 24h (backup.sh) | 24h | ~30min | 30min | OK |
| PostgreSQL Backlink Engine | **INFINI (pas de backup)** | 24h | **INFINI** | 30min | CRITIQUE |
| PostgreSQL Partner Engine | **INFINI (pas de backup)** | 24h | **INFINI** | 30min | CRITIQUE |
| PostgreSQL App-Surveillance | **INFINI (pas de backup)** | 24h | **INFINI** | 30min | CRITIQUE |
| Redis (tous projets) | **INFINI (pas de backup)** | Best effort | N/A | 5min (cold start) | Acceptable |
| Cloudflare config | **INFINI (pas de backup)** | Mensuel | Manuel | 1h | A creer |
| GitHub repos | Git (distribue) | Realtime | Minutes | Minutes | OK |
| Secrets/API keys | Metadata only | Valeurs reelles | Manuel | ~1h | A ameliorer |

**A2. Ordre de Restauration**
- [ ] Definir la sequence exacte de restauration : DNS → Cloudflare → Firebase Auth → Firestore → Storage → VPS → PostgreSQL → Redis → Apps → Tests
- [ ] Identifier les dependances : Auth AVANT Firestore (les rules dependent de l'auth)
- [ ] Estimer le temps total de restauration complete de tout l'ecosysteme

### EQUIPE B — Automatisation & Fiabilite (experts 9-16)

**B1. Script Central PowerShell**
- [ ] Lire `backup-tous-projets.ps1` en entier — couvre-t-il TOUS les projets ?
- [ ] Le Backlink Engine est-il inclus ? Le Partner Engine ? L'App-Surveillance ?
- [ ] Le Windows Task Scheduler est-il configure ? Frequence ? Heure ?
- [ ] Que se passe-t-il si le PC est eteint a l'heure du backup ? (rattrapage ?)
- [ ] Le script gere-t-il les erreurs ? (timeout SSH, espace disque plein, DB locked)
- [ ] Les logs sont-ils conserves et verifies ?

**B2. Fonctions Cloud de Backup**
- [ ] multiFrequencyBackup : les backups midday + evening sont DESACTIVES — impact RPO ?
- [ ] backupStorageToDR : retention 24h seulement — suffisant ?
- [ ] crossRegionBackup : passe de daily a weekly — impact DR ?
- [ ] Les alertes d'echec de backup sont-elles envoyees par Telegram ?
- [ ] Les backups Firestore sont-ils des exports natifs (gcloud firestore export) ou des lectures document par document ?

**B3. Backup Pre-Deploy**
- [ ] AUCUN des 5 workflows CI/CD n'a de step de backup avant deploy — risque majeur
- [ ] Proposer : `pg_dump` avant chaque `docker-compose up` dans les workflows
- [ ] Proposer : snapshot Firestore avant `firebase deploy --only functions`

**B4. Verification Automatique**
- [ ] disasterRecoveryTest.ts : couvre-t-il TOUS les composants ou seulement Firebase ?
- [ ] quarterlyRestoreTest.ts : teste-t-il la restauration PostgreSQL ou seulement Firestore ?
- [ ] Les backups locaux (PC) sont-ils verifies automatiquement ? (checksums, taille, completude)
- [ ] Y a-t-il une alerte si un backup n'a pas ete fait depuis > 48h ?

### EQUIPE C — Restauration (experts 17-24)

**C1. Playbook de Restauration Complete**
Pour CHAQUE scenario, definir le playbook exact :

**Scenario 1 : Restauration Firestore a une date**
```
1. Lister les backups disponibles : adminListBackups
2. Previsualiser : adminPreviewRestore (dry-run)
3. Creer pre-restore backup automatique
4. Restaurer : adminRestoreFirestore (avec confirmation code)
5. Verifier : counts, integrity, smoke tests
6. Rollback si probleme : restaurer le pre-restore backup
```
- [ ] Ce flow fonctionne-t-il reellement ? L'as-tu teste ?
- [ ] Le confirmation code est-il suffisamment securise ?
- [ ] Combien de temps prend une restauration complete (estimation) ?

**Scenario 2 : Restauration PostgreSQL a une date**
```
1. Identifier le dump le plus recent avant la date cible
2. Localiser : Sauvegardes/Sauv_{projet}/{date}/
3. Copier le dump sur le VPS
4. Stopper le container Docker de l'app
5. Restaurer : pg_restore ou psql < dump.sql
6. Redemarrer le container
7. Verifier : counts, integrite, fonctionnement
```
- [ ] Ce flow est-il documente quelque part ?
- [ ] Le format de dump (custom vs plain) permet-il la restauration selective (1 table) ?
- [ ] Les sequences PostgreSQL sont-elles correctement restaurees ?

**Scenario 3 : Restauration Firebase Auth**
```
1. Lister les backups Auth : GCS auth_backups/
2. Telecharger le JSON
3. Executer adminRestoreAuth
4. Verifier : nombre d'users, custom claims, providers
```
- [ ] Les mots de passe hashes sont-ils inclus dans le backup ? (Firebase Auth les hash avec scrypt)
- [ ] Les custom claims sont-elles restaurees ?
- [ ] Les providers OAuth (Google, Apple) sont-ils restaures ?

**Scenario 4 : Restauration complete apres hack total**
```
Temps estime : ???
Ordre :
1. Isoler : couper le VPS, desactiver Firebase Functions
2. Forensics : identifier l'etendue de la compromission
3. Nettoyer : nouveau VPS ou reinstallation
4. Restaurer DNS/Cloudflare
5. Restaurer Firebase Auth (users + claims)
6. Restaurer Firestore (toutes collections)
7. Restaurer Firebase Storage (photos, docs)
8. Restaurer VPS : Docker + PostgreSQL dumps
9. Restaurer Redis (rebuild cache)
10. Re-deployer le code (git pull + docker-compose up)
11. Regenerer les secrets compromis
12. Verifier tous les services
13. Rouvrir le trafic
```
- [ ] Ce playbook est-il documente ?
- [ ] Combien de temps chaque etape prend-elle ?
- [ ] Qui est responsable de chaque etape ?

### EQUIPE D — Securite des Sauvegardes (experts 25-32)

**D1. Chiffrement**
- [ ] Les backups GCS sont-ils chiffres at rest ? (Google default ou CMEK ?)
- [ ] Les dumps PostgreSQL locaux sont-ils chiffres ? (gpg, openssl ?)
- [ ] Le dossier `Sauvegardes/` sur le PC est-il chiffre ? (BitLocker ?)
- [ ] Les backups en transit (SSH/SCP depuis VPS) utilisent-ils un canal chiffre ?

**D2. Acces**
- [ ] Qui a acces au bucket GCS `sos-expat-backup-dr` ?
- [ ] Le service account Firebase a-t-il les permissions MINIMALES ?
- [ ] Les backups locaux sont-ils accessibles a d'autres utilisateurs du PC ?
- [ ] Le script SSH dans le PS1 utilise-t-il une cle SSH ou un mot de passe ?

**D3. Immutabilite**
- [ ] Les backups GCS ont-ils Object Lock ou retention policy ?
- [ ] Un attaquant avec acces admin Firebase peut-il supprimer les backups ?
- [ ] Un ransomware sur le PC peut-il chiffrer le dossier Sauvegardes ?
- [ ] Y a-t-il un backup hors-ligne (USB, disque externe) ?

**D4. Regle 3-2-1**
La regle 3-2-1 : 3 copies, 2 supports differents, 1 hors-site.
- [ ] 3 copies : GCS primary + GCS DR + Local PC = 3 copies ? Verifier pour CHAQUE composant
- [ ] 2 supports : Cloud + Local = OK ? Mais les 2 clouds sont chez Google — est-ce suffisant ?
- [ ] 1 hors-site : Le PC est-il geographiquement separe du VPS ? Du datacenter Google ?

### EQUIPE E — Sauvegarde par Projet (experts 33-46)

Pour CHAQUE projet, verifier la completude :

**E1. SOS Firebase (sos-urgently-ac307)**
- [ ] Firestore : TOUTES les collections sont-elles dans multiFrequencyBackup ? Lister les collections exclues
- [ ] Auth : Le backup quotidien capture-t-il les users crees APRES 3h et AVANT le prochain backup ?
- [ ] Storage : Les fichiers uploades apres 5h sont-ils sauvegardes avant le prochain run ?
- [ ] Cloud Functions code : est-il sauvegarde ? (git suffisant ?)
- [ ] Firestore indexes : sont-ils sauvegardes ? (firestore.indexes.json)
- [ ] Firestore security rules : sauvegardees dans 5-RULES ?
- [ ] Storage security rules : sauvegardees ?
- [ ] Cloud Tasks queues config : sauvegardees ?
- [ ] Cloud Scheduler jobs : sauvegardes ?

**E2. Outil-sos-expat (outils-sos-expat)**
- [ ] Ce 2eme projet Firebase a-t-il son PROPRE backup Firestore ?
- [ ] Ses Firestore rules sont-elles sauvegardees ?
- [ ] Ses Storage rules sont-elles sauvegardees ?
- [ ] Ses Cloud Functions sont-elles sauvegardees ?
- [ ] Est-il inclus dans le dossier `8-OUTIL-SOS-EXPAT/` du script central ?

**E3. Backlink Engine — CRITIQUE : AUCUN BACKUP**
- [ ] Combien de donnees sont dans PostgreSQL bl-postgres ? (prospects, templates, campagnes, stats)
- [ ] Combien de donnees seraient perdues si le container crash ?
- [ ] Proposer : ajouter pg_dump dans le script central PS1
- [ ] Proposer : ajouter un cron dans le container ou un backup.sh
- [ ] Redis bl-redis : des donnees BullMQ importantes ?

**E4. Partner Engine — CRITIQUE : AUCUN BACKUP**
- [ ] Meme questions que E3 pour pe-postgres
- [ ] Donnees subscribers, agreements, partner profiles : critiques ?

**E5. App-Surveillance — AUCUN BACKUP**
- [ ] Donnees de monitoring : critiques ou reconstructibles ?
- [ ] Proposer : ajouter au script central PS1

### EQUIPE F — Infrastructure & Cloud (experts 47-54)

**F1. Ce qui n'est PAS sauvegarde et devrait l'etre**

| Element | Localisation | Critique ? | Solution |
|---------|-------------|-----------|----------|
| Cloudflare DNS records | Cloudflare dashboard | Oui — site inaccessible sans DNS | Export zone file mensuel |
| Cloudflare Origin Rules | Cloudflare dashboard | Oui — routing SPA/Blog casse | Documenter + exporter |
| Cloudflare WAF rules | Cloudflare dashboard | Oui — protection perdue | Exporter via API |
| Cloudflare _redirects | Git (public/_redirects) | OK (dans git) | OK |
| Cloudflare _headers | Git (public/_headers) | OK (dans git) | OK |
| GitHub Actions secrets | GitHub Settings | Oui — deploy impossible sans | Documenter dans vault securise |
| GitHub branch protection | GitHub Settings | Non | N/A |
| Twilio phone numbers | Twilio console | Oui — numero perdu = clients perdus | Documenter |
| Twilio IVR config | Code (twilioWebhooks.ts) | OK (dans git) | OK |
| Stripe Connected Accounts | Stripe dashboard | Moyen — reconfiguration longue | Exporter liste |
| Stripe webhook endpoints | Stripe dashboard | Oui — paiements cassent | Documenter |
| PayPal webhook config | PayPal dashboard | Oui | Documenter |
| Wise webhook config | Wise dashboard | Oui | Documenter |
| Domain registrar config | OVH/Gandi/etc | Oui — perte domaine = catastrophe | Documenter + verrouiller transfert |
| Let's Encrypt certs | VPS /etc/letsencrypt | Auto-renew — pas critique | OK |
| VPS crontab | VPS /var/spool/cron | Moyen | Exporter crontab -l |
| VPS iptables/ufw | VPS /etc | Moyen | Exporter regles |
| Docker volumes | VPS /var/lib/docker | Oui — donnees DB | pg_dump couvre |

**F2. Verifier la completude du dossier `10-VPS-DATABASES/`**
- [ ] Contient-il les dumps de TOUS les projets VPS ? Lister exactement ce qu'il contient
- [ ] Le Backlink Engine y est-il ?
- [ ] Le Partner Engine y est-il ?
- [ ] L'App-Surveillance y est-il ?

### EQUIPE G — Scenarios de Desastre (experts 55-60)

**G1. Scenario : Hack Total (VPS + Firebase)**
```
Hypothese : Un attaquant a compromis le VPS ET le compte Firebase.
- Il a supprime toutes les bases PostgreSQL
- Il a modifie les Firestore security rules pour allow all
- Il a supprime des collections Firestore
- Il a change les DNS Cloudflare
- Il a revoque les API keys

Questions :
- [ ] Pouvez-vous tout restaurer a J-1 ? Listez chaque etape.
- [ ] Temps total estime ?
- [ ] Quelles donnees sont irrecuperables ?
- [ ] Les backups eux-memes sont-ils compromis ? (si l'attaquant a acces au bucket GCS ?)
```

**G2. Scenario : Ransomware sur le PC**
```
Hypothese : Le PC est chiffre par un ransomware.
- Le dossier Sauvegardes/ est chiffre
- Le dossier Projets/VS_CODE/ est chiffre
- Les cles SSH locales sont compromises

Questions :
- [ ] Les backups GCS (cloud) sont-ils toujours accessibles ?
- [ ] Pouvez-vous restaurer depuis un autre PC ?
- [ ] Les repos GitHub sont-ils suffisants pour reconstruire le code ?
- [ ] Le VPS est-il impacte ? (si les cles SSH sont compromises → oui)
```

**G3. Scenario : Suppression accidentelle d'une collection Firestore**
```
Hypothese : Un admin supprime accidentellement la collection "users" (ou "payments").
- Detecte apres 4 heures

Questions :
- [ ] Le backup quotidien (3h) a-t-il capture les donnees avant la suppression ?
- [ ] Si la suppression a eu lieu a 2h (avant le backup), les donnees sont-elles perdues ?
- [ ] Firestore PITR (Point-in-Time Recovery) est-il active ? (permet restauration a la minute)
- [ ] Le pre-restore backup automatique protege-t-il contre ce scenario ?
```

**G4. Scenario : Corruption silencieuse (donnees corrompues pendant 7 jours)**
```
Hypothese : Une regression dans le code corrompt les soldes des utilisateurs pendant 7 jours sans detection.
- Les backups des 7 derniers jours contiennent des donnees corrompues

Questions :
- [ ] Les backups a 30 jours permettent-ils de trouver le dernier etat sain ?
- [ ] Peut-on restaurer UNIQUEMENT la collection "users" sans toucher aux "payments" ?
- [ ] Les backups financiers (retention indefinie) servent-ils de reference ?
```

**G5. Scenario : Perte complete du VPS Hetzner**
```
Hypothese : Le VPS est irrecuperable (panne materielle, datacenter fire).
- 5 projets Docker perdus
- 5+ bases PostgreSQL/MySQL perdues
- Toutes les configurations Docker perdues

Questions :
- [ ] Nouveau VPS : combien de temps pour reinstaller Docker + 5 projets ?
- [ ] Les dumps DB sont-ils sur le PC local ET sur le cloud ?
- [ ] Les docker-compose.yml sont-ils dans git ? (oui — donc reconstructibles)
- [ ] Les .env de production sont-ils sauvegardes ? (la plupart ne sont PAS dans git — probleme !)
```

**G6. Scenario : Perte du PC**
```
Hypothese : Le PC est vole. Le dossier Sauvegardes/ est perdu.
- Plus de backups locaux
- Plus de scripts de backup
- Plus de cles SSH locales

Questions :
- [ ] Les backups cloud (GCS) sont-ils suffisants pour tout restaurer ?
- [ ] Les repos GitHub contiennent-ils tout le code necessaire ?
- [ ] Les secrets de production sont-ils recuperables sans le PC ?
- [ ] Le Windows Task Scheduler doit etre reconfigure — est-ce documente ?
```

---

## Format de Reponse

### Phase 1 — Matrice de Couverture Backup

Pour CHAQUE composant de l'ecosysteme, remplir :

```
| Composant | Donnees | Backup Cloud | Backup Local | Backup Pre-Deploy | RPO | RTO | Verification | Score /10 |
|-----------|---------|-------------|-------------|-------------------|-----|-----|-------------|-----------|
| Firestore standard | Collections users, profiles, calls... | GCS daily 3h | Sauv_sos_expat/ | Non | 24h | 1h | DR test mensuel | 8 |
| Firestore financier | payments, invoices, transfers | GCS daily 3h (indefini) | Sauv_sos_expat/ | Non | 24h | 1h | DR test | 9 |
| Firebase Auth | Users, claims | GCS daily 3h | Sauv_sos_expat/3-AUTH/ | Non | 24h | 30min | DR test | 8 |
| Firebase Storage | Photos, docs, factures | GCS DR daily 5h | Sauv_sos_expat/2-STORAGE/ | Non | 24h | 2h | DR test | 7 |
| PostgreSQL Telegram | Messages, events, bots | Via central PS1 | Sauv_telegram_engine/ | Non | 24h | 30min | Non | 6 |
| PostgreSQL Blog | Articles, translations, FAQs | backup.sh + central PS1 | Sauv_sos_expat/10-VPS/ | Non | 24h | 30min | Non | 7 |
| PostgreSQL Backlink | Prospects, templates, stats | AUCUN | AUCUN | Non | INFINI | INFINI | Non | 0 |
| PostgreSQL Partner | Partners, subscribers | AUCUN | AUCUN | Non | INFINI | INFINI | Non | 0 |
| PostgreSQL AppSurv | Monitoring data | AUCUN | AUCUN | Non | INFINI | INFINI | Non | 0 |
| Redis (tous) | Cache, sessions, queues | AUCUN | AUCUN | Non | N/A | 5min | N/A | N/A |
| Cloudflare config | DNS, rules, WAF | AUCUN | AUCUN | Non | INFINI | 1h | Non | 0 |
| Secrets (valeurs) | API keys, passwords | Metadata only | Partial (.env) | Non | Manuel | 1h+ | Non | 3 |
| GitHub repos | Code source | Git (distribue) | Local clone | N/A | Realtime | Minutes | Automatique | 10 |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |
```

### Phase 2 — Lacunes Critiques & Corrections

Pour chaque lacune :
```
## LACUNE L{N}

**Severite** : P0 CRITIQUE / P1 HAUTE / P2 MOYENNE
**Composant** : [nom]
**Donnees en risque** : [description precise]
**Volume estime** : [nombre de lignes/documents/fichiers]
**Impact si perte** : [consequence business]
**RPO actuel** : [INFINI si pas de backup]

**Solution proposee** :
- Script/commande exacte a ajouter
- Fichier a modifier
- Frequence recommandee
- Destination du backup
- Verification proposee

**Implementation** :
```bash
# Code exact a copier-coller
```

**Integration dans le script central** :
```powershell
# Lignes a ajouter dans backup-tous-projets.ps1
```
```

### Phase 3 — Playbook de Restauration Complete

Pour CHAQUE scenario de desastre (G1-G6), fournir un playbook detaille :
```
## PLAYBOOK : [Nom du scenario]

**Temps total estime** : Xh Xmin
**Pre-requis** : [ce dont vous avez besoin avant de commencer]

| Etape | Action | Commande | Temps | Responsable |
|-------|--------|----------|-------|-------------|
| 1 | Isoler le systeme | ... | 5min | Admin |
| 2 | Evaluer les degats | ... | 15min | Admin |
| ... | ... | ... | ... | ... |

**Verification post-restauration** :
- [ ] Check 1 : ...
- [ ] Check 2 : ...

**Donnees irrecuperables** : [liste]
```

### Phase 4 — Plan d'Action Priorise (Top 20)

```
| # | Action | Severite | Effort | Impact | Dependances |
|---|--------|----------|--------|--------|-------------|
| 1 | Ajouter backup Backlink Engine dans PS1 | P0 | 30min | Protege 100% des prospects | Aucune |
| 2 | Ajouter backup Partner Engine dans PS1 | P0 | 30min | Protege partenaires | Aucune |
| 3 | Ajouter backup pre-deploy dans CI/CD | P1 | 2h | Protege contre migrations ratees | Test |
| 4 | Copier backups locaux vers un cloud secondaire | P1 | 1h | Regle 3-2-1 | Choix provider |
| ... | ... | ... | ... | ... | ... |
```

### Phase 5 — Script de Verification Automatique

Proposer un script qui verifie QUOTIDIENNEMENT que TOUS les backups sont :
- Presents (fichier existe)
- Recents (< 48h)
- Non-vides (taille > seuil minimum)
- Integres (checksum si disponible)
- Complets (nombre de collections/tables attendu)

Et qui envoie une **alerte Telegram** via `forwardEventToEngine()` si un backup est manquant ou suspect.

---

## Contraintes Critiques

- **7 projets** dont 5 avec bases de donnees PostgreSQL/MySQL
- **2 projets Firebase** (sos-urgently-ac307 + outils-sos-expat)
- **1 seul VPS** Hetzner pour 5+ projets Docker
- **1 seul PC** pour les backups locaux (Windows, dossier `Sauvegardes/`)
- **Donnees financieres** soumises a retention legale de **10 ans** (France/EU)
- **GDPR** : droit a l'oubli doit fonctionner MEME dans les backups
- **197 pays** d'utilisateurs — les backups doivent couvrir TOUTES les langues et donnees
- **Budget** : les optimisations de cout ont deja reduit certains backups (midday/evening desactives, cross-region passe a weekly)
- **RPO cible** : 24h maximum pour tout, 8h ideal pour Firestore
- **RTO cible** : < 2 heures pour une restauration complete de tout l'ecosysteme
- **Aucune regression** : les backups existants ne doivent pas etre casses par les ameliorations
- **3 bots Telegram** disponibles pour les alertes d'echec de backup

---

## Instructions Finales

1. **Lisez le script central `backup-tous-projets.ps1` en entier** — identifiez ce qu'il couvre et ce qu'il oublie
2. **Verifiez le dossier `Sauvegardes/`** — listez exactement ce qui est present pour chaque projet
3. **Lisez CHAQUE fonction de backup Firebase** — verifiez les collections couvertes, exclues, les retentions
4. **Lisez CHAQUE workflow CI/CD** — confirmez l'absence de backup pre-deploy
5. **Simulez chaque scenario de desastre** (G1-G6) — identifiez les trous
6. **Proposez les corrections EXACTES** : code PowerShell, bash, TypeScript a ajouter
7. **Verifiez la coherence** : les backups cloud et locaux couvrent-ils les MEMES donnees ?
8. **Calculez le RPO/RTO reel** pour chaque composant — pas le theorique, le REEL base sur les scripts
9. **Proposez un systeme d'alerte** quand un backup echoue (via Telegram Engine)
10. **La regle 3-2-1 doit etre respectee** pour CHAQUE composant critique

*Commencez l'audit. Lisez les scripts. Simulez les desastres. Garantissez que TOUT peut etre restaure.*
