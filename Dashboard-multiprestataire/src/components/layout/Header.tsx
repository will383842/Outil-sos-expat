/**
 * Header Component
 * Route-aware header with user info and logout
 */
import { LogOut, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const PAGE_CONFIG: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Vue d\'ensemble de votre équipe' },
  '/requests': { title: 'Demandes', subtitle: 'Gérez les demandes de vos clients' },
  '/team': { title: 'Gestion de l\'équipe', subtitle: 'Gérez vos prestataires' },
  '/stats': { title: 'Statistiques', subtitle: 'Performances de votre équipe' },
};

export default function Header() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const config = PAGE_CONFIG[location.pathname] || { title: 'Dashboard', subtitle: '' };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Déconnexion réussie');
    } catch {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{config.title}</h1>
          {config.subtitle && <p className="text-sm text-gray-500">{config.subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          {/* User info */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {user?.displayName || 'Utilisateur'}
              </p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-primary-600" />
              )}
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleSignOut}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Déconnexion"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
