/**
 * AdminTeamCaptainRecruitment — Gestion des candidatures Capitaines
 *
 * Affiche toutes les candidatures de `captain_applications` avec :
 * - Filtres par status (tabs)
 * - Tableau avec toutes les infos (nom, WhatsApp, pays, photo, CV, motivation)
 * - Actions pour changer le status
 * - Téléchargement CV et affichage photo
 */

import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import AdminLayout from '../../../components/admin/AdminLayout';
import {
  Crown,
  Download,
  FileText,
  Eye,
  X,
  ChevronDown,
  Trash2,
  User,
  Phone,
  Globe,
  Calendar,
  MessageSquare,
} from 'lucide-react';

type ApplicationStatus = 'pending' | 'contacted' | 'approved' | 'rejected';

interface CaptainApplication {
  id: string;
  name: string;
  whatsapp: string;
  country: string;
  motivation: string;
  cvUrl?: string;
  photoUrl?: string;
  status: ApplicationStatus;
  source: string;
  language: string;
  createdAt: { seconds: number } | null;
}

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: 'En attente', bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  contacted: { label: 'Contacte', bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  approved: { label: 'Approuve', bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  rejected: { label: 'Rejete', bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
};

const TABS: { key: 'all' | ApplicationStatus; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'pending', label: 'En attente' },
  { key: 'contacted', label: 'Contactes' },
  { key: 'approved', label: 'Approuves' },
  { key: 'rejected', label: 'Rejetes' },
];

const AdminTeamCaptainRecruitment: React.FC = () => {
  const intl = useIntl();
  const [applications, setApplications] = useState<CaptainApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | ApplicationStatus>('all');
  const [expandedMotivation, setExpandedMotivation] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'captain_applications'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const apps = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CaptainApplication));
      setApplications(apps);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = activeTab === 'all' ? applications : applications.filter((a) => a.status === activeTab);
  const pendingCount = applications.filter((a) => a.status === 'pending').length;

  const changeStatus = async (id: string, status: ApplicationStatus) => {
    await updateDoc(doc(db, 'captain_applications', id), { status });
  };

  const deleteApplication = async (id: string) => {
    if (!window.confirm('Supprimer cette candidature ?')) return;
    await deleteDoc(doc(db, 'captain_applications', id));
  };

  const formatDate = (ts: { seconds: number } | null) => {
    if (!ts) return '—';
    return new Date(ts.seconds * 1000).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {intl.formatMessage({ id: 'admin.team.recruitment.title', defaultMessage: 'Recrutement Capitaines' })}
              </h1>
              <p className="text-sm text-gray-500">
                {applications.length} candidature{applications.length !== 1 ? 's' : ''} — {pendingCount} en attente
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
          {TABS.map((tab) => {
            const count = tab.key === 'all' ? applications.length : applications.filter((a) => a.status === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                  activeTab === tab.key
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                }`}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Aucune candidature{activeTab !== 'all' ? ` ${STATUS_CONFIG[activeTab as ApplicationStatus]?.label.toLowerCase()}` : ''}.</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Photo</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Candidat</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">WhatsApp</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Pays</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">CV</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Motivation</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((app) => (
                    <tr key={app.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      {/* Photo */}
                      <td className="px-4 py-3">
                        {app.photoUrl ? (
                          <a href={app.photoUrl} target="_blank" rel="noopener noreferrer">
                            <img src={app.photoUrl} alt={app.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                          </a>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                      </td>
                      {/* Name */}
                      <td className="px-4 py-3 font-medium text-gray-900">{app.name}</td>
                      {/* WhatsApp */}
                      <td className="px-4 py-3">
                        <a href={`https://wa.me/${app.whatsapp.replace(/[^0-9+]/g, '')}`} target="_blank" rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800 underline">{app.whatsapp}</a>
                      </td>
                      {/* Country */}
                      <td className="px-4 py-3 text-gray-600">{app.country}</td>
                      {/* Date */}
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(app.createdAt)}</td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[app.status]?.bg} ${STATUS_CONFIG[app.status]?.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[app.status]?.dot}`} />
                          {STATUS_CONFIG[app.status]?.label}
                        </span>
                      </td>
                      {/* CV */}
                      <td className="px-4 py-3">
                        {app.cvUrl ? (
                          <a href={app.cvUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-xs font-medium">
                            <Download className="w-3.5 h-3.5" /> CV
                          </a>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      {/* Motivation */}
                      <td className="px-4 py-3 max-w-[250px]">
                        {app.motivation ? (
                          <div>
                            <p className="text-gray-600 text-xs truncate">{app.motivation}</p>
                            {app.motivation.length > 60 && (
                              <button onClick={() => setExpandedMotivation(expandedMotivation === app.id ? null : app.id)}
                                className="text-amber-600 text-xs hover:underline mt-0.5">
                                {expandedMotivation === app.id ? 'Fermer' : 'Voir tout'}
                              </button>
                            )}
                            {expandedMotivation === app.id && (
                              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setExpandedMotivation(null)}>
                                <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-gray-900">Motivation — {app.name}</h3>
                                    <button onClick={() => setExpandedMotivation(null)}><X className="w-5 h-5 text-gray-400" /></button>
                                  </div>
                                  <p className="text-gray-700 whitespace-pre-wrap">{app.motivation}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={app.status}
                            onChange={(e) => changeStatus(app.id, e.target.value as ApplicationStatus)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-amber-400 min-h-[36px]"
                          >
                            <option value="pending">En attente</option>
                            <option value="contacted">Contacte</option>
                            <option value="approved">Approuve</option>
                            <option value="rejected">Rejete</option>
                          </select>
                          <button onClick={() => deleteApplication(app.id)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden space-y-3">
              {filtered.map((app) => (
                <div key={app.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* Card header */}
                  <div className="p-4 flex items-start gap-3">
                    {/* Photo */}
                    {app.photoUrl ? (
                      <a href={app.photoUrl} target="_blank" rel="noopener noreferrer">
                        <img src={app.photoUrl} alt={app.name} className="w-12 h-12 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                      </a>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">{app.name}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_CONFIG[app.status]?.bg} ${STATUS_CONFIG[app.status]?.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[app.status]?.dot}`} />
                          {STATUS_CONFIG[app.status]?.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <a href={`https://wa.me/${app.whatsapp.replace(/[^0-9+]/g, '')}`} target="_blank" rel="noopener noreferrer"
                            className="text-green-600">{app.whatsapp}</a>
                        </span>
                        <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {app.country}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(app.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expand button */}
                  <button onClick={() => setExpandedCard(expandedCard === app.id ? null : app.id)}
                    className="w-full px-4 py-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 hover:bg-gray-50 min-h-[44px]">
                    <span>Details</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedCard === app.id ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Expanded content */}
                  {expandedCard === app.id && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                      {/* CV */}
                      {app.cvUrl && (
                        <a href={app.cvUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 text-sm font-medium min-h-[44px]">
                          <FileText className="w-4 h-4" /> Telecharger le CV
                        </a>
                      )}
                      {/* Motivation */}
                      {app.motivation && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> Motivation
                          </p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{app.motivation}</p>
                        </div>
                      )}
                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2">
                        <select
                          value={app.status}
                          onChange={(e) => changeStatus(app.id, e.target.value as ApplicationStatus)}
                          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-amber-400 min-h-[44px]"
                        >
                          <option value="pending">En attente</option>
                          <option value="contacted">Contacte</option>
                          <option value="approved">Approuve</option>
                          <option value="rejected">Rejete</option>
                        </select>
                        <button onClick={() => deleteApplication(app.id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminTeamCaptainRecruitment;
