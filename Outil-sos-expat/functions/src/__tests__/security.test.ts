/**
 * =============================================================================
 * TESTS - Security Module
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import {
  setSecurityHeaders,
  validateContentType,
  validatePayloadSize,
  getTrustedClientIp,
  hashPII,
  maskEmail,
  maskPhone,
  applySecurityChecks,
  MAX_PAYLOAD_SIZE,
} from "../security";

// =============================================================================
// MOCKS
// =============================================================================

function createMockRequest(overrides: Partial<Request> = {}): Request {
  const mockHeader = vi.fn().mockReturnValue(null) as unknown as Request["header"];
  return {
    method: "POST",
    path: "/test",
    body: {},
    ip: "192.168.1.1",
    header: mockHeader,
    ...overrides,
  } as unknown as Request;
}

function createMockResponse(): Response & { headers: Record<string, string> } {
  const headers: Record<string, string> = {};
  return {
    headers,
    setHeader: vi.fn((key: string, value: string) => {
      headers[key] = value;
    }),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response & { headers: Record<string, string> };
}

// =============================================================================
// TESTS: setSecurityHeaders
// =============================================================================

describe("setSecurityHeaders", () => {
  it("should set all security headers", () => {
    const res = createMockResponse();
    setSecurityHeaders(res);

    expect(res.setHeader).toHaveBeenCalledWith("X-Content-Type-Options", "nosniff");
    expect(res.setHeader).toHaveBeenCalledWith("X-Frame-Options", "DENY");
    expect(res.setHeader).toHaveBeenCalledWith("X-XSS-Protection", "1; mode=block");
    expect(res.setHeader).toHaveBeenCalledWith(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'"
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      "Referrer-Policy",
      "strict-origin-when-cross-origin"
    );
  });
});

// =============================================================================
// TESTS: validateContentType
// =============================================================================

describe("validateContentType", () => {
  it("should return true for valid application/json", () => {
    const req = createMockRequest({
      header: vi.fn().mockReturnValue("application/json"),
    });
    const res = createMockResponse();

    expect(validateContentType(req, res)).toBe(true);
  });

  it("should return true for application/json with charset", () => {
    const req = createMockRequest({
      header: vi.fn().mockReturnValue("application/json; charset=utf-8"),
    });
    const res = createMockResponse();

    expect(validateContentType(req, res)).toBe(true);
  });

  it("should return false for invalid content-type", () => {
    const req = createMockRequest({
      header: vi.fn().mockReturnValue("text/plain"),
    });
    const res = createMockResponse();

    expect(validateContentType(req, res)).toBe(false);
    expect(res.status).toHaveBeenCalledWith(415);
  });

  it("should return false for missing content-type", () => {
    const req = createMockRequest({
      header: vi.fn().mockReturnValue(null),
    });
    const res = createMockResponse();

    expect(validateContentType(req, res)).toBe(false);
    expect(res.status).toHaveBeenCalledWith(415);
  });

  it("should skip validation for GET requests", () => {
    const req = createMockRequest({
      method: "GET",
      header: vi.fn().mockReturnValue(null),
    });
    const res = createMockResponse();

    expect(validateContentType(req, res)).toBe(true);
  });
});

// =============================================================================
// TESTS: validatePayloadSize
// =============================================================================

describe("validatePayloadSize", () => {
  it("should return true for small payloads", () => {
    const req = createMockRequest({
      body: { message: "hello" },
    });
    const res = createMockResponse();

    expect(validatePayloadSize(req, res)).toBe(true);
  });

  it("should return false for payloads exceeding max size", () => {
    const largePayload = { data: "x".repeat(MAX_PAYLOAD_SIZE + 1000) };
    const req = createMockRequest({
      body: largePayload,
    });
    const res = createMockResponse();

    expect(validatePayloadSize(req, res)).toBe(false);
    expect(res.status).toHaveBeenCalledWith(413);
  });

  it("should respect custom max size", () => {
    const req = createMockRequest({
      body: { data: "x".repeat(1000) },
    });
    const res = createMockResponse();

    expect(validatePayloadSize(req, res, 500)).toBe(false);
  });

  it("should skip validation for GET requests", () => {
    const req = createMockRequest({
      method: "GET",
      body: null,
    });
    const res = createMockResponse();

    expect(validatePayloadSize(req, res)).toBe(true);
  });
});

// =============================================================================
// TESTS: getTrustedClientIp
// =============================================================================

describe("getTrustedClientIp", () => {
  it("should return req.ip if available", () => {
    const req = createMockRequest({ ip: "203.0.113.1" });
    expect(getTrustedClientIp(req)).toBe("203.0.113.1");
  });

  it("should return first IP from x-forwarded-for if req.ip is localhost", () => {
    const mockHeader = vi.fn((name: string) =>
      name.toLowerCase() === "x-forwarded-for" ? "203.0.113.1, 10.0.0.1" : null
    ) as unknown as Request["header"];
    const req = createMockRequest({
      ip: "127.0.0.1",
      header: mockHeader,
    });
    expect(getTrustedClientIp(req)).toBe("203.0.113.1");
  });

  it("should return unknown if no IP available", () => {
    const req = createMockRequest({
      ip: undefined,
      header: vi.fn().mockReturnValue(null),
    });
    expect(getTrustedClientIp(req)).toBe("unknown");
  });

  it("should handle IPv6 addresses", () => {
    const req = createMockRequest({ ip: "2001:db8::1" });
    expect(getTrustedClientIp(req)).toBe("2001:db8::1");
  });
});

// =============================================================================
// TESTS: hashPII
// =============================================================================

describe("hashPII", () => {
  it("should return consistent hash for same input", () => {
    const hash1 = hashPII("test@example.com");
    const hash2 = hashPII("test@example.com");
    expect(hash1).toBe(hash2);
  });

  it("should return different hash for different inputs", () => {
    const hash1 = hashPII("user1@example.com");
    const hash2 = hashPII("user2@example.com");
    expect(hash1).not.toBe(hash2);
  });

  it("should return 'empty' for null/undefined", () => {
    expect(hashPII(null)).toBe("empty");
    expect(hashPII(undefined)).toBe("empty");
    expect(hashPII("")).toBe("empty");
  });

  it("should return 16-character hash", () => {
    const hash = hashPII("test@example.com");
    expect(hash.length).toBe(16);
  });
});

// =============================================================================
// TESTS: maskEmail
// =============================================================================

describe("maskEmail", () => {
  it("should mask email correctly", () => {
    expect(maskEmail("john.doe@example.com")).toBe("joh***@example.com");
  });

  it("should handle short local parts", () => {
    expect(maskEmail("ab@example.com")).toBe("***@example.com");
  });

  it("should return 'empty' for null/undefined", () => {
    expect(maskEmail(null)).toBe("empty");
    expect(maskEmail(undefined)).toBe("empty");
  });

  it("should hash invalid emails without @", () => {
    const result = maskEmail("invalid-email");
    expect(result.length).toBe(16); // Hash length
  });
});

// =============================================================================
// TESTS: maskPhone
// =============================================================================

describe("maskPhone", () => {
  it("should mask phone correctly", () => {
    expect(maskPhone("+33612345678")).toBe("+336****5678");
  });

  it("should handle short phone numbers", () => {
    expect(maskPhone("12345")).toBe("***");
  });

  it("should return 'empty' for null/undefined", () => {
    expect(maskPhone(null)).toBe("empty");
    expect(maskPhone(undefined)).toBe("empty");
  });
});

// =============================================================================
// TESTS: applySecurityChecks
// =============================================================================

describe("applySecurityChecks", () => {
  it("should apply all checks and return true for valid request", () => {
    const mockHeader = vi.fn((name: string) =>
      name.toLowerCase() === "content-type" ? "application/json" : null
    ) as unknown as Request["header"];
    const req = createMockRequest({
      method: "POST",
      body: { message: "hello" },
      header: mockHeader,
    });
    const res = createMockResponse();

    expect(applySecurityChecks(req, res)).toBe(true);
    expect(res.setHeader).toHaveBeenCalled();
  });

  it("should return false for invalid content-type", () => {
    const mockHeader = vi.fn((name: string) =>
      name.toLowerCase() === "content-type" ? "text/plain" : null
    ) as unknown as Request["header"];
    const req = createMockRequest({
      method: "POST",
      header: mockHeader,
    });
    const res = createMockResponse();

    expect(applySecurityChecks(req, res)).toBe(false);
  });

  it("should skip content-type check when option is set", () => {
    const req = createMockRequest({
      method: "POST",
      body: { message: "hello" },
      header: vi.fn().mockReturnValue(null),
    });
    const res = createMockResponse();

    expect(applySecurityChecks(req, res, { skipContentTypeCheck: true })).toBe(true);
  });
});
