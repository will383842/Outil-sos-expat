import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger.js";

if (!process.env["DATABASE_URL"]) {
  logger.fatal("DATABASE_URL environment variable is required");
  process.exit(1);
}

export const prisma = new PrismaClient({
  log: [
    { emit: "event", level: "error" },
    { emit: "event", level: "warn" },
  ],
});

prisma.$on("error", (e) => {
  logger.error({ target: e.target, message: e.message }, "Prisma error");
});

prisma.$on("warn", (e) => {
  logger.warn({ target: e.target, message: e.message }, "Prisma warning");
});

export async function disconnectDatabase(): Promise<void> {
  logger.info("Disconnecting database...");
  await prisma.$disconnect();
}
