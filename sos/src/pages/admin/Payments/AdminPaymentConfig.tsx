/**
 * AdminPaymentConfig.tsx
 *
 * Admin configuration page for payment settings.
 * Manages global payment settings for ALL withdrawal-enabled roles:
 * - Chatter, Influencer, Blogger, Group Admin, Partner (role-specific systems)
 * - Affiliate (generic system — also used by Client, Lawyer, Expat via their affiliate codes)
 *
 * Includes minimum withdrawal amounts, payment methods, processing options, etc.
 * Saved to Firestore: admin_config/payment_settings
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  doc,
  getDoc,
  setDoc,
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
  Clock,
  CreditCard,
  Shield,
  Globe,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Building,
  Link,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface PaymentConfig {
  // Per-role withdrawal settings
  chatterWithdrawalsEnabled: boolean;
  chatterMinimumWithdrawal: number;
  chatterMaximumWithdrawal: number;
  chatterHoldPeriodDays: number;
  chatterReleaseDelayHours: number;

  influencerWithdrawalsEnabled: boolean;
  influencerMinimumWithdrawal: number;
  influencerMaximumWithdrawal: number;
  influencerHoldPeriodDays: number;
  influencerReleaseDelayHours: number;

  bloggerWithdrawalsEnabled: boolean;
  bloggerMinimumWithdrawal: number;
  bloggerMaximumWithdrawal: number;
  bloggerHoldPeriodDays: number;
  bloggerReleaseDelayHours: number;

  groupAdminWithdrawalsEnabled: boolean;
  groupAdminMinimumWithdrawal: number;
  groupAdminMaximumWithdrawal: number;
  groupAdminHoldPeriodDays: number;
  groupAdminReleaseDelayHours: number;

  affiliateWithdrawalsEnabled: boolean;
  affiliateMinimumWithdrawal: number;
  affiliateMaximumWithdrawal: number;
  affiliateHoldPeriodDays: number;
  affiliateReleaseDelayHours: number;

  clientWithdrawalsEnabled: boolean;
  clientMinimumWithdrawal: number;
  clientMaximumWithdrawal: number;
  clientHoldPeriodDays: number;
  clientReleaseDelayHours: number;

  lawyerWithdrawalsEnabled: boolean;
  lawyerMinimumWithdrawal: number;
  lawyerMaximumWithdrawal: number;
  lawyerHoldPeriodDays: number;
  lawyerReleaseDelayHours: number;

  expatWithdrawalsEnabled: boolean;
  expatMinimumWithdrawal: number;
  expatMaximumWithdrawal: number;
  expatHoldPeriodDays: number;
  expatReleaseDelayHours: number;

  partnerWithdrawalsEnabled: boolean;
  partnerMinimumWithdrawal: number;
  partnerMaximumWithdrawal: number;
  partnerHoldPeriodDays: number;
  partnerReleaseDelayHours: number;

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

  // Withdrawal fee (in dollars, e.g. 3 = $3 per withdrawal)
  withdrawalFeeFixed: number;

  // Rate limits
  maxWithdrawalsPerDay: number;
  maxWithdrawalsPerWeek: number;

  // Metadata
  updatedAt: string;
  updatedBy: string;
  version: number;
}

const DEFAULT_CONFIG: PaymentConfig = {
  // Chatter
  chatterWithdrawalsEnabled: true,
  chatterMinimumWithdrawal: 3000, // $30
  chatterMaximumWithdrawal: 500000, // $5000
  chatterHoldPeriodDays: 7,
  chatterReleaseDelayHours: 24,

  // Influencer
  influencerWithdrawalsEnabled: true,
  influencerMinimumWithdrawal: 3000, // $30
  influencerMaximumWithdrawal: 1000000, // $10000
  influencerHoldPeriodDays: 14,
  influencerReleaseDelayHours: 24,

  // Blogger
  bloggerWithdrawalsEnabled: true,
  bloggerMinimumWithdrawal: 3000, // $30
  bloggerMaximumWithdrawal: 500000, // $5000
  bloggerHoldPeriodDays: 7,
  bloggerReleaseDelayHours: 24,

  // Group Admin
  groupAdminWithdrawalsEnabled: true,
  groupAdminMinimumWithdrawal: 3000, // $30
  groupAdminMaximumWithdrawal: 500000, // $5000
  groupAdminHoldPeriodDays: 7,
  groupAdminReleaseDelayHours: 24,

  // Affiliate (generic)
  affiliateWithdrawalsEnabled: true,
  affiliateMinimumWithdrawal: 3000, // $30
  affiliateMaximumWithdrawal: 500000, // $5000
  affiliateHoldPeriodDays: 7,
  affiliateReleaseDelayHours: 24,

  // Client (commissions d'affiliation)
  clientWithdrawalsEnabled: true,
  clientMinimumWithdrawal: 3000, // $30
  clientMaximumWithdrawal: 500000, // $5000
  clientHoldPeriodDays: 7,
  clientReleaseDelayHours: 24,

  // Lawyer / Avocat (commissions d'affiliation)
  lawyerWithdrawalsEnabled: true,
  lawyerMinimumWithdrawal: 3000, // $30
  lawyerMaximumWithdrawal: 500000, // $5000
  lawyerHoldPeriodDays: 7,
  lawyerReleaseDelayHours: 24,

  // Expat / Expatrie aidant (commissions d'affiliation)
  expatWithdrawalsEnabled: true,
  expatMinimumWithdrawal: 3000, // $30
  expatMaximumWithdrawal: 500000, // $5000
  expatHoldPeriodDays: 7,
  expatReleaseDelayHours: 24,

  // Partner
  partnerWithdrawalsEnabled: true,
  partnerMinimumWithdrawal: 3000, // $30
  partnerMaximumWithdrawal: 500000, // $5000
  partnerHoldPeriodDays: 7,
  partnerReleaseDelayHours: 24,

  // Payment methods
  wiseEnabled: true,
  paypalEnabled: true,
  mobileMoneyEnabled: true,
  bankTransferEnabled: false,

  // Currencies (synced with backend mobileMoneyConfig.ts + countriesConfig.ts)
  supportedCurrencies: ['USD', 'EUR', 'GBP', 'XOF', 'XAF', 'NGN', 'KES', 'GHS', 'UGX', 'TZS'],

  // Mobile money providers (synced with backend mobileMoneyConfig.ts)
  mobileMoneyProviders: ['orange_money', 'wave', 'mtn_momo', 'moov_money', 'airtel_money', 'mpesa', 'free_money', 't_money', 'flooz'],

  // Processing
  autoApproveEnabled: false,
  autoApproveThreshold: 10000, // $100
  batchProcessingEnabled: false,
  batchProcessingTime: '09:00',

  // Notifications
  adminEmailNotifications: true,
  adminNotificationEmails: [],

  // Withdrawal fee
  withdrawalFeeFixed: 3, // $3 per withdrawal

  // Rate limits
  maxWithdrawalsPerDay: 3,
  maxWithdrawalsPerWeek: 10,

  // Metadata
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
  version: 1,
};

// All currencies supported by the backend (mobileMoneyConfig.ts + countriesConfig.ts)
const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '\u20AC' },
  { code: 'GBP', name: 'British Pound', symbol: '\u00A3' },
  { code: 'XOF', name: 'CFA Franc BCEAO', symbol: 'CFA' },
  { code: 'XAF', name: 'CFA Franc BEAC', symbol: 'FCFA' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '\u20A6' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '\u20B5' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh' },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'RF' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
  { code: 'CDF', name: 'Congolese Franc', symbol: 'FC' },
  { code: 'GNF', name: 'Guinean Franc', symbol: 'FG' },
  { code: 'MZN', name: 'Mozambican Metical', symbol: 'MT' },
  { code: 'DZD', name: 'Algerian Dinar', symbol: 'DA' },
  { code: 'SLL', name: 'Sierra Leonean Leone', symbol: 'Le' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'DH' },
  { code: 'TND', name: 'Tunisian Dinar', symbol: 'DT' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
];

// All mobile money providers from backend mobileMoneyConfig.ts (14 total)
const MOBILE_MONEY_PROVIDERS = [
  { id: 'orange_money', name: 'Orange Money', countries: ['SN', 'CI', 'ML', 'BF', 'GN', 'CM', 'NE'] },
  { id: 'wave', name: 'Wave', countries: ['SN', 'CI', 'ML', 'BF'] },
  { id: 'mtn_momo', name: 'MTN Mobile Money', countries: ['CM', 'CI', 'BJ', 'GH', 'NG', 'UG', 'RW'] },
  { id: 'moov_money', name: 'Moov Money', countries: ['CI', 'BJ', 'TG', 'BF'] },
  { id: 'airtel_money', name: 'Airtel Money', countries: ['GA', 'CG', 'TD', 'KE', 'TZ', 'UG'] },
  { id: 'mpesa', name: 'M-Pesa', countries: ['KE', 'TZ', 'GH'] },
  { id: 'free_money', name: 'Free Money', countries: ['SN'] },
  { id: 't_money', name: 'T-Money', countries: ['TG'] },
  { id: 'flooz', name: 'Flooz', countries: ['TG', 'CI'] },
  { id: 'vodacom', name: 'Vodacom M-Pesa', countries: ['CD', 'TZ', 'MZ'] },
  { id: 'mobilis', name: 'Mobilis', countries: ['DZ'] },
  { id: 'ecocash', name: 'EcoCash', countries: ['ZW'] },
  { id: 'afrimoney', name: 'AfriMoney', countries: ['SL', 'GN'] },
  { id: 'hormuud', name: 'Hormuud/EVC Plus', countries: ['SO'] },
];

// Role configuration for rendering settings sections
interface RoleSection {
  key: string;
  label: string;
  description: string;
  icon: string;
  bgColor: string;
  textColor: string;
  enabledKey: keyof PaymentConfig;
  minKey: keyof PaymentConfig;
  maxKey: keyof PaymentConfig;
  holdKey: keyof PaymentConfig;
  releaseKey: keyof PaymentConfig;
}

const ROLE_SECTIONS: RoleSection[] = [
  {
    key: 'chatter',
    label: 'Chatter',
    description: 'Chatters - commissions sur appels clients',
    icon: 'C',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-600',
    enabledKey: 'chatterWithdrawalsEnabled',
    minKey: 'chatterMinimumWithdrawal',
    maxKey: 'chatterMaximumWithdrawal',
    holdKey: 'chatterHoldPeriodDays',
    releaseKey: 'chatterReleaseDelayHours',
  },
  {
    key: 'influencer',
    label: 'Influencer',
    description: 'Influenceurs - commissions sur appels clients',
    icon: 'I',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-600',
    enabledKey: 'influencerWithdrawalsEnabled',
    minKey: 'influencerMinimumWithdrawal',
    maxKey: 'influencerMaximumWithdrawal',
    holdKey: 'influencerHoldPeriodDays',
    releaseKey: 'influencerReleaseDelayHours',
  },
  {
    key: 'blogger',
    label: 'Blogger',
    description: 'Blogueurs - commissions sur appels clients',
    icon: 'B',
    bgColor: 'bg-green-100',
    textColor: 'text-green-600',
    enabledKey: 'bloggerWithdrawalsEnabled',
    minKey: 'bloggerMinimumWithdrawal',
    maxKey: 'bloggerMaximumWithdrawal',
    holdKey: 'bloggerHoldPeriodDays',
    releaseKey: 'bloggerReleaseDelayHours',
  },
  {
    key: 'groupAdmin',
    label: 'Group Admin',
    description: 'Admins de groupe - commissions sur appels + recrutement',
    icon: 'G',
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-600',
    enabledKey: 'groupAdminWithdrawalsEnabled',
    minKey: 'groupAdminMinimumWithdrawal',
    maxKey: 'groupAdminMaximumWithdrawal',
    holdKey: 'groupAdminHoldPeriodDays',
    releaseKey: 'groupAdminReleaseDelayHours',
  },
  {
    key: 'affiliate',
    label: 'Affiliate',
    description: 'Systeme generique d\'affiliation',
    icon: 'A',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-600',
    enabledKey: 'affiliateWithdrawalsEnabled',
    minKey: 'affiliateMinimumWithdrawal',
    maxKey: 'affiliateMaximumWithdrawal',
    holdKey: 'affiliateHoldPeriodDays',
    releaseKey: 'affiliateReleaseDelayHours',
  },
  {
    key: 'client',
    label: 'Client',
    description: 'Clients - commissions d\'affiliation via lien de parrainage',
    icon: 'CL',
    bgColor: 'bg-sky-100',
    textColor: 'text-sky-600',
    enabledKey: 'clientWithdrawalsEnabled',
    minKey: 'clientMinimumWithdrawal',
    maxKey: 'clientMaximumWithdrawal',
    holdKey: 'clientHoldPeriodDays',
    releaseKey: 'clientReleaseDelayHours',
  },
  {
    key: 'lawyer',
    label: 'Avocat',
    description: 'Avocats - commissions d\'affiliation (en plus de leurs prestations Stripe)',
    icon: 'AV',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    enabledKey: 'lawyerWithdrawalsEnabled',
    minKey: 'lawyerMinimumWithdrawal',
    maxKey: 'lawyerMaximumWithdrawal',
    holdKey: 'lawyerHoldPeriodDays',
    releaseKey: 'lawyerReleaseDelayHours',
  },
  {
    key: 'expat',
    label: 'Expatrie aidant',
    description: 'Expatries aidants - commissions d\'affiliation (en plus de leurs prestations Stripe)',
    icon: 'EX',
    bgColor: 'bg-rose-100',
    textColor: 'text-rose-600',
    enabledKey: 'expatWithdrawalsEnabled',
    minKey: 'expatMinimumWithdrawal',
    maxKey: 'expatMaximumWithdrawal',
    holdKey: 'expatHoldPeriodDays',
    releaseKey: 'expatReleaseDelayHours',
  },
  {
    key: 'partner',
    label: 'Partner',
    description: 'Partenaires - commissions sur appels + recrutement',
    icon: 'P',
    bgColor: 'bg-teal-100',
    textColor: 'text-teal-600',
    enabledKey: 'partnerWithdrawalsEnabled',
    minKey: 'partnerMinimumWithdrawal',
    maxKey: 'partnerMaximumWithdrawal',
    holdKey: 'partnerHoldPeriodDays',
    releaseKey: 'partnerReleaseDelayHours',
  },
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
// ROLE SETTINGS CARD COMPONENT
// ============================================================================

interface RoleSettingsCardProps {
  role: RoleSection;
  config: PaymentConfig;
  updateConfig: <K extends keyof PaymentConfig>(key: K, value: PaymentConfig[K]) => void;
  intl: ReturnType<typeof useIntl>;
}

const RoleSettingsCard: React.FC<RoleSettingsCardProps> = ({ role, config, updateConfig, intl }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center">
        <span className={`w-5 h-5 mr-2 ${role.bgColor} ${role.textColor} rounded flex items-center justify-center text-xs font-bold`}>
          {role.icon}
        </span>
        <FormattedMessage
          id={`admin.paymentConfig.section.${role.key}Settings`}
          defaultMessage={`Parametres ${role.label}`}
        />
      </h2>
      <p className="text-xs text-gray-500 mb-4 ml-7">{role.description}</p>

      {(role.key === 'lawyer' || role.key === 'expat') && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start">
          <Link className="w-4 h-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            <FormattedMessage
              id="admin.paymentConfig.providerAffiliateNote"
              defaultMessage="Concerne uniquement les commissions d'affiliation. Les prestations (appels) sont payees via Stripe Express separement."
            />
          </p>
        </div>
      )}

      {role.key === 'client' && (
        <div className="mb-4 p-3 bg-sky-50 border border-sky-200 rounded-lg flex items-start">
          <Link className="w-4 h-4 text-sky-500 mr-2 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-sky-700">
            <FormattedMessage
              id="admin.paymentConfig.clientAffiliateNote"
              defaultMessage="Les clients gagnent des commissions en parrainant d'autres utilisateurs via leur lien affilie."
            />
          </p>
        </div>
      )}

      <NumberInput
        value={config[role.minKey] as number}
        onChange={(v) => updateConfig(role.minKey, v)}
        label={intl.formatMessage({ id: 'admin.paymentConfig.minimumWithdrawal', defaultMessage: 'Montant minimum de retrait' })}
        prefix="$"
        isCents
      />
      <NumberInput
        value={config[role.maxKey] as number}
        onChange={(v) => updateConfig(role.maxKey, v)}
        label={intl.formatMessage({ id: 'admin.paymentConfig.maximumWithdrawal', defaultMessage: 'Retrait maximum' })}
        prefix="$"
        isCents
      />
      <NumberInput
        value={config[role.holdKey] as number}
        onChange={(v) => updateConfig(role.holdKey, v)}
        label={intl.formatMessage({ id: 'admin.paymentConfig.holdPeriod', defaultMessage: 'Gel des commissions' })}
        description={intl.formatMessage({ id: 'admin.paymentConfig.holdPeriodDesc', defaultMessage: 'Nombre de jours avant qu\'une commission devienne disponible pour retrait (anti-fraude)' })}
        suffix={intl.formatMessage({ id: 'common.days', defaultMessage: 'jours' })}
        min={0}
        max={90}
      />
      <NumberInput
        value={config[role.releaseKey] as number}
        onChange={(v) => updateConfig(role.releaseKey, v)}
        label={intl.formatMessage({ id: 'admin.paymentConfig.releaseDelay', defaultMessage: 'Delai de traitement' })}
        description={intl.formatMessage({ id: 'admin.paymentConfig.releaseDelayDesc', defaultMessage: 'Delai en heures entre l\'approbation et l\'envoi effectif du paiement' })}
        suffix={intl.formatMessage({ id: 'common.hours', defaultMessage: 'heures' })}
        min={0}
        max={168}
      />
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
      // Read both payment_settings and fees docs
      const [settingsSnap, feesSnap] = await Promise.all([
        getDoc(doc(db, 'admin_config', 'payment_settings')),
        getDoc(doc(db, 'admin_config', 'fees')),
      ]);

      let merged = { ...DEFAULT_CONFIG };

      if (settingsSnap.exists()) {
        merged = { ...merged, ...settingsSnap.data() as Partial<PaymentConfig> };
      }

      // Sync fee from admin_config/fees (the backend source of truth)
      if (feesSnap.exists()) {
        const feesData = feesSnap.data();
        if (feesData?.withdrawalFees?.fixedFee != null) {
          merged.withdrawalFeeFixed = feesData.withdrawalFees.fixedFee;
        }
      }

      setConfig(merged);
      setOriginalConfig(merged);

      if (!settingsSnap.exists()) {
        await setDoc(doc(db, 'admin_config', 'payment_settings'), merged);
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
      const updatedConfig = {
        ...config,
        updatedAt: new Date().toISOString(),
        updatedBy: 'admin',
        version: (config.version || 0) + 1,
      };

      const now = updatedConfig.updatedAt;

      // Build per-role config updates for backend (each role reads its own {role}_config/current)
      // Field names must match what each backend callable reads
      const roleConfigWrites = [
        // chatter_config/current → getChatterConfigCached()
        setDoc(doc(db, 'chatter_config', 'current'), {
          minimumWithdrawalAmount: updatedConfig.chatterMinimumWithdrawal,
          withdrawalsEnabled: updatedConfig.chatterWithdrawalsEnabled,
          updatedAt: now,
          updatedBy: 'admin',
        }, { merge: true }),

        // influencer_config/current → getInfluencerConfigCached()
        setDoc(doc(db, 'influencer_config', 'current'), {
          minimumWithdrawalAmount: updatedConfig.influencerMinimumWithdrawal,
          withdrawalsEnabled: updatedConfig.influencerWithdrawalsEnabled,
          updatedAt: now,
          updatedBy: 'admin',
        }, { merge: true }),

        // blogger_config/current → getBloggerConfigCached()
        setDoc(doc(db, 'blogger_config', 'current'), {
          minimumWithdrawalAmount: updatedConfig.bloggerMinimumWithdrawal,
          withdrawalsEnabled: updatedConfig.bloggerWithdrawalsEnabled,
          updatedAt: now,
          updatedBy: 'admin',
        }, { merge: true }),

        // group_admin_config/current → getGroupAdminConfig()
        setDoc(doc(db, 'group_admin_config', 'current'), {
          minimumWithdrawalAmount: updatedConfig.groupAdminMinimumWithdrawal,
          withdrawalsEnabled: updatedConfig.groupAdminWithdrawalsEnabled,
          updatedAt: now,
          updatedBy: 'admin',
        }, { merge: true }),

        // affiliate_config/current → getWithdrawalSettings()
        // Affiliate uses nested withdrawal object + covers client/lawyer/expat
        setDoc(doc(db, 'affiliate_config', 'current'), {
          withdrawalsEnabled: updatedConfig.affiliateWithdrawalsEnabled,
          withdrawal: {
            minimumAmount: updatedConfig.affiliateMinimumWithdrawal,
          },
          // Also store client/lawyer/expat settings for future per-role differentiation
          clientWithdrawalsEnabled: updatedConfig.clientWithdrawalsEnabled,
          clientMinimumWithdrawal: updatedConfig.clientMinimumWithdrawal,
          lawyerWithdrawalsEnabled: updatedConfig.lawyerWithdrawalsEnabled,
          lawyerMinimumWithdrawal: updatedConfig.lawyerMinimumWithdrawal,
          expatWithdrawalsEnabled: updatedConfig.expatWithdrawalsEnabled,
          expatMinimumWithdrawal: updatedConfig.expatMinimumWithdrawal,
          updatedAt: now,
          updatedBy: 'admin',
        }, { merge: true }),

        // partner_config/current → getPartnerConfig()
        setDoc(doc(db, 'partner_config', 'current'), {
          minimumWithdrawalAmount: updatedConfig.partnerMinimumWithdrawal,
          withdrawalsEnabled: updatedConfig.partnerWithdrawalsEnabled,
          updatedAt: now,
          updatedBy: 'admin',
        }, { merge: true }),
      ];

      // Save ALL config docs in parallel:
      // 1. admin_config/payment_settings — main admin config (source of truth for UI)
      // 2. admin_config/fees — withdrawal fee (read by backend feeCalculationService.ts)
      // 3-8. {role}_config/current — per-role configs (read by each backend callable)
      await Promise.all([
        setDoc(doc(db, 'admin_config', 'payment_settings'), updatedConfig),
        setDoc(doc(db, 'admin_config', 'fees'), {
          withdrawalFees: {
            fixedFee: updatedConfig.withdrawalFeeFixed,
            currency: 'USD',
          },
          updatedAt: now,
          updatedBy: 'admin',
        }, { merge: true }),
        ...roleConfigWrites,
      ]);

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
                defaultMessage="Configurez les methodes de paiement et les parametres de retrait pour tous les roles"
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
              <FormattedMessage id="admin.paymentConfig.section.systemToggles" defaultMessage="Options systeme" />
            </h2>
            <div className="divide-y divide-gray-200">
              {ROLE_SECTIONS.map((role) => (
                <Toggle
                  key={role.key}
                  enabled={config[role.enabledKey] as boolean}
                  onChange={(v) => updateConfig(role.enabledKey, v)}
                  label={intl.formatMessage({
                    id: `admin.paymentConfig.${role.key}Withdrawals`,
                    defaultMessage: `Retraits ${role.label}`,
                  })}
                  description={role.key === 'affiliate'
                    ? intl.formatMessage({
                        id: 'admin.paymentConfig.affiliateWithdrawalsDesc',
                        defaultMessage: 'Retraits pour affilies, clients, avocats et expatries',
                      })
                    : intl.formatMessage({
                        id: `admin.paymentConfig.${role.key}WithdrawalsDesc`,
                        defaultMessage: `Permettre les retraits ${role.label}`,
                      })
                  }
                />
              ))}
            </div>
          </div>

          {/* Payment Methods + Withdrawal Fee */}
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

            <div className="mt-4 pt-4 border-t border-gray-200">
              <NumberInput
                value={config.withdrawalFeeFixed}
                onChange={(v) => updateConfig('withdrawalFeeFixed', v)}
                label={intl.formatMessage({ id: 'admin.paymentConfig.withdrawalFee', defaultMessage: 'Frais de retrait (par transaction)' })}
                description={intl.formatMessage({ id: 'admin.paymentConfig.withdrawalFeeDesc', defaultMessage: 'Montant fixe deduit de chaque retrait, tous roles confondus. Synchro avec le backend.' })}
                prefix="$"
                min={0}
                max={50}
                step={0.5}
              />
            </div>
          </div>

          {/* Role-specific Settings Cards */}
          {ROLE_SECTIONS.map((role) => (
            <RoleSettingsCard
              key={role.key}
              role={role}
              config={config}
              updateConfig={updateConfig}
              intl={intl}
            />
          ))}

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
                label={intl.formatMessage({ id: 'admin.paymentConfig.autoApprove', defaultMessage: 'Approbation automatique des retraits' })}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
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
                  <p className="text-xs text-gray-500 truncate">{currency.name}</p>
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
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
