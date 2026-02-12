import { Worker, type Job } from "bullmq";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database.js";
import { getRedisConnection } from "../../config/redis.js";
import { sendMessage, sendPhoto, sendDocument, sendVideo, type InlineKeyboard } from "../../services/telegram.js";
import { QUEUE_NAMES } from "../queue.js";
import { logger } from "../../utils/logger.js";

interface CampaignSendJob {
  campaignId: number;
}

function buildTargetWhere(campaign: {
  targetRoles: Prisma.JsonValue;
  targetTags: Prisma.JsonValue;
  targetLanguages: Prisma.JsonValue;
  targetCountries: Prisma.JsonValue;
}): Prisma.SubscriberWhereInput {
  const where: Prisma.SubscriberWhereInput = { status: "active" };

  const roles = campaign.targetRoles as string[] | null;
  if (roles?.length) {
    where.role = { in: roles };
  }

  const languages = campaign.targetLanguages as string[] | null;
  if (languages?.length) {
    where.language = { in: languages };
  }

  const countries = campaign.targetCountries as string[] | null;
  if (countries?.length) {
    where.country = { in: countries };
  }

  const tagIds = campaign.targetTags as number[] | null;
  if (tagIds?.length) {
    where.tags = { some: { tagId: { in: tagIds } } };
  }

  return where;
}

async function processCampaignSend(
  job: Job<CampaignSendJob>
): Promise<void> {
  const { campaignId } = job.data;
  let sentCount = 0;
  let failedCount = 0;

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { messages: true },
    });

    if (!campaign || campaign.status !== "sending") {
      logger.warn({ campaignId }, "Campaign not found or not in sending state");
      return;
    }

    if (campaign.messages.length === 0) {
      logger.warn({ campaignId }, "Campaign has no messages");
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "cancelled", completedAt: new Date() },
      });
      return;
    }

    // Build message lookup by language
    const messageByLang = new Map(
      campaign.messages.map((m) => [m.language, m])
    );
    const fallbackMsg = messageByLang.get("en") ?? campaign.messages[0];

    if (!fallbackMsg) {
      logger.error({ campaignId }, "No fallback message found despite length check");
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "cancelled", completedAt: new Date() },
      });
      return;
    }

    // Find target subscribers
    const where = buildTargetWhere(campaign);
    const subscribers = await prisma.subscriber.findMany({ where });

    logger.info(
      { campaignId, targetCount: subscribers.length },
      "Starting campaign send"
    );

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { targetCount: subscribers.length },
    });

    // For resume: find already-delivered subscriber IDs so we skip them
    const alreadySent = new Set(
      (await prisma.messageDelivery.findMany({
        where: { campaignId, status: { in: ["sent", "queued"] } },
        select: { subscriberId: true },
      })).map((d) => d.subscriberId)
    );

    // Adjust counters for resume
    sentCount = await prisma.messageDelivery.count({ where: { campaignId, status: "sent" } });
    failedCount = await prisma.messageDelivery.count({ where: { campaignId, status: "failed" } });

    for (const sub of subscribers) {
      // Skip already-delivered subscribers (for resume)
      if (alreadySent.has(sub.id)) continue;

      // Check if campaign was cancelled or paused mid-send (every 20 messages)
      if ((sentCount + failedCount) % 20 === 0 && sentCount > 0) {
        const current = await prisma.campaign.findUnique({
          where: { id: campaignId },
          select: { status: true },
        });
        if (current?.status === "cancelled") {
          logger.info({ campaignId, sentCount, failedCount }, "Campaign cancelled mid-send");
          return;
        }
        if (current?.status === "paused") {
          logger.info({ campaignId, sentCount, failedCount }, "Campaign paused mid-send");
          await prisma.campaign.update({
            where: { id: campaignId },
            data: { sentCount, failedCount },
          });
          return; // Stop processing, resume will re-queue
        }
      }

      // Pick message in subscriber's language, fallback to default
      const msg = messageByLang.get(sub.language) ?? fallbackMsg;

      // Create delivery record
      const delivery = await prisma.messageDelivery.create({
        data: {
          campaignId,
          subscriberId: sub.id,
          telegramChatId: sub.telegramChatId,
          content: msg.content,
          status: "queued",
        },
      });

      // Send via Telegram — use appropriate method based on media type
      const replyMarkup = msg.replyMarkup as InlineKeyboard | null | undefined;
      let result;

      if (msg.mediaType === "photo" && msg.mediaUrl) {
        result = await sendPhoto(sub.telegramChatId, msg.mediaUrl, msg.content, msg.parseMode, replyMarkup ?? undefined);
      } else if (msg.mediaType === "document" && msg.mediaUrl) {
        result = await sendDocument(sub.telegramChatId, msg.mediaUrl, msg.content, msg.parseMode, replyMarkup ?? undefined);
      } else if (msg.mediaType === "video" && msg.mediaUrl) {
        result = await sendVideo(sub.telegramChatId, msg.mediaUrl, msg.content, msg.parseMode, replyMarkup ?? undefined);
      } else {
        result = await sendMessage(sub.telegramChatId, msg.content, msg.parseMode, replyMarkup ?? undefined);
      }

      if (result.ok) {
        sentCount++;
        await prisma.messageDelivery.update({
          where: { id: delivery.id },
          data: {
            status: "sent",
            telegramMsgId: result.messageId ? String(result.messageId) : null,
            sentAt: new Date(),
          },
        });
      } else {
        failedCount++;

        if (result.retryAfter) {
          logger.warn(
            { chatId: sub.telegramChatId, retryAfter: result.retryAfter },
            "Rate limited on message, skipping to next"
          );
        }

        await prisma.messageDelivery.update({
          where: { id: delivery.id },
          data: {
            status: result.retryAfter ? "rate_limited" : "failed",
            errorMessage: result.error,
          },
        });
      }

      // Update campaign counters every 10 messages
      if ((sentCount + failedCount) % 10 === 0) {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { sentCount, failedCount },
        });
      }
    }

    // Final update
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        sentCount,
        failedCount,
        status: "completed",
        completedAt: new Date(),
      },
    });

    logger.info(
      { campaignId, sentCount, failedCount },
      "Campaign send complete"
    );
  } catch (error) {
    logger.error(
      { campaignId, error, sentCount, failedCount },
      "Campaign sender job crashed unexpectedly"
    );

    // Attempt to mark campaign as failed with partial stats
    try {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: "cancelled",
          sentCount,
          failedCount,
          completedAt: new Date(),
        },
      });
    } catch (cleanupError) {
      logger.error({ campaignId, cleanupError }, "Failed to cleanup campaign after crash");
    }

    throw error; // Re-throw for BullMQ retry
  }
}

export function startCampaignSenderWorker(): void {
  const worker = new Worker(
    QUEUE_NAMES.CAMPAIGN_SENDER,
    processCampaignSend,
    {
      connection: getRedisConnection(),
      concurrency: 1, // One campaign at a time
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Campaign sender job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Campaign sender job failed");
  });

  worker.on("error", (err) => {
    logger.error({ err }, "Campaign sender worker error");
  });

  logger.info("Campaign sender worker started");
}
