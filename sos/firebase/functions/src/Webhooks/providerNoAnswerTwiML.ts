import { onRequest } from 'firebase-functions/v2/https';
import { Request, Response } from 'express';
import { twilioCallManager } from '../TwilioCallManager';
import { logError } from '../utils/logs/logError';
// P0 FIX: Import call region from centralized config - dedicated region for call functions
import { CALL_FUNCTIONS_REGION } from '../configs/callRegion';
import { validateTwilioWebhookSignature, TWILIO_AUTH_TOKEN_SECRET, TWILIO_ACCOUNT_SID_SECRET } from '../lib/twilio';

// Helper to escape XML
function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Voice messages for provider no-answer in different languages
const PROVIDER_NO_ANSWER_MESSAGES: Record<string, string> = {
  fr: "Le prestataire n'a pas répondu, nos excuses. Vous serez remboursé immédiatement. Vous pouvez choisir un autre prestataire.",
  en: "The service provider did not answer, our apologies. You will be instantly refunded. You may choose another provider.",
  es: "El proveedor de servicios no respondió, nuestras disculpas. Será reembolsado de inmediato. Puede elegir otro proveedor.",
  de: "Der Dienstleister hat nicht geantwortet, unsere Entschuldigung. Sie werden sofort erstattet. Sie können einen anderen Anbieter wählen.",
  ru: "Поставщик услуг не ответил, наши извинения. Вам будет немедленно возвращена оплата. Вы можете выбрать другого поставщика.",
  hi: "सेवा प्रदाता ने जवाब नहीं दिया, हमारी क्षमा याचना। आपको तुरंत धनवापसी की जाएगी। आप दूसरा प्रदाता चुन सकते हैं।",
  pt: "O prestador de serviços não respondeu, nossas desculpas. Você será reembolsado instantaneamente. Você pode escolher outro prestador.",
  ar: "لم يرد مقدم الخدمة، اعتذارنا. سيتم استرداد أموالك على الفور. يمكنك اختيار مقدم خدمة آخر.",
  zh: "服务提供商没有接听，我们深表歉意。您将立即获得退款。您可以选择其他提供商。",
};

const VOICE_LOCALES: Record<string, string> = {
  fr: "fr-FR",
  en: "en-US",
  pt: "pt-BR",
  es: "es-ES",
  de: "de-DE",
  ru: "ru-RU",
  zh: "zh-CN",
  ar: "ar-SA",
  hi: "hi-IN",
};

/**
 * Webhook endpoint that returns TwiML for provider no-answer message
 * This is called when redirecting the client's call after provider doesn't answer
 */
export const providerNoAnswerTwiML = onRequest(
  {
    // P0 FIX 2026-02-04: Migrated to dedicated region for call functions to avoid quota issues
    region: CALL_FUNCTIONS_REGION,
    // P0 CRITICAL FIX 2026-02-04: Allow unauthenticated access for Twilio webhooks (Cloud Run requires explicit public access)
    invoker: "public",
    memory: '128MiB',
    cpu: 0.083,
    maxInstances: 3,
    minInstances: 0,
    concurrency: 1,
    // P0 FIX: Add secrets for Twilio signature validation
    secrets: [TWILIO_AUTH_TOKEN_SECRET, TWILIO_ACCOUNT_SID_SECRET]
  },
  async (req: Request, res: Response) => {
    try {
      // P0 SECURITY: Validate Twilio signature
      if (!validateTwilioWebhookSignature(req as any, res as any)) {
        console.error("[providerNoAnswerTwiML] Invalid Twilio signature - rejecting request");
        return;
      }

      // P1 SECURITY: CallSid guard - reject requests without a valid CallSid
      const callSid = req.body?.CallSid;
      if (!callSid || typeof callSid !== 'string' || !callSid.startsWith('CA')) {
        console.error(`[providerNoAnswerTwiML] Missing or invalid CallSid: ${callSid}`);
        res.status(400).send('Missing or invalid CallSid');
        return;
      }

      const sessionId = req.query.sessionId as string;
      const lang = (req.query.lang as string) || 'en';

      if (!sessionId) {
        console.warn('providerNoAnswerTwiML: Missing sessionId');
        res.status(400).send('Missing sessionId');
        return;
      }

      // Get the session to verify it exists
      const session = await twilioCallManager.getCallSession(sessionId);
      if (!session) {
        console.warn(`providerNoAnswerTwiML: Session not found: ${sessionId}`);
        res.status(404).send('Session not found');
        return;
      }

      // Get message in the appropriate language
      const message = PROVIDER_NO_ANSWER_MESSAGES[lang] || PROVIDER_NO_ANSWER_MESSAGES['en'];
      const ttsLocale = VOICE_LOCALES[lang] || VOICE_LOCALES['en'];

      // Generate TwiML
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="${ttsLocale}">${escapeXml(message)}</Say>
  <Hangup/>
</Response>`;

      res.type('text/xml');
      res.send(twiml);

    } catch (error) {
      console.error('❌ Erreur providerNoAnswerTwiML:', error);
      await logError('providerNoAnswerTwiML:error', error);
      
      // Return fallback TwiML
      const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-US">The service provider did not answer, our apologies. You will be instantly refunded. You may choose another provider.</Say>
  <Hangup/>
</Response>`;
      
      res.type('text/xml');
      res.status(200).send(fallbackTwiml);
    }
  }
);

