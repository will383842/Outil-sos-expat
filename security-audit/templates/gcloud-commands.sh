#!/bin/bash

# ============================================================================
# COMMANDES GCLOUD - AUDIT DE SÉCURITÉ FIREBASE
# ============================================================================
#
# Ce fichier contient toutes les commandes gcloud nécessaires pour
# sécuriser votre projet Firebase après le retrait d'un développeur.
#
# Projet : sos-urgently-ac307
#
# Instructions :
# 1. Copiez-collez les commandes une par une dans votre terminal
# 2. Remplacez les valeurs entre <> par les vraies valeurs
# 3. Vérifiez le résultat de chaque commande avant de continuer
#
# ⚠️  Prérequis : gcloud CLI doit être installé et configuré
#     https://cloud.google.com/sdk/docs/install
# ============================================================================

# Configuration du projet
PROJECT_ID="sos-urgently-ac307"

# ============================================================================
# 1. VÉRIFICATION DES ACCÈS IAM
# ============================================================================

echo "=== LISTING DES MEMBRES IAM ==="

# Lister tous les membres IAM et leurs rôles
gcloud projects get-iam-policy $PROJECT_ID \
    --format="table(bindings.role,bindings.members)"

# Version JSON détaillée
gcloud projects get-iam-policy $PROJECT_ID --format=json > iam-policy-backup.json

# ============================================================================
# 2. SUPPRESSION D'UN ACCÈS IAM
# ============================================================================

echo "=== SUPPRESSION D'ACCÈS ==="

# Remplacez <EMAIL_DU_DEV> par l'email réel
# Remplacez <ROLE> par le rôle à supprimer (ex: roles/editor)

# gcloud projects remove-iam-policy-binding $PROJECT_ID \
#     --member="user:<EMAIL_DU_DEV>" \
#     --role="<ROLE>"

# Exemples de rôles courants à vérifier :
# - roles/owner
# - roles/editor
# - roles/viewer
# - roles/firebase.admin
# - roles/firebase.developAdmin
# - roles/cloudfunctions.admin

# ============================================================================
# 3. SERVICE ACCOUNTS
# ============================================================================

echo "=== LISTING DES SERVICE ACCOUNTS ==="

# Lister tous les service accounts
gcloud iam service-accounts list --project=$PROJECT_ID

# ============================================================================
# 4. CLÉS DES SERVICE ACCOUNTS
# ============================================================================

echo "=== CLÉS DES SERVICE ACCOUNTS ==="

# Pour chaque service account, lister les clés
# Remplacez <SA_EMAIL> par l'email du service account

# gcloud iam service-accounts keys list \
#     --iam-account=<SA_EMAIL>

# Service accounts Firebase par défaut à vérifier :
# - firebase-adminsdk-xxxxx@sos-urgently-ac307.iam.gserviceaccount.com
# - sos-urgently-ac307@appspot.gserviceaccount.com

# ============================================================================
# 5. CRÉER UNE NOUVELLE CLÉ
# ============================================================================

echo "=== CRÉATION D'UNE NOUVELLE CLÉ ==="

# Créer une nouvelle clé pour un service account
# Le fichier JSON sera créé dans le dossier courant

# gcloud iam service-accounts keys create nouvelle-cle.json \
#     --iam-account=<SA_EMAIL>

# ============================================================================
# 6. SUPPRIMER UNE ANCIENNE CLÉ
# ============================================================================

echo "=== SUPPRESSION D'UNE CLÉ ==="

# ⚠️  ATTENTION : Action irréversible !
# D'abord, listez les clés pour obtenir le KEY_ID
# Puis supprimez la clé spécifique

# gcloud iam service-accounts keys delete <KEY_ID> \
#     --iam-account=<SA_EMAIL>

# ============================================================================
# 7. VÉRIFICATION FIREBASE
# ============================================================================

echo "=== CONFIGURATION FIREBASE ==="

# Voir la configuration des Firebase Functions
firebase functions:config:get --project=$PROJECT_ID

# Lister les fonctions déployées
firebase functions:list --project=$PROJECT_ID

# ============================================================================
# 8. LOGS D'AUDIT
# ============================================================================

echo "=== LOGS D'AUDIT ==="

# Voir les logs d'activité admin récents
gcloud logging read "logName:cloudaudit.googleapis.com AND protoPayload.authenticationInfo.principalEmail:<EMAIL_DU_DEV>" \
    --project=$PROJECT_ID \
    --limit=50 \
    --format="table(timestamp,protoPayload.methodName,protoPayload.resourceName)"

# ============================================================================
# 9. COMMANDES UTILES SUPPLÉMENTAIRES
# ============================================================================

# Vérifier qui vous êtes connecté
gcloud auth list

# Changer de compte si nécessaire
# gcloud auth login

# Configurer le projet par défaut
gcloud config set project $PROJECT_ID

# Voir toutes les API activées
gcloud services list --enabled --project=$PROJECT_ID

# ============================================================================
# FIN DU SCRIPT
# ============================================================================

echo ""
echo "=== AUDIT TERMINÉ ==="
echo "N'oubliez pas de :"
echo "1. Vérifier que le développeur n'a plus accès"
echo "2. Régénérer toutes les clés API tierces"
echo "3. Mettre à jour vos fichiers .env"
echo "4. Redéployer vos applications"
