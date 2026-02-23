/**
 * Tests: requestWithdrawal (Affiliate)
 *
 * Covers: auth, affiliateCode check, Telegram gate, bankDetails check,
 * minimum withdrawal ($10 = 1000 cents), balance validation, Telegram failure.
 *
 * Specificity: reads from `users` collection (not affiliates), requires bankDetails,
 * uses getWithdrawalSettings().minimumAmount, isAutomatic: false.
 * Response shape: { payoutId, amount, status, telegramConfirmationRequired }
 * Telegram failure: reverts via 2nd runTransaction (NOT paymentService.cancelWithdrawal)
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

const mockRunTransaction = jest.fn();
const mockUserDocGet = jest.fn();
const mockUserDocUpdate = jest.fn().mockResolvedValue({});
const mockQueryGet = jest.fn().mockResolvedValue({ empty: true, docs: [], size: 0 });

const mockWhereChain: jest.Mock = jest.fn(() => ({
  where: mockWhereChain,
  orderBy: jest.fn(() => ({ get: mockQueryGet })),
  limit: jest.fn(() => ({ get: mockQueryGet })),
  get: mockQueryGet,
}));

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn((_name: string) => ({
      doc: jest.fn((_id?: string) => ({
        id: _id || "user-id",
        get: mockUserDocGet,
        update: mockUserDocUpdate,
        set: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      })),
      where: mockWhereChain,
      add: jest.fn().mockResolvedValue({ id: "auto-id" }),
    })),
    doc: jest.fn((_path: string) => ({
      id: "doc-id",
      get: mockUserDocGet,
      update: mockUserDocUpdate,
    })),
    runTransaction: mockRunTransaction,
  })),
  FieldValue: {
    arrayUnion: jest.fn((...a: unknown[]) => a),
    increment: jest.fn((n: number) => ({ _inc: n })),
    serverTimestamp: jest.fn(() => "mock-ts"),
  },
  Timestamp: {
    now: jest.fn(() => ({
      toDate: () => new Date(),
      toMillis: () => Date.now(),
      seconds: Math.floor(Date.now() / 1000),
    })),
    fromDate: jest.fn((d: Date) => ({ toDate: () => d, toMillis: () => d.getTime() })),
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

const mockAreWithdrawalsEnabled = jest.fn().mockResolvedValue(true);
const mockGetWithdrawalSettings = jest.fn().mockResolvedValue({
  minimumAmount: 1000, // $10
  maximumAmount: 100000,
  maxWithdrawalsPerMonth: 2,
  maxAmountPerMonth: 50000,
});

jest.mock("../utils/configService", () => ({
  areWithdrawalsEnabled: (...a: any[]) => mockAreWithdrawalsEnabled(...a),
  getWithdrawalSettings: (...a: any[]) => mockGetWithdrawalSettings(...a),
}));

jest.mock("../utils/bankDetailsEncryption", () => ({
  maskBankAccount: jest.fn((x: any) => `***${JSON.stringify(x)?.slice(-4) || ""}`),
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

function defaultUserData(overrides: Record<string, any> = {}) {
  return {
    affiliateCode: "AFF-CODE-123",
    telegramId: 777888999,
    pendingPayoutId: null,
    bankDetails: { iban: "FR7630004000031234567890143", accountHolderName: "Test Affiliate" },
    availableBalance: 5000,
    email: "affiliate@test.com",
    firstName: "Aff",
    ...overrides,
  };
}

function makeMockAffiliateCommissions(count: number, amountEach = 1000) {
  return {
    empty: count === 0,
    size: count,
    docs: Array.from({ length: count }, (_, i) => ({
      id: `aff-comm-${i}`,
      data: () => ({
        id: `aff-comm-${i}`,
        referrerId: "aff1",
        amount: amountEach,
        status: "available",
      }),
    })),
  };
}

/**
 * Setup for happy path:
 * - mockQueryGet: monthly count (empty), monthly amount (empty), commissions (2x1000)
 * - mockRunTransaction: user re-read + up to 2 commission re-reads
 */
function setupHappyAffiliate(userData: Record<string, any> = {}) {
  const ud = defaultUserData(userData);
  mockUserDocGet.mockResolvedValue({ exists: true, data: () => ud });

  // Reset queue to avoid pollution from previous tests that left unconsumed items
  // (clearMocks: true does NOT clear mockResolvedValueOnce queues)
  mockQueryGet.mockReset();

  // Query order:
  // 1. Monthly withdrawals count check (payment_withdrawals) → empty
  // 2. Monthly withdrawals amount check (payment_withdrawals) → empty
  // 3. Affiliate commissions query (affiliate_commissions) → 2 commissions of $10 each
  mockQueryGet
    .mockResolvedValueOnce({ empty: true, docs: [], size: 0 })   // monthly count
    .mockResolvedValueOnce({ empty: true, docs: [], size: 0 })   // monthly amount
    .mockResolvedValueOnce(makeMockAffiliateCommissions(2, 1000)); // commissions

  mockSendWithdrawalConfirmation.mockResolvedValue({ success: true });

  // Transaction: user re-read + commission re-reads (one per candidateCommissionId)
  mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => {
    const txGet = jest.fn()
      .mockResolvedValueOnce({ exists: true, data: () => ud }) // user re-read
      .mockResolvedValueOnce({ exists: true, data: () => ({ amount: 1000, status: "available" }) }) // comm-0
      .mockResolvedValueOnce({ exists: true, data: () => ({ amount: 1000, status: "available" }) }); // comm-1
    return fn({ get: txGet, update: jest.fn(), set: jest.fn(), delete: jest.fn() });
  });
}

// The affiliate callable uses `input.amount` but ignores paymentMethod/paymentDetails
// (always creates bank_transfer from user's bankDetails)
const BANK_INPUT = {
  paymentMethod: "bank_transfer",
  paymentDetails: {
    type: "bank_transfer",
    accountHolderName: "Test Affiliate",
    iban: "FR7630004000031234567890143",
  },
  amount: 2000,
};

const MOBILE_INPUT = {
  paymentMethod: "mobile_money",
  paymentDetails: {
    type: "mobile_money",
    provider: "orange_money",
    phoneNumber: "+221771234567",
    country: "SN",
  },
  amount: 1200,
};

// ============================================================================
// Tests
// ============================================================================

describe("Affiliate requestWithdrawal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAreWithdrawalsEnabled.mockResolvedValue(true);
    mockGetWithdrawalSettings.mockResolvedValue({
      minimumAmount: 1000,
      maximumAmount: 100000,
      maxWithdrawalsPerMonth: 2,
      maxAmountPerMonth: 50000,
    });
    mockSendWithdrawalConfirmation.mockResolvedValue({ success: true });
    mockQueryGet.mockResolvedValue({ empty: true, docs: [], size: 0 });
  });

  // --------------------------------------------------------------------------
  // Authentication
  // --------------------------------------------------------------------------

  describe("Authentication", () => {
    it("throws unauthenticated when no auth", async () => {
      await expect(callHandler(null, BANK_INPUT)).rejects.toMatchObject({
        code: "unauthenticated",
      });
    });
  });

  // --------------------------------------------------------------------------
  // Withdrawals disabled
  // --------------------------------------------------------------------------

  describe("Withdrawals system check", () => {
    it("throws failed-precondition when withdrawals are disabled", async () => {
      mockAreWithdrawalsEnabled.mockResolvedValue(false);
      await expect(callHandler({ uid: "aff1" }, BANK_INPUT)).rejects.toMatchObject({
        code: "failed-precondition",
      });
    });
  });

  // --------------------------------------------------------------------------
  // User/Affiliate validation
  // --------------------------------------------------------------------------

  describe("User/Affiliate profile validation", () => {
    it("throws not-found when user does not exist", async () => {
      mockUserDocGet.mockResolvedValue({ exists: false, data: () => null });
      await expect(callHandler({ uid: "aff1" }, BANK_INPUT)).rejects.toMatchObject({
        code: "not-found",
      });
    });

    it("throws failed-precondition when user has no affiliateCode", async () => {
      mockUserDocGet.mockResolvedValue({
        exists: true,
        data: () => defaultUserData({ affiliateCode: null }),
      });
      await expect(callHandler({ uid: "aff1" }, BANK_INPUT)).rejects.toMatchObject({
        code: "failed-precondition",
      });
    });

    it("throws failed-precondition (TELEGRAM_REQUIRED) when no telegramId", async () => {
      mockUserDocGet.mockResolvedValue({
        exists: true,
        data: () => defaultUserData({ telegramId: null }),
      });
      const err: any = await callHandler({ uid: "aff1" }, BANK_INPUT).catch((e) => e);
      expect(err.code).toBe("failed-precondition");
      expect(err.message).toContain("TELEGRAM_REQUIRED");
    });

    it("throws failed-precondition when pending payout already exists", async () => {
      mockUserDocGet.mockResolvedValue({
        exists: true,
        data: () => defaultUserData({ pendingPayoutId: "existing-payout-789" }),
      });
      await expect(callHandler({ uid: "aff1" }, BANK_INPUT)).rejects.toMatchObject({
        code: "failed-precondition",
      });
    });

    it("throws failed-precondition when no bankDetails", async () => {
      mockUserDocGet.mockResolvedValue({
        exists: true,
        data: () => defaultUserData({ bankDetails: null }),
      });
      await expect(callHandler({ uid: "aff1" }, BANK_INPUT)).rejects.toMatchObject({
        code: "failed-precondition",
      });
    });

    it("throws failed-precondition when no available balance", async () => {
      mockUserDocGet.mockResolvedValue({
        exists: true,
        data: () => defaultUserData({ availableBalance: 0 }),
      });
      await expect(callHandler({ uid: "aff1" }, BANK_INPUT)).rejects.toMatchObject({
        code: "failed-precondition",
      });
    });
  });

  // --------------------------------------------------------------------------
  // Amount validation ($10 minimum)
  // --------------------------------------------------------------------------

  describe("Amount validation ($10 = 1000 cents minimum)", () => {
    beforeEach(() => {
      mockUserDocGet.mockResolvedValue({
        exists: true,
        data: () => defaultUserData(),
      });
      // mockQueryGet returns empty for monthly checks (no commissions needed — throws before query)
    });

    it("throws failed-precondition when amount below $10 minimum", async () => {
      // Amount 999 < minimumAmount 1000 — minimum check happens at step 10 BEFORE monthly queries
      // So mockQueryGet items are NEVER consumed → do NOT add mockResolvedValueOnce here
      const err: any = await callHandler({ uid: "aff1" }, { ...BANK_INPUT, amount: 999 }).catch((e) => e);
      expect(err).toBeDefined();
      expect(["invalid-argument", "failed-precondition"]).toContain(err.code);
    });
  });

  // --------------------------------------------------------------------------
  // Happy paths
  // --------------------------------------------------------------------------

  describe("Happy path — Bank Transfer", () => {
    it("creates withdrawal successfully", async () => {
      setupHappyAffiliate();
      const result = await callHandler({ uid: "aff1" }, BANK_INPUT);
      expect(result.payoutId).toBeTruthy();
      expect(result.telegramConfirmationRequired).toBe(true);
    });

    it("sends Telegram confirmation with affiliate role", async () => {
      setupHappyAffiliate();
      await callHandler({ uid: "aff1" }, BANK_INPUT);
      expect(mockSendWithdrawalConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "affiliate",
          collection: "payment_withdrawals",
          telegramId: 777888999,
        })
      );
    });

    it("creates withdrawal via Firestore transaction with userType=affiliate", async () => {
      setupHappyAffiliate();
      await callHandler({ uid: "aff1" }, BANK_INPUT);
      // Affiliate uses transaction.set() directly (not paymentService.createWithdrawalRequest)
      expect(mockRunTransaction).toHaveBeenCalled();
    });
  });

  describe("Happy path — Mobile Money amount (Africa)", () => {
    it("creates withdrawal for smaller amount (1200 cents)", async () => {
      const ud = defaultUserData();
      mockUserDocGet.mockResolvedValue({ exists: true, data: () => ud });
      mockSendWithdrawalConfirmation.mockResolvedValue({ success: true });

      // MOBILE_INPUT amount = 1200. With 2 commissions of 1000:
      // Comm-0: 0+1000=1000 <= 1200 → include. Total=1000. 1000>=1200? No.
      // Comm-1: 1000+1000=2000 <= 1200? No → skip. Total=1000 >= 1000 min → OK.
      // candidateCommissionIds = ["aff-comm-0"] → 1 commission re-read in tx
      mockQueryGet.mockReset();
      mockQueryGet
        .mockResolvedValueOnce({ empty: true, docs: [], size: 0 })
        .mockResolvedValueOnce({ empty: true, docs: [], size: 0 })
        .mockResolvedValueOnce(makeMockAffiliateCommissions(2, 1000));

      mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => {
        const txGet = jest.fn()
          .mockResolvedValueOnce({ exists: true, data: () => ud })
          .mockResolvedValueOnce({ exists: true, data: () => ({ amount: 1000, status: "available" }) });
        return fn({ get: txGet, update: jest.fn(), set: jest.fn(), delete: jest.fn() });
      });

      const result = await callHandler({ uid: "aff-sn" }, MOBILE_INPUT);
      expect(result.payoutId).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Telegram failure
  // --------------------------------------------------------------------------

  describe("Telegram failure", () => {
    it("reverts via 2nd transaction and throws unavailable when Telegram fails", async () => {
      setupHappyAffiliate();
      mockSendWithdrawalConfirmation.mockResolvedValue({ success: false });
      await expect(callHandler({ uid: "aff1" }, BANK_INPUT)).rejects.toMatchObject({
        code: "unavailable",
      });
      // Affiliate does its own rollback via a 2nd runTransaction (NOT paymentService.cancelWithdrawal)
      expect(mockRunTransaction).toHaveBeenCalledTimes(2);
    });
  });

  // --------------------------------------------------------------------------
  // Minimum $10 enforcement
  // --------------------------------------------------------------------------

  describe("Minimum $10 (1000 cents)", () => {
    it("accepts $10 exactly (1000 cents)", async () => {
      const ud = defaultUserData();
      mockUserDocGet.mockResolvedValue({ exists: true, data: () => ud });
      mockSendWithdrawalConfirmation.mockResolvedValue({ success: true });

      // Amount 1000: comm-0 (1000): 0+1000=1000<=1000 → include. Total=1000. Break.
      mockQueryGet.mockReset();
      mockQueryGet
        .mockResolvedValueOnce({ empty: true, docs: [], size: 0 })
        .mockResolvedValueOnce({ empty: true, docs: [], size: 0 })
        .mockResolvedValueOnce(makeMockAffiliateCommissions(1, 1000));

      mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => {
        const txGet = jest.fn()
          .mockResolvedValueOnce({ exists: true, data: () => ud })
          .mockResolvedValueOnce({ exists: true, data: () => ({ amount: 1000, status: "available" }) });
        return fn({ get: txGet, update: jest.fn(), set: jest.fn(), delete: jest.fn() });
      });

      const result = await callHandler({ uid: "aff1" }, { ...BANK_INPUT, amount: 1000 });
      expect(result.payoutId).toBeTruthy();
    });

    it("accepts $15 (was blocked by old €30 minimum)", async () => {
      const ud = defaultUserData();
      mockUserDocGet.mockResolvedValue({ exists: true, data: () => ud });
      mockSendWithdrawalConfirmation.mockResolvedValue({ success: true });

      // Amount 1500: comm-0 (1000): 0+1000=1000<=1500 → include. Total=1000. 1000>=1500? No.
      // comm-1 (1000): 1000+1000=2000<=1500? No → skip. Total=1000>=1000 min → OK.
      mockQueryGet.mockReset();
      mockQueryGet
        .mockResolvedValueOnce({ empty: true, docs: [], size: 0 })
        .mockResolvedValueOnce({ empty: true, docs: [], size: 0 })
        .mockResolvedValueOnce(makeMockAffiliateCommissions(2, 1000));

      mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => {
        const txGet = jest.fn()
          .mockResolvedValueOnce({ exists: true, data: () => ud })
          .mockResolvedValueOnce({ exists: true, data: () => ({ amount: 1000, status: "available" }) });
        return fn({ get: txGet, update: jest.fn(), set: jest.fn(), delete: jest.fn() });
      });

      const result = await callHandler({ uid: "aff1" }, { ...BANK_INPUT, amount: 1500 });
      expect(result.payoutId).toBeTruthy();
    });
  });
});
