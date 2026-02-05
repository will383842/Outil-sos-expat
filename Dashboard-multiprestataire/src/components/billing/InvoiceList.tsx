/**
 * Invoice List Component
 * Displays invoice history with download option
 */
import { Download, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export interface Invoice {
  id: string;
  number: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  downloadUrl?: string;
}

interface InvoiceListProps {
  invoices: Invoice[];
  isLoading?: boolean;
}

const statusConfig = {
  paid: {
    label: 'Payée',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-700',
    iconClass: 'text-green-600',
  },
  pending: {
    label: 'En attente',
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-700',
    iconClass: 'text-yellow-600',
  },
  overdue: {
    label: 'En retard',
    icon: AlertCircle,
    className: 'bg-red-100 text-red-700',
    iconClass: 'text-red-600',
  },
};

export default function InvoiceList({ invoices, isLoading }: InvoiceListProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Aucune facture disponible</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Facture
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Montant
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Statut
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {invoices.map((invoice) => {
            const status = statusConfig[invoice.status];
            const StatusIcon = status.icon;

            return (
              <tr key={invoice.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-gray-900">
                      {invoice.number}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">{invoice.date}</td>
                <td className="px-6 py-4 text-gray-900 font-medium">
                  €{invoice.amount.toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${status.className}`}
                  >
                    <StatusIcon className={`w-3.5 h-3.5 ${status.iconClass}`} />
                    {status.label}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => {
                      if (invoice.downloadUrl) {
                        window.open(invoice.downloadUrl, '_blank');
                      } else {
                        toast('Téléchargement non disponible', { icon: 'i' });
                      }
                    }}
                    className="text-primary-600 hover:text-primary-800 text-sm font-medium inline-flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
