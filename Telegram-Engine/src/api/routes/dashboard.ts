import type { FastifyInstance } from "fastify";
import { prisma } from "../../config/database.js";
import { authenticateUser } from "../middleware/auth.js";

export default async function dashboardRoutes(
  app: FastifyInstance
): Promise<void> {
  app.addHook("preHandler", authenticateUser);

  // GET /stats — main dashboard KPIs (enhanced with automation stats)
  app.get("/stats", async (_request, reply) => {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalSubscribers,
      activeSubscribers,
      totalCampaigns,
      activeCampaigns,
      sentToday,
      failedToday,
      sentTotal,
      queuePending,
      totalAutomations,
      activeAutomations,
      activeEnrollments,
      completedEnrollments,
    ] = await Promise.all([
      prisma.subscriber.count(),
      prisma.subscriber.count({ where: { status: "active" } }),
      prisma.campaign.count(),
      prisma.campaign.count({
        where: { status: { in: ["sending", "scheduled", "paused"] } },
      }),
      prisma.messageDelivery.count({
        where: { status: "sent", sentAt: { gte: todayStart } },
      }),
      prisma.messageDelivery.count({
        where: { status: "failed", createdAt: { gte: todayStart } },
      }),
      prisma.messageDelivery.count({ where: { status: "sent" } }),
      prisma.messageDelivery.count({
        where: { status: { in: ["pending", "queued"] } },
      }),
      prisma.automation.count(),
      prisma.automation.count({ where: { isActive: true } }),
      prisma.automationEnrollment.count({ where: { status: "active" } }),
      prisma.automationEnrollment.count({ where: { status: "completed" } }),
    ]);

    // Daily stats for last 30 days
    const dailyStats = await prisma.dailyStats.findMany({
      where: { date: { gte: last30d } },
      orderBy: { date: "asc" },
    });

    return reply.send({
      data: {
        subscribers: { total: totalSubscribers, active: activeSubscribers },
        campaigns: { total: totalCampaigns, active: activeCampaigns },
        messages: {
          sentToday,
          failedToday,
          sentTotal,
          queuePending,
          successRate:
            sentToday + failedToday > 0
              ? Math.round(
                  (sentToday / (sentToday + failedToday)) * 10000
                ) / 100
              : 100,
        },
        automations: {
          total: totalAutomations,
          active: activeAutomations,
          activeEnrollments,
          completedEnrollments,
        },
        dailyStats,
      },
    });
  });

  // GET /queue — queue depth and hourly breakdown
  app.get("/queue", async (_request, reply) => {
    const [pending, queued, sent, failed, rateLimited] = await Promise.all([
      prisma.messageDelivery.count({ where: { status: "pending" } }),
      prisma.messageDelivery.count({ where: { status: "queued" } }),
      prisma.messageDelivery.count({ where: { status: "sent" } }),
      prisma.messageDelivery.count({ where: { status: "failed" } }),
      prisma.messageDelivery.count({ where: { status: "rate_limited" } }),
    ]);

    // Hourly counts for today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const hourlyRaw = await prisma.messageDelivery.groupBy({
      by: ["status"],
      where: { createdAt: { gte: todayStart } },
      _count: { id: true },
    });

    return reply.send({
      data: {
        depth: { pending, queued, sent, failed, rateLimited, total: pending + queued + sent + failed + rateLimited },
        hourly: Object.fromEntries(
          hourlyRaw.map((h) => [h.status, h._count.id])
        ),
      },
    });
  });

  // GET /analytics — enhanced analytics (P2)
  app.get("/analytics", async (_request, reply) => {
    const now = new Date();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Delivery stats by status for last 7 and 30 days
    const [deliveryLast7d, deliveryLast30d, topCampaigns, subscriberGrowth] = await Promise.all([
      prisma.messageDelivery.groupBy({
        by: ["status"],
        where: { createdAt: { gte: last7d } },
        _count: true,
      }),
      prisma.messageDelivery.groupBy({
        by: ["status"],
        where: { createdAt: { gte: last30d } },
        _count: true,
      }),
      // Top 10 campaigns by sent count
      prisma.campaign.findMany({
        where: { status: { in: ["completed", "sending"] } },
        orderBy: { sentCount: "desc" },
        take: 10,
        select: {
          id: true,
          name: true,
          type: true,
          sentCount: true,
          failedCount: true,
          targetCount: true,
          completedAt: true,
        },
      }),
      // Subscriber growth (new subscribers per day for last 30 days)
      prisma.subscriber.groupBy({
        by: ["status"],
        where: { subscribedAt: { gte: last30d } },
        _count: true,
      }),
    ]);

    // Per-language delivery breakdown
    const languageStats = await prisma.$queryRaw<
      Array<{ language: string; count: bigint }>
    >`SELECT s.language, COUNT(md.id)::bigint as count
      FROM "MessageDelivery" md
      JOIN "Subscriber" s ON s.id = md."subscriberId"
      WHERE md.status = 'sent' AND md."sentAt" >= ${last30d}
      GROUP BY s.language
      ORDER BY count DESC`;

    return reply.send({
      data: {
        deliveryLast7d: Object.fromEntries(deliveryLast7d.map((d) => [d.status, d._count])),
        deliveryLast30d: Object.fromEntries(deliveryLast30d.map((d) => [d.status, d._count])),
        topCampaigns: topCampaigns.map((c) => ({
          ...c,
          successRate: c.targetCount > 0
            ? Math.round((c.sentCount / c.targetCount) * 10000) / 100
            : 0,
        })),
        subscriberGrowth: Object.fromEntries(subscriberGrowth.map((s) => [s.status, s._count])),
        languageBreakdown: languageStats.map((l) => ({
          language: l.language,
          count: Number(l.count),
        })),
      },
    });
  });
}
