/**
 * PartnerAgreement - Read-only view of the partner's commercial agreement
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { useAuth } from '@/contexts/AuthContext';
import { usePartner } from '@/hooks/usePartner';
import { PartnerDashboardLayout } from '@/components/Partner';
import { getPartnerAgreement } from '@/services/partnerEngineApi';
import type { Agreement } from '@/services/partnerEngineApi';
import {
  FileText,
  Calendar,
  DollarSign,
  Percent,
  Users,
  StickyNote,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const statusConfig: Record<Agreement['status'], { label: string; classes: string }> = {
  draft: { label: 'Brouillon', classes: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  active: { label: 'Actif', classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  paused: { label: 'En pause', classes: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  expired: { label: 'Expiré', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Illimité';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const SectionTitle: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
      {icon}
    </div>
    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
      {children}
    </h3>
  </div>
);

const InfoRow: React.FC<{ label: React.ReactNode; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
    <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
    <span className="text-sm font-medium text-gray-900 dark:text-white">{value}</span>
  </div>
);

const PartnerAgreement: React.FC = () => {
  const navigate = useLocaleNavigate();
  const { user } = useAuth();
  const { isLoading: partnerLoading, isPartner } = usePartner();
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!partnerLoading && !isPartner) {
      navigate('/');
    }
  }, [partnerLoading, isPartner, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setIsLoading(true);
    getPartnerAgreement()
      .then((data) => {
        if (!cancelled) setAgreement(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Erreur lors du chargement');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [user]);

  if (partnerLoading || isLoading) {
    return (
      <PartnerDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 dark:text-blue-400" />
        </div>
      </PartnerDashboardLayout>
    );
  }

  if (error) {
    return (
      <PartnerDashboardLayout>
        <div className="bg-red-50 dark:bg-red-900/20 border dark:border-red-800 rounded-xl p-6 text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </PartnerDashboardLayout>
    );
  }

  // No agreement state
  if (!agreement) {
    return (
      <PartnerDashboardLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold dark:text-white">
            <FormattedMessage id="partner.agreement.title" defaultMessage="Mon accord commercial" />
          </h1>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-base">
              <FormattedMessage
                id="partner.agreement.noAgreement"
                defaultMessage="Aucun accord commercial actif. Contactez votre account manager."
              />
            </p>
          </div>
        </div>
      </PartnerDashboardLayout>
    );
  }

  const status = statusConfig[agreement.status];
  const subscriberCount = 0; // Could be enriched from dashboard data
  const maxSubs = agreement.max_subscribers;

  return (
    <PartnerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold dark:text-white">
            <FormattedMessage id="partner.agreement.title" defaultMessage="Mon accord commercial" />
          </h1>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.classes}`}>
            {status.label}
          </span>
        </div>

        {/* Agreement Name & Validity */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-5 sm:p-6">
          <SectionTitle icon={<Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />}>
            <FormattedMessage id="partner.agreement.details" defaultMessage="Détails" />
          </SectionTitle>
          <InfoRow
            label={<FormattedMessage id="partner.agreement.name" defaultMessage="Nom de l'accord" />}
            value={agreement.name}
          />
          <InfoRow
            label={<FormattedMessage id="partner.agreement.validFrom" defaultMessage="Valide du" />}
            value={formatDate(agreement.starts_at)}
          />
          <InfoRow
            label={<FormattedMessage id="partner.agreement.validTo" defaultMessage="Jusqu'au" />}
            value={formatDate(agreement.expires_at)}
          />
        </div>

        {/* Commission Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-5 sm:p-6">
          <SectionTitle icon={<DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />}>
            <FormattedMessage id="partner.agreement.commissions" defaultMessage="Commissions" />
          </SectionTitle>
          <InfoRow
            label={<FormattedMessage id="partner.agreement.commissionType" defaultMessage="Type" />}
            value={agreement.commission_type === 'fixed'
              ? <FormattedMessage id="partner.agreement.fixed" defaultMessage="Fixe" />
              : <FormattedMessage id="partner.agreement.percent" defaultMessage="Pourcentage" />
            }
          />
          <InfoRow
            label={<FormattedMessage id="partner.agreement.commissionLawyer" defaultMessage="Avocat" />}
            value={agreement.commission_type === 'fixed'
              ? `${formatCents(agreement.commission_per_call_lawyer)}/appel`
              : `${agreement.commission_percent}%`
            }
          />
          <InfoRow
            label={<FormattedMessage id="partner.agreement.commissionExpat" defaultMessage="Expat" />}
            value={agreement.commission_type === 'fixed'
              ? `${formatCents(agreement.commission_per_call_expat)}/appel`
              : `${agreement.commission_percent}%`
            }
          />
        </div>

        {/* Discount Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-5 sm:p-6">
          <SectionTitle icon={<Percent className="w-4 h-4 text-blue-600 dark:text-blue-400" />}>
            <FormattedMessage id="partner.agreement.discount" defaultMessage="Remise abonnés" />
          </SectionTitle>
          {agreement.discount_type === 'none' ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="partner.agreement.noDiscount" defaultMessage="Aucune remise configurée" />
            </p>
          ) : (
            <>
              <InfoRow
                label={<FormattedMessage id="partner.agreement.discountType" defaultMessage="Type" />}
                value={agreement.discount_type === 'fixed'
                  ? <FormattedMessage id="partner.agreement.fixed" defaultMessage="Fixe" />
                  : <FormattedMessage id="partner.agreement.percent" defaultMessage="Pourcentage" />
                }
              />
              <InfoRow
                label={<FormattedMessage id="partner.agreement.discountValue" defaultMessage="Valeur" />}
                value={agreement.discount_type === 'fixed'
                  ? formatCents(agreement.discount_value)
                  : `${agreement.discount_value}%`
                }
              />
              {agreement.discount_type === 'percent' && agreement.discount_max_cents && (
                <InfoRow
                  label={<FormattedMessage id="partner.agreement.discountCap" defaultMessage="Plafond" />}
                  value={formatCents(agreement.discount_max_cents)}
                />
              )}
              {agreement.discount_label && (
                <InfoRow
                  label={<FormattedMessage id="partner.agreement.discountLabel" defaultMessage="Label affiché" />}
                  value={agreement.discount_label}
                />
              )}
            </>
          )}
        </div>

        {/* Limits Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-5 sm:p-6">
          <SectionTitle icon={<Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />}>
            <FormattedMessage id="partner.agreement.limits" defaultMessage="Limites" />
          </SectionTitle>
          <InfoRow
            label={<FormattedMessage id="partner.agreement.maxSubscribers" defaultMessage="Max abonnés" />}
            value={maxSubs ? maxSubs.toLocaleString('fr-FR') : <FormattedMessage id="partner.agreement.unlimited" defaultMessage="Illimité" />}
          />
          <InfoRow
            label={<FormattedMessage id="partner.agreement.maxCallsPerSub" defaultMessage="Max appels/abonné" />}
            value={agreement.max_calls_per_subscriber
              ? agreement.max_calls_per_subscriber.toLocaleString('fr-FR')
              : <FormattedMessage id="partner.agreement.unlimited" defaultMessage="Illimité" />
            }
          />
          {maxSubs && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                <span>
                  <FormattedMessage id="partner.agreement.subscribersUsed" defaultMessage="Abonnés utilisés" />
                </span>
                <span>{subscriberCount}/{maxSubs}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div
                  className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${Math.min((subscriberCount / maxSubs) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Notes Section */}
        {agreement.notes && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-5 sm:p-6">
            <SectionTitle icon={<StickyNote className="w-4 h-4 text-blue-600 dark:text-blue-400" />}>
              <FormattedMessage id="partner.agreement.notes" defaultMessage="Notes" />
            </SectionTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
              {agreement.notes}
            </p>
          </div>
        )}
      </div>
    </PartnerDashboardLayout>
  );
};

export default PartnerAgreement;
