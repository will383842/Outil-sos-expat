/**
 * WhatsAppGroupScreen - Ecran post-inscription pour rejoindre le groupe WhatsApp
 * Design sombre harmonise avec les pages d'inscription, mobile-first
 * Scalable : fonctionne pour tous les roles (chatter, influencer, blogger, groupAdmin, client, lawyer, expat)
 *
 * Corrections 2026-03-14 :
 * - P0: <a href> natif au lieu de window.open() (deep link mobile)
 * - P1: Fond sombre harmonise avec les pages d'inscription
 * - P1: Taille tactile 44px minimum sur tous les boutons
 * - P1: Hover/active/focus sur le CTA
 * - P1: Auto-redirect 8s apres clic
 * - P2: Animation d'entree fade-in + slide-up
 * - P2: Overflow-y-auto pour petits ecrans
 * - P2: safe-area-inset pour iPhone notch
 * - P2: Etats visuels differencies (invitation vs succes)
 */

import React, { useState, useEffect, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { ArrowRight, Loader2, MessageCircle, Shield, Zap, Users, Globe, Briefcase } from 'lucide-react';
import { getWhatsAppGroupsConfig, findGroupForUser, trackWhatsAppGroupClick } from './whatsappGroupsService';
import type { WhatsAppGroup, WhatsAppRole } from './types';

/** Icones par role — 3 icones par role, adaptees au contexte */
const ROLE_ICONS: Record<WhatsAppRole, [React.ReactNode, React.ReactNode, React.ReactNode]> = {
  chatter: [
    <Zap className="w-5 h-5 text-[#25D366]" />,
    <MessageCircle className="w-5 h-5 text-[#25D366]" />,
    <Shield className="w-5 h-5 text-[#25D366]" />,
  ],
  influencer: [
    <Globe className="w-5 h-5 text-[#25D366]" />,
    <Users className="w-5 h-5 text-[#25D366]" />,
    <Zap className="w-5 h-5 text-[#25D366]" />,
  ],
  blogger: [
    <Globe className="w-5 h-5 text-[#25D366]" />,
    <MessageCircle className="w-5 h-5 text-[#25D366]" />,
    <Zap className="w-5 h-5 text-[#25D366]" />,
  ],
  groupAdmin: [
    <Users className="w-5 h-5 text-[#25D366]" />,
    <Zap className="w-5 h-5 text-[#25D366]" />,
    <Shield className="w-5 h-5 text-[#25D366]" />,
  ],
  client: [
    <Globe className="w-5 h-5 text-[#25D366]" />,
    <Zap className="w-5 h-5 text-[#25D366]" />,
    <Users className="w-5 h-5 text-[#25D366]" />,
  ],
  lawyer: [
    <Briefcase className="w-5 h-5 text-[#25D366]" />,
    <Users className="w-5 h-5 text-[#25D366]" />,
    <Zap className="w-5 h-5 text-[#25D366]" />,
  ],
  expat: [
    <Users className="w-5 h-5 text-[#25D366]" />,
    <Globe className="w-5 h-5 text-[#25D366]" />,
    <Zap className="w-5 h-5 text-[#25D366]" />,
  ],
};

/** Duree auto-redirect apres clic (ms) */
const AUTO_REDIRECT_DELAY = 8000;

interface WhatsAppGroupScreenProps {
  /** UID de l'utilisateur */
  userId: string;
  /** Role de l'affilie */
  role: WhatsAppRole;
  /** Langue de l'utilisateur (ex: "fr", "en") */
  language: string;
  /** Pays de l'utilisateur (code ISO, ex: "FR", "CM") */
  country: string;
  /** Callback quand le user continue vers le dashboard */
  onContinue: () => void;
}

/** Icone WhatsApp SVG reutilisable */
export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

/** CSS keyframes pour les animations */
const animationStyles = `
@keyframes wa-fade-in-up {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes wa-checkmark-draw {
  from { stroke-dashoffset: 30; }
  to { stroke-dashoffset: 0; }
}
@keyframes wa-countdown-bar {
  from { width: 100%; }
  to { width: 0%; }
}
.wa-animate-in { animation: wa-fade-in-up 0.5s ease-out both; }
.wa-animate-in-delay { animation: wa-fade-in-up 0.5s ease-out 0.15s both; }
.wa-checkmark-animated { stroke-dasharray: 30; animation: wa-checkmark-draw 0.6s ease-out 0.2s both; }
.wa-countdown-bar { animation: wa-countdown-bar ${AUTO_REDIRECT_DELAY}ms linear both; }
@media (prefers-reduced-motion: reduce) {
  .wa-animate-in, .wa-animate-in-delay, .wa-checkmark-animated { animation: none !important; opacity: 1; }
}
`;

const WhatsAppGroupScreen: React.FC<WhatsAppGroupScreenProps> = ({
  userId,
  role,
  language,
  country,
  onContinue,
}) => {
  const intl = useIntl();
  const [group, setGroup] = useState<WhatsAppGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [clicked, setClicked] = useState(false);
  const [countdown, setCountdown] = useState(Math.ceil(AUTO_REDIRECT_DELAY / 1000));
  const hasSkipped = useRef(false);
  const linkRef = useRef<HTMLAnchorElement>(null);

  // Charger la config et trouver le bon groupe
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const config = await getWhatsAppGroupsConfig();
      if (cancelled) return;
      if (config) {
        const found = findGroupForUser(config, role, language, country);
        setGroup(found);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [role, language, country]);

  // Skip si pas de groupe configure
  useEffect(() => {
    if (!loading && !group && !hasSkipped.current) {
      hasSkipped.current = true;
      onContinue();
    }
  }, [loading, group, onContinue]);

  // Auto-redirect apres clic avec countdown
  useEffect(() => {
    if (!clicked) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onContinue();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [clicked, onContinue]);

  // Handler clic: tracker en fire-and-forget, le lien <a> gere l'ouverture
  const handleJoinClick = () => {
    if (!group || !group.link) return;
    setClicked(true);
    // Fire-and-forget — ne pas await pour ne pas bloquer le contexte de clic
    trackWhatsAppGroupClick(role, userId, group.id, country).catch((err) => {
      console.error('[WhatsApp Groups] Tracking click failed:', err);
    });
  };

  // Inject animation styles
  useEffect(() => {
    const id = 'wa-group-screen-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = animationStyles;
    document.head.appendChild(style);
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  // Pas de groupe -> ne rien render (onContinue sera appele par l'effect)
  if (!loading && !group) return null;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-b from-gray-950 via-gray-950 to-black px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] overflow-y-auto">
      <div className="max-w-md w-full">
        {loading ? (
          /* ===== ETAT LOADING ===== */
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-gray-500 mx-auto mb-4 animate-spin" />
            <p className="text-gray-400 text-sm">
              <FormattedMessage id="whatsapp.loading" defaultMessage="Chargement..." />
            </p>
          </div>
        ) : clicked ? (
          /* ===== ETAT APRES CLIC — Design differencie ===== */
          <div className="text-center wa-animate-in">
            {/* Grand logo WhatsApp anime */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#25D366]/20 flex items-center justify-center">
              <WhatsAppIcon className="w-10 h-10 text-[#25D366]" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              <FormattedMessage id="whatsapp.success.title" defaultMessage="Inscription terminée !" />
            </h2>
            <p className="text-gray-400 text-base mb-8 leading-relaxed max-w-xs mx-auto">
              <FormattedMessage
                id="whatsapp.success.subtitle"
                defaultMessage="WhatsApp s'est ouvert. Rejoignez le groupe puis revenez ici."
              />
            </p>

            {/* Barre de countdown */}
            <div className="w-full h-1 bg-white/10 rounded-full mb-2 overflow-hidden">
              <div className="h-full bg-[#25D366] rounded-full wa-countdown-bar" />
            </div>
            <p className="text-gray-500 text-xs mb-6">
              <FormattedMessage
                id="whatsapp.success.redirect"
                defaultMessage="Redirection automatique dans {seconds}s..."
                values={{ seconds: countdown }}
              />
            </p>

            {/* CTA vers dashboard */}
            <button
              onClick={onContinue}
              className="w-full py-4 min-h-[48px] bg-white text-gray-900 font-semibold rounded-xl flex items-center justify-center gap-2 text-base hover:bg-gray-100 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
            >
              <FormattedMessage id="whatsapp.success.continue" defaultMessage="Mon tableau de bord" />
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          /* ===== ETAT PRINCIPAL — INVITATION ===== */
          <div className="text-center wa-animate-in">
            {/* Grand logo WhatsApp */}
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[#25D366]/20 flex items-center justify-center wa-animate-in">
              <WhatsAppIcon className="w-8 h-8 text-[#25D366]" />
            </div>

            {/* Badge discret */}
            <span className="inline-block px-3 py-1 rounded-full bg-green-500/10 text-[#25D366] text-xs font-medium mb-6 wa-animate-in-delay">
              <FormattedMessage id="whatsapp.badge.registered" defaultMessage="Compte créé avec succès" />
            </span>

            {/* Titre */}
            <h2 className="text-2xl font-bold text-white mb-2">
              <FormattedMessage id="whatsapp.join.title" defaultMessage="Dernière étape !" />
            </h2>

            {/* Sous-titre */}
            <p className="text-gray-400 text-base mb-6 leading-relaxed">
              <FormattedMessage
                id="whatsapp.join.subtitle"
                defaultMessage="Rejoignez le groupe {groupName}"
                values={{
                  groupName: <span className="text-white font-semibold">{group?.name}</span>,
                }}
              />
            </p>

            {/* Separateur */}
            <div className="w-full h-px bg-white/10 mb-6" />

            {/* 3 benefices — adaptes par role */}
            {(() => {
              const icons = ROLE_ICONS[role];
              return (
                <ul className="space-y-4 mb-8 text-left">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 mt-0.5">{icons[i]}</span>
                      <div>
                        <p className="text-white font-semibold text-sm">
                          {intl.formatMessage({ id: `whatsapp.${role}.benefit${i + 1}.title` })}
                        </p>
                        <p className="text-gray-500 text-sm leading-relaxed">
                          {intl.formatMessage({ id: `whatsapp.${role}.benefit${i + 1}.desc` })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              );
            })()}

            {/* Bouton rejoindre — <a href> natif pour deep link mobile */}
            <a
              ref={linkRef}
              href={group?.link || '#'}
              rel="noopener noreferrer"
              onClick={handleJoinClick}
              className="w-full py-4 min-h-[48px] bg-[#25D366] hover:bg-[#1fba59] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#25D366]/50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 text-base transition-all"
            >
              <WhatsAppIcon className="w-5 h-5" />
              <FormattedMessage id="whatsapp.join.button" defaultMessage="Rejoindre le groupe WhatsApp" />
            </a>

            {/* Lien passer discret — taille tactile 44px */}
            <button
              onClick={onContinue}
              className="mt-5 py-2 min-h-[44px] px-4 text-gray-500 hover:text-gray-300 text-sm inline-flex items-center gap-1 transition-colors"
            >
              <FormattedMessage id="whatsapp.join.skip" defaultMessage="Passer cette étape" />
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppGroupScreen;
