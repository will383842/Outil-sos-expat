<?php

/**
 * =============================================================================
 * FIREBASE SYNC SERVICE
 * =============================================================================
 *
 * Service pour synchroniser les utilisateurs et abonnements Laravel → Firebase
 *
 * Copier ce fichier dans: app/Services/FirebaseSync.php
 *
 * Usage:
 *   $sync = app(FirebaseSync::class);
 *   $sync->syncUser($user);
 *   $sync->updateSubscription($user, 'active', $expiresAt);
 *   $token = $sync->generateCustomToken($user);
 *
 * =============================================================================
 */

namespace App\Services;

use App\Models\User;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Auth as FirebaseAuth;
use Google\Cloud\Firestore\FirestoreClient;
use Google\Cloud\Core\Timestamp;
use Illuminate\Support\Facades\Log;

class FirebaseSync
{
    private FirebaseAuth $auth;
    private FirestoreClient $firestore;

    public function __construct()
    {
        $factory = (new Factory)
            ->withServiceAccount(base_path(env('FIREBASE_CREDENTIALS')));

        $this->auth = $factory->createAuth();
        $this->firestore = $factory->createFirestore()->database();
    }

    // =========================================================================
    // SYNCHRONISATION UTILISATEUR
    // =========================================================================

    /**
     * Crée ou met à jour un utilisateur dans Firebase
     *
     * @param User $user L'utilisateur Laravel
     * @return string|null Le firebase_uid ou null en cas d'erreur
     */
    public function syncUser(User $user): ?string
    {
        try {
            $firebaseUid = $user->firebase_uid;

            // Si pas encore de firebase_uid, créer l'utilisateur Firebase
            if (!$firebaseUid) {
                $firebaseUid = $this->createFirebaseUser($user);

                // Sauvegarder le firebase_uid dans Laravel
                $user->firebase_uid = $firebaseUid;
                $user->saveQuietly(); // Évite de déclencher l'observer en boucle
            }

            // Synchroniser les données vers Firestore
            $this->syncToFirestore($user, $firebaseUid);

            Log::info('FirebaseSync: User synced successfully', [
                'user_id' => $user->id,
                'firebase_uid' => $firebaseUid,
                'email' => $user->email,
            ]);

            return $firebaseUid;

        } catch (\Exception $e) {
            Log::error('FirebaseSync: Failed to sync user', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return null;
        }
    }

    /**
     * Crée l'utilisateur dans Firebase Auth
     */
    private function createFirebaseUser(User $user): string
    {
        try {
            // Essayer de récupérer par email (peut-être déjà créé)
            $firebaseUser = $this->auth->getUserByEmail($user->email);

            Log::info('FirebaseSync: Found existing Firebase user', [
                'email' => $user->email,
                'firebase_uid' => $firebaseUser->uid,
            ]);

            return $firebaseUser->uid;

        } catch (\Kreait\Firebase\Exception\Auth\UserNotFound $e) {
            // Créer l'utilisateur dans Firebase Auth
            $displayName = $user->name ?? trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? ''));

            $firebaseUser = $this->auth->createUser([
                'email' => $user->email,
                'emailVerified' => $user->email_verified_at !== null,
                'displayName' => $displayName ?: $user->email,
                'disabled' => false,
            ]);

            Log::info('FirebaseSync: Created new Firebase user', [
                'email' => $user->email,
                'firebase_uid' => $firebaseUser->uid,
            ]);

            return $firebaseUser->uid;
        }
    }

    /**
     * Synchronise les données utilisateur vers Firestore
     */
    public function syncToFirestore(User $user, string $firebaseUid): void
    {
        $displayName = $user->name ?? trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? ''));

        $data = [
            // Identité
            'email' => $user->email,
            'displayName' => $displayName ?: $user->email,

            // Rôle (IMPORTANT pour l'accès à l'outil)
            'role' => $this->mapRole($user->role ?? 'user'),

            // Liaison Laravel
            'laravelUserId' => $user->id,

            // Abonnement (IMPORTANT pour l'accès à l'outil)
            'hasActiveSubscription' => $this->checkSubscription($user),
            'subscriptionStatus' => $user->subscription_status ?? 'inactive',
            'planName' => $user->plan_name ?? null,

            // Métadonnées
            'updatedAt' => new Timestamp(new \DateTime()),
        ];

        // Ajouter createdAt seulement si nouveau document
        $docRef = $this->firestore->collection('users')->document($firebaseUid);
        $doc = $docRef->snapshot();

        if (!$doc->exists()) {
            $data['createdAt'] = new Timestamp(new \DateTime());
        }

        $docRef->set($data, ['merge' => true]);
    }

    // =========================================================================
    // GESTION ABONNEMENTS
    // =========================================================================

    /**
     * Met à jour uniquement le statut d'abonnement dans Firestore
     *
     * @param User $user L'utilisateur Laravel
     * @param string $status Le nouveau statut (active, trialing, past_due, canceled, inactive)
     * @param \DateTime|null $expiresAt Date d'expiration optionnelle
     * @param string|null $planName Nom du plan optionnel
     * @return bool Succès ou échec
     */
    public function updateSubscription(
        User $user,
        string $status,
        ?\DateTime $expiresAt = null,
        ?string $planName = null
    ): bool {
        if (!$user->firebase_uid) {
            Log::warning('FirebaseSync: Cannot update subscription - no firebase_uid', [
                'user_id' => $user->id,
            ]);
            return false;
        }

        try {
            $isActive = in_array($status, ['active', 'trialing', 'past_due']);

            $updates = [
                ['path' => 'hasActiveSubscription', 'value' => $isActive],
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
                'firebase_uid' => $user->firebase_uid,
                'status' => $status,
                'is_active' => $isActive,
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error('FirebaseSync: Failed to update subscription', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
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

    // =========================================================================
    // GÉNÉRATION TOKEN SSO
    // =========================================================================

    /**
     * Génère un Custom Token Firebase pour SSO
     *
     * @param User $user L'utilisateur Laravel
     * @return string|null Le token ou null en cas d'erreur
     */
    public function generateCustomToken(User $user): ?string
    {
        try {
            // S'assurer que l'utilisateur est synchronisé
            $firebaseUid = $user->firebase_uid;

            if (!$firebaseUid) {
                $firebaseUid = $this->syncUser($user);
            }

            if (!$firebaseUid) {
                Log::error('FirebaseSync: Cannot generate token - sync failed', [
                    'user_id' => $user->id,
                ]);
                return null;
            }

            // Claims additionnels (disponibles dans le token côté client)
            $claims = [
                'role' => $this->mapRole($user->role ?? 'user'),
                'subscription' => $this->checkSubscription($user) ? 'active' : 'inactive',
                'laravelUserId' => $user->id,
                'email' => $user->email,
            ];

            $customToken = $this->auth->createCustomToken($firebaseUid, $claims);

            Log::info('FirebaseSync: Custom token generated', [
                'user_id' => $user->id,
                'firebase_uid' => $firebaseUid,
            ]);

            return $customToken->toString();

        } catch (\Exception $e) {
            Log::error('FirebaseSync: Failed to generate custom token', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    // =========================================================================
    // SUPPRESSION
    // =========================================================================

    /**
     * Supprime un utilisateur de Firebase (Auth + Firestore)
     */
    public function deleteUser(User $user): bool
    {
        if (!$user->firebase_uid) {
            return true; // Rien à supprimer
        }

        try {
            // Supprimer de Firestore
            $this->firestore->collection('users')->document($user->firebase_uid)->delete();

            // Supprimer de Firebase Auth
            $this->auth->deleteUser($user->firebase_uid);

            Log::info('FirebaseSync: User deleted from Firebase', [
                'user_id' => $user->id,
                'firebase_uid' => $user->firebase_uid,
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error('FirebaseSync: Failed to delete user from Firebase', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    /**
     * Mappe les rôles Laravel → Firebase
     */
    private function mapRole(?string $role): string
    {
        if (!$role) {
            return 'user';
        }

        return match ($role) {
            'avocat', 'lawyer' => 'lawyer',
            'expat_aidant', 'expat' => 'expat',
            'admin' => 'admin',
            'superadmin' => 'superadmin',
            'provider' => 'provider',
            default => 'user'
        };
    }

    /**
     * Vérifie si l'utilisateur a un abonnement actif
     */
    private function checkSubscription(User $user): bool
    {
        // Option 1: Méthode sur le modèle User
        if (method_exists($user, 'hasActiveSubscription')) {
            return $user->hasActiveSubscription();
        }

        // Option 2: Laravel Cashier
        if (method_exists($user, 'subscribed')) {
            return $user->subscribed('default');
        }

        // Option 3: Relation subscription
        if (isset($user->subscription) && $user->subscription) {
            $status = $user->subscription->status ?? '';
            $endsAt = $user->subscription->ends_at ?? null;

            return in_array($status, ['active', 'trialing', 'past_due'])
                && ($endsAt === null || $endsAt > now());
        }

        // Option 4: Champ direct subscription_status
        $status = $user->subscription_status ?? '';
        return in_array($status, ['active', 'trialing', 'past_due']);
    }
}
