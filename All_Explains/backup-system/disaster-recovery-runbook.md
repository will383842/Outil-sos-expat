# RUNBOOK DISASTER RECOVERY - SOS EXPAT

**Date:** 2026-01-11
**Projet:** sos-urgently-ac307
**Version:** 1.0

---

## CONTACTS D'URGENCE

| Role | Contact | Disponibilite |
|------|---------|---------------|
| **Admin Principal** | [Email] | 24/7 |
| **Support Firebase** | https://firebase.google.com/support | Business hours |
| **Support GCP** | https://console.cloud.google.com/support | 24/7 (Premium) |
| **Support Stripe** | https://support.stripe.com | 24/7 |
| **Support Twilio** | https://support.twilio.com | 24/7 |
| **Support PayPal** | https://developer.paypal.com/support | Business hours |

---

## SOMMAIRE DES PROCEDURES

| Scenario | Temps Estime | Page |
|----------|--------------|------|
| Perte totale Firestore | 30-60 min | Section 1 |
| Perte partielle Firestore | 15-30 min | Section 2 |
| Perte Firebase Auth | 15-30 min | Section 3 |
| Perte Cloud Storage | 30-60 min | Section 4 |
| Corruption de donnees | 60-120 min | Section 5 |
| Panne regionale GCP | 2-4 heures | Section 6 |
| Restauration complete | 1-2 heures | Section 7 |

---

## SECTION 1: PERTE TOTALE FIRESTORE

### Symptomes
- Console Firebase: "Database unavailable"
- Erreurs: `UNAVAILABLE` ou `DEADLINE_EXCEEDED`
- Application: ecran blanc ou erreurs de chargement

### Etape 1: Evaluation (5 min)
```bash
# Verifier le statut GCP
gcloud firestore operations list

# Verifier les backups disponibles
gcloud firestore backups list --database="(default)"
```

### Etape 2: Identifier le backup (2 min)
```bash
# Via Firebase Console
# Project > Firestore > Backups

# Ou via gsutil
gsutil ls gs://sos-urgently-ac307.firebasestorage.app/scheduled-backups/
```

### Etape 3: Restauration (15-30 min)
```bash
# Restaurer depuis le dernier backup
gcloud firestore import gs://sos-urgently-ac307.firebasestorage.app/scheduled-backups/morning/backup-TIMESTAMP

# Suivre la progression
gcloud firestore operations list
```

### Etape 4: Verification (10 min)
- [ ] Collections critiques presentes (users, sos_profiles, payments)
- [ ] Comptage des documents correct
- [ ] Application fonctionnelle
- [ ] Aucune erreur dans les logs

---

## SECTION 2: PERTE PARTIELLE FIRESTORE

### Symptomes
- Collection specifique manquante ou corrompue
- Donnees incompletes
- Erreurs sur certaines pages seulement

### Procedure
1. **Ne PAS restaurer la base entiere**
2. Identifier la collection affectee
3. Utiliser l'interface admin pour restaurer selectivement

```javascript
// Via Admin Console (recommande)
// Admin > Backup & Restore > Restore Collection

// Ou via Cloud Function
await adminRestoreFirestore({
  backupId: 'backup-xxx',
  collections: ['affected_collection']
});
```

---

## SECTION 3: PERTE FIREBASE AUTH

### Symptomes
- Utilisateurs ne peuvent pas se connecter
- `auth/user-not-found` errors
- Custom claims manquants

### Etape 1: Verifier les backups Auth
```bash
# Lister les backups disponibles
gsutil ls gs://sos-urgently-ac307.firebasestorage.app/auth_backups/
```

### Etape 2: Telecharger le backup
```bash
# Telecharger le dernier backup
gsutil cp gs://sos-urgently-ac307.firebasestorage.app/auth_backups/auth_backup_YYYY-MM-DD.json ./
```

### Etape 3: Restaurer via Admin Interface
1. Acceder a Admin Console
2. Aller a Admin > Backup & Restore
3. Selectionner "Restore Auth"
4. Uploader le fichier JSON
5. Confirmer avec le code de confirmation

### Etape 4: Verification
- [ ] Utilisateurs peuvent se connecter
- [ ] Custom claims restaures
- [ ] Profils lies correctement

---

## SECTION 4: PERTE CLOUD STORAGE

### Symptomes
- Images de profil manquantes
- Documents KYC inaccessibles
- Factures PDF introuvables

### Procedure depuis bucket DR
```bash
# Verifier le bucket DR
gsutil ls gs://sos-expat-backup-dr/storage-backup/

# Restaurer les fichiers
gsutil -m cp -r gs://sos-expat-backup-dr/storage-backup/* gs://sos-urgently-ac307.firebasestorage.app/

# Par dossier specifique
gsutil -m cp -r gs://sos-expat-backup-dr/storage-backup/profilePhotos/* gs://sos-urgently-ac307.firebasestorage.app/profilePhotos/
```

---

## SECTION 5: CORRUPTION DE DONNEES

### Symptomes
- Donnees incoherentes (montants faux, statuts incorrects)
- Ecritures comptables desequilibrees
- Relations brisees entre collections

### Procedure
1. **STOP** - Arreter l'acces utilisateur si possible
2. Identifier l'etendue de la corruption
3. Determiner le point de restauration (dernier backup sain)
4. Creer un backup pre-restauration

```bash
# Creer backup avant restauration
firebase functions:call adminCreateManualBackup --data '{"reason":"pre-corruption-restore"}'

# Restaurer vers le point sain
gcloud firestore import gs://sos-urgently-ac307.firebasestorage.app/scheduled-backups/[HEALTHY_BACKUP]
```

---

## SECTION 6: PANNE REGIONALE GCP

### Symptomes
- Erreurs `UNAVAILABLE` sur tous les services
- Dashboard GCP: incident dans europe-west1
- https://status.cloud.google.com affiche un incident

### Procedure (Failover vers DR)
```bash
# 1. Verifier le bucket DR (europe-west3)
gsutil ls gs://sos-expat-backup-dr/

# 2. Copier le dernier backup vers une autre region
gsutil -m cp -r gs://sos-expat-backup-dr/scheduled-backups/latest gs://sos-expat-restore-temp/

# 3. Si necessaire, creer un nouveau projet Firebase dans une autre region
# ATTENTION: Ceci est un dernier recours
```

### Post-incident
1. Attendre la resolution de l'incident GCP
2. Verifier l'integrite des donnees
3. Restaurer depuis DR si necessaire

---

## SECTION 7: RESTAURATION COMPLETE

### Pre-requis
- [ ] Acces admin Firebase
- [ ] gcloud CLI configure
- [ ] Credentials disponibles

### Etape 1: Firestore (30 min)
```bash
# Identifier le meilleur backup
gsutil ls -l gs://sos-urgently-ac307.firebasestorage.app/scheduled-backups/

# Restaurer
gcloud firestore import gs://[BUCKET]/[BACKUP_PATH]

# Attendre completion
watch gcloud firestore operations list
```

### Etape 2: Firebase Auth (15 min)
```bash
# Telecharger le backup
gsutil cp gs://sos-urgently-ac307.firebasestorage.app/auth_backups/auth_backup_LATEST.json ./

# Restaurer via Admin SDK ou interface
# L'interface admin est recommandee
```

### Etape 3: Storage (30 min)
```bash
# Depuis le bucket DR
gsutil -m cp -r gs://sos-expat-backup-dr/storage-backup/* gs://sos-urgently-ac307.firebasestorage.app/
```

### Etape 4: Cloud Functions (10 min)
```bash
# Redeployer depuis Git
cd sos/firebase/functions
npm install
npm run build
firebase deploy --only functions
```

### Etape 5: Verification Complete (20 min)
- [ ] Homepage se charge
- [ ] Login fonctionne
- [ ] Profils prestataires visibles
- [ ] Paiements Stripe fonctionnels
- [ ] Paiements PayPal fonctionnels
- [ ] Appels Twilio fonctionnels
- [ ] Factures generees correctement
- [ ] Admin console accessible

---

## CHECKLIST DE VERIFICATION POST-RESTAURATION

### Collections Critiques
```
[ ] users: ___ documents (attendu: ~500+)
[ ] sos_profiles: ___ documents (attendu: ~100+)
[ ] call_sessions: ___ documents (attendu: ~1000+)
[ ] payments: ___ documents (attendu: ~500+)
[ ] subscriptions: ___ documents (attendu: ~100+)
[ ] invoices: ___ documents (attendu: ~500+)
```

### Fonctionnalites
```
[ ] Inscription client
[ ] Inscription prestataire
[ ] Connexion existante
[ ] Recherche prestataires
[ ] Initiation appel SOS
[ ] Paiement Stripe
[ ] Paiement PayPal
[ ] Generation facture
[ ] Admin console
```

### Integrations
```
[ ] Webhooks Stripe repondent
[ ] Webhooks PayPal repondent
[ ] Twilio: test appel
[ ] Emails transactionnels
```

---

## METRIQUES CIBLES

| Metrique | Cible | Acceptable |
|----------|-------|------------|
| **RTO** (Recovery Time Objective) | 1 heure | 2 heures |
| **RPO Firestore** (Recovery Point Objective) | 8 heures | 12 heures |
| **RPO Auth** | 24 heures | 48 heures |
| **RPO Storage** | 24 heures | 48 heures |

---

## COMMANDES UTILES

### Firestore
```bash
# Lister operations
gcloud firestore operations list

# Importer backup
gcloud firestore import gs://BUCKET/PATH

# Exporter backup manuel
gcloud firestore export gs://BUCKET/manual-backup-$(date +%Y%m%d)
```

### Storage
```bash
# Lister buckets
gsutil ls

# Copier recursif
gsutil -m cp -r gs://SOURCE/* gs://DEST/

# Synchroniser
gsutil -m rsync -r gs://SOURCE gs://DEST
```

### Firebase
```bash
# Deployer functions
firebase deploy --only functions

# Deployer hosting
firebase deploy --only hosting

# Voir logs
firebase functions:log --only functionName
```

---

## HISTORIQUE DES INCIDENTS

| Date | Type | Duree | Resolution |
|------|------|-------|------------|
| - | - | - | - |

---

## REVISION DU DOCUMENT

| Version | Date | Auteur | Modifications |
|---------|------|--------|---------------|
| 1.0 | 2026-01-11 | Claude Code | Creation initiale |

---

**Ce document doit etre revu et teste trimestriellement.**
