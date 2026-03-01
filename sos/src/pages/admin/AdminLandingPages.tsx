/**
 * AdminLandingPages - Dashboard admin pour gérer les configs landing pages par pays
 *
 * Vue matrice : pays (groupés par région) × 4 rôles avec statuts colorés
 * Modal d'édition : paiements, devise, témoignages, SEO, statut
 * Duplication entre pays, filtres, stats
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type {
  LandingRole,
  ConfigStatus,
  CountryLandingConfig,
  PaymentMethodConfig,
  CurrencyConfig,
  TestimonialConfig,
  SEOOverrides,
  GeoRegion,
} from '@/country-landing/types';
import {
  COUNTRIES_CATALOG,
  REGION_LABELS,
  REGION_PRESETS,
  buildDocumentId,
  getDefaultConfigForCountry,
  formatAmount,
} from '@/country-landing/defaults';
import {
  Globe,
  Search,
  Plus,
  Copy,
  ExternalLink,
  X,
  Save,
  Trash2,
  ChevronDown,
  ChevronRight,
  Link,
  CheckCircle,
} from 'lucide-react';

// ============================================================================
// CONSTANTS
// ============================================================================

const ROLES: LandingRole[] = ['chatter', 'influencer', 'blogger', 'groupadmin'];
const ROLE_LABELS: Record<LandingRole, string> = {
  chatter: 'Chatter',
  influencer: 'Influencer',
  blogger: 'Blogger',
  groupadmin: 'GroupAdmin',
};
const ROLE_COLORS: Record<LandingRole, string> = {
  chatter: 'amber',
  influencer: 'red',
  blogger: 'purple',
  groupadmin: 'blue',
};

const STATUS_COLORS: Record<ConfigStatus | 'none', { bg: string; text: string; label: string }> = {
  published: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Publié' },
  review: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'Review' },
  draft: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', label: 'Brouillon' },
  todo: { bg: 'bg-gray-100 dark:bg-gray-700/30', text: 'text-gray-600 dark:text-gray-400', label: 'À faire' },
  none: { bg: 'bg-gray-50 dark:bg-gray-800/30', text: 'text-gray-400', label: '—' },
};

const STATUSES: ConfigStatus[] = ['todo', 'draft', 'review', 'published'];
const LANGS = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'zh', 'hi', 'ar'];

// ============================================================================
// COMPONENT
// ============================================================================

const AdminLandingPages: React.FC = () => {
  const { user } = useAuth();

  // State
  const [configs, setConfigs] = useState<Map<string, CountryLandingConfig>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<LandingRole | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ConfigStatus | 'all' | 'none'>('all');
  const [filterRegion, setFilterRegion] = useState<GeoRegion | 'all'>('all');
  const [filterLang, setFilterLang] = useState('fr');
  const [collapsedRegions, setCollapsedRegions] = useState<Set<string>>(new Set());
  const [showUrlDirectory, setShowUrlDirectory] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState('');

  // Edit modal
  const [editModal, setEditModal] = useState<{
    countryCode: string;
    role: LandingRole;
    lang: string;
  } | null>(null);

  // Duplicate modal
  const [duplicateModal, setDuplicateModal] = useState<{
    sourceCountry: string;
    sourceRole: LandingRole;
    sourceLang: string;
  } | null>(null);
  // ============================================================================
  // FIRESTORE LISTENER
  // ============================================================================

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'country_landing_configs'),
      (snapshot) => {
        const map = new Map<string, CountryLandingConfig>();
        snapshot.docs.forEach((d) => {
          map.set(d.id, d.data() as CountryLandingConfig);
        });
        setConfigs(map);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, []);

  // ============================================================================
  // HELPERS
  // ============================================================================

  const getConfig = useCallback(
    (country: string, role: LandingRole, lang: string) => {
      return configs.get(buildDocumentId(role, country, lang)) ?? null;
    },
    [configs],
  );

  const getStatus = useCallback(
    (country: string, role: LandingRole, lang: string): ConfigStatus | 'none' => {
      return getConfig(country, role, lang)?.status ?? 'none';
    },
    [getConfig],
  );

  /** Get all languages that have a config for a given country+role */
  const getConfiguredLangs = useCallback(
    (country: string, role: LandingRole): string[] => {
      const langs: string[] = [];
      LANGS.forEach((l) => {
        if (configs.has(buildDocumentId(role, country, l))) {
          langs.push(l);
        }
      });
      return langs;
    },
    [configs],
  );

  // ============================================================================
  // FILTERED COUNTRIES
  // ============================================================================

  const filteredCountries = useMemo(() => {
    let countries = COUNTRIES_CATALOG;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      countries = countries.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q),
      );
    }

    if (filterRegion !== 'all') {
      countries = countries.filter((c) => c.region === filterRegion);
    }

    if (filterStatus !== 'all') {
      countries = countries.filter((c) => {
        const roles = filterRole === 'all' ? ROLES : [filterRole];
        return roles.some((r) => getStatus(c.code, r, filterLang) === filterStatus);
      });
    }

    return countries;
  }, [searchQuery, filterRegion, filterStatus, filterRole, filterLang, getStatus]);

  // Group by region
  const countryGroups = useMemo(() => {
    const groups = new Map<GeoRegion, typeof filteredCountries>();
    filteredCountries.forEach((c) => {
      const list = groups.get(c.region) || [];
      list.push(c);
      groups.set(c.region, list);
    });
    return groups;
  }, [filteredCountries]);

  // ============================================================================
  // STATS
  // ============================================================================

  const stats = useMemo(() => {
    // Total possible = countries × roles × langs
    const totalCombinations = COUNTRIES_CATALOG.length * ROLES.length * LANGS.length;
    let published = 0;
    let draft = 0;
    let review = 0;
    let todo = 0;
    let totalConfigs = 0;

    // Count all configs across all languages
    configs.forEach((cfg) => {
      totalConfigs++;
      if (cfg.status === 'published') published++;
      else if (cfg.status === 'draft') draft++;
      else if (cfg.status === 'review') review++;
      else if (cfg.status === 'todo') todo++;
    });

    // For the filtered language view
    const totalFilteredLang = COUNTRIES_CATALOG.length * ROLES.length;
    let publishedFiltered = 0;
    COUNTRIES_CATALOG.forEach((c) => {
      ROLES.forEach((r) => {
        if (getStatus(c.code, r, filterLang) === 'published') publishedFiltered++;
      });
    });

    return {
      total: totalCombinations,
      totalConfigs,
      published,
      draft,
      review,
      todo,
      configured: totalConfigs,
      progress: totalFilteredLang > 0 ? Math.round((publishedFiltered / totalFilteredLang) * 100) : 0,
      totalLangFiltered: totalFilteredLang,
      publishedFiltered,
    };
  }, [configs, filterLang, getStatus]);

  // ============================================================================
  // TOGGLE REGION
  // ============================================================================

  const toggleRegion = (region: string) => {
    setCollapsedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region);
      else next.add(region);
      return next;
    });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="w-6 h-6 text-red-600" />
            Landing Pages par Pays
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {stats.totalConfigs} configs créées | {filterLang.toUpperCase()}: {stats.publishedFiltered}/{stats.totalLangFiltered} publiées ({stats.progress}%)
          </p>
        </div>
      </div>

      {/* ================================================================
          URL DIRECTORY - Quick access to all landing page URLs
      ================================================================ */}
      <div className="mb-6 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowUrlDirectory(!showUrlDirectory)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Link className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span className="font-semibold text-gray-900 dark:text-white">Annuaire des URLs Landing Pages</span>
            <span className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">5 pages</span>
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showUrlDirectory ? 'rotate-180' : ''}`} />
        </button>

        {showUrlDirectory && (
          <div className="p-4 bg-white dark:bg-gray-800 space-y-4">
            {(() => {
              const BASE = 'https://sos-expat.com';
              const LOCALE_MAP: Record<string, string> = {
                fr: 'fr-fr', en: 'en-us', es: 'es-es', de: 'de-de',
                pt: 'pt-pt', ru: 'ru-ru', zh: 'zh-cn', hi: 'hi-in', ar: 'ar-sa',
              };
              const LANG_LABELS: Record<string, string> = {
                fr: '🇫🇷 FR', en: '🇬🇧 EN', es: '🇪🇸 ES', de: '🇩🇪 DE',
                pt: '🇵🇹 PT', ru: '🇷🇺 RU', zh: '🇨🇳 ZH', hi: '🇮🇳 HI', ar: '🇸🇦 AR',
              };
              const LANDING_PAGES = [
                {
                  name: 'Chatter',
                  icon: '💬',
                  color: 'amber',
                  slugs: { fr: 'devenir-chatter', en: 'become-chatter', es: 'ser-chatter', de: 'chatter-werden', pt: 'tornar-se-chatter', ru: 'stat-chatterom', zh: 'chengwei-chatter', hi: 'chatter-bane', ar: 'كن-مسوقا' },
                },
                {
                  name: 'Capitaine Chatter',
                  icon: '👑',
                  color: 'purple',
                  slugs: { fr: 'devenir-capitaine', en: 'become-captain', es: 'ser-capitan', de: 'kapitaen-werden', pt: 'tornar-se-capitao', ru: 'stat-kapitanom', zh: 'chengwei-duizhang', hi: 'captain-bane', ar: 'كن-قائدا' },
                },
                {
                  name: 'Influencer',
                  icon: '📢',
                  color: 'red',
                  slugs: { fr: 'devenir-influenceur', en: 'become-influencer', es: 'ser-influencer', de: 'influencer-werden', pt: 'tornar-se-influencer', ru: 'stat-influenserom', zh: 'chengwei-influencer', hi: 'influencer-bane', ar: 'كن-مؤثرا' },
                },
                {
                  name: 'Blogger',
                  icon: '✍️',
                  color: 'blue',
                  slugs: { fr: 'devenir-blogger', en: 'become-blogger', es: 'ser-blogger', de: 'blogger-werden', pt: 'tornar-se-blogger', ru: 'stat-bloggerom', zh: 'chengwei-blogger', hi: 'blogger-bane', ar: 'كن-مدونا' },
                },
                {
                  name: 'Admin Groupe',
                  icon: '👥',
                  color: 'green',
                  slugs: { fr: 'devenir-admin-groupe', en: 'become-group-admin', es: 'ser-admin-grupo', de: 'gruppenadmin-werden', pt: 'tornar-se-admin-grupo', ru: 'stat-admin-gruppy', zh: 'chengwei-qunzhu', hi: 'group-admin-bane', ar: 'كن-مدير-مجموعة' },
                },
              ];

              const handleCopy = (url: string) => {
                navigator.clipboard.writeText(url);
                setCopiedUrl(url);
                setTimeout(() => setCopiedUrl(''), 2000);
              };

              return LANDING_PAGES.map((page) => (
                <div key={page.name} className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50">
                    <span className="text-lg">{page.icon}</span>
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">{page.name}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 p-2">
                    {Object.entries(page.slugs).map(([lang, slug]) => {
                      const url = `${BASE}/${LOCALE_MAP[lang]}/${slug}`;
                      const isCopied = copiedUrl === url;
                      return (
                        <div
                          key={lang}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 group text-xs"
                        >
                          <span className="font-medium text-gray-500 dark:text-gray-400 w-12 flex-shrink-0">{LANG_LABELS[lang]}</span>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 dark:text-indigo-400 hover:underline truncate flex-1"
                            title={url}
                          >
                            /{LOCALE_MAP[lang]}/{slug}
                          </a>
                          <button
                            onClick={() => handleCopy(url)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 flex-shrink-0"
                            title="Copier l'URL"
                          >
                            {isCopied ? (
                              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-gray-400" />
                            )}
                          </button>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 flex-shrink-0"
                            title="Ouvrir"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Publié', value: stats.published, color: 'green' },
          { label: 'Review', value: stats.review, color: 'blue' },
          { label: 'Brouillon', value: stats.draft, color: 'yellow' },
          { label: 'À faire', value: stats.todo, color: 'gray' },
          { label: 'Non configuré', value: stats.total - stats.configured, color: 'slate' },
        ].map((s) => (
          <div key={s.label} className={`bg-${s.color}-50 border border-${s.color}-200 rounded-lg p-3 text-center`}>
            <div className={`text-xl font-bold text-${s.color}-700`}>{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${stats.progress}%` }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un pays..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        <select
          value={filterLang}
          onChange={(e) => setFilterLang(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500"
        >
          {LANGS.map((l) => (
            <option key={l} value={l}>{l.toUpperCase()}</option>
          ))}
        </select>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as LandingRole | 'all')}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500"
        >
          <option value="all">Tous les rôles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ConfigStatus | 'all' | 'none')}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500"
        >
          <option value="all">Tous les statuts</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_COLORS[s].label}</option>
          ))}
          <option value="none">Non configuré</option>
        </select>

        <select
          value={filterRegion}
          onChange={(e) => setFilterRegion(e.target.value as GeoRegion | 'all')}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500"
        >
          <option value="all">Toutes les régions</option>
          {Object.entries(REGION_LABELS).filter(([k]) => k !== 'default').map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Matrix table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">
                  Pays
                </th>
                {ROLES.map((r) => (
                  <th key={r} className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {ROLE_LABELS[r]}
                  </th>
                ))}
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from(countryGroups.entries()).map(([region, countries]) => (
                <React.Fragment key={region}>
                  {/* Region header */}
                  <tr
                    className="bg-gray-50 cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleRegion(region)}
                  >
                    <td colSpan={ROLES.length + 2} className="px-4 py-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        {collapsedRegions.has(region) ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                        {REGION_LABELS[region] || region}
                        <span className="text-xs font-normal text-gray-400">
                          ({countries.length} pays)
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Country rows */}
                  {!collapsedRegions.has(region) &&
                    countries.map((country) => (
                      <tr
                        key={country.code}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{country.flag}</span>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{country.name}</div>
                              <div className="text-xs text-gray-400">{country.code}</div>
                            </div>
                          </div>
                        </td>
                        {ROLES.map((role) => {
                          const status = getStatus(country.code, role, filterLang);
                          const sc = STATUS_COLORS[status];
                          const configuredLangs = getConfiguredLangs(country.code, role);
                          return (
                            <td key={role} className="text-center px-3 py-2.5">
                              <button
                                onClick={() =>
                                  setEditModal({
                                    countryCode: country.code,
                                    role,
                                    lang: filterLang,
                                  })
                                }
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.text} hover:opacity-80 transition-opacity`}
                              >
                                {sc.label}
                              </button>
                              {configuredLangs.length > 0 && (
                                <div className="flex items-center justify-center gap-0.5 mt-1 flex-wrap">
                                  {configuredLangs.map((l) => (
                                    <button
                                      key={l}
                                      onClick={() =>
                                        setEditModal({
                                          countryCode: country.code,
                                          role,
                                          lang: l,
                                        })
                                      }
                                      className={`text-[10px] leading-tight px-1 rounded cursor-pointer hover:opacity-70 ${
                                        l === filterLang
                                          ? 'bg-red-100 text-red-600 font-bold'
                                          : 'bg-gray-100 text-gray-500'
                                      }`}
                                      title={`Éditer ${l.toUpperCase()}`}
                                    >
                                      {l.toUpperCase()}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="text-center px-3 py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() =>
                                setDuplicateModal({
                                  sourceCountry: country.code,
                                  sourceRole: 'chatter',
                                  sourceLang: filterLang,
                                })
                              }
                              className="p-1 text-gray-400 hover:text-gray-600 rounded"
                              title="Dupliquer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={`/${filterLang}-${country.code.toLowerCase()}/devenir-chatter`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-gray-400 hover:text-blue-600 rounded"
                              title="Preview"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editModal && (
        <EditConfigModal
          countryCode={editModal.countryCode}
          role={editModal.role}
          lang={editModal.lang}
          config={getConfig(editModal.countryCode, editModal.role, editModal.lang)}
          allConfigs={configs}
          configuredLangs={getConfiguredLangs(editModal.countryCode, editModal.role)}
          userId={user?.uid || ''}
          onClose={() => setEditModal(null)}
          onSwitchLang={(newLang) => setEditModal({ ...editModal, lang: newLang })}
        />
      )}

      {/* Duplicate Modal */}
      {duplicateModal && (
        <DuplicateModal
          source={duplicateModal}
          configs={configs}
          userId={user?.uid || ''}
          onClose={() => setDuplicateModal(null)}
        />
      )}
    </div>
  );
};

// ============================================================================
// EDIT CONFIG MODAL
// ============================================================================

interface EditConfigModalProps {
  countryCode: string;
  role: LandingRole;
  lang: string;
  config: CountryLandingConfig | null;
  allConfigs: Map<string, CountryLandingConfig>;
  configuredLangs: string[];
  userId: string;
  onClose: () => void;
  onSwitchLang: (lang: string) => void;
}

const EditConfigModal: React.FC<EditConfigModalProps> = ({
  countryCode,
  role,
  lang,
  config,
  allConfigs,
  configuredLangs,
  userId,
  onClose,
  onSwitchLang,
}) => {
  const defaults = getDefaultConfigForCountry(countryCode);
  const [activeTab, setActiveTab] = useState<'payments' | 'currency' | 'testimonials' | 'seo' | 'status'>('payments');
  const [saving, setSaving] = useState(false);

  // Form state
  const [status, setStatus] = useState<ConfigStatus>(config?.status || 'todo');
  const [notes, setNotes] = useState(config?.notes || '');
  const [isActive, setIsActive] = useState(config?.isActive ?? true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>(
    config?.paymentMethods?.length ? config.paymentMethods : defaults.paymentMethods,
  );
  const [currency, setCurrency] = useState<CurrencyConfig>(
    config?.currency || defaults.currency,
  );
  const [testimonials, setTestimonials] = useState<TestimonialConfig[]>(
    config?.testimonials?.length ? config.testimonials : defaults.testimonials,
  );
  const [seo, setSeo] = useState<SEOOverrides>(config?.seoOverrides || {});

  const countryInfo = COUNTRIES_CATALOG.find((c) => c.code === countryCode);
  const [showAddLang, setShowAddLang] = useState(false);
  const [addingLangs, setAddingLangs] = useState(false);
  const [selectedNewLangs, setSelectedNewLangs] = useState<Set<string>>(new Set());
  const availableLangs = LANGS.filter((l) => !configuredLangs.includes(l));

  /** Duplicate current form values to selected new languages */
  const handleAddLanguages = async () => {
    if (selectedNewLangs.size === 0) return;
    setAddingLangs(true);
    try {
      const promises = Array.from(selectedNewLangs).map((newLang) => {
        const docId = buildDocumentId(role, countryCode, newLang);
        const data: CountryLandingConfig = {
          role,
          countryCode,
          lang: newLang,
          status,
          notes: notes || `Dupliqué depuis ${lang.toUpperCase()}`,
          paymentMethods,
          currency,
          testimonials,
          seoOverrides: seo,
          isActive,
          lastUpdatedAt: Timestamp.now(),
          updatedBy: userId,
        };
        return setDoc(doc(db, 'country_landing_configs', docId), data);
      });
      await Promise.all(promises);
      setShowAddLang(false);
      setSelectedNewLangs(new Set());
    } catch (e) {
      console.error('Error adding languages:', e);
    } finally {
      setAddingLangs(false);
    }
  };

  const toggleNewLang = (l: string) => {
    setSelectedNewLangs((prev) => {
      const next = new Set(prev);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      return next;
    });
  };

  // Save
  const handleSave = async () => {
    setSaving(true);
    try {
      const docId = buildDocumentId(role, countryCode, lang);
      const data: CountryLandingConfig = {
        role,
        countryCode,
        lang,
        status,
        notes,
        paymentMethods,
        currency,
        testimonials,
        seoOverrides: seo,
        isActive,
        lastUpdatedAt: Timestamp.now(),
        updatedBy: userId,
      };
      await setDoc(doc(db, 'country_landing_configs', docId), data);
      onClose();
    } catch (e) {
      console.error('Error saving config:', e);
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!confirm(`Supprimer la config ${countryCode} / ${ROLE_LABELS[role]} / ${lang} ?`)) return;
    try {
      await deleteDoc(doc(db, 'country_landing_configs', buildDocumentId(role, countryCode, lang)));
      onClose();
    } catch (e) {
      console.error('Error deleting config:', e);
    }
  };

  // Payment method helpers
  const addPayment = () => setPaymentMethods([...paymentMethods, { name: '', emoji: '', priority: paymentMethods.length + 1 }]);
  const removePayment = (i: number) => setPaymentMethods(paymentMethods.filter((_, idx) => idx !== i));
  const updatePayment = (i: number, field: keyof PaymentMethodConfig, value: string | number) => {
    const copy = [...paymentMethods];
    copy[i] = { ...copy[i], [field]: value };
    setPaymentMethods(copy);
  };

  // Testimonial helpers
  const updateTestimonial = (i: number, field: keyof TestimonialConfig, value: string | number) => {
    const copy = [...testimonials];
    copy[i] = { ...copy[i], [field]: value };
    setTestimonials(copy);
  };

  const tabs = [
    { id: 'payments' as const, label: 'Paiements' },
    { id: 'currency' as const, label: 'Devise' },
    { id: 'testimonials' as const, label: 'Témoignages' },
    { id: 'seo' as const, label: 'SEO' },
    { id: 'status' as const, label: 'Statut' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {countryInfo?.flag} {countryInfo?.name || countryCode} — {ROLE_LABELS[role]}
              </h2>
              <p className="text-xs text-gray-400">ID: {buildDocumentId(role, countryCode, lang)}</p>
            </div>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Language bar */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-400 mr-1">Langues :</span>
            {LANGS.map((l) => {
              const isConfigured = configuredLangs.includes(l);
              const isCurrent = l === lang;
              if (!isConfigured && !isCurrent) return null;
              return (
                <button
                  key={l}
                  onClick={() => { if (!isCurrent) onSwitchLang(l); }}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                    isCurrent
                      ? 'bg-red-600 text-white'
                      : isConfigured
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-gray-50 text-gray-300'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              );
            })}
            {availableLangs.length > 0 && (
              <button
                onClick={() => setShowAddLang(!showAddLang)}
                className="px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 transition-all"
                title="Ajouter une langue"
              >
                + Langue
              </button>
            )}
          </div>

          {/* Add language panel */}
          {showAddLang && availableLangs.length > 0 && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs font-medium text-green-700 mb-2">
                Dupliquer cette config vers d'autres langues :
              </p>
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                {availableLangs.map((l) => (
                  <button
                    key={l}
                    onClick={() => toggleNewLang(l)}
                    className={`px-2.5 py-1 rounded text-xs font-medium border transition-all ${
                      selectedNewLangs.has(l)
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
                <button
                  onClick={() => {
                    if (selectedNewLangs.size === availableLangs.length) {
                      setSelectedNewLangs(new Set());
                    } else {
                      setSelectedNewLangs(new Set(availableLangs));
                    }
                  }}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-white text-gray-500 border border-gray-300 hover:border-green-400 ml-1"
                >
                  {selectedNewLangs.size === availableLangs.length ? 'Aucune' : 'Toutes'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddLanguages}
                  disabled={selectedNewLangs.size === 0 || addingLangs}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {addingLangs
                    ? 'Création...'
                    : `Créer ${selectedNewLangs.size} langue${selectedNewLangs.size > 1 ? 's' : ''}`}
                </button>
                <button
                  onClick={() => { setShowAddLang(false); setSelectedNewLangs(new Set()); }}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
                activeTab === t.id
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-3">
              {paymentMethods.map((pm, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                  <input
                    type="text"
                    value={pm.emoji}
                    onChange={(e) => updatePayment(i, 'emoji', e.target.value)}
                    className="w-12 text-center border border-gray-300 rounded px-1 py-1 text-lg"
                    placeholder="🌐"
                  />
                  <input
                    type="text"
                    value={pm.name}
                    onChange={(e) => updatePayment(i, 'name', e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
                    placeholder="Nom de la méthode"
                  />
                  <input
                    type="number"
                    value={pm.priority}
                    onChange={(e) => updatePayment(i, 'priority', Number(e.target.value))}
                    className="w-16 text-center border border-gray-300 rounded px-2 py-1.5 text-sm"
                    title="Priorité"
                  />
                  <button onClick={() => removePayment(i)} className="p-1 text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={addPayment}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium"
              >
                <Plus className="w-4 h-4" /> Ajouter une méthode
              </button>
            </div>
          )}

          {/* Currency Tab */}
          {activeTab === 'currency' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Code devise</label>
                  <input
                    type="text"
                    value={currency.code}
                    onChange={(e) => setCurrency({ ...currency, code: e.target.value.toUpperCase() })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="XOF"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Symbole</label>
                  <input
                    type="text"
                    value={currency.symbol}
                    onChange={(e) => setCurrency({ ...currency, symbol: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="FCFA"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Taux (1 USD = X)</label>
                  <input
                    type="number"
                    value={currency.exchangeRate}
                    onChange={(e) => setCurrency({ ...currency, exchangeRate: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Locale d'affichage</label>
                  <input
                    type="text"
                    value={currency.displayLocale}
                    onChange={(e) => setCurrency({ ...currency, displayLocale: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="fr-SN"
                  />
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="text-gray-500 mb-1">Aperçu :</p>
                <p className="font-medium">10$ = {formatAmount(10 * currency.exchangeRate, currency)}</p>
                <p className="font-medium">5 300$ = {formatAmount(5300 * currency.exchangeRate, currency)}</p>
              </div>
            </div>
          )}

          {/* Testimonials Tab */}
          {activeTab === 'testimonials' && (
            <div className="space-y-4">
              {[1, 2, 3].map((rank) => {
                const idx = testimonials.findIndex((t) => t.rank === rank);
                const t = idx >= 0 ? testimonials[idx] : { name: '', earningsDisplay: '', earningsUSD: 0, rank: rank as 1 | 2 | 3 };
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <div key={rank} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">{medals[rank - 1]}</span>
                      <span className="text-sm font-semibold text-gray-700">#{rank}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Nom</label>
                        <input
                          type="text"
                          value={t.name}
                          onChange={(e) => {
                            if (idx >= 0) {
                              updateTestimonial(idx, 'name', e.target.value);
                            } else {
                              setTestimonials([...testimonials, { ...t, name: e.target.value }]);
                            }
                          }}
                          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                          placeholder="Aminata D."
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Gains USD</label>
                        <input
                          type="number"
                          value={t.earningsUSD}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (idx >= 0) {
                              updateTestimonial(idx, 'earningsUSD', val);
                            }
                          }}
                          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Affichage gains</label>
                        <input
                          type="text"
                          value={t.earningsDisplay}
                          onChange={(e) => {
                            if (idx >= 0) {
                              updateTestimonial(idx, 'earningsDisplay', e.target.value);
                            }
                          }}
                          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                          placeholder="3 180 000 FCFA"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SEO Tab */}
          {activeTab === 'seo' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Titre SEO</label>
                <input
                  type="text"
                  value={seo.title || ''}
                  onChange={(e) => setSeo({ ...seo, title: e.target.value || undefined })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Laisser vide pour utiliser le titre i18n par défaut"
                />
                <p className="text-xs text-gray-400 mt-1">{(seo.title || '').length}/60 caractères</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Description SEO</label>
                <textarea
                  value={seo.description || ''}
                  onChange={(e) => setSeo({ ...seo, description: e.target.value || undefined })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                  rows={3}
                  placeholder="Laisser vide pour utiliser la description i18n par défaut"
                />
                <p className="text-xs text-gray-400 mt-1">{(seo.description || '').length}/160 caractères</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Mots-clés</label>
                <input
                  type="text"
                  value={seo.keywords || ''}
                  onChange={(e) => setSeo({ ...seo, keywords: e.target.value || undefined })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="chatter sénégal, gagner argent afrique, ..."
                />
              </div>
            </div>
          )}

          {/* Status Tab */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Statut</label>
                <div className="flex gap-2">
                  {STATUSES.map((s) => {
                    const sc = STATUS_COLORS[s];
                    return (
                      <button
                        key={s}
                        onClick={() => setStatus(s)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                          status === s
                            ? `${sc.bg} ${sc.text} border-current`
                            : 'border-gray-200 text-gray-400 hover:border-gray-300'
                        }`}
                      >
                        {sc.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-700">Page active :</label>
                <button
                  onClick={() => setIsActive(!isActive)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isActive ? 'translate-x-5' : ''}`}
                  />
                </button>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notes internes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                  rows={3}
                  placeholder="Notes sur l'avancement, TODO, etc."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" /> Supprimer
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// DUPLICATE MODAL
// ============================================================================

interface DuplicateModalProps {
  source: { sourceCountry: string; sourceRole: LandingRole; sourceLang: string };
  configs: Map<string, CountryLandingConfig>;
  userId: string;
  onClose: () => void;
}

const DuplicateModal: React.FC<DuplicateModalProps> = ({ source, configs, userId, onClose }) => {
  const [targetCountry, setTargetCountry] = useState('');
  const [targetRoles, setTargetRoles] = useState<Set<LandingRole>>(new Set([source.sourceRole]));
  const [targetLangs, setTargetLangs] = useState<Set<string>>(new Set([source.sourceLang]));
  const [saving, setSaving] = useState(false);

  const toggleRole = (r: LandingRole) => {
    setTargetRoles((prev) => {
      const next = new Set(prev);
      if (next.has(r)) { if (next.size > 1) next.delete(r); }
      else next.add(r);
      return next;
    });
  };

  const toggleLang = (l: string) => {
    setTargetLangs((prev) => {
      const next = new Set(prev);
      if (next.has(l)) { if (next.size > 1) next.delete(l); }
      else next.add(l);
      return next;
    });
  };

  const totalCombinations = targetRoles.size * targetLangs.size;

  const handleDuplicate = async () => {
    if (!targetCountry) return;
    setSaving(true);
    try {
      const sourceDocId = buildDocumentId(source.sourceRole, source.sourceCountry, source.sourceLang);
      const sourceConfig = configs.get(sourceDocId);
      const defaults = getDefaultConfigForCountry(source.sourceCountry);

      const promises: Promise<void>[] = [];
      targetRoles.forEach((role) => {
        targetLangs.forEach((lang) => {
          const targetDocId = buildDocumentId(role, targetCountry, lang);
          const data: CountryLandingConfig = {
            role,
            countryCode: targetCountry,
            lang,
            status: 'draft',
            notes: `Dupliqué depuis ${source.sourceCountry}/${source.sourceRole}/${source.sourceLang}`,
            paymentMethods: sourceConfig?.paymentMethods || defaults.paymentMethods,
            currency: sourceConfig?.currency || defaults.currency,
            testimonials: sourceConfig?.testimonials || defaults.testimonials,
            seoOverrides: {},
            isActive: false,
            lastUpdatedAt: Timestamp.now(),
            updatedBy: userId,
          };
          promises.push(setDoc(doc(db, 'country_landing_configs', targetDocId), data));
        });
      });
      await Promise.all(promises);
      onClose();
    } catch (e) {
      console.error('Error duplicating config:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Dupliquer la config
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Source : {source.sourceCountry} / {ROLE_LABELS[source.sourceRole]} / {source.sourceLang.toUpperCase()}
        </p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Pays cible</label>
            <select
              value={targetCountry}
              onChange={(e) => setTargetCountry(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Sélectionner...</option>
              {COUNTRIES_CATALOG.map((c) => (
                <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Rôles cibles (multi-sélection)</label>
            <div className="flex gap-1.5 flex-wrap">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => toggleRole(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    targetRoles.has(r)
                      ? 'bg-red-50 text-red-600 border-red-300'
                      : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Langues cibles (multi-sélection)</label>
            <div className="flex gap-1.5 flex-wrap">
              {LANGS.map((l) => (
                <button
                  key={l}
                  onClick={() => toggleLang(l)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    targetLangs.has(l)
                      ? 'bg-red-50 text-red-600 border-red-300'
                      : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
              <button
                onClick={() => setTargetLangs(targetLangs.size === LANGS.length ? new Set([source.sourceLang]) : new Set(LANGS))}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200 hover:border-gray-300"
              >
                {targetLangs.size === LANGS.length ? 'Reset' : 'Toutes'}
              </button>
            </div>
          </div>

          {totalCombinations > 1 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-700">
              {totalCombinations} config{totalCombinations > 1 ? 's' : ''} seront créées
              ({targetRoles.size} rôle{targetRoles.size > 1 ? 's' : ''} × {targetLangs.size} langue{targetLangs.size > 1 ? 's' : ''})
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Annuler
          </button>
          <button
            onClick={handleDuplicate}
            disabled={!targetCountry || saving}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            <Copy className="w-4 h-4" />
            {saving ? 'Copie...' : `Dupliquer${totalCombinations > 1 ? ` (${totalCombinations})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLandingPages;
