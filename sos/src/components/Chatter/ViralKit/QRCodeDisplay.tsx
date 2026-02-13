/**
 * QRCodeDisplay
 *
 * QR code for referral link with download option.
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Download, Loader2 } from "lucide-react";
import { useViralKit } from "@/hooks/useViralKit";
import { useTranslation } from "@/hooks/useTranslation";

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          {t("chatter.referrals.qrCode")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center space-y-4">
        {/* QR Code */}
        <div
          className="relative bg-white p-4 rounded-lg border"
          style={{ width: size + 32, height: size + 32 }}
        >
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-600 dark:text-gray-400" />
            </div>
          )}

          {imageError ? (
            <div className="flex items-center justify-center h-full text-gray-600 dark:text-gray-400">
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
              className={imageLoaded ? "opacity-100" : "opacity-0"}
            />
          )}
        </div>

        {/* Code display */}
        <div className="text-center">
          <p className="text-sm">
            {t("chatter.referrals.scanToJoin")}
          </p>
          <p className="font-mono text-lg mt-1">{referralCode}</p>
        </div>

        {/* Download button */}
        {showDownload && (
          <Button variant="outline" onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" />
            {t("chatter.referrals.downloadQR")}
          </Button>
        )}
      </CardContent>
    </Card>
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
    <div className="bg-white p-2 rounded border inline-block">
      <img src={qrCodeUrl} alt="QR Code" width={size} height={size} />
    </div>
  );
}
