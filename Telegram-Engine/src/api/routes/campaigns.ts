import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database.js";
import { authenticateUser, parseIdParam } from "../middleware/auth.js";
import { campaignSenderQueue } from "../../jobs/queue.js";

interface CampaignParams {
  id: string;
}

interface MessageInput {
  language: string;
  content: string;
  parseMode?: string;
  mediaType?: string | null;
  mediaUrl?: string | null;
  replyMarkup?: unknown;
}

interface CreateCampaignBody {
  name: string;
  description?: string;
  type?: string;
  targetRoles?: string[];
  targetTags?: number[];
  targetLanguages?: string[];
  targetCountries?: string[];
  triggerAction?: string;
  triggerDelay?: number;
  scheduledAt?: string;
  messages: MessageInput[];
}

const VALID_MEDIA_TYPES = ["photo", "document", "video", "audio"];

interface ListQuery {
  status?: string;
  type?: string;
  page?: string;
  limit?: string;
}

export default async function campaignsRoutes(
  app: FastifyInstance
): Promise<void> {
  app.addHook("preHandler", authenticateUser);

  // GET / — list campaigns
  app.get<{ Querystring: ListQuery }>("/", async (request, reply) => {
    const { status, type, page, limit } = request.query;
    const take = Math.min(parseInt(limit ?? "50", 10) || 50, 200);
    const skip = ((parseInt(page ?? "1", 10) || 1) - 1) * take;

    const where: Record<string, unknown> = {};
    if (status) where["status"] = status;
    if (type) where["type"] = type;

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          messages: { select: { language: true } },
          _count: { select: { deliveries: true } },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    return reply.send({
      data: campaigns,
      pagination: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  });

  // POST / — create campaign
  app.post<{ Body: CreateCampaignBody }>("/", async (request, reply) => {
    const body = request.body;

    const campaign = await prisma.$transaction(async (tx) => {
      const c = await tx.campaign.create({
        data: {
          name: body.name,
          description: body.description ?? null,
          type: body.type ?? "broadcast",
          status: body.scheduledAt ? "scheduled" : "draft",
          targetRoles: body.targetRoles ?? Prisma.JsonNull,
          targetTags: body.targetTags ?? Prisma.JsonNull,
          targetLanguages: body.targetLanguages ?? Prisma.JsonNull,
          targetCountries: body.targetCountries ?? Prisma.JsonNull,
          triggerAction: body.triggerAction ?? null,
          triggerDelay: body.triggerDelay ?? null,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
          createdBy: request.user.email,
        },
      });

      if (body.messages?.length) {
        await tx.campaignMessage.createMany({
          data: body.messages.map((m) => ({
            campaignId: c.id,
            language: m.language,
            content: m.content,
            parseMode: m.parseMode ?? "HTML",
            mediaType: (m.mediaType && VALID_MEDIA_TYPES.includes(m.mediaType)) ? m.mediaType : null,
            mediaUrl: m.mediaUrl ?? null,
            replyMarkup: (m.replyMarkup as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          })),
        });
      }

      return c;
    });

    const created = await prisma.campaign.findUnique({
      where: { id: campaign.id },
      include: { messages: true },
    });

    return reply.status(201).send({ data: created });
  });

  // GET /:id — campaign detail
  app.get<{ Params: CampaignParams }>("/:id", async (request, reply) => {
    const id = parseIdParam(request.params.id);

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        messages: true,
        _count: { select: { deliveries: true } },
      },
    });

    if (!campaign) {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: `Campaign ${id} not found`,
      });
    }

    // Delivery stats
    const [sentCount, failedCount, pendingCount] = await Promise.all([
      prisma.messageDelivery.count({
        where: { campaignId: id, status: "sent" },
      }),
      prisma.messageDelivery.count({
        where: { campaignId: id, status: "failed" },
      }),
      prisma.messageDelivery.count({
        where: { campaignId: id, status: { in: ["pending", "queued"] } },
      }),
    ]);

    return reply.send({
      data: {
        ...campaign,
        deliveryStats: { sent: sentCount, failed: failedCount, pending: pendingCount },
      },
    });
  });

  // PUT /:id — update campaign
  app.put<{ Params: CampaignParams; Body: Partial<CreateCampaignBody> }>(
    "/:id",
    async (request, reply) => {
      const id = parseIdParam(request.params.id);
      const body = request.body;

      const existing = await prisma.campaign.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: `Campaign ${id} not found`,
        });
      }

      if (["sending", "completed", "cancelled"].includes(existing.status)) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: `Cannot edit a campaign that is ${existing.status}`,
        });
      }

      const updateData: Record<string, unknown> = {};
      if (body.name !== undefined) updateData["name"] = body.name;
      if (body.description !== undefined) updateData["description"] = body.description;
      if (body.targetRoles !== undefined) updateData["targetRoles"] = body.targetRoles;
      if (body.targetTags !== undefined) updateData["targetTags"] = body.targetTags;
      if (body.targetLanguages !== undefined) updateData["targetLanguages"] = body.targetLanguages;
      if (body.targetCountries !== undefined) updateData["targetCountries"] = body.targetCountries;
      if (body.triggerAction !== undefined) updateData["triggerAction"] = body.triggerAction;
      if (body.triggerDelay !== undefined) updateData["triggerDelay"] = body.triggerDelay;
      if (body.scheduledAt !== undefined) {
        updateData["scheduledAt"] = body.scheduledAt ? new Date(body.scheduledAt) : null;
        updateData["status"] = body.scheduledAt ? "scheduled" : "draft";
      }

      await prisma.$transaction(async (tx) => {
        await tx.campaign.update({ where: { id }, data: updateData });

        if (body.messages?.length) {
          await tx.campaignMessage.deleteMany({ where: { campaignId: id } });
          await tx.campaignMessage.createMany({
            data: body.messages.map((m) => ({
              campaignId: id,
              language: m.language,
              content: m.content,
              parseMode: m.parseMode ?? "HTML",
              mediaType: (m.mediaType && VALID_MEDIA_TYPES.includes(m.mediaType)) ? m.mediaType : null,
              mediaUrl: m.mediaUrl ?? null,
              replyMarkup: (m.replyMarkup as Prisma.InputJsonValue) ?? Prisma.JsonNull,
            })),
          });
        }
      });

      const updated = await prisma.campaign.findUnique({
        where: { id },
        include: { messages: true },
      });

      return reply.send({ data: updated });
    }
  );

  // POST /:id/send — launch campaign
  app.post<{ Params: CampaignParams }>(
    "/:id/send",
    async (request, reply) => {
      const id = parseIdParam(request.params.id);

      const campaign = await prisma.campaign.findUnique({
        where: { id },
        include: { messages: true },
      });

      if (!campaign) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: `Campaign ${id} not found`,
        });
      }

      if (campaign.status !== "draft" && campaign.status !== "scheduled") {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: `Campaign is ${campaign.status}, cannot send`,
        });
      }

      if (campaign.messages.length === 0) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "Campaign has no messages",
        });
      }

      await prisma.campaign.update({
        where: { id },
        data: { status: "sending", startedAt: new Date() },
      });

      // Queue the campaign for processing
      await campaignSenderQueue.add("send-campaign", { campaignId: id }, {
        jobId: `campaign-${id}`,
      });

      return reply.send({ data: { ok: true, message: "Campaign queued for sending" } });
    }
  );

  // POST /:id/cancel — cancel campaign
  app.post<{ Params: CampaignParams }>(
    "/:id/cancel",
    async (request, reply) => {
      const id = parseIdParam(request.params.id);

      const campaign = await prisma.campaign.findUnique({ where: { id } });
      if (!campaign) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: `Campaign ${id} not found`,
        });
      }

      if (campaign.status === "completed" || campaign.status === "cancelled") {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: `Campaign is already ${campaign.status}`,
        });
      }

      // Remove BullMQ job if still queued, and update status
      await Promise.allSettled([
        campaignSenderQueue.remove(`campaign-${id}`),
      ]);

      await prisma.campaign.update({
        where: { id },
        data: { status: "cancelled", completedAt: new Date() },
      });

      return reply.send({ data: { ok: true } });
    }
  );

  // DELETE /:id
  app.delete<{ Params: CampaignParams }>(
    "/:id",
    async (request, reply) => {
      const id = parseIdParam(request.params.id);

      const existing = await prisma.campaign.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: `Campaign ${id} not found`,
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.messageDelivery.deleteMany({ where: { campaignId: id } });
        await tx.campaignMessage.deleteMany({ where: { campaignId: id } });
        await tx.campaign.delete({ where: { id } });
      });

      return reply.status(204).send();
    }
  );

  // POST /:id/pause — pause a sending campaign
  app.post<{ Params: CampaignParams }>(
    "/:id/pause",
    async (request, reply) => {
      const id = parseIdParam(request.params.id);

      const campaign = await prisma.campaign.findUnique({ where: { id } });
      if (!campaign) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: `Campaign ${id} not found` });
      }

      if (campaign.status !== "sending") {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: `Can only pause a campaign that is sending (current: ${campaign.status})`,
        });
      }

      await prisma.campaign.update({
        where: { id },
        data: { status: "paused", pausedAt: new Date() },
      });

      return reply.send({ data: { ok: true, message: "Campaign paused" } });
    }
  );

  // POST /:id/resume — resume a paused campaign
  app.post<{ Params: CampaignParams }>(
    "/:id/resume",
    async (request, reply) => {
      const id = parseIdParam(request.params.id);

      const campaign = await prisma.campaign.findUnique({
        where: { id },
        include: { messages: true },
      });
      if (!campaign) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: `Campaign ${id} not found` });
      }

      if (campaign.status !== "paused") {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: `Can only resume a paused campaign (current: ${campaign.status})`,
        });
      }

      await prisma.campaign.update({
        where: { id },
        data: { status: "sending", pausedAt: null },
      });

      // Re-queue for the campaign sender to continue
      await campaignSenderQueue.add("send-campaign", { campaignId: id }, {
        jobId: `campaign-${id}-resume-${Date.now()}`,
      });

      return reply.send({ data: { ok: true, message: "Campaign resumed" } });
    }
  );

  // POST /:id/duplicate — duplicate a campaign as a new draft
  app.post<{ Params: CampaignParams }>(
    "/:id/duplicate",
    async (request, reply) => {
      const id = parseIdParam(request.params.id);

      const original = await prisma.campaign.findUnique({
        where: { id },
        include: { messages: true },
      });
      if (!original) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: `Campaign ${id} not found` });
      }

      const duplicate = await prisma.$transaction(async (tx) => {
        const c = await tx.campaign.create({
          data: {
            name: `${original.name} (copy)`,
            description: original.description,
            type: original.type,
            status: "draft",
            targetRoles: original.targetRoles ?? Prisma.JsonNull,
            targetTags: original.targetTags ?? Prisma.JsonNull,
            targetLanguages: original.targetLanguages ?? Prisma.JsonNull,
            targetCountries: original.targetCountries ?? Prisma.JsonNull,
            triggerAction: original.triggerAction,
            triggerDelay: original.triggerDelay,
            createdBy: request.user.email,
          },
        });

        if (original.messages.length > 0) {
          await tx.campaignMessage.createMany({
            data: original.messages.map((m) => ({
              campaignId: c.id,
              language: m.language,
              content: m.content,
              parseMode: m.parseMode,
              mediaType: m.mediaType,
              mediaUrl: m.mediaUrl,
              replyMarkup: (m.replyMarkup as Prisma.InputJsonValue) ?? Prisma.JsonNull,
            })),
          });
        }

        return c;
      });

      const created = await prisma.campaign.findUnique({
        where: { id: duplicate.id },
        include: { messages: true },
      });

      return reply.status(201).send({ data: created });
    }
  );

  // GET /:id/deliveries — paginated delivery list with filters
  app.get<{
    Params: CampaignParams;
    Querystring: { page?: string; limit?: string; status?: string };
  }>(
    "/:id/deliveries",
    async (request, reply) => {
      const id = parseIdParam(request.params.id);
      const page = Math.max(1, parseInt(request.query.page ?? "1", 10));
      const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? "20", 10)));
      const skip = (page - 1) * limit;
      const statusFilter = request.query.status;

      const where: Prisma.MessageDeliveryWhereInput = { campaignId: id };
      if (statusFilter && ["sent", "failed", "pending", "queued", "rate_limited"].includes(statusFilter)) {
        where.status = statusFilter;
      }

      const [deliveries, total] = await Promise.all([
        prisma.messageDelivery.findMany({
          where,
          include: {
            subscriber: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                telegramUsername: true,
                role: true,
                language: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.messageDelivery.count({ where }),
      ]);

      return reply.send({
        data: deliveries,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    }
  );

  // GET /:id/export — CSV export of deliveries
  app.get<{ Params: CampaignParams }>(
    "/:id/export",
    async (request, reply) => {
      const id = parseIdParam(request.params.id);

      const campaign = await prisma.campaign.findUnique({ where: { id } });
      if (!campaign) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: `Campaign ${id} not found` });
      }

      const deliveries = await prisma.messageDelivery.findMany({
        where: { campaignId: id },
        include: {
          subscriber: {
            select: { firstName: true, lastName: true, telegramUsername: true, role: true, language: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      // BOM for Excel UTF-8 + CSV header
      const BOM = "\uFEFF";
      const header = "ID,Subscriber,Username,Role,Language,Status,Telegram Msg ID,Error,Sent At,Created At\n";
      const rows = deliveries.map((d) => {
        const name = [d.subscriber.firstName, d.subscriber.lastName].filter(Boolean).join(" ") || "-";
        const username = d.subscriber.telegramUsername ?? "-";
        const sentAt = d.sentAt ? new Date(d.sentAt).toISOString() : "-";
        const createdAt = new Date(d.createdAt).toISOString();
        const error = d.errorMessage ? `"${d.errorMessage.replace(/"/g, '""')}"` : "-";
        return `${d.id},"${name}",${username},${d.subscriber.role},${d.subscriber.language},${d.status},${d.telegramMsgId ?? "-"},${error},${sentAt},${createdAt}`;
      }).join("\n");

      const csv = BOM + header + rows;

      return reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", `attachment; filename="campaign-${id}-deliveries.csv"`)
        .send(csv);
    }
  );

  // POST /compare — compare up to 5 campaigns side by side (P2)
  app.post<{ Body: { campaignIds: number[] } }>(
    "/compare",
    async (request, reply) => {
      const { campaignIds } = request.body;
      if (!campaignIds?.length || campaignIds.length > 5) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "Provide 1 to 5 campaign IDs",
        });
      }

      const campaigns = await prisma.campaign.findMany({
        where: { id: { in: campaignIds } },
        include: { messages: { select: { language: true } } },
      });

      // Fetch delivery stats per campaign in one query
      const stats = await prisma.messageDelivery.groupBy({
        by: ["campaignId", "status"],
        where: { campaignId: { in: campaignIds } },
        _count: true,
      });

      const statsMap: Record<number, Record<string, number>> = {};
      for (const s of stats) {
        if (s.campaignId === null) continue;
        if (!statsMap[s.campaignId]) statsMap[s.campaignId] = {};
        statsMap[s.campaignId][s.status] = s._count;
      }

      const result = campaigns.map((c) => {
        const s = statsMap[c.id] ?? {};
        const sent = s["sent"] ?? 0;
        const failed = s["failed"] ?? 0;
        const total = sent + failed + (s["pending"] ?? 0) + (s["queued"] ?? 0) + (s["rate_limited"] ?? 0);
        return {
          id: c.id,
          name: c.name,
          type: c.type,
          status: c.status,
          targetCount: c.targetCount,
          sentCount: c.sentCount,
          failedCount: c.failedCount,
          languages: c.messages.map((m) => m.language),
          successRate: total > 0 ? Math.round((sent / total) * 10000) / 100 : 0,
          deliveryBreakdown: s,
          createdAt: c.createdAt,
          completedAt: c.completedAt,
        };
      });

      return reply.send({ data: result });
    }
  );
}
