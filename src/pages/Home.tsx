import React, { useState, useEffect } from 'react';
import { 
  Inbox, 
  Clock, 
  Zap, 
  Settings, 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Bell,
  Search,
  Filter,
  ChevronRight,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Brain,
  Sparkles,
  Activity,
  Calendar,
  Timer,
  Star,
  ArrowRight,
  RefreshCw,
  Plus,
  MoreVertical
} from 'lucide-react';

// Types simulés
interface ClientRequest {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledTime: Date;
  createdAt: Date;
  clientName: string;
  clientEmail: string;
  estimatedTime: number;
  tags: string[];
  aiResponse?: string;
}

interface User {
  uid: string;
  displayName: string;
  email: string;
  isAdmin: boolean;
}

export default function Home() {
  // Données simulées
  const [currentUser] = useState<User>({
    uid: '1',
    displayName: 'Alexandre Dubois',
    email: 'alex@chatgpt.ai',
    isAdmin: true
  });

  const [requests, setRequests] = useState<ClientRequest[]>([
    {
      id: '1',
      title: 'Configuration API ChatGPT',
      description: 'Besoin d\'aide pour intégrer l\'API OpenAI dans notre système de CRM',
      status: 'pending',
      priority: 'high',
      scheduledTime: new Date('2025-08-03T14:00:00'),
      createdAt: new Date('2025-08-03T09:30:00'),
      clientName: 'Marie Martin',
      clientEmail: 'marie@techcorp.fr',
      estimatedTime: 30,
      tags: ['API', 'Intégration', 'CRM'],
      aiResponse: 'Voici les étapes pour configurer l\'API OpenAI...'
    },
    {
      id: '2',
      title: 'Optimisation des prompts',
      description: 'Comment améliorer la qualité des réponses de notre chatbot IA',
      status: 'in_progress',
      priority: 'medium',
      scheduledTime: new Date('2025-08-03T15:30:00'),
      createdAt: new Date('2025-08-03T10:15:00'),
      clientName: 'Jean Dupont',
      clientEmail: 'jean@startup.io',
      estimatedTime: 45,
      tags: ['Prompts', 'Optimisation', 'Chatbot']
    },
    {
      id: '3',
      title: 'Formation équipe IA',
      description: 'Session de formation pour notre équipe sur les bonnes pratiques IA',
      status: 'pending',
      priority: 'urgent',
      scheduledTime: new Date('2025-08-03T16:00:00'),
      createdAt: new Date('2025-08-03T11:00:00'),
      clientName: 'Sarah Wilson',
      clientEmail: 'sarah@bigtech.com',
      estimatedTime: 90,
      tags: ['Formation', 'Équipe', 'Bonnes pratiques']
    }
  ]);

  const [selectedRequest, setSelectedRequest] = useState<ClientRequest | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || request.priority === filterPriority;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getPriorityConfig = (priority: string) => {
    const configs = {
      urgent: {
        label: 'Urgent',
        color: 'from-red-500 to-pink-500',
        bgColor: 'bg-red-100',
        textColor: 'text-red-700',
        icon: '🚨'
      },
      high: {
        label: 'Haute',
        color: 'from-orange-500 to-red-500',
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-700',
        icon: '⚡'
      },
      medium: {
        label: 'Moyenne',
        color: 'from-blue-500 to-indigo-500',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
        icon: '📋'
      },
      low: {
        label: 'Basse',
        color: 'from-emerald-500 to-teal-500',
        bgColor: 'bg-emerald-100',
        textColor: 'text-emerald-700',
        icon: '📝'
      }
    };
    return configs[priority] || configs.medium;
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: {
        label: 'En attente',
        color: 'bg-amber-100 text-amber-700',
        icon: Clock,
        gradient: 'from-amber-400 to-orange-500'
      },
      in_progress: {
        label: 'En cours',
        color: 'bg-blue-100 text-blue-700',
        icon: Play,
        gradient: 'from-blue-400 to-indigo-500'
      },
      completed: {
        label: 'Terminé',
        color: 'bg-emerald-100 text-emerald-700',
        icon: CheckCircle,
        gradient: 'from-emerald-400 to-green-500'
      }
    };
    return configs[status] || configs.pending;
  };

  const refreshRequests = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
  };

  if (showAdmin && currentUser.isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 p-4">
        <div className="backdrop-blur-xl bg-white/40 border border-white/20 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              🔧 Console Admin
            </h1>
            <button
              onClick={() => setShowAdmin(false)}
              className="px-6 py-3 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-2xl hover:from-slate-600 hover:to-slate-700 transition-all duration-300 font-bold"
            >
              ← Retour
            </button>
          </div>
          <p className="text-slate-600 text-lg">Interface d'administration en cours de développement...</p>
        </div>
      </div>
    );
  }

  if (selectedRequest) {
    return (
      <RequestDetailView 
        request={selectedRequest} 
        onBack={() => setSelectedRequest(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* En-tête avec glassmorphism */}
      <div className="backdrop-blur-xl bg-white/40 border-b border-white/20 sticky top-0 z-40">
        <div className="p-4 md:p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Brain size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-slate-800 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  IA Dashboard 🚀
                </h1>
                <p className="text-slate-600 font-medium">
                  Bonjour {currentUser.displayName} • {requests.length} demandes actives
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={refreshRequests}
                disabled={loading}
                className="p-3 bg-white/70 border border-white/30 rounded-2xl backdrop-blur-sm hover:bg-white/90 transition-all duration-300"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin text-indigo-500' : 'text-slate-600'} />
              </button>
              
              {currentUser.isAdmin && (
                <button
                  onClick={() => setShowAdmin(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 font-bold shadow-xl hover:scale-105"
                >
                  <Settings size={20} />
                  Admin
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle size={32} />
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-3xl font-black mb-1">{requests.filter(r => r.status === 'completed').length}</p>
            <p className="text-emerald-100 font-medium">Demandes terminées</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <Play size={32} />
              <span className="text-2xl">⚡</span>
            </div>
            <p className="text-3xl font-black mb-1">{requests.filter(r => r.status === 'in_progress').length}</p>
            <p className="text-blue-100 font-medium">En cours</p>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <Clock size={32} />
              <span className="text-2xl">⏳</span>
            </div>
            <p className="text-3xl font-black mb-1">{requests.filter(r => r.status === 'pending').length}</p>
            <p className="text-amber-100 font-medium">En attente</p>
          </div>

          <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <AlertCircle size={32} />
              <span className="text-2xl">🚨</span>
            </div>
            <p className="text-3xl font-black mb-1">{requests.filter(r => r.priority === 'urgent').length}</p>
            <p className="text-rose-100 font-medium">Urgent</p>
          </div>
        </div>

        {/* Filtres et recherche */}
        <div className="backdrop-blur-xl bg-white/60 border border-white/30 rounded-3xl p-6 shadow-xl mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="🔍 Rechercher par titre ou client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/70 border-2 border-white/30 rounded-2xl backdrop-blur-sm focus:ring-4 focus:ring-indigo-200 focus:border-indigo-300 transition-all duration-300 font-medium"
              />
            </div>
            
            <div className="flex gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 bg-white/70 border-2 border-white/30 rounded-2xl backdrop-blur-sm focus:ring-4 focus:ring-indigo-200 focus:border-indigo-300 transition-all duration-300 font-semibold min-w-[140px]"
              >
                <option value="all">📊 Tous</option>
                <option value="pending">⏳ En attente</option>
                <option value="in_progress">⚡ En cours</option>
                <option value="completed">✅ Terminé</option>
              </select>
              
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-4 py-3 bg-white/70 border-2 border-white/30 rounded-2xl backdrop-blur-sm focus:ring-4 focus:ring-indigo-200 focus:border-indigo-300 transition-all duration-300 font-semibold min-w-[140px]"
              >
                <option value="all">🎯 Toutes</option>
                <option value="urgent">🚨 Urgent</option>
                <option value="high">⚡ Haute</option>
                <option value="medium">📋 Moyenne</option>
                <option value="low">📝 Basse</option>
              </select>
            </div>
          </div>
        </div>

        {/* Liste des demandes */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <RefreshCw size={24} className="animate-spin text-indigo-500" />
              <span className="text-lg font-semibold text-slate-600">Actualisation en cours...</span>
            </div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
              <Inbox size={40} className="text-indigo-500" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-3">
              {searchTerm || filterStatus !== 'all' || filterPriority !== 'all' 
                ? 'Aucun résultat trouvé' 
                : 'Aucune demande en cours'}
            </h3>
            <p className="text-slate-500 text-lg max-w-md">
              {searchTerm || filterStatus !== 'all' || filterPriority !== 'all' 
                ? 'Essayez de modifier vos critères de recherche'
                : 'Les nouvelles demandes apparaîtront ici automatiquement. Profitez de cette pause ! ☕'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => {
              const priorityConfig = getPriorityConfig(request.priority);
              const statusConfig = getStatusConfig(request.status);
              const StatusIcon = statusConfig.icon;
              
              return (
                <div 
                  key={request.id} 
                  className="group backdrop-blur-xl bg-white/60 border border-white/30 rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] cursor-pointer"
                  onClick={() => setSelectedRequest(request)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-12 h-12 bg-gradient-to-br ${priorityConfig.color} rounded-2xl flex items-center justify-center text-white font-bold shadow-lg group-hover:rotate-6 transition-transform duration-300`}>
                          <span className="text-lg">{priorityConfig.icon}</span>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors">
                              {request.title}
                            </h3>
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${statusConfig.color}`}>
                              <StatusIcon size={12} />
                              {statusConfig.label}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <span className="font-medium">👤 {request.clientName}</span>
                            <span className="flex items-center gap-1">
                              <Timer size={14} />
                              {request.estimatedTime}min
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar size={14} />
                              {request.scheduledTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-slate-600 mb-4 line-clamp-2 leading-relaxed">
                        {request.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                          {request.tags.map((tag, index) => (
                            <span 
                              key={index}
                              className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {request.aiResponse && (
                            <div className="flex items-center gap-1 text-emerald-600">
                              <Brain size={16} />
                              <span className="text-sm font-medium">IA Ready</span>
                            </div>
                          )}
                          <ChevronRight size={20} className="text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all duration-300" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Indicateur de nombre de demandes */}
        {filteredRequests.length > 0 && (
          <div className="mt-8">
            <div className="backdrop-blur-xl bg-white/60 border border-white/30 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-center gap-3 text-slate-600">
                <Activity size={20} />
                <span className="font-bold text-lg">
                  {filteredRequests.length} demande{filteredRequests.length > 1 ? 's' : ''} 
                  {searchTerm || filterStatus !== 'all' || filterPriority !== 'all' ? ' trouvée(s)' : ' active(s)'}
                </span>
                <Sparkles size={20} className="text-indigo-500" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Composant de détail de demande
function RequestDetailView({ request, onBack }: { request: ClientRequest, onBack: () => void }) {
  const priorityConfig = getPriorityConfig(request.priority);
  const statusConfig = getStatusConfig(request.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* En-tête */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/20 rounded-3xl p-6 md:p-8 shadow-2xl mb-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 bg-white/70 border border-white/30 rounded-2xl hover:bg-white/90 transition-colors font-semibold"
            >
              ← Retour
            </button>
            
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold ${statusConfig.color}`}>
                <StatusIcon size={16} />
                {statusConfig.label}
              </span>
              
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold ${priorityConfig.bgColor} ${priorityConfig.textColor}`}>
                <span>{priorityConfig.icon}</span>
                {priorityConfig.label}
              </span>
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-slate-800 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            {request.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-6 text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-semibold">👤 Client:</span>
              <span>{request.clientName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Timer size={16} />
              <span>{request.estimatedTime} minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>{request.scheduledTime.toLocaleString('fr-FR')}</span>
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Description */}
          <div className="lg:col-span-2">
            <div className="backdrop-blur-xl bg-white/60 border border-white/30 rounded-3xl p-8 shadow-xl mb-8">
              <h2 className="text-2xl font-black text-slate-800 mb-4">📋 Description</h2>
              <p className="text-slate-700 leading-relaxed text-lg">{request.description}</p>
              
              <div className="mt-6">
                <h3 className="font-bold text-slate-800 mb-3">🏷️ Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {request.tags.map((tag, index) => (
                    <span 
                      key={index}
                      className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-2xl text-sm font-semibold"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Réponse IA */}
            {request.aiResponse && (
              <div className="backdrop-blur-xl bg-white/60 border border-white/30 rounded-3xl p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                    <Brain size={24} className="text-white" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-800">🤖 Réponse IA</h2>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6">
                  <p className="text-slate-700 leading-relaxed">{request.aiResponse}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Informations client */}
            <div className="backdrop-blur-xl bg-white/60 border border-white/30 rounded-3xl p-6 shadow-xl">
              <h3 className="text-xl font-black text-slate-800 mb-4">👤 Client</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-semibold text-slate-600">Nom</span>
                  <p className="font-bold text-slate-800">{request.clientName}</p>
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-600">Email</span>
                  <p className="font-bold text-slate-800">{request.clientEmail}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="backdrop-blur-xl bg-white/60 border border-white/30 rounded-3xl p-6 shadow-xl">
              <h3 className="text-xl font-black text-slate-800 mb-4">⚡ Actions</h3>
              <div className="space-y-3">
                <button className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 font-bold">
                  ✅ Marquer terminé
                </button>
                <button className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 font-bold">
                  💬 Ouvrir chat IA
                </button>
                <button className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 font-bold">
                  📝 Modifier
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Fonction utilitaire pour la configuration des priorités
function getPriorityConfig(priority: string) {
  const configs = {
    urgent: {
      label: 'Urgent',
      color: 'from-red-500 to-pink-500',
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      icon: '🚨'
    },
    high: {
      label: 'Haute',
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-700',
      icon: '⚡'
    },
    medium: {
      label: 'Moyenne',
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      icon: '📋'
    },
    low: {
      label: 'Basse',
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-100',
      textColor: 'text-emerald-700',
      icon: '📝'
    }
  };
  return configs[priority] || configs.medium;
}

// Fonction utilitaire pour la configuration des statuts
function getStatusConfig(status: string) {
  const configs = {
    pending: {
      label: 'En attente',
      color: 'bg-amber-100 text-amber-700',
      icon: Clock,
      gradient: 'from-amber-400 to-orange-500'
    },
    in_progress: {
      label: 'En cours',
      color: 'bg-blue-100 text-blue-700',
      icon: Play,
      gradient: 'from-blue-400 to-indigo-500'
    },
    completed: {
      label: 'Terminé',
      color: 'bg-emerald-100 text-emerald-700',
      icon: CheckCircle,
      gradient: 'from-emerald-400 to-green-500'
    }
  };
  return configs[status] || configs.pending;
}