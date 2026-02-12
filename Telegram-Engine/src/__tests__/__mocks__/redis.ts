import { vi } from "vitest";

export const redis = {
  ping: vi.fn().mockResolvedValue("PONG"),
  quit: vi.fn(),
  on: vi.fn(),
};

export function getRedisConnection() {
  return {
    host: "127.0.0.1",
    port: 6379,
    password: undefined,
    db: 0,
  };
}

export async function disconnectRedis(): Promise<void> {
  // no-op in tests
}
