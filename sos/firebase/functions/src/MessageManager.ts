import * as admin from 'firebase-admin';
import { getTwilioClient, getTwilioPhoneNumber } from './lib/twilio';
import { logError } from './utils/logs/logError';

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
   */
  async sendVoiceCall(params: {
    to: string;
    templateId: string;
    variables?: Record<string, string>;
    language?: string;
  }): Promise<boolean> {
    try {
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
