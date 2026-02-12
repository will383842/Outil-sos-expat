import type { FastifyInstance } from "fastify";

const OPENAPI_SPEC = {
  openapi: "3.0.3",
  info: {
    title: "Telegram Engine API",
    description: "Marketing automation platform for Telegram — campaigns, automations, drip sequences, and subscriber management.",
    version: "2.0.0",
    contact: { name: "SOS Expat", email: "tech@sos-expat.com" },
  },
  servers: [
    { url: "/api", description: "Current server" },
  ],
  tags: [
    { name: "Auth", description: "Authentication (JWT)" },
    { name: "Dashboard", description: "Dashboard KPIs and analytics" },
    { name: "Campaigns", description: "Campaign CRUD, send, pause, resume, duplicate, export" },
    { name: "Automations", description: "Drip campaign automations with enrollment tracking" },
    { name: "Subscribers", description: "Subscriber management and sync" },
    { name: "Templates", description: "Reusable notification templates" },
    { name: "Tags", description: "Subscriber tagging system" },
    { name: "Segments", description: "Saved audience segments" },
    { name: "Webhooks", description: "Event ingestion from SOS (API key auth)" },
    { name: "Health", description: "System health and queue monitoring" },
    { name: "Settings", description: "Application settings" },
    { name: "Logs", description: "Notification audit logs" },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
      },
    },
    schemas: {
      Campaign: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          type: { type: "string", enum: ["broadcast", "action_triggered", "scheduled"] },
          status: { type: "string", enum: ["draft", "scheduled", "sending", "paused", "completed", "cancelled"] },
          targetRoles: { type: "array", items: { type: "string" }, nullable: true },
          targetTags: { type: "array", items: { type: "integer" }, nullable: true },
          targetLanguages: { type: "array", items: { type: "string" }, nullable: true },
          targetCountries: { type: "array", items: { type: "string" }, nullable: true },
          scheduledAt: { type: "string", format: "date-time", nullable: true },
          targetCount: { type: "integer" },
          sentCount: { type: "integer" },
          failedCount: { type: "integer" },
          messages: { type: "array", items: { $ref: "#/components/schemas/CampaignMessage" } },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      CampaignMessage: {
        type: "object",
        properties: {
          id: { type: "integer" },
          language: { type: "string", description: "ISO 639-1 code: en, fr, es, de, pt, ru, zh, hi, ar" },
          content: { type: "string" },
          parseMode: { type: "string", enum: ["HTML", "MarkdownV2"] },
          mediaType: { type: "string", enum: ["photo", "document", "video", "audio"], nullable: true },
          mediaUrl: { type: "string", format: "uri", nullable: true },
          replyMarkup: { type: "array", items: { type: "array", items: { $ref: "#/components/schemas/InlineKeyboardButton" } }, nullable: true },
        },
      },
      InlineKeyboardButton: {
        type: "object",
        properties: {
          text: { type: "string" },
          url: { type: "string", format: "uri" },
          callback_data: { type: "string" },
        },
        required: ["text"],
      },
      Automation: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          triggerEvent: { type: "string" },
          conditions: { type: "object", nullable: true },
          isActive: { type: "boolean" },
          allowReenrollment: { type: "boolean" },
          steps: { type: "array", items: { $ref: "#/components/schemas/AutomationStep" } },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      AutomationStep: {
        type: "object",
        properties: {
          id: { type: "integer" },
          stepOrder: { type: "integer" },
          type: { type: "string", enum: ["send_message", "wait", "condition"] },
          config: {
            type: "object",
            description: "send_message: {messages: {en: '...', fr: '...'}, parseMode: 'HTML'} | wait: {delayMinutes: 1440} | condition: {field, operator, value}",
          },
        },
      },
      Subscriber: {
        type: "object",
        properties: {
          id: { type: "integer" },
          telegramChatId: { type: "string" },
          telegramUsername: { type: "string", nullable: true },
          firstName: { type: "string", nullable: true },
          lastName: { type: "string", nullable: true },
          role: { type: "string", enum: ["chatter", "influencer", "blogger", "groupAdmin"] },
          language: { type: "string" },
          country: { type: "string", nullable: true },
          status: { type: "string", enum: ["active", "blocked", "unsubscribed"] },
        },
      },
      Pagination: {
        type: "object",
        properties: {
          total: { type: "integer" },
          page: { type: "integer" },
          limit: { type: "integer" },
          totalPages: { type: "integer" },
        },
      },
      Error: {
        type: "object",
        properties: {
          statusCode: { type: "integer" },
          error: { type: "string" },
          message: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login with email/password",
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { email: { type: "string" }, password: { type: "string" } }, required: ["email", "password"] } } },
        },
        responses: {
          200: { description: "JWT token returned" },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/campaigns": {
      get: {
        tags: ["Campaigns"],
        summary: "List campaigns (paginated)",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "type", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
        ],
        responses: { 200: { description: "Paginated campaign list" } },
      },
      post: {
        tags: ["Campaigns"],
        summary: "Create a new campaign",
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, type: { type: "string" }, targetRoles: { type: "array", items: { type: "string" } }, targetLanguages: { type: "array", items: { type: "string" } }, messages: { type: "array", items: { $ref: "#/components/schemas/CampaignMessage" } } }, required: ["name", "messages"] } } },
        },
        responses: { 201: { description: "Campaign created" } },
      },
    },
    "/campaigns/{id}": {
      get: { tags: ["Campaigns"], summary: "Get campaign detail with delivery stats", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Campaign detail" }, 404: { description: "Not found" } } },
      put: { tags: ["Campaigns"], summary: "Update campaign (draft/paused only)", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Updated" } } },
      delete: { tags: ["Campaigns"], summary: "Delete campaign and its deliveries", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 204: { description: "Deleted" } } },
    },
    "/campaigns/{id}/send": { post: { tags: ["Campaigns"], summary: "Launch campaign sending", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Queued" }, 400: { description: "Invalid status" } } } },
    "/campaigns/{id}/pause": { post: { tags: ["Campaigns"], summary: "Pause a sending campaign", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Paused" } } } },
    "/campaigns/{id}/resume": { post: { tags: ["Campaigns"], summary: "Resume a paused campaign", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Resumed" } } } },
    "/campaigns/{id}/duplicate": { post: { tags: ["Campaigns"], summary: "Duplicate campaign as new draft", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 201: { description: "Duplicate created" } } } },
    "/campaigns/{id}/cancel": { post: { tags: ["Campaigns"], summary: "Cancel campaign", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Cancelled" } } } },
    "/campaigns/{id}/deliveries": { get: { tags: ["Campaigns"], summary: "List deliveries with pagination and status filter", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }, { name: "status", in: "query", schema: { type: "string" } }, { name: "page", in: "query", schema: { type: "integer" } }, { name: "limit", in: "query", schema: { type: "integer" } }], responses: { 200: { description: "Paginated deliveries" } } } },
    "/campaigns/{id}/export": { get: { tags: ["Campaigns"], summary: "Export deliveries as CSV", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "CSV file", content: { "text/csv": {} } } } } },
    "/campaigns/compare": { post: { tags: ["Campaigns"], summary: "Compare up to 5 campaigns side by side", security: [{ BearerAuth: [] }], requestBody: { content: { "application/json": { schema: { type: "object", properties: { campaignIds: { type: "array", items: { type: "integer" }, maxItems: 5 } } } } } }, responses: { 200: { description: "Comparison data" } } } },
    "/automations": {
      get: { tags: ["Automations"], summary: "List all automations with enrollment counts", security: [{ BearerAuth: [] }], responses: { 200: { description: "Automation list" } } },
      post: { tags: ["Automations"], summary: "Create automation with steps", security: [{ BearerAuth: [] }], responses: { 201: { description: "Created" } } },
    },
    "/automations/{id}": {
      get: { tags: ["Automations"], summary: "Automation detail with steps and enrollment count", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Automation detail" } } },
      put: { tags: ["Automations"], summary: "Update automation (name, steps, conditions, re-enrollment)", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Updated" } } },
      delete: { tags: ["Automations"], summary: "Delete automation", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 204: { description: "Deleted" } } },
    },
    "/automations/{id}/toggle": { post: { tags: ["Automations"], summary: "Toggle automation active/inactive", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Toggled" } } } },
    "/automations/{id}/enrollments": { get: { tags: ["Automations"], summary: "List enrollments with subscriber info", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }, { name: "status", in: "query", schema: { type: "string" } }, { name: "page", in: "query", schema: { type: "integer" } }], responses: { 200: { description: "Paginated enrollments" } } } },
    "/automations/{id}/stats": { get: { tags: ["Automations"], summary: "Enrollment statistics (active/completed/cancelled)", security: [{ BearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Stats" } } } },
    "/webhooks/event": {
      post: {
        tags: ["Webhooks"],
        summary: "Receive event from SOS (fire-and-forget)",
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  eventType: { type: "string", enum: ["welcome", "new_registration", "call_completed", "payment_received", "daily_report", "new_provider", "new_contact_message", "negative_review", "security_alert", "withdrawal_request"] },
                  sosUserId: { type: "string" },
                  payload: { type: "object" },
                  idempotencyKey: { type: "string", description: "Optional dedup key" },
                },
                required: ["eventType", "payload"],
              },
            },
          },
        },
        responses: {
          202: { description: "Event accepted and queued" },
          200: { description: "Duplicate event (already processed)" },
          400: { description: "Invalid event type or payload" },
          401: { description: "Invalid API key" },
        },
      },
    },
    "/health": { get: { tags: ["Health"], summary: "System health check (DB, Redis, queues)", responses: { 200: { description: "Healthy" }, 503: { description: "Degraded" } } } },
    "/health/queues": { get: { tags: ["Health"], summary: "Detailed queue job counts", security: [{ BearerAuth: [] }], responses: { 200: { description: "Queue stats" } } } },
    "/dashboard/stats": { get: { tags: ["Dashboard"], summary: "Dashboard KPIs (subscribers, campaigns, messages, automations)", security: [{ BearerAuth: [] }], responses: { 200: { description: "Dashboard data" } } } },
    "/dashboard/queue": { get: { tags: ["Dashboard"], summary: "Queue depth and hourly breakdown", security: [{ BearerAuth: [] }], responses: { 200: { description: "Queue data" } } } },
    "/dashboard/analytics": { get: { tags: ["Dashboard"], summary: "Enhanced analytics (delivery breakdowns, top campaigns, language stats)", security: [{ BearerAuth: [] }], responses: { 200: { description: "Analytics data" } } } },
    "/subscribers": { get: { tags: ["Subscribers"], summary: "List subscribers (paginated, filterable)", security: [{ BearerAuth: [] }], responses: { 200: { description: "Subscriber list" } } } },
    "/subscribers/sync": { post: { tags: ["Subscribers"], summary: "Sync subscribers from SOS Firestore", security: [{ BearerAuth: [] }], responses: { 200: { description: "Sync result" } } } },
    "/subscribers/stats": { get: { tags: ["Subscribers"], summary: "Subscriber breakdown by role/language/country/status", security: [{ BearerAuth: [] }], responses: { 200: { description: "Stats" } } } },
    "/tags": { get: { tags: ["Tags"], summary: "List all tags with subscriber counts", security: [{ BearerAuth: [] }], responses: { 200: { description: "Tag list" } } } },
    "/templates": { get: { tags: ["Templates"], summary: "List templates grouped by event type", security: [{ BearerAuth: [] }], responses: { 200: { description: "Template list" } } } },
    "/segments": { get: { tags: ["Segments"], summary: "List saved segments", security: [{ BearerAuth: [] }], responses: { 200: { description: "Segment list" } } } },
    "/logs": { get: { tags: ["Logs"], summary: "List notification logs (paginated)", security: [{ BearerAuth: [] }], responses: { 200: { description: "Log list" } } } },
    "/settings": { get: { tags: ["Settings"], summary: "Get all application settings", security: [{ BearerAuth: [] }], responses: { 200: { description: "Settings" } } } },
  },
};

export default async function openapiRoutes(
  app: FastifyInstance
): Promise<void> {
  // Serve OpenAPI spec as JSON
  app.get("/openapi.json", async (_request, reply) => {
    return reply.send(OPENAPI_SPEC);
  });

  // Serve a simple Swagger UI redirect
  app.get("/docs", async (_request, reply) => {
    return reply
      .type("text/html")
      .send(`<!DOCTYPE html>
<html>
<head>
  <title>Telegram Engine API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/openapi.json',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
    });
  </script>
</body>
</html>`);
  });
}
