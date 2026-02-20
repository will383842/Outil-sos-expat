import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import {
  AlertTriangle,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Star,
  Mail,
} from 'lucide-react';
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useAuth } from '../../contexts/AuthContext';

/** ────────────────────────────────────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────────────────────────────────────
 */

const REPORT_STATUSES = ['pending', 'dismissed', 'resolved'] as const;
type ReportStatus = (typeof REPORT_STATUSES)[number];

type ReportType = 'contact' | 'review' | 'profile';
type TargetType = 'contact' | 'review' | 'profile';
type Priority = 'low' | 'normal' | 'high';

export interface Report {
  id: string;
  type: ReportType;
  status: ReportStatus;
  reporterId: string;
  reporterName: string;
  targetId: string;
  targetType: TargetType;
  reason: string;
  details?: string;
  createdAt: Date;
  updatedAt?: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  adminNotes?: string;
  priority?: Priority;

  // champs spécifiques aux messages de contact
  firstName?: string;
  lastName?: string;
  email?: string;
  subject?: string;
  category?: string;
  message?: string;
}

type SelectedStatusFilter = 'all' | ReportStatus;

interface ContactMessageDoc {
  firstName?: string;
  lastName?: string;
  email?: string;
  subject?: string;
  category?: string;
  message?: string;
  status?: unknown; // sera normalisé
  priority?: Priority;
  createdAt?: Date | Timestamp | number;
  updatedAt?: Date | Timestamp | number;
  response?: string;
  resolvedAt?: Date | Timestamp | number;
  resolvedBy?: string;
}

type CurrentUser = {
  id?: string;
  role?: 'admin' | 'user' | 'expat' | 'lawyer' | 'client';
} | null;

/** ────────────────────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────────────────────
 */

const isReportStatus = (val: unknown): val is ReportStatus =>
  typeof val === 'string' && (REPORT_STATUSES as readonly string[]).includes(val);

const toDate = (v: unknown): Date => {
  if (v instanceof Date) return v;
  if (typeof v === 'number') {
    // support seconds or milliseconds
    return new Date(v < 1e12 ? v * 1000 : v);
  }
  if (v && typeof (v as { toDate?: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  return new Date();
};

const safeLower = (v?: string): string => (v ?? '').toLowerCase();

/** ────────────────────────────────────────────────────────────────────────────
 * Component
 * ────────────────────────────────────────────────────────────────────────────
 */

const AdminReports: React.FC = () => {
  const navigate = useNavigate();
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) => intl.formatMessage({ id }, values);
  const { user: rawUser } = useAuth() as { user: CurrentUser };
  const currentUser = rawUser;

  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<SelectedStatusFilter>('all');

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
      return;
    }
    void loadAllReports();
     
  }, [currentUser, navigate]);

  const loadAllReports = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // 1) Charger les messages de contact depuis Firestore
      const contactQuery = query(
        collection(db, 'contact_messages'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const contactSnapshot = await getDocs(contactQuery);

      const contactReports: Report[] = contactSnapshot.docs.map((d) => {
        const data = d.data() as ContactMessageDoc;

        const createdAt = toDate(data.createdAt);
        const updatedAt = data.updatedAt ? toDate(data.updatedAt) : createdAt;

        const normalizedStatus: ReportStatus = isReportStatus(data.status)
          ? data.status
          : 'pending';

        // Remonter le contenu textuel dans "details" pour une recherche générique
        const details = data.message ?? data.subject ?? t('admin.reports.fallback.contactMessage');

        return {
          id: d.id,
          type: 'contact',
          status: normalizedStatus,
          reporterId: 'system',
          reporterName: t('admin.reports.fallback.system'),
          targetId: d.id,
          targetType: 'contact',
          reason: t('admin.reports.fallback.contactMessage'),
          details,
          createdAt,
          updatedAt,
          resolvedAt: data.resolvedAt ? toDate(data.resolvedAt) : undefined,
          resolvedBy: data.resolvedBy,
          adminNotes: data.response,
          priority: data.priority ?? 'normal',
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          subject: data.subject,
          category: data.category,
          message: data.message,
        };
      });

      // 2) Charger les signalements utilisateurs depuis Firestore (si la collection existe)
      let userReports: Report[] = [];
      try {
        const reportsQuery = query(
          collection(db, 'reports'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const reportsSnapshot = await getDocs(reportsQuery);

        userReports = reportsSnapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            type: (data.type as ReportType) || 'review',
            status: isReportStatus(data.status) ? data.status : 'pending',
            reporterId: data.reporterId || 'unknown',
            reporterName: data.reporterName || t('admin.reports.fallback.user'),
            targetId: data.targetId || d.id,
            targetType: (data.targetType as TargetType) || 'review',
            reason: data.reason || t('admin.reports.fallback.report'),
            details: data.details,
            createdAt: toDate(data.createdAt),
            updatedAt: data.updatedAt ? toDate(data.updatedAt) : undefined,
            resolvedAt: data.resolvedAt ? toDate(data.resolvedAt) : undefined,
            resolvedBy: data.resolvedBy,
            adminNotes: data.adminNotes,
            priority: data.priority ?? 'normal',
          };
        });
      } catch (reportsError) {
        // La collection 'reports' n'existe peut-être pas encore - c'est OK
      }

      // 3) Agréger proprement (un seul setReports)
      setReports([...contactReports, ...userReports]);
    } catch (error) {
       
      console.error('Error loading reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewReport = (report: Report): void => {
    setSelectedReport(report);
    setAdminNotes(report.adminNotes ?? '');
    setShowReportModal(true);
  };

  const handleResolveReport = async (): Promise<void> => {
    if (!selectedReport) return;

    try {
      setIsActionLoading(true);

      if (selectedReport.type === 'contact') {
        await updateDoc(doc(db, 'contact_messages', selectedReport.id), {
          status: 'resolved',
          resolvedAt: serverTimestamp(),
          resolvedBy: currentUser?.id,
          response: adminNotes,
          updatedAt: serverTimestamp(),
        });
      }

      setReports((prev) =>
        prev.map((r) =>
          r.id === selectedReport.id
            ? {
                ...r,
                status: 'resolved',
                resolvedAt: new Date(),
                resolvedBy: currentUser?.id,
                adminNotes: adminNotes,
                updatedAt: new Date(),
              }
            : r
        )
      );

      setShowReportModal(false);
      setSelectedReport(null);
      toast.success(t('admin.reports.alert.successResolved'));
    } catch (error) {
      console.error('Error resolving report:', error);
      toast.error(t('admin.reports.alert.errorResolving'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const formatDate = (date: Date): string =>
    new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);

  const getStatusBadge = (status: ReportStatus): JSX.Element => {
    switch (status) {
      case 'resolved':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium inline-flex items-center">
            <CheckCircle size={12} className="mr-1" />
            {t('admin.reports.status.resolved')}
          </span>
        );
      case 'dismissed':
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium inline-flex items-center">
            <XCircle size={12} className="mr-1" />
            {t('admin.reports.status.dismissed')}
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium inline-flex items-center">
            <AlertTriangle size={12} className="mr-1" />
            {t('admin.reports.status.pending')}
          </span>
        );
    }
  };

  const getTargetTypeBadge = (targetType: TargetType): JSX.Element => {
    switch (targetType) {
      case 'contact':
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium inline-flex items-center">
            <Mail size={12} className="mr-1" />
            {t('admin.reports.targetType.contact')}
          </span>
        );
      case 'review':
        return (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium inline-flex items-center">
            <Star size={12} className="mr-1" />
            {t('admin.reports.targetType.review')}
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium inline-flex items-center">
            <AlertTriangle size={12} className="mr-1" />
            {targetType}
          </span>
        );
    }
  };

  const filteredReports = useMemo<Report[]>(() => {
    const search = safeLower(searchTerm);

    const bySearch = (r: Report): boolean => {
      if (!search) return true;

      return (
        safeLower(r.reporterName).includes(search) ||
        safeLower(r.reason).includes(search) ||
        safeLower(r.details).includes(search) ||
        safeLower(r.email).includes(search) ||
        safeLower(r.subject).includes(search)
      );
    };

    const byStatus = (r: Report): boolean =>
      selectedStatus === 'all' ? true : r.status === selectedStatus;

    return reports.filter((r) => bySearch(r) && byStatus(r));
  }, [reports, searchTerm, selectedStatus]);

  return (
    <AdminLayout>
      <ErrorBoundary fallback={<div className="p-8 text-center">{t('admin.reports.errorBoundary')}</div>}>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">{t('admin.reports.title')}</h1>
            <div className="flex items-center space-x-4">
              <form onSubmit={(e) => e.preventDefault()} className="relative">
                <input
                  type="text"
                  placeholder={t('admin.reports.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </form>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as SelectedStatusFilter)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="all">{t('admin.reports.allStatuses')}</option>
                <option value="pending">{t('admin.reports.pending')}</option>
                <option value="resolved">{t('admin.reports.resolved')}</option>
                <option value="dismissed">{t('admin.reports.dismissed')}</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.reports.table.sender')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.reports.table.type')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.reports.table.subject')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.reports.table.date')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.reports.table.status')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.reports.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
                        </div>
                        <p className="mt-2">{t('admin.reports.loading')}</p>
                      </td>
                    </tr>
                  ) : filteredReports.length > 0 ? (
                    filteredReports.map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                              {(report.firstName ?? report.reporterName ?? 'U').slice(0, 1)}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {report.firstName && report.lastName
                                  ? `${report.firstName} ${report.lastName}`
                                  : report.reporterName ?? t('admin.reports.fallback.user')}
                              </div>
                              <div className="text-sm text-gray-500">
                                {report.email ?? report.reporterId}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getTargetTypeBadge(report.targetType)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 line-clamp-2">
                            {report.subject ?? report.reason}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(report.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(report.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewReport(report)}
                              className="text-blue-600 hover:text-blue-800"
                              title={t('admin.reports.modal.viewDetails')}
                            >
                              <Eye size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        {t('admin.reports.noMessages')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <Modal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          title={t('admin.reports.modal.title')}
          size="large"
        >
          {selectedReport && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedReport.type === 'contact'
                      ? t('admin.reports.modal.contactMessage')
                      : t('admin.reports.modal.reportId', { id: selectedReport.id.substring(0, 8) })}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    {getTargetTypeBadge(selectedReport.targetType)}
                    {getStatusBadge(selectedReport.status)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    {t('admin.reports.modal.receivedOn', { date: formatDate(selectedReport.createdAt) })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">{t('admin.reports.modal.senderInfo')}</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-1">{t('admin.reports.modal.name')}</h5>
                      <div className="text-sm font-medium">
                        {selectedReport.firstName && selectedReport.lastName
                          ? `${selectedReport.firstName} ${selectedReport.lastName}`
                          : selectedReport.reporterName ?? t('admin.reports.modal.notSpecified')}
                      </div>
                    </div>

                    {selectedReport.email && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-1">{t('admin.reports.modal.email')}</h5>
                        <div className="text-sm text-gray-700">{selectedReport.email}</div>
                      </div>
                    )}

                    {selectedReport.category && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-1">{t('admin.reports.modal.category')}</h5>
                        <div className="text-sm text-gray-700">{selectedReport.category}</div>
                      </div>
                    )}

                    {selectedReport.priority && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-1">{t('admin.reports.modal.priority')}</h5>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            selectedReport.priority === 'high'
                              ? 'bg-orange-100 text-orange-800'
                              : selectedReport.priority === 'low'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {selectedReport.priority}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">{t('admin.reports.modal.messageContent')}</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    {selectedReport.subject && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-1">{t('admin.reports.modal.subject')}</h5>
                        <p className="text-sm text-gray-700">{selectedReport.subject}</p>
                      </div>
                    )}

                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-1">{t('admin.reports.modal.message')}</h5>
                      <p className="text-sm text-gray-700 whitespace-pre-line">
                        {selectedReport.message ?? selectedReport.details ?? ''}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedReport.status === 'pending' && (
                <div>
                  <label htmlFor="adminNotes" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.reports.modal.response')}
                  </label>
                  <textarea
                    id="adminNotes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder={t('admin.reports.modal.responsePlaceholder')}
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button onClick={() => setShowReportModal(false)} variant="outline">
                  {t('admin.reports.modal.close')}
                </Button>

                {selectedReport.status === 'pending' && (
                  <Button
                    onClick={handleResolveReport}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={isActionLoading}
                  >
                    <CheckCircle size={16} className="mr-2" />
                    {t('admin.reports.modal.markAsResolved')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </Modal>
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminReports;
