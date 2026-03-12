# 🔐 Comparaison - Stockage des Licences et Clés API

**Date** : 2026-02-16
**Objectif** : Comparer comment les licences PMTA et clés MailWizz sont stockées dans les deux systèmes indépendants

---

## 📊 VUE D'ENSEMBLE

| Élément | Système 1 : MailWizz+PMTA (backup-cold) | Système 2 : Email-Engine (FastAPI) |
|---------|------------------------------------------|-----------------------------------|
| **Architecture** | MailWizz monolithique + PMTA | FastAPI + PostgreSQL + PMTA |
| **Config PMTA** | `/etc/pmta/config` (serveur) | `powermta/config` (Docker) |
| **Licence PMTA** | `/etc/pmta/license` (serveur) | `powermta/license` (Docker) |
| **Clés MailWizz** | Base MySQL `mw_customer_api_key` | Fichier `.env` (variables d'environnement) |
| **Config DB** | `apps/common/config/main-custom.php` | `.env` (DATABASE_URL) |
| **Sécurité** | PHP hardcodé + MySQL | Variables d'environnement + Docker secrets |

---

## 🗂️ SYSTÈME 1 : MailWizz+PMTA Hetzner (backup-cold)

### 1. Licence PowerMTA

**Emplacement sur le serveur** :
```bash
/etc/pmta/license
```

**Dans le backup** :
```
Outils d'emailing/backup-cold/pmta-license-20260216
```

**Contenu du fichier licence** :
```
product: PowerMTA
version: 5.0
platform: linux-intel
units: 4294967295
options: H,enterprise-plus,no-passive-audit
mac:
licensee: softomaniac
serial: SKYPE: rony.raskhit
comment: PMTA v5.0
issued: 2019-09-21
expires: never
copyright: Port25 Solutions, Inc.  All Rights Reserved
check: 1-AZzveAgi1HmPcuBD18Iq1ol33jor2IrI2zt95mcDHAQf7wAkQ+XiBJab6eucTUIg
RwsatRyb3xCYu0hs+wCz7w==
```

---

### 2. Configuration PowerMTA

**Emplacement sur le serveur** :
```bash
/etc/pmta/config
```

**Dans le backup** :
```
Outils d'emailing/backup-cold/pmta-config-20260216
```

**Extraits importants** :
```bash
# Hostname
host-name mail.sos-expat.com

# IPs Hetzner
smtp-listener 46.62.168.55:2525
smtp-listener 95.216.179.163:2525

# Authentification SMTP
<smtp-user admin@ulixai-expat.com>
    password WJullin1974/*%$
    source {pmta-auth}
</smtp-user>

# Virtual MTAs avec IPs
<virtual-mta pmta-vmta0>
    smtp-source-host 46.62.168.55 mail1.ulixai-expat.com
    domain-key dkim,*,/home/pmta/conf/mail/ulixai-expat.com/dkim.pem
</virtual-mta>
```

---

### 3. Clés API MailWizz

**Emplacement** : Base de données MySQL `mailapp`

**Table** : `mw_customer_api_key`

**Structure** :
```sql
CREATE TABLE `mw_customer_api_key` (
  `key_id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) NOT NULL,
  `public` varchar(64) NOT NULL,
  `private` varchar(64) NOT NULL,
  `date_added` datetime NOT NULL,
  `last_updated` datetime NOT NULL,
  PRIMARY KEY (`key_id`),
  KEY `fk_customer_api_key_customer1_idx` (`customer_id`)
)
```

**Accès** : Via l'interface web MailWizz
- URL : https://mail.sos-expat.com
- Settings → API Keys
- Génération/révocation via UI

---

### 4. Configuration Base de Données MailWizz

**Fichier** : `apps/common/config/main-custom.php`

```php
<?php
return array(
    'components' => array(
        'db' => array(
            'connectionString' => 'mysql:host=localhost;dbname=mailapp',
            'username' => 'mailapp',
            'password' => 'WJullin1974/*%$',
            'tablePrefix' => 'mw_',
        ),
    ),
);
```

**⚠️ Problème de sécurité** : Mot de passe en clair dans le code PHP

---

### 5. Clés DKIM

**Emplacement sur le serveur** :
```bash
/home/pmta/conf/mail/ulixai-expat.com/dkim.pem      # Clé privée
/home/pmta/conf/mail/ulixai-expat.com/dkim.public.key  # Clé publique
```

**Permissions** :
```bash
chmod 600 /home/pmta/conf/mail/*/dkim.pem
chown root:root /home/pmta/conf/mail/*/dkim.pem
```

---

## 🚀 SYSTÈME 2 : Email-Engine (FastAPI)

### 1. Licence PowerMTA

**Emplacement Docker** :
```
email-engine/powermta/license
```

**Mount dans le container** :
```yaml
# docker-compose.yml
volumes:
  - ./powermta/license:/etc/pmta/license:ro
```

**Comment l'ajouter** :
```powershell
# Windows
Copy-Item "chemin\vers\votre\licence" "email-engine\powermta\license"

# Linux/Mac
cp /chemin/vers/licence email-engine/powermta/license
```

---

### 2. Configuration PowerMTA

**Emplacement** :
```
email-engine/powermta/config
```

**Gestion** : Fichier versionné dans Git (sans secrets)

---

### 3. Clés API MailWizz

**Emplacement** : Fichier `.env` (racine du projet)

**Variables à configurer** :

```env
# API MailWizz générale (ligne 54-56)
MAILWIZZ_API_URL=http://mailwizz.local/api
MAILWIZZ_API_PUBLIC_KEY=votre_cle_publique_ici
MAILWIZZ_API_PRIVATE_KEY=votre_cle_privee_ici

# Tenant 1 - SOS-Expat (ligne 69-71)
MAILWIZZ_SOS_API_URL=https://mail.sos-expat.com/api
MAILWIZZ_SOS_API_KEY=votre_cle_api_sos_expat
MAILWIZZ_SOS_LIST_ID=votre_list_id_par_defaut

# Tenant 2 - Ulixai (ligne 74-76)
MAILWIZZ_ULIXAI_API_URL=https://mail.ulixai.com/api
MAILWIZZ_ULIXAI_API_KEY=votre_cle_api_ulixai
MAILWIZZ_ULIXAI_LIST_ID=votre_list_id_par_defaut
```

**✅ Avantage sécurité** :
- Fichier `.env` dans `.gitignore`
- Pas de secrets dans le code
- Variables d'environnement injectées au runtime

---

### 4. Configuration Base de Données

**Emplacement** : Fichier `.env`

```env
# PostgreSQL (ligne 32-35)
POSTGRES_USER=email_engine
POSTGRES_PASSWORD=email_engine_password
POSTGRES_DB=email_engine
DATABASE_URL=postgresql://email_engine:email_engine_password@localhost:5432/email_engine
```

**✅ Avantage** : Configuration centralisée, facile à changer

---

### 5. Clés DKIM

**Emplacement** :
```
email-engine/powermta/dkim/
  ├── domain1.com/
  │   ├── dkim.pem
  │   └── dkim.pub
  └── domain2.com/
      ├── dkim.pem
      └── dkim.pub
```

**Mount dans Docker** :
```yaml
volumes:
  - ./powermta/dkim:/home/pmta/conf/mail:ro
```

---

## 🔄 RÉUTILISATION : Copier les Licences entre les deux systèmes

### Étape 1 : Copier la Licence PMTA

```powershell
# Windows PowerShell
Copy-Item "Outils d'emailing\backup-cold\pmta-license-20260216" "..\email-engine\powermta\license"
```

```bash
# Linux/Mac
cp "Outils d'emailing/backup-cold/pmta-license-20260216" "../email-engine/powermta/license"
```

---

### Étape 2 : Copier la Config PMTA (optionnel)

```powershell
# Windows
Copy-Item "Outils d'emailing\backup-cold\pmta-config-20260216" "..\email-engine\powermta\config.backup"
```

⚠️ **Attention** : Ne pas écraser `powermta/config` directement, il a déjà une structure pour email-engine

---

### Étape 3 : Extraire les Clés MailWizz

**Depuis la base de données** :

```bash
# Se connecter à MySQL
mysql -u root -p

# Utiliser la base
USE mailapp;

# Lister les clés API
SELECT customer_id, public, private, date_added
FROM mw_customer_api_key;
```

**OU via l'interface MailWizz** :
1. Se connecter : https://mail.sos-expat.com
2. Settings → API Keys
3. Copier les clés publique et privée

---

### Étape 4 : Configurer email-engine/.env

```bash
cd email-engine
nano .env
```

Modifier ces lignes avec les vraies clés :
```env
MAILWIZZ_API_PUBLIC_KEY=la_cle_publique_copiee
MAILWIZZ_API_PRIVATE_KEY=la_cle_privee_copiee
MAILWIZZ_SOS_API_KEY=la_cle_api_sos_expat
MAILWIZZ_ULIXAI_API_KEY=la_cle_api_ulixai
```

---

## 📋 CHECKLIST CONFIGURATION

### ✅ Fichiers à copier

- [ ] Licence PMTA : `backup-cold/pmta-license-20260216` → `email-engine/powermta/license`
- [ ] Config PMTA (référence) : `backup-cold/pmta-config-20260216` → `email-engine/powermta/config.backup`
- [ ] Clés DKIM (si besoin) : Extraire de l'archive `mailwizz-prod-20260216.tar.gz`

### ✅ Clés API à récupérer

- [ ] Clé publique MailWizz → `.env` ligne 55
- [ ] Clé privée MailWizz → `.env` ligne 56
- [ ] Clé API SOS-Expat → `.env` ligne 70
- [ ] Clé API Ulixai → `.env` ligne 75

### ✅ Vérification

```bash
# Démarrer email-engine
cd email-engine
docker-compose up -d

# Vérifier les logs
docker-compose logs api

# Tester l'API
curl http://localhost:8000/health
```

---

## 🎯 RÉSUMÉ DES DIFFÉRENCES

| Aspect | Système 1 (MailWizz+PMTA) | Système 2 (Email-Engine) |
|--------|---------------------|------------------------|
| **Licence PMTA** | `/etc/pmta/license` sur serveur | `powermta/license` + Docker mount |
| **Config PMTA** | `/etc/pmta/config` modifié manuellement | `powermta/config` versionné Git |
| **Clés MailWizz** | Base MySQL `mw_customer_api_key` | Fichier `.env` (variables) |
| **Config DB** | PHP hardcodé | `.env` (DATABASE_URL) |
| **Sécurité** | Mots de passe en clair dans code | `.env` dans .gitignore |
| **Déploiement** | Manuel via SSH | Docker Compose automatisé |
| **Backup** | Scripts PowerShell manuels | Volumes Docker + backups auto |

---

## 🔒 SÉCURITÉ - BONNES PRATIQUES

### Système 1 (MailWizz+PMTA) ⚠️

- Mots de passe en clair dans `main-custom.php`
- Clés API exposées dans dump SQL
- Configuration modifiée directement sur serveur
- Pas de gestion centralisée des secrets

### Système 2 (Email-Engine) ✅

- Fichier `.env` dans `.gitignore`
- Variables d'environnement injectées
- Secrets Docker (optionnel pour production)
- Configuration versionnée sans secrets
- Rotation facile des clés (éditer `.env` + restart)

---

## 📞 AIDE RAPIDE

### Obtenir vos clés MailWizz actuelles

**Via base de données** :
```sql
mysql -u mailapp -p mailapp
SELECT public, private FROM mw_customer_api_key;
```

**Via interface web** :
1. https://mail.sos-expat.com/backend/index.php/api/api_keys
2. Copier les clés affichées

### Vérifier que la licence PMTA est valide

```bash
# Sur serveur Linux
cat /etc/pmta/license

# Doit contenir:
# - product: PowerMTA
# - expires: never (ou date future)
# - check: [signature]
```

---

**Document créé le** : 2026-02-16
**Auteur** : Claude Code
**Version** : 1.0
