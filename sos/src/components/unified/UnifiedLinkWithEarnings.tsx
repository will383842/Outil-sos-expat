/**
 * UnifiedLinkWithEarnings
 *
 * Shows the single affiliate link + a role-specific earnings breakdown.
 * Explains: "1 lien, vos gains dépendent de ce que fait votre filleul."
 *
 * Reads commission amounts from the backend config (lockedRates > plan > default).
 * Used in all role dashboards and referral tabs to replace the legacy 3-code display.
 */

import React, { lazy, Suspense } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Users, Phone, UserPlus, Award, Percent, DollarSign, Trophy } from 'lucide-react';

const UnifiedAffiliateLink = lazy(() => import('./UnifiedAffiliateLink'));

type AffiliateRole = 'chatter' | 'captainChatter' | 'influencer' | 'blogger' | 'groupAdmin' | 'partner' | 'client' | 'provider';

interface EarningRule {
  icon: React.ReactNode;
  labelId: string;
  labelDefault: string;
  value: string;
  highlight?: boolean;
  sub?: string;
}

/** Backend config object passed from dashboard (amounts in cents) */
interface CommissionConfig {
  // Client call - shared fields
  commissionClientCallAmount?: number;
  commissionClientCallAmountLawyer?: number;
  commissionClientCallAmountExpat?: number;
  commissionClientAmount?: number;
  commissionClientAmountLawyer?: number;
  commissionClientAmountExpat?: number;
  // N1/N2 (chatter, groupAdmin)
  commissionN1CallAmount?: number;
  commissionN2CallAmount?: number;
  // Bonuses
  commissionActivationBonusAmount?: number;
  commissionN1RecruitBonusAmount?: number;
  // Influencer/Blogger
  commissionRecruitmentAmount?: number;
  clientDiscountPercent?: number;
}

interface Props {
  code: string;
  role: AffiliateRole;
  config?: CommissionConfig;
  className?: string;
  compact?: boolean;
}

/** Convert cents to dollar display string (e.g. 1000 → "$10") */
function centsToUsd(cents: number): string {
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

// Default plan amounts (cents) — used only when backend config hasn't loaded yet
const DEFAULTS = {
  clientCallLawyer: 500,   // $5
  clientCallExpat: 300,    // $3
  n1Call: 100,             // $1
  n2Call: 50,              // $0.50
  activationBonus: 500,    // $5
  providerRecruit: 500,    // $5
  recruitmentAmount: 500,  // $5
  clientDiscount: 5,       // 5%
} as const;

/** Get client call amount - tries lawyer/expat specific fields, falls back to plan defaults */
function getClientCallDisplay(config: CommissionConfig | undefined, role: AffiliateRole): string {
  // Role-specific field names
  const lawyerField = config
    ? (role === 'chatter' || role === 'captainChatter' || role === 'groupAdmin'
      ? (config.commissionClientCallAmountLawyer ?? config.commissionClientAmountLawyer)
      : (config.commissionClientAmountLawyer ?? config.commissionClientCallAmountLawyer))
    : undefined;

  const expatField = config
    ? (role === 'chatter' || role === 'captainChatter' || role === 'groupAdmin'
      ? (config.commissionClientCallAmountExpat ?? config.commissionClientAmountExpat)
      : (config.commissionClientAmountExpat ?? config.commissionClientCallAmountExpat))
    : undefined;

  const lawyer = lawyerField ?? (config?.commissionClientCallAmount ?? config?.commissionClientAmount ?? DEFAULTS.clientCallLawyer);
  const expat = expatField ?? DEFAULTS.clientCallExpat;

  // If both are the same amount, show single value
  if (lawyer === expat) return centsToUsd(lawyer);

  // Different amounts → show "lawyer/expat"
  return `${centsToUsd(lawyer)}/${centsToUsd(expat)}`;
}

function getEarningsForRole(role: AffiliateRole, config?: CommissionConfig): EarningRule[] {
  const iconClass = 'w-4 h-4 flex-shrink-0';
  const clientCallValue = getClientCallDisplay(config, role);

  // Helper: format cents from config, with fallback
  const c = (val: number | undefined, fallbackCents: number): string =>
    centsToUsd(val ?? fallbackCents);

  switch (role) {
    case 'chatter':
    case 'captainChatter':
      return [
        { icon: <UserPlus className={iconClass} />, labelId: 'unified.earnings.signup', labelDefault: "Inscription d'un filleul", value: '$2', highlight: true },
        { icon: <Phone className={iconClass} />, labelId: 'unified.earnings.clientCall', labelDefault: 'Appel client (avocat ou aidant)', value: clientCallValue, highlight: true },
        { icon: <Users className={iconClass} />, labelId: 'unified.earnings.n1Call', labelDefault: 'Appel filleul N1 (votre recrue)', value: c(config?.commissionN1CallAmount, DEFAULTS.n1Call), sub: '/appel' },
        { icon: <Users className={iconClass} />, labelId: 'unified.earnings.n2Call', labelDefault: 'Appel filleul N2 (recrue de recrue)', value: c(config?.commissionN2CallAmount, DEFAULTS.n2Call), sub: '/appel' },
        { icon: <Award className={iconClass} />, labelId: 'unified.earnings.activation', labelDefault: "Bonus activation (2e appel d'une recrue)", value: c(config?.commissionActivationBonusAmount, DEFAULTS.activationBonus), highlight: true },
        { icon: <UserPlus className={iconClass} />, labelId: 'unified.earnings.providerRecruit', labelDefault: 'Recrutement prestataire', value: c(config?.commissionN1RecruitBonusAmount, DEFAULTS.providerRecruit), sub: '6 mois' },
        ...(role === 'captainChatter' ? [
          { icon: <Award className={iconClass} />, labelId: 'unified.earnings.captainCall', labelDefault: "Appel d'un membre d'équipe", value: c(config?.commissionN1CallAmount, DEFAULTS.n1Call), sub: '/appel' },
        ] : []),
        { icon: <Trophy className={iconClass} />, labelId: 'unified.earnings.top3', labelDefault: 'Top 3 mensuel (si +$200/mois)', value: '$200/$100/$50', highlight: true },
      ];

    case 'influencer':
      return [
        { icon: <UserPlus className={iconClass} />, labelId: 'unified.earnings.signup', labelDefault: "Inscription d'un filleul", value: '$2', highlight: true },
        { icon: <Phone className={iconClass} />, labelId: 'unified.earnings.clientCall', labelDefault: 'Appel client (avocat ou aidant)', value: clientCallValue, highlight: true },
        { icon: <UserPlus className={iconClass} />, labelId: 'unified.earnings.providerRecruit', labelDefault: 'Recrutement prestataire', value: c(config?.commissionRecruitmentAmount, DEFAULTS.recruitmentAmount), sub: '6 mois' },
        { icon: <Percent className={iconClass} />, labelId: 'unified.earnings.clientDiscount', labelDefault: 'Remise pour vos clients', value: `-${config?.clientDiscountPercent ?? DEFAULTS.clientDiscount}%`, highlight: true },
        { icon: <Trophy className={iconClass} />, labelId: 'unified.earnings.top3', labelDefault: 'Top 3 mensuel (si +$200/mois)', value: '$200/$100/$50', highlight: true },
      ];

    case 'blogger':
      return [
        { icon: <UserPlus className={iconClass} />, labelId: 'unified.earnings.signup', labelDefault: "Inscription d'un filleul", value: '$2', highlight: true },
        { icon: <Phone className={iconClass} />, labelId: 'unified.earnings.clientCall', labelDefault: 'Appel client (avocat ou aidant)', value: clientCallValue, highlight: true },
        { icon: <UserPlus className={iconClass} />, labelId: 'unified.earnings.providerRecruit', labelDefault: 'Recrutement prestataire', value: c(config?.commissionRecruitmentAmount, DEFAULTS.recruitmentAmount), sub: '6 mois' },
      ];

    case 'groupAdmin':
      return [
        { icon: <UserPlus className={iconClass} />, labelId: 'unified.earnings.signup', labelDefault: "Inscription d'un filleul", value: '$2', highlight: true },
        { icon: <Phone className={iconClass} />, labelId: 'unified.earnings.clientCall', labelDefault: 'Appel client (avocat ou aidant)', value: clientCallValue, highlight: true },
        { icon: <Users className={iconClass} />, labelId: 'unified.earnings.n1Call', labelDefault: 'Appel filleul N1 (votre recrue)', value: c(config?.commissionN1CallAmount, DEFAULTS.n1Call), sub: '/appel' },
        { icon: <Users className={iconClass} />, labelId: 'unified.earnings.n2Call', labelDefault: 'Appel filleul N2 (recrue de recrue)', value: c(config?.commissionN2CallAmount, DEFAULTS.n2Call), sub: '/appel' },
        { icon: <Award className={iconClass} />, labelId: 'unified.earnings.activation', labelDefault: "Bonus activation (2e appel d'une recrue)", value: c(config?.commissionActivationBonusAmount, DEFAULTS.activationBonus), highlight: true },
        { icon: <UserPlus className={iconClass} />, labelId: 'unified.earnings.providerRecruit', labelDefault: 'Recrutement prestataire', value: c(config?.commissionN1RecruitBonusAmount, DEFAULTS.providerRecruit), sub: '6 mois' },
        { icon: <DollarSign className={iconClass} />, labelId: 'unified.earnings.clientDiscount', labelDefault: 'Remise pour vos clients', value: '-$5', highlight: true },
      ];

    case 'partner':
      return [
        { icon: <Phone className={iconClass} />, labelId: 'unified.earnings.partnerCall', labelDefault: 'Commission par appel', value: '15%', highlight: true },
      ];

    default: // client, provider
      return [
        { icon: <UserPlus className={iconClass} />, labelId: 'unified.earnings.signup', labelDefault: "Inscription d'un filleul", value: '$2', highlight: true },
        { icon: <Phone className={iconClass} />, labelId: 'unified.earnings.clientCallLawyer', labelDefault: 'Appel client (avocat)', value: '$2' },
        { icon: <Phone className={iconClass} />, labelId: 'unified.earnings.clientCallExpat', labelDefault: 'Appel client (aidant)', value: '$1' },
      ];
  }
}

export default function UnifiedLinkWithEarnings({ code, role, config, className = '', compact = false }: Props) {
  const intl = useIntl();
  const earnings = getEarningsForRole(role, config);

  if (!code) return null;

  return (
    <div className={className}>
      {/* Unified link */}
      <Suspense fallback={<div className="h-40 animate-pulse bg-gray-100 dark:bg-white/5 rounded-xl" />}>
        <UnifiedAffiliateLink code={code} />
      </Suspense>

      {/* Info banner */}
      <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
        <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium text-center">
          <FormattedMessage
            id="unified.earnings.oneLinkInfo"
            defaultMessage="Un seul lien pour tout. Vos gains dependent de ce que fait votre filleul."
          />
        </p>
      </div>

      {/* Earnings breakdown */}
      {!compact && (
        <div className="mt-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-4">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            <FormattedMessage
              id="unified.earnings.title"
              defaultMessage="Vos gains par action de filleul"
            />
          </h4>

          <div className="space-y-2">
            {earnings.map((rule, i) => (
              <div
                key={i}
                className={`flex items-center justify-between py-1.5 px-2 rounded-lg ${
                  rule.highlight ? 'bg-green-50 dark:bg-green-900/10' : ''
                }`}
              >
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-gray-400 dark:text-gray-500">{rule.icon}</span>
                  <span>
                    <FormattedMessage id={rule.labelId} defaultMessage={rule.labelDefault} />
                  </span>
                  {rule.sub && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">({rule.sub})</span>
                  )}
                </div>
                <span className={`font-bold text-sm ${
                  rule.value.startsWith('-') ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'
                }`}>
                  {rule.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
