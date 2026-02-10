import React from 'react';
import { Check } from 'lucide-react';
import type { ThemeTokens } from './theme';

interface StepProgressBarProps {
  theme: ThemeTokens;
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

const StepProgressBar: React.FC<StepProgressBarProps> = React.memo(({
  theme,
  currentStep,
  totalSteps,
  stepLabels,
}) => {
  const progressPercent = ((currentStep) / totalSteps) * 100;

  return (
    <div className="mb-8" role="navigation" aria-label="Registration progress">
      {/* Progress bar */}
      <div
        className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-4"
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Step ${currentStep} of ${totalSteps}`}
      >
        <div
          className={`h-full bg-gradient-to-r ${theme.accentGradient} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between" role="list">
        {stepLabels.map((label, idx) => {
          const stepNum = idx + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;

          return (
            <div
              key={idx}
              className="flex flex-col items-center gap-1.5 flex-1"
              role="listitem"
              aria-current={isActive ? 'step' : undefined}
            >
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                  transition-all duration-300
                  ${isCompleted
                    ? `bg-gradient-to-r ${theme.accentGradient} text-white`
                    : isActive
                      ? `bg-gradient-to-r ${theme.accentGradient} text-white ring-4 ring-white/10`
                      : 'bg-white/10 text-gray-500'
                  }
                `}
                aria-hidden="true"
              >
                {isCompleted ? <Check className="w-4 h-4" aria-hidden="true" /> : stepNum}
              </div>
              <span
                className={`text-[10px] sm:text-xs font-medium text-center leading-tight
                  ${isActive ? 'text-white' : isCompleted ? 'text-gray-400' : 'text-gray-600'}
                `}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

StepProgressBar.displayName = 'StepProgressBar';
export default StepProgressBar;
