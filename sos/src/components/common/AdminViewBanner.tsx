import React, { useEffect, useState } from 'react';
import { useAdminView } from '../../contexts/AdminViewContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Shield, X } from 'lucide-react';

/**
 * Banner shown at top of page when admin is viewing a user's dashboard.
 * Shows the viewed user's name, role, email and a link back to admin.
 */
export default function AdminViewBanner() {
  const { isAdminView, viewAsUserId } = useAdminView();
  const [viewedUser, setViewedUser] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
  } | null>(null);

  useEffect(() => {
    if (!isAdminView || !viewAsUserId) return;
    getDoc(doc(db, 'users', viewAsUserId)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setViewedUser({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          role: data.role,
        });
      }
    });
  }, [isAdminView, viewAsUserId]);

  if (!isAdminView) return null;

  const roleLabels: Record<string, string> = {
    client: 'Client',
    lawyer: 'Avocat',
    expat: 'Expert Expatriation',
    chatter: 'Chatter',
    influencer: 'Influenceur',
    blogger: 'Blogueur',
    groupAdmin: 'Admin Groupe',
    partner: 'Partenaire',
  };

  const name = viewedUser
    ? `${viewedUser.firstName || ''} ${viewedUser.lastName || ''}`.trim()
    : viewAsUserId;

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm font-medium shadow-md z-50 sticky top-0">
      <div className="flex items-center gap-2">
        <Shield size={16} />
        <span>
          Vue admin — Dashboard de{' '}
          <strong>{name}</strong>
          {viewedUser?.role && (
            <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
              {roleLabels[viewedUser.role] || viewedUser.role}
            </span>
          )}
          {viewedUser?.email && (
            <span className="ml-1 opacity-80">({viewedUser.email})</span>
          )}
        </span>
      </div>
      <a
        href="/admin/users"
        className="flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
      >
        <X size={14} />
        Retour admin
      </a>
    </div>
  );
}
