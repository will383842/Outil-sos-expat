import React, { useEffect, useState } from "react";
import { db, auth } from "@/config/firebase"; // ← ajoute auth
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
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

  useEffect(() => {
    // attendre que l’auth soit prête
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Alerte utile si jamais ton contexte n'a pas le même identifiant
    if (user?.id && user.id !== uid) {
      // Cela arrive souvent quand user.id = id du doc Firestore et pas l’UID Auth
      console.warn("[Messages] user.id != auth.uid → j’utilise auth.uid pour la requête", { userId: user.id, authUid: uid });
    }

    const messagesRef = collection(db, "providerMessageOrderCustomers");
    const q = query(
      messagesRef,
      where("providerId", "==", uid),        // ← FILTRE SUR L’UID AUTH
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: Message[] = snapshot.docs.map((d) => {
          const data = d.data() as Omit<Message, "id">;
        return { id: d.id, ...data };
        });
        setMessages(fetched);
        setLoading(false);
      },
      (err: unknown) => {
        console.error("onSnapshot messages error:", err);
        setLoading(false);
        unsubscribe(); // coupe pour éviter le spam si permission-denied
      }
    );

    return () => unsubscribe();
  }, [user]); // le hook se relance si le contexte change

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
                  {intl.formatMessage({ id: 'dashboard.messages.receivedOn' })} {formatDate(msg.createdAt)}
                </p>
                <p>
                  <strong>{intl.formatMessage({ id: 'dashboard.messages.client' })}</strong>{" "}
                  {msg.metadata?.clientFirstName ?? intl.formatMessage({ id: 'common.unknown' })}
                </p>
                <p>
                  <strong>{intl.formatMessage({ id: 'dashboard.messages.country' })}</strong>{" "}
                  {msg.metadata?.clientCountry ?? intl.formatMessage({ id: 'common.notSpecified' })}
                </p>
                <p>
                  <strong>{intl.formatMessage({ id: 'dashboard.messages.message' })}</strong> {msg.message}
                </p>

                {!msg.isRead && (
                  <Button size="sm" variant="outline" onClick={() => markAsRead(msg.id)}>
                    {intl.formatMessage({ id: 'dashboard.messages.markAsRead' })}
                  </Button>
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
