import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Mail,
  Smartphone,
  Send,
  CheckCircle,
  XCircle,
  Globe,
  AlertTriangle,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import {
  collection,
  query,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  getDoc,
  doc as fsDoc,
} from 'firebase/firestore';
import { db, functions } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useAuth } from '../../contexts/AuthContext';

interface NotificationLog {
  id: string;
  type: string;
  recipientEmail: string;
  recipientPhone: string;
  recipientName: string;
  recipientCountry: string;
  results: Array<{
    channel: string;
    success: boolean;
    error?: string;
  }>;
  timestamp: Date;
  success: boolean;
}

interface NotificationStats {
  totalNotifications: number;
  successfulNotifications: number;
  failedNotifications: number;
  emailSuccess: number;
  pushSuccess: number;
}

const AdminNotifications: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const intl = useIntl();

  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showTestModal, setShowTestModal] = useState(false);
  const [testProviderId, setTestProviderId] = useState('');
  const [isTestingNotifications, setIsTestingNotifications] = useState(false);

  const [stats, setStats] = useState<NotificationStats>({
    totalNotifications: 0,
    successfulNotifications: 0,
    failedNotifications: 0,
    emailSuccess: 0,
    pushSuccess: 0,
  });

  useEffect(() => {
    // Check admin
    if (!currentUser || (currentUser as unknown as { role?: string }).role !== 'admin') {
      navigate('/admin/login');
      return;
    }
    void loadNotificationLogs();
  }, [currentUser, navigate]);

  const loadNotificationLogs = async () => {
    try {
      setIsLoading(true);

      // P2 FIX: Limite réduite à 30 pour économiser le cache
      const notificationsQuery = query(
        collection(db, 'notification_logs'),
        orderBy('timestamp', 'desc'),
        limit(30) // P2 FIX: Réduit de 100 à 30
      );

      const notificationsSnapshot = await getDocs(notificationsQuery);

      const notificationsData = notificationsSnapshot.docs.map((d) => {
        const data = d.data() as Omit<NotificationLog, 'id' | 'timestamp'> & {
          timestamp?: Timestamp | Date;
        };
        return {
          id: d.id,
          ...data,
          timestamp:
            data.timestamp instanceof Timestamp
              ? data.timestamp.toDate()
              : data.timestamp instanceof Date
              ? data.timestamp
              : new Date(),
        };
      }) as NotificationLog[];

      setNotificationLogs(notificationsData);

      // Stats
      const totalNotifications = notificationsData.length;
      const successfulNotifications = notificationsData.filter((n) => n.success).length;
      const failedNotifications = totalNotifications - successfulNotifications;

      let emailSuccess = 0,
        pushSuccess = 0;

      notificationsData.forEach((n) => {
        n.results?.forEach((r) => {
          if (r.success) {
            switch (r.channel) {
              case 'email':
                emailSuccess++;
                break;
              case 'push':
                pushSuccess++;
                break;
            }
          }
        });
      });

      setStats({
        totalNotifications,
        successfulNotifications,
        failedNotifications,
        emailSuccess,
        pushSuccess,
      });
    } catch (error) {
      console.error('Error loading notification logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotifications = async () => {
    const providerId = testProviderId.trim();
    if (!providerId) {
      toast.error(intl.formatMessage({ id: 'admin.notifications.test.enterValidId' }));
      return;
    }

    setIsTestingNotifications(true);
    try {
      // Get provider data for email/phone/etc.
      const providerRef = fsDoc(db, 'sos_profiles', providerId);
      const snap = await getDoc(providerRef);
      if (!snap.exists()) {
        throw new Error(intl.formatMessage({ id: 'admin.notifications.test.providerNotFound' }));
      }
      const p = snap.data() as {
        email?: string;
        phone?: string;
        name?: string;
        firstName?: string;
        lastName?: string;
        country?: string;
      };

      const recipientName =
        p.name || [p.firstName, p.lastName].filter(Boolean).join(' ') || `Provider ${providerId}`;

      // P1-5 FIX: Use enqueueMessageEvent callable (admin SDK bypasses Firestore rules)
      const { httpsCallable } = await import('firebase/functions');
      const enqueueFn = httpsCallable(functions, 'enqueueMessageEvent');
      await enqueueFn({
        eventId: 'admin_test',
        locale: intl.locale || 'fr',
        to: { email: p.email, uid: providerId },
        context: {
          user: { uid: providerId, email: p.email },
          recipientName,
          recipientCountry: p.country || '',
        },
      });

      toast.success(intl.formatMessage({ id: 'admin.notifications.test.success' }));
      setShowTestModal(false);
      setTestProviderId('');
      void loadNotificationLogs();
    } catch (error) {
      console.error('Error during notification test:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(intl.formatMessage({ id: 'admin.notifications.test.error' }, { error: errorMessage }));
    } finally {
      setIsTestingNotifications(false);
    }
  };

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat(intl.locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail size={16} className="text-blue-600" />;
      case 'push':
        return <Smartphone size={16} className="text-purple-600" />;
      default:
        return <Bell size={16} className="text-gray-600" />;
    }
  };

  const getStatusBadge = (success: boolean) =>
    success ? (
      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center">
        <CheckCircle size={12} className="mr-1" />
        {intl.formatMessage({ id: 'admin.notifications.status.success' })}
      </span>
    ) : (
      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center">
        <XCircle size={12} className="mr-1" />
        {intl.formatMessage({ id: 'admin.notifications.status.failed' })}
      </span>
    );

  return (
    <AdminLayout>
      <ErrorBoundary fallback={<div className="p-8 text-center">{intl.formatMessage({ id: 'admin.notifications.error.loading' })}</div>}>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">{intl.formatMessage({ id: 'admin.notifications.title' })}</h1>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setShowTestModal(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Send size={18} className="mr-2" />
                {intl.formatMessage({ id: 'admin.notifications.testButton' })}
              </Button>
              <Button onClick={loadNotificationLogs} variant="outline">
                <RefreshCw size={18} className="mr-2" />
                {intl.formatMessage({ id: 'admin.notifications.refresh' })}
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{intl.formatMessage({ id: 'admin.notifications.stats.total' })}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalNotifications}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Bell className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{intl.formatMessage({ id: 'admin.notifications.stats.successful' })}</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">
                    {stats.successfulNotifications}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{intl.formatMessage({ id: 'admin.notifications.stats.failed' })}</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">
                    {stats.failedNotifications}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{intl.formatMessage({ id: 'admin.notifications.stats.successRate' })}</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">
                    {stats.totalNotifications > 0
                      ? Math.round((stats.successfulNotifications / stats.totalNotifications) * 100)
                      : 0}
                    %
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Channel Stats */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{intl.formatMessage({ id: 'admin.notifications.channelStats.title' })}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <Mail className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.notifications.channel.email' })}</p>
                <p className="text-xl font-bold text-blue-600">{stats.emailSuccess}</p>
              </div>
              <div className="text-center">
                <Smartphone className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.notifications.channel.push' })}</p>
                <p className="text-xl font-bold text-purple-600">{stats.pushSuccess}</p>
              </div>
            </div>
          </div>

          {/* Notification Logs Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{intl.formatMessage({ id: 'admin.notifications.history.title' })}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {intl.formatMessage({ id: 'admin.notifications.table.recipient' })}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {intl.formatMessage({ id: 'admin.notifications.table.type' })}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {intl.formatMessage({ id: 'admin.notifications.table.channels' })}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {intl.formatMessage({ id: 'admin.notifications.table.status' })}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {intl.formatMessage({ id: 'admin.notifications.table.date' })}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
                        </div>
                        <p className="mt-2">{intl.formatMessage({ id: 'admin.notifications.loading' })}</p>
                      </td>
                    </tr>
                  ) : notificationLogs.length > 0 ? (
                    notificationLogs.map((notification) => (
                      <tr key={notification.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                              {notification.recipientName?.[0] || 'U'}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {notification.recipientName}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <Globe size={12} className="mr-1" />
                                {notification.recipientCountry}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              notification.type === 'call_request'
                                ? 'bg-red-100 text-red-800'
                                : notification.type === 'call_missed'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {notification.type === 'call_request'
                              ? intl.formatMessage({ id: 'admin.notifications.type.callRequest' })
                              : notification.type === 'call_missed'
                              ? intl.formatMessage({ id: 'admin.notifications.type.callMissed' })
                              : notification.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            {notification.results?.map((result, index) => (
                              <div key={index} className="flex items-center">
                                {getChannelIcon(result.channel)}
                                {result.success ? (
                                  <CheckCircle size={12} className="text-green-500 ml-1" />
                                ) : (
                                  <XCircle size={12} className="text-red-500 ml-1" />
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(notification.success)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(notification.timestamp)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        {intl.formatMessage({ id: 'admin.notifications.noResults' })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Test Modal */}
        <Modal
          isOpen={showTestModal}
          onClose={() => setShowTestModal(false)}
          title={intl.formatMessage({ id: 'admin.notifications.modal.title' })}
          size="medium"
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-blue-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    {intl.formatMessage({ id: 'admin.notifications.modal.infoTitle' })}
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      {intl.formatMessage({ id: 'admin.notifications.modal.infoDescription' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="testProviderId" className="block text-sm font-medium text-gray-700 mb-1">
                {intl.formatMessage({ id: 'admin.notifications.modal.providerIdLabel' })}
              </label>
              <input
                id="testProviderId"
                type="text"
                value={testProviderId}
                onChange={(e) => setTestProviderId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder={intl.formatMessage({ id: 'admin.notifications.modal.providerIdPlaceholder' })}
              />
              <p className="text-xs text-gray-500 mt-1">
                {intl.formatMessage({ id: 'admin.notifications.modal.providerIdHelp' })}
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                onClick={() => setShowTestModal(false)}
                variant="outline"
                disabled={isTestingNotifications}
              >
                {intl.formatMessage({ id: 'admin.notifications.modal.cancel' })}
              </Button>
              <Button
                onClick={handleTestNotifications}
                className="bg-purple-600 hover:bg-purple-700"
                loading={isTestingNotifications}
                disabled={!testProviderId.trim()}
              >
                <Send size={16} className="mr-2" />
                {intl.formatMessage({ id: 'admin.notifications.modal.sendTest' })}
              </Button>
            </div>
          </div>
        </Modal>
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminNotifications;
