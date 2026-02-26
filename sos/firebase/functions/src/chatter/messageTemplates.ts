/**
 * Chatter Message Templates
 *
 * Firestore collection structure and seed data for team message templates.
 * These templates help chatters communicate effectively with their team members.
 *
 * Collection: chatterMessageTemplates
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as functionsV1 from "firebase-functions/v1";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { ALLOWED_ORIGINS } from "../lib/functionConfigs";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Message template categories
 */
export type MessageTemplateCategory =
  | "reactivate"   // For inactive members
  | "motivate"     // For slowing members
  | "congratulate" // For top performers
  | "help";        // For beginners

/**
 * Message template document
 * Collection: chatterMessageTemplates/{templateId}
 */
export interface MessageTemplate {
  /** Document ID */
  id: string;

  /** Template category */
  category: MessageTemplateCategory;

  /** Template title (short description) */
  title: string;

  /** Message content with {name} placeholder */
  message: string;

  /** Emoji associated with this template */
  emoji: string;

  /** Display order within category */
  order: number;

  /** Whether template is active */
  isActive: boolean;

  /** Created timestamp */
  createdAt: Timestamp;

  /** Updated timestamp */
  updatedAt: Timestamp;

  /** Created by (admin ID) */
  createdBy?: string;
}

/**
 * Input for creating/updating a message template
 */
export interface MessageTemplateInput {
  category: MessageTemplateCategory;
  title: string;
  message: string;
  emoji: string;
  order?: number;
}

// ============================================================================
// DEFAULT TEMPLATES (French)
// ============================================================================

/**
 * Default message templates in French
 */
export const DEFAULT_MESSAGE_TEMPLATES: Omit<MessageTemplate, "id" | "createdAt" | "updatedAt" | "createdBy" | "isActive">[] = [
  // ============================================================================
  // REACTIVATE - For inactive members
  // ============================================================================
  {
    category: "reactivate",
    title: "Check-in amical",
    message: "Salut {name} ! Ca fait un moment, tout va bien ? Si tu as besoin d'aide ou de conseils, je suis la ! Ensemble on peut atteindre nos objectifs",
    emoji: "waving_hand",
    order: 1,
  },
  {
    category: "reactivate",
    title: "Motivation gains faciles",
    message: "Hey {name} ! Tu sais qu'avec juste 2 appels par semaine, tu pourrais gagner 80$/mois facile ? Je t'envoie mes meilleures astuces si tu veux !",
    emoji: "money_bag",
    order: 2,
  },
  {
    category: "reactivate",
    title: "Prise de nouvelles",
    message: "Coucou {name} ! J'ai remarque que tu n'as pas ete actif ces derniers temps. Tout va bien ? Je suis la si tu as des questions",
    emoji: "handshake",
    order: 3,
  },

  // ============================================================================
  // MOTIVATE - For slowing members
  // ============================================================================
  {
    category: "motivate",
    title: "Encouragement + tips",
    message: "Hey {name} ! J'ai vu que tu as un peu ralenti. Pas de souci, ca arrive ! Tu veux qu'on en parle ? J'ai quelques tips qui pourraient t'aider",
    emoji: "rocket",
    order: 1,
  },
  {
    category: "motivate",
    title: "Rappel du bon chemin",
    message: "{name}, tu etais super lance ! Continue comme ca, tu es sur la bonne voie. Besoin d'un coup de pouce ?",
    emoji: "muscle",
    order: 2,
  },

  // ============================================================================
  // CONGRATULATE - For top performers
  // ============================================================================
  {
    category: "congratulate",
    title: "Meilleur equipier",
    message: "Bravo {name} ! Tu es ma meilleure equipiere ce mois ! Continue comme ca, le Top 10 est a portee",
    emoji: "party_popper",
    order: 1,
  },
  {
    category: "congratulate",
    title: "Suggestion recrutement",
    message: "{name}, tu assures ! Tu as pense a recruter des equipiers ? Avec ton energie, tu pourrais facilement doubler tes revenus !",
    emoji: "muscle",
    order: 2,
  },
  {
    category: "congratulate",
    title: "Star de l'equipe",
    message: "Felicitations {name} ! Tes resultats sont impressionnants. Tu es une vraie star de l'equipe !",
    emoji: "trophy",
    order: 3,
  },

  // ============================================================================
  // HELP - For beginners
  // ============================================================================
  {
    category: "help",
    title: "Premiers appels",
    message: "Felicitations pour tes premiers appels {name} ! C'est le plus dur qui est fait. Tu veux que je te partage mes groupes Facebook ou je trouve facilement des gens a aider ?",
    emoji: "party_popper",
    order: 1,
  },
  {
    category: "help",
    title: "Astuce timing",
    message: "Hey {name} ! Tu savais que les lundis et mardis c'est les meilleurs jours pour trouver des gens a aider ? Ils postent tous leurs problemes du weekend. Essaie demain !",
    emoji: "calendar",
    order: 2,
  },
  {
    category: "help",
    title: "Bienvenue",
    message: "Bienvenue dans l'equipe {name} ! N'hesite pas a me contacter si tu as des questions. On est la pour s'entraider !",
    emoji: "waving_hand",
    order: 3,
  },
];

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Get all message templates, optionally filtered by category
 */
export async function getMessageTemplates(
  category?: MessageTemplateCategory
): Promise<MessageTemplate[]> {
  const db = getFirestore();
  let query = db
    .collection("chatterMessageTemplates")
    .where("isActive", "==", true)
    .orderBy("order", "asc");

  if (category) {
    query = db
      .collection("chatterMessageTemplates")
      .where("category", "==", category)
      .where("isActive", "==", true)
      .orderBy("order", "asc");
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => doc.data() as MessageTemplate);
}

/**
 * Get message templates grouped by category
 */
export async function getMessageTemplatesGrouped(): Promise<
  Record<MessageTemplateCategory, MessageTemplate[]>
> {
  const templates = await getMessageTemplates();

  const grouped: Record<MessageTemplateCategory, MessageTemplate[]> = {
    reactivate: [],
    motivate: [],
    congratulate: [],
    help: [],
  };

  for (const template of templates) {
    grouped[template.category].push(template);
  }

  return grouped;
}

/**
 * Get a single message template by ID
 */
export async function getMessageTemplateById(
  templateId: string
): Promise<MessageTemplate | null> {
  const db = getFirestore();
  const doc = await db.collection("chatterMessageTemplates").doc(templateId).get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as MessageTemplate;
}

/**
 * Create a new message template
 */
export async function createMessageTemplate(
  input: MessageTemplateInput,
  createdBy: string
): Promise<MessageTemplate> {
  const db = getFirestore();
  const docRef = db.collection("chatterMessageTemplates").doc();
  const now = Timestamp.now();

  // Get max order for category if not provided
  let order = input.order;
  if (order === undefined) {
    const existingTemplates = await db
      .collection("chatterMessageTemplates")
      .where("category", "==", input.category)
      .orderBy("order", "desc")
      .limit(1)
      .get();

    order = existingTemplates.empty
      ? 1
      : (existingTemplates.docs[0].data().order as number) + 1;
  }

  const template: MessageTemplate = {
    id: docRef.id,
    category: input.category,
    title: input.title,
    message: input.message,
    emoji: input.emoji,
    order,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    createdBy,
  };

  await docRef.set(template);
  return template;
}

/**
 * Update an existing message template
 */
export async function updateMessageTemplate(
  templateId: string,
  input: Partial<MessageTemplateInput>,
  _updatedBy: string
): Promise<MessageTemplate | null> {
  const db = getFirestore();
  const docRef = db.collection("chatterMessageTemplates").doc(templateId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return null;
  }

  const updates: Partial<MessageTemplate> = {
    ...input,
    updatedAt: Timestamp.now(),
  };

  await docRef.update(updates);

  const updated = await docRef.get();
  return updated.data() as MessageTemplate;
}

/**
 * Delete (soft delete) a message template
 */
export async function deleteMessageTemplate(templateId: string): Promise<boolean> {
  const db = getFirestore();
  const docRef = db.collection("chatterMessageTemplates").doc(templateId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return false;
  }

  await docRef.update({
    isActive: false,
    updatedAt: Timestamp.now(),
  });

  return true;
}

/**
 * Permanently delete a message template
 */
export async function hardDeleteMessageTemplate(templateId: string): Promise<boolean> {
  const db = getFirestore();
  const docRef = db.collection("chatterMessageTemplates").doc(templateId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return false;
  }

  await docRef.delete();
  return true;
}

// ============================================================================
// SEED FUNCTION
// ============================================================================

/**
 * Seed default message templates
 * Only creates templates that don't already exist (by title + category)
 */
export async function seedMessageTemplates(
  createdBy: string = "system"
): Promise<{ success: boolean; templatesCreated: number; errors: string[] }> {
  const db = getFirestore();
  const errors: string[] = [];
  let templatesCreated = 0;

  for (const templateData of DEFAULT_MESSAGE_TEMPLATES) {
    try {
      // Check if template with same title and category already exists
      const existingQuery = await db
        .collection("chatterMessageTemplates")
        .where("title", "==", templateData.title)
        .where("category", "==", templateData.category)
        .limit(1)
        .get();

      if (!existingQuery.empty) {
        console.log(
          `Template "${templateData.title}" (${templateData.category}) already exists, skipping...`
        );
        continue;
      }

      // Create new template
      const docRef = db.collection("chatterMessageTemplates").doc();
      const now = Timestamp.now();

      const template: MessageTemplate = {
        id: docRef.id,
        ...templateData,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        createdBy,
      };

      await docRef.set(template);
      templatesCreated++;
      console.log(`Created template: ${templateData.title} (${templateData.category})`);
    } catch (error) {
      const errorMsg = `Failed to create template "${templateData.title}": ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  return {
    success: errors.length === 0,
    templatesCreated,
    errors,
  };
}

/**
 * Reset all message templates to defaults
 * WARNING: This will delete all existing templates!
 */
export async function resetMessageTemplatesToDefaults(
  createdBy: string = "system"
): Promise<{ success: boolean; templatesDeleted: number; templatesCreated: number; errors: string[] }> {
  const db = getFirestore();
  const errors: string[] = [];
  let templatesDeleted = 0;

  // Delete all existing templates
  const existingTemplates = await db.collection("chatterMessageTemplates").get();
  for (const doc of existingTemplates.docs) {
    try {
      await doc.ref.delete();
      templatesDeleted++;
    } catch (error) {
      const errorMsg = `Failed to delete template ${doc.id}: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  // Seed defaults
  const seedResult = await seedMessageTemplates(createdBy);

  return {
    success: errors.length === 0 && seedResult.success,
    templatesDeleted,
    templatesCreated: seedResult.templatesCreated,
    errors: [...errors, ...seedResult.errors],
  };
}

// ============================================================================
// CLOUD FUNCTIONS
// ============================================================================

/**
 * Callable function to get message templates
 */
export const getChatterMessageTemplates = onCall(
  {
    cors: ALLOWED_ORIGINS,
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
  },
  async (request) => {
    // Verify user is authenticated
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { category } = request.data as { category?: MessageTemplateCategory };

    try {
      if (category) {
        return await getMessageTemplates(category);
      }
      return await getMessageTemplatesGrouped();
    } catch (error) {
      console.error("Error getting message templates:", error);
      throw new HttpsError("internal", "Failed to get message templates");
    }
  }
);

/**
 * Callable function for admin to seed default templates
 */
export const adminSeedMessageTemplates = onCall(
  {
    cors: ALLOWED_ORIGINS,
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
  },
  async (request) => {
    // Verify user is authenticated and is admin
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Check admin role
    const customClaims = request.auth.token;
    if (!customClaims.admin && !customClaims.superadmin) {
      throw new HttpsError(
        "permission-denied",
        "Only admins can seed message templates"
      );
    }

    try {
      const result = await seedMessageTemplates(request.auth.uid);
      return result;
    } catch (error) {
      console.error("Error seeding message templates:", error);
      throw new HttpsError("internal", "Failed to seed message templates");
    }
  }
);

/**
 * Callable function for admin to create a message template
 */
export const adminCreateMessageTemplate = onCall(
  {
    cors: ALLOWED_ORIGINS,
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
  },
  async (request) => {
    // Verify user is authenticated and is admin
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Check admin role
    const customClaims = request.auth.token;
    if (!customClaims.admin && !customClaims.superadmin) {
      throw new HttpsError(
        "permission-denied",
        "Only admins can create message templates"
      );
    }

    const input = request.data as MessageTemplateInput;

    // Validate input
    if (!input.category || !input.title || !input.message || !input.emoji) {
      throw new HttpsError(
        "invalid-argument",
        "Missing required fields: category, title, message, emoji"
      );
    }

    if (!["reactivate", "motivate", "congratulate", "help"].includes(input.category)) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid category. Must be: reactivate, motivate, congratulate, or help"
      );
    }

    try {
      const template = await createMessageTemplate(input, request.auth.uid);
      return { success: true, template };
    } catch (error) {
      console.error("Error creating message template:", error);
      throw new HttpsError("internal", "Failed to create message template");
    }
  }
);

/**
 * Callable function for admin to update a message template
 */
export const adminUpdateMessageTemplate = onCall(
  {
    cors: ALLOWED_ORIGINS,
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
  },
  async (request) => {
    // Verify user is authenticated and is admin
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Check admin role
    const customClaims = request.auth.token;
    if (!customClaims.admin && !customClaims.superadmin) {
      throw new HttpsError(
        "permission-denied",
        "Only admins can update message templates"
      );
    }

    const { templateId, ...input } = request.data as { templateId: string } & Partial<MessageTemplateInput>;

    if (!templateId) {
      throw new HttpsError("invalid-argument", "templateId is required");
    }

    if (input.category && !["reactivate", "motivate", "congratulate", "help"].includes(input.category)) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid category. Must be: reactivate, motivate, congratulate, or help"
      );
    }

    try {
      const template = await updateMessageTemplate(templateId, input, request.auth.uid);
      if (!template) {
        throw new HttpsError("not-found", "Template not found");
      }
      return { success: true, template };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error("Error updating message template:", error);
      throw new HttpsError("internal", "Failed to update message template");
    }
  }
);

/**
 * Callable function for admin to delete a message template
 */
export const adminDeleteMessageTemplate = onCall(
  {
    cors: ALLOWED_ORIGINS,
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
  },
  async (request) => {
    // Verify user is authenticated and is admin
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Check admin role
    const customClaims = request.auth.token;
    if (!customClaims.admin && !customClaims.superadmin) {
      throw new HttpsError(
        "permission-denied",
        "Only admins can delete message templates"
      );
    }

    const { templateId, hard } = request.data as { templateId: string; hard?: boolean };

    if (!templateId) {
      throw new HttpsError("invalid-argument", "templateId is required");
    }

    try {
      const deleted = hard
        ? await hardDeleteMessageTemplate(templateId)
        : await deleteMessageTemplate(templateId);

      if (!deleted) {
        throw new HttpsError("not-found", "Template not found");
      }

      return { success: true, deleted: templateId };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error("Error deleting message template:", error);
      throw new HttpsError("internal", "Failed to delete message template");
    }
  }
);

/**
 * Callable function for admin to reset templates to defaults
 */
export const adminResetMessageTemplatesToDefaults = onCall(
  {
    cors: ALLOWED_ORIGINS,
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
  },
  async (request) => {
    // Verify user is authenticated and is admin
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Check superadmin role (this is a destructive action)
    const customClaims = request.auth.token;
    if (!customClaims.superadmin) {
      throw new HttpsError(
        "permission-denied",
        "Only superadmins can reset message templates"
      );
    }

    try {
      const result = await resetMessageTemplatesToDefaults(request.auth.uid);
      return result;
    } catch (error) {
      console.error("Error resetting message templates:", error);
      throw new HttpsError("internal", "Failed to reset message templates");
    }
  }
);

// ============================================================================
// INITIALIZATION FUNCTION (for deploy)
// ============================================================================

/**
 * HTTP function to initialize message templates on deploy
 * Can be called manually or as part of deployment scripts
 */
export const initializeMessageTemplates = functionsV1
  .region("europe-west1")
  .runWith({ memory: "256MB" })
  .https.onRequest(async (req, res) => {
    // Only allow POST requests
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    // Verify admin secret (should be set in environment)
    const adminSecret = process.env.ADMIN_INIT_SECRET;
    const providedSecret = req.headers["x-admin-secret"];

    if (adminSecret && providedSecret !== adminSecret) {
      res.status(403).send("Forbidden");
      return;
    }

    try {
      const result = await seedMessageTemplates("system-init");
      res.json(result);
    } catch (error) {
      console.error("Error initializing message templates:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });
