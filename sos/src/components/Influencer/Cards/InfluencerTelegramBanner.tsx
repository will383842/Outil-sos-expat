/**
 * InfluencerTelegramBanner
 *
 * Bannière d'incitation Telegram dans le dashboard influenceur.
 * - Non connecté : CTA pour lier le compte + rappel des avantages
 * - Connecté     : badge de confirmation discret (masqué après 3s ou si scroll)
 *
 * Miroir fonctionnel de MicroObjectiveCard (Chatter) pour la partie Telegram.
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import { Send, Bell, Zap, CheckCircle2, X } from 'lucide-react';

interface InfluencerTelegramBannerProps {
  telegramLinked: boolean;
  onNavigateToTelegram: () => void;
}

const InfluencerTelegramBanner: React.FC<InfluencerTelegramBannerProps> = ({
  telegramLinked,
  onNavigateToTelegram,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [linkedVisible, setLinkedVisible] = useState(true);

  // Cache la bannière "connecté" après 4 secondes
  useEffect(() => {
    if (telegramLinked) {
      const t = setTimeout(() => setLinkedVisible(false), 4000);
      return () => clearTimeout(t);
    }
  }, [telegramLinked]);

  // Si déjà dismissé ou si "connecté" expiré → ne rien afficher
  if (dismissed) return null;
  if (telegramLinked && !linkedVisible) return null;

  // ─── État connecté ────────────────────────────────────────────────────────
  if (telegramLinked) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 animate-fade-in-up">
        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
        <p className="text-sm font-medium text-green-700 dark:text-green-400 flex-1">
          <FormattedMessage
            id="influencer.telegram.linked"
            defaultMessage="Telegram connecté — vous recevrez vos alertes de gains en temps réel."
          />
        </p>
        <button
          onClick={() => setLinkedVisible(false)}
          className="text-green-400 hover:text-green-600 dark:text-green-600 dark:hover:text-green-400 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ─── État non connecté ────────────────────────────────────────────────────
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-violet-500/10 border border-blue-200/60 dark:border-blue-800/60 p-4 sm:p-5 animate-fade-in-up">
      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        aria-label="Fermer"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
          <Send className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 min-w-0 pr-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
            <FormattedMessage
              id="influencer.telegram.cta.title"
              defaultMessage="Connectez Telegram — restez alerté en temps réel"
            />
          </h3>

          {/* Avantages */}
          <div className="mt-2 grid sm:grid-cols-2 gap-1.5">
            {[
              { icon: <Bell className="w-3.5 h-3.5 text-blue-500" />, text: <FormattedMessage id="influencer.telegram.benefit.alerts" defaultMessage="Alertes gains instantanées" /> },
              { icon: <Zap className="w-3.5 h-3.5 text-yellow-500" />, text: <FormattedMessage id="influencer.telegram.benefit.withdrawals" defaultMessage="Notifications de retraits" /> },
              { icon: <Send className="w-3.5 h-3.5 text-indigo-500" />, text: <FormattedMessage id="influencer.telegram.benefit.news" defaultMessage="Actualités & nouveautés" /> },
              { icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />, text: <FormattedMessage id="influencer.telegram.benefit.confirmations" defaultMessage="Confirmations de commissions" /> },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {b.icon}
                <span className="text-xs text-slate-600 dark:text-slate-400">{b.text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={onNavigateToTelegram}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-semibold shadow-md transition-all active:scale-[0.98]"
          >
            <Send className="w-4 h-4" />
            <FormattedMessage id="influencer.telegram.cta.button" defaultMessage="Connecter Telegram" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfluencerTelegramBanner;
