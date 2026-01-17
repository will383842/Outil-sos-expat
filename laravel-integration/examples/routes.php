<?php

/**
 * Exemples de routes à ajouter dans votre application Laravel
 */

use App\Http\Controllers\FirebaseAuthController;

// ============================================================================
// routes/web.php
// ============================================================================

// Accès à l'outil (redirige avec token SSO)
Route::get('/outils/access', [FirebaseAuthController::class, 'accessOutil'])
    ->middleware('auth')
    ->name('outils.access');

// Page intermédiaire optionnelle (montre un loader avant redirection)
Route::get('/outils', function () {
    return view('outils.index');
})->middleware('auth')->name('outils.index');


// ============================================================================
// routes/api.php
// ============================================================================

// API pour générer un token (pour apps mobiles ou SPA)
Route::post('/firebase/token', [FirebaseAuthController::class, 'generateToken'])
    ->middleware('auth:sanctum')
    ->name('api.firebase.token');


// ============================================================================
// Exemple de middleware personnalisé pour vérifier l'accès aux outils
// ============================================================================

// app/Http/Middleware/EnsureCanAccessOutils.php
/*
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureCanAccessOutils
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        // Vérifier le rôle
        $allowedRoles = ['avocat', 'expat_aidant', 'lawyer', 'expat', 'admin'];
        if (!in_array($user->role, $allowedRoles)) {
            return redirect()->route('dashboard')
                ->with('error', 'Accès réservé aux prestataires');
        }

        // Vérifier l'abonnement
        if (!$user->hasActiveSubscription()) {
            return redirect()->route('subscription.index')
                ->with('error', 'Un abonnement actif est requis');
        }

        return $next($request);
    }
}
*/

// Puis dans Kernel.php :
// 'can.access.outils' => \App\Http\Middleware\EnsureCanAccessOutils::class,

// Et utiliser :
// Route::get('/outils/access', ...)->middleware(['auth', 'can.access.outils']);
