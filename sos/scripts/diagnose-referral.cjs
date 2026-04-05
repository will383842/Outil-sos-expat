#!/usr/bin/env node
/**
 * diagnose-referral.cjs — Diagnostic d'un cas de recrutement affilié
 *
 * Usage:
 *   node scripts/diagnose-referral.cjs <recruiter_code_or_uid> <recruited_code_or_uid>
 *
 * Exemple:
 *   node scripts/diagnose-referral.cjs nafysarr071 znacer99
 *
 * Vérifie :
 *   1. Quel rôle a le recruteur ? (chatter, influencer, blogger, groupAdmin)
 *   2. Le recruté a-t-il recruitedBy dans sa collection de rôle ?
 *   3. users/{recruté}.referredByUserId est-il défini ?
 *   4. Le code affilié du recruteur est-il valide et résolu ?
 */

const admin = require("firebase-admin");
const path = require("path");

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  || path.join(__dirname, "service-account.json");

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch {
  // Try default credentials
  admin.initializeApp();
}

const db = admin.firestore();

const ROLE_COLLECTIONS = ["chatters", "influencers", "bloggers", "group_admins"];
const RECRUITED_COLLECTIONS = [
  "chatter_recruited_chatters",
  "influencer_recruited_providers",  // or influencer_referrals
  "blogger_recruited_providers",
  "group_admin_recruited_admins",
];

async function findUserByCodeOrUid(codeOrUid) {
  const result = {
    uid: null,
    role: null,
    collection: null,
    doc: null,
    affiliateCode: null,
    recruitedBy: null,
    referredByUserId: null, // from users collection
    usersDoc: null,
  };

  // 1. Try direct UID lookup in users
  const userDoc = await db.collection("users").doc(codeOrUid).get();
  if (userDoc.exists) {
    result.uid = codeOrUid;
    result.usersDoc = userDoc.data();
    result.referredByUserId = userDoc.data()?.referredByUserId || null;
  }

  // 2. Search by affiliate code in all role collections
  for (const col of ROLE_COLLECTIONS) {
    // Search by affiliateCode
    let q = await db.collection(col)
      .where("affiliateCode", "==", codeOrUid.toUpperCase())
      .limit(1).get();

    if (q.empty) {
      q = await db.collection(col)
        .where("affiliateCodeClient", "==", codeOrUid.toUpperCase())
        .limit(1).get();
    }

    if (q.empty) {
      q = await db.collection(col)
        .where("affiliateCodeRecruitment", "==", codeOrUid.toUpperCase())
        .limit(1).get();
    }

    // Also search by email-like pattern or name
    if (q.empty) {
      q = await db.collection(col)
        .where("email", "==", codeOrUid.toLowerCase())
        .limit(1).get();
    }

    if (!q.empty) {
      const doc = q.docs[0];
      result.uid = doc.id;
      result.role = col.replace(/s$/, "").replace("group_admin", "groupAdmin");
      result.collection = col;
      result.doc = doc.data();
      result.affiliateCode = doc.data()?.affiliateCode || doc.data()?.affiliateCodeClient;
      result.recruitedBy = doc.data()?.recruitedBy || null;
      break;
    }

    // Try direct UID lookup in role collection
    if (!result.role) {
      const directDoc = await db.collection(col).doc(codeOrUid).get();
      if (directDoc.exists) {
        result.uid = codeOrUid;
        result.role = col.replace(/s$/, "").replace("group_admin", "groupAdmin");
        result.collection = col;
        result.doc = directDoc.data();
        result.affiliateCode = directDoc.data()?.affiliateCode || directDoc.data()?.affiliateCodeClient;
        result.recruitedBy = directDoc.data()?.recruitedBy || null;
        break;
      }
    }
  }

  // 3. If we found a UID but no users doc yet, fetch it
  if (result.uid && !result.usersDoc) {
    const uDoc = await db.collection("users").doc(result.uid).get();
    if (uDoc.exists) {
      result.usersDoc = uDoc.data();
      result.referredByUserId = uDoc.data()?.referredByUserId || null;
    }
  }

  // 4. Search unified_affiliate_codes collection
  if (!result.uid) {
    const unifiedQ = await db.collection("unified_affiliate_codes")
      .where("code", "==", codeOrUid.toUpperCase())
      .limit(1).get();
    if (!unifiedQ.empty) {
      const uniDoc = unifiedQ.docs[0].data();
      result.uid = uniDoc.userId;
      result.affiliateCode = uniDoc.code;
      console.log(`  → Code trouvé dans unified_affiliate_codes: userId=${uniDoc.userId}, role=${uniDoc.role}`);
    }
  }

  return result;
}

async function findRecruitmentRecord(recruiterUid, recruitedUid) {
  const records = [];

  for (const col of RECRUITED_COLLECTIONS) {
    // Try recruiterId field
    let q = await db.collection(col)
      .where("recruiterId", "==", recruiterUid)
      .where("recruitedId", "==", recruitedUid)
      .limit(1).get();

    if (q.empty) {
      // Try alternative field names
      q = await db.collection(col)
        .where("recruiterId", "==", recruiterUid)
        .where("recruitedEmail", ">=", "")
        .limit(20).get();

      // Filter manually for recruitedId
      q = { docs: q.docs.filter(d => d.data().recruitedId === recruitedUid), empty: false };
      if (q.docs.length === 0) q.empty = true;
    }

    if (!q.empty) {
      records.push({
        collection: col,
        data: q.docs[0].data(),
      });
    }
  }

  return records;
}

async function main() {
  const [, , recruiterInput, recruitedInput] = process.argv;

  if (!recruiterInput || !recruitedInput) {
    console.error("Usage: node scripts/diagnose-referral.cjs <recruiter_code_or_uid> <recruited_code_or_uid>");
    process.exit(1);
  }

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  DIAGNOSTIC RECRUTEMENT AFFILIÉ");
  console.log("═══════════════════════════════════════════════════════════\n");

  // 1. Find recruiter
  console.log(`🔍 Recherche du RECRUTEUR: "${recruiterInput}"...`);
  const recruiter = await findUserByCodeOrUid(recruiterInput);

  if (!recruiter.uid) {
    console.log("  ❌ RECRUTEUR NON TROUVÉ dans aucune collection");
    console.log("     Vérifié: chatters, influencers, bloggers, group_admins, users, unified_affiliate_codes\n");
  } else {
    console.log(`  ✅ UID: ${recruiter.uid}`);
    console.log(`  📋 Rôle: ${recruiter.role || "AUCUN rôle affilié"}`);
    console.log(`  📂 Collection: ${recruiter.collection || "N/A"}`);
    console.log(`  🔗 Code affilié: ${recruiter.affiliateCode || "AUCUN"}`);
    console.log(`  📧 Email: ${recruiter.doc?.email || recruiter.usersDoc?.email || "N/A"}`);
    console.log(`  👤 Nom: ${recruiter.doc?.firstName || ""} ${recruiter.doc?.lastName || ""}`);
    console.log(`  📊 Status: ${recruiter.doc?.status || "N/A"}`);
    console.log(`  🏷️  users.role: ${recruiter.usersDoc?.role || "N/A"}`);
    console.log(`  🔗 users.referredByUserId: ${recruiter.usersDoc?.referredByUserId || "NON DÉFINI"}`);
  }

  console.log("");

  // 2. Find recruited
  console.log(`🔍 Recherche du RECRUTÉ: "${recruitedInput}"...`);
  const recruited = await findUserByCodeOrUid(recruitedInput);

  if (!recruited.uid) {
    console.log("  ❌ RECRUTÉ NON TROUVÉ dans aucune collection\n");
  } else {
    console.log(`  ✅ UID: ${recruited.uid}`);
    console.log(`  📋 Rôle: ${recruited.role || "AUCUN rôle affilié"}`);
    console.log(`  📂 Collection: ${recruited.collection || "N/A"}`);
    console.log(`  🔗 Code affilié: ${recruited.affiliateCode || "AUCUN"}`);
    console.log(`  📧 Email: ${recruited.doc?.email || recruited.usersDoc?.email || "N/A"}`);
    console.log(`  👤 Nom: ${recruited.doc?.firstName || ""} ${recruited.doc?.lastName || ""}`);
    console.log(`  📊 Status: ${recruited.doc?.status || "N/A"}`);

    console.log("\n  --- Champs de tracking recrutement ---");
    console.log(`  🎯 ${recruited.collection}.recruitedBy: ${recruited.recruitedBy || "❌ NON DÉFINI"}`);
    console.log(`  🎯 ${recruited.collection}.recruitedByCode: ${recruited.doc?.recruitedByCode || "❌ NON DÉFINI"}`);
    console.log(`  🎯 ${recruited.collection}.recruitedAt: ${recruited.doc?.recruitedAt ? (recruited.doc.recruitedAt.toDate ? recruited.doc.recruitedAt.toDate().toISOString() : recruited.doc.recruitedAt) : "❌ NON DÉFINI"}`);
    console.log(`  🎯 users.referredByUserId: ${recruited.referredByUserId || "❌ NON DÉFINI (Bug #1 — besoin migration)"}`);
    console.log(`  🎯 users.referredBy: ${recruited.usersDoc?.referredBy || "❌ NON DÉFINI"}`);
    console.log(`  🎯 users.referredAt: ${recruited.usersDoc?.referredAt ? (recruited.usersDoc.referredAt.toDate ? recruited.usersDoc.referredAt.toDate().toISOString() : recruited.usersDoc.referredAt) : "❌ NON DÉFINI"}`);
  }

  console.log("");

  // 3. Check recruitment records
  if (recruiter.uid && recruited.uid) {
    console.log("🔍 Recherche d'un enregistrement de recrutement...");
    const records = await findRecruitmentRecord(recruiter.uid, recruited.uid);

    if (records.length === 0) {
      console.log("  ❌ AUCUN enregistrement de recrutement trouvé");
      console.log("     Vérifié: " + RECRUITED_COLLECTIONS.join(", "));
    } else {
      for (const r of records) {
        console.log(`  ✅ Trouvé dans: ${r.collection}`);
        console.log(`     recruiterId: ${r.data.recruiterId}`);
        console.log(`     recruitedId: ${r.data.recruitedId}`);
        console.log(`     recruitedAt: ${r.data.recruitedAt?.toDate?.()?.toISOString() || r.data.recruitedAt}`);
        console.log(`     commissionPaid: ${r.data.commissionPaid ?? r.data.activationBonusPaid ?? "N/A"}`);
      }
    }

    // 4. Cross-check: does recruitedBy match recruiter UID?
    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("  DIAGNOSTIC FINAL");
    console.log("═══════════════════════════════════════════════════════════\n");

    const issues = [];

    if (!recruited.recruitedBy) {
      issues.push(`❌ Bug #1: ${recruited.collection}.recruitedBy n'est PAS défini → Le recrutement n'a pas été enregistré côté rôle`);
    } else if (recruited.recruitedBy !== recruiter.uid) {
      issues.push(`⚠️  ${recruited.collection}.recruitedBy = "${recruited.recruitedBy}" mais recruiter UID = "${recruiter.uid}" → Mismatch !`);
    } else {
      console.log(`✅ ${recruited.collection}.recruitedBy pointe correctement vers ${recruiter.uid}`);
    }

    if (!recruited.referredByUserId) {
      issues.push(`❌ Bug #1: users.referredByUserId n'est PAS défini → Le fix n'a pas été déployé quand l'inscription a eu lieu. Exécutez le script de migration.`);
    } else if (recruited.referredByUserId !== recruiter.uid) {
      issues.push(`⚠️  users.referredByUserId = "${recruited.referredByUserId}" mais recruiter UID = "${recruiter.uid}" → Mismatch !`);
    } else {
      console.log(`✅ users.referredByUserId pointe correctement vers ${recruiter.uid}`);
    }

    if (recruiter.role && recruited.role && recruiter.role !== recruited.role) {
      issues.push(`⚠️  Recrutement cross-rôle: recruteur=${recruiter.role}, recruté=${recruited.role}. Le dashboard du recruté affichera le parrain si le fallback cross-collection est implémenté.`);
    }

    if (!recruiter.role) {
      issues.push(`❌ Bug #3: Le recruteur n'a AUCUN rôle affilié (pas dans chatters/influencers/bloggers/group_admins). Son code ne sera pas résolu correctement.`);
    }

    if (records.length === 0 && recruited.recruitedBy) {
      issues.push(`⚠️  recruitedBy est défini mais aucun document de suivi trouvé dans les collections *_recruited_*. Les commissions de recrutement ne seront pas calculées.`);
    }

    if (issues.length === 0) {
      console.log("\n✅ TOUT EST OK — Le tracking est correctement configuré.");
    } else {
      console.log("\n📋 PROBLÈMES DÉTECTÉS:");
      for (const issue of issues) {
        console.log(`   ${issue}`);
      }
    }

    // 5. Suggest fix
    if (!recruited.referredByUserId && recruited.recruitedBy) {
      console.log("\n🔧 FIX SUGGÉRÉ:");
      console.log(`   Exécutez: node scripts/migrate-sync-referredByUserId.cjs`);
      console.log(`   Ou manuellement dans la console Firebase:`);
      console.log(`   db.collection("users").doc("${recruited.uid}").update({`);
      console.log(`     referredByUserId: "${recruited.recruitedBy}",`);
      console.log(`     referredBy: "${recruited.doc?.recruitedByCode || "CODE"}",`);
      console.log(`     referredAt: admin.firestore.Timestamp.now()`);
      console.log(`   });`);
    }
  }

  console.log("\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("Erreur:", err.message);
  process.exit(1);
});
