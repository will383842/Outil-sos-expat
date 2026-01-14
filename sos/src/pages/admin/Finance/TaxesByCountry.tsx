// src/pages/admin/Finance/TaxesByCountry.tsx
// Country-specific tax detail view with drill-down capability

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import AdminLayout from '../../../components/admin/AdminLayout';
import { countriesData, getCountryByCode } from '../../../data/countries';
import {
  ArrowLeft,
  Receipt,
  Download,
  Calendar,
  TrendingUp,
  Users,
  CreditCard,
  Building2,
  ChevronRight,
  FileText,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface PaymentData {
  id: string;
  amount: number;
  createdAt: Date;
  status: string;
  clientId: string;
  providerId?: string;
}

interface CountryStats {
  code: string;
  name: string;
  flag: string;
  totalRevenue: number;
  vatCollected: number;
  transactionCount: number;
  uniqueClients: number;
  avgTransactionValue: number;
  monthlyBreakdown: { month: string; revenue: number; vat: number }[];
  topPayments: PaymentData[];
}

// Default VAT rates
const DEFAULT_VAT_RATES: Record<string, number> = {
  FR: 20, DE: 19, GB: 20, ES: 21, IT: 22, NL: 21, BE: 21, AT: 20, PT: 23,
  PL: 23, SE: 25, DK: 25, FI: 24, IE: 23, GR: 24, CZ: 21, RO: 19, HU: 27,
  CH: 8.1, NO: 25,
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function TaxesByCountry() {
  const intl = useIntl();
  const navigate = useNavigate();
  const { countryCode } = useParams<{ countryCode?: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countryStats, setCountryStats] = useState<CountryStats | null>(null);
  const [allCountries, setAllCountries] = useState<CountryStats[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // OPTIMISATION: Limiter les lectures Firestore pour réduire les coûts
      // Avant: chargeait 100% des documents (dizaines de milliers de lectures)
      // Après: limite à 500 documents par collection (~1K lectures max)
      const [paymentsSnapshot, usersSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'payments'), orderBy('createdAt', 'desc'), limit(500))),
        getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(500))),
      ]);

      // Build user country map
      const userCountryMap = new Map<string, string>();
      usersSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const country = (data.country || data.currentCountry || 'Unknown') as string;
        userCountryMap.set(docSnap.id, country);
      });

      // Aggregate payments by country
      const countryAggregates = new Map<string, {
        revenue: number;
        vat: number;
        count: number;
        clients: Set<string>;
        monthly: Map<string, { revenue: number; vat: number }>;
        payments: PaymentData[];
      }>();

      paymentsSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const status = data.status as string | undefined;

        // Only count successful payments
        if (status !== 'captured' && status !== 'succeeded' && status !== 'authorized') return;

        const clientId = data.clientId as string;
        const rawCountry = userCountryMap.get(clientId) || 'Unknown';

        // Normalize country code
        let code = 'XX';
        if (rawCountry.length === 2) {
          const found = getCountryByCode(rawCountry.toUpperCase());
          if (found) code = found.code;
        } else {
          const match = countriesData.find(c =>
            !c.disabled && (
              c.nameFr.toLowerCase() === rawCountry.toLowerCase() ||
              c.nameEn.toLowerCase() === rawCountry.toLowerCase()
            )
          );
          if (match) code = match.code;
        }

        const createdAt = data.createdAt?.toDate?.() ?? new Date();
        const paymentYear = createdAt.getFullYear();

        // Filter by selected year
        if (paymentYear !== selectedYear) return;

        const amount = (data.amountInEuros as number | undefined) ??
          ((data.amount as number | undefined) !== undefined ? (data.amount as number) / 100 : 0);

        const vatRate = DEFAULT_VAT_RATES[code] ?? 0;
        const vatAmount = amount * (vatRate / (100 + vatRate));

        const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;

        const existing = countryAggregates.get(code) || {
          revenue: 0,
          vat: 0,
          count: 0,
          clients: new Set<string>(),
          monthly: new Map<string, { revenue: number; vat: number }>(),
          payments: [],
        };

        existing.revenue += amount;
        existing.vat += vatAmount;
        existing.count += 1;
        existing.clients.add(clientId);

        const monthData = existing.monthly.get(monthKey) || { revenue: 0, vat: 0 };
        monthData.revenue += amount;
        monthData.vat += vatAmount;
        existing.monthly.set(monthKey, monthData);

        existing.payments.push({
          id: docSnap.id,
          amount,
          createdAt,
          status: status || 'unknown',
          clientId,
          providerId: data.providerId as string | undefined,
        });

        countryAggregates.set(code, existing);
      });

      // Build stats
      const stats: CountryStats[] = [];
      countryAggregates.forEach((agg, code) => {
        const countryData = getCountryByCode(code);
        const monthlyBreakdown: { month: string; revenue: number; vat: number }[] = [];

        // Sort payments by amount descending
        agg.payments.sort((a, b) => b.amount - a.amount);

        // Convert monthly map to sorted array
        Array.from(agg.monthly.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .forEach(([month, data]) => {
            monthlyBreakdown.push({ month, ...data });
          });

        stats.push({
          code,
          name: countryData?.nameFr || code,
          flag: countryData?.flag || '',
          totalRevenue: agg.revenue,
          vatCollected: agg.vat,
          transactionCount: agg.count,
          uniqueClients: agg.clients.size,
          avgTransactionValue: agg.count > 0 ? agg.revenue / agg.count : 0,
          monthlyBreakdown,
          topPayments: agg.payments.slice(0, 10),
        });
      });

      // Sort by VAT collected
      stats.sort((a, b) => b.vatCollected - a.vatCollected);
      setAllCountries(stats);

      // If a specific country is requested
      if (countryCode) {
        const found = stats.find(s => s.code === countryCode.toUpperCase());
        setCountryStats(found || null);
      }

    } catch (err) {
      console.error('Error loading tax data:', err);
      setError(intl.formatMessage({ id: 'admin.finance.taxes.errorLoading' }));
    } finally {
      setIsLoading(false);
    }
  }, [intl, countryCode, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
  // COUNTRY DETAIL VIEW
  // ============================================================================

  if (countryCode && countryStats) {
    return (
      <AdminLayout>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <Link
            to="/admin/finance/taxes"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {intl.formatMessage({ id: 'admin.finance.taxes.tab.countries' })}
          </Link>

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <span className="text-4xl mr-4">{countryStats.flag}</span>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{countryStats.name}</h1>
                <p className="text-gray-600">
                  {intl.formatMessage({ id: 'admin.finance.taxes.vatRate' })}: {DEFAULT_VAT_RATES[countryStats.code] ?? 0}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                {[2024, 2025, 2026].map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                <Download className="w-4 h-4" />
                {intl.formatMessage({ id: 'admin.finance.taxes.export' })}
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {intl.formatMessage({ id: 'admin.finance.taxes.totalRevenue' })}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(countryStats.totalRevenue)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {intl.formatMessage({ id: 'admin.finance.taxes.vatCollected' })}
                  </p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">
                    {formatCurrency(countryStats.vatCollected)}
                  </p>
                </div>
                <Receipt className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {intl.formatMessage({ id: 'admin.finance.taxes.transactions' })}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {countryStats.transactionCount}
                  </p>
                </div>
                <CreditCard className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Clients uniques</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {countryStats.uniqueClients}
                  </p>
                </div>
                <Users className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Monthly Breakdown */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                {intl.formatMessage({ id: 'admin.finance.taxes.monthlySummary' })}
              </h2>
            </div>
            <div className="p-6">
              {countryStats.monthlyBreakdown.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  {intl.formatMessage({ id: 'admin.finance.taxes.noData' })}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mois</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          {intl.formatMessage({ id: 'admin.finance.taxes.totalRevenue' })}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          {intl.formatMessage({ id: 'admin.finance.taxes.vatCollected' })}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {countryStats.monthlyBreakdown.map((row) => (
                        <tr key={row.month} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {row.month}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                            {formatCurrency(row.revenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-purple-600 font-medium">
                            {formatCurrency(row.vat)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">Total</td>
                        <td className="px-6 py-4 text-sm text-right font-bold text-gray-900">
                          {formatCurrency(countryStats.totalRevenue)}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-bold text-purple-600">
                          {formatCurrency(countryStats.vatCollected)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Top Payments */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-green-600" />
                Top 10 Transactions
              </h2>
            </div>
            <div className="p-6">
              {countryStats.topPayments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  {intl.formatMessage({ id: 'admin.finance.taxes.noData' })}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {countryStats.topPayments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                            {payment.id.substring(0, 12)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(payment.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              payment.status === 'captured' || payment.status === 'succeeded'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {payment.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ============================================================================
  // COUNTRY LIST VIEW
  // ============================================================================

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Building2 className="w-8 h-8 mr-3 text-red-600" />
              {intl.formatMessage({ id: 'admin.finance.taxes.vatByCountry' })}
            </h1>
            <p className="text-gray-600 mt-2">
              {intl.formatMessage({ id: 'admin.finance.taxes.subtitle' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              {[2024, 2025, 2026].map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <Link
              to="/admin/finance/taxes"
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {intl.formatMessage({ id: 'admin.finance.taxes.tab.overview' })}
            </Link>
          </div>
        </div>

        {/* Country Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allCountries.map((country) => (
            <Link
              key={country.code}
              to={`/admin/finance/taxes/country/${country.code}`}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-red-200 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-3xl mr-3">{country.flag}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{country.name}</h3>
                    <p className="text-xs text-gray-500">
                      {intl.formatMessage({ id: 'admin.finance.taxes.vatRate' })}: {DEFAULT_VAT_RATES[country.code] ?? 0}%
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">{intl.formatMessage({ id: 'admin.finance.taxes.totalRevenue' })}</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(country.totalRevenue)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{intl.formatMessage({ id: 'admin.finance.taxes.vatCollected' })}</p>
                  <p className="text-lg font-bold text-purple-600">{formatCurrency(country.vatCollected)}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm text-gray-500">
                <span>{country.transactionCount} transactions</span>
                <span>{country.uniqueClients} clients</span>
              </div>
            </Link>
          ))}
        </div>

        {allCountries.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">{intl.formatMessage({ id: 'admin.finance.taxes.noData' })}</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
