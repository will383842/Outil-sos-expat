/**
 * PartnerEarningsChart - Recharts AreaChart showing earnings over time
 */

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface EarningsDataPoint {
  month: string;
  earnings: number;
}

interface PartnerEarningsChartProps {
  data: EarningsDataPoint[];
}

const PartnerEarningsChart: React.FC<PartnerEarningsChartProps> = ({ data }) => {
  const intl = useIntl();

  const chartData = data.map((d) => ({
    ...d,
    earningsUSD: d.earnings / 100,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            ${payload[0].value.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border dark:border-gray-700">
        <h3 className="text-lg dark:text-white font-semibold mb-4">
          <FormattedMessage id="partner.chart.earnings.title" defaultMessage="Revenus (6 derniers mois)" />
        </h3>
        <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-600">
          <FormattedMessage id="partner.chart.noData" defaultMessage="Pas encore de donn\u00e9es" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border dark:border-gray-700">
      <h3 className="text-lg dark:text-white font-semibold mb-4">
        <FormattedMessage id="partner.chart.earnings.title" defaultMessage="Revenus (6 derniers mois)" />
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="partnerEarningsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="earningsUSD"
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#partnerEarningsGradient)"
            name={intl.formatMessage({ id: 'partner.chart.earnings.label', defaultMessage: 'Revenus' })}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PartnerEarningsChart;
