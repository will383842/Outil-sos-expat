# BACKUP CONFIGURATION CLOUDFLARE PAGES - SOS EXPAT

**Date:** 2026-02-03
**Projet:** sos-urgently-ac307
**Hosting:** Cloudflare Pages
**Version:** 1.0

---

## INFORMATIONS CLOUDFLARE PAGES

### Dashboard URL
https://dash.cloudflare.com

### Projet
- **Nom du projet:** sosexpats (ou équivalent)
- **URL Production:** https://www.sosexpats.com
- **Repository lié:** GitHub - sos-expat-project

---

## 1. VARIABLES D'ENVIRONNEMENT À SAUVEGARDER

### Variables Production (à documenter)

```env
# Firebase Configuration (Public)
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=sos-urgently-ac307.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sos-urgently-ac307
VITE_FIREBASE_STORAGE_BUCKET=sos-urgently-ac307.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=268195823113
VITE_FIREBASE_APP_ID=1:268195823113:web:xxx

# Stripe (Public Key)
VITE_STRIPE_PUBLIC_KEY=pk_live_...

# Analytics
VITE_GA4_MEASUREMENT_ID=G-XZTJK0L3RK
VITE_GTM_ID=GTM-P53H3RLF

# App Configuration
VITE_APP_URL=https://www.sosexpats.com
VITE_API_BASE_URL=https://us-central1-sos-urgently-ac307.cloudfunctions.net
```

### Variables Preview/Staging (si configurées)
```env
# Même structure avec valeurs de test
VITE_STRIPE_PUBLIC_KEY=pk_test_...
# etc.
```

---

## 2. CONFIGURATION BUILD

### Build Settings
```yaml
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: sos/
Node.js version: 20
```

### Build Environment Variables
```
NODE_VERSION=20
NPM_VERSION=10
```

---

## 3. CONFIGURATION DOMAINE

### Domaines Configurés
```
Domaine principal: www.sosexpats.com
Domaine apex: sosexpats.com (redirect vers www)

DNS Records (si géré par Cloudflare):
- Type: CNAME
- Name: www
- Target: [projet].pages.dev

- Type: A (pour apex)
- Name: @
- Target: 192.0.2.1 (Cloudflare proxy)
```

### SSL/TLS
```
Mode: Full (strict)
Always Use HTTPS: On
Automatic HTTPS Rewrites: On
Minimum TLS Version: 1.2
```

---

## 4. FONCTIONNALITÉS CLOUDFLARE

### Page Rules (si configurées)
```
Rule 1: sosexpats.com/* -> Redirect to https://www.sosexpats.com/$1
Rule 2: [Autres règles personnalisées]
```

### Caching
```
Browser Cache TTL: [Valeur]
Edge Cache TTL: [Valeur]
Cache Level: Standard
```

### Security
```
Security Level: Medium
Bot Fight Mode: On
Browser Integrity Check: On
```

---

## 5. PROCÉDURE D'EXPORT CONFIGURATION

### Via Dashboard
1. Connectez-vous à dash.cloudflare.com
2. Sélectionnez le compte puis le projet Pages
3. Allez dans Settings > Environment Variables
4. **IMPORTANT**: Capturez une capture d'écran ou notez chaque variable
5. Allez dans Settings > Builds & deployments
6. Documentez les paramètres de build

### Via Wrangler CLI (recommandé)
```bash
# Installer Wrangler
npm install -g wrangler

# Se connecter
wrangler login

# Lister les projets Pages
wrangler pages project list

# Voir les déploiements
wrangler pages deployment list --project-name=sosexpats
```

### Script d'Export
```bash
#!/bin/bash
# cloudflare-config-export.sh

DATE=$(date +%Y%m%d)
BACKUP_DIR="./cloudflare_backup_$DATE"
PROJECT_NAME="sosexpats"

mkdir -p $BACKUP_DIR

# Exporter via API (nécessite API Token)
# Documentation: https://developers.cloudflare.com/api/

echo "Sauvegarde manuelle requise pour:"
echo "1. Variables d'environnement (Dashboard > Settings > Environment Variables)"
echo "2. Configuration Build (Dashboard > Settings > Builds)"
echo "3. Configuration Domaine (Dashboard > Custom domains)"
echo ""
echo "Stockez les captures dans: $BACKUP_DIR"
```

---

## 6. PROCÉDURE DE RESTAURATION

### En cas de perte de configuration Cloudflare Pages

#### Étape 1: Recréer le projet
```bash
# Via Dashboard ou Wrangler
wrangler pages project create sosexpats

# Connecter le repository GitHub
# Dashboard > Pages > Create a project > Connect to Git
```

#### Étape 2: Configurer les variables d'environnement
1. Dashboard > [Projet] > Settings > Environment Variables
2. Ajouter chaque variable documentée ci-dessus
3. Séparer Production et Preview si nécessaire

#### Étape 3: Configurer le build
1. Dashboard > Settings > Builds & deployments
2. Build command: `npm run build`
3. Build output directory: `dist`
4. Root directory: `sos/`

#### Étape 4: Configurer le domaine
1. Dashboard > [Projet] > Custom domains
2. Add custom domain: www.sosexpats.com
3. Configurer les DNS records si nécessaire

#### Étape 5: Redéployer
```bash
# Déclencher un nouveau déploiement
git push origin main

# Ou via Dashboard: Deployments > Retry deployment
```

---

## 7. CHECKLIST SAUVEGARDE MENSUELLE

```markdown
## Checklist Mensuelle - Backup Cloudflare Pages

Date: _______________
Effectué par: _______________

### Variables d'Environnement
- [ ] Production: Toutes les VITE_* documentées
- [ ] Preview: Variables de test documentées
- [ ] Valeurs stockées de manière sécurisée

### Configuration Build
- [ ] Build command vérifié
- [ ] Output directory vérifié
- [ ] Node version documentée

### Domaines
- [ ] Domaines personnalisés listés
- [ ] DNS records documentés
- [ ] SSL configuré

### Sécurité
- [ ] Page Rules documentées
- [ ] Security settings capturés

### Stockage Backup
- [ ] Fichiers stockés dans: _______________
- [ ] Accès restreint: [ ] Oui [ ] Non
```

---

## 8. DIFFÉRENCES AVEC .env LOCAL

Le fichier `.env.production` dans le repo contient les mêmes valeurs que Cloudflare Pages. En cas de restauration:

1. Vérifier que `.env.production` est à jour dans Git
2. Copier les valeurs vers Cloudflare Pages
3. Les secrets (VITE_STRIPE_PUBLIC_KEY) doivent correspondre à l'environnement

---

## 9. CONTACTS ET SUPPORT

| Ressource | URL |
|-----------|-----|
| Cloudflare Dashboard | dash.cloudflare.com |
| Documentation Pages | developers.cloudflare.com/pages |
| Support | support.cloudflare.com |
| Status | cloudflarestatus.com |

---

## 10. HISTORIQUE

| Date | Auteur | Modification |
|------|--------|--------------|
| 2026-02-03 | Claude Code | Création initiale (corrigé de Digital Ocean) |

---

**Ce document doit être mis à jour après chaque modification de configuration Cloudflare.**
