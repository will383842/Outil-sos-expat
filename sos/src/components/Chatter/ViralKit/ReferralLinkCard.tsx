/**
 * ReferralLinkCard
 *
 * Displays referral link with copy button.
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, Copy, Check, ExternalLink } from "lucide-react";
import { useViralKit, formatReferralLink } from "@/hooks/useViralKit";
import { useTranslation } from "@/hooks/useTranslation";

interface ReferralLinkCardProps {
  variant?: "full" | "compact";
}

export function ReferralLinkCard({ variant = "full" }: ReferralLinkCardProps) {
  const { t } = useTranslation();
  const { referralLink, referralCode, copied, copyLink, copyCode } =
    useViralKit();

  if (!referralLink) {
    return null;
  }

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
        <Link className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        <span className="flex-1 text-sm font-mono truncate">
          {formatReferralLink(referralLink, 30)}
        </span>
        <Button size="sm" variant="outline" onClick={copyLink}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
      <div className="flex items-center gap-3 mb-4">
        <Link className="w-6 h-6" />
        <span className="font-bold">
          {t("chatter.referrals.yourReferralLink")}
        </span>
      </div>

      {/* Link input with quick copy */}
      <div className="flex items-center gap-2 bg-white/10 rounded-lg p-3 mb-4">
        <input
          type="text"
          readOnly
          value={referralLink}
          className="flex-1 bg-transparent text-white font-mono text-sm outline-none"
        />
        <button
          onClick={copyLink}
          className="bg-white text-purple-600 p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
          title={t("common.copy")}
        >
          {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <a
          href={referralLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-white text-purple-600 font-semibold py-3 px-4 rounded-lg hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
        >
          <ExternalLink className="w-5 h-5" />
          {t("chatter.referrals.previewLink", undefined, "Voir la page d'invitation")}
        </a>
        <button
          onClick={copyLink}
          className="flex-1 bg-white/20 backdrop-blur-sm text-white font-semibold py-3 px-4 rounded-lg hover:bg-white/30 transition-colors flex items-center justify-center gap-2"
        >
          {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          {copied ? t("common.copied", undefined, "Copié !") : t("common.copy", undefined, "Copier le lien")}
        </button>
      </div>

      {/* Referral Code */}
      <div className="bg-white/10 rounded-lg p-4">
        <label className="text-purple-100 text-xs font-medium mb-2 block">
          {t("chatter.referrals.codeLabel", undefined, "Votre code")}
        </label>
        <div className="flex gap-2">
          <div className="flex-1 px-4 py-2 bg-white/20 rounded-md font-mono text-xl text-white font-bold">
            {referralCode}
          </div>
          <button
            onClick={copyCode}
            className="bg-white text-purple-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Copy className="w-5 h-5" />
          </button>
        </div>
      </div>

      <p className="text-purple-100 text-sm mt-4">
        {t("chatter.referrals.shareLinkDesc", undefined, "Partagez ce lien pour inviter d'autres personnes et gagner des commissions.")}
      </p>
    </div>
  );
}
