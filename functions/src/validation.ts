/**
 * =============================================================================
 * VALIDATION SCHEMAS - Schémas Zod pour validation des données
 * =============================================================================
 *
 * Centralise tous les schémas de validation pour :
 * - Webhooks entrants
 * - Données utilisateur
 * - Messages
 * - Bookings
 *
 * =============================================================================
 */

import { z } from "zod";

// =============================================================================
// SCHÉMAS COMMUNS
// =============================================================================

/**
 * Email normalisé (lowercase, trimmed)
 * Utilise preprocess pour nettoyer avant validation
 */
export const EmailSchema = z.preprocess(
  (val) => (typeof val === "string" ? val.trim().toLowerCase() : val),
  z.string().email("Email invalide")
);

/**
 * Numéro de téléphone (format international)
 */
export const PhoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{6,14}$/, "Numéro de téléphone invalide")
  .optional()
  .or(z.literal(""));

/**
 * Pays (normalisé) - min 2 caractères si fourni
 */
export const CountrySchema = z
  .string()
  .max(100, "Nom de pays trop long")
  .transform((val) => val.trim())
  .refine((val) => val === "" || val.length >= 2, {
    message: "Pays doit avoir au moins 2 caractères",
  });

/**
 * Urgence
 */
export const UrgencySchema = z.enum(["low", "medium", "high", "urgent", "critical"]).default("medium");

/**
 * Type de prestataire
 */
export const ProviderTypeSchema = z.enum(["lawyer", "expat"]);

/**
 * Statut de booking
 */
export const BookingStatusSchema = z.enum([
  "pending",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
  "archived",
]);

// =============================================================================
// SCHÉMA: INGEST BOOKING (webhook depuis Laravel)
// =============================================================================

export const IngestBookingSchema = z.object({
  // Informations client (au moins un identifiant requis)
  clientFirstName: z.string().max(100).optional().default(""),
  clientLastName: z.string().max(100).optional().default(""),
  clientEmail: EmailSchema.optional(),
  clientPhone: PhoneSchema,
  clientWhatsapp: PhoneSchema,
  clientCurrentCountry: CountrySchema.optional().default(""),
  clientNationality: z.string().max(100).optional().default(""),
  clientLanguages: z.array(z.string()).optional().default([]),

  // Informations demande
  title: z.string().min(3, "Titre trop court").max(500, "Titre trop long"),
  description: z.string().max(10000, "Description trop longue").optional().default(""),
  serviceType: z.string().max(100).optional().default("consultation"),
  urgency: UrgencySchema,
  priority: UrgencySchema.optional(),
  category: z.string().max(100).optional(),

  // Prestataire assigné (optionnel)
  providerId: z.string().max(100).optional().nullable(),
  providerType: ProviderTypeSchema.optional().nullable(),
  providerName: z.string().max(200).optional().nullable(),
  providerCountry: z.string().max(100).optional().nullable(),

  // Métadonnées
  source: z.string().max(100).optional().default("sos-expat"),
  externalId: z.string().max(200).optional().nullable(),
  metadata: z.record(z.any()).optional().default({}),

  // Abonnement (pour vérification)
  subscriptionStatus: z.string().optional(),
  userId: z.string().optional(),
}).refine(
  (data) => data.clientFirstName || data.clientLastName || data.clientEmail,
  {
    message: "Au moins un identifiant client requis (nom, prénom ou email)",
  }
);

export type IngestBookingPayload = z.infer<typeof IngestBookingSchema>;

// =============================================================================
// SCHÉMA: MESSAGE
// =============================================================================

export const MessageSchema = z.object({
  content: z.string().min(1, "Message vide").max(50000, "Message trop long"),
  conversationId: z.string().optional(),
  bookingId: z.string().optional(),
  role: z.enum(["user", "assistant", "system", "provider"]).default("user"),
  source: z.enum(["user", "api", "gpt", "system", "webhook"]).default("user"),
  metadata: z.record(z.any()).optional(),
});

export type MessagePayload = z.infer<typeof MessageSchema>;

// =============================================================================
// SCHÉMA: AI CHAT (endpoint /aiChat)
// =============================================================================

export const AIChatSchema = z.object({
  message: z.string().min(1, "Message requis").max(10000, "Message trop long"),
  conversationId: z.string().optional(),
  bookingContext: z.object({
    clientCurrentCountry: z.string().optional(),
    clientNationality: z.string().optional(),
    providerType: ProviderTypeSchema.optional(),
    title: z.string().optional(),
    description: z.string().optional(),
  }).optional(),
});

export type AIChatPayload = z.infer<typeof AIChatSchema>;

// =============================================================================
// SCHÉMA: SYNC PROVIDER (webhook depuis Laravel)
// =============================================================================

export const SyncProviderSchema = z.object({
  externalId: z.string().min(1, "externalId requis"),
  email: EmailSchema,
  name: z.string().min(1, "Nom requis").max(200),
  type: ProviderTypeSchema,
  phone: PhoneSchema,
  country: CountrySchema.optional(),
  specialties: z.array(z.string()).optional().default([]),
  languages: z.array(z.string()).optional().default(["fr"]),
  active: z.boolean().default(true),
  bio: z.string().max(2000).optional(),
  avatarUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional().default({}),
});

export type SyncProviderPayload = z.infer<typeof SyncProviderSchema>;

// =============================================================================
// SCHÉMA: UPDATE BOOKING STATUS (webhook depuis Laravel)
// =============================================================================

export const UpdateBookingStatusSchema = z.object({
  bookingId: z.string().min(1, "bookingId requis").max(200, "bookingId trop long"),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"], {
    errorMap: () => ({ message: "Statut invalide. Valeurs acceptées: pending, in_progress, completed, cancelled" }),
  }),
  endedAt: z.string().datetime({ message: "endedAt doit être une date ISO 8601 valide" }).optional(),
  duration: z
    .number()
    .min(0, "duration ne peut pas être négative")
    .max(86400, "duration ne peut pas dépasser 24h (86400 secondes)")
    .optional(),
  notes: z.string().max(5000, "notes trop longues (max 5000 caractères)").optional(),
  cancelReason: z.string().max(500, "cancelReason trop long (max 500 caractères)").optional(),
});

export type UpdateBookingStatusPayload = z.infer<typeof UpdateBookingStatusSchema>;

// =============================================================================
// SCHÉMA: SET ROLE (admin endpoint)
// =============================================================================

export const SetRoleSchema = z.object({
  uid: z.string().min(1, "UID requis"),
  role: z.enum(["admin", "superadmin", "provider", "agent", "user"]),
});

export type SetRolePayload = z.infer<typeof SetRoleSchema>;

// =============================================================================
// SCHÉMA: USER UPDATE
// =============================================================================

export const UserUpdateSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  phone: PhoneSchema,
  timezone: z.string().max(50).optional(),
  language: z.enum(["fr", "en", "es", "de", "it", "pt"]).optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    sms: z.boolean().optional(),
  }).optional(),
});

export type UserUpdatePayload = z.infer<typeof UserUpdateSchema>;

// =============================================================================
// SCHÉMA: AI SETTINGS (configuration IA)
// =============================================================================

export const AISettingsSchema = z.object({
  enabled: z.boolean().default(true),
  replyOnBookingCreated: z.boolean().default(true),
  replyOnUserMessage: z.boolean().default(true),

  // Modèles
  model: z.enum(["gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"]).default("gpt-4o"),
  perplexityModel: z.enum(["sonar-pro", "sonar", "sonar-small"]).default("sonar-pro"),

  // Paramètres
  temperature: z.number().min(0).max(1).default(0.3),
  perplexityTemperature: z.number().min(0).max(1).default(0.2),
  maxOutputTokens: z.number().min(100).max(8000).default(3000),

  // Prompts personnalisés
  lawyerSystemPrompt: z.string().max(20000).optional(),
  expertSystemPrompt: z.string().max(20000).optional(),

  // Features
  usePerplexityForFactual: z.boolean().default(true),
});

export type AISettingsPayload = z.infer<typeof AISettingsSchema>;

// =============================================================================
// HELPERS DE VALIDATION
// =============================================================================

/**
 * Valide un payload et retourne le résultat typé ou les erreurs
 */
export function validatePayload<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Formatte les erreurs Zod pour réponse API
 */
export function formatZodErrors(error: z.ZodError): {
  message: string;
  fields: Record<string, string[]>;
} {
  const fields: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_root";
    if (!fields[path]) {
      fields[path] = [];
    }
    fields[path].push(issue.message);
  }

  return {
    message: error.issues.map((i) => i.message).join(", "),
    fields,
  };
}

/**
 * Middleware de validation pour Cloud Functions
 */
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    const result = schema.safeParse(data);
    if (!result.success) {
      const formatted = formatZodErrors(result.error);
      throw new ValidationError(formatted.message, formatted.fields);
    }
    return result.data;
  };
}

/**
 * Erreur de validation personnalisée
 */
export class ValidationError extends Error {
  public fields: Record<string, string[]>;
  public statusCode = 400;

  constructor(message: string, fields: Record<string, string[]>) {
    super(message);
    this.name = "ValidationError";
    this.fields = fields;
  }
}

// =============================================================================
// SANITIZERS
// =============================================================================

/**
 * Nettoie une chaîne pour éviter les injections XSS basiques
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .trim();
}

/**
 * Nettoie un objet de métadonnées
 */
export function sanitizeMetadata(
  metadata: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    // Ignorer les clés dangereuses
    if (key.startsWith("__") || key.startsWith("$")) {
      continue;
    }

    // Nettoyer les valeurs string
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === "number" || typeof value === "boolean") {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((v) =>
        typeof v === "string" ? sanitizeString(v) : v
      );
    }
    // Ignorer les objets imbriqués pour éviter les attaques complexes
  }

  return sanitized;
}
