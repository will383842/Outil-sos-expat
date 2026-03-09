/**
 * QRCodeDisplay — 2026 Design System
 *
 * QR code for referral link with download option.
 * Glassmorphism card with indigo/violet accents.
 */

import React, { useState } from "react";
import { QrCode, Download, Loader2 } from "lucide-react";
import { useViralKit } from "@/hooks/useViralKit";
import { useTranslation } from "@/hooks/useTranslation";
import { UI, SPACING, ANIMATION } from "@/components/Chatter/designTokens";

interface QRCodeDisplayProps {
  size?: number;
  showDownload?: boolean;
}

export function QRCodeDisplay({
  size = 200,
  showDownload = true,
}: QRCodeDisplayProps) {
  const { t } = useTranslation();
  const { generateQRCode, referralCode } = useViralKit();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const qrCodeUrl = generateQRCode();

  const handleDownload = async () => {
    if (!qrCodeUrl) return;

    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sos-expat-referral-${referralCode}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download QR code:", error);
    }
  };

  if (!qrCodeUrl) {
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
        {/* QR Code */}
        <div
          className="relative bg-white p-4 rounded-xl border border-slate-200/60 dark:border-white/10 shadow-sm"
          style={{ width: size + 32, height: size + 32 }}
        >
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          )}

          {imageError ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              <QrCode className="h-12 w-12" />
            </div>
          ) : (
            <img
              src={qrCodeUrl}
              alt="QR Code"
              width={size}
              height={size}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className={`transition-opacity ${ANIMATION.normal} ${imageLoaded ? "opacity-100" : "opacity-0"}`}
            />
          )}
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
}

/**
 * Compact QR code display
 */
export function QRCodeCompact({ size = 100 }: { size?: number }) {
  const { generateQRCode } = useViralKit();
  const qrCodeUrl = generateQRCode();

  if (!qrCodeUrl) return null;

  return (
    <div className="bg-white p-2 rounded-xl border border-slate-200/60 dark:border-white/10 inline-block shadow-sm">
      <img src={qrCodeUrl} alt="QR Code" width={size} height={size} />
    </div>
  );
}
