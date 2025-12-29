# Configuration Storage GCS - Instructions manuelles

## Prérequis
- Installer Python: `winget install Python.Python.3.12`
- Redémarrer le terminal
- Authentifier gcloud: `gcloud auth login`
- Configurer le projet: `gcloud config set project sos-urgently-ac307`

## 1. Activer le versioning sur le bucket Firebase Storage

```bash
gcloud storage buckets update gs://sos-urgently-ac307.firebasestorage.app --versioning
```

## 2. Configurer les lifecycle policies

Créer un fichier `lifecycle.json`:

```json
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 90,
          "isLive": false
        }
      },
      {
        "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
        "condition": {
          "age": 30,
          "matchesPrefix": ["auth_backups/", "twilio_backups/", "dr_reports/"]
        }
      },
      {
        "action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},
        "condition": {
          "age": 90,
          "matchesPrefix": ["auth_backups/", "twilio_backups/", "dr_reports/"]
        }
      }
    ]
  }
}
```

Appliquer:
```bash
gcloud storage buckets update gs://sos-urgently-ac307.firebasestorage.app --lifecycle-file=lifecycle.json
```

## 3. Vérifier la configuration

```bash
gcloud storage buckets describe gs://sos-urgently-ac307.firebasestorage.app
```

## Alternative via Console GCP

1. Aller sur https://console.cloud.google.com/storage/browser/sos-urgently-ac307.firebasestorage.app
2. Cliquer sur "Configuration" du bucket
3. Activer "Versioning"
4. Aller dans "Lifecycle" et ajouter les règles ci-dessus
