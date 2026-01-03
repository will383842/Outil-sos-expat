/**
 * Production Logger - Système de logging conditionnel
 *
 * Ce module permet d'activer/désactiver les logs de debug en production
 * sans impacter les performances quand désactivé.
 *
 * Usage:
 *   import { logger, LogLevel } from './utils/productionLogger';
 *   logger.debug('Payment', 'Processing payment', { amount: 100 });
 *   logger.info('Payment', 'Payment completed');
 *   logger.warn('Payment', 'Rate limit approaching');
 *   logger.error('Payment', 'Payment failed', error);
 *
 * Configuration:
 *   - Env: ENABLE_DEBUG_LOGS=true|false
 *   - Firestore: admin_config/logging { enableDebugLogs: boolean, logLevel: string }
 *
 * @version 2.0.0 - Phase 2 Production Logging System
 */

import { getFirestore } from "firebase-admin/firestore";
import { getApps, initializeApp } from "firebase-admin/app";

// =====================
// CONFIGURATION
// =====================

export enum LogLevel {
  NONE = 0,      // Aucun log
  ERROR = 1,     // Seulement erreurs
  WARN = 2,      // Erreurs + warnings
  INFO = 3,      // Erreurs + warnings + info
  DEBUG = 4,     // Tout sauf trace
  TRACE = 5      // Absolument tout
}

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  persistToFirestore: boolean;
  maskSensitiveData: boolean;
  maxDataLength: number;
  excludePatterns: string[];  // Patterns à exclure même si enabled
  includePatterns: string[];  // Patterns à inclure même si disabled
}

// Configuration par défaut - SÉCURISÉE pour production
const DEFAULT_CONFIG: LoggerConfig = {
  enabled: process.env.ENABLE_DEBUG_LOGS === 'true',
  level: LogLevel.INFO,
  persistToFirestore: process.env.NODE_ENV === 'production',
  maskSensitiveData: true,
  maxDataLength: 5000,
  excludePatterns: [],
  includePatterns: ['CRITICAL', 'SECURITY', 'PAYMENT_ERROR']
};

// =====================
// SENSITIVE DATA MASKING
// =====================

const SENSITIVE_KEYS = [
  'password', 'secret', 'token', 'apiKey', 'api_key', 'accessToken',
  'refreshToken', 'privateKey', 'private_key', 'authorization',
  'cardNumber', 'cvv', 'cvc', 'expiry', 'ssn', 'socialSecurity',
  'phone', 'phoneNumber', 'email', 'address', 'ip', 'ipAddress'
];

const ID_PATTERNS = [
  /^(pi_|pm_|ch_|re_|tr_|acct_|cus_|sub_|in_|ii_|txn_)/, // Stripe IDs
  /^[A-Z0-9]{10,}$/, // Generic long IDs
  /^call_session_/,
  /^order_/,
  /uid$/i
];

function maskValue(key: string, value: unknown): unknown {
  if (typeof value !== 'string') return value;

  // Masquer les clés sensibles complètement
  const keyLower = key.toLowerCase();
  if (SENSITIVE_KEYS.some(sk => keyLower.includes(sk))) {
    return '[MASKED]';
  }

  // Tronquer les IDs longs (garder 8 premiers chars)
  if (ID_PATTERNS.some(p => p.test(value))) {
    return value.length > 12 ? `${value.substring(0, 8)}...` : value;
  }

  return value;
}

function maskSensitiveData(data: unknown): unknown {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item));
  }

  if (typeof data === 'object') {
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (typeof value === 'object' && value !== null) {
        masked[key] = maskSensitiveData(value);
      } else {
        masked[key] = maskValue(key, value);
      }
    }
    return masked;
  }

  return data;
}

// =====================
// CIRCULAR REFERENCE HANDLER
// =====================

function safeStringify(obj: unknown, maxLength: number = 5000): string {
  const seen = new WeakSet();
  try {
    const result = JSON.stringify(obj, (_key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      if (value instanceof Error) {
        return { name: value.name, message: value.message, stack: value.stack?.slice(0, 500) };
      }
      if (typeof value === 'function') return '[Function]';
      if (typeof value === 'bigint') return value.toString();
      return value;
    }, 2);
    return result.length > maxLength ? result.slice(0, maxLength) + '...[truncated]' : result;
  } catch {
    return `[Unstringifiable: ${typeof obj}]`;
  }
}

// =====================
// PRODUCTION LOGGER CLASS
// =====================

class ProductionLogger {
  private static instance: ProductionLogger | null = null;
  private config: LoggerConfig;
  private db: FirebaseFirestore.Firestore | null = null;
  private configCacheTime = 0;
  private readonly CONFIG_CACHE_TTL = 60000; // 1 minute cache

  private constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.initializeFirestore();
    this.loadRemoteConfig();
  }

  static getInstance(): ProductionLogger {
    if (!ProductionLogger.instance) {
      ProductionLogger.instance = new ProductionLogger();
    }
    return ProductionLogger.instance;
  }

  private initializeFirestore(): void {
    try {
      if (!getApps().length) {
        initializeApp();
      }
      this.db = getFirestore();
    } catch (err) {
      // Silently fail - will use default config
      console.warn('[ProductionLogger] Firestore init failed, using defaults');
    }
  }

  /**
   * Charge la configuration depuis Firestore (avec cache)
   * Collection: admin_config/logging
   */
  private async loadRemoteConfig(): Promise<void> {
    const now = Date.now();
    if (now - this.configCacheTime < this.CONFIG_CACHE_TTL) return;

    try {
      if (!this.db) return;

      const doc = await this.db.collection('admin_config').doc('logging').get();
      if (doc.exists) {
        const data = doc.data();
        if (data) {
          this.config = {
            ...this.config,
            enabled: data.enableDebugLogs ?? this.config.enabled,
            level: this.parseLogLevel(data.logLevel) ?? this.config.level,
            persistToFirestore: data.persistToFirestore ?? this.config.persistToFirestore,
            maskSensitiveData: data.maskSensitiveData ?? this.config.maskSensitiveData,
            excludePatterns: data.excludePatterns ?? this.config.excludePatterns,
            includePatterns: data.includePatterns ?? this.config.includePatterns
          };
        }
      }
      this.configCacheTime = now;
    } catch {
      // Silently fail - use cached/default config
    }
  }

  private parseLogLevel(level: string | undefined): LogLevel | null {
    if (!level) return null;
    const map: Record<string, LogLevel> = {
      'NONE': LogLevel.NONE,
      'ERROR': LogLevel.ERROR,
      'WARN': LogLevel.WARN,
      'INFO': LogLevel.INFO,
      'DEBUG': LogLevel.DEBUG,
      'TRACE': LogLevel.TRACE
    };
    return map[level.toUpperCase()] ?? null;
  }

  /**
   * Vérifie si un log doit être affiché selon la config
   */
  private shouldLog(level: LogLevel, source: string): boolean {
    // Toujours logger les patterns critiques
    if (this.config.includePatterns.some(p => source.includes(p))) {
      return true;
    }

    // Exclure certains patterns même si enabled
    if (this.config.excludePatterns.some(p => source.includes(p))) {
      return false;
    }

    // Vérifier le niveau de log
    if (!this.config.enabled) return level <= LogLevel.ERROR;
    return level <= this.config.level;
  }

  /**
   * Formatte un log avec timestamp et contexte
   */
  private formatLog(
    level: string,
    source: string,
    message: string,
    data?: unknown
  ): string {
    const timestamp = new Date().toISOString();
    const emoji = { ERROR: '🔴', WARN: '🟡', INFO: '🟢', DEBUG: '🔵', TRACE: '⚪' }[level] || '⚫';

    let log = `${emoji} [${timestamp}] [${level}] [${source}] ${message}`;

    if (data !== undefined) {
      const processedData = this.config.maskSensitiveData ? maskSensitiveData(data) : data;
      log += `\n    DATA: ${safeStringify(processedData, this.config.maxDataLength)}`;
    }

    return log;
  }

  /**
   * Persiste le log dans Firestore (async, non-bloquant)
   */
  private persistLog(level: string, source: string, message: string, data?: unknown): void {
    if (!this.config.persistToFirestore || !this.db) return;
    if (level === 'DEBUG' || level === 'TRACE') return; // Ne pas persister debug/trace

    // Fire and forget - ne pas bloquer le thread principal
    setImmediate(async () => {
      try {
        const processedData = this.config.maskSensitiveData ? maskSensitiveData(data) : data;
        await this.db!.collection('production_logs').add({
          level,
          source,
          message,
          data: processedData ? safeStringify(processedData, 2000) : null,
          timestamp: new Date(),
          environment: process.env.NODE_ENV || 'unknown'
        });
      } catch {
        // Silently fail
      }
    });
  }

  // =====================
  // PUBLIC API
  // =====================

  /**
   * Log niveau ERROR - Toujours affiché
   */
  error(source: string, message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.ERROR, source)) {
      console.error(this.formatLog('ERROR', source, message, data));
      this.persistLog('ERROR', source, message, data);
    }
  }

  /**
   * Log niveau WARN - Affiché si level >= WARN
   */
  warn(source: string, message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.WARN, source)) {
      console.warn(this.formatLog('WARN', source, message, data));
      this.persistLog('WARN', source, message, data);
    }
  }

  /**
   * Log niveau INFO - Affiché si level >= INFO
   */
  info(source: string, message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.INFO, source)) {
      console.info(this.formatLog('INFO', source, message, data));
      this.persistLog('INFO', source, message, data);
    }
  }

  /**
   * Log niveau DEBUG - Affiché seulement si enabled && level >= DEBUG
   */
  debug(source: string, message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.DEBUG, source)) {
      console.log(this.formatLog('DEBUG', source, message, data));
      // DEBUG n'est pas persisté en Firestore
    }
  }

  /**
   * Log niveau TRACE - Le plus verbeux, pour debugging détaillé
   */
  trace(source: string, message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.TRACE, source)) {
      console.log(this.formatLog('TRACE', source, message, data));
      // TRACE n'est pas persisté en Firestore
    }
  }

  /**
   * Log conditionnel - ne loggue que si condition est vraie
   */
  if(condition: boolean, level: LogLevel, source: string, message: string, data?: unknown): void {
    if (!condition) return;
    switch (level) {
      case LogLevel.ERROR: this.error(source, message, data); break;
      case LogLevel.WARN: this.warn(source, message, data); break;
      case LogLevel.INFO: this.info(source, message, data); break;
      case LogLevel.DEBUG: this.debug(source, message, data); break;
      case LogLevel.TRACE: this.trace(source, message, data); break;
    }
  }

  /**
   * Timer pour mesurer les performances
   */
  time(label: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.debug('PERF', `${label} completed`, { durationMs: Math.round(duration * 100) / 100 });
    };
  }

  /**
   * Groupe de logs (pour structurer les outputs)
   */
  group(label: string): { end: () => void } {
    if (this.config.enabled) {
      console.group(`📁 ${label}`);
    }
    return {
      end: () => {
        if (this.config.enabled) {
          console.groupEnd();
        }
      }
    };
  }

  /**
   * Change le niveau de log à runtime
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
    console.log(`[ProductionLogger] Log level changed to ${LogLevel[level]}`);
  }

  /**
   * Active/désactive les logs à runtime
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(`[ProductionLogger] Logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Retourne la configuration actuelle
   */
  getConfig(): Readonly<LoggerConfig> {
    return { ...this.config };
  }

  /**
   * Force le rechargement de la config Firestore
   */
  async refreshConfig(): Promise<void> {
    this.configCacheTime = 0;
    await this.loadRemoteConfig();
  }
}

// =====================
// EXPORTS
// =====================

// Instance singleton
export const logger = ProductionLogger.getInstance();

// Wrapper pour les console.log existants (migration facile)
export const DEBUG = {
  log: (source: string, message: string, data?: unknown) => logger.debug(source, message, data),
  info: (source: string, message: string, data?: unknown) => logger.info(source, message, data),
  warn: (source: string, message: string, data?: unknown) => logger.warn(source, message, data),
  error: (source: string, message: string, data?: unknown) => logger.error(source, message, data),
  trace: (source: string, message: string, data?: unknown) => logger.trace(source, message, data)
};

// Alias pour migration rapide
export const dbg = logger.debug.bind(logger);
export const inf = logger.info.bind(logger);
export const wrn = logger.warn.bind(logger);
export const err = logger.error.bind(logger);

// Type exports
export type { LoggerConfig };
