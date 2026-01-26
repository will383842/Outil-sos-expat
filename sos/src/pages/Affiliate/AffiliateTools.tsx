/**
 * AffiliateTools - Marketing tools for affiliates
 * UTM link builder, QR code generator, social share buttons
 */

import React, { useState, useMemo, useCallback } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  Link2,
  Copy,
  Download,
  Share2,
  QrCode,
  ExternalLink,
  CheckCircle,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Megaphone,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAffiliate } from "@/hooks/useAffiliate";
import DashboardLayout from "@/components/layout/DashboardLayout";

// Design tokens (matching AffiliateDashboard)
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  cardHover: "hover:shadow-xl transition-shadow duration-300",
  button: {
    primary: "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    outline: "border border-gray-200 dark:border-white/20 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 dark:text-white placeholder-gray-400",
  select: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 dark:text-white",
  label: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5",
} as const;

// UTM parameters options
const UTM_SOURCES = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "Twitter/X" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telegram", label: "Telegram" },
  { value: "email", label: "Email" },
  { value: "blog", label: "Blog" },
  { value: "website", label: "Website" },
  { value: "other", label: "Autre" },
];

const UTM_MEDIUMS = [
  { value: "social", label: "Social" },
  { value: "paid", label: "Publicité payante" },
  { value: "organic", label: "Organique" },
  { value: "email", label: "Email" },
  { value: "referral", label: "Referral" },
  { value: "cpc", label: "CPC" },
  { value: "banner", label: "Bannière" },
  { value: "video", label: "Vidéo" },
  { value: "other", label: "Autre" },
];

const CAMPAIGN_TEMPLATES = [
  { id: "launch", name: "Lancement produit", utm_campaign: "launch_2024" },
  { id: "promo", name: "Promotion", utm_campaign: "promo_special" },
  { id: "newsletter", name: "Newsletter", utm_campaign: "newsletter" },
  { id: "influencer", name: "Influenceur", utm_campaign: "influencer_collab" },
  { id: "seasonal", name: "Saisonnière", utm_campaign: "seasonal_offer" },
];

interface UTMParams {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
}

const AffiliateTools: React.FC = () => {
  const intl = useIntl();
  const { affiliateData, shareUrl } = useAffiliate();

  // UTM Builder state
  const [utmParams, setUtmParams] = useState<UTMParams>({
    source: "",
    medium: "",
    campaign: "",
    content: "",
    term: "",
  });
  const [showAdvancedUTM, setShowAdvancedUTM] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [qrSize, setQrSize] = useState(200);

  // Generate UTM link
  const utmLink = useMemo(() => {
    if (!shareUrl) return "";

    const params = new URLSearchParams();
    if (utmParams.source) params.append("utm_source", utmParams.source);
    if (utmParams.medium) params.append("utm_medium", utmParams.medium);
    if (utmParams.campaign) params.append("utm_campaign", utmParams.campaign);
    if (utmParams.content) params.append("utm_content", utmParams.content);
    if (utmParams.term) params.append("utm_term", utmParams.term);

    const queryString = params.toString();
    return queryString ? `${shareUrl}${shareUrl.includes("?") ? "&" : "?"}${queryString}` : shareUrl;
  }, [shareUrl, utmParams]);

  // Generate QR code URL (using QR Server API)
  const qrCodeUrl = useMemo(() => {
    const linkToEncode = utmLink || shareUrl || "";
    if (!linkToEncode) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(linkToEncode)}&format=png&margin=10`;
  }, [utmLink, shareUrl, qrSize]);

  // Copy to clipboard
  const copyToClipboard = useCallback(async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(type);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, []);

  // Download QR code
  const downloadQRCode = useCallback(async () => {
    if (!qrCodeUrl) return;
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-code-${affiliateData?.affiliateCode || "affiliate"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
  }, [qrCodeUrl, affiliateData?.affiliateCode]);

  // Social share URLs
  const socialShareUrls = useMemo(() => {
    const link = utmLink || shareUrl || "";
    const text = intl.formatMessage({
      id: "affiliate.share.text",
      defaultMessage: "Rejoignez SOS Expat et bénéficiez de l'aide d'avocats et d'expatriés du monde entier !"
    });
    const encodedLink = encodeURIComponent(link);
    const encodedText = encodeURIComponent(text);

    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedLink}&text=${encodedText}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedLink}`,
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedLink}`,
      telegram: `https://t.me/share/url?url=${encodedLink}&text=${encodedText}`,
      email: `mailto:?subject=${encodeURIComponent(intl.formatMessage({ id: "affiliate.share.emailSubject", defaultMessage: "Découvrez SOS Expat" }))}&body=${encodedText}%0A%0A${encodedLink}`,
    };
  }, [utmLink, shareUrl, intl]);

  // Apply campaign template
  const applyTemplate = (template: typeof CAMPAIGN_TEMPLATES[0]) => {
    setUtmParams(prev => ({
      ...prev,
      campaign: template.utm_campaign,
    }));
  };

  // Reset UTM params
  const resetUTM = () => {
    setUtmParams({
      source: "",
      medium: "",
      campaign: "",
      content: "",
      term: "",
    });
  };

  return (
    <DashboardLayout activeKey="affiliate">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            <FormattedMessage id="affiliate.tools.title" defaultMessage="Outils Marketing" />
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            <FormattedMessage id="affiliate.tools.subtitle" defaultMessage="Créez des liens personnalisés et des QR codes pour vos campagnes" />
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* UTM Link Builder */}
          <div className={`${UI.card} p-6`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30">
                <Link2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  <FormattedMessage id="affiliate.tools.utmBuilder" defaultMessage="Générateur de liens UTM" />
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="affiliate.tools.utmBuilderDesc" defaultMessage="Trackez vos campagnes marketing" />
                </p>
              </div>
            </div>

            {/* Campaign Templates */}
            <div className="mb-6">
              <label className={UI.label}>
                <FormattedMessage id="affiliate.tools.templates" defaultMessage="Templates rapides" />
              </label>
              <div className="flex flex-wrap gap-2">
                {CAMPAIGN_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className={`${UI.button.outline} px-3 py-1.5 text-sm flex items-center gap-1.5`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {template.name}
                  </button>
                ))}
              </div>
            </div>

            {/* UTM Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={UI.label}>
                    <FormattedMessage id="affiliate.tools.source" defaultMessage="Source" />
                  </label>
                  <select
                    value={utmParams.source}
                    onChange={(e) => setUtmParams(prev => ({ ...prev, source: e.target.value }))}
                    className={UI.select}
                  >
                    <option value="">-- Choisir --</option>
                    {UTM_SOURCES.map((src) => (
                      <option key={src.value} value={src.value}>{src.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={UI.label}>
                    <FormattedMessage id="affiliate.tools.medium" defaultMessage="Medium" />
                  </label>
                  <select
                    value={utmParams.medium}
                    onChange={(e) => setUtmParams(prev => ({ ...prev, medium: e.target.value }))}
                    className={UI.select}
                  >
                    <option value="">-- Choisir --</option>
                    {UTM_MEDIUMS.map((med) => (
                      <option key={med.value} value={med.value}>{med.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={UI.label}>
                  <FormattedMessage id="affiliate.tools.campaign" defaultMessage="Campagne" />
                </label>
                <input
                  type="text"
                  value={utmParams.campaign}
                  onChange={(e) => setUtmParams(prev => ({ ...prev, campaign: e.target.value }))}
                  placeholder="ex: promo_ete_2024"
                  className={UI.input}
                />
              </div>

              {/* Advanced Options */}
              <button
                onClick={() => setShowAdvancedUTM(!showAdvancedUTM)}
                className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {showAdvancedUTM ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <FormattedMessage id="affiliate.tools.advancedOptions" defaultMessage="Options avancées" />
              </button>

              {showAdvancedUTM && (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className={UI.label}>
                      <FormattedMessage id="affiliate.tools.content" defaultMessage="Contenu (optionnel)" />
                    </label>
                    <input
                      type="text"
                      value={utmParams.content}
                      onChange={(e) => setUtmParams(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="ex: banner_top, cta_footer"
                      className={UI.input}
                    />
                  </div>

                  <div>
                    <label className={UI.label}>
                      <FormattedMessage id="affiliate.tools.term" defaultMessage="Terme (optionnel)" />
                    </label>
                    <input
                      type="text"
                      value={utmParams.term}
                      onChange={(e) => setUtmParams(prev => ({ ...prev, term: e.target.value }))}
                      placeholder="ex: avocat_immigration"
                      className={UI.input}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Generated Link */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
              <label className={UI.label}>
                <FormattedMessage id="affiliate.tools.generatedLink" defaultMessage="Lien généré" />
              </label>
              <div className="flex gap-2">
                <div className="flex-1 px-4 py-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                  <span className="text-sm text-gray-600 dark:text-gray-300 break-all">
                    {utmLink || shareUrl || "..."}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(utmLink || shareUrl || "", "utm")}
                  className={`${UI.button.secondary} p-3 shrink-0`}
                  title={intl.formatMessage({ id: "common.copy", defaultMessage: "Copier" })}
                >
                  {copiedLink === "utm" ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={resetUTM}
                  className={`${UI.button.outline} px-4 py-2 text-sm flex items-center gap-2`}
                >
                  <RefreshCw className="w-4 h-4" />
                  <FormattedMessage id="common.reset" defaultMessage="Réinitialiser" />
                </button>
                <a
                  href={utmLink || shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${UI.button.outline} px-4 py-2 text-sm flex items-center gap-2`}
                >
                  <ExternalLink className="w-4 h-4" />
                  <FormattedMessage id="common.preview" defaultMessage="Prévisualiser" />
                </a>
              </div>
            </div>
          </div>

          {/* QR Code Generator */}
          <div className={`${UI.card} p-6`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30">
                <QrCode className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  <FormattedMessage id="affiliate.tools.qrGenerator" defaultMessage="Générateur QR Code" />
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="affiliate.tools.qrGeneratorDesc" defaultMessage="Pour vos supports imprimés" />
                </p>
              </div>
            </div>

            {/* QR Code Preview */}
            <div className="flex flex-col items-center mb-6">
              <div className="p-4 bg-white rounded-2xl shadow-lg">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    width={qrSize}
                    height={qrSize}
                    className="rounded-lg"
                  />
                ) : (
                  <div
                    className="flex items-center justify-center bg-gray-100 rounded-lg"
                    style={{ width: qrSize, height: qrSize }}
                  >
                    <QrCode className="w-12 h-12 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Affiliate Code Badge */}
              {affiliateData?.affiliateCode && (
                <div className="mt-4 px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    <FormattedMessage id="affiliate.code.label" defaultMessage="Votre code" />
                  </p>
                  <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 tracking-wider text-center">
                    {affiliateData.affiliateCode}
                  </p>
                </div>
              )}
            </div>

            {/* QR Size Selector */}
            <div className="mb-6">
              <label className={UI.label}>
                <FormattedMessage id="affiliate.tools.qrSize" defaultMessage="Taille du QR Code" />
              </label>
              <div className="flex gap-2">
                {[150, 200, 300, 400].map((size) => (
                  <button
                    key={size}
                    onClick={() => setQrSize(size)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      qrSize === size
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/20"
                    }`}
                  >
                    {size}px
                  </button>
                ))}
              </div>
            </div>

            {/* Download Button */}
            <button
              onClick={downloadQRCode}
              disabled={!qrCodeUrl}
              className={`${UI.button.primary} w-full py-3 flex items-center justify-center gap-2`}
            >
              <Download className="w-5 h-5" />
              <FormattedMessage id="affiliate.tools.downloadQR" defaultMessage="Télécharger le QR Code" />
            </button>

            <p className="mt-3 text-xs text-center text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="affiliate.tools.qrNote"
                defaultMessage="Le QR Code inclut vos paramètres UTM configurés"
              />
            </p>
          </div>
        </div>

        {/* Social Share */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30">
              <Megaphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                <FormattedMessage id="affiliate.tools.socialShare" defaultMessage="Partage social" />
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="affiliate.tools.socialShareDesc" defaultMessage="Partagez en un clic sur vos réseaux" />
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <a
              href={socialShareUrls.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <Facebook className="w-6 h-6 text-blue-600" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Facebook</span>
            </a>

            <a
              href={socialShareUrls.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors"
            >
              <Twitter className="w-6 h-6 text-sky-500" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Twitter</span>
            </a>

            <a
              href={socialShareUrls.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <Linkedin className="w-6 h-6 text-blue-700" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">LinkedIn</span>
            </a>

            <a
              href={socialShareUrls.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            >
              <MessageCircle className="w-6 h-6 text-green-600" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">WhatsApp</span>
            </a>

            <a
              href={socialShareUrls.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors"
            >
              <Share2 className="w-6 h-6 text-sky-600" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Telegram</span>
            </a>

            <a
              href={socialShareUrls.email}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Mail className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Email</span>
            </a>
          </div>

          {/* Native Share (mobile) */}
          {typeof navigator !== "undefined" && navigator.share && (
            <button
              onClick={async () => {
                try {
                  await navigator.share({
                    title: intl.formatMessage({ id: "affiliate.share.title", defaultMessage: "Rejoignez SOS Expat" }),
                    text: intl.formatMessage({ id: "affiliate.share.text", defaultMessage: "Découvrez SOS Expat" }),
                    url: utmLink || shareUrl || "",
                  });
                } catch (err) {
                  console.error("Share failed:", err);
                }
              }}
              className={`${UI.button.primary} w-full mt-4 py-3 flex items-center justify-center gap-2`}
            >
              <Share2 className="w-5 h-5" />
              <FormattedMessage id="affiliate.tools.nativeShare" defaultMessage="Partager avec une autre app" />
            </button>
          )}
        </div>

        {/* Tips Section */}
        <div className={`${UI.card} p-6`}>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            <FormattedMessage id="affiliate.tools.tips.title" defaultMessage="Conseils pour maximiser vos conversions" />
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                <FormattedMessage
                  id="affiliate.tools.tips.1"
                  defaultMessage="Utilisez des paramètres UTM pour chaque canal afin de suivre précisément vos performances."
                />
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                <FormattedMessage
                  id="affiliate.tools.tips.2"
                  defaultMessage="Les QR codes sont parfaits pour les cartes de visite, flyers et présentations."
                />
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                <FormattedMessage
                  id="affiliate.tools.tips.3"
                  defaultMessage="Partagez votre lien avec un message personnalisé pour de meilleurs résultats."
                />
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                <FormattedMessage
                  id="affiliate.tools.tips.4"
                  defaultMessage="Testez différentes campagnes et analysez celles qui convertissent le mieux."
                />
              </span>
            </li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AffiliateTools;
