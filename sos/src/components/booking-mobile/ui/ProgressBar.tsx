import React from 'react';
import { useMobileBooking } from '../context/MobileBookingContext';

export const ProgressBar: React.FC = () => {
  const { currentStep, totalSteps } = useMobileBooking();
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">
          Étape {currentStep} / {totalSteps}
        </span>
        <span className="text-xs font-medium text-red-600">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-red-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
