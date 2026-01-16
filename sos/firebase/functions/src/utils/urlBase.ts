// firebase/functions/src/utils/urlBase.ts
import { defineString } from "firebase-functions/params";

const CLOUD_TASKS_LOCATION = defineString("CLOUD_TASKS_LOCATION", { default: "europe-west1" });
const FUNCTIONS_BASE_URL_PARAM = defineString("FUNCTIONS_BASE_URL");

// P0 CRITICAL FIX: Firebase Functions v2 uses Cloud Run with individual URLs per function
// These URLs are DIFFERENT from the cloudfunctions.net format
const TWILIO_CALL_WEBHOOK_URL_PARAM = defineString("TWILIO_CALL_WEBHOOK_URL");
const TWILIO_CONFERENCE_WEBHOOK_URL_PARAM = defineString("TWILIO_CONFERENCE_WEBHOOK_URL");
const PROVIDER_NO_ANSWER_TWIML_URL_PARAM = defineString("PROVIDER_NO_ANSWER_TWIML_URL");
const TWILIO_AMD_TWIML_URL_PARAM = defineString("TWILIO_AMD_TWIML_URL");
const TWILIO_GATHER_RESPONSE_URL_PARAM = defineString("TWILIO_GATHER_RESPONSE_URL");

function getProjectId(): string {
  return (
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    "unknown-project"
  );
}

export function getFunctionsBaseUrl(): string {
  const fromParam = (FUNCTIONS_BASE_URL_PARAM.value() || "").trim();
  if (fromParam) return fromParam.replace(/\/$/, "");

  const fromEnv = (process.env.FUNCTIONS_BASE_URL || "").trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const region = CLOUD_TASKS_LOCATION.value() || "europe-west1";
  const projectId = getProjectId();
  return `https://${region}-${projectId}.cloudfunctions.net`;
}

/**
 * P0 CRITICAL FIX: Get the correct Cloud Run URL for twilioCallWebhook
 * Firebase Functions v2 uses Cloud Run URLs, NOT cloudfunctions.net URLs
 *
 * Format: https://functionname-projectnumber.region.run.app
 * Example: https://twiliocallwebhook-268195823113.europe-west1.run.app
 */
export function getTwilioCallWebhookUrl(): string {
  // 1. Try defineString param first (Firebase v2 recommended)
  try {
    const fromParam = (TWILIO_CALL_WEBHOOK_URL_PARAM.value() || "").trim();
    if (fromParam) {
      console.log(`🔗 [urlBase] TWILIO_CALL_WEBHOOK_URL from Firebase param: ${fromParam}`);
      return fromParam;
    }
  } catch {
    // defineString not available
  }

  // 2. Try process.env
  const fromEnv = (process.env.TWILIO_CALL_WEBHOOK_URL || "").trim();
  if (fromEnv) {
    console.log(`🔗 [urlBase] TWILIO_CALL_WEBHOOK_URL from process.env: ${fromEnv}`);
    return fromEnv;
  }

  // 3. Fallback to legacy format (WARNING: may not work with Firebase v2!)
  const base = getFunctionsBaseUrl();
  const fallbackUrl = `${base}/twilioCallWebhook`;
  console.warn(`⚠️ [urlBase] TWILIO_CALL_WEBHOOK_URL not set! Using legacy fallback: ${fallbackUrl}`);
  console.warn(`⚠️ [urlBase] This may NOT work with Firebase Functions v2 (Cloud Run)!`);
  return fallbackUrl;
}

/**
 * P0 CRITICAL FIX: Get the correct Cloud Run URL for twilioConferenceWebhook
 * Firebase Functions v2 uses Cloud Run URLs, NOT cloudfunctions.net URLs
 *
 * Format: https://functionname-projectnumber.region.run.app
 * Example: https://twilioconferencewebhook-268195823113.europe-west1.run.app
 */
export function getTwilioConferenceWebhookUrl(): string {
  // 1. Try defineString param first (Firebase v2 recommended)
  try {
    const fromParam = (TWILIO_CONFERENCE_WEBHOOK_URL_PARAM.value() || "").trim();
    if (fromParam) {
      console.log(`🔗 [urlBase] TWILIO_CONFERENCE_WEBHOOK_URL from Firebase param: ${fromParam}`);
      return fromParam;
    }
  } catch {
    // defineString not available
  }

  // 2. Try process.env
  const fromEnv = (process.env.TWILIO_CONFERENCE_WEBHOOK_URL || "").trim();
  if (fromEnv) {
    console.log(`🔗 [urlBase] TWILIO_CONFERENCE_WEBHOOK_URL from process.env: ${fromEnv}`);
    return fromEnv;
  }

  // 3. Fallback to legacy format (WARNING: may not work with Firebase v2!)
  const base = getFunctionsBaseUrl();
  const fallbackUrl = `${base}/twilioConferenceWebhook`;
  console.warn(`⚠️ [urlBase] TWILIO_CONFERENCE_WEBHOOK_URL not set! Using legacy fallback: ${fallbackUrl}`);
  console.warn(`⚠️ [urlBase] This may NOT work with Firebase Functions v2 (Cloud Run)!`);
  return fallbackUrl;
}

/**
 * P0 CRITICAL FIX: Get the correct Cloud Run URL for providerNoAnswerTwiML
 * This is the TwiML endpoint that plays a message and hangs up when provider doesn't answer
 *
 * Format: https://functionname-projectnumber.region.run.app
 * Example: https://providernoanswertwiml-5tfnuxa2hq-ew.a.run.app
 */
export function getProviderNoAnswerTwiMLUrl(): string {
  // 1. Try defineString param first (Firebase v2 recommended)
  try {
    const fromParam = (PROVIDER_NO_ANSWER_TWIML_URL_PARAM.value() || "").trim();
    if (fromParam) {
      console.log(`🔗 [urlBase] PROVIDER_NO_ANSWER_TWIML_URL from Firebase param: ${fromParam}`);
      return fromParam;
    }
  } catch {
    // defineString not available
  }

  // 2. Try process.env
  const fromEnv = (process.env.PROVIDER_NO_ANSWER_TWIML_URL || "").trim();
  if (fromEnv) {
    console.log(`🔗 [urlBase] PROVIDER_NO_ANSWER_TWIML_URL from process.env: ${fromEnv}`);
    return fromEnv;
  }

  // 3. Fallback to legacy format (WARNING: may not work with Firebase v2!)
  const base = getFunctionsBaseUrl();
  const fallbackUrl = `${base}/providerNoAnswerTwiML`;
  console.warn(`⚠️ [urlBase] PROVIDER_NO_ANSWER_TWIML_URL not set! Using legacy fallback: ${fallbackUrl}`);
  console.warn(`⚠️ [urlBase] This may NOT work with Firebase Functions v2 (Cloud Run)!`);
  return fallbackUrl;
}

/**
 * P0 CRITICAL FIX: Get the correct Cloud Run URL for twilioAmdTwiml
 * This endpoint returns TwiML AFTER checking AMD result (human vs machine).
 * Using this prevents voicemail from recording our conference message.
 *
 * Format: https://functionname-projectnumber.region.run.app
 * Example: https://twilioamdtwiml-5tfnuxa2hq-ew.a.run.app
 */
export function getTwilioAmdTwimlUrl(): string {
  // 1. Try defineString param first (Firebase v2 recommended)
  try {
    const fromParam = (TWILIO_AMD_TWIML_URL_PARAM.value() || "").trim();
    if (fromParam) {
      console.log(`🔗 [urlBase] TWILIO_AMD_TWIML_URL from Firebase param: ${fromParam}`);
      return fromParam;
    }
  } catch {
    // defineString not available
  }

  // 2. Try process.env
  const fromEnv = (process.env.TWILIO_AMD_TWIML_URL || "").trim();
  if (fromEnv) {
    console.log(`🔗 [urlBase] TWILIO_AMD_TWIML_URL from process.env: ${fromEnv}`);
    return fromEnv;
  }

  // 3. Fallback to legacy format (WARNING: may not work with Firebase v2!)
  const base = getFunctionsBaseUrl();
  const fallbackUrl = `${base}/twilioAmdTwiml`;
  console.warn(`⚠️ [urlBase] TWILIO_AMD_TWIML_URL not set! Using legacy fallback: ${fallbackUrl}`);
  console.warn(`⚠️ [urlBase] This may NOT work with Firebase Functions v2 (Cloud Run)!`);
  return fallbackUrl;
}

/**
 * Get the correct Cloud Run URL for twilioGatherResponse
 * This endpoint handles the response from the provider's confirmation (press 1 or say YES)
 *
 * Format: https://functionname-projectnumber.region.run.app
 * Example: https://twiliogatherresponse-5tfnuxa2hq-ew.a.run.app
 */
export function getTwilioGatherResponseUrl(): string {
  // 1. Try defineString param first (Firebase v2 recommended)
  try {
    const fromParam = (TWILIO_GATHER_RESPONSE_URL_PARAM.value() || "").trim();
    if (fromParam) {
      console.log(`🔗 [urlBase] TWILIO_GATHER_RESPONSE_URL from Firebase param: ${fromParam}`);
      return fromParam;
    }
  } catch {
    // defineString not available
  }

  // 2. Try process.env
  const fromEnv = (process.env.TWILIO_GATHER_RESPONSE_URL || "").trim();
  if (fromEnv) {
    console.log(`🔗 [urlBase] TWILIO_GATHER_RESPONSE_URL from process.env: ${fromEnv}`);
    return fromEnv;
  }

  // 3. Fallback to legacy format (WARNING: may not work with Firebase v2!)
  const base = getFunctionsBaseUrl();
  const fallbackUrl = `${base}/twilioGatherResponse`;
  console.warn(`⚠️ [urlBase] TWILIO_GATHER_RESPONSE_URL not set! Using legacy fallback: ${fallbackUrl}`);
  console.warn(`⚠️ [urlBase] This may NOT work with Firebase Functions v2 (Cloud Run)!`);
  return fallbackUrl;
}
