// src/components/common/IOSInstallInstructions.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { X, Share, Plus, ChevronDown } from 'lucide-react';
import { useIntl } from 'react-intl';

interface IOSInstallInstructionsProps {
  onClose?: () => void;
  className?: string;
}

// Detect iOS Safari
const isIOSSafari = (): boolean => {
  if (typeof window === 'undefined') return false;

  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const notChrome = !/CriOS/.test(ua);
  const notFirefox = !/FxiOS/.test(ua);

  return iOS && webkit && notChrome && notFirefox;
};

// Check if already installed as PWA
const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean })?.standalone === true
  );
};

const STORAGE_KEY = 'ios_install_dismissed_at';
const DISMISS_DAYS = 14;

const IOSInstallInstructions: React.FC<IOSInstallInstructionsProps> = ({
  onClose,
  className = '',
}) => {
  const intl = useIntl();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Only show on iOS Safari and not already installed
    if (!isIOSSafari() || isStandalone()) {
      return;
    }

    // Check if recently dismissed
    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (dismissedAt) {
      const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_DAYS) {
        return;
      }
    }

    // Show after a delay
    const timer = setTimeout(() => setIsVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setIsVisible(false);
    onClose?.();
  }, [onClose]);

  const steps = [
    {
      icon: <Share className="w-6 h-6" />,
      title: intl.formatMessage({ id: 'pwa.ios.step1.title' }),
      description: intl.formatMessage({ id: 'pwa.ios.step1.description' }),
      highlight: "share",
    },
    {
      icon: <ChevronDown className="w-6 h-6" />,
      title: intl.formatMessage({ id: 'pwa.ios.step2.title' }),
      description: intl.formatMessage({ id: 'pwa.ios.step2.description' }),
      highlight: "scroll",
    },
    {
      icon: <Plus className="w-6 h-6" />,
      title: intl.formatMessage({ id: 'pwa.ios.step3.title' }),
      description: intl.formatMessage({ id: 'pwa.ios.step3.description' }),
      highlight: "add",
    },
  ];

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fadeIn ${className}`}
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-install-title"
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
              SOS
            </div>
            <div>
              <h2 id="ios-install-title" className="font-bold text-gray-900">
                {intl.formatMessage({ id: 'pwa.ios.header.title' })}
              </h2>
              <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'pwa.ios.header.subtitle' })}</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label={intl.formatMessage({ id: 'pwa.install.close' })}
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Benefits */}
        <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-green-500">✓</span>
              <span className="text-gray-700">{intl.formatMessage({ id: 'pwa.ios.benefits.quickAccess' })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-green-500">✓</span>
              <span className="text-gray-700">{intl.formatMessage({ id: 'pwa.ios.benefits.offline' })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-green-500">✓</span>
              <span className="text-gray-700">{intl.formatMessage({ id: 'pwa.ios.benefits.notifications' })}</span>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="p-4 space-y-3">
          {steps.map((step, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-full flex items-start gap-4 p-3 rounded-xl text-left transition-all ${
                currentStep === index
                  ? 'bg-red-50 border-2 border-red-200'
                  : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
              }`}
            >
              <div
                className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  currentStep === index
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={currentStep === index ? 'text-red-500' : 'text-gray-400'}>
                    {step.icon}
                  </span>
                  <h3 className={`font-semibold ${currentStep === index ? 'text-red-700' : 'text-gray-700'}`}>
                    {step.title}
                  </h3>
                </div>
                <p className="text-sm text-gray-500 mt-1">{step.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Visual Guide */}
        <div className="px-4 pb-4">
          <div className="bg-gray-900 rounded-2xl p-4 relative overflow-hidden">
            {/* Safari bottom bar mock */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gray-800 flex items-center justify-around px-8">
              <div className="w-6 h-6 bg-gray-600 rounded" />
              <div className="w-6 h-6 bg-gray-600 rounded" />
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  currentStep === 0 ? 'bg-blue-500 animate-pulse scale-110' : 'bg-gray-600'
                }`}
              >
                <Share className="w-4 h-4 text-white" />
              </div>
              <div className="w-6 h-6 bg-gray-600 rounded" />
              <div className="w-6 h-6 bg-gray-600 rounded" />
            </div>

            {/* Content area */}
            <div className="h-32 flex items-center justify-center text-gray-400 text-sm mb-12">
              {currentStep === 0 && (
                <div className="text-center">
                  <Share className="w-12 h-12 mx-auto mb-2 text-blue-400 animate-bounce" />
                  <p>{intl.formatMessage({ id: 'pwa.ios.visual.tapShare' })}</p>
                </div>
              )}
              {currentStep === 1 && (
                <div className="text-center">
                  <ChevronDown className="w-12 h-12 mx-auto mb-2 text-blue-400 animate-bounce" />
                  <p>{intl.formatMessage({ id: 'pwa.ios.visual.scrollDown' })}</p>
                </div>
              )}
              {currentStep === 2 && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Plus className="w-8 h-8 text-blue-400" />
                    <span className="text-white font-medium">{intl.formatMessage({ id: 'pwa.ios.visual.addToHome' })}</span>
                  </div>
                  <p>{intl.formatMessage({ id: 'pwa.ios.visual.tapToInstall' })}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 rounded-b-3xl">
          <button
            onClick={handleDismiss}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium"
          >
            {intl.formatMessage({ id: 'pwa.install.later' })}
          </button>
          <div className="flex items-center gap-1.5">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  currentStep === index ? 'bg-red-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => setCurrentStep((prev) => (prev + 1) % steps.length)}
            className="text-red-500 hover:text-red-600 text-sm font-medium"
          >
            {currentStep < steps.length - 1
              ? intl.formatMessage({ id: 'pwa.ios.button.next' })
              : intl.formatMessage({ id: 'pwa.ios.button.restart' })}
          </button>
        </div>

        {/* Safe area padding for iOS */}
        <div className="h-safe-area-inset-bottom bg-gray-50" />
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-slideUp { animation: slideUp 0.4s ease-out; }
        .h-safe-area-inset-bottom { height: env(safe-area-inset-bottom, 0); }
      `}</style>
    </div>
  );
};

export default IOSInstallInstructions;
