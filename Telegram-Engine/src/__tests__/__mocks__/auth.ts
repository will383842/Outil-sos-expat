import { vi } from "vitest";
import type { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";

/**
 * In tests the authenticateUser hook is a no-op so we can
 * exercise route handlers without needing real JWTs.
 */
export async function authenticateUser(
  _request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  // pass-through in tests
}

export async function registerJwt(_app: FastifyInstance): Promise<void> {
  // no-op in tests
}

export function parseIdParam(raw: string): number {
  const id = parseInt(raw, 10);
  if (Number.isNaN(id)) {
    const err = new Error(`Invalid ID parameter: "${raw}"`) as Error & {
      statusCode: number;
    };
    err.statusCode = 400;
    throw err;
  }
  return id;
}
