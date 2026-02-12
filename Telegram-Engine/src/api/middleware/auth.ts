import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fastifyJwt from "@fastify/jwt";
import { logger } from "../../utils/logger.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { id: number; email: string; role: string };
    user: { id: number; email: string; role: string };
  }
}

export async function registerJwt(app: FastifyInstance): Promise<void> {
  const secret = process.env["JWT_SECRET"];
  if (!secret) {
    logger.fatal("JWT_SECRET environment variable is required");
    process.exit(1);
  }
  if (secret.length < 32) {
    logger.fatal(
      `JWT_SECRET must be at least 32 characters (current: ${secret.length}). Generate one with: openssl rand -base64 32`
    );
    process.exit(1);
  }

  await app.register(fastifyJwt, {
    secret,
    sign: { expiresIn: "24h" },
  });
}

export async function authenticateUser(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Invalid or missing authentication token",
    });
  }
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
