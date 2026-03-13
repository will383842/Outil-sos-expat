import {
  generateUnifiedAffiliateCode,
  isValidUnifiedCode,
  isLegacyCode,
  deriveBaseCode,
  detectLegacyCodeType,
} from "../codeGenerator";

describe("codeGenerator", () => {
  // ─── generateUnifiedAffiliateCode ─────────────────────────────────
  describe("generateUnifiedAffiliateCode", () => {
    it("generates code from firstName + UID suffix", () => {
      const code = generateUnifiedAffiliateCode("Jean", "abc123def456");
      expect(code).toMatch(/^JEAN/);
      expect(code.length).toBeGreaterThanOrEqual(8);
      expect(code.length).toBeLessThanOrEqual(10);
    });

    it("handles accented characters", () => {
      const code = generateUnifiedAffiliateCode("José", "uid123456789");
      expect(code).toMatch(/^JOSE/);
    });

    it("handles short firstName (1 char) with padding", () => {
      const code = generateUnifiedAffiliateCode("A", "uid123456789");
      expect(code).toMatch(/^AX/); // Padded to 2 chars
    });

    it("handles empty firstName with padding", () => {
      const code = generateUnifiedAffiliateCode("", "uid123456789");
      expect(code).toMatch(/^XX/); // Padded
    });

    it("truncates long firstName to 4 chars", () => {
      const code = generateUnifiedAffiliateCode("Alexander", "uid123456789");
      expect(code).toMatch(/^ALEX/);
    });

    it("strips non-letter characters from firstName", () => {
      const code = generateUnifiedAffiliateCode("Jean-Pierre", "uid123456789");
      expect(code).toMatch(/^JEAN/); // Dash removed, truncated to 4
    });

    it("uses last 6 chars of UID (uppercased)", () => {
      const code = generateUnifiedAffiliateCode("Jo", "abcDEF123ghI");
      // UID cleaned: "abcDEF123ghI" → last 6 = "123GHI"
      expect(code).toContain("123GHI");
    });

    it("produces deterministic output", () => {
      const a = generateUnifiedAffiliateCode("Marie", "user_abc123");
      const b = generateUnifiedAffiliateCode("Marie", "user_abc123");
      expect(a).toBe(b);
    });

    it("produces different codes for different UIDs", () => {
      const a = generateUnifiedAffiliateCode("Marie", "uid_aaaaaa");
      const b = generateUnifiedAffiliateCode("Marie", "uid_bbbbbb");
      expect(a).not.toBe(b);
    });
  });

  // ─── isValidUnifiedCode ──────────────────────────────────────────
  describe("isValidUnifiedCode", () => {
    it("accepts valid unified codes", () => {
      expect(isValidUnifiedCode("JEAN1A2B3C")).toBe(true);
      expect(isValidUnifiedCode("AB1234")).toBe(true);
      expect(isValidUnifiedCode("MARIE6CHARS")).toBe(true);
    });

    it("rejects codes with dashes (legacy format)", () => {
      expect(isValidUnifiedCode("REC-JEAN456")).toBe(false);
      expect(isValidUnifiedCode("PROV-INF-MARIE123")).toBe(false);
      expect(isValidUnifiedCode("BLOG-JEAN1A2B3C")).toBe(false);
    });

    it("rejects too short codes", () => {
      expect(isValidUnifiedCode("AB")).toBe(false);
      expect(isValidUnifiedCode("ABCDE")).toBe(false);
    });

    it("rejects too long codes", () => {
      expect(isValidUnifiedCode("ABCDEF1234567")).toBe(false); // 13 chars
    });

    it("rejects empty/null/undefined", () => {
      expect(isValidUnifiedCode("")).toBe(false);
      expect(isValidUnifiedCode(null as unknown as string)).toBe(false);
      expect(isValidUnifiedCode(undefined as unknown as string)).toBe(false);
    });
  });

  // ─── isLegacyCode ────────────────────────────────────────────────
  describe("isLegacyCode", () => {
    it("detects REC- prefix", () => {
      expect(isLegacyCode("REC-JEAN456")).toBe(true);
      expect(isLegacyCode("REC-BLOG-JEAN456")).toBe(true);
    });

    it("detects PROV- prefix", () => {
      expect(isLegacyCode("PROV-JEAN456")).toBe(true);
      expect(isLegacyCode("PROV-INF-MARIE123")).toBe(true);
    });

    it("detects BLOG- prefix", () => {
      expect(isLegacyCode("BLOG-JEAN1A2B3C")).toBe(true);
    });

    it("detects GROUP- prefix", () => {
      expect(isLegacyCode("GROUP-JANE789")).toBe(true);
    });

    it("returns false for unified codes", () => {
      expect(isLegacyCode("JEAN1A2B3C")).toBe(false);
    });

    it("returns false for empty/null", () => {
      expect(isLegacyCode("")).toBe(false);
      expect(isLegacyCode(null as unknown as string)).toBe(false);
    });
  });

  // ─── deriveBaseCode ──────────────────────────────────────────────
  describe("deriveBaseCode", () => {
    it("strips REC- prefix", () => {
      expect(deriveBaseCode("REC-JEAN456")).toBe("JEAN456");
    });

    it("strips PROV- prefix", () => {
      expect(deriveBaseCode("PROV-JEAN456")).toBe("JEAN456");
    });

    it("strips PROV-INF- and returns base", () => {
      expect(deriveBaseCode("PROV-INF-MARIE123")).toBe("MARIE123");
    });

    it("strips PROV-BLOG- but keeps BLOG- prefix (client format)", () => {
      expect(deriveBaseCode("PROV-BLOG-JEAN1A2B3C")).toBe("BLOG-JEAN1A2B3C");
    });

    it("strips PROV-GROUP- but keeps GROUP- prefix (client format)", () => {
      expect(deriveBaseCode("PROV-GROUP-JANE789")).toBe("GROUP-JANE789");
    });

    it("strips REC-BLOG- but keeps BLOG-", () => {
      expect(deriveBaseCode("REC-BLOG-JEAN456")).toBe("BLOG-JEAN456");
    });

    it("strips REC-GROUP- but keeps GROUP-", () => {
      expect(deriveBaseCode("REC-GROUP-JANE789")).toBe("GROUP-JANE789");
    });

    it("returns unified code unchanged", () => {
      expect(deriveBaseCode("JEAN1A2B3C")).toBe("JEAN1A2B3C");
    });

    it("returns BLOG- code unchanged (already client format)", () => {
      expect(deriveBaseCode("BLOG-JEAN1A2B3C")).toBe("BLOG-JEAN1A2B3C");
    });
  });

  // ─── detectLegacyCodeType ────────────────────────────────────────
  describe("detectLegacyCodeType", () => {
    it("detects PROV-INF- as provider+influencer", () => {
      const result = detectLegacyCodeType("PROV-INF-MARIE123");
      expect(result).toEqual({ codeType: "provider", roleHint: "influencer" });
    });

    it("detects PROV-BLOG- as provider+blogger", () => {
      const result = detectLegacyCodeType("PROV-BLOG-JEAN456");
      expect(result).toEqual({ codeType: "provider", roleHint: "blogger" });
    });

    it("detects REC-GROUP- as recruitment+groupAdmin", () => {
      const result = detectLegacyCodeType("REC-GROUP-JANE789");
      expect(result).toEqual({ codeType: "recruitment", roleHint: "groupAdmin" });
    });

    it("detects PROV- as generic provider", () => {
      const result = detectLegacyCodeType("PROV-ALICE456");
      expect(result).toEqual({ codeType: "provider" });
    });

    it("detects REC- as generic recruitment", () => {
      const result = detectLegacyCodeType("REC-ALICE456");
      expect(result).toEqual({ codeType: "recruitment" });
    });

    it("detects BLOG- as client+blogger", () => {
      const result = detectLegacyCodeType("BLOG-JEAN1A2B3C");
      expect(result).toEqual({ codeType: "client", roleHint: "blogger" });
    });

    it("detects GROUP- as client+groupAdmin", () => {
      const result = detectLegacyCodeType("GROUP-JANE789");
      expect(result).toEqual({ codeType: "client", roleHint: "groupAdmin" });
    });

    it("defaults to client for plain codes", () => {
      const result = detectLegacyCodeType("JEAN1A2B3C");
      expect(result).toEqual({ codeType: "client" });
    });
  });
});
