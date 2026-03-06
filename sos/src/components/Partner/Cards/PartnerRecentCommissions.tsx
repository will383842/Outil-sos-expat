/**
 * PartnerRecentCommissions - Table of 5 most recent commissions with status badges
 */

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react';
import type { PartnerCommission } from '@/hooks/usePartner';

interface PartnerRecentCommissionsProps {
  commissions: PartnerCommission[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'available':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'validated':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'pending':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'paid':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    case 'cancelled':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'available':
    case 'paid':
      return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
    case 'cancelled':
      return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
    default:
      return <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
  }
};

const PartnerRecentCommissions: React.FC<PartnerRecentCommissionsProps> = ({
  commissions,
}) => {
  const intl = useIntl();

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return intl.formatMessage({ id: 'partner.status.available', defaultMessage: 'Disponible' });
      case 'validated':
        return intl.formatMessage({ id: 'partner.status.validated', defaultMessage: 'Valid\u00e9' });
      case 'pending':
        return intl.formatMessage({ id: 'partner.status.pending', defaultMessage: 'En attente' });
      case 'paid':
        return intl.formatMessage({ id: 'partner.status.paid', defaultMessage: 'Pay\u00e9' });
      case 'cancelled':
        return intl.formatMessage({ id: 'partner.status.cancelled', defaultMessage: 'Annul\u00e9' });
      default:
        return status;
    }
  };

  const recentItems = commissions.slice(0, 5);

  if (recentItems.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border dark:border-gray-700">
        <h3 className="text-lg dark:text-white font-semibold mb-4">
          <FormattedMessage id="partner.recentCommissions.title" defaultMessage="Commissions r\u00e9centes" />
        </h3>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <DollarSign className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-500">
            <FormattedMessage
              id="partner.recentCommissions.empty"
              defaultMessage="Aucune commission pour le moment"
            />
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border dark:border-gray-700">
      <h3 className="text-lg dark:text-white font-semibold mb-4">
        <FormattedMessage id="partner.recentCommissions.title" defaultMessage="Commissions r\u00e9centes" />
      </h3>
      <div className="space-y-2">
        {recentItems.map((commission) => (
          <div
            key={commission.id}
            className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 min-h-[64px]"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                commission.status === 'available'
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : commission.status === 'pending'
                  ? 'bg-yellow-100 dark:bg-yellow-900/30'
                  : commission.status === 'cancelled'
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                {getStatusIcon(commission.status)}
              </div>
              <div className="min-w-0">
                <p className="text-sm dark:text-white font-medium truncate">
                  {commission.description}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {new Date(commission.createdAt).toLocaleDateString(intl.locale)}
                  </p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${getStatusColor(commission.status)}`}>
                    {getStatusLabel(commission.status)}
                  </span>
                </div>
              </div>
            </div>
            <span className={`font-bold ml-2 flex-shrink-0 ${
              commission.status === 'cancelled'
                ? 'text-red-500 dark:text-red-400 line-through'
                : 'text-green-600 dark:text-green-400'
            }`}>
              {commission.status === 'cancelled' ? '' : '+'}${(commission.amount / 100).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PartnerRecentCommissions;
