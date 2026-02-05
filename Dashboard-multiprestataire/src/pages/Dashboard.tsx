/**
 * Dashboard Page
 * Main overview with KPIs and quick actions
 */
import { Link } from 'react-router-dom';
import { Users, BarChart3, CreditCard, Phone, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAgencyProviders, useProviderStats } from '../hooks';
import { StatsCard, ActivityFeed } from '../components/dashboard';
import { LoadingSpinner } from '../components/ui';

export default function Dashboard() {
  const { user } = useAuth();
  const { providers, isLoading: loadingProviders, activeCount, onlineCount } = useAgencyProviders();
  const { agencyStats, isLoading: loadingStats } = useProviderStats();

  const isLoading = loadingProviders || loadingStats;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Welcome message */}
      <p className="text-gray-600 mb-6">
        Bonjour, {user?.displayName || user?.email}
      </p>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Prestataires actifs"
          value={activeCount}
          icon={<Users className="w-6 h-6 text-primary-600" />}
          iconBg="bg-primary-100"
          subtitle={`${onlineCount} en ligne`}
        />

        <StatsCard
          title="Heures en ligne"
          value={agencyStats ? `${Math.round(agencyStats.totalHoursOnline)}h` : '0h'}
          icon={<Clock className="w-6 h-6 text-green-600" />}
          iconBg="bg-green-100"
          subtitle={`Moy. ${agencyStats ? Math.round(agencyStats.avgHoursOnline) : 0}h / presta`}
        />

        <StatsCard
          title="Appels ce mois"
          value={agencyStats?.totalCallsReceived || 0}
          icon={<Phone className="w-6 h-6 text-blue-600" />}
          iconBg="bg-blue-100"
          subtitle={`${agencyStats?.totalCallsMissed || 0} manqués`}
        />

        <StatsCard
          title="Taux de conformité"
          value={agencyStats ? `${Math.round(agencyStats.complianceRate)}%` : '-'}
          icon={<BarChart3 className="w-6 h-6 text-yellow-600" />}
          iconBg="bg-yellow-100"
          subtitle={`${agencyStats?.compliantProviders || 0} conformes`}
        />
      </div>

      {/* Quick Actions */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Actions rapides
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Link
          to="/team"
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:border-primary-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center group-hover:bg-primary-200 transition-colors">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Gérer l'équipe</h3>
              <p className="text-sm text-gray-500">
                {providers.length} prestataire{providers.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/stats"
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:border-primary-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Statistiques</h3>
              <p className="text-sm text-gray-500">
                Performances détaillées
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/billing"
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:border-primary-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Facturation</h3>
              <p className="text-sm text-gray-500">
                Abonnement et factures
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Activité récente
      </h2>
      <ActivityFeed providers={providers} />
    </div>
  );
}
