import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database.js";
import { authenticateUser, parseIdParam } from "../middleware/auth.js";

interface SegmentParams {
  id: string;
}

interface SegmentFilters {
  roles?: string[];
  tags?: number[];
  languages?: string[];
  countries?: string[];
  statuses?: string[];
}

interface CreateSegmentBody {
  name: string;
  filters: SegmentFilters;
}

function buildSubscriberWhere(
  filters: SegmentFilters
): Prisma.SubscriberWhereInput {
  const where: Prisma.SubscriberWhereInput = {};

  if (filters.roles?.length) {
    where.role = { in: filters.roles };
  }
  if (filters.languages?.length) {
    where.language = { in: filters.languages };
  }
  if (filters.countries?.length) {
    where.country = { in: filters.countries };
  }
  if (filters.statuses?.length) {
    where.status = { in: filters.statuses };
  }
  if (filters.tags?.length) {
    where.tags = { some: { tagId: { in: filters.tags } } };
  }

  return where;
}

export default async function segmentsRoutes(
  app: FastifyInstance
): Promise<void> {
  app.addHook("preHandler", authenticateUser);

  // GET / — list segments
  app.get("/", async (_request, reply) => {
    const segments = await prisma.segment.findMany({
      orderBy: { name: "asc" },
    });
    return reply.send({ data: segments });
  });

  // POST / — create segment
  app.post<{ Body: CreateSegmentBody }>("/", async (request, reply) => {
    const { name, filters } = request.body;

    const where = buildSubscriberWhere(filters);
    const count = await prisma.subscriber.count({ where });

    const segment = await prisma.segment.create({
      data: {
        name,
        filters: filters as unknown as Prisma.JsonObject,
        count,
      },
    });

    return reply.status(201).send({ data: segment });
  });

  // POST /preview — preview segment count without saving
  app.post<{ Body: { filters: SegmentFilters } }>(
    "/preview",
    async (request, reply) => {
      const where = buildSubscriberWhere(request.body.filters);
      const count = await prisma.subscriber.count({ where });
      return reply.send({ data: { count } });
    }
  );

  // PUT /:id — update segment
  app.put<{ Params: SegmentParams; Body: Partial<CreateSegmentBody> }>(
    "/:id",
    async (request, reply) => {
      const id = parseIdParam(request.params.id);
      const { name, filters } = request.body;

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData["name"] = name;
      if (filters !== undefined) {
        updateData["filters"] = filters as unknown as Prisma.JsonObject;
        const where = buildSubscriberWhere(filters);
        updateData["count"] = await prisma.subscriber.count({ where });
      }

      const segment = await prisma.segment.update({
        where: { id },
        data: updateData,
      });

      return reply.send({ data: segment });
    }
  );

  // DELETE /:id
  app.delete<{ Params: SegmentParams }>("/:id", async (request, reply) => {
    const id = parseIdParam(request.params.id);
    await prisma.segment.delete({ where: { id } });
    return reply.status(204).send();
  });
}
