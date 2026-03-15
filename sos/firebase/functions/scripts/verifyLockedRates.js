const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp({ projectId: "sos-urgently-ac307" });
const db = admin.firestore();

async function verify() {
  console.log("=== VERIFICATION lockedRates $10/$10 ===\n");

  const collections = [
    { name: "chatters", label: "Chatter" },
    { name: "group_admins", label: "GroupAdmin" },
    { name: "influencers", label: "Influencer" },
    { name: "bloggers", label: "Blogger" },
  ];

  for (const { name, label } of collections) {
    const snap = await db.collection(name).get();
    let ok = 0, missing = 0, wrong = 0;
    const problems = [];

    for (const doc of snap.docs) {
      const lr = doc.data().lockedRates;
      if (!lr || lr.client_call_lawyer === undefined) {
        missing++;
        problems.push(doc.id.substring(0, 10) + " (no lockedRates)");
      } else if (lr.client_call_lawyer !== 1000 || lr.client_call_expat !== 1000) {
        wrong++;
        problems.push(doc.id.substring(0, 10) + " (lawyer=" + lr.client_call_lawyer + ", expat=" + lr.client_call_expat + ")");
      } else {
        ok++;
      }
    }

    console.log(label + ": " + snap.size + " total, " + ok + " OK ($10/$10), " + missing + " missing, " + wrong + " wrong");
    if (problems.length > 0) {
      problems.slice(0, 5).forEach(p => console.log("  -> " + p));
    }
  }
}

verify().catch(console.error);
