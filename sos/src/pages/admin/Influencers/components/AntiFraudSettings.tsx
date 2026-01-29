/**
 * AntiFraudSettings - Anti-fraud configuration panel
 */

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { InfluencerAntiFraudConfig } from '@/types/influencer';
import { Shield, AlertTriangle } from 'lucide-react';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-6",
  input: "w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500",
  label: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",
  hint: "text-xs text-gray-500 dark:text-gray-400 mt-1",
};

interface AntiFraudSettingsProps {
  config: InfluencerAntiFraudConfig;
  onChange: (config: InfluencerAntiFraudConfig) => void;
}

const DEFAULT_CONFIG: InfluencerAntiFraudConfig = {
  enabled: false,
  maxReferralsPerDay: 0,
  maxReferralsPerWeek: 0,
  blockSameIPReferrals: false,
  minAccountAgeDays: 0,
  requireEmailVerification: false,
  suspiciousConversionRateThreshold: 0,
  autoSuspendOnViolation: false,
};

const AntiFraudSettings: React.FC<AntiFraudSettingsProps> = ({ config, onChange }) => {
  const intl = useIntl();

  // Ensure config has all fields
  const safeConfig = { ...DEFAULT_CONFIG, ...config };

  const handleChange = <K extends keyof InfluencerAntiFraudConfig>(
    field: K,
    value: InfluencerAntiFraudConfig[K]
  ) => {
    onChange({ ...safeConfig, [field]: value });
  };

  return (
    <div className={UI.card}>
      {/* Header with Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${safeConfig.enabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
            <Shield className={`w-5 h-5 ${safeConfig.enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              <FormattedMessage id="admin.influencers.antifraud.title" defaultMessage="Protection Anti-Fraude" />
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="admin.influencers.antifraud.subtitle"
                defaultMessage="Détection et prévention des abus"
              />
            </p>
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <span className={`text-sm ${safeConfig.enabled ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-500'}`}>
            {safeConfig.enabled ? 'Activé' : 'Désactivé'}
          </span>
          <input
            type="checkbox"
            checked={safeConfig.enabled}
            onChange={(e) => handleChange('enabled', e.target.checked)}
            className="w-5 h-5 text-green-500 rounded focus:ring-green-500"
          />
        </label>
      </div>

      {/* Settings Grid */}
      <div className={`space-y-6 ${!safeConfig.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Referral Limits */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Limites de parrainage</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={UI.label}>Max parrainages par jour</label>
              <input
                type="number"
                min="0"
                value={safeConfig.maxReferralsPerDay}
                onChange={(e) => handleChange('maxReferralsPerDay', parseInt(e.target.value || '0'))}
                className={UI.input}
              />
              <p className={UI.hint}>0 = illimité</p>
            </div>

            <div>
              <label className={UI.label}>Max parrainages par semaine</label>
              <input
                type="number"
                min="0"
                value={safeConfig.maxReferralsPerWeek}
                onChange={(e) => handleChange('maxReferralsPerWeek', parseInt(e.target.value || '0'))}
                className={UI.input}
              />
              <p className={UI.hint}>0 = illimité</p>
            </div>
          </div>
        </div>

        {/* Detection Settings */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Détection</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={safeConfig.blockSameIPReferrals}
                onChange={(e) => handleChange('blockSameIPReferrals', e.target.checked)}
                className="w-4 h-4 text-red-500 rounded focus:ring-red-500"
              />
              <div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Bloquer parrainages depuis même IP</span>
                <p className={UI.hint}>Empêche les auto-parrainages</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={safeConfig.requireEmailVerification}
                onChange={(e) => handleChange('requireEmailVerification', e.target.checked)}
                className="w-4 h-4 text-red-500 rounded focus:ring-red-500"
              />
              <div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Requiert email vérifié pour commissions</span>
                <p className={UI.hint}>Le filleul doit vérifier son email</p>
              </div>
            </label>
          </div>
        </div>

        {/* Account Age */}
        <div className="max-w-xs">
          <label className={UI.label}>Âge minimum du compte (jours)</label>
          <input
            type="number"
            min="0"
            value={safeConfig.minAccountAgeDays}
            onChange={(e) => handleChange('minAccountAgeDays', parseInt(e.target.value || '0'))}
            className={UI.input}
          />
          <p className={UI.hint}>Jours depuis création avant pouvoir parrainer</p>
        </div>

        {/* Suspicious Activity */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Activité suspecte</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={UI.label}>Seuil taux de conversion suspect (%)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={(safeConfig.suspiciousConversionRateThreshold * 100).toFixed(0)}
                  onChange={(e) => handleChange('suspiciousConversionRateThreshold', parseInt(e.target.value || '0') / 100)}
                  className={`${UI.input} pr-8`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
              </div>
              <p className={UI.hint}>0 = désactivé. Ex: 50% = alerte si plus de 50% conversion</p>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={safeConfig.autoSuspendOnViolation}
                  onChange={(e) => handleChange('autoSuspendOnViolation', e.target.checked)}
                  className="w-4 h-4 text-red-500 rounded focus:ring-red-500"
                />
                <div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Suspension automatique</span>
                  <p className={UI.hint}>Suspend automatiquement en cas de violation</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Warning */}
        {safeConfig.autoSuspendOnViolation && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700 dark:text-red-300">
              <p className="font-medium">Attention</p>
              <p className="mt-1">
                La suspension automatique peut affecter des influenceurs légitimes.
                Il est recommandé de vérifier manuellement les alertes.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AntiFraudSettings;
