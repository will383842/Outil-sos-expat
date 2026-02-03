# BACKUP CONFIGURATION GCP - CLOUD TASKS & IAM - SOS EXPAT

**Date:** 2026-02-03
**Projet:** sos-urgently-ac307
**Région:** europe-west1
**Version:** 1.0

---

## 1. CLOUD TASKS CONFIGURATION

### Console URL
https://console.cloud.google.com/cloudtasks?project=sos-urgently-ac307

### Queues Configurées

#### Queue Principale: call-scheduler-queue
```yaml
Queue Name: call-scheduler-queue
Location: europe-west1
State: RUNNING

Rate Limits:
  Max Dispatches Per Second: 500
  Max Concurrent Dispatches: 1000

Retry Config:
  Max Attempts: 5
  Min Backoff: 0.1s
  Max Backoff: 3600s
  Max Doublings: 16

Target:
  Type: HTTP
  Service: Cloud Functions
```

### Script d'Export Cloud Tasks
```bash
#!/bin/bash
# gcp-cloudtasks-export.sh

PROJECT_ID="sos-urgently-ac307"
LOCATION="europe-west1"
DATE=$(date +%Y%m%d)
BACKUP_DIR="./gcp_backup_$DATE"

mkdir -p $BACKUP_DIR

# Lister toutes les queues
gcloud tasks queues list \
  --project=$PROJECT_ID \
  --location=$LOCATION \
  --format=json > "$BACKUP_DIR/cloud_tasks_queues.json"

# Détails de chaque queue
for queue in $(gcloud tasks queues list --project=$PROJECT_ID --location=$LOCATION --format="value(name)"); do
  queue_name=$(basename $queue)
  gcloud tasks queues describe $queue_name \
    --project=$PROJECT_ID \
    --location=$LOCATION \
    --format=json > "$BACKUP_DIR/queue_${queue_name}.json"
done

echo "Export Cloud Tasks terminé dans $BACKUP_DIR"
```

### Procédure de Restauration Cloud Tasks
```bash
# Recréer la queue call-scheduler-queue
gcloud tasks queues create call-scheduler-queue \
  --project=sos-urgently-ac307 \
  --location=europe-west1 \
  --max-dispatches-per-second=500 \
  --max-concurrent-dispatches=1000 \
  --max-attempts=5 \
  --min-backoff=0.1s \
  --max-backoff=3600s
```

---

## 2. CLOUD SCHEDULER JOBS

### Console URL
https://console.cloud.google.com/cloudscheduler?project=sos-urgently-ac307

### Jobs Configurés (via Cloud Functions)

Les jobs sont définis dans le code des Cloud Functions avec `onSchedule()`. Ils sont automatiquement créés lors du déploiement.

| Job | Schedule | Timezone | Function |
|-----|----------|----------|----------|
| morningBackup | 0 3 * * * | Europe/Paris | multiFrequencyBackup |
| backupFirebaseAuth | 0 3 * * * | Europe/Paris | backupAuth |
| dailyCrossRegionBackup | 0 4 * * 0 | Europe/Paris | crossRegionBackup |
| cleanupOldBackups | 0 4 * * 0 | Europe/Paris | multiFrequencyBackup |
| cleanupDRBackups | 0 5 * * 1 | Europe/Paris | crossRegionBackup |
| backupStorageToDR | 0 5 * * * | Europe/Paris | backupStorageToDR |
| runMonthlyDRTest | 0 6 1 * * | Europe/Paris | disasterRecoveryTest |
| quarterlyRestoreTest | 0 2 1 1,4,7,10 * | Europe/Paris | quarterlyRestoreTest |
| monthlySecretsConfigBackup | 0 2 1 * * | Europe/Paris | backupSecretsAndConfig |

### Script d'Export Cloud Scheduler
```bash
#!/bin/bash
# gcp-scheduler-export.sh

PROJECT_ID="sos-urgently-ac307"
LOCATION="europe-west1"
DATE=$(date +%Y%m%d)
BACKUP_DIR="./gcp_backup_$DATE"

mkdir -p $BACKUP_DIR

# Lister tous les jobs
gcloud scheduler jobs list \
  --project=$PROJECT_ID \
  --location=$LOCATION \
  --format=json > "$BACKUP_DIR/scheduler_jobs.json"

echo "Export Cloud Scheduler terminé dans $BACKUP_DIR"
```

---

## 3. IAM CONFIGURATION

### Console URL
https://console.cloud.google.com/iam-admin/iam?project=sos-urgently-ac307

### Service Accounts Principaux

#### 1. Firebase Admin SDK Service Account
```
Email: firebase-adminsdk-xxxxx@sos-urgently-ac307.iam.gserviceaccount.com
Roles:
  - Firebase Admin SDK Administrator Service Agent
  - Cloud Datastore User
  - Storage Admin
```

#### 2. Cloud Functions Service Account
```
Email: sos-urgently-ac307@appspot.gserviceaccount.com
Roles:
  - Cloud Functions Service Agent
  - Cloud Tasks Enqueuer
  - Secret Manager Secret Accessor
  - Storage Object Admin
```

#### 3. Cloud Run Service Account (Twilio Webhooks)
```
Email: [service-account]@sos-urgently-ac307.iam.gserviceaccount.com
Roles:
  - Cloud Run Invoker
```

### Script d'Export IAM
```bash
#!/bin/bash
# gcp-iam-export.sh

PROJECT_ID="sos-urgently-ac307"
DATE=$(date +%Y%m%d)
BACKUP_DIR="./gcp_backup_$DATE"

mkdir -p $BACKUP_DIR

# Exporter la policy IAM du projet
gcloud projects get-iam-policy $PROJECT_ID \
  --format=json > "$BACKUP_DIR/iam_policy.json"

# Lister les service accounts
gcloud iam service-accounts list \
  --project=$PROJECT_ID \
  --format=json > "$BACKUP_DIR/service_accounts.json"

# Pour chaque service account, exporter les clés (metadata seulement)
for sa in $(gcloud iam service-accounts list --project=$PROJECT_ID --format="value(email)"); do
  sa_name=$(echo $sa | cut -d'@' -f1)
  gcloud iam service-accounts keys list \
    --iam-account=$sa \
    --format=json > "$BACKUP_DIR/sa_keys_${sa_name}.json"
done

echo "Export IAM terminé dans $BACKUP_DIR"
```

### Procédure de Restauration IAM

#### Restaurer un Service Account
```bash
# Créer le service account
gcloud iam service-accounts create [SA_NAME] \
  --project=sos-urgently-ac307 \
  --display-name="[Display Name]"

# Attribuer les rôles
gcloud projects add-iam-policy-binding sos-urgently-ac307 \
  --member="serviceAccount:[SA_EMAIL]" \
  --role="roles/[ROLE_NAME]"
```

---

## 4. SECRET MANAGER

### Console URL
https://console.cloud.google.com/security/secret-manager?project=sos-urgently-ac307

### Secrets Configurés

| Secret Name | Service | Dernière Version |
|-------------|---------|------------------|
| STRIPE_SECRET_KEY | Stripe | [Date] |
| STRIPE_WEBHOOK_SECRET | Stripe | [Date] |
| TWILIO_ACCOUNT_SID | Twilio | [Date] |
| TWILIO_AUTH_TOKEN | Twilio | [Date] |
| ENCRYPTION_KEY | Internal | [Date] |
| EMAIL_USER | Email | [Date] |
| EMAIL_PASS | Email | [Date] |
| MAILWIZZ_API_KEY | Marketing | [Date] |
| OUTIL_API_KEY | Outil | [Date] |

### Script d'Export Secrets (Metadata Only)
```bash
#!/bin/bash
# gcp-secrets-export.sh
# ATTENTION: N'exporte PAS les valeurs des secrets

PROJECT_ID="sos-urgently-ac307"
DATE=$(date +%Y%m%d)
BACKUP_DIR="./gcp_backup_$DATE"

mkdir -p $BACKUP_DIR

# Lister les secrets (sans les valeurs)
gcloud secrets list \
  --project=$PROJECT_ID \
  --format=json > "$BACKUP_DIR/secrets_list.json"

# Pour chaque secret, lister les versions (sans les valeurs)
for secret in $(gcloud secrets list --project=$PROJECT_ID --format="value(name)"); do
  gcloud secrets versions list $secret \
    --project=$PROJECT_ID \
    --format=json > "$BACKUP_DIR/secret_versions_${secret}.json"
done

echo "Export Secret Manager (metadata) terminé dans $BACKUP_DIR"
echo "IMPORTANT: Les valeurs des secrets ne sont PAS exportées pour des raisons de sécurité"
```

---

## 5. CLOUD RUN SERVICES

### Console URL
https://console.cloud.google.com/run?project=sos-urgently-ac307

### Services Déployés

| Service | URL | Region |
|---------|-----|--------|
| twiliocallwebhook | twiliocallwebhook-268195823113.europe-west1.run.app | europe-west1 |
| twilioconferencewebhook | twilioconferencewebhook-268195823113.europe-west1.run.app | europe-west1 |

### Script d'Export Cloud Run
```bash
#!/bin/bash
# gcp-cloudrun-export.sh

PROJECT_ID="sos-urgently-ac307"
REGION="europe-west1"
DATE=$(date +%Y%m%d)
BACKUP_DIR="./gcp_backup_$DATE"

mkdir -p $BACKUP_DIR

# Lister les services
gcloud run services list \
  --project=$PROJECT_ID \
  --region=$REGION \
  --format=json > "$BACKUP_DIR/cloudrun_services.json"

# Détails de chaque service
for service in $(gcloud run services list --project=$PROJECT_ID --region=$REGION --format="value(metadata.name)"); do
  gcloud run services describe $service \
    --project=$PROJECT_ID \
    --region=$REGION \
    --format=json > "$BACKUP_DIR/cloudrun_${service}.json"
done

echo "Export Cloud Run terminé dans $BACKUP_DIR"
```

---

## 6. SCRIPT COMPLET D'EXPORT GCP

```bash
#!/bin/bash
# gcp-full-export.sh
# Export complet de la configuration GCP

PROJECT_ID="sos-urgently-ac307"
REGION="europe-west1"
DATE=$(date +%Y%m%d)
BACKUP_DIR="./gcp_full_backup_$DATE"

mkdir -p $BACKUP_DIR

echo "=== Export Configuration GCP - SOS Expat ==="
echo "Project: $PROJECT_ID"
echo "Date: $DATE"
echo ""

# 1. Cloud Tasks
echo "Exporting Cloud Tasks..."
gcloud tasks queues list --project=$PROJECT_ID --location=$REGION --format=json > "$BACKUP_DIR/cloud_tasks.json" 2>/dev/null || echo "Skipped (no queues or no access)"

# 2. Cloud Scheduler
echo "Exporting Cloud Scheduler..."
gcloud scheduler jobs list --project=$PROJECT_ID --location=$REGION --format=json > "$BACKUP_DIR/scheduler_jobs.json" 2>/dev/null || echo "Skipped"

# 3. IAM Policy
echo "Exporting IAM..."
gcloud projects get-iam-policy $PROJECT_ID --format=json > "$BACKUP_DIR/iam_policy.json"

# 4. Service Accounts
echo "Exporting Service Accounts..."
gcloud iam service-accounts list --project=$PROJECT_ID --format=json > "$BACKUP_DIR/service_accounts.json"

# 5. Secrets (metadata only)
echo "Exporting Secrets metadata..."
gcloud secrets list --project=$PROJECT_ID --format=json > "$BACKUP_DIR/secrets_list.json" 2>/dev/null || echo "Skipped"

# 6. Cloud Run
echo "Exporting Cloud Run..."
gcloud run services list --project=$PROJECT_ID --region=$REGION --format=json > "$BACKUP_DIR/cloudrun_services.json" 2>/dev/null || echo "Skipped"

# 7. Storage Buckets
echo "Exporting Storage Buckets..."
gsutil ls -p $PROJECT_ID > "$BACKUP_DIR/storage_buckets.txt"

# 8. Firestore Indexes
echo "Exporting Firestore Indexes..."
gcloud firestore indexes composite list --project=$PROJECT_ID --format=json > "$BACKUP_DIR/firestore_indexes.json" 2>/dev/null || echo "Skipped"

echo ""
echo "=== Export terminé ==="
echo "Fichiers dans: $BACKUP_DIR"
ls -la $BACKUP_DIR
```

---

## 7. CHECKLIST MENSUELLE

```markdown
## Checklist Mensuelle - Backup GCP Config

Date: _______________
Effectué par: _______________

### Cloud Tasks
- [ ] Queue call-scheduler-queue active
- [ ] Configuration exportée

### Cloud Scheduler
- [ ] Jobs listés et documentés
- [ ] Pas de jobs en erreur

### IAM
- [ ] Service accounts documentés
- [ ] Rôles vérifiés
- [ ] Pas de clés expirées

### Secret Manager
- [ ] Tous les secrets présents
- [ ] Versions actives documentées

### Cloud Run
- [ ] Services opérationnels
- [ ] URLs vérifiées

### Stockage Backup
- [ ] Export stocké dans: _______________
```

---

## 8. HISTORIQUE

| Date | Auteur | Modification |
|------|--------|--------------|
| 2026-02-03 | Claude Code | Création initiale |

---

**Ce document doit être mis à jour après chaque modification de configuration GCP.**
