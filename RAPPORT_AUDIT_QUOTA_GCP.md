# 🔴 RAPPORT D'AUDIT QUOTA GCP - SOS EXPAT

**Date:** 2026-01-05
**Projet:** sos-urgently-ac307
**Région:** europe-west1
**Criticité:** ÉLEVÉE (93.4% du quota CPU)

---

## 📊 ÉTAT ACTUEL

| Métrique | Valeur | Limite | % Utilisé | Risque |
|----------|--------|--------|-----------|--------|
| CPU (milli vCPU) | 18,678 | 20,000 | **93.4%** | 🔴 CRITIQUE |
| Services | 205 | 1,000 | 20.5% | 🟢 OK |
| Révisions | 198 | 4,000 | 5% | 🟢 OK |
| Mémoire | 6.5 GB | 42.95 GB | 15.2% | 🟢 OK |

---

## 🔍 CAUSES IDENTIFIÉES

### 1. Trop de services avec CPU élevé
- **205 Cloud Functions** déployées
- Chaque fonction utilise **1 vCPU par défaut**
- Potentiel: 205 × 1 vCPU = 205 vCPU (10x le quota!)

### 2. Services en échec qui consomment du CPU
- **146 services** en état `HealthCheckContainerError`
- Ces services tentent de redémarrer en boucle
- Chaque tentative consomme du CPU

### 3. Configuration CPU excessive
- `startup-cpu-boost: true` sur tous les services (double le CPU au cold start)
- `minInstances: 1` sur fonctions critiques (CPU consommé 24/7)
- `cpu: 1` par défaut au lieu de 0.25

### 4. Index Firestore manquants
Erreurs visibles dans les logs:
- `outil_sync_retry_queue` (status, nextRetryAt, retryCount)
- `backups` (createdBy, type, createdAt)
- `webhook_dlq` (status, nextRetryAt)

---

## 🛠️ SOLUTIONS

### SOLUTION 1: Réduire le CPU de TOUS les services (IMMÉDIAT)

**Économie estimée: ~80% du quota**

```bash
# Windows PowerShell
.\scripts\fix-gcp-quota.ps1

# Linux/Mac
chmod +x scripts/fix-gcp-quota.sh
./scripts/fix-gcp-quota.sh
```

Configuration cible:
| Type | CPU | Mémoire | Max Instances | Min Instances |
|------|-----|---------|---------------|---------------|
| Critique (webhooks paiement) | 0.5 | 512 Mi | 10 | 1 |
| Standard (triggers) | 0.25 | 256 Mi | 5 | 0 |
| Autres | 0.083 | 256 Mi | 3 | 0 |

### SOLUTION 2: Créer les index Firestore manquants

```bash
# Index 1: outil_sync_retry_queue
gcloud firestore indexes composite create \
  --project=sos-urgently-ac307 \
  --collection-group=outil_sync_retry_queue \
  --field-config field-path=status,order=ASCENDING \
  --field-config field-path=nextRetryAt,order=ASCENDING \
  --field-config field-path=retryCount,order=ASCENDING

# Index 2: backups
gcloud firestore indexes composite create \
  --project=sos-urgently-ac307 \
  --collection-group=backups \
  --field-config field-path=createdBy,order=ASCENDING \
  --field-config field-path=type,order=ASCENDING \
  --field-config field-path=createdAt,order=DESCENDING

# Index 3: webhook_dlq
gcloud firestore indexes composite create \
  --project=sos-urgently-ac307 \
  --collection-group=webhook_dlq \
  --field-config field-path=status,order=ASCENDING \
  --field-config field-path=nextRetryAt,order=ASCENDING
```

### SOLUTION 3: Supprimer les vieilles révisions

```bash
# Garder seulement 2 révisions par service
for svc in $(gcloud run services list --region=europe-west1 --project=sos-urgently-ac307 --format="value(name)"); do
  echo "Cleaning revisions for $svc..."
  REVISIONS=$(gcloud run revisions list --service=$svc --region=europe-west1 --project=sos-urgently-ac307 --format="value(name)" | tail -n +3)
  for rev in $REVISIONS; do
    gcloud run revisions delete $rev --region=europe-west1 --project=sos-urgently-ac307 --quiet
  done
done
```

### SOLUTION 4: Demander une augmentation de quota (si nécessaire)

1. Aller sur https://console.cloud.google.com/iam-admin/quotas
2. Filtrer par "Cloud Run CPU"
3. Cliquer sur "Edit Quotas"
4. Demander 50,000 milli vCPU (au lieu de 20,000)

**Note:** L'augmentation prend 24-48h et peut être refusée.

---

## 📈 IMPACT ATTENDU

| Action | Économie CPU | Temps |
|--------|--------------|-------|
| Réduire CPU de 1.0 à 0.083 | -75% | 30 min |
| Désactiver cpu-boost | -30% au cold start | Inclus |
| minInstances: 0 | -10% permanent | Inclus |
| Créer index manquants | Stabilise les services | 10 min |

**Résultat attendu:** Passer de 93.4% à ~20-30% d'utilisation CPU

---

## ⚠️ RISQUES

### Risque 1: Cold starts plus lents
- **Impact:** +500ms à +2s de latence au premier appel
- **Mitigation:** Garder minInstances=1 pour stripewebhook et paypalwebhook

### Risque 2: Timeout sur fonctions lourdes
- **Impact:** Fonctions AI ou backup peuvent échouer
- **Mitigation:** Garder CPU=0.5 pour aichat, aichatstream, backups

### Risque 3: Concurrence réduite
- **Impact:** Moins de requêtes simultanées
- **Mitigation:** Augmenter maxInstances si nécessaire

---

## 🔄 PLAN DE SUIVI

1. **J+1:** Vérifier le quota CPU (doit être < 50%)
2. **J+7:** Analyser les logs pour erreurs de timeout
3. **J+30:** Ajuster les configs si nécessaire

---

## 📞 COMMANDES UTILES

```bash
# Voir l'utilisation CPU actuelle
gcloud monitoring metrics list --project=sos-urgently-ac307 --filter="metric.type:run.googleapis.com"

# Voir les services avec leur CPU
gcloud run services list --region=europe-west1 --project=sos-urgently-ac307 --format="table(name,spec.template.spec.containers[0].resources.limits.cpu,spec.template.spec.containers[0].resources.limits.memory)"

# Voir les services en erreur
gcloud run services list --region=europe-west1 --project=sos-urgently-ac307 --format="table(name,status.conditions[0].status,status.conditions[0].reason)" | grep False

# Logs d'erreurs récentes
gcloud logging read "resource.type=cloud_run_revision AND severity=ERROR" --project=sos-urgently-ac307 --limit=50
```

---

## ✅ CHECKLIST D'EXÉCUTION

- [ ] Exécuter `fix-gcp-quota.ps1` (Windows) ou `fix-gcp-quota.sh` (Linux/Mac)
- [ ] Créer les 3 index Firestore manquants
- [ ] Vérifier le quota CPU après 10 minutes
- [ ] Tester les webhooks Stripe et PayPal
- [ ] Tester un appel Twilio
- [ ] Configurer des alertes de quota à 80%

---

*Généré par Claude Code - 2026-01-05*
