/**
 * AdminPartnerApplications - Premium 2026 application management page
 *
 * Features:
 * - Table with status filters + count badges
 * - Actions: mark contacted, accept, reject
 * - Expandable rows with details + admin notes
 * - "Create partner account" button for accepted applications
 * - Inline admin notes editing
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import toast from 'react-hot-toast';
import {
  FileText,
  Loader2,
  Check,
  X,
  Phone,
  UserPlus,
  AlertTriangle,
  RefreshCw,
  Globe,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  Edit3,
  Save,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Mail,
  MapPin,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

// ============================================================================
// DESIGN TOKENS
// ============================================================================

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-medium rounded-xl px-4 py-2 transition-all active:scale-[0.98]",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl px-4 py-2 transition-all active:scale-[0.98]",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl px-4 py-2 transition-all active:scale-[0.98]",
  },
  input: "w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-900 dark:text-white transition-all",
} as const;

// ============================================================================
// TYPES
// ============================================================================

type ApplicationStatus = 'pending' | 'contacted' | 'accepted' | 'rejected';
type StatusFilter = 'all' | ApplicationStatus;

interface Application {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country: string;
  language: string;
  websiteUrl: string;
  websiteName: string;
  websiteCategory: string;
  websiteTraffic?: string;
  websiteDescription?: string;
  message?: string;
  status: ApplicationStatus;
  adminNotes?: string;
  convertedToPartnerId?: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<ApplicationStatus, { color: string; bgColor: string; icon: React.ElementType; labelId: string; defaultLabel: string }> = {
  pending: { color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30', icon: Clock, labelId: 'admin.partners.applications.status.pending', defaultLabel: 'En attente' },
  contacted: { color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: Phone, labelId: 'admin.partners.applications.status.contacted', defaultLabel: 'Contacte' },
  accepted: { color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30', icon: CheckCircle, labelId: 'admin.partners.applications.status.accepted', defaultLabel: 'Accepte' },
  rejected: { color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: XCircle, labelId: 'admin.partners.applications.status.rejected', defaultLabel: 'Rejete' },
};

// ============================================================================
// COMPONENT
// ============================================================================

const AdminPartnerApplications: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<{ id: string; notes: string } | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<any, { applications: Application[]; total: number; hasMore: boolean }>(functionsAffiliate, 'adminPartnerApplicationsList');
      const res = await fn({ status: statusFilter === 'all' ? undefined : statusFilter, limit: 100 });
      setApplications(res.data.applications || []);
    } catch (err: any) {
      console.error('Error fetching applications:', err);
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const updateStatus = async (appId: string, newStatus: ApplicationStatus) => {
    setActionLoading(appId);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminUpdatePartnerApplication');
      await fn({ applicationId: appId, status: newStatus });
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
      toast.success(intl.formatMessage({ id: `admin.partners.applications.${newStatus}`, defaultMessage: `Statut: ${newStatus}` }));
    } catch (err: any) {
      toast.error(err?.message || 'Error');
    } finally {
      setActionLoading(null);
    }
  };

  const saveNotes = async () => {
    if (!editingNotes) return;
    setSavingNotes(true);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminUpdatePartnerApplication');
      await fn({ applicationId: editingNotes.id, status: applications.find(a => a.id === editingNotes.id)?.status || 'pending', adminNotes: editingNotes.notes });
      setApplications(prev => prev.map(a => a.id === editingNotes.id ? { ...a, adminNotes: editingNotes.notes } : a));
      toast.success(intl.formatMessage({ id: 'admin.partners.applications.notesSaved', defaultMessage: 'Notes enregistrees' }));
      setEditingNotes(null);
    } catch (err: any) {
      toast.error(err?.message || 'Error');
    } finally {
      setSavingNotes(false);
    }
  };

  const convertToPartner = async (appId: string) => {
    setActionLoading(appId);
    try {
      const fn = httpsCallable<{ applicationId: string }, { partnerId: string }>(functionsAffiliate, 'adminConvertApplicationToPartner');
      const res = await fn({ applicationId: appId });
      toast.success(intl.formatMessage({ id: 'admin.partners.applications.converted', defaultMessage: 'Compte partenaire cree' }));
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, convertedToPartnerId: res.data.partnerId } : a));
      navigate(`/admin/partners/${res.data.partnerId}`);
    } catch (err: any) {
      toast.error(err?.message || 'Conversion failed');
    } finally {
      setActionLoading(null);
    }
  };

  // Status counts for badges
  const statusCounts = applications.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const STATUS_FILTERS: { value: StatusFilter; labelId: string; defaultLabel: string }[] = [
    { value: 'all', labelId: 'admin.partners.applications.filter.all', defaultLabel: 'Toutes' },
    { value: 'pending', labelId: 'admin.partners.applications.filter.pending', defaultLabel: 'En attente' },
    { value: 'contacted', labelId: 'admin.partners.applications.filter.contacted', defaultLabel: 'Contactes' },
    { value: 'accepted', labelId: 'admin.partners.applications.filter.accepted', defaultLabel: 'Acceptes' },
    { value: 'rejected', labelId: 'admin.partners.applications.filter.rejected', defaultLabel: 'Rejetes' },
  ];

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-teal-500" />
              </div>
              <FormattedMessage id="admin.partners.applications.title" defaultMessage="Candidatures Partenaires" />
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-[52px]">
              <FormattedMessage id="admin.partners.applications.subtitle" defaultMessage="Examiner et traiter les candidatures" />
            </p>
          </div>
          <button onClick={fetchApplications} disabled={loading} className={`${UI.button.secondary} flex items-center gap-2 text-sm`}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <FormattedMessage id="common.refresh" defaultMessage="Rafraichir" />
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {STATUS_FILTERS.map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                statusFilter === s.value
                  ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800/50'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-transparent hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              <FormattedMessage id={s.labelId} defaultMessage={s.defaultLabel} />
              {s.value !== 'all' && statusCounts[s.value] ? (
                <span className="text-xs bg-white/60 dark:bg-white/10 px-1.5 py-0.5 rounded-full">{statusCounts[s.value]}</span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Content */}
        {error ? (
          <div className={UI.card + ' p-8 text-center'}>
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
            <button onClick={fetchApplications} className={`${UI.button.secondary} inline-flex items-center gap-2 text-sm`}>
              <RefreshCw className="w-4 h-4" /> <FormattedMessage id="common.retry" defaultMessage="Reessayer" />
            </button>
          </div>
        ) : loading ? (
          <div className={UI.card + ' p-16 flex items-center justify-center'}>
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
          </div>
        ) : applications.length === 0 ? (
          <div className={UI.card + ' p-16 text-center'}>
            <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              <FormattedMessage id="admin.partners.applications.empty" defaultMessage="Aucune candidature" />
            </p>
          </div>
        ) : (
          <div className={UI.card + ' overflow-hidden'}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8"></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.applications.table.date" defaultMessage="Date" /></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.applications.table.name" defaultMessage="Nom" /></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.applications.table.email" defaultMessage="Email" /></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.applications.table.website" defaultMessage="Site web" /></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.applications.table.category" defaultMessage="Categorie" /></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.applications.table.traffic" defaultMessage="Traffic" /></th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.applications.table.status" defaultMessage="Statut" /></th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.applications.table.actions" defaultMessage="Actions" /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {applications.map(app => {
                    const sc = STATUS_CONFIG[app.status];
                    const StatusIcon = sc.icon;
                    const isExpanded = expandedId === app.id;

                    return (
                      <React.Fragment key={app.id}>
                        <tr
                          className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                          onClick={() => setExpandedId(isExpanded ? null : app.id)}
                        >
                          <td className="px-4 py-3">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-teal-500" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {new Date(app.createdAt).toLocaleDateString(intl.locale)}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                            {app.firstName} {app.lastName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{app.email}</td>
                          <td className="px-4 py-3">
                            <a
                              href={app.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {app.websiteName} <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{app.websiteCategory}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{app.websiteTraffic || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.bgColor} ${sc.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              <FormattedMessage id={sc.labelId} defaultMessage={sc.defaultLabel} />
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-1 justify-end">
                              {app.status === 'pending' && (
                                <button
                                  onClick={() => updateStatus(app.id, 'contacted')}
                                  disabled={actionLoading === app.id}
                                  className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                                  title={intl.formatMessage({ id: 'admin.partners.applications.markContacted', defaultMessage: 'Marquer contacte' })}
                                >
                                  {actionLoading === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                                </button>
                              )}
                              {(app.status === 'pending' || app.status === 'contacted') && (
                                <>
                                  <button
                                    onClick={() => updateStatus(app.id, 'accepted')}
                                    disabled={actionLoading === app.id}
                                    className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                                    title={intl.formatMessage({ id: 'admin.partners.applications.accept', defaultMessage: 'Accepter' })}
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => updateStatus(app.id, 'rejected')}
                                    disabled={actionLoading === app.id}
                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title={intl.formatMessage({ id: 'admin.partners.applications.reject', defaultMessage: 'Rejeter' })}
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {app.status === 'accepted' && !app.convertedToPartnerId && (
                                <button
                                  onClick={() => convertToPartner(app.id)}
                                  disabled={actionLoading === app.id}
                                  className={`${UI.button.primary} px-3 py-1.5 flex items-center gap-1.5 text-xs`}
                                >
                                  {actionLoading === app.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                                  <FormattedMessage id="admin.partners.applications.createAccount" defaultMessage="Creer le compte" />
                                </button>
                              )}
                              {app.convertedToPartnerId && (
                                <button
                                  onClick={() => navigate(`/admin/partners/${app.convertedToPartnerId}`)}
                                  className="text-xs text-teal-600 dark:text-teal-400 hover:underline px-2 py-1"
                                >
                                  <FormattedMessage id="admin.partners.applications.viewPartner" defaultMessage="Voir le partenaire" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Row */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} className="px-4 py-5 bg-gray-50/50 dark:bg-white/[0.02]">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left: Details */}
                                <div className="space-y-3">
                                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-teal-500" />
                                    <FormattedMessage id="admin.partners.applications.details" defaultMessage="Details" />
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    {app.phone && (
                                      <div className="flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="text-gray-700 dark:text-gray-300">{app.phone}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                      <span className="text-gray-700 dark:text-gray-300">{app.country} / {app.language}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                                      <span className="text-gray-700 dark:text-gray-300">{app.email}</span>
                                    </div>
                                  </div>
                                  {app.websiteDescription && (
                                    <div className="mt-3">
                                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                        <FormattedMessage id="admin.partners.applications.siteDescription" defaultMessage="Description du site" />
                                      </p>
                                      <p className="text-sm text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-white/5 rounded-xl p-3 border border-gray-100 dark:border-white/5">
                                        {app.websiteDescription}
                                      </p>
                                    </div>
                                  )}
                                  {app.message && (
                                    <div className="mt-3">
                                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                        <MessageSquare className="w-3 h-3" />
                                        <FormattedMessage id="admin.partners.applications.message" defaultMessage="Message" />
                                      </p>
                                      <p className="text-sm text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-white/5 rounded-xl p-3 border border-gray-100 dark:border-white/5">
                                        {app.message}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Right: Admin Notes */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-teal-500" />
                                      <FormattedMessage id="admin.partners.applications.adminNotes" defaultMessage="Notes admin" />
                                    </h4>
                                    {editingNotes?.id !== app.id && (
                                      <button
                                        onClick={() => setEditingNotes({ id: app.id, notes: app.adminNotes || '' })}
                                        className="p-1.5 text-gray-400 hover:text-teal-500 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                      >
                                        <Edit3 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                  {editingNotes?.id === app.id ? (
                                    <div className="space-y-3">
                                      <textarea
                                        value={editingNotes.notes}
                                        onChange={(e) => setEditingNotes(prev => prev ? { ...prev, notes: e.target.value } : null)}
                                        rows={4}
                                        className={UI.input}
                                        placeholder={intl.formatMessage({ id: 'admin.partners.applications.notesPlaceholder', defaultMessage: 'Notes internes...' })}
                                      />
                                      <div className="flex gap-2">
                                        <button onClick={saveNotes} disabled={savingNotes} className={`${UI.button.primary} px-3 py-1.5 text-xs flex items-center gap-1.5`}>
                                          {savingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                          <FormattedMessage id="admin.partners.applications.saveNotes" defaultMessage="Enregistrer" />
                                        </button>
                                        <button onClick={() => setEditingNotes(null)} className={`${UI.button.secondary} px-3 py-1.5 text-xs`}>
                                          <FormattedMessage id="common.cancel" defaultMessage="Annuler" />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-white/60 dark:bg-white/5 rounded-xl p-3 min-h-[80px] border border-gray-100 dark:border-white/5">
                                      {app.adminNotes || (
                                        <span className="italic text-gray-400">
                                          {intl.formatMessage({ id: 'admin.partners.applications.noNotes', defaultMessage: 'Aucune note' })}
                                        </span>
                                      )}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPartnerApplications;
