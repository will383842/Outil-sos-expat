/**
 * =============================================================================
 * SUBSCRIPTION EXPIRED SCREEN - Ecran d'abonnement expire
 * =============================================================================
 * Affiche quand l'abonnement de l'utilisateur a expire
 */

import {
  Clock,
  CreditCard,
  AlertCircle,
  ExternalLink,
  Mail,
  Calendar,
  Shield,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface SubscriptionExpiredScreenProps {
  /** Date d'expiration de l'abonnement */
  expirationDate?: Date | string | null;
  /** Nombre de jours de grace restants (optionnel) */
  gracePeriodDays?: number;
  /** Email de l'utilisateur connecte */
  userEmail?: string | null;
  /** Type de prestataire */
  providerType?: "lawyer" | "expat" | null;
  /** Callback pour renouveler l'abonnement */
  onRenew?: () => void;
  /** Callback pour contacter le support */
  onContactSupport?: () => void;
  /** URL de renouvellement (si onRenew n'est pas fourni) */
  renewUrl?: string;
  /** URL de contact support (si onContactSupport n'est pas fourni) */
  supportUrl?: string;
}

// URL par defaut depuis les variables d'environnement
const DEFAULT_RENEW_URL = import.meta.env.VITE_SUBSCRIBE_URL || "https://sos-expat.com/subscribe";
const DEFAULT_SUPPORT_URL = import.meta.env.VITE_SUPPORT_URL || "https://sos-expat.com/contact";

/**
 * Formate une date en francais
 */
function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Calcule le nombre de jours depuis l'expiration
 */
function daysSinceExpiration(date: Date | string | null | undefined): number {
  if (!date) return 0;
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffTime = now.getTime() - d.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export default function SubscriptionExpiredScreen({
  expirationDate,
  gracePeriodDays,
  userEmail,
  providerType,
  onRenew,
  onContactSupport,
  renewUrl = DEFAULT_RENEW_URL,
  supportUrl = DEFAULT_SUPPORT_URL,
}: SubscriptionExpiredScreenProps) {
  const formattedExpirationDate = formatDate(expirationDate);
  const daysSince = daysSinceExpiration(expirationDate);
  const hasGracePeriod = gracePeriodDays !== undefined && gracePeriodDays > 0;
  const isInGracePeriod = hasGracePeriod && daysSince <= (gracePeriodDays || 0);

  const handleSignOut = () => {
    import("../../lib/firebase").then(({ auth }) => {
      auth.signOut().then(() => {
        window.location.href = "/auth";
      });
    });
  };

  const handleRenew = () => {
    if (onRenew) {
      onRenew();
    } else {
      const url = new URL(renewUrl);
      if (providerType) {
        url.searchParams.set("type", providerType);
      }
      url.searchParams.set("renewal", "true");
      window.open(url.toString(), "_blank", "noopener,noreferrer");
    }
  };

  const handleContactSupport = () => {
    if (onContactSupport) {
      onContactSupport();
    } else {
      window.open(supportUrl, "_blank", "noopener,noreferrer");
    }
  };

  // Configuration des couleurs selon l'etat
  const statusConfig = isInGracePeriod
    ? {
        iconBg: "bg-amber-100",
        iconColor: "text-amber-600",
        badgeBg: "bg-amber-100",
        badgeText: "text-amber-800",
        Icon: Clock,
      }
    : {
        iconBg: "bg-red-100",
        iconColor: "text-red-600",
        badgeBg: "bg-red-100",
        badgeText: "text-red-800",
        Icon: AlertCircle,
      };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-red-50 p-4">
      <div className="max-w-lg w-full">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            {/* Badge de statut */}
            <div className="flex justify-center mb-4">
              <span
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${statusConfig.badgeBg} ${statusConfig.badgeText}`}
              >
                <statusConfig.Icon className="w-4 h-4" aria-hidden="true" />
                {isInGracePeriod ? "Periode de grace" : "Abonnement expire"}
              </span>
            </div>

            {/* Icone principale */}
            <div
              className={`w-20 h-20 ${statusConfig.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}
            >
              <CreditCard className={`w-10 h-10 ${statusConfig.iconColor}`} aria-hidden="true" />
            </div>

            <CardTitle className="text-2xl font-bold text-gray-900">
              {isInGracePeriod
                ? "Votre abonnement a expire"
                : "Acces suspendu"}
            </CardTitle>

            <CardDescription className="text-gray-600 mt-2">
              {isInGracePeriod
                ? `Vous disposez encore de ${gracePeriodDays! - daysSince} jours pour renouveler votre abonnement sans interruption de service.`
                : "Votre abonnement a expire. Renouvelez maintenant pour retrouver l'acces a l'assistant IA."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Info d'expiration */}
            {formattedExpirationDate && (
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
                <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-gray-600" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Date d'expiration</p>
                  <p className="font-semibold text-gray-900">{formattedExpirationDate}</p>
                </div>
                {daysSince > 0 && (
                  <span className="text-sm text-gray-500">
                    il y a {daysSince} jour{daysSince > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            )}

            {/* Periode de grace */}
            {isInGracePeriod && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-amber-600" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium text-amber-900">Periode de grace active</p>
                  <p className="text-sm text-amber-700">
                    {gracePeriodDays! - daysSince} jours restants pour renouveler
                  </p>
                </div>
              </div>
            )}

            {/* Avantages de l'abonnement */}
            <div className="bg-gradient-to-r from-red-50 to-amber-50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-red-600" aria-hidden="true" />
                <span className="font-medium text-gray-900">Ce que vous retrouverez</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" aria-hidden="true" />
                  Assistant IA en temps reel
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" aria-hidden="true" />
                  Acces aux donnees de 190+ pays
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" aria-hidden="true" />
                  Sources juridiques verifiees
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <Button
                variant="sos"
                size="lg"
                className="w-full rounded-xl"
                onClick={handleRenew}
              >
                <CreditCard className="w-5 h-5" aria-hidden="true" />
                Renouveler mon abonnement
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="w-full rounded-xl"
                onClick={handleContactSupport}
              >
                <Mail className="w-5 h-5" aria-hidden="true" />
                Contacter le support
              </Button>

              <button
                onClick={handleSignOut}
                className="block w-full text-gray-500 py-2 text-sm hover:text-gray-700 transition-colors"
              >
                Se deconnecter
              </button>
            </div>

            {/* Info utilisateur */}
            {userEmail && (
              <p className="text-center text-xs text-gray-400 pt-2">
                Connecte en tant que {userEmail}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Copyright */}
        <p className="mt-8 text-center text-xs text-gray-400">
          {new Date().getFullYear()} SOS Expats. Tous droits reserves.
        </p>
      </div>
    </div>
  );
}
