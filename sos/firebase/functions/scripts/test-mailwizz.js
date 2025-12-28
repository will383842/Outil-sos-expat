/**
 * Simple JavaScript test for MailWizz API connection
 * Can be run directly with Node.js (no TypeScript compilation needed)
 * 
 * Usage:
 * cd firebase/functions
 * export MAILWIZZ_API_KEY="your-api-key"
 * node scripts/test-mailwizz.js
 */

const axios = require("axios");

const MAILWIZZ_CONFIG = {
  apiUrl: process.env.MAILWIZZ_API_URL || "https://app.mail-ulixai.com/api/index.php",
  apiKey: process.env.MAILWIZZ_API_KEY || "63f17459fa45961cbb742a61ddebc157169bd3c1",
  listUid: process.env.MAILWIZZ_LIST_UID || "yl089ehqpgb96",
  customerId: process.env.MAILWIZZ_CUSTOMER_ID || "2",
};

async function testConnection() {
  console.log("🧪 Testing MailWizz API Connection...\n");
  console.log(`API URL: ${MAILWIZZ_CONFIG.apiUrl}`);
  console.log(`List UID: ${MAILWIZZ_CONFIG.listUid}\n`);

  try {
    // Test 1: List info (basic API check)
    console.log("Test 1: Getting list information...");
    const listResponse = await axios.get(
      `${MAILWIZZ_CONFIG.apiUrl}/lists/${MAILWIZZ_CONFIG.listUid}`,
      {
        headers: {
          "X-MW-PUBLIC-KEY": MAILWIZZ_CONFIG.apiKey,
          "X-MW-CUSTOMER-ID": MAILWIZZ_CONFIG.customerId,
        },
      }
    );
    const listStatus = listResponse.data && listResponse.data.status === "success" ? "SUCCESS" : "FAILED";
    console.log("✅ List info retrieved:", listStatus);
    const listName = (listResponse.data && listResponse.data.data && listResponse.data.data.record && listResponse.data.data.record.name) || "N/A";
    console.log("   List name:", listName);
    console.log("");

    // Test 2: Create test subscriber
    console.log("Test 2: Creating test subscriber...");
    const testEmail = `test-${Date.now()}@example.com`;
    
    // MailWizz API requires field names in UPPERCASE
    const subscriberData = {
      EMAIL: testEmail,
      FNAME: "Test",
      LNAME: "User",
      LANGUAGE: "en",
      ROLE: "client",
      COUNTRY: "US",
    };
    
    console.log("   Test email:", testEmail);
    
    // Convert to form data (MailWizz expects form data, not JSON!)
    const formData = new URLSearchParams();
    Object.entries(subscriberData).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    const createResponse = await axios.post(
      `${MAILWIZZ_CONFIG.apiUrl}/lists/${MAILWIZZ_CONFIG.listUid}/subscribers`,
      formData.toString(),
      {
        headers: {
          "X-MW-PUBLIC-KEY": MAILWIZZ_CONFIG.apiKey,
          "X-MW-CUSTOMER-ID": MAILWIZZ_CONFIG.customerId,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (createResponse.data && createResponse.data.status === "success") {
      console.log(`✅ Subscriber created: ${testEmail}`);
      const subscriberUid = (createResponse.data && createResponse.data.data && createResponse.data.data.subscriber_uid) || "N/A";
      console.log("   Subscriber UID:", subscriberUid);
    } else {
      console.log("❌ Failed to create subscriber");
      console.log("   Error:", JSON.stringify(createResponse.data, null, 2));
      process.exit(1);
    }
    console.log("");

    // Test 3: Get subscriber
    console.log("Test 3: Retrieving subscriber...");
    const subscriberUid = createResponse.data && createResponse.data.data && createResponse.data.data.subscriber_uid;
    if (subscriberUid) {
      const getResponse = await axios.get(
        `${MAILWIZZ_CONFIG.apiUrl}/lists/${MAILWIZZ_CONFIG.listUid}/subscribers/${subscriberUid}`,
        {
          headers: {
            "X-MW-PUBLIC-KEY": MAILWIZZ_CONFIG.apiKey,
            "X-MW-CUSTOMER-ID": MAILWIZZ_CONFIG.customerId,
          },
        }
      );

      if (getResponse.data && getResponse.data.status === "success") {
        console.log("✅ Subscriber retrieved successfully");
        const record = (getResponse.data && getResponse.data.data && getResponse.data.data.record) || {};
        console.log("   Email:", record.EMAIL || "N/A");
        console.log("   Language:", record.LANGUAGE || "N/A");
        console.log("   Role:", record.ROLE || "N/A");
      } else {
        console.log("❌ Failed to retrieve subscriber");
      }
    }
    console.log("");

    console.log("✅ All MailWizz API tests completed successfully!");
    console.log("\n💡 Next steps:");
    console.log("   1. Verify subscriber in MailWizz admin panel");
    console.log("   2. Test Cloud Functions by creating a user in Firestore emulator");
    console.log("   3. Check emulator logs to see function execution");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.response) {
      console.error("   Response status:", error.response.status);
      console.error("   Response data:", JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run test
testConnection();






