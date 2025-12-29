# Procédures de Disaster Recovery - SOS-Expat

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Inventaire des backups](#inventaire-des-backups)
3. [Restauration Firestore](#restauration-firestore)
4. [Restauration Firebase Auth](#restauration-firebase-auth)
5. [Restauration Firebase Storage](#restauration-firebase-storage)
6. [Restauration enregistrements Twilio](#restauration-enregistrements-twilio)
7. [Récupération données Stripe](#récupération-données-stripe)
8. [Contacts d'urgence](#contacts-durgence)
9. [Checklist post-incident](#checklist-post-incident)

---

## Vue d'ensemble

### Objectifs de récupération

| Métrique | Objectif |
|----------|----------|
| **RPO** (Recovery Point Objective) | 24 heures |
| **RTO** (Recovery Time Objective) | 4 heures |

### Architecture de backup

```
┌─────────────────────────────────────────────────────────────┐
│                    SOS-EXPAT BACKUP SYSTEM                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Firestore   │    │ Firebase Auth│    │   Storage    │  │
│  │   (Daily)    │    │  (Weekly)    │    │ (Versioning) │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                   │                    │          │
│         ▼                   ▼                    ▼          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Google Cloud Storage                     │  │
│  │         gs://sos-expat-prod-backups                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐                      │
│  │Twilio Record │    │    Stripe    │                      │
│  │   (Daily)    │    │  (External)  │                      │
│  └──────┬───────┘    └──────────────┘                      │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         call_recordings_backup/ (Storage)            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Inventaire des backups

### 1. Firestore (Base de données principale)

| Attribut | Valeur |
|----------|--------|
| **Fréquence** | Quotidien à 3h (Paris) |
| **Rétention** | 30 jours |
| **Destination** | `gs://sos-expat-prod-backups/firestore/` |
| **Format** | Export natif Firestore |
| **Fonction** | `scheduledBackup` (Cloud Scheduler) |

### 2. Firebase Auth (Utilisateurs)

| Attribut | Valeur |
|----------|--------|
| **Fréquence** | Hebdomadaire (dimanche 3h) |
| **Rétention** | 90 jours |
| **Destination** | `gs://sos-expat-prod.appspot.com/auth_backups/` |
| **Format** | JSON |
| **Fonction** | `backupFirebaseAuth` |

### 3. Firebase Storage (Fichiers)

| Attribut | Valeur |
|----------|--------|
| **Type** | Versioning GCS |
| **Versions conservées** | 3 par fichier |
| **Rétention versions** | 90 jours |
| **Bucket** | `gs://sos-expat-prod.appspot.com/` |

### 4. Enregistrements Twilio

| Attribut | Valeur |
|----------|--------|
| **Fréquence** | Quotidien à 2h (Paris) |
| **Source** | Twilio API (expire après 30j) |
| **Destination** | `gs://sos-expat-prod.appspot.com/call_recordings_backup/` |
| **Format** | MP3 |
| **Fonction** | `backupTwilioRecordings` |

---

## Restauration Firestore

### Scénario 1: Restauration complète

```bash
# 1. Lister les backups disponibles
gcloud firestore operations list --project=sos-expat-prod

# 2. Identifier le backup à restaurer
gsutil ls gs://sos-expat-prod-backups/firestore/

# 3. Restaurer vers une nouvelle base (recommandé pour test)
gcloud firestore import gs://sos-expat-prod-backups/firestore/2024-12-28 \
  --project=sos-expat-prod

# 4. OU restaurer en écrasant (ATTENTION: destructif)
gcloud firestore import gs://sos-expat-prod-backups/firestore/2024-12-28 \
  --project=sos-expat-prod \
  --async
```

### Scénario 2: Restauration d'une collection spécifique

```bash
# 1. Exporter la collection du backup vers un fichier local
# (nécessite un script personnalisé)

# 2. Utiliser le script de restauration sélective
node scripts/restore-collection.js --backup=2024-12-28 --collection=users
```

### Scénario 3: Restauration via Admin Console

1. Aller sur [Firebase Console](https://console.firebase.google.com)
2. Sélectionner le projet `sos-expat-prod`
3. Firestore Database → Import/Export
4. Sélectionner le backup à restaurer

### Temps estimé de restauration

| Taille | Temps estimé |
|--------|--------------|
| < 1 GB | ~10 minutes |
| 1-10 GB | ~30 minutes |
| > 10 GB | ~1-2 heures |

---

## Restauration Firebase Auth

### Scénario 1: Restauration complète des utilisateurs

```bash
# 1. Lister les backups Auth disponibles
firebase functions:call listAuthBackups --region=europe-west1

# 2. Télécharger le backup JSON
gsutil cp gs://sos-expat-prod.appspot.com/auth_backups/auth_backup_2024-12-28.json ./

# 3. Utiliser le script de restauration
node scripts/restore-auth-users.js --file=auth_backup_2024-12-28.json
```

### Scénario 2: Restauration d'utilisateurs spécifiques

```javascript
// Script: scripts/restore-auth-users.js
const admin = require('firebase-admin');
const backup = require('./auth_backup_2024-12-28.json');

async function restoreUser(userData) {
  try {
    await admin.auth().createUser({
      uid: userData.uid,
      email: userData.email,
      emailVerified: userData.emailVerified,
      displayName: userData.displayName,
      phoneNumber: userData.phoneNumber,
      disabled: userData.disabled
    });

    // Restaurer les custom claims
    if (userData.customClaims) {
      await admin.auth().setCustomUserClaims(userData.uid, userData.customClaims);
    }

    console.log(`Restored user: ${userData.email}`);
  } catch (error) {
    if (error.code === 'auth/uid-already-exists') {
      console.log(`User ${userData.email} already exists, skipping`);
    } else {
      throw error;
    }
  }
}
```

### Limitations

- Les mots de passe ne peuvent PAS être restaurés
- Les utilisateurs devront réinitialiser leur mot de passe
- Les tokens de session seront invalidés

---

## Restauration Firebase Storage

### Scénario 1: Restaurer une version précédente d'un fichier

```bash
# 1. Lister les versions disponibles
gsutil ls -a gs://sos-expat-prod.appspot.com/path/to/file

# Résultat exemple:
# gs://bucket/file#1234567890
# gs://bucket/file#1234567891 (current)

# 2. Restaurer une version spécifique
gsutil cp "gs://sos-expat-prod.appspot.com/path/to/file#1234567890" \
  gs://sos-expat-prod.appspot.com/path/to/file
```

### Scénario 2: Restaurer un dossier entier

```bash
# 1. Identifier la date de restauration
DATE="2024-12-28T00:00:00Z"

# 2. Script de restauration par date
gsutil ls -a gs://sos-expat-prod.appspot.com/profiles/ | while read file; do
  # Filtrer par date et restaurer
  version=$(gsutil ls -a "$file" | grep "#" | head -n1)
  if [ -n "$version" ]; then
    gsutil cp "$version" "${file%%#*}"
  fi
done
```

### Scénario 3: Fichier supprimé accidentellement

```bash
# Les fichiers supprimés sont conservés comme versions "non-live"
# 1. Trouver le fichier supprimé
gsutil ls -a gs://sos-expat-prod.appspot.com/deleted/file

# 2. Le restaurer
gsutil cp "gs://bucket/deleted/file#generation" gs://bucket/restored/file
```

---

## Restauration enregistrements Twilio

### Localisation des backups

```
gs://sos-expat-prod.appspot.com/call_recordings_backup/
├── 2024/
│   └── 12/
│       ├── 28/
│       │   ├── RE_abc123.mp3
│       │   └── RE_def456.mp3
│       └── 29/
│           └── ...
```

### Télécharger un enregistrement

```bash
# Via gsutil
gsutil cp gs://sos-expat-prod.appspot.com/call_recordings_backup/2024/12/28/RE_abc123.mp3 ./

# Via URL signée (depuis Firestore)
# Le champ `backupUrl` dans call_recordings contient l'URL
```

### Vérifier le statut des backups

```bash
# Via fonction admin
firebase functions:call getTwilioBackupStats --region=europe-west1
```

---

## Récupération données Stripe

### Stripe conserve tout l'historique

Les données Stripe ne nécessitent pas de backup car Stripe les conserve indéfiniment.

### Accéder aux données

1. **Dashboard Stripe**: https://dashboard.stripe.com
2. **API Stripe**: Utiliser les endpoints de listing

```bash
# Exemple: Lister tous les paiements
curl https://api.stripe.com/v1/charges \
  -u sk_live_xxx: \
  -d limit=100

# Exemple: Récupérer un paiement spécifique
curl https://api.stripe.com/v1/charges/ch_xxx \
  -u sk_live_xxx:
```

### Synchronisation si désynchronisation Firestore/Stripe

```bash
# Utiliser la fonction de sync
firebase functions:call syncStripeData --region=europe-west1

# Ou manuellement via le webhook replay
# Dashboard Stripe → Developers → Webhooks → Resend events
```

---

## Contacts d'urgence

### Équipe technique

| Rôle | Contact |
|------|---------|
| CTO | cto@sos-expat.com |
| DevOps Lead | devops@sos-expat.com |
| On-call | +33 X XX XX XX XX |

### Support externe

| Service | Contact |
|---------|---------|
| Firebase Support | https://firebase.google.com/support |
| Stripe Support | https://support.stripe.com |
| Twilio Support | https://support.twilio.com |

### Escalade

1. **Niveau 1** (0-15 min): DevOps on-call
2. **Niveau 2** (15-30 min): CTO
3. **Niveau 3** (30+ min): Équipe complète + Support Google

---

## Checklist post-incident

### Immédiat (0-1 heure)

- [ ] Identifier la cause racine
- [ ] Restaurer le service (même partiellement)
- [ ] Communiquer avec les utilisateurs affectés
- [ ] Documenter les actions prises

### Court terme (1-24 heures)

- [ ] Restauration complète des données si nécessaire
- [ ] Vérifier l'intégrité des données restaurées
- [ ] Tester les fonctionnalités critiques
- [ ] Mettre à jour le status page

### Moyen terme (24-72 heures)

- [ ] Rédiger le post-mortem
- [ ] Identifier les améliorations nécessaires
- [ ] Planifier les corrections
- [ ] Briefing équipe

### Post-mortem template

```markdown
## Incident Report - [DATE]

### Résumé
- **Durée**: X heures Y minutes
- **Impact**: X utilisateurs affectés
- **Sévérité**: Critical/High/Medium/Low

### Timeline
- HH:MM - Détection de l'incident
- HH:MM - Actions prises
- HH:MM - Résolution

### Cause racine
[Description]

### Impact
[Description de l'impact utilisateur et business]

### Actions correctives
1. [Action 1]
2. [Action 2]

### Leçons apprises
[Points clés]
```

---

## Maintenance préventive

### Vérifications hebdomadaires

```bash
# Vérifier la santé du système
firebase functions:call getSystemHealthSummary --region=europe-west1

# Vérifier les alertes actives
firebase functions:call getActiveAlerts --region=europe-west1
```

### Vérifications mensuelles

- [ ] Test de restauration Firestore (sur environnement de test)
- [ ] Test de restauration Auth (sur environnement de test)
- [ ] Vérifier les coûts de stockage des backups
- [ ] Réviser les politiques de rétention

### Tests de DR annuels

- [ ] Simulation de perte complète de base de données
- [ ] Test de basculement sur backup
- [ ] Mesure du RTO réel
- [ ] Mise à jour de cette documentation

---

*Dernière mise à jour: Décembre 2024*
*Version: 2.0*
