/**
 * =============================================================================
 * USE SIBLING STATUS NOTIFICATIONS
 * =============================================================================
 *
 * Hook that listens to linked providers (siblings) status changes and shows
 * toast notifications when a sibling enters or exits a call.
 *
 * This is part of the multi-provider system to keep users informed about
 * their colleagues' availability status in real-time.
 */

import { useEffect, useRef } from "react";
import { collection, query, where, documentId, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useProvider } from "../contexts/UnifiedUserContext";
import { showInfo, showSuccess } from "../lib/toast";

interface ProviderStatus {
  id: string;
  name: string;
  availability: "available" | "busy" | "offline";
  busyReason?: string;
}

/**
 * Hook to show notifications when sibling providers change their status
 * Should be used in a component that's always mounted (e.g., Layout)
 */
export function useSiblingStatusNotifications() {
  const { linkedProviders, activeProvider, loading } = useProvider();

  // Track previous statuses to detect changes
  const previousStatusesRef = useRef<Map<string, ProviderStatus>>(new Map());
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    // Don't run until we have loaded providers
    if (loading || linkedProviders.length <= 1) {
      return;
    }

    // Get sibling IDs (exclude active provider)
    const siblingIds = linkedProviders
      .filter(p => p.id !== activeProvider?.id)
      .map(p => p.id);

    if (siblingIds.length === 0) {
      return;
    }

    // Set up real-time listener for sibling providers
    const providersRef = collection(db, "providers");

    // Firestore 'in' queries are limited to 10 items
    const chunks: string[][] = [];
    for (let i = 0; i < siblingIds.length; i += 10) {
      chunks.push(siblingIds.slice(i, i + 10));
    }

    const unsubscribes: (() => void)[] = [];

    for (const chunk of chunks) {
      const q = query(providersRef, where(documentId(), "in", chunk));

      const unsub = onSnapshot(q, (snapshot) => {
        for (const doc of snapshot.docs) {
          const data = doc.data();
          const currentStatus: ProviderStatus = {
            id: doc.id,
            name: data.name || "Collègue",
            availability: data.availability || "available",
            busyReason: data.busyReason,
          };

          const previousStatus = previousStatusesRef.current.get(doc.id);

          // Skip initial load - we don't want notifications on page load
          if (!isInitialLoadRef.current && previousStatus) {
            // Check if status changed
            if (previousStatus.availability !== currentStatus.availability) {
              // Sibling became busy
              if (currentStatus.availability === "busy") {
                const reason = currentStatus.busyReason === "call_in_progress"
                  ? "est en appel"
                  : "est occupé(e)";
                showInfo(`📞 ${currentStatus.name} ${reason}`, {
                  duration: 5000,
                  id: `sibling-busy-${doc.id}`,
                });
              }
              // Sibling became available
              else if (currentStatus.availability === "available" && previousStatus.availability === "busy") {
                showSuccess(`✅ ${currentStatus.name} est de nouveau disponible`, {
                  duration: 4000,
                  id: `sibling-available-${doc.id}`,
                });
              }
            }
          }

          // Update tracked status
          previousStatusesRef.current.set(doc.id, currentStatus);
        }

        // Mark initial load as complete after first snapshot
        if (isInitialLoadRef.current) {
          isInitialLoadRef.current = false;
        }
      }, (error) => {
        console.error("[useSiblingStatusNotifications] Error listening to sibling status:", error);
      });

      unsubscribes.push(unsub);
    }

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [linkedProviders, activeProvider?.id, loading]);

  // Reset on provider change
  useEffect(() => {
    if (activeProvider?.id) {
      // Clear previous statuses when active provider changes
      // This prevents stale notifications
      previousStatusesRef.current.clear();
      isInitialLoadRef.current = true;
    }
  }, [activeProvider?.id]);
}

export default useSiblingStatusNotifications;
