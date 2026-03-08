/**
 * NewChatterDashboard - Alternative layout for chatters with $0 earnings
 * Shows: Activation Checklist + Quick Share + How it works + Revenue Calculator + Telegram CTA
 * Replaces the normal dashboard until first commission is earned.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { Copy, Share2, Phone, DollarSign, Send, Calculator, ArrowRight, MessageCircle } from 'lucide-react';
import { useChatterData } from '@/contexts/ChatterDataContext';
import { UI, SPACING } from '@/components/Chatter/designTokens';
import ActivationChecklist from './ActivationChecklist';
import OnboardingSpotlight from './OnboardingSpotlight';
import toast from 'react-hot-toast';

interface NewChatterDashboardProps {
  onNavigateToTelegram?: () => void;
}

const REVENUE_EXAMPLES = [
  { calls: 5, weekly: true, monthly: 200 },
  { calls: 10, weekly: true, monthly: 400 },
  { calls: 20, weekly: true, monthly: 800 },
];

const NewChatterDashboard: React.FC<NewChatterDashboardProps> = ({ onNavigateToTelegram }) => {
  const { clientShareUrl, dashboardData } = useChatterData();
  const chatter = dashboardData?.chatter;
  const [showOnboarding, setShowOnboarding] = useState(true);

  const handleCopyLink = useCallback(() => {
    if (!clientShareUrl) return;
    navigator.clipboard.writeText(clientShareUrl).then(() => {
      localStorage.setItem('chatter_link_copied', Date.now().toString());
      navigator.vibrate?.(50);
      toast.success('Lien copie ! Partagez-le sur WhatsApp, Telegram...', { duration: 3000 });
    }).catch(() => {
      toast.error('Impossible de copier le lien');
    });
  }, [clientShareUrl]);

  const handleShareLink = useCallback(async () => {
    if (!clientShareUrl) return;
    localStorage.setItem('chatter_link_shared', Date.now().toString());

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SOS Expat - Aide juridique expatries',
          text: "Besoin d'aide juridique a l'etranger ? Appelez un avocat en 2 minutes !",
          url: clientShareUrl,
        });
        toast.success('Lien partage ! Chaque appel = $3-5 pour vous');
      } catch {
        // User cancelled, no error
      }
    } else {
      // Fallback: open WhatsApp
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
        `Besoin d'aide juridique a l'etranger ? Appelez un avocat en 2 minutes : ${clientShareUrl}`
      )}`;
      window.open(whatsappUrl, '_blank');
      toast.success('Lien partage !');
    }
  }, [clientShareUrl]);

  // Reactivation message (if chatter returns without progress)
  const reactivationMessage = useMemo(() => {
    const lastVisit = localStorage.getItem('chatter_last_activation_visit');
    if (!lastVisit) {
      localStorage.setItem('chatter_last_activation_visit', Date.now().toString());
      return null;
    }

    const daysSince = (Date.now() - parseInt(lastVisit, 10)) / (1000 * 60 * 60 * 24);
    localStorage.setItem('chatter_last_activation_visit', Date.now().toString());

    const linkCopied = !!localStorage.getItem('chatter_link_copied');
    const linkShared = !!localStorage.getItem('chatter_link_shared');

    if (daysSince >= 7 && linkCopied) {
      return {
        text: "Votre lien est toujours actif ! Un seul appel = $3-5. Les meilleurs chatters ont commence exactement comme vous.",
        cta: 'Recommencer',
      };
    }
    if (daysSince >= 3 && linkCopied) {
      return {
        text: 'Les chatters qui partagent leur lien 3x/jour gagnent en moyenne plus vite. Continuez !',
        cta: 'Partager mon lien',
      };
    }
    if (daysSince >= 1 && linkCopied && !linkShared) {
      return {
        text: "Vous avez copie votre lien ! L'avez-vous partage ? Plus vous partagez, plus vite vous gagnerez.",
        cta: 'Partager maintenant',
      };
    }

    return null;
  }, []);

  return (
    <div className={`space-y-4 ${SPACING.pagePadding} py-4`}>
      {/* Onboarding spotlight (first visit only) */}
      {showOnboarding && (
        <OnboardingSpotlight
          onCopyLink={handleCopyLink}
          onShareLink={handleShareLink}
          onComplete={() => setShowOnboarding(false)}
        />
      )}

      {/* Reactivation message */}
      {reactivationMessage && (
        <div className={`${UI.card} p-4 border-l-4 border-l-amber-400 bg-amber-50/50 dark:bg-amber-500/5`}>
          <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
            {reactivationMessage.text}
          </p>
          <button
            onClick={handleShareLink}
            className={`${UI.button.primary} px-4 py-2 text-sm`}
          >
            {reactivationMessage.cta}
          </button>
        </div>
      )}

      {/* Activation Checklist */}
      <div id="activation-checklist">
        <ActivationChecklist
          onCopyLink={handleCopyLink}
          onShareLink={handleShareLink}
          onNavigateToTelegram={onNavigateToTelegram}
        />
      </div>

      {/* Quick Share Section */}
      <div id="share-buttons-section" className={UI.card}>
        <div className="p-4 sm:p-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
            <FormattedMessage id="chatter.new.shareTitle" defaultMessage="Partagez votre lien maintenant" />
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                const url = `https://wa.me/?text=${encodeURIComponent(`Besoin d'aide juridique ? ${clientShareUrl}`)}`;
                window.open(url, '_blank');
                localStorage.setItem('chatter_link_shared', Date.now().toString());
              }}
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-xl transition-colors min-h-[48px]"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp
            </button>
            <button
              onClick={() => {
                const url = `https://t.me/share/url?url=${encodeURIComponent(clientShareUrl)}&text=${encodeURIComponent("Besoin d'aide juridique ?")}`;
                window.open(url, '_blank');
                localStorage.setItem('chatter_link_shared', Date.now().toString());
              }}
              className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-xl transition-colors min-h-[48px]"
            >
              <Send className="w-5 h-5" />
              Telegram
            </button>
            <button
              onClick={handleCopyLink}
              className={`flex items-center justify-center gap-2 ${UI.button.secondary} py-3 min-h-[48px]`}
            >
              <Copy className="w-5 h-5" />
              <FormattedMessage id="chatter.new.copyLink" defaultMessage="Copier le lien" />
            </button>
            <button
              onClick={handleShareLink}
              className={`flex items-center justify-center gap-2 ${UI.button.secondary} py-3 min-h-[48px]`}
            >
              <Share2 className="w-5 h-5" />
              <FormattedMessage id="chatter.new.share" defaultMessage="Partager" />
            </button>
          </div>
        </div>
      </div>

      {/* How it works - 3 simple steps */}
      <div className={UI.card}>
        <div className="p-4 sm:p-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            <FormattedMessage id="chatter.new.howItWorks" defaultMessage="Comment ca marche" />
          </h3>
          <div className="space-y-4">
            {[
              { icon: <Share2 className="w-4 h-4" />, num: '1', title: 'Partagez votre lien', color: 'bg-blue-500' },
              { icon: <Phone className="w-4 h-4" />, num: '2', title: 'Quelqu\'un appelle un avocat', color: 'bg-green-500' },
              { icon: <DollarSign className="w-4 h-4" />, num: '3', title: 'Vous gagnez $3-5 automatiquement', color: 'bg-yellow-500' },
            ].map((step) => (
              <div key={step.num} className="flex items-center gap-3">
                <div className={`flex-shrink-0 w-8 h-8 ${step.color} text-white rounded-full flex items-center justify-center text-sm font-bold`}>
                  {step.num}
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {step.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Calculator */}
      <div className={UI.card}>
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-5 h-5 text-slate-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              <FormattedMessage id="chatter.new.revenueTitle" defaultMessage="Revenus possibles" />
            </h3>
          </div>
          <div className="space-y-2">
            {REVENUE_EXAMPLES.map((ex) => (
              <div
                key={ex.calls}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl"
              >
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {ex.calls} <FormattedMessage id="chatter.new.callsPerWeek" defaultMessage="appels/sem" />
                </span>
                <span className="text-lg font-bold text-green-500">
                  ~${ex.monthly}/mois
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Telegram Bonus CTA */}
      {!chatter?.telegramOnboardingCompleted && onNavigateToTelegram && (
        <div className={`${UI.card} bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20`}>
          <div className="p-4 sm:p-5 text-center">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Send className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              <FormattedMessage id="chatter.new.telegramTitle" defaultMessage="Liez Telegram = $50 offerts" />
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              <FormattedMessage id="chatter.new.telegramDesc" defaultMessage="Bonus credite immediatement a la liaison" />
            </p>
            <button
              onClick={onNavigateToTelegram}
              className={`${UI.button.primary} px-6 py-2.5 text-sm inline-flex items-center gap-2`}
            >
              <Send className="w-4 h-4" />
              <FormattedMessage id="chatter.new.linkTelegram" defaultMessage="Lier Telegram" />
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewChatterDashboard;
