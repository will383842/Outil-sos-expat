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
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
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
}

export type BookingCategory = 'new' | 'active' | 'history';

export const FIVE_MINUTES = 5 * 60 * 1000;
export const ONE_HOUR = 60 * 60 * 1000;

/**
 * Classify a booking into new / active / history
 * - new: pending and created < 5 minutes ago
 * - active: pending/confirmed/in_progress AND created < 1 hour ago
 * - history: completed, cancelled, OR older than 1 hour
 */
export function classifyBooking(booking: BookingRequest): BookingCategory {
  const now = Date.now();
  const age = now - booking.createdAt.getTime();

  // Completed or cancelled → always history
  if (booking.status === 'completed' || booking.status === 'cancelled') {
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
