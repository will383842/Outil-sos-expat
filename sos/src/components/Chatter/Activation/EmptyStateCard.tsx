/**
 * EmptyStateCard - Reusable motivating empty state for any component
 * Never shows "$0.00" or "Aucune donnee" - always encourages action
 */

import React from 'react';
import { UI } from '@/components/Chatter/designTokens';

interface EmptyStateCardProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  cta?: {
    label: React.ReactNode;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  secondaryCta?: {
    label: React.ReactNode;
    onClick: () => void;
  };
  className?: string;
}

const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  icon,
  title,
  description,
  cta,
  secondaryCta,
  className = '',
}) => {
  return (
    <div className={`${UI.card} p-6 sm:p-8 text-center ${className}`}>
      <div className="flex justify-center mb-4">
        <div className="w-14 h-14 bg-slate-100 dark:bg-white/10 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-500">
          {icon}
        </div>
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
      {(cta || secondaryCta) && (
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
          {cta && (
            <button
              onClick={cta.onClick}
              className={`${
                cta.variant === 'secondary' ? UI.button.secondary : UI.button.primary
              } px-5 py-2.5 text-sm min-h-[44px]`}
            >
              {cta.label}
            </button>
          )}
          {secondaryCta && (
            <button
              onClick={secondaryCta.onClick}
              className={`${UI.button.ghost} px-4 py-2 text-sm min-h-[44px]`}
            >
              {secondaryCta.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyStateCard;
