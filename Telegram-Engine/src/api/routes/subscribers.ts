import type { FastifyInstance } from "fastify";
import { prisma } from "../../config/database.js";
import { authenticateUser, parseIdParam } from "../middleware/auth.js";
import { syncSubscribersFromFirestore } from "../../services/firebaseSync.js";

interface SubscriberParams {
  id: string;
}

interface ListQuery {
  role?: string;
  language?: string;
  country?: string;
  status?: string;
  tag?: string;
  search?: string;
  page?: string;
  limit?: string;
}

interface TagBody {
  tagIds: number[];
}

export default async function subscribersRoutes(
  app: FastifyInstance
): Promise<void> {
  app.addHook("preHandler", authenticateUser);

  // GET / — list subscribers with filters
  app.get<{ Querystring: ListQuery }>("/", async (request, reply) => {
    const { role, language, country, status, tag, search, page, limit } =
      request.query;
    const take = Math.min(parseInt(limit ?? "50", 10) || 50, 200);
    const skip = ((parseInt(page ?? "1", 10) || 1) - 1) * take;

    const where: Record<string, unknown> = {};
    if (role) where["role"] = role;
    if (language) where["language"] = language;
    if (country) where["country"] = country;
    if (status) where["status"] = status ?? "active";
    if (tag) {
      where["tags"] = { some: { tagId: parseInt(tag, 10) } };
    }
    if (search) {
      where["OR"] = [
        { firstName: { contains: search, mode: "insensitive" } },
        { telegramUsername: { contains: search, mode: "insensitive" } },
        { telegramChatId: { contains: search } },
      ];
    }

    const [subscribers, total] = await Promise.all([
      prisma.subscriber.findMany({
        where,
        orderBy: { subscribedAt: "desc" },
        skip,
        take,
        include: { tags: { include: { tag: true } } },
      }),
      prisma.subscriber.count({ where }),
    ]);

    return reply.send({
      data: subscribers,
      pagination: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  });

  // GET /stats — subscriber statistics
  app.get("/stats", async (_request, reply) => {
    const [total, byRole, byLanguage, byCountry, byStatus] =
      await Promise.all([
        prisma.subscriber.count(),
        prisma.subscriber.groupBy({
          by: ["role"],
          _count: { id: true },
        }),
        prisma.subscriber.groupBy({
          by: ["language"],
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 20,
        }),
        prisma.subscriber.groupBy({
          by: ["country"],
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 20,
        }),
        prisma.subscriber.groupBy({
          by: ["status"],
          _count: { id: true },
        }),
      ]);

    return reply.send({
      data: {
        total,
        byRole: Object.fromEntries(
          byRole.map((r) => [r.role, r._count.id])
        ),
        byLanguage: Object.fromEntries(
          byLanguage.map((l) => [l.language, l._count.id])
        ),
        byCountry: Object.fromEntries(
          byCountry
            .filter((c) => c.country)
            .map((c) => [c.country!, c._count.id])
        ),
        byStatus: Object.fromEntries(
          byStatus.map((s) => [s.status, s._count.id])
        ),
      },
    });
  });

  // GET /:id — subscriber detail
  app.get<{ Params: SubscriberParams }>("/:id", async (request, reply) => {
    const id = parseIdParam(request.params.id);

    const subscriber = await prisma.subscriber.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        deliveries: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { campaign: { select: { id: true, name: true } } },
        },
      },
    });

    if (!subscriber) {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: `Subscriber ${id} not found`,
      });
    }

    return reply.send({ data: subscriber });
  });

  // POST /:id/tags — assign tags to subscriber
  app.post<{ Params: SubscriberParams; Body: TagBody }>(
    "/:id/tags",
    async (request, reply) => {
      const id = parseIdParam(request.params.id);
      const { tagIds } = request.body;

      const subscriber = await prisma.subscriber.findUnique({ where: { id } });
      if (!subscriber) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: `Subscriber ${id} not found`,
        });
      }

      // Remove existing tags and add new ones
      await prisma.$transaction(async (tx) => {
        await tx.subscriberTag.deleteMany({ where: { subscriberId: id } });
        if (tagIds.length > 0) {
          await tx.subscriberTag.createMany({
            data: tagIds.map((tagId) => ({ subscriberId: id, tagId })),
          });
        }
      });

      const updated = await prisma.subscriber.findUnique({
        where: { id },
        include: { tags: { include: { tag: true } } },
      });

      return reply.send({ data: updated });
    }
  );

  // POST /sync — trigger Firestore sync
  app.post("/sync", async (_request, reply) => {
    const result = await syncSubscribersFromFirestore();
    return reply.send({ data: result });
  });
}
