/**
 * AdminInbox - Centre de notifications unifie
 *
 * Agregation temps reel de tous les messages entrants :
 * - Candidatures Captain (captain_applications)
 * - Messages contact (contact_messages)
 * - Feedbacks utilisateurs (user_feedback)
 *
 * Permet de voir en un coup d'oeil tous les items non traites.
 */

import React, { useEffect, useState } from 'react';
import { useIntl, FormattedMessage } from 'react-intl';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import toast from 'react-hot-toast';
import {
  Inbox,
  Crown,
  Mail,
  MessageSquare,
  ExternalLink,
  Eye,
  Clock,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ============================================================================
// TYPES
// ============================================================================

type InboxCategory = 'all' | 'captain' | 'contact' | 'feedback';

interface InboxItem {
  id: string;
  category: 'captain' | 'contact' | 'feedback';
  title: string;
  subtitle: string;
  detail: string;
  status: string;
  createdAt: Date | null;
  link: string;
  raw: Record<string, unknown>;
}

// ============================================================================
// CATEGORY CONFIG
// ============================================================================

const CATEGORY_CONFIG: Record<
  'captain' | 'contact' | 'feedback',
  { icon: React.ReactNode; color: string; bg: string; border: string; label: string; defaultLabel: string }
> = {
  captain: {
    icon: <Crown className="w-4 h-4" />,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    label: 'admin.inbox.category.captain',
    defaultLabel: 'Captain',
  },
  contact: {
    icon: <Mail className="w-4 h-4" />,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    label: 'admin.inbox.category.contact',
    defaultLabel: 'Contact',
  },
  feedback: {
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    label: 'admin.inbox.category.feedback',
    defaultLabel: 'Feedback',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

const AdminInbox: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<InboxCategory>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Real-time listeners for all 3 collections
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    // 1. Captain applications (pending/contacted)
    const qCaptain = query(
      collection(db, 'captain_applications'),
      where('status', 'in', ['pending', 'contacted']),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    unsubs.push(
      onSnapshot(qCaptain, (snap) => {
        const captainItems: InboxItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: `captain_${d.id}`,
            category: 'captain' as const,
            title: data.name || 'N/A',
            subtitle: `${data.country || '?'} - ${data.whatsapp || '?'}`,
            detail: data.motivation || '',
            status: data.status || 'pending',
            createdAt: data.createdAt?.toDate?.() || null,
            link: '/admin/team/captains/recruitment',
            raw: { ...data, _docId: d.id },
          };
        });
        setItems((prev) => {
          const others = prev.filter((i) => i.category !== 'captain');
          return [...others, ...captainItems].sort(sortByDate);
        });
        setLoading(false);
      }, (err) => { console.error('Inbox captain listener error:', err); })
    );

    // 2. Contact messages (unread)
    const qContact = query(
      collection(db, 'contact_messages'),
      where('isRead', '==', false),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    unsubs.push(
      onSnapshot(qContact, (snap) => {
        const contactItems: InboxItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: `contact_${d.id}`,
            category: 'contact' as const,
            title: data.name || data.email || 'N/A',
            subtitle: data.email || '',
            detail: data.message || '',
            status: 'unread',
            createdAt: data.createdAt?.toDate?.() || null,
            link: '/admin/contact-messages',
            raw: { ...data, _docId: d.id },
          };
        });
        setItems((prev) => {
          const others = prev.filter((i) => i.category !== 'contact');
          return [...others, ...contactItems].sort(sortByDate);
        });
      }, (err) => { console.error('Inbox contact listener error:', err); })
    );

    // 3. Feedback (new/in_progress)
    const qFeedback = query(
      collection(db, 'user_feedback'),
      where('status', 'in', ['new', 'in_progress']),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    unsubs.push(
      onSnapshot(qFeedback, (snap) => {
        const feedbackItems: InboxItem[] = snap.docs.map((d) => {
          const data = d.data();
          const typeLabel = data.type === 'bug' ? 'Bug' : data.type === 'ux_friction' ? 'UX' : data.type === 'suggestion' ? 'Suggestion' : 'Autre';
          return {
            id: `feedback_${d.id}`,
            category: 'feedback' as const,
            title: `[${typeLabel}] ${data.pageName || data.pageUrl || ''}`.trim(),
            subtitle: data.email || '',
            detail: data.description || '',
            status: data.status || 'new',
            createdAt: data.createdAt?.toDate?.() || null,
            link: '/admin/feedback',
            raw: { ...data, _docId: d.id },
          };
        });
        setItems((prev) => {
          const others = prev.filter((i) => i.category !== 'feedback');
          return [...others, ...feedbackItems].sort(sortByDate);
        });
      }, (err) => { console.error('Inbox feedback listener error:', err); })
    );

    return () => unsubs.forEach((u) => u());
  }, []);

  const sortByDate = (a: InboxItem, b: InboxItem) => {
    const da = a.createdAt?.getTime() || 0;
    const db2 = b.createdAt?.getTime() || 0;
    return db2 - da;
  };

  const filtered = activeFilter === 'all' ? items : items.filter((i) => i.category === activeFilter);

  const counts = {
    all: items.length,
    captain: items.filter((i) => i.category === 'captain').length,
    contact: items.filter((i) => i.category === 'contact').length,
    feedback: items.filter((i) => i.category === 'feedback').length,
  };

  const markContactRead = async (docId: string) => {
    try {
      await updateDoc(doc(db, 'contact_messages', docId), { isRead: true });
      toast.success('Marque comme lu');
    } catch { toast.error('Erreur'); }
  };

  const formatDate = (d: Date | null) => {
    if (!d) return '';
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}j`;
    return d.toLocaleDateString(intl.locale, { day: '2-digit', month: 'short' });
  };

  const statusBadge = (item: InboxItem) => {
    const map: Record<string, { bg: string; text: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      contacted: { bg: 'bg-blue-100', text: 'text-blue-800' },
      unread: { bg: 'bg-red-100', text: 'text-red-800' },
      new: { bg: 'bg-red-100', text: 'text-red-800' },
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-800' },
    };
    const style = map[item.status] || { bg: 'bg-gray-100', text: 'text-gray-600' };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${style.bg} ${style.text}`}>
        {item.status}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Inbox className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                <FormattedMessage id="admin.inbox.title" defaultMessage="Inbox" />
              </h1>
              <p className="text-sm text-gray-500">
                <FormattedMessage
                  id="admin.inbox.subtitle"
                  defaultMessage="{count} element(s) en attente"
                  values={{ count: items.length }}
                />
              </p>
            </div>
          </div>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          {(['all', 'captain', 'contact', 'feedback'] as InboxCategory[]).map((cat) => {
            const isActive = activeFilter === cat;
            const count = counts[cat];
            if (cat === 'all') {
              return (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  <FormattedMessage id="admin.inbox.filter.all" defaultMessage="Tout" /> ({count})
                </button>
              );
            }
            const cfg = CATEGORY_CONFIG[cat];
            return (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 min-h-[44px] ${
                  isActive
                    ? `${cfg.bg} ${cfg.color} border ${cfg.border}`
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                }`}
              >
                {cfg.icon}
                {intl.formatMessage({ id: cfg.label, defaultMessage: cfg.defaultLabel })} ({count})
              </button>
            );
          })}
        </div>

        {/* Items */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <FormattedMessage id="admin.inbox.loading" defaultMessage="Chargement..." />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Inbox className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">
              <FormattedMessage id="admin.inbox.empty" defaultMessage="Aucun element en attente" />
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => {
              const cfg = CATEGORY_CONFIG[item.category];
              const isExpanded = expandedId === item.id;
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div
                    className="flex items-start gap-3 p-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    {/* Category icon */}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                      <span className={cfg.color}>{cfg.icon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm truncate">{item.title}</span>
                        {statusBadge(item)}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{item.subtitle}</p>
                    </div>

                    {/* Time + chevron */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDate(item.createdAt)}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                      {item.detail && (
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 mb-3 whitespace-pre-wrap line-clamp-6">
                          {item.detail}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => navigate(item.link)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors min-h-[36px]"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <FormattedMessage id="admin.inbox.viewDetail" defaultMessage="Voir en detail" />
                        </button>

                        {item.category === 'contact' && (
                          <button
                            onClick={() => markContactRead(item.raw._docId as string)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors min-h-[36px]"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <FormattedMessage id="admin.inbox.markRead" defaultMessage="Marquer comme lu" />
                          </button>
                        )}

                        {item.category === 'captain' && !!item.raw.whatsapp && (
                          <a
                            href={`https://wa.me/${(item.raw.whatsapp as string).replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors min-h-[36px]"
                          >
                            WhatsApp
                          </a>
                        )}

                        {item.category === 'captain' && !!item.raw.cvUrl && (
                          <a
                            href={item.raw.cvUrl as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors min-h-[36px]"
                          >
                            CV
                          </a>
                        )}

                        {!!item.raw.calendlyBooked && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded-full">
                            Calendly OK
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminInbox;
