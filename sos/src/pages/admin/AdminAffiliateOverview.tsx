/**
 * AdminAffiliateOverview — Unified Affiliate Dashboard
 *
 * Shows ALL affiliate roles in one view:
 * - Global tirelire totals (all roles combined + per role)
 * - Commission rates comparison table (default vs promo)
 * - All bonus types with conditions
 * - Live stats per role
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  Users,
  TrendingUp,
  Award,
  Target,
  Zap,
  Crown,
  Gift,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Wallet,
  PiggyBank,
  Clock,
  Star,
} from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/config/firebase";
import AdminLayout from "../../components/admin/AdminLayout";
import toast from "react-hot-toast";

// ============================================================================
// UI TOKENS (2026 glassmorphism design)
// ============================================================================

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  cardGlow: (color: string) =>
    `bg-gradient-to-br ${color} rounded-2xl shadow-lg border-0 text-white`,
  badge: {
    promo: "px-2.5 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm",
    default: "px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300",
    active: "px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
    new: "px-2.5 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white",
  },
  section: "mb-8",
  sectionTitle: "text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2",
  table: "w-full text-sm",
  th: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-white/5",
  td: "px-4 py-3 text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-white/5",
  tdHighlight: "px-4 py-3 font-semibold text-gray-900 dark:text-white border-t border-gray-100 dark:border-white/5",
};

// ============================================================================
// TYPES
// ============================================================================

interface RoleStats {
  role: string;
  label: string;
  emoji: string;
  color: string;
  count: number;
  activeCount: number;
  totalEarned: number;
  availableBalance: number;
  pendingBalance: number;
  totalWithdrawn: number;
}

// ============================================================================
// ROLE DEFINITIONS
// ============================================================================

const ROLES = [
  { id: "chatter", label: "Chatter", emoji: "💬", color: "from-blue-500 to-cyan-500", collection: "chatters" },
  { id: "influencer", label: "Influenceur", emoji: "📢", color: "from-purple-500 to-pink-500", collection: "influencers" },
  { id: "blogger", label: "Bloggeur", emoji: "✍️", color: "from-orange-500 to-red-500", collection: "bloggers" },
  { id: "groupAdmin", label: "Admin Groupe", emoji: "👥", color: "from-emerald-500 to-teal-500", collection: "group_admins" },
  { id: "affiliate", label: "Affilié (Client/Avocat/Expat)", emoji: "🔗", color: "from-indigo-500 to-violet-500", collection: "users" },
];

// ============================================================================
// COMMISSION RATES TABLE DATA
// ============================================================================

const COMMISSION_TABLE = {
  sections: [
    {
      title: "Commissions par appel client (via lien affilié)",
      icon: <DollarSign className="w-5 h-5" />,
      rows: [
        { label: "Appel client (avocat)", chatter: "$5", influencer: "$5", blogger: "$5", groupAdmin: "$5", affiliate: "$5", promo: "$10", note: "Override fixedAmountLawyer" },
        { label: "Appel client (expat)", chatter: "$3", influencer: "$3", blogger: "$3", groupAdmin: "$3", affiliate: "$3", promo: "$10", note: "Override fixedAmountExpat" },
        { label: "Appel client (fallback)", chatter: "$5", influencer: "$5", blogger: "$5", groupAdmin: "$5", affiliate: "50%/20%", promo: "$10", note: "Quand providerType inconnu" },
      ],
    },
    {
      title: "Commissions prestataires recrutés (à vie)",
      icon: <Users className="w-5 h-5" />,
      rows: [
        { label: "Appel presta recruté (avocat)", chatter: "$5", influencer: "$5", blogger: "$5", groupAdmin: "—", affiliate: "—", promo: "$5", note: "Inchangé en promo" },
        { label: "Appel presta recruté (expat)", chatter: "$3", influencer: "$3", blogger: "$3", groupAdmin: "—", affiliate: "—", promo: "$3", note: "Inchangé en promo" },
        { label: "Durée lien recrutement", chatter: "6 mois", influencer: "6 mois", blogger: "6 mois", groupAdmin: "—", affiliate: "—", promo: "6 mois", note: "" },
      ],
    },
    {
      title: "Réseau MLM (N1/N2) — Tous les rôles",
      icon: <TrendingUp className="w-5 h-5" />,
      rows: [
        { label: "N1 (appel filleul direct)", chatter: "$1", influencer: "$1", blogger: "$1", groupAdmin: "$1", affiliate: "$1", promo: "$1", note: "Par appel du filleul" },
        { label: "N2 (appel filleul indirect)", chatter: "$0.50", influencer: "$0.50", blogger: "$0.50", groupAdmin: "$0.50", affiliate: "$0.50", promo: "$0.50", note: "Par appel du grand-filleul" },
        { label: "Bonus activation", chatter: "$5", influencer: "$5", blogger: "$5", groupAdmin: "$5", affiliate: "$5", promo: "$5", note: "Après 2e appel du filleul" },
        { label: "Bonus recrutement N1", chatter: "$1", influencer: "$1", blogger: "$1", groupAdmin: "$1", affiliate: "$1", promo: "$1", note: "Quand N1 recrute quelqu'un qui s'active" },
      ],
    },
    {
      title: "Captain Chatter (exclusif)",
      icon: <Crown className="w-5 h-5" />,
      rows: [
        { label: "Captain call (avocat)", chatter: "$2", influencer: "—", blogger: "—", groupAdmin: "—", affiliate: "—", promo: "$2", note: "Appels chatters sous responsabilité" },
        { label: "Captain call (expat)", chatter: "$1", influencer: "—", blogger: "—", groupAdmin: "—", affiliate: "—", promo: "$1", note: "" },
        { label: "Bronze (20+ appels)", chatter: "$25", influencer: "—", blogger: "—", groupAdmin: "—", affiliate: "—", promo: "$25", note: "20 appels équipe/mois" },
        { label: "Argent (50+ appels)", chatter: "$50", influencer: "—", blogger: "—", groupAdmin: "—", affiliate: "—", promo: "$50", note: "50 appels/mois" },
        { label: "Or (100+ appels)", chatter: "$100", influencer: "—", blogger: "—", groupAdmin: "—", affiliate: "—", promo: "$100", note: "100 appels/mois" },
        { label: "Platine (200+ appels)", chatter: "$200", influencer: "—", blogger: "—", groupAdmin: "—", affiliate: "—", promo: "$200", note: "200 appels/mois" },
        { label: "Diamant (400+ appels)", chatter: "$400", influencer: "—", blogger: "—", groupAdmin: "—", affiliate: "—", promo: "$400", note: "400 appels/mois" },
      ],
    },
  ],
};

const BONUSES_AND_CONDITIONS = [
  {
    title: "Milestones recrutement — Tous les rôles",
    icon: <Target className="w-5 h-5" />,
    items: [
      { milestone: "5 recrues", bonus: "$15", condition: "5 filleuls actifs inscrits via lien recrutement" },
      { milestone: "10 recrues", bonus: "$35", condition: "10 filleuls actifs" },
      { milestone: "20 recrues", bonus: "$75", condition: "20 filleuls actifs" },
      { milestone: "50 recrues", bonus: "$250", condition: "50 filleuls actifs" },
      { milestone: "100 recrues", bonus: "$600", condition: "100 filleuls actifs" },
      { milestone: "500 recrues", bonus: "$4,000", condition: "500 filleuls actifs" },
    ],
  },
  {
    title: "Top 3 mensuel cross-rôle",
    icon: <Star className="w-5 h-5" />,
    items: [
      { milestone: "1ère place", bonus: "$200", condition: "$100+ commissions directes (client) dans le mois + 3+ nouveaux recrutements" },
      { milestone: "2e place", bonus: "$100", condition: "Idem — classé sur total commissions directes du mois" },
      { milestone: "3e place", bonus: "$50", condition: "Idem — calculé le 1er du mois à 01:00 UTC" },
    ],
  },
  {
    title: "Conditions d'activation du bonus",
    icon: <Zap className="w-5 h-5" />,
    items: [
      { milestone: "Activation filleul", bonus: "$5", condition: "Le filleul doit faire 2 appels clients dont le paiement a été capturé" },
      { milestone: "Condition recruteur", bonus: "—", condition: "Le recruteur doit avoir gagné $100+ en commissions directes (client) dans le mois en cours" },
      { milestone: "Bonus N1 recrut.", bonus: "$1", condition: "Quand ton filleul N1 recrute quelqu'un qui s'active (2 appels payés)" },
    ],
  },
];

const PARAMS_TABLE = [
  { param: "Retrait minimum", value: "$30 (tous rôles)" },
  { param: "Frais de retrait", value: "$3 fixe par transaction" },
  { param: "Attribution (cookie)", value: "30 jours" },
  { param: "Hold period", value: "24h (unifié tous rôles)" },
  { param: "Release delay", value: "24h après validation" },
  { param: "Réduction client (Influenceur)", value: "$5 fixe" },
  { param: "Réduction client (GroupAdmin)", value: "$5 fixe" },
  { param: "Réduction client (autres rôles)", value: "$0" },
  { param: "Durée min appel (anti-fraude)", value: "Basé sur paiement capturé (pas durée)" },
];

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

function GlowCard({
  icon,
  value,
  label,
  color,
  sub,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
  sub?: string;
}) {
  return (
    <div className={UI.cardGlow(color) + " p-5"}>
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 bg-white/20 rounded-xl">{icon}</div>
        {sub && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{sub}</span>}
      </div>
      <div className="text-2xl font-black tracking-tight">{value}</div>
      <div className="text-sm text-white/80 mt-1">{label}</div>
    </div>
  );
}

function RoleCard({ stat, onClick }: { stat: RoleStats; onClick: () => void }) {
  const role = ROLES.find((r) => r.id === stat.role);
  return (
    <button onClick={onClick} className={UI.card + " p-4 text-left hover:scale-[1.02] transition-transform cursor-pointer w-full"}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{role?.emoji}</span>
        <span className="font-bold text-gray-900 dark:text-white text-sm">{stat.label}</span>
        <span className={UI.badge.active}>{stat.activeCount} actifs</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-gray-500 dark:text-gray-400">Tirelire</div>
          <div className="font-bold text-emerald-600 dark:text-emerald-400">${(stat.availableBalance / 100).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-gray-500 dark:text-gray-400">En attente</div>
          <div className="font-bold text-amber-600 dark:text-amber-400">${(stat.pendingBalance / 100).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-gray-500 dark:text-gray-400">Total gagné</div>
          <div className="font-bold text-gray-900 dark:text-white">${(stat.totalEarned / 100).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-gray-500 dark:text-gray-400">Retiré</div>
          <div className="font-bold text-gray-600 dark:text-gray-300">${(stat.totalWithdrawn / 100).toLocaleString()}</div>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdminAffiliateOverview() {
  const [loading, setLoading] = useState(true);
  const [roleStats, setRoleStats] = useState<RoleStats[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Fetch live stats from all collections
  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const stats: RoleStats[] = [];

      for (const role of ROLES) {
        try {
          let snap;
          if (role.id === "affiliate") {
            // Generic affiliates: users with affiliateCode
            snap = await getDocs(
              query(collection(db, role.collection), where("affiliateCode", "!=", null))
            );
          } else {
            snap = await getDocs(collection(db, role.collection));
          }

          let totalEarned = 0;
          let availableBalance = 0;
          let pendingBalance = 0;
          let totalWithdrawn = 0;
          let activeCount = 0;

          snap.forEach((doc) => {
            const d = doc.data();
            totalEarned += d.totalEarned || 0;
            availableBalance += d.availableBalance || 0;
            pendingBalance += (d.pendingBalance || 0) + (d.validatedBalance || 0);
            totalWithdrawn += d.totalWithdrawn || 0;
            if (d.status === "active") activeCount++;
          });

          stats.push({
            role: role.id,
            label: role.label,
            emoji: role.emoji,
            color: role.color,
            count: snap.size,
            activeCount,
            totalEarned,
            availableBalance,
            pendingBalance,
            totalWithdrawn,
          });
        } catch (err) {
          console.warn(`Failed to fetch ${role.id}:`, err);
          stats.push({
            role: role.id,
            label: role.label,
            emoji: role.emoji,
            color: role.color,
            count: 0,
            activeCount: 0,
            totalEarned: 0,
            availableBalance: 0,
            pendingBalance: 0,
            totalWithdrawn: 0,
          });
        }
      }

      setRoleStats(stats);
    } catch (err) {
      toast.error("Erreur lors du chargement des stats");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Aggregates
  const totalTirelire = roleStats.reduce((s, r) => s + r.availableBalance, 0);
  const totalPending = roleStats.reduce((s, r) => s + r.pendingBalance, 0);
  const totalEarned = roleStats.reduce((s, r) => s + r.totalEarned, 0);
  const totalWithdrawn = roleStats.reduce((s, r) => s + r.totalWithdrawn, 0);
  const totalAffiliates = roleStats.reduce((s, r) => s + r.count, 0);
  const totalActive = roleStats.reduce((s, r) => s + r.activeCount, 0);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Vue d'ensemble Affiliés
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Tous les rôles — Temps réel
            </p>
          </div>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium text-sm hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/25"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Rafraîchir
          </button>
        </div>

        {/* ============================================================ */}
        {/* GLOBAL TIRELIRE CARDS */}
        {/* ============================================================ */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <GlowCard
            icon={<PiggyBank className="w-5 h-5" />}
            value={`$${(totalTirelire / 100).toLocaleString()}`}
            label="Tirelire totale"
            color="from-emerald-500 to-green-600"
            sub="Tous rôles"
          />
          <GlowCard
            icon={<Clock className="w-5 h-5" />}
            value={`$${(totalPending / 100).toLocaleString()}`}
            label="En attente"
            color="from-amber-500 to-orange-500"
          />
          <GlowCard
            icon={<TrendingUp className="w-5 h-5" />}
            value={`$${(totalEarned / 100).toLocaleString()}`}
            label="Total gagné"
            color="from-blue-500 to-cyan-500"
          />
          <GlowCard
            icon={<Wallet className="w-5 h-5" />}
            value={`$${(totalWithdrawn / 100).toLocaleString()}`}
            label="Total retiré"
            color="from-violet-500 to-purple-600"
          />
          <GlowCard
            icon={<Users className="w-5 h-5" />}
            value={totalAffiliates.toLocaleString()}
            label="Affiliés total"
            color="from-gray-600 to-gray-800"
            sub={`${totalActive} actifs`}
          />
          <GlowCard
            icon={<Award className="w-5 h-5" />}
            value={`$${((totalEarned - totalWithdrawn) / 100).toLocaleString()}`}
            label="Encore en circulation"
            color="from-rose-500 to-pink-600"
          />
        </div>

        {/* ============================================================ */}
        {/* PER-ROLE CARDS */}
        {/* ============================================================ */}
        <div className={UI.section}>
          <h2 className={UI.sectionTitle}>
            <DollarSign className="w-5 h-5 text-emerald-500" />
            Tirelires par rôle
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {roleStats.map((stat) => (
              <RoleCard key={stat.role} stat={stat} onClick={() => {}} />
            ))}
          </div>
        </div>

        {/* ============================================================ */}
        {/* COMMISSION RATES COMPARISON TABLE */}
        {/* ============================================================ */}
        {COMMISSION_TABLE.sections.map((section, idx) => {
          const key = `commission-${idx}`;
          const isExpanded = expandedSections[key] !== false; // default open
          return (
            <div key={key} className={UI.card + " overflow-hidden"}>
              <button
                onClick={() => toggleSection(key)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors"
              >
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  {section.icon}
                  {section.title}
                </h3>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className={UI.table}>
                    <thead>
                      <tr>
                        <th className={UI.th}>Commission</th>
                        <th className={UI.th}>💬 Chatter</th>
                        <th className={UI.th}>📢 Influenceur</th>
                        <th className={UI.th}>✍️ Bloggeur</th>
                        <th className={UI.th}>👥 GroupAdmin</th>
                        <th className={UI.th}>🔗 Affilié</th>
                        <th className={UI.th}>
                          <span className={UI.badge.promo}>PROMO</span>
                        </th>
                        <th className={UI.th}>Condition</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                          <td className={UI.tdHighlight}>{row.label}</td>
                          <td className={UI.td}>{row.chatter}</td>
                          <td className={UI.td}>{row.influencer}</td>
                          <td className={UI.td}>{row.blogger}</td>
                          <td className={UI.td}>{row.groupAdmin}</td>
                          <td className={UI.td}>{row.affiliate}</td>
                          <td className={UI.td}>
                            <span className="font-bold text-amber-600 dark:text-amber-400">{row.promo}</span>
                          </td>
                          <td className={UI.td + " text-xs text-gray-500 dark:text-gray-400 max-w-[200px]"}>{row.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {/* ============================================================ */}
        {/* BONUSES & CONDITIONS */}
        {/* ============================================================ */}
        {BONUSES_AND_CONDITIONS.map((section, idx) => {
          const key = `bonus-${idx}`;
          const isExpanded = expandedSections[key] !== false;
          return (
            <div key={key} className={UI.card + " overflow-hidden"}>
              <button
                onClick={() => toggleSection(key)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors"
              >
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  {section.icon}
                  {section.title}
                  <span className={UI.badge.new}>TOUS RÔLES</span>
                </h3>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className={UI.table}>
                    <thead>
                      <tr>
                        <th className={UI.th}>Palier / Bonus</th>
                        <th className={UI.th}>Montant</th>
                        <th className={UI.th}>Condition pour déclencher</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.items.map((item, iIdx) => (
                        <tr key={iIdx} className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                          <td className={UI.tdHighlight}>{item.milestone}</td>
                          <td className={UI.td}>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{item.bonus}</span>
                          </td>
                          <td className={UI.td + " text-xs text-gray-600 dark:text-gray-400"}>{item.condition}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {/* ============================================================ */}
        {/* COMMON PARAMETERS */}
        {/* ============================================================ */}
        <div className={UI.card + " overflow-hidden"}>
          <div className="px-5 py-4">
            <h3 className={UI.sectionTitle}>
              <Gift className="w-5 h-5 text-indigo-500" />
              Paramètres communs
            </h3>
          </div>
          <table className={UI.table}>
            <thead>
              <tr>
                <th className={UI.th}>Paramètre</th>
                <th className={UI.th}>Valeur</th>
              </tr>
            </thead>
            <tbody>
              {PARAMS_TABLE.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                  <td className={UI.tdHighlight}>{row.param}</td>
                  <td className={UI.td}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ============================================================ */}
        {/* COMMISSION LIFECYCLE */}
        {/* ============================================================ */}
        <div className={UI.card + " p-6"}>
          <h3 className={UI.sectionTitle}>
            <Zap className="w-5 h-5 text-amber-500" />
            Cycle de vie des commissions (uniforme, tous rôles)
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-500/20 rounded-xl">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span className="font-medium text-blue-700 dark:text-blue-300">Appel payé</span>
            </div>
            <span className="text-gray-400">→</span>
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-500/20 rounded-xl">
              <div className="w-3 h-3 bg-amber-500 rounded-full" />
              <span className="font-medium text-amber-700 dark:text-amber-300">Pending</span>
              <span className="text-xs text-amber-600/70">(48h-7j)</span>
            </div>
            <span className="text-gray-400">→</span>
            <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-500/20 rounded-xl">
              <div className="w-3 h-3 bg-purple-500 rounded-full" />
              <span className="font-medium text-purple-700 dark:text-purple-300">Validé</span>
              <span className="text-xs text-purple-600/70">(+24h)</span>
            </div>
            <span className="text-gray-400">→</span>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/20 rounded-xl">
              <div className="w-3 h-3 bg-emerald-500 rounded-full" />
              <span className="font-medium text-emerald-700 dark:text-emerald-300">Disponible (Tirelire)</span>
            </div>
            <span className="text-gray-400">→</span>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/10 rounded-xl">
              <div className="w-3 h-3 bg-gray-500 rounded-full" />
              <span className="font-medium text-gray-700 dark:text-gray-300">Retiré</span>
              <span className="text-xs text-gray-500">(min $30, -$3 frais)</span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
