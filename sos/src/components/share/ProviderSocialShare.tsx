// src/components/share/ProviderSocialShare.tsx
// 🚀 Ultra-simple, mobile-first share component (2025-2026)
// Design: Web Share API first, minimal options, fun messages, instant gratification

import React, { useState, useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { Check, Link2, Mail, MoreHorizontal, X, QrCode } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type SocialPlatform = 'whatsapp' | 'copy' | 'email' | 'native' | 'qrcode';

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
// FUN MESSAGES - Platform-specific, viral-worthy copy
// ============================================================================

const getShareMessages = (lang: string) => {
  const messages: Record<string, { whatsapp: string; email: string; native: string }> = {
    fr: {
      whatsapp: "Heyyyy 👋 J'ai trouvé LA pépite pour tes galères d'expat !\n\n{name} - {specialty}\n⭐ {rating}/5\n\nÇa m'a sauvé la vie, je te partage 👇",
      email: "Un contact en or 🌟\n\nSalut !\n\n{name} est spécialisé(e) en {specialty}.\nNote : {rating}/5 ⭐\n\nVraiment quelqu'un de confiance pour les expats !",
      native: "🌟 {name} - {specialty} ⭐{rating}/5\nLe contact qui m'a sauvé !",
    },
    en: {
      whatsapp: "Heyyyy 👋 Found THE gem for your expat struggles!\n\n{name} - {specialty}\n⭐ {rating}/5\n\nLiterally saved my life, sharing with you 👇",
      email: "A golden contact 🌟\n\nHi!\n\n{name} specializes in {specialty}.\nRating: {rating}/5 ⭐\n\nSomeone you can really trust for expat stuff!",
      native: "🌟 {name} - {specialty} ⭐{rating}/5\nThe contact that saved me!",
    },
    es: {
      whatsapp: "Heyyyy 👋 ¡Encontré LA joya para tus problemas de expat!\n\n{name} - {specialty}\n⭐ {rating}/5\n\nMe salvó la vida, te lo comparto 👇",
      email: "Un contacto de oro 🌟\n\n¡Hola!\n\n{name} se especializa en {specialty}.\nNota: {rating}/5 ⭐\n\n¡Alguien de confianza para expats!",
      native: "🌟 {name} - {specialty} ⭐{rating}/5\n¡El contacto que me salvó!",
    },
    de: {
      whatsapp: "Heyyyy 👋 Ich hab DEN Geheimtipp für deine Expat-Probleme!\n\n{name} - {specialty}\n⭐ {rating}/5\n\nHat mir das Leben gerettet 👇",
      email: "Ein goldener Kontakt 🌟\n\nHi!\n\n{name} ist spezialisiert auf {specialty}.\nBewertung: {rating}/5 ⭐\n\nEcht vertrauenswürdig für Expats!",
      native: "🌟 {name} - {specialty} ⭐{rating}/5\nDer Kontakt, der mich gerettet hat!",
    },
    pt: {
      whatsapp: "Heyyyy 👋 Achei A joia para seus problemas de expat!\n\n{name} - {specialty}\n⭐ {rating}/5\n\nSalvou minha vida, compartilho contigo 👇",
      email: "Um contato de ouro 🌟\n\nOi!\n\n{name} é especialista em {specialty}.\nNota: {rating}/5 ⭐\n\nAlguém de confiança para expats!",
      native: "🌟 {name} - {specialty} ⭐{rating}/5\nO contato que me salvou!",
    },
    ru: {
      whatsapp: "Привет 👋 Нашёл СУПЕР контакт для экспатов!\n\n{name} - {specialty}\n⭐ {rating}/5\n\nСпас мне жизнь, делюсь с тобой 👇",
      email: "Золотой контакт 🌟\n\nПривет!\n\n{name} специализируется на {specialty}.\nРейтинг: {rating}/5 ⭐\n\nНадёжный специалист для экспатов!",
      native: "🌟 {name} - {specialty} ⭐{rating}/5\nКонтакт, который меня спас!",
    },
    hi: {
      whatsapp: "हेलो 👋 एक्सपैट समस्याओं के लिए बेस्ट कॉन्टैक्ट मिला!\n\n{name} - {specialty}\n⭐ {rating}/5\n\nमेरी जान बचाई, तुम्हें भी शेयर कर रहा 👇",
      email: "गोल्डन कॉन्टैक्ट 🌟\n\nहाय!\n\n{name} {specialty} में स्पेशलिस्ट हैं।\nरेटिंग: {rating}/5 ⭐\n\nएक्सपैट्स के लिए भरोसेमंद!",
      native: "🌟 {name} - {specialty} ⭐{rating}/5\nजिसने मुझे बचाया!",
    },
    ar: {
      whatsapp: "مرحبا 👋 لقيت الكنز للمغتربين!\n\n{name} - {specialty}\n⭐ {rating}/5\n\nأنقذني حياتي، بشاركك 👇",
      email: "جهة اتصال ذهبية 🌟\n\nمرحبا!\n\n{name} متخصص في {specialty}.\nالتقييم: {rating}/5 ⭐\n\nشخص موثوق للمغتربين!",
      native: "🌟 {name} - {specialty} ⭐{rating}/5\nالشخص اللي أنقذني!",
    },
    zh: {
      whatsapp: "嘿 👋 找到了外派人士的宝藏联系人!\n\n{name} - {specialty}\n⭐ {rating}/5\n\n救了我的命，分享给你 👇",
      email: "黄金联系人 🌟\n\n你好!\n\n{name} 专门从事 {specialty}。\n评分: {rating}/5 ⭐\n\n外派人士的可靠专家!",
      native: "🌟 {name} - {specialty} ⭐{rating}/5\n救我的联系人!",
    },
    ch: { // Alias for zh
      whatsapp: "嘿 👋 找到了外派人士的宝藏联系人!\n\n{name} - {specialty}\n⭐ {rating}/5\n\n救了我的命，分享给你 👇",
      email: "黄金联系人 🌟\n\n你好!\n\n{name} 专门从事 {specialty}。\n评分: {rating}/5 ⭐\n\n外派人士的可靠专家!",
      native: "🌟 {name} - {specialty} ⭐{rating}/5\n救我的联系人!",
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
    navigator.vibrate(type === 'success' ? [10, 50, 10] : 10);
  }
};

// ============================================================================
// WHATSAPP ICON (Custom SVG)
// ============================================================================

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
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
  const [showQR, setShowQR] = useState(false);

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
    const url = `https://wa.me/?text=${encodeURIComponent(text + '\n\n' + shareUrl)}`;
    window.open(url, '_blank');
    onShare?.('whatsapp', true);
    setShowSheet(false);
  }, [messages, provider, shareUrl, onShare]);

  const copyLink = useCallback(async () => {
    haptic();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      haptic('success');
      onShare?.('copy', true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
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
        text: buildMessage(messages.native, provider),
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
  // MOBILE: Single magic button that uses native share
  // ============================================================================

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (isMobile) {
    return (
      <>
        {/* Magic Share Button - One tap, that's it! */}
        <button
          onClick={nativeShare}
          className="
            flex items-center gap-2 px-5 py-2.5
            bg-gradient-to-r from-violet-500 to-fuchsia-500
            text-white font-semibold text-sm
            rounded-full shadow-lg shadow-violet-500/30
            active:scale-95 transition-transform duration-150
            hover:shadow-xl hover:shadow-violet-500/40
          "
        >
          <span>Partager</span>
          <span className="text-lg">✨</span>
        </button>

        {/* Fallback Sheet (only if native share fails) */}
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
              {/* Handle */}
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6" />

              {/* Fun header */}
              <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                Spread the love! 💫
              </p>

              {/* 3 big buttons */}
              <div className="flex justify-center gap-6">
                {/* WhatsApp */}
                <button
                  onClick={shareToWhatsApp}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="
                    w-16 h-16 rounded-2xl bg-[#25D366]
                    flex items-center justify-center text-white
                    group-active:scale-90 transition-transform
                    shadow-lg shadow-green-500/30
                  ">
                    <WhatsAppIcon />
                  </div>
                  <span className="text-xs text-gray-600">WhatsApp</span>
                </button>

                {/* Copy Link */}
                <button
                  onClick={copyLink}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className={`
                    w-16 h-16 rounded-2xl
                    flex items-center justify-center
                    group-active:scale-90 transition-all
                    ${copied
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }
                  `}>
                    {copied ? <Check className="w-7 h-7" /> : <Link2 className="w-7 h-7" />}
                  </div>
                  <span className="text-xs text-gray-600">
                    {copied ? 'Copié! ✓' : 'Copier'}
                  </span>
                </button>

                {/* Email */}
                <button
                  onClick={shareByEmail}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="
                    w-16 h-16 rounded-2xl bg-indigo-500
                    flex items-center justify-center text-white
                    group-active:scale-90 transition-transform
                    shadow-lg shadow-indigo-500/30
                  ">
                    <Mail className="w-7 h-7" />
                  </div>
                  <span className="text-xs text-gray-600">Email</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CSS for animation */}
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
  // DESKTOP: Simple inline icons
  // ============================================================================

  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-400 text-sm">Partager</span>

      {/* WhatsApp */}
      <button
        onClick={shareToWhatsApp}
        className="
          w-10 h-10 rounded-full
          bg-[#25D366] text-white
          flex items-center justify-center
          hover:scale-110 active:scale-95 transition-transform
          shadow-md hover:shadow-lg
        "
        title="WhatsApp"
      >
        <WhatsAppIcon />
      </button>

      {/* Copy */}
      <button
        onClick={copyLink}
        className={`
          w-10 h-10 rounded-full
          flex items-center justify-center
          hover:scale-110 active:scale-95 transition-all
          ${copied
            ? 'bg-green-500 text-white'
            : 'bg-white/10 text-white/80 hover:bg-white/20'
          }
        `}
        title={copied ? 'Copié!' : 'Copier le lien'}
      >
        {copied ? <Check className="w-5 h-5" /> : <Link2 className="w-5 h-5" />}
      </button>

      {/* More */}
      <button
        onClick={nativeShare}
        className="
          w-10 h-10 rounded-full
          bg-white/10 text-white/80
          flex items-center justify-center
          hover:scale-110 hover:bg-white/20 active:scale-95 transition-all
        "
        title="Plus d'options"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ProviderSocialShare;
