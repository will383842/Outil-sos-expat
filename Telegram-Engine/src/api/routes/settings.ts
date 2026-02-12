import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database.js";
import { authenticateUser } from "../middleware/auth.js";
import { validateBot, getUpdates } from "../../services/telegram.js";

interface UpdateSettingBody {
  key: string;
  value: unknown;
}

export default async function settingsRoutes(
  app: FastifyInstance
): Promise<void> {
  app.addHook("preHandler", authenticateUser);

  // GET / — all settings
  app.get("/", async (_request, reply) => {
    const settings = await prisma.appSetting.findMany();
    const mapped: Record<string, unknown> = {};
    for (const s of settings) {
      mapped[s.key] = s.value;
    }
    return reply.send({ data: mapped });
  });

  // PUT / — upsert a setting
  app.put<{ Body: UpdateSettingBody }>("/", async (request, reply) => {
    const { key, value } = request.body;

    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value: value as Prisma.InputJsonValue },
      update: { value: value as Prisma.InputJsonValue },
    });

    return reply.send({ data: { ok: true } });
  });

  // POST /validate-bot — check Telegram bot token
  app.post("/validate-bot", async (_request, reply) => {
    const result = await validateBot();
    return reply.send({ data: result });
  });

  // POST /detect-chat-id — get recent updates to detect chat ID
  app.post("/detect-chat-id", async (_request, reply) => {
    const result = await getUpdates();

    if (!result.ok) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Failed",
        message: result.error,
      });
    }

    const chats: Array<{
      chatId: string;
      username?: string;
      firstName?: string;
      chatType: string;
    }> = [];

    for (const update of result.updates ?? []) {
      const msg = update["message"] as Record<string, unknown> | undefined;
      if (msg) {
        const chat = msg["chat"] as Record<string, unknown>;
        chats.push({
          chatId: String(chat["id"]),
          username: chat["username"] as string | undefined,
          firstName: chat["first_name"] as string | undefined,
          chatType: chat["type"] as string,
        });
      }
    }

    // Deduplicate by chatId
    const unique = [...new Map(chats.map((c) => [c.chatId, c])).values()];

    return reply.send({ data: { chats: unique, updatesCount: result.updates?.length ?? 0 } });
  });
}
