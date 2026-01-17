# Cloud Monitoring Alerts - SOS Expat

Configuration des alertes Google Cloud Monitoring pour la production.

## Prérequis

```bash
# Authentification GCloud
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

## Alertes recommandées

### 1. Erreurs Cloud Functions (Critique)

```bash
gcloud alpha monitoring policies create \
  --display-name="[SOS-Expat] Cloud Functions Errors > 5/min" \
  --condition-display-name="High error rate" \
  --condition-filter='resource.type="cloud_function" AND metric.type="cloudfunctions.googleapis.com/function/execution_count" AND metric.labels.status!="ok"' \
  --condition-threshold-value=5 \
  --condition-threshold-duration=60s \
  --condition-threshold-comparison=COMPARISON_GT \
  --notification-channels=YOUR_NOTIFICATION_CHANNEL_ID \
  --combiner=OR
```

### 2. Latence élevée P95 > 10s

```bash
gcloud alpha monitoring policies create \
  --display-name="[SOS-Expat] Function Latency P95 > 10s" \
  --condition-display-name="High latency" \
  --condition-filter='resource.type="cloud_function" AND metric.type="cloudfunctions.googleapis.com/function/execution_times"' \
  --condition-threshold-value=10000 \
  --condition-threshold-duration=300s \
  --condition-threshold-comparison=COMPARISON_GT \
  --aggregation-alignment-period=300s \
  --aggregation-per-series-aligner=ALIGN_PERCENTILE_95 \
  --notification-channels=YOUR_NOTIFICATION_CHANNEL_ID
```

### 3. Mémoire élevée (>80%)

```bash
gcloud alpha monitoring policies create \
  --display-name="[SOS-Expat] Function Memory > 80%" \
  --condition-display-name="High memory usage" \
  --condition-filter='resource.type="cloud_function" AND metric.type="cloudfunctions.googleapis.com/function/user_memory_bytes"' \
  --condition-threshold-value=429496729 \
  --condition-threshold-duration=60s \
  --condition-threshold-comparison=COMPARISON_GT \
  --notification-channels=YOUR_NOTIFICATION_CHANNEL_ID
```

### 4. Quota Firestore reads proche limite

```bash
gcloud alpha monitoring policies create \
  --display-name="[SOS-Expat] Firestore Daily Reads > 80%" \
  --condition-display-name="High Firestore usage" \
  --condition-filter='resource.type="firestore.googleapis.com/Database" AND metric.type="firestore.googleapis.com/document/read_count"' \
  --condition-threshold-value=40000 \
  --condition-threshold-duration=3600s \
  --condition-threshold-comparison=COMPARISON_GT \
  --notification-channels=YOUR_NOTIFICATION_CHANNEL_ID
```

### 5. Instances actives élevées

```bash
gcloud alpha monitoring policies create \
  --display-name="[SOS-Expat] Active Instances > 30" \
  --condition-display-name="High instance count" \
  --condition-filter='resource.type="cloud_function" AND metric.type="cloudfunctions.googleapis.com/function/active_instances"' \
  --condition-threshold-value=30 \
  --condition-threshold-duration=300s \
  --condition-threshold-comparison=COMPARISON_GT \
  --notification-channels=YOUR_NOTIFICATION_CHANNEL_ID
```

## Canal de notification (Email)

```bash
# Créer un canal de notification email
gcloud alpha monitoring channels create \
  --display-name="SOS Expat Team" \
  --type=email \
  --channel-labels=email_address=YOUR_EMAIL@domain.com
```

## Dashboard recommandé

Créer un dashboard dans la console GCP avec les widgets suivants:

1. **Executions par fonction** - Line chart
2. **Erreurs par fonction** - Line chart
3. **Latence P50/P95/P99** - Line chart
4. **Mémoire utilisée** - Stacked bar
5. **Instances actives** - Line chart
6. **Firestore reads/writes** - Line chart

## Configuration via Console

Alternativement, configurer via la [Console GCP](https://console.cloud.google.com/monitoring/alerting):

1. Aller dans **Monitoring > Alerting**
2. Cliquer **Create Policy**
3. Configurer les conditions selon les valeurs ci-dessus
4. Ajouter le canal de notification

## Seuils recommandés par environnement

| Métrique | Développement | Production |
|----------|---------------|------------|
| Erreurs/min | 10 | 5 |
| Latence P95 | 15s | 10s |
| Mémoire | 90% | 80% |
| Instances | 20 | 50 |

## Alertes Sentry (complémentaires)

Les alertes Sentry sont configurées automatiquement dans le projet:
- Nouvelles erreurs: Notification immédiate
- Spike d'erreurs: +50% sur 1h
- Erreurs critiques: Exceptions non gérées

Configurer dans [Sentry.io](https://sentry.io) > Project Settings > Alerts.
