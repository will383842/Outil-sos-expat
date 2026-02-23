/**
 * Tests: requestInfluencerWithdrawal (Influencer)
 *
 * Covers: auth, Telegram gate, influencer profile validation,
 * minimum withdrawal ($10 = 1000 cents), happy paths, Telegram failure.
 * Region: europe-west2
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
const mockInfluencerDocGet = jest.fn();
const mockInfluencerDocUpdate = jest.fn().mockResolvedValue({});

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({
    doc: jest.fn((path: string) => ({
      id: path.split("/").pop(),
      get: mockUserDocGet,
      update: jest.fn().mockResolvedValue({}),
    })),
    collection: jest.fn((_name: string) => ({
      doc: jest.fn((_id?: string) => ({
        id: _id || "gen-id",
        get: mockInfluencerDocGet,
        update: mockInfluencerDocUpdate,
        set: jest.fn().mockResolvedValue({}),
      })),
      where: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => ({ get: jest.fn().mockResolvedValue({ empty: true }) })),
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

const mockGetInfluencerConfigCached = jest.fn().mockResolvedValue({
  withdrawalsEnabled: true,
  minimumWithdrawalAmount: 1000,
  maximumWithdrawalAmount: 100000,
});

jest.mock("../utils", () => ({
  getInfluencerConfigCached: (...a: any[]) => mockGetInfluencerConfigCached(...a),
}));

const mockSavePaymentMethod = jest.fn().mockResolvedValue({ id: "pm-inf-1" });
const mockCreateWithdrawalRequest = jest.fn().mockResolvedValue({ id: "wd-inf-1" });
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

function setupHappyInfluencer(balance = 5000) {
  mockUserDocGet.mockResolvedValue({
    exists: true,
    data: () => ({ telegramId: 987654321 }),
  });
  mockInfluencerDocGet.mockResolvedValue({
    exists: true,
    data: () => ({
      status: "active",
      availableBalance: balance,
      email: "influencer@test.com",
      firstName: "Inf",
      pendingWithdrawalId: null,
    }),
  });
}

const WISE_INPUT = {
  paymentMethod: "wise",
  paymentDetails: {
    type: "wise",
    email: "inf@wise.com",
    currency: "EUR",
    accountHolderName: "Test Influencer",
  },
  amount: 2000,
};

const MOBILE_INPUT = {
  paymentMethod: "mobile_money",
  paymentDetails: {
    type: "mobile_money",
    provider: "mtn_mobile_money",
    phoneNumber: "+22670123456",
    country: "BF",
  },
  amount: 1500,
};

// ============================================================================
// Tests
// ============================================================================

describe("Influencer requestWithdrawal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendWithdrawalConfirmation.mockResolvedValue({ success: true });
    mockSavePaymentMethod.mockResolvedValue({ id: "pm-inf-1" });
    mockCreateWithdrawalRequest.mockResolvedValue({ id: "wd-inf-1" });
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
      const err: any = await callHandler({ uid: "inf1" }, WISE_INPUT).catch((e) => e);
      expect(err.code).toBe("failed-precondition");
      expect(err.message).toContain("TELEGRAM_REQUIRED");
    });
  });

  // --------------------------------------------------------------------------
  // Profile validation
  // --------------------------------------------------------------------------

  describe("Influencer profile validation", () => {
    beforeEach(() => {
      mockUserDocGet.mockResolvedValue({ exists: true, data: () => ({ telegramId: 123 }) });
    });

    it("throws not-found when influencer profile does not exist", async () => {
      mockInfluencerDocGet.mockResolvedValue({ exists: false, data: () => null });
      await expect(callHandler({ uid: "inf1" }, WISE_INPUT)).rejects.toMatchObject({
        code: "not-found",
      });
    });

    it("throws failed-precondition when influencer is suspended", async () => {
      mockInfluencerDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ status: "suspended", availableBalance: 5000 }),
      });
      await expect(callHandler({ uid: "inf1" }, WISE_INPUT)).rejects.toMatchObject({
        code: "failed-precondition",
      });
    });

    it("throws failed-precondition when pending withdrawal already exists", async () => {
      mockInfluencerDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          status: "active",
          availableBalance: 5000,
          pendingWithdrawalId: "wd-existing",
        }),
      });
      await expect(callHandler({ uid: "inf1" }, WISE_INPUT)).rejects.toMatchObject({
        code: "failed-precondition",
      });
    });
  });

  // --------------------------------------------------------------------------
  // Amount validation
  // --------------------------------------------------------------------------

  describe("Amount validation", () => {
    beforeEach(() => {
      mockUserDocGet.mockResolvedValue({ exists: true, data: () => ({ telegramId: 123 }) });
      mockInfluencerDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ status: "active", availableBalance: 5000 }),
      });
    });

    it("throws when amount below $10 minimum (1000 cents)", async () => {
      const err: any = await callHandler({ uid: "inf1" }, { ...WISE_INPUT, amount: 500 }).catch((e) => e);
      expect(err).toBeDefined();
      expect(["invalid-argument", "failed-precondition"]).toContain(err.code);
    });

    it("throws when amount exceeds balance", async () => {
      const err: any = await callHandler({ uid: "inf1" }, { ...WISE_INPUT, amount: 9999 }).catch((e) => e);
      expect(err).toBeDefined();
      expect(["invalid-argument", "failed-precondition"]).toContain(err.code);
    });
  });

  // --------------------------------------------------------------------------
  // Happy paths
  // --------------------------------------------------------------------------

  describe("Happy path — Wise", () => {
    it("creates withdrawal successfully", async () => {
      setupHappyInfluencer();
      const result = await callHandler({ uid: "inf1" }, WISE_INPUT);
      expect(result.success).toBe(true);
      expect(result.withdrawalId).toBe("wd-inf-1");
      expect(result.telegramConfirmationRequired).toBe(true);
    });

    it("saves payment method with userType=influencer", async () => {
      setupHappyInfluencer();
      await callHandler({ uid: "inf1" }, WISE_INPUT);
      expect(mockSavePaymentMethod).toHaveBeenCalledWith(
        expect.objectContaining({ userType: "influencer" })
      );
    });

    it("creates withdrawal with correct amount", async () => {
      setupHappyInfluencer();
      await callHandler({ uid: "inf1" }, WISE_INPUT);
      expect(mockCreateWithdrawalRequest).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 2000, userType: "influencer" })
      );
    });
  });

  describe("Happy path — Mobile Money (Africa)", () => {
    it("creates mobile money withdrawal for African influencer", async () => {
      setupHappyInfluencer();
      const result = await callHandler({ uid: "inf2" }, MOBILE_INPUT);
      expect(result.success).toBe(true);
    });

    it("converts mobile_money details correctly", async () => {
      setupHappyInfluencer();
      await callHandler({ uid: "inf2" }, MOBILE_INPUT);
      expect(mockSavePaymentMethod).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            type: "mobile_money",
            provider: "mtn_mobile_money",
          }),
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // Telegram failure
  // --------------------------------------------------------------------------

  describe("Telegram failure", () => {
    it("cancels withdrawal and throws unavailable when Telegram fails", async () => {
      setupHappyInfluencer();
      mockSendWithdrawalConfirmation.mockResolvedValue({ success: false });
      await expect(callHandler({ uid: "inf1" }, WISE_INPUT)).rejects.toMatchObject({
        code: "unavailable",
      });
      expect(mockCancelWithdrawal).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Minimum $10 enforcement
  // --------------------------------------------------------------------------

  describe("Minimum $10 (1000 cents) enforcement", () => {
    it("rejects amounts below $10", async () => {
      setupHappyInfluencer();
      const err: any = await callHandler({ uid: "inf1" }, { ...WISE_INPUT, amount: 999 }).catch((e) => e);
      expect(err).toBeDefined();
      expect(["invalid-argument", "failed-precondition"]).toContain(err.code);
    });

    it("accepts exactly $10", async () => {
      setupHappyInfluencer();
      const result = await callHandler({ uid: "inf1" }, { ...WISE_INPUT, amount: 1000 });
      expect(result.success).toBe(true);
    });

    it("accepts amounts between $10 and $25 (old minimum was $25)", async () => {
      setupHappyInfluencer();
      // $15 should now pass (old minimum was $25)
      const result = await callHandler({ uid: "inf1" }, { ...WISE_INPUT, amount: 1500 });
      expect(result.success).toBe(true);
    });
  });
});
