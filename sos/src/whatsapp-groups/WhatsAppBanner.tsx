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
    <div className="relative rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-4 mb-4">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-emerald-400 dark:text-emerald-600 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pr-8">
        <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
          <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
        </div>

        <p className="text-sm text-emerald-800 dark:text-emerald-200 flex-1">
          <FormattedMessage
            id="whatsapp.dashboard.banner"
            defaultMessage="Rejoignez notre groupe WhatsApp pour recevoir des astuces et echanger avec la communaute !"
          />
        </p>

        <button
          onClick={handleJoin}
          className="px-4 py-2 bg-[#25D366] text-white text-sm font-semibold rounded-lg whitespace-nowrap min-h-[44px]"
        >
          <FormattedMessage
            id="whatsapp.dashboard.banner.button"
            defaultMessage="Rejoindre"
          />
        </button>
      </div>
    </div>
  );
};

export default WhatsAppBanner;
