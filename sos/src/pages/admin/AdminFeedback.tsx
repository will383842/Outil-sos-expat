// src/pages/admin/AdminFeedback.tsx
// Page admin pour gérer les feedbacks utilisateurs (clients & prestataires)
import React, { useEffect, useState, useMemo } from 'react';
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy,
  Timestamp,
  limit,
  startAfter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  MessageSquare,
  Bug,
  Frown,
  Lightbulb,
  HelpCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Smartphone,
  Monitor,
  Tablet,
  User,
  Mail,
  Calendar,
  Globe,
  Search,
  X,
} from 'lucide-react';
import { useIntl } from 'react-intl';
import type {
  FeedbackType,
  FeedbackPriority,
  FeedbackStatus,
  UserRole,
  DeviceInfo,
  UserFeedback,
} from '../../services/feedback';

// ==========================================
// CONSTANTS
// ==========================================

const PAGE_SIZE = 20;

const STATUS_CONFIG: Record<FeedbackStatus, { label: string; color: string; icon: React.ElementType }> = {
  new: { label: 'Nouveau', color: 'bg-blue-100 text-blue-800', icon: Clock },
  in_progress: { label: 'En cours', color: 'bg-amber-100 text-amber-800', icon: RefreshCw },
  resolved: { label: 'Résolu', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  wont_fix: { label: 'Ne sera pas corrigé', color: 'bg-gray-100 text-gray-800', icon: XCircle },
  duplicate: { label: 'Doublon', color: 'bg-purple-100 text-purple-800', icon: Copy },
};

const TYPE_CONFIG: Record<FeedbackType, { label: string; icon: React.ElementType; color: string }> = {
  bug: { label: 'Bug technique', icon: Bug, color: 'text-red-600' },
  ux_friction: { label: 'Difficulté UX', icon: Frown, color: 'text-orange-600' },
  suggestion: { label: 'Suggestion', icon: Lightbulb, color: 'text-yellow-600' },
  other: { label: 'Autre', icon: HelpCircle, color: 'text-gray-600' },
};

const PRIORITY_CONFIG: Record<FeedbackPriority, { label: string; color: string }> = {
  blocking: { label: 'Bloquant', color: 'bg-red-100 text-red-800 border-red-300' },
  annoying: { label: 'Gênant', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  minor: { label: 'Mineur', color: 'bg-gray-100 text-gray-600 border-gray-300' },
};

const ROLE_CONFIG: Record<UserRole, { label: string; color: string }> = {
  client: { label: 'Client', color: 'bg-blue-50 text-blue-700' },
  lawyer: { label: 'Avocat', color: 'bg-purple-50 text-purple-700' },
  expat: { label: 'Expatrié', color: 'bg-green-50 text-green-700' },
  visitor: { label: 'Visiteur', color: 'bg-gray-50 text-gray-700' },
  admin: { label: 'Admin', color: 'bg-red-50 text-red-700' },
};

const DEVICE_ICONS: Record<string, React.ElementType> = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
};

// ==========================================
// COMPONENT
// ==========================================

const AdminFeedback: React.FC = () => {
  const intl = useIntl();

  // State
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<FeedbackType | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Stats
  const stats = useMemo(() => {
    const total = feedbacks.length;
    const newCount = feedbacks.filter(f => f.status === 'new').length;
    const blockingCount = feedbacks.filter(f => f.priority === 'blocking').length;
    const resolvedThisWeek = feedbacks.filter(f => {
      if (!f.resolvedAt) return false;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return f.resolvedAt.toDate() > weekAgo;
    }).length;

    return { total, newCount, blockingCount, resolvedThisWeek };
  }, [feedbacks]);

  // Load feedbacks
  const loadFeedbacks = async (reset = false) => {
    setLoading(true);
    try {
      let q = query(
        collection(db, 'user_feedback'),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );

      if (!reset && lastDoc) {
        q = query(
          collection(db, 'user_feedback'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      }

      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as UserFeedback[];

      if (reset) {
        setFeedbacks(items);
      } else {
        setFeedbacks(prev => [...prev, ...items]);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error loading feedbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update status
  const updateStatus = async (id: string, newStatus: FeedbackStatus) => {
    try {
      const ref = doc(db, 'user_feedback', id);
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updatedAt: Timestamp.now(),
      };

      if (newStatus === 'resolved') {
        updateData.resolvedAt = Timestamp.now();
      }

      await updateDoc(ref, updateData);

      setFeedbacks(prev =>
        prev.map(f =>
          f.id === id
            ? { ...f, status: newStatus, updatedAt: Timestamp.now() }
            : f
        )
      );
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Update admin notes
  const updateNotes = async (id: string, notes: string) => {
    try {
      const ref = doc(db, 'user_feedback', id);
      await updateDoc(ref, {
        adminNotes: notes,
        updatedAt: Timestamp.now(),
      });

      setFeedbacks(prev =>
        prev.map(f =>
          f.id === id ? { ...f, adminNotes: notes } : f
        )
      );
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  // Filter feedbacks
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter(f => {
      if (statusFilter !== 'all' && f.status !== statusFilter) return false;
      if (typeFilter !== 'all' && f.type !== typeFilter) return false;
      if (roleFilter !== 'all' && f.userRole !== roleFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          f.email.toLowerCase().includes(query) ||
          f.description.toLowerCase().includes(query) ||
          f.pageName?.toLowerCase().includes(query) ||
          f.userName?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [feedbacks, statusFilter, typeFilter, roleFilter, searchQuery]);

  useEffect(() => {
    loadFeedbacks(true);
  }, []);

  // Format date
  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp?.toDate) return '-';
    return timestamp.toDate().toLocaleString(intl.locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-7 h-7 text-red-600" />
              Feedbacks Utilisateurs
            </h1>
            <p className="text-gray-500 mt-1">
              Retours des clients et prestataires
            </p>
          </div>
          <button
            onClick={() => loadFeedbacks(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm">
            <p className="text-sm text-blue-600">Nouveaux</p>
            <p className="text-2xl font-bold text-blue-700">{stats.newCount}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-red-200 shadow-sm">
            <p className="text-sm text-red-600">Bloquants</p>
            <p className="text-2xl font-bold text-red-700">{stats.blockingCount}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-green-200 shadow-sm">
            <p className="text-sm text-green-600">Résolus (7j)</p>
            <p className="text-2xl font-bold text-green-700">{stats.resolvedThisWeek}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
          {/* Search bar */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par email, description..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                  showFilters ? 'bg-red-50 border-red-200 text-red-700' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filtres
                {(statusFilter !== 'all' || typeFilter !== 'all' || roleFilter !== 'all') && (
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
            </div>
          </div>

          {/* Filter options */}
          {showFilters && (
            <div className="p-4 bg-gray-50 border-b border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Status filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as FeedbackStatus | 'all')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="all">Tous les statuts</option>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>

                {/* Type filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as FeedbackType | 'all')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="all">Tous les types</option>
                    {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>

                {/* Role filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rôle utilisateur</label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="all">Tous les rôles</option>
                    {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clear filters */}
              {(statusFilter !== 'all' || typeFilter !== 'all' || roleFilter !== 'all') && (
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setTypeFilter('all');
                    setRoleFilter('all');
                  }}
                  className="mt-3 text-sm text-red-600 hover:text-red-700"
                >
                  Effacer les filtres
                </button>
              )}
            </div>
          )}

          {/* Quick status tabs */}
          <div className="flex gap-1 p-2 overflow-x-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Tous ({feedbacks.length})
            </button>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => {
              const count = feedbacks.filter(f => f.status === key).length;
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key as FeedbackStatus)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    statusFilter === key
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {config.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedbacks List */}
        <div className="space-y-3">
          {loading && feedbacks.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Chargement des feedbacks...</p>
            </div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun feedback trouvé</p>
            </div>
          ) : (
            filteredFeedbacks.map((feedback) => {
              const isExpanded = expandedId === feedback.id;
              const statusConfig = STATUS_CONFIG[feedback.status];
              const typeConfig = TYPE_CONFIG[feedback.type];
              const priorityConfig = feedback.priority ? PRIORITY_CONFIG[feedback.priority] : null;
              const roleConfig = ROLE_CONFIG[feedback.userRole];
              const DeviceIcon = DEVICE_ICONS[feedback.device?.type] || Monitor;
              const StatusIcon = statusConfig.icon;
              const TypeIcon = typeConfig.icon;

              return (
                <div
                  key={feedback.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  {/* Main row */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : feedback.id)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Type icon */}
                      <div className={`p-2 rounded-lg bg-gray-100 ${typeConfig.color}`}>
                        <TypeIcon className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {/* Priority badge */}
                          {priorityConfig && (
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${priorityConfig.color}`}>
                              {priorityConfig.label}
                            </span>
                          )}
                          {/* Role badge */}
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${roleConfig.color}`}>
                            {roleConfig.label}
                          </span>
                          {/* Status badge */}
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1 ${statusConfig.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </span>
                        </div>

                        {/* Description preview */}
                        <p className="text-gray-900 line-clamp-2">
                          {feedback.description}
                        </p>

                        {/* Meta info */}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {feedback.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(feedback.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <DeviceIcon className="w-3 h-3" />
                            {feedback.device?.type || 'unknown'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {feedback.locale?.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Expand icon */}
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                      <div className="pt-4 space-y-4">
                        {/* Full description */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Description complète</h4>
                          <p className="text-gray-900 whitespace-pre-wrap bg-white p-3 rounded-lg border border-gray-200">
                            {feedback.description}
                          </p>
                        </div>

                        {/* Page URL */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Page concernée</h4>
                          <div className="flex items-center gap-2">
                            <code className="text-sm bg-white px-2 py-1 rounded border border-gray-200 flex-1 overflow-x-auto">
                              {feedback.pageUrl}
                            </code>
                            <a
                              href={feedback.pageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-500 hover:text-gray-700"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </div>

                        {/* Device info */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Informations techniques</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                            <div className="bg-white p-2 rounded border border-gray-200">
                              <span className="text-gray-500">Appareil:</span>
                              <span className="ml-1 font-medium">{feedback.device?.type}</span>
                            </div>
                            <div className="bg-white p-2 rounded border border-gray-200">
                              <span className="text-gray-500">OS:</span>
                              <span className="ml-1 font-medium">{feedback.device?.os}</span>
                            </div>
                            <div className="bg-white p-2 rounded border border-gray-200">
                              <span className="text-gray-500">Navigateur:</span>
                              <span className="ml-1 font-medium">{feedback.device?.browser}</span>
                            </div>
                            <div className="bg-white p-2 rounded border border-gray-200">
                              <span className="text-gray-500">Écran:</span>
                              <span className="ml-1 font-medium">{feedback.device?.screenResolution}</span>
                            </div>
                          </div>
                        </div>

                        {/* Screenshot */}
                        {feedback.screenshotUrl && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-1">Capture d'écran</h4>
                            <a
                              href={feedback.screenshotUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <img
                                src={feedback.screenshotUrl}
                                alt="Screenshot"
                                className="max-w-md max-h-64 object-contain rounded-lg border border-gray-200"
                              />
                            </a>
                          </div>
                        )}

                        {/* Admin notes */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Notes admin</h4>
                          <textarea
                            value={feedback.adminNotes || ''}
                            onChange={(e) => {
                              const newNotes = e.target.value;
                              setFeedbacks(prev =>
                                prev.map(f =>
                                  f.id === feedback.id ? { ...f, adminNotes: newNotes } : f
                                )
                              );
                            }}
                            onBlur={(e) => updateNotes(feedback.id, e.target.value)}
                            placeholder="Ajouter des notes internes..."
                            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                            rows={2}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        {/* Status actions */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Changer le statut</h4>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                              const Icon = config.icon;
                              const isActive = feedback.status === key;
                              return (
                                <button
                                  key={key}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateStatus(feedback.id, key as FeedbackStatus);
                                  }}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    isActive
                                      ? config.color
                                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                  }`}
                                >
                                  <Icon className="w-4 h-4" />
                                  {config.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* User info */}
                        {feedback.userName && (
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>Utilisateur: {feedback.userName}</span>
                            {feedback.userId && (
                              <span className="text-gray-400">({feedback.userId.substring(0, 8)}...)</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Load more */}
        {hasMore && filteredFeedbacks.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => loadFeedbacks(false)}
              disabled={loading}
              className="px-6 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {loading ? 'Chargement...' : 'Charger plus'}
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminFeedback;
