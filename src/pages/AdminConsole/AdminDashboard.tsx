
import CountryConfigs from './CountryConfigs';
import React, { useState, useEffect } from 'react';
import { 
  Archive, 
  Search, 
  User, 
  Globe, 
  MessageCircle,
  Download,
  Eye,
  Clock,
} from 'lucide-react';

// Types pour Bolt.new
interface ClientRequest {
  id: string;
  clientFirstName: string;
  clientLastName: string;
  nationality: string;
  country: string;
  language: string;
  title: string;
  description: string;
  expertRole: string;
  scheduledTime: Date;
  assignedUserId: string;
  status: string;
  createdAt: Date;
}

interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  sender: 'user' | 'expert' | 'system';
}

interface ArchivedRequest extends ClientRequest {
  completedAt: Date;
  gptResponse?: string;
  chatMessages?: ChatMessage[];
  handledBy: string;
  duration?: number;
}

// Helper functions CORRIGÉES
const formatDate = (date: Date, format: string): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 
                     'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const shortMonth = monthNames[date.getMonth()];

  switch (format) {
    case 'dd/MM/yyyy':
      return `${day}/${month}/${year}`;
    case 'yyyy-MM-dd':
      return `${year}-${month}-${day}`;
    case 'dd MMM yyyy':
      return `${day} ${shortMonth} ${year}`;
    case 'HH:mm':
      return `${hours}:${minutes}`;
    default:
      return date.toLocaleDateString('fr-FR');
  }
};

const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

const isThisWeek = (date: Date): boolean => {
  const today = new Date();
  const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
  return date >= startOfWeek && date < endOfWeek;
};

const isThisMonth = (date: Date): boolean => {
  const today = new Date();
  return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
};

// Mock data
const mockCountryStats = {
  mostActive: [
    { code: 'FR', country: 'France' },
    { code: 'DE', country: 'Allemagne' },
    { code: 'ES', country: 'Espagne' },
    { code: 'IT', country: 'Italie' },
    { code: 'MA', country: 'Maroc' }
  ]
};

const mockProblemStats = {
  byCategory: {
    'visa': 25,
    'assurance': 20,
    'documents': 18,
    'logement': 15,
    'autres': 22
  }
};




// --- Petit composant local pour lister les chats enregistrés en localStorage ---
const ChatList: React.FC = () => {
  const [keys, setKeys] = React.useState<string[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<any[]>([]);

  React.useEffect(() => {
    const found: string[] = [];
    for (let i=0; i<localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('chat_history_')) found.push(k);
    }
    setKeys(found.sort().reverse());
  }, []);

  React.useEffect(() => {
    if (!selected) return;
    try {
      const raw = localStorage.getItem(selected);
      if (raw) {
        const parsed = JSON.parse(raw) as any[];
        const normalized = parsed.map(m => ({ ...m, timestamp: m.timestamp ? new Date(m.timestamp) : new Date() }));
        setMessages(normalized);
      } else {
        setMessages([]);
      }
    } catch(e) {
      console.warn(e);
    }
  }, [selected]);

  return (
    <div className="backdrop-blur-xl bg-white/60 border border-white/30 rounded-3xl p-4 shadow">
      <h3 className="text-md font-bold mb-2">Historique local des chats</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-1">
          <ul className="space-y-2">
            {keys.length===0 && <li className="text-sm text-slate-500">Aucun historique local trouvé</li>}
            {keys.map(k => (
              <li key={k}>
                <button className="w-full text-left p-2 rounded-md bg-slate-50 hover:bg-slate-100" onClick={() => setSelected(k)}>
                  {k}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="col-span-2">
          {selected ? (
            <div>
              <h4 className="font-semibold mb-2">{selected}</h4>
              <div className="space-y-2 max-h-64 overflow-auto p-2 bg-white/50 rounded-md">
                {messages.map(m => (
                  <div key={m.id} className={`p-2 rounded ${m.role==='assistant' ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                    <div className="text-xs text-slate-500">{m.role} • {m.timestamp?.toString?.()}</div>
                    <div className="mt-1">{m.content}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <button className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm" onClick={() => {
                  const csv = messages.map(m => `"${m.id}","${m.role}","${(m.timestamp||'').toString().replace(/"/g,'') }","${(m.content||'').toString().replace(/"/g,'')}"`).join("\n");
                  const blob = new Blob([csv],{type:'text/csv'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`${selected}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                }}>Exporter CSV</button>
                <button className="px-3 py-2 bg-red-600 text-white rounded-md text-sm" onClick={()=>{
                  if(confirm('Supprimer cet historique local ?')) { localStorage.removeItem(selected); setKeys(keys.filter(k=>k!==selected)); setSelected(null); setMessages([]); }
                }}>Supprimer</button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500">Sélectionne un historique pour afficher ses messages</div>
          )}
        </div>
      </div>
    </div>
  );
};
export default function ArchiveView() {
  const [archivedRequests, setArchivedRequests] = useState<ArchivedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ArchivedRequest | null>(null);
  const [filters, setFilters] = useState({
    dateRange: 'all',
    country: 'all',
    expertRole: 'all',
    status: 'all'
  });

  const countryStats = mockCountryStats;
  const problemStats = mockProblemStats;

  useEffect(() => {
    loadArchivedRequests();
  }, [filters]);

  const loadArchivedRequests = async () => {
    try {
      setLoading(true);
      
      // Simulation de données archivées
      const mockArchivedRequests: ArchivedRequest[] = [
        {
          id: '1',
          clientFirstName: 'Marie',
          clientLastName: 'Dubois',
          nationality: 'Française',
          country: 'Maroc',
          language: 'Français',
          title: 'Problème de visa touristique',
          description: 'Visa refusé pour séjour touristique au Maroc, besoin d\'aide pour comprendre les raisons et faire appel.',
          expertRole: 'avocat',
          scheduledTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          assignedUserId: 'user1',
          status: 'completed',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          handledBy: 'Jean Martin',
          duration: 15,
          gptResponse: 'Réponse GPT générée pour le problème de visa...'
        },
        {
          id: '2',
          clientFirstName: 'Ahmed',
          clientLastName: 'Ben Ali',
          nationality: 'Tunisienne',
          country: 'Allemagne',
          language: 'Français',
          title: 'Accident de voiture - assurance',
          description: 'Accident de voiture en Allemagne, problème avec l\'assurance locale.',
          expertRole: 'expatrie',
          scheduledTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          assignedUserId: 'user2',
          status: 'completed',
          createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          handledBy: 'Sophie Bernard',
          duration: 22,
          gptResponse: 'Réponse GPT pour l\'accident de voiture...'
        },
        {
          id: '3',
          clientFirstName: 'Carlos',
          clientLastName: 'Rodriguez',
          nationality: 'Espagnole',
          country: 'Espagne',
          language: 'Espagnol',
          title: 'Vol de passeport et documents',
          description: 'Vol de tous les documents d\'identité à Madrid, besoin d\'aide pour les démarches.',
          expertRole: 'expatrie',
          scheduledTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          assignedUserId: 'user1',
          status: 'completed',
          createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          handledBy: 'Jean Martin',
          duration: 18,
          gptResponse: 'Réponse GPT pour le vol de documents...'
        }
      ];

      setArchivedRequests(mockArchivedRequests);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterByDateRange = (request: ArchivedRequest): boolean => {
    const completedDate = request.completedAt;
    
    switch (filters.dateRange) {
      case 'today':
        return isToday(completedDate);
      case 'week':
        return isThisWeek(completedDate);
      case 'month':
        return isThisMonth(completedDate);
      case 'all':
      default:
        return true;
    }
  };

  const filteredRequests = archivedRequests.filter(request => {
    const matchesSearch = searchTerm === '' || 
      request.clientFirstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.clientLastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.country.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCountry = filters.country === 'all' || request.country === filters.country;
    const matchesRole = filters.expertRole === 'all' || request.expertRole === filters.expertRole;
    const matchesDate = filterByDateRange(request);

    return matchesSearch && matchesCountry && matchesRole && matchesDate;
  });

  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Client', 'Pays', 'Titre', 'Expert', 'Durée (min)', 'Traité par'].join(','),
      ...filteredRequests.map(request => [
        formatDate(request.completedAt, 'dd/MM/yyyy'),
        `"${request.clientFirstName} ${request.clientLastName}"`,
        `"${request.country}"`,
        `"${request.title}"`,
        request.expertRole,
        request.duration || 0,
        `"${request.handledBy}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historique-sos-expat-${formatDate(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="bg-white rounded-lg p-4 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <Archive size={20} className="mr-2 text-red-500" />
              Historique des demandes
            </h2>
            <p className="text-sm text-gray-600">
              {filteredRequests.length} demande{filteredRequests.length > 1 ? 's' : ''} archivée{filteredRequests.length > 1 ? 's' : ''}
            </p>
          </div>
          
          <button
            onClick={exportToCSV}
            className="bg-red-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-red-600 transition-colors"
          >
            <Download size={16} />
            <span>Exporter CSV</span>
          </button>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500">{archivedRequests.length}</p>
            <p className="text-xs text-gray-500">Total archivé</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {Math.round(archivedRequests.reduce((acc, req) => acc + (req.duration || 0), 0) / archivedRequests.length) || 0}min
            </p>
            <p className="text-xs text-gray-500">Durée moyenne</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {countryStats.mostActive.length}
            </p>
            <p className="text-xs text-gray-500">Pays couverts</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {Object.keys(problemStats.byCategory).length}
            </p>
            <p className="text-xs text-gray-500">Types de problèmes</p>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-lg p-4 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <select
            value={filters.country}
            onChange={(e) => setFilters({ ...filters, country: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">Tous les pays</option>
            {countryStats.mostActive.map(country => (
              <option key={country.code} value={country.country}>{country.country}</option>
            ))}
          </select>

          <select
            value={filters.expertRole}
            onChange={(e) => setFilters({ ...filters, expertRole: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">Tous les experts</option>
            <option value="avocat">Avocat</option>
            <option value="expatrie">Expatrié</option>
          </select>

          <select
            value={filters.dateRange}
            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">Toutes les dates</option>
            <option value="today">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
          </select>
        </div>
      </div>

      {/* Liste des demandes archivées */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg p-8 shadow-lg text-center">
            <Archive size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Aucune demande trouvée</h3>
            <p className="text-gray-600">
              {searchTerm || filters.country !== 'all' || filters.expertRole !== 'all'
                ? 'Essayez de modifier vos filtres de recherche'
                : 'Les demandes terminées apparaîtront ici'
              }
            </p>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div key={request.id} className="bg-white rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center">
                      <User size={18} className="text-red-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {request.clientFirstName} {request.clientLastName}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Globe size={12} />
                          <span>{request.country}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle size={12} />
                          <span>{request.language}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock size={12} />
                          <span>{request.duration || 0}min</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <h4 className="font-medium text-gray-800 mb-1">{request.title}</h4>
                  
                  {/* Description tronquée */}
                  <div className="text-sm text-gray-600 mb-3">
                    <p className="line-clamp-2">
                      {request.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-4">
                      <span>Traité par: {request.handledBy}</span>
                      <span className={`px-2 py-1 rounded-full ${
                        request.expertRole === 'avocat' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {request.expertRole === 'avocat' ? 'Avocat' : 'Expatrié'}
                      </span>
                    </div>
                    <span>{formatDate(request.completedAt, 'dd MMM yyyy')}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedRequest(request)}
                  className="ml-4 p-2 rounded-lg bg-red-100 text-red-500 hover:bg-red-200 transition-colors"
                  title="Voir les détails"
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de détail */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
}

// Modal de détail d'une demande archivée
interface RequestDetailModalProps {
  request: ArchivedRequest;
  onClose: () => void;
}

function RequestDetailModal({ request, onClose }: RequestDetailModalProps) {
  // Gestion de la fermeture avec Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">
            Détails de la demande archivée
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Informations client */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Informations client</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Nom:</span>
                <span className="ml-2 font-medium">{request.clientFirstName} {request.clientLastName}</span>
              </div>
              <div>
                <span className="text-gray-600">Nationalité:</span>
                <span className="ml-2 font-medium">{request.nationality}</span>
              </div>
              <div>
                <span className="text-gray-600">Pays:</span>
                <span className="ml-2 font-medium">{request.country}</span>
              </div>
              <div>
                <span className="text-gray-600">Langue:</span>
                <span className="ml-2 font-medium">{request.language}</span>
              </div>
            </div>
          </div>

          {/* Détails de la demande */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">{request.title}</h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              {request.description}
            </p>
          </div>

          {/* Réponse GPT */}
          {request.gptResponse && (
            <div className="bg-red-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-2">Réponse GPT générée</h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                {request.gptResponse}
              </p>
            </div>
          )}

          {/* Informations de traitement */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Informations de traitement</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Traité par:</span>
                <span className="ml-2 font-medium">{request.handledBy}</span>
              </div>
              <div>
                <span className="text-gray-600">Expert:</span>
                <span className="ml-2 font-medium capitalize">{request.expertRole}</span>
              </div>
              <div>
                <span className="text-gray-600">Durée:</span>
                <span className="ml-2 font-medium">{request.duration || 0} minutes</span>
              </div>
              <div>
                <span className="text-gray-600">Terminé le:</span>
                <span className="ml-2 font-medium">
                  {formatDate(request.completedAt, 'dd MMM yyyy')} à {formatDate(request.completedAt, 'HH:mm')}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// === Extension: Simple mount of CountryConfigs page for now ===
// Tip: wire this into your existing router/menu as needed.
export function CountryAdminMount() {
  return <CountryConfigs/>;
}
