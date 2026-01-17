<?php

/**
 * =============================================================================
 * FIREBASE AUTH CONTROLLER - Génération de Custom Tokens pour SSO
 * =============================================================================
 *
 * Ce controller gère l'authentification SSO entre Laravel et l'outil Firebase.
 * L'utilisateur connecté sur sos-expat.com peut accéder à l'outil sans re-login.
 *
 * INSTALLATION:
 * 1. composer require kreait/firebase-php
 * 2. Placer le fichier service-account.json dans storage/app/firebase/
 * 3. Ajouter dans .env: FIREBASE_CREDENTIALS=storage/app/firebase/service-account.json
 * 4. Ajouter la route dans routes/web.php
 *
 * =============================================================================
 */

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Auth as FirebaseAuth;

class FirebaseAuthController extends Controller
{
    private FirebaseAuth $firebaseAuth;

    public function __construct()
    {
        // Initialiser Firebase Admin SDK
        $factory = (new Factory)
            ->withServiceAccount(base_path(env('FIREBASE_CREDENTIALS', 'storage/app/firebase/service-account.json')));

        $this->firebaseAuth = $factory->createAuth();
    }

    /**
     * Génère un Custom Token Firebase et redirige vers l'outil
     *
     * Route: GET /outils/access
     * Middleware: auth (utilisateur doit être connecté)
     */
    public function accessOutil(Request $request)
    {
        $user = Auth::user();

        if (!$user) {
            return redirect()->route('login')->with('error', 'Veuillez vous connecter');
        }

        // Vérifier le rôle (seuls avocat et expat_aidant peuvent accéder)
        $allowedRoles = ['avocat', 'expat_aidant', 'lawyer', 'expat'];
        if (!in_array($user->role, $allowedRoles)) {
            return back()->with('error', 'Accès réservé aux prestataires');
        }

        // Vérifier l'abonnement actif
        if (!$this->hasActiveSubscription($user)) {
            return redirect()->route('subscription.index')
                ->with('error', 'Un abonnement actif est requis pour accéder aux outils');
        }

        try {
            // Générer le Custom Token Firebase
            // L'UID Firebase doit correspondre à l'utilisateur dans Firestore
            $firebaseUid = $this->getOrCreateFirebaseUid($user);

            // Claims additionnels (seront disponibles dans le token)
            $customClaims = [
                'role' => $this->mapRole($user->role),
                'subscription' => 'active',
                'laravelUserId' => $user->id,
                'email' => $user->email,
            ];

            $customToken = $this->firebaseAuth->createCustomToken($firebaseUid, $customClaims);

            // URL de l'outil avec le token
            $outilUrl = env('FIREBASE_OUTIL_URL', 'https://outils.sos-expat.com');
            $redirectUrl = $outilUrl . '/auth?token=' . $customToken->toString();

            // Log pour audit
            \Log::info('Firebase SSO access', [
                'user_id' => $user->id,
                'firebase_uid' => $firebaseUid,
                'role' => $user->role,
            ]);

            return redirect()->away($redirectUrl);

        } catch (\Exception $e) {
            \Log::error('Firebase token generation failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return back()->with('error', 'Erreur de connexion aux outils. Réessayez.');
        }
    }

    /**
     * API endpoint pour générer un token (pour usage AJAX/mobile)
     *
     * Route: POST /api/firebase/token
     * Middleware: auth:sanctum
     */
    public function generateToken(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Non authentifié'], 401);
        }

        // Vérifier le rôle
        $allowedRoles = ['avocat', 'expat_aidant', 'lawyer', 'expat'];
        if (!in_array($user->role, $allowedRoles)) {
            return response()->json([
                'error' => 'Accès non autorisé',
                'code' => 'ROLE_NOT_ALLOWED'
            ], 403);
        }

        // Vérifier l'abonnement
        if (!$this->hasActiveSubscription($user)) {
            return response()->json([
                'error' => 'Abonnement requis',
                'code' => 'SUBSCRIPTION_REQUIRED'
            ], 403);
        }

        try {
            $firebaseUid = $this->getOrCreateFirebaseUid($user);

            $customClaims = [
                'role' => $this->mapRole($user->role),
                'subscription' => 'active',
                'laravelUserId' => $user->id,
                'email' => $user->email,
            ];

            $customToken = $this->firebaseAuth->createCustomToken($firebaseUid, $customClaims);

            return response()->json([
                'ok' => true,
                'token' => $customToken->toString(),
                'expiresIn' => 3600, // 1 heure
                'outilUrl' => env('FIREBASE_OUTIL_URL', 'https://outils.sos-expat.com'),
            ]);

        } catch (\Exception $e) {
            \Log::error('Firebase token generation failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Erreur de génération du token',
                'code' => 'TOKEN_GENERATION_FAILED'
            ], 500);
        }
    }

    /**
     * Obtient ou crée l'UID Firebase pour cet utilisateur
     */
    private function getOrCreateFirebaseUid($user): string
    {
        // Si l'utilisateur a déjà un firebase_uid stocké, l'utiliser
        if (!empty($user->firebase_uid)) {
            return $user->firebase_uid;
        }

        // Sinon, créer l'utilisateur dans Firebase Auth
        try {
            // Essayer de récupérer par email
            $firebaseUser = $this->firebaseAuth->getUserByEmail($user->email);
            $firebaseUid = $firebaseUser->uid;

        } catch (\Kreait\Firebase\Exception\Auth\UserNotFound $e) {
            // Créer l'utilisateur dans Firebase
            $firebaseUser = $this->firebaseAuth->createUser([
                'email' => $user->email,
                'emailVerified' => $user->email_verified_at !== null,
                'displayName' => $user->name ?? $user->first_name . ' ' . $user->last_name,
                'disabled' => false,
            ]);
            $firebaseUid = $firebaseUser->uid;

            // Créer aussi le document Firestore (via une Cloud Function ou directement)
            $this->syncUserToFirestore($user, $firebaseUid);
        }

        // Sauvegarder le firebase_uid dans Laravel
        $user->firebase_uid = $firebaseUid;
        $user->save();

        return $firebaseUid;
    }

    /**
     * Synchronise les données utilisateur vers Firestore
     */
    private function syncUserToFirestore($user, string $firebaseUid): void
    {
        try {
            $factory = (new Factory)
                ->withServiceAccount(base_path(env('FIREBASE_CREDENTIALS')));

            $firestore = $factory->createFirestore();
            $database = $firestore->database();

            $database->collection('users')->document($firebaseUid)->set([
                'email' => $user->email,
                'displayName' => $user->name ?? $user->first_name . ' ' . $user->last_name,
                'role' => $this->mapRole($user->role),
                'laravelUserId' => $user->id,
                'hasActiveSubscription' => $this->hasActiveSubscription($user),
                'subscriptionStatus' => $user->subscription_status ?? 'inactive',
                'createdAt' => new \Google\Cloud\Core\Timestamp(new \DateTime()),
                'updatedAt' => new \Google\Cloud\Core\Timestamp(new \DateTime()),
            ], ['merge' => true]);

        } catch (\Exception $e) {
            \Log::error('Firestore sync failed', [
                'user_id' => $user->id,
                'firebase_uid' => $firebaseUid,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Vérifie si l'utilisateur a un abonnement actif
     */
    private function hasActiveSubscription($user): bool
    {
        // Adapter selon votre modèle de données
        // Option 1: Champ direct sur l'utilisateur
        if (property_exists($user, 'has_active_subscription')) {
            return (bool) $user->has_active_subscription;
        }

        // Option 2: Relation avec une table subscriptions
        if (method_exists($user, 'subscription')) {
            $subscription = $user->subscription;
            return $subscription &&
                   in_array($subscription->status, ['active', 'trialing']) &&
                   ($subscription->ends_at === null || $subscription->ends_at > now());
        }

        // Option 3: Via Laravel Cashier / Stripe
        if (method_exists($user, 'subscribed')) {
            return $user->subscribed('default');
        }

        // Par défaut, vérifier un champ subscription_status
        return in_array($user->subscription_status ?? '', ['active', 'trialing']);
    }

    /**
     * Mappe le rôle Laravel vers le rôle Firebase
     */
    private function mapRole(string $laravelRole): string
    {
        $roleMap = [
            'avocat' => 'lawyer',
            'lawyer' => 'lawyer',
            'expat_aidant' => 'expat',
            'expat' => 'expat',
            'admin' => 'admin',
            'superadmin' => 'superadmin',
        ];

        return $roleMap[$laravelRole] ?? 'provider';
    }
}
