/**
 * Standalone test script for MailWizz API connection
 * 
 * Usage:
 * 1. Set environment variable: export MAILWIZZ_API_KEY="your-api-key"
 * 2. Run: npx ts-node test-mailwizz-connection.ts
 * 
 * Or use in Firebase Functions emulator
 */

import axios from "axios";

// SECURITY: API key MUST be provided via environment variable
// Run: export MAILWIZZ_API_KEY="your-api-key" before executing this script
const MAILWIZZ_CONFIG = {
  apiUrl: process.env.MAILWIZZ_API_URL || "https://app.mail-ulixai.com/api/index.php",
  apiKey: process.env.MAILWIZZ_API_KEY || "",
  listUid: process.env.MAILWIZZ_LIST_UID || "",
  customerId: process.env.MAILWIZZ_CUSTOMER_ID || "",
};

// Validate required environment variables
if (!MAILWIZZ_CONFIG.apiKey) {
  console.error("❌ MAILWIZZ_API_KEY environment variable is required");
  console.error("   Run: export MAILWIZZ_API_KEY='your-api-key'");
  process.exit(1);
}
if (!MAILWIZZ_CONFIG.listUid) {
  console.error("❌ MAILWIZZ_LIST_UID environment variable is required");
  process.exit(1);
}

async function testConnection() {
  console.log("🧪 Testing MailWizz API Connection...\n");

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
    console.log("✅ List info retrieved:", listResponse.data?.status === "success" ? "SUCCESS" : "FAILED");
    console.log("   List name:", listResponse.data?.data?.record?.name || "N/A");
    console.log("");

    // Test 2: Create test subscriber
    console.log("Test 2: Creating test subscriber...");
    const testEmail = `vineet@peregrine-it.com`;
    
    // MailWizz API requires field names in UPPERCASE (EMAIL, FNAME, LNAME, etc.)
    // All field tags must be uppercase as per MailWizz API documentation
    const subscriberData = {
      EMAIL: testEmail,  // Required: UPPERCASE field name
      FNAME: "Test",
      LNAME: "User",
      // Custom fields at root level (using uppercase field tags from MailWizz)
      LANGUAGE: "en",
      ROLE: "client",
      COUNTRY: "US",
    };
    
    console.log("   Sending payload:", JSON.stringify(subscriberData, null, 2));
    
    // MailWizz API expects form data, not JSON!
    // Convert to URLSearchParams for form-encoded data
    const formData = new URLSearchParams();
    Object.entries(subscriberData).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    const createResponse = await axios.post(
      `${MAILWIZZ_CONFIG.apiUrl}/lists/${MAILWIZZ_CONFIG.listUid}/subscribers`,
      formData.toString(), // Send as form-encoded string
      {
        headers: {
          "X-MW-PUBLIC-KEY": MAILWIZZ_CONFIG.apiKey,
          "X-MW-CUSTOMER-ID": MAILWIZZ_CONFIG.customerId,
          "Content-Type": "application/x-www-form-urlencoded", // Form data, not JSON!
        },
      }
    );

    if (createResponse.data?.status === "success") {
      console.log(`✅ Subscriber created: ${testEmail}`);
      console.log("   Subscriber UID:", createResponse.data?.data?.subscriber_uid || "N/A");
    } else {
      console.log("❌ Failed to create subscriber");
      console.log("   Error:", createResponse.data);
    }
    console.log("");

    // Test 3: Get subscriber
    console.log("Test 3: Retrieving subscriber...");
    const subscriberUid = createResponse.data?.data?.subscriber_uid;
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

      if (getResponse.data?.status === "success") {
        console.log("✅ Subscriber retrieved successfully");
        console.log("   Email:", getResponse.data?.data?.record?.EMAIL || "N/A");
        console.log("   Language:", getResponse.data?.data?.record?.LANGUAGE || "N/A");
        console.log("   Role:", getResponse.data?.data?.record?.ROLE || "N/A");
      } else {
        console.log("❌ Failed to retrieve subscriber");
      }
    }
    console.log("");

    // Test 4: Update subscriber
    console.log("Test 4: Updating subscriber...");
    if (subscriberUid) {
      // Convert to form data
      const updateFormData = new URLSearchParams();
      updateFormData.append("TOTAL_CALLS", "5");
      
      const updateResponse = await axios.put(
        `${MAILWIZZ_CONFIG.apiUrl}/lists/${MAILWIZZ_CONFIG.listUid}/subscribers/${subscriberUid}`,
        updateFormData.toString(),
        {
          headers: {
            "X-MW-PUBLIC-KEY": MAILWIZZ_CONFIG.apiKey,
            "X-MW-CUSTOMER-ID": MAILWIZZ_CONFIG.customerId,
            "Content-Type": "application/x-www-form-urlencoded", // Form data, not JSON!
          },
        }
      );

      if (updateResponse.data?.status === "success") {
        console.log("✅ Subscriber updated successfully");
      } else {
        console.log("❌ Failed to update subscriber");
        console.log("   Error:", updateResponse.data);
      }
    }
    console.log("");

    console.log("✅ All tests completed!");
    console.log("\n💡 Next steps:");
    console.log("   1. Verify subscriber in MailWizz admin panel");
    console.log("   2. Test email sending with templates");
    console.log("   3. Test Cloud Functions with emulators");

  } catch (error: any) {
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





