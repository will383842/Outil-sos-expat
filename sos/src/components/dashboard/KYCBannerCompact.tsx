/**
 * KYCBannerCompact - Version compacte et collapsible du banner KYC
 * Optimisé pour mobile avec expansion animée
 */

import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Shield,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { User } from '../../contexts/types';

interface KYCBannerCompactProps {
  user: User;
  kycType: 'stripe' | 'paypal' | 'profile';
  onAction?: () => void;
  children?: React.ReactNode;
}

const KYCBannerCompact: React.FC<KYCBannerCompactProps> = ({
  user,
  kycType,
  onAction,
  children,
}) => {
  const intl = useIntl();
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine status and styling based on type
  const getConfig = () => {
    switch (kycType) {
      case 'stripe':
        return {
          icon: CreditCard,
          title: intl.formatMessage({ id: 'dashboard.kyc.title', defaultMessage: 'Complete Verification' }),
          subtitle: intl.formatMessage({ id: 'dashboard.kyc.description', defaultMessage: 'Verify your identity to receive payments' }),
          bgGradient: 'from-orange-500 to-red-500',
          bgLight: 'bg-orange-50 dark:bg-orange-900/20',
          textColor: 'text-orange-700 dark:text-orange-300',
          borderColor: 'border-orange-200 dark:border-orange-800',
          iconBg: 'bg-orange-100 dark:bg-orange-900/40',
          iconColor: 'text-orange-600 dark:text-orange-400',
        };
      case 'paypal':
        return {
          icon: Shield,
          title: intl.formatMessage({ id: 'dashboard.paypal.title', defaultMessage: 'Connect PayPal' }),
          subtitle: intl.formatMessage({ id: 'dashboard.paypal.description', defaultMessage: 'Connect your PayPal account' }),
          bgGradient: 'from-blue-500 to-blue-700',
          bgLight: 'bg-blue-50 dark:bg-blue-900/20',
          textColor: 'text-blue-700 dark:text-blue-300',
          borderColor: 'border-blue-200 dark:border-blue-800',
          iconBg: 'bg-blue-100 dark:bg-blue-900/40',
          iconColor: 'text-blue-600 dark:text-blue-400',
        };
      case 'profile':
        if (user.approvalStatus === 'pending') {
          return {
            icon: Clock,
            title: intl.formatMessage({ id: 'profileValidation.pending.title', defaultMessage: 'Profile Pending' }),
            subtitle: intl.formatMessage({ id: 'profileValidation.pending.description', defaultMessage: 'Your profile is being reviewed' }),
            bgGradient: 'from-amber-500 to-orange-500',
            bgLight: 'bg-amber-50 dark:bg-amber-900/20',
            textColor: 'text-amber-700 dark:text-amber-300',
            borderColor: 'border-amber-200 dark:border-amber-800',
            iconBg: 'bg-amber-100 dark:bg-amber-900/40',
            iconColor: 'text-amber-600 dark:text-amber-400',
          };
        }
        return {
          icon: AlertTriangle,
          title: intl.formatMessage({ id: 'profileValidation.rejected.title', defaultMessage: 'Profile Rejected' }),
          subtitle: intl.formatMessage({ id: 'profileValidation.rejected.description', defaultMessage: 'Please update your profile' }),
          bgGradient: 'from-red-500 to-rose-500',
          bgLight: 'bg-red-50 dark:bg-red-900/20',
          textColor: 'text-red-700 dark:text-red-300',
          borderColor: 'border-red-200 dark:border-red-800',
          iconBg: 'bg-red-100 dark:bg-red-900/40',
          iconColor: 'text-red-600 dark:text-red-400',
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <div className={`
      rounded-xl border overflow-hidden transition-all duration-300
      ${config.bgLight} ${config.borderColor}
    `}>
      {/* Compact header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-3 md:p-4 text-left"
      >
        {/* Icon */}
        <div className={`
          flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center
          ${config.iconBg}
        `}>
          <Icon className={`w-5 h-5 md:w-6 md:h-6 ${config.iconColor}`} />
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-sm md:text-base ${config.textColor}`}>
            {config.title}
          </h3>
          <p className={`text-xs md:text-sm opacity-80 truncate ${config.textColor}`}>
            {config.subtitle}
          </p>
        </div>

        {/* Expand button */}
        <div className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
          ${config.iconBg} transition-transform duration-300
          ${isExpanded ? 'rotate-180' : ''}
        `}>
          <ChevronDown className={`w-4 h-4 ${config.iconColor}`} />
        </div>
      </button>

      {/* Expanded content */}
      <div className={`
        overflow-hidden transition-all duration-300 ease-out
        ${isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}
      `}>
        <div className="px-3 pb-3 md:px-4 md:pb-4">
          {/* Separator */}
          <div className={`h-px mb-3 ${config.borderColor}`} />

          {/* Children (form or content) */}
          {children ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-hidden">
              {children}
            </div>
          ) : (
            <div className="text-center py-4">
              <button
                onClick={onAction}
                className={`
                  inline-flex items-center gap-2 px-6 py-3 rounded-xl
                  bg-gradient-to-r ${config.bgGradient} text-white font-medium
                  shadow-lg hover:shadow-xl transition-all duration-200
                  hover:scale-[1.02] active:scale-[0.98]
                `}
              >
                {intl.formatMessage({ id: 'common.continue', defaultMessage: 'Continue' })}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KYCBannerCompact;
