/**
 * GroupAdminPayments - Payments and withdrawals page
 */

import React, { useState, useEffect, useCallback } from 'react';
import { trackMetaInitiateCheckout } from '@/utils/metaPixel';
import { FormattedMessage, useIntl } from 'react-intl';
import GroupAdminDashboardLayout from '@/components/GroupAdmin/Layout/GroupAdminDashboardLayout';
import SEOHead from '@/components/layout/SEOHead';
import {  httpsCallable  } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { DollarSign, CreditCard, Clock, CheckCircle, XCircle, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import TelegramConnect from '@/components/shared/TelegramConnect';
import TelegramConfirmationWaiting from '@/components/shared/TelegramConfirmationWaiting';
import TelegramRequiredBanner from '@/components/Telegram/TelegramRequiredBanner';
import {
  GroupAdmin,
  GroupAdminCommission,
  GroupAdminWithdrawal,
  GroupAdminWithdrawalStatus,
  GroupAdminPaymentMethod,
  GroupAdminPaymentDetails,
  formatGroupAdminAmount,
} from '@/types/groupAdmin';

const getWithdrawalStatusBadge = (status: GroupAdminWithdrawalStatus) => {
  const statusConfig: Record<GroupAdminWithdrawalStatus, { bg: string; text: string }> = {
    pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300' },
    approved: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300' },
    processing: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-300' },
    completed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300' },
    rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300' },
    failed: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300' },
  };
  return statusConfig[status] || { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-300' };
};

const PAYMENT_METHODS: { value: GroupAdminPaymentMethod; label: string; description: string }[] = [
  { value: 'wise', label: 'Wise', description: 'Low fees worldwide' },
  { value: 'bank_transfer', label: 'Bank Transfer', description: '3-5 business days' },
  { value: 'mobile_money', label: 'Mobile Money', description: 'For Africa & Asia' },
];

const GroupAdminPayments: React.FC = () => {
  const intl = useIntl();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<GroupAdmin | null>(null);
  const [commissions, setCommissions] = useState<GroupAdminCommission[]>([]);
  const [withdrawals, setWithdrawals] = useState<GroupAdminWithdrawal[]>([]);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Telegram confirmation state
  const [pendingConfirmationId, setPendingConfirmationId] = useState<string | null>(null);
  const [pendingConfirmationAmount, setPendingConfirmationAmount] = useState(0);

  const [withdrawForm, setWithdrawForm] = useState({
    amount: 0,
    paymentMethod: 'wise' as GroupAdminPaymentMethod,
    email: '',
    accountHolderName: '',
    currency: 'USD',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const getDashboard = httpsCallable(functionsAffiliate, 'getGroupAdminDashboard');
      const result = await getDashboard({});
      const data = result.data as {
        profile: GroupAdmin;
        recentCommissions: GroupAdminCommission[];
        recentWithdrawals: GroupAdminWithdrawal[];
      };
      setProfile(data.profile);
      setCommissions(data.recentCommissions);
      setWithdrawals(data.recentWithdrawals || []);
      setWithdrawForm((prev) => ({ ...prev, amount: data.profile.availableBalance }));
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!profile || withdrawForm.amount < 3000) {
      setError('Minimum withdrawal is $30');
      return;
    }
    if (withdrawForm.amount > profile.availableBalance) {
      setError('Amount exceeds available balance');
      return;
    }

    trackMetaInitiateCheckout({
      value: withdrawForm.amount / 100,
      currency: 'USD',
      content_name: 'groupadmin_withdrawal',
      content_category: 'affiliate_withdrawal',
    });

    setSubmitting(true);
    setError(null);

    try {
      let paymentDetails: GroupAdminPaymentDetails;

      switch (withdrawForm.paymentMethod) {
        case 'wise':
          paymentDetails = {
            type: 'wise',
            email: withdrawForm.email,
            accountHolderName: withdrawForm.accountHolderName,
            currency: withdrawForm.currency,
          };
          break;
        case 'bank_transfer':
          paymentDetails = {
            type: 'bank_transfer',
            accountHolderName: withdrawForm.accountHolderName,
            bankName: '',
            accountNumber: '',
            country: '',
          };
          break;
        default:
          paymentDetails = {
            type: 'wise',
            email: withdrawForm.email,
            accountHolderName: withdrawForm.accountHolderName,
            currency: withdrawForm.currency,
          };
      }

      const requestWithdrawal = httpsCallable<unknown, { success: boolean; withdrawalId: string; telegramConfirmationRequired?: boolean }>(functionsAffiliate, 'requestGroupAdminWithdrawal');
      const result = await requestWithdrawal({
        amount: withdrawForm.amount,
        paymentMethod: withdrawForm.paymentMethod,
        paymentDetails,
      });

      if (result.data.telegramConfirmationRequired) {
        setPendingConfirmationId(result.data.withdrawalId);
        setPendingConfirmationAmount(withdrawForm.amount);
        setShowWithdrawForm(false);
      } else {
        setSuccess('Withdrawal request submitted successfully!');
        setShowWithdrawForm(false);
        fetchData();
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      if (error.message?.includes('TELEGRAM_REQUIRED')) {
        setError('Vous devez connecter Telegram pour effectuer un retrait.');
        setShowWithdrawForm(false);
      } else if (error.message?.includes('TELEGRAM_SEND_FAILED')) {
        setError('Impossible d\'envoyer la confirmation Telegram. Vérifiez que vous n\'avez pas bloqué le bot et réessayez.');
      } else {
        setError(error.message || 'Failed to submit withdrawal');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Telegram confirmation callbacks
  const handleTelegramConfirmed = useCallback(() => {
    setPendingConfirmationId(null);
    setSuccess('Withdrawal confirmed via Telegram!');
    fetchData();
  }, []);

  const handleTelegramCancelled = useCallback(() => {
    setPendingConfirmationId(null);
    fetchData();
  }, []);

  const handleTelegramExpired = useCallback(() => {
    setPendingConfirmationId(null);
    fetchData();
  }, []);

  if (loading) {
    return (
      <GroupAdminDashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      </GroupAdminDashboardLayout>
    );
  }

  return (
    <GroupAdminDashboardLayout>
      <SEOHead description="Manage your group or community with SOS-Expat" title={intl.formatMessage({ id: 'groupAdmin.payments.title', defaultMessage: 'Payments | SOS-Expat Group Admin' })} />

      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl dark:text-white md:text-3xl font-bold mb-8">
            <FormattedMessage id="groupAdmin.payments.heading" defaultMessage="Payments & Withdrawals" />
          </h1>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border dark:border-red-800/50 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border dark:border-green-800/50 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300">{success}</span>
            </div>
          )}

          {/* Telegram Required Banner - Show if not linked */}
          {!user?.telegramId && profile && (
            <div className="mb-8">
              <TelegramRequiredBanner
                role="groupAdmin"
                onboardingPath="/group-admin/telegram"
                availableBalance={profile.availableBalance / 100}
              />
            </div>
          )}

          {/* Telegram Confirmation Waiting */}
          {pendingConfirmationId && (
            <div className="mb-8">
              <TelegramConfirmationWaiting
                withdrawalId={pendingConfirmationId}
                amount={pendingConfirmationAmount}
                onConfirmed={handleTelegramConfirmed}
                onCancelled={handleTelegramCancelled}
                onExpired={handleTelegramExpired}
              />
            </div>
          )}

          {/* Balance Card */}
          {profile && !pendingConfirmationId && (
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 mb-1">Available Balance</p>
                  <p className="text-4xl font-bold">{formatGroupAdminAmount(profile.availableBalance)}</p>
                  <p className="text-green-100 mt-2">
                    Pending: {formatGroupAdminAmount(profile.pendingBalance)} · Total: {formatGroupAdminAmount(profile.totalEarned)}
                  </p>
                </div>
                <button
                  onClick={() => setShowWithdrawForm(true)}
                  disabled={profile.availableBalance < 3000 || !!profile.pendingWithdrawalId || !user?.telegramId}
                  className="bg-white text-green-600 font-bold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Withdraw
                </button>
              </div>
              {profile.pendingWithdrawalId && (
                <p className="mt-4 text-green-100">You have a pending withdrawal request</p>
              )}
            </div>
          )}

          {/* Withdrawal Form Modal */}
          {showWithdrawForm && profile && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full">
                <h2 className="text-xl dark:text-white font-bold mb-6">Request Withdrawal</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm dark:text-white font-semibold mb-1">Amount (cents)</label>
                    <input
                      type="number"
                      value={withdrawForm.amount}
                      onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: Number(e.target.value) })}
                      max={profile.availableBalance}
                      min={3000}
                      className="w-full px-4 py-2 border dark:border-white/10 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs dark:text-gray-300 mt-1">Min: $30 | Max: {formatGroupAdminAmount(profile.availableBalance)}</p>
                  </div>

                  <div>
                    <label className="block text-sm dark:text-white font-semibold mb-1">Payment Method</label>
                    <select
                      value={withdrawForm.paymentMethod}
                      onChange={(e) => setWithdrawForm({ ...withdrawForm, paymentMethod: e.target.value as GroupAdminPaymentMethod })}
                      className="w-full px-4 py-2 border dark:border-white/10 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white"
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method.value} value={method.value}>{method.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm dark:text-white font-semibold mb-1">Email</label>
                    <input
                      type="email"
                      value={withdrawForm.email}
                      onChange={(e) => setWithdrawForm({ ...withdrawForm, email: e.target.value })}
                      className="w-full px-4 py-2 border dark:border-white/10 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white"
                      placeholder="your@email.com"
                    />
                  </div>

                  {withdrawForm.paymentMethod === 'wise' && (
                    <div>
                      <label className="block text-sm dark:text-white font-semibold mb-1">Account Holder Name</label>
                      <input
                        type="text"
                        value={withdrawForm.accountHolderName}
                        onChange={(e) => setWithdrawForm({ ...withdrawForm, accountHolderName: e.target.value })}
                        className="w-full px-4 py-2 border dark:border-white/10 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowWithdrawForm(false)}
                    className="flex-1 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 font-bold py-2 px-4 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleWithdraw}
                    disabled={submitting}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-2 px-4 rounded-lg"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Submit'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Commissions History */}
          <div className="bg-white dark:bg-white/10 rounded-xl shadow-sm dark:shadow-none p-6">
            <h2 className="font-bold text-lg dark:text-white mb-4">Recent Commissions</h2>
            {commissions.length > 0 ? (
              <div className="space-y-3">
                {commissions.map((commission) => (
                  <div key={commission.id} className="flex items-center justify-between py-3 border-b dark:border-white/10 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{commission.description}</p>
                      <p className="text-sm dark:text-gray-300">{new Date(commission.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${commission.status === 'available' ? 'text-green-600' : 'text-amber-600'}`}>
                        {formatGroupAdminAmount(commission.amount)}
                      </p>
                      <p className="text-xs dark:text-gray-300 capitalize">{commission.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-700 dark:text-gray-300 py-8">No commissions yet</p>
            )}
          </div>

          {/* Withdrawal History */}
          <div className="bg-white dark:bg-white/10 rounded-xl shadow-sm dark:shadow-none p-6 mt-6">
            <h2 className="font-bold text-lg dark:text-white mb-4">
              <FormattedMessage id="groupAdmin.payments.history" defaultMessage="Withdrawal History" />
            </h2>
            {withdrawals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b dark:border-white/10">
                      <th className="text-left dark:text-gray-400 py-3 px-2 font-semibold">
                        <FormattedMessage id="groupAdmin.payments.date" defaultMessage="Date" />
                      </th>
                      <th className="text-left dark:text-gray-400 py-3 px-2 font-semibold">
                        <FormattedMessage id="groupAdmin.payments.amount" defaultMessage="Amount" />
                      </th>
                      <th className="text-left dark:text-gray-400 py-3 px-2 font-semibold">
                        <FormattedMessage id="groupAdmin.payments.method" defaultMessage="Method" />
                      </th>
                      <th className="text-left dark:text-gray-400 py-3 px-2 font-semibold">
                        <FormattedMessage id="groupAdmin.payments.status" defaultMessage="Status" />
                      </th>
                      <th className="text-left dark:text-gray-400 py-3 px-2 font-semibold">
                        <FormattedMessage id="groupAdmin.payments.reference" defaultMessage="Reference" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((withdrawal) => {
                      const statusBadge = getWithdrawalStatusBadge(withdrawal.status);
                      return (
                        <tr key={withdrawal.id} className="border-b dark:border-white/10 last:border-0">
                          <td className="py-3 px-2 text-sm dark:text-gray-300">
                            {new Date(withdrawal.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-2 text-sm dark:text-white font-medium">
                            {formatGroupAdminAmount(withdrawal.amount)}
                          </td>
                          <td className="py-3 px-2 text-sm dark:text-gray-300 capitalize">
                            {withdrawal.paymentMethod.replace('_', ' ')}
                          </td>
                          <td className="py-3 px-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                              <FormattedMessage
                                id={`groupAdmin.payments.withdrawalStatus.${withdrawal.status}`}
                                defaultMessage={withdrawal.status}
                              />
                            </span>
                            {(withdrawal.rejectionReason || withdrawal.failureReason) && (
                              <p className="text-xs dark:text-red-400 mt-1">
                                {withdrawal.rejectionReason || withdrawal.failureReason}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-2 text-sm dark:text-gray-300">
                            {withdrawal.paymentReference || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-700 dark:text-gray-300 py-8">
                <FormattedMessage id="groupAdmin.payments.noWithdrawals" defaultMessage="No withdrawals made" />
              </p>
            )}
          </div>
        </div>
      </div>
    </GroupAdminDashboardLayout>
  );
};

export default GroupAdminPayments;
