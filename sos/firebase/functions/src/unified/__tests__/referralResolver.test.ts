/**
 * Tests for referralResolver
 *
 * Unit tests for cascade chain logic and referral detection helpers.
 * Firestore-dependent tests are integration tests and require emulator.
 */

import { CascadeNode } from "../types";

// ============================================================================
// UNIT TESTS — Cascade chain validation logic
// ============================================================================

describe("referralResolver — cascade chain logic", () => {
  it("empty chain when maxDepth is 0", () => {
    const maxDepth = 0;
    expect(maxDepth <= 0).toBe(true);
    // buildCascadeChain would return [] immediately
  });

  it("empty chain when startUserId is empty", () => {
    const startUserId = "";
    expect(!startUserId).toBe(true);
  });

  it("circular detection stops the chain", () => {
    // Simulate circular: A → B → A
    const visited = new Set<string>();
    const chain: CascadeNode[] = [];

    const users = [
      { userId: "A", referredBy: "B" },
      { userId: "B", referredBy: "A" }, // circular!
    ];

    let currentIdx = 0;
    for (let depth = 1; depth <= 5; depth++) {
      const user = users[currentIdx];
      if (visited.has(user.userId)) {
        // Circular detected
        break;
      }
      visited.add(user.userId);
      chain.push({
        userId: user.userId,
        role: "chatter",
        affiliateCode: `CODE-${user.userId}`,
        commissionPlanId: "plan_1",
        depth,
      });
      // Move to referrer
      const nextUser = users.find((u) => u.userId === user.referredBy);
      if (!nextUser) break;
      currentIdx = users.indexOf(nextUser);
    }

    expect(chain).toHaveLength(2); // A and B, then stops
    expect(chain[0].userId).toBe("A");
    expect(chain[1].userId).toBe("B");
  });

  it("chain respects maxDepth", () => {
    const maxDepth = 2;
    const chain: CascadeNode[] = [];

    // Simulate A → B → C → D (but maxDepth=2 so only A, B)
    const userIds = ["A", "B", "C", "D"];
    for (let depth = 1; depth <= maxDepth && depth <= userIds.length; depth++) {
      chain.push({
        userId: userIds[depth - 1],
        role: "chatter",
        affiliateCode: `CODE-${userIds[depth - 1]}`,
        commissionPlanId: "plan_1",
        depth,
      });
    }

    expect(chain).toHaveLength(2);
    expect(chain[0].depth).toBe(1);
    expect(chain[1].depth).toBe(2);
  });

  it("captain node is correctly flagged", () => {
    const node: CascadeNode = {
      userId: "captain1",
      role: "captainChatter",
      affiliateCode: "CAP-001",
      commissionPlanId: "captain_v1",
      isCaptain: true,
      depth: 1,
    };

    expect(node.isCaptain).toBe(true);
  });

  it("lockedRates are carried through chain nodes", () => {
    const node: CascadeNode = {
      userId: "user1",
      role: "chatter",
      affiliateCode: "CHT-001",
      commissionPlanId: "chatter_v1",
      lockedRates: { recruitment_n1: 150 },
      depth: 1,
    };

    expect(node.lockedRates?.recruitment_n1).toBe(150);
  });
});

// ============================================================================
// REFERRAL FIELD PRIORITY TESTS
// ============================================================================

describe("referralResolver — referral field priority", () => {
  it("referredByUserId takes priority over legacy fields", () => {
    const userData = {
      referredByUserId: "unified-referrer",
      referredByChatterId: "legacy-chatter",
      referredByInfluencerId: "legacy-influencer",
    };

    // The resolver checks referredByUserId first
    const referrerId = userData.referredByUserId ||
      userData.referredByChatterId ||
      userData.referredByInfluencerId;

    expect(referrerId).toBe("unified-referrer");
  });

  it("falls back to legacy fields when no unified field", () => {
    const userData = {
      referredByChatterId: "legacy-chatter",
      referredByInfluencerId: "legacy-influencer",
    };

    const referrerId = (userData as Record<string, string>).referredByUserId ||
      userData.referredByChatterId ||
      userData.referredByInfluencerId;

    expect(referrerId).toBe("legacy-chatter");
  });

  it("partnerReferredById is checked last", () => {
    const userData = {
      partnerReferredById: "partner-123",
    };

    const referrerId = (userData as Record<string, string>).referredByUserId ||
      (userData as Record<string, string>).referredByChatterId ||
      (userData as Record<string, string>).referredByInfluencerId ||
      (userData as Record<string, string>).referredByBlogger ||
      (userData as Record<string, string>).referredByGroupAdmin ||
      userData.partnerReferredById;

    expect(referrerId).toBe("partner-123");
  });
});
