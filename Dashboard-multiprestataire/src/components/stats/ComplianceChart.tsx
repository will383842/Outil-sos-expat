/**
 * Compliance Chart Component
 * Donut chart showing compliant vs non-compliant providers
 */
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import type { AgencyStats } from '../../types';

interface ComplianceChartProps {
  stats: AgencyStats;
}

const COLORS = ['#22c55e', '#ef4444'];

export default function ComplianceChart({ stats }: ComplianceChartProps) {
  const data = [
    { name: 'Conformes', value: stats.compliantProviders },
    { name: 'Non conformes', value: stats.nonCompliantProviders },
  ];

  // Handle empty state
  if (stats.totalProviders === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Taux de conformité</h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500">Aucune donnée disponible</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Taux de conformité</h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              label={({ name, percent }) =>
                `${name}: ${(percent * 100).toFixed(0)}%`
              }
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [value, 'Prestataires']}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-100 text-center">
        <p className="text-3xl font-bold text-gray-900">
          {stats.complianceRate.toFixed(0)}%
        </p>
        <p className="text-sm text-gray-500">de conformité globale</p>
      </div>
    </div>
  );
}
