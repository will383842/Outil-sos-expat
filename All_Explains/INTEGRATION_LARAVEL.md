# Intégration Laravel ↔ Firebase (SOS Expat)

Ce document décrit comment intégrer la plateforme SOS-Expat.com (Laravel) avec l'outil d'administration Firebase.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SOS-EXPAT.COM (Laravel)                       │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Utilisateurs │  │ Abonnements  │  │ Paiements (Stripe)   │   │
│  │   Comptes    │  │ Subscriptions│  │ - Tacite reconduction│   │
│  │   Profils    │  │ Plans/Prix   │  │ - Webhooks           │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    WEBHOOKS SORTANTS                       │  │
│  │  POST /syncSubscription  →  Firebase                       │  │
│  │  POST /ingestBooking     →  Firebase                       │  │
│  │  POST /syncProvider      →  Firebase                       │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                               │
                               │ HTTPS + API Key
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    FIREBASE (Cloud Functions)                     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Endpoints disponibles:                                      ││
│  │  • POST /ingestBooking     - Créer une demande client       ││
│  │  • POST /syncSubscription  - Synchroniser un abonnement     ││
│  │  • GET  /checkSubscription - Vérifier statut abonnement     ││
│  │  • POST /syncProvider      - Synchroniser un prestataire    ││
│  │  • GET  /health            - Health check                   ││
│  └─────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

---

## Configuration Côté Laravel

### 1. Variables d'environnement

```env
# .env
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_PROJECT_URL=https://europe-west1-outils-sos-expat.cloudfunctions.net
```

### 2. Service HTTP pour Firebase

```php
<?php
// app/Services/FirebaseService.php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FirebaseService
{
    protected string $baseUrl;
    protected string $apiKey;

    public function __construct()
    {
        $this->baseUrl = config('services.firebase.url');
        $this->apiKey = config('services.firebase.api_key');
    }

    /**
     * Envoie une demande client vers Firebase
     */
    public function ingestBooking(array $data): array
    {
        return $this->post('/ingestBooking', [
            'clientFirstName' => $data['first_name'] ?? '',
            'clientLastName' => $data['last_name'] ?? '',
            'clientEmail' => $data['email'] ?? '',
            'clientPhone' => $data['phone'] ?? '',
            'clientCurrentCountry' => $data['country'] ?? '',
            'clientNationality' => $data['nationality'] ?? 'Française',
            'title' => $data['title'],
            'description' => $data['description'] ?? '',
            'serviceType' => $data['service_type'] ?? 'consultation',
            'urgency' => $data['urgency'] ?? 'medium',
            'providerId' => $data['provider_id'] ?? null,
            'providerType' => $data['provider_type'] ?? null,
            'source' => 'sos-expat',
            'externalId' => $data['id'] ?? null,
            'userId' => $data['user_id'] ?? null,
        ]);
    }

    /**
     * Synchronise un abonnement
     */
    public function syncSubscription(array $data): array
    {
        return $this->post('/syncSubscription', [
            'userId' => $data['user_id'],
            'email' => $data['email'],
            'status' => $data['status'], // active, canceled, past_due, etc.
            'subscriptionId' => $data['subscription_id'] ?? null,
            'stripeCustomerId' => $data['stripe_customer_id'] ?? null,
            'stripeSubscriptionId' => $data['stripe_subscription_id'] ?? null,
            'planId' => $data['plan_id'] ?? null,
            'planName' => $data['plan_name'] ?? null,
            'priceAmount' => $data['price_amount'] ?? null, // En centimes
            'priceCurrency' => $data['price_currency'] ?? 'USD',
            'currentPeriodStart' => $data['current_period_start'] ?? null,
            'currentPeriodEnd' => $data['current_period_end'] ?? null,
            'canceledAt' => $data['canceled_at'] ?? null,
            'cancelAtPeriodEnd' => $data['cancel_at_period_end'] ?? false,
        ]);
    }

    /**
     * Vérifie le statut d'abonnement
     */
    public function checkSubscription(string $userId): array
    {
        return $this->get('/checkSubscription', [
            'userId' => $userId,
        ]);
    }

    /**
     * Synchronise un prestataire
     */
    public function syncProvider(array $data): array
    {
        return $this->post('/syncProvider', [
            'externalId' => $data['id'],
            'email' => $data['email'],
            'name' => $data['name'],
            'type' => $data['type'], // lawyer ou expat
            'phone' => $data['phone'] ?? null,
            'country' => $data['country'] ?? null,
            'specialties' => $data['specialties'] ?? [],
            'languages' => $data['languages'] ?? ['fr'],
            'active' => $data['active'] ?? true,
        ]);
    }

    protected function post(string $endpoint, array $data): array
    {
        try {
            $response = Http::withHeaders([
                'x-api-key' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])
            ->timeout(30)
            ->post($this->baseUrl . $endpoint, $data);

            if ($response->successful()) {
                return $response->json();
            }

            Log::error('Firebase API Error', [
                'endpoint' => $endpoint,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return [
                'ok' => false,
                'error' => $response->json()['error'] ?? 'Unknown error',
            ];
        } catch (\Exception $e) {
            Log::error('Firebase API Exception', [
                'endpoint' => $endpoint,
                'message' => $e->getMessage(),
            ]);

            return [
                'ok' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    protected function get(string $endpoint, array $params = []): array
    {
        try {
            $response = Http::withHeaders([
                'x-api-key' => $this->apiKey,
            ])
            ->timeout(10)
            ->get($this->baseUrl . $endpoint, $params);

            return $response->json();
        } catch (\Exception $e) {
            return [
                'ok' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
}
```

### 3. Configuration des services

```php
<?php
// config/services.php

return [
    // ... autres services

    'firebase' => [
        'url' => env('FIREBASE_PROJECT_URL'),
        'api_key' => env('FIREBASE_API_KEY'),
    ],
];
```

---

## Gestion des Abonnements avec Stripe

### 1. Listener pour les webhooks Stripe

```php
<?php
// app/Listeners/StripeWebhookListener.php

namespace App\Listeners;

use App\Services\FirebaseService;
use Laravel\Cashier\Events\WebhookReceived;

class StripeWebhookListener
{
    protected FirebaseService $firebase;

    public function __construct(FirebaseService $firebase)
    {
        $this->firebase = $firebase;
    }

    public function handle(WebhookReceived $event): void
    {
        $payload = $event->payload;

        match ($payload['type']) {
            'customer.subscription.created',
            'customer.subscription.updated' => $this->handleSubscriptionUpdate($payload),
            'customer.subscription.deleted' => $this->handleSubscriptionDeleted($payload),
            'invoice.payment_failed' => $this->handlePaymentFailed($payload),
            'invoice.paid' => $this->handlePaymentSucceeded($payload),
            default => null,
        };
    }

    protected function handleSubscriptionUpdate(array $payload): void
    {
        $subscription = $payload['data']['object'];
        $user = $this->getUserByStripeId($subscription['customer']);

        if (!$user) return;

        $this->firebase->syncSubscription([
            'user_id' => $user->id,
            'email' => $user->email,
            'status' => $this->mapStripeStatus($subscription['status']),
            'stripe_customer_id' => $subscription['customer'],
            'stripe_subscription_id' => $subscription['id'],
            'plan_id' => $subscription['items']['data'][0]['price']['id'] ?? null,
            'plan_name' => $subscription['items']['data'][0]['price']['nickname'] ?? 'Standard',
            'price_amount' => $subscription['items']['data'][0]['price']['unit_amount'] ?? null,
            'price_currency' => strtoupper($subscription['currency']),
            'current_period_start' => date('c', $subscription['current_period_start']),
            'current_period_end' => date('c', $subscription['current_period_end']),
            'cancel_at_period_end' => $subscription['cancel_at_period_end'],
        ]);
    }

    protected function handleSubscriptionDeleted(array $payload): void
    {
        $subscription = $payload['data']['object'];
        $user = $this->getUserByStripeId($subscription['customer']);

        if (!$user) return;

        $this->firebase->syncSubscription([
            'user_id' => $user->id,
            'email' => $user->email,
            'status' => 'canceled',
            'stripe_subscription_id' => $subscription['id'],
            'canceled_at' => date('c'),
        ]);
    }

    protected function handlePaymentFailed(array $payload): void
    {
        $invoice = $payload['data']['object'];
        $user = $this->getUserByStripeId($invoice['customer']);

        if (!$user) return;

        $this->firebase->syncSubscription([
            'user_id' => $user->id,
            'email' => $user->email,
            'status' => 'past_due',
        ]);
    }

    protected function handlePaymentSucceeded(array $payload): void
    {
        $invoice = $payload['data']['object'];
        $user = $this->getUserByStripeId($invoice['customer']);

        if (!$user) return;

        $this->firebase->syncSubscription([
            'user_id' => $user->id,
            'email' => $user->email,
            'status' => 'active',
            'current_period_end' => date('c', $invoice['lines']['data'][0]['period']['end'] ?? time()),
        ]);
    }

    protected function mapStripeStatus(string $stripeStatus): string
    {
        return match ($stripeStatus) {
            'active' => 'active',
            'trialing' => 'trialing',
            'past_due' => 'past_due',
            'canceled' => 'canceled',
            'unpaid' => 'unpaid',
            'incomplete' => 'past_due',
            'incomplete_expired' => 'expired',
            default => 'canceled',
        };
    }

    protected function getUserByStripeId(string $stripeId)
    {
        return \App\Models\User::where('stripe_id', $stripeId)->first();
    }
}
```

### 2. Enregistrer le listener

```php
<?php
// app/Providers/EventServiceProvider.php

use App\Listeners\StripeWebhookListener;
use Laravel\Cashier\Events\WebhookReceived;

protected $listen = [
    WebhookReceived::class => [
        StripeWebhookListener::class,
    ],
];
```

---

## Endpoints Firebase

### POST /ingestBooking

Crée une nouvelle demande client.

**Headers:**
```
x-api-key: YOUR_API_KEY
Content-Type: application/json
```

**Body:**
```json
{
  "clientFirstName": "Jean",
  "clientLastName": "Dupont",
  "clientEmail": "jean@example.com",
  "clientPhone": "+33612345678",
  "clientCurrentCountry": "Thaïlande",
  "clientNationality": "Française",
  "title": "Question visa retraité",
  "description": "Je souhaite obtenir un visa de retraité...",
  "serviceType": "consultation",
  "urgency": "medium",
  "providerId": "provider_123",
  "providerType": "lawyer",
  "source": "sos-expat",
  "externalId": "booking_456",
  "userId": "user_789"
}
```

**Réponse:**
```json
{
  "ok": true,
  "id": "firebase_booking_id",
  "requestId": "req_xxx",
  "message": "Booking créé avec succès",
  "booking": {
    "id": "firebase_booking_id",
    "clientName": "Jean Dupont",
    "status": "pending"
  },
  "processingTimeMs": 150
}
```

### POST /syncSubscription

Synchronise le statut d'abonnement.

**Body:**
```json
{
  "userId": "user_123",
  "email": "user@example.com",
  "status": "active",
  "stripeSubscriptionId": "sub_xxx",
  "planName": "Premium",
  "priceAmount": 4500,
  "priceCurrency": "USD",
  "currentPeriodEnd": "2024-02-01T00:00:00Z",
  "cancelAtPeriodEnd": false
}
```

### GET /checkSubscription

Vérifie le statut d'abonnement.

**Query params:**
- `userId` ou `email`

**Réponse:**
```json
{
  "ok": true,
  "userId": "user_123",
  "hasAccess": true,
  "status": "active",
  "expiresAt": "2024-02-01T00:00:00Z"
}
```

---

## Statuts d'Abonnement

| Statut | Description | Accès |
|--------|-------------|-------|
| `active` | Abonnement actif et payé | ✅ Oui |
| `trialing` | Période d'essai | ✅ Oui |
| `past_due` | Paiement en retard | ✅ Oui (grâce) |
| `canceled` | Annulé | ❌ Non |
| `unpaid` | Impayé définitif | ❌ Non |
| `expired` | Expiré | ❌ Non |
| `paused` | En pause | ❌ Non |

---

## Sécurité

### API Key

L'API key doit être configurée comme secret Firebase :

```bash
firebase functions:secrets:set SOS_PLATFORM_API_KEY
```

### Rate Limiting

Les endpoints sont protégés par rate limiting :

| Endpoint | Limite | Fenêtre |
|----------|--------|---------|
| `/ingestBooking` | 100 req | 1 minute |
| `/syncSubscription` | 100 req | 1 minute |
| `/aiChat` | 50 req | 1 heure |

### Validation

Tous les payloads sont validés avec Zod. Les erreurs retournent :

```json
{
  "ok": false,
  "error": "Invalid payload",
  "details": {
    "title": ["Titre trop court (minimum 3 caractères)"]
  }
}
```

---

## Tests

### Tester l'intégration

```bash
# Depuis Laravel
php artisan tinker

>>> $firebase = app(\App\Services\FirebaseService::class);
>>> $firebase->ingestBooking([
...     'first_name' => 'Test',
...     'last_name' => 'User',
...     'email' => 'test@example.com',
...     'title' => 'Test booking',
... ]);
```

### Health Check

```bash
curl https://europe-west1-outils-sos-expat.cloudfunctions.net/health
```

---

## Déploiement

### Firebase

```bash
cd functions
npm run build
firebase deploy --only functions
```

### Secrets

```bash
firebase functions:secrets:set SOS_PLATFORM_API_KEY
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set PERPLEXITY_API_KEY
```
