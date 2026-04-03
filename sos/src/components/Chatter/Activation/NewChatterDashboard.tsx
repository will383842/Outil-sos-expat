/**
 * NewChatterDashboard - Alternative layout for chatters with $0 earnings
 * Shows: Job intro + Activation Checklist + Revenue Calculator + Telegram CTA
 * Replaces the normal dashboard until first commission is earned.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Copy, DollarSign, Send, Calculator, ArrowRight } from 'lucide-react';
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

  // Dynamic realistic earnings range for the note (3-7 calls/week × 4 weeks)
  const realisticRange = useMemo(() => {
    const expatAmt = (config?.commissionClientCallAmountExpat ?? 300) / 100;
    const lawyerAmt = (config?.commissionClientCallAmountLawyer ?? 500) / 100;
    const avgAmount = (expatAmt + lawyerAmt) / 2;
    const min = Math.round(3 * 4 * avgAmount);
    const max = Math.round(7 * 4 * avgAmount);
    return `$${min}-${max}`;
  }, [config?.commissionClientCallAmountExpat, config?.commissionClientCallAmountLawyer]);

  // Dynamic revenue examples based on average commission
  const revenueExamples = useMemo(() => {
    const expatAmt = (config?.commissionClientCallAmountExpat ?? 300) / 100;
    const lawyerAmt = (config?.commissionClientCallAmountLawyer ?? 500) / 100;
    const avgAmount = (expatAmt + lawyerAmt) / 2;
    return [
      { calls: 5, monthly: Math.round(5 * 4 * avgAmount) },
      { calls: 10, monthly: Math.round(10 * 4 * avgAmount) },
      { calls: 20, monthly: Math.round(20 * 4 * avgAmount) },
    ];
  }, [config?.commissionClientCallAmountExpat, config?.commissionClientCallAmountLawyer]);

  // Read previous visit timestamp ONCE at mount (before updating it)
  const [prevVisitTimestamp] = useState<number | null>(() => {
    const stored = localStorage.getItem('chatter_last_activation_visit');
    return stored ? parseInt(stored, 10) : null;
  });

  // Update timestamp for next visit — runs ONCE on mount, after state is captured
  useEffect(() => {
    localStorage.setItem('chatter_last_activation_visit', Date.now().toString());
  }, []);

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
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
        intl.formatMessage({ id: 'chatter.new.share.whatsapp', defaultMessage: 'Need legal help abroad? Call a lawyer in 2 minutes: {url}' }, { url: clientShareUrl })
      )}`;
      window.open(whatsappUrl, '_blank');
      toast.success(intl.formatMessage({ id: 'chatter.new.toast.shared', defaultMessage: 'Link shared!' }));
    }
  }, [clientShareUrl, callAmountRange, intl]);

  // Reactivation message based on days since PREVIOUS visit (not current)
  const reactivationMessage = useMemo(() => {
    if (prevVisitTimestamp === null) return null; // First ever visit

    const daysSince = (Date.now() - prevVisitTimestamp) / (1000 * 60 * 60 * 24);
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
  }, [prevVisitTimestamp, callAmountRange, intl]);

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
        <div className="border border-indigo-200 dark:border-indigo-500/30 rounded-2xl bg-indigo-50/50 dark:bg-indigo-500/5 p-4 border-l-4 border-l-indigo-400">
          <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
            {reactivationMessage.text}
          </p>
          <button
            onClick={handleShareLink}
            className="min-h-[44px] bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-medium rounded-xl transition-all duration-200 active:scale-[0.97] shadow-md shadow-indigo-500/25 px-4 py-2.5 text-sm"
          >
            {reactivationMessage.cta}
          </button>
        </div>
      )}

      {/* Job intro — explains the Chatter role for anyone arriving cold (no landing page) */}
      <div className={`${UI.card} overflow-hidden`}>
        {/* Header band */}
        <div className="px-4 pt-4 pb-3 sm:px-5 sm:pt-5 bg-gradient-to-r from-indigo-500/5 to-violet-500/5 dark:from-indigo-500/10 dark:to-violet-500/10 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              <FormattedMessage id="chatter.new.jobIntroTitle" defaultMessage="Votre mission de Chatter" />
            </h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            <FormattedMessage
              id="chatter.new.jobIntroDesc"
              defaultMessage="SOS-Expat connecte des expatriés avec des avocats et des expatriés aidants par téléphone. Partagez votre lien dans des groupes d'expats — chaque appel via ce lien = {amount} versé dans votre portefeuille."
              values={{ amount: <span className="font-bold text-indigo-600 dark:text-indigo-400">{callAmountRange}</span> }}
            />
          </p>
        </div>

        {/* Your unique link — visible, copyable */}
        <div className="px-4 py-3 sm:px-5">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">
            <FormattedMessage id="chatter.new.yourLink" defaultMessage="Votre lien unique" />
          </p>
          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl px-3 py-2">
            <span className="flex-1 text-sm font-mono text-indigo-700 dark:text-indigo-300 truncate min-w-0">
              {clientShareUrl || (
                <span className="text-slate-400 italic">
                  <FormattedMessage id="chatter.new.linkLoading" defaultMessage="Chargement de votre lien..." />
                </span>
              )}
            </span>
            <button
              onClick={handleCopyLink}
              disabled={!clientShareUrl}
              className="flex-shrink-0 min-h-[44px] bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-3 py-2 text-xs inline-flex items-center gap-1.5 transition-all duration-200 active:scale-[0.97] shadow-sm shadow-indigo-500/25"
            >
              <Copy className="w-3.5 h-3.5" />
              <FormattedMessage id="chatter.new.copyLinkNow" defaultMessage="Copier" />
            </button>
          </div>
        </div>
      </div>

      {/* Activation Checklist */}
      <div id="activation-checklist">
        <ActivationChecklist
          onCopyLink={handleCopyLink}
          onShareLink={handleShareLink}
          onNavigateToTelegram={onNavigateToTelegram}
        />
      </div>

      {/* Revenue Calculator */}
      <div className={UI.card}>
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-1">
            <Calculator className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              <FormattedMessage id="chatter.new.revenueTitle" defaultMessage="Revenus possibles" />
            </h3>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
            <FormattedMessage
              id="chatter.new.revenueNote"
              defaultMessage="La plupart des nouveaux chatters gagnent {range} leur 1er mois"
              values={{ range: <span className="font-semibold text-slate-500 dark:text-slate-400">{realisticRange}</span> }}
            />
          </p>
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
              <FormattedMessage id="chatter.new.telegramTitle" defaultMessage="Liez Telegram = {bonus} offerts" values={{ bonus: `$${((config?.telegramBonusAmount || 5000) / 100).toFixed(0)}` }} />
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
              <FormattedMessage id="chatter.new.telegramDesc" defaultMessage="Bonus credite immediatement a la liaison" />
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">
              <FormattedMessage id="chatter.new.telegramUnlockCondition" defaultMessage="Unlocked after {threshold} in client commissions" values={{ threshold: `$${((config?.piggyBankUnlockThreshold || 15000) / 100).toFixed(0)}` }} />
            </p>
            <button
              onClick={onNavigateToTelegram}
              className={`${UI.button.primary} min-h-[44px] px-6 py-2.5 text-sm inline-flex items-center gap-2`}
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
