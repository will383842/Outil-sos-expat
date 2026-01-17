<?php

/**
 * =============================================================================
 * FIREBASE SYNC SERVICE
 * =============================================================================
 *
 * Service pour synchroniser les utilisateurs et abonnements Laravel → Firestore
 *
 * Usage:
 *   $sync = app(FirebaseSync::class);
 *   $sync->syncUser($user);
 *   $sync->updateSubscription($user, 'active', $expiresAt);
 *
 * =============================================================================
 */

namespace App\Services;

use App\Models\User;
use Kreait\Firebase\Factory;
use Google\Cloud\Firestore\FirestoreClient;
use Google\Cloud\Core\Timestamp;
use Illuminate\Support\Facades\Log;

class FirebaseSync
{
    private FirestoreClient $firestore;

    public function __construct()
    {
        $factory = (new Factory)
            ->withServiceAccount(base_path(env('FIREBASE_CREDENTIALS')));

        $this->firestore = $factory->createFirestore()->database();
    }

    /**
     * Synchronise un utilisateur complet vers Firestore
     */
    public function syncUser(User $user): bool
    {
        if (!$user->firebase_uid) {
            Log::warning('FirebaseSync: User has no firebase_uid', ['user_id' => $user->id]);
            return false;
        }

        try {
            $this->firestore->collection('users')->document($user->firebase_uid)->set([
                'email' => $user->email,
                'displayName' => $user->name ?? trim($user->first_name . ' ' . $user->last_name),
                'role' => $this->mapRole($user->role),
                'laravelUserId' => $user->id,

                // Abonnement
                'hasActiveSubscription' => $this->checkSubscription($user),
                'subscriptionStatus' => $user->subscription_status ?? 'inactive',
                'planName' => $user->plan_name ?? null,

                // Métadonnées
                'updatedAt' => new Timestamp(new \DateTime()),
            ], ['merge' => true]);

            Log::info('FirebaseSync: User synced', [
                'user_id' => $user->id,
                'firebase_uid' => $user->firebase_uid
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error('FirebaseSync: Failed to sync user', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Met à jour uniquement le statut d'abonnement
     */
    public function updateSubscription(
        User $user,
        string $status,
        ?\DateTime $expiresAt = null,
        ?string $planName = null
    ): bool {
        if (!$user->firebase_uid) {
            return false;
        }

        try {
            $updates = [
                ['path' => 'hasActiveSubscription', 'value' => in_array($status, ['active', 'trialing', 'past_due'])],
                ['path' => 'subscriptionStatus', 'value' => $status],
                ['path' => 'updatedAt', 'value' => new Timestamp(new \DateTime())],
            ];

            if ($expiresAt) {
                $updates[] = ['path' => 'subscriptionExpiresAt', 'value' => new Timestamp($expiresAt)];
            }

            if ($planName) {
                $updates[] = ['path' => 'planName', 'value' => $planName];
            }

            $this->firestore->collection('users')->document($user->firebase_uid)->update($updates);

            Log::info('FirebaseSync: Subscription updated', [
                'user_id' => $user->id,
                'status' => $status
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error('FirebaseSync: Failed to update subscription', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Désactive l'abonnement d'un utilisateur
     */
    public function deactivateSubscription(User $user): bool
    {
        return $this->updateSubscription($user, 'canceled');
    }

    /**
     * Supprime un utilisateur de Firestore
     */
    public function deleteUser(User $user): bool
    {
        if (!$user->firebase_uid) {
            return false;
        }

        try {
            $this->firestore->collection('users')->document($user->firebase_uid)->delete();

            Log::info('FirebaseSync: User deleted from Firestore', [
                'user_id' => $user->id,
                'firebase_uid' => $user->firebase_uid
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error('FirebaseSync: Failed to delete user', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Mappe le rôle Laravel vers le rôle Firebase
     */
    private function mapRole(string $role): string
    {
        return match ($role) {
            'avocat', 'lawyer' => 'lawyer',
            'expat_aidant', 'expat' => 'expat',
            'admin' => 'admin',
            'superadmin' => 'superadmin',
            default => 'user'
        };
    }

    /**
     * Vérifie si l'utilisateur a un abonnement actif
     */
    private function checkSubscription(User $user): bool
    {
        // Option 1: Méthode sur le modèle
        if (method_exists($user, 'hasActiveSubscription')) {
            return $user->hasActiveSubscription();
        }

        // Option 2: Laravel Cashier
        if (method_exists($user, 'subscribed')) {
            return $user->subscribed('default');
        }

        // Option 3: Champ direct
        if (property_exists($user, 'subscription_status')) {
            return in_array($user->subscription_status, ['active', 'trialing']);
        }

        return false;
    }
}
