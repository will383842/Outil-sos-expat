import type { FastifyInstance } from "fastify";
import { prisma } from "../../config/database.js";
import { authenticateUser } from "../middleware/auth.js";

interface LogsQuery {
  eventType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: string;
  limit?: string;
}

export default async function logsRoutes(
  app: FastifyInstance
): Promise<void> {
  app.addHook("preHandler", authenticateUser);

  // GET / — list notification logs with filters
  app.get<{ Querystring: LogsQuery }>("/", async (request, reply) => {
    const { eventType, status, startDate, endDate, page, limit } =
      request.query;
    const take = Math.min(parseInt(limit ?? "50", 10) || 50, 200);
    const skip = ((parseInt(page ?? "1", 10) || 1) - 1) * take;

    const where: Record<string, unknown> = {};
    if (eventType) where["eventType"] = eventType;
    if (status) where["status"] = status;
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter["gte"] = new Date(startDate);
      if (endDate) dateFilter["lte"] = new Date(endDate);
      where["createdAt"] = dateFilter;
    }

    const [logs, total] = await Promise.all([
      prisma.notificationLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.notificationLog.count({ where }),
    ]);

    return reply.send({
      data: logs,
      pagination: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  });

  // GET /event-types — distinct event types for filter dropdown
  app.get("/event-types", async (_request, reply) => {
    const types = await prisma.notificationLog.findMany({
      distinct: ["eventType"],
      select: { eventType: true },
      orderBy: { eventType: "asc" },
    });

    return reply.send({
      data: types.map((t) => t.eventType),
    });
  });
}
