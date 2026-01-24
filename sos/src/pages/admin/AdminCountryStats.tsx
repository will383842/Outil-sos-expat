import React, { useState, useEffect, useCallback, useRef } from "react";
import { useIntl } from "react-intl";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  Globe,
  Phone,
  DollarSign,
  Users,
  BarChart3,
  TrendingUp,
  Scale,
  Download,
} from "lucide-react";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import { countriesData, getCountryByCode } from "../../data/countries";

// Interface pour les statistiques par pays
interface CountryStats {
  calls: {
    total: number;
    successful: number;
  };
  payments: {
    totalRevenue: number;
    platformRevenue: number;
    providerRevenue: number;
  };
  registrations: {
    clients: number;
    lawyers: number;
    expats: number;
  };
}

// Interface pour les statistiques globales
interface Stats {
  // Global stats
  totalCalls: number;
  successfulCalls: number;
  totalRevenue: number;
  platformRevenue: number;
  providerRevenue: number;
  totalClients: number;
  totalLawyers: number;
  totalExpats: number;
  
  // Country-level stats
  countryStats: Record<string, CountryStats>;
}

const AdminCountryStats: React.FC = () => {
  const intl = useIntl();
  const mountedRef = useRef<boolean>(true);
  const [stats, setStats] = useState<Stats>({
    totalCalls: 0,
    successfulCalls: 0,
    totalRevenue: 0,
    platformRevenue: 0,
    providerRevenue: 0,
    totalClients: 0,
    totalLawyers: 0,
    totalExpats: 0,
    countryStats: {},
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'revenue' | 'calls' | 'registrations'>('revenue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Helper function to normalize country names
  // Maps country codes to full names and handles various formats
  // ENHANCED: Multi-strategy matching to minimize "Unknown" entries
  const normalizeCountryName = useCallback((countryInput: string): string => {
    // Return special marker for truly unknown/empty values
    // This will be displayed as a separate category in the stats
    if (!countryInput || countryInput.trim() === '' || countryInput.toLowerCase() === 'unknown') {
      return 'Non renseigné';
    }

    const normalized = countryInput.trim();
    const normalizedLower = normalized.toLowerCase();

    // STRATEGY 1: Extended abbreviation/alias mapping
    const abbreviationMap: Record<string, string> = {
      // Common abbreviations
      'd': 'DE', // Germany
      'uk': 'GB', // United Kingdom
      'usa': 'US', // United States
      'uae': 'AE', // United Arab Emirates
      'holland': 'NL', // Netherlands
      'hollande': 'NL',
      'pays-bas': 'NL',
      'england': 'GB',
      'angleterre': 'GB',
      'great britain': 'GB',
      'grande-bretagne': 'GB',
      'scotland': 'GB',
      'ecosse': 'GB',
      'wales': 'GB',
      'pays de galles': 'GB',
      'northern ireland': 'GB',
      'irlande du nord': 'GB',
      'america': 'US',
      'amérique': 'US',
      'états-unis': 'US',
      'etats-unis': 'US',
      'united states of america': 'US',
      'emirats arabes unis': 'AE',
      'emirates': 'AE',
      'dubai': 'AE',
      'dubaï': 'AE',
      'abu dhabi': 'AE',
      'abou dabi': 'AE',
      // French territories
      'guyane': 'GF',
      'martinique': 'MQ',
      'guadeloupe': 'GP',
      'réunion': 'RE',
      'reunion': 'RE',
      'la réunion': 'RE',
      'la reunion': 'RE',
      'mayotte': 'YT',
      'nouvelle-calédonie': 'NC',
      'nouvelle caledonie': 'NC',
      'polynésie': 'PF',
      'polynesie': 'PF',
      'tahiti': 'PF',
      'saint-martin': 'MF',
      'st martin': 'MF',
      'saint-barthélemy': 'BL',
      'st barth': 'BL',
      'wallis': 'WF',
      'futuna': 'WF',
      // Common typos/variations
      'allemange': 'DE',
      'allemeagne': 'DE',
      'espange': 'ES',
      'italie ': 'IT',
      'belgique ': 'BE',
      'suisse': 'CH',
      'swiss': 'CH',
      'switzerland': 'CH',
      'schweiz': 'CH',
      'svizzera': 'CH',
      'svizra': 'CH',
      'autriche': 'AT',
      'osterreich': 'AT',
      'österreich': 'AT',
      'south africa': 'ZA',
      'afrique du sud': 'ZA',
      'ivory coast': 'CI',
      "cote d'ivoire": 'CI',
      'czech': 'CZ',
      'czechia': 'CZ',
      'tchéquie': 'CZ',
      'tcheque': 'CZ',
      'rdc': 'CD',
      'drc': 'CD',
      'congo kinshasa': 'CD',
      'congo-kinshasa': 'CD',
      'congo brazzaville': 'CG',
      'congo-brazzaville': 'CG',
      'south korea': 'KR',
      'corée du sud': 'KR',
      'coree du sud': 'KR',
      'north korea': 'KP',
      'corée du nord': 'KP',
      'coree du nord': 'KP',
      'taiwan': 'TW',
      'taïwan': 'TW',
      'republic of china': 'TW',
      'hong-kong': 'HK',
      'hongkong': 'HK',
      'singapour': 'SG',
      'singapore': 'SG',
      'maroc': 'MA',
      'morocco': 'MA',
      'tunisie': 'TN',
      'tunisia': 'TN',
      'algérie': 'DZ',
      'algerie': 'DZ',
      'algeria': 'DZ',
      'egypte': 'EG',
      'egypt': 'EG',
      'sénégal': 'SN',
      'senegal': 'SN',
      'cameroun': 'CM',
      'cameroon': 'CM',
      'gabon': 'GA',
      'togo': 'TG',
      'bénin': 'BJ',
      'benin': 'BJ',
      'mali': 'ML',
      'niger': 'NE',
      'burkina': 'BF',
      'madagascar': 'MG',
      'maurice': 'MU',
      'mauritius': 'MU',
      'ile maurice': 'MU',
      'île maurice': 'MU',
      'canada': 'CA',
      'quebec': 'CA',
      'québec': 'CA',
      'montreal': 'CA',
      'montréal': 'CA',
      'toronto': 'CA',
      'vancouver': 'CA',
      'australie': 'AU',
      'australia': 'AU',
      'new zealand': 'NZ',
      'nouvelle-zélande': 'NZ',
      'nouvelle zelande': 'NZ',
      'japon': 'JP',
      'japan': 'JP',
      'chine': 'CN',
      'china': 'CN',
      'inde': 'IN',
      'india': 'IN',
      'brésil': 'BR',
      'bresil': 'BR',
      'brazil': 'BR',
      'mexique': 'MX',
      'mexico': 'MX',
      'argentine': 'AR',
      'argentina': 'AR',
      'chili': 'CL',
      'chile': 'CL',
      'colombie': 'CO',
      'colombia': 'CO',
      'pérou': 'PE',
      'perou': 'PE',
      'peru': 'PE',
      'venezuela': 'VE',
      'équateur': 'EC',
      'equateur': 'EC',
      'ecuador': 'EC',
      'russie': 'RU',
      'russia': 'RU',
      'ukraine': 'UA',
      'pologne': 'PL',
      'poland': 'PL',
      'roumanie': 'RO',
      'romania': 'RO',
      'grèce': 'GR',
      'grece': 'GR',
      'greece': 'GR',
      'turquie': 'TR',
      'turkey': 'TR',
      'türkiye': 'TR',
      'turkiye': 'TR',
      'israel': 'IL',
      'israël': 'IL',
      'liban': 'LB',
      'lebanon': 'LB',
      'arabie saoudite': 'SA',
      'saudi arabia': 'SA',
      'saudi': 'SA',
      'qatar': 'QA',
      'oman': 'OM',
      'bahreïn': 'BH',
      'bahrein': 'BH',
      'bahrain': 'BH',
      'koweït': 'KW',
      'koweit': 'KW',
      'kuwait': 'KW',
      'jordanie': 'JO',
      'jordan': 'JO',
      'irak': 'IQ',
      'iraq': 'IQ',
      'iran': 'IR',
      'syrie': 'SY',
      'syria': 'SY',
      'yémen': 'YE',
      'yemen': 'YE',
      'afghanistan': 'AF',
      'pakistan': 'PK',
      'bangladesh': 'BD',
      'sri lanka': 'LK',
      'thaïlande': 'TH',
      'thailande': 'TH',
      'thailand': 'TH',
      'vietnam': 'VN',
      'viêt nam': 'VN',
      'viet nam': 'VN',
      'cambodge': 'KH',
      'cambodia': 'KH',
      'malaisie': 'MY',
      'malaysia': 'MY',
      'indonésie': 'ID',
      'indonesie': 'ID',
      'indonesia': 'ID',
      'philippines': 'PH',
      'birmanie': 'MM',
      'myanmar': 'MM',
      'burma': 'MM',
    };

    // Check if it's a known abbreviation/alias
    if (abbreviationMap[normalizedLower]) {
      const country = getCountryByCode(abbreviationMap[normalizedLower]);
      if (country) {
        return country.nameFr;
      }
    }

    // STRATEGY 2: ISO code matching (2-letter codes)
    if (normalized.length === 2) {
      const country = getCountryByCode(normalized.toUpperCase());
      if (country) {
        return country.nameFr;
      }
    }

    // STRATEGY 3: Phone code matching (e.g., "+33" → France)
    if (normalized.startsWith('+')) {
      const phoneMatch = countriesData.find(c =>
        !c.disabled && c.phoneCode === normalized
      );
      if (phoneMatch) {
        return phoneMatch.nameFr;
      }
      // Try without leading +
      const phoneWithoutPlus = normalized.substring(1);
      const phoneMatch2 = countriesData.find(c =>
        !c.disabled && c.phoneCode === `+${phoneWithoutPlus}`
      );
      if (phoneMatch2) {
        return phoneMatch2.nameFr;
      }
    }

    // STRATEGY 4: Exact name matching (all languages)
    const exactMatch = countriesData.find(c =>
      !c.disabled && (
        c.nameFr.toLowerCase() === normalizedLower ||
        c.nameEn.toLowerCase() === normalizedLower ||
        c.nameEs.toLowerCase() === normalizedLower ||
        c.nameDe.toLowerCase() === normalizedLower ||
        c.namePt.toLowerCase() === normalizedLower ||
        c.nameZh === normalized ||
        c.nameAr === normalized ||
        c.nameRu.toLowerCase() === normalizedLower ||
        c.nameIt.toLowerCase() === normalizedLower ||
        c.nameNl.toLowerCase() === normalizedLower ||
        c.code.toLowerCase() === normalizedLower
      )
    );

    if (exactMatch) {
      return exactMatch.nameFr;
    }

    // STRATEGY 5: Partial matching with word boundaries
    const partialMatch = countriesData.find(c =>
      !c.disabled && (
        c.nameFr.toLowerCase().includes(normalizedLower) ||
        c.nameEn.toLowerCase().includes(normalizedLower) ||
        normalizedLower.includes(c.nameFr.toLowerCase()) ||
        normalizedLower.includes(c.nameEn.toLowerCase())
      )
    );

    if (partialMatch) {
      return partialMatch.nameFr;
    }

    // STRATEGY 6: Word-based matching (first significant word)
    const words = normalizedLower.split(/[\s\-_,]+/).filter(w => w.length > 2);
    for (const word of words) {
      const wordMatch = countriesData.find(c =>
        !c.disabled && (
          c.nameFr.toLowerCase().split(/[\s\-]+/).some(w => w === word) ||
          c.nameEn.toLowerCase().split(/[\s\-]+/).some(w => w === word)
        )
      );
      if (wordMatch) {
        return wordMatch.nameFr;
      }
    }

    // STRATEGY 7: Fuzzy matching - first 4+ chars
    if (normalized.length >= 4) {
      const prefix = normalizedLower.substring(0, 4);
      const fuzzyMatch = countriesData.find(c =>
        !c.disabled && (
          c.nameFr.toLowerCase().startsWith(prefix) ||
          c.nameEn.toLowerCase().startsWith(prefix)
        )
      );
      if (fuzzyMatch) {
        return fuzzyMatch.nameFr;
      }
    }

    // FALLBACK: Return input with proper capitalization + flag indicating it's unmatched
    // This allows admins to see what values need to be added to the mapping
    console.warn(`[CountryStats] Unmatched country: "${countryInput}"`);
    return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  }, []);

  const loadStats = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // OPTIMISATION: Limiter les lectures Firestore pour réduire les coûts
      // Avant: chargeait 100% des documents (100K+ lectures)
      // Après: limite à 500 documents par collection (~2K lectures max)
      const [callsSnapshot, paymentsSnapshot, usersSnapshot, sosProfilesSnapshot] = await Promise.all([
        getDocs(query(collection(db, "calls"), orderBy("createdAt", "desc"), limit(500))),
        getDocs(query(collection(db, "payments"), orderBy("createdAt", "desc"), limit(500))),
        getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"), limit(500))),
        getDocs(query(collection(db, "sos_profiles"), limit(500)))
      ]);

      if (!mountedRef.current) return;

      // Initialize country stats map
      const countryStatsMap: Record<string, CountryStats> = {};

      // OPTIMISATION P1: Construire un Map des pays utilisateurs UNE SEULE FOIS
      // Avant: O(n*m) - find() appelé pour chaque call/payment
      // Après: O(n+m) - Map lookup O(1) pour chaque call/payment
      const userCountryMap = new Map<string, string>();

      // Helper to extract best country from user data
      const extractCountryFromUserData = (userData: Record<string, unknown>): string | null => {
        // Priority order for country fields
        const countryFields = [
          'country',
          'currentCountry',
          'currentPresenceCountry',
          'residenceCountry',
          'interventionCountry'
        ];

        for (const field of countryFields) {
          const value = userData[field] as string | undefined;
          if (value && value.trim() !== '' && value.toLowerCase() !== 'unknown') {
            return value;
          }
        }

        // Try practiceCountries or interventionCountries arrays
        const arrayFields = ['practiceCountries', 'interventionCountries', 'operatingCountries'];
        for (const field of arrayFields) {
          const arr = userData[field] as string[] | undefined;
          if (Array.isArray(arr) && arr.length > 0 && arr[0] && arr[0].trim() !== '') {
            return arr[0];
          }
        }

        return null; // No country found
      };

      // First pass: Build map from sos_profiles (providers have better country data)
      sosProfilesSnapshot.docs.forEach(doc => {
        const userData = doc.data() as Record<string, unknown>;
        const rawCountry = extractCountryFromUserData(userData);
        if (rawCountry) {
          userCountryMap.set(doc.id, normalizeCountryName(rawCountry));
        }
      });

      // Second pass: Add/update from users collection
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data() as Record<string, unknown>;
        const rawCountry = extractCountryFromUserData(userData);
        // Only update if we found a valid country
        if (rawCountry) {
          userCountryMap.set(doc.id, normalizeCountryName(rawCountry));
        }
      });

      // Helper to get country from user (with normalization)
      // Utilise le Map pré-construit pour O(1) lookup
      const getUserCountry = (userId: string): string => {
        return userCountryMap.get(userId) || 'Non renseigné';
      };

      // Helper to initialize country stats if not exists
      const initCountryStats = (country: string) => {
        if (!countryStatsMap[country]) {
          countryStatsMap[country] = {
            calls: { total: 0, successful: 0 },
            payments: { totalRevenue: 0, platformRevenue: 0, providerRevenue: 0 },
            registrations: { clients: 0, lawyers: 0, expats: 0 }
          };
        }
      };

      // Process calls
      let totalCalls = 0;
      let successfulCalls = 0;
      
      callsSnapshot.forEach((docSnapshot) => {
        totalCalls++;
        const data = docSnapshot.data() as Record<string, unknown>;
        const isSuccess = (data.status as string) === "success";
        if (isSuccess) successfulCalls++;
        
        // Get country from client or provider
        const clientId = data.clientId as string;
        const providerId = data.providerId as string;
        const clientCountry = getUserCountry(clientId);
        const providerCountry = getUserCountry(providerId);

        // Use client country as primary, fallback to provider
        const country = clientCountry !== 'Non renseigné' ? clientCountry : providerCountry;
        
        initCountryStats(country);
        countryStatsMap[country].calls.total++;
        if (isSuccess) {
          countryStatsMap[country].calls.successful++;
        }
      });

      // Process payments
      let totalRevenue = 0;
      let platformRevenue = 0;
      let providerRevenue = 0;

      paymentsSnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data() as Record<string, unknown>;
        const clientId = data.clientId as string;
        const providerId = data.providerId as string;
        const status = data.status as string | undefined;

        // Only count FINAL successful payments (exclude authorized, canceled, failed, refunded)
        // NOTE: 'authorized' is excluded to prevent double-counting when same payment
        // transitions from 'authorized' → 'captured'
        const shouldCount = status === 'captured' || status === 'succeeded';

        if (!shouldCount) return; // Skip non-final payment states

        // Use Euros fields if available, otherwise convert cents to euros (divide by 100)
        const amount = (data.amountInEuros as number | undefined) !== undefined
          ? (data.amountInEuros as number)
          : ((data.amount as number | undefined) !== undefined ? (data.amount as number) / 100 : undefined);

        const platformFee = (data.commissionAmountEuros as number | undefined) !== undefined
          ? (data.commissionAmountEuros as number)
          : (data.platformFee as number | undefined) !== undefined
          ? (data.platformFee as number)
          : (data.connectionFeeAmount as number | undefined) !== undefined
          ? (data.connectionFeeAmount as number)
          : ((data.commissionAmount as number | undefined) !== undefined ? (data.commissionAmount as number) / 100 : undefined);

        const providerAmount = (data.providerAmountEuros as number | undefined) !== undefined
          ? (data.providerAmountEuros as number)
          : ((data.providerAmount as number | undefined) !== undefined ? (data.providerAmount as number) / 100 : undefined);

        // Only count payments that have a valid total amount
        // This ensures: Total Revenue = Commission SOS + Provider Income
        if (typeof amount !== "number" || amount <= 0) return;

        // Determine platform fee and provider amount
        // Priority: Use provided breakdown, or calculate from amount
        let finalPlatformFee: number;
        let finalProviderAmount: number;

        if (typeof platformFee === "number" && typeof providerAmount === "number") {
          // Both provided - use them, but validate they sum to amount
          const sum = platformFee + providerAmount;
          if (Math.abs(amount - sum) > 0.01) {
            // Mismatch: use amount as source of truth and calculate breakdown proportionally
            const ratio = amount / sum;
            finalPlatformFee = platformFee * ratio;
            finalProviderAmount = providerAmount * ratio;
          } else {
            finalPlatformFee = platformFee;
            finalProviderAmount = providerAmount;
          }
        } else if (typeof platformFee === "number") {
          // Only platform fee provided - calculate provider amount
          finalPlatformFee = platformFee;
          finalProviderAmount = amount - platformFee;
        } else if (typeof providerAmount === "number") {
          // Only provider amount provided - calculate platform fee
          finalPlatformFee = amount - providerAmount;
          finalProviderAmount = providerAmount;
        } else {
          // Neither provided - can't calculate breakdown, skip this payment
          return;
        }

        // Ensure non-negative values
        if (finalPlatformFee < 0 || finalProviderAmount < 0) {
          return; // Skip invalid breakdowns
        }

        // Accumulate totals (only for payments with valid amount and breakdown)
        totalRevenue += amount;
        platformRevenue += finalPlatformFee;
        providerRevenue += finalProviderAmount;

        // FIX: Get country with multi-source fallback
        // Priority: 1) clientCountry from payment, 2) client's country, 3) provider's country
        let country = 'Non renseigné';

        // Check if payment has clientCountry stored directly
        const paymentClientCountry = data.clientCountry as string | undefined;
        if (paymentClientCountry && paymentClientCountry.trim() !== '' && paymentClientCountry.toLowerCase() !== 'unknown') {
          country = normalizeCountryName(paymentClientCountry);
        } else {
          // Try client's country from user data
          const clientCountry = getUserCountry(clientId);
          if (clientCountry !== 'Non renseigné') {
            country = clientCountry;
          } else if (providerId) {
            // Fallback to provider's country (service was rendered in provider's location)
            const providerCountry = getUserCountry(providerId);
            if (providerCountry !== 'Non renseigné') {
              country = providerCountry;
            }
          }
        }

        initCountryStats(country);

        // Accumulate country-specific totals
        countryStatsMap[country].payments.totalRevenue += amount;
        countryStatsMap[country].payments.platformRevenue += finalPlatformFee;
        countryStatsMap[country].payments.providerRevenue += finalProviderAmount;
      });

      // Process registrations
      let totalClients = 0;
      let totalLawyers = 0;
      let totalExpats = 0;

      usersSnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data() as Record<string, unknown>;
        const role = data.role as string | undefined;
        // Priority: country first, then currentCountry
        const rawCountry = (data.country || data.currentCountry || '') as string;
        const country = normalizeCountryName(rawCountry);
        
        initCountryStats(country);
        
        if (role === "client") {
          totalClients++;
          countryStatsMap[country].registrations.clients++;
        } else if (role === "lawyer") {
          totalLawyers++;
          countryStatsMap[country].registrations.lawyers++;
        } else if (role === "expat") {
          totalExpats++;
          countryStatsMap[country].registrations.expats++;
        }
      });

      if (!mountedRef.current) return;

      setStats({
        totalCalls,
        successfulCalls,
        totalRevenue,
        platformRevenue,
        providerRevenue,
        totalClients,
        totalLawyers,
        totalExpats,
        countryStats: countryStatsMap,
      });
    } catch (error) {
      if (!mountedRef.current) return;
      console.error("Error loading country stats:", error);
      setError(intl.formatMessage({ id: 'admin.countryStats.errorLoading' }));
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadStats();

    return () => {
      mountedRef.current = false;
    };
  }, [loadStats]);

  // Sort countries based on selected criteria
  const sortedCountries = Object.entries(stats.countryStats).sort((a, b) => {
    const [countryA, dataA] = a;
    const [countryB, dataB] = b;
    
    let valueA = 0;
    let valueB = 0;
    
    switch (sortBy) {
      case 'revenue':
        valueA = dataA.payments.totalRevenue;
        valueB = dataB.payments.totalRevenue;
        break;
      case 'calls':
        valueA = dataA.calls.total;
        valueB = dataB.calls.total;
        break;
      case 'registrations':
        valueA = dataA.registrations.clients + dataA.registrations.lawyers + dataA.registrations.expats;
        valueB = dataB.registrations.clients + dataB.registrations.lawyers + dataB.registrations.expats;
        break;
    }
    
    return sortOrder === 'desc' ? valueB - valueA : valueA - valueB;
  });

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      intl.formatMessage({ id: 'admin.countryStats.csv.country' }),
      intl.formatMessage({ id: 'admin.countryStats.csv.totalCalls' }),
      intl.formatMessage({ id: 'admin.countryStats.csv.successfulCalls' }),
      intl.formatMessage({ id: 'admin.countryStats.csv.totalRevenue' }),
      intl.formatMessage({ id: 'admin.countryStats.csv.sosCommission' }),
      intl.formatMessage({ id: 'admin.countryStats.csv.providerRevenue' }),
      intl.formatMessage({ id: 'admin.countryStats.csv.clients' }),
      intl.formatMessage({ id: 'admin.countryStats.csv.lawyers' }),
      intl.formatMessage({ id: 'admin.countryStats.csv.expats' })
    ];
    const rows = sortedCountries.map(([country, data]) => [
      country,
      data.calls.total,
      data.calls.successful,
      data.payments.totalRevenue.toFixed(2),
      data.payments.platformRevenue.toFixed(2),
      data.payments.providerRevenue.toFixed(2),
      data.registrations.clients,
      data.registrations.lawyers,
      data.registrations.expats,
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `country-stats-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <BarChart3 className="h-8 w-8 animate-spin text-red-600" />
            <p className="text-gray-600">{intl.formatMessage({ id: 'admin.countryStats.loading' })}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <ErrorBoundary>
      <AdminLayout>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Globe className="w-8 h-8 mr-3 text-red-600" />
                {intl.formatMessage({ id: 'admin.countryStats.title' })}
              </h1>
              <p className="text-gray-600 mt-2">
                {intl.formatMessage({ id: 'admin.countryStats.overview' })}
              </p>
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-5 h-5" />
              {intl.formatMessage({ id: 'admin.countryStats.exportCsv' })}
            </button>
          </div>

          {/* Global Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {intl.formatMessage({ id: 'admin.countryStats.totalCalls' })}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.totalCalls.toLocaleString()}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    {stats.successfulCalls.toLocaleString()} {intl.formatMessage({ id: 'admin.countryStats.successful' })}
                  </p>
                </div>
                <Phone className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {intl.formatMessage({ id: 'admin.countryStats.totalRevenue' })}
                  </p>
                  <p className="text-3xl font-bold text-purple-600">
                    {stats.totalRevenue.toLocaleString("fr-FR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} €
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {intl.formatMessage({ id: 'admin.countryStats.totalRegistrations' })}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {(stats.totalClients + stats.totalLawyers + stats.totalExpats).toLocaleString()}
                  </p>
                  <div className="flex gap-2 mt-1 text-xs">
                    <span className="text-blue-600">{stats.totalClients} {intl.formatMessage({ id: 'admin.countryStats.clients' })}</span>
                    <span className="text-purple-600">{stats.totalLawyers} {intl.formatMessage({ id: 'admin.countryStats.lawyers' })}</span>
                    <span className="text-green-600">{stats.totalExpats} {intl.formatMessage({ id: 'admin.countryStats.expats' })}</span>
                  </div>
                </div>
                <Users className="w-8 h-8 text-gray-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {intl.formatMessage({ id: 'admin.countryStats.activeCountries' })}
                  </p>
                  <p className="text-3xl font-bold text-orange-600">
                    {Object.keys(stats.countryStats).length}
                  </p>
                </div>
                <Globe className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Registration Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {intl.formatMessage({ id: 'admin.countryStats.registeredClients' })}
                  </p>
                  <p className="text-3xl font-bold text-blue-600">
                    {stats.totalClients.toLocaleString()}
                  </p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {intl.formatMessage({ id: 'admin.countryStats.registeredLawyers' })}
                  </p>
                  <p className="text-3xl font-bold text-purple-600">
                    {stats.totalLawyers.toLocaleString()}
                  </p>
                </div>
                <Scale className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {intl.formatMessage({ id: 'admin.countryStats.registeredExpats' })}
                  </p>
                  <p className="text-3xl font-bold text-green-600">
                    {stats.totalExpats.toLocaleString()}
                  </p>
                </div>
                <Users className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {intl.formatMessage({ id: 'admin.countryStats.sosCommission' })}
                  </p>
                  <p className="text-3xl font-bold text-red-600">
                    {stats.platformRevenue.toLocaleString("fr-FR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} €
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-red-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {intl.formatMessage({ id: 'admin.countryStats.providerRevenue' })}
                  </p>
                  <p className="text-3xl font-bold text-orange-600">
                    {stats.providerRevenue.toLocaleString("fr-FR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} €
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Country-Level Statistics Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                {intl.formatMessage({ id: 'admin.countryStats.countryDetails' })}
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.countryStats.sortBy' })}</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'revenue' | 'calls' | 'registrations')}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="revenue">{intl.formatMessage({ id: 'admin.countryStats.revenue' })}</option>
                    <option value="calls">{intl.formatMessage({ id: 'admin.countryStats.calls' })}</option>
                    <option value="registrations">{intl.formatMessage({ id: 'admin.countryStats.registrations' })}</option>
                  </select>
                </div>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {intl.formatMessage({ id: 'admin.countryStats.country' })}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {intl.formatMessage({ id: 'admin.countryStats.calls' })}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {intl.formatMessage({ id: 'admin.countryStats.totalRevenue' })}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {intl.formatMessage({ id: 'admin.countryStats.sosCommission' })}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {intl.formatMessage({ id: 'admin.countryStats.providerRevenue' })}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {intl.formatMessage({ id: 'admin.countryStats.registrations' })}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedCountries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        {intl.formatMessage({ id: 'admin.countryStats.noData' })}
                      </td>
                    </tr>
                  ) : (
                    sortedCountries.map(([country, countryData]) => (
                      <tr key={country} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {country}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            <span className="font-medium">{countryData.calls.total}</span>
                            <span className="text-gray-400"> / </span>
                            <span className="text-green-600">{countryData.calls.successful}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {countryData.payments.totalRevenue.toLocaleString("fr-FR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} €
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          {countryData.payments.platformRevenue.toLocaleString("fr-FR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} €
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">
                          {countryData.payments.providerRevenue.toLocaleString("fr-FR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} €
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex flex-col gap-1">
                            <span>
                              <span className="text-blue-600 font-medium">{countryData.registrations.clients}</span> {intl.formatMessage({ id: 'admin.countryStats.clients' })}
                            </span>
                            <span>
                              <span className="text-purple-600 font-medium">{countryData.registrations.lawyers}</span> {intl.formatMessage({ id: 'admin.countryStats.lawyers' })}
                            </span>
                            <span>
                              <span className="text-green-600 font-medium">{countryData.registrations.expats}</span> {intl.formatMessage({ id: 'admin.countryStats.expatsLong' })}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AdminLayout>
    </ErrorBoundary>
  );
};

export default AdminCountryStats;

