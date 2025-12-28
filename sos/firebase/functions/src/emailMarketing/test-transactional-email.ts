/**
 * Test script for MailWizz transactional email sending
 * 
 * Usage:
 * 1. Set environment variable: export MAILWIZZ_API_KEY="your-api-key"
 * 2. Run: npx ts-node test-transactional-email.ts
 */

import axios from "axios";

const MAILWIZZ_CONFIG = {
  apiUrl: "https://app.mail-ulixai.com/api/index.php",
  apiKey: process.env.MAILWIZZ_API_KEY || "63f17459fa45961cbb742a61ddebc157169bd3c1",
  listUid: "yl089ehqpgb96",
  customerId: "2",
};

async function testTransactionalEmail() {
  console.log("📧 Testing MailWizz Transactional Email Sending...\n");

  try {
    // Test sending transactional email
    console.log("Test: Sending transactional email...");
    
    const testEmail = "vineet@peregrine-it.com";
    const templateName = "TR_CLI_welcome_EN"; // Example template name
    
    // MailWizz transactional email format
    // Note: Check MailWizz API docs - might need template UID instead of name
    const emailData = {
      to_email: testEmail,
      template_uid: templateName, // May need actual template UID from MailWizz
      // Alternative: template_name or template_id
      custom_fields: {
        FNAME: "Test",
        LNAME: "User",
      },
    };

    console.log("   Recipient:", testEmail);
    console.log("   Template:", templateName);
    console.log("   Custom fields:", emailData.custom_fields);
    console.log("");

    const response = await axios.post(
      `${MAILWIZZ_CONFIG.apiUrl}/transactional-emails`,
      emailData,
      {
        headers: {
          "X-MW-PUBLIC-KEY": MAILWIZZ_CONFIG.apiKey,
          "X-MW-CUSTOMER-ID": MAILWIZZ_CONFIG.customerId,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data?.status === "success") {
      console.log("✅ Transactional email sent successfully!");
      console.log("   Response:", JSON.stringify(response.data, null, 2));
    } else {
      console.log("❌ Failed to send transactional email");
      console.log("   Error:", JSON.stringify(response.data, null, 2));
      
      // Try alternative endpoint format
      console.log("\n   Trying alternative format...");
      
      // Alternative: Some MailWizz versions use different endpoint
      const altResponse = await axios.post(
        `${MAILWIZZ_CONFIG.apiUrl}/transactional-emails/send`,
        {
          to: testEmail,
          subject: "Test Email from SOS-Expat",
          body: "<h1>Test Email</h1><p>This is a test email.</p>",
        },
        {
          headers: {
            "X-MW-PUBLIC-KEY": MAILWIZZ_CONFIG.apiKey,
            "X-MW-CUSTOMER-ID": MAILWIZZ_CONFIG.customerId,
            "Content-Type": "application/json",
          },
        }
      );
      
      if (altResponse.data?.status === "success") {
        console.log("✅ Alternative email format worked!");
      } else {
        console.log("❌ Alternative format also failed");
        console.log("   Error:", JSON.stringify(altResponse.data, null, 2));
      }
    }

    console.log("\n💡 Notes:");
    console.log("   - Check MailWizz admin panel for sent emails");
    console.log("   - Verify template UID/name in MailWizz templates section");
    console.log("   - Check recipient's email inbox (including spam)");

  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
    if (error.response) {
      console.error("   Response status:", error.response.status);
      console.error("   Response data:", JSON.stringify(error.response.data, null, 2));
    }
    
    console.log("\n💡 Common issues:");
    console.log("   - Template UID might be different from template name");
    console.log("   - Check MailWizz API documentation for correct endpoint");
    console.log("   - Verify template exists and is published in MailWizz");
  }
}

// Run test
testTransactionalEmail();







