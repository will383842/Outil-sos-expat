/**
 * =============================================================================
 * MULTI DASHBOARD - Get Provider Conversations
 * =============================================================================
 *
 * Callable function to fetch conversations and messages for a provider.
 * Used by the multi-dashboard to display inline chat.
 */

import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

// Initialize Firebase Admin
try {
  admin.app();
} catch {
  admin.initializeApp();
}

// =============================================================================
// TYPES
// =============================================================================

interface GetConversationsRequest {
  sessionToken: string;
  providerId: string;
  bookingRequestId?: string;
  limit?: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: string;
  createdAt: string;
  model?: string;
}

interface Conversation {
  id: string;
  providerId: string;
  providerType?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  messagesCount: number;
  messages: Message[];
  bookingContext?: {
    clientName?: string;
    country?: string;
    category?: string;
  };
}

interface GetConversationsResponse {
  success: boolean;
  conversations?: Conversation[];
  error?: string;
}

// =============================================================================
// HELPER: Convert Firestore Timestamp to ISO string
// =============================================================================

function timestampToISO(ts: admin.firestore.Timestamp | null | undefined): string | undefined {
  if (!ts) return undefined;
  return ts.toDate().toISOString();
}

// =============================================================================
// CALLABLE FUNCTION
// =============================================================================

export const getProviderConversations = onCall<
  GetConversationsRequest,
  Promise<GetConversationsResponse>
>(
  {
    region: "europe-west1",
    timeoutSeconds: 30,
    maxInstances: 10,
    cors: [
      "https://sos-expat.com",
      "https://www.sos-expat.com",
      "http://localhost:3000",
      "http://localhost:5173",
    ],
  },
  async (request) => {
    const { sessionToken, providerId, bookingRequestId, limit = 20 } = request.data;

    logger.info("[getProviderConversations] Request received", {
      providerId,
      bookingRequestId,
      hasSessionToken: !!sessionToken,
    });

    // Validate session token
    if (!sessionToken || typeof sessionToken !== "string" || !sessionToken.startsWith("mds_")) {
      throw new HttpsError("unauthenticated", "Invalid session token");
    }

    if (!providerId || typeof providerId !== "string") {
      throw new HttpsError("invalid-argument", "Provider ID is required");
    }

    try {
      const db = admin.firestore();

      // Build query for conversations
      let query = db.collection("conversations")
        .where("providerId", "==", providerId)
        .orderBy("updatedAt", "desc")
        .limit(limit);

      const conversationsSnap = await query.get();
      const conversations: Conversation[] = [];

      for (const doc of conversationsSnap.docs) {
        const data = doc.data();

        // Fetch messages for this conversation
        const messagesSnap = await doc.ref
          .collection("messages")
          .orderBy("createdAt", "asc")
          .limit(50)
          .get();

        const messages: Message[] = messagesSnap.docs.map(msgDoc => {
          const msgData = msgDoc.data();
          return {
            id: msgDoc.id,
            role: msgData.role,
            content: msgData.content,
            source: msgData.source,
            createdAt: timestampToISO(msgData.createdAt) || new Date().toISOString(),
            model: msgData.model,
          };
        });

        conversations.push({
          id: doc.id,
          providerId: data.providerId,
          providerType: data.providerType,
          status: data.status || "active",
          createdAt: timestampToISO(data.createdAt) || new Date().toISOString(),
          updatedAt: timestampToISO(data.updatedAt) || new Date().toISOString(),
          lastMessageAt: timestampToISO(data.lastMessageAt),
          messagesCount: data.messagesCount || messages.length,
          messages,
          bookingContext: data.bookingContext,
        });
      }

      logger.info("[getProviderConversations] Success", {
        providerId,
        conversationCount: conversations.length,
      });

      return {
        success: true,
        conversations,
      };

    } catch (error) {
      logger.error("[getProviderConversations] Error", { error });
      throw new HttpsError("internal", "Failed to fetch conversations");
    }
  }
);

// =============================================================================
// SEND MESSAGE - For multi-dashboard chat
// =============================================================================

interface SendMessageRequest {
  sessionToken: string;
  providerId: string;
  conversationId?: string;
  message: string;
  bookingRequestId?: string;
}

interface SendMessageResponse {
  success: boolean;
  conversationId?: string;
  aiResponse?: string;
  model?: string;
  error?: string;
}

export const sendMultiDashboardMessage = onCall<
  SendMessageRequest,
  Promise<SendMessageResponse>
>(
  {
    region: "europe-west1",
    timeoutSeconds: 60,
    maxInstances: 20,
    cors: [
      "https://sos-expat.com",
      "https://www.sos-expat.com",
      "http://localhost:3000",
      "http://localhost:5173",
    ],
  },
  async (request) => {
    const { sessionToken, providerId, conversationId, message, bookingRequestId } = request.data;

    logger.info("[sendMultiDashboardMessage] Request received", {
      providerId,
      conversationId,
      bookingRequestId,
      messageLength: message?.length,
    });

    // Validate inputs
    if (!sessionToken || typeof sessionToken !== "string" || !sessionToken.startsWith("mds_")) {
      throw new HttpsError("unauthenticated", "Invalid session token");
    }

    if (!providerId || typeof providerId !== "string") {
      throw new HttpsError("invalid-argument", "Provider ID is required");
    }

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Message is required");
    }

    try {
      const db = admin.firestore();
      const now = admin.firestore.FieldValue.serverTimestamp();

      // Get provider info
      const providerDoc = await db.collection("sos_profiles").doc(providerId).get();
      const providerData = providerDoc.exists ? providerDoc.data() : null;
      const providerType = providerData?.type || "lawyer";

      // Get or create conversation
      let convoRef: admin.firestore.DocumentReference;
      let isNewConversation = false;

      if (conversationId) {
        convoRef = db.collection("conversations").doc(conversationId);
        const convoDoc = await convoRef.get();
        if (!convoDoc.exists) {
          throw new HttpsError("not-found", "Conversation not found");
        }
      } else {
        // Create new conversation
        convoRef = db.collection("conversations").doc();
        isNewConversation = true;

        // Get booking context if bookingRequestId provided
        let bookingContext = null;
        if (bookingRequestId) {
          const bookingDoc = await db.collection("booking_requests").doc(bookingRequestId).get();
          if (bookingDoc.exists) {
            const bookingData = bookingDoc.data()!;
            bookingContext = {
              clientName: bookingData.clientName || `${bookingData.clientFirstName || ""} ${bookingData.clientLastName || ""}`.trim(),
              country: bookingData.clientCurrentCountry,
              category: bookingData.serviceType,
            };
          }
        }

        await convoRef.set({
          providerId,
          providerType,
          userId: providerId, // For multi-dashboard, userId is the provider
          status: "active",
          createdAt: now,
          updatedAt: now,
          lastMessageAt: now,
          messagesCount: 0,
          source: "multi_dashboard",
          ...(bookingContext && { bookingContext }),
          ...(bookingRequestId && { bookingRequestId }),
        });
      }

      // Save user message
      await convoRef.collection("messages").add({
        role: "user",
        source: "multi_dashboard_admin",
        content: message.trim(),
        createdAt: now,
      });

      // Update conversation
      await convoRef.update({
        updatedAt: now,
        lastMessageAt: now,
        messagesCount: admin.firestore.FieldValue.increment(1),
      });

      // For now, return success without AI response
      // The AI response will be generated by calling the aiChat endpoint separately
      // This keeps the multi-dashboard lightweight

      logger.info("[sendMultiDashboardMessage] Message saved", {
        conversationId: convoRef.id,
        isNewConversation,
      });

      return {
        success: true,
        conversationId: convoRef.id,
      };

    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error("[sendMultiDashboardMessage] Error", { error });
      throw new HttpsError("internal", "Failed to send message");
    }
  }
);
