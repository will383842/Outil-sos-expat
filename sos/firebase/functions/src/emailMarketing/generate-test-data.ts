/**
 * Helper script to generate test data for emulator testing
 * 
 * Usage: npx ts-node generate-test-data.ts
 * 
 * This script creates test documents in Firestore emulator
 * for testing email marketing functions
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin (will use emulator if running)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT || "sos-expat-prod",
  });
}

const db = admin.firestore();

async function generateTestData() {
  console.log("🧪 Generating test data for email marketing functions...\n");

  try {
    // Test User 1: Client
    console.log("1. Creating test client user...");
    const clientId = "test-client-123";
    await db.collection("users").doc(clientId).set({
      email: "test.client@example.com",
      firstName: "Test",
      lastName: "Client",
      role: "client",
      language: "en",
      preferredLanguage: "en",
      country: "US",
      currentCountry: "US",
      isActive: true,
      isVerified: true,
      createdAt: admin.firestore.Timestamp.now(),
      lastLoginAt: null,
      totalCalls: 0,
      totalEarnings: 0,
      profileCompleted: false,
    });
    console.log(`   ✅ Created client: ${clientId}\n`);

    // Test User 2: Provider (Lawyer)
    console.log("2. Creating test provider (lawyer)...");
    const providerId = "test-provider-456";
    await db.collection("users").doc(providerId).set({
      email: "test.provider@example.com",
      firstName: "Test",
      lastName: "Provider",
      role: "lawyer",
      language: "fr",
      preferredLanguage: "fr",
      country: "FR",
      isActive: true,
      isOnline: false,
      kycStatus: "pending",
      profileCompleted: false,
      totalCalls: 0,
      totalEarnings: 0,
      createdAt: admin.firestore.Timestamp.now(),
    });
    console.log(`   ✅ Created provider: ${providerId}\n`);

    // Test Call (for call completion test)
    console.log("3. Creating test call document...");
    const callId = "test-call-789";
    await db.collection("calls").doc(callId).set({
      status: "in_progress",
      clientId: clientId,
      providerId: providerId,
      clientName: "Test Client",
      providerName: "Test Provider",
      serviceType: "lawyer_call",
      createdAt: admin.firestore.Timestamp.now(),
      price: 50.00,
    });
    console.log(`   ✅ Created call: ${callId}`);
    console.log(`   💡 Update status to "completed" to trigger handleCallCompleted\n`);

    // Test Review (for review submission test)
    console.log("4. Creating test review document...");
    const reviewId = "test-review-101";
    await db.collection("reviews").doc(reviewId).set({
      rating: 5,
      clientId: clientId,
      providerId: providerId,
      comment: "Excellent service!",
      callId: callId,
      createdAt: admin.firestore.Timestamp.now(),
    });
    console.log(`   ✅ Created review: ${reviewId}`);
    console.log(`   💡 onCreate will trigger handleReviewSubmitted\n`);

    // Test Payment (for payment received test)
    console.log("5. Creating test payment document...");
    const paymentId = "test-payment-202";
    await db.collection("payments").doc(paymentId).set({
      status: "succeeded",
      userId: clientId,
      clientId: clientId,
      amount: 50.00,
      currency: "EUR",
      createdAt: admin.firestore.Timestamp.now(),
    });
    console.log(`   ✅ Created payment: ${paymentId}`);
    console.log(`   💡 onCreate will trigger handlePaymentReceived\n`);

    console.log("✅ All test data generated successfully!\n");
    console.log("📋 Test Documents Created:");
    console.log(`   - User (Client): ${clientId}`);
    console.log(`   - User (Provider): ${providerId}`);
    console.log(`   - Call: ${callId}`);
    console.log(`   - Review: ${reviewId}`);
    console.log(`   - Payment: ${paymentId}\n`);

    console.log("🧪 Next Steps:");
    console.log("   1. Check function logs for automatic triggers");
    console.log("   2. Update call status to 'completed' to test call completion");
    console.log("   3. Create a new review to test review submission");
    console.log("   4. Check MailWizz admin panel for subscribers and emails");
    console.log("   5. Check analytics_events collection for GA4 events");

  } catch (error: any) {
    console.error("❌ Error generating test data:", error.message);
    console.error("   Make sure Firestore emulator is running:");
    console.error("   firebase emulators:start --only firestore");
    process.exit(1);
  }
}

// Run generator
generateTestData()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });


