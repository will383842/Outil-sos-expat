// src/services/backupService.ts
import { getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy,
  DocumentData,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/config/firebase";

export type BackupRow = {
  id: string;
  type: string;
  status: "pending" | "completed" | "failed";
  createdAt?: unknown;
  completedAt?: unknown;
  createdBy?: string;
  artifacts?: Record<string, string>;
  error?: string;
  prefix?: string;
};

export type BackupSchedule = {
  schedule: string;
  timeZone: string;
};

export type RestoreParts = {
  firestore?: boolean;
  storage?: boolean;
  auth?: "none" | "basic" | "full";
};

// ---- Firestore subscription ----
export function subscribeBackups(cb: (rows: BackupRow[]) => void): () => void {
  const db = getFirestore();
  const col = collection(db, "backups");
  const q = query(col, orderBy("createdAt", "desc"));
  const unsub = onSnapshot(q, (snap) => {
    const list: BackupRow[] = snap.docs.map((d) => {
      const data = d.data() as DocumentData;
      return {
        id: d.id,
        type: data.type ?? "manual",
        status: data.status ?? "pending",
        createdAt: data.createdAt,
        completedAt: data.completedAt,
        createdBy: data.createdBy,
        artifacts: data.artifacts ?? {},
        error: data.error,
        prefix: data.prefix,
      };
    });
    cb(list);
  });
  return unsub;
}

// ---- Callables ----
// AUDIT-FIX C1: Renamed to match actual backend function names from index.ts
export async function startBackup() {
  const call = httpsCallable(functions, "adminCreateManualBackup");
  return (await call()).data as { ok: boolean };
}

// AUDIT-FIX C1: No backend equivalent exists for getBackupSchedule
export async function getBackupSchedule() {
  console.warn("[backupService] getBackupSchedule: No backend function exists");
  return { schedule: "", timeZone: "Europe/Brussels", uri: null } as Partial<BackupSchedule> & { uri?: string | null };
}

// AUDIT-FIX C1: No backend equivalent exists for updateBackupSchedule
export async function updateBackupSchedule(_cron: string, _timeZone: string) {
  console.warn("[backupService] updateBackupSchedule: No backend function exists");
  return { ok: false };
}

// AUDIT-FIX C1: No backend equivalent exists for "test"
export async function deploymentTest() {
  console.warn("[backupService] deploymentTest: No backend function exists");
  return { ok: false };
}

// AUDIT-FIX C1: Renamed to match actual backend function name
export async function restoreFromBackup(prefix: string, parts: RestoreParts) {
  const call = httpsCallable(functions, "adminRestoreFirestore");
  return (await call({ prefix, parts })).data as { ok: boolean };
}

// AUDIT-FIX C1: Renamed to match actual backend function name
export async function deleteBackup(id: string) {
  const call = httpsCallable(functions, "adminDeleteBackup");
  return (await call({ docId: id })).data as { ok: boolean };
}

export function openTestBackupHttp() {
  if (typeof window === "undefined") return;
  // backend expose "testBackup" (pas "backupTest")
  const app = getApp();
  const projectId =
    ((app.options as any)?.projectId as string | undefined) ||
    (import.meta as any)?.env?.VITE_FIREBASE_PROJECT_ID ||
    "demo-project";
  const region =
    (import.meta as any)?.env?.VITE_FUNCTIONS_REGION || "europe-west1";
  const url = `https://${region}-${projectId}.cloudfunctions.net/testBackup`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// ---- Admin elevation ----

// Rate limiting state for grantAdminIfToken
const adminTokenAttempts: { timestamps: number[] } = { timestamps: [] };
const MAX_ATTEMPTS_PER_MINUTE = 3;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

// Token validation constants
const MIN_TOKEN_LENGTH = 32;
const MAX_TOKEN_LENGTH = 256;
const TOKEN_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * Validates the admin token format
 * @throws Error if token format is invalid
 */
function validateTokenFormat(token: string): void {
  if (!token || typeof token !== "string") {
    throw new Error("Token is required and must be a string");
  }

  const trimmedToken = token.trim();

  if (trimmedToken.length < MIN_TOKEN_LENGTH) {
    throw new Error(
      `Token must be at least ${MIN_TOKEN_LENGTH} characters long`
    );
  }

  if (trimmedToken.length > MAX_TOKEN_LENGTH) {
    throw new Error(`Token must not exceed ${MAX_TOKEN_LENGTH} characters`);
  }

  if (!TOKEN_PATTERN.test(trimmedToken)) {
    throw new Error(
      "Token contains invalid characters. Only alphanumeric characters, hyphens, and underscores are allowed"
    );
  }
}

/**
 * Checks rate limiting for admin token attempts
 * @throws Error if rate limit exceeded
 */
function checkRateLimit(): void {
  const now = Date.now();

  // Clean up old timestamps outside the window
  adminTokenAttempts.timestamps = adminTokenAttempts.timestamps.filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );

  if (adminTokenAttempts.timestamps.length >= MAX_ATTEMPTS_PER_MINUTE) {
    const oldestAttempt = adminTokenAttempts.timestamps[0];
    const waitTime = Math.ceil(
      (RATE_LIMIT_WINDOW_MS - (now - oldestAttempt)) / 1000
    );
    throw new Error(
      `Too many attempts. Please wait ${waitTime} seconds before trying again`
    );
  }

  // Record this attempt
  adminTokenAttempts.timestamps.push(now);
}

/**
 * Checks if the user is currently authenticated
 * @throws Error if user is not authenticated
 */
async function checkUserAuthenticated(): Promise<void> {
  // Dynamic import to avoid circular dependencies
  const { getAuth } = await import("firebase/auth");
  const auth = getAuth();

  if (!auth.currentUser) {
    throw new Error(
      "User must be authenticated before requesting admin privileges"
    );
  }
}

/**
 * Grant admin privileges using a secure token
 * Includes validation, rate limiting, and authentication checks
 *
 * AUDIT-FIX C1: No backend function "grantAdminIfToken" exists in index.ts.
 * This function will always fail. Kept for UI compatibility but logs a warning.
 */
export async function grantAdminIfToken(
  token: string
): Promise<{ ok: boolean }> {
  // 1. Check user is authenticated first
  await checkUserAuthenticated();

  // 2. Check rate limiting
  checkRateLimit();

  // 3. Validate token format
  validateTokenFormat(token);

  // 4. AUDIT-FIX C1: Backend function does not exist — call will fail with not-found
  console.warn("[backupService] grantAdminIfToken: No backend function exists");
  const call = httpsCallable(functions, "grantAdminIfToken");
  return (await call({ token: token.trim() })).data as { ok: boolean };
}
