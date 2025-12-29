/**
 * Subscription Success Page
 * Page de confirmation après abonnement réussi
 */

import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Sparkles, ArrowRight, Zap, Gift } from 'lucide-react';
import Confetti from 'react-confetti';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useSubscription } from '../../../hooks/useSubscription';
import { useApp } from '../../../contexts/AppContext';
import { SupportedLanguage } from '../../../types/subscription';
import { cn } from '../../../utils/cn';

export const SubscriptionSuccessPage: React.FC = () => {
  const intl = useIntl();
  const { language: locale } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { subscription, plans, refresh } = useSubscription();
  const [showConfetti, setShowConfetti] = useState(true);

  // Reload subscription data
  useEffect(() => {
    refresh();

    // Stop confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, [refresh]);

  // Get current plan name
  const currentPlan = plans.find(p => p.id === subscription?.planId);
  const planName = currentPlan?.name[locale as SupportedLanguage] || currentPlan?.name.fr || subscription?.tier || 'Plan';

  return (
    <DashboardLayout activeKey="subscription">
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4 min-h-[60vh]">
        {/* Confetti */}
        {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
          colors={['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981']}
        />
      )}

      <div className="max-w-lg w-full">
        {/* Success Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
          {/* Success Icon */}
          <div className="relative inline-block mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center">
              <Gift className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            {intl.formatMessage({ id: 'subscription.success.title' })}
          </h1>

          <p className="text-lg text-gray-600 mb-6">
            {intl.formatMessage({ id: 'subscription.success.subtitle' }, { plan: planName })}
          </p>

          {/* Plan Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full mb-8">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold text-indigo-700">{planName}</span>
          </div>

          {/* Features Unlocked */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              {intl.formatMessage({ id: 'subscription.success.accessTo' })}
            </h3>
            <ul className="space-y-3">
              {[
                intl.formatMessage({ id: 'subscription.success.features.fullAccess' }),
                intl.formatMessage({ id: 'subscription.success.features.smartAssistant' }),
                intl.formatMessage({ id: 'subscription.success.features.contextualSuggestions' }),
                currentPlan?.aiCallsLimit === -1
                  ? intl.formatMessage({ id: 'subscription.success.features.unlimitedCallsPerMonth' })
                  : intl.formatMessage({ id: 'subscription.success.features.callsPerMonth' }, { count: currentPlan?.aiCallsLimit || 5 })
              ].map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/dashboard/ai-assistant')}
              className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              {intl.formatMessage({ id: 'subscription.success.startUsing' })}
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => navigate('/dashboard/subscription')}
              className="w-full py-3 px-6 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              {intl.formatMessage({ id: 'subscription.success.viewSubscription' })}
            </button>
          </div>

          {/* Help Text */}
          <p className="text-sm text-gray-500 mt-6">
            {intl.formatMessage({ id: 'subscription.success.emailSent' })}
          </p>
        </div>

        {/* Trust Badge */}
        <div className="text-center mt-6 text-sm text-gray-500">
          {intl.formatMessage({ id: 'subscription.success.thankYou' })}
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
};

export default SubscriptionSuccessPage;
