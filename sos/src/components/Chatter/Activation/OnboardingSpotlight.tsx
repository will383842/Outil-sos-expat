/**
 * OnboardingSpotlight - 3-step overlay spotlight for first-time visitors
 * Shows once only (localStorage), highlights: StickyBar → Checklist → Share buttons
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage } from 'react-intl';
import { Copy, ArrowRight, X } from 'lucide-react';
import { UI } from '@/components/Chatter/designTokens';

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
      title: 'Voici vos liens de parrainage !',
      description: 'Chaque personne qui appelle via ce lien = $3-5 pour vous. Copiez-le et partagez-le partout.',
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
      title: 'Suivez ces 4 etapes pour gagner !',
      description: "C'est simple et rapide ! Chaque etape vous rapproche de votre premier gain.",
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
      title: 'Partagez votre lien maintenant !',
      description: 'WhatsApp, Telegram, groupes Facebook, forums d\'expats, Reddit, Quora... Plus vous partagez, plus vous gagnez.',
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
