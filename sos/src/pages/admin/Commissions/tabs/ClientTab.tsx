/**
 * ClientTab - Overview of client-facing settings across all affiliate programs
 * Shows client discounts and pricing applicable when clients use affiliate links
 */
import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import { Loader2, User, Percent, DollarSign, RefreshCw } from 'lucide-react';
import { UI, formatCents } from './shared';

interface AllConfigs {
  chatter: any;
  influencer: any;
  blogger: any;
  groupAdmin: any;
  partner: any;
}

const ClientTab: React.FC = () => {
  const [configs, setConfigs] = useState<AllConfigs | null>(null);
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

  if (loading || !configs) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-gray-500 animate-spin" /></div>;

  const rows = [
    {
      role: 'Chatter',
      icon: '💬',
      discount: 'Aucune remise',
      discountType: 'none' as const,
    },
    {
      role: 'Influenceur',
      icon: '📈',
      discount: `${configs.influencer.clientDiscountPercent ?? 5}%`,
      discountType: 'percent' as const,
    },
    {
      role: 'Blogueur',
      icon: '✏️',
      discount: '0% (pas de remise)',
      discountType: 'none' as const,
    },
    {
      role: 'Admin Groupe',
      icon: '👥',
      discount: formatCents(configs.groupAdmin.clientDiscountAmount ?? 500),
      discountType: 'fixed' as const,
    },
    {
      role: 'Partenaire',
      icon: '🤝',
      discount: 'Configurable par partenaire',
      discountType: 'custom' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Explanation */}
      <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
        <div className="flex items-start gap-3">
          <User className="w-5 h-5 text-gray-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Vue d'ensemble client</p>
            <p className="text-xs text-gray-500 mt-1">
              Remises appliquées aux clients qui utilisent un lien d'affiliation. Ces remises sont configurées dans l'onglet de chaque rôle affilié.
            </p>
          </div>
        </div>
      </div>

      {/* Client Discounts Table */}
      <div className={`${UI.card} overflow-hidden`}>
        <div className="p-4 border-b border-gray-200 dark:border-white/10">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Percent className="w-5 h-5 text-purple-500" />
            Remises client par programme affilié
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Programme</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type de remise</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valeur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {rows.map((row) => (
                <tr key={row.role} className="hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                    <span className="mr-2">{row.icon}</span>{row.role}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {row.discountType === 'percent' && <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">Pourcentage</span>}
                    {row.discountType === 'fixed' && <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">Montant fixe</span>}
                    {row.discountType === 'none' && <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded text-xs">Aucune</span>}
                    {row.discountType === 'custom' && <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">Personnalisé</span>}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">
                    {row.discount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Call Pricing Summary */}
      <div className={`${UI.card} p-6`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-500" />
          Tarification des appels
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          La tarification des appels (ce que paie le client) est configurée séparément dans{' '}
          <a href="/admin/pricing" className="text-red-500 hover:text-red-400 underline">Administration &gt; Tarification</a>.
        </p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
            <p className="font-medium text-amber-800 dark:text-amber-300">Avocat</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">49EUR / 55$ (20 min)</p>
          </div>
          <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
            <p className="font-medium text-teal-800 dark:text-teal-300">Expatrié</p>
            <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">19EUR / 25$ (30 min)</p>
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

export default ClientTab;
