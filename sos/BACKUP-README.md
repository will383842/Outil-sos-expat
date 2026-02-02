# Sauvegarde Firebase - SOS Expat

## Prerequis

Avant d'utiliser ces scripts, assurez-vous d'avoir installe:

### 1. Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### 2. Google Cloud SDK (pour gsutil - optionnel mais recommande)
Telecharger depuis: https://cloud.google.com/sdk/docs/install

```bash
gcloud auth login
gcloud config set project sos-urgently-ac307
```

### 3. Verifier l'acces au projet
```bash
firebase projects:list
```

---

## Utilisation

### Sauvegarde manuelle (ponctuelle)
Double-cliquez sur **`backup-now.bat`**

### Sauvegarde automatique quotidienne
1. Clic droit sur **`setup-daily-backup.bat`**
2. Selectionnez **"Executer en tant qu'administrateur"**
3. La sauvegarde s'executera chaque nuit a 02:00

---

## Emplacement des sauvegardes

```
C:\FirebaseBackups\sos-expat\
    2024-01-15_02-00-00\
        firestore\           <- Base de donnees
        storage\             <- Fichiers uploades
        auth\                <- Utilisateurs
        secrets\             <- Config et variables d'env
        rules\               <- Regles de securite
        code\                <- Code source
        backup.log           <- Journal de la sauvegarde
```

---

## Restauration

### Restaurer Firestore

```javascript
// Script de restauration (a executer dans firebase/functions)
const admin = require('firebase-admin');
const fs = require('fs');

admin.initializeApp({ projectId: 'sos-urgently-ac307' });
const db = admin.firestore();

async function restore(backupPath) {
    const fullBackup = JSON.parse(fs.readFileSync(
        `${backupPath}/firestore/_FULL_BACKUP.json`, 'utf8'
    ));

    for (const [collectionName, documents] of Object.entries(fullBackup)) {
        console.log(`Restauration: ${collectionName}`);

        for (const doc of documents) {
            await db.collection(collectionName).doc(doc.id).set(doc.data);

            // Restaurer les sous-collections
            if (doc.subcollections) {
                for (const [subName, subDocs] of Object.entries(doc.subcollections)) {
                    for (const subDoc of subDocs) {
                        await db.collection(collectionName)
                            .doc(doc.id)
                            .collection(subName)
                            .doc(subDoc.id)
                            .set(subDoc.data);
                    }
                }
            }
        }
    }
    console.log('Restauration terminee!');
}

// Utilisation:
// restore('C:/FirebaseBackups/sos-expat/2024-01-15_02-00-00');
```

### Restaurer Authentication

```bash
firebase auth:import chemin/vers/backup/auth/users.json --project sos-urgently-ac307
```

### Restaurer Storage

```bash
# Avec gsutil
gsutil -m cp -r chemin/vers/backup/storage/* gs://sos-urgently-ac307.appspot.com/
```

### Restaurer les Secrets

```bash
# Restaurer la config des functions
firebase functions:config:set $(cat chemin/vers/backup/secrets/functions-config.json | jq -r 'to_entries | .[] | "\(.key)=\(.value)"')
```

---

## Personnalisation

### Changer le dossier de destination
Editez `backup-firebase.ps1` et modifiez:
```powershell
$BackupRoot = "D:\MesSauvegardes\Firebase"
```

### Changer la retention (par defaut 30 jours)
```powershell
$RetentionDays = 60
```

### Changer l'heure de sauvegarde automatique
1. Ouvrez le **Planificateur de taches** Windows
2. Trouvez **"FirebaseBackup-SOS-Expat"**
3. Double-cliquez > Declencheurs > Modifier

---

## En cas de probleme

### "firebase: command not found"
```bash
npm install -g firebase-tools
```

### "gsutil: command not found"
Installez Google Cloud SDK ou le script utilisera Firebase Admin SDK (plus lent).

### "Permission denied"
Verifiez que vous etes connecte:
```bash
firebase login
gcloud auth login
```

### Les fichiers Storage ne se telecharge pas
Verifiez vos permissions IAM dans la console Google Cloud.

---

## Strategie recommandee

| Type | Frequence | Retention | Emplacement |
|------|-----------|-----------|-------------|
| Local | Quotidien | 30 jours | C:\FirebaseBackups |
| Cloud | Hebdomadaire | 6 mois | Google Drive / OneDrive |
| Externe | Mensuel | 1 an | Disque dur externe |

**Conseil**: Synchronisez `C:\FirebaseBackups` avec Google Drive ou OneDrive pour avoir une copie cloud automatique de vos backups locaux.
