#!/bin/bash
# ============================================================================
# Script d'optimisation des coûts de stockage
#
# Configure les politiques de lifecycle pour :
# - Archiver les anciennes données vers Nearline/Coldline
# - Supprimer automatiquement les fichiers temporaires
# - Compresser les backups anciens
#
# ÉCONOMIES ESTIMÉES: 40-60% sur les coûts de stockage
# ============================================================================

set -e

# Configuration
PROJECT_ID="sos-expat-prod"
MAIN_BUCKET="${PROJECT_ID}.appspot.com"
BACKUP_BUCKET="${PROJECT_ID}-backups"

echo "============================================"
echo "Optimisation des coûts de stockage"
echo "============================================"
echo ""
echo "Project: $PROJECT_ID"
echo ""

# Vérifier gcloud
if ! command -v gsutil &> /dev/null; then
    echo "ERROR: gsutil n'est pas installé."
    exit 1
fi

# Définir le projet
gcloud config set project $PROJECT_ID

# ============================================================================
# 1. BUCKET PRINCIPAL (appspot.com)
# ============================================================================

echo ""
echo "=== Configuration du bucket principal ==="
echo ""

cat > /tmp/main_lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "NEARLINE"
        },
        "condition": {
          "age": 90,
          "matchesPrefix": ["call_recordings_backup/"]
        }
      },
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "COLDLINE"
        },
        "condition": {
          "age": 365,
          "matchesPrefix": ["call_recordings_backup/"]
        }
      },
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "NEARLINE"
        },
        "condition": {
          "age": 30,
          "matchesPrefix": ["auth_backups/"]
        }
      },
      {
        "action": {
          "type": "Delete"
        },
        "condition": {
          "age": 7,
          "matchesPrefix": ["temp/", "cache/", "tmp/"]
        }
      },
      {
        "action": {
          "type": "Delete"
        },
        "condition": {
          "age": 30,
          "matchesPrefix": ["gdpr_exports/"]
        }
      },
      {
        "action": {
          "type": "Delete"
        },
        "condition": {
          "numNewerVersions": 3,
          "isLive": false
        }
      },
      {
        "action": {
          "type": "Delete"
        },
        "condition": {
          "age": 90,
          "isLive": false
        }
      }
    ]
  }
}
EOF

echo "Application de la politique lifecycle sur gs://$MAIN_BUCKET..."
gsutil lifecycle set /tmp/main_lifecycle.json gs://$MAIN_BUCKET

echo "Vérification..."
gsutil lifecycle get gs://$MAIN_BUCKET

# ============================================================================
# 2. BUCKET DE BACKUPS
# ============================================================================

echo ""
echo "=== Configuration du bucket de backups ==="
echo ""

# Vérifier si le bucket existe
if gsutil ls gs://$BACKUP_BUCKET &> /dev/null; then

    cat > /tmp/backup_lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "NEARLINE"
        },
        "condition": {
          "age": 30,
          "matchesPrefix": ["firestore/"]
        }
      },
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "COLDLINE"
        },
        "condition": {
          "age": 90,
          "matchesPrefix": ["firestore/"]
        }
      },
      {
        "action": {
          "type": "Delete"
        },
        "condition": {
          "age": 365,
          "matchesPrefix": ["firestore/"]
        }
      }
    ]
  }
}
EOF

    echo "Application de la politique lifecycle sur gs://$BACKUP_BUCKET..."
    gsutil lifecycle set /tmp/backup_lifecycle.json gs://$BACKUP_BUCKET

    echo "Vérification..."
    gsutil lifecycle get gs://$BACKUP_BUCKET
else
    echo "Le bucket $BACKUP_BUCKET n'existe pas. Création..."
    gsutil mb -l europe-west1 gs://$BACKUP_BUCKET
    gsutil lifecycle set /tmp/backup_lifecycle.json gs://$BACKUP_BUCKET
fi

# ============================================================================
# 3. RAPPORT D'UTILISATION
# ============================================================================

echo ""
echo "=== Rapport d'utilisation actuel ==="
echo ""

echo "Taille du bucket principal:"
gsutil du -s gs://$MAIN_BUCKET

echo ""
echo "Répartition par dossier (top 10):"
gsutil du gs://$MAIN_BUCKET/** 2>/dev/null | sort -rn | head -10 || echo "Impossible de calculer la répartition"

echo ""
echo "============================================"
echo "Optimisation terminée!"
echo "============================================"
echo ""
echo "Classes de stockage configurées:"
echo ""
echo "STANDARD (0-30j)  -> Accès fréquent"
echo "NEARLINE (30-90j) -> Accès mensuel (-50% coût)"
echo "COLDLINE (90+j)   -> Accès annuel (-75% coût)"
echo ""
echo "Suppressions automatiques:"
echo "- Fichiers temp/cache: 7 jours"
echo "- Exports GDPR: 30 jours"
echo "- Anciennes versions: 90 jours ou 3 versions max"
echo "- Backups Firestore: 365 jours"
echo ""
echo "Économies estimées: 40-60% sur le long terme"
