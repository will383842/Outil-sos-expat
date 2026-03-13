/**
 * UnifiedLinkWithEarnings
 *
 * Shows the single affiliate link + a role-specific earnings breakdown.
 * Explains: "1 lien, vos gains dépendent de ce que fait votre filleul."
 *
 * Used in all role dashboards and referral tabs to replace the legacy 3-code display.
 */

import React, { lazy, Suspense } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Users, Phone, UserPlus, Award, Percent, DollarSign } from 'lucide-react';

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

interface Props {
  code: string;
  role: AffiliateRole;
  className?: string;
  compact?: boolean;
}

function getEarningsForRole(role: AffiliateRole): EarningRule[] {
  const iconClass = 'w-4 h-4 flex-shrink-0';

  switch (role) {
    case 'chatter':
    case 'captainChatter':
      return [
        { icon: <UserPlus className={iconClass} />, labelId: 'unified.earnings.signup', labelDefault: "Inscription d'un filleul", value: '$2', highlight: true },
        { icon: <Phone className={iconClass} />, labelId: 'unified.earnings.clientCallLawyer', labelDefault: 'Appel client (avocat)', value: '$10' },
        { icon: <Phone className={iconClass} />, labelId: 'unified.earnings.clientCallExpat', labelDefault: 'Appel client (aidant)', value: '$5' },
        { icon: <Users className={iconClass} />, labelId: 'unified.earnings.n1Call', labelDefault: 'Appel filleul N1 (votre recrue)', value: '$1', sub: '/appel' },
        { icon: <Users className={iconClass} />, labelId: 'unified.earnings.n2Call', labelDefault: 'Appel filleul N2 (recrue de recrue)', value: '$0.50', sub: '/appel' },
        { icon: <Award className={iconClass} />, labelId: 'unified.earnings.activation', labelDefault: "Bonus activation (2e appel d'une recrue)", value: '$5', highlight: true },
        { icon: <UserPlus className={iconClass} />, labelId: 'unified.earnings.providerRecruit', labelDefault: 'Recrutement prestataire', value: '$5/$3', sub: 'avocat/aidant, 6 mois' },
        ...(role === 'captainChatter' ? [
          { icon: <Award className={iconClass} />, labelId: 'unified.earnings.captainCall', labelDefault: "Appel d'un membre d'équipe", value: '$3', sub: '/appel' },
        ] : []),
      ];

    case 'influencer':
      return [
        { icon: <UserPlus className={iconClass} />, labelId: 'unified.earnings.signup', labelDefault: "Inscription d'un filleul", value: '$2', highlight: true },
        { icon: <Phone className={iconClass} />, labelId: 'unified.earnings.clientCallLawyer', labelDefault: 'Appel client (avocat)', value: '$10' },
        { icon: <Phone className={iconClass} />, labelId: 'unified.earnings.clientCallExpat', labelDefault: 'Appel client (aidant)', value: '$5' },
        { icon: <UserPlus className={iconClass} />, labelId: 'unified.earnings.providerRecruit', labelDefault: 'Recrutement prestataire', value: '$5/$3', sub: 'avocat/aidant, 6 mois' },
        { icon: <Percent className={iconClass} />, labelId: 'unified.earnings.clientDiscount', labelDefault: 'Remise pour vos clients', value: '-5%', highlight: true },
      ];

    case 'blogger':
      return [
        { icon: <UserPlus className={iconClass} />, labelId: 'unified.earnings.signup', labelDefault: "Inscription d'un filleul", value: '$2', highlight: true },
        { icon: <Phone className={iconClass} />, labelId: 'unified.earnings.clientCallLawyer', labelDefault: 'Appel client (avocat)', value: '$10' },
        { icon: <Phone className={iconClass} />, labelId: 'unified.earnings.clientCallExpat', labelDefault: 'Appel client (aidant)', value: '$5' },
        { icon: <UserPlus className={iconClass} />, labelId: 'unified.earnings.providerRecruit', labelDefault: 'Recrutement prestataire', value: '$5/$3', sub: 'avocat/aidant, 6 mois' },
      ];

    case 'groupAdmin':
      return [
        { icon: <UserPlus className={iconClass} />, labelId: 'unified.earnings.signup', labelDefault: "Inscription d'un filleul", value: '$2', highlight: true },
        { icon: <Phone className={iconClass} />, labelId: 'unified.earnings.clientCallLawyer', labelDefault: 'Appel client (avocat)', value: '$5' },
        { icon: <Phone className={iconClass} />, labelId: 'unified.earnings.clientCallExpat', labelDefault: 'Appel client (aidant)', value: '$3' },
        { icon: <Users className={iconClass} />, labelId: 'unified.earnings.n1Call', labelDefault: 'Appel filleul N1 (votre recrue)', value: '$1', sub: '/appel' },
        { icon: <Users className={iconClass} />, labelId: 'unified.earnings.n2Call', labelDefault: 'Appel filleul N2 (recrue de recrue)', value: '$0.50', sub: '/appel' },
        { icon: <Award className={iconClass} />, labelId: 'unified.earnings.activation', labelDefault: "Bonus activation (2e appel d'une recrue)", value: '$5', highlight: true },
        { icon: <UserPlus className={iconClass} />, labelId: 'unified.earnings.providerRecruit', labelDefault: 'Recrutement prestataire', value: '$5/$3', sub: 'avocat/aidant, 6 mois' },
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

export default function UnifiedLinkWithEarnings({ code, role, className = '', compact = false }: Props) {
  const intl = useIntl();
  const earnings = getEarningsForRole(role);

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
