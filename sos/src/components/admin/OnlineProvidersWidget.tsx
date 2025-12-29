// src/components/admin/OnlineProvidersWidget.tsx
// Widget temps réel affichant le nombre de prestataires en ligne
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wifi,
  WifiOff,
  Phone,
  Users,
  Scale,
  Globe,
  Activity,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

interface ProviderStats {
  totalProviders: number;
  onlineNow: number;
  busyNow: number;
  offlineNow: number;
  lawyersOnline: number;
  expatsOnline: number;
}

interface OnlineProvidersWidgetProps {
  compact?: boolean;
  showLink?: boolean;
}

const OnlineProvidersWidget: React.FC<OnlineProvidersWidgetProps> = ({
  compact = false,
  showLink = true,
}) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<ProviderStats>({
    totalProviders: 0,
    onlineNow: 0,
    busyNow: 0,
    offlineNow: 0,
    lawyersOnline: 0,
    expatsOnline: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [lowProviderAlert, setLowProviderAlert] = useState(false);
  const mountedRef = useRef(true);

  // Configuration des seuils d'alerte
  const MIN_PROVIDERS_THRESHOLD = 2;

  useEffect(() => {
    mountedRef.current = true;

    // Écoute temps réel des prestataires
    const providersQuery = query(
      collection(db, 'sos_profiles'),
      where('type', 'in', ['lawyer', 'expat'])
    );

    const unsubscribe = onSnapshot(
      providersQuery,
      (snapshot) => {
        if (!mountedRef.current) return;

        const providers = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const onlineCount = providers.filter(
          (p: any) => p.isOnline && p.availability === 'available'
        ).length;
        const busyCount = providers.filter(
          (p: any) => p.isOnline && p.availability === 'busy'
        ).length;
        const offlineCount = providers.filter(
          (p: any) => !p.isOnline || p.availability === 'offline'
        ).length;
        const lawyersOnline = providers.filter(
          (p: any) => p.type === 'lawyer' && p.isOnline && p.availability !== 'offline'
        ).length;
        const expatsOnline = providers.filter(
          (p: any) => p.type === 'expat' && p.isOnline && p.availability !== 'offline'
        ).length;

        setStats({
          totalProviders: providers.length,
          onlineNow: onlineCount,
          busyNow: busyCount,
          offlineNow: offlineCount,
          lawyersOnline,
          expatsOnline,
        });

        // Alerte si peu de prestataires en ligne
        setLowProviderAlert(onlineCount < MIN_PROVIDERS_THRESHOLD);

        setIsLoading(false);
        setIsLive(true);
      },
      (error) => {
        if (!mountedRef.current) return;
        console.error('Erreur OnlineProvidersWidget:', error);
        setIsLoading(false);
        setIsLive(false);
      }
    );

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className={`bg-white rounded-lg shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow ${
          lowProviderAlert ? 'border-red-300 bg-red-50' : 'border-gray-200'
        }`}
        onClick={() => showLink && navigate('/admin/providers')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${lowProviderAlert ? 'bg-red-100' : 'bg-green-100'}`}>
              {lowProviderAlert ? (
                <AlertTriangle className="text-red-600" size={20} />
              ) : (
                <Wifi className="text-green-600" size={20} />
              )}
            </div>
            <div>
              <div className="flex items-center">
                <span className="text-2xl font-bold text-gray-900">{stats.onlineNow}</span>
                <span className="text-sm text-gray-500 ml-2">en ligne</span>
                {isLive && (
                  <div className="ml-2 flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {stats.busyNow} en appel | {stats.offlineNow} hors ligne
              </div>
            </div>
          </div>
          {showLink && <ChevronRight className="text-gray-400" size={20} />}
        </div>
        {lowProviderAlert && (
          <div className="mt-2 text-xs text-red-600 flex items-center">
            <AlertTriangle size={12} className="mr-1" />
            Attention: Peu de prestataires disponibles!
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border ${
        lowProviderAlert ? 'border-red-300' : 'border-gray-200'
      } overflow-hidden`}
    >
      {/* Header */}
      <div className={`px-6 py-4 border-b ${lowProviderAlert ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="mr-2 text-blue-600" size={20} />
            Prestataires en ligne
          </h3>
          <div className="flex items-center space-x-2">
            {isLive && (
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                <span className="text-xs text-green-600 font-medium">LIVE</span>
              </div>
            )}
            {showLink && (
              <button
                onClick={() => navigate('/admin/providers')}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                Voir tout
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alerte */}
      {lowProviderAlert && (
        <div className="px-6 py-3 bg-red-100 border-b border-red-200">
          <div className="flex items-center text-red-800">
            <AlertTriangle size={16} className="mr-2" />
            <span className="text-sm font-medium">
              Alerte: Seulement {stats.onlineNow} prestataire(s) disponible(s)!
            </span>
          </div>
        </div>
      )}

      {/* Stats principales */}
      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Wifi className="text-green-600" size={24} />
            </div>
            <div className="text-3xl font-bold text-green-600">{stats.onlineNow}</div>
            <div className="text-xs text-gray-600">En ligne</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Phone className="text-orange-600" size={24} />
            </div>
            <div className="text-3xl font-bold text-orange-600">{stats.busyNow}</div>
            <div className="text-xs text-gray-600">En appel</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <WifiOff className="text-gray-500" size={24} />
            </div>
            <div className="text-3xl font-bold text-gray-600">{stats.offlineNow}</div>
            <div className="text-xs text-gray-600">Hors ligne</div>
          </div>
        </div>

        {/* Répartition par type */}
        <div className="border-t border-gray-200 pt-4">
          <div className="text-sm text-gray-600 mb-3">Répartition par type:</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <Scale className="text-blue-600 mr-2" size={18} />
                <span className="text-sm font-medium text-gray-700">Avocats</span>
              </div>
              <span className="text-lg font-bold text-blue-600">{stats.lawyersOnline}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-teal-50 rounded-lg">
              <div className="flex items-center">
                <Globe className="text-teal-600 mr-2" size={18} />
                <span className="text-sm font-medium text-gray-700">Expatriés</span>
              </div>
              <span className="text-lg font-bold text-teal-600">{stats.expatsOnline}</span>
            </div>
          </div>
        </div>

        {/* Taux de présence */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Taux de présence:</span>
            <span className="text-lg font-bold text-gray-900">
              {stats.totalProviders > 0
                ? `${Math.round(((stats.onlineNow + stats.busyNow) / stats.totalProviders) * 100)}%`
                : '0%'}
            </span>
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
              style={{
                width: stats.totalProviders > 0
                  ? `${((stats.onlineNow + stats.busyNow) / stats.totalProviders) * 100}%`
                  : '0%',
              }}
            ></div>
          </div>
          <div className="mt-1 text-xs text-gray-500 text-right">
            {stats.onlineNow + stats.busyNow} / {stats.totalProviders} prestataires
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnlineProvidersWidget;
