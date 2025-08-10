import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  Globe, 
  Calendar,
  MessageSquare,
  Download,
  RefreshCw,
  Eye,
  CheckCircle,
  AlertCircle,
  Activity,
  Zap,
  Brain,
  Sparkles
} from 'lucide-react';

export default function Statistics() {
  const [timeRange, setTimeRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('requests');

  // Données simulées enrichies
  const stats = {
    totalRequests: 156,
    completedRequests: 142,
    pendingRequests: 8,
    averageTime: 8.5,
    activeUsers: 7,
    successRate: 91.0,
    totalTokens: 1247382,
    avgTokensPerRequest: 8764,
    
    topCountries: [
      { name: 'France', count: 45, flag: '🇫🇷', percentage: 28.8 },
      { name: 'Maroc', count: 32, flag: '🇲🇦', percentage: 20.5 },
      { name: 'Allemagne', count: 28, flag: '🇩🇪', percentage: 17.9 },
      { name: 'Espagne', count: 21, flag: '🇪🇸', percentage: 13.5 },
      { name: 'Italie', count: 18, flag: '🇮🇹', percentage: 11.5 },
    ],
    
    topLanguages: [
      { name: 'Français', count: 89, percentage: 57.1, color: 'from-blue-400 to-blue-600' },
      { name: 'Anglais', count: 34, percentage: 21.8, color: 'from-emerald-400 to-emerald-600' },
      { name: 'Espagnol', count: 21, percentage: 13.5, color: 'from-amber-400 to-amber-600' },
      { name: 'Allemand', count: 12, percentage: 7.7, color: 'from-purple-400 to-purple-600' },
    ],
    
    weeklyData: [
      { day: 'Lun', requests: 12, responses: 11, avgTime: 7.2 },
      { day: 'Mar', requests: 19, responses: 18, avgTime: 8.1 },
      { day: 'Mer', requests: 15, responses: 14, avgTime: 9.3 },
      { day: 'Jeu', requests: 22, responses: 21, avgTime: 8.7 },
      { day: 'Ven', requests: 28, responses: 26, avgTime: 7.9 },
      { day: 'Sam', requests: 8, responses: 8, avgTime: 6.4 },
      { day: 'Dim', requests: 5, responses: 5, avgTime: 5.8 },
    ],

    responseTypes: [
      { type: 'Support technique', count: 45, color: 'from-rose-400 to-pink-600', icon: '🔧' },
      { type: 'Information produit', count: 38, color: 'from-blue-400 to-indigo-600', icon: '📋' },
      { type: 'Facturation', count: 28, color: 'from-emerald-400 to-green-600', icon: '💳' },
      { type: 'Autre', count: 25, color: 'from-amber-400 to-orange-600', icon: '💬' },
    ]
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
  };

  const exportData = () => {
    const csvData = [
      ['Métrique', 'Valeur'],
      ['Demandes totales', stats.totalRequests],
      ['Demandes terminées', stats.completedRequests],
      ['Temps moyen (min)', stats.averageTime],
      ['Utilisateurs actifs', stats.activeUsers],
      ['Taux de succès (%)', stats.successRate],
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistiques-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-6">
      {/* En-tête avec effet glassmorphism */}
      <div className="mb-8">
        <div className="backdrop-blur-xl bg-white/40 border border-white/20 rounded-3xl p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Brain size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-slate-800 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                  Dashboard IA 🚀
                </h1>
                <p className="text-slate-600 text-lg font-medium">
                  Intelligence artificielle • Analytics temps réel • Performance optimisée
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <select 
                value={timeRange} 
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-6 py-3 bg-white/70 border-2 border-white/30 rounded-2xl backdrop-blur-sm focus:ring-4 focus:ring-purple-200 focus:border-purple-300 transition-all duration-300 font-semibold text-slate-700 shadow-lg"
              >
                <option value="24h">🕐 Dernières 24h</option>
                <option value="7d">📅 7 derniers jours</option>
                <option value="30d">📊 30 derniers jours</option>
                <option value="90d">📈 3 derniers mois</option>
              </select>
              
              <button 
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all duration-300 font-bold shadow-xl hover:shadow-2xl hover:scale-105"
              >
                <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                Actualiser
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs principaux avec effets néomorphisme */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <div className="group relative overflow-hidden bg-gradient-to-br from-white to-blue-50 rounded-3xl p-6 shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-500 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-purple-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <BarChart3 size={28} className="text-white" />
              </div>
              <Sparkles size={20} className="text-blue-400 animate-pulse" />
            </div>
            <p className="text-slate-600 font-semibold mb-2">Demandes totales</p>
            <p className="text-4xl font-black text-slate-800 mb-2">{stats.totalRequests.toLocaleString()}</p>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold">+12%</span>
              <span className="text-slate-500 text-sm">vs période précédente</span>
            </div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden bg-gradient-to-br from-white to-emerald-50 rounded-3xl p-6 shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-500 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 to-green-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <CheckCircle size={28} className="text-white" />
              </div>
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-ping"></div>
            </div>
            <p className="text-slate-600 font-semibold mb-2">Taux de succès</p>
            <p className="text-4xl font-black text-slate-800 mb-2">{stats.successRate}%</p>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold">Excellent</span>
              <span className="text-slate-500 text-sm">🎯 Performance</span>
            </div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden bg-gradient-to-br from-white to-amber-50 rounded-3xl p-6 shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-500 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 to-orange-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Zap size={28} className="text-white" />
              </div>
              <Clock size={20} className="text-amber-500 animate-pulse" />
            </div>
            <p className="text-slate-600 font-semibold mb-2">Temps moyen</p>
            <p className="text-4xl font-black text-slate-800 mb-2">{stats.averageTime}min</p>
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">⚡ Rapide</span>
              <span className="text-slate-500 text-sm">-5% vs objectif</span>
            </div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden bg-gradient-to-br from-white to-purple-50 rounded-3xl p-6 shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-500 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-pink-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Users size={28} className="text-white" />
              </div>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
            <p className="text-slate-600 font-semibold mb-2">Utilisateurs actifs</p>
            <p className="text-4xl font-black text-slate-800 mb-2">{stats.activeUsers}</p>
            <div className="flex items-center gap-2">
              <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-bold">🔥 En ligne</span>
              <span className="text-slate-500 text-sm">maintenant</span>
            </div>
          </div>
        </div>
      </div>

      {/* Métriques IA avancées */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Activity size={24} className="text-white" />
            </div>
            <h3 className="font-bold text-xl">Tokens IA 🧠</h3>
          </div>
          <p className="text-3xl font-black mb-2">{stats.totalTokens.toLocaleString()}</p>
          <p className="text-indigo-100">Moyenne: {stats.avgTokensPerRequest.toLocaleString()} par demande</p>
        </div>

        <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl p-6 text-white shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <AlertCircle size={24} className="text-white" />
            </div>
            <h3 className="font-bold text-xl">File d'attente ⏳</h3>
          </div>
          <p className="text-3xl font-black mb-2">{stats.pendingRequests}</p>
          <p className="text-rose-100">Demandes en cours de traitement</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Eye size={24} className="text-white" />
            </div>
            <h3 className="font-bold text-xl">Engagement 👀</h3>
          </div>
          <p className="text-3xl font-black mb-2">2.3x</p>
          <p className="text-emerald-100">Consultations moyennes par demande</p>
        </div>
      </div>

      {/* Graphique d'activité moderne */}
      <div className="backdrop-blur-xl bg-white/60 border border-white/30 rounded-3xl p-8 shadow-2xl mb-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
          <h3 className="font-black text-2xl text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Calendar size={20} className="text-white" />
            </div>
            Activité temps réel 📊
          </h3>
          <div className="flex gap-3">
            <button 
              onClick={() => setSelectedMetric('requests')}
              className={`px-6 py-3 rounded-2xl font-bold transition-all duration-300 ${
                selectedMetric === 'requests' 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105' 
                  : 'bg-white/70 text-slate-600 hover:bg-white/90 border border-white/50'
              }`}
            >
              📈 Demandes
            </button>
            <button 
              onClick={() => setSelectedMetric('time')}
              className={`px-6 py-3 rounded-2xl font-bold transition-all duration-300 ${
                selectedMetric === 'time' 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105' 
                  : 'bg-white/70 text-slate-600 hover:bg-white/90 border border-white/50'
              }`}
            >
              ⚡ Temps
            </button>
          </div>
        </div>
        
        <div className="flex items-end justify-between h-64 gap-4">
          {stats.weeklyData.map((data, index) => {
            const value = selectedMetric === 'requests' ? data.requests : data.avgTime;
            const maxValue = selectedMetric === 'requests' 
              ? Math.max(...stats.weeklyData.map(d => d.requests))
              : Math.max(...stats.weeklyData.map(d => d.avgTime));
            const height = (value / maxValue) * 100;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center group cursor-pointer">
                <div className="w-full bg-gradient-to-t from-slate-200 to-slate-100 rounded-2xl overflow-hidden relative shadow-inner">
                  <div 
                    className={`w-full transition-all duration-700 rounded-2xl ${
                      selectedMetric === 'requests' 
                        ? 'bg-gradient-to-t from-purple-600 via-purple-500 to-pink-400' 
                        : 'bg-gradient-to-t from-blue-600 via-blue-500 to-cyan-400'
                    } group-hover:shadow-lg group-hover:scale-105`}
                    style={{ height: `${height}%`, minHeight: '12px' }}
                  ></div>
                  
                  {/* Tooltip amélioré */}
                  <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-slate-800 to-slate-700 text-white px-4 py-2 rounded-xl text-sm opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap shadow-xl backdrop-blur-sm">
                    <div className="font-bold">{selectedMetric === 'requests' ? `${value} demandes` : `${value}min`}</div>
                    <div className="text-xs text-slate-300">{data.day}</div>
                  </div>
                </div>
                <span className="text-sm text-slate-600 mt-3 font-bold">{data.day}</span>
                <span className="text-lg font-black text-slate-800">{value}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Analyses géographiques et linguistiques modernisées */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        <div className="backdrop-blur-xl bg-white/60 border border-white/30 rounded-3xl p-8 shadow-2xl">
          <h3 className="font-black text-2xl text-slate-800 mb-8 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
              <Globe size={20} className="text-white" />
            </div>
            Carte mondiale 🌍
          </h3>
          
          <div className="space-y-6">
            {stats.topCountries.map((country, index) => (
              <div key={index} className="group flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-white/50 to-white/30 border border-white/30 hover:shadow-lg transition-all duration-300 hover:scale-105">
                <div className="flex items-center gap-4">
                  <div className="text-3xl group-hover:scale-110 transition-transform duration-300">{country.flag}</div>
                  <span className="text-lg font-bold text-slate-800">{country.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-4 bg-gradient-to-r from-slate-200 to-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000 shadow-sm"
                      style={{ width: `${country.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-right min-w-[4rem]">
                    <span className="text-xl font-black text-slate-800">{country.count}</span>
                    <span className="text-sm text-slate-500 block font-semibold">{country.percentage}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="backdrop-blur-xl bg-white/60 border border-white/30 rounded-3xl p-8 shadow-2xl">
          <h3 className="font-black text-2xl text-slate-800 mb-8 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
              <MessageSquare size={20} className="text-white" />
            </div>
            Langues IA 🗣️
          </h3>
          
          <div className="space-y-6">
            {stats.topLanguages.map((language, index) => (
              <div key={index} className="group flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-white/50 to-white/30 border border-white/30 hover:shadow-lg transition-all duration-300 hover:scale-105">
                <span className="text-lg font-bold text-slate-800">{language.name}</span>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-4 bg-gradient-to-r from-slate-200 to-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className={`h-full bg-gradient-to-r ${language.color} rounded-full transition-all duration-1000 shadow-sm`}
                      style={{ width: `${language.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-right min-w-[4rem]">
                    <span className="text-xl font-black text-slate-800">{language.count}</span>
                    <span className="text-sm text-slate-500 block font-semibold">{language.percentage}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Types de demandes avec design futuriste */}
      <div className="backdrop-blur-xl bg-white/60 border border-white/30 rounded-3xl p-8 shadow-2xl mb-8">
        <h3 className="font-black text-2xl text-slate-800 mb-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl flex items-center justify-center">
            <BarChart3 size={20} className="text-white" />
          </div>
          Catégories IA 🎯
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.responseTypes.map((type, index) => (
            <div key={index} className="group relative overflow-hidden bg-gradient-to-br from-white/70 to-white/50 border border-white/40 rounded-3xl p-6 hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-500" style={{background: `linear-gradient(135deg, ${type.color.split(' ')[1]}, ${type.color.split(' ')[3]})`}}></div>
              <div className="relative z-10 text-center">
                <div className={`w-20 h-20 bg-gradient-to-br ${type.color} rounded-3xl mx-auto mb-4 flex items-center justify-center text-white font-black text-2xl shadow-xl group-hover:rotate-12 transition-transform duration-500`}>
                  <span className="text-2xl">{type.icon}</span>
                </div>
                <p className="text-lg font-bold text-slate-800 mb-2">{type.type}</p>
                <p className="text-3xl font-black text-slate-800 mb-2">{type.count}</p>
                <div className="bg-gradient-to-r from-slate-100 to-slate-50 px-4 py-2 rounded-full">
                  <span className="text-sm font-bold text-slate-600">
                    {((type.count / stats.totalRequests) * 100).toFixed(1)}% du total
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions avec design premium */}
      <div className="flex flex-col lg:flex-row gap-6 justify-center items-center">
        <button 
          onClick={exportData}
          className="group flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-10 py-4 rounded-2xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-black text-lg shadow-2xl hover:shadow-3xl hover:scale-105"
        >
          <Download size={24} className="group-hover:animate-bounce" />
          📊 Exporter les données (CSV)
        </button>
        
        <button className="group flex items-center justify-center gap-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white px-10 py-4 rounded-2xl hover:from-slate-700 hover:to-slate-800 transition-all duration-300 font-black text-lg shadow-2xl hover:shadow-3xl hover:scale-105">
          <Calendar size={24} className="group-hover:animate-pulse" />
          📅 Planifier un rapport
        </button>
      </div>

      {/* Particules d'animation en arrière-plan */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-400 rounded-full animate-ping opacity-20"></div>
        <div className="absolute top-3/4 right-1/4 w-3 h-3 bg-pink-400 rounded-full animate-pulse opacity-20"></div>
        <div className="absolute top-1/2 left-3/4 w-1 h-1 bg-blue-400 rounded-full animate-bounce opacity-30"></div>
      </div>
    </div>
  );
}import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  Globe, 
  Calendar,
  MessageSquare,
  Download,
  RefreshCw,
  Eye,
  CheckCircle,
  AlertCircle,
  Activity,
  Zap,
  Brain,
  Sparkles
} from 'lucide-react';

export default function Statistics() {
  const [timeRange, setTimeRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('requests');

  // Données simulées enrichies
  const stats = {
    totalRequests: 156,
    completedRequests: 142,
    pendingRequests: 8,
    averageTime: 8.5,
    activeUsers: 7,
    successRate: 91.0,
    totalTokens: 1247382,
    avgTokensPerRequest: 8764,
    
    topCountries: [
      { name: 'France', count: 45, flag: '🇫🇷', percentage: 28.8 },
      { name: 'Maroc', count: 32, flag: '🇲🇦', percentage: 20.5 },
      { name: 'Allemagne', count: 28, flag: '🇩🇪', percentage: 17.9 },
      { name: 'Espagne', count: 21, flag: '🇪🇸', percentage: 13.5 },
      { name: 'Italie', count: 18, flag: '🇮🇹', percentage: 11.5 },
    ],
    
    topLanguages: [
      { name: 'Français', count: 89, percentage: 57.1, color: 'from-blue-400 to-blue-600' },
      { name: 'Anglais', count: 34, percentage: 21.8, color: 'from-emerald-400 to-emerald-600' },
      { name: 'Espagnol', count: 21, percentage: 13.5, color: 'from-amber-400 to-amber-600' },
      { name: 'Allemand', count: 12, percentage: 7.7, color: 'from-purple-400 to-purple-600' },
    ],
    
    weeklyData: [
      { day: 'Lun', requests: 12, responses: 11, avgTime: 7.2 },
      { day: 'Mar', requests: 19, responses: 18, avgTime: 8.1 },
      { day: 'Mer', requests: 15, responses: 14, avgTime: 9.3 },
      { day: 'Jeu', requests: 22, responses: 21, avgTime: 8.7 },
      { day: 'Ven', requests: 28, responses: 26, avgTime: 7.9 },
      { day: 'Sam', requests: 8, responses: 8, avgTime: 6.4 },
      { day: 'Dim', requests: 5, responses: 5, avgTime: 5.8 },
    ],

    responseTypes: [
      { type: 'Support technique', count: 45, color: 'from-rose-400 to-pink-600', icon: '🔧' },
      { type: 'Information produit', count: 38, color: 'from-blue-400 to-indigo-600', icon: '📋' },
      { type: 'Facturation', count: 28, color: 'from-emerald-400 to-green-600', icon: '💳' },
      { type: 'Autre', count: 25, color: 'from-amber-400 to-orange-600', icon: '💬' },
    ]
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
  };

  const exportData = () => {
    const csvData = [
      ['Métrique', 'Valeur'],
      ['Demandes totales', stats.totalRequests],
      ['Demandes terminées', stats.completedRequests],
      ['Temps moyen (min)', stats.averageTime],
      ['Utilisateurs actifs', stats.activeUsers],
      ['Taux de succès (%)', stats.successRate],
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistiques-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-6">
      {/* En-tête avec effet glassmorphism */}
      <div className="mb-8">
        <div className="backdrop-blur-xl bg-white/40 border border-white/20 rounded-3xl p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Brain size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-slate-800 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                  Dashboard IA 🚀
                </h1>
                <p className="text-slate-600 text-lg font-medium">
                  Intelligence artificielle • Analytics temps réel • Performance optimisée
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <select 
                value={timeRange} 
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-6 py-3 bg-white/70 border-2 border-white/30 rounded-2xl backdrop-blur-sm focus:ring-4 focus:ring-purple-200 focus:border-purple-300 transition-all duration-300 font-semibold text-slate-700 shadow-lg"
              >
                <option value="24h">🕐 Dernières 24h</option>
                <option value="7d">📅 7 derniers jours</option>
                <option value="30d">📊 30 derniers jours</option>
                <option value="90d">📈 3 derniers mois</option>
              </select>
              
              <button 
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all duration-300 font-bold shadow-xl hover:shadow-2xl hover:scale-105"
              >
                <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                Actualiser
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs principaux avec effets néomorphisme */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <div className="group relative overflow-hidden bg-gradient-to-br from-white to-blue-50 rounded-3xl p-6 shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-500 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-purple-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <BarChart3 size={28} className="text-white" />
              </div>
              <Sparkles size={20} className="text-blue-400 animate-pulse" />
            </div>
            <p className="text-slate-600 font-semibold mb-2">Demandes totales</p>
            <p className="text-4xl font-black text-slate-800 mb-2">{stats.totalRequests.toLocaleString()}</p>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold">+12%</span>
              <span className="text-slate-500 text-sm">vs période précédente</span>
            </div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden bg-gradient-to-br from-white to-emerald-50 rounded-3xl p-6 shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-500 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 to-green-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <CheckCircle size={28} className="text-white" />
              </div>
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-ping"></div>
            </div>
            <p className="text-slate-600 font-semibold mb-2">Taux de succès</p>
            <p className="text-4xl font-black text-slate-800 mb-2">{stats.successRate}%</p>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold">Excellent</span>
              <span className="text-slate-500 text-sm">🎯 Performance</span>
            </div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden bg-gradient-to-br from-white to-amber-50 rounded-3xl p-6 shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-500 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 to-orange-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Zap size={28} className="text-white" />
              </div>
              <Clock size={20} className="text-amber-500 animate-pulse" />
            </div>
            <p className="text-slate-600 font-semibold mb-2">Temps moyen</p>
            <p className="text-4xl font-black text-slate-800 mb-2">{stats.averageTime}min</p>
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">⚡ Rapide</span>
              <span className="text-slate-500 text-sm">-5% vs objectif</span>
            </div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden bg-gradient-to-br from-white to-purple-50 rounded-3xl p-6 shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-500 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-pink-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Users size={28} className="text-white" />
              </div>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
            <p className="text-slate-600 font-semibold mb-2">Utilisateurs actifs</p>
            <p className="text-4xl font-black text-slate-800 mb-2">{stats.activeUsers}</p>
            <div className="flex items-center gap-2">
              <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-bold">🔥 En ligne</span>
              <span className="text-slate-500 text-sm">maintenant</span>
            </div>
          </div>
        </div>
      </div>

      {/* Métriques IA avancées */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Activity size={24} className="text-white" />
            </div>
            <h3 className="font-bold text-xl">Tokens IA 🧠</h3>
          </div>
          <p className="text-3xl font-black mb-2">{stats.totalTokens.toLocaleString()}</p>
          <p className="text-indigo-100">Moyenne: {stats.avgTokensPerRequest.toLocaleString()} par demande</p>
        </div>

        <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl p-6 text-white shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <AlertCircle size={24} className="text-white" />
            </div>
            <h3 className="font-bold text-xl">File d'attente ⏳</h3>
          </div>
          <p className="text-3xl font-black mb-2">{stats.pendingRequests}</p>
          <p className="text-rose-100">Demandes en cours de traitement</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Eye size={24} className="text-white" />
            </div>
            <h3 className="font-bold text-xl">Engagement 👀</h3>
          </div>
          <p className="text-3xl font-black mb-2">2.3x</p>
          <p className="text-emerald-100">Consultations moyennes par demande</p>
        </div>
      </div>

      {/* Graphique d'activité moderne */}
      <div className="backdrop-blur-xl bg-white/60 border border-white/30 rounded-3xl p-8 shadow-2xl mb-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
          <h3 className="font-black text-2xl text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Calendar size={20} className="text-white" />
            </div>
            Activité temps réel 📊
          </h3>
          <div className="flex gap-3">
            <button 
              onClick={() => setSelectedMetric('requests')}
              className={`px-6 py-3 rounded-2xl font-bold transition-all duration-300 ${
                selectedMetric === 'requests' 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105' 
                  : 'bg-white/70 text-slate-600 hover:bg-white/90 border border-white/50'
              }`}
            >
              📈 Demandes
            </button>
            <button 
              onClick={() => setSelectedMetric('time')}
              className={`px-6 py-3 rounded-2xl font-bold transition-all duration-300 ${
                selectedMetric === 'time' 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105' 
                  : 'bg-white/70 text-slate-600 hover:bg-white/90 border border-white/50'
              }`}
            >
              ⚡ Temps
            </button>
          </div>
        </div>
        
        <div className="flex items-end justify-between h-64 gap-4">
          {stats.weeklyData.map((data, index) => {
            const value = selectedMetric === 'requests' ? data.requests : data.avgTime;
            const maxValue = selectedMetric === 'requests' 
              ? Math.max(...stats.weeklyData.map(d => d.requests))
              : Math.max(...stats.weeklyData.map(d => d.avgTime));
            const height = (value / maxValue) * 100;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center group cursor-pointer">
                <div className="w-full bg-gradient-to-t from-slate-200 to-slate-100 rounded-2xl overflow-hidden relative shadow-inner">
                  <div 
                    className={`w-full transition-all duration-700 rounded-2xl ${
                      selectedMetric === 'requests' 
                        ? 'bg-gradient-to-t from-purple-600 via-purple-500 to-pink-400' 
                        : 'bg-gradient-to-t from-blue-600 via-blue-500 to-cyan-400'
                    } group-hover:shadow-lg group-hover:scale-105`}
                    style={{ height: `${height}%`, minHeight: '12px' }}
                  ></div>
                  
                  {/* Tooltip amélioré */}
                  <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-slate-800 to-slate-700 text-white px-4 py-2 rounded-xl text-sm opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap shadow-xl backdrop-blur-sm">
                    <div className="font-bold">{selectedMetric === 'requests' ? `${value} demandes` : `${value}min`}</div>
                    <div className="text-xs text-slate-300">{data.day}</div>
                  </div>
                </div>
                <span className="text-sm text-slate-600 mt-3 font-bold">{data.day}</span>
                <span className="text-lg font-black text-slate-800">{value}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Analyses géographiques et linguistiques modernisées */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        <div className="backdrop-blur-xl bg-white/60 border border-white/30 rounded-3xl p-8 shadow-2xl">
          <h3 className="font-black text-2xl text-slate-800 mb-8 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
              <Globe size={20} className="text-white" />
            </div>
            Carte mondiale 🌍
          </h3>
          
          <div className="space-y-6">
            {stats.topCountries.map((country, index) => (
              <div key={index} className="group flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-white/50 to-white/30 border border-white/30 hover:shadow-lg transition-all duration-300 hover:scale-105">
                <div className="flex items-center gap-4">
                  <div className="text-3xl group-hover:scale-110 transition-transform duration-300">{country.flag}</div>
                  <span className="text-lg font-bold text-slate-800">{country.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-4 bg-gradient-to-r from-slate-200 to-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000 shadow-sm"
                      style={{ width: `${country.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-right min-w-[4rem]">
                    <span className="text-xl font-black text-slate-800">{country.count}</span>
                    <span className="text-sm text-slate-500 block font-semibold">{country.percentage}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="backdrop-blur-xl bg-white/60 border border-white/30 rounded-3xl p-8 shadow-2xl">
          <h3 className="font-black text-2xl text-slate-800 mb-8 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
              <MessageSquare size={20} className="text-white" />
            </div>
            Langues IA 🗣️
          </h3>
          
          <div className="space-y-6">
            {stats.topLanguages.map((language, index) => (
              <div key={index} className="group flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-white/50 to-white/30 border border-white/30 hover:shadow-lg transition-all duration-300 hover:scale-105">
                <span className="text-lg font-bold text-slate-800">{language.name}</span>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-4 bg-gradient-to-r from-slate-200 to-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className={`h-full bg-gradient-to-r ${language.color} rounded-full transition-all duration-1000 shadow-sm`}
                      style={{ width: `${language.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-right min-w-[4rem]">
                    <span className="text-xl font-black text-slate-800">{language.count}</span>
                    <span className="text-sm text-slate-500 block font-semibold">{language.percentage}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Types de demandes avec design futuriste */}
      <div className="backdrop-blur-xl bg-white/60 border border-white/30 rounded-3xl p-8 shadow-2xl mb-8">
        <h3 className="font-black text-2xl text-slate-800 mb-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl flex items-center justify-center">
            <BarChart3 size={20} className="text-white" />
          </div>
          Catégories IA 🎯
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.responseTypes.map((type, index) => (
            <div key={index} className="group relative overflow-hidden bg-gradient-to-br from-white/70 to-white/50 border border-white/40 rounded-3xl p-6 hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-500" style={{background: `linear-gradient(135deg, ${type.color.split(' ')[1]}, ${type.color.split(' ')[3]})`}}></div>
              <div className="relative z-10 text-center">
                <div className={`w-20 h-20 bg-gradient-to-br ${type.color} rounded-3xl mx-auto mb-4 flex items-center justify-center text-white font-black text-2xl shadow-xl group-hover:rotate-12 transition-transform duration-500`}>
                  <span className="text-2xl">{type.icon}</span>
                </div>
                <p className="text-lg font-bold text-slate-800 mb-2">{type.type}</p>
                <p className="text-3xl font-black text-slate-800 mb-2">{type.count}</p>
                <div className="bg-gradient-to-r from-slate-100 to-slate-50 px-4 py-2 rounded-full">
                  <span className="text-sm font-bold text-slate-600">
                    {((type.count / stats.totalRequests) * 100).toFixed(1)}% du total
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions avec design premium */}
      <div className="flex flex-col lg:flex-row gap-6 justify-center items-center">
        <button 
          onClick={exportData}
          className="group flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-10 py-4 rounded-2xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-black text-lg shadow-2xl hover:shadow-3xl hover:scale-105"
        >
          <Download size={24} className="group-hover:animate-bounce" />
          📊 Exporter les données (CSV)
        </button>
        
        <button className="group flex items-center justify-center gap-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white px-10 py-4 rounded-2xl hover:from-slate-700 hover:to-slate-800 transition-all duration-300 font-black text-lg shadow-2xl hover:shadow-3xl hover:scale-105">
          <Calendar size={24} className="group-hover:animate-pulse" />
          📅 Planifier un rapport
        </button>
      </div>

      {/* Particules d'animation en arrière-plan */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-400 rounded-full animate-ping opacity-20"></div>
        <div className="absolute top-3/4 right-1/4 w-3 h-3 bg-pink-400 rounded-full animate-pulse opacity-20"></div>
        <div className="absolute top-1/2 left-3/4 w-1 h-1 bg-blue-400 rounded-full animate-bounce opacity-30"></div>
      </div>
    </div>
  );
}