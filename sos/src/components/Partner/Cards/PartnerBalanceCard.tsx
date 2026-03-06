/**
 * PartnerBalanceCard - Displays available, pending, and total balance
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { DollarSign, Clock, TrendingUp } from 'lucide-react';

interface PartnerBalanceCardProps {
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
}

const formatUSD = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const PartnerBalanceCard: React.FC<PartnerBalanceCardProps> = ({
  availableBalance,
  pendingBalance,
  totalEarned,
}) => {
  return (
    <div className="grid sm:grid-cols-3 gap-4">
      {/* Available Balance */}
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-5 bg-gradient-to-br from-green-50 dark:from-green-900/20 to-emerald-50 dark:to-emerald-900/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
            <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            <FormattedMessage
              id="partner.balance.available"
              defaultMessage="Disponible"
            />
          </span>
        </div>
        <p className="text-2xl text-green-700 dark:text-green-400 font-bold">
          {formatUSD(availableBalance)}
        </p>
      </div>

      {/* Pending Balance */}
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-5 bg-gradient-to-br from-amber-50 dark:from-amber-900/20 to-orange-50 dark:to-orange-900/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            <FormattedMessage
              id="partner.balance.pending"
              defaultMessage="En attente"
            />
          </span>
        </div>
        <p className="text-2xl text-amber-700 dark:text-amber-400 font-bold">
          {formatUSD(pendingBalance)}
        </p>
      </div>

      {/* Total Earned */}
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-5 bg-gradient-to-br from-blue-50 dark:from-blue-900/20 to-indigo-50 dark:to-indigo-900/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            <FormattedMessage
              id="partner.balance.totalEarned"
              defaultMessage="Total gagn\u00e9"
            />
          </span>
        </div>
        <p className="text-2xl text-blue-700 dark:text-blue-400 font-bold">
          {formatUSD(totalEarned)}
        </p>
      </div>
    </div>
  );
};

export default PartnerBalanceCard;
