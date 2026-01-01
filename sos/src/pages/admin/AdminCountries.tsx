import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Save
} from 'lucide-react';
import { collection, query, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useAuth } from '../../contexts/AuthContext';
import { countriesData, CountryData } from '../../data/countries';

// Interface pour le statut d'un pays en Firestore
interface CountryStatus {
  code: string;
  isActive: boolean;
  updatedAt: Date;
  updatedBy?: string;
}

type FilterType = 'all' | 'active' | 'inactive';
type RegionFilter = 'all' | string;

// Fonction pure pour obtenir le nom du pays
const getCountryName = (country: CountryData, lang: string = 'fr'): string => {
  switch (lang) {
    case 'en': return country.nameEn;
    case 'es': return country.nameEs;
    case 'de': return country.nameDe;
    case 'pt': return country.namePt;
    case 'zh': return country.nameZh;
    case 'ar': return country.nameAr;
    case 'ru': return country.nameRu;
    default: return country.nameFr;
  }
};

// Liste des pays filtrés (exclure séparateur et disabled)
const validCountries = countriesData.filter(c => c.code !== 'SEPARATOR' && !c.disabled);

// Liste des régions uniques (calculée une seule fois)
const regions = Array.from(new Set(validCountries.map(c => c.region).filter(Boolean))).sort();

const AdminCountries: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, isLoading: authLoading } = useAuth();

  // États
  const [countryStatuses, setCountryStatuses] = useState<Record<string, CountryStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('all');
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Langue de l'interface admin (français par défaut)
  const lang = 'fr';

  // Vérification auth et chargement initial
  useEffect(() => {
    // Attendre que l'auth soit chargée
    if (authLoading) return;

    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
      return;
    }

    loadCountryStatuses();
  }, [currentUser, authLoading, navigate]);

  // Charger les statuts depuis Firestore
  const loadCountryStatuses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const statusesQuery = query(collection(db, 'country_settings'));
      const snapshot = await getDocs(statusesQuery);

      const statusObj: Record<string, CountryStatus> = {};
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const code = (data.code || docSnap.id).toUpperCase();
        statusObj[code] = {
          code,
          isActive: data.isActive === true,
          updatedAt: data.updatedAt?.toDate() || new Date(),
          updatedBy: data.updatedBy
        };
      });

      setCountryStatuses(statusObj);
      setPendingChanges({});

    } catch (err) {
      console.error('Erreur chargement statuts pays:', err);
      setError('Erreur lors du chargement des pays. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Calculer le statut effectif d'un pays (avec pending changes)
  const getEffectiveStatus = useCallback((code: string): boolean => {
    if (code in pendingChanges) {
      return pendingChanges[code];
    }
    return countryStatuses[code]?.isActive ?? false;
  }, [pendingChanges, countryStatuses]);

  // Filtrer les pays
  const filteredCountries = useMemo(() => {
    return validCountries
      .filter(country => {
        // Filtre de recherche
        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          const name = getCountryName(country, lang).toLowerCase();
          const code = country.code.toLowerCase();
          if (!name.includes(search) && !code.includes(search)) {
            return false;
          }
        }

        // Filtre par statut
        const isActive = getEffectiveStatus(country.code);
        if (statusFilter === 'active' && !isActive) return false;
        if (statusFilter === 'inactive' && isActive) return false;

        // Filtre par région
        if (regionFilter !== 'all' && country.region !== regionFilter) return false;

        return true;
      })
      .sort((a, b) => {
        // Priorité d'abord, puis nom
        const priorityA = a.priority || 999;
        const priorityB = b.priority || 999;
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        return getCountryName(a, lang).localeCompare(getCountryName(b, lang));
      });
  }, [searchTerm, statusFilter, regionFilter, getEffectiveStatus]);

  // Statistiques
  const stats = useMemo(() => {
    const total = validCountries.length;
    let active = 0;

    validCountries.forEach(country => {
      if (getEffectiveStatus(country.code)) {
        active++;
      }
    });

    return { total, active, inactive: total - active };
  }, [getEffectiveStatus]);

  // Nombre de modifications en attente
  const pendingCount = Object.keys(pendingChanges).length;
  const hasChanges = pendingCount > 0;

  // Toggle un pays
  const handleToggleCountry = useCallback((code: string) => {
    setPendingChanges(prev => {
      const currentStatus = code in prev ? prev[code] : (countryStatuses[code]?.isActive ?? false);
      return {
        ...prev,
        [code]: !currentStatus
      };
    });
    setSuccessMessage(null);
  }, [countryStatuses]);

  // Sauvegarder les modifications
  const handleSaveChanges = useCallback(async () => {
    if (!hasChanges) return;

    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      const entries = Object.entries(pendingChanges);

      // Sauvegarder toutes les modifications
      const promises = entries.map(([code, isActive]) => {
        return setDoc(doc(db, 'country_settings', code.toLowerCase()), {
          code: code.toUpperCase(),
          isActive,
          updatedAt: serverTimestamp(),
          updatedBy: currentUser?.id || 'admin'
        }, { merge: true });
      });

      await Promise.all(promises);

      // Mettre à jour l'état local immédiatement
      setCountryStatuses(prev => {
        const updated = { ...prev };
        entries.forEach(([code, isActive]) => {
          updated[code] = {
            code,
            isActive,
            updatedAt: new Date(),
            updatedBy: currentUser?.id || 'admin'
          };
        });
        return updated;
      });

      setPendingChanges({});
      setSuccessMessage(`${entries.length} pays mis à jour avec succès`);

      // Effacer le message après 3 secondes
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      setError('Erreur lors de la sauvegarde. Veuillez réessayer.');
    } finally {
      setIsSaving(false);
    }
  }, [hasChanges, pendingChanges, currentUser?.id]);

  // Activer tous les pays filtrés
  const handleActivateAll = useCallback(() => {
    setPendingChanges(prev => {
      const newChanges = { ...prev };
      filteredCountries.forEach(country => {
        newChanges[country.code] = true;
      });
      return newChanges;
    });
    setSuccessMessage(null);
  }, [filteredCountries]);

  // Désactiver tous les pays filtrés
  const handleDeactivateAll = useCallback(() => {
    setPendingChanges(prev => {
      const newChanges = { ...prev };
      filteredCountries.forEach(country => {
        newChanges[country.code] = false;
      });
      return newChanges;
    });
    setSuccessMessage(null);
  }, [filteredCountries]);

  // Annuler les modifications
  const handleCancelChanges = useCallback(() => {
    setPendingChanges({});
    setSuccessMessage(null);
  }, []);

  // Affichage loading auth
  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <ErrorBoundary fallback={<div className="p-8 text-center">Une erreur est survenue. Veuillez réessayer.</div>}>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestion des pays</h1>
              <p className="text-sm text-gray-500 mt-1">
                {stats.total} pays disponibles - {stats.active} actifs - {stats.inactive} inactifs
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={loadCountryStatuses}
                variant="outline"
                disabled={isLoading || isSaving}
              >
                <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              {hasChanges && (
                <>
                  <Button
                    onClick={handleCancelChanges}
                    variant="outline"
                    disabled={isSaving}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSaveChanges}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw size={16} className="mr-2 animate-spin" />
                        Sauvegarde...
                      </>
                    ) : (
                      <>
                        <Save size={16} className="mr-2" />
                        Sauvegarder ({pendingCount})
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Messages d'erreur et succès */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <XCircle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-green-800">{successMessage}</span>
              </div>
            </div>
          )}

          {/* Filtres */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Recherche */}
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Rechercher un pays..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              </div>

              {/* Filtre statut */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FilterType)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actifs uniquement</option>
                <option value="inactive">Inactifs uniquement</option>
              </select>

              {/* Filtre région */}
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">Toutes les régions</option>
                {regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>

              {/* Actions en masse */}
              <div className="flex gap-2">
                <Button
                  onClick={handleActivateAll}
                  variant="outline"
                  size="small"
                  disabled={isSaving || filteredCountries.length === 0}
                  aria-label="Activer tous les pays filtrés"
                >
                  <CheckCircle size={16} className="mr-1 text-green-600" />
                  Tout activer
                </Button>
                <Button
                  onClick={handleDeactivateAll}
                  variant="outline"
                  size="small"
                  disabled={isSaving || filteredCountries.length === 0}
                  aria-label="Désactiver tous les pays filtrés"
                >
                  <XCircle size={16} className="mr-1 text-red-600" />
                  Tout désactiver
                </Button>
              </div>
            </div>
          </div>

          {/* Avertissement changements non sauvegardés - hauteur fixe pour éviter les sauts */}
          <div className={`mb-6 transition-opacity duration-200 ${hasChanges ? 'opacity-100' : 'opacity-0 pointer-events-none h-0 mb-0'}`}>
            {hasChanges && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                  <span className="text-yellow-800 font-medium">
                    {pendingCount} modification(s) en attente - N'oubliez pas de sauvegarder
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Grille des pays */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">Chargement des pays...</p>
              </div>
            ) : filteredCountries.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Globe size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Aucun pays ne correspond aux critères de recherche</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredCountries.map((country) => {
                  const isActive = getEffectiveStatus(country.code);
                  const hasChange = country.code in pendingChanges;

                  return (
                    <div
                      key={country.code}
                      onClick={() => handleToggleCountry(country.code)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleToggleCountry(country.code);
                        }
                      }}
                      className={`
                        p-4 border-b border-r border-gray-100 cursor-pointer transition-colors duration-150
                        ${isActive ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-gray-50'}
                        ${hasChange ? 'ring-2 ring-yellow-400 ring-inset' : ''}
                        focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-inset
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 min-w-0">
                          <span className="text-2xl flex-shrink-0">{country.flag}</span>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {getCountryName(country, lang)}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {country.code} - {country.region}
                            </p>
                          </div>
                        </div>
                        <div className={`
                          w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ml-2
                          ${isActive ? 'bg-green-500' : 'bg-gray-300'}
                          transition-colors duration-150
                        `}>
                          {isActive ? (
                            <CheckCircle size={14} className="text-white" />
                          ) : (
                            <XCircle size={14} className="text-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer avec compteur */}
          <div className="mt-4 text-sm text-gray-500 text-center">
            Affichage de {filteredCountries.length} pays sur {stats.total}
          </div>
        </div>
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminCountries;
