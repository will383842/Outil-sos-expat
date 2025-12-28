/**
 * =============================================================================
 * TESTS - Validation Schemas
 * =============================================================================
 */

import { describe, it, expect } from "vitest";
import {
  IngestBookingSchema,
  MessageSchema,
  AIChatSchema,
  SyncProviderSchema,
  SetRoleSchema,
  EmailSchema,
  validatePayload,
  formatZodErrors,
  sanitizeString,
  sanitizeMetadata,
} from "../validation";

// =============================================================================
// TESTS: IngestBookingSchema
// =============================================================================

describe("IngestBookingSchema", () => {
  it("should validate a complete valid payload", () => {
    const payload = {
      clientFirstName: "Jean",
      clientLastName: "Dupont",
      clientEmail: "jean.dupont@example.com",
      clientPhone: "+33612345678",
      clientCurrentCountry: "Thaïlande",
      clientNationality: "Française",
      title: "Question visa long séjour",
      description: "Je souhaite obtenir un visa de retraité en Thaïlande",
      urgency: "high",
      providerId: "provider_123",
      providerType: "lawyer",
    };

    const result = IngestBookingSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.clientEmail).toBe("jean.dupont@example.com");
      expect(result.data.urgency).toBe("high");
    }
  });

  it("should validate with minimal required fields", () => {
    const payload = {
      clientFirstName: "Jean",
      title: "Ma demande",
    };

    const result = IngestBookingSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should fail without any client identifier", () => {
    const payload = {
      title: "Ma demande",
      description: "Description",
    };

    const result = IngestBookingSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("should fail with invalid email", () => {
    const payload = {
      clientFirstName: "Jean",
      clientEmail: "not-an-email",
      title: "Ma demande",
    };

    const result = IngestBookingSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("should fail with title too short", () => {
    const payload = {
      clientFirstName: "Jean",
      title: "Ab", // < 3 chars
    };

    const result = IngestBookingSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("should normalize email to lowercase", () => {
    const payload = {
      clientFirstName: "Jean",
      clientEmail: "JEAN.DUPONT@EXAMPLE.COM",
      title: "Ma demande",
    };

    const result = IngestBookingSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.clientEmail).toBe("jean.dupont@example.com");
    }
  });

  it("should apply default values", () => {
    const payload = {
      clientFirstName: "Jean",
      title: "Ma demande",
    };

    const result = IngestBookingSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.urgency).toBe("medium");
      expect(result.data.source).toBe("sos-expat");
      expect(result.data.clientLanguages).toEqual([]);
      expect(result.data.metadata).toEqual({});
    }
  });

  it("should validate urgency enum", () => {
    const validUrgencies = ["low", "medium", "high", "urgent", "critical"];

    for (const urgency of validUrgencies) {
      const payload = {
        clientFirstName: "Jean",
        title: "Ma demande",
        urgency,
      };
      const result = IngestBookingSchema.safeParse(payload);
      expect(result.success).toBe(true);
    }

    const invalidPayload = {
      clientFirstName: "Jean",
      title: "Ma demande",
      urgency: "super-urgent", // Invalid
    };
    const result = IngestBookingSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// TESTS: MessageSchema
// =============================================================================

describe("MessageSchema", () => {
  it("should validate a valid message", () => {
    const payload = {
      content: "Bonjour, j'ai une question",
      conversationId: "conv_123",
      role: "user",
    };

    const result = MessageSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should fail with empty content", () => {
    const payload = {
      content: "",
    };

    const result = MessageSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("should fail with content too long", () => {
    const payload = {
      content: "a".repeat(50001),
    };

    const result = MessageSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("should apply default role and source", () => {
    const payload = {
      content: "Test message",
    };

    const result = MessageSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("user");
      expect(result.data.source).toBe("user");
    }
  });
});

// =============================================================================
// TESTS: AIChatSchema
// =============================================================================

describe("AIChatSchema", () => {
  it("should validate a valid AI chat request", () => {
    const payload = {
      message: "Quels sont les documents nécessaires pour un visa Thaïlande?",
      conversationId: "conv_123",
      bookingContext: {
        clientCurrentCountry: "Thaïlande",
        providerType: "lawyer",
      },
    };

    const result = AIChatSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should fail with empty message", () => {
    const payload = {
      message: "",
    };

    const result = AIChatSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("should validate minimal payload", () => {
    const payload = {
      message: "Ma question",
    };

    const result = AIChatSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// TESTS: SyncProviderSchema
// =============================================================================

describe("SyncProviderSchema", () => {
  it("should validate a complete provider sync", () => {
    const payload = {
      externalId: "laravel_123",
      email: "avocat@example.com",
      name: "Maître Dupont",
      type: "lawyer",
      phone: "+33612345678",
      country: "France",
      specialties: ["droit des étrangers", "visa"],
      languages: ["fr", "en"],
      active: true,
    };

    const result = SyncProviderSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should fail without required fields", () => {
    const payload = {
      email: "test@example.com",
      // Missing: externalId, name, type
    };

    const result = SyncProviderSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("should validate provider type enum", () => {
    const validTypes = ["lawyer", "expat"];

    for (const type of validTypes) {
      const payload = {
        externalId: "123",
        email: "test@example.com",
        name: "Test",
        type,
      };
      const result = SyncProviderSchema.safeParse(payload);
      expect(result.success).toBe(true);
    }

    const invalidPayload = {
      externalId: "123",
      email: "test@example.com",
      name: "Test",
      type: "consultant", // Invalid
    };
    const result = SyncProviderSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// TESTS: SetRoleSchema
// =============================================================================

describe("SetRoleSchema", () => {
  it("should validate valid role assignment", () => {
    const validRoles = ["admin", "superadmin", "provider", "agent", "user"];

    for (const role of validRoles) {
      const payload = { uid: "user_123", role };
      const result = SetRoleSchema.safeParse(payload);
      expect(result.success).toBe(true);
    }
  });

  it("should fail with invalid role", () => {
    const payload = {
      uid: "user_123",
      role: "moderator", // Invalid
    };

    const result = SetRoleSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("should fail without uid", () => {
    const payload = {
      role: "admin",
    };

    const result = SetRoleSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// TESTS: EmailSchema
// =============================================================================

describe("EmailSchema", () => {
  it("should validate and normalize email", () => {
    const testCases = [
      { input: "TEST@EXAMPLE.COM", expected: "test@example.com" },
      { input: "  user@domain.fr  ", expected: "user@domain.fr" },
      { input: "User.Name@Domain.CO.UK", expected: "user.name@domain.co.uk" },
    ];

    for (const { input, expected } of testCases) {
      const result = EmailSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(expected);
      }
    }
  });

  it("should reject invalid emails", () => {
    const invalidEmails = [
      "not-an-email",
      "@nodomain.com",
      "no@",
      "spaces in@email.com",
      "",
    ];

    for (const email of invalidEmails) {
      const result = EmailSchema.safeParse(email);
      expect(result.success).toBe(false);
    }
  });
});

// =============================================================================
// TESTS: Helper Functions
// =============================================================================

describe("validatePayload", () => {
  it("should return success with valid data", () => {
    const result = validatePayload(EmailSchema, "test@example.com");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("test@example.com");
    }
  });

  it("should return errors with invalid data", () => {
    const result = validatePayload(EmailSchema, "not-an-email");
    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.errors).toBeDefined();
    }
  });
});

describe("formatZodErrors", () => {
  it("should format errors correctly", () => {
    const result = IngestBookingSchema.safeParse({});
    expect(result.success).toBe(false);

    if (!result.success) {
      const formatted = formatZodErrors(result.error);
      expect(formatted.message).toBeTruthy();
      expect(typeof formatted.fields).toBe("object");
    }
  });
});

describe("sanitizeString", () => {
  it("should escape HTML characters", () => {
    expect(sanitizeString("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;"
    );
  });

  it("should escape quotes", () => {
    expect(sanitizeString('Test "quoted" text')).toBe(
      "Test &quot;quoted&quot; text"
    );
  });

  it("should trim whitespace", () => {
    expect(sanitizeString("  test  ")).toBe("test");
  });
});

describe("sanitizeMetadata", () => {
  it("should sanitize string values", () => {
    const input = {
      name: "<script>bad</script>",
      count: 42,
      active: true,
    };

    const result = sanitizeMetadata(input);
    expect(result.name).toBe("&lt;script&gt;bad&lt;/script&gt;");
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
  });

  it("should ignore dangerous keys", () => {
    const input: Record<string, unknown> = {
      normal: "ok",
    };
    // Use bracket notation to set dangerous keys
    input["__dangerous__"] = "bad";
    input["$where"] = "bad";

    const result = sanitizeMetadata(input);
    // Check that dangerous keys are not in the result's own properties
    expect(Object.keys(result)).not.toContain("__dangerous__");
    expect(Object.keys(result)).not.toContain("$where");
    expect(result.normal).toBe("ok");
  });

  it("should sanitize array values", () => {
    const input = {
      tags: ["<b>tag1</b>", "tag2"],
    };

    const result = sanitizeMetadata(input);
    expect(result.tags).toEqual(["&lt;b&gt;tag1&lt;/b&gt;", "tag2"]);
  });
});
