import { createHash } from "crypto";

/**
 * Forward an event to the Telegram Engine for drip campaign / automation processing.
 * Fire-and-forget: never throws, logs errors silently.
 * Includes idempotency key to prevent duplicate processing on retries.
 */
export async function forwardEventToEngine(
  eventType: string,
  sosUserId: string | undefined,
  payload: Record<string, unknown>
): Promise<void> {
  const engineUrl = process.env.TELEGRAM_ENGINE_URL;
  const apiKey = process.env.TELEGRAM_ENGINE_API_KEY;

  if (!engineUrl || !apiKey) {
    // Silently skip if not configured (allows gradual rollout)
    return;
  }

  // Generate idempotency key from event data + timestamp (minute-level granularity)
  const minuteKey = Math.floor(Date.now() / 60_000);
  const idempotencyKey = createHash("sha256")
    .update(`${eventType}:${sosUserId ?? ""}:${minuteKey}:${JSON.stringify(payload)}`)
    .digest("hex");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    await fetch(`${engineUrl}/api/webhooks/event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({ eventType, sosUserId, payload, idempotencyKey }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
  } catch (error) {
    // Fire-and-forget: log but never throw
    console.error(
      `[forwardToEngine] Failed to forward ${eventType} event:`,
      error instanceof Error ? error.message : error
    );
  }
}
