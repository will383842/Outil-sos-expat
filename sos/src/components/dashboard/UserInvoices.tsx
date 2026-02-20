import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useIntl } from 'react-intl';
// jsPDF et autoTable sont chargés dynamiquement pour réduire le bundle initial
// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';
import { formatDate } from '@/utils/localeFormatters';
import { useApp } from '@/contexts/AppContext';

interface InvoiceRecord {
  id: string;
  clientId: string;
  providerId: string;
  amount: number;
  currency?: string;
  status: string;
  downloadUrl: string;
  callId?: string;
  createdAt: { seconds: number; nanoseconds: number };
  // P0 FIX: Noms pour affichage
  clientName?: string;
  clientEmail?: string;
  providerName?: string; // Format "Prénom L."
  providerEmail?: string;
  type?: 'platform' | 'provider';
}

export default function UserInvoices() {
  const { user } = useAuth();
  const { language } = useApp();
  const intl = useIntl();
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [refundedInvoices, setRefundedInvoices] = useState<Set<string>>(new Set());

  const PAGE_SIZE = 10;

  // Currency formatting helper - French format with 2 decimals
  const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
    const currencyMap: Record<string, { symbol: string; position: 'before' | 'after' }> = {
      EUR: { symbol: '€', position: 'after' },
      USD: { symbol: '$', position: 'before' },
      GBP: { symbol: '£', position: 'before' },
      CHF: { symbol: 'CHF', position: 'after' },
    };

    const config = currencyMap[currency.toUpperCase()] || currencyMap.EUR;
    const formatted = amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return config.position === 'before'
      ? `${config.symbol}${formatted}`
      : `${formatted} ${config.symbol}`;
  };

  const exportSinglePDF = (invoice: any) => {
    // P2 FIX: Remove debug log in production
    toast(intl.formatMessage({ id: 'userInvoices.exportPdfNotImplemented' }));
  };

  useEffect(() => {
    if (!user?.uid) return;

    const fetchInvoices = async () => {
      setLoading(true);
      setError(null);

      try {
        const roleField = user.role === 'client' ? 'clientId' : 'providerId';

        const q = query(
          collection(db, 'invoice_records'),
          where(roleField, '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE)
        );

        const snapshot = await getDocs(q);
        const fetchedInvoices: InvoiceRecord[] = [];

        snapshot.forEach((doc) => {
          fetchedInvoices.push({
            id: doc.id,
            ...(doc.data() as Omit<InvoiceRecord, 'id'>),
          });
        });

        setInvoices(fetchedInvoices);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.size === PAGE_SIZE);
      } catch (err) {
        console.error('Erreur chargement factures:', err);
        console.error('Error code:', (err as { code?: string }).code);
        console.error('Error message:', (err as Error).message);
        console.error('User role:', user?.role);
        console.error('User UID:', user?.uid);
        setError(intl.formatMessage({ id: 'userInvoices.loadError' }));
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [user]);

  const fetchMore = async () => {
    if (!lastDoc || !user?.uid) return;
    setLoadingMore(true);

    try {
      const roleField = user.role === 'client' ? 'clientId' : 'providerId';

      const q = query(
        collection(db, 'invoice_records'),
        where(roleField, '==', user.uid),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );

      const snapshot = await getDocs(q);
      const moreInvoices: InvoiceRecord[] = [];

      snapshot.forEach((doc) => {
        moreInvoices.push({
          id: doc.id,
          ...(doc.data() as Omit<InvoiceRecord, 'id'>),
        });
      });

      setInvoices((prev) => [...prev, ...moreInvoices]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.size === PAGE_SIZE);
    } catch (err) {
      console.error('Erreur chargement supplémentaire:', err);
      setError(intl.formatMessage({ id: 'userInvoices.loadMoreError' }));
    } finally {
      setLoadingMore(false);
    }
  };

  const exportPDF = async () => {
    // Dynamic import de jsPDF et autoTable - chargés uniquement quand nécessaire (~300KB)
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);

    const doc = new jsPDF();
    doc.text(intl.formatMessage({ id: 'userInvoices.title' }), 14, 15);

    const tableData = invoices.map((invoice) => [
      invoice.id,
      invoice.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €',
      invoice.status,
      new Date(invoice.createdAt.seconds * 1000).toLocaleDateString(intl.locale),
    ]);

    autoTable(doc, {
      head: [[
        intl.formatMessage({ id: 'userInvoices.table.id' }),
        intl.formatMessage({ id: 'userInvoices.table.amount' }),
        intl.formatMessage({ id: 'userInvoices.table.status' }),
        intl.formatMessage({ id: 'userInvoices.table.date' })
      ]],
      body: tableData,
      startY: 20,
    });

    doc.save(intl.formatMessage({ id: 'userInvoices.pdfFilename' }));
  };

  // Check for refunded invoices by checking payment status
  useEffect(() => {
    if (!invoices.length) return;

    const checkRefunds = async () => {
      const refundedSet = new Set<string>();
      
      for (const invoice of invoices) {
        if (!invoice.callId) continue;

        try {
          // Check payments collection for refunded status
          // Try both callId and callSessionId fields
          const paymentQueries = [
            query(
              collection(db, 'payments'),
              where('callId', '==', invoice.callId),
              where('status', '==', 'refunded'),
              limit(1)
            ),
            query(
              collection(db, 'payments'),
              where('callSessionId', '==', invoice.callId),
              where('status', '==', 'refunded'),
              limit(1)
            ),
          ];

          for (const paymentQuery of paymentQueries) {
            try {
              const paymentSnapshot = await getDocs(paymentQuery);
              if (!paymentSnapshot.empty) {
                refundedSet.add(invoice.id);
                break; // Found refund, no need to check other queries
              }
            } catch (queryError) {
              // P2 FIX: Only log in development
              if (import.meta.env.DEV) console.warn('Error checking payment query:', queryError);
            }
          }
        } catch (err) {
          console.error('Error checking refund status for invoice:', invoice.id, err);
        }
      }
      
      setRefundedInvoices(refundedSet);
    };

    checkRefunds();
  }, [invoices]);

  if (loading) return <p>{intl.formatMessage({ id: 'userInvoices.loading' })}</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (invoices.length === 0) return <p>{intl.formatMessage({ id: 'userInvoices.noInvoices' })}</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-2">
        {intl.formatMessage({ id: 'userInvoices.title' })}
      </h2>

      <button
        onClick={exportPDF}
        className="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        {intl.formatMessage({ id: 'userInvoices.exportPdf' })}
      </button>

      <ul className="space-y-2">
        {invoices.map((invoice) => {
          const isRefunded = refundedInvoices.has(invoice.id) || invoice.status === 'refunded';
          const isIssued = invoice.status === 'issued';
          
          return (
            <li key={invoice.id} className={`border p-4 rounded-md shadow-sm ${isRefunded ? 'bg-red-50 border-red-200' : isIssued ? 'bg-green-50 border-green-200' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* P0 FIX: Afficher le nom du prestataire (pour clients) ou du client (pour providers) */}
                  {user?.role === 'client' && invoice.providerName && (
                    <p className="mb-1">
                      <strong>{intl.formatMessage({ id: 'userInvoices.provider' })}:</strong>{' '}
                      <span className="text-blue-600">{invoice.providerName}</span>
                    </p>
                  )}
                  {(user?.role === 'lawyer' || user?.role === 'expat') && invoice.clientName && (
                    <p className="mb-1">
                      <strong>{intl.formatMessage({ id: 'userInvoices.client' })}:</strong>{' '}
                      <span className="text-blue-600">{invoice.clientName}</span>
                    </p>
                  )}
                  <p>
                    <strong>{intl.formatMessage({ id: 'userInvoices.amount' })}:</strong> {formatCurrency(invoice.amount, invoice.currency || 'EUR')}
                  </p>
                  <p>
                    <strong>{intl.formatMessage({ id: 'userInvoices.status' })}:</strong>{' '}
                    <span className={isRefunded ? 'text-red-600 font-semibold' : isIssued ? 'text-green-600 font-semibold' : ''}>
                      {isRefunded
                        ? intl.formatMessage({ id: 'userInvoices.statusRefunded' })
                        : isIssued
                        ? intl.formatMessage({ id: 'userInvoices.statusIssued' })
                        : invoice.status}
                    </span>
                    {isRefunded && (
                      <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded font-semibold">
                        {intl.formatMessage({ id: 'userInvoices.refunded' })}
                      </span>
                    )}
                    {isIssued && (
                      <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-semibold">
                        {intl.formatMessage({ id: 'userInvoices.issued' })}
                      </span>
                    )}
                  </p>
                  <p>
                    <strong>{intl.formatMessage({ id: 'userInvoices.date' })}:</strong>{' '}
                    {formatDate(
                      { seconds: invoice.createdAt.seconds },
                      {
                        language,
                        userCountry: (user as { currentCountry?: string; country?: string })?.currentCountry ||
                                     (user as { currentCountry?: string; country?: string })?.country,
                        format: 'medium',
                      }
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 mt-2">
                <a
                  href={invoice.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  {intl.formatMessage({ id: 'userInvoices.downloadInvoice' })}
                </a>

                <button
                  onClick={() => exportSinglePDF(invoice)}
                  className="text-green-600 underline"
                >
                  {intl.formatMessage({ id: 'userInvoices.exportPdf' })}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {hasMore && (
        <button
          onClick={fetchMore}
          disabled={loadingMore}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {loadingMore 
            ? intl.formatMessage({ id: 'userInvoices.loadingMore' })
            : intl.formatMessage({ id: 'userInvoices.loadMore' })
          }
        </button>
      )}
    </div>
  );
}


