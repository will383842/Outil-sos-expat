#!/usr/bin/env node
/**
 * manual-link-referral.cjs — Lier manuellement un filleul à un parrain
 *
 * Usage:
 *   node scripts/manual-link-referral.cjs <recruiterUid> <recruitedUid> [--dry-run]
 *
 * Exemple:
 *   node scripts/manual-link-referral.cjs nuqreU9mscZaAmsIFP64SL4czVD3 G4ztxYbLMIXp2I9fMN9UfZWvmy83 --dry-run
 *   node scripts/manual-link-referral.cjs nuqreU9mscZaAmsIFP64SL4czVD3 G4ztxYbLMIXp2I9fMN9UfZWvmy83
 *
 * Ce script :
 *   1. Met à jour chatters/{recruited}.recruitedBy/recruitedByCode/recruitedAt
 *   2. Met à jour users/{recruited}.referredByUserId/referredBy/referredAt
 *   3. Crée un document dans chatter_recruited_chatters
 *   4. Incrémente chatters/{recruiter}.totalRecruits
 */

const admin = require("firebase-admin");
const path = require("path");

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  : path.join(__dirname, "..", "..", "serviceAccount.json");

const serviceAccount = require(serviceAccountPath);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();
const { Timestamp, FieldValue } = admin.firestore;

async function main() {
  const [, , recruiterUid, recruitedUid, flag] = process.argv;
  const isDryRun = flag === "--dry-run";

  if (!recruiterUid || !recruitedUid) {
    console.error("Usage: node scripts/manual-link-referral.cjs <recruiterUid> <recruitedUid> [--dry-run]");
    process.exit(1);
  }

  console.log(isDryRun ? "\n🔍 MODE DRY-RUN — Aucune modification\n" : "\n⚡ MODE EXÉCUTION — Modifications en cours\n");

  // 1. Vérifier que les deux chatters existent
  const [recruiterDoc, recruitedDoc] = await Promise.all([
    db.collection("chatters").doc(recruiterUid).get(),
    db.collection("chatters").doc(recruitedUid).get(),
  ]);

  if (!recruiterDoc.exists) {
    console.error("❌ Recruteur non trouvé dans chatters:", recruiterUid);
    process.exit(1);
  }
  if (!recruitedDoc.exists) {
    console.error("❌ Recruté non trouvé dans chatters:", recruitedUid);
    process.exit(1);
  }

  const recruiter = recruiterDoc.data();
  const recruited = recruitedDoc.data();

  console.log(`Recruteur: ${recruiter.firstName} ${recruiter.lastName} (${recruiter.email})`);
  console.log(`  Code: ${recruiter.affiliateCode || recruiter.affiliateCodeRecruitment}`);
  console.log(`  totalRecruits actuel: ${recruiter.totalRecruits}`);
  console.log(`Recruté: ${recruited.firstName} ${recruited.lastName} (${recruited.email})`);
  console.log(`  recruitedBy actuel: ${recruited.recruitedBy || "null"}`);
  console.log(`  createdAt: ${recruited.createdAt?.toDate?.()?.toISOString()}`);

  // 2. Vérifier que le recruté n'a pas déjà un parrain
  if (recruited.recruitedBy) {
    console.log(`\n⚠️  Le recruté a DÉJÀ un parrain: ${recruited.recruitedBy}`);
    console.log("   Si vous voulez changer le parrain, modifiez ce script pour forcer l'override.");
    process.exit(1);
  }

  // 3. Préparer les données
  const now = Timestamp.now();
  const recruiterCode = recruiter.affiliateCode || recruiter.affiliateCodeRecruitment || recruiter.affiliateCodeClient;

  // Commission window: 6 months from recruited's registration date
  const registrationDate = recruited.createdAt?.toDate?.() || new Date();
  const windowEnd = new Date(registrationDate);
  windowEnd.setMonth(windowEnd.getMonth() + 6);

  console.log(`\n📋 Modifications prévues:`);
  console.log(`  chatters/${recruitedUid}.recruitedBy = "${recruiterUid}"`);
  console.log(`  chatters/${recruitedUid}.recruitedByCode = "${recruiterCode}"`);
  console.log(`  chatters/${recruitedUid}.recruitedAt = ${registrationDate.toISOString()}`);
  console.log(`  users/${recruitedUid}.referredByUserId = "${recruiterUid}"`);
  console.log(`  users/${recruitedUid}.referredBy = "${recruiterCode}"`);
  console.log(`  users/${recruitedUid}.referredAt = ${registrationDate.toISOString()}`);
  console.log(`  chatters/${recruiterUid}.totalRecruits += 1`);
  console.log(`  + nouveau doc dans chatter_recruited_chatters`);
  console.log(`    commissionWindowEnd = ${windowEnd.toISOString()}`);

  if (isDryRun) {
    console.log("\n✅ DRY-RUN terminé. Relancez sans --dry-run pour appliquer.");
    process.exit(0);
  }

  // 4. Exécuter dans une transaction
  const batch = db.batch();

  // Update chatters/{recruited}
  batch.update(db.collection("chatters").doc(recruitedUid), {
    recruitedBy: recruiterUid,
    recruitedByCode: recruiterCode,
    recruitedAt: Timestamp.fromDate(registrationDate),
    updatedAt: now,
  });

  // Update users/{recruited}
  batch.update(db.collection("users").doc(recruitedUid), {
    referredByUserId: recruiterUid,
    referredBy: recruiterCode,
    referredAt: Timestamp.fromDate(registrationDate),
    updatedAt: now,
  });

  // Increment recruiter's totalRecruits
  batch.update(db.collection("chatters").doc(recruiterUid), {
    totalRecruits: FieldValue.increment(1),
    updatedAt: now,
  });

  // Create recruitment tracking document
  const recruitTrackingRef = db.collection("chatter_recruited_chatters").doc();
  batch.set(recruitTrackingRef, {
    id: recruitTrackingRef.id,
    recruiterId: recruiterUid,
    recruitedId: recruitedUid,
    recruitedEmail: recruited.email,
    recruitedName: `${recruited.firstName} ${recruited.lastName}`.trim(),
    recruitmentCode: recruiterCode,
    recruitedAt: Timestamp.fromDate(registrationDate),
    commissionWindowEnd: Timestamp.fromDate(windowEnd),
    commissionPaid: false,
    commissionId: null,
    commissionPaidAt: null,
  });

  await batch.commit();

  console.log("\n✅ Liaison effectuée avec succès !");
  console.log(`   ${recruited.firstName} ${recruited.lastName} est maintenant filleul de ${recruiter.firstName} ${recruiter.lastName}`);
  console.log(`   Document de suivi créé: ${recruitTrackingRef.id}`);
  console.log(`   Fenêtre de commission: jusqu'au ${windowEnd.toLocaleDateString()}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Erreur:", err.message);
  process.exit(1);
});
