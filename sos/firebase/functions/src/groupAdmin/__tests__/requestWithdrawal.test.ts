/**
 * Tests: requestGroupAdminWithdrawal (GroupAdmin)
 *
 * Actual flow:
 * 1. Auth check
 * 2. areWithdrawalsEnabled() from ../groupAdminConfig
 * 3. Input validation (amount, paymentMethod, paymentDetails)
 * 4. Telegram: db.collection("users").doc(uid).get() → telegramId
 * 5. Minimum amount: getMinimumWithdrawalAmount()
 * 6. paymentService.savePaymentMethod + getConfig
 * 7. Atomic transaction:
 *    - transaction.get(db.collection("group_admins").doc(uid)) → groupAdmin data
 *    - Check status → permission-denied if not active
 *    - Check pendingWithdrawalId → failed-precondition if exists
 *    - Query group_admin_commissions for available commissions
 *    - Create withdrawal in payment_withdrawals
 *    - Update groupAdmin doc
 * 8. sendWithdrawalConfirmation (Telegram)
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

// Different doc mocks for different collections
const mockUserDocGet = jest.fn(); // users collection
const mockGroupAdminDocGet = jest.fn(); // group_admins collection (inside transaction)
const mockWithdrawalDocId = "wd-ga-test-123";

const mockQueryGet = jest.fn().mockResolvedValue({ empty: true, docs: [], size: 0 });
const mockWhereChain: jest.Mock = jest.fn(() => ({
  where: mockWhereChain,
  orderBy: jest.fn(() => ({ get: mockQueryGet })),
  limit: jest.fn(() => ({ get: mockQueryGet })),
  get: mockQueryGet,
}));

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn((name: string) => ({
      doc: jest.fn((_id?: string) => {
        if (name === "users") {
          return { id: _id || "user-id", get: mockUserDocGet, update: jest.fn().mockResolvedValue({}) };
        }
        if (name === "group_admins") {
          return { id: _id || "ga-id", get: mockGroupAdminDocGet, update: jest.fn().mockResolvedValue({}) };
        }
        // payment_withdrawals, group_admin_commissions, etc.
        return {
          id: _id || mockWithdrawalDocId,
          get: jest.fn().mockResolvedValue({ exists: false }),
          update: jest.fn().mockResolvedValue({}),
          set: jest.fn().mockResolvedValue({}),
        };
      }),
      where: mockWhereChain,
    })),
    runTransaction: mockRunTransaction,
  })),
  FieldValue: {
    arrayUnion: jest.fn((...a: unknown[]) => a),
    increment: jest.fn((n: number) => ({ _inc: n })),
    serverTimestamp: jest.fn(() => "mock-ts"),
  },
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date(), toMillis: () => Date.now() })),
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
const mockGetMinimumWithdrawalAmount = jest.fn().mockResolvedValue(1000); // $10

jest.mock("../groupAdminConfig", () => ({
  areWithdrawalsEnabled: (...a: any[]) => mockAreWithdrawalsEnabled(...a),
  getMinimumWithdrawalAmount: (...a: any[]) => mockGetMinimumWithdrawalAmount(...a),
}));

const mockSavePaymentMethod = jest.fn().mockResolvedValue({
  id: "pm-ga-1",
  provider: "wise",
  methodType: "bank_transfer",
  details: { type: "bank_transfer", currency: "EUR", accountHolderName: "Test GA", country: "FR" },
});
const mockCreateWithdrawalRequest = jest.fn().mockResolvedValue({ id: "wd-ga-1" });
const mockCancelWithdrawal = jest.fn().mockResolvedValue({});
const mockGetConfig = jest.fn().mockResolvedValue({ paymentMode: "manual", autoPaymentThreshold: 5000, maxRetries: 3 });

jest.mock("../../payment/services/paymentService", () => ({
  getPaymentService: jest.fn(() => ({
    savePaymentMethod: mockSavePaymentMethod,
    createWithdrawalRequest: mockCreateWithdrawalRequest,
    cancelWithdrawal: mockCancelWithdrawal,
    getConfig: mockGetConfig,
  })),
  COLLECTIONS: { WITHDRAWALS: "payment_withdrawals" },
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

function defaultGroupAdminData(overrides: Record<string, any> = {}) {
  return {
    status: "active",
    pendingWithdrawalId: null,
    availableBalance: 5000,
    email: "ga@test.com",
    firstName: "GroupAdmin",
    ...overrides,
  };
}

/**
 * Setup transaction to return groupAdmin data + empty commissions
 */
function setupTransaction(gaData: Record<string, any> = {}) {
  const ga = defaultGroupAdminData(gaData);
  const txGet = jest.fn()
    .mockResolvedValueOnce({ // group_admins doc read
      exists: true,
      data: () => ga,
    })
    .mockResolvedValueOnce({ // commissions query (available)
      empty: true,
      size: 0,
      docs: [],
    });

  const txUpdate = jest.fn();
  const txSet = jest.fn();

  mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => {
    return fn({ get: txGet, update: txUpdate, set: txSet });
  });

  return { txGet, txUpdate, txSet };
}

function makeMockCommissions(count: number, amountEach = 1500) {
  return {
    empty: count === 0,
    size: count,
    docs: Array.from({ length: count }, (_, i) => ({
      id: `comm-${i}`,
      ref: { id: `comm-${i}` },
      data: () => ({
        id: `comm-${i}`,
        groupAdminId: "ga-1",
        amount: amountEach,
        status: "available",
      }),
    })),
  };
}

function setupHappyGroupAdmin(gaData: Record<string, any> = {}) {
  mockUserDocGet.mockResolvedValue({
    exists: true,
    data: () => ({ telegramId: 444555666 }),
  });
  // First mockQueryGet: pending check → empty (no existing pending withdrawal)
  // Second mockQueryGet: commissions query → 2 commissions of $1500 = $3000 total
  mockQueryGet
    .mockResolvedValueOnce({ empty: true, docs: [], size: 0 }) // pending check
    .mockResolvedValueOnce(makeMockCommissions(2, 1500)); // commissions
  setupTransaction(gaData);
}

const WISE_INPUT = {
  paymentMethod: "wise",
  paymentDetails: {
    type: "wise",
    accountHolderName: "Test GroupAdmin",
    country: "FR",
    currency: "EUR",
    iban: "FR7630004000031234567890143",
  },
  amount: 2000,
};

const MOBILE_INPUT = {
  paymentMethod: "mobile_money",
  paymentDetails: {
    type: "mobile_money",
    provider: "mtn_mobile_money",
    phoneNumber: "+22670987654",
    country: "BF",
  },
  amount: 1500,
};

// ============================================================================
// Tests
// ============================================================================

describe("GroupAdmin requestWithdrawal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAreWithdrawalsEnabled.mockResolvedValue(true);
    mockGetMinimumWithdrawalAmount.mockResolvedValue(1000);
    mockSendWithdrawalConfirmation.mockResolvedValue({ success: true });
    mockSavePaymentMethod.mockResolvedValue({
      id: "pm-ga-1",
      provider: "wise",
      methodType: "bank_transfer",
      details: { type: "bank_transfer", currency: "EUR", accountHolderName: "Test GA", country: "FR" },
    });
    mockCreateWithdrawalRequest.mockResolvedValue({ id: "wd-ga-1" });
    mockGetConfig.mockResolvedValue({ paymentMode: "manual", autoPaymentThreshold: 5000, maxRetries: 3 });
    mockQueryGet.mockResolvedValue({ empty: true, docs: [], size: 0 });
  });

  // --------------------------------------------------------------------------
  // Authentication
  // --------------------------------------------------------------------------

  describe("Authentication", () => {
    it("throws unauthenticated when no auth", async () => {
      await expect(callHandler(null, WISE_INPUT)).rejects.toMatchObject({
        code: "unauthenticated",
      });
    });
  });

  // --------------------------------------------------------------------------
  // Withdrawals system check
  // --------------------------------------------------------------------------

  describe("System checks", () => {
    it("throws failed-precondition when withdrawals are disabled", async () => {
      mockAreWithdrawalsEnabled.mockResolvedValue(false);
      await expect(callHandler({ uid: "ga1" }, WISE_INPUT)).rejects.toMatchObject({
        code: "failed-precondition",
      });
    });
  });

  // --------------------------------------------------------------------------
  // Input validation (before Telegram check)
  // --------------------------------------------------------------------------

  describe("Input validation", () => {
    it("throws invalid-argument for zero amount", async () => {
      await expect(
        callHandler({ uid: "ga1" }, { ...WISE_INPUT, amount: 0 })
      ).rejects.toMatchObject({ code: "invalid-argument" });
    });

    it("throws invalid-argument for missing paymentMethod", async () => {
      await expect(
        callHandler({ uid: "ga1" }, { ...WISE_INPUT, paymentMethod: undefined })
      ).rejects.toMatchObject({ code: "invalid-argument" });
    });

    it("throws invalid-argument for missing paymentDetails", async () => {
      await expect(
        callHandler({ uid: "ga1" }, { ...WISE_INPUT, paymentDetails: undefined })
      ).rejects.toMatchObject({ code: "invalid-argument" });
    });
  });

  // --------------------------------------------------------------------------
  // Telegram gate (from users collection)
  // --------------------------------------------------------------------------

  describe("Telegram gate", () => {
    it("throws failed-precondition (TELEGRAM_REQUIRED) when no telegramId", async () => {
      mockUserDocGet.mockResolvedValue({ exists: true, data: () => ({}) }); // No telegramId
      const err: any = await callHandler({ uid: "ga1" }, WISE_INPUT).catch((e) => e);
      expect(err.code).toBe("failed-precondition");
      expect(err.message).toContain("TELEGRAM_REQUIRED");
    });
  });

  // --------------------------------------------------------------------------
  // Amount validation (before transaction)
  // --------------------------------------------------------------------------

  describe("Amount validation (pre-transaction)", () => {
    beforeEach(() => {
      mockUserDocGet.mockResolvedValue({ exists: true, data: () => ({ telegramId: 444555666 }) });
    });

    it("throws invalid-argument when amount below $10 minimum (999 cents)", async () => {
      await expect(
        callHandler({ uid: "ga1" }, { ...WISE_INPUT, amount: 999 })
      ).rejects.toMatchObject({ code: "invalid-argument" });
    });

    it("allows exactly $10 (1000 cents)", async () => {
      mockQueryGet
        .mockResolvedValueOnce({ empty: true, docs: [], size: 0 }) // pending check
        .mockResolvedValueOnce(makeMockCommissions(1, 1000)); // commissions ($10 exactly)
      setupTransaction();
      const result = await callHandler({ uid: "ga1" }, { ...WISE_INPUT, amount: 1000 });
      expect(result.success).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // GroupAdmin profile (inside atomic transaction)
  // --------------------------------------------------------------------------

  describe("GroupAdmin profile (in-transaction checks)", () => {
    beforeEach(() => {
      mockUserDocGet.mockResolvedValue({ exists: true, data: () => ({ telegramId: 444555666 }) });
    });

    it("throws not-found when group_admin profile does not exist", async () => {
      const txGet = jest.fn().mockResolvedValue({ exists: false, data: () => null });
      mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => {
        return fn({ get: txGet, update: jest.fn(), set: jest.fn() });
      });
      await expect(callHandler({ uid: "ga1" }, WISE_INPUT)).rejects.toMatchObject({
        code: "not-found",
      });
    });

    it("throws permission-denied when groupAdmin is suspended", async () => {
      const txGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => defaultGroupAdminData({ status: "suspended" }),
      });
      mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => {
        return fn({ get: txGet, update: jest.fn(), set: jest.fn() });
      });
      await expect(callHandler({ uid: "ga1" }, WISE_INPUT)).rejects.toMatchObject({
        code: "permission-denied",
      });
    });

    it("throws failed-precondition when pending withdrawal already exists", async () => {
      const txGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => defaultGroupAdminData({ pendingWithdrawalId: "existing-wd" }),
      });
      mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => {
        return fn({ get: txGet, update: jest.fn(), set: jest.fn() });
      });
      await expect(callHandler({ uid: "ga1" }, WISE_INPUT)).rejects.toMatchObject({
        code: "failed-precondition",
      });
    });
  });

  // --------------------------------------------------------------------------
  // Atomic transaction behavior
  // --------------------------------------------------------------------------

  describe("Atomic transaction", () => {
    it("uses a Firestore transaction for atomic balance deduction", async () => {
      setupHappyGroupAdmin();
      await callHandler({ uid: "ga1" }, WISE_INPUT);
      expect(mockRunTransaction).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Happy paths
  // --------------------------------------------------------------------------

  describe("Happy path — Wise/Bank Transfer", () => {
    it("creates withdrawal successfully", async () => {
      setupHappyGroupAdmin();
      const result = await callHandler({ uid: "ga1" }, WISE_INPUT);
      expect(result.success).toBe(true);
      expect(result.withdrawalId).toBeTruthy();
    });

    it("saves payment method with userType=group_admin", async () => {
      setupHappyGroupAdmin();
      await callHandler({ uid: "ga1" }, WISE_INPUT);
      expect(mockSavePaymentMethod).toHaveBeenCalledWith(
        expect.objectContaining({ userType: "group_admin" })
      );
    });

    it("sends Telegram confirmation with groupAdmin role", async () => {
      setupHappyGroupAdmin();
      await callHandler({ uid: "ga1" }, WISE_INPUT);
      expect(mockSendWithdrawalConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "groupAdmin",
          collection: "payment_withdrawals",
          telegramId: 444555666,
        })
      );
    });
  });

  describe("Happy path — Mobile Money (Africa)", () => {
    it("creates mobile money withdrawal for African group admin", async () => {
      setupHappyGroupAdmin();
      const result = await callHandler({ uid: "ga-africa" }, MOBILE_INPUT);
      expect(result.success).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Telegram failure
  // --------------------------------------------------------------------------

  describe("Telegram failure", () => {
    it("rolls back via second transaction and throws unavailable when Telegram fails", async () => {
      setupHappyGroupAdmin();
      mockSendWithdrawalConfirmation.mockResolvedValue({ success: false });
      await expect(callHandler({ uid: "ga1" }, WISE_INPUT)).rejects.toMatchObject({
        code: "unavailable",
      });
      // GroupAdmin does its own rollback via a second runTransaction (not paymentService.cancelWithdrawal)
      expect(mockRunTransaction).toHaveBeenCalledTimes(2);
    });
  });

  // --------------------------------------------------------------------------
  // Minimum $10 (1000 cents)
  // --------------------------------------------------------------------------

  describe("Minimum $10 enforcement", () => {
    it("rejects $9.99 (999 cents)", async () => {
      mockUserDocGet.mockResolvedValue({ exists: true, data: () => ({ telegramId: 444 }) });
      await expect(
        callHandler({ uid: "ga1" }, { ...WISE_INPUT, amount: 999 })
      ).rejects.toMatchObject({ code: "invalid-argument" });
    });

    it("accepts $10 (1000 cents)", async () => {
      mockUserDocGet.mockResolvedValue({ exists: true, data: () => ({ telegramId: 444555666 }) });
      mockQueryGet
        .mockResolvedValueOnce({ empty: true, docs: [], size: 0 })
        .mockResolvedValueOnce(makeMockCommissions(1, 1000));
      setupTransaction();
      const result = await callHandler({ uid: "ga1" }, { ...WISE_INPUT, amount: 1000 });
      expect(result.success).toBe(true);
    });

    it("accepts $15 (was blocked by old $25 minimum)", async () => {
      mockUserDocGet.mockResolvedValue({ exists: true, data: () => ({ telegramId: 444555666 }) });
      mockQueryGet
        .mockResolvedValueOnce({ empty: true, docs: [], size: 0 })
        .mockResolvedValueOnce(makeMockCommissions(1, 2000));
      setupTransaction();
      const result = await callHandler({ uid: "ga1" }, { ...WISE_INPUT, amount: 1500 });
      expect(result.success).toBe(true);
    });
  });
});
