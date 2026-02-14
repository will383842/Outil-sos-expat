/**
 * AdminChatterCountryRotation - Admin page for managing country rotation
 * Allows viewing rotation status, adjusting threshold, and manually advancing cycles
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  Globe,
  RefreshCw,
  Settings,
  ChevronRight,
  Loader2,
  AlertCircle,
  Check,
  MapPin,
  Users,
  BarChart3,
  Play,
  Percent,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { httpsCallable } from 'firebase/functions';
import { functionsWest2 } from "@/config/firebase";

// Design tokens
const UI = {
  card: "bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700",
  button: {
    primary: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
  },
  input: "w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500",
} as const;

interface CountryDetail {
  code: string;
  name: string;
  currentCycle: number;
  assignmentsInCurrentCycle: number;
  totalAssignments: number;
  chatterCount: number;
  isAvailable: boolean;
}

interface RotationState {
  id: string;
  currentGlobalCycle: number;
  totalCountries: number;
  countriesAssignedInCurrentCycle: number;
  cycleThresholdPercent: number;
  autoAdvanceCycle: boolean;
  lastCycleAdvancedAt: { _seconds: number } | null;
}

const AdminChatterCountryRotation: React.FC = () => {
  const intl = useIntl();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<RotationState | null>(null);
  const [countries, setCountries] = useState<CountryDetail[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAvailable, setFilterAvailable] = useState<'all' | 'available' | 'assigned'>('all');

  // Action states
  const [isInitializing, setIsInitializing] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isUpdatingThreshold, setIsUpdatingThreshold] = useState(false);
  const [newThreshold, setNewThreshold] = useState<number>(90);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch rotation status
  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const adminGetCountryRotationStatus = httpsCallable(
        functionsWest2,
        'adminGetCountryRotationStatus'
      );

      const result = await adminGetCountryRotationStatus();
      const data = result.data as {
        success: boolean;
        state: RotationState | null;
        countries: CountryDetail[];
        error?: string;
      };

      if (data.success && data.state) {
        setState(data.state);
        setCountries(data.countries);
        setNewThreshold(data.state.cycleThresholdPercent);
      } else {
        // Not initialized yet
        setState(null);
        setCountries([]);
      }
    } catch (err: unknown) {
      console.error('Error fetching rotation status:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('not initialized') || errorMessage.includes('Not initialized')) {
        setState(null);
        setCountries([]);
      } else {
        setError(intl.formatMessage({
          id: 'admin.countryRotation.fetchError',
          defaultMessage: 'Erreur lors du chargement des données'
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [intl]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Initialize country rotation
  const handleInitialize = async () => {
    setIsInitializing(true);
    setError(null);

    try {
      const adminInitializeCountryRotation = httpsCallable(
        functionsWest2,
        'adminInitializeCountryRotation'
      );

      const result = await adminInitializeCountryRotation();
      const data = result.data as { success: boolean; message: string };

      if (data.success) {
        setActionSuccess(intl.formatMessage({
          id: 'admin.countryRotation.initialized',
          defaultMessage: 'Système de rotation initialisé avec succès'
        }));
        fetchStatus();
      }
    } catch (err) {
      console.error('Error initializing:', err);
      setError(intl.formatMessage({
        id: 'admin.countryRotation.initError',
        defaultMessage: "Erreur lors de l'initialisation"
      }));
    } finally {
      setIsInitializing(false);
    }
  };

  // Advance cycle manually
  const handleAdvanceCycle = async () => {
    if (!confirm(intl.formatMessage({
      id: 'admin.countryRotation.advanceConfirm',
      defaultMessage: 'Êtes-vous sûr de vouloir avancer au cycle suivant ? Tous les pays redeviendront disponibles.'
    }))) {
      return;
    }

    setIsAdvancing(true);
    setError(null);

    try {
      const adminAdvanceCycle = httpsCallable(functionsWest2, 'adminAdvanceCycle');

      const result = await adminAdvanceCycle();
      const data = result.data as { success: boolean; newCycle: number; message?: string };

      if (data.success) {
        setActionSuccess(intl.formatMessage({
          id: 'admin.countryRotation.cycleAdvanced',
          defaultMessage: 'Cycle avancé vers le cycle {cycle}'
        }, { cycle: data.newCycle }));
        fetchStatus();
      }
    } catch (err) {
      console.error('Error advancing cycle:', err);
      setError(intl.formatMessage({
        id: 'admin.countryRotation.advanceError',
        defaultMessage: "Erreur lors de l'avancement du cycle"
      }));
    } finally {
      setIsAdvancing(false);
    }
  };

  // Update threshold
  const handleUpdateThreshold = async () => {
    if (newThreshold < 50 || newThreshold > 100) {
      setError(intl.formatMessage({
        id: 'admin.countryRotation.thresholdRange',
        defaultMessage: 'Le seuil doit être entre 50% et 100%'
      }));
      return;
    }

    setIsUpdatingThreshold(true);
    setError(null);

    try {
      const adminUpdateCycleThreshold = httpsCallable(
        functionsWest2,
        'adminUpdateCycleThreshold'
      );

      const result = await adminUpdateCycleThreshold({ threshold: newThreshold });
      const data = result.data as { success: boolean; message?: string };

      if (data.success) {
        setActionSuccess(intl.formatMessage({
          id: 'admin.countryRotation.thresholdUpdated',
          defaultMessage: 'Seuil mis à jour à {threshold}%'
        }, { threshold: newThreshold }));
        setShowThresholdModal(false);
        fetchStatus();
      }
    } catch (err) {
      console.error('Error updating threshold:', err);
      setError(intl.formatMessage({
        id: 'admin.countryRotation.thresholdError',
        defaultMessage: 'Erreur lors de la mise à jour du seuil'
      }));
    } finally {
      setIsUpdatingThreshold(false);
    }
  };

  // Clear success message
  useEffect(() => {
    if (actionSuccess) {
      const timer = setTimeout(() => setActionSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccess]);

  // Filter countries
  const filteredCountries = countries.filter(country => {
    const matchesSearch =
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.code.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterAvailable === 'available') return matchesSearch && country.isAvailable;
    if (filterAvailable === 'assigned') return matchesSearch && !country.isAvailable;
    return matchesSearch;
  });

  // Get country emoji flag
  const getFlag = (countryCode: string) => {
    try {
      const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    } catch {
      return '🏳️';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto text-red-500 animate-spin mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            <FormattedMessage id="common.loading" defaultMessage="Chargement..." />
          </p>
        </div>
      </div>
    );
  }

  // Not initialized state
  if (!state) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            <FormattedMessage
              id="admin.countryRotation.title"
              defaultMessage="Rotation des Pays"
            />
          </h1>
        </div>

        <div className={`${UI.card} p-8 text-center`}>
          <Globe className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            <FormattedMessage
              id="admin.countryRotation.notInitialized.title"
              defaultMessage="Système non initialisé"
            />
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            <FormattedMessage
              id="admin.countryRotation.notInitialized.description"
              defaultMessage="Le système de rotation des pays n'a pas encore été initialisé. Cliquez sur le bouton ci-dessous pour configurer les 197 pays."
            />
          </p>
          <button
            onClick={handleInitialize}
            disabled={isInitializing}
            className={`${UI.button.primary} px-6 py-3 inline-flex items-center gap-2`}
          >
            {isInitializing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <FormattedMessage id="admin.countryRotation.initializing" defaultMessage="Initialisation..." />
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <FormattedMessage id="admin.countryRotation.initialize" defaultMessage="Initialiser le système" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  const percentAssigned = (state.countriesAssignedInCurrentCycle / state.totalCountries) * 100;
  const availableCount = state.totalCountries - state.countriesAssignedInCurrentCycle;

  return (
    <AdminLayout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          <FormattedMessage
            id="admin.countryRotation.title"
            defaultMessage="Rotation des Pays"
          />
        </h1>
        <button
          onClick={fetchStatus}
          className={`${UI.button.secondary} px-4 py-2 inline-flex items-center gap-2`}
        >
          <RefreshCw className="w-4 h-4" />
          <FormattedMessage id="common.refresh" defaultMessage="Actualiser" />
        </button>
      </div>

      {/* Success Message */}
      {actionSuccess && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center gap-3">
          <Check className="w-5 h-5 text-green-500" />
          <p className="text-sm text-green-700 dark:text-green-300">{actionSuccess}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Cycle */}
        <div className={`${UI.card} p-4`}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <RefreshCw className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="admin.countryRotation.currentCycle" defaultMessage="Cycle actuel" />
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {state.currentGlobalCycle}
              </p>
            </div>
          </div>
        </div>

        {/* Total Countries */}
        <div className={`${UI.card} p-4`}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="admin.countryRotation.totalCountries" defaultMessage="Pays total" />
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {state.totalCountries}
              </p>
            </div>
          </div>
        </div>

        {/* Available */}
        <div className={`${UI.card} p-4`}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="admin.countryRotation.available" defaultMessage="Disponibles" />
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {availableCount}
              </p>
            </div>
          </div>
        </div>

        {/* Assigned */}
        <div className={`${UI.card} p-4`}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="admin.countryRotation.assigned" defaultMessage="Assignés" />
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {state.countriesAssignedInCurrentCycle}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress */}
        <div className={`${UI.card} p-6`}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-red-500" />
            <FormattedMessage id="admin.countryRotation.progress" defaultMessage="Progression du cycle" />
          </h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="admin.countryRotation.percentAssigned" defaultMessage="Pays assignés" />
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {percentAssigned.toFixed(1)}%
                </span>
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${percentAssigned}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                <FormattedMessage id="admin.countryRotation.threshold" defaultMessage="Seuil de déclenchement" />
              </span>
              <span className="font-medium text-red-600 dark:text-red-400">
                {state.cycleThresholdPercent}%
              </span>
            </div>

            {percentAssigned >= state.cycleThresholdPercent && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">
                  <FormattedMessage
                    id="admin.countryRotation.thresholdReached"
                    defaultMessage="Le seuil est atteint. Le prochain enregistrement déclenchera automatiquement un nouveau cycle."
                  />
                </p>
              </div>
            )}

            {state.lastCycleAdvancedAt && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <FormattedMessage
                  id="admin.countryRotation.lastAdvanced"
                  defaultMessage="Dernier changement de cycle: {date}"
                  values={{
                    date: new Date(state.lastCycleAdvancedAt._seconds * 1000).toLocaleString()
                  }}
                />
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className={`${UI.card} p-6`}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-red-500" />
            <FormattedMessage id="admin.countryRotation.actions" defaultMessage="Actions" />
          </h3>

          <div className="space-y-4">
            {/* Update Threshold */}
            <button
              onClick={() => setShowThresholdModal(true)}
              className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Percent className="w-5 h-5 text-blue-500" />
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">
                    <FormattedMessage id="admin.countryRotation.updateThreshold" defaultMessage="Modifier le seuil" />
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <FormattedMessage
                      id="admin.countryRotation.currentThreshold"
                      defaultMessage="Actuellement à {percent}%"
                      values={{ percent: state.cycleThresholdPercent }}
                    />
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            {/* Advance Cycle */}
            <button
              onClick={handleAdvanceCycle}
              disabled={isAdvancing}
              className="w-full p-4 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-between hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <RefreshCw className={`w-5 h-5 text-red-500 ${isAdvancing ? 'animate-spin' : ''}`} />
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">
                    <FormattedMessage id="admin.countryRotation.advanceCycle" defaultMessage="Forcer nouveau cycle" />
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <FormattedMessage
                      id="admin.countryRotation.advanceCycleDesc"
                      defaultMessage="Rend tous les pays disponibles"
                    />
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Countries List */}
      <div className={`${UI.card} p-6`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            <FormattedMessage id="admin.countryRotation.countriesList" defaultMessage="Liste des pays" />
          </h3>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={intl.formatMessage({
                id: 'admin.countryRotation.searchPlaceholder',
                defaultMessage: 'Rechercher...'
              })}
              className={`${UI.input} max-w-xs`}
            />

            {/* Filter */}
            <select
              value={filterAvailable}
              onChange={(e) => setFilterAvailable(e.target.value as 'all' | 'available' | 'assigned')}
              className={`${UI.input} max-w-[200px]`}
            >
              <option value="all">
                {intl.formatMessage({ id: 'admin.countryRotation.filterAll', defaultMessage: 'Tous' })}
              </option>
              <option value="available">
                {intl.formatMessage({ id: 'admin.countryRotation.filterAvailable', defaultMessage: 'Disponibles' })}
              </option>
              <option value="assigned">
                {intl.formatMessage({ id: 'admin.countryRotation.filterAssigned', defaultMessage: 'Assignés' })}
              </option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="admin.countryRotation.country" defaultMessage="Pays" />
                </th>
                <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-center">
                  <FormattedMessage id="admin.countryRotation.status" defaultMessage="Statut" />
                </th>
                <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-center">
                  <FormattedMessage id="admin.countryRotation.cycle" defaultMessage="Cycle" />
                </th>
                <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-center">
                  <FormattedMessage id="admin.countryRotation.chatters" defaultMessage="Chatters" />
                </th>
                <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-center">
                  <FormattedMessage id="admin.countryRotation.totalAssignments" defaultMessage="Total" />
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCountries.map(country => (
                <tr
                  key={country.code}
                  className="border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                >
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getFlag(country.code)}</span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{country.name}</p>
                        <p className="text-xs text-gray-500">{country.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        country.isAvailable
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}
                    >
                      {country.isAvailable ? (
                        <FormattedMessage id="admin.countryRotation.statusAvailable" defaultMessage="Disponible" />
                      ) : (
                        <FormattedMessage id="admin.countryRotation.statusAssigned" defaultMessage="Assigné" />
                      )}
                    </span>
                  </td>
                  <td className="py-3 text-center text-gray-600 dark:text-gray-400">
                    {country.currentCycle}
                  </td>
                  <td className="py-3 text-center text-gray-600 dark:text-gray-400">
                    {country.chatterCount}
                  </td>
                  <td className="py-3 text-center text-gray-600 dark:text-gray-400">
                    {country.totalAssignments}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredCountries.length === 0 && (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              <FormattedMessage id="admin.countryRotation.noResults" defaultMessage="Aucun pays trouvé" />
            </div>
          )}
        </div>
      </div>

      {/* Threshold Modal */}
      {showThresholdModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${UI.card} p-6 max-w-md w-full`}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              <FormattedMessage id="admin.countryRotation.updateThresholdTitle" defaultMessage="Modifier le seuil" />
            </h3>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              <FormattedMessage
                id="admin.countryRotation.updateThresholdDesc"
                defaultMessage="Le cycle avance automatiquement lorsque ce pourcentage de pays est assigné."
              />
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FormattedMessage id="admin.countryRotation.thresholdLabel" defaultMessage="Seuil (%)" />
              </label>
              <input
                type="number"
                value={newThreshold}
                onChange={(e) => setNewThreshold(parseInt(e.target.value) || 0)}
                min={50}
                max={100}
                className={UI.input}
              />
              <p className="mt-1 text-xs text-gray-500">
                <FormattedMessage id="admin.countryRotation.thresholdHint" defaultMessage="Entre 50% et 100%" />
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowThresholdModal(false)}
                className={`${UI.button.secondary} flex-1 py-2`}
              >
                <FormattedMessage id="common.cancel" defaultMessage="Annuler" />
              </button>
              <button
                onClick={handleUpdateThreshold}
                disabled={isUpdatingThreshold}
                className={`${UI.button.primary} flex-1 py-2 flex items-center justify-center gap-2`}
              >
                {isUpdatingThreshold ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FormattedMessage id="common.save" defaultMessage="Enregistrer" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AdminLayout>
  );
};

export default AdminChatterCountryRotation;
