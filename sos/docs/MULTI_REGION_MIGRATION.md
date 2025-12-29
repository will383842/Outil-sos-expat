# Guide de Migration Multi-Région Firestore

## Objectif

Migrer la base de données Firestore de `europe-west1` (mono-région) vers `eur3` (multi-région Europe) pour améliorer la disponibilité de 99.99% à 99.999%.

## Avantages

| Aspect | Mono-région | Multi-région |
|--------|-------------|--------------|
| **SLA** | 99.99% | 99.999% |
| **Résilience** | 1 datacenter | 3+ datacenters |
| **Latence** | ~10ms | ~15ms (léger overhead) |
| **Coût** | Standard | +50-100% |

## Prérequis

- Fenêtre de maintenance planifiée (2-4 heures)
- Backup récent et validé
- Tests sur environnement de staging
- Communication aux utilisateurs

## Procédure de Migration

### Phase 1: Préparation (J-7)

```bash
# 1. Créer un nouveau projet Firebase
firebase projects:create sos-expat-prod-eu3 --display-name "SOS Expat Production EU3"

# 2. Configurer Firestore en multi-région
# Via la console Firebase:
# - Firestore Database → Create Database
# - Location: eur3 (Europe multi-region)
# - Mode: Production

# 3. Copier les règles Firestore
firebase firestore:rules:get --project sos-expat-prod > firestore.rules
firebase deploy --only firestore:rules --project sos-expat-prod-eu3

# 4. Copier les index
firebase firestore:indexes --project sos-expat-prod > firestore.indexes.json
firebase deploy --only firestore:indexes --project sos-expat-prod-eu3
```

### Phase 2: Export des données (J-1)

```bash
# 1. Créer un bucket de migration
gsutil mb -l eu gs://sos-expat-migration-temp

# 2. Exporter toutes les données
gcloud firestore export gs://sos-expat-migration-temp/full-export \
  --project=sos-expat-prod

# 3. Vérifier l'export
gsutil ls -l gs://sos-expat-migration-temp/full-export/
```

### Phase 3: Migration (Jour J)

```bash
# 1. Activer le mode maintenance sur l'app
# (désactiver les écritures côté client)

# 2. Dernier export incrémental
gcloud firestore export gs://sos-expat-migration-temp/final-export \
  --project=sos-expat-prod

# 3. Importer dans le nouveau projet
gcloud firestore import gs://sos-expat-migration-temp/final-export \
  --project=sos-expat-prod-eu3

# 4. Vérifier les données
# - Compter les documents
# - Vérifier quelques enregistrements critiques

# 5. Mettre à jour la configuration Firebase
# - Modifier firebase.json
# - Mettre à jour les variables d'environnement
# - Redéployer les Cloud Functions

# 6. Basculer le DNS / hosting
firebase hosting:channel:deploy production --project sos-expat-prod-eu3

# 7. Tester l'application complète

# 8. Désactiver le mode maintenance
```

### Phase 4: Nettoyage (J+7)

```bash
# 1. Vérifier que tout fonctionne depuis 7 jours
# 2. Supprimer le bucket de migration
gsutil rm -r gs://sos-expat-migration-temp

# 3. Archiver l'ancien projet (ne pas supprimer immédiatement)
# Garder 30 jours en cas de rollback

# 4. Mettre à jour la documentation
```

## Plan de Rollback

En cas de problème majeur :

```bash
# 1. Réactiver l'ancien projet
firebase use sos-expat-prod

# 2. Rediriger le hosting
firebase hosting:channel:deploy production --project sos-expat-prod

# 3. Investiguer le problème
# 4. Replanifier la migration
```

## Estimation des Coûts

### Avant (europe-west1)

| Ressource | Estimation/mois |
|-----------|-----------------|
| Firestore reads | $X |
| Firestore writes | $Y |
| Storage | $Z |
| **Total** | **$T** |

### Après (eur3)

| Ressource | Estimation/mois | Différence |
|-----------|-----------------|------------|
| Firestore reads | $X × 1.5 | +50% |
| Firestore writes | $Y × 2 | +100% |
| Storage | $Z × 2 | +100% |
| **Total** | **~$T × 1.7** | +70% |

## Checklist de Migration

### Avant la migration

- [ ] Backup validé et téléchargé localement
- [ ] Nouveau projet créé et configuré
- [ ] Rules et indexes déployés
- [ ] Tests de charge sur le nouveau projet
- [ ] Communication planifiée

### Pendant la migration

- [ ] Mode maintenance activé
- [ ] Export final réalisé
- [ ] Import terminé et vérifié
- [ ] Fonctions redéployées
- [ ] Hosting basculé
- [ ] Tests fonctionnels passés

### Après la migration

- [ ] Monitoring actif pendant 24h
- [ ] Alertes configurées
- [ ] Performance validée
- [ ] Documentation mise à jour
- [ ] Équipe informée

## Alternative: Réplication Manuelle

Si la migration complète n'est pas possible, une alternative est de configurer une réplication manuelle :

```typescript
// Trigger Firestore pour répliquer vers un bucket de backup
export const replicateToBackup = functions.firestore
  .document('{collection}/{docId}')
  .onWrite(async (change, context) => {
    const { collection, docId } = context.params;
    const data = change.after.exists ? change.after.data() : null;

    // Sauvegarder dans un bucket GCS
    const bucket = admin.storage().bucket('sos-expat-realtime-backup');
    await bucket.file(`${collection}/${docId}.json`).save(
      JSON.stringify({ data, timestamp: Date.now() })
    );
  });
```

## Contacts

| Rôle | Contact |
|------|---------|
| Migration Lead | devops@sos-expat.com |
| Support Firebase | https://firebase.google.com/support |

---

*Dernière mise à jour: Décembre 2024*
