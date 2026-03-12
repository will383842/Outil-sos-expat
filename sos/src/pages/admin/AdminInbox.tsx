/**
 * AdminInbox - Centre de notifications unifie avec reponse + archivage
 *
 * Agregation temps reel de tous les messages entrants :
 * - Demandes de retrait (payment_withdrawals)
 * - Candidatures Captain (captain_applications)
 * - Messages contact (contact_messages)
 * - Feedbacks utilisateurs (user_feedback)
 * - Candidatures Partenaire (partner_applications)
 *
 * Fonctionnalites:
 * - Repondre directement par email depuis l'inbox
 * - Archiver les messages traites
 * - Onglet "Archives" par categorie
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useIntl, FormattedMessage } from 'react-intl';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  updateDoc,
  deleteDoc,
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
  Send,
  Archive,
  ArchiveRestore,
  Loader2,
  Trash2,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sendInboxReply } from '../../api/sendInboxReply';

// ============================================================================
// TYPES
// ============================================================================

type InboxCategory = 'all' | 'withdrawal' | 'captain' | 'contact' | 'feedback' | 'partner';
type ViewMode = 'active' | 'archived';

interface InboxItem {
  id: string;
  category: 'withdrawal' | 'captain' | 'contact' | 'feedback' | 'partner';
  title: string;
  subtitle: string;
  detail: string;
  email: string;
  status: string;
  createdAt: Date | null;
  link: string;
  raw: Record<string, unknown>;
  hasReply: boolean;
  existingReply: string;
}

// Collection name mapping
const COLLECTION_MAP: Record<string, string> = {
  withdrawal: 'payment_withdrawals',
  captain: 'captain_applications',
  contact: 'contact_messages',
  feedback: 'user_feedback',
  partner: 'partner_applications',
};

// ============================================================================
// HELPERS
// ============================================================================

const USER_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  chatter: { label: 'Chatter', color: 'text-orange-700', bg: 'bg-orange-100' },
  influencer: { label: 'Influencer', color: 'text-pink-700', bg: 'bg-pink-100' },
  blogger: { label: 'Blogger', color: 'text-cyan-700', bg: 'bg-cyan-100' },
  group_admin: { label: 'Group Admin', color: 'text-violet-700', bg: 'bg-violet-100' },
  affiliate: { label: 'Affiliate', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  partner: { label: 'Partenaire', color: 'text-teal-700', bg: 'bg-teal-100' },
  client: { label: 'Client', color: 'text-green-700', bg: 'bg-green-100' },
  lawyer: { label: 'Avocat', color: 'text-amber-700', bg: 'bg-amber-100' },
  expat: { label: 'Expat', color: 'text-sky-700', bg: 'bg-sky-100' },
};

const formatCentsToUSD = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

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
  const [archivedItems, setArchivedItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [activeFilter, setActiveFilter] = useState<InboxCategory>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('active');

  // Reply state
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState<Record<string, boolean>>({});
  const [archiving, setArchiving] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // ---- Extract email from raw data per category ----
  const getEmail = (category: string, raw: Record<string, unknown>): string => {
    switch (category) {
      case 'contact': return (raw.email as string) || '';
      case 'feedback': return (raw.email as string) || '';
      case 'partner': return (raw.email as string) || '';
      case 'captain': return (raw.email as string) || (raw.whatsapp as string) || '';
      case 'withdrawal': return (raw.userEmail as string) || '';
      default: return '';
    }
  };

  const getRecipientName = (category: string, raw: Record<string, unknown>): string => {
    switch (category) {
      case 'contact': return (raw.name as string)?.split(' ')[0] || '';
      case 'feedback': return (raw.userName as string) || (raw.email as string)?.split('@')[0] || '';
      case 'partner': return (raw.firstName as string) || '';
      case 'captain': return (raw.name as string)?.split(' ')[0] || '';
      case 'withdrawal': return (raw.userName as string) || '';
      default: return '';
    }
  };

  // ---- Build InboxItem from doc ----
  const buildItem = useCallback((d: { id: string; data: () => Record<string, unknown> }, category: InboxItem['category']): InboxItem => {
    const data = d.data();
    const email = getEmail(category, data);
    const hasReply = !!(data.adminReply || data.reply);
    const existingReply = (data.adminReply as string) || (data.reply as string) || '';

    switch (category) {
      case 'withdrawal': {
        const userType = (data.userType as string) || 'affiliate';
        const amount = (data.amount as number) || 0;
        const fee = (data.withdrawalFee as number) || 0;
        const totalDebited = (data.totalDebited as number) || amount + fee;
        const method = data.provider === 'wise' ? 'Wise' : data.provider === 'flutterwave' ? 'Mobile Money' : data.methodType === 'bank_transfer' ? 'Virement' : 'Manuel';
        return {
          id: `withdrawal_${d.id}`, category, email, hasReply, existingReply,
          title: `${data.userName || data.userEmail || 'N/A'} — ${formatCentsToUSD(amount)}`,
          subtitle: `${(USER_TYPE_LABELS[userType] || USER_TYPE_LABELS.affiliate).label} · ${method} · Total: ${formatCentsToUSD(totalDebited)}`,
          detail: fee > 0
            ? `Montant: ${formatCentsToUSD(amount)} + Frais: ${formatCentsToUSD(fee)} = Total: ${formatCentsToUSD(totalDebited)}\nMethode: ${method}\nEmail: ${data.userEmail || 'N/A'}`
            : `Montant: ${formatCentsToUSD(amount)}\nMethode: ${method}\nEmail: ${data.userEmail || 'N/A'}`,
          status: (data.status as string) || 'pending',
          createdAt: data.requestedAt ? new Date(data.requestedAt as number) : null,
          link: '/admin/payments',
          raw: { ...data, _docId: d.id, _userType: userType },
        };
      }
      case 'captain':
        return {
          id: `captain_${d.id}`, category, email, hasReply, existingReply,
          title: (data.name as string) || 'N/A',
          subtitle: `${data.country || '?'} - ${data.whatsapp || '?'}`,
          detail: (data.motivation as string) || '',
          status: (data.status as string) || 'pending',
          createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() || null,
          link: '/admin/chatters/captains',
          raw: { ...data, _docId: d.id },
        };
      case 'contact':
        return {
          id: `contact_${d.id}`, category, email, hasReply, existingReply,
          title: (data.name as string) || (data.email as string) || 'N/A',
          subtitle: (data.email as string) || '',
          detail: (data.message as string) || '',
          status: 'unread',
          createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() || null,
          link: '/admin/contact-messages',
          raw: { ...data, _docId: d.id },
        };
      case 'feedback': {
        const typeLabel = data.type === 'bug' ? 'Bug' : data.type === 'ux_friction' ? 'UX' : data.type === 'suggestion' ? 'Suggestion' : 'Autre';
        return {
          id: `feedback_${d.id}`, category, email, hasReply, existingReply,
          title: `[${typeLabel}] ${data.pageName || data.pageUrl || ''}`.trim(),
          subtitle: (data.email as string) || '',
          detail: (data.description as string) || '',
          status: (data.status as string) || 'new',
          createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() || null,
          link: '/admin/feedback',
          raw: { ...data, _docId: d.id },
        };
      }
      case 'partner':
        return {
          id: `partner_${d.id}`, category, email, hasReply, existingReply,
          title: `${data.firstName || ''} ${data.lastName || ''}`.trim() || (data.email as string) || 'N/A',
          subtitle: `${data.websiteName || data.websiteUrl || ''} - ${data.country || '?'}`,
          detail: (data.message as string) || (data.websiteDescription as string) || '',
          status: (data.status as string) || 'pending',
          createdAt: data.createdAt ? new Date(data.createdAt as string) : null,
          link: '/admin/partners/applications',
          raw: { ...data, _docId: d.id },
        };
    }
  }, []);

  // ---- ACTIVE items real-time listeners ----
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    const addListener = (
      cat: InboxItem['category'],
      q: ReturnType<typeof query>,
    ) => {
      unsubs.push(
        onSnapshot(q, (snap) => {
          const newItems = snap.docs
            .filter((d) => !(d.data() as Record<string, unknown>).isArchived)
            .map((d) => buildItem(d as unknown as { id: string; data: () => Record<string, unknown> }, cat));
          setItems((prev) => {
            const others = prev.filter((i) => i.category !== cat);
            return [...others, ...newItems].sort(sortByDate);
          });
          setLoading(false);
        }, (err) => {
          console.error(`Inbox ${cat} listener error:`, err);
          setLoading(false);
        })
      );
    };

    // Withdrawal (pending, not archived)
    addListener('withdrawal', query(
      collection(db, 'payment_withdrawals'),
      where('status', '==', 'pending'),
      orderBy('requestedAt', 'desc'),
      limit(50)
    ));

    // Captain (pending/contacted, not archived)
    addListener('captain', query(
      collection(db, 'captain_applications'),
      where('status', 'in', ['pending', 'contacted']),
      orderBy('createdAt', 'desc'),
      limit(50)
    ));

    // Contact (unread)
    addListener('contact', query(
      collection(db, 'contact_messages'),
      where('isRead', '==', false),
      orderBy('createdAt', 'desc'),
      limit(50)
    ));

    // Feedback (new/in_progress)
    addListener('feedback', query(
      collection(db, 'user_feedback'),
      where('status', 'in', ['new', 'in_progress']),
      orderBy('createdAt', 'desc'),
      limit(50)
    ));

    // Partner (pending/contacted)
    addListener('partner', query(
      collection(db, 'partner_applications'),
      where('status', 'in', ['pending', 'contacted']),
      orderBy('createdAt', 'desc'),
      limit(50)
    ));

    return () => unsubs.forEach((u) => u());
  }, [buildItem]);

  // ---- ARCHIVED items listener (loaded on demand) ----
  useEffect(() => {
    if (viewMode !== 'archived') return;
    setLoadingArchived(true);
    const unsubs: (() => void)[] = [];

    const addArchivedListener = (
      cat: InboxItem['category'],
      q: ReturnType<typeof query>,
    ) => {
      unsubs.push(
        onSnapshot(q, (snap) => {
          const newItems = snap.docs.map((d) => buildItem(d as unknown as { id: string; data: () => Record<string, unknown> }, cat));
          setArchivedItems((prev) => {
            const others = prev.filter((i) => i.category !== cat);
            return [...others, ...newItems].sort(sortByDate);
          });
          setLoadingArchived(false);
        }, (err) => {
          console.error(`Archived ${cat} listener error:`, err);
          setLoadingArchived(false);
        })
      );
    };

    // Archived = isArchived == true for each collection
    addArchivedListener('contact', query(
      collection(db, 'contact_messages'),
      where('isArchived', '==', true),
      orderBy('createdAt', 'desc'),
      limit(100)
    ));

    addArchivedListener('feedback', query(
      collection(db, 'user_feedback'),
      where('isArchived', '==', true),
      orderBy('createdAt', 'desc'),
      limit(100)
    ));

    addArchivedListener('captain', query(
      collection(db, 'captain_applications'),
      where('isArchived', '==', true),
      orderBy('createdAt', 'desc'),
      limit(100)
    ));

    addArchivedListener('partner', query(
      collection(db, 'partner_applications'),
      where('isArchived', '==', true),
      orderBy('createdAt', 'desc'),
      limit(100)
    ));

    addArchivedListener('withdrawal', query(
      collection(db, 'payment_withdrawals'),
      where('isArchived', '==', true),
      orderBy('requestedAt', 'desc'),
      limit(100)
    ));

    return () => unsubs.forEach((u) => u());
  }, [viewMode, buildItem]);

  // ---- Helpers ----
  const sortByDate = (a: InboxItem, b: InboxItem) => {
    const da = a.createdAt?.getTime() || 0;
    const db2 = b.createdAt?.getTime() || 0;
    return db2 - da;
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

  // ---- Actions ----
  const handleReply = async (item: InboxItem) => {
    const text = replyTexts[item.id]?.trim();
    if (!text) return;
    if (!item.email || !item.email.includes('@')) {
      toast.error('Pas d\'email pour ce destinataire');
      return;
    }

    setSendingReply((p) => ({ ...p, [item.id]: true }));
    try {
      const docId = item.raw._docId as string;
      const collName = COLLECTION_MAP[item.category];
      const result = await sendInboxReply({
        collection: collName,
        docId,
        to: item.email,
        recipientName: getRecipientName(item.category, item.raw),
        originalMessage: item.detail,
        adminReply: text,
      });

      if (result.success) {
        toast.success('Reponse envoyee !');
        setReplyTexts((p) => ({ ...p, [item.id]: '' }));
      } else {
        toast.error(result.error || 'Erreur');
      }
    } catch {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSendingReply((p) => ({ ...p, [item.id]: false }));
    }
  };

  const handleArchive = async (item: InboxItem, archive: boolean) => {
    setArchiving((p) => ({ ...p, [item.id]: true }));
    try {
      const docId = item.raw._docId as string;
      const collName = COLLECTION_MAP[item.category];
      await updateDoc(doc(db, collName, docId), {
        isArchived: archive,
        ...(archive && item.category === 'contact' ? { isRead: true } : {}),
      });
      toast.success(archive ? 'Archive !' : 'Desarchive !');
      if (expandedId === item.id) setExpandedId(null);
    } catch (err) {
      console.error('Archive error:', err);
      toast.error('Erreur');
    } finally {
      setArchiving((p) => ({ ...p, [item.id]: false }));
    }
  };

  const markContactRead = async (docId: string) => {
    try {
      await updateDoc(doc(db, 'contact_messages', docId), { isRead: true });
      toast.success('Marque comme lu');
    } catch { toast.error('Erreur'); }
  };

  const handleDelete = async (item: InboxItem) => {
    if (!confirm('Supprimer definitivement ce message ?')) return;
    setDeleting((p) => ({ ...p, [item.id]: true }));
    try {
      const docId = item.raw._docId as string;
      const collName = COLLECTION_MAP[item.category];
      await deleteDoc(doc(db, collName, docId));
      toast.success('Supprime !');
      if (expandedId === item.id) setExpandedId(null);
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(item.id); return next; });
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting((p) => ({ ...p, [item.id]: false }));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((i) => i.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Supprimer definitivement ${selectedIds.size} message(s) ?`)) return;
    setBulkDeleting(true);
    const currentItems = viewMode === 'active' ? items : archivedItems;
    try {
      const promises = Array.from(selectedIds).map((id) => {
        const item = currentItems.find((i) => i.id === id);
        if (!item) return Promise.resolve();
        const docId = item.raw._docId as string;
        const collName = COLLECTION_MAP[item.category];
        return deleteDoc(doc(db, collName, docId));
      });
      await Promise.all(promises);
      toast.success(`${selectedIds.size} message(s) supprime(s)`);
      setSelectedIds(new Set());
      setExpandedId(null);
    } catch (err) {
      console.error('Bulk delete error:', err);
      toast.error('Erreur lors de la suppression en lot');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;
    const archive = viewMode === 'active';
    const currentItems = viewMode === 'active' ? items : archivedItems;
    try {
      const promises = Array.from(selectedIds).map((id) => {
        const item = currentItems.find((i) => i.id === id);
        if (!item) return Promise.resolve();
        const docId = item.raw._docId as string;
        const collName = COLLECTION_MAP[item.category];
        return updateDoc(doc(db, collName, docId), {
          isArchived: archive,
          ...(archive && item.category === 'contact' ? { isRead: true } : {}),
        });
      });
      await Promise.all(promises);
      toast.success(`${selectedIds.size} message(s) ${archive ? 'archive(s)' : 'desarchive(s)'}`);
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Bulk archive error:', err);
      toast.error('Erreur');
    }
  };

  // ---- Derived state ----
  const displayItems = viewMode === 'active' ? items : archivedItems;
  const filtered = activeFilter === 'all' ? displayItems : displayItems.filter((i) => i.category === activeFilter);
  const isLoading = viewMode === 'active' ? loading : loadingArchived;

  const counts = {
    all: displayItems.length,
    withdrawal: displayItems.filter((i) => i.category === 'withdrawal').length,
    captain: displayItems.filter((i) => i.category === 'captain').length,
    contact: displayItems.filter((i) => i.category === 'contact').length,
    feedback: displayItems.filter((i) => i.category === 'feedback').length,
    partner: displayItems.filter((i) => i.category === 'partner').length,
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

  const userTypeBadge = (userType: string) => {
    const info = USER_TYPE_LABELS[userType] || { label: userType, color: 'text-gray-700', bg: 'bg-gray-100' };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${info.bg} ${info.color}`}>
        {info.label}
      </span>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

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
                {viewMode === 'active'
                  ? <FormattedMessage id="admin.inbox.subtitle" defaultMessage="{count} element(s) en attente" values={{ count: items.length }} />
                  : `${archivedItems.length} archive(s)`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Withdrawal alert */}
            {viewMode === 'active' && counts.withdrawal > 0 && (
              <button
                onClick={() => { setActiveFilter('withdrawal'); setViewMode('active'); }}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold hover:bg-red-100 transition-colors animate-pulse"
              >
                <DollarSign className="w-4 h-4" />
                {counts.withdrawal} retrait{counts.withdrawal > 1 ? 's' : ''} en attente
              </button>
            )}

            {/* Active / Archived toggle */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('active')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Inbox className="w-3.5 h-3.5 inline mr-1" />
                Actifs ({items.length})
              </button>
              <button
                onClick={() => setViewMode('archived')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'archived' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Archive className="w-3.5 h-3.5 inline mr-1" />
                Archives
              </button>
            </div>
          </div>
        </div>

        {/* Category filters */}
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
                    : cat === 'withdrawal' && count > 0 && viewMode === 'active'
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

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
            <span className="text-sm font-semibold text-indigo-800">
              {selectedIds.size} selectionne(s)
            </span>
            <button
              onClick={handleBulkArchive}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 border border-gray-200 transition-colors"
            >
              {viewMode === 'active' ? <Archive className="w-3.5 h-3.5" /> : <ArchiveRestore className="w-3.5 h-3.5" />}
              {viewMode === 'active' ? 'Archiver' : 'Desarchiver'}
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
            >
              {bulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Supprimer
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-gray-500 text-xs hover:text-gray-700"
            >
              <X className="w-3.5 h-3.5" />
              Annuler
            </button>
            <div className="ml-auto">
              <button
                onClick={selectAll}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {selectedIds.size === filtered.length ? 'Tout deselectionner' : 'Tout selectionner'}
              </button>
            </div>
          </div>
        )}

        {/* Items */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <FormattedMessage id="admin.inbox.loading" defaultMessage="Chargement..." />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            {viewMode === 'archived' ? (
              <Archive className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            ) : (
              <Inbox className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            )}
            <p className="text-gray-400 font-medium">
              {viewMode === 'archived'
                ? 'Aucun message archive'
                : <FormattedMessage id="admin.inbox.empty" defaultMessage="Aucun element en attente" />
              }
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => {
              const cfg = CATEGORY_CONFIG[item.category];
              const isExpanded = expandedId === item.id;
              const isSending = sendingReply[item.id];
              const isArchivingItem = archiving[item.id];
              const replyText = replyTexts[item.id] || '';

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden ${
                    item.category === 'withdrawal' && viewMode === 'active'
                      ? 'border-red-200 bg-red-50/30'
                      : item.hasReply
                        ? 'border-green-200 bg-green-50/20'
                        : 'border-gray-200'
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-start gap-2 p-4">
                    {/* Checkbox */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                      className="flex-shrink-0 mt-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                    >
                      {selectedIds.has(item.id)
                        ? <CheckSquare className="w-4 h-4 text-indigo-600" />
                        : <Square className="w-4 h-4" />
                      }
                    </button>

                    <div
                      className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <span className={cfg.color}>{cfg.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 text-sm truncate">{item.title}</span>
                          {statusBadge(item)}
                          {item.category === 'withdrawal' && typeof item.raw._userType === 'string' && userTypeBadge(item.raw._userType)}
                          {item.hasReply && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                              repondu
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{item.subtitle}</p>
                      </div>
                    </div>

                    {/* Quick actions + time */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs text-gray-400 flex items-center gap-1 mr-1">
                        <Clock className="w-3 h-3" /> {formatDate(item.createdAt)}
                      </span>
                      {/* Quick archive */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleArchive(item, viewMode === 'active'); }}
                        disabled={isArchivingItem}
                        title={viewMode === 'active' ? 'Archiver' : 'Desarchiver'}
                        className={`p-1.5 rounded-md transition-colors ${
                          viewMode === 'active'
                            ? 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                            : 'text-amber-400 hover:text-amber-700 hover:bg-amber-50'
                        } disabled:opacity-50`}
                      >
                        {isArchivingItem
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : viewMode === 'active'
                            ? <Archive className="w-3.5 h-3.5" />
                            : <ArchiveRestore className="w-3.5 h-3.5" />
                        }
                      </button>
                      {/* Quick delete */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                        disabled={deleting[item.id]}
                        title="Supprimer"
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {deleting[item.id]
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                      </button>
                      <div
                        className="cursor-pointer p-1"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      >
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                      {/* Original message */}
                      {item.detail && (
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap line-clamp-6">
                          {item.detail}
                        </p>
                      )}

                      {/* Existing reply */}
                      {item.hasReply && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-[11px] text-green-600 font-semibold mb-1 uppercase">Reponse envoyee</p>
                          <p className="text-sm text-green-800 whitespace-pre-wrap">{item.existingReply}</p>
                        </div>
                      )}

                      {/* Reply textarea (if has email and no reply yet) */}
                      {item.email && item.email.includes('@') && !item.hasReply && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Mail className="w-3 h-3" />
                            Repondre a {item.email}
                          </div>
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyTexts((p) => ({ ...p, [item.id]: e.target.value }))}
                            placeholder="Ecrire votre reponse..."
                            className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                            rows={3}
                          />
                          <button
                            onClick={() => handleReply(item)}
                            disabled={isSending || !replyText.trim()}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px]"
                          >
                            {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            {isSending ? 'Envoi...' : 'Envoyer la reponse'}
                          </button>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <button
                          onClick={() => navigate(item.link)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors min-h-[36px]"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <FormattedMessage id="admin.inbox.viewDetail" defaultMessage="Voir en detail" />
                        </button>

                        {/* Archive / Unarchive */}
                        {viewMode === 'active' ? (
                          <button
                            onClick={() => handleArchive(item, true)}
                            disabled={isArchivingItem}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors min-h-[36px] disabled:opacity-50"
                          >
                            {isArchivingItem ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                            Archiver
                          </button>
                        ) : (
                          <button
                            onClick={() => handleArchive(item, false)}
                            disabled={isArchivingItem}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors min-h-[36px] disabled:opacity-50"
                          >
                            {isArchivingItem ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArchiveRestore className="w-3.5 h-3.5" />}
                            Desarchiver
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(item)}
                          disabled={deleting[item.id]}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors min-h-[36px] disabled:opacity-50"
                        >
                          {deleting[item.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          Supprimer
                        </button>

                        {/* Mark as read (contact only, active view) */}
                        {item.category === 'contact' && viewMode === 'active' && (
                          <button
                            onClick={() => markContactRead(item.raw._docId as string)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors min-h-[36px]"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Marquer comme lu
                          </button>
                        )}

                        {/* WhatsApp (captain) */}
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

                        {/* CV (captain) */}
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

                        {/* Website (partner) */}
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

                        {/* Email link (partner) */}
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
