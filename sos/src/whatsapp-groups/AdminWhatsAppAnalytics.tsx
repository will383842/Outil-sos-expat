/**
 * AdminWhatsAppAnalytics - Dashboard analytics pour les groupes WhatsApp
 * Affiche les taux de clic par role, par groupe, evolution dans le temps
 *
 * Requetes Firestore directes (pas de Cloud Function) :
 * - chatters, influencers, bloggers, group_admins, users
 * - Filtre sur whatsappGroupClicked == true pour compter les joiners
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import AdminLayout from '@/components/admin/AdminLayout';
import { WhatsAppIcon } from './WhatsAppGroupScreen';
import { ROLE_LABELS } from './types';
import type { WhatsAppRole } from './types';
import {
  Loader2,
  RefreshCw,
  TrendingUp,
  Users,
  MousePointerClick,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

/** Collections Firestore par role */
const ROLE_COLLECTIONS: Record<WhatsAppRole, string> = {
  chatter: 'chatters',
  influencer: 'influencers',
  blogger: 'bloggers',
  groupAdmin: 'group_admins',
  client: 'users',
  lawyer: 'users',
  expat: 'users',
};

/** Roles a auditer (client/lawyer/expat sont dans "users" donc traites separement) */
const AFFILIATE_ROLES: WhatsAppRole[] = ['chatter', 'influencer', 'blogger', 'groupAdmin'];
const PROVIDER_ROLES: WhatsAppRole[] = ['client', 'lawyer', 'expat'];

interface RoleStats {
  role: WhatsAppRole;
  total: number;
  clicked: number;
  rate: number;
  recentClicks: number; // clics dans les 7 derniers jours
}

interface GroupBreakdown {
  groupId: string;
  count: number;
}

interface TimelinePoint {
  date: string; // YYYY-MM-DD
  count: number;
}

const AdminWhatsAppAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [roleStats, setRoleStats] = useState<RoleStats[]>([]);
  const [groupBreakdown, setGroupBreakdown] = useState<GroupBreakdown[]>([]);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const stats: RoleStats[] = [];
      const groupCounts = new Map<string, number>();
      const dailyCounts = new Map<string, number>();
      const sevenDaysAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
      const thirtyDaysAgo = Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

      // Fetch affiliate roles (each has its own collection)
      for (const role of AFFILIATE_ROLES) {
        const col = ROLE_COLLECTIONS[role];
        const [allSnap, clickedSnap, recentSnap] = await Promise.all([
          getDocs(collection(db, col)),
          getDocs(query(collection(db, col), where('whatsappGroupClicked', '==', true))),
          getDocs(query(
            collection(db, col),
            where('whatsappGroupClicked', '==', true),
            where('whatsappGroupClickedAt', '>=', sevenDaysAgo)
          )),
        ]);

        const total = allSnap.size;
        const clicked = clickedSnap.size;

        stats.push({
          role,
          total,
          clicked,
          rate: total > 0 ? Math.round((clicked / total) * 100) : 0,
          recentClicks: recentSnap.size,
        });

        // Group breakdown & timeline from clicked docs
        clickedSnap.docs.forEach((d) => {
          const data = d.data();
          const gId = data.whatsappGroupId || 'unknown';
          groupCounts.set(gId, (groupCounts.get(gId) || 0) + 1);

          if (data.whatsappGroupClickedAt) {
            const ts = data.whatsappGroupClickedAt as Timestamp;
            if (ts.toDate() >= thirtyDaysAgo.toDate()) {
              const dateStr = ts.toDate().toISOString().slice(0, 10);
              dailyCounts.set(dateStr, (dailyCounts.get(dateStr) || 0) + 1);
            }
          }
        });
      }

      // Fetch provider roles (all in "users" collection, filter by role field)
      for (const role of PROVIDER_ROLES) {
        const col = 'users';
        const roleField = role === 'client' ? 'client' : role === 'lawyer' ? 'lawyer' : 'expat';
        // Users collection doesn't have a clean role field, use registration markers
        // For simplicity, count all users with whatsappGroupClicked in the users collection
        // and aggregate them together
        const [clickedSnap, recentSnap] = await Promise.all([
          getDocs(query(collection(db, col), where('whatsappGroupClicked', '==', true))),
          getDocs(query(
            collection(db, col),
            where('whatsappGroupClicked', '==', true),
            where('whatsappGroupClickedAt', '>=', sevenDaysAgo)
          )),
        ]);

        // Only count once for all provider roles (they share the users collection)
        if (role === 'client') {
          const allSnap = await getDocs(collection(db, col));
          stats.push({
            role: 'client',
            total: allSnap.size,
            clicked: clickedSnap.size,
            rate: allSnap.size > 0 ? Math.round((clickedSnap.size / allSnap.size) * 100) : 0,
            recentClicks: recentSnap.size,
          });

          clickedSnap.docs.forEach((d) => {
            const data = d.data();
            const gId = data.whatsappGroupId || 'unknown';
            groupCounts.set(gId, (groupCounts.get(gId) || 0) + 1);

            if (data.whatsappGroupClickedAt) {
              const ts = data.whatsappGroupClickedAt as Timestamp;
              if (ts.toDate() >= thirtyDaysAgo.toDate()) {
                const dateStr = ts.toDate().toISOString().slice(0, 10);
                dailyCounts.set(dateStr, (dailyCounts.get(dateStr) || 0) + 1);
              }
            }
          });
        }
        // Skip lawyer/expat since they share the users collection — counted under "client"
      }

      // Sort group breakdown
      const sortedGroups = Array.from(groupCounts.entries())
        .map(([groupId, count]) => ({ groupId, count }))
        .sort((a, b) => b.count - a.count);

      // Build timeline (last 30 days)
      const timelineData: TimelinePoint[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().slice(0, 10);
        timelineData.push({ date: dateStr, count: dailyCounts.get(dateStr) || 0 });
      }

      setRoleStats(stats);
      setGroupBreakdown(sortedGroups);
      setTimeline(timelineData);
    } catch (err) {
      console.error('[WhatsApp Analytics] Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  // Totals
  const totalUsers = useMemo(() => roleStats.reduce((s, r) => s + r.total, 0), [roleStats]);
  const totalClicked = useMemo(() => roleStats.reduce((s, r) => s + r.clicked, 0), [roleStats]);
  const totalRate = totalUsers > 0 ? Math.round((totalClicked / totalUsers) * 100) : 0;
  const totalRecent = useMemo(() => roleStats.reduce((s, r) => s + r.recentClicks, 0), [roleStats]);

  // Max for timeline bar chart
  const maxTimelineCount = useMemo(() => Math.max(1, ...timeline.map((t) => t.count)), [timeline]);

  return (
    <AdminLayout>
      <div className="bg-zinc-50 dark:bg-zinc-950 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                <BarChart3 className="w-7 h-7 text-[#25D366]" />
                WhatsApp Analytics
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Taux de conversion et engagement des groupes WhatsApp
              </p>
            </div>
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900"
              title="Rafraichir"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-6 h-6 text-[#25D366] animate-spin" />
            </div>
          ) : (
            <>
              {/* ===== KPI Cards ===== */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Total inscrits */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700/50 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-zinc-400" />
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wide">Inscrits</span>
                  </div>
                  <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{totalUsers.toLocaleString()}</p>
                </div>

                {/* Ont clique */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700/50 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <MousePointerClick className="w-4 h-4 text-[#25D366]" />
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wide">Ont clique</span>
                  </div>
                  <p className="text-3xl font-bold text-[#25D366]">{totalClicked.toLocaleString()}</p>
                </div>

                {/* Taux de conversion */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700/50 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wide">Taux global</span>
                  </div>
                  <p className={`text-3xl font-bold ${totalRate >= 50 ? 'text-[#25D366]' : totalRate >= 20 ? 'text-amber-500' : 'text-red-500'}`}>
                    {totalRate}%
                  </p>
                </div>

                {/* Clics 7 derniers jours */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700/50 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wide">7 derniers jours</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-500">{totalRecent.toLocaleString()}</p>
                </div>
              </div>

              {/* ===== Stats par role ===== */}
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700/50 mb-8">
                <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#25D366]" />
                    Taux de clic par role
                  </h2>
                </div>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {roleStats.map((rs) => (
                    <div key={rs.role} className="px-5 py-4 flex items-center gap-4">
                      {/* Role name */}
                      <div className="w-32 flex-shrink-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{ROLE_LABELS[rs.role]}</p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">{rs.total} inscrits</p>
                      </div>

                      {/* Progress bar */}
                      <div className="flex-1">
                        <div className="w-full h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              rs.rate >= 50 ? 'bg-[#25D366]' : rs.rate >= 20 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.max(rs.rate, 1)}%` }}
                          />
                        </div>
                      </div>

                      {/* Rate */}
                      <div className="w-20 text-right flex-shrink-0">
                        <p className={`text-lg font-bold ${
                          rs.rate >= 50 ? 'text-[#25D366]' : rs.rate >= 20 ? 'text-amber-500' : 'text-red-500'
                        }`}>
                          {rs.rate}%
                        </p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">{rs.clicked}/{rs.total}</p>
                      </div>

                      {/* Recent */}
                      <div className="w-20 text-right flex-shrink-0">
                        {rs.recentClicks > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[#25D366] font-medium">
                            <ArrowUp className="w-3 h-3" />
                            +{rs.recentClicks} (7j)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                            <ArrowDown className="w-3 h-3" />
                            0 (7j)
                          </span>
                        )}
                      </div>

                      {/* Status icon */}
                      <div className="flex-shrink-0">
                        {rs.rate >= 50 ? (
                          <CheckCircle2 className="w-5 h-5 text-[#25D366]" />
                        ) : rs.rate >= 20 ? (
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ===== Timeline 30 jours ===== */}
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700/50 mb-8">
                <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    Clics sur 30 jours
                  </h2>
                </div>
                <div className="px-5 py-4">
                  <div className="flex items-end gap-0.5 h-32">
                    {timeline.map((t, i) => {
                      const height = Math.max((t.count / maxTimelineCount) * 100, 2);
                      const isToday = i === timeline.length - 1;
                      return (
                        <div
                          key={t.date}
                          className="flex-1 group relative"
                          title={`${t.date}: ${t.count} clic${t.count !== 1 ? 's' : ''}`}
                        >
                          <div
                            className={`w-full rounded-t transition-all ${
                              isToday ? 'bg-[#25D366]' : 'bg-[#25D366]/40 group-hover:bg-[#25D366]/70'
                            }`}
                            style={{ height: `${height}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[10px] text-zinc-400">{timeline[0]?.date.slice(5)}</span>
                    <span className="text-[10px] text-zinc-400">Aujourd'hui</span>
                  </div>
                </div>
              </div>

              {/* ===== Top groupes ===== */}
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700/50">
                <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                    Top groupes par nombre de clics
                  </h2>
                </div>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {groupBreakdown.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-zinc-400">
                      Aucune donnee de clic disponible
                    </div>
                  ) : (
                    groupBreakdown.slice(0, 20).map((g, i) => (
                      <div key={g.groupId} className="px-5 py-3 flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i < 3 ? 'bg-[#25D366]/20 text-[#25D366]' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                        }`}>
                          {i + 1}
                        </span>
                        <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 font-mono truncate">
                          {g.groupId}
                        </span>
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {g.count} clic{g.count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminWhatsAppAnalytics;
