/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Stripe Webhook Helpers
 *
 * Shared helpers used by stripeWebhookHandler.ts.
 * These are duplicated from index.ts so the webhook handler can be a standalone module.
 * When index.ts is refactored to import from here, the duplication will be removed.
 */

import * as admin from "firebase-admin";
import Stripe from "stripe";
import type { Request as ExpressRequest, Response } from "express";

import {
  STRIPE_SECRET_KEY_TEST,
  STRIPE_SECRET_KEY_LIVE,
  STRIPE_MODE,
  STRIPE_WEBHOOK_SECRET_TEST,
  STRIPE_WEBHOOK_SECRET_LIVE,
  STRIPE_CONNECT_WEBHOOK_SECRET_TEST,
  STRIPE_CONNECT_WEBHOOK_SECRET_LIVE,
} from "../lib/secrets";

// ====== ULTRA LOGGER STUB (no-op — matches index.ts disabled version) ======
export const ultraLogger = {
  info: (..._args: any[]) => {},
  warn: (..._args: any[]) => {},
  error: (..._args: any[]) => {},
  debug: (..._args: any[]) => {},
  trace: (..._args: any[]) => {},
  traceImport: (..._args: any[]) => {},
};

export const traceFunction = <T extends (...args: any[]) => any>(
  fn: T,
  _functionName?: string,
  _source?: string
): T => fn;

// ====== INTERFACES ======
export interface UltraDebugMetadata {
  sessionId: string;
  requestId: string;
  userId?: string;
  functionName: string;
  startTime: number;
  environment: string;
}

export interface DebuggedRequest extends ExpressRequest {
  debugMetadata?: UltraDebugMetadata;
}

export interface FirebaseRequest extends DebuggedRequest {
  rawBody: Buffer;
}

// ====== STRIPE MODE HELPERS ======
export function isLive(): boolean {
  return (STRIPE_MODE.value() || "test").toLowerCase() === "live";
}

export function getStripeSecretKey(): string {
  return isLive()
    ? STRIPE_SECRET_KEY_LIVE.value() || ""
    : STRIPE_SECRET_KEY_TEST.value() || "";
}

export function getStripeWebhookSecret(): string {
  return isLive()
    ? (STRIPE_WEBHOOK_SECRET_LIVE.value() || "").trim()
    : (STRIPE_WEBHOOK_SECRET_TEST.value() || "").trim();
}

export function getStripeConnectWebhookSecret(): string {
  return isLive()
    ? (STRIPE_CONNECT_WEBHOOK_SECRET_LIVE.value() || "").trim()
    : (STRIPE_CONNECT_WEBHOOK_SECRET_TEST.value() || "").trim();
}

// ====== STRIPE SINGLETON ======
let stripe: Stripe | null = null;

export const getStripe = traceFunction(
  (): Stripe | null => {
    if (!stripe) {
      ultraLogger.info("STRIPE_INIT", "Initialisation de Stripe", {
        mode: isLive() ? "live" : "test",
      });

      let stripeSecretKey = "";
      try {
        stripeSecretKey = getStripeSecretKey();
        ultraLogger.debug(
          "STRIPE_INIT",
          "Cle Stripe recuperee via Secret Manager",
          {
            mode: isLive() ? "live" : "test",
            keyPrefix: stripeSecretKey?.slice(0, 7) + "...",
          }
        );
      } catch (secretError) {
        ultraLogger.error("STRIPE_INIT", "Secret Stripe non configure", {
          error:
            secretError instanceof Error
              ? secretError.message
              : String(secretError),
        });
        return null;
      }

      if (stripeSecretKey && stripeSecretKey.startsWith("sk_")) {
        try {
          stripe = new Stripe(stripeSecretKey, {
            apiVersion: "2023-10-16" as Stripe.LatestApiVersion,
          });
          ultraLogger.info("STRIPE_INIT", "Stripe configure avec succes", {
            mode: isLive() ? "live" : "test",
          });
        } catch (stripeError) {
          ultraLogger.error(
            "STRIPE_INIT",
            "Erreur configuration Stripe",
            {
              error:
                stripeError instanceof Error
                  ? stripeError.message
                  : String(stripeError),
            },
            stripeError instanceof Error ? stripeError : undefined
          );
          stripe = null;
        }
      } else {
        ultraLogger.warn(
          "STRIPE_INIT",
          "Stripe non configure - Secret Key manquante ou invalide",
          { mode: isLive() ? "live" : "test" }
        );
      }
    }

    return stripe;
  },
  "getStripe",
  "STRIPE_WEBHOOK_HELPERS"
);

// ====== FIREBASE INITIALIZATION ======
let isFirebaseInitialized = false;
let db: admin.firestore.Firestore;
let initializationError: Error | null = null;

export const initializeFirebase = traceFunction(
  () => {
    if (!isFirebaseInitialized && !initializationError) {
      try {
        ultraLogger.info("FIREBASE_INIT", "Debut d'initialisation Firebase");

        const startTime = Date.now();

        if (!admin.apps.length) {
          ultraLogger.debug(
            "FIREBASE_INIT",
            "Aucune app Firebase detectee, initialisation..."
          );
          admin.initializeApp();
          ultraLogger.info("FIREBASE_INIT", "Firebase Admin SDK initialise");
        } else {
          ultraLogger.debug(
            "FIREBASE_INIT",
            "Firebase deja initialise, utilisation de l'instance existante"
          );
        }

        db = admin.firestore();
        ultraLogger.debug("FIREBASE_INIT", "Instance Firestore recuperee");

        try {
          db.settings({ ignoreUndefinedProperties: true });
          ultraLogger.info(
            "FIREBASE_INIT",
            "Firestore configure avec ignoreUndefinedProperties: true"
          );
        } catch (settingsError) {
          ultraLogger.warn(
            "FIREBASE_INIT",
            "Firestore deja configure (normal)",
            {
              error:
                settingsError instanceof Error
                  ? settingsError.message
                  : String(settingsError),
            }
          );
        }

        const initTime = Date.now() - startTime;
        isFirebaseInitialized = true;

        ultraLogger.info("FIREBASE_INIT", "Firebase initialise avec succes", {
          initializationTime: `${initTime}ms`,
          projectId: admin.app().options.projectId,
          databaseURL: admin.app().options.databaseURL,
          storageBucket: admin.app().options.storageBucket,
        });
      } catch (error) {
        initializationError =
          error instanceof Error ? error : new Error(String(error));
        ultraLogger.error(
          "FIREBASE_INIT",
          "Erreur critique lors de l'initialisation Firebase",
          {
            error: initializationError.message,
            stack: initializationError.stack,
          },
          initializationError
        );
        throw initializationError;
      }
    } else if (initializationError) {
      ultraLogger.error(
        "FIREBASE_INIT",
        "Tentative d'utilisation apres erreur d'initialisation",
        {
          previousError: initializationError.message,
        }
      );
      throw initializationError;
    }

    return db;
  },
  "initializeFirebase",
  "STRIPE_WEBHOOK_HELPERS"
);

// ====== DEBUG METADATA ======
export function createDebugMetadata(
  functionName: string,
  userId?: string
): UltraDebugMetadata {
  return {
    sessionId: `${functionName}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    functionName,
    startTime: Date.now(),
    environment: process.env.NODE_ENV || "development",
  };
}

export function logFunctionStart(
  metadata: UltraDebugMetadata,
  data?: unknown
) {
  ultraLogger.info(
    `FUNCTION_${metadata.functionName.toUpperCase()}_START`,
    `Debut d'execution de ${metadata.functionName}`,
    {
      sessionId: metadata.sessionId,
      requestId: metadata.requestId,
      userId: metadata.userId,
      data: data ? JSON.stringify(data, null, 2) : undefined,
      memoryUsage: process.memoryUsage(),
    }
  );
}

export function logFunctionEnd(
  metadata: UltraDebugMetadata,
  result?: unknown,
  error?: Error
) {
  const executionTime = Date.now() - metadata.startTime;

  if (error) {
    ultraLogger.error(
      `FUNCTION_${metadata.functionName.toUpperCase()}_ERROR`,
      `Erreur dans ${metadata.functionName}`,
      {
        sessionId: metadata.sessionId,
        requestId: metadata.requestId,
        userId: metadata.userId,
        executionTime: `${executionTime}ms`,
        error: error.message,
        stack: error.stack,
        memoryUsage: process.memoryUsage(),
      },
      error
    );
  } else {
    ultraLogger.info(
      `FUNCTION_${metadata.functionName.toUpperCase()}_END`,
      `Fin d'execution de ${metadata.functionName}`,
      {
        sessionId: metadata.sessionId,
        requestId: metadata.requestId,
        userId: metadata.userId,
        executionTime: `${executionTime}ms`,
        result: result ? JSON.stringify(result, null, 2) : undefined,
        memoryUsage: process.memoryUsage(),
      }
    );
  }
}

// ====== HTTP FUNCTION WRAPPER ======
export function wrapHttpFunction(
  functionName: string,
  originalFunction: (req: FirebaseRequest, res: Response) => Promise<void>
): any {
  return async (req: any, res: any) => {
    const metadata = createDebugMetadata(functionName);
    const firebaseReq = req as unknown as FirebaseRequest;
    (firebaseReq as DebuggedRequest).debugMetadata = metadata;

    logFunctionStart(metadata, {
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query,
      body: req.body,
    });

    try {
      await originalFunction(firebaseReq, res);
      logFunctionEnd(metadata, { statusCode: res.statusCode });
    } catch (error) {
      logFunctionEnd(metadata, undefined, error as Error);
      throw error;
    }
  };
}
