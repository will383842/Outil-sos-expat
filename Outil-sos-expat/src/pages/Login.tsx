/**
 * =============================================================================
 * PAGE LOGIN — Connexion Admin & Prestataires
 * 
 * Supporte :
 * - Connexion Google (recommandé pour les prestataires)
 * - Connexion Email/Password (pour les admins)
 * =============================================================================
 */

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth } from "../contexts/UnifiedUserContext";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2, AlertCircle } from "lucide-react";

export default function Login() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Si déjà connecté, rediriger vers l'admin
  // ─────────────────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-sm w-full mx-4 p-8 rounded-2xl shadow-lg bg-white text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-gray-600 mb-1">Connecté en tant que</p>
            <p className="font-semibold text-gray-900">{user.email}</p>
          </div>
          <button 
            onClick={() => navigate('/admin')} 
            className="w-full px-4 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
          >
            Accéder au tableau de bord
          </button>
          <button 
            onClick={() => auth.signOut()} 
            className="w-full px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Connexion Email/Password
  // ─────────────────────────────────────────────────────────────────────────
  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/admin");
    } catch (err: any) {
      console.error("Erreur connexion:", err);
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Email ou mot de passe incorrect");
      } else if (err.code === "auth/invalid-email") {
        setError("Adresse email invalide");
      } else if (err.code === "auth/too-many-requests") {
        setError("Trop de tentatives. Réessayez plus tard.");
      } else {
        setError("Erreur de connexion. Réessayez.");
      }
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Connexion Google
  // ─────────────────────────────────────────────────────────────────────────
  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError(null);
    
    try {
      await signInWithGoogle();
      navigate("/admin");
    } catch (err: any) {
      console.error("Erreur Google:", err);
      if (err.code === "auth/popup-closed-by-user") {
        // L'utilisateur a fermé la popup, pas besoin d'afficher une erreur
      } else if (err.code === "auth/popup-blocked") {
        setError("Popup bloquée. Autorisez les popups pour ce site.");
      } else {
        setError("Erreur de connexion Google. Réessayez.");
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-sm w-full">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-2xl font-bold text-white">S</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SOS Expats</h1>
          <p className="text-gray-600 mt-1">Espace Prestataires</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Erreur */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Bouton Google - En premier car c'est le plus simple */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            <span className="font-medium text-gray-700">
              {googleLoading ? "Connexion..." : "Continuer avec Google"}
            </span>
          </button>

          {/* Séparateur */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">ou</span>
            </div>
          </div>

          {/* Formulaire Email/Password */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full px-4 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connexion...
                </>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Besoin d'un accès ?{" "}
            <a href="mailto:contact@sos-expat.com" className="text-red-600 hover:text-red-700 font-medium">
              Contactez-nous
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
