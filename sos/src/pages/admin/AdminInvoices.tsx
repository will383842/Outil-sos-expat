import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, startAfter, limit, QueryDocumentSnapshot, DocumentData, Timestamp, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';

interface AdminInvoice {
  id: string;
  callId: string;
  clientData?: {
    name?: string;
    email?: string;
    country?: string;
  };
  providerData?: {
    name?: string;
    email?: string;
    phone?: string;
    country?: string;
  };
  financialData?: {
    totalAmount: number;
    currency: string;
    platformFee: number;
    providerAmount: number;
  };
  invoices: {
    platform: {
      number: string;
      url: string;
      amount: number;
      fileName?: string;
      fileSize?: number;
    };
    provider: {
      number: string;
      url: string;
      amount: number;
      fileName?: string;
      fileSize?: number;
    };
  };
  metadata: {
    generatedAt: Timestamp;
    status: string;
  };
}

const AdminInvoices = () => {
  const intl = useIntl();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState('');

  const INVOICES_PER_PAGE = 50;

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
      return;
    }
    fetchInvoices();
  }, [page, selectedMonth, currentUser, navigate]);

  const fetchInvoices = async () => {
    setLoading(true);
    const baseQuery = collection(db, 'admin_invoices');

    let q = query(baseQuery, orderBy('metadata.generatedAt', 'desc'));

    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);

      q = query(
        baseQuery,
        where('metadata.generatedAt', '>=', startDate),
        where('metadata.generatedAt', '<=', endDate),
        orderBy('metadata.generatedAt', 'desc')
      );
    }

    if (lastVisible) {
      q = query(q, startAfter(lastVisible), limit(INVOICES_PER_PAGE));
    } else {
      q = query(q, limit(INVOICES_PER_PAGE));
    }

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AdminInvoice[];

    if (snapshot.docs.length < INVOICES_PER_PAGE) setHasMore(false);
    setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
    setInvoices(prev => [...prev, ...data]);
    setLoading(false);
  };

  return (
    <AdminLayout>
      <div className="p-6 text-black">
        <h1 className="text-2xl font-bold mb-4">{intl.formatMessage({ id: 'admin.invoices.title' })}</h1>

        <div className="mb-4">
          <label className="mr-2 font-medium">{intl.formatMessage({ id: 'admin.invoices.filterByMonth' })}</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => {
              setInvoices([]);
              setLastVisible(null);
              setHasMore(true);
              setPage(1);
              setSelectedMonth(e.target.value);
            }}
            className="border p-1 rounded"
          />
        </div>

        <div className="overflow-x-auto text-black">
          <table className="min-w-full text-sm text-left border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2">{intl.formatMessage({ id: 'admin.invoices.table.call' })}</th>
                <th className="p-2">{intl.formatMessage({ id: 'admin.invoices.table.client' })}</th>
                <th className="p-2">{intl.formatMessage({ id: 'admin.invoices.table.provider' })}</th>
                <th className="p-2">{intl.formatMessage({ id: 'admin.invoices.table.amount' })}</th>
                <th className="p-2">{intl.formatMessage({ id: 'admin.invoices.table.date' })}</th>
                <th className="p-2">{intl.formatMessage({ id: 'admin.invoices.table.status' })}</th>
                <th className="p-2">{intl.formatMessage({ id: 'admin.invoices.table.actions' })}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-t">
                  <td className="p-2">{inv.callId}</td>
                  <td className="p-2">{inv.clientData?.name || intl.formatMessage({ id: 'admin.invoices.na' })}</td>
                  <td className="p-2">{inv.providerData?.name || intl.formatMessage({ id: 'admin.invoices.na' })}</td>
                  <td className="p-2">
                    {inv.financialData?.totalAmount !== undefined
                      ? intl.formatNumber(inv.financialData.totalAmount, { style: 'currency', currency: inv.financialData?.currency || 'EUR' })
                      : intl.formatMessage({ id: 'admin.invoices.na' })}
                  </td>
                  <td className="p-2">{inv.metadata.generatedAt?.toDate() ? intl.formatDate(inv.metadata.generatedAt.toDate()) : intl.formatMessage({ id: 'admin.invoices.na' })}</td>
                  <td className="p-2">{inv.metadata.status}</td>
                  <td className="p-2 flex flex-col gap-1">
                    <div>
                      <a href={inv.invoices.platform.url} target="_blank" rel="noreferrer" title={intl.formatMessage({ id: 'admin.invoices.platformInvoice' })}>
                        {intl.formatMessage({ id: 'admin.invoices.platformInvoice' })} - {inv.invoices.platform.fileName || inv.invoices.platform.number} ({inv.invoices.platform.fileSize || '?'} ko)
                      </a>
                    </div>
                    <div>
                      <a href={inv.invoices.provider.url} target="_blank" rel="noreferrer" title={intl.formatMessage({ id: 'admin.invoices.providerInvoice' })}>
                        {intl.formatMessage({ id: 'admin.invoices.providerInvoice' })} - {inv.invoices.provider.fileName || inv.invoices.provider.number} ({inv.invoices.provider.fileSize || '?'} ko)
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && (
            <div className="flex justify-center py-4 text-gray-500">
              <Loader2 className="animate-spin mr-2" /> {intl.formatMessage({ id: 'admin.invoices.loading' })}
            </div>
          )}
          {!loading && hasMore && (
            <div className="flex justify-center mt-4">
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                onClick={() => setPage(prev => prev + 1)}
              >
                {intl.formatMessage({ id: 'admin.invoices.loadMore' })}
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminInvoices;

