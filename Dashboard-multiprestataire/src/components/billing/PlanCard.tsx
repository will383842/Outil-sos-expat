/**
 * Plan Card Component
 * Displays current subscription plan
 */
import { Crown, Check } from 'lucide-react';
import { Button } from '../ui';
import { useTranslation } from 'react-i18next';

interface PlanCardProps {
  planName: string;
  price: number;
  billingPeriod: 'month' | 'year';
  maxProviders: number;
  features: string[];
  onChangePlan?: () => void;
}

export default function PlanCard({
  planName,
  price,
  billingPeriod,
  maxProviders,
  features,
  onChangePlan,
}: PlanCardProps) {
  const { t } = useTranslation();
  return (
    <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-5 h-5 text-yellow-300" />
            <p className="text-primary-100 text-sm">{t('plan.current')}</p>
          </div>
          <h2 className="text-2xl font-bold">{planName}</h2>
          <p className="text-primary-100 mt-1">
            {t('plan.up_to_providers', { count: maxProviders })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold">
            €{price}
            <span className="text-lg font-normal">
              /{billingPeriod === 'month' ? t('plan.per_month') : t('plan.per_year')}
            </span>
          </p>
          {onChangePlan && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-3 bg-white text-primary-600 hover:bg-primary-50"
              onClick={onChangePlan}
            >
              {t('plan.change')}
            </Button>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="mt-6 pt-4 border-t border-white/20">
        <div className="grid grid-cols-2 gap-2">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-primary-200 flex-shrink-0" />
              <span className="text-primary-100">{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
