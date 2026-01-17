/**
 * =============================================================================
 * AUTH SSO - Page d'authentification automatique via Custom Token
 * =============================================================================
 *
 * Cette page reçoit un Custom Token Firebase depuis Laravel (sos-expat.com)
 * et connecte automatiquement l'utilisateur.
 *
 * URL: /auth?token=xxx
 * URL: /auth?token=xxx&providerId=yyy (optionnel pour auto-sélection)
 *
 * Flux:
 * 1. Vérifie si l'utilisateur est déjà connecté → redirige vers dashboard
 * 2. Récupère le token depuis l'URL
 * 3. Appelle signInWithCustomToken(token)
 * 4. Extrait les claims (role, providerId) pour déterminer la destination
 * 5. Redirige vers /dashboard (prestataires) ou /admin (admins)
 *
 * CONSOLIDATION: Cette page gère tous les cas d'authentification
 * - Token valide → connexion + redirection intelligente
 * - Déjà connecté sans token → redirection vers le bon dashboard
 * - Pas de token et pas connecté → écran d'information
 *
 * =============================================================================
 */

import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { signInWithCustomToken, onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { Loader2, AlertCircle, ExternalLink } from "lucide-react";

type AuthStatus = "loading" | "checking_auth" | "success" | "error" | "no_token";

// Clé pour stocker le providerId dans sessionStorage (partagé avec UnifiedUserContext)
const SSO_PROVIDER_ID_KEY = "sso_providerId";
const SSO_REDIRECT_TARGET_KEY = "sso_redirect_target";

export default function AuthSSO() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<AuthStatus>("checking_auth");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const authCheckDone = useRef(false);

  // Stocker le token et providerId au montage (avant nettoyage URL)
  const tokenRef = useRef<string | null>(searchParams.get("token"));
  const providerIdRef = useRef<string | null>(searchParams.get("providerId"));

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTAPE 1: Vérifier si l'utilisateur est déjà connecté
  // IMPORTANT: Même avec un token, si déjà connecté → rediriger directement
  // Cela évite les erreurs de token invalide/expiré lors des retours
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (authCheckDone.current) return;

    const token = tokenRef.current;
    const providerIdParam = providerIdRef.current;

    // Nettoyer l'URL immédiatement si token présent (sécurité)
    if (token) {
      window.history.replaceState({}, document.title, "/auth");
    }

    // TOUJOURS vérifier d'abord si l'utilisateur est déjà connecté
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (authCheckDone.current) return;
      authCheckDone.current = true;

      if (user) {
        // ─────────────────────────────────────────────────────────────────────
        // UTILISATEUR DÉJÀ CONNECTÉ → Rediriger directement (ignorer le token)
        // Le token SSO n'est utile que pour la première connexion
        // ─────────────────────────────────────────────────────────────────────
        console.debug("[AuthSSO] Utilisateur déjà connecté, redirection directe...");

        try {
          const tokenResult = await user.getIdTokenResult();
          const isAdmin = tokenResult.claims.admin === true || tokenResult.claims.role === "admin";

          // Stocker le providerId si fourni en paramètre (pour changer de provider)
          if (providerIdParam) {
            sessionStorage.setItem(SSO_PROVIDER_ID_KEY, providerIdParam);
          }

          // Rediriger vers le bon dashboard
          const destination = isAdmin ? "/admin" : "/dashboard";
          navigate(destination, { replace: true });
        } catch (err) {
          console.error("[AuthSSO] Erreur lors de la vérification des claims:", err);
          navigate("/dashboard", { replace: true });
        }
      } else if (token) {
        // ─────────────────────────────────────────────────────────────────────
        // PAS CONNECTÉ + TOKEN → Authentifier avec le token
        // ─────────────────────────────────────────────────────────────────────
        console.debug("[AuthSSO] Pas connecté, authentification avec token...");
        setStatus("loading");
      } else {
        // ─────────────────────────────────────────────────────────────────────
        // PAS CONNECTÉ + PAS DE TOKEN → Écran d'information
        // ─────────────────────────────────────────────────────────────────────
        setStatus("no_token");
      }

      unsubscribe();
    });

    return () => unsubscribe();
  }, [navigate]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTAPE 2: Authentification avec le Custom Token
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (status !== "loading") return;

    // Utiliser les refs (le token a été stocké avant le nettoyage de l'URL)
    const token = tokenRef.current;
    const providerIdParam = providerIdRef.current;

    if (!token) {
      setStatus("no_token");
      return;
    }

    // Stocker le token dans une variable locale typée pour TypeScript
    const validToken: string = token;

    // Authentification avec le Custom Token
    async function authenticateWithToken() {
      try {
        const userCredential = await signInWithCustomToken(auth, validToken);
        const user = userCredential.user;

        setStatus("success");

        // ─────────────────────────────────────────────────────────────────────
        // EXTRACTION DES CLAIMS pour déterminer la destination
        // ─────────────────────────────────────────────────────────────────────
        let isAdmin = false;
        let claimProviderId: string | null = null;

        try {
          const tokenResult = await user.getIdTokenResult();

          // Vérifier si admin
          isAdmin = tokenResult.claims.admin === true ||
                    tokenResult.claims.role === "admin" ||
                    tokenResult.claims.role === "superadmin";

          // Récupérer le providerId depuis les claims ou le paramètre URL
          claimProviderId = (tokenResult.claims.providerId as string) || providerIdParam || null;

          console.debug("[AuthSSO] Claims extraits:", {
            isAdmin,
            role: tokenResult.claims.role,
            providerId: claimProviderId,
          });
        } catch (claimError) {
          console.warn("[AuthSSO] Impossible de lire les claims:", claimError);
        }

        // ─────────────────────────────────────────────────────────────────────
        // STOCKER LE PROVIDER ID pour auto-sélection dans UnifiedUserContext
        // ─────────────────────────────────────────────────────────────────────
        if (claimProviderId) {
          sessionStorage.setItem(SSO_PROVIDER_ID_KEY, claimProviderId);
          console.debug("[AuthSSO] ProviderId stocké pour auto-sélection:", claimProviderId);
        }

        // ─────────────────────────────────────────────────────────────────────
        // REDIRECTION INTELLIGENTE
        // - Admin → /admin
        // - Prestataire → /dashboard
        // ─────────────────────────────────────────────────────────────────────
        const destination = isAdmin ? "/admin" : "/dashboard";

        // Stocker la destination pour fallback
        sessionStorage.setItem(SSO_REDIRECT_TARGET_KEY, destination);

        setTimeout(() => {
          navigate(destination, { replace: true });
        }, 500);

      } catch (error: unknown) {
        const firebaseError = error as { code?: string; message?: string };
        setStatus("error");

        // Messages d'erreur explicites
        if (firebaseError.code === "auth/invalid-custom-token") {
          setErrorMessage("Le lien d'accès est invalide ou a expiré. Veuillez réessayer depuis sos-expat.com.");
        } else if (firebaseError.code === "auth/custom-token-mismatch") {
          setErrorMessage("Erreur de configuration. Contactez le support.");
        } else if (firebaseError.code === "auth/network-request-failed") {
          setErrorMessage("Erreur de connexion. Vérifiez votre connexion internet.");
        } else {
          setErrorMessage("Une erreur est survenue. Veuillez réessayer.");
        }

        console.error("[AuthSSO] Erreur d'authentification:", firebaseError);
      }
    }

    authenticateWithToken();
  }, [status, navigate]);

  // Nettoyage: supprimer le token de la mémoire au démontage
  useEffect(() => {
    return () => {
      // Force un cleanup de l'URL au cas où
      if (window.location.search.includes("token")) {
        window.history.replaceState({}, document.title, "/auth");
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Checking auth (vérification si déjà connecté)
  // ─────────────────────────────────────────────────────────────────────────
  if (status === "checking_auth") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
            <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Vérification de votre session...
          </h1>
          <p className="text-gray-600">
            Un instant, nous vérifions votre accès.
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Loading (connexion avec token)
  // ─────────────────────────────────────────────────────────────────────────
  if (status === "loading") {
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

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Success (brief, then redirect)
  // ─────────────────────────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Connecté !
          </h1>
          <p className="text-gray-600">
            Redirection vers votre espace...
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: No Token
  // ─────────────────────────────────────────────────────────────────────────
  if (status === "no_token") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            {/* Logo */}
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

            {/* Bouton principal */}
            <a
              href="https://sos-expat.com/login"
              className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
            >
              Se connecter sur sos-expat.com
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Lien secondaire */}
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

          {/* Copyright */}
          <p className="mt-8 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} SOS Expats. Tous droits réservés.
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Error
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icône erreur */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Erreur de connexion
          </h1>

          <p className="text-gray-600 mb-6">
            {errorMessage}
          </p>

          {/* Actions */}
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

        {/* Copyright */}
        <p className="mt-8 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} SOS Expats. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
