/**
 * NewChatterDashboard - Alternative layout for chatters with $0 earnings
 * Shows: Activation Checklist + Quick Share + How it works + Revenue Calculator + Telegram CTA
 * Replaces the normal dashboard until first commission is earned.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Copy, Share2, Phone, DollarSign, Send, Calculator, ArrowRight, MessageCircle } from 'lucide-react';
import { useChatterData } from '@/contexts/ChatterDataContext';
import { UI, SPACING } from '@/components/Chatter/designTokens';
import ActivationChecklist from './ActivationChecklist';
import OnboardingSpotlight from './OnboardingSpotlight';
import toast from 'react-hot-toast';
import { copyToClipboard } from '@/utils/clipboard';

interface NewChatterDashboardProps {
  onNavigateToTelegram?: () => void;
}

const NewChatterDashboard: React.FC<NewChatterDashboardProps> = ({ onNavigateToTelegram }) => {
  const intl = useIntl();
  const { clientShareUrl, dashboardData } = useChatterData();
  const chatter = dashboardData?.chatter;
  const config = dashboardData?.config;
  const [showOnboarding, setShowOnboarding] = useState(true);

  // Dynamic commission range from config (cents → dollars)
  const callAmountRange = useMemo(() => {
    const expatAmt = (config?.commissionClientCallAmountExpat ?? 300) / 100;
    const lawyerAmt = (config?.commissionClientCallAmountLawyer ?? 500) / 100;
    const minAmt = Math.min(expatAmt, lawyerAmt);
    const maxAmt = Math.max(expatAmt, lawyerAmt);
    return minAmt === maxAmt ? `$${minAmt}` : `$${minAmt}-${maxAmt}`;
  }, [config?.commissionClientCallAmountExpat, config?.commissionClientCallAmountLawyer]);

  // Dynamic revenue examples based on average commission
  const revenueExamples = useMemo(() => {
    const expatAmt = (config?.commissionClientCallAmountExpat ?? 300) / 100;
    const lawyerAmt = (config?.commissionClientCallAmountLawyer ?? 500) / 100;
    const avgAmount = (expatAmt + lawyerAmt) / 2;
    return [
      { calls: 5, weekly: true, monthly: Math.round(5 * 4 * avgAmount) },
      { calls: 10, weekly: true, monthly: Math.round(10 * 4 * avgAmount) },
      { calls: 20, weekly: true, monthly: Math.round(20 * 4 * avgAmount) },
    ];
  }, [config?.commissionClientCallAmountExpat, config?.commissionClientCallAmountLawyer]);

  const handleCopyLink = useCallback(async () => {
    if (!clientShareUrl) return;
    const success = await copyToClipboard(clientShareUrl);
    if (success) {
      localStorage.setItem('chatter_link_copied', Date.now().toString());
      navigator.vibrate?.(50);
      toast.success(intl.formatMessage({ id: 'chatter.new.toast.linkCopied', defaultMessage: 'Link copied! Share it on WhatsApp, Telegram...' }), { duration: 3000 });
    } else {
      toast.error(intl.formatMessage({ id: 'chatter.new.toast.copyFailed', defaultMessage: 'Unable to copy link' }));
    }
  }, [clientShareUrl, intl]);

  const handleShareLink = useCallback(async () => {
    if (!clientShareUrl) return;
    localStorage.setItem('chatter_link_shared', Date.now().toString());

    if (navigator.share) {
      try {
        await navigator.share({
          title: intl.formatMessage({ id: 'chatter.new.share.title', defaultMessage: 'SOS Expat - Legal help for expats' }),
          text: intl.formatMessage({ id: 'chatter.new.share.text', defaultMessage: 'Need legal help abroad? Call a lawyer in 2 minutes!' }),
          url: clientShareUrl,
        });
        toast.success(intl.formatMessage({ id: 'chatter.new.toast.linkShared', defaultMessage: 'Link shared! Each call = {amount} for you' }, { amount: callAmountRange }));
      } catch {
        // User cancelled, no error
      }
    } else {
      // Fallback: open WhatsApp
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
        intl.formatMessage({ id: 'chatter.new.share.whatsapp', defaultMessage: 'Need legal help abroad? Call a lawyer in 2 minutes: {url}' }, { url: clientShareUrl })
      )}`;
      window.open(whatsappUrl, '_blank');
      toast.success(intl.formatMessage({ id: 'chatter.new.toast.shared', defaultMessage: 'Link shared!' }));
    }
  }, [clientShareUrl, callAmountRange, intl]);

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
        text: intl.formatMessage({ id: 'chatter.new.reactivation.weekAbsent', defaultMessage: 'Your link is still active! One call = {amount}. The best chatters started just like you.' }, { amount: callAmountRange }),
        cta: intl.formatMessage({ id: 'chatter.new.reactivation.restart', defaultMessage: 'Start again' }),
      };
    }
    if (daysSince >= 3 && linkCopied) {
      return {
        text: intl.formatMessage({ id: 'chatter.new.reactivation.shareMore', defaultMessage: 'Chatters who share their link 3x/day earn faster on average. Keep going!' }),
        cta: intl.formatMessage({ id: 'chatter.new.reactivation.shareLink', defaultMessage: 'Share my link' }),
      };
    }
    if (daysSince >= 1 && linkCopied && !linkShared) {
      return {
        text: intl.formatMessage({ id: 'chatter.new.reactivation.copiedNotShared', defaultMessage: "You copied your link! Did you share it? The more you share, the faster you'll earn." }),
        cta: intl.formatMessage({ id: 'chatter.new.reactivation.shareNow', defaultMessage: 'Share now' }),
      };
    }

    return null;
  }, [callAmountRange, intl]);

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
        <div className={`backdrop-blur-xl border border-white/[0.06] rounded-2xl bg-white/80 dark:bg-white/[0.03] p-4 border-l-4 border-l-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/5`}>
          <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
            {reactivationMessage.text}
          </p>
          <button
            onClick={handleShareLink}
            className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-medium rounded-xl transition-all duration-200 active:scale-[0.97] shadow-md shadow-indigo-500/25 px-4 py-2 text-sm"
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
                const url = `https://wa.me/?text=${encodeURIComponent(intl.formatMessage({ id: 'chatter.new.share.shortText', defaultMessage: 'Need legal help? {url}' }, { url: clientShareUrl }))}`;
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
                const url = `https://t.me/share/url?url=${encodeURIComponent(clientShareUrl)}&text=${encodeURIComponent(intl.formatMessage({ id: 'chatter.new.share.telegramText', defaultMessage: 'Need legal help?' }))}`;
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
              { icon: <Share2 className="w-4 h-4" />, num: '1', title: intl.formatMessage({ id: 'chatter.new.step1', defaultMessage: 'Share your link' }), color: 'bg-indigo-500' },
              { icon: <Phone className="w-4 h-4" />, num: '2', title: intl.formatMessage({ id: 'chatter.new.step2', defaultMessage: 'Someone calls a lawyer' }), color: 'bg-violet-500' },
              { icon: <DollarSign className="w-4 h-4" />, num: '3', title: intl.formatMessage({ id: 'chatter.new.step3', defaultMessage: 'You earn {amount} automatically' }, { amount: callAmountRange }), color: 'bg-indigo-600' },
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
            <Calculator className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              <FormattedMessage id="chatter.new.revenueTitle" defaultMessage="Revenus possibles" />
            </h3>
          </div>
          <div className="space-y-2">
            {revenueExamples.map((ex) => (
              <div
                key={ex.calls}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl"
              >
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {ex.calls} <FormattedMessage id="chatter.new.callsPerWeek" defaultMessage="appels/sem" />
                </span>
                <span className="text-lg font-bold text-green-500">
                  {intl.formatMessage({ id: 'chatter.new.perMonth', defaultMessage: '~${amount}/mo' }, { amount: ex.monthly })}
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
