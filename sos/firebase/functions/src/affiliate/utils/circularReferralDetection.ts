/**
 * Generic Circular Referral Detection
 *
 * Detects if accepting a referral would create a circular chain.
 * Example: A refers B, B refers C, C tries to refer A = circular
 *
 * Works for any affiliate role (influencer, blogger, groupAdmin).
 * The chatter role has its own implementation in chatterReferralFraudService.ts.
 */

import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";

const MAX_DEPTH = 10;

/**
 * Detect if a referral would create a circular chain in the given collection.
 *
 * @param parrainId - The recruiter's user ID
 * @param potentialFilleulId - The new user's ID (about to be recruited)
 * @param collection - Firestore collection name (e.g. "influencers", "bloggers", "group_admins")
 * @param recruitedByField - The field name storing the recruiter ID (default: "recruitedBy")
 */
export async function detectCircularReferral(
  parrainId: string,
  potentialFilleulId: string,
  collection: string,
  recruitedByField = "recruitedBy"
): Promise<{
  isCircular: boolean;
  chain: string[];
}> {
  const db = getFirestore();
  const result = { isCircular: false, chain: [] as string[] };

  try {
    // Direction 1: Walk UP from the parrain, check if chain loops back to potentialFilleul
    const visited = new Set<string>();
    let currentId: string | null = parrainId;
    const chain: string[] = [potentialFilleulId, parrainId];

    for (let depth = 0; depth < MAX_DEPTH; depth++) {
      if (!currentId || visited.has(currentId)) break;
      visited.add(currentId);

      const doc = await db.collection(collection).doc(currentId).get();
      if (!doc.exists) break;

      currentId = doc.data()?.[recruitedByField] || null;

      if (currentId) {
        chain.push(currentId);

        if (currentId === potentialFilleulId) {
          result.isCircular = true;
          result.chain = chain;
          break;
        }
      }
    }

    // Direction 2: Walk UP from the potentialFilleul, check if chain reaches parrain
    if (!result.isCircular) {
      const reverseVisited = new Set<string>();
      let reverseId: string | null = potentialFilleulId;
      const reverseChain: string[] = [parrainId, potentialFilleulId];

      for (let depth = 0; depth < MAX_DEPTH; depth++) {
        if (!reverseId || reverseVisited.has(reverseId)) break;
        reverseVisited.add(reverseId);

        const doc = await db.collection(collection).doc(reverseId).get();
        if (!doc.exists) break;

        reverseId = doc.data()?.[recruitedByField] || null;

        if (reverseId) {
          reverseChain.push(reverseId);

          if (reverseId === parrainId) {
            result.isCircular = true;
            result.chain = reverseChain;
            break;
          }
        }
      }
    }

    if (result.isCircular) {
      logger.warn("[detectCircularReferral] Circular referral detected", {
        collection,
        parrainId,
        potentialFilleulId,
        chain: result.chain,
      });
    }

    return result;
  } catch (error) {
    logger.error("[detectCircularReferral] Error (fail-open, accepting referral)", {
      collection,
      parrainId,
      potentialFilleulId,
      error: error instanceof Error ? error.message : String(error),
    });
    return result;
  }
}
