# EMPLACEMENTS DE STOCKAGE DES BACKUPS - SOS EXPAT

**Date:** 2026-01-11
**Projet:** sos-urgently-ac307

---

## DESTINATION 1: GOOGLE CLOUD STORAGE (PRINCIPAL)

### Configuration

| Parametre | Valeur |
|-----------|--------|
| **Bucket** | `gs://sos-urgently-ac307.firebasestorage.app` |
| **Region** | europe-west1 (Belgique) |
| **Classe** | Standard |
| **Acces** | Firebase Storage |

### Structure des Backups Firestore

```
gs://sos-urgently-ac307.firebasestorage.app/
├── scheduled-backups/
│   ├── morning/
│   │   └── backup-{timestamp}/
│   │       └── [export Firestore natif]
│   ├── midday/
│   │   └── backup-{timestamp}/
│   │       └── [export Firestore natif]
│   └── evening/
│       └── backup-{timestamp}/
│           └── [export Firestore natif]
├── manual-backups/
│   ├── backup-{timestamp}/
│   │   └── [export Firestore natif]
│   └── admin-{timestamp}/
│       └── [export Firestore natif]
├── pre-restore-backups/
│   └── pre-restore-{timestamp}/
│       └── [export Firestore natif]
└── auth_backups/
    ├── auth_backup_YYYY-MM-DD.json
    └── auth_backup_manual_{timestamp}.json
```

### Frequence et Retention

| Type | Frequence | Retention |
|------|-----------|-----------|
| Morning backup | 03:00 Paris | 30 jours (standard) |
| Midday backup | 11:00 Paris | 30 jours (standard) |
| Evening backup | 19:00 Paris | 30 jours (standard) |
| Manual backup | A la demande | 30 jours |
| Pre-restore backup | Auto avant restore | 90 jours |
| Auth backup | Dimanche 03:00 | 90 jours |

### Espace Estime

| Type | Taille Unitaire | Frequence | Total/Mois |
|------|-----------------|-----------|------------|
| Firestore export | ~50-200 MB | 3x/jour | ~9-18 GB |
| Auth backup | ~1-5 MB | 1x/semaine | ~20 MB |
| **Total estime** | - | - | **~10-20 GB** |

### Cout Estime

| Element | Prix | Estimation |
|---------|------|------------|
| Storage Standard | $0.020/GB/mois | ~$0.40/mois |
| Operations Class A | $0.05/10k | ~$0.10/mois |
| Operations Class B | $0.004/10k | ~$0.01/mois |
| Egress | Variable | ~$0.00/mois (interne) |
| **Total** | - | **~$0.50-1.00/mois** |

---

## DESTINATION 2: GOOGLE CLOUD STORAGE (DR - CROSS-REGION)

### Configuration

| Parametre | Valeur |
|-----------|--------|
| **Bucket** | `gs://sos-expat-backup-dr` |
| **Region** | europe-west3 (Frankfurt) ou us-central1 |
| **Classe** | Standard |
| **Acces** | Cloud Storage API |

### Structure

```
gs://sos-expat-backup-dr/
├── scheduled-backups/
│   ├── morning/
│   │   └── backup-{timestamp}/
│   ├── midday/
│   │   └── backup-{timestamp}/
│   └── evening/
│       └── backup-{timestamp}/
├── manual-backups/
│   └── backup-{timestamp}/
├── auth_backups/
│   └── auth_backup_YYYY-MM-DD.json
└── storage-backup/
    ├── profilePhotos/
    ├── profile_photos/
    ├── documents/
    └── invoices/
```

### Frequence et Retention

| Type | Frequence | Retention |
|------|-----------|-----------|
| Cross-region Firestore | 04:00 Paris | 90 jours |
| Cross-region Storage | 05:00 Paris | 90 jours |
| Cleanup | Lundi 05:00 | - |

### Espace Estime

| Type | Taille | Total/Mois |
|------|--------|------------|
| Firestore copies | ~10-20 GB | ~10-20 GB |
| Storage files | ~5-10 GB | ~5-10 GB |
| **Total** | - | **~15-30 GB** |

### Cout Estime

| Element | Prix | Estimation |
|---------|------|------------|
| Storage Standard | $0.020/GB/mois | ~$0.60/mois |
| Inter-region transfer | $0.01/GB | ~$0.30/mois |
| **Total** | - | **~$1.00-2.00/mois** |

---

## DESTINATION 3: FIRESTORE (METADONNEES)

### Collections de Metadonnees

```
Firestore (sos-urgently-ac307)
├── backups/
│   └── {backupId}
│       ├── type: "automatic" | "manual"
│       ├── backupType: "morning" | "midday" | "evening"
│       ├── status: "completed" | "failed" | "in_progress"
│       ├── operationName: string
│       ├── bucketPath: string
│       ├── checksum: string (SHA-256)
│       ├── collectionCounts: { [collection]: number }
│       ├── totalDocuments: number
│       ├── createdBy: "system" | userId
│       ├── createdAt: Timestamp
│       ├── executionTimeMs: number
│       ├── retentionDays: number
│       └── containsFinancialData: boolean
│
├── auth_backups/
│   └── {backupId}
│       ├── id: string
│       ├── createdAt: Timestamp
│       ├── totalUsers: number
│       ├── status: "completed" | "failed" | "in_progress"
│       ├── storageUrl: string (signed URL)
│       ├── summary: { verifiedEmails, disabledAccounts, ... }
│       └── executionTimeMs: number
│
├── system_logs/
│   └── {logId}
│       ├── type: "firestore_backup" | "auth_backup" | ...
│       ├── backupId: string
│       ├── success: boolean
│       └── createdAt: Timestamp
│
├── backup_errors/
│   └── {errorId}
│       ├── type: "scheduled" | "manual"
│       ├── error: string
│       └── timestamp: Timestamp
│
├── restore_operations/
│   └── {restoreId}
│       ├── backupId: string
│       ├── status: "in_progress" | "completed" | "failed"
│       ├── initiatedBy: userId
│       └── preRestoreBackupId: string
│
├── quarterly_restore_tests/
│   └── {reportId}
│       ├── quarter: "YYYY-QX"
│       ├── overallStatus: "passed" | "failed" | "warning"
│       ├── results: RestoreTestResult[]
│       └── rtoMeasured: { ... }
│
└── dr_test_reports/
    └── {reportId}
        ├── overallStatus: "passed" | "failed" | "warning"
        ├── tests: DRTestResult[]
        └── recommendations: string[]
```

---

## DESTINATION 4: GIT (CODE SOURCE)

### Configuration

| Parametre | Valeur |
|-----------|--------|
| **Repository** | sos-expat-project |
| **Branche principale** | main |
| **Plateforme** | Local (a verifier remote) |

### Contenu Versionne

```
sos-expat-project/
├── sos/
│   ├── src/                    # Frontend React
│   ├── firebase/
│   │   └── functions/
│   │       └── src/            # Cloud Functions
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── firebase.json
├── Outil-sos-expat/            # Outil IA
├── docs/                       # Documentation
└── backup-system/              # Ce systeme
    ├── audit-report.md
    ├── backup-inventory.md
    └── storage-locations.md
```

### Strategie Git

| Action | Frequence |
|--------|-----------|
| Commits | Continue |
| Push to remote | Regulier |
| Backup branches | Non implemente |

---

## STRUCTURE COMPLETE D'UN BACKUP

### Exemple: Backup du 2026-01-11

```
backup-2026-01-11/
├── firestore/
│   ├── morning/
│   │   └── backup-1736575200000/
│   │       ├── all_namespaces/
│   │       │   └── all_kinds/
│   │       │       ├── output-0
│   │       │       └── output-1
│   │       └── metadata/
│   │           └── metadata.json
│   ├── midday/
│   │   └── backup-1736604000000/
│   │       └── [...]
│   └── evening/
│       └── backup-1736632800000/
│           └── [...]
│
├── auth/
│   └── auth_backup_2026-01-11.json
│       {
│         "users": [
│           {
│             "uid": "abc123",
│             "email": "user@example.com",
│             "emailVerified": true,
│             "displayName": "John Doe",
│             "customClaims": { "role": "client" },
│             "metadata": { ... }
│           }
│         ]
│       }
│
├── storage/
│   └── storage-backup/
│       ├── profilePhotos/
│       │   └── user123.jpg
│       ├── documents/
│       │   └── kyc_doc_456.pdf
│       └── invoices/
│           └── INV-2026-001.pdf
│
├── metadata/
│   ├── backup-manifest.json
│   │   {
│   │     "backupDate": "2026-01-11",
│   │     "backups": {
│   │       "morning": { "id": "xxx", "checksum": "abc123" },
│   │       "midday": { "id": "yyy", "checksum": "def456" },
│   │       "evening": { "id": "zzz", "checksum": "ghi789" }
│   │     },
│   │     "auth": { "userCount": 500, "checksum": "jkl012" },
│   │     "storage": { "fileCount": 1500 }
│   │   }
│   │
│   └── collection-counts.json
│       {
│         "users": 523,
│         "sos_profiles": 127,
│         "call_sessions": 1893,
│         "payments": 634,
│         "subscriptions": 89
│       }
│
└── README.txt
    Instructions de restauration:
    1. Firestore: gcloud firestore import gs://bucket/path
    2. Auth: Utiliser adminRestoreAuth
    3. Storage: gsutil -m cp -r gs://dr-bucket/storage-backup gs://main-bucket
```

---

## COMPARAISON DES DESTINATIONS

| Critere | Principal (europe-west1) | DR (europe-west3) | Git |
|---------|--------------------------|-------------------|-----|
| **Type** | Hot storage | Warm storage | Version control |
| **Latence** | Faible | Moyenne | N/A |
| **Cout** | $0.020/GB | $0.020/GB | Gratuit |
| **Durabilite** | 99.999999999% | 99.999999999% | Depend host |
| **Disponibilite** | 99.9% | 99.9% | Variable |
| **Region** | Belgique | Frankfurt | Local/Cloud |
| **Acces** | Firebase SDK | Cloud Storage API | Git CLI |
| **Restauration** | Immediate | 1-5 min | Clone |

---

## PROCEDURES DE RESTAURATION PAR DESTINATION

### Depuis Bucket Principal

```bash
# 1. Lister les backups disponibles
gcloud firestore operations list

# 2. Restaurer Firestore
gcloud firestore import gs://sos-urgently-ac307.firebasestorage.app/scheduled-backups/morning/backup-TIMESTAMP

# 3. Ou via Admin API
# Appeler adminRestoreFirestore avec backupId et bucketPath
```

### Depuis Bucket DR

```bash
# 1. Copier vers bucket principal si necessaire
gsutil -m cp -r gs://sos-expat-backup-dr/scheduled-backups/morning/backup-TIMESTAMP gs://sos-urgently-ac307.firebasestorage.app/restored/

# 2. Restaurer depuis la copie
gcloud firestore import gs://sos-urgently-ac307.firebasestorage.app/restored/backup-TIMESTAMP
```

### Depuis Git

```bash
# 1. Cloner le repository
git clone [remote-url] sos-expat-project

# 2. Installer les dependances
cd sos-expat-project/sos
npm install

# 3. Deployer les functions
cd firebase/functions
npm install
npm run build
firebase deploy --only functions

# 4. Deployer le frontend
cd ..
npm run build
firebase deploy --only hosting
```

---

## ALERTES ET MONITORING

### Alertes Configurees

| Type | Declencheur | Action |
|------|-------------|--------|
| `backup_failure` | Echec backup schedule | Alerte critical dans system_alerts |
| `dr_backup_failure` | Echec copie DR | Alerte critical |
| `dr_backup_config` | Bucket DR inexistant | Alerte critical |
| `restore_in_progress` | Restauration lancee | Alerte warning |
| `restore_failed` | Echec restauration | Alerte critical |

### Collections de Monitoring

| Collection | Contenu |
|------------|---------|
| `system_logs` | Tous les logs backup |
| `system_alerts` | Alertes actives |
| `backup_errors` | Historique erreurs |

---

**Document genere:** 2026-01-11
**Version:** 1.0
