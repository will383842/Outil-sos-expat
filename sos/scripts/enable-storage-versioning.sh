#!/bin/bash
# ============================================================================
# Script pour activer le versioning sur Firebase Storage (Google Cloud Storage)
#
# Le versioning permet de conserver les anciennes versions des fichiers
# en cas de suppression ou modification accidentelle.
#
# IMPORTANT: Exécuter ce script une seule fois après le déploiement initial.
# ============================================================================

set -e

# Configuration
PROJECT_ID="sos-expat-prod"
BUCKET_NAME="${PROJECT_ID}.appspot.com"

echo "============================================"
echo "Activation du versioning Firebase Storage"
echo "============================================"
echo ""
echo "Project: $PROJECT_ID"
echo "Bucket: $BUCKET_NAME"
echo ""

# Vérifier que gcloud est installé
if ! command -v gsutil &> /dev/null; then
    echo "ERROR: gsutil n'est pas installé."
    echo "Installez le SDK Google Cloud: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Vérifier l'authentification
echo "Vérification de l'authentification..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1; then
    echo "ERROR: Non authentifié. Exécutez: gcloud auth login"
    exit 1
fi

# Définir le projet
echo "Configuration du projet..."
gcloud config set project $PROJECT_ID

# Activer le versioning
echo ""
echo "Activation du versioning sur gs://$BUCKET_NAME..."
gsutil versioning set on gs://$BUCKET_NAME

# Vérifier le statut
echo ""
echo "Vérification du statut..."
gsutil versioning get gs://$BUCKET_NAME

# Configurer la politique de lifecycle pour gérer les anciennes versions
echo ""
echo "Configuration de la politique de lifecycle..."

cat > /tmp/lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
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

gsutil lifecycle set /tmp/lifecycle.json gs://$BUCKET_NAME

echo ""
echo "Vérification de la politique de lifecycle..."
gsutil lifecycle get gs://$BUCKET_NAME

echo ""
echo "============================================"
echo "Versioning activé avec succès!"
echo "============================================"
echo ""
echo "Configuration appliquée:"
echo "- Versioning: ACTIVÉ"
echo "- Rétention: 3 versions maximum par fichier"
echo "- Suppression auto: versions > 90 jours"
echo ""
echo "Pour lister les versions d'un fichier:"
echo "  gsutil ls -a gs://$BUCKET_NAME/path/to/file"
echo ""
echo "Pour restaurer une version:"
echo "  gsutil cp gs://$BUCKET_NAME/path/to/file#<generation> gs://$BUCKET_NAME/path/to/file"
