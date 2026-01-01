import React from 'react';
import { useIntl } from 'react-intl';
import { Beaker, BarChart2, Trophy, Settings } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

export default function Page() {
  const intl = useIntl();

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Beaker className="w-7 h-7 mr-2 text-purple-600" />
            {intl.formatMessage({ id: 'admin.comms.abtests.title' })}
          </h1>
          <p className="text-gray-600 mt-1">{intl.formatMessage({ id: 'admin.comms.abtests.description' })}</p>
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
                <Beaker className="w-5 h-5 text-purple-600" />
                <h4 className="font-medium text-gray-700">Tests de sujet</h4>
              </div>
              <p className="text-sm text-gray-500">Comparaison de sujets d'email</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
              <div className="flex items-center gap-2 mb-2">
                <BarChart2 className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium text-gray-700">Analyse</h4>
              </div>
              <p className="text-sm text-gray-500">Statistiques de performance</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                <h4 className="font-medium text-gray-700">Gagnants</h4>
              </div>
              <p className="text-sm text-gray-500">Sélection automatique du gagnant</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">{intl.formatMessage({ id: 'admin.comms.abtests.features' })}</p>
        </div>
      </div>
    </AdminLayout>
  );
}
