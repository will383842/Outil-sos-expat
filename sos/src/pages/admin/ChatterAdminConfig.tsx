/**
 * ChatterAdminConfig - Admin page for configuring chatter system parameters
 *
 * This page allows admins to configure:
 * - Thresholds (activity, inactivity, anti-fraud)
 * - Gains/Commissions (client calls, N1/N2 commissions, bonuses)
 * - Tier bonuses (milestone rewards for active members)
 * - Monthly top rewards
 * - Flash bonus system
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { httpsCallable } from 'firebase/functions';
import { functionsWest2 } from '@/config/firebase';
import {
  Settings,
  DollarSign,
  Trophy,
  Save,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Zap,
  Target,
  TrendingUp,
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';

// ============================================================================
// DESIGN TOKENS
// ============================================================================

const UI = {
  card: 'bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg',
  cardHeader: 'p-6 border-b border-gray-200 dark:border-gray-700',
  cardBody: 'p-6',
  input: 'w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white',
  label: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2',
  hint: 'text-xs text-gray-500 dark:text-gray-400 mt-1',
  toggle: 'relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer',
} as const;

// ============================================================================
// TYPES
// ============================================================================

/**
 * ChatterConfigSettings - Aligned with backend chatterConfig.ts
 * Collection: chatter_config/settings
 */
interface ChatterConfigSettings {
  // Thresholds - field names MUST match backend exactly
  thresholds: {
    activeMinCalls: number;      // minCallsToBeActive on old version
    inactiveAlertDays: number;   // daysInactiveBeforeAlert on old version
    maxReferralsPerHour: number;
    maxAccountsPerIP: number;
  };
  // Gains - field names MUST match backend exactly
  gains: {
    clientCall: number;      // $10 in cents
    n1Call: number;          // $1 in cents
    n2Call: number;          // $0.50 in cents
    activationBonus: number; // $5 in cents
    n1RecruitBonus: number;  // $1 in cents
  };
  // Tier Bonuses - keyed by number of filleuls
  tierBonuses: {
    5: number;    // $15 in cents
    10: number;   // $35 in cents
    20: number;   // $75 in cents
    50: number;   // $250 in cents
    100: number;  // $600 in cents
    500: number;  // $4000 in cents
  };
  // Monthly Top - commission MULTIPLIERS (not cash amounts)
  monthlyTop: {
    1: number;  // 2.0x multiplier
    2: number;  // 1.5x multiplier
    3: number;  // 1.15x multiplier
  };
  // Flash Bonus - aligned with backend FlashBonusConfig
  flashBonus: {
    enabled: boolean;
    multiplier: number;
    endsAt: string | null;     // ISO date string from Timestamp
    durationHours: number;     // UI-only: for setting activation duration
  };
  // Meta
  version: number;
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULT_CONFIG: ChatterConfigSettings = {
  thresholds: {
    activeMinCalls: 2,
    inactiveAlertDays: 7,
    maxReferralsPerHour: 5,
    maxAccountsPerIP: 3,
  },
  gains: {
    clientCall: 1000,      // $10
    n1Call: 100,           // $1
    n2Call: 50,            // $0.50
    activationBonus: 500,  // $5
    n1RecruitBonus: 100,   // $1
  },
  tierBonuses: {
    5: 1500,       // $15
    10: 3500,      // $35
    20: 7500,      // $75
    50: 25000,     // $250
    100: 60000,    // $600
    500: 400000,   // $4000
  },
  monthlyTop: {
    1: 2.0,    // 2x multiplier
    2: 1.5,    // 1.5x multiplier
    3: 1.15,   // 1.15x multiplier
  },
  flashBonus: {
    enabled: false,
    multiplier: 2,
    endsAt: null,
    durationHours: 24,
  },
  version: 1,
};

// Duration hours for flash bonus activation (UI helper, not stored in backend)
const DEFAULT_FLASH_DURATION_HOURS = 24;

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const SectionHeader: React.FC<{
  title: string;
  icon: React.ReactNode;
  description?: string;
}> = ({ title, icon, description }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="p-3 bg-gradient-to-br from-red-500 to-orange-500 text-white rounded-xl shadow-lg">
      {icon}
    </div>
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
    </div>
  </div>
);

const NumberInput: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  isCents?: boolean;
}> = ({ label, value, onChange, suffix, min = 0, max, step = 1, hint, isCents }) => {
  const displayValue = isCents ? value / 100 : value;

  return (
    <div>
      <label className={UI.label}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={displayValue}
          onChange={(e) => {
            const val = parseFloat(e.target.value) || 0;
            onChange(isCents ? Math.round(val * 100) : val);
          }}
          min={isCents ? min / 100 : min}
          max={max !== undefined ? (isCents ? max / 100 : max) : undefined}
          step={isCents ? 0.01 : step}
          className={UI.input}
        />
        {suffix && (
          <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap font-medium">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className={UI.hint}>{hint}</p>}
    </div>
  );
};

const Toggle: React.FC<{
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}> = ({ enabled, onChange, disabled }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!enabled)}
    disabled={disabled}
    className={`${UI.toggle} ${
      disabled ? 'opacity-50 cursor-not-allowed' : ''
    } ${enabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        enabled ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ChatterAdminConfig: React.FC = () => {
  const intl = useIntl();

  // State
  const [config, setConfig] = useState<ChatterConfigSettings>(DEFAULT_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<ChatterConfigSettings>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activatingFlash, setActivatingFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check if config has changed
  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

  // Format cents to dollars
  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Fetch config
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const adminGetChatterConfigSettings = httpsCallable<void, { config: ChatterConfigSettings }>(
        functionsWest2,
        'adminGetChatterConfigSettings'
      );

      const result = await adminGetChatterConfigSettings();
      const fetchedConfig = { ...DEFAULT_CONFIG, ...result.data.config };
      setConfig(fetchedConfig);
      setOriginalConfig(fetchedConfig);
    } catch (err: unknown) {
      console.error('Error fetching chatter system config:', err);
      // Use default config if fetch fails
      setConfig(DEFAULT_CONFIG);
      setOriginalConfig(DEFAULT_CONFIG);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load configuration';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [functionsWest2]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Update config helper
  const updateConfig = <K extends keyof ChatterConfigSettings>(
    section: K,
    updates: Partial<ChatterConfigSettings[K]>
  ) => {
    setConfig((prev) => {
      const currentSection = prev[section];
      return {
        ...prev,
        [section]: {
          ...(typeof currentSection === 'object' && currentSection !== null ? currentSection : {}),
          ...updates,
        },
      };
    });
    setSuccess(null);
  };

  // Save config
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const adminUpdateChatterConfigSettings = httpsCallable<
        { config: Partial<ChatterConfigSettings> },
        { success: boolean; config: ChatterConfigSettings }
      >(functionsWest2, 'adminUpdateChatterConfigSettings');

      const result = await adminUpdateChatterConfigSettings({ config });

      if (result.data.success) {
        setOriginalConfig(result.data.config);
        setConfig(result.data.config);
        setSuccess(
          intl.formatMessage({
            id: 'admin.chatterSystemConfig.saved',
            defaultMessage: 'Configuration saved successfully',
          })
        );
      }
    } catch (err: unknown) {
      console.error('Error saving chatter system config:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save configuration';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Activate Flash Bonus
  const handleActivateFlashBonus = async () => {
    setActivatingFlash(true);
    setError(null);

    try {
      const adminToggleFlashBonus = httpsCallable<
        { enabled: boolean; multiplier: number; durationHours: number },
        { success: boolean; endsAt: string }
      >(functionsWest2, 'adminToggleFlashBonus');

      const result = await adminToggleFlashBonus({
        enabled: true,
        multiplier: config.flashBonus.multiplier,
        durationHours: config.flashBonus.durationHours,
      });

      if (result.data.success) {
        setConfig((prev) => ({
          ...prev,
          flashBonus: {
            ...prev.flashBonus,
            enabled: true,
            endsAt: result.data.endsAt,
          },
        }));
        setSuccess(
          intl.formatMessage({
            id: 'admin.chatterSystemConfig.flashActivated',
            defaultMessage: 'Flash Bonus activated!',
          })
        );
      }
    } catch (err: unknown) {
      console.error('Error activating flash bonus:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to activate flash bonus';
      setError(errorMessage);
    } finally {
      setActivatingFlash(false);
    }
  };

  // Clear messages after timeout
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Loading state
  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-red-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="admin.chatterSystemConfig.loading"
                defaultMessage="Loading configuration..."
              />
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Settings className="w-8 h-8 text-red-500" />
              <FormattedMessage
                id="admin.chatterSystemConfig.title"
                defaultMessage="Chatter System Configuration"
              />
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="admin.chatterSystemConfig.subtitle"
                defaultMessage="Configure thresholds, commissions, and bonuses"
              />
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={fetchConfig}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <FormattedMessage id="common.refresh" defaultMessage="Refresh" />
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              loading={saving}
              className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
            >
              <Save className="w-4 h-4" />
              <FormattedMessage id="common.save" defaultMessage="Save Configuration" />
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className={`${UI.card} p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800`}>
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className={`${UI.card} p-4 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800`}>
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          </div>
        )}

        {hasChanges && (
          <div className={`${UI.card} p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800`}>
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>
                <FormattedMessage
                  id="admin.chatterSystemConfig.unsavedChanges"
                  defaultMessage="You have unsaved changes"
                />
              </span>
            </div>
          </div>
        )}

        {/* Section 1: THRESHOLDS */}
        <div className={UI.card}>
          <div className={UI.cardHeader}>
            <SectionHeader
              title={intl.formatMessage({
                id: 'admin.chatterSystemConfig.thresholds.title',
                defaultMessage: 'Thresholds',
              })}
              icon={<Target className="w-5 h-5" />}
              description={intl.formatMessage({
                id: 'admin.chatterSystemConfig.thresholds.description',
                defaultMessage: 'Activity requirements and anti-fraud limits',
              })}
            />
          </div>
          <div className={UI.cardBody}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <NumberInput
                label={intl.formatMessage({
                  id: 'admin.chatterSystemConfig.thresholds.minCallsActive',
                  defaultMessage: 'Min calls to be "active"',
                })}
                value={config.thresholds.activeMinCalls}
                onChange={(v) => updateConfig('thresholds', { activeMinCalls: v })}
                hint={intl.formatMessage({
                  id: 'admin.chatterSystemConfig.thresholds.minCallsActive.hint',
                  defaultMessage: 'Calls required to count as an active member',
                })}
              />
              <NumberInput
                label={intl.formatMessage({
                  id: 'admin.chatterSystemConfig.thresholds.daysInactive',
                  defaultMessage: 'Days inactive before alert',
                })}
                value={config.thresholds.inactiveAlertDays}
                onChange={(v) => updateConfig('thresholds', { inactiveAlertDays: v })}
                suffix={intl.formatMessage({ id: 'common.days', defaultMessage: 'days' })}
                hint={intl.formatMessage({
                  id: 'admin.chatterSystemConfig.thresholds.daysInactive.hint',
                  defaultMessage: 'Alert if no activity for this many days',
                })}
              />
              <NumberInput
                label={intl.formatMessage({
                  id: 'admin.chatterSystemConfig.thresholds.maxReferrals',
                  defaultMessage: 'Max referrals per hour (anti-fraud)',
                })}
                value={config.thresholds.maxReferralsPerHour}
                onChange={(v) => updateConfig('thresholds', { maxReferralsPerHour: v })}
                suffix="/h"
                hint={intl.formatMessage({
                  id: 'admin.chatterSystemConfig.thresholds.maxReferrals.hint',
                  defaultMessage: 'Limit referral rate to prevent abuse',
                })}
              />
              <NumberInput
                label={intl.formatMessage({
                  id: 'admin.chatterSystemConfig.thresholds.maxAccountsIP',
                  defaultMessage: 'Max accounts per IP (anti-fraud)',
                })}
                value={config.thresholds.maxAccountsPerIP}
                onChange={(v) => updateConfig('thresholds', { maxAccountsPerIP: v })}
                hint={intl.formatMessage({
                  id: 'admin.chatterSystemConfig.thresholds.maxAccountsIP.hint',
                  defaultMessage: 'Prevent multiple accounts from same IP',
                })}
              />
            </div>
          </div>
        </div>

        {/* Section 2: GAINS */}
        <div className={UI.card}>
          <div className={UI.cardHeader}>
            <SectionHeader
              title={intl.formatMessage({
                id: 'admin.chatterSystemConfig.gains.title',
                defaultMessage: 'Gains',
              })}
              icon={<DollarSign className="w-5 h-5" />}
              description={intl.formatMessage({
                id: 'admin.chatterSystemConfig.gains.description',
                defaultMessage: 'Commission amounts for calls and recruitment',
              })}
            />
          </div>
          <div className={UI.cardBody}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <NumberInput
                label={intl.formatMessage({
                  id: 'admin.chatterSystemConfig.gains.clientCall',
                  defaultMessage: 'Client call commission',
                })}
                value={config.gains.clientCall}
                onChange={(v) => updateConfig('gains', { clientCall: v })}
                suffix="$"
                isCents
                hint={`= ${formatCents(config.gains.clientCall)} per call`}
              />
              <NumberInput
                label={intl.formatMessage({
                  id: 'admin.chatterSystemConfig.gains.n1Call',
                  defaultMessage: 'N1 call commission',
                })}
                value={config.gains.n1Call}
                onChange={(v) => updateConfig('gains', { n1Call: v })}
                suffix="$"
                isCents
                hint={`= ${formatCents(config.gains.n1Call)} per N1 referral call`}
              />
              <NumberInput
                label={intl.formatMessage({
                  id: 'admin.chatterSystemConfig.gains.n2Call',
                  defaultMessage: 'N2 call commission',
                })}
                value={config.gains.n2Call}
                onChange={(v) => updateConfig('gains', { n2Call: v })}
                suffix="$"
                isCents
                hint={`= ${formatCents(config.gains.n2Call)} per N2 referral call`}
              />
              <NumberInput
                label={intl.formatMessage({
                  id: 'admin.chatterSystemConfig.gains.activationBonus',
                  defaultMessage: 'Activation bonus (at 2nd call)',
                })}
                value={config.gains.activationBonus}
                onChange={(v) => updateConfig('gains', { activationBonus: v })}
                suffix="$"
                isCents
                hint={`= ${formatCents(config.gains.activationBonus)} bonus`}
              />
              <NumberInput
                label={intl.formatMessage({
                  id: 'admin.chatterSystemConfig.gains.n1RecruitBonus',
                  defaultMessage: 'N1 recruit bonus',
                })}
                value={config.gains.n1RecruitBonus}
                onChange={(v) => updateConfig('gains', { n1RecruitBonus: v })}
                suffix="$"
                isCents
                hint={`= ${formatCents(config.gains.n1RecruitBonus)} per N1 recruit`}
              />
            </div>
          </div>
        </div>

        {/* Section 3: TIER BONUSES */}
        <div className={UI.card}>
          <div className={UI.cardHeader}>
            <SectionHeader
              title={intl.formatMessage({
                id: 'admin.chatterSystemConfig.tierBonuses.title',
                defaultMessage: 'Tier Bonuses',
              })}
              icon={<TrendingUp className="w-5 h-5" />}
              description={intl.formatMessage({
                id: 'admin.chatterSystemConfig.tierBonuses.description',
                defaultMessage: 'Milestone rewards for reaching active member counts',
              })}
            />
          </div>
          <div className={UI.cardBody}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              <NumberInput
                label={intl.formatMessage({
                  id: 'admin.chatterSystemConfig.tierBonuses.tier5',
                  defaultMessage: '5 active members',
                })}
                value={config.tierBonuses[5]}
                onChange={(v) => updateConfig('tierBonuses', { 5: v } as any)}
                suffix="$"
                isCents
                hint={`= ${formatCents(config.tierBonuses[5])}`}
              />
              <NumberInput
                label={intl.formatMessage({
                  id: 'admin.chatterSystemConfig.tierBonuses.tier10',
                  defaultMessage: '10 active members',
                })}
                value={config.tierBonuses[10]}
                onChange={(v) => updateConfig('tierBonuses', { 10: v } as any)}
                suffix="$"
                isCents
                hint={`= ${formatCents(config.tierBonuses[10])}`}
              />
              <NumberInput
                label={intl.formatMessage({
                  id: 'admin.chatterSystemConfig.tierBonuses.tier20',
                  defaultMessage: '20 active members',
                })}
                value={config.tierBonuses[20]}
                onChange={(v) => updateConfig('tierBonuses', { 20: v } as any)}
                suffix="$"
                isCents
                hint={`= ${formatCents(config.tierBonuses[20])}`}
              />
              <NumberInput
                label={intl.formatMessage({
                  id: 'admin.chatterSystemConfig.tierBonuses.tier50',
                  defaultMessage: '50 active members',
                })}
                value={config.tierBonuses[50]}
                onChange={(v) => updateConfig('tierBonuses', { 50: v } as any)}
                suffix="$"
                isCents
                hint={`= ${formatCents(config.tierBonuses[50])}`}
              />
              <NumberInput
                label={intl.formatMessage({
                  id: 'admin.chatterSystemConfig.tierBonuses.tier100',
                  defaultMessage: '100 active members',
                })}
                value={config.tierBonuses[100]}
                onChange={(v) => updateConfig('tierBonuses', { 100: v } as any)}
                suffix="$"
                isCents
                hint={`= ${formatCents(config.tierBonuses[100])}`}
              />
              <NumberInput
                label={intl.formatMessage({
                  id: 'admin.chatterSystemConfig.tierBonuses.tier500',
                  defaultMessage: '500 active members',
                })}
                value={config.tierBonuses[500]}
                onChange={(v) => updateConfig('tierBonuses', { 500: v } as any)}
                suffix="$"
                isCents
                hint={`= ${formatCents(config.tierBonuses[500])}`}
              />
            </div>
          </div>
        </div>

        {/* Section 4: MONTHLY TOP */}
        <div className={UI.card}>
          <div className={UI.cardHeader}>
            <SectionHeader
              title={intl.formatMessage({
                id: 'admin.chatterSystemConfig.monthlyTop.title',
                defaultMessage: 'Monthly Top',
              })}
              icon={<Trophy className="w-5 h-5" />}
              description={intl.formatMessage({
                id: 'admin.chatterSystemConfig.monthlyTop.description',
                defaultMessage: 'Commission multipliers for top performers next month',
              })}
            />
          </div>
          <div className={UI.cardBody}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="relative">
                <div className="absolute -top-2 left-4 px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">
                  #1
                </div>
                <NumberInput
                  label={intl.formatMessage({
                    id: 'admin.chatterSystemConfig.monthlyTop.top1',
                    defaultMessage: 'Top 1 Multiplier',
                  })}
                  value={config.monthlyTop[1]}
                  onChange={(v) => updateConfig('monthlyTop', { 1: v } as any)}
                  suffix="x"
                  step={0.05}
                  min={1}
                  max={10}
                  hint={`${config.monthlyTop[1]}x commissions next month`}
                />
              </div>
              <div className="relative">
                <div className="absolute -top-2 left-4 px-2 py-0.5 bg-gray-300 text-gray-700 text-xs font-bold rounded-full">
                  #2
                </div>
                <NumberInput
                  label={intl.formatMessage({
                    id: 'admin.chatterSystemConfig.monthlyTop.top2',
                    defaultMessage: 'Top 2 Multiplier',
                  })}
                  value={config.monthlyTop[2]}
                  onChange={(v) => updateConfig('monthlyTop', { 2: v } as any)}
                  suffix="x"
                  step={0.05}
                  min={1}
                  max={10}
                  hint={`${config.monthlyTop[2]}x commissions next month`}
                />
              </div>
              <div className="relative">
                <div className="absolute -top-2 left-4 px-2 py-0.5 bg-orange-400 text-orange-900 text-xs font-bold rounded-full">
                  #3
                </div>
                <NumberInput
                  label={intl.formatMessage({
                    id: 'admin.chatterSystemConfig.monthlyTop.top3',
                    defaultMessage: 'Top 3 Multiplier',
                  })}
                  value={config.monthlyTop[3]}
                  onChange={(v) => updateConfig('monthlyTop', { 3: v } as any)}
                  suffix="x"
                  step={0.05}
                  min={1}
                  max={10}
                  hint={`${config.monthlyTop[3]}x commissions next month`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: FLASH BONUS */}
        <div className={`${UI.card} ${config.flashBonus.enabled ? 'ring-2 ring-yellow-400 dark:ring-yellow-500' : ''}`}>
          <div className={UI.cardHeader}>
            <SectionHeader
              title={intl.formatMessage({
                id: 'admin.chatterSystemConfig.flashBonus.title',
                defaultMessage: 'Flash Bonus',
              })}
              icon={<Zap className="w-5 h-5" />}
              description={intl.formatMessage({
                id: 'admin.chatterSystemConfig.flashBonus.description',
                defaultMessage: 'Temporary commission multiplier for limited time',
              })}
            />
          </div>
          <div className={UI.cardBody}>
            {/* Flash Bonus Status */}
            {config.flashBonus.enabled && config.flashBonus.endsAt && (
              <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <Zap className="w-6 h-6 text-yellow-500 animate-pulse" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-300">
                      <FormattedMessage
                        id="admin.chatterSystemConfig.flashBonus.active"
                        defaultMessage="Flash Bonus is ACTIVE!"
                      />
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">
                      <FormattedMessage
                        id="admin.chatterSystemConfig.flashBonus.endsAt"
                        defaultMessage="Active until: {date}"
                        values={{
                          date: new Date(config.flashBonus.endsAt).toLocaleString(),
                        }}
                      />
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
              {/* Enable Toggle */}
              <div>
                <label className={UI.label}>
                  <FormattedMessage
                    id="admin.chatterSystemConfig.flashBonus.enable"
                    defaultMessage="Enable Flash Bonus"
                  />
                </label>
                <div className="flex items-center gap-3 mt-2">
                  <Toggle
                    enabled={config.flashBonus.enabled}
                    onChange={(enabled) => updateConfig('flashBonus', { enabled })}
                  />
                  <span className={`text-sm ${config.flashBonus.enabled ? 'text-emerald-600' : 'text-gray-500'}`}>
                    {config.flashBonus.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              {/* Multiplier */}
              <NumberInput
                label={intl.formatMessage({
                  id: 'admin.chatterSystemConfig.flashBonus.multiplier',
                  defaultMessage: 'Multiplier',
                })}
                value={config.flashBonus.multiplier}
                onChange={(v) => updateConfig('flashBonus', { multiplier: v })}
                suffix="x"
                step={0.5}
                min={1}
                max={10}
                hint={`${config.flashBonus.multiplier}x commission boost`}
              />

              {/* Duration */}
              <NumberInput
                label={intl.formatMessage({
                  id: 'admin.chatterSystemConfig.flashBonus.duration',
                  defaultMessage: 'Duration',
                })}
                value={config.flashBonus.durationHours}
                onChange={(v) => updateConfig('flashBonus', { durationHours: v })}
                suffix={intl.formatMessage({ id: 'common.hours', defaultMessage: 'hours' })}
                min={1}
                max={168}
                hint={intl.formatMessage({
                  id: 'admin.chatterSystemConfig.flashBonus.duration.hint',
                  defaultMessage: 'How long the flash bonus lasts',
                })}
              />

              {/* Activate Button */}
              <div>
                <Button
                  onClick={handleActivateFlashBonus}
                  disabled={activatingFlash || !config.flashBonus.enabled}
                  loading={activatingFlash}
                  className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-semibold"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  <FormattedMessage
                    id="admin.chatterSystemConfig.flashBonus.activateNow"
                    defaultMessage="Activate Now"
                  />
                </Button>
                <p className={UI.hint}>
                  <FormattedMessage
                    id="admin.chatterSystemConfig.flashBonus.activateNow.hint"
                    defaultMessage="Start flash bonus immediately"
                  />
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button (bottom) */}
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            loading={saving}
            size="large"
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 px-8"
          >
            <Save className="w-5 h-5 mr-2" />
            <FormattedMessage
              id="admin.chatterSystemConfig.saveConfiguration"
              defaultMessage="Save Configuration"
            />
          </Button>
        </div>

        {/* Version Info */}
        {config.updatedAt && (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-4">
            <FormattedMessage
              id="admin.chatterSystemConfig.versionInfo"
              defaultMessage="Version {version} - Last modified: {date}"
              values={{
                version: config.version,
                date: new Date(config.updatedAt).toLocaleString(),
              }}
            />
            {config.updatedBy && (
              <span className="ml-2">
                <FormattedMessage
                  id="admin.chatterSystemConfig.updatedBy"
                  defaultMessage="by {user}"
                  values={{ user: config.updatedBy }}
                />
              </span>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ChatterAdminConfig;
