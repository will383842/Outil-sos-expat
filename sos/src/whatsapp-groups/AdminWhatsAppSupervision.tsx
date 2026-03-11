/**
 * AdminWhatsAppSupervision - Page admin pour superviser les managers de groupes WhatsApp
 *
 * Vue d'ensemble : stats, filtres, assignation/retrait de managers par groupe.
 * Recherche de chatters existants ou ajout manuel.
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Loader2,
  RefreshCw,
  Search,
  X,
  UserPlus,
  Users,
  Shield,
  AlertTriangle,
  Phone,
  Mail,
  ExternalLink,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { WhatsAppIcon } from './WhatsAppGroupScreen';
import {
  getWhatsAppGroupsConfig,
  saveWhatsAppGroupsConfig,
  searchChattersForManager,
} from './whatsappGroupsService';
import type { WhatsAppGroupsConfig, WhatsAppGroup, WhatsAppGroupManager, WhatsAppRole, WhatsAppGroupType } from './types';
import { ROLE_LABELS } from './types';

// ---------------------------------------------------------------------------
// UI constants
// ---------------------------------------------------------------------------

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  input: "w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#25D366] focus:border-transparent transition-all min-h-[44px]",
  label: "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5",
};

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-teal-500',
];

function avatarColor(name: string): string {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

const StatCard: React.FC<{
  label: string;
  value: number;
  color: string;      // tailwind text color e.g. "text-blue-600"
  bgColor: string;    // tailwind bg color e.g. "bg-blue-50"
  icon: React.ReactNode;
}> = ({ label, value, color, bgColor, icon }) => (
  <div className={`${UI.card} p-5`}>
    <div className="flex items-center gap-3">
      <div className={`${bgColor} dark:bg-white/10 rounded-xl p-3 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Assign Modal
// ---------------------------------------------------------------------------

interface AssignModalProps {
  group: WhatsAppGroup;
  onClose: () => void;
  onAssign: (group: WhatsAppGroup, manager: WhatsAppGroupManager) => void;
}

const AssignModal: React.FC<AssignModalProps> = ({ group, onClose, onAssign }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<WhatsAppGroupManager[]>([]);
  const [searching, setSearching] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (searchTerm.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await searchChattersForManager(searchTerm.trim());
        setResults(res);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [searchTerm]);

  const existingUids = useMemo(() => new Set((group.managers || []).map((m) => m.uid)), [group.managers]);

  const handleManualAdd = () => {
    const name = manualName.trim();
    const email = manualEmail.trim();
    if (!name || !email) {
      toast.error('Le nom et l\'email sont requis');
      return;
    }
    const uid = `manual_${Date.now()}`;
    if (existingUids.has(uid)) return;
    onAssign(group, {
      uid,
      displayName: name,
      email,
      phone: manualPhone.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className={`${UI.card} relative w-full max-w-lg p-6 z-10 max-h-[90vh] overflow-y-auto`}>
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
          Ajouter un manager
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 pr-8">{group.name}</p>

        {/* Search section */}
        <div className="mb-5">
          <label className={UI.label}>Rechercher un chatter par email</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className={`${UI.input} pl-9`}
              placeholder="email@exemple.com..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
            )}
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
              {results.map((r) => {
                const alreadyAssigned = existingUids.has(r.uid);
                return (
                  <div key={r.uid} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.displayName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.email}</p>
                      {r.phone && <p className="text-xs text-gray-400 dark:text-gray-500">{r.phone}</p>}
                    </div>
                    {alreadyAssigned ? (
                      <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">Deja assigne</span>
                    ) : (
                      <button
                        onClick={() => onAssign(group, r)}
                        className="ml-2 px-3 py-1.5 text-xs font-semibold text-white bg-[#25D366] hover:bg-[#20BD5A] rounded-lg transition-colors min-h-[36px]"
                      >
                        Assigner
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!searching && searchTerm.trim().length >= 2 && results.length === 0 && (
            <p className="mt-2 text-sm text-gray-400 dark:text-gray-500 text-center py-3">Aucun resultat</p>
          )}
        </div>

        {/* Separator */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-400 font-medium uppercase">ou</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Manual entry */}
        <div>
          <label className={UI.label}>Ajout manuel</label>
          <div className="space-y-3">
            <input
              type="text"
              className={UI.input}
              placeholder="Nom complet"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
            />
            <input
              type="email"
              className={UI.input}
              placeholder="Email"
              value={manualEmail}
              onChange={(e) => setManualEmail(e.target.value)}
            />
            <input
              type="tel"
              className={UI.input}
              placeholder="Telephone (optionnel)"
              value={manualPhone}
              onChange={(e) => setManualPhone(e.target.value)}
            />
            <button
              onClick={handleManualAdd}
              disabled={!manualName.trim() || !manualEmail.trim()}
              className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-[#25D366] hover:bg-[#20BD5A] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              Ajouter manuellement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Group Card
// ---------------------------------------------------------------------------

interface GroupCardProps {
  group: WhatsAppGroup;
  onAddManager: (group: WhatsAppGroup) => void;
  onRemoveManager: (group: WhatsAppGroup, uid: string) => void;
}

const GroupCard: React.FC<GroupCardProps> = ({ group, onAddManager, onRemoveManager }) => {
  const managers = group.managers || [];
  const typeBadge = group.type === 'continent'
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  const typeLabel = group.type === 'continent' ? 'Continent' : 'Langue';

  const roleBadge = 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';

  return (
    <div className={`${UI.card} p-5 flex flex-col`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight flex-1 min-w-0 truncate">
          {group.name}
        </h3>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeBadge}`}>{typeLabel}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleBadge}`}>{ROLE_LABELS[group.role]}</span>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 mb-4 text-xs">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${group.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
        <span className={group.enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>
          {group.enabled ? 'Actif' : 'Inactif'}
        </span>
        {group.link && (
          <a
            href={group.link}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-[#25D366] hover:underline truncate max-w-[150px]"
          >
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{group.link.replace('https://chat.whatsapp.com/', '').slice(0, 12)}...</span>
          </a>
        )}
      </div>

      {/* Managers */}
      <div className="flex-1">
        {managers.length > 0 ? (
          <div className="space-y-2">
            {managers.map((m) => (
              <div key={m.uid} className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <div className={`${avatarColor(m.displayName)} w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                  {(m.displayName?.[0] || '?').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{m.displayName}</p>
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-0.5 truncate">
                      <Mail className="w-3 h-3 flex-shrink-0" />{m.email}
                    </span>
                    {m.phone && (
                      <span className="flex items-center gap-0.5 flex-shrink-0">
                        <Phone className="w-3 h-3" />{m.phone}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onRemoveManager(group, m.uid)}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 transition-colors flex-shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
                  title="Retirer ce manager"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 text-xs font-medium">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Aucun manager assigne
          </div>
        )}
      </div>

      {/* Footer */}
      <button
        onClick={() => onAddManager(group)}
        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#25D366] border-2 border-[#25D366] hover:bg-[#25D366] hover:text-white rounded-xl transition-colors min-h-[44px]"
      >
        <UserPlus className="w-4 h-4" />
        Ajouter un manager
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const AdminWhatsAppSupervision: React.FC = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState<WhatsAppGroupsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assignModal, setAssignModal] = useState<WhatsAppGroup | null>(null);

  // Filters
  const [filterRole, setFilterRole] = useState<WhatsAppRole | ''>('');
  const [filterType, setFilterType] = useState<WhatsAppGroupType | ''>('');
  const [filterStatus, setFilterStatus] = useState<'' | 'managed' | 'unmanaged'>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Load config
  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWhatsAppGroupsConfig();
      setConfig(data);
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    if (!config?.groups) return [];
    return config.groups.filter((g) => {
      if (filterRole && g.role !== filterRole) return false;
      if (filterType && g.type !== filterType) return false;
      if (filterStatus === 'managed' && (!g.managers || g.managers.length === 0)) return false;
      if (filterStatus === 'unmanaged' && g.managers && g.managers.length > 0) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!g.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [config, filterRole, filterType, filterStatus, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const groups = config?.groups || [];
    const total = groups.length;
    const managed = groups.filter((g) => g.managers && g.managers.length > 0).length;
    const unmanaged = total - managed;
    const uniqueManagerUids = new Set<string>();
    groups.forEach((g) => (g.managers || []).forEach((m) => uniqueManagerUids.add(m.uid)));
    return { total, managed, unmanaged, uniqueManagers: uniqueManagerUids.size };
  }, [config]);

  // Assign manager
  const handleAssign = useCallback(async (group: WhatsAppGroup, manager: WhatsAppGroupManager) => {
    if (!config || !user) return;

    // Guard: duplicate check
    const existing = group.managers || [];
    if (existing.some((m) => m.uid === manager.uid)) {
      toast.error('Ce manager est deja assigne a ce groupe');
      return;
    }

    const updatedManager: WhatsAppGroupManager = {
      ...manager,
      assignedAt: new Date().toISOString(),
      assignedBy: user.uid,
    };

    const updatedGroups = config.groups.map((g) => {
      if (g.id !== group.id) return g;
      return { ...g, managers: [...(g.managers || []), updatedManager] };
    });

    const updatedConfig: WhatsAppGroupsConfig = { ...config, groups: updatedGroups };

    setSaving(true);
    try {
      await saveWhatsAppGroupsConfig(updatedConfig, user.uid);
      setConfig(updatedConfig);
      toast.success('Manager assigne avec succes');
      setAssignModal(null);
    } catch {
      toast.error('Erreur lors de l\'assignation');
    } finally {
      setSaving(false);
    }
  }, [config, user]);

  // Remove manager
  const handleRemoveManager = useCallback(async (group: WhatsAppGroup, uid: string) => {
    if (!config || !user) return;

    const updatedGroups = config.groups.map((g) => {
      if (g.id !== group.id) return g;
      return { ...g, managers: (g.managers || []).filter((m) => m.uid !== uid) };
    });

    const updatedConfig: WhatsAppGroupsConfig = { ...config, groups: updatedGroups };

    setSaving(true);
    try {
      await saveWhatsAppGroupsConfig(updatedConfig, user.uid);
      setConfig(updatedConfig);
      toast.success('Manager retire');
    } catch {
      toast.error('Erreur lors du retrait');
    } finally {
      setSaving(false);
    }
  }, [config, user]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#25D366]/10">
              <WhatsAppIcon className="w-7 h-7 text-[#25D366]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Supervision des groupes WhatsApp
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Assignez des managers et supervisez chaque groupe
              </p>
            </div>
          </div>
          <button
            onClick={loadConfig}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-[44px] self-start"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#25D366] animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && (!config || config.groups.length === 0) && (
          <div className={`${UI.card} p-12 text-center`}>
            <WhatsAppIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Aucun groupe configure
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Configurez d'abord vos groupes WhatsApp dans la page de gestion des groupes avant de pouvoir assigner des managers.
            </p>
          </div>
        )}

        {/* Content */}
        {!loading && config && config.groups.length > 0 && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total groupes"
                value={stats.total}
                color="text-blue-600 dark:text-blue-400"
                bgColor="bg-blue-50"
                icon={<WhatsAppIcon className="w-5 h-5" />}
              />
              <StatCard
                label="Groupes geres"
                value={stats.managed}
                color="text-green-600 dark:text-green-400"
                bgColor="bg-green-50"
                icon={<Shield className="w-5 h-5" />}
              />
              <StatCard
                label="Non geres"
                value={stats.unmanaged}
                color="text-amber-600 dark:text-amber-400"
                bgColor="bg-amber-50"
                icon={<AlertTriangle className="w-5 h-5" />}
              />
              <StatCard
                label="Managers uniques"
                value={stats.uniqueManagers}
                color="text-purple-600 dark:text-purple-400"
                bgColor="bg-purple-50"
                icon={<Users className="w-5 h-5" />}
              />
            </div>

            {/* Filters */}
            <div className={`${UI.card} p-4`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Role */}
                <div>
                  <label className={UI.label}>Role</label>
                  <select
                    className={UI.input}
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value as WhatsAppRole | '')}
                  >
                    <option value="">Tous les roles</option>
                    {(Object.keys(ROLE_LABELS) as WhatsAppRole[]).map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
                {/* Type */}
                <div>
                  <label className={UI.label}>Type</label>
                  <select
                    className={UI.input}
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as WhatsAppGroupType | '')}
                  >
                    <option value="">Tous les types</option>
                    <option value="continent">Continent</option>
                    <option value="language">Langue</option>
                  </select>
                </div>
                {/* Status */}
                <div>
                  <label className={UI.label}>Statut</label>
                  <select
                    className={UI.input}
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as '' | 'managed' | 'unmanaged')}
                  >
                    <option value="">Tous</option>
                    <option value="managed">Geres</option>
                    <option value="unmanaged">Non geres</option>
                  </select>
                </div>
                {/* Search */}
                <div>
                  <label className={UI.label}>Recherche</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      className={`${UI.input} pl-9`}
                      placeholder="Nom du groupe..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Results count */}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filteredGroups.length} groupe{filteredGroups.length !== 1 ? 's' : ''} affiche{filteredGroups.length !== 1 ? 's' : ''}
            </p>

            {/* Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onAddManager={(g) => setAssignModal(g)}
                  onRemoveManager={handleRemoveManager}
                />
              ))}
            </div>

            {filteredGroups.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Aucun groupe ne correspond aux filtres selectionnes
                </p>
              </div>
            )}
          </>
        )}

        {/* Saving overlay */}
        {saving && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-sm pointer-events-none">
            <div className={`${UI.card} p-4 flex items-center gap-3`}>
              <Loader2 className="w-5 h-5 text-[#25D366] animate-spin" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Enregistrement...</span>
            </div>
          </div>
        )}

        {/* Assign Modal */}
        {assignModal && (
          <AssignModal
            group={assignModal}
            onClose={() => setAssignModal(null)}
            onAssign={handleAssign}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminWhatsAppSupervision;
