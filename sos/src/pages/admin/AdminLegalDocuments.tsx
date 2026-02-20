import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Save,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,
  Edit,
  Trash,
  Plus,
  RefreshCw,
  Search,
  Globe,
  Languages,
  Upload,
  Copy
} from 'lucide-react';
import { collection, query, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useAuth } from '../../contexts/AuthContext';
import { migrateLegalDocumentsToFirestore, getAvailableDocumentsCount } from '../../services/legalDocumentsMigration';

type SupportedLanguage = 'fr' | 'en' | 'es' | 'de' | 'pt' | 'ch' | 'ar' | 'ru' | 'hi';

interface LegalDocument {
  id: string;
  title: string;
  content: string;
  type: string;
  language: SupportedLanguage;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  version: string;
}

// Types de documents légaux requis (alignés avec les pages frontend)
const getDocumentTypes = (intl: ReturnType<typeof import('react-intl').useIntl>) => [
  { value: 'terms', label: intl.formatMessage({ id: 'admin.legal.docType.terms', defaultMessage: 'Terms of Service - Clients' }), icon: '👤', required: true, page: '/terms-clients' },
  { value: 'terms_lawyers', label: intl.formatMessage({ id: 'admin.legal.docType.terms_lawyers', defaultMessage: 'Terms of Service - Lawyers' }), icon: '⚖️', required: true, page: '/terms-lawyers' },
  { value: 'terms_expats', label: intl.formatMessage({ id: 'admin.legal.docType.terms_expats', defaultMessage: 'Terms of Service - Expat Helpers' }), icon: '🌍', required: true, page: '/terms-expats' },
  { value: 'privacy', label: intl.formatMessage({ id: 'admin.legal.docType.privacy', defaultMessage: 'Privacy Policy' }), icon: '🔒', required: true, page: '/privacy' },
  { value: 'cookies', label: intl.formatMessage({ id: 'admin.legal.docType.cookies', defaultMessage: 'Cookie Policy' }), icon: '🍪', required: true, page: '/cookies' },
  { value: 'legal', label: intl.formatMessage({ id: 'admin.legal.docType.legal', defaultMessage: 'Legal Notice / Consumer Rights' }), icon: '📜', required: true, page: '/consumers' },
];

const supportedLanguages: { value: SupportedLanguage; label: string; flag: string }[] = [
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'pt', label: 'Português', flag: '🇵🇹' },
  { value: 'ch', label: '中文', flag: '🇨🇳' },
  { value: 'ar', label: 'العربية', flag: '🇸🇦' },
  { value: 'ru', label: 'Русский', flag: '🇷🇺' },
  { value: 'hi', label: 'हिन्दी', flag: '🇮🇳' }
];

type ViewMode = 'matrix' | 'list';

const AdminLegalDocuments: React.FC = () => {
  const navigate = useNavigate();
  const intl = useIntl();
  const { user: currentUser } = useAuth();

  // Translated document types
  const documentTypes = useMemo(() => getDocumentTypes(intl), [intl]);

  // États
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<LegalDocument | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('matrix');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');

  const [formData, setFormData] = useState<Partial<LegalDocument>>({
    title: '',
    content: '',
    type: 'terms',
    language: 'fr',
    isActive: true,
    version: '1.0'
  });

  const [isMigrating, setIsMigrating] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceDoc, setCopySourceDoc] = useState<LegalDocument | null>(null);
  const [copyTargetLangs, setCopyTargetLangs] = useState<SupportedLanguage[]>([]);
  const [isCopying, setIsCopying] = useState(false);

  // Statistiques
  const stats = useMemo(() => {
    const total = documents.length;
    const active = documents.filter(d => d.isActive).length;
    const required = documentTypes.filter(t => t.required).length * supportedLanguages.length;
    const existing = new Set(documents.map(d => `${d.type}_${d.language}`)).size;
    return { total, active, required, existing, missing: required - existing };
  }, [documents]);

  // Matrice type x langue
  const documentMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, LegalDocument | null>> = {};

    documentTypes.forEach(type => {
      matrix[type.value] = {};
      supportedLanguages.forEach(lang => {
        matrix[type.value][lang.value] = null;
      });
    });

    documents.forEach(doc => {
      if (matrix[doc.type]) {
        matrix[doc.type][doc.language] = doc;
      }
    });

    return matrix;
  }, [documents]);

  // Documents filtrés pour la vue liste (accent-insensitive)
  const filteredDocuments = useMemo(() => {
    const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return documents.filter(doc => {
      if (searchTerm) {
        const search = strip(searchTerm);
        if (!strip(doc.title).includes(search) &&
            !strip(doc.content).includes(search)) {
          return false;
        }
      }
      if (filterType !== 'all' && doc.type !== filterType) return false;
      if (filterLanguage !== 'all' && doc.language !== filterLanguage) return false;
      return true;
    });
  }, [documents, searchTerm, filterType, filterLanguage]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
      return;
    }
    loadDocuments();
  }, [currentUser, navigate]);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);

      const documentsQuery = query(
        collection(db, 'legal_documents'),
        orderBy('updatedAt', 'desc')
      );

      const documentsSnapshot = await getDocs(documentsQuery);

      const documentsData = documentsSnapshot.docs.map(docSnap => ({
        ...docSnap.data(),
        id: docSnap.id,
        createdAt: docSnap.data().createdAt?.toDate() || new Date(),
        updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
        publishedAt: docSnap.data().publishedAt?.toDate()
      })) as LegalDocument[];

      setDocuments(documentsData);

    } catch (error) {
      console.error('Error loading legal documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDocument = (type?: string, language?: SupportedLanguage) => {
    const docType = documentTypes.find(t => t.value === type);
    setIsCreating(true);
    setFormData({
      title: docType ? `${docType.label} - ${supportedLanguages.find(l => l.value === language)?.label || ''}` : '',
      content: '',
      type: type || 'terms_clients',
      language: language || 'fr',
      isActive: true,
      version: '1.0'
    });
    setShowEditModal(true);
  };

  const handleEditDocument = (document: LegalDocument) => {
    setIsCreating(false);
    setSelectedDocument(document);
    setFormData({
      title: document.title,
      content: document.content,
      type: document.type,
      language: document.language,
      isActive: document.isActive,
      version: document.version
    });
    setShowEditModal(true);
  };

  const handleDuplicateDocument = (document: LegalDocument, targetLanguage: SupportedLanguage) => {
    setIsCreating(true);
    const targetLang = supportedLanguages.find(l => l.value === targetLanguage);
    setFormData({
      title: document.title.replace(/- \w+$/, `- ${targetLang?.label || targetLanguage}`),
      content: document.content,
      type: document.type,
      language: targetLanguage,
      isActive: false,
      version: '1.0'
    });
    setShowEditModal(true);
  };

  const handleOpenCopyModal = (document: LegalDocument) => {
    setCopySourceDoc(document);
    // Trouver les langues qui n'ont pas encore ce type de document
    const existingLangs = documents
      .filter(d => d.type === document.type)
      .map(d => d.language);
    const missingLangs = supportedLanguages
      .filter(lang => !existingLangs.includes(lang.value))
      .map(lang => lang.value);
    setCopyTargetLangs(missingLangs);
    setShowCopyModal(true);
  };

  const handleCopyToLanguages = async () => {
    if (!copySourceDoc || copyTargetLangs.length === 0) return;

    try {
      setIsCopying(true);

      for (const targetLang of copyTargetLangs) {
        const docId = `${copySourceDoc.type}_${targetLang}`;
        const targetLangInfo = supportedLanguages.find(l => l.value === targetLang);

        await setDoc(doc(db, 'legal_documents', docId), {
          title: copySourceDoc.title.replace(/- [^-]+$/, `- ${targetLangInfo?.label || targetLang}`),
          content: copySourceDoc.content,
          type: copySourceDoc.type,
          language: targetLang,
          isActive: false, // Brouillon par défaut pour permettre la traduction
          version: '1.0',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          copiedFrom: copySourceDoc.id
        });
      }

      await loadDocuments();
      setShowCopyModal(false);
      setCopySourceDoc(null);
      setCopyTargetLangs([]);
      toast.success(`Document copié vers ${copyTargetLangs.length} langue(s) avec succès. N'oubliez pas de traduire le contenu !`);

    } catch (error) {
      console.error('Error copying document:', error);
      toast.error('Erreur lors de la copie du document');
    } finally {
      setIsCopying(false);
    }
  };

  const toggleCopyTargetLang = (lang: SupportedLanguage) => {
    setCopyTargetLangs(prev =>
      prev.includes(lang)
        ? prev.filter(l => l !== lang)
        : [...prev, lang]
    );
  };

  const handlePreviewDocument = (document: LegalDocument) => {
    setSelectedDocument(document);
    setShowPreviewModal(true);
  };

  const handleDeleteDocument = (document: LegalDocument) => {
    setSelectedDocument(document);
    setShowDeleteModal(true);
  };

  const handleSaveDocument = async () => {
    try {
      setIsActionLoading(true);

      if (!formData.title || !formData.content || !formData.type || !formData.language) {
        toast.error('Veuillez remplir tous les champs obligatoires');
        return;
      }

      if (isCreating) {
        const docId = `${formData.type}_${formData.language}`;

        await setDoc(doc(db, 'legal_documents', docId), {
          title: formData.title,
          content: formData.content,
          type: formData.type,
          language: formData.language,
          isActive: formData.isActive,
          version: formData.version,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          publishedAt: formData.isActive ? serverTimestamp() : null
        });

      } else if (selectedDocument) {
        await updateDoc(doc(db, 'legal_documents', selectedDocument.id), {
          title: formData.title,
          content: formData.content,
          type: formData.type,
          language: formData.language,
          isActive: formData.isActive,
          version: formData.version,
          updatedAt: serverTimestamp(),
          publishedAt: formData.isActive && !selectedDocument.publishedAt ? serverTimestamp() : selectedDocument.publishedAt
        });
      }

      await loadDocuments();
      setShowEditModal(false);
      setSelectedDocument(null);
      toast.success(isCreating ? 'Document créé avec succès' : 'Document mis à jour avec succès');

    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Erreur lors de l\'enregistrement du document');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedDocument) return;

    try {
      setIsActionLoading(true);
      await deleteDoc(doc(db, 'legal_documents', selectedDocument.id));
      await loadDocuments();
      setShowDeleteModal(false);
      setSelectedDocument(null);
      toast.success('Document supprimé avec succès');

    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Erreur lors de la suppression du document');
    } finally {
      setIsActionLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getDocumentTypeName = (type: string) => {
    const docType = documentTypes.find(t => t.value === type);
    return docType ? docType.label : type;
  };

  const handleMigration = async () => {
    try {
      setIsMigrating(true);
      const result = await migrateLegalDocumentsToFirestore();

      if (result.success) {
        toast.success(`Migration réussie ! ${result.created} documents créés, ${result.skipped} existants ignorés`);
        await loadDocuments();
      } else {
        toast.error(`Migration terminée avec des erreurs:\n${result.errors.join('\n')}`);
      }

      setShowMigrationModal(false);
    } catch (error) {
      console.error('Migration error:', error);
      toast.error('Erreur lors de la migration');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <AdminLayout>
      <ErrorBoundary fallback={<div className="p-8 text-center">{intl.formatMessage({ id: 'admin.legal.error', defaultMessage: 'An error occurred. Please try again.' })}</div>}>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{intl.formatMessage({ id: 'admin.legal.title', defaultMessage: 'Legal Documents' })}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {stats.total} documents - {stats.active} {intl.formatMessage({ id: 'admin.legal.stats.active', defaultMessage: 'active' })} - {stats.missing > 0 && (
                  <span className="text-orange-600 font-medium">{stats.missing} {intl.formatMessage({ id: 'admin.legal.stats.missing', defaultMessage: 'missing' })}</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowMigrationModal(true)}
                variant="outline"
                className="border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                <Upload size={16} className="mr-2" />
                {stats.total === 0 ? intl.formatMessage({ id: 'admin.legal.actions.import', defaultMessage: 'Import documents' }) : intl.formatMessage({ id: 'admin.legal.actions.complete', defaultMessage: 'Complete documents' })}
              </Button>
              <Button
                onClick={loadDocuments}
                variant="outline"
                disabled={isLoading}
              >
                <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {intl.formatMessage({ id: 'admin.legal.actions.refresh', defaultMessage: 'Refresh' })}
              </Button>
              <Button
                onClick={() => handleCreateDocument()}
                className="bg-red-600 hover:bg-red-700"
              >
                <Plus size={16} className="mr-2" />
                {intl.formatMessage({ id: 'admin.legal.actions.new', defaultMessage: 'New document' })}
              </Button>
            </div>
          </div>

          {/* Statistiques rapides */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'admin.legal.stats.total', defaultMessage: 'Total' })}</p>
                  <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'admin.legal.stats.activeLabel', defaultMessage: 'Active' })}</p>
                  <p className="text-xl font-bold text-green-600">{stats.active}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Languages className="h-5 w-5 text-purple-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'admin.legal.stats.languages', defaultMessage: 'Languages' })}</p>
                  <p className="text-xl font-bold text-gray-900">{supportedLanguages.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${stats.missing > 0 ? 'bg-orange-100' : 'bg-green-100'}`}>
                  <AlertTriangle className={`h-5 w-5 ${stats.missing > 0 ? 'text-orange-600' : 'text-green-600'}`} />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'admin.legal.stats.missingLabel', defaultMessage: 'Missing' })}</p>
                  <p className={`text-xl font-bold ${stats.missing > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {stats.missing}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contrôles de vue */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex gap-2">
                <Button
                  onClick={() => setViewMode('matrix')}
                  variant={viewMode === 'matrix' ? 'primary' : 'outline'}
                  size="small"
                >
                  <Globe size={16} className="mr-2" />
                  {intl.formatMessage({ id: 'admin.legal.view.matrix', defaultMessage: 'Matrix View' })}
                </Button>
                <Button
                  onClick={() => setViewMode('list')}
                  variant={viewMode === 'list' ? 'primary' : 'outline'}
                  size="small"
                >
                  <FileText size={16} className="mr-2" />
                  {intl.formatMessage({ id: 'admin.legal.view.list', defaultMessage: 'List View' })}
                </Button>
              </div>

              {viewMode === 'list' && (
                <div className="flex flex-wrap gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={intl.formatMessage({ id: 'admin.legal.filter.search', defaultMessage: 'Search...' })}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  </div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="all">{intl.formatMessage({ id: 'admin.legal.filter.allTypes', defaultMessage: 'All types' })}</option>
                    {documentTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
                    ))}
                  </select>
                  <select
                    value={filterLanguage}
                    onChange={(e) => setFilterLanguage(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="all">{intl.formatMessage({ id: 'admin.legal.filter.allLanguages', defaultMessage: 'All languages' })}</option>
                    {supportedLanguages.map(lang => (
                      <option key={lang.value} value={lang.value}>{lang.flag} {lang.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Vue Matrice */}
          {viewMode === 'matrix' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                        {intl.formatMessage({ id: 'admin.legal.matrix.docType', defaultMessage: 'Document Type' })}
                      </th>
                      {supportedLanguages.map(lang => (
                        <th key={lang.value} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                          <div className="flex flex-col items-center">
                            <span className="text-lg">{lang.flag}</span>
                            <span className="mt-1">{lang.label}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {isLoading ? (
                      <tr>
                        <td colSpan={supportedLanguages.length + 1} className="px-4 py-8 text-center">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                          </div>
                          <p className="mt-2 text-gray-500">{intl.formatMessage({ id: 'admin.legal.loading', defaultMessage: 'Loading...' })}</p>
                        </td>
                      </tr>
                    ) : (
                      documentTypes.map(type => {
                        // Calculer combien de langues sont remplies pour ce type
                        const filledCount = supportedLanguages.filter(
                          lang => documentMatrix[type.value]?.[lang.value] !== null
                        ).length;
                        const totalLangs = supportedLanguages.length;
                        const isComplete = filledCount === totalLangs;

                        return (
                        <tr key={type.value} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                            <div className="flex items-center">
                              <span className="text-xl mr-2">{type.icon}</span>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{type.label}</p>
                                {type.required ? (
                                  isComplete ? (
                                    <span className="text-xs text-green-600">{intl.formatMessage({ id: 'admin.legal.matrix.complete', defaultMessage: 'Complete' })} ({filledCount}/{totalLangs})</span>
                                  ) : (
                                    <span className="text-xs text-orange-600">{intl.formatMessage({ id: 'admin.legal.matrix.required', defaultMessage: 'Required' })} ({filledCount}/{totalLangs})</span>
                                  )
                                ) : (
                                  <span className="text-xs text-gray-500">{intl.formatMessage({ id: 'admin.legal.matrix.optional', defaultMessage: 'Optional' })} ({filledCount}/{totalLangs})</span>
                                )}
                              </div>
                            </div>
                          </td>
                          {supportedLanguages.map(lang => {
                            const document = documentMatrix[type.value]?.[lang.value];
                            return (
                              <td key={lang.value} className="px-4 py-4 text-center">
                                {document ? (
                                  <div className="flex flex-col items-center space-y-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                      document.isActive ? 'bg-green-100' : 'bg-gray-100'
                                    }`}>
                                      {document.isActive ? (
                                        <CheckCircle size={16} className="text-green-600" />
                                      ) : (
                                        <Clock size={16} className="text-gray-400" />
                                      )}
                                    </div>
                                    <div className="flex space-x-1">
                                      <button
                                        onClick={() => handlePreviewDocument(document)}
                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                        title="Voir"
                                      >
                                        <Eye size={14} />
                                      </button>
                                      <button
                                        onClick={() => handleEditDocument(document)}
                                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                                        title="Modifier"
                                      >
                                        <Edit size={14} />
                                      </button>
                                      <button
                                        onClick={() => handleOpenCopyModal(document)}
                                        className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                                        title="Copier vers autres langues"
                                      >
                                        <Copy size={14} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteDocument(document)}
                                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                                        title="Supprimer"
                                      >
                                        <Trash size={14} />
                                      </button>
                                    </div>
                                    <span className="text-xs text-gray-400">v{document.version}</span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleCreateDocument(type.value, lang.value)}
                                    className={`w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center transition-colors ${
                                      type.required
                                        ? 'border-orange-300 hover:border-orange-500 hover:bg-orange-50'
                                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                                    }`}
                                    title={`Créer ${type.label} en ${lang.label}`}
                                  >
                                    <Plus size={16} className={type.required ? 'text-orange-400' : 'text-gray-400'} />
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Vue Liste */}
          {viewMode === 'list' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{intl.formatMessage({ id: 'admin.legal.table.title', defaultMessage: 'Title' })}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{intl.formatMessage({ id: 'admin.legal.table.type', defaultMessage: 'Type' })}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{intl.formatMessage({ id: 'admin.legal.table.language', defaultMessage: 'Language' })}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{intl.formatMessage({ id: 'admin.legal.table.version', defaultMessage: 'Version' })}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{intl.formatMessage({ id: 'admin.legal.table.status', defaultMessage: 'Status' })}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{intl.formatMessage({ id: 'admin.legal.table.updatedAt', defaultMessage: 'Updated' })}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{intl.formatMessage({ id: 'admin.legal.table.actions', defaultMessage: 'Actions' })}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                          <p className="mt-2 text-gray-500">{intl.formatMessage({ id: 'admin.legal.loading', defaultMessage: 'Loading...' })}</p>
                        </td>
                      </tr>
                    ) : filteredDocuments.length > 0 ? (
                      filteredDocuments.map(document => {
                        const lang = supportedLanguages.find(l => l.value === document.language);
                        return (
                          <tr key={document.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <FileText className="h-5 w-5 text-gray-400 mr-2" />
                                <span className="text-sm font-medium text-gray-900">{document.title}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {getDocumentTypeName(document.type)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {lang?.flag} {lang?.label}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{document.version}</td>
                            <td className="px-6 py-4">
                              {document.isActive ? (
                                <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                  <CheckCircle size={12} className="mr-1" />
                                  {intl.formatMessage({ id: 'admin.legal.status.active', defaultMessage: 'Active' })}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                  <Clock size={12} className="mr-1" />
                                  {intl.formatMessage({ id: 'admin.legal.status.draft', defaultMessage: 'Draft' })}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {formatDate(document.updatedAt)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handlePreviewDocument(document)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                  title="Voir"
                                >
                                  <Eye size={18} />
                                </button>
                                <button
                                  onClick={() => handleEditDocument(document)}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                                  title="Modifier"
                                >
                                  <Edit size={18} />
                                </button>
                                <button
                                  onClick={() => handleOpenCopyModal(document)}
                                  className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                                  title="Copier vers autres langues"
                                >
                                  <Copy size={18} />
                                </button>
                                <button
                                  onClick={() => handleDeleteDocument(document)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  title="Supprimer"
                                >
                                  <Trash size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                          <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                          <p>{intl.formatMessage({ id: 'admin.legal.noDocuments', defaultMessage: 'No documents found' })}</p>
                          <Button
                            onClick={() => handleCreateDocument()}
                            className="mt-4 bg-red-600 hover:bg-red-700"
                          >
                            <Plus size={16} className="mr-2" />
                            {intl.formatMessage({ id: 'admin.legal.actions.create', defaultMessage: 'Create document' })}
                          </Button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Édition */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title={isCreating ? intl.formatMessage({ id: 'admin.legal.modal.newDocument', defaultMessage: 'New legal document' }) : intl.formatMessage({ id: 'admin.legal.modal.editDocument', defaultMessage: 'Edit document' })}
          size="large"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{intl.formatMessage({ id: 'admin.legal.form.title', defaultMessage: 'Title' })} *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder={intl.formatMessage({ id: 'admin.legal.form.titlePlaceholder', defaultMessage: 'e.g., Terms of Service - English' })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{intl.formatMessage({ id: 'admin.legal.form.type', defaultMessage: 'Type' })} *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {documentTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{intl.formatMessage({ id: 'admin.legal.form.language', defaultMessage: 'Language' })} *</label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value as SupportedLanguage }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {supportedLanguages.map(lang => (
                    <option key={lang.value} value={lang.value}>
                      {lang.flag} {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{intl.formatMessage({ id: 'admin.legal.form.version', defaultMessage: 'Version' })} *</label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="1.0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{intl.formatMessage({ id: 'admin.legal.form.content', defaultMessage: 'Content' })} *</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                rows={15}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-sm"
                placeholder={intl.formatMessage({ id: 'admin.legal.form.contentPlaceholder', defaultMessage: 'Document content (Markdown supported)' })}
              />
              <p className="text-xs text-gray-500 mt-1">{intl.formatMessage({ id: 'admin.legal.form.markdownSupported', defaultMessage: 'Markdown format supported' })}</p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                {intl.formatMessage({ id: 'admin.legal.form.publishNow', defaultMessage: 'Publish immediately (active on site)' })}
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button onClick={() => setShowEditModal(false)} variant="outline" disabled={isActionLoading}>
                {intl.formatMessage({ id: 'admin.legal.actions.cancel', defaultMessage: 'Cancel' })}
              </Button>
              <Button onClick={handleSaveDocument} className="bg-red-600 hover:bg-red-700" loading={isActionLoading}>
                <Save size={16} className="mr-2" />
                {isCreating ? intl.formatMessage({ id: 'admin.legal.actions.create', defaultMessage: 'Create' }) : intl.formatMessage({ id: 'admin.legal.actions.save', defaultMessage: 'Save' })}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal Prévisualisation */}
        <Modal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          title={intl.formatMessage({ id: 'admin.legal.modal.preview', defaultMessage: 'Preview' })}
          size="large"
        >
          {selectedDocument && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">{selectedDocument.title}</h3>
                  <p className="text-sm text-gray-500">
                    {getDocumentTypeName(selectedDocument.type)} - v{selectedDocument.version}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  selectedDocument.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {selectedDocument.isActive ? intl.formatMessage({ id: 'admin.legal.status.active', defaultMessage: 'Active' }) : intl.formatMessage({ id: 'admin.legal.status.draft', defaultMessage: 'Draft' })}
                </span>
              </div>

              <div className="border border-gray-200 rounded-lg p-6 bg-white max-h-96 overflow-y-auto">
                <div className="prose max-w-none whitespace-pre-wrap">
                  {selectedDocument.content}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button onClick={() => setShowPreviewModal(false)} variant="outline">{intl.formatMessage({ id: 'admin.legal.actions.close', defaultMessage: 'Close' })}</Button>
                <Button onClick={() => { setShowPreviewModal(false); handleEditDocument(selectedDocument); }}>
                  <Edit size={16} className="mr-2" />
                  {intl.formatMessage({ id: 'admin.legal.actions.edit', defaultMessage: 'Edit' })}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal Suppression */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title={intl.formatMessage({ id: 'admin.legal.modal.confirmDelete', defaultMessage: 'Confirm deletion' })}
          size="small"
        >
          {selectedDocument && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{intl.formatMessage({ id: 'admin.legal.modal.irreversible', defaultMessage: 'Irreversible action' })}</h3>
                    <p className="mt-2 text-sm text-red-700">
                      {intl.formatMessage({ id: 'admin.legal.modal.deleteConfirm', defaultMessage: 'Delete:' })} <strong>{selectedDocument.title}</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button onClick={() => setShowDeleteModal(false)} variant="outline" disabled={isActionLoading}>
                  {intl.formatMessage({ id: 'admin.legal.actions.cancel', defaultMessage: 'Cancel' })}
                </Button>
                <Button onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700" loading={isActionLoading}>
                  {intl.formatMessage({ id: 'admin.legal.actions.delete', defaultMessage: 'Delete' })}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal Migration */}
        <Modal
          isOpen={showMigrationModal}
          onClose={() => setShowMigrationModal(false)}
          title={intl.formatMessage({ id: 'admin.legal.modal.import', defaultMessage: 'Import legal documents' })}
          size="small"
        >
          {(() => {
            const availableData = getAvailableDocumentsCount();
            return (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <Upload className="h-5 w-5 text-blue-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      {intl.formatMessage({ id: 'admin.legal.modal.importCount', defaultMessage: 'Import {count} legal documents' }, { count: availableData.total })}
                    </h3>
                    <p className="mt-2 text-sm text-blue-700">
                      {intl.formatMessage({ id: 'admin.legal.modal.importDesc', defaultMessage: 'This action will create missing documents in Firestore. Existing documents will not be modified.' })}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-white rounded p-2">
                        <p className="font-medium text-gray-700">{intl.formatMessage({ id: 'admin.legal.modal.byType', defaultMessage: 'By type:' })}</p>
                        <ul className="text-blue-600">
                          <li>{intl.formatMessage({ id: 'admin.legal.docType.terms', defaultMessage: 'Terms - Clients' })}: {availableData.byType['terms'] || 0} {intl.formatMessage({ id: 'admin.legal.modal.languages', defaultMessage: 'languages' })}</li>
                          <li>{intl.formatMessage({ id: 'admin.legal.docType.terms_lawyers', defaultMessage: 'Terms - Lawyers' })}: {availableData.byType['terms_lawyers'] || 0} {intl.formatMessage({ id: 'admin.legal.modal.languages', defaultMessage: 'languages' })}</li>
                          <li>{intl.formatMessage({ id: 'admin.legal.docType.terms_expats', defaultMessage: 'Terms - Expats' })}: {availableData.byType['terms_expats'] || 0} {intl.formatMessage({ id: 'admin.legal.modal.languages', defaultMessage: 'languages' })}</li>
                          <li>{intl.formatMessage({ id: 'admin.legal.docType.cookies', defaultMessage: 'Cookies' })}: {availableData.byType['cookies'] || 0} {intl.formatMessage({ id: 'admin.legal.modal.languages', defaultMessage: 'languages' })}</li>
                          <li>{intl.formatMessage({ id: 'admin.legal.docType.legal', defaultMessage: 'Legal Notice' })}: {availableData.byType['legal'] || 0} {intl.formatMessage({ id: 'admin.legal.modal.languages', defaultMessage: 'languages' })}</li>
                          <li>{intl.formatMessage({ id: 'admin.legal.docType.privacy', defaultMessage: 'Privacy' })}: {availableData.byType['privacy'] || 0} {intl.formatMessage({ id: 'admin.legal.modal.languages', defaultMessage: 'languages' })}</li>
                        </ul>
                      </div>
                      <div className="bg-white rounded p-2">
                        <p className="font-medium text-gray-700">{intl.formatMessage({ id: 'admin.legal.modal.byLanguage', defaultMessage: 'By language:' })}</p>
                        <ul className="text-blue-600">
                          {Object.entries(availableData.byLanguage).map(([lang, count]) => (
                            <li key={lang}>{lang.toUpperCase()}: {count} docs</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button onClick={() => setShowMigrationModal(false)} variant="outline" disabled={isMigrating}>
                  {intl.formatMessage({ id: 'admin.legal.actions.cancel', defaultMessage: 'Cancel' })}
                </Button>
                <Button onClick={handleMigration} className="bg-blue-600 hover:bg-blue-700" loading={isMigrating}>
                  <Upload size={16} className="mr-2" />
                  {intl.formatMessage({ id: 'admin.legal.modal.importButton', defaultMessage: 'Import {count} documents' }, { count: availableData.total })}
                </Button>
              </div>
            </div>
            );
          })()}
        </Modal>

        {/* Modal Copie vers autres langues */}
        <Modal
          isOpen={showCopyModal}
          onClose={() => setShowCopyModal(false)}
          title={intl.formatMessage({ id: 'admin.legal.modal.copyToLanguages', defaultMessage: 'Copy to other languages' })}
          size="small"
        >
          {copySourceDoc && (() => {
            const existingLangs = documents
              .filter(d => d.type === copySourceDoc.type)
              .map(d => d.language);
            const allMissingLangs = supportedLanguages
              .filter(lang => !existingLangs.includes(lang.value));

            return (
              <div className="space-y-4">
                <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                  <div className="flex items-start">
                    <Copy className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-purple-800">
                        {intl.formatMessage({ id: 'admin.legal.modal.duplicate', defaultMessage: 'Duplicate "{title}"' }, { title: copySourceDoc.title })}
                      </h3>
                      <p className="mt-1 text-sm text-purple-700">
                        {intl.formatMessage({ id: 'admin.legal.modal.copyDesc', defaultMessage: 'Content will be copied to selected languages. Documents will be created as drafts to allow translation.' })}
                      </p>
                    </div>
                  </div>
                </div>

                {allMissingLangs.length > 0 ? (
                  <>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        {intl.formatMessage({ id: 'admin.legal.modal.selectTargetLangs', defaultMessage: 'Select target languages:' })}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {supportedLanguages.map(lang => {
                          const alreadyExists = existingLangs.includes(lang.value);
                          const isSelected = copyTargetLangs.includes(lang.value);
                          return (
                            <label
                              key={lang.value}
                              className={`flex items-center p-2 rounded-lg border cursor-pointer transition-colors ${
                                alreadyExists
                                  ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                                  : isSelected
                                    ? 'bg-purple-50 border-purple-400'
                                    : 'bg-white border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={alreadyExists}
                                onChange={() => !alreadyExists && toggleCopyTargetLang(lang.value)}
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded disabled:opacity-50"
                              />
                              <span className="ml-2 text-lg">{lang.flag}</span>
                              <span className="ml-2 text-sm text-gray-700">{lang.label}</span>
                              {alreadyExists && (
                                <span className="ml-auto text-xs text-green-600">{intl.formatMessage({ id: 'admin.legal.modal.exists', defaultMessage: 'Exists' })}</span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <button
                        onClick={() => setCopyTargetLangs(allMissingLangs.map(l => l.value))}
                        className="text-purple-600 hover:text-purple-800"
                      >
                        {intl.formatMessage({ id: 'admin.legal.modal.selectAll', defaultMessage: 'Select all ({count})' }, { count: allMissingLangs.length })}
                      </button>
                      <button
                        onClick={() => setCopyTargetLangs([])}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {intl.formatMessage({ id: 'admin.legal.modal.deselectAll', defaultMessage: 'Deselect all' })}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4 text-center">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-green-700">
                      {intl.formatMessage({ id: 'admin.legal.modal.allLanguagesExist', defaultMessage: 'This document already exists in all languages!' })}
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button
                    onClick={() => setShowCopyModal(false)}
                    variant="outline"
                    disabled={isCopying}
                  >
                    {intl.formatMessage({ id: 'admin.legal.actions.cancel', defaultMessage: 'Cancel' })}
                  </Button>
                  <Button
                    onClick={handleCopyToLanguages}
                    className="bg-purple-600 hover:bg-purple-700"
                    loading={isCopying}
                    disabled={copyTargetLangs.length === 0}
                  >
                    <Copy size={16} className="mr-2" />
                    {intl.formatMessage({ id: 'admin.legal.modal.copyToCount', defaultMessage: 'Copy to {count} language(s)' }, { count: copyTargetLangs.length })}
                  </Button>
                </div>
              </div>
            );
          })()}
        </Modal>
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminLegalDocuments;
