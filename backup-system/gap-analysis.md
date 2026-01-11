# ANALYSE DES LACUNES (GAP ANALYSIS) - SOS EXPAT

**Date:** 2026-01-11
**Projet:** sos-urgently-ac307

---

## RESUME EXECUTIF

Le systeme de backup existant est **tres complet (85% de couverture)**. Cette analyse identifie les 15% manquants et propose des solutions concretes.

| Categorie | Couverture Actuelle | Cible | Gap |
|-----------|---------------------|-------|-----|
| Firestore Data | 100% | 100% | 0% |
| Firebase Auth | 100% | 100% | 0% |
| Cloud Storage | 90% | 100% | 10% |
| Security Rules | 100% | 100% | 0% (RESOLU) |
| Secrets/Config | 0% | 100% | **100%** |
| External Integrations | 10% | 80% | **70%** |
| Documentation | 60% | 100% | 40% |

---

## GAP 1: REGLES DE SECURITE - CORRIGE

### Situation Actuelle (Mise a jour)

| Fichier | Reference | Statut |
|---------|-----------|--------|
| `firestore.rules` | firebase.json ligne 17 | **PRESENT** (1537 lignes) |
| `storage.rules` | firebase.json ligne 20 | **PRESENT** (177 lignes) |
| `firestore.indexes.json` | firebase.json ligne 18 | A verifier |

### Resolution

Les fichiers de regles **existent et sont complets** dans `sos/`:
- `sos/firestore.rules` - Regles detaillees pour 100+ collections
- `sos/storage.rules` - Regles pour tous les dossiers Storage

### Priorite: **RESOLU** - Aucune action requise

---

## GAP 2: SECRETS ET CONFIGURATION

### Situation Actuelle

| Secret | Stockage | Backup |
|--------|----------|--------|
| Stripe API Keys | Firebase Functions Config | NON |
| PayPal Credentials | Firebase Functions Config | NON |
| Twilio Credentials | Firebase Functions Config | NON |
| Encryption Key | Firebase Functions Config | NON |
| SMTP Credentials | Firebase Functions Config | NON |
| Google Maps API | Environment | NON |

### Impact

| Risque | Severite |
|--------|----------|
| Application non fonctionnelle apres incident | CRITIQUE |
| Temps de recuperation augmente | HAUTE |
| Perte de cles = regeneration necessaire | MOYENNE |

### Solution Proposee

**Option A: Export chiffre vers Cloud Storage**

```bash
# Exporter la configuration Firebase
firebase functions:config:get > .firebase-config.json

# Chiffrer avec Cloud KMS ou openssl
openssl enc -aes-256-cbc -salt -in .firebase-config.json \
  -out secrets-backup-$(date +%Y%m%d).enc -k $ENCRYPTION_PASSWORD

# Upload vers bucket securise
gsutil cp secrets-backup-*.enc gs://sos-expat-secrets-backup/
```

**Option B: Google Secret Manager**

```typescript
// Migration vers Secret Manager (recommande)
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// Stocker les secrets dans Secret Manager
// Backup automatique inclus
// Rotation des cles facilitee
```

**Option C: Document securise (minimum)**

```markdown
# Document CONFIDENTIEL - Secrets SOS-Expat

## Stripe
- Publishable Key: pk_live_xxx...
- Secret Key: sk_live_xxx... (dans 1Password/Bitwarden)

## PayPal
- Client ID: xxx...
- Secret: xxx... (dans 1Password/Bitwarden)

## Twilio
- Account SID: xxx...
- Auth Token: xxx... (dans 1Password/Bitwarden)
```

### Effort Estime

| Action | Temps |
|--------|-------|
| Export manuel chiffre | 1 heure |
| Migration Secret Manager | 1 jour |
| Documentation secrets | 2 heures |

### Priorite: **P1 - URGENT**

---

## GAP 3: CONFIGURATION SERVICES EXTERNES

### Stripe

| Element | Documente | Sauvegarde |
|---------|-----------|------------|
| Webhooks endpoints | NON | NON |
| Produits configures | NON | NON |
| Prix (price IDs) | NON | NON |
| Configuration Connect | NON | NON |

**Solution:**

```bash
# Exporter via Stripe CLI
stripe products list --limit 100 > stripe-products.json
stripe prices list --limit 100 > stripe-prices.json
stripe webhooks endpoints list > stripe-webhooks.json
```

### PayPal

| Element | Documente | Sauvegarde |
|---------|-----------|------------|
| Webhooks | NON | NON |
| Partner referrals | NON | NON |
| Payout config | NON | NON |

**Solution:**

```bash
# Documenter manuellement depuis dashboard PayPal
# Pas d'export CLI officiel
```

### Twilio

| Element | Documente | Sauvegarde |
|---------|-----------|------------|
| Phone numbers | NON | NON |
| TwiML Apps | NON | NON |
| Webhooks | NON | NON |
| SIP domains | NON | NON |

**Solution:**

```bash
# Exporter via Twilio CLI
twilio phone-numbers:list > twilio-numbers.json
twilio api:core:applications:list > twilio-apps.json
```

### Effort Estime

| Service | Temps |
|---------|-------|
| Stripe export | 30 min |
| PayPal documentation | 1 heure |
| Twilio export | 30 min |
| Automatisation | 1 jour |

### Priorite: **P1 - URGENT**

---

## GAP 4: BUCKET DR NON VERIFIE

### Situation Actuelle

Le code reference `sos-expat-backup-dr` mais son existence n'est pas verifiee.

```typescript
// crossRegionBackup.ts ligne 29
DR_BUCKET: process.env.DR_BACKUP_BUCKET || "sos-expat-backup-dr",
```

### Impact

Si le bucket n'existe pas:
- Backups DR echouent silencieusement
- Pas de protection cross-region
- SPOF regional

### Solution

```bash
# Verifier l'existence
gsutil ls -b gs://sos-expat-backup-dr

# Si n'existe pas, creer
gsutil mb -l europe-west3 -c standard gs://sos-expat-backup-dr

# Configurer lifecycle pour retention
gsutil lifecycle set lifecycle-config.json gs://sos-expat-backup-dr
```

### Priorite: **P1 - URGENT**

---

## GAP 5: FREQUENCE BACKUP AUTH INSUFFISANTE

### Situation Actuelle

| Metrique | Valeur Actuelle | Cible |
|----------|-----------------|-------|
| Frequence | Hebdomadaire | Quotidienne |
| RPO | 7 jours | 24 heures |

### Impact

En cas de perte Auth entre backups:
- Jusqu'a 7 jours de nouveaux utilisateurs perdus
- Custom claims non sauvegardes
- Restauration incomplete

### Solution

```typescript
// Modifier backupAuth.ts
export const dailyAuthBackup = onSchedule(
  {
    schedule: '0 2 * * *', // Quotidien a 2h
    timeZone: 'Europe/Paris',
    // ...
  },
  async () => { /* ... */ }
);
```

### Priorite: **P2 - IMPORTANT**

---

## GAP 6: CLOUD TASKS/SCHEDULER NON DOCUMENTES

### Situation Actuelle

| Service | Configuration | Sauvegarde |
|---------|---------------|------------|
| Cloud Tasks | Queues configurees | NON |
| Cloud Scheduler | Jobs via code | Partiel |
| Pub/Sub | Topics | NON |

### Solution

```bash
# Exporter Cloud Tasks
gcloud tasks queues list --format=json > cloud-tasks-queues.json

# Exporter Cloud Scheduler
gcloud scheduler jobs list --format=json > cloud-scheduler-jobs.json
```

### Priorite: **P3 - SOUHAITABLE**

---

## GAP 7: DOCUMENTATION RESTAURATION INCOMPLETE

### Situation Actuelle

- Procedures dans le code (bien)
- Pas de runbook unifie
- Pas de checklist d'urgence

### Solution

Creer `disaster-recovery.md` avec:
1. Contacts d'urgence
2. Checklist de restauration
3. Procedures pas-a-pas
4. Temps estimes
5. Verification post-restauration

### Priorite: **P2 - IMPORTANT**

---

## MATRICE DE PRIORISATION

| Gap | Impact | Effort | Priorite | Deadline |
|-----|--------|--------|----------|----------|
| Regles securite | CRITIQUE | Faible | **P0** | Immediat |
| Bucket DR | CRITIQUE | Faible | **P1** | 24h |
| Secrets | HAUTE | Moyen | **P1** | 48h |
| Integrations | HAUTE | Moyen | **P1** | 1 semaine |
| Auth frequence | MOYENNE | Faible | **P2** | 2 semaines |
| Documentation | MOYENNE | Moyen | **P2** | 2 semaines |
| Cloud config | BASSE | Faible | **P3** | 1 mois |

---

## PLAN D'ACTION IMMEDIAT

### Jour 1 (Aujourd'hui)

| Heure | Action | Responsable |
|-------|--------|-------------|
| +0h | Exporter firestore.rules et storage.rules | Admin |
| +0h | Commiter dans Git | Admin |
| +1h | Verifier bucket DR existe | Admin |
| +2h | Creer bucket DR si necessaire | Admin |

### Jour 2

| Action | Temps |
|--------|-------|
| Exporter Firebase Functions config | 30 min |
| Chiffrer et sauvegarder | 30 min |
| Documenter les secrets | 1 heure |

### Semaine 1

| Action | Temps |
|--------|-------|
| Exporter config Stripe | 30 min |
| Documenter PayPal | 1 heure |
| Exporter config Twilio | 30 min |
| Creer disaster-recovery.md | 2 heures |

### Semaine 2

| Action | Temps |
|--------|-------|
| Augmenter frequence Auth backup | 30 min |
| Tester restauration complete | 2 heures |
| Documenter procedures | 2 heures |

---

## COUT DE RESOLUTION

| Gap | Cout One-time | Cout Mensuel |
|-----|---------------|--------------|
| Regles securite | $0 | $0 |
| Bucket DR | $0 | ~$1-2 |
| Secrets backup | $0-50 | $0-5 |
| Integrations doc | $0 | $0 |
| Auth frequence | $0 | ~$0.50 |
| **Total** | **$0-50** | **~$2-8** |

---

## VERIFICATION POST-RESOLUTION

### Checklist de Validation

- [ ] firestore.rules existe dans Git
- [ ] storage.rules existe dans Git
- [ ] Bucket DR accessible
- [ ] Test backup DR reussi
- [ ] Secrets documentes et sauvegardes
- [ ] Config Stripe exportee
- [ ] Config PayPal documentee
- [ ] Config Twilio exportee
- [ ] Auth backup quotidien actif
- [ ] disaster-recovery.md cree
- [ ] Test restauration complete OK

### KPIs a Suivre

| Metrique | Avant | Apres | Cible |
|----------|-------|-------|-------|
| Couverture backup | 85% | 98% | 95%+ |
| RPO Firestore | 8h | 8h | 8h |
| RPO Auth | 7j | 24h | 24h |
| RTO estime | 2h | 1h | 1h |
| Documentation | 60% | 95% | 95%+ |

---

**Document genere:** 2026-01-11
**Version:** 1.0
