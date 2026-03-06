/**
 * AdminGroupAdminAnalytics - Admin analytics dashboard for the GroupAdmin system
 *
 * Displays KPI cards, status distribution, group type breakdown, and top earners.
 * Fetches data from adminGetGroupAdminsList callable.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, type StatusType } from '@/components/admin/StatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart3,
  Users,
  DollarSign,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Ban,
  Loader2,
  RefreshCw,
  Trophy,
  ShieldCheck,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

// --- Types ---

interface GroupAdminSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  groupName: string;
  groupType: string;
  groupSize: string;
  groupCountry: string;
  status: string;
  isGroupVerified: boolean;
  totalEarned: number;
  totalClients: number;
  totalRecruits: number;
  createdAt: any;
}

interface GroupAdminStats {
  totalActive: number;
  totalSuspended: number;
  totalEarnings: number;
  newThisMonth: number;
  verifiedGroups: number;
}

interface AnalyticsData {
  totalGroupAdmins: number;
  stats: GroupAdminStats;
  activeGroupAdmins: number;
  suspendedGroupAdmins: number;
  bannedGroupAdmins: number;
  pendingGroupAdmins: number;
  averageEarnings: number;
  topEarners: GroupAdminSummary[];
}

// --- Component ---

const AdminGroupAdminAnalytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const adminGetGroupAdminsList = httpsCallable<
        any,
        { groupAdmins: GroupAdminSummary[]; total: number; stats: GroupAdminStats }
      >(functionsAffiliate, 'adminGetGroupAdminsList');

      const result = await adminGetGroupAdminsList({
        limit: 100,
        page: 1,
      });

      const groupAdmins = result.data.groupAdmins;
      const stats = result.data.stats;

      const activeGroupAdmins = groupAdmins.filter((g) => g.status === 'active').length;
      const suspendedGroupAdmins = groupAdmins.filter((g) => g.status === 'suspended').length;
      const bannedGroupAdmins = groupAdmins.filter((g) => g.status === 'banned').length;
      const pendingGroupAdmins = groupAdmins.filter((g) => g.status === 'pending').length;

      const averageEarnings =
        stats.totalActive > 0 ? Math.round(stats.totalEarnings / stats.totalActive) : 0;

      const topEarners = [...groupAdmins]
        .sort((a, b) => (b.totalEarned || 0) - (a.totalEarned || 0))
        .filter((g) => g.totalEarned > 0)
        .slice(0, 10);

      setData({
        totalGroupAdmins: result.data.total,
        stats,
        activeGroupAdmins,
        suspendedGroupAdmins,
        bannedGroupAdmins,
        pendingGroupAdmins,
        averageEarnings,
        topEarners,
      });
    } catch (err: any) {
      console.error('[AdminGroupAdminAnalytics] Error fetching data:', err);
      setError(err.message || 'Erreur lors du chargement des analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const mapStatus = (status: string): StatusType => {
    switch (status) {
      case 'active': return 'active';
      case 'suspended': return 'suspended';
      case 'banned': return 'banned';
      case 'pending': return 'pending';
      default: return 'pending';
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <BarChart3 className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" />
              Analytics Group Admins
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Vue d'ensemble des performances du programme Group Admin
            </p>
          </div>
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {/* Error */}
        {error && (
          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {loading && !data ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          </div>
        ) : data ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Group Admins</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{data.totalGroupAdmins}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge variant="default" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />{data.activeGroupAdmins} actifs
                        </Badge>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                      <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Commissions totales</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(data.stats.totalEarnings)}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Cumul tous group admins</p>
                    </div>
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                      <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Gains moyens</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(data.averageEarnings)}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Par admin actif</p>
                    </div>
                    <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                      <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nouveaux ce mois</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{data.stats.newThisMonth}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Inscriptions recentes</p>
                    </div>
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                      <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Groupes verifies</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{data.stats.verifiedGroups}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Verification admin</p>
                    </div>
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                      <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-500" />
                  Distribution par statut
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.activeGroupAdmins}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Actifs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                    <Loader2 className="w-8 h-8 text-yellow-500" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.pendingGroupAdmins}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">En attente</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                    <AlertTriangle className="w-8 h-8 text-orange-500" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.suspendedGroupAdmins}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Suspendus</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <Ban className="w-8 h-8 text-red-500" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.bannedGroupAdmins}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Bannis</p>
                    </div>
                  </div>
                </div>

                {data.totalGroupAdmins > 0 && (
                  <div className="mt-4">
                    <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <div className="bg-green-500 transition-all" style={{ width: `${(data.activeGroupAdmins / data.totalGroupAdmins) * 100}%` }} />
                      <div className="bg-yellow-400 transition-all" style={{ width: `${(data.pendingGroupAdmins / data.totalGroupAdmins) * 100}%` }} />
                      <div className="bg-orange-500 transition-all" style={{ width: `${(data.suspendedGroupAdmins / data.totalGroupAdmins) * 100}%` }} />
                      <div className="bg-red-500 transition-all" style={{ width: `${(data.bannedGroupAdmins / data.totalGroupAdmins) * 100}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Actifs ({Math.round((data.activeGroupAdmins / data.totalGroupAdmins) * 100)}%)</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> En attente ({Math.round((data.pendingGroupAdmins / data.totalGroupAdmins) * 100)}%)</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Suspendus ({Math.round((data.suspendedGroupAdmins / data.totalGroupAdmins) * 100)}%)</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Bannis ({Math.round((data.bannedGroupAdmins / data.totalGroupAdmins) * 100)}%)</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top 10 Earners */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Top 10 Group Admins par gains
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.topEarners.length === 0 ? (
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">Aucun group admin avec des gains pour le moment</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Admin</TableHead>
                          <TableHead>Groupe</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Gains totaux</TableHead>
                          <TableHead className="text-right">Clients</TableHead>
                          <TableHead className="text-right">Recrutes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.topEarners.map((ga, index) => (
                          <TableRow key={ga.id}>
                            <TableCell>
                              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                                index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : index === 1 ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                : index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                : 'text-gray-400'
                              }`}>
                                {index + 1}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
                                  {ga.firstName?.[0]}{ga.lastName?.[0]}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white text-sm">{ga.firstName} {ga.lastName}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{ga.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{ga.groupName}</p>
                                <p className="text-xs text-gray-400">{ga.groupType} - {ga.groupSize}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={mapStatus(ga.status)} label={ga.status} size="sm" />
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(ga.totalEarned)}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-sm text-gray-700 dark:text-gray-300">{ga.totalClients}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-sm text-gray-700 dark:text-gray-300">{ga.totalRecruits}</span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
};

export default AdminGroupAdminAnalytics;
