/**
 * PartnerClicksChart - Recharts BarChart showing clicks over time
 */

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ClickDataPoint {
  date: string;
  count: number;
}

interface PartnerClicksChartProps {
  data: ClickDataPoint[];
  title?: React.ReactNode;
}

const PartnerClicksChart: React.FC<PartnerClicksChartProps> = ({ data, title }) => {
  const intl = useIntl();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
          <p className="text-sm text-indigo-600 dark:text-indigo-400">
            {payload[0].value}{' '}
            {intl.formatMessage({ id: 'partner.chart.clicks.unit', defaultMessage: 'clics' })}
          </p>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border dark:border-gray-700">
        <h3 className="text-lg dark:text-white font-semibold mb-4">
          {title || <FormattedMessage id="partner.chart.clicks.title" defaultMessage="Clics" />}
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
        {title || <FormattedMessage id="partner.chart.clicks.title" defaultMessage="Clics" />}
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="count"
            fill="#4f46e5"
            radius={[4, 4, 0, 0]}
            name={intl.formatMessage({ id: 'partner.chart.clicks.label', defaultMessage: 'Clics' })}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PartnerClicksChart;
