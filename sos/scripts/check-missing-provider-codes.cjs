/**
 * Quick check: how many affiliates are missing affiliateCodeProvider
 */
const admin = require("firebase-admin");
const { applicationDefault } = require("firebase-admin/app");

admin.initializeApp({ credential: applicationDefault(), projectId: "sos-urgently-ac307" });
const db = admin.firestore();

async function check() {
  const collections = ["chatters", "influencers", "bloggers", "group_admins", "partners"];

  for (const col of collections) {
    const snap = await db.collection(col).get();
    let missing = 0;
    let total = 0;
    const missingList = [];

    for (const d of snap.docs) {
      total++;
      const data = d.data();
      const clientCode = col === "partners" ? data.affiliateCode : data.affiliateCodeClient;
      if (!data.affiliateCodeProvider && clientCode) {
        missing++;
        missingList.push({ id: d.id, name: data.firstName || data.name || "?", clientCode });
      }
    }

    console.log(`\n${col}: ${total} total, ${missing} missing affiliateCodeProvider`);
    if (missingList.length > 0) {
      missingList.forEach((m) => {
        console.log(`  ${m.id} | ${m.name} | ${m.clientCode} -> would get PROV-${m.clientCode}`);
      });
    }
  }
}

check().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
