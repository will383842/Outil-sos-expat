/**
 * Script de diagnostic pour comprendre pourquoi les conversations
 * n'apparaissent pas dans le dashboard de l'Outil IA
 *
 * Usage: node diagnoseConversations.js
 */

const admin = require("firebase-admin");

// Initialiser Firebase Admin avec Application Default Credentials
admin.initializeApp({
  projectId: "outils-sos-expat",
});

const db = admin.firestore();

async function diagnose() {
  console.log("=".repeat(80));
  console.log("DIAGNOSTIC OUTIL IA - Conversations et Providers");
  console.log("=".repeat(80));
  console.log();

  // 1. Lister tous les providers
  console.log("1. PROVIDERS dans Outil IA");
  console.log("-".repeat(40));
  const providersSnap = await db.collection("providers").get();
  console.log(`Total providers: ${providersSnap.size}`);

  const providers = [];
  providersSnap.forEach(doc => {
    const data = doc.data();
    providers.push({
      id: doc.id,
      name: data.name,
      email: data.email,
      type: data.type,
      active: data.active,
      sosProfileId: data.sosProfileId,
    });
    console.log(`  - ID: ${doc.id}`);
    console.log(`    Name: ${data.name}`);
    console.log(`    Email: ${data.email}`);
    console.log(`    Type: ${data.type}`);
    console.log(`    Active: ${data.active}`);
    console.log(`    sosProfileId: ${data.sosProfileId || "N/A"}`);
    console.log();
  });

  // 2. Lister les bookings récents
  console.log("\n2. BOOKINGS récents (10 derniers)");
  console.log("-".repeat(40));
  const bookingsSnap = await db.collection("bookings")
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();

  console.log(`Total bookings: ${bookingsSnap.size}`);

  const bookings = [];
  bookingsSnap.forEach(doc => {
    const data = doc.data();
    bookings.push({
      id: doc.id,
      providerId: data.providerId,
      clientName: data.clientName,
      status: data.status,
      aiProcessed: data.aiProcessed,
      conversationId: data.conversationId,
    });
    console.log(`  - Booking ID: ${doc.id}`);
    console.log(`    Provider ID: ${data.providerId || "NULL"}`);
    console.log(`    Client: ${data.clientName}`);
    console.log(`    Status: ${data.status}`);
    console.log(`    AI Processed: ${data.aiProcessed}`);
    console.log(`    Conversation ID: ${data.conversationId || "NONE"}`);
    console.log(`    Created: ${data.createdAt?.toDate?.() || data.createdAt}`);
    console.log();
  });

  // 3. Lister les conversations
  console.log("\n3. CONVERSATIONS (10 dernières)");
  console.log("-".repeat(40));
  const conversationsSnap = await db.collection("conversations")
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();

  console.log(`Total conversations: ${conversationsSnap.size}`);

  conversationsSnap.forEach(doc => {
    const data = doc.data();
    console.log(`  - Conversation ID: ${doc.id}`);
    console.log(`    Provider ID: ${data.providerId || "NULL"}`);
    console.log(`    Booking ID: ${data.bookingId || "NULL"}`);
    console.log(`    Status: ${data.status}`);
    console.log(`    Message Count: ${data.messageCount || 0}`);
    console.log(`    Created: ${data.createdAt?.toDate?.() || data.createdAt}`);
    console.log();
  });

  // 4. Vérifier le mapping
  console.log("\n4. ANALYSE DU MAPPING");
  console.log("-".repeat(40));

  // Pour chaque booking récent, vérifier si le providerId existe
  for (const booking of bookings) {
    if (!booking.providerId) {
      console.log(`❌ Booking ${booking.id}: providerId est NULL`);
      continue;
    }

    const providerExists = providers.some(p => p.id === booking.providerId);
    if (providerExists) {
      console.log(`✅ Booking ${booking.id}: providerId ${booking.providerId} existe`);
    } else {
      console.log(`❌ Booking ${booking.id}: providerId ${booking.providerId} N'EXISTE PAS dans providers!`);
      console.log(`   -> Le provider n'a probablement pas été synchronisé depuis SOS`);
    }

    if (booking.conversationId) {
      const convSnap = await db.collection("conversations").doc(booking.conversationId).get();
      if (convSnap.exists) {
        const convData = convSnap.data();
        console.log(`   Conversation ${booking.conversationId}:`);
        console.log(`     - providerId dans conversation: ${convData.providerId}`);
        console.log(`     - Match avec booking: ${convData.providerId === booking.providerId ? "✅" : "❌"}`);
      }
    }
  }

  // 5. Lister les users
  console.log("\n5. USERS dans Outil IA (pour vérifier linkedProviderIds)");
  console.log("-".repeat(40));
  const usersSnap = await db.collection("users").limit(10).get();

  usersSnap.forEach(doc => {
    const data = doc.data();
    console.log(`  - User ID: ${doc.id}`);
    console.log(`    Email: ${data.email}`);
    console.log(`    Role: ${data.role}`);
    console.log(`    linkedProviderIds: ${JSON.stringify(data.linkedProviderIds || [])}`);
    console.log(`    activeProviderId: ${data.activeProviderId}`);
    console.log();
  });

  console.log("\n" + "=".repeat(80));
  console.log("FIN DU DIAGNOSTIC");
  console.log("=".repeat(80));
}

diagnose().then(() => process.exit(0)).catch(err => {
  console.error("Erreur:", err);
  process.exit(1);
});
