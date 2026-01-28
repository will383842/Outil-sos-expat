# Redis Scaling Guide - SOS Expat

Guide pour migrer vers Redis quand l'application dépasse 500 prestataires simultanés.

## Quand migrer vers Redis?

### Indicateurs de besoin

| Métrique | Seuil actuel | Seuil Redis |
|----------|--------------|-------------|
| Prestataires simultanés | 500+ | Recommandé |
| Lectures Firestore/jour | 50k+ | Critique |
| Latence quota check | >200ms P95 | Critique |
| Coût Firestore/mois | >$50 | Évaluer |

### Avantages Redis

- Latence: ~1ms vs ~50-200ms Firestore
- Coût: Fixe vs usage Firestore
- Throughput: 100k+ ops/sec
- TTL natif pour cache

## Architecture cible

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────┐
│ Cloud Functions │────▶│ Cloud Memorystore│────▶│   Firestore    │
│   (aiChat, etc) │     │     (Redis)      │     │ (persistence)  │
└─────────────────┘     └──────────────────┘     └────────────────┘
                              │
                        Cache Layer:
                        - Quotas (TTL 5min)
                        - Rate limits
                        - Sessions
```

## Setup Cloud Memorystore

### 1. Créer l'instance Redis

```bash
# Instance basique (1GB, suffisant pour 1000+ providers)
gcloud redis instances create sos-expat-cache \
  --size=1 \
  --region=europe-west1 \
  --redis-version=redis_7_0 \
  --tier=basic \
  --network=default

# Récupérer l'IP
gcloud redis instances describe sos-expat-cache --region=europe-west1 --format="get(host)"
```

### 2. Configurer le VPC Connector

```bash
# Créer un connecteur VPC pour Cloud Functions
gcloud compute networks vpc-access connectors create functions-connector \
  --network=default \
  --region=europe-west1 \
  --range=10.8.0.0/28

# Lier aux Cloud Functions (dans index.ts)
# vpcConnector: "projects/YOUR_PROJECT/locations/europe-west1/connectors/functions-connector"
```

### 3. Variables d'environnement

```bash
# Configurer le secret Redis
firebase functions:secrets:set REDIS_HOST
firebase functions:secrets:set REDIS_PORT
```

## Code d'intégration

### redis.ts - Service Redis

```typescript
/**
 * Service Redis pour cache haute performance
 */
import Redis from "ioredis";
import { logger } from "firebase-functions";

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    const host = process.env.REDIS_HOST;
    const port = parseInt(process.env.REDIS_PORT || "6379");

    if (!host) {
      throw new Error("REDIS_HOST not configured");
    }

    redis = new Redis({
      host,
      port,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    redis.on("error", (err) => {
      logger.error("[Redis] Connection error", err);
    });
  }

  return redis;
}

// Cache quota avec fallback Firestore
export async function getCachedQuota(
  providerId: string
): Promise<{ used: number; limit: number } | null> {
  try {
    const client = getRedisClient();
    const data = await client.get(`quota:${providerId}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null; // Fallback to Firestore
  }
}

export async function setCachedQuota(
  providerId: string,
  data: { used: number; limit: number },
  ttlSeconds = 300
): Promise<void> {
  try {
    const client = getRedisClient();
    await client.setex(`quota:${providerId}`, ttlSeconds, JSON.stringify(data));
  } catch (err) {
    logger.warn("[Redis] Failed to cache quota", { providerId, err });
  }
}

// Rate limiting avec Redis (plus précis que Firestore)
export async function checkRedisRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const client = getRedisClient();
  const redisKey = `ratelimit:${key}`;

  const multi = client.multi();
  multi.incr(redisKey);
  multi.ttl(redisKey);

  const results = await multi.exec();
  const count = results?.[0]?.[1] as number;
  const ttl = results?.[1]?.[1] as number;

  // Si nouvelle clé, définir TTL
  if (ttl === -1) {
    await client.expire(redisKey, windowSeconds);
  }

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
  };
}

// Invalidation cache
export async function invalidateQuota(providerId: string): Promise<void> {
  try {
    const client = getRedisClient();
    await client.del(`quota:${providerId}`);
  } catch {
    // Ignore errors on invalidation
  }
}
```

### Migration utils.ts

```typescript
// Avant (Firestore cache)
const quotaCache = new Map<string, CachedQuota>();

// Après (Redis cache avec fallback)
export async function checkAiQuota(providerId: string): Promise<QuotaCheckResult> {
  // 1. Try Redis cache first
  const cached = await getCachedQuota(providerId);
  if (cached) {
    return {
      hasQuota: cached.used < cached.limit,
      used: cached.used,
      limit: cached.limit,
    };
  }

  // 2. Fallback to Firestore
  const providerDoc = await db.collection("providers").doc(providerId).get();
  const data = providerDoc.data();

  const result = {
    hasQuota: (data?.aiCallsUsed || 0) < (data?.aiCallsLimit || 100),
    used: data?.aiCallsUsed || 0,
    limit: data?.aiCallsLimit || 100,
  };

  // 3. Cache in Redis
  await setCachedQuota(providerId, { used: result.used, limit: result.limit });

  return result;
}
```

## Plan de migration

### Phase 1: Setup (1-2h)
1. Créer instance Cloud Memorystore
2. Configurer VPC Connector
3. Ajouter dépendance ioredis

### Phase 2: Dual-write (1 semaine)
1. Écrire dans Redis ET Firestore
2. Lire depuis Redis avec fallback Firestore
3. Monitorer les erreurs Redis

### Phase 3: Redis primary (1 semaine)
1. Redis devient source primaire
2. Firestore reste pour persistence
3. Sync batch quotidien Redis → Firestore

### Phase 4: Cleanup
1. Supprimer le cache mémoire
2. Migrer rate limiting vers Redis
3. Optimiser TTL selon usage

## Coûts estimés

| Configuration | Coût/mois | Capacité |
|---------------|-----------|----------|
| Basic 1GB | ~$35 | 1000 providers |
| Basic 2GB | ~$70 | 5000 providers |
| Standard 1GB | ~$70 | HA, 1000 providers |

Comparé à Firestore avec 500+ providers actifs: économie de 30-50% sur les lectures.

## Monitoring Redis

```bash
# Métriques à surveiller
gcloud redis instances describe sos-expat-cache \
  --region=europe-west1 \
  --format="value(memorySizeGb,currentLocationId)"

# Dans Cloud Monitoring
# - redis.googleapis.com/stats/memory/usage
# - redis.googleapis.com/stats/connected_clients
# - redis.googleapis.com/stats/keyspace_hits
```

## Checklist pré-migration

- [ ] Instance Redis créée et accessible
- [ ] VPC Connector configuré
- [ ] Secrets REDIS_HOST/PORT configurés
- [ ] Tests de connexion passés
- [ ] Fallback Firestore implémenté
- [ ] Monitoring Redis configuré
- [ ] Alertes Redis ajoutées
- [ ] Plan de rollback documenté
