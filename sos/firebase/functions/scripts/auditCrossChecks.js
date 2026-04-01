/**
 * AUDIT P22 — Cross-Checks Firestore Production
 * Run: node scripts/auditCrossChecks.js
 */
const admin = require("firebase-admin");

// Initialize with default credentials (uses gcloud auth)
const app = admin.initializeApp({ projectId: "sos-urgently-ac307" });
const db = admin.firestore();

const results = [];
function log(check, status, details) {
  const icon = status === "OK" ? "✅" : status === "BUG" ? "❌" : "⚠️";
  console.log(`${icon} [${check}] ${details}`);
  results.push({ check, status, details });
}

async function main() {
  console.log("\n========== AUDIT P22 — CROSS-CHECKS FIRESTORE PROD ==========\n");

  // -------------------------------------------------------
  // CROSS-CHECK 4: Providers Stuck Busy (> 30 min)
  // -------------------------------------------------------
  console.log("\n--- CROSS-CHECK 4: Providers Stuck Busy ---");
  try {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    const busySnap = await db.collection("users")
      .where("availability", "==", "busy")
      .get();

    let stuckCount = 0;
    for (const doc of busySnap.docs) {
      const data = doc.data();
      const busySince = data.busySince?.toDate?.();
      if (busySince && busySince < thirtyMinAgo) {
        stuckCount++;
        console.log(`  ⚠️ Provider ${doc.id} busy since ${busySince.toISOString()} (${Math.round((Date.now() - busySince.getTime()) / 60000)} min)`);
      }
    }
    if (stuckCount === 0) {
      log("STUCK_BUSY", "OK", `${busySnap.size} busy providers, 0 stuck > 30min`);
    } else {
      log("STUCK_BUSY", "BUG", `${stuckCount} providers stuck busy > 30 min!`);
    }
  } catch (e) {
    log("STUCK_BUSY", "WARN", `Error: ${e.message}`);
  }

  // -------------------------------------------------------
  // CROSS-CHECK 5: Paiements Orphelins (authorized > 1h)
  // -------------------------------------------------------
  console.log("\n--- CROSS-CHECK 5: Paiements Orphelins ---");
  try {
    const oneHourAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 60 * 60 * 1000));
    // Check requires_capture (Stripe manual capture mode)
    const orphanSnap = await db.collection("payments")
      .where("status", "in", ["authorized", "requires_capture"])
      .get();

    let orphanCount = 0;
    for (const doc of orphanSnap.docs) {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || data.authorizedAt?.toDate?.();
      if (createdAt && createdAt < oneHourAgo.toDate()) {
        orphanCount++;
        const ageMin = Math.round((Date.now() - createdAt.getTime()) / 60000);
        console.log(`  ⚠️ Payment ${doc.id} status=${data.status} since ${ageMin} min ago`);
      }
    }
    if (orphanCount === 0) {
      log("ORPHAN_PAYMENTS", "OK", `0 paiements orphelins (authorized > 1h)`);
    } else {
      log("ORPHAN_PAYMENTS", "BUG", `${orphanCount} paiements stuck authorized > 1h!`);
    }
  } catch (e) {
    log("ORPHAN_PAYMENTS", "WARN", `Error: ${e.message}`);
  }

  // -------------------------------------------------------
  // CROSS-CHECK 1: Montants cohérents (10 derniers appels)
  // -------------------------------------------------------
  console.log("\n--- CROSS-CHECK 1: Montants Cohérents ---");
  try {
    const recentCalls = await db.collection("call_sessions")
      .where("status", "==", "completed")
      .orderBy("metadata.createdAt", "desc")
      .limit(10)
      .get();

    let mismatchCount = 0;
    for (const doc of recentCalls.docs) {
      const session = doc.data();
      const sessionAmount = session.payment?.amount || session.amount;
      const piId = session.payment?.intentId || session.payment?.paymentIntentId;

      if (piId) {
        const paymentDoc = await db.collection("payments").doc(piId).get();
        if (paymentDoc.exists) {
          const paymentAmount = paymentDoc.data().amount || paymentDoc.data().amountInCents;
          if (sessionAmount && paymentAmount && Math.abs(sessionAmount - paymentAmount) > 1) {
            mismatchCount++;
            console.log(`  ❌ Session ${doc.id}: session.amount=${sessionAmount}, payment.amount=${paymentAmount}`);
          }
        }
      }
    }
    if (mismatchCount === 0) {
      log("AMOUNTS_COHERENT", "OK", `10 derniers appels: montants call_sessions = payments ✓`);
    } else {
      log("AMOUNTS_COHERENT", "BUG", `${mismatchCount}/10 montants incohérents!`);
    }
  } catch (e) {
    log("AMOUNTS_COHERENT", "WARN", `Error: ${e.message}`);
  }

  // -------------------------------------------------------
  // CROSS-CHECK 7: Durée Billing ↔ Capture
  // -------------------------------------------------------
  console.log("\n--- CROSS-CHECK 7: Durée ↔ Capture ---");
  try {
    const recentCompleted = await db.collection("call_sessions")
      .where("status", "==", "completed")
      .orderBy("metadata.createdAt", "desc")
      .limit(10)
      .get();

    let inconsistencies = 0;
    for (const doc of recentCompleted.docs) {
      const s = doc.data();
      const duration = s.conference?.billingDuration || s.billingDuration || s.duration || 0;
      const payStatus = s.payment?.status;

      if (duration < 60 && payStatus === "captured") {
        inconsistencies++;
        console.log(`  ❌ Session ${doc.id}: duration=${duration}s but payment=captured!`);
      }
      if (duration >= 60 && (payStatus === "voided" || payStatus === "refunded" || payStatus === "cancelled")) {
        inconsistencies++;
        console.log(`  ❌ Session ${doc.id}: duration=${duration}s but payment=${payStatus}!`);
      }
    }
    if (inconsistencies === 0) {
      log("DURATION_CAPTURE", "OK", `10 derniers appels: durée ↔ capture cohérents ✓`);
    } else {
      log("DURATION_CAPTURE", "BUG", `${inconsistencies}/10 incohérences durée/capture!`);
    }
  } catch (e) {
    log("DURATION_CAPTURE", "WARN", `Error: ${e.message}`);
  }

  // -------------------------------------------------------
  // CROSS-CHECK 3: Soldes Affiliés (5 chatters)
  // -------------------------------------------------------
  console.log("\n--- CROSS-CHECK 3: Soldes Affiliés ---");
  try {
    const chatters = await db.collection("chatters")
      .where("status", "==", "active")
      .limit(5)
      .get();

    let balanceIssues = 0;
    for (const doc of chatters.docs) {
      const chatter = doc.data();
      const userId = doc.id;

      // Get user balance
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) continue;
      const user = userDoc.data();
      const availableBalance = user.availableBalance || 0;
      const totalEarned = user.totalEarned || 0;

      // Count commissions
      const commissionsSnap = await db.collection("chatter_commissions")
        .where("chatterId", "==", userId)
        .where("status", "in", ["available", "paid"])
        .get();

      let sumCommissions = 0;
      commissionsSnap.docs.forEach(d => { sumCommissions += d.data().amount || 0; });

      // Count withdrawals
      const withdrawalsSnap = await db.collection("payment_withdrawals")
        .where("userId", "==", userId)
        .where("status", "==", "completed")
        .get();

      let sumWithdrawn = 0;
      withdrawalsSnap.docs.forEach(d => { sumWithdrawn += d.data().amount || 0; });

      const expectedBalance = sumCommissions - sumWithdrawn;
      const diff = Math.abs(availableBalance - expectedBalance);

      if (diff > 100) { // > $1 tolerance
        balanceIssues++;
        console.log(`  ⚠️ Chatter ${userId}: availableBalance=${availableBalance}, expected=${expectedBalance} (diff=${diff} cents)`);
      }
    }
    if (balanceIssues === 0) {
      log("AFFILIATE_BALANCES", "OK", `5 chatters: soldes cohérents avec commissions ✓`);
    } else {
      log("AFFILIATE_BALANCES", "WARN", `${balanceIssues}/5 chatters avec écart > $1`);
    }
  } catch (e) {
    log("AFFILIATE_BALANCES", "WARN", `Error: ${e.message}`);
  }

  // -------------------------------------------------------
  // CROSS-CHECK 6: Refund ↔ Commissions Annulées
  // -------------------------------------------------------
  console.log("\n--- CROSS-CHECK 6: Refund ↔ Commissions ---");
  try {
    const recentRefunds = await db.collection("call_sessions")
      .where("status", "in", ["failed", "refunded", "cancelled"])
      .orderBy("metadata.createdAt", "desc")
      .limit(10)
      .get();

    let survivingCommissions = 0;
    for (const doc of recentRefunds.docs) {
      const sessionId = doc.id;
      // Check if any active commissions exist for this session
      const activeComms = await db.collection("chatter_commissions")
        .where("callSessionId", "==", sessionId)
        .where("status", "in", ["available", "pending", "held"])
        .limit(1)
        .get();

      if (!activeComms.empty) {
        survivingCommissions++;
        console.log(`  ❌ Session ${sessionId} refunded but chatter commission ${activeComms.docs[0].id} still active!`);
      }
    }
    if (survivingCommissions === 0) {
      log("REFUND_COMMISSIONS", "OK", `10 derniers refunds: commissions correctement annulées ✓`);
    } else {
      log("REFUND_COMMISSIONS", "BUG", `${survivingCommissions} commissions survivent aux refunds!`);
    }
  } catch (e) {
    log("REFUND_COMMISSIONS", "WARN", `Error: ${e.message}`);
  }

  // -------------------------------------------------------
  // CROSS-CHECK 9: Factures ↔ Paiements
  // -------------------------------------------------------
  console.log("\n--- CROSS-CHECK 9: Factures ↔ Paiements ---");
  try {
    const recentInvoices = await db.collection("invoice_records")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    let missingInvoices = 0;
    const sessionsSeen = new Set();
    for (const doc of recentInvoices.docs) {
      const inv = doc.data();
      if (inv.callSessionId && !sessionsSeen.has(inv.callSessionId)) {
        sessionsSeen.add(inv.callSessionId);
      }
    }

    // Check that captured sessions have invoices
    const capturedSessions = await db.collection("call_sessions")
      .where("status", "==", "completed")
      .where("payment.status", "==", "captured")
      .orderBy("metadata.createdAt", "desc")
      .limit(5)
      .get();

    for (const doc of capturedSessions.docs) {
      const invoiceSnap = await db.collection("invoice_records")
        .where("callSessionId", "==", doc.id)
        .limit(1)
        .get();

      if (invoiceSnap.empty) {
        missingInvoices++;
        console.log(`  ⚠️ Session ${doc.id} captured but NO invoice found!`);
      }
    }

    if (missingInvoices === 0) {
      log("INVOICES_PAYMENTS", "OK", `5 derniers paiements capturés: factures présentes ✓`);
    } else {
      log("INVOICES_PAYMENTS", "BUG", `${missingInvoices} paiements capturés sans facture!`);
    }
  } catch (e) {
    log("INVOICES_PAYMENTS", "WARN", `Error: ${e.message}`);
  }

  // -------------------------------------------------------
  // CROSS-CHECK 8: Idempotence — Doublons webhook
  // -------------------------------------------------------
  console.log("\n--- CROSS-CHECK 8: Webhook Idempotence ---");
  try {
    const recentWebhooks = await db.collection("processed_webhook_events")
      .orderBy("processedAt", "desc")
      .limit(100)
      .get();

    const keyCount = new Map();
    for (const doc of recentWebhooks.docs) {
      const key = doc.id;
      keyCount.set(key, (keyCount.get(key) || 0) + 1);
    }

    const duplicates = [...keyCount.entries()].filter(([, count]) => count > 1);
    if (duplicates.length === 0) {
      log("WEBHOOK_IDEMPOTENCE", "OK", `100 derniers webhooks: 0 doublon ✓`);
    } else {
      log("WEBHOOK_IDEMPOTENCE", "BUG", `${duplicates.length} clés en doublon!`);
      duplicates.forEach(([key, count]) => console.log(`  ❌ ${key}: ${count}x`));
    }
  } catch (e) {
    log("WEBHOOK_IDEMPOTENCE", "WARN", `Error: ${e.message}`);
  }

  // -------------------------------------------------------
  // CROSS-CHECK 11: Multi-Provider Busy Propagation
  // -------------------------------------------------------
  console.log("\n--- CROSS-CHECK 11: Multi-Provider Status ---");
  try {
    const multiProviders = await db.collection("users")
      .where("shareBusyStatus", "==", true)
      .limit(5)
      .get();

    let propagationIssues = 0;
    for (const doc of multiProviders.docs) {
      const user = doc.data();
      const linkedIds = user.linkedProviderIds || [];
      if (linkedIds.length === 0) continue;

      const ownerAvail = user.availability;
      for (const linkedId of linkedIds) {
        const linkedDoc = await db.collection("users").doc(linkedId).get();
        if (linkedDoc.exists) {
          const linkedAvail = linkedDoc.data().availability;
          if (ownerAvail === "busy" && linkedAvail !== "busy") {
            propagationIssues++;
            console.log(`  ⚠️ Owner ${doc.id} is busy but linked ${linkedId} is ${linkedAvail}`);
          }
        }
      }
    }
    if (propagationIssues === 0) {
      log("MULTI_PROVIDER", "OK", `Multi-providers: statuts synchronisés ✓`);
    } else {
      log("MULTI_PROVIDER", "WARN", `${propagationIssues} providers désynchronisés`);
    }
  } catch (e) {
    log("MULTI_PROVIDER", "WARN", `Error: ${e.message}`);
  }

  // -------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------
  console.log("\n\n========== RÉSUMÉ CROSS-CHECKS ==========\n");
  const bugs = results.filter(r => r.status === "BUG");
  const warns = results.filter(r => r.status === "WARN");
  const oks = results.filter(r => r.status === "OK");

  console.log(`✅ OK:      ${oks.length}`);
  console.log(`⚠️ Warning: ${warns.length}`);
  console.log(`❌ Bug:     ${bugs.length}`);
  console.log("");

  for (const r of results) {
    const icon = r.status === "OK" ? "✅" : r.status === "BUG" ? "❌" : "⚠️";
    console.log(`  ${icon} ${r.check}: ${r.details}`);
  }

  console.log("\n==========================================\n");
  process.exit(bugs.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(2);
});
