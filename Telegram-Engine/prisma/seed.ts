import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create default admin user
  const passwordHash = await bcrypt.hash("admin123", 12);

  await prisma.user.upsert({
    where: { email: "admin@sos-expat.com" },
    create: {
      email: "admin@sos-expat.com",
      name: "Admin",
      role: "admin",
      passwordHash,
    },
    update: {},
  });

  // Create default tags
  const tags = [
    { name: "VIP", color: "#F59E0B" },
    { name: "New", color: "#10B981" },
    { name: "High Value", color: "#8B5CF6" },
    { name: "Inactive", color: "#6B7280" },
    { name: "Beta Tester", color: "#3B82F6" },
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      create: tag,
      update: {},
    });
  }

  // Create default notification templates (9 languages x key events)
  const events = [
    {
      eventType: "welcome",
      name: "Welcome Message",
      variables: ["firstName", "role"],
    },
    {
      eventType: "new_registration",
      name: "New Registration",
      variables: ["userName", "role", "date"],
    },
    {
      eventType: "call_completed",
      name: "Call Completed",
      variables: ["providerName", "clientName", "duration"],
    },
    {
      eventType: "payment_received",
      name: "Payment Received",
      variables: ["amount", "currency", "clientName"],
    },
    {
      eventType: "daily_report",
      name: "Daily Report",
      variables: ["totalCalls", "totalRevenue", "newUsers", "date"],
    },
  ];

  const languages = ["en", "fr", "es", "de", "pt", "ru", "zh", "hi", "ar"];

  for (const event of events) {
    for (const lang of languages) {
      await prisma.template.upsert({
        where: {
          eventType_language: {
            eventType: event.eventType,
            language: lang,
          },
        },
        create: {
          eventType: event.eventType,
          language: lang,
          name: `${event.name} (${lang.toUpperCase()})`,
          content: `[${lang.toUpperCase()}] Template for ${event.eventType} — edit me`,
          variables: event.variables,
          isActive: lang === "en" || lang === "fr",
        },
        update: {},
      });
    }
  }

  // Default settings
  const settings = [
    {
      key: "telegram_bot",
      value: { token: "", username: "", validated: false },
    },
    {
      key: "notifications",
      value: {
        new_registration: true,
        call_completed: true,
        payment_received: true,
        daily_report: true,
        new_provider: true,
        new_contact_message: true,
        negative_review: true,
        security_alert: true,
        withdrawal_request: true,
      },
    },
    {
      key: "rate_limits",
      value: {
        maxPerSecond: 30,
        maxPerMinute: 1500,
        maxPerDay: 50000,
      },
    },
  ];

  for (const setting of settings) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      create: { key: setting.key, value: setting.value },
      update: {},
    });
  }

  console.log("Seed complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
