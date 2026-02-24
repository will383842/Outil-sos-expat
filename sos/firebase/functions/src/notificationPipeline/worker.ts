import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
// import { resolveLang } from "./i18n";

// P0 FIX: Import secrets from centralized secrets.ts - NEVER call defineSecret() here!
import {
  EMAIL_USER,
  EMAIL_PASS,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
  TELEGRAM_BOT_TOKEN,
} from "../lib/secrets";

// 📤 IMPORTS DES MODULES
import { getTemplate } from "./templates";
import { getRouting, isRateLimited } from "./routing";
import { render } from "./render";
import { Channel, TemplatesByEvent, RoutingPerEvent } from "./types";

// IMPORTS DES PROVIDERS
import { sendZoho } from "./providers/email/zohoSmtp";
import { sendSms } from "./providers/sms/twilioSms"; // SMS only for booking_paid_provider
import { sendTelegramMessage } from "../telegram/providers/telegramBot";
import { sendPush } from "./providers/push/fcm";
import { writeInApp } from "./providers/inapp/firestore";
import { resolveLang } from "./i18n";

// ➕ NORMALISATION D'EVENTID
function normalizeEventId(id: string) {
  if (id === "whatsapp_provider_booking_request")
    return "request.created.provider";
  return id.replace(/^whatsapp_/, "").replace(/^sms_/, "");
}

// Lazy initialization pattern to avoid initialization during deployment analysis
const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

let _initialized = false;
function ensureInitialized() {
  if (!_initialized && !IS_DEPLOYMENT_ANALYSIS) {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    _initialized = true;
  }
}

// Firestore reference getter (lazy)
function getDb() {
  ensureInitialized();
  return admin.firestore();
}

// ----- Types locaux (éviter les `any`)
type UserCtx = {
  uid?: string;
  email?: string;
  phoneNumber?: string;
  waNumber?: string;
  fcmTokens?: string[];
  preferredLanguage?: string;
};

type Destinations = {
  email?: string;
  phone?: string;
  whatsapp?: string;
  fcmToken?: string;
};

type Context = {
  user?: UserCtx;
  to?: Destinations;
  [k: string]: unknown;
};

type MessageEvent = {
  eventId: string;
  templateId?: string;
  locale?: string;
  to?: Destinations;
  context?: Context;
  vars?: Record<string, string | number | boolean | null | undefined>;
  channels?: Channel[];
  dedupeKey?: string;
  uid?: string;
};

// ----- Helpers pour sélection des canaux
function hasContact(channel: Channel, ctx: Context): boolean {
  if (channel === "email") return !!(ctx?.user?.email || ctx?.to?.email);
  if (channel === "sms") return !!(ctx?.user?.phoneNumber || ctx?.to?.phone);
  if (channel === "push")
    return (
      (Array.isArray(ctx?.user?.fcmTokens) &&
        (ctx.user?.fcmTokens?.length ?? 0) > 0) ||
      !!ctx?.to?.fcmToken
    );
  if (channel === "inapp") return !!ctx?.user?.uid;
  return false;
}

function channelsToAttempt(
  strategy: "parallel" | "fallback",
  order: Channel[] | undefined,
  routeChannels: RoutingPerEvent["channels"],
  tmpl: TemplatesByEvent,
  ctx: Context
): Channel[] {
  // Liste des canaux actifs - SMS activé uniquement pour booking_paid_provider (filtré dans sendOne)
  const all: Channel[] = ["email", "sms", "push", "inapp"];
  const base = all.filter(
    (c) => routeChannels[c]?.enabled && tmpl[c]?.enabled && hasContact(c, ctx)
  );

  if (strategy === "parallel") return base;
  const ord = (order ?? all).filter((c) => base.includes(c));
  return ord;
}

// Résultat d'envoi unitaire
type SendResult = {
  messageId?: string;
  sid?: string;
  skipped?: boolean;
  reason?: string;
};

// ----- Envoi unitaire par canal
async function sendOne(
  channel: Channel,
  _provider: string, // <- paramètre non utilisé, préfixé pour lever TS6133
  tmpl: TemplatesByEvent,
  ctx: Context,
  evt: MessageEvent
): Promise<SendResult> {
  if (channel === "email") {
    const to = ctx?.user?.email || evt.to?.email;
    if (!to || !tmpl.email?.enabled)
      throw new Error("Missing email destination or disabled template");

    const subject = render(tmpl.email.subject || "", { ...ctx, ...evt.vars });
    const html = render(tmpl.email.html || "", { ...ctx, ...evt.vars });
    const text = tmpl.email.text
      ? render(tmpl.email.text, { ...ctx, ...evt.vars })
      : undefined;

    const messageId = await sendZoho(to, subject, html, text || html);
    return { messageId };
  }

  if (channel === "sms") {
    // ============================================================
    // SMS ALLOWLIST: Only booking_paid_provider can send SMS
    // All other events are BLOCKED to reduce Twilio costs
    // ============================================================
    const SMS_ALLOWED_EVENTS = ["booking_paid_provider", "call.cancelled.client_no_answer"];
    const eventId = evt.eventId;

    console.log(`📱 [SMS] ========================================`);
    console.log(`📱 [SMS] SMS REQUEST RECEIVED`);
    console.log(`📱 [SMS]   eventId: ${eventId}`);
    console.log(`📱 [SMS]   to: ${evt.to?.phone || ctx?.user?.phoneNumber || "NO_PHONE"}`);
    console.log(`📱 [SMS]   allowed events: ${SMS_ALLOWED_EVENTS.join(", ")}`);
    console.log(`📱 [SMS]   is allowed: ${SMS_ALLOWED_EVENTS.includes(eventId)}`);

    if (!SMS_ALLOWED_EVENTS.includes(eventId)) {
      console.log(`📱 [SMS] ❌ BLOCKED - Event "${eventId}" is NOT in allowlist`);
      console.log(`📱 [SMS] ❌ SMS will NOT be sent to save Twilio costs`);
      console.log(`📱 [SMS] ========================================`);
      throw new Error(`SMS blocked for event "${eventId}" - only ${SMS_ALLOWED_EVENTS.join(", ")} allowed`);
    }

    console.log(`📱 [SMS] ✅ ALLOWED - Event "${eventId}" is in allowlist`);

    const phone = evt.to?.phone || ctx?.user?.phoneNumber;
    if (!phone || !tmpl.sms?.enabled) {
      console.log(`📱 [SMS] ❌ SKIPPED - Missing phone (${phone}) or template disabled (${tmpl.sms?.enabled})`);
      console.log(`📱 [SMS] ========================================`);
      throw new Error("Missing phone number or disabled SMS template");
    }

    const text = render(tmpl.sms.text || "", { ...ctx, ...evt.vars });
    console.log(`📱 [SMS] ✅ SENDING SMS to ${phone.substring(0, 6)}***`);
    console.log(`📱 [SMS]   text length: ${text.length} chars`);
    console.log(`📱 [SMS]   text preview: ${text.substring(0, 80)}...`);

    const messageId = await sendSms(phone, text);

    console.log(`📱 [SMS] ✅ SMS SENT SUCCESSFULLY`);
    console.log(`📱 [SMS]   messageId: ${messageId}`);
    console.log(`📱 [SMS] ========================================`);

    // Telegram notification for multi-provider accounts (booking_paid_provider only)
    if (eventId === "booking_paid_provider") {
      const providerId = evt.context?.user?.uid || evt.uid;
      if (providerId) {
        try {
          const parentSnap = await getDb()
            .collection("users")
            .where("linkedProviderIds", "array-contains", providerId)
            .limit(1)
            .get();

          if (!parentSnap.empty) {
            const parentData = parentSnap.docs[0].data();
            const telegramChatId = parentData.telegramChatId;
            if (telegramChatId) {
              console.log(`📱 [Telegram] Sending booking_paid notification to chat ${telegramChatId}`);
              const tgResult = await sendTelegramMessage(telegramChatId, text);
              if (tgResult.ok) {
                console.log(`📱 [Telegram] ✅ Sent successfully (messageId: ${tgResult.messageId})`);
              } else {
                console.warn(`📱 [Telegram] ⚠️ Failed: ${tgResult.error}`);
              }
            }
          }
        } catch (tgErr) {
          console.warn(`📱 [Telegram] ⚠️ Error (non-blocking):`, tgErr);
        }
      }
    }

    return { messageId };
  }

  if (channel === "push") {
    const token = ctx?.user?.fcmTokens?.[0] || evt.to?.fcmToken;
    if (!token || !tmpl.push?.enabled)
      throw new Error("Missing FCM token or disabled template");

    const title = render(tmpl.push.title || "", { ...ctx, ...evt.vars });
    const body = render(tmpl.push.body || "", { ...ctx, ...evt.vars });
    const data: Record<string, string> = tmpl.push.deeplink
      ? { deeplink: String(tmpl.push.deeplink) }
      : {};

    await sendPush(token, title, body, data);
    return { messageId: `fcm_${Date.now()}` };
  }

  if (channel === "inapp") {
    const uid = ctx?.user?.uid;
    if (!uid || !tmpl.inapp?.enabled)
      throw new Error("Missing user ID or disabled template");

    const title = render(tmpl.inapp.title || "", { ...ctx, ...evt.vars });
    const body = render(tmpl.inapp.body || "", { ...ctx, ...evt.vars });

    return await writeInApp({ uid, title, body, eventId: evt.eventId });
  }

  throw new Error(`Unknown channel: ${channel}`);
}

// ----- Journalisation des livraisons
function deliveryDocId(
  evt: MessageEvent,
  channel: Channel,
  to: string | null
): string {
  const key = evt.dedupeKey || evt.eventId || "noevent";
  const dest = (to || "none").replace(/[^\w@+]/g, "_").slice(0, 80);
  return `${key}_${channel}_${dest}`;
}

async function logDelivery(params: {
  eventId: string;
  channel: Channel;
  status: "sent" | "failed";
  provider: string;
  messageId?: string;
  sid?: string;
  error?: string;
  to?: string;
  uid?: string;
}) {
  const { eventId, channel, status, provider, messageId, sid, error, to, uid } =
    params;
  const docId = deliveryDocId({ eventId } as MessageEvent, channel, to || null);

  const data: Record<string, unknown> = {
    eventId,
    uid: uid || null,
    channel,
    provider,
    to: to || null,
    status,
    providerMessageId: messageId || sid || null,
    error: error || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (status === "sent") {
    data.sentAt = admin.firestore.FieldValue.serverTimestamp();
  } else if (status === "failed") {
    data.failedAt = admin.firestore.FieldValue.serverTimestamp();
  }

  await getDb()
    .collection("message_deliveries")
    .doc(docId)
    .set(data, { merge: true });
}

// ----- Interrupteur global
// async function isMessagingEnabled(): Promise<boolean> {
//   const snap = await db.doc("config/messaging").get();
//   return !!(snap.exists && snap.get("enabled"));
// }

// ----- Worker principal
// DEBUG VERSION: Exhaustive logging for SMS/notification debugging
export const onMessageEventCreate = onDocumentCreated(
  {
    region: "europe-west3",
    document: "message_events/{id}",
    memory: "512MiB",
    cpu: 0.083,
    timeoutSeconds: 120,
    secrets: [
      EMAIL_USER,
      EMAIL_PASS,
      // Twilio secrets - SMS only for booking_paid_provider
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_NUMBER,
      TELEGRAM_BOT_TOKEN,
    ],
  },
  async (event) => {
    const debugId = `worker_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const docId = event.params?.id || 'unknown';

    console.log(`\n`);
    console.log(`=======================================================================`);
    console.log(`📬 [NotifWorker][${debugId}] ========== MESSAGE EVENT TRIGGERED ==========`);
    console.log(`=======================================================================`);
    console.log(`📬 [${debugId}] Document ID: ${docId}`);
    console.log(`📬 [${debugId}] Timestamp: ${new Date().toISOString()}`);

    // 0) Interrupteur global
    const enabled = true;
    if (!enabled) {
      console.log("🔒 [${debugId}] Messaging disabled: ignoring event");
      return;
    }

    // 1) Récupérer l'événement
    const evt = event.data?.data() as MessageEvent | undefined;
    if (!evt) {
      console.error(`❌ [${debugId}] No event payload, abort`);
      return;
    }

    console.log(`\n📬 [${debugId}] STEP 1: Event payload analysis:`);
    console.log(`📬 [${debugId}]   eventId: ${evt.eventId}`);
    console.log(`📬 [${debugId}]   locale: ${evt.locale || 'auto'}`);
    console.log(`📬 [${debugId}]   uid: ${evt.uid || 'none'}`);
    console.log(`📬 [${debugId}]   to.email: ${evt.to?.email || 'none'}`);
    console.log(`📬 [${debugId}]   to.phone: ${evt.to?.phone ? evt.to.phone.slice(0, 8) + '...' : 'none'}`);
    console.log(`📬 [${debugId}]   channels: ${evt.channels?.join(', ') || 'auto'}`);
    console.log(`📬 [${debugId}]   context keys: ${Object.keys(evt.context || {}).join(', ') || 'none'}`);

    console.log(
      `📨 [${debugId}] Processing event: ${evt.eventId} | Locale: ${evt.locale || "auto"}`
    );

    // 2) Résolution de la langue
    console.log(`\n📬 [${debugId}] STEP 2: Language resolution...`);
    const lang = resolveLang(
      evt?.locale || evt?.context?.user?.preferredLanguage
    );
    const debugLocale = resolveLang(evt?.locale);
    const debugUserLocale = resolveLang(evt?.context?.user?.preferredLanguage);
    console.log(`🌐 [${debugId}] Detected locale from evt.locale: ${debugLocale}`);
    console.log(`🌐 [${debugId}] Detected locale from user.preferredLanguage: ${debugUserLocale}`);
    console.log(`🌐 [${debugId}] Final resolved language: ${lang}`);

    // 3) Lecture du template Firestore + fallback EN
    console.log(`\n📬 [${debugId}] STEP 3: Loading template...`);
    const canonicalId = normalizeEventId(evt.eventId);
    console.log(`📬 [${debugId}]   Original eventId: ${evt.eventId}`);
    console.log(`📬 [${debugId}]   Canonical eventId: ${canonicalId}`);

    const templates = await getTemplate(lang, canonicalId);
    if (!templates) {
      console.error(`❌ [${debugId}] CRITICAL: No template found for ${canonicalId} in language ${lang}`);
      console.error(`❌ [${debugId}] This will prevent SMS/Email from being sent!`);
      console.error(`❌ [${debugId}] Check Firestore collection: message_templates/${lang}/events/${canonicalId}`);
      return;
    }
    console.log(`✅ [${debugId}] Template loaded for ${canonicalId}`);
    console.log(`📬 [${debugId}]   Template has email: ${!!templates.email?.enabled}`);
    console.log(`📬 [${debugId}]   Template has sms: ${!!templates.sms?.enabled}`);
    console.log(`📬 [${debugId}]   Template has push: ${!!templates.push?.enabled}`);
    console.log(`📬 [${debugId}]   Template has inapp: ${!!templates.inapp?.enabled}`);
    if (templates.sms?.enabled) {
      console.log(`📬 [${debugId}]   SMS text template: ${templates.sms.text?.slice(0, 50)}...`);
    }

    // 4) Routing + rate-limit
    console.log(`\n📬 [${debugId}] STEP 4: Loading routing...`);
    const routing = await getRouting(canonicalId);
    console.log(`📬 [${debugId}]   Routing strategy: ${routing.strategy}`);
    console.log(`📬 [${debugId}]   Routing order: ${routing.order?.join(', ') || 'default'}`);
    console.log(`📬 [${debugId}]   Routing channels:`);
    Object.entries(routing.channels).forEach(([ch, cfg]) => {
      console.log(`📬 [${debugId}]     ${ch}: enabled=${cfg.enabled}, provider=${cfg.provider}, rateLimitH=${cfg.rateLimitH}`);
    });

    const uidForLimit = evt?.uid || evt?.context?.user?.uid || "unknown";

    // Vérifier rate limit global s'il existe
    const globalRateLimit = Math.max(
      ...Object.values(routing.channels).map((c) => c.rateLimitH)
    );
    if (globalRateLimit > 0) {
      const limited = await isRateLimited(
        uidForLimit,
        evt.eventId,
        globalRateLimit
      );
      if (limited) {
        console.log(`🚫 Rate-limited: ${uidForLimit} for ${evt.eventId}`);
        return;
      }
    }

    // 5) Sélection des canaux à tenter
    console.log(`\n📬 [${debugId}] STEP 5: Channel selection...`);
    const context: Context = {
      ...(evt.context ?? {}),
      locale: lang,
      to: evt.to,
    };

    // Debug: Check hasContact for each channel
    console.log(`📬 [${debugId}]   Checking contact availability per channel:`);
    console.log(`📬 [${debugId}]     email: hasContact=${hasContact('email', context)}, user.email=${context.user?.email || 'none'}, to.email=${context.to?.email || 'none'}`);
    console.log(`📬 [${debugId}]     sms: hasContact=${hasContact('sms', context)}, user.phoneNumber=${context.user?.phoneNumber || 'none'}, to.phone=${context.to?.phone ? context.to.phone.slice(0, 8) + '...' : 'none'}`);
    console.log(`📬 [${debugId}]     push: hasContact=${hasContact('push', context)}, fcmTokens=${context.user?.fcmTokens?.length || 0}`);
    console.log(`📬 [${debugId}]     inapp: hasContact=${hasContact('inapp', context)}, uid=${context.user?.uid || 'none'}`);

    const channelsToTry = channelsToAttempt(
      routing.strategy,
      routing.order,
      routing.channels,
      templates,
      { ...context, user: context.user }
    );

    console.log(
      `📋 [${debugId}] Channels to attempt: [${channelsToTry.join(", ")}] (strategy: ${routing.strategy})`
    );

    if (channelsToTry.length === 0) {
      console.error(`❌ [${debugId}] CRITICAL: No available channels for this event!`);
      console.error(`❌ [${debugId}] Possible causes:`);
      console.error(`❌ [${debugId}]   - SMS template not enabled in message_templates`);
      console.error(`❌ [${debugId}]   - SMS channel not enabled in message_routing`);
      console.error(`❌ [${debugId}]   - No phone number provided in to.phone`);
      console.error(`❌ [${debugId}]   - Event data: ${JSON.stringify(evt, null, 2)}`);
      return;
    }

    // 6) Envoi selon la stratégie
    if (routing.strategy === "parallel") {
      // Envoi en parallèle
      await Promise.all(
        channelsToTry.map(async (channel) => {
          try {
            console.log(`🚀 [${channel}] Starting parallel send...`);
            const result = await sendOne(
              channel,
              routing.channels[channel].provider,
              templates,
              context,
              evt
            );

            await logDelivery({
              eventId: evt.eventId,
              channel,
              status: "sent",
              provider: routing.channels[channel].provider,
              messageId: result?.messageId,
              sid: result?.sid,
              to: getDestinationForChannel(channel, context, evt),
              uid: uidForLimit,
            });

            console.log(`✅ [${channel}] Sent successfully`);
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Unknown error";
            console.error(`❌ [${channel}] Send failed:`, msg);
            await logDelivery({
              eventId: evt.eventId,
              channel,
              status: "failed",
              provider: routing.channels[channel].provider,
              error: msg,
              to: getDestinationForChannel(channel, context, evt),
              uid: uidForLimit,
            });
          }
        })
      );
    } else {
      // Envoi en fallback
      let success = false;
      for (const channel of channelsToTry) {
        if (success) break;

        try {
          console.log(`🚀 [${channel}] Starting fallback send...`);
          const result = await sendOne(
            channel,
            routing.channels[channel].provider,
            templates,
            context,
            evt
          );

          await logDelivery({
            eventId: evt.eventId,
            channel,
            status: "sent",
            provider: routing.channels[channel].provider,
            messageId: result?.messageId,
            sid: result?.sid,
            to: getDestinationForChannel(channel, context, evt),
            uid: uidForLimit,
          });

          console.log(
            `✅ [${channel}] Sent successfully - stopping fallback chain`
          );
          success = true;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          console.error(`❌ [${channel}] Send failed, trying next:`, msg);
          await logDelivery({
            eventId: evt.eventId,
            channel,
            status: "failed",
            provider: routing.channels[channel].provider,
            error: msg,
            to: getDestinationForChannel(channel, context, evt),
            uid: uidForLimit,
          });
        }
      }

      if (!success) {
        console.error(`💥 [${debugId}] All channels failed for fallback strategy`);
      }
    }

    console.log(`\n=======================================================================`);
    console.log(`🎉 [NotifWorker][${debugId}] ========== PROCESSING COMPLETED ==========`);
    console.log(`🎉 [${debugId}] Event: ${evt.eventId}`);
    console.log(`🎉 [${debugId}] Channels attempted: ${channelsToTry.join(', ')}`);
    console.log(`=======================================================================\n`);
  }
);

// Helper pour récupérer la destination selon le canal
function getDestinationForChannel(
  channel: Channel,
  ctx: Context,
  evt: MessageEvent
): string | undefined {
  switch (channel) {
    case "email":
      return ctx?.user?.email || evt.to?.email;
    case "sms":
      return ctx?.user?.phoneNumber || evt.to?.phone;
    case "push":
      return (
        ((ctx?.user?.fcmTokens?.[0] || evt.to?.fcmToken) ?? "").slice(0, 20) +
        "..."
      );
    case "inapp":
      return ctx?.user?.uid;
    default:
      return undefined;
  }
}

export {};
