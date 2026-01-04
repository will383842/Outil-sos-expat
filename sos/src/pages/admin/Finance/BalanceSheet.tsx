// src/pages/admin/Finance/BalanceSheet.tsx
// Balance Sheet (Bilan) - Assets, Liabilities, Equity
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  AlertTriangle,
  Building2,
  Wallet,
  CreditCard,
  PiggyBank,
  FileText,
  Printer,
} from 'lucide-react';
import { CHART_OF_ACCOUNTS, Account, AccountType } from '../../../data/chartOfAccounts';
import { toCsv, toExcel, downloadBlob } from '../../../services/finance/reports';

// =============================================================================
// TYPES
// =============================================================================

interface AccountBalance {
  account: Account;
  debit: number;
  credit: number;
  balance: number;
  children?: AccountBalance[];
}

interface BalanceSheetData {
  assets: {
    current: AccountBalance[];
    nonCurrent: AccountBalance[];
    totalCurrent: number;
    totalNonCurrent: number;
    total: number;
  };
  liabilities: {
    current: AccountBalance[];
    nonCurrent: AccountBalance[];
    totalCurrent: number;
    totalNonCurrent: number;
    total: number;
  };
  equity: {
    items: AccountBalance[];
    total: number;
  };
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
  balanceDifference: number;
}

interface DateRange {
  label: string;
  startDate: Date;
  endDate: Date;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const getDatePresets = (intl: ReturnType<typeof useIntl>): { label: string; getValue: () => DateRange }[] => [
  {
    label: 'today',
    getValue: () => {
      const now = new Date();
      return {
        label: intl.formatMessage({ id: 'admin.accounting.datePresets.today', defaultMessage: 'Today' }),
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: now,
      };
    },
  },
  {
    label: 'lastMonth',
    getValue: () => {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        label: intl.formatMessage({ id: 'admin.accounting.datePresets.lastMonth', defaultMessage: 'Last month' }),
        startDate: new Date(lastMonth.getFullYear(), 0, 1),
        endDate: endOfLastMonth,
      };
    },
  },
  {
    label: 'lastQuarter',
    getValue: () => {
      const now = new Date();
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const lastQuarterEnd = new Date(now.getFullYear(), currentQuarter * 3, 0);
      return {
        label: intl.formatMessage({ id: 'admin.accounting.datePresets.lastQuarter', defaultMessage: 'Last quarter' }),
        startDate: new Date(lastQuarterEnd.getFullYear(), 0, 1),
        endDate: lastQuarterEnd,
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

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

// =============================================================================
// COMPONENTS
// =============================================================================

interface AccountRowProps {
  balance: AccountBalance;
  level: number;
  expanded: Set<string>;
  onToggle: (code: string) => void;
}

const AccountRow: React.FC<AccountRowProps> = ({ balance, level, expanded, onToggle }) => {
  const hasChildren = balance.children && balance.children.length > 0;
  const isExpanded = expanded.has(balance.account.code);
  const indent = level * 24;

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
        <td className="px-4 py-2 text-right whitespace-nowrap">
          {balance.balance !== 0 && (
            <span className={balance.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatCurrency(Math.abs(balance.balance))}
            </span>
          )}
        </td>
      </tr>
      {hasChildren && isExpanded && balance.children?.map((child) => (
        <AccountRow
          key={child.account.code}
          balance={child}
          level={level + 1}
          expanded={expanded}
          onToggle={onToggle}
        />
      ))}
    </>
  );
};

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  balances: AccountBalance[];
  total: number;
  expanded: Set<string>;
  onToggle: (code: string) => void;
  bgColor?: string;
}

const Section: React.FC<SectionProps> = ({
  title,
  icon,
  balances,
  total,
  expanded,
  onToggle,
  bgColor = 'bg-gray-50',
}) => (
  <div className="mb-6">
    <div className={`${bgColor} px-4 py-3 rounded-t-lg border border-b-0 border-gray-200`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <span className="font-bold text-lg">{formatCurrency(total)}</span>
      </div>
    </div>
    <div className="border border-gray-200 rounded-b-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <tbody className="bg-white divide-y divide-gray-100">
          {balances.map((balance) => (
            <AccountRow
              key={balance.account.code}
              balance={balance}
              level={0}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const BalanceSheet: React.FC = () => {
  const intl = useIntl();
  const DATE_PRESETS = useMemo(() => getDatePresets(intl), [intl]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>(() => getDatePresets(intl)[0].getValue());
  const [balanceData, setBalanceData] = useState<BalanceSheetData | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [comparisonData, setComparisonData] = useState<BalanceSheetData | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  // Toggle account expansion
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

  // Fetch journal entries and calculate balances
  const fetchBalanceSheet = useCallback(async (endDate: Date): Promise<BalanceSheetData> => {
    // Query all journal entries up to the end date
    const entriesQuery = query(
      collection(db, 'journal_entries'),
      where('date', '<=', Timestamp.fromDate(endDate)),
      where('status', '==', 'posted'),
      orderBy('date', 'asc')
    );

    const snapshot = await getDocs(entriesQuery);

    // Calculate balances by account
    const accountBalances = new Map<string, { debit: number; credit: number }>();

    snapshot.docs.forEach((doc) => {
      const entry = doc.data();
      const lines = entry.lines || [];

      lines.forEach((line: { accountCode: string; debit?: number; credit?: number }) => {
        const current = accountBalances.get(line.accountCode) || { debit: 0, credit: 0 };
        accountBalances.set(line.accountCode, {
          debit: current.debit + (line.debit || 0),
          credit: current.credit + (line.credit || 0),
        });
      });
    });

    // Group accounts by type
    const assetAccounts: AccountBalance[] = [];
    const liabilityAccounts: AccountBalance[] = [];
    const equityAccounts: AccountBalance[] = [];

    CHART_OF_ACCOUNTS.forEach((account) => {
      const balanceData = accountBalances.get(account.code) || { debit: 0, credit: 0 };

      // Calculate balance based on account type
      let balance: number;
      if (account.type === 'ASSET' || account.type === 'EXPENSE') {
        balance = balanceData.debit - balanceData.credit;
      } else {
        balance = balanceData.credit - balanceData.debit;
      }

      // Skip zero balances for cleaner display
      if (balance === 0 && balanceData.debit === 0 && balanceData.credit === 0) {
        return;
      }

      const accountBalance: AccountBalance = {
        account,
        debit: balanceData.debit,
        credit: balanceData.credit,
        balance,
      };

      switch (account.type) {
        case 'ASSET':
          assetAccounts.push(accountBalance);
          break;
        case 'LIABILITY':
          liabilityAccounts.push(accountBalance);
          break;
        case 'EQUITY':
          equityAccounts.push(accountBalance);
          break;
      }
    });

    // Calculate totals
    const totalAssets = assetAccounts.reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum + a.balance, 0);
    const totalEquity = equityAccounts.reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    // Sort by account code
    const sortByCode = (a: AccountBalance, b: AccountBalance) =>
      a.account.code.localeCompare(b.account.code);

    assetAccounts.sort(sortByCode);
    liabilityAccounts.sort(sortByCode);
    equityAccounts.sort(sortByCode);

    // Separate current and non-current (simplified - based on account code ranges)
    const currentAssets = assetAccounts.filter(
      (a) => a.account.code.startsWith('41') || a.account.code.startsWith('51')
    );
    const nonCurrentAssets = assetAccounts.filter(
      (a) => !a.account.code.startsWith('41') && !a.account.code.startsWith('51')
    );

    const currentLiabilities = liabilityAccounts.filter(
      (a) => a.account.code.startsWith('40') || a.account.code.startsWith('42') || a.account.code.startsWith('44') || a.account.code.startsWith('46')
    );
    const nonCurrentLiabilities = liabilityAccounts.filter(
      (a) => !currentLiabilities.includes(a)
    );

    return {
      assets: {
        current: currentAssets,
        nonCurrent: nonCurrentAssets,
        totalCurrent: currentAssets.reduce((sum, a) => sum + a.balance, 0),
        totalNonCurrent: nonCurrentAssets.reduce((sum, a) => sum + a.balance, 0),
        total: totalAssets,
      },
      liabilities: {
        current: currentLiabilities,
        nonCurrent: nonCurrentLiabilities,
        totalCurrent: currentLiabilities.reduce((sum, a) => sum + a.balance, 0),
        totalNonCurrent: nonCurrentLiabilities.reduce((sum, a) => sum + a.balance, 0),
        total: totalLiabilities,
      },
      equity: {
        items: equityAccounts,
        total: totalEquity,
      },
      totalLiabilitiesAndEquity,
      isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01,
      balanceDifference: totalAssets - totalLiabilitiesAndEquity,
    };
  }, []);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchBalanceSheet(dateRange.endDate);
        setBalanceData(data);

        // Load comparison period (previous year)
        if (showComparison) {
          const compEndDate = new Date(dateRange.endDate);
          compEndDate.setFullYear(compEndDate.getFullYear() - 1);
          const compData = await fetchBalanceSheet(compEndDate);
          setComparisonData(compData);
        }
      } catch (error) {
        console.error('Error loading balance sheet:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dateRange, showComparison, fetchBalanceSheet]);

  // Export handlers
  const handleExportCsv = useCallback(() => {
    if (!balanceData) return;

    const rows: Record<string, unknown>[] = [];

    // Assets
    rows.push({ section: 'ACTIFS', account: '', code: '', balance: '' });
    [...balanceData.assets.current, ...balanceData.assets.nonCurrent].forEach((a) => {
      rows.push({
        section: '',
        code: a.account.code,
        account: a.account.nameFr,
        balance: a.balance,
      });
    });
    rows.push({ section: 'TOTAL ACTIFS', account: '', code: '', balance: balanceData.assets.total });

    // Liabilities
    rows.push({ section: '', account: '', code: '', balance: '' });
    rows.push({ section: 'PASSIFS', account: '', code: '', balance: '' });
    [...balanceData.liabilities.current, ...balanceData.liabilities.nonCurrent].forEach((a) => {
      rows.push({
        section: '',
        code: a.account.code,
        account: a.account.nameFr,
        balance: a.balance,
      });
    });
    rows.push({ section: 'TOTAL PASSIFS', account: '', code: '', balance: balanceData.liabilities.total });

    // Equity
    rows.push({ section: '', account: '', code: '', balance: '' });
    rows.push({ section: 'CAPITAUX PROPRES', account: '', code: '', balance: '' });
    balanceData.equity.items.forEach((a) => {
      rows.push({
        section: '',
        code: a.account.code,
        account: a.account.nameFr,
        balance: a.balance,
      });
    });
    rows.push({ section: 'TOTAL CAPITAUX PROPRES', account: '', code: '', balance: balanceData.equity.total });

    const csvContent = toCsv(rows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `bilan_${formatDate(dateRange.endDate).replace(/\//g, '-')}.csv`);
  }, [balanceData, dateRange]);

  const handleExportExcel = useCallback(() => {
    if (!balanceData) return;

    const rows: Record<string, unknown>[] = [];

    // Build rows similar to CSV
    rows.push({ Section: 'ACTIFS COURANTS', Code: '', Compte: '', Solde: '' });
    balanceData.assets.current.forEach((a) => {
      rows.push({ Section: '', Code: a.account.code, Compte: a.account.nameFr, Solde: a.balance });
    });
    rows.push({ Section: 'Sous-total actifs courants', Code: '', Compte: '', Solde: balanceData.assets.totalCurrent });

    rows.push({ Section: 'ACTIFS NON COURANTS', Code: '', Compte: '', Solde: '' });
    balanceData.assets.nonCurrent.forEach((a) => {
      rows.push({ Section: '', Code: a.account.code, Compte: a.account.nameFr, Solde: a.balance });
    });
    rows.push({ Section: 'Sous-total actifs non courants', Code: '', Compte: '', Solde: balanceData.assets.totalNonCurrent });
    rows.push({ Section: 'TOTAL ACTIFS', Code: '', Compte: '', Solde: balanceData.assets.total });

    rows.push({ Section: '', Code: '', Compte: '', Solde: '' });
    rows.push({ Section: 'PASSIFS COURANTS', Code: '', Compte: '', Solde: '' });
    balanceData.liabilities.current.forEach((a) => {
      rows.push({ Section: '', Code: a.account.code, Compte: a.account.nameFr, Solde: a.balance });
    });
    rows.push({ Section: 'Sous-total passifs courants', Code: '', Compte: '', Solde: balanceData.liabilities.totalCurrent });

    rows.push({ Section: 'PASSIFS NON COURANTS', Code: '', Compte: '', Solde: '' });
    balanceData.liabilities.nonCurrent.forEach((a) => {
      rows.push({ Section: '', Code: a.account.code, Compte: a.account.nameFr, Solde: a.balance });
    });
    rows.push({ Section: 'Sous-total passifs non courants', Code: '', Compte: '', Solde: balanceData.liabilities.totalNonCurrent });
    rows.push({ Section: 'TOTAL PASSIFS', Code: '', Compte: '', Solde: balanceData.liabilities.total });

    rows.push({ Section: '', Code: '', Compte: '', Solde: '' });
    rows.push({ Section: 'CAPITAUX PROPRES', Code: '', Compte: '', Solde: '' });
    balanceData.equity.items.forEach((a) => {
      rows.push({ Section: '', Code: a.account.code, Compte: a.account.nameFr, Solde: a.balance });
    });
    rows.push({ Section: 'TOTAL CAPITAUX PROPRES', Code: '', Compte: '', Solde: balanceData.equity.total });

    rows.push({ Section: '', Code: '', Compte: '', Solde: '' });
    rows.push({ Section: 'TOTAL PASSIFS + CAPITAUX PROPRES', Code: '', Compte: '', Solde: balanceData.totalLiabilitiesAndEquity });

    const blob = toExcel(rows, { sheetName: 'Bilan' });
    downloadBlob(blob, `bilan_${formatDate(dateRange.endDate).replace(/\//g, '-')}.xlsx`);
  }, [balanceData, dateRange]);

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
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {intl.formatMessage({ id: 'admin.finance.balanceSheet', defaultMessage: 'Bilan' })}
              </h1>
              <p className="text-gray-500 mt-1">
                {intl.formatMessage({ id: 'admin.accounting.asOf', defaultMessage: 'As of {date}' }, { date: formatDate(dateRange.endDate) })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Date Range Selector */}
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
                    {DATE_PRESETS.map((preset) => (
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

        {/* Balance Check Warning */}
        {balanceData && !balanceData.isBalanced && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertTriangle className="text-red-600" size={24} />
            <div>
              <p className="font-medium text-red-800">{intl.formatMessage({ id: 'admin.accounting.balanceSheet.unbalanced', defaultMessage: 'Unbalanced' })}</p>
              <p className="text-red-600 text-sm">
                {intl.formatMessage({ id: 'admin.accounting.balanceSheet.difference', defaultMessage: 'Difference' })}: {formatCurrency(balanceData.balanceDifference)}
              </p>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {balanceData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <Wallet size={20} />
                <span className="font-medium">{intl.formatMessage({ id: 'admin.accounting.balanceSheet.totalAssets', defaultMessage: 'Total Assets' })}</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">
                {formatCurrency(balanceData.assets.total)}
              </p>
              {showComparison && comparisonData && (
                <div className="mt-2 flex items-center gap-1 text-sm">
                  {balanceData.assets.total >= comparisonData.assets.total ? (
                    <TrendingUp size={14} className="text-green-600" />
                  ) : (
                    <TrendingDown size={14} className="text-red-600" />
                  )}
                  <span className={balanceData.assets.total >= comparisonData.assets.total ? 'text-green-600' : 'text-red-600'}>
                    {((balanceData.assets.total - comparisonData.assets.total) / comparisonData.assets.total * 100).toFixed(1)}%
                  </span>
                  <span className="text-gray-500">{intl.formatMessage({ id: 'admin.accounting.balanceSheet.vsN1', defaultMessage: 'vs Y-1' })}</span>
                </div>
              )}
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-700 mb-2">
                <CreditCard size={20} />
                <span className="font-medium">{intl.formatMessage({ id: 'admin.accounting.balanceSheet.totalLiabilities', defaultMessage: 'Total Liabilities' })}</span>
              </div>
              <p className="text-2xl font-bold text-orange-900">
                {formatCurrency(balanceData.liabilities.total)}
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <PiggyBank size={20} />
                <span className="font-medium">{intl.formatMessage({ id: 'admin.accounting.balanceSheet.equity', defaultMessage: 'Equity' })}</span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(balanceData.equity.total)}
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-700 mb-2">
                <Building2 size={20} />
                <span className="font-medium">{intl.formatMessage({ id: 'admin.accounting.balanceSheet.balance', defaultMessage: 'Balance' })}</span>
              </div>
              <p className={`text-2xl font-bold ${balanceData.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                {balanceData.isBalanced ? intl.formatMessage({ id: 'admin.accounting.balanceSheet.ok', defaultMessage: 'OK' }) : intl.formatMessage({ id: 'admin.accounting.balanceSheet.error', defaultMessage: 'Error' })}
              </p>
            </div>
          </div>
        )}

        {/* Balance Sheet Content */}
        {balanceData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Assets */}
            <div>
              <Section
                title={intl.formatMessage({ id: 'admin.accounting.balanceSheet.currentAssets', defaultMessage: 'Current Assets' })}
                icon={<Wallet size={20} className="text-blue-600" />}
                balances={balanceData.assets.current}
                total={balanceData.assets.totalCurrent}
                expanded={expanded}
                onToggle={toggleExpanded}
                bgColor="bg-blue-50"
              />

              <Section
                title={intl.formatMessage({ id: 'admin.accounting.balanceSheet.nonCurrentAssets', defaultMessage: 'Non-Current Assets' })}
                icon={<Building2 size={20} className="text-blue-600" />}
                balances={balanceData.assets.nonCurrent}
                total={balanceData.assets.totalNonCurrent}
                expanded={expanded}
                onToggle={toggleExpanded}
                bgColor="bg-blue-50"
              />

              {/* Total Assets */}
              <div className="bg-blue-600 text-white px-4 py-3 rounded-lg flex justify-between items-center">
                <span className="font-bold">{intl.formatMessage({ id: 'admin.accounting.balanceSheet.totalAssets', defaultMessage: 'Total Assets' }).toUpperCase()}</span>
                <span className="text-xl font-bold">{formatCurrency(balanceData.assets.total)}</span>
              </div>
            </div>

            {/* Right Column - Liabilities & Equity */}
            <div>
              <Section
                title={intl.formatMessage({ id: 'admin.accounting.balanceSheet.currentLiabilities', defaultMessage: 'Current Liabilities' })}
                icon={<CreditCard size={20} className="text-orange-600" />}
                balances={balanceData.liabilities.current}
                total={balanceData.liabilities.totalCurrent}
                expanded={expanded}
                onToggle={toggleExpanded}
                bgColor="bg-orange-50"
              />

              <Section
                title={intl.formatMessage({ id: 'admin.accounting.balanceSheet.nonCurrentLiabilities', defaultMessage: 'Non-Current Liabilities' })}
                icon={<CreditCard size={20} className="text-orange-600" />}
                balances={balanceData.liabilities.nonCurrent}
                total={balanceData.liabilities.totalNonCurrent}
                expanded={expanded}
                onToggle={toggleExpanded}
                bgColor="bg-orange-50"
              />

              <Section
                title={intl.formatMessage({ id: 'admin.accounting.balanceSheet.equity', defaultMessage: 'Equity' })}
                icon={<PiggyBank size={20} className="text-green-600" />}
                balances={balanceData.equity.items}
                total={balanceData.equity.total}
                expanded={expanded}
                onToggle={toggleExpanded}
                bgColor="bg-green-50"
              />

              {/* Total Liabilities + Equity */}
              <div className="bg-gray-800 text-white px-4 py-3 rounded-lg flex justify-between items-center">
                <span className="font-bold">{intl.formatMessage({ id: 'admin.accounting.balanceSheet.totalLiabilitiesEquity', defaultMessage: 'Total Liabilities + Equity' }).toUpperCase()}</span>
                <span className="text-xl font-bold">{formatCurrency(balanceData.totalLiabilitiesAndEquity)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Company Info Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>{intl.formatMessage({ id: 'admin.accounting.company', defaultMessage: 'SOS-Expat OÜ - Estonian Commercial Register' })}</p>
          <p>{intl.formatMessage({ id: 'admin.accounting.accountingCurrency', defaultMessage: 'Accounting currency: EUR' })}</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default BalanceSheet;
