/**
 * Provider List Component
 * Table view of all providers with search and filter
 */
import { useState, useMemo } from 'react';
import { Search, Filter } from 'lucide-react';
import { StatusBadge, OnlineIndicator, LoadingSpinner } from '../ui';
import type { Provider, AvailabilityStatus } from '../../types';

interface ProviderListProps {
  providers: Provider[];
  isLoading?: boolean;
  onEdit?: (provider: Provider) => void;
}

type FilterStatus = 'all' | AvailabilityStatus;

export default function ProviderList({ providers, isLoading, onEdit }: ProviderListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      // Search filter
      const matchesSearch = searchTerm === '' ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' || p.availability === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [providers, searchTerm, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un prestataire..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
          >
            <option value="all">Tous les statuts</option>
            <option value="available">Disponible</option>
            <option value="busy">Occupé</option>
            <option value="offline">Hors ligne</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-4">
        {filteredProviders.length} prestataire{filteredProviders.length !== 1 ? 's' : ''}
        {searchTerm || statusFilter !== 'all' ? ' (filtré)' : ''}
      </p>

      {/* Table */}
      {filteredProviders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <p className="text-gray-500">Aucun prestataire trouvé</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prestataire
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Appels
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Heures
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProviders.map((provider) => (
                  <ProviderRow
                    key={provider.id}
                    provider={provider}
                    onEdit={onEdit}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

interface ProviderRowProps {
  provider: Provider;
  onEdit?: (provider: Provider) => void;
}

function ProviderRow({ provider, onEdit }: ProviderRowProps) {
  const initials = provider.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            {provider.photoURL ? (
              <img
                src={provider.photoURL}
                alt={provider.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-600">{initials}</span>
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5">
              <OnlineIndicator isOnline={provider.isOnline} />
            </div>
          </div>
          <div>
            <p className="font-medium text-gray-900">{provider.name}</p>
            <p className="text-sm text-gray-500">{provider.email}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-gray-600">
        {provider.type === 'lawyer' ? 'Avocat' : 'Expat'}
      </td>
      <td className="px-6 py-4">
        <StatusBadge status={provider.availability} />
      </td>
      <td className="px-6 py-4 text-gray-600">
        {provider.totalCalls || 0}
      </td>
      <td className="px-6 py-4 text-gray-600">
        {provider.totalHoursOnline || 0}h
      </td>
      <td className="px-6 py-4 text-right">
        {onEdit && (
          <button
            onClick={() => onEdit(provider)}
            className="text-primary-600 hover:text-primary-800 text-sm font-medium"
          >
            Voir
          </button>
        )}
      </td>
    </tr>
  );
}
