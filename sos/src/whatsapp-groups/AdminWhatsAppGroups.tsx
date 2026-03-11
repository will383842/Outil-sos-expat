/**
 * AdminWhatsAppGroups - Page admin pour gérer les groupes WhatsApp affiliés
 *
 * Deux modes selon le rôle :
 *   - Chatter : groupes par CONTINENT (7 groupes couvrent tous les pays)
 *   - Influencer/Blogger/GroupAdmin : groupes par LANGUE uniquement
 *
 * Scalable : supporte chatter, influencer, blogger, groupAdmin
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  Languages,
  RefreshCw,
  AlertCircle,
  Wand2,
  Globe,
  ArrowDown,
  Users,
  MoreHorizontal,
  Copy,
  Check,
  Info,
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
import type { WhatsAppGroupsConfig, WhatsAppGroup, WhatsAppRole, WhatsAppGroupManager } from './types';
import { SUPPORTED_LANGUAGES, ROLE_LABELS, ALL_CONTINENTS } from './types';

const ALL_ROLES: WhatsAppRole[] = ['chatter', 'influencer', 'blogger', 'groupAdmin', 'client', 'lawyer', 'expat'];

/** Rôles qui utilisent des groupes continent (tous les pays couverts par 7 groupes) */
const CONTINENT_ROLES: WhatsAppRole[] = ['chatter'];

/** Vérifie si un rôle utilise des groupes continent */
const isContinentRole = (role: WhatsAppRole) => CONTINENT_ROLES.includes(role);

const DEFAULT_CONFIG: WhatsAppGroupsConfig = {
  groups: [],
  defaultGroupIds: { chatter: '', influencer: '', blogger: '', groupAdmin: '', client: '', lawyer: '', expat: '' },
};

/* ------------------------------------------------------------------ */
/*  Dropdown menu for row actions                                      */
/* ------------------------------------------------------------------ */
const RowActions: React.FC<{
  group: WhatsAppGroup;
  onRemove: () => void;
}> = ({ group, onRemove }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const copyLink = () => {
    if (group.link) {
      navigator.clipboard.writeText(group.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-md text-zinc-400 dark:text-zinc-500"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-40 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1">
          <button
            onClick={copyLink}
            disabled={!group.link}
            className="w-full px-3 py-1.5 text-left text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-2 disabled:opacity-40"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            Copier lien
          </button>
          <button
            onClick={() => { onRemove(); setOpen(false); }}
            className="w-full px-3 py-1.5 text-left text-sm text-red-600 dark:text-red-400 flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Toggle switch                                                      */
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
    <span
      className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ${
        checked ? 'translate-x-4' : 'translate-x-0'
      }`}
    />
  </button>
);

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

  // Ajout continent + langue
  const [newContinentCode, setNewContinentCode] = useState('');
  const [newContinentLang, setNewContinentLang] = useState('');

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    const data = await getWhatsAppGroupsConfig();
    if (data) {
      setConfig({
        ...data,
        defaultGroupIds: data.defaultGroupIds || DEFAULT_CONFIG.defaultGroupIds,
      });
    }
    setHasChanges(false);
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const updateConfig = (updates: Partial<WhatsAppGroupsConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  // Groupes filtrés par rôle et type
  const continentGroups = useMemo(
    () => config.groups.filter((g) => g.role === activeRole && g.type === 'continent'),
    [config.groups, activeRole]
  );
  const languageGroups = useMemo(
    () => config.groups.filter((g) => g.role === activeRole && g.type === 'language'),
    [config.groups, activeRole]
  );

  // Combinaisons continent+langue déjà utilisées
  const usedContinentLangCombos = useMemo(
    () => new Set(continentGroups.map((g) => `${g.continentCode}_${g.language}`)),
    [continentGroups]
  );

  // Groupes continent organisés par continent pour l'affichage
  const continentGroupsByContinent = useMemo(() => {
    const map = new Map<string, WhatsAppGroup[]>();
    for (const c of ALL_CONTINENTS) {
      const groups = continentGroups.filter((g) => g.continentCode === c.code);
      if (groups.length > 0) map.set(c.code, groups);
    }
    return map;
  }, [continentGroups]);

  const showContinentSection = isContinentRole(activeRole);
  const showLanguageSection = true; // Tous les rôles ont des groupes langue

  // Stats
  const totalActive = config.groups.filter((g) => g.enabled).length;
  const totalGroups = config.groups.length;

  // --- Groupe CRUD ---
  const updateGroup = (groupId: string, updates: Partial<WhatsAppGroup>) => {
    const groups = config.groups.map((g) => g.id === groupId ? { ...g, ...updates } : g);
    updateConfig({ groups });
  };

  const removeGroup = (groupId: string) => {
    updateConfig({ groups: config.groups.filter((g) => g.id !== groupId) });
  };

  // --- Auto-seed continents (7 continents × 9 langues = 63 groupes) ---
  const autoSeedContinentGroups = () => {
    const existing = config.groups.filter((g) => g.role === activeRole && g.type === 'continent');
    if (existing.length > 0) {
      toast.error('Des groupes continent existent déjà. Supprimez-les d\'abord.');
      return;
    }
    const newGroups = generateContinentGroups(activeRole);
    const defaultId = newGroups.find((g) => g.language === 'en' && g.continentCode === 'AF')?.id || newGroups[0]?.id || '';
    updateConfig({
      groups: [...config.groups, ...newGroups],
      defaultGroupIds: { ...config.defaultGroupIds, [activeRole]: defaultId },
    });
    toast.success(`${newGroups.length} groupes continent×langue créés (${ALL_CONTINENTS.length} continents × ${SUPPORTED_LANGUAGES.length} langues). Activez ceux dont vous avez besoin.`);
  };

  // --- Auto-seed langues ---
  const autoSeedLanguageFallbacks = () => {
    const existing = config.groups.filter((g) => g.role === activeRole && g.type === 'language');
    if (existing.length > 0) {
      toast.error('Des groupes langue existent déjà. Supprimez-les d\'abord.');
      return;
    }
    const newGroups = generateLanguageFallbackGroups(activeRole);
    const defaultId = newGroups.find((g) => g.language === 'en')?.id || newGroups[0]?.id || '';
    updateConfig({
      groups: [...config.groups, ...newGroups],
      defaultGroupIds: { ...config.defaultGroupIds, [activeRole]: defaultId },
    });
    toast.success(`${SUPPORTED_LANGUAGES.length} groupes langue créés. Ajoutez les liens WhatsApp puis activez-les.`);
  };

  // --- Ajouter un groupe continent + langue ---
  const addContinentGroup = () => {
    if (!newContinentCode || !newContinentLang) return;
    const comboKey = `${newContinentCode}_${newContinentLang}`;
    if (usedContinentLangCombos.has(comboKey)) {
      toast.error('Cette combinaison continent + langue existe déjà.');
      return;
    }
    const newGroup = createContinentGroup(activeRole, newContinentCode, newContinentLang);
    updateConfig({ groups: [...config.groups, newGroup] });
    setNewContinentCode('');
    setNewContinentLang('');
  };

  // --- Seed all 68 groups from embedded config ---
  const handleSeedAll = async () => {
    if (config.groups.length > 0) {
      const confirmed = window.confirm(
        `⚠️ Cela va REMPLACER les ${config.groups.length} groupes existants par les 68 groupes pré-configurés (50 avec liens). Continuer ?`
      );
      if (!confirmed) return;
    }
    setSeeding(true);
    try {
      const result = await seedWhatsAppGroups(user?.uid || '');
      toast.success(`${result.total} groupes importés (${result.enabled} actifs, ${result.disabled} inactifs)`);
      await fetchConfig();
    } catch (err) {
      console.error('[Admin WhatsApp] Seed error:', err);
      toast.error('Erreur lors du seed');
    } finally {
      setSeeding(false);
    }
  };

  // --- Save ---
  const handleSave = async () => {
    const enabledGroups = config.groups.filter((g) => g.enabled);
    for (const group of enabledGroups) {
      if (!group.name.trim()) {
        toast.error('Chaque groupe actif doit avoir un nom');
        return;
      }
      if (!group.link.trim() || !group.link.startsWith('https://chat.whatsapp.com/')) {
        toast.error(`Lien invalide pour "${group.name}". Doit commencer par https://chat.whatsapp.com/`);
        return;
      }
    }

    setSaving(true);
    try {
      await saveWhatsAppGroupsConfig(config, user?.uid || '');
      toast.success('Configuration sauvegardée');
      setHasChanges(false);
    } catch (err) {
      console.error('[Admin WhatsApp] Save error:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Render helpers                                                    */
  /* ---------------------------------------------------------------- */

  const renderTableRow = (group: WhatsAppGroup) => {
    const isDefault = config.defaultGroupIds[activeRole] === group.id;
    const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === group.language);
    const continentInfo = ALL_CONTINENTS.find((c) => c.code === group.continentCode);
    const managers = group.managers || [];
    const linkValid = group.link.startsWith('https://chat.whatsapp.com/');

    return (
      <tr key={group.id} className={`border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${!group.enabled ? 'opacity-50' : ''}`}>
        {/* Status toggle */}
        <td className="px-3 py-3">
          <Toggle checked={group.enabled} onChange={(v) => updateGroup(group.id, { enabled: v })} />
        </td>

        {/* Name */}
        <td className="px-3 py-3">
          <input
            type="text"
            value={group.name}
            onChange={(e) => updateGroup(group.id, { name: e.target.value })}
            placeholder="Nom du groupe"
            className="w-full bg-zinc-50 dark:bg-zinc-800/50 rounded-md px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 focus:ring-1 focus:ring-[#25D366] focus:border-transparent focus:outline-none"
          />
        </td>

        {/* Language */}
        <td className="px-3 py-3">
          <select
            value={group.language}
            onChange={(e) => updateGroup(group.id, { language: e.target.value })}
            className="bg-zinc-50 dark:bg-zinc-800/50 rounded-md px-2 py-1 text-sm text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 focus:ring-1 focus:ring-[#25D366] focus:border-transparent focus:outline-none cursor-pointer"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
        </td>

        {/* Type badge */}
        <td className="px-3 py-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            group.type === 'continent'
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
          }`}>
            {group.type === 'continent' ? 'Continent' : 'Langue'}
          </span>
        </td>

        {/* Continent */}
        <td className="px-3 py-3 text-sm text-zinc-500 dark:text-zinc-400">
          {continentInfo ? `${continentInfo.emoji} ${continentInfo.name}` : '—'}
        </td>

        {/* Link */}
        <td className="px-3 py-3">
          <input
            type="url"
            value={group.link}
            onChange={(e) => updateGroup(group.id, { link: e.target.value })}
            placeholder="https://chat.whatsapp.com/..."
            className={`w-full bg-zinc-50 dark:bg-zinc-800/50 rounded-md px-2 py-1 text-sm focus:outline-none ${
              group.enabled && group.link && !linkValid
                ? 'text-red-500 border border-red-300 focus:ring-1 focus:ring-red-400 focus:border-transparent'
                : 'text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 focus:ring-1 focus:ring-[#25D366] focus:border-transparent'
            }`}
          />
        </td>

        {/* Default radio */}
        <td className="px-3 py-3 text-center">
          <input
            type="radio"
            checked={isDefault}
            onChange={() => updateConfig({
              defaultGroupIds: { ...config.defaultGroupIds, [activeRole]: group.id },
            })}
            className="w-3.5 h-3.5 text-[#25D366] border-zinc-300 dark:border-zinc-600 focus:ring-[#25D366] focus:ring-offset-0 cursor-pointer"
          />
        </td>

        {/* Managers */}
        <td className="px-3 py-3 text-center">
          {managers.length > 0 ? (
            <span className="inline-flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400" title={managers.map((m) => m.displayName).join(', ')}>
              <Users className="w-3.5 h-3.5" />
              {managers.length}
            </span>
          ) : (
            <span className="text-sm text-zinc-300 dark:text-zinc-600">0</span>
          )}
        </td>

        {/* Actions */}
        <td className="px-3 py-3">
          <RowActions group={group} onRemove={() => removeGroup(group.id)} />
        </td>
      </tr>
    );
  };

  const renderTable = (groups: WhatsAppGroup[], sectionLabel?: string) => {
    if (groups.length === 0) return null;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="px-3 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-16">Actif</th>
              <th className="px-3 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Nom</th>
              <th className="px-3 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-32">Langue</th>
              <th className="px-3 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-24">Type</th>
              <th className="px-3 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-36">Continent</th>
              <th className="px-3 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Lien</th>
              <th className="px-3 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-14 text-center">Def.</th>
              <th className="px-3 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-16 text-center">Mgrs</th>
              <th className="px-3 py-2.5 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => renderTableRow(g))}
          </tbody>
        </table>
      </div>
    );
  };

  /* ---------------------------------------------------------------- */
  /*  JSX                                                              */
  /* ---------------------------------------------------------------- */

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ---- Header ---- */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
              <WhatsAppIcon className="w-7 h-7 text-[#25D366]" />
              Groupes WhatsApp
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {totalActive} actifs sur {totalGroups} groupes configurés
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSeedAll}
              disabled={seeding || saving}
              className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 disabled:opacity-50"
              title="Importer les 68 groupes pré-configurés"
            >
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDown className="w-4 h-4" />}
              Seed 68
            </button>
            <button
              onClick={fetchConfig}
              disabled={loading}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900"
              title="Rafraîchir"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                hasChanges
                  ? 'bg-[#25D366] text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
              }`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Sauvegarder
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 text-[#25D366] animate-spin" />
          </div>
        ) : (
          <>
            {/* ---- Segmented control (role tabs) ---- */}
            <div className="mb-8">
              <div className="inline-flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 gap-0.5 overflow-x-auto">
                {ALL_ROLES.map((role) => {
                  const count = config.groups.filter((g) => g.role === role && g.enabled).length;
                  const isActive = activeRole === role;
                  return (
                    <button
                      key={role}
                      onClick={() => setActiveRole(role)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-600 shadow-sm'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {ROLE_LABELS[role]}
                      {count > 0 && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-[#25D366]/10 text-[#25D366]'
                            : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ---- CONTINENT section (chatter only) ---- */}
            {showContinentSection && (
              <div className="mb-6">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/50 rounded-xl">
                  {/* Section header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-[#25D366]" />
                      <div>
                        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          Groupes continent x langue
                        </h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{continentGroups.length} groupes</p>
                      </div>
                    </div>
                    {continentGroups.length === 0 && (
                      <button
                        onClick={autoSeedContinentGroups}
                        className="px-3 py-1.5 bg-[#25D366] text-white text-sm font-medium rounded-lg flex items-center gap-1.5"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        Auto-generer ({ALL_CONTINENTS.length} x {SUPPORTED_LANGUAGES.length})
                      </button>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {continentGroups.length > 0 ? (
                      <div className="space-y-8">
                        {ALL_CONTINENTS.map((c) => {
                          const groups = continentGroupsByContinent.get(c.code);
                          if (!groups || groups.length === 0) return null;
                          const activeCount = groups.filter((g) => g.enabled).length;
                          return (
                            <div key={c.code}>
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-base">{c.emoji}</span>
                                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{c.name}</span>
                                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                                  {activeCount}/{groups.length} actifs
                                </span>
                              </div>
                              {renderTable(groups)}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Globe className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Aucun groupe continent.</p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                          Cliquez "Auto-generer" pour creer les {ALL_CONTINENTS.length * SUPPORTED_LANGUAGES.length} combinaisons.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Manual add form */}
                  <div className="px-6 pb-6">
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700">
                      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-3 flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> Ajouter un groupe continent + langue
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          value={newContinentCode}
                          onChange={(e) => setNewContinentCode(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#25D366]"
                        >
                          <option value="">Continent...</option>
                          {ALL_CONTINENTS.map((c) => (
                            <option key={c.code} value={c.code}>{c.emoji} {c.name}</option>
                          ))}
                        </select>
                        <select
                          value={newContinentLang}
                          onChange={(e) => setNewContinentLang(e.target.value)}
                          className="sm:w-44 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#25D366]"
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
                  </div>
                </div>
              </div>
            )}

            {/* Fallback arrow (chatters) */}
            {showContinentSection && (
              <div className="flex justify-center my-3">
                <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 text-xs">
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>Fallback si pas de groupe continent</span>
                  <ArrowDown className="w-3.5 h-3.5" />
                </div>
              </div>
            )}

            {/* ---- LANGUAGE section ---- */}
            {showLanguageSection && (
              <div className="mb-6">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/50 rounded-xl">
                  {/* Section header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                      <Languages className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                      <div>
                        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          Groupes par langue
                          {showContinentSection && (
                            <span className="ml-2 text-xs font-normal text-zinc-400">(fallback)</span>
                          )}
                        </h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {languageGroups.length}/{SUPPORTED_LANGUAGES.length} langues
                        </p>
                      </div>
                    </div>
                    {languageGroups.length === 0 && (
                      <button
                        onClick={autoSeedLanguageFallbacks}
                        className="px-3 py-1.5 bg-[#25D366] text-white text-sm font-medium rounded-lg flex items-center gap-1.5"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        Auto-generer ({SUPPORTED_LANGUAGES.length} langues)
                      </button>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {languageGroups.length === 0 ? (
                      <div className="text-center py-12">
                        <Languages className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Aucun groupe langue.</p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                          Cliquez "Auto-generer" pour creer les {SUPPORTED_LANGUAGES.length} groupes.
                        </p>
                      </div>
                    ) : (
                      renderTable(languageGroups)
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ---- Info box ---- */}
            <div className="flex items-start gap-3 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 rounded-lg text-xs text-zinc-500 dark:text-zinc-400">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-zinc-400" />
              <div>
                <span className="font-medium text-zinc-600 dark:text-zinc-300">Resolution (5 niveaux) :</span>{' '}
                1. Continent du user &rarr; 2. Langue du user &rarr; 3. Langue deduite du pays &rarr; 4. Groupe par defaut du role &rarr; 5. Premier groupe actif.
                {showContinentSection
                  ? ' Chatters : 7 continents + 9 langues en fallback.'
                  : ' Ce role utilise uniquement les groupes par langue (niveaux 2-5).'}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminWhatsAppGroups;
