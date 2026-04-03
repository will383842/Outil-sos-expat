/**
 * InfluencerQRCodeCard
 *
 * QR code du lien d'affiliation influenceur.
 * Téléchargeable en PNG. Thème red/rose cohérent avec le design system Influencer.
 */

import React, { useRef, useCallback, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { QrCode, Download, Copy, CheckCircle2 } from 'lucide-react';
import { FormattedMessage } from 'react-intl';

interface InfluencerQRCodeCardProps {
  shareUrl: string;
  affiliateCode: string;
  size?: number;
}

const InfluencerQRCodeCard: React.FC<InfluencerQRCodeCardProps> = ({
  shareUrl,
  affiliateCode,
  size = 180,
}) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const handleDownload = useCallback(() => {
    if (!qrRef.current) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `sos-expat-influencer-${affiliateCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [affiliateCode]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback silent
    }
  }, [shareUrl]);

  if (!shareUrl) return null;

  return (
    <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center">
          <QrCode className="h-4 w-4 text-red-500 dark:text-red-400" />
        </div>
        <h3 className="font-semibold text-slate-900 dark:text-white">
          <FormattedMessage id="influencer.qrcode.title" defaultMessage="QR Code d'affiliation" />
        </h3>
      </div>

      <div className="flex flex-col items-center space-y-4">
        {/* QR Code */}
        <div
          ref={qrRef}
          className="bg-white p-4 rounded-xl border border-slate-200/60 dark:border-white/10 shadow-sm"
        >
          <QRCodeCanvas
            value={shareUrl}
            size={size}
            level="M"
            includeMargin={false}
            bgColor="#ffffff"
            fgColor="#7f1d1d"
          />
        </div>

        {/* Code display */}
        <div className="text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <FormattedMessage id="influencer.qrcode.scan" defaultMessage="Scanner pour rejoindre via votre lien" />
          </p>
          <p className="font-mono text-base font-bold text-slate-900 dark:text-white mt-1 tracking-wider">
            {affiliateCode}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 w-full">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm transition-all active:scale-[0.98]"
          >
            {copied ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied
              ? <FormattedMessage id="common.copied" defaultMessage="Copié !" />
              : <FormattedMessage id="influencer.qrcode.copyLink" defaultMessage="Copier le lien" />
            }
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-medium text-sm transition-all active:scale-[0.98]"
          >
            <Download className="h-4 w-4" />
            <FormattedMessage id="influencer.qrcode.download" defaultMessage="Télécharger" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfluencerQRCodeCard;
