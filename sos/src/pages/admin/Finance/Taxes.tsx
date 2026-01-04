// src/pages/admin/Finance/Taxes.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import AdminLayout from '../../../components/admin/AdminLayout';
import Modal from '../../../components/common/Modal';
import ErrorBoundary from '../../../components/common/ErrorBoundary';
import { countriesData, getCountryByCode } from '../../../data/countries';
import {
  Receipt,
  Globe,
  Calendar,
  AlertTriangle,
  Download,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Building2,
  Calculator,
  TrendingUp,
  Clock,
  Filter,
  RefreshCw,
  Eye,
  Edit2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface TaxConfig {
  countryCode: string;
  standardRate: number; // Standard VAT rate in %
  reducedRate?: number; // Reduced rate if applicable
  isRegistered: boolean; // Whether we're VAT registered in this country
  registrationNumber?: string;
  registrationDate?: Date;
  threshold?: number; // VAT registration threshold
  notes?: string;
}

interface TaxDeclaration {
  id: string;
  countryCode: string;
  period: string; // e.g., "2024-Q1", "2024-01"
  dueDate: Date;
  submittedDate?: Date;
  status: 'pending' | 'submitted' | 'overdue';
  vatCollected: number;
  vatDeductible: number;
  netVat: number;
  submittedBy?: string;
}

interface CountryTaxData {
  countryCode: string;
  countryName: string;
  flag: string;
  totalRevenue: number;
  vatCollected: number;
  transactionCount: number;
  config: TaxConfig | null;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  declarations: TaxDeclaration[];
}

// ============================================================================
// DEFAULT EU VAT RATES (2024)
// ============================================================================

const DEFAULT_VAT_RATES: Record<string, { standard: number; reduced?: number }> = {
  AT: { standard: 20, reduced: 10 },
  BE: { standard: 21, reduced: 6 },
  BG: { standard: 20, reduced: 9 },
  HR: { standard: 25, reduced: 13 },
  CY: { standard: 19, reduced: 5 },
  CZ: { standard: 21, reduced: 15 },
  DK: { standard: 25 },
  EE: { standard: 22, reduced: 9 },
  FI: { standard: 24, reduced: 10 },
  FR: { standard: 20, reduced: 5.5 },
  DE: { standard: 19, reduced: 7 },
  GR: { standard: 24, reduced: 13 },
  HU: { standard: 27, reduced: 18 },
  IE: { standard: 23, reduced: 13.5 },
  IT: { standard: 22, reduced: 10 },
  LV: { standard: 21, reduced: 12 },
  LT: { standard: 21, reduced: 9 },
  LU: { standard: 17, reduced: 8 },
  MT: { standard: 18, reduced: 5 },
  NL: { standard: 21, reduced: 9 },
  PL: { standard: 23, reduced: 8 },
  PT: { standard: 23, reduced: 13 },
  RO: { standard: 19, reduced: 9 },
  SK: { standard: 20, reduced: 10 },
  SI: { standard: 22, reduced: 9.5 },
  ES: { standard: 21, reduced: 10 },
  SE: { standard: 25, reduced: 12 },
  GB: { standard: 20, reduced: 5 },
  CH: { standard: 8.1, reduced: 2.6 },
  NO: { standard: 25, reduced: 15 },
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function Taxes() {
  const intl = useIntl();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countryTaxData, setCountryTaxData] = useState<CountryTaxData[]>([]);
  const [taxConfigs, setTaxConfigs] = useState<Record<string, TaxConfig>>({});
  const [declarations, setDeclarations] = useState<TaxDeclaration[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'countries' | 'calendar' | 'reports'>('overview');

  // Filters
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Modals
  const [editingConfig, setEditingConfig] = useState<TaxConfig | null>(null);
  const [viewingDetails, setViewingDetails] = useState<CountryTaxData | null>(null);
  const [markingDeclaration, setMarkingDeclaration] = useState<TaxDeclaration | null>(null);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const normalizeCountryName = useCallback((countryInput: string): { code: string; name: string; flag: string } => {
    if (!countryInput || countryInput.trim() === '' || countryInput === 'Unknown') {
      return { code: 'XX', name: 'Unknown', flag: '' };
    }

    const normalized = countryInput.trim();
    const normalizedLower = normalized.toLowerCase();

    // Try to find by ISO code
    if (normalized.length === 2) {
      const country = getCountryByCode(normalized.toUpperCase());
      if (country) {
        return { code: country.code, name: country.nameFr, flag: country.flag };
      }
    }

    // Try to find by name
    const match = countriesData.find(c =>
      !c.disabled && (
        c.nameFr.toLowerCase() === normalizedLower ||
        c.nameEn.toLowerCase() === normalizedLower ||
        c.code.toLowerCase() === normalizedLower
      )
    );

    if (match) {
      return { code: match.code, name: match.nameFr, flag: match.flag };
    }

    return { code: 'XX', name: normalized, flag: '' };
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load payments and users in parallel
      const [paymentsSnapshot, usersSnapshot, taxConfigsSnapshot, declarationsSnapshot] = await Promise.all([
        getDocs(collection(db, 'payments')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'tax_configs')),
        getDocs(collection(db, 'tax_declarations')),
      ]);

      // Build user country map
      const userCountryMap = new Map<string, string>();
      usersSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const country = (data.country || data.currentCountry || 'Unknown') as string;
        userCountryMap.set(docSnap.id, country);
      });

      // Load tax configs
      const configs: Record<string, TaxConfig> = {};
      taxConfigsSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        configs[docSnap.id] = {
          countryCode: docSnap.id,
          standardRate: data.standardRate ?? DEFAULT_VAT_RATES[docSnap.id]?.standard ?? 0,
          reducedRate: data.reducedRate,
          isRegistered: data.isRegistered ?? false,
          registrationNumber: data.registrationNumber,
          registrationDate: data.registrationDate?.toDate?.(),
          threshold: data.threshold,
          notes: data.notes,
        };
      });
      setTaxConfigs(configs);

      // Load declarations
      const loadedDeclarations: TaxDeclaration[] = [];
      declarationsSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loadedDeclarations.push({
          id: docSnap.id,
          countryCode: data.countryCode,
          period: data.period,
          dueDate: data.dueDate?.toDate?.() ?? new Date(),
          submittedDate: data.submittedDate?.toDate?.(),
          status: data.status ?? 'pending',
          vatCollected: data.vatCollected ?? 0,
          vatDeductible: data.vatDeductible ?? 0,
          netVat: data.netVat ?? 0,
          submittedBy: data.submittedBy,
        });
      });
      setDeclarations(loadedDeclarations);

      // Aggregate payments by country
      const countryAggregates = new Map<string, { revenue: number; vat: number; count: number }>();

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      paymentsSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const status = data.status as string | undefined;

        // Only count successful payments
        if (status !== 'captured' && status !== 'succeeded' && status !== 'authorized') return;

        // Check if payment is in current period
        const createdAt = data.createdAt?.toDate?.() ?? new Date();
        if (selectedPeriod === 'month' && createdAt < startOfMonth) return;

        const clientId = data.clientId as string;
        const rawCountry = userCountryMap.get(clientId) || 'Unknown';
        const { code } = normalizeCountryName(rawCountry);

        const amount = (data.amountInEuros as number | undefined) ??
          ((data.amount as number | undefined) !== undefined ? (data.amount as number) / 100 : 0);

        // Calculate VAT (using country's rate or default)
        const vatRate = configs[code]?.standardRate ?? DEFAULT_VAT_RATES[code]?.standard ?? 0;
        const vatAmount = amount * (vatRate / (100 + vatRate)); // Extract VAT from gross amount

        const existing = countryAggregates.get(code) || { revenue: 0, vat: 0, count: 0 };
        countryAggregates.set(code, {
          revenue: existing.revenue + amount,
          vat: existing.vat + vatAmount,
          count: existing.count + 1,
        });
      });

      // Build country tax data
      const taxData: CountryTaxData[] = [];
      countryAggregates.forEach((agg, code) => {
        const { name, flag } = normalizeCountryName(code);
        taxData.push({
          countryCode: code,
          countryName: name,
          flag,
          totalRevenue: agg.revenue,
          vatCollected: agg.vat,
          transactionCount: agg.count,
          config: configs[code] || null,
        });
      });

      // Sort by VAT collected descending
      taxData.sort((a, b) => b.vatCollected - a.vatCollected);
      setCountryTaxData(taxData);

    } catch (err) {
      console.error('Error loading tax data:', err);
      setError(intl.formatMessage({ id: 'admin.finance.taxes.errorLoading' }));
    } finally {
      setIsLoading(false);
    }
  }, [intl, normalizeCountryName, selectedPeriod]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const totalVatCollected = useMemo(() =>
    countryTaxData.reduce((sum, c) => sum + c.vatCollected, 0),
    [countryTaxData]
  );

  const totalRevenue = useMemo(() =>
    countryTaxData.reduce((sum, c) => sum + c.totalRevenue, 0),
    [countryTaxData]
  );

  const registeredCountries = useMemo(() =>
    countryTaxData.filter(c => c.config?.isRegistered).length,
    [countryTaxData]
  );

  const pendingDeclarations = useMemo(() =>
    declarations.filter(d => d.status === 'pending' || d.status === 'overdue'),
    [declarations]
  );

  const overdueDeclarations = useMemo(() =>
    declarations.filter(d => d.status === 'overdue'),
    [declarations]
  );

  const nextDueDeclaration = useMemo(() => {
    const upcoming = declarations
      .filter(d => d.status === 'pending')
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    return upcoming[0];
  }, [declarations]);

  const filteredData = useMemo(() => {
    if (selectedCountry === 'all') return countryTaxData;
    return countryTaxData.filter(c => c.countryCode === selectedCountry);
  }, [countryTaxData, selectedCountry]);

  // Calendar data
  const calendarDays = useMemo((): CalendarDay[] => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: CalendarDay[] = [];

    // Add days from previous month
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({
        date,
        isCurrentMonth: false,
        declarations: declarations.filter(d =>
          d.dueDate.toDateString() === date.toDateString()
        ),
      });
    }

    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        isCurrentMonth: true,
        declarations: declarations.filter(d =>
          d.dueDate.toDateString() === date.toDateString()
        ),
      });
    }

    // Add days from next month
    const endPadding = 42 - days.length;
    for (let i = 1; i <= endPadding; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        declarations: declarations.filter(d =>
          d.dueDate.toDateString() === date.toDateString()
        ),
      });
    }

    return days;
  }, [calendarMonth, declarations]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSaveConfig = async (config: TaxConfig) => {
    try {
      const docRef = doc(db, 'tax_configs', config.countryCode);
      await setDoc(docRef, {
        ...config,
        registrationDate: config.registrationDate ? Timestamp.fromDate(config.registrationDate) : null,
        updatedAt: Timestamp.now(),
      }, { merge: true });

      setTaxConfigs(prev => ({
        ...prev,
        [config.countryCode]: config,
      }));
      setEditingConfig(null);
      loadData();
    } catch (err) {
      console.error('Error saving tax config:', err);
      alert(intl.formatMessage({ id: 'admin.finance.taxes.saveError' }));
    }
  };

  const handleMarkDeclarationSubmitted = async (declaration: TaxDeclaration) => {
    try {
      const docRef = doc(db, 'tax_declarations', declaration.id);
      await updateDoc(docRef, {
        status: 'submitted',
        submittedDate: Timestamp.now(),
        submittedBy: 'admin',
      });

      setDeclarations(prev => prev.map(d =>
        d.id === declaration.id
          ? { ...d, status: 'submitted' as const, submittedDate: new Date() }
          : d
      ));
      setMarkingDeclaration(null);
    } catch (err) {
      console.error('Error marking declaration:', err);
      alert(intl.formatMessage({ id: 'admin.finance.taxes.markError' }));
    }
  };

  const exportVatReport = (countryCode?: string) => {
    const dataToExport = countryCode
      ? countryTaxData.filter(c => c.countryCode === countryCode)
      : countryTaxData;

    const headers = [
      intl.formatMessage({ id: 'admin.finance.taxes.country' }),
      intl.formatMessage({ id: 'admin.finance.taxes.totalRevenue' }),
      intl.formatMessage({ id: 'admin.finance.taxes.vatCollected' }),
      intl.formatMessage({ id: 'admin.finance.taxes.vatRate' }),
      intl.formatMessage({ id: 'admin.finance.taxes.registrationStatus' }),
      intl.formatMessage({ id: 'admin.finance.taxes.transactions' }),
    ];

    const rows = dataToExport.map(c => [
      c.countryName,
      c.totalRevenue.toFixed(2),
      c.vatCollected.toFixed(2),
      c.config?.standardRate ?? DEFAULT_VAT_RATES[c.countryCode]?.standard ?? 0,
      c.config?.isRegistered ? 'Registered' : 'Not Registered',
      c.transactionCount,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vat-report-${countryCode || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateAnnualReport = () => {
    // Generate comprehensive annual report
    const report = {
      generatedAt: new Date().toISOString(),
      period: `${new Date().getFullYear()}`,
      summary: {
        totalRevenue: totalRevenue.toFixed(2),
        totalVatCollected: totalVatCollected.toFixed(2),
        countriesWithActivity: countryTaxData.length,
        registeredCountries,
      },
      byCountry: countryTaxData.map(c => ({
        country: c.countryName,
        code: c.countryCode,
        revenue: c.totalRevenue.toFixed(2),
        vatCollected: c.vatCollected.toFixed(2),
        vatRate: c.config?.standardRate ?? DEFAULT_VAT_RATES[c.countryCode]?.standard ?? 0,
        isRegistered: c.config?.isRegistered ?? false,
        registrationNumber: c.config?.registrationNumber || '',
        transactions: c.transactionCount,
      })),
      declarations: declarations.map(d => ({
        country: d.countryCode,
        period: d.period,
        status: d.status,
        dueDate: d.dueDate.toISOString(),
        vatCollected: d.vatCollected.toFixed(2),
        netVat: d.netVat.toFixed(2),
      })),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `annual-tax-report-${new Date().getFullYear()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const formatCurrency = (amount: number) =>
    intl.formatNumber(amount, { style: 'currency', currency: 'EUR' });

  const formatDate = (date: Date) =>
    intl.formatDate(date, { day: '2-digit', month: '2-digit', year: 'numeric' });

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <Receipt className="h-8 w-8 animate-spin text-red-600" />
            <p className="text-gray-600">{intl.formatMessage({ id: 'admin.finance.taxes.loading' })}</p>
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

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <ErrorBoundary>
      <AdminLayout>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Receipt className="w-8 h-8 mr-3 text-red-600" />
                {intl.formatMessage({ id: 'admin.finance.taxes.title' })}
              </h1>
              <p className="text-gray-600 mt-2">
                {intl.formatMessage({ id: 'admin.finance.taxes.subtitle' })}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <button
                onClick={() => loadData()}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
                {intl.formatMessage({ id: 'admin.finance.taxes.refresh' })}
              </button>
              <button
                onClick={() => exportVatReport()}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                {intl.formatMessage({ id: 'admin.finance.taxes.exportAll' })}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              {(['overview', 'countries', 'calendar', 'reports'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {intl.formatMessage({ id: `admin.finance.taxes.tab.${tab}` })}
                </button>
              ))}
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        {intl.formatMessage({ id: 'admin.finance.taxes.totalVatCollected' })}
                      </p>
                      <p className="text-3xl font-bold text-purple-600 mt-1">
                        {formatCurrency(totalVatCollected)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {intl.formatMessage({ id: 'admin.finance.taxes.thisMonth' })}
                      </p>
                    </div>
                    <Calculator className="w-8 h-8 text-purple-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        {intl.formatMessage({ id: 'admin.finance.taxes.countriesWithVat' })}
                      </p>
                      <p className="text-3xl font-bold text-blue-600 mt-1">
                        {countryTaxData.length}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {registeredCountries} {intl.formatMessage({ id: 'admin.finance.taxes.registered' })}
                      </p>
                    </div>
                    <Globe className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        {intl.formatMessage({ id: 'admin.finance.taxes.nextDeclaration' })}
                      </p>
                      {nextDueDeclaration ? (
                        <>
                          <p className="text-2xl font-bold text-orange-600 mt-1">
                            {formatDate(nextDueDeclaration.dueDate)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {nextDueDeclaration.countryCode} - {nextDueDeclaration.period}
                          </p>
                        </>
                      ) : (
                        <p className="text-lg text-gray-400 mt-1">
                          {intl.formatMessage({ id: 'admin.finance.taxes.noUpcoming' })}
                        </p>
                      )}
                    </div>
                    <Calendar className="w-8 h-8 text-orange-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        {intl.formatMessage({ id: 'admin.finance.taxes.outstandingDeclarations' })}
                      </p>
                      <p className={`text-3xl font-bold mt-1 ${overdueDeclarations.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {pendingDeclarations.length}
                      </p>
                      {overdueDeclarations.length > 0 && (
                        <p className="text-xs text-red-500 mt-1 flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {overdueDeclarations.length} {intl.formatMessage({ id: 'admin.finance.taxes.overdue' })}
                        </p>
                      )}
                    </div>
                    <FileText className="w-8 h-8 text-gray-600" />
                  </div>
                </div>
              </div>

              {/* VAT by Country */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                    {intl.formatMessage({ id: 'admin.finance.taxes.vatByCountry' })}
                  </h2>
                </div>
                <div className="p-6">
                  {countryTaxData.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      {intl.formatMessage({ id: 'admin.finance.taxes.noData' })}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {countryTaxData.slice(0, 10).map((country) => {
                        const percentage = totalVatCollected > 0
                          ? (country.vatCollected / totalVatCollected) * 100
                          : 0;
                        return (
                          <div key={country.countryCode} className="flex items-center">
                            <div className="w-32 flex items-center">
                              <span className="text-2xl mr-2">{country.flag}</span>
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {country.countryName}
                              </span>
                            </div>
                            <div className="flex-1 mx-4">
                              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                            <div className="w-32 text-right">
                              <span className="text-sm font-semibold text-gray-900">
                                {formatCurrency(country.vatCollected)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Countries Tab */}
          {activeTab === 'countries' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.finance.taxes.filters' })}:</span>
                  </div>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">{intl.formatMessage({ id: 'admin.finance.taxes.allCountries' })}</option>
                    {countryTaxData.map((c) => (
                      <option key={c.countryCode} value={c.countryCode}>
                        {c.flag} {c.countryName}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value as 'month' | 'quarter' | 'year')}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="month">{intl.formatMessage({ id: 'admin.finance.taxes.thisMonth' })}</option>
                    <option value="quarter">{intl.formatMessage({ id: 'admin.finance.taxes.thisQuarter' })}</option>
                    <option value="year">{intl.formatMessage({ id: 'admin.finance.taxes.thisYear' })}</option>
                  </select>
                </div>
              </div>

              {/* Country Tax Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {intl.formatMessage({ id: 'admin.finance.taxes.country' })}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {intl.formatMessage({ id: 'admin.finance.taxes.standardRate' })}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {intl.formatMessage({ id: 'admin.finance.taxes.reducedRate' })}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {intl.formatMessage({ id: 'admin.finance.taxes.totalRevenue' })}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {intl.formatMessage({ id: 'admin.finance.taxes.vatCollected' })}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {intl.formatMessage({ id: 'admin.finance.taxes.status' })}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {intl.formatMessage({ id: 'admin.finance.taxes.actions' })}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredData.map((country) => {
                        const rate = country.config?.standardRate ?? DEFAULT_VAT_RATES[country.countryCode]?.standard ?? 0;
                        const reducedRate = country.config?.reducedRate ?? DEFAULT_VAT_RATES[country.countryCode]?.reduced;
                        return (
                          <tr key={country.countryCode} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className="text-2xl mr-3">{country.flag}</span>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {country.countryName}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {country.countryCode}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {rate}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {reducedRate ? `${reducedRate}%` : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(country.totalRevenue)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                              {formatCurrency(country.vatCollected)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {country.config?.isRegistered ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  {intl.formatMessage({ id: 'admin.finance.taxes.registered' })}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  {intl.formatMessage({ id: 'admin.finance.taxes.notRegistered' })}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setViewingDetails(country)}
                                  className="text-blue-600 hover:text-blue-800 p-1"
                                  title={intl.formatMessage({ id: 'admin.finance.taxes.viewDetails' })}
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingConfig({
                                    countryCode: country.countryCode,
                                    standardRate: rate,
                                    reducedRate,
                                    isRegistered: country.config?.isRegistered ?? false,
                                    registrationNumber: country.config?.registrationNumber,
                                    registrationDate: country.config?.registrationDate,
                                    threshold: country.config?.threshold,
                                    notes: country.config?.notes,
                                  })}
                                  className="text-gray-600 hover:text-gray-800 p-1"
                                  title={intl.formatMessage({ id: 'admin.finance.taxes.updateRate' })}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => exportVatReport(country.countryCode)}
                                  className="text-green-600 hover:text-green-800 p-1"
                                  title={intl.formatMessage({ id: 'admin.finance.taxes.export' })}
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Calendar Tab */}
          {activeTab === 'calendar' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                    {intl.formatMessage({ id: 'admin.finance.taxes.taxCalendar' })}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                      className="p-2 hover:bg-gray-100 rounded"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-medium min-w-[140px] text-center">
                      {intl.formatDate(calendarMonth, { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                      onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                      className="p-2 hover:bg-gray-100 rounded"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  {/* Days of week header */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, index) => {
                      const isToday = day.date.toDateString() === new Date().toDateString();
                      const hasDeclarations = day.declarations.length > 0;
                      const hasOverdue = day.declarations.some(d => d.status === 'overdue');

                      return (
                        <div
                          key={index}
                          className={`min-h-[80px] p-2 border rounded ${
                            day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                          } ${isToday ? 'ring-2 ring-red-500' : ''}`}
                        >
                          <div className={`text-sm ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                            {day.date.getDate()}
                          </div>
                          {hasDeclarations && (
                            <div className="mt-1 space-y-1">
                              {day.declarations.map((decl) => (
                                <button
                                  key={decl.id}
                                  onClick={() => setMarkingDeclaration(decl)}
                                  className={`w-full text-left text-xs px-1 py-0.5 rounded truncate ${
                                    decl.status === 'overdue'
                                      ? 'bg-red-100 text-red-800'
                                      : decl.status === 'submitted'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-orange-100 text-orange-800'
                                  }`}
                                >
                                  {decl.countryCode}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Legend */}
                <div className="px-6 py-3 border-t border-gray-200 flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-orange-100 rounded" />
                    <span>{intl.formatMessage({ id: 'admin.finance.taxes.pending' })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-100 rounded" />
                    <span>{intl.formatMessage({ id: 'admin.finance.taxes.overdue' })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-100 rounded" />
                    <span>{intl.formatMessage({ id: 'admin.finance.taxes.submitted' })}</span>
                  </div>
                </div>
              </div>

              {/* Upcoming Declarations */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-orange-600" />
                    {intl.formatMessage({ id: 'admin.finance.taxes.upcomingDeadlines' })}
                  </h3>
                </div>
                <div className="p-4">
                  {pendingDeclarations.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      {intl.formatMessage({ id: 'admin.finance.taxes.noUpcomingDeadlines' })}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {pendingDeclarations.slice(0, 5).map((decl) => (
                        <div
                          key={decl.id}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            decl.status === 'overdue' ? 'bg-red-50' : 'bg-orange-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {decl.status === 'overdue' ? (
                              <AlertTriangle className="w-5 h-5 text-red-600" />
                            ) : (
                              <Clock className="w-5 h-5 text-orange-600" />
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {decl.countryCode} - {decl.period}
                              </p>
                              <p className="text-xs text-gray-500">
                                {intl.formatMessage({ id: 'admin.finance.taxes.dueDate' })}: {formatDate(decl.dueDate)}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setMarkingDeclaration(decl)}
                            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
                          >
                            {intl.formatMessage({ id: 'admin.finance.taxes.markSubmitted' })}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Monthly Summary */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <FileText className="w-8 h-8 text-blue-600 mr-3" />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {intl.formatMessage({ id: 'admin.finance.taxes.monthlySummary' })}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {intl.formatMessage({ id: 'admin.finance.taxes.monthlySummaryDesc' })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => exportVatReport()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4" />
                    {intl.formatMessage({ id: 'admin.finance.taxes.downloadCsv' })}
                  </button>
                </div>

                {/* Annual Report */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <Building2 className="w-8 h-8 text-purple-600 mr-3" />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {intl.formatMessage({ id: 'admin.finance.taxes.annualReport' })}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {intl.formatMessage({ id: 'admin.finance.taxes.annualReportDesc' })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={generateAnnualReport}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    <Download className="w-4 h-4" />
                    {intl.formatMessage({ id: 'admin.finance.taxes.generateReport' })}
                  </button>
                </div>

                {/* Accountant Export */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <Calculator className="w-8 h-8 text-green-600 mr-3" />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {intl.formatMessage({ id: 'admin.finance.taxes.accountantExport' })}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {intl.formatMessage({ id: 'admin.finance.taxes.accountantExportDesc' })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={generateAnnualReport}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Download className="w-4 h-4" />
                    {intl.formatMessage({ id: 'admin.finance.taxes.exportForAccountant' })}
                  </button>
                </div>
              </div>

              {/* B2B Reverse Charge Info */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start mb-4">
                  <Settings className="w-6 h-6 text-gray-600 mr-3 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {intl.formatMessage({ id: 'admin.finance.taxes.reverseCharge' })}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {intl.formatMessage({ id: 'admin.finance.taxes.reverseChargeDesc' })}
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    {intl.formatMessage({ id: 'admin.finance.taxes.reverseChargeInfo' })}
                  </p>
                  <ul className="mt-2 text-sm text-gray-600 list-disc list-inside space-y-1">
                    <li>{intl.formatMessage({ id: 'admin.finance.taxes.reverseChargeBullet1' })}</li>
                    <li>{intl.formatMessage({ id: 'admin.finance.taxes.reverseChargeBullet2' })}</li>
                    <li>{intl.formatMessage({ id: 'admin.finance.taxes.reverseChargeBullet3' })}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Edit Config Modal */}
        {editingConfig && (
          <Modal
            isOpen={true}
            onClose={() => setEditingConfig(null)}
            title={intl.formatMessage({ id: 'admin.finance.taxes.editTaxConfig' })}
            size="medium"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveConfig(editingConfig);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {intl.formatMessage({ id: 'admin.finance.taxes.country' })}
                </label>
                <input
                  type="text"
                  value={editingConfig.countryCode}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {intl.formatMessage({ id: 'admin.finance.taxes.standardRate' })} (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingConfig.standardRate}
                    onChange={(e) => setEditingConfig({ ...editingConfig, standardRate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {intl.formatMessage({ id: 'admin.finance.taxes.reducedRate' })} (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingConfig.reducedRate || ''}
                    onChange={(e) => setEditingConfig({ ...editingConfig, reducedRate: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder={intl.formatMessage({ id: 'admin.finance.taxes.optional' })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRegistered"
                  checked={editingConfig.isRegistered}
                  onChange={(e) => setEditingConfig({ ...editingConfig, isRegistered: e.target.checked })}
                  className="h-4 w-4 text-red-600 border-gray-300 rounded"
                />
                <label htmlFor="isRegistered" className="text-sm text-gray-700">
                  {intl.formatMessage({ id: 'admin.finance.taxes.vatRegistered' })}
                </label>
              </div>
              {editingConfig.isRegistered && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {intl.formatMessage({ id: 'admin.finance.taxes.registrationNumber' })}
                    </label>
                    <input
                      type="text"
                      value={editingConfig.registrationNumber || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, registrationNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., FR12345678901"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {intl.formatMessage({ id: 'admin.finance.taxes.threshold' })}
                    </label>
                    <input
                      type="number"
                      value={editingConfig.threshold || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, threshold: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder={intl.formatMessage({ id: 'admin.finance.taxes.optional' })}
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {intl.formatMessage({ id: 'admin.finance.taxes.notes' })}
                </label>
                <textarea
                  value={editingConfig.notes || ''}
                  onChange={(e) => setEditingConfig({ ...editingConfig, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder={intl.formatMessage({ id: 'admin.finance.taxes.notesPlaceholder' })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingConfig(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  {intl.formatMessage({ id: 'admin.finance.taxes.cancel' })}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  {intl.formatMessage({ id: 'admin.finance.taxes.save' })}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* View Details Modal */}
        {viewingDetails && (
          <Modal
            isOpen={true}
            onClose={() => setViewingDetails(null)}
            title={`${viewingDetails.flag} ${viewingDetails.countryName}`}
            size="medium"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'admin.finance.taxes.totalRevenue' })}</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(viewingDetails.totalRevenue)}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'admin.finance.taxes.vatCollected' })}</p>
                  <p className="text-xl font-bold text-purple-600">{formatCurrency(viewingDetails.vatCollected)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'admin.finance.taxes.transactions' })}</p>
                  <p className="text-xl font-bold text-gray-900">{viewingDetails.transactionCount}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'admin.finance.taxes.vatRate' })}</p>
                  <p className="text-xl font-bold text-gray-900">
                    {viewingDetails.config?.standardRate ?? DEFAULT_VAT_RATES[viewingDetails.countryCode]?.standard ?? 0}%
                  </p>
                </div>
              </div>
              {viewingDetails.config?.isRegistered && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">
                      {intl.formatMessage({ id: 'admin.finance.taxes.vatRegistered' })}
                    </span>
                  </div>
                  {viewingDetails.config.registrationNumber && (
                    <p className="text-sm text-gray-600">
                      {intl.formatMessage({ id: 'admin.finance.taxes.registrationNumber' })}: {viewingDetails.config.registrationNumber}
                    </p>
                  )}
                </div>
              )}
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => exportVatReport(viewingDetails.countryCode)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <Download className="w-4 h-4" />
                  {intl.formatMessage({ id: 'admin.finance.taxes.exportCountry' })}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Mark Declaration Modal */}
        {markingDeclaration && (
          <Modal
            isOpen={true}
            onClose={() => setMarkingDeclaration(null)}
            title={intl.formatMessage({ id: 'admin.finance.taxes.markAsSubmitted' })}
            size="small"
          >
            <div className="space-y-4">
              <p className="text-gray-600">
                {intl.formatMessage({ id: 'admin.finance.taxes.confirmSubmission' })}
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'admin.finance.taxes.declaration' })}</p>
                <p className="font-medium">{markingDeclaration.countryCode} - {markingDeclaration.period}</p>
                <p className="text-sm text-gray-500 mt-2">{intl.formatMessage({ id: 'admin.finance.taxes.dueDate' })}</p>
                <p className="font-medium">{formatDate(markingDeclaration.dueDate)}</p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setMarkingDeclaration(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  {intl.formatMessage({ id: 'admin.finance.taxes.cancel' })}
                </button>
                <button
                  onClick={() => handleMarkDeclarationSubmitted(markingDeclaration)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {intl.formatMessage({ id: 'admin.finance.taxes.markSubmitted' })}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AdminLayout>
    </ErrorBoundary>
  );
}
