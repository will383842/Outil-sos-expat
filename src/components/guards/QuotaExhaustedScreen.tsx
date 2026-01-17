/**
 * =============================================================================
 * QUOTA EXHAUSTED SCREEN - Ecran de quota AI epuise
 * =============================================================================
 * Affiche quand l'utilisateur a epuise son quota d'utilisation de l'IA
 */

import { AlertTriangle, Calendar, Gauge, ArrowUpCircle, Mail, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "../../hooks/useLanguage";

export interface QuotaExhaustedScreenProps {
  /** Nombre de requetes utilisees */
  quotaUsed: number;
  /** Limite totale du quota */
  quotaLimit: number;
  /** Date de renouvellement du quota (optionnel) */
  renewalDate?: Date | string | null;
  /** Email de l'utilisateur connecte */
  userEmail?: string | null;
  /** Callback pour upgrader l'abonnement */
  onUpgrade?: () => void;
  /** Callback pour contacter le support */
  onContactSupport?: () => void;
  /** URL d'upgrade (si onUpgrade n'est pas fourni) */
  upgradeUrl?: string;
  /** URL de contact support (si onContactSupport n'est pas fourni) */
  supportUrl?: string;
}

// URL par defaut depuis les variables d'environnement
const DEFAULT_UPGRADE_URL = import.meta.env.VITE_UPGRADE_URL || "https://sos-expat.com/upgrade";
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
 * Calcule le pourcentage d'utilisation du quota
 */
function calculatePercentage(used: number, limit: number): number {
  if (limit <= 0) return 100;
  return Math.min(Math.round((used / limit) * 100), 100);
}

export default function QuotaExhaustedScreen({
  quotaUsed,
  quotaLimit,
  renewalDate,
  userEmail,
  onUpgrade,
  onContactSupport,
  upgradeUrl = DEFAULT_UPGRADE_URL,
  supportUrl = DEFAULT_SUPPORT_URL,
}: QuotaExhaustedScreenProps) {
  const { t } = useLanguage({ mode: "provider" });
  const percentage = calculatePercentage(quotaUsed, quotaLimit);
  const formattedRenewalDate = formatDate(renewalDate);

  const handleSignOut = () => {
    import("../../lib/firebase").then(({ auth }) => {
      auth.signOut().then(() => {
        window.location.href = "/auth";
      });
    });
  };

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      window.open(upgradeUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleContactSupport = () => {
    if (onContactSupport) {
      onContactSupport();
    } else {
      window.open(supportUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-amber-50 p-4">
      <div className="max-w-lg w-full">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            {/* Icone d'alerte */}
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-10 h-10 text-amber-600" aria-hidden="true" />
            </div>

            <CardTitle className="text-2xl font-bold text-gray-900">
              {t("provider:quotaExhausted.title")}
            </CardTitle>

            <CardDescription className="text-gray-600 mt-2">
              {t("provider:quotaExhausted.description")}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Jauge de quota */}
            <div
              className="bg-gray-50 rounded-xl p-5"
              role="region"
              aria-label={t("provider:quotaExhausted.quotaUsage")}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-gray-700">
                  <Gauge className="w-5 h-5" aria-hidden="true" />
                  <span className="font-medium">{t("provider:quotaExhausted.quotaUsage")}</span>
                </div>
                <span className="text-sm font-semibold text-amber-600">
                  {percentage}%
                </span>
              </div>

              {/* Barre de progression */}
              <div
                className="w-full bg-gray-200 rounded-full h-3 mb-3"
                role="progressbar"
                aria-valuenow={percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${quotaUsed} ${t("provider:quotaExhausted.outOf")} ${quotaLimit}`}
              >
                <div
                  className="bg-amber-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  <span className="font-semibold text-gray-900">{quotaUsed.toLocaleString()}</span> {t("provider:quotaExhausted.requestsUsed")}
                </span>
                <span className="text-gray-500">
                  {t("provider:quotaExhausted.outOf")} {quotaLimit.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Date de renouvellement */}
            {formattedRenewalDate && (
              <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-4">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t("provider:quotaExhausted.nextRenewal")}</p>
                  <p className="font-semibold text-gray-900">{formattedRenewalDate}</p>
                </div>
                <div className="ml-auto">
                  <RefreshCw className="w-5 h-5 text-blue-400" aria-hidden="true" />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <Button
                variant="sos"
                size="lg"
                className="w-full rounded-xl"
                onClick={handleUpgrade}
              >
                <ArrowUpCircle className="w-5 h-5" aria-hidden="true" />
                {t("provider:quotaExhausted.increaseQuota")}
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="w-full rounded-xl"
                onClick={handleContactSupport}
              >
                <Mail className="w-5 h-5" aria-hidden="true" />
                {t("provider:quotaExhausted.contactSupport")}
              </Button>

              <button
                onClick={handleSignOut}
                className="block w-full text-gray-500 py-2 text-sm hover:text-gray-700 transition-colors"
              >
                {t("provider:quotaExhausted.signOut")}
              </button>
            </div>

            {/* Info utilisateur */}
            {userEmail && (
              <p className="text-center text-xs text-gray-400 pt-2">
                {t("provider:quotaExhausted.connectedAs")} {userEmail}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Copyright */}
        <p className="mt-8 text-center text-xs text-gray-400">
          {new Date().getFullYear()} SOS Expats. {t("common:allRightsReserved")}
        </p>
      </div>
    </div>
  );
}
