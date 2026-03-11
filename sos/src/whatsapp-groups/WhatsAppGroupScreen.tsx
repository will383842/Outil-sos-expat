/**
 * WhatsAppGroupScreen - Écran post-inscription pour rejoindre le groupe WhatsApp
 * Mobile-first, design 2026, animations fluides
 * Scalable : fonctionne pour tous les rôles (chatter, influencer, blogger, groupAdmin)
 */

import React, { useState, useEffect, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { ArrowRight, Loader2, MessageCircle, Shield, Zap, Users, Globe, Briefcase } from 'lucide-react';
import { getWhatsAppGroupsConfig, findGroupForUser, trackWhatsAppGroupClick } from './whatsappGroupsService';
import type { WhatsAppGroup, WhatsAppRole, WhatsAppRoleCategory } from './types';
import { ROLE_CATEGORY } from './types';

/** Icônes par catégorie de rôle */
const ROLE_ICONS: Record<WhatsAppRoleCategory, [React.ReactNode, React.ReactNode, React.ReactNode]> = {
  affiliate: [
    <Zap className="w-4 h-4 text-[#25D366]" />,
    <MessageCircle className="w-4 h-4 text-[#25D366]" />,
    <Shield className="w-4 h-4 text-[#25D366]" />,
  ],
  client: [
    <Globe className="w-4 h-4 text-[#25D366]" />,
    <Zap className="w-4 h-4 text-[#25D366]" />,
    <Users className="w-4 h-4 text-[#25D366]" />,
  ],
  provider: [
    <Briefcase className="w-4 h-4 text-[#25D366]" />,
    <Users className="w-4 h-4 text-[#25D366]" />,
    <Zap className="w-4 h-4 text-[#25D366]" />,
  ],
};

interface WhatsAppGroupScreenProps {
  /** UID de l'utilisateur */
  userId: string;
  /** Rôle de l'affilié */
  role: WhatsAppRole;
  /** Langue de l'utilisateur (ex: "fr", "en") */
  language: string;
  /** Pays de l'utilisateur (code ISO, ex: "FR", "CM") */
  country: string;
  /** Callback quand le user continue vers le dashboard */
  onContinue: () => void;
}

/** Icône WhatsApp SVG réutilisable */
export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

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
  const [animateIn, setAnimateIn] = useState(false);
  const hasSkipped = useRef(false);

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
      // Animation d'entrée
      requestAnimationFrame(() => {
        if (!cancelled) setAnimateIn(true);
      });
    })();
    return () => { cancelled = true; };
  }, [role, language, country]);

  // Skip si pas de groupe configuré
  useEffect(() => {
    if (!loading && !group && !hasSkipped.current) {
      hasSkipped.current = true;
      onContinue();
    }
  }, [loading, group, onContinue]);

  const handleJoinClick = async () => {
    if (!group || !group.link) return;

    // Ouvrir le lien WhatsApp dans un nouvel onglet
    window.open(group.link, '_blank', 'noopener,noreferrer');

    // Tracker le clic dans Firestore
    setClicked(true);
    await trackWhatsAppGroupClick(role, userId, group.id, country);
  };

  // Pas de groupe → ne rien render (onContinue sera appelé par l'effect)
  if (!loading && !group) return null;

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-b from-red-950 via-gray-950 to-black px-4 py-8 safe-area-inset">
      {/* Fond animé */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(37,211,102,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(37,211,102,0.04),transparent_40%)]" />
      </div>

      <div className={`max-w-md w-full relative z-10 transition-all duration-700 ease-out ${
        animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}>
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#25D366]/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#25D366] animate-spin" />
            </div>
            <p className="text-gray-400 text-sm">
              <FormattedMessage id="whatsapp.loading" defaultMessage="Chargement..." />
            </p>
          </div>
        ) : clicked ? (
          /* ===== ÉTAT APRÈS CLIC ===== */
          <div className="text-center animate-in fade-in duration-500">
            {/* Checkmark animé */}
            <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-[#25D366]/30 to-[#128C7E]/20 border border-[#25D366]/30 flex items-center justify-center backdrop-blur-sm">
              <svg className="w-12 h-12 text-[#25D366]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" className="animate-[draw_0.5s_ease-out_forwards]" style={{ strokeDasharray: 24, strokeDashoffset: 0 }} />
              </svg>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-tight">
              <FormattedMessage id="whatsapp.success.title" defaultMessage="Inscription terminée !" />
            </h2>
            <p className="text-gray-400 text-base sm:text-lg mb-10 leading-relaxed max-w-xs mx-auto">
              <FormattedMessage
                id="whatsapp.success.subtitle"
                defaultMessage="WhatsApp s'est ouvert. Rejoignez le groupe puis revenez ici."
              />
            </p>

            {/* CTA vers dashboard */}
            <button
              onClick={onContinue}
              className="w-full py-4 sm:py-5 bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-extrabold rounded-2xl flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-amber-400/20 active:scale-[0.98] transition-all text-base sm:text-lg min-h-[56px]"
            >
              <FormattedMessage id="whatsapp.success.continue" defaultMessage="Mon tableau de bord" />
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          /* ===== ÉTAT PRINCIPAL — INVITATION ===== */
          <div className="text-center">
            {/* Badge "Inscription reussie" */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium mb-6">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <FormattedMessage id="whatsapp.badge.registered" defaultMessage="Compte créé avec succès" />
            </div>

            {/* WhatsApp icon grand */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-8 rounded-[28px] bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center shadow-2xl shadow-[#25D366]/20 animate-[bounce-subtle_3s_ease-in-out_infinite]">
              <WhatsAppIcon className="w-12 h-12 sm:w-14 sm:h-14 text-white" />
            </div>

            {/* Titre */}
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-tight leading-tight">
              <FormattedMessage id="whatsapp.join.title" defaultMessage="Dernière étape !" />
            </h2>

            <p className="text-gray-300 text-base sm:text-lg mb-2 leading-relaxed">
              <FormattedMessage
                id="whatsapp.join.subtitle"
                defaultMessage="Rejoignez le groupe {groupName}"
                values={{
                  groupName: <span className="text-[#25D366] font-semibold">{group?.name}</span>,
                }}
              />
            </p>

            {/* Avantages — 3 points différenciés par catégorie de rôle (i18n) */}
            {(() => {
              const category = ROLE_CATEGORY[role] || 'affiliate';
              const icons = ROLE_ICONS[category];
              return (
                <div className="grid grid-cols-1 gap-3 mb-8 mt-6 text-left">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-start gap-3 p-3 sm:p-4 rounded-xl bg-white/5 border border-white/5">
                      <div className="w-9 h-9 rounded-lg bg-[#25D366]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {icons[i]}
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm sm:text-base">
                          {intl.formatMessage({ id: `whatsapp.${category}.benefit${i + 1}.title` })}
                        </p>
                        <p className="text-gray-500 text-xs sm:text-sm">
                          {intl.formatMessage({ id: `whatsapp.${category}.benefit${i + 1}.desc` })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Bouton rejoindre — large, touch-friendly */}
            <button
              onClick={handleJoinClick}
              className="w-full py-4 sm:py-5 bg-[#25D366] hover:bg-[#20BD5A] active:scale-[0.98] text-white font-extrabold rounded-2xl flex items-center justify-center gap-3 transition-all text-base sm:text-lg shadow-xl shadow-[#25D366]/20 hover:shadow-2xl hover:shadow-[#25D366]/30 min-h-[56px]"
            >
              <WhatsAppIcon className="w-6 h-6" />
              <FormattedMessage id="whatsapp.join.button" defaultMessage="Rejoindre le groupe WhatsApp" />
            </button>

            {/* Bouton passer — discret mais accessible */}
            <button
              onClick={onContinue}
              className="mt-6 py-3 px-6 text-gray-500 hover:text-gray-300 text-sm transition-colors min-h-[44px]"
            >
              <FormattedMessage id="whatsapp.join.skip" defaultMessage="Passer et aller au tableau de bord" />
            </button>
          </div>
        )}
      </div>

      {/* CSS pour animation subtle bounce */}
      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
};

export default WhatsAppGroupScreen;
