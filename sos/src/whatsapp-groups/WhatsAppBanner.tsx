/**
 * WhatsAppBanner - Bandeau pour le dashboard chatter
 * S'affiche pour les chatters qui n'ont pas encore rejoint le groupe WhatsApp
 * Utile pour les anciens inscrits qui n'avaient pas le systeme WhatsApp
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import { X } from 'lucide-react';
import { getWhatsAppGroupsConfig, findGroupForUser, trackWhatsAppGroupClick } from './whatsappGroupsService';
import { WhatsAppIcon } from './WhatsAppGroupScreen';
import type { WhatsAppGroup, WhatsAppRole } from './types';

interface WhatsAppBannerProps {
  userId: string;
  role: WhatsAppRole;
  language: string;
  country: string;
  /** Si true, le chatter a deja clique → ne pas afficher */
  alreadyClicked?: boolean;
}

const WhatsAppBanner: React.FC<WhatsAppBannerProps> = ({
  userId,
  role,
  language,
  country,
  alreadyClicked = false,
}) => {
  const [group, setGroup] = useState<WhatsAppGroup | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [clicked, setClicked] = useState(alreadyClicked);

  useEffect(() => {
    if (alreadyClicked) return;
    // Verifier si deja dismiss dans cette session
    const dismissKey = `whatsapp_banner_dismissed_${userId}`;
    if (sessionStorage.getItem(dismissKey)) {
      setDismissed(true);
      return;
    }
    (async () => {
      const config = await getWhatsAppGroupsConfig();
      if (config) {
        const found = findGroupForUser(config, role, language, country);
        setGroup(found);
      }
    })();
  }, [userId, role, language, country, alreadyClicked]);

  if (alreadyClicked || clicked || dismissed || !group || !group.link) return null;

  const handleJoin = async () => {
    window.open(group.link, '_blank', 'noopener,noreferrer');
    setClicked(true);
    await trackWhatsAppGroupClick(role, userId, group.id, country);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(`whatsapp_banner_dismissed_${userId}`, '1');
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#25D366]/10 to-[#128C7E]/10 border border-[#25D366]/20 p-4 sm:p-5 mb-4">
      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 pr-8">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center flex-shrink-0">
          <WhatsAppIcon className="w-5 h-5 text-white" />
        </div>

        {/* Text */}
        <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">
          <FormattedMessage
            id="whatsapp.dashboard.banner"
            defaultMessage="Rejoignez notre groupe WhatsApp pour recevoir des astuces et echanger avec la communaute !"
          />
        </p>

        {/* CTA */}
        <button
          onClick={handleJoin}
          className="px-4 py-2.5 bg-[#25D366] hover:bg-[#20BD5A] text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap min-h-[44px] flex items-center gap-2"
        >
          <WhatsAppIcon className="w-4 h-4" />
          <FormattedMessage
            id="whatsapp.dashboard.banner.button"
            defaultMessage="Rejoindre le groupe"
          />
        </button>
      </div>
    </div>
  );
};

export default WhatsAppBanner;
