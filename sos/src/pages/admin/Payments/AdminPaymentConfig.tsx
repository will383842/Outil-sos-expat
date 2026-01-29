/**
 * AdminPaymentConfig.tsx
 *
 * Admin configuration page for payment settings.
 * Manages global payment settings for Chatter, Influencer, and Blogger systems.
 * Includes minimum withdrawal amounts, payment methods, processing options, etc.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
  collection,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import AdminLayout from '../../../components/admin/AdminLayout';
import Button from '../../../components/common/Button';
import {
  Settings,
  Save,
  AlertCircle,
  CheckCircle,
  XCircle,
  DollarSign,
  Clock,
  CreditCard,
  Shield,
  Globe,
  RefreshCw,
  Loader2,
  Info,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Percent,
  Building,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface PaymentConfig {
  // System toggles
  chatterWithdrawalsEnabled: boolean;
  influencerWithdrawalsEnabled: boolean;
  bloggerWithdrawalsEnabled: boolean;

  // Minimum withdrawal amounts (in cents/USD)
  chatterMinimumWithdrawal: number;
  influencerMinimumWithdrawal: number;
  bloggerMinimumWithdrawal: number;

  // Maximum withdrawal amounts per request
  chatterMaximumWithdrawal: number;
  influencerMaximumWithdrawal: number;
  bloggerMaximumWithdrawal: number;

  // Validation periods (in days)
  chatterHoldPeriodDays: number;
  influencerHoldPeriodDays: number;
  bloggerHoldPeriodDays: number;

  // Release delays (in hours after validation)
  chatterReleaseDelayHours: number;
  influencerReleaseDelayHours: number;
  bloggerReleaseDelayHours: number;

  // Payment methods enabled
  wiseEnabled: boolean;
  paypalEnabled: boolean;
  mobileMoneyEnabled: boolean;
  bankTransferEnabled: boolean;

  // Supported currencies
  supportedCurrencies: string[];

  // Mobile money providers enabled
  mobileMoneyProviders: string[];

  // Processing options
  autoApproveEnabled: boolean;
  autoApproveThreshold: number;
  batchProcessingEnabled: boolean;
  batchProcessingTime: string; // HH:MM UTC

  // Notifications
  adminEmailNotifications: boolean;
  adminNotificationEmails: string[];

  // Fees
  platformFeePercent: number;
  minimumFeeAmount: number;

  // Rate limits
  maxWithdrawalsPerDay: number;
  maxWithdrawalsPerWeek: number;

  // Metadata
  updatedAt: string;
  updatedBy: string;
  version: number;
}

const DEFAULT_CONFIG: PaymentConfig = {
  chatterWithdrawalsEnabled: true,
  influencerWithdrawalsEnabled: true,
  bloggerWithdrawalsEnabled: true,
  chatterMinimumWithdrawal: 2000, // $20
  influencerMinimumWithdrawal: 5000, // $50
  bloggerMinimumWithdrawal: 2000, // $20
  chatterMaximumWithdrawal: 500000, // $5000
  influencerMaximumWithdrawal: 1000000, // $10000
  bloggerMaximumWithdrawal: 500000, // $5000
  chatterHoldPeriodDays: 7,
  influencerHoldPeriodDays: 14,
  bloggerHoldPeriodDays: 7,
  chatterReleaseDelayHours: 24,
  influencerReleaseDelayHours: 24,
  bloggerReleaseDelayHours: 24,
  wiseEnabled: true,
  paypalEnabled: true,
  mobileMoneyEnabled: true,
  bankTransferEnabled: false,
  supportedCurrencies: ['USD', 'EUR', 'GBP', 'XOF', 'XAF', 'NGN', 'KES'],
  mobileMoneyProviders: ['orange_money', 'wave', 'mtn_momo', 'moov_money', 'airtel_money', 'mpesa'],
  autoApproveEnabled: false,
  autoApproveThreshold: 10000, // $100
  batchProcessingEnabled: false,
  batchProcessingTime: '09:00',
  adminEmailNotifications: true,
  adminNotificationEmails: [],
  platformFeePercent: 0,
  minimumFeeAmount: 0,
  maxWithdrawalsPerDay: 3,
  maxWithdrawalsPerWeek: 10,
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
  version: 1,
};

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'XOF', name: 'CFA Franc BCEAO', symbol: 'CFA' },
  { code: 'XAF', name: 'CFA Franc BEAC', symbol: 'FCFA' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'DH' },
  { code: 'TND', name: 'Tunisian Dinar', symbol: 'DT' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
];

const MOBILE_MONEY_PROVIDERS = [
  { id: 'orange_money', name: 'Orange Money', countries: ['SN', 'CI', 'ML', 'BF', 'CM'] },
  { id: 'wave', name: 'Wave', countries: ['SN', 'CI', 'ML', 'BF'] },
  { id: 'mtn_momo', name: 'MTN Mobile Money', countries: ['GH', 'UG', 'CM', 'CI', 'BJ'] },
  { id: 'moov_money', name: 'Moov Money', countries: ['CI', 'BJ', 'TG', 'NE'] },
  { id: 'airtel_money', name: 'Airtel Money', countries: ['KE', 'UG', 'TZ', 'NG'] },
  { id: 'mpesa', name: 'M-Pesa', countries: ['KE', 'TZ', 'GH', 'EG'] },
  { id: 'free_money', name: 'Free Money', countries: ['SN'] },
  { id: 't_money', name: 'T-Money', countries: ['TG'] },
  { id: 'flooz', name: 'Flooz', countries: ['TG', 'CI'] },
];

// ============================================================================
// TOGGLE COMPONENT
// ============================================================================

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

const Toggle: React.FC<ToggleProps> = ({ enabled, onChange, label, description, disabled }) => {
  return (
    <div className="flex items-start justify-between py-3">
      <div className="flex-1">
        <p className="font-medium text-gray-900">{label}</p>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => !disabled && onChange(!enabled)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${enabled ? 'bg-red-600' : 'bg-gray-200'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};

// ============================================================================
// NUMBER INPUT COMPONENT
// ============================================================================

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  disabled?: boolean;
  isCents?: boolean;
}

const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  label,
  description,
  min = 0,
  max,
  step = 1,
  prefix,
  suffix,
  disabled,
  isCents = false,
}) => {
  const displayValue = isCents ? value / 100 : value;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value) || 0;
    onChange(isCents ? Math.round(newValue * 100) : newValue);
  };

  return (
    <div className="py-3">
      <label className="block font-medium text-gray-900 mb-1">{label}</label>
      {description && <p className="text-sm text-gray-500 mb-2">{description}</p>}
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">{prefix}</span>
        )}
        <input
          type="number"
          value={displayValue}
          onChange={handleChange}
          min={isCents ? (min / 100) : min}
          max={max !== undefined ? (isCents ? max / 100 : max) : undefined}
          step={isCents ? 0.01 : step}
          disabled={disabled}
          className={`w-full border border-gray-300 rounded-lg py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent ${
            prefix ? 'pl-8' : 'pl-3'
          } ${suffix ? 'pr-12' : 'pr-3'} ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">{suffix}</span>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AdminPaymentConfig: React.FC = () => {
  const intl = useIntl();

  // State
  const [config, setConfig] = useState<PaymentConfig>(DEFAULT_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<PaymentConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const docRef = doc(db, 'admin_config', 'payment_settings');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as PaymentConfig;
        setConfig({ ...DEFAULT_CONFIG, ...data });
        setOriginalConfig({ ...DEFAULT_CONFIG, ...data });
      } else {
        // Create default config if it doesn't exist
        await setDoc(docRef, DEFAULT_CONFIG);
        setConfig(DEFAULT_CONFIG);
        setOriginalConfig(DEFAULT_CONFIG);
      }
    } catch (err) {
      console.error('Error fetching config:', err);
      setError(intl.formatMessage({ id: 'admin.paymentConfig.error.fetch', defaultMessage: 'Erreur lors du chargement de la configuration' }));
    } finally {
      setIsLoading(false);
    }
  }, [intl]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    // Check for changes
    setHasChanges(JSON.stringify(config) !== JSON.stringify(originalConfig));
  }, [config, originalConfig]);

  // ============================================================================
  // SAVE
  // ============================================================================

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const docRef = doc(db, 'admin_config', 'payment_settings');
      const updatedConfig = {
        ...config,
        updatedAt: new Date().toISOString(),
        updatedBy: 'admin',
        version: (config.version || 0) + 1,
      };

      await setDoc(docRef, updatedConfig);

      setConfig(updatedConfig);
      setOriginalConfig(updatedConfig);
      setSuccess(intl.formatMessage({ id: 'admin.paymentConfig.success.saved', defaultMessage: 'Configuration enregistree avec succes' }));
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error('Error saving config:', err);
      setError(intl.formatMessage({ id: 'admin.paymentConfig.error.save', defaultMessage: 'Erreur lors de l\'enregistrement' }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(originalConfig);
  };

  const updateConfig = <K extends keyof PaymentConfig>(key: K, value: PaymentConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const toggleCurrency = (code: string) => {
    setConfig(prev => {
      const currencies = prev.supportedCurrencies.includes(code)
        ? prev.supportedCurrencies.filter(c => c !== code)
        : [...prev.supportedCurrencies, code];
      return { ...prev, supportedCurrencies: currencies };
    });
  };

  const toggleMobileProvider = (id: string) => {
    setConfig(prev => {
      const providers = prev.mobileMoneyProviders.includes(id)
        ? prev.mobileMoneyProviders.filter(p => p !== id)
        : [...prev.mobileMoneyProviders, id];
      return { ...prev, mobileMoneyProviders: providers };
    });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
          <span className="ml-2 text-gray-600">
            <FormattedMessage id="common.loading" defaultMessage="Chargement..." />
          </span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Settings className="w-7 h-7 mr-2 text-gray-500" />
              <FormattedMessage id="admin.paymentConfig.title" defaultMessage="Configuration des Paiements" />
            </h1>
            <p className="text-gray-600 mt-1">
              <FormattedMessage
                id="admin.paymentConfig.description"
                defaultMessage="Gerez les parametres de retrait pour tous les systemes"
              />
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button variant="outline" onClick={handleReset}>
                <RefreshCw size={16} className="mr-2" />
                <FormattedMessage id="common.reset" defaultMessage="Reinitialiser" />
              </Button>
            )}
            <Button onClick={handleSave} disabled={!hasChanges || isSaving} loading={isSaving}>
              <Save size={16} className="mr-2" />
              <FormattedMessage id="common.save" defaultMessage="Enregistrer" />
            </Button>
          </div>
        </div>

        {/* Unsaved Changes Warning */}
        {hasChanges && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
            <span className="text-yellow-700">
              <FormattedMessage id="admin.paymentConfig.unsavedChanges" defaultMessage="Vous avez des modifications non enregistrees" />
            </span>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-green-700">{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-auto text-green-500 hover:text-green-700">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Toggles */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-gray-500" />
              <FormattedMessage id="admin.paymentConfig.section.systemToggles" defaultMessage="Activation des Systemes" />
            </h2>
            <div className="divide-y divide-gray-200">
              <Toggle
                enabled={config.chatterWithdrawalsEnabled}
                onChange={(v) => updateConfig('chatterWithdrawalsEnabled', v)}
                label={intl.formatMessage({ id: 'admin.paymentConfig.chatterWithdrawals', defaultMessage: 'Retraits Chatter' })}
                description={intl.formatMessage({ id: 'admin.paymentConfig.chatterWithdrawalsDesc', defaultMessage: 'Permettre aux chatters de faire des retraits' })}
              />
              <Toggle
                enabled={config.influencerWithdrawalsEnabled}
                onChange={(v) => updateConfig('influencerWithdrawalsEnabled', v)}
                label={intl.formatMessage({ id: 'admin.paymentConfig.influencerWithdrawals', defaultMessage: 'Retraits Influencer' })}
                description={intl.formatMessage({ id: 'admin.paymentConfig.influencerWithdrawalsDesc', defaultMessage: 'Permettre aux influenceurs de faire des retraits' })}
              />
              <Toggle
                enabled={config.bloggerWithdrawalsEnabled}
                onChange={(v) => updateConfig('bloggerWithdrawalsEnabled', v)}
                label={intl.formatMessage({ id: 'admin.paymentConfig.bloggerWithdrawals', defaultMessage: 'Retraits Blogger' })}
                description={intl.formatMessage({ id: 'admin.paymentConfig.bloggerWithdrawalsDesc', defaultMessage: 'Permettre aux blogueurs de faire des retraits' })}
              />
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-gray-500" />
              <FormattedMessage id="admin.paymentConfig.section.paymentMethods" defaultMessage="Methodes de Paiement" />
            </h2>
            <div className="divide-y divide-gray-200">
              <Toggle
                enabled={config.wiseEnabled}
                onChange={(v) => updateConfig('wiseEnabled', v)}
                label="Wise"
                description={intl.formatMessage({ id: 'admin.paymentConfig.wiseDesc', defaultMessage: 'Virements internationaux via Wise' })}
              />
              <Toggle
                enabled={config.paypalEnabled}
                onChange={(v) => updateConfig('paypalEnabled', v)}
                label="PayPal"
                description={intl.formatMessage({ id: 'admin.paymentConfig.paypalDesc', defaultMessage: 'Paiements via PayPal' })}
              />
              <Toggle
                enabled={config.mobileMoneyEnabled}
                onChange={(v) => updateConfig('mobileMoneyEnabled', v)}
                label="Mobile Money"
                description={intl.formatMessage({ id: 'admin.paymentConfig.mobileMoneyDesc', defaultMessage: 'Orange Money, Wave, MTN MoMo, etc.' })}
              />
              <Toggle
                enabled={config.bankTransferEnabled}
                onChange={(v) => updateConfig('bankTransferEnabled', v)}
                label={intl.formatMessage({ id: 'admin.paymentConfig.bankTransfer', defaultMessage: 'Virement Bancaire' })}
                description={intl.formatMessage({ id: 'admin.paymentConfig.bankTransferDesc', defaultMessage: 'Virements bancaires directs' })}
              />
            </div>
          </div>

          {/* Chatter Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-5 h-5 mr-2 bg-purple-100 text-purple-600 rounded flex items-center justify-center text-xs font-bold">C</span>
              <FormattedMessage id="admin.paymentConfig.section.chatterSettings" defaultMessage="Parametres Chatter" />
            </h2>
            <NumberInput
              value={config.chatterMinimumWithdrawal}
              onChange={(v) => updateConfig('chatterMinimumWithdrawal', v)}
              label={intl.formatMessage({ id: 'admin.paymentConfig.minimumWithdrawal', defaultMessage: 'Retrait minimum' })}
              prefix="$"
              isCents
            />
            <NumberInput
              value={config.chatterMaximumWithdrawal}
              onChange={(v) => updateConfig('chatterMaximumWithdrawal', v)}
              label={intl.formatMessage({ id: 'admin.paymentConfig.maximumWithdrawal', defaultMessage: 'Retrait maximum' })}
              prefix="$"
              isCents
            />
            <NumberInput
              value={config.chatterHoldPeriodDays}
              onChange={(v) => updateConfig('chatterHoldPeriodDays', v)}
              label={intl.formatMessage({ id: 'admin.paymentConfig.holdPeriod', defaultMessage: 'Periode de retention' })}
              suffix={intl.formatMessage({ id: 'common.days', defaultMessage: 'jours' })}
              min={0}
              max={90}
            />
            <NumberInput
              value={config.chatterReleaseDelayHours}
              onChange={(v) => updateConfig('chatterReleaseDelayHours', v)}
              label={intl.formatMessage({ id: 'admin.paymentConfig.releaseDelay', defaultMessage: 'Delai de liberation' })}
              suffix={intl.formatMessage({ id: 'common.hours', defaultMessage: 'heures' })}
              min={0}
              max={168}
            />
          </div>

          {/* Influencer Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-5 h-5 mr-2 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs font-bold">I</span>
              <FormattedMessage id="admin.paymentConfig.section.influencerSettings" defaultMessage="Parametres Influencer" />
            </h2>
            <NumberInput
              value={config.influencerMinimumWithdrawal}
              onChange={(v) => updateConfig('influencerMinimumWithdrawal', v)}
              label={intl.formatMessage({ id: 'admin.paymentConfig.minimumWithdrawal', defaultMessage: 'Retrait minimum' })}
              prefix="$"
              isCents
            />
            <NumberInput
              value={config.influencerMaximumWithdrawal}
              onChange={(v) => updateConfig('influencerMaximumWithdrawal', v)}
              label={intl.formatMessage({ id: 'admin.paymentConfig.maximumWithdrawal', defaultMessage: 'Retrait maximum' })}
              prefix="$"
              isCents
            />
            <NumberInput
              value={config.influencerHoldPeriodDays}
              onChange={(v) => updateConfig('influencerHoldPeriodDays', v)}
              label={intl.formatMessage({ id: 'admin.paymentConfig.holdPeriod', defaultMessage: 'Periode de retention' })}
              suffix={intl.formatMessage({ id: 'common.days', defaultMessage: 'jours' })}
              min={0}
              max={90}
            />
            <NumberInput
              value={config.influencerReleaseDelayHours}
              onChange={(v) => updateConfig('influencerReleaseDelayHours', v)}
              label={intl.formatMessage({ id: 'admin.paymentConfig.releaseDelay', defaultMessage: 'Delai de liberation' })}
              suffix={intl.formatMessage({ id: 'common.hours', defaultMessage: 'heures' })}
              min={0}
              max={168}
            />
          </div>

          {/* Blogger Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-5 h-5 mr-2 bg-green-100 text-green-600 rounded flex items-center justify-center text-xs font-bold">B</span>
              <FormattedMessage id="admin.paymentConfig.section.bloggerSettings" defaultMessage="Parametres Blogger" />
            </h2>
            <NumberInput
              value={config.bloggerMinimumWithdrawal}
              onChange={(v) => updateConfig('bloggerMinimumWithdrawal', v)}
              label={intl.formatMessage({ id: 'admin.paymentConfig.minimumWithdrawal', defaultMessage: 'Retrait minimum' })}
              prefix="$"
              isCents
            />
            <NumberInput
              value={config.bloggerMaximumWithdrawal}
              onChange={(v) => updateConfig('bloggerMaximumWithdrawal', v)}
              label={intl.formatMessage({ id: 'admin.paymentConfig.maximumWithdrawal', defaultMessage: 'Retrait maximum' })}
              prefix="$"
              isCents
            />
            <NumberInput
              value={config.bloggerHoldPeriodDays}
              onChange={(v) => updateConfig('bloggerHoldPeriodDays', v)}
              label={intl.formatMessage({ id: 'admin.paymentConfig.holdPeriod', defaultMessage: 'Periode de retention' })}
              suffix={intl.formatMessage({ id: 'common.days', defaultMessage: 'jours' })}
              min={0}
              max={90}
            />
            <NumberInput
              value={config.bloggerReleaseDelayHours}
              onChange={(v) => updateConfig('bloggerReleaseDelayHours', v)}
              label={intl.formatMessage({ id: 'admin.paymentConfig.releaseDelay', defaultMessage: 'Delai de liberation' })}
              suffix={intl.formatMessage({ id: 'common.hours', defaultMessage: 'heures' })}
              min={0}
              max={168}
            />
          </div>

          {/* Auto Processing */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <RefreshCw className="w-5 h-5 mr-2 text-gray-500" />
              <FormattedMessage id="admin.paymentConfig.section.autoProcessing" defaultMessage="Traitement Automatique" />
            </h2>
            <div className="divide-y divide-gray-200">
              <Toggle
                enabled={config.autoApproveEnabled}
                onChange={(v) => updateConfig('autoApproveEnabled', v)}
                label={intl.formatMessage({ id: 'admin.paymentConfig.autoApprove', defaultMessage: 'Approbation automatique' })}
                description={intl.formatMessage({ id: 'admin.paymentConfig.autoApproveDesc', defaultMessage: 'Approuver automatiquement les petits retraits' })}
              />
              {config.autoApproveEnabled && (
                <NumberInput
                  value={config.autoApproveThreshold}
                  onChange={(v) => updateConfig('autoApproveThreshold', v)}
                  label={intl.formatMessage({ id: 'admin.paymentConfig.autoApproveThreshold', defaultMessage: 'Seuil d\'approbation auto' })}
                  description={intl.formatMessage({ id: 'admin.paymentConfig.autoApproveThresholdDesc', defaultMessage: 'Montant max pour approbation automatique' })}
                  prefix="$"
                  isCents
                />
              )}
              <Toggle
                enabled={config.batchProcessingEnabled}
                onChange={(v) => updateConfig('batchProcessingEnabled', v)}
                label={intl.formatMessage({ id: 'admin.paymentConfig.batchProcessing', defaultMessage: 'Traitement par lot' })}
                description={intl.formatMessage({ id: 'admin.paymentConfig.batchProcessingDesc', defaultMessage: 'Regrouper les paiements pour traitement' })}
              />
            </div>
          </div>

          {/* Rate Limits */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-gray-500" />
              <FormattedMessage id="admin.paymentConfig.section.rateLimits" defaultMessage="Limites de Frequence" />
            </h2>
            <NumberInput
              value={config.maxWithdrawalsPerDay}
              onChange={(v) => updateConfig('maxWithdrawalsPerDay', v)}
              label={intl.formatMessage({ id: 'admin.paymentConfig.maxPerDay', defaultMessage: 'Retraits max par jour' })}
              description={intl.formatMessage({ id: 'admin.paymentConfig.maxPerDayDesc', defaultMessage: 'Par utilisateur' })}
              min={1}
              max={10}
            />
            <NumberInput
              value={config.maxWithdrawalsPerWeek}
              onChange={(v) => updateConfig('maxWithdrawalsPerWeek', v)}
              label={intl.formatMessage({ id: 'admin.paymentConfig.maxPerWeek', defaultMessage: 'Retraits max par semaine' })}
              description={intl.formatMessage({ id: 'admin.paymentConfig.maxPerWeekDesc', defaultMessage: 'Par utilisateur' })}
              min={1}
              max={50}
            />
          </div>

          {/* Supported Currencies */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Globe className="w-5 h-5 mr-2 text-gray-500" />
              <FormattedMessage id="admin.paymentConfig.section.currencies" defaultMessage="Devises Supportees" />
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {CURRENCIES.map((currency) => (
                <button
                  key={currency.code}
                  onClick={() => toggleCurrency(currency.code)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    config.supportedCurrencies.includes(currency.code)
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-900">{currency.code}</p>
                  <p className="text-xs text-gray-500">{currency.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Money Providers */}
          {config.mobileMoneyEnabled && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Building className="w-5 h-5 mr-2 text-gray-500" />
                <FormattedMessage id="admin.paymentConfig.section.mobileProviders" defaultMessage="Operateurs Mobile Money" />
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {MOBILE_MONEY_PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => toggleMobileProvider(provider.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      config.mobileMoneyProviders.includes(provider.id)
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900">{provider.name}</p>
                    <p className="text-xs text-gray-500">{provider.countries.join(', ')}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-sm text-gray-500">
          <div className="flex flex-wrap gap-4">
            <span>
              <FormattedMessage id="admin.paymentConfig.version" defaultMessage="Version" />: {config.version}
            </span>
            <span>
              <FormattedMessage id="admin.paymentConfig.lastUpdated" defaultMessage="Derniere mise a jour" />: {intl.formatDate(new Date(config.updatedAt), { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
            <span>
              <FormattedMessage id="admin.paymentConfig.updatedBy" defaultMessage="Par" />: {config.updatedBy}
            </span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPaymentConfig;
