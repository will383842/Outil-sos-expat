// src/pages/admin/AdminProviders.tsx
// Page de gestion et monitoring des prestataires en temps reel
// Avec actions en masse et gestion des statuts (hide, block, suspend, delete)
// =============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import {
  UserCheck,
  Users,
  Wifi,
  WifiOff,
  Phone,
  PhoneOff,
  Clock,
  MapPin,
  Search,
  Filter,
  RefreshCw,
  Download,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Globe,
  Star,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  Bell,
  Settings,
  Mail,
  MessageSquare,
  Timer,
  Zap,
  Shield,
  Scale,
  Briefcase,
  Check,
  X,
  Trash2,
  ShieldX,
  Ban,
  Pause,
  Play,
  Square,
  CheckSquare,
  MinusSquare,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  getDocs,
  doc,
  updateDoc,
  runTransaction,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import Modal from '../../components/common/Modal';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import RealtimeSuspendedBanner, { RealtimeCountdown } from '../../components/admin/RealtimeSuspendedBanner';
import { useAutoSuspendRealtime } from '../../hooks/useAutoSuspendRealtime';
import { useAuth } from '../../contexts/AuthContext';
import { logError } from '../../utils/logging';
import AdminGdprPurgeModal from '../../components/admin/AdminGdprPurgeModal';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ============ TYPES ============
interface Provider {
  id: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  type: 'lawyer' | 'expat';
  role?: string;
  isOnline: boolean;
  availability: 'available' | 'busy' | 'offline';
  currentCallSessionId?: string;
  busySince?: Timestamp;
  busyReason?: string;
  lastActivity?: Timestamp;
  lastActivityCheck?: Timestamp;
  lastStatusChange?: Timestamp;
  isApproved: boolean;
  approvalStatus?: string;
  validationStatus?: 'pending' | 'approved' | 'rejected';
  isVisible?: boolean;
  isDeleted?: boolean;
  isBanned?: boolean;
  isSuspended?: boolean;
  suspendedAt?: Timestamp;
  suspendedUntil?: Timestamp;
  suspendReason?: string;
  country?: string;
  city?: string;
  languages?: string[];
  specializations?: string[];
  rating?: number;
  totalCalls?: number;
  successfulCalls?: number;
  totalRevenue?: number;
  averageCallDuration?: number;
  responseRate?: number;
  createdAt?: Timestamp;
  stripeOnboardingComplete?: boolean;
  paypalOnboardingComplete?: boolean;
  paymentGateway?: 'stripe' | 'paypal';
  profilePhoto?: string;
}

interface ProviderStats {
  totalProviders: number;
  onlineNow: number;
  busyNow: number;
  offlineNow: number;
  approvedProviders: number;
  pendingApproval: number;
  lawyersCount: number;
  expatsCount: number;
  averageRating: number;
  totalCallsToday: number;
  totalRevenueToday: number;
}

interface ProviderAlert {
  id: string;
  providerId: string;
  providerName: string;
  type: 'inactive_long' | 'low_response_rate' | 'kyc_incomplete' | 'payment_issue';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: Date;
}

interface ProviderActionResult {
  success: boolean;
  providerId: string;
  action: string;
  timestamp: string;
  error?: string;
}

interface BulkActionResult {
  success: boolean;
  total: number;
  successful: number;
  failed: number;
  results: ProviderActionResult[];
}

type BulkActionType = 'hide' | 'block' | 'suspend' | 'delete';

// ============ TYPES TRADUCTIONS ============
interface ProviderTranslations {
  statusOffline: string;
  statusBusy: string;
  statusOnline: string;
  typeLawyer: string;
  typeExpat: string;
  badgeSuspended: string;
  badgeSuspendedUntil: string;
  badgeBlocked: string;
  badgeHidden: string;
  badgeDeleted: string;
  liveIndicator: string;
  vsYesterday: string;
}

interface ModalTranslations {
  hideTitle: string;
  blockTitle: string;
  suspendTitle: string;
  deleteTitle: string;
  confirmHide: string;
  confirmBlock: string;
  confirmSuspend: string;
  confirmDelete: string;
  reasonRequired: string;
  reasonPlaceholder: string;
  cancel: string;
  confirm: string;
  bulkHide: string;
  bulkBlock: string;
  bulkSuspend: string;
  bulkDelete: string;
  toastReasonRequired: string;
  suspendReason: string;
  suspendReasonPlaceholder: string;
  suspendSetEndDate: string;
  suspendEndDate: string;
  suspendWarning: string;
  // Delete modal translations
  deleteHardTitle: string;
  deleteHardWarning: string;
  deleteSoftWarning: string;
  deleteTypeToConfirm: string;
  deleteConfirmText: string;
  deleteHardConfirmText: string;
  // Block modal translations
  blockReason: string;
  blockReasonPlaceholder: string;
  blockWarning: string;
}

// ============ COMPOSANTS UTILITAIRES ============
const StatusBadge: React.FC<{ status: 'available' | 'busy' | 'offline'; isOnline: boolean; translations: ProviderTranslations }> = ({ status, isOnline, translations }) => {
  const getConfig = () => {
    if (!isOnline || status === 'offline') {
      return { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: WifiOff, label: translations.statusOffline };
    }
    if (status === 'busy') {
      return { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Phone, label: translations.statusBusy, pulse: true };
    }
    return { color: 'bg-green-100 text-green-800 border-green-200', icon: Wifi, label: translations.statusOnline, pulse: true };
  };

  const config = getConfig();
  const IconComponent = config.icon;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.color} ${
      config.pulse ? 'animate-pulse' : ''
    }`}>
      <IconComponent size={12} className="mr-1" />
      {config.label}
    </span>
  );
};

const ProviderTypeBadge: React.FC<{ type: 'lawyer' | 'expat'; translations: ProviderTranslations }> = ({ type, translations }) => {
  if (type === 'lawyer') {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <Scale size={12} className="mr-1" />
        {translations.typeLawyer}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
      <Globe size={12} className="mr-1" />
      {translations.typeExpat}
    </span>
  );
};

// Status indicators for isSuspended, isBanned, isVisible
const ProviderStatusIndicators: React.FC<{ provider: Provider; translations: ProviderTranslations; locale: string }> = ({ provider, translations, locale }) => {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {provider.isSuspended && (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
          <Pause size={10} className="mr-1" />
          {translations.badgeSuspended}
          {provider.suspendedUntil && (
            <span className="ml-1 text-yellow-600">
              {translations.badgeSuspendedUntil.replace('{date}', new Date(provider.suspendedUntil.toDate()).toLocaleDateString(locale))}
            </span>
          )}
        </span>
      )}
      {provider.isBanned && (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">
          <Ban size={10} className="mr-1" />
          {translations.badgeBlocked}
        </span>
      )}
      {provider.isVisible === false && (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
          <EyeOff size={10} className="mr-1" />
          {translations.badgeHidden}
        </span>
      )}
      {provider.isDeleted && (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-200 text-red-900 border border-red-300">
          <Trash2 size={10} className="mr-1" />
          {translations.badgeDeleted}
        </span>
      )}
    </div>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  color: string;
  subtitle?: string;
  isLive?: boolean;
  liveLabel?: string;
  vsYesterdayLabel?: string;
}> = ({ title, value, change, icon: Icon, color, subtitle, isLive, liveLabel = 'LIVE', vsYesterdayLabel = 'vs yesterday' }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative overflow-hidden">
    {isLive && (
      <div className="absolute top-2 right-2 flex items-center">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
        <span className="text-xs text-green-600 font-medium">{liveLabel}</span>
      </div>
    )}
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        {change !== undefined && (
          <div className="flex items-center mt-2">
            {change > 0 ? (
              <ArrowUp className="text-green-500" size={14} />
            ) : change < 0 ? (
              <ArrowDown className="text-red-500" size={14} />
            ) : (
              <Minus className="text-gray-400" size={14} />
            )}
            <span className={`text-sm ml-1 ${
              change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'
            }`}>
              {Math.abs(change)}% {vsYesterdayLabel}
            </span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
  </div>
);

// ============ MODALS ============

// Bulk Action Confirmation Modal
const BulkActionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  actionType: BulkActionType;
  selectedCount: number;
  onConfirm: (reason?: string) => void;
  isLoading: boolean;
  translations: ModalTranslations;
}> = ({ isOpen, onClose, actionType, selectedCount, onConfirm, isLoading, translations }) => {
  const [reason, setReason] = useState('');

  const getActionConfig = () => ({
    hide: {
      title: translations.hideTitle,
      description: translations.confirmHide.replace('{count}', String(selectedCount)),
      confirmText: translations.bulkHide,
      color: 'bg-gray-600 hover:bg-gray-700',
      requiresReason: false,
    },
    block: {
      title: translations.blockTitle,
      description: translations.confirmBlock.replace('{count}', String(selectedCount)),
      confirmText: translations.bulkBlock,
      color: 'bg-red-600 hover:bg-red-700',
      requiresReason: true,
    },
    suspend: {
      title: translations.suspendTitle,
      description: translations.confirmSuspend.replace('{count}', String(selectedCount)),
      confirmText: translations.bulkSuspend,
      color: 'bg-yellow-600 hover:bg-yellow-700',
      requiresReason: true,
    },
    delete: {
      title: translations.deleteTitle,
      description: translations.confirmDelete.replace('{count}', String(selectedCount)),
      confirmText: translations.bulkDelete,
      color: 'bg-red-700 hover:bg-red-800',
      requiresReason: false,
    },
  });

  const config = getActionConfig()[actionType];

  const handleConfirm = () => {
    if (config.requiresReason && !reason.trim()) {
      toast.error(translations.toastReasonRequired);
      return;
    }
    onConfirm(reason || undefined);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={config.title} size="small">
      <div className="space-y-4">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="text-yellow-600 mr-3 flex-shrink-0" size={20} />
            <p className="text-sm text-yellow-800">{config.description}</p>
          </div>
        </div>

        {config.requiresReason && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {translations.reasonRequired}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              rows={3}
              placeholder={translations.reasonPlaceholder}
            />
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {translations.cancel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || (config.requiresReason && !reason.trim())}
            className={`px-4 py-2 text-white rounded-md disabled:opacity-50 flex items-center ${config.color}`}
          >
            {isLoading && (
              <RefreshCw size={16} className="mr-2 animate-spin" />
            )}
            {config.confirmText} ({selectedCount})
          </button>
        </div>
      </div>
    </Modal>
  );
};

// Suspend Modal (for individual suspend)
const SuspendModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  provider: Provider | null;
  onConfirm: (reason: string, until?: string) => void;
  isLoading: boolean;
  translations: ModalTranslations;
}> = ({ isOpen, onClose, provider, onConfirm, isLoading, translations }) => {
  const [reason, setReason] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) {
      toast.error(translations.toastReasonRequired);
      return;
    }
    onConfirm(reason, hasEndDate ? endDate : undefined);
  };

  const providerName = provider?.displayName || provider?.email || '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={translations.suspendTitle} size="medium">
      <div className="space-y-4">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <Pause className="text-yellow-600 mr-3 flex-shrink-0" size={20} />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                {providerName}
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                {translations.suspendWarning}
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {translations.suspendReason}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            rows={3}
            placeholder={translations.suspendReasonPlaceholder}
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="hasEndDate"
            checked={hasEndDate}
            onChange={(e) => setHasEndDate(e.target.checked)}
            className="rounded border-gray-300"
          />
          <label htmlFor="hasEndDate" className="text-sm text-gray-700">
            {translations.suspendSetEndDate}
          </label>
        </div>

        {hasEndDate && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {translations.suspendEndDate}
            </label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {translations.cancel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim()}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 flex items-center"
          >
            {isLoading && <RefreshCw size={16} className="mr-2 animate-spin" />}
            {translations.bulkSuspend}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// Delete Confirm Modal (with type to confirm)
const DeleteConfirmModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  provider: Provider | null;
  onConfirm: () => void;
  isLoading: boolean;
  isHardDelete?: boolean;
  translations: ModalTranslations;
}> = ({ isOpen, onClose, provider, onConfirm, isLoading, isHardDelete = false, translations }) => {
  const [confirmText, setConfirmText] = useState('');

  const providerName = provider?.displayName || provider?.email || '';
  const expectedText = isHardDelete ? translations.deleteHardConfirmText : translations.deleteConfirmText;

  const handleConfirm = () => {
    if (confirmText !== expectedText) {
      toast.error(translations.deleteTypeToConfirm.replace('{text}', expectedText));
      return;
    }
    onConfirm();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isHardDelete ? translations.deleteHardTitle : translations.deleteTitle} size="medium">
      <div className="space-y-4">
        <div className={`p-4 ${isHardDelete ? 'bg-red-100' : 'bg-red-50'} border border-red-200 rounded-lg`}>
          <div className="flex items-start">
            <AlertTriangle className="text-red-600 mr-3 flex-shrink-0" size={20} />
            <div>
              <p className="text-sm font-medium text-red-800">
                {isHardDelete
                  ? translations.deleteHardWarning
                  : translations.deleteSoftWarning.replace('{name}', providerName)
                }
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {translations.deleteTypeToConfirm.replace('{text}', '')} <span className="font-bold text-red-600">{expectedText}</span>
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            placeholder={expectedText}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {translations.cancel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || confirmText !== expectedText}
            className={`px-4 py-2 text-white rounded-md disabled:opacity-50 flex items-center ${
              isHardDelete ? 'bg-red-700 hover:bg-red-800' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isLoading && <RefreshCw size={16} className="mr-2 animate-spin" />}
            <Trash2 size={16} className="mr-2" />
            {translations.bulkDelete}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// Block Reason Modal
const BlockReasonModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  provider: Provider | null;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
  translations: ModalTranslations;
}> = ({ isOpen, onClose, provider, onConfirm, isLoading, translations }) => {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) {
      toast.error(translations.toastReasonRequired);
      return;
    }
    onConfirm(reason);
  };

  const providerName = provider?.displayName || provider?.email || '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={translations.blockTitle} size="medium">
      <div className="space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <Ban className="text-red-600 mr-3 flex-shrink-0" size={20} />
            <div>
              <p className="text-sm font-medium text-red-800">
                {providerName}
              </p>
              <p className="text-xs text-red-700 mt-1">
                {translations.blockWarning}
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {translations.blockReason}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            rows={3}
            placeholder={translations.blockReasonPlaceholder}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {translations.cancel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim()}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
          >
            {isLoading && <RefreshCw size={16} className="mr-2 animate-spin" />}
            <Ban size={16} className="mr-2" />
            {translations.bulkBlock}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ============ COMPOSANT PRINCIPAL ============
const AdminProviders: React.FC = () => {
  const navigate = useNavigate();
  const intl = useIntl();
  const t = (id: string, values?: Record<string, any>) => intl.formatMessage({ id }, values);
  const { user: currentUser } = useAuth();
  const mountedRef = useRef<boolean>(true);
  const locale = intl.locale;

  // Translation objects for sub-components
  const providerTranslations: ProviderTranslations = useMemo(() => ({
    statusOffline: t('admin.providers.status.offline'),
    statusBusy: t('admin.providers.status.busy'),
    statusOnline: t('admin.providers.status.online'),
    typeLawyer: t('admin.providers.type.lawyer'),
    typeExpat: t('admin.providers.type.expat'),
    badgeSuspended: t('admin.providers.statusBadge.suspended'),
    badgeSuspendedUntil: t('admin.providers.statusBadge.suspendedUntil'),
    badgeBlocked: t('admin.providers.statusBadge.blocked'),
    badgeHidden: t('admin.providers.statusBadge.hidden'),
    badgeDeleted: t('admin.providers.statusBadge.deleted'),
    liveIndicator: t('admin.providers.liveIndicator'),
    vsYesterday: t('admin.providers.comparison.vsYesterday'),
  }), [t]);

  const modalTranslations: ModalTranslations = useMemo(() => ({
    hideTitle: t('admin.providers.modal.hideTitle'),
    blockTitle: t('admin.providers.modal.blockTitle'),
    suspendTitle: t('admin.providers.suspend.title'),
    deleteTitle: t('admin.providers.modal.deleteTitle'),
    confirmHide: t('admin.providers.bulkActions.confirmHide'),
    confirmBlock: t('admin.providers.bulkActions.confirmBlock'),
    confirmSuspend: t('admin.providers.bulkActions.confirmSuspend'),
    confirmDelete: t('admin.providers.bulkActions.confirmDelete'),
    reasonRequired: t('admin.providers.modal.reasonRequired'),
    reasonPlaceholder: t('admin.providers.modal.reasonPlaceholder'),
    cancel: t('admin.providers.modal.cancel'),
    confirm: t('admin.providers.modal.confirm'),
    bulkHide: t('admin.providers.bulkActions.hide'),
    bulkBlock: t('admin.providers.bulkActions.block'),
    bulkSuspend: t('admin.providers.bulkActions.suspend'),
    bulkDelete: t('admin.providers.bulkActions.delete'),
    toastReasonRequired: t('admin.providers.toast.reasonRequired'),
    suspendReason: t('admin.providers.suspend.reason'),
    suspendReasonPlaceholder: t('admin.providers.suspend.reasonPlaceholder'),
    suspendSetEndDate: t('admin.providers.suspend.setEndDate'),
    suspendEndDate: t('admin.providers.suspend.endDate'),
    suspendWarning: t('admin.providers.suspend.warning'),
    deleteHardTitle: t('admin.providers.actions.deleteGdpr'),
    deleteHardWarning: t('admin.providers.toast.error'),
    deleteSoftWarning: t('admin.providers.bulkActions.confirmDelete'),
    deleteTypeToConfirm: t('admin.providers.modal.confirm'),
    deleteConfirmText: t('admin.providers.bulkActions.delete').toUpperCase(),
    deleteHardConfirmText: t('admin.providers.actions.deleteGdpr').toUpperCase(),
    blockReason: t('admin.providers.modal.reasonRequired'),
    blockReasonPlaceholder: t('admin.providers.modal.reasonPlaceholder'),
    blockWarning: t('admin.providers.bulkActions.confirmBlock').replace('{count}', '1'),
  }), [t]);

  // States des donnees
  const [providers, setProviders] = useState<Provider[]>([]);
  const [stats, setStats] = useState<ProviderStats | null>(null);
  const [alerts, setAlerts] = useState<ProviderAlert[]>([]);
  const [todayCallsStats, setTodayCallsStats] = useState({ totalCallsToday: 0, totalRevenueToday: 0 });
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  // Multi-select states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showGdprPurgeModal, setShowGdprPurgeModal] = useState(false);
  const [gdprPurgeProvider, setGdprPurgeProvider] = useState<Provider | null>(null);
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<BulkActionType>('hide');
  const [isActionLoading, setIsActionLoading] = useState(false);

  // States UI
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    isRealtimeActive: isRealTimeActive,
    isSuspendedDueToInactivity,
    resumeRealtime,
    suspendRealtime,
    timeUntilSuspend,
  } = useAutoSuspendRealtime({
    inactivityDelay: 5 * 60 * 1000,
    enabled: true,
  });

  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    approval: 'all',
    visibility: 'all',
    country: 'all',
  });
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'lastActivity' | 'rating'>('status');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Formatters
  const formatDateTime = (timestamp: Timestamp | Date | undefined) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatRelativeTime = (timestamp: Timestamp | Date | undefined) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'A l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return `Il y a ${diffDays}j`;
  };

  // Cloud Function calls
  const callHideProvider = httpsCallable<{ providerId: string }, ProviderActionResult>(functions, 'hideProvider');
  const callUnhideProvider = httpsCallable<{ providerId: string }, ProviderActionResult>(functions, 'unhideProvider');
  const callBlockProvider = httpsCallable<{ providerId: string; reason: string }, ProviderActionResult>(functions, 'blockProvider');
  const callUnblockProvider = httpsCallable<{ providerId: string }, ProviderActionResult>(functions, 'unblockProvider');
  const callSuspendProvider = httpsCallable<{ providerId: string; reason: string; until?: string }, ProviderActionResult>(functions, 'suspendProvider');
  const callUnsuspendProvider = httpsCallable<{ providerId: string }, ProviderActionResult>(functions, 'unsuspendProvider');
  const callSoftDeleteProvider = httpsCallable<{ providerId: string; reason?: string }, ProviderActionResult>(functions, 'softDeleteProvider');
  const callBulkHideProviders = httpsCallable<{ providerIds: string[] }, BulkActionResult>(functions, 'bulkHideProviders');
  const callBulkBlockProviders = httpsCallable<{ providerIds: string[]; reason: string }, BulkActionResult>(functions, 'bulkBlockProviders');
  const callBulkSuspendProviders = httpsCallable<{ providerIds: string[]; reason: string; until?: string }, BulkActionResult>(functions, 'bulkSuspendProviders');
  const callBulkDeleteProviders = httpsCallable<{ providerIds: string[]; reason?: string }, BulkActionResult>(functions, 'bulkDeleteProviders');

  // Charger les stats d'appels d'aujourd'hui
  const loadTodayCallsStats = useCallback(async () => {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const callsQuery = query(
        collection(db, 'call_sessions'),
        where('startTime', '>=', Timestamp.fromDate(startOfToday)),
        where('payment.status', '==', 'captured')
      );

      const snapshot = await getDocs(callsQuery);
      let totalCalls = 0;
      let totalRevenue = 0;

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (!data._placeholder) {
          totalCalls++;
          const amount = data.payment?.amount || data.totalAmount || 0;
          totalRevenue += Number(amount);
        }
      });

      return { totalCallsToday: totalCalls, totalRevenueToday: totalRevenue };
    } catch (error) {
      console.error('[AdminProviders] Error loading today calls stats:', error);
      try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const callsQuery = query(
          collection(db, 'call_sessions'),
          where('startTime', '>=', Timestamp.fromDate(startOfToday))
        );

        const snapshot = await getDocs(callsQuery);
        let totalCalls = 0;
        let totalRevenue = 0;

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (!data._placeholder && data.payment?.status === 'captured') {
            totalCalls++;
            const amount = data.payment?.amount || data.totalAmount || 0;
            totalRevenue += Number(amount);
          }
        });

        return { totalCallsToday: totalCalls, totalRevenueToday: totalRevenue };
      } catch (fallbackError) {
        console.error('[AdminProviders] Fallback also failed:', fallbackError);
        return { totalCallsToday: 0, totalRevenueToday: 0 };
      }
    }
  }, []);

  // Generer des alertes basees sur les donnees
  const generateAlerts = useCallback((providersList: Provider[]) => {
    const newAlerts: ProviderAlert[] = [];
    const now = Date.now();

    providersList.forEach((provider) => {
      if (provider.isOnline && provider.lastActivity) {
        const lastActivityTime = provider.lastActivity.toDate().getTime();
        const inactivityMs = now - lastActivityTime;
        const inactivityHours = inactivityMs / 3600000;

        if (inactivityHours > 1) {
          newAlerts.push({
            id: `inactive_${provider.id}`,
            providerId: provider.id,
            providerName: provider.displayName || provider.email,
            type: 'inactive_long',
            severity: inactivityHours > 2 ? 'high' : 'medium',
            message: `En ligne mais inactif depuis ${Math.floor(inactivityHours)}h`,
            timestamp: new Date(),
          });
        }
      }

      if (provider.responseRate !== undefined && provider.responseRate < 50 && provider.totalCalls && provider.totalCalls > 5) {
        newAlerts.push({
          id: `response_${provider.id}`,
          providerId: provider.id,
          providerName: provider.displayName || provider.email,
          type: 'low_response_rate',
          severity: provider.responseRate < 30 ? 'high' : 'medium',
          message: `Taux de reponse faible: ${provider.responseRate.toFixed(0)}%`,
          timestamp: new Date(),
        });
      }

      if (provider.isApproved && !provider.stripeOnboardingComplete && !provider.paypalOnboardingComplete) {
        newAlerts.push({
          id: `kyc_${provider.id}`,
          providerId: provider.id,
          providerName: provider.displayName || provider.email,
          type: 'kyc_incomplete',
          severity: 'high',
          message: 'KYC/Paiement non configure',
          timestamp: new Date(),
        });
      }
    });

    setAlerts(newAlerts.slice(0, 20));
  }, []);

  // Charger les prestataires
  const loadProviders = useCallback(async (showRefreshIndicator = false) => {
    if (!currentUser) return;

    if (showRefreshIndicator) {
      setIsRefreshing(true);
    }

    try {
      const providersQuery = query(
        collection(db, 'sos_profiles'),
        where('type', 'in', ['lawyer', 'expat']),
        orderBy('lastActivity', 'desc'),
        limit(200)
      );

      const snapshot = await getDocs(providersQuery);

      if (!mountedRef.current) return;

      const providersList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Provider));

      setProviders(providersList);
      setLastRefreshTime(new Date());
      setIsLoading(false);

      // Calculer les stats
      const onlineCount = providersList.filter(p => p.isOnline && p.availability === 'available').length;
      const busyCount = providersList.filter(p => p.isOnline && p.availability === 'busy').length;
      const offlineCount = providersList.filter(p => !p.isOnline || p.availability === 'offline').length;
      const approvedCount = providersList.filter(p => p.isApproved).length;
      const pendingCount = providersList.filter(p => !p.isApproved && p.approvalStatus === 'pending').length;
      const lawyersCount = providersList.filter(p => p.type === 'lawyer').length;
      const expatsCount = providersList.filter(p => p.type === 'expat').length;

      const ratingsSum = providersList
        .filter(p => p.rating !== undefined)
        .reduce((sum, p) => sum + (p.rating || 0), 0);
      const ratingsCount = providersList.filter(p => p.rating !== undefined).length;
      const averageRating = ratingsCount > 0 ? ratingsSum / ratingsCount : 0;

      setStats({
        totalProviders: providersList.length,
        onlineNow: onlineCount,
        busyNow: busyCount,
        offlineNow: offlineCount,
        approvedProviders: approvedCount,
        pendingApproval: pendingCount,
        lawyersCount,
        expatsCount,
        averageRating,
        totalCallsToday: todayCallsStats.totalCallsToday,
        totalRevenueToday: todayCallsStats.totalRevenueToday,
      });

      generateAlerts(providersList);
    } catch (error) {
      if (!mountedRef.current) return;
      console.error('Erreur lors du chargement des prestataires:', error);
      logError({
        origin: 'frontend',
        error: `Erreur chargement prestataires: ${(error as Error).message}`,
        context: { component: 'AdminProviders' },
      });
      setIsLoading(false);
    } finally {
      if (showRefreshIndicator) {
        setIsRefreshing(false);
      }
    }
  }, [currentUser, todayCallsStats, generateAlerts]);

  // Chargement initial uniquement (bouton manuel pour actualiser)
  // ÉCONOMIE: Suppression du setInterval automatique (30s)
  // Avant: 2,880 requêtes/jour - Après: ~50-100 requêtes/jour (manuel)
  // Économie estimée: ~200€/mois sur Firestore
  useEffect(() => {
    if (!currentUser) return;

    mountedRef.current = true;

    // Chargement initial une seule fois
    loadProviders();

    // NOTE: Le rafraîchissement automatique a été SUPPRIMÉ pour économiser les coûts Firestore
    // L'admin peut utiliser le bouton "Actualiser" manuellement quand nécessaire

    return () => {
      mountedRef.current = false;
    };
  }, [currentUser, loadProviders]);

  // Charger les stats d'appels (chargement initial + lors de loadProviders)
  // ÉCONOMIE: Suppression du setInterval automatique (60s)
  // Les stats sont rechargées quand l'admin clique sur "Actualiser"
  useEffect(() => {
    if (!currentUser) return;

    // Chargement initial une seule fois
    loadTodayCallsStats().then(stats => {
      if (mountedRef.current) {
        setTodayCallsStats(stats);
      }
    });

    // NOTE: Le rafraîchissement automatique a été SUPPRIMÉ pour économiser les coûts Firestore
  }, [currentUser, loadTodayCallsStats]);

  // Filtrage et tri des prestataires
  const filteredProviders = useMemo(() => {
    let result = providers.filter((provider) => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          provider.email?.toLowerCase().includes(search) ||
          provider.displayName?.toLowerCase().includes(search) ||
          provider.firstName?.toLowerCase().includes(search) ||
          provider.lastName?.toLowerCase().includes(search) ||
          provider.phone?.includes(search) ||
          provider.country?.toLowerCase().includes(search) ||
          provider.city?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      if (filters.status !== 'all') {
        if (filters.status === 'online' && (!provider.isOnline || provider.availability !== 'available')) return false;
        if (filters.status === 'busy' && (!provider.isOnline || provider.availability !== 'busy')) return false;
        if (filters.status === 'offline' && (provider.isOnline && provider.availability !== 'offline')) return false;
        if (filters.status === 'suspended' && !provider.isSuspended) return false;
        if (filters.status === 'banned' && !provider.isBanned) return false;
      }

      if (filters.type !== 'all' && provider.type !== filters.type) return false;

      if (filters.approval !== 'all') {
        if (filters.approval === 'approved' && !provider.isApproved) return false;
        if (filters.approval === 'pending' && (provider.isApproved || provider.approvalStatus !== 'pending')) return false;
        if (filters.approval === 'rejected' && provider.approvalStatus !== 'rejected') return false;
      }

      if (filters.visibility !== 'all') {
        if (filters.visibility === 'visible' && provider.isVisible === false) return false;
        if (filters.visibility === 'hidden' && provider.isVisible !== false) return false;
      }

      return true;
    });

    result.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = (a.displayName || a.email).localeCompare(b.displayName || b.email);
          break;
        case 'status':
          const statusOrder = { available: 3, busy: 2, offline: 1 };
          const aStatus = a.isOnline ? (statusOrder[a.availability] || 1) : 0;
          const bStatus = b.isOnline ? (statusOrder[b.availability] || 1) : 0;
          comparison = bStatus - aStatus;
          break;
        case 'lastActivity':
          const aTime = a.lastActivity?.toDate().getTime() || 0;
          const bTime = b.lastActivity?.toDate().getTime() || 0;
          comparison = bTime - aTime;
          break;
        case 'rating':
          comparison = (b.rating || 0) - (a.rating || 0);
          break;
      }

      return sortOrder === 'desc' ? comparison : -comparison;
    });

    return result;
  }, [providers, searchTerm, filters, sortBy, sortOrder]);

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set());
      setIsAllSelected(false);
    } else {
      setSelectedIds(new Set(filteredProviders.map(p => p.id)));
      setIsAllSelected(true);
    }
  }, [isAllSelected, filteredProviders]);

  const handleSelectOne = useCallback((providerId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(providerId)) {
        newSet.delete(providerId);
      } else {
        newSet.add(providerId);
      }
      return newSet;
    });
  }, []);

  // Update isAllSelected when selection changes
  useEffect(() => {
    setIsAllSelected(
      filteredProviders.length > 0 &&
      filteredProviders.every(p => selectedIds.has(p.id))
    );
  }, [selectedIds, filteredProviders]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
    setIsAllSelected(false);
  }, [filters, searchTerm]);

  // Individual action handlers
  const handleHideProvider = useCallback(async (provider: Provider) => {
    setIsActionLoading(true);
    try {
      if (provider.isVisible === false) {
        await callUnhideProvider({ providerId: provider.id });
        toast.success(`${provider.displayName || provider.email} est maintenant visible`);
      } else {
        await callHideProvider({ providerId: provider.id });
        toast.success(`${provider.displayName || provider.email} a ete masque`);
      }
      loadProviders(true);
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error('Erreur lors du changement de visibilite');
    } finally {
      setIsActionLoading(false);
    }
  }, [callHideProvider, callUnhideProvider, loadProviders]);

  const handleBlockProvider = useCallback(async (reason: string) => {
    if (!selectedProvider) return;
    setIsActionLoading(true);
    try {
      if (selectedProvider.isBanned) {
        await callUnblockProvider({ providerId: selectedProvider.id });
        toast.success(`${selectedProvider.displayName || selectedProvider.email} a ete debloque`);
      } else {
        await callBlockProvider({ providerId: selectedProvider.id, reason });
        toast.success(`${selectedProvider.displayName || selectedProvider.email} a ete bloque`);
      }
      setShowBlockModal(false);
      loadProviders(true);
    } catch (error) {
      console.error('Error toggling block:', error);
      toast.error('Erreur lors du blocage/deblocage');
    } finally {
      setIsActionLoading(false);
    }
  }, [selectedProvider, callBlockProvider, callUnblockProvider, loadProviders]);

  const handleSuspendProvider = useCallback(async (reason: string, until?: string) => {
    if (!selectedProvider) return;
    setIsActionLoading(true);
    try {
      if (selectedProvider.isSuspended) {
        await callUnsuspendProvider({ providerId: selectedProvider.id });
        toast.success(`${selectedProvider.displayName || selectedProvider.email} n'est plus suspendu`);
      } else {
        await callSuspendProvider({
          providerId: selectedProvider.id,
          reason,
          until: until || undefined
        });
        toast.success(`${selectedProvider.displayName || selectedProvider.email} a ete suspendu`);
      }
      setShowSuspendModal(false);
      loadProviders(true);
    } catch (error) {
      console.error('Error toggling suspend:', error);
      toast.error('Erreur lors de la suspension');
    } finally {
      setIsActionLoading(false);
    }
  }, [selectedProvider, callSuspendProvider, callUnsuspendProvider, loadProviders]);

  const handleDeleteProviderConfirmed = useCallback(async () => {
    if (!selectedProvider) return;
    setIsActionLoading(true);
    try {
      await callSoftDeleteProvider({ providerId: selectedProvider.id });
      toast.success(`${selectedProvider.displayName || selectedProvider.email} a ete supprime`);
      setShowDeleteModal(false);
      loadProviders(true);
    } catch (error) {
      console.error('Error deleting provider:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsActionLoading(false);
    }
  }, [selectedProvider, callSoftDeleteProvider, loadProviders]);

  // Bulk action handlers
  const handleBulkAction = useCallback(async (reason?: string) => {
    const providerIds = Array.from(selectedIds);
    if (providerIds.length === 0) return;

    setIsActionLoading(true);
    try {
      let result: BulkActionResult;

      switch (bulkActionType) {
        case 'hide':
          result = (await callBulkHideProviders({ providerIds })).data;
          break;
        case 'block':
          result = (await callBulkBlockProviders({ providerIds, reason: reason || 'Action admin en masse' })).data;
          break;
        case 'suspend':
          result = (await callBulkSuspendProviders({ providerIds, reason: reason || 'Suspension en masse' })).data;
          break;
        case 'delete':
          result = (await callBulkDeleteProviders({ providerIds, reason })).data;
          break;
      }

      if (result.success) {
        toast.success(`${result.successful} prestataire(s) traite(s) avec succes`);
      } else {
        toast.warning(`${result.successful} reussi(s), ${result.failed} echec(s)`);
      }

      setShowBulkActionModal(false);
      setSelectedIds(new Set());
      loadProviders(true);
    } catch (error) {
      console.error('Error in bulk action:', error);
      toast.error('Erreur lors de l\'action en masse');
    } finally {
      setIsActionLoading(false);
    }
  }, [
    selectedIds,
    bulkActionType,
    callBulkHideProviders,
    callBulkBlockProviders,
    callBulkSuspendProviders,
    callBulkDeleteProviders,
    loadProviders
  ]);

  const openBulkActionModal = (actionType: BulkActionType) => {
    setBulkActionType(actionType);
    setShowBulkActionModal(true);
  };

  // View details handler
  const handleViewDetails = useCallback((provider: Provider) => {
    setSelectedProvider(provider);
    setShowDetailModal(true);
  }, []);

  // GDPR Purge handlers
  const handleGdprPurge = useCallback((provider: Provider) => {
    const confirmMessage = `ATTENTION - SUPPRESSION RGPD DEFINITIVE\n\nVous etes sur le point de lancer la procedure de suppression RGPD pour "${provider.displayName || provider.email}".\n\nCette action est IRREVERSIBLE et supprimera definitivement toutes les donnees.\n\nContinuer ?`;

    if (!confirm(confirmMessage)) return;

    setGdprPurgeProvider(provider);
    setShowGdprPurgeModal(true);
  }, []);

  const handleGdprPurgeSuccess = useCallback((providerId: string) => {
    setProviders((prev) => prev.filter((p) => p.id !== providerId));
    setShowDetailModal(false);
    setSelectedProvider(null);
    toast.success('Purge RGPD effectuee avec succes');
  }, []);

  // Export CSV
  const handleExportCSV = useCallback(() => {
    const headers = [
      'ID',
      'Email',
      'Nom',
      'Type',
      'Statut',
      'En ligne',
      'Visible',
      'Suspendu',
      'Bloque',
      'Pays',
      'Ville',
      'Note',
      'Appels totaux',
      'Taux de reponse',
      'Derniere activite',
    ];

    const rows = filteredProviders.map((p) => [
      p.id,
      p.email,
      p.displayName || `${p.firstName || ''} ${p.lastName || ''}`.trim(),
      p.type,
      p.availability,
      p.isOnline ? 'Oui' : 'Non',
      p.isVisible === false ? 'Non' : 'Oui',
      p.isSuspended ? 'Oui' : 'Non',
      p.isBanned ? 'Oui' : 'Non',
      p.country || '',
      p.city || '',
      p.rating?.toFixed(1) || '',
      p.totalCalls || 0,
      p.responseRate ? `${p.responseRate.toFixed(0)}%` : '',
      p.lastActivity ? formatDateTime(p.lastActivity) : '',
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prestataires_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredProviders]);

  // Forcer un prestataire hors ligne
  const handleForceOffline = useCallback(async (providerId: string) => {
    if (!confirm('Voulez-vous vraiment mettre ce prestataire hors ligne ?')) return;

    try {
      await runTransaction(db, async (transaction) => {
        const providerRef = doc(db, 'sos_profiles', providerId);
        const userRef = doc(db, 'users', providerId);

        const updateData = {
          isOnline: false,
          availability: 'offline',
          lastStatusChange: Timestamp.now(),
        };

        transaction.update(providerRef, updateData);
        transaction.update(userRef, updateData);
      });

      toast.success('Prestataire mis hors ligne');
      loadProviders(true);
    } catch (error) {
      console.error('Erreur lors de la mise hors ligne:', error);
      toast.error('Erreur lors de la mise hors ligne du prestataire');
    }
  }, [loadProviders]);

  // Approuver un prestataire
  const handleApproveProvider = useCallback(async (providerId: string) => {
    if (!confirm('Voulez-vous approuver ce prestataire ?')) return;

    try {
      await runTransaction(db, async (transaction) => {
        const providerRef = doc(db, 'sos_profiles', providerId);
        const userRef = doc(db, 'users', providerId);

        const updateData = {
          isApproved: true,
          validationStatus: 'approved',
          approvalStatus: 'approved',
          updatedAt: Timestamp.now(),
        };

        transaction.update(providerRef, updateData);
        transaction.update(userRef, updateData);
      });

      toast.success('Prestataire approuve avec succes');
      loadProviders(true);
    } catch (error) {
      console.error('Erreur lors de l\'approbation:', error);
      toast.error('Erreur lors de l\'approbation du prestataire');
    }
  }, [loadProviders]);

  // Rejeter un prestataire
  const handleRejectProvider = useCallback(async (providerId: string) => {
    if (!confirm('Voulez-vous rejeter ce prestataire ?')) return;

    try {
      await runTransaction(db, async (transaction) => {
        const providerRef = doc(db, 'sos_profiles', providerId);
        const userRef = doc(db, 'users', providerId);

        const updateData = {
          isApproved: false,
          validationStatus: 'rejected',
          approvalStatus: 'rejected',
          updatedAt: Timestamp.now(),
        };

        transaction.update(providerRef, updateData);
        transaction.update(userRef, updateData);
      });

      toast.success('Prestataire rejete');
      loadProviders(true);
    } catch (error) {
      console.error('Erreur lors du rejet:', error);
      toast.error('Erreur lors du rejet du prestataire');
    }
  }, [loadProviders]);

  // Verifier si l'utilisateur a la permission de purge GDPR
  const canPerformGdprPurge = useMemo(() => {
    return currentUser?.role === 'admin';
  }, [currentUser]);

  const unreadAlertsCount = alerts.length;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('admin.providers.loading')}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <ErrorBoundary
        fallback={
          <div className="p-8 text-center">
            {t('admin.providers.toast.error')}
          </div>
        }
      >
        <ToastContainer
          position="top-right"
          autoClose={4000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
        />

        {isSuspendedDueToInactivity && (
          <RealtimeSuspendedBanner onResume={resumeRealtime} reason="inactivity" />
        )}

        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <UserCheck className="mr-3 text-blue-600" size={28} />
                {t('admin.providers.title')}
                {isRealTimeActive && (
                  <div className="ml-3 flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-2"></div>
                    <span className="text-sm text-green-600 font-medium">{providerTranslations.liveIndicator}</span>
                  </div>
                )}
              </h1>
              <p className="text-gray-600 mt-1">
                {t('admin.providers.subtitle')}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowStatsModal(true)}
                className={`relative p-2 rounded-lg border transition-colors ${
                  unreadAlertsCount > 0
                    ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title="Alertes actives"
              >
                <Bell size={20} />
                {unreadAlertsCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
                  </span>
                )}
              </button>

              <div className="flex items-center space-x-2">
                <RealtimeCountdown seconds={timeUntilSuspend} isActive={isRealTimeActive} />
                <button
                  onClick={() => isRealTimeActive ? suspendRealtime() : resumeRealtime()}
                  className={`p-2 rounded-lg border transition-colors ${
                    isRealTimeActive
                      ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  title={isRealTimeActive ? 'Pause temps reel' : 'Activer temps reel'}
                >
                  <Activity size={20} />
                </button>
              </div>

              <button
                onClick={handleExportCSV}
                className="p-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                title="Exporter CSV"
              >
                <Download size={20} />
              </button>

              <button
                onClick={() => loadProviders(true)}
                disabled={isRefreshing}
                className={`p-2 border rounded-lg transition-colors flex items-center space-x-1 ${
                  isRefreshing
                    ? 'border-blue-300 bg-blue-50 text-blue-600'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title={lastRefreshTime ? `Derniere MAJ: ${lastRefreshTime.toLocaleTimeString('fr-FR')}` : 'Actualiser'}
              >
                <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
                {lastRefreshTime && (
                  <span className="text-xs hidden sm:inline">
                    {lastRefreshTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Bulk Action Toolbar */}
          {selectedIds.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
              <div className="flex items-center">
                <CheckSquare className="text-blue-600 mr-2" size={20} />
                <span className="font-medium text-blue-900">
                  {t('admin.providers.bulkActions.selected', { count: selectedIds.size })}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openBulkActionModal('hide')}
                  className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 flex items-center"
                >
                  <EyeOff size={14} className="mr-1" />
                  {t('admin.providers.bulkActions.hide')}
                </button>
                <button
                  onClick={() => openBulkActionModal('block')}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 flex items-center"
                >
                  <Ban size={14} className="mr-1" />
                  {t('admin.providers.bulkActions.block')}
                </button>
                <button
                  onClick={() => openBulkActionModal('suspend')}
                  className="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 flex items-center"
                >
                  <Pause size={14} className="mr-1" />
                  {t('admin.providers.bulkActions.suspend')}
                </button>
                <button
                  onClick={() => openBulkActionModal('delete')}
                  className="px-3 py-1.5 bg-red-700 text-white text-sm rounded-md hover:bg-red-800 flex items-center"
                >
                  <Trash2 size={14} className="mr-1" />
                  {t('admin.providers.bulkActions.delete')}
                </button>
                <button
                  onClick={() => {
                    setSelectedIds(new Set());
                    setIsAllSelected(false);
                  }}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50"
                >
                  {t('admin.providers.modal.cancel')}
                </button>
              </div>
            </div>
          )}

          {/* Metriques principales */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-8">
              <MetricCard
                title={t('admin.providers.stats.onlineNow')}
                value={stats.onlineNow}
                icon={Wifi}
                color="bg-green-500"
                subtitle={`${stats.totalProviders} ${t('admin.providers.stats.totalProviders').toLowerCase()}`}
                isLive
                liveLabel={providerTranslations.liveIndicator}
                vsYesterdayLabel={providerTranslations.vsYesterday}
              />
              <MetricCard
                title={t('admin.providers.stats.busyNow')}
                value={stats.busyNow}
                icon={Phone}
                color="bg-orange-500"
                isLive
                liveLabel={providerTranslations.liveIndicator}
                vsYesterdayLabel={providerTranslations.vsYesterday}
              />
              <MetricCard
                title={t('admin.providers.stats.offlineNow')}
                value={stats.offlineNow}
                icon={WifiOff}
                color="bg-gray-500"
                vsYesterdayLabel={providerTranslations.vsYesterday}
              />
              <MetricCard
                title={t('admin.providers.stats.lawyersCount')}
                value={stats.lawyersCount}
                icon={Scale}
                color="bg-blue-500"
                subtitle={`${providers.filter(p => p.type === 'lawyer' && p.isOnline).length} ${t('admin.providers.filters.online').toLowerCase()}`}
                vsYesterdayLabel={providerTranslations.vsYesterday}
              />
              <MetricCard
                title={t('admin.providers.stats.expatsCount')}
                value={stats.expatsCount}
                icon={Globe}
                color="bg-teal-500"
                subtitle={`${providers.filter(p => p.type === 'expat' && p.isOnline).length} ${t('admin.providers.filters.online').toLowerCase()}`}
                vsYesterdayLabel={providerTranslations.vsYesterday}
              />
            </div>
          )}

          {/* Barre de statistiques supplementaires */}
          {stats && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.approvedProviders}</div>
                  <div className="text-xs text-gray-500">{t('admin.providers.filters.approved')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{stats.pendingApproval}</div>
                  <div className="text-xs text-gray-500">{t('admin.providers.filters.pending')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500">{t('admin.providers.stats.averageRating')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {((stats.onlineNow / stats.totalProviders) * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500">{t('admin.providers.filters.online')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.totalCallsToday}</div>
                  <div className="text-xs text-gray-500">{t('admin.providers.stats.totalCallsToday')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.totalRevenueToday.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}EUR
                  </div>
                  <div className="text-xs text-gray-500">{t('admin.providers.stats.totalRevenueToday')}</div>
                </div>
              </div>
            </div>
          )}

          {/* Alertes actives */}
          {alerts.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <AlertTriangle className="mr-2 text-yellow-500" size={20} />
                {t('admin.providers.alerts.title')} ({alerts.length})
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      alert.severity === 'high'
                        ? 'bg-red-50 border-l-4 border-red-500'
                        : alert.severity === 'medium'
                        ? 'bg-yellow-50 border-l-4 border-yellow-500'
                        : 'bg-blue-50 border-l-4 border-blue-500'
                    }`}
                  >
                    <div>
                      <span className="font-medium text-gray-900">{alert.providerName}</span>
                      <span className="text-gray-600 ml-2">- {alert.message}</span>
                    </div>
                    <button
                      onClick={() => {
                        const provider = providers.find((p) => p.id === alert.providerId);
                        if (provider) handleViewDetails(provider);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filtres et recherche */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Filter size={16} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-700">{t('admin.providers.filters.title')}:</span>
              </div>

              <select
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
              >
                <option value="all">{t('admin.providers.filters.all')} {t('admin.providers.filters.status').toLowerCase()}</option>
                <option value="online">{t('admin.providers.filters.online')}</option>
                <option value="busy">{t('admin.providers.filters.busy')}</option>
                <option value="offline">{t('admin.providers.filters.offline')}</option>
                <option value="suspended">{t('admin.providers.filters.suspended')}</option>
                <option value="banned">{t('admin.providers.filters.blocked')}</option>
              </select>

              <select
                value={filters.type}
                onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
              >
                <option value="all">{t('admin.providers.filters.all')} {t('admin.providers.filters.type').toLowerCase()}</option>
                <option value="lawyer">{t('admin.providers.stats.lawyersCount')}</option>
                <option value="expat">{t('admin.providers.stats.expatsCount')}</option>
              </select>

              <select
                value={filters.approval}
                onChange={(e) => setFilters((prev) => ({ ...prev, approval: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
              >
                <option value="all">{t('admin.providers.filters.all')}</option>
                <option value="approved">{t('admin.providers.filters.approved')}</option>
                <option value="pending">{t('admin.providers.filters.pending')}</option>
                <option value="rejected">{t('admin.providers.filters.blocked')}</option>
              </select>

              <select
                value={filters.visibility}
                onChange={(e) => setFilters((prev) => ({ ...prev, visibility: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
              >
                <option value="all">{t('admin.providers.filters.all')}</option>
                <option value="visible">{t('admin.providers.actions.show')}</option>
                <option value="hidden">{t('admin.providers.filters.hidden')}</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
              >
                <option value="status">{t('admin.providers.table.status')}</option>
                <option value="name">{t('admin.providers.table.name')}</option>
                <option value="lastActivity">{t('admin.providers.table.lastActivity')}</option>
                <option value="rating">{t('admin.providers.table.rating')}</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {sortOrder === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
              </button>

              <div className="flex-1"></div>

              <div className="relative">
                <input
                  type="text"
                  placeholder={t('admin.providers.search.placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-4 py-1.5 border border-gray-300 rounded-md text-sm w-64"
                />
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              </div>

              <span className="text-sm text-gray-500">
                {filteredProviders.length} resultat(s)
              </span>
            </div>
          </div>

          {/* Liste des prestataires */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={handleSelectAll}
                        className="flex items-center text-gray-500 hover:text-gray-700"
                      >
                        {isAllSelected ? (
                          <CheckSquare size={18} className="text-blue-600" />
                        ) : selectedIds.size > 0 ? (
                          <MinusSquare size={18} className="text-blue-600" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.providers.table.name')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.providers.table.status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.providers.table.type')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.providers.table.country')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.providers.table.lastActivity')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.providers.table.rating')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.providers.table.calls')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.providers.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProviders.map((provider) => (
                    <tr key={provider.id} className={`hover:bg-gray-50 ${selectedIds.has(provider.id) ? 'bg-blue-50' : ''}`}>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleSelectOne(provider.id)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {selectedIds.has(provider.id) ? (
                            <CheckSquare size={18} className="text-blue-600" />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {provider.profilePhoto ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={provider.profilePhoto}
                                alt={`Photo de profil de ${provider.displayName || provider.firstName || 'prestataire'}`}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <Users className="h-5 w-5 text-gray-500" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {provider.displayName || `${provider.firstName || ''} ${provider.lastName || ''}`.trim() || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">{provider.email}</div>
                            <ProviderStatusIndicators provider={provider} translations={providerTranslations} locale={locale} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={provider.availability} isOnline={provider.isOnline} translations={providerTranslations} />
                        {provider.availability === 'busy' && provider.busySince && (
                          <div className="text-xs text-gray-500 mt-1">
                            depuis {formatRelativeTime(provider.busySince)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ProviderTypeBadge type={provider.type} translations={providerTranslations} />
                        {!provider.isApproved && (
                          <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                            {t('admin.providers.filters.pending')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <MapPin size={14} className="mr-1" />
                          {provider.city && provider.country
                            ? `${provider.city}, ${provider.country}`
                            : provider.country || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Clock size={14} className="mr-1" />
                          {formatRelativeTime(provider.lastActivity)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {provider.rating ? (
                          <div className="flex items-center">
                            <Star size={14} className="text-yellow-400 mr-1" />
                            <span className="text-sm font-medium">{provider.rating.toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {provider.totalCalls || 0}
                        {provider.responseRate !== undefined && (
                          <span className="text-xs text-gray-400 ml-1">
                            ({provider.responseRate.toFixed(0)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          {/* Hide/Unhide toggle */}
                          <button
                            onClick={() => handleHideProvider(provider)}
                            className={`p-1.5 rounded ${
                              provider.isVisible === false
                                ? 'text-green-600 hover:text-green-800 hover:bg-green-50'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                            title={provider.isVisible === false ? 'Afficher' : 'Masquer'}
                          >
                            {provider.isVisible === false ? <Eye size={16} /> : <EyeOff size={16} />}
                          </button>

                          {/* Block/Unblock toggle */}
                          <button
                            onClick={() => {
                              setSelectedProvider(provider);
                              if (provider.isBanned) {
                                callUnblockProvider({ providerId: provider.id })
                                  .then(() => {
                                    toast.success('Prestataire debloque');
                                    loadProviders(true);
                                  })
                                  .catch(() => toast.error('Erreur lors du deblocage'));
                              } else {
                                setShowBlockModal(true);
                              }
                            }}
                            className={`p-1.5 rounded ${
                              provider.isBanned
                                ? 'text-green-600 hover:text-green-800 hover:bg-green-50'
                                : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                            }`}
                            title={provider.isBanned ? 'Debloquer' : 'Bloquer'}
                          >
                            {provider.isBanned ? <Play size={16} /> : <Ban size={16} />}
                          </button>

                          {/* Suspend/Unsuspend toggle */}
                          <button
                            onClick={() => {
                              setSelectedProvider(provider);
                              if (provider.isSuspended) {
                                callUnsuspendProvider({ providerId: provider.id })
                                  .then(() => {
                                    toast.success('Suspension levee');
                                    loadProviders(true);
                                  })
                                  .catch(() => toast.error('Erreur lors de la levee de suspension'));
                              } else {
                                setShowSuspendModal(true);
                              }
                            }}
                            className={`p-1.5 rounded ${
                              provider.isSuspended
                                ? 'text-green-600 hover:text-green-800 hover:bg-green-50'
                                : 'text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50'
                            }`}
                            title={provider.isSuspended ? 'Lever la suspension' : 'Suspendre'}
                          >
                            {provider.isSuspended ? <Play size={16} /> : <Pause size={16} />}
                          </button>

                          {/* View details */}
                          <button
                            onClick={() => handleViewDetails(provider)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title="Voir details"
                          >
                            <Eye size={16} />
                          </button>

                          {/* Approve/Reject for non-approved */}
                          {!provider.isApproved && (
                            <>
                              <button
                                onClick={() => handleApproveProvider(provider.id)}
                                className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                                title="Approuver"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => handleRejectProvider(provider.id)}
                                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                title="Rejeter"
                              >
                                <X size={16} />
                              </button>
                            </>
                          )}

                          {/* Force offline if online */}
                          {provider.isOnline && (
                            <button
                              onClick={() => handleForceOffline(provider.id)}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                              title="Forcer hors ligne"
                            >
                              <WifiOff size={16} />
                            </button>
                          )}

                          {/* Settings */}
                          <button
                            onClick={() => navigate(`/admin/users?id=${provider.id}`)}
                            className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded"
                            title="Voir profil complet"
                          >
                            <Settings size={16} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              setSelectedProvider(provider);
                              setShowDeleteModal(true);
                            }}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                            title="Supprimer le prestataire"
                          >
                            <Trash2 size={16} />
                          </button>

                          {/* GDPR Purge */}
                          {canPerformGdprPurge && (
                            <button
                              onClick={() => handleGdprPurge(provider)}
                              className="p-1.5 text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded"
                              title="Purge RGPD (suppression definitive)"
                            >
                              <ShieldX size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredProviders.length === 0 && (
              <div className="p-12 text-center">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('admin.providers.empty.title')}</h3>
                <p className="text-gray-600">
                  {t('admin.providers.empty.message')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal details du prestataire */}
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title="Details du prestataire"
          size="large"
        >
          {selectedProvider && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {selectedProvider.profilePhoto ? (
                      <img
                        src={selectedProvider.profilePhoto}
                        alt={intl.formatMessage({ id: 'admin.common.profilePhotoOf' }, { name: selectedProvider.displayName || `${selectedProvider.firstName || ''} ${selectedProvider.lastName || ''}`.trim() || intl.formatMessage({ id: 'admin.common.professional' }) })}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Users className="h-8 w-8 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {selectedProvider.displayName ||
                        `${selectedProvider.firstName || ''} ${selectedProvider.lastName || ''}`.trim() ||
                        'N/A'}
                    </h3>
                    <p className="text-gray-500">{selectedProvider.email}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <StatusBadge status={selectedProvider.availability} isOnline={selectedProvider.isOnline} translations={providerTranslations} />
                      <ProviderTypeBadge type={selectedProvider.type} translations={providerTranslations} />
                    </div>
                    <ProviderStatusIndicators provider={selectedProvider} translations={providerTranslations} locale={locale} />
                  </div>
                </div>
                <div className="text-right">
                  {selectedProvider.rating && (
                    <div className="flex items-center justify-end mb-2">
                      <Star className="text-yellow-400 mr-1" size={20} />
                      <span className="text-2xl font-bold">{selectedProvider.rating.toFixed(1)}</span>
                    </div>
                  )}
                  <span
                    className={`px-3 py-1 text-sm rounded-full ${
                      selectedProvider.isApproved
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {selectedProvider.isApproved ? 'Approuve' : 'Non approuve'}
                  </span>
                </div>
              </div>

              {/* Suspension info if suspended */}
              {selectedProvider.isSuspended && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 flex items-center mb-2">
                    <Pause size={16} className="mr-2" />
                    Prestataire suspendu
                  </h4>
                  <div className="text-sm text-yellow-700 space-y-1">
                    {selectedProvider.suspendReason && (
                      <p><strong>Raison:</strong> {selectedProvider.suspendReason}</p>
                    )}
                    {selectedProvider.suspendedAt && (
                      <p><strong>Depuis:</strong> {formatDateTime(selectedProvider.suspendedAt)}</p>
                    )}
                    {selectedProvider.suspendedUntil && (
                      <p><strong>Jusqu'au:</strong> {formatDateTime(selectedProvider.suspendedUntil)}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Informations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Informations personnelles</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">ID:</span>
                      <span className="font-mono text-sm">{selectedProvider.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Telephone:</span>
                      <span>{selectedProvider.phone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pays:</span>
                      <span>{selectedProvider.country || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ville:</span>
                      <span>{selectedProvider.city || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Inscrit le:</span>
                      <span>{formatDateTime(selectedProvider.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Statistiques</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Appels totaux:</span>
                      <span className="font-medium">{selectedProvider.totalCalls || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Appels reussis:</span>
                      <span className="font-medium">{selectedProvider.successfulCalls || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Taux de reponse:</span>
                      <span className="font-medium">
                        {selectedProvider.responseRate !== undefined
                          ? `${selectedProvider.responseRate.toFixed(0)}%`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Revenus totaux:</span>
                      <span className="font-medium">
                        {selectedProvider.totalRevenue !== undefined
                          ? `${selectedProvider.totalRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}EUR`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duree moyenne:</span>
                      <span className="font-medium">
                        {selectedProvider.averageCallDuration !== undefined
                          ? `${Math.round(selectedProvider.averageCallDuration / 60)} min`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activite */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Activite</h4>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-gray-600 text-sm">Derniere activite:</span>
                    <div className="font-medium">{formatRelativeTime(selectedProvider.lastActivity)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">Dernier changement statut:</span>
                    <div className="font-medium">{formatRelativeTime(selectedProvider.lastStatusChange)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">Configuration paiement:</span>
                    <div className="font-medium space-y-1">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          selectedProvider.stripeOnboardingComplete
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {selectedProvider.stripeOnboardingComplete ? (
                            <><CheckCircle size={12} className="mr-1" /> Stripe OK</>
                          ) : (
                            <><XCircle size={12} className="mr-1" /> Stripe</>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          selectedProvider.paypalOnboardingComplete
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {selectedProvider.paypalOnboardingComplete ? (
                            <><CheckCircle size={12} className="mr-1" /> PayPal OK</>
                          ) : (
                            <><XCircle size={12} className="mr-1" /> PayPal</>
                          )}
                        </span>
                      </div>
                      {(selectedProvider.stripeOnboardingComplete || selectedProvider.paypalOnboardingComplete) && (
                        <div className="text-xs text-gray-500 mt-1">
                          Passerelle active: <strong>{selectedProvider.paymentGateway || 'Stripe'}</strong>
                        </div>
                      )}
                      {!selectedProvider.stripeOnboardingComplete && !selectedProvider.paypalOnboardingComplete && selectedProvider.isApproved && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                          <AlertTriangle size={12} className="inline mr-1" />
                          Prestataire approuve mais aucun paiement configure
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Langues et specialisations */}
              {(selectedProvider.languages?.length || selectedProvider.specializations?.length) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedProvider.languages?.length && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Langues</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedProvider.languages.map((lang) => (
                          <span key={lang} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedProvider.specializations?.length && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Specialisations</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedProvider.specializations.map((spec) => (
                          <span key={spec} className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Fermer
                </button>
                <div className="flex space-x-3">
                  {!selectedProvider.isApproved && (
                    <button
                      onClick={() => {
                        handleApproveProvider(selectedProvider.id);
                        setShowDetailModal(false);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                    >
                      <Check size={16} className="mr-2" />
                      Approuver
                    </button>
                  )}
                  {selectedProvider.isOnline && (
                    <button
                      onClick={() => {
                        handleForceOffline(selectedProvider.id);
                        setShowDetailModal(false);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                    >
                      <WifiOff size={16} className="mr-2" />
                      Forcer hors ligne
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/admin/users?id=${selectedProvider.id}`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                  >
                    <Settings size={16} className="mr-2" />
                    Voir profil complet
                  </button>
                  {canPerformGdprPurge && (
                    <button
                      onClick={() => handleGdprPurge(selectedProvider)}
                      className="px-4 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-800 flex items-center"
                    >
                      <ShieldX size={16} className="mr-2" />
                      Purge RGPD
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal statistiques et alertes */}
        <Modal
          isOpen={showStatsModal}
          onClose={() => setShowStatsModal(false)}
          title={t('admin.providers.alerts.title')}
          size="large"
        >
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.providers.alerts.title')} ({alerts.length})</h3>
              {alerts.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border-l-4 ${
                        alert.severity === 'high'
                          ? 'bg-red-50 border-red-500'
                          : alert.severity === 'medium'
                          ? 'bg-yellow-50 border-yellow-500'
                          : 'bg-blue-50 border-blue-500'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium text-gray-900">{alert.providerName}</span>
                          <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {t('admin.providers.filters.type')}: {alert.type.replace('_', ' ')}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const provider = providers.find((p) => p.id === alert.providerId);
                            if (provider) {
                              setShowStatsModal(false);
                              handleViewDetails(provider);
                            }
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-400 mb-4" />
                  <p>{t('admin.providers.empty.title')}</p>
                </div>
              )}
            </div>

            {stats && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.providers.stats.totalProviders')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-green-600">{stats.onlineNow}</div>
                    <div className="text-sm text-gray-600">{t('admin.providers.filters.online')}</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-orange-600">{stats.busyNow}</div>
                    <div className="text-sm text-gray-600">{t('admin.providers.filters.busy')}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-gray-600">{stats.offlineNow}</div>
                    <div className="text-sm text-gray-600">{t('admin.providers.filters.offline')}</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-blue-600">{stats.lawyersCount}</div>
                    <div className="text-sm text-gray-600">{t('admin.providers.stats.lawyersCount')}</div>
                  </div>
                  <div className="bg-teal-50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-teal-600">{stats.expatsCount}</div>
                    <div className="text-sm text-gray-600">{t('admin.providers.stats.expatsCount')}</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-yellow-600">{stats.pendingApproval}</div>
                    <div className="text-sm text-gray-600">{t('admin.providers.filters.pending')}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>

        {/* Bulk Action Modal */}
        <BulkActionModal
          isOpen={showBulkActionModal}
          onClose={() => setShowBulkActionModal(false)}
          actionType={bulkActionType}
          selectedCount={selectedIds.size}
          onConfirm={handleBulkAction}
          isLoading={isActionLoading}
          translations={modalTranslations}
        />

        {/* Suspend Modal */}
        <SuspendModal
          isOpen={showSuspendModal}
          onClose={() => setShowSuspendModal(false)}
          provider={selectedProvider}
          onConfirm={handleSuspendProvider}
          isLoading={isActionLoading}
          translations={modalTranslations}
        />

        {/* Delete Confirm Modal */}
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          provider={selectedProvider}
          onConfirm={handleDeleteProviderConfirmed}
          isLoading={isActionLoading}
          translations={modalTranslations}
        />

        {/* Block Reason Modal */}
        <BlockReasonModal
          isOpen={showBlockModal}
          onClose={() => setShowBlockModal(false)}
          provider={selectedProvider}
          onConfirm={handleBlockProvider}
          isLoading={isActionLoading}
          translations={modalTranslations}
        />

        {/* GDPR Purge Modal */}
        <AdminGdprPurgeModal
          isOpen={showGdprPurgeModal}
          onClose={() => {
            setShowGdprPurgeModal(false);
            setGdprPurgeProvider(null);
          }}
          provider={gdprPurgeProvider}
          onSuccess={handleGdprPurgeSuccess}
        />
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminProviders;
