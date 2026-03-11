import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import toast from 'react-hot-toast';
import {
  Users, Search, ChevronDown, ChevronRight, Crown, AlertTriangle,
  UserCheck, ArrowRight, GitBranch, RefreshCw, Loader2,
  Shield, Eye, CheckSquare, Square, AlertCircle, Clock, Activity,
  X, Zap
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  input: "w-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all",
  badge: {
    active: "px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
    suspended: "px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
    banned: "px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
    inactive: "px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400",
    captain: "px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
  },
};

// Types matching backend response
interface ChatterTreeNode {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  role?: string;
  lastLoginAt: string | null;
  recruitedBy: string | null;
  recruitedByName: string | null;
  captainId: string | null;
  captainName: string | null;
  totalEarned: number;
  availableBalance: number;
  affiliateCodeClient: string;
  affiliateCodeRecruitment: string;
  qualifiedReferralsCount: number;
  referralsN2Count: number;
  registeredAt: string | null;
  children: ChatterTreeNode[];
}

interface CaptainTeam {
  captain: ChatterTreeNode;
  members: ChatterTreeNode[];
  stats: {
    totalMembers: number;
    activeMembers: number;
    percentActive: number;
    connectedLast7d: number;
    connectedLast30d: number;
    percentConnected7d: number;
    totalTeamEarnings: number;
    monthlyTeamCalls: number;
    tier: string | null;
  };
}

interface HierarchyAlert {
  type: string;
  severity: 'warning' | 'danger' | 'info';
  chatterId: string;
  chatterName: string;
  captainId?: string;
  captainName?: string;
  message: string;
}

interface HierarchyData {
  globalStats: {
    totalChatters: number;
    totalCaptains: number;
    totalActive: number;
    totalInactive: number;
    percentActive: number;
    totalBanned: number;
    totalSuspended: number;
    connectedLast7d: number;
    connectedLast30d: number;
    percentConnected7d: number;
    percentConnected30d: number;
    totalOrphans: number;
    totalWithoutParent: number;
    totalEarningsAllTime: number;
  };
  captainTeams: CaptainTeam[];
  orphans: ChatterTreeNode[];
  alerts: HierarchyAlert[];
}

// Format cents to dollars
const formatUSD = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// Time ago helper
const timeAgo = (isoDate: string | null): string => {
  if (!isoDate) return 'Jamais';
  const d = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return "Aujourd\u2019hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `${diffDays}j`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} sem`;
  return `${Math.floor(diffDays / 30)} mois`;
};

// ===================== TREE NODE COMPONENT =====================
const TreeNode: React.FC<{
  node: ChatterTreeNode;
  depth: number;
  expanded: Set<string>;
  toggleExpand: (id: string) => void;
  selected: Set<string>;
  toggleSelect: (id: string) => void;
  onTransfer: (node: ChatterTreeNode) => void;
  onViewDetail: (node: ChatterTreeNode) => void;
  allCaptains: ChatterTreeNode[];
}> = ({ node, depth, expanded, toggleExpand, selected, toggleSelect, onTransfer, onViewDetail }) => {
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children.length > 0;
  const isSelected = selected.has(node.id);
  const isCaptain = node.role === 'captainChatter';
  const isInactive7d = node.lastLoginAt && (new Date().getTime() - new Date(node.lastLoginAt).getTime()) > 7 * 24 * 60 * 60 * 1000;
  const isInactive30d = node.lastLoginAt && (new Date().getTime() - new Date(node.lastLoginAt).getTime()) > 30 * 24 * 60 * 60 * 1000;
  const neverLoggedIn = !node.lastLoginAt;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 group transition-colors ${
          isSelected ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''
        }`}
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
      >
        {/* Expand/collapse */}
        {hasChildren ? (
          <button onClick={() => toggleExpand(node.id)} className="p-0.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded">
            {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Checkbox */}
        <button onClick={() => toggleSelect(node.id)} className="p-0.5">
          {isSelected ? <CheckSquare className="h-4 w-4 text-indigo-600" /> : <Square className="h-4 w-4 text-gray-300" />}
        </button>

        {/* Icon */}
        {isCaptain ? (
          <Crown className="h-4 w-4 text-purple-500 flex-shrink-0" />
        ) : (
          <Users className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        )}

        {/* Name */}
        <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
          {node.firstName} {node.lastName}
        </span>

        {/* Status badge */}
        <span className={
          node.status === 'active' ? UI.badge.active :
          node.status === 'suspended' ? UI.badge.suspended :
          node.status === 'banned' ? UI.badge.banned : UI.badge.inactive
        }>
          {node.status}
        </span>

        {/* Captain badge */}
        {isCaptain && <span className={UI.badge.captain}>Captain</span>}

        {/* Inactivity warning */}
        {node.status === 'active' && (neverLoggedIn || isInactive30d) && (
          <span title="Inactif >30j"><AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" /></span>
        )}
        {node.status === 'active' && !neverLoggedIn && !isInactive30d && isInactive7d && (
          <span title="Inactif >7j"><Clock className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" /></span>
        )}

        {/* Stats (compact) */}
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          {node.qualifiedReferralsCount > 0 && (
            <span title="Filleuls N1">{node.qualifiedReferralsCount} N1</span>
          )}
          {node.referralsN2Count > 0 && (
            <span title="Filleuls N2">{node.referralsN2Count} N2</span>
          )}
          <span title="Gains totaux">{formatUSD(node.totalEarned)}</span>
          <span title="Derni\u00e8re connexion">{timeAgo(node.lastLoginAt)}</span>
        </span>

        {/* Actions (visible on hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onTransfer(node)}
            className="p-1 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded"
            title="Transf\u00e9rer"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onViewDetail(node)}
            className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded"
            title="Voir d\u00e9tail"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Children */}
      {isExpanded && node.children.map(child => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          toggleExpand={toggleExpand}
          selected={selected}
          toggleSelect={toggleSelect}
          onTransfer={onTransfer}
          onViewDetail={onViewDetail}
          allCaptains={[]}
        />
      ))}
    </div>
  );
};

// ===================== MAIN COMPONENT =====================
const AdminChatterHierarchy: React.FC = () => {
  const [data, setData] = useState<HierarchyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'captains' | 'orphans' | 'active' | 'inactive'>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAlerts, setShowAlerts] = useState(true);

  // Transfer modal
  const [transferModal, setTransferModal] = useState<{ chatter: ChatterTreeNode } | null>(null);
  const [transferNewCaptain, setTransferNewCaptain] = useState('');
  const [transferNewParent, setTransferNewParent] = useState('');
  const [transferParentSearch, setTransferParentSearch] = useState('');
  const [transferParentDropdownOpen, setTransferParentDropdownOpen] = useState(false);
  const [transferReason, setTransferReason] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  // Bulk transfer modal
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkCaptain, setBulkCaptain] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);

  // Fetch hierarchy data
  const fetchHierarchy = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminGetChatterHierarchy');
      const result = await fn({});
      setData(result.data as HierarchyData);
      // Auto-expand captains
      const captainIds = new Set((result.data as HierarchyData).captainTeams.map(t => t.captain.id));
      setExpanded(captainIds);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
      toast.error('Erreur de chargement de la hi\u00e9rarchie');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHierarchy(); }, [fetchHierarchy]);

  // Toggle expand
  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Toggle select
  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Expand all / collapse all
  const expandAll = useCallback(() => {
    if (!data) return;
    const allIds = new Set<string>();
    const addIds = (nodes: ChatterTreeNode[]) => {
      nodes.forEach(n => { allIds.add(n.id); addIds(n.children); });
    };
    data.captainTeams.forEach(t => { allIds.add(t.captain.id); t.members.forEach(m => { allIds.add(m.id); addIds(m.children); }); });
    data.orphans.forEach(o => { allIds.add(o.id); addIds(o.children); });
    setExpanded(allIds);
  }, [data]);

  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  // All captains list (for dropdowns)
  const allCaptains = useMemo(() => {
    if (!data) return [];
    return data.captainTeams.map(t => t.captain);
  }, [data]);

  // All chatters flat list (for parent search)
  const allChattersList = useMemo(() => {
    if (!data) return [];
    const chatters: ChatterTreeNode[] = [];
    const addNode = (n: ChatterTreeNode) => {
      chatters.push(n);
      n.children.forEach(addNode);
    };
    data.captainTeams.forEach(t => {
      addNode(t.captain);
      t.members.forEach(addNode);
    });
    data.orphans.forEach(addNode);
    // Deduplicate by id
    const seen = new Set<string>();
    return chatters.filter(c => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [data]);

  // Handle individual transfer
  const handleTransfer = async () => {
    if (!transferModal) return;
    if (!transferNewCaptain && !transferNewParent) {
      toast.error('S\u00e9lectionnez un nouveau capitaine ou parrain');
      return;
    }
    setTransferLoading(true);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminReassignChatter');
      const payload: Record<string, unknown> = { chatterId: transferModal.chatter.id, reason: transferReason || 'Transfert admin' };
      if (transferNewCaptain && transferNewCaptain !== '__remove__') payload.newCaptainId = transferNewCaptain;
      if (transferNewCaptain === '__remove__') payload.newCaptainId = null;
      if (transferNewParent) payload.newRecruitedBy = transferNewParent;
      await fn(payload);
      toast.success('Chatter transf\u00e9r\u00e9 avec succ\u00e8s');
      setTransferModal(null);
      setTransferNewCaptain('');
      setTransferNewParent('');
      setTransferParentSearch('');
      setTransferParentDropdownOpen(false);
      setTransferReason('');
      fetchHierarchy();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du transfert');
    } finally {
      setTransferLoading(false);
    }
  };

  // Handle bulk transfer
  const handleBulkTransfer = async () => {
    if (!bulkCaptain) {
      toast.error('S\u00e9lectionnez un capitaine cible');
      return;
    }
    setBulkLoading(true);
    setBulkProgress(0);
    const ids = Array.from(selected);
    let success = 0;
    let errors = 0;
    for (let i = 0; i < ids.length; i++) {
      try {
        const fn = httpsCallable(functionsAffiliate, 'adminReassignChatter');
        await fn({ chatterId: ids[i], newCaptainId: bulkCaptain, reason: bulkReason || 'Transfert bulk admin' });
        success++;
      } catch {
        errors++;
      }
      setBulkProgress(Math.round(((i + 1) / ids.length) * 100));
    }
    toast.success(`${success} transf\u00e9r\u00e9(s), ${errors} erreur(s)`);
    setBulkModal(false);
    setBulkCaptain('');
    setBulkReason('');
    setSelected(new Set());
    fetchHierarchy();
    setBulkLoading(false);
  };

  // View detail
  const onViewDetail = (node: ChatterTreeNode) => {
    window.open(`/admin/chatters/${node.id}`, '_blank');
  };

  // Search filter helper (must be defined BEFORE useMemo that uses it)
  const matchesSearch = useCallback((node: ChatterTreeNode): boolean => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      node.firstName.toLowerCase().includes(q) ||
      node.lastName.toLowerCase().includes(q) ||
      node.email.toLowerCase().includes(q) ||
      node.id.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Filtered data (search + filter)
  const filteredTeams = useMemo(() => {
    if (!data) return [];
    if (filter === 'orphans') return [];
    if (!searchQuery) return data.captainTeams;
    // Filter teams: keep team if captain matches OR any member matches
    return data.captainTeams
      .map(team => {
        const captainMatches = matchesSearch(team.captain);
        const filteredMembers = team.members.filter(m => matchesSearch(m));
        if (captainMatches || filteredMembers.length > 0) {
          return searchQuery ? { ...team, members: captainMatches ? team.members : filteredMembers } : team;
        }
        return null;
      })
      .filter((t): t is CaptainTeam => t !== null);
  }, [data, filter, searchQuery, matchesSearch]);

  const filteredOrphans = useMemo(() => {
    if (!data) return [];
    if (filter === 'captains') return [];
    if (!searchQuery) return data.orphans;
    return data.orphans.filter(o => matchesSearch(o));
  }, [data, filter, searchQuery, matchesSearch]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <span className="ml-3 text-gray-500">Chargement de la hi\u00e9rarchie...</span>
        </div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout>
        <div className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-600">{error || 'Erreur inconnue'}</p>
          <button onClick={fetchHierarchy} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm">R\u00e9essayer</button>
        </div>
      </AdminLayout>
    );
  }

  const { globalStats } = data;

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <GitBranch className="h-7 w-7 text-indigo-500" />
              Hi\u00e9rarchie des Chatters
            </h1>
            <p className="text-sm text-gray-500 mt-1">{globalStats.totalChatters} chatters, {globalStats.totalCaptains} capitaines</p>
          </div>
          <div className="flex gap-2">
            <button onClick={expandAll} className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-white/10 rounded-lg hover:bg-gray-200">Tout d\u00e9plier</button>
            <button onClick={collapseAll} className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-white/10 rounded-lg hover:bg-gray-200">Tout replier</button>
            <button onClick={fetchHierarchy} className="p-2 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 rounded-xl hover:bg-indigo-200">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Chatters', value: globalStats.totalChatters, icon: Users, color: 'text-blue-500' },
            { label: 'Actifs', value: `${globalStats.totalActive} (${globalStats.percentActive}%)`, icon: UserCheck, color: 'text-green-500' },
            { label: 'Connect\u00e9s <7j', value: `${globalStats.connectedLast7d} (${globalStats.percentConnected7d}%)`, icon: Activity, color: 'text-cyan-500' },
            { label: 'Orphelins', value: globalStats.totalOrphans, icon: AlertTriangle, color: globalStats.totalOrphans > 0 ? 'text-orange-500' : 'text-gray-400' },
            { label: 'Capitaines', value: globalStats.totalCaptains, icon: Crown, color: 'text-purple-500' },
            { label: 'Suspendus', value: globalStats.totalSuspended, icon: Shield, color: 'text-yellow-500' },
            { label: 'Connect\u00e9s <30j', value: `${globalStats.connectedLast30d} (${globalStats.percentConnected30d}%)`, icon: Clock, color: 'text-teal-500' },
            { label: 'Gains totaux', value: formatUSD(globalStats.totalEarningsAllTime), icon: Zap, color: 'text-emerald-500' },
          ].map((kpi, i) => (
            <div key={i} className={UI.card + " p-3"}>
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                <span className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {data.alerts.length > 0 && (
          <div className={UI.card + " p-4"}>
            <button onClick={() => setShowAlerts(!showAlerts)} className="flex items-center gap-2 w-full">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {data.alerts.length} alertes
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 ml-auto transition-transform ${showAlerts ? '' : '-rotate-90'}`} />
            </button>
            {showAlerts && (
              <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                {data.alerts.slice(0, 20).map((alert, i) => (
                  <div key={i} className={`flex items-center gap-2 text-xs py-1 px-2 rounded ${
                    alert.severity === 'danger' ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400' :
                    alert.severity === 'warning' ? 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' :
                    'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'
                  }`}>
                    {alert.severity === 'danger' ? <AlertCircle className="h-3 w-3 flex-shrink-0" /> :
                     alert.severity === 'warning' ? <AlertTriangle className="h-3 w-3 flex-shrink-0" /> :
                     <Clock className="h-3 w-3 flex-shrink-0" />}
                    <span className="font-medium">{alert.chatterName}</span>
                    <span className="text-gray-400">&mdash;</span>
                    <span>{alert.message}</span>
                  </div>
                ))}
                {data.alerts.length > 20 && (
                  <p className="text-xs text-gray-400 text-center py-1">+ {data.alerts.length - 20} alertes supplementaires</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Search + Filters + Bulk Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, email ou ID..."
              className={UI.input + " pl-10"}
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'captains', 'orphans'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 text-xs rounded-lg transition-colors ${
                  filter === f ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-medium' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
              >
                {f === 'all' ? 'Tous' : f === 'captains' ? 'Capitaines' : 'Orphelins'}
              </button>
            ))}
          </div>
          {selected.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-indigo-600 font-medium">{selected.size} s\u00e9lectionn\u00e9(s)</span>
              <button
                onClick={() => setBulkModal(true)}
                className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1"
              >
                <ArrowRight className="h-3 w-3" /> Transf\u00e9rer
              </button>
              <button onClick={() => setSelected(new Set())} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Tree View */}
        <div className={UI.card + " p-4"}>
          {/* Captain Teams */}
          {filteredTeams.map(team => (
            <div key={team.captain.id} className="mb-4">
              {/* Captain header */}
              <div
                className="flex items-center gap-2 py-2 px-3 bg-purple-50/50 dark:bg-purple-500/5 rounded-xl mb-1 cursor-pointer"
                onClick={() => toggleExpand(team.captain.id)}
              >
                {expanded.has(team.captain.id) ? <ChevronDown className="h-5 w-5 text-purple-400" /> : <ChevronRight className="h-5 w-5 text-purple-400" />}
                <Crown className="h-5 w-5 text-purple-500" />
                <span className="font-semibold text-sm text-gray-900 dark:text-white">
                  {team.captain.firstName} {team.captain.lastName}
                </span>
                <span className={UI.badge.captain}>{team.stats.tier || 'Captain'}</span>
                <span className="text-xs text-gray-400 ml-auto flex items-center gap-4">
                  <span>{team.stats.totalMembers} membres</span>
                  <span>{team.stats.percentActive}% actifs</span>
                  <span>{team.stats.connectedLast7d} connect\u00e9s &lt;7j</span>
                  <span>{formatUSD(team.stats.totalTeamEarnings)}</span>
                </span>
              </div>

              {/* Team members */}
              {expanded.has(team.captain.id) && (
                <div className="ml-2 border-l-2 border-purple-100 dark:border-purple-500/20 pl-2">
                  {team.members.map(member => (
                    <TreeNode
                      key={member.id}
                      node={member}
                      depth={1}
                      expanded={expanded}
                      toggleExpand={toggleExpand}
                      selected={selected}
                      toggleSelect={toggleSelect}
                      onTransfer={(n) => setTransferModal({ chatter: n })}
                      onViewDetail={onViewDetail}
                      allCaptains={allCaptains}
                    />
                  ))}
                  {team.members.length === 0 && (
                    <p className="text-xs text-gray-400 py-2 pl-8">Aucun membre dans cette \u00e9quipe</p>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Orphans section */}
          {filteredOrphans.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
              <div
                className="flex items-center gap-2 py-2 px-3 bg-orange-50/50 dark:bg-orange-500/5 rounded-xl mb-1 cursor-pointer"
                onClick={() => toggleExpand('__orphans__')}
              >
                {expanded.has('__orphans__') ? <ChevronDown className="h-5 w-5 text-orange-400" /> : <ChevronRight className="h-5 w-5 text-orange-400" />}
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span className="font-semibold text-sm text-gray-900 dark:text-white">
                  Orphelins &mdash; Sans capitaine
                </span>
                <span className="text-xs text-orange-500 ml-2">{filteredOrphans.length} chatters</span>
              </div>
              {expanded.has('__orphans__') && (
                <div className="ml-2 border-l-2 border-orange-100 dark:border-orange-500/20 pl-2">
                  {filteredOrphans.map(orphan => (
                    <TreeNode
                      key={orphan.id}
                      node={orphan}
                      depth={1}
                      expanded={expanded}
                      toggleExpand={toggleExpand}
                      selected={selected}
                      toggleSelect={toggleSelect}
                      onTransfer={(n) => setTransferModal({ chatter: n })}
                      onViewDetail={onViewDetail}
                      allCaptains={allCaptains}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* TRANSFER MODAL */}
        {transferModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Transf\u00e9rer un chatter</h3>
              <p className="text-sm text-gray-500 mb-4">
                {transferModal.chatter.firstName} {transferModal.chatter.lastName}
              </p>

              {/* Warnings */}
              <div className="space-y-2 mb-4">
                {transferModal.chatter.recruitedBy && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg text-xs text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    Parrain actuel : {transferModal.chatter.recruitedByName || transferModal.chatter.recruitedBy}
                  </div>
                )}
                {transferModal.chatter.captainId && (
                  <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-500/10 rounded-lg text-xs text-purple-700 dark:text-purple-400">
                    <Crown className="h-4 w-4 flex-shrink-0" />
                    Capitaine actuel : {transferModal.chatter.captainName || transferModal.chatter.captainId}
                  </div>
                )}
                {transferModal.chatter.qualifiedReferralsCount > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-500/10 rounded-lg text-xs text-red-700 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    Ce chatter a {transferModal.chatter.qualifiedReferralsCount} filleul(s) N1 &mdash; leur parrain N2 sera recalcul\u00e9
                  </div>
                )}
              </div>

              {/* New Captain dropdown */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nouveau capitaine</label>
                <select
                  value={transferNewCaptain}
                  onChange={e => setTransferNewCaptain(e.target.value)}
                  className={UI.input}
                >
                  <option value="">-- Ne pas changer --</option>
                  <option value="__remove__">Retirer le capitaine</option>
                  {allCaptains.map(c => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</option>
                  ))}
                </select>
              </div>

              {/* New Parent search combobox */}
              <div className="mb-3 relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nouveau parrain</label>
                {transferNewParent ? (
                  <div className="flex items-center gap-2 p-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-xl">
                    <span className="text-sm text-gray-900 dark:text-white flex-1">
                      {(() => {
                        const found = allChattersList.find(c => c.id === transferNewParent);
                        return found ? `${found.firstName} ${found.lastName} (${found.email})` : transferNewParent;
                      })()}
                    </span>
                    <button
                      onClick={() => { setTransferNewParent(''); setTransferParentSearch(''); }}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={transferParentSearch}
                      onChange={e => { setTransferParentSearch(e.target.value); setTransferParentDropdownOpen(true); }}
                      onFocus={() => setTransferParentDropdownOpen(true)}
                      className={UI.input}
                      placeholder="Rechercher par nom, email ou ID..."
                    />
                    {transferParentDropdownOpen && transferParentSearch.length >= 2 && (
                      <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl">
                        {allChattersList
                          .filter(c => {
                            if (transferModal && c.id === transferModal.chatter.id) return false;
                            const q = transferParentSearch.toLowerCase();
                            return c.firstName.toLowerCase().includes(q) || c.lastName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
                          })
                          .slice(0, 15)
                          .map(c => (
                            <button
                              key={c.id}
                              onClick={() => { setTransferNewParent(c.id); setTransferParentSearch(''); setTransferParentDropdownOpen(false); }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-gray-900 dark:text-white">{c.firstName} {c.lastName}</span>
                                <span className="text-gray-400 ml-2 text-xs">{c.email}</span>
                              </div>
                              <span className={c.status === 'active' ? UI.badge.active : c.status === 'banned' ? UI.badge.banned : UI.badge.inactive}>{c.status}</span>
                            </button>
                          ))
                        }
                        {allChattersList.filter(c => {
                          if (transferModal && c.id === transferModal.chatter.id) return false;
                          const q = transferParentSearch.toLowerCase();
                          return c.firstName.toLowerCase().includes(q) || c.lastName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
                        }).length === 0 && (
                          <p className="px-3 py-2 text-sm text-gray-400">Aucun r\u00e9sultat</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Reason */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Raison</label>
                <textarea
                  value={transferReason}
                  onChange={e => setTransferReason(e.target.value)}
                  className={UI.input + " min-h-[60px] resize-y"}
                  placeholder="Raison du transfert..."
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button onClick={() => { setTransferModal(null); setTransferNewCaptain(''); setTransferNewParent(''); setTransferParentSearch(''); setTransferParentDropdownOpen(false); setTransferReason(''); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
                <button
                  onClick={handleTransfer}
                  disabled={transferLoading || (!transferNewCaptain && !transferNewParent)}
                  className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 flex items-center gap-2"
                >
                  {transferLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Transf\u00e9rer
</button>
              </div>
            </div>
          </div>
        )}

        {/* BULK TRANSFER MODAL */}
        {bulkModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Transfert groupe</h3>
              <p className="text-sm text-gray-500 mb-4">{selected.size} chatter(s) s\u00e9lectionn\u00e9(s)</p>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capitaine cible *</label>
                <select value={bulkCaptain} onChange={e => setBulkCaptain(e.target.value)} className={UI.input}>
                  <option value="">-- S\u00e9lectionner un capitaine --</option>
                  {allCaptains.map(c => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Raison</label>
                <textarea value={bulkReason} onChange={e => setBulkReason(e.target.value)} className={UI.input} placeholder="Raison..." />
              </div>

              {bulkLoading && (
                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${bulkProgress}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-center">{bulkProgress}%</p>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button onClick={() => setBulkModal(false)} disabled={bulkLoading} className="px-4 py-2 text-sm text-gray-600">Annuler</button>
                <button onClick={handleBulkTransfer} disabled={bulkLoading || !bulkCaptain} className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50">
                  {bulkLoading ? 'En cours...' : `Transf\u00e9rer ${selected.size} chatter(s)`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminChatterHierarchy;
