/**
 * ============================================================================
 * ERROR PAGE - Page d'erreur pour les landing pages
 * ============================================================================
 */

import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home, RefreshCw, Phone } from 'lucide-react';

export interface ErrorPageProps {
  /** Message d'erreur technique */
  error?: Error | null;
  /** Titre à afficher */
  title?: string;
  /** Message utilisateur */
  message?: string;
  /** Fonction de retry */
  onRetry?: () => void;
  /** Code erreur (404, 500, etc.) */
  errorCode?: number;
}

/**
 * Page d'erreur élégante pour les landing pages
 * Design aligné sur SOS Expat
 */
export const ErrorPage = memo<ErrorPageProps>(({
  error,
  title = 'Page introuvable',
  message = 'Désolé, cette page n\'existe pas ou a été déplacée.',
  onRetry,
  errorCode = 404,
}) => {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* Error code */}
        <div className="relative mb-8">
          <span className="text-[150px] sm:text-[200px] font-black text-white/5 leading-none select-none">
            {errorCode}
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-6 rounded-full bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-sm">
              <AlertTriangle className="w-16 h-16 text-red-500" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-4">
          {title}
        </h1>

        {/* Message */}
        <p className="text-lg text-gray-400 mb-8 max-w-md mx-auto">
          {message}
        </p>

        {/* Error details (dev only) */}
        {error && process.env.NODE_ENV === 'development' && (
          <div className="mb-8 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-left">
            <p className="text-sm text-red-400 font-mono">
              {error.message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Retry button */}
          {onRetry && (
            <button
              onClick={onRetry}
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-red-500/30"
            >
              <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              Réessayer
            </button>
          )}

          {/* Home link */}
          <Link
            to="/"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-lg border border-white/20 hover:border-white/30 transition-all duration-300"
          >
            <Home className="w-5 h-5" />
            Retour à l'accueil
          </Link>
        </div>

        {/* Help CTA */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-gray-400 mb-4">
            Besoin d'aide urgente ?
          </p>
          <Link
            to="/sos-appel"
            className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 font-semibold transition-colors"
          >
            <Phone className="w-4 h-4" />
            Contactez un expert maintenant
          </Link>
        </div>
      </div>
    </div>
  );
});

ErrorPage.displayName = 'ErrorPage';
