/**
 * AdminWhatsAppGroups - Page admin pour gérer les groupes WhatsApp affiliés
 *
 * Deux modes selon le rôle :
 *   - Chatter : groupes par CONTINENT (7 groupes couvrent tous les pays)
 *   - Influencer/Blogger/GroupAdmin : groupes par LANGUE uniquement
 *
 * Scalable : supporte chatter, influencer, blogger, groupAdmin
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  input: "w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#25D366] focus:border-transparent transition-all min-h-[44px]",
  label: "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5",
};

const ALL_ROLES: WhatsAppRole[] = ['chatter', 'influencer', 'blogger', 'groupAdmin', 'client', 'lawyer', 'expat'];

/** Rôles qui utilisent des groupes continent (tous les pays couverts par 7 groupes) */
const CONTINENT_ROLES: WhatsAppRole[] = ['chatter'];

/** Vérifie si un rôle utilise des groupes continent */
const isContinentRole = (role: WhatsAppRole) => CONTINENT_ROLES.includes(role);

const DEFAULT_CONFIG: WhatsAppGroupsConfig = {
  groups: [],
  defaultGroupIds: { chatter: '', influencer: '', blogger: '', groupAdmin: '', client: '', lawyer: '', expat: '' },
};

/** Composant pour un groupe (continent ou langue) */
const GroupRow: React.FC<{
  group: WhatsAppGroup;
  isDefault: boolean;
  managers: WhatsAppGroupManager[];
  onUpdate: (updates: Partial<WhatsAppGroup>) => void;
  onRemove: () => void;
  onSetDefault: () => void;
}> = ({ group, isDefault, managers, onUpdate, onRemove, onSetDefault }) => (
  <div
    className={`p-3 sm:p-4 rounded-xl border transition-all ${
      group.enabled
        ? 'border-[#25D366]/30 bg-[#25D366]/5'
        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60'
    }`}
  >
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 items-end">
      {/* Nom */}
      <div className="sm:col-span-4">
        <label className={UI.label}>Nom du groupe</label>
        <input
          type="text"
          value={group.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder={group.type === 'continent' ? 'Chatters Afrique' : 'Chatters Français'}
          className={UI.input}
        />
      </div>

      {/* Langue */}
      <div className="sm:col-span-2">
        <label className={UI.label}>Langue</label>
        <select
          value={group.language}
          onChange={(e) => onUpdate({ language: e.target.value })}
          className={UI.input}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>
      </div>

      {/* Lien WhatsApp */}
      <div className="sm:col-span-4">
        <label className={UI.label}>Lien d'invitation</label>
        <input
          type="url"
          value={group.link}
          onChange={(e) => onUpdate({ link: e.target.value })}
          placeholder="https://chat.whatsapp.com/..."
          className={`${UI.input} ${group.enabled && !group.link ? 'border-amber-400 dark:border-amber-600' : ''}`}
        />
      </div>

      {/* Actions */}
      <div className="sm:col-span-2 flex items-center gap-2 flex-wrap">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={group.enabled}
            onChange={(e) => onUpdate({ enabled: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-[#25D366] focus:ring-[#25D366]"
          />
          <span className="text-xs text-gray-600 dark:text-gray-400">Actif</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer" title="Groupe par défaut">
          <input
            type="radio"
            checked={isDefault}
            onChange={onSetDefault}
            className="w-4 h-4 border-gray-300 text-[#25D366] focus:ring-[#25D366]"
          />
          <span className="text-xs text-gray-600 dark:text-gray-400">Déf.</span>
        </label>
        <button
          onClick={onRemove}
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-auto min-h-[36px] min-w-[36px] flex items-center justify-center"
          title="Supprimer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>

    {/* Managers */}
    {managers.length > 0 && (
      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/50 flex items-center gap-2 flex-wrap">
        <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        {managers.map((m) => (
          <span
            key={m.uid}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs"
            title={`${m.email}${m.phone ? ` • ${m.phone}` : ''}`}
          >
            <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
              {m.displayName.charAt(0).toUpperCase()}
            </span>
            {m.displayName}
          </span>
        ))}
      </div>
    )}
  </div>
);

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

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#25D366]/20 flex items-center justify-center flex-shrink-0">
                <WhatsAppIcon className="w-6 h-6 text-[#25D366]" />
              </div>
              Groupes WhatsApp
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {showContinentSection
                ? 'Groupes par continent (prioritaires) + groupes par langue (fallback).'
                : 'Groupes par langue — un groupe par langue supportée.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSeedAll}
              disabled={seeding || saving}
              className="px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all min-h-[44px] bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
              title="Importer les 68 groupes pré-configurés"
            >
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDown className="w-4 h-4" />}
              Seed 68
            </button>
            <button onClick={fetchConfig} disabled={loading} className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors min-h-[44px]" title="Rafraîchir">
              <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all min-h-[44px] ${
                hasChanges ? 'bg-[#25D366] hover:bg-[#20BD5A] text-white shadow-lg shadow-[#25D366]/20' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Sauvegarder
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#25D366] animate-spin" />
          </div>
        ) : (
          <>
            {/* How it works */}
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-300 flex gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Logique de résolution (5 niveaux) :</strong>
                <ol className="list-decimal list-inside mt-1 space-y-0.5">
                  <li>Groupe continent du user (déduit du pays via mapping)</li>
                  <li>Groupe langue du user (langue sélectionnée à l'inscription)</li>
                  <li>Groupe langue déduite du pays (via mapping pays → langue)</li>
                  <li>Groupe par défaut du rôle (radio "Déf.")</li>
                  <li>Premier groupe actif du rôle</li>
                </ol>
                {showContinentSection ? (
                  <p className="mt-1 text-green-600 dark:text-green-400">
                    Chatters : 7 continents couvrent tous les pays + 9 langues en fallback.
                  </p>
                ) : (
                  <p className="mt-1 text-green-600 dark:text-green-400">
                    Pour ce rôle, seuls les groupes par langue sont utilisés (niveaux 2-5).
                  </p>
                )}
              </div>
            </div>

            {/* Tabs par rôle */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
              {ALL_ROLES.map((role) => {
                const count = config.groups.filter((g) => g.role === role && g.enabled).length;
                const total = config.groups.filter((g) => g.role === role).length;
                return (
                  <button
                    key={role}
                    onClick={() => setActiveRole(role)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all min-h-[44px] flex items-center gap-2 ${
                      activeRole === role
                        ? 'bg-[#25D366] text-white shadow-lg shadow-[#25D366]/20'
                        : 'bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-white/10 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {ROLE_LABELS[role]}
                    {total > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                        activeRole === role ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700'
                      }`}>{count}/{total}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ============ SECTION CONTINENT (chatter uniquement) ============ */}
            {showContinentSection && (
              <div className={`${UI.card} p-4 sm:p-6 mb-4`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-[#25D366]" />
                    Groupes continent × langue
                    <span className="text-xs font-normal text-gray-500 ml-1">({continentGroups.length})</span>
                  </h2>
                  {continentGroups.length === 0 && (
                    <button
                      onClick={autoSeedContinentGroups}
                      className="px-3 py-2 bg-[#25D366] hover:bg-[#20BD5A] text-white text-sm font-medium rounded-xl flex items-center gap-1.5 transition-colors min-h-[40px]"
                    >
                      <Wand2 className="w-4 h-4" />
                      Auto-générer ({ALL_CONTINENTS.length} × {SUPPORTED_LANGUAGES.length} = {ALL_CONTINENTS.length * SUPPORTED_LANGUAGES.length})
                    </button>
                  )}
                </div>

                {/* Liste des groupes continent organisés par continent */}
                {continentGroups.length > 0 ? (
                  <div className="space-y-4 mb-4">
                    {ALL_CONTINENTS.map((c) => {
                      const groups = continentGroupsByContinent.get(c.code);
                      if (!groups || groups.length === 0) return null;
                      const activeCount = groups.filter((g) => g.enabled).length;
                      return (
                        <div key={c.code}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-base">{c.emoji}</span>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{c.name}</span>
                            <span className="text-xs text-gray-400">({activeCount}/{groups.length} actifs)</span>
                          </div>
                          <div className="space-y-2 pl-1 border-l-2 border-[#25D366]/20 ml-2">
                            {groups.map((group) => (
                              <GroupRow
                                key={group.id}
                                group={group}
                                isDefault={config.defaultGroupIds[activeRole] === group.id}
                                managers={group.managers || []}
                                onUpdate={(u) => updateGroup(group.id, u)}
                                onRemove={() => removeGroup(group.id)}
                                onSetDefault={() => updateConfig({
                                  defaultGroupIds: { ...config.defaultGroupIds, [activeRole]: group.id },
                                })}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 mb-4">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#25D366]/10 flex items-center justify-center">
                      <Globe className="w-7 h-7 text-[#25D366]" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mb-1">Aucun groupe continent × langue.</p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm">
                      Cliquez "Auto-générer" pour créer les {ALL_CONTINENTS.length * SUPPORTED_LANGUAGES.length} combinaisons.
                    </p>
                  </div>
                )}

                {/* Ajouter un groupe continent + langue manuellement */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Ajouter un groupe continent + langue
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={newContinentCode}
                      onChange={(e) => setNewContinentCode(e.target.value)}
                      className={`${UI.input} flex-1`}
                    >
                      <option value="">Continent...</option>
                      {ALL_CONTINENTS.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.emoji} {c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={newContinentLang}
                      onChange={(e) => setNewContinentLang(e.target.value)}
                      className={`${UI.input} sm:max-w-[180px]`}
                    >
                      <option value="">Langue...</option>
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.flag} {lang.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={addContinentGroup}
                      disabled={!newContinentCode || !newContinentLang}
                      className="px-5 py-2.5 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors min-h-[44px] whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Flèche de fallback (chatters : continent → langue) */}
            {showContinentSection && (
              <div className="flex justify-center my-2">
                <div className="flex items-center gap-2 text-gray-400 text-xs">
                  <ArrowDown className="w-4 h-4" />
                  <span>Si pas de groupe continent, fallback vers :</span>
                  <ArrowDown className="w-4 h-4" />
                </div>
              </div>
            )}

            {/* ============ SECTION LANGUE ============ */}
            {showLanguageSection && (
              <div className={`${UI.card} p-4 sm:p-6`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Languages className={`w-5 h-5 ${showContinentSection ? 'text-amber-500' : 'text-[#25D366]'}`} />
                    Groupes par langue
                    {showContinentSection && <span className="text-xs font-normal text-amber-500 ml-1">(fallback)</span>}
                    <span className="text-xs font-normal text-gray-500 ml-1">({languageGroups.length}/{SUPPORTED_LANGUAGES.length})</span>
                  </h2>
                  {languageGroups.length === 0 && (
                    <button
                      onClick={autoSeedLanguageFallbacks}
                      className="px-3 py-2 bg-[#25D366] hover:bg-[#20BD5A] text-white text-sm font-medium rounded-xl flex items-center gap-1.5 transition-colors min-h-[40px]"
                    >
                      <Wand2 className="w-4 h-4" />
                      Auto-générer ({SUPPORTED_LANGUAGES.length} langues)
                    </button>
                  )}
                </div>

                {languageGroups.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#25D366]/10 flex items-center justify-center">
                      <Languages className="w-7 h-7 text-[#25D366]" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mb-1">Aucun groupe langue.</p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm">
                      Cliquez "Auto-générer" pour créer les {SUPPORTED_LANGUAGES.length} groupes.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {languageGroups.map((group) => (
                      <GroupRow
                        key={group.id}
                        group={group}
                        isDefault={config.defaultGroupIds[activeRole] === group.id}
                        managers={group.managers || []}
                        onUpdate={(u) => updateGroup(group.id, u)}
                        onRemove={() => removeGroup(group.id)}
                        onSetDefault={() => updateConfig({
                          defaultGroupIds: { ...config.defaultGroupIds, [activeRole]: group.id },
                        })}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminWhatsAppGroups;
