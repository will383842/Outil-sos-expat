/**
 * AdminInbox - Centre de notifications unifie
 *
 * Agregation temps reel de tous les messages entrants :
 * - Demandes de retrait (payment_withdrawals) — EN PREMIER, URGENT
 * - Candidatures Captain (captain_applications)
 * - Messages contact (contact_messages)
 * - Feedbacks utilisateurs (user_feedback)
 * - Candidatures Partenaire (partner_applications)
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
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import toast from 'react-hot-toast';
import {
  Inbox,
  Crown,
  Mail,
  MessageSquare,
  Handshake,
  ExternalLink,
  Eye,
  Clock,
  ChevronDown,
  Globe,
  Wallet,
  DollarSign,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ============================================================================
// TYPES
// ============================================================================

type InboxCategory = 'all' | 'withdrawal' | 'captain' | 'contact' | 'feedback' | 'partner';

interface InboxItem {
  id: string;
  category: 'withdrawal' | 'captain' | 'contact' | 'feedback' | 'partner';
  title: string;
  subtitle: string;
  detail: string;
  status: string;
  createdAt: Date | null;
  link: string;
  raw: Record<string, unknown>;
}

// ============================================================================
// WITHDRAWAL HELPERS
// ============================================================================

const USER_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  chatter: { label: 'Chatter', color: 'text-orange-700', bg: 'bg-orange-100' },
  influencer: { label: 'Influencer', color: 'text-pink-700', bg: 'bg-pink-100' },
  blogger: { label: 'Blogger', color: 'text-cyan-700', bg: 'bg-cyan-100' },
  group_admin: { label: 'Group Admin', color: 'text-violet-700', bg: 'bg-violet-100' },
  affiliate: { label: 'Affiliate', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  partner: { label: 'Partenaire', color: 'text-teal-700', bg: 'bg-teal-100' },
};

const formatCentsToUSD = (cents: number): string => {
  return `$${(cents / 100).toFixed(2)}`;
};

// ============================================================================
// CATEGORY CONFIG
// ============================================================================

const CATEGORY_CONFIG: Record<
  'withdrawal' | 'captain' | 'contact' | 'feedback' | 'partner',
  { icon: React.ReactNode; color: string; bg: string; border: string; label: string; defaultLabel: string }
> = {
  withdrawal: {
    icon: <Wallet className="w-4 h-4" />,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: 'admin.inbox.category.withdrawal',
    defaultLabel: 'Retraits',
  },
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
  partner: {
    icon: <Handshake className="w-4 h-4" />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    label: 'admin.inbox.category.partner',
    defaultLabel: 'Partenaire',
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

  // Real-time listeners for all 5 collections
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    // 0. WITHDRAWAL REQUESTS (pending) — PRIORITE #1
    const qWithdrawal = query(
      collection(db, 'payment_withdrawals'),
      where('status', '==', 'pending'),
      orderBy('requestedAt', 'desc'),
      limit(50)
    );
    unsubs.push(
      onSnapshot(qWithdrawal, (snap) => {
        const withdrawalItems: InboxItem[] = snap.docs.map((d) => {
          const data = d.data();
          const userType = data.userType || 'affiliate';
          const typeInfo = USER_TYPE_LABELS[userType] || USER_TYPE_LABELS.affiliate;
          const amount = data.amount || 0;
          const fee = data.withdrawalFee || 0;
          const totalDebited = data.totalDebited || amount + fee;
          const method = data.provider === 'wise' ? 'Wise' : data.provider === 'flutterwave' ? 'Mobile Money' : data.methodType === 'bank_transfer' ? 'Virement' : 'Manuel';

          return {
            id: `withdrawal_${d.id}`,
            category: 'withdrawal' as const,
            title: `${data.userName || data.userEmail || 'N/A'} — ${formatCentsToUSD(amount)}`,
            subtitle: `${typeInfo.label} · ${method} · Total debite: ${formatCentsToUSD(totalDebited)}`,
            detail: fee > 0
              ? `Montant: ${formatCentsToUSD(amount)} + Frais: ${formatCentsToUSD(fee)} = Total: ${formatCentsToUSD(totalDebited)}\nMethode: ${method}\nEmail: ${data.userEmail || 'N/A'}`
              : `Montant: ${formatCentsToUSD(amount)}\nMethode: ${method}\nEmail: ${data.userEmail || 'N/A'}`,
            status: 'pending',
            createdAt: data.requestedAt ? new Date(data.requestedAt) : null,
            link: '/admin/payments',
            raw: { ...data, _docId: d.id, _userType: userType },
          };
        });
        setItems((prev) => {
          const others = prev.filter((i) => i.category !== 'withdrawal');
          return [...others, ...withdrawalItems].sort(sortByDate);
        });
        setLoading(false);
      }, (err) => { console.error('Inbox withdrawal listener error:', err); })
    );

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

    // 4. Partner applications (pending/contacted)
    const qPartner = query(
      collection(db, 'partner_applications'),
      where('status', 'in', ['pending', 'contacted']),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    unsubs.push(
      onSnapshot(qPartner, (snap) => {
        const partnerItems: InboxItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: `partner_${d.id}`,
            category: 'partner' as const,
            title: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email || 'N/A',
            subtitle: `${data.websiteName || data.websiteUrl || ''} - ${data.country || '?'}`,
            detail: data.message || data.websiteDescription || '',
            status: data.status || 'pending',
            createdAt: data.createdAt ? new Date(data.createdAt) : null,
            link: '/admin/partners/applications',
            raw: { ...data, _docId: d.id },
          };
        });
        setItems((prev) => {
          const others = prev.filter((i) => i.category !== 'partner');
          return [...others, ...partnerItems].sort(sortByDate);
        });
      }, (err) => { console.error('Inbox partner listener error:', err); })
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
    withdrawal: items.filter((i) => i.category === 'withdrawal').length,
    captain: items.filter((i) => i.category === 'captain').length,
    contact: items.filter((i) => i.category === 'contact').length,
    feedback: items.filter((i) => i.category === 'feedback').length,
    partner: items.filter((i) => i.category === 'partner').length,
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

  // Badge for withdrawal userType (chatter, influencer, blogger, etc.)
  const userTypeBadge = (userType: string) => {
    const info = USER_TYPE_LABELS[userType] || { label: userType, color: 'text-gray-700', bg: 'bg-gray-100' };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${info.bg} ${info.color}`}>
        {info.label}
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

          {/* Withdrawal alert banner */}
          {counts.withdrawal > 0 && (
            <button
              onClick={() => setActiveFilter('withdrawal')}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold hover:bg-red-100 transition-colors animate-pulse"
            >
              <DollarSign className="w-4 h-4" />
              {counts.withdrawal} retrait{counts.withdrawal > 1 ? 's' : ''} en attente
            </button>
          )}
        </div>

        {/* Category filters — withdrawal EN PREMIER */}
        <div className="flex flex-wrap gap-2">
          {(['all', 'withdrawal', 'captain', 'contact', 'feedback', 'partner'] as InboxCategory[]).map((cat) => {
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
                    : cat === 'withdrawal' && count > 0
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 font-bold'
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
                  className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden ${
                    item.category === 'withdrawal'
                      ? 'border-red-200 bg-red-50/30'
                      : 'border-gray-200'
                  }`}
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
                        {item.category === 'withdrawal' && typeof item.raw._userType === 'string' && userTypeBadge(item.raw._userType)}
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

                        {item.category === 'partner' && !!item.raw.websiteUrl && (
                          <a
                            href={item.raw.websiteUrl as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors min-h-[36px]"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            {(item.raw.websiteName as string) || 'Site web'}
                          </a>
                        )}

                        {item.category === 'partner' && !!item.raw.email && (
                          <a
                            href={`mailto:${item.raw.email as string}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors min-h-[36px]"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            Email
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
