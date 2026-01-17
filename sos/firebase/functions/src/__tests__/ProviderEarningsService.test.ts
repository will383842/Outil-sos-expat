/**
 * ProviderEarningsService Tests
 *
 * P1-5: Tests unitaires pour le service de gestion des revenus providers
 *
 * Ce fichier teste:
 * - Le calcul du résumé des earnings (totalEarnings, availableBalance, etc.)
 * - L'historique des transactions
 * - Les statistiques mensuelles
 * - L'historique des payouts
 * - Les cas limites et erreurs
 */

import { ProviderEarningsService } from "../ProviderEarningsService";

// Mock Firebase Admin
const mockGet = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockLimit = jest.fn();
const mockStartAfter = jest.fn();
const mockDoc = jest.fn();

const mockCollection = jest.fn(() => ({
  where: mockWhere,
  doc: mockDoc,
  orderBy: mockOrderBy,
  limit: mockLimit,
}));

mockWhere.mockReturnThis();
mockOrderBy.mockReturnThis();
mockLimit.mockReturnThis();
mockStartAfter.mockReturnThis();
mockDoc.mockReturnValue({ get: mockGet });

// Create a mock that returns the proper chain
const createQueryChain = () => ({
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  startAfter: jest.fn().mockReturnThis(),
  get: mockGet,
});

const mockDb = {
  collection: jest.fn((name: string) => createQueryChain()),
};

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockReset();
  mockDb.collection.mockImplementation(() => createQueryChain());
});

describe("ProviderEarningsService", () => {
  const providerId = "provider-123";

  describe("getEarningsSummary", () => {
    it("should calculate correct earnings summary with no data", async () => {
      // Mock empty results for all queries
      mockGet.mockResolvedValue({ docs: [] });

      const service = new ProviderEarningsService(mockDb as any);
      const summary = await service.getEarningsSummary(providerId);

      expect(summary).toEqual(
        expect.objectContaining({
          totalEarnings: 0,
          pendingEarnings: 0,
          availableBalance: 0,
          totalPayouts: 0,
          reservedAmount: 0,
          totalCalls: 0,
          successfulCalls: 0,
          averageEarningPerCall: 0,
          currency: "EUR",
        })
      );
    });

    it("should calculate correct total earnings from captured payments", async () => {
      // Mock call_sessions with captured payments
      const mockSessions = [
        { payment: { status: "captured", providerAmount: 45 } },
        { payment: { status: "captured", providerAmount: 35 } },
        { payment: { status: "captured", providerAmount: 50 } },
      ];

      mockGet
        // First call: captured sessions
        .mockResolvedValueOnce({
          docs: mockSessions.map((session, i) => ({
            id: `session-${i}`,
            data: () => session,
          })),
        })
        // Second call: adjustments (empty)
        .mockResolvedValueOnce({ docs: [] })
        // Third call: pending sessions (empty)
        .mockResolvedValueOnce({ docs: [] })
        // Fourth call: transfers (empty)
        .mockResolvedValueOnce({ docs: [] })
        // Fifth call: paypal payouts (empty)
        .mockResolvedValueOnce({ docs: [] })
        // Sixth call: reserved amounts (empty)
        .mockResolvedValueOnce({ docs: [] });

      const service = new ProviderEarningsService(mockDb as any);
      const summary = await service.getEarningsSummary(providerId);

      expect(summary.totalEarnings).toBe(130); // 45 + 35 + 50
      expect(summary.successfulCalls).toBe(3);
      expect(summary.totalCalls).toBe(3);
      expect(summary.averageEarningPerCall).toBeCloseTo(43.33, 1);
    });

    it("should calculate correct available balance after payouts", async () => {
      // Mock: 100 EUR earned, 40 EUR already paid out
      const mockSessions = [
        { payment: { status: "captured", providerAmount: 100 } },
      ];

      const mockTransfers = [
        { status: "succeeded", amountEuros: 40 },
      ];

      mockGet
        .mockResolvedValueOnce({
          docs: mockSessions.map((session, i) => ({
            id: `session-${i}`,
            data: () => session,
          })),
        })
        .mockResolvedValueOnce({ docs: [] }) // adjustments
        .mockResolvedValueOnce({ docs: [] }) // pending
        .mockResolvedValueOnce({
          docs: mockTransfers.map((t, i) => ({
            id: `transfer-${i}`,
            data: () => t,
          })),
        })
        .mockResolvedValueOnce({ docs: [] }) // paypal payouts
        .mockResolvedValueOnce({ docs: [] }); // reserved

      const service = new ProviderEarningsService(mockDb as any);
      const summary = await service.getEarningsSummary(providerId);

      expect(summary.totalEarnings).toBe(100);
      expect(summary.totalPayouts).toBe(40);
      expect(summary.availableBalance).toBe(60); // 100 - 40
    });

    it("should handle reserved amounts (disputes)", async () => {
      // Mock: 100 EUR earned, 20 EUR reserved for dispute
      const mockSessions = [
        { payment: { status: "captured", providerAmount: 100 } },
      ];

      const mockReserved = [
        { type: "dispute_reserve", status: "active", amount: -20 },
      ];

      mockGet
        .mockResolvedValueOnce({
          docs: mockSessions.map((session, i) => ({
            id: `session-${i}`,
            data: () => session,
          })),
        })
        .mockResolvedValueOnce({ docs: [] }) // adjustments
        .mockResolvedValueOnce({ docs: [] }) // pending
        .mockResolvedValueOnce({ docs: [] }) // transfers
        .mockResolvedValueOnce({ docs: [] }) // paypal payouts
        .mockResolvedValueOnce({
          docs: mockReserved.map((r, i) => ({
            id: `reserve-${i}`,
            data: () => r,
          })),
        });

      const service = new ProviderEarningsService(mockDb as any);
      const summary = await service.getEarningsSummary(providerId);

      expect(summary.totalEarnings).toBe(100);
      expect(summary.reservedAmount).toBe(20);
      expect(summary.availableBalance).toBe(80); // 100 - 0 payouts + 0 adjustments - 20 reserved
    });

    it("should include PayPal payouts in total payouts", async () => {
      const mockSessions = [
        { payment: { status: "captured", providerAmount: 200 } },
      ];

      const mockStripeTransfers = [
        { status: "succeeded", amountEuros: 50 },
      ];

      const mockPayPalPayouts = [
        { status: "SUCCESS", amount: 30 },
      ];

      mockGet
        .mockResolvedValueOnce({
          docs: mockSessions.map((s, i) => ({ id: `s-${i}`, data: () => s })),
        })
        .mockResolvedValueOnce({ docs: [] }) // adjustments
        .mockResolvedValueOnce({ docs: [] }) // pending
        .mockResolvedValueOnce({
          docs: mockStripeTransfers.map((t, i) => ({ id: `t-${i}`, data: () => t })),
        })
        .mockResolvedValueOnce({
          docs: mockPayPalPayouts.map((p, i) => ({ id: `p-${i}`, data: () => p })),
        })
        .mockResolvedValueOnce({ docs: [] }); // reserved

      const service = new ProviderEarningsService(mockDb as any);
      const summary = await service.getEarningsSummary(providerId);

      expect(summary.totalPayouts).toBe(80); // 50 + 30
      expect(summary.availableBalance).toBe(120); // 200 - 80
    });

    it("should not return negative available balance", async () => {
      // Edge case: more paid out than earned (shouldn't happen but defensive)
      const mockSessions = [
        { payment: { status: "captured", providerAmount: 50 } },
      ];

      const mockTransfers = [
        { status: "succeeded", amountEuros: 100 }, // More than earned
      ];

      mockGet
        .mockResolvedValueOnce({
          docs: mockSessions.map((s, i) => ({ id: `s-${i}`, data: () => s })),
        })
        .mockResolvedValueOnce({ docs: [] })
        .mockResolvedValueOnce({ docs: [] })
        .mockResolvedValueOnce({
          docs: mockTransfers.map((t, i) => ({ id: `t-${i}`, data: () => t })),
        })
        .mockResolvedValueOnce({ docs: [] })
        .mockResolvedValueOnce({ docs: [] });

      const service = new ProviderEarningsService(mockDb as any);
      const summary = await service.getEarningsSummary(providerId);

      expect(summary.availableBalance).toBe(0); // Should be 0, not -50
    });

    it("should format currency correctly", async () => {
      const mockSessions = [
        { payment: { status: "captured", providerAmount: 1234.56 } },
      ];

      mockGet
        .mockResolvedValueOnce({
          docs: mockSessions.map((s, i) => ({ id: `s-${i}`, data: () => s })),
        })
        .mockResolvedValueOnce({ docs: [] })
        .mockResolvedValueOnce({ docs: [] })
        .mockResolvedValueOnce({ docs: [] })
        .mockResolvedValueOnce({ docs: [] })
        .mockResolvedValueOnce({ docs: [] });

      const service = new ProviderEarningsService(mockDb as any);
      const summary = await service.getEarningsSummary(providerId);

      // French number format with EUR symbol
      expect(summary.totalEarningsFormatted).toMatch(/1[\s\u202f]?234,56\s?€/);
    });
  });

  describe("getTransactionHistory", () => {
    it("should return empty array for provider with no transactions", async () => {
      mockGet.mockResolvedValue({ docs: [] });

      const service = new ProviderEarningsService(mockDb as any);
      const result = await service.getTransactionHistory(providerId);

      expect(result.transactions).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    it("should include refunds as negative amounts", async () => {
      const mockSessions = [
        {
          payment: { status: "refunded", providerAmount: 45 },
          completedAt: { toDate: () => new Date() },
          clientName: "Client Test",
        },
      ];

      mockGet
        .mockResolvedValueOnce({
          docs: mockSessions.map((s, i) => ({
            id: `session-${i}`,
            data: () => s,
          })),
        })
        .mockResolvedValueOnce({ docs: [] }); // adjustments

      const service = new ProviderEarningsService(mockDb as any);
      const result = await service.getTransactionHistory(providerId);

      expect(result.transactions[0].type).toBe("refund");
      expect(result.transactions[0].amount).toBe(-45);
    });

    it("should respect limit parameter", async () => {
      const mockSessions = Array(30)
        .fill(null)
        .map((_, i) => ({
          payment: { status: "captured", providerAmount: 10 + i },
          completedAt: { toDate: () => new Date() },
        }));

      mockGet
        .mockResolvedValueOnce({
          docs: mockSessions.map((s, i) => ({
            id: `session-${i}`,
            data: () => s,
          })),
        })
        .mockResolvedValueOnce({ docs: [] });

      const service = new ProviderEarningsService(mockDb as any);
      const result = await service.getTransactionHistory(providerId, { limit: 10 });

      expect(result.transactions.length).toBe(10);
      expect(result.hasMore).toBe(true);
    });

    it("should include adjustments in transaction history", async () => {
      const mockAdjustments = [
        {
          type: "dispute_lost",
          amount: -25,
          description: "Dispute perdue",
          createdAt: { toDate: () => new Date() },
          currency: "EUR",
        },
      ];

      mockGet
        .mockResolvedValueOnce({ docs: [] }) // sessions
        .mockResolvedValueOnce({
          docs: mockAdjustments.map((a, i) => ({
            id: `adj-${i}`,
            data: () => a,
          })),
        });

      const service = new ProviderEarningsService(mockDb as any);
      const result = await service.getTransactionHistory(providerId);

      expect(result.transactions[0].type).toBe("adjustment");
      expect(result.transactions[0].amount).toBe(-25);
      expect(result.transactions[0].description).toBe("Dispute perdue");
    });
  });

  describe("getMonthlyStats", () => {
    it("should return stats for requested number of months", async () => {
      mockGet.mockResolvedValue({ docs: [] });

      const service = new ProviderEarningsService(mockDb as any);
      const stats = await service.getMonthlyStats(providerId, 6);

      expect(stats.length).toBe(6);
      expect(stats[0].totalEarnings).toBe(0);
      expect(stats[0].totalCalls).toBe(0);
    });

    it("should group earnings by month correctly", async () => {
      const now = new Date();
      const lastMonth = new Date(now);
      lastMonth.setMonth(now.getMonth() - 1);

      const mockSessions = [
        {
          payment: { status: "captured", providerAmount: 100 },
          completedAt: { toDate: () => now },
        },
        {
          payment: { status: "captured", providerAmount: 50 },
          completedAt: { toDate: () => now },
        },
        {
          payment: { status: "captured", providerAmount: 75 },
          completedAt: { toDate: () => lastMonth },
        },
      ];

      mockGet.mockResolvedValueOnce({
        docs: mockSessions.map((s, i) => ({
          id: `session-${i}`,
          data: () => s,
        })),
      });

      const service = new ProviderEarningsService(mockDb as any);
      const stats = await service.getMonthlyStats(providerId, 3);

      // Find current month stats (last in array since reversed)
      const currentMonthStats = stats[stats.length - 1];
      const lastMonthStats = stats[stats.length - 2];

      expect(currentMonthStats.totalEarnings).toBe(150); // 100 + 50
      expect(currentMonthStats.totalCalls).toBe(2);
      expect(lastMonthStats.totalEarnings).toBe(75);
      expect(lastMonthStats.totalCalls).toBe(1);
    });

    it("should calculate correct average per call", async () => {
      const now = new Date();
      const mockSessions = [
        {
          payment: { status: "captured", providerAmount: 100 },
          completedAt: { toDate: () => now },
        },
        {
          payment: { status: "captured", providerAmount: 50 },
          completedAt: { toDate: () => now },
        },
      ];

      mockGet.mockResolvedValueOnce({
        docs: mockSessions.map((s, i) => ({
          id: `session-${i}`,
          data: () => s,
        })),
      });

      const service = new ProviderEarningsService(mockDb as any);
      const stats = await service.getMonthlyStats(providerId, 1);

      const currentMonthStats = stats[0];
      expect(currentMonthStats.averagePerCall).toBe(75); // (100 + 50) / 2
    });
  });

  describe("getPayoutHistory", () => {
    it("should return empty array when no payouts", async () => {
      mockGet.mockResolvedValue({ docs: [] });

      const service = new ProviderEarningsService(mockDb as any);
      const payouts = await service.getPayoutHistory(providerId);

      expect(payouts).toEqual([]);
    });

    it("should format payout amounts correctly", async () => {
      const mockTransfers = [
        {
          status: "succeeded",
          amountEuros: 150.50,
          currency: "EUR",
          stripePayoutId: "po_123",
          createdAt: { toDate: () => new Date() },
        },
      ];

      mockGet.mockResolvedValueOnce({
        docs: mockTransfers.map((t, i) => ({
          id: `transfer-${i}`,
          data: () => t,
        })),
      });

      const service = new ProviderEarningsService(mockDb as any);
      const payouts = await service.getPayoutHistory(providerId);

      expect(payouts[0].amount).toBe(150.50);
      expect(payouts[0].stripePayoutId).toBe("po_123");
      expect(payouts[0].amountFormatted).toMatch(/150,50\s?€/);
    });

    it("should handle amount in cents when amountEuros is missing", async () => {
      const mockTransfers = [
        {
          status: "succeeded",
          amount: 10000, // 100 EUR in cents
          currency: "EUR",
          createdAt: { toDate: () => new Date() },
        },
      ];

      mockGet.mockResolvedValueOnce({
        docs: mockTransfers.map((t, i) => ({
          id: `transfer-${i}`,
          data: () => t,
        })),
      });

      const service = new ProviderEarningsService(mockDb as any);
      const payouts = await service.getPayoutHistory(providerId);

      expect(payouts[0].amount).toBe(100); // Converted from cents
    });

    it("should respect limit parameter", async () => {
      const mockTransfers = Array(20)
        .fill(null)
        .map((_, i) => ({
          status: "succeeded",
          amountEuros: 50 + i,
          currency: "EUR",
          createdAt: { toDate: () => new Date() },
        }));

      mockGet.mockResolvedValueOnce({
        docs: mockTransfers.slice(0, 5).map((t, i) => ({
          id: `transfer-${i}`,
          data: () => t,
        })),
      });

      const service = new ProviderEarningsService(mockDb as any);
      const payouts = await service.getPayoutHistory(providerId, 5);

      expect(payouts.length).toBe(5);
    });
  });

  describe("Error handling", () => {
    it("should throw error when Firestore query fails", async () => {
      mockGet.mockRejectedValueOnce(new Error("Firestore unavailable"));

      const service = new ProviderEarningsService(mockDb as any);

      await expect(service.getEarningsSummary(providerId)).rejects.toThrow(
        "Firestore unavailable"
      );
    });

    it("should handle missing payment data gracefully", async () => {
      const mockSessions = [
        { payment: null }, // Missing payment
        { payment: { status: "captured" } }, // Missing providerAmount
        { payment: { status: "captured", providerAmount: 50 } }, // Valid
      ];

      mockGet
        .mockResolvedValueOnce({
          docs: mockSessions.map((s, i) => ({
            id: `session-${i}`,
            data: () => s,
          })),
        })
        .mockResolvedValueOnce({ docs: [] })
        .mockResolvedValueOnce({ docs: [] })
        .mockResolvedValueOnce({ docs: [] })
        .mockResolvedValueOnce({ docs: [] })
        .mockResolvedValueOnce({ docs: [] });

      const service = new ProviderEarningsService(mockDb as any);
      const summary = await service.getEarningsSummary(providerId);

      // Should only count the valid one
      expect(summary.totalEarnings).toBe(50);
      expect(summary.successfulCalls).toBe(1);
      expect(summary.totalCalls).toBe(3);
    });
  });
});

// Integration-style tests (would need real Firestore in CI)
describe("ProviderEarningsService Integration", () => {
  it.skip("should work with real Firestore emulator", async () => {
    // This test would run against the emulator
    // Skip in unit test suite
  });
});
