// src/pages/admin/Finance/CashFlow.tsx
// Cash Flow Statement (Tableau des flux de tresorerie)
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
  Download,
  Calendar,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  Building2,
  Banknote,
  FileText,
  Printer,
  ArrowRight,
} from 'lucide-react';
import { toCsv, toExcel, downloadBlob } from '../../../services/finance/reports';

// =============================================================================
// TYPES
// =============================================================================

interface CashFlowItem {
  id: string;
  label: string;
  labelFr: string;
  amount: number;
  previousAmount?: number;
  description?: string;
}

interface CashFlowSection {
  title: string;
  titleFr: string;
  items: CashFlowItem[];
  total: number;
  previousTotal?: number;
}

interface CashFlowData {
  operatingActivities: CashFlowSection;
  investingActivities: CashFlowSection;
  financingActivities: CashFlowSection;
  netCashFlow: number;
  previousNetCashFlow?: number;
  openingBalance: number;
  closingBalance: number;
  previousClosingBalance?: number;
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

// Cash account codes (class 5 - financial accounts)
const CASH_ACCOUNT_CODES = ['512100', '512200', '512300', '512400']; // Stripe, PayPal, Wise, LHV

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

interface FlowItemRowProps {
  item: CashFlowItem;
  showComparison: boolean;
}

const FlowItemRow: React.FC<FlowItemRowProps> = ({ item, showComparison }) => {
  const isPositive = item.amount >= 0;
  const change = item.previousAmount !== undefined && item.previousAmount !== 0
    ? ((item.amount - item.previousAmount) / Math.abs(item.previousAmount)) * 100
    : undefined;

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <div>
          <span className="text-gray-900">{item.labelFr}</span>
          {item.description && (
            <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
        <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
          {isPositive ? '+' : ''}{formatCurrency(item.amount)}
        </span>
      </td>
      {showComparison && (
        <>
          <td className="px-4 py-3 text-right font-mono text-gray-500 whitespace-nowrap">
            {item.previousAmount !== undefined ? (
              <span className={item.previousAmount >= 0 ? 'text-green-500' : 'text-red-500'}>
                {item.previousAmount >= 0 ? '+' : ''}{formatCurrency(item.previousAmount)}
              </span>
            ) : '-'}
          </td>
          <td className="px-4 py-3 text-right whitespace-nowrap">
            {change !== undefined && (
              <span className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
            )}
          </td>
        </>
      )}
    </tr>
  );
};

interface SectionCardProps {
  section: CashFlowSection;
  icon: React.ReactNode;
  color: 'blue' | 'orange' | 'purple';
  showComparison: boolean;
}

const SectionCard: React.FC<SectionCardProps> = ({ section, icon, color, showComparison }) => {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      header: 'bg-blue-100',
      text: 'text-blue-900',
      total: 'bg-blue-600',
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      header: 'bg-orange-100',
      text: 'text-orange-900',
      total: 'bg-orange-600',
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      header: 'bg-purple-100',
      text: 'text-purple-900',
      total: 'bg-purple-600',
    },
  };

  const classes = colorClasses[color];
  const isPositive = section.total >= 0;

  return (
    <div className={`rounded-lg border ${classes.border} overflow-hidden mb-6`}>
      {/* Header */}
      <div className={`${classes.header} px-4 py-3 flex items-center gap-2`}>
        {icon}
        <h3 className={`font-semibold ${classes.text}`}>{section.titleFr}</h3>
      </div>

      {/* Items */}
      <table className="min-w-full">
        <thead className={classes.bg}>
          <tr>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Poste</th>
            <th className="px-4 py-2 text-right text-sm font-medium text-gray-600 w-32">Montant</th>
            {showComparison && (
              <>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-500 w-32">N-1</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-500 w-20">Var.</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {section.items.length === 0 ? (
            <tr>
              <td colSpan={showComparison ? 4 : 2} className="px-4 py-4 text-center text-gray-400 text-sm">
                Aucun mouvement
              </td>
            </tr>
          ) : (
            section.items.map((item) => (
              <FlowItemRow key={item.id} item={item} showComparison={showComparison} />
            ))
          )}
        </tbody>
      </table>

      {/* Total */}
      <div className={`${classes.total} text-white px-4 py-3 flex justify-between items-center`}>
        <span className="font-medium">Total {section.titleFr}</span>
        <span className="font-bold text-lg">
          {isPositive ? '+' : ''}{formatCurrency(section.total)}
        </span>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const CashFlow: React.FC = () => {
  const intl = useIntl();
  const PERIOD_PRESETS = useMemo(() => getPeriodPresets(intl), [intl]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>(() => getPeriodPresets(intl)[3].getValue()); // This year
  const [cashFlowData, setCashFlowData] = useState<CashFlowData | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // Fetch cash flow data
  const fetchCashFlowData = useCallback(async (startDate: Date, endDate: Date): Promise<CashFlowData> => {
    // Query all journal entries for the period
    const entriesQuery = query(
      collection(db, 'journal_entries'),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      where('status', '==', 'posted'),
      orderBy('date', 'asc')
    );

    const snapshot = await getDocs(entriesQuery);

    // Categorize cash flows
    const operatingItems: CashFlowItem[] = [];
    const investingItems: CashFlowItem[] = [];
    const financingItems: CashFlowItem[] = [];

    // Track by category
    const categoryTotals = new Map<string, { amount: number; count: number }>();

    snapshot.docs.forEach((doc) => {
      const entry = doc.data();
      const lines = entry.lines || [];

      // Find cash account movements
      lines.forEach((line: { accountCode: string; debit?: number; credit?: number }) => {
        if (CASH_ACCOUNT_CODES.includes(line.accountCode)) {
          const cashChange = (line.debit || 0) - (line.credit || 0);
          if (cashChange === 0) return;

          // Categorize based on the other account in the entry
          const otherLines = lines.filter((l: { accountCode: string }) => l.accountCode !== line.accountCode);
          const category = categorizeTransaction(otherLines, entry.description || '');

          const current = categoryTotals.get(category.id) || { amount: 0, count: 0 };
          categoryTotals.set(category.id, {
            amount: current.amount + cashChange,
            count: current.count + 1,
          });
        }
      });
    });

    // Build items from categories
    categoryTotals.forEach((data, categoryId) => {
      const category = getCategoryDetails(categoryId);
      const item: CashFlowItem = {
        id: categoryId,
        label: category.label,
        labelFr: category.labelFr,
        amount: data.amount,
        description: `${data.count} transaction${data.count > 1 ? 's' : ''}`,
      };

      switch (category.section) {
        case 'operating':
          operatingItems.push(item);
          break;
        case 'investing':
          investingItems.push(item);
          break;
        case 'financing':
          financingItems.push(item);
          break;
      }
    });

    // Sort by absolute amount
    const sortByAmount = (a: CashFlowItem, b: CashFlowItem) => Math.abs(b.amount) - Math.abs(a.amount);
    operatingItems.sort(sortByAmount);
    investingItems.sort(sortByAmount);
    financingItems.sort(sortByAmount);

    // Calculate totals
    const operatingTotal = operatingItems.reduce((sum, i) => sum + i.amount, 0);
    const investingTotal = investingItems.reduce((sum, i) => sum + i.amount, 0);
    const financingTotal = financingItems.reduce((sum, i) => sum + i.amount, 0);
    const netCashFlow = operatingTotal + investingTotal + financingTotal;

    // Get opening balance (sum of cash accounts before start date)
    const openingBalance = await getCashBalance(new Date(startDate.getTime() - 1));
    const closingBalance = openingBalance + netCashFlow;

    return {
      operatingActivities: {
        title: 'Operating Activities',
        titleFr: 'Activites d\'exploitation',
        items: operatingItems,
        total: operatingTotal,
      },
      investingActivities: {
        title: 'Investing Activities',
        titleFr: 'Activites d\'investissement',
        items: investingItems,
        total: investingTotal,
      },
      financingActivities: {
        title: 'Financing Activities',
        titleFr: 'Activites de financement',
        items: financingItems,
        total: financingTotal,
      },
      netCashFlow,
      openingBalance,
      closingBalance,
    };
  }, []);

  // Get cash balance at a point in time
  const getCashBalance = async (date: Date): Promise<number> => {
    const entriesQuery = query(
      collection(db, 'journal_entries'),
      where('date', '<=', Timestamp.fromDate(date)),
      where('status', '==', 'posted'),
      orderBy('date', 'asc')
    );

    const snapshot = await getDocs(entriesQuery);
    let balance = 0;

    snapshot.docs.forEach((doc) => {
      const entry = doc.data();
      const lines = entry.lines || [];

      lines.forEach((line: { accountCode: string; debit?: number; credit?: number }) => {
        if (CASH_ACCOUNT_CODES.includes(line.accountCode)) {
          balance += (line.debit || 0) - (line.credit || 0);
        }
      });
    });

    return balance;
  };

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchCashFlowData(dateRange.startDate, dateRange.endDate);

        if (showComparison) {
          // Calculate same period from previous year
          const prevStartDate = new Date(dateRange.startDate);
          prevStartDate.setFullYear(prevStartDate.getFullYear() - 1);
          const prevEndDate = new Date(dateRange.endDate);
          prevEndDate.setFullYear(prevEndDate.getFullYear() - 1);
          const prevData = await fetchCashFlowData(prevStartDate, prevEndDate);

          // Merge previous amounts
          data.operatingActivities.previousTotal = prevData.operatingActivities.total;
          data.investingActivities.previousTotal = prevData.investingActivities.total;
          data.financingActivities.previousTotal = prevData.financingActivities.total;
          data.previousNetCashFlow = prevData.netCashFlow;
          data.previousClosingBalance = prevData.closingBalance;

          // Match items
          data.operatingActivities.items.forEach((item) => {
            const prevItem = prevData.operatingActivities.items.find((i) => i.id === item.id);
            item.previousAmount = prevItem?.amount;
          });
          data.investingActivities.items.forEach((item) => {
            const prevItem = prevData.investingActivities.items.find((i) => i.id === item.id);
            item.previousAmount = prevItem?.amount;
          });
          data.financingActivities.items.forEach((item) => {
            const prevItem = prevData.financingActivities.items.find((i) => i.id === item.id);
            item.previousAmount = prevItem?.amount;
          });
        }

        setCashFlowData(data);
      } catch (error) {
        console.error('Error loading cash flow:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dateRange, showComparison, fetchCashFlowData]);

  // Export handlers
  const handleExportCsv = useCallback(() => {
    if (!cashFlowData) return;

    const rows: Record<string, unknown>[] = [];

    rows.push({ section: 'SOLDE D\'OUVERTURE', poste: '', montant: cashFlowData.openingBalance });
    rows.push({ section: '', poste: '', montant: '' });

    rows.push({ section: 'ACTIVITES D\'EXPLOITATION', poste: '', montant: '' });
    cashFlowData.operatingActivities.items.forEach((i) => {
      rows.push({ section: '', poste: i.labelFr, montant: i.amount });
    });
    rows.push({ section: 'Total exploitation', poste: '', montant: cashFlowData.operatingActivities.total });

    rows.push({ section: '', poste: '', montant: '' });
    rows.push({ section: 'ACTIVITES D\'INVESTISSEMENT', poste: '', montant: '' });
    cashFlowData.investingActivities.items.forEach((i) => {
      rows.push({ section: '', poste: i.labelFr, montant: i.amount });
    });
    rows.push({ section: 'Total investissement', poste: '', montant: cashFlowData.investingActivities.total });

    rows.push({ section: '', poste: '', montant: '' });
    rows.push({ section: 'ACTIVITES DE FINANCEMENT', poste: '', montant: '' });
    cashFlowData.financingActivities.items.forEach((i) => {
      rows.push({ section: '', poste: i.labelFr, montant: i.amount });
    });
    rows.push({ section: 'Total financement', poste: '', montant: cashFlowData.financingActivities.total });

    rows.push({ section: '', poste: '', montant: '' });
    rows.push({ section: 'VARIATION NETTE DE TRESORERIE', poste: '', montant: cashFlowData.netCashFlow });
    rows.push({ section: 'SOLDE DE CLOTURE', poste: '', montant: cashFlowData.closingBalance });

    const csvContent = toCsv(rows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `flux_tresorerie_${formatDate(dateRange.startDate).replace(/\//g, '-')}_${formatDate(dateRange.endDate).replace(/\//g, '-')}.csv`);
  }, [cashFlowData, dateRange]);

  const handleExportExcel = useCallback(() => {
    if (!cashFlowData) return;

    const rows: Record<string, unknown>[] = [];

    rows.push({ Section: 'TABLEAU DES FLUX DE TRESORERIE', Poste: '', Montant: '' });
    rows.push({ Section: `Periode: ${formatPeriod(dateRange.startDate, dateRange.endDate)}`, Poste: '', Montant: '' });
    rows.push({ Section: '', Poste: '', Montant: '' });

    rows.push({ Section: 'Solde d\'ouverture', Poste: '', Montant: cashFlowData.openingBalance });
    rows.push({ Section: '', Poste: '', Montant: '' });

    rows.push({ Section: 'FLUX DE TRESORERIE LIES A L\'EXPLOITATION', Poste: '', Montant: '' });
    cashFlowData.operatingActivities.items.forEach((i) => {
      rows.push({ Section: '', Poste: i.labelFr, Montant: i.amount });
    });
    rows.push({ Section: 'Total flux d\'exploitation', Poste: '', Montant: cashFlowData.operatingActivities.total });

    rows.push({ Section: '', Poste: '', Montant: '' });
    rows.push({ Section: 'FLUX DE TRESORERIE LIES A L\'INVESTISSEMENT', Poste: '', Montant: '' });
    cashFlowData.investingActivities.items.forEach((i) => {
      rows.push({ Section: '', Poste: i.labelFr, Montant: i.amount });
    });
    rows.push({ Section: 'Total flux d\'investissement', Poste: '', Montant: cashFlowData.investingActivities.total });

    rows.push({ Section: '', Poste: '', Montant: '' });
    rows.push({ Section: 'FLUX DE TRESORERIE LIES AU FINANCEMENT', Poste: '', Montant: '' });
    cashFlowData.financingActivities.items.forEach((i) => {
      rows.push({ Section: '', Poste: i.labelFr, Montant: i.amount });
    });
    rows.push({ Section: 'Total flux de financement', Poste: '', Montant: cashFlowData.financingActivities.total });

    rows.push({ Section: '', Poste: '', Montant: '' });
    rows.push({ Section: 'VARIATION NETTE DE TRESORERIE', Poste: '', Montant: cashFlowData.netCashFlow });
    rows.push({ Section: 'Solde de cloture', Poste: '', Montant: cashFlowData.closingBalance });

    const blob = toExcel(rows, { sheetName: 'Flux Tresorerie' });
    downloadBlob(blob, `flux_tresorerie_${formatDate(dateRange.startDate).replace(/\//g, '-')}_${formatDate(dateRange.endDate).replace(/\//g, '-')}.xlsx`);
  }, [cashFlowData, dateRange]);

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
                {intl.formatMessage({ id: 'admin.finance.cashFlow', defaultMessage: 'Flux de Tresorerie' })}
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
                Comparer N-1
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
        {cashFlowData && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Wallet size={18} />
                <span className="text-sm font-medium">Solde ouverture</span>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(cashFlowData.openingBalance)}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <ArrowDownToLine size={18} />
                <span className="text-sm font-medium">Exploitation</span>
              </div>
              <p className={`text-xl font-bold ${cashFlowData.operatingActivities.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {cashFlowData.operatingActivities.total >= 0 ? '+' : ''}{formatCurrency(cashFlowData.operatingActivities.total)}
              </p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-700 mb-2">
                <Building2 size={18} />
                <span className="text-sm font-medium">Investissement</span>
              </div>
              <p className={`text-xl font-bold ${cashFlowData.investingActivities.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {cashFlowData.investingActivities.total >= 0 ? '+' : ''}{formatCurrency(cashFlowData.investingActivities.total)}
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-700 mb-2">
                <Banknote size={18} />
                <span className="text-sm font-medium">Financement</span>
              </div>
              <p className={`text-xl font-bold ${cashFlowData.financingActivities.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {cashFlowData.financingActivities.total >= 0 ? '+' : ''}{formatCurrency(cashFlowData.financingActivities.total)}
              </p>
            </div>

            <div className={`${cashFlowData.closingBalance >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'} border rounded-lg p-4`}>
              <div className={`flex items-center gap-2 ${cashFlowData.closingBalance >= 0 ? 'text-emerald-700' : 'text-red-700'} mb-2`}>
                <Wallet size={18} />
                <span className="text-sm font-medium">Solde cloture</span>
              </div>
              <p className={`text-xl font-bold ${cashFlowData.closingBalance >= 0 ? 'text-emerald-900' : 'text-red-600'}`}>
                {formatCurrency(cashFlowData.closingBalance)}
              </p>
            </div>
          </div>
        )}

        {/* Cash Flow Visual Summary */}
        {cashFlowData && (
          <div className="bg-gradient-to-r from-gray-100 to-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Ouverture</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(cashFlowData.openingBalance)}</p>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight size={24} className="text-gray-400" />
                <div className={`px-4 py-2 rounded-lg ${cashFlowData.netCashFlow >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <span className={`text-lg font-bold ${cashFlowData.netCashFlow >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {cashFlowData.netCashFlow >= 0 ? '+' : ''}{formatCurrency(cashFlowData.netCashFlow)}
                  </span>
                </div>
                <ArrowRight size={24} className="text-gray-400" />
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Cloture</p>
                <p className={`text-2xl font-bold ${cashFlowData.closingBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(cashFlowData.closingBalance)}
                </p>
              </div>
            </div>
            {showComparison && cashFlowData.previousClosingBalance !== undefined && (
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-center gap-8">
                <div className="flex items-center gap-2">
                  {cashFlowData.netCashFlow >= (cashFlowData.previousNetCashFlow || 0) ? (
                    <TrendingUp size={18} className="text-green-600" />
                  ) : (
                    <TrendingDown size={18} className="text-red-600" />
                  )}
                  <span className="text-sm text-gray-600">
                    Variation vs N-1: {formatCurrency(cashFlowData.netCashFlow - (cashFlowData.previousNetCashFlow || 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cash Flow Sections */}
        {cashFlowData && (
          <>
            <SectionCard
              section={cashFlowData.operatingActivities}
              icon={<ArrowDownToLine size={20} className="text-blue-600" />}
              color="blue"
              showComparison={showComparison}
            />

            <SectionCard
              section={cashFlowData.investingActivities}
              icon={<Building2 size={20} className="text-orange-600" />}
              color="orange"
              showComparison={showComparison}
            />

            <SectionCard
              section={cashFlowData.financingActivities}
              icon={<Banknote size={20} className="text-purple-600" />}
              color="purple"
              showComparison={showComparison}
            />

            {/* Net Cash Flow Summary */}
            <div className={`rounded-lg ${cashFlowData.netCashFlow >= 0 ? 'bg-emerald-600' : 'bg-red-600'} text-white px-6 py-4`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-white/80 text-sm">Variation nette de tresorerie</p>
                  <p className="text-3xl font-bold mt-1">
                    {cashFlowData.netCashFlow >= 0 ? '+' : ''}{formatCurrency(cashFlowData.netCashFlow)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/80 text-sm">Solde de cloture</p>
                  <p className="text-3xl font-bold mt-1">
                    {formatCurrency(cashFlowData.closingBalance)}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Company Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>SOS-Expat OU - Registre du Commerce d'Estonie</p>
          <p>Exercice: {formatPeriod(dateRange.startDate, dateRange.endDate)}</p>
        </div>
      </div>
    </AdminLayout>
  );
};

// =============================================================================
// HELPER FUNCTIONS FOR CATEGORIZATION
// =============================================================================

interface TransactionCategory {
  id: string;
  section: 'operating' | 'investing' | 'financing';
  label: string;
  labelFr: string;
}

function categorizeTransaction(
  otherLines: Array<{ accountCode: string; debit?: number; credit?: number }>,
  description: string
): TransactionCategory {
  // Check account codes to categorize
  for (const line of otherLines) {
    const code = line.accountCode;

    // Revenue accounts (class 7)
    if (code.startsWith('70')) {
      return { id: 'revenue', section: 'operating', label: 'Revenue', labelFr: 'Encaissements clients' };
    }

    // Expense accounts (class 6)
    if (code.startsWith('60') || code.startsWith('61') || code.startsWith('62')) {
      return { id: 'operating_expenses', section: 'operating', label: 'Operating Expenses', labelFr: 'Decaissements fournisseurs' };
    }

    // VAT accounts
    if (code.startsWith('445')) {
      return { id: 'vat', section: 'operating', label: 'VAT', labelFr: 'TVA' };
    }

    // Provider payouts
    if (code.startsWith('467')) {
      return { id: 'provider_payouts', section: 'operating', label: 'Provider Payouts', labelFr: 'Reversements prestataires' };
    }

    // Personnel
    if (code.startsWith('42')) {
      return { id: 'payroll', section: 'operating', label: 'Payroll', labelFr: 'Salaires' };
    }

    // Bank fees
    if (code.startsWith('627')) {
      return { id: 'bank_fees', section: 'operating', label: 'Bank Fees', labelFr: 'Frais bancaires' };
    }

    // Payment processor fees
    if (code.startsWith('622')) {
      return { id: 'payment_fees', section: 'operating', label: 'Payment Fees', labelFr: 'Frais de paiement' };
    }

    // Capital accounts (class 1)
    if (code.startsWith('10')) {
      return { id: 'capital', section: 'financing', label: 'Capital', labelFr: 'Apports en capital' };
    }

    // Fixed assets (class 2)
    if (code.startsWith('2')) {
      return { id: 'fixed_assets', section: 'investing', label: 'Fixed Assets', labelFr: 'Investissements' };
    }
  }

  // Default - check description
  const descLower = description.toLowerCase();
  if (descLower.includes('refund') || descLower.includes('remboursement')) {
    return { id: 'refunds', section: 'operating', label: 'Refunds', labelFr: 'Remboursements' };
  }

  return { id: 'other', section: 'operating', label: 'Other', labelFr: 'Autres operations' };
}

function getCategoryDetails(categoryId: string): TransactionCategory {
  const categories: Record<string, TransactionCategory> = {
    revenue: { id: 'revenue', section: 'operating', label: 'Revenue', labelFr: 'Encaissements clients' },
    operating_expenses: { id: 'operating_expenses', section: 'operating', label: 'Operating Expenses', labelFr: 'Decaissements fournisseurs' },
    vat: { id: 'vat', section: 'operating', label: 'VAT', labelFr: 'TVA versee/recue' },
    provider_payouts: { id: 'provider_payouts', section: 'operating', label: 'Provider Payouts', labelFr: 'Reversements prestataires' },
    payroll: { id: 'payroll', section: 'operating', label: 'Payroll', labelFr: 'Salaires et charges' },
    bank_fees: { id: 'bank_fees', section: 'operating', label: 'Bank Fees', labelFr: 'Frais bancaires' },
    payment_fees: { id: 'payment_fees', section: 'operating', label: 'Payment Fees', labelFr: 'Frais Stripe/PayPal' },
    refunds: { id: 'refunds', section: 'operating', label: 'Refunds', labelFr: 'Remboursements clients' },
    capital: { id: 'capital', section: 'financing', label: 'Capital', labelFr: 'Apports/retraits capital' },
    fixed_assets: { id: 'fixed_assets', section: 'investing', label: 'Fixed Assets', labelFr: 'Acquisitions immobilisations' },
    other: { id: 'other', section: 'operating', label: 'Other', labelFr: 'Autres operations' },
  };

  return categories[categoryId] || categories.other;
}

export default CashFlow;
