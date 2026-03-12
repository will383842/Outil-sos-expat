/**
 * AdminTelegramGroups - Dashboard admin pour gérer les groupes Telegram affiliés
 * Design card-based miroir de AdminWhatsAppGroups, adapté pour l'API Laravel.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Save,
  Loader2,
  RefreshCw,
  Globe,
  ArrowDown,
  Users,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Pencil,
  MessageCircle,
  TrendingUp,
  FileText,
  User,
  Scale,
  Heart,
  Info,
  Wand2,
  AlertTriangle,
  Send,
  Trash2,
} from 'lucide-react';
import {
  fetchTelegramGroups,
  updateTelegramGroup,
  deleteTelegramGroup,
  seedTelegramGroups,
  generateContinentGroups as apiGenerateContinentGroups,
  generateLanguageGroups as apiGenerateLanguageGroups,
} from './telegramGroupsApi';
import type { TelegramGroup, TelegramRole } from './types';
import { SUPPORTED_LANGUAGES, ROLE_LABELS, ALL_CONTINENTS } from './types';

const BRAND = '#0088cc';

const ALL_ROLES: TelegramRole[] = ['chatter', 'influencer', 'blogger', 'groupAdmin', 'client', 'lawyer', 'expat'];
const CONTINENT_ROLES: TelegramRole[] = ['chatter'];
const isContinentRole = (role: TelegramRole) => CONTINENT_ROLES.includes(role);

const ROLE_ICONS: Record<TelegramRole, React.FC<{ className?: string }>> = {
  chatter: MessageCircle,
  influencer: TrendingUp,
  blogger: FileText,
  groupAdmin: Users,
  client: User,
  lawyer: Scale,
  expat: Heart,
};

/* ------------------------------------------------------------------ */
/*  Toggle                                                             */
/* ------------------------------------------------------------------ */
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent ${
      checked ? 'bg-[#0088cc]' : 'bg-zinc-300 dark:bg-zinc-600'
    }`}
  >
    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
  </button>
);

/* ------------------------------------------------------------------ */
/*  Telegram Icon                                                      */
/* ------------------------------------------------------------------ */
const TelegramIcon: React.FC<{ className?: string }> = ({ className }) => (
  <Send className={className} />
);

/* ------------------------------------------------------------------ */
/*  Group Card                                                         */
/* ------------------------------------------------------------------ */
const GroupCard: React.FC<{
  group: TelegramGroup;
  onChange: (id: number, updates: Partial<TelegramGroup>) => void;
  onRemove: (id: number) => void;
}> = ({ group, onChange, onRemove }) => {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [editLink, setEditLink] = useState(group.link || '');
  const [copied, setCopied] = useState(false);
  const [editingLink, setEditingLink] = useState(false);

  const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === group.language);
  const continentInfo = ALL_CONTINENTS.find((c) => c.code === group.continent_code);
  const managers = group.managers || [];
  const linkValid = !group.link || group.link.startsWith('https://t.me/');

  const handleCopy = () => {
    if (group.link) {
      navigator.clipboard.writeText(group.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const commitName = () => {
    if (editName.trim() && editName !== group.name) {
      onChange(group.id, { name: editName.trim() });
    } else {
      setEditName(group.name);
    }
    setEditing(false);
  };

  const commitLink = () => {
    const trimmed = editLink.trim();
    if (trimmed !== (group.link || '')) {
      onChange(group.id, { link: trimmed });
    } else {
      setEditLink(group.link || '');
    }
    setEditingLink(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitName();
    if (e.key === 'Escape') { setEditName(group.name); setEditing(false); }
  };

  const handleLinkKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitLink();
    if (e.key === 'Escape') { setEditLink(group.link || ''); setEditingLink(false); }
  };

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700/50 p-5 ${!group.enabled ? 'opacity-50' : ''}`}>
      {/* Top row: toggle */}
      <div className="flex items-center justify-between mb-3">
        <Toggle checked={group.enabled} onChange={(v) => onChange(group.id, { enabled: v })} />
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
          group.type === 'continent'
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
        }`}>
          {group.type === 'continent' ? 'Continent' : 'Langue'}
        </span>
      </div>

      {/* Group name — editable inline */}
      <div className="mb-3">
        {editing ? (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={commitName}
            onKeyDown={handleKeyDown}
            className="w-full text-base font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800 rounded-md px-2 py-1 border border-[#0088cc] focus:outline-none focus:ring-1 focus:ring-[#0088cc]"
          />
        ) : (
          <button
            onClick={() => { setEditName(group.name); setEditing(true); }}
            className="flex items-center gap-1.5 text-left group/name w-full"
          >
            <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">{group.name || 'Sans nom'}</span>
            <Pencil className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0 opacity-0 group-hover/name:opacity-100" />
          </button>
        )}
      </div>

      {/* Info badges row */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {langInfo && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {langInfo.flag} {langInfo.name}
          </span>
        )}
        {continentInfo && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {continentInfo.emoji} {continentInfo.name}
          </span>
        )}
      </div>

      {/* Telegram link — editable */}
      <div className="mb-3">
        {editingLink ? (
          <input
            autoFocus
            value={editLink}
            onChange={(e) => setEditLink(e.target.value)}
            onBlur={commitLink}
            onKeyDown={handleLinkKeyDown}
            placeholder="https://t.me/+XXX"
            className="w-full text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 rounded-md px-2 py-1.5 border border-[#0088cc] focus:outline-none focus:ring-1 focus:ring-[#0088cc]"
          />
        ) : group.link ? (
          <button
            onClick={() => { setEditLink(group.link || ''); setEditingLink(true); }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium max-w-full group/link ${
              linkValid
                ? 'bg-[#0088cc]/10 text-[#0088cc] dark:bg-[#0088cc]/20'
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
            }`}
          >
            <Pencil className="w-3 h-3 shrink-0 opacity-0 group-hover/link:opacity-100" />
            <span className="truncate">{group.link.replace('https://t.me/', 't.me/')}</span>
          </button>
        ) : (
          <button
            onClick={() => { setEditLink(''); setEditingLink(true); }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            <Pencil className="w-3 h-3" />
            Ajouter un lien
          </button>
        )}
      </div>

      {/* Managers */}
      <div className="mb-4">
        {managers.length > 0 ? (
          <div className="flex items-center gap-1" title={managers.map((m) => m.displayName).join(', ')}>
            {managers.slice(0, 3).map((m, i) => (
              <span key={i} className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#0088cc]/20 text-[#0088cc] text-[10px] font-bold">
                {m.displayName.charAt(0).toUpperCase()}
              </span>
            ))}
            {managers.length > 3 && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">+{managers.length - 3}</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
            <AlertTriangle className="w-3 h-3" />
            <span>Aucun manager</span>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <button onClick={handleCopy} disabled={!group.link} className="text-xs text-zinc-500 dark:text-zinc-400 disabled:opacity-30 flex items-center gap-1">
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          Copier lien
        </button>
        <button onClick={() => onRemove(group.id)} className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1 ml-auto">
          <Trash2 className="w-3 h-3" />
          Supprimer
        </button>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
const AdminTelegramGroups: React.FC = () => {
  const [groups, setGroups] = useState<TelegramGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [activeRole, setActiveRole] = useState<TelegramRole>('chatter');
  const [collapsedContinents, setCollapsedContinents] = useState<Set<string>>(new Set());
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [changedIds, setChangedIds] = useState<Set<number>>(new Set());

  const hasChanges = changedIds.size > 0;

  /* --- Fetch -------------------------------------------------------- */
  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTelegramGroups();
      setGroups(data);
      setChangedIds(new Set());
    } catch (err) {
      console.error('[AdminTelegramGroups] Fetch error:', err);
      toast.error('Erreur lors du chargement des groupes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  /* --- Derived state ------------------------------------------------ */
  const continentGroups = useMemo(() => groups.filter((g) => g.role === activeRole && g.type === 'continent'), [groups, activeRole]);
  const languageGroups = useMemo(() => groups.filter((g) => g.role === activeRole && g.type === 'language'), [groups, activeRole]);

  const continentGroupsByContinent = useMemo(() => {
    const map = new Map<string, TelegramGroup[]>();
    for (const c of ALL_CONTINENTS) {
      const matched = continentGroups.filter((g) => g.continent_code === c.code);
      if (matched.length > 0) map.set(c.code, matched);
    }
    return map;
  }, [continentGroups]);

  const showContinentSection = isContinentRole(activeRole);
  const totalActive = groups.filter((g) => g.enabled).length;
  const totalGroups = groups.length;

  /* --- Local update ------------------------------------------------- */
  const handleGroupChange = (id: number, updates: Partial<TelegramGroup>) => {
    setGroups((prev) => prev.map((g) => g.id === id ? { ...g, ...updates } : g));
    setChangedIds((prev) => new Set(prev).add(id));
  };

  /* --- Remove (immediate API call) ---------------------------------- */
  const handleRemove = async (id: number) => {
    const group = groups.find((g) => g.id === id);
    if (!window.confirm(`Supprimer le groupe "${group?.name}" ?`)) return;
    try {
      await deleteTelegramGroup(id);
      setGroups((prev) => prev.filter((g) => g.id !== id));
      setChangedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      toast.success('Groupe supprime');
    } catch (err) {
      console.error('[AdminTelegramGroups] Delete error:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  /* --- Save changed groups ------------------------------------------ */
  const handleSave = async () => {
    const toSave = groups.filter((g) => changedIds.has(g.id));
    // Validate enabled groups
    for (const group of toSave) {
      if (group.enabled && !group.name.trim()) {
        toast.error('Chaque groupe actif doit avoir un nom');
        return;
      }
      if (group.enabled && group.link && !group.link.startsWith('https://t.me/')) {
        toast.error(`Lien invalide pour "${group.name}". Doit commencer par https://t.me/`);
        return;
      }
    }
    setSaving(true);
    try {
      let success = 0;
      for (const group of toSave) {
        await updateTelegramGroup(group.id, {
          name: group.name,
          link: group.link,
          enabled: group.enabled,
          language: group.language,
        });
        success++;
      }
      setChangedIds(new Set());
      toast.success(`${success} groupe${success > 1 ? 's' : ''} sauvegarde${success > 1 ? 's' : ''}`);
    } catch (err) {
      console.error('[AdminTelegramGroups] Save error:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  /* --- Seed --------------------------------------------------------- */
  const handleSeedAll = async () => {
    if (groups.length > 0) {
      const confirmed = window.confirm(
        `Cela va importer les groupes pre-configures (68). Les groupes existants ne seront pas supprimes. Continuer ?`
      );
      if (!confirmed) return;
    }
    setSeeding(true);
    try {
      const result = await seedTelegramGroups();
      toast.success(`${result.count} groupes importes`);
      await fetchGroups();
    } catch (err) {
      console.error('[AdminTelegramGroups] Seed error:', err);
      toast.error('Erreur lors du seed');
    } finally {
      setSeeding(false);
    }
  };

  /* --- Auto-generate ------------------------------------------------ */
  const handleGenerateContinents = async () => {
    try {
      const result = await apiGenerateContinentGroups(activeRole);
      toast.success(`${result.count} groupes continent crees`);
      await fetchGroups();
    } catch (err) {
      console.error('[AdminTelegramGroups] Generate continent error:', err);
      toast.error('Erreur lors de la generation');
    }
  };

  const handleGenerateLanguages = async () => {
    try {
      const result = await apiGenerateLanguageGroups(activeRole);
      toast.success(`${result.count} groupes langue crees`);
      await fetchGroups();
    } catch (err) {
      console.error('[AdminTelegramGroups] Generate language error:', err);
      toast.error('Erreur lors de la generation');
    }
  };

  /* --- Helpers ------------------------------------------------------ */
  const toggleContinent = (code: string) => {
    setCollapsedContinents((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  };

  const roleActiveCount = (role: TelegramRole) => groups.filter((g) => g.role === role && g.enabled).length;

  const renderGroupCard = (group: TelegramGroup) => (
    <GroupCard
      key={group.id}
      group={group}
      onChange={handleGroupChange}
      onRemove={handleRemove}
    />
  );

  return (
    <div className="bg-zinc-50 dark:bg-zinc-950 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
              <TelegramIcon className="w-7 h-7 text-[#0088cc]" />
              Groupes Telegram
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Gerez les groupes Telegram pour tous les roles affilies
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-[#0088cc]/10 text-[#0088cc]">
              {totalActive} actifs / {totalGroups} total
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <button
            onClick={handleSeedAll}
            disabled={seeding || saving}
            className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 disabled:opacity-50"
          >
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDown className="w-4 h-4" />}
            Seed 68 groupes
          </button>
          {showContinentSection && (
            <button
              onClick={handleGenerateContinents}
              disabled={saving || loading}
              className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 disabled:opacity-50"
            >
              <Wand2 className="w-4 h-4" />
              Auto-generer continents
            </button>
          )}
          <button
            onClick={handleGenerateLanguages}
            disabled={saving || loading}
            className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 disabled:opacity-50"
          >
            <Wand2 className="w-4 h-4" />
            Auto-generer langues
          </button>
          <button
            onClick={fetchGroups}
            disabled={loading}
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900"
            title="Rafraichir"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              hasChanges
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
            }`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Sauvegarder
            {hasChanges && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500" />
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 text-[#0088cc] animate-spin" />
          </div>
        ) : (
          <>
            {/* Role Selector — Visual Cards Row */}
            <div className="flex gap-3 overflow-x-auto pb-2 mb-8">
              {ALL_ROLES.map((role) => {
                const Icon = ROLE_ICONS[role];
                const count = roleActiveCount(role);
                const isActive = activeRole === role;
                return (
                  <button
                    key={role}
                    onClick={() => setActiveRole(role)}
                    className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl text-center transition-all ${
                      isActive
                        ? 'ring-2 ring-[#0088cc] bg-white dark:bg-zinc-800 shadow-sm'
                        : 'bg-white/60 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-[#0088cc]' : 'text-zinc-400 dark:text-zinc-500'}`} />
                    <span className={`text-sm font-semibold ${isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}>
                      {ROLE_LABELS[role]}
                    </span>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      {count} groupe{count !== 1 ? 's' : ''} actif{count !== 1 ? 's' : ''}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* CONTINENT section (chatter) */}
            {showContinentSection && (
              <div className="mb-6">
                {continentGroups.length > 0 ? (
                  <div className="space-y-6">
                    {ALL_CONTINENTS.map((c) => {
                      const matched = continentGroupsByContinent.get(c.code);
                      if (!matched || matched.length === 0) return null;
                      const activeCount = matched.filter((g) => g.enabled).length;
                      const collapsed = collapsedContinents.has(c.code);
                      return (
                        <div key={c.code}>
                          <button
                            onClick={() => toggleContinent(c.code)}
                            className="flex items-center gap-2 mb-3 w-full text-left"
                          >
                            {collapsed
                              ? <ChevronRight className="w-4 h-4 text-zinc-400" />
                              : <ChevronDown className="w-4 h-4 text-zinc-400" />
                            }
                            <span className="text-base">{c.emoji}</span>
                            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{c.name}</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                              {activeCount}/{matched.length} actifs
                            </span>
                          </button>
                          {!collapsed && (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                              {matched.map(renderGroupCard)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Globe className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Aucun groupe continent configure.</p>
                    <button
                      onClick={handleGenerateContinents}
                      className="px-4 py-2 bg-[#0088cc] text-white text-sm font-medium rounded-lg inline-flex items-center gap-2"
                    >
                      <Wand2 className="w-4 h-4" />
                      Auto-generer continents
                    </button>
                  </div>
                )}

                {/* Fallback separator */}
                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                  <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 text-xs">
                    <ArrowDown className="w-3.5 h-3.5" />
                    <span>Fallback groupes par langue</span>
                    <ArrowDown className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                </div>
              </div>
            )}

            {/* LANGUAGE section */}
            <div className="mb-6">
              {languageGroups.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {languageGroups.map(renderGroupCard)}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Globe className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Aucun groupe langue configure.</p>
                  <button
                    onClick={handleGenerateLanguages}
                    className="px-4 py-2 bg-[#0088cc] text-white text-sm font-medium rounded-lg inline-flex items-center gap-2"
                  >
                    <Wand2 className="w-4 h-4" />
                    Auto-generer {SUPPORTED_LANGUAGES.length} groupes
                  </button>
                </div>
              )}
            </div>

            {/* Info box — collapsible */}
            <div className="mt-4">
              <button
                onClick={() => setInfoExpanded(!infoExpanded)}
                className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500"
              >
                <Info className="w-3.5 h-3.5" />
                <span>Comment fonctionne la resolution ?</span>
                {infoExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              {infoExpanded && (
                <div className="mt-2 px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/50 rounded-lg text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
                  <p>1. Continent du user + langue exacte</p>
                  <p>2. Continent du user + langue deduite du pays</p>
                  <p>3. Groupe langue du user (fallback)</p>
                  <p>4. Groupe langue deduite du pays</p>
                  <p>5. Groupe anglais par defaut</p>
                  <p className="pt-1 text-zinc-400 dark:text-zinc-500">
                    {showContinentSection
                      ? 'Chatters : 7 continents x 9 langues + 9 fallback langues.'
                      : 'Ce role utilise uniquement les groupes par langue (niveaux 3-5).'}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminTelegramGroups;
