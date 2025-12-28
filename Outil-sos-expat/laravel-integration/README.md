# Intégration SSO Laravel ↔ Firebase (SOS Expat)

## Vue d'ensemble

Ce système permet aux prestataires (avocats et expatriés aidants) de sos-expat.com d'accéder à l'outil Firebase **sans avoir à se reconnecter**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUX D'AUTHENTIFICATION SSO                          │
└─────────────────────────────────────────────────────────────────────────────┘

  SOS-EXPAT.COM (Laravel)                    OUTIL FIREBASE
  ━━━━━━━━━━━━━━━━━━━━━━                    ━━━━━━━━━━━━━━━━
         │                                        │
    ┌────┴────┐                                   │
    │ User    │                                   │
    │ connecté│                                   │
    └────┬────┘                                   │
         │                                        │
         │  1. Clique "Accéder aux outils"        │
         │                                        │
         ▼                                        │
    ┌─────────────────┐                           │
    │ Laravel vérifie │                           │
    │ - Rôle OK ?     │                           │
    │ - Abo actif ?   │                           │
    └────────┬────────┘                           │
             │                                    │
             │  2. Génère Custom Token Firebase   │
             │                                    │
             ▼                                    │
    ┌─────────────────┐                           │
    │ Redirige vers   │    Token dans URL         │
    │ outils.sos-     │ ─────────────────────────►│
    │ expat.com/auth  │                           │
    │ ?token=xxx      │                           │
    └─────────────────┘                           │
                                                  │
                                            ┌─────┴─────┐
                                            │ Firebase  │
                                            │ Auth via  │
                                            │ Custom    │
                                            │ Token     │
                                            └─────┬─────┘
                                                  │
                                            ┌─────┴─────┐
                                            │ Vérifie   │
                                            │ Firestore │
                                            │ - Rôle    │
                                            │ - Abo     │
                                            └─────┬─────┘
                                                  │
                                            ┌─────┴─────┐
                                            │  ACCÈS    │
                                            │  OUTIL    │
                                            └───────────┘
```

---

## Installation côté Laravel

### 1. Installer le SDK Firebase

```bash
composer require kreait/firebase-php
```

### 2. Configurer les credentials

1. Télécharger le fichier `service-account.json` depuis la console Firebase :
   - Firebase Console → Project Settings → Service Accounts → Generate new private key

2. Placer le fichier dans `storage/app/firebase/service-account.json`

3. Ajouter dans `.env` :

```env
FIREBASE_CREDENTIALS=storage/app/firebase/service-account.json
FIREBASE_OUTIL_URL=https://outils.sos-expat.com
```

### 3. Ajouter le controller

Copier `FirebaseAuthController.php` dans `app/Http/Controllers/`

### 4. Ajouter les routes

Dans `routes/web.php` :

```php
use App\Http\Controllers\FirebaseAuthController;

// Route pour accéder à l'outil (redirige avec token)
Route::get('/outils/access', [FirebaseAuthController::class, 'accessOutil'])
    ->middleware('auth')
    ->name('outils.access');
```

Dans `routes/api.php` (optionnel, pour les apps mobiles) :

```php
Route::post('/firebase/token', [FirebaseAuthController::class, 'generateToken'])
    ->middleware('auth:sanctum');
```

### 5. Ajouter la migration pour firebase_uid

```bash
php artisan make:migration add_firebase_uid_to_users_table
```

```php
public function up()
{
    Schema::table('users', function (Blueprint $table) {
        $table->string('firebase_uid')->nullable()->after('id');
        $table->index('firebase_uid');
    });
}
```

```bash
php artisan migrate
```

---

## Utilisation

### Bouton dans le dashboard Laravel

```blade
@if(in_array(auth()->user()->role, ['avocat', 'expat_aidant', 'lawyer', 'expat']))
    @if(auth()->user()->hasActiveSubscription())
        <a href="{{ route('outils.access') }}"
           class="btn btn-primary"
           target="_blank">
            Accéder à mes outils
        </a>
    @else
        <a href="{{ route('subscription.index') }}" class="btn btn-secondary">
            Activer mon abonnement
        </a>
    @endif
@endif
```

### Via JavaScript (SPA)

```javascript
// Récupérer le token
const response = await fetch('/api/firebase/token', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    }
});

const { token, outilUrl } = await response.json();

// Ouvrir l'outil dans un nouvel onglet
window.open(`${outilUrl}/auth?token=${token}`, '_blank');
```

---

## Structure des données Firestore

### Collection `users/{userId}`

Quand Laravel crée/synchronise un utilisateur, il doit créer ce document :

```javascript
{
  // Identité
  email: "avocat@example.com",
  displayName: "Maître Dupont",

  // Rôle (REQUIS pour l'accès)
  role: "lawyer",  // "lawyer" | "expat" | "admin" | "superadmin"

  // Abonnement (REQUIS pour l'accès)
  hasActiveSubscription: true,
  subscriptionStatus: "active",  // "active" | "trialing" | "past_due" | "canceled" | "inactive"
  subscriptionExpiresAt: Timestamp,  // Date d'expiration
  planName: "Pro",  // Nom du plan

  // Liaison Laravel
  laravelUserId: 123,

  // Métadonnées
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Rôles autorisés

| Rôle Laravel | Rôle Firebase | Accès outil |
|--------------|---------------|-------------|
| `avocat` | `lawyer` | ✅ |
| `lawyer` | `lawyer` | ✅ |
| `expat_aidant` | `expat` | ✅ |
| `expat` | `expat` | ✅ |
| `admin` | `admin` | ✅ |
| `superadmin` | `superadmin` | ✅ |
| `user` | `user` | ❌ |
| `client` | `client` | ❌ |

---

## Synchronisation des abonnements

### Webhook Stripe → Laravel → Firestore

Quand un abonnement change dans Stripe, synchroniser vers Firestore :

```php
// app/Listeners/StripeWebhookListener.php

use Kreait\Firebase\Factory;

class StripeWebhookListener
{
    public function handleSubscriptionUpdated($event)
    {
        $subscription = $event->data->object;
        $user = User::where('stripe_id', $subscription->customer)->first();

        if (!$user || !$user->firebase_uid) return;

        // Synchroniser vers Firestore
        $factory = (new Factory)
            ->withServiceAccount(base_path(env('FIREBASE_CREDENTIALS')));

        $firestore = $factory->createFirestore()->database();

        $firestore->collection('users')->document($user->firebase_uid)->update([
            ['path' => 'hasActiveSubscription', 'value' => $subscription->status === 'active'],
            ['path' => 'subscriptionStatus', 'value' => $subscription->status],
            ['path' => 'subscriptionExpiresAt', 'value' => new \Google\Cloud\Core\Timestamp(
                \DateTime::createFromFormat('U', $subscription->current_period_end)
            )],
            ['path' => 'updatedAt', 'value' => new \Google\Cloud\Core\Timestamp(new \DateTime())],
        ]);
    }
}
```

### Service de synchronisation dédié

```php
// app/Services/FirebaseSync.php

namespace App\Services;

use Kreait\Firebase\Factory;

class FirebaseSync
{
    private $firestore;

    public function __construct()
    {
        $factory = (new Factory)
            ->withServiceAccount(base_path(env('FIREBASE_CREDENTIALS')));
        $this->firestore = $factory->createFirestore()->database();
    }

    public function syncUser($user)
    {
        if (!$user->firebase_uid) return;

        $this->firestore->collection('users')->document($user->firebase_uid)->set([
            'email' => $user->email,
            'displayName' => $user->name,
            'role' => $this->mapRole($user->role),
            'hasActiveSubscription' => $user->hasActiveSubscription(),
            'subscriptionStatus' => $user->subscription_status ?? 'inactive',
            'laravelUserId' => $user->id,
            'updatedAt' => new \Google\Cloud\Core\Timestamp(new \DateTime()),
        ], ['merge' => true]);
    }

    public function updateSubscription($user, $status, $expiresAt = null)
    {
        if (!$user->firebase_uid) return;

        $data = [
            ['path' => 'hasActiveSubscription', 'value' => in_array($status, ['active', 'trialing'])],
            ['path' => 'subscriptionStatus', 'value' => $status],
            ['path' => 'updatedAt', 'value' => new \Google\Cloud\Core\Timestamp(new \DateTime())],
        ];

        if ($expiresAt) {
            $data[] = ['path' => 'subscriptionExpiresAt', 'value' => new \Google\Cloud\Core\Timestamp($expiresAt)];
        }

        $this->firestore->collection('users')->document($user->firebase_uid)->update($data);
    }

    private function mapRole($role)
    {
        return match($role) {
            'avocat', 'lawyer' => 'lawyer',
            'expat_aidant', 'expat' => 'expat',
            'admin' => 'admin',
            'superadmin' => 'superadmin',
            default => 'user'
        };
    }
}
```

---

## Sécurité

### Token Firebase Custom

- **Durée de vie** : 1 heure maximum
- **Usage unique** : Le token ne peut être utilisé qu'une fois
- **Non stocké** : Ne jamais stocker le token côté client

### Vérifications côté outil Firebase

L'outil vérifie dans cet ordre :

1. **Token valide** → Sinon erreur "Lien expiré"
2. **Utilisateur existe dans Firestore** → Sinon "Compte non trouvé"
3. **Rôle autorisé** → Sinon "Accès réservé aux prestataires"
4. **Abonnement actif** → Sinon "Abonnement requis"

### Règles Firestore

Les règles Firestore empêchent :
- La modification du rôle par l'utilisateur
- La modification du statut d'abonnement par l'utilisateur
- L'accès aux données des autres utilisateurs

---

## Dépannage

### "Token invalide ou expiré"

- Le token a plus d'1 heure
- Le token a déjà été utilisé
- **Solution** : Retourner sur sos-expat.com et recliquer sur "Accéder aux outils"

### "Compte non trouvé"

- L'utilisateur n'a pas de document dans Firestore
- **Solution** : Vérifier que `syncUserToFirestore()` est appelé lors de la création du compte

### "Accès réservé aux prestataires"

- Le rôle n'est pas `lawyer`, `expat`, `admin`, ou `superadmin`
- **Solution** : Vérifier le champ `role` dans Firestore

### "Abonnement requis"

- `hasActiveSubscription` est `false` ou `subscriptionStatus` n'est pas `active`/`trialing`
- **Solution** : Synchroniser l'abonnement depuis Stripe

---

## Fichiers de l'intégration

```
laravel-integration/
├── FirebaseAuthController.php   # Controller principal
├── README.md                    # Cette documentation
└── examples/
    ├── routes.php               # Exemples de routes
    ├── migration.php            # Migration firebase_uid
    └── FirebaseSync.php         # Service de synchronisation
```

---

## Support

Pour toute question sur l'intégration :
- Email : tech@sos-expat.com
- Documentation Firebase : https://firebase.google.com/docs/auth/admin/create-custom-tokens
