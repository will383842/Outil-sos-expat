/**
 * Access CTA Component
 * Premium call-to-action button for AI tool access
 */

import React from 'react';
import { useIntl } from 'react-intl';
import { ExternalLink, Loader2, Crown, Sparkles } from 'lucide-react';
import { cn } from '../../../../utils/cn';
import { GradientCard } from './Card';

interface AccessCTAProps {
  onAccess: () => void;
  loading: boolean;
  canMakeCall: boolean;
  error?: string | null;
  selectedProviderName?: string;
  showMultiProvider?: boolean;
  onViewPlans?: () => void;
}

export const AccessCTA: React.FC<AccessCTAProps> = ({
  onAccess,
  loading,
  canMakeCall,
  error,
  selectedProviderName,
  showMultiProvider = false,
  onViewPlans,
}) => {
  const intl = useIntl();

  return (
    <GradientCard className="relative overflow-hidden">
      {/* Animated shine effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <span className="font-semibold text-white/95">
          {intl.formatMessage({ id: 'aiAssistant.toolTitle' })}
        </span>
      </div>

      {/* Selected Provider Info */}
      {showMultiProvider && selectedProviderName && (
        <div className="mb-4 p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
          <div className="text-xs text-white/70 mb-1">Accès en tant que :</div>
          <div className="font-medium text-white">{selectedProviderName}</div>
        </div>
      )}

      {/* Description */}
      <p className="text-white/80 text-sm mb-6 leading-relaxed">
        {intl.formatMessage({ id: 'aiAssistant.toolDescription' })}
      </p>

      {/* Main CTA Button */}
      <button
        onClick={onAccess}
        disabled={!canMakeCall || loading}
        className={cn(
          'w-full py-3.5 px-4 rounded-xl font-semibold flex items-center justify-center gap-2.5 transition-all duration-200',
          canMakeCall && !loading
            ? 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
            : 'bg-white/30 text-white/70 cursor-not-allowed'
        )}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {intl.formatMessage({ id: 'common.connecting' })}
          </>
        ) : canMakeCall ? (
          <>
            <ExternalLink className="w-5 h-5" />
            {intl.formatMessage({ id: 'aiAssistant.accessButton' })}
          </>
        ) : (
          <>
            <Crown className="w-5 h-5" />
            {intl.formatMessage({ id: 'subscription.errors.noSubscription' })}
          </>
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div className="mt-3 p-3 bg-red-500/20 border border-red-400/30 rounded-xl backdrop-blur-sm animate-fade-in-up">
          <p className="text-sm text-white text-center">{error}</p>
        </div>
      )}

      {/* Upgrade Link */}
      {!canMakeCall && onViewPlans && (
        <button
          onClick={onViewPlans}
          className="w-full mt-3 py-2.5 text-sm text-white/80 hover:text-white underline underline-offset-2 transition-colors"
        >
          {intl.formatMessage({ id: 'subscription.viewPlans' })}
        </button>
      )}
    </GradientCard>
  );
};

export default AccessCTA;
