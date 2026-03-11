/**
 * WhatsAppGroupScreen - Ecran post-inscription pour rejoindre le groupe WhatsApp
 * Design epure 2026 sur fond blanc, mobile-first
 * Scalable : fonctionne pour tous les roles (chatter, influencer, blogger, groupAdmin)
 */

import React, { useState, useEffect, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { ArrowRight, Loader2, MessageCircle, Shield, Zap, Users, Globe, Briefcase } from 'lucide-react';
import { getWhatsAppGroupsConfig, findGroupForUser, trackWhatsAppGroupClick } from './whatsappGroupsService';
import type { WhatsAppGroup, WhatsAppRole, WhatsAppRoleCategory } from './types';
import { ROLE_CATEGORY } from './types';

/** Icones par categorie de role */
const ROLE_ICONS: Record<WhatsAppRoleCategory, [React.ReactNode, React.ReactNode, React.ReactNode]> = {
  affiliate: [
    <Zap className="w-5 h-5 text-[#25D366]" />,
    <MessageCircle className="w-5 h-5 text-[#25D366]" />,
    <Shield className="w-5 h-5 text-[#25D366]" />,
  ],
  client: [
    <Globe className="w-5 h-5 text-[#25D366]" />,
    <Zap className="w-5 h-5 text-[#25D366]" />,
    <Users className="w-5 h-5 text-[#25D366]" />,
  ],
  provider: [
    <Briefcase className="w-5 h-5 text-[#25D366]" />,
    <Users className="w-5 h-5 text-[#25D366]" />,
    <Zap className="w-5 h-5 text-[#25D366]" />,
  ],
};

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

  const handleJoinClick = async () => {
    if (!group || !group.link) return;

    // Ouvrir le lien WhatsApp dans un nouvel onglet
    window.open(group.link, '_blank', 'noopener,noreferrer');

    // Tracker le clic dans Firestore
    setClicked(true);
    await trackWhatsAppGroupClick(role, userId, group.id, country);
  };

  // Pas de groupe -> ne rien render (onContinue sera appele par l'effect)
  if (!loading && !group) return null;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-white dark:bg-zinc-950 px-4 py-8">
      <div className="max-w-md w-full">
        {loading ? (
          /* ===== ETAT LOADING ===== */
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-zinc-400 dark:text-zinc-500 mx-auto mb-4 animate-spin" />
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              <FormattedMessage id="whatsapp.loading" defaultMessage="Chargement..." />
            </p>
          </div>
        ) : clicked ? (
          /* ===== ETAT APRES CLIC ===== */
          <div className="text-center">
            {/* Checkmark vert */}
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#25D366]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
              <FormattedMessage id="whatsapp.success.title" defaultMessage="Inscription terminée !" />
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-base mb-10 leading-relaxed max-w-xs mx-auto">
              <FormattedMessage
                id="whatsapp.success.subtitle"
                defaultMessage="WhatsApp s'est ouvert. Rejoignez le groupe puis revenez ici."
              />
            </p>

            {/* CTA vers dashboard */}
            <button
              onClick={onContinue}
              className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold rounded-xl flex items-center justify-center gap-2 text-base"
            >
              <FormattedMessage id="whatsapp.success.continue" defaultMessage="Mon tableau de bord" />
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          /* ===== ETAT PRINCIPAL — INVITATION ===== */
          <div className="text-center">
            {/* Icone checkmark */}
            <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
              <svg className="w-7 h-7 text-[#25D366]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            {/* Badge discret */}
            <span className="inline-block px-3 py-1 rounded-full bg-green-50 dark:bg-green-950/30 text-[#25D366] text-xs font-medium mb-6">
              <FormattedMessage id="whatsapp.badge.registered" defaultMessage="Compte créé avec succès" />
            </span>

            {/* Titre */}
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
              <FormattedMessage id="whatsapp.join.title" defaultMessage="Dernière étape !" />
            </h2>

            {/* Sous-titre */}
            <p className="text-zinc-500 dark:text-zinc-400 text-base mb-6 leading-relaxed">
              <FormattedMessage
                id="whatsapp.join.subtitle"
                defaultMessage="Rejoignez le groupe {groupName}"
                values={{
                  groupName: <span className="text-zinc-900 dark:text-white font-semibold">{group?.name}</span>,
                }}
              />
            </p>

            {/* Separateur */}
            <div className="w-full h-px bg-zinc-100 dark:bg-zinc-800 mb-6" />

            {/* 3 benefices — liste simple */}
            {(() => {
              const category = ROLE_CATEGORY[role] || 'affiliate';
              const icons = ROLE_ICONS[category];
              return (
                <ul className="space-y-4 mb-8 text-left">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 mt-0.5">{icons[i]}</span>
                      <div>
                        <p className="text-zinc-900 dark:text-white font-semibold text-sm">
                          {intl.formatMessage({ id: `whatsapp.${category}.benefit${i + 1}.title` })}
                        </p>
                        <p className="text-zinc-400 dark:text-zinc-500 text-sm leading-relaxed">
                          {intl.formatMessage({ id: `whatsapp.${category}.benefit${i + 1}.desc` })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              );
            })()}

            {/* Bouton rejoindre */}
            <button
              onClick={handleJoinClick}
              className="w-full py-4 bg-[#25D366] text-white font-semibold rounded-xl flex items-center justify-center gap-2 text-base"
            >
              <WhatsAppIcon className="w-5 h-5" />
              <FormattedMessage id="whatsapp.join.button" defaultMessage="Rejoindre le groupe WhatsApp" />
            </button>

            {/* Lien passer discret */}
            <button
              onClick={onContinue}
              className="mt-5 py-2 text-zinc-400 dark:text-zinc-500 text-sm inline-flex items-center gap-1"
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
