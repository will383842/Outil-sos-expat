/**
 * ActivationChecklist - 4-step checklist for new chatters (totalEarned === 0)
 * Replaces Hero Card until first commission is earned.
 * Steps: 1. Copy link 2. Share link 3. Client calls 4. Commission received
 */

import React, { useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Check, Copy, Share2, Phone, DollarSign, Send, Gift } from 'lucide-react';
import { useChatterData } from '@/contexts/ChatterDataContext';
import { UI } from '@/components/Chatter/designTokens';
import toast from 'react-hot-toast';

// Rotating tips for when step 3 is pending
const WAITING_TIPS = [
  'chatter.activation.tip1',
  'chatter.activation.tip2',
  'chatter.activation.tip3',
  'chatter.activation.tip4',
  'chatter.activation.tip5',
];

const DEFAULT_TIPS = [
  "Tip: Share in WhatsApp groups for expats",
  "Tip: The best chatters share 3-5 times per day",
  "Tip: Ask your expat friends if they need legal help",
  "Tip: Post your link on Facebook with a personal testimonial",
  "Tip: Send your link to people planning a trip abroad",
];

interface ActivationChecklistProps {
  onCopyLink: () => void;
  onShareLink: () => void;
  onNavigateToTelegram?: () => void;
}

const ActivationChecklist: React.FC<ActivationChecklistProps> = ({
  onCopyLink,
  onShareLink,
  onNavigateToTelegram,
}) => {
  const intl = useIntl();
  const { dashboardData } = useChatterData();
  const chatter = dashboardData?.chatter;
  const config = dashboardData?.config;

  // Dynamic commission range from config (cents → dollars)
  const callAmountRange = useMemo(() => {
    const expatAmt = (config?.commissionClientCallAmountExpat ?? 300) / 100;
    const lawyerAmt = (config?.commissionClientCallAmountLawyer ?? 500) / 100;
    const minAmt = Math.min(expatAmt, lawyerAmt);
    const maxAmt = Math.max(expatAmt, lawyerAmt);
    return minAmt === maxAmt ? `$${minAmt}` : `$${minAmt}-${maxAmt}`;
  }, [config?.commissionClientCallAmountExpat, config?.commissionClientCallAmountLawyer]);

  // Step completion detection
  const steps = useMemo(() => {
    const linkCopied = !!localStorage.getItem('chatter_link_copied');
    const linkShared = !!localStorage.getItem('chatter_link_shared');
    const clientCalled = (chatter?.totalClients || 0) >= 1;
    const commissionReceived = (chatter?.totalEarned || 0) > 0;

    return [
      {
        key: 'copy',
        completed: linkCopied,
        icon: Copy,
        completedDate: linkCopied ? localStorage.getItem('chatter_link_copied') : null,
      },
      {
        key: 'share',
        completed: linkShared,
        icon: Share2,
        completedDate: linkShared ? localStorage.getItem('chatter_link_shared') : null,
      },
      {
        key: 'client_call',
        completed: clientCalled,
        icon: Phone,
        completedDate: null,
      },
      {
        key: 'commission',
        completed: commissionReceived,
        icon: DollarSign,
        completedDate: null,
      },
    ];
  }, [chatter]);

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = (completedCount / 4) * 100;
  const telegramLinked = chatter?.telegramOnboardingCompleted === true;

  // Get a rotating tip based on visit count
  const tipIndex = useMemo(() => {
    const visits = parseInt(localStorage.getItem('chatter_activation_visits') || '0', 10);
    localStorage.setItem('chatter_activation_visits', String(visits + 1));
    return visits % WAITING_TIPS.length;
  }, []);

  // Find current (first incomplete) step
  const currentStepIndex = steps.findIndex((s) => !s.completed);

  const formatDate = (timestamp: string | null) => {
    if (!timestamp) return '';
    try {
      const date = new Date(parseInt(timestamp, 10));
      return intl.formatDate(date, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className={`${UI.card} border-2 border-red-200 dark:border-red-500/30 overflow-hidden`}>
      {/* Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-red-500/5 to-orange-500/5 dark:from-red-500/10 dark:to-orange-500/10 border-b border-slate-100 dark:border-white/5">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          <FormattedMessage id="chatter.activation.title" defaultMessage="Vos premiers dollars en 4 etapes" />
        </h2>
        {/* Progress bar */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {completedCount}/4
          </span>
        </div>
      </div>

      {/* Steps */}
      <div className="divide-y divide-slate-100 dark:divide-white/5">
        {steps.map((step, index) => {
          const isCurrent = index === currentStepIndex;
          const Icon = step.icon;

          return (
            <div
              key={step.key}
              className={`p-4 sm:p-5 transition-colors ${
                isCurrent ? 'bg-blue-50/50 dark:bg-blue-500/5' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Step indicator */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    step.completed
                      ? 'bg-green-500 text-white'
                      : isCurrent
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-200 dark:bg-white/10 text-slate-400'
                  }`}
                >
                  {step.completed ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-bold">{index + 1}</span>
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${step.completed ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-white'}`}>
                    <FormattedMessage
                      id={`chatter.activation.step${index + 1}.title`}
                      defaultMessage={
                        index === 0 ? 'Copy your client link' :
                        index === 1 ? 'Share it (WhatsApp, Telegram...)' :
                        index === 2 ? 'A client calls via your link' :
                        'You receive your commission!'
                      }
                    />
                    {step.completed && (
                      <span className="ml-2 text-xs font-semibold text-green-500">
                        <FormattedMessage id="chatter.activation.done" defaultMessage="FAIT" />
                      </span>
                    )}
                  </p>

                  {/* Completed date */}
                  {step.completed && step.completedDate && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {formatDate(step.completedDate)}
                    </p>
                  )}

                  {/* Current step CTA */}
                  {isCurrent && !step.completed && (
                    <div className="mt-2">
                      {index === 0 && (
                        <button
                          onClick={onCopyLink}
                          className={`${UI.button.primary} px-4 py-2 text-sm inline-flex items-center gap-2`}
                        >
                          <Copy className="w-4 h-4" />
                          <FormattedMessage id="chatter.activation.copyLink" defaultMessage="Copier mon lien" />
                        </button>
                      )}
                      {index === 1 && (
                        <button
                          onClick={onShareLink}
                          className={`${UI.button.primary} px-4 py-2 text-sm inline-flex items-center gap-2`}
                        >
                          <Share2 className="w-4 h-4" />
                          <FormattedMessage id="chatter.activation.shareLink" defaultMessage="Partager mon lien" />
                        </button>
                      )}
                      {index === 2 && (
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                            <FormattedMessage
                              id={`chatter.activation.tip${tipIndex + 1}`}
                              defaultMessage={DEFAULT_TIPS[tipIndex]}
                            />
                          </p>
                          <button
                            onClick={onShareLink}
                            className={`${UI.button.secondary} px-4 py-2 text-sm inline-flex items-center gap-2`}
                          >
                            <Share2 className="w-4 h-4" />
                            <FormattedMessage id="chatter.activation.reshare" defaultMessage="Repartager mon lien" />
                          </button>
                        </div>
                      )}
                      {index === 3 && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          <FormattedMessage
                            id="chatter.activation.step4.subtitle"
                            defaultMessage={`${callAmountRange} credites automatiquement`}
                          />
                        </p>
                      )}
                    </div>
                  )}

                  {/* Waiting state for step 3 when steps 1&2 are done */}
                  {index === 2 && !step.completed && steps[0].completed && steps[1].completed && !isCurrent && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      <FormattedMessage id="chatter.activation.waiting" defaultMessage="En attente... Partagez davantage !" />
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Telegram bonus section */}
      {!telegramLinked && (
        <div className="p-4 sm:p-5 bg-indigo-50/50 dark:bg-indigo-500/5 border-t border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 rounded-full flex items-center justify-center">
              <Gift className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                <FormattedMessage id="chatter.activation.telegramBonus" defaultMessage="BONUS : Liez Telegram = +$50 offerts" />
              </p>
              {onNavigateToTelegram && (
                <button
                  onClick={onNavigateToTelegram}
                  className="mt-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <FormattedMessage id="chatter.activation.linkTelegram" defaultMessage="Lier Telegram maintenant" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivationChecklist;
