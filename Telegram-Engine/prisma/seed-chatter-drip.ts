import { Prisma, PrismaClient } from "@prisma/client";
import { CHATTER_DRIP_MESSAGES } from "./chatter-drip-data.js";

const prisma = new PrismaClient();

async function main() {
  const AUTOMATION_NAME = "Chatter Welcome Drip (60 messages)";

  // Check if automation already exists
  const existing = await prisma.automation.findFirst({
    where: { name: AUTOMATION_NAME },
  });

  if (existing) {
    console.log(`Automation "${AUTOMATION_NAME}" already exists (id=${existing.id}). Skipping.`);
    console.log("To re-create, delete it from the admin console first.");
    return;
  }

  // Build steps: alternating send_message + wait
  const steps: Prisma.AutomationStepCreateWithoutAutomationInput[] = [];
  let stepOrder = 0;

  for (let i = 0; i < CHATTER_DRIP_MESSAGES.length; i++) {
    const msg = CHATTER_DRIP_MESSAGES[i]!;

    // Add send_message step
    steps.push({
      stepOrder: stepOrder++,
      type: "send_message",
      config: {
        messages: msg.messages,
        parseMode: "HTML",
      } as unknown as Prisma.InputJsonValue,
    });

    // Add wait step (unless last message)
    if (i < CHATTER_DRIP_MESSAGES.length - 1) {
      const nextMsg = CHATTER_DRIP_MESSAGES[i + 1]!;
      const waitMinutes = (nextMsg.day - msg.day) * 1440; // days to minutes
      steps.push({
        stepOrder: stepOrder++,
        type: "wait",
        config: { delayMinutes: Math.max(waitMinutes, 60) } as Prisma.InputJsonValue,
      });
    }
  }

  // Create automation with all steps in a transaction
  const automation = await prisma.automation.create({
    data: {
      name: AUTOMATION_NAME,
      triggerEvent: "new_registration",
      conditions: { role: "chatter" },
      isActive: true,
      allowReenrollment: false,
      steps: {
        create: steps,
      },
    },
    include: { steps: true },
  });

  console.log(`Created automation "${automation.name}" (id=${automation.id})`);
  console.log(`  - ${CHATTER_DRIP_MESSAGES.length} messages`);
  console.log(`  - ${steps.length} total steps (messages + waits)`);
  console.log(`  - Spans ${CHATTER_DRIP_MESSAGES[CHATTER_DRIP_MESSAGES.length - 1]!.day} days`);
  console.log(`  - 9 languages per message`);
  console.log("\nAll messages are editable in the admin console → Automations → ${automation.name}");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
