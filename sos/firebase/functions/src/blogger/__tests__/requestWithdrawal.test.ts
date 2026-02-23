/**
 * Tests: requestBloggerWithdrawal (Blogger)
 *
 * Covers: auth, Telegram gate, blogger status validation,
 * minimum withdrawal ($10 = 1000 cents), payment method validation,
 * happy paths (Wise, bank transfer, mobile money), Telegram failure.
 */

// ============================================================================
// Capture onCall handler
// ============================================================================

const captured = { handler: null as ((req: any) => Promise<any>) | null };

class MockHttpsError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "HttpsError";
  }
}

jest.mock("firebase-functions/v2/https", () => ({
  onCall: jest.fn((_config: any, handler: any) => {
    captured.handler = handler;
    return jest.fn();
  }),
  HttpsError: MockHttpsError,
}));

// ============================================================================
// Firestore mocks
// ============================================================================

const mockUserDocGet = jest.fn();
const mockBloggerDocGet = jest.fn();
const mockBloggerDocUpdate = jest.fn().mockResolvedValue({});

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({
    doc: jest.fn((_path: string) => ({
      id: "doc-id",
      get: mockUserDocGet,
      update: jest.fn().mockResolvedValue({}),
    })),
    collection: jest.fn((_name: string) => ({
      doc: jest.fn((_id?: string) => ({
        id: _id || "gen-id",
        get: mockBloggerDocGet,
        update: mockBloggerDocUpdate,
        set: jest.fn().mockResolvedValue({}),
      })),
      where: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
          })),
        })),
      })),
    })),
    runTransaction: jest.fn(),
  })),
  FieldValue: {
    arrayUnion: jest.fn((...a: unknown[]) => a),
    serverTimestamp: jest.fn(() => "mock-ts"),
  },
  Timestamp: { now: jest.fn(() => ({ toDate: () => new Date() })) },
}));

jest.mock("firebase-functions/v2", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock("firebase-admin/app", () => ({
  getApps: jest.fn(() => [{ name: "default" }]),
  initializeApp: jest.fn(),
}));

// ============================================================================
// Dependency mocks
// ============================================================================

const mockGetBloggerConfigCached = jest.fn().mockResolvedValue({
  withdrawalsEnabled: true,
  minimumWithdrawalAmount: 1000,
  maximumWithdrawalAmount: 100000,
});

jest.mock("../utils/bloggerConfigService", () => ({
  getBloggerConfigCached: (...a: any[]) => mockGetBloggerConfigCached(...a),
}));

const mockSavePaymentMethod = jest.fn().mockResolvedValue({ id: "pm-blogger-1" });
const mockCreateWithdrawalRequest = jest.fn().mockResolvedValue({ id: "wd-blogger-1" });
const mockCancelWithdrawal = jest.fn().mockResolvedValue({});

jest.mock("../../payment/services/paymentService", () => ({
  getPaymentService: jest.fn(() => ({
    savePaymentMethod: mockSavePaymentMethod,
    createWithdrawalRequest: mockCreateWithdrawalRequest,
    cancelWithdrawal: mockCancelWithdrawal,
  })),
}));

const mockSendWithdrawalConfirmation = jest.fn().mockResolvedValue({ success: true });

jest.mock("../../telegram/withdrawalConfirmation", () => ({
  sendWithdrawalConfirmation: (...a: any[]) => mockSendWithdrawalConfirmation(...a),
}));

jest.mock("../../lib/secrets", () => ({ TELEGRAM_SECRETS: [] }));
jest.mock("../../lib/functionConfigs", () => ({ ALLOWED_ORIGINS: ["*"] }));

// ============================================================================
// Load module
// ============================================================================

import "../callables/requestWithdrawal";

// ============================================================================
// Helpers
// ============================================================================

function callHandler(auth: any, data: any) {
  if (!captured.handler) throw new Error("Handler not captured");
  return captured.handler({ auth, data });
}

function setupHappyBlogger(balance = 5000) {
  mockUserDocGet.mockResolvedValue({
    exists: true,
    data: () => ({ telegramId: 111222333 }),
  });
  mockBloggerDocGet.mockResolvedValue({
    exists: true,
    data: () => ({
      status: "active",
      availableBalance: balance,
      email: "blogger@test.com",
      firstName: "Blog",
      pendingWithdrawalId: null,
    }),
  });
}

const WISE_INPUT = {
  paymentMethod: "wise",
  paymentDetails: {
    type: "wise",
    email: "blog@wise.com",
    accountHolderName: "Test Blogger",
  },
  amount: 2000,
};

const BANK_INPUT = {
  paymentMethod: "bank_transfer",
  paymentDetails: {
    type: "bank_transfer",
    bankName: "Société Générale",
    accountHolderName: "Test Blogger",
    accountNumber: "FR7630003000001234567890146",
  },
  amount: 3000,
};

const MOBILE_INPUT = {
  paymentMethod: "mobile_money",
  paymentDetails: {
    type: "mobile_money",
    provider: "wave",
    phoneNumber: "+221781234567",
    country: "SN",
  },
  amount: 1200,
};

// ============================================================================
// Tests
// ============================================================================

describe("Blogger requestWithdrawal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendWithdrawalConfirmation.mockResolvedValue({ success: true });
    mockSavePaymentMethod.mockResolvedValue({ id: "pm-blogger-1" });
    mockCreateWithdrawalRequest.mockResolvedValue({ id: "wd-blogger-1" });
  });

  // --------------------------------------------------------------------------
  // Auth & Telegram
  // --------------------------------------------------------------------------

  describe("Authentication", () => {
    it("throws unauthenticated when no auth", async () => {
      await expect(callHandler(null, WISE_INPUT)).rejects.toMatchObject({
        code: "unauthenticated",
      });
    });
  });

  describe("Telegram gate", () => {
    it("throws failed-precondition (TELEGRAM_REQUIRED) when no telegramId", async () => {
      mockUserDocGet.mockResolvedValue({ exists: true, data: () => ({}) });
      const err: any = await callHandler({ uid: "b1" }, WISE_INPUT).catch((e) => e);
      expect(err.code).toBe("failed-precondition");
      expect(err.message).toContain("TELEGRAM_REQUIRED");
    });

    it("throws when user doc doesn't exist", async () => {
      mockUserDocGet.mockResolvedValue({ exists: false, data: () => null });
      const err: any = await callHandler({ uid: "b1" }, WISE_INPUT).catch((e) => e);
      expect(err.code).toBe("failed-precondition");
    });
  });

  // --------------------------------------------------------------------------
  // Input validation (Blogger-specific)
  // --------------------------------------------------------------------------

  describe("Input validation", () => {
    beforeEach(() => {
      mockUserDocGet.mockResolvedValue({ exists: true, data: () => ({ telegramId: 111 }) });
    });

    it("throws invalid-argument for missing paymentMethod", async () => {
      await expect(
        callHandler({ uid: "b1" }, { paymentDetails: { type: "wise" } })
      ).rejects.toMatchObject({ code: "invalid-argument" });
    });

    it("throws invalid-argument for missing paymentDetails", async () => {
      await expect(
        callHandler({ uid: "b1" }, { paymentMethod: "wise" })
      ).rejects.toMatchObject({ code: "invalid-argument" });
    });

    it("throws invalid-argument when type mismatch between method and details", async () => {
      await expect(
        callHandler({ uid: "b1" }, {
          paymentMethod: "wise",
          paymentDetails: { type: "bank_transfer", bankName: "X", accountHolderName: "X", accountNumber: "123" },
        })
      ).rejects.toMatchObject({ code: "invalid-argument" });
    });

    it("throws invalid-argument for wise without email", async () => {
      await expect(
        callHandler({ uid: "b1" }, {
          paymentMethod: "wise",
          paymentDetails: { type: "wise", accountHolderName: "X" },
        })
      ).rejects.toMatchObject({ code: "invalid-argument" });
    });

    it("throws invalid-argument for mobile_money without phoneNumber", async () => {
      await expect(
        callHandler({ uid: "b1" }, {
          paymentMethod: "mobile_money",
          paymentDetails: { type: "mobile_money", provider: "wave", country: "SN" },
        })
      ).rejects.toMatchObject({ code: "invalid-argument" });
    });

    it("throws invalid-argument for bank_transfer without accountNumber", async () => {
      await expect(
        callHandler({ uid: "b1" }, {
          paymentMethod: "bank_transfer",
          paymentDetails: { type: "bank_transfer", bankName: "X", accountHolderName: "X" },
        })
      ).rejects.toMatchObject({ code: "invalid-argument" });
    });
  });

  // --------------------------------------------------------------------------
  // Profile validation
  // --------------------------------------------------------------------------

  describe("Blogger profile validation", () => {
    beforeEach(() => {
      mockUserDocGet.mockResolvedValue({ exists: true, data: () => ({ telegramId: 111 }) });
    });

    it("throws not-found when blogger profile does not exist", async () => {
      mockBloggerDocGet.mockResolvedValue({ exists: false, data: () => null });
      await expect(callHandler({ uid: "b1" }, WISE_INPUT)).rejects.toMatchObject({
        code: "not-found",
      });
    });

    it("throws permission-denied when blogger is suspended", async () => {
      mockBloggerDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ status: "suspended", availableBalance: 5000 }),
      });
      await expect(callHandler({ uid: "b1" }, WISE_INPUT)).rejects.toMatchObject({
        code: "permission-denied",
      });
    });

    it("throws failed-precondition when pending withdrawal exists", async () => {
      mockBloggerDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          status: "active",
          availableBalance: 5000,
          pendingWithdrawalId: "wd-old",
        }),
      });
      await expect(callHandler({ uid: "b1" }, WISE_INPUT)).rejects.toMatchObject({
        code: "failed-precondition",
      });
    });
  });

  // --------------------------------------------------------------------------
  // Amount validation
  // --------------------------------------------------------------------------

  describe("Amount validation ($10 minimum)", () => {
    beforeEach(() => {
      mockUserDocGet.mockResolvedValue({ exists: true, data: () => ({ telegramId: 111 }) });
      mockBloggerDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ status: "active", availableBalance: 5000 }),
      });
    });

    it("rejects amount below $10 (999 cents)", async () => {
      const err: any = await callHandler({ uid: "b1" }, { ...WISE_INPUT, amount: 999 }).catch((e) => e);
      expect(err).toBeDefined();
      expect(["invalid-argument", "failed-precondition"]).toContain(err.code);
    });

    it("rejects negative amount", async () => {
      // validateInput throws invalid-argument for negative amounts
      await expect(
        callHandler({ uid: "b1" }, { ...WISE_INPUT, amount: -100 })
      ).rejects.toMatchObject({ code: "invalid-argument" });
    });

    it("rejects amount exceeding balance", async () => {
      const err: any = await callHandler({ uid: "b1" }, { ...WISE_INPUT, amount: 9999 }).catch((e) => e);
      expect(err).toBeDefined();
      expect(["invalid-argument", "failed-precondition"]).toContain(err.code);
    });
  });

  // --------------------------------------------------------------------------
  // Happy paths
  // --------------------------------------------------------------------------

  describe("Happy path — Wise", () => {
    it("creates withdrawal successfully", async () => {
      setupHappyBlogger();
      const result = await callHandler({ uid: "b1" }, WISE_INPUT);
      expect(result.success).toBe(true);
      expect(result.withdrawalId).toBe("wd-blogger-1");
      expect(result.telegramConfirmationRequired).toBe(true);
    });

    it("saves payment method with userType=blogger", async () => {
      setupHappyBlogger();
      await callHandler({ uid: "b1" }, WISE_INPUT);
      expect(mockSavePaymentMethod).toHaveBeenCalledWith(
        expect.objectContaining({ userType: "blogger" })
      );
    });

    it("sends Telegram confirmation for blogger role", async () => {
      setupHappyBlogger();
      await callHandler({ uid: "b1" }, WISE_INPUT);
      expect(mockSendWithdrawalConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "blogger",
          collection: "payment_withdrawals",
          telegramId: 111222333,
        })
      );
    });
  });

  describe("Happy path — Bank Transfer", () => {
    it("creates bank transfer withdrawal", async () => {
      setupHappyBlogger();
      const result = await callHandler({ uid: "b1" }, BANK_INPUT);
      expect(result.success).toBe(true);
    });

    it("sets correct amount from input", async () => {
      setupHappyBlogger();
      await callHandler({ uid: "b1" }, BANK_INPUT);
      expect(mockCreateWithdrawalRequest).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 3000 })
      );
    });
  });

  describe("Happy path — Mobile Money (Africa)", () => {
    it("creates mobile money withdrawal", async () => {
      setupHappyBlogger();
      const result = await callHandler({ uid: "b2" }, MOBILE_INPUT);
      expect(result.success).toBe(true);
    });

    it("stores Wave Mobile Money provider correctly", async () => {
      setupHappyBlogger();
      await callHandler({ uid: "b2" }, MOBILE_INPUT);
      expect(mockSavePaymentMethod).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            provider: "wave",
            country: "SN",
          }),
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // Telegram failure
  // --------------------------------------------------------------------------

  describe("Telegram failure", () => {
    it("cancels withdrawal and throws TELEGRAM_SEND_FAILED", async () => {
      setupHappyBlogger();
      mockSendWithdrawalConfirmation.mockResolvedValue({ success: false });
      await expect(callHandler({ uid: "b1" }, WISE_INPUT)).rejects.toMatchObject({
        code: "unavailable",
        message: "TELEGRAM_SEND_FAILED",
      });
      expect(mockCancelWithdrawal).toHaveBeenCalledWith(
        "wd-blogger-1",
        "b1",
        expect.any(String)
      );
    });
  });

  // --------------------------------------------------------------------------
  // Minimum $10 checks
  // --------------------------------------------------------------------------

  describe("Minimum $10 verification", () => {
    it("allows $10 withdrawal (1000 cents)", async () => {
      setupHappyBlogger();
      const result = await callHandler({ uid: "b1" }, { ...WISE_INPUT, amount: 1000 });
      expect(result.success).toBe(true);
    });

    it("allows $15 (was previously blocked by old $25 minimum)", async () => {
      setupHappyBlogger();
      const result = await callHandler({ uid: "b1" }, { ...WISE_INPUT, amount: 1500 });
      expect(result.success).toBe(true);
    });

    it("allows $20 (was previously blocked by old $25 minimum)", async () => {
      setupHappyBlogger();
      const result = await callHandler({ uid: "b1" }, { ...WISE_INPUT, amount: 2000 });
      expect(result.success).toBe(true);
    });
  });
});
