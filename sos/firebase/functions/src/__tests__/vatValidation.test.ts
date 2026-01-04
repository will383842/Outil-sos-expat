/**
 * VAT Validation Service Unit Tests
 *
 * Tests pour les services de validation TVA:
 * - viesService (API VIES pour l'UE)
 * - hmrcService (API HMRC pour le UK)
 * - vatValidation (service unifie avec cache)
 */

import axios from "axios";

// ============================================================================
// Mock Setup
// ============================================================================

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock Firebase Admin
const mockFirestoreGet = jest.fn();
const mockFirestoreSet = jest.fn();
const mockFirestoreDelete = jest.fn();
const mockFirestoreWhere = jest.fn();
const mockFirestoreLimit = jest.fn();

const mockTimestampNow = jest.fn(() => ({
  toDate: () => new Date(),
}));

const mockTimestampFromDate = jest.fn((date: Date) => ({
  toDate: () => date,
}));

jest.mock("firebase-admin", () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: mockFirestoreGet,
        set: mockFirestoreSet,
        delete: mockFirestoreDelete,
      })),
      where: mockFirestoreWhere,
    })),
  })),
  firestore: Object.assign(
    jest.fn(() => ({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: mockFirestoreGet,
          set: mockFirestoreSet,
          delete: mockFirestoreDelete,
        })),
        where: mockFirestoreWhere,
      })),
    })),
    {
      Timestamp: {
        now: mockTimestampNow,
        fromDate: mockTimestampFromDate,
      },
      FieldValue: {
        serverTimestamp: jest.fn(() => "mock-timestamp"),
      },
    }
  ),
}));

// Mock Firebase Functions logger
jest.mock("firebase-functions", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import after mocks
import {
  validateVatNumberVIES,
  validateFullVatNumber as validateFullVatVIES,
  formatVatNumber,
  normalizeCountryCode,
  isEUCountry,
  EU_COUNTRY_CODES,
} from "../tax/viesService";

import {
  validateVatNumberHMRC,
  formatUkVatNumber,
  isValidUkVatFormat,
  isUkCountry,
} from "../tax/hmrcService";

// ============================================================================
// Test Data
// ============================================================================

const VALID_VIES_RESPONSE = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <checkVatResponse xmlns="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
      <countryCode>FR</countryCode>
      <vatNumber>12345678901</vatNumber>
      <requestDate>2024-01-15</requestDate>
      <valid>true</valid>
      <name>ENTREPRISE EXAMPLE SAS</name>
      <address>123 RUE DE PARIS, 75001 PARIS</address>
    </checkVatResponse>
  </soap:Body>
</soap:Envelope>`;

const INVALID_VIES_RESPONSE = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <checkVatResponse xmlns="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
      <countryCode>FR</countryCode>
      <vatNumber>99999999999</vatNumber>
      <requestDate>2024-01-15</requestDate>
      <valid>false</valid>
      <name>---</name>
      <address>---</address>
    </checkVatResponse>
  </soap:Body>
</soap:Envelope>`;

const VIES_FAULT_RESPONSE = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Server</faultcode>
      <faultstring>MS_UNAVAILABLE</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`;

const VALID_HMRC_RESPONSE = {
  target: {
    name: "ACME LTD",
    vatNumber: "123456789",
    address: {
      line1: "123 Business Street",
      line2: "Westminster",
      postcode: "SW1A 1AA",
      countryCode: "GB",
    },
  },
  processingDate: "2024-01-15T12:00:00Z",
};

// ============================================================================
// Test Suite: VIES Service
// ============================================================================

describe("VIES Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("formatVatNumber", () => {
    it("should remove spaces and dashes", () => {
      expect(formatVatNumber("123 456 789")).toBe("123456789");
      expect(formatVatNumber("123-456-789")).toBe("123456789");
      expect(formatVatNumber("123.456.789")).toBe("123456789");
    });

    it("should convert to uppercase", () => {
      expect(formatVatNumber("fr12345678901")).toBe("FR12345678901");
    });

    it("should handle mixed formatting", () => {
      expect(formatVatNumber("FR 123.456-789_01")).toBe("FR12345678901");
    });
  });

  describe("normalizeCountryCode", () => {
    it("should convert to uppercase", () => {
      expect(normalizeCountryCode("fr")).toBe("FR");
      expect(normalizeCountryCode("de")).toBe("DE");
    });

    it("should convert GR to EL (Greece)", () => {
      expect(normalizeCountryCode("GR")).toBe("EL");
      expect(normalizeCountryCode("gr")).toBe("EL");
    });

    it("should trim whitespace", () => {
      expect(normalizeCountryCode(" FR ")).toBe("FR");
    });
  });

  describe("isEUCountry", () => {
    it("should return true for EU countries", () => {
      expect(isEUCountry("FR")).toBe(true);
      expect(isEUCountry("DE")).toBe(true);
      expect(isEUCountry("IT")).toBe(true);
      expect(isEUCountry("ES")).toBe(true);
    });

    it("should return true for Greece with GR code", () => {
      expect(isEUCountry("GR")).toBe(true);
      expect(isEUCountry("EL")).toBe(true);
    });

    it("should return true for Northern Ireland (XI)", () => {
      expect(isEUCountry("XI")).toBe(true);
    });

    it("should return false for UK (GB)", () => {
      expect(isEUCountry("GB")).toBe(false);
      expect(isEUCountry("UK")).toBe(false);
    });

    it("should return false for non-EU countries", () => {
      expect(isEUCountry("US")).toBe(false);
      expect(isEUCountry("CH")).toBe(false);
      expect(isEUCountry("NO")).toBe(false);
    });
  });

  describe("validateVatNumberVIES", () => {
    it("should return valid result for valid VAT number", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: VALID_VIES_RESPONSE,
        status: 200,
      });

      const result = await validateVatNumberVIES("FR", "12345678901");

      expect(result.valid).toBe(true);
      expect(result.countryCode).toBe("FR");
      expect(result.vatNumber).toBe("12345678901");
      expect(result.name).toBe("ENTREPRISE EXAMPLE SAS");
      expect(result.address).toBe("123 RUE DE PARIS, 75001 PARIS");
      expect(result.errorCode).toBeUndefined();
    });

    it("should return invalid result for invalid VAT number", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: INVALID_VIES_RESPONSE,
        status: 200,
      });

      const result = await validateVatNumberVIES("FR", "99999999999");

      expect(result.valid).toBe(false);
      expect(result.countryCode).toBe("FR");
      expect(result.name).toBeUndefined(); // "---" should be filtered
      expect(result.errorCode).toBeUndefined();
    });

    it("should return error for invalid country code", async () => {
      const result = await validateVatNumberVIES("XX", "12345678901");

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe("INVALID_INPUT");
      expect(result.errorMessage).toContain("n'est pas un pays membre de l'UE");
    });

    it("should return error for too short VAT number", async () => {
      const result = await validateVatNumberVIES("FR", "1");

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe("INVALID_INPUT");
    });

    it("should handle VIES SOAP fault", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: VIES_FAULT_RESPONSE,
        status: 200,
      });

      const result = await validateVatNumberVIES("FR", "12345678901", {
        maxRetries: 1,
      });

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe("MS_UNAVAILABLE");
    });

    it("should retry on timeout error", async () => {
      const timeoutError = new Error("timeout");
      (timeoutError as any).code = "ECONNABORTED";

      mockedAxios.post
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce({
          data: VALID_VIES_RESPONSE,
          status: 200,
        });

      const result = await validateVatNumberVIES("FR", "12345678901", {
        maxRetries: 2,
        initialRetryDelay: 10, // Fast retry for tests
      });

      expect(result.valid).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it("should return timeout error after all retries", async () => {
      const timeoutError = new Error("timeout");
      (timeoutError as any).code = "ECONNABORTED";

      mockedAxios.post.mockRejectedValue(timeoutError);

      const result = await validateVatNumberVIES("FR", "12345678901", {
        maxRetries: 2,
        initialRetryDelay: 10,
      });

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe("TIMEOUT");
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it("should normalize Greece country code", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: VALID_VIES_RESPONSE.replace(/FR/g, "EL"),
        status: 200,
      });

      const result = await validateVatNumberVIES("GR", "123456789");

      expect(result.countryCode).toBe("EL");
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("<urn:countryCode>EL</urn:countryCode>"),
        expect.any(Object)
      );
    });
  });

  describe("validateFullVatNumber (VIES)", () => {
    it("should extract country code from full VAT number", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: VALID_VIES_RESPONSE,
        status: 200,
      });

      const result = await validateFullVatVIES("FR12345678901");

      expect(result.countryCode).toBe("FR");
      expect(result.vatNumber).toBe("12345678901");
    });

    it("should handle spaces in full VAT number", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: VALID_VIES_RESPONSE,
        status: 200,
      });

      const result = await validateFullVatVIES("FR 123 456 789 01");

      expect(result.vatNumber).toBe("12345678901");
    });

    it("should return error for too short input", async () => {
      const result = await validateFullVatVIES("FR");

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe("INVALID_INPUT");
    });
  });
});

// ============================================================================
// Test Suite: HMRC Service
// ============================================================================

describe("HMRC Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("formatUkVatNumber", () => {
    it("should remove spaces and non-alphanumeric characters", () => {
      expect(formatUkVatNumber("123 456 789")).toBe("123456789");
      expect(formatUkVatNumber("123-456-789")).toBe("123456789");
    });

    it("should remove GB prefix", () => {
      expect(formatUkVatNumber("GB123456789")).toBe("123456789");
      expect(formatUkVatNumber("gb123456789")).toBe("123456789");
    });

    it("should convert to uppercase", () => {
      expect(formatUkVatNumber("gb123456789")).toBe("123456789");
    });
  });

  describe("isValidUkVatFormat", () => {
    it("should accept 9 digit numbers", () => {
      expect(isValidUkVatFormat("123456789")).toBe(true);
    });

    it("should accept 12 digit numbers (group VAT)", () => {
      expect(isValidUkVatFormat("123456789012")).toBe(true);
    });

    it("should accept numbers with GB prefix", () => {
      expect(isValidUkVatFormat("GB123456789")).toBe(true);
    });

    it("should reject invalid lengths", () => {
      expect(isValidUkVatFormat("12345678")).toBe(false); // 8 digits
      expect(isValidUkVatFormat("1234567890")).toBe(false); // 10 digits
    });

    it("should reject non-numeric characters", () => {
      expect(isValidUkVatFormat("12345678A")).toBe(false);
    });
  });

  describe("isUkCountry", () => {
    it("should return true for GB", () => {
      expect(isUkCountry("GB")).toBe(true);
      expect(isUkCountry("gb")).toBe(true);
    });

    it("should return true for UK", () => {
      expect(isUkCountry("UK")).toBe(true);
      expect(isUkCountry("uk")).toBe(true);
    });

    it("should return false for other countries", () => {
      expect(isUkCountry("FR")).toBe(false);
      expect(isUkCountry("DE")).toBe(false);
    });
  });

  describe("validateVatNumberHMRC", () => {
    it("should return valid result for valid UK VAT number", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: VALID_HMRC_RESPONSE,
        status: 200,
      });

      const result = await validateVatNumberHMRC("123456789");

      expect(result.valid).toBe(true);
      expect(result.countryCode).toBe("GB");
      expect(result.vatNumber).toBe("123456789");
      expect(result.name).toBe("ACME LTD");
      expect(result.address).toBeDefined();
    });

    it("should return invalid result for not found VAT number", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { code: "NOT_FOUND" },
        status: 404,
      });

      const result = await validateVatNumberHMRC("999999999");

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBeUndefined(); // NOT_FOUND is a valid "invalid" response
    });

    it("should return error for invalid format", async () => {
      const result = await validateVatNumberHMRC("12345"); // Too short

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe("INVALID_REQUEST");
      expect(result.errorMessage).toContain("Format");
    });

    it("should handle service unavailable with retry", async () => {
      mockedAxios.get
        .mockResolvedValueOnce({
          data: { message: "Service unavailable" },
          status: 503,
        })
        .mockResolvedValueOnce({
          data: VALID_HMRC_RESPONSE,
          status: 200,
        });

      const result = await validateVatNumberHMRC("123456789", {
        maxRetries: 2,
        initialRetryDelay: 10,
      });

      expect(result.valid).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it("should accept VAT number with GB prefix", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: VALID_HMRC_RESPONSE,
        status: 200,
      });

      const result = await validateVatNumberHMRC("GB123456789");

      expect(result.vatNumber).toBe("123456789");
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/123456789"),
        expect.any(Object)
      );
    });

    it("should handle rate limiting with retry", async () => {
      mockedAxios.get
        .mockResolvedValueOnce({
          data: { message: "Rate limit exceeded" },
          status: 429,
        })
        .mockResolvedValueOnce({
          data: VALID_HMRC_RESPONSE,
          status: 200,
        });

      const result = await validateVatNumberHMRC("123456789", {
        maxRetries: 2,
        initialRetryDelay: 10,
      });

      expect(result.valid).toBe(true);
    });
  });
});

// ============================================================================
// Test Suite: EU Country Codes
// ============================================================================

describe("EU Country Codes", () => {
  it("should include all 27 EU member states plus Northern Ireland", () => {
    const expectedCountries = [
      "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES",
      "FI", "FR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT",
      "NL", "PL", "PT", "RO", "SE", "SI", "SK", "XI",
    ];

    expectedCountries.forEach((code) => {
      expect(EU_COUNTRY_CODES.has(code)).toBe(true);
    });
  });

  it("should have exactly 28 country codes", () => {
    expect(EU_COUNTRY_CODES.size).toBe(28);
  });
});

// ============================================================================
// Integration-like Tests (with mocked external calls)
// ============================================================================

describe("VAT Validation Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should validate French VAT number end-to-end", async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: VALID_VIES_RESPONSE,
      status: 200,
    });

    const result = await validateVatNumberVIES("FR", "12345678901");

    expect(result).toMatchObject({
      valid: true,
      countryCode: "FR",
      vatNumber: "12345678901",
      name: "ENTREPRISE EXAMPLE SAS",
    });
  });

  it("should validate UK VAT number end-to-end", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: VALID_HMRC_RESPONSE,
      status: 200,
    });

    const result = await validateVatNumberHMRC("123456789");

    expect(result).toMatchObject({
      valid: true,
      countryCode: "GB",
      vatNumber: "123456789",
      name: "ACME LTD",
    });
  });
});
