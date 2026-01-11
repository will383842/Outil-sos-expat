// src/components/share/ProviderSocialShare.tsx
// 🚀 Ultra-simple, mobile-first share component (2025-2026)
// Design: Web Share API first, all platforms in simple grid, fun messages

import React, { useState, useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { Check, Link2, Mail, X } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type SocialPlatform =
  | 'whatsapp' | 'messenger' | 'facebook' | 'twitter'
  | 'pinterest' | 'instagram' | 'tiktok' | 'copy' | 'email' | 'native';

export interface ShareableProvider {
  id: string;
  firstName: string;
  lastName?: string;
  fullName?: string;
  type: 'lawyer' | 'expat';
  country: string;
  specialties?: string[];
  rating?: number;
}

export interface ProviderSocialShareProps {
  provider: ShareableProvider;
  shareUrl: string;
  onShare?: (platform: SocialPlatform, success: boolean) => void;
}

// ============================================================================
// FUN MESSAGES - Culturally adapted, platform-specific
// ============================================================================

const getShareMessages = (lang: string) => {
  const messages: Record<string, { whatsapp: string; social: string; email: string }> = {
    // French
    fr: {
      whatsapp: "Salut ! Je te recommande ce contact pour les expats :\n\n{name}\n{specialty}\nNote : {rating}/5\n\nTrès professionnel, je te le conseille.",
      social: "{name} - {specialty} ({rating}/5) - Un contact de confiance pour les expats",
      email: "Recommandation\n\nBonjour,\n\nJe te recommande {name}, spécialisé(e) en {specialty}.\nNote : {rating}/5\n\nUn contact fiable pour les expatriés.",
    },
    // English
    en: {
      whatsapp: "Hi! I recommend this contact for expats:\n\n{name}\n{specialty}\nRating: {rating}/5\n\nVery professional, highly recommended.",
      social: "{name} - {specialty} ({rating}/5) - A trusted contact for expats",
      email: "Recommendation\n\nHi,\n\nI recommend {name}, specialized in {specialty}.\nRating: {rating}/5\n\nA reliable contact for expatriates.",
    },
    // Spanish
    es: {
      whatsapp: "Hola! Te recomiendo este contacto para expatriados:\n\n{name}\n{specialty}\nValoración: {rating}/5\n\nMuy profesional, lo recomiendo.",
      social: "{name} - {specialty} ({rating}/5) - Un contacto de confianza para expats",
      email: "Recomendación\n\nHola,\n\nTe recomiendo a {name}, especializado en {specialty}.\nValoración: {rating}/5\n\nUn contacto fiable para expatriados.",
    },
    // German
    de: {
      whatsapp: "Hallo! Ich empfehle diesen Kontakt für Expats:\n\n{name}\n{specialty}\nBewertung: {rating}/5\n\nSehr professionell, empfehlenswert.",
      social: "{name} - {specialty} ({rating}/5) - Ein vertrauenswürdiger Kontakt für Expats",
      email: "Empfehlung\n\nHallo,\n\nIch empfehle {name}, spezialisiert auf {specialty}.\nBewertung: {rating}/5\n\nEin zuverlässiger Kontakt für Expats.",
    },
    // Portuguese
    pt: {
      whatsapp: "Oi! Recomendo este contato para expatriados:\n\n{name}\n{specialty}\nNota: {rating}/5\n\nMuito profissional, recomendo.",
      social: "{name} - {specialty} ({rating}/5) - Um contato de confiança para expats",
      email: "Recomendação\n\nOlá,\n\nRecomendo {name}, especialista em {specialty}.\nNota: {rating}/5\n\nUm contato confiável para expatriados.",
    },
    // Russian
    ru: {
      whatsapp: "Привет! Рекомендую этот контакт для экспатов:\n\n{name}\n{specialty}\nОценка: {rating}/5\n\nОчень профессионально, рекомендую.",
      social: "{name} - {specialty} ({rating}/5) - Надёжный контакт для экспатов",
      email: "Рекомендация\n\nПривет,\n\nРекомендую {name}, специалист по {specialty}.\nОценка: {rating}/5\n\nНадёжный контакт для экспатов.",
    },
    // Hindi
    hi: {
      whatsapp: "नमस्ते! Expats के लिए यह contact recommend करता हूं:\n\n{name}\n{specialty}\nRating: {rating}/5\n\nबहुत professional, recommend करता हूं।",
      social: "{name} - {specialty} ({rating}/5) - Expats के लिए भरोसेमंद contact",
      email: "Recommendation\n\nनमस्ते,\n\n{name} को recommend करता हूं, {specialty} में specialist।\nRating: {rating}/5\n\nExpats के लिए reliable contact।",
    },
    // Arabic
    ar: {
      whatsapp: "السلام عليكم! أنصحك بهذا الشخص للمغتربين:\n\n{name}\n{specialty}\nالتقييم: {rating}/5\n\nمحترف جداً، أنصح به.",
      social: "{name} - {specialty} ({rating}/5) - شخص موثوق للمغتربين",
      email: "توصية\n\nالسلام عليكم،\n\nأنصح بـ {name}، متخصص في {specialty}.\nالتقييم: {rating}/5\n\nشخص موثوق للمغتربين.",
    },
    // Chinese
    zh: {
      whatsapp: "你好！推荐这位海外服务专家：\n\n{name}\n{specialty}\n评分：{rating}/5\n\n非常专业，值得信赖。",
      social: "{name} - {specialty} ({rating}/5) - 海外华人的可靠专家",
      email: "推荐\n\n你好，\n\n推荐{name}，专业领域：{specialty}。\n评分：{rating}/5\n\n海外人士的可靠联系人。",
    },
    ch: {
      whatsapp: "你好！推荐这位海外服务专家：\n\n{name}\n{specialty}\n评分：{rating}/5\n\n非常专业，值得信赖。",
      social: "{name} - {specialty} ({rating}/5) - 海外华人的可靠专家",
      email: "推荐\n\n你好，\n\n推荐{name}，专业领域：{specialty}。\n评分：{rating}/5\n\n海外人士的可靠联系人。",
    },
  };
  return messages[lang] || messages.en;
};

const buildMessage = (template: string, provider: ShareableProvider): string => {
  const name = provider.fullName || provider.firstName;
  const specialty = provider.specialties?.[0] || (provider.type === 'lawyer' ? 'Avocat' : 'Expert expat');
  const rating = provider.rating?.toFixed(1) || '5.0';
  return template
    .replace(/{name}/g, name)
    .replace(/{specialty}/g, specialty)
    .replace(/{rating}/g, rating);
};

// ============================================================================
// HAPTIC FEEDBACK
// ============================================================================

const haptic = (type: 'light' | 'success' = 'light') => {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(type === 'success' ? [10, 50, 10] : 10);
    } catch {
      // Ignore - vibration blocked by browser if no user interaction
    }
  }
};

// ============================================================================
// SOCIAL ICONS (Custom SVGs)
// ============================================================================

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const MessengerIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.301 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const PinterestIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ProviderSocialShare: React.FC<ProviderSocialShareProps> = ({
  provider,
  shareUrl,
  onShare,
}) => {
  const intl = useIntl();
  const lang = intl.locale?.split('-')[0] || 'fr';
  const [copied, setCopied] = useState(false);
  const [showSheet, setShowSheet] = useState(false);

  // Check Web Share API support
  const canNativeShare = useMemo(() => {
    return typeof navigator !== 'undefined' && 'share' in navigator;
  }, []);

  // Messages
  const messages = useMemo(() => getShareMessages(lang), [lang]);

  // ============================================================================
  // SHARE HANDLERS
  // ============================================================================

  const shareToWhatsApp = useCallback(() => {
    haptic();
    const text = buildMessage(messages.whatsapp, provider);
    window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n\n' + shareUrl)}`, '_blank');
    onShare?.('whatsapp', true);
    setShowSheet(false);
  }, [messages, provider, shareUrl, onShare]);

  const shareToMessenger = useCallback(() => {
    haptic();
    window.open(`https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareUrl)}&app_id=966242223397117&redirect_uri=${encodeURIComponent(shareUrl)}`, '_blank');
    onShare?.('messenger', true);
    setShowSheet(false);
  }, [shareUrl, onShare]);

  const shareToFacebook = useCallback(() => {
    haptic();
    const text = buildMessage(messages.social, provider);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(text)}`, '_blank');
    onShare?.('facebook', true);
    setShowSheet(false);
  }, [messages, provider, shareUrl, onShare]);

  const shareToTwitter = useCallback(() => {
    haptic();
    const text = buildMessage(messages.social, provider);
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    onShare?.('twitter', true);
    setShowSheet(false);
  }, [messages, provider, shareUrl, onShare]);

  const shareToPinterest = useCallback(() => {
    haptic();
    const text = buildMessage(messages.social, provider);
    window.open(`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&description=${encodeURIComponent(text)}`, '_blank');
    onShare?.('pinterest', true);
    setShowSheet(false);
  }, [messages, provider, shareUrl, onShare]);

  const shareToInstagram = useCallback(() => {
    haptic();
    // Instagram doesn't have direct share - copy link for Stories
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      haptic('success');
      setTimeout(() => setCopied(false), 3000);
    });
    onShare?.('instagram', true);
    // Open Instagram app if possible
    window.open('instagram://app', '_blank');
    setShowSheet(false);
  }, [shareUrl, onShare]);

  const shareToTikTok = useCallback(() => {
    haptic();
    // TikTok doesn't have direct share - copy link
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      haptic('success');
      setTimeout(() => setCopied(false), 3000);
    });
    onShare?.('tiktok', true);
    setShowSheet(false);
  }, [shareUrl, onShare]);

  const copyLink = useCallback(async () => {
    haptic();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      haptic('success');
      onShare?.('copy', true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  }, [shareUrl, onShare]);

  const shareByEmail = useCallback(() => {
    haptic();
    const subject = `${provider.fullName || provider.firstName} - SOS Expat`;
    const body = buildMessage(messages.email, provider) + '\n\n' + shareUrl;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    onShare?.('email', true);
    setShowSheet(false);
  }, [messages, provider, shareUrl, onShare]);

  const nativeShare = useCallback(async () => {
    haptic();
    if (!canNativeShare) {
      setShowSheet(true);
      return;
    }
    try {
      await navigator.share({
        title: `${provider.fullName || provider.firstName} - SOS Expat`,
        text: buildMessage(messages.social, provider),
        url: shareUrl,
      });
      haptic('success');
      onShare?.('native', true);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setShowSheet(true);
      }
    }
  }, [canNativeShare, messages, provider, shareUrl, onShare]);

  // ============================================================================
  // PLATFORM CONFIG - Simple grid
  // ============================================================================

  const platforms = [
    { id: 'whatsapp', name: 'WhatsApp', icon: WhatsAppIcon, color: 'bg-[#25D366]', onClick: shareToWhatsApp },
    { id: 'messenger', name: 'Messenger', icon: MessengerIcon, color: 'bg-gradient-to-br from-[#00B2FF] to-[#006AFF]', onClick: shareToMessenger },
    { id: 'facebook', name: 'Facebook', icon: FacebookIcon, color: 'bg-[#1877F2]', onClick: shareToFacebook },
    { id: 'twitter', name: 'X', icon: TwitterIcon, color: 'bg-black', onClick: shareToTwitter },
    { id: 'instagram', name: 'Instagram', icon: InstagramIcon, color: 'bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]', onClick: shareToInstagram },
    { id: 'pinterest', name: 'Pinterest', icon: PinterestIcon, color: 'bg-[#E60023]', onClick: shareToPinterest },
    { id: 'tiktok', name: 'TikTok', icon: TikTokIcon, color: 'bg-black', onClick: shareToTikTok },
    { id: 'email', name: 'Email', icon: () => <Mail className="w-6 h-6" />, color: 'bg-indigo-500', onClick: shareByEmail },
  ];

  // ============================================================================
  // MOBILE: Single magic button + full sheet
  // ============================================================================

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (isMobile) {
    return (
      <>
        {/* Magic Share Button */}
        <button
          onClick={nativeShare}
          className="
            flex items-center gap-2 px-5 py-2.5
            bg-gradient-to-r from-violet-500 to-fuchsia-500
            text-white font-semibold text-sm
            rounded-full shadow-lg shadow-violet-500/30
            active:scale-95 transition-transform duration-150
          "
        >
          <span>Partager</span>
          <span className="text-lg">✨</span>
        </button>

        {/* Full Platform Sheet */}
        {showSheet && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSheet(false)}
          >
            <div
              className="
                fixed inset-x-0 bottom-0 z-50
                bg-white dark:bg-gray-900
                rounded-t-3xl p-6 pb-10
                animate-[slideUp_0.3s_ease-out]
              "
              onClick={e => e.stopPropagation()}
            >
              {/* Handle + Close */}
              <div className="flex justify-between items-center mb-4">
                <div className="w-8" />
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                <button onClick={() => setShowSheet(false)} className="p-1 text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Header */}
              <p className="text-center text-gray-500 dark:text-gray-400 mb-6 text-sm">
                Partager ce profil 💫
              </p>

              {/* Platform Grid - 4 columns */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                {platforms.map(({ id, name, icon: Icon, color, onClick }) => (
                  <button
                    key={id}
                    onClick={onClick}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className={`
                      w-14 h-14 rounded-2xl ${color}
                      flex items-center justify-center text-white
                      group-active:scale-90 transition-transform
                      shadow-lg
                    `}>
                      <Icon />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">{name}</span>
                  </button>
                ))}
              </div>

              {/* Copy Link - Full width */}
              <button
                onClick={copyLink}
                className={`
                  w-full py-3 rounded-xl font-medium text-sm
                  flex items-center justify-center gap-2
                  transition-all active:scale-98
                  ${copied
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                {copied ? <Check className="w-5 h-5" /> : <Link2 className="w-5 h-5" />}
                {copied ? 'Lien copié ✓' : 'Copier le lien'}
              </button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>
      </>
    );
  }

  // ============================================================================
  // DESKTOP: Inline icons with tooltip
  // ============================================================================

  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400 text-sm mr-1">Partager</span>

      {/* Main platforms inline */}
      {platforms.slice(0, 5).map(({ id, name, icon: Icon, color, onClick }) => (
        <button
          key={id}
          onClick={onClick}
          className={`
            w-9 h-9 rounded-full ${color}
            flex items-center justify-center text-white
            hover:scale-110 active:scale-95 transition-transform
            shadow-md hover:shadow-lg
          `}
          title={name}
        >
          <Icon />
        </button>
      ))}

      {/* Copy */}
      <button
        onClick={copyLink}
        className={`
          w-9 h-9 rounded-full
          flex items-center justify-center
          hover:scale-110 active:scale-95 transition-all
          ${copied
            ? 'bg-green-500 text-white'
            : 'bg-white/10 text-white/80 hover:bg-white/20'
          }
        `}
        title={copied ? 'Copié!' : 'Copier'}
      >
        {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
      </button>

      {/* More */}
      <button
        onClick={() => setShowSheet(true)}
        className="
          w-9 h-9 rounded-full
          bg-white/10 text-white/80
          flex items-center justify-center text-xs font-bold
          hover:scale-110 hover:bg-white/20 active:scale-95 transition-all
        "
        title="Plus"
      >
        +{platforms.length - 5}
      </button>

      {/* Desktop Sheet */}
      {showSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
          onClick={() => setShowSheet(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800 dark:text-white">Partager</h3>
              <button onClick={() => setShowSheet(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {platforms.map(({ id, name, icon: Icon, color, onClick }) => (
                <button
                  key={id}
                  onClick={onClick}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className={`
                    w-12 h-12 rounded-xl ${color}
                    flex items-center justify-center text-white
                    group-hover:scale-105 group-active:scale-95 transition-transform
                  `}>
                    <Icon />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">{name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={copyLink}
              className={`
                w-full mt-4 py-2.5 rounded-xl font-medium text-sm
                flex items-center justify-center gap-2 transition-all
                ${copied
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }
              `}
            >
              {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
              {copied ? 'Copié!' : 'Copier le lien'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderSocialShare;
