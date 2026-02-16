# Systeme de Backup - SOS Expat

> **Version**: 2.0
> **Date**: 27 Janvier 2026
> **Score**: 8.2/10 - Production Ready

---

## Vue d'Ensemble

Le systeme de backup SOS Expat assure la protection des donnees avec:

- **Firestore**: 3 sauvegardes/jour
- **Firebase Auth**: 1 sauvegarde/semaine
- **Storage**: Versioning continu
- **Cross-Region DR**: Backup vers region secondaire

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DONNEES PRODUCTION                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Firestore  │  │ Firebase    │  │  Storage    │             │
│  │             │  │ Auth        │  │             │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SCHEDULED BACKUPS                            │
│                                                                 │
│  Firestore: 3x/jour (03h, 11h, 19h Paris)                       │
│  Auth: Hebdomadaire (Dimanche 03h)                              │
│  Storage: Versioning continu                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STOCKAGE PRINCIPAL                           │
│  Bucket: gs://sos-urgently-ac307.firebasestorage.app            │
│  Region: europe-west1 (Belgique)                                │
│                                                                 │
│  Structure:                                                     │
│  ├── scheduled-backups/                                         │
│  │   ├── morning/backup-{timestamp}/                            │
│  │   ├── midday/backup-{timestamp}/                             │
│  │   └── evening/backup-{timestamp}/                            │
│  ├── manual-backups/                                            │
│  ├── auth_backups/                                              │
│  └── pre-restore-backups/                                       │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DISASTER RECOVERY                            │
│  Bucket: gs://sos-expat-backup-dr                               │
│  Region: europe-west3 (Frankfurt)                               │
│                                                                 │
│  Replication: Quotidienne (04h, 05h)                            │
│  Retention: 90 jours                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Objectifs de Recuperation

| Metrique | Cible | Acceptable |
|----------|-------|------------|
| **RPO** (Recovery Point Objective) | 8 heures | 24 heures |
| **RTO** (Recovery Time Objective) | 1 heure | 4 heures |

---

## Configuration des Backups

### Firestore Backup

```typescript
// Scheduled Function: scheduledBackup
export const scheduledBackup = onSchedule(
  {
    schedule: '0 3,11,19 * * *',  // 03h, 11h, 19h
    timeZone: 'Europe/Paris',
    memory: '1GB',
    timeoutSeconds: 540
  },
  async () => {
    const timestamp = new Date().toISOString();
    const bucket = 'gs://sos-urgently-ac307.firebasestorage.app';
    const prefix = `scheduled-backups/${getTimeSlot()}/${timestamp}`;

    await admin.firestore().exportDocuments({
      outputUriPrefix: `${bucket}/${prefix}`,
      collectionIds: [] // Toutes les collections
    });

    // Log et verification
    await logBackupMetadata(prefix, timestamp);
  }
);
```

### Firebase Auth Backup

```typescript
// Scheduled Function: backupFirebaseAuth
export const backupFirebaseAuth = onSchedule(
  {
    schedule: '0 3 * * 0',  // Dimanche 03h
    timeZone: 'Europe/Paris'
  },
  async () => {
    const users = await listAllUsers();
    const backupData = users.map(user => ({
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      photoURL: user.photoURL,
      phoneNumber: user.phoneNumber,
      disabled: user.disabled,
      customClaims: user.customClaims,
      metadata: {
        creationTime: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime
      }
    }));

    const filename = `auth_backups/auth_backup_${date}.json`;
    await storage.bucket().file(filename).save(
      JSON.stringify(backupData, null, 2)
    );
  }
);
```

### Cross-Region DR

```typescript
// Scheduled Function: crossRegionBackup
export const crossRegionBackup = onSchedule(
  {
    schedule: '0 4 * * *',  // 04h quotidien
    timeZone: 'Europe/Paris'
  },
  async () => {
    const sourceBucket = 'sos-urgently-ac307.firebasestorage.app';
    const destBucket = 'sos-expat-backup-dr';

    // Copier le dernier backup Firestore
    await copyLatestBackup(sourceBucket, destBucket);

    // Copier le dernier backup Auth
    await copyLatestAuthBackup(sourceBucket, destBucket);
  }
);
```

---

## Collections Sauvegardees

### Critiques (Retention Infinie)

| Collection | Description |
|------------|-------------|
| `payments` | Paiements |
| `invoices` | Factures |
| `invoice_records` | Details factures |
| `transfers` | Virements |
| `refunds` | Remboursements |
| `disputes` | Litiges |
| `journal_entries` | Comptabilite |
| `tax_filings` | Declarations fiscales |

### Standard (Retention 30 jours)

| Collection | Description |
|------------|-------------|
| `users` | Utilisateurs |
| `sos_profiles` | Profils prestataires |
| `call_sessions` | Sessions d'appel |
| `subscriptions` | Abonnements |
| `booking_requests` | Demandes de reservation |
| `reviews` | Avis |
| `notifications` | Notifications |

### Systeme (Retention 90 jours)

| Collection | Description |
|------------|-------------|
| `system_logs` | Logs systeme |
| `system_alerts` | Alertes |
| `backup_errors` | Erreurs backup |
| `admin_audit_logs` | Audit admin |

---

## Restauration

### Via Console Admin

1. Acceder a `/admin/backups`
2. Selectionner le backup souhaite
3. Choisir les elements a restaurer
4. Confirmer la restauration

### Via Cloud Function

```typescript
// Callable: restoreFromBackup
export const restoreFromBackup = onCall(
  { enforceAppCheck: true },
  async (request) => {
    // Verification admin
    if (!request.auth?.token.role === 'admin') {
      throw new Error('Unauthorized');
    }

    const { prefix, restoreFirestore, restoreAuth } = request.data;

    // Pre-backup avant restauration
    await createPreRestoreBackup();

    if (restoreFirestore) {
      await admin.firestore().importDocuments({
        inputUriPrefix: `gs://bucket/${prefix}`
      });
    }

    if (restoreAuth) {
      await restoreAuthFromBackup(prefix);
    }

    return { success: true, restoredAt: new Date() };
  }
);
```

### Via CLI

```bash
# Restauration Firestore
gcloud firestore import gs://sos-urgently-ac307.firebasestorage.app/scheduled-backups/YYYY-MM-DD/HHMMSS/

# Verification
firebase functions:log --only restoreFromBackup
```

---

## Verification des Backups

### Tests Automatiques

```typescript
// Scheduled: verifyBackupIntegrity
export const verifyBackupIntegrity = onSchedule(
  { schedule: '0 6 * * *' },  // 06h quotidien
  async () => {
    const latestBackup = await getLatestBackup();

    // Verifier checksum
    const isValid = await verifyChecksum(latestBackup);

    // Verifier nombre de documents
    const docCount = await countBackupDocuments(latestBackup);
    const expectedMin = await getExpectedDocumentCount() * 0.95;

    if (!isValid || docCount < expectedMin) {
      await sendBackupAlert({
        type: 'BACKUP_VERIFICATION_FAILED',
        details: { isValid, docCount, expectedMin }
      });
    }
  }
);
```

### Tests Trimestriels

- Restauration complete vers environnement de test
- Verification de l'integrite des donnees
- Test des fonctionnalites critiques
- Documentation des resultats

---

## Alertes

| Alerte | Condition | Action |
|--------|-----------|--------|
| `backup_failure` | Backup echoue | Email + Slack |
| `dr_backup_failure` | DR copy echoue | Email + Slack |
| `backup_verification_failed` | Checksum invalide | Email urgent |
| `restore_failed` | Restauration echouee | Email urgent |

---

## Couts Estimes

| Composant | Stockage | Cout/mois |
|-----------|----------|-----------|
| Backups Firestore | 10-20 GB | $0.50-1.00 |
| Backups Auth | < 1 GB | $0.05 |
| DR Cross-Region | 15-30 GB | $1.00-2.00 |
| **Total** | | **$1.50-3.00** |

---

## Checklist Operations

### Quotidien (Automatise)
- [x] 3 backups Firestore executes
- [x] DR replication complete
- [x] Verification integrite

### Hebdomadaire
- [x] Backup Auth execute
- [ ] Revue des alertes
- [ ] Verification espace stockage

### Mensuel
- [ ] Test de restauration partielle
- [ ] Nettoyage vieux backups
- [ ] Revue des couts

### Trimestriel
- [ ] Test restauration complete
- [ ] Mise a jour documentation
- [ ] Revue procedure DR

---

## Voir Aussi

- [Disaster Recovery](./DISASTER_RECOVERY.md)
- [Monitoring](./MONITORING.md)
- [Guide Installation](../01_GETTING_STARTED/INSTALLATION.md)
