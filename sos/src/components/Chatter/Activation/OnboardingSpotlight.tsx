/**
 * OnboardingSpotlight - 3-step overlay spotlight for first-time visitors
 * Shows once only (localStorage), highlights: StickyBar → Checklist → Share buttons
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Copy, ArrowRight, X } from 'lucide-react';
import { UI } from '@/components/Chatter/designTokens';
import { useChatterData } from '@/contexts/ChatterDataContext';

const ONBOARDING_KEY = 'chatter_onboarding_seen';

interface OnboardingSpotlightProps {
  onCopyLink: () => void;
  onShareLink: () => void;
  onComplete: () => void;
}

const OnboardingSpotlight: React.FC<OnboardingSpotlightProps> = ({
  onCopyLink,
  onShareLink,
  onComplete,
}) => {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const intl = useIntl();
  const { dashboardData } = useChatterData();
  const config = dashboardData?.config;

  // Dynamic commission range from config (cents → dollars)
  const callAmountRange = useMemo(() => {
    const expatAmt = (config?.commissionClientCallAmountExpat ?? 300) / 100;
    const lawyerAmt = (config?.commissionClientCallAmountLawyer ?? 500) / 100;
    const minAmt = Math.min(expatAmt, lawyerAmt);
    const maxAmt = Math.max(expatAmt, lawyerAmt);
    return minAmt === maxAmt ? `$${minAmt}` : `$${minAmt}-${maxAmt}`;
  }, [config?.commissionClientCallAmountExpat, config?.commissionClientCallAmountLawyer]);

  useEffect(() => {
    if (localStorage.getItem(ONBOARDING_KEY)) return;
    // Small delay to let the page render first
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleNext = useCallback(() => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  }, [step]);

  const handleClose = useCallback(() => {
    setVisible(false);
    localStorage.setItem(ONBOARDING_KEY, 'true');
    onComplete();
  }, [onComplete]);

  if (!visible) return null;

  const steps = [
    {
      targetId: 'sticky-affiliate-bar',
      title: intl.formatMessage({ id: 'chatter.onboarding.step1.title', defaultMessage: 'Here are your referral links!' }),
      description: intl.formatMessage({ id: 'chatter.onboarding.step1.description', defaultMessage: 'Each person who calls via this link = {amount} for you. Copy it and share it everywhere.' }, { amount: callAmountRange }),
      action: (
        <button
          onClick={() => { onCopyLink(); handleNext(); }}
          className={`${UI.button.primary} px-4 py-2.5 text-sm inline-flex items-center gap-2`}
        >
          <Copy className="w-4 h-4" />
          <FormattedMessage id="chatter.onboarding.copyLink" defaultMessage="Copier mon lien" />
        </button>
      ),
    },
    {
      targetId: 'activation-checklist',
      title: intl.formatMessage({ id: 'chatter.onboarding.step2.title', defaultMessage: 'Follow these 4 steps to earn!' }),
      description: intl.formatMessage({ id: 'chatter.onboarding.step2.description', defaultMessage: "It's simple and fast! Each step brings you closer to your first earning." }),
      action: (
        <button
          onClick={handleNext}
          className={`${UI.button.primary} px-4 py-2.5 text-sm inline-flex items-center gap-2`}
        >
          <FormattedMessage id="chatter.onboarding.understood" defaultMessage="Compris !" />
          <ArrowRight className="w-4 h-4" />
        </button>
      ),
    },
    {
      targetId: 'share-buttons-section',
      title: intl.formatMessage({ id: 'chatter.onboarding.step3.title', defaultMessage: 'Share your link now!' }),
      description: intl.formatMessage({ id: 'chatter.onboarding.step3.description', defaultMessage: 'WhatsApp, Telegram, Facebook groups, expat forums, Reddit, Quora... The more you share, the more you earn.' }),
      action: (
        <button
          onClick={() => { onShareLink(); handleClose(); }}
          className={`${UI.button.primary} px-4 py-2.5 text-sm inline-flex items-center gap-2`}
        >
          <FormattedMessage id="chatter.onboarding.shareNow" defaultMessage="Partager sur WhatsApp" />
        </button>
      ),
    },
  ];

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Spotlight card - centered */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 relative animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    i === step ? 'w-6 bg-red-500' : i < step ? 'w-1.5 bg-red-300' : 'w-1.5 bg-slate-200 dark:bg-white/20'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-slate-400">{step + 1}/3</span>
          </div>

          {/* Content */}
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            {currentStep.title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
            {currentStep.description}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            {currentStep.action}
            <button
              onClick={handleNext}
              className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 min-h-[44px] px-3"
            >
              {step < 2 ? (
                <FormattedMessage id="chatter.onboarding.next" defaultMessage="Suivant" />
              ) : (
                <FormattedMessage id="chatter.onboarding.explore" defaultMessage="Explorer" />
              )}
            </button>
          </div>

          {/* Skip link */}
          <button
            onClick={handleClose}
            className="mt-4 w-full text-center text-xs text-slate-400 hover:text-slate-500 py-2"
          >
            <FormattedMessage id="chatter.onboarding.skip" defaultMessage="Passer l'introduction" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingSpotlight;
