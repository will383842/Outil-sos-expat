import type { FastifyInstance } from "fastify";
import { prisma } from "../../config/database.js";
import { authenticateUser, parseIdParam } from "../middleware/auth.js";
import { sendMessage } from "../../services/telegram.js";

interface TemplateParams {
  id: string;
}

interface CreateTemplateBody {
  eventType: string;
  language: string;
  name: string;
  content: string;
  parseMode?: string;
  variables?: string[];
}

interface TestSendBody {
  chatId: string;
  content: string;
  parseMode?: string;
}

export default async function templatesRoutes(
  app: FastifyInstance
): Promise<void> {
  app.addHook("preHandler", authenticateUser);

  // GET / — list all templates grouped by event type
  app.get("/", async (_request, reply) => {
    const templates = await prisma.template.findMany({
      orderBy: [{ eventType: "asc" }, { language: "asc" }],
    });

    // Group by eventType
    const grouped: Record<string, typeof templates> = {};
    for (const t of templates) {
      if (!grouped[t.eventType]) grouped[t.eventType] = [];
      grouped[t.eventType].push(t);
    }

    return reply.send({ data: grouped });
  });

  // POST / — create template
  app.post<{ Body: CreateTemplateBody }>("/", async (request, reply) => {
    const body = request.body;

    const template = await prisma.template.create({
      data: {
        eventType: body.eventType,
        language: body.language,
        name: body.name,
        content: body.content,
        parseMode: body.parseMode ?? "HTML",
        variables: body.variables ?? [],
      },
    });

    return reply.status(201).send({ data: template });
  });

  // PUT /:id — update template
  app.put<{ Params: TemplateParams; Body: Partial<CreateTemplateBody> & { isActive?: boolean } }>(
    "/:id",
    async (request, reply) => {
      const id = parseIdParam(request.params.id);
      const body = request.body;

      const updateData: Record<string, unknown> = {};
      if (body.name !== undefined) updateData["name"] = body.name;
      if (body.content !== undefined) updateData["content"] = body.content;
      if (body.parseMode !== undefined) updateData["parseMode"] = body.parseMode;
      if (body.variables !== undefined) updateData["variables"] = body.variables;
      if (body.isActive !== undefined) updateData["isActive"] = body.isActive;

      const template = await prisma.template.update({
        where: { id },
        data: updateData,
      });

      return reply.send({ data: template });
    }
  );

  // DELETE /:id
  app.delete<{ Params: TemplateParams }>("/:id", async (request, reply) => {
    const id = parseIdParam(request.params.id);
    await prisma.template.delete({ where: { id } });
    return reply.status(204).send();
  });

  // POST /test-send — send a test message
  app.post<{ Body: TestSendBody }>("/test-send", async (request, reply) => {
    const { chatId, content, parseMode } = request.body;
    const result = await sendMessage(chatId, content, parseMode ?? "HTML");

    if (result.ok) {
      return reply.send({
        data: { ok: true, messageId: result.messageId },
      });
    }
    return reply.status(400).send({
      statusCode: 400,
      error: "Send Failed",
      message: result.error ?? "Unknown error",
    });
  });
}
