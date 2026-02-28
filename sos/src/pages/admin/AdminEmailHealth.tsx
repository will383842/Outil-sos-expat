/**
 * Admin Email Health Dashboard
 *
 * P2 FIX (2026-02-28): Dashboard for monitoring email deliverability,
 * bounces, unsubscribes, and overall email system health.
 */

import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Mail,
  AlertTriangle,
  UserMinus,
  RefreshCw,
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import AdminLayout from "../../components/admin/AdminLayout";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmailEvent {
  id: string;
  type: string;
  email: string;
  userId?: string;
  source?: string;
  timestamp: Timestamp;
}

interface BouncedUser {
  id: string;
  email: string;
  emailBounced?: boolean;
  unsubscribed?: boolean;
  emailStatus?: string;
  unsubscribedAt?: Timestamp;
}

interface Stats {
  totalUsers: number;
  bouncedCount: number;
  unsubscribedCount: number;
  invalidCount: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AdminEmailHealth: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    bouncedCount: 0,
    unsubscribedCount: 0,
    invalidCount: 0,
  });
  const [bouncedUsers, setBouncedUsers] = useState<BouncedUser[]>([]);
  const [unsubscribedUsers, setUnsubscribedUsers] = useState<BouncedUser[]>([]);
  const [recentEvents, setRecentEvents] = useState<EmailEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"bounced" | "unsubscribed" | "events">("bounced");

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Count total users
      const totalSnap = await getCountFromServer(collection(db, "users"));
      const totalUsers = totalSnap.data().count;

      // Count bounced
      const bouncedSnap = await getCountFromServer(
        query(collection(db, "users"), where("emailBounced", "==", true))
      );
      const bouncedCount = bouncedSnap.data().count;

      // Count unsubscribed
      const unsubSnap = await getCountFromServer(
        query(collection(db, "users"), where("unsubscribed", "==", true))
      );
      const unsubscribedCount = unsubSnap.data().count;

      // Count invalid
      const invalidSnap = await getCountFromServer(
        query(collection(db, "users"), where("emailStatus", "==", "invalid"))
      );
      const invalidCount = invalidSnap.data().count;

      setStats({ totalUsers, bouncedCount, unsubscribedCount, invalidCount });

      // Fetch bounced users (last 50)
      const bouncedQuery = query(
        collection(db, "users"),
        where("emailBounced", "==", true),
        limit(50)
      );
      const bouncedDocs = await getDocs(bouncedQuery);
      setBouncedUsers(
        bouncedDocs.docs.map((d) => ({ id: d.id, ...d.data() } as BouncedUser))
      );

      // Fetch unsubscribed users (last 50)
      const unsubQuery = query(
        collection(db, "users"),
        where("unsubscribed", "==", true),
        limit(50)
      );
      const unsubDocs = await getDocs(unsubQuery);
      setUnsubscribedUsers(
        unsubDocs.docs.map((d) => ({ id: d.id, ...d.data() } as BouncedUser))
      );

      // Fetch recent email events
      try {
        const eventsQuery = query(
          collection(db, "email_events"),
          orderBy("timestamp", "desc"),
          limit(50)
        );
        const eventsDocs = await getDocs(eventsQuery);
        setRecentEvents(
          eventsDocs.docs.map((d) => ({ id: d.id, ...d.data() } as EmailEvent))
        );
      } catch {
        // email_events collection may not exist yet
        setRecentEvents([]);
      }
    } catch (error) {
      console.error("[AdminEmailHealth] Error loading data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const deliverableCount =
    stats.totalUsers - stats.bouncedCount - stats.unsubscribedCount - stats.invalidCount;
  const deliverabilityRate =
    stats.totalUsers > 0
      ? Math.round((deliverableCount / stats.totalUsers) * 100)
      : 0;

  const maskEmail = (email: string) => {
    if (!email) return "—";
    const [local, domain] = email.split("@");
    if (!domain) return email.slice(0, 4) + "***";
    return local.slice(0, 3) + "***@" + domain;
  };

  const formatDate = (ts: Timestamp | undefined) => {
    if (!ts?.toDate) return "—";
    return ts.toDate().toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Sante des Emails
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Deliverabilite, bounces, desinscriptions et evenements
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              size={18}
              className={`mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Rafraichir
          </button>
        </div>

        {/* Stats Cards */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              {/* Deliverability Rate */}
              <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Deliverabilite
                    </p>
                    <p
                      className={`text-3xl font-bold mt-1 ${
                        deliverabilityRate >= 95
                          ? "text-green-600"
                          : deliverabilityRate >= 90
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {deliverabilityRate}%
                    </p>
                  </div>
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      deliverabilityRate >= 95
                        ? "bg-green-100"
                        : deliverabilityRate >= 90
                        ? "bg-yellow-100"
                        : "bg-red-100"
                    }`}
                  >
                    <Shield
                      className={`w-6 h-6 ${
                        deliverabilityRate >= 95
                          ? "text-green-600"
                          : deliverabilityRate >= 90
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Total Users */}
              <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Utilisateurs
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {stats.totalUsers.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Bounced */}
              <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Bounced
                    </p>
                    <p className="text-3xl font-bold text-red-600 mt-1">
                      {stats.bouncedCount}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>

              {/* Unsubscribed */}
              <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Desinscrits
                    </p>
                    <p className="text-3xl font-bold text-orange-600 mt-1">
                      {stats.unsubscribedCount}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <UserMinus className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>

              {/* Invalid */}
              <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Invalides
                    </p>
                    <p className="text-3xl font-bold text-yellow-600 mt-1">
                      {stats.invalidCount}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  {[
                    { key: "bounced" as const, label: `Bounced (${stats.bouncedCount})`, icon: XCircle },
                    { key: "unsubscribed" as const, label: `Desinscrits (${stats.unsubscribedCount})`, icon: UserMinus },
                    { key: "events" as const, label: `Evenements (${recentEvents.length})`, icon: CheckCircle },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 ${
                        activeTab === tab.key
                          ? "border-indigo-600 text-indigo-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <tab.icon size={16} className="mr-2" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        User ID
                      </th>
                      {activeTab === "events" ? (
                        <>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Source
                          </th>
                        </>
                      ) : (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Statut
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {activeTab === "bounced" &&
                      bouncedUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900 font-mono">
                            {maskEmail(u.email)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                            {u.id.slice(0, 12)}...
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Bounced
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">—</td>
                        </tr>
                      ))}

                    {activeTab === "unsubscribed" &&
                      unsubscribedUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900 font-mono">
                            {maskEmail(u.email)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                            {u.id.slice(0, 12)}...
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              Desinscrit
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {formatDate(u.unsubscribedAt)}
                          </td>
                        </tr>
                      ))}

                    {activeTab === "events" &&
                      recentEvents.map((ev) => (
                        <tr key={ev.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900 font-mono">
                            {maskEmail(ev.email)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                            {ev.userId ? ev.userId.slice(0, 12) + "..." : "—"}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                ev.type === "unsubscribed"
                                  ? "bg-orange-100 text-orange-800"
                                  : ev.type === "bounced"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {ev.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {ev.source || "—"}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {formatDate(ev.timestamp)}
                          </td>
                        </tr>
                      ))}

                    {/* Empty state */}
                    {((activeTab === "bounced" && bouncedUsers.length === 0) ||
                      (activeTab === "unsubscribed" && unsubscribedUsers.length === 0) ||
                      (activeTab === "events" && recentEvents.length === 0)) && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                          Aucune donnee
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminEmailHealth;
