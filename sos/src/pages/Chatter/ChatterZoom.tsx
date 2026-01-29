/**
 * ChatterZoom - Zoom meetings page for chatters
 * Shows upcoming and past meetings, allows attendance tracking
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import ChatterDashboardLayout from '@/components/Chatter/Layout/ChatterDashboardLayout';
import { getFirestore, collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import {
  Video,
  Calendar,
  Clock,
  Users,
  Check,
  ExternalLink,
  Loader2,
  AlertCircle,
  Play,
  Award,
  CalendarDays,
} from 'lucide-react';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 rounded-xl transition-all",
  },
} as const;

interface ZoomMeeting {
  id: string;
  title: string;
  description?: string;
  scheduledAt: { _seconds: number };
  durationMinutes: number;
  zoomUrl: string;
  zoomId: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  bonusAmount: number;
  maxParticipants?: number;
  attendeeCount: number;
  topics: string[];
  hostName?: string;
}

interface Attendance {
  meetingId: string;
  attendedAt: { _seconds: number };
  bonusReceived: boolean;
  bonusCommissionId?: string;
}

const ChatterZoom: React.FC = () => {
  const intl = useIntl();
  const { user } = useAuth();

  const [meetings, setMeetings] = useState<ZoomMeeting[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  // Fetch meetings and attendances
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const db = getFirestore();
      const now = Timestamp.now();

      // Fetch upcoming and recent meetings
      const meetingsQuery = query(
        collection(db, 'chatter_zoom_meetings'),
        where('status', 'in', ['scheduled', 'live', 'completed']),
        orderBy('scheduledAt', activeTab === 'upcoming' ? 'asc' : 'desc'),
        limit(20)
      );

      const meetingsSnapshot = await getDocs(meetingsQuery);
      const meetingsData = meetingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ZoomMeeting[];

      // Filter based on tab
      const filteredMeetings = meetingsData.filter(m => {
        const meetingDate = new Date(m.scheduledAt._seconds * 1000);
        const isUpcoming = meetingDate >= new Date();
        return activeTab === 'upcoming' ? isUpcoming || m.status === 'live' : !isUpcoming && m.status === 'completed';
      });

      setMeetings(filteredMeetings);

      // Fetch user's attendances
      const attendancesQuery = query(
        collection(db, 'chatter_zoom_attendances'),
        where('chatterId', '==', user.uid)
      );

      const attendancesSnapshot = await getDocs(attendancesQuery);
      const attendancesData = attendancesSnapshot.docs.map(doc => doc.data()) as Attendance[];
      setAttendances(attendancesData);

    } catch (err) {
      console.error('Error fetching zoom data:', err);
      setError(intl.formatMessage({
        id: 'chatter.zoom.fetchError',
        defaultMessage: 'Erreur lors du chargement des réunions'
      }));
    } finally {
      setLoading(false);
    }
  }, [user, activeTab, intl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Check if user attended a meeting
  const hasAttended = (meetingId: string) => {
    return attendances.some(a => a.meetingId === meetingId);
  };

  // Format date
  const formatDate = (timestamp: { _seconds: number }) => {
    const date = new Date(timestamp._seconds * 1000);
    return date.toLocaleDateString(intl.locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timestamp: { _seconds: number }) => {
    const date = new Date(timestamp._seconds * 1000);
    return date.toLocaleTimeString(intl.locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status badge
  const getStatusBadge = (meeting: ZoomMeeting) => {
    if (meeting.status === 'live') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs font-medium animate-pulse">
          <span className="w-2 h-2 bg-red-500 rounded-full" />
          <FormattedMessage id="chatter.zoom.status.live" defaultMessage="En direct" />
        </span>
      );
    }
    if (meeting.status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs font-medium">
          <Check className="w-3 h-3" />
          <FormattedMessage id="chatter.zoom.status.completed" defaultMessage="Terminé" />
        </span>
      );
    }
    return null;
  };

  // Calculate total bonus earned from Zoom
  const totalZoomBonus = attendances.filter(a => a.bonusReceived).length * 500; // Assuming $5 per meeting

  return (
    <Layout showFooter={false}>
      <ChatterDashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              <FormattedMessage id="chatter.zoom.title" defaultMessage="Réunions Zoom" />
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              <FormattedMessage id="chatter.zoom.subtitle" defaultMessage="Participez aux réunions pour gagner des bonus et vous former" />
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`${UI.card} p-4`}>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <Video className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {attendances.length}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <FormattedMessage id="chatter.zoom.stats.attended" defaultMessage="Réunions suivies" />
                  </p>
                </div>
              </div>
            </div>

            <div className={`${UI.card} p-4`}>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                  <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ${(totalZoomBonus / 100).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <FormattedMessage id="chatter.zoom.stats.bonus" defaultMessage="Bonus Zoom gagnés" />
                  </p>
                </div>
              </div>
            </div>

            <div className={`${UI.card} p-4`}>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                  <CalendarDays className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {meetings.filter(m => m.status === 'scheduled' || m.status === 'live').length}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <FormattedMessage id="chatter.zoom.stats.upcoming" defaultMessage="Prochaines réunions" />
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                activeTab === 'upcoming'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                  : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
              }`}
            >
              <FormattedMessage id="chatter.zoom.tabs.upcoming" defaultMessage="À venir" />
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                activeTab === 'past'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                  : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
              }`}
            >
              <FormattedMessage id="chatter.zoom.tabs.past" defaultMessage="Passées" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Meetings List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            </div>
          ) : meetings.length === 0 ? (
            <div className={`${UI.card} p-8 text-center`}>
              <Video className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {activeTab === 'upcoming' ? (
                  <FormattedMessage id="chatter.zoom.empty.upcoming.title" defaultMessage="Aucune réunion à venir" />
                ) : (
                  <FormattedMessage id="chatter.zoom.empty.past.title" defaultMessage="Aucune réunion passée" />
                )}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {activeTab === 'upcoming' ? (
                  <FormattedMessage id="chatter.zoom.empty.upcoming.message" defaultMessage="Les prochaines réunions apparaîtront ici." />
                ) : (
                  <FormattedMessage id="chatter.zoom.empty.past.message" defaultMessage="Vos réunions passées apparaîtront ici." />
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {meetings.map((meeting) => {
                const attended = hasAttended(meeting.id);

                return (
                  <div key={meeting.id} className={`${UI.card} p-4`}>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(meeting)}
                          {attended && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-xs font-medium">
                              <Check className="w-3 h-3" />
                              <FormattedMessage id="chatter.zoom.attended" defaultMessage="Participé" />
                            </span>
                          )}
                          {meeting.bonusAmount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs font-medium">
                              <Award className="w-3 h-3" />
                              +${(meeting.bonusAmount / 100).toFixed(2)}
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {meeting.title}
                        </h3>

                        {meeting.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {meeting.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(meeting.scheduledAt)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatTime(meeting.scheduledAt)} ({meeting.durationMinutes} min)
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {meeting.attendeeCount} {meeting.maxParticipants ? `/ ${meeting.maxParticipants}` : ''} participants
                          </div>
                        </div>

                        {meeting.topics && meeting.topics.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {meeting.topics.map((topic, idx) => (
                              <span key={idx} className="px-2 py-1 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 rounded-lg text-xs">
                                {topic}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {(meeting.status === 'scheduled' || meeting.status === 'live') && (
                        <a
                          href={meeting.zoomUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${UI.button.primary} px-6 py-3 flex items-center gap-2 whitespace-nowrap`}
                        >
                          {meeting.status === 'live' ? (
                            <>
                              <Play className="w-4 h-4" />
                              <FormattedMessage id="chatter.zoom.joinNow" defaultMessage="Rejoindre" />
                            </>
                          ) : (
                            <>
                              <ExternalLink className="w-4 h-4" />
                              <FormattedMessage id="chatter.zoom.addToCalendar" defaultMessage="Voir détails" />
                            </>
                          )}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Info Card */}
          <div className={`${UI.card} p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20`}>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <Video className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  <FormattedMessage id="chatter.zoom.info.title" defaultMessage="Gagnez des bonus en participant" />
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage
                    id="chatter.zoom.info.description"
                    defaultMessage="Chaque participation à une réunion Zoom vous rapporte un bonus de $5. Les réunions sont l'occasion d'apprendre de nouvelles techniques et de partager avec la communauté."
                  />
                </p>
              </div>
            </div>
          </div>
        </div>
      </ChatterDashboardLayout>
    </Layout>
  );
};

export default ChatterZoom;
