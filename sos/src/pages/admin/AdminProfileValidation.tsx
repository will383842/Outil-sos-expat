// src/pages/admin/AdminProfileValidation.tsx
// Page de gestion de la file d'attente de validation des profils prestataires
// =============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  User,
  Users,
  Scale,
  Globe,
  Filter,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  Image,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Languages,
  Award,
  ExternalLink,
  MessageSquare,
  Send,
  X,
  Check,
  Loader2,
  History,
  UserCheck,
  UserX,
  Edit3,
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import Modal from '../../components/common/Modal';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useAuth } from '../../contexts/AuthContext';
import { logError } from '../../utils/logging';

// ============ TYPES ============
type ValidationStatus = 'pending' | 'in_review' | 'changes_requested' | 'approved' | 'rejected';
type ProviderType = 'lawyer' | 'expat';

interface ValidationItem {
  id: string;
  providerId: string;
  providerName: string;
  providerEmail: string;
  providerPhone?: string;
  providerType: ProviderType;
  profilePhoto?: string;
  bio?: string;
  specializations?: string[];
  languages?: string[];
  country?: string;
  city?: string;
  yearsExperience?: number;
  barAssociation?: string;
  documents?: {
    id: string;
    name: string;
    type: string;
    url: string;
    uploadedAt: Timestamp;
  }[];
  kycDocuments?: {
    idDocument?: string;
    proofOfAddress?: string;
    professionalLicense?: string;
  };
  submittedAt: Timestamp;
  status: ValidationStatus;
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: Timestamp;
  reviewNotes?: string;
  requestedChanges?: {
    field: string;
    message: string;
    requestedAt: Timestamp;
  }[];
  validationHistory?: {
    action: string;
    by: string;
    byName: string;
    at: Timestamp;
    reason?: string;
  }[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

interface ValidationStats {
  pending: number;
  inReview: number;
  approvedToday: number;
  rejectedToday: number;
}

interface ValidationFilters {
  status: ValidationStatus | 'all';
  providerType: ProviderType | 'all';
  assignedTo: string;
}

// ============ TRANSLATIONS ============
type Lang = 'fr' | 'en';

const detectLang = (): Lang =>
  (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('fr')) ? 'fr' : 'en';

const STRINGS: Record<Lang, Record<string, string>> = {
  fr: {
    pageTitle: 'Validation des profils',
    pageSubtitle: 'File d\'attente de validation des profils prestataires',
    pending: 'En attente',
    inReview: 'En cours de revue',
    changesRequested: 'Modifications demandees',
    approved: 'Approuve',
    rejected: 'Rejete',
    approvedToday: 'Approuves aujourd\'hui',
    rejectedToday: 'Rejetes aujourd\'hui',
    filterStatus: 'Statut',
    filterType: 'Type de prestataire',
    filterAssigned: 'Assigne a',
    allStatuses: 'Tous les statuts',
    allTypes: 'Tous les types',
    allAssignees: 'Tous',
    lawyer: 'Avocat',
    expat: 'Expatrie',
    unassigned: 'Non assigne',
    assignedToMe: 'Mes dossiers',
    providerName: 'Nom du prestataire',
    type: 'Type',
    submittedDate: 'Date de soumission',
    status: 'Statut',
    assignedTo: 'Assigne a',
    actions: 'Actions',
    view: 'Voir',
    assign: 'Prendre en charge',
    loading: 'Chargement...',
    noResults: 'Aucun profil en attente de validation',
    noResultsDesc: 'La file d\'attente de validation est vide.',
    refresh: 'Actualiser',
    search: 'Rechercher par nom ou email...',
    page: 'Page',
    of: 'sur',
    previous: 'Precedent',
    next: 'Suivant',
    // Modal
    profileReview: 'Revue du profil',
    personalInfo: 'Informations personnelles',
    professionalInfo: 'Informations professionnelles',
    documents: 'Documents',
    kycDocuments: 'Documents KYC',
    validationHistory: 'Historique de validation',
    bio: 'Biographie',
    specializations: 'Specialisations',
    languages: 'Langues',
    location: 'Localisation',
    experience: 'Experience',
    years: 'ans',
    barAssociation: 'Barreau',
    email: 'Email',
    phone: 'Telephone',
    noPhoto: 'Pas de photo',
    noDocuments: 'Aucun document',
    viewDocument: 'Voir le document',
    idDocument: 'Piece d\'identite',
    proofOfAddress: 'Justificatif de domicile',
    professionalLicense: 'Licence professionnelle',
    notProvided: 'Non fourni',
    // Actions
    approve: 'Approuver',
    reject: 'Rejeter',
    requestChanges: 'Demander des modifications',
    approveConfirm: 'Confirmer l\'approbation',
    rejectConfirm: 'Confirmer le rejet',
    requestChangesConfirm: 'Envoyer la demande de modifications',
    reason: 'Raison',
    reasonPlaceholder: 'Entrez la raison...',
    changesPlaceholder: 'Decrivez les modifications demandees...',
    addChange: 'Ajouter une modification',
    fieldToModify: 'Champ a modifier',
    changeDescription: 'Description du changement',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    send: 'Envoyer',
    processing: 'Traitement en cours...',
    success: 'Succes',
    error: 'Erreur',
    profileApproved: 'Le profil a ete approuve avec succes.',
    profileRejected: 'Le profil a ete rejete.',
    changesRequestedSuccess: 'La demande de modifications a ete envoyee.',
    assignedSuccess: 'Le dossier vous a ete assigne.',
    actionBy: 'Par',
    actionAt: 'Le',
    close: 'Fermer',
    selectField: 'Selectionnez un champ',
    fieldPhoto: 'Photo de profil',
    fieldBio: 'Biographie',
    fieldSpecializations: 'Specialisations',
    fieldLanguages: 'Langues',
    fieldDocuments: 'Documents',
    fieldKyc: 'Documents KYC',
    fieldOther: 'Autre',
  },
  en: {
    pageTitle: 'Profile Validation',
    pageSubtitle: 'Provider profile validation queue',
    pending: 'Pending',
    inReview: 'In Review',
    changesRequested: 'Changes Requested',
    approved: 'Approved',
    rejected: 'Rejected',
    approvedToday: 'Approved Today',
    rejectedToday: 'Rejected Today',
    filterStatus: 'Status',
    filterType: 'Provider Type',
    filterAssigned: 'Assigned To',
    allStatuses: 'All Statuses',
    allTypes: 'All Types',
    allAssignees: 'All',
    lawyer: 'Lawyer',
    expat: 'Expat',
    unassigned: 'Unassigned',
    assignedToMe: 'My Cases',
    providerName: 'Provider Name',
    type: 'Type',
    submittedDate: 'Submitted Date',
    status: 'Status',
    assignedTo: 'Assigned To',
    actions: 'Actions',
    view: 'View',
    assign: 'Assign to Me',
    loading: 'Loading...',
    noResults: 'No profiles pending validation',
    noResultsDesc: 'The validation queue is empty.',
    refresh: 'Refresh',
    search: 'Search by name or email...',
    page: 'Page',
    of: 'of',
    previous: 'Previous',
    next: 'Next',
    // Modal
    profileReview: 'Profile Review',
    personalInfo: 'Personal Information',
    professionalInfo: 'Professional Information',
    documents: 'Documents',
    kycDocuments: 'KYC Documents',
    validationHistory: 'Validation History',
    bio: 'Biography',
    specializations: 'Specializations',
    languages: 'Languages',
    location: 'Location',
    experience: 'Experience',
    years: 'years',
    barAssociation: 'Bar Association',
    email: 'Email',
    phone: 'Phone',
    noPhoto: 'No photo',
    noDocuments: 'No documents',
    viewDocument: 'View document',
    idDocument: 'ID Document',
    proofOfAddress: 'Proof of Address',
    professionalLicense: 'Professional License',
    notProvided: 'Not provided',
    // Actions
    approve: 'Approve',
    reject: 'Reject',
    requestChanges: 'Request Changes',
    approveConfirm: 'Confirm Approval',
    rejectConfirm: 'Confirm Rejection',
    requestChangesConfirm: 'Send Change Request',
    reason: 'Reason',
    reasonPlaceholder: 'Enter reason...',
    changesPlaceholder: 'Describe the requested changes...',
    addChange: 'Add change request',
    fieldToModify: 'Field to modify',
    changeDescription: 'Change description',
    cancel: 'Cancel',
    confirm: 'Confirm',
    send: 'Send',
    processing: 'Processing...',
    success: 'Success',
    error: 'Error',
    profileApproved: 'Profile has been approved successfully.',
    profileRejected: 'Profile has been rejected.',
    changesRequestedSuccess: 'Change request has been sent.',
    assignedSuccess: 'Case has been assigned to you.',
    actionBy: 'By',
    actionAt: 'On',
    close: 'Close',
    selectField: 'Select a field',
    fieldPhoto: 'Profile photo',
    fieldBio: 'Biography',
    fieldSpecializations: 'Specializations',
    fieldLanguages: 'Languages',
    fieldDocuments: 'Documents',
    fieldKyc: 'KYC Documents',
    fieldOther: 'Other',
  }
};

const tFor = (lang: Lang) => (key: string) => STRINGS[lang][key] ?? key;

// ============ UTILITY COMPONENTS ============
const StatusBadge: React.FC<{ status: ValidationStatus; t: (key: string) => string }> = ({ status, t }) => {
  const config: Record<ValidationStatus, { color: string; icon: React.FC<{ size?: number | string; className?: string }> }> = {
    pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
    in_review: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Eye },
    changes_requested: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Edit3 },
    approved: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
    rejected: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  };

  const statusLabels: Record<ValidationStatus, string> = {
    pending: t('pending'),
    in_review: t('inReview'),
    changes_requested: t('changesRequested'),
    approved: t('approved'),
    rejected: t('rejected'),
  };

  const { color, icon: Icon } = config[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${color}`}>
      <Icon size={12} className="mr-1" />
      {statusLabels[status]}
    </span>
  );
};

const ProviderTypeBadge: React.FC<{ type: ProviderType; t: (key: string) => string }> = ({ type, t }) => {
  if (type === 'lawyer') {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <Scale size={12} className="mr-1" />
        {t('lawyer')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
      <Globe size={12} className="mr-1" />
      {t('expat')}
    </span>
  );
};

const StatCard: React.FC<{
  title: string;
  value: number;
  icon: React.FC<{ size?: number | string; className?: string }>;
  color: string;
}> = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
    </div>
  </div>
);

// ============ PROFILE REVIEW MODAL ============
interface ProfileReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ValidationItem | null;
  t: (key: string) => string;
  lang: Lang;
  currentUserId?: string;
  onApprove: (validationId: string, reason: string) => Promise<void>;
  onReject: (validationId: string, reason: string) => Promise<void>;
  onRequestChanges: (validationId: string, changes: { field: string; message: string }[]) => Promise<void>;
  isProcessing: boolean;
}

const ProfileReviewModal: React.FC<ProfileReviewModalProps> = ({
  isOpen,
  onClose,
  item,
  t,
  lang,
  currentUserId,
  onApprove,
  onReject,
  onRequestChanges,
  isProcessing,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'documents' | 'history'>('info');
  const [actionMode, setActionMode] = useState<'none' | 'approve' | 'reject' | 'changes'>('none');
  const [reason, setReason] = useState('');
  const [changes, setChanges] = useState<{ field: string; message: string }[]>([]);
  const [newChangeField, setNewChangeField] = useState('');
  const [newChangeMessage, setNewChangeMessage] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('info');
      setActionMode('none');
      setReason('');
      setChanges([]);
      setNewChangeField('');
      setNewChangeMessage('');
    }
  }, [isOpen]);

  if (!item) return null;

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleAddChange = () => {
    if (newChangeField && newChangeMessage.trim()) {
      setChanges([...changes, { field: newChangeField, message: newChangeMessage.trim() }]);
      setNewChangeField('');
      setNewChangeMessage('');
    }
  };

  const handleRemoveChange = (index: number) => {
    setChanges(changes.filter((_, i) => i !== index));
  };

  const handleSubmitAction = async () => {
    if (actionMode === 'approve') {
      await onApprove(item.id, reason);
    } else if (actionMode === 'reject') {
      await onReject(item.id, reason);
    } else if (actionMode === 'changes') {
      await onRequestChanges(item.id, changes);
    }
  };

  const canPerformActions = item.status === 'pending' || item.status === 'in_review';

  const fieldOptions = [
    { value: 'photo', label: t('fieldPhoto') },
    { value: 'bio', label: t('fieldBio') },
    { value: 'specializations', label: t('fieldSpecializations') },
    { value: 'languages', label: t('fieldLanguages') },
    { value: 'documents', label: t('fieldDocuments') },
    { value: 'kyc', label: t('fieldKyc') },
    { value: 'other', label: t('fieldOther') },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('profileReview')} size="large">
      <div className="space-y-6">
        {/* Provider Header */}
        <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex-shrink-0">
            {item.profilePhoto ? (
              <img
                src={item.profilePhoto}
                alt={item.providerName}
                className="h-20 w-20 rounded-full object-cover border-2 border-white shadow"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="h-10 w-10 text-gray-400" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900">{item.providerName}</h3>
            <div className="flex items-center space-x-3 mt-2">
              <ProviderTypeBadge type={item.providerType} t={t} />
              <StatusBadge status={item.status} t={t} />
            </div>
            <div className="flex items-center space-x-4 mt-3 text-sm text-gray-600">
              <span className="flex items-center">
                <Mail size={14} className="mr-1" />
                {item.providerEmail}
              </span>
              {item.providerPhone && (
                <span className="flex items-center">
                  <Phone size={14} className="mr-1" />
                  {item.providerPhone}
                </span>
              )}
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div className="flex items-center justify-end">
              <Calendar size={14} className="mr-1" />
              {formatDate(item.submittedAt)}
            </div>
            {item.assignedToName && (
              <div className="flex items-center justify-end mt-1">
                <UserCheck size={14} className="mr-1" />
                {item.assignedToName}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'info'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <User size={16} className="inline mr-2" />
              {t('personalInfo')}
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'documents'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText size={16} className="inline mr-2" />
              {t('documents')}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <History size={16} className="inline mr-2" />
              {t('validationHistory')}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bio */}
              <div className="md:col-span-2">
                <h4 className="font-medium text-gray-900 mb-2">{t('bio')}</h4>
                <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {item.bio || <span className="italic text-gray-400">{t('notProvided')}</span>}
                </p>
              </div>

              {/* Specializations */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">{t('specializations')}</h4>
                {item.specializations?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {item.specializations.map((spec, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                        {spec}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 italic">{t('notProvided')}</p>
                )}
              </div>

              {/* Languages */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">{t('languages')}</h4>
                {item.languages?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {item.languages.map((lang, idx) => (
                      <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full flex items-center">
                        <Languages size={12} className="mr-1" />
                        {lang}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 italic">{t('notProvided')}</p>
                )}
              </div>

              {/* Location */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">{t('location')}</h4>
                <div className="flex items-center text-gray-600">
                  <MapPin size={16} className="mr-2" />
                  {item.city && item.country ? `${item.city}, ${item.country}` : item.country || t('notProvided')}
                </div>
              </div>

              {/* Experience */}
              {item.yearsExperience !== undefined && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">{t('experience')}</h4>
                  <div className="flex items-center text-gray-600">
                    <Award size={16} className="mr-2" />
                    {item.yearsExperience} {t('years')}
                  </div>
                </div>
              )}

              {/* Bar Association (for lawyers) */}
              {item.providerType === 'lawyer' && item.barAssociation && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">{t('barAssociation')}</h4>
                  <div className="flex items-center text-gray-600">
                    <Scale size={16} className="mr-2" />
                    {item.barAssociation}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* KYC Documents */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">{t('kycDocuments')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">{t('idDocument')}</p>
                    {item.kycDocuments?.idDocument ? (
                      <a
                        href={item.kycDocuments.idDocument}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                      >
                        <ExternalLink size={14} className="mr-1" />
                        {t('viewDocument')}
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm italic">{t('notProvided')}</span>
                    )}
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">{t('proofOfAddress')}</p>
                    {item.kycDocuments?.proofOfAddress ? (
                      <a
                        href={item.kycDocuments.proofOfAddress}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                      >
                        <ExternalLink size={14} className="mr-1" />
                        {t('viewDocument')}
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm italic">{t('notProvided')}</span>
                    )}
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">{t('professionalLicense')}</p>
                    {item.kycDocuments?.professionalLicense ? (
                      <a
                        href={item.kycDocuments.professionalLicense}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                      >
                        <ExternalLink size={14} className="mr-1" />
                        {t('viewDocument')}
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm italic">{t('notProvided')}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Other Documents */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">{t('documents')}</h4>
                {item.documents?.length ? (
                  <div className="space-y-2">
                    {item.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <FileText size={20} className="text-gray-400 mr-3" />
                          <div>
                            <p className="font-medium text-gray-900">{doc.name}</p>
                            <p className="text-xs text-gray-500">{doc.type} - {formatDate(doc.uploadedAt)}</p>
                          </div>
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink size={18} />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 italic">{t('noDocuments')}</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              {item.validationHistory?.length ? (
                <div className="space-y-4">
                  {item.validationHistory.map((entry, idx) => (
                    <div key={idx} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`p-2 rounded-full ${
                        entry.action === 'approved' ? 'bg-green-100' :
                        entry.action === 'rejected' ? 'bg-red-100' :
                        entry.action === 'changes_requested' ? 'bg-orange-100' :
                        'bg-blue-100'
                      }`}>
                        {entry.action === 'approved' && <CheckCircle size={16} className="text-green-600" />}
                        {entry.action === 'rejected' && <XCircle size={16} className="text-red-600" />}
                        {entry.action === 'changes_requested' && <Edit3 size={16} className="text-orange-600" />}
                        {entry.action === 'assigned' && <UserCheck size={16} className="text-blue-600" />}
                        {entry.action === 'submitted' && <Send size={16} className="text-blue-600" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 capitalize">{entry.action.replace('_', ' ')}</p>
                        <p className="text-sm text-gray-600">
                          {t('actionBy')} {entry.byName} - {t('actionAt')} {formatDate(entry.at)}
                        </p>
                        {entry.reason && (
                          <p className="text-sm text-gray-500 mt-1 italic">"{entry.reason}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 italic text-center py-8">{t('notProvided')}</p>
              )}
            </div>
          )}
        </div>

        {/* Action Section */}
        {canPerformActions && actionMode === 'none' && (
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              {t('close')}
            </button>
            <button
              onClick={() => setActionMode('changes')}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center"
            >
              <Edit3 size={16} className="mr-2" />
              {t('requestChanges')}
            </button>
            <button
              onClick={() => setActionMode('reject')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
            >
              <XCircle size={16} className="mr-2" />
              {t('reject')}
            </button>
            <button
              onClick={() => setActionMode('approve')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
            >
              <CheckCircle size={16} className="mr-2" />
              {t('approve')}
            </button>
          </div>
        )}

        {/* Approve/Reject Form */}
        {(actionMode === 'approve' || actionMode === 'reject') && (
          <div className="pt-4 border-t border-gray-200 space-y-4">
            <div className={`p-4 rounded-lg ${actionMode === 'approve' ? 'bg-green-50' : 'bg-red-50'}`}>
              <h4 className="font-medium mb-3">
                {actionMode === 'approve' ? t('approveConfirm') : t('rejectConfirm')}
              </h4>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('reason')}</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('reasonPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => { setActionMode('none'); setReason(''); }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={isProcessing}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSubmitAction}
                disabled={isProcessing || (actionMode === 'reject' && !reason.trim())}
                className={`px-4 py-2 text-white rounded-lg flex items-center ${
                  actionMode === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'
                    : 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    {t('processing')}
                  </>
                ) : (
                  <>
                    {actionMode === 'approve' ? <Check size={16} className="mr-2" /> : <X size={16} className="mr-2" />}
                    {t('confirm')}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Request Changes Form */}
        {actionMode === 'changes' && (
          <div className="pt-4 border-t border-gray-200 space-y-4">
            <div className="p-4 bg-orange-50 rounded-lg">
              <h4 className="font-medium mb-3">{t('requestChangesConfirm')}</h4>

              {/* Existing changes */}
              {changes.length > 0 && (
                <div className="space-y-2 mb-4">
                  {changes.map((change, idx) => (
                    <div key={idx} className="flex items-start justify-between p-2 bg-white rounded border">
                      <div>
                        <span className="font-medium text-sm">{fieldOptions.find(f => f.value === change.field)?.label || change.field}:</span>
                        <p className="text-sm text-gray-600">{change.message}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveChange(idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new change */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <select
                    value={newChangeField}
                    onChange={(e) => setNewChangeField(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">{t('selectField')}</option>
                    {fieldOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={newChangeMessage}
                  onChange={(e) => setNewChangeMessage(e.target.value)}
                  placeholder={t('changesPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  rows={2}
                />
                <button
                  onClick={handleAddChange}
                  disabled={!newChangeField || !newChangeMessage.trim()}
                  className="px-4 py-2 bg-orange-100 text-orange-800 rounded-lg hover:bg-orange-200 disabled:opacity-50 flex items-center"
                >
                  <MessageSquare size={16} className="mr-2" />
                  {t('addChange')}
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => { setActionMode('none'); setChanges([]); }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={isProcessing}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSubmitAction}
                disabled={isProcessing || changes.length === 0}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-orange-400 flex items-center"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    {t('processing')}
                  </>
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    {t('send')}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Closed profile - just show close button */}
        {!canPerformActions && (
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              {t('close')}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

// ============ MAIN COMPONENT ============
const AdminProfileValidation: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // Language
  const [lang] = useState<Lang>(() => (localStorage.getItem('admin_lang') as Lang) || detectLang());
  const t = useMemo(() => tFor(lang), [lang]);

  // Data
  const [queue, setQueue] = useState<ValidationItem[]>([]);
  const [stats, setStats] = useState<ValidationStats>({
    pending: 0,
    inReview: 0,
    approvedToday: 0,
    rejectedToday: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [filters, setFilters] = useState<ValidationFilters>({
    status: 'all',
    providerType: 'all',
    assignedTo: '',
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal
  const [selectedItem, setSelectedItem] = useState<ValidationItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-clear notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Cloud Functions
  const getValidationQueue = httpsCallable<{ filters: ValidationFilters }, { items: ValidationItem[]; stats: ValidationStats }>(functions, 'getValidationQueue');
  const assignValidation = httpsCallable<{ validationId: string }, { success: boolean }>(functions, 'assignValidation');
  const approveProfile = httpsCallable<{ validationId: string; reason: string }, { success: boolean }>(functions, 'approveProfile');
  const rejectProfile = httpsCallable<{ validationId: string; reason: string }, { success: boolean }>(functions, 'rejectProfile');
  const requestChanges = httpsCallable<{ validationId: string; changes: { field: string; message: string }[] }, { success: boolean }>(functions, 'requestChanges');

  // Load queue
  const loadQueue = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    }

    try {
      const result = await getValidationQueue({ filters });
      setQueue(result.data.items);
      setStats(result.data.stats);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading validation queue:', error);
      logError({
        origin: 'frontend',
        error: `Error loading validation queue: ${(error as Error).message}`,
        context: { component: 'AdminProfileValidation' },
      });
      setIsLoading(false);
      // Fallback: show empty state
      setQueue([]);
    } finally {
      if (showRefreshIndicator) {
        setIsRefreshing(false);
      }
    }
  }, [filters, getValidationQueue]);

  // Initial load
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
      return;
    }
    loadQueue();
  }, [currentUser, navigate, loadQueue]);

  // Reload when filters change
  useEffect(() => {
    if (currentUser && currentUser.role === 'admin') {
      loadQueue();
    }
  }, [filters, loadQueue, currentUser]);

  // Filter and search
  const filteredQueue = useMemo(() => {
    let result = queue;

    // Search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.providerName.toLowerCase().includes(search) ||
          item.providerEmail.toLowerCase().includes(search)
      );
    }

    return result;
  }, [queue, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredQueue.length / itemsPerPage);
  const paginatedQueue = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredQueue.slice(start, start + itemsPerPage);
  }, [filteredQueue, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm]);

  // Handlers
  const handleAssign = async (validationId: string) => {
    try {
      setIsProcessing(true);
      await assignValidation({ validationId });
      setNotification({ type: 'success', message: t('assignedSuccess') });
      loadQueue();
    } catch (error) {
      console.error('Error assigning validation:', error);
      setNotification({ type: 'error', message: t('error') });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async (validationId: string, reason: string) => {
    try {
      setIsProcessing(true);
      await approveProfile({ validationId, reason });
      setNotification({ type: 'success', message: t('profileApproved') });
      setIsModalOpen(false);
      setSelectedItem(null);
      loadQueue();
    } catch (error) {
      console.error('Error approving profile:', error);
      setNotification({ type: 'error', message: t('error') });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (validationId: string, reason: string) => {
    try {
      setIsProcessing(true);
      await rejectProfile({ validationId, reason });
      setNotification({ type: 'success', message: t('profileRejected') });
      setIsModalOpen(false);
      setSelectedItem(null);
      loadQueue();
    } catch (error) {
      console.error('Error rejecting profile:', error);
      setNotification({ type: 'error', message: t('error') });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestChanges = async (validationId: string, changes: { field: string; message: string }[]) => {
    try {
      setIsProcessing(true);
      await requestChanges({ validationId, changes });
      setNotification({ type: 'success', message: t('changesRequestedSuccess') });
      setIsModalOpen(false);
      setSelectedItem(null);
      loadQueue();
    } catch (error) {
      console.error('Error requesting changes:', error);
      setNotification({ type: 'error', message: t('error') });
    } finally {
      setIsProcessing(false);
    }
  };

  const openReviewModal = (item: ValidationItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('loading')}</p>
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
            Une erreur est survenue lors du chargement de la page.
          </div>
        }
      >
        {/* Notification */}
        {notification && (
          <div
            className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-3 ${
              notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <AlertTriangle size={20} />
            )}
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-4">
              <X size={18} />
            </button>
          </div>
        )}

        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <ClipboardCheck className="mr-3 text-red-600" size={28} />
                {t('pageTitle')}
              </h1>
              <p className="text-gray-600 mt-1">{t('pageSubtitle')}</p>
            </div>
            <button
              onClick={() => loadQueue(true)}
              disabled={isRefreshing}
              className="p-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              title={t('refresh')}
            >
              <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              title={t('pending')}
              value={stats.pending}
              icon={Clock}
              color="bg-yellow-500"
            />
            <StatCard
              title={t('inReview')}
              value={stats.inReview}
              icon={Eye}
              color="bg-blue-500"
            />
            <StatCard
              title={t('approvedToday')}
              value={stats.approvedToday}
              icon={CheckCircle}
              color="bg-green-500"
            />
            <StatCard
              title={t('rejectedToday')}
              value={stats.rejectedToday}
              icon={XCircle}
              color="bg-red-500"
            />
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Filter size={16} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Filtres:</span>
              </div>

              {/* Status filter */}
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as ValidationStatus | 'all' })}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
              >
                <option value="all">{t('allStatuses')}</option>
                <option value="pending">{t('pending')}</option>
                <option value="in_review">{t('inReview')}</option>
                <option value="changes_requested">{t('changesRequested')}</option>
              </select>

              {/* Provider type filter */}
              <select
                value={filters.providerType}
                onChange={(e) => setFilters({ ...filters, providerType: e.target.value as ProviderType | 'all' })}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
              >
                <option value="all">{t('allTypes')}</option>
                <option value="lawyer">{t('lawyer')}</option>
                <option value="expat">{t('expat')}</option>
              </select>

              {/* Assigned to filter */}
              <select
                value={filters.assignedTo}
                onChange={(e) => setFilters({ ...filters, assignedTo: e.target.value })}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
              >
                <option value="">{t('allAssignees')}</option>
                <option value="unassigned">{t('unassigned')}</option>
                <option value={currentUser?.uid || ''}>{t('assignedToMe')}</option>
              </select>

              <div className="flex-1"></div>

              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-4 py-1.5 border border-gray-300 rounded-md text-sm w-64"
                />
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              </div>

              <span className="text-sm text-gray-500">
                {filteredQueue.length} resultat(s)
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('providerName')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('type')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('submittedDate')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('assignedTo')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedQueue.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {item.profilePhoto ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={item.profilePhoto}
                                alt={item.providerName}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="h-5 w-5 text-gray-500" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{item.providerName}</div>
                            <div className="text-sm text-gray-500">{item.providerEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ProviderTypeBadge type={item.providerType} t={t} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar size={14} className="mr-1" />
                          {formatDate(item.submittedAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={item.status} t={t} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.assignedToName || (
                          <span className="italic text-gray-400">{t('unassigned')}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openReviewModal(item)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title={t('view')}
                          >
                            <Eye size={18} />
                          </button>
                          {!item.assignedTo && (
                            <button
                              onClick={() => handleAssign(item.id)}
                              disabled={isProcessing}
                              className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                              title={t('assign')}
                            >
                              <UserCheck size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Empty state */}
            {filteredQueue.length === 0 && (
              <div className="p-12 text-center">
                <ClipboardCheck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noResults')}</h3>
                <p className="text-gray-600">{t('noResultsDesc')}</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {t('page')} {currentPage} {t('of')} {totalPages}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft size={16} className="inline mr-1" />
                    {t('previous')}
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    {t('next')}
                    <ChevronRight size={16} className="inline ml-1" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Review Modal */}
        <ProfileReviewModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedItem(null);
          }}
          item={selectedItem}
          t={t}
          lang={lang}
          currentUserId={currentUser?.uid}
          onApprove={handleApprove}
          onReject={handleReject}
          onRequestChanges={handleRequestChanges}
          isProcessing={isProcessing}
        />
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminProfileValidation;
