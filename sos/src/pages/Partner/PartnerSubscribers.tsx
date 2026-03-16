/**
 * PartnerSubscribers - Subscriber management page with CSV import/export
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { PartnerDashboardLayout } from '@/components/Partner';
import {
  getPartnerSubscribers,
  createPartnerSubscriber,
  deletePartnerSubscriber,
  importSubscribersCsv,
  exportSubscribersCsv,
  resendSubscriberInvitation,
} from '@/services/partnerEngineApi';
import type { Subscriber, PaginatedResponse, CsvImportResult } from '@/services/partnerEngineApi';
import toast from 'react-hot-toast';
import {
  Users,
  UserPlus,
  Upload,
  Download,
  Search,
  Filter,
  Send,
  Trash2,
  Eye,
  Loader2,
  X,
  FileUp,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

const UI = {
  card: 'bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg',
  button: {
    primary: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium rounded-xl transition-all active:scale-[0.98]',
    secondary: 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all active:scale-[0.98]',
    danger: 'bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all active:scale-[0.98]',
  },
  select: 'px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]',
  input: 'px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]',
  modalOverlay: 'fixed inset-0 z-50 flex items-center justify-center p-4',
  modalBackdrop: 'absolute inset-0 bg-black/50 backdrop-blur-sm',
  modalContent: 'relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto',
} as const;

const PAGE_SIZE = 20;

const STATUS_COLORS: Record<string, string> = {
  invited: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  registered: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  expired: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
};

const PartnerSubscribers: React.FC = () => {
  const intl = useIntl();

  // Data state
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [meta, setMeta] = useState<PaginatedResponse<Subscriber>['meta'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Modals
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Stats computed from meta
  const stats = {
    total: meta?.total ?? subscribers.length,
    active: subscribers.filter((s) => s.status === 'active').length,
    invited: subscribers.filter((s) => s.status === 'invited').length,
    registered: subscribers.filter((s) => s.status === 'registered').length,
  };

  // ── Fetch subscribers ──────────────────────────────────────
  const fetchSubscribers = useCallback(
    async (cursor?: string) => {
      try {
        if (cursor) setIsLoadingMore(true);
        else setIsLoading(true);

        const res = await getPartnerSubscribers({
          status: statusFilter || undefined,
          search: search || undefined,
          cursor,
          limit: PAGE_SIZE,
        });

        if (cursor) {
          setSubscribers((prev) => [...prev, ...res.data]);
        } else {
          setSubscribers(res.data);
        }
        setMeta(res.meta);
      } catch (err: any) {
        toast.error(err.message || 'Erreur lors du chargement');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [statusFilter, search],
  );

  // Initial load + filter changes
  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // fetchSubscribers will re-run via useEffect dependency on `search`
    }, 300);
  };

  // ── Actions ────────────────────────────────────────────────
  const handleResendInvitation = async (sub: Subscriber) => {
    try {
      await resendSubscriberInvitation(sub.id);
      toast.success(intl.formatMessage({ id: 'partner.subscribers.invitationSent', defaultMessage: 'Invitation renvoyee' }));
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
  };

  const handleDelete = async (sub: Subscriber) => {
    if (!window.confirm(intl.formatMessage({ id: 'partner.subscribers.confirmDelete', defaultMessage: 'Supprimer cet abonne ?' }))) return;
    try {
      await deletePartnerSubscriber(sub.id);
      setSubscribers((prev) => prev.filter((s) => s.id !== sub.id));
      toast.success(intl.formatMessage({ id: 'partner.subscribers.deleted', defaultMessage: 'Abonne supprime' }));
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportSubscribersCsv();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(intl.formatMessage({ id: 'partner.subscribers.exported', defaultMessage: 'Export termine' }));
    } catch (err: any) {
      toast.error(err.message || 'Erreur export');
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      invited: intl.formatMessage({ id: 'partner.subscribers.status.invited', defaultMessage: 'Invite' }),
      registered: intl.formatMessage({ id: 'partner.subscribers.status.registered', defaultMessage: 'Inscrit' }),
      active: intl.formatMessage({ id: 'partner.subscribers.status.active', defaultMessage: 'Actif' }),
      suspended: intl.formatMessage({ id: 'partner.subscribers.status.suspended', defaultMessage: 'Suspendu' }),
      expired: intl.formatMessage({ id: 'partner.subscribers.status.expired', defaultMessage: 'Expire' }),
    };
    return labels[status] || status;
  };

  // ── Loading state ──────────────────────────────────────────
  if (isLoading && subscribers.length === 0) {
    return (
      <PartnerDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </PartnerDashboardLayout>
    );
  }

  return (
    <PartnerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl dark:text-white font-bold">
              <FormattedMessage id="partner.subscribers.title" defaultMessage="Mes abonnes" />
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              <FormattedMessage id="partner.subscribers.subtitle" defaultMessage="Gerez vos abonnes et suivez leur activite" />
            </p>
          </div>
        </div>

        {/* Stats badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`${UI.card} p-4`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="partner.subscribers.stats.total" defaultMessage="Total" />
            </p>
            <p className="text-2xl dark:text-white font-bold">{stats.total}</p>
          </div>
          <div className={`${UI.card} p-4`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="partner.subscribers.stats.active" defaultMessage="Actifs" />
            </p>
            <p className="text-2xl text-green-600 dark:text-green-400 font-bold">{stats.active}</p>
          </div>
          <div className={`${UI.card} p-4`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="partner.subscribers.stats.invited" defaultMessage="Invites" />
            </p>
            <p className="text-2xl text-yellow-600 dark:text-yellow-400 font-bold">{stats.invited}</p>
          </div>
          <div className={`${UI.card} p-4`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="partner.subscribers.stats.registered" defaultMessage="Inscrits" />
            </p>
            <p className="text-2xl text-blue-600 dark:text-blue-400 font-bold">{stats.registered}</p>
          </div>
        </div>

        {/* Action bar */}
        <div className={`${UI.card} p-4`}>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => setShowImportModal(true)} className={`${UI.button.secondary} px-4 py-2 min-h-[48px] flex items-center gap-2`}>
              <Upload className="w-4 h-4" />
              <FormattedMessage id="partner.subscribers.importCsv" defaultMessage="Importer CSV" />
            </button>
            <button onClick={() => setShowAddModal(true)} className={`${UI.button.primary} px-4 py-2 min-h-[48px] flex items-center gap-2`}>
              <UserPlus className="w-4 h-4" />
              <FormattedMessage id="partner.subscribers.addManual" defaultMessage="Ajouter manuellement" />
            </button>
            <button onClick={handleExport} className={`${UI.button.secondary} px-4 py-2 min-h-[48px] flex items-center gap-2`}>
              <Download className="w-4 h-4" />
              <FormattedMessage id="partner.subscribers.exportCsv" defaultMessage="Exporter CSV" />
            </button>

            <div className="flex-1" />

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={intl.formatMessage({ id: 'partner.subscribers.searchPlaceholder', defaultMessage: 'Rechercher...' })}
                className={`${UI.input} pl-10 w-48 md:w-64`}
              />
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={UI.select}
              >
                <option value="">
                  {intl.formatMessage({ id: 'partner.subscribers.filter.all', defaultMessage: 'Tous les statuts' })}
                </option>
                <option value="invited">
                  {intl.formatMessage({ id: 'partner.subscribers.status.invited', defaultMessage: 'Invite' })}
                </option>
                <option value="registered">
                  {intl.formatMessage({ id: 'partner.subscribers.status.registered', defaultMessage: 'Inscrit' })}
                </option>
                <option value="active">
                  {intl.formatMessage({ id: 'partner.subscribers.status.active', defaultMessage: 'Actif' })}
                </option>
                <option value="suspended">
                  {intl.formatMessage({ id: 'partner.subscribers.status.suspended', defaultMessage: 'Suspendu' })}
                </option>
                <option value="expired">
                  {intl.formatMessage({ id: 'partner.subscribers.status.expired', defaultMessage: 'Expire' })}
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Subscribers Table */}
        <div className={`${UI.card} overflow-hidden`}>
          {subscribers.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                        <FormattedMessage id="partner.subscribers.table.name" defaultMessage="Nom" />
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                        <FormattedMessage id="partner.subscribers.table.email" defaultMessage="Email" />
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                        <FormattedMessage id="partner.subscribers.table.status" defaultMessage="Statut" />
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider hidden md:table-cell">
                        <FormattedMessage id="partner.subscribers.table.registeredAt" defaultMessage="Inscrit le" />
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider hidden lg:table-cell">
                        <FormattedMessage id="partner.subscribers.table.lastActivity" defaultMessage="Dernier appel" />
                      </th>
                      <th className="px-6 py-3 text-right text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider hidden md:table-cell">
                        <FormattedMessage id="partner.subscribers.table.totalCalls" defaultMessage="Total appels" />
                      </th>
                      <th className="px-6 py-3 text-right text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider hidden lg:table-cell">
                        <FormattedMessage id="partner.subscribers.table.discount" defaultMessage="Reduction" />
                      </th>
                      <th className="px-6 py-3 text-right text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                        <FormattedMessage id="partner.subscribers.table.actions" defaultMessage="Actions" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {subscribers.map((sub) => (
                      <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-white">
                          {[sub.first_name, sub.last_name].filter(Boolean).join(' ') || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {sub.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[sub.status] || ''}`}>
                            {getStatusLabel(sub.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-white hidden md:table-cell">
                          {sub.registered_at ? new Date(sub.registered_at).toLocaleDateString() : sub.invited_at ? new Date(sub.invited_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                          {sub.last_activity_at ? new Date(sub.last_activity_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-white text-right hidden md:table-cell">
                          {sub.total_calls}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 text-right hidden lg:table-cell">
                          {sub.total_discount_cents > 0 ? `$${(sub.total_discount_cents / 100).toFixed(2)}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            {sub.status === 'invited' && (
                              <button
                                onClick={() => handleResendInvitation(sub)}
                                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title={intl.formatMessage({ id: 'partner.subscribers.resend', defaultMessage: 'Renvoyer invitation' })}
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => toast(intl.formatMessage({ id: 'partner.subscribers.detailSoon', defaultMessage: 'Detail bientot disponible' }))}
                              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                              title={intl.formatMessage({ id: 'partner.subscribers.viewDetail', defaultMessage: 'Voir detail' })}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(sub)}
                              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title={intl.formatMessage({ id: 'partner.subscribers.delete', defaultMessage: 'Supprimer' })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Load more */}
              {meta?.has_more && (
                <div className="flex justify-center px-6 py-4 border-t dark:border-gray-700">
                  <button
                    onClick={() => fetchSubscribers(meta.next_cursor || undefined)}
                    disabled={isLoadingMore}
                    className={`${UI.button.secondary} px-6 py-2 min-h-[48px] flex items-center gap-2`}
                  >
                    {isLoadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                    <FormattedMessage id="partner.subscribers.loadMore" defaultMessage="Charger plus" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-12">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <FormattedMessage id="partner.subscribers.empty" defaultMessage="Aucun abonne pour le moment" />
            </div>
          )}
        </div>
      </div>

      {/* CSV Import Modal */}
      {showImportModal && (
        <CsvImportModal onClose={() => setShowImportModal(false)} onSuccess={() => { setShowImportModal(false); fetchSubscribers(); }} />
      )}

      {/* Add Subscriber Modal */}
      {showAddModal && (
        <AddSubscriberModal onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); fetchSubscribers(); }} />
      )}
    </PartnerDashboardLayout>
  );
};

// ══════════════════════════════════════════════════════════════
// CSV Import Modal
// ══════════════════════════════════════════════════════════════

const CsvImportModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const intl = useIntl();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsePreview = (f: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(Boolean).slice(0, 6);
      setPreview(lines.map((line) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''))));
    };
    reader.readAsText(f);
  };

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.csv')) {
      toast.error(intl.formatMessage({ id: 'partner.subscribers.import.csvOnly', defaultMessage: 'Fichier CSV uniquement' }));
      return;
    }
    setFile(f);
    setResult(null);
    parsePreview(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await importSubscribersCsv(file);
      setResult(res);
      if (res.imported > 0) {
        toast.success(`${res.imported} abonne(s) importe(s)`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur import');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={UI.modalOverlay}>
      <div className={UI.modalBackdrop} onClick={onClose} />
      <div className={UI.modalContent}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold dark:text-white">
              <FormattedMessage id="partner.subscribers.import.title" defaultMessage="Importer un fichier CSV" />
            </h2>
            <button onClick={onClose} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {!result ? (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                }`}
              >
                <FileUp className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="partner.subscribers.import.dropzone" defaultMessage="Glissez votre fichier CSV ici ou cliquez pour selectionner" />
                </p>
                {file && (
                  <p className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400">{file.name}</p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>

              {/* Preview */}
              {preview.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <FormattedMessage id="partner.subscribers.import.preview" defaultMessage="Apercu (5 premieres lignes)" />
                  </p>
                  <table className="w-full text-xs">
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className={i === 0 ? 'font-semibold bg-gray-50 dark:bg-gray-800/50' : ''}>
                          {row.map((cell, j) => (
                            <td key={j} className="px-2 py-1 border dark:border-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Submit */}
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={onClose} className={`${UI.button.secondary} px-4 py-2 min-h-[48px]`}>
                  <FormattedMessage id="common.cancel" defaultMessage="Annuler" />
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!file || isUploading}
                  className={`${UI.button.primary} px-4 py-2 min-h-[48px] flex items-center gap-2 ${!file ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <FormattedMessage id="partner.subscribers.import.submit" defaultMessage="Importer" />
                </button>
              </div>
            </>
          ) : (
            /* Result report */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    <FormattedMessage
                      id="partner.subscribers.import.resultImported"
                      defaultMessage="{count} abonne(s) importe(s)"
                      values={{ count: result.imported }}
                    />
                  </p>
                  {result.duplicates > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <FormattedMessage
                        id="partner.subscribers.import.resultDuplicates"
                        defaultMessage="{count} doublon(s) ignore(s)"
                        values={{ count: result.duplicates }}
                      />
                    </p>
                  )}
                </div>
              </div>

              {result.errors > 0 && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">
                      <FormattedMessage
                        id="partner.subscribers.import.resultErrors"
                        defaultMessage="{count} erreur(s)"
                        values={{ count: result.errors }}
                      />
                    </p>
                  </div>
                  {result.error_details?.slice(0, 5).map((detail, i) => (
                    <p key={i} className="text-xs text-red-600 dark:text-red-400">
                      Ligne {detail.row}: {detail.error}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <button onClick={onSuccess} className={`${UI.button.primary} px-4 py-2 min-h-[48px]`}>
                  <FormattedMessage id="common.close" defaultMessage="Fermer" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// Add Subscriber Modal
// ══════════════════════════════════════════════════════════════

const AddSubscriberModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const intl = useIntl();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    country: '',
    language: 'fr',
    tags: '',
  });

  const updateField = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email) {
      toast.error(intl.formatMessage({ id: 'partner.subscribers.add.emailRequired', defaultMessage: "L'email est requis" }));
      return;
    }
    setIsSubmitting(true);
    try {
      await createPartnerSubscriber({
        email: form.email,
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        phone: form.phone || null,
        country: form.country || null,
        language: form.language,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      });
      toast.success(intl.formatMessage({ id: 'partner.subscribers.add.success', defaultMessage: 'Abonne ajoute avec succes' }));
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass = `w-full ${UI.input}`;

  return (
    <div className={UI.modalOverlay}>
      <div className={UI.modalBackdrop} onClick={onClose} />
      <div className={UI.modalContent}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold dark:text-white">
              <FormattedMessage id="partner.subscribers.add.title" defaultMessage="Ajouter un abonne" />
            </h2>
            <button onClick={onClose} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} className={fieldClass} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FormattedMessage id="partner.subscribers.add.firstName" defaultMessage="Prenom" />
                </label>
                <input type="text" value={form.first_name} onChange={(e) => updateField('first_name', e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FormattedMessage id="partner.subscribers.add.lastName" defaultMessage="Nom" />
                </label>
                <input type="text" value={form.last_name} onChange={(e) => updateField('last_name', e.target.value)} className={fieldClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FormattedMessage id="partner.subscribers.add.phone" defaultMessage="Telephone" />
                </label>
                <input type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FormattedMessage id="partner.subscribers.add.country" defaultMessage="Pays" />
                </label>
                <input type="text" value={form.country} onChange={(e) => updateField('country', e.target.value)} className={fieldClass} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <FormattedMessage id="partner.subscribers.add.language" defaultMessage="Langue" />
              </label>
              <select value={form.language} onChange={(e) => updateField('language', e.target.value)} className={`w-full ${UI.select}`}>
                <option value="fr">Francais</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="es">Espanol</option>
                <option value="pt">Portugues</option>
                <option value="ar">العربية</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <FormattedMessage id="partner.subscribers.add.tags" defaultMessage="Tags (separes par des virgules)" />
              </label>
              <input type="text" value={form.tags} onChange={(e) => updateField('tags', e.target.value)} placeholder="vip, entreprise" className={fieldClass} />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className={`${UI.button.secondary} px-4 py-2 min-h-[48px]`}>
                <FormattedMessage id="common.cancel" defaultMessage="Annuler" />
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`${UI.button.primary} px-4 py-2 min-h-[48px] flex items-center gap-2`}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <FormattedMessage id="partner.subscribers.add.submit" defaultMessage="Ajouter" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PartnerSubscribers;
