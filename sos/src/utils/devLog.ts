/**
 * Dev-only console wrapper.
 * In production, all calls are silenced (no-op).
 * In development, delegates to console.
 *
 * Usage: import { devLog, devWarn, devError } from '@/utils/devLog';
 *        devLog("[AuthContext] some debug info", data);
 *
 * AUDIT FIX 2026-02-28: Prevents leaking debug info to production console.
 */

const isDev = import.meta.env.DEV;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LogFn = (...args: any[]) => void;

const noop: LogFn = () => {};

export const devLog: LogFn = isDev ? console.log.bind(console) : noop;
export const devWarn: LogFn = isDev ? console.warn.bind(console) : noop;
export const devError: LogFn = isDev ? console.error.bind(console) : noop;
export const devInfo: LogFn = isDev ? console.info.bind(console) : noop;
export const devDebug: LogFn = isDev ? console.debug.bind(console) : noop;
