/**
 * WhatsAppBanner - Bandeau dashboard pour rejoindre le groupe WhatsApp
 * S'affiche pour les users qui n'ont pas encore rejoint le groupe
 *
 * v2 — Audit 2026-04 :
 * - Le dismiss expire apres 7 jours (revient chaque semaine)
 * - Detection mobile/desktop pour adapter le message
 * - Messaging plus engageant
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import { X, Smartphone, Monitor } from 'lucide-react';
import { getWhatsAppGroupsConfig, findGroupForUser, trackWhatsAppGroupClick } from './whatsappGroupsService';
import { WhatsAppIcon } from './WhatsAppGroupScreen';
import type { WhatsAppGroup, WhatsAppRole } from './types';

/** Duree du dismiss en ms (7 jours) */
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

interface WhatsAppBannerProps {
  userId: string;
  role: WhatsAppRole;
  language: string;
  country: string;
  /** Si true, le user a deja clique → ne pas afficher */
  alreadyClicked?: boolean;
}

/** Detecte si on est sur mobile */
function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
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
  const mobile = isMobileDevice();

  useEffect(() => {
    if (alreadyClicked) return;

    // Verifier si le dismiss est encore actif (expire apres 7 jours)
    const dismissKey = `whatsapp_banner_dismissed_${userId}`;
    const dismissedAt = localStorage.getItem(dismissKey);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < DISMISS_DURATION_MS) {
        setDismissed(true);
        return;
      }
      // Expire → supprimer et re-afficher
      localStorage.removeItem(dismissKey);
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

  const handleJoinClick = () => {
    setClicked(true);
    trackWhatsAppGroupClick(role, userId, group.id, country).catch(() => {});
  };

  const handleDismiss = () => {
    setDismissed(true);
    // Stocker le timestamp au lieu d'un simple flag → expire apres 7 jours
    localStorage.setItem(`whatsapp_banner_dismissed_${userId}`, String(Date.now()));
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

        <div className="flex-1">
          <p className="text-sm text-emerald-800 dark:text-emerald-200">
            <FormattedMessage
              id="whatsapp.dashboard.banner"
              defaultMessage="Rejoignez notre groupe WhatsApp pour recevoir des astuces et echanger avec la communaute !"
            />
          </p>
          {/* Indicateur device discret */}
          <p className="text-xs text-emerald-600/60 dark:text-emerald-400/40 mt-0.5 flex items-center gap-1">
            {mobile ? (
              <>
                <Smartphone className="w-3 h-3" />
                <FormattedMessage id="whatsapp.banner.device.mobile" defaultMessage="S'ouvre dans WhatsApp" />
              </>
            ) : (
              <>
                <Monitor className="w-3 h-3" />
                <FormattedMessage id="whatsapp.banner.device.desktop" defaultMessage="S'ouvre dans WhatsApp Web" />
              </>
            )}
          </p>
        </div>

        {/* <a href target="_blank"> pour deep link mobile ET desktop */}
        <a
          href={group.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleJoinClick}
          className="px-4 py-2 bg-[#25D366] hover:bg-[#1fba59] active:scale-[0.98] text-white text-sm font-semibold rounded-lg whitespace-nowrap min-h-[44px] inline-flex items-center transition-all"
        >
          <FormattedMessage
            id="whatsapp.dashboard.banner.button"
            defaultMessage="Rejoindre"
          />
        </a>
      </div>
    </div>
  );
};

export default WhatsAppBanner;
