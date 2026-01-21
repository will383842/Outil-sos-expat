/**
 * CountryCoverageTab - Couverture des pays par avocats francophones
 *
 * Permet à l'admin de :
 * - Voir la couverture des pays (non couverts, faible, bien couverts)
 * - Créer des avocats francophones pour les pays non couverts
 * - Créer des profils AAA internes
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  Check,
  Plus,
  X,
  Loader2,
  Scale,
  Globe,
  Phone,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Mail,
  Languages,
} from 'lucide-react';
import {
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAdminReferenceData } from '../../../hooks/useAdminReferenceData';
import { cn } from '../../../utils/cn';

// =============================================================================
// TYPES
// =============================================================================

interface CountryConfig {
  countryCode: string;
  countryName: { en: string; fr: string };
  flag: string;
  region: string;
  isActive: boolean;
}

interface CountryCoverage {
  countryCode: string;
  countryName: string;
  flag: string;
  region: string;
  frenchLawyersCount: number;
  lawyers: { id: string; name: string; email: string }[];
}

type CoverageFilter = 'all' | 'uncovered' | 'low' | 'covered';

// =============================================================================
// DONNÉES PAYS (159 pays actifs)
// =============================================================================

const ALL_COUNTRIES: CountryConfig[] = [
  // EU (27)
  { countryCode: 'AT', countryName: { en: 'Austria', fr: 'Autriche' }, flag: '🇦🇹', region: 'EU', isActive: true },
  { countryCode: 'BE', countryName: { en: 'Belgium', fr: 'Belgique' }, flag: '🇧🇪', region: 'EU', isActive: true },
  { countryCode: 'BG', countryName: { en: 'Bulgaria', fr: 'Bulgarie' }, flag: '🇧🇬', region: 'EU', isActive: true },
  { countryCode: 'HR', countryName: { en: 'Croatia', fr: 'Croatie' }, flag: '🇭🇷', region: 'EU', isActive: true },
  { countryCode: 'CY', countryName: { en: 'Cyprus', fr: 'Chypre' }, flag: '🇨🇾', region: 'EU', isActive: true },
  { countryCode: 'CZ', countryName: { en: 'Czech Republic', fr: 'République tchèque' }, flag: '🇨🇿', region: 'EU', isActive: true },
  { countryCode: 'DK', countryName: { en: 'Denmark', fr: 'Danemark' }, flag: '🇩🇰', region: 'EU', isActive: true },
  { countryCode: 'EE', countryName: { en: 'Estonia', fr: 'Estonie' }, flag: '🇪🇪', region: 'EU', isActive: true },
  { countryCode: 'FI', countryName: { en: 'Finland', fr: 'Finlande' }, flag: '🇫🇮', region: 'EU', isActive: true },
  { countryCode: 'FR', countryName: { en: 'France', fr: 'France' }, flag: '🇫🇷', region: 'EU', isActive: true },
  { countryCode: 'DE', countryName: { en: 'Germany', fr: 'Allemagne' }, flag: '🇩🇪', region: 'EU', isActive: true },
  { countryCode: 'GR', countryName: { en: 'Greece', fr: 'Grèce' }, flag: '🇬🇷', region: 'EU', isActive: true },
  { countryCode: 'HU', countryName: { en: 'Hungary', fr: 'Hongrie' }, flag: '🇭🇺', region: 'EU', isActive: true },
  { countryCode: 'IE', countryName: { en: 'Ireland', fr: 'Irlande' }, flag: '🇮🇪', region: 'EU', isActive: true },
  { countryCode: 'IT', countryName: { en: 'Italy', fr: 'Italie' }, flag: '🇮🇹', region: 'EU', isActive: true },
  { countryCode: 'LV', countryName: { en: 'Latvia', fr: 'Lettonie' }, flag: '🇱🇻', region: 'EU', isActive: true },
  { countryCode: 'LT', countryName: { en: 'Lithuania', fr: 'Lituanie' }, flag: '🇱🇹', region: 'EU', isActive: true },
  { countryCode: 'LU', countryName: { en: 'Luxembourg', fr: 'Luxembourg' }, flag: '🇱🇺', region: 'EU', isActive: true },
  { countryCode: 'MT', countryName: { en: 'Malta', fr: 'Malte' }, flag: '🇲🇹', region: 'EU', isActive: true },
  { countryCode: 'NL', countryName: { en: 'Netherlands', fr: 'Pays-Bas' }, flag: '🇳🇱', region: 'EU', isActive: true },
  { countryCode: 'PL', countryName: { en: 'Poland', fr: 'Pologne' }, flag: '🇵🇱', region: 'EU', isActive: true },
  { countryCode: 'PT', countryName: { en: 'Portugal', fr: 'Portugal' }, flag: '🇵🇹', region: 'EU', isActive: true },
  { countryCode: 'RO', countryName: { en: 'Romania', fr: 'Roumanie' }, flag: '🇷🇴', region: 'EU', isActive: true },
  { countryCode: 'SK', countryName: { en: 'Slovakia', fr: 'Slovaquie' }, flag: '🇸🇰', region: 'EU', isActive: true },
  { countryCode: 'SI', countryName: { en: 'Slovenia', fr: 'Slovénie' }, flag: '🇸🇮', region: 'EU', isActive: true },
  { countryCode: 'ES', countryName: { en: 'Spain', fr: 'Espagne' }, flag: '🇪🇸', region: 'EU', isActive: true },
  { countryCode: 'SE', countryName: { en: 'Sweden', fr: 'Suède' }, flag: '🇸🇪', region: 'EU', isActive: true },
  // EEA (3)
  { countryCode: 'IS', countryName: { en: 'Iceland', fr: 'Islande' }, flag: '🇮🇸', region: 'EEA', isActive: true },
  { countryCode: 'LI', countryName: { en: 'Liechtenstein', fr: 'Liechtenstein' }, flag: '🇱🇮', region: 'EEA', isActive: true },
  { countryCode: 'NO', countryName: { en: 'Norway', fr: 'Norvège' }, flag: '🇳🇴', region: 'EEA', isActive: true },
  // Europe Other
  { countryCode: 'GB', countryName: { en: 'United Kingdom', fr: 'Royaume-Uni' }, flag: '🇬🇧', region: 'EUROPE_OTHER', isActive: true },
  { countryCode: 'CH', countryName: { en: 'Switzerland', fr: 'Suisse' }, flag: '🇨🇭', region: 'EUROPE_OTHER', isActive: true },
  { countryCode: 'UA', countryName: { en: 'Ukraine', fr: 'Ukraine' }, flag: '🇺🇦', region: 'EUROPE_OTHER', isActive: true },
  { countryCode: 'RS', countryName: { en: 'Serbia', fr: 'Serbie' }, flag: '🇷🇸', region: 'EUROPE_OTHER', isActive: true },
  { countryCode: 'AL', countryName: { en: 'Albania', fr: 'Albanie' }, flag: '🇦🇱', region: 'EUROPE_OTHER', isActive: true },
  { countryCode: 'MD', countryName: { en: 'Moldova', fr: 'Moldavie' }, flag: '🇲🇩', region: 'EUROPE_OTHER', isActive: true },
  { countryCode: 'MK', countryName: { en: 'North Macedonia', fr: 'Macédoine du Nord' }, flag: '🇲🇰', region: 'EUROPE_OTHER', isActive: true },
  { countryCode: 'BA', countryName: { en: 'Bosnia and Herzegovina', fr: 'Bosnie-Herzégovine' }, flag: '🇧🇦', region: 'EUROPE_OTHER', isActive: true },
  { countryCode: 'ME', countryName: { en: 'Montenegro', fr: 'Monténégro' }, flag: '🇲🇪', region: 'EUROPE_OTHER', isActive: true },
  { countryCode: 'XK', countryName: { en: 'Kosovo', fr: 'Kosovo' }, flag: '🇽🇰', region: 'EUROPE_OTHER', isActive: true },
  { countryCode: 'TR', countryName: { en: 'Turkey', fr: 'Turquie' }, flag: '🇹🇷', region: 'EUROPE_OTHER', isActive: true },
  { countryCode: 'GE', countryName: { en: 'Georgia', fr: 'Géorgie' }, flag: '🇬🇪', region: 'EUROPE_OTHER', isActive: true },
  { countryCode: 'AM', countryName: { en: 'Armenia', fr: 'Arménie' }, flag: '🇦🇲', region: 'EUROPE_OTHER', isActive: true },
  { countryCode: 'AZ', countryName: { en: 'Azerbaijan', fr: 'Azerbaïdjan' }, flag: '🇦🇿', region: 'EUROPE_OTHER', isActive: true },
  // North America
  { countryCode: 'US', countryName: { en: 'United States', fr: 'États-Unis' }, flag: '🇺🇸', region: 'NORTH_AMERICA', isActive: true },
  { countryCode: 'CA', countryName: { en: 'Canada', fr: 'Canada' }, flag: '🇨🇦', region: 'NORTH_AMERICA', isActive: true },
  { countryCode: 'MX', countryName: { en: 'Mexico', fr: 'Mexique' }, flag: '🇲🇽', region: 'NORTH_AMERICA', isActive: true },
  // Asia Pacific
  { countryCode: 'JP', countryName: { en: 'Japan', fr: 'Japon' }, flag: '🇯🇵', region: 'ASIA_PACIFIC', isActive: true },
  { countryCode: 'KR', countryName: { en: 'South Korea', fr: 'Corée du Sud' }, flag: '🇰🇷', region: 'ASIA_PACIFIC', isActive: true },
  { countryCode: 'CN', countryName: { en: 'China', fr: 'Chine' }, flag: '🇨🇳', region: 'ASIA_PACIFIC', isActive: true },
  { countryCode: 'HK', countryName: { en: 'Hong Kong', fr: 'Hong Kong' }, flag: '🇭🇰', region: 'ASIA_PACIFIC', isActive: true },
  { countryCode: 'SG', countryName: { en: 'Singapore', fr: 'Singapour' }, flag: '🇸🇬', region: 'ASIA_PACIFIC', isActive: true },
  { countryCode: 'AU', countryName: { en: 'Australia', fr: 'Australie' }, flag: '🇦🇺', region: 'OCEANIA', isActive: true },
  { countryCode: 'NZ', countryName: { en: 'New Zealand', fr: 'Nouvelle-Zélande' }, flag: '🇳🇿', region: 'OCEANIA', isActive: true },
  { countryCode: 'IN', countryName: { en: 'India', fr: 'Inde' }, flag: '🇮🇳', region: 'ASIA_PACIFIC', isActive: true },
  { countryCode: 'TW', countryName: { en: 'Taiwan', fr: 'Taïwan' }, flag: '🇹🇼', region: 'ASIA_PACIFIC', isActive: true },
  { countryCode: 'TH', countryName: { en: 'Thailand', fr: 'Thaïlande' }, flag: '🇹🇭', region: 'ASIA_PACIFIC', isActive: true },
  { countryCode: 'MY', countryName: { en: 'Malaysia', fr: 'Malaisie' }, flag: '🇲🇾', region: 'ASIA_PACIFIC', isActive: true },
  { countryCode: 'ID', countryName: { en: 'Indonesia', fr: 'Indonésie' }, flag: '🇮🇩', region: 'ASIA_PACIFIC', isActive: true },
  { countryCode: 'PH', countryName: { en: 'Philippines', fr: 'Philippines' }, flag: '🇵🇭', region: 'ASIA_PACIFIC', isActive: true },
  { countryCode: 'VN', countryName: { en: 'Vietnam', fr: 'Vietnam' }, flag: '🇻🇳', region: 'ASIA_PACIFIC', isActive: true },
  // Middle East
  { countryCode: 'AE', countryName: { en: 'United Arab Emirates', fr: 'Émirats arabes unis' }, flag: '🇦🇪', region: 'MIDDLE_EAST', isActive: true },
  { countryCode: 'SA', countryName: { en: 'Saudi Arabia', fr: 'Arabie saoudite' }, flag: '🇸🇦', region: 'MIDDLE_EAST', isActive: true },
  { countryCode: 'IL', countryName: { en: 'Israel', fr: 'Israël' }, flag: '🇮🇱', region: 'MIDDLE_EAST', isActive: true },
  { countryCode: 'QA', countryName: { en: 'Qatar', fr: 'Qatar' }, flag: '🇶🇦', region: 'MIDDLE_EAST', isActive: true },
  { countryCode: 'KW', countryName: { en: 'Kuwait', fr: 'Koweït' }, flag: '🇰🇼', region: 'MIDDLE_EAST', isActive: true },
  { countryCode: 'BH', countryName: { en: 'Bahrain', fr: 'Bahreïn' }, flag: '🇧🇭', region: 'MIDDLE_EAST', isActive: true },
  { countryCode: 'OM', countryName: { en: 'Oman', fr: 'Oman' }, flag: '🇴🇲', region: 'MIDDLE_EAST', isActive: true },
  { countryCode: 'EG', countryName: { en: 'Egypt', fr: 'Égypte' }, flag: '🇪🇬', region: 'MIDDLE_EAST', isActive: true },
  { countryCode: 'JO', countryName: { en: 'Jordan', fr: 'Jordanie' }, flag: '🇯🇴', region: 'MIDDLE_EAST', isActive: true },
  { countryCode: 'LB', countryName: { en: 'Lebanon', fr: 'Liban' }, flag: '🇱🇧', region: 'MIDDLE_EAST', isActive: true },
  // Latin America
  { countryCode: 'BR', countryName: { en: 'Brazil', fr: 'Brésil' }, flag: '🇧🇷', region: 'LATIN_AMERICA', isActive: true },
  { countryCode: 'AR', countryName: { en: 'Argentina', fr: 'Argentine' }, flag: '🇦🇷', region: 'LATIN_AMERICA', isActive: true },
  { countryCode: 'CL', countryName: { en: 'Chile', fr: 'Chili' }, flag: '🇨🇱', region: 'LATIN_AMERICA', isActive: true },
  { countryCode: 'CO', countryName: { en: 'Colombia', fr: 'Colombie' }, flag: '🇨🇴', region: 'LATIN_AMERICA', isActive: true },
  { countryCode: 'PE', countryName: { en: 'Peru', fr: 'Pérou' }, flag: '🇵🇪', region: 'LATIN_AMERICA', isActive: true },
  { countryCode: 'DO', countryName: { en: 'Dominican Republic', fr: 'République dominicaine' }, flag: '🇩🇴', region: 'CARIBBEAN', isActive: true },
  { countryCode: 'HT', countryName: { en: 'Haiti', fr: 'Haïti' }, flag: '🇭🇹', region: 'CARIBBEAN', isActive: true },
  // Africa
  { countryCode: 'ZA', countryName: { en: 'South Africa', fr: 'Afrique du Sud' }, flag: '🇿🇦', region: 'AFRICA', isActive: true },
  { countryCode: 'NG', countryName: { en: 'Nigeria', fr: 'Nigeria' }, flag: '🇳🇬', region: 'AFRICA', isActive: true },
  { countryCode: 'KE', countryName: { en: 'Kenya', fr: 'Kenya' }, flag: '🇰🇪', region: 'AFRICA', isActive: true },
  { countryCode: 'GH', countryName: { en: 'Ghana', fr: 'Ghana' }, flag: '🇬🇭', region: 'AFRICA', isActive: true },
  { countryCode: 'MA', countryName: { en: 'Morocco', fr: 'Maroc' }, flag: '🇲🇦', region: 'AFRICA', isActive: true },
  { countryCode: 'DZ', countryName: { en: 'Algeria', fr: 'Algérie' }, flag: '🇩🇿', region: 'AFRICA', isActive: true },
  { countryCode: 'TN', countryName: { en: 'Tunisia', fr: 'Tunisie' }, flag: '🇹🇳', region: 'AFRICA', isActive: true },
  { countryCode: 'SN', countryName: { en: 'Senegal', fr: 'Sénégal' }, flag: '🇸🇳', region: 'AFRICA', isActive: true },
  { countryCode: 'CI', countryName: { en: 'Ivory Coast', fr: 'Côte d\'Ivoire' }, flag: '🇨🇮', region: 'AFRICA', isActive: true },
  { countryCode: 'CM', countryName: { en: 'Cameroon', fr: 'Cameroun' }, flag: '🇨🇲', region: 'AFRICA', isActive: true },
  { countryCode: 'CD', countryName: { en: 'DR Congo', fr: 'RD Congo' }, flag: '🇨🇩', region: 'AFRICA', isActive: true },
  { countryCode: 'RW', countryName: { en: 'Rwanda', fr: 'Rwanda' }, flag: '🇷🇼', region: 'AFRICA', isActive: true },
  { countryCode: 'MU', countryName: { en: 'Mauritius', fr: 'Maurice' }, flag: '🇲🇺', region: 'AFRICA', isActive: true },
  { countryCode: 'MG', countryName: { en: 'Madagascar', fr: 'Madagascar' }, flag: '🇲🇬', region: 'AFRICA', isActive: true },
  { countryCode: 'BJ', countryName: { en: 'Benin', fr: 'Bénin' }, flag: '🇧🇯', region: 'AFRICA', isActive: true },
  { countryCode: 'BF', countryName: { en: 'Burkina Faso', fr: 'Burkina Faso' }, flag: '🇧🇫', region: 'AFRICA', isActive: true },
  { countryCode: 'ML', countryName: { en: 'Mali', fr: 'Mali' }, flag: '🇲🇱', region: 'AFRICA', isActive: true },
  { countryCode: 'NE', countryName: { en: 'Niger', fr: 'Niger' }, flag: '🇳🇪', region: 'AFRICA', isActive: true },
  { countryCode: 'TG', countryName: { en: 'Togo', fr: 'Togo' }, flag: '🇹🇬', region: 'AFRICA', isActive: true },
  { countryCode: 'GA', countryName: { en: 'Gabon', fr: 'Gabon' }, flag: '🇬🇦', region: 'AFRICA', isActive: true },
  { countryCode: 'CG', countryName: { en: 'Congo', fr: 'Congo' }, flag: '🇨🇬', region: 'AFRICA', isActive: true },
];

const ACTIVE_COUNTRIES = ALL_COUNTRIES.filter(c => c.isActive);

// =============================================================================
// COMPONENT
// =============================================================================

interface CountryCoverageTabProps {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export const CountryCoverageTab: React.FC<CountryCoverageTabProps> = ({ onSuccess, onError }) => {
  const { profilesMap } = useAdminReferenceData();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());
  const [createModalCountry, setCreateModalCountry] = useState<CountryCoverage | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Calculer la couverture par pays
  const countryCoverage = useMemo(() => {
    const coverage: CountryCoverage[] = ACTIVE_COUNTRIES.map((country) => {
      const frenchLawyers: { id: string; name: string; email: string }[] = [];

      profilesMap.forEach((profile) => {
        const isLawyer = profile.type === 'lawyer';
        const providerCountry = profile.country?.toUpperCase();
        const isInCountry = providerCountry === country.countryCode;
        const languages = profile.languages || [];
        const speaksFrench = languages.some((l: string) =>
          l.toLowerCase() === 'fr' || l.toLowerCase() === 'français' || l.toLowerCase() === 'french'
        );
        // Ne compter que les avocats approuvés et actifs (visibles sur la plateforme)
        const isApproved = profile.isApproved === true;
        const isActive = profile.isActive !== false; // Par défaut actif si non défini

        if (isLawyer && isInCountry && speaksFrench && isApproved && isActive) {
          frenchLawyers.push({
            id: profile.id,
            name: profile.displayName || 'N/A',
            email: profile.email || '',
          });
        }
      });

      return {
        countryCode: country.countryCode,
        countryName: country.countryName.fr,
        flag: country.flag,
        region: country.region,
        frenchLawyersCount: frenchLawyers.length,
        lawyers: frenchLawyers,
      };
    });

    return coverage;
  }, [profilesMap]);

  // Filtrer la couverture
  const filteredCoverage = useMemo(() => {
    return countryCoverage.filter((c) => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!c.countryName.toLowerCase().includes(search) && !c.countryCode.toLowerCase().includes(search)) {
          return false;
        }
      }
      if (coverageFilter === 'uncovered' && c.frenchLawyersCount > 0) return false;
      if (coverageFilter === 'low' && (c.frenchLawyersCount === 0 || c.frenchLawyersCount > 2)) return false;
      if (coverageFilter === 'covered' && c.frenchLawyersCount < 3) return false;
      if (regionFilter !== 'all' && c.region !== regionFilter) return false;
      return true;
    });
  }, [countryCoverage, searchTerm, coverageFilter, regionFilter]);

  // Stats
  const stats = useMemo(() => {
    const uncovered = countryCoverage.filter((c) => c.frenchLawyersCount === 0).length;
    const lowCoverage = countryCoverage.filter((c) => c.frenchLawyersCount > 0 && c.frenchLawyersCount <= 2).length;
    const covered = countryCoverage.filter((c) => c.frenchLawyersCount >= 3).length;
    let totalFrenchLawyers = 0;
    profilesMap.forEach((profile) => {
      const languages = profile.languages || [];
      const isApproved = profile.isApproved === true;
      const isActive = profile.isActive !== false;
      if (profile.type === 'lawyer' && isApproved && isActive && languages.some((l: string) =>
        l.toLowerCase() === 'fr' || l.toLowerCase() === 'français' || l.toLowerCase() === 'french'
      )) {
        totalFrenchLawyers++;
      }
    });
    return { totalCountries: ACTIVE_COUNTRIES.length, uncovered, lowCoverage, covered, totalFrenchLawyers };
  }, [countryCoverage, profilesMap]);

  // Régions
  const regions = useMemo(() => {
    const regionSet = new Set(ACTIVE_COUNTRIES.map((c) => c.region));
    return Array.from(regionSet).sort();
  }, []);

  // Actions
  const toggleSelectCountry = useCallback((code: string) => {
    setSelectedCountries((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const selectAllUncovered = useCallback(() => {
    const uncoveredCodes = filteredCoverage.filter((c) => c.frenchLawyersCount === 0).map((c) => c.countryCode);
    setSelectedCountries(new Set(uncoveredCodes));
  }, [filteredCoverage]);

  const clearSelection = useCallback(() => {
    setSelectedCountries(new Set());
  }, []);

  const handleCreateLawyer = async (
    country: CountryCoverage,
    data: { email: string; name: string; phone?: string; languages: string[]; isAAA?: boolean }
  ) => {
    setIsCreating(true);
    try {
      const providerId = `manual_${Date.now()}`;
      const baseData = {
        email: data.email.toLowerCase(),
        displayName: data.name,
        type: 'lawyer',
        country: country.countryCode,
        languages: data.languages,
        phone: data.phone || null,
        isActive: true,
        isOnline: false,
        availability: 'offline',
        manual: true,
        isAAA: data.isAAA || false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'sos_profiles', providerId), baseData);

      if (data.isAAA) {
        await setDoc(doc(db, 'users', providerId), {
          ...baseData,
          role: 'provider',
          aaaPayoutMode: 'internal',
        });
      }

      onSuccess(`Avocat ${data.isAAA ? 'AAA ' : ''}créé pour ${country.countryName}`);
      setCreateModalCountry(null);
    } catch (err) {
      console.error('Erreur création avocat:', err);
      onError('Erreur lors de la création');
    } finally {
      setIsCreating(false);
    }
  };

  const handleBatchCreate = async (data: { baseEmail: string; baseName: string }) => {
    setIsCreating(true);
    try {
      const selectedCoverages = countryCoverage.filter((c) => selectedCountries.has(c.countryCode));
      for (const country of selectedCoverages) {
        const providerId = `manual_${Date.now()}_${country.countryCode}`;
        const email = data.baseEmail.replace(/{pays}/gi, country.countryCode.toLowerCase());
        const name = data.baseName.replace(/{pays}/gi, country.countryName);
        await setDoc(doc(db, 'sos_profiles', providerId), {
          email: email.toLowerCase(),
          displayName: name,
          type: 'lawyer',
          country: country.countryCode,
          languages: ['fr'],
          isActive: true,
          isOnline: false,
          availability: 'offline',
          manual: true,
          batch: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await new Promise((r) => setTimeout(r, 50));
      }
      onSuccess(`${selectedCoverages.length} avocats créés`);
      setSelectedCountries(new Set());
      setShowBatchModal(false);
    } catch (err) {
      console.error('Erreur création par lot:', err);
      onError('Erreur lors de la création par lot');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Globe} value={stats.totalCountries} label="Pays total" color="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
        <StatCard icon={XCircle} value={stats.uncovered} label="Non couverts" color="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" />
        <StatCard icon={AlertTriangle} value={stats.lowCoverage} label="Faible (1-2)" color="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" />
        <StatCard icon={CheckCircle} value={stats.covered} label="Bien couverts (3+)" color="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" />
        <StatCard icon={Scale} value={stats.totalFrenchLawyers} label="Avocats FR" color="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" />
      </div>

      {/* Filtres */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un pays..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-sos-red"
            />
          </div>
          <select
            value={coverageFilter}
            onChange={(e) => setCoverageFilter(e.target.value as CoverageFilter)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            <option value="all">Tous les pays</option>
            <option value="uncovered">Non couverts (0)</option>
            <option value="low">Faible couverture (1-2)</option>
            <option value="covered">Bien couverts (3+)</option>
          </select>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            <option value="all">Toutes les régions</option>
            {regions.map((region) => (
              <option key={region} value={region}>{region.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        {selectedCountries.size > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">{selectedCountries.size} pays sélectionné(s)</span>
            <div className="flex gap-2">
              <button onClick={clearSelection} className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">Désélectionner</button>
              <button
                onClick={() => setShowBatchModal(true)}
                className="px-4 py-1.5 bg-sos-red text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Créer par lot
              </button>
            </div>
          </div>
        )}

        {selectedCountries.size === 0 && filteredCoverage.some((c) => c.frenchLawyersCount === 0) && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button onClick={selectAllUncovered} className="text-sm text-sos-red hover:text-red-700 font-medium">
              Sélectionner tous les pays non couverts
            </button>
          </div>
        )}
      </div>

      {/* Grille pays */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCoverage.map((coverage) => (
          <CountryCard
            key={coverage.countryCode}
            coverage={coverage}
            isSelected={selectedCountries.has(coverage.countryCode)}
            onToggle={() => toggleSelectCountry(coverage.countryCode)}
            onCreate={() => setCreateModalCountry(coverage)}
            isCreating={isCreating}
          />
        ))}
      </div>

      {filteredCoverage.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Globe className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Aucun pays trouvé</h3>
          <p className="text-gray-500 dark:text-gray-400">Modifiez vos filtres pour voir plus de pays</p>
        </div>
      )}

      {/* Modals */}
      {createModalCountry && (
        <CreateLawyerModal
          country={createModalCountry}
          onClose={() => setCreateModalCountry(null)}
          onSubmit={(data) => handleCreateLawyer(createModalCountry, data)}
          isLoading={isCreating}
        />
      )}

      {showBatchModal && (
        <BatchCreateModal
          selectedCountries={countryCoverage.filter((c) => selectedCountries.has(c.countryCode))}
          onClose={() => setShowBatchModal(false)}
          onSubmit={handleBatchCreate}
          isLoading={isCreating}
        />
      )}
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

const StatCard: React.FC<{ icon: React.ElementType; value: number; label: string; color: string }> = ({ icon: Icon, value, label, color }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4">
    <div className={cn("p-3 rounded-lg", color)}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
    </div>
  </div>
);

const CountryCard: React.FC<{
  coverage: CountryCoverage;
  isSelected: boolean;
  onToggle: () => void;
  onCreate: () => void;
  isCreating: boolean;
}> = ({ coverage, isSelected, onToggle, onCreate, isCreating }) => {
  const getStatus = () => {
    if (coverage.frenchLawyersCount === 0) return { color: 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200', icon: XCircle, label: 'Non couvert' };
    if (coverage.frenchLawyersCount <= 2) return { color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200', icon: AlertTriangle, label: `${coverage.frenchLawyersCount} avocat(s)` };
    return { color: 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200', icon: CheckCircle, label: `${coverage.frenchLawyersCount} avocats` };
  };
  const status = getStatus();
  const StatusIcon = status.icon;

  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 rounded-xl border p-4 transition-all",
      isSelected ? "border-sos-red ring-2 ring-red-200" : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className={cn(
              "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
              isSelected ? "bg-sos-red border-sos-red" : "border-gray-300 hover:border-gray-400"
            )}
          >
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{coverage.flag}</span>
              <span className="font-medium text-gray-900 dark:text-white">{coverage.countryName}</span>
            </div>
            <span className="text-xs text-gray-500">{coverage.countryCode}</span>
          </div>
        </div>
        <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border", status.color)}>
          <StatusIcon className="w-3.5 h-3.5" />
          {status.label}
        </div>
      </div>

      {coverage.lawyers.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="text-xs text-gray-500 mb-2">Avocats francophones :</div>
          <div className="space-y-1">
            {coverage.lawyers.slice(0, 3).map((lawyer) => (
              <div key={lawyer.id} className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Scale className="w-3 h-3 text-blue-500" />
                <span className="truncate">{lawyer.name || lawyer.email}</span>
              </div>
            ))}
            {coverage.lawyers.length > 3 && <div className="text-xs text-gray-400">+{coverage.lawyers.length - 3} autres</div>}
          </div>
        </div>
      )}

      {coverage.frenchLawyersCount < 3 && (
        <button
          onClick={onCreate}
          disabled={isCreating}
          className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-100 text-sm font-medium disabled:opacity-50"
        >
          {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Créer avocat FR
        </button>
      )}
    </div>
  );
};

const CreateLawyerModal: React.FC<{
  country: CountryCoverage;
  onClose: () => void;
  onSubmit: (data: { email: string; name: string; phone?: string; languages: string[]; isAAA?: boolean }) => Promise<void>;
  isLoading: boolean;
}> = ({ country, onClose, onSubmit, isLoading }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [languages, setLanguages] = useState<string[]>(['fr']);
  const [isAAA, setIsAAA] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) { setError('Email et nom obligatoires'); return; }
    setError(null);
    try { await onSubmit({ email, name, phone, languages, isAAA }); }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur'); }
  };

  const toggleLang = (l: string) => {
    if (l === 'fr') return;
    setLanguages((p) => p.includes(l) ? p.filter((x) => x !== l) : [...p, l]);
  };

  const langs = [
    { code: 'fr', label: 'Français', req: true },
    { code: 'en', label: 'Anglais' },
    { code: 'es', label: 'Espagnol' },
    { code: 'de', label: 'Allemand' },
    { code: 'ar', label: 'Arabe' },
    { code: 'pt', label: 'Portugais' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{country.flag}</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Créer avocat francophone</h2>
              <p className="text-sm text-gray-500">{country.countryName} ({country.countryCode})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="avocat@cabinet.com" className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom *</label>
            <div className="relative">
              <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Cabinet Maître Dupont" className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+33 1 42 00 00 00" className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"><Languages className="inline w-4 h-4 mr-1" />Langues</label>
            <div className="flex flex-wrap gap-2">
              {langs.map((l) => (
                <button key={l.code} type="button" onClick={() => toggleLang(l.code)} disabled={l.req}
                  className={cn("px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    languages.includes(l.code) ? (l.req ? "bg-red-100 text-red-700 cursor-not-allowed" : "bg-sos-red text-white") : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}>{l.label}{l.req && ' *'}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div>
              <div className="font-medium text-purple-700 dark:text-purple-400">Profil AAA interne</div>
              <div className="text-xs text-purple-600 dark:text-purple-500">Créer comme avocat AAA</div>
            </div>
            <button type="button" onClick={() => setIsAAA(!isAAA)} className={cn("w-12 h-6 rounded-full transition-colors flex items-center", isAAA ? "bg-purple-600 justify-end" : "bg-gray-300 dark:bg-gray-600 justify-start")}>
              <div className="w-5 h-5 rounded-full bg-white shadow mx-0.5" />
            </button>
          </div>
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={isLoading} className="flex-1 px-4 py-2 bg-sos-red text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" />Créer</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BatchCreateModal: React.FC<{
  selectedCountries: CountryCoverage[];
  onClose: () => void;
  onSubmit: (data: { baseEmail: string; baseName: string }) => Promise<void>;
  isLoading: boolean;
}> = ({ selectedCountries, onClose, onSubmit, isLoading }) => {
  const [baseEmail, setBaseEmail] = useState('');
  const [baseName, setBaseName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseEmail || !baseName) { setError('Email et nom obligatoires'); return; }
    setError(null);
    try { await onSubmit({ baseEmail, baseName }); }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur'); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Création par lot</h2>
            <p className="text-sm text-gray-500">{selectedCountries.length} pays sélectionnés</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg max-h-32 overflow-y-auto">
          <div className="flex flex-wrap gap-2">
            {selectedCountries.map((c) => (
              <span key={c.countryCode} className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded-full text-sm border">{c.flag} {c.countryCode}</span>
            ))}
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email de base *</label>
            <input type="text" value={baseEmail} onChange={(e) => setBaseEmail(e.target.value)} placeholder="avocat-{pays}@cabinet.com" className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg" required />
            <p className="text-xs text-gray-500 mt-1">Utilisez {'{pays}'} pour le code pays</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom de base *</label>
            <input type="text" value={baseName} onChange={(e) => setBaseName(e.target.value)} placeholder="Cabinet SOS-Expat {pays}" className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg" required />
            <p className="text-xs text-gray-500 mt-1">Utilisez {'{pays}'} pour le nom du pays</p>
          </div>
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={isLoading} className="flex-1 px-4 py-2 bg-sos-red text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" />Créer {selectedCountries.length} avocats</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CountryCoverageTab;
