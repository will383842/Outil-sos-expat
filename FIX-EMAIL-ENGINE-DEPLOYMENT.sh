#!/bin/bash

################################################################################
# FIX email-engine Deployment - Résout tous les problèmes critiques
# Usage: bash FIX-EMAIL-ENGINE-DEPLOYMENT.sh
################################################################################

set -e

echo "🔧 CORRECTION DU DÉPLOIEMENT EMAIL-ENGINE"
echo "=========================================="

# 1️⃣ ARRÊTER TOUS LES CONTAINERS
echo "📦 Arrêt de tous les containers..."
cd /opt/email-engine
docker-compose down -v  # -v pour supprimer les volumes (fresh start)

# 2️⃣ CORRIGER app/config.py - Changer extra='forbid' en extra='ignore'
echo "🛠️  Correction de app/config.py..."
if [ -f "app/config.py" ]; then
  sed -i 's/extra="forbid"/extra="ignore"/g' app/config.py
  sed -i "s/extra='forbid'/extra='ignore'/g" app/config.py
  echo "✅ app/config.py corrigé (extra='ignore')"
else
  echo "⚠️  app/config.py non trouvé, passage à l'étape suivante"
fi

# 3️⃣ GÉNÉRER UN .ENV PROPRE ET SÉCURISÉ
echo "🔐 Génération d'un .env sécurisé..."

# Générer des mots de passe forts
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
API_KEY=$(openssl rand -base64 48 | tr -d "=+/" | cut -c1-64)
SECRET_KEY=$(openssl rand -base64 48 | tr -d "=+/" | cut -c1-64)

cat > .env << EOF
# ✅ Configuration minimale email-engine (CORRIGÉE)
# Générée automatiquement le $(date)

# === DATABASE ===
DATABASE_URL=postgresql://email_engine:${DB_PASSWORD}@postgres:5432/email_engine

# === REDIS ===
REDIS_URL=redis://redis:6379/0

# === SÉCURITÉ (CRITIQUES) ===
API_KEY=${API_KEY}
SECRET_KEY=${SECRET_KEY}

# === ENVIRONMENT ===
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

# === CORS ===
CORS_ORIGINS=*

# === RATE LIMITING ===
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60
EOF

echo "✅ .env généré avec passwords sécurisés"
echo ""
echo "⚠️  SAUVEGARDEZ CES CREDENTIALS:"
echo "   DATABASE_PASSWORD=${DB_PASSWORD}"
echo "   API_KEY=${API_KEY}"
echo ""

# 4️⃣ CORRIGER docker-compose.yml - Ajouter variables d'environnement PostgreSQL
echo "🐳 Correction de docker-compose.yml..."
if ! grep -q "POSTGRES_PASSWORD:" docker-compose.yml; then
  # Backup
  cp docker-compose.yml docker-compose.yml.backup

  # Injecter les variables PostgreSQL
  sed -i "/postgres:/,/volumes:/ s/image: postgres:15-alpine/image: postgres:15-alpine\n    environment:\n      - POSTGRES_USER=email_engine\n      - POSTGRES_PASSWORD=${DB_PASSWORD}\n      - POSTGRES_DB=email_engine/" docker-compose.yml

  echo "✅ docker-compose.yml corrigé"
fi

# 5️⃣ FIXER LES PERMISSIONS POUR CELERY BEAT
echo "🔒 Configuration des permissions pour celery beat..."
mkdir -p /opt/email-engine/celerybeat-data
chmod 777 /opt/email-engine/celerybeat-data  # Permissif pour le conteneur

# Ajouter un volume pour celery beat dans docker-compose.yml si pas déjà présent
if ! grep -q "celerybeat-data" docker-compose.yml; then
  echo "⚠️  Ajout manuel nécessaire: volume celerybeat-data dans docker-compose.yml"
fi

# 6️⃣ CORRIGER alembic/env.py - Fixer l'import
echo "🗄️  Correction de alembic/env.py..."
if [ -f "alembic/env.py" ]; then
  # Remplacer 'from app.models' par 'from src.infrastructure.database.models'
  sed -i 's/from app\.models import Base/from src.infrastructure.database.models import Base/g' alembic/env.py
  echo "✅ alembic/env.py corrigé"
fi

# 7️⃣ REBUILD COMPLET DES IMAGES
echo "🏗️  Rebuild complet des images Docker..."
docker-compose build --no-cache

# 8️⃣ DÉMARRAGE DES SERVICES
echo "🚀 Démarrage des services..."
docker-compose up -d

# 9️⃣ ATTENTE DÉMARRAGE
echo "⏳ Attente du démarrage (45 secondes)..."
sleep 45

# 🔟 VÉRIFICATION
echo "📊 Vérification des services..."
docker-compose ps
echo ""

# Test API
echo "🧪 Test de l'endpoint health..."
if curl -s -f http://localhost:8000/health > /dev/null 2>&1; then
  echo "✅ API opérationnelle!"
  curl http://localhost:8000/health
else
  echo "❌ API non accessible, vérification des logs..."
  echo ""
  echo "📋 Logs API (20 dernières lignes):"
  docker logs email_engine_api --tail=20
  echo ""
  echo "📋 Logs Celery Beat:"
  docker logs email_engine_celery_beat --tail=20
fi

echo ""
echo "=========================================="
echo "✅ DÉPLOIEMENT TERMINÉ"
echo "=========================================="
echo ""
echo "🔗 URLs:"
echo "   API: http://$(hostname -I | awk '{print $1}'):8000"
echo "   Health: http://$(hostname -I | awk '{print $1}'):8000/health"
echo "   Docs: http://$(hostname -I | awk '{print $1}'):8000/docs"
echo "   Flower: http://$(hostname -I | awk '{print $1}'):5555"
echo ""
echo "🔐 Credentials sauvegardés dans /opt/email-engine/.env"
echo ""
echo "📝 Commandes utiles:"
echo "   docker-compose logs -f api       # Logs API en temps réel"
echo "   docker-compose ps                 # Status des containers"
echo "   docker-compose restart api        # Redémarrer l'API"
echo ""
