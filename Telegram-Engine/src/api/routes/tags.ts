import type { FastifyInstance } from "fastify";
import { prisma } from "../../config/database.js";
import { authenticateUser, parseIdParam } from "../middleware/auth.js";

interface TagParams {
  id: string;
}

interface CreateTagBody {
  name: string;
  color?: string;
}

export default async function tagsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", authenticateUser);

  // GET / — list all tags with subscriber counts
  app.get("/", async (_request, reply) => {
    const tags = await prisma.tag.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { subscribers: true } } },
    });

    return reply.send({ data: tags });
  });

  // POST / — create tag
  app.post<{ Body: CreateTagBody }>("/", async (request, reply) => {
    const { name, color } = request.body;

    const existing = await prisma.tag.findUnique({ where: { name } });
    if (existing) {
      return reply.status(409).send({
        statusCode: 409,
        error: "Conflict",
        message: `Tag "${name}" already exists`,
      });
    }

    const tag = await prisma.tag.create({
      data: { name, color: color ?? "#6B7280" },
    });

    return reply.status(201).send({ data: tag });
  });

  // PUT /:id — update tag
  app.put<{ Params: TagParams; Body: Partial<CreateTagBody> }>(
    "/:id",
    async (request, reply) => {
      const id = parseIdParam(request.params.id);
      const { name, color } = request.body;

      const updateData: Record<string, string> = {};
      if (name !== undefined) updateData["name"] = name;
      if (color !== undefined) updateData["color"] = color;

      const tag = await prisma.tag.update({ where: { id }, data: updateData });
      return reply.send({ data: tag });
    }
  );

  // DELETE /:id — delete tag
  app.delete<{ Params: TagParams }>("/:id", async (request, reply) => {
    const id = parseIdParam(request.params.id);
    await prisma.tag.delete({ where: { id } });
    return reply.status(204).send();
  });
}
