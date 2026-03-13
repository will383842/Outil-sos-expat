/**
 * UnifiedAffiliateLink — Phase 8.1
 *
 * Single /r/CODE link with copy, native share, and QR code.
 * Replaces the 3-link pattern (client/recruitment/provider) with 1 universal link.
 */

import React, { useState, useCallback } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Copy, Check, Share2, QrCode, Link2 } from "lucide-react";
import { copyToClipboard } from "@/utils/clipboard";
import toast from "react-hot-toast";

interface UnifiedAffiliateLinkProps {
  code: string;
  className?: string;
}

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
};

const UnifiedAffiliateLink: React.FC<UnifiedAffiliateLinkProps> = ({ code, className = "" }) => {
  const intl = useIntl();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const shareUrl = `${window.location.origin}/r/${code}`;

  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopied(true);
      navigator.vibrate?.(50);
      toast.success(intl.formatMessage({ id: "unified.link.copied", defaultMessage: "Link copied!" }));
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error(intl.formatMessage({ id: "unified.link.copyError", defaultMessage: "Unable to copy" }));
    }
  }, [shareUrl, intl]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "SOS Expat",
          text: intl.formatMessage({
            id: "unified.link.shareText",
            defaultMessage: "Join SOS Expat with my referral link!",
          }),
          url: shareUrl,
        });
      } catch {
        // User cancelled share — not an error
      }
    } else {
      handleCopy();
    }
  }, [shareUrl, intl, handleCopy]);

  return (
    <div className={`${UI.card} p-4 sm:p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="w-5 h-5 text-indigo-500" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          <FormattedMessage id="unified.link.title" defaultMessage="Your referral link" />
        </h3>
      </div>

      {/* Code display */}
      <div className="mb-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
          <FormattedMessage id="unified.link.codeLabel" defaultMessage="Your code" />
        </p>
        <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 tracking-wider font-mono">
          {code}
        </p>
      </div>

      {/* URL display + actions */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 px-3 py-2 bg-gray-100 dark:bg-white/5 rounded-lg">
          <p className="text-sm font-mono text-gray-600 dark:text-gray-300 truncate">
            {shareUrl}
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 p-2.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
          title={intl.formatMessage({ id: "unified.link.copy", defaultMessage: "Copy" })}
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-600" />
          ) : (
            <Copy className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          )}
        </button>
        <button
          onClick={handleShare}
          className="flex-shrink-0 p-2.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
          title={intl.formatMessage({ id: "unified.link.share", defaultMessage: "Share" })}
        >
          <Share2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </button>
        <button
          onClick={() => setShowQR(!showQR)}
          className="flex-shrink-0 p-2.5 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
          title="QR Code"
        >
          <QrCode className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* QR Code (simple SVG-based) */}
      {showQR && (
        <div className="mt-3 p-4 bg-white rounded-xl flex flex-col items-center">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}&format=svg`}
            alt="QR Code"
            className="w-40 h-40"
            loading="lazy"
          />
          <p className="mt-2 text-xs text-gray-500">
            <FormattedMessage id="unified.link.scanQR" defaultMessage="Scan to join" />
          </p>
        </div>
      )}

      {/* Social share buttons (compact) */}
      <div className="mt-3 flex gap-2 flex-wrap">
        {[
          { name: "WhatsApp", url: `https://wa.me/?text=${encodeURIComponent(shareUrl)}`, color: "bg-green-500" },
          { name: "Telegram", url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`, color: "bg-blue-500" },
          { name: "Facebook", url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, color: "bg-blue-600" },
          { name: "X", url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`, color: "bg-gray-800" },
        ].map((platform) => (
          <a
            key={platform.name}
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${platform.color} text-white text-xs font-medium px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity`}
          >
            {platform.name}
          </a>
        ))}
      </div>
    </div>
  );
};

export default UnifiedAffiliateLink;
