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
  ChevronDown,
  ChevronRight,
  Trash2,
  Hash,
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

  const inputClass =
    'w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent placeholder:text-zinc-400 dark:placeholder:text-zinc-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/50 rounded-xl p-6 z-10 max-h-[90vh] overflow-y-auto">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-md text-zinc-400 dark:text-zinc-500"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
          Ajouter un manager
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 pr-8">{group.name}</p>

        {/* Search section */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
            Rechercher un chatter par email
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              className={`${inputClass} pl-9`}
              placeholder="email@exemple.com..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 animate-spin" />
            )}
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="mt-2 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
              {results.map((r) => {
                const alreadyAssigned = existingUids.has(r.uid);
                return (
                  <div key={r.uid} className="flex items-center justify-between p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{r.displayName}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{r.email}</p>
                      {r.phone && <p className="text-xs text-zinc-400 dark:text-zinc-500">{r.phone}</p>}
                    </div>
                    {alreadyAssigned ? (
                      <span className="text-xs text-zinc-400 ml-2 whitespace-nowrap">Deja assigne</span>
                    ) : (
                      <button
                        onClick={() => onAssign(group, r)}
                        className="ml-2 px-3 py-1.5 text-xs font-semibold text-white bg-[#25D366] rounded-md"
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
            <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500 text-center py-3">Aucun resultat</p>
          )}
        </div>

        {/* Separator */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
          <span className="text-xs text-zinc-400 font-medium uppercase">ou</span>
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
        </div>

        {/* Manual entry */}
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
            Ajout manuel
          </label>
          <div className="space-y-3">
            <input
              type="text"
              className={inputClass}
              placeholder="Nom complet"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
            />
            <input
              type="email"
              className={inputClass}
              placeholder="Email"
              value={manualEmail}
              onChange={(e) => setManualEmail(e.target.value)}
            />
            <input
              type="tel"
              className={inputClass}
              placeholder="Telephone (optionnel)"
              value={manualPhone}
              onChange={(e) => setManualPhone(e.target.value)}
            />
            <button
              onClick={handleManualAdd}
              disabled={!manualName.trim() || !manualEmail.trim()}
              className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-[#25D366] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
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
// Group Row (expandable)
// ---------------------------------------------------------------------------

interface GroupRowProps {
  group: WhatsAppGroup;
  expanded: boolean;
  onToggle: () => void;
  onAddManager: (group: WhatsAppGroup) => void;
  onRemoveManager: (group: WhatsAppGroup, uid: string) => void;
}

const GroupRow: React.FC<GroupRowProps> = ({ group, expanded, onToggle, onAddManager, onRemoveManager }) => {
  const managers = group.managers || [];

  const typeBadgeClass = group.type === 'continent'
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
    : 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400';
  const typeLabel = group.type === 'continent' ? 'Continent' : 'Langue';

  return (
    <div className="border border-zinc-200 dark:border-zinc-700/50 rounded-lg bg-white dark:bg-zinc-900 overflow-hidden">
      {/* Main row — clickable */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      >
        {/* Chevron */}
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-400 flex-shrink-0" />
        )}

        {/* Name */}
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate flex-1 min-w-0">
          {group.name}
        </span>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${typeBadgeClass}`}>
            {typeLabel}
          </span>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {ROLE_LABELS[group.role]}
          </span>
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md ${
            group.enabled
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${group.enabled ? 'bg-green-500' : 'bg-zinc-400'}`} />
            {group.enabled ? 'Actif' : 'Inactif'}
          </span>
        </div>

        {/* Manager count */}
        <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 flex-shrink-0 tabular-nums">
          <Users className="w-3.5 h-3.5" />
          {managers.length}
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-4">
          {managers.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  <th className="pb-2 font-medium">Nom</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Telephone</th>
                  <th className="pb-2 font-medium">Assigne le</th>
                  <th className="pb-2 font-medium w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {managers.map((m) => {
                  let assignedDate = '—';
                  if (m.assignedAt) {
                    try {
                      const ts = m.assignedAt as { toDate?: () => Date };
                      const d = ts.toDate ? ts.toDate() : new Date(m.assignedAt as unknown as string);
                      assignedDate = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
                    } catch {
                      assignedDate = '—';
                    }
                  }
                  return (
                    <tr key={m.uid}>
                      <td className="py-2.5 pr-4 text-zinc-900 dark:text-zinc-100 font-medium">{m.displayName}</td>
                      <td className="py-2.5 pr-4 text-zinc-500 dark:text-zinc-400">{m.email}</td>
                      <td className="py-2.5 pr-4 text-zinc-500 dark:text-zinc-400">{m.phone || '—'}</td>
                      <td className="py-2.5 pr-4 text-zinc-500 dark:text-zinc-400">{assignedDate}</td>
                      <td className="py-2.5">
                        <button
                          onClick={() => onRemoveManager(group, m.uid)}
                          className="p-1.5 rounded-md text-zinc-400 dark:text-zinc-500"
                          title="Retirer ce manager"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex items-center gap-2 text-sm text-zinc-400 dark:text-zinc-500 py-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Aucun manager assigne
            </div>
          )}

          <button
            onClick={() => onAddManager(group)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg"
          >
            <UserPlus className="w-4 h-4" />
            Assigner un manager
          </button>

          {group.link && (
            <a
              href={group.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 ml-3 inline-flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Lien WhatsApp
            </a>
          )}
        </div>
      )}
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

  // Expanded rows
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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
      assignedAt: new Date().toISOString() as unknown as import('firebase/firestore').Timestamp,
      assignedBy: user.uid || '',
    };

    const updatedGroups = config.groups.map((g) => {
      if (g.id !== group.id) return g;
      return { ...g, managers: [...(g.managers || []), updatedManager] };
    });

    const updatedConfig: WhatsAppGroupsConfig = { ...config, groups: updatedGroups };

    setSaving(true);
    try {
      await saveWhatsAppGroupsConfig(updatedConfig, user.uid || '');
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
      await saveWhatsAppGroupsConfig(updatedConfig, user.uid || '');
      setConfig(updatedConfig);
      toast.success('Manager retire');
    } catch {
      toast.error('Erreur lors du retrait');
    } finally {
      setSaving(false);
    }
  }, [config, user]);

  // Select classes
  const selectClass =
    'h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent';

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Supervision WhatsApp
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Assignez des managers et supervisez chaque groupe
            </p>
          </div>
          <button
            onClick={loadConfig}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-7 h-7 text-[#25D366] animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && (!config || config.groups.length === 0) && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/50 rounded-xl p-16 text-center">
            <WhatsAppIcon className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Aucun groupe configure
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              Configurez d'abord vos groupes WhatsApp dans la page de gestion des groupes avant de pouvoir assigner des managers.
            </p>
          </div>
        )}

        {/* Content */}
        {!loading && config && config.groups.length > 0 && (
          <>
            {/* Stats — horizontal row */}
            <div className="flex gap-6">
              {[
                { label: 'Total groupes', value: stats.total, icon: <Hash className="w-5 h-5" />, border: 'border-l-4 border-l-blue-400', iconColor: 'text-blue-500' },
                { label: 'Groupes geres', value: stats.managed, icon: <Shield className="w-5 h-5" />, border: 'border-l-4 border-l-emerald-400', iconColor: 'text-emerald-500' },
                { label: 'Non geres', value: stats.unmanaged, icon: <AlertTriangle className="w-5 h-5" />, border: 'border-l-4 border-l-amber-400', iconColor: 'text-amber-500' },
                { label: 'Managers uniques', value: stats.uniqueManagers, icon: <Users className="w-5 h-5" />, border: 'border-l-4 border-l-violet-400', iconColor: 'text-violet-500' },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/50 rounded-xl p-6 ${s.border}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={s.iconColor}>{s.icon}</div>
                    <div>
                      <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{s.value}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{s.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters — single horizontal bar */}
            <div className="flex items-center gap-3">
              <select
                className={selectClass}
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as WhatsAppRole | '')}
              >
                <option value="">Tous les roles</option>
                {(Object.keys(ROLE_LABELS) as WhatsAppRole[]).map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>

              <select
                className={selectClass}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as WhatsAppGroupType | '')}
              >
                <option value="">Tous les types</option>
                <option value="continent">Continent</option>
                <option value="language">Langue</option>
              </select>

              <select
                className={selectClass}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as '' | 'managed' | 'unmanaged')}
              >
                <option value="">Tous les statuts</option>
                <option value="managed">Geres</option>
                <option value="unmanaged">Non geres</option>
              </select>

              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  className={`${selectClass} w-full pl-9`}
                  placeholder="Rechercher un groupe..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-auto tabular-nums">
                {filteredGroups.length} groupe{filteredGroups.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Groups list — expandable rows */}
            <div className="space-y-2">
              {filteredGroups.map((group) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  expanded={expandedIds.has(group.id)}
                  onToggle={() => toggleExpanded(group.id)}
                  onAddManager={(g) => setAssignModal(g)}
                  onRemoveManager={handleRemoveManager}
                />
              ))}
            </div>

            {filteredGroups.length === 0 && (
              <div className="text-center py-16">
                <Search className="w-6 h-6 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                  Aucun groupe ne correspond aux filtres selectionnes
                </p>
              </div>
            )}
          </>
        )}

        {/* Saving overlay */}
        {saving && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 pointer-events-none">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/50 rounded-lg p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-[#25D366] animate-spin" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Enregistrement...</span>
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
