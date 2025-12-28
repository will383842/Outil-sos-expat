/**
 * =============================================================================
 * AUTH SSO - Page d'authentification automatique via Custom Token
 * =============================================================================
 *
 * Cette page reçoit un Custom Token Firebase depuis Laravel (sos-expat.com)
 * et connecte automatiquement l'utilisateur.
 *
 * URL: /auth?token=xxx
 *
 * Flux:
 * 1. Récupère le token depuis l'URL
 * 2. Appelle signInWithCustomToken(token)
 * 3. Redirige vers /admin si succès
 * 4. Affiche erreur sinon
 *
 * =============================================================================
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "../lib/firebase";
import { Loader2, AlertCircle, ExternalLink } from "lucide-react";

type AuthStatus = "loading" | "success" | "error" | "no_token";

export default function AuthSSO() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const token = searchParams.get("token");

    // SÉCURITÉ: Nettoyer immédiatement l'URL pour éviter que le token reste dans l'historique
    if (token) {
      window.history.replaceState({}, document.title, "/auth");
    }

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

        setStatus("success");

        // Déterminer la destination en fonction du rôle (depuis les claims du token)
        let destination = "/dashboard"; // Par défaut: dashboard prestataire

        try {
          const tokenResult = await userCredential.user.getIdTokenResult();
          const claims = tokenResult.claims;

          if (import.meta.env.DEV) {
            console.debug("[AuthSSO] Token claims:", claims);
          }

          // Admin va vers /admin, prestataires vers /dashboard
          if (claims.admin === true || claims.role === "admin" || claims.role === "superadmin") {
            destination = "/admin";
          }
        } catch (claimError) {
          console.warn("[AuthSSO] Could not read claims, defaulting to /dashboard");
        }

        // Rediriger vers la bonne destination
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
      }
    }

    authenticateWithToken();
  }, [searchParams, navigate]);

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
  // RENDER: Loading
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
