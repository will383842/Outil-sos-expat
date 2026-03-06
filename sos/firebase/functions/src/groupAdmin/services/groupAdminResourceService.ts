/**
 * GroupAdmin Resource Service
 *
 * Handles resource management and seeding.
 */

import { getFirestore, Timestamp, Firestore } from "firebase-admin/firestore";
import { getApps, initializeApp } from "firebase-admin/app";
import { logger } from "firebase-functions/v2";

import {
  GroupAdminResource,
  GroupAdminPost,
} from "../types";

// Lazy Firestore initialization
let _db: Firestore | null = null;
function getDb(): Firestore {
  if (!getApps().length) {
    initializeApp();
  }
  if (!_db) {
    _db = getFirestore();
  }
  return _db;
}

/**
 * Seed default resources for GroupAdmins
 */
export async function seedDefaultResources(): Promise<void> {
  const resources: Omit<GroupAdminResource, "id" | "downloadCount" | "copyCount" | "createdAt" | "updatedAt">[] = [
    // Pinned Posts
    {
      category: "pinned_posts",
      type: "template",
      name: "Welcome Announcement",
      nameTranslations: {
        fr: "Annonce de bienvenue",
        en: "Welcome Announcement",
        es: "Anuncio de bienvenida",
        pt: "Anúncio de boas-vindas",
        de: "Willkommensankündigung",
        ar: "إعلان ترحيبي",
        zh: "欢迎公告",
        ru: "Приветственное объявление",
        hi: "स्वागत घोषणा",
      },
      description: "Post to pin for introducing the SOS-Expat partnership",
      content: `🌍 OFFICIAL PARTNER ANNOUNCEMENT 🌍

Dear group members,

We are excited to announce our partnership with SOS-Expat, the leading legal assistance platform for expatriates!

✅ 24/7 Legal assistance in 50+ countries
✅ Verified lawyers speaking your language
✅ Help with visas, work permits, contracts, and more

🎁 EXCLUSIVE: Use our group link to get $5 OFF your first consultation!

👉 {{AFFILIATE_LINK}}

Questions? Ask {{ADMIN_FIRST_NAME}}!

#SOSExpat #ExpatLife #LegalHelp`,
      contentTranslations: {
        fr: `🌍 ANNONCE OFFICIELLE DE PARTENARIAT 🌍

Chers membres du groupe,

Nous sommes ravis d'annoncer notre partenariat avec SOS-Expat, la plateforme leader d'assistance juridique pour expatriés !

✅ Assistance juridique 24/7 dans 50+ pays
✅ Avocats vérifiés parlant votre langue
✅ Aide pour visas, permis de travail, contrats et plus

🎁 EXCLUSIF : Utilisez notre lien pour obtenir 5$ de REMISE sur votre première consultation !

👉 {{AFFILIATE_LINK}}

Questions ? Demandez à {{ADMIN_FIRST_NAME}} !

#SOSExpat #VieExpat #AideJuridique`,
        es: `🌍 ANUNCIO DE ASOCIACIÓN OFICIAL 🌍

Queridos miembros del grupo,

¡Estamos emocionados de anunciar nuestra asociación con SOS-Expat, la plataforma líder de asistencia legal para expatriados!

✅ Asistencia legal 24/7 en más de 50 países
✅ Abogados verificados que hablan tu idioma
✅ Ayuda con visas, permisos de trabajo, contratos y más

🎁 EXCLUSIVO: ¡Usa nuestro enlace del grupo para obtener $5 de DESCUENTO en tu primera consulta!

👉 {{AFFILIATE_LINK}}

¿Preguntas? ¡Pregunta a {{ADMIN_FIRST_NAME}}!

#SOSExpat #VidaExpat #AyudaLegal`,
      },
      placeholders: ["{{AFFILIATE_LINK}}", "{{ADMIN_FIRST_NAME}}"],
      isActive: true,
      order: 1,
    },

    // Welcome Messages
    {
      category: "welcome_messages",
      type: "template",
      name: "New Member Welcome",
      nameTranslations: {
        fr: "Bienvenue nouveau membre",
        en: "New Member Welcome",
        es: "Bienvenida nuevo miembro",
      },
      description: "Welcome message for new group members",
      content: `Welcome to {{GROUP_NAME}}! 🎉

Need legal help abroad? Our partner SOS-Expat offers:
• Instant legal consultations
• Verified lawyers in 50+ countries
• $5 discount with our link!

👉 {{AFFILIATE_LINK}}`,
      contentTranslations: {
        fr: `Bienvenue dans {{GROUP_NAME}} ! 🎉

Besoin d'aide juridique à l'étranger ? Notre partenaire SOS-Expat propose :
• Consultations juridiques instantanées
• Avocats vérifiés dans 50+ pays
• 5$ de remise avec notre lien !

👉 {{AFFILIATE_LINK}}`,
      },
      placeholders: ["{{GROUP_NAME}}", "{{AFFILIATE_LINK}}"],
      isActive: true,
      order: 1,
    },
  ];

  const batch = getDb().batch();
  const now = Timestamp.now();

  for (const resource of resources) {
    // Check if resource already exists by name
    const existing = await getDb()
      .collection("group_admin_resources")
      .where("name", "==", resource.name)
      .limit(1)
      .get();

    if (existing.empty) {
      const ref = getDb().collection("group_admin_resources").doc();
      batch.set(ref, {
        id: ref.id,
        ...resource,
        downloadCount: 0,
        copyCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  await batch.commit();
  logger.info("[GroupAdminResource] Seeded default resources");
}

/**
 * Seed default posts for GroupAdmins
 */
export async function seedDefaultPosts(): Promise<void> {
  const posts: Omit<GroupAdminPost, "id" | "usageCount" | "createdAt" | "updatedAt">[] = [
    {
      name: "Weekly Reminder",
      nameTranslations: {
        fr: "Rappel hebdomadaire",
        en: "Weekly Reminder",
        es: "Recordatorio semanal",
      },
      category: "reminder",
      content: `📢 WEEKLY REMINDER 📢

Planning to travel, relocate, or need legal help abroad?

Our trusted partner SOS-Expat can help with:
🔹 Visa applications
🔹 Work permits
🔹 Contract reviews
🔹 Immigration questions
🔹 Emergency legal assistance

🎁 Special offer for our members: $5 OFF!

Book now: {{AFFILIATE_LINK}}`,
      contentTranslations: {
        fr: `📢 RAPPEL HEBDOMADAIRE 📢

Vous planifiez un voyage, une relocalisation ou avez besoin d'aide juridique à l'étranger ?

Notre partenaire de confiance SOS-Expat peut vous aider avec :
🔹 Demandes de visa
🔹 Permis de travail
🔹 Révision de contrats
🔹 Questions d'immigration
🔹 Assistance juridique d'urgence

🎁 Offre spéciale pour nos membres : 5$ de REMISE !

Réservez maintenant : {{AFFILIATE_LINK}}`,
        es: `📢 RECORDATORIO SEMANAL 📢

¿Planeas viajar, reubicarte o necesitas ayuda legal en el extranjero?

Nuestro socio de confianza SOS-Expat puede ayudarte con:
🔹 Solicitudes de visa
🔹 Permisos de trabajo
🔹 Revisión de contratos
🔹 Preguntas de inmigración
🔹 Asistencia legal de emergencia

🎁 Oferta especial para nuestros miembros: ¡$5 de DESCUENTO!

Reserva ahora: {{AFFILIATE_LINK}}`,
      },
      placeholders: ["{{AFFILIATE_LINK}}"],
      recommendedPinDuration: "1_week",
      bestTimeToPost: "monday_morning",
      isActive: true,
      order: 1,
    },
    {
      name: "Emergency Help Post",
      nameTranslations: {
        fr: "Post aide d'urgence",
        en: "Emergency Help Post",
        es: "Post de ayuda de emergencia",
      },
      category: "emergency",
      content: `🚨 NEED URGENT LEGAL HELP? 🚨

Are you facing:
❌ Visa rejection or expiration
❌ Legal issues abroad
❌ Contract disputes
❌ Immigration problems

Get IMMEDIATE help from verified lawyers!

SOS-Expat provides:
✅ 24/7 availability
✅ Lawyers in 50+ countries
✅ Consultations in your language

🎁 {{DISCOUNT_AMOUNT}} OFF for group members!

👉 {{AFFILIATE_LINK}}

Don't wait - legal issues get worse with time!`,
      contentTranslations: {
        fr: `🚨 BESOIN D'AIDE JURIDIQUE URGENTE ? 🚨

Vous faites face à :
❌ Refus ou expiration de visa
❌ Problèmes juridiques à l'étranger
❌ Litiges contractuels
❌ Problèmes d'immigration

Obtenez une aide IMMÉDIATE de la part d'avocats vérifiés !

SOS-Expat propose :
✅ Disponibilité 24/7
✅ Avocats dans 50+ pays
✅ Consultations dans votre langue

🎁 {{DISCOUNT_AMOUNT}} de REMISE pour les membres du groupe !

👉 {{AFFILIATE_LINK}}

N'attendez pas - les problèmes juridiques s'aggravent avec le temps !`,
      },
      placeholders: ["{{AFFILIATE_LINK}}", "{{DISCOUNT_AMOUNT}}"],
      bestTimeToPost: "any",
      isActive: true,
      order: 2,
    },
    {
      name: "Q&A Legal Help",
      nameTranslations: {
        fr: "Q&R Aide juridique",
        en: "Q&A Legal Help",
        es: "P&R Ayuda legal",
      },
      category: "qa",
      content: `❓ FREQUENTLY ASKED QUESTIONS ❓

Q: Can I get legal help in my language?
A: Yes! SOS-Expat has lawyers speaking 20+ languages.

Q: How quickly can I get help?
A: Many consultations available within 24 hours!

Q: Is it expensive?
A: Rates vary by country, and group members get {{DISCOUNT_AMOUNT}} OFF!

Q: What can they help with?
A: Visas, permits, contracts, immigration, property, family law, and more.

📞 Try it now: {{AFFILIATE_LINK}}

More questions? Ask in the comments!`,
      contentTranslations: {
        fr: `❓ QUESTIONS FRÉQUENTES ❓

Q: Puis-je obtenir de l'aide juridique dans ma langue ?
R: Oui ! SOS-Expat a des avocats parlant 20+ langues.

Q: À quelle vitesse puis-je obtenir de l'aide ?
R: De nombreuses consultations disponibles sous 24 heures !

Q: Est-ce cher ?
R: Les tarifs varient par pays, et les membres du groupe ont {{DISCOUNT_AMOUNT}} de REMISE !

Q: Avec quoi peuvent-ils aider ?
R: Visas, permis, contrats, immigration, immobilier, droit de la famille, et plus.

📞 Essayez maintenant : {{AFFILIATE_LINK}}

D'autres questions ? Posez-les dans les commentaires !`,
      },
      placeholders: ["{{AFFILIATE_LINK}}", "{{DISCOUNT_AMOUNT}}"],
      bestTimeToPost: "evening",
      isActive: true,
      order: 3,
    },
  ];

  const batch = getDb().batch();
  const now = Timestamp.now();

  for (const post of posts) {
    // Check if post already exists by name
    const existing = await getDb()
      .collection("group_admin_posts")
      .where("name", "==", post.name)
      .limit(1)
      .get();

    if (existing.empty) {
      const ref = getDb().collection("group_admin_posts").doc();
      batch.set(ref, {
        id: ref.id,
        ...post,
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  await batch.commit();
  logger.info("[GroupAdminResource] Seeded default posts");
}

/**
 * Get resource statistics
 */
export async function getResourceStats(): Promise<{
  totalResources: number;
  totalPosts: number;
  totalDownloads: number;
  totalCopies: number;
  topResources: { id: string; name: string; downloads: number; copies: number }[];
  topPosts: { id: string; name: string; usageCount: number }[];
}> {
  try {
    // Get resources
    const resourcesSnapshot = await getDb()
      .collection("group_admin_resources")
      .where("isActive", "==", true)
      .get();

    let totalDownloads = 0;
    let totalCopies = 0;
    const resourceStats: { id: string; name: string; downloads: number; copies: number }[] = [];

    resourcesSnapshot.docs.forEach((doc) => {
      const resource = doc.data() as GroupAdminResource;
      totalDownloads += resource.downloadCount;
      totalCopies += resource.copyCount;
      resourceStats.push({
        id: resource.id,
        name: resource.name,
        downloads: resource.downloadCount,
        copies: resource.copyCount,
      });
    });

    // Get posts
    const postsSnapshot = await getDb()
      .collection("group_admin_posts")
      .where("isActive", "==", true)
      .get();

    const postStats: { id: string; name: string; usageCount: number }[] = [];

    postsSnapshot.docs.forEach((doc) => {
      const post = doc.data() as GroupAdminPost;
      postStats.push({
        id: post.id,
        name: post.name,
        usageCount: post.usageCount,
      });
    });

    // Sort by usage
    resourceStats.sort((a, b) => (b.downloads + b.copies) - (a.downloads + a.copies));
    postStats.sort((a, b) => b.usageCount - a.usageCount);

    return {
      totalResources: resourcesSnapshot.size,
      totalPosts: postsSnapshot.size,
      totalDownloads,
      totalCopies,
      topResources: resourceStats.slice(0, 5),
      topPosts: postStats.slice(0, 5),
    };
  } catch (error) {
    logger.error("[GroupAdminResource] Error getting resource stats", { error });
    return {
      totalResources: 0,
      totalPosts: 0,
      totalDownloads: 0,
      totalCopies: 0,
      topResources: [],
      topPosts: [],
    };
  }
}
