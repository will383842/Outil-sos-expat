// src/services/booking.ts
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../config/firebase";

/**
 * Champs MINIMAUX exigés par tes rules :
 *  - clientId == auth.currentUser.uid (déduit ici)
 *  - providerId (string non vide)
 *  - serviceType (string non vide)
 *  - status == "pending"
 */
export type BookingRequestMinimal = {
  providerId: string;
  serviceType: string; // "lawyer_call" | "expat_call" | ...
  status?: "pending";
};

export type BookingRequestOptional = {
  title?: string;
  description?: string;
  clientPhone?: string;
  clientWhatsapp?: string;
  price?: number;
  duration?: number;
  clientLanguages?: string[];
  clientLanguagesDetails?: Array<{ code: string; name: string }>;
  providerName?: string;
  providerType?: string;
  providerCountry?: string;
  providerAvatar?: string;
  providerRating?: number;
  providerReviewCount?: number;
  providerLanguages?: string[];
  providerSpecialties?: string[];
  clientName?: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientNationality?: string;
  clientCurrentCountry?: string;
  ip?: string;
  userAgent?: string;
  providerEmail?: string;
  providerPhone?: string;
  // Meta tracking identifiers for CAPI deduplication
  metaEventId?: string;
  fbp?: string;
  fbc?: string;
  clientEmail?: string;
};

export type BookingRequestCreate = BookingRequestMinimal & BookingRequestOptional;

// Timeout helper pour éviter les blocages réseau
const withTimeout = <T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    ),
  ]);
};

export async function createBookingRequest(data: BookingRequestCreate) {
  const u = auth.currentUser;
  if (!u) throw new Error("SESSION_EXPIRED");

  const providerId = String(data.providerId || "").trim();
  const serviceType = String(data.serviceType || "").trim();
  if (!providerId || !serviceType) {
    throw new Error("INVALID_DATA");
  }

  // Respecte strictement tes rules : clientId = auth.uid, status = "pending"
  const payload = {
    clientId: u.uid,
    providerId,
    serviceType,
    status: "pending" as const,

    // champs optionnels tolérés par tes rules
    title: data.title ?? null,
    description: data.description ?? null,
    clientPhone: data.clientPhone ?? null,
    clientWhatsapp: data.clientWhatsapp ?? null,
    price: data.price ?? null,
    duration: data.duration ?? null,
    clientLanguages: data.clientLanguages ?? [],
    clientLanguagesDetails: data.clientLanguagesDetails ?? [],
    providerName: data.providerName ?? null,
    providerType: data.providerType ?? null,
    providerCountry: data.providerCountry ?? null,
    providerAvatar: data.providerAvatar ?? null,
    providerRating: data.providerRating ?? null,
    providerReviewCount: data.providerReviewCount ?? null,
    providerLanguages: data.providerLanguages ?? [],
    providerSpecialties: data.providerSpecialties ?? [],
    clientName: data.clientName ?? null,
    clientFirstName: data.clientFirstName ?? null,
    clientLastName: data.clientLastName ?? null,
    clientNationality: data.clientNationality ?? null,
    clientCurrentCountry: data.clientCurrentCountry ?? null,
    ip: data.ip ?? null,
    userAgent: data.userAgent ?? null,
    providerEmail: data.providerEmail ?? null,
    providerPhone: data.providerPhone ?? null,
    // Meta tracking identifiers for CAPI deduplication
    metaEventId: data.metaEventId ?? null,
    fbp: data.fbp ?? null,
    fbc: data.fbc ?? null,
    clientEmail: data.clientEmail ?? null,

    createdAt: serverTimestamp(),
  };

  // Timeout de 30 secondes pour éviter le blocage indéfini (augmenté pour connexions lentes)
  const docRef = await withTimeout(
    addDoc(collection(db, "booking_requests"), payload),
    30000,
    "NETWORK_TIMEOUT"
  );

  // AI generation is handled AFTER payment via syncCallSessionToOutil (paymentNotifications.ts)
  // No AI should be triggered at booking creation to avoid wasting API credits before payment
  console.log("[Booking] AI generation deferred to post-payment flow for provider:", providerId);

  return docRef.id;
}
