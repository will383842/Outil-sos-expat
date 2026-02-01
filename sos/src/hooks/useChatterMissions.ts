/**
 * useChatterMissions Hook
 *
 * Manages daily mission progress for chatters:
 * - Tracks share, login, message, video, call actions
 * - Stores progress in localStorage and syncs to Firestore
 * - Resets daily at midnight
 * - Computes completed missions and total XP
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

// ============================================================================
// TYPES
// ============================================================================

interface MissionProgress {
  date: string; // YYYY-MM-DD to reset daily
  sharesCount: number;
  loggedInToday: boolean;
  messagesSentToday: number;
  videoWatched: boolean;
  callsToday: number;
}

export interface Mission {
  id: string;
  title: string;
  target: number;
  current: number;
  completed: boolean;
  autoTracked: boolean;
  xp: number;
}

interface UseChatterMissionsReturn {
  progress: MissionProgress;
  isLoading: boolean;
  // Actions
  trackShare: () => void;
  trackLogin: () => void;
  trackMessageSent: () => void;
  trackVideoWatched: () => void;
  trackCall: () => void;
  // Computed
  missions: Mission[];
  completedCount: number;
  totalXP: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MISSIONS_CONFIG = [
  { id: "share", title: "Partage ton lien 3 fois", target: 3, xp: 50, autoTracked: true },
  { id: "login", title: "Connecte-toi a l'app", target: 1, xp: 15, autoTracked: true },
  { id: "message", title: "Envoie 1 message a un equipier", target: 1, xp: 30, autoTracked: true },
  { id: "video", title: "Regarde la video formation", target: 1, xp: 25, autoTracked: true },
  { id: "call", title: "Genere 1 appel client", target: 1, xp: 100, autoTracked: true },
] as const;

const getLocalStorageKey = (date: string) => `chatter_missions_${date}`;

const getTodayDate = (): string => {
  const now = new Date();
  return now.toISOString().split("T")[0]; // YYYY-MM-DD
};

const getDefaultProgress = (date: string): MissionProgress => ({
  date,
  sharesCount: 0,
  loggedInToday: false,
  messagesSentToday: 0,
  videoWatched: false,
  callsToday: 0,
});

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useChatterMissions(): UseChatterMissionsReturn {
  const { user } = useAuth();
  const db = getFirestore();
  const [progress, setProgress] = useState<MissionProgress>(() =>
    getDefaultProgress(getTodayDate())
  );
  const [isLoading, setIsLoading] = useState(true);
  const hasTrackedLoginRef = useRef(false);

  // ============================================================================
  // PERSISTENCE HELPERS
  // ============================================================================

  /**
   * Save progress to localStorage
   */
  const saveToLocalStorage = useCallback((data: MissionProgress) => {
    try {
      const key = getLocalStorageKey(data.date);
      localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      console.error("[useChatterMissions] Error saving to localStorage:", err);
    }
  }, []);

  /**
   * Load progress from localStorage
   */
  const loadFromLocalStorage = useCallback((date: string): MissionProgress | null => {
    try {
      const key = getLocalStorageKey(date);
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored) as MissionProgress;
      }
    } catch (err) {
      console.error("[useChatterMissions] Error loading from localStorage:", err);
    }
    return null;
  }, []);

  /**
   * Save progress to Firestore
   */
  const saveToFirestore = useCallback(
    async (data: MissionProgress) => {
      if (!user?.uid) return;

      try {
        const docRef = doc(db, "chatters", user.uid, "dailyMissions", data.date);
        await setDoc(
          docRef,
          {
            ...data,
            updatedAt: Timestamp.now(),
          },
          { merge: true }
        );
      } catch (err) {
        console.error("[useChatterMissions] Error saving to Firestore:", err);
      }
    },
    [user?.uid, db]
  );

  /**
   * Load progress from Firestore
   */
  const loadFromFirestore = useCallback(
    async (date: string): Promise<MissionProgress | null> => {
      if (!user?.uid) return null;

      try {
        const docRef = doc(db, "chatters", user.uid, "dailyMissions", date);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          return {
            date: data.date,
            sharesCount: data.sharesCount || 0,
            loggedInToday: data.loggedInToday || false,
            messagesSentToday: data.messagesSentToday || 0,
            videoWatched: data.videoWatched || false,
            callsToday: data.callsToday || 0,
          };
        }
      } catch (err) {
        console.error("[useChatterMissions] Error loading from Firestore:", err);
      }
      return null;
    },
    [user?.uid, db]
  );

  /**
   * Update progress and persist to both localStorage and Firestore
   */
  const updateProgress = useCallback(
    (updater: (prev: MissionProgress) => MissionProgress) => {
      setProgress((prev) => {
        const today = getTodayDate();
        // If date changed, reset progress
        const currentProgress = prev.date === today ? prev : getDefaultProgress(today);
        const newProgress = updater(currentProgress);

        // Persist to both stores
        saveToLocalStorage(newProgress);
        saveToFirestore(newProgress);

        return newProgress;
      });
    },
    [saveToLocalStorage, saveToFirestore]
  );

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Load progress on mount and handle date reset
   */
  useEffect(() => {
    const loadProgress = async () => {
      setIsLoading(true);
      const today = getTodayDate();

      // Try localStorage first (faster)
      let loadedProgress = loadFromLocalStorage(today);

      // If user is authenticated, try Firestore as fallback
      if (!loadedProgress && user?.uid) {
        loadedProgress = await loadFromFirestore(today);
        // If found in Firestore but not localStorage, sync to localStorage
        if (loadedProgress) {
          saveToLocalStorage(loadedProgress);
        }
      }

      // Use loaded progress or default
      const finalProgress = loadedProgress || getDefaultProgress(today);
      setProgress(finalProgress);
      setIsLoading(false);
    };

    loadProgress();
  }, [user?.uid, loadFromLocalStorage, loadFromFirestore, saveToLocalStorage]);

  /**
   * Auto-track login on initialization (once per session)
   */
  useEffect(() => {
    if (!isLoading && user?.uid && !hasTrackedLoginRef.current) {
      hasTrackedLoginRef.current = true;
      updateProgress((prev) => ({
        ...prev,
        loggedInToday: true,
      }));
    }
  }, [isLoading, user?.uid, updateProgress]);

  /**
   * Check for date change (midnight reset)
   */
  useEffect(() => {
    const checkDateChange = () => {
      const today = getTodayDate();
      if (progress.date !== today) {
        // Date changed, reset progress
        const newProgress = getDefaultProgress(today);
        setProgress(newProgress);
        saveToLocalStorage(newProgress);
        hasTrackedLoginRef.current = false; // Allow tracking login again
      }
    };

    // Check every minute for date change
    const interval = setInterval(checkDateChange, 60000);
    return () => clearInterval(interval);
  }, [progress.date, saveToLocalStorage]);

  // ============================================================================
  // TRACKING ACTIONS
  // ============================================================================

  const trackShare = useCallback(() => {
    updateProgress((prev) => ({
      ...prev,
      sharesCount: prev.sharesCount + 1,
    }));
  }, [updateProgress]);

  const trackLogin = useCallback(() => {
    updateProgress((prev) => ({
      ...prev,
      loggedInToday: true,
    }));
  }, [updateProgress]);

  const trackMessageSent = useCallback(() => {
    updateProgress((prev) => ({
      ...prev,
      messagesSentToday: prev.messagesSentToday + 1,
    }));
  }, [updateProgress]);

  const trackVideoWatched = useCallback(() => {
    updateProgress((prev) => ({
      ...prev,
      videoWatched: true,
    }));
  }, [updateProgress]);

  const trackCall = useCallback(() => {
    updateProgress((prev) => ({
      ...prev,
      callsToday: prev.callsToday + 1,
    }));
  }, [updateProgress]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const missions = useMemo((): Mission[] => {
    return MISSIONS_CONFIG.map((config) => {
      let current = 0;

      switch (config.id) {
        case "share":
          current = progress.sharesCount;
          break;
        case "login":
          current = progress.loggedInToday ? 1 : 0;
          break;
        case "message":
          current = progress.messagesSentToday;
          break;
        case "video":
          current = progress.videoWatched ? 1 : 0;
          break;
        case "call":
          current = progress.callsToday;
          break;
      }

      return {
        id: config.id,
        title: config.title,
        target: config.target,
        current: Math.min(current, config.target), // Cap at target
        completed: current >= config.target,
        autoTracked: config.autoTracked,
        xp: config.xp,
      };
    });
  }, [progress]);

  const completedCount = useMemo(() => {
    return missions.filter((m) => m.completed).length;
  }, [missions]);

  const totalXP = useMemo(() => {
    return missions
      .filter((m) => m.completed)
      .reduce((sum, m) => sum + m.xp, 0);
  }, [missions]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    progress,
    isLoading,
    // Actions
    trackShare,
    trackLogin,
    trackMessageSent,
    trackVideoWatched,
    trackCall,
    // Computed
    missions,
    completedCount,
    totalXP,
  };
}

export default useChatterMissions;
