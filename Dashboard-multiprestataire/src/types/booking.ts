/**
 * Booking Request Types
 * Mirrors booking_requests Firestore collection
 */

export interface BookingRequest {
  id: string;
  providerId: string;
  providerName?: string;
  providerType?: 'lawyer' | 'expat';
  clientId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientWhatsapp?: string;
  clientCurrentCountry?: string;
  clientNationality?: string;
  clientLanguages?: string[];
  serviceType: string;
  title?: string;
  description: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
  createdAt: Date;
  updatedAt?: Date;
  aiResponse?: {
    content: string;
    generatedAt: Date;
    model: string;
    tokensUsed?: number;
    source: string;
  };
  aiProcessedAt?: Date;
  aiError?: string;
  /** Terminal state written by Outil trigger when it refuses to process the booking. */
  aiSkipped?: boolean;
  /** Classified reason (e.g. llm_quota_exceeded, no_active_subscription). */
  aiSkippedReason?: string;
}

export type BookingCategory = 'new' | 'active' | 'history';

export const FIVE_MINUTES = 5 * 60 * 1000;
export const ONE_HOUR = 60 * 60 * 1000;

/**
 * Classify a booking into new / active / history.
 *
 * Priority (first match wins):
 *   1. Terminal states ALWAYS history, regardless of age:
 *      - status in {completed, cancelled, expired}
 *      - aiSkipped === true (Outil trigger refused to process — quota, no sub, ai_disabled...)
 *      - aiError present (trigger crashed)
 *   2. age >= 1h → history (auto-expire)
 *   3. age < 5 min → new
 *   4. otherwise → active
 *
 * Why check aiSkipped/aiError: a booking whose trigger errored or skipped never
 * reaches status=completed on its own, so without this it would linger in
 * "À traiter" until it hits the 1h cutoff. The user can't actually do anything
 * with it — it belongs in history immediately so the "pending" tab reflects
 * only actionable items.
 */
export function classifyBooking(booking: BookingRequest): BookingCategory {
  const now = Date.now();
  const age = now - booking.createdAt.getTime();

  // Terminal states → always history (regardless of age)
  if (
    booking.status === 'completed' ||
    booking.status === 'cancelled' ||
    booking.status === 'expired' ||
    booking.aiSkipped === true ||
    Boolean(booking.aiError)
  ) {
    return 'history';
  }

  // Older than 1 hour → expired, move to history
  if (age >= ONE_HOUR) {
    return 'history';
  }

  // Less than 5 min → new
  if (age < FIVE_MINUTES) {
    return 'new';
  }

  // Between 5 min and 1 hour → active
  return 'active';
}
