/**
 * AdminBloggerAnalytics - Admin analytics dashboard for the Blogger system
 *
 * Displays KPI cards, status distribution, and top earners table.
 * Fetches data from adminGetBloggersList callable.
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
  Wallet,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Ban,
  Loader2,
  RefreshCw,
  Trophy,
  Globe,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

// --- Types ---

interface BloggerSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  blogUrl: string;
  blogName: string;
  blogTheme: string;
  blogTraffic: string;
  totalEarned: number;
  totalClients: number;
  totalRecruits: number;
  createdAt: string;
}

interface AnalyticsData {
  totalBloggers: number;
  activeBloggers: number;
  suspendedBloggers: number;
  bannedBloggers: number;
  pendingBloggers: number;
  totalCommissionsPaid: number;
  averageEarnings: number;
  topEarners: BloggerSummary[];
}

// --- Component ---

const AdminBloggerAnalytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const adminGetBloggersList = httpsCallable<
        any,
        { bloggers: BloggerSummary[]; total: number; hasMore: boolean }
      >(functionsAffiliate, 'adminGetBloggersList');

      const result = await adminGetBloggersList({
        sortBy: 'totalEarned',
        sortOrder: 'desc',
        limit: 500,
      });

      const bloggers = result.data.bloggers;

      const activeBloggers = bloggers.filter((b) => b.status === 'active').length;
      const suspendedBloggers = bloggers.filter((b) => b.status === 'suspended').length;
      const bannedBloggers = bloggers.filter((b) => b.status === 'banned').length;
      const pendingBloggers = bloggers.filter((b) => b.status === 'pending').length;

      const totalCommissionsPaid = bloggers.reduce((sum, b) => sum + (b.totalEarned || 0), 0);
      const averageEarnings =
        activeBloggers > 0 ? Math.round(totalCommissionsPaid / activeBloggers) : 0;

      const topEarners = bloggers.filter((b) => b.totalEarned > 0).slice(0, 10);

      setData({
        totalBloggers: result.data.total,
        activeBloggers,
        suspendedBloggers,
        bannedBloggers,
        pendingBloggers,
        totalCommissionsPaid,
        averageEarnings,
        topEarners,
      });
    } catch (err: any) {
      console.error('[AdminBloggerAnalytics] Error fetching data:', err);
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
              Analytics Blogueurs
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Vue d'ensemble des performances du programme blogueur
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
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Blogueurs</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{data.totalBloggers}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge variant="default" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />{data.activeBloggers} actifs
                        </Badge>
                        {data.suspendedBloggers > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />{data.suspendedBloggers}
                          </Badge>
                        )}
                        {data.bannedBloggers > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            <Ban className="w-3 h-3 mr-1" />{data.bannedBloggers}
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

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Commissions totales</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(data.totalCommissionsPaid)}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Cumul tous blogueurs</p>
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
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">En attente</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{data.pendingBloggers}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Inscriptions a valider</p>
                    </div>
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                      <Wallet className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Gains moyens / blogueur</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(data.averageEarnings)}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Parmi les {data.activeBloggers} actifs</p>
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
                  <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.activeBloggers}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Actifs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                    <Loader2 className="w-8 h-8 text-yellow-500" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.pendingBloggers}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">En attente</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                    <AlertTriangle className="w-8 h-8 text-orange-500" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.suspendedBloggers}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Suspendus</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <Ban className="w-8 h-8 text-red-500" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.bannedBloggers}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Bannis</p>
                    </div>
                  </div>
                </div>

                {data.totalBloggers > 0 && (
                  <div className="mt-4">
                    <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <div className="bg-green-500 transition-all" style={{ width: `${(data.activeBloggers / data.totalBloggers) * 100}%` }} />
                      <div className="bg-yellow-400 transition-all" style={{ width: `${(data.pendingBloggers / data.totalBloggers) * 100}%` }} />
                      <div className="bg-orange-500 transition-all" style={{ width: `${(data.suspendedBloggers / data.totalBloggers) * 100}%` }} />
                      <div className="bg-red-500 transition-all" style={{ width: `${(data.bannedBloggers / data.totalBloggers) * 100}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Actifs ({Math.round((data.activeBloggers / data.totalBloggers) * 100)}%)</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> En attente ({Math.round((data.pendingBloggers / data.totalBloggers) * 100)}%)</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Suspendus ({Math.round((data.suspendedBloggers / data.totalBloggers) * 100)}%)</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Bannis ({Math.round((data.bannedBloggers / data.totalBloggers) * 100)}%)</span>
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
                  Top 10 Blogueurs par gains
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.topEarners.length === 0 ? (
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">Aucun blogueur avec des gains pour le moment</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Blogueur</TableHead>
                          <TableHead>Blog</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Gains totaux</TableHead>
                          <TableHead className="text-right">Clients</TableHead>
                          <TableHead className="text-right">Recrutes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.topEarners.map((blogger, index) => (
                          <TableRow key={blogger.id}>
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
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
                                  {blogger.firstName?.[0]}{blogger.lastName?.[0]}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white text-sm">{blogger.firstName} {blogger.lastName}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{blogger.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[150px]">{blogger.blogName || blogger.blogUrl}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={mapStatus(blogger.status)} label={blogger.status} size="sm" />
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(blogger.totalEarned)}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-sm text-gray-700 dark:text-gray-300">{blogger.totalClients}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-sm text-gray-700 dark:text-gray-300">{blogger.totalRecruits}</span>
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

export default AdminBloggerAnalytics;
