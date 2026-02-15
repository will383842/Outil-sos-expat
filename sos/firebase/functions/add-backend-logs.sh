#!/bin/bash
# Script pour ajouter logs détaillés dans registerInfluencer, registerBlogger, registerGroupAdmin

cd "$(dirname "$0")/src"

for role in influencer blogger groupAdmin; do
  file="${role}/callables/register$(tr '[:lower:]' '[:upper:]' <<< ${role:0:1})${role:1}.ts"

  if [ ! -f "$file" ]; then
    echo "❌ Fichier non trouvé: $file"
    continue
  fi

  echo "📝 Ajout logs dans $file..."

  # Backup
  cp "$file" "$file.backup"

  # Add startTime variable after first line of function body
  sed -i '/async (request).*=> {/a\    const startTime = Date.now();' "$file"

  # Add initial log after auth check
  sed -i '/const userId = request.auth.uid;/a\    logger.info("[register'$(tr '[:lower:]' '[:upper:]' <<< ${role:0:1})${role:1}'] 🔵 DÉBUT INSCRIPTION", {\n      timestamp: new Date().toISOString(),\n      userId,\n      email: input.email,\n      dataKeys: Object.keys(input)\n    });' "$file"

  # Add transaction log
  sed -i '/await db.runTransaction/i\      logger.info("[register'$(tr '[:lower:]' '[:upper:]' <<< ${role:0:1})${role:1}'] 📝 DÉBUT TRANSACTION FIRESTORE", {\n        timestamp: new Date().toISOString(),\n        userId,\n        elapsedSinceStart: Date.now() - startTime\n      });' "$file"

  # Add success log
  sed -i '/return {$/i\      logger.info("[register'$(tr '[:lower:]' '[:upper:]' <<< ${role:0:1})${role:1}'] ✅ INSCRIPTION TERMINÉE", {\n        timestamp: new Date().toISOString(),\n        userId,\n        totalDuration: Date.now() - startTime\n      });' "$file"

  # Enhance error log
  sed -i 's/logger.error("\[register.*Error"/logger.error("[register'$(tr '[:lower:]' '[:upper:]' <<< ${role:0:1})${role:1}'] ❌ ERREUR INSCRIPTION", {\n        timestamp: new Date().toISOString(),\n        userId,\n        errorType: error?.constructor?.name,\n        errorMessage: (error as Error)?.message,\n        errorStack: (error as Error)?.stack,\n        duration: Date.now() - startTime\n      });/' "$file"

  echo "✅ Logs ajoutés dans $file"
done

echo ""
echo "✅ TERMINÉ - Vérifiez les fichiers et supprimez les .backup si OK"
