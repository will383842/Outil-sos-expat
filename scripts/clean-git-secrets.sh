#!/bin/bash
# =============================================================================
# SCRIPT DE NETTOYAGE DES SECRETS DE L'HISTORIQUE GIT
# =============================================================================
# Ce script supprime les fichiers .env de l'historique Git
# ATTENTION: Cette operation reecrit l'historique Git
# Tous les collaborateurs devront re-cloner le repository apres execution
# =============================================================================

echo "=============================================="
echo "NETTOYAGE DES SECRETS DE L'HISTORIQUE GIT"
echo "=============================================="
echo ""
echo "ATTENTION: Cette operation va reecrit l'historique Git!"
echo "Tous les collaborateurs devront re-cloner le repository."
echo ""
read -p "Voulez-vous continuer? (oui/non): " confirm

if [ "$confirm" != "oui" ]; then
    echo "Operation annulee."
    exit 0
fi

# Liste des fichiers sensibles a supprimer de l'historique
SENSITIVE_FILES=(
    "sos/.env"
    "sos/.env.production"
    "sos/.env.local"
    "sos/.env.development"
    "sos/firebase/functions/.env"
    "sos/firebase/functions/.env.production"
    "sos/firebase/functions/.env .production"
    "Outil-sos-expat/.env"
    "Outil-sos-expat/.env.local"
    "Outil-sos-expat/functions/.env"
    "sos/fix-firebase-secrets.sh"
)

echo ""
echo "Fichiers a supprimer de l'historique:"
for file in "${SENSITIVE_FILES[@]}"; do
    echo "  - $file"
done
echo ""

# Creer une sauvegarde de la branche actuelle
echo "Creation d'une branche de sauvegarde..."
git branch backup-before-clean-$(date +%Y%m%d-%H%M%S)

# Utiliser git filter-repo si disponible, sinon git filter-branch
if command -v git-filter-repo &> /dev/null; then
    echo "Utilisation de git-filter-repo (recommande)..."

    # Creer un fichier de paths a supprimer
    echo "# Fichiers sensibles a supprimer" > /tmp/paths-to-remove.txt
    for file in "${SENSITIVE_FILES[@]}"; do
        echo "$file" >> /tmp/paths-to-remove.txt
    done

    git filter-repo --invert-paths --paths-from-file /tmp/paths-to-remove.txt --force

else
    echo "git-filter-repo non trouve, utilisation de git filter-branch..."
    echo "Note: Installez git-filter-repo pour de meilleures performances"
    echo "  pip install git-filter-repo"
    echo ""

    for file in "${SENSITIVE_FILES[@]}"; do
        echo "Suppression de: $file"
        git filter-branch --force --index-filter \
            "git rm --cached --ignore-unmatch '$file'" \
            --prune-empty --tag-name-filter cat -- --all 2>/dev/null || true
    done

    # Nettoyer les refs de backup creees par filter-branch
    rm -rf .git/refs/original/
fi

# Nettoyer et compacter le repository
echo ""
echo "Nettoyage du repository..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "=============================================="
echo "NETTOYAGE TERMINE"
echo "=============================================="
echo ""
echo "PROCHAINES ETAPES:"
echo "1. Verifiez que tout fonctionne correctement"
echo "2. Forcez le push vers le remote:"
echo "   git push origin --force --all"
echo "   git push origin --force --tags"
echo ""
echo "3. Informez tous les collaborateurs de re-cloner le repository"
echo ""
echo "4. Regenerez TOUS les secrets exposes (recommande meme si non obligatoire):"
echo "   - Stripe API Keys"
echo "   - Twilio Auth Token"
echo "   - OpenAI/Anthropic/Perplexity API Keys"
echo "   - MailWizz API Key"
echo "   - Firebase API Key"
echo ""
