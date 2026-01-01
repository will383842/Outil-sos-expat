import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Handshake, TrendingUp, AlertCircle, RefreshCw, Users, Coins, Percent } from 'lucide-react';
import {
  collection,
  query,
  getDocs,
  where,
  Timestamp,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

// Types for affiliate stats
interface AffiliateStats {
  activeAffiliates: number;
  monthlyCommissions: number;
  averageConversionRate: number;
  isLoading: boolean;
  error: string | null;
}

interface AffiliateCode {
  id: string;
  code: string;
  userId: string;
  isActive: boolean;
  totalReferrals: number;
  totalCommissions: number;
  conversionRate: number;
  createdAt: Date;
}

// Fetch affiliate stats from Firestore
const fetchAffiliateStats = async (): Promise<{
  affiliates: AffiliateCode[];
  monthlyCommissions: number;
}> => {
  try {
    // Fetch active affiliate codes
    const affiliateCodesRef = collection(db, 'affiliate_codes');
    const affiliateCodesSnap = await getDocs(affiliateCodesRef);

    const affiliates: AffiliateCode[] = [];

    affiliateCodesSnap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      // Skip placeholder documents
      if (data._placeholder) return;

      affiliates.push({
        id: docSnap.id,
        code: data.code || '',
        userId: data.userId || '',
        isActive: data.isActive !== false,
        totalReferrals: Number(data.totalReferrals || 0),
        totalCommissions: Number(data.totalCommissions || 0),
        conversionRate: Number(data.conversionRate || 0),
        createdAt: data.createdAt?.toDate?.() || new Date(),
      });
    });

    // Calculate monthly commissions from referrals collection
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const referralsRef = collection(db, 'referrals');
    const monthlyReferralsQuery = query(
      referralsRef,
      where('createdAt', '>=', Timestamp.fromDate(startOfMonth))
    );

    let monthlyCommissions = 0;
    try {
      const referralsSnap = await getDocs(monthlyReferralsQuery);
      referralsSnap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data._placeholder) {
          monthlyCommissions += Number(data.commissionAmount || 0);
        }
      });
    } catch (e) {
      // If query fails (e.g., index not ready), calculate from affiliate_codes
      monthlyCommissions = affiliates.reduce((sum, a) => sum + a.totalCommissions, 0);
    }

    return { affiliates, monthlyCommissions };
  } catch (error) {
    console.error('[AdminAffiliates] Error fetching affiliate stats:', error);
    throw error;
  }
};

// Initialize affiliate stats document if it doesn't exist
const ensureAffiliateStatsDoc = async () => {
  try {
    const statsRef = doc(db, 'admin_config', 'affiliate_stats');
    const statsSnap = await getDoc(statsRef);

    if (!statsSnap.exists()) {
      await setDoc(statsRef, {
        totalAffiliates: 0,
        totalCommissionsPaid: 0,
        averageConversionRate: 0,
        lastUpdated: serverTimestamp(),
        _description: 'Aggregate stats for affiliate program',
      });
    }

    return statsSnap.exists() ? statsSnap.data() : null;
  } catch (error) {
    console.error('[AdminAffiliates] Error ensuring stats doc:', error);
    return null;
  }
};

const AdminAffiliates: React.FC = () => {
  const [stats, setStats] = useState<AffiliateStats>({
    activeAffiliates: 0,
    monthlyCommissions: 0,
    averageConversionRate: 0,
    isLoading: true,
    error: null,
  });

  const loadStats = async () => {
    setStats(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Ensure stats document exists
      await ensureAffiliateStatsDoc();

      // Fetch real data from Firestore
      const { affiliates, monthlyCommissions } = await fetchAffiliateStats();

      // Calculate stats
      const activeAffiliates = affiliates.filter(a => a.isActive).length;
      const totalConversionRate = affiliates.reduce((sum, a) => sum + a.conversionRate, 0);
      const averageConversionRate = affiliates.length > 0
        ? totalConversionRate / affiliates.length
        : 0;

      setStats({
        activeAffiliates,
        monthlyCommissions,
        averageConversionRate,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('[AdminAffiliates] Failed to load stats:', error);
      setStats(prev => ({
        ...prev,
        isLoading: false,
        error: 'Impossible de charger les statistiques',
      }));
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format percentage
  const formatPercent = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Handshake className="w-7 h-7 mr-2 text-indigo-600" />
              Gestion des Affilies
            </h1>
            <p className="text-gray-600 mt-1">Programme d'affiliation et partenaires</p>
          </div>
          <button
            onClick={loadStats}
            disabled={stats.isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${stats.isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {stats.error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{stats.error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-amber-100 rounded-full p-4">
                <AlertCircle className="w-12 h-12 text-amber-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Module en developpement</h3>
            <p className="text-gray-600 mb-6">
              Le programme d'affiliation sera disponible dans une prochaine version.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-medium text-gray-700">Affilies actifs</h4>
                </div>
                {stats.isLoading ? (
                  <div className="h-5 w-16 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  <p className="text-lg font-semibold text-gray-900">
                    {stats.activeAffiliates > 0 ? stats.activeAffiliates : '--'}
                  </p>
                )}
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-5 h-5 text-green-600" />
                  <h4 className="font-medium text-gray-700">Commissions ce mois</h4>
                </div>
                {stats.isLoading ? (
                  <div className="h-5 w-20 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  <p className="text-lg font-semibold text-gray-900">
                    {stats.monthlyCommissions > 0 ? formatCurrency(stats.monthlyCommissions) : '--'}
                  </p>
                )}
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
                <div className="flex items-center gap-2 mb-2">
                  <Percent className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-gray-700">Taux de conversion</h4>
                </div>
                {stats.isLoading ? (
                  <div className="h-5 w-12 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  <p className="text-lg font-semibold text-gray-900">
                    {stats.averageConversionRate > 0 ? formatPercent(stats.averageConversionRate) : '--'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAffiliates;
