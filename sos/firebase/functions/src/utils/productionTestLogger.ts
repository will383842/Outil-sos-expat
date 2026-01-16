/**
 * Production Test Logger
 *
 * Logs tres visibles pour tester les webhooks en production.
 * A SUPPRIMER apres les tests de validation.
 *
 * Usage:
 *   import { logWebhookTest } from './utils/productionTestLogger';
 *   logWebhookTest.stripe.incoming(event);
 *   logWebhookTest.twilio.incoming(body);
 *   logWebhookTest.paypal.incoming(event);
 */

const SEPARATOR = "=".repeat(80);
const BANNER_START = `
${SEPARATOR}
${"*".repeat(80)}
*${" ".repeat(78)}*
*${" ".repeat(25)}PRODUCTION TEST LOG${" ".repeat(34)}*
*${" ".repeat(78)}*
${"*".repeat(80)}
${SEPARATOR}`;

const BANNER_END = `
${SEPARATOR}
${"*".repeat(80)}
${SEPARATOR}
`;

interface WebhookLogData {
  service: "STRIPE" | "PAYPAL" | "TWILIO";
  direction: "INCOMING" | "PROCESSING" | "SUCCESS" | "ERROR";
  eventType?: string;
  eventId?: string;
  data?: Record<string, unknown>;
  error?: Error | string;
  timestamp?: string;
}

function formatLog(data: WebhookLogData): string {
  const ts = data.timestamp || new Date().toISOString();
  const icon = getIcon(data.service, data.direction);

  let log = `${BANNER_START}
${icon} [${data.service}] ${data.direction}
Timestamp: ${ts}`;

  if (data.eventType) {
    log += `\nEvent Type: ${data.eventType}`;
  }
  if (data.eventId) {
    log += `\nEvent ID: ${data.eventId}`;
  }
  if (data.data) {
    log += `\nData: ${JSON.stringify(data.data, null, 2)}`;
  }
  if (data.error) {
    log += `\nError: ${data.error instanceof Error ? data.error.message : data.error}`;
    if (data.error instanceof Error && data.error.stack) {
      log += `\nStack: ${data.error.stack.split("\n").slice(0, 5).join("\n")}`;
    }
  }

  log += BANNER_END;
  return log;
}

function getIcon(service: string, direction: string): string {
  const icons: Record<string, Record<string, string>> = {
    STRIPE: { INCOMING: "💳", PROCESSING: "⚙️", SUCCESS: "✅", ERROR: "❌" },
    PAYPAL: { INCOMING: "🅿️", PROCESSING: "⚙️", SUCCESS: "✅", ERROR: "❌" },
    TWILIO: { INCOMING: "📞", PROCESSING: "⚙️", SUCCESS: "✅", ERROR: "❌" },
  };
  return icons[service]?.[direction] || "📋";
}

export const logWebhookTest = {
  stripe: {
    incoming: (event: { id?: string; type?: string; data?: unknown }) => {
      console.log(formatLog({
        service: "STRIPE",
        direction: "INCOMING",
        eventType: event.type,
        eventId: event.id,
        data: {
          eventType: event.type,
          eventId: event.id,
          hasData: !!event.data,
          dataKeys: event.data ? Object.keys(event.data as object) : [],
        },
      }));
    },
    processing: (eventType: string, details: Record<string, unknown>) => {
      console.log(formatLog({
        service: "STRIPE",
        direction: "PROCESSING",
        eventType,
        data: details,
      }));
    },
    success: (eventType: string, eventId: string, result?: Record<string, unknown>) => {
      console.log(formatLog({
        service: "STRIPE",
        direction: "SUCCESS",
        eventType,
        eventId,
        data: result,
      }));
    },
    error: (eventType: string, error: Error | string, context?: Record<string, unknown>) => {
      console.error(formatLog({
        service: "STRIPE",
        direction: "ERROR",
        eventType,
        error,
        data: context,
      }));
    },
  },

  paypal: {
    incoming: (event: { id?: string; event_type?: string; resource?: unknown }) => {
      console.log(formatLog({
        service: "PAYPAL",
        direction: "INCOMING",
        eventType: event.event_type,
        eventId: event.id,
        data: {
          eventType: event.event_type,
          eventId: event.id,
          hasResource: !!event.resource,
          resourceKeys: event.resource ? Object.keys(event.resource as object) : [],
        },
      }));
    },
    processing: (eventType: string, details: Record<string, unknown>) => {
      console.log(formatLog({
        service: "PAYPAL",
        direction: "PROCESSING",
        eventType,
        data: details,
      }));
    },
    success: (eventType: string, eventId: string, result?: Record<string, unknown>) => {
      console.log(formatLog({
        service: "PAYPAL",
        direction: "SUCCESS",
        eventType,
        eventId,
        data: result,
      }));
    },
    error: (eventType: string, error: Error | string, context?: Record<string, unknown>) => {
      console.error(formatLog({
        service: "PAYPAL",
        direction: "ERROR",
        eventType,
        error,
        data: context,
      }));
    },
  },

  twilio: {
    incoming: (body: { CallSid?: string; CallStatus?: string; [key: string]: unknown }) => {
      // Sanitize phone numbers for GDPR
      const sanitized = { ...body };
      if (sanitized.From) sanitized.From = String(sanitized.From).slice(0, 4) + "****";
      if (sanitized.To) sanitized.To = String(sanitized.To).slice(0, 4) + "****";

      console.log(formatLog({
        service: "TWILIO",
        direction: "INCOMING",
        eventType: body.CallStatus,
        eventId: body.CallSid,
        data: {
          callStatus: body.CallStatus,
          callSid: body.CallSid,
          direction: body.Direction,
          answeredBy: body.AnsweredBy,
          duration: body.CallDuration,
          allKeys: Object.keys(body),
        },
      }));
    },
    processing: (callStatus: string, details: Record<string, unknown>) => {
      console.log(formatLog({
        service: "TWILIO",
        direction: "PROCESSING",
        eventType: callStatus,
        data: details,
      }));
    },
    success: (callStatus: string, callSid: string, result?: Record<string, unknown>) => {
      console.log(formatLog({
        service: "TWILIO",
        direction: "SUCCESS",
        eventType: callStatus,
        eventId: callSid,
        data: result,
      }));
    },
    error: (callStatus: string, error: Error | string, context?: Record<string, unknown>) => {
      console.error(formatLog({
        service: "TWILIO",
        direction: "ERROR",
        eventType: callStatus,
        error,
        data: context,
      }));
    },
    amd: (params: { sessionId?: string; participantType?: string; answeredBy?: string; callSid?: string }) => {
      console.log(formatLog({
        service: "TWILIO",
        direction: "PROCESSING",
        eventType: "AMD_CALLBACK",
        eventId: params.callSid,
        data: {
          sessionId: params.sessionId,
          participantType: params.participantType,
          answeredBy: params.answeredBy || "UNDEFINED",
          callSid: params.callSid,
          isHuman: params.answeredBy === "human",
          isMachine: params.answeredBy?.startsWith("machine") || params.answeredBy === "fax",
          isUnknown: params.answeredBy === "unknown",
        },
      }));
    },
  },

  // Generic summary log for end of processing
  summary: (service: "STRIPE" | "PAYPAL" | "TWILIO", stats: Record<string, unknown>) => {
    console.log(`
${SEPARATOR}
📊 [${service}] PROCESSING SUMMARY
${SEPARATOR}
${JSON.stringify(stats, null, 2)}
${SEPARATOR}
`);
  },
};

export default logWebhookTest;
