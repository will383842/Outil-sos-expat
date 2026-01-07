// src/components/provider/SocialShare.tsx
// World-class social sharing component for provider profiles
// Mobile-first with Web Share API + fallback bottom sheet
// Desktop with platform icons, tooltips, copy link, and QR code

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  Share2,
  X,
  Check,
  Copy,
  QrCode,
  Mail,
  MessageCircle,
  ExternalLink,
  ChevronDown,
  Edit3,
} from 'lucide-react';

/* ===================================================================== */
/* TYPES & INTERFACES                                                    */
/* ===================================================================== */

/**
 * Supported social sharing platforms
 */
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

/**
 * Provider information for sharing context
 */
export interface ShareableProvider {
  id: string;
  fullName: string;
  firstName: string;
  lastName?: string;
  type: 'lawyer' | 'expat';
  country: string;
  specialties?: string[];
  rating?: number;
  profilePhoto?: string;
  slug?: string;
}

/**
 * Share content configuration
 */
export interface ShareContent {
  url: string;
  title: string;
  description: string;
  hashtags?: string[];
  image?: string;
  via?: string; // Twitter handle without @
}

/**
 * Platform-specific share configuration
 */
export interface PlatformConfig {
  id: SocialPlatform;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  hoverBgColor: string;
  buildUrl: (content: ShareContent) => string;
  available: boolean;
  priority: number;
  category: 'messaging' | 'social' | 'professional' | 'visual' | 'utility';
  mobileOnly?: boolean;
  desktopOnly?: boolean;
  requiresSpecialHandling?: boolean;
  tooltip?: string;
}

/**
 * Share analytics event
 */
export interface ShareAnalyticsEvent {
  platform: SocialPlatform;
  providerId: string;
  providerType: 'lawyer' | 'expat';
  url: string;
  timestamp: Date;
  userAgent: string;
  referrer: string;
}

/**
 * Component props
 */
export interface SocialShareProps {
  provider: ShareableProvider;
  currentUrl: string;
  language?: string;
  className?: string;
  variant?: 'compact' | 'full' | 'inline';
  showLabel?: boolean;
  onShare?: (event: ShareAnalyticsEvent) => void;
  trackingParams?: Record<string, string>;
}

/**
 * Bottom sheet props
 */
interface ShareBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  content: ShareContent;
  platforms: PlatformConfig[];
  onShare: (platform: SocialPlatform, customMessage?: string) => void;
  provider: ShareableProvider;
  language: string;
}

/**
 * QR Code modal props
 */
interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  providerName: string;
}

/* ===================================================================== */
/* PLATFORM ICONS (SVG Components)                                       */
/* ===================================================================== */

const WhatsAppIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const FacebookIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const MessengerIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.301 2.246.464 3.443.464 6.627 0 12-4.974 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/>
  </svg>
);

const TwitterIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const LinkedInIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const TelegramIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const PinterestIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/>
  </svg>
);

const InstagramIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

const TikTokIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
);

const SMSIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    <line x1="8" y1="9" x2="16" y2="9"/>
    <line x1="8" y1="13" x2="14" y2="13"/>
  </svg>
);

/* ===================================================================== */
/* UTILITY FUNCTIONS                                                      */
/* ===================================================================== */

/**
 * Detect if we're on a mobile device
 */
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (typeof window !== 'undefined' && window.innerWidth < 768);
};

/**
 * Check if Web Share API is available
 */
const canUseNativeShare = (): boolean => {
  return typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    isMobileDevice();
};

/**
 * Generate a trackable URL with UTM parameters
 */
const buildTrackableUrl = (
  baseUrl: string,
  platform: SocialPlatform,
  trackingParams?: Record<string, string>
): string => {
  const url = new URL(baseUrl);

  // Add default UTM parameters
  url.searchParams.set('utm_source', platform);
  url.searchParams.set('utm_medium', 'social');
  url.searchParams.set('utm_campaign', 'profile_share');

  // Add custom tracking params
  if (trackingParams) {
    Object.entries(trackingParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return url.toString();
};

/**
 * Generate pre-written share message based on provider info
 */
const generateShareMessage = (
  provider: ShareableProvider,
  language: string,
  includeEmoji: boolean = true
): { short: string; long: string; hashtags: string[] } => {
  const isLawyer = provider.type === 'lawyer';
  const emoji = includeEmoji ? (isLawyer ? '⚖️' : '🌍') : '';
  const checkEmoji = includeEmoji ? '✨' : '';
  const starEmoji = includeEmoji ? '⭐' : '';

  const specialtyText = provider.specialties?.slice(0, 2).join(', ') || '';
  const ratingText = provider.rating ? `${starEmoji} ${provider.rating.toFixed(1)}/5` : '';

  const messages: Record<string, { short: string; long: string; hashtags: string[] }> = {
    fr: {
      short: `${emoji} Consultez ${provider.firstName}, ${isLawyer ? 'avocat' : 'expert expat'} disponible pour vous aider ${ratingText}`,
      long: `${emoji} Je recommande ${provider.fullName}, ${isLawyer ? 'avocat certifie' : 'expert expatriation'}${specialtyText ? ` specialise en ${specialtyText}` : ''} ${provider.country ? `base en ${provider.country}` : ''}. ${checkEmoji} Appel video en quelques minutes !`,
      hashtags: ['SOSExpat', isLawyer ? 'Avocat' : 'Expat', 'ConseilJuridique', 'AideFrancophone'],
    },
    en: {
      short: `${emoji} Connect with ${provider.firstName}, ${isLawyer ? 'attorney' : 'expat expert'} ready to help ${ratingText}`,
      long: `${emoji} I recommend ${provider.fullName}, ${isLawyer ? 'certified lawyer' : 'expat specialist'}${specialtyText ? ` specializing in ${specialtyText}` : ''} ${provider.country ? `based in ${provider.country}` : ''}. ${checkEmoji} Video call in minutes!`,
      hashtags: ['SOSExpat', isLawyer ? 'Lawyer' : 'Expat', 'LegalAdvice', 'GlobalHelp'],
    },
    es: {
      short: `${emoji} Conecta con ${provider.firstName}, ${isLawyer ? 'abogado' : 'experto expat'} listo para ayudarte ${ratingText}`,
      long: `${emoji} Recomiendo a ${provider.fullName}, ${isLawyer ? 'abogado certificado' : 'especialista en expatriacion'}${specialtyText ? ` especializado en ${specialtyText}` : ''}. ${checkEmoji} Llamada por video en minutos!`,
      hashtags: ['SOSExpat', isLawyer ? 'Abogado' : 'Expat', 'AsesoriaLegal'],
    },
    de: {
      short: `${emoji} Kontaktieren Sie ${provider.firstName}, ${isLawyer ? 'Anwalt' : 'Expat-Experte'} ${ratingText}`,
      long: `${emoji} Ich empfehle ${provider.fullName}, ${isLawyer ? 'zertifizierter Anwalt' : 'Expat-Spezialist'}. ${checkEmoji} Videoanruf in Minuten!`,
      hashtags: ['SOSExpat', isLawyer ? 'Anwalt' : 'Expat', 'Rechtsberatung'],
    },
  };

  return messages[language] || messages.en;
};

/* ===================================================================== */
/* PLATFORM CONFIGURATIONS                                                */
/* ===================================================================== */

const getPlatformConfigs = (content: ShareContent, language: string): PlatformConfig[] => {
  const encodedUrl = encodeURIComponent(content.url);
  const encodedTitle = encodeURIComponent(content.title);
  const encodedDesc = encodeURIComponent(content.description);
  const hashtagsStr = content.hashtags?.map(h => `#${h}`).join(' ') || '';
  const encodedHashtags = encodeURIComponent(hashtagsStr);

  return [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: <WhatsAppIcon />,
      color: '#25D366',
      bgColor: 'bg-[#25D366]',
      hoverBgColor: 'hover:bg-[#1da851]',
      buildUrl: () => `https://wa.me/?text=${encodedDesc}%20${encodedUrl}`,
      available: true,
      priority: 1,
      category: 'messaging',
      tooltip: language === 'fr' ? 'Partager sur WhatsApp' : 'Share on WhatsApp',
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: <FacebookIcon />,
      color: '#1877F2',
      bgColor: 'bg-[#1877F2]',
      hoverBgColor: 'hover:bg-[#0d65d9]',
      buildUrl: () => `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedDesc}`,
      available: true,
      priority: 2,
      category: 'social',
      tooltip: language === 'fr' ? 'Partager sur Facebook' : 'Share on Facebook',
    },
    {
      id: 'messenger',
      name: 'Messenger',
      icon: <MessengerIcon />,
      color: '#0084FF',
      bgColor: 'bg-[#0084FF]',
      hoverBgColor: 'hover:bg-[#006acc]',
      buildUrl: () => `https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=YOUR_APP_ID&redirect_uri=${encodedUrl}`,
      available: true,
      priority: 3,
      category: 'messaging',
      mobileOnly: true,
      tooltip: language === 'fr' ? 'Envoyer via Messenger' : 'Send via Messenger',
    },
    {
      id: 'twitter',
      name: 'X (Twitter)',
      icon: <TwitterIcon />,
      color: '#000000',
      bgColor: 'bg-black',
      hoverBgColor: 'hover:bg-gray-800',
      buildUrl: () => `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedDesc}&hashtags=${content.hashtags?.join(',') || ''}&via=${content.via || 'SOSExpat'}`,
      available: true,
      priority: 4,
      category: 'social',
      tooltip: language === 'fr' ? 'Partager sur X' : 'Share on X',
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: <LinkedInIcon />,
      color: '#0A66C2',
      bgColor: 'bg-[#0A66C2]',
      hoverBgColor: 'hover:bg-[#084d94]',
      buildUrl: () => `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      available: true,
      priority: 5,
      category: 'professional',
      tooltip: language === 'fr' ? 'Partager sur LinkedIn' : 'Share on LinkedIn',
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: <TelegramIcon />,
      color: '#0088CC',
      bgColor: 'bg-[#0088CC]',
      hoverBgColor: 'hover:bg-[#006ba3]',
      buildUrl: () => `https://t.me/share/url?url=${encodedUrl}&text=${encodedDesc}`,
      available: true,
      priority: 6,
      category: 'messaging',
      tooltip: language === 'fr' ? 'Partager sur Telegram' : 'Share on Telegram',
    },
    {
      id: 'pinterest',
      name: 'Pinterest',
      icon: <PinterestIcon />,
      color: '#E60023',
      bgColor: 'bg-[#E60023]',
      hoverBgColor: 'hover:bg-[#c4001e]',
      buildUrl: () => `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodeURIComponent(content.image || '')}&description=${encodedDesc}`,
      available: true,
      priority: 7,
      category: 'visual',
      tooltip: language === 'fr' ? 'Epingler sur Pinterest' : 'Pin on Pinterest',
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: <InstagramIcon />,
      color: '#E4405F',
      bgColor: 'bg-gradient-to-br from-[#833AB4] via-[#E4405F] to-[#FCAF45]',
      hoverBgColor: 'hover:opacity-90',
      buildUrl: () => content.url, // Instagram requires special handling - copy to clipboard
      available: true,
      priority: 8,
      category: 'visual',
      requiresSpecialHandling: true,
      tooltip: language === 'fr' ? 'Copier pour Instagram Stories' : 'Copy for Instagram Stories',
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: <TikTokIcon />,
      color: '#000000',
      bgColor: 'bg-black',
      hoverBgColor: 'hover:bg-gray-800',
      buildUrl: () => content.url, // TikTok - copy link for bio
      available: true,
      priority: 9,
      category: 'visual',
      requiresSpecialHandling: true,
      tooltip: language === 'fr' ? 'Copier pour lien TikTok' : 'Copy for TikTok bio',
    },
    {
      id: 'email',
      name: language === 'fr' ? 'Email' : 'Email',
      icon: <Mail size={20} />,
      color: '#EA4335',
      bgColor: 'bg-gray-600',
      hoverBgColor: 'hover:bg-gray-700',
      buildUrl: () => `mailto:?subject=${encodedTitle}&body=${encodedDesc}%0A%0A${encodedUrl}`,
      available: true,
      priority: 10,
      category: 'utility',
      tooltip: language === 'fr' ? 'Envoyer par email' : 'Send by email',
    },
    {
      id: 'sms',
      name: 'SMS',
      icon: <SMSIcon />,
      color: '#34C759',
      bgColor: 'bg-[#34C759]',
      hoverBgColor: 'hover:bg-[#2db550]',
      buildUrl: () => `sms:?body=${encodedDesc}%20${encodedUrl}`,
      available: true,
      priority: 11,
      category: 'messaging',
      mobileOnly: true,
      tooltip: language === 'fr' ? 'Envoyer par SMS' : 'Send by SMS',
    },
    {
      id: 'copy',
      name: language === 'fr' ? 'Copier le lien' : 'Copy Link',
      icon: <Copy size={20} />,
      color: '#6B7280',
      bgColor: 'bg-gray-500',
      hoverBgColor: 'hover:bg-gray-600',
      buildUrl: () => content.url,
      available: true,
      priority: 12,
      category: 'utility',
      tooltip: language === 'fr' ? 'Copier le lien' : 'Copy link',
    },
    {
      id: 'qrcode',
      name: 'QR Code',
      icon: <QrCode size={20} />,
      color: '#374151',
      bgColor: 'bg-gray-700',
      hoverBgColor: 'hover:bg-gray-800',
      buildUrl: () => content.url,
      available: true,
      priority: 13,
      category: 'utility',
      desktopOnly: true,
      tooltip: language === 'fr' ? 'Afficher le QR code' : 'Show QR code',
    },
  ];
};

/* ===================================================================== */
/* QR CODE COMPONENT                                                      */
/* ===================================================================== */

const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, url, providerName }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrLoaded, setQrLoaded] = useState(false);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    // Simple QR code generation using canvas
    // In production, use a library like qrcode or react-qr-code
    const generateSimpleQR = async () => {
      try {
        // Dynamic import for QR code library (if available)
        // For now, we'll use an external QR code API
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          canvas.width = 200;
          canvas.height = 200;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 200, 200);
          ctx.drawImage(img, 0, 0, 200, 200);
          setQrLoaded(true);
        };
        img.src = qrApiUrl;
      } catch (error) {
        console.error('QR generation error:', error);
      }
    };

    generateSimpleQR();
  }, [isOpen, url]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `qr-${providerName.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 id="qr-modal-title" className="text-lg font-semibold text-gray-900">
            QR Code
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex flex-col items-center">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-inner mb-4">
            <canvas
              ref={canvasRef}
              className={`w-48 h-48 transition-opacity ${qrLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
            {!qrLoaded && (
              <div className="w-48 h-48 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-red-600" />
              </div>
            )}
          </div>

          <p className="text-sm text-gray-600 text-center mb-4">
            <FormattedMessage
              id="socialShare.qrScanToView"
              defaultMessage="Scan to view {name}'s profile"
              values={{ name: providerName }}
            />
          </p>

          <button
            onClick={handleDownload}
            disabled={!qrLoaded}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ExternalLink size={16} />
            <FormattedMessage id="socialShare.downloadQR" defaultMessage="Download QR" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ===================================================================== */
/* BOTTOM SHEET COMPONENT                                                 */
/* ===================================================================== */

const ShareBottomSheet: React.FC<ShareBottomSheetProps> = ({
  isOpen,
  onClose,
  content,
  platforms,
  onShare,
  provider,
  language,
}) => {
  const [customMessage, setCustomMessage] = useState(content.description);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Group platforms by category for mobile sheet
  const groupedPlatforms = useMemo(() => {
    const messaging = platforms.filter(p => p.category === 'messaging' && !p.desktopOnly);
    const social = platforms.filter(p => p.category === 'social' && !p.desktopOnly);
    const professional = platforms.filter(p => p.category === 'professional' && !p.desktopOnly);
    const utility = platforms.filter(p => p.category === 'utility' && !p.desktopOnly);

    return { messaging, social, professional, utility };
  }, [platforms]);

  // Handle swipe down to close
  useEffect(() => {
    if (!isOpen) return;

    const handleTouchStart = (e: TouchEvent) => {
      const startY = e.touches[0].clientY;

      const handleTouchMove = (e: TouchEvent) => {
        const currentY = e.touches[0].clientY;
        const diff = currentY - startY;

        if (diff > 100) {
          onClose();
          document.removeEventListener('touchmove', handleTouchMove);
        }
      };

      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      document.addEventListener('touchend', () => {
        document.removeEventListener('touchmove', handleTouchMove);
      }, { once: true });
    };

    const sheet = sheetRef.current;
    if (sheet) {
      sheet.addEventListener('touchstart', handleTouchStart, { passive: true });
    }

    return () => {
      if (sheet) {
        sheet.removeEventListener('touchstart', handleTouchStart);
      }
    };
  }, [isOpen, onClose]);

  const handlePlatformClick = async (platform: PlatformConfig) => {
    if (platform.id === 'copy' || platform.id === 'instagram' || platform.id === 'tiktok') {
      try {
        const textToCopy = platform.id === 'copy'
          ? content.url
          : `${customMessage}\n\n${content.url}`;
        await navigator.clipboard.writeText(textToCopy);
        setCopiedPlatform(platform.id);
        setTimeout(() => setCopiedPlatform(null), 2000);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    } else {
      onShare(platform.id, customMessage);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-sheet-title"
    >
      <div
        ref={sheetRef}
        className="bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl transform transition-transform animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 id="share-sheet-title" className="text-xl font-bold text-gray-900">
              <FormattedMessage id="socialShare.shareProfile" defaultMessage="Share Profile" />
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X size={24} className="text-gray-500" />
            </button>
          </div>

          {/* Provider preview card */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
            {provider.profilePhoto ? (
              <img
                src={provider.profilePhoto}
                alt={provider.fullName}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold">
                {provider.firstName.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{provider.fullName}</p>
              <p className="text-sm text-gray-500 truncate">
                {provider.type === 'lawyer' ? 'Lawyer' : 'Expat Expert'} - {provider.country}
              </p>
            </div>
          </div>

          {/* Editable message */}
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                <FormattedMessage id="socialShare.message" defaultMessage="Message" />
              </label>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <Edit3 size={14} />
                {isEditing
                  ? <FormattedMessage id="socialShare.done" defaultMessage="Done" />
                  : <FormattedMessage id="socialShare.edit" defaultMessage="Edit" />
                }
              </button>
            </div>
            {isEditing ? (
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={3}
                maxLength={280}
              />
            ) : (
              <p className="p-3 bg-gray-50 rounded-xl text-sm text-gray-700 line-clamp-3">
                {customMessage}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1 text-right">
              {customMessage.length}/280
            </p>
          </div>
        </div>

        {/* Platform grid */}
        <div className="px-5 pb-8 overflow-y-auto max-h-[50vh]">
          {/* Messaging apps - highest priority */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              <FormattedMessage id="socialShare.messaging" defaultMessage="Messaging" />
            </p>
            <div className="grid grid-cols-4 gap-3">
              {groupedPlatforms.messaging.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => handlePlatformClick(platform)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 active:scale-95 transition-all"
                >
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-white ${platform.bgColor} ${platform.hoverBgColor} transition-colors shadow-lg`}
                  >
                    {copiedPlatform === platform.id ? <Check size={24} /> : platform.icon}
                  </div>
                  <span className="text-xs text-gray-700 font-medium text-center">
                    {platform.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Social networks */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              <FormattedMessage id="socialShare.social" defaultMessage="Social" />
            </p>
            <div className="grid grid-cols-4 gap-3">
              {[...groupedPlatforms.social, ...groupedPlatforms.professional].map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => handlePlatformClick(platform)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 active:scale-95 transition-all"
                >
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-white ${platform.bgColor} ${platform.hoverBgColor} transition-colors shadow-lg`}
                  >
                    {platform.icon}
                  </div>
                  <span className="text-xs text-gray-700 font-medium text-center">
                    {platform.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Utility options */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              <FormattedMessage id="socialShare.more" defaultMessage="More Options" />
            </p>
            <div className="grid grid-cols-4 gap-3">
              {groupedPlatforms.utility.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => handlePlatformClick(platform)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 active:scale-95 transition-all"
                >
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-white ${platform.bgColor} ${platform.hoverBgColor} transition-colors shadow-lg`}
                  >
                    {copiedPlatform === platform.id ? <Check size={24} /> : platform.icon}
                  </div>
                  <span className="text-xs text-gray-700 font-medium text-center">
                    {copiedPlatform === platform.id
                      ? (language === 'fr' ? 'Copie !' : 'Copied!')
                      : platform.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

/* ===================================================================== */
/* PLATFORM BUTTON COMPONENT (Desktop)                                   */
/* ===================================================================== */

interface PlatformButtonProps {
  platform: PlatformConfig;
  onClick: () => void;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
  isCopied?: boolean;
}

const PlatformButton: React.FC<PlatformButtonProps> = ({
  platform,
  onClick,
  showTooltip = true,
  size = 'md',
  isCopied = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white transition-all duration-200 transform hover:scale-110 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${platform.color.replace('#', '')} ${platform.bgColor} ${platform.hoverBgColor}`}
        aria-label={platform.tooltip || platform.name}
        style={{ boxShadow: isHovered ? `0 4px 12px ${platform.color}40` : 'none' }}
      >
        {isCopied ? <Check size={size === 'sm' ? 14 : size === 'md' ? 18 : 22} /> : platform.icon}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap transition-all duration-200 pointer-events-none ${
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
          }`}
        >
          {isCopied ? (
            <span className="flex items-center gap-1">
              <Check size={12} />
              Copied!
            </span>
          ) : (
            platform.tooltip || platform.name
          )}
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
            <div className="border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
};

/* ===================================================================== */
/* MAIN COMPONENT                                                        */
/* ===================================================================== */

export const SocialShare: React.FC<SocialShareProps> = ({
  provider,
  currentUrl,
  language = 'en',
  className = '',
  variant = 'full',
  showLabel = true,
  onShare,
  trackingParams,
}) => {
  const intl = useIntl();
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);
  const isMobile = isMobileDevice();

  // Generate share content
  const shareContent = useMemo<ShareContent>(() => {
    const messages = generateShareMessage(provider, language);
    const trackableUrl = buildTrackableUrl(currentUrl, 'native', trackingParams);

    return {
      url: trackableUrl,
      title: `${provider.fullName} - ${provider.type === 'lawyer' ? 'Lawyer' : 'Expat Expert'}`,
      description: messages.long,
      hashtags: messages.hashtags,
      image: provider.profilePhoto,
      via: 'SOSExpat',
    };
  }, [provider, currentUrl, language, trackingParams]);

  // Get platform configurations
  const platforms = useMemo(() =>
    getPlatformConfigs(shareContent, language)
      .filter(p => isMobile ? !p.desktopOnly : !p.mobileOnly)
      .sort((a, b) => a.priority - b.priority),
    [shareContent, language, isMobile]
  );

  // Track share event
  const trackShare = useCallback((platform: SocialPlatform) => {
    if (onShare) {
      onShare({
        platform,
        providerId: provider.id,
        providerType: provider.type,
        url: currentUrl,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        referrer: document.referrer,
      });
    }
  }, [onShare, provider, currentUrl]);

  // Handle native share
  const handleNativeShare = useCallback(async () => {
    if (canUseNativeShare()) {
      try {
        await navigator.share({
          title: shareContent.title,
          text: shareContent.description,
          url: shareContent.url,
        });
        trackShare('native');
      } catch (err) {
        // User cancelled or error - fall back to bottom sheet
        if ((err as Error).name !== 'AbortError') {
          setShowBottomSheet(true);
        }
      }
    } else {
      setShowBottomSheet(true);
    }
  }, [shareContent, trackShare]);

  // Handle platform-specific share
  const handlePlatformShare = useCallback((platform: SocialPlatform, customMessage?: string) => {
    const platformConfig = platforms.find(p => p.id === platform);
    if (!platformConfig) return;

    const trackableUrl = buildTrackableUrl(currentUrl, platform, trackingParams);
    const updatedContent = customMessage
      ? { ...shareContent, description: customMessage, url: trackableUrl }
      : { ...shareContent, url: trackableUrl };

    const shareUrl = platformConfig.buildUrl(updatedContent);

    if (platform === 'copy' || platform === 'instagram' || platform === 'tiktok') {
      const textToCopy = platform === 'copy'
        ? trackableUrl
        : `${updatedContent.description}\n\n${trackableUrl}`;

      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopiedPlatform(platform);
        setTimeout(() => setCopiedPlatform(null), 2000);
      });
    } else if (platform === 'qrcode') {
      setShowQRModal(true);
    } else {
      window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
    }

    trackShare(platform);
    setShowBottomSheet(false);
  }, [platforms, shareContent, currentUrl, trackingParams, trackShare]);

  // Render compact variant (single button)
  if (variant === 'compact') {
    return (
      <>
        <button
          onClick={handleNativeShare}
          className={`inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors ${className}`}
          aria-label={intl.formatMessage({ id: 'socialShare.share', defaultMessage: 'Share' })}
        >
          <Share2 size={18} />
          {showLabel && (
            <span className="text-sm font-medium">
              <FormattedMessage id="socialShare.share" defaultMessage="Share" />
            </span>
          )}
        </button>

        <ShareBottomSheet
          isOpen={showBottomSheet}
          onClose={() => setShowBottomSheet(false)}
          content={shareContent}
          platforms={platforms}
          onShare={handlePlatformShare}
          provider={provider}
          language={language}
        />

        <QRCodeModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          url={shareContent.url}
          providerName={provider.fullName}
        />
      </>
    );
  }

  // Render inline variant (horizontal row without labels)
  if (variant === 'inline') {
    const inlinePlatforms = platforms.filter(p =>
      ['whatsapp', 'facebook', 'twitter', 'linkedin', 'copy'].includes(p.id)
    );

    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {inlinePlatforms.map((platform) => (
          <PlatformButton
            key={platform.id}
            platform={platform}
            onClick={() => handlePlatformShare(platform.id)}
            size="sm"
            isCopied={copiedPlatform === platform.id}
          />
        ))}
      </div>
    );
  }

  // Render full variant (different for mobile vs desktop)
  return (
    <div className={className}>
      {/* Mobile: Single share button */}
      {isMobile ? (
        <>
          <button
            onClick={handleNativeShare}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-2xl font-semibold text-lg hover:from-gray-700 hover:to-gray-800 transition-all shadow-lg active:scale-98"
          >
            <Share2 size={22} />
            <FormattedMessage id="socialShare.shareThisProfile" defaultMessage="Share this profile" />
          </button>

          <ShareBottomSheet
            isOpen={showBottomSheet}
            onClose={() => setShowBottomSheet(false)}
            content={shareContent}
            platforms={platforms}
            onShare={handlePlatformShare}
            provider={provider}
            language={language}
          />
        </>
      ) : (
        /* Desktop: Horizontal row with all options */
        <div className="space-y-4">
          {showLabel && (
            <p className="text-sm font-medium text-gray-500">
              <FormattedMessage id="socialShare.share" defaultMessage="Share" />
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {platforms.slice(0, 8).map((platform) => (
              <PlatformButton
                key={platform.id}
                platform={platform}
                onClick={() => handlePlatformShare(platform.id)}
                isCopied={copiedPlatform === platform.id}
              />
            ))}

            {/* More options dropdown indicator */}
            {platforms.length > 8 && (
              <button
                onClick={() => setShowBottomSheet(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                aria-label="More sharing options"
              >
                <ChevronDown size={20} />
              </button>
            )}
          </div>
        </div>
      )}

      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        url={shareContent.url}
        providerName={provider.fullName}
      />

      {/* Desktop bottom sheet for "more" options */}
      {!isMobile && (
        <ShareBottomSheet
          isOpen={showBottomSheet}
          onClose={() => setShowBottomSheet(false)}
          content={shareContent}
          platforms={platforms}
          onShare={handlePlatformShare}
          provider={provider}
          language={language}
        />
      )}
    </div>
  );
};

/* ===================================================================== */
/* EXPORTS                                                               */
/* ===================================================================== */

export default SocialShare;

// Re-export types for external use
export type {
  ShareBottomSheetProps,
  QRCodeModalProps,
  PlatformButtonProps,
};
