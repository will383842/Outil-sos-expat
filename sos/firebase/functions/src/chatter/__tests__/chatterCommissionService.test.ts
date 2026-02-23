/**
 * Tests: ChatterCommissionService
 *
 * Critical test: CORRECTION 1 — No bonus multipliers.
 * finalAmount === baseAmount (no levelBonus, top3Bonus, streakBonus, etc.)
 *
 * Commission amounts:
 *  - client_call / client_referral: $10 (1000 cents)
 *  - recruitment / provider_call: $5 (500 cents)
 */

// ============================================================================
// Firestore Mocks
// ============================================================================

const mockRunTransaction = jest.fn();
// mockChatterDocGet: used for db.collection("chatters").doc(x).get() outside transaction
const mockChatterDocGet = jest.fn();
// mockChatterDocUpdate: used for balance update outside transaction
const mockChatterDocUpdate = jest.fn().mockResolvedValue({});

// Commission doc ref (new doc created)
const mockCommissionSet = jest.fn().mockResolvedValue({});

const mockWhereLimit = jest.fn(() => ({ get: jest.fn().mockResolvedValue({ empty: true, docs: [] }) }));
const mockWhereChain: jest.Mock = jest.fn(() => ({
  where: mockWhereChain,
  limit: mockWhereLimit,
  get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
}));

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn((name: string) => ({
      doc: jest.fn((id?: string) => {
        if (name === "chatter_commissions") {
          return {
            id: id || "new-commission-id",
            set: mockCommissionSet,
            update: jest.fn().mockResolvedValue({}),
            get: jest.fn(),
          };
        }
        // "chatters" collection
        return {
          id: id || "chatter-test-id",
          get: mockChatterDocGet,
          update: mockChatterDocUpdate,
        };
      }),
      where: mockWhereChain,
    })),
    runTransaction: mockRunTransaction,
  })),
  FieldValue: {
    increment: jest.fn((n: number) => ({ _increment: n })),
    arrayUnion: jest.fn((...a: unknown[]) => ({ _arrayUnion: a })),
    serverTimestamp: jest.fn(() => "mock-server-ts"),
  },
  Timestamp: {
    now: jest.fn(() => ({
      toMillis: () => Date.now(),
      toDate: () => new Date(),
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: 0,
    })),
    fromMillis: jest.fn((ms: number) => ({ toMillis: () => ms, toDate: () => new Date(ms) })),
  },
}));

jest.mock("firebase-functions/v2", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// ============================================================================
// Utils / Config mocks
// ============================================================================

const mockGetChatterConfigCached = jest.fn().mockResolvedValue({
  isSystemActive: true, // Required by the service
  commissionClientCallAmount: 1000, // $10
  commissionClientAmount: 1000, // $10 (legacy)
  commissionRecruitmentAmount: 500, // $5
  commissionProviderRecruitmentAmount: 500,
  validationDelayDays: 7,
  releaseDelayDays: 3,
  commissionN1CallAmount: 100,
  commissionN2CallAmount: 50,
  commissionActivationBonusAmount: 500,
});

jest.mock("../utils/chatterConfigService", () => ({
  getChatterConfigCached: (...a: any[]) => mockGetChatterConfigCached(...a),
  getValidationDelayMs: jest.fn().mockReturnValue(7 * 24 * 3600 * 1000),
  getReleaseDelayMs: jest.fn().mockReturnValue(3 * 24 * 3600 * 1000),
  calculateLevelFromEarnings: jest.fn().mockReturnValue(1),
}));

const mockCheckCommissionFraud = jest.fn().mockResolvedValue({ shouldBlock: false, flags: [], severity: "low" });
const mockCheckAutoSuspension = jest.fn().mockResolvedValue({ shouldSuspend: false });

jest.mock("../utils/chatterFraudDetection", () => ({
  checkCommissionFraud: (...a: any[]) => mockCheckCommissionFraud(...a),
  checkAutoSuspension: (...a: any[]) => mockCheckAutoSuspension(...a),
}));

// ============================================================================
// Import service
// ============================================================================

import { createCommission, CreateCommissionInput } from "../services/chatterCommissionService";

// ============================================================================
// Test helpers
// ============================================================================

interface CommissionDoc {
  amount: number;
  baseAmount: number;
  levelBonus: number;
  top3Bonus: number;
  zoomBonus: number;
  streakBonus: number;
  monthlyTopMultiplier: number;
  calculationDetails: string;
  status: string;
  chatterId: string;
  type: string;
}

let capturedCommissionDoc: CommissionDoc | null = null;

/**
 * Sets up all mocks for a successful commission creation:
 * - Chatter doc get (outside transaction)
 * - Transaction: chatter re-read + duplicate check (empty) + commission set
 */
function setupForCommission(chatterData: Record<string, any> = {}) {
  const data = {
    status: "active",
    email: "chatter@test.com",
    affiliateCodeClient: "CODE-123",
    totalEarnings: 0,
    pendingBalance: 0,
    availableBalance: 0,
    totalCommissions: 0,
    totalClients: 0,
    totalRecruits: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastActivityDate: null,
    commissionsByType: {
      client_referral: { count: 0, amount: 0 },
      recruitment: { count: 0, amount: 0 },
      bonus: { count: 0, amount: 0 },
    },
    ...chatterData,
  };

  // Outside-transaction chatter get
  mockChatterDocGet.mockResolvedValue({ exists: true, data: () => data });

  // Inside-transaction: get(chatterRef) then get(duplicateCheckQuery)
  const txGet = jest.fn()
    .mockResolvedValueOnce({ exists: true, data: () => data }) // freshChatter re-read
    .mockResolvedValueOnce({ empty: true, docs: [] }); // duplicate check → no duplicate

  const txUpdate = jest.fn();
  const txSet = jest.fn((ref: any, doc: any) => {
    capturedCommissionDoc = doc as CommissionDoc;
  });

  mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<void>) => {
    await fn({ get: txGet, update: txUpdate, set: txSet });
  });

  return { txGet, txUpdate, txSet };
}

function baseInput(overrides: Partial<CreateCommissionInput> = {}): CreateCommissionInput {
  return {
    chatterId: "chatter-abc",
    type: "client_call",
    source: { id: "session-111", type: "call_session" },
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("ChatterCommissionService — createCommission", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedCommissionDoc = null;
    mockCheckCommissionFraud.mockResolvedValue({ shouldBlock: false, flags: [], severity: "low" });
    mockCheckAutoSuspension.mockResolvedValue({ shouldSuspend: false });
    mockGetChatterConfigCached.mockResolvedValue({
      isSystemActive: true,
      commissionClientCallAmount: 1000,
      commissionClientAmount: 1000,
      commissionRecruitmentAmount: 500,
      commissionProviderRecruitmentAmount: 500,
      commissionN1CallAmount: 100,
      commissionN2CallAmount: 50,
      commissionActivationBonusAmount: 500,
      validationDelayDays: 7,
      releaseDelayDays: 3,
    });
    // Reset where chain to always return empty (no duplicates)
    mockWhereLimit.mockReturnValue({
      get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
    });
    mockWhereChain.mockReturnValue({
      where: mockWhereChain,
      limit: mockWhereLimit,
      get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
    });
  });

  // --------------------------------------------------------------------------
  // Early return cases
  // --------------------------------------------------------------------------

  describe("Early return — chatter not found", () => {
    it("returns success: false when chatter does not exist", async () => {
      mockChatterDocGet.mockResolvedValue({ exists: false });
      const result = await createCommission(baseInput());
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("returns success: false when chatter is suspended", async () => {
      mockChatterDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ status: "suspended" }),
      });
      const result = await createCommission(baseInput());
      expect(result.success).toBe(false);
    });

    it("returns success: false when system is inactive", async () => {
      mockChatterDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ status: "active" }),
      });
      mockGetChatterConfigCached.mockResolvedValue({ isSystemActive: false });
      const result = await createCommission(baseInput());
      expect(result.success).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // CORRECTION 1 — No bonus multipliers (CRITICAL)
  // --------------------------------------------------------------------------

  describe("CORRECTION 1: No bonus multipliers (finalAmount === baseAmount)", () => {
    it("client_call: finalAmount equals baseAmount of $10 (1000 cents)", async () => {
      setupForCommission();

      const result = await createCommission(baseInput({ type: "client_call" }));

      expect(result.success).toBe(true);
      expect(capturedCommissionDoc).not.toBeNull();
      expect(capturedCommissionDoc!.amount).toBe(1000);
      expect(capturedCommissionDoc!.baseAmount).toBe(1000);
      expect(capturedCommissionDoc!.amount).toBe(capturedCommissionDoc!.baseAmount);
    });

    it("levelBonus is always 0 regardless of chatter level/totalEarnings", async () => {
      setupForCommission({ totalEarnings: 500000 }); // Very high earnings → high level

      await createCommission(baseInput({ type: "client_call" }));

      expect(capturedCommissionDoc!.levelBonus).toBe(0);
    });

    it("top3Bonus is always 0", async () => {
      setupForCommission();

      await createCommission(baseInput({ type: "client_call" }));

      expect(capturedCommissionDoc!.top3Bonus).toBe(0);
    });

    it("zoomBonus is always 0", async () => {
      setupForCommission();

      await createCommission(baseInput({ type: "client_call" }));

      expect(capturedCommissionDoc!.zoomBonus).toBe(0);
    });

    it("streakBonus is always 1.0 (neutral, no multiplication effect)", async () => {
      setupForCommission();

      await createCommission(baseInput({ type: "client_call" }));

      expect(capturedCommissionDoc!.streakBonus).toBe(1.0);
    });

    it("monthlyTopMultiplier is always 1.0 (neutral, no multiplication effect)", async () => {
      setupForCommission();

      await createCommission(baseInput({ type: "client_call" }));

      expect(capturedCommissionDoc!.monthlyTopMultiplier).toBe(1.0);
    });

    it("calculationDetails shows only 'Base:' — no bonus/multiplier/streak/level mention", async () => {
      setupForCommission();

      await createCommission(baseInput({ type: "client_call" }));

      const details = capturedCommissionDoc!.calculationDetails;
      expect(details).toMatch(/Base:/i);
      expect(details.toLowerCase()).not.toMatch(/bonus/);
      expect(details.toLowerCase()).not.toMatch(/multiplier/);
      expect(details.toLowerCase()).not.toMatch(/streak/);
      expect(details.toLowerCase()).not.toMatch(/level/);
      expect(details.toLowerCase()).not.toMatch(/top3/);
      expect(details.toLowerCase()).not.toMatch(/zoom/);
    });

    it("recruitment: finalAmount equals $5 (500 cents), no bonus applied", async () => {
      setupForCommission();

      const result = await createCommission(baseInput({ type: "recruitment" }));

      expect(result.success).toBe(true);
      expect(capturedCommissionDoc!.amount).toBe(500);
      expect(capturedCommissionDoc!.amount).toBe(capturedCommissionDoc!.baseAmount);
      expect(capturedCommissionDoc!.levelBonus).toBe(0);
    });

    it("even with baseAmount override, finalAmount equals baseAmount (no multiplier)", async () => {
      setupForCommission();

      await createCommission(baseInput({ baseAmount: 2500 })); // Custom $25

      expect(capturedCommissionDoc!.amount).toBe(2500);
      expect(capturedCommissionDoc!.baseAmount).toBe(2500);
      // streakBonus(1.0) * monthlyTop(1.0) * amount = amount → no change
    });
  });

  // --------------------------------------------------------------------------
  // Commission document structure
  // --------------------------------------------------------------------------

  describe("Commission document structure", () => {
    it("sets status to 'pending' on creation", async () => {
      setupForCommission();

      await createCommission(baseInput());

      expect(capturedCommissionDoc!.status).toBe("pending");
    });

    it("stores chatterId correctly", async () => {
      setupForCommission();

      await createCommission(baseInput({ chatterId: "chatter-xyz-789" }));

      expect(capturedCommissionDoc!.chatterId).toBe("chatter-xyz-789");
    });

    it("stores commission type correctly", async () => {
      setupForCommission();

      await createCommission(baseInput({ type: "client_referral" }));

      expect(capturedCommissionDoc!.type).toBe("client_referral");
    });
  });

  // --------------------------------------------------------------------------
  // Commission amounts by type
  // --------------------------------------------------------------------------

  describe("Commission amounts by type", () => {
    const types: Array<{ type: string; expectedAmount: number; label: string }> = [
      { type: "client_call", expectedAmount: 1000, label: "$10 for client call" },
      { type: "client_referral", expectedAmount: 1000, label: "$10 for client referral (legacy)" },
      { type: "recruitment", expectedAmount: 500, label: "$5 for recruitment (legacy)" },
    ];

    types.forEach(({ type, expectedAmount, label }) => {
      it(`${type}: ${label}`, async () => {
        setupForCommission();

        const result = await createCommission(baseInput({ type: type as any }));

        expect(result.success).toBe(true);
        expect(capturedCommissionDoc).not.toBeNull();
        expect(capturedCommissionDoc!.baseAmount).toBe(expectedAmount);
        expect(capturedCommissionDoc!.amount).toBe(expectedAmount);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Fraud check (client_referral only)
  // --------------------------------------------------------------------------

  describe("Fraud detection (client_referral + clientId)", () => {
    it("blocks commission when fraud detected", async () => {
      mockChatterDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ status: "active", email: "c@test.com" }),
      });
      mockCheckCommissionFraud.mockResolvedValue({
        shouldBlock: true,
        flags: ["duplicate_ip"],
        severity: "high",
      });

      const result = await createCommission(baseInput({
        type: "client_referral",
        source: { id: "s-1", type: "user", details: { clientId: "client-123", clientEmail: "c@e.com" } },
      }));

      expect(result.success).toBe(false);
      expect(result.reason).toBeTruthy();
    });

    it("does NOT call fraud check for client_call type", async () => {
      setupForCommission();

      await createCommission(baseInput({ type: "client_call" }));

      expect(mockCheckCommissionFraud).not.toHaveBeenCalled();
    });

    it("skips fraud check when skipFraudCheck is true", async () => {
      setupForCommission();

      await createCommission(baseInput({
        type: "client_referral",
        skipFraudCheck: true,
        source: { id: "s-1", type: "user", details: { clientId: "client-123" } },
      }));

      expect(mockCheckCommissionFraud).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Pre-transaction duplicate check (fast path)
  // --------------------------------------------------------------------------

  describe("Duplicate commission prevention (pre-transaction check)", () => {
    it("returns success: false when duplicate detected in fast-path check", async () => {
      mockChatterDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ status: "active", email: "c@test.com" }),
      });
      // Make the duplicate check query return a result
      mockWhereLimit.mockReturnValue({
        get: jest.fn().mockResolvedValue({ empty: false, docs: [{ id: "existing" }] }),
      });

      const result = await createCommission(baseInput({ source: { id: "dup-session", type: "call_session" } }));

      expect(result.success).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // In-transaction duplicate check (race condition safety)
  // --------------------------------------------------------------------------

  describe("In-transaction duplicate check (TOCTOU prevention)", () => {
    it("throws when duplicate found inside transaction (race condition)", async () => {
      mockChatterDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ status: "active", email: "c@test.com", affiliateCodeClient: "CODE" }),
      });

      // Transaction: first get = chatter, second get = duplicate found!
      const txGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, data: () => ({ status: "active", affiliateCodeClient: "CODE" }) })
        .mockResolvedValueOnce({ empty: false, docs: [{ id: "race-duplicate" }] }); // Race condition!

      mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<void>) => {
        await fn({ get: txGet, update: jest.fn(), set: jest.fn() });
      });

      const result = await createCommission(baseInput());

      expect(result.success).toBe(false);
    });
  });
});
