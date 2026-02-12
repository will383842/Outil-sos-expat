import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "./__mocks__/database.js";
import { sendMessage, sendPhoto, sendVideo, sendDocument } from "./__mocks__/telegram.js";

/**
 * The campaignSender worker exports only `startCampaignSenderWorker`, which
 * creates a BullMQ Worker internally.  The actual processing function
 * `processCampaignSend` is private.
 *
 * Strategy: we mock the BullMQ `Worker` constructor to capture the processor
 * callback, then invoke it directly with a fake Job object.
 */

let capturedProcessor: ((job: { data: { campaignId: number } }) => Promise<void>) | null = null;

// Mock BullMQ so importing campaignSender doesn't create a real Worker
vi.mock("bullmq", () => ({
  Worker: class MockWorker {
    constructor(
      _name: string,
      processor: (job: { data: { campaignId: number } }) => Promise<void>,
      _opts?: unknown
    ) {
      capturedProcessor = processor;
    }
    on() {
      return this;
    }
  },
  Queue: class MockQueue {
    add = vi.fn();
    close = vi.fn();
  },
}));

// Import AFTER mocks are set up so aliases & vi.mock take effect
const { startCampaignSenderWorker } = await import(
  "../jobs/workers/campaignSender.js"
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFakeJob(campaignId: number) {
  return { data: { campaignId } } as { data: { campaignId: number } };
}

function makeCampaign(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: "Test campaign",
    status: "sending",
    targetRoles: null,
    targetTags: null,
    targetLanguages: null,
    targetCountries: null,
    messages: [
      {
        id: 1,
        campaignId: 1,
        language: "en",
        content: "Hello {{name}}!",
        parseMode: "HTML",
        mediaType: null,
        mediaUrl: null,
        replyMarkup: null,
      },
    ],
    ...overrides,
  };
}

function makeSubscriber(id: number, chatId: string, lang = "en") {
  return {
    id,
    telegramChatId: chatId,
    language: lang,
    status: "active",
    firstName: "User" + id,
  };
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

beforeEach(() => {
  // Re-capture the processor each time (startCampaignSenderWorker creates
  // a new Worker and the MockWorker constructor stores the callback).
  capturedProcessor = null;
  startCampaignSenderWorker();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("campaignSender — processCampaignSend", () => {
  it("sends text-only message via sendMessage", async () => {
    const campaign = makeCampaign();
    const sub = makeSubscriber(1, "chat_100");

    prisma.campaign.findUnique.mockResolvedValueOnce(campaign);
    prisma.subscriber.findMany.mockResolvedValueOnce([sub]);
    prisma.campaign.update.mockResolvedValue({}); // targetCount + final update
    prisma.messageDelivery.findMany.mockResolvedValueOnce([]); // no already-sent
    prisma.messageDelivery.count.mockResolvedValue(0); // sentCount / failedCount
    prisma.messageDelivery.create.mockResolvedValueOnce({ id: 10 });
    prisma.messageDelivery.update.mockResolvedValue({});

    sendMessage.mockResolvedValueOnce({ ok: true, messageId: 2001 });

    expect(capturedProcessor).not.toBeNull();
    await capturedProcessor!(makeFakeJob(1));

    // sendMessage should have been called (not sendPhoto/sendVideo/sendDocument)
    expect(sendMessage).toHaveBeenCalledOnce();
    expect(sendMessage).toHaveBeenCalledWith(
      "chat_100",
      "Hello {{name}}!",
      "HTML",
      undefined
    );
    expect(sendPhoto).not.toHaveBeenCalled();
    expect(sendVideo).not.toHaveBeenCalled();
    expect(sendDocument).not.toHaveBeenCalled();

    // Final campaign update sets status to "completed"
    const lastCampaignUpdate = prisma.campaign.update.mock.calls.at(-1)?.[0];
    expect(lastCampaignUpdate?.data?.status).toBe("completed");
  });

  it("sends photo message via sendPhoto when mediaType is photo", async () => {
    const campaign = makeCampaign({
      messages: [
        {
          id: 2,
          campaignId: 1,
          language: "en",
          content: "Look at this!",
          parseMode: "HTML",
          mediaType: "photo",
          mediaUrl: "https://example.com/img.jpg",
          replyMarkup: null,
        },
      ],
    });
    const sub = makeSubscriber(1, "chat_200");

    prisma.campaign.findUnique.mockResolvedValueOnce(campaign);
    prisma.subscriber.findMany.mockResolvedValueOnce([sub]);
    prisma.campaign.update.mockResolvedValue({});
    prisma.messageDelivery.findMany.mockResolvedValueOnce([]);
    prisma.messageDelivery.count.mockResolvedValue(0);
    prisma.messageDelivery.create.mockResolvedValueOnce({ id: 11 });
    prisma.messageDelivery.update.mockResolvedValue({});

    sendPhoto.mockResolvedValueOnce({ ok: true, messageId: 2002 });

    await capturedProcessor!(makeFakeJob(1));

    expect(sendPhoto).toHaveBeenCalledOnce();
    expect(sendPhoto).toHaveBeenCalledWith(
      "chat_200",
      "https://example.com/img.jpg",
      "Look at this!",
      "HTML",
      undefined
    );
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("sends video message via sendVideo when mediaType is video", async () => {
    const campaign = makeCampaign({
      messages: [
        {
          id: 3,
          campaignId: 1,
          language: "en",
          content: "Watch this!",
          parseMode: "HTML",
          mediaType: "video",
          mediaUrl: "https://example.com/vid.mp4",
          replyMarkup: null,
        },
      ],
    });
    const sub = makeSubscriber(1, "chat_300");

    prisma.campaign.findUnique.mockResolvedValueOnce(campaign);
    prisma.subscriber.findMany.mockResolvedValueOnce([sub]);
    prisma.campaign.update.mockResolvedValue({});
    prisma.messageDelivery.findMany.mockResolvedValueOnce([]);
    prisma.messageDelivery.count.mockResolvedValue(0);
    prisma.messageDelivery.create.mockResolvedValueOnce({ id: 12 });
    prisma.messageDelivery.update.mockResolvedValue({});

    sendVideo.mockResolvedValueOnce({ ok: true, messageId: 2003 });

    await capturedProcessor!(makeFakeJob(1));

    expect(sendVideo).toHaveBeenCalledOnce();
    expect(sendMessage).not.toHaveBeenCalled();
    expect(sendPhoto).not.toHaveBeenCalled();
  });

  it("stops processing when campaign is paused mid-send", async () => {
    // Create 25 subscribers so the pause check at every-20 messages triggers
    const subs = Array.from({ length: 25 }, (_, i) =>
      makeSubscriber(i + 1, `chat_${400 + i}`)
    );

    const campaign = makeCampaign();

    prisma.campaign.findUnique
      // First call: initial load of campaign
      .mockResolvedValueOnce(campaign)
      // Second call: the mid-send check after 20 messages — return paused
      .mockResolvedValueOnce({ status: "paused" });

    prisma.subscriber.findMany.mockResolvedValueOnce(subs);
    prisma.campaign.update.mockResolvedValue({});
    prisma.messageDelivery.findMany.mockResolvedValueOnce([]); // no already-sent
    // sentCount starts at 0, failedCount starts at 0
    prisma.messageDelivery.count
      .mockResolvedValueOnce(0) // sentCount
      .mockResolvedValueOnce(0); // failedCount
    prisma.messageDelivery.create.mockResolvedValue({ id: 99 });
    prisma.messageDelivery.update.mockResolvedValue({});

    sendMessage.mockResolvedValue({ ok: true, messageId: 9000 });

    await capturedProcessor!(makeFakeJob(1));

    // The worker should have sent exactly 20 messages then stopped on the
    // pause check.  It sends messages 1-20, then on message 21 it hits
    // the check at (sentCount + failedCount) % 20 === 0 && sentCount > 0.
    // So sendMessage is called 20 times.
    expect(sendMessage.mock.calls.length).toBe(20);

    // Campaign status should NOT be set to "completed" — only partial stats saved
    const allCampaignUpdates = prisma.campaign.update.mock.calls;
    const lastUpdate = allCampaignUpdates.at(-1)?.[0];
    expect(lastUpdate?.data?.status).toBeUndefined(); // partial stats save, not "completed"
  });

  it("skips campaign not in 'sending' state", async () => {
    prisma.campaign.findUnique.mockResolvedValueOnce(
      makeCampaign({ status: "draft" })
    );

    await capturedProcessor!(makeFakeJob(1));

    // No subscribers should be fetched
    expect(prisma.subscriber.findMany).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("cancels campaign with no messages", async () => {
    prisma.campaign.findUnique.mockResolvedValueOnce(
      makeCampaign({ messages: [] })
    );
    prisma.campaign.update.mockResolvedValue({});

    await capturedProcessor!(makeFakeJob(1));

    // Should update campaign to cancelled
    expect(prisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ status: "cancelled" }),
      })
    );
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
