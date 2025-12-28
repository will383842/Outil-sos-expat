/**
 * =============================================================================
 * PROVIDER STATS - Grille de statistiques des prestataires
 * =============================================================================
 */

import { User, Scale, Globe, Shield, type LucideIcon } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

export interface ProviderStatsData {
  total: number;
  lawyers: number;
  expats: number;
  withAccess: number;
}

export interface ProviderStatsProps {
  stats: ProviderStatsData;
}

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-600">{label}</div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ProviderStats({ stats }: ProviderStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total"
        value={stats.total}
        icon={User}
        color="bg-gray-100 text-gray-700"
      />
      <StatCard
        label="Avocats"
        value={stats.lawyers}
        icon={Scale}
        color="bg-blue-100 text-blue-700"
      />
      <StatCard
        label="Expatries"
        value={stats.expats}
        icon={Globe}
        color="bg-green-100 text-green-700"
      />
      <StatCard
        label="Avec acces"
        value={stats.withAccess}
        icon={Shield}
        color="bg-purple-100 text-purple-700"
      />
    </div>
  );
}

// Export StatCard for individual use if needed
export { StatCard };

export default ProviderStats;
