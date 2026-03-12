/**
 * AdminWhatsAppGroups - Dashboard admin pour gérer les groupes WhatsApp affiliés
 * Design card-based, intuitif et visuel
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Plus,
  Trash2,
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
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { WhatsAppIcon } from './WhatsAppGroupScreen';
import {
  getWhatsAppGroupsConfig,
  saveWhatsAppGroupsConfig,
  generateLanguageFallbackGroups,
  generateContinentGroups,
  createContinentGroup,
} from './whatsappGroupsService';
import { seedWhatsAppGroups } from './seedWhatsAppGroups';
import type { WhatsAppGroupsConfig, WhatsAppGroup, WhatsAppRole } from './types';
import { SUPPORTED_LANGUAGES, ROLE_LABELS, ALL_CONTINENTS } from './types';

const ALL_ROLES: WhatsAppRole[] = ['chatter', 'influencer', 'blogger', 'groupAdmin', 'client', 'lawyer', 'expat'];
const CONTINENT_ROLES: WhatsAppRole[] = ['chatter'];
const isContinentRole = (role: WhatsAppRole) => CONTINENT_ROLES.includes(role);

const ROLE_ICONS: Record<WhatsAppRole, React.FC<{ className?: string }>> = {
  chatter: MessageCircle,
  influencer: TrendingUp,
  blogger: FileText,
  groupAdmin: Users,
  client: User,
  lawyer: Scale,
  expat: Heart,
};

const DEFAULT_CONFIG: WhatsAppGroupsConfig = {
  groups: [],
  defaultGroupIds: { chatter: '', influencer: '', blogger: '', groupAdmin: '', client: '', lawyer: '', expat: '' },
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
      checked ? 'bg-[#25D366]' : 'bg-zinc-300 dark:bg-zinc-600'
    }`}
  >
    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
  </button>
);

/* ------------------------------------------------------------------ */
/*  Group Card                                                         */
/* ------------------------------------------------------------------ */
const GroupCard: React.FC<{
  group: WhatsAppGroup;
  isDefault: boolean;
  onUpdate: (updates: Partial<WhatsAppGroup>) => void;
  onRemove: () => void;
  onCopy: () => void;
}> = ({ group, isDefault, onUpdate, onRemove, onCopy }) => {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [copied, setCopied] = useState(false);

  const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === group.language);
  const continentInfo = ALL_CONTINENTS.find((c) => c.code === group.continentCode);
  const managers = group.managers || [];
  const linkValid = !group.link || group.link.startsWith('https://chat.whatsapp.com/');

  const handleCopy = () => {
    if (group.link) {
      navigator.clipboard.writeText(group.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      onCopy();
    }
  };

  const commitName = () => {
    if (editName.trim() && editName !== group.name) {
      onUpdate({ name: editName.trim() });
    } else {
      setEditName(group.name);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitName();
    if (e.key === 'Escape') { setEditName(group.name); setEditing(false); }
  };

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700/50 p-5 ${!group.enabled ? 'opacity-50' : ''}`}>
      {/* Top row: toggle + default badge */}
      <div className="flex items-center justify-between mb-3">
        <Toggle checked={group.enabled} onChange={(v) => onUpdate({ enabled: v })} />
        {isDefault && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50">
            Par defaut
          </span>
        )}
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
            className="w-full text-base font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800 rounded-md px-2 py-1 border border-[#25D366] focus:outline-none focus:ring-1 focus:ring-[#25D366]"
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
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
          group.type === 'continent'
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
        }`}>
          {group.type === 'continent' ? 'Continent' : 'Langue'}
        </span>
        {continentInfo && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {continentInfo.emoji} {continentInfo.name}
          </span>
        )}
      </div>

      {/* WhatsApp link pill */}
      <div className="mb-3">
        {group.link ? (
          <button
            onClick={handleCopy}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium max-w-full ${
              linkValid
                ? 'bg-[#25D366]/10 text-[#25D366] dark:bg-[#25D366]/20'
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
            }`}
          >
            {copied ? <Check className="w-3 h-3 shrink-0" /> : <Copy className="w-3 h-3 shrink-0" />}
            <span className="truncate">{group.link.replace('https://chat.whatsapp.com/', '.../')}</span>
          </button>
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800">
            Aucun lien
          </span>
        )}
      </div>

      {/* Managers */}
      <div className="mb-4">
        {managers.length > 0 ? (
          <div className="flex items-center gap-1" title={managers.map((m) => m.displayName).join(', ')}>
            {managers.slice(0, 3).map((m, i) => (
              <span key={i} className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#25D366]/20 text-[#25D366] text-[10px] font-bold">
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
          <Copy className="w-3 h-3" />
          Copier lien
        </button>
        <button onClick={onRemove} className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1 ml-auto">
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
const AdminWhatsAppGroups: React.FC = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState<WhatsAppGroupsConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeRole, setActiveRole] = useState<WhatsAppRole>('chatter');
  const [collapsedContinents, setCollapsedContinents] = useState<Set<string>>(new Set());
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [newContinentCode, setNewContinentCode] = useState('');
  const [newContinentLang, setNewContinentLang] = useState('');

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    const data = await getWhatsAppGroupsConfig();
    if (data) {
      setConfig({ ...data, defaultGroupIds: data.defaultGroupIds || DEFAULT_CONFIG.defaultGroupIds });
    }
    setHasChanges(false);
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const updateConfig = (updates: Partial<WhatsAppGroupsConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const continentGroups = useMemo(() => config.groups.filter((g) => g.role === activeRole && g.type === 'continent'), [config.groups, activeRole]);
  const languageGroups = useMemo(() => config.groups.filter((g) => g.role === activeRole && g.type === 'language'), [config.groups, activeRole]);

  const usedContinentLangCombos = useMemo(() => new Set(continentGroups.map((g) => `${g.continentCode}_${g.language}`)), [continentGroups]);

  const continentGroupsByContinent = useMemo(() => {
    const map = new Map<string, WhatsAppGroup[]>();
    for (const c of ALL_CONTINENTS) {
      const groups = continentGroups.filter((g) => g.continentCode === c.code);
      if (groups.length > 0) map.set(c.code, groups);
    }
    return map;
  }, [continentGroups]);

  const showContinentSection = isContinentRole(activeRole);
  const totalActive = config.groups.filter((g) => g.enabled).length;
  const totalGroups = config.groups.length;

  const updateGroup = (groupId: string, updates: Partial<WhatsAppGroup>) => {
    const groups = config.groups.map((g) => g.id === groupId ? { ...g, ...updates } : g);
    updateConfig({ groups });
  };

  const removeGroup = (groupId: string) => {
    updateConfig({ groups: config.groups.filter((g) => g.id !== groupId) });
  };

  const autoSeedContinentGroups = () => {
    const existing = config.groups.filter((g) => g.role === activeRole && g.type === 'continent');
    if (existing.length > 0) { toast.error("Des groupes continent existent deja. Supprimez-les d'abord."); return; }
    const newGroups = generateContinentGroups(activeRole);
    const defaultId = newGroups.find((g) => g.language === 'en' && g.continentCode === 'AF')?.id || newGroups[0]?.id || '';
    updateConfig({ groups: [...config.groups, ...newGroups], defaultGroupIds: { ...config.defaultGroupIds, [activeRole]: defaultId } });
    toast.success(`${newGroups.length} groupes continent crees.`);
  };

  const autoSeedLanguageFallbacks = () => {
    const existing = config.groups.filter((g) => g.role === activeRole && g.type === 'language');
    if (existing.length > 0) { toast.error("Des groupes langue existent deja. Supprimez-les d'abord."); return; }
    const newGroups = generateLanguageFallbackGroups(activeRole);
    const defaultId = newGroups.find((g) => g.language === 'en')?.id || newGroups[0]?.id || '';
    updateConfig({ groups: [...config.groups, ...newGroups], defaultGroupIds: { ...config.defaultGroupIds, [activeRole]: defaultId } });
    toast.success(`${SUPPORTED_LANGUAGES.length} groupes langue crees.`);
  };

  const addContinentGroup = () => {
    if (!newContinentCode || !newContinentLang) return;
    if (usedContinentLangCombos.has(`${newContinentCode}_${newContinentLang}`)) { toast.error('Cette combinaison existe deja.'); return; }
    const newGroup = createContinentGroup(activeRole, newContinentCode, newContinentLang);
    updateConfig({ groups: [...config.groups, newGroup] });
    setNewContinentCode('');
    setNewContinentLang('');
  };

  const handleSeedAll = async () => {
    if (config.groups.length > 0) {
      const confirmed = window.confirm(`Cela va REMPLACER les ${config.groups.length} groupes existants par les 68 groupes pre-configures. Continuer ?`);
      if (!confirmed) return;
    }
    setSeeding(true);
    try {
      const result = await seedWhatsAppGroups(user?.uid || '');
      toast.success(`${result.total} groupes importes (${result.enabled} actifs, ${result.disabled} inactifs)`);
      await fetchConfig();
    } catch (err) {
      console.error('[Admin WhatsApp] Seed error:', err);
      toast.error('Erreur lors du seed');
    } finally {
      setSeeding(false);
    }
  };

  const handleSave = async () => {
    const enabledGroups = config.groups.filter((g) => g.enabled);
    for (const group of enabledGroups) {
      if (!group.name.trim()) { toast.error('Chaque groupe actif doit avoir un nom'); return; }
      if (!group.link.trim() || !group.link.startsWith('https://chat.whatsapp.com/')) {
        toast.error(`Lien invalide pour "${group.name}". Doit commencer par https://chat.whatsapp.com/`);
        return;
      }
    }
    setSaving(true);
    try {
      await saveWhatsAppGroupsConfig(config, user?.uid || '');
      toast.success('Configuration sauvegardee');
      setHasChanges(false);
    } catch (err) {
      console.error('[Admin WhatsApp] Save error:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const toggleContinent = (code: string) => {
    setCollapsedContinents((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  };

  const roleActiveCount = (role: WhatsAppRole) => config.groups.filter((g) => g.role === role && g.enabled).length;

  const renderGroupCard = (group: WhatsAppGroup) => (
    <GroupCard
      key={group.id}
      group={group}
      isDefault={config.defaultGroupIds[activeRole] === group.id}
      onUpdate={(updates) => updateGroup(group.id, updates)}
      onRemove={() => removeGroup(group.id)}
      onCopy={() => {}}
    />
  );

  return (
    <AdminLayout>
      <div className="bg-zinc-50 dark:bg-zinc-950 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                <WhatsAppIcon className="w-7 h-7 text-[#25D366]" />
                Groupes WhatsApp
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Gerez les groupes WhatsApp pour tous les roles affilies
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-[#25D366]/10 text-[#25D366]">
                {totalActive} actifs / {totalGroups} total
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={handleSeedAll}
              disabled={seeding || saving}
              className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 disabled:opacity-50"
            >
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDown className="w-4 h-4" />}
              Seed 68 groupes
            </button>
            <button
              onClick={fetchConfig}
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
                  ? 'bg-[#25D366] text-white'
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
              <Loader2 className="w-6 h-6 text-[#25D366] animate-spin" />
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
                      className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl text-center ${
                        isActive
                          ? 'ring-2 ring-[#25D366] bg-white dark:bg-zinc-800 shadow-sm'
                          : 'bg-white/60 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-[#25D366]' : 'text-zinc-400 dark:text-zinc-500'}`} />
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
                        const groups = continentGroupsByContinent.get(c.code);
                        if (!groups || groups.length === 0) return null;
                        const activeCount = groups.filter((g) => g.enabled).length;
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
                                {activeCount}/{groups.length} actifs
                              </span>
                            </button>
                            {!collapsed && (
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {groups.map(renderGroupCard)}
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
                        onClick={autoSeedContinentGroups}
                        className="px-4 py-2 bg-[#25D366] text-white text-sm font-medium rounded-lg inline-flex items-center gap-2"
                      >
                        <Wand2 className="w-4 h-4" />
                        Auto-generer {ALL_CONTINENTS.length} x {SUPPORTED_LANGUAGES.length} groupes
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
                      onClick={autoSeedLanguageFallbacks}
                      className="px-4 py-2 bg-[#25D366] text-white text-sm font-medium rounded-lg inline-flex items-center gap-2"
                    >
                      <Wand2 className="w-4 h-4" />
                      Auto-generer {SUPPORTED_LANGUAGES.length} groupes
                    </button>
                  </div>
                )}
              </div>

              {/* Add group — chatter only */}
              {showContinentSection && (
                <div className="mb-6 p-5 bg-white dark:bg-zinc-900 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-700">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-[#25D366]" />
                    Ajouter un groupe continent + langue
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={newContinentCode}
                      onChange={(e) => setNewContinentCode(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#25D366]"
                    >
                      <option value="">Continent...</option>
                      {ALL_CONTINENTS.map((c) => (
                        <option key={c.code} value={c.code}>{c.emoji} {c.name}</option>
                      ))}
                    </select>
                    <select
                      value={newContinentLang}
                      onChange={(e) => setNewContinentLang(e.target.value)}
                      className="sm:w-44 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#25D366]"
                    >
                      <option value="">Langue...</option>
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>{lang.flag} {lang.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={addContinentGroup}
                      disabled={!newContinentCode || !newContinentLang}
                      className="px-4 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter
                    </button>
                  </div>
                </div>
              )}

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
                    <p>5. Groupe par defaut du role (defaultGroupIds)</p>
                    <p className="pt-1 text-zinc-400 dark:text-zinc-500">
                      {showContinentSection
                        ? 'Chatters : 7 continents + 9 langues en fallback.'
                        : 'Ce role utilise uniquement les groupes par langue (niveaux 2-5).'}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminWhatsAppGroups;
