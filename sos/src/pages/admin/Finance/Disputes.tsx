// src/pages/admin/Finance/Disputes.tsx
// Disputes Management Page - Critical for chargebacks and payment disputes
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  orderBy,
  query,
  limit,
  where,
  startAfter,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
  updateDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import AdminLayout from '../../../components/admin/AdminLayout';
import Button from '../../../components/common/Button';
import {
  RefreshCw,
  Search,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  FileText,
  Upload,
  ExternalLink,
  MessageSquare,
  Calendar,
  ChevronDown,
  ChevronUp,
  X,
  Eye,
  Send,
  Download,
  Filter,
  BarChart3,
  Shield,
  Phone,
  Mail,
  FileCheck,
  History,
} from 'lucide-react';
import { useIntl, FormattedMessage } from 'react-intl';
// P0 FIX: Import unified DisputeStatus from finance types
import { DisputeStatus } from '../../../types/finance';

// =============================================================================
// TYPES
// =============================================================================

type PaymentMethod = 'stripe' | 'paypal';
type UrgencyLevel = 'urgent' | 'medium' | 'normal';

interface DisputeEvent {
  id: string;
  type: 'created' | 'evidence_submitted' | 'status_changed' | 'note_added' | 'response_received';
  description: string;
  timestamp: Date;
  userId?: string;
  userName?: string;
  metadata?: Record<string, unknown>;
}

interface DisputeEvidence {
  id: string;
  type: 'document' | 'text' | 'call_recording' | 'communication_log';
  name: string;
  description?: string;
  fileUrl?: string;
  textContent?: string;
  uploadedAt: Date;
  uploadedBy: string;
}

interface DisputeNote {
  id: string;
  content: string;
  createdAt: Date;
  createdBy: string;
  createdByName?: string;
}

interface DisputeRecord {
  id: string;
  paymentId: string;
  stripeDisputeId?: string;
  paypalDisputeId?: string;
  paymentMethod: PaymentMethod;
  amount: number;
  currency: string;
  status: DisputeStatus;
  reason: string;
  reasonCode: string;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  providerId?: string;
  providerName?: string;
  callSessionId?: string;
  createdAt: Date;
  dueDate: Date;
  resolvedAt?: Date;
  evidenceSubmitted: boolean;
  evidence: DisputeEvidence[];
  notes: DisputeNote[];
  timeline: DisputeEvent[];
}

interface DisputeStats {
  openCount: number;
  amountAtRisk: number;
  responseDueSoon: number;
  winRate: number;
  totalWon: number;
  totalLost: number;
}

interface DisputeFilters {
  status: DisputeStatus | 'all';
  paymentMethod: PaymentMethod | 'all';
  urgency: UrgencyLevel | 'all';
  startDate: string;
  endDate: string;
  search: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PAGE_SIZE = 25;

const CHARGEBACK_REASONS: Record<string, { code: string; label: string; description: string }> = {
  'fraudulent': { code: 'FR', label: 'Fraudulent', description: 'Customer claims they did not authorize the transaction' },
  'duplicate': { code: 'DU', label: 'Duplicate', description: 'Customer was charged multiple times for the same transaction' },
  'product_not_received': { code: 'PNR', label: 'Product Not Received', description: 'Customer did not receive the service' },
  'product_unacceptable': { code: 'PUA', label: 'Product Unacceptable', description: 'Service was not as described' },
  'subscription_canceled': { code: 'SC', label: 'Subscription Canceled', description: 'Customer canceled but was still charged' },
  'credit_not_processed': { code: 'CNP', label: 'Credit Not Processed', description: 'Refund was promised but not issued' },
  'general': { code: 'GEN', label: 'General', description: 'General dispute' },
  'unrecognized': { code: 'URZ', label: 'Unrecognized', description: 'Customer does not recognize the charge' },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getUrgencyLevel = (dueDate: Date): UrgencyLevel => {
  const now = new Date();
  const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilDue <= 48) return 'urgent';
  if (hoursUntilDue <= 168) return 'medium'; // 7 days
  return 'normal';
};

const getUrgencyColor = (urgency: UrgencyLevel): string => {
  switch (urgency) {
    case 'urgent': return 'text-red-700 bg-red-100 border-red-200';
    case 'medium': return 'text-orange-700 bg-orange-100 border-orange-200';
    case 'normal': return 'text-green-700 bg-green-100 border-green-200';
  }
};

const getStatusColor = (status: DisputeStatus): string => {
  switch (status) {
    case 'open':
    case 'needs_response':
    case 'warning_needs_response':
      return 'text-red-700 bg-red-100 border-red-200';
    case 'under_review':
    case 'warning_under_review':
      return 'text-yellow-700 bg-yellow-100 border-yellow-200';
    case 'won':
      return 'text-green-700 bg-green-100 border-green-200';
    case 'lost':
      return 'text-gray-700 bg-gray-100 border-gray-200';
    case 'accepted':
      return 'text-blue-700 bg-blue-100 border-blue-200';
    case 'closed':
    case 'warning_closed':
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const formatTimeRemaining = (dueDate: Date): string => {
  const now = new Date();
  const diff = dueDate.getTime() - now.getTime();

  if (diff < 0) return 'Overdue';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
};

// =============================================================================
// STATS CARD COMPONENT
// =============================================================================

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  urgent?: boolean;
  subtitle?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendUp,
  urgent,
  subtitle,
}) => (
  <div className={`bg-white rounded-lg border p-4 shadow-sm ${urgent ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200'}`}>
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <div className="flex items-center gap-2 mt-1">
          <p className={`text-2xl font-bold ${urgent ? 'text-red-600' : 'text-gray-900'}`}>
            {value}
          </p>
          {urgent && typeof value === 'number' && value > 0 && (
            <span className="px-2 py-0.5 text-xs font-semibold text-white bg-red-500 rounded-full animate-pulse">
              !
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        {trend && (
          <p className={`text-xs mt-1 flex items-center gap-1 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trendUp ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />}
            {trend}
          </p>
        )}
      </div>
      <div className={`p-3 rounded-lg ${urgent ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
        {icon}
      </div>
    </div>
  </div>
);

// =============================================================================
// EVIDENCE SUBMISSION MODAL
// =============================================================================

interface EvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  dispute: DisputeRecord | null;
  onSubmit: (evidence: Partial<DisputeEvidence>[]) => Promise<void>;
}

const EvidenceSubmissionModal: React.FC<EvidenceModalProps> = ({
  isOpen,
  onClose,
  dispute,
  onSubmit,
}) => {
  const intl = useIntl();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceDescription, setServiceDescription] = useState('');
  const [proofOfDelivery, setProofOfDelivery] = useState('');
  const [callRecordingRef, setCallRecordingRef] = useState('');
  const [communicationLogs, setCommunicationLogs] = useState('');
  const [documents, setDocuments] = useState<File[]>([]);
  const [previewMode, setPreviewMode] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setDocuments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!dispute) return;

    setIsSubmitting(true);
    try {
      const evidenceItems: Partial<DisputeEvidence>[] = [];

      if (serviceDescription.trim()) {
        evidenceItems.push({
          type: 'text',
          name: 'Service Description',
          textContent: serviceDescription,
        });
      }

      if (proofOfDelivery.trim()) {
        evidenceItems.push({
          type: 'text',
          name: 'Proof of Delivery',
          textContent: proofOfDelivery,
        });
      }

      if (callRecordingRef.trim()) {
        evidenceItems.push({
          type: 'call_recording',
          name: 'Call Recording Reference',
          textContent: callRecordingRef,
        });
      }

      if (communicationLogs.trim()) {
        evidenceItems.push({
          type: 'communication_log',
          name: 'Communication Logs',
          textContent: communicationLogs,
        });
      }

      // Handle file uploads
      for (const file of documents) {
        const storageRef = ref(storage, `disputes/${dispute.id}/evidence/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);

        evidenceItems.push({
          type: 'document',
          name: file.name,
          fileUrl: downloadUrl,
        });
      }

      await onSubmit(evidenceItems);
      onClose();

      // Reset form
      setServiceDescription('');
      setProofOfDelivery('');
      setCallRecordingRef('');
      setCommunicationLogs('');
      setDocuments([]);
      setPreviewMode(false);
    } catch (error) {
      console.error('Error submitting evidence:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !dispute) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            <FormattedMessage id="admin.disputes.evidence.title" defaultMessage="Submit Evidence" />
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Dispute Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">
                  <FormattedMessage id="admin.disputes.paymentId" defaultMessage="Payment ID" />:
                </span>
                <span className="ml-2 font-medium">{dispute.paymentId}</span>
              </div>
              <div>
                <span className="text-gray-500">
                  <FormattedMessage id="admin.disputes.amount" defaultMessage="Amount" />:
                </span>
                <span className="ml-2 font-medium">
                  {intl.formatNumber(dispute.amount, { style: 'currency', currency: dispute.currency })}
                </span>
              </div>
              <div>
                <span className="text-gray-500">
                  <FormattedMessage id="admin.disputes.reason" defaultMessage="Reason" />:
                </span>
                <span className="ml-2 font-medium">{dispute.reason}</span>
              </div>
              <div>
                <span className="text-gray-500">
                  <FormattedMessage id="admin.disputes.dueDate" defaultMessage="Due Date" />:
                </span>
                <span className={`ml-2 font-medium ${getUrgencyLevel(dispute.dueDate) === 'urgent' ? 'text-red-600' : ''}`}>
                  {intl.formatDate(dispute.dueDate, { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
            </div>
          </div>

          {!previewMode ? (
            <>
              {/* Service Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FormattedMessage id="admin.disputes.evidence.serviceDescription" defaultMessage="Service Description" />
                </label>
                <textarea
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 min-h-[100px] focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder={intl.formatMessage({
                    id: 'admin.disputes.evidence.serviceDescriptionPlaceholder',
                    defaultMessage: 'Describe the service provided, including date, duration, and details...',
                  })}
                />
              </div>

              {/* Proof of Delivery */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FormattedMessage id="admin.disputes.evidence.proofOfDelivery" defaultMessage="Proof of Delivery" />
                </label>
                <textarea
                  value={proofOfDelivery}
                  onChange={(e) => setProofOfDelivery(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 min-h-[100px] focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder={intl.formatMessage({
                    id: 'admin.disputes.evidence.proofOfDeliveryPlaceholder',
                    defaultMessage: 'Provide evidence that the service was delivered as described...',
                  })}
                />
              </div>

              {/* Call Recording Reference */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FormattedMessage id="admin.disputes.evidence.callRecording" defaultMessage="Call Recording Reference" />
                </label>
                <input
                  type="text"
                  value={callRecordingRef}
                  onChange={(e) => setCallRecordingRef(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder={intl.formatMessage({
                    id: 'admin.disputes.evidence.callRecordingPlaceholder',
                    defaultMessage: 'Enter call session ID or recording reference...',
                  })}
                />
              </div>

              {/* Communication Logs */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FormattedMessage id="admin.disputes.evidence.communicationLogs" defaultMessage="Communication Logs" />
                </label>
                <textarea
                  value={communicationLogs}
                  onChange={(e) => setCommunicationLogs(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 min-h-[100px] focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder={intl.formatMessage({
                    id: 'admin.disputes.evidence.communicationLogsPlaceholder',
                    defaultMessage: 'Paste relevant email or message exchanges...',
                  })}
                />
              </div>

              {/* Document Upload */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FormattedMessage id="admin.disputes.evidence.documents" defaultMessage="Upload Documents" />
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-red-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="evidence-upload"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  />
                  <label htmlFor="evidence-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      <FormattedMessage
                        id="admin.disputes.evidence.dropzone"
                        defaultMessage="Click to upload or drag and drop"
                      />
                    </p>
                    <p className="mt-1 text-xs text-gray-500">PDF, DOC, PNG, JPG</p>
                  </label>
                </div>

                {documents.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {documents.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-gray-400" />
                          <span className="text-sm">{file.name}</span>
                          <span className="text-xs text-gray-400">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          onClick={() => removeDocument(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Preview Mode */
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">
                <FormattedMessage id="admin.disputes.evidence.preview" defaultMessage="Evidence Preview" />
              </h3>

              {serviceDescription && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Service Description</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{serviceDescription}</p>
                </div>
              )}

              {proofOfDelivery && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Proof of Delivery</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{proofOfDelivery}</p>
                </div>
              )}

              {callRecordingRef && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Call Recording Reference</h4>
                  <p className="text-sm text-gray-600">{callRecordingRef}</p>
                </div>
              )}

              {communicationLogs && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Communication Logs</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{communicationLogs}</p>
                </div>
              )}

              {documents.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Documents ({documents.length})</h4>
                  <ul className="text-sm text-gray-600">
                    {documents.map((file, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <FileText size={14} />
                        {file.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <Button variant="ghost" onClick={() => setPreviewMode(!previewMode)}>
            <Eye size={16} className="mr-2" />
            {previewMode ? (
              <FormattedMessage id="admin.disputes.evidence.edit" defaultMessage="Edit" />
            ) : (
              <FormattedMessage id="admin.disputes.evidence.previewBtn" defaultMessage="Preview" />
            )}
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              <FormattedMessage id="common.cancel" defaultMessage="Cancel" />
            </Button>
            <Button onClick={handleSubmit} loading={isSubmitting}>
              <Send size={16} className="mr-2" />
              <FormattedMessage id="admin.disputes.evidence.submit" defaultMessage="Submit Evidence" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// ADD NOTE MODAL
// =============================================================================

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (note: string) => Promise<void>;
}

const AddNoteModal: React.FC<AddNoteModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const intl = useIntl();
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!note.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(note);
      setNote('');
      onClose();
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            <FormattedMessage id="admin.disputes.notes.addTitle" defaultMessage="Add Internal Note" />
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 min-h-[120px] focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder={intl.formatMessage({
              id: 'admin.disputes.notes.placeholder',
              defaultMessage: 'Add an internal note about this dispute...',
            })}
          />
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            <FormattedMessage id="common.cancel" defaultMessage="Cancel" />
          </Button>
          <Button onClick={handleSubmit} loading={isSubmitting} disabled={!note.trim()}>
            <FormattedMessage id="admin.disputes.notes.add" defaultMessage="Add Note" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// TIMELINE COMPONENT
// =============================================================================

interface TimelineProps {
  events: DisputeEvent[];
}

const DisputeTimeline: React.FC<TimelineProps> = ({ events }) => {
  const intl = useIntl();

  const getEventIcon = (type: DisputeEvent['type']) => {
    switch (type) {
      case 'created': return <AlertCircle className="text-red-500" size={16} />;
      case 'evidence_submitted': return <FileCheck className="text-blue-500" size={16} />;
      case 'status_changed': return <RefreshCw className="text-yellow-500" size={16} />;
      case 'note_added': return <MessageSquare className="text-gray-500" size={16} />;
      case 'response_received': return <Mail className="text-green-500" size={16} />;
    }
  };

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="p-1.5 bg-white border rounded-full">
              {getEventIcon(event.type)}
            </div>
            {index < events.length - 1 && (
              <div className="w-0.5 h-full bg-gray-200 mt-2" />
            )}
          </div>
          <div className="flex-1 pb-4">
            <p className="text-sm font-medium text-gray-900">{event.description}</p>
            <p className="text-xs text-gray-500 mt-1">
              {intl.formatDate(event.timestamp, { dateStyle: 'medium', timeStyle: 'short' })}
              {event.userName && ` - ${event.userName}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

// =============================================================================
// ANALYTICS COMPONENT
// =============================================================================

interface AnalyticsProps {
  disputes: DisputeRecord[];
}

const DisputeAnalytics: React.FC<AnalyticsProps> = ({ disputes }) => {
  const intl = useIntl();

  // Calculate reason breakdown
  const reasonBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    disputes.forEach(d => {
      const reason = d.reason || 'general';
      counts[reason] = (counts[reason] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [disputes]);

  // Calculate win/loss by reason
  const winLossByReason = useMemo(() => {
    const stats: Record<string, { won: number; lost: number }> = {};
    disputes
      .filter(d => d.status === 'won' || d.status === 'lost')
      .forEach(d => {
        const reason = d.reason || 'general';
        if (!stats[reason]) stats[reason] = { won: 0, lost: 0 };
        if (d.status === 'won') stats[reason].won++;
        else stats[reason].lost++;
      });
    return stats;
  }, [disputes]);

  return (
    <div className="bg-white rounded-lg border p-6 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="text-gray-600" size={20} />
        <h3 className="text-lg font-semibold text-gray-900">
          <FormattedMessage id="admin.disputes.analytics.title" defaultMessage="Dispute Analytics" />
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reason Breakdown */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            <FormattedMessage id="admin.disputes.analytics.byReason" defaultMessage="Disputes by Reason" />
          </h4>
          <div className="space-y-2">
            {reasonBreakdown.map(([reason, count]) => {
              const total = disputes.length || 1;
              const percentage = (count / total) * 100;
              return (
                <div key={reason} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">
                        {CHARGEBACK_REASONS[reason]?.label || reason}
                      </span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Win/Loss by Reason */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            <FormattedMessage id="admin.disputes.analytics.winLossByReason" defaultMessage="Win/Loss by Reason" />
          </h4>
          <div className="space-y-2">
            {Object.entries(winLossByReason).slice(0, 5).map(([reason, stats]) => {
              const total = stats.won + stats.lost || 1;
              const winRate = (stats.won / total) * 100;
              return (
                <div key={reason} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">
                        {CHARGEBACK_REASONS[reason]?.label || reason}
                      </span>
                      <span className="font-medium">
                        {winRate.toFixed(0)}% {intl.formatMessage({ id: 'admin.disputes.winRate', defaultMessage: 'win rate' })}
                      </span>
                    </div>
                    <div className="w-full bg-red-100 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${winRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// DISPUTE ROW COMPONENT
// =============================================================================

interface DisputeRowProps {
  dispute: DisputeRecord;
  onSubmitEvidence: (dispute: DisputeRecord) => void;
  onAcceptDispute: (dispute: DisputeRecord) => void;
  onAddNote: (dispute: DisputeRecord) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}

const DisputeRow: React.FC<DisputeRowProps> = ({
  dispute,
  onSubmitEvidence,
  onAcceptDispute,
  onAddNote,
  expanded,
  onToggleExpand,
}) => {
  const intl = useIntl();
  const urgency = getUrgencyLevel(dispute.dueDate);
  const isActionable = dispute.status === 'open' || dispute.status === 'under_review';

  const getDashboardLink = () => {
    if (dispute.paymentMethod === 'stripe' && dispute.stripeDisputeId) {
      return `https://dashboard.stripe.com/disputes/${dispute.stripeDisputeId}`;
    }
    if (dispute.paymentMethod === 'paypal' && dispute.paypalDisputeId) {
      return `https://www.paypal.com/disputes/cases/${dispute.paypalDisputeId}`;
    }
    return null;
  };

  const dashboardLink = getDashboardLink();

  return (
    <>
      <tr className={`border-t hover:bg-gray-50 ${urgency === 'urgent' ? 'bg-red-50' : ''}`}>
        <td className="px-4 py-3">
          <button onClick={onToggleExpand} className="text-gray-400 hover:text-gray-600">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </td>
        <td className="px-4 py-3 text-sm">
          {intl.formatDate(dispute.createdAt, { dateStyle: 'medium' })}
        </td>
        <td className="px-4 py-3">
          <div className={`text-sm font-medium ${urgency === 'urgent' ? 'text-red-600' : ''}`}>
            {intl.formatDate(dispute.dueDate, { dateStyle: 'medium' })}
          </div>
          <div className={`text-xs px-2 py-0.5 rounded inline-flex items-center gap-1 mt-1 ${getUrgencyColor(urgency)}`}>
            <Clock size={10} />
            {formatTimeRemaining(dispute.dueDate)}
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm font-mono">{dispute.paymentId.substring(0, 12)}...</span>
        </td>
        <td className="px-4 py-3">
          <div className="text-sm font-medium">{dispute.clientName || dispute.clientId}</div>
          {dispute.clientEmail && (
            <div className="text-xs text-gray-500">{dispute.clientEmail}</div>
          )}
        </td>
        <td className="px-4 py-3 font-medium">
          {intl.formatNumber(dispute.amount, { style: 'currency', currency: dispute.currency })}
        </td>
        <td className="px-4 py-3">
          <div className="text-sm">{CHARGEBACK_REASONS[dispute.reason]?.label || dispute.reason}</div>
          <div className="text-xs text-gray-500">{dispute.reasonCode}</div>
        </td>
        <td className="px-4 py-3">
          <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(dispute.status)}`}>
            {intl.formatMessage({ id: `admin.disputes.status.${dispute.status}`, defaultMessage: dispute.status })}
          </span>
        </td>
        <td className="px-4 py-3">
          {dispute.evidenceSubmitted ? (
            <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-0.5 rounded text-xs">
              <CheckCircle size={12} />
              <FormattedMessage id="common.yes" defaultMessage="Yes" />
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2 py-0.5 rounded text-xs">
              <XCircle size={12} />
              <FormattedMessage id="common.no" defaultMessage="No" />
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {isActionable && (
              <>
                <button
                  onClick={() => onSubmitEvidence(dispute)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                  title={intl.formatMessage({ id: 'admin.disputes.actions.submitEvidence', defaultMessage: 'Submit Evidence' })}
                >
                  <Upload size={16} />
                </button>
                <button
                  onClick={() => onAcceptDispute(dispute)}
                  className="p-1.5 text-orange-600 hover:bg-orange-50 rounded"
                  title={intl.formatMessage({ id: 'admin.disputes.actions.accept', defaultMessage: 'Accept Dispute' })}
                >
                  <Shield size={16} />
                </button>
              </>
            )}
            {dashboardLink && (
              <a
                href={dashboardLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                title={intl.formatMessage({
                  id: 'admin.disputes.actions.viewDashboard',
                  defaultMessage: `View in ${dispute.paymentMethod === 'stripe' ? 'Stripe' : 'PayPal'}`
                })}
              >
                <ExternalLink size={16} />
              </a>
            )}
            <button
              onClick={() => onAddNote(dispute)}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
              title={intl.formatMessage({ id: 'admin.disputes.actions.addNote', defaultMessage: 'Add Note' })}
            >
              <MessageSquare size={16} />
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded Details */}
      {expanded && (
        <tr className="bg-gray-50">
          <td colSpan={10} className="px-4 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Timeline */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <History size={16} />
                  <FormattedMessage id="admin.disputes.timeline" defaultMessage="Timeline" />
                </h4>
                <DisputeTimeline events={dispute.timeline} />
              </div>

              {/* Notes & Evidence */}
              <div>
                {/* Notes */}
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <MessageSquare size={16} />
                  <FormattedMessage id="admin.disputes.notes.title" defaultMessage="Internal Notes" />
                  ({dispute.notes.length})
                </h4>
                <div className="space-y-2 mb-4">
                  {dispute.notes.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      <FormattedMessage id="admin.disputes.notes.empty" defaultMessage="No notes yet" />
                    </p>
                  ) : (
                    dispute.notes.map(note => (
                      <div key={note.id} className="bg-white rounded border p-3">
                        <p className="text-sm text-gray-700">{note.content}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {note.createdByName || note.createdBy} - {intl.formatDate(note.createdAt, { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Evidence */}
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <FileText size={16} />
                  <FormattedMessage id="admin.disputes.evidence.title" defaultMessage="Evidence" />
                  ({dispute.evidence.length})
                </h4>
                <div className="space-y-2">
                  {dispute.evidence.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      <FormattedMessage id="admin.disputes.evidence.empty" defaultMessage="No evidence submitted yet" />
                    </p>
                  ) : (
                    dispute.evidence.map(ev => (
                      <div key={ev.id} className="bg-white rounded border p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-700">{ev.name}</p>
                          <p className="text-xs text-gray-500">{ev.type}</p>
                        </div>
                        {ev.fileUrl && (
                          <a
                            href={ev.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Download size={16} />
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const AdminFinanceDisputes: React.FC = () => {
  const intl = useIntl();
  const { user: currentUser } = useAuth();

  // State
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [stats, setStats] = useState<DisputeStats>({
    openCount: 0,
    amountAtRisk: 0,
    responseDueSoon: 0,
    winRate: 0,
    totalWon: 0,
    totalLost: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Filters
  const [filters, setFilters] = useState<DisputeFilters>({
    status: 'all',
    paymentMethod: 'all',
    urgency: 'all',
    startDate: '',
    endDate: '',
    search: '',
  });

  // Modals
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<DisputeRecord | null>(null);

  // Map Firestore document to DisputeRecord
  const mapSnapToDispute = (docSnap: QueryDocumentSnapshot<DocumentData>): DisputeRecord => {
    const data = docSnap.data();

    const toDate = (val: unknown): Date => {
      if (val instanceof Timestamp) return val.toDate();
      if (val instanceof Date) return val;
      return new Date();
    };

    return {
      id: docSnap.id,
      paymentId: data.paymentId || '',
      stripeDisputeId: data.stripeDisputeId,
      paypalDisputeId: data.paypalDisputeId,
      paymentMethod: data.paymentMethod || 'stripe',
      amount: data.amount || 0,
      currency: data.currency || 'EUR',
      status: data.status || 'open',
      reason: data.reason || 'general',
      reasonCode: data.reasonCode || '',
      clientId: data.clientId || '',
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      providerId: data.providerId,
      providerName: data.providerName,
      callSessionId: data.callSessionId,
      createdAt: toDate(data.createdAt),
      dueDate: toDate(data.dueDate),
      resolvedAt: data.resolvedAt ? toDate(data.resolvedAt) : undefined,
      evidenceSubmitted: data.evidenceSubmitted || false,
      evidence: (data.evidence || []).map((e: Record<string, unknown>) => ({
        id: e.id as string || '',
        type: e.type as DisputeEvidence['type'] || 'document',
        name: e.name as string || '',
        description: e.description as string,
        fileUrl: e.fileUrl as string,
        textContent: e.textContent as string,
        uploadedAt: toDate(e.uploadedAt),
        uploadedBy: e.uploadedBy as string || '',
      })),
      notes: (data.notes || []).map((n: Record<string, unknown>) => ({
        id: n.id as string || '',
        content: n.content as string || '',
        createdAt: toDate(n.createdAt),
        createdBy: n.createdBy as string || '',
        createdByName: n.createdByName as string,
      })),
      timeline: (data.timeline || []).map((t: Record<string, unknown>) => ({
        id: t.id as string || '',
        type: t.type as DisputeEvent['type'] || 'created',
        description: t.description as string || '',
        timestamp: toDate(t.timestamp),
        userId: t.userId as string,
        userName: t.userName as string,
        metadata: t.metadata as Record<string, unknown>,
      })),
    };
  };

  // Calculate stats from disputes
  const calculateStats = useCallback((disputeList: DisputeRecord[]) => {
    const now = new Date();
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const openDisputes = disputeList.filter(d => d.status === 'open' || d.status === 'under_review');
    const openCount = openDisputes.length;
    const amountAtRisk = openDisputes.reduce((sum, d) => sum + d.amount, 0);
    const responseDueSoon = openDisputes.filter(d => d.dueDate <= fortyEightHoursFromNow).length;

    const resolved = disputeList.filter(d => d.status === 'won' || d.status === 'lost');
    const totalWon = resolved.filter(d => d.status === 'won').length;
    const totalLost = resolved.filter(d => d.status === 'lost').length;
    const winRate = resolved.length > 0 ? (totalWon / resolved.length) * 100 : 0;

    setStats({ openCount, amountAtRisk, responseDueSoon, winRate, totalWon, totalLost });
  }, []);

  // Build and execute query
  const buildQuery = useCallback(
    async (reset = false) => {
      setIsLoading(true);
      try {
        const colRef = collection(db, 'disputes');
        const constraints: Parameters<typeof query>[1][] = [];

        // Status filter
        if (filters.status !== 'all') {
          constraints.push(where('status', '==', filters.status));
        }

        // Payment method filter
        if (filters.paymentMethod !== 'all') {
          constraints.push(where('paymentMethod', '==', filters.paymentMethod));
        }

        // Date range filters
        if (filters.startDate) {
          const startTs = Timestamp.fromDate(new Date(filters.startDate));
          constraints.push(where('createdAt', '>=', startTs));
        }
        if (filters.endDate) {
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999);
          const endTs = Timestamp.fromDate(endDate);
          constraints.push(where('createdAt', '<=', endTs));
        }

        // Sort by due date (urgent first)
        constraints.push(orderBy('dueDate', 'asc'));

        // Pagination
        if (!reset && lastDoc) {
          constraints.push(startAfter(lastDoc));
        }

        constraints.push(limit(PAGE_SIZE));

        const q = query(colRef, ...constraints);
        const snap = await getDocs(q);

        let pageItems = snap.docs.map(mapSnapToDispute);

        // Apply urgency filter locally (can't do compound index easily)
        if (filters.urgency !== 'all') {
          pageItems = pageItems.filter(d => {
            const urgency = getUrgencyLevel(d.dueDate);
            return urgency === filters.urgency;
          });
        }

        // Apply search filter locally
        if (filters.search.trim()) {
          const searchLower = filters.search.toLowerCase();
          pageItems = pageItems.filter(d =>
            d.paymentId.toLowerCase().includes(searchLower) ||
            d.clientName?.toLowerCase().includes(searchLower) ||
            d.clientEmail?.toLowerCase().includes(searchLower) ||
            d.clientId.toLowerCase().includes(searchLower)
          );
        }

        setLastDoc(snap.docs.length ? snap.docs[snap.docs.length - 1] : null);
        setHasMore(snap.docs.length === PAGE_SIZE);

        if (reset) {
          setDisputes(pageItems);
          calculateStats(pageItems);
        } else {
          setDisputes(prev => {
            const allDisputes = [...prev, ...pageItems];
            calculateStats(allDisputes);
            return allDisputes;
          });
        }
      } catch (err) {
        console.error('Error loading disputes:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [filters, lastDoc, calculateStats]
  );

  // Initial load and filter changes
  useEffect(() => {
    setLastDoc(null);
    setHasMore(true);
    void buildQuery(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.paymentMethod, filters.urgency, filters.startDate, filters.endDate]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setLastDoc(null);
      setHasMore(true);
      void buildQuery(true);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  // Submit evidence handler
  const handleSubmitEvidence = async (evidenceItems: Partial<DisputeEvidence>[]) => {
    if (!selectedDispute) return;

    const disputeRef = doc(db, 'disputes', selectedDispute.id);
    const newEvidence = evidenceItems.map(ev => ({
      ...ev,
      id: `ev_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      uploadedAt: new Date(),
      uploadedBy: currentUser?.id || currentUser?.uid || 'unknown',
    }));

    const newTimelineEvent: DisputeEvent = {
      id: `evt_${Date.now()}`,
      type: 'evidence_submitted',
      description: `Evidence submitted: ${newEvidence.length} item(s)`,
      timestamp: new Date(),
      userName: 'Admin',
    };

    await updateDoc(disputeRef, {
      evidence: [...selectedDispute.evidence, ...newEvidence],
      evidenceSubmitted: true,
      timeline: [...selectedDispute.timeline, newTimelineEvent],
      updatedAt: serverTimestamp(),
    });

    // Refresh data
    void buildQuery(true);
  };

  // Accept dispute handler
  const handleAcceptDispute = async (dispute: DisputeRecord) => {
    const confirmed = window.confirm(
      intl.formatMessage({
        id: 'admin.disputes.confirmAccept',
        defaultMessage: 'Are you sure you want to accept this dispute? This will concede the chargeback to the customer.',
      })
    );

    if (!confirmed) return;

    const disputeRef = doc(db, 'disputes', dispute.id);
    const newTimelineEvent: DisputeEvent = {
      id: `evt_${Date.now()}`,
      type: 'status_changed',
      description: 'Dispute accepted (conceded to customer)',
      timestamp: new Date(),
      userName: 'Admin',
    };

    await updateDoc(disputeRef, {
      status: 'accepted',
      resolvedAt: serverTimestamp(),
      timeline: [...dispute.timeline, newTimelineEvent],
      updatedAt: serverTimestamp(),
    });

    void buildQuery(true);
  };

  // Add note handler
  const handleAddNote = async (noteContent: string) => {
    if (!selectedDispute) return;

    const disputeRef = doc(db, 'disputes', selectedDispute.id);
    const newNote: DisputeNote = {
      id: `note_${Date.now()}`,
      content: noteContent,
      createdAt: new Date(),
      createdBy: currentUser?.id || currentUser?.uid || 'unknown',
      createdByName: currentUser?.displayName || currentUser?.email || 'Admin',
    };

    const newTimelineEvent: DisputeEvent = {
      id: `evt_${Date.now()}`,
      type: 'note_added',
      description: 'Internal note added',
      timestamp: new Date(),
      userName: 'Admin',
    };

    await updateDoc(disputeRef, {
      notes: [...selectedDispute.notes, newNote],
      timeline: [...selectedDispute.timeline, newTimelineEvent],
      updatedAt: serverTimestamp(),
    });

    void buildQuery(true);
  };

  // Toggle row expansion
  const toggleRowExpand = (disputeId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(disputeId)) {
        next.delete(disputeId);
      } else {
        next.add(disputeId);
      }
      return next;
    });
  };

  return (
    <AdminLayout>
      <div className="p-6 text-black">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              <FormattedMessage id="admin.disputes.title" defaultMessage="Disputes Management" />
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              <FormattedMessage
                id="admin.disputes.subtitle"
                defaultMessage="Monitor and manage chargebacks and payment disputes"
              />
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowAnalytics(!showAnalytics)}>
              <BarChart3 size={16} className="mr-2" />
              <FormattedMessage id="admin.disputes.analytics" defaultMessage="Analytics" />
            </Button>
            <Button variant="outline" onClick={() => void buildQuery(true)}>
              <RefreshCw size={16} className="mr-2" />
              <FormattedMessage id="common.refresh" defaultMessage="Refresh" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title={intl.formatMessage({ id: 'admin.disputes.stats.openDisputes', defaultMessage: 'Open Disputes' })}
            value={stats.openCount}
            icon={<AlertTriangle size={24} />}
            urgent={stats.openCount > 0}
            subtitle={intl.formatMessage({ id: 'admin.disputes.stats.requiresAttention', defaultMessage: 'Requires attention' })}
          />
          <StatsCard
            title={intl.formatMessage({ id: 'admin.disputes.stats.amountAtRisk', defaultMessage: 'Amount at Risk' })}
            value={intl.formatNumber(stats.amountAtRisk, { style: 'currency', currency: 'EUR' })}
            icon={<DollarSign size={24} />}
            urgent={stats.amountAtRisk > 1000}
          />
          <StatsCard
            title={intl.formatMessage({ id: 'admin.disputes.stats.responseDueSoon', defaultMessage: 'Response Due Soon' })}
            value={stats.responseDueSoon}
            icon={<Clock size={24} />}
            urgent={stats.responseDueSoon > 0}
            subtitle={intl.formatMessage({ id: 'admin.disputes.stats.within48h', defaultMessage: 'Within 48 hours' })}
          />
          <StatsCard
            title={intl.formatMessage({ id: 'admin.disputes.stats.winRate', defaultMessage: 'Win Rate' })}
            value={`${stats.winRate.toFixed(1)}%`}
            icon={<TrendingUp size={24} />}
            subtitle={`${stats.totalWon}W / ${stats.totalLost}L`}
            trend={stats.winRate >= 50 ? 'Above average' : 'Below average'}
            trendUp={stats.winRate >= 50}
          />
        </div>

        {/* Analytics Section */}
        {showAnalytics && <DisputeAnalytics disputes={disputes} />}

        {/* Filters */}
        <div className="bg-white border rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700"
            >
              <Filter size={16} />
              <FormattedMessage id="admin.disputes.filters" defaultMessage="Filters" />
              {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {/* Search */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64"
                  placeholder={intl.formatMessage({
                    id: 'admin.disputes.searchPlaceholder',
                    defaultMessage: 'Search by payment ID, client...'
                  })}
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 border-t">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FormattedMessage id="admin.disputes.filter.status" defaultMessage="Status" />
                </label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as DisputeStatus | 'all' }))}
                >
                  <option value="all">{intl.formatMessage({ id: 'common.all', defaultMessage: 'All' })}</option>
                  <option value="open">{intl.formatMessage({ id: 'admin.disputes.status.open', defaultMessage: 'Open' })}</option>
                  <option value="under_review">{intl.formatMessage({ id: 'admin.disputes.status.under_review', defaultMessage: 'Under Review' })}</option>
                  <option value="won">{intl.formatMessage({ id: 'admin.disputes.status.won', defaultMessage: 'Won' })}</option>
                  <option value="lost">{intl.formatMessage({ id: 'admin.disputes.status.lost', defaultMessage: 'Lost' })}</option>
                </select>
              </div>

              {/* Payment Method Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FormattedMessage id="admin.disputes.filter.paymentMethod" defaultMessage="Payment Method" />
                </label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={filters.paymentMethod}
                  onChange={(e) => setFilters(prev => ({ ...prev, paymentMethod: e.target.value as PaymentMethod | 'all' }))}
                >
                  <option value="all">{intl.formatMessage({ id: 'common.all', defaultMessage: 'All' })}</option>
                  <option value="stripe">Stripe</option>
                  <option value="paypal">PayPal</option>
                </select>
              </div>

              {/* Urgency Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FormattedMessage id="admin.disputes.filter.urgency" defaultMessage="Urgency" />
                </label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={filters.urgency}
                  onChange={(e) => setFilters(prev => ({ ...prev, urgency: e.target.value as UrgencyLevel | 'all' }))}
                >
                  <option value="all">{intl.formatMessage({ id: 'common.all', defaultMessage: 'All' })}</option>
                  <option value="urgent">{intl.formatMessage({ id: 'admin.disputes.urgency.urgent', defaultMessage: 'Urgent (<48h)' })}</option>
                  <option value="medium">{intl.formatMessage({ id: 'admin.disputes.urgency.medium', defaultMessage: 'Medium (<7d)' })}</option>
                  <option value="normal">{intl.formatMessage({ id: 'admin.disputes.urgency.normal', defaultMessage: 'Normal' })}</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FormattedMessage id="admin.disputes.filter.startDate" defaultMessage="Start Date" />
                </label>
                <input
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FormattedMessage id="admin.disputes.filter.endDate" defaultMessage="End Date" />
                </label>
                <input
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white border rounded-lg overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-10 px-4 py-3"></th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                  <FormattedMessage id="admin.disputes.table.created" defaultMessage="Created" />
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                  <FormattedMessage id="admin.disputes.table.dueDate" defaultMessage="Due Date" />
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                  <FormattedMessage id="admin.disputes.table.paymentId" defaultMessage="Payment ID" />
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                  <FormattedMessage id="admin.disputes.table.client" defaultMessage="Client" />
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                  <FormattedMessage id="admin.disputes.table.amount" defaultMessage="Amount" />
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                  <FormattedMessage id="admin.disputes.table.reason" defaultMessage="Reason" />
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                  <FormattedMessage id="admin.disputes.table.status" defaultMessage="Status" />
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                  <FormattedMessage id="admin.disputes.table.evidence" defaultMessage="Evidence" />
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                  <FormattedMessage id="admin.disputes.table.actions" defaultMessage="Actions" />
                </th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((dispute) => (
                <DisputeRow
                  key={dispute.id}
                  dispute={dispute}
                  onSubmitEvidence={(d) => {
                    setSelectedDispute(d);
                    setEvidenceModalOpen(true);
                  }}
                  onAcceptDispute={handleAcceptDispute}
                  onAddNote={(d) => {
                    setSelectedDispute(d);
                    setNoteModalOpen(true);
                  }}
                  expanded={expandedRows.has(dispute.id)}
                  onToggleExpand={() => toggleRowExpand(dispute.id)}
                />
              ))}

              {!isLoading && disputes.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-gray-500">
                      <FormattedMessage
                        id="admin.disputes.noDisputes"
                        defaultMessage="No disputes found"
                      />
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      <FormattedMessage
                        id="admin.disputes.noDisputesHint"
                        defaultMessage="Disputes will appear here when customers initiate chargebacks"
                      />
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {isLoading && (
            <div className="p-4 text-center text-gray-600">
              <FormattedMessage id="common.loading" defaultMessage="Loading..." />
            </div>
          )}
        </div>

        {/* Load More */}
        {hasMore && !isLoading && disputes.length > 0 && (
          <div className="mt-4 flex justify-center">
            <Button onClick={() => void buildQuery(false)}>
              <FormattedMessage id="common.loadMore" defaultMessage="Load More" />
            </Button>
          </div>
        )}

        {/* Modals */}
        <EvidenceSubmissionModal
          isOpen={evidenceModalOpen}
          onClose={() => {
            setEvidenceModalOpen(false);
            setSelectedDispute(null);
          }}
          dispute={selectedDispute}
          onSubmit={handleSubmitEvidence}
        />

        <AddNoteModal
          isOpen={noteModalOpen}
          onClose={() => {
            setNoteModalOpen(false);
            setSelectedDispute(null);
          }}
          onSubmit={handleAddNote}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminFinanceDisputes;
