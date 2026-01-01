import React from 'react';
import { useIntl } from 'react-intl';
import { Mail, AlertTriangle, CheckCircle, Settings } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

export default function Page() {
  const intl = useIntl();

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Mail className="w-7 h-7 mr-2 text-green-600" />
            {intl.formatMessage({ id: 'admin.comms.deliverability.title' })}
          </h1>
          <p className="text-gray-600 mt-1">{intl.formatMessage({ id: 'admin.comms.deliverability.description' })}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Settings className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-amber-900">{intl.formatMessage({ id: 'admin.comms.uiOnlyNotice' })}</h3>
              <p className="text-sm text-amber-700 mt-1">{intl.formatMessage({ id: 'admin.comms.comingSoon' })}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fonctionnalités prévues</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h4 className="font-medium text-gray-700">Taux de livraison</h4>
              </div>
              <p className="text-sm text-gray-500">Suivi des taux de livraison</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h4 className="font-medium text-gray-700">Bounces</h4>
              </div>
              <p className="text-sm text-gray-500">Gestion des rebonds</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-5 h-5 text-orange-600" />
                <h4 className="font-medium text-gray-700">Spam</h4>
              </div>
              <p className="text-sm text-gray-500">Suivi des plaintes spam</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">{intl.formatMessage({ id: 'admin.comms.deliverability.features' })}</p>
        </div>
      </div>
    </AdminLayout>
  );
}
