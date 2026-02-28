/**
 * AdminChatterDripMessages - Admin page for managing drip campaign messages
 * 60 messages sent over 90 days to motivate and guide chatters
 */

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FormattedMessage, useIntl } from 'react-intl';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from "@/config/firebase";
import {
  MessageSquare,
  Send,
  Eye,
  Calendar,
  TrendingUp,
  Users,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    success: "bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-all",
  },
  badge: {
    success: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-sm font-medium",
    warning: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-3 py-1 rounded-full text-sm font-medium",
    info: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-medium",
  },
} as const;

interface DripMessage {
  day: number;
  messages: Record<string, string>;
  status: string;
  createdAt?: any;
  updatedAt?: any;
}

interface DripStats {
  totalMessages: number;
  totalSent: number;
  totalPending: number;
  totalFailed: number;
  byDay: Record<number, { sent: number; failed: number; pending: number }>;
}

interface PreviewModalProps {
  message: DripMessage | null;
  language: string;
  onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ message, language, onClose }) => {
  if (!message) return null;

  const messageText = message.messages[language] || message.messages.fr || 'Message not available';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`${UI.card} max-w-2xl w-full p-6 space-y-4`}>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            📅 Jour {message.day} - Prévisualisation
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Langue: {language.toUpperCase()}
          </label>
          <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4">
            <div
              className="text-gray-900 dark:text-white whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: messageText.replace(/\n/g, '<br/>') }}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={onClose} className={`${UI.button.secondary} px-6 py-2`}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminChatterDripMessages: React.FC = () => {
  const intl = useIntl();
  const db = getFirestore();

  const [messages, setMessages] = useState<DripMessage[]>([]);
  const [stats, setStats] = useState<DripStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewMessage, setPreviewMessage] = useState<DripMessage | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('fr');
  const [sending, setSending] = useState<number | null>(null);

  // Load messages from Firestore
  const loadMessages = async () => {
    try {
      setLoading(true);
      const messagesRef = collection(db, 'chatter_drip_messages');
      const q = query(messagesRef, orderBy('day', 'asc'));
      const snapshot = await getDocs(q);

      const loadedMessages: DripMessage[] = [];
      snapshot.forEach((doc) => {
        loadedMessages.push({ ...doc.data(), day: doc.data().day } as DripMessage);
      });

      setMessages(loadedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load stats from Cloud Function
  const loadStats = async () => {
    try {
      const getStatsFunction = httpsCallable(functionsAffiliate, 'chatter_getDripStats');
      const result: any = await getStatsFunction();
      setStats(result.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    loadMessages();
    loadStats();
  }, []);

  const handlePreview = (message: DripMessage) => {
    setPreviewMessage(message);
  };

  const handleSendManual = async (messageDay: number, chatterId: string) => {
    try {
      setSending(messageDay);
      const sendFunction = httpsCallable(functionsAffiliate, 'chatter_sendDripMessage');
      await sendFunction({ chatterId, day: messageDay, language: selectedLanguage });
      toast.success(`Message jour ${messageDay} envoyé avec succès !`);
      await loadStats();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setSending(null);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              📨 Messages Drip Campaign
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              60 messages de motivation envoyés automatiquement sur 90 jours
            </p>
          </div>
          <button
            onClick={() => {
              loadMessages();
              loadStats();
            }}
            className={`${UI.button.secondary} px-4 py-2 flex items-center gap-2`}
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={UI.card}>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <MessageSquare className="w-8 h-8 text-blue-500" />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalMessages}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Messages configurés</p>
              </div>
            </div>

            <div className={UI.card}>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalSent}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Messages envoyés</p>
              </div>
            </div>

            <div className={UI.card}>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <Clock className="w-8 h-8 text-yellow-500" />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalPending}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">En attente</p>
              </div>
            </div>

            <div className={UI.card}>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <XCircle className="w-8 h-8 text-red-500" />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalFailed}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Échecs</p>
              </div>
            </div>
          </div>
        )}

        {/* Language Selector */}
        <div className={`${UI.card} p-4`}>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Langue de prévisualisation :
          </label>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="fr">Français (FR)</option>
            <option value="en">English (EN)</option>
            <option value="es">Español (ES)</option>
            <option value="de">Deutsch (DE)</option>
            <option value="pt">Português (PT)</option>
            <option value="ru">Русский (RU)</option>
            <option value="zh">中文 (ZH)</option>
            <option value="hi">हिन्दी (HI)</option>
            <option value="ar">العربية (AR)</option>
          </select>
        </div>

        {/* Messages List */}
        <div className={`${UI.card} p-6`}>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            📋 Liste des messages
          </h2>

          <div className="space-y-3">
            {messages.map((msg) => {
              const messagePreview = msg.messages[selectedLanguage] || msg.messages.fr || '';
              const preview = messagePreview.substring(0, 100) + (messagePreview.length > 100 ? '...' : '');

              return (
                <div
                  key={msg.day}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-gray-900 dark:text-white">
                        📅 Jour {msg.day}
                      </span>
                      <span className={UI.badge.info}>
                        {Object.keys(msg.messages).length} langues
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{preview}</p>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handlePreview(msg)}
                      className={`${UI.button.secondary} px-4 py-2 flex items-center gap-2`}
                    >
                      <Eye className="w-4 h-4" />
                      Voir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                💡 Fonctionnement automatique
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Les messages sont envoyés automatiquement chaque jour à <b>10h00 (Paris)</b> via la fonction
                scheduled <code>sendChatterDripMessages</code>. Le message du jour 0 est envoyé immédiatement
                lors de la connexion Telegram du chatter.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewMessage && (
        <PreviewModal
          message={previewMessage}
          language={selectedLanguage}
          onClose={() => setPreviewMessage(null)}
        />
      )}
    </AdminLayout>
  );
};

export default AdminChatterDripMessages;
