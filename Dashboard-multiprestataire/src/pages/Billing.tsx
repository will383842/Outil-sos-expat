/**
 * Billing Page
 * Shows subscription plan and invoice history
 */
import { CreditCard, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PlanCard, InvoiceList, type Invoice } from '../components/billing';
import { Button } from '../components/ui';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

// Mock data - In production, this would come from Stripe/billing API
const MOCK_INVOICES: Invoice[] = [
  {
    id: '1',
    number: 'INV-2025-001',
    date: '01/02/2025',
    amount: 245.0,
    status: 'paid',
  },
  {
    id: '2',
    number: 'INV-2025-002',
    date: '01/01/2025',
    amount: 245.0,
    status: 'paid',
  },
  {
    id: '3',
    number: 'INV-2024-012',
    date: '01/12/2024',
    amount: 220.0,
    status: 'paid',
  },
];

export default function Billing() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const PLAN_FEATURES = [
    t('billing.feature_dashboard'),
    t('billing.feature_stats'),
    t('billing.feature_reports'),
    t('billing.feature_support'),
    t('billing.feature_csv'),
    t('billing.feature_api'),
  ];

  // In production, this would be fetched based on the user's subscription
  const maxProviders = user?.linkedProviderIds?.length || 0;
  const planTier = maxProviders <= 5 ? 'Starter' : maxProviders <= 20 ? 'Pro' : 'Enterprise';
  const planPrice = maxProviders <= 5 ? 99 : maxProviders <= 20 ? 245 : 499;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Current Plan */}
      <div className="mb-8">
        <PlanCard
          planName={`Multiprestataire ${planTier}`}
          price={planPrice}
          billingPeriod="month"
          maxProviders={maxProviders <= 5 ? 5 : maxProviders <= 20 ? 20 : 50}
          features={PLAN_FEATURES}
          onChangePlan={() => {
            toast(t('billing.change_plan_toast'), { icon: 'i' });
          }}
        />
      </div>

      {/* Payment Method */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('billing.payment_method')}
        </h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">---- ---- ---- 4242</p>
                <p className="text-sm text-gray-500">{t('billing.expires')} 12/26</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast(t('billing.modify_payment_toast'), { icon: 'i' })}
            >
              {t('common.modify')}
            </Button>
          </div>
        </div>
      </div>

      {/* Invoice History */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('billing.invoice_history')}
        </h2>
        <InvoiceList invoices={MOCK_INVOICES} />
      </div>

      {/* Support */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-2">
          {t('billing.help_title')}
        </h3>
        <p className="text-gray-600 mb-4">
          {t('billing.help_description')}
        </p>
        <Button
          variant="outline"
          leftIcon={<Mail className="w-4 h-4" />}
          onClick={() => window.open('mailto:billing@sos-expat.com', '_blank')}
        >
          {t('common.contact_support')}
        </Button>
      </div>
    </div>
  );
}
