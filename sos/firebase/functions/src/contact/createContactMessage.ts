/**
 * ============================================================================
 * P0 SECURITY: Cloud Function pour créer des messages de contact
 * ============================================================================
 *
 * Cette fonction remplace l'écriture directe dans Firestore depuis le client.
 * Elle inclut:
 * - Rate limiting par IP (max 3 messages/heure)
 * - Validation des données
 * - Protection contre le spam
 */

import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

const REGION = "europe-west1";

// Rate limiting: max 3 messages par IP par heure
const RATE_LIMIT = {
  MAX_MESSAGES: 3,
  WINDOW_MS: 60 * 60 * 1000, // 1 heure
};

interface ContactMessageData {
  email: string;
  name?: string;
  subject?: string;
  message: string;
  phone?: string;
}

/**
 * Valide les données du message de contact
 */
function validateContactData(data: unknown): { valid: boolean; error?: string; data?: ContactMessageData } {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Invalid request body" };
  }

  const body = data as Record<string, unknown>;

  // Email requis
  if (typeof body.email !== "string" || body.email.length < 5 || !body.email.includes("@")) {
    return { valid: false, error: "Valid email is required" };
  }

  // Message requis
  if (typeof body.message !== "string" || body.message.length < 10) {
    return { valid: false, error: "Message must be at least 10 characters" };
  }

  if (body.message.length > 5000) {
    return { valid: false, error: "Message must be less than 5000 characters" };
  }

  return {
    valid: true,
    data: {
      email: body.email.toLowerCase().trim(),
      name: typeof body.name === "string" ? body.name.trim() : undefined,
      subject: typeof body.subject === "string" ? body.subject.trim() : undefined,
      message: body.message.trim(),
      phone: typeof body.phone === "string" ? body.phone.trim() : undefined,
    },
  };
}

/**
 * Vérifie le rate limit par IP
 */
async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  const db = admin.firestore();
  const now = Date.now();
  const windowStart = now - RATE_LIMIT.WINDOW_MS;

  // Nettoyer l'IP pour l'utiliser comme ID de document
  const ipDocId = `contact_${ip.replace(/[.:]/g, "_")}`;
  const rateLimitRef = db.collection("rate_limits").doc(ipDocId);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);
      const data = doc.data();

      if (!data || data.windowStart < windowStart) {
        // Nouvelle fenêtre ou première requête
        transaction.set(rateLimitRef, {
          count: 1,
          windowStart: now,
          ip: ip,
          type: "contact_message",
        });
        return { allowed: true, remaining: RATE_LIMIT.MAX_MESSAGES - 1 };
      }

      if (data.count >= RATE_LIMIT.MAX_MESSAGES) {
        return { allowed: false, remaining: 0 };
      }

      transaction.update(rateLimitRef, {
        count: admin.firestore.FieldValue.increment(1),
      });

      return { allowed: true, remaining: RATE_LIMIT.MAX_MESSAGES - data.count - 1 };
    });

    return result;
  } catch (error) {
    console.error("[createContactMessage] Rate limit check failed:", error);
    // En cas d'erreur, permettre mais logger
    return { allowed: true, remaining: 0 };
  }
}

/**
 * Cloud Function HTTP pour créer un message de contact
 */
export const createContactMessage = onRequest(
  {
    region: REGION,
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    // Seulement POST
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    // Récupérer l'IP du client
    const clientIp = req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
                     req.headers["x-real-ip"]?.toString() ||
                     req.ip ||
                     "unknown";

    console.log(`[createContactMessage] Request from IP: ${clientIp.slice(0, 10)}...`);

    // Vérifier le rate limit
    const rateLimitCheck = await checkRateLimit(clientIp);
    if (!rateLimitCheck.allowed) {
      console.warn(`[createContactMessage] Rate limit exceeded for IP: ${clientIp.slice(0, 10)}...`);
      res.status(429).json({
        error: "Too many requests. Please try again later.",
        retryAfter: Math.ceil(RATE_LIMIT.WINDOW_MS / 1000),
      });
      return;
    }

    // Valider les données
    const validation = validateContactData(req.body);
    if (!validation.valid || !validation.data) {
      res.status(400).json({ error: validation.error });
      return;
    }

    try {
      const db = admin.firestore();

      // Créer le message de contact
      const messageDoc = await db.collection("contact_messages").add({
        ...validation.data,
        status: "unread",
        createdAt: Timestamp.now(),
        source: "contact_form",
        clientIp: clientIp.slice(0, 20), // Stocker partiellement pour audit
        metadata: {
          userAgent: req.headers["user-agent"]?.slice(0, 200),
          referer: req.headers["referer"]?.slice(0, 200),
        },
      });

      console.log(`[createContactMessage] Message created: ${messageDoc.id}`);

      res.status(201).json({
        success: true,
        messageId: messageDoc.id,
        remaining: rateLimitCheck.remaining,
      });
    } catch (error) {
      console.error("[createContactMessage] Error creating message:", error);
      res.status(500).json({ error: "Failed to send message. Please try again." });
    }
  }
);
