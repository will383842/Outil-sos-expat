/**
 * Initialize Chatter Configuration
 *
 * Creates the default chatter configuration document if it doesn't exist.
 * Can be called manually or during deployment.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { ChatterConfig, DEFAULT_CHATTER_CONFIG } from "./types";
import { ALLOWED_ORIGINS } from "../lib/functionConfigs";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Initialize chatter config with default values
 * Creates the document only if it doesn't exist
 */
export async function initializeChatterConfigInternal(): Promise<{
  created: boolean;
  config: ChatterConfig;
}> {
  ensureInitialized();

  const db = getFirestore();
  const configRef = db.collection("chatter_config").doc("current");

  const existingDoc = await configRef.get();

  if (existingDoc.exists) {
    logger.info("[initializeChatterConfig] Config already exists, skipping");
    return {
      created: false,
      config: existingDoc.data() as ChatterConfig,
    };
  }

  const fullConfig: ChatterConfig = {
    ...DEFAULT_CHATTER_CONFIG,
    updatedAt: Timestamp.now(),
    updatedBy: "system",
  };

  await configRef.set(fullConfig);

  logger.info("[initializeChatterConfig] Created default config", {
    version: fullConfig.version,
  });

  return {
    created: true,
    config: fullConfig,
  };
}

/**
 * Cloud Function to initialize chatter config (admin only)
 */
export const initializeChatterConfig = onCall(
  {
    cors: ALLOWED_ORIGINS,
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request): Promise<{ success: boolean; message: string; created: boolean }> => {
    ensureInitialized();

    // Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Check admin role
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(request.auth.uid).get();

    if (!userDoc.exists || !["admin", "dev"].includes(userDoc.data()?.role)) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    try {
      const result = await initializeChatterConfigInternal();

      return {
        success: true,
        message: result.created
          ? "Chatter configuration created successfully"
          : "Chatter configuration already exists",
        created: result.created,
      };
    } catch (error) {
      logger.error("[initializeChatterConfig] Error", { error });
      throw new HttpsError("internal", "Failed to initialize config");
    }
  }
);

/**
 * Reset chatter config to defaults (admin only)
 */
export const resetChatterConfigToDefaults = onCall(
  {
    cors: ALLOWED_ORIGINS,
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request): Promise<{ success: boolean; message: string }> => {
    ensureInitialized();

    // Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Check admin role
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(request.auth.uid).get();

    if (!userDoc.exists || userDoc.data()?.role !== "admin") {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    try {
      const configRef = db.collection("chatter_config").doc("current");

      // Get existing config for version increment
      const existingDoc = await configRef.get();
      const existingVersion = existingDoc.exists
        ? (existingDoc.data() as ChatterConfig).version
        : 0;

      const fullConfig: ChatterConfig = {
        ...DEFAULT_CHATTER_CONFIG,
        version: existingVersion + 1,
        updatedAt: Timestamp.now(),
        updatedBy: request.auth.uid,
      };

      await configRef.set(fullConfig);

      logger.info("[resetChatterConfigToDefaults] Reset config to defaults", {
        version: fullConfig.version,
        resetBy: request.auth.uid,
      });

      return {
        success: true,
        message: "Chatter configuration reset to defaults",
      };
    } catch (error) {
      logger.error("[resetChatterConfigToDefaults] Error", { error });
      throw new HttpsError("internal", "Failed to reset config");
    }
  }
);

/**
 * Initialize quiz questions with default set
 */
export async function initializeQuizQuestionsInternal(): Promise<number> {
  ensureInitialized();

  const db = getFirestore();
  const questionsRef = db.collection("chatter_quiz_questions");

  // Check if questions already exist
  const existingQuestions = await questionsRef.limit(1).get();
  if (!existingQuestions.empty) {
    logger.info("[initializeQuizQuestions] Questions already exist, skipping");
    return 0;
  }

  // Default quiz questions
  const defaultQuestions = [
    {
      question: "Quel est le montant de commission que vous recevez pour chaque client qui effectue un appel payant ?",
      translations: {
        en: "What is the commission amount you receive for each client who makes a paid call?",
      },
      options: [
        {
          id: "a",
          text: "5$",
          translations: { en: "5$" },
        },
        {
          id: "b",
          text: "10$",
          translations: { en: "10$" },
        },
        {
          id: "c",
          text: "15$",
          translations: { en: "15$" },
        },
        {
          id: "d",
          text: "20$",
          translations: { en: "20$" },
        },
      ],
      correctAnswerId: "b",
      explanation: "Chaque client qui effectue un appel payant vous rapporte 10$ de commission.",
      explanationTranslations: {
        en: "Each client who makes a paid call earns you a $10 commission.",
      },
      category: "commission" as const,
      difficulty: "easy" as const,
      order: 1,
    },
    {
      question: "Pendant combien de temps votre lien de recrutement reste-t-il actif ?",
      translations: {
        en: "How long does your recruitment link remain active?",
      },
      options: [
        {
          id: "a",
          text: "1 mois",
          translations: { en: "1 month" },
        },
        {
          id: "b",
          text: "3 mois",
          translations: { en: "3 months" },
        },
        {
          id: "c",
          text: "6 mois",
          translations: { en: "6 months" },
        },
        {
          id: "d",
          text: "12 mois",
          translations: { en: "12 months" },
        },
      ],
      correctAnswerId: "c",
      explanation: "Les liens de recrutement sont valides pendant 6 mois à partir de leur création.",
      explanationTranslations: {
        en: "Recruitment links are valid for 6 months from their creation.",
      },
      category: "rules" as const,
      difficulty: "easy" as const,
      order: 2,
    },
    {
      question: "Quel est le montant minimum pour effectuer un retrait ?",
      translations: {
        en: "What is the minimum amount to make a withdrawal?",
      },
      options: [
        {
          id: "a",
          text: "10$",
          translations: { en: "$10" },
        },
        {
          id: "b",
          text: "15$",
          translations: { en: "$15" },
        },
        {
          id: "c",
          text: "25$",
          translations: { en: "$25" },
        },
        {
          id: "d",
          text: "50$",
          translations: { en: "$50" },
        },
      ],
      correctAnswerId: "c",
      explanation: "Le montant minimum de retrait est de 25$ pour limiter les frais de transaction.",
      explanationTranslations: {
        en: "The minimum withdrawal amount is $25 to limit transaction fees.",
      },
      category: "rules" as const,
      difficulty: "easy" as const,
      order: 3,
    },
    {
      question: "Qu'est-ce qui est strictement interdit en tant que Chatter ?",
      translations: {
        en: "What is strictly prohibited as a Chatter?",
      },
      options: [
        {
          id: "a",
          text: "Partager votre lien sur les réseaux sociaux",
          translations: { en: "Sharing your link on social media" },
        },
        {
          id: "b",
          text: "Recruter d'autres chatters",
          translations: { en: "Recruiting other chatters" },
        },
        {
          id: "c",
          text: "Créer de faux comptes ou des inscriptions frauduleuses",
          translations: { en: "Creating fake accounts or fraudulent registrations" },
        },
        {
          id: "d",
          text: "Promouvoir SOS-Expat dans les forums",
          translations: { en: "Promoting SOS-Expat in forums" },
        },
      ],
      correctAnswerId: "c",
      explanation: "Toute tentative de fraude entraîne la suspension immédiate et la perte des commissions.",
      explanationTranslations: {
        en: "Any fraud attempt results in immediate suspension and loss of commissions.",
      },
      category: "ethics" as const,
      difficulty: "medium" as const,
      order: 4,
    },
    {
      question: "Comment augmenter votre niveau de Chatter ?",
      translations: {
        en: "How do you increase your Chatter level?",
      },
      options: [
        {
          id: "a",
          text: "En accumulant des commissions totales",
          translations: { en: "By accumulating total commissions" },
        },
        {
          id: "b",
          text: "En passant plus de temps sur la plateforme",
          translations: { en: "By spending more time on the platform" },
        },
        {
          id: "c",
          text: "En complétant des quiz supplémentaires",
          translations: { en: "By completing additional quizzes" },
        },
        {
          id: "d",
          text: "En demandant une promotion à l'administrateur",
          translations: { en: "By requesting a promotion from the administrator" },
        },
      ],
      correctAnswerId: "a",
      explanation: "Votre niveau augmente automatiquement en fonction de vos gains totaux : Niveau 2 à 100$, Niveau 3 à 500$, etc.",
      explanationTranslations: {
        en: "Your level increases automatically based on your total earnings: Level 2 at $100, Level 3 at $500, etc.",
      },
      category: "general" as const,
      difficulty: "medium" as const,
      order: 5,
    },
    {
      question: "Quel avantage obtenez-vous en atteignant le Top 3 du classement mensuel ?",
      translations: {
        en: "What benefit do you get from reaching the Top 3 of the monthly ranking?",
      },
      options: [
        {
          id: "a",
          text: "Un badge exclusif uniquement",
          translations: { en: "An exclusive badge only" },
        },
        {
          id: "b",
          text: "Un multiplicateur de bonus sur vos commissions du mois suivant",
          translations: { en: "A bonus multiplier on your commissions for the following month" },
        },
        {
          id: "c",
          text: "Un accès prioritaire au support",
          translations: { en: "Priority access to support" },
        },
        {
          id: "d",
          text: "Une réduction sur les frais de retrait",
          translations: { en: "A reduction on withdrawal fees" },
        },
      ],
      correctAnswerId: "b",
      explanation: "Les Top 3 mensuels reçoivent des multiplicateurs de bonus : Top 1 = +100%, Top 2 = +50%, Top 3 = +15% sur les commissions.",
      explanationTranslations: {
        en: "Monthly Top 3 receive bonus multipliers: Top 1 = +100%, Top 2 = +50%, Top 3 = +15% on commissions.",
      },
      category: "commission" as const,
      difficulty: "medium" as const,
      order: 6,
    },
    {
      question: "Quand recevez-vous la commission pour un prestataire recruté ?",
      translations: {
        en: "When do you receive the commission for a recruited provider?",
      },
      options: [
        {
          id: "a",
          text: "Immédiatement après son inscription",
          translations: { en: "Immediately after their registration" },
        },
        {
          id: "b",
          text: "Quand il complète son profil",
          translations: { en: "When they complete their profile" },
        },
        {
          id: "c",
          text: "Quand il reçoit son premier appel payant",
          translations: { en: "When they receive their first paid call" },
        },
        {
          id: "d",
          text: "Après 30 jours d'activité",
          translations: { en: "After 30 days of activity" },
        },
      ],
      correctAnswerId: "c",
      explanation: "La commission de recrutement (5$) est versée uniquement lorsque le prestataire recruté reçoit son premier appel payant.",
      explanationTranslations: {
        en: "The recruitment commission ($5) is paid only when the recruited provider receives their first paid call.",
      },
      category: "commission" as const,
      difficulty: "medium" as const,
      order: 7,
    },
    {
      question: "Qu'est-ce que le 'streak' et pourquoi est-il important ?",
      translations: {
        en: "What is the 'streak' and why is it important?",
      },
      options: [
        {
          id: "a",
          text: "C'est le nombre de jours consécutifs avec une commission - il peut débloquer des badges",
          translations: { en: "It's the number of consecutive days with a commission - it can unlock badges" },
        },
        {
          id: "b",
          text: "C'est votre rang dans le classement",
          translations: { en: "It's your rank in the leaderboard" },
        },
        {
          id: "c",
          text: "C'est le nombre total de clients référés",
          translations: { en: "It's the total number of referred clients" },
        },
        {
          id: "d",
          text: "C'est votre score au quiz",
          translations: { en: "It's your quiz score" },
        },
      ],
      correctAnswerId: "a",
      explanation: "Le streak compte vos jours consécutifs d'activité et vous permet de débloquer des badges spéciaux (7, 30, 100 jours).",
      explanationTranslations: {
        en: "The streak counts your consecutive days of activity and allows you to unlock special badges (7, 30, 100 days).",
      },
      category: "general" as const,
      difficulty: "hard" as const,
      order: 8,
    },
    {
      question: "Quel est le score minimum requis pour réussir le quiz de qualification ?",
      translations: {
        en: "What is the minimum score required to pass the qualification quiz?",
      },
      options: [
        {
          id: "a",
          text: "70%",
          translations: { en: "70%" },
        },
        {
          id: "b",
          text: "80%",
          translations: { en: "80%" },
        },
        {
          id: "c",
          text: "85%",
          translations: { en: "85%" },
        },
        {
          id: "d",
          text: "90%",
          translations: { en: "90%" },
        },
      ],
      correctAnswerId: "c",
      explanation: "Un score de 85% minimum est requis pour réussir le quiz et devenir un Chatter actif.",
      explanationTranslations: {
        en: "A minimum score of 85% is required to pass the quiz and become an active Chatter.",
      },
      category: "rules" as const,
      difficulty: "easy" as const,
      order: 9,
    },
    {
      question: "Si vous échouez au quiz, combien de temps devez-vous attendre avant de réessayer ?",
      translations: {
        en: "If you fail the quiz, how long must you wait before retrying?",
      },
      options: [
        {
          id: "a",
          text: "1 heure",
          translations: { en: "1 hour" },
        },
        {
          id: "b",
          text: "12 heures",
          translations: { en: "12 hours" },
        },
        {
          id: "c",
          text: "24 heures",
          translations: { en: "24 hours" },
        },
        {
          id: "d",
          text: "48 heures",
          translations: { en: "48 hours" },
        },
      ],
      correctAnswerId: "c",
      explanation: "En cas d'échec, vous devez attendre 24 heures avant de pouvoir retenter le quiz.",
      explanationTranslations: {
        en: "If you fail, you must wait 24 hours before you can retry the quiz.",
      },
      category: "rules" as const,
      difficulty: "easy" as const,
      order: 10,
    },
  ];

  const batch = db.batch();
  let count = 0;

  for (const question of defaultQuestions) {
    const docRef = questionsRef.doc();
    batch.set(docRef, {
      ...question,
      id: docRef.id,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    count++;
  }

  await batch.commit();

  logger.info("[initializeQuizQuestions] Created default questions", { count });

  return count;
}

/**
 * Initialize badge definitions
 */
export async function initializeBadgeDefinitionsInternal(): Promise<number> {
  ensureInitialized();

  const db = getFirestore();
  const badgesRef = db.collection("chatter_badges");

  // Check if badges already exist
  const existingBadges = await badgesRef.limit(1).get();
  if (!existingBadges.empty) {
    logger.info("[initializeBadgeDefinitions] Badges already exist, skipping");
    return 0;
  }

  const defaultBadges = [
    {
      id: "first_client",
      name: "Premier Client",
      nameTranslations: { en: "First Client" },
      description: "Vous avez référé votre premier client !",
      descriptionTranslations: { en: "You referred your first client!" },
      icon: "🎯",
      category: "milestone" as const,
      rarity: "common" as const,
      bonusReward: 0,
      order: 1,
    },
    {
      id: "first_recruitment",
      name: "Premier Recrutement",
      nameTranslations: { en: "First Recruitment" },
      description: "Vous avez recruté votre premier prestataire !",
      descriptionTranslations: { en: "You recruited your first provider!" },
      icon: "🤝",
      category: "milestone" as const,
      rarity: "common" as const,
      bonusReward: 0,
      order: 2,
    },
    {
      id: "streak_7",
      name: "Flamme Naissante",
      nameTranslations: { en: "Rising Flame" },
      description: "7 jours consécutifs d'activité",
      descriptionTranslations: { en: "7 consecutive days of activity" },
      icon: "🔥",
      category: "streak" as const,
      rarity: "uncommon" as const,
      bonusReward: 100, // $1
      order: 10,
    },
    {
      id: "streak_30",
      name: "Flamme Ardente",
      nameTranslations: { en: "Burning Flame" },
      description: "30 jours consécutifs d'activité",
      descriptionTranslations: { en: "30 consecutive days of activity" },
      icon: "🔥🔥",
      category: "streak" as const,
      rarity: "rare" as const,
      bonusReward: 500, // $5
      order: 11,
    },
    {
      id: "streak_100",
      name: "Flamme Légendaire",
      nameTranslations: { en: "Legendary Flame" },
      description: "100 jours consécutifs d'activité",
      descriptionTranslations: { en: "100 consecutive days of activity" },
      icon: "🔥🔥🔥",
      category: "streak" as const,
      rarity: "legendary" as const,
      bonusReward: 2000, // $20
      order: 12,
    },
    {
      id: "level_2",
      name: "Niveau 2",
      nameTranslations: { en: "Level 2" },
      description: "Vous avez atteint le niveau 2 !",
      descriptionTranslations: { en: "You reached level 2!" },
      icon: "⭐⭐",
      category: "level" as const,
      rarity: "uncommon" as const,
      bonusReward: 0,
      order: 20,
    },
    {
      id: "level_3",
      name: "Niveau 3",
      nameTranslations: { en: "Level 3" },
      description: "Vous avez atteint le niveau 3 !",
      descriptionTranslations: { en: "You reached level 3!" },
      icon: "⭐⭐⭐",
      category: "level" as const,
      rarity: "rare" as const,
      bonusReward: 0,
      order: 21,
    },
    {
      id: "level_4",
      name: "Niveau 4",
      nameTranslations: { en: "Level 4" },
      description: "Vous avez atteint le niveau 4 !",
      descriptionTranslations: { en: "You reached level 4!" },
      icon: "⭐⭐⭐⭐",
      category: "level" as const,
      rarity: "epic" as const,
      bonusReward: 0,
      order: 22,
    },
    {
      id: "level_5",
      name: "Niveau 5",
      nameTranslations: { en: "Level 5" },
      description: "Vous avez atteint le niveau maximum !",
      descriptionTranslations: { en: "You reached the maximum level!" },
      icon: "⭐⭐⭐⭐⭐",
      category: "level" as const,
      rarity: "legendary" as const,
      bonusReward: 0,
      order: 23,
    },
    {
      id: "top1_monthly",
      name: "Champion du Mois",
      nameTranslations: { en: "Monthly Champion" },
      description: "Vous êtes arrivé #1 du classement mensuel !",
      descriptionTranslations: { en: "You ranked #1 in the monthly leaderboard!" },
      icon: "🏆",
      category: "competition" as const,
      rarity: "legendary" as const,
      bonusReward: 0, // Bonus already applied via multiplier
      order: 30,
    },
    {
      id: "top3_monthly",
      name: "Podium Mensuel",
      nameTranslations: { en: "Monthly Podium" },
      description: "Vous êtes arrivé dans le Top 3 mensuel !",
      descriptionTranslations: { en: "You ranked in the monthly Top 3!" },
      icon: "🥇",
      category: "competition" as const,
      rarity: "epic" as const,
      bonusReward: 0,
      order: 31,
    },
    {
      id: "clients_10",
      name: "10 Clients",
      nameTranslations: { en: "10 Clients" },
      description: "Vous avez référé 10 clients !",
      descriptionTranslations: { en: "You referred 10 clients!" },
      icon: "👥",
      category: "milestone" as const,
      rarity: "uncommon" as const,
      bonusReward: 200, // $2
      order: 40,
    },
    {
      id: "clients_50",
      name: "50 Clients",
      nameTranslations: { en: "50 Clients" },
      description: "Vous avez référé 50 clients !",
      descriptionTranslations: { en: "You referred 50 clients!" },
      icon: "👥👥",
      category: "milestone" as const,
      rarity: "rare" as const,
      bonusReward: 1000, // $10
      order: 41,
    },
    {
      id: "clients_100",
      name: "100 Clients",
      nameTranslations: { en: "100 Clients" },
      description: "Vous avez référé 100 clients !",
      descriptionTranslations: { en: "You referred 100 clients!" },
      icon: "👥👥👥",
      category: "milestone" as const,
      rarity: "epic" as const,
      bonusReward: 2500, // $25
      order: 42,
    },
    {
      id: "recruits_5",
      name: "5 Recrutements",
      nameTranslations: { en: "5 Recruitments" },
      description: "Vous avez recruté 5 prestataires !",
      descriptionTranslations: { en: "You recruited 5 providers!" },
      icon: "🎖️",
      category: "milestone" as const,
      rarity: "rare" as const,
      bonusReward: 500, // $5
      order: 50,
    },
    {
      id: "recruits_10",
      name: "10 Recrutements",
      nameTranslations: { en: "10 Recruitments" },
      description: "Vous avez recruté 10 prestataires !",
      descriptionTranslations: { en: "You recruited 10 providers!" },
      icon: "🎖️🎖️",
      category: "milestone" as const,
      rarity: "epic" as const,
      bonusReward: 1500, // $15
      order: 51,
    },
    {
      id: "earned_100",
      name: "100$ Gagnés",
      nameTranslations: { en: "$100 Earned" },
      description: "Vous avez gagné 100$ au total !",
      descriptionTranslations: { en: "You earned $100 in total!" },
      icon: "💵",
      category: "milestone" as const,
      rarity: "uncommon" as const,
      bonusReward: 0,
      order: 60,
    },
    {
      id: "earned_500",
      name: "500$ Gagnés",
      nameTranslations: { en: "$500 Earned" },
      description: "Vous avez gagné 500$ au total !",
      descriptionTranslations: { en: "You earned $500 in total!" },
      icon: "💵💵",
      category: "milestone" as const,
      rarity: "rare" as const,
      bonusReward: 0,
      order: 61,
    },
    {
      id: "earned_1000",
      name: "1000$ Gagnés",
      nameTranslations: { en: "$1000 Earned" },
      description: "Vous avez gagné 1000$ au total !",
      descriptionTranslations: { en: "You earned $1000 in total!" },
      icon: "💵💵💵",
      category: "milestone" as const,
      rarity: "epic" as const,
      bonusReward: 0,
      order: 62,
    },
    {
      id: "zoom_participant",
      name: "Première Réunion",
      nameTranslations: { en: "First Meeting" },
      description: "Vous avez participé à votre première réunion Zoom !",
      descriptionTranslations: { en: "You attended your first Zoom meeting!" },
      icon: "📹",
      category: "activity" as const,
      rarity: "common" as const,
      bonusReward: 0,
      order: 70,
    },
    {
      id: "zoom_regular",
      name: "Participant Régulier",
      nameTranslations: { en: "Regular Participant" },
      description: "Vous avez participé à 5 réunions Zoom !",
      descriptionTranslations: { en: "You attended 5 Zoom meetings!" },
      icon: "📹📹",
      category: "activity" as const,
      rarity: "uncommon" as const,
      bonusReward: 300, // $3
      order: 71,
    },
  ];

  const batch = db.batch();
  let count = 0;

  for (const badge of defaultBadges) {
    const docRef = badgesRef.doc(badge.id);
    batch.set(docRef, {
      ...badge,
      isActive: true,
    });
    count++;
  }

  await batch.commit();

  logger.info("[initializeBadgeDefinitions] Created default badges", { count });

  return count;
}

/**
 * Initialize platform definitions
 */
export async function initializePlatformDefinitionsInternal(): Promise<number> {
  ensureInitialized();

  const db = getFirestore();
  const platformsRef = db.collection("chatter_platforms");

  // Check if platforms already exist
  const existingPlatforms = await platformsRef.limit(1).get();
  if (!existingPlatforms.empty) {
    logger.info("[initializePlatformDefinitions] Platforms already exist, skipping");
    return 0;
  }

  const defaultPlatforms = [
    { id: "facebook", name: "Facebook", iconUrl: "/icons/platforms/facebook.svg", order: 1 },
    { id: "instagram", name: "Instagram", iconUrl: "/icons/platforms/instagram.svg", order: 2 },
    { id: "twitter", name: "X (Twitter)", iconUrl: "/icons/platforms/twitter.svg", order: 3 },
    { id: "linkedin", name: "LinkedIn", iconUrl: "/icons/platforms/linkedin.svg", order: 4 },
    { id: "tiktok", name: "TikTok", iconUrl: "/icons/platforms/tiktok.svg", order: 5 },
    { id: "youtube", name: "YouTube", iconUrl: "/icons/platforms/youtube.svg", order: 6 },
    { id: "whatsapp", name: "WhatsApp", iconUrl: "/icons/platforms/whatsapp.svg", order: 7 },
    { id: "telegram", name: "Telegram", iconUrl: "/icons/platforms/telegram.svg", order: 8 },
    { id: "snapchat", name: "Snapchat", iconUrl: "/icons/platforms/snapchat.svg", order: 9 },
    { id: "reddit", name: "Reddit", iconUrl: "/icons/platforms/reddit.svg", order: 10 },
    { id: "discord", name: "Discord", iconUrl: "/icons/platforms/discord.svg", order: 11 },
    { id: "blog", name: "Blog", iconUrl: "/icons/platforms/blog.svg", order: 12 },
    { id: "website", name: "Site Web", iconUrl: "/icons/platforms/website.svg", order: 13 },
    { id: "forum", name: "Forums", iconUrl: "/icons/platforms/forum.svg", order: 14 },
    { id: "other", name: "Autre", iconUrl: "/icons/platforms/other.svg", order: 15 },
  ];

  const batch = db.batch();
  let count = 0;

  for (const platform of defaultPlatforms) {
    const docRef = platformsRef.doc(platform.id);
    batch.set(docRef, {
      ...platform,
      isActive: true,
    });
    count++;
  }

  await batch.commit();

  logger.info("[initializePlatformDefinitions] Created default platforms", { count });

  return count;
}

/**
 * Initialize all chatter system data (admin only)
 */
export const initializeChatterSystem = onCall(
  {
    cors: ALLOWED_ORIGINS,
    region: "europe-west2",
    memory: "512MiB",
    timeoutSeconds: 60,
  },
  async (request): Promise<{
    success: boolean;
    message: string;
    results: {
      config: boolean;
      questions: number;
      badges: number;
      platforms: number;
    };
  }> => {
    ensureInitialized();

    // Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Check admin role
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(request.auth.uid).get();

    if (!userDoc.exists || !["admin", "dev"].includes(userDoc.data()?.role)) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    try {
      const configResult = await initializeChatterConfigInternal();
      const questionsCount = await initializeQuizQuestionsInternal();
      const badgesCount = await initializeBadgeDefinitionsInternal();
      const platformsCount = await initializePlatformDefinitionsInternal();

      logger.info("[initializeChatterSystem] System initialization complete", {
        configCreated: configResult.created,
        questionsCount,
        badgesCount,
        platformsCount,
      });

      return {
        success: true,
        message: "Chatter system initialized successfully",
        results: {
          config: configResult.created,
          questions: questionsCount,
          badges: badgesCount,
          platforms: platformsCount,
        },
      };
    } catch (error) {
      logger.error("[initializeChatterSystem] Error", { error });
      throw new HttpsError("internal", "Failed to initialize chatter system");
    }
  }
);
