import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import { Percent, ArrowRight, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import Button from '../../components/common/Button';

interface PricingData {
  lawyer?: {
    eur?: { totalAmount: number; connectionFeeAmount: number; providerAmount: number };
    usd?: { totalAmount: number; connectionFeeAmount: number; providerAmount: number };
  };
  expat?: {
    eur?: { totalAmount: number; connectionFeeAmount: number; providerAmount: number };
    usd?: { totalAmount: number; connectionFeeAmount: number; providerAmount: number };
  };
}

const AdminCommissionRules: React.FC = () => {
  const navigate = useNavigate();
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPricing = async () => {
      try {
        const pricingDoc = await getDoc(doc(db, 'admin_config', 'pricing'));
        if (pricingDoc.exists()) {
          setPricing(pricingDoc.data() as PricingData);
        }
      } catch (err) {
        setError('Erreur de chargement des données de tarification');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadPricing();
  }, []);

  const calculateCommission = (total: number, connection: number): string => {
    if (!total || total === 0) return '--';
    return ((connection / total) * 100).toFixed(1) + '%';
  };

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Percent className="w-7 h-7 mr-2 text-indigo-600" />
              Règles de Commission
            </h1>
            <p className="text-gray-600 mt-1">Aperçu des taux de commission par service</p>
          </div>
          <Button
            onClick={() => navigate('/admin/pricing')}
            className="flex items-center gap-2"
          >
            <ExternalLink size={16} />
            Gérer les tarifs
          </Button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-900">Information</h3>
              <p className="text-sm text-blue-700 mt-1">
                Les commissions sont définies dans les tarifs de chaque service.
                Pour modifier les taux, utilisez la page <strong>Gestion des Tarifs</strong>.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Devise
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prix Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission Plateforme
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Part Prestataire
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taux
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Lawyer EUR */}
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Avocat
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">EUR</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {pricing?.lawyer?.eur?.totalAmount ?? '--'}€
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-medium">
                    {pricing?.lawyer?.eur?.connectionFeeAmount ?? '--'}€
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    {pricing?.lawyer?.eur?.providerAmount ?? '--'}€
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {calculateCommission(
                      pricing?.lawyer?.eur?.totalAmount ?? 0,
                      pricing?.lawyer?.eur?.connectionFeeAmount ?? 0
                    )}
                  </td>
                </tr>
                {/* Lawyer USD */}
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Avocat
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">USD</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${pricing?.lawyer?.usd?.totalAmount ?? '--'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-medium">
                    ${pricing?.lawyer?.usd?.connectionFeeAmount ?? '--'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    ${pricing?.lawyer?.usd?.providerAmount ?? '--'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {calculateCommission(
                      pricing?.lawyer?.usd?.totalAmount ?? 0,
                      pricing?.lawyer?.usd?.connectionFeeAmount ?? 0
                    )}
                  </td>
                </tr>
                {/* Expat EUR */}
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Expat
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">EUR</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {pricing?.expat?.eur?.totalAmount ?? '--'}€
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-medium">
                    {pricing?.expat?.eur?.connectionFeeAmount ?? '--'}€
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    {pricing?.expat?.eur?.providerAmount ?? '--'}€
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {calculateCommission(
                      pricing?.expat?.eur?.totalAmount ?? 0,
                      pricing?.expat?.eur?.connectionFeeAmount ?? 0
                    )}
                  </td>
                </tr>
                {/* Expat USD */}
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Expat
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">USD</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${pricing?.expat?.usd?.totalAmount ?? '--'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-medium">
                    ${pricing?.expat?.usd?.connectionFeeAmount ?? '--'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    ${pricing?.expat?.usd?.providerAmount ?? '--'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {calculateCommission(
                      pricing?.expat?.usd?.totalAmount ?? 0,
                      pricing?.expat?.usd?.connectionFeeAmount ?? 0
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button
            onClick={() => navigate('/admin/pricing')}
            className="flex items-center gap-2"
          >
            Modifier les tarifs
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCommissionRules;
