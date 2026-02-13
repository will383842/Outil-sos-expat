#!/bin/bash

# Suppression rapide des services d'affiliation en europe-west1
# Utilise gcloud run services delete en batch

echo "🗑️  Suppression des services d'affiliation en europe-west1..."

# Lire la liste des services
services=$(cat /tmp/services-to-delete.txt | tr '\n' ' ')

# Supprimer tous les services en une seule commande
echo "Suppression de 106 services..."
echo "$services" | xargs -n 20 gcloud run services delete \
  --region=europe-west1 \
  --project=sos-urgently-ac307 \
  --quiet

echo ""
echo "✨ Suppression terminée !"
