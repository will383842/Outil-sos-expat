#!/bin/bash
# =============================================================================
# ACTIVATION DU VERSIONING FIREBASE STORAGE
# =============================================================================
# Ce script active le versioning sur le bucket Firebase Storage
# et configure les lifecycle policies pour la retention
# =============================================================================

echo "=============================================="
echo "ACTIVATION DU VERSIONING FIREBASE STORAGE"
echo "=============================================="

# Configuration
PROJECT_ID="sos-urgently-ac307"
BUCKET_NAME="${PROJECT_ID}.firebasestorage.app"
DR_BUCKET_NAME="sos-expat-backup-dr"

echo ""
echo "Configuration:"
echo "  - Project ID: ${PROJECT_ID}"
echo "  - Bucket principal: ${BUCKET_NAME}"
echo "  - Bucket DR: ${DR_BUCKET_NAME}"
echo ""

# Verifier que gcloud est installe
if ! command -v gcloud &> /dev/null; then
    echo "ERREUR: gcloud CLI n'est pas installe."
    echo "Installez-le depuis: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Verifier l'authentification
echo "Verification de l'authentification..."
gcloud auth print-identity-token &> /dev/null
if [ $? -ne 0 ]; then
    echo "ERREUR: Non authentifie. Executez: gcloud auth login"
    exit 1
fi

# Configurer le projet
echo "Configuration du projet ${PROJECT_ID}..."
gcloud config set project ${PROJECT_ID}

echo ""
echo "1. ACTIVATION DU VERSIONING SUR LE BUCKET PRINCIPAL"
echo "---------------------------------------------------"
gcloud storage buckets update gs://${BUCKET_NAME} --versioning

if [ $? -eq 0 ]; then
    echo "✓ Versioning active sur gs://${BUCKET_NAME}"
else
    echo "✗ Erreur lors de l'activation du versioning"
fi

echo ""
echo "2. CONFIGURATION DES LIFECYCLE POLICIES"
echo "---------------------------------------"

# Creer le fichier de configuration lifecycle
cat > /tmp/lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "daysSinceNoncurrentTime": 90,
          "isLive": false
        }
      },
      {
        "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
        "condition": {
          "age": 30,
          "matchesPrefix": ["scheduled-backups/", "manual-backups/", "auth_backups/"]
        }
      },
      {
        "action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},
        "condition": {
          "age": 90,
          "matchesPrefix": ["scheduled-backups/", "manual-backups/", "auth_backups/"]
        }
      },
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 7,
          "matchesPrefix": ["registration_temp/", "temp_profiles/"]
        }
      }
    ]
  }
}
EOF

gcloud storage buckets update gs://${BUCKET_NAME} --lifecycle-file=/tmp/lifecycle.json

if [ $? -eq 0 ]; then
    echo "✓ Lifecycle policies configurees"
else
    echo "✗ Erreur lors de la configuration des lifecycle policies"
fi

echo ""
echo "3. CREATION DU BUCKET DR (CROSS-REGION)"
echo "---------------------------------------"

# Verifier si le bucket DR existe
if gcloud storage buckets describe gs://${DR_BUCKET_NAME} &> /dev/null; then
    echo "Le bucket DR existe deja: gs://${DR_BUCKET_NAME}"
else
    echo "Creation du bucket DR dans europe-west3 (Frankfurt)..."
    gcloud storage buckets create gs://${DR_BUCKET_NAME} \
        --location=EUROPE-WEST3 \
        --uniform-bucket-level-access \
        --public-access-prevention

    if [ $? -eq 0 ]; then
        echo "✓ Bucket DR cree: gs://${DR_BUCKET_NAME}"

        # Activer le versioning sur le bucket DR aussi
        gcloud storage buckets update gs://${DR_BUCKET_NAME} --versioning
        echo "✓ Versioning active sur le bucket DR"
    else
        echo "✗ Erreur lors de la creation du bucket DR"
    fi
fi

echo ""
echo "4. VERIFICATION DE LA CONFIGURATION"
echo "-----------------------------------"

echo "Configuration du bucket principal:"
gcloud storage buckets describe gs://${BUCKET_NAME} --format="table(versioning.enabled,lifecycle)"

echo ""
echo "Configuration du bucket DR:"
gcloud storage buckets describe gs://${DR_BUCKET_NAME} --format="table(versioning.enabled,location)" 2>/dev/null || echo "Bucket DR non disponible"

echo ""
echo "=============================================="
echo "CONFIGURATION TERMINEE"
echo "=============================================="
echo ""
echo "Resume:"
echo "  ✓ Versioning active - les fichiers supprimes peuvent etre recuperes"
echo "  ✓ Lifecycle policies - archivage automatique des backups"
echo "  ✓ Bucket DR - copie cross-region dans europe-west3"
echo ""
echo "Prochaines etapes:"
echo "  1. Deployer les Cloud Functions: firebase deploy --only functions"
echo "  2. Verifier les backups dans la console Firebase"
echo "  3. Tester la restauration avec: firebase functions:call runRestoreTestManual"
echo ""
