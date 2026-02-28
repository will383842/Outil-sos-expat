// src/services/admin/comms.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData
} from "firebase/firestore";
import { db, functions } from "@/config/firebase";
import { httpsCallable } from "firebase/functions";

// Types
type Locale = "fr-FR" | "en";

type Recipient = {
  uid?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
};

type MessageTemplate = {
  subject?: string;
  body: string;
  variables?: string[];
  updatedAt: string;
  updatedBy: string;
};

type RoutingConfig = {
  routing: Record<string, unknown>;
  updatedAt: string | null;
  updatedBy?: string;
};

type DeliveryStatus = "queued" | "sent" | "delivered" | "failed" | "cancelled";
type MessageChannel = "email" | "sms" | "whatsapp" | "push";

type MessageDelivery = {
  id: string;
  eventId: string;
  uid?: string | null;
  locale: Locale;
  to: Recipient;
  context: Record<string, unknown>;
  status: DeliveryStatus;
  channel?: MessageChannel;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
  errorMessage?: string;
};

type DeliveryFilters = {
  eventId?: string;
  channel?: MessageChannel;
  status?: DeliveryStatus;
  to?: string;
};

type PaginationResult<T> = {
  items: T[];
  next: QueryDocumentSnapshot<DocumentData> | null;
};

/** TEMPLATES **/
export async function listTemplateIds(locale: Locale): Promise<string[]> {
  try {
    const snap = await getDocs(collection(db, `message_templates/${locale}/items`));
    return snap.docs.map(d => d.id).sort();
  } catch (error) {
    console.error('[comms] Erreur listTemplateIds:', error);
    throw new Error('Impossible de charger la liste des templates');
  }
}

export async function getTemplate(locale: Locale, eventId: string): Promise<MessageTemplate | null> {
  try {
    const ref = doc(db, `message_templates/${locale}/items/${eventId}`);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() as MessageTemplate : null;
  } catch (error) {
    console.error('[comms] Erreur getTemplate:', error);
    throw new Error('Impossible de charger le template');
  }
}

export async function upsertTemplate(
  locale: Locale,
  eventId: string,
  payload: Partial<MessageTemplate>,
  adminUid?: string
): Promise<boolean> {
  try {
    const ref = doc(db, `message_templates/${locale}/items/${eventId}`);
    const body: Partial<MessageTemplate> = {
      ...payload,
      updatedAt: new Date().toISOString(),
      updatedBy: adminUid || "admin"
    };
    await setDoc(ref, body, { merge: true });
    return true;
  } catch (error) {
    console.error('[comms] Erreur upsertTemplate:', error);
    throw new Error('Impossible de sauvegarder le template');
  }
}

/** ROUTING **/
export async function getRouting(): Promise<RoutingConfig> {
  try {
    const ref = doc(db, "message_routing/config");
    const snap = await getDoc(ref);
    return snap.exists()
      ? snap.data() as RoutingConfig
      : { routing: {}, updatedAt: null };
  } catch (error) {
    console.error('[comms] Erreur getRouting:', error);
    throw new Error('Impossible de charger la configuration de routage');
  }
}

export async function upsertRouting(
  routing: Record<string, unknown>,
  adminUid?: string
): Promise<boolean> {
  try {
    const ref = doc(db, "message_routing/config");
    const body: RoutingConfig = {
      routing,
      updatedAt: new Date().toISOString(),
      updatedBy: adminUid || "admin"
    };
    await setDoc(ref, body, { merge: true });
    return true;
  } catch (error) {
    console.error('[comms] Erreur upsertRouting:', error);
    throw new Error('Impossible de sauvegarder la configuration de routage');
  }
}

/** LOGS (deliveries) **/
export async function listDeliveries(
  filters: DeliveryFilters = {},
  pageSize = 50,
  cursor?: QueryDocumentSnapshot<DocumentData>
): Promise<PaginationResult<MessageDelivery>> {
  try {
    let q = query(
      collection(db, "message_deliveries"),
      orderBy("createdAt", "desc"),
      limit(pageSize)
    );

    if (cursor) {
      q = query(q, startAfter(cursor));
    }

    // NB: ajoute ici where(...) si tu as des champs indexés pour filtrer
    const snap = await getDocs(q);
    const items: MessageDelivery[] = snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<MessageDelivery, 'id'>)
    }));
    const next = snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : null;

    return { items, next };
  } catch (error) {
    console.error('[comms] Erreur listDeliveries:', error);
    throw new Error('Impossible de charger les logs de livraison');
  }
}

/** RESEND: recrée un message_events via enqueueMessageEvent callable */
export async function resendDelivery(delivery: MessageDelivery): Promise<boolean> {
  try {
    const enqueueFn = httpsCallable(functions, 'enqueueMessageEvent');
    await enqueueFn({
      eventId: delivery.eventId,
      locale: delivery.locale || "en",
      to: delivery.to || {},
      context: delivery.context || {},
    });
    return true;
  } catch (error) {
    console.error('[comms] Erreur resendDelivery:', error);
    throw new Error('Impossible de renvoyer le message');
  }
}

/** Envoi manuel via enqueueMessageEvent callable */
export async function manualSend(
  eventId: string,
  locale: Locale,
  to: Recipient,
  context: Record<string, unknown>
): Promise<void> {
  try {
    const enqueueFn = httpsCallable(functions, 'enqueueMessageEvent');
    await enqueueFn({
      eventId,
      locale,
      to,
      context,
    });
  } catch (error) {
    console.error('[comms] Erreur manualSend:', error);
    throw new Error('Impossible d\'envoyer le message');
  }
}