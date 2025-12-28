/**
 * =============================================================================
 * BLOCKED SCREEN - Écran de blocage réutilisable
 * =============================================================================
 */

import { ExternalLink } from "lucide-react";

export interface BlockedScreenProps {
  icon: "lock" | "shield" | "user";
  title: string;
  description: string;
  primaryAction: { label: string; href: string };
  secondaryAction: { label: string; href: string };
  userEmail: string | null;
}

const iconConfig = {
  lock: {
    bg: "bg-amber-100",
    color: "text-amber-600",
    path: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  },
  shield: {
    bg: "bg-red-100",
    color: "text-red-600",
    path: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
  user: {
    bg: "bg-gray-100",
    color: "text-gray-600",
    path: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  },
};

export default function BlockedScreen({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  userEmail,
}: BlockedScreenProps) {
  const config = iconConfig[icon];

  const handleSignOut = () => {
    import("../../lib/firebase").then(({ auth }) => {
      auth.signOut().then(() => {
        window.location.href = "/auth";
      });
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icone */}
          <div
            className={`w-20 h-20 ${config.bg} rounded-full flex items-center justify-center mx-auto mb-6`}
          >
            <svg
              className={`w-10 h-10 ${config.color}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={config.path}
              />
            </svg>
          </div>

          {/* Titre */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>

          {/* Description */}
          <p className="text-gray-600 mb-8">{description}</p>

          {/* Actions */}
          <div className="space-y-3">
            <a
              href={primaryAction.href}
              className="flex items-center justify-center gap-2 w-full bg-red-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-red-700 transition-colors"
            >
              {primaryAction.label}
              <ExternalLink className="w-4 h-4" />
            </a>

            <a
              href={secondaryAction.href}
              className="block w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              {secondaryAction.label}
            </a>

            <button
              onClick={handleSignOut}
              className="block w-full text-gray-500 py-2 text-sm hover:text-gray-700 transition-colors"
            >
              Se deconnecter
            </button>
          </div>

          {/* Info utilisateur */}
          {userEmail && (
            <p className="mt-6 text-xs text-gray-400">
              Connecte en tant que {userEmail}
            </p>
          )}
        </div>

        {/* Copyright */}
        <p className="mt-8 text-center text-xs text-gray-400">
          {new Date().getFullYear()} SOS Expats. Tous droits reserves.
        </p>
      </div>
    </div>
  );
}
