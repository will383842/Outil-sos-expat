// src/pages/admin/Finance/ProfitLoss.tsx
// Profit & Loss Statement (Compte de resultat) - Income and Expenses
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import AdminLayout from '../../../components/admin/AdminLayout';
import {
  ChevronDown,
  ChevronRight,
  Download,
  Calendar,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Percent,
  FileText,
  Printer,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { CHART_OF_ACCOUNTS, Account } from '../../../data/chartOfAccounts';
import { toCsv, toExcel, downloadBlob } from '../../../services/finance/reports';

// =============================================================================
// TYPES
// =============================================================================

interface AccountBalance {
  account: Account;
  amount: number;
  previousAmount?: number;
  percentChange?: number;
  children?: AccountBalance[];
}

interface ProfitLossData {
  revenue: {
    items: AccountBalance[];
    total: number;
    previousTotal?: number;
  };
  costOfSales: {
    items: AccountBalance[];
    total: number;
    previousTotal?: number;
  };
  grossProfit: number;
  previousGrossProfit?: number;
  grossMargin: number;
  operatingExpenses: {
    items: AccountBalance[];
    total: number;
    previousTotal?: number;
  };
  operatingIncome: number;
  previousOperatingIncome?: number;
  operatingMargin: number;
  otherIncome: {
    items: AccountBalance[];
    total: number;
  };
  otherExpenses: {
    items: AccountBalance[];
    total: number;
  };
  netIncome: number;
  previousNetIncome?: number;
  netMargin: number;
}

interface DateRange {
  label: string;
  startDate: Date;
  endDate: Date;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const getPeriodPresets = (intl: ReturnType<typeof useIntl>): { label: string; getValue: () => DateRange }[] => [
  {
    label: 'thisMonth',
    getValue: () => {
      const now = new Date();
      return {
        label: intl.formatMessage({ id: 'admin.accounting.datePresets.thisMonth', defaultMessage: 'This month' }),
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: now,
      };
    },
  },
  {
    label: 'lastMonth',
    getValue: () => {
      const now = new Date();
      return {
        label: intl.formatMessage({ id: 'admin.accounting.datePresets.lastMonth', defaultMessage: 'Last month' }),
        startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        endDate: new Date(now.getFullYear(), now.getMonth(), 0),
      };
    },
  },
  {
    label: 'thisQuarter',
    getValue: () => {
      const now = new Date();
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      return {
        label: intl.formatMessage({ id: 'admin.accounting.datePresets.thisQuarter', defaultMessage: 'This quarter' }),
        startDate: quarterStart,
        endDate: now,
      };
    },
  },
  {
    label: 'thisYear',
    getValue: () => {
      const now = new Date();
      return {
        label: intl.formatMessage({ id: 'admin.accounting.datePresets.thisYear', defaultMessage: 'This year' }),
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: now,
      };
    },
  },
  {
    label: 'lastYear',
    getValue: () => {
      const now = new Date();
      return {
        label: intl.formatMessage({ id: 'admin.accounting.datePresets.lastYear', defaultMessage: 'Last year' }),
        startDate: new Date(now.getFullYear() - 1, 0, 1),
        endDate: new Date(now.getFullYear() - 1, 11, 31),
      };
    },
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const formatCurrency = (amount: number, currency = 'EUR'): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatPercent = (value: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatPeriod = (startDate: Date, endDate: Date): string => {
  const startStr = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(startDate);
  const endStr = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(endDate);
  if (startStr === endStr) return startStr;
  return `${startStr} - ${endStr}`;
};

// =============================================================================
// COMPONENTS
// =============================================================================

interface LineItemProps {
  balance: AccountBalance;
  level: number;
  expanded: Set<string>;
  onToggle: (code: string) => void;
  showComparison: boolean;
}

const LineItem: React.FC<LineItemProps> = ({ balance, level, expanded, onToggle, showComparison }) => {
  const hasChildren = balance.children && balance.children.length > 0;
  const isExpanded = expanded.has(balance.account.code);
  const indent = level * 24;
  const isPositiveChange = (balance.percentChange || 0) >= 0;

  return (
    <>
      <tr
        className={`hover:bg-gray-50 ${level === 0 ? 'font-medium' : ''} ${
          hasChildren ? 'cursor-pointer' : ''
        }`}
        onClick={() => hasChildren && onToggle(balance.account.code)}
      >
        <td className="px-4 py-2 whitespace-nowrap">
          <div className="flex items-center" style={{ paddingLeft: `${indent}px` }}>
            {hasChildren && (
              <span className="mr-2 text-gray-400">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
            )}
            <span className="text-gray-500 text-sm mr-2">{balance.account.code}</span>
            <span className={level === 0 ? 'text-gray-900' : 'text-gray-700'}>
              {balance.account.nameFr}
            </span>
          </div>
        </td>
        <td className="px-4 py-2 text-right whitespace-nowrap font-mono">
          {formatCurrency(balance.amount)}
        </td>
        {showComparison && (
          <>
            <td className="px-4 py-2 text-right whitespace-nowrap font-mono text-gray-500">
              {balance.previousAmount !== undefined ? formatCurrency(balance.previousAmount) : '-'}
            </td>
            <td className="px-4 py-2 text-right whitespace-nowrap">
              {balance.percentChange !== undefined && (
                <span className={`flex items-center justify-end gap-1 ${isPositiveChange ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositiveChange ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {formatPercent(Math.abs(balance.percentChange))}
                </span>
              )}
            </td>
          </>
        )}
      </tr>
      {hasChildren && isExpanded && balance.children?.map((child) => (
        <LineItem
          key={child.account.code}
          balance={child}
          level={level + 1}
          expanded={expanded}
          onToggle={onToggle}
          showComparison={showComparison}
        />
      ))}
    </>
  );
};

interface SectionProps {
  title: string;
  items: AccountBalance[];
  total: number;
  previousTotal?: number;
  expanded: Set<string>;
  onToggle: (code: string) => void;
  showComparison: boolean;
  isIncome?: boolean;
}

const Section: React.FC<SectionProps> = ({
  title,
  items,
  total,
  previousTotal,
  expanded,
  onToggle,
  showComparison,
  isIncome = false,
}) => {
  const percentChange = previousTotal && previousTotal !== 0
    ? ((total - previousTotal) / Math.abs(previousTotal)) * 100
    : undefined;
  const isPositiveChange = (percentChange || 0) >= 0;

  return (
    <div className="mb-4">
      <table className="min-w-full">
        <thead>
          <tr className={`${isIncome ? 'bg-green-50' : 'bg-red-50'}`}>
            <th className="px-4 py-2 text-left font-semibold text-gray-900">{title}</th>
            <th className="px-4 py-2 text-right font-semibold w-32">Montant</th>
            {showComparison && (
              <>
                <th className="px-4 py-2 text-right font-semibold text-gray-500 w-32">N-1</th>
                <th className="px-4 py-2 text-right font-semibold w-24">Var.</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {items.map((item) => (
            <LineItem
              key={item.account.code}
              balance={item}
              level={0}
              expanded={expanded}
              onToggle={onToggle}
              showComparison={showComparison}
            />
          ))}
        </tbody>
        <tfoot>
          <tr className={`font-bold ${isIncome ? 'bg-green-100' : 'bg-red-100'}`}>
            <td className="px-4 py-2">Total {title}</td>
            <td className="px-4 py-2 text-right font-mono">{formatCurrency(total)}</td>
            {showComparison && (
              <>
                <td className="px-4 py-2 text-right font-mono text-gray-500">
                  {previousTotal !== undefined ? formatCurrency(previousTotal) : '-'}
                </td>
                <td className="px-4 py-2 text-right">
                  {percentChange !== undefined && (
                    <span className={`flex items-center justify-end gap-1 ${isPositiveChange ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositiveChange ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {formatPercent(Math.abs(percentChange))}
                    </span>
                  )}
                </td>
              </>
            )}
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const ProfitLoss: React.FC = () => {
  const intl = useIntl();
  const PERIOD_PRESETS = useMemo(() => getPeriodPresets(intl), [intl]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>(() => getPeriodPresets(intl)[3].getValue()); // This year
  const [plData, setPlData] = useState<ProfitLossData | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // Toggle expansion
  const toggleExpanded = useCallback((code: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }, []);

  // Fetch P&L data for a period
  const fetchProfitLoss = useCallback(async (startDate: Date, endDate: Date): Promise<Map<string, number>> => {
    const entriesQuery = query(
      collection(db, 'journal_entries'),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      where('status', '==', 'posted'),
      orderBy('date', 'asc')
    );

    const snapshot = await getDocs(entriesQuery);
    const accountTotals = new Map<string, number>();

    snapshot.docs.forEach((doc) => {
      const entry = doc.data();
      const lines = entry.lines || [];

      lines.forEach((line: { accountCode: string; debit?: number; credit?: number }) => {
        const account = CHART_OF_ACCOUNTS.find((a) => a.code === line.accountCode);
        if (!account) return;

        // Only include income (class 7) and expense (class 6) accounts
        if (account.type !== 'INCOME' && account.type !== 'EXPENSE') return;

        const current = accountTotals.get(line.accountCode) || 0;

        // For income: credit increases, debit decreases
        // For expense: debit increases, credit decreases
        if (account.type === 'INCOME') {
          accountTotals.set(line.accountCode, current + (line.credit || 0) - (line.debit || 0));
        } else {
          accountTotals.set(line.accountCode, current + (line.debit || 0) - (line.credit || 0));
        }
      });
    });

    return accountTotals;
  }, []);

  // Build P&L data structure
  const buildProfitLossData = useCallback((
    currentTotals: Map<string, number>,
    previousTotals?: Map<string, number>
  ): ProfitLossData => {
    const revenueItems: AccountBalance[] = [];
    const costOfSalesItems: AccountBalance[] = [];
    const operatingExpenseItems: AccountBalance[] = [];
    const otherIncomeItems: AccountBalance[] = [];
    const otherExpenseItems: AccountBalance[] = [];

    CHART_OF_ACCOUNTS.forEach((account) => {
      const amount = currentTotals.get(account.code) || 0;
      const previousAmount = previousTotals?.get(account.code);

      if (amount === 0 && (previousAmount === undefined || previousAmount === 0)) return;

      const percentChange = previousAmount && previousAmount !== 0
        ? ((amount - previousAmount) / Math.abs(previousAmount)) * 100
        : undefined;

      const balance: AccountBalance = {
        account,
        amount,
        previousAmount,
        percentChange,
      };

      // Categorize accounts
      if (account.type === 'INCOME') {
        if (account.code.startsWith('706') || account.code.startsWith('707') || account.code.startsWith('708')) {
          revenueItems.push(balance);
        } else {
          otherIncomeItems.push(balance);
        }
      } else if (account.type === 'EXPENSE') {
        if (account.code.startsWith('60')) {
          costOfSalesItems.push(balance);
        } else if (account.code.startsWith('67') || account.code.startsWith('68') || account.code.startsWith('69')) {
          otherExpenseItems.push(balance);
        } else {
          operatingExpenseItems.push(balance);
        }
      }
    });

    // Sort by account code
    const sortByCode = (a: AccountBalance, b: AccountBalance) => a.account.code.localeCompare(b.account.code);
    revenueItems.sort(sortByCode);
    costOfSalesItems.sort(sortByCode);
    operatingExpenseItems.sort(sortByCode);
    otherIncomeItems.sort(sortByCode);
    otherExpenseItems.sort(sortByCode);

    // Calculate totals
    const totalRevenue = revenueItems.reduce((sum, i) => sum + i.amount, 0);
    const totalCostOfSales = costOfSalesItems.reduce((sum, i) => sum + i.amount, 0);
    const totalOperatingExpenses = operatingExpenseItems.reduce((sum, i) => sum + i.amount, 0);
    const totalOtherIncome = otherIncomeItems.reduce((sum, i) => sum + i.amount, 0);
    const totalOtherExpenses = otherExpenseItems.reduce((sum, i) => sum + i.amount, 0);

    const grossProfit = totalRevenue - totalCostOfSales;
    const operatingIncome = grossProfit - totalOperatingExpenses;
    const netIncome = operatingIncome + totalOtherIncome - totalOtherExpenses;

    // Previous period totals
    const prevTotalRevenue = previousTotals
      ? revenueItems.reduce((sum, i) => sum + (i.previousAmount || 0), 0)
      : undefined;
    const prevTotalCostOfSales = previousTotals
      ? costOfSalesItems.reduce((sum, i) => sum + (i.previousAmount || 0), 0)
      : undefined;
    const prevTotalOperatingExpenses = previousTotals
      ? operatingExpenseItems.reduce((sum, i) => sum + (i.previousAmount || 0), 0)
      : undefined;

    const previousGrossProfit = prevTotalRevenue !== undefined && prevTotalCostOfSales !== undefined
      ? prevTotalRevenue - prevTotalCostOfSales
      : undefined;
    const previousOperatingIncome = previousGrossProfit !== undefined && prevTotalOperatingExpenses !== undefined
      ? previousGrossProfit - prevTotalOperatingExpenses
      : undefined;

    return {
      revenue: {
        items: revenueItems,
        total: totalRevenue,
        previousTotal: prevTotalRevenue,
      },
      costOfSales: {
        items: costOfSalesItems,
        total: totalCostOfSales,
        previousTotal: prevTotalCostOfSales,
      },
      grossProfit,
      previousGrossProfit,
      grossMargin: totalRevenue !== 0 ? (grossProfit / totalRevenue) * 100 : 0,
      operatingExpenses: {
        items: operatingExpenseItems,
        total: totalOperatingExpenses,
        previousTotal: prevTotalOperatingExpenses,
      },
      operatingIncome,
      previousOperatingIncome,
      operatingMargin: totalRevenue !== 0 ? (operatingIncome / totalRevenue) * 100 : 0,
      otherIncome: {
        items: otherIncomeItems,
        total: totalOtherIncome,
      },
      otherExpenses: {
        items: otherExpenseItems,
        total: totalOtherExpenses,
      },
      netIncome,
      previousNetIncome: previousOperatingIncome,
      netMargin: totalRevenue !== 0 ? (netIncome / totalRevenue) * 100 : 0,
    };
  }, []);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const currentTotals = await fetchProfitLoss(dateRange.startDate, dateRange.endDate);

        let previousTotals: Map<string, number> | undefined;
        if (showComparison) {
          // Calculate same period from previous year
          const prevStartDate = new Date(dateRange.startDate);
          prevStartDate.setFullYear(prevStartDate.getFullYear() - 1);
          const prevEndDate = new Date(dateRange.endDate);
          prevEndDate.setFullYear(prevEndDate.getFullYear() - 1);
          previousTotals = await fetchProfitLoss(prevStartDate, prevEndDate);
        }

        const data = buildProfitLossData(currentTotals, previousTotals);
        setPlData(data);
      } catch (error) {
        console.error('Error loading P&L:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dateRange, showComparison, fetchProfitLoss, buildProfitLossData]);

  // Export handlers
  const handleExportCsv = useCallback(() => {
    if (!plData) return;

    const rows: Record<string, unknown>[] = [];

    // Revenue
    rows.push({ section: 'CHIFFRE D\'AFFAIRES', code: '', compte: '', montant: '' });
    plData.revenue.items.forEach((i) => {
      rows.push({ section: '', code: i.account.code, compte: i.account.nameFr, montant: i.amount });
    });
    rows.push({ section: 'Total CA', code: '', compte: '', montant: plData.revenue.total });

    // Cost of Sales
    rows.push({ section: '', code: '', compte: '', montant: '' });
    rows.push({ section: 'COUT DES VENTES', code: '', compte: '', montant: '' });
    plData.costOfSales.items.forEach((i) => {
      rows.push({ section: '', code: i.account.code, compte: i.account.nameFr, montant: i.amount });
    });
    rows.push({ section: 'Total cout des ventes', code: '', compte: '', montant: plData.costOfSales.total });

    // Gross Profit
    rows.push({ section: 'MARGE BRUTE', code: '', compte: '', montant: plData.grossProfit });

    // Operating Expenses
    rows.push({ section: '', code: '', compte: '', montant: '' });
    rows.push({ section: 'CHARGES D\'EXPLOITATION', code: '', compte: '', montant: '' });
    plData.operatingExpenses.items.forEach((i) => {
      rows.push({ section: '', code: i.account.code, compte: i.account.nameFr, montant: i.amount });
    });
    rows.push({ section: 'Total charges exploitation', code: '', compte: '', montant: plData.operatingExpenses.total });

    // Operating Income
    rows.push({ section: 'RESULTAT D\'EXPLOITATION', code: '', compte: '', montant: plData.operatingIncome });

    // Net Income
    rows.push({ section: '', code: '', compte: '', montant: '' });
    rows.push({ section: 'RESULTAT NET', code: '', compte: '', montant: plData.netIncome });

    const csvContent = toCsv(rows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `compte_resultat_${formatDate(dateRange.startDate).replace(/\//g, '-')}_${formatDate(dateRange.endDate).replace(/\//g, '-')}.csv`);
  }, [plData, dateRange]);

  const handleExportExcel = useCallback(() => {
    if (!plData) return;

    const rows: Record<string, unknown>[] = [];

    rows.push({ Section: 'CHIFFRE D\'AFFAIRES', Code: '', Compte: '', Montant: '', 'Marge %': '' });
    plData.revenue.items.forEach((i) => {
      rows.push({ Section: '', Code: i.account.code, Compte: i.account.nameFr, Montant: i.amount, 'Marge %': '' });
    });
    rows.push({ Section: 'Total Chiffre d\'Affaires', Code: '', Compte: '', Montant: plData.revenue.total, 'Marge %': '100%' });

    rows.push({ Section: '', Code: '', Compte: '', Montant: '', 'Marge %': '' });
    rows.push({ Section: 'COUT DES VENTES', Code: '', Compte: '', Montant: '', 'Marge %': '' });
    plData.costOfSales.items.forEach((i) => {
      rows.push({ Section: '', Code: i.account.code, Compte: i.account.nameFr, Montant: i.amount, 'Marge %': '' });
    });
    rows.push({ Section: 'Total Cout des Ventes', Code: '', Compte: '', Montant: plData.costOfSales.total, 'Marge %': '' });

    rows.push({ Section: 'MARGE BRUTE', Code: '', Compte: '', Montant: plData.grossProfit, 'Marge %': `${plData.grossMargin.toFixed(1)}%` });

    rows.push({ Section: '', Code: '', Compte: '', Montant: '', 'Marge %': '' });
    rows.push({ Section: 'CHARGES D\'EXPLOITATION', Code: '', Compte: '', Montant: '', 'Marge %': '' });
    plData.operatingExpenses.items.forEach((i) => {
      rows.push({ Section: '', Code: i.account.code, Compte: i.account.nameFr, Montant: i.amount, 'Marge %': '' });
    });
    rows.push({ Section: 'Total Charges Exploitation', Code: '', Compte: '', Montant: plData.operatingExpenses.total, 'Marge %': '' });

    rows.push({ Section: 'RESULTAT D\'EXPLOITATION', Code: '', Compte: '', Montant: plData.operatingIncome, 'Marge %': `${plData.operatingMargin.toFixed(1)}%` });

    rows.push({ Section: '', Code: '', Compte: '', Montant: '', 'Marge %': '' });
    rows.push({ Section: 'RESULTAT NET', Code: '', Compte: '', Montant: plData.netIncome, 'Marge %': `${plData.netMargin.toFixed(1)}%` });

    const blob = toExcel(rows, { sheetName: 'Compte de Resultat' });
    downloadBlob(blob, `compte_resultat_${formatDate(dateRange.startDate).replace(/\//g, '-')}_${formatDate(dateRange.endDate).replace(/\//g, '-')}.xlsx`);
  }, [plData, dateRange]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Render
  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-red-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {intl.formatMessage({ id: 'admin.finance.profitLoss', defaultMessage: 'Compte de Resultat' })}
              </h1>
              <p className="text-gray-500 mt-1">
                {formatPeriod(dateRange.startDate, dateRange.endDate)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Period Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Calendar size={18} />
                  <span>{dateRange.label}</span>
                  <ChevronDown size={16} />
                </button>
                {showDatePicker && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    {PERIOD_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          setDateRange(preset.getValue());
                          setShowDatePicker(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                      >
                        {preset.getValue().label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Comparison Toggle */}
              <button
                onClick={() => setShowComparison(!showComparison)}
                className={`px-4 py-2 rounded-lg border ${
                  showComparison
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                {intl.formatMessage({ id: 'admin.accounting.balanceSheet.compareN1', defaultMessage: 'Compare Y-1' })}
              </button>

              {/* Export Buttons */}
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Download size={18} />
                CSV
              </button>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <FileText size={18} />
                Excel
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Printer size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {plData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <DollarSign size={20} />
                <span className="font-medium">{intl.formatMessage({ id: 'admin.accounting.profitLoss.revenue', defaultMessage: 'Revenue' })}</span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(plData.revenue.total)}
              </p>
              {showComparison && plData.revenue.previousTotal !== undefined && (
                <div className="mt-2 flex items-center gap-1 text-sm">
                  {plData.revenue.total >= plData.revenue.previousTotal ? (
                    <TrendingUp size={14} className="text-green-600" />
                  ) : (
                    <TrendingDown size={14} className="text-red-600" />
                  )}
                  <span className={plData.revenue.total >= plData.revenue.previousTotal ? 'text-green-600' : 'text-red-600'}>
                    {formatPercent(((plData.revenue.total - plData.revenue.previousTotal) / plData.revenue.previousTotal) * 100)}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <Percent size={20} />
                <span className="font-medium">{intl.formatMessage({ id: 'admin.accounting.profitLoss.grossMargin', defaultMessage: 'Gross Margin' })}</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">
                {formatPercent(plData.grossMargin)}
              </p>
              <p className="text-sm text-blue-600 mt-1">
                {formatCurrency(plData.grossProfit)}
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-700 mb-2">
                <Receipt size={20} />
                <span className="font-medium">{intl.formatMessage({ id: 'admin.accounting.profitLoss.operatingProfit', defaultMessage: 'Operating Profit' })}</span>
              </div>
              <p className={`text-2xl font-bold ${plData.operatingIncome >= 0 ? 'text-purple-900' : 'text-red-600'}`}>
                {formatCurrency(plData.operatingIncome)}
              </p>
              <p className="text-sm text-purple-600 mt-1">
                Marge: {formatPercent(plData.operatingMargin)}
              </p>
            </div>

            <div className={`${plData.netIncome >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'} border rounded-lg p-4`}>
              <div className={`flex items-center gap-2 ${plData.netIncome >= 0 ? 'text-emerald-700' : 'text-red-700'} mb-2`}>
                {plData.netIncome >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                <span className="font-medium">{intl.formatMessage({ id: 'admin.accounting.profitLoss.netProfit', defaultMessage: 'Net Profit' })}</span>
              </div>
              <p className={`text-2xl font-bold ${plData.netIncome >= 0 ? 'text-emerald-900' : 'text-red-600'}`}>
                {formatCurrency(plData.netIncome)}
              </p>
              <p className={`text-sm ${plData.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'} mt-1`}>
                Marge nette: {formatPercent(plData.netMargin)}
              </p>
            </div>
          </div>
        )}

        {/* P&L Content */}
        {plData && (
          <div className="space-y-6 bg-white rounded-lg border border-gray-200 p-6">
            {/* Revenue Section */}
            <Section
              title="Chiffre d'Affaires"
              items={plData.revenue.items}
              total={plData.revenue.total}
              previousTotal={plData.revenue.previousTotal}
              expanded={expanded}
              onToggle={toggleExpanded}
              showComparison={showComparison}
              isIncome={true}
            />

            {/* Cost of Sales */}
            {plData.costOfSales.items.length > 0 && (
              <Section
                title="Cout des Ventes"
                items={plData.costOfSales.items}
                total={plData.costOfSales.total}
                previousTotal={plData.costOfSales.previousTotal}
                expanded={expanded}
                onToggle={toggleExpanded}
                showComparison={showComparison}
              />
            )}

            {/* Gross Profit Line */}
            <div className="bg-blue-100 border border-blue-300 rounded-lg px-4 py-3 flex justify-between items-center">
              <span className="font-bold text-blue-900">MARGE BRUTE</span>
              <div className="text-right">
                <span className="text-xl font-bold text-blue-900 mr-4">
                  {formatCurrency(plData.grossProfit)}
                </span>
                <span className="text-blue-700">({formatPercent(plData.grossMargin)})</span>
              </div>
            </div>

            {/* Operating Expenses */}
            <Section
              title="Charges d'Exploitation"
              items={plData.operatingExpenses.items}
              total={plData.operatingExpenses.total}
              previousTotal={plData.operatingExpenses.previousTotal}
              expanded={expanded}
              onToggle={toggleExpanded}
              showComparison={showComparison}
            />

            {/* Operating Income Line */}
            <div className="bg-purple-100 border border-purple-300 rounded-lg px-4 py-3 flex justify-between items-center">
              <span className="font-bold text-purple-900">RESULTAT D'EXPLOITATION</span>
              <div className="text-right">
                <span className={`text-xl font-bold mr-4 ${plData.operatingIncome >= 0 ? 'text-purple-900' : 'text-red-600'}`}>
                  {formatCurrency(plData.operatingIncome)}
                </span>
                <span className="text-purple-700">({formatPercent(plData.operatingMargin)})</span>
              </div>
            </div>

            {/* Other Income/Expenses if any */}
            {(plData.otherIncome.items.length > 0 || plData.otherExpenses.items.length > 0) && (
              <>
                {plData.otherIncome.items.length > 0 && (
                  <Section
                    title="Autres Produits"
                    items={plData.otherIncome.items}
                    total={plData.otherIncome.total}
                    expanded={expanded}
                    onToggle={toggleExpanded}
                    showComparison={showComparison}
                    isIncome={true}
                  />
                )}
                {plData.otherExpenses.items.length > 0 && (
                  <Section
                    title="Autres Charges"
                    items={plData.otherExpenses.items}
                    total={plData.otherExpenses.total}
                    expanded={expanded}
                    onToggle={toggleExpanded}
                    showComparison={showComparison}
                  />
                )}
              </>
            )}

            {/* Net Income Line */}
            <div className={`${plData.netIncome >= 0 ? 'bg-emerald-600' : 'bg-red-600'} rounded-lg px-4 py-4 flex justify-between items-center`}>
              <span className="font-bold text-white text-lg">RESULTAT NET</span>
              <div className="text-right">
                <span className="text-2xl font-bold text-white mr-4">
                  {formatCurrency(plData.netIncome)}
                </span>
                <span className="text-white/80">({formatPercent(plData.netMargin)})</span>
              </div>
            </div>
          </div>
        )}

        {/* Company Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>{intl.formatMessage({ id: 'admin.accounting.company', defaultMessage: 'SOS-Expat OÜ - Estonian Commercial Register' })}</p>
          <p>{intl.formatMessage({ id: 'admin.accounting.period', defaultMessage: 'Period: {start} - {end}' }, { start: formatDate(dateRange.startDate), end: formatDate(dateRange.endDate) })}</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ProfitLoss;
