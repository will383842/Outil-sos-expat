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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          {t("chatter.referrals.yourReferralLink")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Full link */}
        <div>
          <label className="text-sm font-medium mb-1 block">
            {t("chatter.referrals.linkLabel")}
          </label>
          <div className="flex gap-2">
            <Input
              value={referralLink}
              readOnly
              className="font-mono text-sm flex-1"
            />
            <Button
              variant={copied ? "default" : "outline"}
              onClick={copyLink}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  {t("common.copied")}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  {t("common.copy")}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Code only */}
        <div>
          <label className="text-sm font-medium mb-1 block">
            {t("chatter.referrals.codeLabel")}
          </label>
          <div className="flex gap-2">
            <div className="flex-1 px-4 py-2 bg-gray-100 rounded-md font-mono text-lg">
              {referralCode}
            </div>
            <Button variant="outline" onClick={copyCode}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Open link */}
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => window.open(referralLink, "_blank")}
        >
          <ExternalLink className="h-4 w-4" />
          {t("chatter.referrals.previewLink")}
        </Button>
      </CardContent>
    </Card>
  );
}
