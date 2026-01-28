import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useMobileBooking } from '../context/MobileBookingContext';

interface ProgressBarProps {
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ className = '' }) => {
  const { currentStep, totalSteps, triggerHaptic } = useMobileBooking();
  const prevStepRef = useRef(currentStep);

  const progress = (currentStep / totalSteps) * 100;

  // Milestones at 33%, 66%, 100%
  const milestones = [33, 66, 100];

  // Trigger haptic on milestone
  useEffect(() => {
    const prevProgress = (prevStepRef.current / totalSteps) * 100;
    const currentProgress = progress;

    // Check if we crossed a milestone
    for (const milestone of milestones) {
      if (prevProgress < milestone && currentProgress >= milestone) {
        triggerHaptic('success');
        break;
      }
    }

    prevStepRef.current = currentStep;
  }, [currentStep, progress, totalSteps, triggerHaptic]);

  return (
    <div className={`w-full ${className}`}>
      {/* Progress percentage */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500">
          {currentStep} / {totalSteps}
        </span>
        <motion.span
          key={progress}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-sm font-bold text-red-600 tabular-nums"
        >
          {Math.round(progress)}%
        </motion.span>
      </div>

      {/* Progress bar container */}
      <div className="relative w-full h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
        {/* Animated gradient fill */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: 'linear-gradient(90deg, #ef4444 0%, #f97316 50%, #f43f5e 100%)',
            backgroundSize: '200% 100%',
          }}
          initial={false}
          animate={{
            width: `${progress}%`,
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            width: { duration: 0.4, ease: 'easeOut' },
            backgroundPosition: { duration: 3, repeat: Infinity, ease: 'linear' },
          }}
        />

        {/* Milestone markers */}
        {milestones.slice(0, -1).map((milestone) => (
          <div
            key={milestone}
            className={`absolute top-1/2 -translate-y-1/2 w-1 h-4 rounded-full transition-colors duration-300 ${
              progress >= milestone ? 'bg-white/50' : 'bg-gray-300'
            }`}
            style={{ left: `${milestone}%`, transform: 'translate(-50%, -50%)' }}
          />
        ))}
      </div>

      {/* Step dots with labels */}
      <div className="flex justify-between mt-3 px-1">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <div key={stepNum} className="flex flex-col items-center">
              <motion.div
                className={`
                  w-2.5 h-2.5 rounded-full transition-all duration-300
                  ${isCompleted ? 'bg-green-500' : ''}
                  ${isCurrent ? 'bg-red-500 ring-4 ring-red-500/20' : ''}
                  ${!isCompleted && !isCurrent ? 'bg-gray-200' : ''}
                `}
                animate={isCurrent ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;
