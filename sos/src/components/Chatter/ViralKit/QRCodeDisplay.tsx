/**
 * QRCodeDisplay — 2026 Design System
 *
 * QR code generated client-side with qrcode.react.
 * Downloadable as PNG. Glassmorphism card with indigo/violet accents.
 */

import React, { useRef, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { QrCode, Download } from "lucide-react";
import { useViralKit } from "@/hooks/useViralKit";
import { useTranslation } from "@/hooks/useTranslation";
import { UI, SPACING, ANIMATION } from "@/components/Chatter/designTokens";

interface QRCodeDisplayProps {
  size?: number;
  showDownload?: boolean;
}

export const QRCodeDisplay = React.memo(function QRCodeDisplay({
  size = 200,
  showDownload = true,
}: QRCodeDisplayProps) {
  const { t } = useTranslation();
  const { referralLink, referralCode } = useViralKit();
  const qrRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(() => {
    if (!qrRef.current) return;
    const canvas = qrRef.current.querySelector("canvas");
    if (!canvas) return;

    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `sos-expat-referral-${referralCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [referralCode]);

  if (!referralLink) {
    return null;
  }

  return (
    <div className={`${UI.card} ${SPACING.cardPadding} space-y-4`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center">
          <QrCode className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
        </div>
        <h3 className="font-semibold text-slate-900 dark:text-white">
          {t("chatter.referrals.qrCode")}
        </h3>
      </div>

      <div className="flex flex-col items-center space-y-4">
        {/* QR Code — rendered client-side */}
        <div
          ref={qrRef}
          className="bg-white p-4 rounded-xl border border-slate-200/60 dark:border-white/10 shadow-sm"
        >
          <QRCodeCanvas
            value={referralLink}
            size={size}
            level="M"
            includeMargin={false}
            bgColor="#ffffff"
            fgColor="#1e1b4b"
          />
        </div>

        {/* Code display */}
        <div className="text-center">
          <p className={UI.textSecondary + " text-sm"}>
            {t("chatter.referrals.scanToJoin")}
          </p>
          <p className="font-mono text-lg font-bold text-slate-900 dark:text-white mt-1">
            {referralCode}
          </p>
        </div>

        {/* Download button */}
        {showDownload && (
          <button
            onClick={handleDownload}
            className={`${UI.button.secondary} px-4 py-2.5 flex items-center gap-2 ${SPACING.touchTarget}`}
          >
            <Download className="h-4 w-4" />
            {t("chatter.referrals.downloadQR")}
          </button>
        )}
      </div>
    </div>
  );
});

/**
 * Compact QR code display
 */
export const QRCodeCompact = React.memo(function QRCodeCompact({ size = 100 }: { size?: number }) {
  const { referralLink } = useViralKit();

  if (!referralLink) return null;

  return (
    <div className="bg-white p-2 rounded-xl border border-slate-200/60 dark:border-white/10 inline-block shadow-sm">
      <QRCodeCanvas
        value={referralLink}
        size={size}
        level="M"
        includeMargin={false}
        bgColor="#ffffff"
        fgColor="#1e1b4b"
      />
    </div>
  );
});
