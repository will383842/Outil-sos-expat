import * as admin from 'firebase-admin';
import { getTwilioClient, getTwilioPhoneNumber } from './lib/twilio';
import { logError } from './utils/logs/logError';

// ============================================================================
// P0 SECURITY: Rate limiting pour éviter les abus de coûts Twilio (appels vocaux)
// ============================================================================

interface VoiceRateLimitEntry {
  count: number;
  windowStart: number;
}

// Rate limit: 5 appels par numéro par heure, 50 appels globaux par heure
const VOICE_RATE_LIMIT = {
  PER_NUMBER_MAX: 5,
  GLOBAL_MAX: 50,
  WINDOW_MS: 60 * 60 * 1000, // 1 heure
};

// Cache en mémoire pour rate limiting
const voiceRateLimitCache: Map<string, VoiceRateLimitEntry> = new Map();

async function checkVoiceRateLimit(to: string): Promise<{ allowed: boolean; reason?: string }> {
  const now = Date.now();
  const db = admin.firestore();

  // 1. Check rate limit par numéro de destination
  const perNumberKey = `voice:${to}`;
  const perNumberEntry = voiceRateLimitCache.get(perNumberKey);

  if (perNumberEntry) {
    if (now - perNumberEntry.windowStart > VOICE_RATE_LIMIT.WINDOW_MS) {
      voiceRateLimitCache.set(perNumberKey, { count: 1, windowStart: now });
    } else if (perNumberEntry.count >= VOICE_RATE_LIMIT.PER_NUMBER_MAX) {
      console.warn(`🚫 [VOICE] Rate limit exceeded for number ${to.slice(0, 5)}***: ${perNumberEntry.count}/${VOICE_RATE_LIMIT.PER_NUMBER_MAX}`);
      return { allowed: false, reason: `Rate limit exceeded: max ${VOICE_RATE_LIMIT.PER_NUMBER_MAX} calls per hour per number` };
    } else {
      perNumberEntry.count++;
    }
  } else {
    voiceRateLimitCache.set(perNumberKey, { count: 1, windowStart: now });
  }

  // 2. Check rate limit global via Firestore
  const globalRef = db.collection("rate_limits").doc("voice_global");

  try {
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(globalRef);
      const data = doc.data();

      if (!data || now - data.windowStart > VOICE_RATE_LIMIT.WINDOW_MS) {
        transaction.set(globalRef, { count: 1, windowStart: now });
        return { allowed: true };
      }

      if (data.count >= VOICE_RATE_LIMIT.GLOBAL_MAX) {
        return { allowed: false, reason: `Global rate limit exceeded: max ${VOICE_RATE_LIMIT.GLOBAL_MAX} calls per hour` };
      }

      transaction.update(globalRef, { count: admin.firestore.FieldValue.increment(1) });
      return { allowed: true };
    });

    return result;
  } catch (error) {
    console.error("🚫 [VOICE] Rate limit check failed:", error);
    return { allowed: true };
  }
}

export interface MessageTemplate {
  id: string;
  name: string;
  type: 'voice';
  language: 'fr' | 'en' | 'es';
  content: string;
  variables: string[];
  isActive: boolean;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export class MessageManager {
  private db = admin.firestore();
  private templateCache = new Map<string, MessageTemplate>();

  /**
   * Récupère un template depuis Firestore (avec cache)
   */
  async getTemplate(templateId: string): Promise<MessageTemplate | null> {
    if (this.templateCache.has(templateId)) {
      return this.templateCache.get(templateId)!;
    }

    try {
      const doc = await this.db.collection('message_templates').doc(templateId).get();

      if (!doc.exists) {
        console.warn(`Template non trouvé: ${templateId}`);
        return null;
      }

      const template = doc.data() as MessageTemplate;

      // Cache pour 10 minutes
      this.templateCache.set(templateId, template);
      setTimeout(() => this.templateCache.delete(templateId), 10 * 60 * 1000);

      return template;
    } catch (error) {
      await logError(`MessageManager:getTemplate:${templateId}`, error);
      return null;
    }
  }

  /**
   * Remplace les variables dans un template
   */
  private interpolateTemplate(content: string, variables: Record<string, string>): string {
    let result = content;

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    });

    return result;
  }

  /**
   * Envoie un appel vocal avec template
   * P0 SECURITY: Rate limiting pour éviter les abus de coûts
   */
  async sendVoiceCall(params: {
    to: string;
    templateId: string;
    variables?: Record<string, string>;
    language?: string;
  }): Promise<boolean> {
    try {
      // P0 SECURITY: Check rate limit avant envoi
      const rateLimitCheck = await checkVoiceRateLimit(params.to);
      if (!rateLimitCheck.allowed) {
        console.error(`🚫 [VOICE] BLOCKED by rate limit: ${rateLimitCheck.reason}`);
        await logError('MessageManager:sendVoiceCall:RateLimited', new Error(rateLimitCheck.reason));
        return false;
      }

      const template = await this.getTemplate(params.templateId);

      if (!template || !template.isActive) {
        throw new Error(`Template vocal non disponible: ${params.templateId}`);
      }

      const message = this.interpolateTemplate(template.content, params.variables || {});

      const twiml = `
        <Response>
          <Say voice="alice" language="${params.language || 'fr-FR'}">${message}</Say>
        </Response>
      `;

      const twilioClient = getTwilioClient();
      const twilioPhoneNumber = getTwilioPhoneNumber();

      if (!twilioClient || !twilioPhoneNumber) {
        throw new Error('Configuration Twilio manquante');
      }

      await twilioClient.calls.create({
        to: params.to,
        from: twilioPhoneNumber,
        twiml: twiml,
        timeout: 30
      });

      return true;

    } catch (error) {
      await logError('MessageManager:sendVoiceCall', error);
      return false;
    }
  }

  /**
   * Récupère un message TwiML pour les conférences
   */
  async getTwiMLMessage(templateId: string, variables?: Record<string, string>): Promise<string> {
    const template = await this.getTemplate(templateId);

    if (!template || !template.isActive) {
      // Messages de fallback selon le templateId
      const fallbacks: Record<string, string> = {
        'voice_provider_welcome': 'Bonjour, vous allez être mis en relation avec votre client SOS Expat. Veuillez patienter.',
        'voice_client_welcome': 'Bonjour, vous allez être mis en relation avec votre expert SOS Expat. Veuillez patienter.'
      };

      return fallbacks[templateId] || 'Bonjour, mise en relation en cours.';
    }

    return this.interpolateTemplate(template.content, variables || {});
  }
}

// Instance singleton
export const messageManager = new MessageManager();
