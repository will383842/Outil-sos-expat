/**
 * IaDashboardTab - Tableau de bord des statistiques IA
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Sparkles,
  Crown,
  DollarSign,
  RefreshCw
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { SubscriptionTier } from '../../../types/subscription';
import { StatCard } from './components/StatCard';
import { SubscriptionStats } from './types';

export const IaDashboardTab: React.FC = () => {
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const subsSnapshot = await getDocs(collection(db, 'subscriptions'));

      const newStats: SubscriptionStats = {
        totalProviders: subsSnapshot.size,
        activeSubscriptions: 0,
        trialUsers: 0,
        paidUsers: 0,
        mrr: 0,
        byTier: {
          trial: 0,
          basic: 0,
          standard: 0,
          pro: 0,
          unlimited: 0
        }
      };

      subsSnapshot.docs.forEach(doc => {
        const sub = doc.data();
        newStats.byTier[sub.tier as SubscriptionTier] = (newStats.byTier[sub.tier as SubscriptionTier] || 0) + 1;

        if (sub.status === 'trialing') {
          newStats.trialUsers++;
        } else if (sub.status === 'active') {
          newStats.activeSubscriptions++;
          newStats.paidUsers++;
          newStats.mrr += sub.currentPeriodAmount || 0;
        }
      });

      setStats(newStats);
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-gray-500">
        Impossible de charger les statistiques
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5 text-indigo-600" />}
          label="Total prestataires"
          value={stats.totalProviders}
          color="bg-indigo-100"
        />
        <StatCard
          icon={<Sparkles className="w-5 h-5 text-blue-600" />}
          label="En essai gratuit"
          value={stats.trialUsers}
          color="bg-blue-100"
        />
        <StatCard
          icon={<Crown className="w-5 h-5 text-purple-600" />}
          label="Abonnés payants"
          value={stats.paidUsers}
          color="bg-purple-100"
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5 text-green-600" />}
          label="MRR"
          value={`${stats.mrr.toLocaleString()}€`}
          color="bg-green-100"
        />
      </div>

      {/* Tier Distribution */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Distribution par tier
        </h2>
        <div className="grid grid-cols-5 gap-4">
          {(['trial', 'basic', 'standard', 'pro', 'unlimited'] as SubscriptionTier[]).map(tier => (
            <div key={tier} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {stats.byTier[tier] || 0}
              </div>
              <div className="text-xs text-gray-500 capitalize">{tier}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Actions rapides
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors cursor-pointer">
            <Users className="w-6 h-6 text-indigo-600 mb-2" />
            <h3 className="font-medium text-gray-900">Accès Prestataires</h3>
            <p className="text-sm text-gray-500">Gérer les accès IA</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors cursor-pointer">
            <Crown className="w-6 h-6 text-purple-600 mb-2" />
            <h3 className="font-medium text-gray-900">Quotas</h3>
            <p className="text-sm text-gray-500">Modifier les quotas</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors cursor-pointer">
            <DollarSign className="w-6 h-6 text-green-600 mb-2" />
            <h3 className="font-medium text-gray-900">Tarification</h3>
            <p className="text-sm text-gray-500">Gérer les plans</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IaDashboardTab;
