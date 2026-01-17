/**
 * =============================================================================
 * AUTH SSO - Page d'authentification SSO (VERSION CONSOLIDÉE ROBUSTE)
 * =============================================================================
 *
 * FLUX D'AUTHENTIFICATION:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Arrivée sur /auth?token=xxx&providerId=yyy                            │
 * └───────────────────────────────┬─────────────────────────────────────────┘
 *                                 │
 *                                 ▼
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  L'utilisateur est-il DÉJÀ connecté (Firebase Auth)?                   │
 * └───────────────────────────────┬─────────────────────────────────────────┘
 *                                 │
 *            ┌────────────────────┴────────────────────┐
 *            │ OUI                                     │ NON
 *            ▼                                         ▼
 * ┌──────────────────────────┐            ┌──────────────────────────┐
 * │ IGNORER le token         │            │ Y a-t-il un token?       │
 * │ (évite erreur token      │            └────────────┬─────────────┘
 * │  expiré/déjà utilisé)    │                         │
 * │                          │           ┌─────────────┴──────────────┐
 * │ Stocker providerId si    │           │ OUI                        │ NON
 * │ fourni (pour switch)     │           ▼                            ▼
 * │                          │  ┌─────────────────────┐   ┌───────────────────┐
 * │ Rediriger vers dashboard │  │ Authentifier avec   │   │ Afficher écran    │
 * └──────────────────────────┘  │ signInWithCustomToken│   │ "Accès via        │
 *                               └─────────┬───────────┘   │  sos-expat.com"   │
 *                                         │               └───────────────────┘
 *                                         ▼
 *                               ┌─────────────────────┐
 *                               │ Succès → Dashboard  │
 *                               │ Erreur → Message    │
 *                               └─────────────────────┘
 *
 * POINTS CLÉS:
 * - Si déjà connecté, on NE réutilise PAS le token (évite erreurs)
 * - Le providerId est stocké pour auto-sélection dans UnifiedUserContext
 * - L'URL est nettoyée immédiatement (sécurité)
 *
 * =============================================================================
 */

import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { signInWithCustomToken, onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { Loader2, AlertCircle, ExternalLink, CheckCircle } from "lucide-react";

// =============================================================================
// TYPES & CONSTANTES
// =============================================================================

type AuthStatus = "checking" | "authenticating" | "success" | "error" | "no_token";

// Clés de session partagées avec UnifiedUserContext
const SSO_PROVIDER_ID_KEY = "sso_providerId";

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

export default function AuthSSO() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Stocker les params au montage (AVANT nettoyage de l'URL)
  const tokenRef = useRef<string | null>(searchParams.get("token"));
  const providerIdRef = useRef<string | null>(searchParams.get("providerId"));
  const processedRef = useRef(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFET PRINCIPAL: Gérer l'authentification
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    // Éviter les exécutions multiples
    if (processedRef.current) return;

    const token = tokenRef.current;
    const providerId = providerIdRef.current;

    // SÉCURITÉ: Nettoyer l'URL immédiatement
    if (window.location.search) {
      window.history.replaceState({}, document.title, "/auth");
    }

    // Vérifier l'état d'authentification Firebase
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Éviter les exécutions multiples après le premier check
      if (processedRef.current) return;
      processedRef.current = true;

      // ─────────────────────────────────────────────────────────────────────
      // CAS 1: UTILISATEUR DÉJÀ CONNECTÉ
      // → Rediriger directement (ignorer le token pour éviter les erreurs)
      // ─────────────────────────────────────────────────────────────────────
      if (user) {
        console.debug("[AuthSSO] Utilisateur déjà connecté:", user.email);

        // Stocker le providerId pour auto-sélection (si fourni)
        if (providerId) {
          sessionStorage.setItem(SSO_PROVIDER_ID_KEY, providerId);
          console.debug("[AuthSSO] ProviderId stocké:", providerId);
        }

        // Déterminer la destination
        try {
          const tokenResult = await user.getIdTokenResult();
          const isAdmin =
            tokenResult.claims.admin === true ||
            tokenResult.claims.role === "admin" ||
            tokenResult.claims.role === "superadmin";

          const destination = isAdmin ? "/admin" : "/dashboard";
          console.debug("[AuthSSO] Redirection vers:", destination);
          navigate(destination, { replace: true });
        } catch {
          // En cas d'erreur, aller au dashboard par défaut
          navigate("/dashboard", { replace: true });
        }

        unsubscribe();
        return;
      }

      // ─────────────────────────────────────────────────────────────────────
      // CAS 2: PAS CONNECTÉ + TOKEN PRÉSENT
      // → Authentifier avec le token
      // ─────────────────────────────────────────────────────────────────────
      if (token) {
        console.debug("[AuthSSO] Authentification avec token...");
        setStatus("authenticating");

        try {
          const userCredential = await signInWithCustomToken(auth, token);
          const newUser = userCredential.user;
          console.debug("[AuthSSO] Authentification réussie:", newUser.email);

          setStatus("success");

          // Extraire les claims pour déterminer la destination
          let isAdmin = false;
          let claimProviderId: string | null = null;

          try {
            const tokenResult = await newUser.getIdTokenResult();
            isAdmin =
              tokenResult.claims.admin === true ||
              tokenResult.claims.role === "admin" ||
              tokenResult.claims.role === "superadmin";
            claimProviderId =
              (tokenResult.claims.providerId as string) || providerId || null;
          } catch {
            // Ignorer les erreurs de claims, continuer avec les defaults
          }

          // Stocker le providerId pour auto-sélection
          const finalProviderId = claimProviderId || providerId;
          if (finalProviderId) {
            sessionStorage.setItem(SSO_PROVIDER_ID_KEY, finalProviderId);
            console.debug("[AuthSSO] ProviderId stocké:", finalProviderId);
          }

          // Rediriger après un court délai (pour montrer le succès)
          const destination = isAdmin ? "/admin" : "/dashboard";
          setTimeout(() => {
            navigate(destination, { replace: true });
          }, 500);

        } catch (error: unknown) {
          const firebaseError = error as { code?: string; message?: string };
          console.error("[AuthSSO] Erreur d'authentification:", firebaseError);
          setStatus("error");

          // Messages d'erreur explicites
          switch (firebaseError.code) {
            case "auth/invalid-custom-token":
              setErrorMessage(
                "Le lien d'accès est invalide ou a expiré. Veuillez retourner sur sos-expat.com et réessayer."
              );
              break;
            case "auth/custom-token-mismatch":
              setErrorMessage(
                "Erreur de configuration. Veuillez contacter le support."
              );
              break;
            case "auth/network-request-failed":
              setErrorMessage(
                "Erreur de connexion réseau. Vérifiez votre connexion internet et réessayez."
              );
              break;
            default:
              setErrorMessage(
                "Une erreur est survenue lors de la connexion. Veuillez réessayer depuis sos-expat.com."
              );
          }
        }

        unsubscribe();
        return;
      }

      // ─────────────────────────────────────────────────────────────────────
      // CAS 3: PAS CONNECTÉ + PAS DE TOKEN
      // → Afficher l'écran d'information
      // ─────────────────────────────────────────────────────────────────────
      console.debug("[AuthSSO] Pas de token, affichage écran info");
      setStatus("no_token");
      unsubscribe();
    });

    return () => unsubscribe();
  }, [navigate]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU: Vérification en cours
  // ═══════════════════════════════════════════════════════════════════════════
  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
            <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Vérification de votre session...
          </h1>
          <p className="text-gray-600">Un instant, nous vérifions votre accès.</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU: Authentification en cours
  // ═══════════════════════════════════════════════════════════════════════════
  if (status === "authenticating") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
            <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Connexion en cours...
          </h1>
          <p className="text-gray-600">
            Veuillez patienter pendant que nous vous connectons.
          </p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU: Succès
  // ═══════════════════════════════════════════════════════════════════════════
  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Connecté !</h1>
          <p className="text-gray-600">Redirection vers votre espace...</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU: Pas de token (accès direct sans passer par SOS-Expat)
  // ═══════════════════════════════════════════════════════════════════════════
  if (status === "no_token") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-2xl mb-6 shadow-lg">
              <span className="text-2xl font-bold text-white">S</span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              SOS Expats - Espace Prestataires
            </h1>

            <p className="text-gray-600 mb-8">
              Cet outil est réservé aux prestataires inscrits sur sos-expat.com.
              Connectez-vous sur la plateforme pour accéder à vos outils.
            </p>

            <a
              href="https://sos-expat.com/login"
              className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
            >
              Se connecter sur sos-expat.com
              <ExternalLink className="w-4 h-4" />
            </a>

            <p className="mt-6 text-sm text-gray-500">
              Pas encore prestataire ?{" "}
              <a
                href="https://sos-expat.com/devenir-prestataire"
                className="text-red-600 hover:text-red-700 font-medium"
              >
                Devenir prestataire
              </a>
            </p>
          </div>

          <p className="mt-8 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} SOS Expats. Tous droits réservés.
          </p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU: Erreur
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Erreur de connexion
          </h1>

          <p className="text-gray-600 mb-6">{errorMessage}</p>

          <div className="space-y-3">
            <a
              href="https://sos-expat.com/dashboard"
              className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
            >
              Retourner sur sos-expat.com
              <ExternalLink className="w-4 h-4" />
            </a>

            <a
              href="https://sos-expat.com/contact"
              className="block w-full px-6 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Contacter le support
            </a>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} SOS Expats. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
