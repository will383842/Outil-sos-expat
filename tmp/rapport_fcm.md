# AUDIT COMPLET — Notifications Push FCM SOS-Expat

**Date** : 2026-02-27 (verification finale)
**Scope** : Backend (Firebase Functions) + Frontend (React/Vite) + Service Worker
**Compilation** : Backend 0 erreurs | Frontend 0 erreurs

---

## 1. ARCHITECTURE REELLE

### 1.1 Trois systemes coexistent

| Systeme | Region | Declencheur | Canaux | Roles couverts |
|---------|--------|-------------|--------|----------------|
| **Pipeline universel** | europe-west3 | `message_events` Firestore trigger | Email + SMS + Push + In-app | Tous (si templates configures) |
| **Chatter Notifications** | us-central1 (triggers/scheduled) | Triggers Firestore + Scheduled | Push FCM uniquement | Chatters uniquement |
| **Security Alerts** | europe-west3 | `security_alerts` trigger | Email + Push + Slack + In-app | Admins uniquement |

#### Pipeline universel (`notificationPipeline/`)

```
enqueueMessageEvent (callable, europe-west1)
  -> message_events/{id} (Firestore)
  -> onMessageEventCreate trigger (worker.ts, europe-west3)
    |-- Fetch template (message_templates/{lang}/items/{eventId})
    |-- Load routing config (message_routing/config)
    |-- Rate limit check (message_deliveries query)
    |-- Channel selection (parallel ou fallback)
    |   |-- Email -> Zoho SMTP
    |   |-- SMS -> Twilio (ALLOWLIST: booking_paid_provider, call.cancelled.client_no_answer)
    |   |-- Push -> FCM (fcm.ts) -- lookup tokens dans fcm_tokens/{uid}/tokens/
    |   +-- In-app -> Firestore (inapp_notifications)
    +-- Log -> message_deliveries/{id}
```

#### Chatter Notifications (`chatter/chatterNotifications.ts`)

```
Trigger Firestore / Scheduled cron
  -> sendChatterNotification(chatterId, payload)
    -> Fetch tokens: fcm_tokens/{uid}/tokens/ (isValid=true, limit 10) [UNIFIE]
    -> messaging.sendEachForMulticast(multicastMessage)
    -> Cleanup tokens invalides (batch isValid=false dans fcm_tokens/)
    -> Log: chatter_notifications/{id}
```

#### Security Alerts (`securityAlerts/notifier.ts`)

```
security_alerts/{id} trigger
  -> Resolve recipients (admin_alert_preferences)
  -> Pour chaque admin:
    |-- Email -> message_events (pipeline universel)
    |-- Push -> MULTI-DEVICE: lookup fcm_tokens/{uid}/tokens/ (limit 10) [CORRIGE]
    |           + Cleanup tokens invalides sur erreur [CORRIGE]
    |-- In-app -> notifications/{id}
    +-- Slack -> webhook
```

### 1.2 Retry & DLQ (`scheduled/notificationRetry.ts`)

| Parametre | Valeur |
|-----------|--------|
| Frequence | Toutes les 4 heures |
| Max retries | 3 |
| Backoff | Exponentiel (5 min -> 10 min -> 20 min) |
| Age max | 24 heures |
| Batch size | 50 |
| DLQ | `notification_dlq` collection |
| DLQ cleanup | Weekly (90 jours) via consolidatedWeeklyCleanup [AJOUTE] |
| Admin callables | `triggerNotificationRetry`, `retrySpecificDelivery`, `getDLQStats` |

---

## 2. TOKENS FCM -- ENREGISTREMENT & STOCKAGE

### 2.1 Frontend (`useFCM.ts` -- appele dans `App.tsx`)

**Statut : OK ACTIF** -- Le hook est importe et appele dans `App.tsx:718` pour tous les utilisateurs authentifies.

**Flux :**
1. Verification guards (Notification API, Service Worker, VAPID key)
2. `Notification.requestPermission()` -> early return si `denied`
3. Registration du SW `firebase-messaging-sw.js` (corrige -- plus de conflit avec sw.js)
4. `getToken(messaging, { vapidKey, swRegistration })`
5. Deduplication : query `where('token', '==', token)` avant ecriture
6. Ecriture : `fcm_tokens/{userId}/tokens/{docId}` (multi-device via sub-collection)
7. Foreground handler : `onMessage()` -> `new Notification()` native du navigateur

### 2.2 Collection de tokens UNIFIEE [CORRIGE]

| Collection | Utilise par | Multi-device |
|-----------|-------------|-------------|
| **`fcm_tokens/{uid}/tokens/{tokenId}`** | Pipeline universel + Chatter + Security Alerts + Frontend useFCM | Oui (limit 10) |

**P1-1 CORRIGE** : chatterNotifications.ts migre de `chatters/{uid}/fcmTokens/` vers `fcm_tokens/{uid}/tokens/`.
Les callables `chatterRegisterFcmToken` / `chatterUnregisterFcmToken` sont conservees en thin proxies (deprecated) et ecrivent aussi dans la collection unifiee.

### 2.3 Nettoyage des tokens invalides

| Systeme | Detection | Action | Statut |
|---------|-----------|--------|--------|
| **fcm.ts** (pipeline) | `messaging/invalid-registration-token`, `registration-token-not-registered` | `isValid: false` dans `fcm_tokens/` | OK Fast path (uid) + Slow path |
| **chatterNotifications.ts** | Memes codes, via multicast response | Batch `isValid: false` dans `fcm_tokens/` [CORRIGE] | OK Optimal (batch) |
| **securityAlerts/notifier.ts** | Catch error + code detection | `isValid: false` dans `fcm_tokens/` [CORRIGE] | OK |
| **consolidatedWeeklyCleanup** | lastUsedAt > 90 jours | Delete tokens stales [AJOUTE] | OK Weekly |

### 2.4 Service Worker (`public/firebase-messaging-sw.js`)

**Statut : OK ACTIF** -- Firebase Compat SDK v9.23.0
- Background : `messaging.onBackgroundMessage()` -> `showNotification()`
- Click : Navigation vers `notification.data.url || '/'`
- Actions : "Ouvrir" / "Fermer"
- Config externalisee : `public/firebase-config.js`

### 2.5 Firestore Rules

```
fcm_tokens/{userId}              -> isOwner || isAdmin
fcm_tokens/{userId}/tokens/{id}  -> isOwner || isAdmin
message_events                   -> allow write: if false (admin SDK only)
```

---

## 3. CONFIGURATION PLATEFORME FCM (TTL, Sound, Badge)

### Pipeline universel (`fcm.ts`) -- OK COMPLET [CORRIGE]

```typescript
await messaging.send({
  token,
  notification: { title, body },
  data,
  android: {
    priority: "high",
    ttl: 3600 * 1000,          // 1h TTL
    notification: { icon: "ic_notification", color: "#4F46E5", sound: "default" },
  },
  webpush: {
    headers: { TTL: "3600" },   // 1h TTL
    fcmOptions: { link: data?.deeplink || "/" },
    notification: { icon: "/icons/icon-192x192.png", badge: "/icons/icon-72x72.png" },
  },
  apns: {
    headers: { "apns-expiration": String(Math.floor(Date.now() / 1000) + 3600) },
    payload: { aps: { badge: 1, sound: "default" } },
  },
});
```

### Chatter Notifications -- OK COMPLET [CORRIGE]

```typescript
{
  tokens,
  notification: { title, body },
  data: { type, deepLink, timestamp },
  webpush: {
    fcmOptions: { link },
    notification: { icon: "/icons/icon-192x192.png", badge: "/icons/icon-72x72.png", vibrate: [200,100,200] },
  },
  android: {
    priority: "high",
    ttl: 3600 * 1000,           // 1h TTL
    notification: { icon: "ic_notification", color: "#4F46E5", sound: "default" },
  },
  apns: {
    headers: { "apns-expiration": String(Math.floor(Date.now() / 1000) + 3600) },  // [AJOUTE]
    payload: { aps: { badge: 1, sound: "default" } },
  },
}
```

### Security Alerts -- OK COMPLET [CORRIGE]

```typescript
// Multi-device: loop sur tous les tokens de fcm_tokens/{uid}/tokens/
for (const tokenDoc of tokensSnap.docs) {
  await messaging.send({
    token: tokenDoc.data().token,
    notification: { title, body },
    data: { alertId, alertType, severity },
    android: {
      priority: severity === 'emergency' ? 'high' : 'normal',
      ttl: 3600 * 1000,
      notification: { channelId: 'security_alerts', sound: 'default' },
    },
    webpush: {
      headers: { TTL: '3600' },
      notification: { icon: '/icons/icon-192x192.png', badge: '/icons/icon-72x72.png' },
    },
    apns: {
      headers: { 'apns-expiration': String(Math.floor(Date.now() / 1000) + 3600) },
      payload: { aps: { sound: severity === 'emergency' ? 'critical.caf' : 'default', badge: 1 } },
    },
  });
}
```

### Coherence des 3 systemes (verification finale)

| Config | fcm.ts | chatterNotifications.ts | notifier.ts |
|--------|--------|------------------------|-------------|
| TTL Android | 1h | 1h | 1h |
| TTL WebPush | 1h | 1h | 1h |
| TTL APNs | 1h | 1h | 1h |
| Android icon | ic_notification | ic_notification | ic_notification |
| Android color | #4F46E5 | #4F46E5 | #4F46E5 |
| WebPush icon | icon-192x192.png | icon-192x192.png | icon-192x192.png |
| WebPush badge | icon-72x72.png | icon-72x72.png | icon-72x72.png |
| WebPush deeplink | Oui (data.deeplink) | Oui (payload.deepLink) | Oui (/admin/security-alerts) |
| Sound | default | default | default/critical.caf |
| Multi-device | Oui (via worker) | Oui (multicast) | Oui (loop) |
| Token cleanup | Oui | Oui (batch) | Oui |

**100% alignement confirme entre les 3 systemes.**

---

## 4. COUVERTURE PAR ROLE

| Role | Push FCM | Token Storage | Notifications recues | Statut |
|------|----------|---------------|---------------------|--------|
| **Chatter** | OK Complet | `fcm_tokens/` [UNIFIE] | 6 types dedies + pipeline universel | OK PRODUCTION |
| **Admin** | OK Multi-device [CORRIGE] | `fcm_tokens/` (via useFCM) | Security alerts multi-device | OK PRODUCTION |
| **Provider** (lawyer/expat) | Token enregistre | `fcm_tokens/` (via useFCM) | Via pipeline si templates configures | DEPEND ROUTING |
| **Client** (user) | Token enregistre | `fcm_tokens/` (via useFCM) | Via pipeline si templates configures | DEPEND ROUTING |
| **Influencer** | Token enregistre | `fcm_tokens/` (via useFCM) | Aucune notification push dediee | MANQUANT |
| **Blogger** | Token enregistre | `fcm_tokens/` (via useFCM) | Aucune notification push dediee | MANQUANT |
| **GroupAdmin** | Token enregistre | `fcm_tokens/` (via useFCM) | Aucune notification push dediee | MANQUANT |

### Detail des notifications chatter (6 types)

| Type | Trigger | Titre | Body | Deeplink |
|------|---------|-------|------|----------|
| COMMISSION_EARNED | `chatter_commissions` onCreate | "Ka-ching !" | "+{amount}$ - {reason}" | /chatter/dashboard |
| TEAM_MEMBER_ACTIVATED | `chatters` onUpdate (isActivated) | "Bonus activation !" | "+5$ - {name}" | /chatter/referrals |
| TEAM_MEMBER_INACTIVE | Scheduled daily 10:00 AM | "{name} est inactif" | "Aucune activite depuis {days}j" | /chatter/referrals |
| TIER_BONUS_UNLOCKED | `chatters` onUpdate (tierBonusesPaid) | "BONUS DEBLOQUE !" | "+{amount}$" | /chatter/referrals |
| NEAR_TOP_3 | Scheduled daily 6:00 PM | "Top 3 en vue !" | "Plus que {calls} appels" | /chatter/leaderboard |
| FLASH_BONUS_START | Admin callable | "FLASH BONUS !" | "x{multiplier} pendant {hours}h" | /chatter/dashboard |

---

## 5. CORRECTIONS APPLIQUEES

### P0/P1 -- CRITIQUES (tous corriges)

| # | Probleme | Correction | Fichier |
|---|----------|------------|---------|
| **P1-1** | Deux collections de tokens FCM | chatterNotifications.ts migre vers `fcm_tokens/` | `chatterNotifications.ts` |
| **P1-2** | Security alerts: single token | Reecrit pour multi-device via `fcm_tokens/{uid}/tokens/` (limit 10) | `notifier.ts` |
| **P1-3** | Security alerts: pas de cleanup | Ajout detection token invalide + `isValid: false` | `notifier.ts` |
| **P1-5** | AdminNotifications.tsx: addDoc bloque par Firestore rules | Remplace par `httpsCallable(functions, 'enqueueMessageEvent')` | `AdminNotifications.tsx` |

### P2 -- IMPORTANTS (tous corriges)

| # | Probleme | Correction | Fichier |
|---|----------|------------|---------|
| **P2-1** | Aucun TTL sur messages FCM pipeline | Ajout TTL 1h (android, webpush, apns) | `fcm.ts` |
| **P2-2** | fcm.ts sans config plateforme | Ajout sound, badge, icon, deeplink, priority | `fcm.ts` |
| **P2-4** | Pas de cleanup tokens stales | Ajout dans consolidatedWeeklyCleanup (>90 jours) | `consolidatedWeeklyCleanup.ts` |
| **P2-6** | `FLUTTER_NOTIFICATION_CLICK` dans clickAction | Supprime (pas une app Flutter) | `chatterNotifications.ts` |
| **P2-7** | DLQ jamais nettoyee | Ajout dans consolidatedWeeklyCleanup (>90 jours) | `consolidatedWeeklyCleanup.ts` |

### Corrections verification post-audit (passe 1)

| # | Probleme | Correction | Fichier |
|---|----------|------------|---------|
| **V-1** | chatterNotifications.ts: manque `apns-expiration` | Ajout header `apns-expiration` 1h | `chatterNotifications.ts` |
| **V-2** | worker.ts: type MessageEvent manque `createdAt` | Ajout `createdAt?: admin.firestore.Timestamp` | `worker.ts` |
| **V-3** | Badge icon `badge-72x72.png` inexistant | Corrige en `icon-72x72.png` (fichier existant) | `chatterNotifications.ts` |

### Corrections verification post-audit (passe 2 — cross-check 4 agents)

| # | Probleme | Correction | Fichier |
|---|----------|------------|---------|
| **V-4** | chatterNotifications.ts: manque WebPush TTL header | Ajout `headers: { TTL: "3600" }` | `chatterNotifications.ts` |
| **V-5** | notifier.ts: manque Android icon + color | Ajout `icon: 'ic_notification'` + `color: '#4F46E5'` | `notifier.ts` |
| **V-6** | notifier.ts: manque WebPush deeplink | Ajout `fcmOptions: { link: '/admin/security-alerts' }` | `notifier.ts` |

### ACTION REQUISE: Donnees Firestore manquantes

**CRITIQUE**: Le bouton "Test Notification" dans AdminNotifications.tsx envoie `eventId: 'admin_test'`
mais le template correspondant **n'existe pas** dans Firestore. Le worker retourne silencieusement
sans rien envoyer, pendant que le frontend affiche "success".

**Documents a creer dans la console Firestore** :

1. **Template** : `message_templates/fr/items/admin_test`
```json
{
  "email": {
    "enabled": true,
    "subject": "Test notification SOS Expat",
    "html": "<h2>Test Notification</h2><p>Ceci est un test depuis le panneau admin SOS Expat.</p><p>Destinataire: {{recipientName}}</p>",
    "text": "Test notification SOS Expat. Destinataire: {{recipientName}}"
  },
  "push": {
    "enabled": true,
    "title": "Test SOS Expat",
    "body": "Notification de test depuis le panneau admin",
    "deeplink": "/dashboard"
  },
  "inapp": {
    "enabled": true,
    "title": "Test SOS Expat",
    "body": "Notification de test depuis le panneau admin"
  }
}
```

2. **Routing** (optionnel, pour activer push+inapp en plus de l'email) :
   Dans `message_routing/config`, ajouter dans le champ `routing`:
```json
{
  "admin_test": {
    "strategy": "parallel",
    "channels": {
      "email": { "enabled": true, "provider": "zoho" },
      "push": { "enabled": true, "provider": "fcm" },
      "inapp": { "enabled": true, "provider": "firestore" }
    }
  }
}
```

Sans ces documents, le test admin envoie `{ok: true}` mais aucune notification n'est delivree.

### Non corrige (design intentionnel ou hors scope)

| # | Probleme | Raison |
|---|----------|--------|
| **P1-4** | Routing push desactive par defaut | Intentionnel -- chaque eventId doit etre explicitement configure dans `message_routing/config` |
| **P2-3** | Slow path cleanup O(n) | Cas rare (uid toujours fourni en pratique), pas de regression |
| **P2-5** | Push dedie Influencer/Blogger/GroupAdmin | Feature request, pas un bug -- tokens deja enregistres |
| **P3-x** | Preferences notif, analytics, guide UI | Ameliorations futures |

---

## 6. FICHIERS MODIFIES

| Fichier | Modifications |
|---------|--------------|
| `chatter/chatterNotifications.ts` | Tokens unifies fcm_tokens/, TTL 1h android+apns+webpush, apns-expiration, badge icon corrige, FLUTTER_NOTIFICATION_CLICK supprime |
| `securityAlerts/notifier.ts` | Multi-device, cleanup tokens, TTL 1h, Android icon+color, WebPush deeplink, config plateforme complete |
| `notificationPipeline/providers/push/fcm.ts` | TTL 1h, config plateforme (android/webpush/apns), sound, badge, icon, deeplink |
| `notificationPipeline/worker.ts` | Type MessageEvent + createdAt |
| `scheduled/consolidatedWeeklyCleanup.ts` | +2 handlers: FCM token cleanup (90j) + DLQ cleanup (90j) |
| `src/pages/admin/AdminNotifications.tsx` | Remplace addDoc bloque par httpsCallable enqueueMessageEvent, import functions |

---

## 7. FICHIERS CLES

| Fichier | Lignes | Role | Statut |
|---------|--------|------|--------|
| `notificationPipeline/worker.ts` | 639 | Processeur principal multi-canal | OK PROD |
| `notificationPipeline/providers/push/fcm.ts` | 122 | Envoi FCM + cleanup tokens + TTL | OK PROD |
| `notificationPipeline/providers/sms/twilioSms.ts` | ~197 | SMS Twilio + rate limiting | OK PROD |
| `notificationPipeline/providers/email/zohoSmtp.ts` | ~20 | Email Zoho SMTP | OK PROD |
| `notificationPipeline/providers/inapp/firestore.ts` | ~35 | In-app notifications | OK PROD |
| `notificationPipeline/routing.ts` | 81 | Config routing par event | OK PROD |
| `chatter/chatterNotifications.ts` | 1044 | 6 types notif chatter + FCM multicast | OK PROD |
| `securityAlerts/notifier.ts` | ~937 | Alertes securite multi-canal multi-device | OK PROD |
| `scheduled/notificationRetry.ts` | 389 | Retry + DLQ | OK PROD |
| `scheduled/consolidatedWeeklyCleanup.ts` | 125 | Cleanup tokens + DLQ weekly | OK PROD |
| `messaging/enqueueMessageEvent.ts` | ~64 | Point d'entree callable | OK PROD |
| `src/hooks/useFCM.ts` | 127 | Frontend: token registration | OK PROD |
| `public/firebase-messaging-sw.js` | 54 | Service Worker background | OK PROD |
| `src/pages/admin/AdminNotifications.tsx` | 525 | Admin test notifications | OK PROD |

---

## 8. COLLECTIONS FIRESTORE

| Collection | Purpose | Nettoyage |
|-----------|---------|-----------|
| `fcm_tokens/{uid}/tokens/{id}` | Tokens FCM universel (UNIQUE source) | Weekly cleanup >90j [OK] |
| `message_events/{id}` | Queue notification pipeline | Pas de cleanup (volume faible) |
| `message_deliveries/{id}` | Logs de livraison | Utilise par retry |
| `notification_dlq/{id}` | Dead Letter Queue | Weekly cleanup >90j [OK] |
| `chatter_notifications/{id}` | Audit trail chatters | Non cleanup (audit) |
| `inapp_notifications/{id}` | Notifications in-app | Non cleanup (lu par users) |
| `message_templates/{lang}/items/{eventId}` | Templates notification | Config |
| `message_routing/config` | Routing canaux | Config |
| `admin_alert_preferences/{uid}` | Preferences admin | Config |

---

## 9. RESUME EXECUTIF

### OK Ce qui fonctionne (post-corrections)

- **Token registration** : `useFCM()` actif dans `App.tsx` pour tous les utilisateurs authentifies
- **Collection unifiee** : `fcm_tokens/{uid}/tokens/` utilisee par les 3 systemes [CORRIGE]
- **Multi-device** : Sub-collection avec limit(10), deduplication, isValid flag
- **Service Worker** : `firebase-messaging-sw.js` operationnel (foreground + background)
- **Pipeline universel** : Multi-canal (email/SMS/push/inapp) avec templates, routing, i18n, TTL [CORRIGE]
- **Chatter push** : 6 types de notifications avec config plateforme complete + TTL [CORRIGE]
- **Security alerts** : Multi-device, cleanup tokens, TTL, config plateforme [CORRIGE]
- **Admin test notifs** : Via enqueueMessageEvent callable (bypass Firestore rules) [CORRIGE]
- **Retry & DLQ** : Backoff exponentiel, 3 retries max, DLQ avec cleanup weekly [CORRIGE]
- **Token cleanup** : Detection + isValid=false dans les 3 systemes + cleanup weekly >90j [CORRIGE]
- **Coherence icons** : icon-192x192.png + icon-72x72.png (fichiers verifies existants) [CORRIGE]
- **Coherence TTL** : 1h sur les 3 systemes (android, webpush, apns) [CORRIGE]

### ACTION REQUISE (Firestore data)

- **Template `admin_test` manquant** : Le bouton "Test" dans l'admin enqueue mais le worker ne trouve pas de template → perte silencieuse. Creer le document `message_templates/fr/items/admin_test` (voir section 5 pour le contenu).
- **Routing `admin_test`** (optionnel) : Pour activer push+inapp en plus de l'email par defaut.

### Points d'attention restants (non-bloquants)

- **Routing push desactive par defaut** : Intentionnel, chaque eventId doit etre configure dans Firestore
- **Push dedie Influencer/Blogger/GroupAdmin** : Feature manquante, tokens deja enregistres
- **Preferences de notification par utilisateur** : Feature future
- **Analytics de delivery** : Pas de dashboard de monitoring

### Compilation

- **Backend** : 0 erreurs
- **Frontend** : 0 erreurs
