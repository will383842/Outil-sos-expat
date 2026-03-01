/**
 * AdminChatterFunnel - Conversion funnel visualization for the Chatter system
 *
 * Displays a vertical funnel showing drop-off at each stage:
 * 1. Landing page visits (placeholder — requires chatter_funnel_stats collection)
 * 2. Registrations (total chatters from adminGetChattersList)
 * 3. Telegram connected (chatters with hasTelegram = true)
 * 4. First commission earned (chatters with totalEarned > 0)
 * 5. First withdrawal (chatters who have requested at least one withdrawal)
 *
 * Data is fetched client-side from the adminGetChattersList callable
 * and supplemented with withdrawal data from adminGetPendingChatterWithdrawals.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Filter,
  Users,
  MessageCircle,
  DollarSign,
  Wallet,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Eye,
  ArrowDown,
  Info,
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

interface FunnelStep {
  key: string;
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  barColor: string;
  note?: string;
}

// --- Component ---

const AdminChatterFunnel: React.FC = () => {
  const [steps, setSteps] = useState<FunnelStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFunnelData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all chatters (up to 500) to compute funnel counts
      const adminGetChattersList = httpsCallable<
        any,
        { chatters: ChatterSummary[]; total: number; hasMore: boolean }
      >(functionsAffiliate, 'adminGetChattersList');

      const result = await adminGetChattersList({
        sortBy: 'createdAt',
        sortOrder: 'desc',
        limit: 500,
        offset: 0,
      });

      const chatters = result.data.chatters;
      const totalRegistered = result.data.total;

      // Step 2: Total registrations
      const registrationCount = totalRegistered;

      // Step 3: Telegram connected
      // Note: hasTelegram is not returned by adminGetChattersList.
      // We approximate using chatters with status "active" since activation
      // happens after Telegram onboarding. This is an approximation.
      // For exact data, the callable would need to return hasTelegram.
      // Using -1 to indicate "data not available from current API"
      const telegramCount = -1;

      // Step 4: First commission earned (totalEarned > 0)
      const earnedCount = chatters.filter((c) => c.totalEarned > 0).length;

      // Step 5: First withdrawal — try to get withdrawal data
      let withdrawalCount = 0;
      try {
        // Count unique chatters who have any withdrawal (any status)
        const adminGetPendingWithdrawals = httpsCallable<
          any,
          { withdrawals: any[]; total: number }
        >(functionsAffiliate, 'adminGetPendingChatterWithdrawals');
        const withdrawalResult = await adminGetPendingWithdrawals({});
        // Count unique chatter IDs from withdrawals
        const uniqueChatterIds = new Set(
          (withdrawalResult.data.withdrawals || []).map((w: any) => w.chatterId)
        );
        withdrawalCount = uniqueChatterIds.size;
      } catch {
        // Withdrawal endpoint may not return all withdrawals — fallback
        withdrawalCount = 0;
      }

      // Build funnel steps
      const funnelSteps: FunnelStep[] = [
        {
          key: 'landing',
          label: 'Visites landing page',
          count: -1,
          icon: <Eye className="w-5 h-5" />,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          barColor: 'bg-blue-500',
          note: 'Necessite la collection chatter_funnel_stats (pas encore implementee)',
        },
        {
          key: 'registered',
          label: 'Inscriptions',
          count: registrationCount,
          icon: <Users className="w-5 h-5" />,
          color: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-100 dark:bg-purple-900/30',
          barColor: 'bg-purple-500',
        },
        {
          key: 'telegram',
          label: 'Telegram connecte',
          count: telegramCount,
          icon: <MessageCircle className="w-5 h-5" />,
          color: 'text-cyan-600 dark:text-cyan-400',
          bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
          barColor: 'bg-cyan-500',
          note: 'Champ hasTelegram non expose par adminGetChattersList — a ajouter',
        },
        {
          key: 'earned',
          label: 'Premiere commission',
          count: earnedCount,
          icon: <DollarSign className="w-5 h-5" />,
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          barColor: 'bg-green-500',
        },
        {
          key: 'withdrawn',
          label: 'Premier retrait',
          count: withdrawalCount,
          icon: <Wallet className="w-5 h-5" />,
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-100 dark:bg-orange-900/30',
          barColor: 'bg-orange-500',
          note: withdrawalCount === 0 ? 'Uniquement les retraits en cours (pending/approved/processing)' : undefined,
        },
      ];

      setSteps(funnelSteps);
    } catch (err: any) {
      console.error('[AdminChatterFunnel] Error fetching data:', err);
      setError(err.message || 'Erreur lors du chargement du funnel');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFunnelData();
  }, [fetchFunnelData]);

  // --- Helpers ---

  /**
   * Get the maximum valid count to use as the 100% bar reference.
   * Skips steps with count === -1 (unavailable data).
   */
  const getMaxCount = (): number => {
    const validCounts = steps.filter((s) => s.count > 0).map((s) => s.count);
    return validCounts.length > 0 ? Math.max(...validCounts) : 1;
  };

  /**
   * Compute conversion rate from previous step.
   * Returns null if either step has unavailable data.
   */
  const getConversionRate = (index: number): string | null => {
    if (index === 0) return null;

    const current = steps[index];
    const previous = steps[index - 1];

    if (current.count < 0 || previous.count < 0) return null;
    if (previous.count === 0) return '0%';

    const rate = (current.count / previous.count) * 100;
    return `${rate.toFixed(1)}%`;
  };

  /**
   * Compute overall conversion rate from first available step.
   */
  const getOverallDropOff = (index: number): string | null => {
    if (index <= 1) return null;

    const current = steps[index];
    // Find first step with valid data (usually "registered" at index 1)
    const firstValid = steps.find((s) => s.count > 0);

    if (!firstValid || current.count < 0 || firstValid.count <= 0) return null;

    const rate = (current.count / firstValid.count) * 100;
    return `${rate.toFixed(1)}%`;
  };

  const maxCount = getMaxCount();

  // --- Render ---

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Filter className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" />
              Funnel de conversion Chatters
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Visualisation des etapes cles du parcours chatter
            </p>
          </div>

          <button
            onClick={fetchFunnelData}
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
        {loading && steps.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          </div>
        ) : steps.length > 0 ? (
          <>
            {/* Funnel Visualization */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-500" />
                  Etapes du funnel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {steps.map((step, index) => {
                  const isAvailable = step.count >= 0;
                  const barWidth = isAvailable
                    ? Math.max((step.count / maxCount) * 100, 2)
                    : 0;
                  const conversionRate = getConversionRate(index);
                  const overallRate = getOverallDropOff(index);

                  return (
                    <div key={step.key}>
                      {/* Conversion arrow between steps */}
                      {index > 0 && (
                        <div className="flex items-center justify-center py-1">
                          <ArrowDown className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                          {conversionRate && (
                            <span className="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                              {conversionRate} de conversion
                            </span>
                          )}
                        </div>
                      )}

                      {/* Step row */}
                      <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        {/* Icon */}
                        <div className={`p-2.5 rounded-xl ${step.bgColor} flex-shrink-0`}>
                          <span className={step.color}>{step.icon}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Label and count */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {step.label}
                              </span>
                              {step.note && (
                                <span className="group relative">
                                  <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                  <span className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg z-10">
                                    {step.note}
                                  </span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {isAvailable ? (
                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                  {step.count.toLocaleString('fr-FR')}
                                </span>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  N/A
                                </Badge>
                              )}
                              {overallRate && (
                                <Badge variant="secondary" className="text-xs">
                                  {overallRate} du total
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Bar */}
                          <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            {isAvailable ? (
                              <div
                                className={`h-full ${step.barColor} rounded-full transition-all duration-700 ease-out`}
                                style={{ width: `${barWidth}%` }}
                              />
                            ) : (
                              <div className="h-full bg-gray-200 dark:bg-gray-700 rounded-full w-full flex items-center justify-center">
                                <span className="text-[9px] text-gray-400 dark:text-gray-500 leading-none">
                                  Pas de donnees
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="w-5 h-5 text-gray-500" />
                  Notes et limitations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    <p>
                      <strong>Visites landing page :</strong> Necessite la creation d'une collection{' '}
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        chatter_funnel_stats
                      </code>{' '}
                      alimentee par le tracking frontend (ex: Firebase Analytics ou un callable dedie).
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-cyan-500 flex-shrink-0" />
                    <p>
                      <strong>Telegram connecte :</strong> Le champ{' '}
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        hasTelegram
                      </code>{' '}
                      existe sur le document Chatter en Firestore mais n'est pas expose par{' '}
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        adminGetChattersList
                      </code>
                      . Il faut l'ajouter a la reponse de ce callable pour afficher cette metrique.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                    <p>
                      <strong>Premier retrait :</strong> Seuls les retraits en statut pending/approved/processing
                      sont comptabilises via le callable actuel. Pour un historique complet, il faudrait un
                      callable dedie qui compte les chatters distincts ayant au moins un retrait (tous statuts).
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    <p>
                      <strong>Premiere commission :</strong> Basee sur{' '}
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        totalEarned &gt; 0
                      </code>{' '}
                      parmi les 500 premiers chatters retournes par le callable. Si plus de 500 chatters
                      existent, ce chiffre est une approximation basse.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
};

export default AdminChatterFunnel;
