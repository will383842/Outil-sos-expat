/**
 * AdminWhatsAppSupervision - Page admin pour superviser les managers de groupes WhatsApp
 *
 * Master-detail split view: liste des groupes a gauche, details du groupe selectionne a droite.
 * Assignation/retrait de managers par groupe, recherche de chatters ou ajout manuel.
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
  Hash,
  Globe,
  Copy,
  MousePointerClick,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { WhatsAppIcon } from './WhatsAppGroupScreen';
import {
  getWhatsAppGroupsConfig,
  saveWhatsAppGroupsConfig,
  searchChattersForManager,
} from './whatsappGroupsService';
import type {
  WhatsAppGroupsConfig,
  WhatsAppGroup,
  WhatsAppGroupManager,
  WhatsAppRole,
  WhatsAppGroupType,
} from './types';
import { ROLE_LABELS } from './types';

// ---------------------------------------------------------------------------
// Helper: format assignedAt
// ---------------------------------------------------------------------------
function formatAssignedDate(assignedAt: WhatsAppGroupManager['assignedAt']): string {
  if (!assignedAt) return '\u2014';
  try {
    const ts = assignedAt as { toDate?: () => Date };
    const d = ts.toDate ? ts.toDate() : new Date(assignedAt as unknown as string);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '\u2014';
  }
}

// ---------------------------------------------------------------------------
// Helper: avatar color from string
// ---------------------------------------------------------------------------
const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

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

  const existingUids = useMemo(
    () => new Set((group.managers || []).map((m) => m.uid)),
    [group.managers],
  );

  const handleManualAdd = () => {
    const name = manualName.trim();
    const email = manualEmail.trim();
    if (!name || !email) {
      toast.error("Le nom et l'email sont requis");
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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/50 rounded-xl p-6 z-10 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
          Ajouter un manager
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 pr-8">{group.name}</p>

        {/* Search section */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
            Rechercher un affilié
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              className={`${inputClass} pl-9`}
              placeholder="Nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 animate-spin" />
            )}
          </div>

          {results.length > 0 && (
            <div className="mt-2 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
              {results.map((r) => {
                const alreadyAssigned = existingUids.has(r.uid);
                return (
                  <div key={r.uid} className="flex items-center justify-between p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {r.displayName}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{r.email}</p>
                      {r.phone && (
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">{r.phone}</p>
                      )}
                    </div>
                    {alreadyAssigned ? (
                      <span className="text-xs text-zinc-400 ml-2 whitespace-nowrap">
                        Déjà assigné
                      </span>
                    ) : (
                      <button
                        onClick={() => onAssign(group, r)}
                        className="ml-2 px-3 py-1.5 text-xs font-semibold text-white bg-[#25D366] hover:bg-[#1fb855] rounded-md"
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
            <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500 text-center py-3">
              Aucun résultat
            </p>
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
              placeholder="Téléphone (optionnel)"
              value={manualPhone}
              onChange={(e) => setManualPhone(e.target.value)}
            />
            <button
              onClick={handleManualAdd}
              disabled={!manualName.trim() || !manualEmail.trim()}
              className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-[#25D366] hover:bg-[#1fb855] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
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
// Main Component
// ---------------------------------------------------------------------------

const AdminWhatsAppSupervision: React.FC = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState<WhatsAppGroupsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assignModal, setAssignModal] = useState<WhatsAppGroup | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

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

  // Selected group derived from filteredGroups
  const selectedGroup = useMemo(
    () => filteredGroups.find((g) => g.id === selectedGroupId) || null,
    [filteredGroups, selectedGroupId],
  );

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
  const handleAssign = useCallback(
    async (group: WhatsAppGroup, manager: WhatsAppGroupManager) => {
      if (!config || !user) return;

      const existing = group.managers || [];
      if (existing.some((m) => m.uid === manager.uid)) {
        toast.error('Ce manager est déjà assigné à ce groupe');
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
        toast.success('Manager assigné avec succès');
        setAssignModal(null);
      } catch {
        toast.error("Erreur lors de l'assignation");
      } finally {
        setSaving(false);
      }
    },
    [config, user],
  );

  // Remove manager
  const handleRemoveManager = useCallback(
    async (group: WhatsAppGroup, uid: string) => {
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
        toast.success('Manager retiré');
      } catch {
        toast.error('Erreur lors du retrait');
      } finally {
        setSaving(false);
      }
    },
    [config, user],
  );

  // Copy link helper
  const copyLink = useCallback((link: string) => {
    navigator.clipboard.writeText(link).then(() => toast.success('Lien copié'));
  }, []);

  // Select classes
  const selectClass =
    'h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent';

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Managers WhatsApp
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Assignez des managers et supervisez chaque groupe
            </p>
          </div>
          <button
            onClick={loadConfig}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700"
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
              Aucun groupe configuré
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              Configurez d'abord vos groupes WhatsApp dans la page de gestion des groupes avant de
              pouvoir assigner des managers.
            </p>
          </div>
        )}

        {/* Content */}
        {!loading && config && config.groups.length > 0 && (
          <>
            {/* Stats — compact inline pills */}
            <div className="inline-flex items-center gap-6 flex-wrap">
              {[
                { label: 'Groupes', value: stats.total, icon: Hash, color: 'text-blue-500' },
                { label: 'Gérés', value: stats.managed, icon: Shield, color: 'text-emerald-500' },
                {
                  label: 'Non gérés',
                  value: stats.unmanaged,
                  icon: AlertTriangle,
                  color: 'text-amber-500',
                },
                {
                  label: 'Managers',
                  value: stats.uniqueManagers,
                  icon: Users,
                  color: 'text-violet-500',
                },
              ].map((s) => (
                <div key={s.label} className="inline-flex items-center gap-1.5">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {s.value}
                  </span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Filters — compact inline */}
            <div className="flex items-center gap-3 flex-wrap">
              <select
                className={selectClass}
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as WhatsAppRole | '')}
              >
                <option value="">Tous les rôles</option>
                {(Object.keys(ROLE_LABELS) as WhatsAppRole[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
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
                <option value="managed">Gérés</option>
                <option value="unmanaged">Non gérés</option>
              </select>

              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  className={`${selectClass} w-full pl-9`}
                  placeholder="Rechercher un groupe..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-auto tabular-nums whitespace-nowrap">
                {filteredGroups.length} groupe{filteredGroups.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Master-detail split view */}
            <div className="flex flex-col lg:flex-row lg:gap-6">
              {/* Left panel — group list */}
              <div className="w-full lg:w-[60%] flex-shrink-0">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/50 rounded-xl overflow-hidden">
                  <div className="max-h-[calc(100vh-340px)] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filteredGroups.length === 0 && (
                      <div className="text-center py-16">
                        <Search className="w-6 h-6 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                          Aucun groupe ne correspond aux filtres
                        </p>
                      </div>
                    )}
                    {filteredGroups.map((group) => {
                      const managers = group.managers || [];
                      const isSelected = selectedGroupId === group.id;
                      const typeBadgeClass =
                        group.type === 'continent'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                          : 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400';
                      const typeLabel = group.type === 'continent' ? 'Continent' : 'Langue';

                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => setSelectedGroupId(group.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-l-2 ${
                            isSelected
                              ? 'bg-[#25D366]/5 border-l-[#25D366]'
                              : 'border-l-transparent'
                          }`}
                        >
                          {/* Status dot */}
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              group.enabled ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-600'
                            }`}
                          />

                          {/* Name */}
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate flex-1 min-w-0">
                            {group.name}
                          </span>

                          {/* Badges */}
                          <span
                            className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${typeBadgeClass} flex-shrink-0 hidden sm:inline`}
                          >
                            {typeLabel}
                          </span>
                          <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 flex-shrink-0 hidden sm:inline">
                            {ROLE_LABELS[group.role]}
                          </span>

                          {/* Manager count */}
                          <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500 flex-shrink-0 tabular-nums">
                            <Users className="w-3.5 h-3.5" />
                            {managers.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right panel — selected group details */}
              <div className="w-full lg:w-[40%] mt-4 lg:mt-0">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/50 rounded-xl overflow-hidden sticky top-4">
                  {!selectedGroup ? (
                    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                      <MousePointerClick className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-3" />
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Sélectionnez un groupe pour voir les détails
                      </p>
                    </div>
                  ) : (
                    <div className="p-5 max-h-[calc(100vh-340px)] overflow-y-auto">
                      {/* Group name */}
                      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                        {selectedGroup.name}
                      </h2>

                      {/* Info badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                            selectedGroup.type === 'continent'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                              : 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400'
                          }`}
                        >
                          {selectedGroup.type === 'continent' ? 'Continent' : 'Langue'}
                        </span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          {ROLE_LABELS[selectedGroup.role]}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md ${
                            selectedGroup.enabled
                              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              selectedGroup.enabled ? 'bg-green-500' : 'bg-zinc-400'
                            }`}
                          />
                          {selectedGroup.enabled ? 'Actif' : 'Inactif'}
                        </span>
                        {selectedGroup.language && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                            <Globe className="w-3 h-3" />
                            {selectedGroup.language.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* WhatsApp link */}
                      {selectedGroup.link && (
                        <div className="flex items-center gap-2 mb-5 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                          <WhatsAppIcon className="w-4 h-4 text-[#25D366] flex-shrink-0" />
                          <a
                            href={selectedGroup.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#25D366] hover:underline truncate flex-1 min-w-0"
                          >
                            {selectedGroup.link}
                          </a>
                          <button
                            onClick={() => copyLink(selectedGroup.link)}
                            className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 flex-shrink-0"
                            title="Copier le lien"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={selectedGroup.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 flex-shrink-0"
                            title="Ouvrir"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}

                      {/* Managers section */}
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                          Managers ({(selectedGroup.managers || []).length})
                        </h3>

                        {(selectedGroup.managers || []).length === 0 ? (
                          <div className="flex items-center gap-2 text-sm text-zinc-400 dark:text-zinc-500 py-4">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            Aucun manager assigné
                          </div>
                        ) : (
                          <div className="space-y-2 mb-4">
                            {(selectedGroup.managers || []).map((m) => (
                              <div
                                key={m.uid}
                                className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
                              >
                                {/* Avatar */}
                                <div
                                  className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${avatarColor(m.displayName)}`}
                                >
                                  {initials(m.displayName)}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                    {m.displayName}
                                  </p>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <Mail className="w-3 h-3 text-zinc-400 flex-shrink-0" />
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                      {m.email}
                                    </p>
                                  </div>
                                  {m.phone && (
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <Phone className="w-3 h-3 text-zinc-400 flex-shrink-0" />
                                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {m.phone}
                                      </p>
                                    </div>
                                  )}
                                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                                    Assigné le {formatAssignedDate(m.assignedAt)}
                                  </p>
                                </div>

                                {/* Remove */}
                                <button
                                  onClick={() => handleRemoveManager(selectedGroup, m.uid)}
                                  className="p-1 rounded text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 flex-shrink-0"
                                  title="Retirer ce manager"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Assign button */}
                        <button
                          onClick={() => setAssignModal(selectedGroup)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#25D366] hover:bg-[#1fb855] rounded-lg"
                        >
                          <UserPlus className="w-4 h-4" />
                          Assigner un manager
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Saving overlay */}
        {saving && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 pointer-events-none">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/50 rounded-lg p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-[#25D366] animate-spin" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Enregistrement...
              </span>
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
