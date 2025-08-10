import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Shield, 
  ShieldOff, 
  Trash2, 
  Mail, 
  Calendar,
  Crown,
  User,
  Users,
  Search,
  Filter,
  MoreVertical,
  Edit3,
  Key,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle2,
  X,
  Plus,
  Save,
  RefreshCw
} from 'lucide-react';

// Types simulés
interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin' | 'superadmin';
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
  avatar?: string;
  permissions?: string[];
}

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      email: 'admin@chatgpt.ai',
      displayName: 'Alexandre Dubois',
      role: 'superadmin',
      isActive: true,
      createdAt: new Date('2025-01-15'),
      lastLogin: new Date('2025-08-03'),
      permissions: ['all']
    },
    {
      id: '2',
      email: 'marie.martin@company.fr',
      displayName: 'Marie Martin',
      role: 'admin',
      isActive: true,
      createdAt: new Date('2025-02-20'),
      lastLogin: new Date('2025-08-02'),
      permissions: ['users', 'stats', 'conversations']
    },
    {
      id: '3',
      email: 'jean.dupont@company.fr',
      displayName: 'Jean Dupont',
      role: 'user',
      isActive: true,
      createdAt: new Date('2025-03-10'),
      lastLogin: new Date('2025-08-01'),
      permissions: ['conversations']
    },
    {
      id: '4',
      email: 'sarah.wilson@company.fr',
      displayName: 'Sarah Wilson',
      role: 'user',
      isActive: false,
      createdAt: new Date('2025-04-05'),
      lastLogin: new Date('2025-07-28'),
      permissions: ['conversations']
    }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && user.isActive) ||
                         (filterStatus === 'inactive' && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleConfig = (role: string) => {
    const configs = {
      superadmin: {
        label: 'Super Admin',
        icon: Crown,
        gradient: 'from-purple-500 to-pink-500',
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-700',
        description: 'Accès complet au système'
      },
      admin: {
        label: 'Administrateur',
        icon: Shield,
        gradient: 'from-blue-500 to-indigo-500',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
        description: 'Gestion des utilisateurs et statistiques'
      },
      user: {
        label: 'Utilisateur',
        icon: User,
        gradient: 'from-emerald-500 to-teal-500',
        bgColor: 'bg-emerald-100',
        textColor: 'text-emerald-700',
        description: 'Accès aux conversations IA'
      }
    };
    return configs[role] || configs.user;
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    setLoading(true);
    // Simulation d'appel API
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setUsers(users.map(user => 
      user.id === userId ? { ...user, isActive: !currentStatus } : user
    ));
    setLoading(false);
  };

  const deleteUser = async (userId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setUsers(users.filter(user => user.id !== userId));
      setLoading(false);
    }
  };

  const bulkAction = async (action: string) => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (action === 'activate') {
      setUsers(users.map(user => 
        selectedUsers.includes(user.id) ? { ...user, isActive: true } : user
      ));
    } else if (action === 'deactivate') {
      setUsers(users.map(user => 
        selectedUsers.includes(user.id) ? { ...user, isActive: false } : user
      ));
    } else if (action === 'delete') {
      if (window.confirm(`Supprimer ${selectedUsers.length} utilisateur(s) ?`)) {
        setUsers(users.filter(user => !selectedUsers.includes(user.id)));
      }
    }
    
    setSelectedUsers([]);
    setShowBulkActions(false);
    setLoading(false);
  };

  const getStatusBadge = (isActive: boolean, lastLogin?: Date) => {
    if (!isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          Désactivé
        </span>
      );
    }
    
    const daysSinceLogin = lastLogin ? 
      Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)) : 999;
    
    if (daysSinceLogin <= 1) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          En ligne
        </span>
      );
    } else if (daysSinceLogin <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          Récent
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
          <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
          Inactif
        </span>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-6">
      {/* En-tête avec glassmorphism */}
      <div className="backdrop-blur-xl bg-white/40 border border-white/20 rounded-3xl p-6 md:p-8 shadow-2xl mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Users size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-slate-800 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Gestion Utilisateurs 👥
              </h1>
              <p className="text-slate-600 text-lg font-medium">
                {users.filter(u => u.isActive).length} / {users.length} utilisateurs actifs • Contrôle total
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowAddUser(true)}
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-2xl hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 font-bold shadow-xl hover:shadow-2xl hover:scale-105"
            >
              <UserPlus size={20} />
              Ajouter utilisateur
            </button>
          </div>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle2 size={32} />
            <span className="text-2xl">✅</span>
          </div>
          <p className="text-3xl font-black mb-1">{users.filter(u => u.isActive).length}</p>
          <p className="text-emerald-100 font-medium">Utilisateurs actifs</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Shield size={32} />
            <span className="text-2xl">🛡️</span>
          </div>
          <p className="text-3xl font-black mb-1">{users.filter(u => u.role === 'admin' || u.role === 'superadmin').length}</p>
          <p className="text-blue-100 font-medium">Administrateurs</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Activity size={32} />
            <span className="text-2xl">⚡</span>
          </div>
          <p className="text-3xl font-black mb-1">{users.filter(u => {
            const daysSince = u.lastLogin ? Math.floor((Date.now() - u.lastLogin.getTime()) / (1000 * 60 * 60 * 24)) : 999;
            return daysSince <= 7;
          }).length}</p>
          <p className="text-amber-100 font-medium">Actifs cette semaine</p>
        </div>

        <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <AlertTriangle size={32} />
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-3xl font-black mb-1">{users.filter(u => !u.isActive).length}</p>
          <p className="text-rose-100 font-medium">Comptes désactivés</p>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="backdrop-blur-xl bg-white/60 border border-white/30 rounded-3xl p-6 shadow-xl mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/70 border-2 border-white/30 rounded-2xl backdrop-blur-sm focus:ring-4 focus:ring-indigo-200 focus:border-indigo-300 transition-all duration-300 font-medium"
            />
          </div>
          
          <div className="flex gap-3">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-3 bg-white/70 border-2 border-white/30 rounded-2xl backdrop-blur-sm focus:ring-4 focus:ring-indigo-200 focus:border-indigo-300 transition-all duration-300 font-semibold min-w-[150px]"
            >
              <option value="all">🎭 Tous les rôles</option>
              <option value="superadmin">👑 Super Admin</option>
              <option value="admin">🛡️ Admin</option>
              <option value="user">👤 Utilisateur</option>
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 bg-white/70 border-2 border-white/30 rounded-2xl backdrop-blur-sm focus:ring-4 focus:ring-indigo-200 focus:border-indigo-300 transition-all duration-300 font-semibold min-w-[150px]"
            >
              <option value="all">📊 Tous les statuts</option>
              <option value="active">✅ Actifs</option>
              <option value="inactive">❌ Inactifs</option>
            </select>
          </div>
        </div>

        {/* Actions groupées */}
        {selectedUsers.length > 0 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-2xl border-2 border-indigo-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-800">
                🎯 {selectedUsers.length} utilisateur(s) sélectionné(s)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => bulkAction('activate')}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-semibold"
                >
                  ✅ Activer
                </button>
                <button
                  onClick={() => bulkAction('deactivate')}
                  className="px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-semibold"
                >
                  ⏸️ Désactiver
                </button>
                <button
                  onClick={() => bulkAction('delete')}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-semibold"
                >
                  🗑️ Supprimer
                </button>
                <button
                  onClick={() => setSelectedUsers([])}
                  className="px-4 py-2 bg-slate-500 text-white rounded-xl hover:bg-slate-600 transition-colors font-semibold"
                >
                  ❌ Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Liste des utilisateurs */}
      <div className="space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <RefreshCw size={24} className="animate-spin text-indigo-500" />
              <span className="text-lg font-semibold text-slate-600">Mise à jour en cours...</span>
            </div>
          </div>
        )}

        {filteredUsers.map((user) => {
          const roleConfig = getRoleConfig(user.role);
          const RoleIcon = roleConfig.icon;
          
          return (
            <div key={user.id} className="group backdrop-blur-xl bg-white/60 border border-white/30 rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers([...selectedUsers, user.id]);
                      } else {
                        setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                      }
                    }}
                    className="w-5 h-5 text-indigo-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  
                  <div className={`w-16 h-16 bg-gradient-to-br ${roleConfig.gradient} rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg group-hover:rotate-6 transition-transform duration-300`}>
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-black text-slate-800">{user.displayName}</h3>
                      
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${roleConfig.bgColor} ${roleConfig.textColor} text-sm font-bold`}>
                        <RoleIcon size={14} />
                        {roleConfig.label}
                      </div>
                      
                      {getStatusBadge(user.isActive, user.lastLogin)}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Mail size={14} />
                        <span className="font-medium">{user.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        <span>Créé le {user.createdAt.toLocaleDateString('fr-FR')}</span>
                      </div>
                      {user.lastLogin && (
                        <div className="flex items-center gap-2">
                          <Activity size={14} />
                          <span>Dernière connexion: {user.lastLogin.toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-sm text-slate-500 mt-1 font-medium">{roleConfig.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleUserStatus(user.id, user.isActive)}
                    className={`p-3 rounded-2xl transition-all duration-300 font-bold ${
                      user.isActive
                        ? 'bg-red-100 text-red-600 hover:bg-red-200 hover:scale-110'
                        : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200 hover:scale-110'
                    }`}
                    title={user.isActive ? 'Désactiver' : 'Activer'}
                  >
                    {user.isActive ? <ShieldOff size={20} /> : <Shield size={20} />}
                  </button>
                  
                  <button
                    className="p-3 rounded-2xl bg-blue-100 text-blue-600 hover:bg-blue-200 transition-all duration-300 hover:scale-110"
                    title="Modifier"
                  >
                    <Edit3 size={20} />
                  </button>
                  
                  {user.role !== 'superadmin' && (
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="p-3 rounded-2xl bg-red-100 text-red-600 hover:bg-red-200 transition-all duration-300 hover:scale-110"
                      title="Supprimer"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Users size={40} className="text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-600 mb-2">Aucun utilisateur trouvé</h3>
            <p className="text-slate-500">Essayez de modifier vos critères de recherche</p>
          </div>
        )}
      </div>

      {/* Modal d'ajout d'utilisateur */}
      {showAddUser && (
        <AddUserModal 
          onClose={() => setShowAddUser(false)}
          onUserAdded={(newUser) => {
            setUsers([...users, { ...newUser, id: Date.now().toString() }]);
            setShowAddUser(false);
          }}
        />
      )}
    </div>
  );
}

// Modal d'ajout d'utilisateur modernisée
function AddUserModal({ onClose, onUserAdded }: { 
  onClose: () => void; 
  onUserAdded: (user: Omit<User, 'id'>) => void;
}) {
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    role: 'user' as 'user' | 'admin' | 'superadmin'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.email || !formData.displayName) return;
    
    setLoading(true);

    // Simulation d'ajout
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newUser: Omit<User, 'id'> = {
      ...formData,
      isActive: true,
      createdAt: new Date(),
      permissions: formData.role === 'superadmin' ? ['all'] : 
                  formData.role === 'admin' ? ['users', 'stats', 'conversations'] : 
                  ['conversations']
    };

    onUserAdded(newUser);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="backdrop-blur-xl bg-white/90 border border-white/30 rounded-3xl p-8 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            ✨ Nouvel utilisateur
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              👤 Nom complet
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="w-full px-4 py-3 bg-white/70 border-2 border-white/30 rounded-2xl backdrop-blur-sm focus:ring-4 focus:ring-indigo-200 focus:border-indigo-300 transition-all duration-300 font-medium"
              placeholder="Ex: Marie Dupont"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              📧 Adresse email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-white/70 border-2 border-white/30 rounded-2xl backdrop-blur-sm focus:ring-4 focus:ring-indigo-200 focus:border-indigo-300 transition-all duration-300 font-medium"
              placeholder="marie.dupont@company.fr"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              🎭 Rôle utilisateur
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="w-full px-4 py-3 bg-white/70 border-2 border-white/30 rounded-2xl backdrop-blur-sm focus:ring-4 focus:ring-indigo-200 focus:border-indigo-300 transition-all duration-300 font-semibold"
            >
              <option value="user">👤 Utilisateur standard</option>
              <option value="admin">🛡️ Administrateur</option>
              <option value="superadmin">👑 Super administrateur</option>
            </select>
          </div>
          
          <div className="flex gap-4 pt-6">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-2xl hover:bg-slate-300 transition-colors font-bold"
            >
              ❌ Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !formData.email || !formData.displayName}
              className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-2xl hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 disabled:opacity-50 font-bold flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Créer l'utilisateur
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}