/**
 * ExpatRatesTab - Cross-role view of all expat-type commission rates
 */
import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import { Loader2, Globe, RefreshCw } from 'lucide-react';
import { UI, formatCents } from './shared';

const ExpatRatesTab: React.FC = () => {
  const [configs, setConfigs] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [chatter, influencer, blogger, groupAdmin, partner] = await Promise.all([
        httpsCallable(functionsAffiliate, 'adminGetChatterConfig')().then(r => (r.data as any).config || r.data),
        httpsCallable(functionsAffiliate, 'adminGetInfluencerConfig')().then(r => (r.data as any).config || r.data),
        httpsCallable(functionsAffiliate, 'adminGetBloggerConfig')().then(r => (r.data as any).config || r.data),
        httpsCallable(functionsAffiliate, 'adminGetGroupAdminConfig')().then(r => (r.data as any).config || r.data),
        httpsCallable(functionsAffiliate, 'adminGetPartnerConfig')().then(r => (r.data as any).config || r.data).catch(() => ({})),
      ]);
      setConfigs({ chatter, influencer, blogger, groupAdmin, partner });
    } catch (err) {
      console.error('Error fetching configs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  if (loading || !configs) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-teal-500 animate-spin" /></div>;

  const rows = [
    {
      role: 'Chatter',
      icon: '💬',
      clientCall: configs.chatter.commissionClientCallAmountExpat ?? 300,
      providerCall: configs.chatter.commissionProviderCallAmountExpat ?? null,
      captainCall: configs.chatter.commissionCaptainCallAmountExpat ?? 200,
      recruitmentCall: null,
    },
    {
      role: 'Influenceur',
      icon: '📈',
      clientCall: configs.influencer.commissionClientAmountExpat ?? 300,
      providerCall: null,
      captainCall: null,
      recruitmentCall: configs.influencer.commissionRecruitmentAmountExpat ?? 300,
    },
    {
      role: 'Blogueur',
      icon: '✏️',
      clientCall: configs.blogger.commissionClientAmountExpat ?? 300,
      providerCall: null,
      captainCall: null,
      recruitmentCall: configs.blogger.commissionRecruitmentAmountExpat ?? 300,
    },
    {
      role: 'Admin Groupe',
      icon: '👥',
      clientCall: configs.groupAdmin.commissionClientAmountExpat ?? 300,
      providerCall: null,
      captainCall: null,
      recruitmentCall: null,
    },
    {
      role: 'Partenaire',
      icon: '🤝',
      clientCall: configs.partner.defaultCommissionPerCallExpat ?? 300,
      providerCall: null,
      captainCall: null,
      recruitmentCall: null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
        <div className="flex items-start gap-3">
          <Globe className="w-5 h-5 text-teal-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-teal-800 dark:text-teal-300">Vue transversale — Expatrié</p>
            <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">
              Tous les taux de commission pour les appels avec un expatrié aidant, par programme affilié. Modifiez les taux dans l'onglet de chaque rôle.
            </p>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className={`${UI.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-teal-50/50 dark:bg-teal-900/10">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Programme</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Appel client</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Prestataire recruté</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Captain</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Recrutement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {rows.map((row) => (
                <tr key={row.role} className="hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                    <span className="mr-2">{row.icon}</span>{row.role}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono text-sm font-semibold text-teal-700 dark:text-teal-300">
                      {formatCents(row.clientCall)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.providerCall !== null ? (
                      <span className="font-mono text-sm font-semibold text-blue-700 dark:text-blue-300">
                        {formatCents(row.providerCall)}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.captainCall !== null ? (
                      <span className="font-mono text-sm font-semibold text-yellow-700 dark:text-yellow-300">
                        {formatCents(row.captainCall)}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.recruitmentCall !== null ? (
                      <span className="font-mono text-sm font-semibold text-green-700 dark:text-green-300">
                        {formatCents(row.recruitmentCall)}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chatter N1/N2 */}
      <div className={`${UI.card} p-6`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Chatter — Commissions réseau (tous types confondus)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-center">
            <p className="text-xs text-gray-500">N1 appel</p>
            <p className="font-mono font-semibold text-gray-900 dark:text-white">{formatCents(configs.chatter.commissionN1CallAmount ?? 100)}</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-center">
            <p className="text-xs text-gray-500">N2 appel</p>
            <p className="font-mono font-semibold text-gray-900 dark:text-white">{formatCents(configs.chatter.commissionN2CallAmount ?? 50)}</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-center">
            <p className="text-xs text-gray-500">Bonus activation</p>
            <p className="font-mono font-semibold text-gray-900 dark:text-white">{formatCents(configs.chatter.commissionActivationBonusAmount ?? 500)}</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-center">
            <p className="text-xs text-gray-500">Bonus N1→N2</p>
            <p className="font-mono font-semibold text-gray-900 dark:text-white">{formatCents(configs.chatter.commissionN1RecruitBonusAmount ?? 100)}</p>
          </div>
        </div>
      </div>

      {/* GroupAdmin N1/N2 */}
      <div className={`${UI.card} p-6`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Admin Groupe — Commissions réseau</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-center">
            <p className="text-xs text-gray-500">N1 appel</p>
            <p className="font-mono font-semibold text-gray-900 dark:text-white">{formatCents(configs.groupAdmin.commissionN1CallAmount ?? 100)}</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-center">
            <p className="text-xs text-gray-500">N2 appel</p>
            <p className="font-mono font-semibold text-gray-900 dark:text-white">{formatCents(configs.groupAdmin.commissionN2CallAmount ?? 50)}</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-center">
            <p className="text-xs text-gray-500">Bonus activation</p>
            <p className="font-mono font-semibold text-gray-900 dark:text-white">{formatCents(configs.groupAdmin.commissionActivationBonusAmount ?? 500)}</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-center">
            <p className="text-xs text-gray-500">Bonus N1→N2</p>
            <p className="font-mono font-semibold text-gray-900 dark:text-white">{formatCents(configs.groupAdmin.commissionN1RecruitBonusAmount ?? 100)}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={fetchAll} className={`${UI.button.secondary} px-4 py-2 flex items-center gap-2 text-sm`}>
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>
    </div>
  );
};

export default ExpatRatesTab;
