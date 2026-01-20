/**
 * =============================================================================
 * PAGE MULTI-PRESTATAIRES — Gestion de la couverture pays + comptes multi
 * =============================================================================
 *
 * Cette page permet de :
 * 1. Voir la couverture des pays par avocats francophones (temps réel)
 * 2. Créer des avocats francophones pour les pays non couverts
 * 3. Gérer les comptes multi-prestataires existants
 *
 * Structure :
 * - Stats globales en haut
 * - Onglets : Couverture Pays | Comptes Multi-prestataires
 * - Création individuelle ou par lot
 */

import { useEffect, useState, useMemo, useCallback, memo } from "react";
import { useLanguage } from "../../hooks/useLanguage";
import { useAuth } from "../../contexts/UnifiedUserContext";
import { logAuditEntry } from "../../lib/auditLog";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { showSuccess, showError } from "../../lib/toast";
import {
  Globe,
  MapPin,
  Scale,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Plus,
  UsersRound,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Languages,
  Filter,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { Switch } from "../../components/ui/switch";

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

interface Provider {
  id: string;
  name?: string;
  email?: string;
  type?: "lawyer" | "expat";
  country?: string;
  languages?: string[];
  phone?: string;
  active?: boolean;
  createdAt?: Timestamp;
}

interface UserAccount {
  id: string;
  email?: string;
  displayName?: string;
  role?: "admin" | "agent" | "provider";
  isMultiProvider?: boolean;
  linkedProviderIds?: string[];
  createdAt?: Timestamp;
}

interface CountryCoverage {
  countryCode: string;
  countryName: string;
  flag: string;
  region: string;
  frenchLawyersCount: number;
  lawyers: Provider[];
}

type TabType = "coverage" | "accounts";
type CoverageFilter = "all" | "uncovered" | "low" | "covered";

// =============================================================================
// DONNÉES PAYS STATIQUES (197 pays)
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
  // Europe Other (15)
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
  { countryCode: 'BY', countryName: { en: 'Belarus', fr: 'Biélorussie' }, flag: '🇧🇾', region: 'EUROPE_OTHER', isActive: false },
  { countryCode: 'RU', countryName: { en: 'Russia', fr: 'Russie' }, flag: '🇷🇺', region: 'EUROPE_OTHER', isActive: false },
  // North America (3)
  { countryCode: 'US', countryName: { en: 'United States', fr: 'États-Unis' }, flag: '🇺🇸', region: 'NORTH_AMERICA', isActive: true },
  { countryCode: 'CA', countryName: { en: 'Canada', fr: 'Canada' }, flag: '🇨🇦', region: 'NORTH_AMERICA', isActive: true },
  { countryCode: 'MX', countryName: { en: 'Mexico', fr: 'Mexique' }, flag: '🇲🇽', region: 'NORTH_AMERICA', isActive: true },
  // Asia Pacific (20)
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
  { countryCode: 'PK', countryName: { en: 'Pakistan', fr: 'Pakistan' }, flag: '🇵🇰', region: 'ASIA_PACIFIC', isActive: true },
  { countryCode: 'BD', countryName: { en: 'Bangladesh', fr: 'Bangladesh' }, flag: '🇧🇩', region: 'ASIA_PACIFIC', isActive: true },
  { countryCode: 'LK', countryName: { en: 'Sri Lanka', fr: 'Sri Lanka' }, flag: '🇱🇰', region: 'ASIA_PACIFIC', isActive: true },
  { countryCode: 'NP', countryName: { en: 'Nepal', fr: 'Népal' }, flag: '🇳🇵', region: 'ASIA_PACIFIC', isActive: true },
  { countryCode: 'KH', countryName: { en: 'Cambodia', fr: 'Cambodge' }, flag: '🇰🇭', region: 'ASIA_PACIFIC', isActive: true },
  { countryCode: 'MM', countryName: { en: 'Myanmar', fr: 'Myanmar' }, flag: '🇲🇲', region: 'ASIA_PACIFIC', isActive: false },
  // Middle East (15)
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
  { countryCode: 'IQ', countryName: { en: 'Iraq', fr: 'Irak' }, flag: '🇮🇶', region: 'MIDDLE_EAST', isActive: true },
  { countryCode: 'PS', countryName: { en: 'Palestine', fr: 'Palestine' }, flag: '🇵🇸', region: 'MIDDLE_EAST', isActive: true },
  { countryCode: 'YE', countryName: { en: 'Yemen', fr: 'Yémen' }, flag: '🇾🇪', region: 'MIDDLE_EAST', isActive: false },
  { countryCode: 'IR', countryName: { en: 'Iran', fr: 'Iran' }, flag: '🇮🇷', region: 'MIDDLE_EAST', isActive: false },
  { countryCode: 'SY', countryName: { en: 'Syria', fr: 'Syrie' }, flag: '🇸🇾', region: 'MIDDLE_EAST', isActive: false },
  // Latin America (20)
  { countryCode: 'BR', countryName: { en: 'Brazil', fr: 'Brésil' }, flag: '🇧🇷', region: 'LATIN_AMERICA', isActive: true },
  { countryCode: 'AR', countryName: { en: 'Argentina', fr: 'Argentine' }, flag: '🇦🇷', region: 'LATIN_AMERICA', isActive: true },
  { countryCode: 'CL', countryName: { en: 'Chile', fr: 'Chili' }, flag: '🇨🇱', region: 'LATIN_AMERICA', isActive: true },
  { countryCode: 'CO', countryName: { en: 'Colombia', fr: 'Colombie' }, flag: '🇨🇴', region: 'LATIN_AMERICA', isActive: true },
  { countryCode: 'PE', countryName: { en: 'Peru', fr: 'Pérou' }, flag: '🇵🇪', region: 'LATIN_AMERICA', isActive: true },
  { countryCode: 'EC', countryName: { en: 'Ecuador', fr: 'Équateur' }, flag: '🇪🇨', region: 'LATIN_AMERICA', isActive: true },
  { countryCode: 'BO', countryName: { en: 'Bolivia', fr: 'Bolivie' }, flag: '🇧🇴', region: 'LATIN_AMERICA', isActive: true },
  { countryCode: 'PY', countryName: { en: 'Paraguay', fr: 'Paraguay' }, flag: '🇵🇾', region: 'LATIN_AMERICA', isActive: true },
  { countryCode: 'UY', countryName: { en: 'Uruguay', fr: 'Uruguay' }, flag: '🇺🇾', region: 'LATIN_AMERICA', isActive: true },
  { countryCode: 'PA', countryName: { en: 'Panama', fr: 'Panama' }, flag: '🇵🇦', region: 'LATIN_AMERICA', isActive: true },
  { countryCode: 'CR', countryName: { en: 'Costa Rica', fr: 'Costa Rica' }, flag: '🇨🇷', region: 'LATIN_AMERICA', isActive: true },
  { countryCode: 'GT', countryName: { en: 'Guatemala', fr: 'Guatemala' }, flag: '🇬🇹', region: 'LATIN_AMERICA', isActive: true },
  { countryCode: 'HN', countryName: { en: 'Honduras', fr: 'Honduras' }, flag: '🇭🇳', region: 'LATIN_AMERICA', isActive: true },
  { countryCode: 'SV', countryName: { en: 'El Salvador', fr: 'Salvador' }, flag: '🇸🇻', region: 'LATIN_AMERICA', isActive: true },
  { countryCode: 'NI', countryName: { en: 'Nicaragua', fr: 'Nicaragua' }, flag: '🇳🇮', region: 'LATIN_AMERICA', isActive: true },
  { countryCode: 'VE', countryName: { en: 'Venezuela', fr: 'Venezuela' }, flag: '🇻🇪', region: 'LATIN_AMERICA', isActive: false },
  { countryCode: 'CU', countryName: { en: 'Cuba', fr: 'Cuba' }, flag: '🇨🇺', region: 'CARIBBEAN', isActive: false },
  { countryCode: 'DO', countryName: { en: 'Dominican Republic', fr: 'République dominicaine' }, flag: '🇩🇴', region: 'CARIBBEAN', isActive: true },
  { countryCode: 'HT', countryName: { en: 'Haiti', fr: 'Haïti' }, flag: '🇭🇹', region: 'CARIBBEAN', isActive: true },
  { countryCode: 'JM', countryName: { en: 'Jamaica', fr: 'Jamaïque' }, flag: '🇯🇲', region: 'CARIBBEAN', isActive: true },
  // Africa (25)
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
  { countryCode: 'ET', countryName: { en: 'Ethiopia', fr: 'Éthiopie' }, flag: '🇪🇹', region: 'AFRICA', isActive: true },
  { countryCode: 'TZ', countryName: { en: 'Tanzania', fr: 'Tanzanie' }, flag: '🇹🇿', region: 'AFRICA', isActive: true },
  { countryCode: 'UG', countryName: { en: 'Uganda', fr: 'Ouganda' }, flag: '🇺🇬', region: 'AFRICA', isActive: true },
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
  { countryCode: 'AO', countryName: { en: 'Angola', fr: 'Angola' }, flag: '🇦🇴', region: 'AFRICA', isActive: true },
];

// Filtrer seulement les pays actifs
const ACTIVE_COUNTRIES = ALL_COUNTRIES.filter(c => c.isActive);

// =============================================================================
// COMPOSANTS
// =============================================================================

// Carte de statistiques
const StatCard = memo(function StatCard({
  label,
  value,
  icon: Icon,
  color,
  subtext,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  subtext?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-600">{label}</div>
        {subtext && <div className="text-xs text-gray-400">{subtext}</div>}
      </div>
    </div>
  );
});

// Carte pays avec couverture
const CountryCard = memo(function CountryCard({
  coverage,
  isSelected,
  onToggleSelect,
  onCreateLawyer,
  isCreating,
}: {
  coverage: CountryCoverage;
  isSelected: boolean;
  onToggleSelect: (code: string) => void;
  onCreateLawyer: (country: CountryCoverage) => void;
  isCreating: boolean;
}) {
  const getCoverageStatus = () => {
    if (coverage.frenchLawyersCount === 0) return { color: "text-red-600 bg-red-50 border-red-200", icon: XCircle, label: "Non couvert" };
    if (coverage.frenchLawyersCount <= 2) return { color: "text-amber-600 bg-amber-50 border-amber-200", icon: AlertTriangle, label: `${coverage.frenchLawyersCount} avocat(s)` };
    return { color: "text-green-600 bg-green-50 border-green-200", icon: CheckCircle, label: `${coverage.frenchLawyersCount} avocats` };
  };

  const status = getCoverageStatus();
  const StatusIcon = status.icon;

  return (
    <div className={`bg-white rounded-xl border p-4 transition-all ${isSelected ? "border-red-500 ring-2 ring-red-200" : "border-gray-200 hover:border-gray-300"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Checkbox */}
          <button
            onClick={() => onToggleSelect(coverage.countryCode)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              isSelected ? "bg-red-600 border-red-600" : "border-gray-300 hover:border-gray-400"
            }`}
          >
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </button>

          {/* Flag + Name */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{coverage.flag}</span>
              <span className="font-medium text-gray-900">{coverage.countryName}</span>
            </div>
            <span className="text-xs text-gray-500">{coverage.countryCode}</span>
          </div>
        </div>

        {/* Status badge */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {status.label}
        </div>
      </div>

      {/* Liste des avocats existants */}
      {coverage.lawyers.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500 mb-2">Avocats francophones :</div>
          <div className="space-y-1">
            {coverage.lawyers.slice(0, 3).map((lawyer) => (
              <div key={lawyer.id} className="text-sm text-gray-700 flex items-center gap-2">
                <Scale className="w-3 h-3 text-blue-500" />
                <span className="truncate">{lawyer.name || lawyer.email}</span>
              </div>
            ))}
            {coverage.lawyers.length > 3 && (
              <div className="text-xs text-gray-400">+{coverage.lawyers.length - 3} autres</div>
            )}
          </div>
        </div>
      )}

      {/* Bouton créer */}
      {coverage.frenchLawyersCount < 3 && (
        <button
          onClick={() => onCreateLawyer(coverage)}
          disabled={isCreating}
          className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {isCreating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Créer avocat FR
        </button>
      )}
    </div>
  );
});

// Modal de création d'avocat
const CreateLawyerModal = memo(function CreateLawyerModal({
  isOpen,
  country,
  onClose,
  onSubmit,
  isLoading,
}: {
  isOpen: boolean;
  country: CountryCoverage | null;
  onClose: () => void;
  onSubmit: (data: { email: string; name: string; phone?: string; languages: string[] }) => Promise<void>;
  isLoading: boolean;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [languages, setLanguages] = useState<string[]>(["fr"]);
  const [error, setError] = useState<string | null>(null);

  // Reset form when country changes
  useEffect(() => {
    if (country) {
      setEmail("");
      setName("");
      setPhone("");
      setLanguages(["fr"]);
      setError(null);
    }
  }, [country]);

  if (!isOpen || !country) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) {
      setError("Email et nom sont obligatoires");
      return;
    }
    setError(null);
    try {
      await onSubmit({ email: email.toLowerCase(), name, phone, languages });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création");
    }
  };

  const toggleLanguage = (lang: string) => {
    if (lang === "fr") return; // FR toujours obligatoire
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const availableLanguages = [
    { code: "fr", label: "Français", required: true },
    { code: "en", label: "Anglais" },
    { code: "es", label: "Espagnol" },
    { code: "de", label: "Allemand" },
    { code: "ar", label: "Arabe" },
    { code: "pt", label: "Portugais" },
    { code: "it", label: "Italien" },
    { code: "zh", label: "Chinois" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{country.flag}</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Créer avocat francophone</h2>
              <p className="text-sm text-gray-500">{country.countryName} ({country.countryCode})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="avocat@cabinet.com"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>
          </div>

          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du cabinet / avocat *
            </label>
            <div className="relative">
              <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Cabinet Maître Dupont"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>
          </div>

          {/* Téléphone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Téléphone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+33 1 42 00 00 00"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Langues */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Languages className="inline w-4 h-4 mr-1" />
              Langues parlées
            </label>
            <div className="flex flex-wrap gap-2">
              {availableLanguages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => toggleLanguage(lang.code)}
                  disabled={lang.required}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    languages.includes(lang.code)
                      ? lang.required
                        ? "bg-red-100 text-red-700 cursor-not-allowed"
                        : "bg-red-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {lang.label}
                  {lang.required && " *"}
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            <strong>Note :</strong> Le profil sera créé avec accès actif. L'avocat pourra se connecter avec cet email via Google SSO.
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Créer et activer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

// Modal création par lot
const BatchCreateModal = memo(function BatchCreateModal({
  isOpen,
  selectedCountries,
  onClose,
  onSubmit,
  isLoading,
}: {
  isOpen: boolean;
  selectedCountries: CountryCoverage[];
  onClose: () => void;
  onSubmit: (data: { baseEmail: string; baseName: string }) => Promise<void>;
  isLoading: boolean;
}) {
  const [baseEmail, setBaseEmail] = useState("");
  const [baseName, setBaseName] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseEmail || !baseName) {
      setError("Email de base et nom sont obligatoires");
      return;
    }
    setError(null);
    try {
      await onSubmit({ baseEmail, baseName });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Création par lot</h2>
            <p className="text-sm text-gray-500">{selectedCountries.length} pays sélectionnés</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Liste des pays */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
          <div className="flex flex-wrap gap-2">
            {selectedCountries.map((country) => (
              <span key={country.countryCode} className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-full text-sm border">
                <span>{country.flag}</span>
                <span>{country.countryCode}</span>
              </span>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email de base *
            </label>
            <input
              type="text"
              value={baseEmail}
              onChange={(e) => setBaseEmail(e.target.value)}
              placeholder="avocat-{pays}@cabinet.com"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Utilisez {"{pays}"} pour le code pays. Ex: avocat-{"{pays}"}@cabinet.com → avocat-fr@cabinet.com
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de base *
            </label>
            <input
              type="text"
              value={baseName}
              onChange={(e) => setBaseName(e.target.value)}
              placeholder="Cabinet SOS-Expat {pays}"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Utilisez {"{pays}"} pour le nom du pays. Ex: Cabinet SOS-Expat {"{pays}"}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Créer {selectedCountries.length} avocats
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

// Carte compte multi-prestataire (onglet 2)
const MultiProviderAccountCard = memo(function MultiProviderAccountCard({
  user,
  onToggleMultiProvider,
  isUpdating,
}: {
  user: UserAccount;
  onToggleMultiProvider: (userId: string, isMulti: boolean) => void;
  isUpdating: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{user.displayName || user.email}</h3>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>

        {user.isMultiProvider && (
          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium flex items-center gap-1">
            <UsersRound className="w-3 h-3" />
            Multi
          </span>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UsersRound className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-gray-700">Multi-prestataires</span>
        </div>
        <Switch
          checked={user.isMultiProvider || false}
          onCheckedChange={(checked) => onToggleMultiProvider(user.id, checked)}
          disabled={isUpdating}
        />
      </div>

      {user.linkedProviderIds && user.linkedProviderIds.length > 0 && (
        <div className="mt-3 text-xs text-gray-500">
          {user.linkedProviderIds.length} prestataire(s) lié(s)
        </div>
      )}
    </div>
  );
});

// =============================================================================
// PAGE PRINCIPALE
// =============================================================================

export default function MultiPrestataires() {
  const { t } = useLanguage({ mode: "admin" });
  const { user } = useAuth();

  // États
  const [activeTab, setActiveTab] = useState<TabType>("coverage");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // États pour la couverture
  const [searchTerm, setSearchTerm] = useState("");
  const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());

  // États pour les modals
  const [createModalCountry, setCreateModalCountry] = useState<CountryCoverage | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Charger les providers (avocats) en temps réel
  useEffect(() => {
    setLoading(true);

    const q = query(
      collection(db, "providers"),
      where("active", "==", true),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Provider[];
        setProviders(data);
        setLoading(false);
      },
      (err) => {
        console.error("Erreur chargement providers:", err);
        // Fallback sans le where pour éviter l'erreur d'index
        const fallbackQ = query(collection(db, "providers"), orderBy("createdAt", "desc"));
        onSnapshot(fallbackQ, (snap) => {
          const data = snap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }) as Provider)
            .filter((p) => p.active !== false);
          setProviders(data);
          setLoading(false);
        });
      }
    );

    return () => unsubscribe();
  }, []);

  // Charger les utilisateurs pour l'onglet comptes multi-prestataires
  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "==", "provider"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as UserAccount[];
        setUsers(data);
      },
      () => {
        // Fallback sans where
        const fallbackQ = query(collection(db, "users"), orderBy("createdAt", "desc"));
        onSnapshot(fallbackQ, (snap) => {
          const data = snap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }) as UserAccount)
            .filter((u) => u.role === "provider");
          setUsers(data);
        });
      }
    );

    return () => unsubscribe();
  }, []);

  // Calculer la couverture par pays
  const countryCoverage = useMemo(() => {
    const coverage: CountryCoverage[] = ACTIVE_COUNTRIES.map((country) => {
      // Trouver les avocats francophones pour ce pays
      const frenchLawyers = providers.filter((p) => {
        const isLawyer = p.type === "lawyer";
        const isInCountry = p.country?.toUpperCase() === country.countryCode;
        const speaksFrench = p.languages?.some((l) => l.toLowerCase() === "fr" || l.toLowerCase() === "français");
        return isLawyer && isInCountry && speaksFrench;
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
  }, [providers]);

  // Filtrer la couverture
  const filteredCoverage = useMemo(() => {
    return countryCoverage.filter((c) => {
      // Recherche
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (
          !c.countryName.toLowerCase().includes(search) &&
          !c.countryCode.toLowerCase().includes(search)
        ) {
          return false;
        }
      }

      // Filtre couverture
      if (coverageFilter === "uncovered" && c.frenchLawyersCount > 0) return false;
      if (coverageFilter === "low" && (c.frenchLawyersCount === 0 || c.frenchLawyersCount > 2)) return false;
      if (coverageFilter === "covered" && c.frenchLawyersCount < 3) return false;

      // Filtre région
      if (regionFilter !== "all" && c.region !== regionFilter) return false;

      return true;
    });
  }, [countryCoverage, searchTerm, coverageFilter, regionFilter]);

  // Stats globales
  const stats = useMemo(() => {
    const uncovered = countryCoverage.filter((c) => c.frenchLawyersCount === 0).length;
    const lowCoverage = countryCoverage.filter((c) => c.frenchLawyersCount > 0 && c.frenchLawyersCount <= 2).length;
    const covered = countryCoverage.filter((c) => c.frenchLawyersCount >= 3).length;
    const totalFrenchLawyers = providers.filter(
      (p) => p.type === "lawyer" && p.languages?.some((l) => l.toLowerCase() === "fr" || l.toLowerCase() === "français")
    ).length;

    return {
      totalCountries: ACTIVE_COUNTRIES.length,
      uncovered,
      lowCoverage,
      covered,
      totalFrenchLawyers,
      multiProviderAccounts: users.filter((u) => u.isMultiProvider).length,
    };
  }, [countryCoverage, providers, users]);

  // Régions uniques
  const regions = useMemo(() => {
    const regionSet = new Set(ACTIVE_COUNTRIES.map((c) => c.region));
    return Array.from(regionSet).sort();
  }, []);

  // Handlers
  const toggleSelectCountry = useCallback((code: string) => {
    setSelectedCountries((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }, []);

  const selectAllUncovered = useCallback(() => {
    const uncoveredCodes = filteredCoverage
      .filter((c) => c.frenchLawyersCount === 0)
      .map((c) => c.countryCode);
    setSelectedCountries(new Set(uncoveredCodes));
  }, [filteredCoverage]);

  const clearSelection = useCallback(() => {
    setSelectedCountries(new Set());
  }, []);

  // Créer un avocat
  const handleCreateLawyer = async (
    country: CountryCoverage,
    data: { email: string; name: string; phone?: string; languages: string[] }
  ) => {
    setIsCreating(true);
    try {
      const providerId = `manual_${Date.now()}`;

      await setDoc(doc(db, "providers", providerId), {
        email: data.email.toLowerCase(),
        name: data.name,
        type: "lawyer",
        country: country.countryCode,
        languages: data.languages,
        phone: data.phone || null,
        active: true,
        manual: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await logAuditEntry({
        action: "provider.create",
        targetType: "provider",
        targetId: providerId,
        details: {
          email: data.email.toLowerCase(),
          name: data.name,
          type: "lawyer",
          country: country.countryCode,
          languages: data.languages,
          manual: true,
          adminEmail: user?.email || "unknown",
          source: "multi-prestataires-coverage",
        },
        severity: "info",
      });

      showSuccess(`Avocat créé pour ${country.countryName}`);
    } catch (err) {
      console.error("Erreur création avocat:", err);
      showError("Erreur lors de la création");
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  // Créer par lot
  const handleBatchCreate = async (data: { baseEmail: string; baseName: string }) => {
    setIsCreating(true);
    try {
      const selectedCoverages = countryCoverage.filter((c) => selectedCountries.has(c.countryCode));

      for (const country of selectedCoverages) {
        const providerId = `manual_${Date.now()}_${country.countryCode}`;
        const email = data.baseEmail.replace(/{pays}/gi, country.countryCode.toLowerCase());
        const name = data.baseName.replace(/{pays}/gi, country.countryName);

        await setDoc(doc(db, "providers", providerId), {
          email: email.toLowerCase(),
          name: name,
          type: "lawyer",
          country: country.countryCode,
          languages: ["fr"],
          active: true,
          manual: true,
          batch: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await logAuditEntry({
          action: "provider.create",
          targetType: "provider",
          targetId: providerId,
          details: {
            email: email.toLowerCase(),
            name: name,
            type: "lawyer",
            country: country.countryCode,
            languages: ["fr"],
            manual: true,
            batch: true,
            adminEmail: user?.email || "unknown",
            source: "multi-prestataires-batch",
          },
          severity: "info",
        });

        // Petit délai pour éviter les collisions d'ID
        await new Promise((r) => setTimeout(r, 50));
      }

      showSuccess(`${selectedCoverages.length} avocats créés`);
      setSelectedCountries(new Set());
    } catch (err) {
      console.error("Erreur création par lot:", err);
      showError("Erreur lors de la création par lot");
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  // Toggle multi-provider pour un utilisateur
  const handleToggleMultiProvider = async (userId: string, isMulti: boolean) => {
    setUpdatingUserId(userId);
    try {
      await updateDoc(doc(db, "users", userId), {
        isMultiProvider: isMulti,
        updatedAt: serverTimestamp(),
      });
      showSuccess(isMulti ? "Mode multi-prestataires activé" : "Mode multi-prestataires désactivé");
    } catch (err) {
      console.error("Erreur toggle multi-provider:", err);
      showError("Erreur lors de la mise à jour");
    } finally {
      setUpdatingUserId(null);
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-600">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <UsersRound className="w-7 h-7 text-amber-600" />
          Multi-Prestataires
        </h1>
        <p className="text-gray-600 mt-1">
          Gérez la couverture des pays par avocats francophones et les comptes multi-prestataires
        </p>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Pays total"
          value={stats.totalCountries}
          icon={Globe}
          color="bg-gray-100 text-gray-700"
        />
        <StatCard
          label="Non couverts"
          value={stats.uncovered}
          icon={XCircle}
          color="bg-red-100 text-red-700"
          subtext="Priorité haute"
        />
        <StatCard
          label="Faible couverture"
          value={stats.lowCoverage}
          icon={AlertTriangle}
          color="bg-amber-100 text-amber-700"
          subtext="1-2 avocats"
        />
        <StatCard
          label="Bien couverts"
          value={stats.covered}
          icon={CheckCircle}
          color="bg-green-100 text-green-700"
          subtext="3+ avocats"
        />
        <StatCard
          label="Avocats FR"
          value={stats.totalFrenchLawyers}
          icon={Scale}
          color="bg-blue-100 text-blue-700"
        />
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab("coverage")}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "coverage"
                ? "border-red-600 text-red-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <MapPin className="w-4 h-4 inline mr-2" />
            Couverture Pays
          </button>
          <button
            onClick={() => setActiveTab("accounts")}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "accounts"
                ? "border-red-600 text-red-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <UsersRound className="w-4 h-4 inline mr-2" />
            Comptes Multi-prestataires
            {stats.multiProviderAccounts > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                {stats.multiProviderAccounts}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Contenu onglet Couverture */}
      {activeTab === "coverage" && (
        <div className="space-y-4">
          {/* Filtres */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Recherche */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un pays..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Filtre couverture */}
              <select
                value={coverageFilter}
                onChange={(e) => setCoverageFilter(e.target.value as CoverageFilter)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">Tous les pays</option>
                <option value="uncovered">Non couverts (0)</option>
                <option value="low">Faible couverture (1-2)</option>
                <option value="covered">Bien couverts (3+)</option>
              </select>

              {/* Filtre région */}
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">Toutes les régions</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions sélection */}
            {selectedCountries.size > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {selectedCountries.size} pays sélectionné(s)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={clearSelection}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Désélectionner
                  </button>
                  <button
                    onClick={() => setShowBatchModal(true)}
                    className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Créer par lot
                  </button>
                </div>
              </div>
            )}

            {selectedCountries.size === 0 && filteredCoverage.some((c) => c.frenchLawyersCount === 0) && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={selectAllUncovered}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Sélectionner tous les pays non couverts
                </button>
              </div>
            )}
          </div>

          {/* Grille des pays */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCoverage.map((coverage) => (
              <CountryCard
                key={coverage.countryCode}
                coverage={coverage}
                isSelected={selectedCountries.has(coverage.countryCode)}
                onToggleSelect={toggleSelectCountry}
                onCreateLawyer={(c) => setCreateModalCountry(c)}
                isCreating={isCreating}
              />
            ))}
          </div>

          {filteredCoverage.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun pays trouvé</h3>
              <p className="text-gray-500">Modifiez vos filtres pour voir plus de pays</p>
            </div>
          )}
        </div>
      )}

      {/* Contenu onglet Comptes */}
      {activeTab === "accounts" && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">Comptes multi-prestataires</h4>
                <p className="text-sm text-amber-700 mt-1">
                  Un compte multi-prestataires permet à un utilisateur de gérer plusieurs profils d'avocats depuis un seul compte.
                  Activez cette option pour les gestionnaires de cabinets ou réseaux d'avocats.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {users.map((u) => (
              <MultiProviderAccountCard
                key={u.id}
                user={u}
                onToggleMultiProvider={handleToggleMultiProvider}
                isUpdating={updatingUserId === u.id}
              />
            ))}
          </div>

          {users.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun compte prestataire</h3>
              <p className="text-gray-500">Les comptes prestataires apparaîtront ici</p>
            </div>
          )}
        </div>
      )}

      {/* Modal création individuelle */}
      <CreateLawyerModal
        isOpen={!!createModalCountry}
        country={createModalCountry}
        onClose={() => setCreateModalCountry(null)}
        onSubmit={(data) => handleCreateLawyer(createModalCountry!, data)}
        isLoading={isCreating}
      />

      {/* Modal création par lot */}
      <BatchCreateModal
        isOpen={showBatchModal}
        selectedCountries={countryCoverage.filter((c) => selectedCountries.has(c.countryCode))}
        onClose={() => setShowBatchModal(false)}
        onSubmit={handleBatchCreate}
        isLoading={isCreating}
      />
    </div>
  );
}
