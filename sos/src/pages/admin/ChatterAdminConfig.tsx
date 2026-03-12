/**
 * ChatterAdminConfig - Admin page for configuring chatter system parameters
 *
 * This page allows admins to configure:
 * - Thresholds (activity, inactivity, anti-fraud)
 * - Gains/Commissions (client calls split by provider type, N1/N2, bonuses, provider recruitment)
 * - Tier bonuses (milestone rewards for active members)
 * - Monthly top rewards (multipliers + cash prizes)
 * - Captain Chatter (tiers, quality bonus, commissions)
 * - Rules (activation threshold, recruitment window)
 *
 * Dual-writes to chatter_config/settings AND chatter_config/current
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import {
  Settings,
  DollarSign,
  Trophy,
  Save,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Target,
  TrendingUp,
  Crown,
  Medal,
  Briefcase,
  Clock,
  Gift,
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
} as const;

// ============================================================================
// TYPES — Aligned with backend chatterConfig.ts
// ============================================================================

interface CaptainTier {
  name: string;
  minCalls: number;
  bonus: number; // cents
}

interface ChatterConfigSettings {
  thresholds: {
    activeMinCalls: number;
    inactiveAlertDays: number;
    maxReferralsPerHour: number;
    maxAccountsPerIP: number;
  };
  gains: {
    clientCall: number;           // Generic fallback (cents)
    clientCallLawyer: number;     // Client call with lawyer provider
    clientCallExpat: number;      // Client call with expat provider
    n1Call: number;
    n2Call: number;
    activationBonus: number;
    n1RecruitBonus: number;
    providerCall: number;         // Provider recruitment call — generic
    providerCallLawyer: number;   // Provider recruitment call — lawyer
    providerCallExpat: number;    // Provider recruitment call — expat
    activationCallsRequired: number;
    recruitmentWindowMonths: number;
  };
  tierBonuses: {
    5: number;
    10: number;
    20: number;
    50: number;
    100: number;
    500: number;
  };
  monthlyTop: {
    1: number;
    2: number;
    3: number;
  };
  captain: {
    callAmountLawyer: number;
    callAmountExpat: number;
    tiers: CaptainTier[];
    qualityBonusAmount: number;
    qualityBonusMinRecruits: number;
    qualityBonusMinCommissions: number;
  };
  competitionPrizes: {
    first: number;
    second: number;
    third: number;
    eligibilityMinimum: number;
  };
  telegramBonus: {
    amount: number;
    unlockThreshold: number;
  };
  flashBonus: {
    enabled: boolean;
    multiplier: number;
    endsAt: string | null;
    durationHours: number;
  };
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
    clientCall: 1000,
    clientCallLawyer: 1000,
    clientCallExpat: 1000,
    n1Call: 100,
    n2Call: 50,
    activationBonus: 500,
    n1RecruitBonus: 100,
    providerCall: 500,
    providerCallLawyer: 500,
    providerCallExpat: 300,
    activationCallsRequired: 2,
    recruitmentWindowMonths: 6,
  },
  tierBonuses: {
    5: 1500,
    10: 3500,
    20: 7500,
    50: 25000,
    100: 60000,
    500: 400000,
  },
  monthlyTop: {
    1: 2.0,
    2: 1.5,
    3: 1.15,
  },
  captain: {
    callAmountLawyer: 300,
    callAmountExpat: 200,
    tiers: [
      { name: 'Bronze', minCalls: 20, bonus: 2500 },
      { name: 'Argent', minCalls: 50, bonus: 5000 },
      { name: 'Or', minCalls: 100, bonus: 10000 },
      { name: 'Platine', minCalls: 200, bonus: 20000 },
      { name: 'Diamant', minCalls: 400, bonus: 40000 },
    ],
    qualityBonusAmount: 10000,
    qualityBonusMinRecruits: 10,
    qualityBonusMinCommissions: 10000,
  },
  competitionPrizes: {
    first: 20000,
    second: 10000,
    third: 5000,
    eligibilityMinimum: 20000,
  },
  telegramBonus: {
    amount: 5000,
    unlockThreshold: 15000,
  },
  flashBonus: {
    enabled: false,
    multiplier: 2,
    endsAt: null,
    durationHours: 24,
  },
  version: 1,
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const SectionHeader: React.FC<{
  title: string;
  icon: React.ReactNode;
  description?: string;
  gradient?: string;
}> = ({ title, icon, description, gradient = 'from-red-500 to-orange-500' }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className={`p-3 bg-gradient-to-br ${gradient} text-white rounded-xl shadow-lg`}>
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ChatterAdminConfig: React.FC = () => {
  const intl = useIntl();

  const [config, setConfig] = useState<ChatterConfigSettings>(DEFAULT_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<ChatterConfigSettings>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);
  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Deep merge fetched config with defaults to handle missing new fields
  const mergeWithDefaults = (fetched: Partial<ChatterConfigSettings>): ChatterConfigSettings => ({
    ...DEFAULT_CONFIG,
    ...fetched,
    thresholds: { ...DEFAULT_CONFIG.thresholds, ...fetched.thresholds },
    gains: { ...DEFAULT_CONFIG.gains, ...fetched.gains },
    tierBonuses: { ...DEFAULT_CONFIG.tierBonuses, ...fetched.tierBonuses },
    monthlyTop: { ...DEFAULT_CONFIG.monthlyTop, ...fetched.monthlyTop },
    captain: {
      ...DEFAULT_CONFIG.captain,
      ...fetched.captain,
      tiers: fetched.captain?.tiers?.length ? fetched.captain.tiers : DEFAULT_CONFIG.captain.tiers,
    },
    competitionPrizes: { ...DEFAULT_CONFIG.competitionPrizes, ...fetched.competitionPrizes },
    telegramBonus: { ...DEFAULT_CONFIG.telegramBonus, ...fetched.telegramBonus },
    flashBonus: { ...DEFAULT_CONFIG.flashBonus, ...fetched.flashBonus },
  });

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<void, { config: ChatterConfigSettings }>(
        functionsAffiliate,
        'adminGetChatterConfigSettings'
      );
      const result = await fn();
      const merged = mergeWithDefaults(result.data.config);
      setConfig(merged);
      setOriginalConfig(merged);
    } catch (err: unknown) {
      console.error('Error fetching chatter config:', err);
      setConfig(DEFAULT_CONFIG);
      setOriginalConfig(DEFAULT_CONFIG);
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

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

  const updateCaptainTier = (index: number, field: keyof CaptainTier, value: string | number) => {
    setConfig((prev) => {
      const tiers = [...prev.captain.tiers];
      tiers[index] = { ...tiers[index], [field]: value };
      return { ...prev, captain: { ...prev.captain, tiers } };
    });
    setSuccess(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const fn = httpsCallable<
        { config: Partial<ChatterConfigSettings> },
        { success: boolean; config: ChatterConfigSettings }
      >(functionsAffiliate, 'adminUpdateChatterConfigSettings');

      // Send entire config (backend does deep merge)
      const result = await fn({ config });
      if (result.data.success) {
        const merged = mergeWithDefaults(result.data.config);
        setOriginalConfig(merged);
        setConfig(merged);
        setSuccess(intl.formatMessage({
          id: 'admin.chatterSystemConfig.saved',
          defaultMessage: 'Configuration saved successfully (settings + current)',
        }));
      }
    } catch (err: unknown) {
      console.error('Error saving config:', err);
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(null), 5000); return () => clearTimeout(t); }
  }, [success]);
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(null), 10000); return () => clearTimeout(t); }
  }, [error]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-red-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              <FormattedMessage id="admin.chatterSystemConfig.loading" defaultMessage="Loading configuration..." />
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
              <FormattedMessage id="admin.chatterSystemConfig.title" defaultMessage="Chatter System Configuration" />
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              <FormattedMessage id="admin.chatterSystemConfig.subtitle" defaultMessage="Configure thresholds, commissions, and bonuses" />
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={fetchConfig} disabled={loading} className="flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <FormattedMessage id="common.refresh" defaultMessage="Refresh" />
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || saving} loading={saving}
              className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600">
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
              <FormattedMessage id="admin.chatterSystemConfig.unsavedChanges" defaultMessage="You have unsaved changes" />
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            Section 1: THRESHOLDS
           ═══════════════════════════════════════════════════════════════════ */}
        <div className={UI.card}>
          <div className={UI.cardHeader}>
            <SectionHeader
              title={intl.formatMessage({ id: 'admin.chatterSystemConfig.thresholds.title', defaultMessage: 'Thresholds & Anti-Fraud' })}
              icon={<Target className="w-5 h-5" />}
              description={intl.formatMessage({ id: 'admin.chatterSystemConfig.thresholds.description', defaultMessage: 'Activity requirements and anti-fraud limits' })}
            />
          </div>
          <div className={UI.cardBody}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <NumberInput label="Min calls to be 'active'" value={config.thresholds.activeMinCalls}
                onChange={(v) => updateConfig('thresholds', { activeMinCalls: v })}
                hint="Calls required to count as an active member" />
              <NumberInput label="Days inactive before alert" value={config.thresholds.inactiveAlertDays}
                onChange={(v) => updateConfig('thresholds', { inactiveAlertDays: v })} suffix="days" />
              <NumberInput label="Max referrals per hour" value={config.thresholds.maxReferralsPerHour}
                onChange={(v) => updateConfig('thresholds', { maxReferralsPerHour: v })} suffix="/h" />
              <NumberInput label="Max accounts per IP" value={config.thresholds.maxAccountsPerIP}
                onChange={(v) => updateConfig('thresholds', { maxAccountsPerIP: v })} />
              <NumberInput label="Calls for activation (anti-fraud)" value={config.gains.activationCallsRequired}
                onChange={(v) => updateConfig('gains', { activationCallsRequired: v })}
                hint="Number of paid calls before a referral is 'activated'" />
              <NumberInput label="Recruitment window" value={config.gains.recruitmentWindowMonths}
                onChange={(v) => updateConfig('gains', { recruitmentWindowMonths: v })} suffix="months"
                hint="Duration of provider recruitment commissions" />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            Section 2: COMMISSIONS CLIENT (by provider type)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className={UI.card}>
          <div className={UI.cardHeader}>
            <SectionHeader
              title="Commissions — Client Calls"
              icon={<DollarSign className="w-5 h-5" />}
              description="Commission earned when a client calls through the chatter's link"
              gradient="from-emerald-500 to-green-600"
            />
          </div>
          <div className={UI.cardBody}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <NumberInput label="Client call — Lawyer" value={config.gains.clientCallLawyer}
                onChange={(v) => updateConfig('gains', { clientCallLawyer: v })}
                suffix="$" isCents hint={`= ${formatCents(config.gains.clientCallLawyer)} per call with a lawyer`} />
              <NumberInput label="Client call — Expat helper" value={config.gains.clientCallExpat}
                onChange={(v) => updateConfig('gains', { clientCallExpat: v })}
                suffix="$" isCents hint={`= ${formatCents(config.gains.clientCallExpat)} per call with an expat`} />
              <NumberInput label="Client call — Generic fallback" value={config.gains.clientCall}
                onChange={(v) => updateConfig('gains', { clientCall: v })}
                suffix="$" isCents hint={`= ${formatCents(config.gains.clientCall)} (used if provider type unknown)`} />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            Section 3: COMMISSIONS TEAM (N1/N2)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className={UI.card}>
          <div className={UI.cardHeader}>
            <SectionHeader
              title="Commissions — Team Recruitment (N1/N2)"
              icon={<DollarSign className="w-5 h-5" />}
              description="Commission from referral network (other chatters recruited)"
              gradient="from-violet-500 to-indigo-600"
            />
          </div>
          <div className={UI.cardBody}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <NumberInput label="N1 call commission" value={config.gains.n1Call}
                onChange={(v) => updateConfig('gains', { n1Call: v })}
                suffix="$" isCents hint={`= ${formatCents(config.gains.n1Call)} per N1 referral call`} />
              <NumberInput label="N2 call commission" value={config.gains.n2Call}
                onChange={(v) => updateConfig('gains', { n2Call: v })}
                suffix="$" isCents hint={`= ${formatCents(config.gains.n2Call)} per N2 referral call`} />
              <NumberInput label="Activation bonus" value={config.gains.activationBonus}
                onChange={(v) => updateConfig('gains', { activationBonus: v })}
                suffix="$" isCents hint={`= ${formatCents(config.gains.activationBonus)} when N1 activates`} />
              <NumberInput label="N1 recruit bonus" value={config.gains.n1RecruitBonus}
                onChange={(v) => updateConfig('gains', { n1RecruitBonus: v })}
                suffix="$" isCents hint={`= ${formatCents(config.gains.n1RecruitBonus)} per N1 recruit`} />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            Section 4: COMMISSIONS PROVIDER RECRUITMENT (by type)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className={UI.card}>
          <div className={UI.cardHeader}>
            <SectionHeader
              title="Commissions — Provider Recruitment"
              icon={<Briefcase className="w-5 h-5" />}
              description="Commission from providers (lawyers/expats) recruited by the chatter"
              gradient="from-teal-500 to-emerald-600"
            />
          </div>
          <div className={UI.cardBody}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <NumberInput label="Provider call — Lawyer" value={config.gains.providerCallLawyer}
                onChange={(v) => updateConfig('gains', { providerCallLawyer: v })}
                suffix="$" isCents hint={`= ${formatCents(config.gains.providerCallLawyer)} per call`} />
              <NumberInput label="Provider call — Expat" value={config.gains.providerCallExpat}
                onChange={(v) => updateConfig('gains', { providerCallExpat: v })}
                suffix="$" isCents hint={`= ${formatCents(config.gains.providerCallExpat)} per call`} />
              <NumberInput label="Provider call — Generic fallback" value={config.gains.providerCall}
                onChange={(v) => updateConfig('gains', { providerCall: v })}
                suffix="$" isCents hint={`= ${formatCents(config.gains.providerCall)} (used if type unknown)`} />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            Section 5: TIER BONUSES
           ═══════════════════════════════════════════════════════════════════ */}
        <div className={UI.card}>
          <div className={UI.cardHeader}>
            <SectionHeader
              title="Tier Bonuses (Milestones)"
              icon={<TrendingUp className="w-5 h-5" />}
              description="One-time cash rewards when reaching active member counts"
            />
          </div>
          <div className={UI.cardBody}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {([5, 10, 20, 50, 100, 500] as const).map((tier) => (
                <NumberInput
                  key={tier}
                  label={`${tier} active members`}
                  value={config.tierBonuses[tier]}
                  onChange={(v) => updateConfig('tierBonuses', { [tier]: v } as any)}
                  suffix="$" isCents hint={`= ${formatCents(config.tierBonuses[tier])}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            Section 6: MONTHLY COMPETITION
           ═══════════════════════════════════════════════════════════════════ */}
        <div className={UI.card}>
          <div className={UI.cardHeader}>
            <SectionHeader
              title="Monthly Competition"
              icon={<Trophy className="w-5 h-5" />}
              description="Cash prizes and commission multipliers for top performers"
              gradient="from-amber-500 to-yellow-600"
            />
          </div>
          <div className={UI.cardBody}>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider">Cash Prizes</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="relative">
                <div className="absolute -top-2 left-4 px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">#1</div>
                <NumberInput label="1st place prize" value={config.competitionPrizes.first}
                  onChange={(v) => updateConfig('competitionPrizes', { first: v })}
                  suffix="$" isCents hint={`= ${formatCents(config.competitionPrizes.first)}`} />
              </div>
              <div className="relative">
                <div className="absolute -top-2 left-4 px-2 py-0.5 bg-gray-300 text-gray-700 text-xs font-bold rounded-full">#2</div>
                <NumberInput label="2nd place prize" value={config.competitionPrizes.second}
                  onChange={(v) => updateConfig('competitionPrizes', { second: v })}
                  suffix="$" isCents hint={`= ${formatCents(config.competitionPrizes.second)}`} />
              </div>
              <div className="relative">
                <div className="absolute -top-2 left-4 px-2 py-0.5 bg-orange-400 text-orange-900 text-xs font-bold rounded-full">#3</div>
                <NumberInput label="3rd place prize" value={config.competitionPrizes.third}
                  onChange={(v) => updateConfig('competitionPrizes', { third: v })}
                  suffix="$" isCents hint={`= ${formatCents(config.competitionPrizes.third)}`} />
              </div>
              <NumberInput label="Eligibility minimum" value={config.competitionPrizes.eligibilityMinimum}
                onChange={(v) => updateConfig('competitionPrizes', { eligibilityMinimum: v })}
                suffix="$" isCents hint={`Min ${formatCents(config.competitionPrizes.eligibilityMinimum)} commissions to qualify`} />
            </div>

            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider">Commission Multipliers (next month)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="relative">
                <div className="absolute -top-2 left-4 px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">#1</div>
                <NumberInput label="Top 1 Multiplier" value={config.monthlyTop[1]}
                  onChange={(v) => updateConfig('monthlyTop', { 1: v } as any)}
                  suffix="x" step={0.05} min={1} max={10} hint={`${config.monthlyTop[1]}x commissions next month`} />
              </div>
              <div className="relative">
                <div className="absolute -top-2 left-4 px-2 py-0.5 bg-gray-300 text-gray-700 text-xs font-bold rounded-full">#2</div>
                <NumberInput label="Top 2 Multiplier" value={config.monthlyTop[2]}
                  onChange={(v) => updateConfig('monthlyTop', { 2: v } as any)}
                  suffix="x" step={0.05} min={1} max={10} hint={`${config.monthlyTop[2]}x commissions next month`} />
              </div>
              <div className="relative">
                <div className="absolute -top-2 left-4 px-2 py-0.5 bg-orange-400 text-orange-900 text-xs font-bold rounded-full">#3</div>
                <NumberInput label="Top 3 Multiplier" value={config.monthlyTop[3]}
                  onChange={(v) => updateConfig('monthlyTop', { 3: v } as any)}
                  suffix="x" step={0.05} min={1} max={10} hint={`${config.monthlyTop[3]}x commissions next month`} />
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            Section 7: TELEGRAM BONUS
           ═══════════════════════════════════════════════════════════════════ */}
        <div className={UI.card}>
          <div className={UI.cardHeader}>
            <SectionHeader
              title="Telegram Bonus"
              icon={<Gift className="w-5 h-5" />}
              description="Bonus credited when chatter links Telegram, locked until commission threshold"
              gradient="from-blue-500 to-cyan-600"
            />
          </div>
          <div className={UI.cardBody}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <NumberInput label="Bonus amount" value={config.telegramBonus.amount}
                onChange={(v) => updateConfig('telegramBonus', { amount: v })}
                suffix="$" isCents hint={`${formatCents(config.telegramBonus.amount)} credited to piggy bank on Telegram link`} />
              <NumberInput label="Unlock threshold" value={config.telegramBonus.unlockThreshold}
                onChange={(v) => updateConfig('telegramBonus', { unlockThreshold: v })}
                suffix="$" isCents hint={`Piggy bank unlocks after ${formatCents(config.telegramBonus.unlockThreshold)} total commissions`} />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            Section 8: CAPTAIN CHATTER
           ═══════════════════════════════════════════════════════════════════ */}
        <div className={UI.card}>
          <div className={UI.cardHeader}>
            <SectionHeader
              title="Captain Chatter"
              icon={<Crown className="w-5 h-5" />}
              description="Commissions, tiers, and quality bonuses for Captain Chatters"
              gradient="from-yellow-500 to-amber-600"
            />
          </div>
          <div className={UI.cardBody}>
            {/* Captain call commissions */}
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider">Captain Call Commission</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <NumberInput label="Captain call — Lawyer" value={config.captain.callAmountLawyer}
                onChange={(v) => updateConfig('captain', { callAmountLawyer: v })}
                suffix="$" isCents hint={`= ${formatCents(config.captain.callAmountLawyer)} per team call (lawyer)`} />
              <NumberInput label="Captain call — Expat" value={config.captain.callAmountExpat}
                onChange={(v) => updateConfig('captain', { callAmountExpat: v })}
                suffix="$" isCents hint={`= ${formatCents(config.captain.callAmountExpat)} per team call (expat)`} />
            </div>

            {/* Captain tiers */}
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider">Monthly Tiers</h3>
            <div className="space-y-3 mb-8">
              {config.captain.tiers.map((tier, index) => (
                <div key={index} className="grid grid-cols-3 gap-3 items-end p-3 bg-gray-50 dark:bg-white/[0.03] rounded-xl">
                  <div>
                    <label className={UI.label}>Name</label>
                    <input
                      type="text"
                      value={tier.name}
                      onChange={(e) => updateCaptainTier(index, 'name', e.target.value)}
                      className={UI.input}
                    />
                  </div>
                  <NumberInput label="Min team calls/month" value={tier.minCalls}
                    onChange={(v) => updateCaptainTier(index, 'minCalls', v)} />
                  <NumberInput label="Monthly bonus" value={tier.bonus}
                    onChange={(v) => updateCaptainTier(index, 'bonus', v)}
                    suffix="$" isCents hint={`= ${formatCents(tier.bonus)}`} />
                </div>
              ))}
            </div>

            {/* Quality bonus */}
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider">Quality Bonus</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <NumberInput label="Quality bonus amount" value={config.captain.qualityBonusAmount}
                onChange={(v) => updateConfig('captain', { qualityBonusAmount: v })}
                suffix="$" isCents hint={`= ${formatCents(config.captain.qualityBonusAmount)}`} />
              <NumberInput label="Min active recruits" value={config.captain.qualityBonusMinRecruits}
                onChange={(v) => updateConfig('captain', { qualityBonusMinRecruits: v })}
                hint="Minimum active N1 recruits required" />
              <NumberInput label="Min team commissions" value={config.captain.qualityBonusMinCommissions}
                onChange={(v) => updateConfig('captain', { qualityBonusMinCommissions: v })}
                suffix="$" isCents hint={`= ${formatCents(config.captain.qualityBonusMinCommissions)} monthly minimum`} />
            </div>
          </div>
        </div>

        {/* Save Button (bottom) */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={!hasChanges || saving} loading={saving} size="large"
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 px-8">
            <Save className="w-5 h-5 mr-2" />
            <FormattedMessage id="admin.chatterSystemConfig.saveConfiguration" defaultMessage="Save Configuration" />
          </Button>
        </div>

        {/* Version Info */}
        {config.updatedAt && (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-4">
            <FormattedMessage
              id="admin.chatterSystemConfig.versionInfo"
              defaultMessage="Version {version} - Last modified: {date}"
              values={{ version: config.version, date: new Date(config.updatedAt).toLocaleString() }}
            />
            {config.updatedBy && (
              <span className="ml-2">
                <FormattedMessage id="admin.chatterSystemConfig.updatedBy" defaultMessage="by {user}" values={{ user: config.updatedBy }} />
              </span>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ChatterAdminConfig;
