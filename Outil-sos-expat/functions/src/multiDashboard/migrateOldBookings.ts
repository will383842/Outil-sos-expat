/**
 * =============================================================================
 * ONE-TIME MIGRATION: Mark old pending booking_requests as completed
 * =============================================================================
 *
 * Callable function to migrate all old booking_requests from "pending" to "completed".
 * This is a one-time operation to fix historical data.
 *
 * Criteria for migration:
 * - Status is "pending"
 * - Created more than 1 hour ago (conversations expire after 25-35 min)
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { getSosFirestore, SOS_SERVICE_ACCOUNT } from "./sosFirestore";

// =============================================================================
// TYPES
// =============================================================================

interface MigrateRequest {
  sessionToken: string;
  dryRun?: boolean; // If true, don't actually update, just count
}

interface MigrateResponse {
  success: boolean;
  migrated: number;
  skipped: number;
  errors: number;
  dryRun: boolean;
  message: string;
}

// =============================================================================
// CALLABLE FUNCTION
// =============================================================================

export const migrateOldPendingBookings = onCall<
  MigrateRequest,
  Promise<MigrateResponse>
>(
  {
    region: "europe-west1",
    timeoutSeconds: 300, // 5 minutes for large migrations
    memory: "512MiB",
    secrets: [SOS_SERVICE_ACCOUNT],
    cors: [
      "https://sos-expat.com",
      "https://www.sos-expat.com",
      "http://localhost:3000",
      "http://localhost:5173",
    ],
  },
  async (request) => {
    const { sessionToken, dryRun = false } = request.data;

    logger.info("[migrateOldPendingBookings] Starting migration", { dryRun });

    // Validate session token
    if (!sessionToken || typeof sessionToken !== "string" || !sessionToken.startsWith("mds_")) {
      throw new HttpsError("unauthenticated", "Invalid session token");
    }

    try {
      const db = getSosFirestore();
      const now = Date.now();
      // Threshold: 1 hour ago (conversations expire after 25-35 minutes)
      const threshold = new Date(now - 60 * 60 * 1000);

      logger.info("[migrateOldPendingBookings] Fetching pending booking_requests older than", {
        threshold: threshold.toISOString(),
      });

      // Fetch all pending booking_requests
      const bookingsSnap = await db.collection("booking_requests")
        .where("status", "==", "pending")
        .get();

      logger.info("[migrateOldPendingBookings] Found pending bookings", {
        total: bookingsSnap.size,
      });

      let migrated = 0;
      let skipped = 0;
      let errors = 0;

      for (const doc of bookingsSnap.docs) {
        const data = doc.data();

        // Parse createdAt
        let createdAt: Date;
        if (data.createdAt?.toDate) {
          createdAt = data.createdAt.toDate();
        } else if (data.createdAt?._seconds) {
          createdAt = new Date(data.createdAt._seconds * 1000);
        } else if (typeof data.createdAt === "string") {
          createdAt = new Date(data.createdAt);
        } else {
          // No valid createdAt, skip
          skipped++;
          continue;
        }

        // Check if older than threshold
        if (createdAt >= threshold) {
          // Too recent, skip
          skipped++;
          continue;
        }

        // Update to completed
        if (!dryRun) {
          try {
            await doc.ref.update({
              status: "completed",
              completedAt: new Date().toISOString(),
              completedReason: "migration_old_pending",
              migratedAt: new Date().toISOString(),
            });
            migrated++;
          } catch (err) {
            logger.warn("[migrateOldPendingBookings] Failed to update doc", {
              docId: doc.id,
              error: err,
            });
            errors++;
          }
        } else {
          // Dry run - just count
          migrated++;
        }
      }

      const message = dryRun
        ? `Dry run: ${migrated} booking_requests would be migrated`
        : `Migration complete: ${migrated} booking_requests updated to "completed"`;

      logger.info("[migrateOldPendingBookings] Migration finished", {
        migrated,
        skipped,
        errors,
        dryRun,
      });

      return {
        success: true,
        migrated,
        skipped,
        errors,
        dryRun,
        message,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("[migrateOldPendingBookings] Error", { error: errorMessage });
      throw new HttpsError("internal", `Migration failed: ${errorMessage}`);
    }
  }
);
