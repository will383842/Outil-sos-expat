import Redis from "ioredis";
import { logger } from "../utils/logger.js";

const redisUrl = process.env["REDIS_URL"];
if (!redisUrl) {
  logger.fatal("REDIS_URL environment variable is required");
  process.exit(1);
}

export const redis = new (Redis as unknown as typeof Redis.default)(redisUrl, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
});

redis.on("error", (err: Error) => {
  logger.error({ err }, "Redis connection error");
});

redis.on("connect", () => {
  logger.info("Redis connected");
});

export function getRedisConnection() {
  const parsed = new URL(redisUrl!);
  return {
    host: parsed.hostname || "127.0.0.1",
    port: Number(parsed.port) || 6379,
    password: parsed.password || undefined,
    db: Number(parsed.pathname?.slice(1)) || 0,
  };
}

export async function disconnectRedis(): Promise<void> {
  logger.info("Disconnecting Redis...");
  await redis.quit();
}
