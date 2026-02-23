/**
 * Tests: requestWithdrawal (Chatter)
 *
 * Covers: auth, Telegram gate, account status, balance validation,
 * minimum withdrawal ($10 = 1000 cents), happy paths, Telegram failure.
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

const mockDocGet = jest.fn();
const mockDocUpdate = jest.fn().mockResolvedValue({});
const mockCollDocGet = jest.fn();
const mockCollDocUpdate = jest.fn().mockResolvedValue({});
const mockCollDocSet = jest.fn().mockResolvedValue({});

const mockDbDoc = jest.fn((_path: string) => ({
  id: "doc-id",
  get: mockDocGet,
  update: mockDocUpdate,
}));

const mockCollectionDocFn = jest.fn((_id?: string) => ({
  id: _id || "generated-id",
  get: mockCollDocGet,
  update: mockCollDocUpdate,
  set: mockCollDocSet,
}));

const mockWhereChain: jest.Mock = jest.fn(() => ({
  where: mockWhereChain,
  limit: jest.fn(() => ({ get: jest.fn().mockResolvedValue({ empty: true, docs: [] }) })),
  get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
}));

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({
    doc: mockDbDoc,
    collection: jest.fn((_name: string) => ({
      doc: mockCollectionDocFn,
      where: mockWhereChain,
    })),
    runTransaction: jest.fn(),
  })),
  FieldValue: {
    arrayUnion: jest.fn((...args: unknown[]) => args),
    serverTimestamp: jest.fn(() => "mock-ts"),
  },
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date() })),
  },
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

const mockGetChatterConfigCached = jest.fn();
const mockAreWithdrawalsEnabled = jest.fn().mockReturnValue(true);
const mockGetMinimumWithdrawalAmount = jest.fn().mockReturnValue(1000); // $10

jest.mock("../utils", () => ({
  getChatterConfigCached: (...args: any[]) => mockGetChatterConfigCached(...args),
  areWithdrawalsEnabled: (...args: any[]) => mockAreWithdrawalsEnabled(...args),
  getMinimumWithdrawalAmount: (...args: any[]) => mockGetMinimumWithdrawalAmount(...args),
}));

const mockSavePaymentMethod = jest.fn();
const mockCreateWithdrawalRequest = jest.fn();
const mockCancelWithdrawal = jest.fn();

jest.mock("../../payment/services/paymentService", () => ({
  getPaymentService: jest.fn(() => ({
    savePaymentMethod: mockSavePaymentMethod,
    createWithdrawalRequest: mockCreateWithdrawalRequest,
    cancelWithdrawal: mockCancelWithdrawal,
  })),
}));

const mockSendWithdrawalConfirmation = jest.fn();

jest.mock("../../telegram/withdrawalConfirmation", () => ({
  sendWithdrawalConfirmation: (...args: any[]) =>
    mockSendWithdrawalConfirmation(...args),
}));

jest.mock("../../lib/secrets", () => ({ TELEGRAM_SECRETS: [] }));
jest.mock("../../lib/functionConfigs", () => ({ ALLOWED_ORIGINS: ["*"] }));

// ============================================================================
// Load the module (triggers onCall, captures handler)
// ============================================================================

import "../callables/requestWithdrawal";

// ============================================================================
// Helpers
// ============================================================================

function callHandler(auth: any, data: any) {
  if (!captured.handler) throw new Error("Handler not captured");
  return captured.handler({ auth, data });
}

const VALID_WISE_INPUT = {
  paymentMethod: "wise",
  paymentDetails: {
    type: "wise",
    email: "chatter@wise.com",
    currency: "USD",
    accountHolderName: "Test Chatter",
  },
  amount: 2000, // $20
};

const VALID_BANK_INPUT = {
  paymentMethod: "bank_transfer",
  paymentDetails: {
    type: "bank_transfer",
    bankName: "BNP Paribas",
    accountHolderName: "Test Chatter",
    accountNumber: "FR7630004000031234567890143",
  },
  amount: 2000,
};

const VALID_MOBILE_INPUT = {
  paymentMethod: "mobile_money",
  paymentDetails: {
    type: "mobile_money",
    provider: "orange_money",
    phoneNumber: "+221771234567",
    country: "SN",
  },
  amount: 1500,
};

function setupHappyPath(balance = 5000) {
  // User has Telegram
  mockDocGet.mockResolvedValue({
    exists: true,
    data: () => ({ telegramId: 123456789 }),
  });
  // Chatter is active with balance
  mockCollDocGet.mockResolvedValue({
    exists: true,
    data: () => ({
      status: "active",
      availableBalance: balance,
      email: "chatter@test.com",
      firstName: "Chatter",
      pendingWithdrawalId: null,
    }),
  });
  mockGetChatterConfigCached.mockResolvedValue({
    withdrawalsEnabled: true,
    minimumWithdrawalAmount: 1000,
  });
  mockSavePaymentMethod.mockResolvedValue({ id: "pm-123" });
  mockCreateWithdrawalRequest.mockResolvedValue({ id: "wd-456" });
  mockSendWithdrawalConfirmation.mockResolvedValue({ success: true });
}

// ============================================================================
// Test Suite
// ============================================================================

describe("Chatter requestWithdrawal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAreWithdrawalsEnabled.mockReturnValue(true);
    mockGetMinimumWithdrawalAmount.mockReturnValue(1000);
  });

  // --------------------------------------------------------------------------
  // Authentication
  // --------------------------------------------------------------------------

  describe("Authentication", () => {
    it("throws unauthenticated when no auth", async () => {
      await expect(callHandler(null, VALID_WISE_INPUT)).rejects.toMatchObject({
        code: "unauthenticated",
      });
    });
  });

  // --------------------------------------------------------------------------
  // Input validation
  // --------------------------------------------------------------------------

  describe("Input validation", () => {
    it("throws invalid-argument when paymentMethod is missing", async () => {
      await expect(
        callHandler({ uid: "u1" }, { paymentDetails: { type: "wise" } })
      ).rejects.toMatchObject({ code: "invalid-argument" });
    });

    it("throws invalid-argument when paymentDetails is missing", async () => {
      await expect(
        callHandler({ uid: "u1" }, { paymentMethod: "wise" })
      ).rejects.toMatchObject({ code: "invalid-argument" });
    });

    it("throws invalid-argument for unknown payment method", async () => {
      await expect(
        callHandler({ uid: "u1" }, { paymentMethod: "crypto", paymentDetails: { type: "crypto" } })
      ).rejects.toMatchObject({ code: "invalid-argument" });
    });

    it("throws invalid-argument for wise without email", async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ telegramId: 123 }),
      });
      await expect(
        callHandler({ uid: "u1" }, {
          paymentMethod: "wise",
          paymentDetails: { type: "wise", currency: "USD", accountHolderName: "X" },
        })
      ).rejects.toMatchObject({ code: "invalid-argument" });
    });

    it("throws invalid-argument for mobile_money without phoneNumber", async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ telegramId: 123 }),
      });
      await expect(
        callHandler({ uid: "u1" }, {
          paymentMethod: "mobile_money",
          paymentDetails: { type: "mobile_money", provider: "orange_money", country: "SN" },
        })
      ).rejects.toMatchObject({ code: "invalid-argument" });
    });

    it("throws invalid-argument for bank_transfer without bankName", async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ telegramId: 123 }),
      });
      await expect(
        callHandler({ uid: "u1" }, {
          paymentMethod: "bank_transfer",
          paymentDetails: { type: "bank_transfer", accountHolderName: "X", accountNumber: "123" },
        })
      ).rejects.toMatchObject({ code: "invalid-argument" });
    });

    it("throws invalid-argument for invalid phone number format", async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ telegramId: 123 }),
      });
      await expect(
        callHandler({ uid: "u1" }, {
          paymentMethod: "mobile_money",
          paymentDetails: { type: "mobile_money", provider: "orange_money", phoneNumber: "ABC123", country: "SN" },
        })
      ).rejects.toMatchObject({ code: "invalid-argument" });
    });
  });

  // --------------------------------------------------------------------------
  // Telegram gate
  // --------------------------------------------------------------------------

  describe("Telegram gate", () => {
    it("throws failed-precondition (TELEGRAM_REQUIRED) when user has no telegramId", async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({}), // no telegramId
      });
      const err: any = await callHandler({ uid: "u1" }, VALID_WISE_INPUT).catch((e) => e);
      expect(err.code).toBe("failed-precondition");
      expect(err.message).toContain("TELEGRAM_REQUIRED");
    });

    it("throws failed-precondition when user doc does not exist", async () => {
      mockDocGet.mockResolvedValue({ exists: false, data: () => null });
      const err: any = await callHandler({ uid: "u1" }, VALID_WISE_INPUT).catch((e) => e);
      expect(err.code).toBe("failed-precondition");
    });
  });

  // --------------------------------------------------------------------------
  // Chatter profile
  // --------------------------------------------------------------------------

  describe("Chatter profile", () => {
    beforeEach(() => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ telegramId: 123456789 }),
      });
    });

    it("throws not-found when chatter profile does not exist", async () => {
      mockCollDocGet.mockResolvedValue({ exists: false, data: () => null });
      await expect(callHandler({ uid: "u1" }, VALID_WISE_INPUT)).rejects.toMatchObject({
        code: "not-found",
      });
    });

    it("throws failed-precondition when chatter account is suspended", async () => {
      mockCollDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ status: "suspended", availableBalance: 5000 }),
      });
      await expect(callHandler({ uid: "u1" }, VALID_WISE_INPUT)).rejects.toMatchObject({
        code: "failed-precondition",
      });
    });

    it("throws failed-precondition when chatter account is inactive", async () => {
      mockCollDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ status: "inactive", availableBalance: 5000 }),
      });
      await expect(callHandler({ uid: "u1" }, VALID_WISE_INPUT)).rejects.toMatchObject({
        code: "failed-precondition",
      });
    });

    it("throws failed-precondition when pending withdrawal already exists", async () => {
      mockCollDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          status: "active",
          availableBalance: 5000,
          pendingWithdrawalId: "existing-wd-789",
        }),
      });
      await expect(callHandler({ uid: "u1" }, VALID_WISE_INPUT)).rejects.toMatchObject({
        code: "failed-precondition",
      });
    });
  });

  // --------------------------------------------------------------------------
  // Configuration & amount validation
  // --------------------------------------------------------------------------

  describe("Amount & config validation", () => {
    beforeEach(() => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ telegramId: 123456789 }),
      });
      mockCollDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          status: "active",
          availableBalance: 5000,
          email: "c@test.com",
          firstName: "Chatter",
        }),
      });
      mockGetChatterConfigCached.mockResolvedValue({ withdrawalsEnabled: true });
    });

    it("throws failed-precondition when withdrawals are disabled", async () => {
      mockAreWithdrawalsEnabled.mockReturnValue(false);
      await expect(callHandler({ uid: "u1" }, VALID_WISE_INPUT)).rejects.toMatchObject({
        code: "failed-precondition",
      });
    });

    it("throws invalid-argument when amount is below $10 minimum (1000 cents)", async () => {
      mockGetMinimumWithdrawalAmount.mockReturnValue(1000);
      await expect(
        callHandler({ uid: "u1" }, { ...VALID_WISE_INPUT, amount: 500 }) // $5 < $10
      ).rejects.toMatchObject({ code: "invalid-argument" });
    });

    it("allows withdrawal at exactly $10 minimum (1000 cents)", async () => {
      mockGetMinimumWithdrawalAmount.mockReturnValue(1000);
      mockSavePaymentMethod.mockResolvedValue({ id: "pm-1" });
      mockCreateWithdrawalRequest.mockResolvedValue({ id: "wd-1" });
      mockSendWithdrawalConfirmation.mockResolvedValue({ success: true });
      const result = await callHandler({ uid: "u1" }, { ...VALID_WISE_INPUT, amount: 1000 });
      expect(result.success).toBe(true);
    });

    it("throws invalid-argument when amount exceeds available balance", async () => {
      await expect(
        callHandler({ uid: "u1" }, { ...VALID_WISE_INPUT, amount: 9999 }) // more than 5000
      ).rejects.toMatchObject({ code: "invalid-argument" });
    });

    it("uses full availableBalance when no amount specified", async () => {
      mockGetMinimumWithdrawalAmount.mockReturnValue(1000);
      mockSavePaymentMethod.mockResolvedValue({ id: "pm-1" });
      mockCreateWithdrawalRequest.mockResolvedValue({ id: "wd-full" });
      mockSendWithdrawalConfirmation.mockResolvedValue({ success: true });
      // No amount in input → uses chatter.availableBalance (5000)
      const result = await callHandler({ uid: "u1" }, {
        paymentMethod: "wise",
        paymentDetails: { type: "wise", email: "x@wise.com", currency: "USD", accountHolderName: "X" },
      });
      expect(result.success).toBe(true);
      expect(mockCreateWithdrawalRequest).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 5000 })
      );
    });
  });

  // --------------------------------------------------------------------------
  // Happy paths — 3 payment methods
  // --------------------------------------------------------------------------

  describe("Happy path — Wise withdrawal", () => {
    it("creates withdrawal successfully and returns telegramConfirmationRequired", async () => {
      setupHappyPath();
      const result = await callHandler({ uid: "chatter-1" }, VALID_WISE_INPUT);
      expect(result.success).toBe(true);
      expect(result.withdrawalId).toBe("wd-456");
      expect(result.status).toBe("pending");
      expect(result.telegramConfirmationRequired).toBe(true);
    });

    it("saves payment method with userType=chatter", async () => {
      setupHappyPath();
      await callHandler({ uid: "chatter-1" }, VALID_WISE_INPUT);
      expect(mockSavePaymentMethod).toHaveBeenCalledWith(
        expect.objectContaining({ userType: "chatter" })
      );
    });

    it("creates withdrawal with correct role and amount", async () => {
      setupHappyPath();
      await callHandler({ uid: "chatter-1" }, VALID_WISE_INPUT);
      expect(mockCreateWithdrawalRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "chatter-1",
          userType: "chatter",
          amount: 2000,
        })
      );
    });

    it("updates chatters doc with pendingWithdrawalId", async () => {
      setupHappyPath();
      await callHandler({ uid: "chatter-1" }, VALID_WISE_INPUT);
      expect(mockCollDocUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ pendingWithdrawalId: "wd-456" })
      );
    });

    it("sends Telegram confirmation with correct amount", async () => {
      setupHappyPath();
      await callHandler({ uid: "chatter-1" }, VALID_WISE_INPUT);
      expect(mockSendWithdrawalConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 2000,
          role: "chatter",
          collection: "payment_withdrawals",
          telegramId: 123456789,
        })
      );
    });
  });

  describe("Happy path — Bank Transfer withdrawal", () => {
    it("creates bank transfer withdrawal successfully", async () => {
      setupHappyPath();
      const result = await callHandler({ uid: "chatter-2" }, VALID_BANK_INPUT);
      expect(result.success).toBe(true);
      expect(result.telegramConfirmationRequired).toBe(true);
    });

    it("converts bank_transfer details to centralized format", async () => {
      setupHappyPath();
      await callHandler({ uid: "chatter-2" }, VALID_BANK_INPUT);
      expect(mockSavePaymentMethod).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({ type: "bank_transfer" }),
        })
      );
    });
  });

  describe("Happy path — Mobile Money withdrawal", () => {
    it("creates mobile money withdrawal successfully", async () => {
      setupHappyPath();
      const result = await callHandler({ uid: "chatter-3" }, VALID_MOBILE_INPUT);
      expect(result.success).toBe(true);
    });

    it("converts mobile_money details with correct provider", async () => {
      setupHappyPath();
      await callHandler({ uid: "chatter-3" }, VALID_MOBILE_INPUT);
      expect(mockSavePaymentMethod).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            type: "mobile_money",
            provider: "orange_money",
            phoneNumber: "+221771234567",
          }),
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // Telegram failure → auto-cancel
  // --------------------------------------------------------------------------

  describe("Telegram confirmation failure", () => {
    it("cancels withdrawal and throws unavailable when Telegram fails", async () => {
      setupHappyPath();
      mockSendWithdrawalConfirmation.mockResolvedValue({ success: false });
      await expect(callHandler({ uid: "chatter-1" }, VALID_WISE_INPUT)).rejects.toMatchObject({
        code: "unavailable",
        message: "TELEGRAM_SEND_FAILED",
      });
      expect(mockCancelWithdrawal).toHaveBeenCalledWith(
        "wd-456",
        "chatter-1",
        expect.stringContaining("Telegram")
      );
    });

    it("still throws even if cancel also fails", async () => {
      setupHappyPath();
      mockSendWithdrawalConfirmation.mockResolvedValue({ success: false });
      mockCancelWithdrawal.mockRejectedValue(new Error("cancel failed"));
      await expect(callHandler({ uid: "chatter-1" }, VALID_WISE_INPUT)).rejects.toMatchObject({
        code: "unavailable",
      });
    });
  });

  // --------------------------------------------------------------------------
  // Minimum withdrawal = $10 (1000 cents) — critical after CORRECTION 6
  // --------------------------------------------------------------------------

  describe("Minimum withdrawal enforcement ($10 = 1000 cents)", () => {
    it("rejects $9.99 (999 cents)", async () => {
      mockDocGet.mockResolvedValue({ exists: true, data: () => ({ telegramId: 1 }) });
      mockCollDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ status: "active", availableBalance: 5000 }),
      });
      mockGetChatterConfigCached.mockResolvedValue({});
      mockGetMinimumWithdrawalAmount.mockReturnValue(1000);
      await expect(
        callHandler({ uid: "u" }, { ...VALID_WISE_INPUT, amount: 999 })
      ).rejects.toMatchObject({ code: "invalid-argument" });
    });

    it("accepts $10.00 (1000 cents)", async () => {
      setupHappyPath();
      mockGetMinimumWithdrawalAmount.mockReturnValue(1000);
      const result = await callHandler({ uid: "u" }, { ...VALID_WISE_INPUT, amount: 1000 });
      expect(result.success).toBe(true);
    });

    it("does NOT enforce old $25 minimum (2500 cents)", async () => {
      setupHappyPath();
      mockGetMinimumWithdrawalAmount.mockReturnValue(1000); // New minimum
      // $15 (1500 cents) should pass with the new $10 minimum
      const result = await callHandler({ uid: "u" }, { ...VALID_WISE_INPUT, amount: 1500 });
      expect(result.success).toBe(true);
    });
  });
});
