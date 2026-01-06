// src/components/share/ProviderSocialShare.tsx
// Composant de partage social ultra-performant pour les profils prestataires
// Mobile: Bottom sheet avec Web Share API natif + fallback
// Desktop: Icônes horizontales avec tooltips

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import {
  Share2,
  X,
  Check,
  Copy,
  Mail,
  MessageCircle,
  QrCode,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type SocialPlatform =
  | 'whatsapp'
  | 'facebook'
  | 'messenger'
  | 'twitter'
  | 'linkedin'
  | 'telegram'
  | 'pinterest'
  | 'instagram'
  | 'tiktok'
  | 'email'
  | 'sms'
  | 'copy'
  | 'qrcode'
  | 'native';

export interface ShareableProvider {
  id: string;
  firstName: string;
  lastName?: string;
  fullName?: string;
  type: 'lawyer' | 'expat';
  country: string;
  city?: string;
  specialties?: string[];
  languages?: string[];
  rating?: number;
  reviewCount?: number;
  profilePhoto?: string;
  slug?: string;
}

export interface ProviderSocialShareProps {
  provider: ShareableProvider;
  shareUrl: string;
  className?: string;
  variant?: 'inline' | 'button' | 'compact';
  onShare?: (platform: SocialPlatform, success: boolean) => void;
}

interface PlatformConfig {
  id: SocialPlatform;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  hoverBgColor: string;
  getShareUrl: (url: string, message: string, title: string) => string | null;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
  requiresClipboard?: boolean;
}

// ============================================================================
// PLATFORM ICONS (SVG)
// ============================================================================

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const MessengerIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.974 12-11.111S18.627 0 12 0zm1.193 14.963l-3.056-3.259-5.963 3.259 6.559-6.963 3.13 3.259 5.889-3.259-6.559 6.963z"/>
  </svg>
);

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const PinterestIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.757-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
);

// ============================================================================
// SHARE MESSAGES BY LANGUAGE
// ============================================================================

const getShareMessages = (lang: string) => {
  const messages: Record<string, { short: string; full: string; hashtags: string }> = {
    fr: {
      short: "Découvrez {name} sur SOS Expat ! {specialty} 🌍",
      full: "Je vous recommande {name} sur SOS Expat ! {specialty} pour les expatriés, disponible {rating}. Consultez son profil :",
      hashtags: "SOSExpat,expatriation,expatlife",
    },
    en: {
      short: "Discover {name} on SOS Expat! {specialty} 🌍",
      full: "I recommend {name} on SOS Expat! {specialty} for expats, available {rating}. Check out the profile:",
      hashtags: "SOSExpat,expat,expatlife",
    },
    es: {
      short: "¡Descubre a {name} en SOS Expat! {specialty} 🌍",
      full: "¡Te recomiendo a {name} en SOS Expat! {specialty} para expatriados, disponible {rating}. Mira el perfil:",
      hashtags: "SOSExpat,expatriados,vidaexpat",
    },
    de: {
      short: "Entdecken Sie {name} auf SOS Expat! {specialty} 🌍",
      full: "Ich empfehle {name} auf SOS Expat! {specialty} für Expats, verfügbar {rating}. Schauen Sie sich das Profil an:",
      hashtags: "SOSExpat,expat,expatlife",
    },
    pt: {
      short: "Descubra {name} no SOS Expat! {specialty} 🌍",
      full: "Recomendo {name} no SOS Expat! {specialty} para expatriados, disponível {rating}. Confira o perfil:",
      hashtags: "SOSExpat,expatriados,vidaexpat",
    },
    ru: {
      short: "Откройте для себя {name} на SOS Expat! {specialty} 🌍",
      full: "Рекомендую {name} на SOS Expat! {specialty} для экспатов, доступно {rating}. Посмотрите профиль:",
      hashtags: "SOSExpat,экспат,жизньзаграницей",
    },
    hi: {
      short: "SOS Expat पर {name} की खोज करें! {specialty} 🌍",
      full: "मैं SOS Expat पर {name} की सिफारिश करता हूं! प्रवासियों के लिए {specialty}, {rating} उपलब्ध। प्रोफ़ाइल देखें:",
      hashtags: "SOSExpat,प्रवासी,विदेशीजीवन",
    },
    ar: {
      short: "اكتشف {name} على SOS Expat! {specialty} 🌍",
      full: "أنصحك بـ {name} على SOS Expat! {specialty} للمغتربين، متاح {rating}. تحقق من الملف الشخصي:",
      hashtags: "SOSExpat,مغترب,حياة_المغتربين",
    },
    ch: {
      short: "在SOS Expat上发现{name}！{specialty} 🌍",
      full: "我推荐SOS Expat上的{name}！为外籍人士提供{specialty}服务，{rating}可用。查看个人资料：",
      hashtags: "SOSExpat,外籍人士,海外生活",
    },
  };

  return messages[lang] || messages.en;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const buildShareMessage = (
  provider: ShareableProvider,
  template: string,
  lang: string
): string => {
  const name = provider.fullName || `${provider.firstName} ${provider.lastName || ''}`.trim();
  const specialty = provider.specialties?.length
    ? provider.specialties.slice(0, 2).join(', ')
    : provider.type === 'lawyer' ? 'Avocat' : 'Expert expatrié';
  const rating = provider.rating ? `⭐ ${provider.rating.toFixed(1)}` : '';

  return template
    .replace('{name}', name)
    .replace('{specialty}', specialty)
    .replace('{rating}', rating)
    .trim();
};

const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

// ============================================================================
// PLATFORM CONFIGURATIONS
// ============================================================================

const getPlatformConfigs = (
  url: string,
  message: string,
  title: string,
  lang: string
): PlatformConfig[] => {
  const encodedUrl = encodeURIComponent(url);
  const encodedMessage = encodeURIComponent(message);
  const encodedTitle = encodeURIComponent(title);
  const { hashtags } = getShareMessages(lang);

  return [
    // Messaging platforms (highest priority)
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: <WhatsAppIcon />,
      color: '#25D366',
      bgColor: 'bg-[#25D366]',
      hoverBgColor: 'hover:bg-[#1da851]',
      getShareUrl: () => `https://wa.me/?text=${encodeURIComponent(`${message}\n${url}`)}`,
    },
    {
      id: 'messenger',
      name: 'Messenger',
      icon: <MessengerIcon />,
      color: '#0084FF',
      bgColor: 'bg-[#0084FF]',
      hoverBgColor: 'hover:bg-[#006acc]',
      getShareUrl: () => `https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=966242223397117&redirect_uri=${encodedUrl}`,
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: <TelegramIcon />,
      color: '#0088CC',
      bgColor: 'bg-[#0088CC]',
      hoverBgColor: 'hover:bg-[#006699]',
      getShareUrl: () => `https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}`,
    },
    {
      id: 'sms',
      name: 'SMS',
      icon: <MessageCircle className="w-5 h-5" />,
      color: '#34C759',
      bgColor: 'bg-[#34C759]',
      hoverBgColor: 'hover:bg-[#28a745]',
      getShareUrl: () => {
        const separator = isIOS() ? '&' : '?';
        return `sms:${separator}body=${encodeURIComponent(`${message}\n${url}`)}`;
      },
      mobileOnly: true,
    },
    // Social platforms
    {
      id: 'facebook',
      name: 'Facebook',
      icon: <FacebookIcon />,
      color: '#1877F2',
      bgColor: 'bg-[#1877F2]',
      hoverBgColor: 'hover:bg-[#166fe5]',
      getShareUrl: () => `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedMessage}`,
    },
    {
      id: 'twitter',
      name: 'X (Twitter)',
      icon: <TwitterIcon />,
      color: '#000000',
      bgColor: 'bg-black',
      hoverBgColor: 'hover:bg-gray-800',
      getShareUrl: () => `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}&hashtags=${hashtags}&via=SOSExpat`,
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: <LinkedInIcon />,
      color: '#0A66C2',
      bgColor: 'bg-[#0A66C2]',
      hoverBgColor: 'hover:bg-[#004182]',
      getShareUrl: () => `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      id: 'pinterest',
      name: 'Pinterest',
      icon: <PinterestIcon />,
      color: '#E60023',
      bgColor: 'bg-[#E60023]',
      hoverBgColor: 'hover:bg-[#c8001d]',
      getShareUrl: () => `https://www.pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedMessage}`,
    },
    // Copy-based platforms (Instagram, TikTok)
    {
      id: 'instagram',
      name: 'Instagram',
      icon: <InstagramIcon />,
      color: '#E4405F',
      bgColor: 'bg-gradient-to-tr from-[#FCAF45] via-[#E4405F] to-[#833AB4]',
      hoverBgColor: 'hover:opacity-90',
      getShareUrl: () => null, // Opens copy modal
      requiresClipboard: true,
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: <TikTokIcon />,
      color: '#000000',
      bgColor: 'bg-black',
      hoverBgColor: 'hover:bg-gray-800',
      getShareUrl: () => null, // Opens copy modal
      requiresClipboard: true,
    },
    // Utility
    {
      id: 'email',
      name: 'Email',
      icon: <Mail className="w-5 h-5" />,
      color: '#6366F1',
      bgColor: 'bg-indigo-500',
      hoverBgColor: 'hover:bg-indigo-600',
      getShareUrl: () => `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(`${message}\n\n${url}`)}`,
    },
    {
      id: 'copy',
      name: 'Copier le lien',
      icon: <Copy className="w-5 h-5" />,
      color: '#6B7280',
      bgColor: 'bg-gray-500',
      hoverBgColor: 'hover:bg-gray-600',
      getShareUrl: () => null,
      requiresClipboard: true,
    },
  ];
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ProviderSocialShare: React.FC<ProviderSocialShareProps> = ({
  provider,
  shareUrl,
  className = '',
  variant = 'inline',
  onShare,
}) => {
  const intl = useIntl();
  const { isMobile, isIOS: isIOSDevice } = useDeviceDetection();
  const [isOpen, setIsOpen] = useState(false);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState('');
  const sheetRef = useRef<HTMLDivElement>(null);

  // Get language from intl
  const lang = intl.locale?.split('-')[0] || 'fr';

  // Build share message
  const messages = useMemo(() => getShareMessages(lang), [lang]);
  const defaultMessage = useMemo(
    () => buildShareMessage(provider, messages.short, lang),
    [provider, messages, lang]
  );

  // Initialize share message
  useEffect(() => {
    setShareMessage(defaultMessage);
  }, [defaultMessage]);

  // Platform configs
  const platforms = useMemo(
    () => getPlatformConfigs(shareUrl, shareMessage || defaultMessage,
      `${provider.fullName || provider.firstName} - SOS Expat`, lang),
    [shareUrl, shareMessage, defaultMessage, provider, lang]
  );

  // Filter platforms based on device
  const visiblePlatforms = useMemo(() => {
    return platforms.filter(p => {
      if (p.mobileOnly && !isMobile) return false;
      if (p.desktopOnly && isMobile) return false;
      return true;
    });
  }, [platforms, isMobile]);

  // Check Web Share API support
  const canNativeShare = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return 'share' in navigator && typeof navigator.share === 'function';
  }, []);

  // Handle native share
  const handleNativeShare = useCallback(async () => {
    if (!canNativeShare) return false;

    try {
      await navigator.share({
        title: `${provider.fullName || provider.firstName} - SOS Expat`,
        text: shareMessage || defaultMessage,
        url: shareUrl,
      });
      onShare?.('native', true);
      return true;
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Native share failed:', err);
      }
      return false;
    }
  }, [canNativeShare, provider, shareMessage, defaultMessage, shareUrl, onShare]);

  // Handle platform share
  const handleShare = useCallback(async (platform: PlatformConfig) => {
    // For clipboard-based platforms
    if (platform.requiresClipboard || platform.id === 'copy') {
      const textToCopy = platform.id === 'copy'
        ? shareUrl
        : `${shareMessage || defaultMessage}\n${shareUrl}`;

      try {
        await navigator.clipboard.writeText(textToCopy);
        setCopiedPlatform(platform.id);
        onShare?.(platform.id, true);

        // Reset after 2 seconds
        setTimeout(() => setCopiedPlatform(null), 2000);

        // For Instagram/TikTok, suggest opening the app
        if (platform.id === 'instagram' || platform.id === 'tiktok') {
          // On mobile, try to open the app
          if (isMobile) {
            const appScheme = platform.id === 'instagram'
              ? 'instagram://app'
              : 'tiktok://';
            window.location.href = appScheme;
          }
        }
      } catch (err) {
        console.error('Copy failed:', err);
        onShare?.(platform.id, false);
      }
      return;
    }

    // For URL-based platforms
    const url = platform.getShareUrl(shareUrl, shareMessage || defaultMessage,
      `${provider.fullName || provider.firstName} - SOS Expat`);

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
      onShare?.(platform.id, true);
    }
  }, [shareUrl, shareMessage, defaultMessage, provider, isMobile, onShare]);

  // Close sheet on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // ============================================================================
  // MOBILE BOTTOM SHEET
  // ============================================================================

  const MobileSheet = () => (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[85vh] overflow-hidden ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">
              {intl.formatMessage({ id: 'share.modal.title', defaultMessage: 'Partager' })}
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              aria-label={intl.formatMessage({ id: 'action.close', defaultMessage: 'Fermer' })}
            >
              <X size={20} />
            </button>
          </div>

          {/* Provider preview */}
          <div className="flex items-center gap-3 mt-3 p-3 bg-gray-50 rounded-xl">
            {provider.profilePhoto ? (
              <img
                src={provider.profilePhoto}
                alt={provider.fullName || provider.firstName}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                {provider.firstName?.[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                {provider.fullName || `${provider.firstName} ${provider.lastName || ''}`}
              </p>
              <p className="text-sm text-gray-500 truncate">
                {provider.type === 'lawyer'
                  ? intl.formatMessage({ id: 'providerProfile.lawyer', defaultMessage: 'Avocat' })
                  : intl.formatMessage({ id: 'providerProfile.expat', defaultMessage: 'Expatrié' })}
                {provider.country && ` • ${provider.country}`}
              </p>
            </div>
            {provider.rating && (
              <div className="flex items-center gap-1 text-yellow-500">
                <span className="text-sm font-semibold">⭐ {provider.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Message editor */}
        <div className="px-5 py-4 border-b border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {intl.formatMessage({ id: 'share.preview.editMessage', defaultMessage: 'Message' })}
          </label>
          <textarea
            value={shareMessage}
            onChange={(e) => setShareMessage(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            rows={2}
            maxLength={280}
          />
          <div className="flex justify-between items-center mt-1">
            <button
              onClick={() => setShareMessage(defaultMessage)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              {intl.formatMessage({ id: 'share.preview.resetMessage', defaultMessage: 'Réinitialiser' })}
            </button>
            <span className="text-xs text-gray-400">{shareMessage.length}/280</span>
          </div>
        </div>

        {/* Platform grid */}
        <div className="px-5 py-4 overflow-y-auto max-h-[40vh]">
          <div className="grid grid-cols-4 gap-4">
            {visiblePlatforms.map((platform) => (
              <button
                key={platform.id}
                onClick={() => handleShare(platform)}
                className="flex flex-col items-center gap-2 p-2 rounded-xl transition-transform active:scale-95"
                aria-label={`${intl.formatMessage({ id: 'action.share', defaultMessage: 'Partager' })} ${platform.name}`}
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-white ${platform.bgColor} ${platform.hoverBgColor} transition-colors shadow-lg`}
                >
                  {copiedPlatform === platform.id ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    platform.icon
                  )}
                </div>
                <span className="text-xs text-gray-600 font-medium text-center leading-tight">
                  {copiedPlatform === platform.id
                    ? intl.formatMessage({ id: 'share.success.linkCopied', defaultMessage: 'Copié !' })
                    : platform.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Safe area padding for notched devices */}
        <div className="h-safe-area-inset-bottom bg-white" />
      </div>
    </>
  );

  // ============================================================================
  // DESKTOP INLINE ICONS
  // ============================================================================

  const DesktopInline = () => {
    const primaryPlatforms = visiblePlatforms.slice(0, 6);
    const [showTooltip, setShowTooltip] = useState<string | null>(null);

    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <span className="text-gray-400 text-sm">
          {intl.formatMessage({ id: 'providerProfile.share', defaultMessage: 'Partager' })}
        </span>

        {primaryPlatforms.map((platform) => (
          <div key={platform.id} className="relative">
            <button
              onClick={() => handleShare(platform)}
              onMouseEnter={() => setShowTooltip(platform.id)}
              onMouseLeave={() => setShowTooltip(null)}
              className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all duration-200 ${
                copiedPlatform === platform.id
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'bg-white/10 border-white/20 text-white/90 hover:bg-white/20 hover:text-white hover:scale-110'
              }`}
              aria-label={`${intl.formatMessage({ id: 'action.share', defaultMessage: 'Partager' })} ${platform.name}`}
            >
              {copiedPlatform === platform.id ? (
                <Check size={18} />
              ) : (
                React.cloneElement(platform.icon as React.ReactElement, {
                  className: 'w-[18px] h-[18px]',
                })
              )}
            </button>

            {/* Tooltip */}
            {showTooltip === platform.id && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
                {copiedPlatform === platform.id
                  ? intl.formatMessage({ id: 'share.success.linkCopied', defaultMessage: 'Copié !' })
                  : platform.name}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
              </div>
            )}
          </div>
        ))}

        {/* More button */}
        <button
          onClick={() => setIsOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 border border-white/20 text-white/90 hover:bg-white/20 hover:text-white hover:scale-110 transition-all duration-200"
          aria-label={intl.formatMessage({ id: 'share.platform.native', defaultMessage: "Plus d'options" })}
        >
          <ChevronDown size={18} />
        </button>
      </div>
    );
  };

  // ============================================================================
  // MOBILE BUTTON
  // ============================================================================

  const MobileButton = () => (
    <button
      onClick={async () => {
        // Try native share first on mobile
        if (canNativeShare) {
          const shared = await handleNativeShare();
          if (shared) return;
        }
        // Fallback to sheet
        setIsOpen(true);
      }}
      className={`flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/90 hover:bg-white/20 hover:text-white transition-all ${className}`}
      aria-label={intl.formatMessage({ id: 'action.share', defaultMessage: 'Partager' })}
    >
      <Share2 size={18} />
      <span className="text-sm font-medium">
        {intl.formatMessage({ id: 'action.share', defaultMessage: 'Partager' })}
      </span>
    </button>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      {/* Mobile: Single share button or inline based on variant */}
      {isMobile ? (
        variant === 'button' ? (
          <MobileButton />
        ) : (
          <div className={`flex items-center gap-3 ${className}`}>
            <span className="text-gray-400 text-sm">
              {intl.formatMessage({ id: 'providerProfile.share', defaultMessage: 'Partager' })}
            </span>
            <MobileButton />
          </div>
        )
      ) : (
        <DesktopInline />
      )}

      {/* Bottom sheet (mobile) or modal (desktop) */}
      {isOpen && <MobileSheet />}
    </>
  );
};

export default ProviderSocialShare;
