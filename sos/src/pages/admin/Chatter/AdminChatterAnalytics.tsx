/**
 * AdminChatterAnalytics - Admin analytics dashboard for the Chatter system
 *
 * Displays KPI cards, status distribution, and top earners table.
 * Fetches data from adminGetChattersList callable.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Wallet,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Ban,
  Loader2,
  RefreshCw,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

// --- Types ---

interface ChatterSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  level: number;
  totalEarned: number;
  totalClients: number;
  totalRecruits: number;
  currentStreak: number;
  country?: string;
  createdAt: string;
}

interface AnalyticsData {
  totalChatters: number;
  activeChatters: number;
  suspendedChatters: number;
  bannedChatters: number;
  pendingChatters: number;
  totalCommissionsPaid: number;
  totalWithdrawalsProcessed: number;
  averageEarnings: number;
  topEarners: ChatterSummary[];
}

// --- Component ---

const AdminChatterAnalytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all chatters sorted by earnings to compute analytics client-side
      const adminGetChattersList = httpsCallable<
        any,
        { chatters: ChatterSummary[]; total: number; hasMore: boolean }
      >(functionsAffiliate, 'adminGetChattersList');

      const result = await adminGetChattersList({
        sortBy: 'totalEarned',
        sortOrder: 'desc',
        limit: 500,
        offset: 0,
      });

      const chatters = result.data.chatters;

      // Compute KPIs
      const activeChatters = chatters.filter((c) => c.status === 'active').length;
      const suspendedChatters = chatters.filter((c) => c.status === 'suspended').length;
      const bannedChatters = chatters.filter((c) => c.status === 'banned').length;
      const pendingChatters = chatters.filter(
        (c) => c.status === 'pending' || c.status === 'quiz_required'
      ).length;

      const totalCommissionsPaid = chatters.reduce((sum, c) => sum + (c.totalEarned || 0), 0);
      const averageEarnings =
        activeChatters > 0
          ? Math.round(totalCommissionsPaid / activeChatters)
          : 0;

      // Fetch processed withdrawals count
      let totalWithdrawalsProcessed = 0;
      try {
        const adminGetPendingWithdrawals = httpsCallable<
          any,
          { withdrawals: any[]; total: number }
        >(functionsAffiliate, 'adminGetPendingChatterWithdrawals');
        const withdrawalResult = await adminGetPendingWithdrawals({ status: 'completed' });
        totalWithdrawalsProcessed = withdrawalResult.data.total || 0;
      } catch {
        // Withdrawal endpoint may not support 'completed' filter -- fallback to 0
        totalWithdrawalsProcessed = 0;
      }

      // Top 10 earners
      const topEarners = chatters
        .filter((c) => c.totalEarned > 0)
        .slice(0, 10);

      setData({
        totalChatters: result.data.total,
        activeChatters,
        suspendedChatters,
        bannedChatters,
        pendingChatters,
        totalCommissionsPaid,
        totalWithdrawalsProcessed,
        averageEarnings,
        topEarners,
      });
    } catch (err: any) {
      console.error('[AdminChatterAnalytics] Error fetching data:', err);
      setError(err.message || 'Erreur lors du chargement des analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // --- Helpers ---

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const getStatusBadgeVariant = (
    status: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'active':
        return 'default';
      case 'suspended':
        return 'secondary';
      case 'banned':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getLevelName = (level: number): string => {
    const levels: Record<number, string> = {
      1: 'Bronze',
      2: 'Silver',
      3: 'Gold',
      4: 'Platinum',
      5: 'Diamond',
    };
    return levels[level] || 'Unknown';
  };

  // --- Render ---

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <BarChart3 className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" />
              Analytics Chatters
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Vue d'ensemble des performances du programme chatter
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Chatters */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Total Chatters
                      </p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                        {data.totalChatters}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge variant="default" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {data.activeChatters} actifs
                        </Badge>
                        {data.suspendedChatters > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {data.suspendedChatters}
                          </Badge>
                        )}
                        {data.bannedChatters > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            <Ban className="w-3 h-3 mr-1" />
                            {data.bannedChatters}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                      <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Commissions Paid */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Commissions totales
                      </p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                        {formatCurrency(data.totalCommissionsPaid)}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        Cumul tous chatters confondus
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                      <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Withdrawals */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Retraits traites
                      </p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                        {data.totalWithdrawalsProcessed}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        Demandes completes
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                      <Wallet className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Average Earnings */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Gains moyens / chatter
                      </p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                        {formatCurrency(data.averageEarnings)}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        Parmi les {data.activeChatters} actifs
                      </p>
                    </div>
                    <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                      <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
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
                  {/* Active */}
                  <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {data.activeChatters}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Actifs</p>
                    </div>
                  </div>

                  {/* Pending */}
                  <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                    <Loader2 className="w-8 h-8 text-yellow-500" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {data.pendingChatters}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">En attente</p>
                    </div>
                  </div>

                  {/* Suspended */}
                  <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                    <AlertTriangle className="w-8 h-8 text-orange-500" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {data.suspendedChatters}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Suspendus</p>
                    </div>
                  </div>

                  {/* Banned */}
                  <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <Ban className="w-8 h-8 text-red-500" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {data.bannedChatters}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Bannis</p>
                    </div>
                  </div>
                </div>

                {/* Visual bar */}
                {data.totalChatters > 0 && (
                  <div className="mt-4">
                    <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <div
                        className="bg-green-500 transition-all"
                        style={{
                          width: `${(data.activeChatters / data.totalChatters) * 100}%`,
                        }}
                        title={`Actifs: ${data.activeChatters}`}
                      />
                      <div
                        className="bg-yellow-400 transition-all"
                        style={{
                          width: `${(data.pendingChatters / data.totalChatters) * 100}%`,
                        }}
                        title={`En attente: ${data.pendingChatters}`}
                      />
                      <div
                        className="bg-orange-500 transition-all"
                        style={{
                          width: `${(data.suspendedChatters / data.totalChatters) * 100}%`,
                        }}
                        title={`Suspendus: ${data.suspendedChatters}`}
                      />
                      <div
                        className="bg-red-500 transition-all"
                        style={{
                          width: `${(data.bannedChatters / data.totalChatters) * 100}%`,
                        }}
                        title={`Bannis: ${data.bannedChatters}`}
                      />
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500" /> Actifs (
                        {Math.round((data.activeChatters / data.totalChatters) * 100)}%)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-yellow-400" /> En attente (
                        {Math.round((data.pendingChatters / data.totalChatters) * 100)}%)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-orange-500" /> Suspendus (
                        {Math.round((data.suspendedChatters / data.totalChatters) * 100)}%)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500" /> Bannis (
                        {Math.round((data.bannedChatters / data.totalChatters) * 100)}%)
                      </span>
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
                  Top 10 Chatters par gains
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.topEarners.length === 0 ? (
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Aucun chatter avec des gains pour le moment
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Chatter</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Niveau</TableHead>
                          <TableHead className="text-right">Gains totaux</TableHead>
                          <TableHead className="text-right">Clients</TableHead>
                          <TableHead className="text-right">Recrutes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.topEarners.map((chatter, index) => (
                          <TableRow key={chatter.id}>
                            <TableCell>
                              <span
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                                  index === 0
                                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    : index === 1
                                      ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                      : index === 2
                                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                        : 'text-gray-400'
                                }`}
                              >
                                {index + 1}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center text-white font-bold text-xs">
                                  {chatter.firstName?.[0]}
                                  {chatter.lastName?.[0]}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                                    {chatter.firstName} {chatter.lastName}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {chatter.email}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(chatter.status)}>
                                {chatter.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {getLevelName(chatter.level)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-semibold text-green-600 dark:text-green-400">
                                {formatCurrency(chatter.totalEarned)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {chatter.totalClients}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {chatter.totalRecruits}
                              </span>
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

export default AdminChatterAnalytics;
