import React, { useEffect, useState } from "react";
import { db, auth } from "@/config/firebase"; // ← ajoute auth
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { FormattedMessage, useIntl } from "react-intl";
import { formatDateTime } from "@/utils/localeFormatters";
import { useApp } from "@/contexts/AppContext";

interface Message {
  id: string;
  providerId: string;
  senderId?: string;
  message: string;
  isRead: boolean;
  createdAt: { seconds: number; nanoseconds: number } | { toDate: () => Date };
  metadata?: {
    clientFirstName?: string;
    clientCountry?: string;
    bookingId?: string;
    providerPhone?: string;
  };
}

const DashboardMessages: React.FC = () => {
  const { user } = useAuth();
  const { language } = useApp();
  const intl = useIntl();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // P0 FIX: Determine if user is a provider or client
  const isProvider = user?.role === 'lawyer' || user?.role === 'expat';

  // ✅ OPTIMISATION COÛTS GCP: Polling 60s au lieu de onSnapshot pour les messages
  // P0 FIX: Load messages based on user role - providers see received messages, clients see sent messages
  useEffect(() => {
    // attendre que l'auth soit prête
    const uid = auth.currentUser?.uid;
    if (!uid || !user?.role) return;

    let isMounted = true;

    // P2 FIX: Only log in development
    if (import.meta.env.DEV && user?.id && user.id !== uid) {
      console.warn("[Messages] user.id != auth.uid → j'utilise auth.uid pour la requête", { userId: user.id, authUid: uid });
    }

    const loadMessages = async () => {
      try {
        const messagesRef = collection(db, "providerMessageOrderCustomers");
        // P0 FIX: Filter based on role - providers see messages sent to them, clients see messages they sent
        const filterField = isProvider ? "providerId" : "senderId";
        const q = query(
          messagesRef,
          where(filterField, "==", uid),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);
        if (!isMounted) return;

        const fetched: Message[] = snapshot.docs.map((d) => {
          const data = d.data() as Omit<Message, "id">;
          return { id: d.id, ...data };
        });
        setMessages(fetched);
        setLoading(false);
      } catch (err: unknown) {
        console.error("Error loading messages:", err);
        if (isMounted) setLoading(false);
      }
    };

    loadMessages();
    const intervalId = setInterval(loadMessages, 60000); // Poll every 60s

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [user, isProvider]); // le hook se relance si le contexte change

  const markAsRead = async (messageId: string) => {
    // règles: seul le provider (auth.uid == providerId) peut passer isRead à true
    const messageRef = doc(db, "providerMessageOrderCustomers", messageId);
    await updateDoc(messageRef, { isRead: true });
  };

  if (loading) return <Loader />;

  const formatDate = (createdAt: Message["createdAt"]): string => {
    const userCountry = (user as { currentCountry?: string; country?: string })?.currentCountry ||
                        (user as { currentCountry?: string; country?: string })?.country;
    return formatDateTime(createdAt, {
      language,
      userCountry,
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">📩 <FormattedMessage id="dashboard.messages"/></h2>

      {messages.length === 0 && (
        <p className="text-gray-500"><FormattedMessage id="dashboard.emptyMessages"/></p>
      )}

      {messages.map((msg) => (
        <Card key={msg.id}>
          <div className={msg.isRead ? "" : "border-2 border-red-500"}>
            <CardContent>
              <div className="p-4 space-y-2">
                <p className="font-semibold text-sm text-gray-500">
                  {isProvider
                    ? intl.formatMessage({ id: 'dashboard.messages.receivedOn' })
                    : intl.formatMessage({ id: 'dashboard.messages.sentOn' }, { defaultMessage: 'Envoyé le' })
                  } {formatDate(msg.createdAt)}
                </p>
                {isProvider ? (
                  // Provider view: show client info
                  <>
                    <p>
                      <strong>{intl.formatMessage({ id: 'dashboard.messages.client' })}</strong>{" "}
                      {msg.metadata?.clientFirstName ?? intl.formatMessage({ id: 'common.unknown' })}
                    </p>
                    <p>
                      <strong>{intl.formatMessage({ id: 'dashboard.messages.country' })}</strong>{" "}
                      {msg.metadata?.clientCountry ?? intl.formatMessage({ id: 'common.notSpecified' })}
                    </p>
                  </>
                ) : (
                  // Client view: show provider info
                  <p>
                    <strong>{intl.formatMessage({ id: 'dashboard.messages.sentTo', defaultMessage: 'Envoyé à' })}</strong>{" "}
                    {intl.formatMessage({ id: 'dashboard.messages.provider', defaultMessage: 'Prestataire' })}
                  </p>
                )}
                <p>
                  <strong>{intl.formatMessage({ id: 'dashboard.messages.message' })}</strong> {msg.message}
                </p>

                {/* P0 FIX: Only providers can mark messages as read */}
                {isProvider && !msg.isRead && (
                  <Button size="sm" variant="outline" onClick={() => markAsRead(msg.id)}>
                    {intl.formatMessage({ id: 'dashboard.messages.markAsRead' })}
                  </Button>
                )}

                {/* P0 FIX: Show read status for clients */}
                {!isProvider && (
                  <p className={`text-sm ${msg.isRead ? 'text-green-600' : 'text-orange-500'}`}>
                    {msg.isRead
                      ? intl.formatMessage({ id: 'dashboard.messages.read', defaultMessage: 'Lu' })
                      : intl.formatMessage({ id: 'dashboard.messages.notRead', defaultMessage: 'Non lu' })
                    }
                  </p>
                )}
              </div>
            </CardContent>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default DashboardMessages;
