import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  Search,
  CheckCircle,
  XCircle,
  Filter,
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

// Interface combinée pour l'affichage
interface CountryDisplay extends CountryData {
  isActive: boolean;
  updatedAt?: Date;
}

type FilterType = 'all' | 'active' | 'inactive';
type RegionFilter = 'all' | string;

const AdminCountries: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // États
  const [countryStatuses, setCountryStatuses] = useState<Map<string, CountryStatus>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('all');
  const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(new Map());

  // Langue de l'interface admin (français par défaut)
  const lang: string = 'fr';

  // Obtenir le nom du pays selon la langue
  const getCountryName = (country: CountryData): string => {
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

  // Liste des régions uniques
  const regions = useMemo(() => {
    const regionSet = new Set<string>();
    countriesData.forEach(c => {
      if (c.region && c.code !== 'SEPARATOR') {
        regionSet.add(c.region);
      }
    });
    return Array.from(regionSet).sort();
  }, []);

  // Filtrer les pays (exclure le séparateur)
  const filteredCountries = useMemo(() => {
    return countriesData
      .filter(country => country.code !== 'SEPARATOR' && !country.disabled)
      .filter(country => {
        // Filtre de recherche
        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          const name = getCountryName(country).toLowerCase();
          const code = country.code.toLowerCase();
          if (!name.includes(search) && !code.includes(search)) {
            return false;
          }
        }

        // Filtre par statut
        const isActive = pendingChanges.has(country.code)
          ? pendingChanges.get(country.code)
          : (countryStatuses.get(country.code)?.isActive ?? false);

        if (statusFilter === 'active' && !isActive) return false;
        if (statusFilter === 'inactive' && isActive) return false;

        // Filtre par région
        if (regionFilter !== 'all' && country.region !== regionFilter) return false;

        return true;
      })
      .sort((a, b) => {
        // Priorité d'abord, puis nom
        if ((a.priority || 999) !== (b.priority || 999)) {
          return (a.priority || 999) - (b.priority || 999);
        }
        return getCountryName(a).localeCompare(getCountryName(b));
      });
  }, [searchTerm, statusFilter, regionFilter, countryStatuses, pendingChanges]);

  // Statistiques
  const stats = useMemo(() => {
    const total = countriesData.filter(c => c.code !== 'SEPARATOR' && !c.disabled).length;
    let active = 0;

    countriesData.forEach(country => {
      if (country.code === 'SEPARATOR' || country.disabled) return;
      const isActive = pendingChanges.has(country.code)
        ? pendingChanges.get(country.code)
        : (countryStatuses.get(country.code)?.isActive ?? false);
      if (isActive) active++;
    });

    return { total, active, inactive: total - active };
  }, [countryStatuses, pendingChanges]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
      return;
    }
    loadCountryStatuses();
  }, [currentUser, navigate]);

  const loadCountryStatuses = async () => {
    try {
      setIsLoading(true);

      // Charger les statuts depuis Firestore
      const statusesQuery = query(collection(db, 'country_settings'));
      const snapshot = await getDocs(statusesQuery);

      const statusMap = new Map<string, CountryStatus>();
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        statusMap.set(docSnap.id.toUpperCase(), {
          code: docSnap.id.toUpperCase(),
          isActive: data.isActive ?? false,
          updatedAt: data.updatedAt?.toDate() || new Date(),
          updatedBy: data.updatedBy
        });
      });

      setCountryStatuses(statusMap);
      setPendingChanges(new Map());

    } catch (error) {
      console.error('Erreur chargement statuts pays:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCountry = (code: string) => {
    const currentStatus = pendingChanges.has(code)
      ? pendingChanges.get(code)
      : (countryStatuses.get(code)?.isActive ?? false);

    const newChanges = new Map(pendingChanges);
    newChanges.set(code, !currentStatus);
    setPendingChanges(newChanges);
  };

  const handleSaveChanges = async () => {
    if (pendingChanges.size === 0) return;

    try {
      setIsSaving(true);

      // Sauvegarder toutes les modifications en batch
      const promises = Array.from(pendingChanges.entries()).map(([code, isActive]) => {
        return setDoc(doc(db, 'country_settings', code.toLowerCase()), {
          code: code.toUpperCase(),
          isActive,
          updatedAt: serverTimestamp(),
          updatedBy: currentUser?.id || 'admin'
        }, { merge: true });
      });

      await Promise.all(promises);

      // Recharger les statuts
      await loadCountryStatuses();

      alert(`${pendingChanges.size} pays mis à jour avec succès`);

    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleActivateAll = () => {
    const newChanges = new Map(pendingChanges);
    filteredCountries.forEach(country => {
      newChanges.set(country.code, true);
    });
    setPendingChanges(newChanges);
  };

  const handleDeactivateAll = () => {
    const newChanges = new Map(pendingChanges);
    filteredCountries.forEach(country => {
      newChanges.set(country.code, false);
    });
    setPendingChanges(newChanges);
  };

  const getCountryStatus = (code: string): boolean => {
    if (pendingChanges.has(code)) {
      return pendingChanges.get(code)!;
    }
    return countryStatuses.get(code)?.isActive ?? false;
  };

  const hasChanges = pendingChanges.size > 0;

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
                disabled={isLoading}
              >
                <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              {hasChanges && (
                <Button
                  onClick={handleSaveChanges}
                  className="bg-green-600 hover:bg-green-700"
                  loading={isSaving}
                >
                  <Save size={16} className="mr-2" />
                  Sauvegarder ({pendingChanges.size})
                </Button>
              )}
            </div>
          </div>

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
                  aria-label="Activer tous les pays filtrés"
                >
                  <CheckCircle size={16} className="mr-1 text-green-600" />
                  Tout activer
                </Button>
                <Button
                  onClick={handleDeactivateAll}
                  variant="outline"
                  size="small"
                  aria-label="Désactiver tous les pays filtrés"
                >
                  <XCircle size={16} className="mr-1 text-red-600" />
                  Tout désactiver
                </Button>
              </div>
            </div>
          </div>

          {/* Avertissement changements non sauvegardés */}
          {hasChanges && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <Filter className="h-5 w-5 text-yellow-600 mr-2" />
                <span className="text-yellow-800 font-medium">
                  {pendingChanges.size} modification(s) en attente - N'oubliez pas de sauvegarder
                </span>
              </div>
            </div>
          )}

          {/* Grille des pays */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">Chargement des pays...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-0">
                {filteredCountries.map((country) => {
                  const isActive = getCountryStatus(country.code);
                  const hasChange = pendingChanges.has(country.code);

                  return (
                    <div
                      key={country.code}
                      onClick={() => handleToggleCountry(country.code)}
                      className={`
                        p-4 border-b border-r border-gray-100 cursor-pointer transition-all
                        ${isActive ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-gray-50'}
                        ${hasChange ? 'ring-2 ring-yellow-400 ring-inset' : ''}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{country.flag}</span>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {getCountryName(country)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {country.code} - {country.region}
                            </p>
                          </div>
                        </div>
                        <div className={`
                          w-6 h-6 rounded-full flex items-center justify-center
                          ${isActive ? 'bg-green-500' : 'bg-gray-300'}
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

            {!isLoading && filteredCountries.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Globe size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Aucun pays ne correspond aux critères de recherche</p>
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
