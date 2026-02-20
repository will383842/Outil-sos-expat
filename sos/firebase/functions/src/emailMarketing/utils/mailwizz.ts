import axios, { AxiosError } from "axios";
import { validateMailWizzConfig } from "../config";

interface MailwizzConfig {
  apiUrl: string;
  apiKey: string;
  listUid: string;
  customerId: string;
}

export interface SubscriberData {
  EMAIL: string;
  FNAME?: string;
  LNAME?: string;
  [key: string]: any;
}

export interface TransactionalEmailConfig {
  to: string;           // Email address of recipient
  template: string;     // Template code: TR_PRO_xxx_LANG or TR_CLI_xxx_LANG
  customFields?: Record<string, string>;
}

// Module-level template UID cache (persists across warm invocations)
// Map<templateName, templateUid>  e.g. "transactional-provider-welcome [FR]" → "27391cec78734"
const templateUidCache: Map<string, string> = new Map();
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Languages available in MailWizz templates
// HI and RU are NOT available — fall back to EN
const TEMPLATE_LANGUAGES_AVAILABLE = new Set(["AR", "DE", "EN", "ES", "FR", "PT", "ZH"]);

/**
 * Convert our internal template code to MailWizz template name
 * TR_PRO_call-completed_FR  → transactional-provider-call-completed [FR]
 * TR_CLI_welcome_EN         → transactional-client-welcome [EN]
 * TR_PRO_call-missed-01_DE  → transactional-provider-call-missed-01 [DE]
 */
function convertTemplateName(template: string): string {
  let name = template;
  name = name.replace(/^TR_PRO_/, "transactional-provider-");
  name = name.replace(/^TR_CLI_/, "transactional-client-");
  // Last segment: _FR → [FR], _EN → [EN], etc.
  name = name.replace(/_([A-Z]{2})$/, " [$1]");
  return name;
}

/**
 * Get the best language code for a MailWizz template
 * Fallback to EN if the user's language has no templates
 */
function resolveTemplateLanguage(langCode: string): string {
  const upper = langCode.toUpperCase();
  return TEMPLATE_LANGUAGES_AVAILABLE.has(upper) ? upper : "EN";
}

/**
 * Rebuild the template UID cache from MailWizz API (paginated)
 */
async function refreshTemplateCache(
  apiUrl: string,
  apiKey: string,
  customerId: string
): Promise<void> {
  console.log("🔄 Refreshing MailWizz template cache...");
  let page = 1;
  let totalPages = 1;

  do {
    const response = await axios.get(
      `${apiUrl}/templates?page=${page}&per_page=100`,
      {
        headers: {
          "X-MW-PUBLIC-KEY": apiKey,
          "X-MW-CUSTOMER-ID": customerId,
          "User-Agent": "SOS-Platform/1.0",
        },
        timeout: 15000,
      }
    );

    const data = response.data?.data;
    const records: Array<{ template_uid: string; name: string }> =
      data?.records || [];

    for (const r of records) {
      templateUidCache.set(r.name, r.template_uid);
    }

    totalPages = data?.total_pages || 1;
    page++;
  } while (page <= totalPages);

  console.log(`✅ Template cache loaded: ${templateUidCache.size} templates`);
}

/**
 * Get template UID by name (with in-memory cache + auto-refresh)
 * Tries requested language first, then falls back to EN
 */
async function getTemplateUid(
  apiUrl: string,
  apiKey: string,
  customerId: string,
  templateName: string
): Promise<string> {
  const now = Date.now();

  if (
    templateUidCache.size === 0 ||
    now - cacheLoadedAt > CACHE_TTL_MS
  ) {
    await refreshTemplateCache(apiUrl, apiKey, customerId);
    cacheLoadedAt = now;
  }

  // Try exact match first
  const uid = templateUidCache.get(templateName);
  if (uid) return uid;

  // Try fallback to EN: replace language suffix
  const enName = templateName.replace(/\s\[[A-Z]{2}\]$/, " [EN]");
  const enUid = templateUidCache.get(enName);
  if (enUid) {
    console.warn(
      `⚠️ Template not found: ${templateName} — using EN fallback: ${enName}`
    );
    return enUid;
  }

  throw new Error(
    `MailWizz template not found: ${templateName} (and EN fallback also missing)`
  );
}

/**
 * Extract email subject from HTML <title> tag
 * Falls back to the template name if no title found
 */
function extractSubjectFromHtml(html: string, fallback: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (match && match[1].trim()) {
    return match[1].trim();
  }
  return fallback;
}

/**
 * Replace [VARIABLE] placeholders in HTML with custom field values
 */
function renderTemplate(
  html: string,
  fields: Record<string, string>
): string {
  let rendered = html;
  for (const [key, value] of Object.entries(fields)) {
    rendered = rendered.replace(
      new RegExp(`\\[${key}\\]`, "g"),
      value ?? ""
    );
  }
  return rendered;
}

export class MailwizzAPI {
  private config: MailwizzConfig;

  constructor() {
    this.config = validateMailWizzConfig();
  }

  /**
   * Build standard Axios headers for MailWizz API
   */
  private get headers() {
    return {
      "X-MW-PUBLIC-KEY": this.config.apiKey,
      "X-MW-CUSTOMER-ID": this.config.customerId,
      "User-Agent": "SOS-Platform/1.0",
    };
  }

  /**
   * Create a new subscriber in MailWizz
   * Note: MailWizz API requires form-encoded data (application/x-www-form-urlencoded)
   */
  async createSubscriber(data: SubscriberData): Promise<any> {
    try {
      const requestData = { ...data };

      if (requestData.email && !requestData.EMAIL) {
        requestData.EMAIL = requestData.email;
        delete requestData.email;
      }

      const formData = new URLSearchParams();
      Object.entries(requestData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      const response = await axios.post(
        `${this.config.apiUrl}/lists/${this.config.listUid}/subscribers`,
        formData.toString(),
        {
          headers: {
            ...this.headers,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const email = requestData.EMAIL || requestData.email || "unknown";
      console.log(`✅ Subscriber created: ${email}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(
        `❌ Error creating subscriber:`,
        axiosError.response?.data || axiosError.message
      );
      throw error;
    }
  }

  /**
   * Update an existing subscriber in MailWizz
   * Falls back to search-by-email if update-by-UID fails
   */
  async updateSubscriber(
    userId: string,
    updates: Record<string, string>
  ): Promise<any> {
    try {
      const formData = new URLSearchParams();
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      let response;
      try {
        response = await axios.put(
          `${this.config.apiUrl}/lists/${this.config.listUid}/subscribers/${userId}`,
          formData.toString(),
          {
            headers: {
              ...this.headers,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );
      } catch (updateError) {
        const email = updates.EMAIL;
        if (email) {
          try {
            const searchResponse = await axios.get(
              `${this.config.apiUrl}/lists/${this.config.listUid}/subscribers/search?EMAIL=${encodeURIComponent(email)}`,
              { headers: this.headers }
            );

            const subscriberUid = searchResponse.data?.data?.subscriber_uid;

            if (subscriberUid) {
              response = await axios.put(
                `${this.config.apiUrl}/lists/${this.config.listUid}/subscribers/${subscriberUid}`,
                formData.toString(),
                {
                  headers: {
                    ...this.headers,
                    "Content-Type": "application/x-www-form-urlencoded",
                  },
                }
              );
              console.log(
                `✅ Subscriber found and updated via fallback: ${subscriberUid}`
              );
            } else {
              console.warn(`⚠️ Subscriber not found by email: ${email}`);
              throw updateError;
            }
          } catch (searchError) {
            console.error(
              `❌ Error searching for subscriber by email:`,
              searchError
            );
            throw updateError;
          }
        } else {
          throw updateError;
        }
      }

      console.log(`✅ Subscriber updated: ${userId}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(
        `❌ Error updating subscriber:`,
        axiosError.response?.data || axiosError.message
      );
      throw error;
    }
  }

  /**
   * Send a transactional email using a MailWizz template
   *
   * Template naming convention (our internal codes):
   *   TR_PRO_<template-slug>_<LANG>   → for providers
   *   TR_CLI_<template-slug>_<LANG>   → for clients
   *
   * Flow:
   *   1. Convert template code → MailWizz template name
   *   2. Resolve language (fallback to EN if not available)
   *   3. Fetch template HTML from MailWizz API (cached)
   *   4. Extract subject from <title> tag
   *   5. Replace [VARIABLE] placeholders with customFields
   *   6. POST rendered HTML to MailWizz transactional-emails endpoint
   */
  async sendTransactional(config: TransactionalEmailConfig): Promise<any> {
    try {
      // 1. Resolve language with fallback to EN
      const langMatch = config.template.match(/_([A-Z]{2})$/);
      const requestedLang = langMatch ? langMatch[1] : "EN";
      const resolvedLang = resolveTemplateLanguage(requestedLang);

      // Rebuild template code with resolved language
      const templateCode =
        resolvedLang !== requestedLang
          ? config.template.replace(/_([A-Z]{2})$/, `_${resolvedLang}`)
          : config.template;

      // 2. Convert to MailWizz template name
      const templateName = convertTemplateName(templateCode);

      // 3. Get template UID (cached)
      const templateUid = await getTemplateUid(
        this.config.apiUrl,
        this.config.apiKey,
        this.config.customerId,
        templateName
      );

      // 4. Fetch template HTML from API
      const templateResponse = await axios.get(
        `${this.config.apiUrl}/templates/${templateUid}`,
        { headers: this.headers, timeout: 10000 }
      );

      const rawHtml: string =
        templateResponse.data?.data?.record?.content || "";

      if (!rawHtml) {
        throw new Error(`Empty template content for: ${templateName}`);
      }

      // 5. Extract subject from <title> tag
      const subject = extractSubjectFromHtml(rawHtml, templateName);

      // 6. Replace [VARIABLE] placeholders
      const fields = config.customFields || {};
      const renderedHtml = renderTemplate(rawHtml, fields);

      // 7. Encode body as base64 and send
      const bodyBase64 = Buffer.from(renderedHtml).toString("base64");

      const formData = new URLSearchParams();
      formData.append("email[to_email]", config.to);
      formData.append("email[to_name]", fields.FNAME || "");
      formData.append("email[from_email]", "noreply@sos-expat.com");
      formData.append("email[from_name]", "SOS Expat");
      formData.append("email[subject]", subject);
      formData.append("email[body]", bodyBase64);

      const response = await axios.post(
        `${this.config.apiUrl}/transactional-emails`,
        formData.toString(),
        {
          headers: {
            ...this.headers,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 15000,
        }
      );

      console.log(
        `✅ Transactional email sent: ${templateName} → ${config.to}`
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(
        `❌ Error sending transactional email (${config.template}):`,
        axiosError.response?.data || axiosError.message
      );
      throw error;
    }
  }

  /**
   * Unsubscribe a subscriber from MailWizz
   */
  async unsubscribeSubscriber(userId: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.config.apiUrl}/lists/${this.config.listUid}/subscribers/${userId}/unsubscribe`,
        {},
        { headers: this.headers }
      );

      console.log(`✅ Subscriber unsubscribed: ${userId}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(
        `❌ Error unsubscribing:`,
        axiosError.response?.data || axiosError.message
      );
      throw error;
    }
  }

  /**
   * Delete a subscriber from MailWizz
   */
  async deleteSubscriber(userId: string): Promise<any> {
    try {
      const response = await axios.delete(
        `${this.config.apiUrl}/lists/${this.config.listUid}/subscribers/${userId}`,
        { headers: this.headers }
      );

      console.log(`✅ Subscriber deleted: ${userId}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(
        `❌ Error deleting subscriber:`,
        axiosError.response?.data || axiosError.message
      );
      throw error;
    }
  }

  /**
   * Stop autoresponders for a subscriber
   */
  async stopAutoresponders(userId: string, reason?: string): Promise<any> {
    try {
      const formData = new URLSearchParams();
      formData.append("AUTORESPONDER_STATUS", "stopped");
      if (reason) {
        formData.append("AUTORESPONDER_STOP_REASON", reason);
      }

      const response = await axios.put(
        `${this.config.apiUrl}/lists/${this.config.listUid}/subscribers/${userId}`,
        formData.toString(),
        {
          headers: {
            ...this.headers,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      console.log(
        `✅ Autoresponders stopped for subscriber: ${userId}`,
        reason ? `(Reason: ${reason})` : ""
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(
        `❌ Error stopping autoresponders:`,
        axiosError.response?.data || axiosError.message
      );
      // Non-critical: don't re-throw
      return null;
    }
  }
}
