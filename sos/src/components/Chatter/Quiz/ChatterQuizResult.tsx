/**
 * ChatterQuizResult - Quiz results display component
 * Shows score, pass/fail status, and next steps
 */

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { CheckCircle, XCircle, Trophy, RefreshCw, ArrowRight, PartyPopper } from 'lucide-react';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
} as const;

interface ChatterQuizResultProps {
  passed: boolean;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  passingScore: number;
  canRetryAt?: string; // ISO timestamp
  affiliateCodeClient?: string;
  affiliateCodeRecruitment?: string;
  onRetry?: () => void;
  onContinue?: () => void;
}

const ChatterQuizResult: React.FC<ChatterQuizResultProps> = ({
  passed,
  score,
  correctAnswers,
  totalQuestions,
  passingScore,
  canRetryAt,
  affiliateCodeClient,
  affiliateCodeRecruitment,
  onRetry,
  onContinue,
}) => {
  const intl = useIntl();

  // Calculate retry time remaining
  const getRetryTimeRemaining = () => {
    if (!canRetryAt) return null;
    const retryDate = new Date(canRetryAt);
    const now = new Date();
    const diffMs = retryDate.getTime() - now.getTime();
    if (diffMs <= 0) return null;

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return { hours, minutes };
  };

  const retryTime = getRetryTimeRemaining();

  return (
    <div className={`${UI.card} p-8 text-center`}>
      {/* Result Icon */}
      <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
        passed
          ? 'bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30'
          : 'bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30'
      }`}>
        {passed ? (
          <PartyPopper className="w-10 h-10 text-green-600 dark:text-green-400" />
        ) : (
          <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
        )}
      </div>

      {/* Title */}
      <h2 className={`text-2xl font-bold mb-2 ${
        passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
      }`}>
        {passed ? (
          <FormattedMessage id="chatter.quiz.result.passed" defaultMessage="Félicitations !" />
        ) : (
          <FormattedMessage id="chatter.quiz.result.failed" defaultMessage="Quiz non réussi" />
        )}
      </h2>

      {/* Score */}
      <div className="mb-6">
        <p className="text-5xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
          {score}%
        </p>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          <FormattedMessage
            id="chatter.quiz.result.score"
            defaultMessage="{correct} sur {total} questions correctes"
            values={{ correct: correctAnswers, total: totalQuestions }}
          />
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          <FormattedMessage
            id="chatter.quiz.result.passingScore"
            defaultMessage="Score requis : {score}%"
            values={{ score: passingScore }}
          />
        </p>
      </div>

      {passed ? (
        <>
          {/* Success Message */}
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
            <Trophy className="w-8 h-8 mx-auto mb-2 text-red-500" />
            <p className="text-gray-700 dark:text-gray-300">
              <FormattedMessage
                id="chatter.quiz.result.welcome"
                defaultMessage="Vous êtes maintenant officiellement un Chatter SOS-Expat !"
              />
            </p>
          </div>

          {/* Affiliate Codes */}
          {(affiliateCodeClient || affiliateCodeRecruitment) && (
            <div className="mb-6 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                <FormattedMessage id="chatter.quiz.result.yourCodes" defaultMessage="Vos codes affiliés" />
              </h3>

              {affiliateCodeClient && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <FormattedMessage id="chatter.quiz.result.codeClient" defaultMessage="Code Client" />
                  </p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">
                    {affiliateCodeClient}
                  </p>
                </div>
              )}

              {affiliateCodeRecruitment && (
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <FormattedMessage id="chatter.quiz.result.codeRecruitment" defaultMessage="Code Recrutement" />
                  </p>
                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {affiliateCodeRecruitment}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Continue Button */}
          <button
            onClick={onContinue}
            className={`${UI.button.primary} w-full py-4 flex items-center justify-center gap-2`}
          >
            <FormattedMessage id="chatter.quiz.result.goToDashboard" defaultMessage="Accéder à mon tableau de bord" />
            <ArrowRight className="w-5 h-5" />
          </button>
        </>
      ) : (
        <>
          {/* Failure Message */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
            <p className="text-gray-700 dark:text-gray-300">
              <FormattedMessage
                id="chatter.quiz.result.tryAgain"
                defaultMessage="Ne vous découragez pas ! Révisez les informations et réessayez."
              />
            </p>
          </div>

          {/* Retry Info */}
          {retryTime && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <p className="text-red-700 dark:text-red-300">
                <FormattedMessage
                  id="chatter.quiz.result.retryIn"
                  defaultMessage="Vous pourrez réessayer dans {hours}h {minutes}min"
                  values={{ hours: retryTime.hours, minutes: retryTime.minutes }}
                />
              </p>
            </div>
          )}

          {/* Retry Button */}
          <button
            onClick={onRetry}
            disabled={!!retryTime}
            className={`w-full py-4 flex items-center justify-center gap-2 ${
              retryTime ? 'bg-gray-100 dark:bg-white/10 text-gray-400 cursor-not-allowed' : UI.button.secondary
            } rounded-xl`}
          >
            <RefreshCw className="w-5 h-5" />
            <FormattedMessage id="chatter.quiz.result.retry" defaultMessage="Réessayer le quiz" />
          </button>
        </>
      )}
    </div>
  );
};

export default ChatterQuizResult;
